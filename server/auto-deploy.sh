#!/usr/bin/env bash
# auto-deploy.sh — Poller: prüft, ob origin/main vorangeschritten ist, und
# deployt nur dann. Ersetzt die (gesperrte) GitHub-Action cloudflare-pages.yml.
# Wird vom systemd-Timer abannews-deploy.timer aufgerufen.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/abannews}"
BRANCH="${BRANCH:-main}"
cd "$APP_DIR"

# ⚠️ Seit der Spam-Markierung des GitHub-Kontos (2026-08-30) liefert GitHub das Repo
# fuer ANONYME Zugriffe als 404 — der Timer lief weiter, jeder Fetch scheiterte, und
# die Seite blieb auf dem Stand vom 29.08. ~03:00 UTC stehen (~90 Merges nicht live).
# Authentifiziert geht es weiter: GITHUB_TOKEN (Fine-grained PAT, nur "Contents: read"
# auf dieses Repo) in /etc/abannews/deploy.env eintragen. Der Token bleibt in der
# Env-Datei (chmod 600) und geht als Header mit — nie in die Remote-URL, nie ins Repo.
ENV_FILE="/etc/abannews/deploy.env"
if [ -z "${GITHUB_TOKEN:-}" ] && [ -f "$ENV_FILE" ]; then
  set -a; . "$ENV_FILE"; set +a
fi
if [ -n "${GITHUB_TOKEN:-}" ]; then
  git -c "http.https://github.com/.extraheader=AUTHORIZATION: bearer ${GITHUB_TOKEN}" \
    fetch --quiet origin "$BRANCH"
else
  echo "⚠ GITHUB_TOKEN fehlt in $ENV_FILE — anonymer Fetch (liefert 404, solange das Konto als Spam markiert ist)"
  git fetch --quiet origin "$BRANCH"
fi
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "· kein neuer Commit ($LOCAL) — nichts zu tun."
  exit 0
fi

echo "▶ Neuer Stand: $LOCAL → $REMOTE — pull + deploy"
git reset --hard "origin/$BRANCH"
exec /usr/local/bin/abannews-deploy
