import { bodyRegions, DIAGRAM_VERSION, diagramViews } from './horseDiagram.js'
// Proposed diagram-only enums. The BE has no injury/assessment contract yet.
// These are NOT MedicalRecord.HealthStatus or HealthReport.Severity.
export { injurySeverities, injuryStatuses } from './injuryDomain.js'
import { injurySeverities, injuryStatuses } from './injuryDomain.js'

export const demoRecords = [
  { id: 'demo-draft', label: 'Phiếu minh họa A · Đang khám', recordStatus: 'Draft' },
  { id: 'demo-signed', label: 'Phiếu minh họa B · Đã chốt', recordStatus: 'Signed' },
  { id: 'demo-followup', label: 'Phiếu tái khám minh họa · Đang khám', recordStatus: 'Draft' },
]
export const regionLabel = id => bodyRegions.find(region => region.id === id)?.label || 'Vị trí cần đặt lại'
export const sideLabel = side => side === 'left' ? 'Trái' : side === 'right' ? 'Phải' : 'Chưa xác định'
export const markerStatus = marker => marker.history?.at(-1)?.status || marker.status
export function hasDiagramPosition(marker) {
  return marker.diagramVersion === DIAGRAM_VERSION && Object.keys(diagramViews).includes(marker.view) && marker.bodySide === marker.view &&
    bodyRegions.some(region => region.id === marker.bodyRegion) &&
    ['xRatio', 'yRatio'].every(key => Number.isFinite(marker[key]) && marker[key] >= 0 && marker[key] <= 1)
}
export function markerIsEditable(marker, records, permissions) {
  if (!permissions.includes('MEDICAL_MANAGE')) return false
  if (!marker.medicalRecordId) return true
  return records.some(record => record.id === marker.medicalRecordId && record.recordStatus === 'Draft')
}
function validDay(value, today) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
    !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value && value <= today
}
export function validateDiagramMarker(marker, today, records) {
  const errors = {}
  if (!hasDiagramPosition(marker)) errors.bodyRegion = 'Vui lòng chọn một vị trí trên sơ đồ hoặc trong danh sách vùng.'
  if (!marker.description?.trim()) errors.description = 'Vui lòng mô tả chấn thương.'
  else if (marker.description.trim().length > 1500) errors.description = 'Mô tả tối đa 1.500 ký tự.'
  if (!Object.keys(injurySeverities).includes(marker.severity)) errors.severity = 'Vui lòng chọn mức độ.'
  if (!Object.keys(injuryStatuses).includes(marker.status)) errors.status = 'Vui lòng chọn tình trạng.'
  if (!validDay(marker.detectedAt, today)) errors.detectedAt = 'Chọn ngày hợp lệ, không sau hôm nay.'
  if ((marker.notes || '').length > 2000) errors.notes = 'Ghi chú tối đa 2.000 ký tự.'
  if (marker.medicalRecordId && !records.some(record => record.id === marker.medicalRecordId)) errors.medicalRecordId = 'Không tìm thấy phiếu khám liên quan.'
  return errors
}
// Older geometry remains readable. Only explicit repositioning may turn it into
// a current-version position; do not normalize or reflect old coordinates here.
export function validateStoredDiagramMarker(marker, today, records) {
  const errors = validateDiagramMarker(marker, today, records)
  if (typeof marker.diagramVersion === 'string' && marker.diagramVersion && marker.diagramVersion !== DIAGRAM_VERSION) delete errors.bodyRegion
  return errors
}
export function validateAssessment(entry, marker, today, records) {
  const errors = {}
  if (!Object.keys(injuryStatuses).includes(entry.status)) errors.status = 'Vui lòng chọn tình trạng.'
  if (!entry.comment?.trim()) errors.comment = 'Vui lòng nhập nhận xét phục hồi.'
  else if (entry.comment.trim().length > 1500) errors.comment = 'Nhận xét tối đa 1.500 ký tự.'
  if (!validDay(entry.date, today) || entry.date < marker.detectedAt) errors.date = 'Ngày theo dõi phải từ ngày phát hiện đến hôm nay.'
  if (!records.some(record => record.id === entry.medicalRecordId && record.recordStatus === 'Draft' && record.id !== marker.medicalRecordId))
    errors.medicalRecordId = 'Chọn một phiếu tái khám đang mở, khác phiếu ghi nhận ban đầu.'
  return errors
}
export function filterDiagramMarkers(markers, filters) {
  return markers.filter(marker => (!filters.region || marker.bodyRegion === filters.region) &&
    (!filters.severity || marker.severity === filters.severity) && (!filters.status || markerStatus(marker) === filters.status))
}

// Pointer coordinates -> SVG scene space, including scroll, CSS scaling and letterboxing.
export function pointerInSvg(svg, clientX, clientY) {
  const matrix = svg.getScreenCTM()
  if (!matrix) return null
  const point = svg.createSVGPoint()
  point.x = clientX; point.y = clientY
  const local = point.matrixTransform(matrix.inverse())
  const box = svg.viewBox.baseVal
  return { xRatio: (local.x - box.x) / box.width, yRatio: (local.y - box.y) / box.height }
}
