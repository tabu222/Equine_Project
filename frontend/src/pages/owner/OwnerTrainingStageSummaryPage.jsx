import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  getOwnerTrainingPlan,
} from '../../api/trainingApi.ts'

const STAGE_STATE_LABELS = {
  NotStarted: 'Chưa bắt đầu',
  InProgress: 'Đang thực hiện',
  Closed: 'Đã kết thúc',
}

const INTENSITY_LABELS = {
  Low: 'Thấp',
  Moderate: 'Trung bình',
  High: 'Cao',
  'Very High': 'Rất cao',
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

function show(
  value,
) {
  return value === null ||
    value === undefined ||
    value === ''
    ? '—'
    : value
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

function comparisonLabel(
  value,
  suffix = '',
  reverse = false,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 'Không đủ dữ liệu'
  }

  const number =
    Number(value)

  if (
    Number.isNaN(number)
  ) {
    return 'Không đủ dữ liệu'
  }

  if (number === 0) {
    return 'Không thay đổi'
  }

  const isBetter =
    reverse
      ? number < 0
      : number > 0

  const prefix =
    number > 0
      ? '+'
      : ''

  return `${prefix}${formatNumber(
    number,
    suffix,
  )} · ${
    isBetter
      ? 'Cải thiện'
      : 'Giảm'
  }`
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

function stageTone(
  stage,
) {
  if (
    stage.IsOverdue
  ) {
    return 'is-overdue'
  }

  switch (
    stage.StageState
  ) {
    case 'Closed':
      return 'is-closed'

    case 'InProgress':
      return 'is-active'

    case 'NotStarted':
      return 'is-upcoming'

    default:
      return ''
  }
}

export default function OwnerTrainingStageSummaryPage() {
  const {
    horseId,
    planId,
    stageId,
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
              'Không thể tải tổng kết giai đoạn.',
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

  const stage =
    useMemo(
      () =>
        plan?.Stages?.find(
          (item) =>
            String(
              item.TrainingPlanStageID,
            ) ===
            String(
              stageId,
            ),
        ) || null,
      [
        plan,
        stageId,
      ],
    )

  if (loading) {
    return (
      <main className="page-content owner-stage-summary-page">
        <section
          className="panel"
          role="status"
        >
          Đang tải tổng kết giai đoạn...
        </section>
      </main>
    )
  }

  if (
    error ||
    !plan ||
    !stage
  ) {
    return (
      <main className="page-content owner-stage-summary-page">
        <div
          className="alert-banner"
          role="alert"
        >
          {error ||
            'Không tìm thấy giai đoạn huấn luyện.'}
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

  const summary =
    stage.Summary

  const comparison =
    stage.ComparedToPreviousStage

  const evaluations =
    summary?.Evaluations ||
    {}

  return (
    <main className="page-content owner-stage-summary-page">
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

        <strong>
          Tổng kết giai đoạn
        </strong>
      </div>

      <div className="page-heading owner-stage-heading">
        <div>
          <h1>
            {stage.StageName}
          </h1>

          <p>
            {plan.HorseName}
            {' · '}
            {formatDate(
              stage.StartDate,
            )}
            {' - '}
            {formatDate(
              stage.EndDate,
            )}
          </p>
        </div>

        <Link
          className="button button-secondary"
          to={`/owner/horses/${horseId}/training`}
        >
          Quay lại
        </Link>
      </div>

      <section className="panel owner-stage-overview">
        <div className="owner-stage-overview-head">
          <div>
            <span className="owner-stage-order">
              Giai đoạn {stage.StageOrder}
            </span>

            <h2>
              {stage.StageName}
            </h2>
          </div>

          <span
            className={`status-badge owner-stage-state ${stageTone(
              stage,
            )}`}
          >
            {stage.IsOverdue
              ? 'Quá hạn'
              : STAGE_STATE_LABELS[
                  stage.StageState
                ] ||
                stage.StageState}
          </span>
        </div>

        <div className="owner-stage-info-grid">
          <div>
            <span>
              Mục tiêu
            </span>

            <strong>
              {show(
                stage.Goal,
              )}
            </strong>
          </div>

          <div>
            <span>
              Cường độ
            </span>

            <strong>
              {stage.Intensity
                ? INTENSITY_LABELS[
                    stage.Intensity
                  ] ||
                  stage.Intensity
                : '—'}
            </strong>
          </div>

          <div>
            <span>
              Ngày bắt đầu
            </span>

            <strong>
              {formatDate(
                stage.StartDate,
              )}
            </strong>
          </div>

          <div>
            <span>
              Ngày kết thúc
            </span>

            <strong>
              {formatDate(
                stage.EndDate,
              )}
            </strong>
          </div>
        </div>

        {stage.StageState ===
          'InProgress' &&
          stage.AsOf && (
            <p className="owner-stage-as-of">
              Số liệu cập nhật đến{' '}
              {formatDate(
                stage.AsOf,
              )}
            </p>
          )}
      </section>

      {stage.StageState ===
      'NotStarted' ? (
        <section className="panel">
          <div className="empty-state">
            <h3>
              Giai đoạn chưa bắt đầu
            </h3>

            <p>
              Tổng kết sẽ được cập nhật khi
              giai đoạn huấn luyện bắt đầu.
            </p>
          </div>
        </section>
      ) : summary ? (
        <>
          <section className="owner-stage-summary-grid">
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

          <section className="panel owner-stage-section">
            <h2>
              Tiến độ giai đoạn
            </h2>

            <div className="owner-stage-metrics-grid">
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
            </div>
          </section>

          <section className="panel owner-stage-section">
            <h2>
              Hiệu suất huấn luyện
            </h2>

            <div className="owner-stage-metrics-grid">
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
                  Thời gian hồi phục trung bình
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

          <section className="panel owner-stage-section">
            <h2>
              Kết quả đánh giá
            </h2>

            <div className="owner-stage-evaluation-grid">
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

            {(summary.CancelledSessions >
              0 ||
              summary.MissedSessions >
                0 ||
              summary.AwaitingReviewSessions >
                0) && (
              <div className="owner-stage-session-status">
                {summary.CancelledSessions >
                  0 && (
                  <span>
                    Đã hủy:{' '}
                    <strong>
                      {
                        summary.CancelledSessions
                      }
                    </strong>
                  </span>
                )}

                {summary.MissedSessions >
                  0 && (
                  <span>
                    Vắng:{' '}
                    <strong>
                      {
                        summary.MissedSessions
                      }
                    </strong>
                  </span>
                )}

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
            )}
          </section>

          {comparison && (
            <section className="panel owner-stage-section">
              <h2>
                So với giai đoạn trước
              </h2>

              <div className="owner-stage-comparison-grid">
                <div>
                  <span>
                    Tốc độ trung bình
                  </span>

                  <strong>
                    {comparisonLabel(
                      comparison.AvgSpeedKmh,
                      ' km/h',
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Điểm hiệu suất
                  </span>

                  <strong>
                    {comparisonLabel(
                      comparison.AvgPerformanceScore,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Quãng đường mỗi buổi
                  </span>

                  <strong>
                    {comparisonLabel(
                      comparison.AvgDistancePerSessionKm,
                      ' km',
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Thời gian hồi phục
                  </span>

                  <strong>
                    {comparisonLabel(
                      comparison.AvgRecoveryMinutes,
                      ' phút',
                      true,
                    )}
                  </strong>
                </div>
              </div>
            </section>
          )}
        </>
      ) : null}

      {stage.StageState ===
        'Closed' && (
        <section className="panel owner-stage-section">
          <h2>
            Kết luận giai đoạn
          </h2>

          <div className="owner-stage-close-info">
            <div>
              <span>
                Hoàn tất lúc
              </span>

              <strong>
                {formatDateTime(
                  stage.ClosedAt,
                )}
              </strong>
            </div>

            <div>
              <span>
                Người xác nhận
              </span>

              <strong>
                {show(
                  stage.ClosedByName,
                )}
              </strong>
            </div>
          </div>

          {stage.SummaryNote && (
            <div className="owner-training-note">
              <span>
                Tổng kết
              </span>

              <p>
                {
                  stage.SummaryNote
                }
              </p>
            </div>
          )}
        </section>
      )}

      {summary && (
        <section className="owner-stage-actions">
          <Link
            className="button button-secondary"
            to={`/owner/horses/${horseId}/training?planId=${planId}&stageId=${stage.TrainingPlanStageID}`}
          >
            Xem các buổi tập
          </Link>
        </section>
      )}
    </main>
  )
}