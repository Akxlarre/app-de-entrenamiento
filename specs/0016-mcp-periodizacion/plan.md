> spec: 0016-mcp-periodizacion
> status: approved
> created: 2026-09-21

## Estrategia

El problema de fondo es que el contrato de herramientas MCP está escrito dos veces
a mano (servidor y cliente) y nada verifica que coincidan. El plan ataca primero la
causa estructural (AC1, AC2) y después el caso concreto que el usuario reportó
(AC3-AC5), cerrando con robustez (AC6) y tests (AC8).

Decisión de diseño: **no** se genera `toolsDeclaration` dinámicamente desde el
servidor en runtime. Hacerlo agregaría un round-trip bloqueante antes de cada chat
y dejaría al chat caído si `tools/list` falla. En su lugar, la declaración sigue
siendo local (rápida, offline-friendly) pero se agrega `listTools()` + una
verificación de divergencia que avisa en consola. Es el equilibrio entre AC2 y no
degradar la latencia del chat.

## Artefactos afectados

| Archivo | Cambio | ACs |
|---|---|---|
| `src/app/core/services/ai/mcp-client.service.ts` | `listTools()` vía JSON-RPC `tools/list` | AC1 |
| `src/app/core/services/ai/gemini.service.ts` | 2 tools nuevas, sección 8 del prompt, tope de bucle, `verifyToolContract()` | AC2-AC6 |
| `supabase/functions/mcp-server/index.ts` | `items` en `weekly_sessions`, tool `obtener_mesociclo_activo` + handler | AC4, AC7 |
| `src/app/core/services/ai/mcp-client.service.spec.ts` | tests de `listTools()` | AC8 |
| `src/app/core/services/ai/gemini.service.spec.ts` | tests de tools nuevas y tope de bucle | AC8 |

## Pasos

1. `McpClientService.listTools()` — mismo patrón que `callTool` (JWT + apikey),
   método `tools/list`, tolerante a respuesta envuelta en `result`.
2. `GeminiService`: constante `MAX_TOOL_ITERATIONS = 8`. Al agotarse, se corta el
   bucle y se deja que el modelo redacte la respuesta final con lo que tenga.
3. `GeminiService.verifyToolContract()` — compara nombres declarados vs `tools/list`
   y loguea divergencias en ambos sentidos. No lanza: es diagnóstico.
4. Declarar `crear_mesociclo_completo` con `items` tipado completo, respetando el
   esquema SQL: `target_reps` es TEXT (rangos "8-10"), `routine_id` NOT NULL,
   `day_number` único por semana.
5. Declarar `obtener_mesociclo_activo` (sin params).
6. Servidor: handler `obtener_mesociclo_activo` y corrección del schema de
   `weekly_sessions` para que coincida exactamente con el del cliente.
7. Sección 8 del prompt: periodización, con obligación de consultar el mesociclo
   activo y traer routine_ids reales antes de crear.
8. Tests.

## Riesgos

- Crear un mesociclo con un mesociclo activo ya existente lo tapa en la UI
  (`loadActiveMesocycle` usa `limit(1)` por `created_at`). Mitigado por prompt
  (AC4), no por constraint de BD. Un fix duro requeriría un índice parcial único
  sobre `(user_id) WHERE status='active'`, que rompería datos existentes: queda
  fuera de scope y anotado como deuda.
- `verifyToolContract()` hace una llamada de red extra; se invoca sólo bajo demanda,
  nunca en el camino caliente del chat.

## Criterio de done

Todos los ACs de spec.md marcados, `npm run test:ci` verde y `npm run lint:arch`
sin hallazgos nuevos.
