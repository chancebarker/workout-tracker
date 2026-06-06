import { Router } from 'express'
import { z } from 'zod'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

function calculateOneRepMax(weight, reps) {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

const repMaxSchema = z.object({
  weight: z.number().positive(),
  reps: z.number().int().min(1).max(10),
  method: z.enum(['actual', 'calculated'])
})

// Submit a rep max test for an exercise
router.post('/:exerciseId', (req, res) => {
  const result = repMaxSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }

  const { weight, reps, method } = result.data
  const exerciseId = req.params.exerciseId
  const userId = req.user.user_id

  const exercise = db.prepare('SELECT id, name FROM exercises WHERE id = ?').get(exerciseId)
  if (!exercise) {
    return res.status(404).json({ error: 'Exercise not found' })
  }

  const estimated_one_rm = calculateOneRepMax(weight, reps)

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO rep_max_records (user_id, exercise_id, estimated_one_rm, test_reps, test_weight, method)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, exerciseId, estimated_one_rm, reps, weight, method)

  const record = db.prepare('SELECT * FROM rep_max_records WHERE id = ?').get(lastInsertRowid)

  res.status(201).json({
    ...record,
    exercise_name: exercise.name,
    estimated_one_rm
  })
})

// Get 1RM history for a specific exercise
router.get('/:exerciseId', (req, res) => {
  const userId = req.user.user_id
  const exerciseId = req.params.exerciseId

  const exercise = db.prepare('SELECT id, name FROM exercises WHERE id = ?').get(exerciseId)
  if (!exercise) {
    return res.status(404).json({ error: 'Exercise not found' })
  }

  const records = db.prepare(`
    SELECT * FROM rep_max_records
    WHERE user_id = ? AND exercise_id = ?
    ORDER BY tested_at DESC
  `).all(userId, exerciseId)

  res.json({
    exercise_name: exercise.name,
    records
  })
})

// Get latest 1RM for all exercises for the current user
router.get('/', (req, res) => {
  const userId = req.user.user_id

  const records = db.prepare(`
    SELECT r.*, e.name as exercise_name, e.category
    FROM rep_max_records r
    JOIN exercises e ON r.exercise_id = e.id
    WHERE r.user_id = ?
    AND r.tested_at = (
      SELECT MAX(r2.tested_at)
      FROM rep_max_records r2
      WHERE r2.user_id = r.user_id AND r2.exercise_id = r.exercise_id
    )
    ORDER BY e.name
  `).all(userId)

  res.json(records)
})

export default router
