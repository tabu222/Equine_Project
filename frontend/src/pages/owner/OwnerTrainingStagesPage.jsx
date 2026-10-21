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
  getOwnerTrainingPlans,
} from '../../api/trainingApi.ts'

const STATUS_LABELS = {
  Active: 'Đang thực hiện',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
}

const STAGE_LABELS = {
  NotStarted: 'Chưa bắt đầu',
  InProgress: 'Đang thực hiện',
  Closed: 'Đã kết thúc',
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

export default function OwnerTrainingStagesPage() {
  const {
    horseId,
  } = useParams()

  const [
    plans,
    setPlans,
  ] = useState([])

  const [
    planDetails,
    setPlanDetails,
  ] = useState({})

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

    async function load() {
      const response =
        await getOwnerTrainingPlans(
          horseId,
        )

      const rows =
        Array.isArray(
          response?.Plans,
        )
          ? response.Plans
          : []

      const detailRows =
        await Promise.all(
          rows.map(
            (plan) =>
              getOwnerTrainingPlan(
                plan.TrainingPlanID,
              ),
          ),
        )

      if (!active) {
        return
      }

      const lookup = {}

      detailRows.forEach(
        (plan) => {
          lookup[
            plan.TrainingPlanID
          ] = plan
        },
      )

      setPlans(
        rows,
      )

      setPlanDetails(
        lookup,
      )
    }

    load()
      .then(() => {
        if (active) {
          setError('')
        }
      })
      .catch(
        (loadError) => {
          if (!active) {
            return
          }

          setError(
            getErrorMessage(
              loadError,
              'Không thể tải các giai đoạn huấn luyện.',
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

  if (loading) {
    return (
      <main className="page-content owner-stages-page">
        <section
          className="panel"
          role="status"
        >
          Đang tải các giai đoạn huấn luyện...
        </section>
      </main>
    )
  }

  return (
    <main className="page-content owner-stages-page">
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
          Giai đoạn huấn luyện
        </strong>
      </div>

      <div className="page-heading">
        <div>
          <h1>
            Giai đoạn huấn luyện
          </h1>

          <p>
            Theo dõi tiến độ và kết quả
            theo từng giai đoạn.
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

      {!error &&
      plans.length === 0 ? (
        <section className="panel">
          <div className="empty-state">
            <h3>
              Chưa có giáo án huấn luyện
            </h3>

            <p>
              Giáo án đã được duyệt sẽ
              xuất hiện tại đây.
            </p>
          </div>
        </section>
      ) : (
        <div className="owner-plan-stage-list">
          {plans.map(
            (plan) => {
              const detail =
                planDetails[
                  plan
                    .TrainingPlanID
                ]

              const stages =
                detail?.Stages ||
                []

              return (
                <section
                  className="panel owner-plan-stage-card"
                  key={
                    plan
                      .TrainingPlanID
                  }
                >
                  <div className="owner-plan-stage-head">
                    <div>
                      <h2>
                        {plan.Goal ||
                          'Giáo án huấn luyện'}
                      </h2>

                      <p>
                        {
                          plan.TrainerName
                        }
                        {' · '}
                        {formatDate(
                          plan.StartDate,
                        )}
                        {' - '}
                        {formatDate(
                          plan.EndDate,
                        )}
                      </p>
                    </div>

                    <span className="status-badge">
                      {STATUS_LABELS[
                        plan.Status
                      ] ||
                        plan.Status}
                    </span>
                  </div>

                  {stages.length ===
                  0 ? (
                    <div className="empty-state">
                      <p>
                        Giáo án chưa có
                        giai đoạn.
                      </p>
                    </div>
                  ) : (
                    <div className="owner-stage-list">
                      {stages.map(
                        (stage) => (
                          <article
                            className="owner-stage-list-item"
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

                            <div className="owner-stage-list-actions">
                              <span className="status-badge">
                                {stage.IsOverdue
                                  ? 'Quá hạn'
                                  : STAGE_LABELS[
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
                                Xem tổng kết
                              </Link>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </section>
              )
            },
          )}
        </div>
      )}
    </main>
  )
}