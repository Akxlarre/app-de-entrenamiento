-- Añadir columna completed_at para el tracking de descansos
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS completed_at timestamptz;
