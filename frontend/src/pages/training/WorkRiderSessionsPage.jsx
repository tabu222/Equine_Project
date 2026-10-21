import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getTrainingSessions,
  startTrainingSession,
  submitTrainingResult,
} from '../../api/trainingApi.ts'

const STATUS_LABELS = {
  Assigned: 'Đã phân công',
  'In Progress': 'Đang tập',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
  Missed: 'Vắng',
}

function localDateString() {
  const now =
    new Date()

  const year =
    now.getFullYear()

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      now.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
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
  fallback = '—',
) {
  return value === null ||
    value === undefined ||
    value === ''
    ? fallback
    : value
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

function emptyResultForm() {
  return {
    ActualDurationMinutes: '',
    ActualDistanceKm: '',
    AvgSpeedKmh: '',
    MaxSpeedKmh: '',
    AvgHeartRate: '',
    MaxHeartRate: '',
    RecoveryMinutes: '',
    PerformanceScore: '',
    RiderObservation: '',
    VideoUrl: '',
  }
}

function optionalNumber(
  value,
) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null
  }

  const numeric =
    Number(value)

  return Number.isNaN(
    numeric,
  )
    ? null
    : numeric
}

function validateResult(
  form,
) {
  if (
    form.ActualDurationMinutes !==
      '' &&
    (
      Number.isNaN(
        Number(
          form.ActualDurationMinutes,
        ),
      ) ||
      Number(
        form.ActualDurationMinutes,
      ) <= 0
    )
  ) {
    return 'Thời lượng thực tế phải lớn hơn 0.'
  }

  if (
    form.ActualDistanceKm !==
      '' &&
    (
      Number.isNaN(
        Number(
          form.ActualDistanceKm,
        ),
      ) ||
      Number(
        form.ActualDistanceKm,
      ) < 0
    )
  ) {
    return 'Quãng đường thực tế không hợp lệ.'
  }

  if (
    form.AvgSpeedKmh !==
      '' &&
    Number(
      form.AvgSpeedKmh,
    ) < 0
  ) {
    return 'Tốc độ trung bình không hợp lệ.'
  }

  if (
    form.MaxSpeedKmh !==
      '' &&
    Number(
      form.MaxSpeedKmh,
    ) < 0
  ) {
    return 'Tốc độ tối đa không hợp lệ.'
  }

  if (
    form.AvgHeartRate !==
      '' &&
    (
      Number.isNaN(
        Number(
          form.AvgHeartRate,
        ),
      ) ||
      Number(
        form.AvgHeartRate,
      ) <= 0
    )
  ) {
    return 'Nhịp tim trung bình không hợp lệ.'
  }

  if (
    form.MaxHeartRate !==
      '' &&
    (
      Number.isNaN(
        Number(
          form.MaxHeartRate,
        ),
      ) ||
      Number(
        form.MaxHeartRate,
      ) <= 0
    )
  ) {
    return 'Nhịp tim tối đa không hợp lệ.'
  }

  if (
    form.RecoveryMinutes !==
      '' &&
    (
      Number.isNaN(
        Number(
          form.RecoveryMinutes,
        ),
      ) ||
      Number(
        form.RecoveryMinutes,
      ) < 0
    )
  ) {
    return 'Thời gian hồi phục không hợp lệ.'
  }

  if (
    form.PerformanceScore !==
      '' &&
    (
      Number.isNaN(
        Number(
          form.PerformanceScore,
        ),
      ) ||
      Number(
        form.PerformanceScore,
      ) < 0 ||
      Number(
        form.PerformanceScore,
      ) > 100
    )
  ) {
    return 'Điểm đánh giá phải từ 0 đến 100.'
  }

  return ''
}

