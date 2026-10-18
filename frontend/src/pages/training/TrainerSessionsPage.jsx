import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  getTrainingSessions,
  reviewTrainingSession,
  stopTrainingSession,
  submitSubstituteObservation,
} from '../../api/trainingApi.ts'

export default function TrainerSessionsPage({
  currentUser,
}) {
  const [
    sessions,
    setSessions,
  ] = useState([])

  const [
    reviewSessionId,
    setReviewSessionId,
  ] = useState(null)

  const [
    observationSessionId,
    setObservationSessionId,
  ] = useState(null)

  const [
    reviewForm,
    setReviewForm,
  ] = useState({
    Evaluation: 'Good',
    TrainerComment: '',
    AdjustmentRequired:
      false,
    AdjustmentNote: '',
  })

  const [
    observation,
    setObservation,
  ] = useState('')

  const [loading, setLoading] =
    useState(true)

  const [busy, setBusy] =
    useState(false)

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
          setSessions(
            await getTrainingSessions({
              mine: true,
            }),
          )
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không thể tải buổi tập giám sát.',
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

  async function submitReview(
    event,
  ) {
    event.preventDefault()

    if (!reviewSessionId) {
      return
    }

    if (
      reviewForm
        .AdjustmentRequired &&
      !reviewForm
        .AdjustmentNote
        .trim()
    ) {
      setError(
        'Cần ghi nội dung cần điều chỉnh.',
      )

      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await reviewTrainingSession(
        reviewSessionId,
        {
          Evaluation:
            reviewForm.Evaluation,

          TrainerComment:
            reviewForm
              .TrainerComment
              .trim() ||
            null,

          AdjustmentRequired:
            reviewForm
              .AdjustmentRequired,

          AdjustmentNote:
            reviewForm
              .AdjustmentNote
              .trim() ||
            null,
        },
      )

      setReviewSessionId(
        null,
      )

      setMessage(
        'Đã đánh giá buổi tập.',
      )

      await load()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Không thể đánh giá buổi tập.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function submitObservation(
    event,
  ) {
    event.preventDefault()

    if (
      !observationSessionId ||
      !observation.trim()
    ) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await submitSubstituteObservation(
        observationSessionId,
        observation.trim(),
      )

      setObservationSessionId(
        null,
      )

      setObservation('')

      setMessage(
        'Đã lưu nhận xét của Substitute Trainer.',
      )

      await load()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Không thể lưu nhận xét.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function stop(
    sessionId,
  ) {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      await stopTrainingSession(
        sessionId,
        {
          Reason:
            'Trainer giám sát dừng buổi tập',
        },
      )

      setMessage(
        'Đã dừng buổi tập.',
      )

      await load()
    } catch (stopError) {
      setError(
        stopError instanceof Error
          ? stopError.message
          : 'Không thể dừng buổi tập.',
      )
    } finally {
      setBusy(false)
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
          Buổi tập tôi giám sát
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
        {sessions.length === 0 ? (
          <p>
            Chưa có buổi tập liên quan.
          </p>
        ) : (
          <div className="request-list">
            {sessions.map(
              (session) => {
                const isResponsible =
                  String(
                    session.AssignedTrainerID,
                  ) ===
                  String(
                    currentUser.id,
                  )

                const isSubstitute =
                  session.IsSubstitute &&
                  String(
                    session.SupervisingTrainerID,
                  ) ===
                    String(
                      currentUser.id,
                    )

                const isSupervisor =
                  String(
                    session.SupervisingTrainerID,
                  ) ===
                  String(
                    currentUser.id,
                  )

                return (
                  <article
                    className="request-item"
                    key={
                      session.TrainingSessionID
                    }
                  >
                    <div>
                      <strong>
                        {
                          session.SessionDate
                        }
                        {' · '}
                        {
                          session.HorseName
                        }
                      </strong>

                      <p>
                        {
                          session.StartTime
                        }
                        {' · '}
                        {
                          session.TrainingType
                        }
                        {' · '}
                        {
                          session.Status
                        }
                      </p>

                      <p>
                        Work Rider:{' '}
                        {
                          session.WorkRiderName
                        }
                      </p>

                      <p>
                        Trainer phụ trách:{' '}
                        {
                          session.AssignedTrainerName
                        }
                      </p>

                      <p>
                        Người giám sát:{' '}
                        {
                          session.SupervisingTrainerName
                        }
                      </p>

                      {session.Result && (
                        <>
                          <p>
                            Performance Score:{' '}
                            {
                              session.Result
                                .PerformanceScore ??
                              '—'
                            }
                          </p>

                          <p>
                            Work Rider:{' '}
                            {
                              session.Result
                                .RiderObservation ||
                              '—'
                            }
                          </p>

                          {session.Result
                            .SubstituteObservation && (
                            <p>
                              Substitute:{' '}
                              {
                                session.Result
                                  .SubstituteObservation
                              }
                            </p>
                          )}
                        </>
                      )}

                      {session.Review && (
                        <p>
                          Đánh giá:{' '}
                          {
                            session.Review
                              .Evaluation
                          }

                          {session.Review
                            .AdjustmentRequired
                            ? ' · Cần điều chỉnh giáo án'
                            : ''}
                        </p>
                      )}
                    </div>

                    <div className="profile-actions">
                      {isSupervisor &&
                        [
                          'Assigned',
                          'In Progress',
                        ].includes(
                          session.Status,
                        ) && (
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            void stop(
                              session.TrainingSessionID,
                            )
                          }
                        >
                          Dừng buổi tập
                        </button>
                      )}

                      {isSubstitute &&
                        [
                          'In Progress',
                          'Completed',
                          'Cancelled',
                        ].includes(
                          session.Status,
                        ) && (
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => {
                            setObservationSessionId(
                              session.TrainingSessionID,
                            )

                            setObservation(
                              session.Result
                                ?.SubstituteObservation ||
                                '',
                            )
                          }}
                        >
                          Nhận xét Substitute
                        </button>
                      )}

                      {isResponsible &&
                        session.Status ===
                          'Completed' &&
                        !session.Review && (
                        <button
                          className="button"
                          type="button"
                          onClick={() => {
                            setReviewSessionId(
                              session.TrainingSessionID,
                            )

                            setReviewForm({
                              Evaluation:
                                'Good',

                              TrainerComment:
                                '',

                              AdjustmentRequired:
                                false,

                              AdjustmentNote:
                                '',
                            })
                          }}
                        >
                          Đánh giá kết quả
                        </button>
                      )}
                    </div>
                  </article>
                )
              },
            )}
          </div>
        )}
      </section>

      {reviewSessionId && (
        <section className="panel">
          <h2>
            Đánh giá buổi tập #
            {reviewSessionId}
          </h2>

          <form
            onSubmit={
              submitReview
            }
          >
            <label className="form-field">
              <span>
                Đánh giá
              </span>

              <select
                value={
                  reviewForm
                    .Evaluation
                }
                onChange={(
                  event,
                ) =>
                  setReviewForm(
                    (current) => ({
                      ...current,

                      Evaluation:
                        event.target
                          .value,
                    }),
                  )
                }
              >
                <option value="Excellent">
                  Excellent
                </option>

                <option value="Good">
                  Good
                </option>

                <option value="Average">
                  Average
                </option>

                <option value="Needs Improvement">
                  Needs Improvement
                </option>
              </select>
            </label>

            <label className="form-field">
              <span>
                Nhận xét Trainer
              </span>

              <textarea
                rows="3"
                value={
                  reviewForm
                    .TrainerComment
                }
                onChange={(
                  event,
                ) =>
                  setReviewForm(
                    (current) => ({
                      ...current,

                      TrainerComment:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label>
              <input
                type="checkbox"
                checked={
                  reviewForm
                    .AdjustmentRequired
                }
                onChange={(
                  event,
                ) =>
                  setReviewForm(
                    (current) => ({
                      ...current,

                      AdjustmentRequired:
                        event.target
                          .checked,
                    }),
                  )
                }
              />

              {' '}
              Cần điều chỉnh giáo án
            </label>

            {reviewForm
              .AdjustmentRequired && (
              <label className="form-field">
                <span>
                  Nội dung cần điều chỉnh
                </span>

                <textarea
                  required
                  rows="3"
                  value={
                    reviewForm
                      .AdjustmentNote
                  }
                  onChange={(
                    event,
                  ) =>
                    setReviewForm(
                      (current) => ({
                        ...current,

                        AdjustmentNote:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </label>
            )}

            <div className="profile-actions">
              <button
                className="button"
                type="submit"
                disabled={busy}
              >
                Lưu đánh giá
              </button>

              <button
                className="button button-secondary"
                type="button"
                onClick={() =>
                  setReviewSessionId(
                    null,
                  )
                }
              >
                Hủy
              </button>
            </div>
          </form>
        </section>
      )}

      {observationSessionId && (
        <section className="panel">
          <h2>
            Nhận xét Substitute Trainer
          </h2>

          <form
            onSubmit={
              submitObservation
            }
          >
            <label className="form-field">
              <span>
                Nhận xét
              </span>

              <textarea
                required
                rows="4"
                value={
                  observation
                }
                onChange={(
                  event,
                ) =>
                  setObservation(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <div className="profile-actions">
              <button
                className="button"
                type="submit"
                disabled={busy}
              >
                Lưu nhận xét
              </button>

              <button
                className="button button-secondary"
                type="button"
                onClick={() =>
                  setObservationSessionId(
                    null,
                  )
                }
              >
                Hủy
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  )
}