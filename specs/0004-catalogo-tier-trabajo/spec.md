# Spec: Catálogo de Ejercicios como Tier 2

> id: 0004-catalogo-tier-trabajo
> refs: recorrido de flujos con la rúbrica del Manual de Campo.
>   Depende de 0001 (tokens y tiers) y 0003 (movimiento).
> status: in-progress
> created: 2026-09-15

## Contexto

Segunda vista migrada. Es **Tier 2 — Trabajo**: el usuario está
buscando un ejercicio, con atención parcial. No es un momento de
ceremonia y no debe competir con la tarea.

Medido en navegador antes de tocar nada:

| Criterio de la rúbrica | Hallazgo |
|---|---|
| 5 — Ergonomía | **11 objetivos bajo 44px**: los 10 chips de filtro miden **30px** y el buscador 42px |
| 4 — Legibilidad | Tres tamaños por debajo del piso de 13px: **10.88px**, 12.8px, 12px |
| 7 — Sistema | `#eab308` hardcodeado en iconos, fuera de tokens |
| 6 — Intensidad | La vista **no declara tier**: sin presupuesto gráfico ni entrada animada |

Los chips de filtro son el control más usado de la vista y son los
más chicos: 30px de alto para un dedo, en una fila horizontal donde
además están pegados entre sí.

Observado también: las filas de ejercicio llevan **todas el mismo
círculo idéntico** como icono. Doce elementos decorativos repetidos que
no distinguen nada — exactamente lo que la regla de densidad dice que
debe perder el tratamiento gráfico.

## Acceptance Criteria

- **AC-01** — La raíz declara `.tier-trabajo` y recibe la entrada
  animada de su tier.
- **AC-02** — Todo objetivo táctil de la vista mide ≥ 44px
  (`--target-min`). Incluye los chips de filtro y el buscador.
- **AC-03** — Ningún texto por debajo de `--text-floor` (13px).
- **AC-04** — Cero hex y cero `rgba()` hardcodeados **en la superficie
  de lista** (encabezado, buscador, chips, filas, estados): todo sale
  de tokens.

> **El drawer de detalle queda afuera de AC-04.** `explorer.page.ts`
> aloja también el panel que se abre al tocar una fila: ~130 líneas con
> su propio sistema de color hardcodeado. Es una superficie distinta,
> bajo demanda, y merece el mismo trato que el modal "Detalle de
> Sesión" en 0002: su propio slice, no una limpieza apurada al final de
> este. **No se da por cumplido sobre el drawer.**
>
> **Pendiente real de AC-04, detectado antes de cerrar (2026-09-15).**
> Clasificado por selector, seis valores hardcodeados siguen en estilos de
> la **superficie de lista**. AC-04 **no está cumplido** y el track queda
> abierto.
>
> | Línea | Selector | Valor |
> |---|---|---|
> | 413 | `.explorer-content` | `var(--ion-background-color, #121212)` |
> | 432 | `.custom-searchbar` | `var(--text-muted, #a1a1aa)` |
> | 489 | `.exercise-item` | `var(--text-primary, #fff)` |
> | 490 | `.exercise-item` | `rgba(255, 255, 255, 0.06)` |
> | 502 | `.exercise-item:active` | `rgba(255, 255, 255, 0.05)` |
> | 540 | `.empty-state` | `var(--text-muted, #a1a1aa)` |
>
> Los cuatro `var(--x, #hex)` son respaldos que nunca se usan porque el
> token siempre existe, pero siguen siendo hex literal. Los dos `rgba()` sí
> se renderizan. Se suspendió para priorizar fix-026, que es pérdida de
> datos; se retoma reactivando este track. Números de línea al momento de
> la detección.
- **AC-05** — Los iconos repetidos de la lista pierden el tratamiento
  decorativo: o distinguen algo real, o no están.
- **AC-06** — La vista tiene estado vacío y estado de carga
  alcanzables, y "sin resultados de búsqueda" se distingue de "todavía
  no hay ejercicios".
- **AC-07** — `npm run test:ci` pasa y `ng build` compila.

## Fuera de alcance

- El modal `exercise-selector`, que es otra superficie con su propio
  uso (se abre desde la sesión activa). Va en su track.
- La calidad de los datos sembrados (varias filas se llaman igual).
  Es un problema de seed, no de vista.

## Test de Regresión

`npm run test:ci` + `ng build`, y verificación en navegador de: buscar
un texto y ver resultados, filtrar por grupo muscular, y volver a medir
objetivos táctiles y tamaños de fuente.
