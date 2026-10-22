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
  getHorseAssessments,
  getTrainingDashboard,
} from '../../api/trainingApi.ts'

const FITNESS_LABELS = {
  Excellent: 'Rất tốt',
  Good: 'Tốt',
  Average: 'Trung bình',
  'Needs Monitoring':
    'Cần theo dõi',
}

const DECISION_LABELS = {
  Recommended:
    'Đề xuất',
  Rejected:
    'Không đề xuất',
  Superseded:
    'Đã thay thế',
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

function fitnessLabel(
  value,
) {
  return (
    FITNESS_LABELS[value] ||
    show(
      value,
      'Chưa đánh giá',
    )
  )
}

function decisionLabel(
  value,
) {
  return (
    DECISION_LABELS[value] ||
    show(value)
  )
}

function decisionTone(
  value,
) {
  switch (value) {
    case 'Recommended':
      return 'is-recommended'

    case 'Rejected':
      return 'is-rejected'

    case 'Superseded':
      return 'is-superseded'

    default:
      return 'is-neutral'
  }
}

function scoreTone(
  value,
) {
  const numeric =
    Number(value)

  if (
    value === null ||
    value === undefined ||
    value === '' ||
    Number.isNaN(
      numeric,
    )
  ) {
    return ''
  }

  if (numeric >= 85) {
    return 'is-high'
  }

  if (numeric >= 70) {
    return 'is-medium'
  }

  return 'is-low'
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

async function fetchHistoryData(
  horseId,
) {
  const [
    dashboardRows,
    assessmentRows,
  ] =
    await Promise.all([
      getTrainingDashboard(
        horseId,
      ),

      getHorseAssessments(
        horseId,
      ),
    ])

  return {
    horse:
      Array.isArray(
        dashboardRows,
      )
        ? dashboardRows[0] ||
          null
        : null,

    assessments:
      Array.isArray(
        assessmentRows,
      )
        ? assessmentRows
        : [],
  }
}

export default function HorseAssessmentHistoryPage() {
  const {
    horseId,
  } = useParams()

  const [
    horse,
    setHorse,
  ] = useState(null)

  const [
    assessments,
    setAssessments,
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
    decisionFilter,
    setDecisionFilter,
  ] = useState('all')

  const [
    specializationFilter,
    setSpecializationFilter,
  ] = useState('all')

  useEffect(() => {
    if (!horseId) {
      return undefined
    }

    let active = true

    fetchHistoryData(
      horseId,
    )
      .then((data) => {
        if (!active) {
          return
        }

        setHorse(
          data.horse,
        )

        setAssessments(
          data.assessments,
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
              'Không thể tải lịch sử đánh giá.',
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
  }, [horseId])

  const specializationOptions =
    useMemo(() => {
      const map =
        new Map()

      assessments.forEach(
        (item) => {
          if (
            item.SpecializationID &&
            item.SpecializationName
          ) {
            map.set(
              String(
                item.SpecializationID,
              ),
              item.SpecializationName,
            )
          }
        },
      )

      return Array.from(
        map.entries(),
      ).map(
        ([
          value,
          label,
        ]) => ({
          value,
          label,
        }),
      )
    }, [assessments])

  const filteredAssessments =
    useMemo(() => {
      return assessments.filter(
        (item) => {
          const matchesDecision =
            decisionFilter ===
              'all' ||
            item.DecisionStatus ===
              decisionFilter

          const matchesSpecialization =
            specializationFilter ===
              'all' ||
            String(
              item.SpecializationID,
            ) ===
              specializationFilter

          return (
            matchesDecision &&
            matchesSpecialization
          )
        },
      )
    }, [
      assessments,
      decisionFilter,
      specializationFilter,
    ])

  const summary =
    useMemo(() => {
      return {
        total:
          assessments.length,

        recommended:
          assessments.filter(
            (item) =>
              item.DecisionStatus ===
              'Recommended',
          ).length,

        rejected:
          assessments.filter(
            (item) =>
              item.DecisionStatus ===
              'Rejected',
          ).length,

        superseded:
          assessments.filter(
            (item) =>
              item.DecisionStatus ===
              'Superseded',
          ).length,
      }
    }, [assessments])

  async function refresh() {
    if (!horseId) {
      return
    }

    setRefreshing(true)
    setError('')

    try {
      const data =
        await fetchHistoryData(
          horseId,
        )

      setHorse(
        data.horse,
      )

      setAssessments(
        data.assessments,
      )
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Không thể làm mới lịch sử đánh giá.',
        ),
      )
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content assessment-history-page">
        <section
          className="panel assessment-history-loading"
          role="status"
        >
          <div className="assessment-history-loading-indicator" />

          <div>
            <strong>
              Đang tải lịch sử đánh giá
            </strong>

            <span>
              Hệ thống đang lấy các
              Assessment của ngựa.
            </span>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page-content assessment-history-page">
      <div className="breadcrumb">
        <Link to="/training/dashboard">
          Huấn luyện
        </Link>

        <span>
          /
        </span>

        <Link
          to={`/training/horses/${horseId}/assessment`}
        >
          Đánh giá ngựa
        </Link>

        <span>
          /
        </span>

        <strong>
          Lịch sử
        </strong>
      </div>

      <div className="page-heading assessment-history-heading">
        <div>
          <p className="eyebrow">
            HEAD TRAINER
          </p>

          <h1>
            Lịch sử đánh giá
          </h1>

          <p>
            Theo dõi toàn bộ Assessment
            đã được ghi nhận cho{' '}
            <strong>
              {show(
                horse?.HorseName,
                `ngựa #${horseId}`,
              )}
            </strong>
            {horse?.HorseCode
              ? ` · ${horse.HorseCode}`
              : ''}
            .
          </p>
        </div>

        <div className="assessment-history-heading-actions">
          <></>

          <Link
            className="button"
            to={`/training/horses/${horseId}/assessment`}
          >
            Tạo đánh giá mới
          </Link>
        </div>
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

          <></>
        </div>
      )}

      <section
        className="assessment-history-summary"
        aria-label="Thống kê lịch sử đánh giá"
      >
        <article className="assessment-history-stat">
          <span>
            Tổng đánh giá
          </span>

          <strong>
            {summary.total}
          </strong>

          <small>
            Tất cả Assessment đã lưu
          </small>
        </article>

        <article className="assessment-history-stat is-recommended">
          <span>
            Đang đề xuất
          </span>

          <strong>
            {summary.recommended}
          </strong>

          <small>
            DecisionStatus = Recommended
          </small>
        </article>

        <article className="assessment-history-stat is-rejected">
          <span>
            Không đề xuất
          </span>

          <strong>
            {summary.rejected}
          </strong>

          <small>
            DecisionStatus = Rejected
          </small>
        </article>

        <article className="assessment-history-stat is-superseded">
          <span>
            Đã thay thế
          </span>

          <strong>
            {summary.superseded}
          </strong>

          <small>
            Assessment cũ đã bị thay thế
          </small>
        </article>
      </section>

      <section className="filter-card assessment-history-filter">
        <label className="filter-field">
          <span>
            Trạng thái đánh giá
          </span>

          <select
            value={
              decisionFilter
            }
            onChange={(event) =>
              setDecisionFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              Tất cả trạng thái
            </option>

            <option value="Recommended">
              Đề xuất
            </option>

            <option value="Rejected">
              Không đề xuất
            </option>

            <option value="Superseded">
              Đã thay thế
            </option>
          </select>
        </label>

        <label className="filter-field">
          <span>
            Chuyên môn
          </span>

          <select
            value={
              specializationFilter
            }
            onChange={(event) =>
              setSpecializationFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              Tất cả chuyên môn
            </option>

            {specializationOptions.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {
                    option.label
                  }
                </option>
              ),
            )}
          </select>
        </label>

        <div className="assessment-history-result-count">
          <strong>
            {
              filteredAssessments.length
            }
          </strong>

          <span>
            / {assessments.length} kết quả
          </span>
        </div>
      </section>

      <section className="panel assessment-history-panel">
        <div className="assessment-history-panel-head">
          <div>
            <h2>
              Các lần đánh giá
            </h2>

            
          </div>
        </div>

        {assessments.length ===
        0 ? (
          <div className="empty-state assessment-history-empty">
            <h3>
              Chưa có đánh giá
            </h3>

            <p>
              Ngựa này chưa có Assessment
              nào trong hệ thống.
            </p>

            <Link
              className="button"
              to={`/training/horses/${horseId}/assessment`}
            >
              Tạo đánh giá đầu tiên
            </Link>
          </div>
        ) : filteredAssessments
            .length === 0 ? (
          <div className="empty-state assessment-history-empty">
            <h3>
              Không có kết quả phù hợp
            </h3>

            <p>
              Không có Assessment nào phù
              hợp với bộ lọc hiện tại.
            </p>

            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setDecisionFilter(
                  'all',
                )

                setSpecializationFilter(
                  'all',
                )
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="assessment-history-timeline">
            {filteredAssessments.map(
              (
                item,
                index,
              ) => {
                const tone =
                  decisionTone(
                    item.DecisionStatus,
                  )

                return (
                  <article
                    className={`assessment-history-item ${tone}`}
                    key={
                      item.AssessmentID
                    }
                  >
                    <div className="assessment-history-marker-column">
                      <span className="assessment-history-marker" />

                      {index !==
                        filteredAssessments.length -
                          1 && (
                        <span className="assessment-history-line" />
                      )}
                    </div>

                    <div className="assessment-history-item-content">
                      <div className="assessment-history-item-head">
                        <div>
                          <div className="assessment-history-title-row">
                            <h3>
                              {
                                item.SpecializationName
                              }
                            </h3>

                            <span
                              className={`status-badge assessment-history-status ${tone}`}
                            >
                              {decisionLabel(
                                item.DecisionStatus,
                              )}
                            </span>
                          </div>

                          <p>
                            Assessment #
                            {
                              item.AssessmentID
                            }
                            {' · '}
                            {formatDateTime(
                              item.AssessmentDate,
                            )}
                          </p>
                        </div>

                        <div className="assessment-history-head-trainer">
                          <span>
                            Head Trainer
                          </span>

                          <strong>
                            {show(
                              item.HeadTrainerName,
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="assessment-history-details">
                        <div className="assessment-history-score">
                          <span>
                            Điểm chất lượng
                          </span>

                          <strong
                            className={scoreTone(
                              item.QualityScore,
                            )}
                          >
                            {show(
                              item.QualityScore,
                              'Chưa chấm',
                            )}
                          </strong>

                          {item.QualityScore !==
                            null &&
                            item.QualityScore !==
                              undefined && (
                              <small>
                                / 100
                              </small>
                            )}
                        </div>

                        <div>
                          <span>
                            Thể trạng
                          </span>

                          <strong>
                            {fitnessLabel(
                              item.FitnessLevel,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Chuyên môn
                          </span>

                          <strong>
                            {
                              item.SpecializationName
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Trạng thái
                          </span>

                          <strong>
                            {decisionLabel(
                              item.DecisionStatus,
                            )}
                          </strong>
                        </div>
                      </div>

                      {item.AssessmentNote && (
                        <div className="assessment-history-note">
                          <span>
                            Ghi chú đánh giá
                          </span>

                          <p>
                            {
                              item.AssessmentNote
                            }
                          </p>
                        </div>
                      )}

                      {item.DecisionStatus ===
                        'Superseded' && (
                        <div className="assessment-history-explanation">
                          Assessment này đã
                          được thay thế bởi
                          một Assessment
                          Recommended mới hơn
                          cùng chuyên môn.
                        </div>
                      )}

                      {item.DecisionStatus ===
                        'Rejected' && (
                        <div className="assessment-history-explanation is-rejected">
                          Head Trainer đã
                          đánh giá ngựa không
                          phù hợp với đề xuất
                          chuyên môn này tại
                          thời điểm đánh giá.
                        </div>
                      )}
                    </div>
                  </article>
                )
              },
            )}
          </div>
        )}
      </section>

      <div className="assessment-history-footer-actions">
        <Link
          className="button button-secondary"
          to="/training/dashboard"
        >
          Về tổng quan huấn luyện
        </Link>

        <Link
          className="button"
          to={`/training/horses/${horseId}/assessment`}
        >
          Quay lại đánh giá
        </Link>
      </div>
    </main>
  )
}