> spec: 0017-mesociclo-activo-unico
> status: approved

## Estrategia

El invariante se fija en la BD (única fuente que no se puede eludir) y la
herramienta MCP se adapta para que el flujo siga teniendo salida.

Decisión: al reemplazar, el plan viejo pasa a `abandoned`, no se borra.
`completed` sería mentira (no se terminó) y borrar perdería historial.

## Artefactos

| Archivo | Cambio | AC |
|---|---|---|
| `supabase/migrations/2026...__mesocycles_single_active.sql` | saneo + índice único parcial | AC1, AC2 |
| `supabase/functions/mcp-server/index.ts` | pre-chequeo + parámetro de reemplazo | AC3, AC4 |
| `src/app/core/services/ai/gemini.service.ts` | schema del parámetro + prompt | AC4, AC5 |
| `indices/DATABASE.md` | actualizar trampas | AC6 |

## Riesgo

El saneo modifica filas existentes. Es alineación con lo que la UI ya mostraba
(sólo se veía el más reciente), no una pérdida de información visible.
