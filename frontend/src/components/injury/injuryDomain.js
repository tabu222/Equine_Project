export const injuryStatuses = {
  treating: 'Đang điều trị', monitoring: 'Cần theo dõi', recovered: 'Đã hồi phục',
}
export const injurySeverities = { mild: 'Nhẹ', moderate: 'Trung bình', severe: 'Nặng' }

export function validModelPoint(point) {
  return !!point && ['x', 'y', 'z'].every(axis => typeof point[axis] === 'number' && Number.isFinite(point[axis]))
}

// A camera preset is a viewing aid, never an anatomical diagnosis or a region label.
export function viewForPoint(point) {
  if (Math.abs(point.x) > Math.abs(point.z)) return point.x >= 0 ? 'front' : 'back'
  return point.z >= 0 ? 'left' : 'right'
}

export function isSurfaceClick(start, end) {
  return !!start && start.pointerId === end.pointerId && !start.dragged &&
    Math.hypot(end.clientX - start.clientX, end.clientY - start.clientY) <= 5
}

export function trainingRestriction({ loading, error, rows }, latest, approved) {
  if (!approved) return { tone: 'neutral', title: 'CHƯA TIẾP NHẬN', message: 'Điều kiện tập được ghi trong kết luận khám. Lệnh khóa áp dụng sau khi tiếp nhận.' }
  if (loading) return { tone: 'neutral', title: 'ĐANG TẢI ĐIỀU KIỆN TẬP', message: 'Đang đối chiếu lệnh khóa huấn luyện.' }
  if (error) return { tone: 'neutral', title: 'CHƯA XÁC ĐỊNH ĐIỀU KIỆN TẬP', message: 'Không tải được lệnh khóa. Vui lòng thử lại trước khi đối chiếu điều kiện tập.' }
  const active = rows.filter(row => row.LockStatus === 'Active')
  const lock = active.find(row => row.LockLevel === 'Full') || active[0]
  if (lock) return {
    tone: lock.LockLevel === 'Full' ? 'danger' : 'warning',
    title: lock.LockLevel === 'Full' ? 'KHÓA HUẤN LUYỆN' : 'GIỚI HẠN TẢI TẬP',
    message: lock.LockLevel === 'Full'
      ? 'Ngựa hiện không được phép tham gia huấn luyện theo chỉ định của bác sĩ thú y.'
      : 'Ngựa chỉ được huấn luyện trong giới hạn của lệnh đang hoạt động.',
    lock,
  }
  if (latest?.trainingEligibility === 'Not Eligible') return { tone: 'danger', title: 'KHÔNG ĐỦ ĐIỀU KIỆN TẬP', message: 'Bệnh án đã chốt gần nhất kết luận không được tập. Chưa ghi nhận lệnh khóa đang hoạt động.' }
  if (latest?.trainingEligibility === 'Restricted') return { tone: 'warning', title: 'GIỚI HẠN TẢI TẬP', message: latest.restrictionNote || 'Bệnh án đã chốt gần nhất kết luận hạn chế tập. Chưa ghi nhận lệnh khóa đang hoạt động.' }
  if (latest?.trainingEligibility === 'Eligible') return { tone: 'success', title: 'ĐỦ ĐIỀU KIỆN TẬP', message: 'Theo kết luận đã chốt gần nhất; không ghi nhận lệnh khóa đang hoạt động.' }
  return { tone: 'neutral', title: 'CHƯA CÓ KẾT LUẬN ĐIỀU KIỆN TẬP', message: 'Chưa ghi nhận lệnh khóa đang hoạt động. Cần kết luận của bác sĩ để đánh giá điều kiện tập.' }
}
