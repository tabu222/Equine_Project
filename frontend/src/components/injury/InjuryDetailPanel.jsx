import { useEffect, useRef } from 'react'
import { clubToday } from '../../pages/vet/vetDomain.js'
import { injurySeverities, injuryStatuses } from './injuryDomain.js'
import InjuryIcon from './InjuryIcon.jsx'

export default function InjuryDetailPanel({ draft, onChange, onSave, onCancel, onDelete, canEdit, busy, dirty, demo }) {
  const locationInput = useRef(null)
  const identity = draft?.id || (draft ? 'new' : '')
  useEffect(() => { if (identity && canEdit) locationInput.current?.focus() }, [identity, canEdit])
  return <aside className="injury-card injury-detail" aria-labelledby="injury-detail-title">
    <header className="injury-card-heading"><div><p className="injury-eyebrow">HỒ SƠ VỊ TRÍ</p><h3 id="injury-detail-title">Thông tin chấn thương</h3></div><InjuryIcon kind={canEdit ? 'pin' : 'eye'} /></header>
    {!canEdit && <p className="injury-read-only"><InjuryIcon kind="eye" /> Chế độ chỉ xem</p>}
    {!draft ? <div className="injury-panel-empty"><span className="injury-empty-icon"><InjuryIcon /></span><h4>Chọn vị trí cần xem</h4><p>Chọn một vị trí trên mô hình ngựa để ghi nhận chấn thương.</p><small>{demo ? 'Bạn cũng có thể chọn một dấu trong danh sách dùng thử.' : 'Thông tin vị trí sẽ xuất hiện tại đây.'}</small></div>
      : <form onSubmit={onSave} className="injury-form">
        <div className="injury-form-state"><span className="injury-soft-badge">{draft.id ? 'Vị trí đã đánh dấu' : 'Vị trí mới'}</span>{dirty && <small>Chưa lưu</small>}</div>
        <fieldset disabled={!canEdit || busy}>
          <label className="form-field"><span>Vị trí trên cơ thể <span aria-hidden="true">*</span></span><input ref={locationInput} name="location" value={draft.location} onChange={e => onChange('location', e.target.value)} maxLength={200} required placeholder="Ví dụ: Chân trước trái" /></label>
          <label className="form-field"><span>Mô tả chấn thương <span aria-hidden="true">*</span></span><textarea name="description" rows={3} value={draft.description} onChange={e => onChange('description', e.target.value)} required maxLength={1500} placeholder="Mô tả dấu hiệu quan sát được…" /></label>
          <div className="injury-severity"><span id="injury-severity-label">Mức độ</span><div role="group" aria-labelledby="injury-severity-label">{Object.entries(injurySeverities).map(([key, label]) => <button key={key} type="button" className={draft.severity === key ? `is-selected severity-${key}` : ''} aria-pressed={draft.severity === key} onClick={() => onChange('severity', key)}>{label}</button>)}</div></div>
          <label className="form-field"><span>Trạng thái</span><select name="status" value={draft.status} onChange={e => onChange('status', e.target.value)}>{Object.entries(injuryStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="form-field"><span>Ngày phát hiện <span aria-hidden="true">*</span></span><input name="detectedAt" type="date" required max={clubToday()} value={draft.detectedAt} onChange={e => onChange('detectedAt', e.target.value)} /></label>
          <label className="form-field"><span>Ghi chú của bác sĩ</span><textarea name="notes" rows={3} maxLength={2000} value={draft.notes} onChange={e => onChange('notes', e.target.value)} placeholder="Lưu ý khi theo dõi và chăm sóc…" /></label>
        </fieldset>
        {canEdit && <><div className="injury-form-actions"><button className="button injury-primary" type="submit" disabled={busy || !dirty}><InjuryIcon kind="save" />{busy ? 'Đang lưu…' : 'Lưu chấn thương'}</button><button className="button button-secondary" type="button" onClick={onCancel} disabled={busy}>Hủy</button></div>
          {draft.id && <button className="injury-delete" type="button" onClick={onDelete} disabled={busy}><InjuryIcon kind="trash" /> Xóa marker</button>}</>}
        {demo && <p className="injury-form-footnote">Dấu dùng thử chỉ được giữ trong phiên mở trang; không ghi vào hồ sơ y tế.</p>}
      </form>}
  </aside>
}
