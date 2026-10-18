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
  getTrainingPlan,
  getTrainingPlans,
  getTrainingSession,
  getWorkRiderPreferences,
  updateTrainingSession,
} from '../../api/trainingApi.ts'

import {
  getUsers,
} from '../../api/userApi.ts'

import TrainingSessionForm, {
  sessionToForm,
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

async function fetchEditData(
  sessionId,
  role,
) {
  const session =
    await getTrainingSession(
      sessionId,
    )

  const [
    plan,
    allowedPlanRows,
    riders,
    trainers,
    headTrainers,
  ] =
    await Promise.all([
      getTrainingPlan(
        session.TrainingPlanID,
      ),

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

  const preferences =
    await getWorkRiderPreferences(
      session.HorseID,
    )

  return {
    session,
    plan,

    allowedPlans:
      Array.isArray(
        allowedPlanRows,
      )
        ? allowedPlanRows
        : [],

    riders,

    supervisors:
      uniqueUsers([
        ...trainers,
        ...headTrainers,
      ]),

    preferences:
      Array.isArray(
        preferences,
      )
        ? preferences
        : [],
  }
}

export default function TrainingSessionEditPage({
  role,
}) {
  const {
    sessionId,
  } = useParams()

  const navigate =
    useNavigate()

  const [
    session,
    setSession,
  ] = useState(null)

  const [
    plan,
    setPlan,
  ] = useState(null)

  const [
    allowedPlans,
    setAllowedPlans,
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
    if (!sessionId) {
      return undefined
    }

    let active = true

    fetchEditData(
      sessionId,
      role,
    )
      .then((data) => {
        if (!active) {
          return
        }

        setSession(
          data.session,
        )

        setPlan(
          data.plan,
        )

        setAllowedPlans(
          data.allowedPlans,
        )

        setRiders(
          data.riders,
        )

        setSupervisors(
          data.supervisors,
        )

        setPreferences(
          data.preferences,
        )

        setForm(
          sessionToForm(
            data.session,
          ),
        )

        if (
          data.session.Status !==
          'Assigned'
        ) {
          setError(
            'Chỉ buổi tập ở trạng thái Assigned mới được chỉnh sửa.',
          )

          return
        }

        if (
          role ===
            'trainer' &&
          !data.allowedPlans.some(
            (item) =>
              String(
                item.TrainingPlanID,
              ) ===
              String(
                data.session
                  .TrainingPlanID,
              ),
          )
        ) {
          setError(
            'Trainer không còn Active Assignment với ngựa của buổi tập này.',
          )
        }
      })
      .catch(
        (loadError) => {
          if (!active) {
            return
          }

          setError(
            getErrorMessage(
              loadError,
              'Không thể tải buổi tập.',
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
  }, [
    sessionId,
    role,
  ])

  const allowed =
    useMemo(() => {
      if (
        !session ||
        !plan
      ) {
        return false
      }

      if (
        session.Status !==
        'Assigned'
      ) {
        return false
      }

      if (
        role ===
        'headTrainer'
      ) {
        return true
      }

      return allowedPlans.some(
        (item) =>
          String(
            item.TrainingPlanID,
          ) ===
          String(
            session.TrainingPlanID,
          ),
      )
    }, [
      session,
      plan,
      role,
      allowedPlans,
    ])

  async function save(
    event,
  ) {
    event.preventDefault()

    if (
      !session ||
      !plan ||
      !form ||
      !allowed
    ) {
      return
    }

    const validationError =
      validateSessionForm(
        form,
        [
          plan,
        ],
        {
          isCreate:
            false,
        },
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
      await updateTrainingSession(
        session.TrainingSessionID,
        sessionToPayload(
          form,
        ),
      )

      navigate(
        `/training/schedule?planId=${session.TrainingPlanID}`,
        {
          replace: true,
        },
      )
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          'Không thể cập nhật buổi tập.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content training-session-edit-page">
        <section
          className="panel training-session-loading"
          role="status"
        >
          <div className="training-session-loading-bar" />

          <div>
            <strong>
              Đang tải buổi tập
            </strong>

            <span>
              Đang lấy Session, Plan và
              danh sách Work Rider.
            </span>
          </div>
        </section>
      </main>
    )
  }

  if (
    !session ||
    !plan ||
    !form
  ) {
    return (
      <main className="page-content training-session-edit-page">
        <div
          className="alert-banner"
          role="alert"
        >
          {error ||
            'Không tìm thấy buổi tập.'}
        </div>

        <Link
          className="button"
          to="/training/schedule"
        >
          Quay lại lịch
        </Link>
      </main>
    )
  }

  return (
    <main className="page-content training-session-edit-page">
      <div className="breadcrumb">
        <Link
          to={`/training/schedule?planId=${session.TrainingPlanID}`}
        >
          Lịch tập
        </Link>

        <span>
          /
        </span>

        <strong>
          Session #
          {
            session.TrainingSessionID
          }
        </strong>
      </div>

      <div className="page-heading training-session-page-heading">
        <div>
          <p className="eyebrow">
            {role ===
            'headTrainer'
              ? 'HEAD TRAINER'
              : 'TRAINER'}
          </p>

          <h1>
            Sửa Training Session
          </h1>

          <p>
            {session.HorseName}
            {' · '}
            {session.StageName}
            {' · '}
            Session #
            {
              session.TrainingSessionID
            }
          </p>
        </div>

        <Link
          className="button button-secondary"
          to={`/training/schedule?planId=${session.TrainingPlanID}`}
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

      {!allowed ? (
        <section className="panel training-session-edit-blocked">
          <h2>
            Không thể chỉnh sửa Session
          </h2>

          <p>
            Chỉ Session ở trạng thái
            Assigned mới được sửa. Với
            Trainer, ngựa cũng phải còn
            thuộc Active Assignment của
            chính Trainer đó.
          </p>

          <Link
            className="button"
            to={`/training/schedule?planId=${session.TrainingPlanID}`}
          >
            Quay lại lịch
          </Link>
        </section>
      ) : (
        <section className="panel">
          <TrainingSessionForm
            form={form}
            setForm={setForm}
            plans={[
              plan,
            ]}
            riders={riders}
            supervisors={
              supervisors
            }
            preferences={
              preferences
            }
            planLocked
            busy={busy}
            submitLabel="Lưu thay đổi"
            onSubmit={save}
            onCancel={() =>
              navigate(
                `/training/schedule?planId=${session.TrainingPlanID}`,
              )
            }
          />
        </section>
      )}
    </main>
  )
}