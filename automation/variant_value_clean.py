"""variant_value_clean.py — raeumt Lieferanten-Kauderwelsch aus der Varianten-Auswahl.

DER BEFUND (21.08.2026): In Auswahlfeldern standen rohe Lieferanten-Variantenschluessel —
«JJF91889color-Kid 3to4Y», «JJF328204 Red-Dad 3XL», «Milky White-Default Item-Default Item».
Das Auswahlfeld ist das Letzte, was jemand vor dem Kauf anklickt. 351 aktive Produkte
betroffen.

⚠️ DIESES WERKZEUG STAND IN KEINEM KEEPALIVE. Es lief einmal von Hand, seinen Fortschritt
legte es unter /tmp ab — beides weg beim naechsten Container-Wipe. Genau die Lehre vom
19.08.: «Ein Waechter, der nicht selbst bewacht wird, ist keiner.» Jetzt im fixer_keepalive
registriert, Ledger im Repo.

⚠️ NIE OHNE DRY=1 STARTEN. clean() ist absichtlich scharf (Token-weise, verwirft Codes);
was es falsch trifft, steht in 351 Auswahlfeldern gleichzeitig.

DRY=1 python3 automation/variant_value_clean.py   → meldet nur, schreibt nichts

═══ 23.09.2026 — ENGLISCHE LIEFERANTENWERTE (Audit-Befund 22) ═════════════════════════════
Gemessen am Bestand (Options-Export 21.09., 51'324 aktive): 3'487 Produkte tragen ein
englisches Grundfarbwort im Auswahlfeld («Black» 1'880, «Blue» 1'253, «White» 1'177 …).
Auf den besuchten Seiten (30 T, 573 aktive) stand bei der Jeansjacke unter «Farbe»
«Blue Coat» / «Blue Pants» — wer die zweite Farbe waehlt, bestellt eine HOSE.

WARUM DIESES WERKZEUG DAS NIE ERFASST HAT — drei Gruende, alle gemessen:
 1. DER CURSOR WURDE NIE ZURUECKGESETZT. Nach dem ersten Durchgang (13.09.) blieb
    /tmp/varval_cursor.txt auf der letzten Seite stehen; jeder Tageslauf seither begann
    HINTER dem letzten Produkt und meldete «FERTIG: 0 gescannt» — zehn Tage lang ein Waechter,
    der nichts ansah. Jetzt: vollstaendiger Durchgang → Cursor loeschen → morgen von vorn.
 2. Das Tor BAD kannte nur Codes/«Default Item»/«N style». Englische Woerter kamen nie durch.
 3. Die Uebersetzung war bewusst ausgelagert an farbwerte_zusammengesetzt.py — aber das liest
    /tmp/export.jsonl, und dieser Export traegt KEINE options (gemessen 23.09.: 0 von 51'189
    Zeilen). Es meldet taeglich «FERTIG: 0 … nichts zu tun». Ein Uebersetzer ohne Eingabe.
    Seine Kompositionsregel (sea+blue → Seeblau) wird hier WIEDERVERWENDET (Import, keine
    Kopie), die gemeinsame Tabelle farben_de.json ebenso — zwei Werkzeuge, dieselbe Richtung,
    dieselben Woerter (Lehre 11.08.: nie gegenlaeufig).

WIE UEBERSETZT WIRD (wert_de): Ein Wert wird an «-», «+», «,», «/», «&» in Stuecke zerlegt,
jedes Stueck Wort fuer Wort (laengste Treffer zuerst) gegen farben_de.json, die Farbkomposition
und die Begriffstabellen unten gelesen. Uebersetzt wird NUR, wenn JEDES Wort bekannt ist —
sonst bleibt der Wert, wie er ist, und das unbekannte Wort landet in der Liste im Bericht
(daraus waechst die Tabelle, nicht aus Raten). Trenner bleiben, wie sie waren: «Black-XL» →
«Schwarz-XL», damit groesse_im_farbwert/mass_im_farbwert ihre Muster weiter finden.

⛔ NUR MELDEN, NIE SCHREIBEN:
 • Kleidungsstueck als Farbe («Blue Coat»/«Blue Pants»): die Option bleibt unberuehrt.
   Stehen zwei verschiedene Kleidungsstuecke in EINER Option, bestellt die Kundin mit der
   «Farbe» eine andere WARE — das entscheidet ein Mensch am Bild (Bericht, Abschnitt A).
 • Kollision nach Uebersetzung («Blue» → «Blau», «Blau» gibt es schon): ganze Option unberuehrt,
   Bericht Abschnitt B (farbwert_dubletten legt solche Paare zusammen).
 • POD/Editor-Ware (Tag printful…): heilig (CLAUDE.md Regel 4) — nicht angefasst.
 • CJ-SKU der Form «CJ-<pid>» mit mehreren Varianten: cj_order_engine.vid_fuer() sucht die
   Variante dort ueber den VARIANTENTITEL im CJ-variantKey. Ein uebersetzter Titel wuerde die
   automatische Bestellung dieser Produkte blockieren → nicht angefasst (gemessen 23.09.: 0).
 • Optionen mit linkedMetafield: Werte haengen an Metaobjekten, Umbenennen waere dort falsch.

Jede Aenderung steht Wert fuer Wert (alt → neu) in dropship/_variant_value_clean_en.txt —
damit ist jede Umbenennung nachvollziehbar und rueckgaengig zu machen. Nach jedem Schreiben
wird die Option ZURUECKGELESEN; weicht der Stand ab, zaehlt das als Fehler.

Reihenfolge: zuerst die Produkte mit Besuchen (ShopifyQL, 30 Tage), dann der ganze Katalog.
Bericht: dropship/VARIANTENWERTE-ENGLISCH.md (Stand des aktuellen Durchgangs).

═══ 23.09.2026 abends — NACHBESSERUNG nach dem Vollscan (Pruefer-Befund) ════════════════════
«Nur uebersetzen, wenn jedes Wort bekannt ist» war zu schwach: 17'191 Werte geschrieben, darunter
Wort-fuer-Wort-Salat («USB Stecker in version», «Braun einzeln Futter», «4 cm dick Sohle Grün»),
geklebte Adjektive («Klassischschwarz», «Leuchtendrot»), Farbnamen als Material («Leder Pink» fuer
den Farbton «Leather Pink») und Farbnummern als Anzahl («1color … 19color» → «1 Farbe … 19 Farben»).
Jetzt: (1) jede Einheit traegt eine Wortklasse, _satzbau() verwirft Folgen, die im Deutschen nicht
stehen koennen (ungebeugtes Adjektiv vor Nomen, «in» als Praeposition ohne Farbe, Nomen+Nomen,
Material+Farbe, Menge+Nomen …) — verworfen heisst UNVERAENDERT; (2) Farbadjektive werden gebeugt
statt geklebt («Klassisches Schwarz», nur bei Farbneutra) oder mit Bindestrich («Vintage-Grün»);
(3) NColor entscheidet der Optionskontext (option_kontext: dichte Reihe = Farbton N; Einzahl/Mehrzahl
passend und Reihe = mehrdeutig → unveraendert); (4) Selbsttest mit jedem Fehlbeispiel:
python3 automation/variant_value_clean.py --selbsttest. Die am 23.09. geschriebenen Werte wurden aus
dem Ledger neu berechnet und repariert (Ledger-Zeilen «/reparatur-original|korrigiert|konsistenz»).
⚠️ Der Tageslauf heilt solche Fehler NICHT selbst: «1 Farbe», «Klassischschwarz», «Stecker in version»
tragen kein englisches Wort und passieren das Tor englisch(). Reparatur geht nur ueber das Ledger.

ENV: DRY=1 (nur melden) · NUR_BESUCHT=1 (nur die besuchten Seiten) · NUR_ID=<id,id>
     (nur diese Produkte — fuer Stichproben) · KEIN_EN=1 (alte Codereinigung ohne Uebersetzung)
"""
import json, subprocess, time, re, os, sys, urllib.parse
from collections import Counter

# Fester Pfad statt __file__: der Aufseher spiegelt automation/*.py nach /tmp — eine von dort
# gestartete Kopie faende sonst weder farben_de.json noch die Ledger (Lehre cj_varianten_wache 21.09.).
REPO = os.environ.get("REPO", "/home/user/aban-news-landing")
HIER = os.path.join(REPO, "automation")
sys.path.insert(0, HIER)
from eimer_etikette import nachlauf, bilanz          # noqa: E402
import farbwerte_zusammengesetzt as _fz              # noqa: E402  (phrase_de: sea+blue → Seeblau)

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
NUR_BESUCHT = os.environ.get("NUR_BESUCHT") == "1"
NUR_ID = [x.strip() for x in (os.environ.get("NUR_ID") or "").split(",") if x.strip()]
KEIN_EN = os.environ.get("KEIN_EN") == "1"
LEDGER = os.path.join(REPO, "dropship/_variant_value_clean.txt")
LEDGER_EN = os.path.join(REPO, "dropship/_variant_value_clean_en.txt")
BERICHT_EN = os.path.join(REPO, "dropship/VARIANTENWERTE-ENGLISCH.md")
# DRY hat eigenen Cursor/Zustand — ein Probelauf darf den echten Durchgang nicht verschieben.
PASS_STATE = "/tmp/varval_pass_dry.json" if DRY else "/tmp/varval_pass.json"
CURSOR = "/tmp/varval_cursor_dry.txt" if DRY else "/tmp/varval_cursor.txt"


