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
BRANCH=claude/luxestyle-status-tztnn1

while true; do
  rm -f .git/index.lock
  git add -A dropship/ 2>/dev/null
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -q -m "CJ-Ledger auto [skip ci]" 2>/dev/null
    git fetch -q origin "$BRANCH" 2>/dev/null
    git merge -q "origin/$BRANCH" 2>/dev/null
    timeout 40 git push origin "$BRANCH" 2>/dev/null
  fi
  sleep 300
done
