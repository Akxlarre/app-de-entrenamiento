# Sesiones remotas (Claude Code on the web / CI / clon nuevo)

Una sesión remota clona el repo limpio: sin `node_modules` y sin nada que esté
en `.gitignore`. Eso rompía el harness del blueprint de una forma poco obvia —
el agente quedaba bloqueado por sus propios guardrails.

## Qué fallaba

| Síntoma | Causa |
|---|---|
| **Discovery Gate bloquea todo write en `src/app/`** | Exige leer un archivo de `indices/`, pero `indices/` entero estaba en `.gitignore`, así que no existía. No había forma de levantar el bloqueo. |
| **`npm run indices:sync` no ayudaba** | Sólo reescribe entre marcadores en archivos que ya existen; no los crea. Y necesita `node_modules`. |
| **`npm run test:ci` y `lint:arch` no corrían** | Sin `node_modules`. |
| **`npm ci` fallaba** | Conflicto de peer deps: `vitest@^4` vs. el `peerOptional vitest@^3.1.1` de `@angular/build@20`. Los workflows lo sorteaban con `--legacy-peer-deps`, pero eso vivía sólo en los YAML de CI. |
| **Sync-check pide actualizar índices al cerrar** | Mismo origen: no hay `indices/` que actualizar. |

El efecto combinado: el agente podía leer y razonar, pero no podía escribir sin
pelearse con los gates, ni validar nada de lo que escribía.

## Cómo quedó resuelto

### 1. Índices: se separa lo generado de lo escrito a mano

`.gitignore` ya no ignora `indices/` completo. Ahora ignora sólo los cinco que
produce el AST:

```
indices/COMPONENTS.md
indices/SERVICES.md
indices/FACADES.md
indices/MODELS.md
indices/USAGE-MAP.md
```

Los escritos a mano **sí se versionan**, porque son conocimiento que ninguna
herramienta puede regenerar: `DATABASE.md`, `ANTI-PATTERNS.md`,
`DIRECTIVES.md`, `STYLES.md`, `PIPES.md`, `STORES.md`.

Es el criterio habitual: los artefactos generados no van a git, el conocimiento
escrito sí. Además evita los conflictos de merge que traería versionar cinco
archivos que se reescriben en cada `indices:sync`.

### 2. `.npmrc` fija `legacy-peer-deps=true`

Local, CI y sesiones remotas resuelven dependencias igual. `npm ci` funciona sin
flags. (Los `--legacy-peer-deps` de `.github/workflows/` quedaron redundantes,
pero son inofensivos.)

### 3. `scripts/remote-bootstrap.sh`

Instala dependencias, siembra el andamio de los cinco índices autogenerados y
corre `indices:sync`. Es idempotente.

```bash
bash scripts/remote-bootstrap.sh
```

## Cómo configurarlo (acción manual pendiente)

Los hooks de `.claude/` están protegidos por el File Protector, así que el
agente no puede cablear esto solo. Elegí una de las dos:

**Opción A — setup script del entorno (recomendada).** En claude.ai/code, en la
configuración del entorno, poné como setup script:

```bash
bash scripts/remote-bootstrap.sh
```

No toca el repo y corre antes de que la sesión empiece.

**Opción B — SessionStart hook.** Agregar a `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "bash scripts/remote-bootstrap.sh" }
        ]
      }
    ]
  }
}
```

## Deuda que queda

- El **Bash Guard bloquea instalar dependencias** desde el agente. Es correcto
  como política de seguridad, pero significa que si el bootstrap no corrió, el
  agente no puede recuperarse solo: hay que ejecutarlo por fuera.
- Los gates asumen que `indices/` existe. Con este arreglo existe siempre, pero
  el hook seguiría bloqueando en cualquier otro repo que no lo versione. Si el
  blueprint se reutiliza, conviene que el Discovery Gate degrade con un aviso en
  vez de un bloqueo duro cuando el directorio no está.
