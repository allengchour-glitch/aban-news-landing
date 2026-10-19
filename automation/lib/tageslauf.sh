#!/bin/bash
# tageslauf.sh — gemeinsamer Baustein für Tageswächter des Aufsehers (Entwurf 19.10.2026). Nur definieren, nichts starten.
#   source "$REPO/automation/lib/tageslauf.sh"
#
# REGEL: Ein Tageswächter ist fällig, wenn sein ERGEBNIS alt ist — nicht, wenn sein Log alt ist. Ein «touch» VOR dem Lauf (bisher
# Muster in 114 Blöcken von fixer_keepalive.sh) macht ein totes Vorhaben 24 h lang zu «erledigt». Hier gibt es nur noch einen
# CLAIM (Standard 40 min, gegen Doppelstart-Rauschen) — nach einem Absturz ist der Wächter beim nächsten Tick wieder fällig.
#
# TL_TMP (Standard /tmp) lässt die Selbsttests in einem Wegwerf-Ordner laufen.
TL_TMP="${TL_TMP:-/tmp}"
TL_REPO="${TL_REPO:-${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}}"
TL_REG="${TL_REG:-$TL_REPO/automation/data/tageslauf_ergebnis.tsv}"

# tageslauf_reg NAME FELD → Feld (typ|pfad|arg|max_h) aus der Registry (Spalten: name typ pfad arg max_h; Kommentar mit #)
tageslauf_reg() {
  awk -F'\t' -v n="$1" -v f="$2" '$1==n && $1 !~ /^#/ { c=(f=="typ")?2:(f=="pfad")?3:(f=="arg")?4:5; print $c; exit }' "$TL_REG" 2>/dev/null
}
# tageslauf_ergebnis_h NAME → ganze Stunden (999 = fehlt/unlesbar); leer, wenn NAME nicht registriert ist
tageslauf_ergebnis_h() {
  local typ pfad arg
  typ=$(tageslauf_reg "$1" typ); [ -n "$typ" ] || return 0
  pfad=$(tageslauf_reg "$1" pfad); arg=$(tageslauf_reg "$1" arg)
  # shellcheck disable=SC2086
  python3 "$TL_REPO/tools/ergebnis_alter.py" "$typ" "$pfad" $([ "$arg" = "-" ] || echo "$arg") 2>/dev/null || echo 999
}
tageslauf_max_h() { local m; m=$(tageslauf_reg "$1" max_h); echo "${m:-20}"; }

# tageslauf_pruefen NAME ERGEBNIS_H MAX_H [CLAIM_MIN=40] [VERSUCHE_PRO_TAG=6] [LOCKDATEI=lock_NAME.lock]   — nur PRÜFEN, verbraucht nichts
#   Exit 0 = JETZT starten. Alle vier müssen stimmen:
#   1. Ergebnis ist MAX_H oder älter (leer/unlesbar = 999 = fällig)
#   2. Claim älter als CLAIM_MIN (derselbe Tick startet nicht doppelt; 40 min lässt einem Neustart-Opfer Zeit, sich zu erholen)
#   3. niemand hält die Sperre (flock ohne Warten; die Sperre hängt am Lauf und fällt mit ihm — auch bei kill -9 / Neustart)
#   4. höchstens VERSUCHE_PRO_TAG Starts je UTC-Tag (ein Wächter, der nie ein Ergebnis schreibt, dreht sich nicht im Kreis)
tageslauf_pruefen() {
  local n="$1" h="$2" max="$3" cm="${4:-40}" vmax="${5:-6}" lock="${6:-lock_$1.lock}" c z v ca
  case "$h" in ''|*[!0-9]*) h=999 ;; esac
  [ "$h" -ge "$max" ] || return 1
  c="$TL_TMP/_claim_$n"
  ca=$(( $(date +%s) - $(stat -c %Y "$c" 2>/dev/null || echo 0) ))
  [ "$ca" -ge "${TL_CLAIM_S:-$(( cm * 60 ))}" ] || return 1
  flock -n "$TL_TMP/$lock" true 2>/dev/null || return 1
  z="$TL_TMP/_versuche_${n}_$(date -u +%Y%m%d)"
  v=$(cat "$z" 2>/dev/null); case "$v" in ''|*[!0-9]*) v=0 ;; esac
  [ "$v" -lt "$vmax" ]
}
# tageslauf_claim NAME — direkt vor dem Start: Versuch zählen, Claim setzen (KEIN 24-h-Stempel; nach 40 min ist der Wächter wieder fällig)
tageslauf_claim() {
  local z="$TL_TMP/_versuche_$1_$(date -u +%Y%m%d)" v
  v=$(cat "$z" 2>/dev/null); case "$v" in ''|*[!0-9]*) v=0 ;; esac
  echo $(( v + 1 )) > "$z"; : > "$TL_TMP/_claim_$1"
}
tageslauf_faellig() { tageslauf_pruefen "$@" && tageslauf_claim "$1"; }   # Kurzform für Blöcke ausserhalb der Schleife

# tageslauf_start NAME LOG TIMEOUT_S [LOCKDATEI] -- BEFEHL…
#   Startet im Hintergrund: setsid, flock -n auf die Sperre (Deskriptor 9, nicht an Kinder vererbt), timeout, START/ENDE-Zeile.
#   «ENDE rc=…» steht auch bei timeout (rc 124); fehlt sie, ist der Lauf gestorben — das Ergebnis bleibt alt, der Wächter wird fällig.
#   KEIN FERTIG hier: ob es erledigt ist, sagt allein das Ergebnis (tageslauf_ergebnis_h).
tageslauf_start() {
  local n="$1" log="$2" t="$3" lock="lock_$1.lock"
  shift 3; if [ "$1" != "--" ]; then lock="$1"; shift; fi; shift
  ( cd "$TL_REPO" && setsid bash -c '
        exec 9>"$0"; flock -n 9 || exit 0
        n="$1"; t="$2"; shift 2
        echo "START $(date -u +%FT%TZ) (Tageslauf $n)"
        timeout "$t" "$@"; rc=$?
        echo "ENDE rc=$rc $(date -u +%FT%TZ)"
        exit "$rc"' "$TL_TMP/$lock" "$n" "$t" "$@" >> "$log" 2>&1 9>&- 8>&- & )
}
