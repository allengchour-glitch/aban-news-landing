#!/bin/bash
# selbstkontrolle.sh — Dauer-Selbstkontrolle (User 2026-07-12: «selbstkontrolle immer»).
# Prüft alle CJ-Grind-Engines + Auto-Committer, startet Tote neu, committet Ledger-Drift, meldet Zahl.
# Idempotent, mehrfach aufrufbar. Wird von der hourly Keepalive-Routine + autostart.sh aufgerufen.
# WICHTIG: Tokens leben nur in /tmp (nie im Repo, Repo ist PUBLIC). Bei /tmp-Wipe: Runner können
# nicht neu starten (Token/apiKey weg) → dann muss der User die 5 CJ-Zugänge neu geben.
cd "$(dirname "$0")/.." || exit 1
BRANCH=claude/luxestyle-status-tztnn1
alive(){ ps aux | grep -E "$1" | grep -v grep | grep -v selbstkontrolle | wc -l; }

# ── 1. CJ-Runner (5 Konten, self-refreshen Tokens beim Start) ──
declare -A RUN=(
  [cj_queue_runner.sh]=/tmp/cj_runner.log
  [cj_runner2.sh]=/tmp/cj_runner2.log
  [cj_runner3.sh]=/tmp/cj_runner3.log
  [cj_runner4.sh]=/tmp/cj_runner4.log
  [cj_runner5.sh]=/tmp/cj_runner5.log
)
STARTED=0; MISSING=0
for S in "${!RUN[@]}"; do
  if [ "$(alive "$S")" -eq 0 ]; then
    if [ -f "/tmp/$S" ]; then
      nohup bash "/tmp/$S" >> "${RUN[$S]}" 2>&1 &
      echo "[selbstkontrolle] $S tot → neu gestartet (PID $!)"; STARTED=$((STARTED+1))
    else
      echo "[selbstkontrolle] ⚠️ /tmp/$S FEHLT (Container-Wipe) — Runner-Script + Token neu nötig"; MISSING=$((MISSING+1))
    fi
  fi
done

# ── 2. Auto-Committer (5-Min-Loop) ──
if [ "$(alive 'sleep 300; cd')" -eq 0 ]; then
  nohup bash -c "while true; do sleep 300; cd /home/user/aban-news-landing; git add -A 2>/dev/null; git diff --cached --quiet || (git commit -q -m 'Ledger-Drift (auto) #autocommit-loop' && git pull --rebase --autostash -q origin $BRANCH 2>/dev/null; git push -q origin $BRANCH 2>/dev/null); done" > /tmp/autocommit.log 2>&1 &
  echo "[selbstkontrolle] Auto-Committer tot → neu gestartet (PID $!)"
fi

# ── 3. Sofort committen+pushen (nicht auf 5-Min-Loop warten) ──
git add -A 2>/dev/null
if ! git diff --cached --quiet; then
  git commit -q -m "Ledger-Drift (selbstkontrolle)" 2>/dev/null
  git pull --rebase --autostash -q origin "$BRANCH" 2>/dev/null
  git push -q origin "$BRANCH" 2>/dev/null && echo "[selbstkontrolle] committet+gepusht"
fi

# ── 4. Statusmeldung ──
CNT=$(wc -l < dropship/cj_niche_done.txt 2>/dev/null || echo '?')
RUNNERS=$(( 5 - STARTED - MISSING )); [ "$RUNNERS" -lt 0 ] && RUNNERS=0
echo "[selbstkontrolle] 📊 $CNT CJ · Runner liefen ${RUNNERS}/5 (neu:$STARTED, fehlend:$MISSING)"
