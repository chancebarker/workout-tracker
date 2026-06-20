// API Lambda — the existing Express app, adapted for Lambda.
//
// Two adaptations vs the local app:
//   1) Runtime: wrap the Express `app` with @codegenie/serverless-express instead of
//      calling app.listen(). (Mangum is the Python/ASGI equivalent — not used here.)
//   2) Data layer: query Postgres through the RDS Data API instead of better-sqlite3.
//      The Data API means no DB connection management and no VPC attachment — Lambda
//      talks to Aurora over an AWS service endpoint using IAM + the secret.
//
// In the real migration, the existing routers (auth/workouts/metrics/progress) mount on
// this same `app`; only their data-access calls change from `db.prepare(...)` to the
// async `query(...)` helper below. A couple of representative routes are shown.

import serverlessExpress, { getCurrentInvoke } from '@codegenie/serverless-express'
import express from 'express'
import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data'

const rds = new RDSDataClient({})
const { CLUSTER_ARN, SECRET_ARN, DB_NAME } = process.env

/** Run a parameterized SQL statement via the Data API and return rows as objects. */
async function query(sql, parameters = []) {
  const out = await rds.send(
    new ExecuteStatementCommand({
      resourceArn: CLUSTER_ARN,
      secretArn: SECRET_ARN,
      database: DB_NAME,
      sql,
      parameters,
      formatRecordsAs: 'JSON',
    })
  )
  return out.formattedRecords ? JSON.parse(out.formattedRecords) : []
}

/** Cognito user id (sub) from the API Gateway JWT authorizer claims. */
function currentUserSub() {
  const { event } = getCurrentInvoke()
  return event?.requestContext?.authorizer?.jwt?.claims?.sub ?? null
}

const app = express()
app.use(express.json())

// Public health check (the HTTP API exposes /health without the authorizer).
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Representative protected route: list the caller's workouts.
// Note: in the cloud model the row owner is the Cognito `sub`, not a local users.id.
app.get('/workouts', async (_req, res) => {
  try {
    const rows = await query(
      'SELECT id, date, name FROM workouts WHERE user_sub = :sub ORDER BY date DESC',
      [{ name: 'sub', value: { stringValue: currentUserSub() ?? '' } }]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'query failed' })
  }
})

// ... the remaining routers (auth profile, workout exercises/sets, metrics, progress)
// mount here unchanged except for swapping their data layer to query().

export const handler = serverlessExpress({ app })
