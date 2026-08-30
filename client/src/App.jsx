import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import CalendarPage from './pages/CalendarPage'
import WorkoutPage from './pages/WorkoutPage'
import ScanPage from './pages/ScanPage'
import ExercisesPage from './pages/ExercisesPage'
import MetricsPage from './pages/MetricsPage'
import ProgressPage from './pages/ProgressPage'

function Loading() {
  return <div className="min-h-full flex items-center justify-center text-muted">Loading…</div>
}

function PrivateRoute({ children }) {
  const { isAuthenticated, ready } = useAuth()
  if (!ready) return <Loading />
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { isAuthenticated, ready } = useAuth()
  if (!ready) return <Loading />
  return isAuthenticated ? <Navigate to="/" /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
      <Route path="/workout/:id" element={<PrivateRoute><WorkoutPage /></PrivateRoute>} />
      <Route path="/scan" element={<PrivateRoute><ScanPage /></PrivateRoute>} />
      <Route path="/exercises" element={<PrivateRoute><ExercisesPage /></PrivateRoute>} />
      <Route path="/metrics" element={<PrivateRoute><MetricsPage /></PrivateRoute>} />
      <Route path="/progress" element={<PrivateRoute><ProgressPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
