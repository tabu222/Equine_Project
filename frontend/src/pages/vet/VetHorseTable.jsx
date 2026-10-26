import { Link } from 'react-router-dom'
import HorseAvatar from '../../components/horse/HorseAvatar.jsx'
import { formatHorseCode } from '../../components/horse/horseDisplay.js'
import EffectiveTrainingBadge from '../../components/horse/EffectiveTrainingBadge.jsx'
import { healthLabels } from './vetDomain.js'
import './VetHorseTable.css'

export default function VetHorseTable({ horses, trainingStates, intakeResults = false }) {
  return <>
    <p className="vet-herd-scroll-hint">Cuộn ngang để xem đầy đủ thông tin và thao tác.</p>
    <div className="table-wrapper vet-herd-table-scroll" role="region" aria-label="Danh sách ngựa và trạng thái huấn luyện hiện tại" tabIndex={0}>
      <table className={`horse-table vet-herd-table${intakeResults ? ' is-intake' : ''}`}>
        <caption className="vet-herd-caption">Tình trạng sức khỏe và trạng thái huấn luyện hiện tại của từng ngựa</caption>
        <colgroup><col className="vet-herd-identity-column" /><col className="vet-herd-health-column" /><col className="vet-herd-training-column" /><col className="vet-herd-stall-column" />{intakeResults && <col className="vet-herd-intake-column" />}<col className="vet-herd-action-column" /></colgroup>
        <thead><tr><th scope="col">Ngựa</th><th scope="col">Tình trạng sức khỏe</th><th scope="col">Trạng thái huấn luyện</th><th scope="col">Ô chuồng</th>{intakeResults && <th scope="col">Trạng thái tiếp nhận</th>}<th scope="col"><span className="vet-herd-sr-only">Thao tác</span></th></tr></thead>
        <tbody>{horses.map(horse => <tr key={horse.id} data-horse-id={horse.id}>
          <th scope="row"><Link className="vet-herd-identity" to={`/vet/horses/${horse.id}`}><HorseAvatar horseId={horse.id} name={horse.name} size="small" /><span><strong>{horse.name}</strong><span className="vet-herd-code">{formatHorseCode(horse.code)}</span><span className="vet-herd-chip" title={`Microchip: ${horse.microchipNumber || 'Chưa cập nhật'}`}>Microchip: {horse.microchipNumber || 'Chưa cập nhật'}</span></span></Link></th>
          <td><span className={`vet-pill health-${horse.healthStatus}`}><span aria-hidden="true">●</span> {healthLabels[horse.healthStatus] || 'Chưa đánh giá'}</span></td>
          <td><EffectiveTrainingBadge state={trainingStates.get(horse.id)} /></td>
          <td><span className={`vet-herd-stall${horse.currentStall?.StallNumber ? '' : ' is-empty'}`}>{horse.currentStall?.StallNumber || 'Chưa xếp chuồng'}</span></td>
          {intakeResults && <td><span className="vet-herd-intake">{horse.profileStatus === 'APPROVED' ? 'Đã tiếp nhận' : 'Chờ quản lý xử lý'}</span></td>}
          <td><Link className="vet-herd-record-button" to={intakeResults ? `/vet/horses/${horse.id}/examination${horse.profileStatus === 'APPROVED' ? '?intake=1' : ''}` : `/vet/horses/${horse.id}`} aria-label={`${intakeResults ? 'Xem kết quả khám' : 'Hồ sơ y tế'} của ${horse.name}`}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 3h7l4 4v10H5V3ZM12 3v4h4M8 11h5M8 14h3" /></svg><span>{intakeResults ? 'Xem kết quả' : 'Hồ sơ y tế'}</span></Link></td>
        </tr>)}</tbody>
      </table>
    </div>
  </>
}
