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

  python3 automation/abendaktion.py --start 2026-10-06T21:59:00Z [--text "…"]   # DRY ohne SCHARF=1 — seit 26.11.2026 GESPERRT (s. u.)
  python3 automation/abendaktion.py --aufraeumen                                  # nach Ablauf zurückstellen
  python3 automation/abendaktion.py --selbsttest                                  # ohne Netz

NACHTRAG 26.11.2026 (Theme-Wechsel 21.11., dropship/theme-id-2611/URTEILE.md): Die Aktion erbte die Theme-ID aus warenkorb_gratisversand
(wg.THEME, fest 187533001089). Die gibt es dort nicht mehr — dort zielt jetzt jeder Lauf aufs LIVE-Theme. Hier bewusst NICHT mitgewandert:
  * --start ist GESPERRT, solange der Warenkorb-Anker SCHWELLE_ANKER (Stand 06.10.: «>= 4500», Tarif 45) nicht der heutigen Schwelle
    warenkorb_einig.TARIF (5000, Entscheid 22.10.) entspricht. Im Live-Theme hätte --start erst den Gratisversand-Rabatt (shopweit)
    angelegt, dann header-group.json (dort steht das Black-Week-Banner ls_announce_bw) neu geschrieben und wäre erst danach am Anker
    gescheitert — ohne Zustandsdatei, also ohne Aufräumen. Wird der Anker nachgezogen, prüft --start jetzt ZUERST beide Dateien,
    legt erst dann den Rabatt an und schreibt das Ziel-Theme in die Zustandsdatei.
  * --aufraeumen (stündlich, SCHARF=1) räumt nur dort auf, wo die Aktion lief: Theme aus der Zustandsdatei, ältere Zustände ohne Theme
    = ALT_THEME (06.10.2026). Ohne aktive Aktion fragt es nichts ab (heute: aktiv false seit 06.10.).
  * --selbsttest spielt --start auch mit AUFGEHOBENER Sperre gegen Attrappen durch (theme_attrappe.py, ohne Netz): erst beide Dateien
    lesen, dann Rabatt, Zustand samt Theme VOR der ersten Theme-Schreibung, Ziel = Live-Theme; fehlt ein Anker → nichts angelegt.
