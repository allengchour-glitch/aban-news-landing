#!/usr/bin/env python3
"""Fuellt die MANUAL-Kollektion `bestseller` mit BELEGTEN Bewertungssiegern auf.

Warum: Die Reihe heisst «⭐ Unsere Bestseller» und stand am 10.09. bei 20 aktiven von 32 —
die Sieger, aus denen sie am 29.08. kuratiert wurde, sind inzwischen gedraftet
(ausverkauft-lieferant / keine-lieferanten-ref / ghost-sale-risiko). Eine Reihe, die
«Bestseller» heisst und keine bewerteten Produkte mehr zeigt, ist eine leere Behauptung.

Quelle der Wahrheit ist Judge.me (echte CJ-Kundenkommentare, nie erfundene Bewertungen).
Aufgenommen wird nur, was die BADGE-Bedingung des Shops erfuellt (≥4,0 ★ UND ≥3 Stimmen,
Schwelle seit 01.09.) — sonst traegt die Reihe Produkte, deren Sterne niemand sieht.

Gemessen wird am OBJEKT: Shopify-Status ACTIVE, im Onlineshop, kein Risiko-Tag.
MELDET im Trockenlauf, schreibt nur mit WRITE=1.
"""
import json,os,re,sys,time,urllib.request,urllib.parse

SHOP='au3j0y-hq.myshopify.com'
TOK=open('/tmp/cj_shop_token.txt').read().strip()
# ⚠️ /tmp/judgeme.env traegt 'export ' als Praefix — wer nur an '=' trennt, bekommt den Schluessel nie
JM={}
for _l in open('/tmp/judgeme.env'):
    _l=_l.strip()
    if _l.startswith('export '): _l=_l[7:]
    if '=' in _l and not _l.startswith('#'):
        _k,_v=_l.split('=',1); JM[_k.strip()]=_v.strip()
JT=JM['JUDGEME_PRIVATE_TOKEN'].strip().strip('"')
JD=JM['JUDGEME_SHOP_DOMAIN'].strip().strip('"')

MIN_STERNE=float(os.environ.get('MIN_STERNE','4.0'))   # Badge-Bedingung des Shops
MIN_STIMMEN=int(os.environ.get('MIN_STIMMEN','3'))
ZIEL=int(os.environ.get('ZIEL','32'))
MAX_JE_GRUPPE=int(os.environ.get('MAX_JE_GRUPPE','2'))                  # aktive Karten in der Reihe
WRITE=os.environ.get('WRITE')=='1'

# Tags, die ein Produkt aus dem Schaufenster ausschliessen (Hausregeln 12.08./29.08.)
RISIKO=re.compile(r'waffen?gesetz|waffe-pruefen|medizinprodukt|heilaussage|verdeckte-ueberwachung|'
                  r'raucher|18plus|erotik|nicht-bewerben|nur-onlineshop|duplikat|marge-verlust|'
                  r'keine-lieferanten-ref|ausverkauft-lieferant|nicht-lieferbar|cj-abgekuendigt|'
                  r'cj-nicht-versendbar|ghost-sale|bild-zu-klein|kostuem',re.I)
# Wirkversprechen/Intimes gehoeren nicht ins Schaufenster (Lehre 29.08.)
NICHT_TITEL=re.compile(r'wimpern\w*wachstum|haar\w*wachstum|\bwuchs\b|gegen (pigmentflecken|falten|akne)|'
                       r'abnehm(?!bar)|whitening|intim|nagelpilz|facelift',re.I)

def gql(q,v=None):
    for i in range(8):
        r=urllib.request.Request(f'https://{SHOP}/admin/api/2024-10/graphql.json',
            data=json.dumps({'query':q,'variables':v or {}}).encode(),
            headers={'X-Shopify-Access-Token':TOK,'Content-Type':'application/json'})
        try: d=json.loads(urllib.request.urlopen(r,timeout=60).read())
        except Exception: time.sleep(2+i); continue
        if d.get('errors'):
            # Eine Drosselung ist kein Abbruchgrund (Lehre 23.08.)
            if all('THROTTLED' in str(e.get('extensions',{}).get('code','')) for e in d['errors']):
                time.sleep(2+i); continue
            raise RuntimeError(d['errors'])
        return d['data']
    raise RuntimeError('Shopify antwortet nicht')

def jm(pfad,**p):
    p.update(api_token=JT,shop_domain=JD)
    u=f'https://judge.me/api/v1/{pfad}?'+urllib.parse.urlencode(p)
    for i in range(6):
        try: return json.loads(urllib.request.urlopen(u,timeout=60).read())
        except Exception: time.sleep(2+i)
    raise RuntimeError('Judge.me antwortet nicht')

CACHE='/tmp/_judgeme_aggregat.json'

