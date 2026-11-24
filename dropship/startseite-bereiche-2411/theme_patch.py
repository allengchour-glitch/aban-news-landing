#!/usr/bin/env python3
"""Startseite: 11 Bereichs-Reihen (24.11.2026). Holt die LIVE-Dateien, sichert sie, patcht, schreibt (LIVE=1), liest zurück.
Rückweg: sicherung/* per themeFilesUpsert zurückspielen (oder einen Pool leeren → Reihe verschwindet)."""
import sys, json, hashlib, os, re, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../live2311'))
from gql2 import gql

HIER = os.path.dirname(os.path.abspath(__file__))
LIVE = os.environ.get('LIVE') == '1'
NUR = [k for k in os.environ.get('NUR', '').split(',') if k]  # Reihen-Schlüssel, die wirklich einen Pool bekommen haben
TH = 'gid://shopify/OnlineStoreTheme/214565814663'
SEC = 'sections/luxe-edit-home.liquid'
LOCS = ['locales/de.json', 'locales/fr.json', 'locales/en.default.json']

# Reihenfolge: Saison zuerst, dann Mode und Alltag abwechselnd (Schlüssel|Sammlung für «Alle ansehen»|Pool-Endung)
REIHEN = [
    ('christmas', 'weihnachten-2026', 'weihnachten'),
    ('winter', 'winter-kaelte', 'winter'),
    ('dresses', 'damen-kleider', 'kleider'),
    ('jewellery', 'schmuck', None),
    ('womens', 'damen-mode', 'damenmode'),
    ('gifts', 'premium-geschenke', 'geschenke'),
    ('mens', 'fur-ihn', 'herrenmode'),
    ('tech', 'elektronik-technik', 'technik'),
    ('shoes', 'schuhe', 'schuhe'),
    ('home', 'wohnen-dekoration', None),
    ('bags', 'sub-taschen', 'taschen'),
    ('beauty', 'beauty-pflege', 'beauty'),
    ('kitchen', 'kueche-kochen', 'kueche'),
    ('pets', 'sub-haustier', 'haustier'),
    ('kids', 'sub-baby-kids', 'kinder'),
    ('sport', 'sport-outdoor', 'sport'),
]
ALT = {'christmas', 'winter', 'jewellery', 'gifts', 'home'}

