#!/usr/bin/env python3
"""Pilot: Google bekommt für die Frauenpullover eine echte Beschreibung statt unserer Werbezeile (Befund vom 09.11.2026).

Hintergrund (siehe README.md): Bei rund 95 % der 634 Pullover trägt Google als Beschreibung «<Titel> bei LuxeStyle – Schweizer
Online-Shop. Gratis-Versand ab CHF 50 …», weil die Google-&-YouTube-App die SEO-Beschreibung nimmt (Hypothese, an den Daten
belegt). Google empfiehlt «Muster, Material» und Grösse. Dieses Werkzeug setzt `seo.description` auf einen kurzen Sachtext aus
BELEGTEN Angaben des Produkts: Titel, Material und Muster aus der Faktenliste «Produktdetails», Grössen und Anzahl Farben aus den
Optionen. Kein Werbetext (Google verbietet ihn in Beschreibungen), höchstens 160 Zeichen.

Verändert wird NUR `seo.description` und nur dort, wo heute die Werbezeile steht (oder nichts). Der SEO-Titel, die
Produktbeschreibung und alles andere bleiben. Produkte ohne genug belegte Angaben bleiben, wie sie sind.

Aufruf (Vorgabe: Trockenlauf, schreibt nichts, legt nur den Plan in lauf/ ab):
  python3 dropship/merchant-beschreibung-0911/pilot_pullover.py
  LIMIT=20 LIVE=1 python3 …/pilot_pullover.py        schreibt die ersten 20 geplanten Produkte (Sicherung vorher, Rücklesen nachher)
  LIVE=1 python3 …/pilot_pullover.py                 schreibt alle geplanten
  ZURUECK=1 LIVE=1 python3 …/pilot_pullover.py       stellt die gesicherten Originale wieder her (nur wo noch unser Text steht)
  python3 …/pilot_pullover.py --selbsttest           Prüfungen ohne Netz
Umgebung: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (nie ausgeben).
"""
import collections
import html
import json
import os
import random
import re
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
sys.path.insert(0, os.path.join(HIER, '..', 'fr-produkte-0911'))
import klassifizieren as K  # noqa: E402  (ist_werbezeile)

PIDS = os.path.join(HIER, 'pullover_pids.json')
SICHERUNG = os.path.join(HIER, 'sicherung', 'pilot_pullover_vorher.json')
PLAN = os.path.join(HIER, 'lauf', 'pilot_pullover_plan.json')
MAXLEN = 160

Q_PRODUKTE = '''query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id handle title status descriptionHtml
  options{ name values } seo{ description } } } }'''
M_SETZEN = '''mutation($i:ProductInput!){ productUpdate(input:$i){ product{ id seo{ description } } userErrors{ field message } } }'''

RE_ZEILE = re.compile(r'<li>\s*<strong>([^<:]+):</strong>\s*(.*?)</li>', re.S)
RANG = {'XXS': 0, 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, '2XL': 6, 'XXL': 6, '3XL': 7, 'XXXL': 7, 'XXXXL': 8, '4XL': 8, '5XL': 9, '6XL': 10}
# Materialangaben, die wir NICHT von uns aus in den Google-Text heben: Datenblattfehler bei Pullovern (Denim, Leder) und Fasern, bei denen eine
# unbelegte Angabe heikel ist (Kaschmir, Seide, Wolle …). Sie bleiben auf der Produktseite, wie sie sind. Verglichen wird Wort für Wort
# (Baumwolle enthält «wolle», ist aber gewöhnlich und erlaubt).
HEIKEL = {'denim', 'leder', 'kaschmir', 'cashmere', 'seide', 'leinen', 'wolle', 'merino', 'merinowolle', 'lammwolle', 'alpaka', 'angora', 'mohair'}
# Wörter im Titel, die gegen die Angabe «Muster: Unifarben» sprechen (Datenblätter setzen «Unifarben» oft als Vorgabe)
RE_MUSTERWORT = re.compile(r'colorblock|fair isle|jacquard|muster|print|druck|streif|kar[oi]|blum|floral|patchwork|camou|leo|animal|argyle|raut|punkt|tupf|'
                           r'herz|stern|weihnacht|norweg|rentier|schneeflock|halloween|kürbis|skelett|totenkopf|katze|hund|motiv|aufdruck|buchstab|schrift|logo|'
                           r'tie[- ]?dye|batik|gradient|farbverlauf|plaid|tartan|3d|ombre|ombré|marmor|zebra|tiger|schmetterling|blüt|rose', re.I)
