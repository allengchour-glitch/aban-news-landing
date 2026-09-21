#!/usr/bin/env bash
# luxe-waechter-setup.sh — laesst den Aufseher (fixer_keepalive.sh) samt allen Tages-Waechtern
# DAUERHAFT auf dem Hetzner-Server laufen statt nur in den Arbeitsstunden der Cloud-Session.
#
# WARUM (gemessen 17.09./21.09.2026): der Cloud-Container wird angehalten, sobald die Session
# nicht arbeitet; alle Waechter bekommen nur die Arbeitszeit der Session. Der Server schlaeft nicht.
#
# WAS ES TUT (idempotent, als root):
#   1. eigener Klon nach /opt/luxe-waechter/repo  (NICHT der Agenten-Klon: dessen Runner macht
#      `git checkout -B` und wuerde die Ledger-Schreibvorgaenge der Waechter verwerfen)
#   2. die zwei festen Pfade der Skripte nachbilden: /home/user/aban-news-landing -> Klon,
#      /opt/node22 -> installiertes Node (26 bzw. 33 Skripte tragen sie fest, gemessen 21.09.)
#   3. Geheimnisse aus /etc/luxe/secrets.env (root, 600 — NIE im Repo) bei jedem Lauf nach /tmp
#      legen, so wie die Skripte sie erwarten; Shopify-Token per Client-Credentials frisch holen
#   4. systemd-Timer alle 10 Minuten: engine_keepalive.sh (startet Aufseher + Autocommitter,
#      raeumt Doppelstarts ab). Der Aufseher committet/pusht seine Ledger selbst (autocommit.sh).
#
#   bash /opt/luxe-agent/repo/server/luxe-waechter-setup.sh
#
# VORHER (Betreiber, 2 Minuten): /etc/luxe/secrets.env anlegen — Vorlage unten (Werte NICHT ins Repo).
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/luxe-waechter/repo}"
AGENT_DIR="${AGENT_DIR:-/opt/luxe-agent/repo}"
BRANCH="${BRANCH:-claude/luxestyle-status-tztnn1}"
SECRETS="${SECRETS:-/etc/luxe/secrets.env}"
INTERVAL="${INTERVAL:-10min}"
log() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }
[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }

if [ ! -s "$SECRETS" ]; then
  install -d -m 700 /etc/luxe
  cat > "$SECRETS.VORLAGE" <<'V'
# /etc/luxe/secrets.env — root, chmod 600. Werte eintragen, Datei nach secrets.env umbenennen.
SHOPIFY_SHOP=au3j0y-hq.myshopify.com
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
CJ_EMAIL=
CJ_API_KEY=
JUDGEME_PRIVATE_TOKEN=
V
  chmod 600 "$SECRETS.VORLAGE"
  echo "FEHLT: $SECRETS — Vorlage liegt unter $SECRETS.VORLAGE. Werte eintragen, dann erneut ausführen."; exit 2
fi
chmod 600 "$SECRETS"

if [ ! -d "$APP_DIR/.git" ]; then
  [ -d "$AGENT_DIR/.git" ] || { echo "$AGENT_DIR fehlt — erst server/luxe-agent-setup.sh."; exit 1; }
  URL="$(git -C "$AGENT_DIR" remote get-url origin)"
  log "eigener Klon nach $APP_DIR (Branch $BRANCH)"
  install -d -m 700 "$(dirname "$APP_DIR")"
  git clone --quiet --branch "$BRANCH" "$URL" "$APP_DIR"
  chmod 700 "$APP_DIR"
  git -C "$APP_DIR" config user.name "luxe-waechter"
  git -C "$APP_DIR" config user.email "luxe-waechter@server"
fi

log "feste Pfade nachbilden"
if [ ! -e /home/user/aban-news-landing ]; then
  install -d /home/user; ln -s "$APP_DIR" /home/user/aban-news-landing
fi
if [ ! -e /opt/node22/bin/node ]; then
  NODE="$(command -v node || true)"; [ -n "$NODE" ] || { echo "node fehlt (luxe-agent-setup.sh installiert es)."; exit 1; }
  install -d /opt/node22/bin; ln -sf "$NODE" /opt/node22/bin/node; ln -sf "$(dirname "$NODE")/npm" /opt/node22/bin/npm 2>/dev/null || true
fi
command -v python3 >/dev/null || { apt-get update -qq && apt-get install -y -qq python3 python3-pil >/dev/null; }
command -v curl >/dev/null || apt-get install -y -qq curl >/dev/null

