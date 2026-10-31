import { bodyRegions } from './horseDiagram.js'

export const INJURY_LOCATION_LIMIT = 500
const prefix = 'Vùng chọn: '
// Frozen text aliases for the existing text-only API. UI labels may change
// independently without breaking records saved by this picker.
const storedNames = { head: 'Đầu', neck: 'Cổ', shoulder: 'Vai', back: 'Lưng', thorax: 'Ngực/thân', abdomen: 'Bụng', hindquarters: 'Mông', foreleg: 'Chân trước', hindleg: 'Chân sau' }
export const injuryRegionOptions = ['left', 'right'].flatMap(bodySide => bodyRegions.map(region => ({
  id: `${region.id}:${bodySide}`, bodyRegion: region.id, bodySide,
  label: `${region.label} (bên ${bodySide === 'left' ? 'trái' : 'phải'})`,
  storageLabel: `${storedNames[region.id]} (bên ${bodySide === 'left' ? 'trái' : 'phải'})`,
})))

// The API stores text only. Recognize our exact, explicit notation; never infer
// anatomy or side from a doctor's free text (e.g. "cổ chân trước trái").
export function readInjuryLocation(value = '') {
  const [first, ...rest] = value.split('\n')
  if (!first.startsWith(prefix)) return { selected: [], note: value }
  const labels = first.slice(prefix.length).split('; ').filter(Boolean)
  const options = labels.map(label => injuryRegionOptions.find(option => option.storageLabel === label))
  if (options.some(option => !option)) return { selected: [], note: value }
  return { selected: [...new Set(options.map(option => option.id))], note: rest.join('\n') }
}

export function writeInjuryLocation(selected, note = '') {
  const options = injuryRegionOptions.filter(option => selected.includes(option.id))
  return [options.length ? prefix + options.map(option => option.storageLabel).join('; ') : '', note].filter(Boolean).join('\n')
}

export function toggleInjuryRegion(value, id) {
  if (!injuryRegionOptions.some(option => option.id === id)) return value
  const { selected, note } = readInjuryLocation(value)
  return writeInjuryLocation(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id], note)
}
