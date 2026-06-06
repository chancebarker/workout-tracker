import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import db from '../db/database.js'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

router.post('/register', (req, res) => {
  const result = registerSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }

  const { email, password, name } = result.data

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' })
  }

  const password_hash = bcrypt.hashSync(password, 12)

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email, password_hash, name)

  const token = jwt.sign({ user_id: lastInsertRowid }, process.env.JWT_SECRET, { expiresIn: '7d' })

  res.status(201).json({ token })
})

router.post('/login', (req, res) => {
  const result = loginSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() })
  }

  const { email, password } = result.data

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })

  res.status(200).json({ token })
})

export default router
