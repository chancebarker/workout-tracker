// Facade over the two auth backends (Cognito for production, local JWT for dev) — this is
// what the rest of the app imports, never cognito.js/localAuth.js directly.
//
// This MUST use dynamic import(), not a static import + conditional export. cognito.js
// constructs a CognitoUserPool at module-eval time, and that constructor throws
// synchronously if UserPoolId/ClientId are missing (verified directly in
// amazon-cognito-identity-js). A static `import * as cognito from './cognito'` is hoisted
// and evaluated unconditionally regardless of surrounding logic, so it would still throw
// in local dev even if its exports were never called. import() genuinely defers evaluation
// until awaited.
import { config } from '../config'

const backend = config.authMode === 'cognito' ? import('./cognito') : import('./localAuth')

// Cognito requires a separate emailed-code confirmation step after signUp; local dev's
// signUp logs you in immediately. Consumers (Register.jsx) branch on this instead of
// local auth faking a no-op confirm step.
export const requiresConfirmation = config.authMode === 'cognito'

export const signUp = async (info) => (await backend).signUp(info)
export const confirm = async (info) => (await backend).confirm(info)
export const signIn = async (creds) => (await backend).signIn(creds)
export const signOut = async () => (await backend).signOut()
export const currentEmail = async () => (await backend).currentEmail()
export const getIdToken = async () => (await backend).getIdToken()