RE_UNIWORT = re.compile(r'\buni\b|unifarb|einfarbig|uni-', re.I)
MUSTER_NORM = {'uni': 'Unifarben', 'unifarben': 'Unifarben', 'einfarbig': 'Unifarben', 'streifen': 'Gestreift', 'gestreift': 'Gestreift',
               'blumen': 'Geblümt', 'floral': 'Geblümt', 'geblümt': 'Geblümt', 'kariert': 'Kariert', 'karo': 'Kariert',
               'print': 'Bedruckt', 'bedruckt': 'Bedruckt'}


# ----------------------------------------------------------------------------- reine Logik (ohne Netz)
def zeilen(body):
    """Faktenliste «Produktdetails» der Beschreibung: {Bezeichnung: Text}."""
    return {m.group(1).strip(): html.unescape(re.sub(r'<[^>]+>', '', m.group(2))).strip() for m in RE_ZEILE.finditer(body or '')}


def norm_muster(s):
    teile = [t.strip() for t in re.split(r'[,/;]', s or '') if t.strip()]
    aus = []
    for t in teile:
        n = MUSTER_NORM.get(t.lower(), t[:1].upper() + t[1:])
        if n not in aus:
            aus.append(n)
    return ', '.join(aus)


def groessen_text(werte):
    """['S','M','L','XL'] → 'S–XL'; ['Einheitsgrösse'] → 'Einheitsgrösse'. Alles, was keine gewöhnliche Grösse ist (Mutter-Kind-Sets,
    «XS/M», gemischte Werte), ergibt '' und das Produkt bekommt keinen Text mit Grössen."""
    w = [str(x).strip() for x in werte if str(x).strip()]
    if not w:
        return ''
    if len(w) == 1 and re.fullmatch(r'einheitsgr(ö|oe)sse|one size|free size|onesize', w[0], re.I):
        return 'Einheitsgrösse'
    if not all(x.upper() in RANG or re.fullmatch(r'\dXL', x.upper()) for x in w):
        return ''
    if len(w) == 1:
        return w[0].upper()
    if all(x.upper() in RANG for x in w):
        sortiert = sorted(w, key=lambda x: RANG[x.upper()])          # die Optionen können absteigend stehen
        r = [RANG[x.upper()] for x in sortiert]
        if all(b - a <= 1 for a, b in zip(r, r[1:])) and len(w) >= 3:
            return f'{sortiert[0].upper()}–{sortiert[-1].upper()}'
        return ', '.join(x.upper() for x in sortiert)
    if not all(re.fullmatch(r'\dXL', x.upper()) for x in w):
        return ''                                    # Mischung aus S/M/L und 0XL/1XL …: nichts behaupten
    sortiert = sorted(w, key=lambda x: int(x[0]))
    n = [int(x[0]) for x in sortiert]                # «0XL … 5XL»
    if n == list(range(n[0], n[0] + len(n))) and len(n) >= 3:
        return f'{sortiert[0].upper()}–{sortiert[-1].upper()}'
    return ', '.join(x.upper() for x in sortiert) if len(sortiert) <= 6 else ''


def fakten(p):
    """Belegte Angaben eines Produkts: {'material','muster','groessen','farben'} (fehlend = leer/0)."""
    z = zeilen(p.get('descriptionHtml'))
    opt = {o['name']: o['values'] for o in p.get('options', [])}
    gr = ''
    if opt.get('Grösse'):
        gr = groessen_text(opt['Grösse'])
    else:
        roh = z.get('Grössen') or z.get('Grösse') or ''
        if roh and len(roh) <= 40:
            gr = groessen_text(re.split(r'\s*[,/]\s*', roh))
    material = z.get('Material', '')
    if any(t.strip().lower() in HEIKEL for t in material.split(',')):
        material = ''
    muster = norm_muster(z.get('Muster') or z.get('Muster/Design') or '')
    titel = p.get('title') or ''
    if muster == 'Unifarben' and RE_MUSTERWORT.search(titel):
        muster = ''                                   # Titel nennt ein Muster: «Unifarben» wäre ein Widerspruch
    elif muster and muster != 'Unifarben' and RE_UNIWORT.search(titel):
        muster = ''                                   # Titel nennt «uni», das Datenblatt ein Muster: im Zweifel nichts behaupten
    return {
        'material': material,
        'muster': muster,
        'groessen': gr,
        'farben': len(opt.get('Farbe', [])),
    }


