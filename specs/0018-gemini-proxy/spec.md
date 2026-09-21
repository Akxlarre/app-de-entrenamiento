> id: 0018-gemini-proxy
> status: done
> created: 2026-09-21
> refs: Deuda registrada en specs/0016-mcp-periodizacion

## Problema

`GeminiService` llama directo a `generativelanguage.googleapis.com` desde el
navegador con `Authorization: Bearer ${environment.geminiApiKey}`. Esa clave se
inyecta en build y queda en el bundle: cualquiera que abra devtools la extrae y
la usa contra la cuota del proyecto.

No hay ninguna clave filtrada en git (los environments tienen placeholders),
así que esto es una debilidad de arquitectura, no un incidente.

Ya existe una Edge Function que autentica por JWT de Supabase
(`mcp-server`), así que la pieza de confianza está disponible.

## Acceptance Criteria

- [x] AC1: Existe una Edge Function `gemini-proxy` que verifica el JWT del
      usuario antes de reenviar a Gemini y rechaza con 401 si no hay sesión.
- [x] AC2: La clave de Gemini vive sólo en el servidor (`Deno.env`), nunca en
      el bundle.
- [x] AC3: El proxy soporta streaming (SSE): el chat no puede dejar de escribir
      token a token.
- [x] AC4: `GeminiService` apunta al proxy y autentica con el JWT de Supabase.
- [x] AC5: `geminiApiKey` desaparece de `src/environments/*`.
- [x] AC6: El manejo de errores existente (429/503 con retry, 401, fallback de
      modelo) sigue funcionando.
- [x] AC7: Tests en verde, incluidos los que ya cubrían el manejo de errores.

## Verificación

- `npm run test:ci`: **149 tests en verde** (subieron de 145), 0 fallos. Los
  tests que ya cubrían 429/503 con retry y 401 siguen pasando sin tocarlos, que
  era el punto de AC6.
- Tests nuevos: que la llamada vaya al proxy y no a googleapis, y que tanto el
  POST como el fetch del stream manden el JWT.
- `ng build`: compila sin la `geminiApiKey`.
- Inspección del bundle generado: las únicas apariciones de `geminiApiKey` y de
  `generativelanguage.googleapis.com` son comentarios del código fuente (el
  build dev no los strippea). No queda ninguna llamada ni credencial.
- `npm run lint:arch`: 0 errores.

NO verificado:
- La Edge Function `gemini-proxy` no se desplegó ni se ejerció. El passthrough
  del stream (devolver `upstream.body` sin consumirlo) es correcto según la API
  de Deno, pero **no se probó con un SSE real**. Es lo primero que conviene
  mirar al desplegar: que el chat siga escribiendo token a token y no de golpe.
- Tampoco se probó el 401 del proxy contra un JWT inválido real.
