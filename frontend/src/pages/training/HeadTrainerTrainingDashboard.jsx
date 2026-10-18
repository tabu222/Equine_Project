import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
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

export default function HeadTrainerTrainingDashboard() {
  const [rows, setRows] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    getTrainingDashboard()
      .then((result) => {
        if (!active) return

        setRows(result)

        setError('')
      })
      .catch((loadError) => {
        if (!active) return

        setRows([])

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không thể tải danh sách huấn luyện.',
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
  }, [])

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
      <div className="page-heading">
        <h1>
          Quản lý huấn luyện
        </h1>
      </div>

      {error && (
        <div
          className="alert-banner"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="panel">
        <h2>
          Danh sách ngựa
        </h2>

        {rows.length === 0 ? (
          <p>
            Chưa có ngựa đã được duyệt
            để tham gia huấn luyện.
          </p>
        ) : (
          <div className="request-list">
            {rows.map((horse) => (
              <article
                className="request-item"
                key={horse.HorseID}
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
                    Sức khỏe:{' '}
                    {show(
                      horse.CurrentHealthStatus,
                    )}
                  </p>

                  <p>
                    Trainer:{' '}
                    {show(
                      horse.TrainerName,
                      'Chưa phân công',
                    )}
                  </p>

                  <p>
                    Chuyên môn:{' '}
                    {show(
                      horse.SpecializationName,
                      'Chưa xác định',
                    )}
                  </p>

                  <p>
                    Giáo án đang áp dụng:{' '}
                    {horse.ActiveTrainingPlanID
                      ? `#${horse.ActiveTrainingPlanID}`
                      : 'Chưa có'}
                  </p>

                  {horse.IsTrainingLocked && (
                    <p>
                      Hạn chế tập:{' '}
                      {show(
                        horse.LockLevel,
                      )}

                      {horse.MaxIntensity != null
                        ? ` · MaxIntensity ${horse.MaxIntensity}`
                        : ''}
                    </p>
                  )}

                  {horse.LatestTrainingDate && (
                    <p>
                      Buổi gần nhất:{' '}
                      {horse.LatestTrainingDate}

                      {horse.LatestPerformanceScore !=
                      null
                        ? ` · Điểm ${horse.LatestPerformanceScore}`
                        : ''}
                    </p>
                  )}
                </div>

                <Link
                  className="button"
                  to={`/training/horses/${horse.HorseID}/assessment`}
                >
                  Đánh giá / Phân Trainer
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}