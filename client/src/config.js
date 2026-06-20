// Runtime configuration, injected at build time via Vite env vars. After `cdk deploy`,
// build the SPA with the stack outputs, e.g.:
//
//   VITE_COGNITO_USER_POOL_ID=us-east-1_xxxx \
//   VITE_COGNITO_CLIENT_ID=xxxx \
//   VITE_API_BASE=/api \
//   npm run build
//
// /api is same-origin in production (CloudFront proxies it to the HTTP API), so there's
// no CORS and no hardcoded API hostname.
export const config = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  apiBase: import.meta.env.VITE_API_BASE || '/api',
}
