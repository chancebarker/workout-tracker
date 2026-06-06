import express from 'express'
import './db/database.js'

const app = express()
const PORT = 3000

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
