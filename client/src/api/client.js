const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong')
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
  getExercise: (id) => request(`/exercises/${id}`),
  createExercise: (body) => request('/exercises', { method: 'POST', body: JSON.stringify(body) }),

  // Rep Max
  submitRepMax: (exerciseId, body) => request(`/repmax/${exerciseId}`, { method: 'POST', body: JSON.stringify(body) }),
  getRepMaxHistory: (exerciseId) => request(`/repmax/${exerciseId}`),
  getAllRepMaxes: () => request('/repmax'),

  // Programs
  getPrograms: () => request('/programs'),
  getProgram: (id) => request(`/programs/${id}`),
  enrollInProgram: (id) => request(`/programs/enroll/${id}`, { method: 'POST' }),
  getActiveProgram: () => request('/programs/me/active'),

  // Sessions
  startSession: () => request('/sessions', { method: 'POST' }),
  logSet: (sessionId, body) => request(`/sessions/${sessionId}/sets`, { method: 'POST', body: JSON.stringify(body) }),
  completeSession: (sessionId) => request(`/sessions/${sessionId}/complete`, { method: 'PATCH' }),
  getSession: (sessionId) => request(`/sessions/${sessionId}`),
  getSessions: () => request('/sessions'),

  // Progress
  getExerciseProgress: (exerciseId) => request(`/progress/exercise/${exerciseId}`),
  getPRs: () => request('/progress/prs'),
  getSummary: () => request('/progress/summary'),
}