def gql(q, v=None):
    """Fragt Shopify. Gibt {} NUR zurueck, wenn es wirklich nicht geht.

    ⚠️ Der Ausgangs-Proxy antwortet sporadisch mit HTTP 502 «policy context unavailable»
    (21.08.2026 gemessen: 2 von 3 Versuchen, Sekunden spaeter wieder 200). Mit vier
    Versuchen a 3 s lief das Werkzeug in diese Luecke, gab {} zurueck — und die Schleife
    unten deutete das als Katalog-Ende und meldete FERTIG nach 56 Produkten.
    Eine Drosselung oder ein Netzfehler ist nie ein Grund aufzuhoeren; er sagt nur, wie
    lange zu warten ist (dieselbe Lehre wie beim Kosten-Backfill).
    """
    p = json.dumps({"query": q, "variables": v or {}})
    for versuch in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "--data-binary", "@-"], input=p, capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(min(30, 2 ** versuch)); continue
        if d.get("errors") and "THROTTLED" in json.dumps(d["errors"]):
            st = ((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {}
            fehlt = max(0, (d["extensions"]["cost"].get("requestedQueryCost") or 100) - (st.get("currentlyAvailable") or 0))
            time.sleep(min(20, 1 + fehlt / (st.get("restoreRate") or 100))); continue
        if "data" in d:
            # 23.09.: Eimer-Etikette — andere Waechter laufen parallel und sollen den Boden vorfinden.
            nachlauf(d)
            return d
        time.sleep(min(30, 2 ** versuch))
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


M = '''mutation($pid:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){
 productOptionUpdate(productId:$pid, option:$o, optionValuesToUpdate:$u, variantStrategy:LEAVE_AS_IS){ userErrors{message} }}'''
# ⚠️⚠️ DIE ALTE REGEL HAT GROESSEN GEFRESSEN (21.08.2026, im Probelauf gefunden, NIE gelaufen).
# `CODE=^[A-Z]{0,6}\d[\w.-]*$` trifft JEDES Token mit einer Ziffer — und loeschte es. Der
# Probelauf zeigte: «110 cm»→«cm», «Girl 2Y»→«Girl», «Dad 3XL»→«Dad», «48pc», «1L», «180x70»,
# «45x45cm», «2XL», «XXXXL» — und bei einer Lesebrille «100 degrees-…»→«degrees …», also die
# Dioptrienzahl. Das sind genau die Angaben, wegen derer jemand das Auswahlfeld ueberhaupt
# oeffnet. Ueber 351 Produkte angewandt waere das schlimmer gewesen als der Lieferantencode.
#
# Deshalb loescht dieses Werkzeug keine Tokens mehr «auf Verdacht». Es macht nur noch drei
# Dinge, die nachweislich nichts wegnehmen:
#   1. CJ-Platzhalter «Default Item» entfernen (reines Rauschen),
#   2. einen vorangestellten Lieferantenschluessel abschneiden («JJF91889color-Kid 3to4Y»),
#   3. doppelte Leerzeichen und Trennzeichen-Reste glaetten.
# (23.09.: Farbwoerter uebersetzt jetzt der Block «ENGLISCHE LIEFERANTENWERTE» weiter unten —
# mit der gemeinsamen Tabelle automation/farben_de.json und der Kompositionsregel aus
# farbwerte_zusammengesetzt.py, also in DERSELBEN Richtung wie die Geschwisterwerkzeuge.)

# Ein Lieferantenschluessel: mindestens zwei Buchstaben, dann mindestens DREI Ziffern
# (JJF91889color, BXW820, CD88000SWY6, JS001). Drei Ziffern schliesst Groessen wie «2XL»,
# «3XL» und Alter wie «2Y» sicher aus.
LIEFCODE = re.compile(r'^[A-Za-z]{2,}\d{3,}[A-Za-z]*$')
# Vorangestellter Schluessel samt Trenner: «JJF328204 Red-Dad 3XL» / «JJF91889color-Kid 3to4Y»
PREFIX = re.compile(r'^[A-Za-z]{2,}\d{3,}[A-Za-z]*(?=[\s-])[\s-]+')
DEFITEM = re.compile(r'(?:\s*-\s*Default Item)+\s*$', re.I)
# ⚠️ 29.08.2026 — «3 style», «4 style», «12 style»: CJs Nummerierung fuer Muster oder Ausfuehrung.
# Fuer die Kundin steht im Auswahlfeld dann «Farbe: 3 style» — eine Angabe, die nichts sagt.
# Gefunden am «Wasserdichten Dry Bag mit Blumenprint» (8 von 8 Werten), auf den seit heute die
# zweitgroesste Suchseite des Shops weiterleitet. Die BAD-Regel unten kannte das Muster nicht,
# der Reiniger fasste solche Optionen also gar nicht erst an.
# ⚠️ Die Nummer wird BEHALTEN, nicht weggeworfen: sie unterscheidet die Ausfuehrungen und ist
# die einzige Information, die es dazu gibt. Aus «3 style» wird «Muster 3» — geraten wird nichts.
# 03.09.2026: auch die Mehrzahl — «5 Styles» stand als einziger Wert roh zwischen
# «Muster 1» bis «Muster 6». CJ schreibt beides.
# 04.09.2026: auch die UMGEKEHRTE Form «Style 1» / «Style1». Sie ist im frischen
# Options-Export bei 37 Produkten der einzige Farbwert — die bekannte Form «<N> style»
# steht dagegen bei 0. Dieselbe Klasse in neuer Wortstellung; ein Muster, das nur die
# eine Reihenfolge kennt, meldet die andere nie.
# ⚠️ Voll verankert, damit «Freestyle Blau» und «Lifestyle-Set» unberuehrt bleiben.
STYLENR = re.compile(r'^\s*(?:(\d{1,3})\s*styles?|styles?\s*(\d{1,3}))\s*$', re.I)


def clean(v):
    o = v or ''
    m = STYLENR.match(o)
    if m:
        return f'Muster {m.group(1) or m.group(2)}'
    n = DEFITEM.sub('', o)
    n = PREFIX.sub('', n)
    # einzeln stehende Schluessel-Tokens entfernen — aber nur, wenn danach noch etwas bleibt
    toks = [t for t in re.split(r'\s+', n) if t]
    rest = [t for t in toks if not LIEFCODE.match(t.strip('-'))]
    if rest: toks = rest
    n = ' '.join(toks)
    n = re.sub(r'\s{2,}', ' ', n)          # «Army  Green» → «Army Green»
    # Ein Tabulator hinter dem Trennstrich («Green-\tWomen S») wurde sonst zu «Green- Women S».
    # Die Geschwisterwerte heissen «Green-Men S» — also den Strich direkt anschliessen.
    n = re.sub(r'(\w)-\s+(\w)', r'\1-\2', n)
    n = re.sub(r'\s*-\s*-+\s*', ' - ', n)
    n = n.strip(' -,;/\t')
    if not n or len(n) < 2: return None     # nichts Brauchbares uebrig → unveraendert lassen
    if n == o: return None
    return n[:60]


# ⚠️ «Default Item» und doppelte Leerzeichen fehlten hier (21.08.2026): «Milky White-Default
# Item-Default Item» und «Army  Green» trugen kein Codemuster, also fasste der Reiniger das
# ganze Auswahlfeld nicht an. 77 Produkte mit doppelten Leerzeichen blieben so stehen.
BAD = re.compile(r'^[A-Z]{2,}\d{2,}|^[A-Z0-9]{7,}$|US Size|\bYards\b|Generation \d|About \d+mm|Surface-'
                 # ⚠️ 03.09.2026: Dieses Vorfilter-Muster ist gross-/kleinschreibungsEMPFINDLICH,
                 # die Regel STYLENR dahinter nicht (re.I). «3 style» wurde deshalb repariert,
                 # «3Style», «10 Style» und «1Style» nie — sie kamen am Tor gar nicht vorbei.
                 # 115 Produkte trugen so weiter Lieferantencodes im Auswahlfeld. Das Tor und
                 # die Regel muessen dieselbe Frage stellen; sonst prueft man zwei Dinge.
                 r'|Default Item|\S\s{2,}\S|(?i:^\s*(?:\d{1,3}\s*styles?|styles?\s*\d{1,3})\s*$)')
# ── Muster fuer den Zubehoer-Melder ───────────────────────────────────────────────
# Nur Optionen, in denen die Kundin eine AUSFUEHRUNG desselben Produkts erwartet.
FARBOPTION = re.compile(r'(?i)^(farbe|color|colour|ausf(ü|ue)hrung|style|stil|muster|variante)')
# Ein Zubehoer-Nomen genuegt; «Set» steht bewusst NICHT drin (ein Set IST das Produkt plus
# etwas, kein Ersatz dafuer), «ohne» ebenso wenig (es gibt «ohne Muster» als echte Wahl).
ZUBEHOER = re.compile(r'(?i)(cartridge|refill|replacement|spare\s*part|ersatzfilter|ersatzteil'
                      r'|nachf(ü|ue)ll|filterpatrone|nur\s+(filter|kabel|h(ü|ue)lle|band|riemen)'
                      r'|\b(strap|band|cable|charger)\s+only\b|only\s+(strap|band|cable))')
# ⚠️ Gegenrichtung: Ein SET ist das Produkt PLUS etwas, kein Ersatz dafuer — «Set: Brunnen +
# Ersatzfilter» ist eine ehrliche Wahl und darf nicht als Zubehoer gemeldet werden. Der
# Set-Marker muss aber vorn stehen; «Cartridge set» bleibt ein Befund.
IST_SET = re.compile(r'(?i)^\s*set\b|\bset:')
BERICHT = os.path.join(REPO, 'dropship/ZUBEHOER-ALS-FARBE.md')


# ══ ENGLISCHE LIEFERANTENWERTE (23.09.2026) ══════════════════════════════════════════════
FD = {k.lower().replace('\xa0', ' '): v
      for k, v in json.load(open(os.path.join(HIER, "farben_de.json"), encoding="utf-8")).items()}

# Mehrwort-Begriffe (klein geschrieben). Laengster Treffer gewinnt; Farbphrasen aus FD gelten
# gleichrangig. Nur Formulierungen mit EINER Lesart — «case» (Huelle? Uhrgehaeuse?), «belt»
# (Guertel? Uhrarmband?), «suit» (Anzug? Set?) stehen bewusst NICHT hier.
WIE_ABGEBILDET = "wie abgebildet"
TERM_PHRASES = {
    "picture color": WIE_ABGEBILDET, "picture colour": WIE_ABGEBILDET, "as picture": WIE_ABGEBILDET,
    "as pictures": WIE_ABGEBILDET, "as shown": WIE_ABGEBILDET, "as show": WIE_ABGEBILDET,
    "as photo": WIE_ABGEBILDET, "photo color": WIE_ABGEBILDET, "same as picture": WIE_ABGEBILDET,
    "same as the picture": WIE_ABGEBILDET, "as the picture": WIE_ABGEBILDET,
    "show as picture": WIE_ABGEBILDET, "like picture": WIE_ABGEBILDET, "as image": WIE_ABGEBILDET,
    "picture show": WIE_ABGEBILDET, "as picture shown": WIE_ABGEBILDET,
    "mixed color": "Farben gemischt", "mixed colors": "Farben gemischt", "mixed colour": "Farben gemischt",
    "random color": "Farbe zufällig", "random colors": "Farbe zufällig", "random colour": "Farbe zufällig",
    "color random": "Farbe zufällig",
    "multi color": "bunt", "multi colour": "bunt",
    # CJ «plus velvet»/«with velvet» = gefuettert (加绒); so steht es schon in farben_de.json.
    "plus velvet": "gefüttert", "with velvet": "gefüttert", "velvet lined": "gefüttert",
    "fleece lined": "gefüttert", "with fleece": "gefüttert", "plus fleece": "gefüttert",
    "add velvet": "gefüttert", "and velvet": "gefüttert",
    "without velvet": "ungefüttert", "no velvet": "ungefüttert",
    "patent leather": "Lackleder", "pu leather": "Kunstleder", "faux leather": "Kunstleder",
    "genuine leather": "Echtleder", "real leather": "Echtleder", "stainless steel": "Edelstahl",
    "gift box": "Geschenkbox", "with box": "mit Box", "with gift box": "mit Geschenkbox",
    "without box": "ohne Box", "no box": "ohne Box",
    "no plug": "ohne Stecker", "without plug": "ohne Stecker", "eu plug": "EU-Stecker",
    "uk plug": "UK-Stecker", "us plug": "US-Stecker", "au plug": "AU-Stecker", "ch plug": "CH-Stecker",
    "plus size": "Übergrösse", "small size": "klein", "large size": "gross", "big size": "gross",
    "one size": "Einheitsgrösse", "free size": "Einheitsgrösse", "average size": "Einheitsgrösse",
    "standard size": "Standardgrösse", "extra large": "extra gross",
    "long sleeve": "Langarm", "long sleeves": "Langarm", "short sleeve": "Kurzarm",
    "short sleeves": "Kurzarm", "round neck": "Rundhals", "round collar": "Rundhals",
    "crew neck": "Rundhals", "o neck": "Rundhals", "v neck": "V-Ausschnitt",
    "stand collar": "Stehkragen", "standing collar": "Stehkragen",
    "turn down collar": "Umlegekragen", "turndown collar": "Umlegekragen",
    "high heel": "hoher Absatz", "high heels": "hoher Absatz", "flat heel": "flacher Absatz",
    "slope heel": "Keilabsatz", "wedge heel": "Keilabsatz", "thick heel": "Blockabsatz",
    "upgraded version": "Upgrade-Version", "upgrade version": "Upgrade-Version",
    "upgraded model": "Upgrade-Version", "enhanced version": "Upgrade-Version",
    "improved version": "Upgrade-Version", "standard version": "Standard-Version",
    "basic version": "Standard-Version", "basic model": "Standard-Version",
    "standard model": "Standard-Version", "battery version": "Batterie-Version",
    "battery model": "Batterie-Version", "charging version": "Akku-Version",
    "rechargeable version": "Akku-Version", "charging model": "Akku-Version",
    "remote control": "Fernbedienung", "with remote": "mit Fernbedienung",
    "with remote control": "mit Fernbedienung",
    "type c": "USB-C", "type-c": "USB-C",
    "plug in type": "Steckertyp", "plug-in type": "Steckertyp", "power plug": "Netzstecker", "new style": "neues Modell",
    "old style": "altes Modell",
    "shaver head": "Scherkopf", "replacement head": "Ersatzkopf", "replacement heads": "Ersatzköpfe",
    "guard comb": "Aufsteckkamm",
    "arch shape": "Bogenform", "curved shape": "geschwungene Form", "straight shape": "gerade Form",
    "round shape": "runde Form", "square shape": "eckige Form", "heart shape": "Herzform",
    "arch shape stamp": "Stempel Bogenform", "curved shape stamp": "Stempel geschwungen",
    "straight shape stamp": "Stempel gerade",
    "polka dot": "gepunktet", "polka dots": "gepunktet", "red rose": "Rote Rose",
    "leopard print": "Leopardenmuster", "floral print": "Blumenmuster", "flower print": "Blumenmuster",
    "single layer": "einlagig", "double layer": "doppellagig",
    "velvet lining": "Samtfutter", "with velvet lining": "mit Samtfutter",
    "fleece lining": "Fleecefutter", "with fleece lining": "mit Fleecefutter",
    "leather lining": "Lederfutter", "plush lining": "Plüschfutter", "with plush": "gefüttert",
    "chinese version": "chinesische Version", "english version": "englische Version",
    "thin style": "dünne Ausführung", "thick style": "dicke Ausführung",
    "short style": "kurze Ausführung", "long style": "lange Ausführung",
    # 23.09.: «Sole Length 11 CM» wurde «Sohle Länge 11 CM» (Nomen-Salat) — als Wendung gelesen.
    "sole length": "Sohlenlänge", "foot length": "Fusslänge",
    "fitted sheet": "Spannbettlaken", "flat sheet": "Bettlaken", "duvet cover": "Bettbezug",
    "quilt cover": "Bettbezug",
    "wood color": "Holzfarben", "wood colour": "Holzfarben", "flesh color": "Hautfarben",
    "skin color": "Hautfarben", "gradient color": "Farbverlauf", "titanium color": "Titanfarben",
}
# Einzelwoerter (klein geschrieben).
TERM = {
    "picture": WIE_ABGEBILDET, "box": "Box", "in": "in", "colors": "Farben", "colours": "Farben",
    # CJ «White-USB-Default» neben «White-USB-Box»: Default = Standardverpackung.
    "default": "Standard",
    "set": "Set", "sets": "Sets", "pcs": "Stück", "pc": "Stück", "pieces": "Stück", "piece": "Stück",
    "pair": "Paar", "pairs": "Paar",
    "with": "mit", "without": "ohne", "and": "und", "or": "oder",
    "leather": "Leder", "velvet": "Samt", "cotton": "Baumwolle", "linen": "Leinen", "silk": "Seide",
    "wool": "Wolle", "suede": "Wildleder", "plastic": "Kunststoff", "metal": "Metall",
    "steel": "Stahl", "wood": "Holz", "wooden": "Holz", "bamboo": "Bambus", "glass": "Glas",
    "ceramic": "Keramik", "silicone": "Silikon", "rubber": "Gummi", "acrylic": "Acryl",
    "crystal": "Kristall",
    "upgrade": "Upgrade", "upgraded": "Upgrade", "model": "Modell", "type": "Typ",
    "style": "Stil", "styles": "Stile", "classic": "klassisch", "new": "neu",
    "small": "klein", "medium": "mittel", "large": "gross", "big": "gross", "long": "lang",
    "short": "kurz", "thick": "dick", "thin": "dünn", "thickened": "verstärkt", "wide": "breit",
    "narrow": "schmal", "single": "einzeln", "double": "doppelt", "left": "links", "right": "rechts",
    "round": "rund", "square": "eckig", "flat": "flach",
    "women": "Damen", "women's": "Damen", "womens": "Damen", "woman": "Damen", "ladies": "Damen",
    "lady": "Damen", "female": "Damen", "men": "Herren", "men's": "Herren", "mens": "Herren",
    "man": "Herren", "male": "Herren", "kids": "Kinder", "kid": "Kinder", "children": "Kinder",
    "child": "Kinder", "children's": "Kinder", "girl": "Mädchen", "girls": "Mädchen",
    "boy": "Jungen", "boys": "Jungen", "adult": "Erwachsene", "adults": "Erwachsene",
    "battery": "Batterie", "rechargeable": "wiederaufladbar", "charging": "aufladbar",
    "wireless": "kabellos", "cable": "Kabel", "charger": "Ladegerät", "plug": "Stecker",
    "english": "Englisch", "german": "Deutsch", "interface": "Anschluss",
    "inch": "Zoll", "inches": "Zoll", "length": "Länge", "width": "Breite", "height": "Höhe",
    "diameter": "Durchmesser", "frame": "Rahmen", "pack": "Packung",
    "package": "Verpackung", "packaging": "Verpackung", "pillow": "Kissen",
    "pillowcase": "Kissenbezug", "pillowcases": "Kissenbezüge", "logo": "Logo",
    "typec": "USB-C", "plussize": "Übergrösse",
    "pattern": "Muster", "print": "bedruckt", "printed": "bedruckt", "printing": "bedruckt",
    "stripe": "gestreift", "stripes": "gestreift", "striped": "gestreift", "plaid": "kariert",
    "checked": "kariert", "checkered": "kariert", "floral": "geblümt", "flower": "geblümt",
    "flowers": "geblümt", "dot": "gepunktet", "dots": "gepunktet", "gradient": "Farbverlauf",
    "solid": "uni", "glitter": "Glitzer", "sequin": "Pailletten", "sequins": "Pailletten",
    "lace": "Spitze", "embroidered": "bestickt", "matte": "matt", "glossy": "glänzend",
    "gloss": "glänzend", "shiny": "glänzend", "mixed": "gemischt", "random": "zufällig",
    "colorful": "bunt", "colourful": "bunt", "multicolor": "bunt", "multicolour": "bunt",
    "heel": "Absatz", "sole": "Sohle", "collar": "Kragen", "sleeve": "Ärmel", "sleeveless": "ärmellos",
    "hood": "Kapuze", "hooded": "mit Kapuze", "lining": "Futter", "lined": "gefüttert",
    "stamp": "Stempel", "shape": "Form", "blade": "Klinge", "brush": "Bürste", "comb": "Kamm",
    "head": "Kopf", "heads": "Köpfe", "bronze": "Bronze", "birthstone": "Geburtsstein",
    "birthstones": "Geburtssteine", "golden": "Gold", "caramel": "Karamell", "olive": "Oliv",
}
# Begriffe aus TERM, die selbst eine FARBE sind (fuer Bindestrich-Verkettung «Bronze-Grün»).
FARB_TERM = {"bronze", "golden", "caramel", "olive"}
# Muster-Adjektive stehen im Deutschen HINTER der Farbe («Blau geblümt», wie farben_de.json).
MUSTER_ADJ = {"geblümt", "gestreift", "kariert", "gepunktet", "bedruckt", "bestickt", "matt", "glänzend"}
# Kleidungsstuecke — NIE uebersetzen, nur melden, wenn sie sich in einer Option widersprechen.
GARMENT = {
    "coat": "jacke", "jacket": "jacke", "blazer": "jacke", "parka": "jacke",
    "pants": "hose", "trousers": "hose", "leggings": "hose", "shorts": "hose", "jeans": "hose",
    "skirt": "rock", "dress": "kleid", "shirt": "oberteil", "tshirt": "oberteil",
    "t-shirt": "oberteil", "blouse": "oberteil", "top": "oberteil", "tops": "oberteil",
    "vest": "weste", "hoodie": "pullover", "sweater": "pullover", "sweatshirt": "pullover",
    "cardigan": "pullover", "jumpsuit": "overall", "romper": "overall", "bra": "bh",
}
TITEL_GRUPPE = {
    "jacke": r"jacke|mantel|blazer|parka|coat|jacket",
    "hose": r"hose|jeans|leggings|shorts|pants|trousers",
    "rock": r"\brock\b|röcke|skirt", "kleid": r"kleid|dress",
    "oberteil": r"shirt|bluse|top\b|oberteil|tunika|hemd", "weste": r"weste|vest",
    "pullover": r"pullover|hoodie|sweat|cardigan|strick", "overall": r"overall|jumpsuit|einteiler",
    "bh": r"\bbh\b|bra\b|bralette",
}
TITEL_SET = re.compile(r"(?i)\bset\b|zweiteil|2-teilig|zweiteilig|anzug|kombi|outfit|suit")

# Technische/markenhafte Woerter, die auf Deutsch gleich heissen (Schreibweise bleibt).
PASS = {"usb", "led", "lcd", "eu", "uk", "us", "au", "ch", "uv", "hd", "rgb", "ios", "android",
        "apple", "iphone", "ipad", "samsung", "airpods", "bluetooth", "wifi", "pro", "max", "plus",
        "mini", "ultra", "se", "gps", "nfc", "ac", "dc", "abs", "pvc", "pu", "tpu", "oled", "3d",
        "4k", "2k", "diy", "xxl", "premium", "deluxe", "lite", "unisex", "baby", "standard",
        "transparent", "camouflage", "leopard", "mesh", "fleece", "denim", "nylon", "canvas",
        "metallic", "neon", "retro", "vintage", "box", "version", "cm", "mm", "ml", "kg", "g",
        "oz", "m", "l", "w", "v", "mah", "gb", "tb", "x"}
UNIT = {"cm": "cm", "mm": "mm", "m": "m", "ml": "ml", "l": "l", "g": "g", "kg": "kg", "oz": "oz",
        "w": "W", "v": "V", "mah": "mAh", "gb": "GB", "tb": "TB", "inch": "Zoll", "inches": "Zoll"}

# Deutsche Woerter, die schon richtig sind (ein bereits eingedeutschter Wert darf nicht an
# einem «unbekannten» deutschen Wort scheitern — «Camouflage Grün»).
_DE_WURZEL = re.compile(r"(?i)(schwarz|weiss|rot|blau|grün|gruen|gelb|grau|braun|lila|violett|rosa|pink"
                        r"|orange|beige|khaki|gold|silber|türkis|bordeaux|creme|aprikose|oliv|mint)$")
DE_OK = {w.lower() for v in list(FD.values()) + list(TERM.values()) + list(TERM_PHRASES.values())
         for w in re.split(r"[\s\-]+", v) if w}
DE_OK |= {"modell", "muster", "farbe", "farben", "farbton", "stück", "paar", "gr.", "gr", "nr.",
          "einheitsgrösse", "damen", "herren", "kinder", "wie", "abgebildet", "und", "mit", "ohne",
          "rosé", "hell", "dunkel", "erhöht", "·", "in"}
# Englische Woerter, die zufaellig auf eine deutsche Farbwurzel enden.
KEINE_DE_WURZEL = {"carrot", "parrot", "marigold", "peppermint", "spearmint"}
# Woerter, die auf Englisch UND Deutsch gleich geschrieben werden — kein Grund anzufassen.
DE_GLEICH = {"pink", "khaki", "beige", "orange", "gold", "camel", "mint", "jade", "neon", "retro",
             "vintage", "warm", "sand", "rose", "set", "box", "standard", "transparent",
             "camouflage", "leopard", "mesh", "fleece", "denim", "metallic", "nylon", "canvas",
             "premium", "deluxe", "pro", "max", "plus", "mini", "ultra", "lite", "unisex", "baby",
             "upgrade", "version", "nude", "taupe", "bordeaux", "in", "an", "so", "top"}
EN_WOERTER = ({w for k in FD for w in k.split()} | set(_fz.GRUND) | set(_fz.BESTIMMUNG)
              | set(TERM) | {w for k in TERM_PHRASES for w in k.split()}) - DE_GLEICH
EN_WOERTER = {w for w in EN_WOERTER if len(w) >= 3 and not re.search(r"[äöüß]", w)} - DE_OK
EN_MUSTER = re.compile(r"(?i)^(?:set\d+|\d+(?:pcs|pc|cps|pieces|pairs?)|size\d+|\d{2}(?:to|or)\d{2}|\d+colou?rs?)$")

# «Marineblaublau» (82 Werte, 47 Produkte, gemessen 23.09.): phrase_de() setzt «navy»(=marineblau)
# + «blue»(=blau) als zwei Grundwoerter zusammen. Wer uebersetzt, repariert auch diese Verdopplung.
DOPPEL = re.compile(r"(?i)\b(\w*?)(schwarz|weiss|rot|blau|grau|braun|grün|gelb|gold|silber)\2\b")
# Dieselbe Verdopplung mit Bindestrich steht EINMAL in farben_de.json («coffee brown» →
# «Kaffeebraun-Braun»). Nur dieses Artefakt wird repariert — «Hellblau-Blau» kann ein echter
# Zweifarbwert sein (Oberteil/Unterteil) und bleibt.
DOPPEL_BINDESTRICH = re.compile(r"(?i)^(\w+(schwarz|weiss|rot|blau|grau|braun|grün|gelb))-\2$")
ARTEFAKTE = {v.lower(): DOPPEL_BINDESTRICH.sub(lambda m: m.group(1), v)
             for v in FD.values() if DOPPEL_BINDESTRICH.match(v)}


def _doppel_weg(s):
    s = DOPPEL.sub(lambda m: m.group(1) + m.group(2), s)
    return ARTEFAKTE.get(s.lower(), s)


def _vorbereiten(s):
    """Geklebte Lieferantenformen trennen, bevor Woerter gelesen werden."""
    s = s.replace('\xa0', ' ').replace('’', "'")
    # «Plus Size 3XL»: VOR den Groessenregeln, sonst wird daraus «Plus Gr. 3XL» (23.09., 5 Werte).
    s = re.sub(r"(?i)\bplus[\s-]*size\b", "plussize", s)
    # «US 14W … US 26W» sind US-Damengroessen (plus size), keine Watt (Pruefer 23.09.: 142 Werte in
    # 8 Produkten standen als «Hellblau-US 14 W»). Mit «US» davor ist die Lesart eindeutig → Marke.
    s = re.sub(r"(?i)\bus\s*(\d{1,2})\s*w\b", r"usgr\1w", s)
    s = re.sub(r"(?i)\bsize\s*(\d{2})\s*or\s*size\s*(\d{2})\b", r"\1or\2", s)   # «Size38 or Size39»
    # «44 or 45» → 44/45 — aber nur ein PAAR; «38 Or 40 Or 41mm» ist eine Aufzaehlung.
    if len(re.findall(r"(?i)\bor\b", s)) < 2:
        s = re.sub(r"(?i)\b(\d{2})\s+(to|or)\s+(\d{2})\b", r"\1\2\3", s)
    s = re.sub(r"(?i)\bsize\s+(\d{1,3}(?:[.,]\d)?)\b", r"size\1", s)          # «Size 38»
    s = re.sub(r"(?i)\b(\d+)\s+(pcs|pc|cps|pieces|piece|pairs?)\b", r"\1\2", s)  # «2 pcs»
    s = re.sub(r"(?i)\b(\d+)\s*-?\s*packs?\b", r"\1erpack", s)                # «2 Pack» → 2er-Pack
    s = re.sub(r"(?i)([a-z])(\d+(?:pcs|pc|cps)\b)", r"\1 \2", s)             # «Stamp3PCS»
    s = re.sub(r"(?i)\bno\.?\s*(\d{1,3})\s+colou?r\b", r"farbton\1", s)          # «No 2 Color»
    s = re.sub(r"(?i)\bcolou?r\s+(\d{1,3})\b", r"farbton\1", s)                  # «Color 11»
    s = re.sub(r"(?i)\b(c\d{1,3})\s+colou?r\b", r"farbton\1", s)                  # «C5 Color»
    # «4color set», «3Colors set» = ein Set aus N Farben (Anzahl, keine Nummer).
    s = re.sub(r"(?i)\b(\d{1,2})\s*colou?rs?\s+set\b", r"farbset\1", s)
    # «6 Colors» → «6Colors»: dieselbe Kontextregel wie die geklebte Form (Nummer oder Anzahl).
    s = re.sub(r"(?i)\b(\d{1,3})\s+(colou?rs?)\b", r"\1\2", s)
    s = re.sub(r"(?i)\bno\.?\s*(\d+)\b", r"nr\1", s)                           # «No 7» → Nr. 7
    # «Style 1», «Style A», «26 Style», «Q Style» = Ausfuehrungsnummer → wie STYLENR «Muster N».
    s = re.sub(r"(?i)\bstyles?\s*(\d{1,3})\b", r"musternr\1", s)
    s = re.sub(r"\b[Ss]tyles?\s+([A-Z])\b", r"musternr\1", s)
    s = re.sub(r"(?i)\b(\d{1,3})\s*styles?\b(?!\s+set)", r"musternr\1", s)
    s = re.sub(r"\b([A-Z])\s+[Ss]tyles?\b", r"musternr\1", s)
    s = re.sub(r"(?i)\bsize\s+(xxs|xs|s|m|l|xl|xxl|xxxl|\dxl)\b", r"gr.\1", s)
    s = re.sub(r"(?i)\b(?:increased?|heightening)(?:\s+by)?\s+(\d+)\s*cm\b", r"erhöht \1cm", s)
    s = re.sub(r"(?i)\b(\d+)\s*styles?\s+set\b", r"stilset\1", s)             # «3style Set»
    # Farbwoerter, die ihr Grundwort schon enthalten: navy = marineBLAU, wine = weinROT,
    # coffee = kaffeeBRAUN. «Dark Navy Blue» wurde sonst «Dunkelmarineblau Blau».
    s = re.sub(r"(?i)\bnavy\s+blue\b", "navy", s)
    s = re.sub(r"(?i)\bwine\s+red\b", "wine", s)
    s = re.sub(r"(?i)\bcoffee\s+brown\b", "coffee", s)
    return s


# ══ WORTKLASSEN UND SATZBAU-WACHE (23.09.2026, Nachbesserung) ══════════════════════════════
# DER BEFUND (Pruefer 23.09., nach dem Vollscan über 50'009 Produkte): «nur wenn JEDES Wort
# bekannt ist» genuegte nicht. Jedes Wort war bekannt — und heraus kam Wort-fuer-Wort-Salat:
#   «USB plug in version» → «USB Stecker in version»      (Praeposition + englischer Rest)
#   «Brown Single Lining» → «Braun einzeln Futter»         (ungebeugtes Adjektiv vor Nomen)
#   «4CM Thick Sole Green» → «4 cm dick Sohle Grün»,  «Short Length S» → «Kurz Länge S»
#   «Colorful Packaging» → «Bunt Verpackung»,  «Square Pillow» → «Eckig Kissen»
#   «Leather Pink» (ein FARBNAME, UV-Shirt) → «Leder Pink» (liest sich als Material)
#   «Bamboo Green» → «Bambus Grün»,  «Classic Black» → «Klassischschwarz» (geklebt)
# Deutsch beugt Adjektive vor Nomen («einfaches Futter», «dicke Sohle») — ein Uebersetzer ohne
# Genus kann das nicht. Deshalb liest jetzt jede Uebersetzung eine WORTKLASSE je Einheit mit, und
# eine Satzbau-Wache verwirft Folgen, die im Deutschen nicht stehen koennen. Verworfen heisst:
# der Wert bleibt, wie er war (englisch) — lieber Englisch als falsches Deutsch.
#
# Klassen: C Farbe · CN farbartiges Nomen (Farbverlauf, Glitzer, Muster) · Z neutral (Zahl, Code,
# Groesse, Mass, Technik, Marke) · ZL Etikett+Nummer (Gr. 35, Set 1, Muster A) · ZG Zielgruppe/
# Sprache (Damen, Englisch) · Q Menge (2 Stück) · A Adjektiv · AS Groessen-Adj. (klein/gross)
# · AM Muster-Adj. (geblümt, matt) · N Nomen · NF kuratierte Wendung (Langarm, Rundhals, mit Box)
# · NS Set · NM Massnomen (Länge — braucht eine Zahl) · MAT Material · P Lehnwort (Mesh, PU)
# · PM Modellzusatz (Pro, Max, Plus — nur hinter einem Modell) · F und/oder/mit/ohne · FP «mit X»
# · IN Praeposition «in» (nur in «2 in 1») · «·» Mengentrenner.
A_KL = ("A", "AS", "AM")
KL_MAT = {"leder", "samt", "baumwolle", "leinen", "seide", "wolle", "wildleder", "kunststoff", "metall",
          "stahl", "holz", "bambus", "glas", "keramik", "silikon", "gummi", "acryl", "kristall", "spitze",
          "lackleder", "kunstleder", "echtleder", "edelstahl"}
KL_NM = {"länge", "breite", "höhe", "durchmesser", "sohlenlänge", "fusslänge"}
KL_NS = {"set", "sets"}
KL_ZG = {"damen", "herren", "kinder", "mädchen", "jungen", "erwachsene", "englisch", "deutsch", "baby", "unisex"}
KL_CN = {"farbverlauf", "glitzer", "pailletten", "leopardenmuster", "blumenmuster", "camouflage", "leopard"}
KL_AS = {"klein", "gross", "mittel", "extra gross"}
KL_AM = set(MUSTER_ADJ) | {"uni"}
KL_P = {"mesh", "pu", "transparent", "premium", "deluxe", "standard", "version", "fleece", "denim", "nylon",
        "canvas", "metallic", "neon", "retro", "vintage", "upgrade", "top", "warm"}
KL_PM = {"pro", "max", "plus", "mini", "ultra", "lite", "se"}
KL_C = {"wie abgebildet", "farben gemischt", "farbe zufällig", "holzfarben", "hautfarben",
        "titanfarben", "rote rose", "bronze", "gold", "karamell", "oliv", "rose", "camel", "nude", "taupe",
        "jade", "mint", "sand", "khaki", "beige", "orange", "pink", "bordeaux"}
KL_Z_TECH = {"usb", "led", "lcd", "eu", "uk", "us", "au", "ch", "uv", "hd", "rgb", "ios", "android", "apple",
             "iphone", "ipad", "samsung", "airpods", "bluetooth", "wifi", "gps", "nfc", "ac", "dc", "abs",
             "pvc", "tpu", "oled", "3d", "4k", "2k", "diy", "xxl", "x", "usb-c", "übergrösse",
             "einheitsgrösse", "standardgrösse", "zoll"}
# Kurzwoerter, die in Grossbuchstaben gehoeren («usb charging» → «USB aufladbar»).
AKRONYM = {"usb", "led", "lcd", "eu", "uk", "us", "au", "ch", "uv", "hd", "rgb", "gps", "nfc", "ac", "dc",
           "abs", "pvc", "pu", "tpu", "oled", "diy", "3d", "4k", "2k"}
# Lehnwoerter sind im Deutschen Nomen → gross («Schwarz mesh» → «Schwarz Mesh»).
LEHN_GROSS = {"mesh", "fleece", "denim", "nylon", "canvas", "version", "premium", "deluxe", "standard",
              "upgrade", "camouflage", "leopard", "metallic", "neon", "retro", "vintage", "pro", "max",
              "plus", "mini", "ultra", "lite"}
# Bestimmungswoerter, die ALLEIN als Farbname taugen (phrase_de gibt sonst z. B. «Armee» aus).
EINZELFARBE_OK = {"karamell", "oliv", "pfirsich", "sand", "anthrazit", "mint", "jade", "flieder", "creme",
                  "jeans", "honig", "senf", "koralle", "champagner", "camel"}
_BESTIMMUNG_WERTE = {v.lower() for v in _fz.BESTIMMUNG.values()} - {v.lower() for v in _fz.GRUND.values()}
# farben_de.json-Eintraege mit englischem Rest («washed black» → «Schwarz washed»): nicht verwenden.
NEUTRUM_FARBE = re.compile(r"(?i)(schwarz|weiss|rot|blau|grün|gelb|grau|braun|lila|violett|rosa|pink|orange"
                           r"|beige|khaki|gold|silber|türkis|bordeaux|oliv)$")
# Vorderteile, die ein Wort mit deutscher Farbwurzel wirklich deutsch machen. «andKhaki» (Lieferant
# vergass ein Leerzeichen) und «16Mint» endeten auf «khaki»/«mint» und wurden als Deutsch
# durchgereicht (23.09.: «Blau andKhaki Rosarot Set-USB» stand im Shop).
DE_PRAEFIX = ({v.lower() for v in _fz.BESTIMMUNG.values()} | {v.lower() for v in _fz.GRUND.values()}
              | {"rosé", "purpur", "petrol", "pastell", "zart", "tief", "knall", "perl",
                                     "eis", "nacht", "tannen", "moos", "himmel", "marine", "alt", "hell", "dunkel"})


def _de_farbwort(k):
    m = _DE_WURZEL.search(k)
    if not m or k in KEINE_DE_WURZEL:
        return False
    vorn = k[:m.start()]
    return vorn == "" or vorn in DE_PRAEFIX or vorn in DE_OK


FD_UNBRAUCHBAR = {k for k, v in FD.items() if re.search(r"\b(washed|color|colour)\b", v, re.I)}
DE_OK.discard("washed")                              # stand nur wegen «Schwarz washed» in DE_OK


def _klasse_de(text):
    """Wortklasse eines deutschen Ergebnisses aus den Tabellen (TERM, TERM_PHRASES, Durchreiche)."""
    k = text.lower().strip()
    if k in ("mit", "ohne", "und", "oder"):
        return "F"
    if k in ("in", "an", "so"):
        return "IN"
    if k.startswith(("mit ", "ohne ")):
        return "FP"
    if k in KL_C:
        return "C"
    if k in KL_CN:
        return "CN"
    if k in KL_MAT:
        return "MAT"
    if k in KL_NM:
        return "NM"
    if k in KL_NS:
        return "NS"
    if k in KL_ZG:
        return "ZG"
    if k in KL_Z_TECH:
        return "Z"
    if k in KL_P:
        return "P"
    if k in KL_PM:
        return "PM"
    if k in KL_AS:
        return "AS"
    if k in KL_AM:
        return "AM"
    if _DE_WURZEL.search(k) and k not in KEINE_DE_WURZEL and " " not in k:
        return "C"
    if text[:1].islower():
        return "A"
    return "N"


def _farbe_fein(t):
    """Nachbehandlung einer Farbeinheit. → Text oder None (dann gilt die Einheit als unbekannt).
    «Klassischschwarz» (phrase_de klebt classic+black) war falsch: Farbnamen sind im Deutschen
    Neutra, ein Adjektiv davor wird gebeugt → «Klassisches Schwarz», «Leuchtendes Rot».
    Lehnwoerter bleiben ungebeugt und bekommen den Bindestrich wie in farben_de.json («Retro-Blau»)."""
    m = re.fullmatch(r"(Klassisch|Leuchtend)([a-zäöüé]+)", t)
    if m:
        # «das Schwarz», «das Rot» — Farbadjektive als Nomen sind Neutra. «die Aprikose» nicht:
        # «Leuchtendes Aprikose» waere falsch → unbekannt, der Wert bleibt englisch.
        if not NEUTRUM_FARBE.search(m.group(2)):
            return None
        return f"{m.group(1)}es {m.group(2).capitalize()}"
    m = re.fullmatch(r"(Retro|Vintage)([a-zäöüé]+)", t)
    if m:
        return f"{m.group(1)}-{m.group(2).capitalize()}"
    if re.match(r"(?i)kühl", t):                     # «cool white» ist «Kaltweiss», nicht «Kühlweiss»
        return None
    if re.match(r"(Klassisch|Leuchtend|Retro|Vintage)[a-zäöüé]", t):
        return None                                  # geklebt und nicht aufloesbar («Leuchtendrosé-Pink»)
    if t.lower() in _BESTIMMUNG_WERTE and t.lower() not in EINZELFARBE_OK:
        return None                                  # «Army Color» → «Armee» ist kein Farbname
    return t


def _satzbau(units):
    """Prueft die Klassenfolge eines Stuecks. → None (gut) oder der Grund der Ablehnung."""
    ks = [k for _, k in units]
    n = len(ks)
    for i, k in enumerate(ks):
        if k == "·":
            continue
        prev = ks[i - 1] if i > 0 and ks[i - 1] != "·" else None
        nxt = ks[i + 1] if i + 1 < n and ks[i + 1] != "·" else None
        if prev in A_KL:
            if k in A_KL:
                # «klein kariert», «breit gestreift» ja — «einzeln gestreift», «rund gepunktet» nein
                if not (k == "AM" and units[i - 1][0].lower() in ("klein", "gross", "breit", "schmal", "fein")):
                    return "adjektivfolge"
            elif k not in ("Z", "Q", "F", "FP"):
                return "adjektiv-vor-nomen"                   # «Eckig Kissen», «Gross Weiss», «dick Sohle»
        if k == "IN":
            zwei_in_eins = (prev == "Z" and nxt == "Z" and re.fullmatch(r"\d+", units[i - 1][0])
                            and re.fullmatch(r"\d+", units[i + 1][0]))
            in_farbe = units[i][0].lower() == "in" and prev is not None and nxt == "C"   # «Rundhals in Schwarz»
            if not (zwei_in_eins or in_farbe):
                return "praeposition"                         # «Stecker in version», «11 cm in»
        if prev == "Q" and k in ("N", "NM", "NS", "MAT", "NF", "CN", "P", "ZL", "PM"):
            return "menge-vor-nomen"                          # «2 Stück Ladegerät», «3 Stück Set»
        if prev in ("N", "NS", "MAT", "NF", "NM") and k in ("N", "NM", "NS", "MAT", "NF"):
            return "nomen-nomen"                              # «Sohle Länge», «Box Set»
        if prev == "MAT" and k in ("C", "CN", "P"):
            return "material-vor-farbe"                       # «Leder Pink» (Farbname), «Bambus Grün»
        if prev == "N" and k in ("C", "CN", "P"):
            return "nomen-vor-farbe"                          # «Rahmen Silber»
        if prev in ("NF", "NS", "NM") and k == "P":
            return "nomen-lehnwort"                           # «Fernbedienung Version»
        if prev == "P" and k in ("N", "MAT", "NM", "CN", "P", "NF"):
            return "lehnwort-vor-nomen"                       # «Transparent Stil», «Leopard Rahmen»
        if prev == "CN" and k in ("N", "MAT", "CN", "NF", "P", "NM"):
            return "muster-vor-nomen"
        if prev == "C" and units[i - 1][0].startswith(("Klassisches ", "Leuchtendes ")) \
                and k in ("N", "MAT", "NS", "NF", "CN", "P"):
            return "gebeugte-farbe-vor-nomen"                 # «Leuchtendes Schwarz Rahmen»
        if prev == "FP" and k not in ("Z", "Q", "ZL", "F"):
            return "wendung-vor-nomen"                        # «mit Kapuze Leuchtendes Blau»
        if k == "PM" and prev not in ("Z", "PM", "ZL") and not (prev is None and nxt in (None, "Z")):
            return "modellzusatz"                             # «Pink plus Baumwolle» (aber «Schwarz-Plus», «SE 2020»)
        if k == "NM" and nxt not in ("Z", "Q"):
            return "mass-ohne-zahl"                           # «Kurz Länge S»
        if k == "F":
            if units[i][0].lower() in ("und", "oder") and prev is None:
                return "konjunktion-am-anfang"
            if nxt is None or nxt in A_KL or nxt in ("F", "IN"):
                return "funktionswort"
    return None


def option_kontext(namen):
    """Kontext EINER Option fuer die Uebersetzung. Heute: sind «NColor»-Werte FARBNUMMERN?
    ⚠️ 23.09.: «1color … 12color» (Sommeroben, 26 Werte) wurde «1 Farbe … 12 Farben» — es sind
    Farbnummern. Die erste Korrektur kannte nur die fuehrende Null («018Color»). Jetzt entscheidet
    die Option: tragen mindestens zwei Werte eine NColor-Angabe und liegen die Nummern dicht
    (1..12, 10..17 — nicht 8/16), ist es eine NUMMERIERUNG → «Farbton N». Sonst gilt nur die
    Mehrzahl als Anzahl («16colors» = 16 Farben); eine Einzahl ohne Reihe bleibt, wie sie ist."""
    nr, stimmig = set(), True
    for v in namen:
        for m in re.finditer(r"(?i)(?<![\d.])(\d{1,2})(\s*)colou?r(s?)\b(?!\s+set)", v or ""):
            if not m.group(1).startswith("0"):
                nr.add(int(m.group(1)))
                # «1 Color» / «2 Colors» mit Leerzeichen und passender Einzahl/Mehrzahl kann ebenso
                # «einfarbig / zweifarbig» heissen — dann ist die Reihe KEIN Beleg fuer eine Nummer.
                if not (m.group(2) and (m.group(3) == "s") == (int(m.group(1)) != 1)):
                    stimmig = False
    reihe = len(nr) >= 2 and (max(nr) - min(nr) + 1) <= 2 * len(nr)
    # 23.09. abends: nacktes «14W/16W/18W» (US-Damengroessen ohne «US») nur dann als Groesse lesen,
    # wenn die Option eine Reihe GERADER Zahlen 12–34 mit grossem W zeigt und kein Wattwort traegt
    # (Ladegeraet «18W/20W/30W» bleibt Watt). Mit «US» davor entscheidet _vorbereiten allein.
    wn, watt = set(), False
    for v in namen:
        for m in re.finditer(r"(?<![\d.])(\d{2})W\b", v or ""):
            wn.add(int(m.group(1)))
        if re.search(r"(?i)charg|plug|led\b|lamp|bulb|power|light|adapter|solar|speaker|motor|watt", v or ""):
            watt = True
    gerade = {n for n in range(12, 35, 2)}
    groesse_w = len(wn) >= 2 and wn <= gerade and not watt
    return {"farbnummer": reihe and not stimmig, "mehrdeutig": reihe and stimmig, "groesse_w": groesse_w}


def _token_de(t, kx=None):
    """Ein Wort → (Deutsch, Klasse) oder (None, None). Klasse 'Q' (Menge) bekommt ein « · » davor."""
    kx = kx or {}
    m = re.match(r"^([(\[]*)(.*?)([)\].:;!]*)$", t)
    vor, kern, nach = m.group(1), m.group(2), m.group(3)
    if not kern:
        return t, "Z"
    k = kern.lower()

    def w(x, kl):
        return vor + x + nach, kl
    if k in TERM:
        return w(TERM[k], TERM_KLASSE.get(k) or _klasse_de(TERM[k]))
    if DOPPEL.fullmatch(kern):                       # «Marineblaublau» → «Marineblau»
        return w(_doppel_weg(kern), "C")
    if k in AKRONYM:                                 # vor DE_OK: «usb» steht dort (aus «USB-C»)
        return w(kern.upper(), "Z")
    if re.fullmatch(r"[A-Za-z]", kern):              # «C Set», «Typ A»: Buchstabe = Code, kein Nomen
        return w(kern, "Z")
    if k in DE_OK or _de_farbwort(k) or re.search(r"[äöüÄÖÜ]", kern):
        if k == "·":
            return w(kern, "·")
        if k in ("gr.", "gr", "nr."):
            return w(kern, "Z")
        kl = _klasse_de(kern)
        if (kl == "C" or k in LEHN_GROSS) and kern.islower():   # «bordeaux beige» → «Bordeaux-Beige»
            kern = kern.capitalize()
        return w(kern, kl)
    if k in PASS or k in DE_GLEICH:
        kl = _klasse_de(kern)
        if kl in ("N", "A"):                         # durchgereichtes Fachwort («iPhone», «cm», «x»)
            kl = "Z"
        if kl == "C" and kern.islower():             # «Purple sand» → «Lila-Sand»
            kern = kern.capitalize()
        if k in LEHN_GROSS and kern.islower():
            kern = kern.capitalize()
        return w(kern, kl)
    if re.fullmatch(r"\d+(?:[.,/]\d+)?", k) or re.fullmatch(r"#\d+", k) or re.fullmatch(r"gr\.?\d+", k):
        return w(kern, "Z")
    # Lieferantencode mit fuehrender Null («0236L») ist kein Liter.
    if re.fullmatch(r"0\d+[A-Za-z]{1,3}", kern):
        return w(kern, "Z")
    x = re.fullmatch(r"(\d+(?:[.,]\d+)?)[x×*](\d+(?:[.,]\d+)?)(?:[x×*](\d+(?:[.,]\d+)?))?(cm|mm|m)?", k)
    if x:
        mass = "x".join(g for g in x.groups()[:3] if g)
        return w(mass + (" " + x.group(4) if x.group(4) else ""), "Z")
    if re.fullmatch(r"(?:\d?x{0,5}[sl]|m|x{1,5}l|\d{1,2}xl|\d?xs|xxs)", k):
        return w(kern.upper(), "Z")
    x = re.fullmatch(r"usgr(\d{1,2})w", k)                      # Marke aus _vorbereiten: «US 14W»
    if x:
        return w(f"US {x.group(1)}W", "Z")
    x = re.fullmatch(r"(\d+(?:[.,]\d+)?)(cm|mm|m|ml|l|g|kg|oz|w|v|mah|gb|tb|inch|inches|in)", k)
    if x:
        # «37M», «42L» mit GROSSEM Buchstaben sind eher Groessen als Meter/Liter → stehen lassen.
        # «16W» ohne «US» ist eine Groesse, wenn die OPTION eine Groessenreihe zeigt (option_kontext).
        if x.group(2) == "w" and kern[-1] == "W" and kx.get("groesse_w") and x.group(1).isdigit():
            return w(kern, "Z")
        if x.group(2) in ("m", "l") and kern[-1].isupper() and "." not in kern and "," not in kern:
            return w(kern, "Z")
        # «2.4G», «5G» = Funkstandard; «64g», «128g» = Speicher (Zweierpotenz) — keine Gramm.
        # (23.09.: «X2 Blue 128g charging model» stand kurz als «128 g» im Auswahlfeld, repariert.)
        if x.group(2) == "g" and (kern[-1] == "G" or x.group(1) in ("16", "32", "64", "128", "256", "512", "1024")):
            return w(kern, "Z")
        return w(f"{x.group(1)} {UNIT.get(x.group(2), 'Zoll')}", "Z")
    x = re.fullmatch(r"(\d+)(?:pcs|pc|cps|pieces|piece)", k)
    if x:
        return w(f"{x.group(1)} Stück", "Q")
    x = re.fullmatch(r"(\d+)erpack", k)
    if x:
        return w(f"{x.group(1)}er-Pack", "Q")
    x = re.fullmatch(r"(\d+)pairs?", k)
    if x:
        return w(f"{x.group(1)} Paar", "Q")
    x = re.fullmatch(r"set(\d+)", k)
    if x:
        return w(f"Set {x.group(1)}", "ZL")
    x = re.fullmatch(r"stilset(\d+)", k)
    if x:
        return w(f"Set mit {x.group(1)} Varianten", "NF")
    x = re.fullmatch(r"farbset(\d+)", k)
    if x and int(x.group(1)) >= 2:
        return w(f"Set mit {x.group(1)} Farben", "NF")
    x = re.fullmatch(r"size(\d{1,3}(?:[.,]\d)?)", k)
    if x:
        return w(f"Gr. {x.group(1)}", "ZL")
    x = re.fullmatch(r"(\d{2})(?:to|or)(\d{2})", k)
    if x:
        return w(f"{x.group(1)}/{x.group(2)}", "Z")
    # ⚠️ 23.09.: «018Color» mit FUEHRENDER NULL ist die Farbnummer des Lieferanten, keine Anzahl —
    # im ersten scharfen Lauf stand «018 Farben» im Auswahlfeld (repariert).
    # ⚠️ 23.09. (Nachbesserung): auch OHNE Null ist «NColor» meist eine Nummer — «1color … 12color»
    # stand als «1 Farbe … 12 Farben» im Shop. Entschieden wird am Optionskontext (option_kontext):
    # dichte Reihe → «Farbton N»; sonst nur die MEHRZAHL als Anzahl; Einzahl allein → unveraendert.
    # Drei- und mehrstellig («122930color») ist ein Lieferantencode → unveraendert.
    x = re.fullmatch(r"(0\d+)colou?rs?", k)
    if x:
        return w(f"Farbton {x.group(1)}", "ZL")
    x = re.fullmatch(r"(\d+)(colou?rs?)", k)
    if x:
        zahl, mehrzahl = x.group(1), x.group(2).endswith("s")
        if len(zahl) >= 3 or kx.get("mehrdeutig"):
            return None, None
        if kx.get("farbnummer"):
            return w(f"Farbton {zahl}", "ZL")
        if mehrzahl and int(zahl) >= 2:
            return w(f"{zahl} Farben", "Q")
        return None, None
    x = re.fullmatch(r"(\d+)speeds?", k)
    if x:
        return w(f"{x.group(1)} Stufen", "Z")
    x = re.fullmatch(r"nr(\d+)", k)
    if x:
        return w(f"Nr. {x.group(1)}", "ZL")
    x = re.fullmatch(r"farbton(c?\d{1,3})", k)
    if x:
        return w(f"Farbton {x.group(1).upper()}", "ZL")
    x = re.fullmatch(r"musternr(\w{1,3})", k)
    if x:
        return w(f"Muster {x.group(1).upper()}", "ZL")
    x = re.fullmatch(r"gr\.(xxs|xs|s|m|l|xl|xxl|xxxl|\dxl)", k)
    if x:
        return w(f"Gr. {x.group(1).upper()}", "ZL")
    # Modell-/Artikelcodes des Lieferanten («A026», «L01S», «0236L», «2513»): bleiben stehen.
    if re.fullmatch(r"[A-Z]{0,3}\d{1,6}[A-Z]{0,3}", kern) or re.fullmatch(r"[A-Z]", kern):
        return w(kern, "Z")
    return None, None


def _stueck_de(seg, kx=None):
    """Ein Stueck ohne Trenner → (Deutsch|None, unbekannte Woerter).
    Jede Einheit traegt ihre Wortklasse; am Ende prueft _satzbau() die Folge (siehe oben)."""
    toks = seg.split()
    units, unbekannt, i = [], [], 0      # units: [text, klasse]
    while i < len(toks):
        treffer = None
        # «Light Rose Red» → Hellrosarot: Bestimmungswort + bekannte Farbphrase = ein Kompositum.
        mod = MODIF.get(toks[i].lower())
        # farben_de.json hat Vorrang, wo es die ganze Phrase kennt («dark army green» →
        # «Dunkles Armeegrün») — dieselbe Tabelle, dieselbe Schreibweise wie die Geschwister.
        if mod and any(" ".join(toks[i:j]).lower() in FD for j in range(i + 2, min(len(toks), i + 5) + 1)):
            mod = None
        if mod and i + 1 < len(toks):
            for j in range(min(len(toks), i + 4), i + 1, -1):
                span = " ".join(toks[i + 1:j]); key = span.lower()
                # Mehrwortige Phrasen nur aus farben_de.json — «Deep Coffee Purple» wurde sonst
                # «Dunkelkaffeelila» (phrase_de klebt coffee+purple, der Modifikator davor).
                f = (FD.get(key) if key not in FD_UNBRAUCHBAR else None) or \
                    (_fz.phrase_de(span) if j == i + 2 and re.fullmatch(r"[A-Za-z]+", span) else None)
                if f and " " not in f and "-" not in f and not f.lower().startswith(("hell", "dunkel")):
                    treffer = (j, (mod + _doppel_weg(f).lower()).capitalize(), "C"); break
        for j in (range(min(len(toks), i + 5), i, -1) if treffer is None else ()):
            span = " ".join(toks[i:j])
            key = span.lower().strip("()[]")
            if j - i > 1 and key in TERM_PHRASES:
                kl = PHRASE_KLASSE.get(key) or _klasse_de(TERM_PHRASES[key])
                if kl == "N" or (kl == "A" and " " in TERM_PHRASES[key]):
                    kl = "NF"                        # kuratierte Wendung («Langarm», «hoher Absatz»)
                treffer = (j, TERM_PHRASES[key], kl); break
            if key in FD and key not in FD_UNBRAUCHBAR:
                # Einschritt-Vorschau: «Black Rose Gold» ist Schwarz + Roségold, nicht
                # Schwarz-Rosé + Gold. Bildet das letzte Wort mit dem naechsten eine eigene
                # Farbphrase und bleibt der Rest uebersetzbar, wird kuerzer geschnitten.
                if j - i >= 2 and j < len(toks):
                    nach = " ".join(toks[j - 1:j + 1]).lower()
                    rest = " ".join(toks[i:j - 1]).lower()
                    if nach in FD and (rest in FD or _fz.phrase_de(" ".join(toks[i:j - 1]))):
                        continue
                treffer = (j, _doppel_weg(FD[key]), "C"); break
            if j - i <= 3 and re.fullmatch(r"[A-Za-z ]+", span):
                # Zwei GRUNDwoerter ohne Eintrag in farben_de.json («Navy White», «Blue Pink»):
                # phrase_de klebt sie zusammen («Marineblauweiss»). farben_de.json schreibt solche
                # Paare mit Bindestrich («Schwarz-Weiss») — also einzeln lesen, unten verbinden.
                ws = span.lower().split()
                if len(ws) == 2 and all(x in _fz.GRUND for x in ws):
                    continue
                d = _fz.phrase_de(span)
                if d:
                    treffer = (j, _doppel_weg(d), "C"); break
        if treffer is None:
            k0 = toks[i].lower()
            # «Mocha Color» ist unbekannt, aber «Sand Color» nach einer Farbe ist nur Fuellwort.
            if k0 in ("color", "colour") and units and units[-1][1] == "C":
                i += 1; continue
            r, kl = _token_de(toks[i], kx)
            if r is None:
                unbekannt.append(toks[i]); i += 1; continue
            if k0 in FARB_TERM:
                kl = "C"
            # «11 CM» → «11 cm» — aber nur HINTER einer Zahl («Weiss-ML», «MM» sind Groessen, 23.09.).
            if k0 in ("cm", "mm", "ml", "kg", "mah") and units and re.fullmatch(r"[\d.,/x]+", units[-1][0]):
                r = {"mah": "mAh"}.get(k0, k0)
            treffer = (i + 1, r, kl)
        j, r, kl = treffer
        if kl == "C":
            r = _farbe_fein(r)
            if r is None:
                unbekannt.append(" ".join(toks[i:j])); i = j; continue
        # «·» nur vor Stueckzahlen («Schwarz · 2 Stück»), nicht vor «17 Farben» und nicht nach «und».
        if kl == "Q" and units and units[-1][1] != "F" and not r.endswith("Farben"):
            units.append(["·", "·"])
        if kl == "C" and units and units[-1][1] == "C":
            if units[-1][0].split("-")[-1].lower() != r.lower():   # «Blue blue» → nicht «Blau-Blau»
                units[-1][0] = units[-1][0] + "-" + r      # «Senfgrün-Grau», «Schwarz-Roségold»
        elif kl == "C" and units and units[-1][1] == "A" and units[-1][0].lower() in ("klassisch", "leuchtend"):
            units[-1] = [units[-1][0].capitalize() + "es " + r, "C"]   # «Classic Dark Blue» → «Klassisches Dunkelblau»
        elif kl == "C" and units and units[-1][1] in A_KL and units[-1][0].lower() in MUSTER_ADJ:
            adj = units.pop()                                 # «Flower Blue» → «Blau geblümt»
            if units and units[-1][1] == "C":                 # «Navy Printed Yellow» → «Marineblau-Gelb bedruckt»
                units[-1][0] = units[-1][0] + "-" + r         # (sonst verbindet erst der naechste Lauf → Ping-Pong)
            else:
                units.append([r, "C"])
            units.append([adj[0].lower(), "AM"])
        elif kl == "C" and units and units[-1][1] == "P" and units[-1][0].lower() in ("retro", "vintage"):
            units[-1] = [units[-1][0].capitalize() + "-" + r, "C"]    # wie farben_de.json «Retro-Blau»
        else:
            units.append([r, kl])
        i = j
    if unbekannt:
        return None, unbekannt
    grund = _satzbau(units)
    if grund:
        return None, ["⟨satzbau:" + grund + "⟩"]
    return " ".join(u[0] for u in units), []


MODIF = {"light": "hell", "dark": "dunkel", "deep": "dunkel", "pale": "blass", "bright": "leuchtend",
         "middle": "mittel"}
TRENNER = re.compile(r"(\s*-\s*|\s*\+\s*|\s*,\s*|\s*/\s*|\s*&\s*)")
SCHUTZ = [("t-shirt", "tshirt"), ("type-c", "typec"), ("v-neck", "v neck"), ("wi-fi", "wifi")]
# Klassen, die sich nicht aus der Schreibweise ergeben (Rest: _klasse_de).
# «bunt» ist ein ADJEKTIV: allein ein guter Farbwert («Bunt»), vor einem Nomen falsch («Bunt Verpackung»).
TERM_KLASSE = {"picture": "C", "colorful": "A", "colourful": "A", "multicolor": "A", "multicolour": "A",
               "gradient": "CN", "plussize": "Z", "golden": "C", "bronze": "C", "caramel": "C", "olive": "C",
               "default": "Z", "typec": "Z", "in": "IN", "colors": "N", "colours": "N"}
PHRASE_KLASSE = {"gradient color": "CN", "wood color": "C", "wood colour": "C", "flesh color": "C",
                 "skin color": "C", "titanium color": "C", "red rose": "C",
                 "polka dot": "AM", "polka dots": "AM", "leopard print": "CN", "floral print": "CN",
                 "flower print": "CN"}


def wert_de(v, kx=None):
    """Uebersetzt einen ganzen Optionswert. → (neu|None, unbekannte Woerter).
    None heisst: unveraendert lassen (unbekanntes Wort, verworfener Satzbau oder nichts zu tun).
    kx: Kontext der Option (option_kontext) — ohne ihn gilt eine NColor-Einzahl als unklar."""
    if (v or "").strip().lower() in ARTEFAKTE:
        return ARTEFAKTE[(v or "").strip().lower()], []
    # «1 3 6color» = Farben Nr. 1, 3 und 6 (Lippenstift-Kombi) — keine Anzahl, nicht raten.
    if re.search(r"(?i)(?<![\d.])\d{1,2}\s+\d{1,2}\s*colou?rs?\b", v or ""):
        return None, ["⟨farbnummern-folge⟩"]
    s = _vorbereiten(v or "")
    for a, b in SCHUTZ:
        s = re.sub(re.escape(a), b, s, flags=re.I)
    teile = TRENNER.split(s)
    out, unbekannt = [], []
    for idx, t in enumerate(teile):
        if idx % 2 == 1:            # Trenner — bleibt, wie er war
            out.append(t); continue
        if not t.strip():
            out.append(t); continue
        d, u = _stueck_de(t.strip(), kx)
        if d is None:
            unbekannt += u; continue
        # Jedes Stueck ist ein eigenes Merkmal («Schwarz-Klein», «Keilabsatz-Weiss»): gross
        # beginnen — aber nur, wenn das erste Wort UEBERSETZT wurde («iPhone» bleibt «iPhone»).
        erstes_alt = t.strip().split()[0] if t.strip() else ""
        if d and d[0].islower() and d.split()[0] != erstes_alt:
            d = d[0].upper() + d[1:]
        out.append(d)
    if unbekannt:
        return None, unbekannt
    neu = _doppel_weg("".join(out)).strip()
    neu = re.sub(r"\s{2,}", " ", neu)
    if not neu or neu == (v or "").strip():
        return None, []
    return neu[:60], []


def englisch(v):
    """Traegt der Wert ein englisches Wort (Tor)? Doppelte deutsche Farbwurzel zaehlt mit."""
    for t in re.findall(r"[A-Za-z][A-Za-z']*\d*|\d+[A-Za-z]+", (v or "").replace("’", "'")):
        k = t.lower()
        if k in EN_WOERTER or EN_MUSTER.match(k):
            return True
    return bool(DOPPEL.search(v or "")) or (v or "").strip().lower() in ARTEFAKTE


def kleidung(v):
    return {GARMENT[w] for w in re.findall(r"t-shirt|[a-z]+", (v or "").lower()) if w in GARMENT}


# ══ Durchgangs-Zustand (ueberlebt Neustarts in /tmp; neuer Durchgang = frischer Zustand) ══
def _state_neu():
    return {"start": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()), "gescannt": 0,
            "opt_uebersetzt": 0, "werte_uebersetzt": 0, "opt_code": 0, "fehler": 0,
            "rueck_fehler": 0, "skip": {}, "kleidung": [], "kollision": [], "unbekannt": {},
            "besucht_offen": [], "melde": [], "prio_fertig": False, "en_kandidaten": 0, "set_unklar": [],
            "en_werte_offen": 0, "dry": DRY}


def _state_laden(neu):
    if neu or not os.path.exists(PASS_STATE):
        return _state_neu()
    try:
        return json.load(open(PASS_STATE))
    except Exception:
        return _state_neu()


def _state_speichern(st):
    try:
        json.dump(st, open(PASS_STATE + ".tmp", "w"), ensure_ascii=False)
        os.replace(PASS_STATE + ".tmp", PASS_STATE)
    except Exception:
        pass


def _skip(st, grund):
    st["skip"][grund] = st["skip"].get(grund, 0) + 1


Q_FELDER = ("id handle title tags options{id name linkedMetafield{namespace key} "
            "optionValues{id name}} variants(first:3){nodes{sku}} variantsCount{count}")


def rueck_lesen(pid, oid, erwartet):
    """Liest die Option nach dem Schreiben zurueck. True = Stand wie erwartet."""
    d = gql('query($id:ID!){product(id:$id){options{id optionValues{id name}}}}', {"id": pid})
    for o in (((d.get("data") or {}).get("product") or {}).get("options") or []):
        if o["id"] == oid:
            ist = {v["id"]: v["name"] for v in o["optionValues"]}
            return all(ist.get(i) == n for i, n in erwartet.items())
    return False


def option_plan(p, o, st, besuche=0, pod=False, form_a=False):
    """Plant EINE Option: → (final, stufe1, offen_hier) oder None (nichts zu tun / unberuehrt).
    Schreibt nichts. Von produkt_bearbeiten() und vom Reparaturlauf genutzt — damit Reparatur und
    Tageslauf dieselbe Rechnung machen (23.09.: eine zweite Kopie der Regeln waere die naechste
    Quelle fuer Ping-Pong)."""
    pid_kurz = p["id"].split("/")[-1]
    vals = o["optionValues"]
    code_noetig = any(BAD.search(v["name"] or "") for v in vals)
    en_noetig = (not KEIN_EN) and any(englisch(v["name"] or "") for v in vals)
    if not code_noetig and not en_noetig:
        return None
    if o.get("linkedMetafield"):
        _skip(st, "linkedMetafield"); return None

    # Stufe 1 (alt): Codereinigung
    stufe1 = {}
    for v in vals:
        n = clean(v["name"] or "") if code_noetig else None
        stufe1[v["id"]] = n if n else (v["name"] or "")

    # Stufe 2 (neu): englisch → deutsch, nur wenn nichts dagegen spricht
    stufe2 = dict(stufe1)
    en_aktiv = en_noetig
    if en_aktiv:
        st["en_kandidaten"] += 1
        gruppen = set()
        for v in vals:
            gruppen |= kleidung(v["name"] or "")
        if gruppen:
            en_aktiv = False
            titel_l = (p.get("title") or "").lower()
            im_titel = {g for g, rx in TITEL_GRUPPE.items() if re.search(rx, titel_l)}
            # «top» steckt auch in Farbnamen («Mountain Top Ash») — es sperrt die
            # Uebersetzung, zaehlt aber nicht als Widerspruch.
            g_melden = set()
            for v in vals:
                g_melden |= {GARMENT[w] for w in re.findall(r"t-shirt|[a-z]+", (v["name"] or "").lower())
                             if w in GARMENT and w not in ("top", "tops")}
            konflikt = len(g_melden) >= 2 or bool(g_melden and im_titel and not (g_melden & im_titel))
            if konflikt:
                st["kleidung"].append({"id": pid_kurz, "handle": p.get("handle"),
                                       "titel": p.get("title"), "option": o["name"],
                                       "werte": [v["name"] for v in vals][:12],
                                       "gruppen": sorted(gruppen), "titel_set": bool(TITEL_SET.search(p.get("title") or "")),
                                       "besuche": besuche})
            _skip(st, "kleidungsstueck-im-wert")
        elif pod:
            en_aktiv = False; _skip(st, "pod-editor")
        elif form_a:
            en_aktiv = False; _skip(st, "cj-pid-sku-bestellung-ueber-titel")
    offen_hier = []
    if en_aktiv:
        # Ist die Option einmal als englisch erkannt, laufen ALLE ihre Werte durch dieselbe
        # Uebersetzung — sonst stand «Pink set-USB» (kein englisches Wort) neben «Pink Set 1-USB».
        # Der Kontext der Option entscheidet, ob «NColor» eine Nummer oder eine Anzahl ist.
        kx = option_kontext([stufe1[v["id"]] for v in vals])
        for v in vals:
            alt = stufe1[v["id"]]
            neu, unb = wert_de(alt, kx)
            if neu:
                stufe2[v["id"]] = neu
            elif unb and englisch(alt):
                offen_hier.append(alt)
                st["en_werte_offen"] += 1
                for u in unb:
                    k = u.lower()
                    st["unbekannt"][k] = st["unbekannt"].get(k, 0) + 1

    def kollidiert(namen):
        e = [x.strip().lower() for x in namen.values()]
        return len(set(e)) != len(e)

    # ⚠️ KOLLISIONS-WACHE. Der alte Code liess bei zwei gleichen Ergebnissen einfach
    # das zweite aus — die Option waere dann halb bereinigt und halb roh gewesen,
    # und Shopify beantwortet ein doppeltes Ergebnis ohnehin mit «Option value
    # already exists» (dieselbe Falle wie bei den Farbwerten). Kollidiert etwas,
    # bleibt die GANZE Option unberuehrt: lieber ein Lieferantencode als eine
    # Auswahl, in der zwei Zeilen dasselbe heissen.
    # 23.09.: Kollidiert erst die Uebersetzung, wird auf die reine Codereinigung
    # zurueckgefallen — und die Kollision gemeldet, nicht geschrieben.
    final = stufe2
    if kollidiert(stufe2):
        # Gemeldet wird nur, was die UEBERSETZUNG verursacht; kollidiert schon die
        # Codereinigung, ist das die alte Klasse (Option bleibt wie bisher unberuehrt).
        if stufe2 != stufe1 and not kollidiert(stufe1):
            paare = [(v["name"], stufe2[v["id"]]) for v in vals if stufe2[v["id"]] != (v["name"] or "")]
            st["kollision"].append({"id": pid_kurz, "handle": p.get("handle"), "option": o["name"],
                                    "paare": paare[:8], "besuche": besuche})
            _skip(st, "kollision-nach-uebersetzung")
        final = stufe1
        if kollidiert(stufe1):
            return None
    return final, stufe1, offen_hier


def produkt_bearbeiten(p, st, besuche=0):
    st["gescannt"] += 1
    pid_kurz = p["id"].split("/")[-1]
    # ── MELDER: Zubehoer als Farbe ────────────────────────────────────────────────
    # ⛔ Am 04.09.2026 bot der 3L-Trinkbrunnen (die Seite, auf die 2'600 Suchen im Monat
    # zulaufen) unter «Farbe» den Wert «Cartridge3 layers of filtrati-USB socket 5V» an —
    # einen ERSATZFILTER zum selben Preis wie den Brunnen. Wer eine Farbe waehlt, bekommt
    # ein anderes Produkt. Das ist die einzige Stelle im Shop, an der ein falsches Wort
    # unmittelbar eine falsche WARE bestellt.
    # Der Melder aendert NICHTS: was ein Wert wirklich bezeichnet, entscheidet ein Mensch
    # am Bild und am Preis (heute war «Set» richtig und «Cartridge» falsch).
    for o in p["options"]:
        if not FARBOPTION.search(o["name"] or ""):
            continue
        for v in o["optionValues"]:
            if ZUBEHOER.search(v["name"] or "") and not IST_SET.search(v["name"] or ""):
                st["melde"].append((pid_kurz, o["name"], v["name"]))

    tags = [t.lower() for t in (p.get("tags") or [])]
    pod = any(t.startswith("printful") or t in ("pod", "selbst-gestalten") for t in tags)
    skus = [(n.get("sku") or "") for n in ((p.get("variants") or {}).get("nodes") or [])]
    n_var = ((p.get("variantsCount") or {}).get("count")) or len(skus)
    form_a = n_var > 1 and any(re.match(r"^CJ-\d{10,}$", s.upper()) for s in skus)

    for o in p["options"]:
        if (o["name"] or "") == "Title":
            continue
        plan = option_plan(p, o, st, besuche, pod, form_a)
        if plan is None:
            continue
        final, stufe1, offen_hier = plan
        vals = o["optionValues"]
        # «Set 1 / Set 2 / Set 3» sagt der Kundin nicht, WAS im Paket ist — das weiss nur der
        # Lieferant (Bild/Preis). Fuer besuchte Seiten melden, nicht raten.
        if besuche and sum(1 for x in final.values() if re.search(r"(?i)\bset ?\d+\b", x)) >= 2:
            st.setdefault("set_unklar", []).append({"id": pid_kurz, "handle": p.get("handle"), "option": o["name"],
                                                    "werte": [final[v["id"]] for v in vals][:10], "besuche": besuche})
        if besuche and offen_hier:
            st["besucht_offen"].append({"id": pid_kurz, "handle": p.get("handle"), "option": o["name"],
                                        "werte": offen_hier[:8], "besuche": besuche})
        upd = [{"id": v["id"], "name": final[v["id"]]} for v in vals if final[v["id"]] != (v["name"] or "")]
        if not upd:
            continue
        en_zahl = sum(1 for v in vals if final[v["id"]] != stufe1[v["id"]])
        if DRY:
            st["opt_uebersetzt" if en_zahl else "opt_code"] += 1
            st["werte_uebersetzt"] += en_zahl
            print(f'  ~ {pid_kurz} [{o["name"]}] '
                  + ' · '.join(f'{v["name"]!r}->{final[v["id"]]!r}' for v in vals
                               if final[v["id"]] != (v["name"] or ""))[:260], flush=True)
            continue
        r = gql(M, {"pid": p["id"], "o": {"id": o["id"]}, "u": upd})
        e = ((r.get("data") or {}).get("productOptionUpdate") or {}).get("userErrors")
        if e:
            st["fehler"] += 1
            print(f'  X {pid_kurz}: {e[0]["message"][:70]}', flush=True)
            continue
        erwartet = {u["id"]: u["name"] for u in upd}
        if not rueck_lesen(p["id"], o["id"], erwartet):
            st["rueck_fehler"] += 1
            print(f'  ⚠️ {pid_kurz}: Rueckgelesen weicht ab', flush=True)
            continue
        st["opt_uebersetzt" if en_zahl else "opt_code"] += 1
        st["werte_uebersetzt"] += en_zahl
        with open(LEDGER, "a", encoding="utf-8") as lf:
            lf.write(f'{p["id"]}\t{o["name"]}\t{len(upd)}\n')
        if en_zahl:
            stempel = time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime())
            alt_name = {v["id"]: v["name"] for v in vals}
            with open(LEDGER_EN, "a", encoding="utf-8") as lf:
                for u in upd:
                    lf.write(f'{p["id"]}\t{o["name"]}\t{u["id"]}\t{alt_name[u["id"]]}\t{u["name"]}\t{stempel}\n')
        time.sleep(0.3)


