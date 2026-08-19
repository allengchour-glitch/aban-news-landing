#!/bin/bash
# Täglicher Versuch, CJ-Reviews für die Trend-Produkte (hype-jetzt) zu Judge.me zu holen.
# Bricht der Import wegen CJ-Punkten ab, versucht es der nächste Tag — Ledger schützt vor Doppeln.
cd /home/user/aban-news-landing || exit 1
set -a; . /tmp/judgeme_creds.env 2>/dev/null; set +a
export CJ_EMAIL="${CJ_EMAIL:-dummy}" CJ_API_KEY="${CJ_API_KEY:-dummy}"
# ⚠️ 19.08.: Ohne CJ_TOKEN versucht der Importer einen Login mit der Dummy-Email und
# scheitert («not a valid email address») — das fertige Token aus /tmp direkt durchreichen.
export CJ_TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/cj_token.json'))['accessToken'])" 2>/dev/null)
export SHOPIFY_ADMIN_TOKEN=$(cat /tmp/cj_shop_token.txt 2>/dev/null) SHOPIFY_SHOP=au3j0y-hq.myshopify.com
QUERY="tag:hype-jetzt" LIMIT=25 PER=8 /opt/node22/bin/node automation/cj_reviews_import.mjs
