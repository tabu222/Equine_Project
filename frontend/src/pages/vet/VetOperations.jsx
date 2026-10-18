import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { saveVetResource } from '../../api/vetApi.ts'
import { clubToday, dueGroup, medicalEvents, scheduleTypes, vetDateTime, vetError } from './vetDomain.js'
import { useVetResource } from './useVetResource.js'

export function ResourceState({ data, children }) {
  if (data.loading) return <p role="status">Đang tải dữ liệu…</p>
  if (data.error) return <div role="alert"><p>{data.error}</p><button type="button" className="button button-secondary" onClick={data.reload}>Thử lại</button></div>
  return children
}

function useMutation(onSaved) {
  const gate = useRef(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  async function run(path, body, update = false) {
    if (gate.current) return false
    gate.current = true; setBusy(true); setNotice(''); setError('')
    try {
      const result = await saveVetResource(path, body, update)
      const cancelled = result.CancelledSessionIDs
      setNotice(`Đã lưu.${cancelled?.length ? ` Đã hủy ${cancelled.length} buổi tập bị ảnh hưởng (mã: ${cancelled.join(', ')}).` : ''}`)
      onSaved?.()
      return true
    } catch (failure) {
      const messages = { FOLLOW_UP_EXAM_REQUIRED: 'Cần tái khám sau khi khóa và chốt kết luận cho phép tập trước khi mở khóa.', LOCK_EXISTS: 'Ngựa đã có khóa tập. Hãy tải lại để xem khóa hiện hành.', INVALID_STATUS: 'Trạng thái đã thay đổi; hãy tải lại trước khi tiếp tục.', NOT_RECORD_OWNER: 'Phiếu này đang do bác sĩ khác xử lý.', RECORD_SIGNED: 'Phiếu đã chốt. Hãy dùng đính chính hoặc lập lần khám mới.' }
      setError(messages[failure?.code] || vetError(failure, 'Chưa thể xác nhận thao tác. Hãy tải lại và kiểm tra dữ liệu trước khi thử lại.'))
      onSaved?.()
      return false
    } finally { gate.current = false; setBusy(false) }
  }
  return { run, busy, feedback: <>{error && <p role="alert" className="error-message">{error}</p>}{notice && <p role="status" className="success-message">{notice}</p>}</> }
}

const lockLabel = { Full: 'Cấm tập hoàn toàn', Restricted: 'Hạn chế cường độ tập' }
export function LockBadge({ lock }) {
  return lock ? <span className={`vet-pill training-${lock.LockLevel === 'Full' ? 'Not-Eligible' : 'Restricted'}`}>⚑ {lockLabel[lock.LockLevel]}{lock.LockLevel === 'Restricted' ? ` · Tải tối đa ${lock.MaxIntensity}` : ''}</span> : null
}

export function TrainingLocks({ horse, currentUser, compact = false, onChanged = undefined }) {
  const data = useVetResource(`/training-locks?HorseID=${encodeURIComponent(horse.id)}`)
  const action = useMutation(() => { data.reload(); onChanged?.() })
  const [open, setOpen] = useState(false)
  const [level, setLevel] = useState('Full')
  const active = data.rows.find(l => l.LockStatus === 'Active')
  const canManage = currentUser.permissions.includes('TRAINING_LOCK_MANAGE') && horse.profileStatus === 'APPROVED'
  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const level = form.get('level')
    const body = { Reason: form.get('reason').trim(), LockLevel: level, MaxIntensity: level === 'Restricted' ? Number(form.get('max')) : null, Details: form.get('details').trim() }
    if (!body.Reason || (level === 'Restricted' && (form.get('max') === '' || Number(form.get('max')) < 0))) return
    if (await action.run(active ? `/training-locks/${active.TrainingLockID}` : `/horses/${horse.id}/training-locks`, body, !!active)) setOpen(false)
  }
  return <section className="panel vet-lock-panel">
    <h2>{compact ? 'Khóa tập khẩn cấp' : 'Khóa và hạn chế huấn luyện'}</h2>
    <ResourceState data={data}>
      {active ? <><LockBadge lock={active} /><p>{active.Reason}</p><p>{active.CreatedByName} · Hiệu lực từ {vetDateTime(active.LockStartDate)}</p><p className="vet-preserve">{active.Details}</p>{active.LockEndDate && <p role="note">Khóa có ngày kết thúc dự kiến {vetDateTime(active.LockEndDate)}. Cần đối chiếu hiệu lực và tái khám trước khi xếp tập.</p>}</> : <p>Chưa có khóa tập đang hoạt động được ghi nhận. Điều kiện tập theo bệnh án được xem riêng.</p>}
      {canManage && <button className="button vet-emergency" type="button" disabled={action.busy} onClick={() => { setLevel(active?.LockLevel || 'Full'); setOpen(!open) }}>{open ? 'Đóng biểu mẫu' : active ? 'Điều chỉnh khóa tập' : 'Khóa tập khẩn cấp'}</button>}
      {open && canManage && <form onSubmit={submit} className="vet-operation-form" key={active?.TrainingLockID || 'new'}><fieldset disabled={action.busy} className="vet-form-fields">
        <label className="form-field"><span>Lý do khóa</span><input name="reason" required maxLength={100} defaultValue={active?.Reason || ''} /></label>
        <label className="form-field"><span>Mức hạn chế</span><select name="level" value={level} onChange={e => setLevel(e.target.value)}><option value="Full">Cấm tập hoàn toàn</option><option value="Restricted">Hạn chế cường độ</option></select></label>
        {level === 'Restricted' && <label className="form-field"><span>Tải tập tối đa (cùng thang tải của buổi tập)</span><input name="max" type="number" min="0" max="99999999.99" step="0.01" required defaultValue={active?.MaxIntensity ?? ''} /></label>}
        <label className="form-field"><span>Ghi chú / giới hạn cụ thể</span><textarea name="details" maxLength={2000} defaultValue={active?.Details || ''} /></label>
        <p>Áp dụng ngay. Các buổi đã phân công trong phạm vi khóa có thể bị hủy; lịch sử được giữ lại.</p>
        <button className="button vet-emergency" disabled={action.busy}>{action.busy ? 'Đang áp dụng…' : 'Áp dụng khóa tập'}</button>
      </fieldset></form>}
      {active && canManage && !compact && <form className="vet-operation-form" onSubmit={async e => { e.preventDefault(); const note = new FormData(e.currentTarget).get('note').trim(); if (note) await action.run(`/training-locks/${active.TrainingLockID}/release`, { Note: note }) }}><label className="form-field"><span>Lý do mở khóa · cần kết luận tái khám hợp lệ</span><textarea name="note" maxLength={1000} required /></label><button className="button button-secondary" disabled={action.busy}>Mở khóa sau tái khám</button></form>}
      {!compact && data.rows.filter(l => l.LockStatus === 'Released').map(l => <article className="vet-amendment" key={l.TrainingLockID}><strong>Đã mở khóa · {lockLabel[l.LockLevel]}</strong><p>{l.Reason}</p><p>Vet mở: {l.ReleasedByVetID} · {vetDateTime(l.ReleasedAt)}</p><p>{l.Details}</p></article>)}
    </ResourceState>{action.feedback}
  </section>
}

