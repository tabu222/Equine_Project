import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  getNotifications,
} from '../../api/trainingApi.ts'

const OWNER_ACTIVITY_TYPES =
  new Set([
    'OWNER_SESSIONS_REVIEWED',
    'OWNER_STAGE_SUMMARY',
    'OWNER_PLAN_SUMMARY',
    'OWNER_PLAN_APPROVED',
    'OWNER_SESSION_STOPPED',
    'OWNER_TRAINING_LOCKED',
    'OWNER_TRAINING_UNLOCKED',
  ])

const TYPE_LABELS = {
  OWNER_SESSIONS_REVIEWED:
    'Kết quả buổi tập',

  OWNER_STAGE_SUMMARY:
    'Tổng kết giai đoạn',

  OWNER_PLAN_SUMMARY:
    'Tổng kết giáo án',

  OWNER_PLAN_APPROVED:
    'Giáo án mới',

  OWNER_SESSION_STOPPED:
    'Buổi tập đã dừng',

  OWNER_TRAINING_LOCKED:
    'Tạm dừng huấn luyện',

  OWNER_TRAINING_UNLOCKED:
    'Được phép tập luyện',
}

const FILTERS = [
  {
    value: 'all',
    label: 'Tất cả',
  },
  {
    value: 'result',
    label: 'Kết quả',
  },
  {
    value: 'stage',
    label: 'Giai đoạn',
  },
  {
    value: 'plan',
    label: 'Giáo án',
  },
  {
    value: 'important',
    label: 'Quan trọng',
  },
]

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

function matchesFilter(
  item,
  filter,
) {
  switch (filter) {
    case 'result':
      return (
        item.Type ===
        'OWNER_SESSIONS_REVIEWED'
      )

    case 'stage':
      return (
        item.Type ===
        'OWNER_STAGE_SUMMARY'
      )

    case 'plan':
      return (
        item.Type ===
          'OWNER_PLAN_SUMMARY' ||
        item.Type ===
          'OWNER_PLAN_APPROVED'
      )

    case 'important':
      return (
        item.Priority ===
        'High'
      )

    default:
      return true
  }
}

function activityTone(
  item,
) {
  if (
    item.Priority ===
    'High'
  ) {
    return 'is-high'
  }

  switch (
    item.Type
  ) {
    case 'OWNER_SESSIONS_REVIEWED':
      return 'is-result'

    case 'OWNER_STAGE_SUMMARY':
      return 'is-stage'

    case 'OWNER_PLAN_SUMMARY':
    case 'OWNER_PLAN_APPROVED':
      return 'is-plan'

    case 'OWNER_SESSION_STOPPED':
      return 'is-danger'

    case 'OWNER_TRAINING_LOCKED':
      return 'is-warning'

    case 'OWNER_TRAINING_UNLOCKED':
      return 'is-success'

    default:
      return ''
  }
}

function activityIcon(
  type,
) {
  switch (type) {
    case 'OWNER_SESSIONS_REVIEWED':
      return '✓'

    case 'OWNER_STAGE_SUMMARY':
      return 'S'

    case 'OWNER_PLAN_SUMMARY':
      return 'P'

    case 'OWNER_PLAN_APPROVED':
      return '✓'

    case 'OWNER_SESSION_STOPPED':
      return '!'

    case 'OWNER_TRAINING_LOCKED':
      return '×'

    case 'OWNER_TRAINING_UNLOCKED':
      return '✓'

    default:
      return '•'
  }
}

function activityLink(
  item,
) {
  if (!item.HorseID) {
    return '/owner/horses'
  }

  switch (
    item.Type
  ) {
    case 'OWNER_SESSIONS_REVIEWED':
      return `/owner/horses/${item.HorseID}/training`

    case 'OWNER_STAGE_SUMMARY':
      if (
        item.EntityName ===
          'TrainingPlanStage' &&
        item.EntityID
      ) {
        return `/owner/horses/${item.HorseID}/training/stages`
      }

      return `/owner/horses/${item.HorseID}/training/stages`

    case 'OWNER_PLAN_SUMMARY':
    case 'OWNER_PLAN_APPROVED':
      if (
        item.EntityName ===
          'TrainingPlan' &&
        item.EntityID
      ) {
        return `/owner/horses/${item.HorseID}/training/plans/${item.EntityID}`
      }

      return `/owner/horses/${item.HorseID}/training/plans`

    case 'OWNER_SESSION_STOPPED':
      return `/owner/horses/${item.HorseID}/training`

    case 'OWNER_TRAINING_LOCKED':
    case 'OWNER_TRAINING_UNLOCKED':
      return `/owner/horses/${item.HorseID}`

    default:
      return `/owner/horses/${item.HorseID}/training`
  }
}

