-- 1. `exercises` (Catálogo Maestro)
CREATE TABLE public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_es TEXT,
    category TEXT,
    muscle TEXT,
    equipment TEXT,
    instructions_en TEXT,
    instructions_es TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS en exercises
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Política: Lectura pública para todos los usuarios autenticados
CREATE POLICY "Ejercicios visibles para todos los autenticados" 
    ON public.exercises FOR SELECT
    TO authenticated
    USING (true);


-- 2. `routines` (Plantillas de usuario)
CREATE TABLE public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios ven y manejan sus propias rutinas" 
    ON public.routines FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 3. `routine_exercises` (Ejercicios dentro de la plantilla)
CREATE TABLE public.routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;

-- Para RLS dependemos de si la rutina le pertenece al usuario
CREATE POLICY "Manejo de ejercicios de rutinas propias" 
    ON public.routine_exercises FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.routines 
            WHERE routines.id = routine_exercises.routine_id 
            AND routines.user_id = auth.uid()
        )
    );


-- 4. `workouts` (Sesiones Activas o Pasadas)
CREATE TABLE public.workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL, -- NULL si es Ad-hoc
    start_time TIMESTAMPTZ DEFAULT now(),
    end_time TIMESTAMPTZ, -- NULL si la sesión está activa
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios manejan sus propios entrenamientos" 
    ON public.workouts FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 5. `workout_sets` (El Tracking de la Sesión)
-- Enum para el tipo de serie
CREATE TYPE public.set_type AS ENUM ('normal', 'warmup', 'dropset', 'failure');

CREATE TABLE public.workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
    set_number INT NOT NULL,
    set_type public.set_type DEFAULT 'normal',
    weight NUMERIC(5,2) DEFAULT 0.00, -- En KG, 0 si es bodyweight
    reps INT DEFAULT 0,
    rir INT CHECK (rir >= 0 AND rir <= 10),
    rpe NUMERIC(4,2) CHECK (rpe >= 1 AND rpe <= 10),
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manejo de series de entrenamientos propios" 
    ON public.workout_sets FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workouts 
            WHERE workouts.id = workout_sets.workout_id 
            AND workouts.user_id = auth.uid()
        )
    );

-- Funciones adicionales (triggers p. ej. actualizar timestamp de routine al editarla)
