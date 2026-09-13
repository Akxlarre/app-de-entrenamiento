-- =========================================================================================
-- MIGRATION: Mesocycles, Weeks, Sessions, and Progression Targets
-- =========================================================================================

-- 1. Table: mesocycles
CREATE TABLE mesocycles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_weeks INTEGER NOT NULL,
    current_week INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mesocycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own mesocycles" ON mesocycles
    FOR ALL USING (auth.uid() = user_id);

-- 2. Table: mesocycle_weeks
CREATE TABLE mesocycle_weeks (
    id UUID PRIMARY KEY,
    mesocycle_id UUID NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    is_deload BOOLEAN DEFAULT FALSE,
    focus_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mesocycle_id, week_number)
);
ALTER TABLE mesocycle_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own mesocycle weeks" ON mesocycle_weeks
    FOR ALL USING (auth.uid() = user_id);

-- 3. Table: mesocycle_sessions
CREATE TABLE mesocycle_sessions (
    id UUID PRIMARY KEY,
    week_id UUID NOT NULL REFERENCES mesocycle_weeks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    completed_workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(week_id, day_number)
);
ALTER TABLE mesocycle_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own mesocycle sessions" ON mesocycle_sessions
    FOR ALL USING (auth.uid() = user_id);

-- 4. Table: mesocycle_session_targets
CREATE TABLE mesocycle_session_targets (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES mesocycle_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    target_weight NUMERIC,
    target_reps TEXT,
    target_rir INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mesocycle_session_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own session targets" ON mesocycle_session_targets
    FOR ALL USING (auth.uid() = user_id);
