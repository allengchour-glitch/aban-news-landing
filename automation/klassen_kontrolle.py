#!/usr/bin/env python3
"""klassen_kontrolle.py — taegliche SELBSTKONTROLLE: zaehlt die bekannten Falschaussage-Klassen
AM OBJEKT, nicht ueber die Shopify-Suche.

WARUM ES DIESES WERKZEUG BRAUCHT (Betreiber 03.09.2026: «selbstkontrolle und immer check»):
Dreimal an einem Tag stand hier eine Meldung «Klasse auf 0» — und dreimal war sie falsch,
jedes Mal aus demselben Grund: gemessen wurde mit dem Werkzeug, mit dem auch repariert wurde.
  · 01.09. «alle drei Klassen auf 0»  → 167 USA-Bloecke ueberlebten (andere Wortstellung)
  · 02.09. «513 geschrieben, 0 uebrig» → 983 ueberlebten; das <strong> zwischen «USA:» und
    der Zahl zerschneidet die PHRASE im Shopify-Index, die Phrasensuche findet sie nie
  · 03.09. C7 «4'559 Treffer»          → 1'743, der Rest war der KLASSENNAME im HTML
Die Lehre in einem Satz: **eine Klassenzahl gilt nur fuer die Form, mit der man gesucht hat.**
Deshalb liest dieser Waechter den VOLLEN Katalog live und wendet tag-tolerante Muster auf den
rohen descriptionHtml an. Er ist absichtlich langsam und absichtlich dumm — er sucht nicht
clever, er sieht alles.

Er MELDET NUR. Repariert wird von den jeweiligen Fachwerkzeugen, und die Muster kommen — wo
immer moeglich — aus genau diesen Werkzeugen (EINE Regelquelle, Lehre 29.08. Klingenregel).

  DRY=1     nur zaehlen, keinen Bericht schreiben
  CAP=N     nach N Produkten abbrechen (fuer einen schnellen Blick)
Bericht: dropship/KLASSEN-KONTROLLE.md   ·   ohne Befund wird er GELOESCHT (Lehre 21.08.)
"""
import ast, json, os, re, ssl, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
BERICHT = os.path.join(REPO, 'dropship', 'KLASSEN-KONTROLLE.md')
CAP = int(os.environ.get('CAP', '0')) or None
DRY = os.environ.get('DRY') == '1'
SHOP = 'au3j0y-hq.myshopify.com'
API = f'https://{SHOP}/admin/api/2024-10/graphql.json'
CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt') if os.path.exists('/root/.ccr/ca-bundle.crt') else None


def _muster(datei, name, ersatz):
    """Holt EIN kompiliertes Muster aus einem Fachwerkzeug, OHNE es auszufuehren.

    ⚠️ Der erste Entwurf hat die Datei per importlib geladen — und damit
    `wearable_messversprechen` GESTARTET («Quelle live gebaut … FERTIG»). Diese Werkzeuge
    sind Skripte, nicht Bibliotheken; mehrere haben keine `__main__`-Wache. Ein Melder, der
    beim Laden einen fremden SCHREIBER startet, ist eine gestellte Falle — hier wird deshalb
    nur der Ausdruck der Zuweisung ausgewertet, nichts sonst. So bleibt es EINE Regelquelle
    (Lehre 29.08. Klingenregel), ohne fremden Code laufen zu lassen.
    """
    p = os.path.join(HIER, datei)
    try:
        baum = ast.parse(open(p, encoding='utf-8').read())
        for k in baum.body:
            if isinstance(k, ast.Assign) and any(
                    isinstance(z, ast.Name) and z.id == name for z in k.targets):
                # nur re.compile(...) mit Literalen wird ausgewertet — sonst Ersatz
                return eval(compile(ast.Expression(k.value), p, 'eval'), {'re': re})
    except Exception as e:
        sys.stderr.write(f'⚠️ {datei}:{name} nicht lesbar ({e}) — Ersatzmuster.\n')
    return ersatz


# ── Klassen ───────────────────────────────────────────────────────────────────
# tag-tolerant: zwischen dem Wort und der Zahl darf beliebiges Markup stehen. Genau
# daran ist die Phrasensuche gescheitert.
TAGS = r'(?:<[^>]+>\s*)*'
USA_RE = re.compile(r'USA:?\s*' + TAGS + r'\d{1,2}\s*[–\-]\s*\d{1,2}\s*Tage', re.I)
EU_RE = re.compile(r'🇪🇺|(?<![\wäöüß])EU:?\s*' + TAGS + r'\d{1,2}\s*[–\-]\s*\d{1,2}\s*Tage')
QUALITAET_RE = re.compile(r'Geprüfte\s*' + TAGS + r'(?:Marken)?[Qq]ualität')
SCHWELLE65_RE = re.compile(r'(?:Gratis|Kostenlos)[^<]{0,30}(?:Versand|Lieferung)[^<]{0,20}ab\s*' + TAGS + r'CHF\s*(?:65|60)\b', re.I)
DETAILS2_RE = re.compile(r'<h4[^>]*>\s*Produktdetails\s*</h4>')
SIE_RE = re.compile(r'(?<![\wäöüß])(?:Entdecken|Erleben|Geniessen|Sichern|Bestellen|Profitieren)\s+Sie(?![\wäöüß])')
FLOSKEL_RE = re.compile(r'Material:\s*' + TAGS + r'hochwertiges Material', re.I)

