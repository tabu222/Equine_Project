import { useResource } from '../../components/common/useOperations.js'
import { DataState } from '../../components/common/OperationUI.jsx'
import { vetDateTime } from '../vet/vetDomain.js'

const sessionLabels = { Assigned: 'Đã phân công', 'In Progress': 'Đang diễn ra', Completed: 'Đã hoàn thành', Cancelled: 'Đã hủy' }
export default function ManagerReports() {
  const data = useResource('/dashboard')
  const t = data.value?.Training
  return <main className="page-content manager-workspace"><header className="page-heading"><div><h1>Báo cáo câu lạc bộ</h1><p>Số liệu tổng hợp từ hoạt động được ghi nhận trong hệ thống.</p></div><button className="button button-secondary" onClick={data.reload} disabled={data.loading}>Làm mới</button></header>
    <DataState data={data}>{data.value && <><section className="panel"><h2>Tổng quan</h2><p>Cập nhật: {vetDateTime(data.value.GeneratedAt)}</p><dl className="vet-details"><div><dt>Ngựa chưa lưu trữ</dt><dd>{data.value.Horses.Total}</dd></div><div><dt>Tổng số ô chuồng</dt><dd>{data.value.Horses.Stalls.Total}</dd></div><div><dt>Tổng tài khoản (gồm chủ ngựa)</dt><dd>{data.value.Users.Total}</dd></div></dl></section>
      <section className="panel"><h2>Huấn luyện</h2>{t ? <><p>Ngựa đang được phân công huấn luyện viên: {t.ActiveAssignments}</p><p>Điểm kết quả trung bình trong 30 ngày gần nhất: {t.AvgPerformanceScore30Days ?? 'Chưa có kết quả'}</p><p>Buổi tập đã hoàn thành, chưa có đánh giá: {t.SessionsAwaitingReview}</p>{[['Hôm nay', t.SessionsToday], ['Tuần hiện tại', t.SessionsThisWeek], ['30 ngày gần nhất', t.SessionsLast30Days]].map(([title, counts]) => <div key={title}><h3>{title}</h3>{Object.keys(counts).length ? <dl className="vet-details">{Object.entries(counts).map(([status, count]) => <div key={status}><dt>{sessionLabels[status] || 'Trạng thái khác'}</dt><dd>{count}</dd></div>)}</dl> : <p>Chưa có buổi tập trong kỳ.</p>}</div>)}</> : <p>Chức năng báo cáo huấn luyện hiện chưa khả dụng.</p>}</section></>}</DataState>
    <section className="panel"><h2>Chi phí và doanh thu giải đấu</h2><p>Chưa có dữ liệu báo cáo chi phí và doanh thu.</p></section>
  </main>
}
