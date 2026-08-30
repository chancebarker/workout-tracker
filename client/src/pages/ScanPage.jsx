import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import ExercisePicker from '../components/ExercisePicker'
import { fileToCompressedBase64 } from '../utils/image'
import { matchExercise } from '../utils/exerciseMatch'
import { toYMD } from '../utils/date'

function num(v, integer = false) {
  if (v === '' || v === null || v === undefined) return null
  const n = integer ? parseInt(v, 10) : parseFloat(v)
  return Number.isNaN(n) ? null : n
}

let nextKey = 0
const uid = () => String(nextKey++)

export default function ScanPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const [step, setStep] = useState('capture') // capture | extracting | review | saving
  const [date, setDate] = useState(location.state?.date || toYMD(new Date()))
  const [groups, setGroups] = useState([])
  const [error, setError] = useState(null)
  const [resolvingKey, setResolvingKey] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setStep('extracting')
    try {
      const [image, exercises] = await Promise.all([
        fileToCompressedBase64(file),
        api.getExercises()
      ])
      const parsed = await api.parsePhoto({ image, media_type: 'image/jpeg' })

      if (!parsed.exercises || parsed.exercises.length === 0) {
        setError("Couldn't recognize a workout in that photo — try again with better lighting or focus.")
        setStep('capture')
        return
      }

      setGroups(parsed.exercises.map(g => {
        const match = matchExercise(g.exerciseName, exercises)
        return {
          key: uid(),
          parsedName: g.exerciseName,
          exerciseId: match?.id ?? null,
          exerciseName: match?.name ?? g.exerciseName,
          entries: g.entries.map(en => ({ key: uid(), ...en, included: true }))
        }
      }))
      setStep('review')
    } catch (err) {
      setError(err.message)
      setStep('capture')
    }
  }

  function updateEntry(groupKey, entryKey, field, value) {
    setGroups(gs => gs.map(g => g.key !== groupKey ? g : {
      ...g,
      entries: g.entries.map(en => en.key !== entryKey ? en : { ...en, [field]: value })
    }))
  }

  function toggleEntry(groupKey, entryKey) {
    setGroups(gs => gs.map(g => g.key !== groupKey ? g : {
      ...g,
      entries: g.entries.map(en => en.key !== entryKey ? en : { ...en, included: !en.included })
    }))
  }

  function handleResolved(exerciseId) {
    // ExercisePicker gives us just the id (existing or newly-created custom exercise) —
    // re-fetch the list to pick up its canonical name.
    api.getExercises().then(exercises => {
      const ex = exercises.find(e => e.id === exerciseId)
      setGroups(gs => gs.map(g => g.key !== resolvingKey ? g : {
        ...g,
        exerciseId,
        exerciseName: ex?.name ?? g.exerciseName
      }))
      setResolvingKey(null)
    })
  }

  const groupsWithIncluded = groups.filter(g => g.entries.some(en => en.included))
  const canSave = groupsWithIncluded.length > 0 && groupsWithIncluded.every(g => g.exerciseId != null)

  async function handleConfirm() {
    setStep('saving')
    setError(null)
    try {
      const workout = await api.createWorkout({ date })
      for (const group of groupsWithIncluded) {
        const included = group.entries.filter(en => en.included)
        const setSpecs = included.flatMap(en =>
          Array(num(en.sets, true) || 1).fill({ weight: num(en.weight), reps: num(en.reps, true) })
        )

        const we = await api.addExercise(workout.id, group.exerciseId) // creates blank set #1
        await api.updateSet(workout.id, we.id, we.sets[0].id, setSpecs[0])
        for (let i = 1; i < setSpecs.length; i++) {
          const newSet = await api.addSet(workout.id, we.id)
          await api.updateSet(workout.id, we.id, newSet.id, setSpecs[i])
        }
      }
      navigate(`/workout/${workout.id}`)
    } catch (err) {
      setError(`${err.message} — some of this workout may already be saved; check the workout before retrying.`)
      setStep('review')
    }
  }

  return (
    <div>
      <button onClick={() => navigate('/')} className="text-sm text-muted hover:text-white mb-3">← Tracker</button>
      <h1 className="text-2xl font-bold text-white mb-4">Scan notebook page</h1>

      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      {step === 'capture' && (
        <div className="bg-surface border border-dashed border-border rounded-xl p-8 text-center">
          <p className="text-muted text-sm mb-4">Take a photo of your notebook page, or choose one from your library.</p>
          <label className="inline-block px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium transition cursor-pointer">
            📷 Choose photo
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          </label>
        </div>
      )}

      {step === 'extracting' && (
        <p className="text-muted text-sm">Reading photo…</p>
      )}

      {(step === 'review' || step === 'saving') && (
        <div>
          <div className="mb-4">
            <label className="block text-sm text-muted mb-1">Date</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-4">
            {groups.map(group => (
              <div key={group.key} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-white">{group.exerciseName}</div>
                  <button
                    onClick={() => setResolvingKey(group.key)}
                    className="text-xs text-accent hover:underline"
                  >
                    {group.exerciseId ? 'Change' : 'Match exercise'}
                  </button>
                </div>
                {!group.exerciseId && (
                  <p className="text-xs text-danger mb-2">Couldn't match "{group.parsedName}" — pick or create it if you're including any of these entries.</p>
                )}

                <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 items-center text-xs text-muted mb-1">
                  <span></span><span>Weight</span><span>Reps</span><span>Sets</span>
                </div>
                {group.entries.map(entry => (
                  <div key={entry.key} className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 items-center mb-2">
                    <input
                      type="checkbox"
                      checked={entry.included}
                      onChange={() => toggleEntry(group.key, entry.key)}
                      className="justify-self-center"
                    />
                    <input
                      type="number" inputMode="decimal" placeholder="BW"
                      value={entry.weight ?? ''}
                      onChange={e => updateEntry(group.key, entry.key, 'weight', e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent disabled:opacity-40"
                      disabled={!entry.included}
                    />
                    <input
                      type="number" inputMode="numeric"
                      value={entry.reps}
                      onChange={e => updateEntry(group.key, entry.key, 'reps', e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent disabled:opacity-40"
                      disabled={!entry.included}
                    />
                    <input
                      type="number" inputMode="numeric" min="1"
                      value={entry.sets}
                      onChange={e => updateEntry(group.key, entry.key, 'sets', e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent disabled:opacity-40"
                      disabled={!entry.included}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            disabled={!canSave || step === 'saving'}
            className="mt-6 w-full py-3 rounded-xl bg-success hover:brightness-110 text-white font-medium transition disabled:opacity-50"
          >
            {step === 'saving' ? 'Saving…' : 'Add to my log'}
          </button>
        </div>
      )}

      {resolvingKey && (
        <ExercisePicker onSelect={handleResolved} onClose={() => setResolvingKey(null)} />
      )}
    </div>
  )
}
