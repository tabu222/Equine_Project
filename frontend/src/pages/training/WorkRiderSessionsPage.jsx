import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  getTrainingSessions,
  startTrainingSession,
  submitTrainingResult,
} from '../../api/trainingApi.ts'

const emptyResult = () => ({
  ActualDurationMinutes: '',
  ActualDistanceKm: '',
  AvgSpeedKmh: '',
  MaxSpeedKmh: '',
  AvgHeartRate: '',
  MaxHeartRate: '',
  RecoveryMinutes: '',
  PerformanceScore: '',
  RiderObservation: '',
  VideoUrl: '',
})

function optionalNumber(
  value,
) {
  return value === ''
    ? null
    : Number(value)
}

export default function WorkRiderSessionsPage() {
  const [
    sessions,
    setSessions,
  ] = useState([])

  const [
    selectedSessionId,
    setSelectedSessionId,
  ] = useState(null)

  const [
    resultForm,
    setResultForm,
  ] = useState(emptyResult)

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
              : 'Không thể tải buổi tập của bạn.',
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

  async function start(
    sessionId,
  ) {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      await startTrainingSession(
        sessionId,
      )

      setMessage(
        'Đã bắt đầu buổi tập.',
      )

      await load()
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : 'Không thể bắt đầu buổi tập.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function saveResult(
    event,
  ) {
    event.preventDefault()

    if (!selectedSessionId) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await submitTrainingResult(
        selectedSessionId,
        {
          ActualDurationMinutes:
            optionalNumber(
              resultForm
                .ActualDurationMinutes,
            ),

          ActualDistanceKm:
            optionalNumber(
              resultForm
                .ActualDistanceKm,
            ),

          AvgSpeedKmh:
            optionalNumber(
              resultForm
                .AvgSpeedKmh,
            ),

          MaxSpeedKmh:
            optionalNumber(
              resultForm
                .MaxSpeedKmh,
            ),

          AvgHeartRate:
            optionalNumber(
              resultForm
                .AvgHeartRate,
            ),

          MaxHeartRate:
            optionalNumber(
              resultForm
                .MaxHeartRate,
            ),

          RecoveryMinutes:
            optionalNumber(
              resultForm
                .RecoveryMinutes,
            ),

          PerformanceScore:
            optionalNumber(
              resultForm
                .PerformanceScore,
            ),

          RiderObservation:
            resultForm
              .RiderObservation
              .trim() ||
            null,

          VideoUrl:
            resultForm
              .VideoUrl
              .trim() ||
            null,
        },
      )

      setSelectedSessionId(
        null,
      )

      setResultForm(
        emptyResult(),
      )

      setMessage(
        'Đã lưu kết quả và hoàn thành buổi tập.',
      )

      await load()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Không thể lưu kết quả buổi tập.',
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
          Buổi tập của tôi
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
            Chưa có buổi tập được giao.
          </p>
        ) : (
          <div className="request-list">
            {sessions.map(
              (session) => (
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
                    </p>

                    <p>
                      Trạng thái:{' '}
                      {
                        session.Status
                      }
                    </p>

                    <p>
                      Giai đoạn:{' '}
                      {
                        session.StageName
                      }
                    </p>

                    <p>
                      Trainer giám sát:{' '}
                      {
                        session.SupervisingTrainerName
                      }
                    </p>

                    <p>
                      Thời lượng dự kiến:{' '}
                      {
                        session.DurationPlannedMinutes ??
                        '—'
                      }{' '}
                      phút
                    </p>

                    <p>
                      Khoảng cách dự kiến:{' '}
                      {
                        session.DistancePlannedKm ??
                        '—'
                      }{' '}
                      km
                    </p>

                    <p>
                      Training Load:{' '}
                      {
                        session.TrainingLoad ??
                        '—'
                      }
                    </p>

                    {session.Instructions && (
                      <p>
                        Hướng dẫn:{' '}
                        {
                          session.Instructions
                        }
                      </p>
                    )}
                  </div>

                  <div className="profile-actions">
                    {session.Status ===
                      'Assigned' && (
                      <button
                        className="button"
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          void start(
                            session.TrainingSessionID,
                          )
                        }
                      >
                        Bắt đầu
                      </button>
                    )}

                    {session.Status ===
                      'In Progress' && (
                      <button
                        className="button"
                        type="button"
                        onClick={() => {
                          setSelectedSessionId(
                            session.TrainingSessionID,
                          )

                          setResultForm(
                            emptyResult(),
                          )
                        }}
                      >
                        Nhập kết quả
                      </button>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      {selectedSessionId && (
        <section className="panel">
          <h2>
            Kết quả buổi tập #
            {selectedSessionId}
          </h2>

          <form
            onSubmit={
              saveResult
            }
          >
            {[
              [
                'ActualDurationMinutes',
                'Thời lượng thực tế (phút)',
              ],
              [
                'ActualDistanceKm',
                'Khoảng cách thực tế (km)',
              ],
              [
                'AvgSpeedKmh',
                'Tốc độ trung bình (km/h)',
              ],
              [
                'MaxSpeedKmh',
                'Tốc độ tối đa (km/h)',
              ],
              [
                'AvgHeartRate',
                'Nhịp tim trung bình',
              ],
              [
                'MaxHeartRate',
                'Nhịp tim tối đa',
              ],
              [
                'RecoveryMinutes',
                'Thời gian hồi phục (phút)',
              ],
              [
                'PerformanceScore',
                'Performance Score (0–100)',
              ],
            ].map(
              ([
                field,
                label,
              ]) => (
                <label
                  className="form-field"
                  key={field}
                >
                  <span>
                    {label}
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={
                      field ===
                      'PerformanceScore'
                        ? '100'
                        : undefined
                    }
                    value={
                      resultForm[
                        field
                      ]
                    }
                    onChange={(
                      event,
                    ) =>
                      setResultForm(
                        (current) => ({
                          ...current,

                          [field]:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </label>
              ),
            )}

            <label className="form-field">
              <span>
                Nhận xét Work Rider
              </span>

              <textarea
                rows="4"
                value={
                  resultForm
                    .RiderObservation
                }
                onChange={(
                  event,
                ) =>
                  setResultForm(
                    (current) => ({
                      ...current,

                      RiderObservation:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Video URL
              </span>

              <input
                type="url"
                value={
                  resultForm
                    .VideoUrl
                }
                onChange={(
                  event,
                ) =>
                  setResultForm(
                    (current) => ({
                      ...current,

                      VideoUrl:
                        event.target
                          .value,
                    }),
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
                {busy
                  ? 'Đang lưu...'
                  : 'Hoàn thành buổi tập'}
              </button>

              <button
                className="button button-secondary"
                type="button"
                onClick={() =>
                  setSelectedSessionId(
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