import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        const [summaryData, programsData] = await Promise.all([
          api.getSummary(),
          api.getPrograms()
        ])
        setSummary(summaryData)
        setPrograms(programsData)

        if (summaryData.active_program) {
          const workout = await api.getActiveProgram()
          setActiveWorkout(workout)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleEnroll(programId) {
    try {
      await api.enrollInProgram(programId)
      window.location.reload()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleStartSession() {
    try {
      const session = await api.startSession()
      navigate(`/session/${session.id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard</h1>
        <div>
          <Link to="/progress" style={{ marginRight: 16 }}>Progress</Link>
          <Link to="/exercises" style={{ marginRight: 16 }}>Exercises</Link>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {summary && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
            <h3>{summary.sessions_completed}</h3>
            <p>Sessions Completed</p>
          </div>
          <div style={{ flex: 1, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
            <h3>{summary.total_sets}</h3>
            <p>Total Sets</p>
          </div>
          <div style={{ flex: 1, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
            <h3>{summary.total_volume_lbs.toLocaleString()} lbs</h3>
            <p>Total Volume</p>
          </div>
        </div>
      )}

      {activeWorkout ? (
        <div style={{ padding: 20, border: '1px solid #ddd', borderRadius: 8, marginBottom: 24 }}>
          <h2>Today's Workout</h2>
          <p><strong>{summary.active_program.name}</strong> — Week {activeWorkout.current_week}, Day {activeWorkout.current_day}</p>
          <p>{activeWorkout.current_day_name}</p>
          <ul>
            {activeWorkout.exercises.map(ex => (
              <li key={ex.id}>
                <strong>{ex.exercise_name}</strong> — {ex.sets} sets × {ex.reps} reps
                {ex.intensity_percent && ` @ ${ex.intensity_percent}%`}
                {ex.target_weight && ` (target: ${ex.target_weight} lbs)`}
              </li>
            ))}
          </ul>
          <button onClick={handleStartSession} style={{ padding: '10px 20px', marginTop: 12 }}>
            Start Workout
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <h2>Available Programs</h2>
          {programs.map(program => (
            <div key={program.id} style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, marginBottom: 12 }}>
              <h3>{program.name}</h3>
              <p>{program.description}</p>
              <p>{program.duration_weeks} weeks · {program.days_per_week} days/week · {program.goal}</p>
              <button onClick={() => handleEnroll(program.id)}>Enroll</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
