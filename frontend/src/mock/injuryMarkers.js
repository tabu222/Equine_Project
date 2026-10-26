import { injurySeverities, injuryStatuses, validModelPoint } from '../components/injury/injuryDomain.js'

// Deliberately isolated from medical APIs and browser storage. Cleared on page reload.
const sessions = new Map()
export const DEMO_MODEL_VERSION = 'illustrative-points-v1'

function examples(horseId) {
  return [
    { id: 'demo-1', horseId, modelVersion: DEMO_MODEL_VERSION, point: { x: 0.85, y: 0.6, z: 0.3 }, location: 'Chân trước trái', description: 'Sưng vùng gối', severity: 'moderate', status: 'treating', detectedAt: '2026-10-18', notes: 'Dữ liệu minh họa để dùng thử biểu mẫu.' },
    { id: 'demo-2', horseId, modelVersion: DEMO_MODEL_VERSION, point: { x: -0.7, y: 1.3, z: -0.35 }, location: 'Hông phải', description: 'Căng cơ nhẹ', severity: 'mild', status: 'monitoring', detectedAt: '2026-10-20', notes: 'Dữ liệu minh họa, không phải bệnh án của ngựa.' },
  ]
}

export function demoMarkerRepository({ userId, clubId, horseId, modelVersion }) {
  const key = JSON.stringify([userId, clubId, horseId, modelVersion])
  if (!sessions.has(key)) sessions.set(key, modelVersion === DEMO_MODEL_VERSION ? examples(horseId) : [])
  const copy = value => JSON.parse(JSON.stringify(value))
  return {
    list: () => copy(sessions.get(key)),
    async save(marker) {
      if (marker.horseId !== horseId || marker.modelVersion !== modelVersion || !validModelPoint(marker.point)) throw new Error('Vị trí không thuộc mô hình đang dùng thử.')
      if (!marker.location.trim() || !marker.description.trim() || !injurySeverities[marker.severity] || !injuryStatuses[marker.status] || !/^\d{4}-\d{2}-\d{2}$/.test(marker.detectedAt)) throw new Error('Vui lòng kiểm tra thông tin chấn thương.')
      const rows = sessions.get(key)
      const item = copy({ ...marker, id: marker.id || `demo-${crypto.randomUUID()}` })
      sessions.set(key, rows.some(row => row.id === item.id) ? rows.map(row => row.id === item.id ? item : row) : [...rows, item])
      return this.list()
    },
    async remove(id) {
      sessions.set(key, sessions.get(key).filter(row => row.id !== id))
      return this.list()
    },
  }
}
