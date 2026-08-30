// Workout Tracker API — cloud build.
//
// Same feature set as the local Express app, with two changes for the serverless target:
//   1) Runtime: wrapped with @codegenie/serverless-express (no app.listen).
//   2) Data: PostgreSQL via the RDS Data API (see db.mjs), not better-sqlite3.
//
// Auth is gone from this layer: Amazon Cognito + the API Gateway JWT authorizer handle it.
// We read the caller's identity from the verified JWT claims (`sub`) and scope every query
// to that user. The only public route is GET /health.

import serverlessExpress, { getCurrentInvoke } from '@codegenie/serverless-express'
import express from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { query, insertReturningId } from './db.mjs'

const app = express()
app.use(express.json({ limit: '8mb' })) // raised from the default ~100kb for base64 photo uploads

/** Cognito subject (stable user id) from the API Gateway JWT authorizer claims. */
function sub() {
  const { event } = getCurrentInvoke()
  return event?.requestContext?.authorizer?.jwt?.claims?.sub ?? null
}

// Small async wrapper so handler errors become clean 500s instead of unhandled rejections.
const h = (fn) => (req, res) => fn(req, res).catch((err) => {
  console.error(err)
  res.status(500).json({ error: 'Internal error' })
})

/* --------------------------------- health --------------------------------- */
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

/* -------------------------------- exercises ------------------------------- */
// Seeded exercises are visible to everyone; custom ones only to their creator.
app.get('/exercises', h(async (req, res) => {
  const { equipment, muscle } = req.query
  let sql = 'SELECT * FROM exercises WHERE (is_custom = FALSE OR created_by_sub = :sub)'
  const params = { sub: sub() }
  if (equipment) { sql += ' AND equipment = :equipment'; params.equipment = equipment }
  if (muscle) {
    // Matches primary_muscle exactly, or muscle as one of the comma-separated
    // secondary_muscles tokens (same padded-LIKE pattern as the local Express route).
    sql += ` AND (primary_muscle = :muscle OR (',' || COALESCE(secondary_muscles, '') || ',') LIKE '%,' || :muscle || ',%')`
    params.muscle = muscle
  }
  sql += ' ORDER BY primary_muscle, name'
  res.json(await query(sql, params))
}))

app.post('/exercises', h(async (req, res) => {
  const { name, equipment, primary_muscle, is_compound } = req.body || {}
  if (!name || !equipment || !primary_muscle) {
    return res.status(400).json({ error: 'name, equipment, primary_muscle are required' })
  }
  const id = await insertReturningId(
    `INSERT INTO exercises (name, equipment, primary_muscle, is_compound, is_custom, created_by_sub)
     VALUES (:name, :equipment, :primary_muscle, :is_compound, TRUE, :sub) RETURNING id`,
    { name, equipment, primary_muscle, is_compound: !!is_compound, sub: sub() }
  )
  const [row] = await query('SELECT * FROM exercises WHERE id = :id', { id })
  res.status(201).json(row)
}))

/* --------------------------------- workouts -------------------------------- */
// Route params arrive as strings; integer columns need numeric params or Postgres
// throws "operator does not exist: integer = text". Coerce all id params with Number().
async function ownedWorkout(id, userSub) {
  const [w] = await query('SELECT * FROM workouts WHERE id = :id AND user_sub = :sub', { id: Number(id), sub: userSub })
  return w
}
async function ownedWE(workoutId, weId, userSub) {
  const [we] = await query(
    `SELECT we.* FROM workout_exercises we
     JOIN workouts w ON we.workout_id = w.id
     WHERE we.id = :weId AND we.workout_id = :workoutId AND w.user_sub = :sub`,
    { weId: Number(weId), workoutId: Number(workoutId), sub: userSub }
  )
  return we
}

app.post('/workouts', h(async (req, res) => {
  const { date, name, notes } = req.body || {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' })
  }
  const id = await insertReturningId(
    `INSERT INTO workouts (user_sub, date, name, notes)
     VALUES (:sub, :date::date, :name, :notes) RETURNING id`,
    { sub: sub(), date, name: name ?? null, notes: notes ?? null }
  )
  const [row] = await query('SELECT * FROM workouts WHERE id = :id', { id })
  res.status(201).json(row)
}))

