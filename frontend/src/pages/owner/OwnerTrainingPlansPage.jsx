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
  getOwnerTrainingPlans,
} from '../../api/trainingApi.ts'

const STATUS_LABELS = {
  Active: 'Đang thực hiện',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
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

function formatPercent(
  value,
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
    return '—'
  }

  return `${Math.round(
    number,
  )}%`
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

export default function OwnerTrainingPlansPage() {
  const {
    horseId,
  } = useParams()

  const [
    horse,
    setHorse,
  ] = useState(null)

  const [
    plans,
    setPlans,
  ] = useState([])

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('all')

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    if (!horseId) {
      return undefined
    }

    let active = true

    getOwnerTrainingPlans(
      horseId,
    )
      .then(
        (data) => {
          if (!active) {
            return
          }

          setHorse({
            HorseID:
              data.HorseID,

            HorseName:
              data.HorseName,

            HorseCode:
              data.HorseCode,
          })

          setPlans(
            Array.isArray(
              data.Plans,
            )
              ? data.Plans
              : [],
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
              'Không thể tải danh sách giáo án.',
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
  ])

  const filteredPlans =
    useMemo(
      () =>
        plans.filter(
          (plan) =>
            statusFilter ===
              'all' ||
            plan.Status ===
              statusFilter,
        ),
      [
        plans,
        statusFilter,
      ],
    )

  if (loading) {
    return (
      <main className="page-content owner-plan-page">
        <section
          className="panel"
          role="status"
        >
          Đang tải giáo án huấn luyện...
        </section>
      </main>
    )
  }

  return (
    <main className="page-content owner-plan-page">
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
          Giáo án huấn luyện
        </strong>
      </div>

      <div className="page-heading">
        <div>
          <h1>
            Giáo án huấn luyện
          </h1>

          <p>
            {horse?.HorseName
              ? `Theo dõi tiến độ huấn luyện của ${horse.HorseName}.`
              : 'Theo dõi tiến độ các giáo án huấn luyện.'}
          </p>
        </div>

        <Link
          className="button button-secondary"
          to={`/owner/horses/${horseId}/training`}
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

      {!error && (
        <>
          <section className="filter-card owner-plan-filter">
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

                <option value="Active">
                  Đang thực hiện
                </option>

                <option value="Completed">
                  Đã hoàn thành
                </option>

                <option value="Cancelled">
                  Đã hủy
                </option>
              </select>
            </label>
          </section>

          {filteredPlans.length ===
          0 ? (
            <section className="panel">
              <div className="empty-state">
                <h3>
                  Chưa có giáo án phù hợp
                </h3>

                <p>
                  Giáo án đã được phê duyệt sẽ
                  xuất hiện tại đây.
                </p>
              </div>
            </section>
          ) : (
            <div className="owner-plan-list">
              {filteredPlans.map(
                (plan) => (
                  <article
                    className="panel owner-plan-card"
                    key={
                      plan
                        .TrainingPlanID
                    }
                  >
                    <div className="owner-plan-card-head">
                      <div>
                        <h2>
                          {plan.Goal ||
                            'Giáo án huấn luyện'}
                        </h2>

                        <p>
                          {plan.TrainerName}
                          {' · '}
                          {plan.SpecializationName}
                        </p>
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

                    <div className="owner-plan-info-grid">
                      <div>
                        <span>
                          Bắt đầu
                        </span>

                        <strong>
                          {formatDate(
                            plan.StartDate,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Kết thúc
                        </span>

                        <strong>
                          {formatDate(
                            plan.EndDate,
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

                      <div>
                        <span>
                          Giai đoạn hiện tại
                        </span>

                        <strong>
                          {plan.CurrentStageName ||
                            '—'}
                        </strong>
                      </div>
                    </div>

                    <div className="owner-plan-progress">
                      <div className="owner-plan-progress-head">
                        <span>
                          Tiến độ
                        </span>

                        <strong>
                          {formatPercent(
                            plan.ProgressPercent,
                          )}
                        </strong>
                      </div>

                      <div className="owner-plan-progress-track">
                        <span
                          style={{
                            width: `${
                              Math.max(
                                0,
                                Math.min(
                                  100,
                                  Number(
                                    plan.ProgressPercent,
                                  ) || 0,
                                ),
                              )
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="owner-plan-card-actions">
                      <Link
                        className="button button-secondary"
                        to={`/owner/horses/${horseId}/training/plans/${plan.TrainingPlanID}`}
                      >
                        Xem tổng quan
                      </Link>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}