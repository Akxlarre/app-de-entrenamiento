> spec: 0018-gemini-proxy

| # | Tarea | AC | Estado |
|---|---|---|---|
| 1 | Edge Function `gemini-proxy` con auth JWT y passthrough de stream | AC1-AC3 | done |
| 2 | `GeminiService` apunta al proxy y usa el JWT | AC4 | done |
| 3 | Quitar `geminiApiKey` de los environments | AC5 | done |
| 4 | Quitar la inyección de la clave en `scripts/set-env.js` | AC5 | done |
| 5 | Tests | AC7 | done |

## Tareas agregadas durante la implementación

| # | Tarea | AC | Justificación | Estado |
|---|---|---|---|---|
| 6 | Sacar `generativelanguage.googleapis.com` del `connect-src` del CSP en `src/index.html` | AC2 | Descubierto al inspeccionar el bundle: el CSP seguía autorizando al navegador a llamar a Gemini directo. Dejarlo ahí mantiene abierta justo la vía que esta spec cierra. | done |
