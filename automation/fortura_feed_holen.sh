#!/bin/bash
# fortura_feed_holen.sh — lädt den täglichen Fortura-Feed (Art_DataFeed.CSV) für GitHub Actions.
#
# WARUM NEU STATT automation/fortura_fetch_feed.sh (Zweig claude/luxestyle-status-tztnn1): das Original ist an die Claude-
# Sitzung gebunden. Es liest die Zugangsdaten aus /tmp/fortura_env.sh (in Actions gibt es die Datei nie), endet bei Fehlern
# mit Exit 1 statt 2, prüft keine Mindestgrösse (nur «mehr als 100 Zeilen»), lädt nebenbei eine Strukturdatei, die der
# Abgleich nicht braucht, und schaltet die Zertifikatsprüfung ab (-k), weil die Sitzung hinter einem Proxy hängt.
# PROTOKOLL UND PFAD sind genau die des Originals: Synology-FileStation-Web-API auf Port 443 (nginx-Proxy vor der
# RackStation), Login SYNO.API.Auth -> SID, Download SYNO.FileStation.Download von /home/Art_DataFeed.CSV, Logout.
# Der Port 21 (FTP) und :5001 sind aus Cloud-Umgebungen gesperrt (Messung 23.07.2026), darum nur 443.
#
# NUR LESEN: ein Login, ein Download, ein Logout. Nichts wird auf dem Fortura-Server geschrieben oder gelöscht.
#
# Aufruf:  FORTURA_FTP_USER=… FORTURA_FTP_PW=… bash automation/fortura_feed_holen.sh [Zieldatei]
#          (Vorgabe Zieldatei: $FORTURA_CSV, sonst /tmp/fortura_feed.csv)
# Exit:    0 = Feed liegt vollständig am Ziel · 2 = Fehler, am Ziel liegt dann KEINE (halbe) Datei
# Schalter (alle optional):
#   FORTURA_MIN_BYTES      Mindestgrösse, Vorgabe 5000000 (5 MB; ein abgeschnittener Download oder eine JSON-Fehlerantwort fällt durch)
#   FORTURA_VERSUCHE       Versuche bei Netz-/Serverfehlern, Vorgabe 3 (falsche Zugangsdaten werden NIE wiederholt: Sperrgefahr)
#   FORTURA_PAUSE          Sekunden zwischen den Versuchen, Vorgabe 20
#   FORTURA_TLS_UNSICHER=1 schaltet die Zertifikatsprüfung ab (wie das Original). Nur nach Prüfung des Zertifikats setzen.
#
# GEHEIMNISSE: die Zugangsdaten gehen weder in die Befehlszeile noch ins Protokoll (kein «set -x», keine Ausgabe der Antworten
# ausser dem Fehlercode). curl liest sie aus Dateien in einem privaten Ordner (Modus 700), der beim Ende gelöscht wird.
set -u
set -o pipefail
umask 077

fehler() { echo "FEHLER (Fortura-Feed): $*" >&2; exit 2; }

[ -n "${FORTURA_FTP_USER:-}" ] && [ -n "${FORTURA_FTP_PW:-}" ] || {
  echo "OFFEN: FORTURA_FTP_USER und/oder FORTURA_FTP_PW fehlen." >&2
  echo "       In GitHub: Settings -> Secrets and variables -> Actions -> Repository secrets (Kundennr. 544341)." >&2
  echo "       Ohne beide Werte ist der Feed nicht abrufbar. Es wird NICHTS geraten und NICHTS geschrieben." >&2
  exit 2
}

# Adresse fest verdrahtet. Eine Ersatzadresse (nur für den Test mit einem Attrappen-Server) gilt nur zusammen mit FORTURA_TEST=1,
# damit eine verbogene Umgebungsvariable die Zugangsdaten nie an einen fremden Host schickt.
B="https://webtransfer.fortura.ch"
if [ "${FORTURA_TEST:-}" = "1" ] && [ -n "${FORTURA_BASIS:-}" ]; then B="$FORTURA_BASIS"; fi
PFAD_FEED="/home/Art_DataFeed.CSV"

OUT="${1:-${FORTURA_CSV:-/tmp/fortura_feed.csv}}"
MIN_BYTES="${FORTURA_MIN_BYTES:-5000000}"
VERSUCHE="${FORTURA_VERSUCHE:-3}"
PAUSE="${FORTURA_PAUSE:-20}"
case "$MIN_BYTES" in ''|*[!0-9]*) fehler "FORTURA_MIN_BYTES ist keine Zahl" ;; esac
case "$VERSUCHE" in ''|*[!0-9]*|0) fehler "FORTURA_VERSUCHE ist keine Zahl >= 1" ;; esac
case "$PAUSE" in ''|*[!0-9]*) fehler "FORTURA_PAUSE ist keine Zahl" ;; esac

