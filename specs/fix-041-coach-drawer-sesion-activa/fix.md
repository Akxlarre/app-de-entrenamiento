> id: fix-041-coach-drawer-sesion-activa
> refs: Reportado por el usuario: el chat IA abierto desde la sesión de entrenamiento se ve distinto al del FAB flotante
> status: done
> created: 2026-09-21

## Síntoma
El Coach IA abierto desde la sesión de entrenamiento activa (`active-workout.page.ts`) se ve peor que el mismo chat abierto desde la burbuja flotante del shell (`tabs-layout.component.ts`): márgenes extra, área de composición comprimida y scroll doble.

## Causa Raíz
Ambas vistas usan el **mismo** `<app-coach-chat>` con los mismos inputs/outputs. La diferencia está en el envoltorio `<app-drawer>`:

1. `active-workout.page.ts` no pasa `[noPadding]="true"`. Sin ese input, el body del drawer aplica `px-6 py-6` **y** `overflow-y-auto`, lo que mete padding alrededor del chat y crea un segundo contenedor scrolleable por encima del scroll propio del chat.
2. El wrapper usa altura fija `h-[calc(100vh-110px)]` en lugar de `h-full`. Ese 110px no corresponde a la altura real del header del drawer más los safe-area insets, así que la columna del chat no coincide con el panel y el input queda descolocado.

`tabs-layout.component.ts` sí pasa `[noPadding]="true"` y usa `h-full`, que es la combinación correcta.

## Solución Propuesta
Alinear el envoltorio de `active-workout.page.ts` con el de `tabs-layout.component.ts`: añadir `[noPadding]="true"` al `<app-drawer>` y cambiar el wrapper a `h-full flex flex-col relative`.

## Acceptance Criteria
- [x] AC1: El `<app-drawer>` del Coach IA en `active-workout.page.ts` pasa `[noPadding]="true"`.
- [x] AC2: El contenedor del chat usa `h-full` (sin altura calculada a mano) y cede la geometría al panel del drawer.
- [x] AC3: El markup del drawer del Coach en sesión activa es equivalente al de `tabs-layout.component.ts`.

## Test de regresión
Comparación estructural del bloque `<app-drawer>` del Coach en ambos archivos: mismos inputs de drawer y mismas clases de wrapper.

## Verificación
Comparación estructural del bloque `<app-drawer>` del Coach en ambos archivos: los
inputs del drawer (`isOpen`, `title`, `icon`, `noPadding`, `closed`) y las clases del
wrapper (`h-full flex flex-col relative`) ahora coinciden.

Ejecutados después, una vez arreglado el bootstrap remoto
(ver `docs/REMOTE-SESSIONS.md`): `npm run test:ci` en verde (145 tests, 0 fallos)
y `npm run lint:arch` con 0 errores. Ninguna advertencia corresponde a
`active-workout.page.ts`.
