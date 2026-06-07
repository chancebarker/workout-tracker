import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { token } = await api.login({ email, password })
      login(token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: '0 20px' }}>
      <h1>Workout Tracker</h1>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label><br />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label><br />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p>Don't have an account? <Link to="/register">Register</Link></p>
    </div>
  )
}
