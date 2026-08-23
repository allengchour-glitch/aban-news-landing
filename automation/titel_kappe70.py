import json,re,os,subprocess,time
DRY=os.environ.get("DRY")=="1"
SHOP="au3j0y-hq.myshopify.com"; TOK=open('/tmp/cj_shop_token.txt').read().strip()
LEDGER="dropship/_titel_kappe70.txt"
FUELL=re.compile(r'\s+(?:und|oder|mit|für|im|in|aus|der|die|das|den|zum|zur|&|·|-)$',re.I)

def gql(q,v=None):
    p=json.dumps({"query":q,"variables":v or {}})
    for i in range(8):
        r=subprocess.run(["curl","-s","--max-time","60",
            f"https://{SHOP}/admin/api/2024-10/graphql.json",
            "-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","-d",p],
            capture_output=True,text=True)
        try:
            d=json.loads(r.stdout)
            if d.get("data"): return d
            if "THROTTL" in json.dumps(d.get("errors") or "").upper(): time.sleep(4+i*3); continue
            if d.get("errors"): return None
        except Exception: pass
        time.sleep(3+i*2)
    return None

def urteil(titel, besch):
    """(art, neuer_titel) — art: 'ganz' | 'ergaenzt' | 'gekuerzt' | 'unklar'"""
    m=re.search(r'([\wÄÖÜäöüß-]+)$', titel)
    if not m: return ('ganz', titel)          # endet auf Satzzeichen/Klammer → vollstaendig
    frag=m.group(1)
    # Steht das Fragment im Beschreibungstext als GANZES Wort? Dann ist es kein Bruchstueck.
    if re.search(r'(?<![\wÄÖÜäöüß-])'+re.escape(frag)+r'(?![\wÄÖÜäöüß-])', besch, re.I):
        return ('ganz', titel)
    # Sonst: laengere Woerter suchen, die mit dem Fragment beginnen.
    kand={w for w in re.findall(r'(?<![\wÄÖÜäöüß-])'+re.escape(frag)+r'[\wÄÖÜäöüß-]+', besch, re.I)}
    kand={k for k in kand if k.lower()!=frag.lower()}
    if len(kand)==1:
        return ('ergaenzt', titel[:m.start()]+kand.pop())
    if not kand:
        rest=FUELL.sub('', titel[:m.start()].rstrip(' ,·-–')).rstrip(' ,·-–')
        return ('gekuerzt', rest) if len(rest)>=25 else ('unklar', titel)
    return ('unklar', titel)                   # mehrere Ergaenzungen → nicht raten

kand=json.load(open('/tmp/kappe70.json'))
erledigt=set()
if os.path.exists(LEDGER): erledigt={l.split("\t")[0] for l in open(LEDGER)}
zaehl={}; n=0
for x in kand:
    if x['id'] in erledigt: continue
    art,neu=urteil(x['titel'], x['besch'])
    zaehl[art]=zaehl.get(art,0)+1
    if art in ('ganz','unklar'):
        if DRY and art=='unklar': print(f"  [?]  …{x['titel'][-34:]}")
        continue
    if DRY:
        print(f"  [{art[:4]}] …{x['titel'][-32:]:34} → …{neu[-38:]}"); n+=1; continue
    r=gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
          {"i":{"id":x['id'],"title":neu}})
    f=(((r or {}).get("data") or {}).get("productUpdate") or {}).get("userErrors")
    if r is None or f: print("  ⚠️",x['titel'][:40],json.dumps(f)[:70] if f else "keine Antwort"); continue
    with open(LEDGER,"a") as fh: fh.write(f"{x['id']}\t{art}\t{neu[:80]}\n")
    n+=1; time.sleep(0.3)
print(f"\nEinordnung: {zaehl}")
print(f"FERTIG: {n} Titel {'geprueft (DRY)' if DRY else 'korrigiert'}")