def besuchte_seiten(tage=30):
    """Landeseiten mit Besuchen → [(handle, sitzungen)], ShopifyQL-Pfade entschluesselt
    (22.09.: ShopifyQL liefert URL-kodiert, sonst findet handle: nichts)."""
    q = (f"FROM sessions SHOW sessions GROUP BY landing_page_path SINCE -{tage}d UNTIL today "
         f"ORDER BY sessions DESC LIMIT 3000")
    d = gql('query($q:String!){shopifyqlQuery(query:$q){tableData{rows} parseErrors}}', {"q": q})
    t = (d.get("data") or {}).get("shopifyqlQuery") or {}
    if t.get("parseErrors"):
        print("ShopifyQL:", str(t["parseErrors"])[:180]); return []
    rows = (t.get("tableData") or {}).get("rows") or []
    if len(rows) >= 3000:
        print("⚠️ Deckel 3000 Landeseiten erreicht — seltene Seiten fehlen in der Vorrangliste")
    aus = []
    for r in rows:
        pth = r.get("landing_page_path") or ""
        if pth.startswith("/products/"):
            aus.append((urllib.parse.unquote(pth.split("/")[-1].split("?")[0]), int(r.get("sessions") or 0)))
    return aus


def bericht_schreiben(st, fertig):
    if DRY and not os.environ.get("BERICHT_BEI_DRY"):
        return
    z = []
    z.append("# Englische Lieferanten-Variantenwerte — Bericht\n")
    z.append(f"> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit "
             f"{st['start']}, Stand {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())} — "
             f"**{'vollständig' if fertig else 'läuft noch (Zahlen sind Zwischenstand)'}**"
             f"{' · PROBELAUF (DRY)' if st.get('dry') else ''}.\n")
    z.append("> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, "
             "Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht "
             "Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).\n")
    z.append("## Zahlen\n")
    z.append(f"- Produkte gesehen: **{st['gescannt']:,}**".replace(",", "'"))
    z.append(f"- Optionen mit englischen Werten (Kandidaten): {st['en_kandidaten']:,}".replace(",", "'"))
    z.append(f"- Optionen übersetzt: **{st['opt_uebersetzt']:,}** · Werte übersetzt: **{st['werte_uebersetzt']:,}**".replace(",", "'"))
    z.append(f"- Optionen nur codebereinigt: {st['opt_code']:,}".replace(",", "'"))
    z.append(f"- Werte mit unbekanntem Wort (unverändert): {st['en_werte_offen']:,}".replace(",", "'"))
    z.append(f"- Fehler Shopify: {st['fehler']} · Rückgelesen abweichend: {st['rueck_fehler']}")
    for k, n in sorted(st["skip"].items(), key=lambda x: -x[1]):
        z.append(f"- übersprungen «{k}»: {n}")
    z.append("")
    z.append("## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)\n")
    z.append("> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. "
             "Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. "
             "Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.\n")
    kl = sorted(st["kleidung"], key=lambda x: -x.get("besuche", 0))
    if not kl:
        z.append("_keine_\n")
    for x in kl[:150]:
        z.append(f"- `{x['id']}` [{x['option']}] **{(x.get('titel') or '')[:60]}**"
                 f"{' · ' + str(x['besuche']) + ' Sitzungen/30 T' if x.get('besuche') else ''}"
                 f" — {', '.join(x['gruppen'])}{' · Titel nennt Set' if x.get('titel_set') else ''}: "
                 f"{' | '.join(x['werte'][:8])}")
    if len(kl) > 150:
        z.append(f"- … und {len(kl) - 150} weitere")
    z.append("")
    z.append("## B · Kollision nach Übersetzung (nicht geschrieben)\n")
    z.append("> Die Übersetzung ergäbe zwei gleichlautende Werte (meist «Blue» neben «Blau»). "
             "Zusammenlegen ist Sache von `farbwert_dubletten.py` bzw. eines Menschen.\n")
    ko = sorted(st["kollision"], key=lambda x: -x.get("besuche", 0))
    if not ko:
        z.append("_keine_\n")
    for x in ko[:100]:
        z.append(f"- `{x['id']}` [{x['option']}] {x.get('handle') or ''}: "
                 + "; ".join(f"{a} → {b}" for a, b in x["paare"][:5]))
    if len(ko) > 100:
        z.append(f"- … und {len(ko) - 100} weitere")
    z.append("")
    z.append("## C · Besuchte Seiten: Werte, die stehen blieben (unbekanntes Wort)\n")
    bo = sorted(st["besucht_offen"], key=lambda x: -x.get("besuche", 0))
    if not bo:
        z.append("_keine_\n")
    for x in bo[:80]:
        z.append(f"- {x['besuche']} Sitzungen · `{x['id']}` {x.get('handle') or ''} [{x['option']}]: "
                 + " | ".join(x["werte"][:6]))
    z.append("")
    z.append("## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)\n")
    z.append("> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten "
             "(Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».\n")
    su = sorted(st.get("set_unklar") or [], key=lambda x: -x.get("besuche", 0))
    if not su:
        z.append("_keine_\n")
    for x in su[:40]:
        z.append(f"- {x['besuche']} Sitzungen · `{x['id']}` {x.get('handle') or ''} [{x['option']}]: "
                 + " | ".join(x["werte"][:8]))
    z.append("")
    z.append("## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)\n")
    top = sorted(st["unbekannt"].items(), key=lambda x: -x[1])[:60]
    z.append(", ".join(f"`{k}` {n}" for k, n in top) or "_keine_")
    z.append("")
    tmp = BERICHT_EN + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write("\n".join(z) + "\n")
    os.replace(tmp, BERICHT_EN)


