#!/usr/bin/env python3
"""abendaktion.py — zeitlich begrenzte Gratisversand-Aktion (06.10.2026, Betreiber «mein ziel heute 1 verkauf, mach es irgendwie»).

Gemessen (dropship/WARENKORB-GRATISVERSAND-2026-10-06.md): 5 von 7 fremden Abbruch-Körben lagen unter CHF 45 und sahen CHF 7
Versand erst im Checkout. Die Aktion nimmt genau diese Hürde für ein Zeitfenster weg:
  1. automatischer Shopify-Rabatt «Gratisversand» (Schweiz, ohne Mindestbetrag), startsAt jetzt, endsAt = ENDE — läuft von
     selbst aus, auch wenn dieses Skript nie wieder läuft;
  2. Ankündigungsleiste Block ls_announce_1 → Aktionstext (Originaltext in dropship/_abendaktion.json);
  3. Warenkorb-Drawer (snippets/cart-summary.liquid, Block LUX-GRATISVERSAND): Zeitbedingung `lux_aktion` (Liquid 'now' < ENDE)
     → «Gratisversand inklusive» auch unter CHF 45 — schaltet sich um ENDE selbst ab.
`--aufraeumen` (stündlich aus engine_keepalive.sh): nach ENDE Leiste zurück + Zeitbedingung aus dem Snippet; idempotent.

  python3 automation/abendaktion.py --start 2026-10-06T21:59:00Z [--text "…"]   # DRY ohne SCHARF=1
  python3 automation/abendaktion.py --aufraeumen                                  # nach Ablauf zurückstellen
"""
import datetime as dt, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402
import warenkorb_gratisversand as wg  # noqa: E402

ZUSTAND = os.path.join(REPO, 'dropship', '_abendaktion.json')
LEISTE = 'sections/header-group.json'
BLOCK_ID = 'ls_announce_1'
MARKE = 'LUX-ABENDAKTION'
SCHARF = os.environ.get('SCHARF') == '1'


def datei(name):
    r = gql('query($id:ID!){ theme(id:$id){ files(filenames:["%s"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }' % name,
            {'id': wg.THEME})
    return r['theme']['files']['nodes'][0]['body']['content']


def schreiben(name, inhalt, pruef):
    r = gql('mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){'
            'upsertedThemeFiles{filename} userErrors{field message}}}',
            {'id': wg.THEME, 'files': [{'filename': name, 'body': {'type': 'TEXT', 'value': inhalt}}]})['themeFilesUpsert']
    if r['userErrors']:
        raise RuntimeError(f'{name}: {r["userErrors"]}')
    for _ in range(8):
        time.sleep(3)
        if pruef(datei(name)):
            return
    raise RuntimeError(f'{name}: Rücklesen fehlt')


def json_teile(c):
    k = c.find('{', c.find('*/')) if c.lstrip().startswith('/*') else c.find('{')
    return c[:k], json.loads(c[k:])


def leiste_setzen(text):
    c = datei(LEISTE)
    open(f'/tmp/header-group.vor-abendaktion.{int(time.time())}.json', 'w').write(c)
    kopf, j = json_teile(c)
    sec = next(s for s in j['sections'].values() if s.get('type') == 'header-announcements')
    alt = sec['blocks'][BLOCK_ID]['settings']['text']
    sec['blocks'][BLOCK_ID]['settings']['text'] = text
    neu = kopf + json.dumps(j, ensure_ascii=False, indent=2) + '\n'
    if SCHARF:
        schreiben(LEISTE, neu, lambda x: text in x)
    return alt


