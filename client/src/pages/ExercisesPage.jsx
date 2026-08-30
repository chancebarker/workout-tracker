import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import MuscleDiagram from '../components/MuscleDiagram'
import { EQUIPMENT } from '../utils/exerciseTaxonomy'
import { toYMD } from '../utils/date'

const SEX_KEY = 'wt.exercisesPage.sex'

export default function ExercisesPage() {
  const navigate = useNavigate()
  const [sex, setSex] = useState(() => localStorage.getItem(SEX_KEY) || 'male')
  const [equipment, setEquipment] = useState('')
  const [muscle, setMuscle] = useState(null)
  const [exercises, setExercises] = useState([])
  const [selected, setSelected] = useState(null)
  const [addState, setAddState] = useState('idle') // idle | adding | added
  const [error, setError] = useState(null)

  useEffect(() => { localStorage.setItem(SEX_KEY, sex) }, [sex])

  useEffect(() => {
    if (!muscle) { setExercises([]); return }
    setSelected(null)
    setAddState('idle')
    async function load() {
      try {
        const params = { muscle }
        if (equipment) params.equipment = equipment
        const data = await api.getExercises(params)
        setExercises(data.filter(ex => !ex.is_custom))
      } catch (err) {
        setError(err.message)
      }
    }
    load()
  }, [muscle, equipment])

  const grouped = useMemo(() => {
    const map = {}
    for (const ex of exercises) {
      (map[ex.equipment] ||= []).push(ex)
    }
    return map
  }, [exercises])

  function handleSelect(exercise) {
    setSelected(exercise)
    setAddState('idle')
  }

  async function handleAddToToday() {
    setAddState('adding')
    setError(null)
    try {
      const today = toYMD(new Date())
      const existing = await api.getWorkouts({ from: today, to: today })
      const workout = existing[0] ?? await api.createWorkout({ date: today })
      await api.addExercise(workout.id, selected.id)
      setAddState('added')
    } catch (err) {
      setError(err.message)
      setAddState('idle')
    }
  }

  const cueList = selected ? (selected.cues || '').split('\n').filter(Boolean) : []

  return (
    <div>
      <button onClick={() => navigate('/')} className="text-sm text-muted hover:text-white mb-3">← Tracker</button>
      <h1 className="text-2xl font-bold text-white mb-4">Exercises</h1>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {['male', 'female'].map(s => (
            <button
              key={s}
              onClick={() => setSex(s)}
              className={[
                'px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                sex === s ? 'bg-accent text-white' : 'bg-surface-2 text-muted hover:text-white'
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEquipment('')}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors border',
              equipment === '' ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:text-white'
            ].join(' ')}
          >
            All equipment
          </button>
          {EQUIPMENT.map(eq => (
            <button
              key={eq}
              onClick={() => setEquipment(eq)}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors border',
                equipment === eq ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:text-white'
              ].join(' ')}
            >
              {eq}
            </button>
          ))}
        </div>
      </div>

      <MuscleDiagram sex={sex} selected={muscle} onSelectMuscle={setMuscle} />

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <div>
          {!muscle ? (
            <p className="text-muted text-sm">Click a muscle group above to see exercises.</p>
          ) : exercises.length === 0 ? (
            <p className="text-muted text-sm">No {muscle.toLowerCase()} exercises match that equipment.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([eq, list]) => (
                <div key={eq}>
                  <div className="text-xs uppercase tracking-wide text-muted mb-1">{eq}</div>
                  <div className="space-y-1">
                    {list.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => handleSelect(ex)}
                        className={[
                          'w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between',
                          selected?.id === ex.id ? 'bg-surface-2 border-accent' : 'bg-surface border-border hover:border-accent'
                        ].join(' ')}
                      >
                        <span className="text-white text-sm">{ex.name}</span>
                        {ex.is_compound ? <span className="text-xs text-accent">compound</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="bg-surface border border-border rounded-xl p-4 h-fit">
            <h2 className="text-xl font-bold text-white mb-1">{selected.name}</h2>
            <div className="flex gap-2 mb-4">
              <span className="text-xs px-2 py-1 rounded-lg bg-surface-2 text-muted capitalize">{selected.equipment}</span>
              <span className="text-xs px-2 py-1 rounded-lg bg-surface-2 text-muted">{selected.primary_muscle}</span>
              {selected.is_compound ? <span className="text-xs px-2 py-1 rounded-lg bg-surface-2 text-accent">compound</span> : null}
            </div>

            {selected.secondary_muscles && (
              <p className="text-xs text-muted mb-4">
                Also works: {selected.secondary_muscles.split(',').join(', ')}
              </p>
            )}

            {selected.description && (
              <p className="text-slate-300 text-sm mb-4">{selected.description}</p>
            )}

            {cueList.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wide text-muted mb-2">Form cues</div>
                <ul className="space-y-1.5">
                  {cueList.map((cue, i) => (
                    <li key={i} className="text-sm text-white flex gap-2">
                      <span className="text-accent">•</span>
                      <span>{cue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleAddToToday}
              disabled={addState !== 'idle'}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50"
            >
              {addState === 'adding' ? 'Adding…' : addState === 'added' ? '✓ Added to today\'s workout' : "+ Add to today's workout"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
