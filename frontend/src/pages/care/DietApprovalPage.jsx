// Vet: duyệt / trả về khẩu phần Head Trainer gửi lên; điều chỉnh khẩu phần đang áp dụng (vd ngựa đang điều trị).
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adjustDietPlan, approveDietPlan, getDietContext, getDietPlans, rejectDietPlan } from '../../api/careApi.ts'
import { CarePage, FieldError, Loading, Notice } from './careShared.jsx'
import { fmtDate, useLoad, useSubmit } from './careUtils.js'
import { DietContextPanel, DietPlanCard } from './dietShared.jsx'
import DietPlanForm from './DietPlanForm.jsx'

const TABS = [
  ['pending', 'Chờ duyệt', ['Pending']],
  ['active', 'Đang áp dụng', ['Approved', 'Adjusted']],
  ['rejected', 'Đã trả về', ['Rejected']],
]

function Decision({ plan, onDone }) {
  const [note, setNote] = useState('')
  const action = useSubmit()
  async function decide(kind) {
    if (kind === 'reject' && !note.trim()) {
      action.clear()
      return action.run(() => Promise.reject(Object.assign(new Error('Cần ghi lý do trả về để Head Trainer sửa.'), { status: 400 })))
    }
    const ok = await action.run(() => (kind === 'approve' ? approveDietPlan(plan.DietPlanID, note.trim())
      : rejectDietPlan(plan.DietPlanID, note.trim())), kind === 'approve' ? 'Đã duyệt khẩu phần.' : 'Đã trả về cho Head Trainer.')
    if (ok) onDone(kind === 'approve' ? `Đã duyệt khẩu phần của ${plan.HorseName}. Hệ thống sẽ tự giao việc cho ăn cho Groom.`
      : `Đã trả khẩu phần của ${plan.HorseName} về cho Head Trainer.`)
    return ok
  }
  return <div className="care-decision">
    <label className="form-field"><span>Ghi chú của Vet (bắt buộc khi trả về)</span>
      <textarea rows={2} maxLength={1500} value={note} onChange={e => setNote(e.target.value)}
        placeholder="vd Giảm cám viên còn 1 kg vì ngựa đang tăng cân" />
      <FieldError fields={action.fields} name="VetNote" /></label>
    <Notice state={{ ...action, notice: '' }} />
    <div className="care-actions">
      <button className="button" type="button" disabled={action.busy} onClick={() => decide('approve')}>Duyệt khẩu phần</button>
      <button className="button button-secondary" type="button" disabled={action.busy} onClick={() => decide('reject')}>Trả về</button>
    </div>
  </div>
}

export default function DietApprovalPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'pending'
  const selectedId = params.get('DietPlanID') || ''
  const [message, setMessage] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const plans = useLoad(async () => {
    const statuses = TABS.find(t => t[0] === tab)?.[2] || ['Pending']
    const lists = await Promise.all(statuses.map(Status => getDietPlans({ Status })))
    return lists.flat().sort((a, b) => String(b.CreatedAt).localeCompare(String(a.CreatedAt)))
  }, [tab])
  const selected = useMemo(() => (plans.data || []).find(p => String(p.DietPlanID) === selectedId)
    || (plans.data || [])[0], [plans.data, selectedId])
  const context = useLoad(() => (selected ? getDietContext(selected.HorseID) : Promise.resolve(null)), [selected?.HorseID])

  function go(next) {
    setAdjusting(false)
    setParams({ tab, ...next })
  }
  function done(text, keepId) {
    setMessage(text); setAdjusting(false); setParams(keepId ? { tab, DietPlanID: String(keepId) } : { tab }); plans.reload()
  }

  return <CarePage crumb="Duyệt khẩu phần" eyebrow="BÁC SĨ THÚ Y" title="Duyệt khẩu phần ăn"
    description="Head Trainer lập khẩu phần theo giai đoạn tập; Vet kiểm tra theo sức khỏe ngựa rồi duyệt, trả về kèm góp ý, hoặc điều chỉnh khẩu phần đang áp dụng.">
    <div className="care-tabs" role="tablist">
      {TABS.map(([key, text]) => <button key={key} type="button" role="tab" aria-selected={tab === key}
        className={tab === key ? 'is-selected' : ''} onClick={() => { setMessage(''); setAdjusting(false); setParams({ tab: key }) }}>{text}</button>)}
    </div>
    {message && <div className="success-message" role="status">{message}</div>}
    <Loading state={plans} isEmpty={!plans.data?.length}
      empty={tab === 'pending' ? ['Không có khẩu phần chờ duyệt', 'Khi Head Trainer gửi khẩu phần, bạn sẽ thấy ở đây và trong thông báo.'] : ['Chưa có khẩu phần nào']}>
      <div className="care-split">
        <aside className="panel care-horse-list" aria-label="Danh sách khẩu phần">
          <ul>{(plans.data || []).map(plan => <li key={plan.DietPlanID}>
            <button type="button" className={plan.DietPlanID === selected?.DietPlanID ? 'is-selected' : ''}
              onClick={() => go({ DietPlanID: String(plan.DietPlanID) })}>
              <strong>{plan.HorseName}</strong>
              <small>{plan.DietDescription || `Khẩu phần #${plan.DietPlanID}`}</small>
              <small>Từ {fmtDate(plan.StartDate)} · {plan.CreatedByName}</small>
            </button></li>)}</ul>
        </aside>
        {selected && <div className="care-detail">
          <DietPlanCard plan={selected}>
            {selected.Status === 'Pending' && <Decision key={selected.DietPlanID} plan={selected} onDone={done} />}
            {['Approved', 'Adjusted'].includes(selected.Status) && !adjusting && <div className="care-actions">
              <button className="button button-secondary" type="button" onClick={() => setAdjusting(true)}>Điều chỉnh khẩu phần này</button></div>}
          </DietPlanCard>
          {adjusting && <DietPlanForm key={`adjust-${selected.DietPlanID}`} mode="adjust" plan={selected} horseName={selected.HorseName}
            save={body => adjustDietPlan(selected.DietPlanID, body)}
            onSaved={() => done(`Đã điều chỉnh khẩu phần của ${selected.HorseName}. Việc cho ăn của Groom được cập nhật theo.`, selected.DietPlanID)}
            onCancel={() => setAdjusting(false)} />}
          <Loading state={context}><DietContextPanel context={context.data} /></Loading>
        </div>}
      </div>
    </Loading>
  </CarePage>
}
