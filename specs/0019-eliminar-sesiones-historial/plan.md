> spec: 0019-eliminar-sesiones-historial
> status: approved

## Estrategia

Mutación optimista siguiendo `swr-pattern.md`: se saca de la lista al instante,
y si el servidor falla se restaura el estado previo con toast de error.

El orden importa: primero se libera la sesión del mesociclo (mientras el FK
todavía apunta), después se borra el workout. Al revés, el SET NULL ya habría
borrado el vínculo y no sabríamos qué sesión liberar.

## Artefactos

| Archivo | Cambio | AC |
|---|---|---|
| `core/facades/workout.facade.ts` | `deleteHistoryWorkout()` | AC4, AC5 |
| `features/workouts/history/history.page.ts` | botón + confirmación | AC1-AC3 |
| `app.component.ts` | montar `app-confirm-modal` | AC6 |
| `core/facades/workout.facade.spec.ts` | tests | AC7 |

## Riesgo

El borrado es irreversible y no hay papelera. Se mitiga con confirmación
explícita que lo dice; no se implementa soft-delete porque agregaría una columna
y filtros en todas las queries de historial, fuera del alcance de este pedido.