# Wirkversprechen im TITEL — dieselbe Familie wie hype_kuratieren.WIRKVERSPRECHEN, hier
# bewusst eng: nur Wachstum und «gegen <Befund>», beides sind Heilaussagen.
TITEL_WIRK_RE = re.compile(
    r'(?:wimpern|haar|bart|augenbrauen|nagel)wachstum|wachstums(?:serum|öl|oel)|'
    r'gegen\s+(?:pigmentflecken|falten|akne|cellulite|haarausfall|schuppen)|'
    r'\bfacelift\b|dauerhafte\s+haarentfernung', re.I)

MESS_RE = _muster('wearable_messversprechen.py', 'KRITISCH',
                  re.compile(r'blutdruck|blutzucker|glukose|\bEKG\b', re.I))
TRAEGER_RE = _muster('wearable_messversprechen.py', 'TRAEGER',
                     re.compile(r'smartwatch|armband|[\wäöüß]*(?:uhr|watch)(?![\wäöüß])', re.I))

KLASSEN = [
    ('USA-Lieferzusage im Text', 'text',
     'Der Shop liefert NUR in die Schweiz — eine USA-Zusage ist unerfuellbar (Lehre 14.08.).',
     'automation/versandaussagen_wahrheit.py  (QUELLE=live IGNORIERE_LEDGER=1)',
     lambda t, h, tg, vc: bool(USA_RE.search(h))),
    ('EU-Lieferzusage im Text', 'text',
     'Gleiche Klasse wie USA: es gibt genau EINEN aktiven Markt (Schweiz).',
     'automation/versandaussagen_wahrheit.py',
     lambda t, h, tg, vc: bool(EU_RE.search(h))),
    ('«Geprüfte Qualität» (Überzusage)', 'text',
     'Geprueft werden ANGABEN, nicht die Ware (Lehre 29.08.). Steht im JSON-LD und im Google-Feed.',
     'automation/trust_baustein_wahrheit.py',
     lambda t, h, tg, vc: bool(QUALITAET_RE.search(h))),
    ('Gratis-Versand ab CHF 65/60', 'text',
     'Wirksam ist die 49er-Automatik, beworben wird 50. 65 ist die Altschwelle (Lehre 11.08.).',
     'von Hand — exakte Ersetzung, kein Massenlauf noetig',
     lambda t, h, tg, vc: bool(SCHWELLE65_RE.search(h))),
    ('«Produktdetails» doppelt', 'text',
     'Zwei Faktenbloecke mit widersprechendem Inhalt (Lehre 12.08.).',
     'automation/produktdetails_vereinen.py',
     lambda t, h, tg, vc: len(DETAILS2_RE.findall(h)) > 1),
    ('Floskel «hochwertiges Material»', 'text',
     'Werbewort in einem Faktenfeld — ein leeres Feld ist besser (Lehre 23.08.).',
     'automation/produktdetails_wahrheit.py  (IGNORIERE_LEDGER=1)',
     lambda t, h, tg, vc: bool(FLOSKEL_RE.search(h))),
    ('Sie-Anrede im Produkttext', 'text',
     'Der ganze Shop duzt. Offene Klasse (03.09.), Massenlauf ist eine eigene Entscheidung.',
     'offen — chargenweise, Diffs lesen',
     lambda t, h, tg, vc: bool(SIE_RE.search(h))),
    ('Wirkversprechen im TITEL', 'titel',
     'Wachstums- und Gegen-Befund-Zusagen sind Heilaussagen (Lehre 29.08./03.09.).',
     'von Hand: Titel · Handle+301 · SEO · Text · Alt-Text',
     lambda t, h, tg, vc: bool(TITEL_WIRK_RE.search(t))),
    ('Mess-Versprechen an Wearables', 'beides',
     'Kein optisches Armband misst Blutdruck, EKG oder Blutzucker (Lehre 11.08.).',
     'automation/wearable_messversprechen.py  (QUELLE=live)',
     lambda t, h, tg, vc: bool(TRAEGER_RE.search(t)) and bool(MESS_RE.search(t + ' ' + h))),
    ('Auswahl-Versprechen bei EINER Variante', 'text',
     'Der Text beschreibt das CJ-Listing, nicht was wir verkaufen (Lehre 27.08.).',
     'automation/wahlversprechen.py  (meldet; FIX=1 nur fuer eindeutige Faelle)',
     lambda t, h, tg, vc: vc == 1 and bool(re.search(
         r'erhältlich in (?:den )?(?:versch|verschiedenen|mehreren|\d|zwei|drei|vier|fünf)', h, re.I))),
]


