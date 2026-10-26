import { latestSigned } from '../../pages/vet/vetDomain.js'

export const effectiveTrainingLabels = {
  full: 'Khóa toàn bộ', restricted: 'Giới hạn tập', allowed: 'Được phép tập', unknown: 'Chưa xác định',
}

const result = (status, explanation, details = {}) => ({ status, label: effectiveTrainingLabels[status], explanation, locks: [], ...details })
const unknown = explanation => result('unknown', explanation)

function clinicalTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return NaN
  return Date.parse(/(Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}+07:00`)
}

// This is a read-only display projection. It never updates a clinical record or releases a lock.
// Active/Released are the existing backend states. LockEndDate is only a planned end date.
export function resolveEffectiveTraining({ horse, records, locks, historyLoading = false, historyError = false, locksLoading = false, locksError = false }) {
  if (!horse?.id) return unknown('Chưa xác nhận được hồ sơ ngựa.')
  if (locksLoading) return unknown('Đang đối chiếu các lệnh khóa và giới hạn tập.')
  if (locksError || !Array.isArray(locks)) return unknown('Chưa tải đầy đủ dữ liệu khóa tập. Vui lòng tải lại trước khi xếp tập.')

  const ownLocks = locks.filter(lock => lock && String(lock.HorseID) === String(horse.id))
  const active = ownLocks.filter(lock => lock.LockStatus === 'Active')
  const full = active.filter(lock => lock.LockLevel === 'Full' && !lock.ReleasedAt)
  // A confirmed full lock stays decisive even while clinical history is unavailable.
  if (full.length) return result('full', 'Ngựa đang có lệnh khóa toàn bộ. Chỉ được tập lại sau quy trình mở khóa của bác sĩ.', { locks: full })
  if (locks.some(lock => !lock || lock.HorseID == null) || ownLocks.some(lock => !['Active', 'Released'].includes(lock.LockStatus)) ||
    active.some(lock => !['Full', 'Restricted'].includes(lock.LockLevel) || lock.ReleasedAt)) {
    return unknown('Dữ liệu lệnh khóa chưa rõ hoặc chưa đồng bộ. Cần đối chiếu lại trước khi xếp tập.')
  }
  if (horse.profileStatus !== 'APPROVED') return unknown('Hồ sơ ngựa chưa được phê duyệt tiếp nhận để tham gia huấn luyện.')

  const restricted = active.filter(lock => lock.LockLevel === 'Restricted')
  const historyReady = !historyLoading && !historyError && Array.isArray(records)
  const ownRecords = historyReady ? records.filter(record => record && String(record.horseId) === String(horse.id)) : []
  const signed = ownRecords.filter(record => record.recordStatus === 'Signed')
  const malformed = signed.some(record => !Number.isFinite(clinicalTime(record.examDate))) ||
    ownRecords.some(record => !['Signed', 'Draft'].includes(record.recordStatus))
  const record = malformed ? undefined : latestSigned(ownRecords, String(horse.id))

  if (restricted.length) {
    if (restricted.some(lock => lock.MaxIntensity == null || lock.MaxIntensity === '' || !Number.isFinite(Number(lock.MaxIntensity)) || Number(lock.MaxIntensity) < 0)) {
      return result('unknown', 'Lệnh giới hạn tập chưa có tải tối đa hợp lệ. Cần bác sĩ xác nhận trước khi xếp tập.', { locks: restricted })
    }
    if (record?.trainingEligibility === 'Not Eligible') return result('unknown', 'Bệnh án kết luận không được tập nhưng lệnh hiện tại chỉ giới hạn tập. Cần bác sĩ đối chiếu dữ liệu.', { locks: restricted, record })
    return result('restricted', 'Ngựa đang có lệnh giới hạn tập. Chỉ xếp bài tập sau khi đối chiếu kết luận và tải tối đa được chỉ định.', { locks: restricted })
  }
  if (!historyReady) return unknown(historyLoading ? 'Đang tải kết luận khám đã chốt.' : 'Chưa tải đầy đủ bệnh án. Vui lòng tải lại trước khi xếp tập.')
  if (malformed || !record) return unknown('Chưa có kết luận khám đã chốt hợp lệ để xác định điều kiện tập.')
  if (record.trainingEligibility === 'Not Eligible') return result('unknown', 'Bệnh án đã chốt kết luận không được tập nhưng chưa ghi nhận lệnh khóa toàn bộ. Cần bác sĩ đối chiếu trước khi xếp tập.', { record })
  if (!['Eligible', 'Restricted'].includes(record.trainingEligibility)) return unknown('Bệnh án gần nhất chưa có kết luận điều kiện tập hợp lệ.')

  // A release alone cannot make an older pre-lock conclusion into a new clearance.
  const examTime = clinicalTime(record.examDate)
  if (ownLocks.some(lock => lock.LockStatus === 'Released' && lock.LockStartDate &&
    (!Number.isFinite(clinicalTime(lock.LockStartDate)) || clinicalTime(lock.LockStartDate) > examTime))) {
    return unknown('Chưa đối chiếu được kết luận tái khám sau lần khóa tập. Vui lòng tải lại hoặc kiểm tra hồ sơ y tế.')
  }
  if (record.trainingEligibility === 'Restricted') return result('restricted', record.restrictionNote || 'Bệnh án đã chốt gần nhất chỉ định giới hạn tập. Cần đối chiếu giới hạn cụ thể trước khi xếp bài tập.', { record })
  return result('allowed', 'Hồ sơ đã được tiếp nhận, bệnh án đã chốt cho phép tập và không có lệnh khóa hoặc giới hạn tập đang hoạt động.', { record })
}

export function matchesEffectiveTraining(state, filter) {
  if (!filter) return true
  // Keep previously shared URLs useful while displaying the new effective state labels.
  const aliases = { Eligible: 'allowed', Restricted: 'restricted', 'Not Eligible': 'full' }
  if (filter === 'limited') return ['full', 'restricted'].includes(state.status)
  return state.status === (aliases[filter] || filter)
}
