#!/usr/bin/env bash
# luxe-profil-anmelden.sh — meldet das Browserprofil des Agenten EINMALIG an.
#
# ⚠️ Korrektur vom 17.09.2026: Die erste Anleitung sagte «npx playwright open» plus
# 9222-Tunnel. Das geht nicht. `playwright open` startet ein Fenster mit sichtbarer
# Oberflaeche — auf einem Server ohne Bildschirm scheitert es an «Missing X server
# or $DISPLAY», und einen Debug-Port oeffnet es ohnehin nicht.
#
# Dieser Weg funktioniert und braucht auf deinem Rechner NICHTS zu installieren:
# Chromium laeuft hier ohne Bildschirm, oeffnet aber seinen Steuerport auf
# 127.0.0.1:9222; du tunnelst diesen Port und bedienst den Browser mit den
# Entwicklerwerkzeugen deines eigenen Chrome (chrome://inspect). Tippen, klicken und
# 2FA gehen darueber ganz normal.
#
#   1) HIER:          bash /opt/luxe-agent/repo/server/luxe-profil-anmelden.sh
#   2) BEI DIR:       ssh -L 9222:127.0.0.1:9222 root@46.225.75.125
#   3) BEI DIR:       Chrome -> chrome://inspect -> "Configure..." -> localhost:9222
#                     eintragen -> unter "Remote Target" auf "inspect" klicken
#   4) Anmelden bei Google Merchant, Shopify, BigBuy, Pinterest, TikTok
#   5) HIER:          Strg-C — das Skript raeumt auf und startet den Timer wieder
#
# ⛔ Port 9222 bleibt an 127.0.0.1 gebunden und darf NIE offen im Internet stehen:
#    wer ihn erreicht, steuert den Browser mitsamt allen angemeldeten Sitzungen.
#    Deshalb der Tunnel — er ist keine Umstaendlichkeit, er ist der Schutz.
set -euo pipefail

PROFIL="${PROFIL:-/var/lib/luxe-agent/chrome-profil}"
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }

# Zwei Prozesse duerfen NIE gleichzeitig auf demselben Profil arbeiten — Chromium
# sperrt das Verzeichnis, und der Agent wuerde mitten im Anmelden dazwischenfunken.
# ⚠️ Den TIMER anzuhalten genuegt nicht: laeuft gerade ein Auftrag, haelt dessen
# Chromium das Profilverzeichnis gesperrt, und der Anmelde-Browser kaeme nicht hoch.
# Deshalb auch den laufenden Dienst beenden — er holt seine Auftraege ohnehin beim
# naechsten Tick wieder.
echo "▶ Agent anhalten (Timer UND laufender Auftrag), solange du anmeldest"
systemctl stop luxe-agent.timer 2>/dev/null || true
systemctl stop luxe-agent.service 2>/dev/null || true
for _ in $(seq 1 15); do
  pgrep -f -- "--user-data-dir=$PROFIL" >/dev/null 2>&1 || break
  sleep 1
done
if pgrep -f -- "--user-data-dir=$PROFIL" >/dev/null 2>&1; then
  echo "✗ Es läuft noch ein Browser auf demselben Profil. Bitte kurz warten und erneut starten."
  exit 1
fi
aufraeumen() {
  echo; echo "▶ Browser beenden, Timer wieder starten"
  kill "${CHROME_PID:-0}" 2>/dev/null || true
  sleep 2
  systemctl start luxe-agent.timer 2>/dev/null || true
  echo "✅ Fertig. Prüfen, was der Agent jetzt sieht:"
  echo "   echo '{\"id\":\"anmeldungen\",\"typ\":\"skript\",\"skript\":\"anmeldungen_pruefen.mjs\"}' \\"
  echo "     > /opt/luxe-agent/repo/auftraege/offen/anmeldungen.json"
}
trap aufraeumen EXIT INT TERM

CHROME="$(node -e "console.log(require('playwright').chromium.executablePath())" 2>/dev/null || true)"
[ -x "$CHROME" ] || { echo "Chromium nicht gefunden — lief luxe-agent-setup.sh durch?"; exit 1; }

install -d -m 700 "$PROFIL"
echo "▶ Chromium mit Profil $PROFIL, Steuerport nur auf 127.0.0.1:9222"
# ⚠️ 17.09.2026: Vorher startete hier NUR Google Merchant, und man musste die
# uebrigen Dienste von Hand nachtippen. Gemessen nach dem ersten Anmeldeversuch:
# Shopify und BigBuy waren angemeldet, Pinterest und Google NICHT — vier von fuenf
# Tabs fehlten schlicht. Deshalb kommen jetzt alle fuenf gleich als Tabs hoch; in
# chrome://inspect steht dann pro Tab eine Zeile, und du klickst sie der Reihe nach ab.
"$CHROME" --headless=new --no-sandbox \
  --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 \
  --user-data-dir="$PROFIL" --lang=de-CH \
  "https://accounts.google.com/ServiceLogin?continue=https://merchants.google.com/mc/overview" \
  "https://www.pinterest.ch/login/" \
  "https://www.bigbuy.eu/en/login" \
  "https://admin.shopify.com/store/au3j0y-hq" \
  "https://www.tiktok.com/login" &
CHROME_PID=$!
sleep 3

if ! curl -s --max-time 5 http://127.0.0.1:9222/json/version >/dev/null; then
  echo "✗ Der Steuerport antwortet nicht — Browser vermutlich nicht gestartet."; exit 1
fi
echo "✅ Browser läuft (PID $CHROME_PID). Steuerport antwortet."
echo
echo "   Jetzt BEI DIR:  ssh -L 9222:127.0.0.1:9222 root@46.225.75.125"
echo "                   (dieses Fenster OFFEN lassen — es IST der Tunnel)"
echo "   dann Chrome:    chrome://inspect  →  links «Devices»"
echo "                   → [Configure…] → localhost:9222 eintragen"
echo "                   → ⚠️ HÄKCHEN «Discover network targets» SETZEN"
echo "                   Erst dann erscheint der Block «Remote Target #localhost:9222»."
echo "                   Eingetragen ist nicht dasselbe wie aktiviert — genau daran"
echo "                   ist es am 17.09. hängen geblieben."
echo
echo "   Bleibt der Block leer, erst den Tunnel pruefen (bei DIR, drittes Fenster):"
echo "       curl http://127.0.0.1:9222/json/version"
echo "   JSON mit «Chrome/…» = Tunnel steht, es liegt am Häkchen."
echo "   «Connection refused» = SSH-Fenster zu oder dieses Skript hier beendet."
echo
echo "   Es sind FÜNF Tabs offen — in chrome://inspect steht jeder als eigene Zeile:"
echo "     1) Google (für Merchant Center)   2) Pinterest   3) BigBuy"
echo "     4) Shopify Admin                  5) TikTok"
echo "   Jede Zeile «inspect» anklicken, anmelden, Fenster zu, nächste Zeile."
echo
echo "   ⚠️ Deine Anmeldungen im eigenen Brave zählen hier NICHT — das ist ein anderes"
echo "      Profil auf einem anderen Rechner. Nur was in DIESEN Tabs passiert, bleibt."
echo
echo "   Danach hier Strg-C drücken."
wait "$CHROME_PID"
