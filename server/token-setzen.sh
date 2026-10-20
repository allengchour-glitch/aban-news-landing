#!/usr/bin/env bash
# token-setzen.sh — neuen GitHub-Token auf dem Hetzner-Server eintragen (20.10.2026).
#
# ANLASS (GEMESSEN 20.10. ~19:55 UTC, Journal des Betreibers): der Agent LÄUFT alle 5 Minuten und legt seine Aufträge an,
# aber jeder Push scheitert mit «fatal: could not read Username for 'https://github.com': No such device or address» —
# die Remote-URL der Klone trägt keine (oder keine gültigen) Zugangsdaten mehr. Lesen geht, weil das Repo öffentlich ist;
# Schreiben geht nicht. Folge: kein Claim, kein Auftrag, kein Puls (seit 16.10. 06:08 UTC), auch der Wächter pusht nichts.
# Wahrscheinliche Ursache: ein fein abgestufter GitHub-Token (30 Tage Laufzeit) ist abgelaufen — der eigene Token der Cloud-
# Sitzung (`github_key`) läuft am 21.10. 02:04 UTC ab (Kopfzeile github-authentication-token-expiration, gemessen 20.10.).
#
# WARUM DIE FRÜHEREN PRÜFUNGEN «GRÜN» MELDETEN: `git ls-remote` und `git push --dry-run` laufen gegen ein ÖFFENTLICHES Repo auch
# ohne Anmeldung (das Beste Indiz: am 19.10. lief die Push-Probe «durch», und trotzdem scheiterte jeder echte Push). Auch GitHubs
# Antwort auf `info/refs?service=git-receive-pack` ist anonym lesbar — als Schreibprobe untauglich. Dieses Skript prüft das
# Schreibrecht deshalb mit einem echten, folgenlosen Schreibzugriff: `PATCH …/git/refs/heads/<Zweig>` auf den AKTUELLEN Stand
# (ohne force) — GitHub verlangt dafür Contents: Write. 200 = darf, 422 = darf (der Zweig hat sich zwischendurch bewegt),
# 401 = Anmeldung ungültig, 403/404 = Token ohne Schreibrecht / Repo nicht freigegeben.
#
# AUFRUF (in einem SSH-Terminal am PC — dort geht das Einfügen ohne Zeichenverlust; zwei Zeilen, jede mit Enter):
#   curl -fsSL -o t.sh raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/server/token-setzen.sh
#   bash t.sh
# Das Skript fragt dann «Token einfügen» — die Eingabe bleibt UNSICHTBAR (nichts im Verlauf, nichts auf dem Bildschirm).
# Probelauf ohne Änderung: DRY=1 bash t.sh      Token aus der Umgebung statt Abfrage: TOKEN=… bash t.sh
# Falls die Schreibprobe fälschlich ablehnt (nur dann): OHNE_PROBE=1 bash t.sh — den Beweis liefert Schritt 5 (echter Agentenlauf).
# Der Positivpfad (200/422) ist in der Cloud-Sitzung NICHT prüfbar (ihr Ausgangsproxy sperrt Schreibzugriffe auf die GitHub-API) — nur der Negativpfad und urteil() sind getestet.
#
# TOKEN ANLEGEN (einmal, github.com am Handy oder PC, angemeldet als Konto allengchour-glitch):
#   Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token
#   · Name «luxe-hetzner» · Ablauf: die längste Dauer (1 Jahr; Termin in den Kalender) · Repository access: «Only select repositories»
#     → aban-news-landing · Repository permissions → «Contents»: Read and write (Metadata: Read ergibt sich von selbst) · Generate.
#   (Alternative ohne Ablauf: «Tokens (classic)» mit Haken «repo», Ablauf «No expiration» — berechtigt aber auf ALLE Repos des Kontos.)
#   Den Token EINMAL kopieren (er beginnt mit github_pat_ bzw. ghp_), im Terminal einfügen, Enter. Nie in Chat/Repo schreiben.
#
# WAS ES TUT: prüft den Token gegen GitHub (Gültigkeit, Ablaufdatum, Schreibrecht), setzt die Remote-URL der drei Klone
# (/opt/luxe-agent/repo, /opt/luxe-waechter/repo, /opt/abannews), merkt sich das Ablaufdatum in /etc/luxe/token_ablauf (der Agent
# schreibt es in seinen Puls, bot_puls.py warnt 14 Tage vorher), startet je einen Lauf von Agent und Wächter und sagt, ob der
# Push jetzt geht. Der Token wird NIE ausgegeben.
set -uo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }
DRY="${DRY:-0}"
REPO=allengchour-glitch/aban-news-landing
BRANCH=claude/luxestyle-status-tztnn1
KLONE="/opt/luxe-agent/repo /opt/luxe-waechter/repo /opt/abannews"
log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠️  %s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m✅ %s\033[0m\n' "$*"; }
maskiert() { sed -E 's#(https://)[^@/ ]+@#\1***@#g; s#(gh[pousr]_|github_pat_)[A-Za-z0-9_]+#\1***#g'; }
trap 'unset TOKEN' EXIT
# Urteil über den HTTP-Code der Schreibprobe (testbar: bash token-setzen.sh --urteile)
urteil() {
  case "$1" in
    200|422) echo "ok" ;;
    401) echo "ungueltig" ;;
    403|404) echo "kein-schreibrecht" ;;
    *) echo "unklar" ;;
  esac
}
# Schreibprobe: PATCH auf den aktuellen Stand des Zweigs (ändert nichts); Argument: Token. Gibt den HTTP-Code aus.
schreibprobe() {
  local tok="$1" sha
  sha=$(curl -sS -m 25 -H "Authorization: Bearer $tok" -H "Accept: application/vnd.github+json" -H "User-Agent: luxe-token-setzen" \
        "https://api.github.com/repos/$REPO/git/ref/heads/$BRANCH" 2>/dev/null | python3 -c 'import json,sys
try: print(json.load(sys.stdin)["object"]["sha"])
except Exception: print("")')
  [ -n "$sha" ] || { echo 000; return; }
  curl -sS -m 25 -o /dev/null -w '%{http_code}' -X PATCH -H "Authorization: Bearer $tok" -H "Accept: application/vnd.github+json" \
       -H "User-Agent: luxe-token-setzen" -H "Content-Type: application/json" -d "{\"sha\":\"$sha\",\"force\":false}" \
       "https://api.github.com/repos/$REPO/git/refs/heads/$BRANCH" 2>/dev/null || echo 000
}
if [ "${1:-}" = "--urteile" ]; then   # Selbsttest der Zuordnung
  f=0; for c in "200 ok" "422 ok" "401 ungueltig" "403 kein-schreibrecht" "404 kein-schreibrecht" "000 unklar" "500 unklar" "301 unklar"; do
    set -- $c; [ "$(urteil "$1")" = "$2" ] || { echo "FEHL: $1 → $(urteil "$1") statt $2"; f=1; }; done
  [ "$f" = 0 ] && echo "urteil(): alle Zuordnungen stimmen" ; exit "$f"
fi

log "1) Stand heute (nur lesen)"
for d in $KLONE; do
  [ -d "$d/.git" ] || { echo "$d: (kein Klon)"; continue; }
  u=$(git -C "$d" remote get-url origin 2>/dev/null || true)
  cred=$(printf '%s' "$u" | sed -nE 's#^https://[^/@]+:([^@/]+)@.*#\1#p')
  if [ -z "$cred" ]; then warn "$d: Remote-URL OHNE Zugangsdaten — Push unmöglich («could not read Username»)"
  else
    c=$(schreibprobe "$cred"); echo "$d: Remote-URL trägt einen Token — Schreibprobe: HTTP $c → $(urteil "$c")"
  fi
done
echo "(Lesen geht immer — das Repo ist öffentlich. Nur die Schreibprobe zählt.)"

log "2) Token einlesen"
if [ -z "${TOKEN:-}" ]; then
  [ -t 0 ] || { echo "Kein Terminal für die Eingabe — TOKEN=… vorausschicken."; exit 1; }
  printf 'GitHub-Token einfügen (Eingabe bleibt unsichtbar), dann Enter: '
  IFS= read -rs TOKEN; echo
fi
TOKEN=$(printf '%s' "$TOKEN" | tr -d '[:space:]')      # Zeilenumbruch/Leerzeichen vom Einfügen
case "$TOKEN" in
  github_pat_*|ghp_*|gho_*|ghu_*|ghs_*) : ;;
  *) echo "⛔ Das sieht nicht wie ein GitHub-Token aus (beginnt mit github_pat_ oder ghp_). Abbruch — nichts geändert."; exit 1 ;;
