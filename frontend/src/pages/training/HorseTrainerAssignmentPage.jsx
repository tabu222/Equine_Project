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
  endTrainerAssignment,
  getHorseAssessments,
  getTrainerAssignments,
  getTrainers,
  getTrainingDashboard,
  getTrainingPlanTemplates,
} from '../../api/trainingApi.ts'

const EXPERIENCE_LABELS = {
  Junior: 'Mới vào nghề',
  Intermediate: 'Trung cấp',
  Senior: 'Kỳ cựu',
  Expert: 'Chuyên gia',
}

const FITNESS_LABELS = {
  Excellent: 'Rất tốt',
  Good: 'Tốt',
  Average: 'Trung bình',
  'Needs Monitoring': 'Cần theo dõi',
}

function show(value, fallback = '—') {
  return value === null ||
    value === undefined ||
    value === ''
    ? fallback
    : value
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const raw = String(value)
  const date = raw.includes('T')
    ? new Date(raw)
    : new Date(`${raw}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return raw
  }

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatNumber(value, suffix = '') {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  const numeric = Number(value)

  if (Number.isNaN(numeric)) {
    return String(value)
  }

  const result = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 1,
  }).format(numeric)

  return suffix ? `${result}${suffix}` : result
}

function healthLabel(value) {
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
      return show(value, 'Chưa cập nhật')
  }
}

function experienceLabel(level, fallback) {
  return EXPERIENCE_LABELS[level] || fallback || show(level)
}

function getErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

async function fetchPageData(horseId) {
  const [
    dashboardRows,
    assessmentRows,
    assignmentRows,
  ] = await Promise.all([
    getTrainingDashboard(horseId),
    getHorseAssessments(horseId),
    getTrainerAssignments({ HorseID: horseId }),
  ])

  const assessments = Array.isArray(assessmentRows)
    ? assessmentRows
    : []

  const latestRecommended = assessments.find(
    (item) => item.DecisionStatus === 'Recommended',
  ) || null

  const [trainerRows, templateRows] = latestRecommended
    ? await Promise.all([
        getTrainers({ HorseID: horseId }),
        getTrainingPlanTemplates({
          SpecializationID: latestRecommended.SpecializationID,
        }),
      ])
    : [[], []]

  return {
    horse: Array.isArray(dashboardRows)
      ? dashboardRows[0] || null
      : null,
    assessments,
    assignments: Array.isArray(assignmentRows)
      ? assignmentRows
      : [],
    trainers: Array.isArray(trainerRows)
      ? trainerRows
      : [],
    template: Array.isArray(templateRows)
      ? templateRows.find((item) => item.IsActive) || templateRows[0] || null
      : null,
  }
}

export default function HorseTrainerAssignmentPage({ embedded = false, refreshToken = null }) {
  const { horseId } = useParams()

  const [horse, setHorse] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [assignments, setAssignments] = useState([])
  const [trainers, setTrainers] = useState([])
  const [template, setTemplate] = useState(null)
  const [selectedTrainerId, setSelectedTrainerId] = useState('')
  const [assignmentNote, setAssignmentNote] = useState('')
  const [endReason, setEndReason] = useState('')
  const [endModalOpen, setEndModalOpen] = useState(false)
  const [createdPlanId, setCreatedPlanId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadData() {
    if (!horseId) {
      return
    }

    const data = await fetchPageData(horseId)

    setHorse(data.horse)
    setAssessments(data.assessments)
    setAssignments(data.assignments)
    setTrainers(data.trainers)
    setTemplate(data.template)
  }

  useEffect(() => {
    if (!horseId) {
      return undefined
    }

    let active = true

    fetchPageData(horseId)
      .then((data) => {
        if (!active) {
          return
        }

        setHorse(data.horse)
        setAssessments(data.assessments)
        setAssignments(data.assignments)
        setTrainers(data.trainers)
        setTemplate(data.template)
        setError('')
      })
      .catch((loadError) => {
        if (!active) {
          return
        }

        setError(
          getErrorMessage(
            loadError,
            'Không thể tải thông tin phân công huấn luyện viên.',
          ),
        )
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [horseId, refreshToken])

  const latestRecommended = useMemo(
    () => assessments.find(
      (item) => item.DecisionStatus === 'Recommended',
    ) || null,
    [assessments],
  )

  const activeAssignment = useMemo(
    () => assignments.find(
      (item) => item.Status === 'Active',
    ) || null,
    [assignments],
  )

  const selectedTrainer = useMemo(
    () => trainers.find(
      (item) => String(item.UserID) === String(selectedTrainerId),
    ) || null,
    [selectedTrainerId, trainers],
  )

  function selectTrainer(trainer) {
    if (activeAssignment) {
      setError(
        'Ngựa đã có huấn luyện viên phụ trách. Hãy kết thúc phân công hiện tại trước khi chọn người khác.',
      )
      return
    }

    if (trainer.MatchesSpecialization === false) {
      setError(
        'Huấn luyện viên này không có chuyên môn phù hợp với đánh giá hiện tại.',
      )
      return
    }

    setError('')
    setMessage('')
    setSelectedTrainerId(String(trainer.UserID))
  }

  async function createAssignment() {
    if (!horseId || !latestRecommended || !selectedTrainer) {
      setError('Vui lòng chọn huấn luyện viên trước khi xác nhận phân công.')
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const created = await assignTrainer({
        HorseID: Number(horseId),
        TrainerID: selectedTrainer.UserID,
        SpecializationID: latestRecommended.SpecializationID,
        AssessmentID: latestRecommended.AssessmentID,
        AssignmentNote: assignmentNote.trim() || null,
      })

      setSelectedTrainerId('')
      setAssignmentNote('')
      setCreatedPlanId(created.DraftTrainingPlanID || null)

      await loadData()

      setMessage(
        created.DraftTrainingPlanID
          ? 'Đã phân công huấn luyện viên. Giáo án nháp theo chuyên môn đã được tạo sẵn cho huấn luyện viên.'
          : 'Đã phân công huấn luyện viên. Chuyên môn này hiện chưa có giáo án mẫu đang áp dụng.',
      )
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          'Không thể phân công huấn luyện viên.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function endAssignment() {
    if (!activeAssignment) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await endTrainerAssignment(
        activeAssignment.TrainerHorseAssignmentID,
        endReason.trim() || undefined,
      )

      setEndModalOpen(false)
      setEndReason('')
      setCreatedPlanId(null)
      await loadData()
      setMessage('Đã kết thúc phân công hiện tại. Có thể chọn huấn luyện viên mới.')
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          'Không thể kết thúc phân công huấn luyện viên.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="page-content">
        <section className="panel" role="status">
          Đang tải thông tin phân công...
        </section>
      </main>
    )
  }

  if (!horse) {
    return (
      <main className="page-content">
        <div className="alert-banner" role="alert">
          {error || 'Không tìm thấy ngựa.'}
        </div>

        <Link className="button button-secondary" to="/training/dashboard">
          Quay lại tổng quan
        </Link>
      </main>
    )
  }

  return (
    <section className={embedded ? "assessment-inline-assignment" : "page-content assessment-page"}>
      {!embedded && <div className="breadcrumb">
        <Link to="/training/dashboard">Tổng quan huấn luyện</Link>
        <span>/</span>
        <strong>Phân công huấn luyện viên</strong>
      </div>}

      {!embedded && <div className="page-heading assessment-page-heading">
        <div>
          <h1>Phân công huấn luyện viên</h1>

        </div>

        <Link
          className="button button-secondary"
          to={`/training/horses/${horseId}/assessment`}
        >
          Quay lại đánh giá
        </Link>
      </div>}

      {error && (
        <div className="alert-banner" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="success-message" role="status">
          <span>{message}</span>

          {createdPlanId && (
            <Link to={`/training/plans/${createdPlanId}`}>
              Xem giáo án nháp
            </Link>
          )}
        </div>
      )}

      {!embedded && <section className="panel assessment-horse-summary">
        <div className="assessment-section-heading">
          <div>
            <h2>{horse.HorseName}</h2>
            <p>{show(horse.HorseCode)}</p>
          </div>

          <span className="status-badge assessment-status-good">
            {healthLabel(horse.CurrentHealthStatus)}
          </span>
        </div>

        <div className="assessment-summary-grid">
          <div>
            <span>Chuyên môn</span>
            <strong>{show(latestRecommended?.SpecializationName, 'Chưa xác định')}</strong>
          </div>

          <div>
            <span>Huấn luyện viên</span>
            <strong>{show(activeAssignment?.TrainerName, 'Chưa phân công')}</strong>
          </div>

          <div>
            <span>Điểm chất lượng</span>
            <strong>{formatNumber(latestRecommended?.QualityScore)}</strong>
          </div>

          <div>
            <span>Thể trạng</span>
            <strong>
              {latestRecommended?.FitnessLevel
                ? FITNESS_LABELS[latestRecommended.FitnessLevel] || latestRecommended.FitnessLevel
                : 'Chưa cập nhật'}
            </strong>
          </div>

          <div>
            <span>Người đánh giá</span>
            <strong>{show(latestRecommended?.HeadTrainerName)}</strong>
          </div>

          <div>
            <span>Thời điểm đánh giá</span>
            <strong>{formatDateTime(latestRecommended?.AssessmentDate)}</strong>
          </div>
        </div>

        {latestRecommended && template && (
          <div className="assessment-note-box">
            <span>Giáo án mẫu theo chuyên môn</span>
            <p>
              <strong>{template.TemplateName}</strong>
              {' · '}
              {template.DurationDays} ngày
              {' · '}
              {template.Stages.length} giai đoạn
            </p>
            <p>{show(template.Goal, 'Chưa có mô tả mục tiêu.')}</p>

          </div>
        )}

        <div className="profile-actions">
          <Link
            className="button button-secondary"
            to={`/training/horses/${horseId}/assessment-history`}
          >
            Xem lịch sử đánh giá
          </Link>
        </div>
      </section>}

      {!latestRecommended && !embedded && (
        <section className="panel">
          <div className="empty-state">
            <h3>Chưa có đánh giá phù hợp để phân công</h3>
            <p>
              Hãy hoàn tất đánh giá và đề xuất chuyên môn trước khi chọn huấn luyện viên.
            </p>

            <Link
              className="button"
              to={`/training/horses/${horseId}/assessment`}
            >
              Đi tới đánh giá
            </Link>
          </div>
        </section>
      )}

      {embedded && latestRecommended && (
        <div className="assessment-inline-template">
          <div>
            <span>Chuyên môn</span>
            <strong>{show(latestRecommended.SpecializationName)}</strong>
          </div>
          <div>
            <span>Giáo án mẫu</span>
            <strong>{template?.TemplateName || 'Chưa có giáo án mẫu'}</strong>
            {template && <span>{template.DurationDays} ngày · {template.Stages?.length || 0} giai đoạn</span>}
          </div>
        </div>
      )}

      {latestRecommended && !activeAssignment && (
        <section className="panel">
          <div className="assessment-section-heading">
            <div>
              <h2>Huấn luyện viên phù hợp</h2>

            </div>
          </div>

          {trainers.length === 0 ? (
            <div className="empty-state">
              <h3>Chưa có huấn luyện viên phù hợp</h3>
              <p>Chưa tìm thấy huấn luyện viên phù hợp với chuyên môn hiện tại.</p>
            </div>
          ) : (
            <div className="trainer-suggestion-list">
              {trainers.map((trainer) => {
                const selected = String(trainer.UserID) === String(selectedTrainerId)

                return (
                  <article
                    className={`trainer-suggestion-card ${selected ? 'is-selected' : ''}`}
                    key={trainer.UserID}
                  >
                    <div className="trainer-suggestion-card-head">
                      <div>
                        <div className="trainer-name-row">
                          <h3>{trainer.FullName}</h3>

                          {trainer.IsSuggested && (
                            <span className="status-badge assessment-status-good">
                              Được đề xuất
                            </span>
                          )}
                        </div>

                        <p>
                          {trainer.Specializations
                            .map((item) => item.SpecializationName)
                            .join(' · ')}
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
                          disabled={busy || trainer.MatchesSpecialization === false}
                          onClick={() => selectTrainer(trainer)}
                        >
                          {selected ? 'Đã chọn' : 'Chọn huấn luyện viên'}
                        </button>
                      </div>
                    </div>

                    <p>
                      {trainer.YearsOfExperience} năm kinh nghiệm ·{' '}
                      {experienceLabel(trainer.ExperienceLevel, trainer.ExperienceLevelName)} ·{' '}
                      Đang phụ trách {trainer.ActiveHorseCount} ngựa
                    </p>

                    <p>
                      Đánh giá {formatNumber(trainer.TrainerRating)} ·{' '}
                      {trainer.QualificationCount} bằng/chứng chỉ ·{' '}
                      {trainer.CareerWins}/{trainer.CareerStarts} lần thắng
                      {trainer.WinRate == null ? '' : ` · Tỷ lệ thắng gần đây ${trainer.WinRate}%`}
                    </p>

                    {trainer.SuggestionReason && (
                      <p className="trainer-data-note">
                        {trainer.SuggestionReason}
                      </p>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {activeAssignment && (
        <section className="panel current-trainer-panel">
          <div className="assessment-section-heading">
            <div>
              <h2>Huấn luyện viên đang phụ trách</h2>
              <p>{activeAssignment.SpecializationName}</p>
            </div>

            <span className="status-badge assessment-status-good">
              Đang hoạt động
            </span>
          </div>

          <div className="current-trainer-content">
            <div className="current-trainer-main">
              <h3>{activeAssignment.TrainerName}</h3>

              <p>
                Bắt đầu từ {formatDate(activeAssignment.StartDate)} · Phân công bởi {show(activeAssignment.AssignedByName)}
              </p>

              <Link to={`/training/trainers/${activeAssignment.TrainerID}`}>
                Xem hồ sơ huấn luyện viên
              </Link>
            </div>
          </div>

          {activeAssignment.AssignmentNote && (
            <div className="assessment-note-box">
              <span>Ghi chú phân công</span>
              <p>{activeAssignment.AssignmentNote}</p>
            </div>
          )}

          <button
            className="button assessment-danger-button"
            type="button"
            disabled={busy}
            onClick={() => setEndModalOpen(true)}
          >
            Kết thúc phân công
          </button>
        </section>
      )}

      {!activeAssignment && selectedTrainer && (
        <section className="panel assignment-confirm-panel">
          <div className="assessment-section-heading">
            <div>
              <h2>Xác nhận phân công</h2>
              <p>
                {selectedTrainer.FullName} sẽ phụ trách {horse.HorseName} theo chuyên môn {latestRecommended?.SpecializationName}.
              </p>
            </div>

            <button
              className="button button-secondary"
              type="button"
              disabled={busy}
              onClick={() => {
                setSelectedTrainerId('')
                setAssignmentNote('')
              }}
            >
              Chọn lại
            </button>
          </div>

          {selectedTrainer.MatchesLevel === false && selectedTrainer.SuggestionReason && (
            <div className="alert-banner" role="status">
              {selectedTrainer.SuggestionReason}
            </div>
          )}

          <label className="form-field assignment-note-field">
            <span>Ghi chú phân công</span>
            <textarea
              rows="3"
              value={assignmentNote}
              placeholder="Nhập ghi chú nếu có..."
              onChange={(event) => setAssignmentNote(event.target.value)}
            />
          </label>

          <div className="assessment-form-actions">
            <button
              className="button"
              type="button"
              disabled={busy}
              onClick={() => void createAssignment()}
            >
              {busy ? 'Đang phân công...' : 'Xác nhận phân công'}
            </button>
          </div>
        </section>
      )}

      {endModalOpen && activeAssignment && (
        <div
          className="assessment-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setEndModalOpen(false)
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
                <h2 id="end-assignment-title">Kết thúc phân công?</h2>
              </div>

              <button
                className="assessment-modal-close"
                type="button"
                aria-label="Đóng"
                disabled={busy}
                onClick={() => setEndModalOpen(false)}
              >
                ×
              </button>
            </div>

            <p className="assessment-modal-description">
              {activeAssignment.TrainerName} sẽ không còn phụ trách {horse.HorseName}.
            </p>

            <div className="assessment-modal-warning">
              Các giáo án chưa hoàn tất và các buổi tập đang chờ thuộc phân công này sẽ được xử lý theo trạng thái mới.
            </div>

            <label className="form-field">
              <span>Lý do kết thúc</span>
              <textarea
                rows="4"
                value={endReason}
                placeholder="Nhập lý do nếu có..."
                onChange={(event) => setEndReason(event.target.value)}
              />
            </label>

            <div className="assessment-form-actions">
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() => setEndModalOpen(false)}
              >
                Giữ phân công
              </button>

              <button
                className="button assessment-danger-button"
                type="button"
                disabled={busy}
                onClick={() => void endAssignment()}
              >
                {busy ? 'Đang xử lý...' : 'Kết thúc phân công'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
