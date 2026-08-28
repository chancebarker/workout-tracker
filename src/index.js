import express from 'express'
import 'dotenv/config'
import './db/database.js'
import authRoutes from './routes/auth.js'
import exerciseRoutes from './routes/exercises.js'
import workoutRoutes from './routes/workouts.js'
import metricRoutes from './routes/metrics.js'
import progressRoutes from './routes/progress.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json({ limit: '8mb' })) // raised from the default ~100kb for base64 photo uploads

app.use('/auth', authRoutes)
app.use('/exercises', exerciseRoutes)
app.use('/workouts', workoutRoutes)
app.use('/metrics', metricRoutes)
app.use('/progress', progressRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