def token():
    return open('/tmp/cj_shop_token.txt').read().strip()


def gql(q, v=None, versuche=8):
    for i in range(versuche):
        try:
            req = urllib.request.Request(API, data=json.dumps({'query': q, 'variables': v or {}}).encode(),
                                         headers={'X-Shopify-Access-Token': token(),
                                                  'Content-Type': 'application/json'})
            r = json.loads(urllib.request.urlopen(req, timeout=90, context=CTX).read())
        except Exception:
            time.sleep(2 * (i + 1)); continue
        errs = r.get('errors') or []
        if any('Throttled' in str(e.get('message', '')) for e in errs):
            ts = (r.get('extensions') or {}).get('cost', {}).get('throttleStatus', {})
            need = max(1.0, (ts.get('requestedQueryCost', 120) - ts.get('currentlyAvailable', 0))
                       / max(1, ts.get('restoreRate', 100)))
            time.sleep(min(30, need + 0.5)); continue
        if errs:
            sys.stderr.write(f'GQL-Fehler: {errs[:1]}\n'); return None
        return r.get('data')
    return None


Q = """query($c:String){ products(first:100, after:$c, query:"status:active"){
        pageInfo{ hasNextPage endCursor }
        nodes{ id title descriptionHtml variantsCount{count} } } }"""


def main():
    treffer = {k[0]: [] for k in KLASSEN}
    n = 0; cursor = None; seiten = 0; abbruch = False
    while True:
        d = gql(Q, {'c': cursor})
        if d is None:
            # Regel 6: keine Antwort ist kein Ergebnis. Ein Teilscan darf NIE als «0 uebrig»
            # gemeldet werden — genau so entstehen die Falschmeldungen, gegen die es hier geht.
            abbruch = True
            sys.stderr.write('⛔ Shopify blieb stumm — TEILSCAN, Zahlen sind Untergrenzen.\n')
            break
        pg = d['products']
        for p in pg['nodes']:
            n += 1
            t = p['title'] or ''
            h = p['descriptionHtml'] or ''
            vc = (p.get('variantsCount') or {}).get('count', 0)
            for name, _feld, _warum, _fix, pruef in KLASSEN:
                try:
                    if pruef(t, h, None, vc):
                        treffer[name].append((p['id'].split('/')[-1], t[:70]))
                except Exception:
                    pass
        seiten += 1
        # ⚠️ Ruecksicht auf die Waechter (gemessen 03.09.): Dieser Vollscan zieht den
        # Shopify-Eimer auf unter 10 herunter — waehrenddessen scheiterte `kollektion_leer`
        # an der Drosselung und meldete «Kollektionen nicht ladbar», also einen Fehlalarm,
        # den ICH erzeugt habe. Eine Selbstkontrolle, die die Kontrollierten aushungert,
        # misst am Ende sich selbst. Eine halbe Sekunde je Seite kostet den Lauf ~4 Minuten
        # und laesst den Eimer nachfuellen.
        time.sleep(0.5)
        if seiten % 25 == 0:
            print(f'  … {n} Produkte', flush=True)
        if CAP and n >= CAP:
            abbruch = True; break
        if not pg['pageInfo']['hasNextPage']:
            break
        cursor = pg['pageInfo']['endCursor']

    art = 'TEILSCAN' if abbruch else 'VOLLSCAN'
    print(f'{art}: {n} aktive Produkte geprüft')
    offen = [(k, v) for k, v in treffer.items() if v]
    for name, _f, _w, _fix, _p in KLASSEN:
        v = treffer[name]
        print(f'   {len(v):>6}  {name}')

    if DRY:
        return
    if not offen:
        if os.path.exists(BERICHT):
            os.remove(BERICHT)
        print('Keine Klasse offen — Bericht geloescht.')
        return

    zeilen = [f'# Klassen-Kontrolle ({art}, {n} aktive Produkte)', '',
              '> Gemessen AM OBJEKT mit tag-toleranten Mustern, nicht ueber die Shopify-Suche.',
              '> Eine Klassenzahl gilt nur fuer die Form, mit der man gesucht hat — deshalb dieser Lauf.',
              '']
    if abbruch:
        zeilen += ['⚠️ **TEILSCAN** — die Zahlen sind Untergrenzen, nicht die Klassengroesse.', '']
    for name, _feld, warum, fix, _p in KLASSEN:
        v = treffer[name]
        if not v:
            continue
        zeilen += [f'## {name} — {len(v)}', '', warum, '', f'Reparatur: `{fix}`', '']
        for pid, tit in v[:8]:
            zeilen.append(f'- `{pid}` {tit}')
        if len(v) > 8:
            zeilen.append(f'- … und {len(v) - 8} weitere')
        zeilen.append('')
    with open(BERICHT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(zeilen) + '\n')
    print(f'Bericht: {BERICHT}')


if __name__ == '__main__':
    main()
