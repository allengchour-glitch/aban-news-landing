#!/usr/bin/env bash
# =============================================================================
#  abannews-server-setup.sh — macht einen frischen Hetzner/Ubuntu-Server zur
#  ALWAYS-ON Auto-Deploy-Box für abannews.com.
# -----------------------------------------------------------------------------
#  WARUM: GitHub Actions ist account-weit gesperrt → der bisherige Auto-Deploy
#  (Workflow cloudflare-pages.yml) läuft nicht mehr; die Live-Site friert ein.
#  Dieser Server pollt stattdessen alle paar Minuten `origin/main`, baut bei
#  Änderungen `_site/` und deployt per Wrangler zu Cloudflare Pages — komplett
#  unabhängig von GitHub Actions.
#
#  EINMAL ausführen (als root auf dem frischen Server):
#     bash abannews-server-setup.sh
#  (Holt das Repo, installiert Node/Python/Wrangler, legt systemd-Timer an.)
#
#  Danach NOCH zwei Dinge (werden am Ende nochmal angezeigt):
#   1) Cloudflare-Token in /etc/abannews/deploy.env eintragen (NICHT ins Repo!).
#   2) Eigenen SSH-Public-Key hinterlegen + Passwort-Login abschalten
#      (Skript server/harden-ssh.sh) — wichtig, weil das Hetzner-Mail-Passwort
#      bereits unsicher ist und rotiert werden muss.
#
#  Idempotent: mehrfaches Ausführen ist sicher (vorhandenes wird aktualisiert).
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/allengchour-glitch/aban-news-landing.git}"
BRANCH="${BRANCH:-main}"            # Branch, von dem deployt wird (Default main)
APP_DIR="${APP_DIR:-/opt/abannews}"
ENV_DIR="/etc/abannews"
ENV_FILE="$ENV_DIR/deploy.env"
INTERVAL="${INTERVAL:-3min}"        # Poll-Intervall des Auto-Deploys
NODE_MAJOR="${NODE_MAJOR:-22}"

log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then echo "Bitte als root ausführen (sudo bash $0)"; exit 1; fi

# ── 1) System-Pakete ────────────────────────────────────────────────────────
log "System aktualisieren + Basis-Pakete"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl ca-certificates ufw fail2ban unattended-upgrades python3 python3-pip

# ── 2) Node.js (für Wrangler) ───────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt "$NODE_MAJOR" ]; then
  log "Node.js $NODE_MAJOR installieren"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
log "Node $(node -v) · npm $(npm -v)"

# ── 3) Firewall + Auto-Updates + fail2ban ───────────────────────────────────
log "Firewall (ufw) — nur SSH offen"
ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp
yes | ufw enable >/dev/null 2>&1 || true
systemctl enable --now fail2ban >/dev/null 2>&1 || true
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true

# ── 4) Repo holen/aktualisieren ─────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  log "Repo aktualisieren ($APP_DIR, Branch $BRANCH)"
  git -C "$APP_DIR" fetch --depth=1 origin "$BRANCH"
  git -C "$APP_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  log "Repo klonen → $APP_DIR (Branch $BRANCH)"
  git clone --depth=1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

# ── 5) Env-Datei (Secrets) — NUR lokal, nie im Repo ─────────────────────────
mkdir -p "$ENV_DIR"
if [ ! -f "$ENV_FILE" ]; then
  log "Secret-Vorlage anlegen → $ENV_FILE (bitte ausfüllen!)"
  cat > "$ENV_FILE" <<'EOF'
# Cloudflare-Pages-Deploy-Secrets für abannews — NICHT ins Git committen!
# Token-Rechte: Account · Cloudflare Pages · Edit
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
# Optional (sonst Default 'abannews'):
CF_PAGES_PROJECT=abannews
EOF
  chmod 600 "$ENV_FILE"
else
  log "Secret-Datei existiert bereits — unverändert ($ENV_FILE)"
fi

# ── 6) Deploy- und Poller-Skripte installieren ──────────────────────────────
log "Deploy-Skripte verlinken"
install -m 755 "$APP_DIR/server/deploy-now.sh"  /usr/local/bin/abannews-deploy
install -m 755 "$APP_DIR/server/auto-deploy.sh" /usr/local/bin/abannews-auto-deploy

# ── 7) systemd-Service + Timer (Auto-Deploy-Poller) ─────────────────────────
log "systemd-Timer (alle $INTERVAL prüfen)"
cat > /etc/systemd/system/abannews-deploy.service <<EOF
[Unit]
Description=abannews Auto-Deploy (poll main → build → Cloudflare Pages)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=$ENV_FILE
Environment=APP_DIR=$APP_DIR
Environment=BRANCH=$BRANCH
ExecStart=/usr/local/bin/abannews-auto-deploy
EOF

cat > /etc/systemd/system/abannews-deploy.timer <<EOF
[Unit]
Description=abannews Auto-Deploy alle $INTERVAL

[Timer]
OnBootSec=2min
OnUnitActiveSec=$INTERVAL
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now abannews-deploy.timer

# ── 8) Abschluss-Hinweise ───────────────────────────────────────────────────
cat <<EOF

\033[1;32m✅ Server-Setup fertig.\033[0m  Auto-Deploy-Timer läuft (alle $INTERVAL).

\033[1;33mJETZT NOCH 2 SCHRITTE:\033[0m
 1) Cloudflare-Token eintragen:
       nano $ENV_FILE          # CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
    Danach sofort 1x deployen:  abannews-deploy

 2) Server absichern (Hetzner-Passwort ist unsicher → rotieren):
       bash $APP_DIR/server/harden-ssh.sh "ssh-ed25519 AAAA... dein@key"
    (legt Key an, schaltet Passwort-Login + Root-Passwort-Login ab)

Nützliche Befehle:
   abannews-deploy                       # sofort bauen + deployen
   systemctl status abannews-deploy.timer
   journalctl -u abannews-deploy.service -n 50 --no-pager   # Deploy-Logs
EOF
