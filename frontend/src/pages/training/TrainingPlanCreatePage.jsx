import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import {
  createTrainingPlan,
  getTrainerAssignments,
  getTrainingPlans,
} from '../../api/trainingApi.ts'

import TrainingPlanForm, {
  createEmptyPlanForm,
  planToPayload,
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

export default function TrainingPlanCreatePage() {
  const navigate =
    useNavigate()

  const [
    searchParams,
  ] =
    useSearchParams()

  const horseId =
    searchParams.get(
      'horseId',
    ) || ''

  const [
    assignments,
    setAssignments,
  ] = useState([])

  const [
    plans,
    setPlans,
  ] = useState([])

  const [
    form,
    setForm,
  ] = useState(() =>
    createEmptyPlanForm(
      horseId,
    ),
  )

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
    let active = true

    Promise.all([
      getTrainerAssignments({
        mine: true,
        Status: 'Active',
      }),

      getTrainingPlans({
        mine: true,
      }),
    ])
      .then(
        ([
          assignmentRows,
          planRows,
        ]) => {
          if (!active) {
            return
          }

          const safeAssignments =
            Array.isArray(
              assignmentRows,
            )
              ? assignmentRows
              : []

          setAssignments(
            safeAssignments,
          )

          setPlans(
            Array.isArray(
              planRows,
            )
              ? planRows
              : [],
          )

          if (
            horseId &&
            !safeAssignments.some(
              (assignment) =>
                String(
                  assignment.HorseID,
                ) ===
                String(
                  horseId,
                ),
            )
          ) {
            setError(
              'Ngựa này không thuộc Active Assignment của Trainer hiện tại.',
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
              'Không thể tải dữ liệu tạo giáo án.',
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

  const selectedAssignment =
    useMemo(
      () =>
        assignments.find(
          (assignment) =>
            String(
              assignment.HorseID,
            ) ===
            String(
              form.HorseID,
            ),
        ) || null,
      [
        assignments,
        form.HorseID,
      ],
    )

  const existingOpenPlan =
    useMemo(
      () =>
        plans.find(
          (plan) =>
            String(
              plan.HorseID,
            ) ===
              String(
                form.HorseID,
              ) &&
            [
              'Draft',
              'Pending Approval',
              'Active',
            ].includes(
              plan.Status,
            ),
        ) || null,
      [
        plans,
        form.HorseID,
      ],
    )

  async function handleSubmit(
    event,
  ) {
    event.preventDefault()

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

    if (
      !selectedAssignment
    ) {
      setError(
        'Trainer không có Active Assignment với ngựa đã chọn.',
      )

      return
    }

    if (
      existingOpenPlan
    ) {
      setError(
        `Ngựa này đã có giáo án #${existingOpenPlan.TrainingPlanID} ở trạng thái ${existingOpenPlan.Status}. Hãy xử lý giáo án đó trước.`,
      )

      return
    }

    setBusy(true)
    setError('')

    try {
      const created =
        await createTrainingPlan(
          planToPayload(
            form,
          ),
        )

      navigate(
        `/training/plans/${created.TrainingPlanID}`,
      )
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          'Không thể tạo giáo án.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content training-plan-create-page">
        <section
          className="panel training-plan-loading"
          role="status"
        >
          <div className="training-plan-loading-bar" />

          <div>
            <strong>
              Đang chuẩn bị giáo án mới
            </strong>

            <span>
              Đang kiểm tra ngựa được phân
              công.
            </span>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page-content training-plan-create-page">
      <div className="breadcrumb">
        <Link to="/training/my-plans">
          Ngựa & giáo án
        </Link>

        <span>
          /
        </span>

        <strong>
          Tạo giáo án
        </strong>
      </div>

      <div className="page-heading training-plan-page-heading">
        <div>
          <p className="eyebrow">
            TRAINER
          </p>

          <h1>
            Tạo Training Plan
          </h1>

          <p>
            Tạo bản Draft cho ngựa đang
            thuộc Active Assignment của
            Trainer.
          </p>
        </div>

        <Link
          className="button button-secondary"
          to="/training/my-plans"
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

      {selectedAssignment && (
        <section className="panel training-plan-selected-horse">
          <div>
            <span>
              Ngựa
            </span>

            <strong>
              {
                selectedAssignment.HorseName
              }
            </strong>
          </div>

          <div>
            <span>
              Chuyên môn
            </span>

            <strong>
              {
                selectedAssignment.SpecializationName
              }
            </strong>
          </div>

          <div>
            <span>
              Phân công
            </span>

            <strong>
              #
              {
                selectedAssignment.TrainerHorseAssignmentID
              }
            </strong>
          </div>
        </section>
      )}

      {existingOpenPlan && (
        <section className="panel training-plan-existing-warning">
          <div>
            <strong>
              Ngựa này đã có giáo án đang mở
            </strong>

            <p>
              Giáo án #
              {
                existingOpenPlan.TrainingPlanID
              }{' '}
              hiện ở trạng thái{' '}
              <strong>
                {
                  existingOpenPlan.Status
                }
              </strong>
              .
            </p>
          </div>

          <Link
            className="button"
            to={`/training/plans/${existingOpenPlan.TrainingPlanID}`}
          >
            Mở giáo án hiện tại
          </Link>
        </section>
      )}

      <section className="panel">
        <TrainingPlanForm
          form={form}
          setForm={setForm}
          assignments={
            assignments
          }
          horseLocked={
            Boolean(
              horseId,
            )
          }
          busy={busy}
          submitLabel="Lưu Draft"
          onSubmit={
            handleSubmit
          }
          onCancel={() =>
            navigate(
              '/training/my-plans',
            )
          }
        />
      </section>
    </main>
  )
}