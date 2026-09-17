#!/usr/bin/env bash
# luxe-agent-setup.sh — richtet auf dem Hetzner-Server den Browser-Auftragsnehmer ein.
# Idempotent: mehrfaches Ausführen ist gefahrlos.
#
#   bash /opt/abannews/server/luxe-agent-setup.sh
#
# Danach holt sich der Server alle 5 Minuten offene Aufträge aus dem Repo, führt sie
# mit einem echten Browser aus und pusht die Ergebnisse zurück. Es gibt bewusst KEINEN
# offenen Port: die Verbindung geht immer vom Server nach draussen.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/abannews}"
BRANCH="${BRANCH:-claude/luxestyle-status-tztnn1}"
PROFIL="${PROFIL:-/var/lib/luxe-agent/chrome-profil}"
INTERVAL="${INTERVAL:-5min}"
log() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }
[ -d "$APP_DIR/.git" ] || { echo "Repo fehlt unter $APP_DIR — erst server/abannews-server-setup.sh."; exit 1; }

log "Playwright + Chromium"
cd "$APP_DIR"
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
npm ls playwright >/dev/null 2>&1 || npm install --no-save playwright@1
npx --yes playwright install --with-deps chromium

log "Browser-Profil unter $PROFIL (überlebt Neustarts, trägt die Anmeldungen)"
install -d -m 700 "$PROFIL"

log "Starter /usr/local/bin/luxe-auftrag"
cat > /usr/local/bin/luxe-auftrag <<EOF
#!/usr/bin/env bash
# Holt offene Aufträge, führt sie aus, pusht die Ergebnisse. Vom Timer aufgerufen.
set -euo pipefail
cd "$APP_DIR"
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers LUXE_REPO="$APP_DIR" LUXE_PROFIL="$PROFIL"

git fetch --quiet origin "$BRANCH"
git checkout --quiet -B "$BRANCH" "origin/$BRANCH"

node server/luxe_auftrag_runner.mjs

if ! git diff --quiet -- auftraege || [ -n "\$(git status --porcelain auftraege)" ]; then
  git add auftraege
  git -c user.name='luxe-agent' -c user.email='agent@luxestyle.ch' \\
      commit -q -m 'Auftrag erledigt (Hetzner-Agent) [skip ci]'
  # Der Branch kann sich inzwischen bewegt haben — erst nachziehen, dann pushen.
  for v in 1 2 3 4; do
    git fetch --quiet origin "$BRANCH" && git rebase --quiet "origin/$BRANCH" || git rebase --abort || true
    git push --quiet origin "HEAD:$BRANCH" && break || sleep \$((v*4))
  done
fi
EOF
chmod 755 /usr/local/bin/luxe-auftrag

log "systemd-Timer (alle $INTERVAL)"
cat > /etc/systemd/system/luxe-agent.service <<EOF
[Unit]
Description=LuxeStyle Browser-Auftragsnehmer
After=network-online.target
[Service]
Type=oneshot
ExecStart=/usr/local/bin/luxe-auftrag
TimeoutStartSec=900
EOF
cat > /etc/systemd/system/luxe-agent.timer <<EOF
[Unit]
Description=LuxeStyle Browser-Auftragsnehmer (alle $INTERVAL)
[Timer]
OnBootSec=2min
OnUnitActiveSec=$INTERVAL
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now luxe-agent.timer

cat <<EOF

$(printf '\033[1;32m✅ Auftragsnehmer läuft.\033[0m') Prüfen:
  systemctl status luxe-agent.timer
  journalctl -u luxe-agent.service -n 50 --no-pager

$(printf '\033[1;33m⚠️ Ein Schritt bleibt für dich:\033[0m') das Browser-Profil einmal anmelden.
Frisches Chromium hat keine Sitzungen — Google Merchant, Shopify, BigBuy, Pinterest und
TikTok verlangen Login samt 2FA. Einmalig mit sichtbarem Fenster über einen SSH-Tunnel:

  # auf DEINEM Rechner:
  ssh -L 9222:127.0.0.1:9222 root@46.225.75.125
  # auf dem SERVER, in dieser Sitzung:
  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright open --browser chromium \\
     --user-data-dir=$PROFIL https://merchants.google.com

Der Tunnel ist Absicht: Port 9222 darf NIE offen im Internet stehen — wer ihn erreicht,
steuert den Browser mitsamt allen angemeldeten Sitzungen.
EOF
