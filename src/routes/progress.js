import { Router } from 'express'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// Get weight progression over time for a specific exercise
router.get('/exercise/:id', (req, res) => {
  const userId = req.user.user_id
  const exerciseId = req.params.id

  const exercise = db.prepare('SELECT id, name FROM exercises WHERE id = ?').get(exerciseId)
  if (!exercise) {
    return res.status(404).json({ error: 'Exercise not found' })
  }

  // Get the best set (highest actual weight) per session for this exercise
  const progression = db.prepare(`
    SELECT
      ws.started_at as session_date,
      MAX(ls.actual_weight) as best_weight,
      MAX(ls.actual_reps) as reps_at_best,
      COUNT(*) as total_sets,
      SUM(ls.actual_weight * ls.actual_reps) as volume
    FROM logged_sets ls
    JOIN workout_sessions ws ON ls.workout_session_id = ws.id
    JOIN user_programs up ON ws.user_program_id = up.id
    WHERE up.user_id = ? AND ls.exercise_id = ? AND ws.completed_at IS NOT NULL
    GROUP BY ws.id
    ORDER BY ws.started_at ASC
  `).all(userId, exerciseId)

  res.json({
    exercise_name: exercise.name,
    data_points: progression
  })
})

// Personal records -- best set ever per exercise
router.get('/prs', (req, res) => {
  const userId = req.user.user_id

  const prs = db.prepare(`
    SELECT
      e.id as exercise_id,
      e.name as exercise_name,
      e.category,
      MAX(ls.actual_weight) as pr_weight,
      ls.actual_reps as reps,
      ws.started_at as achieved_at
    FROM logged_sets ls
    JOIN exercises e ON ls.exercise_id = e.id
    JOIN workout_sessions ws ON ls.workout_session_id = ws.id
    JOIN user_programs up ON ws.user_program_id = up.id
    WHERE up.user_id = ? AND ws.completed_at IS NOT NULL
    GROUP BY ls.exercise_id
    ORDER BY e.name
  `).all(userId)

  res.json(prs)
})

// Overall summary stats
router.get('/summary', (req, res) => {
  const userId = req.user.user_id

  const sessionCount = db.prepare(`
    SELECT COUNT(*) as total
    FROM workout_sessions ws
    JOIN user_programs up ON ws.user_program_id = up.id
    WHERE up.user_id = ? AND ws.completed_at IS NOT NULL
  `).get(userId)

  const totalVolume = db.prepare(`
    SELECT COALESCE(SUM(ls.actual_weight * ls.actual_reps), 0) as total
    FROM logged_sets ls
    JOIN workout_sessions ws ON ls.workout_session_id = ws.id
    JOIN user_programs up ON ws.user_program_id = up.id
    WHERE up.user_id = ? AND ws.completed_at IS NOT NULL
  `).get(userId)

  const totalSets = db.prepare(`
    SELECT COUNT(*) as total
    FROM logged_sets ls
    JOIN workout_sessions ws ON ls.workout_session_id = ws.id
    JOIN user_programs up ON ws.user_program_id = up.id
    WHERE up.user_id = ? AND ws.completed_at IS NOT NULL
  `).get(userId)

  const activeProgram = db.prepare(`
    SELECT pt.name, up.current_week, up.current_day, pt.duration_weeks
    FROM user_programs up
    JOIN program_templates pt ON up.program_template_id = pt.id
    WHERE up.user_id = ? AND up.is_active = 1
  `).get(userId)

  res.json({
    sessions_completed: sessionCount.total,
    total_volume_lbs: totalVolume.total,
    total_sets: totalSets.total,
    active_program: activeProgram || null
  })
})

export default router
