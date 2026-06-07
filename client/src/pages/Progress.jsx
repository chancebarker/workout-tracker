import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'

export default function Progress() {
  const [summary, setSummary] = useState(null)
  const [prs, setPRs] = useState([])
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [progressData, setProgressData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [summaryData, prsData, exercisesData] = await Promise.all([
          api.getSummary(),
          api.getPRs(),
          api.getExercises()
        ])
        setSummary(summaryData)
        setPRs(prsData)
        setExercises(exercisesData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleExerciseSelect(exerciseId) {
    setSelectedExercise(exerciseId)
    try {
      const data = await api.getExerciseProgress(exerciseId)
      setProgressData(data.data_points.map(d => ({
        date: new Date(d.session_date).toLocaleDateString(),
        weight: d.best_weight,
        volume: d.volume
      })))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Progress</h1>
        <Link to="/dashboard">← Dashboard</Link>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {summary && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
            <h3>{summary.sessions_completed}</h3>
            <p>Sessions Completed</p>
          </div>
          <div style={{ flex: 1, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
            <h3>{summary.total_volume_lbs.toLocaleString()} lbs</h3>
            <p>Total Volume</p>
          </div>
          <div style={{ flex: 1, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
            <h3>{prs.length}</h3>
            <p>Exercises Tracked</p>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h2>Weight Progression</h2>
        <select
          onChange={e => handleExerciseSelect(e.target.value)}
          style={{ padding: 8, marginBottom: 16, width: '100%' }}
        >
          <option value="">Select an exercise...</option>
          {exercises.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>

        {progressData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="#8884d8" name="Weight (lbs)" dot={true} />
            </LineChart>
          </ResponsiveContainer>
        ) : selectedExercise ? (
          <p>No data yet for this exercise. Start logging workouts!</p>
        ) : null}
      </div>

      {prs.length > 0 && (
        <div>
          <h2>Personal Records</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Exercise</th>
                <th style={{ textAlign: 'right', padding: 8 }}>PR Weight</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Reps</th>
              </tr>
            </thead>
            <tbody>
              {prs.map(pr => (
                <tr key={pr.exercise_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{pr.exercise_name}</td>
                  <td style={{ textAlign: 'right', padding: 8 }}>{pr.pr_weight} lbs</td>
                  <td style={{ textAlign: 'right', padding: 8 }}>{pr.reps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
