export const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    equipment TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    is_compound INTEGER DEFAULT 0,
    is_custom INTEGER DEFAULT 0,
    created_by_user_id INTEGER REFERENCES users(id),
    description TEXT,
    cues TEXT,
    secondary_muscles TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- A workout is a single dated training session created by a user.
  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    name TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- An exercise placed into a workout (one row per exercise in a session).
  CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    order_index INTEGER NOT NULL DEFAULT 0
  );

  -- A single set logged against a workout_exercise.
  CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    weight REAL,
    reps INTEGER,
    rpe INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Optional, user-defined daily fitness markers (bodyweight, steps, sleep, etc.).
  -- metric_type is free-form so any marker a user cares about fits without a schema change.
  CREATE TABLE IF NOT EXISTS daily_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_type ON daily_metrics(user_id, metric_type, date);
`
