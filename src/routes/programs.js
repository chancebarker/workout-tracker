import { Router } from 'express'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// List all available program templates
router.get('/', (req, res) => {
  const programs = db.prepare(`
    SELECT * FROM program_templates ORDER BY name
  `).all()

  res.json(programs)
})

// Get full program details with all weeks, days, and exercises
router.get('/:id', (req, res) => {
  const program = db.prepare(`
    SELECT * FROM program_templates WHERE id = ?
  `).get(req.params.id)

  if (!program) {
    return res.status(404).json({ error: 'Program not found' })
  }

  const days = db.prepare(`
    SELECT pd.*,
      json_group_array(
        json_object(
          'id', pe.id,
          'exercise_id', pe.exercise_id,
          'exercise_name', e.name,
          'sets', pe.sets,
          'reps', pe.reps,
          'intensity_percent', pe.intensity_percent,
          'notes', pe.notes,
          'order_index', pe.order_index
        )
      ) as exercises
    FROM program_days pd
    LEFT JOIN program_exercises pe ON pd.id = pe.program_day_id
    LEFT JOIN exercises e ON pe.exercise_id = e.id
    WHERE pd.program_template_id = ?
    GROUP BY pd.id
    ORDER BY pd.week_number, pd.day_number
  `).all(req.params.id)

  const formatted = days.map(day => ({
    ...day,
    exercises: JSON.parse(day.exercises).filter(e => e.id !== null)
  }))

  res.json({
    ...program,
    days: formatted
  })
})

// Enroll the current user in a program
router.post('/enroll/:id', (req, res) => {
  const userId = req.user.user_id
  const programId = req.params.id

  const program = db.prepare('SELECT * FROM program_templates WHERE id = ?').get(programId)
  if (!program) {
    return res.status(404).json({ error: 'Program not found' })
  }

  // Deactivate any existing active program
  db.prepare(`
    UPDATE user_programs SET is_active = 0 WHERE user_id = ? AND is_active = 1
  `).run(userId)

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO user_programs (user_id, program_template_id, current_week, current_day, is_active)
    VALUES (?, ?, 1, 1, 1)
  `).run(userId, programId)

  const userProgram = db.prepare('SELECT * FROM user_programs WHERE id = ?').get(lastInsertRowid)

  res.status(201).json({
    ...userProgram,
    program_name: program.name
  })
})

// Get the current user's active program and today's workout
router.get('/me/active', (req, res) => {
  const userId = req.user.user_id

  const userProgram = db.prepare(`
    SELECT up.*, pt.name as program_name, pt.goal, pt.duration_weeks, pt.days_per_week
    FROM user_programs up
    JOIN program_templates pt ON up.program_template_id = pt.id
    WHERE up.user_id = ? AND up.is_active = 1
  `).get(userId)

  if (!userProgram) {
    return res.status(404).json({ error: 'No active program found' })
  }

  const todaysDay = db.prepare(`
    SELECT pd.*,
      json_group_array(
        json_object(
          'id', pe.id,
          'exercise_id', pe.exercise_id,
          'exercise_name', e.name,
          'category', e.category,
          'sets', pe.sets,
          'reps', pe.reps,
          'intensity_percent', pe.intensity_percent,
          'notes', pe.notes,
          'order_index', pe.order_index
        )
      ) as exercises
    FROM program_days pd
    LEFT JOIN program_exercises pe ON pd.id = pe.program_day_id
    LEFT JOIN exercises e ON pe.exercise_id = e.id
    WHERE pd.program_template_id = ? AND pd.week_number = ? AND pd.day_number = ?
    GROUP BY pd.id
  `).get(userProgram.program_template_id, userProgram.current_week, userProgram.current_day)

  if (!todaysDay) {
    return res.status(404).json({ error: 'Could not find todays workout' })
  }

  const exercises = JSON.parse(todaysDay.exercises).filter(e => e.id !== null)

  // For each exercise, look up the user's current 1RM and calculate target weight
  const exercisesWithTargets = exercises.map(exercise => {
    const repMax = db.prepare(`
      SELECT estimated_one_rm FROM rep_max_records
      WHERE user_id = ? AND exercise_id = ?
      ORDER BY tested_at DESC LIMIT 1
    `).get(userId, exercise.exercise_id)

    const target_weight = repMax && exercise.intensity_percent
      ? Math.round(repMax.estimated_one_rm * (exercise.intensity_percent / 100))
      : null

    return {
      ...exercise,
      estimated_one_rm: repMax ? repMax.estimated_one_rm : null,
      target_weight
    }
  })

  res.json({
    ...userProgram,
    current_day_name: todaysDay.name,
    exercises: exercisesWithTargets
  })
})

export default router