"""
import datetime as dt, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402
import warenkorb_gratisversand as wg  # noqa: E402  (DATEI; TARIF_RP = heutige Schwelle)

ZUSTAND = os.path.join(REPO, 'dropship', '_abendaktion.json')
LEISTE = 'sections/header-group.json'
BLOCK_ID = 'ls_announce_1'
MARKE = 'LUX-ABENDAKTION'
SCHARF = os.environ.get('SCHARF') == '1'
SICHERUNG = '/tmp'   # Sicherungskopien vor dem Schreiben (im Selbsttest ein Wegwerf-Ordner)
ALT_THEME = 'gid://shopify/OnlineStoreTheme/187533001089'   # dort lief die Aktion vom 06.10.2026 (damals MAIN); Aufräumen alter Zustände nur dort
SCHWELLE_ANKER = 4500   # Rappen: Anker im Warenkorb-Block, wie 06.10. gebaut; ≠ wg.TARIF_RP ⇒ --start gesperrt
# Zweiter Anker (06.10.): direkt nach «unless» kam das <div>. Seit LUX-CHLAGER-KORB (13.10.) steht dort eine assign-Zeile — auch er passt nicht mehr.
DRAWER_ANKER = '    {%- unless cart == empty -%}\n      <div class="cart-totals__item lux-gratisversand'


def _anker(rp=None):
    return f'cart.total_price >= {SCHWELLE_ANKER if rp is None else rp} -%}}'


def start_gesperrt():
    """Grund (Text) oder None. Rein, ohne Netz: beide Anker der Aktion müssen genau 1× im HEUTIGEN Soll-Block (wg.BLOCK) stehen."""
    fehlt = [a for a in (_anker(), DRAWER_ANKER) if wg.BLOCK.count(a) != 1]
    if SCHWELLE_ANKER != wg.TARIF_RP or fehlt:
        return (f'--start GESPERRT: Warenkorb-Anker veraltet («{_anker()}», heute «{_anker(wg.TARIF_RP)}», Tarif {wg.TARIF_RP / 100:.2f} '
                f'nach Rabatt, Entscheid 22.10.2026; {len(fehlt)} von 2 Ankern nicht im heutigen Hinweis-Block). Erst die Aktion an '
                f'warenkorb_gratisversand.BLOCK anpassen und prüfen — nichts angelegt, nichts geschrieben.')
    return None


def datei(name, theme):
    r = gql('query($id:ID!){ theme(id:$id){ files(filenames:["%s"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }' % name,
            {'id': theme})
    return r['theme']['files']['nodes'][0]['body']['content']


def schreiben(name, inhalt, pruef, theme):
    r = gql('mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){'
            'upsertedThemeFiles{filename} userErrors{field message}}}',
            {'id': theme, 'files': [{'filename': name, 'body': {'type': 'TEXT', 'value': inhalt}}]})['themeFilesUpsert']
    if r['userErrors']:
        raise RuntimeError(f'{name}: {r["userErrors"]}')
    for _ in range(8):
        time.sleep(3)
        if pruef(datei(name, theme)):
            return
    raise RuntimeError(f'{name}: Rücklesen fehlt')


def json_teile(c):
    k = c.find('{', c.find('*/')) if c.lstrip().startswith('/*') else c.find('{')
    return c[:k], json.loads(c[k:])


def leiste_neu(c, text):
    """Rein: (alter Text, neuer Dateiinhalt) — nur Block BLOCK_ID bekommt den Text, alle anderen Blöcke (ls_announce_bw …) bleiben."""
    kopf, j = json_teile(c)
    sec = next(s for s in j['sections'].values() if s.get('type') == 'header-announcements')
    alt = sec['blocks'][BLOCK_ID]['settings']['text']
    sec['blocks'][BLOCK_ID]['settings']['text'] = text
    return alt, kopf + json.dumps(j, ensure_ascii=False, indent=2) + '\n'


def leiste_setzen(text, theme):
    c = datei(LEISTE, theme)
    alt, neu = leiste_neu(c, text)
    if SCHARF and neu != c:
        open(f'{SICHERUNG}/header-group.vor-abendaktion.{int(time.time())}.json', 'w').write(c)
        schreiben(LEISTE, neu, lambda x: text in x, theme)
    return alt


def snippet_neu(c, ende_epoch):
    """Rein: Warenkorb-Hinweis mit Zeitbedingung bis ende_epoch; None = Zeitbedingung entfernen. RuntimeError, wenn die Anker fehlen."""
    ohne = re.sub(r'    \{%- comment -%\} ' + MARKE + r'.*?\{%- endif -%\}\n', '', c, flags=re.S)
    ohne = re.sub(r'cart\.total_price >= (\d+) or lux_aktion -%\}', r'cart.total_price >= \1 -%}', ohne)
    if ende_epoch is None:
        return ohne
    anker = DRAWER_ANKER
    if ohne.count(anker) != 1 or ohne.count(_anker()) != 1:
        raise RuntimeError(f'Warenkorb-Block nicht eindeutig gefunden («{_anker()}» {ohne.count(_anker())}×) — Aktion nicht gesetzt')
    zeit = (f'    {{%- comment -%}} {MARKE} bis {ende_epoch} (automation/abendaktion.py) {{%- endcomment -%}}'
            f'{{%- assign lux_aktion = false -%}}{{%- assign lux_jetzt = "now" | date: "%s" | plus: 0 -%}}'
            f'{{%- if lux_jetzt < {ende_epoch} -%}}{{%- assign lux_aktion = true -%}}{{%- endif -%}}\n')
    return ohne.replace(anker, zeit + anker, 1).replace(_anker(), _anker().replace(' -%}', ' or lux_aktion -%}'), 1)


def snippet_zeit(ende_epoch, theme):
    """Zeitbedingung in den Warenkorb-Hinweis; None = entfernen."""
    c = datei(wg.DATEI, theme)
    neu = snippet_neu(c, ende_epoch)
    if neu != c and SCHARF:
        open(f'{SICHERUNG}/cart-summary.vor-abendaktion.{int(time.time())}.liquid', 'w').write(c)
        schreiben(wg.DATEI, neu, lambda x: (MARKE in x) == (ende_epoch is not None), theme)
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
    g = start_gesperrt()
    if g:
        print(g); return 2
    ende = dt.datetime.fromisoformat(ende_iso.replace('Z', '+00:00'))
    if os.path.exists(ZUSTAND) and json.load(open(ZUSTAND)).get('aktiv'):
        print('Aktion läuft schon:', json.load(open(ZUSTAND))); return 1
    try:
        theme = wg.live_theme()   # die Aktion ist für die Kundschaft → Live-Theme, einmal je Lauf; fail-closed (RuntimeError)
        # ZUERST beide Dateien prüfen (nur lesen), erst dann den Rabatt anlegen — sonst bliebe ein Rabatt ohne Leiste/Drawer zurück
        alt, _ = leiste_neu(datei(LEISTE, theme), text)
        snippet_neu(datei(wg.DATEI, theme), int(ende.timestamp()))
    except (RuntimeError, KeyError, StopIteration, ValueError) as e:
        print(f'FEHLER vor dem Anlegen: {type(e).__name__}: {str(e)[:160]} — nichts angelegt, nichts geschrieben'); return 1
    rid = rabatt(ende_iso)
    z = {'aktiv': True, 'ende': ende_iso, 'rabatt': rid, 'leiste_alt': alt, 'leiste_neu': text, 'theme': theme}
    if SCHARF:   # Zustand VOR den Theme-Schreibungen: scheitert eine, stellt --aufraeumen trotzdem zurück
        json.dump(z, open(ZUSTAND, 'w'), ensure_ascii=False, indent=1)
    leiste_setzen(text, theme)
    snippet_zeit(int(ende.timestamp()), theme)
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
    theme = z.get('theme') or ALT_THEME   # aufräumen, wo die Aktion lief — nie ins heutige Live-Theme «mitwandern»
    leiste_setzen(z['leiste_alt'], theme)
    snippet_zeit(None, theme)
    if SCHARF:
        z['aktiv'] = False; z['aufgeraeumt'] = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
        json.dump(z, open(ZUSTAND, 'w'), ensure_ascii=False, indent=1)
    print(f"ABENDAKTION beendet {'(zurückgestellt)' if SCHARF else '(TROCKEN)'} in {theme}: Leiste wieder «{z['leiste_alt'][:50]}…»")
    return 0


def selbsttest():
    """Ohne Netz: --start gesperrt (und fragt dabei nichts ab), --start bei aufgehobener Sperre in der richtigen Reihenfolge (Attrappen),
    --aufraeumen nur im Theme der Aktion, Zeitbedingung rein, Import ohne Abfrage."""
    import contextlib
    import io
    import tempfile
    import main_theme
    global ZUSTAND, gql, datei, SCHARF
    f, n = [], 0

    def pruefe(ok, was):
        nonlocal n
        n += 1
        if not ok:
            f.append(was)

    def boom(*a, **k):
        raise AssertionError('Abfrage im Selbsttest')

    alt = (ZUSTAND, gql, datei, wg.live_theme, SCHARF)
    gelesen = []
    try:
        gql, wg.live_theme, SCHARF = boom, boom, False   # auch mit SCHARF=1 im Umfeld: hier wird nie geschrieben
        pruefe(start_gesperrt() is not None and wg.TARIF_RP == 5000, 'start nicht gesperrt bei Anker 4500 / Tarif 5000')
        with contextlib.redirect_stdout(io.StringIO()):
            rc = start('2099-01-01T00:00:00Z', 'x')   # darf nichts abfragen (boom) und nichts anlegen
        pruefe(rc == 2, f'start rc {rc} ≠ 2')
        with tempfile.TemporaryDirectory() as d:
            ZUSTAND = os.path.join(d, 'z.json')
            pruefe(aufraeumen() == 0, 'aufraeumen ohne Zustand')
            json.dump({'aktiv': False}, open(ZUSTAND, 'w'))
            pruefe(aufraeumen() == 0, 'aufraeumen mit inaktivem Zustand')
            leiste = '{"sections":{"a":{"type":"header-announcements","blocks":{"%s":{"settings":{"text":"AKTION"}},' \
                     '"ls_announce_bw":{"settings":{"text":"BW"}}}}}}' % BLOCK_ID
            datei = lambda name, theme: gelesen.append(theme) or (leiste if name == LEISTE else wg.BLOCK)  # noqa: E731
            for zust, soll in (({}, ALT_THEME), ({'theme': 'gid://shopify/OnlineStoreTheme/7'}, 'gid://shopify/OnlineStoreTheme/7')):
                gelesen.clear()
                json.dump({'aktiv': True, 'ende': '2026-10-06T21:59:00Z', 'leiste_alt': 'ALT', **zust}, open(ZUSTAND, 'w'))
                with contextlib.redirect_stdout(io.StringIO()):
                    rc = aufraeumen()
                pruefe(rc == 0 and gelesen and set(gelesen) == {soll}, f'aufraeumen las in {set(gelesen)} statt {soll}')
    finally:
        ZUSTAND, gql, datei, wg.live_theme, SCHARF = alt
    # Zeitbedingung (rein): heutiger Soll-Block trägt den alten Anker nicht → ablehnen; alter Block: setzen und rückstandslos entfernen
    try:
        snippet_neu(wg.BLOCK, 4102444800)
        pruefe(False, 'snippet_neu setzt die Aktion in den heutigen Block (Anker 4500 dort nicht vorhanden)')
    except RuntimeError:
        pruefe(True, '')
    import warenkorb_einig
    alt_block = warenkorb_einig.BLOCK_0610   # die Fassung, für die die Aktion gebaut wurde (beide Anker)
    mit = snippet_neu(alt_block, 4102444800)
    pruefe(MARKE in mit and 'or lux_aktion -%}' in mit and snippet_neu(mit, None) == alt_block, 'Zeitbedingung setzen/entfernen nicht rückstandslos')
    _, neu = leiste_neu('{"sections":{"a":{"type":"header-announcements","blocks":{"%s":{"settings":{"text":"A"}},"ls_announce_bw":'
                        '{"settings":{"text":"BW"}}}}}}' % BLOCK_ID, 'NEU')
    pruefe('"NEU"' in neu and '"BW"' in neu, 'leiste_neu verliert andere Blöcke')
    ok, m = main_theme.import_ohne_netz('abendaktion', pfad=HIER + os.pathsep + main_theme.HIER)
    pruefe(ok, f'Import fragt ab: {m}')
    # --start mit AUFGEHOBENER Sperre (Attrappen, ohne Netz; der Rabatt und jede Theme-Schreibung werden nur protokolliert):
    # Reihenfolge lesen → Rabatt → Zustand samt Theme → schreiben, Ziel = Live-Theme, ls_announce_bw bleibt; fehlt ein Anker → nichts angelegt.
    import theme_attrappe as ta
    g, T = globals(), 'gid://shopify/OnlineStoreTheme/0'
    for name, snippet, soll_rc in (('Anker da (Block 06.10.)', alt_block, 0), ('Anker fehlt (heutiger Block)', wg.BLOCK, 1)):
        reihe = []
        with tempfile.TemporaryDirectory() as d:
            zpfad = os.path.join(d, 'z.json')

            def les(name_, theme):
                reihe.append(('lesen', name_, theme))
                return leiste if name_ == LEISTE else snippet

            def schr(name_, inhalt, pruef, theme):
                z = json.load(open(zpfad)) if os.path.exists(zpfad) else {}
                reihe.append(('schreiben', name_, theme, z.get('aktiv') is True and z.get('theme') == theme, inhalt))

            def rab(ende_iso):
                reihe.append(('rabatt', ende_iso))
                return 'gid://shopify/DiscountAutomaticNode/0', 'SCHEDULED'
            with ta.ohne_netz(), ta.ersetzt((g, 'gql', boom), (g, 'datei', les), (g, 'schreiben', schr), (g, 'rabatt', rab),
                                            (g, 'start_gesperrt', lambda: None), (g, 'SCHARF', True), (g, 'ZUSTAND', zpfad),
                                            (g, 'SICHERUNG', d), (wg, 'live_theme', lambda: T)):
                rc, letzte, _ = ta.lauf(start, '2099-01-01T00:00:00Z', 'NEU')
            z = json.load(open(zpfad)) if os.path.exists(zpfad) else None
        art = [r[0] for r in reihe]
        if soll_rc:
            pruefe(rc == 1 and 'nichts angelegt' in letzte and 'rabatt' not in art and 'schreiben' not in art and z is None,
                   f'start «{name}»: rc {rc}, {art}, Zustand {z}, «{letzte[:120]}»')
            continue
        schreib = [r for r in reihe if r[0] == 'schreiben']
        ok = (rc == 0 and art[:3] == ['lesen', 'lesen', 'rabatt'] and len(schreib) == 2 and all(r[3] for r in schreib)
              and {r[2] for r in reihe if r[0] != 'rabatt'} == {T} and z and z.get('theme') == T and z.get('aktiv') is True
              and z.get('rabatt') == ['gid://shopify/DiscountAutomaticNode/0', 'SCHEDULED']
              and '"NEU"' in schreib[0][4] and '"BW"' in schreib[0][4] and MARKE in schreib[1][4])
        pruefe(ok, f'start «{name}»: rc {rc}, Reihe {[r[:4] for r in reihe]}, Zustand {z}')
    print(f"SELBSTTEST abendaktion: {'OK' if not f else 'FEHLER'} ({n - len(f)}/{n})" + ('' if not f else ' — ' + ' · '.join(f)))
    return 1 if f else 0


if __name__ == '__main__':
    a = sys.argv
    if '--selbsttest' in a:
        sys.exit(selbsttest())
    if '--start' in a:
        t = a[a.index('--text') + 1] if '--text' in a else '🚚 Nur heute bis 24 Uhr: Gratisversand auf alles – ohne Mindestbetrag'
        sys.exit(start(a[a.index('--start') + 1], t))
    sys.exit(aufraeumen())