def zubehoer_bericht(st):
    # Bericht anhaengen statt ueberschreiben waere falsch: dieser Lauf ist ein Durchgang durch
    # den Katalog, und ein Bericht, der alte Funde mitschleppt, listet Erledigtes (Lehre 21.08.).
    # Ohne Befund wird der Bericht GELOESCHT — ein leerer Rueckstand ist kein Rueckstand.
    melde = st["melde"]
    if DRY:
        return
    if melde:
        with open(BERICHT, 'w', encoding='utf-8') as bf:
            bf.write('# Zubehoer als Farbe angeboten (MELDET NUR)\n\n'
                     '> Die Option heisst «Farbe»/«Ausfuehrung», ein Wert bezeichnet aber ein ANDERES\n'
                     '> Produkt (Ersatzfilter, Ersatzband, nur Kabel). Wer eine Ausfuehrung waehlt,\n'
                     '> bestellt dann Zubehoer. Praezedenz 04.09.2026: 3L-Trinkbrunnen, Ersatzfilter\n'
                     '> zum Brunnenpreis auf der Seite mit 2\'600 Suchen/Monat.\n\n'
                     '> ⚠️ Nichts wird automatisch geaendert: ob ein Wert Zubehoer ODER eine legitime\n'
                     '> Ausfuehrung ist, entscheidet der Blick auf Bild und Preis.\n\n')
            for pid, on, vn in melde:
                bf.write(f'- `{pid}` [{on}] `{vn}`\n')
        print(f'MELDER: {len(melde)} Zubehoer-Werte in Farboptionen -> {BERICHT}')
    elif os.path.exists(BERICHT):
        os.remove(BERICHT); print('MELDER: 0 — Bericht geloescht')