export default function WorkRiderSessionsPage() {
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
    busy,
    setBusy,
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
    selectedSession,
    setSelectedSession,
  ] = useState(null)

  const [
    resultForm,
    setResultForm,
  ] = useState(
    emptyResultForm,
  )

  const today =
    localDateString()

  async function fetchSessions() {
    const rows =
      await getTrainingSessions({
        mine: true,
      })

    return Array.isArray(
      rows,
    )
      ? rows
      : []
  }

  useEffect(() => {
    let active = true

    fetchSessions()
      .then((rows) => {
        if (!active) {
          return
        }

        setSessions(
          rows,
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
              'Không thể tải buổi tập của Work Rider.',
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
  }, [])

  const filteredSessions =
    useMemo(
      () =>
        sessions.filter(
          (session) =>
            statusFilter ===
              'all' ||
            session.Status ===
              statusFilter,
        ),
      [
        sessions,
        statusFilter,
      ],
    )

  const summary =
    useMemo(
      () => ({
        today:
          sessions.filter(
            (session) =>
              session.SessionDate ===
              today &&
              ![
                'Cancelled',
                'Missed',
              ].includes(
                session.Status,
              ),
          ).length,

        assigned:
          sessions.filter(
            (session) =>
              session.Status ===
              'Assigned',
          ).length,

        progress:
          sessions.filter(
            (session) =>
              session.Status ===
              'In Progress',
          ).length,

        completed:
          sessions.filter(
            (session) =>
              session.Status ===
              'Completed',
          ).length,
      }),
      [
        sessions,
        today,
      ],
    )

  async function refresh() {
    setRefreshing(
      true,
    )

    setError('')
    setMessage('')

    try {
      const rows =
        await fetchSessions()

      setSessions(
        rows,
      )
    } catch (
      loadError
    ) {
      setError(
        getErrorMessage(
          loadError,
          'Không thể làm mới danh sách.',
        ),
      )
    } finally {
      setRefreshing(
        false,
      )
    }
  }

  async function startSession(
    session,
  ) {
    if (
      session.Status !==
      'Assigned'
    ) {
      setError(
        'Chỉ Session ở trạng thái Assigned mới được bắt đầu.',
      )

      return
    }

    if (
      session.SessionDate !==
      today
    ) {
      setError(
        'Work Rider chỉ được bắt đầu buổi tập đúng ngày đã được xếp lịch.',
      )

      return
    }

    setBusy(
      true,
    )

    setError('')
    setMessage('')

    try {
      await startTrainingSession(
        session.TrainingSessionID,
      )

      const rows =
        await fetchSessions()

      setSessions(
        rows,
      )

      setMessage(
        `Đã bắt đầu buổi tập của ${session.HorseName}.`,
      )
    } catch (
      actionError
    ) {
      setError(
        getErrorMessage(
          actionError,
          'Không thể bắt đầu buổi tập.',
        ),
      )
    } finally {
      setBusy(
        false,
      )
    }
  }

  function openResult(
    session,
  ) {
    if (
      session.Status !==
      'In Progress'
    ) {
      setError(
        'Chỉ Session đang In Progress mới được nhập kết quả.',
      )

      return
    }

    setSelectedSession(
      session,
    )

    setResultForm(
      emptyResultForm(),
    )

    setError('')
    setMessage('')
  }

  function changeResult(
    field,
    value,
  ) {
    setResultForm(
      (current) => ({
        ...current,
        [field]:
          value,
      }),
    )
  }

  async function submitResult(
    event,
  ) {
    event.preventDefault()

    if (
      !selectedSession
    ) {
      return
    }

    const validationError =
      validateResult(
        resultForm,
      )

    if (
      validationError
    ) {
      setError(
        validationError,
      )

      return
    }

    setBusy(
      true,
    )

    setError('')
    setMessage('')

    try {
      await submitTrainingResult(
        selectedSession
          .TrainingSessionID,
        {
          ActualDurationMinutes:
            optionalNumber(
              resultForm.ActualDurationMinutes,
            ),

          ActualDistanceKm:
            optionalNumber(
              resultForm.ActualDistanceKm,
            ),

          AvgSpeedKmh:
            optionalNumber(
              resultForm.AvgSpeedKmh,
            ),

          MaxSpeedKmh:
            optionalNumber(
              resultForm.MaxSpeedKmh,
            ),

          AvgHeartRate:
            optionalNumber(
              resultForm.AvgHeartRate,
            ),

          MaxHeartRate:
            optionalNumber(
              resultForm.MaxHeartRate,
            ),

          RecoveryMinutes:
            optionalNumber(
              resultForm.RecoveryMinutes,
            ),

          PerformanceScore:
            optionalNumber(
              resultForm.PerformanceScore,
            ),

          RiderObservation:
            resultForm
              .RiderObservation
              .trim() ||
            null,

          VideoUrl:
            resultForm
              .VideoUrl
              .trim() ||
            null,
        },
      )

      const horseName =
        selectedSession.HorseName

      setSelectedSession(
        null,
      )

      setResultForm(
        emptyResultForm(),
      )

      const rows =
        await fetchSessions()

      setSessions(
        rows,
      )

      setMessage(
        `Đã lưu kết quả buổi tập của ${horseName}.`,
      )
    } catch (
      actionError
    ) {
      setError(
        getErrorMessage(
          actionError,
          'Không thể ghi kết quả buổi tập.',
        ),
      )
    } finally {
      setBusy(
        false,
      )
    }
  }

  if (
    loading
  ) {
    return (
      <main className="page-content work-rider-session-page">
        <section
          className="panel work-rider-loading"
          role="status"
        >
          <div className="work-rider-loading-bar" />

          <div>
            <strong>
              Đang tải buổi tập
            </strong>

            <span>

            </span>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page-content work-rider-session-page">
      <div className="breadcrumb">
        <span>
          Huấn luyện
        </span>

        <span>
          /
        </span>

        <strong>
          Buổi tập của tôi
        </strong>
      </div>

      <div className="page-heading work-rider-page-heading">
        <div>
          <p className="eyebrow">
            NHÂN VIÊN CƯỠI NGỰA
          </p>

          <h1>
            Buổi tập của tôi
          </h1>

          <p>
            Xem lịch được giao, bắt đầu
            đúng ngày và ghi lại kết quả
            thực tế sau buổi tập.
          </p>
        </div>

        <button
          className="button button-secondary"
          type="button"
          disabled={
            refreshing ||
            busy
          }
          onClick={() =>
            void refresh()
          }
        >
          {refreshing
            ? 'Đang làm mới...'
            : 'Làm mới'}
        </button>
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

      <section className="work-rider-summary-grid">
        <article>
          <span>
            Buổi hôm nay
          </span>

          <strong>
            {
              summary.today
            }
          </strong>
        </article>

        <article>
          <span>
            Đã phân công
          </span>

          <strong>
            {
              summary.assigned
            }
          </strong>
        </article>

        <article>
          <span>
            Đang tập
          </span>

          <strong>
            {
              summary.progress
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
      </section>

      <section className="filter-card work-rider-filter">
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
      </section>

      <section className="panel work-rider-session-list-panel">
        <div className="work-rider-section-head">
          <div>
            <h2>
              Lịch buổi tập
            </h2>

          </div>
        </div>

        {filteredSessions.length ===
        0 ? (
          <div className="empty-state">
            <h3>
              Không có buổi tập
            </h3>

            <p>
              Không có buổi tập phù hợp.
            </p>
          </div>
        ) : (
          <div className="work-rider-session-list">
            {filteredSessions.map(
              (session) => {
                const canStart =
                  session.Status ===
                    'Assigned' &&
                  session.SessionDate ===
                    today

                const wrongDay =
                  session.Status ===
                    'Assigned' &&
                  session.SessionDate !==
                    today

                const canResult =
                  session.Status ===
                  'In Progress'

                return (
                  <article
                    className="work-rider-session-card"
                    key={
                      session.TrainingSessionID
                    }
                  >
                    <div className="work-rider-session-head">
                      <div>
                        <span className="work-rider-session-code">
                          BUỔI TẬP #
                          {
                            session.TrainingSessionID
                          }
                        </span>

                        <h3>
                          {
                            session.HorseName
                          }
                        </h3>

                        <p>
                          {formatDate(
                            session.SessionDate,
                          )}
                          {' · '}
                          {formatTime(
                            session.StartTime,
                          )}

                          {session.EndTime
                            ? ` → ${formatTime(
                                session.EndTime,
                              )}`
                            : ''}

                          {' · '}
                          Lượt{' '}
                          {
                            session.SequenceNo
                          }
                        </p>
                      </div>

                      <span
                        className={`status-badge work-rider-status ${statusTone(
                          session.Status,
                        )}`}
                      >
                        {STATUS_LABELS[
                          session.Status
                        ] ||
                          session.Status}
                      </span>
                    </div>

                    <div className="work-rider-session-grid">
                      <div>
                        <span>
                          Giáo án
                        </span>

                        <strong>
                          #
                          {
                            session.TrainingPlanID
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
                          Huấn luyện viên phụ trách
                        </span>

                        <strong>
                          {
                            session.TrainerName
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Người giám sát
                        </span>

                        <strong>
                          {
                            session.SupervisingTrainerName
                          }
                        </strong>

                        {session.IsSubstitute && (
                          <small>
                            Giám sát thay thế
                          </small>
                        )}
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
                          Thời lượng dự kiến
                        </span>

                        <strong>
                          {session.DurationPlannedMinutes ===
                            null ||
                          session.DurationPlannedMinutes ===
                            undefined
                            ? '—'
                            : `${session.DurationPlannedMinutes} phút`}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Quãng đường
                        </span>

                        <strong>
                          {session.DistancePlannedKm ===
                            null ||
                          session.DistancePlannedKm ===
                            undefined
                            ? '—'
                            : `${session.DistancePlannedKm} km`}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Tốc độ mục tiêu
                        </span>

                        <strong>
                          {session.TargetSpeedKmh ===
                            null ||
                          session.TargetSpeedKmh ===
                            undefined
                            ? '—'
                            : `${session.TargetSpeedKmh} km/h`}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Mức tải tập luyện
                        </span>

                        <strong>
                          {show(
                            session.TrainingLoad,
                          )}
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

                    {session.Instructions && (
                      <div className="work-rider-instructions">
                        <span>
                          Hướng dẫn buổi tập
                        </span>

                        <p>
                          {
                            session.Instructions
                          }
                        </p>
                      </div>
                    )}

                    {session.Result && (
                      <div className="work-rider-existing-result">
                        <strong>
                          Kết quả đã ghi
                        </strong>

                        <div className="work-rider-result-summary-grid">
                          <span>
                            Thời lượng:{' '}
                            {show(
                              session.Result
                                .ActualDurationMinutes,
                            )}
                          </span>

                          <span>
                            Quãng đường:{' '}
                            {show(
                              session.Result
                                .ActualDistanceKm,
                            )}
                          </span>

                          <span>
                            Tốc độ trung bình:{' '}
                            {show(
                              session.Result
                                .AvgSpeedKmh,
                            )}
                          </span>

                          <span>
                            Điểm đánh giá:{' '}
                            {show(
                              session.Result
                                .PerformanceScore,
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="work-rider-session-actions">
                      {canStart && (
                        <button
                          className="button"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void startSession(
                              session,
                            )
                          }
                        >
                          Bắt đầu buổi tập
                        </button>
                      )}

                      {wrongDay && (
                        <div className="work-rider-disabled-reason">
                          Chỉ có thể bắt đầu
                          vào đúng ngày{' '}
                          <strong>
                            {formatDate(
                              session.SessionDate,
                            )}
                          </strong>
                          .
                        </div>
                      )}

                      {canResult && (
                        <button
                          className="button"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            openResult(
                              session,
                            )
                          }
                        >
                          Ghi kết quả
                        </button>
                      )}

                      {session.Status ===
                        'Completed' && (
                        <div className="work-rider-completed-note">
                          Đã hoàn thành.
                        </div>
                      )}

                      {session.Status ===
                        'Cancelled' && (
                        <div className="work-rider-disabled-reason">
                          Buổi tập đã bị hủy.
                        </div>
                      )}

                      {session.Status ===
                        'Missed' && (
                        <div className="work-rider-disabled-reason">
                          Đã ghi nhận vắng mặt.
                        </div>
                      )}
                    </div>
                  </article>
                )
              },
            )}
          </div>
        )}
      </section>

      {selectedSession && (
        <div
          className="work-rider-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !busy
            ) {
              setSelectedSession(
                null,
              )
            }
          }}
        >
          <section
            className="work-rider-result-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="work-rider-result-title"
          >
            <span className="work-rider-kicker">
              KẾT QUẢ BUỔI TẬP
            </span>

            <h2 id="work-rider-result-title">
              Kết quả buổi tập
            </h2>

            <p className="work-rider-modal-context">
              {
                selectedSession.HorseName
              }
              {' · '}
              {
                selectedSession.TrainingType
              }
              {' · '}
              {formatDate(
                selectedSession.SessionDate,
              )}
            </p>

            <form
              className="work-rider-result-form"
              noValidate
              onSubmit={
                submitResult
              }
            >
              <div className="work-rider-result-form-grid">
                <label className="form-field">
                  <span>
                    Thời lượng thực tế (phút)
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      resultForm.ActualDurationMinutes
                    }
                    onChange={(event) =>
                      changeResult(
                        'ActualDurationMinutes',
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="form-field">
                  <span>
                    Quãng đường thực tế (km)
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      resultForm.ActualDistanceKm
                    }
                    onChange={(event) =>
                      changeResult(
                        'ActualDistanceKm',
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="form-field">
                  <span>
                    Tốc độ trung bình (km/h)
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      resultForm.AvgSpeedKmh
                    }
                    onChange={(event) =>
                      changeResult(
                        'AvgSpeedKmh',
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="form-field">
                  <span>
                    Tốc độ tối đa (km/h)
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      resultForm.MaxSpeedKmh
                    }
                    onChange={(event) =>
                      changeResult(
                        'MaxSpeedKmh',
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="form-field">
                  <span>
                    Nhịp tim trung bình
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      resultForm.AvgHeartRate
                    }
                    onChange={(event) =>
                      changeResult(
                        'AvgHeartRate',
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="form-field">
                  <span>
                    Nhịp tim tối đa
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      resultForm.MaxHeartRate
                    }
                    onChange={(event) =>
                      changeResult(
                        'MaxHeartRate',
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="form-field">
                  <span>
                    Hồi phục (phút)
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      resultForm.RecoveryMinutes
                    }
                    onChange={(event) =>
                      changeResult(
                        'RecoveryMinutes',
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="form-field">
                  <span>
                    Điểm đánh giá
                  </span>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={
                      resultForm.PerformanceScore
                    }
                    placeholder="0 - 100"
                    onChange={(event) =>
                      changeResult(
                        'PerformanceScore',
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="form-field work-rider-result-form-full">
                  <span>
                    Nhận xét buổi tập
                  </span>

                  <textarea
                    rows="4"
                    maxLength="2000"
                    value={
                      resultForm.RiderObservation
                    }
                    placeholder="Ví dụ: Ngựa phản ứng tốt, hơi nặng chân phải ở cuối buổi..."
                    onChange={(event) =>
                      changeResult(
                        'RiderObservation',
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="form-field work-rider-result-form-full">
                  <span>
                    Video URL
                  </span>

                  <input
                    type="url"
                    maxLength="500"
                    value={
                      resultForm.VideoUrl
                    }
                    placeholder="https://..."
                    onChange={(event) =>
                      changeResult(
                        'VideoUrl',
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>

              <div className="work-rider-modal-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setSelectedSession(
                      null,
                    )
                  }
                >
                  Hủy
                </button>

                <button
                  className="button"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? 'Đang lưu...'
                    : 'Lưu kết quả'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}