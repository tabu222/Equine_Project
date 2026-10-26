import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { vetDateTime } from '../../pages/vet/vetDomain.js'
import './EffectiveTrainingBadge.css'

function StateIcon({ status }) {
  return <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {status === 'full' ? <><rect x="4" y="9" width="12" height="8" rx="2" /><path d="M6.5 9V6a3.5 3.5 0 0 1 7 0v3M10 12v2" /></>
      : status === 'restricted' ? <><path d="m10 2 8 15H2L10 2ZM10 7v4M10 14h.01" /></>
        : status === 'allowed' ? <><circle cx="10" cy="10" r="7" /><path d="m6.5 10 2.3 2.3 4.7-4.6" /></>
          : <><circle cx="10" cy="10" r="7" /><path d="M8 7.5a2 2 0 0 1 4 0c0 1.5-2 1.5-2 3M10 13.5h.01" /></>}
  </svg>
}

export default function EffectiveTrainingBadge({ state }) {
  const id = useId(), trigger = useRef(null), panel = useRef(null), pinned = useRef(false), timer = useRef(null)
  const [position, setPosition] = useState(null)
  function close() { clearTimeout(timer.current); pinned.current = false; setPosition(null) }
  function show() {
    clearTimeout(timer.current)
    if (!trigger.current) return
    const bounds = trigger.current.getBoundingClientRect()
    const width = Math.min(340, window.innerWidth - 24)
    const below = window.innerHeight - bounds.bottom
    setPosition({ left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)), width,
      ...(below >= 230 ? { top: bounds.bottom + 8, maxHeight: below - 20 } : { bottom: window.innerHeight - bounds.top + 8, maxHeight: Math.max(130, bounds.top - 20) }) })
  }
  function leave() {
    if (!pinned.current) timer.current = setTimeout(() => setPosition(null), 120)
  }
  const open = !!position
  useEffect(() => {
    if (!open) return undefined
    const outside = event => { if (!trigger.current?.contains(event.target) && !panel.current?.contains(event.target)) close() }
    const escape = event => { if (event.key === 'Escape') close() }
    const move = event => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return
      const bounds = trigger.current?.getBoundingClientRect()
      if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) close()
      else show()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    window.addEventListener('resize', move)
    window.addEventListener('scroll', move, true)
    return () => {
      document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape)
      window.removeEventListener('resize', move); window.removeEventListener('scroll', move, true)
    }
  }, [open])
  useEffect(() => () => clearTimeout(timer.current), [])
  return <>
    <button ref={trigger} type="button" className={`effective-training-badge effective-training-${state.status}`} data-training-status={state.status}
      aria-expanded={open} aria-describedby={open ? id : undefined}
      onMouseEnter={show} onMouseLeave={leave} onFocus={show} onBlur={close}
      onClick={() => { if (pinned.current) close(); else { pinned.current = true; show() } }}>
      <StateIcon status={state.status} /><span>{state.label}</span>
    </button>
    {open && createPortal(<div ref={panel} id={id} role="tooltip" className="effective-training-details" style={position}
      onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={leave}>
      <strong>{state.label}</strong><p>{state.explanation}</p>
      {state.locks.map((lock, index) => <dl key={lock.TrainingLockID || index}>
        {state.locks.length > 1 && <div><dt>Lệnh áp dụng</dt><dd>#{lock.TrainingLockID || index + 1}</dd></div>}
        {lock.Reason && <div><dt>Lý do</dt><dd>{lock.Reason}</dd></div>}
        {lock.CreatedByName && <div><dt>Bác sĩ ban hành</dt><dd>{lock.CreatedByName}</dd></div>}
        {lock.LockStartDate && <div><dt>Ngày áp dụng</dt><dd>{vetDateTime(lock.LockStartDate)}</dd></div>}
        {lock.LockLevel === 'Restricted' && lock.MaxIntensity != null && <div><dt>Tải tập tối đa</dt><dd>{lock.MaxIntensity}</dd></div>}
        {lock.Details && <div><dt>Ghi chú</dt><dd>{lock.Details}</dd></div>}
      </dl>)}
      {state.record && !state.locks.length && <dl>{state.record.vetName && <div><dt>Bác sĩ kết luận</dt><dd>{state.record.vetName}</dd></div>}<div><dt>Ngày khám đã chốt</dt><dd>{vetDateTime(state.record.examDate)}</dd></div></dl>}
    </div>, document.body)}
  </>
}
