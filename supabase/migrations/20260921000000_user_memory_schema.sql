-- migration: user_memory_schema

CREATE TABLE IF NOT EXISTS public.user_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('injury', 'preference', 'goal', 'limitation', 'other')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view their own memory"
    ON public.user_memory
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory"
    ON public.user_memory
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory"
    ON public.user_memory
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory"
    ON public.user_memory
    FOR DELETE
    USING (auth.uid() = user_id);

-- Índices para mejorar el rendimiento de lectura
CREATE INDEX idx_user_memory_user_id ON public.user_memory(user_id);
