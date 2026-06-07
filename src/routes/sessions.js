import { Router } from 'express'
import { z } from 'zod'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// Start a new workout session
router.post('/', (req, res) => {
  const userId = req.user.user_id

  const userProgram = db.prepare(`
    SELECT * FROM user_programs WHERE user_id = ? AND is_active = 1
  `).get(userId)

  if (!userProgram) {
    return res.status(404).json({ error: 'No active program found. Enroll in a program first.' })
  }

  const programDay = db.prepare(`
    SELECT * FROM program_days
    WHERE program_template_id = ? AND week_number = ? AND day_number = ?
  `).get(userProgram.program_template_id, userProgram.current_week, userProgram.current_day)

  if (!programDay) {
    return res.status(404).json({ error: 'Could not find todays program day.' })
  }

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO workout_sessions (user_program_id, program_day_id)
    VALUES (?, ?)
  `).run(userProgram.id, programDay.id)

  const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(lastInsertRowid)

  res.status(201).json({
    ...session,
    program_day_name: programDay.name,
    week: userProgram.current_week,
    day: userProgram.current_day
  })
})

// Log a set during a session
const logSetSchema = z.object({
  exercise_id: z.number().int().positive(),
  set_number: z.number().int().positive(),
  planned_reps: z.number().int().positive().optional(),
  actual_reps: z.number().int().positive(),
  planned_weight: z.number().positive().optional(),
  actual_weight: z.number().positive()
})

router.post('/:id/sets', (req, res) => {
  const userId = req.user.user_id
  const sessionId = req.params.id

  const session = db.prepare(`
    SELECT ws.* FROM workout_sessions ws
    JOIN user_programs up ON ws.user_program_id = up.id
    WHERE ws.id = ? AND up.user_id = ?
  `).get(sessionId, userId)

  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  if (session.completed_at) {
    return res.status(400).json({ error: 'Cannot log sets to a completed session' })
  }

  const result = logSetSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }

  const { exercise_id, set_number, planned_reps, actual_reps, planned_weight, actual_weight } = result.data

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO logged_sets (workout_session_id, exercise_id, set_number, planned_reps, actual_reps, planned_weight, actual_weight)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, exercise_id, set_number, planned_reps, actual_reps, planned_weight, actual_weight)

  const loggedSet = db.prepare('SELECT * FROM logged_sets WHERE id = ?').get(lastInsertRowid)

  res.status(201).json(loggedSet)
})

// Get a session with all logged sets
router.get('/:id', (req, res) => {
  const userId = req.user.user_id
  const sessionId = req.params.id

  const session = db.prepare(`
    SELECT ws.*, pd.name as day_name, up.current_week, up.current_day
    FROM workout_sessions ws
    JOIN user_programs up ON ws.user_program_id = up.id
    JOIN program_days pd ON ws.program_day_id = pd.id
    WHERE ws.id = ? AND up.user_id = ?
  `).get(sessionId, userId)

  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  const sets = db.prepare(`
    SELECT ls.*, e.name as exercise_name
    FROM logged_sets ls
    JOIN exercises e ON ls.exercise_id = e.id
    WHERE ls.workout_session_id = ?
    ORDER BY ls.exercise_id, ls.set_number
  `).all(sessionId)

  res.json({ ...session, sets })
})

// Mark session complete and advance the program
router.patch('/:id/complete', (req, res) => {
  const userId = req.user.user_id
  const sessionId = req.params.id

  const session = db.prepare(`
    SELECT ws.*, up.id as user_program_id, up.current_week, up.current_day,
           up.program_template_id, pt.duration_weeks, pt.days_per_week
    FROM workout_sessions ws
    JOIN user_programs up ON ws.user_program_id = up.id
    JOIN program_templates pt ON up.program_template_id = pt.id
    WHERE ws.id = ? AND up.user_id = ?
  `).get(sessionId, userId)

  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  if (session.completed_at) {
    return res.status(400).json({ error: 'Session already completed' })
  }

  // Mark session as complete
  db.prepare(`
    UPDATE workout_sessions SET completed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(sessionId)

  // Advance the program to the next day
  let nextWeek = session.current_week
  let nextDay = session.current_day + 1

  if (nextDay > session.days_per_week) {
    nextDay = 1
    nextWeek = session.current_week + 1
  }

  const programComplete = nextWeek > session.duration_weeks

  if (programComplete) {
    db.prepare(`
      UPDATE user_programs SET is_active = 0 WHERE id = ?
    `).run(session.user_program_id)
  } else {
    db.prepare(`
      UPDATE user_programs SET current_week = ?, current_day = ? WHERE id = ?
    `).run(nextWeek, nextDay, session.user_program_id)
  }

  res.json({
    message: programComplete
      ? 'Program complete! Congratulations.'
      : `Session complete. Next: Week ${nextWeek}, Day ${nextDay}`,
    next_week: programComplete ? null : nextWeek,
    next_day: programComplete ? null : nextDay,
    program_complete: programComplete
  })
})

// Get session history for the current user
router.get('/', (req, res) => {
  const userId = req.user.user_id

  const sessions = db.prepare(`
    SELECT ws.*, pd.name as day_name, up.current_week, up.current_day, pt.name as program_name
    FROM workout_sessions ws
    JOIN user_programs up ON ws.user_program_id = up.id
    JOIN program_days pd ON ws.program_day_id = pd.id
    JOIN program_templates pt ON up.program_template_id = pt.id
    WHERE up.user_id = ?
    ORDER BY ws.started_at DESC
  `).all(userId)

  res.json(sessions)
})

export default router
