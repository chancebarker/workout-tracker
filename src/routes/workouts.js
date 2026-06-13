import { Router } from 'express'
import { z } from 'zod'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

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

  // Attach a quick exercise count per workout for calendar/list previews
  const withCounts = workouts.map(w => {
    const { count } = db.prepare(
      'SELECT COUNT(*) as count FROM workout_exercises WHERE workout_id = ?'
    ).get(w.id)
    return { ...w, exercise_count: count }
  })

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
