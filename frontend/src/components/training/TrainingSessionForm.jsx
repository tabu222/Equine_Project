import {
  useMemo,
} from 'react'

export function createEmptySessionForm({
  planId = '',
  stageId = '',
} = {}) {
  return {
    TrainingPlanID:
      planId
        ? String(planId)
        : '',

    TrainingPlanStageID:
      stageId
        ? String(stageId)
        : '',

    WorkRiderID: '',

    SubstituteTrainerID: '',

    SessionDate: '',

    StartTime: '',

    EndTime: '',

    SequenceNo: '',

    TrainingType: '',

    DurationPlannedMinutes: '',

    DistancePlannedKm: '',

    TargetSpeedKmh: '',

    TrainingLoad: '',

    Surface: '',

    Location: '',

    Instructions: '',
  }
}

export function sessionToForm(
  session,
) {
  return {
    TrainingPlanID:
      String(
        session.TrainingPlanID,
      ),

    TrainingPlanStageID:
      String(
        session.TrainingPlanStageID,
      ),

    WorkRiderID:
      String(
        session.WorkRiderID,
      ),

    SubstituteTrainerID:
      session.SubstituteTrainerID
        ? String(
            session.SubstituteTrainerID,
          )
        : '',

    SessionDate:
      session.SessionDate ||
      '',

    StartTime:
      session.StartTime
        ? String(
            session.StartTime,
          ).slice(
            0,
            5,
          )
        : '',

    EndTime:
      session.EndTime
        ? String(
            session.EndTime,
          ).slice(
            0,
            5,
          )
        : '',

    SequenceNo:
      session.SequenceNo ??
      '',

    TrainingType:
      session.TrainingType ||
      '',

    DurationPlannedMinutes:
      session.DurationPlannedMinutes ??
      '',

    DistancePlannedKm:
      session.DistancePlannedKm ??
      '',

    TargetSpeedKmh:
      session.TargetSpeedKmh ??
      '',

    TrainingLoad:
      session.TrainingLoad ??
      '',

    Surface:
      session.Surface ||
      '',

    Location:
      session.Location ||
      '',

    Instructions:
      session.Instructions ||
      '',
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

function localToday() {
  const now =
    new Date()

  const year =
    now.getFullYear()

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      now.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
}

export function validateSessionForm(
  form,
  plans,
  {
    isCreate = false,
  } = {},
) {
  const plan =
    plans.find(
      (item) =>
        String(
          item.TrainingPlanID,
        ) ===
        String(
          form.TrainingPlanID,
        ),
    )

  if (!plan) {
    return 'Vui lòng chọn Training Plan Active.'
  }

  const stage =
    plan.Stages.find(
      (item) =>
        String(
          item.TrainingPlanStageID,
        ) ===
        String(
          form.TrainingPlanStageID,
        ),
    )

  if (!stage) {
    return 'Vui lòng chọn Stage.'
  }

  if (!form.WorkRiderID) {
    return 'Vui lòng phân Work Rider.'
  }

  if (!form.SessionDate) {
    return 'Ngày tập là bắt buộc.'
  }

  if (
    isCreate &&
    form.SessionDate <
      localToday()
  ) {
    return 'Không thể xếp buổi tập vào ngày đã qua.'
  }

  if (
    form.SessionDate <
    stage.StartDate
  ) {
    return 'Ngày tập nằm trước ngày bắt đầu Stage.'
  }

  const stageEnd =
    stage.EndDate ||
    plan.EndDate

  if (
    stageEnd &&
    form.SessionDate >
      stageEnd
  ) {
    return 'Ngày tập nằm ngoài thời gian của Stage.'
  }

  if (!form.StartTime) {
    return 'Giờ bắt đầu là bắt buộc.'
  }

  if (
    form.EndTime &&
    form.EndTime <
      form.StartTime
  ) {
    return 'Giờ kết thúc phải sau giờ bắt đầu.'
  }

  if (
    !form.TrainingType
      .trim()
  ) {
    return 'Loại bài tập là bắt buộc.'
  }

  if (
    form.SequenceNo !==
      '' &&
    (
      Number.isNaN(
        Number(
          form.SequenceNo,
        ),
      ) ||
      Number(
        form.SequenceNo,
      ) <= 0
    )
  ) {
    return 'Sequence No phải lớn hơn 0.'
  }

  if (
    form.DurationPlannedMinutes !==
      '' &&
    (
      Number.isNaN(
        Number(
          form.DurationPlannedMinutes,
        ),
      ) ||
      Number(
        form.DurationPlannedMinutes,
      ) <= 0
    )
  ) {
    return 'Thời lượng dự kiến phải lớn hơn 0.'
  }

  for (
    const [
      value,
      label,
    ] of [
      [
        form.DistancePlannedKm,
        'Quãng đường dự kiến',
      ],
      [
        form.TargetSpeedKmh,
        'Tốc độ mục tiêu',
      ],
      [
        form.TrainingLoad,
        'Training Load',
      ],
    ]
  ) {
    if (
      value !== '' &&
      (
        Number.isNaN(
          Number(value),
        ) ||
        Number(value) < 0
      )
    ) {
      return `${label} không hợp lệ.`
    }
  }

  return ''
}

export function sessionToPayload(
  form,
) {
  return {
    TrainingPlanStageID:
      Number(
        form.TrainingPlanStageID,
      ),

    WorkRiderID:
      Number(
        form.WorkRiderID,
      ),

    SubstituteTrainerID:
      form.SubstituteTrainerID
        ? Number(
            form.SubstituteTrainerID,
          )
        : null,

    SessionDate:
      form.SessionDate,

    StartTime:
      form.StartTime,

    EndTime:
      form.EndTime ||
      null,

    SequenceNo:
      optionalNumber(
        form.SequenceNo,
      ),

    TrainingType:
      form.TrainingType
        .trim(),

    DurationPlannedMinutes:
      optionalNumber(
        form.DurationPlannedMinutes,
      ),

    DistancePlannedKm:
      optionalNumber(
        form.DistancePlannedKm,
      ),

    TargetSpeedKmh:
      optionalNumber(
        form.TargetSpeedKmh,
      ),

    TrainingLoad:
      optionalNumber(
        form.TrainingLoad,
      ),

    Surface:
      form.Surface
        .trim() ||
      null,

    Location:
      form.Location
        .trim() ||
      null,

    Instructions:
      form.Instructions
        .trim() ||
      null,
  }
}

export default function TrainingSessionForm({
  form,
  setForm,
  plans,
  riders,
  supervisors,
  preferences,
  planLocked = false,
  busy = false,
  submitLabel,
  onSubmit,
  onCancel,
}) {
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

  const selectedStage =
    useMemo(
      () =>
        selectedPlan?.Stages.find(
          (stage) =>
            String(
              stage.TrainingPlanStageID,
            ) ===
            String(
              form.TrainingPlanStageID,
            ),
        ) || null,
      [
        selectedPlan,
        form.TrainingPlanStageID,
      ],
    )

  const preferenceMap =
    useMemo(() => {
      const map =
        new Map()

      preferences.forEach(
        (item) => {
          map.set(
            String(
              item.WorkRiderID,
            ),
            item,
          )
        },
      )

      return map
    }, [preferences])

  const sortedRiders =
    useMemo(
      () =>
        [...riders].sort(
          (
            first,
            second,
          ) => {
            const firstPreference =
              preferenceMap.get(
                String(
                  first.id,
                ),
              )

            const secondPreference =
              preferenceMap.get(
                String(
                  second.id,
                ),
              )

            if (
              firstPreference &&
              !secondPreference
            ) {
              return -1
            }

            if (
              !firstPreference &&
              secondPreference
            ) {
              return 1
            }

            if (
              firstPreference &&
              secondPreference
            ) {
              return (
                firstPreference.Priority -
                secondPreference.Priority
              )
            }

            return first.fullName.localeCompare(
              second.fullName,
              'vi',
            )
          },
        ),
      [
        riders,
        preferenceMap,
      ],
    )

  const availableSupervisors =
    useMemo(
      () =>
        supervisors.filter(
          (user) =>
            !selectedPlan ||
            String(
              user.id,
            ) !==
              String(
                selectedPlan.TrainerID,
              ),
        ),
      [
        supervisors,
        selectedPlan,
      ],
    )

  function change(
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

  function changePlan(
    value,
  ) {
    const nextPlan =
      plans.find(
        (plan) =>
          String(
            plan.TrainingPlanID,
          ) ===
          String(value),
      )

    setForm(
      (current) => ({
        ...current,

        TrainingPlanID:
          value,

        TrainingPlanStageID:
          nextPlan
            ?.Stages?.[0]
            ?.TrainingPlanStageID
            ? String(
                nextPlan
                  .Stages[0]
                  .TrainingPlanStageID,
              )
            : '',

        SubstituteTrainerID:
          '',
      }),
    )
  }

  return (
    <form
      className="training-session-form"
      onSubmit={onSubmit}
    >
      <section className="training-session-form-section">
        <div className="training-session-form-section-head">
          <div>
            <span className="training-session-kicker">
              PLAN & STAGE
            </span>

            <h2>
              Ngữ cảnh buổi tập
            </h2>

            <p>
              Chỉ Training Plan Active mới
              được dùng để xếp buổi tập.
            </p>
          </div>
        </div>

        <div className="training-session-form-grid">
          <label className="form-field">
            <span>
              Training Plan *
            </span>

            <select
              required
              disabled={
                planLocked
              }
              value={
                form.TrainingPlanID
              }
              onChange={(event) =>
                changePlan(
                  event.target.value,
                )
              }
            >
              <option value="">
                Chọn giáo án
              </option>

              {plans.map(
                (plan) => (
                  <option
                    key={
                      plan.TrainingPlanID
                    }
                    value={
                      plan.TrainingPlanID
                    }
                  >
                    #
                    {
                      plan.TrainingPlanID
                    }
                    {' · '}
                    {
                      plan.HorseName
                    }
                    {' · '}
                    {
                      plan.TrainerName
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="form-field">
            <span>
              Stage *
            </span>

            <select
              required
              disabled={
                !selectedPlan
              }
              value={
                form.TrainingPlanStageID
              }
              onChange={(event) =>
                change(
                  'TrainingPlanStageID',
                  event.target.value,
                )
              }
            >
              <option value="">
                Chọn Stage
              </option>

              {selectedPlan
                ?.Stages?.map(
                  (stage) => (
                    <option
                      key={
                        stage.TrainingPlanStageID
                      }
                      value={
                        stage.TrainingPlanStageID
                      }
                    >
                      Stage{' '}
                      {
                        stage.StageOrder
                      }
                      {' · '}
                      {
                        stage.StageName
                      }
                    </option>
                  ),
                )}
            </select>
          </label>
        </div>

        {selectedPlan && (
          <div className="training-session-context-grid">
            <div>
              <span>
                Ngựa
              </span>

              <strong>
                {
                  selectedPlan.HorseName
                }
              </strong>
            </div>

            <div>
              <span>
                Trainer phụ trách
              </span>

              <strong>
                {
                  selectedPlan.TrainerName
                }
              </strong>
            </div>

            <div>
              <span>
                Plan
              </span>

              <strong>
                #
                {
                  selectedPlan.TrainingPlanID
                }{' '}
                · Active
              </strong>
            </div>

            <div>
              <span>
                Stage
              </span>

              <strong>
                {selectedStage
                  ? selectedStage.StageName
                  : 'Chưa chọn'}
              </strong>
            </div>
          </div>
        )}
      </section>

      <section className="training-session-form-section">
        <div className="training-session-form-section-head">
          <div>
            <span className="training-session-kicker">
              PEOPLE
            </span>

            <h2>
              Phân công buổi tập
            </h2>

            <p>
              Work Rider là người trực tiếp
              thực hiện buổi tập.
              Substitute Trainer chỉ dùng
              khi Trainer phụ trách không
              trực tiếp giám sát.
            </p>
          </div>
        </div>

        <div className="training-session-form-grid">
          <label className="form-field">
            <span>
              Work Rider *
            </span>

            <select
              required
              value={
                form.WorkRiderID
              }
              onChange={(event) =>
                change(
                  'WorkRiderID',
                  event.target.value,
                )
              }
            >
              <option value="">
                Chọn Work Rider
              </option>

              {sortedRiders.map(
                (rider) => {
                  const preference =
                    preferenceMap.get(
                      String(
                        rider.id,
                      ),
                    )

                  return (
                    <option
                      key={
                        rider.id
                      }
                      value={
                        rider.id
                      }
                    >
                      {
                        rider.fullName
                      }
                      {preference
                        ? ` · Ưu tiên #${preference.Priority}`
                        : ''}
                    </option>
                  )
                },
              )}
            </select>

            <small>
              Rider quen ngựa được đưa lên
              đầu danh sách theo Work Rider
              Preference.
            </small>
          </label>

          <label className="form-field">
            <span>
              Substitute Trainer
            </span>

            <select
              value={
                form.SubstituteTrainerID
              }
              onChange={(event) =>
                change(
                  'SubstituteTrainerID',
                  event.target.value,
                )
              }
            >
              <option value="">
                Không dùng — Trainer phụ trách giám sát
              </option>

              {availableSupervisors.map(
                (user) => (
                  <option
                    key={
                      user.id
                    }
                    value={
                      user.id
                    }
                  >
                    {
                      user.fullName
                    }
                    {' · '}
                    {user.role ===
                    'HEAD_TRAINER'
                      ? 'Head Trainer'
                      : 'Trainer'}
                  </option>
                ),
              )}
            </select>

            <small>
              Trainer phụ trách không xuất
              hiện trong danh sách
              Substitute vì để trống đã có
              cùng ý nghĩa.
            </small>
          </label>
        </div>
      </section>

      <section className="training-session-form-section">
        <div className="training-session-form-section-head">
          <div>
            <span className="training-session-kicker">
              SCHEDULE
            </span>

            <h2>
              Thời gian buổi tập
            </h2>
          </div>
        </div>

        <div className="training-session-form-grid training-session-time-grid">
          <label className="form-field">
            <span>
              Ngày tập *
            </span>

            <input
              required
              type="date"
              value={
                form.SessionDate
              }
              onChange={(event) =>
                change(
                  'SessionDate',
                  event.target.value,
                )
              }
            />

            {selectedStage && (
              <small>
                Stage:{' '}
                {
                  selectedStage.StartDate
                }{' '}
                →{' '}
                {selectedStage.EndDate ||
                  selectedPlan?.EndDate ||
                  'không giới hạn'}
              </small>
            )}
          </label>

          <label className="form-field">
            <span>
              Giờ bắt đầu *
            </span>

            <input
              required
              type="time"
              value={
                form.StartTime
              }
              onChange={(event) =>
                change(
                  'StartTime',
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-field">
            <span>
              Giờ kết thúc dự kiến
            </span>

            <input
              type="time"
              value={
                form.EndTime
              }
              onChange={(event) =>
                change(
                  'EndTime',
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-field">
            <span>
              Sequence No
            </span>

            <input
              type="number"
              min="1"
              step="1"
              value={
                form.SequenceNo
              }
              placeholder="Để trống = Backend tự xếp"
              onChange={(event) =>
                change(
                  'SequenceNo',
                  event.target.value,
                )
              }
            />

            <small>
              Khuyên để trống. Backend tự
              lấy slot tiếp theo trong ngày
              của Work Rider.
            </small>
          </label>
        </div>
      </section>

      <section className="training-session-form-section">
        <div className="training-session-form-section-head">
          <div>
            <span className="training-session-kicker">
              TRAINING CONTENT
            </span>

            <h2>
              Nội dung tập luyện
            </h2>
          </div>
        </div>

        <div className="training-session-form-grid">
          <label className="form-field">
            <span>
              Loại bài tập *
            </span>

            <input
              required
              maxLength="100"
              value={
                form.TrainingType
              }
              placeholder="Ví dụ: Canter, Gallop, Endurance..."
              onChange={(event) =>
                change(
                  'TrainingType',
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-field">
            <span>
              Thời lượng dự kiến (phút)
            </span>

            <input
              type="number"
              min="1"
              step="1"
              value={
                form.DurationPlannedMinutes
              }
              placeholder="45"
              onChange={(event) =>
                change(
                  'DurationPlannedMinutes',
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-field">
            <span>
              Quãng đường dự kiến (km)
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.DistancePlannedKm
              }
              placeholder="3.5"
              onChange={(event) =>
                change(
                  'DistancePlannedKm',
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-field">
            <span>
              Tốc độ mục tiêu (km/h)
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.TargetSpeedKmh
              }
              placeholder="30"
              onChange={(event) =>
                change(
                  'TargetSpeedKmh',
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
                form.TrainingLoad
              }
              placeholder="30"
              onChange={(event) =>
                change(
                  'TrainingLoad',
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
              maxLength="100"
              value={
                form.Surface
              }
              placeholder="Turf"
              onChange={(event) =>
                change(
                  'Surface',
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-field training-session-form-full">
            <span>
              Địa điểm
            </span>

            <input
              maxLength="200"
              value={
                form.Location
              }
              placeholder="Ví dụ: Track no. 2"
              onChange={(event) =>
                change(
                  'Location',
                  event.target.value,
                )
              }
            />
          </label>

          <label className="form-field training-session-form-full">
            <span>
              Hướng dẫn cho Work Rider
            </span>

            <textarea
              rows="4"
              maxLength="2000"
              value={
                form.Instructions
              }
              placeholder="Ví dụ: Warm up 10 phút, theo dõi nhịp thở..."
              onChange={(event) =>
                change(
                  'Instructions',
                  event.target.value,
                )
              }
            />
          </label>
        </div>
      </section>

      <div className="training-session-form-actions">
        {onCancel && (
          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={onCancel}
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