def main():
    cur = (open(CURSOR).read().strip() or None) if os.path.exists(CURSOR) else None
    # Ein Einzel-/Stichprobenlauf fasst weder Cursor noch Durchgangs-Zustand an.
    einzeln = bool(NUR_ID) or NUR_BESUCHT
    # Kein Cursor = neuer Durchgang = frischer Zustand (sonst schleppt der Bericht Erledigtes mit).
    st = _state_neu() if (einzeln or cur is None) else _state_laden(neu=False)

    # ── Vorrang: Produkte mit Besuchen (einmal je Durchgang) ─────────────────────────────
    if NUR_ID:
        for i in NUR_ID:
            d = gql('query($id:ID!){product(id:$id){%s status}}' % Q_FELDER, {"id": "gid://shopify/Product/" + i})
            p = (d.get("data") or {}).get("product")
            if p and p.get("status") == "ACTIVE":
                produkt_bearbeiten(p, st)
    elif NUR_BESUCHT or not st.get("prio_fertig"):
        seiten = besuchte_seiten()
        besuche_je = dict(seiten)
        hs = [h for h, _ in seiten]
        print(f"Vorrang: {len(hs)} besuchte Produktseiten (30 T)", flush=True)
        prio_ids = []
        for i in range(0, len(hs), 40):
            teil = hs[i:i + 40]
            q = " OR ".join('handle:"%s"' % h.replace('"', '') for h in teil)
            d = gql('query($q:String!){products(first:50,query:$q){nodes{%s status}}}' % Q_FELDER, {"q": q})
            for p in ((d.get("data") or {}).get("products") or {}).get("nodes") or []:
                if p.get("status") == "ACTIVE":
                    produkt_bearbeiten(p, st, besuche_je.get(p["handle"], 0))
                    prio_ids.append(p["id"])
        if not einzeln:
            st["prio_fertig"] = True
            st["prio_ids"] = prio_ids
            _state_speichern(st)
        bericht_schreiben(st, fertig=False)

    if einzeln:
        print(f"FERTIG (Stichprobe): {st['gescannt']} gesehen, {st['opt_uebersetzt']} Optionen übersetzt "
              f"({st['werte_uebersetzt']} Werte), {st['opt_code']} codebereinigt, "
              f"{len(st['kleidung'])} Kleidungs-Befunde, {len(st['kollision'])} Kollisionen, "
              f"{st['fehler']} Fehler, {st['rueck_fehler']} Rücklese-Abweichungen · {bilanz()}")
        for x in st["kleidung"]:
            print(f"  KLEIDUNG {x['id']} [{x['option']}] {(x.get('titel') or '')[:50]}: {' | '.join(x['werte'][:6])}")
        for x in st["kollision"]:
            print(f"  KOLLISION {x['id']} [{x['option']}]: " + "; ".join(f"{a} → {b}" for a, b in x['paare'][:5]))
        return

    # ── Ganzer Katalog, fortsetzbar ──────────────────────────────────────────────────────
    schon = set(st.get("prio_ids") or [])       # im Vorrang schon gesehen → nicht doppelt zaehlen
    while True:
        d = gql('query($c:String){products(first:60,after:$c,query:"status:ACTIVE"){pageInfo{hasNextPage endCursor} '
                'nodes{%s}}}' % Q_FELDER, {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            # ⚠️ KEIN FERTIG. Eine ausgefallene Abfrage ist kein Katalog-Ende. Meldete das
            # Werkzeug hier FERTIG, traegt der Aufseher es als erledigt ab und startet es NIE
            # wieder — der Rest des Katalogs bliebe fuer immer ungeprueft. Mit PAUSE laeuft es
            # in einer Stunde weiter, der Cursor steht ja.
            _state_speichern(st)
            print(f"PAUSE (Shopify antwortet nicht — bei {st['gescannt']} Produkten, Cursor bleibt)", flush=True)
            raise SystemExit(0)
        for p in pg["nodes"]:
            if p["id"] in schon:
                continue
            produkt_bearbeiten(p, st)
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        open(CURSOR, "w").write(cur)
        _state_speichern(st)
        if st["gescannt"] % 600 < 60:
            print(f"gescannt {st['gescannt']} | übersetzt {st['opt_uebersetzt']} Optionen / "
                  f"{st['werte_uebersetzt']} Werte | codebereinigt {st['opt_code']}", flush=True)
            bericht_schreiben(st, fertig=False)
    # ⚠️ 23.09.2026 — DER CURSOR MUSS WEG. Bis heute blieb er nach dem letzten Blatt stehen;
    # jeder Tageslauf seit dem 13.09. begann hinter dem letzten Produkt, sah 0 und meldete
    # FERTIG. Ein Durchgang ist fertig → der naechste beginnt vorn.
    if os.path.exists(CURSOR):
        os.remove(CURSOR)
    zubehoer_bericht(st)
    bericht_schreiben(st, fertig=True)
    if os.path.exists(PASS_STATE):
        os.remove(PASS_STATE)
    print(f"FERTIG: {st['gescannt']} gescannt, {st['opt_uebersetzt']} Optionen übersetzt "
          f"({st['werte_uebersetzt']} Werte), {st['opt_code']} codebereinigt, "
          f"{len(st['kleidung'])} Kleidungs-Befunde, {len(st['kollision'])} Kollisionen, "
          f"{st['fehler']} Fehler, {st['rueck_fehler']} Rücklese-Abweichungen · {bilanz()}")


# ══ SELBSTTEST (23.09.2026, Nachbesserung) ═══════════════════════════════════════════════
# Jedes Fehlbeispiel des Pruefers steht hier mit dem erwarteten Ergebnis. None = unveraendert
# lassen (lieber Englisch als falsches Deutsch). Aufruf: python3 automation/variant_value_clean.py --selbsttest
SELBSTTEST_FAELLE = [
    # (Optionswerte als Kontext, Wert, erwartet)
    ([], "Classic Black", "Klassisches Schwarz"),               # nie «Klassischschwarz»
    ([], "Classic Blue-60x50x18cm", "Klassisches Blau-60x50x18 cm"),
    ([], "36RGB Remote Control 17 Colors-Classic Black", "36RGB Fernbedienung 17 Farben-Klassisches Schwarz"),
    ([], "Bright Red", "Leuchtendes Rot"),                      # nie «Leuchtendrot»
    ([], "Bright apricot", None),                               # «Leuchtendes Aprikose» waere falsch
    ([], "Vintage Green", "Vintage-Grün"),                      # wie farben_de.json «Retro-Blau»
    ([], "Cool Black", None),                                   # nie «Kühlschwarz»
    ([], "Bright Rose Pink", None),                             # nie «Leuchtendrosé-Pink»
    ([], "USB plug in version", None),                          # nie «USB Stecker in version»
    ([], "Black-USB plug in version", None),
    ([], "3W-16color plug in square-1PC", None),                # «Stecker in eckig»
    ([], "Brown Single Lining", None),                          # nie «Braun einzeln Futter»
    ([], "Black Single Stripe", None),                          # nie «Schwarz einzeln gestreift»
    ([], "Short length S-Gray", None),                          # nie «Kurz Länge S»
    ([], "4CM Thick Sole Green-36or37", None),                  # nie «4 cm dick Sohle Grün»
    ([], "White Matte-Colorful Packaging", None),               # nie «Bunt Verpackung»
    ([], "Bamboo Green", None),                                 # nie «Bambus Grün»
    ([], "Leather Pink", None),                                 # Farbname, kein Leder
    ([], "Square Pillow", None),                                # nie «Eckig Kissen»
    ([], "2pcs charger", None),                                 # nie «2 Stück Ladegerät»
    ([], "Pink plus cotton-24or25", None),                      # «plus» ist hier kein Modellzusatz
    ([], "Washed Black 1", None),                               # «Schwarz washed» aus farben_de.json
    ([], "Blue andKhaki Rose Red set-USB", None),               # «andKhaki» ist kein deutsches Wort
    ([], "B Black Army Color", None),                           # «Armee» ist kein Farbname
    ([], "Pink set-USB", "Pink Set-USB"),                       # gleiche Schreibung wie «Pink Set 1-USB»
    ([], "Pink set1-USB", "Pink Set 1-USB"),
    ([], "Dark Blue-Plus Size XL", "Dunkelblau-Übergrösse XL"),   # nie «Plus Gr. XL»
    ([], "White-Sole Length 11 CM", "Weiss-Sohlenlänge 11 cm"),  # nie «Sohle Länge 11 CM»
    ([], "Round Collar In Black", "Rundhals in Schwarz"),
    ([], "Navy Blue Printed Yellow", "Marineblau-Gelb bedruckt"),
    ([], "Blue Wide Stripe", "Blau breit gestreift"),
    ([], "White-ML", "Weiss-ML"),                               # ML ist eine Groesse, keine Milliliter
    ([], "Black 1.5 Cm", "Schwarz 1.5 cm"),
    ([], "Red usb charging", "Rot USB aufladbar"),
    ([], "018Color", "Farbton 018"),
    ([], "X2 Blue 128g charging model-USB", "X2 Blau 128g Akku-Version-USB"),
    ([], "Red Rose", "Rote Rose"),
    ([], "Brown-Arch Shape Stamp 2PCS", "Braun-Stempel Bogenform · 2 Stück"),
    ([], "Silver-1 Birthstone", "Silber-1 Geburtsstein"),
    # NColor: Nummer oder Anzahl entscheidet die Option
    ([f"{i}color" for i in range(1, 13)], "5color", "Farbton 5"),          # Sommeroben: Nummern
    ([f"{i}Color-US 0" for i in range(1, 10)], "5Color-US 0", "Farbton 5-US 0"),
    ([], "5Color-US 0", None),                                  # ohne Reihe: unklar → unveraendert
    ([f"{i}color-1pcs" for i in range(1, 21)], "10color-1pcs", "Farbton 10-1 Stück"),
    (["1color", "2Color", "6 Colors", "6Colors3pcs"], "6 Colors", "Farbton 6"),
    (["1color", "2Color", "6 Colors", "6Colors3pcs"], "2Color3pcs", "Farbton 2 · 3 Stück"),
    ([], "122930color", None),                                  # Lieferantencode, keine Anzahl
    ([], "1 3 6color", None),                                   # Farben Nr. 1, 3 und 6
    (["1 Color", "2 Colors", "3 Colors"], "2 Colors", None),    # einfarbig/zweifarbig ODER Nr. 2
    (["16colors and 8colors", "8colors 2PCS", "16colors"], "16colors", "16 Farben"),
    (["16colors and 8colors", "8colors 2PCS", "16colors"], "16colors and 8colors", "16 Farben und 8 Farben"),
    ([], "39 colors", "39 Farben"),
    ([], "4color set", "Set mit 4 Farben"),
    (["2128 1color", "2128 2color", "2128 3color"], "2128 2color", "2128 Farbton 2"),
    # US-Damengroessen «14W…26W» sind keine Watt (Pruefer 23.09.: 142 Werte «Hellblau-US 14 W»)
    ([], "Light Blue-US 14W", "Hellblau-US 14W"),
    ([], "Wine Red-US16W", "Weinrot-US 16W"),
    ([], "2Color-US 16W", None),                                 # ohne Reihe: NColor unklar → unveraendert
    ([f"{i}Color-US 16W" for i in range(1, 6)], "2Color-US 16W", "Farbton 2-US 16W"),
    (["Black-14W", "Black-16W", "Black-18W", "Black-20W"], "Black-16W", "Schwarz-16W"),
    (["Black 18W", "Black 20W", "White 30W charger"], "Black 18W", "Schwarz 18 W"),   # Ladegeraet = Watt
    ([], "Black 18W", "Schwarz 18 W"),                          # ohne Reihe: Watt
    ([], "White 100W", "Weiss 100 W"),
]


def selbsttest():
    fehler = 0
    for kontext, wert, erwartet in SELBSTTEST_FAELLE:
        kx = option_kontext(kontext or [wert])
        ist = wert_de(wert, kx)[0]
        if ist != erwartet:
            fehler += 1
            print(f"FEHLER {wert!r}: erwartet {erwartet!r}, ist {ist!r}")
    print(f"SELBSTTEST: {len(SELBSTTEST_FAELLE) - fehler}/{len(SELBSTTEST_FAELLE)} richtig")
    return 1 if fehler else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        raise SystemExit(selbsttest())
    main()
