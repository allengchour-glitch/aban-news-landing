#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bild_kontaktbogen.py — legt die Hauptbilder einer Kollektion als EIN Blatt zusammen,
damit man sie ansehen kann.

WOFÜR: Der Katalog-Audit vom 20./21.08.2026 nannte als offene Werkzeug-Lücke, dass es keine
Prüfung für **eingebrannten Fremdtext in Produktbildern** gibt — englische Verkaufs-Infografiken,
Lieferantenlogos, Werbe-Siegel, Verpackungs-Collagen statt Produktfotos. Texterkennung scheitert
daran (sie kennt nur Englisch und meldet Gramm-Angaben als Treffer).

DIE LÖSUNG IST KEIN ALGORITHMUS, SONDERN HINSEHEN. Ein Kontaktbogen mit 60 Bildern ist in
Sekunden zu überblicken; Fremdtext, Collagen und Kartonverpackungen fallen sofort auf. Genau
so wurden am 21.08. in den Startseiten-Reihen 4 Fälle gefunden (67 Bilder geprüft):
- «Luminous backpack» als eingebrannter Schriftzug auf dem Hauptbild eines LED-Rucksacks
- zwei Halsketten, die ihre Verkaufs-Verpackung zeigten statt des Schmucks
- ein rotes Werbe-Siegel «S925 REAL STERLING SILVER» quer über dem Produktfoto

Repariert wird ohne neues Bildmaterial: Fast jedes CJ-Produkt hat 3–8 Bilder, darunter meist
ein sauberes. `productReorderMedia` holt es nach vorn. Das ist billiger und schneller als eine
Bildbearbeitung — und es kostet keine CJ-Punkte.

⚠️ EIN MARKENLOGO IST KEIN FEHLER. «Julystar PROFESSIONAL MAKE-UP» auf einem Rouge-Stick steht
auf der Verpackung des Produkts selbst — das ist ein normales Produktfoto, kein Lieferanten-Leak.
Der Unterschied: Steht der Text AUF DER WARE, gehört er dazu; ist er ins Bild MONTIERT
(Schriftzüge, Preisbadges, Pfeile, Panels), gehört er weg.

Nutzung:  python3 automation/bild_kontaktbogen.py <collection-handle> [anzahl]
          → /tmp/kontaktbogen_<handle>.png + Index als JSON
          Danach das PNG mit dem Read-Werkzeug ansehen.
"""
import json, os, subprocess, sys, urllib.request
from PIL import Image, ImageDraw, ImageFont

SHOP  = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN') or open('/tmp/cj_shop_token.txt').read().strip()
PROXY = os.environ.get('HTTPS_PROXY', '')
HANDLE = sys.argv[1] if len(sys.argv) > 1 else 'hype-jetzt'
ANZAHL = int(sys.argv[2]) if len(sys.argv) > 2 else 36

def gql(q, v=None):
    req = urllib.request.Request(
        f'https://{SHOP}/admin/api/2024-10/graphql.json',
        data=json.dumps({'query': q, 'variables': v or {}}).encode(),
        headers={'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=45))

c = gql('query($h:String!){collectionByHandle(handle:$h){id title}}', {'h': HANDLE})['data']['collectionByHandle']
if not c:
    print(f"OFFEN: Kollektion «{HANDLE}» gibt es nicht."); sys.exit(2)
cid = c['id'].split('/')[-1]
r = gql('query($q:String!,$n:Int!){products(first:$n,query:$q){nodes{id title featuredImage{url}}}}',
        {'q': f'status:active AND collection_id:{cid}', 'n': ANZAHL})

os.makedirs('/tmp/kbogen', exist_ok=True)
gut = []
for i, n in enumerate(r['data']['products']['nodes']):
    if not n.get('featuredImage'): continue
    f = f'/tmp/kbogen/{HANDLE}_{i}.jpg'
    if not os.path.exists(f):
        subprocess.run(['curl', '-sS', '--max-time', '25', '-x', PROXY, '-o', f,
                        n['featuredImage']['url'] + '&width=400'], capture_output=True)
    try: gut.append((Image.open(f).convert('RGB'), n))
    except Exception: pass

if not gut:
    print("OFFEN: kein Bild ladbar."); sys.exit(2)
S, PAD, Z = 300, 22, 6
reihen = (len(gut) + Z - 1) // Z
blatt = Image.new('RGB', (Z * S, reihen * (S + PAD)), 'white')
d = ImageDraw.Draw(blatt)
try: fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except Exception: fnt = ImageFont.load_default()
for k, (im, n) in enumerate(gut):
    r_, c_ = divmod(k, Z)
    im.thumbnail((S, S))
    blatt.paste(im, (c_ * S + (S - im.width) // 2, r_ * (S + PAD) + (S - im.height) // 2))
    d.text((c_ * S + 4, r_ * (S + PAD) + S + 3), str(k + 1), fill='black', font=fnt)
out = f'/tmp/kontaktbogen_{HANDLE}.png'
blatt.save(out)
json.dump([{'nr': k + 1, 'titel': n['title'], 'id': n['id']} for k, (im, n) in enumerate(gut)],
          open(f'/tmp/kontaktbogen_{HANDLE}.json', 'w'), ensure_ascii=False, indent=1)
print(f"{c['title']}: {len(gut)} Hauptbilder → {out}")
print("Jetzt mit dem Read-Werkzeug ansehen. Auffaellige Nummern im JSON nachschlagen.")
