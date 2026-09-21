# DIRECTIVES — Directivas del proyecto

> Derivado de `src/app/core/directives/`. Cada directiva tiene un `.README.md`
> al lado con su documentación detallada.

| Selector | Archivo | Documentación |
|---|---|---|
| `[appAnimateIn]` | `core/directives/animate-in.directive.ts` | `animate-in.README.md` |
| `[appBentoGridLayout]` | `core/directives/bento-grid-layout.directive.ts` | `bento-grid-layout.README.md` |
| `[appCardHover]` | `core/directives/card-hover.directive.ts` | `card-hover.README.md` |
| `[appClickOutside]` | `core/directives/click-outside.directive.ts` | `click-outside.README.md` |
| `[appHasRole]` | `core/directives/has-role.directive.ts` | `has-role.README.md` |
| `[appModalOverlay]` | `core/directives/modal-overlay.directive.ts` | `modal-overlay.README.md` |
| `[appPressFeedback]` | `core/directives/press-feedback.directive.ts` | `press-feedback.README.md` |
| `[appScrollReveal]` | `core/directives/scroll-reveal.directive.ts` | `scroll-reveal.README.md` |
| `[appSearchShortcut]` | `core/directives/search-shortcut.directive.ts` | `search-shortcut.README.md` |

## Regla

Toda animación pasa por directivas + `GsapAnimationsService`. Está prohibido
`@angular/animations` y `@keyframes` (lo bloquea el Architect Guard).
