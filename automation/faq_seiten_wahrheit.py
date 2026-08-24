import json,urllib.request,sys,os
SHOP='au3j0y-hq.myshopify.com'; TOKEN=open('/tmp/cj_shop_token.txt').read().strip()
DRY=os.environ.get('DRY')=='1'
def gql(q,v=None):
    r=urllib.request.Request(f'https://{SHOP}/admin/api/2024-10/graphql.json',
      data=json.dumps({'query':q,'variables':v or {}}).encode(),
      headers={'X-Shopify-Access-Token':TOKEN,'Content-Type':'application/json'})
    return json.load(urllib.request.urlopen(r,timeout=60))

# Kanonische Aussagen (14.08. + 20.08.): CH-Lager 1–2 · EU-Lager 2–7 · Druck auf Bestellung
# 7–14 · Direktversand ab Werk 10–20 Werktage. Versand CHF 7.00, gratis ab CHF 50.
# Es gibt genau EINEN aktiven Markt (Switzerland, ['CH']) — live nachgezaehlt: DE, AT und
# Liechtenstein koennen gar nicht auschecken, jede Zusage dorthin ist unerfuellbar.
REG = {
 'faq-luxestyle': [
  ('🇨🇭 Schweiz: 7-12 Werktage · 🇩🇪 DE/AT: 8-14 Werktage',
   '🇨🇭 Schweiz: ab CH-Lager 1–2 Werktage · ab EU-Lager 2–7 · auf Bestellung gedruckt 7–14 · '
   'Direktversand ab Werk 10–20 Werktage. Welche Stufe gilt, steht auf jeder Produktseite'),
  ('CHF 4.90 für CH · 9.90 EUR für DE/AT. Gratis ab CHF 50 / 99 EUR mit Code SHIP50.',
   'CHF 7.00 innerhalb der Schweiz. Gratis ab CHF 50 — automatisch, ohne Code. '
   'Wir liefern ausschliesslich in die Schweiz.'),
  ('<li>Launch-Woche: 30% mit LAUNCH30</li>', ''),
 ],
 'faq-en': [
  ('Flat CHF 4.90 within Switzerland. Free shipping over CHF 50.',
   'Flat CHF 7.00 within Switzerland. Free shipping from CHF 50 — applied automatically, no code needed.'),
  ('2-7 business days within Switzerland (incl. Liechtenstein)',
   '1-2 business days from our Swiss warehouse, 2-7 from the EU warehouse. We ship to Switzerland only'),
 ],
}
j=gql('{ pages(first:10, query:"handle:faq-luxestyle OR handle:faq-en"){nodes{id handle body}} }')
M='mutation($id:ID!,$b:String!){pageUpdate(id:$id,page:{body:$b}){userErrors{message}}}'
for p in j['data']['pages']['nodes']:
    b=p['body']; n=0
    for alt,neu in REG.get(p['handle'],[]):
        if alt not in b:
            print(f"  ⚠️ {p['handle']}: NICHT GEFUNDEN → {alt[:60]!r}"); continue
        b=b.replace(alt,neu); n+=1
    if not n: continue
    print(f"{p['handle']}: {n} Stellen ersetzt")
    if DRY: continue
    r=gql(M,{'id':p['id'],'b':b})
    e=r['data']['pageUpdate']['userErrors']
    print('   ⛔',e) if e else print('   OK')
