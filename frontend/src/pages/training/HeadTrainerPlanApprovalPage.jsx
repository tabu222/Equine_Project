import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  approveTrainingPlan,
  getTrainingPlans,
  returnTrainingPlan,
} from '../../api/trainingApi.ts'

export default function HeadTrainerPlanApprovalPage() {
  const [plans, setPlans] =
    useState([])

  const [notes, setNotes] =
    useState({})

  const [loading, setLoading] =
    useState(true)

  const [busyId, setBusyId] =
    useState(null)

  const [error, setError] =
    useState('')

  const [message, setMessage] =
    useState('')

  const load =
    useCallback(
      async () => {
        setLoading(true)
        setError('')

        try {
          setPlans(
            await getTrainingPlans({
              Status:
                'Pending Approval',
            }),
          )
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không thể tải giáo án chờ duyệt.',
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    void load()
  }, [load])

  async function approve(
    planId,
  ) {
    setBusyId(planId)
    setError('')
    setMessage('')

    try {
      await approveTrainingPlan(
        planId,

        notes[planId]
          ?.trim() ||
          undefined,
      )

      setMessage(
        `Đã duyệt giáo án #${planId}.`,
      )

      await load()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Không thể duyệt giáo án.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function returnPlan(
    planId,
  ) {
    const note =
      notes[planId]
        ?.trim() || ''

    if (!note) {
      setError(
        'Cần nhập lý do trả giáo án về Trainer.',
      )

      return
    }

    setBusyId(planId)
    setError('')
    setMessage('')

    try {
      await returnTrainingPlan(
        planId,
        note,
      )

      setMessage(
        `Đã trả giáo án #${planId} về Draft.`,
      )

      await load()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Không thể trả giáo án.',
      )
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <main className="page-content">
        <section className="panel">
          Đang tải...
        </section>
      </main>
    )
  }

  return (
    <main className="page-content">
      <div className="page-heading">
        <h1>
          Duyệt giáo án
        </h1>
      </div>

      {error && (
        <div className="alert-banner">
          {error}
        </div>
      )}

      {message && (
        <p className="success-message">
          {message}
        </p>
      )}

      <section className="panel">
        {plans.length === 0 ? (
          <p>
            Không có giáo án đang
            chờ duyệt.
          </p>
        ) : (
          <div className="request-list">
            {plans.map(
              (plan) => (
                <article
                  className="request-item"
                  key={
                    plan.TrainingPlanID
                  }
                >
                  <div>
                    <strong>
                      #
                      {
                        plan.TrainingPlanID
                      }
                      {' · '}
                      {
                        plan.HorseName
                      }
                    </strong>

                    <p>
                      Trainer:{' '}
                      {
                        plan.TrainerName
                      }
                    </p>

                    <p>
                      Mục tiêu:{' '}
                      {
                        plan.Goal ||
                        '—'
                      }
                    </p>

                    <p>
                      Thời gian:{' '}
                      {
                        plan.StartDate
                      }
                      {' → '}
                      {
                        plan.EndDate ||
                        'Không giới hạn'
                      }
                    </p>

                    <p>
                      Cường độ tổng thể:{' '}
                      {
                        plan.OverallIntensity ||
                        '—'
                      }
                    </p>

                    <h3>
                      Giai đoạn
                    </h3>

                    {plan.Stages.map(
                      (stage) => (
                        <div
                          key={
                            stage.TrainingPlanStageID
                          }
                        >
                          <strong>
                            {
                              stage.StageOrder
                            }
                            .{' '}
                            {
                              stage.StageName
                            }
                          </strong>

                          <p>
                            {
                              stage.StartDate
                            }
                            {' → '}
                            {
                              stage.EndDate ||
                              'Không giới hạn'
                            }
                            {' · '}
                            {
                              stage.Intensity ||
                              '—'
                            }
                            {' · '}
                            Load{' '}
                            {
                              stage.TrainingLoad ??
                              '—'
                            }
                          </p>
                        </div>
                      ),
                    )}
                  </div>

                  <div>
                    <label className="form-field">
                      <span>
                        Nhận xét duyệt /
                        lý do trả về
                      </span>

                      <textarea
                        rows="3"
                        value={
                          notes[
                            plan
                              .TrainingPlanID
                          ] || ''
                        }
                        onChange={(
                          event,
                        ) =>
                          setNotes(
                            (current) => ({
                              ...current,

                              [plan.TrainingPlanID]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />
                    </label>

                    <div className="profile-actions">
                      <button
                        className="button"
                        type="button"
                        disabled={
                          busyId ===
                          plan.TrainingPlanID
                        }
                        onClick={() =>
                          void approve(
                            plan.TrainingPlanID,
                          )
                        }
                      >
                        Duyệt giáo án
                      </button>

                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={
                          busyId ===
                          plan.TrainingPlanID
                        }
                        onClick={() =>
                          void returnPlan(
                            plan.TrainingPlanID,
                          )
                        }
                      >
                        Trả về Trainer
                      </button>
                    </div>
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