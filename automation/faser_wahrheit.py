"""Seide/Mohair/Merino-Behauptungen mit Gegenbeweis im eigenen Text — dieselbe Regel wie
bei Kaschmir: nur belegte Fälle, Ersatz durch «…-Optik». Der «Alpaka-Rucksack» (aus Nylon)
bekommt Guillemets als Modellname, wie die übrigen Namensprodukte des Shops («Hydro»)."""
import json,re,subprocess,time,os
TOK=open('/tmp/cj_shop_token.txt').read().strip()
DRY=os.environ.get('DRY')=='1'
LEDGER='dropship/_faser_wahrheit.txt'
def gql(q,v=None):
    open('/tmp/_f2.json','w').write(json.dumps({"query":q,"variables":v or {}}))
    r=subprocess.run(["curl","-s","--max-time","60","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
      "-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","--data-binary","@/tmp/_f2.json"],capture_output=True,text=True)
    return json.loads(r.stdout)
GEGEN=re.compile(r'\b(Polyester|Acryl|Polyacryl|Viskose|Nylon|Spandex)\b',re.I)
WEICH=re.compile(r'gef[üu]hl|[äa]hnlich|faux|print|blend|imitat|touch|optik|style|look|effekt|haptik|satin|kunstseide|seidig|seidenmatt',re.I)
# ⚠️ Lehren aus dem ersten Probelauf: «seidenmatt» ist eine OBERFLÄCHE, kein Faserversprechen
# (ausgeschlossen). «Seidenstrumpfhose» hat mit «Feinstrumpfhose» ein ehrliches Fachwort.
# Zusammensetzungen brauchen eigene Regeln, sonst entsteht «Seiden-Optik strümpfe».
REGELN=[
 (re.compile(r'\bSeiden-?Strumpfhose\b',re.I),'Feinstrumpfhose'),
 (re.compile(r'\bSeidenstr[üu]mpfe\b',re.I),'Feinstrümpfe'),
 (re.compile(r'\bSeidenkrawatte\b',re.I),'Satin-Krawatte'),
 (re.compile(r'\bSeidentuch-Set\b',re.I),'Tuch-Set in Seiden-Optik'),
 (re.compile(r'\bSeidenschal\b',re.I),'Schal in Seiden-Optik'),
 (re.compile(r'\bSeidentuch\b',re.I),'Tuch in Seiden-Optik'),
 (re.compile(r'\bSeidenkleid\b',re.I),'Kleid in Seiden-Optik'),
 (re.compile(r'\bSeiden-Hemd\b',re.I),'Hemd in Seiden-Optik'),
 (re.compile(r'\baus Seide\b',re.I),'in Seiden-Optik'),
 (re.compile(r'\bWoll-Mohair\s+',re.I),''),
 (re.compile(r'\bMerino Wolldecke\b',re.I),'Kuscheldecke'),
 (re.compile(r'\bAlpaka-Rucksack\b',re.I),'Rucksack «Alpaka» · Nylon'),
]
erledigt=set(l.split('\t')[0] for l in open(LEDGER)) if os.path.exists(LEDGER) else set()
kand=[]
for l in open('/tmp/export.jsonl'):
    p=json.loads(l)
    if p.get('status')!='ACTIVE' or p['id'] in erledigt: continue
    if re.search(r'Seide|Mohair|Merino|Alpaka',p.get('title') or '',re.I): kand.append(p['id'])
print('Kandidaten:',len(kand))
f=None if DRY else open(LEDGER,'a')
getan=0
for gid in kand:
    d=gql('query($id:ID!){product(id:$id){title descriptionHtml}}',{"id":gid})
    p=(d.get('data') or {}).get('product')
    if not p: continue
    t=p['title']
    if WEICH.search(t): continue
    if re.search(r'hoodie',t,re.I): continue   # «Seidenschal-Hoodie»-Kuriosum: Umbau ergäbe Unsinn
    text=re.sub(r'<[^>]+>',' ',p.get('descriptionHtml') or '')
    if not GEGEN.search(text): continue
    neu=t
    for rx,ers in REGELN:
        if rx.search(neu): neu=rx.sub(ers,neu,count=1); break
    neu=re.sub(r'\s{2,}',' ',neu).strip(' -·')
    if neu==t: continue
    getan+=1
    if DRY: print(f"   {t[:46]:<48} → {neu[:52]}"); continue
    r=gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',{"i":{"id":gid,"title":neu}})
    if ((r.get('data') or {}).get('productUpdate') or {}).get('userErrors'): continue
    f.write(f"{gid}\t{neu[:60]}\n"); f.flush()
    print('  ✓',neu[:54]); time.sleep(0.3)
print(('PROBE' if DRY else 'FERTIG')+f": {getan}")