NODE="${NODE:-$(command -v node 2>/dev/null || true)}"
[ -n "$NODE" ] || NODE=/opt/node22/bin/node
[ -x "$NODE" ] || fehler "node nicht gefunden (wird zum Lesen der JSON-Antworten gebraucht)"

TLS=()
if [ "${FORTURA_TLS_UNSICHER:-}" = "1" ]; then
  TLS=(-k)
  echo "HINWEIS: Zertifikatsprüfung ist abgeschaltet (FORTURA_TLS_UNSICHER=1)." >&2
fi

ARBEIT="$(mktemp -d)" || fehler "kein Arbeitsordner"
chmod 700 "$ARBEIT"
SID=""
abmelden() {
  # Die Sitzung wird immer freigegeben, auch nach einem Fehler. Fehler dabei sind egal.
  if [ -n "$SID" ]; then
    curl -sS "${TLS[@]}" --connect-timeout 15 --max-time 30 -G "$B/webapi/entry.cgi" \
      --data-urlencode "api=SYNO.API.Auth" --data-urlencode "version=1" --data-urlencode "method=logout" \
      --data-urlencode "session=FileStation" --data-urlencode "_sid=$SID" -o /dev/null >/dev/null 2>&1 || true
    SID=""
  fi
}
aufraeumen() { abmelden; rm -rf "$ARBEIT"; }
trap aufraeumen EXIT

printf '%s' "$FORTURA_FTP_USER" > "$ARBEIT/u"
printf '%s' "$FORTURA_FTP_PW"   > "$ARBEIT/p"

