import assert from 'node:assert/strict'
import { test } from 'node:test'
import { injuryRegionOptions, readInjuryLocation, writeInjuryLocation, toggleInjuryRegion, INJURY_LOCATION_LIMIT } from '../src/components/injury/injuryLocation.js'

test('Every anatomical region has a stable ID and explicit body side', () => {
  assert.equal(injuryRegionOptions.length, 18)
  assert.equal(new Set(injuryRegionOptions.map(region => region.id)).size, 18)
  assert.ok(injuryRegionOptions.every(region => region.bodyRegion && ['left', 'right'].includes(region.bodySide) && region.label))
})
test('Multiple regions and both body sides round trip through the actual text contract', () => {
  const selected = ['head:left', 'hindleg:left', 'foreleg:right', 'abdomen:right']
  const value = writeInjuryLocation(selected, 'Giữ nguyên mô tả cũ\nDòng thứ hai')
  assert.deepEqual(new Set(readInjuryLocation(value).selected), new Set(selected))
  assert.equal(readInjuryLocation(value).note, 'Giữ nguyên mô tả cũ\nDòng thứ hai')
  assert.deepEqual(readInjuryLocation(toggleInjuryRegion(value, 'head:left')).selected.includes('head:left'), false)
  assert.equal(readInjuryLocation(toggleInjuryRegion(value, 'head:right')).selected.includes('head:left'), true)
  assert.equal(readInjuryLocation(toggleInjuryRegion(value, 'head:right')).selected.includes('head:right'), true)
  assert.equal(writeInjuryLocation([], readInjuryLocation(value).note), 'Giữ nguyên mô tả cũ\nDòng thứ hai')
  assert.ok(writeInjuryLocation(injuryRegionOptions.map(region => region.id)).length <= INJURY_LOCATION_LIMIT)
})
test('Legacy free text and unknown notation never get guessed into anatomy or lost', () => {
  for (const value of ['Cổ chân trước trái — hồ sơ thật', 'Vai/ngực, phải', 'Vùng chọn: Vùng chưa biết (bên phải)\nGhi chú']) {
    assert.deepEqual(readInjuryLocation(value), { selected: [], note: value })
    const added = toggleInjuryRegion(value, 'head:left')
    assert.equal(readInjuryLocation(added).note, value)
    assert.equal(toggleInjuryRegion(added, 'head:left'), value)
  }
  assert.equal(toggleInjuryRegion('Mô tả', 'not-a-region'), 'Mô tả')
})
test('Persisted region identity is independent of a changed display label', () => {
  const option = injuryRegionOptions.find(region => region.id === 'head:left')
  const saved = writeInjuryLocation([option.id])
  const label = option.label
  try {
    option.label = 'Tên hiển thị mới'
    assert.deepEqual(readInjuryLocation(saved).selected, ['head:left'])
    assert.equal(writeInjuryLocation(['head:left']), saved)
  } finally { option.label = label }
})