esac
[ "${#TOKEN}" -ge 40 ] || { echo "⛔ Token zu kurz (${#TOKEN} Zeichen) — beim Einfügen abgeschnitten? Abbruch."; exit 1; }
echo "Token gelesen (${#TOKEN} Zeichen, wird nicht angezeigt)."

log "3) Token gegen GitHub prüfen (Gültigkeit, Ablauf, Schreibrecht)"
HDR=$(mktemp); trap 'unset TOKEN; rm -f "$HDR"' EXIT
api=$(curl -sS -m 25 -D "$HDR" -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" -H "User-Agent: luxe-token-setzen" "https://api.github.com/repos/$REPO" 2>/dev/null || echo 000)
ABLAUF=$(grep -i '^github-authentication-token-expiration:' "$HDR" | head -1 | sed -E 's/^[^:]*: *//; s/\r//')
echo "api.github.com/repos/$REPO: HTTP $api"
[ "$api" = 200 ] || { echo "⛔ GitHub nimmt den Token nicht an (HTTP $api: 401 = ungültig/abgelaufen, 404 = Repo nicht freigegeben, 000 = kein Netz). Nichts geändert."; exit 1; }
if [ "${OHNE_PROBE:-0}" = 1 ]; then schreib=200; echo "Schreibprobe übersprungen (OHNE_PROBE=1) — der Probelauf in Schritt 5 entscheidet."
else schreib=$(schreibprobe "$TOKEN"); fi
echo "Schreibprobe (Zweig-Update auf den aktuellen Stand, ändert nichts): HTTP $schreib → $(urteil "$schreib")"
case "$(urteil "$schreib")" in
  ok) : ;;
  ungueltig) echo "⛔ GitHub lehnt die Anmeldung ab (401). Nichts geändert."; exit 1 ;;
  kein-schreibrecht) echo "⛔ Der Token darf NICHT pushen (HTTP $schreib). Beim Anlegen fehlt «Contents: Read and write» oder das Repo ist nicht ausgewählt. Nichts geändert."; exit 1 ;;
  *) echo "⛔ Schreibprobe unklar (HTTP $schreib) — Netz? Nichts geändert."; exit 1 ;;
