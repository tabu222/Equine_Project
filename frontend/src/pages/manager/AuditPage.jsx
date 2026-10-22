import { useState } from 'react'
import { useResource } from '../../components/common/useOperations.js'
import { DataState, Field } from '../../components/common/OperationUI.jsx'
import { vetDateTime } from '../vet/vetDomain.js'

export default function AuditPage() {
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const data = useResource(`/audit-logs?Limit=50&Offset=${offset}${query ? `&${query}` : ''}`)
  return <main className="page-content manager-workspace"><header className="page-heading"><h1>Nhật ký hệ thống</h1><button className="button button-secondary" disabled={data.loading} onClick={data.reload}>Làm mới</button></header><section className="panel">
    <form className="vet-toolbar" onSubmit={e => { e.preventDefault(); const p = new URLSearchParams(); new FormData(e.currentTarget).forEach((value, key) => { if (value) p.set(key, value.trim()) }); setOffset(0); setQuery(p.toString()) }}>
      <Field label="Mã người dùng" name="UserID" type="number" min="1" /><Field label="Loại thao tác" name="ActionType" /><Field label="Loại đối tượng" name="EntityName" /><Field label="Mã đối tượng" name="EntityID" type="number" min="1" /><Field label="Từ ngày" name="From" type="date" /><Field label="Đến ngày" name="To" type="date" /><button className="button">Lọc nhật ký</button><button className="button button-secondary" type="reset" onClick={() => { setOffset(0); setQuery('') }}>Xóa bộ lọc</button>
    </form>
    <DataState data={data}>{!data.value?.Items.length ? <p>Không có nhật ký phù hợp.</p> : <><p>{data.value.Total} thao tác phù hợp</p><div className="table-wrapper"><table className="horse-table"><thead><tr><th>Thời điểm</th><th>Người thực hiện</th><th>Thao tác</th><th>Đối tượng</th><th>Chi tiết</th></tr></thead><tbody>{data.value.Items.map(r => <tr key={r.AuditLogID}><td>{vetDateTime(r.ActionTime)}</td><td>{r.UserName || 'Hệ thống'}</td><td>{r.ActionType}</td><td>{r.EntityName} #{r.EntityID}</td><td><details><summary>Xem chi tiết</summary><pre className="manager-audit-detail">{typeof r.Details === 'string' ? r.Details : JSON.stringify(r.Details, null, 2)}</pre></details></td></tr>)}</tbody></table></div><nav className="pagination" aria-label="Phân trang nhật ký"><button className="page-button" disabled={!offset} onClick={() => setOffset(v => Math.max(0, v - 50))}>Trước</button><span>Trang {offset / 50 + 1} / {Math.ceil(data.value.Total / 50)}</span><button className="page-button" disabled={offset + 50 >= data.value.Total} onClick={() => setOffset(v => v + 50)}>Tiếp</button></nav></>}</DataState>
  </section></main>
}
