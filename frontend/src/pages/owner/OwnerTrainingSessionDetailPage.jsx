import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  getOwnerTrainingSession,
} from '../../api/trainingApi.ts'

const EVALUATION_LABELS = {
  Excellent: 'Xuất sắc',
  Good: 'Tốt',
  Average: 'Trung bình',
  'Needs Improvement':
    'Cần cải thiện',
}

function formatDate(
  value,
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(
      value,
    )
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  ).format(date)
}

function formatDateTime(
  value,
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(
      value,
    )
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}

function formatTime(
  value,
) {
  if (!value) {
    return '—'
  }

  return String(
    value,
  ).slice(
    0,
    5,
  )
}

function show(
  value,
) {
  return value === null ||
    value === undefined ||
    value === ''
    ? '—'
    : value
}

function getErrorMessage(
  error,
  fallback,
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message
  }

  return fallback
}

export default function OwnerTrainingSessionDetailPage() {
  const {
    horseId,
    sessionId,
  } = useParams()

  const [
    session,
    setSession,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    if (!sessionId) {
      return undefined
    }

    let active = true

    getOwnerTrainingSession(
      sessionId,
    )
      .then(
        (data) => {
          if (!active) {
            return
          }

          setSession(
            data,
          )

          setError('')
        },
      )
      .catch(
        (loadError) => {
          if (!active) {
            return
          }

          setError(
            getErrorMessage(
              loadError,
              'Không thể tải kết quả buổi tập.',
            ),
          )
        },
      )
      .finally(() => {
        if (active) {
          setLoading(
            false,
          )
        }
      })

    return () => {
      active = false
    }
  }, [
    sessionId,
  ])

  if (loading) {
    return (
      <main className="page-content owner-training-detail-page">
        <section
          className="panel"
          role="status"
        >
          Đang tải kết quả buổi tập...
        </section>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="page-content owner-training-detail-page">
        <div
          className="alert-banner"
          role="alert"
        >
          {error ||
            'Không tìm thấy kết quả buổi tập.'}
        </div>

        <Link
          className="button"
          to={`/owner/horses/${horseId}/training`}
        >
          Quay lại
        </Link>
      </main>
    )
  }

  return (
    <main className="page-content owner-training-detail-page">
      <div className="breadcrumb">
        <Link to="/owner/horses">
          Ngựa của tôi
        </Link>

        <span>
          /
        </span>

        <Link
          to={`/owner/horses/${horseId}/training`}
        >
          Kết quả huấn luyện
        </Link>

        <span>
          /
        </span>

        <strong>
          Chi tiết buổi tập
        </strong>
      </div>

      <div className="page-heading">
        <div>
          <h1>
            {session.HorseName}
          </h1>

          <p>
            {formatDate(
              session.SessionDate,
            )}
            {' · '}
            {formatTime(
              session.StartTime,
            )}
            {' · '}
            {
              session.TrainingType
            }
          </p>
        </div>

        <Link
          className="button button-secondary"
          to={`/owner/horses/${horseId}/training`}
        >
          Quay lại
        </Link>
      </div>

      {error && (
        <div
          className="alert-banner"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="panel owner-training-detail-section">
        <h2>
          Thông tin buổi tập
        </h2>

        <div className="owner-training-detail-grid">
          <div>
            <span>
              Giai đoạn
            </span>

            <strong>
              {
                session.StageName
              }
            </strong>
          </div>

          <div>
            <span>
              Huấn luyện viên
            </span>

            <strong>
              {
                session.TrainerName
              }
            </strong>
          </div>

          <div>
            <span>
              Work Rider
            </span>

            <strong>
              {
                session.WorkRiderName
              }
            </strong>
          </div>

          <div>
            <span>
              Bài tập
            </span>

            <strong>
              {
                session.TrainingType
              }
            </strong>
          </div>

          <div>
            <span>
              Mặt sân
            </span>

            <strong>
              {show(
                session.Surface,
              )}
            </strong>
          </div>

          <div>
            <span>
              Địa điểm
            </span>

            <strong>
              {show(
                session.Location,
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel owner-training-detail-section">
        <h2>
          Kế hoạch và kết quả
        </h2>

        <div className="owner-training-comparison-grid">
          <article>
            <h3>
              Kế hoạch
            </h3>

            <dl>
              <div>
                <dt>
                  Thời lượng
                </dt>

                <dd>
                  {session.DurationPlannedMinutes ===
                    null ||
                  session.DurationPlannedMinutes ===
                    undefined
                    ? '—'
                    : `${session.DurationPlannedMinutes} phút`}
                </dd>
              </div>

              <div>
                <dt>
                  Quãng đường
                </dt>

                <dd>
                  {session.DistancePlannedKm ===
                    null ||
                  session.DistancePlannedKm ===
                    undefined
                    ? '—'
                    : `${session.DistancePlannedKm} km`}
                </dd>
              </div>

              <div>
                <dt>
                  Tốc độ mục tiêu
                </dt>

                <dd>
                  {session.TargetSpeedKmh ===
                    null ||
                  session.TargetSpeedKmh ===
                    undefined
                    ? '—'
                    : `${session.TargetSpeedKmh} km/h`}
                </dd>
              </div>
            </dl>
          </article>

          <article>
            <h3>
              Kết quả thực tế
            </h3>

            <dl>
              <div>
                <dt>
                  Thời lượng
                </dt>

                <dd>
                  {session.DurationMinutes ===
                    null ||
                  session.DurationMinutes ===
                    undefined
                    ? '—'
                    : `${session.DurationMinutes} phút`}
                </dd>
              </div>

              <div>
                <dt>
                  Quãng đường
                </dt>

                <dd>
                  {session.DistanceKm ===
                    null ||
                  session.DistanceKm ===
                    undefined
                    ? '—'
                    : `${session.DistanceKm} km`}
                </dd>
              </div>

              <div>
                <dt>
                  Điểm hiệu suất
                </dt>

                <dd>
                  {show(
                    session.PerformanceScore,
                  )}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <section className="panel owner-training-detail-section">
        <h2>
          Chỉ số buổi tập
        </h2>

        <div className="owner-training-detail-grid">
          <div>
            <span>
              Tốc độ trung bình
            </span>

            <strong>
              {session.AvgSpeedKmh ===
                null ||
              session.AvgSpeedKmh ===
                undefined
                ? '—'
                : `${session.AvgSpeedKmh} km/h`}
            </strong>
          </div>

          <div>
            <span>
              Tốc độ tối đa
            </span>

            <strong>
              {session.MaxSpeedKmh ===
                null ||
              session.MaxSpeedKmh ===
                undefined
                ? '—'
                : `${session.MaxSpeedKmh} km/h`}
            </strong>
          </div>

          <div>
            <span>
              Nhịp tim trung bình
            </span>

            <strong>
              {show(
                session.AvgHeartRate,
              )}
            </strong>
          </div>

          <div>
            <span>
              Nhịp tim tối đa
            </span>

            <strong>
              {show(
                session.MaxHeartRate,
              )}
            </strong>
          </div>

          <div>
            <span>
              Thời gian hồi phục
            </span>

            <strong>
              {session.RecoveryMinutes ===
                null ||
              session.RecoveryMinutes ===
                undefined
                ? '—'
                : `${session.RecoveryMinutes} phút`}
            </strong>
          </div>

          <div>
            <span>
              Điểm hiệu suất
            </span>

            <strong>
              {show(
                session.PerformanceScore,
              )}
            </strong>
          </div>
        </div>
      </section>

      {(session.RiderObservation ||
        session.VideoUrl) && (
        <section className="panel owner-training-detail-section">
          <h2>
            Ghi nhận buổi tập
          </h2>

          {session.RiderObservation && (
            <div className="owner-training-note">
              <span>
                Nhận xét của Work Rider
              </span>

              <p>
                {
                  session.RiderObservation
                }
              </p>
            </div>
          )}

          {session.VideoUrl && (
            <a
              className="button button-secondary owner-training-video-link"
              href={
                session.VideoUrl
              }
              target="_blank"
              rel="noreferrer"
            >
              Xem video buổi tập
            </a>
          )}
        </section>
      )}

      <section className="panel owner-training-detail-section">
        <h2>
          Đánh giá của huấn luyện viên
        </h2>

        <div className="owner-training-evaluation">
          <div>
            <span>
              Mức đánh giá
            </span>

            <strong>
              {session.Evaluation
                ? EVALUATION_LABELS[
                    session.Evaluation
                  ] ||
                  session.Evaluation
                : '—'}
            </strong>
          </div>

          <div>
            <span>
              Người đánh giá
            </span>

            <strong>
              {show(
                session.ReviewedBy,
              )}
            </strong>
          </div>

          <div>
            <span>
              Thời gian đánh giá
            </span>

            <strong>
              {formatDateTime(
                session.ReviewDate,
              )}
            </strong>
          </div>
        </div>

        {session.TrainerComment && (
          <div className="owner-training-note">
            <span>
              Nhận xét
            </span>

            <p>
              {
                session.TrainerComment
              }
            </p>
          </div>
        )}

        {session.AdjustmentRequired && (
          <div className="owner-training-adjustment">
            <strong>
              Giáo án cần được điều chỉnh
            </strong>

            {session.AdjustmentNote && (
              <p>
                {
                  session.AdjustmentNote
                }
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  )
}