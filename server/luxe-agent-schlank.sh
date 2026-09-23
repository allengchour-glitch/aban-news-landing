#!/usr/bin/env bash
# luxe-agent-schlank.sh — Server-Platte voll (23.09.2026): Agent-Klon schlank neu aufsetzen.
#
#   curl -fsSL https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/server/luxe-agent-schlank.sh | bash
#
# BEFUND: luxe-agent.service scheiterte ab 22.09. 21:03 UTC mit «Unable to create temporary file … No space
# left on device» / «fetch-pack: invalid index-pack output». Der Agent-Klon holte alle 5 Minuten die VOLLE
# Historie des Arbeitszweigs (gepackt >5 GB, ~1'000 Commits in drei Tagen, seit 22.09. auch Reel-Videos unter
# social/reels). Der Agent braucht davon drei Ordner: server/, auftraege/, automation/browser/.
#
# DIESES SKRIPT (idempotent, löscht nur Wiederherstellbares):
#   1. Platz: Journal auf 100 MB, apt-Cache, git-Temp-Objekte, Browser-CACHES (Anmeldungen bleiben).
#   2. Ungepushte Auftragsergebnisse nach /root/luxe-auftraege-rettung-* sichern.
#   3. Klon neu: --depth=1, nur dieser Zweig, --filter=blob:none (Dateien nur bei Bedarf) + sparse (server,
#      auftraege, automation/browser). Gemessen 23.09.: 141 MB statt 2,6 GB (depth 1 allein) statt 7,8 GB (voll).
#      node_modules (Playwright) wird mitgenommen, nicht neu installiert.
#   4. Starter /usr/local/bin/luxe-auftrag: flacher Abruf (--depth=1), Nachziehen per Patch statt Rebase
#      (ein Rebase auf flacher Historie würde die Wurzel als Riesen-Patch nachspielen), danach Altobjekte weg.
#   5. Timer an, ein Lauf sofort, Plattenstand vorher/nachher.
set -uo pipefail
APP_DIR=/opt/luxe-agent/repo
BRANCH=claude/luxestyle-status-tztnn1
PROFIL=/var/lib/luxe-agent/chrome-profil
DEPLOY_DIR=/opt/abannews
[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }
log() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }

log "Platte vorher"; df -h / | tail -1
du -xsh /opt/* /var/lib/* /var/log /root /tmp 2>/dev/null | sort -h | tail -8

systemctl stop luxe-agent.timer luxe-agent.service 2>/dev/null || true

log "1) Platz schaffen (nur Wiederherstellbares)"
journalctl --vacuum-size=100M >/dev/null 2>&1 || true
apt-get clean >/dev/null 2>&1 || true
find "$APP_DIR/.git" -name 'tmp_*' -type f -delete 2>/dev/null || true
for c in Cache "Code Cache" GPUCache "Service Worker/CacheStorage"; do
  find "$PROFIL" -type d -name "$(basename "$c")" -path "*${c}" -prune -exec rm -rf {} + 2>/dev/null || true
done
df -h / | tail -1

log "2) Remote-URL + ungepushte Ergebnisse sichern"
URL="$(git -C "$APP_DIR" remote get-url origin 2>/dev/null || git -C "$DEPLOY_DIR" remote get-url origin 2>/dev/null || true)"
[ -n "$URL" ] || { echo "⛔ Keine Remote-URL gefunden (weder $APP_DIR noch $DEPLOY_DIR)."; exit 1; }
if [ -d "$APP_DIR/auftraege" ] && [ -n "$(git -C "$APP_DIR" status --porcelain auftraege 2>/dev/null)" ]; then
  R=/root/luxe-auftraege-rettung-$(date +%Y%m%d-%H%M)
  git -C "$APP_DIR" status --porcelain auftraege | awk '{print $2}' | while read -r f; do
    [ -e "$APP_DIR/$f" ] && install -D "$APP_DIR/$f" "$R/$f"; done
  echo "   ungepushte Auftragsdateien gesichert: $R"
fi

log "3) Klon schlank neu (depth 1, sparse)"
install -d -m 700 /opt/luxe-agent
[ -d "$APP_DIR/node_modules" ] && { rm -rf /opt/luxe-agent/node_modules.keep; mv "$APP_DIR/node_modules" /opt/luxe-agent/node_modules.keep; }
rm -rf "$APP_DIR"
git clone --quiet --depth=1 --single-branch --branch "$BRANCH" --filter=blob:none --sparse --no-checkout "$URL" "$APP_DIR" || { echo "⛔ Klonen fehlgeschlagen"; df -h /; exit 1; }
git -C "$APP_DIR" sparse-checkout set --cone server auftraege automation/browser
git -C "$APP_DIR" checkout --quiet "$BRANCH"
chmod 700 "$APP_DIR"
if [ -d /opt/luxe-agent/node_modules.keep ]; then mv /opt/luxe-agent/node_modules.keep "$APP_DIR/node_modules"
else (cd "$APP_DIR" && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npm install --no-save playwright@1 >/dev/null 2>&1); fi
du -sh "$APP_DIR/.git" "$APP_DIR" 2>/dev/null

log "4) Starter auf flachen Abruf umstellen"
cat > /usr/local/bin/luxe-auftrag <<EOF
#!/usr/bin/env bash
# Holt offene Aufträge (flach, nur neueste Fassung), führt sie aus, pusht die Ergebnisse. Vom Timer aufgerufen.
# 23.09.2026: --depth=1 + sparse — der volle Abruf hatte die Platte gefüllt (server/luxe-agent-schlank.sh).
set -euo pipefail
cd "$APP_DIR"
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers LUXE_REPO="$APP_DIR" LUXE_PROFIL="$PROFIL"
holen() { git fetch --quiet --depth=1 origin "$BRANCH" && git checkout --quiet -B "$BRANCH" FETCH_HEAD; }
holen

node server/luxe_auftrag_runner.mjs

if [ -n "\$(git status --porcelain auftraege)" ]; then
  git add -A auftraege
  git diff --cached --binary > /tmp/luxe-auftrag.patch
  for v in 1 2 3 4; do
    git -c user.name='luxe-agent' -c user.email='agent@luxestyle.ch' commit -q -m 'Auftrag erledigt (Hetzner-Agent) [skip ci]' || true
    git push --quiet origin "HEAD:$BRANCH" && break
    # Zweig hat sich bewegt: neueste Fassung holen und die eigenen Dateien als Patch darauflegen
    # (kein Rebase — auf flacher Historie gäbe es keinen gemeinsamen Vorfahren).
    git reset -q --hard; holen
    git apply --index /tmp/luxe-auftrag.patch || { echo "Patch passt nicht mehr — nächster Lauf"; break; }
    sleep \$((v*4))
  done
fi
# Alte flache Stände wegräumen, sonst wächst .git mit jedem Lauf.
git reflog expire --expire=now --all >/dev/null 2>&1 || true
git prune --expire=now >/dev/null 2>&1 || true
EOF
chmod 755 /usr/local/bin/luxe-auftrag

log "5) Timer an, ein Lauf jetzt"
systemctl daemon-reload
systemctl enable --now luxe-agent.timer
systemctl start luxe-agent.service; sleep 2
systemctl status luxe-agent.service --no-pager -l | tail -8
log "Platte nachher"; df -h / | tail -1
echo "Fertig. Die Cloud-Session sieht den Puls in auftraege/_puls.json beim nächsten Keepalive."
