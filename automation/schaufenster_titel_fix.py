import json,os,re,time,urllib.request,urllib.error
T=open('/tmp/cj_shop_token.txt').read().strip()
SCHREIB=os.environ.get('WRITE')=='1'
def gql(q,v=None,n=8):
    for i in range(n):
        try:
            r=urllib.request.Request("https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                data=json.dumps({"query":q,"variables":v or {}}).encode(),
                headers={"X-Shopify-Access-Token":T,"Content-Type":"application/json"})
            d=json.load(urllib.request.urlopen(r,timeout=60))
            if d.get('errors'):
                if all((e.get('extensions') or {}).get('code')=='THROTTLED' for e in d['errors']) and i<n-1:
                    time.sleep(4*(i+1)); continue
                raise RuntimeError(str(d['errors'])[:200])
            return d
        except urllib.error.URLError: time.sleep(3)
    raise RuntimeError('stumm')

# Handle bleibt UNVERAENDERT -> kein 404, keine 301 noetig.
# Jeder neue Titel ist aus dem EIGENEN Produkttext belegt, nichts erfunden.
FIX=[
 ("sofa-stuhl-wireless-ladegerat-894336",
  "Sofa Stuhl Wireless Ladegerät",
  "Kabelloses Ladegerät im Sessel-Design"),          # Text: «kabelloses Ladegeraet im einzigartigen Sofa-Stuhl-Design»
 ("smart-wireless-charger-lampe-365952",
  "Smart Wireless Charger Lampe",
  "Schwebende Lampe mit kabellosem Ladepad"),        # Text: «Lampe kombiniert kabelloses Laden mit schwebendem Design»
 ("bluetooth-player-mit-lampe-und-wireless-charge-69373f",
  "Bluetooth-Player mit Lampe und Wireless Charger",
  "3-in-1 Bluetooth-Lautsprecher · Lampe & kabelloses Ladepad"),  # Text: «3-in-1 … Lautsprecher, kabelloses Ladepad und Beleuchtung»
]
for h,alt,neu in FIX:
    d=gql('query($h:String!){productByIdentifier(identifier:{handle:$h}){id handle title seo{title description} media(first:25){nodes{id alt}}}}',{"h":h})
    p=(d.get('data') or {}).get('productByIdentifier')
    if not p or p['handle']!=h:
        print(f"⛔ {h}: nicht exakt gefunden"); continue
    if p['title']!=alt:
        print(f"⛔ {h}: LIVE-Titel ist «{p['title']}», erwartet «{alt}» — nichts geschrieben"); continue
    seo_t=(p['seo']['title'] or '').replace(alt,neu)
    seo_d=(p['seo']['description'] or '').replace(alt,neu)
    alts=[(m['id'],(m['alt'] or '')) for m in p['media']['nodes']]
    # ⚠️ Nur ERSETZEN, nie neu bauen: die Nummerierung im Alt-Text ist Information (Lehre 29.08.)
    neue_alts=[(i,a.replace(alt,neu)) for i,a in alts if alt in a]
    print(f"▸ {alt}\n    -> {neu}")
    print(f"    seo.title: {'ja' if alt in (p['seo']['title'] or '') else 'nein'} · seo.desc: {'ja' if alt in (p['seo']['description'] or '') else 'nein'} · alt-Texte: {len(neue_alts)}/{len(alts)}")
    if not SCHREIB: print("    (DRY)\n"); continue
    r=gql('mutation($id:ID!,$t:String!,$s:SEOInput!){productUpdate(product:{id:$id,title:$t,seo:$s}){product{id title seo{title description}} userErrors{field message}}}',
          {"id":p['id'],"t":neu,"s":{"title":seo_t or None,"description":seo_d or None}})
    res=r['data']['productUpdate']
    if res['userErrors']: print(f"    ⛔ {res['userErrors']}\n"); continue
    print(f"    ✔ Titel/SEO: {res['product']['title']}")
    for mid,na in neue_alts:
        rr=gql('mutation($id:ID!,$m:[UpdateMediaInput!]!){productUpdateMedia(productId:$id,media:$m){userErrors{field message}}}',
               {"id":p['id'],"m":[{"id":mid,"alt":na}]})
        ue=rr['data']['productUpdateMedia']['userErrors']
        if ue: print(f"    ⛔ alt {mid}: {ue}")
    print(f"    ✔ {len(neue_alts)} Alt-Texte nachgezogen\n")
