#!/bin/bash
# repo_vorspulen.sh — nach einem Container-Restart, der einen ALTEN Disk-Snapshot
# wiederherstellt (beobachtet 2×, 25.08.2026: Baum ploetzlich «behind 167», CJ-Ledger
# ~300 Zeilen aelter, /tmp-Skripte weg, uptime wenige Minuten).
# Vorgehen: Ledger sichern -> auf origin-Spitze setzen -> Ledger-UNION zurueckspielen.
# ⚠️ Die Union laesst bewusst geloeschte Quittungen DRAUSSEN (cj-ohne-antwort), sonst
# macht sie fruehere Purges rueckgaengig (Zombie-Ledger-Klasse, Lehre 15.08.).
set -u
cd "$(dirname "$0")/.." || exit 1
B=claude/luxestyle-status-tztnn1
S=$(mktemp -d)
cp dropship/*.txt "$S"/ 2>/dev/null
find .git -name "*.lock" -delete 2>/dev/null
timeout 60 git fetch origin "$B" || exit 1
git stash -u >/dev/null 2>&1
git reset --hard "origin/$B" || exit 1
python3 - "$S" <<'EOF'
import os, sys
snap = sys.argv[1]; mehr = 0
for f in os.listdir(snap):
    repo = os.path.join("dropship", f)
    if not os.path.exists(repo): continue
    have = set(open(repo, errors="ignore").read().splitlines())
    neu = [l for l in open(os.path.join(snap, f), errors="ignore").read().splitlines()
           if l.strip() and l not in have and "cj-ohne-antwort" not in l]
    if neu:
        with open(repo, "a") as out: out.write("\n".join(neu) + "\n")
        mehr += len(neu); print(f, "+", len(neu))
print("union:", mehr)
EOF
git stash drop >/dev/null 2>&1
rm -rf "$S"
git add -A dropship/ && git commit -q -m "Ledger-Union nach Snapshot-Restore [skip ci]" 2>/dev/null
timeout 45 git push origin "$B" 2>&1 | tail -1
