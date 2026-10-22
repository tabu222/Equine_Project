// Groom / Head Trainer: xem kho, gửi phiếu xin vật tư cho Quản lý duyệt, theo dõi phiếu của mình.
import { useMemo, useState } from 'react'
import { cancelInventoryRequest, createInventoryRequest, getInventoryItems, getMyInventoryRequests } from '../../api/careApi.ts'
import { Badge, CarePage, FieldError, Loading, Notice } from './careShared.jsx'
import { ITEM_STATUS, ITEM_TYPES, REQUEST_STATUS, fmtDateTime, fmtNumber, useLoad, useSubmit } from './careUtils.js'

function RequestForm({ items, lines, setLines, onSaved }) {
  const [reason, setReason] = useState('')
  const action = useSubmit()
  const byId = useMemo(() => new Map(items.map(i => [String(i.InventoryItemID), i])), [items])
  function update(index, key, value) { setLines(lines.map((l, i) => (i === index ? { ...l, [key]: value } : l))) }
  async function submit(event) {
    event.preventDefault()
    const ok = await action.run(() => createInventoryRequest({
      Reason: reason.trim() || null,
      Items: lines.map(l => ({ InventoryItemID: Number(l.InventoryItemID), RequestedQuantity: Number(l.RequestedQuantity), Note: l.Note.trim() || null })),
    }), 'Đã gửi phiếu, chờ Quản lý duyệt.')
    if (ok) { setLines([]); setReason(''); onSaved() }
  }
  return <form className="panel care-form" onSubmit={submit}>
    <h2>Phiếu xin vật tư</h2>
    {!lines.length && <p className="care-muted">Bấm “Thêm vào phiếu” ở danh sách kho bên dưới để chọn vật tư cần xin.</p>}
    {lines.map((line, index) => {
      const item = byId.get(String(line.InventoryItemID))
      return <div className="care-line" key={line.InventoryItemID}>
        <div><strong>{item?.ItemName}</strong><small className="care-cell-sub">Tồn {fmtNumber(item?.Quantity)} {item?.Unit}</small></div>
        <label className="form-field"><span>Số lượng ({item?.Unit})</span>
          <input type="number" min="0.01" step="0.01" required value={line.RequestedQuantity}
            onChange={e => update(index, 'RequestedQuantity', e.target.value)} /></label>
        <label className="form-field"><span>Ghi chú</span>
          <input maxLength={1000} value={line.Note} onChange={e => update(index, 'Note', e.target.value)} placeholder="Không bắt buộc" /></label>
        <button className="button button-secondary" type="button" onClick={() => setLines(lines.filter((_, i) => i !== index))}>Bỏ</button>
      </div>
    })}
    {lines.length > 0 && <>
      <label className="form-field"><span>Lý do xin</span>
        <input maxLength={1500} value={reason} onChange={e => setReason(e.target.value)} placeholder="vd Sắp hết cám viên cho tuần tới" />
        <FieldError fields={action.fields} name="Reason" /></label>
      <FieldError fields={action.fields} name="Items" />
    </>}
    <Notice state={action} />
    {lines.length > 0 && <div className="care-actions">
      <button className="button" type="submit" disabled={action.busy}>{action.busy ? 'Đang gửi…' : `Gửi phiếu (${lines.length} vật tư)`}</button>
    </div>}
  </form>
}