# JSON-Antwort lesen: gibt bei success=true den Wert des Pfads (z. B. data.sid) aus, sonst «FEHLERCODE:<n>» und Exit 1.
json_lesen() { # $1 Datei, $2 Pfad
  "$NODE" -e '
    const fs = require("fs"); let d;
    try { d = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch { console.log("FEHLERCODE:keine-json-antwort"); process.exit(1); }
    if (!d || d.success !== true) { console.log("FEHLERCODE:" + (d && d.error && d.error.code !== undefined ? String(d.error.code).replace(/[^0-9A-Za-z_-]/g, "") : "unbekannt")); process.exit(1); }
    let w = d; for (const k of process.argv[2].split(".")) { w = w == null ? undefined : w[k]; }
    if (w === undefined || w === null || w === "") { console.log("FEHLERCODE:feld-fehlt"); process.exit(1); }
    console.log(String(w));
  ' "$1" "$2"
}

versuch() {
  # 0 = Feed am Ziel (in $ARBEIT/feed), 10 = wiederholbarer Fehler (Netz, Server, zu klein), 20 = endgültiger Fehler (Zugangsdaten)
  local http rc antwort sid
  rm -f "$ARBEIT/login.json" "$ARBEIT/feed"

  # 1) Login -> SID. Die Zugangsdaten stehen in Dateien (name@datei), nie in der Befehlszeile.
  http=$(curl -sS "${TLS[@]}" --connect-timeout 30 --max-time 120 -X POST "$B/webapi/entry.cgi" \
    --data-urlencode "api=SYNO.API.Auth" --data-urlencode "version=6" --data-urlencode "method=login" \
    --data-urlencode "account@$ARBEIT/u" --data-urlencode "passwd@$ARBEIT/p" \
    --data-urlencode "session=FileStation" --data-urlencode "format=sid" \
    -o "$ARBEIT/login.json" -w '%{http_code}' 2>"$ARBEIT/curl.err"); rc=$?
  if [ $rc -ne 0 ]; then
    echo "  Login: Netzfehler (curl $rc: $(tr -d '\r\n' < "$ARBEIT/curl.err" | cut -c1-160))" >&2
    if [ $rc -eq 60 ] || [ $rc -eq 35 ] || [ $rc -eq 51 ] || [ $rc -eq 58 ] || [ $rc -eq 59 ] || [ $rc -eq 77 ]; then
      echo "  Das sieht nach einem Zertifikats-/TLS-Problem aus. Zertifikat von webtransfer.fortura.ch prüfen; erst danach FORTURA_TLS_UNSICHER=1." >&2
      return 20
    fi
    return 10
  fi
  if [ "$http" -ge 500 ] 2>/dev/null; then echo "  Login: HTTP $http" >&2; return 10; fi
  antwort=$(json_lesen "$ARBEIT/login.json" data.sid) || {
    echo "  Login fehlgeschlagen (HTTP $http, ${antwort#FEHLERCODE:}). Zugangsdaten falsch oder Konto gesperrt: es wird NICHT wiederholt." >&2
    return 20
  }
  sid="$antwort"
  SID="$sid"

  # 2) Feed laden (nur lesen)
  http=$(curl -sS "${TLS[@]}" --connect-timeout 30 --max-time 900 -G "$B/webapi/entry.cgi" \
    --data-urlencode "api=SYNO.FileStation.Download" --data-urlencode "version=2" --data-urlencode "method=download" \
    --data-urlencode "path=$PFAD_FEED" --data-urlencode "mode=download" --data-urlencode "_sid=$SID" \
    -o "$ARBEIT/feed" -w '%{http_code}' 2>"$ARBEIT/curl.err"); rc=$?
  if [ $rc -ne 0 ]; then echo "  Download: Netzfehler (curl $rc: $(tr -d '\r\n' < "$ARBEIT/curl.err" | cut -c1-160))" >&2; return 10; fi
  if [ "$http" != "200" ]; then echo "  Download: HTTP $http" >&2; return 10; fi
  return 0
}

# Server-Zeit der Feed-Datei (best effort). Ohne sie ist die Dateizeit die Abrufzeit, und die 36-Stunden-Prüfung des Stempels
# misst dann nur noch den Abruf statt das Alter der Daten. Ein Fehler hier bricht NICHT ab, er wird gemeldet.
server_zeit() {
  [ -n "$SID" ] || return 1
  local rc
  curl -sS "${TLS[@]}" --connect-timeout 15 --max-time 60 -G "$B/webapi/entry.cgi" \
    --data-urlencode "api=SYNO.FileStation.List" --data-urlencode "version=2" --data-urlencode "method=getinfo" \
    --data-urlencode "path=[\"$PFAD_FEED\"]" --data-urlencode 'additional=["time"]' --data-urlencode "_sid=$SID" \
    -o "$ARBEIT/info.json" 2>/dev/null || return 1
  "$NODE" -e '
    const fs = require("fs"); let d;
    try { d = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch { process.exit(1); }
    const t = d && d.success === true && d.data && d.data.files && d.data.files[0] && d.data.files[0].additional && d.data.files[0].additional.time;
    const m = t && Number(t.mtime);
    if (!Number.isFinite(m) || m < 1e9 || m > Date.now() / 1000 + 86400) process.exit(1);
    console.log(Math.floor(m));
  ' "$ARBEIT/info.json"
}

n=0
while : ; do
  n=$((n + 1))
  versuch; rc=$?
  if [ $rc -eq 0 ]; then
    BYTES=$(wc -c < "$ARBEIT/feed" | tr -d ' ')
    if [ "$BYTES" -lt "$MIN_BYTES" ]; then
      echo "  Download zu klein: $BYTES Bytes (Mindestens $MIN_BYTES). Abgeschnitten oder Fehlerantwort." >&2
      rc=10
    elif ! { head -c 4000 "$ARBEIT/feed" > "$ARBEIT/kopf"; grep -a -q 'ArtNr' "$ARBEIT/kopf"; }; then
      echo "  Download ohne Kopfzeile 'ArtNr': das ist nicht der Artikel-Feed." >&2
      rc=10
    else
      break
    fi
  fi
  [ $rc -eq 20 ] && fehler "Abruf gescheitert (nicht wiederholbar). Am Ziel $OUT wurde nichts geändert."
  abmelden
  [ "$n" -ge "$VERSUCHE" ] && fehler "Abruf nach $n Versuchen gescheitert. Am Ziel $OUT wurde nichts geändert."
  echo "  Neuer Versuch in ${PAUSE}s ($n/$VERSUCHE)…" >&2
  sleep "$PAUSE"
done

ZEILEN=$(wc -l < "$ARBEIT/feed" | tr -d ' ')
SERVER=""
if SERVER=$(server_zeit); then
  touch -d "@$SERVER" "$ARBEIT/feed" 2>/dev/null || SERVER=""
fi
abmelden

# Erst jetzt, vollständig und geprüft, ersetzt der neue Feed die Zieldatei (mv im selben Dateisystem ist atomar; sonst cp + mv).
ZIELORDNER="$(dirname "$OUT")"
mkdir -p "$ZIELORDNER" || fehler "Zielordner $ZIELORDNER nicht anlegbar"
TMPZIEL="$OUT.neu.$$"
cp -p "$ARBEIT/feed" "$TMPZIEL" || { rm -f "$TMPZIEL"; fehler "Zieldatei nicht schreibbar: $OUT"; }
mv -f "$TMPZIEL" "$OUT" || { rm -f "$TMPZIEL"; fehler "Zieldatei nicht ersetzbar: $OUT"; }

if [ -n "$SERVER" ]; then
  echo "Fortura-Feed geladen -> $OUT ($BYTES Bytes, $ZEILEN Zeilen, Stand auf dem Server $(date -u -d "@$SERVER" +%FT%TZ))"
else
  echo "Fortura-Feed geladen -> $OUT ($BYTES Bytes, $ZEILEN Zeilen)"
  echo "HINWEIS: Stand der Datei auf dem Server nicht lesbar; die Dateizeit ist die Abrufzeit, die 36-Stunden-Prüfung des Stempels misst dann nur den Abruf." >&2
fi
exit 0
