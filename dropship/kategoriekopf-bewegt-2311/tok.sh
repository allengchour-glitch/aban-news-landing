#!/bin/bash
# holt frisches Admin-Token per Client-Credentials, schreibt nur in eine Datei (nie ausgeben)
curl -s -X POST "https://${SHOPIFY_SHOP}/admin/oauth/access_token" -H 'Content-Type: application/json' \
  -d "{\"client_id\":\"${SHOPIFY_CLIENT_ID}\",\"client_secret\":\"${SHOPIFY_CLIENT_SECRET}\",\"grant_type\":\"client_credentials\"}" \
  | python3 -c "import sys,json; t=json.load(sys.stdin).get('access_token'); open('$(dirname $0)/.tok','w').write(t or ''); print('token', 'ok' if t else 'FEHLT')"