function MyRequest({ request, onChanged }) {
  const action = useSubmit()
  return <article className="care-request">
    <header>
      <div><strong>Phiếu #{request.InventoryRequestID}</strong><small className="care-cell-sub">{fmtDateTime(request.RequestDate)}</small></div>
      <Badge map={REQUEST_STATUS} value={request.Status} />
    </header>
    <ul>{(request.Items || []).map(item => <li key={item.InventoryRequestItemID}>
      {item.ItemName}: xin {fmtNumber(item.RequestedQuantity)} {item.Unit}
      {item.ApprovedQuantity !== null && item.ApprovedQuantity !== undefined && <> · được cấp <b>{fmtNumber(item.ApprovedQuantity)} {item.Unit}</b></>}
    </li>)}</ul>
    {request.Reason && <p className="care-muted">Lý do: {request.Reason}</p>}
    {request.RejectNote && <p className="care-vet-note care-vet-note-danger"><b>Lý do từ chối:</b> {request.RejectNote}</p>}
    {request.ApprovedByName && request.Status !== 'Pending' && <p className="care-task-meta">Xử lý bởi {request.ApprovedByName} lúc {fmtDateTime(request.ApprovedAt)}</p>}
    {request.Status === 'Pending' && <div className="care-actions">
      <button className="button button-secondary" type="button" disabled={action.busy}
        onClick={async () => { if (await action.run(() => cancelInventoryRequest(request.InventoryRequestID), 'Đã hủy phiếu.')) onChanged() }}>
        Hủy phiếu</button></div>}
    {action.error && <div className="alert-banner" role="alert">{action.error}</div>}
  </article>
}

export default function SupplyRequestsPage() {
  const items = useLoad(getInventoryItems, [])
  const requests = useLoad(getMyInventoryRequests, [])
  const [lines, setLines] = useState([])
  const [type, setType] = useState('')
  const usable = (items.data || []).filter(i => i.Status !== 'Inactive' && (!type || i.ItemType === type))
  const chosen = new Set(lines.map(l => String(l.InventoryItemID)))
  const sortedRequests = [...(requests.data || [])].sort((a, b) => String(b.RequestDate).localeCompare(String(a.RequestDate)))

  return <CarePage crumb="Xin vật tư" eyebrow="CHĂM SÓC" title="Xin vật tư, thức ăn"
    description="Xem tồn kho, chọn vật tư cần dùng rồi gửi phiếu. Quản lý câu lạc bộ duyệt và xuất kho.">
    <RequestForm items={items.data || []} lines={lines} setLines={setLines} onSaved={() => { requests.reload(); items.reload() }} />
    <div className="care-split care-split-wide">
      <section className="table-card">
        <div className="care-table-head">
          <h2>Kho vật tư</h2>
          <label className="filter-field"><span>Loại</span>
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="">Tất cả</option>
              {Object.entries(ITEM_TYPES).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select></label>
        </div>
        <Loading state={items} isEmpty={!usable.length} empty={['Kho chưa có vật tư phù hợp']}>
          <div className="table-wrapper">
            <table className="data-table care-table">
              <thead><tr><th>Vật tư</th><th>Loại</th><th>Tồn kho</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>{usable.map(item => <tr key={item.InventoryItemID}>
                <td><strong>{item.ItemName}</strong></td>
                <td>{ITEM_TYPES[item.ItemType] || item.ItemType}</td>
                <td>{fmtNumber(item.Quantity)} {item.Unit}</td>
                <td><Badge map={ITEM_STATUS} value={item.Status} /></td>
                <td className="care-cell-actions">
                  <button className="button button-secondary" type="button" disabled={chosen.has(String(item.InventoryItemID))}
                    onClick={() => setLines([...lines, { InventoryItemID: item.InventoryItemID, RequestedQuantity: '', Note: '' }])}>
                    {chosen.has(String(item.InventoryItemID)) ? 'Đã chọn' : 'Thêm vào phiếu'}</button>
                </td>
              </tr>)}</tbody>
            </table>
          </div>
        </Loading>
      </section>
      <section className="panel">
        <h2>Phiếu của tôi</h2>
        <Loading state={requests} isEmpty={!sortedRequests.length} empty={['Bạn chưa gửi phiếu nào']}>
          <div className="care-request-list">{sortedRequests.map(r => <MyRequest key={r.InventoryRequestID} request={r} onChanged={requests.reload} />)}</div>
        </Loading>
      </section>
    </div>
  </CarePage>
}
