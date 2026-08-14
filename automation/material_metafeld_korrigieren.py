#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Materialangaben im Google-Feed geradeziehen — mm-google-shopping.material
=========================================================================
BEFUND (dropship/FEHLERSUCHE-14-08.md, Abschnitte [material-metafeld]):

  A  181 aktive Produkte melden material="Leather"/"Leder", obwohl die eigene
     Beschreibung PU-, Kunst- oder Mikrofaserleder nennt. Feed sagt Leder,
     Zielseite sagt Kunstleder — der klassische Merchant-Center-Misrepresentation-
     Fall und in der Schweiz zusätzlich UWG-relevant («Leder» ist ein geschützter
     Begriff für tierisches Leder). Betroffen vor allem Kinder-/Babyschuhe und
     Taschen, also genau die Ware, für die man auf «Leder» einen Aufpreis zahlt.
  B  180 aktive Produkte tragen Extraktionsmüll statt eines Materialnamens:
     HTML-Reste («/li>»), bei 60 Zeichen abgeschnittene Fliesstext-Fragmente,
     angehängte CJ-Attributlabel («Polyester Style») und den Platzhalter
     «hochwertiges Material» — eine Werbeaussage in einem Faktenfeld.
  C  17 Schmuckstücke deklarieren "Gold"/"Silver", obwohl die Beschreibung
     vergoldetes/versilbertes Kupfer, Messing oder Nickelsilber nennt.
     Edelmetallkontrollgesetz: plattierte Ware darf nicht ohne Kennzeichnung
     als Gold-/Silberware bezeichnet werden.
  D  ZUSÄTZLICH GEFUNDEN, im Bericht nicht aufgeführt: 469 Produkte tragen den
     Wert "Stainless" — das abgeschnittene Adjektiv von «Stainless steel».
     «Stainless» ist kein Materialname; Google kann ihn keinem Material-Filter
     zuordnen. 448 davon belegen «Edelstahl» in der eigenen Beschreibung.