def titel_sauber(t):
    t = re.sub(r'\s+', ' ', t or '').strip()
    t = re.sub(r'\s*[·|–-]\s*Modell\s*\d+\s*$', '', t)          # «… · Modell 3» ist nur eine Unterscheidung im Shop
    return t.rstrip(' .,;:–-|')


def baue_text(titel, f):
    """Sachtext ≤ 160 Zeichen oder None, wenn zu wenig belegt ist (mindestens Material oder Muster UND Grössen)."""
    if not (f['material'] or f['muster']) or not f['groessen']:
        return None
    t = titel_sauber(titel)
    if not t:
        return None
    if not re.search(r'damen|frauen', t, re.I):
        t += ' für Damen'
    seg = {
        'material': f'Material: {f["material"]}.' if f['material'] else '',
        'muster': f'Muster: {f["muster"]}.' if f['muster'] else '',
        'groessen': (f'Grössen: {f["groessen"]}.' if f['groessen'] != 'Einheitsgrösse' else 'Einheitsgrösse.'),
        'farben': f'In {f["farben"]} Farben erhältlich.' if f['farben'] >= 2 else '',
    }
    anzeige = ['material', 'muster', 'groessen', 'farben']
    weg = ['farben', 'muster', 'material']          # Reihenfolge, in der bei Platzmangel Teile entfallen
    aktiv = [k for k in anzeige if seg[k]]

    def zusammen(ks):
        return (t + '. ' + ' '.join(seg[k] for k in anzeige if k in ks)).strip()
    while len(zusammen(aktiv)) > MAXLEN:
        kandidat = next((k for k in weg if k in aktiv), None)
        if kandidat is None:
            return None
        rest = [k for k in aktiv if k != kandidat]
        if 'groessen' not in rest or not ({'material', 'muster'} & set(rest)):
            return None
        aktiv = rest
    return zusammen(aktiv)


def plane(p):
    """Plan für ein Produkt: ('aendern', neuer Text) oder ('lassen', Grund)."""
    if p.get('status') != 'ACTIVE':
        return 'lassen', 'nicht aktiv'
    alt = (p.get('seo') or {}).get('description') or ''
    if alt and not K.ist_werbezeile(alt):
        return 'lassen', 'eigene SEO-Beschreibung steht schon'
    neu = baue_text(p.get('title'), fakten(p))
    if neu is None:
        return 'lassen', 'zu wenig belegte Angaben'
    return 'aendern', neu


# ----------------------------------------------------------------------------- Netz
def lese_produkte(shop, tok, S, pids):
    out = []
    for i in range(0, len(pids), 40):
        d = S.gql(shop, tok, Q_PRODUKTE, {'ids': ['gid://shopify/Product/' + x for x in pids[i:i + 40]]})['nodes']
        out += [x for x in d if x]
    return out


def setze(shop, tok, S, pid, text):
    r = S.gql(shop, tok, M_SETZEN, {'i': {'id': pid, 'seo': {'description': text}}})['productUpdate']
    if r['userErrors']:
        raise RuntimeError(json.dumps(r['userErrors'], ensure_ascii=False)[:300])
    return r['product']['seo']['description']


