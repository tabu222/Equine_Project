import {
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
  getTrainerAssignments,
  getTrainers,
  getTrainingDashboard,
} from '../../api/trainingApi.ts'

const INITIAL_FORM = {
  SpecializationID: '',
  QualityScore: '',
  FitnessLevel: 'Good',
  AssessmentNote: '',
  DecisionStatus: 'Recommended',
}

const FITNESS_LABELS = {
  Excellent: 'Rất tốt',
  Good: 'Tốt',
  Average: 'Trung bình',
  'Needs Monitoring':
    'Cần theo dõi',
}

const DECISION_LABELS = {
  Recommended:
    'Đề xuất tiếp tục huấn luyện',
  Rejected:
    'Không đề xuất',
  Superseded:
    'Đã được thay thế',
}

const EXPERIENCE_LABELS = {
  Junior:
    'Mới vào nghề',
  Intermediate:
    'Trung cấp',
  Senior:
    'Kỳ cựu',
  Expert:
    'Chuyên gia',
}

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

function formatDate(
  value,
) {
  if (!value) {
    return '—'
  }

  const raw =
    String(value)

  const date =
    raw.includes('T')
      ? new Date(raw)
      : new Date(
          `${raw}T00:00:00`,
        )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return raw
  }

  return new Intl.DateTimeFormat(
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  ).format(date)
}

function formatDateTime(
  value,
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(value)
  }

  return new Intl.DateTimeFormat(
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}

function formatNumber(
  value,
  suffix = '',
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—'
  }

  const numeric =
    Number(value)

  if (
    Number.isNaN(
      numeric,
    )
  ) {
    return String(value)
  }

  const result =
    new Intl.NumberFormat(
      'vi-VN',
      {
        maximumFractionDigits: 1,
      },
    ).format(numeric)

  return suffix
    ? `${result}${suffix}`
    : result
}

function experienceLabel(
  level,
  backendName,
) {
  if (
    EXPERIENCE_LABELS[level]
  ) {
    return EXPERIENCE_LABELS[level]
  }

  return (
    backendName ||
    show(level)
  )
}

function fitnessLabel(
  value,
) {
  return (
    FITNESS_LABELS[value] ||
    show(value)
  )
}

function decisionLabel(
  value,
) {
  return (
    DECISION_LABELS[value] ||
    show(value)
  )
}

function healthLabel(
  value,
) {
  switch (value) {
    case 'Healthy':
      return 'Khỏe mạnh'

    case 'Monitor':
      return 'Cần theo dõi'

    case 'Injured':
      return 'Chấn thương'

    case 'Recovering':
      return 'Đang hồi phục'

    case 'Isolated':
      return 'Cách ly'

    default:
      return show(
        value,
        'Chưa cập nhật',
      )
  }
}

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

async function fetchPageData(
  horseId,
) {
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

  const recommended =
    assessmentRows.find(
      (item) =>
        item.DecisionStatus ===
        'Recommended',
    ) || null

  const trainerRows =
    recommended
      ? await getTrainers({
          HorseID:
            horseId,
        })
      : []

  return {
    horse:
      dashboardRows[0] ||
      null,

    specializations:
      Array.isArray(
        specializationRows,
      )
        ? specializationRows
        : [],

    assessments:
      Array.isArray(
        assessmentRows,
      )
        ? assessmentRows
        : [],

    assignments:
      Array.isArray(
        assignmentRows,
      )
        ? assignmentRows
        : [],

    trainers:
      Array.isArray(
        trainerRows,
      )
        ? trainerRows
        : [],
  }
}