app.get('/workouts', h(async (req, res) => {
  const { from, to } = req.query
  let sql = 'SELECT * FROM workouts WHERE user_sub = :sub'
  const params = { sub: sub() }
  if (from) { sql += ' AND date >= :from::date'; params.from = from }
  if (to) { sql += ' AND date <= :to::date'; params.to = to }
  sql += ' ORDER BY date DESC'
  const workouts = await query(sql, params)

  // Attach exercise + set counts for calendar previews.
  for (const w of workouts) {
    const [{ count: ec }] = await query(
      'SELECT COUNT(*)::int AS count FROM workout_exercises WHERE workout_id = :id', { id: w.id })
    const [{ count: sc }] = await query(
      `SELECT COUNT(*)::int AS count FROM sets s
       JOIN workout_exercises we ON s.workout_exercise_id = we.id
       WHERE we.workout_id = :id`, { id: w.id })
    w.exercise_count = ec
    w.set_count = sc
  }
  res.json(workouts)
}))

app.get('/workouts/:id', h(async (req, res) => {
  const workout = await ownedWorkout(req.params.id, sub())
  if (!workout) return res.status(404).json({ error: 'Workout not found' })

  const exercises = await query(
    `SELECT we.id, we.exercise_id, we.order_index,
            e.name, e.equipment, e.primary_muscle, e.is_compound
     FROM workout_exercises we JOIN exercises e ON we.exercise_id = e.id
     WHERE we.workout_id = :id ORDER BY we.order_index, we.id`,
    { id: workout.id })

  for (const ex of exercises) {
    ex.sets = await query(
      'SELECT id, set_number, weight, reps, rpe FROM sets WHERE workout_exercise_id = :id ORDER BY set_number',
      { id: ex.id })
  }
  res.json({ ...workout, exercises })
}))

app.get('/workouts/:id/previous', h(async (req, res) => {
  const workout = await ownedWorkout(req.params.id, sub())
  if (!workout) return res.status(404).json({ error: 'Workout not found' })

  const ids = await query('SELECT DISTINCT exercise_id FROM workout_exercises WHERE workout_id = :id', { id: workout.id })
  const result = {}
  for (const { exercise_id } of ids) {
    const [prior] = await query(
      `SELECT we.id, w.date FROM workout_exercises we
       JOIN workouts w ON we.workout_id = w.id
       WHERE w.user_sub = :sub AND we.exercise_id = :ex
         AND (w.date < :date::date OR (w.date = :date::date AND w.id < :wid))
       ORDER BY w.date DESC, w.id DESC LIMIT 1`,
      { sub: sub(), ex: exercise_id, date: workout.date, wid: workout.id })
    if (prior) {
      result[exercise_id] = {
        date: prior.date,
        sets: await query('SELECT set_number, weight, reps, rpe FROM sets WHERE workout_exercise_id = :id ORDER BY set_number', { id: prior.id }),
      }
    }
  }
  res.json(result)
}))

app.patch('/workouts/:id', h(async (req, res) => {
  const workout = await ownedWorkout(req.params.id, sub())
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  const next = {
    date: req.body?.date ?? workout.date,
    name: req.body?.name !== undefined ? req.body.name : workout.name,
    notes: req.body?.notes !== undefined ? req.body.notes : workout.notes,
  }
  await query('UPDATE workouts SET date = :date::date, name = :name, notes = :notes WHERE id = :id',
    { ...next, id: workout.id })
  const [row] = await query('SELECT * FROM workouts WHERE id = :id', { id: workout.id })
  res.json(row)
}))

app.delete('/workouts/:id', h(async (req, res) => {
  const workout = await ownedWorkout(req.params.id, sub())
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  await query('DELETE FROM workouts WHERE id = :id', { id: workout.id })
  res.status(204).end()
}))

/* ---------------------------- Photo import ----------------------------- */

const smClient = new SecretsManagerClient({})
let anthropicClientPromise = null
function getAnthropicClient() {
  // Cached at module scope so a warm Lambda execution context only resolves the secret
  // once, not per-request.
  if (!anthropicClientPromise) {
    anthropicClientPromise = smClient
      .send(new GetSecretValueCommand({ SecretId: process.env.ANTHROPIC_SECRET_ARN }))
      .then(({ SecretString }) => new Anthropic({ apiKey: SecretString }))
  }
  return anthropicClientPromise
}

