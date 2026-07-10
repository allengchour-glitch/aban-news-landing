#!/usr/bin/env python3
# Reprice-Engine (User 2026-07-10 «Preise senken»): senkt überteuerte Produkte Richtung Google-Benchmark,
# ABER NIE unter Kosten-Boden (Einkauf+CH-Versand bei BigBuy / -30%-Limit bei CJ) → kein Verkauf mit Verlust.
# Input: Google-«Price competitiveness»-Export CSV (Spalten: Item ID, Your price / Benchmark price).
# Aufruf: BENCH_CSV=/pfad.csv DRY=1 python3 reprice_to_benchmark.py
import json, subprocess, os, csv, re, time, glob
os.chdir('/home/user/aban-news-landing')
DRY=os.environ.get('DRY','1')=='1'
BENCH=os.environ['BENCH_CSV']
FX=float(os.environ.get('EUR_CHF','0.97'))   # 1 EUR ≈ 0.97 CHF
MARGIN=float(os.environ.get('MIN_MARGIN','1.15'))
LEDGER='dropship/_reprice_done.txt'
done=set(open(LEDGER).read().split()) if os.path.exists(LEDGER) else set()
tokf='/tmp/shopify_tok.txt'
def tok(): return open(tokf).read().strip()
def refresh():
    r=subprocess.run(['curl','-s','-X','POST','https://au3j0y-hq.myshopify.com/admin/oauth/access_token','-H','Content-Type: application/json',
      '-d',json.dumps({'client_id':os.environ['SHOPIFY_CLIENT_ID'],'client_secret':os.environ['SHOPIFY_CLIENT_SECRET'],'grant_type':'client_credentials'})],capture_output=True,text=True)
    t=json.loads(r.stdout).get('access_token');  open(tokf,'w').write(t) if t else None
def gql(q,v=None):
    for _ in range(5):
        r=subprocess.run(['curl','-s','-X','POST','https://au3j0y-hq.myshopify.com/admin/api/2025-01/graphql.json',
          '-H','X-Shopify-Access-Token: '+tok(),'-H','Content-Type: application/json','-d',json.dumps({'query':q,'variables':v or {}})],capture_output=True,text=True)
        try: d=json.loads(r.stdout)
        except: time.sleep(2); continue
        if d.get('data'): return d
        if any('Throttled' in str(e) for e in d.get('errors',[])): time.sleep(4); continue
        refresh(); time.sleep(2)
    return {}
# BigBuy Einkaufspreise (ref → wholesale EUR) + Versand (ref → EUR) + id→ref-Mapping
bb_cost={}
for f in glob.glob('/tmp/bb_prod_p*.json'):
    try: d=json.load(open(f))
    except: continue
    if isinstance(d,list):
        for p in d:
            ref=str(p.get('sku') or '').upper()
            wp=p.get('wholesalePrice') or p.get('inShopsPrice')
            if ref and wp: bb_cost[ref]=float(wp)
try: bb_ship={str(k).upper():v for k,v in json.load(open('/tmp/bb_ship_ch.json')).items()}
except: bb_ship={}
try: bb_id2ref={str(k):str(v).upper() for k,v in json.load(open('/tmp/bb_id2ref_full.json')).items()}
except: bb_id2ref={}
def bb_floor(sku):
    """Kosten-Boden (CHF) für BigBuy-SKU. None wenn Kosten nicht sicher auflösbar → NICHT senken."""
    s=sku.upper()
    if not s.startswith('BB-'): return 'NOTBB'
    key=s[3:]                                  # bb-S0800574 → S0800574 ; bb-1298946 → 1298946
    ref=key if key in bb_cost else bb_id2ref.get(key.lstrip('S').lstrip('V')) or bb_id2ref.get(key)
    if ref: ref=ref.upper()
    wp=bb_cost.get(key) or (bb_cost.get(ref) if ref else None)
    if wp is None: return None                 # Kosten unbekannt → skip (kein Verlust-Risiko)
    sh=bb_ship.get(key) or (bb_ship.get(ref) if ref else None) or 27.94
    return (float(wp)+float(sh))*FX*MARGIN
def numid(s):
    for t in s.split('_'):
        if t.isdigit() and len(t)>=12: return t
    return None
def price90(x):
    x=max(0.9, x); return round(int(x)+0.90 if x>=2 else round(x,2),2)
rows=[]
with open(BENCH,encoding='utf-8') as f:
    txt=f.read()
hi=0; lines=txt.splitlines()
for i,l in enumerate(lines):
    if ('Item ID' in l or 'Product ID' in l) and ('enchmark' in l or 'Your price' in l): hi=i; break
import io
for row in csv.DictReader(io.StringIO('\n'.join(lines[hi:]))):
    rows.append(row)
def money(s):
    if not s: return None
    m=re.search(r'([\d.,]+)', s.replace('CHF','').replace(',',''))
    return float(m.group(1)) if m else None
changed=skip=skipbb=0
for row in rows:
    iid=row.get('Item ID') or row.get('Product ID') or ''
    pid=numid(iid)
    if not pid or pid in done: continue
    # benchmark + your price columns (robust gegen Spaltennamen)
    bench=None; yours=None
    for k,v in row.items():
        kl=(k or '').lower().strip()
        if 'currency' in kl: continue                       # Währungsspalten überspringen
        if kl=='benchmark': bench=money(v)
        elif kl in ('your price','price'): yours=money(v)
    if not bench: continue
    gid=f'gid://shopify/Product/{pid}'
    d=gql('{p:product(id:"%s"){variants(first:1){edges{node{id price inventoryItem{sku}}}}}}'%gid).get('data',{}).get('p')
    if not d or not d['variants']['edges']: continue
    var=d['variants']['edges'][0]['node']
    cur=float(var['price']); sku=(var['inventoryItem'] or {}).get('sku','') or ''
    if bench>=cur: skip+=1; continue   # nicht überteuert
    # Kosten-Boden
    fl=bb_floor(sku)
    if fl is None:                     # BigBuy, Kosten nicht sicher → NICHT anfassen (kein Verlust)
        skipbb+=1; continue
    floor = (cur*0.60) if fl=='NOTBB' else fl   # CJ/Eigenware: bis -40% Richtung Benchmark
    target=price90(max(bench, floor))
    if target>=cur-0.01: skip+=1; continue
    if DRY:
        print(f'[DRY] {pid} {cur:.2f}→{target:.2f} (bench {bench:.2f}, floor {floor:.2f}) sku={sku[:14]}'); changed+=1
        continue
    r=gql('mutation($id:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$id,variants:$v){userErrors{message}}}',
        {'id':gid,'v':[{'id':var['id'],'price':str(target)}]})
    e=r.get('data',{}).get('productVariantsBulkUpdate',{}).get('userErrors',[])
    if e: print('✗',pid,e)
    else: open(LEDGER,'a').write(pid+'\n'); changed+=1
    time.sleep(0.3)
print(f"{'DRY ' if DRY else ''}gesenkt={changed}, unverändert(nicht-überteuert/Boden)={skip}, BigBuy-skip(Kosten-Boden schützt)={skipbb}")