def snippet_zeit(ende_epoch):
    """Zeitbedingung in den Warenkorb-Hinweis; None = entfernen."""
    c = datei(wg.DATEI)
    ohne = re.sub(r'    \{%- comment -%\} ' + MARKE + r'.*?\{%- endif -%\}\n', '', c, flags=re.S)
    ohne = ohne.replace('cart.total_price >= 4500 or lux_aktion -%}', 'cart.total_price >= 4500 -%}')
    if ende_epoch is None:
        neu = ohne
    else:
        anker = '    {%- unless cart == empty -%}\n      <div class="cart-totals__item lux-gratisversand'
        if ohne.count(anker) != 1 or ohne.count('cart.total_price >= 4500 -%}') != 1:
            raise RuntimeError('Warenkorb-Block nicht eindeutig gefunden — Aktion im Drawer nicht gesetzt')
        zeit = (f'    {{%- comment -%}} {MARKE} bis {ende_epoch} (automation/abendaktion.py) {{%- endcomment -%}}'
                f'{{%- assign lux_aktion = false -%}}{{%- assign lux_jetzt = "now" | date: "%s" | plus: 0 -%}}'
                f'{{%- if lux_jetzt < {ende_epoch} -%}}{{%- assign lux_aktion = true -%}}{{%- endif -%}}\n')
        neu = ohne.replace(anker, zeit + anker, 1).replace('cart.total_price >= 4500 -%}', 'cart.total_price >= 4500 or lux_aktion -%}', 1)
    if neu != c and SCHARF:
        open(f'/tmp/cart-summary.vor-abendaktion.{int(time.time())}.liquid', 'w').write(c)
        schreiben(wg.DATEI, neu, lambda x: (MARKE in x) == (ende_epoch is not None))
    return neu != c


def rabatt(ende_iso):
    d = {'title': 'Abendaktion: Gratisversand ohne Mindestbetrag', 'startsAt': dt.datetime.now(dt.timezone.utc).isoformat(),
         'endsAt': ende_iso, 'destination': {'countries': {'add': ['CH'], 'includeRestOfWorld': False}},
         'combinesWith': {'productDiscounts': True, 'orderDiscounts': True}}
    if not SCHARF:
        return 'DRY'
    r = gql('mutation($d:DiscountAutomaticFreeShippingInput!){discountAutomaticFreeShippingCreate(freeShippingAutomaticDiscount:$d){'
            'automaticDiscountNode{id automaticDiscount{... on DiscountAutomaticFreeShipping{title status startsAt endsAt}}} userErrors{field message}}}',
            {'d': d})['discountAutomaticFreeShippingCreate']
    if r['userErrors']:
        raise RuntimeError(f'Rabatt: {r["userErrors"]}')
    return r['automaticDiscountNode']['id'], r['automaticDiscountNode']['automaticDiscount']['status']


def start(ende_iso, text):
    ende = dt.datetime.fromisoformat(ende_iso.replace('Z', '+00:00'))
    if os.path.exists(ZUSTAND) and json.load(open(ZUSTAND)).get('aktiv'):
        print('Aktion läuft schon:', json.load(open(ZUSTAND))); return 1
    rid = rabatt(ende_iso)
    alt = leiste_setzen(text)
    snippet_zeit(int(ende.timestamp()))
    z = {'aktiv': True, 'ende': ende_iso, 'rabatt': rid, 'leiste_alt': alt, 'leiste_neu': text}
    if SCHARF:
        json.dump(z, open(ZUSTAND, 'w'), ensure_ascii=False, indent=1)
    print(('GESTARTET' if SCHARF else 'TROCKEN'), json.dumps(z, ensure_ascii=False))
    return 0


def aufraeumen():
    if not os.path.exists(ZUSTAND):
        return 0
    z = json.load(open(ZUSTAND))
    if not z.get('aktiv'):
        return 0
    ende = dt.datetime.fromisoformat(z['ende'].replace('Z', '+00:00'))
    if dt.datetime.now(dt.timezone.utc) < ende:
        print(f"ABENDAKTION: läuft bis {z['ende']} (Gratisversand ohne Mindestbetrag)"); return 0
    leiste_setzen(z['leiste_alt'])
    snippet_zeit(None)
    if SCHARF:
        z['aktiv'] = False; z['aufgeraeumt'] = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
        json.dump(z, open(ZUSTAND, 'w'), ensure_ascii=False, indent=1)
    print(f"ABENDAKTION beendet {'(zurückgestellt)' if SCHARF else '(TROCKEN)'}: Leiste wieder «{z['leiste_alt'][:50]}…»")
    return 0


if __name__ == '__main__':
    a = sys.argv
    if '--start' in a:
        t = a[a.index('--text') + 1] if '--text' in a else '🚚 Nur heute bis 24 Uhr: Gratisversand auf alles – ohne Mindestbetrag'
        sys.exit(start(a[a.index('--start') + 1], t))
    sys.exit(aufraeumen())
