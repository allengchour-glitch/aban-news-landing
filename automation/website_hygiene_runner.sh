#!/bin/bash
# Website-Hygiene: entfernt Lieferanten-Leaks aus Kundentiteln/-texten (CLAUDE.md Regel 3).
# Alle 2 Stunden, resumable (eigener Cursor im Script).
cd /home/user/aban-news-landing || exit 1

# ⚠️ EINZEL-SPERRE (11.08.2026): Dieses Skript lief in ZWEI Kopien gleichzeitig — eine aus
# /tmp, eine aus automation/. Beide Aufsichten prüften «läuft schon?» über den Pfad, den sie
# selbst kannten, und sahen die jeweils andere Kopie nicht. Zwei Kopien bedeuten doppelte
# Shopify-Last für dieselbe Arbeit. Die Sperre hängt am Zweck, nicht am Pfad: Wer sie nicht
# bekommt, endet sofort — egal von wo er gestartet wurde.
exec 9>/tmp/website_hygiene.lock
flock -n 9 || { echo "$(date -u +%H:%M) Website-Hygiene läuft bereits — dieser Start endet."; exit 0; }

source /tmp/secrets_env.sh 2>/dev/null
while true; do
  echo "$(date -u +%H:%M) strip_supplier_leaks start"
  /opt/node22/bin/node automation/strip_supplier_leaks.mjs 2>&1 | tail -20

  # Prompt-Wache (14.08.2026): Drei veröffentlichte Kollektionen trugen monatelang den
  # englischen KI-Arbeitsauftrag als Kundentext — bei allen dreien in der Meta-Description,
  # also im Google-Snippet. Der Generator lag nur in /tmp und ist weg; bleibend ist deshalb
  # nur die Kontrolle. Der Lauf schreibt nichts, er meldet nur (Exit 1 = Fund).
  echo "$(date -u +%H:%M) kollektion_prompttext --pruefen"
  python3 automation/kollektion_prompttext_fix.py --pruefen 2>&1 | tail -12 || true

  # Bewertungsfoto-Wache (14.08.2026): Zwölf Bewertungsfotos zeigten den Lieferanten
  # (AliExpress-Bestellabrechnung mit «Cupom AliExpress», AliExpress-App-Screenshot,
  # chinesisches Versandetikett) oder eine Fremdmarke (AIMIMO-Garantiekarten,
  # CONTACT'S-Konformitätszertifikat). Judge.me erlaubt kein Bearbeiten von Bewertungsfotos
  # über die API, also wurden sie aus den Shopify-Metafeldern judgeme.widget /
  # judgeme.review_widget_data geschnitten. ⚠️ Judge.me schreibt genau diese Metafelder bei
  # jeder Cache-Erneuerung neu — ohne diesen Nachlauf wären die Bilder danach wieder da.
  # Der Lauf ist idempotent: findet er nichts, schreibt er nichts.
  echo "$(date -u +%H:%M) bewertungsfotos_saeubern"
  python3 automation/bewertungsfotos_saeubern.py --scharf 2>&1 | tail -8 || true

  sleep 7200
done
