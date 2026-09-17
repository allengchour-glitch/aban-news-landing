#!/usr/bin/env bash
# jetzt-anmelden.sh — startet den Anmelde-Browser und LAESST IHN LAUFEN.
#
# ⚠️ UMGEBAUT am 17.09.2026, nach dem ersten erfolgreichen Lauf. Die erste Fassung hing
# den Browser an das Terminalfenster (`wait $CHROME_PID`, Strg-C zum Beenden). Gemessen:
# der Browser startete, legte vier Tabs an — und war im selben Moment wieder weg, ohne
# dass jemand Strg-C gedrueckt haette. Das ist die falsche Bauweise, egal warum sie
# diesmal ausging: sich bei fuenf Diensten anzumelden dauert Minuten, und solange darf
# nichts davon abhaengen, dass eine SSH-Sitzung durchhaelt.
# Jetzt laeuft der Browser LOSGELOEST weiter (setsid). Das Fenster darf zu.
#
# ZU TIPPEN (eine Zeile, nur Buchstaben/Schraegstriche/Bindestriche — die Hetzner-Konsole
# frisst erste Zeichen, Zeilenumbrueche und Sonderzeichen, siehe unten):
#      bash /opt/luxe-agent/repo/server/jetzt-anmelden.sh
# und wenn du fertig angemeldet bist:
#      bash /opt/luxe-agent/repo/server/anmeldung-fertig.sh
set -uo pipefail
REPO=/opt/luxe-agent/repo
PROFIL="${PROFIL:-/var/lib/luxe-agent/chrome-profil}"
LOG=/var/log/luxe-anmelden.log
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }

echo "▶ 1/6  Verirrte SSH-Tunnel auf diesem Server beenden"
# Ein `ssh -L 9222:...` AUF dem Server zeigt auf den Server selbst und belegt den Port.
# Das Verwirrende: curl meldet dann «Empty reply from server» statt «Connection refused»
# — es lauscht ja etwas, es antwortet nur nie. Der Fehler zeigt dadurch auf den Browser,
# obwohl er beim Tunnel liegt. Der Tunnel gehoert auf den eigenen Rechner.
if pgrep -f "ssh -L 9222" >/dev/null 2>&1; then
  pgrep -af "ssh -L 9222" | sed 's/^/    beende: /'; pkill -f "ssh -L 9222" || true; sleep 2
else echo "    keiner gefunden — gut"; fi

echo "▶ 2/6  Neuesten Stand holen"
git -C "$REPO" pull -q --ff-only 2>&1 | sed 's/^/    /' || echo "    (pull übersprungen)"

echo "▶ 3/6  Agent anhalten und Profil freiraeumen"
systemctl stop luxe-agent.timer 2>/dev/null || true
systemctl stop luxe-agent.service 2>/dev/null || true
if pgrep -f -- "--user-data-dir=$PROFIL" >/dev/null 2>&1; then
  pkill -f -- "--user-data-dir=$PROFIL" 2>/dev/null || true; sleep 3
  pkill -9 -f -- "--user-data-dir=$PROFIL" 2>/dev/null || true; sleep 2
fi

# ⚠️ 17.09.2026: Hier stand nur der playwright-Aufruf — und der findet das Paket NUR,
# wenn man im Repo-Verzeichnis steht. Als Einzeiler aus /root aufgerufen scheiterte er
# mit «Chromium nicht gefunden», obwohl Chromium laengst installiert war. Die Meldung
# zeigte damit auf die Installation statt auf das Arbeitsverzeichnis.
# Regel daraus: Wer einen Pfad aufloest, darf sich nicht auf das Verzeichnis verlassen,
# aus dem jemand den Befehl zufaellig getippt hat. Drei Wege, der erste der beste.
CHROME="$( (cd "$REPO" && node -e "console.log(require('playwright').chromium.executablePath())") 2>/dev/null || true)"
[ -x "$CHROME" ] || CHROME="$(ls -d /opt/pw-browsers/chromium*/chrome-linux/chrome 2>/dev/null | head -1)"
[ -x "$CHROME" ] || CHROME="$(command -v chromium chromium-browser google-chrome-stable 2>/dev/null | head -1)"
[ -x "$CHROME" ] || {
  echo "✗ Chromium wirklich nicht gefunden. Gesucht wurde:"
  echo "    1) playwright im Repo $REPO"
  echo "    2) /opt/pw-browsers/chromium*/chrome-linux/chrome"
  echo "    3) chromium / chromium-browser / google-chrome-stable im PATH"
  echo "  Nachinstallieren:  cd $REPO && npx playwright install chromium"
  exit 1; }
echo "    Chromium: $CHROME"
install -d -m 700 "$PROFIL"

