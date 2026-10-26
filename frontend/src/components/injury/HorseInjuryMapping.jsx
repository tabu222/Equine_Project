import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HealthBadge } from '../../pages/vet/VetWorkspace.jsx'
import { clubToday, examLabels, latestSigned, recordHealthLabels, trainingLabels, vetDate, vetDateTime } from '../../pages/vet/vetDomain.js'
import { useVetResource } from '../../pages/vet/useVetResource.js'
import useClinicalWarning from '../../pages/vet/useClinicalWarning.js'
import { formatHorseCode } from '../horse/horseDisplay.js'
import { createInjuryDiagramRepository } from '../../api/injuryDiagramRepository.js'
import HorseInjuryDiagram from './HorseInjuryDiagram.jsx'
import InjuryDetailPanel from './InjuryDetailPanel.jsx'
import InjuryMarkerList from './InjuryMarkerList.jsx'
import TrainingRestrictionAlert from './TrainingRestrictionAlert.jsx'
import { trainingRestriction } from './injuryDomain.js'
import { DIAGRAM_VERSION, diagramViews } from './horseDiagram.js'
import { demoRecords, markerIsEditable, validateAssessment, validateDiagramMarker } from './injuryDiagramDomain.js'
import './HorseInjuryMapping.css'

const demoEnabled = import.meta.env.VITE_INJURY_DIAGRAM_DEMO === 'true'
const emptyFilters = { region: '', severity: '', status: '' }
const clone = value => JSON.parse(JSON.stringify(value))

