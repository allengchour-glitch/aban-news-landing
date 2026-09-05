#!/usr/bin/env python3
"""Sie→du in Produkttexten — deterministisch, aus EINER Regelquelle.

BEFUND (03./04.09.2026): Der ganze Shop duzt, 1'170 aktive Produkttexte siezen
(«Entdecken Sie …», «Erleben Sie …»). Die Texte stammen aus dem alten Groq-Prompt.

WARUM DETERMINISTISCH UND NICHT PER MODELL: Der Versuch an den Kollektionstexten
(03.09.) hat gezeigt, dass gpt-oss aus dem Imperativ eine FRAGE macht («Entdeckst du
unsere Kollektion»), Elemente abschneidet und Dritte-Person-Saetze falsch dreht. Die
Regeln stehen deshalb EINMAL in kollektionstexte_du_form.um() — dieselbe Quelle, die
an 75 Kollektionstexten gelesen und nachgebessert wurde. Kein zweiter Regelsatz.

⚠️ DRITTE PERSON IST KEINE ANREDE. «Sie hat ein rundes Zifferblatt» meint die UHR.
Die Umstellung fasst nur Verb+Sie-Formen und grossgeschriebene Ihr-Formen an; die
Nachpruefung verlangt deshalb NICHT null «Sie», sondern null ANREDE-Formen.

⚠️ Nur TEXTKNOTEN werden umgestellt, nie Tags oder Attribute.

BENUTZUNG:  LISTE=dropship/_klassen/sie-anrede-im-produkttext.txt CAP=40 python3 automation/produkttexte_du_form.py
            → schreibt /tmp/produkt_du.json + .txt zum LESEN, aendert nichts
            WRITE=1 …                → schreibt die geprueften Faelle (LIVE-Vergleich vorher)
"""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shop_gql import gql
from kollektionstexte_du_form import um

LISTE = os.environ.get('LISTE', 'dropship/_klassen/sie-anrede-im-produkttext.txt')
CAP   = int(os.environ.get('CAP', '40'))
WRITE = os.environ.get('WRITE') == '1'
ZIEL  = os.environ.get('ZIEL', '/tmp/produkt_du.json')
LEDGER = 'dropship/_produkttexte_du_form.txt'
# ⚠️ 05.09.2026: RUECKWEG INS REPO, nicht nach /tmp. Der Aufseher laesst diesen
# Massen-Textschreiber ausdruecklich nur deshalb automatisch laufen, weil «jeder
# geschriebene Text VORHER gesichert wird» — gesichert war er aber nur in der
# Arbeitsdatei unter /tmp, und die ueberlebt weder einen Wipe noch den naechsten
# Sammellauf, der sie ueberschreibt. Eine Sicherung, die vor dem naechsten eigenen
# Lauf verschwindet, ist keine. Der alte Text steht jetzt Zeile fuer Zeile im Repo;
# bei 1'170 Produkten in dieser Klasse bleibt die Datei im einstelligen MB-Bereich.
ALT_SICHERUNG = 'dropship/_produkttexte_du_form_alt.jsonl'

