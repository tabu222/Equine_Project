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
  getTrainingSessions,
} from '../../api/trainingApi.ts'

const EVALUATION_LABELS = {
  Excellent: 'Xuất sắc',
  Good: 'Tốt',
  Average: 'Trung bình',
  'Needs Improvement':
    'Cần cải thiện',
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

export default function TrainerReviewQueuePage() {
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
    view,
    setView,
  ] = useState(
    'pending',
  )

  const [
    search,
    setSearch,
  ] = useState('')

  async function loadReviews() {
    /*
     * Không dùng mine=1 cho Completed Session.
     *
     * Khi Session có Substitute Trainer,
     * mine=1 không trả Session đó cho Trainer
     * phụ trách.
     *
     * Ta lấy:
     * - Active assignment của Trainer
     * - toàn bộ Plan của Trainer
     * - Completed Session của CLB
     *
     * rồi lọc theo Plan thuộc Active Assignment.
     */
    const [
      assignmentRows,
      planRows,
      completedRows,
    ] =
      await Promise.all([
        getTrainerAssignments({
          mine: true,
          Status: 'Active',
        }),

        getTrainingPlans({
          mine: true,
        }),

        getTrainingSessions({
          Status:
            'Completed',
        }),
      ])

    const assignments =
      Array.isArray(
        assignmentRows,
      )
        ? assignmentRows
        : []

    const plans =
      Array.isArray(
        planRows,
      )
        ? planRows
        : []

    const completed =
      Array.isArray(
        completedRows,
      )
        ? completedRows
        : []

    const activeAssignmentIds =
      new Set(
        assignments.map(
          (assignment) =>
            String(
              assignment
                .TrainerHorseAssignmentID,
            ),
        ),
      )

    const reviewablePlanIds =
      new Set(
        plans
          .filter(
            (plan) =>
              activeAssignmentIds.has(
                String(
                  plan
                    .TrainerHorseAssignmentID,
                ),
              ),
          )
          .map(
            (plan) =>
              String(
                plan.TrainingPlanID,
              ),
          ),
      )

    return completed.filter(
      (session) =>
        reviewablePlanIds.has(
          String(
            session
              .TrainingPlanID,
          ),
        ),
    )
  }

  useEffect(() => {
    let active = true

    loadReviews()
      .then(
        (rows) => {
          if (!active) {
            return
          }

          setSessions(
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
              'Không thể tải danh sách đánh giá.',
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

  async function refresh() {
    setRefreshing(
      true,
    )

    setError('')

    try {
      const rows =
        await loadReviews()

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

  const filteredSessions =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase()

      return sessions.filter(
        (session) => {
          const matchesState =
            view === 'pending'
              ? !session.Review
              : Boolean(
                  session.Review,
                )

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
            matchesState &&
            matchesSearch
          )
        },
      )
    }, [
      sessions,
      view,
      search,
    ])

  const pendingCount =
    sessions.filter(
      (session) =>
        !session.Review,
    ).length

  const reviewedCount =
    sessions.filter(
      (session) =>
        Boolean(
          session.Review,
        ),
    ).length

  if (loading) {
    return (
      <main className="page-content trainer-review-page">
        <section
          className="panel"
          role="status"
        >
          Đang tải danh sách đánh giá...
        </section>
      </main>
    )
  }

  return (
    <main className="page-content trainer-review-page">
      <div className="breadcrumb">
        <span>
          Huấn luyện
        </span>

        <span>
          /
        </span>

        <strong>
          Đánh giá buổi tập
        </strong>
      </div>

      <div className="page-heading">
        <div>
          <h1>
            Đánh giá buổi tập
          </h1>

          <p>
            Xem kết quả Work Rider và
            đánh giá các buổi tập đã hoàn thành.
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

      <section className="trainer-review-summary">
        <button
          className={
            view === 'pending'
              ? 'trainer-review-summary-card is-active'
              : 'trainer-review-summary-card'
          }
          type="button"
          onClick={() =>
            setView(
              'pending',
            )
          }
        >
          <span>
            Chờ đánh giá
          </span>

          <strong>
            {pendingCount}
          </strong>
        </button>

        <button
          className={
            view === 'reviewed'
              ? 'trainer-review-summary-card is-active'
              : 'trainer-review-summary-card'
          }
          type="button"
          onClick={() =>
            setView(
              'reviewed',
            )
          }
        >
          <span>
            Đã đánh giá
          </span>

          <strong>
            {reviewedCount}
          </strong>
        </button>
      </section>

      <section className="filter-card trainer-review-filter">
        <label className="filter-field">
          <span>
            Tìm kiếm
          </span>

          <input
            type="search"
            value={
              search
            }
            placeholder="Tên ngựa, Nhân viên cưỡi ngựa, bài tập..."
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />
        </label>
      </section>

      <section className="panel">
        {filteredSessions.length ===
        0 ? (
          <div className="empty-state">
            <h3>
              {view ===
              'pending'
                ? 'Không có buổi tập chờ đánh giá'
                : 'Chưa có buổi tập đã đánh giá'}
            </h3>

            <p>
              {view ===
              'pending'
                ? 'Các buổi tập hoàn thành và chưa được đánh giá sẽ xuất hiện tại đây.'
                : 'Lịch sử đánh giá sẽ xuất hiện tại đây.'}
            </p>
          </div>
        ) : (
          <div className="table-card trainer-review-table-wrapper">
            <table className="data-table trainer-review-table">
              <thead>
                <tr>
                  <th>
                    Ngày tập
                  </th>

                  <th>
                    Ngựa
                  </th>

                  <th>
                    Giai đoạn
                  </th>

                  <th>
                    Bài tập
                  </th>

                  <th>
                    Work Rider
                  </th>

                  <th>
                    Kết quả
                  </th>

                  <th>
                    Đánh giá
                  </th>

                  <th>
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSessions.map(
                  (session) => (
                    <tr
                      key={
                        session
                          .TrainingSessionID
                      }
                    >
                      <td>
                        {formatDate(
                          session
                            .SessionDate,
                        )}
                      </td>

                      <td>
                        <strong>
                          {
                            session
                              .HorseName
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          session
                            .StageName
                        }
                      </td>

                      <td>
                        {
                          session
                            .TrainingType
                        }
                      </td>

                      <td>
                        {
                          session
                            .WorkRiderName
                        }
                      </td>

                      <td>
                        {session.Result
                          ?.PerformanceScore ??
                          '—'}
                      </td>

                      <td>
                        {session.Review
                          ? (
                            <span className="status-badge">
                              {EVALUATION_LABELS[
                                session
                                  .Review
                                  .Evaluation
                              ] ||
                                session
                                  .Review
                                  .Evaluation}
                            </span>
                          )
                          : (
                            <span className="status-badge">
                              Chờ đánh giá
                            </span>
                          )}
                      </td>

                      <td>
                        <Link
                          className="button button-secondary"
                          to={`/training/sessions/${session.TrainingSessionID}/review`}
                        >
                          {session.Review
                            ? 'Xem đánh giá'
                            : 'Đánh giá'}
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}