// Postgres access via the RDS Data API.
//
// Why the Data API: no persistent DB connections to manage and no VPC attachment for the
// Lambda (keeps the no-NAT, zero-idle-networking design). We expose a small `query()` that
// takes named `:params` and a plain object, so route handlers read almost like the local
// SQLite code did.

import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data'

const client = new RDSDataClient({})
const { CLUSTER_ARN, SECRET_ARN, DB_NAME } = process.env

// Convert a JS value into a Data API parameter descriptor.
function toParam(name, value) {
  if (value === null || value === undefined) return { name, value: { isNull: true } }
  if (typeof value === 'boolean') return { name, value: { booleanValue: value } }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { name, value: { longValue: value } }
      : { name, value: { doubleValue: value } }
  }
  return { name, value: { stringValue: String(value) } }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Run a parameterized SQL statement.
 * @param {string} sql   SQL with named placeholders, e.g. 'SELECT * FROM t WHERE id = :id'
 * @param {object} params e.g. { id: 5 }
 * @returns {Promise<object[]>} rows as plain objects (column name -> value)
 *
 * Aurora Serverless v2 is configured to scale to zero, so after an idle period the first
 * query triggers a resume and the Data API throws DatabaseResumingException. We retry with
 * a short backoff (kept under the API Gateway 30s integration timeout) so that first hit
 * transparently waits out the resume instead of failing. Warm calls return immediately.
 */
export async function query(sql, params = {}) {
  const parameters = Object.entries(params).map(([k, v]) => toParam(k, v))
  for (let attempt = 1; ; attempt++) {
    try {
      const out = await client.send(
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
    } catch (err) {
      const resuming =
        err?.name === 'DatabaseResumingException' || /resuming/i.test(String(err?.message))
      if (resuming && attempt <= 6) {
        await sleep(3000)
        continue
      }
      throw err
    }
  }
}

/** Convenience for INSERT ... RETURNING id — returns the new id. */
export async function insertReturningId(sql, params = {}) {
  const rows = await query(sql, params)
  return rows[0]?.id
}
