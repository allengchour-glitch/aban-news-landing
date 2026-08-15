#!/bin/bash
# Schulstart-Import (Betreiber 15.08.2026, aus CJs «Winning Products August»-Artikel:
# «füge das auch hinzu, mit bearbeitung und auswahl und alles mögliche»).
#
# Die Kandidaten sind recherchiert, aber das CJ-Punktebudget war leer (der Grind frisst das
# Tageskontingent in Stunden). Dieser Lauf versucht es deshalb geduldig immer wieder — beim
# nächsten Punktefenster (Reset 16:00 UTC) geht er durch. FERTIG ist er erst, wenn beide
# fest recherchierten Rucksäcke im Ledger stehen; die Such-Posten (Lunchtasche, Laptophülle,
# Organizer) nimmt derselbe Durchgang mit.
#
# ⚠️ Höchstens alle 30 Minuten ein Versuch — ein leeres Punktebudget schlägt schnell fehl,
# aber 720 sinnlose Anläufe pro Tag müssen trotzdem nicht sein.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEDGER="$REPO/dropship/cj_niche_done.txt"
MARKE=/tmp/schulstart_last

if grep -q "cj:2608140735271620000" "$LEDGER" 2>/dev/null \
   && grep -q "cj:2608140254241610000" "$LEDGER" 2>/dev/null; then
  echo "SCHULSTART FERTIG — beide Rucksäcke im Ledger"
  exit 0
fi
if [ -f "$MARKE" ]; then
  ALTER=$(( $(date +%s) - $(stat -c %Y "$MARKE") ))
  [ "$ALTER" -lt 1800 ] && exit 0
fi
: > "$MARKE"
cd "$REPO" || exit 1
# Zugangsdaten wie die Grind-Runner (Shopify-Client, Groq, CJ) — ohne sie stirbt der
# Importer sofort an «shTok: kein Token».
source /tmp/secrets_env.sh 2>/dev/null
source /tmp/cj_creds.env 2>/dev/null
ITEMS="pid:2608140735271620000,pid:2608140254241610000,search:insulated lunch bag,search:laptop sleeve with stand,search:electronics organizer bag" \
  exec /opt/node22/bin/node automation/cj_sku_import.mjs
