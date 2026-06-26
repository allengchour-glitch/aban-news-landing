#!/usr/bin/env bash
# =============================================================================
#  linkedin-poster-setup.sh — täglicher LinkedIn-Auto-Post auf dem Hetzner-Server
# -----------------------------------------------------------------------------
#  Postet 1× pro Werktag (Mo–Fr, 08:00 Europe/Zurich) den nächsten Eintrag aus
#  social/linkedin_queue.json (automation/linkedin_post.py) und committet+pusht
#  die aktualisierte Queue zurück nach main — damit der "posted"-Status die
#  täglichen Deploy-Pulls übersteht (KEIN Doppelpost).
#
#  VORAUSSETZUNG (einmalig, vom User):
#   1) In /etc/abannews/deploy.env eintragen (NICHT ins Repo):
#        LINKEDIN_ACCESS_TOKEN=AQ...   (Scopes: openid profile w_member_social)
#      (LINKEDIN_AUTHOR_URN wird automatisch aus dem Token via /userinfo abgeleitet.)
#   2) Dieses Skript EINMAL als root auf dem Server laufen lassen:
#        sudo bash server/linkedin-poster-setup.sh
#
#  Hinweis: LinkedIn-Token laufen ~60 Tage ab → danach in deploy.env erneuern.
# =============================================================================
set -euo pipefail
REPO="${ABANNEWS_REPO:-/opt/abannews}"
ENV_FILE="/etc/abannews/deploy.env"
PYBIN="$(command -v python3 || echo /usr/bin/python3)"

[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE fehlt — erst den Auto-Deploy einrichten (abannews-server-setup.sh)."; exit 1; }
[ -d "$REPO/.git" ] || { echo "❌ Repo nicht unter $REPO — ABANNEWS_REPO setzen."; exit 1; }

# ── Wrapper: posten + Queue zurück nach main pushen (Anti-dup-Persistenz) ──
cat > /usr/local/bin/abannews-linkedin-post <<WRAP
#!/usr/bin/env bash
set -euo pipefail
cd "$REPO"
git pull --quiet origin main || true
if [ -z "\${LINKEDIN_ACCESS_TOKEN:-}" ]; then echo "kein LINKEDIN_ACCESS_TOKEN → skip"; exit 0; fi
# nächsten faelligen Post senden (Skript markiert ihn in der Queue als 'posted')
"$PYBIN" automation/linkedin_post.py || { echo "post fehlgeschlagen"; exit 0; }
# nur die Queue-Aenderung committen + pushen (anti-dup ueber Deploy-Pulls hinweg)
if ! git diff --quiet -- social/linkedin_queue.json; then
  git add social/linkedin_queue.json
  git -c user.name="aban-bot" -c user.email="bot@abannews.com" commit -q -m "LinkedIn: Post gesendet (Queue-Status aktualisiert)"
  git push --quiet origin HEAD:main || echo "push fehlgeschlagen (Queue lokal aktualisiert)"
fi
WRAP
chmod +x /usr/local/bin/abannews-linkedin-post

# ── systemd-Service + Timer (Mo–Fr 08:00 Europe/Zurich) ──
cat > /etc/systemd/system/abannews-linkedin.service <<EOF
[Unit]
Description=abannews LinkedIn Auto-Post
After=network-online.target
[Service]
Type=oneshot
WorkingDirectory=$REPO
EnvironmentFile=$ENV_FILE
ExecStart=/usr/local/bin/abannews-linkedin-post
EOF

cat > /etc/systemd/system/abannews-linkedin.timer <<EOF
[Unit]
Description=abannews LinkedIn Auto-Post (Mo-Fr 08:00 Europe/Zurich)
[Timer]
OnCalendar=Mon..Fri 08:00 Europe/Zurich
Persistent=true
[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now abannews-linkedin.timer
echo "✅ LinkedIn-Poster aktiv. Status:  systemctl status abannews-linkedin.timer"
echo "   Test sofort:  LINKEDIN_ACCESS_TOKEN=... /usr/local/bin/abannews-linkedin-post"
echo "   Logs:  journalctl -u abannews-linkedin.service -n 30 --no-pager"