# ⚠️ 04.09.2026, aus der Lektuere der ersten 11 Diffs: Die Regeln der KOLLEKTIONStexte
# uebertragen sich NICHT eins zu eins auf Produkttexte. Gefunden wurden zwei Klassen, die
# eine schwache Nachpruefung durchgelassen haette:
#   (1) HALBE Umstellung — «benoetigst du keine Steckdose und koennen sie einsetzen»,
#       «Geniesse …, wo immer Sie sind», «falls Sie bereits verfuegen», «Sie koennen».
#       Kollektionstexte sind formelhaft, Produkttexte haben Nebensaetze.
#   (2) DRITTE PERSON — «Ihr spezielles Doppelform-Design» meint die PRESSE, nicht die
#       Kundin; daraus wird «dein Doppelform-Design», grammatisch sauber und inhaltlich
#       falsch. Kein Nachcheck der Welt sieht das im Ergebnis.
# Deshalb ist die Annahme HART: Ein Text wird nur uebernommen, wenn er im Original gar
# keine Ihr-Form traegt (Klasse 2 ausgeschlossen) und danach KEINE Sie-/Ihr-Form mehr
# uebrig ist (Klasse 1 ausgeschlossen). Alles andere bleibt liegen — ein halb umgestellter
# Text ist schlimmer als ein siezender.
ANREDE = re.compile(r'(?<![\wäöüß])(?:Sie|Ihre[nmrs]?|Ihr|Ihnen)(?![\wäöüß])')
IMPERATIV_SIE = re.compile(r'(?<![\wäöüß])(?:Entdecken|Erleben|Geniessen|Genießen|Sichern|'
                           r'Bestellen|Profitieren|Verwöhnen|Nutzen|Holen|Lassen)\s+Sie(?![\wäöüß])')
FRAGE = re.compile(r'\b(Entdeckst|Erlebst|Geniesst|Profitierst|Sicherst|Bestellst|Nutzt|Holst)\s+du\b')
TEXTKNOTEN = re.compile(r'>([^<]+)<')


def umstellen(html):
    """um() nur auf Textknoten anwenden — Tags und Attribute bleiben unberuehrt."""
    def eins(m):
        roh = m.group(1)
        if not roh.strip():
            return m.group(0)
        return '>' + um(roh) + '<'
    # Fuehrender Text vor dem ersten Tag wird von TEXTKNOTEN nicht erfasst → getrennt
    kopf = ''
    rest = html
    i = html.find('<')
    if i > 0:
        kopf, rest = um(html[:i]), html[i:]
    return kopf + TEXTKNOTEN.sub(eins, rest)


