import { useId, useState } from 'react'
import HorseInjuryDiagram from './HorseInjuryDiagram.jsx'
import { INJURY_LOCATION_LIMIT, injuryRegionOptions, readInjuryLocation, toggleInjuryRegion, writeInjuryLocation } from './injuryLocation.js'
import './HorseInjuryMapping.css'

export default function HorseInjuryRegionPicker({ value = '', onChange, readOnly = false, disabled = false, inputId, error = '' }) {
  const id = useId()
  const [view, setView] = useState('left')
  const [limitError, setLimitError] = useState('')
  const { selected, note } = readInjuryLocation(value)
  const locked = readOnly || disabled
  function update(next) {
    if (locked) return
    if (next.length > INJURY_LOCATION_LIMIT) { setLimitError('Vị trí tối đa 500 ký tự. Hãy rút gọn mô tả trước khi thêm vùng.'); return }
    setLimitError(''); onChange(next)
  }
  function toggle(region, side) { update(toggleInjuryRegion(value, `${region}:${side}`)) }
  return <div className="horse-injury-mapping injury-region-editor">
    <HorseInjuryDiagram view={view} onView={setView} mode="add" canAdd={!locked} onMode={() => {}} markers={[]} filters={{}} draft={null} selectedId={null}
      onPick={() => {}} onSelect={() => {}} onReady={undefined} busy={disabled} regionSelection={selected} onToggleRegion={toggle} />
    <div className="injury-region-controls"><fieldset className="injury-region-options" disabled={locked}>
      <legend>Chọn nhiều vùng · {view === 'left' ? 'bên trái ngựa' : 'bên phải ngựa'}</legend>
      {injuryRegionOptions.filter(option => option.bodySide === view).map(option => <label key={option.id}>
        <input type="checkbox" data-region-option={option.id} checked={selected.includes(option.id)} onChange={() => toggle(option.bodyRegion, option.bodySide)} />{option.label}
      </label>)}
    </fieldset>
    <div className="injury-selected-regions" aria-label="Vị trí chấn thương đã chọn">
      <p aria-live="polite">Đã chọn {selected.length} vùng</p>
      <ul>{selected.map(key => { const option = injuryRegionOptions.find(item => item.id === key); return <li key={key}>
        <span>{option.label}</span>{!readOnly && <button type="button" disabled={disabled} aria-label={`Bỏ chọn ${option.label}`} onClick={() => update(toggleInjuryRegion(value, key))}>×</button>}
      </li> })}</ul>
      {!readOnly && <button type="button" className="button button-secondary injury-clear-regions" disabled={disabled || !selected.length} onClick={() => update(writeInjuryLocation([], note))}>Xóa lựa chọn</button>}
    </div>
    <label className="form-field"><span>Vị trí chấn thương (đồng bộ với vùng chọn)</span>
      <textarea id={inputId || id} name="InjuryLocation" rows={3} maxLength={INJURY_LOCATION_LIMIT} value={value} readOnly={readOnly} disabled={disabled}
        aria-invalid={!!(error || limitError)} aria-describedby={`${id}-help ${id}-error`} onChange={event => update(event.target.value)} />
    </label>
    <p id={`${id}-help`} className="injury-photo-note">{value.length}/500 ký tự. Vùng chọn và mô tả được lưu cùng vị trí trong bệnh án. Mô tả cũ được giữ nguyên; chỉ dòng “Vùng chọn:” có tên vùng và bên đầy đủ mới được tô trên sơ đồ.</p>
    <p id={`${id}-error`} className="injury-field-error" role="alert">{error || limitError}</p></div>
  </div>
}
