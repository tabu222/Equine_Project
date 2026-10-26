import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isSurfaceClick, trainingRestriction, validModelPoint, viewForPoint } from '../src/components/injury/injuryDomain.js'
import { DEMO_MODEL_VERSION, demoMarkerRepository } from '../src/mock/injuryMarkers.js'

test('Active full lock wins over eligible or restricted clinical conclusions', () => {
  const rows = [{ LockStatus: 'Released', LockLevel: 'Full' }, { LockStatus: 'Active', LockLevel: 'Restricted' }, { LockStatus: 'Active', LockLevel: 'Full', Reason: 'Clinical hold' }]
  const state = trainingRestriction({ rows }, { trainingEligibility: 'Eligible' }, true)
  assert.equal(state.title, 'KHÓA HUẤN LUYỆN')
  assert.equal(state.lock.Reason, 'Clinical hold')
  assert.equal(rows.length, 3)
  assert.equal(trainingRestriction({ rows: rows.slice(0, 2) }, { trainingEligibility: 'Eligible' }, true).tone, 'warning')
})

test('Loading, failed locks, absent conclusions and unaccepted horses never imply clearance', () => {
  const eligible = { trainingEligibility: 'Eligible' }
  assert.equal(trainingRestriction({ loading: true, rows: [] }, eligible, true).tone, 'neutral')
  assert.equal(trainingRestriction({ error: 'offline', rows: [] }, eligible, true).tone, 'neutral')
  assert.equal(trainingRestriction({ rows: [] }, null, true).tone, 'neutral')
  assert.equal(trainingRestriction({ rows: [] }, eligible, false).tone, 'neutral')
  assert.equal(trainingRestriction({ rows: [] }, eligible, true).tone, 'success')
  assert.equal(trainingRestriction({ rows: [] }, { trainingEligibility: 'Not Eligible' }, true).tone, 'danger')
})

test('Only a stationary matching pointer selects a surface, including after a drag returns to its origin', () => {
  const start = { pointerId: 1, clientX: 10, clientY: 10, dragged: false }
  assert.equal(isSurfaceClick(start, { pointerId: 1, clientX: 12, clientY: 12 }), true)
  assert.equal(isSurfaceClick(start, { pointerId: 2, clientX: 10, clientY: 10 }), false)
  assert.equal(isSurfaceClick(start, { pointerId: 1, clientX: 25, clientY: 10 }), false)
  assert.equal(isSurfaceClick({ ...start, dragged: true }, start), false)
  assert.equal(isSurfaceClick(null, start), false)
})

test('Coordinates require finite 3D numbers and choose viewing sides without clinical labels', () => {
  assert.equal(validModelPoint({ x: 0, y: -1, z: 0.12345678 }), true)
  for (const point of [{ x: '0', y: 1, z: 2 }, { x: NaN, y: 0, z: 0 }, { x: 0, y: Infinity, z: 0 }, { x: 0, y: 0 }, null]) assert.equal(validModelPoint(point), false)
  assert.equal(viewForPoint({ x: 0, y: 1, z: -1 }), 'right')
  assert.equal(viewForPoint({ x: 2, y: 0, z: 0 }), 'front')
})

test('Demo saves preserve coordinates, survive remount, stay scoped to user/club/horse/model, and cannot call APIs', async () => {
  const scope = { userId: 'unit-vet', clubId: 'unit-club', horseId: 'unit-horse', modelVersion: DEMO_MODEL_VERSION }
  const originalFetch = globalThis.fetch
  globalThis.fetch = () => { throw new Error('Demo must not call any API') }
  try {
    const repo = demoMarkerRepository(scope)
    const rows = repo.list()
    const original = rows[0]
    original.description = 'Changed demo'
    const saved = await repo.save(original)
    assert.deepEqual(saved[0].point, original.point)
    assert.equal(demoMarkerRepository(scope).list()[0].description, 'Changed demo')
    saved[0].description = 'Mutated output'
    assert.equal(repo.list()[0].description, 'Changed demo')
    for (const changed of [{ userId: 'another' }, { clubId: 'another' }, { horseId: 'another' }]) assert.notEqual(demoMarkerRepository({ ...scope, ...changed }).list()[0].description, 'Changed demo')
    assert.deepEqual(demoMarkerRepository({ ...scope, modelVersion: 'actual-model-v1' }).list(), [])
    await assert.rejects(repo.save({ ...original, horseId: 'wrong' }))
    await assert.rejects(repo.save({ ...original, modelVersion: 'wrong' }))
    await assert.rejects(repo.save({ ...original, point: { x: NaN, y: 0, z: 0 } }))
    await assert.rejects(repo.save({ ...original, location: '   ' }))
    assert.equal((await repo.remove(original.id)).length, 1)
  } finally { globalThis.fetch = originalFetch }
})
