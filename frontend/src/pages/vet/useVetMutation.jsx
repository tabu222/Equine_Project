import { useRef, useState } from 'react'
import { saveVetResource } from '../../api/vetApi.ts'
import { vetError } from './vetDomain.js'

export function useVetMutation(onSaved) {
  const gate = useRef(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const [fields, setFields] = useState({})
  async function run(path, body, update = false) {
    if (gate.current || uncertain) return false
    gate.current = true; setBusy(true); setNotice(''); setError(''); setFields({})
    try {
      const result = await saveVetResource(path, body, update)
      const cancelled = result.CancelledSessionIDs
      setNotice(`Đã lưu.${cancelled?.length ? ` Đã hủy ${cancelled.length} buổi tập bị ảnh hưởng (mã: ${cancelled.join(', ')}).` : ''}`)
      onSaved?.()
      return true
    } catch (failure) {
      setFields(failure?.fieldErrors || {})
      if (!failure?.status || failure.status >= 500) setUncertain(true)
      if (failure?.status === 409) onSaved?.()
      const messages = { FOLLOW_UP_EXAM_REQUIRED: 'Cần tái khám sau khi khóa và chốt kết luận cho phép tập trước khi mở khóa.', LOCK_EXISTS: 'Ngựa đã có khóa tập. Hãy tải lại để xem khóa hiện hành.', INVALID_STATUS: 'Trạng thái đã thay đổi; hãy tải lại trước khi tiếp tục.', NOT_RECORD_OWNER: 'Phiếu này đang do bác sĩ khác xử lý.', RECORD_SIGNED: 'Phiếu đã chốt. Hãy dùng đính chính hoặc lập lần khám mới.' }
      setError(messages[failure?.code] || vetError(failure, 'Chưa thể xác nhận thao tác. Hãy tải lại và kiểm tra dữ liệu trước khi thử lại.'))
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus())
      return false
    } finally { gate.current = false; setBusy(false) }
  }
  return { run, fields, error, notice, busy: busy || uncertain, feedback: <>{error && <p role="alert" className="error-message">{error}</p>}{notice && <p role="status" className="success-message">{notice}</p>}{uncertain && <button type="button" className="button button-secondary" onClick={() => window.location.reload()}>Tải lại để đối chiếu kết quả</button>}</> }
}

