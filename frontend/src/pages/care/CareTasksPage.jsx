// Việc chăm sóc theo ngày.
//  mode="mine": Groom xem việc được giao, bấm Đã làm / Bỏ qua.
//  mode="club": Head Trainer xem việc của cả CLB, giao thêm việc, sinh việc trước cho ngày tới.
import { useMemo, useState } from 'react'
import {
  completeCareTask, createCareTask, generateCareTasks, getApprovedHorses, getCareTasks, getGrooms, skipCareTask,
} from '../../api/careApi.ts'
import { Badge, CarePage, FieldError, HorsePicker, Loading, Notice } from './careShared.jsx'
import { TASK_STATUS, TASK_TYPES, addDays, fmtDate, fmtTime, todayText, useLoad, useSubmit } from './careUtils.js'

function isOverdue(task) {
  return task.Status === 'Pending' && new Date(task.ScheduledAt) < new Date()
}

function TaskCard({ task, canComplete, canSkip, showGroom, onDone }) {
  const [mode, setMode] = useState('')
  const [text, setText] = useState('')
  const action = useSubmit()
  async function submit(event) {
    event.preventDefault()
    const ok = mode === 'complete'
      ? await action.run(() => completeCareTask(task.CareTaskID, text.trim()), 'Đã ghi nhận hoàn thành.')
      : await action.run(() => skipCareTask(task.CareTaskID, text.trim()), 'Đã ghi nhận bỏ qua.')
    if (ok) { setMode(''); setText(''); onDone() }
  }
  const overdue = isOverdue(task)
  return <article className={`care-task${overdue ? ' care-task-overdue' : ''}${task.Status !== 'Pending' ? ' care-task-closed' : ''}`}>
    <time className="care-task-time">{fmtTime(task.ScheduledAt)}</time>
    <div className="care-task-body">
      <div className="care-task-title">
        <strong>{TASK_TYPES[task.TaskType] || task.TaskType}</strong>
        <span className="care-task-horse">{task.HorseName}</span>
        <Badge map={TASK_STATUS} value={task.Status} />
        {overdue && <span className="care-badge care-badge-danger">Quá giờ</span>}
        {!task.IsAuto && <span className="care-badge care-badge-info">Giao thêm</span>}
      </div>
      {task.Note && <p className="care-task-note">{task.Note}</p>}
      <p className="care-task-meta">
        {showGroom && <>Groom: <b>{task.GroomName}</b> · </>}
        {task.IsAuto ? 'Hệ thống tự sinh theo chỉ tiêu' : `Giao bởi ${task.AssignedByName || '—'}`}
        {task.CompletedAt && <> · Xong lúc {fmtTime(task.CompletedAt)}</>}
      </p>
      {task.Status === 'Pending' && (canComplete || canSkip) && !mode && <div className="care-actions">
        {canComplete && <button className="button" type="button" onClick={() => { setMode('complete'); setText('') }}>Đã làm</button>}
        {canSkip && <button className="button button-secondary" type="button" onClick={() => { setMode('skip'); setText('') }}>Bỏ qua</button>}
      </div>}
      {mode && <form className="care-inline-form" onSubmit={submit}>
        <label className="form-field"><span>{mode === 'complete' ? 'Ghi chú (không bắt buộc)' : 'Lý do bỏ qua'}</span>
          <input value={text} onChange={e => setText(e.target.value)} maxLength={1000} required={mode === 'skip'} autoFocus
            placeholder={mode === 'complete' ? 'vd Ngựa ăn hết khẩu phần' : 'vd Ngựa đang đi khám, chưa cho ăn được'} />
          <FieldError fields={action.fields} name={mode === 'complete' ? 'Note' : 'Reason'} />
        </label>
        <div className="care-actions">
          <button className="button" type="submit" disabled={action.busy}>
            {action.busy ? 'Đang lưu…' : mode === 'complete' ? 'Xác nhận đã làm' : 'Xác nhận bỏ qua'}</button>
          <button className="button button-secondary" type="button" disabled={action.busy} onClick={() => setMode('')}>Hủy</button>
        </div>
      </form>}
      {action.error && <div className="alert-banner" role="alert">{action.error}</div>}
    </div>
  </article>
}

