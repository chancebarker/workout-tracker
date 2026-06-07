import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function Exercises() {
  const [exercises, setExercises] = useState([])
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getExercises(category ? { category } : {})
        setExercises(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [category])

  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Exercise Library</h1>
        <Link to="/dashboard">← Dashboard</Link>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: 8 }}>
          <option value="">All categories</option>
          <option value="barbell">Barbell</option>
          <option value="dumbbell">Dumbbell</option>
          <option value="bodyweight">Bodyweight</option>
          <option value="cable">Cable</option>
          <option value="machine">Machine</option>
        </select>
      </div>

      {filtered.map(exercise => (
        <div key={exercise.id} style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>{exercise.name}</h3>
            <span style={{ fontSize: 12, background: '#f0f0f0', padding: '2px 8px', borderRadius: 12 }}>
              {exercise.category}
            </span>
          </div>
          <p style={{ color: '#666', margin: '8px 0' }}>{exercise.description}</p>
          <div style={{ fontSize: 13, color: '#888' }}>
            {exercise.muscles && exercise.muscles
              .filter(m => m.primary)
              .map(m => m.name)
              .join(', ')}
          </div>
          {exercise.instructions && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', color: '#555' }}>How to perform</summary>
              <p style={{ marginTop: 8, fontSize: 14 }}>{exercise.instructions}</p>
            </details>
          )}
        </div>
      ))}
    </div>
  )
}