esac
[ "${OHNE_PROBE:-0}" = 1 ] && echo "Token gültig (Schreibrecht ungeprüft)." || ok "Token gültig und schreibberechtigt."
if [ -n "$ABLAUF" ]; then
  echo "Läuft ab: $ABLAUF"
  ts=$(date -d "$ABLAUF" +%s 2>/dev/null || echo 0); tage=$(( (ts - $(date +%s)) / 86400 ))
  [ "$ts" -gt 0 ] && [ "$tage" -lt 60 ] && warn "Token läuft in $tage Tagen ab — beim nächsten Mal einen mit längerer Laufzeit anlegen (Termin 14 Tage vorher in den Kalender)."
else
  echo "Läuft nicht ab (kein Ablaufdatum in der Antwort)."
fi

log "4) Remote-URLs setzen"
for d in $KLONE; do
  [ -d "$d/.git" ] || continue
  if [ "$DRY" = 1 ]; then echo "[DRY] $d: Remote-URL auf Token setzen"
  else git -C "$d" remote set-url origin "https://x-access-token:${TOKEN}@github.com/$REPO.git" && echo "$d: Remote-URL gesetzt → $(git -C "$d" remote get-url origin | maskiert)"; fi
done
if [ "$DRY" != 1 ]; then
  install -d -m 755 /etc/luxe
  printf '%s\n' "${ABLAUF:-keiner}" > /etc/luxe/token_ablauf
  echo "Ablaufdatum notiert: /etc/luxe/token_ablauf = ${ABLAUF:-keiner}"
fi

log "5) Probelauf: Agent und Wächter einmal starten"
if [ "$DRY" = 1 ]; then echo "[DRY] systemctl start luxe-agent.service luxe-waechter.service"
elif command -v systemctl >/dev/null 2>&1; then
  T0=$(date '+%F %T')
  systemctl start --no-block luxe-agent.service luxe-waechter.service 2>/dev/null || true
  echo "warte bis zu 120 s auf den Agenten …"
  for _ in $(seq 1 24); do sleep 5; [ "$(systemctl is-active luxe-agent.service 2>/dev/null)" = activating ] || [ "$(systemctl is-active luxe-agent.service 2>/dev/null)" = active ] || break; done
  FEHL=$(journalctl -u luxe-agent.service --since "$T0" --no-pager 2>/dev/null | grep -c -i -E 'nicht gepusht|Claim konnte nicht|could not read Username' || true)
  echo "--- Journal des Agenten seit dem Start (maskiert)"
  journalctl -u luxe-agent.service --since "$T0" --no-pager -o short-iso 2>/dev/null | grep -v 'systemd\[1\]: Started' | cut -c1-230 | maskiert | tail -12
  if [ "${FEHL:-1}" = 0 ]; then ok "Der Agent hat ohne Push-Fehler gearbeitet. In ~10 Minuten erscheint im Repo ein «Bot-Puls» von luxe-agent, und die «BOT STILL»-Zeile verschwindet."
  else warn "Der Agent meldet noch $FEHL Push-Fehlerzeile(n) — die Zeilen oben schicken."; fi
fi
unset TOKEN
