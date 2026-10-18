import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useSearchParams,
} from 'react-router-dom'

import {
  cancelTrainingSession,
  getTrainingPlans,
  getTrainingSessions,
  markTrainingSessionMissed,
} from '../../api/trainingApi.ts'

const STATUS_LABELS = {
  Assigned: 'Đã phân công',
  'In Progress': 'Đang tập',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
  Missed: 'Vắng',
}

function dateString(
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

function todayString() {
  return dateString(
    new Date(),
  )
}

function plusDays(
  days,
) {
  const date =
    new Date()

  date.setDate(
    date.getDate() +
      days,
  )

  return dateString(
    date,
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
    return value
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
  return value
    ? String(value).slice(
        0,
        5,
      )
    : '—'
}

function statusTone(
  status,
) {
  switch (status) {
    case 'Assigned':
      return 'is-assigned'

    case 'In Progress':
      return 'is-progress'

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

async function fetchScheduleData(
  role,
  from,
  to,
) {
  const [
    planRows,
    sessionRows,
  ] =
    await Promise.all([
      getTrainingPlans(
        role === 'trainer'
          ? {
              mine: true,
              Status:
                'Active',
            }
          : {
              Status:
                'Active',
            },
      ),

      getTrainingSessions({
        From: from,
        To: to,
      }),
    ])

  const plans =
    Array.isArray(
      planRows,
    )
      ? planRows
      : []

  let sessions =
    Array.isArray(
      sessionRows,
    )
      ? sessionRows
      : []

  /*
   * Không dùng mine=1 cho Trainer ở đây.
   *
   * Khi Session có Substitute Trainer,
   * queryset mine=1 hiện tại có thể không
   * trả Session cho responsible Trainer.
   *
   * Vì vậy lấy session của CLB rồi lọc
   * theo các Active Plan mà Trainer sở hữu.
   */
  if (
    role ===
    'trainer'
  ) {
    const ownPlanIds =
      new Set(
        plans.map(
          (plan) =>
            String(
              plan.TrainingPlanID,
            ),
        ),
      )

    sessions =
      sessions.filter(
        (session) =>
          ownPlanIds.has(
            String(
              session.TrainingPlanID,
            ),
          ),
      )
  }

  return {
    plans,
    sessions,
  }
}

export default function TrainingSchedulePage({
  role,
}) {
  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams()

  const [
    from,
    setFrom,
  ] = useState(
    todayString,
  )

  const [
    to,
    setTo,
  ] = useState(
    () =>
      plusDays(14),
  )

  const [
    plans,
    setPlans,
  ] = useState([])

  const [
    sessions,
    setSessions,
  ] = useState([])

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

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('all')

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    actionTarget,
    setActionTarget,
  ] = useState(null)

  const [
    reason,
    setReason,
  ] = useState('')

  const [
    busy,
    setBusy,
  ] = useState(false)

  const planId =
    searchParams.get(
      'planId',
    ) || 'all'

  useEffect(() => {
    let active = true

    fetchScheduleData(
      role,
      todayString(),
      plusDays(14),
    )
      .then((data) => {
        if (!active) {
          return
        }

        setPlans(
          data.plans,
        )

        setSessions(
          data.sessions,
        )

        setError('')
      })
      .catch(
        (loadError) => {
          if (!active) {
            return
          }

          setError(
            getErrorMessage(
              loadError,
              'Không thể tải lịch tập.',
            ),
          )
        },
      )
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [role])

  const filteredSessions =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase()

      return sessions.filter(
        (session) => {
          const matchesPlan =
            planId ===
              'all' ||
            String(
              session.TrainingPlanID,
            ) ===
              String(planId)

          const matchesStatus =
            statusFilter ===
              'all' ||
            session.Status ===
              statusFilter

          const matchesSearch =
            !keyword ||
            String(
              session.HorseName ||
                '',
            )
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            String(
              session.WorkRiderName ||
                '',
            )
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            String(
              session.TrainingType ||
                '',
            )
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            String(
              session.StageName ||
                '',
            )
              .toLowerCase()
              .includes(
                keyword,
              )

          return (
            matchesPlan &&
            matchesStatus &&
            matchesSearch
          )
        },
      )
    }, [
      sessions,
      planId,
      statusFilter,
      search,
    ])

  const summary =
    useMemo(
      () => ({
        total:
          filteredSessions
            .length,

        assigned:
          filteredSessions.filter(
            (session) =>
              session.Status ===
              'Assigned',
          ).length,

        progress:
          filteredSessions.filter(
            (session) =>
              session.Status ===
              'In Progress',
          ).length,

        completed:
          filteredSessions.filter(
            (session) =>
              session.Status ===
              'Completed',
          ).length,
      }),
      [filteredSessions],
    )

  async function loadRange() {
    if (
      !from ||
      !to
    ) {
      setError(
        'Vui lòng chọn khoảng ngày.',
      )

      return
    }

    if (to < from) {
      setError(
        'Ngày kết thúc bộ lọc phải sau ngày bắt đầu.',
      )

      return
    }

    setRefreshing(true)
    setError('')
    setMessage('')

    try {
      const data =
        await fetchScheduleData(
          role,
          from,
          to,
        )

      setPlans(
        data.plans,
      )

      setSessions(
        data.sessions,
      )
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Không thể tải lịch tập.',
        ),
      )
    } finally {
      setRefreshing(false)
    }
  }

  function changePlanFilter(
    value,
  ) {
    if (
      value ===
      'all'
    ) {
      const next =
        new URLSearchParams(
          searchParams,
        )

      next.delete(
        'planId',
      )

      setSearchParams(
        next,
      )

      return
    }

    setSearchParams({
      planId:
        value,
    })
  }

  async function confirmAction() {
    if (
      !actionTarget
    ) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (
        actionTarget.type ===
        'cancel'
      ) {
        await cancelTrainingSession(
          actionTarget
            .session
            .TrainingSessionID,
          reason
            .trim() ||
            undefined,
        )

        setMessage(
          'Đã hủy buổi tập.',
        )
      }

      if (
        actionTarget.type ===
        'missed'
      ) {
        await markTrainingSessionMissed(
          actionTarget
            .session
            .TrainingSessionID,
          reason
            .trim() ||
            undefined,
        )

        setMessage(
          'Đã đánh dấu buổi tập là Missed.',
        )
      }

      setActionTarget(
        null,
      )

      setReason(
        '',
      )

      const data =
        await fetchScheduleData(
          role,
          from,
          to,
        )

      setPlans(
        data.plans,
      )

      setSessions(
        data.sessions,
      )
    } catch (actionError) {
      setError(
        getErrorMessage(
          actionError,
          'Không thể cập nhật buổi tập.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content training-schedule-page">
        <section
          className="panel training-session-loading"
          role="status"
        >
          <div className="training-session-loading-bar" />

          <div>
            <strong>
              Đang tải lịch tập
            </strong>

            <span>
              Đang lấy Training Session và
              các Active Plan.
            </span>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page-content training-schedule-page">
      <div className="breadcrumb">
        <span>
          Huấn luyện
        </span>

        <span>
          /
        </span>

        <strong>
          Lịch tập
        </strong>
      </div>

      <div className="page-heading training-session-page-heading">
        <div>
          <p className="eyebrow">
            {role ===
            'headTrainer'
              ? 'HEAD TRAINER'
              : 'TRAINER'}
          </p>

          <h1>
            Lịch Training Session
          </h1>

          <p>
            Xếp buổi tập, phân Work Rider
            và chọn Substitute Trainer khi
            cần.
          </p>
        </div>

        <div className="training-schedule-heading-actions">
          <button
            className="button button-secondary"
            type="button"
            disabled={refreshing}
            onClick={() =>
              void loadRange()
            }
          >
            {refreshing
              ? 'Đang làm mới...'
              : 'Làm mới'}
          </button>

          {plans.length >
            0 && (
            <Link
              className="button"
              to={
                planId !==
                'all'
                  ? `/training/sessions/new?planId=${planId}`
                  : '/training/sessions/new'
              }
            >
              + Tạo buổi tập
            </Link>
          )}
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

      {message && (
        <div
          className="success-message"
          role="status"
        >
          {message}
        </div>
      )}

      <section className="training-session-summary-grid">
        <article>
          <span>
            Tổng buổi
          </span>

          <strong>
            {summary.total}
          </strong>
        </article>

        <article>
          <span>
            Đã phân công
          </span>

          <strong>
            {summary.assigned}
          </strong>
        </article>

        <article>
          <span>
            Đang tập
          </span>

          <strong>
            {summary.progress}
          </strong>
        </article>

        <article>
          <span>
            Hoàn thành
          </span>

          <strong>
            {summary.completed}
          </strong>
        </article>
      </section>

      <section className="filter-card training-schedule-filter">
        <label className="filter-field">
          <span>
            Từ ngày
          </span>

          <input
            type="date"
            value={from}
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
            value={to}
            onChange={(event) =>
              setTo(
                event.target.value,
              )
            }
          />
        </label>

        <label className="filter-field">
          <span>
            Active Plan
          </span>

          <select
            value={planId}
            onChange={(event) =>
              changePlanFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              Tất cả Plan
            </option>

            {plans.map(
              (plan) => (
                <option
                  key={
                    plan.TrainingPlanID
                  }
                  value={
                    plan.TrainingPlanID
                  }
                >
                  #
                  {
                    plan.TrainingPlanID
                  }
                  {' · '}
                  {
                    plan.HorseName
                  }
                </option>
              ),
            )}
          </select>
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

            <option value="Assigned">
              Đã phân công
            </option>

            <option value="In Progress">
              Đang tập
            </option>

            <option value="Completed">
              Hoàn thành
            </option>

            <option value="Cancelled">
              Đã hủy
            </option>

            <option value="Missed">
              Vắng
            </option>
          </select>
        </label>

        <label className="filter-field training-schedule-search">
          <span>
            Tìm kiếm
          </span>

          <input
            type="search"
            value={search}
            placeholder="Ngựa, Rider, bài tập, Stage..."
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />
        </label>

        <button
          className="button button-secondary"
          type="button"
          disabled={refreshing}
          onClick={() =>
            void loadRange()
          }
        >
          Áp dụng
        </button>
      </section>

      <section className="panel training-session-list-panel">
        <div className="training-session-section-head">
          <div>
            <span className="training-session-kicker">
              SESSION SCHEDULE
            </span>

            <h2>
              Các buổi tập
            </h2>

            <p>
              Trainer chỉ thấy session của
              các Active Plan mình đang phụ
              trách. Head Trainer xem lịch
              toàn CLB.
            </p>
          </div>
        </div>

        {filteredSessions.length ===
        0 ? (
          <div className="empty-state">
            <h3>
              Chưa có buổi tập
            </h3>

            <p>
              Không có Training Session phù
              hợp trong khoảng ngày hiện
              tại.
            </p>

            {plans.length >
              0 && (
              <Link
                className="button"
                to={
                  planId !==
                    'all'
                    ? `/training/sessions/new?planId=${planId}`
                    : '/training/sessions/new'
                }
              >
                Tạo buổi tập
              </Link>
            )}
          </div>
        ) : (
          <div className="training-session-table-wrapper">
            <table className="data-table training-session-table">
              <thead>
                <tr>
                  <th>
                    Ngày / Slot
                  </th>

                  <th>
                    Ngựa
                  </th>

                  <th>
                    Stage
                  </th>

                  <th>
                    Bài tập
                  </th>

                  <th>
                    Work Rider
                  </th>

                  <th>
                    Giám sát
                  </th>

                  <th>
                    Trạng thái
                  </th>

                  <th>
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSessions.map(
                  (session) => {
                    const canEdit =
                      session.Status ===
                      'Assigned'

                    const canCancel =
                      session.Status ===
                      'Assigned'

                    const canMiss =
                      [
                        'Assigned',
                        'In Progress',
                      ].includes(
                        session.Status,
                      ) &&
                      session.SessionDate <=
                        todayString()

                    return (
                      <tr
                        key={
                          session.TrainingSessionID
                        }
                      >
                        <td>
                          <strong>
                            {formatDate(
                              session.SessionDate,
                            )}
                          </strong>

                          <span className="training-session-cell-muted">
                            {formatTime(
                              session.StartTime,
                            )}
                            {session.EndTime
                              ? ` → ${formatTime(
                                  session.EndTime,
                                )}`
                              : ''}
                            {' · '}
                            Slot{' '}
                            {
                              session.SequenceNo
                            }
                          </span>
                        </td>

                        <td>
                          <strong>
                            {
                              session.HorseName
                            }
                          </strong>

                          <span className="training-session-cell-muted">
                            Plan #
                            {
                              session.TrainingPlanID
                            }
                          </span>
                        </td>

                        <td>
                          {
                            session.StageName
                          }
                        </td>

                        <td>
                          <strong>
                            {
                              session.TrainingType
                            }
                          </strong>

                          <span className="training-session-cell-muted">
                            {session.TrainingLoad !==
                              null &&
                            session.TrainingLoad !==
                              undefined
                              ? `Load ${session.TrainingLoad}`
                              : 'Chưa có Load'}
                          </span>
                        </td>

                        <td>
                          {
                            session.WorkRiderName
                          }
                        </td>

                        <td>
                          <strong>
                            {
                              session.SupervisingTrainerName
                            }
                          </strong>

                          {session.IsSubstitute && (
                            <span className="training-session-substitute-label">
                              Substitute
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`status-badge training-session-status ${statusTone(
                              session.Status,
                            )}`}
                          >
                            {STATUS_LABELS[
                              session.Status
                            ] ||
                              session.Status}
                          </span>
                        </td>

                        <td>
                          <div className="training-session-row-actions">
                            {canEdit && (
                              <Link
                                className="button button-secondary"
                                to={`/training/sessions/${session.TrainingSessionID}/edit`}
                              >
                                Sửa
                              </Link>
                            )}

                            {canCancel && (
                              <button
                                className="training-session-text-danger"
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setReason(
                                    '',
                                  )

                                  setActionTarget({
                                    type:
                                      'cancel',
                                    session,
                                  })
                                }}
                              >
                                Hủy
                              </button>
                            )}

                            {canMiss && (
                              <button
                                className="training-session-text-warning"
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setReason(
                                    '',
                                  )

                                  setActionTarget({
                                    type:
                                      'missed',
                                    session,
                                  })
                                }}
                              >
                                Đánh vắng
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {actionTarget && (
        <div
          className="training-session-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget &&
              !busy
            ) {
              setActionTarget(
                null,
              )
            }
          }}
        >
          <section
            className="training-session-modal"
            role="dialog"
            aria-modal="true"
          >
            <span className="training-session-kicker">
              {actionTarget.type ===
              'cancel'
                ? 'CANCEL SESSION'
                : 'MISSED SESSION'}
            </span>

            <h2>
              {actionTarget.type ===
              'cancel'
                ? 'Hủy buổi tập?'
                : 'Đánh dấu vắng?'}
            </h2>

            <p>
              {
                actionTarget
                  .session
                  .HorseName
              }
              {' · '}
              {formatDate(
                actionTarget
                  .session
                  .SessionDate,
              )}
              {' · '}
              {
                actionTarget
                  .session
                  .TrainingType
              }
            </p>

            <label className="form-field">
              <span>
                {actionTarget.type ===
                'cancel'
                  ? 'Lý do hủy'
                  : 'Lý do vắng'}
              </span>

              <textarea
                rows="4"
                maxLength="1000"
                value={reason}
                placeholder="Không bắt buộc..."
                onChange={(event) =>
                  setReason(
                    event.target.value,
                  )
                }
              />
            </label>

            <div className="training-session-modal-actions">
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() =>
                  setActionTarget(
                    null,
                  )
                }
              >
                Quay lại
              </button>

              <button
                className={
                  actionTarget.type ===
                  'cancel'
                    ? 'button training-session-danger-button'
                    : 'button'
                }
                type="button"
                disabled={busy}
                onClick={() =>
                  void confirmAction()
                }
              >
                {busy
                  ? 'Đang xử lý...'
                  : actionTarget.type ===
                      'cancel'
                    ? 'Xác nhận hủy'
                    : 'Đánh dấu Missed'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}