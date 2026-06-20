import { config } from '../config'
import { getIdToken } from '../auth/cognito'

const BASE_URL = config.apiBase

async function request(path, options = {}) {
  const token = await getIdToken()

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })

  // 204 No Content has no body to parse
  if (res.status === 204) return null

  const data = await res.json()

  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : 'Request failed'
    throw new Error(message)
  }

  return data
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  // Exercises
  getExercises: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/exercises${query ? '?' + query : ''}`)
  },
  createExercise: (body) => request('/exercises', { method: 'POST', body: JSON.stringify(body) }),

  // Workouts
  getWorkouts: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/workouts${query ? '?' + query : ''}`)
  },
  getWorkout: (id) => request(`/workouts/${id}`),
  getWorkoutPrevious: (id) => request(`/workouts/${id}/previous`),
  createWorkout: (body) => request('/workouts', { method: 'POST', body: JSON.stringify(body) }),
  updateWorkout: (id, body) => request(`/workouts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteWorkout: (id) => request(`/workouts/${id}`, { method: 'DELETE' }),

  // Workout exercises + sets
  addExercise: (workoutId, exerciseId) =>
    request(`/workouts/${workoutId}/exercises`, { method: 'POST', body: JSON.stringify({ exercise_id: exerciseId }) }),
  removeExercise: (workoutId, weId) =>
    request(`/workouts/${workoutId}/exercises/${weId}`, { method: 'DELETE' }),
  addSet: (workoutId, weId) =>
    request(`/workouts/${workoutId}/exercises/${weId}/sets`, { method: 'POST' }),
  updateSet: (workoutId, weId, setId, body) =>
    request(`/workouts/${workoutId}/exercises/${weId}/sets/${setId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSet: (workoutId, weId, setId) =>
    request(`/workouts/${workoutId}/exercises/${weId}/sets/${setId}`, { method: 'DELETE' }),

  // Metrics
  logMetric: (body) => request('/metrics', { method: 'POST', body: JSON.stringify(body) }),
  getMetricTypes: () => request('/metrics/types'),
  getMetricSeries: (type, params = {}) => {
    const query = new URLSearchParams({ type, ...params }).toString()
    return request(`/metrics?${query}`)
  },
  deleteMetric: (id) => request(`/metrics/${id}`, { method: 'DELETE' }),

  // Progress
  getSummary: () => request('/progress/summary'),
  getExerciseProgress: (exerciseId) => request(`/progress/exercise/${exerciseId}`),
  getPRs: () => request('/progress/prs'),
}
