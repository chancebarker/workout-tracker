import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { api } from '../api/client'
import { toYMD } from '../utils/date'

function monthRange(date) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1)
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { from: toYMD(from), to: toYMD(to) }
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeMonth, setActiveMonth] = useState(new Date())
  const [workouts, setWorkouts] = useState([])
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)

  async function loadMonth(monthDate) {
    try {
      const { from, to } = monthRange(monthDate)
      const data = await api.getWorkouts({ from, to })
      setWorkouts(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { loadMonth(activeMonth) }, [activeMonth])

  const selectedYMD = toYMD(selectedDate)
  const workoutsOnSelected = workouts.filter(w => w.date === selectedYMD)
  const datesWithWorkouts = new Set(workouts.map(w => w.date))

  async function handleCreate() {
    setCreating(true)
    setError(null)
    try {
      const workout = await api.createWorkout({ date: selectedYMD })
      navigate(`/workout/${workout.id}`)
    } catch (err) {
      setError(err.message)
      setCreating(false)
    }
  }

  const prettyDate = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Calendar</h1>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          onActiveStartDateChange={({ activeStartDate }) => setActiveMonth(activeStartDate)}
          tileClassName={({ date, view }) =>
            view === 'month' && datesWithWorkouts.has(toYMD(date)) ? 'has-workout' : null
          }
        />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">{prettyDate}</h2>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating…' : '+ New workout'}
            </button>
          </div>

          {workoutsOnSelected.length === 0 ? (
            <p className="text-muted text-sm">No workouts logged this day.</p>
          ) : (
            <div className="space-y-2">
              {workoutsOnSelected.map(w => (
                <button
                  key={w.id}
                  onClick={() => navigate(`/workout/${w.id}`)}
                  className="w-full text-left p-4 rounded-xl bg-surface border border-border hover:border-accent transition-colors"
                >
                  <div className="font-medium text-white">{w.name || 'Workout'}</div>
                  <div className="text-sm text-muted">
                    {w.exercise_count} {w.exercise_count === 1 ? 'exercise' : 'exercises'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
