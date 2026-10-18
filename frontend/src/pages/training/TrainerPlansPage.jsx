import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  addTrainingPlanStage,
  cancelTrainingPlan,
  completeTrainingPlan,
  createTrainingPlan,
  deleteTrainingPlanStage,
  getTrainerAssignments,
  getTrainingPlans,
  reviseTrainingPlan,
  submitTrainingPlan,
  updateTrainingPlan,
  updateTrainingPlanStage,
} from '../../api/trainingApi.ts'

const emptyStage = () => ({
  TrainingPlanStageID: null,
  StageName: '',
  Goal: '',
  StartDate: '',
  EndDate: '',
  Intensity: 'Low',
  TrainingLoad: '',
  DistanceTargetKm: '',
  Surface: '',
  Note: '',
})

const emptyForm = () => ({
  HorseID: '',
  Goal: '',
  StartDate: '',
  EndDate: '',
  OverallIntensity:
    'Moderate',
  Note: '',
  Stages: [
    emptyStage(),
  ],
})

function optionalNumber(
  value,
) {
  return value === ''
    ? null
    : Number(value)
}

export default function TrainerPlansPage() {
  const [
    assignments,
    setAssignments,
  ] = useState([])

  const [plans, setPlans] =
    useState([])

  const [form, setForm] =
    useState(emptyForm)

  const [
    editingPlanId,
    setEditingPlanId,
  ] = useState(null)

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
          const [
            assignmentRows,
            planRows,
          ] =
            await Promise.all([
              getTrainerAssignments({
                mine: true,
                Status:
                  'Active',
              }),

              getTrainingPlans({
                mine: true,
              }),
            ])

          setAssignments(
            assignmentRows,
          )

          setPlans(
            planRows,
          )
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không thể tải dữ liệu giáo án.',
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

  function changeStage(
    index,
    key,
    value,
  ) {
    setForm(
      (current) => ({
        ...current,

        Stages:
          current.Stages.map(
            (
              stage,
              stageIndex,
            ) =>
              stageIndex ===
              index
                ? {
                    ...stage,
                    [key]:
                      value,
                  }
                : stage,
          ),
      }),
    )
  }

  function addStageRow() {
    setForm(
      (current) => ({
        ...current,

        Stages: [
          ...current.Stages,
          emptyStage(),
        ],
      }),
    )
  }

  async function removeStageRow(
    index,
  ) {
    const stage =
      form.Stages[index]

    if (
      stage
        ?.TrainingPlanStageID
    ) {
      setBusy(true)
      setError('')

      try {
        await deleteTrainingPlanStage(
          stage.TrainingPlanStageID,
        )
      } catch (removeError) {
        setError(
          removeError instanceof Error
            ? removeError.message
            : 'Không thể xóa giai đoạn.',
        )

        setBusy(false)

        return
      }

      setBusy(false)
    }

    setForm(
      (current) => ({
        ...current,

        Stages:
          current.Stages.filter(
            (
              _,
              stageIndex,
            ) =>
              stageIndex !==
              index,
          ),
      }),
    )
  }

  function editPlan(
    plan,
  ) {
    if (
      plan.Status !==
      'Draft'
    ) {
      return
    }

    setEditingPlanId(
      plan.TrainingPlanID,
    )

    setForm({
      HorseID:
        String(
          plan.HorseID,
        ),

      Goal:
        plan.Goal || '',

      StartDate:
        plan.StartDate,

      EndDate:
        plan.EndDate || '',

      OverallIntensity:
        plan.OverallIntensity ||
        'Moderate',

      Note:
        plan.Note || '',

      Stages:
        plan.Stages.length
          ? plan.Stages.map(
              (stage) => ({
                TrainingPlanStageID:
                  stage.TrainingPlanStageID,

                StageName:
                  stage.StageName,

                Goal:
                  stage.Goal ||
                  '',

                StartDate:
                  stage.StartDate,

                EndDate:
                  stage.EndDate ||
                  '',

                Intensity:
                  stage.Intensity ||
                  'Low',

                TrainingLoad:
                  stage.TrainingLoad ??
                  '',

                DistanceTargetKm:
                  stage.DistanceTargetKm ??
                  '',

                Surface:
                  stage.Surface ||
                  '',

                Note:
                  stage.Note ||
                  '',
              }),
            )
          : [
              emptyStage(),
            ],
    })

    setMessage('')
    setError('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function resetEditor() {
    setEditingPlanId(
      null,
    )

    setForm(
      emptyForm(),
    )
  }

  async function savePlan(
    event,
  ) {
    event.preventDefault()

    if (
      !form.HorseID ||
      form.Stages.length ===
        0
    ) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (editingPlanId) {
        await updateTrainingPlan(
          editingPlanId,
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
              form.OverallIntensity,

            Note:
              form.Note
                .trim() ||
              null,
          },
        )

        for (
          const [
            index,
            stage,
          ] of
          form.Stages.entries()
        ) {
          const payload = {
            StageName:
              stage.StageName,

            StageOrder:
              index + 1,

            Goal:
              stage.Goal
                .trim() ||
              null,

            StartDate:
              stage.StartDate,

            EndDate:
              stage.EndDate ||
              null,

            Intensity:
              stage.Intensity,

            TrainingLoad:
              optionalNumber(
                stage.TrainingLoad,
              ),

            DistanceTargetKm:
              optionalNumber(
                stage.DistanceTargetKm,
              ),

            Surface:
              stage.Surface
                .trim() ||
              null,

            Note:
              stage.Note
                .trim() ||
              null,
          }

          if (
            stage
              .TrainingPlanStageID
          ) {
            await updateTrainingPlanStage(
              stage.TrainingPlanStageID,
              payload,
            )
          } else {
            await addTrainingPlanStage(
              editingPlanId,
              payload,
            )
          }
        }

        setMessage(
          'Đã cập nhật giáo án Draft.',
        )
      } else {
        await createTrainingPlan({
          HorseID:
            Number(
              form.HorseID,
            ),

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
            form.OverallIntensity,

          Note:
            form.Note
              .trim() ||
            null,

          Stages:
            form.Stages.map(
              (
                stage,
                index,
              ) => ({
                StageName:
                  stage.StageName,

                StageOrder:
                  index + 1,

                Goal:
                  stage.Goal
                    .trim() ||
                  null,

                StartDate:
                  stage.StartDate,

                EndDate:
                  stage.EndDate ||
                  null,

                Intensity:
                  stage.Intensity,

                TrainingLoad:
                  optionalNumber(
                    stage.TrainingLoad,
                  ),

                DistanceTargetKm:
                  optionalNumber(
                    stage.DistanceTargetKm,
                  ),

                Surface:
                  stage.Surface
                    .trim() ||
                  null,

                Note:
                  stage.Note
                    .trim() ||
                  null,
              }),
            ),
        })

        setMessage(
          'Đã tạo giáo án Draft.',
        )
      }

      resetEditor()

      await load()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Không thể lưu giáo án.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function runAction(
    action,
    successMessage,
  ) {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      await action()

      setMessage(
        successMessage,
      )

      await load()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Không thể thực hiện thao tác.',
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
          Ngựa và giáo án của tôi
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
        <h2>
          {editingPlanId
            ? `Sửa giáo án #${editingPlanId}`
            : 'Tạo giáo án'}
        </h2>

        {assignments.length ===
        0 ? (
          <p>
            Chưa có ngựa được Head
            Trainer phân công.
          </p>
        ) : (
          <form
            onSubmit={
              savePlan
            }
          >
            <label className="form-field">
              <span>
                Ngựa được phân công
              </span>

              <select
                required
                disabled={
                  Boolean(
                    editingPlanId,
                  )
                }
                value={
                  form.HorseID
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (current) => ({
                      ...current,

                      HorseID:
                        event.target
                          .value,
                    }),
                  )
                }
              >
                <option value="">
                  Chọn ngựa
                </option>

                {assignments.map(
                  (assignment) => (
                    <option
                      key={
                        assignment.TrainerHorseAssignmentID
                      }
                      value={
                        assignment.HorseID
                      }
                    >
                      {
                        assignment.HorseName
                      }
                      {' · '}
                      {
                        assignment.SpecializationName
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="form-field">
              <span>
                Mục tiêu giáo án
              </span>

              <textarea
                rows="3"
                value={
                  form.Goal
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (current) => ({
                      ...current,

                      Goal:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Ngày bắt đầu
              </span>

              <input
                required
                type="date"
                value={
                  form.StartDate
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (current) => ({
                      ...current,

                      StartDate:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Ngày kết thúc
              </span>

              <input
                type="date"
                value={
                  form.EndDate
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (current) => ({
                      ...current,

                      EndDate:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Cường độ tổng thể
              </span>

              <select
                value={
                  form.OverallIntensity
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (current) => ({
                      ...current,

                      OverallIntensity:
                        event.target
                          .value,
                    }),
                  )
                }
              >
                <option value="Low">
                  Low
                </option>

                <option value="Moderate">
                  Moderate
                </option>

                <option value="High">
                  High
                </option>

                <option value="Very High">
                  Very High
                </option>
              </select>
            </label>

            <label className="form-field">
              <span>
                Ghi chú
              </span>

              <textarea
                rows="3"
                value={
                  form.Note
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (current) => ({
                      ...current,

                      Note:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <h3>
              Các giai đoạn
            </h3>

            {form.Stages.map(
              (
                stage,
                index,
              ) => (
                <section
                  className="panel"
                  key={
                    stage.TrainingPlanStageID ||
                    `new-${index}`
                  }
                >
                  <h3>
                    Giai đoạn{' '}
                    {index + 1}
                  </h3>

                  <label className="form-field">
                    <span>
                      Tên giai đoạn
                    </span>

                    <input
                      required
                      value={
                        stage.StageName
                      }
                      onChange={(
                        event,
                      ) =>
                        changeStage(
                          index,
                          'StageName',
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      Mục tiêu
                    </span>

                    <input
                      value={
                        stage.Goal
                      }
                      onChange={(
                        event,
                      ) =>
                        changeStage(
                          index,
                          'Goal',
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      Ngày bắt đầu
                    </span>

                    <input
                      required
                      type="date"
                      value={
                        stage.StartDate
                      }
                      onChange={(
                        event,
                      ) =>
                        changeStage(
                          index,
                          'StartDate',
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      Ngày kết thúc
                    </span>

                    <input
                      type="date"
                      value={
                        stage.EndDate
                      }
                      onChange={(
                        event,
                      ) =>
                        changeStage(
                          index,
                          'EndDate',
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      Cường độ
                    </span>

                    <select
                      value={
                        stage.Intensity
                      }
                      onChange={(
                        event,
                      ) =>
                        changeStage(
                          index,
                          'Intensity',
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="Low">
                        Low
                      </option>

                      <option value="Moderate">
                        Moderate
                      </option>

                      <option value="High">
                        High
                      </option>

                      <option value="Very High">
                        Very High
                      </option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span>
                      Training Load
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        stage.TrainingLoad
                      }
                      onChange={(
                        event,
                      ) =>
                        changeStage(
                          index,
                          'TrainingLoad',
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      Khoảng cách mục tiêu
                      (km)
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        stage.DistanceTargetKm
                      }
                      onChange={(
                        event,
                      ) =>
                        changeStage(
                          index,
                          'DistanceTargetKm',
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      Mặt sân
                    </span>

                    <input
                      value={
                        stage.Surface
                      }
                      onChange={(
                        event,
                      ) =>
                        changeStage(
                          index,
                          'Surface',
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      Ghi chú giai đoạn
                    </span>

                    <textarea
                      rows="2"
                      value={
                        stage.Note
                      }
                      onChange={(
                        event,
                      ) =>
                        changeStage(
                          index,
                          'Note',
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  {form.Stages.length >
                    1 && (
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={
                        busy
                      }
                      onClick={() =>
                        void removeStageRow(
                          index,
                        )
                      }
                    >
                      Xóa giai đoạn
                    </button>
                  )}
                </section>
              ),
            )}

            <div className="profile-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={
                  addStageRow
                }
              >
                + Thêm giai đoạn
              </button>

              <button
                className="button"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? 'Đang lưu...'
                  : editingPlanId
                    ? 'Lưu chỉnh sửa'
                    : 'Tạo Draft'}
              </button>

              {editingPlanId && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={
                    resetEditor
                  }
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <h2>
          Danh sách giáo án
        </h2>

        {plans.length === 0 ? (
          <p>
            Chưa có giáo án.
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
                      Trạng thái:{' '}
                      {
                        plan.Status
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
                      Cường độ:{' '}
                      {
                        plan.OverallIntensity ||
                        '—'
                      }
                    </p>

                    <p>
                      Mục tiêu:{' '}
                      {
                        plan.Goal ||
                        '—'
                      }
                    </p>

                    {plan.ReviewNote && (
                      <p>
                        Phản hồi Head
                        Trainer:{' '}
                        {
                          plan.ReviewNote
                        }
                      </p>
                    )}

                    <p>
                      Số giai đoạn:{' '}
                      {
                        plan.Stages.length
                      }
                    </p>
                  </div>

                  <div className="profile-actions">
                    {plan.Status ===
                      'Draft' && (
                      <>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() =>
                            editPlan(
                              plan,
                            )
                          }
                        >
                          Sửa
                        </button>

                        <button
                          className="button"
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            void runAction(
                              () =>
                                submitTrainingPlan(
                                  plan.TrainingPlanID,
                                ),

                              'Đã gửi giáo án cho Head Trainer duyệt.',
                            )
                          }
                        >
                          Gửi duyệt
                        </button>
                      </>
                    )}

                    {plan.Status ===
                      'Active' && (
                      <>
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            void runAction(
                              () =>
                                reviseTrainingPlan(
                                  plan.TrainingPlanID,
                                ),

                              'Đã tạo bản Draft để điều chỉnh giáo án.',
                            )
                          }
                        >
                          Tạo bản điều chỉnh
                        </button>

                        <button
                          className="button"
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            void runAction(
                              () =>
                                completeTrainingPlan(
                                  plan.TrainingPlanID,
                                ),

                              'Đã hoàn tất giáo án.',
                            )
                          }
                        >
                          Hoàn tất
                        </button>
                      </>
                    )}

                    {plan.Status ===
                      'Completed' && (
                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          void runAction(
                            () =>
                              reviseTrainingPlan(
                                plan.TrainingPlanID,
                              ),

                            'Đã tạo bản Draft để điều chỉnh giáo án.',
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
                    ) && (
                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          void runAction(
                            () =>
                              cancelTrainingPlan(
                                plan.TrainingPlanID,
                                'Trainer hủy giáo án',
                              ),

                            'Đã hủy giáo án.',
                          )
                        }
                      >
                        Hủy giáo án
                      </button>
                    )}
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