log "Geheimnis-Lader"
cat > /usr/local/bin/luxe-secrets-nach-tmp.sh <<'S'
#!/usr/bin/env bash
# Legt die Geheimnisse so nach /tmp, wie die Waechter sie lesen (260 Skripte, gemessen 21.09.2026).
set -euo pipefail
set -a; . /etc/luxe/secrets.env; set +a
umask 077
printf 'CJ_EMAIL=%s\nCJ_API_KEY=%s\n' "$CJ_EMAIL" "$CJ_API_KEY" > /tmp/cj_creds.env
printf 'export CJ_EMAIL=%q CJ_API_KEY=%q JUDGEME_PRIVATE_TOKEN=%q SHOPIFY_CLIENT_ID=%q SHOPIFY_CLIENT_SECRET=%q SHOPIFY_SHOP=%q\n' \
  "$CJ_EMAIL" "$CJ_API_KEY" "${JUDGEME_PRIVATE_TOKEN:-}" "$SHOPIFY_CLIENT_ID" "$SHOPIFY_CLIENT_SECRET" "$SHOPIFY_SHOP" > /tmp/secrets_env.sh
[ -n "${JUDGEME_PRIVATE_TOKEN:-}" ] && printf 'export JUDGEME_PRIVATE_TOKEN=%q\n' "$JUDGEME_PRIVATE_TOKEN" > /tmp/judgeme.env
# Shopify-Admin-Token: Client-Credentials-Grant, ~24 h gueltig -> alle 6 h neu (CLAUDE.md, Kernfakten)
if [ ! -s /tmp/cj_shop_token.txt ] || [ "$(( $(date +%s) - $(stat -c %Y /tmp/cj_shop_token.txt) ))" -gt 21600 ]; then
  T=$(curl -s --max-time 30 -X POST "https://$SHOPIFY_SHOP/admin/oauth/access_token" -H 'Content-Type: application/json' \
      -d "{\"client_id\":\"$SHOPIFY_CLIENT_ID\",\"client_secret\":\"$SHOPIFY_CLIENT_SECRET\",\"grant_type\":\"client_credentials\"}" \
      | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))')
  [ -n "$T" ] && printf '%s' "$T" > /tmp/cj_shop_token.txt || echo "WARNUNG: Shopify-Token nicht erhalten" >&2
fi
# CJ-Token: 15 Tage gueltig, 1 Anfrage je 5 min erlaubt -> nur erneuern, wenn aelter als 10 Tage
if [ ! -s /tmp/cj_token.json ] || [ "$(( $(date +%s) - $(stat -c %Y /tmp/cj_token.json) ))" -gt 864000 ]; then
  curl -s --max-time 30 -X POST https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken \
    -H 'Content-Type: application/json' -d "{\"email\":\"$CJ_EMAIL\",\"password\":\"$CJ_API_KEY\"}" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); t=(d.get("data") or {}).get("accessToken"); json.dump({"accessToken":t},open("/tmp/cj_token.json","w")) if t else sys.exit(1)' \
    || echo "WARNUNG: CJ-Token nicht erhalten" >&2
fi
S
chmod 700 /usr/local/bin/luxe-secrets-nach-tmp.sh

log "systemd-Dienst + Timer ($INTERVAL)"
cat > /etc/systemd/system/luxe-waechter.service <<S
[Unit]
Description=LuxeStyle Aufseher-Keepalive (Tages-Waechter)
After=network-online.target
[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
Environment=REPO=$APP_DIR
ExecStartPre=/usr/local/bin/luxe-secrets-nach-tmp.sh
ExecStartPre=/usr/bin/git -C $APP_DIR fetch --quiet origin $BRANCH
ExecStart=/usr/bin/env bash -c 'cd $APP_DIR && git checkout --quiet origin/$BRANCH -- automation/engine_keepalive.sh automation/repo_vorspulen.sh 2>/dev/null; bash automation/engine_keepalive.sh'
TimeoutStartSec=900
S
cat > /etc/systemd/system/luxe-waechter.timer <<S
[Unit]
Description=LuxeStyle Aufseher alle $INTERVAL
[Timer]
OnBootSec=2min
OnUnitActiveSec=$INTERVAL
Persistent=true
[Install]
WantedBy=timers.target
S
systemctl daemon-reload
systemctl enable --now luxe-waechter.timer >/dev/null
systemctl start luxe-waechter.service || true
log "fertig — Stand: systemctl status luxe-waechter.timer; Log: journalctl -u luxe-waechter -n 50; Aufseher: tail /tmp/fixer_keepalive.log"
