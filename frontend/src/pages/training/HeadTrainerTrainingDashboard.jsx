import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  getTrainingDashboard,
  getTrainingSessions,
} from '../../api/trainingApi.ts'

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

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(
    `${value}T00:00:00`,
  )

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  ).format(parsed)
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

  const numericValue =
    Number(value)

  if (
    Number.isNaN(
      numericValue,
    )
  ) {
    return String(value)
  }

  const formatted =
    new Intl.NumberFormat(
      'vi-VN',
      {
        maximumFractionDigits: 1,
      },
    ).format(
      numericValue,
    )

  return suffix
    ? `${formatted} ${suffix}`
    : formatted
}

function healthTone(
  status,
) {
  switch (status) {
    case 'Healthy':
      return 'is-success'

    case 'Recovering':
    case 'Monitor':
      return 'is-warning'

    case 'Injured':
    case 'Isolated':
      return 'is-danger'

    default:
      return 'is-neutral'
  }
}

function healthLabel(
  status,
) {
  switch (status) {
    case 'Healthy':
      return 'Khỏe mạnh'

    case 'Monitor':
      return 'Cần theo dõi'

    case 'Injured':
      return 'Chấn thương'

    case 'Recovering':
      return 'Đang hồi phục'

    case 'Isolated':
      return 'Cách ly'

    default:
      return show(
        status,
        'Chưa cập nhật',
      )
  }
}

function lockLabel(
  horse,
) {
  if (
    !horse.IsTrainingLocked
  ) {
    return null
  }

  if (
    horse.LockLevel ===
    'Full'
  ) {
    return 'Tạm ngừng tập'
  }

  if (
    horse.LockLevel ===
    'Restricted'
  ) {
    return 'Hạn chế cường độ'
  }

  return 'Đang hạn chế tập'
}

function needsAttention(
  horse,
) {
  return (
    !horse.TrainerID ||
    !horse.ActiveTrainingPlanID ||
    horse.IsTrainingLocked ===
      true
  )
}


const SESSION_COLORS = ['#22b99d', '#c6ddbc', '#f2cda3', '#cad7d2']
const SESSION_LABELS = ['Hoàn thành', 'Đã hủy hoặc dừng', 'Vắng', 'Sắp diễn ra / đang tập']

function getSessionCounts(sessions) {
  return sessions.reduce((counts, session) => {
    const index = session.IsStopped || session.Status === 'Cancelled'
      ? 1
      : session.Status === 'Completed'
        ? 0
        : session.Status === 'Missed'
          ? 2
          : 3
    counts[index] += 1
    return counts
  }, [0, 0, 0, 0])
}

