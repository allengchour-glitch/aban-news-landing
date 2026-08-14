"""Bringt drei Kollektionstexte auf die Wahrheit — je nach gemessenem CH-Lager-Anteil.

«Blitzversand aus der Schweiz» ist das einzige echte Unterscheidungsmerkmal gegenüber Temu
und AliExpress. Steht es auf einer Kategorieseite, deren Ware zu 97,5 % aus China kommt,
storniert die Kundin nach dem Warten — und nach UWG Art. 3 Abs. 1 lit. b ist eine
unzutreffende Lieferzeitangabe eine irreführende Angabe. Live gemessen (Stand heute):
   Schweizer Editionen   6/243 = 2,5 %  → Versprechen streichen
   Haarpflege & Styling  175/401 = 43,6 % → «viele Artikel» ist wahr, aber es gehört dazu,
                                            dass es eben nicht alle sind
   Steh- & Deckenlampen  0/17   = 0 %   → Versprechen streichen, auch aus dem SEO-Text
"""
import json,subprocess
TOK=open('/tmp/cj_shop_token.txt').read().strip()
def gql(q,v=None):
    open('/tmp/_k.json','w').write(json.dumps({"query":q,"variables":v or {}}))
    r=subprocess.run(["curl","-s","--max-time","60","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
      "-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","--data-binary","@/tmp/_k.json"],capture_output=True,text=True)
    return json.loads(r.stdout)

AENDERUNGEN = [
 ("688564306305",
  {"descriptionHtml":"<p>Stolz auf die Schweiz: Edelweiss, Matterhorn, Alphorn und mehr — unsere Schweizer Editionen für Zuhause, Feste und als Geschenk. Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · Kauf auf Rechnung mit Klarna &amp; TWINT.</p>",
   "seo":{"description":"Schweizer Editionen online kaufen: Edelweiss-Mode, Matterhorn-Deko, Fan-Artikel & Geschenke. Gratis-Versand ab CHF 50, 30 Tage Rückgabe."}}),
 ("690801967489",
  {"descriptionHtml":"<p>💇 Haarpflege &amp; Styling bei LuxeStyle — kuratierte Auswahl, viele Artikel ab Schweizer Lager in 1–2 Werktagen. Gratis-Versand ab CHF 50 · 30 Tage Rückgabe.</p>"}),
 ("690626625921",
  {"descriptionHtml":"<p>Steh- und Deckenlampen, die deinen Raum ins richtige Licht rücken – vom sanften Ambiente bis zur hellen Grundbeleuchtung. Schweizer Online-Shop, Gratis-Versand ab CHF 50, 30 Tage Rückgabe.</p>",
   "seo":{"description":"Steh- & Deckenlampen für jeden Raum · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · Kauf auf Rechnung mit Klarna & TWINT."}}),
]
for cid,felder in AENDERUNGEN:
    eingabe={"id":f"gid://shopify/Collection/{cid}",**felder}
    r=gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{handle} userErrors{message}}}',{"i":eingabe})
    res=(r.get('data') or {}).get('collectionUpdate') or {}
    print(('  ⚠️ '+json.dumps(res.get('userErrors'))[:80]) if res.get('userErrors') else f"  ✓ {(res.get('collection') or {}).get('handle')}")
