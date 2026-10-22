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

const OWNER_EVENT_TYPES =
  new Set([
    'OWNER_PLAN_APPROVED',
    'OWNER_SESSION_STOPPED',
    'OWNER_TRAINING_LOCKED',
    'OWNER_TRAINING_UNLOCKED',
  ])

const EVENT_LABELS = {
  OWNER_PLAN_APPROVED:
    'Giáo án mới',

  OWNER_SESSION_STOPPED:
    'Buổi tập đã dừng',

  OWNER_TRAINING_LOCKED:
    'Tạm dừng huấn luyện',

  OWNER_TRAINING_UNLOCKED:
    'Được phép tập luyện',
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

function eventTone(
  item,
) {
  if (
    item.Priority ===
    'High'
  ) {
    return 'is-high'
  }

  switch (item.Type) {
    case 'OWNER_PLAN_APPROVED':
      return 'is-success'

    case 'OWNER_TRAINING_UNLOCKED':
      return 'is-success'

    case 'OWNER_TRAINING_LOCKED':
      return 'is-warning'

    case 'OWNER_SESSION_STOPPED':
      return 'is-danger'

    default:
      return ''
  }
}

function eventIcon(
  type,
) {
  switch (type) {
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

function eventLink(
  item,
) {
  if (!item.HorseID) {
    return '/owner/horses'
  }

  switch (item.Type) {
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

export default function OwnerTrainingEventsPage() {
  const [
    events,
    setEvents,
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

  const loadEvents =
    async () => {
      const result =
        await getNotifications()

      return Array.isArray(
        result,
      )
        ? result.filter(
            (item) =>
              OWNER_EVENT_TYPES.has(
                item.Type,
              ),
          )
        : []
    }

  useEffect(() => {
    let active = true

    loadEvents()
      .then(
        (rows) => {
          if (!active) {
            return
          }

          setEvents(
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
              'Không thể tải sự kiện huấn luyện.',
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

  const orderedEvents =
    useMemo(
      () =>
        [...events].sort(
          (a, b) => {
            if (
              a.Priority !==
              b.Priority
            ) {
              if (
                a.Priority ===
                'High'
              ) {
                return -1
              }

              if (
                b.Priority ===
                'High'
              ) {
                return 1
              }
            }

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
        events,
      ],
    )

  async function refresh() {
    setRefreshing(
      true,
    )

    setError('')

    try {
      const rows =
        await loadEvents()

      setEvents(
        rows,
      )
    } catch (
      loadError
    ) {
      setError(
        getErrorMessage(
          loadError,
          'Không thể tải lại sự kiện huấn luyện.',
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
      <main className="page-content owner-events-page">
        <section
          className="panel"
          role="status"
        >
          Đang tải sự kiện huấn luyện...
        </section>
      </main>
    )
  }

  return (
    <main className="page-content owner-events-page">
      <div className="breadcrumb">
        <Link to="/owner/horses">
          Ngựa của tôi
        </Link>

        <span>/</span>

        <strong>
          Sự kiện huấn luyện
        </strong>
      </div>

      <div className="page-heading owner-events-heading">
        <div>
          <h1>
            Sự kiện huấn luyện
          </h1>

          <p>
            Các thay đổi quan trọng liên quan
            đến quá trình huấn luyện ngựa của bạn.
          </p>
        </div>

        <></>
      </div>

      {error && (
        <div
          className="alert-banner"
          role="alert"
        >
          {error}
        </div>
      )}

      {!error &&
      orderedEvents.length ===
        0 ? (
        <section className="panel">
          <div className="empty-state">
            <h3>
              Chưa có sự kiện mới
            </h3>

            <p>
              Những thay đổi quan trọng trong
              quá trình huấn luyện sẽ được
              hiển thị tại đây.
            </p>
          </div>
        </section>
      ) : (
        <section className="owner-event-list">
          {orderedEvents.map(
            (
              item,
              index,
            ) => (
              <article
                className={`panel owner-event-card ${eventTone(
                  item,
                )}`}
                key={`${item.Type}-${item.EntityName}-${item.EntityID}-${item.At || index}`}
              >
                <div
                  className="owner-event-icon"
                  aria-hidden="true"
                >
                  {eventIcon(
                    item.Type,
                  )}
                </div>

                <div className="owner-event-content">
                  <div className="owner-event-card-head">
                    <div>
                      <span className="owner-event-category">
                        {EVENT_LABELS[
                          item.Type
                        ] ||
                          'Huấn luyện'}
                      </span>

                      <h2>
                        {item.Title}
                      </h2>
                    </div>

                    {item.Priority ===
                      'High' && (
                      <span className="owner-event-priority">
                        Quan trọng
                      </span>
                    )}
                  </div>

                  {item.HorseName && (
                    <p className="owner-event-horse">
                      {item.HorseName}
                    </p>
                  )}

                  {item.Message && (
                    <p className="owner-event-message">
                      {item.Message}
                    </p>
                  )}

                  <div className="owner-event-footer">
                    <span>
                      {formatDateTime(
                        item.At,
                      )}
                    </span>

                    <Link
                      className="button button-secondary"
                      to={eventLink(
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
    </main>
  )
}