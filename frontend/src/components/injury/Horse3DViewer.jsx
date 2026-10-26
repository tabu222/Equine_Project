import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import InjuryIcon from './InjuryIcon.jsx'
import InjuryMarker from './InjuryMarker.jsx'
import { injuryStatuses } from './injuryDomain.js'

const presets = { left: 'Góc trái', right: 'Góc phải', front: 'Chính diện', back: 'Phía sau' }

export default function Horse3DViewer({ asset, markers, selectedId, draft, onPick, onSelect, viewRequest }) {
  const host = useRef(null), engine = useRef(null), elements = useRef(new Map()), props = useRef(null)
  const [state, setState] = useState(asset ? 'loading' : 'waiting')
  const [activeView, setActiveView] = useState('reset')
  const [attempt, setAttempt] = useState(0)
  const displayed = draft && !draft.id ? [...markers, { ...draft, id: 'draft' }]
    : markers.map(marker => marker.id === draft?.id ? draft : marker)
  useLayoutEffect(() => {
    props.current = { onPick, markers: displayed }
    engine.current?.render()
  })

  useEffect(() => {
    if (!asset) return undefined
    let active = true
    import('./horseScene.js').then(({ createHorseScene }) => {
      if (!active) return
      engine.current = createHorseScene({
        host: host.current, url: asset.url,
        getMarkers: () => props.current.markers.map(marker => ({ marker, element: elements.current.get(marker.id) })),
        onPick: (point, viewHint) => props.current.onPick(point, viewHint),
        onState: value => { if (active) setState(value) },
        onOrbit: () => setActiveView('custom'),
        onFrame: preset => setActiveView(preset),
      })
    }).catch(() => { if (active) setState('error') })
    return () => { active = false; engine.current?.dispose(); engine.current = null }
  }, [asset, attempt])

  useEffect(() => {
    if (viewRequest && state === 'ready') engine.current?.frame(viewRequest.preset)
  }, [viewRequest, state])

  function view(preset) { engine.current?.frame(preset); setActiveView(preset) }
  return <div className="injury-viewer">
    <div className="injury-view-toolbar" role="group" aria-label="Góc quan sát mô hình"><div>{Object.entries(presets).map(([key, label]) => <button key={key} type="button" disabled={state !== 'ready'} onClick={() => view(key)} aria-pressed={activeView === key}>{label}</button>)}</div><button className="injury-reset" type="button" disabled={state !== 'ready'} onClick={() => view('reset')} aria-label="Đặt lại góc nhìn" title="Đặt lại góc nhìn"><InjuryIcon kind="reset" /><span>Đặt lại</span></button></div>
    <div className="injury-canvas" ref={host}>
      {state === 'ready' && <div className="injury-marker-layer">{displayed.map((marker, index) => <InjuryMarker key={marker.id} marker={marker} index={marker.id === 'draft' ? '+' : index + 1} selected={marker.id === (draft && !draft.id ? 'draft' : selectedId)} onSelect={marker.id === 'draft' ? () => {} : onSelect} elementRef={element => { if (element) elements.current.set(marker.id, element); else elements.current.delete(marker.id) }} />)}</div>}
      {state !== 'ready' && <div className="injury-asset-state" role={state === 'error' ? 'alert' : 'status'}>
        <span className={`injury-asset-icon${state === 'loading' ? ' is-loading' : ''}`}><InjuryIcon kind="cube" /></span>
        <span className="injury-eyebrow">KHÔNG GIAN QUAN SÁT 3D</span>
        <h4>{state === 'loading' ? 'Đang tải mô hình ngựa…' : state === 'error' ? 'Chưa thể hiển thị mô hình' : 'Đang chờ mô hình ngựa 3D'}</h4>
        <p>{state === 'loading' ? 'Mô hình đang được chuẩn bị để quan sát và đánh dấu.' : state === 'error' ? 'Không tải được mô hình hoặc trình duyệt chưa hỗ trợ đồ họa 3D. Vui lòng thử lại.' : 'Chưa có tệp mô hình cho khu vực này. Bạn vẫn có thể xem vị trí đã ghi trong bệnh án bên dưới.'}</p>
        {state === 'error' ? <button type="button" className="button button-secondary" onClick={() => { setState('loading'); setAttempt(value => value + 1) }}>Thử tải lại mô hình</button> : state === 'waiting' && <span className="injury-asset-tag">Mô hình nguyên con · Định dạng GLB / GLTF</span>}
      </div>}
      <span className="injury-view-caption">{state === 'ready' ? (presets[activeView] || (activeView === 'custom' ? 'Góc tự do' : 'Góc tổng thể')) : 'Mô hình bề mặt'}<span>360°</span></span>
    </div>
    <div className="injury-view-footer"><div className="injury-legend" aria-label="Màu trạng thái chấn thương">{Object.entries(injuryStatuses).map(([key, label]) => <span className={`injury-status status-${key}`} key={key}><i />{label}</span>)}</div><p>Kéo để xoay • Cuộn để phóng to • Chọn vị trí trên ngựa để đánh dấu chấn thương.</p></div>
  </div>
}
