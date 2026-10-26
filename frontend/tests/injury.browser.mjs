// Real Chromium + isolated Django browser_fixture on 8001; Vite on 5174.
// No writes to the project database. Marker persistence uses synthetic demo records only.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { clubToday } from '../src/pages/vet/vetDomain.js'
import { DIAGRAM_WIDTH, DIAGRAM_HEIGHT, DIAGRAM_VERSION } from '../src/components/injury/horseDiagram.js'

const base = process.env.BROWSER_BASE_URL || 'http://127.0.0.1:5174'
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
  await evaluate(`window.scrollTo({top:0,behavior:'instant'})`); await delay(150)
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
  await until(() => evaluate(`document.querySelector('.injury-diagram-stage')?.dataset.photoState === 'ready'`), 'transparent photo ready')
  await until(() => evaluate(`document.querySelector('.injury-restriction-title').textContent === 'KHÓA HUẤN LUYỆN'`), 'active training hold')
  assert.ok((await evaluate(`document.querySelector('.injury-records').textContent`)).includes('Cổ chân trước trái — hồ sơ thật'))
  assert.ok((await evaluate(`document.querySelector('.injury-page-heading h2').textContent`)).includes('Sơ đồ chấn thương'))
  assert.equal(await evaluate(`document.querySelectorAll('.injury-diagram-stage canvas').length`), 0)
  assert.equal(await evaluate(`document.querySelectorAll('.injury-horse-svg > image').length`), 1)
  assert.equal(await evaluate(`document.querySelectorAll('.injury-body-region').length`), 8)
  assert.equal(await evaluate(`document.querySelectorAll('.injury-list-item').length`), 0)
  assert.ok((await evaluate(`document.querySelector('.injury-mode-note').textContent`)).includes('chưa được hỗ trợ'))
  const writeCount = writes.length
  async function selectField(name, value) {
    await evaluate(`(() => { const e = document.querySelector('select[name=${name}]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('change', {bubbles:true})); })()`)
    await delay(80)
  }
  async function clickText(scope, text) {
    await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(scope + ' button')})).find(e => e.textContent.trim() === ${JSON.stringify(text)}).click()`)
    await delay(80)
  }
  async function diagramClick(x, y) {
    await evaluate(`document.querySelector('.injury-horse-svg').scrollIntoView({block:'center',behavior:'instant'})`)
    const point = await evaluate(`(() => { const p = new DOMPoint(${x},${y}).matrixTransform(document.querySelector('.injury-horse-svg').getScreenCTM()); return {x:p.x,y:p.y} })()`)
    await cdp('Input.dispatchMouseEvent', {type:'mousePressed', ...point, button:'left', buttons:1, clickCount:1})
    await cdp('Input.dispatchMouseEvent', {type:'mouseReleased', ...point, button:'left', buttons:0, clickCount:1})
    await delay(80)
  }
  const storedMarkers = () => evaluate(`JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('equi.injury-diagram.demo:') && k.includes('${DIAGRAM_VERSION}')))).markers`)
  await screenshot('injury-photo-default.png')
  if (process.env.BROWSER_DEMO === 'false') {
    assert.equal(await evaluate(`!!document.querySelector('.injury-page-heading button')`), false, 'demo disabled by configuration')
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.injury-diagram-toolbar button')).some(e => e.textContent.includes('Thêm vị trí'))`), false)
    assert.equal(await evaluate(`Object.keys(localStorage).some(k => k.startsWith('equi.injury-diagram.demo:'))`), false)
    assert.equal(writes.length, writeCount)
    console.log('PASS: demo disabled, 2D diagram read-only, real fixture records/locks, no marker API calls or demo storage.')
  } else {
    await click('.injury-page-heading button')
    await until(() => evaluate(`document.querySelectorAll('.injury-list-item').length === 2`), 'demo load')
    await diagramClick(1290, 220)
    assert.equal(await evaluate(`!!document.querySelector('.injury-form')`), false, 'view mode cannot create markers')
    // Every keyboard/form anchor is inside the matching path, in both views.
    assert.deepEqual(await evaluate(`(async () => { const {bodyRegions} = await import('/src/components/injury/horseDiagram.js'); return bodyRegions.filter(r => !document.querySelector('[data-region='+r.id+']').isPointInFill(new DOMPoint(...r.anchor))).map(r=>r.id) })()`), [])
    assert.deepEqual(await evaluate(`(async () => {const {bodyRegions,regionAnchor}=await import('/src/components/injury/horseDiagram.js');const {loadHorsePhoto}=await import('/src/components/injury/horsePhotoHitMap.js');const map=await loadHorsePhoto('/images/injury/horse-reference-cutout-v2.png');window.testPhotoMap=map;return bodyRegions.filter(region=>!map.contains(regionAnchor(region.id,'left'))).map(region=>region.id);})()`), [], 'keyboard/form anchors lie on opaque horse pixels')
    const letterboxed = await evaluate(`(async () => {const {pointerInSvg}=await import('/src/components/injury/injuryDiagramDomain.js');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 900 520');svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.style.cssText='position:fixed;left:10px;top:20px;width:600px;height:400px';document.body.append(svg);const screen=new DOMPoint(300,220).matrixTransform(svg.getScreenCTM());const ratios=pointerInSvg(svg,screen.x,screen.y);svg.remove();return ratios;})()`)
    assert.ok(Math.abs(letterboxed.xRatio - 300/900) < .00001 && Math.abs(letterboxed.yRatio - 220/520) < .00001, 'pointer conversion accounts for SVG letterboxing')
    await clickText('.injury-diagram-toolbar', 'Thêm vị trí chấn thương')
    await diagramClick(20,20)
    assert.equal(await evaluate(`!!document.querySelector('.injury-form')`), false, 'outside silhouette cannot place marker')
    await diagramClick(600,850)
    assert.equal(await evaluate(`!!document.querySelector('.injury-form')`), false, 'gap between legs cannot place marker')
    const transparentRegionPoint = await evaluate(`(() => {for(const path of document.querySelectorAll('[data-region]')) {const bounds=path.getBBox();for(let y=bounds.y+5;y<bounds.y+bounds.height;y+=10)for(let x=bounds.x+5;x<bounds.x+bounds.width;x+=10)if(path.isPointInFill(new DOMPoint(x,y))&&!window.testPhotoMap.contains({xRatio:x/${DIAGRAM_WIDTH},yRatio:y/${DIAGRAM_HEIGHT}}))return {x,y};}return null;})()`)
    assert.ok(transparentRegionPoint, 'test includes a transparent pixel within a region outline')
    await diagramClick(transparentRegionPoint.x,transparentRegionPoint.y)
    assert.equal(await evaluate(`!!document.querySelector('.injury-form')`), false, 'alpha check rejects transparent parts inside a region path')
    await diagramClick(650,390)
    assert.ok((await evaluate(`document.querySelector('.injury-position-summary').textContent`)).includes('Lưng'))
    assert.ok((await evaluate(`document.querySelector('.injury-position-summary').textContent`)).includes('Trái'))
    const temporaryLeft = await evaluate(`document.querySelector('[data-marker-id=draft]').transform.baseVal.consolidate().matrix.e/${DIAGRAM_WIDTH}`)
    assert.ok(Math.abs(temporaryLeft - 650/DIAGRAM_WIDTH) < .002)
    await click('.injury-primary')
    assert.ok((await evaluate(`document.querySelector('#injury-error-description').textContent`)).includes('Vui lòng'))
    await fill('textarea[name=description]', 'Ví dụ kiểm tra tọa độ')
    await fill('input[name=detectedAt]', '2999-01-01')
    await click('.injury-primary')
    assert.ok(await evaluate(`!!document.querySelector('#injury-error-detectedAt')`))
    await fill('input[name=detectedAt]', clubToday())
    // A genuine storage write failure must preserve the form and show no success.
    await evaluate(`window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if (k.startsWith('equi.injury-diagram.demo:')) throw new DOMException('Quota','QuotaExceededError'); return window.originalSetItem.call(this,k,v); }`)
    await click('.injury-primary')
    assert.equal(await evaluate(`document.querySelector('textarea[name=description]').value`), 'Ví dụ kiểm tra tọa độ')
    assert.ok(await evaluate(`!!document.querySelector('.injury-feedback.is-error')`))
    assert.equal(await evaluate(`document.querySelectorAll('.injury-list-item').length`), 2)
    await evaluate(`Storage.prototype.setItem = window.originalSetItem; document.querySelector('.injury-form').requestSubmit(); document.querySelector('.injury-form').requestSubmit()`)
    await until(() => evaluate(`document.querySelectorAll('.injury-list-item').length === 3`), 'saved exactly once')
    const added = (await storedMarkers()).find(row => row.description === 'Ví dụ kiểm tra tọa độ')
    assert.ok(added)
    assert.ok(Math.abs(added.xRatio - 650/DIAGRAM_WIDTH) < .002)
    assert.ok(Math.abs(added.yRatio - 390/DIAGRAM_HEIGHT) < .002)
    assert.equal(added.view, 'left')
    // Tooltip and marker/list numbering stay connected.
    await evaluate(`document.querySelector('[data-marker-id="${added.id}"]').focus()`)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-marker-id="${added.id}"] .injury-svg-tooltip')).display`), 'block')
    for (const width of [1440, 1024, 834, 390]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height:1000, deviceScaleFactor:1, mobile:width < 500 })
      await evaluate(`window.scrollTo({top:240,behavior:'instant'})`)
      const position = await evaluate(`(() => {const svg=document.querySelector('.injury-horse-svg'); const expected=new DOMPoint(${added.xRatio}*${DIAGRAM_WIDTH},${added.yRatio}*${DIAGRAM_HEIGHT}).matrixTransform(svg.getScreenCTM()); const actual=document.querySelector('[data-marker-id="${added.id}"] .injury-marker-hit').getBoundingClientRect(); return { dx:Math.abs(expected.x-actual.x-actual.width/2),dy:Math.abs(expected.y-actual.y-actual.height/2),overflow:document.documentElement.scrollWidth>innerWidth};})()`)
      assert.ok(position.dx < 1 && position.dy < 1, `normalized position at ${width}: ${JSON.stringify(position)}`)
      assert.equal(position.overflow, false, `no overflow at ${width}`)
      await screenshot(`injury-photo-${width}.png`)
    }
    // Touch on mobile opens the same detail as the linked list.
    await evaluate(`document.querySelector('[data-marker-id="${added.id}"]').scrollIntoView({block:'center',behavior:'instant'})`)
    const touch = await evaluate(`(() => { const r=document.querySelector('[data-marker-id="${added.id}"] .injury-marker-hit').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`)
    await cdp('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[touch]}); await cdp('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]})
    assert.equal(await evaluate(`document.querySelector('textarea[name=description]').value`), 'Ví dụ kiểm tra tọa độ')
    await cdp('Emulation.setDeviceMetricsOverride', { width:1440,height:1000,deviceScaleFactor:1,mobile:false })
    // Reposition through a region selection; moving to the right does not mirror other markers.
    const firstBefore = (await storedMarkers())[0]
    await clickText('.injury-position-summary', 'Đổi vị trí')
    await clickText('.injury-diagram-toolbar', 'Bên phải ngựa')
    await selectField('diagramRegion', 'hindleg')
    assert.ok((await evaluate(`document.querySelector('.injury-position-summary').textContent`)).includes('Phải'))
    await click('.injury-primary')
    assert.equal((await storedMarkers()).find(row => row.id === added.id).view, 'right')
    assert.deepEqual((await storedMarkers())[0], firstBefore)
    // Cancel a temporary marker and leave no persisted row.
    await clickText('.injury-diagram-toolbar', 'Thêm vị trí chấn thương')
    await selectField('diagramRegion', 'head')
    acceptDialog = true
    await click('.injury-form-actions .button-secondary')
    assert.equal(await evaluate(`!!document.querySelector('[data-marker-id=draft]')`), false)
    assert.equal((await storedMarkers()).length, 3)
    await clickText('.injury-diagram-toolbar', 'Thêm vị trí chấn thương')
    await diagramClick(DIAGRAM_WIDTH-1080,285)
    assert.ok((await evaluate(`document.querySelector('.injury-position-summary').textContent`)).includes('Phải'))
    assert.ok(Math.abs((await evaluate(`document.querySelector('[data-marker-id=draft]').transform.baseVal.consolidate().matrix.e`))/DIAGRAM_WIDTH - (DIAGRAM_WIDTH-1080)/DIAGRAM_WIDTH) < .002, 'right pointer stays in its own SVG space')
    await click('.injury-form-actions .button-secondary')
    // Keyboard region selection and independent overlapping markers via accessible form.
    await clickText('.injury-diagram-toolbar', 'Thêm vị trí chấn thương')
    await evaluate(`document.querySelector('[data-region=neck]').focus()`)
    await cdp('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13})
    await cdp('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13})
    await waitSelector('[data-marker-id=draft]')
    assert.ok((await evaluate(`document.querySelector('.injury-position-summary').textContent`)).includes('Cổ'))
    await click('.injury-form-actions .button-secondary')
    await clickText('.injury-diagram-toolbar', 'Thêm vị trí chấn thương')
    await clickText('.injury-diagram-toolbar', 'Bên trái ngựa')
    await selectField('diagramRegion', 'foreleg')
    await fill('textarea[name=description]', 'Chấn thương minh họa chồng vị trí')
    await click('.injury-primary')
    const overlap = (await storedMarkers()).find(row => row.description.includes('chồng vị trí'))
    assert.equal(overlap.xRatio, firstBefore.xRatio)
    assert.equal(overlap.yRatio, firstBefore.yRatio)
    await click(`[data-injury-id="${firstBefore.id}"]`)
    assert.equal(await evaluate(`document.querySelector('textarea[name=description]').value`), firstBefore.description)
    await click(`[data-injury-id="${overlap.id}"]`)
    assert.equal(await evaluate(`document.querySelector('textarea[name=description]').value`), overlap.description)
    // Unsaved clinical guard, edit then delete confirmation.
    acceptDialog = false
    await fill('textarea[name=notes]', 'Chưa lưu')
    const previousDialogs = dialogs
    await click('.vet-tabs a[href$="?tab=overview"]')
    assert.ok(dialogs > previousDialogs)
    assert.ok((await evaluate('location.search')).includes('injuries'))
    await click('.injury-primary')
    await click('.injury-delete')
    assert.equal((await storedMarkers()).length, 4)
    acceptDialog = true; await click('.injury-delete')
    assert.equal((await storedMarkers()).length, 3)
    // Signed injury stays immutable; follow-up appends a new record.
    await click('[data-injury-id=diagram-demo-2]')
    assert.equal(await evaluate(`document.querySelector('.injury-form fieldset').disabled`), true)
    assert.equal(await evaluate(`!!document.querySelector('.injury-form .injury-primary,.injury-delete,.injury-position-summary button')`), false)
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.injury-diagram-toolbar button')).find(e=>e.textContent==='Bên phải ngựa').getAttribute('aria-pressed')`), 'true')
    const signedBefore = (await storedMarkers())[1]
    await selectField('recoveryStatus','recovered')
    acceptDialog = false
    const recoveryDialogs = dialogs
    await click('[data-injury-id=diagram-demo-1]')
    assert.ok(dialogs > recoveryDialogs, 'status-only recovery change is guarded')
    assert.equal(await evaluate(`document.querySelector('.injury-form fieldset').disabled`), true)
    acceptDialog = true
    await click('.injury-recovery-form button[type=submit]')
    assert.ok(await evaluate(`!!document.querySelector('#recovery-error-comment')`))
    await selectField('recoveryRecord','demo-followup')
    await selectField('recoveryStatus','recovered')
    await fill('textarea[name=recoveryComment]','Theo dõi minh họa lần một')
    await click('.injury-recovery-form button[type=submit]')
    await until(() => evaluate(`document.querySelectorAll('.injury-recovery li').length === 1`), 'first recovery')
    await selectField('recoveryRecord','demo-followup')
    await fill('textarea[name=recoveryComment]','Theo dõi minh họa lần hai')
    await click('.injury-recovery-form button[type=submit]')
    await until(() => evaluate(`document.querySelectorAll('.injury-recovery li').length === 2`), 'second recovery')
    const signedAfter = (await storedMarkers())[1]
    assert.deepEqual({...signedAfter,history:[]}, signedBefore)
    assert.equal(signedAfter.history[0].comment,'Theo dõi minh họa lần một')
    // Filters distinguish no matches and preserve stable marker numbering.
    await selectField('filterStatus','recovered')
    assert.equal(await evaluate(`document.querySelectorAll('.injury-list-item').length`), 1)
    assert.equal(await evaluate(`document.querySelector('.injury-marker-number').textContent`), '2')
    await selectField('filterSeverity','severe')
    assert.ok((await evaluate(`document.querySelector('.injury-marker-list').textContent`)).includes('Không có chấn thương phù hợp'))
    await clickText('.injury-marker-list','Xóa bộ lọc')
    assert.equal(await evaluate(`document.querySelectorAll('.injury-list-item').length`),3)
    // Browser reload keeps demo rows, but always requires deliberate entry into demo.
    const persisted = await storedMarkers()
    await cdp('Page.reload'); await waitSelector('.horse-injury-mapping')
    assert.equal(await evaluate(`document.querySelectorAll('.injury-list-item').length`), 0)
    await click('.injury-page-heading button')
    await until(() => evaluate(`document.querySelectorAll('.injury-list-item').length === 3`), 'persisted rows after reload')
    assert.deepEqual(await storedMarkers(), persisted)
    const data = await evaluate(`localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('equi.injury-diagram.demo:')))`)
    assert.equal(data.includes('Cổ chân trước trái — hồ sơ thật'),false)
    assert.equal(data.includes('Thunder'),false)
    assert.equal(data.includes(auth.access),false)
    assert.equal(writes.length,writeCount,'diagram must never write medical/lock APIs')
    assert.deepEqual(await api(`/training-locks?HorseID=${horseId}`, auth.access),locksBefore)
    assert.equal((await api(`/medical-records/${record.MedicalRecordID}`, auth.access)).InjuryLocation,'Cổ chân trước trái — hồ sơ thật')
    // Same UI mounted without manage permission; forged form submit still cannot write.
    await evaluate(`(async () => {
      const React=(await import('/node_modules/.vite/deps/react.js')).default;
      const rootModule=await import('/node_modules/.vite/deps/react-dom_client.js');
      const {createRoot}=rootModule.default || rootModule;
      const {default:Mapping}=await import('/src/components/injury/HorseInjuryMapping.jsx');
      const host=document.createElement('div'); host.id='readonly-test'; document.body.append(host);
      window.scopeRoot=createRoot(host); window.Mapping=Mapping;window.React=React;
      window.scopeProps={horse:{id:'${horseId}',name:'Ngựa kiểm thử',profileStatus:'APPROVED'},records:[],currentUser:{id:'readonly-demo',clubId:'1',permissions:['HORSE_VIEW']}};
      window.scopeRoot.render(React.createElement(Mapping,window.scopeProps));
    })()`)
    await waitSelector('#readonly-test .injury-page-heading button')
    await click('#readonly-test .injury-page-heading button')
    await until(() => evaluate(`document.querySelectorAll('#readonly-test .injury-list-item').length===2`),'read-only rows')
    await click('#readonly-test .injury-list-item')
    assert.equal(await evaluate(`document.querySelector('#readonly-test .injury-form fieldset').disabled`),true)
    assert.equal(await evaluate(`!!document.querySelector('#readonly-test .injury-primary,#readonly-test .injury-delete,#readonly-test .injury-region-picker')`),false)
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('#readonly-test .injury-diagram-toolbar button')).some(e=>e.textContent.includes('Thêm vị trí'))`),false)
    const storageBefore = await evaluate(`JSON.stringify(localStorage)`)
    await evaluate(`document.querySelector('#readonly-test .injury-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`)
    assert.equal(await evaluate(`JSON.stringify(localStorage)`),storageBefore)
    await evaluate(`window.scopeRoot.render(window.React.createElement(window.Mapping,{...window.scopeProps,horse:{...window.scopeProps.horse,id:'another-horse'}}))`)
    await until(() => evaluate(`document.querySelectorAll('#readonly-test .injury-list-item').length===0`),'horse switch clears context')
    assert.equal(await evaluate(`!!document.querySelector('#readonly-test .injury-form')`),false)
    await evaluate(`window.scopeRoot.unmount();document.querySelector('#readonly-test').remove()`)
    // Storage corruption is visible and retryable, never replaced by fresh example rows.
    await click('.injury-page-heading button')
    await evaluate(`window.demoKey=Object.keys(localStorage).find(k=>k.startsWith('equi.injury-diagram.demo:'));window.goodDemo=localStorage.getItem(window.demoKey);localStorage.setItem(window.demoKey,'{broken')`)
    await click('.injury-page-heading button')
    await until(() => evaluate(`!!document.querySelector('.injury-marker-list [role=alert]')`),'corrupted storage error')
    assert.equal(await evaluate(`localStorage.getItem(window.demoKey)`),'{broken')
    await evaluate(`localStorage.setItem(window.demoKey,window.goodDemo)`)
    await clickText('.injury-marker-list','Thử tải lại')
    await until(() => evaluate(`document.querySelectorAll('.injury-list-item').length===3`),'retry restores data')
    // Old-version metadata is retained in the list, never plotted on the new photograph.
    const legacyStore = await evaluate(`(() => {const parts=JSON.parse(window.demoKey.slice('equi.injury-diagram.demo:'.length));parts[3]='equi-horse-side-v1';const key='equi.injury-diagram.demo:'+JSON.stringify(parts);const envelope=JSON.parse(window.goodDemo);envelope.diagramVersion='equi-horse-side-v1';envelope.markers=envelope.markers.map(row=>({...row,diagramVersion:'equi-horse-side-v1',xRatio:309/900,yRatio:392/520}));const raw=JSON.stringify(envelope);localStorage.setItem(key,raw);localStorage.removeItem(window.demoKey);return {key,raw};})()`)
    await cdp('Page.reload');await waitSelector('.horse-injury-mapping')
    await click('.injury-page-heading button')
    await until(() => evaluate(`document.querySelectorAll('.injury-list-item').length===3`),'old metadata listed')
    await until(() => evaluate(`document.querySelector('.injury-diagram-stage').dataset.photoState==='ready'`),'photo ready after reload')
    assert.equal(await evaluate(`document.querySelectorAll('.injury-svg-marker').length`),0,'old points are not drawn on new image')
    await click('[data-injury-id=diagram-demo-2]')
    assert.equal(await evaluate(`document.querySelector('.injury-form fieldset').disabled`),true)
    assert.equal(await evaluate(`!!document.querySelector('.injury-position-summary button')`),false)
    await click('[data-injury-id=diagram-demo-1]')
    assert.ok((await evaluate(`document.querySelector('.injury-reposition-note').textContent`)).includes('Đổi vị trí'))
    await clickText('.injury-position-summary','Đổi vị trí');await selectField('diagramRegion','foreleg');await click('.injury-primary')
    assert.equal((await storedMarkers())[0].diagramVersion,DIAGRAM_VERSION)
    assert.equal((await storedMarkers())[1].diagramVersion,'equi-horse-side-v1')
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(legacyStore.key)})`),legacyStore.raw,'old storage remains byte-for-byte unchanged')
    assert.equal(await evaluate(`document.querySelectorAll('.injury-svg-marker').length`),1)
    await screenshot('injury-photo-legacy.png')
    // Missing assets disable placement; marker clicks in add mode do not bubble into placement.
    await evaluate(`(async () => {window.React=(await import('/node_modules/.vite/deps/react.js')).default;const {default:Diagram}=await import('/src/components/injury/HorseInjuryDiagram.jsx');const {DIAGRAM_VERSION,regionAnchor}=await import('/src/components/injury/horseDiagram.js');const rootModule=await import('/node_modules/.vite/deps/react-dom_client.js');const host=document.createElement('div');host.id='photo-test';host.style.cssText='position:fixed;inset:0;width:700px;z-index:99999;background:white';document.body.append(host);window.photoRoot=(rootModule.default||rootModule).createRoot(host);window.Diagram=Diagram;window.photoPicks=0;window.photoSelections=0;window.photoProps={view:'left',onView(){},mode:'add',canAdd:true,onMode(){},markers:[{id:'photo-test-marker',diagramVersion:DIAGRAM_VERSION,view:'left',bodySide:'left',bodyRegion:'back',...regionAnchor('back','left'),description:'Điểm thử',status:'treating',history:[]}],filters:{},draft:null,onPick(){window.photoPicks++},onSelect(){window.photoSelections++},busy:false,asset:{url:'/missing-horse-photo-test.png',mirrorImage:false,mirrorRegions:false}};window.photoRoot.render(window.React.createElement(Diagram,window.photoProps));})()`)
    await until(() => evaluate(`document.querySelector('#photo-test .injury-diagram-stage')?.dataset.photoState==='error'`),'missing image state')
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('#photo-test button')).find(e=>e.textContent==='Thêm vị trí chấn thương').disabled`),true)
    assert.equal(await evaluate(`!!document.querySelector('#photo-test select[name=diagramRegion]')`),false)
    await evaluate(`document.querySelector('#photo-test [data-region=head]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`)
    assert.equal(await evaluate(`window.photoPicks`),0)
    await clickText('#photo-test','Thử tải lại ảnh')
    await until(() => evaluate(`document.querySelector('#photo-test .injury-diagram-stage')?.dataset.photoState==='error'`),'missing image retry')
    await evaluate(`window.photoRoot.render(window.React.createElement(window.Diagram,{...window.photoProps,asset:{...window.photoProps.asset,url:'/images/injury/horse-reference-cutout-v2.png'}}))`)
    await until(() => evaluate(`document.querySelector('#photo-test .injury-diagram-stage')?.dataset.photoState==='ready'`),'reconfigured local asset ready')
    await evaluate(`document.querySelector('#photo-test [data-marker-id=photo-test-marker]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`)
    assert.equal(await evaluate(`window.photoSelections`),1)
    assert.equal(await evaluate(`window.photoPicks`),0,'marker click in add mode never places another injury')
    await evaluate(`window.photoRoot.unmount();document.querySelector('#photo-test').remove()`)
    // A real API read failure never activates demo automatically.
    await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/training-locks*',requestStage:'Request'}]})
    const originalMessage = socket.onmessage
    socket.onmessage = event => {const msg=JSON.parse(event.data);if(msg.method==='Fetch.requestPaused') void cdp('Fetch.fulfillRequest',{requestId:msg.params.requestId,responseCode:503,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from('{"detail":"Không tải được dữ liệu"}').toString('base64')});else originalMessage(event)}
    await cdp('Page.reload');await waitSelector('.horse-injury-mapping')
    await until(() => evaluate(`document.querySelector('.injury-restriction-title').textContent.includes('CHƯA XÁC ĐỊNH')`),'real API error visible')
    assert.equal(await evaluate(`!!document.querySelector('.injury-mode-note.is-demo')`),false)
    assert.equal(await evaluate(`document.querySelectorAll('.injury-list-item').length`),0)
    await cdp('Fetch.disable');socket.onmessage=originalMessage
    assert.equal(writes.length,writeCount)
    assert.deepEqual(exceptions,[],'No uncaught browser exceptions')
    console.log('PASS: actual Chromium; isolated Django API records/locks; SVG regions, pointer/keyboard/form selection, correct side, normalized coordinates at 1440/1024/834/390 and scroll, mobile touch, create/cancel/edit/reposition/delete, overlap/list selection, validation/write failure/duplicate submit, Signed protection, append-only recovery, filters/stable numbering, reload, read-only handlers, horse isolation, corrupt store/retry, API failure without demo fallback; no medical API mutations.')
  }
  console.log(`Screenshots: ${artifacts}`)
} finally {
  try { await cdp('Browser.close') } catch { browser.kill() }
  socket?.close(); await delay(300)
  await rm(profile, {recursive:true,force:true,maxRetries:4,retryDelay:300})
}
