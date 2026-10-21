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
  addTrainerSpecialization,
  createTrainerCredential,
  createTrainerRaceResult,
  deleteTrainerCredential,
  deleteTrainerRaceResult,
  getSpecializations,
  getTrainer,
  getTrainerCredentials,
  getTrainerRaceResults,
  removeTrainerSpecialization,
  updateTrainerProfile,
} from '../../api/trainingApi.ts'

const CREDENTIAL_LABELS = {
  Degree: 'Bằng cấp',
  Certificate: 'Chứng chỉ',
  License: 'Giấy phép',
  Award: 'Giải thưởng / Bằng khen',
}

const RACE_CLASS_LABELS = {
  'Group 1': 'Group 1',
  'Group 2': 'Group 2',
  'Group 3': 'Group 3',
  Listed: 'Listed',
  Handicap: 'Handicap',
  Maiden: 'Maiden',
  Other: 'Khác',
}

const INITIAL_CREDENTIAL_FORM = {
  CredentialType: 'Degree',
  Title: '',
  IssuedBy: '',
  IssuedDate: '',
  ExpiryDate: '',
  FileUrl: '',
  Note: '',
}

const INITIAL_RACE_FORM = {
  HorseMode: 'club',
  HorseID: '',
  HorseName: '',
  RaceDate: '',
  RaceName: '',
  RaceClass: 'Other',
  FinishPosition: '',
  FieldSize: '',
  Note: '',
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

function showPercent(
  value,
) {
  return value === null ||
    value === undefined ||
    value === ''
    ? '—'
    : `${value}%`
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
    'en-US',
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
    'en-US',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
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

async function fetchTrainerProfileData(
  trainerId,
) {
  const [
    trainer,
    specializations,
    credentials,
    raceResults,
  ] =
    await Promise.all([
      getTrainer(
        trainerId,
      ),

      getSpecializations(),

      getTrainerCredentials(
        trainerId,
      ),

      getTrainerRaceResults(
        trainerId,
      ),
    ])

  return {
    trainer,

    specializations:
      Array.isArray(
        specializations,
      )
        ? specializations
        : [],

    credentials:
      Array.isArray(
        credentials,
      )
        ? credentials
        : [],

    raceResults:
      Array.isArray(
        raceResults,
      )
        ? raceResults
        : [],
  }
}

export default function TrainerProfilePage() {
  const {
    trainerId,
  } = useParams()

  const [
    trainer,
    setTrainer,
  ] = useState(null)

  const [
    specializations,
    setSpecializations,
  ] = useState([])

  const [
    credentials,
    setCredentials,
  ] = useState([])

  const [
    raceResults,
    setRaceResults,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

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
    profileForm,
    setProfileForm,
  ] = useState({
    CareerStartDate: '',
    TrainerRating: '',
  })

  const [
    selectedSpecializationId,
    setSelectedSpecializationId,
  ] = useState('')

  const [
    credentialFormOpen,
    setCredentialFormOpen,
  ] = useState(false)

  const [
    credentialForm,
    setCredentialForm,
  ] = useState({
    ...INITIAL_CREDENTIAL_FORM,
  })

  const [
    raceFormOpen,
    setRaceFormOpen,
  ] = useState(false)

  const [
    raceForm,
    setRaceForm,
  ] = useState({
    ...INITIAL_RACE_FORM,
  })

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null)

  useEffect(() => {
    if (!trainerId) {
      return undefined
    }

    let active = true

    fetchTrainerProfileData(
      trainerId,
    )
      .then((data) => {
        if (!active) {
          return
        }

        setTrainer(
          data.trainer,
        )

        setSpecializations(
          data.specializations,
        )

        setCredentials(
          data.credentials,
        )

        setRaceResults(
          data.raceResults,
        )

        setProfileForm({
          CareerStartDate:
            data.trainer
              ?.CareerStartDate ||
            '',

          TrainerRating:
            data.trainer
              ?.TrainerRating ??
            '',
        })

        setError('')
      })
      .catch(
        (loadError) => {
          if (!active) {
            return
          }

          setTrainer(null)

          setError(
            getErrorMessage(
              loadError,
              'Không thể tải hồ sơ Trainer.',
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
  }, [trainerId])

  const trainerSpecializations =
    useMemo(
      () =>
        Array.isArray(
          trainer?.Specializations,
        )
          ? trainer.Specializations
          : [],
      [trainer],
    )

  const activeHorses =
    useMemo(
      () =>
        Array.isArray(
          trainer?.ActiveHorses,
        )
          ? trainer.ActiveHorses
          : [],
      [trainer],
    )

  const availableSpecializations =
    useMemo(() => {
      const currentIds =
        new Set(
          trainerSpecializations.map(
            (item) =>
              String(
                item.SpecializationID,
              ),
          ),
        )

      return specializations.filter(
        (item) =>
          !currentIds.has(
            String(
              item.SpecializationID,
            ),
          ),
      )
    }, [
      specializations,
      trainerSpecializations,
    ])

  async function reloadData() {
    if (!trainerId) {
      return
    }

    const data =
      await fetchTrainerProfileData(
        trainerId,
      )

    setTrainer(
      data.trainer,
    )

    setSpecializations(
      data.specializations,
    )

    setCredentials(
      data.credentials,
    )

    setRaceResults(
      data.raceResults,
    )

    setProfileForm({
      CareerStartDate:
        data.trainer
          ?.CareerStartDate ||
        '',

      TrainerRating:
        data.trainer
          ?.TrainerRating ??
        '',
    })
  }

  async function refresh() {
    setRefreshing(true)
    setError('')
    setMessage('')

    try {
      await reloadData()
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Không thể làm mới hồ sơ Trainer.',
        ),
      )
    } finally {
      setRefreshing(false)
    }
  }

  async function saveProfile(
    event,
  ) {
    event.preventDefault()

    if (!trainerId) {
      return
    }

    const rating =
      profileForm
        .TrainerRating === ''
        ? null
        : Number(
            profileForm
              .TrainerRating,
          )

    if (
      rating !== null &&
      (
        Number.isNaN(rating) ||
        rating < 0 ||
        rating > 5
      )
    ) {
      setError(
        'Trainer Rating phải từ 0 đến 5.',
      )

      return
    }

    if (
      profileForm
        .CareerStartDate
    ) {
      const selectedDate =
        new Date(
          `${profileForm.CareerStartDate}T00:00:00`,
        )

      const today =
        new Date()

      today.setHours(
        0,
        0,
        0,
        0,
      )

      if (
        selectedDate >
        today
      ) {
        setError(
          'Ngày bắt đầu sự nghiệp không được ở tương lai.',
        )

        return
      }
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await updateTrainerProfile(
        trainerId,
        {
          CareerStartDate:
            profileForm
              .CareerStartDate ||
            null,

          TrainerRating:
            rating,
        },
      )

      await reloadData()

      setMessage(
        'Đã cập nhật hồ sơ Trainer. Kinh nghiệm và cấp độ đã được Backend tính lại.',
      )
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          'Không thể cập nhật hồ sơ Trainer.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function addSpecialization() {
    if (
      !trainerId ||
      !selectedSpecializationId
    ) {
      setError(
        'Vui lòng chọn chuyên môn cần thêm.',
      )

      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await addTrainerSpecialization(
        trainerId,
        Number(
          selectedSpecializationId,
        ),
      )

      await reloadData()

      setSelectedSpecializationId(
        '',
      )

      setMessage(
        'Đã thêm chuyên môn cho Trainer.',
      )
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          'Không thể thêm chuyên môn.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function saveCredential(
    event,
  ) {
    event.preventDefault()

    if (
      !trainerId ||
      !credentialForm.Title.trim() ||
      !credentialForm.IssuedDate
    ) {
      setError(
        'Loại giấy tờ, tên giấy tờ và ngày cấp là bắt buộc.',
      )

      return
    }

    if (
      credentialForm.ExpiryDate &&
      credentialForm.ExpiryDate <
        credentialForm.IssuedDate
    ) {
      setError(
        'Ngày hết hạn phải sau hoặc bằng ngày cấp.',
      )

      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await createTrainerCredential(
        trainerId,
        {
          CredentialType:
            credentialForm
              .CredentialType,

          Title:
            credentialForm
              .Title
              .trim(),

          IssuedBy:
            credentialForm
              .IssuedBy
              .trim() ||
            null,

          IssuedDate:
            credentialForm
              .IssuedDate,

          ExpiryDate:
            credentialForm
              .ExpiryDate ||
            null,

          FileUrl:
            credentialForm
              .FileUrl
              .trim() ||
            null,

          Note:
            credentialForm
              .Note
              .trim() ||
            null,
        },
      )

      await reloadData()

      setCredentialForm({
        ...INITIAL_CREDENTIAL_FORM,
      })

      setCredentialFormOpen(
        false,
      )

      setMessage(
        'Đã thêm giấy tờ năng lực Trainer.',
      )
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          'Không thể thêm giấy tờ Trainer.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function saveRaceResult(
    event,
  ) {
    event.preventDefault()

    if (
      !trainerId ||
      !raceForm.RaceDate ||
      !raceForm.RaceName.trim() ||
      !raceForm.FinishPosition ||
      !raceForm.FieldSize
    ) {
      setError(
        'Ngày đua, tên giải, thứ hạng và số ngựa tham gia là bắt buộc.',
      )

      return
    }

    const fieldSize =
      Number(
        raceForm.FieldSize,
      )

    const finishPosition =
      Number(
        raceForm.FinishPosition,
      )

    if (
      Number.isNaN(fieldSize) ||
      fieldSize < 2
    ) {
      setError(
        'Một cuộc đua phải có ít nhất 2 ngựa.',
      )

      return
    }

    if (
      Number.isNaN(
        finishPosition,
      ) ||
      finishPosition < 1 ||
      finishPosition >
        fieldSize
    ) {
      setError(
        'Thứ hạng phải từ 1 đến số ngựa tham gia.',
      )

      return
    }

    if (
      raceForm.HorseMode ===
        'club' &&
      !raceForm.HorseID
    ) {
      setError(
        'Vui lòng chọn ngựa trong CLB.',
      )

      return
    }

    if (
      raceForm.HorseMode ===
        'external' &&
      !raceForm.HorseName.trim()
    ) {
      setError(
        'Vui lòng nhập tên ngựa.',
      )

      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        RaceDate:
          raceForm.RaceDate,

        RaceName:
          raceForm.RaceName
            .trim(),

        RaceClass:
          raceForm.RaceClass,

        FinishPosition:
          finishPosition,

        FieldSize:
          fieldSize,

        Note:
          raceForm.Note
            .trim() ||
          null,
      }

      if (
        raceForm.HorseMode ===
        'club'
      ) {
        payload.HorseID =
          Number(
            raceForm.HorseID,
          )
      } else {
        payload.HorseName =
          raceForm.HorseName
            .trim()
      }

      await createTrainerRaceResult(
        trainerId,
        payload,
      )

      await reloadData()

      setRaceForm({
        ...INITIAL_RACE_FORM,
      })

      setRaceFormOpen(
        false,
      )

      setMessage(
        'Đã ghi nhận kết quả đua. Các chỉ số thành tích đã được Backend tính lại.',
      )
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          'Không thể thêm kết quả đua.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (
      !trainerId ||
      !deleteTarget
    ) {
      return
    }

    const target =
      deleteTarget

    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (
        target.type ===
        'specialization'
      ) {
        await removeTrainerSpecialization(
          trainerId,
          target.id,
        )
      }

      if (
        target.type ===
        'credential'
      ) {
        await deleteTrainerCredential(
          target.id,
        )
      }

      if (
        target.type ===
        'race'
      ) {
        await deleteTrainerRaceResult(
          target.id,
        )
      }

      await reloadData()

      setDeleteTarget(
        null,
      )

      if (
        target.type ===
        'specialization'
      ) {
        setMessage(
          'Đã xóa chuyên môn khỏi hồ sơ Trainer.',
        )
      }

      if (
        target.type ===
        'credential'
      ) {
        setMessage(
          'Đã xóa giấy tờ Trainer.',
        )
      }

      if (
        target.type ===
        'race'
      ) {
        setMessage(
          'Đã xóa kết quả đua.',
        )
      }
    } catch (deleteError) {
      setError(
        getErrorMessage(
          deleteError,
          'Không thể xóa dữ liệu.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  if (!trainerId) {
    return (
      <main className="page-content trainer-profile-page">
        <section
          className="panel"
          role="alert"
        >
          <h1>
            Không tìm thấy Trainer
          </h1>

          <Link
            className="button"
            to="/training/dashboard"
          >
            Về tổng quan huấn luyện
          </Link>
        </section>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="page-content trainer-profile-page">
        <section
          className="panel trainer-profile-loading"
          role="status"
        >
          <div className="trainer-profile-loading-indicator" />

          <div>
            <strong>
              Đang tải hồ sơ Trainer
            </strong>

            <span>
              Đang lấy kinh nghiệm,
              chuyên môn, giấy tờ và
              thành tích đua.
            </span>
          </div>
        </section>
      </main>
    )
  }

  if (
    !trainer &&
    error
  ) {
    return (
      <main className="page-content trainer-profile-page">
        <div className="breadcrumb">
          <Link to="/training/dashboard">
            Huấn luyện
          </Link>

          <span>
            /
          </span>

          <strong>
            Hồ sơ Trainer
          </strong>
        </div>

        <section
          className="panel trainer-profile-load-error"
          role="alert"
        >
          <h1>
            Không thể tải hồ sơ Trainer
          </h1>

          <p>
            {error}
          </p>

          <button
            className="button"
            type="button"
            onClick={() =>
              void refresh()
            }
          >
            Thử lại
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="page-content trainer-profile-page">
      <div className="breadcrumb">
        <Link to="/training/dashboard">
          Huấn luyện
        </Link>

        <span>
          /
        </span>

        <strong>
          Hồ sơ Trainer
        </strong>
      </div>

      <div className="page-heading trainer-profile-heading">
        <div>
          <p className="eyebrow">
            HEAD TRAINER
          </p>

          <h1>
            {show(
              trainer?.FullName,
              'Hồ sơ Trainer',
            )}
          </h1>

          <p>
            Hồ sơ năng lực, chuyên môn,
            bằng cấp và thành tích đua
            của Trainer.
          </p>
        </div>

        <div className="trainer-profile-heading-actions">
          <button
            className="button button-secondary"
            type="button"
            disabled={
              refreshing ||
              busy
            }
            onClick={() =>
              void refresh()
            }
          >
            {refreshing
              ? 'Đang làm mới...'
              : 'Làm mới'}
          </button>

          <Link
            className="button button-secondary"
            to="/training/dashboard"
          >
            Quay lại tổng quan
          </Link>
        </div>
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

      <section className="panel trainer-profile-identity">
        <div className="trainer-profile-avatar">
          {trainer?.FullName
            ?.trim()
            ?.charAt(0)
            ?.toUpperCase() ||
            'T'}
        </div>

        <div className="trainer-profile-identity-main">
          <span className="trainer-profile-kicker">
            TRAINER PROFILE
          </span>

          <h2>
            {show(
              trainer?.FullName,
            )}
          </h2>

          <p>
            {show(
              trainer?.Email,
            )}

            {trainer?.Phone
              ? ` · ${trainer.Phone}`
              : ''}
          </p>

          <div className="trainer-profile-tags">
            <span className="status-badge trainer-profile-status">
              {show(
                trainer
                  ?.ExperienceLevelName ||
                  trainer
                    ?.ExperienceLevel,
              )}
            </span>

            <span className="status-badge trainer-profile-status is-soft">
              {trainer
                ?.ActiveHorseCount ||
                0}{' '}
              ngựa đang phụ trách
            </span>

            <span
              className={`status-badge trainer-profile-status ${
                trainer
                  ?.HasProfile
                  ? 'is-success'
                  : 'is-warning'
              }`}
            >
              {trainer?.HasProfile
                ? 'Đã thiết lập hồ sơ'
                : 'Chưa thiết lập hồ sơ'}
            </span>
          </div>
        </div>

        <div className="trainer-profile-rating-box">
          <span>
            Trainer Rating
          </span>

          <strong>
            {trainer
              ?.TrainerRating ===
              null ||
            trainer
              ?.TrainerRating ===
              undefined
              ? '—'
              : trainer.TrainerRating}
          </strong>

          <small>
            / 5
          </small>
        </div>
      </section>

      <section className="panel trainer-profile-section">
        <div className="trainer-profile-section-head">
          <div>
            <span className="trainer-profile-kicker">
              THÔNG TIN NĂNG LỰC
            </span>

            <h2>
              Kinh nghiệm và cấp độ
            </h2>

            
          </div>
        </div>

        <div className="trainer-profile-metric-grid">
          <div>
            <span>
              Bắt đầu sự nghiệp
            </span>

            <strong>
              {formatDate(
                trainer
                  ?.CareerStartDate,
              )}
            </strong>
          </div>

          <div>
            <span>
              Kinh nghiệm
            </span>

            <strong>
              {show(
                trainer
                  ?.YearsOfExperience,
                0,
              )}{' '}
              năm
            </strong>
          </div>

          <div>
            <span>
              Cấp độ
            </span>

            <strong>
              {show(
                trainer
                  ?.ExperienceLevelName ||
                  trainer
                    ?.ExperienceLevel,
              )}
            </strong>

            <small>
              {show(
                trainer
                  ?.ExperienceLevel,
              )}
            </small>
          </div>

          <div>
            <span>
              Thâm niên có minh chứng
            </span>

            <strong>
              {trainer
                ?.Seniority === null ||
              trainer
                ?.Seniority ===
                undefined
                ? '—'
                : `${trainer.Seniority} năm`}
            </strong>

            <small>
              Từ{' '}
              {formatDate(
                trainer
                  ?.SenioritySince,
              )}
            </small>
          </div>

          <div>
            <span>
              Bằng / chứng chỉ / license
            </span>

            <strong>
              {show(
                trainer
                  ?.QualificationCount,
                0,
              )}
            </strong>
          </div>

          <div>
            <span>
              Giải thưởng
            </span>

            <strong>
              {show(
                trainer
                  ?.AwardCount,
                0,
              )}
            </strong>
          </div>

          <div>
            <span>
              Rating
            </span>

            <strong>
              {show(
                trainer
                  ?.TrainerRating,
                'Chưa đánh giá',
              )}
            </strong>
          </div>

          <div>
            <span>
              Workload hiện tại
            </span>

            <strong>
              {show(
                trainer
                  ?.ActiveHorseCount,
                0,
              )}{' '}
              ngựa
            </strong>
          </div>
        </div>
      </section>

      <section className="panel trainer-profile-section">
        <div className="trainer-profile-section-head">
          <div>
            <span className="trainer-profile-kicker">
              CẬP NHẬT HỒ SƠ
            </span>

            <h2>
              Kinh nghiệm và Rating
            </h2>

            
          </div>
        </div>

        <form
          className="trainer-profile-edit-form"
          onSubmit={
            saveProfile
          }
        >
          <label className="form-field">
            <span>
              Ngày bắt đầu sự nghiệp
            </span>

            <input
              type="date"
              value={
                profileForm
                  .CareerStartDate
              }
              onChange={(event) =>
                setProfileForm(
                  (current) => ({
                    ...current,
                    CareerStartDate:
                      event.target.value,
                  }),
                )
              }
            />

            
          </label>

          <label className="form-field">
            <span>
              Trainer Rating
            </span>

            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={
                profileForm
                  .TrainerRating
              }
              placeholder="0.0 - 5.0"
              onChange={(event) =>
                setProfileForm(
                  (current) => ({
                    ...current,
                    TrainerRating:
                      event.target.value,
                  }),
                )
              }
            />

            <small>
              Từ 0 đến 5, cho phép 1 chữ số
              thập phân.
            </small>
          </label>

          <div className="trainer-profile-edit-actions">
            <button
              className="button"
              type="submit"
              disabled={busy}
            >
              {busy
                ? 'Đang lưu...'
                : 'Lưu hồ sơ'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel trainer-profile-section">
        <div className="trainer-profile-section-head">
          <div>
            <span className="trainer-profile-kicker">
              SPECIALIZATION
            </span>

            <h2>
              Chuyên môn
            </h2>

            <p>
              Quản lý chuyên môn Trainer
              có thể nhận khi Head Trainer
              phân công ngựa.
            </p>
          </div>
        </div>

        {trainerSpecializations.length ===
        0 ? (
          <div className="trainer-profile-empty-box">
            Trainer chưa có chuyên môn
            được ghi nhận.
          </div>
        ) : (
          <div className="trainer-specialization-list">
            {trainerSpecializations.map(
              (item) => (
                <div
                  className="trainer-specialization-item"
                  key={
                    item.SpecializationID
                  }
                >
                  <div>
                    <strong>
                      {
                        item.SpecializationName
                      }
                    </strong>

                    <span>
                      Chuyên môn đang hoạt
                      động
                    </span>
                  </div>

                  <button
                    className="trainer-profile-text-danger"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setDeleteTarget({
                        type:
                          'specialization',

                        id:
                          item.SpecializationID,

                        title:
                          item.SpecializationName,
                      })
                    }
                  >
                    Xóa
                  </button>
                </div>
              ),
            )}
          </div>
        )}

        <div className="trainer-specialization-add">
          <label className="form-field">
            <span>
              Thêm chuyên môn
            </span>

            <select
              value={
                selectedSpecializationId
              }
              disabled={
                availableSpecializations
                  .length === 0
              }
              onChange={(event) =>
                setSelectedSpecializationId(
                  event.target.value,
                )
              }
            >
              <option value="">
                {availableSpecializations
                  .length === 0
                  ? 'Không còn chuyên môn để thêm'
                  : 'Chọn chuyên môn'}
              </option>

              {availableSpecializations.map(
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

          <button
            className="button"
            type="button"
            disabled={
              busy ||
              !selectedSpecializationId
            }
            onClick={() =>
              void addSpecialization()
            }
          >
            Thêm chuyên môn
          </button>
        </div>

        
      </section>

      <section className="panel trainer-profile-section">
        <div className="trainer-profile-section-head">
          <div>
            <span className="trainer-profile-kicker">
              CREDENTIALS
            </span>

            <h2>
              Bằng cấp và chứng nhận
            </h2>

            
          </div>

          <button
            className="button"
            type="button"
            onClick={() =>
              setCredentialFormOpen(
                (current) =>
                  !current,
              )
            }
          >
            {credentialFormOpen
              ? 'Đóng biểu mẫu'
              : 'Thêm giấy tờ'}
          </button>
        </div>

        {credentialFormOpen && (
          <form
            className="trainer-credential-form"
            onSubmit={
              saveCredential
            }
          >
            <label className="form-field">
              <span>
                Loại giấy tờ *
              </span>

              <select
                value={
                  credentialForm
                    .CredentialType
                }
                onChange={(event) =>
                  setCredentialForm(
                    (current) => ({
                      ...current,
                      CredentialType:
                        event.target.value,
                    }),
                  )
                }
              >
                <option value="Degree">
                  Bằng cấp
                </option>

                <option value="Certificate">
                  Chứng chỉ
                </option>

                <option value="License">
                  Giấy phép
                </option>

                <option value="Award">
                  Giải thưởng / Bằng khen
                </option>
              </select>
            </label>

            <label className="form-field">
              <span>
                Tên giấy tờ *
              </span>

              <input
                type="text"
                maxLength="200"
                value={
                  credentialForm.Title
                }
                placeholder="Ví dụ: Giấy phép huấn luyện hạng A"
                onChange={(event) =>
                  setCredentialForm(
                    (current) => ({
                      ...current,
                      Title:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Đơn vị cấp
              </span>

              <input
                type="text"
                maxLength="200"
                value={
                  credentialForm
                    .IssuedBy
                }
                placeholder="Tên tổ chức cấp giấy tờ"
                onChange={(event) =>
                  setCredentialForm(
                    (current) => ({
                      ...current,
                      IssuedBy:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Ngày cấp *
              </span>

              <input
                type="date"
                required
                value={
                  credentialForm
                    .IssuedDate
                }
                onChange={(event) =>
                  setCredentialForm(
                    (current) => ({
                      ...current,
                      IssuedDate:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Ngày hết hạn
              </span>

              <input
                type="date"
                value={
                  credentialForm
                    .ExpiryDate
                }
                onChange={(event) =>
                  setCredentialForm(
                    (current) => ({
                      ...current,
                      ExpiryDate:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Link tài liệu
              </span>

              <input
                type="url"
                maxLength="500"
                value={
                  credentialForm.FileUrl
                }
                placeholder="https://..."
                onChange={(event) =>
                  setCredentialForm(
                    (current) => ({
                      ...current,
                      FileUrl:
                        event.target.value,
                    }),
                  )
                }
              />

              
            </label>

            <label className="form-field trainer-profile-form-full">
              <span>
                Ghi chú
              </span>

              <textarea
                rows="3"
                maxLength="1000"
                value={
                  credentialForm.Note
                }
                placeholder="Ghi chú bổ sung nếu có..."
                onChange={(event) =>
                  setCredentialForm(
                    (current) => ({
                      ...current,
                      Note:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <div className="trainer-profile-form-actions">
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  setCredentialForm({
                    ...INITIAL_CREDENTIAL_FORM,
                  })

                  setCredentialFormOpen(
                    false,
                  )
                }}
              >
                Hủy
              </button>

              <button
                className="button"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? 'Đang lưu...'
                  : 'Lưu giấy tờ'}
              </button>
            </div>
          </form>
        )}

        {credentials.length ===
        0 ? (
          <div className="trainer-profile-empty-box">
            Chưa có bằng cấp, chứng chỉ,
            giấy phép hoặc giải thưởng.
          </div>
        ) : (
          <div className="trainer-credential-list">
            {credentials.map(
              (item) => (
                <article
                  className="trainer-credential-item"
                  key={
                    item.CredentialID
                  }
                >
                  <div className="trainer-credential-type">
                    {show(
                      CREDENTIAL_LABELS[
                        item.CredentialType
                      ],
                      item.CredentialType,
                    )}
                  </div>

                  <div className="trainer-credential-content">
                    <div className="trainer-credential-title">
                      <div>
                        <h3>
                          {
                            item.Title
                          }
                        </h3>

                        <p>
                          {show(
                            item.IssuedBy,
                            'Không ghi đơn vị cấp',
                          )}
                        </p>
                      </div>

                      <button
                        className="trainer-profile-text-danger"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setDeleteTarget({
                            type:
                              'credential',

                            id:
                              item.CredentialID,

                            title:
                              item.Title,
                          })
                        }
                      >
                        Xóa
                      </button>
                    </div>

                    <div className="trainer-credential-meta">
                      <span>
                        Ngày cấp:{' '}
                        <strong>
                          {formatDate(
                            item.IssuedDate,
                          )}
                        </strong>
                      </span>

                      <span>
                        Hết hạn:{' '}
                        <strong>
                          {formatDate(
                            item.ExpiryDate,
                          )}
                        </strong>
                      </span>

                      <span>
                        Người ghi nhận:{' '}
                        <strong>
                          {show(
                            item.CreatedByName,
                          )}
                        </strong>
                      </span>
                    </div>

                    {item.Note && (
                      <p className="trainer-credential-note">
                        {item.Note}
                      </p>
                    )}

                    {item.FileUrl && (
                      <a
                        className="trainer-profile-document-link"
                        href={
                          item.FileUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Mở tài liệu đính kèm
                      </a>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="panel trainer-profile-section">
        <div className="trainer-profile-section-head">
          <div>
            <span className="trainer-profile-kicker">
              ACTIVE WORKLOAD
            </span>

            <h2>
              Ngựa đang phụ trách
            </h2>

            <p>
              Các Active Assignment hiện
              tại của Trainer.
            </p>
          </div>

          <strong className="trainer-profile-section-count">
            {activeHorses.length}
          </strong>
        </div>

        {activeHorses.length ===
        0 ? (
          <div className="trainer-profile-empty-box">
            Trainer hiện chưa có ngựa đang
            phụ trách.
          </div>
        ) : (
          <div className="trainer-active-horse-grid">
            {activeHorses.map(
              (horse) => (
                <article
                  className="trainer-active-horse-card"
                  key={
                    horse.TrainerHorseAssignmentID
                  }
                >
                  <div>
                    <span>
                      {show(
                        horse.HorseCode,
                        'Chưa có mã',
                      )}
                    </span>

                    <h3>
                      {
                        horse.HorseName
                      }
                    </h3>

                    <p>
                      {
                        horse.SpecializationName
                      }
                    </p>
                  </div>

                  <div className="trainer-active-horse-footer">
                    <span>
                      Từ{' '}
                      {formatDate(
                        horse.StartDate,
                      )}
                    </span>

                    <Link
                      to={`/training/horses/${horse.HorseID}/assessment`}
                    >
                      Xem ngựa
                    </Link>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="panel trainer-profile-section">
        <div className="trainer-profile-section-head">
          <div>
            <span className="trainer-profile-kicker">
              CAREER RESULTS
            </span>

            <h2>
              Thành tích sự nghiệp
            </h2>

            
          </div>
        </div>

        <div className="trainer-career-stat-grid">
          <div>
            <span>
              Tổng lượt đua
            </span>

            <strong>
              {show(
                trainer
                  ?.CareerStarts,
                0,
              )}
            </strong>
          </div>

          <div>
            <span>
              Tổng chiến thắng
            </span>

            <strong>
              {show(
                trainer
                  ?.CareerWins,
                0,
              )}
            </strong>
          </div>

          <div>
            <span>
              Career Win Rate
            </span>

            <strong>
              {showPercent(
                trainer
                  ?.CareerWinRate,
              )}
            </strong>
          </div>

          <div>
            <span>
              Lượt đua 12 tháng
            </span>

            <strong>
              {show(
                trainer
                  ?.RecentStarts,
                0,
              )}
            </strong>
          </div>

          <div>
            <span>
              Thắng 12 tháng
            </span>

            <strong>
              {show(
                trainer
                  ?.RecentWins,
                0,
              )}
            </strong>
          </div>

          <div>
            <span>
              Win Rate 12 tháng
            </span>

            <strong>
              {showPercent(
                trainer
                  ?.WinRate,
              )}
            </strong>
          </div>

          <div>
            <span>
              Place Rate
            </span>

            <strong>
              {showPercent(
                trainer
                  ?.PlaceRate,
              )}
            </strong>
          </div>
        </div>

        {trainer?.WinRateNote && (
          <div className="trainer-profile-info-banner">
            {
              trainer.WinRateNote
            }
          </div>
        )}
      </section>

      <section className="panel trainer-profile-section">
        <div className="trainer-profile-section-head">
          <div>
            <span className="trainer-profile-kicker">
              RACE HISTORY
            </span>

            <h2>
              Kết quả đua
            </h2>

            <p>
              Ghi lại các lần ngựa do
              Trainer chuẩn bị tham gia
              cuộc đua.
            </p>
          </div>

          <button
            className="button"
            type="button"
            onClick={() =>
              setRaceFormOpen(
                (current) =>
                  !current,
              )
            }
          >
            {raceFormOpen
              ? 'Đóng biểu mẫu'
              : 'Thêm kết quả đua'}
          </button>
        </div>

        {raceFormOpen && (
          <form
            className="trainer-race-form"
            onSubmit={
              saveRaceResult
            }
          >
            <label className="form-field">
              <span>
                Nguồn ngựa
              </span>

              <select
                value={
                  raceForm.HorseMode
                }
                onChange={(event) =>
                  setRaceForm(
                    (current) => ({
                      ...current,
                      HorseMode:
                        event.target.value,
                      HorseID: '',
                      HorseName: '',
                    }),
                  )
                }
              >
                <option value="club">
                  Ngựa đang phụ trách trong CLB
                </option>

                <option value="external">
                  Ngựa khác / ngoài CLB
                </option>
              </select>
            </label>

            {raceForm.HorseMode ===
            'club' ? (
              <label className="form-field">
                <span>
                  Ngựa *
                </span>

                <select
                  value={
                    raceForm.HorseID
                  }
                  onChange={(event) =>
                    setRaceForm(
                      (current) => ({
                        ...current,
                        HorseID:
                          event.target.value,
                      }),
                    )
                  }
                >
                  <option value="">
                    Chọn ngựa
                  </option>

                  {activeHorses.map(
                    (horse) => (
                      <option
                        key={
                          horse.HorseID
                        }
                        value={
                          horse.HorseID
                        }
                      >
                        {
                          horse.HorseName
                        }
                        {horse.HorseCode
                          ? ` · ${horse.HorseCode}`
                          : ''}
                      </option>
                    ),
                  )}
                </select>

                {activeHorses.length ===
                  0 && (
                  <small>
                    Trainer chưa có Active
                    Assignment. Có thể chọn
                    "Ngựa khác / ngoài CLB"
                    và nhập tên.
                  </small>
                )}
              </label>
            ) : (
              <label className="form-field">
                <span>
                  Tên ngựa *
                </span>

                <input
                  type="text"
                  maxLength="100"
                  value={
                    raceForm.HorseName
                  }
                  placeholder="Nhập tên ngựa"
                  onChange={(event) =>
                    setRaceForm(
                      (current) => ({
                        ...current,
                        HorseName:
                          event.target.value,
                      }),
                    )
                  }
                />
              </label>
            )}

            <label className="form-field">
              <span>
                Ngày đua *
              </span>

              <input
                type="date"
                required
                value={
                  raceForm.RaceDate
                }
                onChange={(event) =>
                  setRaceForm(
                    (current) => ({
                      ...current,
                      RaceDate:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Tên cuộc đua *
              </span>

              <input
                type="text"
                maxLength="200"
                required
                value={
                  raceForm.RaceName
                }
                placeholder="Tên giải / cuộc đua"
                onChange={(event) =>
                  setRaceForm(
                    (current) => ({
                      ...current,
                      RaceName:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Hạng cuộc đua
              </span>

              <select
                value={
                  raceForm.RaceClass
                }
                onChange={(event) =>
                  setRaceForm(
                    (current) => ({
                      ...current,
                      RaceClass:
                        event.target.value,
                    }),
                  )
                }
              >
                <option value="Group 1">
                  Group 1
                </option>

                <option value="Group 2">
                  Group 2
                </option>

                <option value="Group 3">
                  Group 3
                </option>

                <option value="Listed">
                  Listed
                </option>

                <option value="Handicap">
                  Handicap
                </option>

                <option value="Maiden">
                  Maiden
                </option>

                <option value="Other">
                  Khác
                </option>
              </select>
            </label>

            <label className="form-field">
              <span>
                Thứ hạng *
              </span>

              <input
                type="number"
                min="1"
                required
                value={
                  raceForm.FinishPosition
                }
                placeholder="1"
                onChange={(event) =>
                  setRaceForm(
                    (current) => ({
                      ...current,
                      FinishPosition:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Số ngựa tham gia *
              </span>

              <input
                type="number"
                min="2"
                required
                value={
                  raceForm.FieldSize
                }
                placeholder="12"
                onChange={(event) =>
                  setRaceForm(
                    (current) => ({
                      ...current,
                      FieldSize:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label className="form-field trainer-profile-form-full">
              <span>
                Ghi chú
              </span>

              <textarea
                rows="3"
                maxLength="1000"
                value={
                  raceForm.Note
                }
                placeholder="Ghi chú về cuộc đua nếu có..."
                onChange={(event) =>
                  setRaceForm(
                    (current) => ({
                      ...current,
                      Note:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <div className="trainer-profile-form-actions">
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  setRaceForm({
                    ...INITIAL_RACE_FORM,
                  })

                  setRaceFormOpen(
                    false,
                  )
                }}
              >
                Hủy
              </button>

              <button
                className="button"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? 'Đang lưu...'
                  : 'Lưu kết quả đua'}
              </button>
            </div>
          </form>
        )}

        {raceResults.length ===
        0 ? (
          <div className="trainer-profile-empty-box">
            Chưa có kết quả đua được ghi
            nhận cho Trainer này.
          </div>
        ) : (
          <div className="trainer-race-table-wrapper">
            <table className="data-table trainer-race-table">
              <thead>
                <tr>
                  <th>
                    Ngày
                  </th>

                  <th>
                    Cuộc đua
                  </th>

                  <th>
                    Ngựa
                  </th>

                  <th>
                    Hạng đua
                  </th>

                  <th>
                    Kết quả
                  </th>

                  <th>
                    Ghi chú
                  </th>

                  <th>
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {raceResults.map(
                  (item) => (
                    <tr
                      key={
                        item.RaceResultID
                      }
                    >
                      <td>
                        {formatDate(
                          item.RaceDate,
                        )}
                      </td>

                      <td>
                        <strong>
                          {
                            item.RaceName
                          }
                        </strong>
                      </td>

                      <td>
                        {show(
                          item.HorseName,
                        )}
                      </td>

                      <td>
                        {show(
                          RACE_CLASS_LABELS[
                            item.RaceClass
                          ],
                          item.RaceClass,
                        )}
                      </td>

                      <td>
                        <span className="trainer-race-position">
                          #
                          {
                            item.FinishPosition
                          }
                        </span>

                        <small>
                          {' '}
                          /{' '}
                          {
                            item.FieldSize
                          }
                        </small>
                      </td>

                      <td>
                        {show(
                          item.Note,
                        )}
                      </td>

                      <td>
                        <button
                          className="trainer-profile-text-danger"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setDeleteTarget({
                              type:
                                'race',

                              id:
                                item.RaceResultID,

                              title:
                                `${item.RaceName} · ${formatDate(
                                  item.RaceDate,
                                )}`,
                            })
                          }
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deleteTarget && (
        <div
          className="trainer-profile-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget &&
              !busy
            ) {
              setDeleteTarget(
                null,
              )
            }
          }}
        >
          <section
            className="trainer-profile-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trainer-delete-title"
          >
            <div className="trainer-profile-confirm-head">
              <div>
                <span className="trainer-profile-kicker">
                  XÁC NHẬN
                </span>

                <h2 id="trainer-delete-title">
                  Xóa dữ liệu này?
                </h2>
              </div>

              <button
                className="trainer-profile-modal-close"
                type="button"
                disabled={busy}
                aria-label="Đóng"
                onClick={() =>
                  setDeleteTarget(
                    null,
                  )
                }
              >
                ×
              </button>
            </div>

            <p>
              M sẽ xóa:
            </p>

            <strong className="trainer-profile-delete-name">
              {
                deleteTarget.title
              }
            </strong>

            {deleteTarget.type ===
              'specialization' && (
              <div className="trainer-profile-delete-warning">
                Nếu chuyên môn đã được dùng
                trong phân công ngựa,
                Backend sẽ không cho xóa.
              </div>
            )}

            <div className="trainer-profile-confirm-actions">
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() =>
                  setDeleteTarget(
                    null,
                  )
                }
              >
                Giữ lại
              </button>

              <button
                className="button trainer-profile-danger-button"
                type="button"
                disabled={busy}
                onClick={() =>
                  void confirmDelete()
                }
              >
                {busy
                  ? 'Đang xóa...'
                  : 'Xác nhận xóa'}
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="panel trainer-profile-section trainer-profile-audit-note">
        <div>
          <span className="trainer-profile-kicker">
            CẬP NHẬT GẦN NHẤT
          </span>

          <h2>
            Dữ liệu được tính tự động
          </h2>

          
        </div>
      </section>
    </main>
  )
}