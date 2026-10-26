import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HealthBadge } from '../../pages/vet/VetWorkspace.jsx'
import { clubToday, examLabels, latestSigned, recordHealthLabels, trainingLabels, vetDate, vetDateTime } from '../../pages/vet/vetDomain.js'
import { useVetResource } from '../../pages/vet/useVetResource.js'
import useClinicalWarning from '../../pages/vet/useClinicalWarning.js'
import { formatHorseCode } from '../horse/horseDisplay.js'
import { DEMO_MODEL_VERSION, demoMarkerRepository } from '../../mock/injuryMarkers.js'
import Horse3DViewer from './Horse3DViewer.jsx'
import InjuryDetailPanel from './InjuryDetailPanel.jsx'
import InjuryMarkerList from './InjuryMarkerList.jsx'
import TrainingRestrictionAlert from './TrainingRestrictionAlert.jsx'
import { trainingRestriction, viewForPoint } from './injuryDomain.js'
import './HorseInjuryMapping.css'

const asset = import.meta.env.VITE_HORSE_MODEL_URL && import.meta.env.VITE_HORSE_MODEL_VERSION
  ? { url: import.meta.env.VITE_HORSE_MODEL_URL, version: import.meta.env.VITE_HORSE_MODEL_VERSION } : null

export default function HorseInjuryMapping({ horse, records, currentUser, lockRevision = 0 }) {
  const locks = useVetResource(`/training-locks?HorseID=${encodeURIComponent(horse.id)}`)
  const reloadLocks = locks.reload
  useEffect(() => { if (lockRevision) reloadLocks() }, [lockRevision, reloadLocks])
  const latest = latestSigned(records, horse.id)
  const restriction = trainingRestriction(locks, latest, horse.profileStatus === 'APPROVED')
  const repository = useMemo(() => demoMarkerRepository({ userId: currentUser.id, clubId: currentUser.clubId, horseId: horse.id, modelVersion: asset?.version || DEMO_MODEL_VERSION }), [currentUser.id, currentUser.clubId, horse.id])
  const [demo, setDemo] = useState(false)
  const [markers, setMarkers] = useState(() => repository.list())
  const [draft, setDraft] = useState(null)
  const [baseline, setBaseline] = useState('null')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [viewRequest, setViewRequest] = useState(null)
  const mutation = useRef(false)
  const canEdit = demo && currentUser.permissions.includes('MEDICAL_MANAGE')
  const dirty = canEdit && JSON.stringify(draft) !== baseline
  useClinicalWarning(dirty)

  function discardAllowed() {
    return !mutation.current && (!dirty || window.confirm('Thông tin vị trí chưa được lưu. Bạn có muốn bỏ thay đổi?'))
  }
  function select(marker) {
    if (draft?.id === marker.id || !discardAllowed()) return
    setDraft({ ...marker, point: { ...marker.point } }); setBaseline(JSON.stringify(marker)); setFeedback(null)
    setViewRequest({ preset: marker.viewHint || viewForPoint(marker.point), sequence: Date.now() })
  }
  function pick(point, viewHint) {
    if (!canEdit || !discardAllowed()) return
    setDraft({ horseId: horse.id, modelVersion: asset.version, point, viewHint, location: '', description: '', severity: 'mild', status: 'treating', detectedAt: clubToday(), notes: '' })
    setBaseline('null'); setFeedback(null)
  }
  function cancel() {
    if (!discardAllowed()) return
    setDraft(null); setBaseline('null'); setFeedback(null)
  }
  function toggleDemo() {
    if (!discardAllowed()) return
    setDemo(value => !value); setDraft(null); setBaseline('null'); setFeedback(null)
  }
  async function save(event) {
    event.preventDefault()
    if (!canEdit || mutation.current || !dirty) return
    if (!draft.location.trim() || !draft.description.trim()) { setFeedback({ error: true, message: 'Vui lòng nhập vị trí và mô tả chấn thương.' }); return }
    mutation.current = true; setBusy(true); setFeedback(null)
    try {
      const rows = await repository.save({ ...draft, location: draft.location.trim(), description: draft.description.trim(), notes: draft.notes.trim() })
      setMarkers(rows)
      const saved = draft.id ? rows.find(row => row.id === draft.id) : rows[rows.length - 1]
      setDraft(saved); setBaseline(JSON.stringify(saved))
      setFeedback({ message: 'Đã lưu dấu dùng thử trong phiên này. Chưa ghi vào bệnh án.' })
    } catch { setFeedback({ error: true, message: 'Không thể lưu dấu dùng thử. Nội dung đã nhập vẫn được giữ lại; vui lòng thử lại.' }) }
    finally { mutation.current = false; setBusy(false) }
  }
  async function remove() {
    if (!canEdit || mutation.current || !draft?.id || !window.confirm(`Xóa dấu dùng thử tại “${draft.location}”? Thao tác này không thể hoàn tác.`)) return
    mutation.current = true; setBusy(true)
    try {
      setMarkers(await repository.remove(draft.id)); setDraft(null); setBaseline('null')
      setFeedback({ message: 'Đã xóa dấu dùng thử khỏi phiên này.' })
    } catch { setFeedback({ error: true, message: 'Không thể xóa dấu dùng thử. Vui lòng thử lại.' }) }
    finally { mutation.current = false; setBusy(false) }
  }

  const injuries = records.filter(record => record.injuryLocation)
  return <div className="horse-injury-mapping">
    <header className="injury-page-heading"><div><p className="injury-eyebrow">THEO DÕI CHẤN THƯƠNG & PHỤC HỒI</p><h2>Bản đồ chấn thương</h2><p>Quan sát vị trí. Ghi nhận rõ ràng. Theo dõi xuyên suốt.</p></div><button className="button button-secondary" type="button" onClick={toggleDemo} disabled={busy}>{demo ? 'Thoát dùng thử' : 'Dùng thử giao diện'}</button></header>
    <TrainingRestrictionAlert data={locks} latest={latest} horse={horse} />
    <div className={`injury-mode-note${demo ? ' is-demo' : ''}`} role="note"><strong>{demo ? 'Đang dùng dữ liệu minh họa' : 'Chưa hỗ trợ lưu vị trí 3D'}</strong><span>{demo ? 'Dấu dùng thử tách biệt với hồ sơ ngựa, chỉ giữ đến khi tải lại trang. Không thay đổi lệnh khóa tập.' : 'Vị trí đã ghi bằng chữ trong bệnh án vẫn được hiển thị bên dưới. Bạn có thể dùng thử panel và danh sách vị trí.'}</span></div>
    <div className="injury-layout">
      <div className="injury-main-column">
        <section className="injury-card injury-model-card" aria-labelledby="injury-model-title">
          <header className="injury-horse-heading"><div><span className="injury-eyebrow">MÔ HÌNH NGỰA 3D</span><h3 id="injury-model-title">{horse.name} <span>{formatHorseCode(horse.code)}</span></h3><div className="injury-horse-badges"><HealthBadge status={horse.healthStatus} /><span className={`injury-training-badge tone-${restriction.tone}`}>{restriction.title}</span></div></div><div className="injury-marked-total"><strong>{demo ? markers.length : '—'}</strong><span>{demo ? 'vị trí dùng thử' : 'chưa có dữ liệu 3D'}</span></div></header>
          <Horse3DViewer asset={asset} markers={demo ? markers : []} selectedId={draft?.id} draft={draft} onPick={pick} onSelect={select} viewRequest={viewRequest} />
        </section>
        <InjuryMarkerList markers={demo ? markers : []} selectedId={draft?.id} onSelect={select} demo={demo} />
      </div>
      <div className="injury-detail-column">{feedback && <div className={`injury-feedback${feedback.error ? ' is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.message}</div>}
        <InjuryDetailPanel draft={draft} onChange={(key, value) => setDraft(current => ({ ...current, [key]: value }))} onSave={save} onCancel={cancel} onDelete={remove} canEdit={canEdit} busy={busy} dirty={dirty} demo={demo} />
      </div>
    </div>
    <section className="injury-card injury-records" aria-labelledby="injury-records-title"><header className="injury-card-heading"><div><h3 id="injury-records-title">Vị trí đã ghi trong bệnh án <span className="injury-count">{injuries.length}</span></h3><p>Dữ liệu hồ sơ y tế · Vị trí được bác sĩ mô tả bằng chữ</p></div></header>
      {!injuries.length ? <p className="injury-record-empty">Chưa ghi vị trí chấn thương trong bệnh án.</p> : <ul>{injuries.map(record => <li key={record.id}><div><span className="injury-eyebrow">{examLabels[record.examType]} · {record.recordStatus === 'Signed' ? 'Đã chốt' : 'Đang khám'}</span><h4>{record.injuryLocation}</h4><p>{record.diagnosis || 'Chưa ghi chẩn đoán'}</p>{record.treatmentPlan && <p>Hướng điều trị: {record.treatmentPlan}</p>}<p>{recordHealthLabels[record.healthStatus] || 'Chưa đánh giá sức khỏe'} · {trainingLabels[record.trainingEligibility] || 'Chưa kết luận điều kiện tập'}</p>{record.followUpDate && <p>Chỉ định tái khám: {vetDate(record.followUpDate)}</p>}<small>{record.vetName} · {vetDateTime(record.examDate)}</small></div><Link to={`?tab=history&record=${encodeURIComponent(record.id)}`}>Xem bệnh án #{record.id} <span aria-hidden="true">↗</span></Link></li>)}</ul>}
    </section>
  </div>
}
