import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  approveTrainingPlan,
  getTrainingPlan,
  getTrainingPlanTemplateReview,
  returnTrainingPlan,
} from '../../api/trainingApi.ts'

const INTENSITY_LABELS = {
  Low: 'Thấp',
  Moderate: 'Trung bình',
  High: 'Cao',
  'Very High': 'Rất cao',
}

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

export default function HeadTrainerPlanApprovalDetailPage() {
  const {
    planId,
  } = useParams()

  const [
    plan,
    setPlan,
  ] = useState(null)

  const [templateReview, setTemplateReview] = useState(null)
  const [templateError, setTemplateError] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    busy,
    setBusy,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    reviewNote,
    setReviewNote,
  ] = useState('')

  const [
    action,
    setAction,
  ] = useState(null)

  useEffect(() => {
    if (!planId) {
      return undefined
    }

    let active = true

    getTrainingPlanTemplateReview(planId)
      .then((data) => { if (active) { setTemplateReview(data); setTemplateError('') } })
      .catch(() => { if (active) setTemplateError('Không thể tải đối chiếu giáo án mẫu.') })

    getTrainingPlan(
      planId,
    )
      .then((data) => {
        if (!active) {
          return
        }

        setPlan(
          data,
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
              'Không thể tải giáo án.',
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
  }, [planId])

  async function approve() {
    if (!plan) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const updated =
        await approveTrainingPlan(
          plan.TrainingPlanID,
          reviewNote
            .trim() ||
            undefined,
        )

      setPlan(
        updated,
      )

      setAction(
        null,
      )

      setReviewNote(
        '',
      )

      setMessage(
        'Đã duyệt giáo án. Có thể lên lịch buổi tập.',
      )
    } catch (actionError) {
      setError(
        getErrorMessage(
          actionError,
          'Không thể duyệt giáo án.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function returnPlan() {
    if (!plan) {
      return
    }

    const note =
      reviewNote.trim()

    if (!note) {
      setError(
        'Vui lòng nhập lý do yêu cầu chỉnh sửa.',
      )

      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const updated =
        await returnTrainingPlan(
          plan.TrainingPlanID,
          note,
        )

      setPlan(
        updated,
      )

      setAction(
        null,
      )

      setReviewNote(
        '',
      )

      setMessage(
        'Đã trả giáo án để huấn luyện viên chỉnh sửa.',
      )
    } catch (actionError) {
      setError(
        getErrorMessage(
          actionError,
          'Không thể trả giáo án về Trainer.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content plan-approval-detail-page">
        <section
          className="panel plan-approval-loading"
          role="status"
        >
          <div className="plan-approval-loading-bar" />

          <div>
            <strong>
              Đang tải giáo án
            </strong>

            <span>
              Đang tải chi tiết giáo án.
            </span>
          </div>
        </section>
      </main>
    )
  }

  if (!plan) {
    return (
      <main className="page-content plan-approval-detail-page">
        <div
          className="alert-banner"
          role="alert"
        >
          {error ||
            'Không tìm thấy giáo án.'}
        </div>

        <Link
          className="button"
          to="/training/approvals"
        >
          Quay lại danh sách
        </Link>
      </main>
    )
  }

  const pending =
    plan.Status ===
    'Pending Approval'

  return (
    <main className="page-content plan-approval-detail-page">
      <div className="breadcrumb">
        <Link to="/training/dashboard">
          Huấn luyện
        </Link>

        <span>
          /
        </span>

        <Link to="/training/approvals">
          Duyệt giáo án
        </Link>

        <span>
          /
        </span>

        <strong>
          Plan #
          {
            plan.TrainingPlanID
          }
        </strong>
      </div>

      <div className="page-heading plan-approval-page-heading">
        <div>
          <p className="eyebrow">
            HUẤN LUYỆN VIÊN TRƯỞNG
          </p>

          <h1>
            {plan.HorseName}
          </h1>

          <p>
            Giáo án #
            {
              plan.TrainingPlanID
            }
            {' · '}
            Huấn luyện viên{' '}
            <strong>
              {
                plan.TrainerName
              }
            </strong>
          </p>
        </div>

        <div className="plan-approval-detail-heading-actions">
          <span
            className={`status-badge plan-approval-status ${statusTone(
              plan.Status,
            )}`}
          >
            {STATUS_LABELS[
              plan.Status
            ] ||
              plan.Status}
          </span>

          <Link
            className="button button-secondary"
            to="/training/approvals"
          >
            Quay lại
          </Link>
        </div>
      </div>

      {error && (
        <div
          className="alert-banner"
          role="alert"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className="success-message"
          role="status"
        >
          {message}
        </div>
      )}

      {!pending && (
        <section className="plan-approval-state-banner">
          <strong>
            Giáo án không còn chờ duyệt
          </strong>

          <p>
            Trạng thái hiện tại:{' '}
            <strong>
              {STATUS_LABELS[
                plan.Status
              ] ||
                plan.Status}
            </strong>
            .
          </p>

          {plan.Status ===
            'Active' && (
            <span>
              Có thể bắt đầu lên lịch buổi tập.
            </span>
          )}

          {plan.Status ===
            'Draft' && (
            <span>
              Giáo án đã được trả về để chỉnh sửa.
            </span>
          )}
        </section>
      )}

      {plan.ReviewNote && (
        <section className="plan-approval-previous-note">
          <span>
            PHẢN HỒI TRƯỚC ĐÓ
          </span>

          <p>
            {
              plan.ReviewNote
            }
          </p>
        </section>
      )}

      {templateReview?.TemplateID && (
        <section className="panel plan-approval-overview">
          <h2>Đối chiếu giáo án mẫu</h2>
          <p>Giáo án mẫu: {templateReview.TemplateName || 'Không có tên'}</p>
          {templateReview.ChangedFromTemplate === false ? (
            <p>Huấn luyện viên giữ nguyên giáo án mẫu.</p>
          ) : Array.isArray(templateReview.Changes) && templateReview.Changes.length > 0 ? (
            <div className="training-template-changes">
              {templateReview.Changes.map((change, index) => (
                <div key={`${change.Field}-${change.StageOrder ?? 'plan'}-${index}`} className="training-template-change-row">
                  <strong>{change.StageOrder != null ? `Giai đoạn ${change.StageOrder} · ` : ''}{({Goal:'Mục tiêu', OverallIntensity:'Cường độ', DurationDays:'Số ngày', DailyStructure:'Lịch tập hằng ngày', WeeklyPattern:'Lịch tập hằng tuần', StageName:'Tên giai đoạn', TrainingLoad:'Mức tải', DistanceTargetKm:'Cự ly mục tiêu', StartDay:'Ngày bắt đầu', Intensity:'Cường độ', Surface:'Mặt sân', Note:'Ghi chú', ExitCriteria:'Điều kiện hoàn tất', Stage:'Giai đoạn'})[change.Field] || change.Field}</strong>
                  <div>Giáo án mẫu: {change.Template == null ? 'Không có' : String(change.Template)}</div>
                  <div>Giáo án gửi duyệt: {change.Plan == null ? 'Không có' : String(change.Plan)}</div>
                </div>
              ))}
            </div>
          ) : <p>Chưa có dữ liệu đối chiếu.</p>}
        </section>
      )}
      {templateError && <p role="status">{templateError}</p>}

      <section className="panel plan-approval-overview">
        <div className="plan-approval-section-head">
          <div>
            <span className="plan-approval-kicker">
              THÔNG TIN GIÁO ÁN
            </span>

            <h2>
              Thông tin giáo án
            </h2>

            <p>
              Kiểm tra thời gian, mục tiêu
              và cường độ trước khi quyết
              định.
            </p>
          </div>
        </div>

        <div className="plan-approval-overview-grid">
          <div>
            <span>
              Ngựa
            </span>

            <strong>
              {
                plan.HorseName
              }
            </strong>
          </div>

          <div>
            <span>
              Trainer phụ trách
            </span>

            <strong>
              {
                plan.TrainerName
              }
            </strong>
          </div>

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
              {plan.EndDate
                ? formatDate(
                    plan.EndDate,
                  )
                : 'Không giới hạn'}
            </strong>
          </div>

          <div>
            <span>
              Cường độ tổng thể
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
              Số Stage
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

          <div>
            <span>
              Tạo lúc
            </span>

            <strong>
              {formatDateTime(
                plan.CreatedAt,
              )}
            </strong>
          </div>

          <div>
            <span>
              Gửi duyệt
            </span>

            <strong>
              {formatDateTime(
                plan.SubmittedAt,
              )}
            </strong>
          </div>
        </div>

        <div className="plan-approval-text-block">
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

        {plan.Note && (
          <div className="plan-approval-text-block">
            <span>
              Ghi chú Trainer
            </span>

            <p>
              {
                plan.Note
              }
            </p>
          </div>
        )}
      </section>

      <section className="panel plan-approval-stage-section">
        <div className="plan-approval-section-head">
          <div>
            <span className="plan-approval-kicker">
              TRAINING STAGES
            </span>

            <h2>
              Các giai đoạn huấn luyện
            </h2>

            <p>
              Head Trainer cần xem toàn bộ
              Stage trước khi kích hoạt
              giáo án.
            </p>
          </div>
        </div>

        {!Array.isArray(
          plan.Stages,
        ) ||
        plan.Stages.length ===
          0 ? (
          <div className="empty-state">
            <h3>
              Giáo án chưa có Stage
            </h3>

            
          </div>
        ) : (
          <div className="plan-approval-stage-list">
            {plan.Stages.map(
              (stage) => (
                <article
                  className="plan-approval-stage-card"
                  key={
                    stage.TrainingPlanStageID
                  }
                >
                  <div className="plan-approval-stage-head">
                    <div>
                      <span className="plan-approval-stage-number">
                        STAGE{' '}
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
                        {' → '}
                        {stage.EndDate
                          ? formatDate(
                              stage.EndDate,
                            )
                          : plan.EndDate
                            ? formatDate(
                                plan.EndDate,
                              )
                            : 'Không giới hạn'}
                      </p>
                    </div>

                    <span className="status-badge plan-approval-intensity-badge">
                      {INTENSITY_LABELS[
                        stage.Intensity
                      ] ||
                        show(
                          stage.Intensity,
                        )}
                    </span>
                  </div>

                  <div className="plan-approval-stage-metrics">
                    <div>
                      <span>
                        Training Load
                      </span>

                      <strong>
                        {show(
                          stage.TrainingLoad,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Distance Target
                      </span>

                      <strong>
                        {stage.DistanceTargetKm ===
                          null ||
                        stage.DistanceTargetKm ===
                          undefined
                          ? '—'
                          : `${stage.DistanceTargetKm} km`}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Surface
                      </span>

                      <strong>
                        {show(
                          stage.Surface,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="plan-approval-text-block">
                    <span>
                      Mục tiêu Stage
                    </span>

                    <p>
                      {show(
                        stage.Goal,
                        'Không có mục tiêu riêng.',
                      )}
                    </p>
                  </div>

                  {stage.Note && (
                    <div className="plan-approval-text-block">
                      <span>
                        Ghi chú Stage
                      </span>

                      <p>
                        {
                          stage.Note
                        }
                      </p>
                    </div>
                  )}
                </article>
              ),
            )}
          </div>
        )}
      </section>

      {pending && (
        <section className="panel plan-approval-decision-section">
          <div className="plan-approval-section-head">
            <div>
              <span className="plan-approval-kicker">
                APPROVAL
              </span>

              <h2>
                Quyết định của Head Trainer
              </h2>

              <p>
                Duyệt sẽ kích hoạt Plan.
                Trả về bắt buộc phải có lý
                do.
              </p>
            </div>
          </div>

          <label className="form-field">
            <span>
              Nhận xét duyệt / lý do trả về
            </span>

            <textarea
              rows="5"
              maxLength="1000"
              value={
                reviewNote
              }
              placeholder="Nếu duyệt: nhận xét là tùy chọn. Nếu trả về Huấn luyện viên: lý do là bắt buộc."
              onChange={(event) =>
                setReviewNote(
                  event.target.value,
                )
              }
            />

            <small>
              Tối đa 1000 ký tự.
            </small>
          </label>

          <div className="plan-approval-decision-actions">
            <button
              className="button plan-approval-return-button"
              type="button"
              disabled={busy}
              onClick={() => {
                setError('')

                if (
                  !reviewNote
                    .trim()
                ) {
                  setError(
                    'Cần nhập lý do trước khi trả giáo án về Trainer.',
                  )

                  return
                }

                setAction(
                  'return',
                )
              }}
            >
              Trả về Trainer
            </button>

            <button
              className="button"
              type="button"
              disabled={busy}
              onClick={() => {
                setError('')
                setAction(
                  'approve',
                )
              }}
            >
              Duyệt giáo án
            </button>
          </div>
        </section>
      )}

      {action && (
        <div
          className="plan-approval-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget &&
              !busy
            ) {
              setAction(
                null,
              )
            }
          }}
        >
          <section
            className="plan-approval-modal"
            role="dialog"
            aria-modal="true"
          >
            {action ===
              'approve' ? (
              <>
                <span className="plan-approval-kicker">
                  APPROVE PLAN
                </span>

                <h2>
                  Duyệt giáo án?
                </h2>

                <p>
                  Giáo án #
                  {
                    plan.TrainingPlanID
                  }{' '}
                  của{' '}
                  <strong>
                    {
                      plan.HorseName
                    }
                  </strong>{' '}
                  sẽ chuyển từ{' '}
                  <strong>
                    Pending Approval
                  </strong>{' '}
                  sang{' '}
                  <strong>
                    Active
                  </strong>
                  .
                </p>

                <div className="plan-approval-modal-info">
                  Sau khi Active, Phase 8
                  mới bắt đầu xếp Training
                  Session và phân Work Rider
                  cho từng buổi tập.
                </div>

                {reviewNote.trim() && (
                  <div className="plan-approval-modal-note">
                    <span>
                      Nhận xét
                    </span>

                    <p>
                      {
                        reviewNote
                      }
                    </p>
                  </div>
                )}

                <div className="plan-approval-modal-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setAction(
                        null,
                      )
                    }
                  >
                    Xem lại
                  </button>

                  <button
                    className="button"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void approve()
                    }
                  >
                    {busy
                      ? 'Đang duyệt...'
                      : 'Xác nhận duyệt'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="plan-approval-kicker">
                  RETURN PLAN
                </span>

                <h2>
                  Trả giáo án về Trainer?
                </h2>

                <p>
                  Giáo án #
                  {
                    plan.TrainingPlanID
                  }{' '}
                  sẽ trở lại trạng thái{' '}
                  <strong>
                    Draft
                  </strong>
                  .
                </p>

                <div className="plan-approval-modal-return-reason">
                  <span>
                    Lý do trả về
                  </span>

                  <p>
                    {
                      reviewNote
                    }
                  </p>
                </div>

                <div className="plan-approval-modal-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setAction(
                        null,
                      )
                    }
                  >
                    Xem lại
                  </button>

                  <button
                    className="button plan-approval-modal-return-button"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void returnPlan()
                    }
                  >
                    {busy
                      ? 'Đang trả về...'
                      : 'Xác nhận trả về'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}