// Real Chromium + isolated Django fixture on 8001; Vite on 5174.
// This suite writes only to the temporary fixture database.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { clubToday } from '../src/pages/vet/vetDomain.js'

const base = 'http://127.0.0.1:5174'
const chrome = process.env.BROWSER_EXECUTABLE || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
assert.ok(chrome, 'Chromium executable required')
const temporary = await mkdtemp(join(tmpdir(), 'equi-herd-browser-'))
const artifacts = process.env.BROWSER_ARTIFACT_DIR || join(temporary, 'screenshots')
await mkdir(artifacts, { recursive: true })
const profile = resolve(temporary, 'profile')
assert.ok(profile.startsWith(resolve(temporary) + (process.platform === 'win32' ? '\\' : '/')))
const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--enable-unsafe-swiftshader', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
let socket, sequence = 0
const pending = new Map(), exceptions = [], writes = []
async function until(predicate, label, timeout = 15000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) { const value = await predicate(); if (value) return value; await delay(100) }
  throw new Error(`Timed out: ${label}`)
}
function cdp(method, params = {}) {
  const id = ++sequence
  return new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 15000)
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolvePromise(value) }, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  return result.result.value
}
const waitSelector = selector => until(() => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), selector)
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await delay(100) }
async function fill(selector, value) {
  await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await delay(60)
}
async function screenshot(name) {
  await evaluate('window.scrollTo(0,0)'); await delay(150)
  await writeFile(join(artifacts, name), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
}
async function api(path, token, method = 'GET', body, expected = 200) {
  const response = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = await response.json()
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`)
  return data
}

try {
  const port = await until(async () => { try { return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0] } catch { return '' } }, 'browser startup')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolvePromise, reject) => { socket.onopen = resolvePromise; socket.onerror = reject })
  let failedRequests = 0
  socket.onmessage = event => {
    const message = JSON.parse(event.data)
    if (message.id) { const request = pending.get(message.id); pending.delete(message.id); if (message.error) request?.reject(new Error(message.error.message)); else request?.resolve(message.result) }
    else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
    else if (message.method === 'Fetch.requestPaused') { failedRequests++; void cdp('Fetch.failRequest', { requestId: message.params.requestId, errorReason: 'ConnectionClosed' }) }
    else if (message.method === 'Network.requestWillBeSent' && message.params.request.url.includes('/api/') && !['GET', 'OPTIONS'].includes(message.params.request.method)) writes.push(message.params.request.url)
  }
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  const tokenFor = async email => (await api('/auth/login', null, 'POST', { Email: email, Password: 'test-only-password' })).access
  const vet = await tokenFor('vet@one.test'), manager = await tokenFor('manager@one.test'), owner = await tokenFor('owner@one.test')
  const clubId = (await api('/auth/me', owner)).ClubID
  async function createHorse(name, suffix, approve = true) {
    const horse = await api('/horses', owner, 'POST', { ClubID: clubId, HorseName: name, Breed: 'Thoroughbred', Gender: 'Female', DateOfBirth: '2021-03-10', CoatColor: 'Bay', SireName: 'Storm King', DamName: 'Lady Rain', MicrochipNumber: `9850000000000${suffix}`, PassportNumber: `HERD-${suffix}` }, 201)
    const id = horse.HorseID
    await api(`/horses/${id}/submit`, owner, 'POST', {})
    await api(`/horses/${id}/verify`, manager, 'POST', {})
    const record = await api(`/horses/${id}/medical-records`, vet, 'POST', { ExamType: 'Initial Exam', ExamDate: `${clubToday()}T08:00:00`, HealthStatus: 'Healthy', TrainingEligibility: 'Eligible', Conclusion: 'Đủ điều kiện theo kết luận đã chốt' }, 201)
    await api(`/medical-records/${record.MedicalRecordID}/sign`, vet, 'POST', {})
    if (approve) await api(`/horses/${id}/approve`, manager, 'POST', { HorseCode: `EQ-${suffix}` })
    return id
  }
  const allowedId = await createHorse('Solstice', '71')
  const restrictedId = await createHorse('Amber', '72')
  const fullId = await createHorse('Morning Star', '73')
  const pendingId = await createHorse('Orion · Chờ tiếp nhận', '74', false)
  await api(`/horses/${restrictedId}/training-locks`, vet, 'POST', { LockLevel: 'Restricted', MaxIntensity: 25, Reason: 'Giới hạn tải tập theo chỉ định', Details: 'Chỉ tập trong giới hạn đã ghi' }, 201)
  // Deliberately past the planned end: Active still wins over the Eligible conclusion.
  const fullLock = await api(`/horses/${fullId}/training-locks`, vet, 'POST', { LockLevel: 'Full', Reason: 'Nghỉ tập theo chỉ định bác sĩ', LockStartDate: '2026-10-18T09:00:00', LockEndDate: '2026-10-19T09:00:00' }, 201)
  const locksBefore = await api('/training-locks', vet)
  const recordsBefore = await api(`/horses/${fullId}/medical-records`, vet)
  await cdp('Page.navigate', { url: base + '/login' })
  await waitSelector('.auth-login input[name=email]')
  await fill('.auth-login input[name=email]', 'vet@one.test'); await fill('.auth-login input[name=password]', 'test-only-password')
  await click('.auth-login button[type=submit]'); await waitSelector('.app-shell')
  async function navigate(path) { await cdp('Page.navigate', { url: base + path }); await waitSelector('.vet-herd-table') }
  const status = id => evaluate(`document.querySelector('tr[data-horse-id="${id}"] [data-training-status]')?.dataset.trainingStatus`)
  await navigate('/vet/herd')
  await until(async () => (await status(fullId)) === 'full' && (await status(allowedId)) === 'allowed', 'complete effective states')
  assert.equal(await status(restrictedId), 'restricted')
  assert.equal(await status(1), 'unknown')
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.vet-herd-table tbody tr')).every(row => row.querySelectorAll('[data-training-status]').length === 1)`), true)
  assert.ok((await evaluate(`document.querySelector('tr[data-horse-id="${fullId}"]').textContent`)).includes('Khóa toàn bộ'))
  assert.equal(await evaluate(`document.querySelector('tr[data-horse-id="${fullId}"]').textContent.includes('Được phép tập')`), false)
  assert.ok((await evaluate(`document.querySelector('tr[data-horse-id="${fullId}"] .vet-pill').textContent`)).includes('Khỏe mạnh'))
  assert.equal(await evaluate(`document.querySelector('tr[data-horse-id="${fullId}"] .vet-herd-record-button svg') !== null`), true)
  await screenshot('herd-desktop.png')
  const writeCount = writes.length
  const badge = `tr[data-horse-id="${fullId}"] .effective-training-badge`
  await evaluate(`document.querySelector(${JSON.stringify(badge)}).scrollIntoView({ block:'center' })`)
  const rect = await evaluate(`(() => { const r=document.querySelector(${JSON.stringify(badge)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...rect })
  await waitSelector('.effective-training-details')
  const detail = await evaluate(`document.querySelector('.effective-training-details').textContent`)
  assert.ok(detail.includes('Nghỉ tập theo chỉ định bác sĩ'))
  assert.ok(detail.includes('Bác sĩ ban hành') && detail.includes('Ngày áp dụng') && detail.includes('18/10/2026'))
  assert.ok(detail.includes(fullLock.CreatedByName))
  await click(badge)
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 20, y: 20 })
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(badge)}).getAttribute('aria-expanded')`), 'true', 'click pins the details for touch/mouse')
  await screenshot('herd-lock-details.png')
  const popoverBounds = await evaluate(`(() => {const r=document.querySelector('.effective-training-details').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()`)
  assert.ok(popoverBounds.left >= 0 && popoverBounds.right <= 1440 && popoverBounds.top >= 0 && popoverBounds.bottom <= 1000)
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await delay(80)
  assert.equal(await evaluate(`!!document.querySelector('.effective-training-details')`), false)
  await evaluate(`document.querySelector(${JSON.stringify(badge)}).focus()`)
  await waitSelector('.effective-training-details')
  await evaluate(`document.querySelector(${JSON.stringify(badge)}).blur()`)
  await until(() => evaluate(`!document.querySelector('.effective-training-details')`), 'blur dismisses keyboard tooltip')

  await navigate('/vet/herd?training=allowed')
  await until(async () => (await status(allowedId)) === 'allowed', 'permission filter')
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('[data-training-status]')).every(b=>b.dataset.trainingStatus==='allowed')`), true)
  assert.equal(await status(fullId), undefined)
  await navigate('/vet/herd?training=full')
  await until(async () => (await status(fullId)) === 'full', 'full lock filter')
  await navigate('/vet/herd?training=unknown')
  await until(async () => (await status(1)) === 'unknown', 'unknown filter')
  await navigate('/vet/herd')
  await until(async () => (await status(fullId)) === 'full', 'herd refreshed')
  for (const width of [1024, 834, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 })
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `no page overflow at ${width}`)
    assert.equal(await evaluate(`document.querySelector('.vet-herd-table-scroll').scrollWidth >= document.querySelector('.vet-herd-table-scroll').clientWidth`), true)
    await evaluate(`document.querySelector('.vet-herd-table-scroll').scrollLeft = 10000`)
    if (width <= 834) assert.ok(await evaluate(`document.querySelector('.vet-herd-table-scroll').scrollLeft > 0`))
    await screenshot(`herd-${width}.png`)
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await navigate('/vet/intake-results')
  await until(async () => (await status(pendingId)) === 'unknown', 'awaiting approval is never cleared')
  assert.ok((await evaluate(`document.querySelector('tr[data-horse-id="${pendingId}"]').textContent`)).includes('Chờ quản lý xử lý'))
  await cdp('Page.navigate', { url: base + '/vet/stalls' }); await waitSelector('.vet-stall-grid')
  await until(() => evaluate(`!!document.querySelector('[data-training-status=full]')`), 'stall presentation shares the same effective status')

  // Missing lock data never renders a green permission badge, and retry recovers.
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/training-locks*', requestStage: 'Request' }] })
  await navigate('/vet/herd')
  await until(() => evaluate(`document.querySelector('.error-message')?.textContent.includes('Chưa tải được lệnh khóa tập')`), 'lock failure message')
  assert.ok(failedRequests > 0)
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('[data-training-status]')).every(b=>b.dataset.trainingStatus==='unknown')`), true)
  await cdp('Fetch.disable')
  await click('.page-heading button')
  await until(async () => (await status(allowedId)) === 'allowed' && (await status(fullId)) === 'full', 'retry restores effective status')

  // A per-horse history error affects that horse, but never hides a known full lock.
  await cdp('Fetch.enable', { patterns: [{ urlPattern: `*/api/horses/${allowedId}/medical-records*`, requestStage: 'Request' }] })
  await navigate('/vet/herd')
  await until(() => evaluate(`!!document.querySelector('.error-message')`), 'history failure message')
  assert.equal(await status(allowedId), 'unknown')
  await until(async () => (await status(fullId)) === 'full', 'full lock survives another history failure')
  await cdp('Fetch.disable')
  assert.equal(writes.length, writeCount, 'table interactions must never mutate medical or lock APIs')
  assert.deepEqual(await api('/training-locks', vet), locksBefore)
  assert.deepEqual(await api(`/horses/${fullId}/medical-records`, vet), recordsBefore)
  assert.deepEqual(exceptions, [], 'no uncaught browser exceptions')
  console.log('PASS: one effective training badge per horse; Eligible + Active Full resolves Full even past planned end; Restricted/allowed/unknown; admission approval; hover/click/focus/Escape details; matching filters/stalls; no API writes; lock/history failure and retry; desktop/tablet/mobile horizontal scroll.')
  console.log(`Screenshots: ${artifacts}`)
} finally {
  try { await cdp('Browser.close') } catch { browser.kill() }
  socket?.close(); await delay(300)
  await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 300 })
}
