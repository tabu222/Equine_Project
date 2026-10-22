import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVetHerd, getVetHistories } from '../../api/vetApi.ts'
import HorseAvatar from '../../components/horse/HorseAvatar.jsx'
import { formatHorseCode } from '../../components/horse/horseDisplay.js'
import { useVetResource } from './useVetResource.js'
import { ResourceState } from './VetOperations.jsx'
import { examLabels, vetDateTime, vetError } from './vetDomain.js'

export default function VetClinicalQueue({ currentUser, query = '' }) {
  const reports = useVetResource('/health-reports?open=1')
  const [state, setState] = useState({ loading: true, rows: [], error: '' })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const horses = await getVetHerd(currentUser.clubId)
        const history = await getVetHistories(horses.filter(h => h.profileStatus === 'APPROVED'))
        if (history.failedHorseIds.length) throw new Error('Incomplete history')
        if (active) setState({ loading: false, rows: history.records.filter(r => r.recordStatus === 'Draft' && r.examType !== 'Initial Exam').map(r => ({ ...r, horse: horses.find(h => h.id === r.horseId) })), error: '' })
      } catch (error) { if (active) setState({ loading: false, rows: [], error: vetError(error, 'Không tải đủ các ca khám sau tiếp nhận. Vui lòng thử lại.') }) }
    }
    void load()
    return () => { active = false }
  }, [currentUser.clubId, version])
  const rows = state.rows.filter(r => !query || [r.horseName, r.horse?.code, r.horse?.microchipNumber].some(v => v?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))
    .sort((a,b) => a.examDate.localeCompare(b.examDate))
  return <section className="table-card"><div className="table-header"><div><h2>Khám sau tiếp nhận</h2><p>Phiếu nháp đang xử lý và báo cáo sức khỏe đang chờ bác sĩ.</p></div><button className="button button-secondary" onClick={() => { setState(s => ({ ...s, loading: true })); setVersion(v => v + 1); reports.reload() }}>Làm mới ca khám</button></div>
    <ResourceState data={{ ...state, reload: () => setVersion(v => v + 1) }}>
      {rows.length ? <div className="table-wrapper"><table className="horse-table"><thead><tr><th>Ngựa</th><th>Loại khám / nguồn</th><th>Ngày giờ khám</th><th>Bác sĩ</th><th>Tiến độ</th><th>Thao tác</th></tr></thead><tbody>{rows.map(r => {
        const linked = reports.rows.find(report => String(report.MedicalRecordID) === r.id)
        return <tr key={r.id}><td><div className="horse-table-identity"><HorseAvatar horseId={r.horseId} name={r.horseName} size="small" /><div><strong>{r.horseName}</strong><small>{formatHorseCode(r.horse?.code)}</small><small>Microchip: {r.horse?.microchipNumber || 'Chưa cập nhật'}</small></div></div></td><td>{examLabels[r.examType]}<small>{reports.loading ? 'Đang đối chiếu nguồn…' : reports.error ? 'Chưa tải được nguồn báo cáo' : linked ? 'Báo cáo sức khỏe #' + linked.HealthReportID : 'Phiếu khám sau tiếp nhận'}</small></td><td>{vetDateTime(r.examDate)}</td><td>{r.vetName}</td><td><span className="vet-pill due-today">Đang khám · Nháp #{r.id}</span></td><td>{r.vetId === currentUser.id && currentUser.permissions.includes('MEDICAL_MANAGE') ? <Link className="view-button" to={'/vet/horses/' + r.horseId + '/examination?record=' + r.id}>Tiếp tục khám</Link> : <><span>Bác sĩ khác đang xử lý</span><Link to={'/vet/horses/' + r.horseId + '?tab=history&record=' + r.id}>Xem bệnh án</Link></>}</td></tr>
      })}</tbody></table></div> : <p className="vet-empty">Không có phiếu nháp sau tiếp nhận phù hợp.</p>}
    </ResourceState>
    <ResourceState data={reports}>{reports.rows.filter(r => !r.MedicalRecordID && (!query || r.HorseName?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))).sort((a,b) => (b.Severity === 'Urgent') - (a.Severity === 'Urgent') || a.ReportedAt.localeCompare(b.ReportedAt)).map(r => <div className="vet-queue-report vet-task" key={r.HealthReportID}><div><strong>{r.HorseName}</strong><p>{r.Description}</p><small>{r.ReportedByName} · {vetDateTime(r.ReportedAt)}</small><span className={'vet-pill ' + (r.Severity === 'Urgent' ? 'due-overdue' : '')}>{r.Severity === 'Urgent' ? 'Khẩn' : 'Thông thường'} · {r.Status === 'Reported' ? 'Chưa bắt đầu' : 'Đang xử lý'}</span></div><Link className="button button-secondary" to={'/vet/reports?report=' + r.HealthReportID + '&status=all'}>Mở báo cáo</Link></div>)}</ResourceState>
  </section>
}
