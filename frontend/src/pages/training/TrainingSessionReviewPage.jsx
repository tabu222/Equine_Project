import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  getTrainingSession,
  reviewTrainingSession,
} from '../../api/trainingApi.ts'

const EVALUATION_OPTIONS = [
  {
    value: 'Excellent',
    label: 'Xuất sắc',
  },
  {
    value: 'Good',
    label: 'Tốt',
  },
  {
    value: 'Average',
    label: 'Trung bình',
  },
  {
    value:
      'Needs Improvement',
    label:
      'Cần cải thiện',
  },
]

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
    return String(value)
  }

  return new Intl.DateTimeFormat(
    'vi-VN',
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
    return String(value)
  }

  return new Intl.DateTimeFormat(
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}

function show(
  value,
  fallback = '—',
) {
  return value === null ||
    value === undefined ||
    value === ''
    ? fallback
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

export default function TrainingSessionReviewPage({
  currentUser,
}) {
  const {
    sessionId,
  } = useParams()

  const navigate =
    useNavigate()

  const [
    session,
    setSession,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    busy,
    setBusy,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    evaluation,
    setEvaluation,
  ] = useState('')

  const [
    trainerComment,
    setTrainerComment,
  ] = useState('')

  const [
    adjustmentRequired,
    setAdjustmentRequired,
  ] = useState(false)

  const [
    adjustmentNote,
    setAdjustmentNote,
  ] = useState('')

  useEffect(() => {
    if (!sessionId) {
      return undefined
    }

    let active = true

    getTrainingSession(
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
              'Không thể tải buổi tập.',
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

  async function submitReview(
    event,
  ) {
    event.preventDefault()

    if (!session) {
      return
    }

    if (!evaluation) {
      setError(
        'Vui lòng chọn mức đánh giá.',
      )

      return
    }

    if (
      adjustmentRequired &&
      !adjustmentNote
        .trim()
    ) {
      setError(
        'Vui lòng ghi nội dung cần điều chỉnh.',
      )

      return
    }

    setBusy(
      true,
    )

    setError('')

    try {
      await reviewTrainingSession(
        session
          .TrainingSessionID,
        {
          Evaluation:
            evaluation,

          TrainerComment:
            trainerComment
              .trim() ||
            null,

          AdjustmentRequired:
            adjustmentRequired,

          AdjustmentNote:
            adjustmentRequired
              ? adjustmentNote
                  .trim()
              : null,
        },
      )

      navigate(
        '/training/reviews',
        {
          replace:
            true,
        },
      )
    } catch (
      saveError
    ) {
      setError(
        getErrorMessage(
          saveError,
          'Không thể lưu đánh giá.',
        ),
      )

      window.scrollTo({
        top: 0,
        behavior:
          'smooth',
      })
    } finally {
      setBusy(
        false,
      )
    }
  }

  if (loading) {
    return (
      <main className="page-content training-review-detail-page">
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
      <main className="page-content training-review-detail-page">
        <div
          className="alert-banner"
          role="alert"
        >
          {error ||
            'Không tìm thấy buổi tập.'}
        </div>

        <Link
          className="button"
          to="/training/reviews"
        >
          Quay lại
        </Link>
      </main>
    )
  }

  const isAssignedTrainer =
    String(
      session
        .AssignedTrainerID,
    ) ===
    String(
      currentUser?.id,
    )

  const canReview =
    session.Status ===
      'Completed' &&
    !session.Review &&
    isAssignedTrainer

  return (
    <main className="page-content training-review-detail-page">
      <div className="breadcrumb">
        <Link to="/training/reviews">
          Đánh giá buổi tập
        </Link>

        <span>
          /
        </span>

        <strong>
          {session.HorseName}
        </strong>
      </div>

      <div className="page-heading">
        <div>
          <h1>
            Kết quả buổi tập
          </h1>

          <p>
            {session.HorseName}
            {' · '}
            {formatDate(
              session.SessionDate,
            )}
            {' · '}
            {
              session.TrainingType
            }
          </p>
        </div>

        <Link
          className="button button-secondary"
          to="/training/reviews"
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

      <section className="panel training-review-session-overview">
        <h2>
          Thông tin buổi tập
        </h2>

        <div className="training-review-info-grid">
          <div>
            <span>
              Ngựa
            </span>

            <strong>
              {
                session.HorseName
              }
            </strong>
          </div>

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
              Huấn luyện viên giám sát
            </span>

            <strong>
              {
                session.SupervisingTrainerName
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
              Ngày tập
            </span>

            <strong>
              {formatDate(
                session.SessionDate,
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>
          Kết quả thực tế
        </h2>

        {!session.Result ? (
          <div className="empty-state">
            <h3>
              Chưa có kết quả
            </h3>

            <p>
              Work Rider chưa ghi kết quả
              cho buổi tập này.
            </p>
          </div>
        ) : (
          <>
            <div className="training-review-result-grid">
              <div>
                <span>
                  Thời lượng
                </span>

                <strong>
                  {session.Result
                    .ActualDurationMinutes ===
                    null ||
                  session.Result
                    .ActualDurationMinutes ===
                    undefined
                    ? '—'
                    : `${session.Result.ActualDurationMinutes} phút`}
                </strong>
              </div>

              <div>
                <span>
                  Quãng đường
                </span>

                <strong>
                  {session.Result
                    .ActualDistanceKm ===
                    null ||
                  session.Result
                    .ActualDistanceKm ===
                    undefined
                    ? '—'
                    : `${session.Result.ActualDistanceKm} km`}
                </strong>
              </div>

              <div>
                <span>
                  Tốc độ trung bình
                </span>

                <strong>
                  {session.Result
                    .AvgSpeedKmh ===
                    null ||
                  session.Result
                    .AvgSpeedKmh ===
                    undefined
                    ? '—'
                    : `${session.Result.AvgSpeedKmh} km/h`}
                </strong>
              </div>

              <div>
                <span>
                  Tốc độ tối đa
                </span>

                <strong>
                  {session.Result
                    .MaxSpeedKmh ===
                    null ||
                  session.Result
                    .MaxSpeedKmh ===
                    undefined
                    ? '—'
                    : `${session.Result.MaxSpeedKmh} km/h`}
                </strong>
              </div>

              <div>
                <span>
                  Nhịp tim trung bình
                </span>

                <strong>
                  {show(
                    session.Result
                      .AvgHeartRate,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Nhịp tim tối đa
                </span>

                <strong>
                  {show(
                    session.Result
                      .MaxHeartRate,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Hồi phục
                </span>

                <strong>
                  {session.Result
                    .RecoveryMinutes ===
                    null ||
                  session.Result
                    .RecoveryMinutes ===
                    undefined
                    ? '—'
                    : `${session.Result.RecoveryMinutes} phút`}
                </strong>
              </div>

              <div>
                <span>
                  Điểm hiệu suất
                </span>

                <strong>
                  {show(
                    session.Result
                      .PerformanceScore,
                  )}
                </strong>
              </div>
            </div>

            {session.Result
              .RiderObservation && (
              <div className="training-review-note">
                <span>
                  Nhận xét của Work Rider
                </span>

                <p>
                  {
                    session.Result
                      .RiderObservation
                  }
                </p>
              </div>
            )}

            {session.Result
              .SubstituteObservation && (
              <div className="training-review-note">
                <span>
                  Nhận xét của huấn luyện viên thay thế
                </span>

                <p>
                  {
                    session.Result
                      .SubstituteObservation
                  }
                </p>
              </div>
            )}

            <div className="training-review-recorded-at">
              Ghi nhận lúc:{' '}
              {formatDateTime(
                session.Result
                  .RecordedAt,
              )}
            </div>
          </>
        )}
      </section>

      {session.Review ? (
        <section className="panel">
          <h2>
            Đánh giá của Trainer
          </h2>

          <div className="training-review-existing">
            <div>
              <span>
                Mức đánh giá
              </span>

              <strong>
                {EVALUATION_LABELS[
                  session.Review
                    .Evaluation
                ] ||
                  session.Review
                    .Evaluation}
              </strong>
            </div>

            <div>
              <span>
                Ngày đánh giá
              </span>

              <strong>
                {formatDateTime(
                  session.Review
                    .ReviewDate,
                )}
              </strong>
            </div>
          </div>

          {session.Review
            .TrainerComment && (
            <div className="training-review-note">
              <span>
                Nhận xét
              </span>

              <p>
                {
                  session.Review
                    .TrainerComment
                }
              </p>
            </div>
          )}

          {session.Review
            .AdjustmentRequired && (
            <div className="training-review-adjustment-note">
              <strong>
                Cần điều chỉnh giáo án
              </strong>

              <p>
                {show(
                  session.Review
                    .AdjustmentNote,
                )}
              </p>
            </div>
          )}
        </section>
      ) : canReview ? (
        <section className="panel">
          <h2>
            Đánh giá buổi tập
          </h2>

          <form
            className="training-review-form"
            noValidate
            onSubmit={
              submitReview
            }
          >
            <label className="form-field">
              <span>
                Mức đánh giá *
              </span>

              <select
                value={
                  evaluation
                }
                onChange={(event) =>
                  setEvaluation(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Chọn mức đánh giá
                </option>

                {EVALUATION_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="form-field">
              <span>
                Nhận xét của Trainer
              </span>

              <textarea
                rows="5"
                maxLength="2000"
                value={
                  trainerComment
                }
                placeholder="Nhận xét về kết quả và khả năng đáp ứng bài tập..."
                onChange={(event) =>
                  setTrainerComment(
                    event.target.value,
                  )
                }
              />
            </label>

            <label className="training-review-checkbox">
              <input
                type="checkbox"
                checked={
                  adjustmentRequired
                }
                onChange={(event) => {
                  const checked =
                    event.target
                      .checked

                  setAdjustmentRequired(
                    checked,
                  )

                  if (!checked) {
                    setAdjustmentNote(
                      '',
                    )
                  }
                }}
              />

              <span>
                Cần điều chỉnh giáo án
              </span>
            </label>

            {adjustmentRequired && (
              <label className="form-field">
                <span>
                  Nội dung cần điều chỉnh *
                </span>

                <textarea
                  rows="4"
                  maxLength="1500"
                  value={
                    adjustmentNote
                  }
                  placeholder="Ví dụ: Giảm quãng đường và cường độ trong tuần tiếp theo."
                  onChange={(event) =>
                    setAdjustmentNote(
                      event.target.value,
                    )
                  }
                />
              </label>
            )}

            <div className="training-review-form-actions">
              <Link
                className="button button-secondary"
                to="/training/reviews"
              >
                Hủy
              </Link>

              <button
                className="button"
                type="submit"
                disabled={
                  busy
                }
              >
                {busy
                  ? 'Đang lưu...'
                  : 'Lưu đánh giá'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="panel">
          <div className="empty-state">
            <h3>
              Không thể đánh giá
            </h3>

            <p>
              Buổi tập này chưa đủ điều kiện
              hoặc không thuộc ngựa bạn đang phụ trách.
            </p>
          </div>
        </section>
      )}
    </main>
  )
}