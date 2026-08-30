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
  // Strip `-- ...` line comments first; some contain semicolons that would otherwise
  // break a naive split. (Safe here: the schema has no string literals with -- or ;.)
  const cleaned = schema.replace(/--[^\n]*/g, '')
  const statements = cleaned.split(';').map((s) => s.trim()).filter(Boolean)
  for (const st of statements) await exec(st)
  console.log(`  ${statements.length} statements applied.`)

  const countRes = await exec('SELECT COUNT(*)::int AS c FROM exercises', [], 'JSON')
  const count = JSON.parse(countRes.formattedRecords)[0].c
  const strOrNull = (v) => (v == null ? { isNull: true } : { stringValue: v })

  if (count > 0) {
    console.log(`Exercises already seeded (${count}); skipping insert.`)
  } else {
    console.log('Seeding exercises…')
    for (const ex of exercises) {
      await exec(
        `INSERT INTO exercises (name, equipment, primary_muscle, is_compound, is_custom, description, cues, secondary_muscles)
         VALUES (:name, :equipment, :muscle, :comp, FALSE, :description, :cues, :secondary)`,
        [
          { name: 'name', value: { stringValue: ex.name } },
          { name: 'equipment', value: { stringValue: ex.equipment } },
          { name: 'muscle', value: { stringValue: ex.primaryMuscle } },
          { name: 'comp', value: { booleanValue: ex.isCompound } },
          { name: 'description', value: strOrNull(ex.description) },
          { name: 'cues', value: strOrNull(ex.cues) },
          { name: 'secondary', value: strOrNull(ex.secondaryMuscles) },
        ]
      )
    }
    console.log(`  Seeded ${exercises.length} exercises.`)
  }

  // Backfill description/cues/secondary_muscles onto rows that predate these columns
  // (e.g. exercises seeded before this migration). Idempotent — only touches rows
  // still missing content, never custom exercises (name match only hits library rows).
  console.log('Backfilling description/cues/secondary_muscles…')
  let backfilled = 0
  for (const ex of exercises) {
    const res = await exec(
      `UPDATE exercises SET description = :description, cues = :cues, secondary_muscles = :secondary
       WHERE name = :name AND is_custom = FALSE AND description IS NULL`,
      [
        { name: 'description', value: strOrNull(ex.description) },
        { name: 'cues', value: strOrNull(ex.cues) },
        { name: 'secondary', value: strOrNull(ex.secondaryMuscles) },
        { name: 'name', value: { stringValue: ex.name } },
      ]
    )
    backfilled += res.numberOfRecordsUpdated ?? 0
  }
  console.log(`  Backfilled ${backfilled} rows.`)

  console.log('Done.')
}

main().catch((err) => { console.error(err); process.exit(1) })
