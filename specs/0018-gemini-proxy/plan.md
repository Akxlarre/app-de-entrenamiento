> spec: 0018-gemini-proxy
> status: approved

## Estrategia

Proxy delgado y transparente: reenvía el body tal cual y devuelve la respuesta
tal cual, incluido el stream. Así `GeminiService` no cambia su protocolo — sólo
cambia a dónde apunta y con qué credencial. Eso mantiene intacto el manejo de
errores (AC6) y los tests existentes.

Decisión: NO se reescribe el body en el servidor. El proxy no decide modelo ni
herramientas; sigue siendo el cliente quien arma el request. Menos superficie,
menos acoplamiento, y el fallback de modelo del cliente sigue funcionando.

## Artefactos

| Archivo | Cambio | AC |
|---|---|---|
| `supabase/functions/gemini-proxy/index.ts` | nueva función: auth JWT + passthrough con stream | AC1-AC3 |
| `src/app/core/services/ai/gemini.service.ts` | URL del proxy + JWT en vez de API key | AC4, AC6 |
| `src/environments/environment.ts` / `.prod.ts` | quitar `geminiApiKey` | AC5 |
| `src/app/core/services/ai/gemini.service.spec.ts` | ajustar y cubrir | AC7 |
| `docs/REMOTE-SESSIONS.md` o doc propia | cómo setear el secreto | AC2 |

## Riesgo

`GeminiService` necesita el JWT, que es async (`auth.getSession()`), mientras
que hoy la API key es sincrónica. Hay que resolver el token antes de armar las
llamadas, tanto en el bucle de tools como en el `fetch` del stream.
