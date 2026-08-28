import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
const anthropic = new Anthropic()

router.use(authenticate)

// Load a workout and verify it belongs to the requesting user.
// Returns the workout row, or null if not found / not owned.
function getOwnedWorkout(workoutId, userId) {
  return db.prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?').get(workoutId, userId)
}

// Verify a workout_exercise belongs to a workout the user owns.
function getOwnedWorkoutExercise(workoutId, workoutExerciseId, userId) {
  return db.prepare(`
    SELECT we.* FROM workout_exercises we
    JOIN workouts w ON we.workout_id = w.id
    WHERE we.id = ? AND we.workout_id = ? AND w.user_id = ?
  `).get(workoutExerciseId, workoutId, userId)
}

/* ------------------------------ Workouts ------------------------------ */

const createWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  name: z.string().optional(),
  notes: z.string().optional()
})

// Create a workout
router.post('/', (req, res) => {
  const result = createWorkoutSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }
  const { date, name, notes } = result.data

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO workouts (user_id, date, name, notes) VALUES (?, ?, ?, ?)
  `).run(req.user.user_id, date, name ?? null, notes ?? null)

  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(lastInsertRowid)
  res.status(201).json(workout)
})

// List workouts for the calendar. Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD range.
router.get('/', (req, res) => {
  const userId = req.user.user_id
  const { from, to } = req.query

  let query = 'SELECT * FROM workouts WHERE user_id = ?'
  const params = [userId]

  if (from) { query += ' AND date >= ?'; params.push(from) }
  if (to)   { query += ' AND date <= ?'; params.push(to) }

  query += ' ORDER BY date DESC'

  const workouts = db.prepare(query).all(...params)

  // Attach exercise + set counts per workout for calendar/list previews
  const exerciseCount = db.prepare(
    'SELECT COUNT(*) as count FROM workout_exercises WHERE workout_id = ?'
  )
  const setCount = db.prepare(`
    SELECT COUNT(*) as count FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    WHERE we.workout_id = ?
  `)

  const withCounts = workouts.map(w => ({
    ...w,
    exercise_count: exerciseCount.get(w.id).count,
    set_count: setCount.get(w.id).count
  }))

  res.json(withCounts)
})

// Get a full workout with its exercises and sets nested
router.get('/:id', (req, res) => {
  const workout = getOwnedWorkout(req.params.id, req.user.user_id)
  if (!workout) return res.status(404).json({ error: 'Workout not found' })

  const exercises = db.prepare(`
    SELECT we.id, we.exercise_id, we.order_index,
           e.name, e.equipment, e.primary_muscle, e.is_compound
    FROM workout_exercises we
    JOIN exercises e ON we.exercise_id = e.id
    WHERE we.workout_id = ?
    ORDER BY we.order_index, we.id
  `).all(workout.id)

  const setStmt = db.prepare(`
    SELECT id, set_number, weight, reps, rpe
    FROM sets WHERE workout_exercise_id = ?
    ORDER BY set_number
  `)

  const exercisesWithSets = exercises.map(ex => ({
    ...ex,
    sets: setStmt.all(ex.id)
  }))

  res.json({ ...workout, exercises: exercisesWithSets })
})

// For each exercise in this workout, find the most recent EARLIER workout that
// also contained that exercise, and return its sets. Powers the "last time"
// reference shown next to each exercise. Returns { [exercise_id]: { date, sets } }.
router.get('/:id/previous', (req, res) => {
  const workout = getOwnedWorkout(req.params.id, req.user.user_id)
  if (!workout) return res.status(404).json({ error: 'Workout not found' })

  const exerciseIds = db.prepare(
    'SELECT DISTINCT exercise_id FROM workout_exercises WHERE workout_id = ?'
  ).all(workout.id).map(r => r.exercise_id)

  // Most recent prior workout_exercise for this user + exercise, strictly before
  // this workout (earlier date, or same date but a lower id).
  const priorStmt = db.prepare(`
    SELECT we.id, w.date
    FROM workout_exercises we
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND we.exercise_id = ?
      AND (w.date < ? OR (w.date = ? AND w.id < ?))
    ORDER BY w.date DESC, w.id DESC
    LIMIT 1
  `)
  const setStmt = db.prepare(`
    SELECT set_number, weight, reps, rpe FROM sets
    WHERE workout_exercise_id = ? ORDER BY set_number
  `)

  const result = {}
  for (const exerciseId of exerciseIds) {
    const prior = priorStmt.get(req.user.user_id, exerciseId, workout.date, workout.date, workout.id)
    if (prior) {
      result[exerciseId] = { date: prior.date, sets: setStmt.all(prior.id) }
    }
  }

  res.json(result)
})

const updateWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  name: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
})

// Update a workout's date/name/notes
router.patch('/:id', (req, res) => {
  const workout = getOwnedWorkout(req.params.id, req.user.user_id)
  if (!workout) return res.status(404).json({ error: 'Workout not found' })

  const result = updateWorkoutSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }

  const next = { ...workout, ...result.data }
  db.prepare('UPDATE workouts SET date = ?, name = ?, notes = ? WHERE id = ?')
    .run(next.date, next.name, next.notes, workout.id)

  res.json(db.prepare('SELECT * FROM workouts WHERE id = ?').get(workout.id))
})

// Delete a workout (cascades to its exercises and sets)
router.delete('/:id', (req, res) => {
  const workout = getOwnedWorkout(req.params.id, req.user.user_id)
  if (!workout) return res.status(404).json({ error: 'Workout not found' })

  db.prepare('DELETE FROM workouts WHERE id = ?').run(workout.id)
  res.status(204).end()
})

/* ---------------------------- Photo import ----------------------------- */

const ParsedEntrySchema = z.object({
  weight: z.number().nonnegative().nullable(), // null for bodyweight movements (pullups, push-ups, ab wheel, ...)
  reps: z.number().positive(), // not integer-only — partial reps show up on things like ab wheel rollouts
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
handwritten workout log page. These pages are genuinely messy — cramped, abbreviated, and
sometimes shared by two different lifters on one page. Do your best; the user reviews and
edits every extracted entry before it's saved, so it is fine to extract something imperfect
rather than nothing.

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
router.post('/parse-photo', async (req, res) => {
  const result = parsePhotoSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }
  const { image, media_type } = result.data

  try {
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
})

/* -------------------------- Workout exercises -------------------------- */

const addExerciseSchema = z.object({
  exercise_id: z.number().int().positive()
})

// Add an exercise to a workout. Auto-populates a single blank set so the user
// can start logging immediately.
router.post('/:id/exercises', (req, res) => {
  const workout = getOwnedWorkout(req.params.id, req.user.user_id)
  if (!workout) return res.status(404).json({ error: 'Workout not found' })

  const result = addExerciseSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }

  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(result.data.exercise_id)
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' })

  const { max } = db.prepare(
    'SELECT COALESCE(MAX(order_index), -1) as max FROM workout_exercises WHERE workout_id = ?'
  ).get(workout.id)

  const addWithSet = db.transaction(() => {
    const { lastInsertRowid: weId } = db.prepare(`
      INSERT INTO workout_exercises (workout_id, exercise_id, order_index)
      VALUES (?, ?, ?)
    `).run(workout.id, exercise.id, max + 1)

    db.prepare(`
      INSERT INTO sets (workout_exercise_id, set_number, weight, reps, rpe)
      VALUES (?, 1, NULL, NULL, NULL)
    `).run(weId)

    return weId
  })

  const weId = addWithSet()

  const sets = db.prepare('SELECT id, set_number, weight, reps, rpe FROM sets WHERE workout_exercise_id = ?').all(weId)
  res.status(201).json({
    id: weId,
    exercise_id: exercise.id,
    name: exercise.name,
    equipment: exercise.equipment,
    primary_muscle: exercise.primary_muscle,
    is_compound: exercise.is_compound,
    order_index: max + 1,
    sets
  })
})

// Remove an exercise (and its sets) from a workout
router.delete('/:id/exercises/:weId', (req, res) => {
  const we = getOwnedWorkoutExercise(req.params.id, req.params.weId, req.user.user_id)
  if (!we) return res.status(404).json({ error: 'Exercise not found in this workout' })

  db.prepare('DELETE FROM workout_exercises WHERE id = ?').run(we.id)
  res.status(204).end()
})

/* -------------------------------- Sets -------------------------------- */

// Add another set to a workout exercise (next set_number)
router.post('/:id/exercises/:weId/sets', (req, res) => {
  const we = getOwnedWorkoutExercise(req.params.id, req.params.weId, req.user.user_id)
  if (!we) return res.status(404).json({ error: 'Exercise not found in this workout' })

  const { max } = db.prepare(
    'SELECT COALESCE(MAX(set_number), 0) as max FROM sets WHERE workout_exercise_id = ?'
  ).get(we.id)

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO sets (workout_exercise_id, set_number, weight, reps, rpe)
    VALUES (?, ?, NULL, NULL, NULL)
  `).run(we.id, max + 1)

  res.status(201).json(db.prepare('SELECT id, set_number, weight, reps, rpe FROM sets WHERE id = ?').get(lastInsertRowid))
})

