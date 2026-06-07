import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function WorkoutSession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [loggedSets, setLoggedSets] = useState({})
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const workout = await api.getActiveProgram()
        setActiveWorkout(workout)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function updateSet(exerciseId, setNum, field, value) {
    setLoggedSets(prev => ({
      ...prev,
      [`${exerciseId}-${setNum}`]: {
        ...prev[`${exerciseId}-${setNum}`],
        exercise_id: exerciseId,
        set_number: setNum,
        [field]: value
      }
    }))
  }

  async function logSet(exercise, setNum) {
    const key = `${exercise.exercise_id}-${setNum}`
    const setData = loggedSets[key]

    if (!setData?.actual_reps || !setData?.actual_weight) {
      alert('Please enter weight and reps before logging.')
      return
    }

    try {
      const payload = {
        exercise_id: exercise.exercise_id,
        set_number: setNum,
        planned_reps: exercise.reps,
        actual_reps: parseInt(setData.actual_reps),
        actual_weight: parseFloat(setData.actual_weight)
      }
      if (exercise.target_weight) {
        payload.planned_weight = exercise.target_weight
      }
      await api.logSet(sessionId, payload)

      setLoggedSets(prev => ({
        ...prev,
        [key]: { ...prev[key], logged: true }
      }))
    } catch (err) {
      setError(typeof err.message === 'string' ? err.message : JSON.stringify(err.message))
    }
  }

  async function handleComplete() {
    setCompleting(true)
    try {
      const result = await api.completeSession(sessionId)
      alert(result.message)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setCompleting(false)
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Loading workout...</p>
  if (!activeWorkout) return <p style={{ padding: 20 }}>No active workout found.</p>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>{activeWorkout.current_day_name}</h1>
      <p>Week {activeWorkout.current_week}, Day {activeWorkout.current_day}</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {activeWorkout.exercises.map(exercise => (
        <div key={exercise.id} style={{ marginBottom: 24, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3>{exercise.exercise_name}</h3>
          <p>{exercise.sets} sets × {exercise.reps} reps
            {exercise.intensity_percent && ` @ ${exercise.intensity_percent}%`}
            {exercise.target_weight && ` — Target: ${exercise.target_weight} lbs`}
          </p>

          {Array.from({ length: exercise.sets }, (_, i) => i + 1).map(setNum => {
            const key = `${exercise.exercise_id}-${setNum}`
            const setData = loggedSets[key] || {}
            return (
              <div key={setNum} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ width: 50 }}>Set {setNum}</span>
                <input
                  type="number"
                  placeholder="Weight (lbs)"
                  value={setData.actual_weight || ''}
                  onChange={e => updateSet(exercise.exercise_id, setNum, 'actual_weight', e.target.value)}
                  disabled={setData.logged}
                  style={{ width: 120, padding: 6 }}
                />
                <input
                  type="number"
                  placeholder="Reps"
                  value={setData.actual_reps || ''}
                  onChange={e => updateSet(exercise.exercise_id, setNum, 'actual_reps', e.target.value)}
                  disabled={setData.logged}
                  style={{ width: 80, padding: 6 }}
                />
                <button
                  onClick={() => logSet(exercise, setNum)}
                  disabled={setData.logged}
                  style={{ padding: '6px 12px', background: setData.logged ? '#ccc' : undefined }}
                >
                  {setData.logged ? '✓ Logged' : 'Log Set'}
                </button>
              </div>
            )
          })}
        </div>
      ))}

      <button
        onClick={handleComplete}
        disabled={completing}
        style={{ padding: '12px 24px', fontSize: 16, marginTop: 16 }}
      >
        {completing ? 'Completing...' : 'Complete Workout'}
      </button>
    </div>
  )
}
