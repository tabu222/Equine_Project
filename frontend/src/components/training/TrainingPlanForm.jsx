export const INTENSITY_LABELS = {
  Low: 'Thấp',
  Moderate: 'Trung bình',
  High: 'Cao',
  'Very High': 'Rất cao',
}

export function createEmptyStage() {
  return {
    TrainingPlanStageID:
      null,

    StageOrder:
      null,

    StageName:
      '',

    Goal:
      '',

    StartDate:
      '',

    EndDate:
      '',

    Intensity:
      'Low',

    TrainingLoad:
      '',

    DistanceTargetKm:
      '',

    Surface:
      '',

    Note:
      '',

    PendingDelete:
      false,
  }
}

export function createEmptyPlanForm(
  horseId = '',
) {
  return {
    HorseID:
      horseId
        ? String(
            horseId,
          )
        : '',

    Goal:
      '',

    StartDate:
      '',

    EndDate:
      '',

    OverallIntensity:
      'Moderate',

    Note:
      '',

    Stages: [],
  }
}

export function planToForm(
  plan,
) {
  return {
    HorseID:
      String(
        plan.HorseID,
      ),

    Goal:
      plan.Goal ||
      '',

    StartDate:
      plan.StartDate ||
      '',

    EndDate:
      plan.EndDate ||
      '',

    OverallIntensity:
      plan.OverallIntensity ||
      'Moderate',

    Note:
      plan.Note ||
      '',

    Stages:
      Array.isArray(
        plan.Stages,
      )
        ? plan.Stages.map(
            (stage) => ({
              TrainingPlanStageID:
                stage.TrainingPlanStageID,

              StageOrder:
                stage.StageOrder,

              StageName:
                stage.StageName ||
                '',

              Goal:
                stage.Goal ||
                '',

              StartDate:
                stage.StartDate ||
                '',

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

              PendingDelete:
                false,
            }),
          )
        : [],
  }
}

function optionalNumber(
  value,
) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null
  }

  const numeric =
    Number(value)

  return Number.isNaN(
    numeric,
  )
    ? null
    : numeric
}

export function stageToPayload(
  stage,
) {
  const payload = {
    StageName:
      stage.StageName
        .trim(),

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
      stage.Intensity ||
      null,

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
    stage.StageOrder
  ) {
    payload.StageOrder =
      Number(
        stage.StageOrder,
      )
  }

  return payload
}

export function planToPayload(
  form,
) {
  return {
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
      form.OverallIntensity ||
      null,

    Note:
      form.Note
        .trim() ||
      null,

    Stages:
      form.Stages
        .filter(
          (stage) =>
            !stage.PendingDelete,
        )
        .map(
          (stage) => {
            const payload =
              stageToPayload(
                stage,
              )

            delete payload.StageOrder

            return payload
          },
        ),
  }
}

export function validatePlanForm(
  form,
) {
  if (!form.HorseID) {
    return 'Vui lòng chọn ngựa.'
  }

  if (
    !form.StartDate
  ) {
    return 'Ngày bắt đầu giáo án là bắt buộc.'
  }

  if (
    form.EndDate &&
    form.EndDate <
      form.StartDate
  ) {
    return 'Ngày kết thúc giáo án phải sau ngày bắt đầu.'
  }

  const stages =
    form.Stages.filter(
      (stage) =>
        !stage.PendingDelete,
    )

  for (
    let index = 0;
    index <
    stages.length;
    index += 1
  ) {
    const stage =
      stages[index]

    if (
      !stage.StageName
        .trim()
    ) {
      return `Giai đoạn ${index + 1} chưa có tên.`
    }

    if (
      !stage.StartDate
    ) {
      return `Giai đoạn ${index + 1} chưa có ngày bắt đầu.`
    }

    if (
      stage.EndDate &&
      stage.EndDate <
        stage.StartDate
    ) {
      return `Ngày kết thúc của giai đoạn ${index + 1} không hợp lệ.`
    }

    if (
      stage.StartDate <
      form.StartDate
    ) {
      return `Giai đoạn ${index + 1} bắt đầu trước giáo án.`
    }

    if (
      form.EndDate &&
      (
        stage.EndDate ||
        stage.StartDate
      ) >
        form.EndDate
    ) {
      return `Giai đoạn ${index + 1} nằm ngoài thời gian giáo án.`
    }

    if (
      stage.TrainingLoad !==
        '' &&
      (
        Number.isNaN(
          Number(
            stage.TrainingLoad,
          ),
        ) ||
        Number(
          stage.TrainingLoad,
        ) < 0
      )
    ) {
      return `Training Load của giai đoạn ${index + 1} không hợp lệ.`
    }

    if (
      stage.DistanceTargetKm !==
        '' &&
      (
        Number.isNaN(
          Number(
            stage.DistanceTargetKm,
          ),
        ) ||
        Number(
          stage.DistanceTargetKm,
        ) < 0
      )
    ) {
      return `Quãng đường mục tiêu của giai đoạn ${index + 1} không hợp lệ.`
    }
  }

  return ''
}

