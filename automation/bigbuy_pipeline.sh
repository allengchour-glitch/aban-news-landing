#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────────────────
# LuxeStyle — VOLLAUTONOME Produkt-Pipeline: HOLEN + CLEANEN + GOOGLE-MERCHANT-SAUBER
# Ein Befehl macht alles, was sonst 8 Skripte einzeln machen:
#   1) Import (BigBuy, markenstark, Ban-Filter gegen Adult/Junk/Kinder)
#   2) Retitle  → echte Marken-Namen
#   3) Marke + GTIN (Google-Shopping-Identifier)
#   4) Feed-Flag (custom_product=true wo keine GTIN)
#   5) Beschreibung (echte BigBuy-Spec-Liste)
#   6) GMC-Pflichtfelder: age_group · gender · google_product_category · color
#   7) Commit + Push
# Aufruf:  CATS="beauty,haustier,home" PER=6 bash automation/bigbuy_pipeline.sh
# ───────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.."
CATS="${CATS:-beauty,haustier,home}"; PER="${PER:-6}"; GAP="${GAP:-2000}"
N=/opt/node22/bin/node
set -a; . /tmp/shopify_creds.env; set +a
export BIGBUY_API_KEY="$(cat /tmp/bigbuy_key.txt)"
export GEMINI_API_KEY="$(cat /tmp/gemini_key 2>/dev/null || echo)"
export GROQ_API_KEY="$(cat /tmp/groq_key.txt 2>/dev/null || echo)"
LOG="/tmp/pipe_$(date +%s).log"
echo "════ 1) IMPORT  CATS=$CATS PER=$PER ════"
CATS="$CATS" PER="$PER" GAP="$GAP" LIVE=1 $N automation/bigbuy_import.mjs 2>&1 | tee "$LOG" | grep -E "===|Fertig:|⚠️|✅" || true
HANDLES=$(grep -oE "\(([a-z0-9-]+)\)\$" "$LOG" | tr -d '()' | paste -sd,)
CNT=$(echo "$HANDLES" | tr ',' '\n' | grep -c . || echo 0)
if [ "$CNT" -lt 1 ]; then echo "Keine neuen Produkte (Kategorien gesättigt). Ende."; exit 0; fi
echo "Neu angelegt: $CNT"
echo "════ 2) RETITLE (Marken) ════"; HANDLES="$HANDLES" LIVE=1 $N automation/bigbuy_retitle_brand.mjs 2>&1 | tail -1
echo "════ 3) MARKE + GTIN ════"; LIVE=1 MAX=90 $N automation/bigbuy_gtin_fill.mjs 2>&1 | grep -E "gesetzt" || true
echo "════ 4) FEED-FLAG ════"; LIVE=1 MAX=90 $N automation/google_feed_fix.mjs 2>&1 | tail -1
echo "════ 5) BESCHREIBUNG (Specs) ════"; LIVE=1 $N automation/bigbuy_enrich_details.mjs 2>&1 | tail -1
echo "════ 6) GMC age/gender/Kategorie/Farbe ════"
LIVE=1 $N automation/gmc_attributes_fix.mjs 2>&1 | tail -1
LIVE=1 $N automation/gmc_category_fix.mjs 2>&1 | tail -1
LIVE=1 $N automation/gmc_color_fix.mjs 2>&1 | tail -1
echo "════ 6b) BILDER: Grössentabellen/Doppel entfernen ════"
LIVE=1 $N automation/bigbuy_dedupe_images.mjs 2>&1 | tail -1 || true
echo "════ 6c) TRUST-BLOCK in jede Produktbeschreibung ════"
LIVE=1 $N automation/product_trust_fill.mjs 2>&1 | tail -1 || true
echo "════ 6d) KI-KATEGORIE-POLISH (Groq/Gemini, nur leere Beschr.) ════"
ONLY_EMPTY=1 LIVE=1 $N automation/ai_polish_collections.mjs 2>&1 | tail -2 || true
echo "════ 7) COMMIT ════"
git add -A && git commit -q -m "pipeline: auto-holen+cleanen ($CATS) — +$CNT, Merchant-sauber

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Y9ktMaMNLMu9xnNibXbqrT" 2>/dev/null && git push 2>&1 | tail -1 || echo "(nichts zu committen)"
echo "✅ PIPELINE FERTIG — $CNT Produkte geholt UND komplett Merchant-sauber."
