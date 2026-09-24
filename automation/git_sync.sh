#!/bin/bash
# git_sync.sh — seit 24.09.2026 nur noch eine Hülle um git_sichern.sh (Merge statt Rebase, KEIN autostash, KEIN add -A,
# KEIN reset --hard). Die alte Fassung (12.07.) tat drei gefährliche Dinge: `git add -A` nahm Arbeitsdateien fremder Agenten
# mit, `pull --rebase --autostash` legte Quittungen in Autostashes ab (5 Stück am 23.09., 139 Ledger-Zeilen nur noch dort),
# und der Push-Fallback `reset --hard origin` warf lokale Commits weg. Aufrufer: autostart.sh (Auto-Loop), selbstkontrolle.sh.
# Aufruf unverändert: bash automation/git_sync.sh "commit message"   → sichert dropship/ (Ledger) über git_sichern.sh.
cd "$(dirname "$0")/.." || exit 1
MSG="${1:-Ledger-Drift (auto)}"
exec bash automation/git_sichern.sh "$MSG" dropship/
