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
  createTrainingSession,
  getTrainingPlans,
  getWorkRiderPreferences,
} from '../../api/trainingApi.ts'

import {
  getUsers,
} from '../../api/userApi.ts'

import TrainingSessionForm, {
  createEmptySessionForm,
  sessionToPayload,
  validateSessionForm,
} from '../../components/training/TrainingSessionForm.jsx'

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

function uniqueUsers(
  users,
) {
  const map =
    new Map()

  users.forEach(
    (user) => {
      map.set(
        String(
          user.id,
        ),
        user,
      )
    },
  )

  return Array.from(
    map.values(),
  )
}

export default function TrainingSessionCreatePage({
  role,
}) {
  const navigate =
    useNavigate()

  const [
    searchParams,
  ] =
    useSearchParams()

  const requestedPlanId =
    searchParams.get(
      'planId',
    ) || ''

  const [
    plans,
    setPlans,
  ] = useState([])

  const [
    riders,
    setRiders,
  ] = useState([])

  const [
    supervisors,
    setSupervisors,
  ] = useState([])

  const [
    preferences,
    setPreferences,
  ] = useState([])

  const [
    form,
    setForm,
  ] = useState(() =>
    createEmptySessionForm({
      planId:
        requestedPlanId,
    }),
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
      getTrainingPlans(
        role === 'trainer'
          ? {
              mine: true,
              Status:
                'Active',
            }
          : {
              Status:
                'Active',
            },
      ),

      getUsers(
        'WORK_RIDER',
      ),

      getUsers(
        'TRAINER',
      ),

      getUsers(
        'HEAD_TRAINER',
      ),
    ])
      .then(
        ([
          planRows,
          riderRows,
          trainerRows,
          headTrainerRows,
        ]) => {
          if (!active) {
            return
          }

          const safePlans =
            Array.isArray(
              planRows,
            )
              ? planRows
              : []

          const safeRiders =
            Array.isArray(
              riderRows,
            )
              ? riderRows
              : []

          const safeTrainers =
            Array.isArray(
              trainerRows,
            )
              ? trainerRows
              : []

          const safeHeadTrainers =
            Array.isArray(
              headTrainerRows,
            )
              ? headTrainerRows
              : []

          console.log(
            '=== SESSION CREATE LOAD ===',
          )

          console.log(
            'ROLE:',
            role,
          )

          console.log(
            'REQUESTED PLAN ID:',
            requestedPlanId,
          )

          console.log(
            'ACTIVE PLANS:',
            safePlans,
          )

          console.log(
            'WORK RIDERS:',
            safeRiders,
          )

          console.log(
            'TRAINERS:',
            safeTrainers,
          )

          console.log(
            'HEAD TRAINERS:',
            safeHeadTrainers,
          )

          setPlans(
            safePlans,
          )

          setRiders(
            safeRiders,
          )

          setSupervisors(
            uniqueUsers([
              ...safeTrainers,
              ...safeHeadTrainers,
            ]),
          )

          let initialPlan =
            null

          if (
            requestedPlanId
          ) {
            initialPlan =
              safePlans.find(
                (plan) =>
                  String(
                    plan.TrainingPlanID,
                  ) ===
                  String(
                    requestedPlanId,
                  ),
              ) ||
              null

            if (
              !initialPlan
            ) {
              setError(
                'Giáo án không ở trạng thái đang áp dụng hoặc không thuộc phạm vi được phép xếp lịch.',
              )
            }
          } else {
            initialPlan =
              safePlans[0] ||
              null
          }

          console.log(
            'INITIAL PLAN:',
            initialPlan,
          )

          if (
            initialPlan
          ) {
            const initialStageId =
              initialPlan
                .Stages?.[0]
                ?.TrainingPlanStageID ||
              ''

            const initialForm =
              createEmptySessionForm({
                planId:
                  initialPlan
                    .TrainingPlanID,

                stageId:
                  initialStageId,
              })

            console.log(
              'INITIAL FORM:',
              initialForm,
            )

            setForm(
              initialForm,
            )
          }
        },
      )
      .catch(
        (loadError) => {
          if (!active) {
            return
          }

          console.error(
            'SESSION CREATE LOAD ERROR:',
            loadError,
          )

          setError(
            getErrorMessage(
              loadError,
              'Không thể tải dữ liệu xếp buổi tập.',
            ),
          )
        },
      )
      .finally(() => {
        if (
          active
        ) {
          setLoading(
            false,
          )
        }
      })

    return () => {
      active = false
    }
  }, [
    role,
    requestedPlanId,
  ])

  const selectedPlan =
    useMemo(
      () =>
        plans.find(
          (plan) =>
            String(
              plan.TrainingPlanID,
            ) ===
            String(
              form.TrainingPlanID,
            ),
        ) || null,
      [
        plans,
        form.TrainingPlanID,
      ],
    )

  useEffect(() => {
    if (
      !selectedPlan
    ) {
      setPreferences(
        [],
      )

      return undefined
    }

    let active = true

    console.log(
      'LOAD WORK RIDER PREFERENCES FOR HORSE:',
      selectedPlan.HorseID,
    )

    getWorkRiderPreferences(
      selectedPlan.HorseID,
    )
      .then(
        (rows) => {
          if (
            !active
          ) {
            return
          }

          const safeRows =
            Array.isArray(
              rows,
            )
              ? rows
              : []

          console.log(
            'WORK RIDER PREFERENCES:',
            safeRows,
          )

          setPreferences(
            safeRows,
          )
        },
      )
      .catch(
        (preferenceError) => {
          if (
            !active
          ) {
            return
          }

          console.warn(
            'WORK RIDER PREFERENCE ERROR:',
            preferenceError,
          )

          setPreferences(
            [],
          )
        },
      )

    return () => {
      active = false
    }
  }, [
    selectedPlan,
  ])

  async function submit(
    event,
  ) {
    event.preventDefault()

    console.log(
      '=== CREATE SESSION SUBMIT ===',
    )

    console.log(
      'FORM:',
      form,
    )

    console.log(
      'SELECTED PLAN:',
      selectedPlan,
    )

    console.log(
      'ALL PLANS:',
      plans,
    )

    console.log(
      'RIDERS:',
      riders,
    )

    console.log(
      'SUPERVISORS:',
      supervisors,
    )

    console.log(
      'PREFERENCES:',
      preferences,
    )

    const validationError =
      validateSessionForm(
        form,
        plans,
        {
          isCreate:
            true,
        },
      )

    console.log(
      'VALIDATION ERROR:',
      validationError,
    )

    if (
      validationError
    ) {
      setError(
        validationError,
      )

      window.scrollTo({
        top: 0,
        behavior:
          'smooth',
      })

      return
    }

    const payload =
      sessionToPayload(
        form,
      )

    console.log(
      'SESSION PAYLOAD:',
      payload,
    )

    setBusy(
      true,
    )

    setError(
      '',
    )

    try {
      console.log(
        'CALLING POST /api/training-sessions ...',
      )

      const created =
        await createTrainingSession(
          payload,
        )

      console.log(
        'CREATED SESSION:',
        created,
      )

      if (
        !created ||
        !created.TrainingPlanID
      ) {
        console.warn(
          'CREATE SESSION RESPONSE MISSING TrainingPlanID:',
          created,
        )

        navigate(
          '/training/schedule',
          {
            replace:
              true,
          },
        )

        return
      }

      navigate(
        `/training/schedule?planId=${created.TrainingPlanID}`,
        {
          replace:
            true,
        },
      )
    } catch (
      saveError
    ) {
      console.error(
        'CREATE SESSION ERROR:',
        saveError,
      )

      setError(
        getErrorMessage(
          saveError,
          'Không thể tạo buổi tập.',
        ),
      )

      window.scrollTo({
        top: 0,
        behavior:
          'smooth',
      })
    } finally {
      setBusy(
        false,
      )
    }
  }

  if (
    loading
  ) {
    return (
      <main className="page-content training-session-create-page">
        <section
          className="panel training-session-loading"
          role="status"
        >
          <div className="training-session-loading-bar" />

          <div>
            <strong>
              Đang tải dữ liệu buổi tập
            </strong>

            <span>
              Đang tải giáo án, Work Rider và người giám sát.
            </span>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page-content training-session-create-page">
      <div className="breadcrumb">
        <Link to="/training/schedule">
          Lịch tập
        </Link>

        <span>
          /
        </span>

        <strong>
          Tạo buổi tập
        </strong>
      </div>

      <div className="page-heading training-session-page-heading">
        <div>
          <p className="eyebrow">
            {role ===
            'headTrainer'
              ? 'HUẤN LUYỆN VIÊN TRƯỞNG'
              : 'HUẤN LUYỆN VIÊN'}
          </p>

          <h1>
            Tạo buổi tập
          </h1>

          <p>
            Chọn giáo án, người thực hiện và thời gian buổi tập.
          </p>
        </div>

        <Link
          className="button button-secondary"
          to="/training/schedule"
        >
          Quay lại lịch
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

      {plans.length ===
      0 ? (
        <section className="panel">
          <div className="empty-state">
            <h3>
              Không có giáo án đang áp dụng
            </h3>

            <p>
              Cần có giáo án đang áp dụng trước khi xếp buổi tập.
            </p>

            <Link
              className="button button-secondary"
              to="/training/schedule"
            >
              Quay lại
            </Link>
          </div>
        </section>
      ) : (
        <section className="panel">
          <TrainingSessionForm
            form={
              form
            }
            setForm={
              setForm
            }
            plans={
              plans
            }
            riders={
              riders
            }
            supervisors={
              supervisors
            }
            preferences={
              preferences
            }
            planLocked={
              Boolean(
                requestedPlanId,
              ) &&
              Boolean(
                selectedPlan,
              )
            }
            busy={
              busy
            }
            submitLabel="Tạo buổi tập"
            onSubmit={
              submit
            }
            onCancel={() =>
              navigate(
                selectedPlan
                  ? `/training/schedule?planId=${selectedPlan.TrainingPlanID}`
                  : '/training/schedule',
              )
            }
          />
        </section>
      )}
    </main>
  )
}