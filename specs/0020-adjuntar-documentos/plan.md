> spec: 0020-adjuntar-documentos
> status: approved

## Estrategia

El cliente no interpreta el documento: lo manda tal cual como una parte
`input_document`. Toda la extracción vive en el proxy.

Ventaja de hacerlo así y no traducir a la API nativa: el request sigue siendo
OpenAI-compat de punta a punta, así que el bucle de herramientas, el streaming
SSE y el mapeo de errores del cliente no se tocan. El proxy sólo reemplaza una
parte de contenido por texto antes de reenviar.

## Artefactos

| Archivo | Cambio | AC |
|---|---|---|
| `supabase/functions/gemini-proxy/index.ts` | extracción de texto + reemplazo de la parte | AC4-AC6 |
| `core/services/ai/gemini.service.ts` | acepta `attachment` y lo arma como `input_document` | AC3, AC7 |
| `core/services/ai/coach.facade.ts` | pasa el adjunto | AC3 |
| `shared/components/coach-chat/coach-chat.component.ts` | `accept`, chip del adjunto, quitar | AC1, AC2 |
| `core/services/ai/gemini.service.spec.ts` | tests | AC8 |

## Topes

- 10 MB por archivo (se valida en cliente y en proxy).
- 200.000 caracteres de texto extraído; se trunca con aviso explícito.

## Riesgo

La extracción no se puede probar sin desplegar la función. El cliente sí se
testea. El riesgo queda acotado al proxy: si la extracción falla, devuelve un
error claro y el chat sigue funcionando para texto e imágenes.
