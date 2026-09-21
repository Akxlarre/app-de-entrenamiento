# ANTI-PATTERNS — Lo que está prohibido y por qué

> Derivado de `.claude/rules/*.md` y de lo que el Architect Guard bloquea en
> tiempo real. Si algo de acá aparece en un write, el hook lo rechaza.

## Bloqueado automáticamente por el Architect Guard

| Anti-patrón | Usar en su lugar | Por qué |
|---|---|---|
| `*ngIf`, `*ngFor`, `ngClass`, `ngStyle` | `@if`, `@for`, `[class.x]`, `[style.x]` | Control flow moderno de Angular |
| `@Input()`, `@Output()` | `input()`, `output()` | Signal-based, compatible con OnPush |
| Color hardcodeado (hex, `rgb()`, nombres de Ionic) | Token de `styles/tokens/_variables.scss` | Un solo origen de verdad visual |
| Import de Supabase en un componente de UI | Facade → Repository | La UI no habla con la BD |
| `@angular/animations`, `@keyframes` | GSAP vía `GsapAnimationsService` | Una sola capa de animación |
| Botón `type="submit"` sin `data-llm-action` | Agregar el atributo | AI-readability (regla LLM-01) |
| Botón destructivo sin `data-llm-action` | Agregar el atributo | AI-readability (regla LLM-02) |
| Crear archivos `.ts/.html/.scss` por Bash | Edit / Write | Si no, los guardrails no validan |

## Arquitectura

- **Nunca** inyectar `SupabaseService` ni un Repository en un componente.
- **Nunca** llamar `.client.from()` en un Facade — eso es del Repository.
- **Nunca** crear "Orchestrator Facades" ni Facades que inyecten otros Facades:
  genera dependencias circulares.
- **Nunca** poner lógica pesada (rankings, agregaciones) en un `computed()` de
  componente. Va a una función pura en `core/utils/`.
- **Nunca** componentes de dominio en `shared/` (`app-user-card`). `shared/` es
  presentacional puro.
- **Nunca** un componente en `shared/` que se use en un solo feature.

## Estado y datos

- **Nunca** mostrar skeleton si el Facade ya tiene datos cacheados (rompe SWR).
- **Nunca** `setInterval`/polling — existe Supabase Realtime.
- **Nunca** suscribir Realtime sin su `dispose()` en el ciclo de vida.
- **Nunca** suscribir Realtime a una VIEW: no emite eventos. Usá la tabla base.
- **Nunca** implementar SWR a mano — extendé `BaseFacade<T>`.
- **Nunca** llamar `initialize()` después de una mutación (mostraría skeleton);
  usá `refreshSilently()`.
- **Nunca** `BehaviorSubject` como estado de pantalla. Signals.

## Tests

- **Nunca** dar una tarea por terminada sin correr `npm run test:ci`.
- **Nunca** matchers de Jasmine: este proyecto usa Vitest (`vi.fn()`, no
  `jasmine.createSpy()`).
- **Nunca** `provideIcons()` en tests — no existe en lucide-angular 0.577+. Usá
  `LucideAngularModule.pick({...})`.
- **Nunca** tests de humo que sólo verifican que un input se renderiza. Testeá
  decisiones, no bindings.

## Git

- **Nunca** push directo a `main`.
- **Nunca** mezclar features independientes en un commit.
- **Nunca** `git add .` sin revisar el staging.

## Trampas específicas de este proyecto

- **El contrato de herramientas MCP está escrito dos veces** (servidor en
  `supabase/functions/mcp-server/index.ts` y cliente en `gemini.service.ts`).
  Agregar una tool en uno solo la deja invisible. Verificá con
  `GeminiService.verifyToolContract()`.
- **`app-drawer` necesita `[noPadding]="true"`** cuando su contenido maneja su
  propio scroll; si no, agrega `px-6 py-6` y un segundo contenedor scrolleable.
- **Altura dentro de un drawer: `h-full`**, nunca `calc(100vh - N)` a ojo: no
  contempla el header del panel ni los safe-area insets.
