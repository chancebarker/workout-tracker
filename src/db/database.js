import Database from 'better-sqlite3'
import { schema } from './schema.js'

const db = new Database('./workout.db')

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(schema)

export default db
