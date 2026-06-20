// One-shot database initializer: applies schema.sql and seeds the exercise library to
// Aurora via the RDS Data API. Run locally after `cdk deploy`, with the cluster + secret
// ARNs from the stack outputs:
//
//   CLUSTER_ARN=... SECRET_ARN=... DB_NAME=workout node scripts/db-init.mjs
//
// Safe to re-run: schema uses IF NOT EXISTS and seeding is skipped if exercises exist.
// (On a scaled-to-zero Aurora the first call resumes the cluster; we retry while it wakes.)

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data'
import { exercises } from '../lambda/api/seed-exercises.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { CLUSTER_ARN, SECRET_ARN } = process.env
const DB_NAME = process.env.DB_NAME || 'workout'

if (!CLUSTER_ARN || !SECRET_ARN) {
  console.error('Set CLUSTER_ARN and SECRET_ARN (from `cdk deploy` outputs) before running.')
  process.exit(1)
}

const client = new RDSDataClient({})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function exec(sql, parameters = [], format) {
  // Retry while a scaled-to-zero cluster resumes (first call after idle).
  for (let attempt = 1; ; attempt++) {
    try {
      return await client.send(new ExecuteStatementCommand({
        resourceArn: CLUSTER_ARN, secretArn: SECRET_ARN, database: DB_NAME,
        sql, parameters, formatRecordsAs: format,
      }))
    } catch (err) {
      const resuming = /resum|not currently available|DatabaseResumingException/i.test(String(err?.name) + String(err?.message))
      if (resuming && attempt <= 12) {
        process.stdout.write('  (cluster resuming, retrying…)\n')
        await sleep(5000)
        continue
      }
      throw err
    }
  }
}

async function main() {
  console.log('Applying schema…')
  const schema = readFileSync(join(__dirname, '..', 'lambda', 'api', 'schema.sql'), 'utf8')
  const statements = schema.split(';').map((s) => s.trim()).filter(Boolean)
  for (const st of statements) await exec(st)
  console.log(`  ${statements.length} statements applied.`)

  const countRes = await exec('SELECT COUNT(*)::int AS c FROM exercises', [], 'JSON')
  const count = JSON.parse(countRes.formattedRecords)[0].c
  if (count > 0) {
    console.log(`Exercises already seeded (${count}); skipping.`)
  } else {
    console.log('Seeding exercises…')
    for (const ex of exercises) {
      await exec(
        `INSERT INTO exercises (name, equipment, primary_muscle, is_compound, is_custom)
         VALUES (:name, :equipment, :muscle, :comp, FALSE)`,
        [
          { name: 'name', value: { stringValue: ex.name } },
          { name: 'equipment', value: { stringValue: ex.equipment } },
          { name: 'muscle', value: { stringValue: ex.primaryMuscle } },
          { name: 'comp', value: { booleanValue: ex.isCompound } },
        ]
      )
    }
    console.log(`  Seeded ${exercises.length} exercises.`)
  }
  console.log('Done.')
}

main().catch((err) => { console.error(err); process.exit(1) })
