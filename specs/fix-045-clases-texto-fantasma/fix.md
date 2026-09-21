> id: fix-045-clases-texto-fantasma
> refs: Reportado por el usuario: el título del modal de actualizar se ve negro
> status: done
> created: 2026-09-21

## Síntoma
En el modal de actualización el título aparece negro sobre fondo oscuro y
apenas se lee.

## Causa Raíz
`class="text-primary"` **no existe**. El `@theme` de `src/tailwind.css` registra
los tokens de texto como `--color-text-primary`, `--color-text-secondary` y
`--color-text-muted`, que en Tailwind v4 generan las utilidades
`text-text-primary`, `text-text-secondary` y `text-text-muted`.

`text-primary`, `text-secondary` y `text-muted` no se generan nunca. Verificado
contra el CSS compilado: `.text-primary` no aparece en `styles.css`, mientras
que `.text-text-primary` sí.

Como la clase no existe, el elemento hereda el color del padre. Donde ningún
ancestro fija color, cae al negro por defecto del navegador — que es justo lo
que se ve en el modal.

No es un caso aislado: hay **60 usos** en 7 archivos, incluidos el login, el
reset de contraseña y el render markdown del chat.

## Solución Propuesta
Reemplazar las tres clases fantasma por las utilidades reales, preservando los
prefijos de variante (`hover:`, etc.).

Se descarta registrar `--color-primary` en el `@theme`: ese nombre ya existe en
`_variables.scss` como el ember de marca, y declararlo en `@theme` lo pisaría a
nivel `:root`, repintando todo lo que usa el color de marca.

## Acceptance Criteria
- [x] AC1: No queda ningún uso como clase de `text-primary`, `text-secondary` ni
      `text-muted` en `src/app/`.
- [x] AC2: Las variantes (`hover:` y demás) se preservan.
- [x] AC3: No se toca `var(--text-primary)` ni ningún uso como custom property.
- [x] AC4: El build compila y el CSS resultante ya no depende de clases inexistentes.

## Test de regresión
Grep de clases fantasma sobre `src/app/` + verificación de que `.text-text-*`
existe en el CSS compilado.

## Verificación

- 60 reemplazos en 7 archivos. Grep posterior: **0 clases fantasma restantes**.
- Variantes preservadas (7 `hover:text-text-primary`).
- 19 archivos siguen usando `var(--text-primary)` como custom property, sin tocar.
- `ng build` compila y el CSS generado contiene `.text-text-primary`,
  `.text-text-secondary` y `.text-text-muted`.
- `npm run test:ci`: 155 en verde. `lint:arch`: 0 errores.

NO verificado: no se miró cada pantalla. El cambio es mecánico y el build lo
respalda, pero la confirmación visual del modal y del login es tuya.
