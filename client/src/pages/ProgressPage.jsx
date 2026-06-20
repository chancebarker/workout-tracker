import { useEffect, useState } from 'react'
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
  const [selected, setSelected] = useState('')
  const [series, setSeries] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [s, p, ex] = await Promise.all([api.getSummary(), api.getPRs(), api.getExercises()])
        setSummary(s); setPRs(p); setExercises(ex)
      } catch (err) {
        setError(err.message)
      }
    }
    load()
  }, [])

  async function loadSeries(exerciseId) {
    setSelected(exerciseId)
    if (!exerciseId) { setSeries([]); return }
    try {
      const data = await api.getExerciseProgress(exerciseId)
      setSeries(data.data_points)
    } catch (err) {
      setError(err.message)
    }
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

      <div className="mb-6">
        <label className="block text-sm text-muted mb-1">Exercise progression (heaviest set per day)</label>
        <select
          value={selected}
          onChange={e => loadSeries(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent mb-4"
        >
          <option value="">Select an exercise…</option>
          {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>

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
        <h2 className="font-semibold text-white mb-2">Personal records</h2>
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
                  <tr key={pr.exercise_id} className="border-b border-border/50 last:border-0">
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
