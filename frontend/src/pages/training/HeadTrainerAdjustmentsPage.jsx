import {
  useEffect,
  useState,
} from 'react'

import {
  getTrainingReviews,
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

export default function HeadTrainerAdjustmentsPage() {
  const [
    reviews,
    setReviews,
  ] = useState([])

  const [
    days,
    setDays,
  ] = useState(30)

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

  async function load(
    rangeDays,
  ) {
    const rows =
      await getTrainingReviews({
        AdjustmentRequired:
          true,

        Days:
          rangeDays,
      })

    return Array.isArray(
      rows,
    )
      ? rows
      : []
  }

  useEffect(() => {
    let active = true

    load(days)
      .then(
        (rows) => {
          if (!active) {
            return
          }

          setReviews(
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
              'Không thể tải yêu cầu điều chỉnh.',
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
    days,
  ])

  async function refresh() {
    setRefreshing(
      true,
    )

    setError('')

    try {
      const rows =
        await load(
          days,
        )

      setReviews(
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

  if (loading) {
    return (
      <main className="page-content head-trainer-adjustment-page">
        <section
          className="panel"
          role="status"
        >
          Đang tải yêu cầu điều chỉnh...
        </section>
      </main>
    )
  }

  return (
    <main className="page-content head-trainer-adjustment-page">
      <div className="breadcrumb">
        <span>
          Huấn luyện
        </span>

        <span>
          /
        </span>

        <strong>
          Điều chỉnh giáo án
        </strong>
      </div>

      <div className="page-heading">
        <div>
          <h1>
            Yêu cầu điều chỉnh giáo án
          </h1>

          <p>
            Các đánh giá của Trainer đề xuất
            thay đổi giáo án huấn luyện.
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

      <section className="filter-card head-trainer-adjustment-filter">
        <label className="filter-field">
          <span>
            Khoảng thời gian
          </span>

          <select
            value={
              days
            }
            onChange={(event) =>
              setDays(
                Number(
                  event.target.value,
                ),
              )
            }
          >
            <option value="7">
              7 ngày gần đây
            </option>

            <option value="14">
              14 ngày gần đây
            </option>

            <option value="30">
              30 ngày gần đây
            </option>

            <option value="90">
              90 ngày gần đây
            </option>
          </select>
        </label>
      </section>

      <section className="panel">
        {reviews.length ===
        0 ? (
          <div className="empty-state">
            <h3>
              Không có yêu cầu điều chỉnh
            </h3>

            <p>
              Chưa có đánh giá nào đề xuất
              thay đổi giáo án trong khoảng thời gian này.
            </p>
          </div>
        ) : (
          <div className="head-trainer-adjustment-list">
            {reviews.map(
              (review) => (
                <article
                  className="head-trainer-adjustment-card"
                  key={
                    review
                      .TrainingReviewID
                  }
                >
                  <div className="head-trainer-adjustment-card-head">
                    <div>
                      <h3>
                        {
                          review.HorseName
                        }
                      </h3>

                      <p>
                        {formatDate(
                          review.SessionDate,
                        )}
                        {' · '}
                        {
                          review.TrainerName
                        }
                      </p>
                    </div>

                    <span className="status-badge">
                      {EVALUATION_LABELS[
                        review.Evaluation
                      ] ||
                        review.Evaluation}
                    </span>
                  </div>

                  {review.TrainerComment && (
                    <div className="head-trainer-adjustment-block">
                      <span>
                        Nhận xét của Trainer
                      </span>

                      <p>
                        {
                          review.TrainerComment
                        }
                      </p>
                    </div>
                  )}

                  <div className="head-trainer-adjustment-request">
                    <span>
                      Nội dung cần điều chỉnh
                    </span>

                    <p>
                      {
                        review.AdjustmentNote
                      }
                    </p>
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