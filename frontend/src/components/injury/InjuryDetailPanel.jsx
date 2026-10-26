import { useEffect, useRef } from 'react'
import { clubToday } from '../../pages/vet/vetDomain.js'
import { diagramViews } from './horseDiagram.js'
import { hasDiagramPosition, injurySeverities, injuryStatuses, regionLabel, sideLabel } from './injuryDiagramDomain.js'
import InjuryRecoveryHistory from './InjuryRecoveryHistory.jsx'

export default function InjuryDetailPanel({ horse, draft, onChange, onSave, onCancel, onDelete, onReposition, canEdit, canPosition, canManage, busy, dirty, errors, demo, records, onAssessment, onRecoveryDirty }) {
  const input = useRef(null)
  const identity = draft?.id || (draft ? 'new' : '')
  useEffect(() => { if (identity && canEdit) input.current?.focus() }, [identity, canEdit])
  const error = key => errors[key] && <small className="injury-field-error" id={`injury-error-${key}`} role="alert">{errors[key]}</small>
  const invalid = key => ({ 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? `injury-error-${key}` : undefined })
  return <aside className="injury-card injury-detail" aria-labelledby="injury-detail-title">
    <header className="injury-card-heading"><div><p className="injury-eyebrow">HỒ SƠ VỊ TRÍ</p><h3 id="injury-detail-title">Thông tin chấn thương</h3></div></header>
    {!draft ? <div className="injury-panel-empty"><h4>Chọn vị trí cần xem</h4><p>Chọn dấu trên sơ đồ hoặc một chấn thương trong danh sách.</p>{canManage && <small>Dùng “Thêm vị trí chấn thương” để bắt đầu ghi nhận.</small>}</div> : <>
      {!canEdit && <p className="injury-read-only">{demo && records.find(record => record.id === draft.medicalRecordId)?.recordStatus === 'Signed' ? 'Phiếu đã chốt: giữ nguyên thông tin và vị trí ban đầu. Theo dõi qua phiếu tái khám mới.' : 'Chế độ chỉ xem'}</p>}
      <form onSubmit={onSave} className="injury-form" noValidate>
        <div className="injury-form-state"><span className="injury-soft-badge">{draft.id ? 'Vị trí đã ghi nhận' : 'Vị trí mới'}</span>{dirty && <small>Chưa lưu</small>}</div>
        <p className="injury-current-horse">Ngựa: <strong>{horse.name}</strong>{demo && <small>Đang minh họa tại hồ sơ này; chỉ nhập nội dung giả.</small>}</p>
        {!hasDiagramPosition(draft) && <p className="injury-reposition-note" role="note">Vị trí thuộc sơ đồ trước, chưa được đặt lên ảnh mới. {canEdit ? 'Dùng “Đổi vị trí” để đặt lại trước khi lưu.' : 'Giữ nguyên phiếu đã chốt; ghi vị trí mới qua phiếu khám bổ sung.'}</p>}
        <fieldset disabled={!canEdit || busy}>
          <label className="form-field"><span>Phiếu khám liên quan</span><select name="medicalRecordId" value={draft.medicalRecordId || ''} disabled={!!draft.id || !canEdit || busy} onChange={event => onChange('medicalRecordId', event.target.value)} {...invalid('medicalRecordId')}><option value="">Chưa liên kết phiếu khám</option>{records.filter(record => record.recordStatus === 'Draft' || record.id === draft.medicalRecordId).map(record => <option key={record.id} value={record.id}>{record.label}</option>)}</select>{error('medicalRecordId')}</label>
          <div className="injury-position-summary"><div><span>Vùng cơ thể</span><strong>{regionLabel(draft.bodyRegion)}</strong></div><div><span>Bên cơ thể</span><strong>{sideLabel(draft.bodySide)}</strong></div><div><span>Góc nhìn</span><strong>{Object.keys(diagramViews).includes(draft.view) ? diagramViews[draft.view] : 'Cần đặt lại vị trí'}</strong></div>{canEdit && <button type="button" className="button button-secondary" onClick={onReposition} disabled={busy || !canPosition}>Đổi vị trí</button>}{error('bodyRegion')}</div>
          <label className="form-field"><span>Mô tả chấn thương *</span><textarea ref={input} name="description" rows={3} value={draft.description} onChange={event => onChange('description', event.target.value)} required maxLength={1500} {...invalid('description')} placeholder="Mô tả dấu hiệu quan sát được…" />{error('description')}</label>
          <label className="form-field"><span>Mức độ *</span><select name="severity" value={draft.severity} onChange={event => onChange('severity', event.target.value)} {...invalid('severity')}>{Object.entries(injurySeverities).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{error('severity')}</label>
          <label className="form-field"><span>Tình trạng ghi nhận ban đầu *</span><select name="status" value={draft.status} onChange={event => onChange('status', event.target.value)} {...invalid('status')}>{Object.entries(injuryStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{error('status')}</label>
          <label className="form-field"><span>Ngày phát hiện *</span><input name="detectedAt" type="date" required max={clubToday()} value={draft.detectedAt} onChange={event => onChange('detectedAt', event.target.value)} {...invalid('detectedAt')} />{error('detectedAt')}</label>
          <label className="form-field"><span>Ghi chú</span><textarea name="notes" rows={3} maxLength={2000} value={draft.notes || ''} onChange={event => onChange('notes', event.target.value)} {...invalid('notes')} />{error('notes')}</label>
        </fieldset>
        {canEdit && <><div className="injury-form-actions"><button className="button injury-primary" type="submit" disabled={busy || !dirty}>{busy ? 'Đang lưu…' : 'Lưu chấn thương'}</button><button className="button button-secondary" type="button" onClick={onCancel} disabled={busy}>Hủy</button></div>{draft.id && !draft.history.length && <button className="injury-delete" type="button" onClick={onDelete} disabled={busy}>Xóa chấn thương</button>}{draft.history.length > 0 && <p className="injury-form-footnote">Chấn thương đã có lịch sử được giữ lại để đối chiếu.</p>}</>}
        {demo && <p className="injury-form-footnote">Dữ liệu minh họa, chưa đồng bộ máy chủ. Phiếu trong biểu mẫu là phiếu giả.</p>}
      </form>
      {draft.id && <InjuryRecoveryHistory key={draft.id} marker={draft} records={records} canManage={canManage} busy={busy} dirty={dirty} onSave={onAssessment} onDirty={onRecoveryDirty} />}
    </>}
  </aside>
}
