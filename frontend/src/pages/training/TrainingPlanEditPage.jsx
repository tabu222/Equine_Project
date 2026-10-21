import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  addTrainingPlanStage,
  deleteTrainingPlanStage,
  getTrainerAssignments,
  getTrainingPlan,
  updateTrainingPlan,
  updateTrainingPlanStage,
} from '../../api/trainingApi.ts'

import TrainingPlanForm, {
  planToForm,
  stageToPayload,
  validatePlanForm,
} from '../../components/training/TrainingPlanForm.jsx'

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

function shouldExpandEndDate(
  oldEndDate,
  newEndDate,
) {
  if (
    !newEndDate
  ) {
    return Boolean(
      oldEndDate,
    )
  }

  if (
    !oldEndDate
  ) {
    return false
  }

  return (
    newEndDate >
    oldEndDate
  )
}

export default function TrainingPlanEditPage() {
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
    form,
    setForm,
  ] = useState(null)

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

          setForm(
            planToForm(
              planData,
            ),
          )

          if (
            planData.Status !==
            'Draft'
          ) {
            setError(
              'Chỉ Training Plan ở trạng thái Draft mới được chỉnh sửa.',
            )
          }
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

  async function saveDraft(
    event,
  ) {
    event.preventDefault()

    if (
      !plan ||
      !form
    ) {
      return
    }

    if (
      plan.Status !==
      'Draft'
    ) {
      setError(
        'Chỉ Training Plan Draft mới được chỉnh sửa.',
      )

      return
    }

    const validationError =
      validatePlanForm(
        form,
      )

    if (
      validationError
    ) {
      setError(
        validationError,
      )

      return
    }

    setBusy(true)
    setError('')

    try {
      /*
       * Backend kiểm tra Stage phải nằm
       * trong khoảng thời gian Plan ở mỗi
       * PATCH.
       *
       * Vì vậy:
       * 1. Mở rộng khoảng Plan trước nếu cần.
       * 2. Sửa/xóa/thêm Stage.
       * 3. Ghi final Plan sau cùng để xử lý
       *    trường hợp thu hẹp khoảng ngày.
       */

      const expansionPayload = {}

      if (
        form.StartDate <
        plan.StartDate
      ) {
        expansionPayload.StartDate =
          form.StartDate
      }

      if (
        shouldExpandEndDate(
          plan.EndDate,
          form.EndDate,
        )
      ) {
        expansionPayload.EndDate =
          form.EndDate ||
          null
      }

      if (
        Object.keys(
          expansionPayload,
        ).length >
        0
      ) {
        await updateTrainingPlan(
          plan.TrainingPlanID,
          expansionPayload,
        )
      }

      for (
        const stage of
        form.Stages
      ) {
        if (
          stage.PendingDelete
        ) {
          if (
            stage
              .TrainingPlanStageID
          ) {
            await deleteTrainingPlanStage(
              stage.TrainingPlanStageID,
            )
          }

          continue
        }

        if (
          stage
            .TrainingPlanStageID
        ) {
          await updateTrainingPlanStage(
            stage.TrainingPlanStageID,
            stageToPayload(
              stage,
            ),
          )
        } else {
          const payload =
            stageToPayload(
              stage,
            )

          delete payload.StageOrder

          await addTrainingPlanStage(
            plan.TrainingPlanID,
            payload,
          )
        }
      }

      await updateTrainingPlan(
        plan.TrainingPlanID,
        {
          Goal:
            form.Goal
              .trim() ||
            null,

          StartDate:
            form.StartDate,

          EndDate:
            form.EndDate ||
            null,

          OverallIntensity:
            form.OverallIntensity ||
            null,

          Note:
            form.Note
              .trim() ||
            null,
        },
      )

      navigate(
        `/training/plans/${plan.TrainingPlanID}`,
        {
          replace: true,
        },
      )
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          'Không thể lưu thay đổi giáo án.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content training-plan-edit-page">
        <section
          className="panel training-plan-loading"
          role="status"
        >
          <div className="training-plan-loading-bar" />

          <div>
            <strong>
              Đang tải Draft
            </strong>

            <span>
              Đang lấy Plan và Stage để
              chỉnh sửa.
            </span>
          </div>
        </section>
      </main>
    )
  }

  if (
    !plan ||
    !form
  ) {
    return (
      <main className="page-content training-plan-edit-page">
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
          Quay lại
        </Link>
      </main>
    )
  }

  return (
    <main className="page-content training-plan-edit-page">
      <div className="breadcrumb">
        <Link to="/training/my-plans">
          Ngựa & giáo án
        </Link>

        <span>
          /
        </span>

        <Link
          to={`/training/plans/${plan.TrainingPlanID}`}
        >
          Giáo án #
          {
            plan.TrainingPlanID
          }
        </Link>

        <span>
          /
        </span>

        <strong>
          Chỉnh sửa
        </strong>
      </div>

      <div className="page-heading training-plan-page-heading">
        <div>
          <p className="eyebrow">
            TRAINER
          </p>

          <h1>
            Chỉnh sửa Training Plan
          </h1>

          <p>
            {plan.HorseName}
            {' · '}
            Giáo án #
            {
              plan.TrainingPlanID
            }
          </p>
        </div>

        <Link
          className="button button-secondary"
          to={`/training/plans/${plan.TrainingPlanID}`}
        >
          Hủy chỉnh sửa
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

      {plan.Status !==
      'Draft' ? (
        <section className="panel training-plan-edit-blocked">
          <h2>
            Giáo án không còn ở trạng thái
            Draft
          </h2>

          

          <Link
            className="button"
            to={`/training/plans/${plan.TrainingPlanID}`}
          >
            Xem giáo án
          </Link>
        </section>
      ) : (
        <section className="panel">
          <TrainingPlanForm
            form={form}
            setForm={setForm}
            assignments={
              assignments
            }
            horseLocked
            busy={busy}
            submitLabel="Lưu thay đổi"
            onSubmit={
              saveDraft
            }
            onCancel={() =>
              navigate(
                `/training/plans/${plan.TrainingPlanID}`,
              )
            }
          />
        </section>
      )}
    </main>
  )
}