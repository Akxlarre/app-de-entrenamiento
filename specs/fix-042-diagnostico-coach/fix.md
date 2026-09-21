> id: fix-042-diagnostico-coach
> refs: Reportado por el usuario: el Coach dejó de responder en la APK buildeada
> status: done
> created: 2026-09-21

## Síntoma
En la APK, el Coach IA responde siempre "Hubo un inconveniente al comunicarme
con tu Coach (Gemini). Verifica tu API Key o conexión."

## Causa Raíz
Dos problemas distintos que se suman:

1. **Configuración pendiente del despliegue.** Tras la spec 0018 la app llama a
   la Edge Function `gemini-proxy`. Si la función no está desplegada, o si le
   falta el secreto `GEMINI_API_KEY`, toda llamada falla.

2. **El mensaje de error no diagnostica nada.** Ese texto es el *fallback
   genérico* del catch: sólo 429 y 503 tienen mensaje propio, así que 401, 404,
   500, 502, CORS y fallas de red caen todos en el mismo cartel. Peor: menciona
   una API Key que, después de la spec 0018, **ya no existe del lado del
   cliente**. El mensaje manda a revisar lo único que no puede ser la causa.

## Solución Propuesta
Mapear los estados que ahora sí significan cosas distintas, para que el próximo
fallo se diagnostique leyendo la pantalla y no el código:

- Sin sesión de Supabase -> cortar antes de salir a la red y decirlo.
- 401 -> sesión expirada.
- 404 -> la función no está desplegada.
- 500/502 -> el proxy está desplegado pero mal configurado (probablemente falta
  `GEMINI_API_KEY`), incluyendo el mensaje que devuelve el servidor.
- Sin status (red/CORS) -> problema de conectividad.
- 429 y 503 se mantienen como están.

## Acceptance Criteria
- [x] AC1: Ningún mensaje de error del Coach menciona "API Key" como algo que el
      usuario deba verificar en la app.
- [x] AC2: 401, 404 y 500/502 producen mensajes distintos y accionables.
- [x] AC3: Si no hay sesión de Supabase, falla rápido sin llamar a la red.
- [x] AC4: 429 y 503 conservan su mensaje actual.
- [x] AC5: Tests cubren el mapeo nuevo.

## Test de regresión
Tests en `gemini.service.spec.ts` que verifican el mensaje por cada status.

## Verificación

`npm run test:ci`: **155 tests en verde** (subieron de 149), 0 fallos.
`npm run lint:arch`: 0 errores. `ng build`: compila.

Un test existente afirmaba el mensaje viejo para 401 ("Verifica tu API Key").
Se actualizó para verificar lo que de verdad importa de ese caso (que un 401
no dispara reintentos) sin atarlo a un texto que este fix cambia a propósito.

## Nota: esto NO reemplaza el despliegue

Este fix mejora el diagnóstico, no la causa de que el Coach no responda. Para
que funcione falta, del lado de Supabase:

    npx supabase secrets set GEMINI_API_KEY=...
    npx supabase functions deploy gemini-proxy

Con la APK reconstruida, el mensaje ahora dirá cuál de los dos falta.