const updateSetSchema = z.object({
  weight: z.number().nonnegative().nullable().optional(),
  reps: z.number().int().nonnegative().nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional()
})

// Update a set's weight / reps / rpe
router.patch('/:id/exercises/:weId/sets/:setId', (req, res) => {
  const we = getOwnedWorkoutExercise(req.params.id, req.params.weId, req.user.user_id)
  if (!we) return res.status(404).json({ error: 'Exercise not found in this workout' })

  const set = db.prepare('SELECT * FROM sets WHERE id = ? AND workout_exercise_id = ?').get(req.params.setId, we.id)
  if (!set) return res.status(404).json({ error: 'Set not found' })

  const result = updateSetSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }

  const next = { ...set, ...result.data }
  db.prepare('UPDATE sets SET weight = ?, reps = ?, rpe = ? WHERE id = ?')
    .run(next.weight, next.reps, next.rpe, set.id)

  res.json(db.prepare('SELECT id, set_number, weight, reps, rpe FROM sets WHERE id = ?').get(set.id))
})

// Delete a set
router.delete('/:id/exercises/:weId/sets/:setId', (req, res) => {
  const we = getOwnedWorkoutExercise(req.params.id, req.params.weId, req.user.user_id)
  if (!we) return res.status(404).json({ error: 'Exercise not found in this workout' })

  const result = db.prepare('DELETE FROM sets WHERE id = ? AND workout_exercise_id = ?').run(req.params.setId, we.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Set not found' })

  res.status(204).end()
})

export default router
