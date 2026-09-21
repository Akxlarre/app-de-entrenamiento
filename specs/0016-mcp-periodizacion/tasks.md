> spec: 0016-mcp-periodizacion

| # | Tarea | AC | Estado |
|---|---|---|---|
| 1 | `McpClientService.listTools()` + tipos `McpToolDefinition` | AC1 | done |
| 2 | Extraer `buildHeaders()` compartido en el cliente MCP | AC1 | done |
| 3 | Declarar `crear_mesociclo_completo` con `items` tipado | AC3 | done |
| 4 | Declarar `obtener_mesociclo_activo` en el cliente | AC4 | done |
| 5 | Sección 8 del system prompt (periodización) | AC5 | done |
| 6 | `MAX_TOOL_ITERATIONS` + corte limpio del bucle | AC6 | done |
| 7 | `verifyToolContract()` + `declaredToolNames` | AC2 | done |
| 8 | Servidor: `items` en `weekly_sessions` | AC7 | done |
| 9 | Servidor: tool + handler `obtener_mesociclo_activo` | AC4 | done |
| 10 | Tests de `listTools()` | AC8 | done (verde) |
| 11 | Tests de tools nuevas y tope del bucle | AC8 | done (verde) |

## Tareas agregadas durante la implementación

| # | Tarea | AC | Justificación | Estado |
|---|---|---|---|---|
| 12 | Validar `weekly_sessions` en el servidor antes de insertar | AC3 | Sin validación, violar `UNIQUE(week_id, day_number)` o mandar `routine_id` nulo produce un error crudo de Postgres que el modelo no sabe corregir. La tool no es realmente "invocable" (AC3) si falla de forma opaca. | done |
