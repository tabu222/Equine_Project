import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  getTrainerAssignments,
  getTrainingPlans,
} from '../../api/trainingApi.ts'

const STATUS_LABELS = {
  Draft: 'Bản nháp',
  'Pending Approval': 'Chờ duyệt',
  Active: 'Đang áp dụng',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
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
    'en-US',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  ).format(date)
}

function statusTone(
  status,
) {
  switch (status) {
    case 'Draft':
      return 'is-draft'

    case 'Pending Approval':
      return 'is-pending'

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

async function fetchPageData() {
  const [
    assignments,
    plans,
  ] =
    await Promise.all([
      getTrainerAssignments({
        mine: true,
        Status: 'Active',
      }),

      getTrainingPlans({
        mine: true,
      }),
    ])

  return {
    assignments:
      Array.isArray(
        assignments,
      )
        ? assignments
        : [],

    plans:
      Array.isArray(
        plans,
      )
        ? plans
        : [],
  }
}

export default function TrainerPlansPage() {
  const [
    assignments,
    setAssignments,
  ] = useState([])

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

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('all')

  useEffect(() => {
    let active = true

    fetchPageData()
      .then((data) => {
        if (!active) {
          return
        }

        setAssignments(
          data.assignments,
        )

        setPlans(
          data.plans,
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
              'Không thể tải giáo án của Trainer.',
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

  const plansByHorse =
    useMemo(() => {
      const map =
        new Map()

      plans.forEach(
        (plan) => {
          const key =
            String(
              plan.HorseID,
            )

          const current =
            map.get(key) ||
            []

          current.push(
            plan,
          )

          map.set(
            key,
            current,
          )
        },
      )

      return map
    }, [plans])

  const assignmentCards =
    useMemo(
      () =>
        assignments.map(
          (assignment) => {
            const horsePlans =
              plansByHorse.get(
                String(
                  assignment.HorseID,
                ),
              ) || []

            const openPlan =
              horsePlans.find(
                (plan) =>
                  [
                    'Draft',
                    'Pending Approval',
                    'Active',
                  ].includes(
                    plan.Status,
                  ),
              ) || null

            return {
              ...assignment,
              HorsePlans:
                horsePlans,
              OpenPlan:
                openPlan,
            }
          },
        ),
      [
        assignments,
        plansByHorse,
      ],
    )

  const filteredPlans =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase()

      return plans.filter(
        (plan) => {
          const matchesSearch =
            !keyword ||
            String(
              plan.HorseName ||
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
            ) ||
            String(
              plan.Goal || '',
            )
              .toLowerCase()
              .includes(
                keyword,
              )

          const matchesStatus =
            statusFilter ===
              'all' ||
            plan.Status ===
              statusFilter

          return (
            matchesSearch &&
            matchesStatus
          )
        },
      )
    }, [
      plans,
      search,
      statusFilter,
    ])

  const summary =
    useMemo(
      () => ({
        horses:
          assignments.length,

        draft:
          plans.filter(
            (plan) =>
              plan.Status ===
              'Draft',
          ).length,

        pending:
          plans.filter(
            (plan) =>
              plan.Status ===
              'Pending Approval',
          ).length,

        active:
          plans.filter(
            (plan) =>
              plan.Status ===
              'Active',
          ).length,
      }),
      [
        assignments,
        plans,
      ],
    )

  async function refresh() {
    setRefreshing(true)
    setError('')

    try {
      const data =
        await fetchPageData()

      setAssignments(
        data.assignments,
      )

      setPlans(
        data.plans,
      )
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Không thể làm mới dữ liệu.',
        ),
      )
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content trainer-plans-list-page">
        <section
          className="panel training-plan-loading"
          role="status"
        >
          <div className="training-plan-loading-bar" />

          <div>
            <strong>
              Đang tải giáo án
            </strong>

            <span>
              Đang lấy ngựa được phân công
              và lịch sử Training Plan.
            </span>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page-content trainer-plans-list-page">
      <div className="breadcrumb">
        <span>
          Huấn luyện
        </span>

        <span>
          /
        </span>

        <strong>
          Ngựa & giáo án
        </strong>
      </div>

      <div className="page-heading training-plan-page-heading">
        <div>
          <p className="eyebrow">
            HUẤN LUYỆN VIÊN
          </p>

          <h1>
            Ngựa & giáo án của tôi
          </h1>

          <p>
            Theo dõi các ngựa đang phụ
            trách và mở Training Plan ở
            trang riêng.
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

      <section className="training-plan-summary-grid">
        <article>
          <span>
            Ngựa đang phụ trách
          </span>

          <strong>
            {summary.horses}
          </strong>
        </article>

        <article>
          <span>
            Bản nháp
          </span>

          <strong>
            {summary.draft}
          </strong>
        </article>

        <article>
          <span>
            Chờ duyệt
          </span>

          <strong>
            {summary.pending}
          </strong>
        </article>

        <article>
          <span>
            Đang áp dụng
          </span>

          <strong>
            {summary.active}
          </strong>
        </article>
      </section>

      <section className="panel training-plan-horse-section">
        <div className="training-plan-section-heading">
          <div>
            <span className="training-plan-kicker">
              ACTIVE ASSIGNMENTS
            </span>

            <h2>
              Ngựa đang phụ trách
            </h2>

            <p>
              Chỉ các ngựa thuộc Active
              Assignment của Trainer hiện
              tại.
            </p>
          </div>
        </div>

        {assignmentCards.length ===
        0 ? (
          <div className="empty-state">
            <h3>
              Chưa có ngựa được phân công
            </h3>

            <p>
              Head Trainer cần phân ngựa
              trước khi Trainer có thể tạo
              giáo án.
            </p>
          </div>
        ) : (
          <div className="training-plan-horse-grid">
            {assignmentCards.map(
              (assignment) => {
                const plan =
                  assignment.OpenPlan

                return (
                  <article
                    className="training-plan-horse-card"
                    key={
                      assignment.TrainerHorseAssignmentID
                    }
                  >
                    <div className="training-plan-horse-card-head">
                      <div>
                        <span className="training-plan-horse-code">
                          Phân công #
                          {
                            assignment.TrainerHorseAssignmentID
                          }
                        </span>

                        <h3>
                          {
                            assignment.HorseName
                          }
                        </h3>

                        <p>
                          {
                            assignment.SpecializationName
                          }
                        </p>
                      </div>

                      <span className="status-badge training-plan-assignment-status">
                        Đang phụ trách
                      </span>
                    </div>

                    <div className="training-plan-horse-info">
                      <div>
                        <span>
                          Bắt đầu phụ trách
                        </span>

                        <strong>
                          {formatDate(
                            assignment.StartDate,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Tổng giáo án
                        </span>

                        <strong>
                          {
                            assignment
                              .HorsePlans
                              .length
                          }
                        </strong>
                      </div>
                    </div>

                    {plan ? (
                      <div className="training-plan-current-plan">
                        <div>
                          <span>
                            Giáo án hiện tại
                          </span>

                          <strong>
                            #
                            {
                              plan.TrainingPlanID
                            }
                          </strong>
                        </div>

                        <span
                          className={`status-badge training-plan-status ${statusTone(
                            plan.Status,
                          )}`}
                        >
                          {STATUS_LABELS[
                            plan.Status
                          ] ||
                            plan.Status}
                        </span>

                        <p>
                          {show(
                            plan.Goal,
                            'Chưa nhập mục tiêu giáo án',
                          )}
                        </p>

                        <Link
                          className="button"
                          to={`/training/plans/${plan.TrainingPlanID}`}
                        >
                          {plan.Status === 'Draft' ? 'Xem và gửi duyệt' : 'Xem giáo án'}
                        </Link>
                        {plan.Status === 'Draft' && (
                          <Link className="button button-secondary" to={`/training/plans/${plan.TrainingPlanID}/edit`}>
                            Chỉnh sửa
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="training-plan-no-plan">
                        <strong>
                          Chưa có giáo án đang mở
                        </strong>

                        <p>
                          Chưa có giáo án nháp.
                        </p>

                        <Link
                          className="button"
                          to={`/training/plans/new?horseId=${assignment.HorseID}`}
                        >
                          Tạo giáo án
                        </Link>
                      </div>
                    )}
                  </article>
                )
              },
            )}
          </div>
        )}
      </section>

      <section className="panel training-plan-history-section">
        <div className="training-plan-section-heading">
          <div>
            <span className="training-plan-kicker">
              
            </span>

            <h2>
              Tất cả giáo án
            </h2>

            <p>
              
            </p>
          </div>
        </div>

        <div className="training-plan-filter-row">
          <label className="form-field">
            <span>
              Tìm giáo án
            </span>

            <input
              type="search"
              value={search}
              placeholder="Tên ngựa, mã plan, mục tiêu..."
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-field">
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

              <option value="Draft">
                Bản nháp
              </option>

              <option value="Pending Approval">
                Chờ duyệt
              </option>

              <option value="Active">
                Đang áp dụng
              </option>

              <option value="Completed">
                Hoàn thành
              </option>

              <option value="Cancelled">
                Đã hủy
              </option>
            </select>
          </label>
        </div>

        {filteredPlans.length ===
        0 ? (
          <div className="empty-state">
            <h3>
              Không có giáo án phù hợp
            </h3>

            <p>
              Thử thay đổi từ khóa hoặc
              trạng thái lọc.
            </p>
          </div>
        ) : (
          <div className="training-plan-history-list">
            {filteredPlans.map(
              (plan) => (
                <article
                  className="training-plan-history-item"
                  key={
                    plan.TrainingPlanID
                  }
                >
                  <div className="training-plan-history-main">
                    <div className="training-plan-title-line">
                      <h3>
                        {
                          plan.HorseName
                        }
                      </h3>

                      <span
                        className={`status-badge training-plan-status ${statusTone(
                          plan.Status,
                        )}`}
                      >
                        {STATUS_LABELS[
                          plan.Status
                        ] ||
                          plan.Status}
                      </span>
                    </div>

                    <p>
                      Giáo án #
                      {
                        plan.TrainingPlanID
                      }
                      {' · '}
                      {formatDate(
                        plan.StartDate,
                      )}
                      {' → '}
                      {plan.EndDate
                        ? formatDate(
                            plan.EndDate,
                          )
                        : 'Không giới hạn'}
                    </p>

                    <strong>
                      {show(
                        plan.Goal,
                        'Chưa có mục tiêu',
                      )}
                    </strong>
                  </div>

                  <div className="training-plan-history-meta">
                    <span>
                      {
                        plan.Stages.length
                      }{' '}
                      giai đoạn
                    </span>

                    <Link
                      className="button button-secondary"
                      to={`/training/plans/${plan.TrainingPlanID}`}
                    >
                      Xem chi tiết
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