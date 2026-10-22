// Real browser + real API smoke test; no browser libraries or mocked HTTP responses.
// Start backend: .venv/Scripts/python.exe -m apps.core.tests.browser_fixture
// Start frontend with VITE_API_PROXY_TARGET=http://127.0.0.1:8001 on port 5174.
// Run on a fresh fixture: node tests/manager-rbac.browser.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const base = 'http://127.0.0.1:5174'
const chrome = process.env.BROWSER_EXECUTABLE || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
assert.ok(chrome, 'Set BROWSER_EXECUTABLE to a Chromium browser executable')
const temp = await mkdtemp(join(tmpdir(), 'equi-manager-browser-'))
const artifacts = process.env.BROWSER_ARTIFACT_DIR || join(temp, 'screenshots')
await mkdir(artifacts, { recursive: true })
const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${join(temp, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const exceptions = []
let socket
let nextId = 0
const waiting = new Map()
async function until(predicate, label, timeout = 15000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const result = await predicate()
    if (result) return result
    await delay(100)
  }
  throw new Error(`Timed out: ${label}`)
}
function cdp(method, params = {}) {
  const id = ++nextId
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 15000)
    waiting.set(id, { resolve: (value) => { clearTimeout(timer); resolvePromise(value) }, reject })
    socket.send(JSON.stringify({ id, method, params }))
    if (process.env.CDP_DEBUG) console.log('CDP send', id, method)
  })
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  return result.result.value
}
const waitSelector = (selector) => until(() => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), selector)
async function fill(selector, value) {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw Error('Missing control');
    Object.getOwnPropertyDescriptor(el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`)
  await delay(30)
}
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  await delay(60)
}
async function navigate(path) {
  await cdp('Page.navigate', { url: base + path })
  await delay(150)
}
async function login(email) {
  await navigate('/login')
  await evaluate(`localStorage.removeItem('equi.access-token'); localStorage.removeItem('equi.refresh-token')`)
  await navigate('/login')
  await waitSelector('.auth-login input[name=email]')
  await fill('.auth-login input[name=email]', email)
  await fill('.auth-login input[name=password]', 'test-only-password')
  await click('.auth-login button[type=submit]')
  await waitSelector('.app-shell')
}
async function screenshot(name) {
  await evaluate('window.scrollTo(0,0)')
  await delay(200)
  const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  await writeFile(join(artifacts, name), Buffer.from(result.data, 'base64'))
}
async function api(path, token, method = 'GET', body, expected = 200) {
  const response = await fetch(base + '/api' + path, { method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}) })
  const result = await response.json()
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`)
  return result
}

