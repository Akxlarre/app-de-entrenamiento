> id: fix-044-deploy-functions-workflow
> refs: Necesidad de desplegar gemini-proxy sin publicar una APK
> status: done
> created: 2026-09-21

## Síntoma
No hay forma de desplegar una Edge Function sin correr el CD entero, que
además firma una APK y publica una actualización a los usuarios.

## Causa Raíz
`release.yml` acopla dos cosas independientes: el despliegue de Edge Functions
(servidor) y el release de la APK (cliente). Un arreglo server-side urgente
obliga hoy a cortar un release de la app.

Peor: `VERSION_TAG` sale de `github.ref_name`. Disparar `release.yml` con
`workflow_dispatch` sobre una rama publicaría en `app_updates` una versión
llamada `main` o el nombre de la branch.

## Solución Propuesta
Workflow propio `deploy-functions.yml`, disparable a mano, que sólo despliega
las Edge Functions y publica sus secretos. `release.yml` queda intacto.

## Acceptance Criteria
- [x] AC1: Existe `.github/workflows/deploy-functions.yml` con `workflow_dispatch`.
- [x] AC2: Despliega `mcp-server` y `gemini-proxy` con los mismos flags que `release.yml`.
- [x] AC3: Publica `GEMINI_API_KEY` y falla claro si falta.
- [x] AC4: No construye, firma ni publica ninguna APK.

## Test de regresión
Validación de sintaxis YAML y comparación de flags contra release.yml.

## Verificación

YAML válido. 7 steps, 0 que toquen la APK. Flags idénticos a release.yml.
El workflow NO se ejecutó todavía.
