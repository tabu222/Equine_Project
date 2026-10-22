import { useState } from 'react'
import { useVetMutation } from './useVetMutation.jsx'
import { Field } from '../../components/common/OperationUI.jsx'
import { scheduleTypes } from './vetDomain.js'

export default function CalendarEventEditor({ row, onChanged }) {
  const [mode, setMode] = useState('')
  const action = useVetMutation(() => { setMode(''); onChanged() })
  const vaccination = row.kind === 'vaccination'
  const path = `/${vaccination ? 'vaccinations' : 'medical-schedules'}/${vaccination ? row.VaccinationID : row.MedicalScheduleID}`
  const pending = ['Scheduled', 'Overdue'].includes(row.Status)
  function submit(event) {
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    const body = { Note: f.get('Note').trim(),
      ...(vaccination ? { VaccineName: f.get('VaccineName').trim(), VaccinationDate: f.get('VaccinationDate'), NextDueDate: f.get('NextDueDate') || null }
        : { ScheduleType: f.get('ScheduleType'), ScheduledDate: f.get('ScheduledDate') }) }
    void action.run(path, body, true)
  }
  return <div><div className="vet-toolbar">{pending && <>
    <button className="button button-secondary" disabled={action.busy} onClick={() => setMode('edit')}>Sửa lịch</button>
    <button className="button button-secondary vet-danger-outline" disabled={action.busy} onClick={() => { if (window.confirm('Hủy lịch y tế này?')) void action.run(path, { Status: 'Cancelled' }, true) }}>Hủy lịch</button>
  </>}</div>{pending && <p className="vet-caption">Chưa thể lưu đầy đủ kết quả thực hiện tại đây.</p>}{action.feedback}
  {mode && <form className="vet-operation-form" onSubmit={submit}><fieldset className="vet-form-fields" disabled={action.busy}><legend>Cập nhật lịch y tế</legend>
    {vaccination ? <><Field label="Tên vắc xin" name="VaccineName" required maxLength={150} defaultValue={row.VaccineName} action={action} /><Field label="Ngày tiêm dự kiến" name="VaccinationDate" type="date" required defaultValue={row.day} action={action} /><Field label="Ngày tiêm nhắc lại theo chỉ định (không tự tạo lịch)" name="NextDueDate" type="date" defaultValue={row.NextDueDate || ''} action={action} /></>
      : <><Field label="Loại công việc" name="ScheduleType" defaultValue={row.ScheduleType} options={Object.entries(scheduleTypes)} action={action} /><Field label="Ngày hẹn trong lịch" name="ScheduledDate" type="date" required defaultValue={row.day} action={action} /></>}
    <Field label="Ghi chú" name="Note" multiline maxLength={1000} defaultValue={row.Note || ''} action={action} />
    <button className="button">{action.busy ? 'Đang lưu…' : 'Lưu lịch'}</button><button type="button" className="button button-secondary" onClick={() => setMode('')}>Đóng</button>
  </fieldset></form>}
  </div>
}
