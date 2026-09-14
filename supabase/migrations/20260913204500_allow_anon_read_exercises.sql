-- Permitir lectura del catálogo maestro de ejercicios a usuarios anónimos (anon) y autenticados (authenticated)
CREATE POLICY "Ejercicios visibles publicamente" 
    ON public.exercises FOR SELECT
    TO anon
    USING (true);
