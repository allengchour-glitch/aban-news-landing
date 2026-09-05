#!/usr/bin/env python3
# seo_fill.py — füllt fehlende SEO-Titel + Meta-Description (Polish-Welle 2026-07-12).
# Google-Traffic-Hebel: 6470 aktive Produkte hatten keinen SEO-Titel. Template ist konversions-
# orientiert (Trust-Signale: Gratis-Versand, Rückgabe, Klarna/TWINT). Resümierbar via Ledger.
# Quelle: /tmp/audit_ids.json['noseo']. Token: /tmp/shopify_tok.txt (bei 401 frisch via env).
import json,urllib.request,os,time
SHOP="au3j0y-hq.myshopify.com"; URL=f"https://{SHOP}/admin/api/2025-01/graphql.json"
LEDGER="/tmp/seo_fill_done.txt"
def tok(): return open('/tmp/shopify_tok.txt').read().strip()
def refresh():
    cid=os.environ['SHOPIFY_CLIENT_ID']; csec=os.environ['SHOPIFY_CLIENT_SECRET']
    b=json.dumps({"client_id":cid,"client_secret":csec,"grant_type":"client_credentials"}).encode()
    r=urllib.request.Request(f"https://{SHOP}/admin/oauth/access_token",b,{"Content-Type":"application/json"})
    t=json.load(urllib.request.urlopen(r))['access_token']; open('/tmp/shopify_tok.txt','w').write(t); return t
TOK=tok()
done=set(open(LEDGER).read().split()) if os.path.exists(LEDGER) else set()
# Titel-Map aus Bulk-Export
titles={}
for l in open('/tmp/catalog_audit.jsonl'):
    try:o=json.loads(l)
    except:continue
    if o.get('id','').startswith('gid://shopify/Product/') and o.get('title'): titles[o['id']]=o['title']
ids=[i for i in json.load(open('/tmp/audit_ids.json'))['noseo'] if i not in done]
print(f"SEO-Fill: {len(ids)} offen ({len(done)} erledigt)")
M='mutation($id:ID!,$s:SEOInput!){productUpdate(input:{id:$id,seo:$s}){userErrors{message}}}'
def gql(pid,seo):
    global TOK
    for a in range(3):
        b=json.dumps({"query":M,"variables":{"id":pid,"s":seo}}).encode()
        req=urllib.request.Request(URL,b,{"X-Shopify-Access-Token":TOK,"Content-Type":"application/json"})
        try:
            r=json.load(urllib.request.urlopen(req,timeout=25))
            if r.get('data') is not None: return r['data']['productUpdate']['userErrors']
            TOK=refresh(); time.sleep(1)
        except urllib.error.HTTPError as e:
            if e.code in (401,403): TOK=refresh()
            time.sleep(2)
        except: time.sleep(2)
    return [{"message":"retry-fail"}]
ok=0
for pid in ids:
    t=titles.get(pid,'').strip()
    if not t: open(LEDGER,'a').write(pid+"\n"); continue
    st=(t+" | LuxeStyle")[:70]
    sd=(f"{t} – jetzt bei LuxeStyle CH bestellen. Gratis-Versand ab CHF 50, 30 Tage Rückgabe, "
        f"Kauf auf Rechnung mit Klarna & TWINT.")[:320]
    e=gql(pid,{"title":st,"description":sd})
    # ⚠️ 05.09.2026: Hier stand die Quittung UNBEDINGT vor der Erfolgspruefung — auch ein
    # `retry-fail` wurde quittiert, und eine falsche Quittung ueberspringt das Produkt fuer
    # immer. Geschrieben wird jetzt nur, wenn die Mutation wirklich ohne Fehler zurueckkam.
    if e:
        print(f"  ⚠️ {pid}: {str(e)[:80]} — NICHT quittiert"); continue
    open(LEDGER,'a').write(pid+"\n")
    ok+=1
    if ok%200==0 and ok: print(f"  ...{ok} gefüllt")
    time.sleep(0.35)
print(f"✅ FERTIG SEO-Fill: {ok} gefüllt")