def main():
    if '--selbsttest' in sys.argv:
        return selbsttest()
    import shop as S
    live = os.environ.get('LIVE') == '1'
    zurueck = os.environ.get('ZURUECK') == '1'
    limit = int(os.environ.get('LIMIT', '0') or 0)
    pids = json.load(open(PIDS))
    shop, tok = S.token()
    produkte = lese_produkte(shop, tok, S, pids)
    print(f'{len(produkte)} von {len(pids)} Produkten gelesen')

    if zurueck:
        saved = json.load(open(SICHERUNG, encoding='utf-8'))
        plan = json.load(open(PLAN, encoding='utf-8')) if os.path.exists(PLAN) else {}
        heute = {p['id']: (p.get('seo') or {}).get('description') or '' for p in produkte}
        todo = []
        for pid, e in saved.items():
            if heute.get(pid) == e['neu'] or os.environ.get('FREMD_UEBERSCHREIBEN') == '1':
                todo.append((pid, e))
            else:
                print(f"{e['handle']}: steht nicht mehr unser Text, übersprungen")
        print('Rücknahme:', len(todo), 'Produkte', '(LIVE)' if live else '(TROCKENLAUF)')
        if live:
            for pid, e in todo:
                setze(shop, tok, S, pid, e['alt'])
                time.sleep(0.25)
            nach = {p['id']: (p.get('seo') or {}).get('description') or '' for p in lese_produkte(shop, tok, S, [x.split('/')[-1] for x, _ in todo])}
            gleich = sum(1 for pid, e in todo if nach.get(pid) == e['alt'])
            print(f'Rücklesen: {gleich} von {len(todo)} wieder gleich dem Original')
            return 0 if gleich == len(todo) else 3
        return 0

    zaehl = collections.Counter()
    plan = {}
    for p in produkte:
        art, wert = plane(p)
        zaehl[art if art == 'aendern' else 'lassen: ' + wert] += 1
        if art == 'aendern':
            plan[p['id']] = {'handle': p['handle'], 'titel': p['title'], 'alt': (p.get('seo') or {}).get('description') or '', 'neu': wert}
    if not live:
        os.makedirs(os.path.dirname(PLAN), exist_ok=True)
        json.dump(plan, open(PLAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)   # Prüfstand «vorher/nachher» für den Menschen
    print('Plan:', dict(zaehl))
    laengen = sorted(len(e['neu']) for e in plan.values())
    if laengen:
        print(f'Länge der neuen Texte: kleinste {laengen[0]}, mittlere {laengen[len(laengen) // 2]}, grösste {laengen[-1]} (Grenze {MAXLEN})')
    hat = collections.Counter()
    for p in produkte:
        if p['id'] in plan:
            f = fakten(p)
            hat['Material'] += bool(f['material'])
            hat['Muster'] += bool(f['muster'])
            hat['Farben'] += f['farben'] >= 2
    print('Angaben in den geplanten Texten (Anzahl Produkte, ob der Text sie noch trägt, nicht gezählt):', dict(hat))
    if not live:
        zufall = random.Random(20261109)
        beispiele = zufall.sample(list(plan.items()), min(6, len(plan)))
        for pid, e in beispiele:
            print('\n', e['handle'])
            print('   alt :', e['alt'][:150])
            print('   neu :', e['neu'], f'({len(e["neu"])} Zeichen)')
        print('\nTROCKENLAUF: nichts geschrieben. Plan in', os.path.relpath(PLAN))
        return 0

    # --- LIVE: Sicherung zuerst (vorhandene Originale werden nie überschrieben)
    os.makedirs(os.path.dirname(SICHERUNG), exist_ok=True)
    saved = json.load(open(SICHERUNG, encoding='utf-8')) if os.path.exists(SICHERUNG) else {}
    todo = list(plan.items())
    if limit:
        todo = todo[:limit]
    for pid, e in todo:
        saved.setdefault(pid, {'handle': e['handle'], 'alt': e['alt'], 'neu': e['neu']})
        saved[pid]['neu'] = e['neu']
    json.dump(saved, open(SICHERUNG, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'Sicherung: {len(saved)} Originale in {os.path.relpath(SICHERUNG)}')
    fehler = 0
    for i, (pid, e) in enumerate(todo, 1):
        try:
            setze(shop, tok, S, pid, e['neu'])
        except Exception as ex:
            fehler += 1
            print(f"[{i}] {e['handle']}: FEHLER {str(ex)[:160]}")
        if i % 50 == 0:
            print(f'  … {i} von {len(todo)}')
        time.sleep(0.25)
    nach = {p['id']: (p.get('seo') or {}).get('description') or '' for p in lese_produkte(shop, tok, S, [x.split('/')[-1] for x, _ in todo])}
    gleich = sum(1 for pid, e in todo if nach.get(pid) == e['neu'])
    print(f'Geschrieben: {len(todo) - fehler} von {len(todo)} | frisch zurückgelesen gleich Soll: {gleich} | Fehler {fehler}')
    return 0 if (gleich == len(todo) and not fehler) else 3


# ----------------------------------------------------------------------------- Selbsttest
def selbsttest():
    fehler = []

    def ok(name, bed):
        print(('  ok   ' if bed else '  FAIL ') + name)
        if not bed:
            fehler.append(name)
    ok('Grössen: S–XL', groessen_text(['S', 'M', 'L', 'XL']) == 'S–XL')
    ok('Grössen: XS–3XL', groessen_text(['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']) == 'XS–3XL')
    ok('Grössen: XXL und 2XL gelten gleich', groessen_text(['S', 'M', 'L', 'XL', 'XXL']) == 'S–XXL')
    ok('Grössen: Einheitsgrösse bleibt', groessen_text(['Einheitsgrösse']) == 'Einheitsgrösse')
    ok('Grössen: zwei Werte als Aufzählung', groessen_text(['M', 'L']) == 'M, L')
    ok('Grössen: Lücke wird nicht als Bereich behauptet', groessen_text(['S', 'L', 'XL']) == 'S, L, XL')
    ok('Grössen: Unbekanntes ergibt nichts (Zahlen, Mutter-Kind-Sets, «XS/M», Einheitsgrösse mit anderen Werten)',
       groessen_text(['36', '38', '40']) == '' and groessen_text(['Mama S', 'Mama M', 'Mädchen 2Y']) == '' and groessen_text(['XS/M', 'L To 2XL']) == ''
       and groessen_text(['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Einheitsgrösse']) == '' and groessen_text(['S', 'M', 'L', 'XL', '80', '90']) == '')
    ok('Grössen: absteigend gespeicherte Optionen ergeben trotzdem von klein bis gross', groessen_text(['5XL', '4XL', '3XL']) == '3XL–5XL'
       and groessen_text(['XL', 'L', 'M', 'S']) == 'S–XL' and groessen_text(['5XL', '4XL', '3XL', '2XL', '1XL', '0XL']) == '0XL–5XL')
    ok('Titel: « · Modell 3» entfällt im Text', titel_sauber('Langarm-Pullover · Modell 3') == 'Langarm-Pullover' and titel_sauber('Pullover - Modell 12') == 'Pullover')
    ok('Titel: «Modell» mitten im Titel bleibt', titel_sauber('Modellierender Pullover') == 'Modellierender Pullover')
    ok('Grössen: Mischung aus S/M und 0XL ergibt nichts (kein Absturz)', groessen_text(['S', 'M', '0XL']) == '' and groessen_text(['M', '1XL', '2XL']) == '')
    ok('Grössen: One Size gilt als Einheitsgrösse', groessen_text(['One Size']) == 'Einheitsgrösse')
    ok('Grössen: XXXXL wird erkannt', groessen_text(['S', 'M', 'L', 'XXL', 'XXXL', 'XXXXL']) == 'S, M, L, XXL, XXXL, XXXXL')
    ok('Grössen: 0XL–5XL als Bereich', groessen_text(['0XL', '1XL', '2XL', '3XL', '4XL', '5XL']) == '0XL–5XL')
    ok('Grössen: leer', groessen_text([]) == '')
    ok('Muster: Uni und einfarbig → Unifarben', norm_muster('Uni') == 'Unifarben' and norm_muster('einfarbig') == 'Unifarben')
    ok('Muster: Streifen → Gestreift, Doppelte entfallen', norm_muster('Streifen') == 'Gestreift' and norm_muster('gestreift, Streifen') == 'Gestreift')
    ok('Muster: mehrere bleiben', norm_muster('Gestreift, Patchwork') == 'Gestreift, Patchwork')
    body = '<ul><li> <strong>Material:</strong> Polyester, Strick</li> <li> <strong>Muster:</strong> Unifarben</li></ul>'
    ok('Faktenliste wird gelesen', zeilen(body) == {'Material': 'Polyester, Strick', 'Muster': 'Unifarben'})
    p = {'status': 'ACTIVE', 'title': 'Unifarbener Strickpullover mit Rundhalsausschnitt', 'descriptionHtml': body,
         'options': [{'name': 'Farbe', 'values': ['a', 'b', 'c', 'd']}, {'name': 'Grösse', 'values': ['S', 'M', 'L', 'XL']}],
         'seo': {'description': 'Unifarbener Strickpullover bei LuxeStyle – Schweizer Online-Shop. Gratis-Versand ab CHF 50, 30 Tage Rückgabe.'}}
    art, text = plane(p)
    ok('Plan: Werbezeile wird ersetzt', art == 'aendern')
    ok('Text: Titel, Material, Muster, Grössen, Farben', text == 'Unifarbener Strickpullover mit Rundhalsausschnitt für Damen. Material: Polyester, Strick. Muster: Unifarben. Grössen: S–XL. In 4 Farben erhältlich.')
    ok('Text: höchstens 160 Zeichen', len(text) <= MAXLEN)
    ok('Text: kein Werbewort', not re.search(r'gratis|versand|rückgabe|code|rabatt|–10|jetzt', text, re.I))
    ok('Titel mit «Damen» bekommt kein zweites «für Damen»', 'für Damen' not in baue_text('Pullover Damen Slim Fit', {'material': 'Wolle', 'muster': '', 'groessen': 'S–L', 'farben': 0}))
    ok('Titel: Satzzeichen am Ende entfallen', baue_text('Pullover aus Wolle –', {'material': 'Wolle', 'muster': '', 'groessen': 'S–L', 'farben': 0}).startswith('Pullover aus Wolle für Damen. '))
    lang = 'X' * 88
    t2 = baue_text(lang, {'material': 'Polyester, Strick', 'muster': 'Unifarben', 'groessen': 'S–XL', 'farben': 4})
    ok('Zu lang: Farben entfallen zuerst, dann Muster, Ergebnis ≤ 160', t2 is not None and len(t2) <= MAXLEN and 'Farben' not in t2)
    t3 = baue_text('X' * 120, {'material': 'Polyester, Strick', 'muster': 'Unifarben', 'groessen': 'S–XL', 'farben': 4})
    ok('Viel zu langer Titel: kein Text (Produkt bleibt)', t3 is None)
    ok('Kein Material und kein Muster: kein Text', baue_text('Pullover', {'material': '', 'muster': '', 'groessen': 'S–L', 'farben': 3}) is None)
    ok('Keine Grössen: kein Text', baue_text('Pullover', {'material': 'Wolle', 'muster': 'Uni', 'groessen': '', 'farben': 3}) is None)
    ok('Einheitsgrösse steht ohne «Grössen:»', 'Einheitsgrösse.' in baue_text('Pullover', {'material': 'Wolle', 'muster': '', 'groessen': 'Einheitsgrösse', 'farben': 0})
       and 'Grössen:' not in baue_text('Pullover', {'material': 'Wolle', 'muster': '', 'groessen': 'Einheitsgrösse', 'farben': 0}))
    ok('Eine Farbe wird nicht erwähnt', 'Farben' not in baue_text('Pullover', {'material': 'Wolle', 'muster': '', 'groessen': 'S–L', 'farben': 1}))
    def mit_material(m):
        return fakten(dict(p, descriptionHtml=body.replace('Polyester, Strick', m)))['material']
    ok('Material: gewöhnliche Fasern bleiben (auch Baumwolle, obwohl «wolle» drin steckt)', mit_material('Baumwolle, Strick') == 'Baumwolle, Strick')
    ok('Material: heikle Fasern entfallen ganz (Kaschmir, Wolle, Seide, Leinen, Denim, Leder)',
       all(mit_material(m) == '' for m in ('Kaschmir, Strick', 'Wolle', 'Polyester, Seide', 'Leinen, Seide, Strick', 'Denim', 'Leder', 'Elastan, Kaschmir, Strick')))
    def mit_titel(t, muster='Unifarben'):
        return fakten(dict(p, title=t, descriptionHtml=body.replace('Unifarben', muster)))['muster']
    ok('Muster: «Unifarben» entfällt, wenn der Titel ein Muster nennt', all(mit_titel(t) == '' for t in (
        'Colorblock Strickpullover', 'Retro Jacquard Pullover', 'Weihnachts-Pullover Damen 3D-Druck', 'Strickpullover mit Herzmuster', 'Pullover mit Gradientendruck')))
    ok('Muster: Halloween, Plaid, Tie-Dye, Motiv im Titel sprechen gegen «Unifarben»', all(mit_titel(t) == '' for t in (
        'Halloween Langarm-Pulli Herbst/Winter', 'Plaid Pullover Damen', 'Tie-Dye Hoodie', 'Pullover mit Motiv', 'Katzen-Pullover')))
    ok('Muster: «Unifarben» bleibt bei einem schlichten Titel', mit_titel('Strickpullover mit Rundhalsausschnitt') == 'Unifarben')
    ok('Muster: Titel sagt «unifarben», Datenblatt «Gestreift» → nichts behaupten', mit_titel('Unifarbener Strickpullover', 'Gestreift') == '')
    ok('Muster: «Gestreift» bei neutralem Titel bleibt', mit_titel('Strickpullover mit Rundhals', 'Streifen') == 'Gestreift')
    qd = dict(p, descriptionHtml=body.replace('Polyester, Strick', 'Denim'))
    ok('Material «Denim» bei einem Pullover wird nicht übernommen, das Muster trägt den Text', fakten(qd)['material'] == '' and 'Material:' not in plane(qd)[1] and 'Muster: Unifarben.' in plane(qd)[1])
    qd = dict(p, descriptionHtml=body.replace('Polyester, Strick', 'Leder').replace('<li> <strong>Muster:</strong> Unifarben</li>', ''))
    ok('Nur verdächtiges Material und kein Muster: Produkt bleibt', plane(qd) == ('lassen', 'zu wenig belegte Angaben'))
    q = dict(p, status='DRAFT')
    ok('Plan: Entwurf bleibt', plane(q) == ('lassen', 'nicht aktiv'))
    q = dict(p, seo={'description': 'Eine eigene, echte Beschreibung des Pullovers.'})
    ok('Plan: eigene SEO-Beschreibung bleibt', plane(q)[0] == 'lassen')
    q = dict(p, seo={'description': text})
    ok('Plan: unser eigener Text steht schon → nichts tun (zweiter Lauf ändert nichts)', plane(q) == ('lassen', 'eigene SEO-Beschreibung steht schon'))
    q = dict(p, seo={'description': ''})
    ok('Plan: leere SEO-Beschreibung wird gefüllt', plane(q)[0] == 'aendern')
    q = dict(p, descriptionHtml='<p>Ohne Faktenliste</p>', options=[{'name': 'Grösse', 'values': ['S', 'M']}])
    ok('Plan: ohne Material und Muster bleibt das Produkt', plane(q) == ('lassen', 'zu wenig belegte Angaben'))
    q = dict(p, options=[{'name': 'Ausführung', 'values': ['A', 'B']}], descriptionHtml=body.replace('</ul>', '<li><strong>Grössen:</strong> S, M, L</li></ul>'))
    ok('Grössen aus der Faktenliste, wenn keine Grössen-Option da ist', 'Grössen: S–L.' in (plane(q)[1] or ''))
    # --- Ablauf mit Attrappe des Shops: schreiben, Sicherung, zweiter Lauf, Rücknahme
    import contextlib
    import copy
    import io
    import tempfile
    import types
    werbe = 'Pullover bei LuxeStyle – Schweizer Online-Shop. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. Jetzt –10% mit Code WELCOME10.'

    def prod(n, status='ACTIVE', seo=werbe, body=body, mit_gr=True):
        return {'id': f'gid://shopify/Product/{n}', 'handle': f'p{n}', 'title': f'Strickpullover Nr {n}', 'status': status, 'descriptionHtml': body,
                'options': [{'name': 'Grösse', 'values': ['S', 'M', 'L']}] if mit_gr else [], 'seo': {'description': seo}}
    laden = {str(n): prod(n) for n in (1, 2, 3)}
    laden['4'] = prod(4, seo='Eine eigene, echte Beschreibung.')
    laden['5'] = prod(5, status='DRAFT')
    laden['6'] = prod(6, body='<p>keine Faktenliste</p>')
    laden['7'] = prod(7, mit_gr=False)
    schreibaufrufe = []
    fake = types.ModuleType('shop')
    fake.token = lambda: ('shop.test', 'tok')

    def fake_gql(shop, tok, q, v=None):
        if q == Q_PRODUKTE:
            return {'nodes': [copy.deepcopy(laden.get(i.split('/')[-1])) for i in v['ids']]}
        if q == M_SETZEN:
            schreibaufrufe.append(v['i']['id'])
            pr = laden.get(v['i']['id'].split('/')[-1])
            if not pr:
                return {'productUpdate': {'product': None, 'userErrors': [{'field': ['id'], 'message': 'Product does not exist'}]}}
            pr['seo']['description'] = v['i']['seo']['description']
            return {'productUpdate': {'product': {'id': pr['id'], 'seo': {'description': pr['seo']['description']}}, 'userErrors': []}}
        raise AssertionError('unerwartete Abfrage')
    fake.gql = fake_gql
    tmp = tempfile.mkdtemp()
    echt = (PIDS, SICHERUNG, PLAN, sys.modules.get('shop'), time.sleep)
    globals().update(PIDS=os.path.join(tmp, 'pids.json'), SICHERUNG=os.path.join(tmp, 's', 'vorher.json'), PLAN=os.path.join(tmp, 'l', 'plan.json'))
    json.dump(list(laden), open(PIDS, 'w'))
    sys.modules['shop'] = fake
    time.sleep = lambda x: None
    env_vorher = {k: os.environ.get(k) for k in ('LIVE', 'ZURUECK', 'LIMIT', 'FREMD_UEBERSCHREIBEN')}

    def lauf(**env):
        for k in env_vorher:
            os.environ.pop(k, None)
        os.environ.update(env)
        puffer = io.StringIO()
        argv_alt, sys.argv = sys.argv, ['pilot_pullover.py']           # sonst startet main() wieder den Selbsttest
        try:
            with contextlib.redirect_stdout(puffer):
                rc = main()
        finally:
            sys.argv = argv_alt
        return rc, puffer.getvalue()
    try:
        vorher = copy.deepcopy(laden)
        rc, aus = lauf()
        ok('Ablauf: Trockenlauf schreibt nichts in den Shop und legt den Plan ab', rc == 0 and not schreibaufrufe and laden == vorher and os.path.exists(PLAN)
           and sorted(json.load(open(PLAN))) == sorted(f'gid://shopify/Product/{n}' for n in (1, 2, 3)))
        rc, aus = lauf(LIVE='1', LIMIT='2')
        geaendert = [n for n in laden if laden[n]['seo']['description'] != vorher[n]['seo']['description']]
        ok('Ablauf: LIVE mit LIMIT=2 schreibt genau zwei Produkte', rc == 0 and len(geaendert) == 2 and len(schreibaufrufe) == 2)
        saved = json.load(open(SICHERUNG, encoding='utf-8'))
        ok('Ablauf: Sicherung enthält die Originale der geschriebenen Produkte', sorted(saved) == sorted(f'gid://shopify/Product/{n}' for n in geaendert)
           and all(saved[f'gid://shopify/Product/{n}']['alt'] == werbe for n in geaendert))
        rc, aus = lauf(LIVE='1')
        ok('Ablauf: zweiter LIVE-Lauf schreibt nur das dritte Produkt', rc == 0 and len(schreibaufrufe) == 3 and sorted(
            n for n in laden if laden[n]['seo']['description'] != vorher[n]['seo']['description']) == ['1', '2', '3'])
        ok('Ablauf: nicht geplante Produkte (eigener Text, Entwurf, ohne Fakten, ohne Grössen) bleiben unberührt', all(laden[n] == vorher[n] for n in ('4', '5', '6', '7')))
        saved = json.load(open(SICHERUNG, encoding='utf-8'))
        ok('Ablauf: Originale in der Sicherung sind nie durch unseren Text ersetzt worden', all(e['alt'] == werbe for e in saved.values()) and len(saved) == 3)
        rc, aus = lauf(LIVE='1')
        ok('Ablauf: dritter Lauf findet nichts mehr (idempotent), Sicherung bleibt', rc == 0 and len(schreibaufrufe) == 3 and len(json.load(open(SICHERUNG, encoding='utf-8'))) == 3)
        laden['1']['seo']['description'] = werbe.replace('Pullover', 'Strickpullover')      # eine SEO-Runde des Shops schreibt wieder eine Werbezeile
        rc, aus = lauf(LIVE='1')
        gesichert = json.load(open(SICHERUNG, encoding='utf-8'))['gid://shopify/Product/1']
        ok('Ablauf: schreibt eine SEO-Runde die Werbezeile neu, bleibt in der Sicherung das ERSTE Original', rc == 0 and gesichert['alt'] == werbe
           and len(schreibaufrufe) == 4 and laden['1']['seo']['description'] == gesichert['neu'])
        laden['2']['seo']['description'] = 'Jemand hat das Produkt 2 inzwischen von Hand geändert.'
        rc, aus = lauf(ZURUECK='1')
        ok('Rücknahme als Trockenlauf schreibt nichts', rc == 0 and len(schreibaufrufe) == 4)
        rc, aus = lauf(ZURUECK='1', LIVE='1')
        ok('Rücknahme: Produkte mit unserem Text gehen auf das Original zurück', rc == 0 and laden['1']['seo']['description'] == werbe and laden['3']['seo']['description'] == werbe)
        ok('Rücknahme: eine fremde Änderung wird NICHT überschrieben', laden['2']['seo']['description'].startswith('Jemand hat') and 'steht nicht mehr unser Text' in aus)
        ok('Rücknahme: Produkte ohne Plan blieben unberührt', all(laden[n] == vorher[n] for n in ('4', '5', '6', '7')))
    finally:
        globals().update(PIDS=echt[0], SICHERUNG=echt[1], PLAN=echt[2])
        if echt[3] is None:
            sys.modules.pop('shop', None)
        else:
            sys.modules['shop'] = echt[3]
        time.sleep = echt[4]
        for k, v in env_vorher.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
    print('Selbsttest:', 'ALLE OK' if not fehler else f'{len(fehler)} FEHLER')
    return 0 if not fehler else 1


if __name__ == '__main__':
    sys.exit(main())
