-- Postgres schema for the cloud (Aurora) build.
--
-- Differences from the local SQLite schema:
--  * Identity comes from Cognito, so there is NO users table. Ownership is the Cognito
--    subject claim (`user_sub`, a UUID string) carried on workouts and daily_metrics.
--  * SERIAL/IDENTITY instead of AUTOINCREMENT; BOOLEAN instead of INTEGER flags;
--    timestamptz instead of TEXT datetimes; NUMERIC for weights.

CREATE TABLE IF NOT EXISTS exercises (
  id                 INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name               TEXT NOT NULL,
  equipment          TEXT NOT NULL,
  primary_muscle     TEXT NOT NULL,
  is_compound        BOOLEAN NOT NULL DEFAULT FALSE,
  is_custom          BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_sub     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS cues TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS secondary_muscles TEXT;

CREATE TABLE IF NOT EXISTS workouts (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_sub    TEXT NOT NULL,
  date        DATE NOT NULL,
  name        TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workout_id   INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id  INTEGER NOT NULL REFERENCES exercises(id),
  order_index  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sets (
  id                    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workout_exercise_id   INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number            INTEGER NOT NULL,
  weight                DOUBLE PRECISION,
  reps                  INTEGER,
  rpe                   INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_metrics (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_sub     TEXT NOT NULL,
  date         DATE NOT NULL,
  metric_type  TEXT NOT NULL,
  value        DOUBLE PRECISION NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_sub, date);
CREATE INDEX IF NOT EXISTS idx_metrics_user_type ON daily_metrics(user_sub, metric_type, date);
