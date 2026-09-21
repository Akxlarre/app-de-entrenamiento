# STORES — Signal Stores

> Estado actual: **no hay ninguno**. `src/app/core/state/` no existe todavía.

Todo el estado de dominio vive hoy en Facades (`core/facades/`) que extienden
`BaseFacade<T>`. Según `.claude/rules/state-management.md`, un dominio migra a
Signal Store recién cuando su Facade pasa de ~5 `inject()` u ~8 signals.

Cuando se cree el primero, va en `core/state/{domain}.store.ts` y se lista acá.
