// Thin wrapper around amazon-cognito-identity-js for the user-pool auth flows we need:
// sign up, confirm (emailed code), sign in, sign out, and fetching a fresh ID token.
//
// We send the **ID token** to the API because the API Gateway Cognito JWT authorizer
// validates the `aud` claim against the app client — ID tokens carry `aud`, access tokens
// don't. The token's `sub` claim (stable user id) is what the backend scopes data to.

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js'
import { config } from '../config'

const pool = new CognitoUserPool({
  UserPoolId: config.userPoolId,
  ClientId: config.clientId,
})

function userFor(email) {
  return new CognitoUser({ Username: email, Pool: pool })
}

export function signUp({ email, password, name }) {
  return new Promise((resolve, reject) => {
    const attrs = [new CognitoUserAttribute({ Name: 'email', Value: email })]
    if (name) attrs.push(new CognitoUserAttribute({ Name: 'name', Value: name }))
    pool.signUp(email, password, attrs, null, (err) => (err ? reject(err) : resolve()))
  })
}

export function confirm({ email, code }) {
  return new Promise((resolve, reject) => {
    userFor(email).confirmRegistration(code, true, (err) => (err ? reject(err) : resolve()))
  })
}

export function signIn({ email, password }) {
  return new Promise((resolve, reject) => {
    userFor(email).authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess: () => resolve(),
        onFailure: (err) => reject(err),
        // If the pool ever requires a new password / MFA, surface a clear error.
        newPasswordRequired: () => reject(new Error('A new password is required for this account.')),
      }
    )
  })
}

export function signOut() {
  pool.getCurrentUser()?.signOut()
}

export function currentEmail() {
  return pool.getCurrentUser()?.getUsername() ?? null
}

/** Resolve a valid ID token, or null if not signed in. Auto-refreshes via the SDK. */
export function getIdToken() {
  return new Promise((resolve) => {
    const user = pool.getCurrentUser()
    if (!user) return resolve(null)
    user.getSession((err, session) => {
      if (err || !session || !session.isValid()) return resolve(null)
      resolve(session.getIdToken().getJwtToken())
    })
  })
}
