import { Router } from 'express'
import { z } from 'zod'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', (req, res) => {
  const { category, muscle } = req.query

  let query = `
    SELECT e.*, GROUP_CONCAT(m.name || ':' || em.is_primary) as muscles
    FROM exercises e
    LEFT JOIN exercise_muscles em ON e.id = em.exercise_id
    LEFT JOIN muscles m ON em.muscle_id = m.id
  `
  const params = []

  if (category) {
    query += ` WHERE e.category = ?`
    params.push(category)
  }

  if (muscle) {
    query += category ? ` AND` : ` WHERE`
    query += ` e.id IN (
      SELECT em2.exercise_id FROM exercise_muscles em2
      JOIN muscles m2 ON em2.muscle_id = m2.id
      WHERE LOWER(m2.name) = LOWER(?)
    )`
    params.push(muscle)
  }

  query += ` GROUP BY e.id ORDER BY e.name`

  const exercises = db.prepare(query).all(...params)

  const formatted = exercises.map(e => ({
    ...e,
    muscles: e.muscles
      ? e.muscles.split(',').map(m => {
          const [name, primary] = m.split(':')
          return { name, primary: primary === '1' }
        })
      : []
  }))

  res.json(formatted)
})

router.get('/:id', (req, res) => {
  const exercise = db.prepare(`
    SELECT e.*, GROUP_CONCAT(m.name || ':' || em.is_primary) as muscles
    FROM exercises e
    LEFT JOIN exercise_muscles em ON e.id = em.exercise_id
    LEFT JOIN muscles m ON em.muscle_id = m.id
    WHERE e.id = ?
    GROUP BY e.id
  `).get(req.params.id)

  if (!exercise) {
    return res.status(404).json({ error: 'Exercise not found' })
  }

  res.json({
    ...exercise,
    muscles: exercise.muscles
      ? exercise.muscles.split(',').map(m => {
          const [name, primary] = m.split(':')
          return { name, primary: primary === '1' }
        })
      : []
  })
})

const createExerciseSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['barbell', 'dumbbell', 'bodyweight', 'cable', 'machine']),
  description: z.string().optional(),
  instructions: z.string().optional(),
  image_url: z.string().url().optional(),
  muscles: z.array(z.object({
    name: z.string(),
    primary: z.boolean()
  })).optional()
})

router.post('/', (req, res) => {
  const result = createExerciseSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }

  const { name, category, description, instructions, image_url, muscles } = result.data

  const existing = db.prepare('SELECT id FROM exercises WHERE name = ?').get(name)
  if (existing) {
    return res.status(409).json({ error: 'An exercise with that name already exists' })
  }

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO exercises (name, category, description, instructions, image_url, created_by_user_id, is_seeded)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(name, category, description, instructions, image_url, req.user.user_id)

  if (muscles && muscles.length > 0) {
    const insertMuscle = db.prepare(`
      INSERT OR IGNORE INTO exercise_muscles (exercise_id, muscle_id, is_primary)
      VALUES (?, (SELECT id FROM muscles WHERE name = ?), ?)
    `)
    for (const muscle of muscles) {
      insertMuscle.run(lastInsertRowid, muscle.name, muscle.primary ? 1 : 0)
    }
  }

  const created = db.prepare('SELECT * FROM exercises WHERE id = ?').get(lastInsertRowid)
  res.status(201).json(created)
})

export default router
