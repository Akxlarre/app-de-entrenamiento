> id: 0020-adjuntar-documentos
> status: parcial
> created: 2026-09-21
> refs: Pedido del usuario: "el poder enviar documentos como pdf o otros tipos"

## Problema

El chat del Coach sólo acepta imágenes (`accept="image/*"`). No se le puede
mandar un PDF con una rutina, un informe o una pauta.

## Restricción encontrada

La capa OpenAI-compat de Gemini que usamos (`/v1beta/openai/chat/completions`)
soporta **texto, imágenes y audio, pero no documentos**. Los PDFs sólo entran
por la API nativa.

Tampoco se puede resolver en el cliente: no hay librería de PDF instalada y el
Bash Guard impide agregar dependencias.

## Decisión

Extraer el texto **en la Edge Function**. Deno importa librerías con
especificadores `npm:` sin instalar nada en el repo, y el proxy ya recibe el
cuerpo entero de la petición.

El cliente manda el documento como una parte de contenido propia; el proxy la
reemplaza por texto antes de reenviar a Gemini. Así **el protocolo no cambia**:
streaming, herramientas y manejo de errores siguen exactamente igual.

## Acceptance Criteria

- [x] AC1: El selector de archivos acepta documentos además de imágenes.
- [x] AC2: El usuario ve qué archivo adjuntó y puede quitarlo antes de enviar.
- [x] AC3: El cliente manda el documento como parte `input_document` con nombre,
      mime type y contenido.
- [ ] AC4: El proxy extrae texto de PDF y de formatos de texto plano
      (txt, md, csv, json) y lo inyecta como texto.
      IMPLEMENTADO PERO NO EJECUTADO — es una afirmación sobre comportamiento en
      runtime y el proxy no está desplegado. No se da por cumplido hasta probarlo
      contra un PDF real.
- [ ] AC5: Un tipo no soportado no rompe el chat: devuelve un mensaje claro.
      El camino de error del proxy tampoco se ejecutó. El lado cliente (que un
      400 muestre el detalle del servidor) sí está cubierto por tests.
- [x] AC6: Hay tope de tamaño de archivo y de texto extraído, para no volar el
      presupuesto de tokens.
- [x] AC7: Las imágenes siguen funcionando igual que antes.
- [x] AC8: Tests cubren el armado del mensaje con documento.

## Verificación

- `npm run test:ci`: **162 tests en verde** (subieron de 159), 0 fallos.
  Los 3 nuevos cubren: que el documento viaje como `input_document` con nombre,
  mime y contenido; que sin adjunto el mensaje siga siendo texto plano; y que la
  imagen tenga prioridad y no se mezcle con el documento.
- `ng build` compila. `lint:arch`: 0 errores.
- `tsc --noEmit` sobre la Edge Function: limpio (salvo globals de Deno).

NO verificado — lo más importante de esta spec:
- **La extracción de texto nunca se ejecutó.** El proxy no está desplegado, así
  que `unpdf` no se probó contra un PDF real. Es lo primero a mirar al
  desplegar: mandá un PDF con texto seleccionable y confirmá que el Coach
  responde sobre su contenido.
- Un PDF escaneado (sin capa de texto) devuelve error pidiendo una captura; ese
  camino tampoco se probó.
- El import dinámico `npm:unpdf` agrega latencia en el primer mensaje con PDF
  (cold start de la función). No está medido.

## Estado de cierre

La spec queda en `parcial`, NO en `done`. AC1-AC3 y AC6-AC8 están cumplidos y
verificados; AC4 y AC5 describen comportamiento del proxy en runtime y no se
pueden dar por cumplidos sin desplegarlo.

Para cerrarla:
1. Desplegar `gemini-proxy` (workflow `deploy-functions.yml`).
2. Mandar un PDF con texto seleccionable y confirmar que el Coach responde
   sobre su contenido.
3. Mandar un archivo de tipo no soportado y confirmar que aparece el mensaje
   explicativo y el chat sigue usable.
4. Recién ahí marcar AC4 y AC5 y pasar a `done`.
