#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Englische Produkttitel ins Deutsche — kuratiert, nicht generiert.

Der Shop hat genau EINEN aktiven Markt (Switzerland, ['CH']); niemand
ausserhalb kann auschecken. Ein englischer Titel matcht keine deutsche
Suchanfrage — das Produkt ist im einzigen verkaufenden Kanal (Google,
Gratis-Eintraege) faktisch unsichtbar.

Jede Uebersetzung hier ist von Hand gesetzt und gegen die DEUTSCHE
Beschreibung des Produkts geprueft, nicht maschinell erzeugt. Wo die
Bedeutung unklar blieb, steht das Produkt NICHT in dieser Liste:
«Tearing Lip Liner Pen Set», «3D Fiber Eye Black», «Smart Remote Key Card»,
«Youth Riding Crossbody Bag», «Sequins-Makeup-Palette», «Bell Pet GPS
Tracker» (Marke oder Bauteil?), «Zinc-Alloy-Grinder» (Rauchzubehoer,
eigene Regeln). Ein falscher deutscher Titel ist schlimmer als ein
englischer — Regel 9 (Frischematte→«Mauspad»).
"""
import json, os, time, urllib.request
SHOP='au3j0y-hq.myshopify.com'; TOKEN=open('/tmp/cj_shop_token.txt').read().strip()
DRY=os.environ.get('DRY')=='1'
M={
"15447957733761":"Familien-T-Shirt im Partnerlook · Kurzarm mit Brusttasche",
"15448106828161":"Sweatshirt mit Waffelstrick und Rundhalsausschnitt",
"15448110989697":"Jumpsuit mit Neckholder in Krinkel-Optik",
"15448115577217":"Boho-Jumpsuit mit Neckholder",
"15448524456321":"Jeans-Jumpsuit, hoch elastisch",
"15448573510017":"Traeger-Jumpsuit mit 3D-Print",
"15448800723329":"Contouring- und Concealer-Stick · natuerlicher Farbton",
"15448801214849":"Concealer im natuerlichen Farbton",
"15448805769601":"Lip-Plumper fuer vollere Lippen",
"15448820384129":"Latex-Horrormaske «Verrottete Fratze» · Halloween",
"15448834179457":"Aufklebe-Naegel mit Cat-Eye-Effekt, holografisch",
"15449436356993":"Oversized-Hoodie mit ueberschnittenen Schultern",
"15449568641409":"Kleid in Wildleder-Optik mit Fransen",
"15450038731137":"Schnuerstiefel in Wadenhoehe",
"15450750222721":"Sneaker mit Strick-Obermaterial",
"15450854752641":"Kuscheldecke klein · fuers Nickerchen",
"15450858062209":"Lippenoel mit Jelly-Textur",
"15453795058049":"Haustierbett im Karo-Design",
"15454132371841":"Schlagjeans mit mittelhohem Bund",
"15473084694913":"Used-Look-Jeans, gewaschen",
"15479434609025":"Handgemachte Aufklebe-Naegel im Ombre-Verlauf",
"15479436935553":"Budapester Anzugschuhe",
"15481805832577":"Ring im Kronen-Design mit Moissanit",
"15481881035137":"Tastenkappe im Hunde-Design fuer Tastaturen",
"15485311680897":"Hoodie im Used-Look",
"15490937815425":"Lipgloss",
"15491983606145":"Aufklebe-Naegel im French-Design, schwarz",
"15492018078081":"Fleecejacke mit Reverskragen",
"15492129653121":"Kurzarm-Top im Used-Look, gewaschen",
"15493152964993":"Haaransatz-Stift mit Puder zum Auffuellen",
"15493706580353":"Zip-Hoodie im Used-Look mit St.-Michael-Print",
"15493859148161":"Sommersprossen-Stift und Rouge in einem",
"15493894799745":"Jeansshorts im Destroyed-Look",
"15493922292097":"Laptop-Rucksack fuer Alltag und Buero",
"15493935858049":"Crimp-Lockenstab fuer Wellen",
"15494462275969":"Katzenspielzeug mit Katzenminze im Pilz-Design",
"15495083983233":"Cremiger Concealer mit Feuchtigkeitspflege",
"15495117603201":"Mary-Jane-Schuhe mit Blockabsatz und T-Steg",
"15495188611457":"Kopfbedeckung fuer Outdoor-Aktivitaeten · 27 × 32 cm",
"15496308359553":"Langanhaltende Foundation mit hoher Deckkraft",
"15496604582273":"Mechanische Taschenuhr im Zahnrad-Design, schwarz",
"15497444032897":"Cushion-Foundation mit leichtem Finish",
"15497609445761":"Aufklebe-Naegel in Nude mit Cat-Eye-Effekt",
"15500157059457":"Halskette im Hip-Hop-Stil",
"15500257231233":"Wellen-Styler fuers Haar",
"15500404621697":"Cuban-Link-Armband aus Titan",
"15500940247425":"Manikuere-Set mit 10 Aufklebe-Naegeln und Kleber",
"15500948144513":"Air-Cushion-Foundation, straffend · 15 g",
"15500975079809":"Hundehalsband",
"15501382975873":"Korkenzieher-Set fuer Wein",
"15501903102337":"Loafer mit Strass und Cut-outs",
"15502035812737":"Taschentuch-Halter im Kuerbis-Design · 19 cm",
"15502305493377":"Ortungsgeraet fuer Haustiere",
"15503120171393":"Diamond Painting «Wolf»",
"15503163883905":"Eau de Parfum «Rosenduft»",
"15503164014977":"Rouge-Stick und Foundation 2-in-1",
"15503957459329":"Matter Lipgloss",
"15506223104385":"Make-up-Stift zum Kaschieren und Konturieren",
"15506536759681":"Smartwatch mit Schlafaufzeichnung",
}
ENGLISCH={
"15447957733761": "Color Matching Pocket Family Suit Parent-child Short Sleeve T-shirt",
"15448106828161": "Waffle-knit Crewneck Sweatshirt",
"15448110989697": "Crinkled Halterneck Jumpsuit",
"15448115577217": "Bohemian Halterneck Jumpsuit",
"15448524456321": "High Elastic Denim Jumpsuit",
"15448573510017": "3D Printed Suspender Jumpsuit",
"15448800723329": "Contouring & Concealer Stick – Natural Shade",
"15448801214849": "Natural Color Concealer",
"15448805769601": "Spicy Lip Plumping Booster",
"15448820384129": "Tyrant Rotten Face Mask",
"15448834179457": "Holographic Cat Eye Press-on Nails",
"15449436356993": "Casual Drop-Shoulder Hoodie",
"15449568641409": "Suede-Fringed-Dress",
"15450038731137": "Mid-Calf Martin Boots",
"15450750222721": "Flying Woven Sneakers",
"15450854752641": "Small blanket nap blanket",
"15450858062209": "PHOFAY Jelly Lip Oil",
"15453795058049": "Plaid Pet Bed",
"15454132371841": "Mid-Rise Flared Jeans",
"15473084694913": "Distressed Washed Denim Jeans",
"15479434609025": "Ombre Handmade Wearable Nails",
"15479436935553": "Brogue Dress Shoes",
"15481805832577": "Moissanite Crown Ring",
"15481881035137": "Height Chai Dog Key Cap",
"15485311680897": "Sassy Distressed Hoodie",
"15490937815425": "Lip Glaze",
"15491983606145": "French Black Armour Wearable Nails",
"15492018078081": "Fleece-Lapel-Jacket",
"15492129653121": "Rebellious Washed Distressed Short-sleeve Top",
"15493152964993": "Floria Hairline Shaping Powder Filling Pen",
"15493706580353": "St Michael Distressed Zip-Up Hoodie",
"15493859148161": "Freckle Pen Repair Blush Two-in-one",
"15493894799745": "Ripped Denim Shorts",
"15493922292097": "Leisure Computer Backpack",
"15493935858049": "Corn Perm Curler",
"15494462275969": "Mushroom Cat Mint Toy Pet Chew",
"15495083983233": "Fundus Creamy Concealer",
"15495117603201": "Chunky-Heel T-Strap Mary Jane Slipper",
"15495188611457": "Shadow Warrior Headgear",
"15496308359553": "Concealer Longwear Foundation",
"15496604582273": "Gear Gun Black Mechanical Pocket Watch",
"15497444032897": "Water Light Cushion Foundation",
"15497609445761": "Hand-worn Nail Nude Ice Through Cat's Eye",
"15500157059457": "Hip-Hop-Necklace",
"15500257231233": "Waves-Permitter",
"15500404621697": "Titan-Cuban-Bracelet",
"15500940247425": "Niche Advanced Finished Manicure",
"15500948144513": "Firming Air Cushion Foundation Make-up 15g",
"15500975079809": "Original New Dog Collar",
"15501382975873": "Wine Corkscrew Set",
"15501903102337": "Idle Rhinestone Hollow Loafers",
"15502035812737": "Pumpkin-Tissue-Halter",
"15502305493377": "Smart Pet Locator",
"15503120171393": "Wolf Diamond Painting",
"15503163883905": "The Odour Of Roses Eau de Parfum",
"15503164014977": "Blush Stick Foundation 2-in-1",
"15503957459329": "Mattes Lip Gloss",
"15506223104385": "Makeup Swab Shaping Rod",
"15506536759681": "Smart Sleep Watch"
}
UML={'ae':'ä','oe':'ö','ue':'ü','Ae':'Ä','Oe':'Ö','Ue':'Ü'}
def uml(s):
    # Die Tabelle ist bewusst ASCII geschrieben (Heredoc-sicher); hier zurueck.
    for a,b in (('naegel','nägel'),('Naegel','Nägel'),('Traeger','Träger'),('ueber','über'),
                ('Ueber','Über'),('natuerlich','natürlich'),('Kuschel','Kuschel'),
                ('Schnuer','Schnür'),('hoehe','höhe'),('Lippenoel','Lippenöl'),
                ('Buero','Büro'),('Manikuere','Maniküre'),('Kuerbis','Kürbis'),
                ('Ortungsgeraet','Ortungsgerät'),('fuer','für'),('fuers','fürs'),
                ('Ombre','Ombré'),('Aktivitaeten','Aktivitäten'),('Auffuellen','Auffüllen')):
        s=s.replace(a,b)
    return s
def gql(q,v=None):
    r=urllib.request.Request(f'https://{SHOP}/admin/api/2024-10/graphql.json',
      data=json.dumps({'query':q,'variables':v or {}}).encode(),
      headers={'X-Shopify-Access-Token':TOKEN,'Content-Type':'application/json'})
    for i in range(6):
        try: return json.load(urllib.request.urlopen(r,timeout=60))
        except Exception:
            if i==5: raise
            time.sleep(2**i)
Q='query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title status}}}'
U='mutation($id:ID!,$t:String!){productUpdate(input:{id:$id,title:$t}){userErrors{message}}}'
ids=list(M)
n=0
for i in range(0,len(ids),25):
    j=gql(Q,{'ids':['gid://shopify/Product/'+x for x in ids[i:i+25]]})
    for p in j['data']['nodes']:
        if not p: continue
        pid=p['id'].split('/')[-1]; neu=uml(M[pid])
        if p['status']!='ACTIVE': print('  uebersprungen (nicht aktiv)',pid,p['title'][:40]); continue
        if p['title']==neu: continue
        # ⚠️ Der Export ist acht Stunden alt. Neun dieser Produkte tragen live
        # laengst einen deutschen Titel, den ein anderer Lauf gesetzt hat — und
        # bei zweien waere meine Uebersetzung SCHLECHTER gewesen: 15496308359553
        # heisst live «Bein-Make-up, wasserfest und langhaltend» (ich haette
        # «Foundation» geschrieben), 15500257231233 «Glaettkamm mit LCD-Anzeige»
        # (ich «Wellen-Styler»). Genau der Fehler von heute Mittag, als ich 22
        # bereits reparierte Markentitel aus altem Export ueberschrieben habe.
        # Geschrieben wird deshalb nur, wenn der LIVE-Titel noch der englische ist.
        if not ENGLISCH.get(pid) or p['title'].strip() != ENGLISCH[pid]:
            print('  uebersprungen (live schon anders):', pid, '|', p['title'][:55]); continue
        print(('DRY ' if DRY else 'OK  ')+pid, '|', p['title'][:45], '→', neu)
        if DRY: n+=1; continue
        r=gql(U,{'id':p['id'],'t':neu})
        e=r['data']['productUpdate']['userErrors']
        if e: print('   ⛔',e); continue
        n+=1; time.sleep(0.3)
print('FERTIG:',n)
