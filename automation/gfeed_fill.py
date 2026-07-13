#!/usr/bin/env python3
# gfeed_fill.py — füllt Google-Shopping-Pflichtmetafelder gender + age_group (2026-07-12, «mach alles top»).
# Google liest mm-google-shopping-Metafelder, NICHT den Text. Ohne gender/age_group matcht der Apparel-Feed
# schlecht = weniger Gratis-Shopping-Traffic. Ableitung: gender aus Tags, age_group=adult (kids wenn Baby/Kinder).
# Resümierbar via Ledger. Quelle: /tmp/gaps2.json + /tmp/tags2.json + /tmp/titles2.json.
import json,urllib.request,os,time
SHOP="au3j0y-hq.myshopify.com"; URL=f"https://{SHOP}/admin/api/2025-01/graphql.json"
LED="/tmp/gfeed_done.txt"
def refresh():
    b=json.dumps({"client_id":os.environ['SHOPIFY_CLIENT_ID'],"client_secret":os.environ['SHOPIFY_CLIENT_SECRET'],"grant_type":"client_credentials"}).encode()
    r=urllib.request.Request(f"https://{SHOP}/admin/oauth/access_token",b,{"Content-Type":"application/json"})
    t=json.load(urllib.request.urlopen(r))['access_token'];open('/tmp/shopify_tok.txt','w').write(t);return t
TOK=open('/tmp/shopify_tok.txt').read().strip()
done=set(open(LED).read().split()) if os.path.exists(LED) else set()
gaps=json.load(open('/tmp/gaps2.json'))
tags=json.load(open('/tmp/tags2.json'))
titles=json.load(open('/tmp/titles2.json'))
need_g=set(gaps['no_gender']); need_a=set(gaps['no_age'])
allids=[i for i in (need_g|need_a) if i not in done]
print(f"gfeed-Fill: {len(allids)} offen ({len(done)} erledigt)")
def gender_of(pid):
    ts=' '.join(tags.get(pid,[])).lower()+' '+titles.get(pid,'').lower()
    if any(w in ts for w in ['herren','männer','manner','herr ','für ihn','mens','herrenuhr','herrenring']): return 'male'
    if any(w in ts for w in ['damen','frauen','women','für sie','ladies','damenuhr','damenring','damentasche']): return 'female'
    return 'unisex'
def age_of(pid):
    ts=' '.join(tags.get(pid,[])).lower()+' '+titles.get(pid,'').lower()
    if any(w in ts for w in ['baby','säugling','saeugling','newborn']): return 'newborn'
    if any(w in ts for w in ['kinder','kids','kind ','kleinkind','toddler','jungen','mädchen','madchen']): return 'kids'
    return 'adult'
def mset(pid,fields):
    body={"query":"mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}","variables":{"m":fields}}
    global TOK
    for a in range(3):
        b=json.dumps(body).encode()
        req=urllib.request.Request(URL,b,{"X-Shopify-Access-Token":TOK,"Content-Type":"application/json"})
        try:
            r=json.load(urllib.request.urlopen(req,timeout=25))
            if r.get('data') is not None: return r['data']['metafieldsSet']['userErrors']
            TOK=refresh();time.sleep(1)
        except urllib.error.HTTPError as e:
            if e.code in(401,403):TOK=refresh()
            time.sleep(2)
        except: time.sleep(2)
    return [{"message":"retry-fail"}]
ok=0
for pid in allids:
    fields=[]
    if pid in need_g:
        fields.append({"ownerId":pid,"namespace":"mm-google-shopping","key":"gender","type":"single_line_text_field","value":gender_of(pid)})
    if pid in need_a:
        fields.append({"ownerId":pid,"namespace":"mm-google-shopping","key":"age_group","type":"single_line_text_field","value":age_of(pid)})
    if fields: mset(pid,fields)
    open(LED,'a').write(pid+"\n");ok+=1
    if ok%300==0: print(f"  ...{ok} gesetzt")
    time.sleep(0.32)
print(f"✅ FERTIG gfeed-Fill: {ok} Produkte")