function donutBackground(counts) {
  const total = counts.reduce((sum, value) => sum + value, 0)
  if (total === 0) return '#e7efeb'
  let position = 0
  const stops = counts.map((count, index) => {
    const start = position
    position += count * 100 / total
    return `${SESSION_COLORS[index]} ${start}% ${position}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

function SessionOverviewChart({ sessions, heading = 'Kết quả buổi tập' }) {
  const counts = getSessionCounts(sessions)
  const total = sessions.length
  const percent = total ? Math.round(counts[0] * 100 / total) : 0
  return (
    <section className="training-results-overview" aria-label={heading}>
      <div className="training-results-title">
        <h2>{heading}</h2>
      </div>
      <div className="training-results-content">
        <div className="training-results-ring" role="img"
          aria-label={`Hoàn thành ${counts[0]} trên ${total} buổi tập`}
          style={{ background: donutBackground(counts) }}>
          <div className="training-results-ring-center">
            <strong>{percent}%</strong>
            <span>Hoàn thành</span>
          </div>
        </div>
        <div className="training-results-breakdown">
          <div className="training-results-count"><strong>{total}</strong><span>Tổng số buổi tập</span></div>
          {SESSION_LABELS.map((label, index) => (
            <div className="training-results-breakdown-row" key={label}>
              <span className="training-results-key">
                <i style={{ backgroundColor: SESSION_COLORS[index] }} />
                {label}
              </span>
              <strong>{counts[index]}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HeadTrainerTrainingDashboard() {
  const [rows, setRows] =
    useState([])

  const [sessions, setSessions] = useState([])
  const [sessionsError, setSessionsError] = useState('')
  const [sessionsLoading, setSessionsLoading] = useState(true)

  const [loading, setLoading] =
    useState(true)

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [filter, setFilter] =
    useState('all')

  useEffect(() => {
    let active = true

    getTrainingDashboard()
      .then((result) => {
        if (!active) {
          return
        }

        setRows(
          Array.isArray(result)
            ? result
            : [],
        )

        setError('')
      })
      .catch((loadError) => {
        if (!active) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không thể tải tổng quan huấn luyện.',
        )
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    getTrainingSessions()
      .then((result) => {
        if (!active) return
        if (!Array.isArray(result)) throw new Error('Dữ liệu buổi tập không hợp lệ.')
        setSessions(result)
        setSessionsError('')
      })
      .catch(() => {
        if (active) setSessionsError('Không thể tải kết quả buổi tập.')
      })
      .finally(() => {
        if (active) setSessionsLoading(false)
      })
    return () => { active = false }
  }, [])

  const summary =
    useMemo(() => {
      return {
        total:
          rows.length,

        assigned:
          rows.filter(
            (horse) =>
              Boolean(
                horse.TrainerID,
              ),
          ).length,

        activePlans:
          rows.filter(
            (horse) =>
              Boolean(
                horse.ActiveTrainingPlanID,
              ),
          ).length,

        attention:
          rows.filter(
            needsAttention,
          ).length,
      }
    }, [rows])

  const filteredRows =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase()

      return rows.filter(
        (horse) => {
          const matchesSearch =
            !keyword ||
            [
              horse.HorseName,
              horse.HorseCode,
              horse.TrainerName,
              horse.SpecializationName,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(
                    keyword,
                  ),
              )

          if (
            !matchesSearch
          ) {
            return false
          }

          switch (filter) {
            case 'assigned':
              return Boolean(
                horse.TrainerID,
              )

            case 'unassigned':
              return !horse.TrainerID

            case 'active-plan':
              return Boolean(
                horse.ActiveTrainingPlanID,
              )

            case 'no-plan':
              return !horse.ActiveTrainingPlanID

            case 'attention':
              return needsAttention(
                horse,
              )

            default:
              return true
          }
        },
      )
    }, [
      filter,
      rows,
      search,
    ])

  async function refresh() {
    setRefreshing(true)
    setError('')

    try {
      const result =
        await getTrainingDashboard()

      setRows(
        Array.isArray(result)
          ? result
          : [],
      )
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể làm mới dữ liệu huấn luyện.',
      )
    } finally {
      try {
        const sessionRows = await getTrainingSessions()
        if (!Array.isArray(sessionRows)) throw new Error('Dữ liệu không hợp lệ')
        setSessions(sessionRows)
        setSessionsError('')
      } catch {
        setSessionsError('Không thể tải kết quả buổi tập.')
      }
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content training-dashboard-page">
        <section
          className="panel training-dashboard-loading"
          role="status"
        >
          <div className="training-dashboard-loading-bar" />

          <div>
            <strong>
              Đang tải tổng quan huấn luyện
            </strong>


          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page-content training-dashboard-page">
      <div className="breadcrumb">
        <span>
          Huấn luyện
        </span>

        <span>
          /
        </span>

        <strong>
          Tổng quan
        </strong>
      </div>

      <div className="page-heading training-dashboard-heading">
        <div>

          <h1>
            Tổng quan huấn luyện
          </h1>

          
        </div>

        <button
          className="button button-secondary"
          type="button"
          disabled={refreshing}
          onClick={refresh}
        >
          {refreshing ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {error && (
        <div
          className="alert-banner"
          role="alert"
        >
          <div>
            <strong>
              Không thể tải dữ liệu
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            className="button button-secondary"
            type="button"
            disabled={refreshing}
            onClick={refresh}
          >
            Thử lại
          </button>
        </div>
      )}

      {!sessionsLoading && !sessionsError && (
        <div className="training-dashboard-results-preview">
          <SessionOverviewChart sessions={sessions} heading="Kết quả tập luyện" />
          <Link className="training-results-text-link" to="/training/results">
            Xem kết quả chi tiết →
          </Link>
        </div>
      )}
      {sessionsError && <p className="training-results-load-error" role="alert">{sessionsError}</p>}

      {!error && (
        <>
      <section
        className="training-dashboard-summary"
        aria-label="Tổng quan số liệu huấn luyện"
      >
        <article className="training-dashboard-stat">
          <span>
            Ngựa đủ điều kiện
          </span>

          <strong>
            {summary.total}
          </strong>


        </article>

        <article className="training-dashboard-stat">
          <span>
            Đã phân công
          </span>

          <strong>
            {summary.assigned}
          </strong>


        </article>

        <article className="training-dashboard-stat">
          <span>
            Giáo án đang áp dụng
          </span>

          <strong>
            {summary.activePlans}
          </strong>


        </article>

        <article
          className={`training-dashboard-stat ${
            summary.attention > 0
              ? 'needs-attention'
              : ''
          }`}
        >
          <span>
            Cần xử lý
          </span>

          <strong>
            {summary.attention}
          </strong>


        </article>
      </section>

      <section className="filter-card training-dashboard-filter">
        <label className="search-field">
          <span>
            Tìm kiếm
          </span>

          <input
            type="search"
            value={search}
            placeholder="Tên ngựa, mã ngựa hoặc huấn luyện viên"
            onChange={(event) =>
              setSearch(
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
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              Tất cả
            </option>

            <option value="assigned">
              Đã phân công
            </option>

            <option value="unassigned">
              Chưa phân công
            </option>

            <option value="active-plan">
              Có giáo án đang áp dụng
            </option>

            <option value="no-plan">
              Chưa có giáo án đang áp dụng
            </option>

            <option value="attention">
              Cần xử lý
            </option>
          </select>
        </label>

        <div className="training-dashboard-filter-result">
          <strong>
            {filteredRows.length}
          </strong>

          <span>
            / {rows.length} ngựa
          </span>
        </div>
      </section>

      <section className="table-card training-dashboard-table-card">
        <div className="table-header">
          <div>
            <h2>
              Danh sách ngựa huấn luyện
            </h2>

            <p>
              Chọn một ngựa để đánh giá,
              xem lịch sử hoặc quản lý
              Huấn luyện viên phụ trách.
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">
            <h3>
              Chưa có ngựa huấn luyện
            </h3>

            <p>

            </p>
          </div>
        ) : filteredRows.length ===
          0 ? (
          <div className="empty-state">
            <h3>
              Không tìm thấy kết quả
            </h3>

            <p>

            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table training-dashboard-table">
              <thead>
                <tr>
                  <th>
                    Ngựa
                  </th>

                  <th>
                    Sức khỏe
                  </th>

                  <th>
                    Huấn luyện viên phụ trách
                  </th>

                  <th>
                    Giáo án
                  </th>

                  <th>
                    Buổi gần nhất
                  </th>

                  <th>
                    Hiệu suất gần nhất
                  </th>

                  <th>
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map(
                  (horse) => {
                    const lock =
                      lockLabel(
                        horse,
                      )

                    return (
                      <tr
                        key={
                          horse.HorseID
                        }
                      >
                        <td>
                          <div className="training-horse-cell">
                            <strong>
                              {
                                horse.HorseName
                              }
                            </strong>

                            <span>
                              {show(
                                horse.HorseCode,
                                'Chưa có mã',
                              )}
                            </span>

                            {(horse.SexClass ||
                              horse.Gender) && (
                              <small>
                                {show(
                                  horse.SexClass,
                                  horse.Gender,
                                )}
                              </small>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="training-status-stack">
                            <span
                              className={`status-badge training-status-badge ${healthTone(
                                horse.CurrentHealthStatus,
                              )}`}
                            >
                              {healthLabel(
                                horse.CurrentHealthStatus,
                              )}
                            </span>

                            {lock && (
                              <span className="status-badge training-status-badge is-danger">
                                {lock}
                              </span>
                            )}

                            {horse.IsTrainingLocked &&
                              horse.LockLevel ===
                                'Restricted' &&
                              horse.MaxIntensity !=
                                null && (
                                <small className="training-lock-detail">
                                  Tối đa:{' '}
                                  {
                                    horse.MaxIntensity
                                  }
                                </small>
                              )}
                          </div>
                        </td>

                        <td>
                          {horse.TrainerID ? (
                            <div className="training-person-cell">
                              <strong>
                                {
                                  horse.TrainerName
                                }
                              </strong>

                              <span>
                                {show(
                                  horse.SpecializationName,
                                  'Chưa có chuyên môn',
                                )}
                              </span>

                              <Link
                                to={`/training/trainers/${horse.TrainerID}`}
                              >
                                Xem hồ sơ
                              </Link>
                            </div>
                          ) : (
                            <div className="training-missing-state">
                              <span className="status-badge training-status-badge is-warning">
                                Chưa phân công
                              </span>

                              <small>
                                
                              </small>
                            </div>
                          )}
                        </td>

                        <td>
                          {horse.ActiveTrainingPlanID ? (
                            <div className="training-plan-cell">
                              <span className="status-badge training-status-badge is-success">
                                Đang áp dụng
                              </span>

                              <strong>
                                Giáo án #
                                {
                                  horse.ActiveTrainingPlanID
                                }
                              </strong>
                            </div>
                          ) : (
                            <div className="training-missing-state">
                              <span className="status-badge training-status-badge is-neutral">
                                Chưa có
                              </span>


                            </div>
                          )}
                        </td>

                        <td>
                          {horse.LatestTrainingDate ? (
                            <div className="training-latest-session">
                              <strong>
                                {formatDate(
                                  horse.LatestTrainingDate,
                                )}
                              </strong>

                              <span>
                                {horse.LatestActualDistanceKm !=
                                null
                                  ? formatNumber(
                                      horse.LatestActualDistanceKm,
                                      'km',
                                    )
                                  : 'Chưa có quãng đường'}
                              </span>
                            </div>
                          ) : (
                            <span className="training-muted-value">
                              Chưa có buổi hoàn thành
                            </span>
                          )}
                        </td>

                        <td>
                          {horse.LatestTrainingDate ? (
                            <div className="training-performance-cell">
                              <div>
                                <span>
                                  Điểm
                                </span>

                                <strong>
                                  {formatNumber(
                                    horse.LatestPerformanceScore,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Tốc độ TB
                                </span>

                                <strong>
                                  {formatNumber(
                                    horse.LatestAvgSpeedKmh,
                                    'km/h',
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Nhịp tim TB
                                </span>

                                <strong>
                                  {formatNumber(
                                    horse.LatestAvgHeartRate,
                                    'bpm',
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Hồi phục
                                </span>

                                <strong>
                                  {formatNumber(
                                    horse.LatestRecoveryMinutes,
                                    'phút',
                                  )}
                                </strong>
                              </div>
                            </div>
                          ) : (
                            <span className="training-muted-value">
                              Chưa có dữ liệu
                            </span>
                          )}
                        </td>

                        <td>
                          <div className="training-dashboard-actions">
                            <Link
                              className="button"
                              to={`/training/horses/${horse.HorseID}/assessment`}
                            >
                              Đánh giá và phân công
                            </Link>

                            <Link
                              className="button button-secondary"
                              to={`/training/horses/${horse.HorseID}/assessment-history`}
                            >
                              Lịch sử
                            </Link>
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
        </>
      )}
    </main>
  )
}

const SESSION_STATUS_TEXT = {
  'Assigned': 'Đã phân công',
  'In Progress': 'Đang tập',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
  Missed: 'Vắng',
}

const SESSION_EVALUATION_TEXT = {
  Excellent: 'Xuất sắc',
  Good: 'Tốt',
  Average: 'Trung bình',
  'Needs Improvement': 'Cần cải thiện',
}

function sessionScore(session) {
  const value = session.Result?.PerformanceScore
  if (value === null || value === undefined || value === '') {
    return null
  }
  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

function sessionDateKey(daysBack) {
  const date = new Date()
  date.setDate(date.getDate() - daysBack)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Trang kết quả tập luyện của Huấn luyện viên trưởng.
 * Sử dụng GET /training-sessions, không phụ thuộc API tổng quan.
 */
export function HeadTrainerResultsPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [horseId, setHorseId] = useState('all')
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getTrainingSessions()
      .then((data) => {
        if (!active) return
        if (!Array.isArray(data)) {
          throw new Error('Không thể đọc danh sách buổi tập.')
        }
        setSessions(data)
      })
      .catch((requestError) => {
        if (!active) return
        setError(
          requestError instanceof Error && requestError.message
            ? requestError.message
            : 'Không thể tải kết quả tập luyện.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [reload])

  const horses = useMemo(() => {
    const byId = new Map()
    sessions.forEach((session) => {
      if (session.HorseID !== null && session.HorseID !== undefined) {
        byId.set(String(session.HorseID), session.HorseName || 'Chưa có tên')
      }
    })
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1], 'vi'))
  }, [sessions])

  const filteredSessions = useMemo(() => {
    const from = period === '30' ? sessionDateKey(30)
      : period === '90' ? sessionDateKey(90)
        : ''
    return sessions
      .filter((session) => (
        (horseId === 'all' || String(session.HorseID) === horseId) &&
        (!from || String(session.SessionDate || '').slice(0, 10) >= from)
      ))
      .sort((a, b) => {
        const byDate = String(b.SessionDate || '').localeCompare(String(a.SessionDate || ''))
        return byDate || Number(b.TrainingSessionID) - Number(a.TrainingSessionID)
      })
  }, [sessions, horseId, period])

  const results = useMemo(
    () => filteredSessions.filter((session) => session.Result),
    [filteredSessions],
  )

  const totalScore = results.reduce((sum, session) => {
    const score = sessionScore(session)
    return sum + (score ?? 0)
  }, 0)
  const scoredCount = results.filter((session) => sessionScore(session) !== null).length
  const averageScore = scoredCount ? formatNumber(totalScore / scoredCount) : '—'
  const completedCount = filteredSessions.filter((session) => session.Status === 'Completed').length

  return (
    <main className="page-content training-results-page">
      <div className="breadcrumb">
        <Link to="/training/dashboard">Huấn luyện</Link>
        <span>/</span>
        <strong>Kết quả tập luyện</strong>
      </div>

      <div className="page-heading training-results-page-heading">
        <h1>Kết quả tập luyện</h1>
        <button
          className="button button-secondary"
          type="button"
          disabled={loading}
          onClick={() => setReload((value) => value + 1)}
        >
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {loading ? (
        <p className="training-results-message" role="status">Đang tải kết quả tập luyện...</p>
      ) : error ? (
        <div className="training-results-failure" role="alert">
          <strong>Không thể tải kết quả tập luyện</strong>
          <p>{error}</p>
          <button className="button button-secondary" type="button" onClick={() => setReload((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className="training-results-toolbar">
            <label className="form-field">
              <span>Ngựa</span>
              <select value={horseId} onChange={(event) => setHorseId(event.target.value)}>
                <option value="all">Tất cả ngựa</option>
                {horses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Thời gian</span>
              <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                <option value="all">Toàn bộ thời gian</option>
                <option value="30">30 ngày gần đây</option>
                <option value="90">90 ngày gần đây</option>
              </select>
            </label>
          </div>

          <div className="training-results-overview-grid">
            <SessionOverviewChart sessions={filteredSessions} heading="Tổng quan buổi tập" />
            <div className="training-results-summary">
              <div><span>Buổi hoàn thành</span><strong>{completedCount}</strong></div>
              <div><span>Đã ghi kết quả</span><strong>{results.length}</strong></div>
              <div><span>Điểm trung bình</span><strong>{averageScore}</strong></div>
            </div>
          </div>

          <section className="training-results-list" aria-label="Danh sách kết quả buổi tập">
            <div className="training-results-list-heading">
              <h2>Chi tiết buổi tập</h2>
              <span>{filteredSessions.length} buổi</span>
            </div>
            {filteredSessions.length === 0 ? (
              <p className="training-results-message">Chưa có buổi tập trong khoảng thời gian đã chọn.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table training-results-table">
                  <thead>
                    <tr>
                      <th>Ngày tập</th>
                      <th>Ngựa</th>
                      <th>Bài tập</th>
                      <th>Huấn luyện viên</th>
                      <th>Trạng thái</th>
                      <th>Thời lượng</th>
                      <th>Quãng đường</th>
                      <th>Điểm</th>
                      <th>Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => (
                      <tr key={session.TrainingSessionID}>
                        <td>{formatDate(session.SessionDate)}</td>
                        <td><strong>{show(session.HorseName)}</strong></td>
                        <td>{show(session.TrainingType)}</td>
                        <td>{show(session.AssignedTrainerName)}</td>
                        <td><span className={`training-results-state training-results-state-${session.Status === 'Completed' ? 'done' : 'other'}`}>
                          {SESSION_STATUS_TEXT[session.Status] || 'Chưa cập nhật'}
                        </span></td>
                        <td>{formatNumber(session.Result?.ActualDurationMinutes, 'phút')}</td>
                        <td>{formatNumber(session.Result?.ActualDistanceKm, 'km')}</td>
                        <td>{sessionScore(session) === null ? '—' : formatNumber(sessionScore(session))}</td>
                        <td>{session.Review?.Evaluation
                          ? SESSION_EVALUATION_TEXT[session.Review.Evaluation] || 'Chưa đánh giá'
                          : 'Chưa đánh giá'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
