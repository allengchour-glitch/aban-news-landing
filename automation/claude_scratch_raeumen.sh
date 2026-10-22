#!/bin/bash
# claude_scratch_raeumen.sh — alte Sitzungs-Arbeitsordner unter /tmp/claude-0 entfernen, wenn die Cloud-Platte voll läuft (22.10.2026).
#
# ANLASS (Sauber-Inventur BET-5): Spähtrupp-Exporte, Kontaktbögen und Workflow-Auszüge wuchsen auf 8,3 GB und trieben die Cloud-Platte auf 96 %.
# Die TMP-Hygiene in engine_keepalive.sh sieht nur Dateien direkt in /tmp, nicht diese Ordner.
#
# REGEL (nach unabhängiger Prüfung 22.10. gehärtet — die erste Fassung löschte mit `find -type f -mtime -3` auch frische leere Ordner,
# Ordner mit nur Unterordnern und folgte einem Symlink):
#   * Läuft erst ab CLAUDE_SCRATCH_AB % Plattenfüllung (Standard 85).
#   * Betrachtet die Fremdordner direkt unter $CLAUDE_TMP und die Sitzungsordner unter $CLAUDE_TMP/-home-user-aban-news-landing/.
#   * Ein Ordner BLEIBT, wenn er ein Symlink ist, leer ist (das Gerüst gehört dem Werkzeug, Platz bringt es nicht) oder IRGENDEIN Eintrag darin
#     (Datei, Unterordner, der Ordner selbst) in den letzten 3 Tagen geändert wurde (mtime).
#     ⚠️ Bewusst NUR mtime: ctime liesse sich nicht testen (jede Dateioperation setzt ctime = jetzt, ein «alter» Testordner gäbe es nie). Bekannte
#     Restlücke: eine mit `cp -p` frisch hineinkopierte alte Datei hat alte mtime; der Ordner würde bei Plattenfüllung ≥ Schwelle entfernt.
#   * Entfernt wird sonst per `rm -rf` (folgt keinem Symlink im Baum).
#   * Die laufende Sitzung schreibt laufend und bleibt damit unberührt.
# Ausgabe: «CLAUDE-SCRATCH: n alte Ordner entfernt, frei X MB → Y MB (Platte Z%)».
#   bash automation/claude_scratch_raeumen.sh              # wie im Keepalive (nur ab Schwelle)
#   bash automation/claude_scratch_raeumen.sh --selbsttest # Wegwerf-Baum, 8 Fälle + 3 Mutanten

