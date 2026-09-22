-- Migración para soportar múltiples aplicaciones en la misma base de datos
ALTER TABLE public.app_updates 
ADD COLUMN IF NOT EXISTS app_target TEXT NOT NULL DEFAULT 'gym';

-- Actualizar comentarios
COMMENT ON COLUMN public.app_updates.app_target IS 'Identifica a qué aplicación pertenece esta actualización (ej. "gym", "shop")';
