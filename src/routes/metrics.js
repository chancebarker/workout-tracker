import { Router } from 'express'
import { z } from 'zod'
import db from '../db/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

const logMetricSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  metric_type: z.string().min(1),
  value: z.number()
})

// Log (or overwrite) a daily metric. One value per user/date/metric_type:
// re-logging the same day updates it rather than creating a duplicate.
router.post('/', (req, res) => {
  const result = logMetricSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }

  const userId = req.user.user_id
  const { date, metric_type, value } = result.data

  const existing = db.prepare(
    'SELECT id FROM daily_metrics WHERE user_id = ? AND date = ? AND metric_type = ?'
  ).get(userId, date, metric_type)

  if (existing) {
    db.prepare('UPDATE daily_metrics SET value = ? WHERE id = ?').run(value, existing.id)
    return res.json(db.prepare('SELECT * FROM daily_metrics WHERE id = ?').get(existing.id))
  }

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO daily_metrics (user_id, date, metric_type, value) VALUES (?, ?, ?, ?)
  `).run(userId, date, metric_type, value)

  res.status(201).json(db.prepare('SELECT * FROM daily_metrics WHERE id = ?').get(lastInsertRowid))
})

// Distinct metric types this user has logged (for building the UI / filters)
router.get('/types', (req, res) => {
  const rows = db.prepare(
    'SELECT DISTINCT metric_type FROM daily_metrics WHERE user_id = ? ORDER BY metric_type'
  ).all(req.user.user_id)
  res.json(rows.map(r => r.metric_type))
})

// Time series for a metric type, oldest first (ready to graph).
// Required: ?type=bodyweight   Optional: &from=&to=
router.get('/', (req, res) => {
  const userId = req.user.user_id
  const { type, from, to } = req.query

  if (!type) return res.status(400).json({ error: 'query param "type" is required' })

  let query = 'SELECT id, date, value FROM daily_metrics WHERE user_id = ? AND metric_type = ?'
  const params = [userId, type]

  if (from) { query += ' AND date >= ?'; params.push(from) }
  if (to)   { query += ' AND date <= ?'; params.push(to) }

  query += ' ORDER BY date ASC'

  res.json({ metric_type: type, data_points: db.prepare(query).all(...params) })
})

// Delete a single metric entry
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM daily_metrics WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.user_id)
  if (result.changes === 0) return res.status(404).json({ error: 'Metric not found' })
  res.status(204).end()
})

export default router
