import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import {
  getOwnerTrainingSessions,
} from '../../api/trainingApi.ts'

const EVALUATION_LABELS = {
  Excellent: 'Xuất sắc',
  Good: 'Tốt',
  Average: 'Trung bình',
  'Needs Improvement':
    'Cần cải thiện',
}

const STATUS_LABELS = {
  Completed: 'Hoàn thành',
  Cancelled: 'Đã dừng',
  Missed: 'Vắng',
}

function localDateString(
  date,
) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
}

function daysAgo(
  days,
) {
  const date =
    new Date()

  date.setDate(
    date.getDate() -
      days,
  )

  return localDateString(
    date,
  )
}

function todayString() {
  return localDateString(
    new Date(),
  )
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
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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
  session,
) {
  if (
    session.IsStopped
  ) {
    return 'is-stopped'
  }

  switch (
    session.Status
  ) {
    case 'Completed':
      return 'is-completed'

    case 'Cancelled':
      return 'is-cancelled'

    case 'Missed':
      return 'is-missed'

    default:
      return ''
  }
}

export default function OwnerTrainingSessionsPage() {
  const {
    horseId,
  } = useParams()

  const [
    searchParams,
  ] = useSearchParams()

  const selectedPlanId =
    searchParams.get(
      'planId',
    ) || ''

  const selectedStageId =
    searchParams.get(
      'stageId',
    ) || ''

  const [
    sessions,
    setSessions,
  ] = useState([])

  const [
    from,
    setFrom,
  ] = useState(
    () =>
      daysAgo(
        30,
      ),
  )

  const [
    to,
    setTo,
  ] = useState(
    todayString,
  )

  const [
    statusFilter,
    setStatusFilter,
  ] = useState(
    'all',
  )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const loadSessions =
    useCallback(
      async (
        fromDate,
        toDate,
      ) => {
        const rows =
          await getOwnerTrainingSessions(
            horseId,
            {
              From:
                fromDate ||
                undefined,

              To:
                toDate ||
                undefined,

              TrainingPlanID:
                selectedPlanId ||
                undefined,

              TrainingPlanStageID:
                selectedStageId ||
                undefined,
            },
          )

        return Array.isArray(
          rows,
        )
          ? rows
          : []
      },
      [
        horseId,
        selectedPlanId,
        selectedStageId,
      ],
    )

  useEffect(() => {
    if (!horseId) {
      return undefined
    }

    let active = true

    loadSessions(
      from,
      to,
    )
      .then(
        (rows) => {
          if (!active) {
            return
          }

          setSessions(
            rows,
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
              'Không thể tải kết quả huấn luyện.',
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
    horseId,
    from,
    to,
    loadSessions,
  ])

  const filteredSessions =
    useMemo(
      () =>
        sessions.filter(
          (session) => {
            if (
              statusFilter ===
              'all'
            ) {
              return true
            }

            if (
              statusFilter ===
              'stopped'
            ) {
              return Boolean(
                session.IsStopped,
              )
            }

            return (
              session.Status ===
              statusFilter
            )
          },
        ),
      [
        sessions,
        statusFilter,
      ],
    )

  const summary =
    useMemo(
      () => ({
        total:
          sessions.length,

        completed:
          sessions.filter(
            (session) =>
              session.Status ===
              'Completed',
          ).length,

        stopped:
          sessions.filter(
            (session) =>
              session.IsStopped,
          ).length,

        missed:
          sessions.filter(
            (session) =>
              session.Status ===
              'Missed',
          ).length,
      }),
      [
        sessions,
      ],
    )

  async function applyFilter() {
    if (
      from &&
      to &&
      to < from
    ) {
      setError(
        'Ngày kết thúc phải sau ngày bắt đầu.',
      )

      return
    }

    setRefreshing(
      true,
    )

    setError('')

    try {
      const rows =
        await loadSessions(
          from,
          to,
        )

      setSessions(
        rows,
      )
    } catch (
      loadError
    ) {
      setError(
        getErrorMessage(
          loadError,
          'Không thể tải kết quả huấn luyện.',
        ),
      )
    } finally {
      setRefreshing(
        false,
      )
    }
  }

  if (loading) {
    return (
      <main className="page-content owner-training-page">
        <section
          className="panel"
          role="status"
        >
          Đang tải kết quả huấn luyện...
        </section>
      </main>
    )
  }

  return (
    <main className="page-content owner-training-page">
      <div className="breadcrumb">
        <Link to="/owner/horses">
          Ngựa của tôi
        </Link>

        <span>
          /
        </span>

        <Link
          to={`/owner/horses/${horseId}`}
        >
          Hồ sơ ngựa
        </Link>

        <span>
          /
        </span>

        <strong>
          Kết quả huấn luyện
        </strong>
      </div>

      <div className="page-heading owner-training-heading">
        <div>
          <h1>
            Kết quả huấn luyện
          </h1>

          <p>
            Theo dõi các buổi tập đã hoàn thành
            và đánh giá từ huấn luyện viên.
          </p>
        </div>

<div className="owner-training-heading-actions">
  <Link
    className="button button-secondary"
    to={`/owner/horses/${horseId}/training/plans`}
  >
    Giáo án huấn luyện
  </Link>

  <Link
    className="button button-secondary"
    to={`/owner/horses/${horseId}/training/stages`}
  >
    Giai đoạn huấn luyện
  </Link>

  <Link
    className="button button-secondary"
    to={`/owner/horses/${horseId}`}
  >
    Quay lại hồ sơ
  </Link>
</div>
      </div>

      {error && (
        <div
          className="alert-banner"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="owner-training-summary-grid">
        <article>
          <span>
            Tổng số buổi
          </span>

          <strong>
            {
              summary.total
            }
          </strong>
        </article>

        <article>
          <span>
            Hoàn thành
          </span>

          <strong>
            {
              summary.completed
            }
          </strong>
        </article>

        <article>
          <span>
            Đã dừng
          </span>

          <strong>
            {
              summary.stopped
            }
          </strong>
        </article>

        <article>
          <span>
            Vắng
          </span>

          <strong>
            {
              summary.missed
            }
          </strong>
        </article>
      </section>

      <section className="filter-card owner-training-filters">
        <label className="filter-field">
          <span>
            Từ ngày
          </span>

          <input
            type="date"
            value={
              from
            }
            onChange={(event) =>
              setFrom(
                event.target.value,
              )
            }
          />
        </label>

        <label className="filter-field">
          <span>
            Đến ngày
          </span>

          <input
            type="date"
            value={
              to
            }
            onChange={(event) =>
              setTo(
                event.target.value,
              )
            }
          />
        </label>

        <label className="filter-field">
          <span>
            Trạng thái
          </span>

          <select
            value={
              statusFilter
            }
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              Tất cả
            </option>

            <option value="Completed">
              Hoàn thành
            </option>

            <option value="stopped">
              Đã dừng
            </option>

            <option value="Missed">
              Vắng
            </option>
          </select>
        </label>

        <button
          className="button button-secondary"
          type="button"
          disabled={
            refreshing
          }
          onClick={() =>
            void applyFilter()
          }
        >
          {refreshing
            ? 'Đang tải...'
            : 'Áp dụng'}
        </button>
      </section>

      <section className="panel owner-training-session-panel">
        {filteredSessions.length ===
        0 ? (
          <div className="empty-state">
            <h3>
              Chưa có kết quả huấn luyện
            </h3>

            <p>
              Các buổi tập đã có đánh giá sẽ
              được hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="owner-training-session-list">
            {filteredSessions.map(
              (session) => (
                <article
                  className="owner-training-session-card"
                  key={
                    session
                      .TrainingSessionID
                  }
                >
                  <div className="owner-training-session-card-head">
                    <div>
                      <h2>
                        {
                          session
                            .TrainingType
                        }
                      </h2>

                      <p>
                        {formatDate(
                          session
                            .SessionDate,
                        )}
                        {' · '}
                        {formatTime(
                          session
                            .StartTime,
                        )}
                        {' · '}
                        {
                          session
                            .StageName
                        }
                      </p>
                    </div>

                    <span
                      className={`status-badge owner-training-status ${statusTone(
                        session,
                      )}`}
                    >
                      {session.IsStopped
                        ? 'Đã dừng'
                        : STATUS_LABELS[
                            session
                              .Status
                          ] ||
                          session
                            .Status}
                    </span>
                  </div>

                  {session.Status ===
                  'Completed' ? (
                    <div className="owner-training-session-result">
                      <div>
                        <span>
                          Thời lượng
                        </span>

                        <strong>
                          {session.DurationMinutes ===
                            null ||
                          session.DurationMinutes ===
                            undefined
                            ? '—'
                            : `${session.DurationMinutes} phút`}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Quãng đường
                        </span>

                        <strong>
                          {session.DistanceKm ===
                            null ||
                          session.DistanceKm ===
                            undefined
                            ? '—'
                            : `${session.DistanceKm} km`}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Điểm hiệu suất
                        </span>

                        <strong>
                          {session.PerformanceScore ??
                            '—'}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Đánh giá
                        </span>

                        <strong>
                          {session.Evaluation
                            ? EVALUATION_LABELS[
                                session
                                  .Evaluation
                              ] ||
                              session
                                .Evaluation
                            : '—'}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="owner-training-session-event">
                      <strong>
                        {session.IsStopped
                          ? 'Buổi tập đã được dừng.'
                          : session.Status ===
                              'Missed'
                            ? 'Buổi tập không diễn ra.'
                            : 'Buổi tập đã bị hủy.'}
                      </strong>

                      {session.Reason && (
                        <p>
                          {
                            session.Reason
                          }
                        </p>
                      )}
                    </div>
                  )}

                  {session.Status ===
                    'Completed' && (
                    <div className="owner-training-session-actions">
                      <Link
                        className="button button-secondary"
                        to={`/owner/horses/${horseId}/training/sessions/${session.TrainingSessionID}`}
                      >
                        Xem chi tiết
                      </Link>
                    </div>
                  )}
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  )
}