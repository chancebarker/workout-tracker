import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function navClass({ isActive }) {
  return [
    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    isActive ? 'bg-surface-2 text-white' : 'text-muted hover:text-white hover:bg-surface-2'
  ].join(' ')
}

export default function Layout({ children }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <NavLink to="/" end className="text-white font-semibold mr-4 hover:text-accent transition-colors">
              🏋️ Tracker
            </NavLink>
            <NavLink to="/exercises" className={navClass}>Exercises</NavLink>
            <NavLink to="/metrics" className={navClass}>Metrics</NavLink>
            <NavLink to="/progress" className={navClass}>Progress</NavLink>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-muted hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
