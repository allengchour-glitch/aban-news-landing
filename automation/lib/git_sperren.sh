#!/bin/bash
# git_sperren.sh — verwaiste git-Sperrdateien wegräumen, gehaltene NIE (14.10.2026)
#
# ANLASS: engine_keepalive.sh und repo_vorspulen.sh liefen `find .git -name "*.lock" -delete` — ohne zu fragen, ob gerade
# ein git-Prozess die Sperre hält. Der Autocommitter (alle 5 Min, unter /tmp/git_repo.lock), git_sichern.sh und die
# Sitzung selbst committen/fetchen/pushen parallel; wer ihnen index.lock oder eine Ref-Sperre unter den Füssen löscht,
# riskiert einen halb geschriebenen Index bzw. einen Ref-Stand, den zwei Schreiber gleichzeitig setzen.
# autocommit.sh hatte schon die richtige Form (nur index.lock, nur ohne Halter, `fuser`) — hier für ALLE Sperren.
#
# REGEL: eine Sperre ist verwaist, wenn KEIN Prozess sie offen hält (fuser) UND sie älter als MIN_ALTER s ist
# (Standard 120 — git hält die Datei nur Sekunden; das Alter deckt das Fenster zwischen close und rename ab).
#
#   . automation/lib/git_sperren.sh; verwaiste_git_sperren_weg [MIN_ALTER]   → Ausgabe nur bei Fund
#   bash automation/lib/git_sperren.sh --selbsttest

verwaiste_git_sperren_weg() {
  local min_alter="${1:-120}" jetzt f alter weg=0 bleibt=0
  # Ohne fuser (psmisc fehlt, z. B. auf einem frischen Server) ist «leer» keine Aussage über den Halter → nur sehr alte
  # Sperren (10 Min) gelten als verwaist; kein git-Schritt hält eine Sperre so lange.
  command -v fuser >/dev/null 2>&1 || { [ "$min_alter" -lt 600 ] && min_alter=600; }
  jetzt=$(date +%s)
  while IFS= read -r -d '' f; do
    alter=$(( jetzt - $(stat -c %Y "$f" 2>/dev/null || echo "$jetzt") ))
    if [ "$alter" -lt "$min_alter" ] || { command -v fuser >/dev/null 2>&1 && [ -n "$(fuser "$f" 2>/dev/null)" ]; }; then
      bleibt=$((bleibt + 1)); continue
    fi
    rm -f "$f" && weg=$((weg + 1))
  done < <(find .git -name "*.lock" -print0 2>/dev/null)
  [ $((weg + bleibt)) -gt 0 ] && echo "GIT-SPERREN: $weg verwaiste entfernt · $bleibt gehalten/jung belassen"
  return 0
}

if [ "${BASH_SOURCE[0]}" = "$0" ] && [ "${1:-}" = "--selbsttest" ]; then
  set -u
  T=$(mktemp -d); trap 'kill $HALTER 2>/dev/null; rm -rf "$T"' EXIT
  cd "$T" && mkdir -p .git/refs/heads
  : > .git/index.lock;              touch -d '10 minutes ago' .git/index.lock      # alt, frei → weg
  : > .git/refs/heads/x.lock                                                       # jung, frei → bleibt
  : > .git/HEAD.lock;               touch -d '10 minutes ago' .git/HEAD.lock       # alt, gehalten → bleibt
  ( exec 7<.git/HEAD.lock; sleep 30 ) & HALTER=$!
  sleep 0.5
  AUS=$(verwaiste_git_sperren_weg 120)
  ok=1
  [ ! -e .git/index.lock ] || { echo "FEHL alt+frei nicht entfernt"; ok=0; }
  [ -e .git/refs/heads/x.lock ] || { echo "FEHL junge Sperre entfernt"; ok=0; }
  [ -e .git/HEAD.lock ] || { echo "FEHL gehaltene Sperre entfernt"; ok=0; }
  echo "$AUS" | grep -q "1 verwaiste entfernt · 2 gehalten/jung belassen" || { echo "FEHL Ausgabe: $AUS"; ok=0; }
  rm -f .git/refs/heads/x.lock; kill $HALTER 2>/dev/null; wait $HALTER 2>/dev/null; rm -f .git/HEAD.lock
  [ -z "$(verwaiste_git_sperren_weg 120)" ] || { echo "FEHL leer meldet etwas"; ok=0; }
  [ $ok = 1 ] && echo "SELBSTTEST OK" || { echo "SELBSTTEST FEHLER"; exit 1; }
fi
