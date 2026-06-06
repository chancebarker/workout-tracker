export const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS muscles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    category TEXT CHECK(category IN ('barbell', 'dumbbell', 'bodyweight', 'cable', 'machine')) NOT NULL,
    description TEXT,
    instructions TEXT,
    image_url TEXT,
    created_by_user_id INTEGER REFERENCES users(id),
    is_seeded INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exercise_muscles (
    exercise_id INTEGER REFERENCES exercises(id),
    muscle_id INTEGER REFERENCES muscles(id),
    is_primary INTEGER DEFAULT 1,
    PRIMARY KEY (exercise_id, muscle_id)
  );

  CREATE TABLE IF NOT EXISTS rep_max_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    exercise_id INTEGER REFERENCES exercises(id),
    estimated_one_rm REAL NOT NULL,
    test_reps INTEGER,
    test_weight REAL,
    method TEXT CHECK(method IN ('actual', 'calculated')),
    tested_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS program_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT CHECK(goal IN ('general_fitness', 'weight_loss', 'strength', 'hypertrophy')),
    duration_weeks INTEGER NOT NULL,
    days_per_week INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS program_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_template_id INTEGER REFERENCES program_templates(id),
    week_number INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS program_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_day_id INTEGER REFERENCES program_days(id),
    exercise_id INTEGER REFERENCES exercises(id),
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    intensity_percent REAL,
    notes TEXT,
    order_index INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    program_template_id INTEGER REFERENCES program_templates(id),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    current_week INTEGER DEFAULT 1,
    current_day INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS workout_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_program_id INTEGER REFERENCES user_programs(id),
    program_day_id INTEGER REFERENCES program_days(id),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS logged_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_session_id INTEGER REFERENCES workout_sessions(id),
    exercise_id INTEGER REFERENCES exercises(id),
    set_number INTEGER NOT NULL,
    planned_reps INTEGER,
    actual_reps INTEGER,
    planned_weight REAL,
    actual_weight REAL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`
