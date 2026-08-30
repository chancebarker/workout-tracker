import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { EQUIPMENT, MUSCLES } from '../utils/exerciseTaxonomy'

export default function ExercisePicker({ onSelect, onClose }) {
  const [exercises, setExercises] = useState([])
  const [search, setSearch] = useState('')
  const [equipment, setEquipment] = useState('')
  const [error, setError] = useState(null)
  const [showCustom, setShowCustom] = useState(false)

  // custom exercise form
  const [custom, setCustom] = useState({ name: '', equipment: 'barbell', primary_muscle: 'Chest', is_compound: false })
  const [savingCustom, setSavingCustom] = useState(false)

  async function load() {
    try {
      const data = await api.getExercises()
      setExercises(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      if (equipment && ex.equipment !== equipment) return false
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [exercises, equipment, search])

  // group filtered exercises by primary muscle
  const grouped = useMemo(() => {
    const map = {}
    for (const ex of filtered) {
      (map[ex.primary_muscle] ||= []).push(ex)
    }
    return map
  }, [filtered])

  async function handleCreateCustom(e) {
    e.preventDefault()
    setSavingCustom(true)
    setError(null)
    try {
      const created = await api.createExercise(custom)
      onSelect(created.id)
    } catch (err) {
      setError(err.message)
      setSavingCustom(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-white">Add exercise</h3>
          <button onClick={onClose} className="text-muted hover:text-white text-xl leading-none">×</button>
        </div>

        {error && <p className="text-danger text-sm px-4 pt-3">{error}</p>}

        {!showCustom ? (
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              <input
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
              />
              <select
                value={equipment}
                onChange={e => setEquipment(e.target.value)}
                className="px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
              >
                <option value="">All equipment</option>
                {EQUIPMENT.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>

            <div className="max-h-80 overflow-y-auto pr-1 space-y-4">
              {Object.keys(grouped).length === 0 && (
                <p className="text-muted text-sm">No exercises match.</p>
              )}
              {Object.entries(grouped).map(([muscle, exs]) => (
                <div key={muscle}>
                  <div className="text-xs uppercase tracking-wide text-muted mb-1">{muscle}</div>
                  <div className="space-y-1">
                    {exs.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => onSelect(ex.id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors flex items-center justify-between"
                      >
                        <span className="text-white text-sm">
                          {ex.name}
                          {ex.is_custom ? <span className="text-accent text-xs ml-2">custom</span> : null}
                        </span>
                        <span className="text-xs text-muted">{ex.equipment}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowCustom(true)}
              className="mt-4 w-full py-2 rounded-lg border border-border text-muted hover:text-white hover:border-accent text-sm transition-colors"
            >
              + Create custom exercise
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateCustom} className="p-4 space-y-3">
            <div>
              <label className="block text-sm text-muted mb-1">Name</label>
              <input
                value={custom.name}
                onChange={e => setCustom({ ...custom, name: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted mb-1">Equipment</label>
                <input
                  value={custom.equipment}
                  onChange={e => setCustom({ ...custom, equipment: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Primary muscle</label>
                <select
                  value={custom.primary_muscle}
                  onChange={e => setCustom({ ...custom, primary_muscle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
                >
                  {MUSCLES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={custom.is_compound}
                onChange={e => setCustom({ ...custom, is_compound: e.target.checked })}
              />
              Compound movement
            </label>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="flex-1 py-2 rounded-lg border border-border text-muted hover:text-white text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={savingCustom}
                className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
              >
                {savingCustom ? 'Saving…' : 'Create & add'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
