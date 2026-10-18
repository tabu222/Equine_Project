import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  getTrainer,
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

function showPercent(
  value,
) {
  return value === null ||
    value === undefined
    ? '—'
    : `${value}%`
}

export default function TrainerProfilePage() {
  const { trainerId } =
    useParams()

  const [
    trainer,
    setTrainer,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    let active = true

    async function loadTrainer() {
      if (!trainerId) {
        setError(
          'Không tìm thấy Trainer.',
        )

        setLoading(false)

        return
      }

      setLoading(true)
      setError('')

      try {
        const result =
          await getTrainer(
            trainerId,
          )

        if (!active) {
          return
        }

        setTrainer(result)
      } catch (loadError) {
        if (!active) {
          return
        }

        setTrainer(null)

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không thể tải hồ sơ Trainer.',
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadTrainer()

    return () => {
      active = false
    }
  }, [trainerId])

  if (loading) {
    return (
      <main className="page-content">
        <section
          className="panel"
          role="status"
        >
          Đang tải hồ sơ Trainer...
        </section>
      </main>
    )
  }

  if (
    error ||
    !trainer
  ) {
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

        <section
          className="panel"
          role="alert"
        >
          <h1>
            Không thể tải hồ sơ Trainer
          </h1>

          <p>
            {error ||
              'Không tìm thấy Trainer.'}
          </p>
        </section>
      </main>
    )
  }

  const specializations =
    Array.isArray(
      trainer.Specializations,
    )
      ? trainer.Specializations
      : []

  const activeHorses =
    Array.isArray(
      trainer.ActiveHorses,
    )
      ? trainer.ActiveHorses
      : []

  const credentials =
    Array.isArray(
      trainer.Credentials,
    )
      ? trainer.Credentials
      : []

  const raceResults =
    Array.isArray(
      trainer.RecentRaceResults,
    )
      ? trainer.RecentRaceResults
      : []

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
        <div>
          <h1>
            Hồ sơ Trainer
          </h1>

          <p>
            Thông tin kinh nghiệm,
            chuyên môn và thành tích.
          </p>
        </div>
      </div>

      <section className="panel">
        <h2>
          {trainer.FullName}
        </h2>

        <div className="health-summary-grid">
          <div className="info-item">
            <span>
              Họ và tên
            </span>

            <strong>
              {show(
                trainer.FullName,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Email
            </span>

            <strong>
              {show(
                trainer.Email,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Số điện thoại
            </span>

            <strong>
              {show(
                trainer.Phone,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Bắt đầu sự nghiệp
            </span>

            <strong>
              {show(
                trainer.CareerStartDate,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Số năm kinh nghiệm
            </span>

            <strong>
              {show(
                trainer.YearsOfExperience,
              )}{' '}
              năm
            </strong>
          </div>

          <div className="info-item">
            <span>
              Cấp độ kinh nghiệm
            </span>

            <strong>
              {show(
                trainer.ExperienceLevelName ||
                  trainer.ExperienceLevel,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Thâm niên có minh chứng
            </span>

            <strong>
              {trainer.Seniority ===
              null ||
              trainer.Seniority ===
                undefined
                ? '—'
                : `${trainer.Seniority} năm`}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Trainer Rating
            </span>

            <strong>
              {show(
                trainer.TrainerRating,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Ngựa đang phụ trách
            </span>

            <strong>
              {show(
                trainer.ActiveHorseCount,
                0,
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>
          Chuyên môn
        </h2>

        {specializations.length ===
        0 ? (
          <p>
            Trainer chưa có chuyên môn
            được ghi nhận.
          </p>
        ) : (
          <div className="request-list">
            {specializations.map(
              (item) => (
                <article
                  className="request-item"
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
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>
          Thành tích
        </h2>

        <div className="health-summary-grid">
          <div className="info-item">
            <span>
              Tổng số cuộc đua
            </span>

            <strong>
              {show(
                trainer.CareerStarts,
                0,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Tổng số chiến thắng
            </span>

            <strong>
              {show(
                trainer.CareerWins,
                0,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Career Win Rate
            </span>

            <strong>
              {showPercent(
                trainer.CareerWinRate,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Recent Starts
            </span>

            <strong>
              {show(
                trainer.RecentStarts,
                0,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Recent Wins
            </span>

            <strong>
              {show(
                trainer.RecentWins,
                0,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Win Rate
            </span>

            <strong>
              {showPercent(
                trainer.WinRate,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Place Rate
            </span>

            <strong>
              {showPercent(
                trainer.PlaceRate,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Ghi chú Win Rate
            </span>

            <strong>
              {show(
                trainer.WinRateNote,
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>
          Bằng cấp và giải thưởng
        </h2>

        <div className="health-summary-grid">
          <div className="info-item">
            <span>
              Bằng cấp / chứng chỉ
            </span>

            <strong>
              {show(
                trainer.QualificationCount,
                0,
              )}
            </strong>
          </div>

          <div className="info-item">
            <span>
              Giải thưởng
            </span>

            <strong>
              {show(
                trainer.AwardCount,
                0,
              )}
            </strong>
          </div>
        </div>

        {credentials.length ===
        0 ? (
          <p>
            Chưa có thông tin bằng cấp,
            chứng chỉ hoặc giải thưởng.
          </p>
        ) : (
          <div className="request-list">
            {credentials.map(
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
                      Loại:{' '}
                      {show(
                        item.CredentialType,
                      )}
                    </p>

                    <p>
                      Đơn vị cấp:{' '}
                      {show(
                        item.IssuedBy,
                      )}
                    </p>

                    <p>
                      Ngày cấp:{' '}
                      {show(
                        item.IssuedDate,
                      )}
                    </p>

                    {item.ExpiryDate && (
                      <p>
                        Hết hạn:{' '}
                        {
                          item.ExpiryDate
                        }
                      </p>
                    )}

                    {item.Note && (
                      <p>
                        Ghi chú:{' '}
                        {item.Note}
                      </p>
                    )}

                    {item.FileUrl && (
                      <p>
                        <a
                          href={
                            item.FileUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Xem tài liệu
                        </a>
                      </p>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>
          Ngựa đang phụ trách
        </h2>

        {activeHorses.length ===
        0 ? (
          <p>
            Trainer hiện chưa phụ trách
            ngựa nào.
          </p>
        ) : (
          <div className="request-list">
            {activeHorses.map(
              (horse) => (
                <article
                  className="request-item"
                  key={
                    horse.TrainerHorseAssignmentID
                  }
                >
                  <div>
                    <strong>
                      {horse.HorseName}
                    </strong>

                    <p>
                      Mã ngựa:{' '}
                      {show(
                        horse.HorseCode,
                      )}
                    </p>

                    <p>
                      Chuyên môn:{' '}
                      {show(
                        horse.SpecializationName,
                      )}
                    </p>

                    <p>
                      Bắt đầu phụ trách:{' '}
                      {show(
                        horse.StartDate,
                      )}
                    </p>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>
          Kết quả đua gần đây
        </h2>

        {raceResults.length ===
        0 ? (
          <p>
            Chưa có dữ liệu kết quả đua.
          </p>
        ) : (
          <div className="request-list">
            {raceResults.map(
              (result) => (
                <article
                  className="request-item"
                  key={
                    result.RaceResultID
                  }
                >
                  <div>
                    <strong>
                      {result.RaceName}
                    </strong>

                    <p>
                      Ngày:{' '}
                      {result.RaceDate}
                    </p>

                    <p>
                      Ngựa:{' '}
                      {show(
                        result.HorseName,
                      )}
                    </p>

                    <p>
                      Hạng đua:{' '}
                      {show(
                        result.RaceClass,
                      )}
                    </p>

                    <p>
                      Thành tích:{' '}
                      {
                        result.FinishPosition
                      }
                      /
                      {
                        result.FieldSize
                      }
                    </p>

                    {result.Note && (
                      <p>
                        {result.Note}
                      </p>
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