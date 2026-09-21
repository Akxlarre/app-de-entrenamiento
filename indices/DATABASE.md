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

## Trampas conocidas

- **`target_reps` es TEXT, no INT.** Mandar un número pelado funciona, pero se
  pierde la capacidad de expresar rangos.
- **`mesocycle_sessions.routine_id` es NOT NULL.** No se puede planificar una
  sesión sin una rutina que ya exista.
- **UNIQUE(week_id, day_number).** Repetir un día dentro del patrón semanal
  rompe el insert del mesociclo completo.
- **Varios mesociclos `active` a la vez no están impedidos por constraint.**
  `MesocycleFacade.loadActiveMesocycle()` toma el más reciente con `limit(1)`,
  así que un plan nuevo tapa al anterior en la UI sin avisar.
- **Realtime no funciona sobre VIEWs.** Hoy no hay ninguna definida.
