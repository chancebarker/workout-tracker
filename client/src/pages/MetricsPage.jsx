import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'
import { toYMD } from '../utils/date'

// A few sensible starting suggestions; users can type anything.
const SUGGESTED = ['bodyweight', 'steps', 'sleep', 'calories', 'resting hr']

export default function MetricsPage() {
  const [types, setTypes] = useState([])
  const [form, setForm] = useState({ date: toYMD(new Date()), metric_type: '', value: '' })
  const [viewType, setViewType] = useState('')
  const [series, setSeries] = useState([])
  const [error, setError] = useState(null)

  async function loadTypes() {
    try {
      setTypes(await api.getMetricTypes())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { loadTypes() }, [])

  async function loadSeries(type) {
    setViewType(type)
    if (!type) { setSeries([]); return }
    try {
      const data = await api.getMetricSeries(type)
      setSeries(data.data_points)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleLog(e) {
    e.preventDefault()
    setError(null)
    try {
      await api.logMetric({
        date: form.date,
        metric_type: form.metric_type.trim().toLowerCase(),
        value: parseFloat(form.value)
      })
      setForm({ ...form, value: '' })
      await loadTypes()
      if (viewType === form.metric_type.trim().toLowerCase()) await loadSeries(viewType)
    } catch (err) {
      setError(err.message)
    }
  }

  const allTypeOptions = Array.from(new Set([...SUGGESTED, ...types]))

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Metrics</h1>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Log form */}
        <form onSubmit={handleLog} className="bg-surface border border-border rounded-xl p-5 space-y-3 h-fit">
          <h2 className="font-semibold text-white">Log a metric</h2>
          <div>
            <label className="block text-sm text-muted mb-1">Date</label>
            <input
              type="date" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Metric</label>
            <input
              list="metric-types" placeholder="bodyweight, sleep, steps…"
              value={form.metric_type}
              onChange={e => setForm({ ...form, metric_type: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
            />
            <datalist id="metric-types">
              {allTypeOptions.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Value</label>
            <input
              type="number" step="any" value={form.value}
              onChange={e => setForm({ ...form, value: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <button className="w-full py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium">
            Save
          </button>
          <p className="text-xs text-muted">Re-logging the same metric on the same day updates it.</p>
        </form>

        {/* View series */}
        <div>
          <label className="block text-sm text-muted mb-1">View trend</label>
          <select
            value={viewType}
            onChange={e => loadSeries(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-accent mb-4"
          >
            <option value="">Select a metric…</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {viewType && series.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3550" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ background: '#131c31', border: '1px solid #2a3550', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name={viewType} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {viewType && series.length === 0 && (
            <p className="text-muted text-sm">No data for {viewType} yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
