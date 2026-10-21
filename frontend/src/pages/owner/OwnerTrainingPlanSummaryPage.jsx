import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  getOwnerTrainingPlan,
} from '../../api/trainingApi.ts'

const STATUS_LABELS = {
  Active: 'Đang thực hiện',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
}

const STAGE_STATE_LABELS = {
  NotStarted: 'Chưa bắt đầu',
  InProgress: 'Đang thực hiện',
  Closed: 'Đã kết thúc',
}

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
    return String(value)
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

function formatNumber(
  value,
  suffix = '',
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—'
  }

  const number =
    Number(value)

  if (
    Number.isNaN(number)
  ) {
    return String(value)
  }

  return `${new Intl.NumberFormat(
    'vi-VN',
    {
      maximumFractionDigits: 2,
    },
  ).format(number)}${suffix}`
}

function formatPercent(
  value,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '—'
  }

  return formatNumber(
    value,
    '%',
  )
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

function statusTone(
  status,
) {
  switch (status) {
    case 'Active':
      return 'is-active'

    case 'Completed':
      return 'is-completed'

    case 'Cancelled':
      return 'is-cancelled'

    default:
      return ''
  }
}

export default function OwnerTrainingPlanSummaryPage() {
  const {
    horseId,
    planId,
  } = useParams()

  const [
    plan,
    setPlan,
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
    if (!planId) {
      return undefined
    }

    let active = true

    getOwnerTrainingPlan(
      planId,
    )
      .then(
        (data) => {
          if (!active) {
            return
          }

          setPlan(
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
              'Không thể tải giáo án huấn luyện.',
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
    planId,
  ])

  if (loading) {
    return (
      <main className="page-content owner-plan-summary-page">
        <section
          className="panel"
          role="status"
        >
          Đang tải giáo án huấn luyện...
        </section>
      </main>
    )
  }

  if (
    error ||
    !plan
  ) {
    return (
      <main className="page-content owner-plan-summary-page">
        <div
          className="alert-banner"
          role="alert"
        >
          {error ||
            'Không tìm thấy giáo án huấn luyện.'}
        </div>

        <Link
          className="button"
          to={`/owner/horses/${horseId}/training/plans`}
        >
          Quay lại
        </Link>
      </main>
    )
  }

  const summary =
    plan.Summary

  const stages =
    Array.isArray(
      plan.Stages,
    )
      ? plan.Stages
      : []

  const evaluations =
    summary?.Evaluations ||
    {}

  const progress =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          plan.ProgressPercent,
        ) || 0,
      ),
    )

  return (
    <main className="page-content owner-plan-summary-page">
      <div className="breadcrumb">
        <Link to="/owner/horses">
          Ngựa của tôi
        </Link>

        <span>/</span>

        <Link
          to={`/owner/horses/${horseId}/training`}
        >
          Kết quả huấn luyện
        </Link>

        <span>/</span>

        <Link
          to={`/owner/horses/${horseId}/training/plans`}
        >
          Giáo án huấn luyện
        </Link>

        <span>/</span>

        <strong>
          Tổng quan giáo án
        </strong>
      </div>

      <div className="page-heading">
        <div>
          <h1>
            {plan.Goal ||
              'Giáo án huấn luyện'}
          </h1>

          <p>
            {plan.HorseName}
            {' · '}
            {plan.TrainerName}
          </p>
        </div>

        <Link
          className="button button-secondary"
          to={`/owner/horses/${horseId}/training/plans`}
        >
          Quay lại
        </Link>
      </div>

      <section className="panel owner-plan-summary-overview">
        <div className="owner-plan-summary-head">
          <div>
            <span>
              {plan.SpecializationName}
            </span>

            <h2>
              {plan.Goal ||
                'Giáo án huấn luyện'}
            </h2>
          </div>

          <span
            className={`status-badge owner-plan-status ${statusTone(
              plan.Status,
            )}`}
          >
            {STATUS_LABELS[
              plan.Status
            ] ||
              plan.Status}
          </span>
        </div>

        <div className="owner-plan-summary-info-grid">
          <div>
            <span>
              Huấn luyện viên
            </span>

            <strong>
              {plan.TrainerName}
            </strong>
          </div>

          <div>
            <span>
              Chuyên môn
            </span>

            <strong>
              {plan.SpecializationName}
            </strong>
          </div>

          <div>
            <span>
              Ngày bắt đầu
            </span>

            <strong>
              {formatDate(
                plan.StartDate,
              )}
            </strong>
          </div>

          <div>
            <span>
              Ngày kết thúc
            </span>

            <strong>
              {formatDate(
                plan.EndDate,
              )}
            </strong>
          </div>

          <div>
            <span>
              Ngày phê duyệt
            </span>

            <strong>
              {formatDateTime(
                plan.ApprovedAt,
              )}
            </strong>
          </div>

          <div>
            <span>
              Số giai đoạn
            </span>

            <strong>
              {
                plan.StageCount
              }
            </strong>
          </div>
        </div>

        <div className="owner-plan-progress-visual">
          <div className="training-results-ring owner-plan-progress-ring"
            role="img"
            aria-label={`Tiến độ giáo án ${Math.round(progress)} phần trăm`}
            style={{ background: `conic-gradient(#22b99d 0% ${progress}%, #e7efeb ${progress}% 100%)` }}>
            <div className="training-results-ring-center">
              <strong>{Math.round(progress)}%</strong>
              <span>Tiến độ</span>
            </div>
          </div>
          <div className="owner-plan-progress-details">
            <h3>Tiến độ giáo án</h3>
            <p>{summary?.CompletedSessions ?? 0} / {summary?.PlannedSessions ?? 0} buổi đã hoàn thành</p>
            {plan.CurrentStageName && <p>Giai đoạn: <strong>{plan.CurrentStageName}</strong></p>}
          </div>
        </div>
      </section>

      {summary && (
        <>
          <section className="owner-plan-summary-cards">
            <article>
              <span>
                Buổi đã lên lịch
              </span>

              <strong>
                {
                  summary.PlannedSessions
                }
              </strong>
            </article>

            <article>
              <span>
                Hoàn thành
              </span>

              <strong>
                {
                  summary.CompletedSessions
                }
              </strong>
            </article>

            <article>
              <span>
                Đã đánh giá
              </span>

              <strong>
                {
                  summary.ReviewedSessions
                }
              </strong>
            </article>

            <article>
              <span>
                Tổng quãng đường
              </span>

              <strong>
                {formatNumber(
                  summary.TotalDistanceKm,
                  ' km',
                )}
              </strong>
            </article>
          </section>

          <section className="panel owner-plan-summary-section">
            <h2>
              Kết quả huấn luyện
            </h2>

            <div className="owner-plan-summary-metrics">
              <div>
                <span>
                  Tổng thời lượng
                </span>

                <strong>
                  {formatNumber(
                    summary.TotalDurationMinutes,
                    ' phút',
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Quãng đường mục tiêu
                </span>

                <strong>
                  {formatNumber(
                    summary.DistanceTargetKm,
                    ' km',
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Tiến độ quãng đường
                </span>

                <strong>
                  {formatNumber(
                    summary.DistanceProgressPercent,
                    '%',
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Trung bình mỗi buổi
                </span>

                <strong>
                  {formatNumber(
                    summary.AvgDistancePerSessionKm,
                    ' km',
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Tốc độ trung bình
                </span>

                <strong>
                  {formatNumber(
                    summary.AvgSpeedKmh,
                    ' km/h',
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Tốc độ tối đa
                </span>

                <strong>
                  {formatNumber(
                    summary.MaxSpeedKmh,
                    ' km/h',
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Điểm hiệu suất trung bình
                </span>

                <strong>
                  {formatNumber(
                    summary.AvgPerformanceScore,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Nhịp tim trung bình
                </span>

                <strong>
                  {formatNumber(
                    summary.AvgHeartRate,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Hồi phục trung bình
                </span>

                <strong>
                  {formatNumber(
                    summary.AvgRecoveryMinutes,
                    ' phút',
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section className="panel owner-plan-summary-section">
            <h2>
              Đánh giá
            </h2>

            <div className="owner-plan-evaluation-grid">
              {Object.entries(
                EVALUATION_LABELS,
              ).map(
                ([
                  value,
                  label,
                ]) => (
                  <div
                    key={
                      value
                    }
                  >
                    <span>
                      {label}
                    </span>

                    <strong>
                      {evaluations[
                        value
                      ] || 0}
                    </strong>
                  </div>
                ),
              )}
            </div>

            <div className="owner-plan-session-statuses">
              <span>
                Đã hủy:{' '}
                <strong>
                  {
                    summary.CancelledSessions
                  }
                </strong>
              </span>

              <span>
                Vắng:{' '}
                <strong>
                  {
                    summary.MissedSessions
                  }
                </strong>
              </span>

              <span>
                Sắp tới:{' '}
                <strong>
                  {
                    summary.UpcomingSessions
                  }
                </strong>
              </span>

              {summary.AwaitingReviewSessions >
                0 && (
                <span>
                  Chưa có đánh giá:{' '}
                  <strong>
                    {
                      summary.AwaitingReviewSessions
                    }
                  </strong>
                </span>
              )}
            </div>
          </section>
        </>
      )}

      <section className="panel owner-plan-summary-section">
        <div className="owner-plan-section-heading">
          <div>
            <h2>
              Các giai đoạn
            </h2>

            <p>
              Theo dõi tiến độ từng giai đoạn
              trong giáo án.
            </p>
          </div>
        </div>

        {stages.length ===
        0 ? (
          <div className="empty-state">
            <h3>
              Chưa có giai đoạn
            </h3>
          </div>
        ) : (
          <div className="owner-plan-stage-summary-list">
            {stages.map(
              (stage) => (
                <article
                  className="owner-plan-stage-summary-item"
                  key={
                    stage
                      .TrainingPlanStageID
                  }
                >
                  <div>
                    <span>
                      Giai đoạn{' '}
                      {
                        stage.StageOrder
                      }
                    </span>

                    <h3>
                      {
                        stage.StageName
                      }
                    </h3>

                    <p>
                      {formatDate(
                        stage.StartDate,
                      )}
                      {' - '}
                      {formatDate(
                        stage.EndDate,
                      )}
                    </p>
                  </div>

                  <div className="owner-plan-stage-summary-actions">
                    <span className="status-badge">
                      {stage.IsOverdue
                        ? 'Quá hạn'
                        : STAGE_STATE_LABELS[
                            stage
                              .StageState
                          ] ||
                          stage
                            .StageState}
                    </span>

                    <Link
                      className="button button-secondary"
                      to={`/owner/horses/${horseId}/training/plans/${plan.TrainingPlanID}/stages/${stage.TrainingPlanStageID}`}
                    >
                      Xem giai đoạn
                    </Link>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="owner-plan-summary-actions">
        <Link
          className="button button-secondary"
          to={`/owner/horses/${horseId}/training?planId=${plan.TrainingPlanID}`}
        >
          Xem các buổi tập
        </Link>

        <Link
          className="button button-secondary"
          to={`/owner/horses/${horseId}/training/stages`}
        >
          Xem các giai đoạn
        </Link>
      </section>
    </main>
  )
}