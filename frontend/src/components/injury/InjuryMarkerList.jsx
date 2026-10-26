import { vetDate } from '../../pages/vet/vetDomain.js'
import { injurySeverities, injuryStatuses } from './injuryDomain.js'
import InjuryIcon from './InjuryIcon.jsx'

export default function InjuryMarkerList({ markers, selectedId, onSelect, demo }) {
  return <section className="injury-card injury-marker-list" aria-labelledby="injury-list-title">
    <header className="injury-card-heading"><div><h3 id="injury-list-title">Các vị trí đã đánh dấu <span className="injury-count">{demo ? markers.length : '—'}</span></h3><p>{demo ? 'Các dấu dùng thử trong phiên này' : 'Chọn một vị trí để xem thông tin chi tiết'}</p></div><InjuryIcon kind="pin" /></header>
    {!markers.length ? <div className="injury-list-empty"><InjuryIcon /><p>{demo ? 'Chưa có dấu dùng thử. Chọn một vị trí trên mô hình để bắt đầu.' : 'Chưa có dữ liệu vị trí 3D. Xem vị trí bằng chữ trong bệnh án bên dưới.'}</p></div>
      : <ul>{markers.map((marker, index) => <li key={marker.id}><button type="button" className={`injury-list-item${selectedId === marker.id ? ' is-selected' : ''}`} onClick={() => onSelect(marker)} aria-pressed={selectedId === marker.id}>
        <span className={`injury-number status-${marker.status}`}>{String(index + 1).padStart(2, '0')}</span>
        <span className="injury-list-copy"><strong>{marker.location}</strong><span>{marker.description}</span><span className="injury-list-meta"><span className={`injury-status status-${marker.status}`}><i />{injuryStatuses[marker.status]}</span><span>Mức độ {injurySeverities[marker.severity]?.toLocaleLowerCase('vi-VN')}</span></span></span>
        <span className="injury-list-date">{vetDate(marker.detectedAt)}<span aria-hidden="true">↗</span></span>
      </button></li>)}</ul>}
  </section>
}