export default function OwnerTrainingActivityPage() {
  const [
    activities,
    setActivities,
  ] = useState([])

  const [
    filter,
    setFilter,
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

  async function loadActivities() {
    const response =
      await getNotifications()

    if (
      !Array.isArray(
        response,
      )
    ) {
      return []
    }

    return response.filter(
      (item) =>
        OWNER_ACTIVITY_TYPES.has(
          item.Type,
        ),
    )
  }

  useEffect(() => {
    let active = true

    loadActivities()
      .then(
        (rows) => {
          if (!active) {
            return
          }

          setActivities(
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
              'Không thể tải hoạt động huấn luyện.',
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

  const filteredActivities =
    useMemo(
      () =>
        [...activities]
          .filter(
            (item) =>
              matchesFilter(
                item,
                filter,
              ),
          )
          .sort(
            (
              a,
              b,
            ) => {
              const aTime =
                a.At
                  ? new Date(
                      a.At,
                    ).getTime()
                  : 0

              const bTime =
                b.At
                  ? new Date(
                      b.At,
                    ).getTime()
                  : 0

              return (
                bTime -
                aTime
              )
            },
          ),
      [
        activities,
        filter,
      ],
    )

  const counters =
    useMemo(
      () => ({
        total:
          activities.length,

        result:
          activities.filter(
            (item) =>
              item.Type ===
              'OWNER_SESSIONS_REVIEWED',
          ).length,

        stage:
          activities.filter(
            (item) =>
              item.Type ===
              'OWNER_STAGE_SUMMARY',
          ).length,

        plan:
          activities.filter(
            (item) =>
              item.Type ===
                'OWNER_PLAN_SUMMARY' ||
              item.Type ===
                'OWNER_PLAN_APPROVED',
          ).length,

        important:
          activities.filter(
            (item) =>
              item.Priority ===
              'High',
          ).length,
      }),
      [
        activities,
      ],
    )

  async function refresh() {
    setRefreshing(
      true,
    )

    setError('')

    try {
      const rows =
        await loadActivities()

      setActivities(
        rows,
      )
    } catch (
      loadError
    ) {
      setError(
        getErrorMessage(
          loadError,
          'Không thể tải lại hoạt động huấn luyện.',
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
      <main className="page-content owner-activity-page">
        <section
          className="panel"
          role="status"
        >
          Đang tải hoạt động huấn luyện...
        </section>
      </main>
    )
  }

  return (
    <main className="page-content owner-activity-page">
      <div className="breadcrumb">
        <Link to="/owner/horses">
          Ngựa của tôi
        </Link>

        <span>/</span>

        <strong>
          Hoạt động huấn luyện
        </strong>
      </div>

      <div className="page-heading owner-activity-heading">
        <div>
          <h1>
            Hoạt động huấn luyện
          </h1>

          <p>
            Theo dõi kết quả, tổng kết và
            những thay đổi liên quan đến quá
            trình huấn luyện ngựa của bạn.
          </p>
        </div>

        <button
          className="button button-secondary"
          type="button"
          disabled={
            refreshing
          }
          onClick={() =>
            void refresh()
          }
        >
          {refreshing
            ? 'Đang tải...'
            : 'Tải lại'}
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

      {!error && (
        <>
          <section className="owner-activity-summary">
            <article>
              <span>
                Tổng hoạt động
              </span>

              <strong>
                {
                  counters.total
                }
              </strong>
            </article>

            <article>
              <span>
                Kết quả mới
              </span>

              <strong>
                {
                  counters.result
                }
              </strong>
            </article>

            <article>
              <span>
                Tổng kết giai đoạn
              </span>

              <strong>
                {
                  counters.stage
                }
              </strong>
            </article>

            <article>
              <span>
                Giáo án
              </span>

              <strong>
                {
                  counters.plan
                }
              </strong>
            </article>

            <article>
              <span>
                Quan trọng
              </span>

              <strong>
                {
                  counters.important
                }
              </strong>
            </article>
          </section>

          <section className="filter-card owner-activity-filter">
            {FILTERS.map(
              (option) => (
                <button
                  className={`owner-activity-filter-button ${
                    filter ===
                    option.value
                      ? 'is-active'
                      : ''
                  }`}
                  type="button"
                  key={
                    option.value
                  }
                  onClick={() =>
                    setFilter(
                      option.value,
                    )
                  }
                >
                  {
                    option.label
                  }
                </button>
              ),
            )}
          </section>

          {filteredActivities.length ===
          0 ? (
            <section className="panel">
              <div className="empty-state">
                <h3>
                  Chưa có hoạt động phù hợp
                </h3>

                <p>
                  Khi có kết quả hoặc tổng kết
                  mới, thông tin sẽ xuất hiện
                  tại đây.
                </p>
              </div>
            </section>
          ) : (
            <section className="owner-activity-list">
              {filteredActivities.map(
                (
                  item,
                  index,
                ) => (
                  <article
                    className={`panel owner-activity-item ${activityTone(
                      item,
                    )}`}
                    key={`${item.Type}-${item.EntityName}-${item.EntityID}-${item.At || index}`}
                  >
                    <div
                      className="owner-activity-icon"
                      aria-hidden="true"
                    >
                      {activityIcon(
                        item.Type,
                      )}
                    </div>

                    <div className="owner-activity-content">
                      <div className="owner-activity-item-head">
                        <div>
                          <span className="owner-activity-type">
                            {TYPE_LABELS[
                              item.Type
                            ] ||
                              'Huấn luyện'}
                          </span>

                          <h2>
                            {
                              item.Title
                            }
                          </h2>
                        </div>

                        {item.Priority ===
                          'High' && (
                          <span className="owner-activity-priority">
                            Quan trọng
                          </span>
                        )}
                      </div>

                      {item.HorseName && (
                        <p className="owner-activity-horse">
                          {
                            item.HorseName
                          }
                        </p>
                      )}

                      {item.Message && (
                        <p className="owner-activity-message">
                          {
                            item.Message
                          }
                        </p>
                      )}

                      <div className="owner-activity-footer">
                        <span>
                          {formatDateTime(
                            item.At,
                          )}
                        </span>

                        <Link
                          className="button button-secondary"
                          to={activityLink(
                            item,
                          )}
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </section>
          )}
        </>
      )}
    </main>
  )
}