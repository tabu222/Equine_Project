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
    'vi-VN',
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

export default function HeadTrainerTrainingDashboard() {
  const [rows, setRows] =
    useState([])

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

        setRows([])

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

            <span>
              Hệ thống đang lấy dữ liệu
              ngựa, Trainer và kết quả
              tập luyện gần nhất.
            </span>
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
          <p className="eyebrow">
            HEAD TRAINER
          </p>

          <h1>
            Tổng quan huấn luyện
          </h1>

          <p>
            Theo dõi phân công Trainer,
            giáo án đang áp dụng và kết quả
            tập luyện gần nhất của các ngựa
            trong câu lạc bộ.
          </p>
        </div>

        <button
          className="button button-secondary"
          type="button"
          disabled={refreshing}
          onClick={refresh}
        >
          {refreshing
            ? 'Đang làm mới...'
            : 'Làm mới dữ liệu'}
        </button>
      </div>

      {error && (
        <div
          className="alert-banner"
          role="alert"
        >
          <div>
            <strong>
              Không thể tải đầy đủ dữ liệu
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

          <small>
            Hồ sơ đã Approved 
          </small>
        </article>

        <article className="training-dashboard-stat">
          <span>
            Đã phân Trainer
          </span>

          <strong>
            {summary.assigned}
          </strong>

          <small>
            Có Trainer đang phụ trách
          </small>
        </article>

        <article className="training-dashboard-stat">
          <span>
            Giáo án Active
          </span>

          <strong>
            {summary.activePlans}
          </strong>

          <small>
            Đã được duyệt và đang áp dụng
          </small>
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

          <small>
            Chưa có Trainer, chưa có giáo
            án hoặc đang bị hạn chế tập
          </small>
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
            placeholder="Tên ngựa, mã ngựa, Trainer hoặc chuyên môn..."
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
              Đã phân Trainer
            </option>

            <option value="unassigned">
              Chưa phân Trainer
            </option>

            <option value="active-plan">
              Có giáo án Active
            </option>

            <option value="no-plan">
              Chưa có giáo án Active
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
              Trainer phụ trách.
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">
            <h3>
              Chưa có ngựa trong Flow 2
            </h3>

            <p>
              Chưa có hồ sơ ngựa Approved
              đủ điều kiện xuất hiện trong
              khu vực huấn luyện.
            </p>
          </div>
        ) : filteredRows.length ===
          0 ? (
          <div className="empty-state">
            <h3>
              Không tìm thấy kết quả
            </h3>

            <p>
              Không có ngựa nào phù hợp với
              từ khóa hoặc bộ lọc hiện tại.
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
                    Trainer phụ trách
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
                                Xem hồ sơ Trainer
                              </Link>
                            </div>
                          ) : (
                            <div className="training-missing-state">
                              <span className="status-badge training-status-badge is-warning">
                                Chưa phân Trainer
                              </span>

                              <small>
                                Cần đánh giá và phân
                                công Trainer.
                              </small>
                            </div>
                          )}
                        </td>

                        <td>
                          {horse.ActiveTrainingPlanID ? (
                            <div className="training-plan-cell">
                              <span className="status-badge training-status-badge is-success">
                                Active
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

                              <small>
                                Chưa có giáo án Active.
                              </small>
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
                              Đánh giá / Phân Trainer
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
    </main>
  )
}