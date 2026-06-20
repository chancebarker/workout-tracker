// Dev tool: generate ~8 weeks of realistic training history for a user so we can
// exercise the calendar, "last time" reference, progress charts, and metrics
// without needing a second real account.
//
//   node src/db/seedHistory.js [email]
//
// Defaults to chance@test.com. Wipes that user's existing workouts and metrics
// first so it is safe to re-run.

import db from './database.js'

const email = process.argv[2] || 'chance@test.com'
const WEEKS = 8

function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
if (!user) {
  console.error(`No user with email ${email}. Register them first, then re-run.`)
  process.exit(1)
}
const userId = user.id

// A simple Push / Pull / Legs split. base = starting weight, inc = added per week.
// weight: null means bodyweight (reps only).
const SPLIT = {
  1: { name: 'Push Day', exercises: [
    { name: 'Bench press', base: 135, inc: 5, sets: 3, reps: 8 },
    { name: 'Overhead press', base: 75, inc: 2.5, sets: 3, reps: 8 },
    { name: 'Incline DB press', base: 50, inc: 2.5, sets: 3, reps: 10 },
    { name: 'Overhead tricep extension', base: 30, inc: 2.5, sets: 3, reps: 12 },
  ]},
  3: { name: 'Pull Day', exercises: [
    { name: 'Deadlift', base: 225, inc: 10, sets: 3, reps: 5 },
    { name: 'Barbell row', base: 135, inc: 5, sets: 3, reps: 8 },
    { name: 'Pull-up', base: null, inc: 0, sets: 3, reps: 8 },
    { name: 'DB curl', base: 30, inc: 2.5, sets: 3, reps: 10 },
  ]},
  5: { name: 'Leg Day', exercises: [
    { name: 'Back squat', base: 185, inc: 5, sets: 3, reps: 6 },
    { name: 'Romanian deadlift', base: 135, inc: 5, sets: 3, reps: 8 },
    { name: 'DB lunge', base: 35, inc: 2.5, sets: 3, reps: 10 },
    { name: 'Calf raise', base: 135, inc: 5, sets: 3, reps: 12 },
  ]},
}

const exerciseIdByName = (name) => {
  const row = db.prepare('SELECT id FROM exercises WHERE name = ?').get(name)
  if (!row) throw new Error(`Seed exercise not found: ${name}`)
  return row.id
}

const insertWorkout = db.prepare('INSERT INTO workouts (user_id, date, name) VALUES (?, ?, ?)')
const insertWE = db.prepare('INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (?, ?, ?)')
const insertSet = db.prepare('INSERT INTO sets (workout_exercise_id, set_number, weight, reps, rpe) VALUES (?, ?, ?, ?, ?)')
const insertMetric = db.prepare('INSERT INTO daily_metrics (user_id, date, metric_type, value) VALUES (?, ?, ?, ?)')

const run = db.transaction(() => {
  // Clear prior generated data for this user
  db.prepare('DELETE FROM daily_metrics WHERE user_id = ?').run(userId)
  db.prepare(`
    DELETE FROM workouts WHERE user_id = ?
  `).run(userId) // cascades to workout_exercises + sets

  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - WEEKS * 7)

  let workoutCount = 0

  for (let offset = 0; offset <= WEEKS * 7; offset++) {
    const date = new Date(start)
    date.setDate(start.getDate() + offset)
    const weekIndex = Math.floor(offset / 7)
    const dow = date.getDay() // 0 Sun .. 6 Sat
    const ymd = toYMD(date)

    // --- daily metrics every day (with gentle trends + noise) ---
    const bw = 185 - weekIndex * 0.5 + (Math.random() - 0.5) // slow recomp downward
    insertMetric.run(userId, ymd, 'bodyweight', Math.round(bw * 10) / 10)
    insertMetric.run(userId, ymd, 'sleep', Math.round((6.5 + Math.random() * 1.8) * 10) / 10)
    insertMetric.run(userId, ymd, 'steps', Math.round(5000 + Math.random() * 7000))

    // --- workouts on Mon/Wed/Fri ---
    const plan = SPLIT[dow]
    if (!plan) continue

    const { lastInsertRowid: workoutId } = insertWorkout.run(userId, ymd, plan.name)
    workoutCount++

    plan.exercises.forEach((ex, i) => {
      const { lastInsertRowid: weId } = insertWE.run(workoutId, exerciseIdByName(ex.name), i)
      for (let s = 1; s <= ex.sets; s++) {
        const weight = ex.base === null ? null : ex.base + ex.inc * weekIndex
        // last set tends to drop a rep; rpe climbs across the sets
        const reps = ex.reps - (s === ex.sets ? Math.round(Math.random()) : 0)
        const rpe = Math.min(10, 7 + s - 1)
        insertSet.run(weId, s, weight, reps, rpe)
      }
    })
  }

  return workoutCount
})

const count = run()
console.log(`Seeded ${count} workouts + ${WEEKS * 7 + 1} days of metrics for ${email}.`)
process.exit(0)
