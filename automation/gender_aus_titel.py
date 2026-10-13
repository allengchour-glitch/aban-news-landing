#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gender_aus_titel.py — Google-Feld `gender` aus dem TITEL korrigieren (14.08.2026)

BEFUND (dropship/FEHLERSUCHE-14-08.md):
  * 716 aktive Produkte tragen «Herren» oder «Damen» im Titel, im Metafeld
    mm-google-shopping.gender steht aber `unisex`.
  * 42 melden sogar das UMGEKEHRTE Geschlecht (35 Herrenartikel als female,
    7 Damenartikel als male).
  Alle stehen im Google-Kanal — dem einzigen Kanal mit belegten Klicks. Bei
  `unisex` fällt das Produkt aus den geschlechtsgefilterten Suchen heraus
  («Herrenschuhe»), bei einem umgekehrten Wert wird es aktiv der falschen
  Zielgruppe ausgespielt, was schlimmer ist als gar keine Angabe.

ZAHLEN AUS DEM PROBELAUF (Voll-Export vom 12.08., 31'500 aktive Produkte):
  4'548 aktive Produkte haben «herren»/«damen» im Titel.
  davon  3'778 gender stimmt bereits          → nicht angefasst
           656 gender=unisex, Titel eindeutig  → zu korrigieren
            41 gender UMGEKEHRT                → zu korrigieren
            32 gender-Feld fehlt ganz          → mitgesetzt (dieselbe Wahrheit)
            40 «Damen UND Herren» im Titel     → bewusst NICHT angefasst
  (Der Befund nennt 716/42; die Differenz sind Produkte, die zwischen
   Export-Schnappschuss und Lauf schon korrekt waren — deshalb wird jeder Fall
   VOR dem Schreiben live nachgelesen und nur bei echter Abweichung geschrieben.)

FEHLTREFFER AUS DEM PROBELAUF (deutsche Zusammensetzungen, Regel 3):
  * «Herrenlose, gerade geschnittene Lange Hose» (ID 15449471058305) —
    «herrenlos» heisst OHNE BESITZER, nicht «für Herren». Der erste Entwurf
    hätte diese Damenhose auf `male` gedreht. → Ausnahme AUSNAHME_RE.
  * «Damensonnenbrille», «Damenperlen My Imenso» standen live auf `male`,
    weil automation/gfeed_fill.py:23 nach 'mens' OHNE Wortgrenze sucht und
    «Da-MENS-onnenbrille» / «My I-MENS-o» das enthalten (dieselbe Falle wie
    «IPL» in «L-IPL-iner»). Dieses Skript sucht nur "herren"/"damen" — der
    Substring 'mens' wird nie benutzt.
  * Geprüft und HARMLOS: alle 336 seltenen Wortformen im Katalog
    («Damenblau», «Damenlacke», «Herrenhalsband», «Haremsdamenkostüm»,
    «Herren-Haar- & Augenbrauenfärbe») sind echte Geschlechtsangaben.
    Es gibt im Katalog kein «Scheren-/Röhren-»-Wort, das «herren» enthält.

ENTSCHEIDUNGEN:
  * «Damen- und Herren»-Artikel (40 Stück) bleiben unangetastet — sie sind
    unisex; der Auftrag sagt ausdrücklich, dass sie bleiben. Auch die, die
    heute male/female tragen, werden NICHT gedreht (ausserhalb des Auftrags).
  * Es wird ausschliesslich das Metafeld geschrieben. Titel, Tags, Status und
    Kanalzugehörigkeit bleiben unberührt. Nichts wird gelöscht (Regel 2).
  * Ledger wird nach JEDER Zeile geflusht (Regel 5) und nur bei einer echten
    API-Antwort geschrieben (Regel 6) — ein Timeout lässt den Fall offen.

QUELLE MITREPARIERT (Regel 7) — sonst entsteht der Fehler täglich neu:
  * automation/cj_category_fill.mjs — leitete gender NUR aus den Tags ab und
    prüfte 'damen' vor 'herren'; ein falscher Tag `damen` an einem Herren-
    artikel gewann. Liest jetzt zuerst den Titel (mit denselben Regeln wie
    hier) und fällt erst danach auf die Tags zurück.
  * automation/gfeed_fill.py — 'mens' ohne Wortgrenze entfernt, Titel-Vorrang
    und «Damen und Herren» → unisex eingebaut.

AUFRUF:  python3 automation/gender_aus_titel.py --dry      (zeigt nur)
         python3 automation/gender_aus_titel.py            (schreibt)
         python3 automation/gender_aus_titel.py --unisex [--dry]   (nur Titel mit «Unisex», live gesucht)
         python3 automation/gender_aus_titel.py --pruefen  (Wächter: zählt nur, schreibt nichts, Exit 1 bei Befund)

NACHTRAG 13.10.2026 (Kauf-Strecke Klasse 5, dropship/KAUFSTRECKE-SEITEN-2026-10-13.md): 50 von 168 Produkten mit «Unisex»
im Titel standen auf `female` (Editor-Shirt «Unisex T-Shirt» → Google-Geschlecht weiblich, Brotkrumen «Damen»). Regel jetzt:
\bunisex\b im Titel → `unisex` (geht vor Herren/Damen). Schreibt mit Altwert ins Ledger dropship/_gender_aus_titel_alt.tsv
(Rückweg), lässt Werbetest-Sperre und Aurora aus. --pruefen meldet «GENDER-TITEL: n Unisex-Titel ≠ unisex · m Herren-Titel
auf female» — läuft täglich (Aufseher), erfasst damit auch Neuimporte.
"""
import json, os, re, subprocess, sys, time

SHOP = 'au3j0y-hq.myshopify.com'
URL = f'https://{SHOP}/admin/api/2026-01/graphql.json'
TOK = open('/tmp/cj_shop_token.txt').read().strip()
NS, KEY = 'mm-google-shopping', 'gender'
LEDGER = os.path.join(os.path.dirname(__file__), '..', 'dropship', '_gender_aus_titel.txt')
EXPORT = '/tmp/export.jsonl'
DRY = '--dry' in sys.argv

# «herrenlos» = ohne Besitzer. Einzige im Katalog belegte Zusammensetzung, in
# der «herren» kein Geschlecht meint. Vor der Suche herausgeschnitten.
AUSNAHME_RE = re.compile(r'herrenlos', re.I)
HERREN_RE = re.compile(r'herren', re.I)
DAMEN_RE = re.compile(r'damen', re.I)
UNISEX_RE = re.compile(r'\bunisex\b', re.I)


def geschlecht_aus_titel(titel):
    """male / female / None. None heisst: Titel sagt es nicht eindeutig."""
    t = AUSNAHME_RE.sub(' ', titel or '')
    h, d = bool(HERREN_RE.search(t)), bool(DAMEN_RE.search(t))
    if UNISEX_RE.search(t):
        return 'unisex'      # 13.10.2026: Titel sagt selbst unisex → Google-Feld unisex (vorher: nicht angefasst, 50× female)
    if h and d:
        return None          # «Damen- und Herren» → unisex, bleibt
    if h:
        return 'male'
    if d:
        return 'female'
    return None


def gql(query, variables=None, versuche=5):
    """Gibt nur bei einer ECHTEN Antwort data zurück, sonst None (Regel 6)."""
    body = json.dumps({'query': query, 'variables': variables or {}})
    for n in range(versuche):
        r = subprocess.run(['curl', '-s', '--max-time', '45', '-X', 'POST', URL,
                            '-H', 'X-Shopify-Access-Token: ' + TOK,
                            '-H', 'Content-Type: application/json',
                            '-d', body], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(2 + 2 * n)
            continue
        if d.get('data') is not None and not any(
                'hrottl' in str(e) for e in d.get('errors', [])):
            return d['data']
        time.sleep(3 + 3 * n)
    return None


def kandidaten_live(seit):
    """Kandidaten direkt aus dem Shop holen — für Ware, die JÜNGER ist als der
    Export-Schnappschuss. Genau das war nötig: zwei Tage nach dem Export standen
    bereits 162 neue Produkte mit falschem gender im Katalog, weil der Importer
    den Fehler bis zur Reparatur täglich weiter erzeugte."""
    q = ('query($c:String){products(first:100,after:$c,query:"status:active '
         'created_at:>=%s"){pageInfo{hasNextPage endCursor}nodes{id title '
         'm:metafield(namespace:"%s",key:"%s"){value}}}}' % (seit, NS, KEY))
    ids, c = [], None
    while True:
        d = gql(q, {'c': c})
        if d is None:
            print('  ! Live-Suche ohne Antwort — Rest bleibt offen')
            break
        p = d['products']
        for n in p['nodes']:
            soll = geschlecht_aus_titel(n['title'])
            if soll and (n.get('m') or {}).get('value') != soll:
                ids.append(n['id'])
        if not p['pageInfo']['hasNextPage']:
            break
        c = p['pageInfo']['endCursor']
    return ids


AUSNAHMEN = {'gid://shopify/Product/15422934647169'}     # Aurora = Google-Ads-Testprodukt
ALT_LEDGER = os.path.join(os.path.dirname(__file__), '..', 'dropship', '_gender_aus_titel_alt.tsv')


def live_suche(suche):
    """[(id, titel, ist, soll)] aller aktiven Produkte zur Shopify-Suche, deren Titel-Geschlecht vom Metafeld abweicht."""
    q = ('query($c:String,$q:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor}nodes{id title '
         'm:metafield(namespace:"%s",key:"%s"){value}}}}' % (NS, KEY))
    out, c = [], None
    while True:
        d = gql(q, {'c': c, 'q': 'status:active AND (%s)' % suche})
        if d is None:
            raise RuntimeError('Live-Suche ohne Antwort')
        p = d['products']
        for n in p['nodes']:
            soll = geschlecht_aus_titel(n['title'])
            ist = (n.get('m') or {}).get('value')
            out.append((n['id'], n['title'], ist, soll))
        if not p['pageInfo']['hasNextPage']:
            return out
        c = p['pageInfo']['endCursor']


def pruefen():
    """Wächter (13.10.2026): Unisex-Titel ohne unisex, Herren-Titel (ohne Damen/Unisex) auf female. Schreibt nichts."""
    try:
        uni = [x for x in live_suche('title:*unisex* OR title:*Unisex*') if x[3] == 'unisex' and x[2] != 'unisex']
        her = [x for x in live_suche('title:*Herren* OR title:*herren*') if x[3] == 'male' and x[2] == 'female']
    except Exception as e:  # noqa: BLE001
        print(f'⚠️ GENDER-TITEL: unklar ({type(e).__name__}: {str(e)[:80]})')
        return 1
    zeile = f'GENDER-TITEL: {len(uni)} Unisex-Titel ≠ unisex · {len(her)} Herren-Titel auf female'
    print(('⚠️ ' if uni or her else '') + zeile + (' → python3 automation/gender_aus_titel.py --unisex' if uni else ''))
    for x in (uni + her)[:10]:
        print(f'   {x[0].split("/")[-1]} {x[2]} → {x[3]} | {x[1][:60]}')
    return 1 if uni or her else 0


def kandidaten():
    """IDs aus dem Export vorauswählen — die Wahrheit kommt danach live."""
    ids = []
    if not os.path.exists(EXPORT):
        return ids
    for line in open(EXPORT):
        try:
            d = json.loads(line)
        except Exception:
            continue
        if d.get('status') != 'ACTIVE':
            continue
        soll = geschlecht_aus_titel(d.get('title') or '')
        if not soll:
            continue
        mf = {m['key']: m['value'] for m in (d.get('mf') or {}).get('nodes', [])}
        if mf.get(KEY) != soll:
            ids.append(d['id'])
    return ids


def main():
    if '--pruefen' in sys.argv:
        sys.exit(pruefen())
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = set(open(LEDGER).read().split())
    if '--unisex' in sys.argv:          # 13.10.2026: nur Unisex-Titel, live; Ledger-Sperre gilt hier nicht
        kand = [x[0] for x in live_suche('title:*unisex* OR title:*Unisex*') if x[3] == 'unisex' and x[2] != 'unisex']
        erledigt = set()
    else:
        kand = kandidaten()
    try:
        from werbetest_sperre import gesperrt
    except Exception:  # noqa: BLE001
        def gesperrt(_):
            return False
    kand = [i for i in kand if i not in AUSNAHMEN and not gesperrt(i)]
    seit = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--seit=')), None)
    if seit:
        kand += kandidaten_live(seit)
    offen = [i for i in dict.fromkeys(kand) if i not in erledigt]
    print(f'Kandidaten: {len(offen)} offen ({len(erledigt)} im Ledger)')

    led = None if DRY else open(LEDGER, 'a')
    geaendert = zaehler_stimmt = zaehler_weg = 0
    for i in range(0, len(offen), 40):
        gruppe = offen[i:i + 40]
        d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title status '
                'm:metafield(namespace:"%s",key:"%s"){value}}}}' % (NS, KEY),
                {'ids': gruppe})
        if d is None:
            print('  ! keine Antwort für diese Gruppe — bleibt offen')
            continue
        schreiben, protokoll = [], []
        for p in d.get('nodes', []):
            if not p:
                zaehler_weg += 1
                continue
            if p.get('status') != 'ACTIVE':
                zaehler_weg += 1
                continue
            soll = geschlecht_aus_titel(p['title'])       # LIVE-Titel, nicht Export
            ist = (p.get('m') or {}).get('value')
            if not soll or ist == soll:
                zaehler_stimmt += 1
                continue
            schreiben.append({'ownerId': p['id'], 'namespace': NS, 'key': KEY,
                              'type': 'single_line_text_field', 'value': soll})
            protokoll.append((p['id'], ist, soll, p['title']))
        if not schreiben:
            continue
        if DRY:
            for pid, ist, soll, t in protokoll:
                print(f'  [DRY] {pid.split("/")[-1]} {ist} -> {soll} | {t[:64]}')
            geaendert += len(schreiben)
            continue
        # metafieldsSet nimmt HÖCHSTENS 25 Felder pro Aufruf. Grössere Pakete
        # scheitern mit «Exceeded the maximum metafields input limit of 25»;
        # der erste scharfe Lauf verlor so 18 Gruppen (sie blieben dank
        # Regel 6 korrekt offen und wurden im zweiten Lauf nachgeholt).
        for j in range(0, len(schreiben), 25):
            teil, prot = schreiben[j:j + 25], protokoll[j:j + 25]
            r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
                    '{metafields{id} userErrors{field message}}}', {'m': teil})
            if r is None:
                print('  ! Schreiben ohne Antwort — Paket bleibt offen')
                continue
            fehler = r['metafieldsSet']['userErrors']
            if fehler:
                print('  ! userErrors:', fehler[:3])
                continue
            with open(ALT_LEDGER, 'a', encoding='utf-8') as alt_led:
                for pid, ist, soll, t in prot:
                    led.write(pid + '\n')
                    led.flush()                               # Regel 5
                    alt_led.write('\t'.join([time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()), pid, str(ist), soll,
                                              t.replace('\t', ' ')[:90]]) + '\n')   # 13.10.2026: Altwert = Rückweg
                    geaendert += 1
        print(f'  {geaendert} geschrieben … zuletzt {protokoll[-1][3][:50]}')
    if led:
        led.close()
    print(f'FERTIG: {geaendert} korrigiert | {zaehler_stimmt} stimmten live schon '
          f'| {zaehler_weg} nicht mehr aktiv/weg')


if __name__ == '__main__':
    main()