TEXTE = {
 'de': {
  'dresses': ('Damenmode', 'Kleider für jeden Anlass', 'Midi, Maxi und Strick – Kleider für Alltag, Büro und besondere Abende.'),
  'womens': ('Für sie', 'Damenmode', 'Pullover, Blusen, Jacken und Hosen – Teile, die sich leicht kombinieren lassen.'),
  'mens': ('Für ihn', 'Herrenmode', 'Pullover, Hemden, Jacken und Accessoires für jeden Tag.'),
  'shoes': ('Schritt für Schritt', 'Schuhe', 'Sneaker, Stiefel und bequeme Begleiter für Damen, Herren und Kinder.'),
  'bags': ('Accessoires', 'Taschen & Rucksäcke', 'Handtaschen, Umhängetaschen und Rucksäcke für Alltag und Reise.'),
  'beauty': ('Beauty', 'Beauty-Helfer', 'Pinsel, Spiegel, Haar-Styling und Nageldesign für deine Beauty-Routine.'),
  'tech': ('Technik', 'Technik & Gadgets', 'Kopfhörer, Lautsprecher, Licht und clevere Helfer für Zuhause und unterwegs.'),
  'kitchen': ('Zuhause', 'Küche & Kochen', 'Praktische Küchenhelfer, Aufbewahrung und schönes Geschirr.'),
  'pets': ('Hund & Katze', 'Für Haustiere', 'Betten, Spielzeug, Geschirre und Pflege für Hund und Katze.'),
  'kids': ('Für die Kleinen', 'Kinder & Baby', 'Spielzeug, Babyzubehör und Kleidung für kleine Entdecker.'),
  'sport': ('Aktiv', 'Sport & Outdoor', 'Fitness, Training und Ausrüstung für draussen.'),
 },
 'fr': {
  'dresses': ('Mode femme', 'Robes pour chaque occasion', 'Midi, maxi ou en maille – des robes pour le quotidien, le bureau et les belles soirées.'),
  'womens': ('Pour elle', 'Mode femme', 'Pulls, blouses, vestes et pantalons – des pièces faciles à combiner.'),
  'mens': ('Pour lui', 'Mode homme', 'Pulls, chemises, vestes et accessoires pour tous les jours.'),
  'shoes': ('Pas à pas', 'Chaussures', 'Baskets, bottes et chaussures confortables pour femmes, hommes et enfants.'),
  'bags': ('Accessoires', 'Sacs & sacs à dos', 'Sacs à main, sacs bandoulière et sacs à dos pour le quotidien et le voyage.'),
  'beauty': ('Beauté', 'Accessoires beauté', 'Pinceaux, miroirs, coiffure et nail art pour ta routine beauté.'),
  'tech': ('Technologie', 'Tech & gadgets', 'Écouteurs, enceintes, lumières et accessoires malins pour la maison et les déplacements.'),
  'kitchen': ('Maison', 'Cuisine', 'Ustensiles pratiques, rangement et belle vaisselle.'),
  'pets': ('Chien & chat', 'Pour les animaux', 'Paniers, jouets, harnais et soins pour chiens et chats.'),
  'kids': ('Pour les petits', 'Enfants & bébé', 'Jouets, accessoires bébé et vêtements pour petits explorateurs.'),
  'sport': ('Actif', 'Sport & plein air', "Fitness, entraînement et équipement pour l'extérieur."),
 },
 'en': {
  'dresses': ("Women's fashion", 'Dresses for every occasion', 'Midi, maxi or knit – dresses for everyday, the office and special evenings.'),
  'womens': ('For her', "Women's fashion", 'Jumpers, blouses, jackets and trousers – pieces that are easy to combine.'),
  'mens': ('For him', "Men's fashion", 'Jumpers, shirts, jackets and accessories for every day.'),
  'shoes': ('Step by step', 'Shoes', 'Sneakers, boots and comfortable companions for women, men and kids.'),
  'bags': ('Accessories', 'Bags & backpacks', 'Handbags, shoulder bags and backpacks for everyday and travel.'),
  'beauty': ('Beauty', 'Beauty helpers', 'Brushes, mirrors, hair styling and nail art for your beauty routine.'),
  'tech': ('Tech', 'Tech & gadgets', 'Headphones, speakers, lighting and clever helpers for home and on the go.'),
  'kitchen': ('Home', 'Kitchen & cooking', 'Practical kitchen helpers, storage and beautiful tableware.'),
  'pets': ('Dog & cat', 'For pets', 'Beds, toys, harnesses and grooming for dogs and cats.'),
  'kids': ('For the little ones', 'Kids & baby', 'Toys, baby essentials and clothing for little explorers.'),
  'sport': ('Active', 'Sport & outdoor', 'Fitness, training and gear for the outdoors.'),
 },
}


def G(q, v=None):
    for _ in range(10):
        try:
            return gql(q, v or {})
        except BaseException:
            time.sleep(8)
    raise SystemExit('Shopify antwortet nicht')


