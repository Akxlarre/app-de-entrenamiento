> id: 0019-eliminar-sesiones-historial
> status: done
> created: 2026-09-21
> refs: Pedido del usuario: "el poder eliminar sesiones del historial, ya que a veces me equivoco y manchan mis datos"

## Problema

No hay forma de borrar una sesión del historial. Un entrenamiento registrado por
error queda para siempre y contamina el volumen, el tonelaje y los análisis que
el Coach IA hace sobre esos datos.

## Contexto verificado

- Borrar la fila de `workouts` limpia solo lo suyo: `workout_sets`,
  `workout_reports` y `workout_exercise_feedback` tienen ON DELETE CASCADE.
- `mesocycle_sessions.completed_workout_id` es ON DELETE SET NULL, así que el
  plan sobrevive. **Pero** `status` queda en `'completed'` apuntando a nada: la
  sesión del mesociclo se vería como hecha sin entrenamiento detrás. Hay que
  devolverla a `'pending'` ANTES de borrar, mientras el vínculo existe.
- `ConfirmModalComponent` y `ConfirmModalService` ya existen pero **nadie los
  usa ni los monta**. Se reutilizan en vez de crear un modal nuevo.

## Acceptance Criteria

- [x] AC1: Cada tarjeta del historial tiene una acción de borrado accesible, con
      `data-llm-action` y área táctil de al menos 44px.
- [x] AC2: El borrado pide confirmación explícita y avisa que es irreversible.
- [x] AC3: Tocar borrar NO abre el detalle de la sesión.
- [x] AC4: `WorkoutFacade.deleteHistoryWorkout()` borra de forma optimista y
      hace rollback con toast si el servidor falla.
- [x] AC5: Si la sesión pertenecía a un mesociclo, esa sesión del plan vuelve a
      `pending` en vez de quedar completada sin entrenamiento.
- [x] AC6: `ConfirmModalComponent` queda montado en el shell.
- [x] AC7: Tests del facade cubren éxito, rollback y el caso del mesociclo.

## Verificación

- `npm run test:ci`: **159 tests en verde** (subieron de 155), 0 fallos.
  Los 4 nuevos cubren: borrado optimista, orden meso→delete, rollback al fallar
  el borrado, y que NO se borre el workout si falla liberar la sesión del plan.
- `ng build`: compila. El build atrapó un `ariaHidden="true"` (string en un
  input boolean, TS2322) que los tests no veían; corregido, y también en el
  ejemplo de `.claude/rules/ai-readability.md`, que lo tenía mal.
- `lint:arch`: 0 errores.

NO verificado: el flujo no se probó en la app. El borrado real contra Supabase,
la cascada y el comportamiento del modal montado sólo se confirman usándolo.
