"""Shopify-Zugriff für die Produktübersetzung: Token (Client-Credentials) und GraphQL mit Wiederholung bei Drosselung.

Nur Standardbibliothek. Zugang aus SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (nie ausgeben).
"""
import json
import os
import re
import time
import urllib.error
import urllib.request

API = '2025-01'


def token():
    shop, cid, sec = os.environ['SHOPIFY_SHOP'], os.environ['SHOPIFY_CLIENT_ID'], os.environ['SHOPIFY_CLIENT_SECRET']
    m = re.match(r'^shpss_[0-9a-f]{32}', sec.strip())
    sec = m.group(0) if m else sec.strip()
    req = urllib.request.Request(f'https://{shop}/admin/oauth/access_token', method='POST',
                                 data=json.dumps({'client_id': cid, 'client_secret': sec, 'grant_type': 'client_credentials'}).encode(),
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return shop, json.loads(r.read())['access_token']


def gql(shop, tok, query, variables=None, versuche=6):
    """GraphQL-Aufruf; wartet bei THROTTLED, HTTP 429/5xx und Netzfehlern und versucht es erneut."""
    letzter = None
    for v in range(versuche):
        req = urllib.request.Request(f'https://{shop}/admin/api/{API}/graphql.json', method='POST',
                                     data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
                                     headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                j = json.loads(r.read())
        except urllib.error.HTTPError as e:
            letzter = f'HTTP {e.code}'
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(min(60, 2 * 2 ** v))
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            letzter = type(e).__name__
            time.sleep(min(30, 2 * 2 ** v))
            continue
        if j.get('errors'):
            codes = [(x.get('extensions') or {}).get('code') for x in j['errors']]
            if 'THROTTLED' in codes:
                letzter = 'THROTTLED'
                time.sleep(min(30, 2 + 2 * v))
                continue
            raise RuntimeError(json.dumps(j['errors'], ensure_ascii=False)[:500])
        st = ((j.get('extensions') or {}).get('cost') or {}).get('throttleStatus') or {}
        if st.get('currentlyAvailable', 1000) < 250:
            time.sleep(1.5)
        return j['data']
    raise RuntimeError('GraphQL fehlgeschlagen: ' + str(letzter))