function ExtraTaskForm({ horses, grooms, date, onSaved }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ HorseID: '', GroomID: '', TaskType: 'Feeding', Time: '08:00', Note: '' })
  const action = useSubmit()
  const set = key => event => setForm(f => ({ ...f, [key]: event.target.value }))
  async function submit(event) {
    event.preventDefault()
    const ok = await action.run(() => createCareTask({
      HorseID: Number(form.HorseID), GroomID: Number(form.GroomID), TaskType: form.TaskType,
      ScheduledAt: `${date}T${form.Time}:00`, Note: form.Note.trim() || null,
    }), 'Đã giao việc.')
    if (ok) { setForm(f => ({ ...f, Note: '' })); setOpen(false); onSaved() }
  }
  if (!open) return <>
    <button className="button" type="button" onClick={() => { action.clear(); setOpen(true) }}>+ Giao thêm việc</button>
    {action.notice && <span className="care-inline-notice" role="status">{action.notice}</span>}
  </>
  return <form className="panel care-form" onSubmit={submit}>
    <h2>Giao thêm việc ngày {fmtDate(date)}</h2>
    <p className="care-muted">Việc hằng ngày đã được hệ thống tự sinh theo chỉ tiêu. Chỉ giao thêm việc ngoài chỉ tiêu.</p>
    <div className="care-form-grid">
      <label className="form-field"><span>Ngựa</span>
        <select required value={form.HorseID} onChange={set('HorseID')}>
          <option value="">Chọn ngựa</option>
          {horses.map(h => <option key={h.HorseID} value={h.HorseID}>{h.HorseName}</option>)}
        </select><FieldError fields={action.fields} name="HorseID" /></label>
      <label className="form-field"><span>Giao cho Groom</span>
        <select required value={form.GroomID} onChange={set('GroomID')}>
          <option value="">Chọn Groom</option>
          {grooms.map(g => <option key={g.UserID} value={g.UserID}>{g.FullName}</option>)}
        </select><FieldError fields={action.fields} name="GroomID" /></label>
      <label className="form-field"><span>Loại việc</span>
        <select value={form.TaskType} onChange={set('TaskType')}>
          {Object.entries(TASK_TYPES).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select></label>
      <label className="form-field"><span>Giờ</span>
        <input type="time" required value={form.Time} onChange={set('Time')} />
        <FieldError fields={action.fields} name="ScheduledAt" /></label>
      <label className="form-field care-span-2"><span>Ghi chú cho Groom</span>
        <input maxLength={1000} value={form.Note} onChange={set('Note')} placeholder="vd Bôi thuốc chân trước trái" /></label>
    </div>
    <Notice state={action} />
    <div className="care-actions">
      <button className="button" type="submit" disabled={action.busy}>{action.busy ? 'Đang lưu…' : 'Giao việc'}</button>
      <button className="button button-secondary" type="button" onClick={() => setOpen(false)}>Đóng</button>
    </div>
  </form>
}

