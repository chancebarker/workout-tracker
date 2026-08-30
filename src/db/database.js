import Database from 'better-sqlite3'
import { schema } from './schema.js'

const db = new Database('./workout.db')

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(schema)

// Lightweight migration for columns added after this table already existed on disk.
// This repo has no migration framework — CREATE TABLE IF NOT EXISTS is a no-op against
// an already-created table, so new columns need an explicit, idempotent ALTER TABLE.
for (const column of ['description TEXT', 'cues TEXT', 'secondary_muscles TEXT']) {
  try {
    db.exec(`ALTER TABLE exercises ADD COLUMN ${column}`)
  } catch (err) {
    if (!err.message.includes('duplicate column name')) throw err
  }
}

export default db

import { seedDatabase, backfillExerciseContent } from './seed.js'
seedDatabase()
backfillExerciseContent()
