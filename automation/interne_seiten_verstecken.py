"""Nimmt fünf interne Arbeitsdokumente von der Live-Storefront.

Live gefunden (HTTP 200, in der Sitemap): /pages/master-dashboard-v2 zeigt Fremden den
internen Projektstand — «78% LIVE-READY», «11 Produkte LIVE», offene Punkte samt Anleitungen
(«Meta Pixel-ID + Conversion API Token … mir schicken», «Make.com Pipeline reparieren, Token
tot»). Dazu do-it-now, morgen-briefing-23-05, action-center, make-com-fix-guide.

Das sind Notizen an mich selbst, keine Kundeninhalte. Sie stehen mit Datum vom Mai 2026 im
Shop, erzählen von 11 Produkten (heute sind es 33'000) und untergraben damit genau das
Vertrauen, das die Rechtstexte aufbauen sollen.

⚠️ NICHT LÖSCHEN, nur unveröffentlichen — der Inhalt bleibt im Admin erhalten. Und NICHT
mitnehmen: `massage-gun-test-2026`, `bademantel-test-vergleich`,
`wasserfest-schmuck-see-test` enthalten zwar «test», sind aber echte Ratgeberartikel;
`tiktok-callback` und `merkliste` sind technisch und harmlos.
"""
import json,subprocess
TOK=open('/tmp/cj_shop_token.txt').read().strip()
def gql(q,v=None):
    open('/tmp/_u.json','w').write(json.dumps({"query":q,"variables":v or {}}))
    r=subprocess.run(["curl","-s","--max-time","60","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
      "-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","--data-binary","@/tmp/_u.json"],capture_output=True,text=True)
    return json.loads(r.stdout)
ZIEL={'do-it-now','morgen-briefing-23-05','action-center','make-com-fix-guide','master-dashboard-v2'}
cur=None
while True:
    d=gql('query($c:String){pages(first:100,after:$c){pageInfo{hasNextPage endCursor}nodes{id handle isPublished}}}',{"c":cur})
    p=(d.get('data') or {}).get('pages')
    if not p: break
    for n in p['nodes']:
        if n['handle'] in ZIEL and n['isPublished']:
            r=gql('mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p){userErrors{message}}}',
                  {"id":n['id'],"p":{"isPublished":False}})
            e=((r.get('data') or {}).get('pageUpdate') or {}).get('userErrors')
            print(('  ⚠️ '+n['handle']+': '+json.dumps(e)[:60]) if e else f"  ✓ {n['handle']} unveröffentlicht")
    if not p['pageInfo']['hasNextPage']: break
    cur=p['pageInfo']['endCursor']
