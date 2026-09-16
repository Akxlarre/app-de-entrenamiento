-- spec:
--   tables_added: []
--   columns_added: []
--   breaking: true
--   description: "mesocycle_sessions.routine_id pasa de ON DELETE CASCADE a ON DELETE RESTRICT: borrar una rutina usada por un plan deja de destruir en silencio sus sesiones y objetivos de progresión."
-- /spec

-- fix-026-cascade-rutina-destruye-plan
--
-- Antes: borrar una rutina eliminaba en cascada las sesiones del plan que
-- la usaban y, por session_id, sus mesocycle_session_targets (peso, reps y
-- RIR planificados). Sin aviso, y por dos caminos: el diálogo de la app y
-- la herramienta eliminar_rutina del Coach IA, que borra desde la Edge
-- Function mcp-server sin pasar por la app. Un guard en el cliente no cubre
-- el segundo camino; la base sí.
--
-- Después: el borrado se rechaza con 23503 (foreign_key_violation) mientras
-- algún plan use la rutina. Para borrarla hay que eliminar ese plan primero,
-- cosa que la app ya permite (MesocycleFacade.deleteMesocycle).
--
-- breaking: true porque cambia un comportamiento observable: un DELETE que
-- antes tenía éxito ahora falla. Los dos llamadores manejan el 23503.
--
-- Idempotente: DROP IF EXISTS + ADD. El nombre del constraint se verificó
-- en la base viva vía pg_constraint, no se asumió por convención. Si el
-- nombre fuera otro, el DROP no haría nada y el ADD crearía un segundo
-- vínculo, dejando vivo el CASCADE original.

ALTER TABLE public.mesocycle_sessions
  DROP CONSTRAINT IF EXISTS mesocycle_sessions_routine_id_fkey;

ALTER TABLE public.mesocycle_sessions
  ADD CONSTRAINT mesocycle_sessions_routine_id_fkey
  FOREIGN KEY (routine_id) REFERENCES public.routines (id) ON DELETE RESTRICT;
