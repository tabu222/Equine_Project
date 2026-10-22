import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTrainingPlans } from '../../api/trainingApi.ts'

const STATUSES = {
  Draft: 'Bản nháp',
  'Pending Approval': 'Chờ duyệt',
  Active: 'Đang áp dụng',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
}

function show(value) {
  return value === null || value === undefined || value === '' ? '—' : value
}

export default function HeadTrainerPlansPage() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')

  async function load(refresh = false) {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      // Không dùng mine=true: Head Trainer cần xem giáo án toàn CLB.
      const result = await getTrainingPlans()
      setPlans(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách giáo án.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let active = true
    getTrainingPlans()
      .then((result) => {
        if (active) setPlans(Array.isArray(result) ? result : [])
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được danh sách giáo án.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLocaleLowerCase('vi')
    return plans.filter((plan) => {
      if (status !== 'all' && plan.Status !== status) return false
      if (!q) return true
      return [plan.TrainingPlanID, plan.HorseName, plan.TrainerName, plan.Goal]
        .some((value) => String(value ?? '').toLocaleLowerCase('vi').includes(q))
    })
  }, [plans, keyword, status])

  return (
    <main className="page-content plan-approval-list-page">
      <div className="breadcrumb">
        <Link to="/training/dashboard">Huấn luyện</Link>
        <span>/</span>
        <strong>Giáo án huấn luyện</strong>
      </div>

      <div className="page-heading plan-approval-page-heading">
        <div>
          <h1>Giáo án huấn luyện</h1>
          <p>Xem giáo án, các giai đoạn và bài tập của ngựa trong câu lạc bộ.</p>
        </div>
        <></>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16 }}>
          <label style={{ flex: '1 1 250px' }}>
            <span style={{ display: 'block', marginBottom: 6 }}>Tìm giáo án</span>
            <input className="form-control" type="search" value={keyword}
              placeholder="Mã giáo án, tên ngựa, huấn luyện viên..."
              onChange={(event) => setKeyword(event.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd9ce', borderRadius: 6 }} />
          </label>
          <label style={{ flex: '0 1 210px' }}>
            <span style={{ display: 'block', marginBottom: 6 }}>Trạng thái</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd9ce', borderRadius: 6 }}>
              <option value="all">Tất cả</option>
              {Object.entries(STATUSES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error && <div className="alert-banner" role="alert">{error}</div>}
      {loading ? (
        <section className="panel" role="status">Đang tải danh sách giáo án...</section>
      ) : (
        <section className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Danh sách giáo án</h2>
            <span>{filtered.length} giáo án</span>
          </div>
          {filtered.length === 0 ? (
            <p>{error ? 'Không thể hiển thị danh sách.' : 'Không có giáo án phù hợp.'}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr>
                  <th style={{ padding: 12 }}>Mã</th>
                  <th style={{ padding: 12 }}>Ngựa</th>
                  <th style={{ padding: 12 }}>Huấn luyện viên</th>
                  <th style={{ padding: 12 }}>Mục tiêu</th>
                  <th style={{ padding: 12 }}>Trạng thái</th>
                  <th style={{ padding: 12 }}>Chi tiết</th>
                </tr></thead>
                <tbody>{filtered.map((plan) => (
                  <tr key={plan.TrainingPlanID} style={{ borderTop: '1px solid #dce5de' }}>
                    <td style={{ padding: 12 }}>#{show(plan.TrainingPlanID)}</td>
                    <td style={{ padding: 12 }}>{show(plan.HorseName)}</td>
                    <td style={{ padding: 12 }}>{show(plan.TrainerName)}</td>
                    <td style={{ padding: 12 }}>{show(plan.Goal)}</td>
                    <td style={{ padding: 12 }}>{STATUSES[plan.Status] || show(plan.Status)}</td>
                    <td style={{ padding: 12 }}>
                      <Link to={`/training/approvals/${plan.TrainingPlanID}`}>Xem giáo án</Link>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
