// Real Chromium + isolated Django browser_fixture on 8001; Vite on 5174.
// No writes to the project database. Synthetic geometry below is ONLY a renderer test fixture.
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
const temporary = await mkdtemp(join(tmpdir(), 'equi-injury-browser-'))
const artifacts = process.env.BROWSER_ARTIFACT_DIR || join(temporary, 'screenshots')
await mkdir(artifacts, { recursive: true })
const profile = resolve(temporary, 'profile')
assert.ok(profile.startsWith(resolve(temporary) + (process.platform === 'win32' ? '\\' : '/')))
const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--enable-unsafe-swiftshader', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
let socket, sequence = 0, acceptDialog = false, dialogs = 0
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
  socket.onmessage = event => {
    const message = JSON.parse(event.data)
    if (message.id) { const request = pending.get(message.id); pending.delete(message.id); if (message.error) request?.reject(new Error(message.error.message)); else request?.resolve(message.result) }
    else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text)
    else if (message.method === 'Page.javascriptDialogOpening') { dialogs++; void cdp('Page.handleJavaScriptDialog', { accept: acceptDialog }) }
    else if (message.method === 'Network.requestWillBeSent' && message.params.request.url.includes('/api/') && !['GET', 'OPTIONS'].includes(message.params.request.method)) writes.push(message.params.request.url)
  }
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  const auth = await api('/auth/login', null, 'POST', { Email: 'vet@one.test', Password: 'test-only-password' })
  const herd = await api('/horses', auth.access)
  const horse = (Array.isArray(herd) ? herd : herd.results).find(row => row.HorseName === 'Thunder')
  assert.ok(horse)
  const horseId = horse.HorseID
  const existingRecords = await api(`/horses/${horseId}/medical-records`, auth.access)
  const record = (Array.isArray(existingRecords) ? existingRecords : existingRecords.results).find(row => row.InjuryLocation === 'Cổ chân trước trái — hồ sơ thật') ||
    await api(`/horses/${horseId}/medical-records`, auth.access, 'POST', { ExamType: 'Injury Exam', ExamDate: `${clubToday()}T09:00:00`, InjuryLocation: 'Cổ chân trước trái — hồ sơ thật', Diagnosis: 'Ghi nhận kiểm tra', TreatmentPlan: 'Theo chỉ định của bác sĩ', HealthStatus: 'Injured', TrainingEligibility: 'Not Eligible' }, 201)
  const existing = await api(`/training-locks?HorseID=${horseId}`, auth.access)
  const active = (Array.isArray(existing) ? existing : existing.results).find(row => row.LockStatus === 'Active')
  if (!active) await api(`/horses/${horseId}/training-locks`, auth.access, 'POST', { LockLevel: 'Full', Reason: 'Nghỉ tập theo chỉ định', Details: 'Khóa trong fixture kiểm thử' }, 201)
  else if (active.LockLevel !== 'Full') await api(`/training-locks/${active.TrainingLockID}`, auth.access, 'PATCH', { LockLevel: 'Full', MaxIntensity: null })
  const locksBefore = await api(`/training-locks?HorseID=${horseId}`, auth.access)
  await cdp('Page.navigate', { url: base + '/login' })
  await waitSelector('.auth-login input[name=email]')
  await fill('.auth-login input[name=email]', 'vet@one.test'); await fill('.auth-login input[name=password]', 'test-only-password')
  await click('.auth-login button[type=submit]'); await waitSelector('.app-shell')
  await cdp('Page.navigate', { url: `${base}/vet/horses/${horseId}?tab=injuries` })
  await waitSelector('.horse-injury-mapping')
  await until(() => evaluate(`document.querySelector('.injury-restriction-title').textContent === 'KHÓA HUẤN LUYỆN'`), 'active training hold')
  assert.ok((await evaluate(`document.querySelector('.injury-records').textContent`)).includes('Cổ chân trước trái — hồ sơ thật'))
  assert.ok((await evaluate(`document.querySelector('.injury-asset-state').textContent`)).includes('Đang chờ mô hình ngựa 3D'))
  assert.equal(await evaluate(`document.querySelectorAll('.injury-canvas canvas').length`), 0)
  assert.equal(await evaluate(`document.querySelectorAll('.injury-list-item').length`), 0)
  await screenshot('injury-desktop.png')
  const writeCount = writes.length
  await click('.injury-page-heading button'); await click('.injury-list-item')
  await waitSelector('.injury-form')
  assert.equal(await evaluate(`document.activeElement.name`), 'location')
  await fill('.injury-form textarea[name=notes]', 'Ghi chú dùng thử đã sửa')
  assert.equal(await evaluate(`document.querySelector('.injury-primary').disabled`), false)
  await click('.injury-primary'); await waitSelector('.injury-feedback')
  assert.ok((await evaluate(`document.querySelector('.injury-feedback').textContent`)).includes('Chưa ghi vào bệnh án'))
  assert.equal(await evaluate(`document.querySelector('.injury-primary').disabled`), true)
  await fill('.injury-form input[name=location]', 'Thay đổi chưa lưu')
  await evaluate(`document.querySelectorAll('.injury-list-item')[1].click()`); await delay(100)
  assert.ok(dialogs > 0)
  assert.equal(await evaluate(`document.querySelector('input[name=location]').value`), 'Thay đổi chưa lưu')
  const beforeNavigation = dialogs
  await click('.vet-tabs a[href$="?tab=overview"]')
  assert.ok(dialogs > beforeNavigation)
  assert.ok((await evaluate('location.search')).includes('tab=injuries'))
  acceptDialog = true
  await evaluate(`document.querySelectorAll('.injury-list-item')[1].click()`); await delay(100)
  assert.equal(await evaluate(`document.querySelector('input[name=location]').value`), 'Hông phải')
  acceptDialog = false; await click('.injury-delete')
  assert.equal(await evaluate(`document.querySelectorAll('.injury-list-item').length`), 2)
  acceptDialog = true; await click('.injury-delete')
  assert.equal(await evaluate(`document.querySelectorAll('.injury-list-item').length`), 1)
  await click('.injury-list-item')
  assert.equal(await evaluate(`document.querySelector('textarea[name=notes]').value`), 'Ghi chú dùng thử đã sửa')
  await screenshot('injury-demo-desktop.png')
  for (const width of [1024, 834, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 })
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `overflow at ${width}`)
    await screenshot(`injury-demo-${width}.png`)
  }
  assert.equal(writes.length, writeCount, 'Demo must not write to any medical or training API')
  assert.deepEqual(await api(`/training-locks?HorseID=${horseId}`, auth.access), locksBefore, 'Marker edits preserve training locks')
  assert.equal((await api(`/medical-records/${record.MedicalRecordID}`, auth.access)).InjuryLocation, 'Cổ chân trước trái — hồ sơ thật')
  assert.deepEqual(await evaluate('Object.keys(localStorage).sort()'), ['equi.access-token', 'equi.refresh-token'])

  // Mount read-only component with the same real horse identity; no privileged UI controls.
  await evaluate(`(async () => {
    const React = (await import('/node_modules/.vite/deps/react.js')).default; const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const { default: Mapping } = await import('/src/components/injury/HorseInjuryMapping.jsx');
    const host = document.createElement('div'); host.id = 'readonly-test'; document.body.append(host);
    window.readonlyRoot = createRoot(host); window.readonlyRoot.render(React.createElement(Mapping, { horse: { id: '${horseId}', name: 'Kiểm thử chỉ xem', profileStatus: 'APPROVED' }, records: [], currentUser: { id: 'read-only-test', clubId: '1', permissions: [] } }));
  })()`)
  await waitSelector('#readonly-test .injury-page-heading button')
  await click('#readonly-test .injury-page-heading button'); await click('#readonly-test .injury-list-item')
  assert.equal(await evaluate(`document.querySelector('#readonly-test fieldset').disabled`), true)
  assert.equal(await evaluate(`!!document.querySelector('#readonly-test .injury-primary, #readonly-test .injury-delete')`), false)
  await evaluate(`window.readonlyRoot.unmount(); document.querySelector('#readonly-test').remove()`)

  // Locks are changed only through the existing dedicated workflow, then the alert refreshes.
  await click('#vet-emergency-lock .vet-emergency')
  await evaluate(`(() => { const select = document.querySelector('#vet-emergency-lock select[name=level]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'Restricted'); select.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await waitSelector('#vet-emergency-lock input[name=max]')
  await fill('#vet-emergency-lock input[name=max]', '25')
  await click('#vet-emergency-lock form .vet-emergency')
  await until(() => evaluate(`document.querySelector('.injury-restriction-title').textContent === 'GIỚI HẠN TẢI TẬP'`), 'alert refreshes after dedicated lock workflow')

  // Renderer integration test uses a synthetic triangle, never a horse replacement in the app.
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await evaluate(`(async () => {
    const { createHorseScene } = await import('/src/components/injury/horseScene.js');
    const points = new Float32Array([-1,-1,0, 1,-1,0, 0,1,0]);
    const bytes = new Uint8Array(points.buffer); const bin = btoa(String.fromCharCode(...bytes));
    const gltf = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, translation: [3,2,0] }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], buffers: [{ uri: 'data:application/octet-stream;base64,' + bin, byteLength: bytes.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bytes.length }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-1,-1,0], max: [1,1,0] }] };
    const host = document.createElement('div'); host.id = 'renderer-test'; host.style.cssText = 'position:fixed;inset:0;width:600px;height:500px;z-index:99999;background:white'; document.body.append(host);
    window.testPicks = []; window.rendererState = 'loading'; window.projectedMarker = document.createElement('button'); host.append(window.projectedMarker);
    window.testGltfUrl = 'data:model/gltf+json;base64,' + btoa(JSON.stringify(gltf));
    window.testEngine = createHorseScene({ host, url: window.testGltfUrl, getMarkers: () => [{ marker: { point: { x:3, y:2, z:0 } }, element: window.projectedMarker }], onPick: point => window.testPicks.push(point), onState: state => window.rendererState = state, onOrbit() {}, onFrame() {} });
  })()`)
  await until(() => evaluate(`window.rendererState === 'ready'`), 'synthetic geometry loads in real WebGL')
  await evaluate(`window.testEngine.frame('left')`)
  const dispatch = async (type, x, y) => cdp('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 })
  await dispatch('mousePressed', 300, 250); await dispatch('mouseReleased', 300, 250)
  const picks = await evaluate('window.testPicks')
  assert.equal(picks.length, 1)
  assert.ok(Math.abs(picks[0].x - 3) < 0.01 && Math.abs(picks[0].z) < 0.01, 'picks retain glTF scene coordinates including node transforms')
  assert.equal(await evaluate('window.projectedMarker.hidden'), false)
  const markerBefore = await evaluate('window.projectedMarker.style.left')
  await dispatch('mousePressed', 300, 250); await dispatch('mouseMoved', 360, 260); await dispatch('mouseReleased', 360, 260)
  assert.equal(await evaluate('window.testPicks.length'), 1, 'drag must not create a marker')
  await evaluate(`window.testEngine.frame('right')`)
  assert.ok(await evaluate(`window.projectedMarker.hidden || window.projectedMarker.style.left === ${JSON.stringify(markerBefore)}`))
  await evaluate(`window.testEngine.dispose(); document.querySelector('#renderer-test').remove()`)

  // Exercise the React marker projection, tooltip, loading/error/retry states as well.
  await evaluate(`(async () => {
    const React = (await import('/node_modules/.vite/deps/react.js')).default; const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const { default: Viewer } = await import('/src/components/injury/Horse3DViewer.jsx');
    const host = document.createElement('div'); host.id = 'viewer-test'; host.className = 'horse-injury-mapping'; host.style.cssText = 'position:fixed;inset:0;width:700px;z-index:99999;background:white'; document.body.append(host);
    window.viewerRoot = createRoot(host); window.markerSelects = 0;
    window.testViewerProps = { asset: { url: window.testGltfUrl, version:'test-triangle' }, markers: [{ id:'test-point', point:{x:3,y:2,z:0}, location:'Điểm kiểm thử', description:'Hình học kiểm thử riêng', status:'monitoring' }], selectedId:'test-point', draft:null, onPick() {}, onSelect() { window.markerSelects++ }, viewRequest:{preset:'left'} };
    window.viewerRoot.render(React.createElement(Viewer, window.testViewerProps));
  })()`)
  await until(() => evaluate(`!!document.querySelector('#viewer-test .injury-marker:not([hidden])')`), 'React marker appears at model coordinate')
  await evaluate(`document.querySelector('#viewer-test .injury-marker').focus()`)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#viewer-test .injury-marker-tooltip')).display`), 'grid')
  assert.equal(await evaluate(`document.querySelector('#viewer-test .injury-marker').getAttribute('aria-pressed')`), 'true')
  await click('#viewer-test .injury-marker')
  assert.equal(await evaluate('window.markerSelects'), 1)
  await click('#viewer-test .injury-view-toolbar button[aria-pressed=false]')
  assert.ok(await evaluate(`!!document.querySelector('#viewer-test .injury-view-toolbar button[aria-pressed=true]')`))
  await evaluate(`(async () => { const React = (await import('/node_modules/.vite/deps/react.js')).default; const { default: Viewer } = await import('/src/components/injury/Horse3DViewer.jsx'); window.viewerRoot.render(React.createElement(Viewer, {...window.testViewerProps, key:'bad-asset', asset:{url:'/missing-horse-test.glb',version:'bad'}, markers:[]})); })()`)
  await until(() => evaluate(`document.querySelector('#viewer-test .injury-asset-state')?.getAttribute('role') === 'alert'`), 'asset error shown')
  await click('#viewer-test .injury-asset-state button')
  await until(() => evaluate(`document.querySelector('#viewer-test .injury-asset-state')?.getAttribute('role') === 'alert'`), 'retry asset failure remains recoverable')
  assert.ok(await evaluate(`performance.getEntriesByType('resource').filter(entry => entry.name.endsWith('/missing-horse-test.glb')).length >= 2`))
  await evaluate(`window.viewerRoot.unmount(); document.querySelector('#viewer-test').remove()`)
  assert.deepEqual(exceptions, [], 'No uncaught browser exceptions')
  console.log('PASS: real profile/locks/medical data; missing asset; demo edit/save/reselect/delete; unsaved guards; read-only permissions; no marker API writes or clinical browser storage; dedicated lock workflow refresh; 1440/1024/834/390 widths; real WebGL glTF load, transformed model coordinates, marker tooltip/highlight/selection, presets, drag rejection, asset error/retry and cleanup.')
  console.log(`Screenshots: ${artifacts}`)
} finally {
  try { await cdp('Browser.close') } catch { browser.kill() }
  socket?.close(); await delay(300)
  await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 300 })
}
