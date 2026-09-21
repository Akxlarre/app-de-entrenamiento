> id: 0017-mesociclo-activo-unico
> status: done
> created: 2026-09-21
> refs: Deuda registrada en specs/0016-mcp-periodizacion

## Problema

Nada impide que un usuario tenga dos mesociclos con `status='active'` a la vez.
`MesocycleFacade.loadActiveMesocycle()` resuelve el empate con
`.order('created_at', desc).limit(1)`, así que el plan más nuevo **tapa en
silencio** al anterior: el usuario no lo ve más y no recibe ningún aviso.

Con `crear_mesociclo_completo` ahora expuesta al Coach IA (spec 0016), el
agujero es más fácil de tocar: bastaba con pedirle un plan nuevo.

Hoy sólo se mitiga por prompt, que no es una garantía.

## Acceptance Criteria

- [x] AC1: Existe un índice único parcial que impide dos mesociclos `active`
      por usuario a nivel de base de datos.
- [x] AC2: La migración es idempotente y sanea los datos existentes antes de
      crear el índice (si un usuario ya tiene varios activos, sobrevive el más
      reciente y el resto pasa a `abandoned`, que es justo lo que el usuario ya
      venía viendo en la UI).
- [x] AC3: `crear_mesociclo_completo` no revienta con un error crudo de Postgres
      cuando ya hay un plan activo: detecta la situación y devuelve un mensaje
      accionable.
- [x] AC4: La herramienta acepta reemplazar explícitamente el plan activo, para
      que el flujo no quede sin salida cuando el usuario sí quiere uno nuevo.
- [x] AC5: El system prompt refleja el nuevo contrato.
- [x] AC6: `indices/DATABASE.md` deja de listar esto como trampa abierta.

## Verificación

- `npx vitest run src/app/core/services/ai/`: 23 tests en verde, incluidos los
  dos nuevos (que `reemplazar_activo` sea boolean y que NO sea obligatorio —
  si fuera required el modelo lo mandaría siempre y archivaría el plan del
  usuario sin pedirle permiso).
- `tsc --noEmit` sobre los archivos tocados: limpio.

NO verificado: la migración no se ejecutó contra ninguna base. El saneo y el
índice están escritos y son idempotentes, pero nadie los corrió. Aplicar con
`npx supabase db push` (o el flujo de migraciones que uses) y confirmar que el
índice `mesocycles_one_active_per_user` quedó creado.

Tampoco se ejercitó el pre-chequeo del servidor contra Supabase real.
