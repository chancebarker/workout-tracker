import { Router } from 'express'
import { z } from 'zod'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// List exercises. Seeded exercises are visible to everyone; custom ones only
// to the user who created them. Optional filters: ?equipment= and ?muscle=
router.get('/', (req, res) => {
  const { equipment, muscle } = req.query
  const userId = req.user.user_id

  let query = `
    SELECT * FROM exercises
    WHERE (is_custom = 0 OR created_by_user_id = ?)
  `
  const params = [userId]

  if (equipment) {
    query += ' AND equipment = ?'
    params.push(equipment)
  }
  if (muscle) {
    query += ' AND primary_muscle = ?'
    params.push(muscle)
  }

  query += ' ORDER BY primary_muscle, name'

  const exercises = db.prepare(query).all(...params)
  res.json(exercises)
})

const createExerciseSchema = z.object({
  name: z.string().min(1),
  equipment: z.string().min(1),
  primary_muscle: z.string().min(1),
  is_compound: z.boolean().optional()
})

// Create a custom exercise owned by the current user
router.post('/', (req, res) => {
  const result = createExerciseSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }

  const { name, equipment, primary_muscle, is_compound } = result.data

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO exercises (name, equipment, primary_muscle, is_compound, is_custom, created_by_user_id)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(name, equipment, primary_muscle, is_compound ? 1 : 0, req.user.user_id)

  const created = db.prepare('SELECT * FROM exercises WHERE id = ?').get(lastInsertRowid)
  res.status(201).json(created)
})

export default router
