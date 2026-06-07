import express from 'express'
import 'dotenv/config'
import './db/database.js'
import authRoutes from './routes/auth.js'
import exerciseRoutes from './routes/exercises.js'
import repMaxRoutes from './routes/repmax.js'
import programRoutes from './routes/programs.js'
import sessionRoutes from './routes/sessions.js'
import progressRoutes from './routes/progress.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.use('/auth', authRoutes)
app.use('/exercises', exerciseRoutes)
app.use('/repmax', repMaxRoutes)
app.use('/programs', programRoutes)
app.use('/sessions', sessionRoutes)
app.use('/progress', progressRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
