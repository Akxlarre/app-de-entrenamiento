-- Crear tabla para control de versiones
CREATE TABLE IF NOT EXISTS public.app_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    build_number INTEGER NOT NULL,
    release_notes TEXT,
    force_update BOOLEAN DEFAULT false,
    apk_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para las actualizaciones
CREATE POLICY "Public app updates are viewable by everyone." ON public.app_updates
    FOR SELECT USING (true);

-- Crear el bucket de storage 'releases'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('releases', 'releases', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para el bucket 'releases' (Lectura pública)
CREATE POLICY "Public Access to Releases" ON storage.objects
    FOR SELECT USING (bucket_id = 'releases');
