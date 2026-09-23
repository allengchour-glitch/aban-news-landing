#!/bin/bash
# autocommit.sh — committet die LEDGER-Drift der laufenden Engines, sonst nichts.
#
# ⚠️ 23.08.2026 AUS /tmp INS REPO GEHOLT. Dieses Skript lief seit Wochen ausschliesslich
# als /tmp/autocommit.sh — genau die Klasse, die dieses Projekt schon ZWEIMAL verloren hat
# (social_autopilot.sh und reel_engine_runner.sh, Lehre 11.08.: «Ein Dauerläufer, der nicht
# committet ist, existiert nicht»). Es hat nur überlebt, weil /tmp diesmal nicht gewiped
# wurde. `engine_keepalive.sh` startet jetzt diese Fassung, /tmp nur noch als Rückfall.
#
# ⚠️ ES ADDIERT NUR `dropship/` — und das ist Absicht. Die alte Fassung machte `git add -A`
# und hat damit am 22.08. ein frisch gebautes Werkzeug in eine Sammelmeldung «CJ-Ledger auto»
# gezogen, bevor der Grund dafür geschrieben werden konnte. Ledger sind Datenrauschen und
# gehören gebündelt; CODE und GEDÄCHTNIS (automation/, CLAUDE.md, dropship/*.md) brauchen
# eine Begründung im Commit und bleiben deshalb liegen, bis sie jemand bewusst committet.
# Ein Stop-Hook, der dann «uncommitted changes» meldet, ist die richtige Erinnerung.
#
# ⚠️ ERST ARBEITEN, DANN SCHLAFEN. Die alte Fassung schlief 300 s VOR dem ersten Lauf; nach
# jedem Neustart lag die Drift also fünf Minuten unbeachtet herum, und Neustarts sind hier
# häufig.
cd /home/user/aban-news-landing || exit 1
export BRANCH=claude/luxestyle-status-tztnn1

# ⚠️ REPO-SPERRE (22.09.2026). Motor (cj_video_reel_engine, Rebase) und dieser Committer (Merge) arbeiten
# im selben Arbeitsbaum. Gemessen 22:28 UTC: der parallele Merge liess .git/rebase-merge/autostash zurueck,
# danach scheiterte JEDER Push des Motors («rebase in progress»), fuenf fertige Reels wurden verworfen und
# der Abbruch setzte drei Ledger auf den Commit-Stand zurueck (119 Zeilen lagen nur noch im Stash).
# Jede git-Folge laeuft deshalb unter flock /tmp/git_repo.lock; ein verwaister Rebase-Zustand wird nicht
# ueberfahren, sondern gemeldet (der Motor raeumt ihn selbst mit --quit).
# ⚠️ KONFLIKT-MARKER (23.09.2026, gemessen). `git merge` scheiterte an einem Konflikt in einer Zustandsdatei
# (dropship/_kategorie_stand.json — Server-Waechter und Cloud schreiben sie beide). Der Merge blieb OFFEN; der
# NAECHSTE Durchlauf machte `git add -A dropship/` + `commit` und schloss ihn MIT den Markern ab (3 Commits am
# 23.09. 18:12–18:32, Autor luxe-waechter). Die Ampel las die Datei nicht mehr («KATEGORIE: unklar»).
# Jetzt: (1) ein offener Merge wird zuerst aufgeloest, nie blind committet; (2) Ledger (.txt/.tsv/.jsonl) werden
# vereinigt, Zustandsdateien (Cursor, .json, .md, .csv) behalten die eigene Fassung, alles ausserhalb dropship/
# bricht den Merge ab; (3) vor jedem Push: kein Marker in dropship/, sonst kein Push.
# Ein Durchlauf ist `bash autocommit.sh --einmal` — die Schleife liest das Skript also bei JEDEM Durchlauf neu
# (auch der Server-Waechter bekommt Reparaturen ohne Neustart).
if [ "${1:-}" = "--einmal" ]; then
  . "$(dirname "$(readlink -f "$0")")/lib/git_aufloesen.sh"   # aufloesen() + marker(), gemeinsam mit git_sichern.sh
  if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then echo "$(date -u +%H:%M) Rebase-Zustand vorhanden — Committer wartet"; exit 0; fi
  [ -f .git/index.lock ] && [ -z "$(fuser .git/index.lock 2>/dev/null)" ] && rm -f .git/index.lock
  if [ -f .git/MERGE_HEAD ] || [ -n "$(git ls-files -u)" ]; then aufloesen || exit 0; fi
  git add -A dropship/ 2>/dev/null
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -q -m "CJ-Ledger auto [skip ci]" 2>/dev/null
    git fetch -q origin "$BRANCH" 2>/dev/null
    if ! git merge -q "origin/$BRANCH" 2>/dev/null && [ -f .git/MERGE_HEAD ]; then aufloesen || exit 0; fi
    M=$(marker)
    if [ -n "$M" ]; then echo "$(date -u +%H:%M) ⛔ Konflikt-Marker in: $M — KEIN Push"; exit 0; fi
    timeout 40 git push origin "$BRANCH" 2>/dev/null
  fi
  exit 0
fi

SELBST="$(readlink -f "$0")"
while true; do
  flock -w 120 /tmp/git_repo.lock bash "$SELBST" --einmal || echo "$(date -u +%H:%M) Repo-Sperre nicht bekommen"
  sleep 300
done
