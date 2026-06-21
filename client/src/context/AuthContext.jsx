import { createContext, useContext, useEffect, useState } from 'react'
import * as cognito from '../auth/cognito'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [email, setEmail] = useState(null)
  const [ready, setReady] = useState(false)

  // On load, see if there's already a valid Cognito session.
  useEffect(() => {
    cognito.getIdToken().then((token) => {
      if (token) setEmail(cognito.currentEmail())
      setReady(true)
    })
  }, [])

  async function signIn(creds) {
    await cognito.signIn(creds)
    setEmail(creds.email)
  }

  async function signUp(info) {
    await cognito.signUp(info)
  }

  async function confirm(info) {
    await cognito.confirm(info)
  }

  function signOut() {
    cognito.signOut()
    setEmail(null)
  }

  return (
    <AuthContext.Provider
      value={{ email, ready, isAuthenticated: !!email, signIn, signUp, confirm, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
