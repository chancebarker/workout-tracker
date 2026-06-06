import express from 'express'
import 'dotenv/config'
import './db/database.js'
import authRoutes from './routes/auth.js'
import exerciseRoutes from './routes/exercises.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.use('/auth', authRoutes)
app.use('/exercises', exerciseRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
