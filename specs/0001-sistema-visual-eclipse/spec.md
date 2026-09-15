# Spec: Sistema visual Eclipse — Fundación

> id: 0001-sistema-visual-eclipse
> refs: dirección de arte aprobada por el usuario tras 5 iteraciones
>   (artifact "Rito de Hierro"); sistema resuelto y plan de 5 fases en
>   artifact "Manual de Campo". Este track cubre **solo la Fase 0**.
> status: in-progress
> created: 2026-09-15

## Contexto

El usuario pidió un rediseño visual completo con inspiración gótica/oscura,
calibrado contra Fire Force y Soul Eater. La dirección quedó definida como
**Eclipse**: tinta casi negra, carmesí como suelo de ceremonia, ember y oro
como fuego, y contraste alto por diseño.

Al estresar la propuesta contra el código aparecieron tres problemas que
obligan a resolver la fundación antes de tocar cualquier vista:

1. Los cuatro acentos de la dirección chocan con los cuatro colores
   semánticos ya cableados en PrimeNG (`--state-*`).
2. La paleta clara (~113 de 226 tokens) es inalcanzable: `index.html`
   fuerza `data-mode="dark"` y ninguna vista llama a `setColorMode()`.
3. Hay 213 estilos inline, 115 hex y 341 `rgba()` hardcodeados en
   componentes. Repintar vista por vista sin migrar tokens primero
   garantiza divergencia.

## Decisiones tomadas por el usuario

| Tema | Decisión |
|---|---|
| Intensidad | Momentos cargados, trabajo sobrio — 3 tiers |
| Modo claro | Matarlo y borrar la paleta clara |
| Semántica | La forma manda (ícono + borde + posición); el tono se alinea al brand |

## Alcance (Fase 0 — cero vistas tocadas)

- **0.1** Colapsar dark-only y aplicar la paleta Eclipse en `_variables.scss`
- **0.2** Tipografía: Anton / Oswald / Archivo + escala con pisos duros
- **0.3** Sincronizar Tailwind `@theme` y `_primeng-overrides.scss`
- **0.4** Clases de tier en `styles/layout/`
- **0.5** Semántica por forma: componente de alerta con ícono, borde y posición

## Acceptance Criteria

- **AC-01** — `_variables.scss` no contiene ningún selector `[data-mode='dark']`
  ni tokens de paleta clara. Los valores dark viven en `:root`.
- **AC-02** — Todos los nombres de token existentes siguen existiendo. Ningún
  componente necesita cambiar para seguir compilando.
- **AC-03** — `--text-primary` sobre `--bg-base` alcanza ≥ 15:1.
  `--text-secondary` y `--text-muted` sobre `--bg-surface` alcanzan ≥ 4.5:1.
- **AC-04** — `--color-primary-text` contrasta ≥ 4.5:1 sobre `--ds-brand`.
- **AC-05** — Los cuatro `--state-*` contrastan ≥ 4.5:1 sobre `--bg-surface`
  y se distinguen entre sí sin depender del tono (ícono + borde + posición).
- **AC-06** — Existen tokens de ergonomía: `--target-min` (44px),
  `--target-min-critical` (56px) y `--text-floor` (13px).
- **AC-07** — `npm run test:ci` pasa sin regresiones y `ng build` compila.

## Fuera de alcance

- Cualquier cambio en `src/app/**` (eso es Fase 1 en adelante).
- Migrar los 213 estilos inline / 115 hex de componentes. Se hace por vista,
  no en masa, para poder verificar cada una contra la rúbrica.
- Borrar `_view-transitions.scss` (huérfano desde fix-022) — merece su
  propio track de limpieza.

## Test de Regresión

`npm run test:ci` + `ng build` de producción tras cada slice. La app debe
seguir renderizando idéntica en estructura; solo cambia el color.
