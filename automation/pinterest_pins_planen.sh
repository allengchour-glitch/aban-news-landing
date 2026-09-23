#!/usr/bin/env bash
# pinterest_pins_planen.sh — legt je Tag N Pin-Aufträge für den Hetzner-Agenten an (je Auftrag EIN Pin).
# ANLASS 22.09.2026 (Betreiber «push mehr» Besucher): Pinterest steht nicht unter dropship/_SOCIAL_STOPP.
# Der Agent arbeitet Aufträge aus auftraege/offen/ im 5-Minuten-Takt ab; das Pin-Skript quittiert über
# auftraege/erledigt (und liest die Pinnwand). Dieser Planer schreibt nur Auftragsdateien und pusht sie —
# idempotent: gibt es für heute schon Aufträge (offen ODER erledigt), tut er nichts.
#   PINS_JE_TAG (Standard 6) · Warteschlange leer → nichts anlegen (Bauer: automation/pinterest_pins_queue_bauen.py)
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || exit 1
N="${PINS_JE_TAG:-6}"
TAG=$(date -u +%F)
[ -f dropship/_SOCIAL_STOPP_PINTEREST ] && { echo "Pinterest-Stopp gesetzt — keine Aufträge"; exit 0; }
[ -s dropship/_pinterest_pins_queue.tsv ] || { echo "keine Warteschlange"; exit 0; }
if ls auftraege/offen/pinterest-pin-$TAG-*.json auftraege/erledigt/pinterest-pin-$TAG-*.json >/dev/null 2>&1; then
  echo "heute schon geplant"; exit 0
fi
OFFEN=$(python3 - <<'PY'
import glob,json,csv
q=[r['handle'] for r in csv.DictReader(open('dropship/_pinterest_pins_queue.tsv'),delimiter='\t')]
done=set()
for f in glob.glob('auftraege/erledigt/pinterest-pin-*.json'):
    try: d=json.load(open(f)); e=d.get('ergebnis') or d.get('teilergebnis') or {}
    except Exception: continue
    done|=set(e.get('gepinnt') or [])|set(e.get('unklar') or [])
print(len([h for h in q if h not in done]))
PY
)
[ "${OFFEN:-0}" -gt 0 ] || { echo "Warteschlange abgearbeitet (0 offen) — Bauer neu laufen lassen"; exit 0; }
[ "$OFFEN" -lt "$N" ] && N="$OFFEN"
mkdir -p auftraege/offen
for i in $(seq 1 "$N"); do
  cat > "auftraege/offen/pinterest-pin-$TAG-$i.json" <<J
{"typ":"skript","skript":"pinterest_pin_erstellen.mjs","id":"pinterest-pin-$TAG-$i","warum":"Täglicher Pin-Plan (Betreiber 22.09.: mehr Besucher; Pinterest nicht unter dem Social-Stopp). Genau EIN Pin aus dropship/_pinterest_pins_queue.tsv, Quittung vor Nebenwirkung (Pinnwand vorher/nachher). $i von $N heute."}
J
done
# 23.09.2026: git_sichern.sh (Merge, kein Autostash — Autostash verschluckte Quittungen laufender Poster)
bash automation/git_sichern.sh "Pinterest: $N Pin-Aufträge für $TAG [skip ci]" auftraege/offen/ >/dev/null && echo "$N Aufträge für $TAG gepusht ($OFFEN offen in der Warteschlange)"