// Switching user, club or horse always discards the previous component's data context.
export default function HorseInjuryMapping(props) {
  return <InjuryMappingWorkspace key={JSON.stringify([props.currentUser.id, props.currentUser.clubId, props.horse.id])} {...props} />
}
function InjuryMappingWorkspace({ horse, records, currentUser, lockRevision = 0 }) {
  const locks = useVetResource(`/training-locks?HorseID=${encodeURIComponent(horse.id)}`)
  const reloadLocks = locks.reload
  useEffect(() => { if (lockRevision) reloadLocks() }, [lockRevision, reloadLocks])
  const latest = latestSigned(records, horse.id)
  const restriction = trainingRestriction(locks, latest, horse.profileStatus === 'APPROVED')
  const [demo, setDemo] = useState(false)
  const repository = useMemo(() => createInjuryDiagramRepository({ mode: demo && demoEnabled ? 'demo' : 'unsupported',
    scope: { userId: currentUser.id, clubId: currentUser.clubId, horseId: horse.id }, getPermissions: () => currentUser.permissions,
  }), [demo, currentUser.id, currentUser.clubId, currentUser.permissions, horse.id])
  const [loadedResource, setResource] = useState(null)
  const [revision, setRevision] = useState(0)
  const [draft, setDraft] = useState(null)
  const [baseline, setBaseline] = useState('null')
  const [recoveryDirty, setRecoveryDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [errors, setErrors] = useState({})
  const [view, setView] = useState('left')
  const [diagramReady, setDiagramReady] = useState(false)
  const [mode, setMode] = useState('view')
  const [filters, setFilters] = useState(emptyFilters)
  const mutation = useRef(false)
  const resource = loadedResource?.repository === repository && loadedResource.revision === revision
    ? loadedResource : { loading: true, error: '', markers: [] }
  const { markers } = resource
  const canManage = repository.supported && !resource.loading && !resource.error && currentUser.permissions.includes('MEDICAL_MANAGE')
  const canEdit = !!(canManage && draft && markerIsEditable(draft, demoRecords, currentUser.permissions) &&
    (!draft.id || markers.some(marker => marker.id === draft.id && markerIsEditable(marker, demoRecords, currentUser.permissions))))
  const dirty = !!draft && JSON.stringify(draft) !== baseline
  useClinicalWarning(dirty || recoveryDirty)
  useEffect(() => {
    let active = true
    repository.list().then(rows => { if (active) setResource({ repository, revision, loading: false, error: '', markers: rows }) })
      .catch(() => { if (active) setResource({ repository, revision, loading: false, error: 'Không tải được dữ liệu minh họa. Dữ liệu đã lưu được giữ nguyên; vui lòng thử lại.', markers: [] }) })
    return () => { active = false }
  }, [repository, revision])

  function discardAllowed() {
    return !mutation.current && (!(dirty || recoveryDirty) || window.confirm('Nội dung chưa được lưu. Bạn có muốn bỏ thay đổi?'))
  }
  function clearEditor() { setDraft(null); setBaseline('null'); setRecoveryDirty(false); setErrors({}); setFeedback(null) }
  function select(marker) {
    if (draft?.id === marker.id || !discardAllowed()) return
    // Re-read from the current resource, never trust coordinates or history supplied by an event.
    const stored = markers.find(item => item.id === marker.id)
    if (!stored) return
    setDraft(clone(stored)); setBaseline(JSON.stringify(stored)); setErrors({}); setFeedback(null); setRecoveryDirty(false)
    if (Object.keys(diagramViews).includes(stored.view)) setView(stored.view)
    setMode('view')
  }
  function chooseMode(next) {
    if (next === 'add' && !canManage) return
    if (!discardAllowed()) return
    clearEditor(); setMode(next)
  }
  function chooseView(next) {
    if (!Object.keys(diagramViews).includes(next) || mutation.current || next === view) return
    if (mode !== 'reposition') {
      if (!discardAllowed()) return
      clearEditor()
    }
    setView(next)
  }
  function pick(bodyRegion, chosenView, point) {
    if (!canManage || !diagramReady || mutation.current || !['add', 'reposition'].includes(mode)) return
    if (mode === 'reposition' && (!draft || !canEdit)) return
    const next = mode === 'reposition' ? { ...draft } : { horseId: 'demo-horse', medicalRecordId: 'demo-draft', description: '', severity: 'mild', status: 'treating', detectedAt: clubToday(), notes: '', history: [] }
    Object.assign(next, { diagramVersion: DIAGRAM_VERSION, bodyRegion, bodySide: chosenView, view: chosenView, ...point })
    if (validateDiagramMarker(next, clubToday(), demoRecords).bodyRegion) return
    setDraft(next); if (mode === 'add') setBaseline('null')
    setMode('view'); setErrors({}); setFeedback(null)
  }
  function reposition() { if (canEdit && diagramReady && !mutation.current && !recoveryDirty) setMode('reposition') }
  function cancel() { if (discardAllowed()) { clearEditor(); setMode('view') } }
  function toggleDemo() {
    if (!demoEnabled || !discardAllowed()) return
    clearEditor(); setDemo(value => !value); setMode('view'); setFilters(emptyFilters); setView('left')
  }
  function change(key, value) {
    if (!canEdit || mutation.current) return
    if (!['description', 'severity', 'status', 'detectedAt', 'notes', 'medicalRecordId'].includes(key) || (key === 'medicalRecordId' && draft.id)) return
    setDraft(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: undefined })); setFeedback(null)
  }
  async function save(event) {
    event.preventDefault()
    if (!canEdit || mutation.current || !dirty) return
    const invalid = validateDiagramMarker(draft, clubToday(), demoRecords)
    setErrors(invalid)
    if (Object.keys(invalid).length) return
    mutation.current = true; setBusy(true); setFeedback(null)
    try {
      const rows = await repository.save(draft)
      const saved = draft.id ? rows.find(row => row.id === draft.id) : rows[rows.length - 1]
      setResource({ repository, revision, loading: false, error: '', markers: rows }); setDraft(clone(saved)); setBaseline(JSON.stringify(saved)); setMode('view')
      setFeedback({ message: 'Đã lưu dữ liệu minh họa trên trình duyệt, chưa đồng bộ máy chủ.' })
    } catch { setFeedback({ error: true, message: 'Không thể lưu. Nội dung đã nhập vẫn được giữ lại; kiểm tra bộ nhớ trình duyệt và thử lại.' }) }
    finally { mutation.current = false; setBusy(false) }
  }
  async function remove() {
    if (!canEdit || mutation.current || !draft?.id || draft.history.length || !discardAllowed() || !window.confirm(`Xóa chấn thương “${draft.description}”? Dữ liệu minh họa này sẽ bị xóa khỏi trình duyệt.`)) return
    mutation.current = true; setBusy(true); setFeedback(null)
    try { const rows = await repository.remove(draft.id); setResource({ repository, revision, loading: false, error: '', markers: rows }); clearEditor(); setMode('view'); setFeedback({ message: 'Đã xóa chấn thương minh họa.' }) }
    catch { setFeedback({ error: true, message: 'Không thể xóa chấn thương. Vui lòng thử lại.' }) }
    finally { mutation.current = false; setBusy(false) }
  }
  async function assessment(id, entry) {
    const original = markers.find(marker => marker.id === id)
    if (!canManage || mutation.current || dirty || !original || Object.keys(validateAssessment(entry, original, clubToday(), demoRecords)).length) return false
    mutation.current = true; setBusy(true); setFeedback(null)
    try {
      const rows = await repository.appendAssessment(id, entry), saved = rows.find(row => row.id === id)
      setResource({ repository, revision, loading: false, error: '', markers: rows }); setDraft(clone(saved)); setBaseline(JSON.stringify(saved)); setRecoveryDirty(false)
      setFeedback({ message: 'Đã lưu lần theo dõi minh họa mới, giữ nguyên lịch sử trước đó.' }); return true
    } catch { setFeedback({ error: true, message: 'Không thể lưu lần theo dõi. Nhận xét đã nhập vẫn được giữ lại; vui lòng thử lại.' }); return false }
    finally { mutation.current = false; setBusy(false) }
  }
  function changeFilters(next) { if (discardAllowed()) { clearEditor(); setMode('view'); setFilters(next) } }
  const injuries = records.filter(record => record.injuryLocation)
  return <div className="horse-injury-mapping">
    <header className="injury-page-heading"><div><p className="injury-eyebrow">THEO DÕI CHẤN THƯƠNG & PHỤC HỒI</p><h2>Sơ đồ chấn thương</h2><p>Ghi nhận vùng cơ thể và theo dõi từng lần phục hồi.</p></div>{demoEnabled && <button className="button button-secondary" type="button" onClick={toggleDemo} disabled={busy}>{demo ? 'Đóng dữ liệu minh họa' : 'Mở dữ liệu minh họa'}</button>}</header>
    <TrainingRestrictionAlert data={locks} latest={latest} horse={horse} />
    <div className={`injury-mode-note${demo ? ' is-demo' : ''}`} role="note"><strong>{demo ? 'Dữ liệu minh họa, chưa đồng bộ máy chủ' : 'Chức năng lưu sơ đồ chưa được hỗ trợ'}</strong><span>{demo ? 'Chỉ nhập nội dung giả. Các phiếu minh họa tách biệt với bệnh án; dữ liệu được giữ trên trình duyệt này sau khi tải lại trang.' : 'Bạn vẫn có thể xem sơ đồ và các vị trí đã mô tả bằng chữ trong bệnh án bên dưới.'}</span></div>
    <div className="injury-layout">
      <div className="injury-main-column">
        <section className="injury-card injury-diagram-card" aria-labelledby="injury-diagram-title">
          <header className="injury-horse-heading"><div><span className="injury-eyebrow">SƠ ĐỒ CƠ THỂ NGỰA</span><h3 id="injury-diagram-title">{horse.name} <span>{formatHorseCode(horse.code)}</span></h3><div className="injury-horse-badges"><HealthBadge status={horse.healthStatus} /><span className={`injury-training-badge tone-${restriction.tone}`}>{restriction.title}</span></div></div><div className="injury-marked-total"><strong>{repository.supported ? markers.length : '—'}</strong><span>{demo ? 'chấn thương minh họa' : 'chưa có dữ liệu sơ đồ'}</span></div></header>
          <HorseInjuryDiagram view={view} onView={chooseView} mode={mode} canAdd={canManage} onMode={chooseMode} markers={markers} filters={filters} draft={draft} selectedId={draft?.id} onPick={pick} onSelect={select} onReady={setDiagramReady} busy={busy} />
        </section>
        <InjuryMarkerList markers={markers} selectedId={draft?.id} onSelect={select} filters={filters} onFilters={changeFilters} supported={repository.supported} loading={resource.loading} error={resource.error} onRetry={() => setRevision(value => value + 1)} busy={busy} />
      </div>
      <div className="injury-detail-column">{feedback && <div className={`injury-feedback${feedback.error ? ' is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.message}</div>}
        <InjuryDetailPanel horse={horse} draft={draft} onChange={change} onSave={save} onCancel={cancel} onDelete={remove} onReposition={reposition} canEdit={canEdit} canPosition={diagramReady} canManage={canManage} busy={busy} dirty={dirty} errors={errors} demo={demo} records={demo ? demoRecords : []} onAssessment={assessment} onRecoveryDirty={setRecoveryDirty} />
      </div>
    </div>
    <section className="injury-card injury-records" aria-labelledby="injury-records-title"><header className="injury-card-heading"><div><h3 id="injury-records-title">Vị trí đã ghi trong bệnh án <span className="injury-count">{injuries.length}</span></h3><p>Dữ liệu hồ sơ y tế · Vị trí được bác sĩ mô tả bằng chữ</p></div></header>
      {!injuries.length ? <p className="injury-record-empty">Chưa ghi vị trí chấn thương trong bệnh án.</p> : <ul>{injuries.map(record => <li key={record.id}><div><span className="injury-eyebrow">{examLabels[record.examType]} · {record.recordStatus === 'Signed' ? 'Đã chốt' : 'Đang khám'}</span><h4>{record.injuryLocation}</h4><p>{record.diagnosis || 'Chưa ghi chẩn đoán'}</p>{record.treatmentPlan && <p>Hướng điều trị: {record.treatmentPlan}</p>}<p>{recordHealthLabels[record.healthStatus] || 'Chưa đánh giá sức khỏe'} · {trainingLabels[record.trainingEligibility] || 'Chưa kết luận điều kiện tập'}</p>{record.followUpDate && <p>Chỉ định tái khám: {vetDate(record.followUpDate)}</p>}<small>{record.vetName} · {vetDateTime(record.examDate)}</small></div><Link to={`?tab=history&record=${encodeURIComponent(record.id)}`}>Xem bệnh án #{record.id} <span aria-hidden="true">↗</span></Link></li>)}</ul>}
    </section>
  </div>
}