def pruefen(alt, neu):
    """Gibt eine Liste von Beanstandungen zurueck. Leer = sauber."""
    schlecht = []
    sicht_a = re.sub(r'<[^>]+>', ' ', alt)
    sicht_n = re.sub(r'<[^>]+>', ' ', neu)
    if neu == alt:
        schlecht.append('unveraendert')
    if IMPERATIV_SIE.search(sicht_n):
        schlecht.append('imperativ-sie-rest')
    m = ANREDE.search(sicht_n)
    if m:
        a = max(0, m.start() - 40)
        schlecht.append('anrede-rest: …%s…' % re.sub(r'\s+', ' ', sicht_n[a:m.end() + 25]).strip())
    if re.search(r'(?<![\wäöüß])Ihr(e[nmrs]?)?(?![\wäöüß])', sicht_a):
        schlecht.append('Ihr-Form im Original — dritte Person nicht ausschliessbar')
    if FRAGE.search(sicht_n):
        schlecht.append('frage-statt-imperativ: ' + FRAGE.search(sicht_n).group(0))
    if len(sicht_n) < len(sicht_a) * 0.85:
        schlecht.append('zu kurz (%d%%)' % (100 * len(sicht_n) // max(1, len(sicht_a))))
    if alt.count('<li>') != neu.count('<li>') or alt.count('<p>') != neu.count('<p>'):
        schlecht.append('struktur veraendert')
    if re.findall(r'href="[^"]+"', alt) != re.findall(r'href="[^"]+"', neu):
        schlecht.append('link veraendert')
    if re.findall(r'\d+[.,]?\d*', sicht_a) != re.findall(r'\d+[.,]?\d*', sicht_n):
        schlecht.append('zahl veraendert')
    if 'ß' in neu:
        schlecht.append('ß (CH schreibt ss)')
    return schlecht


Q = 'query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title status descriptionHtml}}}'
M = 'mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message} product{id}}}'


def schreiben():
    faelle = json.load(open(ZIEL))
    led = open(LEDGER, 'a')
    ok = fehl = 0
    for f in faelle:
        if f['befund']:
            continue
        lr = gql('query($i:ID!){product(id:$i){descriptionHtml}}', {'i': f['id']})
        live = (((lr.get('data') or {}).get('product') or {}).get('descriptionHtml')) or ''
        if live != f['alt']:
            print('⚠ live geaendert — uebersprungen:', f['titel'][:50]); fehl += 1; continue
        # Erst sichern, dann schreiben — nie umgekehrt (sonst fehlt genau der Text, den
        # man zurueckholen will, wenn die Mutation zwar durchgeht, das Ergebnis aber falsch ist).
        with open(ALT_SICHERUNG, 'a') as sic:
            sic.write(json.dumps({'id': f['id'], 'titel': f['titel'], 'alt': live},
                                 ensure_ascii=False) + '\n')
            sic.flush()
        r = gql(M, {'i': {'id': f['id'], 'descriptionHtml': f['neu']}})
        ue = ((r.get('data') or {}).get('productUpdate') or {}).get('userErrors') or []
        if ue:
            print('⛔', f['titel'][:40], ue); fehl += 1; continue
        # ⚠️ 05.09.2026: Ohne diese Zeile wird auch quittiert, wenn die Antwort gar kein `data`
        # trug (tote Anmeldung) — `userErrors` ist dann None und damit falsy.
        if r.get('errors') or (r.get('data') or {}).get('productUpdate') is None:
            print('⛔', f['titel'][:40], '— keine Bestaetigung, NICHT quittiert'); fehl += 1; continue
        led.write('%s\tdu-form\t%s\n' % (f['id'].split('/')[-1], f['titel'][:60]))
        led.flush(); ok += 1
        time.sleep(0.3)
    print(f'FERTIG: {ok} geschrieben, {fehl} nicht geschrieben')


def sammeln():
    hat = set()
    if os.path.exists(LEDGER):
        hat = {l.split('\t')[0] for l in open(LEDGER)}
    ids = [z.split('\t')[0].strip() for z in open(LISTE) if z.strip()]
    ids = [i for i in ids if i.isdigit() and i not in hat][:CAP]
    faelle = []
    for i in range(0, len(ids), 25):
        blk = ['gid://shopify/Product/%s' % x for x in ids[i:i + 25]]
        r = gql(Q, {'ids': blk})
        for p in ((r.get('data') or {}).get('nodes') or []):
            if not p or p.get('status') != 'ACTIVE':
                continue
            alt = p['descriptionHtml'] or ''
            neu = umstellen(alt)
            faelle.append({'id': p['id'], 'titel': p['title'], 'alt': alt, 'neu': neu,
                           'befund': pruefen(alt, neu)})
        time.sleep(0.3)
    json.dump(faelle, open(ZIEL, 'w'), ensure_ascii=False, indent=1)
    sauber = [f for f in faelle if not f['befund']]
    with open(ZIEL.replace('.json', '.txt'), 'w') as d:
        for f in faelle:
            d.write('=' * 90 + '\n%s  %s\n' % (f['id'].split('/')[-1], f['titel']))
            if f['befund']:
                d.write('  BEFUND: %s\n' % '; '.join(f['befund']))
            a = re.sub(r'<[^>]+>', ' ', f['alt']).split('Sorglos shoppen')[0]
            n = re.sub(r'<[^>]+>', ' ', f['neu']).split('Sorglos shoppen')[0]
            d.write('  ALT: %s\n  NEU: %s\n' % (re.sub(r'\s+', ' ', a).strip()[:900],
                                                re.sub(r'\s+', ' ', n).strip()[:900]))
    print(f'{len(faelle)} geprueft · {len(sauber)} sauber · {len(faelle)-len(sauber)} mit Befund')
    print(f'Zum LESEN: {ZIEL.replace(".json",".txt")}  — danach WRITE=1')


if __name__ == '__main__':
    schreiben() if WRITE else sammeln()