def patch_section(c):
    reihen = [r for r in REIHEN if r[0] in ALT or not NUR or r[0] in NUR]
    spec = ','.join(f'{k}|{h}' + (f'|{p}' if p else '') for k, h, p in reihen)
    alt_zeile = re.search(r"\{% assign lx_edit_groups = '[^']*' \| split: ',' %\}", c)
    assert alt_zeile, 'lx_edit_groups-Zeile fehlt'
    c = c.replace(alt_zeile.group(0), "{% assign lx_edit_groups = '" + spec + "' | split: ',' %}", 1)
    a = "{% assign lx_edit_neu = false %}{% if lx_edit_key == 'christmas' or lx_edit_key == 'winter' or lx_edit_key == 'gifts' %}{% assign lx_edit_neu = true %}{% endif %}"
    assert a in c, 'lx_edit_neu-Zeile fehlt'
    c = c.replace(a, "{% assign lx_edit_neu = false %}{% if lx_edit_parts.size > 2 %}{% assign lx_edit_neu = true %}{% endif %}", 1)
    b = re.search(r"\{% case lx_edit_key %\}.*?\{% endcase %\}", c)
    assert b and 'startseite-pool-weihnachten' in b.group(0), 'Pool-case fehlt'
    c = c.replace(b.group(0), "{% assign lx_edit_pool_handle = 'startseite-pool-' | append: lx_edit_parts[2] %}", 1)
    k = "{% comment %}Saison-Reihen (24.11.2026):"
    assert k in c
    c = c.replace(k, "{% comment %}Bereichs-Reihen (24.11.2026 abends, Betreiber «ergänze mehr startseiten … kleider, winter … von allen bereichen»): jede Reihe mit drittem Feld in lx_edit_groups (Schlüssel|Sammlung|Pool-Endung) zieht ihre Karten aus startseite-pool-<Endung>; Texte luxe_home.extra.<Schlüssel>_{eyebrow,heading,intro}.{% endcomment %}\n      " + k, 1)
    return c


def patch_locale(c, sprache):
    t = TEXTE[sprache]
    m = re.search(r'\n(\s*)"gifts_intro": "[^"\n]*"', c)
    assert m, 'gifts_intro fehlt'
    ein = m.group(1)
    neu = ''
    for key, (eb, hd, it) in t.items():
        if NUR and key not in NUR:
            continue
        if f'"{key}_heading"' in c:
            continue
        for suf, val in (('eyebrow', eb), ('heading', hd), ('intro', it)):
            neu += f',\n{ein}"{key}_{suf}": {json.dumps(val, ensure_ascii=False)}'
    c = c[:m.end()] + neu + c[m.end():]
    json.loads(re.sub(r'^\s*/\*.*?\*/', '', c, flags=re.S))  # bleibt gültiges JSON
    return c


def main():
    files = [SEC] + LOCS
    r = G('query($f:[String!]){theme(id:"%s"){files(filenames:$f){nodes{filename checksumMd5 body{... on OnlineStoreThemeFileBodyText{content}}}}}}' % TH, {'f': files})
    live = {n['filename']: n['body']['content'] for n in r['theme']['files']['nodes']}
    os.makedirs(os.path.join(HIER, 'sicherung'), exist_ok=True)
    plan = []
    for f in files:
        open(os.path.join(HIER, 'sicherung', f.replace('/', '__')), 'w').write(live[f])
        if f == SEC:
            neu = patch_section(live[f])
        else:
            neu = patch_locale(live[f], {'locales/de.json': 'de', 'locales/fr.json': 'fr', 'locales/en.default.json': 'en'}[f])
        open(os.path.join(HIER, 'neu__' + f.replace('/', '__')), 'w').write(neu)
        plan.append((f, neu))
        print('PLAN', f, len(live[f]), '→', len(neu))
    if not LIVE:
        return
    # Locales zuerst (die Section braucht die Schlüssel), Section zuletzt
    for f, body in plan[1:] + plan[:1]:
        md5 = hashlib.md5(body.encode()).hexdigest()
        r = G('mutation($t:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$t,files:$f){upsertedThemeFiles{filename} userErrors{filename code message}}}',
              {'t': TH, 'f': [{'filename': f, 'body': {'type': 'TEXT', 'value': body}}]})
        ue = r['themeFilesUpsert']['userErrors']
        if ue:
            print('FEHLER', f, ue); raise SystemExit(2)
        time.sleep(2)
        n = G('query($f:[String!]){theme(id:"%s"){files(filenames:$f){nodes{checksumMd5}}}}' % TH, {'f': [f]})['theme']['files']['nodes'][0]
        print('geschrieben', f, 'md5 gleich' if n['checksumMd5'] == md5 else 'ABWEICHEND ' + str(n['checksumMd5']))


if __name__ == '__main__':
    main()
