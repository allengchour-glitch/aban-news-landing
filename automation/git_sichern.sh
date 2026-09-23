#!/usr/bin/env bash
# git_sichern.sh — committen und pushen OHNE rebase.autoStash (23.09.2026).
#   bash automation/git_sichern.sh "Nachricht [skip ci]" [pfad ...]
# Nimmt die Repo-Sperre /tmp/git_repo.lock selbst (ausser GIT_SPERRE_GEHALTEN=1), fuegt die Pfade + dropship/ hinzu,
# committet, holt origin und MERGT (kein Rebase, kein Autostash). Konflikte nach automation/lib/git_aufloesen.sh,
# kein Push bei Konflikt-Markern. Warum: `rebase.autoStash` stashte waehrend laufender Poster/Motoren deren Quittungen;
# das Zurueckspielen kollidierte (4 Stashes am 23.09., Kristall-Quittung verloren, 19:25 drei «unmerged» Dateien).
set -u
REPO=/home/user/aban-news-landing
BRANCH=claude/luxestyle-status-tztnn1
cd "$REPO" || exit 1
MSG="${1:?Nachricht fehlt}"; shift
if [ "${GIT_SPERRE_GEHALTEN:-0}" != 1 ]; then
  exec flock -w 180 /tmp/git_repo.lock env GIT_SPERRE_GEHALTEN=1 bash "$0" "$MSG" "$@"
fi
. "$REPO/automation/lib/git_aufloesen.sh"
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then git rebase --quit 2>/dev/null || true; fi
if [ -f .git/MERGE_HEAD ] || [ -n "$(git ls-files -u)" ]; then aufloesen || exit 1; fi
[ $# -gt 0 ] && git add -- "$@"
git add -A dropship/ 2>/dev/null
git diff --cached --quiet || git commit -q -m "$MSG"
for i in 1 2 3; do
  git fetch -q origin "$BRANCH" || { sleep $((i * 3)); continue; }
  if ! git merge -q --no-edit "origin/$BRANCH" 2>/dev/null; then
    if [ -f .git/MERGE_HEAD ]; then aufloesen || exit 1
    else echo "$(date -u +%H:%M) Merge verweigert (lokale Aenderungen im Weg) — naechster Lauf"; exit 1; fi
  fi
  M=$(marker)
  if [ -n "$M" ]; then echo "$(date -u +%H:%M) ⛔ Konflikt-Marker in: $M — kein Push"; exit 1; fi
  timeout 90 git push -q origin "$BRANCH" && { echo "gesichert ($i)"; exit 0; }
  sleep $((i * 4))
done
exit 1