export default function TrainingPlanForm({
  form,
  setForm,
  assignments,
  horseLocked = false,
  busy = false,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  function changePlanField(
    field,
    value,
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]:
          value,
      }),
    )
  }

  function changeStage(
    index,
    field,
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
                    [field]:
                      value,
                  }
                : stage,
          ),
      }),
    )
  }

  function addStage() {
    setForm(
      (current) => ({
        ...current,

        Stages: [
          ...current.Stages,
          createEmptyStage(),
        ],
      }),
    )
  }

  function removeStage(
    index,
  ) {
    setForm(
      (current) => {
        const stage =
          current.Stages[
            index
          ]

        if (
          stage
            ?.TrainingPlanStageID
        ) {
          return {
            ...current,

            Stages:
              current.Stages.map(
                (
                  item,
                  stageIndex,
                ) =>
                  stageIndex ===
                  index
                    ? {
                        ...item,
                        PendingDelete:
                          true,
                      }
                    : item,
              ),
          }
        }

        return {
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
        }
      },
    )
  }

  function restoreStage(
    index,
  ) {
    changeStage(
      index,
      'PendingDelete',
      false,
    )
  }

  return (
    <form
      className="training-plan-form"
      onSubmit={onSubmit}
    >
      <section className="training-plan-form-section">
        <div className="training-plan-form-section-head">
          <div>
            <span className="training-plan-kicker">
              THÔNG TIN GIÁO ÁN
            </span>

            <h2>
              Training Plan
            </h2>
          </div>
        </div>

        <div className="training-plan-form-grid">
          <label className="form-field">
            <span>
              Ngựa *
            </span>

            <select
              required
              disabled={
                horseLocked
              }
              value={
                form.HorseID
              }
              onChange={(event) =>
                changePlanField(
                  'HorseID',
                  event.target.value,
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
              Cường độ tổng thể
            </span>

            <select
              value={
                form.OverallIntensity
              }
              onChange={(event) =>
                changePlanField(
                  'OverallIntensity',
                  event.target.value,
                )
              }
            >
              <option value="Low">
                Thấp
              </option>

              <option value="Moderate">
                Trung bình
              </option>

              <option value="High">
                Cao
              </option>

              <option value="Very High">
                Rất cao
              </option>
            </select>
          </label>

          <label className="form-field">
            <span>
              Ngày bắt đầu *
            </span>

            <input
              required
              type="date"
              value={
                form.StartDate
              }
              onChange={(event) =>
                changePlanField(
                  'StartDate',
                  event.target.value,
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
              onChange={(event) =>
                changePlanField(
                  'EndDate',
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-field training-plan-form-full">
            <span>
              Mục tiêu giáo án
            </span>

            <textarea
              rows="4"
              maxLength="1000"
              value={
                form.Goal
              }
              placeholder="Ví dụ: Chuẩn bị thể lực và tốc độ cho giải đua tháng 12..."
              onChange={(event) =>
                changePlanField(
                  'Goal',
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-field training-plan-form-full">
            <span>
              Ghi chú
            </span>

            <textarea
              rows="3"
              maxLength="2000"
              value={
                form.Note
              }
              placeholder="Ghi chú chung nếu có..."
              onChange={(event) =>
                changePlanField(
                  'Note',
                  event.target.value,
                )
              }
            />
          </label>
        </div>
      </section>

      <section className="training-plan-form-section">
        <div className="training-plan-form-section-head">
          <div>
            <span className="training-plan-kicker">
              STAGES
            </span>

            <h2>
              Các giai đoạn
            </h2>

            
          </div>

          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={
              addStage
            }
          >
            + Thêm giai đoạn
          </button>
        </div>

        {form.Stages.length ===
        0 ? (
          <div className="training-plan-no-stage">
            <strong>
              Chưa có giai đoạn
            </strong>

            <p>
              Có thể lưu Plan dưới dạng
              Draft trước, sau đó thêm
              Stage ở trang chỉnh sửa.
            </p>

            <button
              className="button button-secondary"
              type="button"
              onClick={
                addStage
              }
            >
              Thêm Stage đầu tiên
            </button>
          </div>
        ) : (
          <div className="training-plan-stage-form-list">
            {form.Stages.map(
              (
                stage,
                index,
              ) => (
                <article
                  className={`training-plan-stage-form-card ${
                    stage.PendingDelete
                      ? 'is-pending-delete'
                      : ''
                  }`}
                  key={
                    stage.TrainingPlanStageID ||
                    `new-stage-${index}`
                  }
                >
                  <div className="training-plan-stage-form-head">
                    <div>
                      <span>
                        Giai đoạn
                      </span>

                      <strong>
                        {stage.StageOrder ||
                          index + 1}
                      </strong>
                    </div>

                    {stage.PendingDelete ? (
                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          restoreStage(
                            index,
                          )
                        }
                      >
                        Hoàn tác xóa
                      </button>
                    ) : (
                      <button
                        className="training-plan-text-danger"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          removeStage(
                            index,
                          )
                        }
                      >
                        Xóa Stage
                      </button>
                    )}
                  </div>

                  {stage.PendingDelete ? (
                    <div className="training-plan-stage-delete-preview">
                      <strong>
                        {stage.StageName ||
                          `Stage ${index + 1}`}
                      </strong>

                      <span>
                        Stage sẽ bị xóa khi
                        lưu thay đổi.
                      </span>
                    </div>
                  ) : (
                    <div className="training-plan-stage-form-grid">
                      <label className="form-field">
                        <span>
                          Tên giai đoạn *
                        </span>

                        <input
                          required
                          maxLength="100"
                          value={
                            stage.StageName
                          }
                          placeholder="Foundation"
                          onChange={(event) =>
                            changeStage(
                              index,
                              'StageName',
                              event.target.value,
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
                          onChange={(event) =>
                            changeStage(
                              index,
                              'Intensity',
                              event.target.value,
                            )
                          }
                        >
                          <option value="Low">
                            Thấp
                          </option>

                          <option value="Moderate">
                            Trung bình
                          </option>

                          <option value="High">
                            Cao
                          </option>

                          <option value="Very High">
                            Rất cao
                          </option>
                        </select>
                      </label>

                      <label className="form-field">
                        <span>
                          Ngày bắt đầu *
                        </span>

                        <input
                          required
                          type="date"
                          value={
                            stage.StartDate
                          }
                          onChange={(event) =>
                            changeStage(
                              index,
                              'StartDate',
                              event.target.value,
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
                          onChange={(event) =>
                            changeStage(
                              index,
                              'EndDate',
                              event.target.value,
                            )
                          }
                        />
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
                          placeholder="30"
                          onChange={(event) =>
                            changeStage(
                              index,
                              'TrainingLoad',
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label className="form-field">
                        <span>
                          Quãng đường mục tiêu (km)
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            stage.DistanceTargetKm
                          }
                          placeholder="3.5"
                          onChange={(event) =>
                            changeStage(
                              index,
                              'DistanceTargetKm',
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label className="form-field">
                        <span>
                          Mặt sân
                        </span>

                        <input
                          maxLength="50"
                          value={
                            stage.Surface
                          }
                          placeholder="Turf"
                          onChange={(event) =>
                            changeStage(
                              index,
                              'Surface',
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label className="form-field training-plan-form-full">
                        <span>
                          Mục tiêu Stage
                        </span>

                        <textarea
                          rows="3"
                          maxLength="1000"
                          value={
                            stage.Goal
                          }
                          placeholder="Mục tiêu riêng của giai đoạn..."
                          onChange={(event) =>
                            changeStage(
                              index,
                              'Goal',
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label className="form-field training-plan-form-full">
                        <span>
                          Ghi chú Stage
                        </span>

                        <textarea
                          rows="3"
                          maxLength="1500"
                          value={
                            stage.Note
                          }
                          placeholder="Ghi chú nếu có..."
                          onChange={(event) =>
                            changeStage(
                              index,
                              'Note',
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  )}
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <div className="training-plan-form-actions">
        {onCancel && (
          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={
              onCancel
            }
          >
            Hủy
          </button>
        )}

        <button
          className="button"
          type="submit"
          disabled={busy}
        >
          {busy
            ? 'Đang lưu...'
            : submitLabel}
        </button>
      </div>
    </form>
  )
}