const statusLabels = { Scheduled: 'Đã lên lịch', Completed: 'Đã hoàn thành', Overdue: 'Quá hạn', Cancelled: 'Đã hủy' }
export function VetCalendar({ horses, currentUser, horseId }) {
  const vaccinations = useVetResource(horseId ? `/horses/${horseId}/vaccinations` : '/vaccinations')
  const schedules = useVetResource(horseId ? `/horses/${horseId}/medical-schedules` : '/medical-schedules')
  const [params, setParams] = useSearchParams()
  const group = params.get('due') || 'all'
  const [creating, setCreating] = useState(false)
  const [kind, setKind] = useState('Vaccination')
  const [view, setView] = useState('list')
  const action = useMutation(() => { vaccinations.reload(); schedules.reload() })
  const canManage = currentUser.permissions.includes('MEDICAL_MANAGE')
  const rows = medicalEvents(vaccinations.rows, schedules.rows).filter(row => group === 'all' || (group === 'completed' ? row.Status === 'Completed' : ['Scheduled', 'Overdue'].includes(row.Status) && (group === 'overdue' ? row.Status === 'Overdue' || dueGroup(row.day) === 'overdue' : row.Status !== 'Overdue' && dueGroup(row.day) === group)))
  async function create(event) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const id = horseId || values.get('horse')
    const body = { Status: 'Scheduled', Note: values.get('note').trim(), ...(kind === 'Vaccination' ? { VaccineName: values.get('vaccine').trim(), VaccinationDate: values.get('date') } : { ScheduleType: kind, ScheduledDate: values.get('date') }) }
    if (await action.run(`/horses/${id}/${kind === 'Vaccination' ? 'vaccinations' : 'medical-schedules'}`, body)) setCreating(false)
  }
  return <section className="panel">
    <h2>Lịch y tế</h2><p>Giờ CLB UTC+07:00. Ngày tiêm nhắc lại được lưu theo chỉ định; không tự tạo chu kỳ hoặc lịch trùng.</p>
    <div className="vet-toolbar"><label className="form-field"><span>Lọc thời hạn</span><select value={group} onChange={e => { const next = new URLSearchParams(params); next.set('due', e.target.value); setParams(next) }}>{Object.entries({ all: 'Tất cả', overdue: 'Quá hạn', today: 'Hôm nay', upcoming: 'Sắp tới', completed: 'Đã hoàn thành' }).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><button type="button" className="button button-secondary" onClick={() => setView(view === 'list' ? 'days' : 'list')}>{view === 'list' ? 'Nhóm theo ngày' : 'Xem danh sách'}</button>{canManage && <button type="button" className="button" onClick={() => setCreating(!creating)}>{creating ? 'Đóng biểu mẫu' : 'Đặt lịch y tế'}</button>}</div>
    {creating && <form onSubmit={create} className="vet-operation-form"><fieldset disabled={action.busy} className="vet-form-fields">
      {!horseId && <label className="form-field"><span>Ngựa</span><select name="horse" required><option value="">Chọn ngựa</option>{horses.filter(h => h.profileStatus === 'APPROVED').map(h => <option key={h.id} value={h.id}>{h.name} · {h.code || h.microchipNumber || 'Chưa cấp mã'}</option>)}</select></label>}
      <label className="form-field"><span>Loại công việc</span><select value={kind} onChange={e => setKind(e.target.value)}><option value="Vaccination">Tiêm phòng</option>{Object.entries(scheduleTypes).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      {kind === 'Vaccination' && <label className="form-field"><span>Tên vaccine theo chỉ định</span><input name="vaccine" required maxLength={150} /></label>}
      <label className="form-field"><span>Ngày đến hạn</span><input name="date" type="date" required /></label><label className="form-field"><span>Ghi chú</span><textarea name="note" maxLength={1000} /></label><button className="button" disabled={action.busy}>Lưu lịch</button>
    </fieldset></form>}
    {action.feedback}
    <ResourceState data={vaccinations}><ResourceState data={schedules}>
      {!rows.length && <p className="vet-empty">Không có lịch phù hợp.</p>}
      <div className={view === 'days' ? 'vet-calendar-days' : 'vet-event-list'}>{rows.map(row => <article className="vet-event" key={row.key}><time>{row.day}</time><div><Link to={`/vet/horses/${row.HorseID}?tab=calendar`}><strong>{row.HorseName}</strong></Link><p>{row.label}</p><span className={`vet-pill due-${row.Status === 'Completed' ? 'completed' : row.Status === 'Overdue' ? 'overdue' : dueGroup(row.day)}`}>{statusLabels[row.Status]}{row.Status === 'Scheduled' && dueGroup(row.day) === 'overdue' ? ' · Quá hạn' : ''}</span><p>Bác sĩ: {row.VetName || 'Chưa xác định'}</p>{row.NextDueDate && <p>Nhắc lại theo chỉ định: {row.NextDueDate}</p>}<p className="vet-preserve">{row.Note}</p></div>
        {canManage && ['Scheduled', 'Overdue'].includes(row.Status) && <div><button type="button" className="button button-secondary" disabled title="Chưa thể ghi đầy đủ ngày thực hiện, kết quả và lịch tiếp theo tại đây">Ghi nhận hoàn thành</button><button type="button" className="button button-secondary" disabled={action.busy} onClick={() => action.run(`/${row.kind === 'vaccination' ? 'vaccinations' : 'medical-schedules'}/${row.kind === 'vaccination' ? row.VaccinationID : row.MedicalScheduleID}`, { Status: 'Cancelled' }, true)}>Hủy lịch</button></div>}
      </article>)}</div>
    </ResourceState></ResourceState>
    <p className="vet-caption">Nhắc hạn xuất hiện trong mục thông báo khi tải ứng dụng. Chưa có nhắc việc tự động. Chức năng hoàn thành lịch đang chờ bổ sung thông tin ngày thực hiện và kết quả.</p>
  </section>
}

export function VetReports({ horses, currentUser }) {
  const data = useVetResource('/health-reports')
  const [params, setParams] = useSearchParams()
  const severity = params.get('severity') || ''
  const status = params.get('status') || 'open'
  const canManage = currentUser.permissions.includes('MEDICAL_MANAGE')
  const rows = data.rows.filter(r => (!severity || r.Severity === severity) && (status === 'all' || (status === 'open' ? r.Status !== 'Resolved' : r.Status === status))).sort((a, b) => (a.Severity === 'Urgent' ? 0 : 1) - (b.Severity === 'Urgent' ? 0 : 1) || a.ReportedAt.localeCompare(b.ReportedAt))
  function filter(key, value) { const next = new URLSearchParams(params); next.set(key, value); setParams(next) }
  return <section className="panel"><h2>Tiếp nhận báo cáo sức khỏe</h2><div className="vet-toolbar"><label className="form-field"><span>Mức độ</span><select value={severity} onChange={e => filter('severity', e.target.value)}><option value="">Tất cả mức độ</option><option value="Urgent">Khẩn</option><option value="Normal">Thông thường</option></select></label><label className="form-field"><span>Tiến trình</span><select value={status} onChange={e => filter('status', e.target.value)}>{Object.entries({ open: 'Chưa xử lý xong', all: 'Tất cả', Reported: 'Chờ nhận', Reviewing: 'Đang xử lý', Resolved: 'Đã xử lý' }).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select></label><button className="button button-secondary" onClick={data.reload}>Làm mới báo cáo</button></div><ResourceState data={data}>{!rows.length && <p className="vet-empty">Không có báo cáo phù hợp.</p>}{rows.map(r => <ReportCard key={r.HealthReportID} report={r} horse={horses.find(h => String(h.id) === String(r.HorseID))} currentUser={currentUser} canManage={canManage} reload={data.reload} />)}</ResourceState></section>
}

function ReportCard({ report: r, horse, currentUser, canManage, reload }) {
  const action = useMutation(reload)
  const [showLock, setShowLock] = useState(false)
  const base = `/health-reports/${r.HealthReportID}`
  const examUrl = `/vet/horses/${r.HorseID}/examination?${r.MedicalRecordID ? `record=${r.MedicalRecordID}` : `report=${r.HealthReportID}`}`
  const owns = !r.VetID || String(r.VetID) === currentUser.id
  return <article className={`vet-report ${r.Severity === 'Urgent' ? 'vet-report-urgent' : ''}`}><div className="vet-toolbar"><Link to={`/vet/horses/${r.HorseID}`}><strong>{r.HorseName}</strong></Link><span className={`vet-pill ${r.Severity === 'Urgent' ? 'due-overdue' : ''}`}>{r.Severity === 'Urgent' ? '⚠ Khẩn' : 'Thông thường'}</span><span className="vet-pill">{({ Reported: 'Chờ nhận', Reviewing: 'Đang xử lý', Resolved: 'Đã xử lý' })[r.Status]}</span></div><p>{r.ReportedByName} · {vetDateTime(r.ReportedAt)}</p><p className="vet-preserve">{r.Description}</p>{r.ImageUrl && /^https?:\/\//i.test(r.ImageUrl) && <a href={r.ImageUrl} target="_blank" rel="noreferrer">Xem ảnh báo cáo</a>}{r.TrainingSessionID && <p>Buổi tập liên quan: #{r.TrainingSessionID}</p>}<p>Bác sĩ xử lý: {r.VetName || 'Chưa nhận'}</p>{r.VetNote && <p>Kết luận xử lý: {r.VetNote}</p>}{r.ResolvedAt && <p>Hoàn tất: {vetDateTime(r.ResolvedAt)}</p>}
    {r.MedicalRecordID && <Link to={examUrl}>Xem phiếu khám #{r.MedicalRecordID}</Link>}
    {r.Notes?.map(n => <p key={n.HealthReportNoteID} className="vet-amendment">{n.NoteByName} · {vetDateTime(n.NoteAt)}<br />{n.Content}</p>)}
    {canManage && r.Status !== 'Resolved' && <><div className="vet-toolbar">{r.Status === 'Reported' && <button className="button" disabled={action.busy} onClick={() => action.run(`${base}/take`, {})}>Nhận xử lý</button>}{r.Status === 'Reviewing' && owns && <Link className="button" to={examUrl}>{r.MedicalRecordID ? 'Tiếp tục phiếu khám' : 'Tạo phiếu khám'}</Link>}{horse && currentUser.permissions.includes('TRAINING_LOCK_MANAGE') && <button type="button" className="button vet-emergency" onClick={() => setShowLock(!showLock)}>Khóa tập khẩn cấp</button>}</div>
      {showLock && horse && <TrainingLocks horse={horse} currentUser={currentUser} compact />}
      <form className="vet-operation-form" onSubmit={async e => { e.preventDefault(); const form = e.currentTarget; const content = new FormData(form).get('content').trim(); if (content && await action.run(`${base}/notes`, { Content: content })) form.reset() }}><label className="form-field"><span>Diễn biến / ghi chú xử lý</span><textarea name="content" required maxLength={2000} /></label><button className="button button-secondary" disabled={action.busy}>Thêm ghi chú</button></form>
      {r.Status === 'Reviewing' && owns && <form className="vet-operation-form" onSubmit={e => { e.preventDefault(); const note = new FormData(e.currentTarget).get('note').trim(); if (note) void action.run(`${base}/resolve`, { VetNote: note }) }}><label className="form-field"><span>Kết luận xử lý (chỉ đóng khi đã xử lý thực tế)</span><textarea name="note" required maxLength={2000} /></label><button className="button" disabled={action.busy}>Hoàn tất xử lý báo cáo</button></form>}
    </>}{action.feedback}</article>
}

const routes = { Oral: 'Uống', Injection: 'Tiêm', Topical: 'Bôi ngoài da', Inhalation: 'Hít', Other: 'Khác' }
export function VetTreatments({ horse, records, currentUser }) {
  const data = useVetResource(`/horses/${horse.id}/treatments`)
  const action = useMutation(data.reload)
  const drafts = records.filter(r => r.recordStatus === 'Draft' && r.vetId === currentUser.id)
  const canManage = currentUser.permissions.includes('MEDICAL_MANAGE')
  async function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const f = new FormData(form)
    if (await action.run(`/medical-records/${f.get('record')}/treatments`, { MedicineName: f.get('medicine').trim(), Dose: f.get('dose').trim(), Route: f.get('route'), StartDate: f.get('start'), EndDate: f.get('end') || null, WithdrawalUntil: f.get('withdrawal') || null, Note: f.get('note').trim() })) form.reset()
  }
  return <section className="panel"><h2>Điều trị và đơn thuốc</h2><ResourceState data={data}>{!data.rows.length && <p>Chưa có thuốc được ghi nhận.</p>}{data.rows.map(t => <article className="vet-amendment" key={t.TreatmentID}><strong>{t.MedicineName} · Phiếu #{t.MedicalRecordID} · {records.find(r => r.id === String(t.MedicalRecordID))?.recordStatus === 'Draft' ? 'Nháp' : 'Đã chốt'}</strong><p>Liều và đơn vị: {t.Dose} · Đường dùng: {routes[t.Route] || t.Route}</p><p>{t.StartDate} → {t.EndDate || 'Chưa ghi ngày kết thúc'}</p>{t.WithdrawalUntil && <p>Ngưng thuốc đến: {t.WithdrawalUntil}{t.WithdrawalActive ? ' · Còn trong thời gian ngưng thuốc' : ''}</p>}<p>{t.Note}</p></article>)}</ResourceState>
    {canManage && drafts.length > 0 ? <form onSubmit={submit} className="vet-operation-form"><h3>Thêm thuốc vào phiếu nháp của bạn</h3><fieldset disabled={action.busy} className="vet-form-fields"><label className="form-field"><span>Phiếu khám</span><select name="record" required>{drafts.map(r => <option key={r.id} value={r.id}>#{r.id} · {r.examType}</option>)}</select></label><label className="form-field"><span>Tên thuốc</span><input name="medicine" required maxLength={150} /></label><label className="form-field"><span>Liều kèm đơn vị do bác sĩ chỉ định</span><input name="dose" required maxLength={100} /></label><label className="form-field"><span>Đường dùng</span><select name="route">{Object.entries(routes).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><div className="horse-form-grid"><label className="form-field"><span>Ngày bắt đầu</span><input name="start" type="date" required /></label><label className="form-field"><span>Ngày kết thúc</span><input name="end" type="date" /></label><label className="form-field"><span>Ngưng thuốc đến (theo chỉ định)</span><input name="withdrawal" type="date" /></label></div><label className="form-field"><span>Tần suất và hướng dẫn dùng thuốc</span><textarea name="note" maxLength={1000} required /></label><button className="button" disabled={action.busy}>Lưu thuốc vào phiếu nháp</button></fieldset></form> : canManage && <p>Lưu một phiếu khám nháp trước khi thêm thuốc. Phiếu đã chốt được giữ nguyên.</p>}{action.feedback}<p className="vet-caption">Liều, đơn vị, tần suất và thời gian ngưng thuốc do bác sĩ nhập. Tần suất được lưu cùng hướng dẫn.</p></section>
}

export function VetOperationalOverview({ horses, initialExams, intakeError }) {
  const locks = useVetResource('/training-locks?LockStatus=Active')
  const reports = useVetResource('/health-reports?open=1')
  const vaccinations = useVetResource('/vaccinations')
  const schedules = useVetResource('/medical-schedules')
  const eventsReady = !vaccinations.loading && !schedules.loading && !vaccinations.error && !schedules.error
  const events = eventsReady ? medicalEvents(vaccinations.rows, schedules.rows).filter(r => ['Scheduled', 'Overdue'].includes(r.Status)) : []
  const pending = events.filter(r => r.Status === 'Overdue' || dueGroup(r.day) === 'overdue')
  return <><div className="vet-two-columns"><section className="panel"><h2>Cần xử lý ngay</h2><Link className="vet-task" to="/vet/horses-needing-exam"><span>Khám đầu vào<small>Vet trực tiếp nhận khám</small></span><strong>{intakeError ? 'Chưa có số liệu' : initialExams.length} →</strong></Link><ResourceState data={reports}><Link className="vet-task" to="/vet/reports?severity=Urgent"><span>Báo cáo khẩn chưa hoàn tất</span><strong>{reports.rows.filter(r => r.Severity === 'Urgent').length} →</strong></Link>{reports.rows.slice(0, 3).map(r => <p key={r.HealthReportID}><Link to="/vet/reports">{r.HorseName}</Link> · {r.Severity === 'Urgent' ? 'Khẩn' : 'Thông thường'} · {r.Description.slice(0, 100)}</p>)}</ResourceState><Link className="vet-task" to="/vet/calendar?due=overdue"><span>Lịch y tế quá hạn</span><strong>{eventsReady ? pending.length : 'Chưa có số liệu'} →</strong></Link></section><section className="panel"><h2>Khóa / hạn chế tập đang ghi nhận</h2><ResourceState data={locks}>{!locks.rows.length && <p>Chưa có khóa tập đang hoạt động.</p>}{locks.rows.map(l => <div className="vet-task" key={l.TrainingLockID}><Link to={`/vet/horses/${l.HorseID}?tab=training`}>{l.HorseName || horses.find(h => h.id === String(l.HorseID))?.name}</Link><LockBadge lock={l} /></div>)}</ResourceState></section></div><section className="panel"><h2>Lịch y tế hôm nay và sắp tới</h2><ResourceState data={vaccinations}><ResourceState data={schedules}>{!events.some(r => r.Status !== 'Overdue' && r.day >= clubToday()) && <p>Không có lịch hôm nay hoặc sắp tới.</p>}{events.filter(r => r.Status !== 'Overdue' && r.day >= clubToday()).slice(0, 8).map(r => <Link className="vet-task" key={r.key} to={`/vet/horses/${r.HorseID}?tab=calendar`}><span>{r.HorseName} · {r.label}</span><time>{r.day === clubToday() ? 'Hôm nay' : r.day}</time></Link>)}</ResourceState></ResourceState><Link to="/vet/calendar">Xem toàn bộ lịch →</Link></section></>
}
