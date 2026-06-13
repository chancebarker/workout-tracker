import { Router } from 'express'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// Per-exercise progression over time, one data point per workout date:
// best (heaviest) set, best reps, and total volume that day.
router.get('/exercise/:exerciseId', (req, res) => {
  const userId = req.user.user_id
  const exerciseId = req.params.exerciseId

  const exercise = db.prepare('SELECT id, name FROM exercises WHERE id = ?').get(exerciseId)
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' })

  const data_points = db.prepare(`
    SELECT
      w.date,
      MAX(s.weight) as best_weight,
      MAX(s.reps) as best_reps,
      SUM(COALESCE(s.weight, 0) * COALESCE(s.reps, 0)) as volume,
      COUNT(s.id) as total_sets
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ? AND we.exercise_id = ?
    GROUP BY w.date
    ORDER BY w.date ASC
  `).all(userId, exerciseId)

  res.json({ exercise_id: exercise.id, exercise_name: exercise.name, data_points })
})

// Heaviest single set ever, per exercise the user has logged.
router.get('/prs', (req, res) => {
  const userId = req.user.user_id

  const prs = db.prepare(`
    SELECT
      e.id as exercise_id,
      e.name as exercise_name,
      e.primary_muscle,
      MAX(s.weight) as best_weight
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    JOIN exercises e ON we.exercise_id = e.id
    WHERE w.user_id = ? AND s.weight IS NOT NULL
    GROUP BY e.id
    ORDER BY e.name
  `).all(userId)

  res.json(prs)
})

// Headline totals for the user.
router.get('/summary', (req, res) => {
  const userId = req.user.user_id

  const { workouts } = db.prepare(
    'SELECT COUNT(*) as workouts FROM workouts WHERE user_id = ?'
  ).get(userId)

  const { total_sets, total_volume } = db.prepare(`
    SELECT
      COUNT(s.id) as total_sets,
      COALESCE(SUM(COALESCE(s.weight, 0) * COALESCE(s.reps, 0)), 0) as total_volume
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ?
  `).get(userId)

  res.json({
    workouts,
    total_sets,
    total_volume_lbs: total_volume
  })
})

export default router
