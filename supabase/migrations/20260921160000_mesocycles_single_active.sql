-- =========================================================================================
-- MIGRATION: Un solo mesociclo activo por usuario
-- =========================================================================================
-- Nada impedía dos mesociclos con status='active' a la vez. La UI
-- (MesocycleFacade.loadActiveMesocycle) resuelve el empate con
-- ORDER BY created_at DESC LIMIT 1, así que el plan más nuevo tapaba al anterior
-- sin ningún aviso. Con crear_mesociclo_completo expuesta al Coach IA el agujero
-- quedó a un pedido de distancia.
--
-- Idempotente: se puede correr varias veces.

-- 1. SANEO ------------------------------------------------------------------
-- Si algún usuario ya tiene más de un activo, sobrevive el más reciente y el
-- resto pasa a 'abandoned'. Es exactamente lo que el usuario ya venía viendo:
-- la UI sólo le mostraba el último. No se borra nada.
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY created_at DESC, id DESC
        ) AS rn
    FROM mesocycles
    WHERE status = 'active'
)
UPDATE mesocycles m
SET status = 'abandoned'
FROM ranked r
WHERE m.id = r.id
  AND r.rn > 1;

-- 2. INVARIANTE -------------------------------------------------------------
-- Índice único parcial: a lo sumo un 'active' por usuario. Los 'completed' y
-- 'abandoned' quedan libres, que es lo que queremos (el historial se acumula).
CREATE UNIQUE INDEX IF NOT EXISTS mesocycles_one_active_per_user
    ON mesocycles (user_id)
    WHERE status = 'active';
