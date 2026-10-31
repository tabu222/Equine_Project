import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createInjuryDiagramRepository, diagramStorageKey } from '../src/api/injuryDiagramRepository.js'
import { bodyRegions, diagramAsset, DIAGRAM_VERSION, LEGACY_DIAGRAM_VERSIONS, regionAnchor } from '../src/components/injury/horseDiagram.js'
import { demoRecords, filterDiagramMarkers, hasDiagramPosition, markerIsEditable, markerStatus, validateAssessment, validateDiagramMarker } from '../src/components/injury/injuryDiagramDomain.js'
import { clubToday } from '../src/pages/vet/vetDomain.js'

const scope = { userId: 'test-demo-user', clubId: 'test-club', horseId: 'test-horse' }
function setup() {
  const values = new Map()
  let permissions = ['MEDICAL_MANAGE']
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const repo = createInjuryDiagramRepository({ mode: 'demo', scope, getPermissions: () => permissions, storage: () => storage })
  return { repo, storage, values, revoke: () => { permissions = [] } }
}
test('Real mode makes no API calls, never opens demo storage, and refuses writes', async () => {
  const repo = createInjuryDiagramRepository({ mode: 'api', scope, storage: () => { throw new Error('Must not open storage') } })
  assert.equal(repo.supported, false)
  assert.deepEqual(await repo.list(), [])
  assert.throws(() => repo.save({}), /chưa được hỗ trợ/)
  assert.throws(() => repo.remove('id'), /chưa được hỗ trợ/)
})
test('Stable regions, independent side coordinates and version checks', () => {
  assert.equal(new Set(bodyRegions.map(region => region.id)).size, 9)
  for (const region of bodyRegions) for (const view of ['left', 'right']) {
    assert.equal(hasDiagramPosition({ ...regionAnchor(region.id, view), bodyRegion: region.id, bodySide: view, view, diagramVersion: DIAGRAM_VERSION }), true)
  }
  const position = { ...regionAnchor('head', 'left'), bodyRegion: 'head', bodySide: 'left', view: 'left', diagramVersion: DIAGRAM_VERSION }
  for (const patch of [{ xRatio: -0.01 }, { yRatio: 1.01 }, { xRatio: NaN }, { yRatio: Infinity }, { bodySide: 'right' }, { view: 'toString', bodySide: 'toString' }, { diagramVersion: 'old' }, { bodyRegion: 'unknown' }]) assert.equal(hasDiagramPosition({ ...position, ...patch }), false)
  assert.equal(regionAnchor('head', 'toString'), null)
})
test('Demo persists across adapter reload, isolates all contexts, stores synthetic identities only', async () => {
  const { repo, storage, values } = setup()
  const row = (await repo.list())[0]
  const saved = await repo.save({ ...row, description: 'Chỉ là dữ liệu thử', unexpectedField: 'do not persist' })
  const reloaded = createInjuryDiagramRepository({ mode: 'demo', scope, getPermissions: () => ['MEDICAL_MANAGE'], storage: () => storage })
  assert.deepEqual(await reloaded.list(), saved)
  assert.equal(saved[0].unexpectedField, undefined)
  saved[0].description = 'External mutation'
  assert.equal((await reloaded.list())[0].description, 'Chỉ là dữ liệu thử')
  for (const patch of [{ userId: 'other' }, { clubId: 'other' }, { horseId: 'other' }]) assert.notEqual(diagramStorageKey(scope), diagramStorageKey({ ...scope, ...patch }))
  const raw = [...values.values()][0]
  assert.equal(raw.includes(scope.horseId), false)
  assert.equal(raw.includes(scope.userId), false)
  assert.equal(raw.includes('unexpectedField'), false)
})
test('Signed injuries cannot be edited, deleted, relinked, or bypassed with altered input', async () => {
  const { repo, values } = setup()
  const signed = (await repo.list())[1]
  assert.equal(markerIsEditable(signed, demoRecords, ['MEDICAL_MANAGE']), false)
  await assert.rejects(repo.save({ ...signed, description: 'Overwrite' }), /đã chốt/)
  await assert.rejects(repo.save({ ...signed, medicalRecordId: 'demo-draft' }), /đã chốt/)
  await assert.rejects(repo.remove(signed.id), /đã chốt/)
  assert.equal(values.size, 0)
})
test('Permissions are rechecked at mutation time, including follow-up entries', async () => {
  const { repo, revoke } = setup()
  const row = (await repo.list())[0]
  revoke()
  await assert.rejects(repo.save(row), /chỉ có quyền xem/)
  await assert.rejects(repo.remove(row.id), /chỉ có quyền xem/)
  await assert.rejects(repo.appendAssessment(row.id, {}), /chỉ có quyền xem/)
})
test('New recovery entries preserve original Signed snapshot and every prior assessment', async () => {
  const { repo } = setup()
  const original = (await repo.list())[1]
  const entry = { date: clubToday(), status: 'recovered', comment: 'Tiến triển minh họa', medicalRecordId: 'demo-followup' }
  await assert.rejects(repo.appendAssessment(original.id, { ...entry, medicalRecordId: 'demo-signed' }))
  const first = (await repo.appendAssessment(original.id, entry))[1]
  const second = (await repo.appendAssessment(original.id, { ...entry, comment: 'Lần hai' }))[1]
  assert.deepEqual({ ...second, history: [] }, original)
  assert.deepEqual(second.history[0], first.history[0])
  assert.equal(second.history.length, 2)
  assert.notEqual(second.history[0].id, second.history[1].id)
  assert.equal(markerStatus(second), 'recovered')
  assert.equal(second.status, 'monitoring')
})
test('Validation rejects empty, future/impossible dates and unknown records or enums', async () => {
  const { repo } = setup()
  const row = (await repo.list())[0]
  const errors = validateDiagramMarker({ ...row, description: ' ', detectedAt: '2026-02-30', severity: 'Healthy', status: 'Signed', medicalRecordId: 'a-real-record' }, clubToday(), demoRecords)
  for (const key of ['description', 'detectedAt', 'severity', 'status', 'medicalRecordId']) assert.ok(errors[key])
  assert.ok(validateDiagramMarker({ ...row, detectedAt: '2999-01-01' }, clubToday(), demoRecords).detectedAt)
  assert.ok(validateDiagramMarker({ ...row, status: 'toString', severity: '__proto__' }, clubToday(), demoRecords).status)
  assert.ok(validateAssessment({ date: '2000-01-01', comment: '', status: 'bad', medicalRecordId: 'demo-draft' }, row, clubToday(), demoRecords).date)
  await assert.rejects(repo.save({ ...row, horseId: 'real-horse' }))
})
test('Storage failures preserve saved contents; corrupted data never gets reset or overwritten', async () => {
  const { repo, storage, values } = setup()
  const row = (await repo.list())[0]
  await repo.save(row)
  const before = [...values.values()][0]
  storage.setItem = () => { throw new Error('QuotaExceededError') }
  await assert.rejects(repo.save({ ...row, description: 'Unsaved change' }), /QuotaExceeded/)
  assert.equal([...values.values()][0], before)
  values.set(diagramStorageKey(scope), '{broken')
  await assert.rejects(repo.list(), /giữ nguyên/)
  await assert.rejects(repo.save(row), /giữ nguyên/)
  assert.equal(values.get(diagramStorageKey(scope)), '{broken')
})
test('Multiple injuries can share a position; filters use current recovery status', async () => {
  const { repo } = setup()
  const original = (await repo.list())[0]
  const rows = await repo.save({ ...original, id: undefined, description: 'Chấn thương thứ hai cùng vùng' })
  assert.equal(rows.length, 3)
  assert.notEqual(rows[0].id, rows[2].id)
  assert.equal(rows[0].xRatio, rows[2].xRatio)
  assert.equal(filterDiagramMarkers(rows, { region: 'foreleg' }).length, 2)
  assert.equal(filterDiagramMarkers(rows, { severity: 'severe' }).length, 0)
  await repo.appendAssessment(original.id, { date: clubToday(), status: 'recovered', comment: 'Theo dõi giả', medicalRecordId: 'demo-followup' })
  assert.equal(filterDiagramMarkers(await repo.list(), { status: 'recovered' }).length, 1)
  await assert.rejects(repo.remove(original.id), /lịch sử/)
})
test('Photo URLs stay local and a mirrored illustration is distinguished from a separate right-side photo', () => {
  const mirrored = diagramAsset('right', { left: '/images/injury/horse-reference-cutout-v2.png' })
  assert.equal(mirrored.mirrorImage, true)
  assert.equal(mirrored.illustrationOnly, true)
  const separate = diagramAsset('right', { left: '/left.png', right: '/right.webp' })
  assert.equal(separate.mirrorImage, false)
  assert.equal(separate.mirrorRegions, true)
  assert.equal(separate.illustrationOnly, false)
  for (const left of ['https://external.test/horse.png', '//external.test/horse.png', '/\\external.test/horse.png', 'data:image/png;base64,123', '/photo.jpg'])
    assert.equal(diagramAsset('left', { left }).url, '')
})
test('Previous-version metadata remains readable without silently moving coordinates or overwriting the old store', async () => {
  const { repo, storage, values } = setup()
  const previousVersion = LEGACY_DIAGRAM_VERSIONS[0]
  const previous = (await repo.list()).map(marker => ({ ...marker, diagramVersion: previousVersion, xRatio: 309 / 900, yRatio: 392 / 520 }))
  const key = diagramStorageKey(scope, previousVersion)
  const original = JSON.stringify({ diagramVersion: previousVersion, markers: previous })
  storage.setItem(key, original)
  assert.deepEqual(await repo.list(), previous)
  assert.equal(values.size, 1, 'read does not write a migrated snapshot')
  assert.equal(hasDiagramPosition((await repo.list())[0]), false)
  await assert.rejects(repo.save(previous[0]), /kiểm tra/)
  await assert.rejects(repo.save({ ...previous[1], diagramVersion: DIAGRAM_VERSION, ...regionAnchor('hindquarters', 'right') }), /đã chốt/)
  const repositioned = { ...previous[0], diagramVersion: DIAGRAM_VERSION, ...regionAnchor('foreleg', 'left') }
  await repo.save(repositioned)
  const current = await repo.list()
  assert.equal(hasDiagramPosition(current[0]), true)
  assert.equal(current[0].description, previous[0].description)
  assert.equal(hasDiagramPosition(current[1]), false)
  assert.equal(storage.getItem(key), original)
  assert.equal(JSON.parse(storage.getItem(diagramStorageKey(scope))).markers.length, 2)
})
test('Recovery can append to old-version Signed metadata while its original position remains untouched', async () => {
  const { repo, storage } = setup()
  const version = LEGACY_DIAGRAM_VERSIONS[0]
  const marker = { ...(await repo.list())[1], diagramVersion: version }
  storage.setItem(diagramStorageKey(scope, version), JSON.stringify({ diagramVersion: version, markers: [marker] }))
  const rows = await repo.appendAssessment(marker.id, { date: clubToday(), status: 'recovered', comment: 'Theo dõi giả', medicalRecordId: 'demo-followup' })
  assert.equal(rows[0].diagramVersion, version)
  assert.equal(hasDiagramPosition(rows[0]), false)
  assert.equal(rows[0].history.length, 1)
  assert.deepEqual((await repo.list())[0], rows[0])
})
test('Empty or damaged previous-version storage never seeds over old data', async () => {
  const { repo, storage } = setup()
  const version = LEGACY_DIAGRAM_VERSIONS[0], key = diagramStorageKey(scope, version)
  storage.setItem(key, JSON.stringify({ diagramVersion: version, markers: [] }))
  assert.deepEqual(await repo.list(), [])
  storage.setItem(key, '{broken')
  await assert.rejects(repo.list(), /giữ nguyên/)
  assert.equal(storage.getItem(key), '{broken')
  assert.equal(storage.getItem(diagramStorageKey(scope)), null)
})
