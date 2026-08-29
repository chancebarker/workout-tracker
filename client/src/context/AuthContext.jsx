import { createContext, useContext, useEffect, useState } from 'react'
import * as auth from '../auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [email, setEmail] = useState(null)
  const [ready, setReady] = useState(false)

  // On load, see if there's already a valid session.
  useEffect(() => {
    auth.getIdToken().then(async (token) => {
      if (token) setEmail(await auth.currentEmail())
      setReady(true)
    })
  }, [])

  async function signIn(creds) {
    await auth.signIn(creds)
    setEmail(creds.email)
  }

  async function signUp(info) {
    await auth.signUp(info)
    // Cognito's signUp only registers (confirm+signIn happen later); local dev's signUp
    // logs you in immediately, so reflect that in auth state right away.
    if (!auth.requiresConfirmation) setEmail(info.email)
  }

  async function confirm(info) {
    await auth.confirm(info)
  }

  async function signOut() {
    await auth.signOut()
    setEmail(null)
  }

  return (
    <AuthContext.Provider
      value={{
        email, ready, isAuthenticated: !!email,
        signIn, signUp, confirm, signOut,
        requiresConfirmation: auth.requiresConfirmation,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
