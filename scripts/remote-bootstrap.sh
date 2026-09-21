#!/usr/bin/env bash
# remote-bootstrap.sh — Deja utilizable un clon recién creado (sesión remota,
# CI, o máquina nueva).
#
# Problema que resuelve: una sesión de Claude Code on the web clona el repo
# limpio. Sin node_modules no corren los tests, ni el lint arquitectónico, ni
# el generador de índices; y los índices autogenerados están gitignored, así
# que tampoco existen. El agente queda bloqueado por sus propios guardrails.
#
# Uso:
#   - Como "setup script" del entorno en claude.ai/code (recomendado).
#   - O a mano:  bash scripts/remote-bootstrap.sh
#
# Es idempotente: se puede correr las veces que haga falta.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "▶ remote-bootstrap: preparando el entorno"

# ─── 1. Dependencias ─────────────────────────────────────────────────────────
if [ -d node_modules ]; then
  echo "  · node_modules ya existe, se omite la instalación"
else
  if [ -f package-lock.json ]; then
    echo "  · npm ci"
    npm ci --no-audit --no-fund
  else
    echo "  · npm install (sin package-lock.json)"
    npm install --no-audit --no-fund
  fi
fi

# ─── 2. Índices autogenerados ────────────────────────────────────────────────
# Están en .gitignore a propósito (son artefactos del AST), así que en un clon
# limpio no existen. El Discovery Gate exige poder leer alguno antes de dejar
# escribir en src/app/, y el generador sólo reescribe entre marcadores: si el
# archivo no está, no lo crea. Por eso hay que sembrar el andamio primero.
echo "  · sembrando índices autogenerados"
mkdir -p indices
for name in COMPONENTS SERVICES FACADES MODELS USAGE-MAP; do
  if [ ! -f "indices/${name}.md" ]; then
    printf '# %s\n\n<!-- AUTO-GENERATED:BEGIN -->\n<!-- AUTO-GENERATED:END -->\n' \
      "${name}" > "indices/${name}.md"
  fi
done

echo "  · npm run indices:sync"
npm run indices:sync

echo "✅ Listo. Ya corren: npm run test:ci, npm run lint:arch, npm run indices:sync"