def aggregat():
    """Alle Bewertungen durchblaettern und je Shopify-Produkt-ID aggregieren.

    Zwischengespeichert (6 h): 43 Seiten Judge.me kosten ~2 Minuten, und die Zahl
    aendert sich taeglich um wenige Dutzend.
    """
    if os.path.exists(CACHE) and time.time()-os.path.getmtime(CACHE)<6*3600:
        try: return {int(k):tuple(v) for k,v in json.load(open(CACHE)).items()}
        except Exception: pass
    summe,zahl={},{}
    seite=1
    while True:
        d=jm('reviews',per_page=100,page=seite)
        rs=d.get('reviews') or []
        if not rs: break
        for r in rs:
            pid=r.get('product_external_id')
            rating=r.get('rating')
            if not pid or not rating: continue
            if not r.get('published',True) or r.get('hidden'): continue
            summe[pid]=summe.get(pid,0)+rating; zahl[pid]=zahl.get(pid,0)+1
        if len(rs)<100: break
        seite+=1
        if seite>80: break
    erg={p:(summe[p]/zahl[p],zahl[p]) for p in zahl}
    try: json.dump({str(k):list(v) for k,v in erg.items()},open(CACHE,'w'))
    except Exception: pass
    return erg

def main():
    agg=aggregat()
    kand=[(p,s,n) for p,(s,n) in agg.items() if s>=MIN_STERNE and n>=MIN_STIMMEN]
    # ⚠️ Nach STIMMEN zuerst, nicht nach Sternen: bei 599 Kandidaten mit 5,0★ waere
    # die Sternsortierung eine Zufallsordnung. Acht Stimmen sagen mehr als drei.
    kand.sort(key=lambda x:(-x[2],-x[1]))
    print(f'Judge.me: {len(agg)} Produkte mit Bewertungen · {len(kand)} erfuellen '
          f'≥{MIN_STERNE}★ und ≥{MIN_STIMMEN} Stimmen')

    d=gql('{collectionByHandle(handle:"bestseller"){id sortOrder products(first:100){nodes{id status}}}}')
    c=d['collectionByHandle']
    drin={n['id'] for n in c['products']['nodes']}
    aktiv_drin=[n['id'] for n in c['products']['nodes'] if n['status']=='ACTIVE']
    print(f'bestseller: {len(aktiv_drin)} aktiv von {len(drin)} · sort={c["sortOrder"]}')
    fehlt=max(0,ZIEL-len(aktiv_drin))
    if not fehlt:
        print('FERTIG: Reihe ist voll, nichts zu tun'); return

    neu=[]; gruppe={}
    for pid,st,n in kand:
        if len(neu)>=fehlt: break
        gid=f'gid://shopify/Product/{pid}'
        if gid in drin: continue
        try:
            p=gql('query($id:ID!){product(id:$id){id title status onlineStoreUrl tags productType '
                  'featuredMedia{... on MediaImage{image{width height}}}}}',{'id':gid})['product']
        except Exception: continue
        if not p or p['status']!='ACTIVE' or not p['onlineStoreUrl']: continue
        t=','.join(p['tags'])
        if RISIKO.search(t) or NICHT_TITEL.search(p['title']): 
            print(f'   uebersprungen ({st:.1f}★/{n}) {p["title"][:44]} — Risiko/Wirkversprechen'); continue
        im=(p.get('featuredMedia') or {}).get('image') or {}
        if (im.get('width') or 0)<500 or (im.get('height') or 0)<500:
            print(f'   uebersprungen ({st:.1f}★/{n}) {p["title"][:44]} — Bild zu klein'); continue
        # ⚠️ Vielfalt erzwingen: Der erste Lauf schlug 7 Kuechenartikel unter 12 vor —
        # eine kuratierte Reihe, die siebenmal dieselbe Warenart zeigt, sieht nach
        # Katalogauszug aus, nicht nach Auswahl (Lehre 29.08.).
        g=(p.get('productType') or 'ohne').strip().lower()
        if gruppe.get(g,0)>=MAX_JE_GRUPPE:
            print(f'   uebersprungen ({st:.1f}★/{n}) {p["title"][:44]} — Gruppe «{g}» schon {MAX_JE_GRUPPE}x'); continue
        gruppe[g]=gruppe.get(g,0)+1
        neu.append((gid,st,n,p['title']))

    for gid,st,n,t in neu: print(f'   + {st:.1f}★ ({n:2}) {t[:60]}')
    print(f'{"WRITE" if WRITE else "DRY"}: {len(neu)} von {fehlt} fehlenden Plaetzen gefunden')
    if not WRITE or not neu: return
    r=gql('mutation($id:ID!,$ids:[ID!]!){collectionAddProducts(id:$id,productIds:$ids)'
          '{collection{id} userErrors{message}}}',{'id':c['id'],'ids':[g for g,_,_,_ in neu]})
    ue=r['collectionAddProducts']['userErrors']
    print('FEHLER:'+str(ue) if ue else f'FERTIG: {len(neu)} ergaenzt')

if __name__=='__main__':
    main()
