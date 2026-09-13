-- Añadir configuración de series, tiempo de descanso y notas en routine_exercises
ALTER TABLE public.routine_exercises 
ADD COLUMN IF NOT EXISTS sets JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rest_seconds INT DEFAULT 90,
ADD COLUMN IF NOT EXISTS notes TEXT;