ZAHLEN AUS DEM PROBELAUF (Voll-Export 12.08., 31'500 aktive Produkte):
  A 178 · B 178 · C 19 · D 448 (21 «Stainless» ohne Beleg bleiben stehen)

FEHLTREFFER, DIE DER PROBELAUF AUFGEDECKT HAT — und was daraus folgt:
  · «weichem» enthält «eiche», «kleinen» enthält «leinen», «für PC und Laptop»
    ergab «Polycarbonat», «samt Tasche» ergab «Samt». Der erste Musterentwurf
    ohne Wortgrenzen hätte drei Hoodies auf «Holz» und «Leinen» gesetzt.
    → ALLE Materialmuster tragen jetzt \b-Grenzen.
  · «Bequeme Leder-Sandalen» (15495230521729): Obermaterial vollnarbiges
    RINDSLEDER, nur das Futter ist Kunstleder. Nennt eine Beschreibung beides,
    wird sie NICHT angefasst — 1 Produkt so gerettet.
  · «Suede-Sweatshirt für Herren» (15449474924929): der Titel-Rückfall hätte
    «Wildleder» für ein Sweatshirt in Wildleder-OPTIK geschrieben.
    → Rückfall auf den Titel ersatzlos gestrichen.
  · «Damenring mit grünem Moosachat» (15478428696961): «S925 Silber mit
    Weissgold-Plattierung» — die Basis IST echtes Silber, die Galvanik nur
    Finish. material="Silver" ist korrekt. Rund 30 Sterlingsilber-Stücke mit
    dem Wort «Galvanisierung» wären sonst fälschlich umgeschrieben worden.
  · «Nordische Tischleuchte» (15484628107649) trägt material="Gold" für
    «golden galvanisiertes Gewebe». Falsch, aber aus der Beschreibung nicht
    sicher bestimmbar → bewusst NICHT angefasst, im Bericht genannt.
  · «Strick», «Spitze», «Trueran», «Synthetischer Faser-Mix», «Acetatfaser»
    sind eigenwillige, aber echte Materialangaben → nicht als Müll gewertet.

ENTSCHEIDUNGEN:
  · Findet sich in der eigenen Beschreibung kein belegtes Material, wird das
    Metafeld GELÖSCHT statt geraten. Ein leeres Feld ist im Feed besser als ein
    falsches (dieselbe Regel wie bei google_product_category).
  · Materialien werden auf deutsche Namen normalisiert — Beschreibung, Storefront
    und Feed-Sprache sind Deutsch.
  · Es wird ausschliesslich an material-VERANKERTEN Textstellen gelesen
    («Material:», «Obermaterial», «gefertigt aus …»), nie frei über den Text.

QUELLE MITREPARIERT (Regel: zu jedem Nachfüllen gehört die Quelle):
  automation/cj_category_fill.mjs schrieb den Fehler bei JEDEM Neuimport weiter —
  sein MATWORDS-Ausdruck nahm aus «PU leather» das Wort «leather» und schrieb
  «Leather», aus «Stainless steel» das Wort «stainless» und aus «18k Gold
  plattiert» das Wort «Gold». Der Importer benutzt jetzt automation/material_kanonisch.mjs.

BENUTZUNG:  DRY=1 python3 automation/material_metafeld_korrigieren.py [GRUPPEN]
            DRY=0 python3 automation/material_metafeld_korrigieren.py leder,muell,edelmetall,stainless
"""
import json, os, re, subprocess, sys, time, html

SHOP  = 'https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json'
TOKF  = '/tmp/cj_shop_token.txt'
EXPORT= '/tmp/export.jsonl'
LEDGER= 'dropship/_material_korrigiert.txt'
DRY   = os.environ.get('DRY', '1') != '0'
NS, KEY = 'mm-google-shopping', 'material'
GRUPPEN = set((sys.argv[1] if len(sys.argv) > 1 else 'leder,muell,edelmetall,stainless').split(','))

# ---------------------------------------------------------------- Materialmuster
# Wortgrenzen sind hier nicht Kosmetik: ohne sie steckt «eiche» in «weichem»,
# «leinen» in «kleinen» und «pc» in «für PC und Laptop».
MAT = [
 ('Mikrofaserleder', r'\bmikrofaser[-\s]?leder\w*|\bmicrofib(?:er|re)\s?leather\b'),
 ('PU-Leder',        r'\bpu[-\s]?leder\w*|\bpu[-\s]?leather\b|\bpolyurethan[-\s]?leder\w*'),
 ('Kunstleder',      r'\bkunstleder\w*|\bleder-?imitat\w*|\bimitation\s?leather\b|\bsynthetic\s?leather\b|\bfaux[-\s]?leder\w*'
                     r'|\bartificial\s?leather\b|\bfaux\s?leather\b|\bveganes?\s?leder\b|\bvegan\s?leather\b'),
 ('Wildleder',       r'\bwildleder\w*|\bveloursleder\w*'),
 ('Echtleder',       r'\bechtleder\w*|\bechtes\s?leder\b|\brinds?leder\w*|\blammleder\w*|\bziegenleder\w*'
                     r'|\bkalbsleder\w*|\bb[üu]ffelleder\w*|\bgenuine\s?leather\b|\bcowhide\b|\breal\s?leather\b'
                     r'|\bvollleder\w*|\bnappa\w*|\bschafsleder\w*'),
 ('Lammfell',        r'\bsheepskin\b|\blammfell\w*|\bschaffell\w*'),
 ('Leder',           r'\bleder\b|\bleather\b'),
 ('Baumwolle',       r'\bbaumwoll\w*|\bcotton\b'),
 ('Leinen',          r'\bleinen\w*|\blinen\b|\bflachs\b'),
 ('Polyester',       r'\bpolyesterfaser\w*|\bpolyester\w*'),
 ('Elastan',         r'\belastan\w*|\bspandex\b|\blycra\b'),
 ('Viskose',         r'\bviskose\b|\bviscose\b|\brayon\b'),
 ('Nylon',           r'\bnylon\w*|\bpolyamid\w*'),
 ('Eisseide',        r'\bice\s?silk\b|\beisseide\b'),
 ('Milchseide',      r'\bmilchseide\b|\bmilk\s?silk\b|\bmilchfaser\w*'),
 ('Seide',           r'\bseide\w*|\bseiden\w*|\bsilk\b'),
 ('Wolle',           r'(?<!baum)\bwolle\b|\bwool\b|\bmerino\w*'),
 ('Kaschmir',        r'\bkaschmir\w*|\bcashmere\b'),
 ('Flanell',         r'\bflanell\w*|\bflannel\b'),
 ('Fleece',          r'\bfleece\w*|\bvlies\w*'),
 ('Acryl',           r'\bacryl\w*|\bacrylic\b'),
 ('Denim',           r'\bdenim\b|\bjeansstoff\w*'),
 ('Canvas',          r'\bcanvas\b|\bsegeltuch\w*'),
 ('Frottee',         r'\bfrottee\w*|\bterry\b'),
 ('Chiffon',         r'\bchiffon\b'),
 ('Satin',           r'\bsatin\b'),
 ('Jersey',          r'\bjersey\b'),
 ('Modal',           r'\bmodal\b'),
 ('Tencel',          r'\btencel\b|\blyocell\b'),
 ('Acetat',          r'\bacetat\w*|\bacetate\b'),
 ('Netzstoff',       r'\bnetzstoff\w*|\bmesh\b|\bt[üu]ll\b|\btulle\b'),
 ('Oxford-Gewebe',   r'\boxford\b'),
 ('Neopren',         r'\bneopren\w*|\bneoprene\b'),
 ('Edelstahl',       r'\bedelstahl\w*|\bstainless\s?steel\b|\brostfreie[rmn]?\s?stahl\b'),
 ('Titanstahl',      r'\btitanstahl\w*|\btitanium\s?steel\b'),
 ('Stahl',           r'\bstahl\b|\bsteel\b'),
 ('Titan',           r'\btitan\b|\btitanium\b'),
 ('Aluminium',       r'\baluminium\w*|\baluminum\b|\bal-alloy\b'),
 ('Messing',         r'\bmessing\b|\bbrass\b'),
 ('Kupfer',          r'\bkupfer\w*|\bcopper\b'),
 ('Zinklegierung',   r'\bzinklegierung\w*|\bzinc\s?alloy\b'),
 ('Sterlingsilber',  r'\bs?925\w*\s?(?:sterling)?\s?silber\b|\bsterling\s?silver\b|\b925er?\b'),
 ('Legierung',       r'\blegierung\w*|\balloy\b'),
 ('Gold',            r'\bgold\b|\bgolden\b'),
 ('Silber',          r'\bsilber\b|\bsilver\b'),
 ('Platin',          r'\bplatin\b|\bplatinum\b'),
 ('Metall',          r'\bmetall\b|\bmetalle[nr]?\b|\bmetal\b'),
 ('Silikon',         r'\bsilikon\w*|\bsilicone\b'),
 ('Gummi',           r'\bgummi\w*|\brubber\b|\bkautschuk\b'),
 ('ABS-Kunststoff',  r'\babs\b'),
 ('Kunststoff',      r'\bkunststoff\w*|\bplastik\w*|\bplastic\b|\bpvc\b|\bpolypropylen\w*|\bpolycarbonat\w*|\bresin\b|\bharz\b'),
 ('Bambus',          r'\bbambus\w*|\bbamboo\b'),
 ('Holz',            r'\bholz\w*|\bwood\w*|\beiche\b|\bbuche\b|\bwalnuss\b'),
 ('Glas',            r'\bglas\b|\bglass\b|\bmineralglas\b'),
 ('Keramik',         r'\bkeramik\w*|\bceramic\b|\bporzellan\w*'),
 ('Papier',          r'\bpapier\w*|\bpaper\b|\bkarton\w*|\bpappe\b'),
 ('Filz',            r'\bfilz\w*|\bfelt\b'),
 ('Kork',            r'\bkork\b|\bcork\b'),
 ('Marmor',          r'\bmarmor\w*|\bmarble\b'),
 ('Zirkonia',        r'\bzirkonia\b|\bzirkon\b|\bcubic\s?zirconia\b'),
 ('Kristall',        r'\bkristall\w*|\bcrystal\b|\bstrass\b|\brhinestone\b'),
 ('Perle',           r'\bperle\w*|\bperlen\w*|\bpearl\w*'),
]
COMP = [(n, re.compile(p, re.I)) for n, p in MAT]
# Oberbegriff fällt weg, sobald ein präziserer Treffer danebensteht
FEINER = (('Leder',      ('PU-Leder','Kunstleder','Mikrofaserleder','Echtleder','Wildleder')),
          ('Metall',     ('Edelstahl','Titanstahl','Stahl','Messing','Kupfer','Zinklegierung','Aluminium',
                          'Titan','Sterlingsilber','Legierung','Gold','Silber','Platin')),
          ('Legierung',  ('Zinklegierung','Aluminium')),
          ('Stahl',      ('Edelstahl','Titanstahl')),
          ('Titan',      ('Titanstahl',)),
          ('Silber',     ('Sterlingsilber',)),
          ('Kunststoff', ('ABS-Kunststoff','Silikon','Acryl')),
          ('Seide',      ('Eisseide','Milchseide')))

def plaintext(h):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h or '')))

def canon(s):
    hits = sorted((m.start(), n) for n, rx in COMP for m in [rx.search(s or '')] if m)
    out = []
    for _, n in hits:
        if n not in out: out.append(n)
    for grob, fein in FEINER:
        if grob in out and any(f in out for f in fein): out.remove(grob)
    return out

# ------------------------------------------------- Beschreibung: verankert lesen
ANKER = [(re.compile(r'\b\w*material(?:\s+und\s+Geh[äa]use)?\s*:?\s*(?:aus\s+)?', re.I), 90),
         (re.compile(r'\bMaterial(?:ien|mix)?\s*:\s*', re.I), 90),
         (re.compile(r'(?=\d{1,3}\s?%\s?[A-Za-zÄÖÜäöü])', re.I), 70),
         (re.compile(r'\b(?:gefertigt|hergestellt|besteht|bestehen|gearbeitet|verarbeitet)\s+aus\s+', re.I), 60),
         # ⚠️ «aus» ist der schwächste Anker und ausgerechnet er lief in eine Falle:
         # JEDE CJ-Beschreibung enthält die Zwischenüberschrift «Das zeichnet es aus».
         # Ohne diesen Ausschluss las der Ausdruck den ersten Aufzählungspunkt danach als
         # Materialangabe — beim «PU Faux Leder Hoodie» ergab das «Kunstleder», obwohl der
         # Stoff ein Four-Way-Stretch ist und PU-Leder nur die OPTIK beschreibt.
         (re.compile(r'(?<!zeichnet es )(?<!zeichnet sich )(?<!sieht )\baus\s+', re.I), 40)]
RX_FELDENDE = re.compile(r'\s(?:Muster|Muster/Design|Farben?|Gr[öo]sse[n]?|Stil|Style|Design|Verschluss|'
                         r'Passform|Anlass|Saison|Pflege|Funktion|Sohlenmaterial|Farbnummer)\s*[:/]', re.I)

# Bausteine, die in JEDER Beschreibung stehen und keine Materialaussage enthalten.
# ⚠️ Sie werden HERAUSGESCHNITTEN, nicht abgeschnitten: der «Produktdetails»-Block mit der
# Zeile «Material: …» steht bei vielen Produkten HINTER dem Trust-Baustein. Ein
# t.split('🛡️')[0] warf im Probelauf genau diese Zeile weg und hätte 9 Produkte
# fälschlich geleert, deren Material sauber dokumentiert ist.
RX_BAUSTEIN = re.compile(r'🛡️\s*Sorglos shoppen.*?(?=Produktdetails|$)|🛍️[^:]{0,40}:.*?(?=Produktdetails|$)'
                         r'|👉\s*Passt dazu.*$|👉\s*Mehr\b[^.]{0,60}', re.S)

def aus_beschreibung(descHtml):
    """Materialien NUR an material-verankerten Stellen der eigenen Beschreibung.
    Kein Rückfall auf den Titel — «Suede-Sweatshirt» ist eine Optik, kein Wildleder."""
    t = RX_BAUSTEIN.sub(' ', plaintext(descHtml))
    for rx, breite in ANKER:
        for m in rx.finditer(t):
            f = t[m.end():m.end() + breite]
            fe = RX_FELDENDE.search(f)
            if fe: f = f[:fe.start()]
            c = canon(f)
            if c: return c[:3]
    return []

# ------------------------------------------------------------ Müll-Klassifikation
LABELS = (r'style|size|sizes|color|colors|colour|packing\s?list|processing\s?technology|sleeve\s?length|'
 r'dress\s?length|skirt\s?length|wig\s?length|shaft\s?height|sock[s]?\s?length|pants\s?fit|applicable\s?gender|'
 r'applicable\s?age|wearing\s?method|brand|note|occasion|suitable\s?occasion|suitable\s?venues|fabric\s?count|'
 r'product|item\s?no|specifications|dimensions|height|thickness|purity|use\s?environment|surface\s?technology|'
 r'closure\s?method|brush\s?type|watch\s?buckle\s?style|buckle\s?\w*|dial\s?glass|used\s?for|trendy\s?element|'
 r'visual\s?effects|production\s?method|snorkel|compatible\s?with[\w\s]*|velvet\s?size|gender|material|name|composition')
RX_LABEL = re.compile(r'^(?P<mat>.{2,45}?)\s+(?:' + LABELS + r')\b.*$', re.I)
RX_HTML  = re.compile(r'[<>]|^/?\w{1,6}>')
RX_SATZ  = re.compile(r'\b(sorgt|sorgen|bietet|bieten|verleiht|verspricht|eignet|besteht|ist\s|sind\s|h[äa]lt|'
 r'tragekomfort|tragegef[üu]hl|w[äa]rme|erh[äa]ltlich|verf[üu]gbar|ideal|pflegeleicht|f[üu]llung|qualit[äa]t|'
 r'looks|kapuze|dicke|schutz|komfort|nutzung|passform|alltag)', re.I)
PLATZHALTER = {'hochwertiges material', 'material', 'name', 'composition', 'unbekannt', 'n/a', '-'}

def muellklasse(v):
    """(Klasse, verwertbarer Materialteil) — Klasse None heisst: Wert bleibt.
    Eigenwillige, aber echte Angaben («Strick», «Trueran») gelten NICHT als Müll."""
    s = (v or '').strip()
    if not s:                        return ('leer', None)
    if RX_HTML.search(s):            return ('html-rest', None)
    if s.lower() in PLATZHALTER:     return ('platzhalter', None)
    if re.match(r'^single\s?piece\b', s, re.I): return ('label-ohne-material', None)
    if len(s) >= 45 or RX_SATZ.search(s):       return ('satzfragment', None)
    m = RX_LABEL.match(s)
    if m and canon(m.group('mat')):  return ('label-angehaengt', m.group('mat').strip())
    return (None, None)

# -------------------------------------------------------------- Leder / Edelmetall
RX_KUNSTLEDER = re.compile(r'\bpu[-\s]?leder\w*|\bpu[-\s]?leather\b|\bkunstleder\w*|\bleder-?imitat\w*|'
 r'\bimitation\s?leather\b|\bsynthetic\s?leather\b|\bartificial\s?leather\b|\bfaux\s?leather\b|'
 r'\bveganes?\s?leder\b|\bvegan\s?leather\b|\bfaux[-\s]?leder\w*|\bmikrofaser[-\s]?leder\w*|\bmicrofib(?:er|re)\s?leather\b', re.I)
RX_ECHTLEDER  = re.compile(r'\bechtleder\w*|\bechtes\s?leder\b|\brinds?leder\w*|\blammleder\w*|\bziegenleder\w*|'
 r'\bkalbsleder\w*|\bb[üu]ffelleder\w*|\bgenuine\s?leather\b|\bcowhide\b|\breal\s?leather\b|\bvollleder\w*|\bnappa\w*', re.I)

def leder_pruefen(text):
    """«Leder» im Feld — was sagt die eigene Beschreibung? Nennt sie BEIDES
    (Obermaterial Rindsleder, Futter Kunstleder), wird nicht angefasst."""
    k, e = RX_KUNSTLEDER.search(text), RX_ECHTLEDER.search(text)
    if not k or e: return None
    tr = k.group(0).lower().replace(' ', '-')
    if 'mikrofaser' in tr or 'microfib' in tr: return 'Mikrofaserleder'
    if tr.startswith('pu'):                    return 'PU-Leder'
    return 'Kunstleder'

RX_VERGOLDET   = re.compile(r'\bvergolde\w*|\bgold[-\s]?plattier\w*|\bgoldplattier\w*|\bgold[-\s]?[üu]berzug\w*|'
                            r'\bgold[-\s]?plated\b|\bgoldbeschicht\w*|\bgold\s?plattiert\w*|\bechtvergoldung\b', re.I)
RX_VERSILBERT  = re.compile(r'\bversilber\w*|\bsilber[-\s]?plattier\w*|\bsilberplattier\w*|\bsilver[-\s]?plated\b|'
                            r'\bsilberbeschicht\w*|\bsilber[üu]berzug\w*|\bmit\s?silber\s?[üu]berzogen\b', re.I)
RX_EDELBASIS   = re.compile(r'\bs?925\w*|\bs?999\w*|\bsterling\b|\b585\b|\b750\b|\bmassive[smr]?\s+(?:silber|gold)\b', re.I)
BASISMETALL    = [('Nickelsilber', r'\bnickelsilber\b|\bneusilber\b'), ('Messing', r'\bmessing\b|\bbrass\b'),
                  ('Kupfer', r'\bkupfer\w*|\bcopper\b'), ('Zinklegierung', r'\bzinklegierung\w*|\bzinc\s?alloy\b'),
                  ('Metalllegierung', r'\bmetall?legierung\w*|\blegierung\w*|\balloy\b'),
                  ('Edelstahl', r'\bedelstahl\w*|\bstainless\b')]
BASISMETALL    = [(n, re.compile(p, re.I)) for n, p in BASISMETALL]

def edelmetall_pruefen(wert, text):
    """«Gold»/«Silver» im Feld. Ist die BASIS echtes Edelmetall (925/999/Sterling),
    ist eine Galvanisierung nur Finish und der Wert korrekt — nicht anfassen."""
    if RX_EDELBASIS.search(text): return None
    plat = RX_VERGOLDET.search(text) or RX_VERSILBERT.search(text)
    basis = next((n for n, rx in BASISMETALL if rx.search(text)), None)
    if not plat and not basis: return None
    suffix = 'vergoldet' if wert.lower() == 'gold' else 'versilbert'
    if basis and plat:  return f'{basis}, {suffix}'
    if basis:           return basis          # keine Plattierung behauptet, nur unedle Basis
    return suffix                             # Plattierung belegt, Basis unbekannt

# ------------------------------------------------------------------ Entscheidung
# Tier-Materialien sind Preis- und Rechtsargumente. Ein solcher Wert darf NIE allein aus
# dem Lieferanten-Rohwert übernommen werden: «sheepskin Velvet Size» steht an einem
# Kinder-Schneestiefel für CHF 20, dessen Beschreibung «Schafsfell-Velours» sagt — Plüsch.
# Aus einem Extraktionsfehler würde sonst eine neue Falschangabe.
STARKE_ANSPRUECHE = ('Echtleder', 'Lammfell', 'Wildleder')
RX_TIERBELEG = re.compile(r'\becht(?:es\s)?leder\w*|\brinds?leder\w*|\blammleder\w*|\bziegenleder\w*|\bkalbsleder\w*|'
                          r'\bgenuine\s?leather\b|\bcowhide\b|\bvollleder\w*|\bnappa\w*|\blammfell\w*|'
                          r'\bwildleder\w*|\bveloursleder\w*', re.I)

def entscheide(wert, descHtml, titel=''):
    """(neuer Wert | '' zum Löschen | None = nicht anfassen, Grund)"""
    w = (wert or '').strip()
    # Der Titel ist genauso kundenverbindlich wie der Fliesstext: «PU Faux Leder Hoodie»
    # trägt den Beleg nur dort.
    text = plaintext(descHtml) + ' ' + (titel or '')

    if 'leder' in GRUPPEN and w.lower() in ('leather', 'leder'):
        neu = leder_pruefen(text)
        return (neu, 'leder') if neu else (None, 'leder-kein-beleg')

    if 'edelmetall' in GRUPPEN and w.lower() in ('gold', 'silver', 'silber'):
        neu = edelmetall_pruefen(w, text)
        return (neu, 'edelmetall') if neu else (None, 'edelmetall-basis-echt')

    if 'stainless' in GRUPPEN and w.lower() == 'stainless':
        if re.search(r'\bedelstahl\w*|\bstainless\s?steel\b|\brostfrei\w*', text, re.I):
            return ('Edelstahl', 'stainless')
        return (None, 'stainless-kein-beleg')

    if 'muell' in GRUPPEN:
        kl, teil = muellklasse(w)
        if not kl: return (None, 'wert-in-ordnung')
        neu = canon(teil) if teil else aus_beschreibung(descHtml)
        # Starke Tier-Ansprüche nur, wenn die eigene Beschreibung sie belegt
        if any(x in STARKE_ANSPRUECHE for x in neu) and not RX_TIERBELEG.search(text):
            neu = [x for x in neu if x not in STARKE_ANSPRUECHE] or aus_beschreibung(descHtml)
            neu = [x for x in neu if x not in STARKE_ANSPRUECHE or RX_TIERBELEG.search(text)]
        # Ein aus dem Müll gewonnenes generisches «Leder» erneut gegen die Beschreibung prüfen
        if 'Leder' in neu:
            besser = leder_pruefen(text)
            if besser: neu = [besser if x == 'Leder' else x for x in neu]
        return ((', '.join(neu) if neu else ''), kl)

    return (None, 'keine-gruppe')

# ----------------------------------------------------------------------- Shopify
def gql(query, variables=None):
    """Regel: eine gescheiterte Anfrage ist KEIN Ergebnis. Nur eine echte Antwort
    darf ins Ledger — sonst gilt der Fall als offen und wird erneut versucht."""
    tok = open(TOKF).read().strip()
    for versuch in range(6):
        r = subprocess.run(['curl', '-sS', '--max-time', '60', '-X', 'POST', SHOP,
                            '-H', 'X-Shopify-Access-Token: ' + tok, '-H', 'Content-Type: application/json',
                            '-d', json.dumps({'query': query, 'variables': variables or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(3 + 2 * versuch); continue
        if d.get('errors') and any('Throttled' in str(e) for e in d['errors']):
            time.sleep(5 + 3 * versuch); continue
        if d.get('data'): return d['data']
        time.sleep(3 + 2 * versuch)
    return None

Q_LESEN = 'query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id title status ' \
          'descriptionHtml metafield(namespace:"%s",key:"%s"){ id value } } } }' % (NS, KEY)
M_SETZEN = 'mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{ field message } } }'
M_LOESCHEN = 'mutation($m:[MetafieldIdentifierInput!]!){ metafieldsDelete(metafields:$m){ userErrors{ message } } }'

def kandidaten():
    """Vorauswahl aus dem Export — entschieden wird ausschliesslich auf LIVE-Daten."""
    ids = []
    for zeile in open(EXPORT):
        d = json.loads(zeile)
        if d['status'] != 'ACTIVE': continue
        mf = {x['key']: x['value'] for x in d['mf']['nodes']}
        w = (mf.get(KEY) or '').strip()
        if not w: continue
        wl = w.lower()
        if ('leder' in GRUPPEN and wl in ('leather', 'leder')) \
           or ('edelmetall' in GRUPPEN and wl in ('gold', 'silver', 'silber')) \
           or ('stainless' in GRUPPEN and wl == 'stainless') \
           or ('muell' in GRUPPEN and muellklasse(w)[0]):
            ids.append(d['id'])
    return ids

def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.split('\t')[0] for z in open(LEDGER) if z.strip()}
    ids = [i for i in kandidaten() if i not in erledigt]
    print(f'Kandidaten aus dem Export: {len(ids)} (Ledger kennt bereits {len(erledigt)})  DRY={DRY}')

    from collections import Counter
    stat = Counter(); setzen = []; loeschen = []
    led = None if DRY else open(LEDGER, 'a')

    for i in range(0, len(ids), 25):
        block = ids[i:i + 25]
        daten = gql(Q_LESEN, {'ids': block})
        if daten is None:
            print('  ! Leseblock ohne Antwort — bleibt offen, nächster Lauf holt ihn nach')
            stat['leseblock-offen'] += len(block); continue
        for p in daten.get('nodes') or []:
            if not p: continue
            if p['status'] != 'ACTIVE':
                stat['nicht-aktiv'] += 1; continue
            alt = (p['metafield'] or {}).get('value')
            if alt is None:
                stat['metafeld-weg'] += 1; continue
            neu, grund = entscheide(alt, p['descriptionHtml'], p['title'])
            if neu is None or neu == alt.strip():
                stat['unberuehrt:' + grund] += 1; continue
            stat[('LOESCHEN:' if neu == '' else 'SETZEN:') + grund] += 1
            if DRY:
                if stat[('LOESCHEN:' if neu == '' else 'SETZEN:') + grund] <= 4:
                    print(f'  [DRY] {p["id"].split("/")[-1]} {grund:20s} {alt[:42]!r} -> {neu!r}   {p["title"][:42]}')
                continue
            if neu == '': loeschen.append((p['id'], p['title'], alt))
            else:         setzen.append((p['id'], p['title'], alt, neu))

        # Schreiben in Blöcken, Ledger mit flush nach JEDER Zeile
        if not DRY:
            if setzen:
                r = gql(M_SETZEN, {'m': [{'ownerId': o, 'namespace': NS, 'key': KEY,
                                          'type': 'single_line_text_field', 'value': n} for o, _, _, n in setzen]})
                if r is None:
                    print('  ! Schreibblock ohne Antwort — bleibt offen'); stat['schreib-offen'] += len(setzen)
                else:
                    fehler = r['metafieldsSet']['userErrors']
                    if fehler: print('  ✗', str(fehler)[:200])
                    for o, t, a, n in setzen:
                        led.write(f'{o}\tSET\t{a}\t{n}\t{t[:60]}\n'); led.flush(); os.fsync(led.fileno())
                setzen = []
            if loeschen:
                r = gql(M_LOESCHEN, {'m': [{'ownerId': o, 'namespace': NS, 'key': KEY} for o, _, _ in loeschen]})
                if r is None:
                    print('  ! Löschblock ohne Antwort — bleibt offen'); stat['loesch-offen'] += len(loeschen)
                else:
                    fehler = r['metafieldsDelete']['userErrors']
                    if fehler: print('  ✗', str(fehler)[:200])
                    for o, t, a in loeschen:
                        led.write(f'{o}\tDEL\t{a}\t\t{t[:60]}\n'); led.flush(); os.fsync(led.fileno())
                loeschen = []
        if (i // 25) % 8 == 0: print(f'   … {i + len(block)}/{len(ids)}')

    if led: led.close()
    print('\n--- Bilanz ---')
    for k, v in sorted(stat.items(), key=lambda x: -x[1]): print(f'{v:6d}  {k}')

if __name__ == '__main__':
    main()
