#!/bin/bash
# git_sync.sh — EINZIGER, serialisierter Git-Commit+Push-Pfad (2026-07-12).
# Löst die Commit-Race: Auto-Committer UND Selbstkontrolle-Watchdog committen sonst gleichzeitig
# → non-fast-forward / detached HEAD / Rebase-Konflikte auf dem append-only Ledger.
# flock /tmp/git_sync.lock serialisiert ALLE lokalen Pusher → nie mehr zwei gleichzeitig.
# Aufruf: bash automation/git_sync.sh "commit message"
cd "$(dirname "$0")/.." || exit 1
BRANCH=claude/luxestyle-status-tztnn1
MSG="${1:-Ledger-Drift (auto)}"
exec 9>/tmp/git_sync.lock
flock -w 60 9 || { echo "[git_sync] Lock-Timeout — anderer Pusher aktiv, skip"; exit 0; }
# Aufräumen falls ein früherer Lauf mitten im Rebase starb
rm -rf .git/rebase-merge .git/rebase-apply 2>/dev/null
git rev-parse --abbrev-ref HEAD | grep -q "$BRANCH" || git checkout -q "$BRANCH" 2>/dev/null
git add -A 2>/dev/null
if git diff --cached --quiet; then exit 0; fi
git commit -q -m "$MSG" 2>/dev/null
# pull --rebase --autostash: da flock der EINZIGE Pusher ist, ist das immer ein sauberer Fast-Forward
git pull --rebase --autostash -q origin "$BRANCH" 2>/dev/null
if ! git push -q origin "$BRANCH" 2>/dev/null; then
  # Fallback: append-only Ledger-Union, falls doch mal etwas divergiert
  git fetch -q origin "$BRANCH"
  git show "origin/$BRANCH:dropship/cj_niche_done.txt" > /tmp/_lo.txt 2>/dev/null
  cat dropship/cj_niche_done.txt /tmp/_lo.txt 2>/dev/null | grep -v '^$' | sort -u > /tmp/_lu.txt
  git reset --hard "origin/$BRANCH" -q
  [ -s /tmp/_lu.txt ] && cp /tmp/_lu.txt dropship/cj_niche_done.txt
  git add -A; git commit -q -m "$MSG (union)" 2>/dev/null
  git push -q origin "$BRANCH" 2>/dev/null && echo "[git_sync] union-push ok"
fi
rm -rf .git/rebase-merge .git/rebase-apply 2>/dev/null