export default function HorseAssessmentAssignmentPage({ mode = 'assessment' }) {
  const {
    horseId,
  } = useParams()

  const [
    horse,
    setHorse,
  ] = useState(null)

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

  const [
    trainers,
    setTrainers,
  ] = useState([])

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

  const [
    endModalOpen,
    setEndModalOpen,
  ] = useState(false)

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

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    form,
    setForm,
  ] = useState({
    ...INITIAL_FORM,
  })

  useEffect(() => {
    if (!horseId) {
      return undefined
    }

    let active = true

    fetchPageData(
      horseId,
    )
      .then((data) => {
        if (!active) {
          return
        }

        setHorse(
          data.horse,
        )

        setSpecializations(
          data.specializations,
        )

        setAssessments(
          data.assessments,
        )

        setAssignments(
          data.assignments,
        )

        setTrainers(
          data.trainers,
        )

        setError('')
      })
      .catch(
        (loadError) => {
          if (!active) {
            return
          }

          setError(
            getErrorMessage(
              loadError,
              'Không thể tải dữ liệu đánh giá ngựa.',
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

  const latestAssessment =
    assessments[0] ||
    null

  const selectedTrainer =
    useMemo(
      () =>
        trainers.find(
          (item) =>
            String(
              item.UserID,
            ) ===
            String(
              selectedTrainerId,
            ),
        ) || null,
      [
        selectedTrainerId,
        trainers,
      ],
    )

  async function reloadData() {
    if (!horseId) {
      return
    }

    const data =
      await fetchPageData(
        horseId,
      )

    setHorse(
      data.horse,
    )

    setSpecializations(
      data.specializations,
    )

    setAssessments(
      data.assessments,
    )

    setAssignments(
      data.assignments,
    )

    setTrainers(
      data.trainers,
    )
  }

  function updateForm(
    field,
    value,
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    )
  }

  async function saveAssessment(
    event,
  ) {
    event.preventDefault()

    if (
      !horseId ||
      !form.SpecializationID
    ) {
      setError(
        'Vui lòng chọn chuyên môn phù hợp.',
      )

      return
    }

    const qualityScore =
      form.QualityScore === ''
        ? null
        : Number(
            form.QualityScore,
          )

    if (
      qualityScore !== null &&
      (
        Number.isNaN(
          qualityScore,
        ) ||
        qualityScore < 0 ||
        qualityScore > 100
      )
    ) {
      setError(
        'Điểm chất lượng phải từ 0 đến 100.',
      )

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
            qualityScore,

          FitnessLevel:
            form.FitnessLevel,

          AssessmentNote:
            form.AssessmentNote
              .trim() ||
            null,

          DecisionStatus:
            form.DecisionStatus,
        },
      )

      await reloadData()

      setSelectedTrainerId(
        '',
      )

      setAssignmentNote(
        '',
      )

      setForm({
        ...INITIAL_FORM,
      })

      setMessage(
        form.DecisionStatus ===
          'Recommended'
          ? 'Đã lưu đánh giá. Có thể chuyển sang bước phân công huấn luyện viên.'
          : 'Đã lưu kết quả đánh giá không đề xuất.',
      )
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          'Không thể lưu đánh giá ngựa.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  function selectTrainer(
    trainer,
  ) {
    if (
      activeAssignment
    ) {
      setError(
        'Ngựa đã có huấn luyện viên phụ trách. Hãy kết thúc phân công hiện tại trước khi chọn người khác.',
      )

      return
    }

    if (
      trainer
        .MatchesSpecialization ===
      false
    ) {
      setError(
        'Huấn luyện viên này không có chuyên môn phù hợp với đánh giá hiện tại.',
      )

      return
    }

    setError('')
    setMessage('')

    setSelectedTrainerId(
      String(
        trainer.UserID,
      ),
    )
  }

  async function createAssignment() {
    if (
      !horseId ||
      !latestRecommended ||
      !selectedTrainer
    ) {
      setError(
        'Chưa đủ dữ liệu để phân công huấn luyện viên.',
      )

      return
    }

    if (
      activeAssignment
    ) {
      setError(
        'Ngựa đã có huấn luyện viên phụ trách. Cần kết thúc phân công hiện tại trước.',
      )

      return
    }

    if (
      selectedTrainer
        .MatchesSpecialization ===
      false
    ) {
      setError(
        'Huấn luyện viên được chọn không đúng chuyên môn.',
      )

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
              selectedTrainer.UserID,
            ),

          SpecializationID:
            latestRecommended
              .SpecializationID,

          AssessmentID:
            latestRecommended
              .AssessmentID,

          AssignmentNote:
            assignmentNote
              .trim() ||
            null,
        })

      await reloadData()

      setSelectedTrainerId(
        '',
      )

      setAssignmentNote(
        '',
      )

      setMessage(
        saved.LevelWarning
          ? `Đã phân công huấn luyện viên. Lưu ý: ${saved.LevelWarning}`
          : 'Đã phân công huấn luyện viên thành công.',
      )
    } catch (assignError) {
      setError(
        getErrorMessage(
          assignError,
          'Không thể phân công huấn luyện viên.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function endCurrentAssignment() {
    if (
      !activeAssignment
    ) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await endTrainerAssignment(
        activeAssignment
          .TrainerHorseAssignmentID,

        endReason
          .trim() ||
        undefined,
      )

      await reloadData()

      setEndReason(
        '',
      )

      setEndModalOpen(
        false,
      )

      setSelectedTrainerId(
        '',
      )

      setMessage(
        'Đã kết thúc phân công hiện tại. Có thể chọn huấn luyện viên mới.',
      )
    } catch (endError) {
      setError(
        getErrorMessage(
          endError,
          'Không thể kết thúc phân công huấn luyện viên.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content assessment-assignment-page">
        <section
          className="panel assessment-loading"
          role="status"
        >
          <strong>
            Đang tải đánh giá ngựa
          </strong>

          <span>
            Đang tải đánh giá và thông tin phân công hiện tại.
          </span>
        </section>
      </main>
    )
  }

  return (
    <main className="page-content assessment-assignment-page">
      <div className="breadcrumb">
        <Link to="/training/dashboard">
          Huấn luyện
        </Link>

        <span>
          /
        </span>

        <strong>
          Đánh giá ngựa
        </strong>
      </div>

      <div className="page-heading assessment-page-heading">
        <div>
          <p className="eyebrow">
            HUẤN LUYỆN VIÊN TRƯỞNG
          </p>

          <h1>
            {mode === 'assignment' ? 'Phân công huấn luyện viên' : 'Đánh giá ngựa'}
          </h1>

          <p>
            {mode === 'assignment'
              ? 'Chọn huấn luyện viên phù hợp theo kết quả đánh giá đã lưu.'
              : 'Ghi nhận thể trạng, chuyên môn và kết luận đánh giá trước khi phân công.'}
          </p>
        </div>

        <Link
          className="button button-secondary"
          to={mode === 'assignment' ? `/training/horses/${horseId}/assessment` : '/training/dashboard'}
        >
          {mode === 'assignment' ? 'Quay lại đánh giá' : 'Quay lại tổng quan'}
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

      {message && (
        <div
          className="success-message"
          role="status"
        >
          {message}
        </div>
      )}

      <section className="panel assessment-horse-context">
        <div className="assessment-horse-main">
          <span className="assessment-section-kicker">
            NGỰA ĐANG ĐÁNH GIÁ
          </span>

          <h2>
            {show(
              horse?.HorseName,
              `Ngựa #${horseId}`,
            )}
          </h2>

          <p>
            {show(
              horse?.HorseCode,
              'Chưa có mã ngựa',
            )}
          </p>
        </div>

        <div className="assessment-horse-facts">
          <div>
            <span>
              Sức khỏe
            </span>

            <strong>
              {healthLabel(
                horse
                  ?.CurrentHealthStatus,
              )}
            </strong>
          </div>

          <div>
            <span>
              Trainer
            </span>

            <strong>
              {show(
                horse?.TrainerName,
                'Chưa phân công',
              )}
            </strong>
          </div>

          <div>
            <span>
              Chuyên môn
            </span>

            <strong>
              {show(
                horse
                  ?.SpecializationName,
                'Chưa xác định',
              )}
            </strong>
          </div>

          <div>
            <span>
              Giáo án Active
            </span>

            <strong>
              {horse
                ?.ActiveTrainingPlanID
                ? `#${horse.ActiveTrainingPlanID}`
                : 'Chưa có'}
            </strong>
          </div>
        </div>
      </section>

      {latestAssessment && (
        <section className="panel assessment-current-panel">
          <div className="assessment-section-heading">
            <div>
              <span className="assessment-section-kicker">
                ĐÁNH GIÁ GẦN NHẤT
              </span>

              <h2>
                Kết quả Assessment
              </h2>
            </div>

            <Link
              className="button button-secondary"
              to={`/training/horses/${horseId}/assessment-history`}
            >
              Xem lịch sử
            </Link>
          </div>

          <div className="assessment-current-grid">
            <div>
              <span>
                Chuyên môn
              </span>

              <strong>
                {
                  latestAssessment
                    .SpecializationName
                }
              </strong>
            </div>

            <div>
              <span>
                Điểm chất lượng
              </span>

              <strong>
                {show(
                  latestAssessment
                    .QualityScore,
                  'Chưa chấm',
                )}
              </strong>
            </div>

            <div>
              <span>
                Thể trạng
              </span>

              <strong>
                {fitnessLabel(
                  latestAssessment
                    .FitnessLevel,
                )}
              </strong>
            </div>

            <div>
              <span>
                Kết luận
              </span>

              <strong>
                {decisionLabel(
                  latestAssessment
                    .DecisionStatus,
                )}
              </strong>
            </div>

            <div>
              <span>
                Người đánh giá
              </span>

              <strong>
                {show(
                  latestAssessment
                    .HeadTrainerName,
                )}
              </strong>
            </div>

            <div>
              <span>
                Thời điểm
              </span>

              <strong>
                {formatDateTime(
                  latestAssessment
                    .AssessmentDate,
                )}
              </strong>
            </div>
          </div>

          {latestAssessment
            .AssessmentNote && (
            <div className="assessment-note-box">
              <span>
                Ghi chú
              </span>

              <p>
                {
                  latestAssessment
                    .AssessmentNote
                }
              </p>
            </div>
          )}
        </section>
      )}

      {mode === 'assessment' && (
      <section className="panel assessment-form-panel">
        <div className="assessment-section-heading">
          <div>
            <span className="assessment-section-kicker">
              ĐÁNH GIÁ MỚI
            </span>

            <h2>
              Đánh giá ngựa
            </h2>

            <p>
              Mỗi lần lưu sẽ tạo một
              Assessment mới. FE không sửa
              lại Assessment lịch sử.
            </p>
          </div>
        </div>

        <form
          className="assessment-form-grid"
          onSubmit={
            saveAssessment
          }
        >
          <label className="form-field">
            <span>
              Chuyên môn đề xuất *
            </span>

            <select
              required
              value={
                form.SpecializationID
              }
              onChange={(event) =>
                updateForm(
                  'SpecializationID',
                  event.target.value,
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

            <small>
              Huấn luyện viên được phân công phải có
              chuyên môn này.
            </small>
          </label>

          <label className="form-field">
            <span>
              Điểm chất lượng
            </span>

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={
                form.QualityScore
              }
              placeholder="0 - 100"
              onChange={(event) =>
                updateForm(
                  'QualityScore',
                  event.target.value,
                )
              }
            />

            <small>
              Điểm này được dùng để xác định
              cấp độ huấn luyện viên phù hợp.
            </small>
          </label>

          <label className="form-field">
            <span>
              Thể trạng
            </span>

            <select
              value={
                form.FitnessLevel
              }
              onChange={(event) =>
                updateForm(
                  'FitnessLevel',
                  event.target.value,
                )
              }
            >
              <option value="Excellent">
                Rất tốt
              </option>

              <option value="Good">
                Tốt
              </option>

              <option value="Average">
                Trung bình
              </option>

              <option value="Needs Monitoring">
                Cần theo dõi
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
              onChange={(event) =>
                updateForm(
                  'DecisionStatus',
                  event.target.value,
                )
              }
            >
              <option value="Recommended">
                Đề xuất tiếp tục huấn luyện
              </option>

              <option value="Rejected">
                Không đề xuất
              </option>
            </select>

            <small>
              Giá trị gửi Backend vẫn là
              Recommended / Rejected.
            </small>
          </label>

          <label className="form-field assessment-form-note">
            <span>
              Ghi chú đánh giá
            </span>

            <textarea
              rows="4"
              value={
                form.AssessmentNote
              }
              placeholder="Nhập nhận xét chuyên môn nếu có..."
              onChange={(event) =>
                updateForm(
                  'AssessmentNote',
                  event.target.value,
                )
              }
            />
          </label>

          <div className="assessment-form-actions">
            <button
              className="button"
              type="submit"
              disabled={
                busy ||
                !form.SpecializationID
              }
            >
              {busy
                ? 'Đang lưu...'
                : 'Lưu đánh giá'}
            </button>
          </div>
        </form>
      </section>
      )}

      {mode === 'assessment' && (
        <div className="assessment-form-actions">
          <Link className="button button-secondary" to={`/training/horses/${horseId}/assignment`}>
            Tiếp tục đến phân công huấn luyện viên
          </Link>
        </div>
      )}

      {mode === 'assignment' && (
      <>
      {!latestRecommended ? (
        <section className="panel assessment-no-suggestion">
          <h2>
            Chưa có gợi ý huấn luyện viên
          </h2>

          <p>
            Cần lưu một đánh giá có kết luận đề xuất
            huấn luyện trước khi chọn người phụ trách.
          </p>
        </section>
      ) : (
        <section className="panel assessment-suggestion-panel">
          <div className="assessment-section-heading assessment-suggestion-heading">
            <div>
              <span className="assessment-section-kicker">
                GỢI Ý HUẤN LUYỆN VIÊN
              </span>

              <h2>
                Huấn luyện viên phù hợp
              </h2>

              <p>
                Danh sách và thứ tự dưới
                đây do Backend tính. FE
                không tự tính Trainer
                suggestion.
              </p>
            </div>

            <div className="assessment-requirement">
              <span>
                Assessment đang áp dụng
              </span>

              <strong>
                {
                  latestRecommended
                    .SpecializationName
                }
              </strong>

              <small>
                Điểm:{' '}
                {show(
                  latestRecommended
                    .QualityScore,
                  'Chưa chấm',
                )}
              </small>
            </div>
          </div>

          {activeAssignment && (
            <div className="assessment-assignment-blocker">
              Ngựa đã có Trainer đang phụ
              trách. Nếu muốn đổi Trainer,
              phải kết thúc phân công hiện
              tại trước.
            </div>
          )}

          {trainers.length === 0 ? (
            <div className="empty-state">
              <h3>
                Chưa có huấn luyện viên
              </h3>

              <p>
                Chưa có huấn luyện viên trong CLB
                phù hợp để hiển thị.
              </p>
            </div>
          ) : (
            <div className="trainer-suggestion-list">
              {trainers.map(
                (trainer) => {
                  const selected =
                    String(
                      selectedTrainerId,
                    ) ===
                    String(
                      trainer.UserID,
                    )

                  const wrongSpecialization =
                    trainer
                      .MatchesSpecialization ===
                    false

                  const lowLevel =
                    trainer
                      .MatchesLevel ===
                    false

                  return (
                    <article
                      className={[
                        'trainer-suggestion-card',

                        trainer.IsSuggested
                          ? 'is-suggested'
                          : '',

                        selected
                          ? 'is-selected'
                          : '',
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(' ')}
                      key={
                        trainer.UserID
                      }
                    >
                      <div className="trainer-suggestion-card-head">
                        <div>
                          <div className="trainer-name-row">
                            <h3>
                              {
                                trainer.FullName
                              }
                            </h3>

                            {trainer.IsSuggested && (
                              <span className="status-badge assessment-status-good">
                                Được đề xuất
                              </span>
                            )}

                            {!trainer.IsSuggested &&
                              wrongSpecialization && (
                              <span className="status-badge assessment-status-danger">
                                Sai chuyên môn
                              </span>
                            )}

                            {!trainer.IsSuggested &&
                              !wrongSpecialization &&
                              lowLevel && (
                              <span className="status-badge assessment-status-warning">
                                Chưa đạt cấp độ đề xuất
                              </span>
                            )}
                          </div>

                          <p>
                            {trainer.Specializations
                              ?.map(
                                (item) =>
                                  item.SpecializationName,
                              )
                              .join(', ') ||
                              'Chưa có chuyên môn'}
                          </p>
                        </div>

                        <div className="trainer-card-actions">
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
                              busy ||
                              Boolean(
                                activeAssignment,
                              ) ||
                              wrongSpecialization
                            }
                            onClick={() =>
                              selectTrainer(
                                trainer,
                              )
                            }
                          >
                            {selected
                              ? 'Đã chọn'
                              : 'Chọn huấn luyện viên'}
                          </button>
                        </div>
                      </div>

                      <div className="trainer-metrics-grid">
                        <div>
                          <span>
                            Kinh nghiệm
                          </span>

                          <strong>
                            {formatNumber(
                              trainer
                                .YearsOfExperience,
                              ' năm',
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Cấp độ
                          </span>

                          <strong>
                            {experienceLabel(
                              trainer
                                .ExperienceLevel,
                              trainer
                                .ExperienceLevelName,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Cấp độ nên có
                          </span>

                          <strong>
                            {trainer.RequiredLevel
                              ? experienceLabel(
                                  trainer.RequiredLevel,
                                )
                              : 'Không yêu cầu tối thiểu'}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Đang phụ trách
                          </span>

                          <strong>
                            {
                              trainer.ActiveHorseCount
                            }{' '}
                            ngựa
                          </strong>
                        </div>

                        <div>
                          <span>
                            Rating
                          </span>

                          <strong>
                            {show(
                              trainer.TrainerRating,
                              'Chưa có',
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Bằng/chứng chỉ
                          </span>

                          <strong>
                            {
                              trainer.QualificationCount
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Thành tích sự nghiệp
                          </span>

                          <strong>
                            {
                              trainer.CareerWins
                            }
                            /
                            {
                              trainer.CareerStarts
                            }{' '}
                            thắng
                          </strong>
                        </div>

                        <div>
                          <span>
                            Win rate gần đây
                          </span>

                          <strong>
                            {trainer.WinRate ==
                            null
                              ? 'Chưa đủ dữ liệu'
                              : `${trainer.WinRate}%`}
                          </strong>
                        </div>
                      </div>

                      {trainer.SuggestionReason && (
                        <div
                          className={`trainer-suggestion-reason ${
                            trainer.IsSuggested
                              ? 'is-positive'
                              : 'is-warning'
                          }`}
                        >
                          <strong>
                            Lý do gợi ý
                          </strong>

                          <span>
                            {
                              trainer.SuggestionReason
                            }
                          </span>
                        </div>
                      )}

                      {trainer.WinRate ==
                        null &&
                        trainer.WinRateNote && (
                          <p className="trainer-data-note">
                            {
                              trainer.WinRateNote
                            }
                          </p>
                        )}
                    </article>
                  )
                },
              )}
            </div>
          )}
        </section>
      )}

      {activeAssignment && (
        <section className="panel current-trainer-panel">
          <div className="assessment-section-heading">
            <div>
              <span className="assessment-section-kicker">
                PHÂN CÔNG HIỆN TẠI
              </span>

              <h2>
                Huấn luyện viên đang phụ trách
              </h2>
            </div>

            <span className="status-badge assessment-status-good">
              Đang hoạt động
            </span>
          </div>

          <div className="current-trainer-content">
            <div className="current-trainer-main">
              <h3>
                {
                  activeAssignment
                    .TrainerName
                }
              </h3>

              <p>
                {
                  activeAssignment
                    .SpecializationName
                }
              </p>

              <Link
                to={`/training/trainers/${activeAssignment.TrainerID}`}
              >
                Xem hồ sơ huấn luyện viên
              </Link>
            </div>

            <div className="current-trainer-facts">
              <div>
                <span>
                  Ngày bắt đầu
                </span>

                <strong>
                  {formatDate(
                    activeAssignment
                      .StartDate,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Người phân công
                </span>

                <strong>
                  {show(
                    activeAssignment
                      .AssignedByName,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Assessment
                </span>

                <strong>
                  {activeAssignment
                    .AssessmentID
                    ? `#${activeAssignment.AssessmentID}`
                    : 'Không liên kết'}
                </strong>
              </div>
            </div>
          </div>

          {activeAssignment
            .AssignmentNote && (
            <div className="assessment-note-box">
              <span>
                Ghi chú phân công
              </span>

              <p>
                {
                  activeAssignment
                    .AssignmentNote
                }
              </p>
            </div>
          )}

          <div className="current-trainer-warning">
            Khi kết thúc phân công, hệ thống
            sẽ hủy các giáo án chưa hoàn tất
            và các session còn ở trạng thái
            Assigned của phân công này.
          </div>

          <button
            className="button assessment-danger-button"
            type="button"
            disabled={busy}
            onClick={() =>
              setEndModalOpen(
                true,
              )
            }
          >
            Kết thúc phân công
          </button>
        </section>
      )}

      {!activeAssignment &&
        selectedTrainer && (
        <section className="panel assignment-confirm-panel">
          <div className="assessment-section-heading">
            <div>
              <span className="assessment-section-kicker">
                XÁC NHẬN PHÂN CÔNG
              </span>

              <h2>
                Phân công huấn luyện viên cho ngựa
              </h2>
            </div>

            <button
              className="button button-secondary"
              type="button"
              disabled={busy}
              onClick={() => {
                setSelectedTrainerId(
                  '',
                )

                setAssignmentNote(
                  '',
                )
              }}
            >
              Chọn lại
            </button>
          </div>

          <div className="assignment-confirm-grid">
            <div>
              <span>
                Trainer
              </span>

              <strong>
                {
                  selectedTrainer.FullName
                }
              </strong>
            </div>

            <div>
              <span>
                Chuyên môn
              </span>

              <strong>
                {
                  latestRecommended
                    ?.SpecializationName
                }
              </strong>
            </div>

            <div>
              <span>
                Cấp độ hiện tại
              </span>

              <strong>
                {experienceLabel(
                  selectedTrainer
                    .ExperienceLevel,
                  selectedTrainer
                    .ExperienceLevelName,
                )}
              </strong>
            </div>

            <div>
              <span>
                Cấp độ nên có
              </span>

              <strong>
                {selectedTrainer
                  .RequiredLevel
                  ? experienceLabel(
                      selectedTrainer
                        .RequiredLevel,
                    )
                  : 'Không yêu cầu tối thiểu'}
              </strong>
            </div>
          </div>

          {selectedTrainer
            .MatchesLevel ===
            false && (
            <div className="assessment-level-warning">
              <strong>
                Cảnh báo cấp độ
              </strong>

              <span>
                {
                  selectedTrainer
                    .SuggestionReason
                }
              </span>

              <small>
                Backend hiện không chặn phân
                công vì thiếu cấp độ; Backend
                sẽ trả LevelWarning sau khi
                phân công huấn luyện viên.
              </small>
            </div>
          )}

          <label className="form-field assignment-note-field">
            <span>
              Ghi chú phân công
            </span>

            <textarea
              rows="3"
              value={
                assignmentNote
              }
              placeholder="Ghi chú cho lần phân công này nếu có..."
              onChange={(event) =>
                setAssignmentNote(
                  event.target.value,
                )
              }
            />
          </label>

          <div className="assessment-form-actions">
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
                : 'Xác nhận phân công huấn luyện viên'}
            </button>
          </div>
        </section>
      )}

      </>
      )}

      {mode === 'assessment' && (
      <section className="panel assessment-history-shortcut">
        <div>
          <h2>
            Lịch sử đánh giá
          </h2>

          <p>
            Xem các lần đánh giá trước đây của ngựa.
          </p>
        </div>

        <Link
          className="button button-secondary"
          to={`/training/horses/${horseId}/assessment-history`}
        >
          Xem lịch sử đánh giá
        </Link>
      </section>
      )}

      {mode === 'assignment' && endModalOpen &&
        activeAssignment && (
        <div
          className="assessment-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setEndModalOpen(
                false,
              )
            }
          }}
        >
          <section
            className="assessment-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-assignment-title"
          >
            <div className="assessment-confirm-modal-head">
              <div>
                <span className="assessment-section-kicker">
                  XÁC NHẬN
                </span>

                <h2 id="end-assignment-title">
                  Kết thúc phân công huấn luyện viên?
                </h2>
              </div>

              <button
                className="assessment-modal-close"
                type="button"
                aria-label="Đóng"
                disabled={busy}
                onClick={() =>
                  setEndModalOpen(
                    false,
                  )
                }
              >
                ×
              </button>
            </div>

            <p className="assessment-modal-description">
              Trainer{' '}
              <strong>
                {
                  activeAssignment
                    .TrainerName
                }
              </strong>{' '}
              sẽ không còn là Trainer phụ
              trách của ngựa này.
            </p>

            <div className="assessment-modal-warning">
              Hệ thống sẽ hủy các giáo án
              chưa hoàn tất và session còn
              Assigned thuộc phân công hiện
              tại.
            </div>

            <label className="form-field">
              <span>
                Lý do kết thúc
              </span>

              <textarea
                rows="4"
                value={
                  endReason
                }
                placeholder="Có thể để trống nếu không có ghi chú..."
                onChange={(event) =>
                  setEndReason(
                    event.target.value,
                  )
                }
              />
            </label>

            <div className="assessment-modal-actions">
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() =>
                  setEndModalOpen(
                    false,
                  )
                }
              >
                Giữ phân công
              </button>

              <button
                className="button assessment-danger-button"
                type="button"
                disabled={busy}
                onClick={() =>
                  void endCurrentAssignment()
                }
              >
                {busy
                  ? 'Đang xử lý...'
                  : 'Kết thúc phân công'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}