export default function CareTasksPage({ mode = 'mine', currentUser }) {
  const club = mode === 'club'
  const today = todayText()
  const [date, setDate] = useState(today)
  const [status, setStatus] = useState('')
  const [horseId, setHorseId] = useState('')
  const [groomId, setGroomId] = useState('')
  const tasks = useLoad(() => getCareTasks({ Date: date, mine: !club, GroomID: club ? groomId : undefined }), [date, club, groomId])
  const lookups = useLoad(() => (club ? Promise.all([getApprovedHorses(), getGrooms()]) : Promise.resolve([[], []])), [club])
  const generate = useSubmit()
  const [generated, setGenerated] = useState('')
  const [horses, grooms] = lookups.data || [[], []]
  const rows = useMemo(() => (tasks.data || [])
    .filter(t => (!status || t.Status === status) && (!horseId || String(t.HorseID) === horseId))
    .sort((a, b) => String(a.ScheduledAt).localeCompare(String(b.ScheduledAt))), [tasks.data, status, horseId])
  const all = useMemo(() => tasks.data || [], [tasks.data])
  const summary = {
    total: all.length, pending: all.filter(t => t.Status === 'Pending').length,
    done: all.filter(t => t.Status === 'Completed').length, overdue: all.filter(isOverdue).length,
  }
  const taskHorses = useMemo(() => {
    const seen = new Map()
    all.forEach(t => seen.set(t.HorseID, { HorseID: t.HorseID, HorseName: t.HorseName }))
    return [...seen.values()].sort((a, b) => a.HorseName.localeCompare(b.HorseName))
  }, [all])
  const canSkip = club || currentUser?.permissions?.includes('CARE_MANAGE')

  async function runGenerate() {
    const result = await generate.run(() => generateCareTasks(date, 1), 'Đã sinh việc.')
    if (Array.isArray(result) && result[0]) {
      const r = result[0]
      generate.clear()
      window.setTimeout(() => tasks.reload(), 0)
      setGenerated(`Ngày ${fmtDate(r.Date)}: thêm ${r.Created} việc, gỡ ${r.Removed} việc cũ${r.Unassigned ? `, ${r.Unassigned} việc chưa có Groom để giao` : ''}.`)
    }
  }
  return <CarePage
    crumb={club ? 'Việc chăm sóc toàn CLB' : 'Việc của tôi'}
    eyebrow={club ? 'HUẤN LUYỆN VIÊN TRƯỞNG' : 'GROOM'}
    title={club ? 'Việc chăm sóc toàn câu lạc bộ' : 'Việc chăm sóc của tôi'}
    description={club
      ? 'Việc hằng ngày do hệ thống tự sinh theo chỉ tiêu (cho ăn theo khẩu phần, dọn chuồng, tắm sau buổi tập, ngâm chân khi bị khóa tập). Theo dõi tiến độ và giao thêm việc khi cần.'
      : 'Việc được hệ thống tự giao theo khẩu phần, lịch tập và chỉ tiêu của câu lạc bộ. Làm xong bấm "Đã làm"; không làm được thì bấm "Bỏ qua" và ghi lý do.'}
  >
    <section className="filter-card care-toolbar">
      <div className="care-day-switch" role="group" aria-label="Chọn ngày">
        <button className="button button-secondary" type="button" onClick={() => setDate(addDays(date, -1))}>‹ Hôm trước</button>
        <label className="filter-field"><span>Ngày</span>
          <input type="date" value={date} max={addDays(today, 7)} onChange={e => e.target.value && setDate(e.target.value)} /></label>
        <button className="button button-secondary" type="button" disabled={date >= addDays(today, 7)}
          onClick={() => setDate(addDays(date, 1))}>Hôm sau ›</button>
        {date !== today && <button className="button button-secondary" type="button" onClick={() => setDate(today)}>Hôm nay</button>}
      </div>
      <label className="filter-field"><span>Trạng thái</span>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Tất cả</option>
          {Object.entries(TASK_STATUS).map(([value, [text]]) => <option key={value} value={value}>{text}</option>)}
        </select></label>
      <HorsePicker horses={taskHorses} value={horseId} onChange={setHorseId} allowAll />
      {club && <label className="filter-field"><span>Groom</span>
        <select value={groomId} onChange={e => setGroomId(e.target.value)}>
          <option value="">Tất cả Groom</option>
          {grooms.map(g => <option key={g.UserID} value={g.UserID}>{g.FullName}</option>)}
        </select></label>}
    </section>

    <section className="care-stats" aria-label="Tổng quan trong ngày">
      <article><span>Tổng việc</span><strong>{summary.total}</strong></article>
      <article><span>Chưa làm</span><strong>{summary.pending}</strong></article>
      <article><span>Đã làm</span><strong>{summary.done}</strong></article>
      <article className={summary.overdue ? 'care-stat-alert' : ''}><span>Quá giờ</span><strong>{summary.overdue}</strong></article>
    </section>

    {club && <div className="care-toolbar-actions">
      <ExtraTaskForm horses={horses} grooms={grooms} date={date} onSaved={tasks.reload} />
      {date >= today && <button className="button button-secondary" type="button" disabled={generate.busy} onClick={runGenerate}>
        {generate.busy ? 'Đang sinh việc…' : 'Sinh lại việc theo chỉ tiêu'}</button>}
      {generated && <span className="care-inline-notice" role="status">{generated}</span>}
      {generate.error && <span className="error-message" role="alert">{generate.error}</span>}
    </div>}

    <section className="panel care-task-panel">
      <Loading state={tasks} isEmpty={!rows.length}
        empty={all.length ? ['Không có việc khớp bộ lọc', 'Thử bỏ bớt bộ lọc.']
          : ['Không có việc trong ngày này', date < today ? 'Ngày đã qua không sinh thêm việc.' : 'Khi có khẩu phần, buổi tập hoặc chỉ tiêu, việc sẽ tự xuất hiện ở đây.']}>
        <div className="care-task-list">
          {rows.map(task => <TaskCard key={task.CareTaskID} task={task} showGroom={club}
            canComplete={!club && String(task.GroomID) === String(currentUser?.id)} canSkip={canSkip} onDone={tasks.reload} />)}
        </div>
      </Loading>
    </section>
    {!club && <p className="care-muted care-footnote">Thấy ngựa có dấu hiệu bất thường khi chăm sóc (què, bỏ ăn, sưng chân…) thì báo ngay cho Vet hoặc Huấn luyện viên trưởng.</p>}
  </CarePage>
}
