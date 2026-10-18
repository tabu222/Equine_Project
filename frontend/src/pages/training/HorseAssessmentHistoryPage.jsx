import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  getHorseAssessments,
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

export default function HorseAssessmentHistoryPage() {
  const { horseId } = useParams()

  const [horse, setHorse] =
    useState(null)

  const [
    assessments,
    setAssessments,
  ] = useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    async function load() {
      if (!horseId) {
        return
      }

      setLoading(true)
      setError('')

      try {
        const [
          dashboardRows,
          assessmentRows,
        ] = await Promise.all([
          getTrainingDashboard(
            horseId,
          ),

          getHorseAssessments(
            horseId,
          ),
        ])

        if (!active) {
          return
        }

        setHorse(
          dashboardRows[0] ||
            null,
        )

        setAssessments(
          assessmentRows,
        )
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không thể tải lịch sử đánh giá.',
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [horseId])

  if (loading) {
    return (
      <main className="page-content">
        <section className="panel">
          Đang tải lịch sử đánh giá...
        </section>
      </main>
    )
  }

  return (
    <main className="page-content">
      <div className="horse-actions">
        <Link
          className="breadcrumb-back-button"
          to={`/training/horses/${horseId}/assessment`}
        >
          ← Quay lại đánh giá ngựa
        </Link>
      </div>

      <div className="page-heading">
        <h1>
          Lịch sử đánh giá
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

      <section className="panel">
        {assessments.length === 0 ? (
          <p>
            Chưa có lịch sử đánh giá.
          </p>
        ) : (
          <div className="request-list">
            {assessments.map(
              (item) => (
                <article
                  className="request-item"
                  key={
                    item.AssessmentID
                  }
                >
                  <div>
                    <strong>
                      {
                        item.SpecializationName
                      }
                    </strong>

                    <p>
                      Ngày đánh giá:{' '}
                      {
                        item.AssessmentDate
                      }
                    </p>

                    <p>
                      Điểm chất lượng:{' '}
                      {show(
                        item.QualityScore,
                      )}
                    </p>

                    <p>
                      Thể trạng:{' '}
                      {show(
                        item.FitnessLevel,
                      )}
                    </p>

                    <p>
                      Trạng thái:{' '}
                      {
                        item.DecisionStatus
                      }
                    </p>

                    <p>
                      Head Trainer:{' '}
                      {show(
                        item.HeadTrainerName,
                      )}
                    </p>

                    {item.AssessmentNote && (
                      <p>
                        Ghi chú:{' '}
                        {
                          item.AssessmentNote
                        }
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