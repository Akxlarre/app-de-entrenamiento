-- Tabla: workout_reports
-- Descripción: Feedback general y métricas al finalizar una sesión de entrenamiento.

CREATE TABLE workout_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    energy_level INT CHECK (energy_level >= 1 AND energy_level <= 5),
    session_rpe NUMERIC CHECK (session_rpe >= 1 AND session_rpe <= 10),
    satisfaction_rating INT CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workout_id)
);

-- Tabla: workout_exercise_feedback
-- Descripción: Feedback específico para un ejercicio dentro de una sesión (técnica, dolor, etc).

CREATE TABLE workout_exercise_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    tags TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS) policies

-- workout_reports
ALTER TABLE workout_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reports" 
    ON workout_reports FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports" 
    ON workout_reports FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" 
    ON workout_reports FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" 
    ON workout_reports FOR DELETE 
    USING (auth.uid() = user_id);

-- workout_exercise_feedback
ALTER TABLE workout_exercise_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own exercise feedback" 
    ON workout_exercise_feedback FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own exercise feedback" 
    ON workout_exercise_feedback FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise feedback" 
    ON workout_exercise_feedback FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise feedback" 
    ON workout_exercise_feedback FOR DELETE 
    USING (auth.uid() = user_id);
