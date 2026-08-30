import { useEffect, useMemo, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'

function StatCard({ label, value }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  )
}

export default function ProgressPage() {
  const [summary, setSummary] = useState(null)
  const [prs, setPRs] = useState([])
  const [exercises, setExercises] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState('')
  const [series, setSeries] = useState([])
  const [error, setError] = useState(null)
  const chartRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const [s, p, ex] = await Promise.all([api.getSummary(), api.getPRs(), api.getLoggedExercises()])
        setSummary(s); setPRs(p); setExercises(ex)
      } catch (err) {
        setError(err.message)
      }
    }
    load()
  }, [])

  const filteredExercises = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return exercises
    return exercises.filter(ex => ex.name.toLowerCase().includes(needle))
  }, [exercises, search])

  async function loadSeries(exercise) {
    setSelected(exercise.id)
    try {
      const data = await api.getExerciseProgress(exercise.id)
      setSeries(data.data_points)
    } catch (err) {
      setError(err.message)
    }
  }

  // From the PR table: select the exercise and scroll up to its chart
  async function showExercise(pr) {
    await loadSeries({ id: pr.exercise_id, name: pr.exercise_name })
    chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Progress</h1>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Workouts" value={summary.workouts} />
          <StatCard label="Total sets" value={summary.total_sets} />
          <StatCard label="Total volume" value={`${summary.total_volume_lbs.toLocaleString()} lbs`} />
        </div>
      )}

      <div className="mb-6" ref={chartRef}>
        <label className="block text-sm text-muted mb-1">Exercise progression (heaviest set per day)</label>
        <input
          type="text"
          placeholder="Search your exercises…"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected('') }}
          className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent mb-2"
        />

        {exercises.length === 0 ? (
          <p className="text-muted text-sm mb-4">Log some sets to see your exercises here.</p>
        ) : (
          <div className="max-h-40 overflow-y-auto mb-4 space-y-1">
            {filteredExercises.length === 0 && (
              <p className="text-muted text-sm px-1">No logged exercises match "{search}".</p>
            )}
            {filteredExercises.map(ex => (
              <button
                key={ex.id}
                onClick={() => loadSeries(ex)}
                className={[
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between',
                  selected === ex.id ? 'bg-surface-2 text-white' : 'text-muted hover:text-white hover:bg-surface-2'
                ].join(' ')}
              >
                <span>{ex.name}</span>
                <span className="text-xs text-muted">{ex.primary_muscle}</span>
              </button>
            ))}
          </div>
        )}

        {selected && series.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3550" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#131c31', border: '1px solid #2a3550', borderRadius: 8 }} />
                <Line type="monotone" dataKey="best_weight" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Top weight" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {selected && series.length === 0 && (
          <p className="text-muted text-sm">No logged sets for this exercise yet.</p>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-white mb-1">Personal records</h2>
        {prs.length > 0 && <p className="text-xs text-muted mb-2">Tap a row to see its progression.</p>}
        {prs.length === 0 ? (
          <p className="text-muted text-sm">Log some sets to start tracking PRs.</p>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-left border-b border-border">
                  <th className="px-4 py-2 font-medium">Exercise</th>
                  <th className="px-4 py-2 font-medium">Muscle</th>
                  <th className="px-4 py-2 font-medium text-right">Best weight</th>
                </tr>
              </thead>
              <tbody>
                {prs.map(pr => (
                  <tr
                    key={pr.exercise_id}
                    onClick={() => showExercise(pr)}
                    className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-surface-2 transition-colors"
                  >
                    <td className="px-4 py-2 text-white">{pr.exercise_name}</td>
                    <td className="px-4 py-2 text-muted">{pr.primary_muscle}</td>
                    <td className="px-4 py-2 text-right text-white">{pr.best_weight} lbs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
