import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [step, setStep] = useState('form') // 'form' | 'confirm'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signUp, confirm, signIn, requiresConfirmation } = useAuth()
  const navigate = useNavigate()

  async function handleSignUp(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signUp({ email, password, name })
      if (requiresConfirmation) {
        setStep('confirm') // Cognito emails a verification code
      } else {
        navigate('/') // local dev: register already logs you in
      }
    } catch (err) {
      setError(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await confirm({ email, code })
      await signIn({ email, password }) // auto sign-in after confirmation
      navigate('/')
    } catch (err) {
      setError(err.message || 'Confirmation failed')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-white focus:outline-none focus:border-accent'

  return (
    <div className="min-h-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center mb-1">🏋️ Tracker</h1>
        <p className="text-muted text-center mb-8">
          {step === 'form' ? 'Create your training log' : 'Check your email for a code'}
        </p>

        {step === 'form' ? (
          <form onSubmit={handleSignUp} className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className={inputClass} />
              <p className="text-xs text-muted mt-1">8+ chars with upper, lower, number &amp; symbol</p>
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Verification code</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} required className={inputClass} placeholder="6-digit code" />
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50">
              {loading ? 'Confirming…' : 'Confirm & sign in'}
            </button>
          </form>
        )}

        <p className="text-center text-muted text-sm mt-4">
          Already have an account? <Link to="/login" className="text-accent hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
