import { injuryStatuses } from './injuryDomain.js'

export default function InjuryMarker({ marker, index, selected, onSelect, elementRef }) {
  return <button ref={elementRef} type="button" hidden className={`injury-marker status-${marker.status}${selected ? ' is-selected' : ''}`} onClick={() => onSelect(marker)} aria-pressed={selected}
    aria-label={`${marker.location || 'Vị trí mới'}: ${marker.description || 'Chưa mô tả'} · ${injuryStatuses[marker.status]}`}>
    <span className="injury-marker-dot">{index}</span><span className="injury-marker-tooltip"><strong>{marker.location || 'Vị trí mới'}</strong><span>{marker.description || 'Chưa mô tả'}</span><small>{injuryStatuses[marker.status]}</small></span>
  </button>
}
