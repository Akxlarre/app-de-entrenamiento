> id: 0016-mcp-periodizacion
> status: draft
> created: 2026-09-21
> refs: Auditoría del MCP pedida por el usuario tras fallar "hazme una periodización"

## Problema

El usuario pidió al Coach IA una periodización y el modelo no creó un mesociclo,
pese a que `crear_mesociclo_completo` está implementado y funcionando en el
servidor MCP (`supabase/functions/mcp-server/index.ts:340-414`).

### Causas encontradas

1. **Herramienta invisible.** `GeminiService.toolsDeclaration` declara 12 tools;
   el servidor expone 13. La única ausente es `crear_mesociclo_completo`. El
   modelo recibe `tools: this.toolsDeclaration`, así que literalmente no puede
   invocarla.
2. **Contrato duplicado a mano.** `McpClientService` sólo implementa `callTool`;
   nunca llama a `tools/list`. El handler `ListToolsRequestSchema` del servidor
   es código muerto para la app. Las dos listas se mantienen sincronizadas por
   disciplina, y derivaron.
3. **Prompt sin periodización.** El system prompt no menciona "mesociclo" ni
   "periodización" en ninguna de sus 7 secciones. Falta el puente conceptual.
4. **Schema inusable.** En el servidor, `weekly_sessions` es `type: 'array'` sin
   `items`; la estructura anidada va sólo en prosa. Portarlo tal cual haría que
   el modelo improvise la forma y el insert falle.
5. **Bucle sin tope.** `while (requiresMoreTools)` (gemini.service.ts:334) no
   tiene límite de iteraciones.
6. **Sin lectura del mesociclo activo.** `loadActiveMesocycle` toma el activo más
   reciente (`limit(1)`), así que un mesociclo nuevo creado por la IA tapa en
   silencio el que el usuario armó a mano. El modelo no tiene tool para
   consultarlo antes de crear.

### Verificado

- El flujo manual (`mesocycle.facade.ts:101-141`) y el MCP escriben en las mismas
  cuatro tablas, así que lo que cree el chat sí aparece en la app.
- RLS `FOR ALL USING (auth.uid() = user_id)` en las cuatro tablas; el INSERT pasa.
- `mesocycle_sessions.routine_id` es NOT NULL y `UNIQUE(week_id, day_number)`:
  el modelo debe traer routine_ids reales y no repetir día.
- `target_reps` es TEXT (admite rangos tipo "8-10"), no integer.

## Acceptance Criteria

- [x] AC1: `McpClientService` expone `listTools()` que llama `tools/list` por JSON-RPC.
- [x] AC2: `GeminiService` deja de declarar herramientas a mano donde sea posible y
      valida su lista contra el servidor, reportando divergencias.
- [x] AC3: `crear_mesociclo_completo` es invocable por el modelo, con `items` tipado
      completo para `weekly_sessions` (day_number, routine_id, targets[]).
- [x] AC4: Existe `obtener_mesociclo_activo` en servidor y cliente, y el prompt obliga
      a consultarla antes de crear uno nuevo.
- [x] AC5: El system prompt incluye una sección de periodización con el flujo completo.
- [x] AC6: El bucle de function calling tiene tope de iteraciones y corta limpio.
- [x] AC7: El schema de `weekly_sessions` del servidor se corrige igual que el del cliente.
- [ ] AC8: Tests en `gemini.service.spec.ts` y `mcp-client.service.spec.ts` cubren
      la nueva tool, el tope del bucle y `listTools()`.
      ESCRITOS PERO SIN EJECUTAR — ver Verificación. El AC no se da por cumplido
      hasta que `npm run test:ci` pase en verde.

## Verificación

Hecho y comprobado:
- `tsc --noEmit` sobre los tres archivos de producción modificados: sin errores
  (salvo los globals de `Deno` en la Edge Function, que son del entorno, y ya
  estaban antes de este cambio).
- Diff de contrato: las herramientas declaradas al modelo y las publicadas por el
  servidor ahora coinciden en las 14.
- Esquema SQL contrastado contra el schema de la tool: `target_reps` TEXT,
  `routine_id` NOT NULL, `UNIQUE(week_id, day_number)`, RLS por `auth.uid()`.
- Mismas tablas que el flujo manual, así que el plan creado por el chat aparece
  en la app.

NO ejecutado en este entorno:
- `npm run test:ci` y `npm run lint:arch`. El contenedor remoto no tiene
  `node_modules` y el Bash Guard bloquea la instalación de dependencias. Los
  tests de AC8 están escritos pero **sin correr**. Ejecutarlos localmente antes
  de mergear.
- No se probó contra la Edge Function desplegada: `crear_mesociclo_completo` y
  `obtener_mesociclo_activo` no se invocaron de verdad contra Supabase.

## Deuda registrada

- No hay constraint de BD que impida dos mesociclos `active` a la vez. Hoy se
  mitiga sólo por prompt (AC4). Un índice parcial único sobre `(user_id) WHERE
  status='active'` sería el fix duro, pero rompería datos existentes.
- La API key de Gemini viaja al bundle del navegador (`gemini.service.ts` llama
  a `generativelanguage.googleapis.com` desde el cliente). Conviene proxear por
  la Edge Function, que ya autentica por JWT. Fuera de scope de esta spec.

## Estado de cierre

La spec queda en `draft`, NO en `done`. AC1-AC7 están implementados y
verificados con `tsc`; AC8 no puede darse por cumplido sin ejecutar los tests.

Para cerrarla:
1. `npm install` en una máquina con red.
2. `npm run test:ci` — deben pasar los tests nuevos de `listTools()`, del
   contrato de herramientas y del tope del bucle.
3. `npm run lint:arch`.
4. Recién ahí marcar AC8, pasar status a `done` y vaciar `specs/.active`.

## Índices

No se agregaron componentes, servicios ni directivas nuevas: los cambios son
métodos nuevos sobre dos servicios que ya existían. Aun así, `indices/` está en
.gitignore y no existe en el clon remoto, así que no se pudo sincronizar ni
regenerar (`scripts/indices-sync.js` requiere node_modules). Al correr
`npm run indices:sync` localmente, conviene que `indices/SERVICES.md` refleje:

- `McpClientService.listTools()` — lee el contrato de herramientas del servidor MCP.
- `GeminiService.verifyToolContract()` / `declaredToolNames` — detectan divergencias
  entre lo declarado al modelo y lo que el servidor publica.