try {
  const portFile = join(temp, 'profile', 'DevToolsActivePort')
  const port = await until(async () => { try { return (await readFile(portFile, 'utf8')).split('\n')[0] } catch { return '' } }, 'Chromium startup')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const target = targets.find((item) => item.type === 'page')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolvePromise, reject) => { socket.onopen = resolvePromise; socket.onerror = reject })
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data)
    if (process.env.CDP_DEBUG) console.log('CDP receive', message.id || message.method)
    if (message.id) {
      const pending = waiting.get(message.id)
      waiting.delete(message.id)
      if (message.error) pending?.reject(new Error(message.error.message))
      else pending?.resolve(message.result)
    } else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text)
    else if (message.method === 'Page.javascriptDialogOpening') {
      void cdp('Page.handleJavaScriptDialog', { accept: false })
    }
  }
  await cdp('Page.enable'); await cdp('Runtime.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

  const manager = (await api('/auth/login', null, 'POST', { Email: 'manager@one.test', Password: 'test-only-password' })).access
  const vet = (await api('/auth/login', null, 'POST', { Email: 'vet@one.test', Password: 'test-only-password' })).access
  await api('/users', vet, 'GET', null, 403)
  await api('/roles', vet, 'GET', null, 403)
  await api('/audit-logs', vet, 'GET', null, 403)
  await login('manager@one.test')
  await navigate('/manager/staff')
  await until(() => evaluate(`document.querySelector('.manager-workspace .horse-table')?.textContent.includes('trainer')`), 'staff list')
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Tạo tài khoản nhân sự').click()`)
  await waitSelector('[name=FullName]')
  await fill('[name=FullName]', 'Browser Staff')
  await fill('[name=Email]', 'browser-staff@one.test')
  await fill('[name=Phone]', 'invalid-phone')
  await fill('[name=Address]', 'Test address')
  await fill('[name=RoleCode]', 'GROOM')
  await evaluate(`document.querySelector('[name=FullName]').closest('form').requestSubmit()`)
  await until(() => evaluate(`document.querySelector('[name=Phone]')?.getAttribute('aria-invalid')==='true'`), 'staff field validation')
  assert.equal(await evaluate(`document.querySelector('[name=FullName]').value`), 'Browser Staff', 'failed validation preserves form')
  await fill('[name=Phone]', '0901234567')
  await evaluate(`document.querySelector('[name=FullName]').closest('form').requestSubmit()`)
  await waitSelector('.manager-secret output')
  const temporaryPassword = await evaluate(`document.querySelector('.manager-secret output').value`)
  assert.ok(temporaryPassword.length >= 6)
  assert.equal(await evaluate(`Object.values(localStorage).some(v=>v.includes(${JSON.stringify(temporaryPassword)}))`), false, 'no temporary credential in localStorage')
  const staff = (await api('/users', manager)).find(u=>u.Email==='browser-staff@one.test')
  await until(() => evaluate(`Array.from(document.querySelectorAll('.horse-table tr')).some(r=>r.textContent.includes('browser-staff@one.test'))`), 'new staff appears')
  await evaluate(`Array.from(document.querySelectorAll('.horse-table tr')).find(r=>r.textContent.includes('browser-staff@one.test')).querySelector('button').click()`)
  await waitSelector('input[name=FullName]')
  await fill('input[name=FullName]', 'Browser Staff Updated')
  await evaluate(`document.querySelector('[name=FullName]').closest('form').requestSubmit()`)
  await until(async () => (await api(`/users/${staff.UserID}`, manager)).FullName==='Browser Staff Updated', 'staff profile update')
  await until(() => evaluate(`!!document.querySelector('input[name=RoleCodes][value=TRAINER]')`), 'staff role editor')
  await click('input[name=RoleCodes][value=TRAINER]')
  await evaluate(`document.querySelector('[name=RoleCodes]').closest('form').requestSubmit()`)
  await until(async () => (await api(`/users/${staff.UserID}`, manager)).Roles.includes('TRAINER'), 'account role assignment')
  await until(() => evaluate(`!!document.querySelector('[name=Reason]')`), 'staff lock form')
  await fill('[name=Reason]', 'Isolated browser test')
  await evaluate(`document.querySelector('[name=Reason]').closest('form').requestSubmit()`)
  await until(async () => (await api(`/users/${staff.UserID}`, manager)).Status==='Suspended', 'staff account locked')
  await until(() => evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Mở khóa tài khoản')`), 'unlock available')
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Mở khóa tài khoản').click()`)
  await until(async () => (await api(`/users/${staff.UserID}`, manager)).Status==='Active', 'staff account unlocked')
  await navigate('/manager/staff')
  await waitSelector('.horse-table')
  assert.equal(await evaluate(`document.querySelectorAll('.manager-secret').length`), 0, 'secret cleared on navigation')
  await fill('[name=search]', 'nonexistent-user')
  await until(() => evaluate(`document.querySelector('.manager-workspace')?.textContent.includes('Không có tài khoản phù hợp.')`), 'staff empty search')

  await navigate('/manager/roles')
  await until(() => evaluate(`Array.from(document.querySelectorAll('.panel')).some(p=>p.querySelector('h2')?.textContent.startsWith('Nhân viên chăm sóc'))`), 'permission matrix')
  const rolePanel = `Array.from(document.querySelectorAll('.panel')).find(p=>p.querySelector('h2')?.textContent.startsWith('Nhân viên chăm sóc'))`
  await evaluate(`(() => { const p=${rolePanel}; Array.from(p.querySelectorAll('label')).find(l=>l.textContent==='Đánh giá kết quả tập').querySelector('input').click(); })()`)
  assert.equal(await evaluate(`(${rolePanel}).querySelector('button').disabled`), true, 'global scope acknowledgement required')
  await evaluate(`(${rolePanel}).querySelector('form > label.manager-choice input').click()`)
  await evaluate(`(${rolePanel}).querySelector('form').requestSubmit()`)
  await until(async () => (await api('/roles', manager)).Roles.find(r=>r.RoleCode==='GROOM').Permissions.includes('TRAINING_REVIEW'), 'role permission mutation persisted')

  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  for (const path of ['/manager/staff', '/manager/roles']) {
    await navigate(path)
    await waitSelector('.manager-workspace')
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `mobile overflow ${path}`)
  }
  await screenshot('manager-rbac-mobile.png')
  await evaluate(`localStorage.setItem('equi.access-token', ${JSON.stringify(vet)}); localStorage.removeItem('equi.refresh-token')`)
  await navigate('/manager/roles')
  await until(() => evaluate(`location.pathname==='/vet/horses-needing-exam'`), 'wrong-role route denied')
  assert.equal(await evaluate(`document.querySelectorAll('.manager-workspace').length`), 0)
  assert.deepEqual(exceptions, [], 'No uncaught browser errors')
  console.log('PASS: Manager account list/search/create, field validation preservation, temporary password handling, profile update, account role assignment, lock/unlock, global role permissions, wrong-role UI/API denial, mobile 390px.')
  console.log(`Screenshots: ${artifacts}`)
} finally {
  try { await cdp('Browser.close') } catch { browser.kill() }
  socket?.close()
  const profile = resolve(temp, 'profile')
  assert.equal(profile.startsWith(resolve(temp) + (process.platform === 'win32' ? '\\' : '/')), true)
  await delay(300)
  await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 300 })
}
