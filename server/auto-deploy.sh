#!/usr/bin/env bash
# auto-deploy.sh — Poller: prüft, ob origin/main vorangeschritten ist, und
# deployt nur dann. Ersetzt die (gesperrte) GitHub-Action cloudflare-pages.yml.
# Wird vom systemd-Timer abannews-deploy.timer aufgerufen.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/abannews}"
BRANCH="${BRANCH:-main}"
cd "$APP_DIR"

git fetch --quiet origin "$BRANCH"
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "· kein neuer Commit ($LOCAL) — nichts zu tun."
  exit 0
fi

echo "▶ Neuer Stand: $LOCAL → $REMOTE — pull + deploy"
git reset --hard "origin/$BRANCH"
exec /usr/local/bin/abannews-deploy
