import { vetDate } from '../../pages/vet/vetDomain.js'
import { bodyRegions } from './horseDiagram.js'
import { filterDiagramMarkers, hasDiagramPosition, injurySeverities, injuryStatuses, markerStatus, regionLabel, sideLabel } from './injuryDiagramDomain.js'

export default function InjuryMarkerList({ markers, selectedId, onSelect, filters, onFilters, supported, loading, error, onRetry, busy }) {
  const visible = filterDiagramMarkers(markers, filters)
  return <section className="injury-card injury-marker-list" aria-labelledby="injury-list-title">
    <header className="injury-card-heading"><div><h3 id="injury-list-title">Các chấn thương <span className="injury-count">{supported ? markers.length : '—'}</span></h3><p>Chọn trong danh sách để xem cả những dấu ở gần nhau.</p></div></header>
    {supported && <div className="injury-filters">
      <label className="form-field"><span>Vùng cơ thể</span><select name="filterRegion" value={filters.region} disabled={busy} onChange={event => onFilters({ ...filters, region: event.target.value })}><option value="">Tất cả vùng</option>{bodyRegions.map(region => <option key={region.id} value={region.id}>{region.label}</option>)}</select></label>
      <label className="form-field"><span>Mức độ</span><select name="filterSeverity" value={filters.severity} disabled={busy} onChange={event => onFilters({ ...filters, severity: event.target.value })}><option value="">Tất cả mức độ</option>{Object.entries(injurySeverities).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="form-field"><span>Tình trạng</span><select name="filterStatus" value={filters.status} disabled={busy} onChange={event => onFilters({ ...filters, status: event.target.value })}><option value="">Tất cả tình trạng</option>{Object.entries(injuryStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    </div>}
    {loading ? <p className="injury-list-empty" role="status">Đang tải các chấn thương…</p> : error ? <div className="injury-list-empty" role="alert"><p>{error}</p><button type="button" className="button button-secondary" onClick={onRetry}>Thử tải lại</button></div> : !supported ? <p className="injury-list-empty">Chưa hỗ trợ lưu vị trí trên sơ đồ. Xem thông tin đã ghi trong bệnh án bên dưới.</p> : !markers.length ? <p className="injury-list-empty">Chưa ghi nhận chấn thương trong dữ liệu minh họa.</p> : !visible.length ? <div className="injury-list-empty"><p>Không có chấn thương phù hợp bộ lọc.</p><button type="button" className="button button-secondary" onClick={() => onFilters({ region: '', severity: '', status: '' })}>Xóa bộ lọc</button></div> : <ul>{visible.map(marker => <li key={marker.id}><button type="button" className={`injury-list-item${selectedId === marker.id ? ' is-selected' : ''}`} onClick={() => onSelect(marker)} disabled={busy} aria-pressed={selectedId === marker.id} data-injury-id={marker.id}>
      <span className={`injury-number status-${markerStatus(marker)}`}>{String(markers.findIndex(item => item.id === marker.id) + 1).padStart(2, '0')}</span>
      <span className="injury-list-copy"><strong>{regionLabel(marker.bodyRegion)} · {sideLabel(marker.bodySide)}</strong><span>{marker.description}</span><span className="injury-list-meta"><span className={`injury-status status-${markerStatus(marker)}`}><i />{injuryStatuses[markerStatus(marker)]}</span><span>Mức độ {injurySeverities[marker.severity]}</span></span>{!hasDiagramPosition(marker) && <span>Vị trí thuộc phiên bản cũ, cần đặt lại; thông tin vẫn được giữ nguyên.</span>}</span>
      <span className="injury-list-date">{vetDate(marker.detectedAt)}<span aria-hidden="true">↗</span></span>
    </button></li>)}</ul>}
  </section>
}
