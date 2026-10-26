import assert from 'node:assert/strict'
import { test } from 'node:test'
import { trainingRestriction } from '../src/components/injury/injuryDomain.js'

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
