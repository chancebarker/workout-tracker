// Seed a demo user with ~8 weeks of realistic training + daily metrics, so the deployed
// app looks alive for a walkthrough. Keyed to a Cognito subject (sub) via the Data API.
//
//   CLUSTER_ARN=.. SECRET_ARN=.. DB_NAME=workout DEMO_SUB=<cognito-sub> node scripts/seed-demo.mjs
//
// Safe to re-run: clears the demo user's existing workouts/metrics first.

import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data'

const { CLUSTER_ARN, SECRET_ARN, DEMO_SUB } = process.env
const DB_NAME = process.env.DB_NAME || 'workout'
if (!CLUSTER_ARN || !SECRET_ARN || !DEMO_SUB) {
  console.error('Set CLUSTER_ARN, SECRET_ARN, and DEMO_SUB.')
  process.exit(1)
}

const client = new RDSDataClient({})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function toParam(name, value) {
  if (value === null || value === undefined) return { name, value: { isNull: true } }
  if (typeof value === 'boolean') return { name, value: { booleanValue: value } }
  if (typeof value === 'number')
    return Number.isInteger(value) ? { name, value: { longValue: value } } : { name, value: { doubleValue: value } }
  return { name, value: { stringValue: String(value) } }
}

async function q(sql, params = {}) {
  const parameters = Object.entries(params).map(([k, v]) => toParam(k, v))
  for (let attempt = 1; ; attempt++) {
    try {
      const out = await client.send(new ExecuteStatementCommand({
        resourceArn: CLUSTER_ARN, secretArn: SECRET_ARN, database: DB_NAME, sql, parameters, formatRecordsAs: 'JSON',
      }))
      return out.formattedRecords ? JSON.parse(out.formattedRecords) : []
    } catch (err) {
      if (/resum/i.test(String(err?.name) + String(err?.message)) && attempt <= 12) { await sleep(5000); continue }
      throw err
    }
  }
}

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Push / Pull / Legs on Mon / Wed / Fri. base = starting weight, inc = added per week.
const SPLIT = {
  1: { name: 'Push Day', exercises: [
    { name: 'Bench press', base: 135, inc: 5, reps: 8 },
    { name: 'Overhead press', base: 75, inc: 2.5, reps: 8 },
    { name: 'Incline DB press', base: 50, inc: 2.5, reps: 10 },
    { name: 'Overhead tricep extension', base: 30, inc: 2.5, reps: 12 },
  ]},
  3: { name: 'Pull Day', exercises: [
    { name: 'Deadlift', base: 225, inc: 10, reps: 5 },
    { name: 'Barbell row', base: 135, inc: 5, reps: 8 },
    { name: 'Pull-up', base: null, inc: 0, reps: 8 },
    { name: 'DB curl', base: 30, inc: 2.5, reps: 10 },
  ]},
  5: { name: 'Leg Day', exercises: [
    { name: 'Back squat', base: 185, inc: 5, reps: 6 },
    { name: 'Romanian deadlift', base: 135, inc: 5, reps: 8 },
    { name: 'DB lunge', base: 35, inc: 2.5, reps: 10 },
    { name: 'Calf raise', base: 135, inc: 5, reps: 12 },
  ]},
}
const WEEKS = 8

async function main() {
  console.log('Clearing existing demo data…')
  await q('DELETE FROM workouts WHERE user_sub = :sub', { sub: DEMO_SUB })
  await q('DELETE FROM daily_metrics WHERE user_sub = :sub', { sub: DEMO_SUB })

  const exRows = await q('SELECT id, name FROM exercises')
  const idByName = Object.fromEntries(exRows.map((r) => [r.name, r.id]))

  const today = new Date()
  const start = new Date(today); start.setDate(start.getDate() - WEEKS * 7)
  let workouts = 0

  for (let offset = 0; offset <= WEEKS * 7; offset++) {
    const date = new Date(start); date.setDate(start.getDate() + offset)
    const ymd = toYMD(date)
    const week = Math.floor(offset / 7)

    // daily metrics every day
    await q('INSERT INTO daily_metrics (user_sub, date, metric_type, value) VALUES (:s,:d::date,:t,:v)',
      { s: DEMO_SUB, d: ymd, t: 'bodyweight', v: Math.round((185 - week * 0.5 + (Math.random() - 0.5)) * 10) / 10 })
    await q('INSERT INTO daily_metrics (user_sub, date, metric_type, value) VALUES (:s,:d::date,:t,:v)',
      { s: DEMO_SUB, d: ymd, t: 'sleep', v: Math.round((6.5 + Math.random() * 1.8) * 10) / 10 })
    await q('INSERT INTO daily_metrics (user_sub, date, metric_type, value) VALUES (:s,:d::date,:t,:v)',
      { s: DEMO_SUB, d: ymd, t: 'steps', v: Math.round(5000 + Math.random() * 7000) })

    const plan = SPLIT[date.getDay()]
    if (!plan) continue

    const [{ id: workoutId }] = await q(
      'INSERT INTO workouts (user_sub, date, name) VALUES (:s,:d::date,:n) RETURNING id',
      { s: DEMO_SUB, d: ymd, n: plan.name })
    workouts++

    for (let i = 0; i < plan.exercises.length; i++) {
      const ex = plan.exercises[i]
      const exId = idByName[ex.name]
      if (!exId) continue
      const [{ id: weId }] = await q(
        'INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (:w,:e,:o) RETURNING id',
        { w: workoutId, e: exId, o: i })
      for (let s = 1; s <= 3; s++) {
        const weight = ex.base === null ? null : ex.base + ex.inc * week
        const reps = ex.reps - (s === 3 ? Math.round(Math.random()) : 0)
        await q('INSERT INTO sets (workout_exercise_id, set_number, weight, reps, rpe) VALUES (:we,:n,:w,:r,:rpe)',
          { we: weId, n: s, w: weight, r: reps, rpe: Math.min(10, 6 + s) })
      }
    }
  }
  console.log(`Seeded ${workouts} workouts + ${WEEKS * 7 + 1} days of metrics for sub ${DEMO_SUB}.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
