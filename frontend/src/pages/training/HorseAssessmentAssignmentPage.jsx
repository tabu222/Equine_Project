import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  assignTrainer,
  createHorseAssessment,
  endTrainerAssignment,
  getHorseAssessments,
  getSpecializations,
  getTrainer,
  getTrainerAssignments,
  getTrainers,
  getTrainingDashboard,
} from '../../api/trainingApi.ts'

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

export default function HorseAssessmentAssignmentPage() {
  const { horseId } = useParams()

  const [horse, setHorse] =
    useState(null)

  const [
    specializations,
    setSpecializations,
  ] = useState([])

  const [
    assessments,
    setAssessments,
  ] = useState([])

  const [
    assignments,
    setAssignments,
  ] = useState([])

  const [trainers, setTrainers] =
    useState([])

  const [
    trainerDetail,
    setTrainerDetail,
  ] = useState(null)

  const [
    selectedTrainerId,
    setSelectedTrainerId,
  ] = useState('')

  const [
    assignmentNote,
    setAssignmentNote,
  ] = useState('')

  const [
    endReason,
    setEndReason,
  ] = useState('')

  const [loading, setLoading] =
    useState(true)

  const [busy, setBusy] =
    useState(false)

  const [error, setError] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [form, setForm] =
    useState({
      SpecializationID: '',
      QualityScore: '',
      FitnessLevel: 'Good',
      AssessmentNote: '',
      DecisionStatus:
        'Recommended',
    })

  const activeAssignment =
    useMemo(
      () =>
        assignments.find(
          (item) =>
            item.Status ===
            'Active',
        ) || null,
      [assignments],
    )

  const latestRecommended =
    useMemo(
      () =>
        assessments.find(
          (item) =>
            item.DecisionStatus ===
            'Recommended',
        ) || null,
      [assessments],
    )

  const load =
    useCallback(
      async () => {
        if (!horseId) return

        setLoading(true)
        setError('')

        try {
          const [
            dashboardRows,
            specializationRows,
            assessmentRows,
            assignmentRows,
          ] =
            await Promise.all([
              getTrainingDashboard(
                horseId,
              ),

              getSpecializations(),

              getHorseAssessments(
                horseId,
              ),

              getTrainerAssignments({
                HorseID:
                  horseId,
              }),
            ])

          setHorse(
            dashboardRows[0] ||
              null,
          )

          setSpecializations(
            specializationRows,
          )

          setAssessments(
            assessmentRows,
          )

          setAssignments(
            assignmentRows,
          )

          const recommended =
            assessmentRows.find(
              (item) =>
                item.DecisionStatus ===
                'Recommended',
            )

          if (recommended) {
            setForm({
              SpecializationID:
                String(
                  recommended.SpecializationID,
                ),

              QualityScore:
                recommended.QualityScore ??
                '',

              FitnessLevel:
                recommended.FitnessLevel ||
                'Good',

              AssessmentNote:
                recommended.AssessmentNote ||
                '',

              DecisionStatus:
                'Recommended',
            })

            setTrainers(
              await getTrainers({
                HorseID:
                  horseId,
              }),
            )
          } else {
            setTrainers([])
          }
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không thể tải dữ liệu đánh giá ngựa.',
          )
        } finally {
          setLoading(false)
        }
      },
      [horseId],
    )

  useEffect(() => {
    void load()
  }, [load])

  async function saveAssessment(
    event,
  ) {
    event.preventDefault()

    if (
      !horseId ||
      !form.SpecializationID
    ) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await createHorseAssessment(
        horseId,
        {
          SpecializationID:
            Number(
              form.SpecializationID,
            ),

          QualityScore:
            form.QualityScore === ''
              ? null
              : Number(
                  form.QualityScore,
                ),

          FitnessLevel:
            form.FitnessLevel,

          AssessmentNote:
            form.AssessmentNote
              .trim() || null,

          DecisionStatus:
            form.DecisionStatus,
        },
      )

      setMessage(
        'Đã lưu đánh giá ngựa.',
      )

      setSelectedTrainerId('')

      setTrainerDetail(null)

      await load()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Không thể lưu đánh giá.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function openTrainer(
    trainerId,
  ) {
    setError('')

    setTrainerDetail(null)

    try {
      setTrainerDetail(
        await getTrainer(
          trainerId,
        ),
      )
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải hồ sơ Trainer.',
      )
    }
  }

  async function createAssignment() {
    if (
      !horseId ||
      !selectedTrainerId ||
      !latestRecommended
    ) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const saved =
        await assignTrainer({
          HorseID:
            Number(horseId),

          TrainerID:
            Number(
              selectedTrainerId,
            ),

          SpecializationID:
            latestRecommended
              .SpecializationID,

          AssessmentID:
            latestRecommended
              .AssessmentID,

          AssignmentNote:
            assignmentNote
              .trim() || null,
        })

      setMessage(
        saved.LevelWarning
          ? `Đã phân Trainer. Cảnh báo: ${saved.LevelWarning}`
          : 'Đã phân Trainer thành công.',
      )

      setSelectedTrainerId('')

      setAssignmentNote('')

      await load()
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : 'Không thể phân Trainer.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function endCurrentAssignment() {
    if (!activeAssignment) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await endTrainerAssignment(
        activeAssignment
          .TrainerHorseAssignmentID,

        endReason.trim() ||
          undefined,
      )

      setEndReason('')

      setMessage(
        'Đã kết thúc phân công Trainer hiện tại.',
      )

      await load()
    } catch (endError) {
      setError(
        endError instanceof Error
          ? endError.message
          : 'Không thể kết thúc phân công.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content">
        <section
          className="panel"
          role="status"
        >
          Đang tải...
        </section>
      </main>
    )
  }

  return (
    <main className="page-content">
      <div className="horse-actions">
        <Link
          className="breadcrumb-back-button"
          to="/training/dashboard"
        >
          ← Quay lại quản lý huấn luyện
        </Link>
      </div>

      <div className="page-heading">
        <h1>
          Đánh giá và phân Trainer
        </h1>

        {horse && (
          <p>
            {horse.HorseName}
            {' · '}
            {show(
              horse.HorseCode,
            )}
          </p>
        )}
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
        <p
          className="success-message"
          role="status"
        >
          {message}
        </p>
      )}

      <section className="panel">
        <h2>
          Đánh giá ngựa
        </h2>

        <form
          onSubmit={
            saveAssessment
          }
        >
          <label className="form-field">
            <span>
              Chuyên môn phù hợp
            </span>

            <select
              required
              value={
                form.SpecializationID
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (current) => ({
                    ...current,

                    SpecializationID:
                      event.target
                        .value,
                  }),
                )
              }
            >
              <option value="">
                Chọn chuyên môn
              </option>

              {specializations.map(
                (item) => (
                  <option
                    key={
                      item.SpecializationID
                    }
                    value={
                      item.SpecializationID
                    }
                  >
                    {
                      item.SpecializationName
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="form-field">
            <span>
              Điểm chất lượng (0–100)
            </span>

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={
                form.QualityScore
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (current) => ({
                    ...current,

                    QualityScore:
                      event.target
                        .value,
                  }),
                )
              }
            />
          </label>

          <label className="form-field">
            <span>
              Thể trạng
            </span>

            <select
              value={
                form.FitnessLevel
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (current) => ({
                    ...current,

                    FitnessLevel:
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

              <option value="Needs Monitoring">
                Needs Monitoring
              </option>
            </select>
          </label>

          <label className="form-field">
            <span>
              Kết luận
            </span>

            <select
              value={
                form.DecisionStatus
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (current) => ({
                    ...current,

                    DecisionStatus:
                      event.target
                        .value,
                  }),
                )
              }
            >
              <option value="Recommended">
                Recommended
              </option>

              <option value="Rejected">
                Rejected
              </option>
            </select>
          </label>

          <label className="form-field">
            <span>
              Ghi chú
            </span>

            <textarea
              rows="4"
              value={
                form.AssessmentNote
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (current) => ({
                    ...current,

                    AssessmentNote:
                      event.target
                        .value,
                  }),
                )
              }
            />
          </label>

          <button
            className="button"
            type="submit"
            disabled={busy}
          >
            {busy
              ? 'Đang lưu...'
              : 'Lưu đánh giá'}
          </button>
        </form>
      </section>

      {latestRecommended && (
        <section className="panel">
          <h2>
            Trainer được đề xuất
          </h2>

          <p>
            Chuyên môn:{' '}
            <strong>
              {
                latestRecommended
                  .SpecializationName
              }
            </strong>

            {' · '}

            Điểm chất lượng:{' '}

            {show(
              latestRecommended
                .QualityScore,
              'Chưa chấm',
            )}
          </p>

          {trainers.length === 0 ? (
            <p>
              Chưa có Trainer trong CLB.
            </p>
          ) : (
            <div className="request-list">
              {trainers.map(
                (trainer) => {
                  const selected =
                    String(
                      selectedTrainerId,
                    ) ===
                    String(
                      trainer.UserID,
                    )

                  const cannotAssign =
                    trainer
                      .MatchesSpecialization ===
                    false

                  return (
                    <article
                      className="request-item"
                      key={
                        trainer.UserID
                      }
                    >
                      <div>
                        <strong>
                          {
                            trainer.FullName
                          }

                          {trainer.IsSuggested
                            ? ' · Đề xuất'
                            : ''}
                        </strong>

                        <p>
                          Chuyên môn:{' '}

                          {trainer.Specializations
                            .map(
                              (item) =>
                                item.SpecializationName,
                            )
                            .join(
                              ', ',
                            ) ||
                            'Chưa có'}
                        </p>

                        <p>
                          Kinh nghiệm:{' '}
                          {
                            trainer.YearsOfExperience
                          }{' '}
                          năm ·{' '}
                          {
                            trainer.ExperienceLevelName
                          }{' '}
                          (
                          {
                            trainer.ExperienceLevel
                          }
                          )
                        </p>

                        <p>
                          Thâm niên có minh chứng:{' '}

                          {trainer.Seniority ==
                          null
                            ? 'Chưa có'
                            : `${trainer.Seniority} năm`}
                        </p>

                        <p>
                          Rating:{' '}
                          {show(
                            trainer.TrainerRating,
                          )}
                          {' · '}
                          Career wins:{' '}
                          {
                            trainer.CareerWins
                          }
                        </p>

                        <p>
                          Win rate 12 tháng:{' '}

                          {trainer.WinRate ==
                          null
                            ? show(
                                trainer.WinRateNote,
                                'Chưa đủ dữ liệu',
                              )
                            : `${trainer.WinRate}%`}
                        </p>

                        <p>
                          Đang phụ trách:{' '}
                          {
                            trainer.ActiveHorseCount
                          }{' '}
                          ngựa
                        </p>

                        {trainer.RequiredLevel && (
                          <p>
                            Cấp độ nên có:{' '}
                            {
                              trainer.RequiredLevel
                            }{' '}
                            trở lên
                          </p>
                        )}

                        {trainer.SuggestionReason && (
                          <p>
                            {
                              trainer.SuggestionReason
                            }
                          </p>
                        )}

                        {cannotAssign && (
                          <p>
                            Trainer này không
                            đúng chuyên môn
                            được đánh giá.
                          </p>
                        )}
                      </div>

                      <div className="profile-actions">
                      <Link
  className="button button-secondary"
  to={`/training/trainers/${trainer.UserID}`}
>
  Xem hồ sơ
</Link>

                        <button
                          className="button"
                          type="button"
                          disabled={
                            cannotAssign ||
                            Boolean(
                              activeAssignment,
                            )
                          }
                          onClick={() =>
                            setSelectedTrainerId(
                              String(
                                trainer.UserID,
                              ),
                            )
                          }
                        >
                          {selected
                            ? 'Đã chọn'
                            : 'Chọn Trainer'}
                        </button>
                      </div>
                    </article>
                  )
                },
              )}
            </div>
          )}
        </section>
      )}

      {trainerDetail && (
        <section className="panel">
          <h2>
            Hồ sơ Trainer:{' '}
            {
              trainerDetail.FullName
            }
          </h2>

          <div className="health-summary-grid">
            <div className="info-item">
              <span>
                Kinh nghiệm
              </span>

              <strong>
                {
                  trainerDetail
                    .YearsOfExperience
                }{' '}
                năm
              </strong>
            </div>

            <div className="info-item">
              <span>
                Cấp độ
              </span>

              <strong>
                {
                  trainerDetail
                    .ExperienceLevelName
                }
              </strong>
            </div>

            <div className="info-item">
              <span>
                Thâm niên minh chứng
              </span>

              <strong>
                {trainerDetail
                  .Seniority == null
                  ? '—'
                  : `${trainerDetail.Seniority} năm`}
              </strong>
            </div>

            <div className="info-item">
              <span>
                Bằng/chứng chỉ
              </span>

              <strong>
                {
                  trainerDetail
                    .QualificationCount
                }
              </strong>
            </div>

            <div className="info-item">
              <span>
                Giải thưởng
              </span>

              <strong>
                {
                  trainerDetail
                    .AwardCount
                }
              </strong>
            </div>

            <div className="info-item">
              <span>
                Career wins
              </span>

              <strong>
                {
                  trainerDetail
                    .CareerWins
                }
                /
                {
                  trainerDetail
                    .CareerStarts
                }
              </strong>
            </div>

            <div className="info-item">
              <span>
                Win rate 12 tháng
              </span>

              <strong>
                {trainerDetail
                  .WinRate == null
                  ? '—'
                  : `${trainerDetail.WinRate}%`}
              </strong>
            </div>

            <div className="info-item">
              <span>
                Trainer rating
              </span>

              <strong>
                {show(
                  trainerDetail
                    .TrainerRating,
                )}
              </strong>
            </div>
          </div>

          {trainerDetail
            .Credentials.length >
            0 && (
            <>
              <h3>
                Bằng cấp / chứng chỉ /
                giải thưởng
              </h3>

              <div className="request-list">
                {trainerDetail.Credentials.map(
                  (item) => (
                    <article
                      className="request-item"
                      key={
                        item.CredentialID
                      }
                    >
                      <div>
                        <strong>
                          {item.Title}
                        </strong>

                        <p>
                          {
                            item.CredentialType
                          }
                          {' · '}
                          {
                            item.IssuedDate
                          }
                        </p>

                        <p>
                          {show(
                            item.IssuedBy,
                          )}
                        </p>
                      </div>
                    </article>
                  ),
                )}
              </div>
            </>
          )}
        </section>
      )}

      {activeAssignment ? (
        <section className="panel">
          <h2>
            Trainer đang phụ trách
          </h2>

          <p>
            <strong>
              {
                activeAssignment
                  .TrainerName
              }
            </strong>
          </p>

          <p>
            Chuyên môn:{' '}
            {
              activeAssignment
                .SpecializationName
            }
          </p>

          <p>
            Ngày bắt đầu:{' '}
            {
              activeAssignment
                .StartDate
            }
          </p>

          <label className="form-field">
            <span>
              Lý do kết thúc phân công
            </span>

            <textarea
              rows="3"
              value={endReason}
              onChange={(
                event,
              ) =>
                setEndReason(
                  event.target
                    .value,
                )
              }
            />
          </label>

          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={() =>
              void endCurrentAssignment()
            }
          >
            Kết thúc phân công hiện tại
          </button>
        </section>
      ) : selectedTrainerId ? (
        <section className="panel">
          <h2>
            Xác nhận phân Trainer
          </h2>

          <p>
            Trainer:{' '}

            <strong>
              {
                trainers.find(
                  (item) =>
                    String(
                      item.UserID,
                    ) ===
                    String(
                      selectedTrainerId,
                    ),
                )?.FullName
              }
            </strong>
          </p>

          <label className="form-field">
            <span>
              Ghi chú phân công
            </span>

            <textarea
              rows="3"
              value={assignmentNote}
              onChange={(
                event,
              ) =>
                setAssignmentNote(
                  event.target
                    .value,
                )
              }
            />
          </label>

          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={() =>
              void createAssignment()
            }
          >
            {busy
              ? 'Đang phân công...'
              : 'Xác nhận phân Trainer'}
          </button>
        </section>
      ) : null}

      <section className="panel">
  <div className="profile-actions">
    <Link
      className="button button-secondary"
      to={`/training/horses/${horseId}/assessment-history`}
    >
      Xem lịch sử đánh giá
    </Link>
  </div>
</section>

    </main>
  )
}