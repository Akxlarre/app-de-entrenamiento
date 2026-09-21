# DATABASE — Modelo de datos (Supabase/Postgres)

> status: FILLED
> Derivado de las migraciones en `supabase/migrations/`. Las 14 tablas tienen RLS
> habilitada. Fuente de verdad: las migraciones. Nunca alteres la BD a mano.

## Dominio

App de entrenamiento de fuerza/hipertrofia. Un usuario arma **rutinas**
(plantillas de ejercicios), las ejecuta como **workouts** (sesiones reales con
sus series), y opcionalmente las organiza en **mesociclos** (planes periodizados
de varias semanas). Un Coach IA lee y escribe estos datos vía MCP.

## Tablas

### Identidad

| Tabla | Propósito | Claves |
|---|---|---|
| `profiles` | Perfil del usuario | PK = `auth.users.id`; `role_id` (default 1), `household_id` |

### Catálogo

| Tabla | Propósito | Notas |
|---|---|---|
| `exercises` | Catálogo global de ejercicios | Bilingüe: `name_en`/`name_es`, `instructions_en`/`instructions_es`. Campos `category`, `muscle`, `equipment`. Lectura permitida a anon |

### Rutinas (plantillas)

| Tabla | Propósito | Relaciones |
|---|---|---|
| `routines` | Plantilla de rutina del usuario | `user_id` → auth.users |
| `routine_exercises` | Ejercicios de una rutina, ordenados | `routine_id` CASCADE, `exercise_id` RESTRICT, `order_index` desde 0 |

### Ejecución

| Tabla | Propósito | Notas |
|---|---|---|
| `workouts` | Sesión real de entrenamiento | `routine_id` NULLABLE (NULL = ad-hoc). `end_time` NULL significa **sesión activa** |
| `workout_sets` | Series de una sesión | `set_number`, `weight` (kg, NUMERIC(5,2)), `reps`, `rir` (0-10), `rpe` (1-10), `completed`, `completed_at`, `set_type` (enum `public.set_type`) |

### Periodización

| Tabla | Propósito | Constraints relevantes |
|---|---|---|
| `mesocycles` | Plan de varias semanas | `status` IN (active, completed, abandoned), `current_week`, `duration_weeks` |
| `mesocycle_weeks` | Semana del plan | `is_deload`, `focus_notes`. **UNIQUE(mesocycle_id, week_number)** |
| `mesocycle_sessions` | Sesión planificada de una semana | `routine_id` **NOT NULL**, `day_number` (1-7), `status` IN (pending, completed, skipped), `completed_workout_id`. **UNIQUE(week_id, day_number)** |
| `mesocycle_session_targets` | Objetivo por serie | `target_weight` NUMERIC, **`target_reps` es TEXT** (admite rangos tipo "8-10"), `target_rir` INTEGER |

### Feedback

| Tabla | Propósito | Notas |
|---|---|---|
| `workout_reports` | Reporte global de la sesión | `energy_level` (1-5), `session_rpe` (1-10), `satisfaction_rating` (1-5). **UNIQUE(workout_id)** |
| `workout_exercise_feedback` | Feedback por ejercicio | `category`, `rating` (1-5), `tags` TEXT[] |

### Otros

| Tabla | Propósito |
|---|---|
| `user_memory` | Memoria del Coach IA. `category` IN (injury, preference, goal, limitation, other) |
| `app_updates` | Versiones de la APK. `version`, `build_number`, `force_update`, `apk_path` |

## RLS

Las 14 tablas tienen Row Level Security habilitada. El patrón dominante en datos
del usuario es `FOR ALL USING (auth.uid() = user_id)`. Postgres reutiliza esa
expresión como `WITH CHECK` cuando no se declara una aparte, así que también
cubre el INSERT.

`exercises` es catálogo global con lectura abierta (incluye anon).

## Edge Functions

Ningún índice autogenerado las cubre (el AST sólo escanea `src/app/`), así que
van acá.

| Función | Qué hace | Secretos que necesita |
|---|---|---|
| `mcp-server` | Servidor MCP del Coach IA: expone las 14 herramientas contra la BD del usuario. Autentica por JWT y opera con service role. | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `gemini-proxy` | Proxy hacia Gemini para que la API key no viaje al bundle. Verifica el JWT y reenvía, preservando el stream SSE y el status. | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, **`GEMINI_API_KEY`** |

Desplegar y configurar:

```bash
npx supabase secrets set GEMINI_API_KEY=...
npx supabase functions deploy gemini-proxy
npx supabase functions deploy mcp-server
```

Si `gemini-proxy` no está desplegada, el chat falla con 404; si le falta el
secreto, con 500. Ambos casos tienen mensaje propio en la UI desde fix-042.

## Trampas conocidas

- **`target_reps` es TEXT, no INT.** Mandar un número pelado funciona, pero se
  pierde la capacidad de expresar rangos.
- **`mesocycle_sessions.routine_id` es NOT NULL.** No se puede planificar una
  sesión sin una rutina que ya exista.
- **UNIQUE(week_id, day_number).** Repetir un día dentro del patrón semanal
  rompe el insert del mesociclo completo.
- **Un solo mesociclo `active` por usuario**, garantizado por el índice único
  parcial `mesocycles_one_active_per_user` (`ON mesocycles (user_id) WHERE
  status = 'active'`). Para empezar un plan nuevo hay que archivar el anterior
  como `abandoned` primero; `crear_mesociclo_completo` lo hace con
  `reemplazar_activo=true`. `completed` y `abandoned` no tienen límite: el
  historial se acumula.
- **Realtime no funciona sobre VIEWs.** Hoy no hay ninguna definida.