claude_scratch_raeumen() {
  local basis="${CLAUDE_TMP:-/tmp/claude-0}" ab="${CLAUDE_SCRATCH_AB:-85}" tage="${CLAUDE_SCRATCH_TAGE:-3}" rv vor nach n=0 d
  rv=$(df --output=pcent "$basis" 2>/dev/null | tail -1 | tr -dc 0-9)
  [ -d "$basis" ] && [ "${rv:-0}" -ge "$ab" ] || return 0
  vor=$(df -BM --output=avail "$basis" | tail -1 | tr -dc 0-9)
  for d in "$basis"/* "$basis"/-home-user-aban-news-landing/*; do
    [ -L "$d" ] && continue
    [ -d "$d" ] || continue
    [ "$d" = "$basis/-home-user-aban-news-landing" ] && continue
    [ -z "$(ls -A "$d" 2>/dev/null)" ] && continue
    [ -n "$(find "$d" -mtime "-$tage" -print -quit 2>/dev/null)" ] && continue
    rm -rf "$d" && n=$((n+1))
  done
  nach=$(df -BM --output=avail "$basis" | tail -1 | tr -dc 0-9)
  echo "CLAUDE-SCRATCH: ${n} alte Ordner entfernt, frei ${vor} MB → ${nach} MB (Platte ${rv}%)"
}

claude_scratch_selbsttest() {
  local self t fehler=0 erkannt=0 name alt neu m
  self="$(readlink -f "${BASH_SOURCE[0]}")"
  t=$(mktemp -d) || return 1
  _scratch_fall() {   # $1 = Skriptdatei, gibt die Fehlerliste aus
    local skript="$1" w="$t/w$RANDOM" proj ziel f=""
    proj="$w/-home-user-aban-news-landing"
    mkdir -p "$proj"
    # A alter Fremdordner mit alter Datei → weg
    mkdir -p "$w/alt_datei"; : > "$w/alt_datei/x"; touch -d '10 days ago' "$w/alt_datei/x" "$w/alt_datei"
    # B Fremdordner mit frischer Datei → bleibt
    mkdir -p "$w/frisch_datei"; : > "$w/frisch_datei/x"
    # C ALTER LEERER Ordner → bleibt (kein Platzgewinn, Gerüst des Werkzeugs; ein frischer bliebe schon durch seine mtime)
    mkdir -p "$w/leer_alt"; touch -d '10 days ago' "$w/leer_alt"
    # D nur Unterordner, alte Dateien, FRISCHER Unterordner-Eintrag → bleibt
    mkdir -p "$w/nur_unterordner/a/b"; : > "$w/nur_unterordner/a/b/alt"; touch -d '10 days ago' "$w/nur_unterordner/a/b/alt"
    # E alter Symlink auf einen alten Ordner AUSSERHALB des Baums → Link und Ziel bleiben (Ziel darf nicht unter $w liegen, sonst räumt es die Schleife selbst)
    ziel="$t/ausserhalb$RANDOM"; mkdir -p "$ziel/inhalt"; : > "$ziel/inhalt/y"; touch -d '10 days ago' "$ziel/inhalt/y" "$ziel/inhalt" "$ziel"
    ln -s "$ziel" "$w/link_auf_ziel"; touch -h -d '10 days ago' "$w/link_auf_ziel"   # ALTER Link: ohne Schutz würde rm -rf ihn entfernen
    # F Sitzungsordner alt → weg; G Sitzungsordner frisch → bleibt; H Projekt-Wurzel selbst nie
    mkdir -p "$proj/sitz_alt" "$proj/sitz_neu"; : > "$proj/sitz_alt/f"; touch -d '10 days ago' "$proj/sitz_alt/f" "$proj/sitz_alt"; : > "$proj/sitz_neu/f"
    touch -d '10 days ago' "$proj"
    touch -d '10 days ago' "$w/alt_datei"
    CLAUDE_TMP="$w" CLAUDE_SCRATCH_AB=0 bash -c ". '$skript'; claude_scratch_raeumen" > "$w/aus.txt" 2>&1
    [ -e "$w/alt_datei" ] && f="$f|A alter Ordner blieb"
    [ -e "$w/frisch_datei/x" ] || f="$f|B frischer Ordner mit Datei gelöscht"
    [ -d "$w/leer_alt" ] || f="$f|C alter leerer Ordner gelöscht"
    [ -e "$w/nur_unterordner/a/b/alt" ] || f="$f|D Ordner mit frischem Unterordner gelöscht"
    { [ -L "$w/link_auf_ziel" ] && [ -e "$ziel/inhalt/y" ]; } || f="$f|E Symlink oder Ziel gelöscht"
    [ -e "$proj/sitz_alt" ] && f="$f|F alter Sitzungsordner blieb"
    [ -e "$proj/sitz_neu/f" ] || f="$f|G frischer Sitzungsordner gelöscht"
    [ -d "$proj" ] || f="$f|H Projekt-Wurzel gelöscht"
    grep -q "CLAUDE-SCRATCH: 2 alte Ordner entfernt" "$w/aus.txt" || f="$f|Z Meldung ≠ 2 Ordner: $(cat "$w/aus.txt")"
    echo "$f"
  }
  m=$(_scratch_fall "$self")
  [ -n "$m" ] && { fehler=$((fehler+1)); echo "SELBSTTEST FEHLGESCHLAGEN: ${m#|}"; }
  # Mutanten: jede Entschärfung muss mindestens einen Fall rot machen
  local -a muts=(
    "kein Symlink-Schutz|[ -L \"\$d\" ] && continue|:"
    "leere Ordner löschen|[ -z \"\$(ls -A \"\$d\" 2>/dev/null)\" ] && continue|:"
    "nur Dateien zählen|find \"\$d\" -mtime|find \"\$d\" -type f -mtime"
  )
  local e
  for e in "${muts[@]}"; do
    name="${e%%|*}"; e="${e#*|}"; alt="${e%%|*}"; neu="${e#*|}"
    if ! python3 - "$self" "$t/mutant.sh" "$alt" "$neu" <<'PY'
import sys
q, z, a, n = sys.argv[1:5]
s = open(q, encoding="utf-8").read()
a = a.replace("\\\\", "\\"); n = n.replace("\\\\", "\\")
if s.count(a) < 1:
    sys.exit(2)
open(z, "w", encoding="utf-8").write(s.replace(a, n, 1))
PY
    then fehler=$((fehler+1)); echo "SELBSTTEST: Mutant «$name»: Stelle fehlt"; continue; fi
    m=$(_scratch_fall "$t/mutant.sh")
    if [ -n "$m" ]; then erkannt=$((erkannt+1)); else fehler=$((fehler+1)); echo "SELBSTTEST: Mutant «$name» NICHT erkannt"; fi
  done
  rm -rf "$t"
  if [ "$fehler" -eq 0 ]; then echo "SELBSTTEST OK: 8 Fälle, ${erkannt}/${#muts[@]} Mutanten erkannt"; return 0; fi
  return 1
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  if [ "${1:-}" = "--selbsttest" ]; then claude_scratch_selbsttest; exit $?; fi
  claude_scratch_raeumen
fi
