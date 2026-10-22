import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet, apiPatch, apiPost, apiPut } from '../../api/apiClient.ts'
import { getCompleteVetList } from '../../api/vetApi.ts'

export function useResource(path, list = false) {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState({ path: null, loading: true, value: null, error: '' })
  const reload = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: '' }))
    setVersion(v => v + 1)
  }, [])
  useEffect(() => {
    if (!path) return undefined
    let active = true
    const request = list ? getCompleteVetList(path) : apiGet(path)
    request.then(value => { if (active) setState({ path, loading: false, value, error: '' }) })
      .catch(error => { if (active) setState({ path, loading: false, value: null,
        error: error.status === 403 ? 'Bạn không có quyền xem dữ liệu này.' : 'Không thể tải dữ liệu. Vui lòng thử lại.' }) })
    return () => { active = false }
  }, [path, list, version])
  return { ...(state.path === path ? state : { loading: true, value: null, error: '' }), reload }
}

export function useAction(onSaved) {
  const gate = useRef(false)
  const [state, setState] = useState({ busy: false, error: '', notice: '', fields: {} })
  async function run(path, body = {}, method = 'POST') {
    if (gate.current) return undefined
    gate.current = true
    setState({ busy: true, error: '', notice: '', fields: {} })
    try {
      const result = await ({ POST: apiPost, PATCH: apiPatch, PUT: apiPut })[method](path, body)
      setState({ busy: false, error: '', notice: 'Đã lưu thay đổi.', fields: {} })
      onSaved?.(result)
      return result
    } catch (error) {
      const business = { FOLLOW_UP_EXAM_REQUIRED: 'Cần có phiếu tái khám đã chốt, kết luận cho phép tập sau thời điểm khóa.',
        ROLE_IN_USE: 'Tài khoản còn công việc đang xử lý. Hãy bàn giao công việc trước.',
        LAST_MANAGER: 'Câu lạc bộ cần có ít nhất một quản lý đang hoạt động.',
        SELF_ACTION: 'Không thể thực hiện thao tác này với tài khoản của bạn.',
        INSUFFICIENT_STOCK: 'Không đủ vật tư trong kho. Hãy kiểm tra tồn kho hoặc giảm số lượng cấp.',
        INVALID_STATUS: 'Trạng thái đã thay đổi. Hãy làm mới dữ liệu trước khi tiếp tục.',
        RECORD_SIGNED: 'Phiếu đã chốt. Vui lòng tải lại để xem thông tin mới nhất.',
        NOT_RECORD_OWNER: 'Chỉ bác sĩ lập phiếu mới có thể sửa phiếu nháp.',
        OWNER_ROLE_EXCLUSIVE: 'Vai trò chủ ngựa phải tách riêng khỏi nhân sự nội bộ.' }
      setState({ busy: false, notice: '', fields: error.fieldErrors || {},
        error: business[error.code] || (error.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.'
          : error.status === 400 ? 'Thông tin chưa hợp lệ. Vui lòng kiểm tra biểu mẫu.'
            : 'Chưa thể xác nhận thao tác. Hãy làm mới dữ liệu trước khi thử lại.') })
      return undefined
    } finally { gate.current = false }
  }
  return { ...state, run }
}
