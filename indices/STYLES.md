# STYLES — Sistema visual

> Fuente de verdad: `src/styles/tokens/_variables.scss` (186 tokens CSS).
> Este índice es el mapa; para la lista completa, leé ese archivo.

## Estructura

```
src/styles/
├── tokens/_variables.scss   # 186 custom properties — ÚNICA fuente de color/espaciado
├── layout/                  # Geometría de shell, tabs, safe areas
├── motion/                  # Curvas y duraciones para GSAP
├── vendors/                 # Overrides de PrimeNG e Ionic
├── _animations.scss
└── _view-transitions.scss
```

## Familias de tokens

| Prefijo | Para qué |
|---|---|
| `--brand-*` | Paleta de marca cruda (`bone`, `crimson`, `ember`, `gold`, `ink`, `iron`) |
| `--color-*` | Color semántico (`primary`, `primary-dark`, `primary-hover`, `primary-muted`, `primary-tint`, `primary-text`) |
| `--bg-*` | Superficies (`base`, `surface`, `elevated`, `subtle`, `glass-surface`) |
| `--text-*` | Texto (`primary`, `muted`, …) y también escala tipográfica (`--text-sm`) |
| `--border-*` | Bordes, incluidos los de jerarquía (`tier1`, `tier2`, `tier3`) |
| `--btn-*` | Botones: `primary`, `secondary`, `ghost` (fondo, texto, radio, padding, sombra) |
| `--card-*` | Tarjetas: fondo, borde, radio, padding, sombra y estado hover |
| `--space-*` | Escala de espaciado |
| `--radius-*` | Radios, incluido `--radius-full` |
| `--font-*` | Familias y pesos. `--font-display` es Anton, con piso `--font-display-floor` (28px) |
| `--target-min` | Piso de área táctil (44px) |
| `--accent-*` | Barra/glow de acento |
| `--overlay-*` | Backdrops de drawer y modal |

## Reglas duras

- **Prohibido el color hardcodeado.** El Architect Guard bloquea el write si
  encuentra hex, `rgb()` o nombres de color de Ionic en un componente. Todo sale
  de un token.
- **Prohibido `@keyframes` y `@angular/animations`.** Animación = GSAP vía
  `GsapAnimationsService` y las directivas de `core/directives/`.
- **Tailwind para layout, clases semánticas para identidad.** `p-4`, `flex`,
  `grid`, `gap-3` sí; componer `text-4xl font-bold tracking-tight` en vez de
  `.kpi-value`, no.
- **Anton no baja de 28px** (`--font-display-floor`): bajo ese tamaño deja de
  leerse.
- **Altura táctil mínima 44px** (`--target-min`).

## Jerarquía de tiers

Las páginas declaran su densidad con `.tier-trabajo`, `.tier-dato`, etc., que
ajustan `--tier-target` (por ejemplo, 56px en `.tier-dato`). Los bordes
`--border-tier1/2/3` acompañan esa jerarquía.
