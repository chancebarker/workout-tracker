// Local-dev auth, backed directly by the local Express backend's own JWT auth
// (src/routes/auth.js) instead of Cognito. Only used when VITE_COGNITO_USER_POOL_ID /
// VITE_COGNITO_CLIENT_ID aren't set — see client/src/config.js and client/src/auth/index.js.
//
// Talks to the backend directly with a plain fetch rather than going through
// api/client.js's request() helper, to avoid an import cycle (client.js itself imports
// getIdToken from auth/index.js, which would import this file).

import { config } from '../config'

const TOKEN_KEY = 'wt.localAuth.token'
const EMAIL_KEY = 'wt.localAuth.email'

async function post(path, body) {
  const res = await fetch(`${config.apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : 'Request failed'
    throw new Error(message)
  }
  return data
}

// Local register logs you in immediately — no email verification step, unlike Cognito.
export async function signUp({ email, password, name }) {
  const { token } = await post('/auth/register', { email, password, name })
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EMAIL_KEY, email)
}

export async function signIn({ email, password }) {
  const { token } = await post('/auth/login', { email, password })
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EMAIL_KEY, email)
}

export async function signOut() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EMAIL_KEY)
}

export async function currentEmail() {
  return localStorage.getItem(EMAIL_KEY)
}

export async function getIdToken() {
  return localStorage.getItem(TOKEN_KEY)
}
