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

# ⚠️ 17.09.2026, gemessen: Auf dem Server liefen ZWEI `ssh -L 9222:127.0.0.1:9222
# root@46.225.75.125` — also Tunnel, die vom Server auf den Server selbst zeigen. Sie
# hatten Port 9222 belegt, bevor Chromium ihn oeffnen konnte. Das Ergebnis war ein
# besonders irrefuehrendes Bild: `curl` meldete «Empty reply from server» statt
# «Connection refused» (da lauscht etwas und antwortet nichts), und im Browser blieb
# «Remote Target» leer — obwohl scheinbar alles lief.
# Der Tunnel wird IMMER vom eigenen Rechner aus gegraben, nie vom Server. Hier wird
# der Fall deshalb beim Namen genannt, statt ihn als «Steuerport antwortet nicht»
# zu tarnen.
# ⚠️ Die verbindliche Antwort auf «ist der Port frei» ist der BINDEVERSUCH, nicht das
# Befragen eines Hilfsprogramms. Erster Entwurf pruefte mit `ss` — und `ss` fehlt in
# manchen Umgebungen ganz (im Cloud-Container dieses Projekts z. B.). Dort haette die
# Pruefung still «frei» gemeldet und den irrefuehrenden Zustand durchgelassen, gegen den
# sie gebaut ist. `ss` dient hier nur noch dazu, den Schuldigen zu BENENNEN.
if ! node -e '
  const net=require("net"), s=net.createServer();
  s.once("error",e=>process.exit(e.code==="EADDRINUSE"?1:0));
  s.once("listening",()=>s.close(()=>process.exit(0)));
  s.listen(9222,"127.0.0.1");
' 2>/dev/null; then
  echo "✗ Port 9222 ist schon belegt."
  command -v ss >/dev/null 2>&1 && ss -ltnp 2>/dev/null | grep "127.0.0.1:9222" | sed 's/^/    /'
  if ps -eo pid,args --no-headers | grep -q "[s]sh -L 9222"; then
    echo
    echo "  Es läuft ein SSH-TUNNEL auf DIESEM Server, der auf DIESEN Server zeigt."
    echo "  Das ist eine Schleife: sie hält den Port, Chromium kommt nicht mehr dran,"
    echo "  und curl meldet «Empty reply from server» statt «Connection refused»."
    echo "  Der Tunnel gehört auf DEINEN PC. Hier beenden mit:"
    ps -eo pid,args --no-headers | grep "[s]sh -L 9222" | awk '{printf "      kill %s\n", $1}'
  else
    echo "  Läuft dieses Skript vielleicht schon in einem anderen Fenster?"
  fi
  exit 1
fi

CHROME="$(node -e "console.log(require('playwright').chromium.executablePath())" 2>/dev/null || true)"
[ -x "$CHROME" ] || { echo "Chromium nicht gefunden — lief luxe-agent-setup.sh durch?"; exit 1; }

install -d -m 700 "$PROFIL"
echo "▶ Chromium mit Profil $PROFIL, Steuerport nur auf 127.0.0.1:9222"
# ⚠️⚠️ ZWEIMAL KORRIGIERT am 17.09.2026, und der zweite Fehler war meiner:
# Erst startete hier NUR Google Merchant, und die uebrigen vier Dienste musste man von
# Hand nachtippen — gemessen waren danach zwei von fuenf angemeldet, weil die Tabs
# schlicht fehlten. Also habe ich fuenf URLs an den Startbefehl gehaengt. Ergebnis auf
# dem Server:
#     [ERROR:chrome_main.cc] Multiple targets are not supported in headless mode.
#     ✗ Der Steuerport antwortet nicht
# Kopfloses Chromium nimmt GENAU EINE URL. Mit fuenf startet es gar nicht — aus einer
# Unbequemlichkeit war ein Totalausfall geworden.
# Richtig ist: mit EINER URL starten, die uebrigen Tabs danach ueber den Steuerport
# nachlegen (`PUT /json/new?<url>`). Verifiziert an Chromium 141: 1 Tab beim Start,
# 2 nach einem PUT.
"$CHROME" --headless=new --no-sandbox \
  --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 \
  --user-data-dir="$PROFIL" --lang=de-CH \
  "https://accounts.google.com/ServiceLogin?continue=https://merchants.google.com/mc/overview" &
CHROME_PID=$!
sleep 3

if ! curl -s --max-time 5 http://127.0.0.1:9222/json/version >/dev/null; then
  echo "✗ Der Steuerport antwortet nicht — Browser vermutlich nicht gestartet."; exit 1
fi
echo "✅ Browser läuft (PID $CHROME_PID). Steuerport antwortet."

# Die uebrigen vier Dienste als eigene Tabs nachlegen — einzeln, weil der Start nur
# eine URL vertraegt (siehe oben). Schlaegt einer fehl, wird er benannt statt verschwiegen:
# ein fehlender Tab heisst spaeter «Dienst nicht angemeldet», und dann sucht man am
# falschen Ende.
for U in "https://www.pinterest.ch/login/" \
         "https://www.bigbuy.eu/en/login" \
         "https://admin.shopify.com/store/au3j0y-hq" \
         "https://www.tiktok.com/login"; do
  E=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$U")
  curl -s --max-time 10 -X PUT "http://127.0.0.1:9222/json/new?$E" >/dev/null \
    && echo "   + Tab: $U" \
    || echo "   ⚠️ Tab liess sich nicht oeffnen: $U (im Browser von Hand aufrufen)"
done
TABS=$(curl -s --max-time 5 http://127.0.0.1:9222/json/list | grep -c '"type": "page"')
echo "   → $TABS Tabs offen (erwartet: 5)"
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
