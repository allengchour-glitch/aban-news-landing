#!/usr/bin/env bash
# Committet dropship/_translated.txt zurück (idempotent, no-op ohne Diff). Arg $1 = Ziel-Branch.
set -u
BRANCH="${1:-main}"
git config user.name "luxestyle-bot"
git config user.email "bot@users.noreply.github.com"
if [ -z "$(git status --porcelain dropship/_translated.txt)" ]; then
  echo "Kein Ledger-Diff."
  exit 0
fi
git add dropship/_translated.txt
git commit -m "Übersetzungs-Ledger aktualisiert [skip ci]" || { echo "nichts zu committen"; exit 0; }
for i in 1 2 3 4; do
  git fetch origin "$BRANCH" && git rebase "origin/$BRANCH" || git rebase --abort
  if git push origin "HEAD:$BRANCH"; then echo "Ledger gepusht."; exit 0; fi
  sleep $((2**i))
done
echo "⚠️ Ledger-Push nach 4 Versuchen fehlgeschlagen (Fortschritt bleibt lokal im Run-Log)."
exit 0
