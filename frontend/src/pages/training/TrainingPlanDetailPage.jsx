import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  cancelTrainingPlan,
  closeTrainingPlanStage,
  completeTrainingPlan,
  getTrainerAssignments,
  getTrainingPlan,
  reviseTrainingPlan,
  submitTrainingPlan,
} from '../../api/trainingApi.ts'

const STATUS_LABELS = {
  Draft: 'Bản nháp',
  'Pending Approval': 'Chờ duyệt',
  Active: 'Đang áp dụng',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
}

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

export default function TrainingPlanDetailPage() {
  const {
    planId,
  } = useParams()

  const navigate =
    useNavigate()

  const [
    plan,
    setPlan,
  ] = useState(null)

  const [
    assignments,
    setAssignments,
  ] = useState([])

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
    confirmAction,
    setConfirmAction,
  ] = useState(null)

  const [
    cancelReason,
    setCancelReason,
  ] = useState('')

  const [
    closingStage,
    setClosingStage,
  ] = useState(null)

  const [
    summaryNote,
    setSummaryNote,
  ] = useState('')

  useEffect(() => {
    if (!planId) {
      return undefined
    }

    let active = true

    Promise.all([
      getTrainingPlan(
        planId,
      ),

      getTrainerAssignments({
        mine: true,
        Status: 'Active',
      }),
    ])
      .then(
        ([
          planData,
          assignmentRows,
        ]) => {
          if (!active) {
            return
          }

          setPlan(
            planData,
          )

          setAssignments(
            Array.isArray(
              assignmentRows,
            )
              ? assignmentRows
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

  const assignmentActive =
    useMemo(
      () =>
        plan
          ? assignments.some(
              (assignment) =>
                assignment
                  .TrainerHorseAssignmentID ===
                plan
                  .TrainerHorseAssignmentID,
            )
          : false,
      [
        assignments,
        plan,
      ],
    )

  async function reloadPlan() {
    if (!planId) {
      return
    }

    const data =
      await getTrainingPlan(
        planId,
      )

    setPlan(
      data,
    )
  }

  async function submitPlan() {
    if (!plan) {
      return
    }

    if (
      plan.Stages.length ===
      0
    ) {
      setConfirmAction(
        null,
      )

      setError(
        'Giáo án cần ít nhất một Stage trước khi gửi duyệt.',
      )

      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await submitTrainingPlan(
        plan.TrainingPlanID,
      )

      setConfirmAction(
        null,
      )

      await reloadPlan()

      setMessage(
        'Đã gửi giáo án cho Head Trainer duyệt.',
      )
    } catch (actionError) {
      setError(
        getErrorMessage(
          actionError,
          'Không thể gửi giáo án duyệt.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function cancelPlan() {
    if (!plan) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await cancelTrainingPlan(
        plan.TrainingPlanID,
        cancelReason
          .trim() ||
          undefined,
      )

      setConfirmAction(
        null,
      )

      setCancelReason(
        '',
      )

      await reloadPlan()

      setMessage(
        'Đã hủy giáo án.',
      )
    } catch (actionError) {
      setError(
        getErrorMessage(
          actionError,
          'Không thể hủy giáo án.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function completePlan() {
    if (!plan) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await completeTrainingPlan(
        plan.TrainingPlanID,
      )

      setConfirmAction(
        null,
      )

      await reloadPlan()

      setMessage(
        'Đã hoàn tất giáo án.',
      )
    } catch (actionError) {
      setError(
        getErrorMessage(
          actionError,
          'Không thể hoàn tất giáo án.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function revisePlan() {
    if (!plan) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const created =
        await reviseTrainingPlan(
          plan.TrainingPlanID,
        )

      setConfirmAction(
        null,
      )

      navigate(
        `/training/plans/${created.TrainingPlanID}/edit`,
      )
    } catch (actionError) {
      setError(
        getErrorMessage(
          actionError,
          'Không thể tạo bản điều chỉnh.',
        ),
      )

      setBusy(false)
    }
  }

  async function closeStage() {
    if (
      !closingStage
    ) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await closeTrainingPlanStage(
        closingStage
          .TrainingPlanStageID,
        summaryNote
          .trim() ||
          null,
      )

      setClosingStage(
        null,
      )

      setSummaryNote(
        '',
      )

      await reloadPlan()

      setMessage(
        'Đã chốt giai đoạn. Chủ ngựa có thể xem tổng kết.',
      )
    } catch (actionError) {
      setError(
        getErrorMessage(
          actionError,
          'Không thể chốt giai đoạn.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content training-plan-detail-page">
        <section
          className="panel training-plan-loading"
          role="status"
        >
          <div className="training-plan-loading-bar" />

          <div>
            <strong>
              Đang tải Training Plan
            </strong>

            <span>
              Đang lấy thông tin giáo án và
              các Stage.
            </span>
          </div>
        </section>
      </main>
    )
  }

  if (!plan) {
    return (
      <main className="page-content training-plan-detail-page">
        <div
          className="alert-banner"
          role="alert"
        >
          {error ||
            'Không tìm thấy giáo án.'}
        </div>

        <Link
          className="button"
          to="/training/my-plans"
        >
          Quay lại danh sách
        </Link>
      </main>
    )
  }

  return (
    <main className="page-content training-plan-detail-page">
      <div className="breadcrumb">
        <Link to="/training/my-plans">
          Ngựa & giáo án
        </Link>

        <span>
          /
        </span>

        <strong>
          Giáo án #
          {
            plan.TrainingPlanID
          }
        </strong>
      </div>

      <div className="page-heading training-plan-page-heading">
        <div>
          <p className="eyebrow">
            TRAINING PLAN
          </p>

          <h1>
            {plan.HorseName}
          </h1>

          <p>
            Giáo án #
            {
              plan.TrainingPlanID
            }{' '}
            · Trainer{' '}
            {
              plan.TrainerName
            }
          </p>
        </div>

        <div className="training-plan-detail-top-actions">
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

          <Link
            className="button button-secondary"
            to="/training/my-plans"
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

      {plan.Status ===
        'Draft' &&
        plan.ReviewNote && (
        <section className="training-plan-return-banner">
          <strong>
            Head Trainer đã trả giáo án về
          </strong>

          <p>
            {
              plan.ReviewNote
            }
          </p>

          <span>
            Chỉnh sửa giáo án rồi gửi duyệt
            lại.
          </span>
        </section>
      )}

      <section className="panel training-plan-detail-overview">
        <div className="training-plan-section-heading">
          <div>
            <span className="training-plan-kicker">
              TỔNG QUAN
            </span>

            <h2>
              Thông tin giáo án
            </h2>
          </div>
        </div>

        <div className="training-plan-detail-grid">
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
              Trainer
            </span>

            <strong>
              {
                plan.TrainerName
              }
            </strong>
          </div>

          <div>
            <span>
              Ngày bắt đầu
            </span>

            <strong>
              {formatDate(
                plan.StartDate,
              )}
            </strong>
          </div>

          <div>
            <span>
              Ngày kết thúc
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

          <div>
            <span>
              Được duyệt
            </span>

            <strong>
              {formatDateTime(
                plan.ApprovedAt,
              )}
            </strong>
          </div>
        </div>

        <div className="training-plan-detail-text-block">
          <span>
            Mục tiêu
          </span>

          <p>
            {show(
              plan.Goal,
              'Chưa có mục tiêu.',
            )}
          </p>
        </div>

        {plan.Note && (
          <div className="training-plan-detail-text-block">
            <span>
              Ghi chú
            </span>

            <p>
              {
                plan.Note
              }
            </p>
          </div>
        )}

        {plan.ReviewNote &&
          plan.Status !==
            'Draft' && (
          <div className="training-plan-detail-text-block">
            <span>
              {plan.Status ===
              'Cancelled'
                ? 'Lý do hủy / ghi chú'
                : 'Ghi chú duyệt'}
            </span>

            <p>
              {
                plan.ReviewNote
              }
            </p>
          </div>
        )}
      </section>

      <section className="panel training-plan-detail-actions-panel">
        <div className="training-plan-section-heading">
          <div>
            <span className="training-plan-kicker">
              ACTIONS
            </span>

            <h2>
              Thao tác giáo án
            </h2>
          </div>
        </div>

        <div className="training-plan-detail-actions">
          {plan.Status ===
            'Draft' &&
            assignmentActive && (
            <>
              <Link
                className="button button-secondary"
                to={`/training/plans/${plan.TrainingPlanID}/edit`}
              >
                Chỉnh sửa giáo án
              </Link>

              <button
                className="button"
                type="button"
                disabled={busy}
                onClick={() =>
                  setConfirmAction(
                    'submit',
                  )
                }
              >
                Gửi duyệt
              </button>
            </>
          )}

          {plan.Status ===
            'Pending Approval' && (
            <div className="training-plan-readonly-state">
              Giáo án đang chờ Head Trainer
              duyệt. Trainer không thể sửa
              trong trạng thái này.
            </div>
          )}

          {plan.Status ===
            'Active' &&
            assignmentActive && (
            <>
            <Link
  className="button"
  to={`/training/schedule?planId=${plan.TrainingPlanID}`}
>
  Lịch tập
</Link>

              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() =>
                  setConfirmAction(
                    'revise',
                  )
                }
              >
                Tạo bản điều chỉnh
              </button>

              <button
                className="button"
                type="button"
                disabled={busy}
                onClick={() =>
                  setConfirmAction(
                    'complete',
                  )
                }
              >
                Hoàn tất giáo án
              </button>
            </>
          )}

          {plan.Status ===
            'Completed' &&
            assignmentActive && (
            <button
              className="button button-secondary"
              type="button"
              disabled={busy}
              onClick={() =>
                setConfirmAction(
                  'revise',
                )
              }
            >
              Tạo bản điều chỉnh
            </button>
          )}

          {[
            'Draft',
            'Pending Approval',
            'Active',
          ].includes(
            plan.Status,
          ) &&
            assignmentActive && (
            <button
              className="training-plan-danger-button"
              type="button"
              disabled={busy}
              onClick={() => {
                setCancelReason(
                  '',
                )

                setConfirmAction(
                  'cancel',
                )
              }}
            >
              Hủy giáo án
            </button>
          )}

          {!assignmentActive &&
            [
              'Draft',
              'Active',
              'Completed',
            ].includes(
              plan.Status,
            ) && (
            <div className="training-plan-readonly-state">
              Phân công Trainer của giáo án
              này không còn Active nên các
              thao tác chỉnh sửa bị khóa.
            </div>
          )}
        </div>
      </section>

      <section className="panel training-plan-stage-detail-section">
        <div className="training-plan-section-heading">
          <div>
            <span className="training-plan-kicker">
              STAGES
            </span>

            <h2>
              Giai đoạn huấn luyện
            </h2>

            <p>
              {
                plan.Stages.length
              }{' '}
              Stage trong giáo án.
            </p>
          </div>

          {plan.Status ===
            'Draft' &&
            assignmentActive && (
            <Link
              className="button button-secondary"
              to={`/training/plans/${plan.TrainingPlanID}/edit`}
            >
              Quản lý Stage
            </Link>
          )}
        </div>

        {plan.Stages.length ===
        0 ? (
          <div className="empty-state">
            <h3>
              Chưa có Stage
            </h3>

            <p>
              Thêm ít nhất một Stage trước
              khi gửi giáo án duyệt.
            </p>

            {plan.Status ===
              'Draft' &&
              assignmentActive && (
              <Link
                className="button"
                to={`/training/plans/${plan.TrainingPlanID}/edit`}
              >
                Thêm Stage
              </Link>
            )}
          </div>
        ) : (
          <div className="training-plan-stage-detail-list">
            {plan.Stages.map(
              (stage) => {
                const canClose =
                  assignmentActive &&
                  [
                    'Active',
                    'Completed',
                  ].includes(
                    plan.Status,
                  ) &&
                  !stage.ClosedAt

                return (
                  <article
                    className={`training-plan-stage-detail-card ${
                      stage.ClosedAt
                        ? 'is-closed'
                        : ''
                    }`}
                    key={
                      stage.TrainingPlanStageID
                    }
                  >
                    <div className="training-plan-stage-detail-head">
                      <div>
                        <span className="training-plan-kicker">
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

                      <div>
                        {stage.ClosedAt ? (
                          <span className="status-badge training-plan-stage-closed">
                            Đã chốt
                          </span>
                        ) : canClose ? (
                          <button
                            className="button button-secondary"
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setClosingStage(
                                stage,
                              )

                              setSummaryNote(
                                '',
                              )
                            }}
                          >
                            Chốt Stage
                          </button>
                        ) : (
                          <span className="status-badge training-plan-stage-open">
                            Đang mở
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="training-plan-stage-metrics">
                      <div>
                        <span>
                          Cường độ
                        </span>

                        <strong>
                          {INTENSITY_LABELS[
                            stage.Intensity
                          ] ||
                            show(
                              stage.Intensity,
                            )}
                        </strong>
                      </div>

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
                          Quãng đường mục tiêu
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
                          Mặt sân
                        </span>

                        <strong>
                          {show(
                            stage.Surface,
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="training-plan-detail-text-block">
                      <span>
                        Mục tiêu Stage
                      </span>

                      <p>
                        {show(
                          stage.Goal,
                          'Chưa có mục tiêu riêng.',
                        )}
                      </p>
                    </div>

                    {stage.Note && (
                      <div className="training-plan-detail-text-block">
                        <span>
                          Ghi chú
                        </span>

                        <p>
                          {
                            stage.Note
                          }
                        </p>
                      </div>
                    )}

                    {stage.ClosedAt && (
                      <div className="training-plan-stage-summary">
                        <div>
                          <span>
                            Chốt lúc
                          </span>

                          <strong>
                            {formatDateTime(
                              stage.ClosedAt,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Người chốt
                          </span>

                          <strong>
                            {show(
                              stage.ClosedByName,
                            )}
                          </strong>
                        </div>

                        <div className="training-plan-stage-summary-note">
                          <span>
                            Tổng kết Trainer
                          </span>

                          <p>
                            {show(
                              stage.SummaryNote,
                              'Không có ghi chú tổng kết.',
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </article>
                )
              },
            )}
          </div>
        )}
      </section>

      {confirmAction && (
        <div
          className="training-plan-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget &&
              !busy
            ) {
              setConfirmAction(
                null,
              )
            }
          }}
        >
          <section
            className="training-plan-modal"
            role="dialog"
            aria-modal="true"
          >
            {confirmAction ===
              'submit' && (
              <>
                <h2>
                  Gửi giáo án duyệt?
                </h2>

                

                <div className="training-plan-modal-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setConfirmAction(
                        null,
                      )
                    }
                  >
                    Chưa gửi
                  </button>

                  <button
                    className="button"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void submitPlan()
                    }
                  >
                    {busy
                      ? 'Đang gửi...'
                      : 'Gửi duyệt'}
                  </button>
                </div>
              </>
            )}

            {confirmAction ===
              'revise' && (
              <>
                <h2>
                  Tạo bản điều chỉnh?
                </h2>

                

                <div className="training-plan-modal-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setConfirmAction(
                        null,
                      )
                    }
                  >
                    Hủy
                  </button>

                  <button
                    className="button"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void revisePlan()
                    }
                  >
                    {busy
                      ? 'Đang tạo...'
                      : 'Tạo Draft điều chỉnh'}
                  </button>
                </div>
              </>
            )}

            {confirmAction ===
              'complete' && (
              <>
                <h2>
                  Hoàn tất giáo án?
                </h2>

                

                <div className="training-plan-modal-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setConfirmAction(
                        null,
                      )
                    }
                  >
                    Chưa hoàn tất
                  </button>

                  <button
                    className="button"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void completePlan()
                    }
                  >
                    {busy
                      ? 'Đang xử lý...'
                      : 'Hoàn tất'}
                  </button>
                </div>
              </>
            )}

            {confirmAction ===
              'cancel' && (
              <>
                <h2>
                  Hủy giáo án?
                </h2>

                <p>
                  Giáo án #
                  {
                    plan.TrainingPlanID
                  }{' '}
                  sẽ chuyển sang Cancelled.
                </p>

                <label className="form-field">
                  <span>
                    Lý do hủy
                  </span>

                  <textarea
                    rows="4"
                    maxLength="1000"
                    value={
                      cancelReason
                    }
                    placeholder="Nhập lý do"
                    onChange={(event) =>
                      setCancelReason(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <div className="training-plan-modal-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setConfirmAction(
                        null,
                      )
                    }
                  >
                    Giữ giáo án
                  </button>

                  <button
                    className="button training-plan-modal-danger"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void cancelPlan()
                    }
                  >
                    {busy
                      ? 'Đang hủy...'
                      : 'Xác nhận hủy'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {closingStage && (
        <div
          className="training-plan-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget &&
              !busy
            ) {
              setClosingStage(
                null,
              )
            }
          }}
        >
          <section
            className="training-plan-modal"
            role="dialog"
            aria-modal="true"
          >
            <span className="training-plan-kicker">
              STAGE SUMMARY
            </span>

            <h2>
              Chốt{' '}
              {
                closingStage.StageName
              }?
            </h2>

            <p>
              Stage chỉ chốt được khi đã
              bắt đầu và không còn session
              Assigned / In Progress.
            </p>

            <label className="form-field">
              <span>
                Nhận xét tổng kết
              </span>

              <textarea
                rows="5"
                maxLength="2000"
                value={
                  summaryNote
                }
                placeholder="Nhập tổng kết Giai đoạn nếu có..."
                onChange={(event) =>
                  setSummaryNote(
                    event.target.value,
                  )
                }
              />
            </label>

            <div className="training-plan-modal-actions">
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() =>
                  setClosingStage(
                    null,
                  )
                }
              >
                Chưa chốt
              </button>

              <button
                className="button"
                type="button"
                disabled={busy}
                onClick={() =>
                  void closeStage()
                }
              >
                {busy
                  ? 'Đang chốt...'
                  : 'Chốt Stage'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}