echo "▶ 4/6  Browser starten — losgeloest, er ueberlebt dieses Fenster"
# ⚠️ --window-size ist kein Schoenheitswunsch: ohne Angabe nimmt kopfloses Chromium
# 800x600. In chrome://inspect sieht man die Seite genau in dieser Groesse, und bei
# Pinterest war dadurch die halbe rechte Seite abgeschnitten — anmelden und klicken
# wird damit zur Qual. 1600x1000 entspricht einem normalen Bildschirm.
# setsid + nohup: eigene Sitzung, kein HUP beim Schliessen des Terminals.
setsid nohup "$CHROME" --headless=new --no-sandbox --disable-gpu \
  --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 \
  --user-data-dir="$PROFIL" --lang=de-CH \
  --no-first-run --no-default-browser-check --hide-crash-restore-bubble \
  --window-size=1600,1000 \
  "https://accounts.google.com/ServiceLogin?continue=https://merchants.google.com/mc/overview" \
  >"$LOG" 2>&1 < /dev/null &
sleep 4
for _ in $(seq 1 10); do
  curl -s --max-time 3 http://127.0.0.1:9222/json/version >/dev/null && break; sleep 2
done
curl -s --max-time 5 http://127.0.0.1:9222/json/version >/dev/null || {
  echo "✗ Der Steuerport antwortet nicht. Letzte Zeilen aus $LOG:"; tail -15 "$LOG"; exit 1; }
echo "    ✅ Browser läuft, Steuerport antwortet."

echo "▶ 5/6  Alte Tabs schliessen"
# ⚠️ 17.09.2026: Chromium stellt bei jedem Start die Tabs aus dem Profil wieder her, und
# das Skript legte oben drauf noch vier dazu. Gemessen ueber drei Laeufe: 5 → 12 → 29
# Tabs. In chrome://inspect steht pro Tab eine Zeile — bei 29 Zeilen findet niemand mehr
# die richtige, und jeder Tab kostet Arbeitsspeicher auf einem 4-GB-Server.
# Es bleiben nur die fuenf Dienste, die wir brauchen; alles andere wird geschlossen.
BEHALTEN='accounts.google.com|merchants.google.com|pinterest|bigbuy|shopify|tiktok'
node -e '
  const host = "http://127.0.0.1:9222";
  const behalten = new RegExp(process.argv[1], "i");
  (async () => {
    const liste = await (await fetch(host + "/json/list")).json();
    const seiten = liste.filter(t => t.type === "page");
    const gesehen = new Set();
    let zu = 0;
    for (const t of seiten) {
      // Nicht gebrauchte Adressen weg — und von jedem Dienst nur EINEN Tab behalten.
      const treffer = (t.url || "").match(behalten);
      const schluessel = treffer ? treffer[0].toLowerCase() : null;
      if (!schluessel || gesehen.has(schluessel)) {
        await fetch(host + "/json/close/" + t.id).catch(() => {});
        zu++;
      } else gesehen.add(schluessel);
    }
    console.log("    " + zu + " alte Tabs geschlossen, " + gesehen.size + " behalten");
  })().catch(e => console.log("    (Aufraeumen uebersprungen: " + e.message + ")"));
' "$BEHALTEN"
sleep 2

echo "▶ 6/6  Fehlende Tabs nachlegen"
# ⚠️ Chromium stellt Tabs aus dem Profil wieder her — beim ersten Lauf waren es dadurch
# 12 statt 5, und meine Meldung «erwartet: 5» sah nach Fehler aus, wo keiner war.
# Deshalb wird jetzt geprueft, was SCHON offen ist, statt blind nachzulegen.
OFFEN=$(curl -s --max-time 5 http://127.0.0.1:9222/json/list || echo "")
for U in "https://www.pinterest.ch/login/" \
         "https://www.bigbuy.eu/en/login" \
         "https://admin.shopify.com/store/au3j0y-hq" \
         "https://www.tiktok.com/login"; do
  KURZ=$(echo "$U" | sed 's|https://||; s|/.*||')
  if echo "$OFFEN" | grep -q "$KURZ"; then echo "    schon offen: $KURZ"; continue; fi
  E=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$U")
  curl -s --max-time 10 -X PUT "http://127.0.0.1:9222/json/new?$E" >/dev/null \
    && echo "    + $KURZ" || echo "    ⚠️ Tab fehlgeschlagen: $U"
done
echo "    → $(curl -s --max-time 5 http://127.0.0.1:9222/json/list | grep -c '"type": "page"') Tabs offen"

cat <<'ENDE'

────────────────────────────────────────────────────────────────────
Der Browser läuft jetzt WEITER. Dieses Fenster darfst du schliessen.

  BEI DIR AM PC:   ssh -L 9222:127.0.0.1:9222 root@46.225.75.125
                   (Fenster offen lassen — das IST der Tunnel)
  dann im Browser: chrome://inspect  →  links «Devices»
                   → [Configure…] → localhost:9222
                   → HÄKCHEN «Discover network targets» setzen
                     (eingetragen ist nicht aktiviert — daran hing es)

  Unter «Remote Target» pro Tab eine Zeile → «inspect» → anmelden.
  Anzumelden: Google (Merchant) · Pinterest · BigBuy · Shopify · TikTok

  ⚠️ Anmeldungen in deinem eigenen Brave zählen hier NICHT — anderes
     Profil, anderer Rechner. Nur was in DIESEN Tabs passiert, bleibt.

WENN DU FERTIG BIST, hier auf dem Server:
     bash /opt/luxe-agent/repo/server/anmeldung-fertig.sh
────────────────────────────────────────────────────────────────────
ENDE