const ParsedEntrySchema = z.object({
  weight: z.number().nonnegative().nullable(),
  reps: z.number().positive(),
  sets: z.number().int().positive()
})
const ParsedExerciseSchema = z.object({
  exerciseName: z.string().min(1),
  entries: z.array(ParsedEntrySchema)
})
const ParsedWorkoutSchema = z.object({ exercises: z.array(ParsedExerciseSchema) })

const parsePhotoSchema = z.object({
  image: z.string().min(1),
  media_type: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg')
})

const PARSE_SYSTEM_PROMPT = `You are extracting strength-training data from a photo of a
handwritten workout log page.

Notation used in these notebooks:
- A line starts with an exercise name, followed by one or more weight×reps groupings,
  comma-separated.
- "225x5" means one set: weight=225, reps=5, sets=1.
- "(225x5)x2" means TWO separate sets of the same weight/reps: weight=225, reps=5, sets=2.
- Commas separate DISTINCT groupings. These may be different set/rep schemes within one
  person's session (e.g. a top set then backoffs), OR may belong to a different person
  sharing the same page — this notebook is sometimes shared by two lifters who don't mark
  whose numbers are whose. Do NOT merge, average, or reconcile groupings into one lifter's
  progression — extract every distinct weight/reps/sets grouping you find as its own entry,
  in the order it appears on the page.
- A number with no "xN" multiplier has sets=1.
- **Weight carries forward** when a later grouping omits it: "70x10, 80x6, x7" means
  70x10 (sets=1), 80x6 (sets=1), 80x7 (sets=1) — the second "x7" reuses the last stated
  weight (80), not the first.
- **Reps can also apply backward across a list of weights**: "30, 35, 40 x10" means three
  separate entries, each with reps=10: 30x10, 35x10, 40x10.
- **Bodyweight movements have no weight token at all** (pullups, push-ups, planks, ab
  wheel, leg raises, obliques holds, etc. are common examples) — e.g. "x18, x12, x14" with
  no number before any "x" means three sets of bodyweight reps: set weight to null for
  these entries, do not invent a weight.
- Reps are occasionally fractional (e.g. "x7.5", "x11.75") on things like partial-rep ab
  wheel rollouts — extract them as written, don't round.
- **Crossed-out / scratched-out numbers must be excluded entirely.** If a number has a
  strikethrough, X, or is otherwise marked as canceled, do not extract it as an entry.
- A name in parentheses near a line (e.g. "(Chance)", "(Caroline)") indicates whose numbers
  those are. You don't need to do anything special with it — just don't treat it as part of
  the exercise name or as a number.
- Ignore non-numeric marks (checkmarks, arrows) unless they change a logged number.
- If an exercise heading has no legible numeric data under it at all (e.g. just a title
  with nothing written below, like "Aux Circuit" with a blank line), omit that heading from
  the output entirely rather than inventing placeholder entries.

Example:
"Back Squat / (225x5)x2, 275x3 / (145x7)x2, 155x5" ->
  exerciseName: "Back Squat"
  entries: [
    {weight:225, reps:5, sets:2}, {weight:275, reps:3, sets:1},
    {weight:145, reps:7, sets:2}, {weight:155, reps:5, sets:1}
  ]

Group entries under the exercise name exactly as written (fix obvious OCR misreads of the
same word, but do not rename to a canonical exercise name). If the same exercise name
appears on multiple separate lines, combine all its entries under one heading. If nothing
resembling a workout is legible in the photo, return an empty exercises array.`

// Parse a photo of a handwritten workout page into structured exercise/set data.
// Read-only — does not write to the DB. The client reviews/edits the result and saves it
// via the normal create-workout / add-exercise / add-set / update-set endpoints.
app.post('/workouts/parse-photo', h(async (req, res) => {
  const result = parsePhotoSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }
  const { image, media_type } = result.data

  try {
    const anthropic = await getAnthropicClient()
    const response = await anthropic.beta.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 8192,
      system: PARSE_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type, data: image } },
          { type: 'text', text: 'Extract every weight/reps/sets grouping from this photo.' }
        ]
      }],
      output_format: betaZodOutputFormat(ParsedWorkoutSchema)
    })
    const exercises = response.parsed_output.exercises.filter(g => g.entries.length > 0)
    res.json({ exercises })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Rate limited — try again in a moment.' })
    }
    console.error('parse-photo failed:', err)
    return res.status(502).json({ error: 'Could not read that photo — try again with better lighting or focus.' })
  }
}))

