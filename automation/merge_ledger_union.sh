#!/bin/bash
# merge_ledger_union.sh — Merge-Konflikte in LEDGER-Dateien durch Vereinigung lösen.
#
# WARUM ES DAS ALS SKRIPT GIBT (teuer gelernt 29.08.2026):
# Ich hatte diese Schleife mehrfach von Hand in die Kommandozeile getippt:
#   for f in $(git diff --name-only --diff-filter=U); do
#     { git show :2:"$f"; git show :3:"$f"; } | sort -u > "$f"; git add "$f"; done
# Beim vierten Mal war CLAUDE.md unter den Konfliktdateien — und `sort -u` hat das
# PROJEKT-GEDÄCHTNIS alphabetisch sortiert und damit zerstört. Es war bereits gepusht,
# bevor es auffiel. Wiederherstellbar war es nur, weil beide Merge-Eltern in der Historie
# standen und meine Fassung nachweislich NUR Zeilen hinzugefügt hatte (28+, 0−).
#
# ⚠️ REGEL: Eine Vereinigung per `sort -u` ist NUR für Dateien zulässig, deren Zeilen
#    unabhängig voneinander sind — Ledger, Cursor, Quittungslisten. Für jede Datei, in der
#    die REIHENFOLGE Bedeutung trägt (Prosa, Code, JSON, CSV mit Kopfzeile), ist sie
#    Datenverlust. Deshalb entscheidet hier eine WEISSE LISTE, nicht der Zufall.
set -u
cd /home/user/aban-news-landing || exit 1

konflikte=$(git diff --name-only --diff-filter=U)
[ -z "$konflikte" ] && { echo "keine Konflikte"; exit 0; }

offen=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  # Weisse Liste: nur Ledger/Quittungen/Cursor unter dropship/, und nur .txt.
  case "$f" in
    dropship/_*.txt|dropship/cj_*.txt|dropship/*_done.txt|dropship/*_cursor.txt)
      { git show ":2:$f" 2>/dev/null; git show ":3:$f" 2>/dev/null; } | sort -u > "$f"
      git add "$f"
      echo "vereinigt: $f"
      ;;
    *)
      echo "⛔ NICHT vereinigt (keine Ledger-Datei): $f — von Hand entscheiden"
      offen=$((offen+1))
      ;;
  esac
done <<< "$konflikte"

if [ "$offen" -gt 0 ]; then
  echo "$offen Datei(en) brauchen eine Entscheidung — KEIN automatischer Commit."
  exit 2
fi
git commit -q --no-edit && echo "Merge abgeschlossen."
