# PIPES — Pipes del proyecto

> Derivado de `src/app/shared/pipes/`.

| Nombre en template | Archivo |
|---|---|
| `markdown` | `shared/pipes/markdown.pipe.ts` |
| `relativeTime` | `shared/pipes/relative-time.pipe.ts` |
| `translateExercise` | `shared/pipes/translate-exercise.pipe.ts` |

`translateExercise` resuelve `name_es` / `name_en` del catálogo de ejercicios
según el idioma activo — usalo en vez de leer el campo directo en el template.
