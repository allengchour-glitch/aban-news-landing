#!/bin/bash
# selbstkontrolle.sh — Dauer-Selbstkontrolle (User 2026-07-12: «selbstkontrolle immer»).
# Prüft die CJ-Grind-Engines + Auto-Committer, startet Tote neu, committet Ledger-Drift, meldet Zahl.
# Idempotent, mehrfach aufrufbar. Wird von der hourly Keepalive-Routine + autostart.sh aufgerufen.
#
# ⚠️ ZWEI teuer gelernte Fallen (2026-07-12), die hier abgefangen werden:
#   (A) Runner-Shell lebt, aber Worker sterben still → «Shell lebt» ist KEIN Gesundheits-Beweis.
#       → Deshalb wird zusätzlich LEDGER-STAGNATION geprüft: wächst cj_niche_done.txt nicht,
#         werden ALLE Runner hart neu gestartet, egal ob die Shell noch in ps steht.
#   (B) Worker brauchen SHOPIFY_CLIENT_ID/SECRET im Env, sonst können sie kein Produkt anlegen
#       und die Shell hängt credlos → Ledger friert ein. Deshalb wird /tmp/shopify_env.sh
#       vor jedem Runner-Start gesourct (die Datei liegt nur in /tmp, nie im PUBLIC-Repo).
# Tokens/Creds leben nur in /tmp. Bei /tmp-Wipe: melde dem User, dass die Zugänge neu müssen.
cd "$(dirname "$0")/.." || exit 1
BRANCH=claude/luxestyle-status-tztnn1
SHENV=/tmp/shopify_env.sh
LEDGER=dropship/cj_niche_done.txt
alive(){ ps aux | grep -E "$1" | grep -v grep | grep -v selbstkontrolle | wc -l; }
start_runner(){ # $1=script-basename $2=logfile
  if [ -f "/tmp/$1" ]; then
    nohup bash -c "[ -s '$SHENV' ] && source '$SHENV'; exec bash /tmp/$1" >> "$2" 2>&1 &
    echo "[selbstkontrolle] $1 gestartet (PID $!)"
  else
    echo "[selbstkontrolle] ⚠️ /tmp/$1 FEHLT (Container-Wipe) — Runner-Script + CJ-Token neu nötig"
  fi
}
declare -a R=( "cj_queue_runner.sh:/tmp/cj_runner.log" "cj_runner2.sh:/tmp/cj_runner2.log" \
  "cj_runner3.sh:/tmp/cj_runner3.log" "cj_runner4.sh:/tmp/cj_runner4.log" "cj_runner5.sh:/tmp/cj_runner5.log" )

# ── Falle A: Ledger-Stagnation? (kein Wachstum in >20 Min = Grind eingefroren trotz lebender Shells) ──
NOW=$(date +%s); MT=$(stat -c %Y "$LEDGER" 2>/dev/null || echo 0); AGE=$(( NOW - MT ))
if [ "$AGE" -gt 1200 ] && [ "$(alive 'cj_category_fill|cj_sku_import')" -eq 0 ]; then
  echo "[selbstkontrolle] ⚠️ Ledger seit ${AGE}s eingefroren + keine Worker → HARTER Neustart aller Runner"
  pkill -f 'cj_runner[2-5]\.sh' 2>/dev/null; pkill -f 'cj_queue_runner\.sh' 2>/dev/null; sleep 2
fi

# ── 1. CJ-Runner: tote (oder eben hart-gekillte) neu starten, MIT Shopify-Creds ──
for e in "${R[@]}"; do S="${e%%:*}"; L="${e##*:}"; [ "$(alive "$S")" -eq 0 ] && start_runner "$S" "$L"; done

# ── 2. Auto-Committer (5-Min-Loop) — nutzt jetzt den flock-serialisierten git_sync.sh ──
if [ "$(alive 'git_sync.sh auto-loop|sleep 300; cd')" -eq 0 ]; then
  nohup bash -c "while true; do sleep 300; bash /home/user/aban-news-landing/automation/git_sync.sh 'Ledger-Drift (auto) #autocommit-loop'; done # git_sync.sh auto-loop" > /tmp/autocommit.log 2>&1 &
  echo "[selbstkontrolle] Auto-Committer neu gestartet (PID $!)"
fi

# ── 3. Sofort committen+pushen (serialisiert via flock) ──
bash "$(dirname "$0")/git_sync.sh" "Ledger-Drift (selbstkontrolle)"

# ── 4. Statusmeldung ──
CNT=$(wc -l < "$LEDGER" 2>/dev/null || echo '?')
echo "[selbstkontrolle] 📊 $CNT CJ · Runner $(alive 'cj_runner[2-5]\.sh|cj_queue_runner\.sh')/5 · Worker $(alive 'cj_category_fill|cj_sku_import') · Committer $(alive 'git_sync.sh auto-loop|sleep 300; cd')/1"
