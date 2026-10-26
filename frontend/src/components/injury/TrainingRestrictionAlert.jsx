import { vetDate, vetDateTime } from '../../pages/vet/vetDomain.js'
import InjuryIcon from './InjuryIcon.jsx'
import { trainingRestriction } from './injuryDomain.js'

export default function TrainingRestrictionAlert({ data, latest, horse }) {
  const state = trainingRestriction(data, latest, horse.profileStatus === 'APPROVED')
  const lock = state.lock
  return <section className={`injury-restriction tone-${state.tone}`} aria-label="Điều kiện huấn luyện" aria-live="polite">
    <InjuryIcon kind="shield" />
    <div><span className="injury-restriction-title">{state.title}</span><p>{state.message}</p>
      {lock && <dl className="injury-lock-details">
        {lock.Reason && <div><dt>Lý do</dt><dd>{lock.Reason}</dd></div>}
        {lock.CreatedByName && <div><dt>Bác sĩ ban hành</dt><dd>{lock.CreatedByName}</dd></div>}
        {lock.LockStartDate && <div><dt>Bắt đầu</dt><dd>{vetDateTime(lock.LockStartDate)}</dd></div>}
        {lock.LockLevel === 'Restricted' && lock.MaxIntensity != null && <div><dt>Tải tối đa</dt><dd>{lock.MaxIntensity}</dd></div>}
        {latest?.followUpDate && <div><dt>Chỉ định tái khám</dt><dd>{vetDate(latest.followUpDate)}</dd></div>}
      </dl>}
      {data.error ? <button type="button" className="injury-text-button" onClick={data.reload}>Thử tải lại lệnh khóa</button>
        : <a href="#vet-emergency-lock">Xem quy trình khóa và hạn chế tập →</a>}
    </div>
  </section>
}
