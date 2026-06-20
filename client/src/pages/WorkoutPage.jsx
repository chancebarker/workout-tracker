import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import ExercisePicker from '../components/ExercisePicker'

// Parse an input string to a number, or null when empty.
function num(v, integer = false) {
  if (v === '' || v === null || v === undefined) return null
  const n = integer ? parseInt(v, 10) : parseFloat(v)
  return Number.isNaN(n) ? null : n
}

export default function WorkoutPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState(null)
  const [error, setError] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  async function load() {
    try {
      setWorkout(await api.getWorkout(id))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { load() }, [id])

  // --- local state helpers (optimistic UI; persist on blur) ---
  function patchLocalSet(weId, setId, field, value) {
    setWorkout(w => ({
      ...w,
      exercises: w.exercises.map(ex => ex.id !== weId ? ex : {
        ...ex,
        sets: ex.sets.map(s => s.id !== setId ? s : { ...s, [field]: value })
      })
    }))
  }

  async function saveSet(weId, setId) {
    const ex = workout.exercises.find(e => e.id === weId)
    const set = ex.sets.find(s => s.id === setId)
    try {
      await api.updateSet(id, weId, setId, {
        weight: num(set.weight),
        reps: num(set.reps, true),
        rpe: num(set.rpe, true)
      })
    } catch (err) {
      setError(err.message)
    }
  }

  async function addSet(weId) {
    try {
      const newSet = await api.addSet(id, weId)
      setWorkout(w => ({
        ...w,
        exercises: w.exercises.map(ex => ex.id !== weId ? ex : { ...ex, sets: [...ex.sets, newSet] })
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteSet(weId, setId) {
    try {
      await api.deleteSet(id, weId, setId)
      setWorkout(w => ({
        ...w,
        exercises: w.exercises.map(ex => ex.id !== weId ? ex : { ...ex, sets: ex.sets.filter(s => s.id !== setId) })
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeExercise(weId) {
    try {
      await api.removeExercise(id, weId)
      setWorkout(w => ({ ...w, exercises: w.exercises.filter(ex => ex.id !== weId) }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handlePick(exerciseId) {
    try {
      const added = await api.addExercise(id, exerciseId)
      setWorkout(w => ({ ...w, exercises: [...w.exercises, added] }))
      setPickerOpen(false)
    } catch (err) {
      setError(err.message)
      setPickerOpen(false)
    }
  }

  async function saveName(name) {
    try {
      await api.updateWorkout(id, { name: name || null })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteWorkout() {
    if (!confirm('Delete this entire workout?')) return
    try {
      await api.deleteWorkout(id)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  if (!workout) {
    return <p className="text-muted">{error || 'Loading…'}</p>
  }

  return (
    <div>
      <button onClick={() => navigate('/')} className="text-sm text-muted hover:text-white mb-3">← Calendar</button>

      <div className="flex items-start justify-between gap-3 mb-1">
        <input
          defaultValue={workout.name || ''}
          placeholder="Workout name"
          onBlur={e => saveName(e.target.value)}
          className="bg-transparent text-2xl font-bold text-white focus:outline-none focus:border-b focus:border-accent flex-1"
        />
        <button onClick={handleDeleteWorkout} className="text-sm text-danger hover:underline mt-2">Delete</button>
      </div>
      <p className="text-muted text-sm mb-5">{workout.date}</p>

      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      <div className="space-y-4">
        {workout.exercises.map(ex => (
          <div key={ex.id} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-white">{ex.name}</div>
                <div className="text-xs text-muted">{ex.primary_muscle} · {ex.equipment}</div>
              </div>
              <button onClick={() => removeExercise(ex.id)} className="text-muted hover:text-danger text-sm">Remove</button>
            </div>

            <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 items-center text-xs text-muted mb-1">
              <span>Set</span><span>Weight</span><span>Reps</span><span>RPE</span><span></span>
            </div>

            {ex.sets.map(set => (
              <div key={set.id} className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 items-center mb-2">
                <span className="text-muted text-sm">{set.set_number}</span>
                <input
                  type="number" inputMode="decimal" placeholder="—"
                  value={set.weight ?? ''}
                  onChange={e => patchLocalSet(ex.id, set.id, 'weight', e.target.value)}
                  onBlur={() => saveSet(ex.id, set.id)}
                  className="px-2 py-1.5 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
                />
                <input
                  type="number" inputMode="numeric" placeholder="—"
                  value={set.reps ?? ''}
                  onChange={e => patchLocalSet(ex.id, set.id, 'reps', e.target.value)}
                  onBlur={() => saveSet(ex.id, set.id)}
                  className="px-2 py-1.5 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
                />
                <input
                  type="number" inputMode="numeric" placeholder="1–10" min="1" max="10"
                  value={set.rpe ?? ''}
                  onChange={e => patchLocalSet(ex.id, set.id, 'rpe', e.target.value)}
                  onBlur={() => saveSet(ex.id, set.id)}
                  className="px-2 py-1.5 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
                />
                <button onClick={() => deleteSet(ex.id, set.id)} className="text-muted hover:text-danger text-sm">×</button>
              </div>
            ))}

            <button
              onClick={() => addSet(ex.id)}
              className="mt-1 text-sm text-accent hover:underline"
            >
              + Add set
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setPickerOpen(true)}
        className="mt-5 w-full py-3 rounded-xl border border-dashed border-border text-muted hover:text-white hover:border-accent transition-colors"
      >
        + Add exercise
      </button>

      {pickerOpen && (
        <ExercisePicker onSelect={handlePick} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}
