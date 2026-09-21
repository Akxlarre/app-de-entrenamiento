> id: fix-043-cd-gemini-proxy
> refs: Señalado por el usuario: las Edge Functions y la key se manejan en el CD, no a mano
> status: done
> created: 2026-09-21

## Síntoma
Tras la spec 0018 el Coach dejó de responder en la APK. La Edge Function
`gemini-proxy` no estaba desplegada ni tenía su secreto.

## Causa Raíz
La spec 0018 quedó incompleta. `release.yml` ya tiene un job
`deploy_edge_functions` que despliega `mcp-server`, y el workflow ya recibía
`secrets.GEMINI_API_KEY`. Al crear `gemini-proxy` no la agregué a ese job, y al
sacar la key del build la dejé sin ningún destino: el workflow la seguía
pasando a `set-env.js`, que ya no la usa.

O sea: la infraestructura para automatizar esto ya existía y no la usé. La
indicación de correr `supabase secrets set` y `functions deploy` a mano era un
rodeo alrededor del CD, no la solución.

## Solución Propuesta
1. Desplegar `gemini-proxy` en el job `deploy_edge_functions`.
2. Publicar `GEMINI_API_KEY` como secreto de Supabase desde el mismo job,
   reusando el secreto de GitHub que ya estaba configurado.
3. Fallar ruidosamente si el secreto está vacío, en vez de desplegar un proxy
   que va a devolver 500 en cada mensaje.
4. Sacar `GEMINI_API_KEY` del step de build del APK, donde quedó sin uso.
5. Corregir la documentación que decía que esto era manual.

## Decisión
`gemini-proxy` se despliega SIN `--no-verify-jwt`, a diferencia de
`mcp-server`. El proxy gasta cuota de Gemini en cada llamada, así que conviene
que el gateway de Supabase rechace los JWT inválidos antes de que la petición
llegue siquiera a la función. La función igual valida por su cuenta.

## Acceptance Criteria
- [x] AC1: El job `deploy_edge_functions` despliega `gemini-proxy`.
- [x] AC2: El job publica `GEMINI_API_KEY` como secreto de Supabase.
- [x] AC3: El workflow falla con mensaje claro si `GEMINI_API_KEY` está vacío.
- [x] AC4: `GEMINI_API_KEY` ya no se pasa al step de build del APK.
- [x] AC5: La documentación refleja que el despliegue es automático.

## Test de regresión
No hay test automatizado posible para un workflow de GitHub Actions sin
ejecutarlo. Verificación: lectura del YAML y validación de sintaxis.

## Verificación

- YAML parseado con `yaml.safe_load`: válido. El job `deploy_edge_functions`
  quedó con 6 steps en el orden correcto (ref → mcp-server → secreto →
  gemini-proxy), y el step de `set-env.js` ya sólo recibe `SUPABASE_URL` y
  `SUPABASE_ANON_KEY`.
- `npm run test:ci`: 155 tests en verde (sin cambios de código de app).

NO verificado: el workflow no se ejecutó. La sintaxis de
`supabase secrets set --project-ref` y el despliegue real de `gemini-proxy`
sólo se confirman corriendo el CD.