/* --------------------------- workout exercises ----------------------------- */
app.post('/workouts/:id/exercises', h(async (req, res) => {
  const workout = await ownedWorkout(req.params.id, sub())
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  const exerciseId = Number(req.body?.exercise_id)
  const [exercise] = await query('SELECT * FROM exercises WHERE id = :id', { id: exerciseId })
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' })

  const [{ max }] = await query(
    'SELECT COALESCE(MAX(order_index), -1) AS max FROM workout_exercises WHERE workout_id = :id', { id: workout.id })
  const weId = await insertReturningId(
    'INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (:w, :e, :o) RETURNING id',
    { w: workout.id, e: exercise.id, o: max + 1 })
  await query('INSERT INTO sets (workout_exercise_id, set_number) VALUES (:we, 1)', { we: weId })

  const sets = await query('SELECT id, set_number, weight, reps, rpe FROM sets WHERE workout_exercise_id = :id ORDER BY set_number', { id: weId })
  res.status(201).json({
    id: weId, exercise_id: exercise.id, name: exercise.name, equipment: exercise.equipment,
    primary_muscle: exercise.primary_muscle, is_compound: exercise.is_compound, order_index: max + 1, sets,
  })
}))

app.delete('/workouts/:id/exercises/:weId', h(async (req, res) => {
  const we = await ownedWE(req.params.id, req.params.weId, sub())
  if (!we) return res.status(404).json({ error: 'Not found' })
  await query('DELETE FROM workout_exercises WHERE id = :id', { id: we.id })
  res.status(204).end()
}))

/* ---------------------------------- sets ----------------------------------- */
app.post('/workouts/:id/exercises/:weId/sets', h(async (req, res) => {
  const we = await ownedWE(req.params.id, req.params.weId, sub())
  if (!we) return res.status(404).json({ error: 'Not found' })
  const [{ max }] = await query('SELECT COALESCE(MAX(set_number), 0) AS max FROM sets WHERE workout_exercise_id = :id', { id: we.id })
  const id = await insertReturningId('INSERT INTO sets (workout_exercise_id, set_number) VALUES (:we, :n) RETURNING id', { we: we.id, n: max + 1 })
  const [row] = await query('SELECT id, set_number, weight, reps, rpe FROM sets WHERE id = :id', { id })
  res.status(201).json(row)
}))

app.patch('/workouts/:id/exercises/:weId/sets/:setId', h(async (req, res) => {
  const we = await ownedWE(req.params.id, req.params.weId, sub())
  if (!we) return res.status(404).json({ error: 'Not found' })
  const [set] = await query('SELECT * FROM sets WHERE id = :id AND workout_exercise_id = :we', { id: Number(req.params.setId), we: we.id })
  if (!set) return res.status(404).json({ error: 'Set not found' })

  const rpe = req.body?.rpe
  if (rpe !== undefined && rpe !== null && (rpe < 1 || rpe > 10)) {
    return res.status(400).json({ error: 'rpe must be 1-10' })
  }
  const next = {
    weight: req.body?.weight !== undefined ? req.body.weight : set.weight,
    reps: req.body?.reps !== undefined ? req.body.reps : set.reps,
    rpe: req.body?.rpe !== undefined ? req.body.rpe : set.rpe,
  }
  await query('UPDATE sets SET weight = :weight, reps = :reps, rpe = :rpe WHERE id = :id', { ...next, id: set.id })
  const [row] = await query('SELECT id, set_number, weight, reps, rpe FROM sets WHERE id = :id', { id: set.id })
  res.json(row)
}))

app.delete('/workouts/:id/exercises/:weId/sets/:setId', h(async (req, res) => {
  const we = await ownedWE(req.params.id, req.params.weId, sub())
  if (!we) return res.status(404).json({ error: 'Not found' })
  await query('DELETE FROM sets WHERE id = :id AND workout_exercise_id = :we', { id: Number(req.params.setId), we: we.id })
  res.status(204).end()
}))

/* --------------------------------- metrics --------------------------------- */
app.post('/metrics', h(async (req, res) => {
  const { date, metric_type, value } = req.body || {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !metric_type || typeof value !== 'number') {
    return res.status(400).json({ error: 'date (YYYY-MM-DD), metric_type, numeric value required' })
  }
  const [existing] = await query(
    'SELECT id FROM daily_metrics WHERE user_sub = :sub AND date = :date::date AND metric_type = :type',
    { sub: sub(), date, type: metric_type })
  if (existing) {
    await query('UPDATE daily_metrics SET value = :value WHERE id = :id', { value, id: existing.id })
    const [row] = await query('SELECT * FROM daily_metrics WHERE id = :id', { id: existing.id })
    return res.json(row)
  }
  const id = await insertReturningId(
    'INSERT INTO daily_metrics (user_sub, date, metric_type, value) VALUES (:sub, :date::date, :type, :value) RETURNING id',
    { sub: sub(), date, type: metric_type, value })
  const [row] = await query('SELECT * FROM daily_metrics WHERE id = :id', { id })
  res.status(201).json(row)
}))

