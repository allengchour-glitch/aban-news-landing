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
# Snapshot kann einen Tracking-Ref hinterlassen, dessen erwarteter Stand nicht mehr
# existiert («cannot lock ref … is at X but expected Y», 26.08.) — Ref loeschen,
# fetch legt ihn frisch an.
timeout 60 git fetch origin "$B" || {
  git update-ref -d "refs/remotes/origin/$B" 2>/dev/null
  timeout 60 git fetch origin "$B" || exit 1
}
# ⚠️ 15.09.2026: `git stash -u` + `git stash drop` haben unversionierte Arbeit STILL
# geloescht (der fertige BigBuy-Bericht war weg, bevor er committet war). Der Stash
# wird deshalb NICHT mehr weggeworfen, und was drin liegt, wird benannt.
git stash -u >/dev/null 2>&1 && HAT_STASH=1 || HAT_STASH=0
git reset --hard "origin/$B" || exit 1
python3 - "$S" <<'EOF'
import os, sys
snap = sys.argv[1]; mehr = 0
import re
# 28.09.2026: Zustandsdateien (EIN Wert: Zeiger/Position/Stand) sind keine Ledger — die Union hängte alte Zeiger an den
# neuen (Datei ohne Zeilenende → «eyJ…=eyJ…=eyJ…=», 3 Zeiger in _cj_kosten_cursor/_google_size_cursor, 2 in _textbild_cursor)
# Gemessen: Shopify nimmt den verklebten Zeiger an, liest aber nur den ERSTEN — stand bisher immer der neueste vorne (Union
# hängt hinten an), also kein Verlust; die Datei wuchs aber je Restore, und ein alter Zeiger vorne setzt den Lauf still
# zurück. Diese Dateien behalten die origin-Fassung.
ZUSTAND = re.compile(r"cursor|zeiger|_pos\.txt$|_stand\.txt$|_seit\.txt$|_page\.txt$", re.I)
# 28.09.2026 (2): Name allein reicht nicht — _heilversprechen_seit.txt trug «…48Z2026-09-25T00:26:28Z2026-09-23…» (3 Stempel
# verklebt, 25.–27.09.). Zusätzlich am INHALT: stehen origin UND Snapshot je aus genau EINEM Einzelwert (Zahl, Datum/Stempel,
# Zeiger-Token), ist es eine Zustandsdatei → origin behalten. Wächter: automation/zustand_verklebt.py (Keepalive).
EINWERT = re.compile(r"^(\d+|\d{4}-\d\d-\d\d(T[\d:.]+Z?)?|[A-Za-z0-9+/=_-]{20,})$")
def einwert(pfad):
    z = [l.strip() for l in open(pfad, errors="ignore").read().splitlines() if l.strip()]
    return len(z) == 1 and bool(EINWERT.match(z[0]))
for f in os.listdir(snap):
    repo = os.path.join("dropship", f)
    if not os.path.exists(repo) or ZUSTAND.search(f): continue
    if einwert(repo) and einwert(os.path.join(snap, f)): continue
    have = set(open(repo, errors="ignore").read().splitlines())
    neu = [l for l in open(os.path.join(snap, f), errors="ignore").read().splitlines()
           if l.strip() and l not in have and "cj-ohne-antwort" not in l]
    if neu:
        roh = open(repo, errors="ignore").read()
        with open(repo, "a") as out: out.write(("" if not roh or roh.endswith("\n") else "\n") + "\n".join(neu) + "\n")
        mehr += len(neu); print(f, "+", len(neu))
print("union:", mehr)
EOF
# 24.09.2026: Die Union oben deckt nur dropship/*.txt. Post-Quittungen in den Queue-CSVs (Bildpost «Smartwatch Pro»
# 02:13, IG 18138612319620139) blieben im Stash — Link-in-Bio und FB-Linkkommentar fanden das Produkt nicht mehr.
if [ "$HAT_STASH" = 1 ]; then
  STASH='stash@{0}' SCHARF=1 timeout 700 python3 automation/quittung_rueckspiel.py 2>&1 | sed "s/^/  [quittung] /"
fi
if [ "$HAT_STASH" = 1 ]; then
  echo "STASH BEHALTEN (nicht verworfen) — unversionierte Arbeit lag im Baum:"
  git stash show --name-only stash@{0} 2>/dev/null | sed "s/^/  /"
  echo "  zurueckholen: git checkout stash@{0} -- <datei>   ·  Liste: git stash list"
fi
rm -rf "$S"
git add -A dropship/ social/posts_image.csv social/ig_karussell.csv social/tiktok_karussell.csv automation/reels_seed.csv && git commit -q -m "Ledger-Union + Quittungs-Rückspiel nach Snapshot-Restore [skip ci]" 2>/dev/null
timeout 45 git push origin "$B" 2>&1 | tail -1
