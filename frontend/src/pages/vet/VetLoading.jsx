export default function VetLoading({ label = 'Đang tải hồ sơ…' }) {
  return <div className="vet-skeleton" role="status" aria-label={label}><span className="sr-only">{label}</span><i /><i /><i /></div>
}
