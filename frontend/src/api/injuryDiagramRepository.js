import { DIAGRAM_VERSION, LEGACY_DIAGRAM_VERSIONS, regionAnchor } from '../components/injury/horseDiagram.js'
import { demoRecords, hasDiagramPosition, markerIsEditable, validateAssessment, validateDiagramMarker, validateStoredDiagramMarker } from '../components/injury/injuryDiagramDomain.js'
import { clubToday } from '../pages/vet/vetDomain.js'

const clone = value => JSON.parse(JSON.stringify(value))
const unsupported = () => { throw new Error('Chức năng lưu sơ đồ chưa được hỗ trợ.') }
const invalidStore = () => new Error('Không đọc được dữ liệu minh họa. Dữ liệu đã lưu được giữ nguyên; vui lòng kiểm tra bộ nhớ trình duyệt và thử lại.')
export function diagramStorageKey({ userId, clubId, horseId }, version = DIAGRAM_VERSION) {
  return `equi.injury-diagram.demo:${JSON.stringify([userId, clubId, horseId, version])}`
}
function initialMarkers() {
  return [
    { id: 'diagram-demo-1', medicalRecordId: 'demo-draft', bodyRegion: 'foreleg', bodySide: 'left', view: 'left', ...regionAnchor('foreleg', 'left'), description: 'Sưng nhẹ vùng chân trước · ví dụ', severity: 'moderate', status: 'treating' },
    { id: 'diagram-demo-2', medicalRecordId: 'demo-signed', bodyRegion: 'hindquarters', bodySide: 'right', view: 'right', ...regionAnchor('hindquarters', 'right'), description: 'Căng cơ vùng mông · ví dụ đã chốt', severity: 'mild', status: 'monitoring' },
  ].map(marker => ({ ...marker, horseId: 'demo-horse', diagramVersion: DIAGRAM_VERSION, detectedAt: clubToday(), notes: 'Chỉ là dữ liệu minh họa.', history: [] }))
}

// Replace only this adapter when a BE contract exists. Never probe invented endpoints
// or fall back to demo on errors. No actual medical records/names/tokens enter this store.
export function createInjuryDiagramRepository({ mode, scope, getPermissions, storage = () => window.localStorage }) {
  if (mode !== 'demo') return { mode: 'unsupported', supported: false, list: async () => [], save: unsupported, remove: unsupported, appendAssessment: unsupported }
  const key = diagramStorageKey(scope)
  function readEnvelope(raw, version) {
    try {
      const envelope = JSON.parse(raw)
      if (envelope.diagramVersion !== version || !Array.isArray(envelope.markers) ||
        new Set(envelope.markers.map(marker => marker.id)).size !== envelope.markers.length ||
        envelope.markers.some(marker => !marker.id || marker.horseId !== 'demo-horse' ||
          !Array.isArray(marker.history) || Object.keys(validateStoredDiagramMarker(marker, clubToday(), demoRecords)).length ||
          marker.history.some(entry => !entry.id || !entry.at || entry.author !== 'Bác sĩ minh họa' || Object.keys(validateAssessment(entry, marker, clubToday(), demoRecords)).length))) throw invalidStore()
      return envelope.markers
    } catch { throw invalidStore() }
  }
  function read() {
    const store = storage(), raw = store.getItem(key)
    if (raw !== null) return readEnvelope(raw, DIAGRAM_VERSION)
    const legacy = []
    let foundLegacy = false
    for (const version of LEGACY_DIAGRAM_VERSIONS) {
      const previous = store.getItem(diagramStorageKey(scope, version))
      if (previous !== null) { foundLegacy = true; legacy.push(...readEnvelope(previous, version)) }
    }
    // This is a read-only import of metadata, NOT a coordinate migration. A later
    // explicit save writes a v2 snapshot; the original v1 key is left untouched.
    if (new Set(legacy.map(marker => marker.id)).size !== legacy.length) throw invalidStore()
    return foundLegacy ? legacy : initialMarkers()
  }
  function write(markers) {
    // setItem must succeed before the caller sees success. Quota/privacy failures keep the draft.
    storage().setItem(key, JSON.stringify({ diagramVersion: DIAGRAM_VERSION, markers }))
    return clone(markers)
  }
  function requirePermission() {
    if (!getPermissions().includes('MEDICAL_MANAGE')) throw new Error('Bạn chỉ có quyền xem sơ đồ.')
  }
  return {
    mode: 'demo', supported: true,
    async list() { return clone(read()) },
    async save(input) {
      requirePermission()
      const rows = read(), original = rows.find(row => row.id === input.id)
      if (input.id && !original) throw new Error('Không tìm thấy chấn thương cần sửa.')
      if (!markerIsEditable(original || input, demoRecords, getPermissions()) ||
        (original && original.medicalRecordId !== input.medicalRecordId) ||
        !markerIsEditable(input, demoRecords, getPermissions())) throw new Error('Phiếu đã chốt hoặc không còn khả dụng. Không thể sửa trực tiếp.')
      if (input.horseId !== 'demo-horse' || !hasDiagramPosition(input) || Object.keys(validateDiagramMarker(input, clubToday(), demoRecords)).length)
        throw new Error('Vui lòng kiểm tra thông tin chấn thương.')
      // Whitelist fields; history can only change through appendAssessment.
      const item = {
        id: original?.id || `diagram-demo-${crypto.randomUUID()}`, horseId: 'demo-horse',
        medicalRecordId: input.medicalRecordId || '', bodyRegion: input.bodyRegion, bodySide: input.bodySide,
        view: input.view, xRatio: input.xRatio, yRatio: input.yRatio, diagramVersion: DIAGRAM_VERSION,
        description: input.description.trim(), severity: input.severity, status: input.status,
        detectedAt: input.detectedAt, notes: (input.notes || '').trim(), history: original?.history || [],
      }
      return write(original ? rows.map(row => row.id === item.id ? item : row) : [...rows, item])
    },
    async remove(id) {
      requirePermission()
      const rows = read(), original = rows.find(row => row.id === id)
      if (!original || !markerIsEditable(original, demoRecords, getPermissions()) || original.history.length)
        throw new Error('Không thể xóa chấn thương đã chốt hoặc đã có lịch sử phục hồi.')
      return write(rows.filter(row => row.id !== id))
    },
    async appendAssessment(id, input) {
      requirePermission()
      const rows = read(), original = rows.find(row => row.id === id)
      if (!original || Object.keys(validateAssessment(input, original, clubToday(), demoRecords)).length)
        throw new Error('Vui lòng kiểm tra thông tin tái khám.')
      const entry = { id: crypto.randomUUID(), date: input.date, at: new Date().toISOString(), status: input.status,
        comment: input.comment.trim(), author: 'Bác sĩ minh họa', medicalRecordId: input.medicalRecordId }
      // A follow-up is a new record, including for an injury originating in a Signed record.
      return write(rows.map(row => row.id === id ? { ...row, history: [...row.history, entry] } : row))
    },
  }
}
