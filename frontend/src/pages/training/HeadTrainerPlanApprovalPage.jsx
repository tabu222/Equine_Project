import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  getTrainingPlans,
} from '../../api/trainingApi.ts'

const INTENSITY_LABELS = {
  Low: 'Thấp',
  Moderate: 'Trung bình',
  High: 'Cao',
  'Very High': 'Rất cao',
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

function formatDate(
  value,
) {
  if (!value) {
    return '—'
  }

  const raw =
    String(value)

  const date =
    raw.includes('T')
      ? new Date(raw)
      : new Date(
          `${raw}T00:00:00`,
        )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return raw
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
    'vi-VN',
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

async function fetchPendingPlans() {
  const rows =
    await getTrainingPlans({
      Status:
        'Pending Approval',
    })

  return Array.isArray(
    rows,
  )
    ? rows
    : []
}

export default function HeadTrainerPlanApprovalPage() {
  const [
    plans,
    setPlans,
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
    search,
    setSearch,
  ] = useState('')

  useEffect(() => {
    let active = true

    fetchPendingPlans()
      .then((rows) => {
        if (!active) {
          return
        }

        setPlans(
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
              'Không thể tải giáo án chờ duyệt.',
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
  }, [])

  const filteredPlans =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase()

      if (!keyword) {
        return plans
      }

      return plans.filter(
        (plan) =>
          String(
            plan.HorseName ||
              '',
          )
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          String(
            plan.TrainerName ||
              '',
          )
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          String(
            plan.Goal ||
              '',
          )
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          String(
            plan.TrainingPlanID,
          ).includes(
            keyword,
          ),
      )
    }, [
      plans,
      search,
    ])

  const summary =
    useMemo(
      () => ({
        total:
          plans.length,

        stages:
          plans.reduce(
            (
              count,
              plan,
            ) =>
              count +
              (
                Array.isArray(
                  plan.Stages,
                )
                  ? plan.Stages
                      .length
                  : 0
              ),
            0,
          ),

        trainers:
          new Set(
            plans.map(
              (plan) =>
                plan.TrainerID,
            ),
          ).size,

        horses:
          new Set(
            plans.map(
              (plan) =>
                plan.HorseID,
            ),
          ).size,
      }),
      [plans],
    )

  async function refresh() {
    setRefreshing(true)
    setError('')

    try {
      const rows =
        await fetchPendingPlans()

      setPlans(
        rows,
      )
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Không thể làm mới danh sách chờ duyệt.',
        ),
      )
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content plan-approval-list-page">
        <section
          className="panel plan-approval-loading"
          role="status"
        >
          <div className="plan-approval-loading-bar" />

          <div>
            <strong>
              Đang tải giáo án chờ duyệt
            </strong>

            <span>
              Đang lấy các Training Plan
              có trạng thái Pending
              Approval.
            </span>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page-content plan-approval-list-page">
      <div className="breadcrumb">
        <Link to="/training/dashboard">
          Huấn luyện
        </Link>

        <span>
          /
        </span>

        <strong>
          Duyệt giáo án
        </strong>
      </div>

      <div className="page-heading plan-approval-page-heading">
        <div>
          <p className="eyebrow">
            HEAD TRAINER
          </p>

          <h1>
            Giáo án chờ duyệt
          </h1>

          <p>
            Kiểm tra Training Plan và toàn
            bộ Stage trước khi kích hoạt.
          </p>
        </div>

        <button
          className="button button-secondary"
          type="button"
          disabled={refreshing}
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

      <section className="plan-approval-summary">
        <article>
          <span>
            Chờ duyệt
          </span>

          <strong>
            {summary.total}
          </strong>
        </article>

        <article>
          <span>
            Ngựa
          </span>

          <strong>
            {summary.horses}
          </strong>
        </article>

        <article>
          <span>
            Trainer
          </span>

          <strong>
            {summary.trainers}
          </strong>
        </article>

        <article>
          <span>
            Tổng Stage
          </span>

          <strong>
            {summary.stages}
          </strong>
        </article>
      </section>

      <section className="filter-card plan-approval-filter">
        <label className="filter-field">
          <span>
            Tìm giáo án
          </span>

          <input
            type="search"
            value={search}
            placeholder="Tên ngựa, Trainer, mã Plan, mục tiêu..."
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />
        </label>

        <div className="plan-approval-filter-result">
          <strong>
            {
              filteredPlans.length
            }
          </strong>

          <span>
            giáo án
          </span>
        </div>
      </section>

      <section className="panel plan-approval-list-panel">
        <div className="plan-approval-section-head">
          <div>
            <span className="plan-approval-kicker">
              PENDING APPROVAL
            </span>

            <h2>
              Danh sách chờ xử lý
            </h2>

            <p>
              Chỉ hiển thị Plan có Status =
              Pending Approval.
            </p>
          </div>
        </div>

        {plans.length ===
        0 ? (
          <div className="empty-state">
            <h3>
              Không có giáo án chờ duyệt
            </h3>

            <p>
              Khi Trainer gửi Training Plan,
              giáo án sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : filteredPlans.length ===
          0 ? (
          <div className="empty-state">
            <h3>
              Không tìm thấy giáo án
            </h3>

            <p>
              Không có kết quả phù hợp với
              từ khóa hiện tại.
            </p>

            <button
              className="button button-secondary"
              type="button"
              onClick={() =>
                setSearch(
                  '',
                )
              }
            >
              Xóa tìm kiếm
            </button>
          </div>
        ) : (
          <div className="plan-approval-list">
            {filteredPlans.map(
              (plan) => (
                <article
                  className="plan-approval-card"
                  key={
                    plan.TrainingPlanID
                  }
                >
                  <div className="plan-approval-card-main">
                    <div className="plan-approval-card-title">
                      <div>
                        <span className="plan-approval-plan-code">
                          TRAINING PLAN #
                          {
                            plan.TrainingPlanID
                          }
                        </span>

                        <h3>
                          {
                            plan.HorseName
                          }
                        </h3>

                        <p>
                          Trainer:{' '}
                          <strong>
                            {
                              plan.TrainerName
                            }
                          </strong>
                        </p>
                      </div>

                      <span className="status-badge plan-approval-pending-badge">
                        Chờ duyệt
                      </span>
                    </div>

                    <div className="plan-approval-card-meta">
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
                          Cường độ
                        </span>

                        <strong>
                          {INTENSITY_LABELS[
                            plan.OverallIntensity
                          ] ||
                            show(
                              plan.OverallIntensity,
                            )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Stage
                        </span>

                        <strong>
                          {Array.isArray(
                            plan.Stages,
                          )
                            ? plan.Stages
                                .length
                            : 0}
                        </strong>
                      </div>
                    </div>

                    <div className="plan-approval-goal">
                      <span>
                        Mục tiêu giáo án
                      </span>

                      <p>
                        {show(
                          plan.Goal,
                          'Trainer chưa nhập mục tiêu.',
                        )}
                      </p>
                    </div>

                    <div className="plan-approval-submitted">
                      Gửi duyệt:{' '}
                      <strong>
                        {formatDateTime(
                          plan.SubmittedAt,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="plan-approval-card-action">
                    <Link
                      className="button"
                      to={`/training/approvals/${plan.TrainingPlanID}`}
                    >
                      Xem & duyệt giáo án
                    </Link>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  )
}