app.get('/metrics/types', h(async (_req, res) => {
  const rows = await query('SELECT DISTINCT metric_type FROM daily_metrics WHERE user_sub = :sub ORDER BY metric_type', { sub: sub() })
  res.json(rows.map((r) => r.metric_type))
}))

app.get('/metrics', h(async (req, res) => {
  const { type, from, to } = req.query
  if (!type) return res.status(400).json({ error: 'query param "type" is required' })
  let sql = 'SELECT id, date, value FROM daily_metrics WHERE user_sub = :sub AND metric_type = :type'
  const params = { sub: sub(), type }
  if (from) { sql += ' AND date >= :from::date'; params.from = from }
  if (to) { sql += ' AND date <= :to::date'; params.to = to }
  sql += ' ORDER BY date ASC'
  res.json({ metric_type: type, data_points: await query(sql, params) })
}))

app.delete('/metrics/:id', h(async (req, res) => {
  const rows = await query('DELETE FROM daily_metrics WHERE id = :id AND user_sub = :sub RETURNING id', { id: Number(req.params.id), sub: sub() })
  if (rows.length === 0) return res.status(404).json({ error: 'Metric not found' })
  res.status(204).end()
}))

/* -------------------------------- progress --------------------------------- */
app.get('/progress/summary', h(async (_req, res) => {
  const userSub = sub()
  const [{ count: workouts }] = await query('SELECT COUNT(*)::int AS count FROM workouts WHERE user_sub = :sub', { sub: userSub })
  const [agg] = await query(
    `SELECT COUNT(s.id)::int AS total_sets,
            COALESCE(SUM(COALESCE(s.weight,0) * COALESCE(s.reps,0)), 0) AS total_volume
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE w.user_sub = :sub`, { sub: userSub })
  res.json({ workouts, total_sets: agg.total_sets, total_volume_lbs: agg.total_volume })
}))

app.get('/progress/exercise/:exerciseId', h(async (req, res) => {
  const [exercise] = await query('SELECT id, name FROM exercises WHERE id = :id', { id: Number(req.params.exerciseId) })
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' })
  const data_points = await query(
    `SELECT to_char(w.date, 'YYYY-MM-DD') AS date,
            MAX(s.weight) AS best_weight, MAX(s.reps) AS best_reps,
            SUM(COALESCE(s.weight,0) * COALESCE(s.reps,0)) AS volume,
            COUNT(s.id)::int AS total_sets
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE w.user_sub = :sub AND we.exercise_id = :ex
     GROUP BY w.date ORDER BY w.date ASC`,
    { sub: sub(), ex: Number(req.params.exerciseId) })
  res.json({ exercise_id: exercise.id, exercise_name: exercise.name, data_points })
}))

// Distinct exercises the user has logged at least one set for. Used to scope the
// progress-page exercise picker to exercises with actual history, including bodyweight
// movements (no weight logged) that /progress/prs excludes.
app.get('/progress/logged-exercises', h(async (_req, res) => {
  const exercises = await query(
    `SELECT DISTINCT e.id, e.name, e.primary_muscle
     FROM workout_exercises we
     JOIN workouts w ON we.workout_id = w.id
     JOIN exercises e ON we.exercise_id = e.id
     WHERE w.user_sub = :sub
     ORDER BY e.name`,
    { sub: sub() })
  res.json(exercises)
}))

app.get('/progress/prs', h(async (_req, res) => {
  const prs = await query(
    `SELECT e.id AS exercise_id, e.name AS exercise_name, e.primary_muscle,
            MAX(s.weight) AS best_weight
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     JOIN exercises e ON we.exercise_id = e.id
     WHERE w.user_sub = :sub AND s.weight IS NOT NULL
     GROUP BY e.id ORDER BY e.name`, { sub: sub() })
  res.json(prs)
}))

export const handler = serverlessExpress({ app })
