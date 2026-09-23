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
    "typec": "USB-C",
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


def _token_de(t):
    """Ein Wort → (Deutsch, art) oder (None, None). art: 'menge' bekommt ein « · » davor."""
    m = re.match(r"^([(\[]*)(.*?)([)\].:;!]*)$", t)
    vor, kern, nach = m.group(1), m.group(2), m.group(3)
    if not kern:
        return t, "tok"
    k = kern.lower()

    def w(x, art="tok"):
        return vor + x + nach, art
    if k in TERM:
        return w(TERM[k])
    if DOPPEL.fullmatch(kern):                       # «Marineblaublau» → «Marineblau»
        return w(_doppel_weg(kern))
    if k in DE_OK or (_DE_WURZEL.search(k) and k not in KEINE_DE_WURZEL) or re.search(r"[äöüÄÖÜ]", kern):
        return w(kern)
    if k in PASS or k in DE_GLEICH:
        return w(kern)
    if re.fullmatch(r"\d+(?:[.,/]\d+)?", k) or re.fullmatch(r"#\d+", k) or re.fullmatch(r"gr\.?\d+", k):
        return w(kern)
    # Lieferantencode mit fuehrender Null («0236L») ist kein Liter.
    if re.fullmatch(r"0\d+[A-Za-z]{1,3}", kern):
        return w(kern)
    x = re.fullmatch(r"(\d+(?:[.,]\d+)?)[x×*](\d+(?:[.,]\d+)?)(?:[x×*](\d+(?:[.,]\d+)?))?(cm|mm|m)?", k)
    if x:
        mass = "x".join(g for g in x.groups()[:3] if g)
        return w(mass + (" " + x.group(4) if x.group(4) else ""))
    if re.fullmatch(r"(?:\d?x{0,5}[sl]|m|x{1,5}l|\d{1,2}xl|\d?xs|xxs)", k):
        return w(kern.upper())
    x = re.fullmatch(r"(\d+(?:[.,]\d+)?)(cm|mm|m|ml|l|g|kg|oz|w|v|mah|gb|tb|inch|inches|in)", k)
    if x:
        # «37M», «42L» mit GROSSEM Buchstaben sind eher Groessen als Meter/Liter → stehen lassen.
        if x.group(2) in ("m", "l") and kern[-1].isupper() and "." not in kern and "," not in kern:
            return w(kern)
        # «2.4G», «5G» = Funkstandard; «64g», «128g» = Speicher (Zweierpotenz) — keine Gramm.
        # (23.09.: «X2 Blue 128g charging model» stand kurz als «128 g» im Auswahlfeld, repariert.)
        if x.group(2) == "g" and (kern[-1] == "G" or x.group(1) in ("16", "32", "64", "128", "256", "512", "1024")):
            return w(kern)
        return w(f"{x.group(1)} {UNIT.get(x.group(2), 'Zoll')}")
    x = re.fullmatch(r"(\d+)(?:pcs|pc|cps|pieces|piece)", k)
    if x:
        return w(f"{x.group(1)} Stück", "menge")
    x = re.fullmatch(r"(\d+)erpack", k)
    if x:
        return w(f"{x.group(1)}er-Pack", "menge")
    x = re.fullmatch(r"(\d+)pairs?", k)
    if x:
        return w(f"{x.group(1)} Paar", "menge")
    x = re.fullmatch(r"set(\d+)", k)
    if x:
        return w(f"Set {x.group(1)}")
    x = re.fullmatch(r"stilset(\d+)", k)
    if x:
        return w(f"Set mit {x.group(1)} Varianten")
    x = re.fullmatch(r"size(\d{1,3}(?:[.,]\d)?)", k)
    if x:
        return w(f"Gr. {x.group(1)}")
    x = re.fullmatch(r"(\d{2})(?:to|or)(\d{2})", k)
    if x:
        return w(f"{x.group(1)}/{x.group(2)}")
    # ⚠️ 23.09.: «018Color» mit FUEHRENDER NULL ist die Farbnummer des Lieferanten, keine Anzahl —
    # im ersten scharfen Lauf stand «018 Farben» im Auswahlfeld (repariert). Ohne fuehrende Null
    # («2Color», «1color3pcs») ist das Englisch selbst mehrdeutig (Anzahl? Nummer?) — dann bleibt
    # es bei der woertlichen Uebersetzung, die dieselbe Mehrdeutigkeit traegt, nicht mehr.
    x = re.fullmatch(r"(0\d+)colou?rs?", k)
    if x:
        return w(f"Farbton {x.group(1)}")
    x = re.fullmatch(r"(\d+)colou?rs?", k)
    if x:
        return w(f"{x.group(1)} Farbe{'n' if x.group(1) != '1' else ''}")
    x = re.fullmatch(r"(\d+)speeds?", k)
    if x:
        return w(f"{x.group(1)} Stufen")
    x = re.fullmatch(r"nr(\d+)", k)
    if x:
        return w(f"Nr. {x.group(1)}")
    x = re.fullmatch(r"farbton(c?\d{1,3})", k)
    if x:
        return w(f"Farbton {x.group(1).upper()}")
    x = re.fullmatch(r"musternr(\w{1,3})", k)
    if x:
        return w(f"Muster {x.group(1).upper()}")
    x = re.fullmatch(r"gr\.(xxs|xs|s|m|l|xl|xxl|xxxl|\dxl)", k)
    if x:
        return w(f"Gr. {x.group(1).upper()}")
    # Modell-/Artikelcodes des Lieferanten («A026», «L01S», «0236L», «2513»): bleiben stehen.
    if re.fullmatch(r"[A-Z]{0,3}\d{1,6}[A-Z]{0,3}", kern) or re.fullmatch(r"[A-Z]", kern):
        return w(kern)
    return None, None


def _stueck_de(seg):
    """Ein Stueck ohne Trenner → (Deutsch|None, unbekannte Woerter)."""
    toks = seg.split()
    out, arten, unbekannt, i = [], [], [], 0
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
                f = FD.get(key) or (_fz.phrase_de(span) if j == i + 2 and re.fullmatch(r"[A-Za-z]+", span) else None)
                if f and " " not in f and "-" not in f and not f.lower().startswith(("hell", "dunkel")):
                    treffer = (j, (mod + _doppel_weg(f).lower()).capitalize(), "farbe"); break
        for j in (range(min(len(toks), i + 5), i, -1) if treffer is None else ()):
            span = " ".join(toks[i:j])
            key = span.lower().strip("()[]")
            if j - i > 1 and key in TERM_PHRASES:
                treffer = (j, TERM_PHRASES[key], "tok"); break
            if key in FD:
                # Einschritt-Vorschau: «Black Rose Gold» ist Schwarz + Roségold, nicht
                # Schwarz-Rosé + Gold. Bildet das letzte Wort mit dem naechsten eine eigene
                # Farbphrase und bleibt der Rest uebersetzbar, wird kuerzer geschnitten.
                if j - i >= 2 and j < len(toks):
                    nach = " ".join(toks[j - 1:j + 1]).lower()
                    rest = " ".join(toks[i:j - 1]).lower()
                    if nach in FD and (rest in FD or _fz.phrase_de(" ".join(toks[i:j - 1]))):
                        continue
                treffer = (j, _doppel_weg(FD[key]), "farbe"); break
            if j - i <= 3 and re.fullmatch(r"[A-Za-z ]+", span):
                # Zwei GRUNDwoerter ohne Eintrag in farben_de.json («Navy White», «Blue Pink»):
                # phrase_de klebt sie zusammen («Marineblauweiss»). farben_de.json schreibt solche
                # Paare mit Bindestrich («Schwarz-Weiss») — also einzeln lesen, unten verbinden.
                ws = span.lower().split()
                if len(ws) == 2 and all(x in _fz.GRUND for x in ws):
                    continue
                d = _fz.phrase_de(span)
                if d:
                    treffer = (j, _doppel_weg(d), "farbe"); break
        if treffer is None:
            k0 = toks[i].lower()
            # «Mocha Color» ist unbekannt, aber «Sand Color» nach einer Farbe ist nur Fuellwort.
            if k0 in ("color", "colour") and arten and arten[-1] == "farbe":
                i += 1; continue
            r, art = _token_de(toks[i])
            if r is None:
                unbekannt.append(toks[i]); i += 1; continue
            if k0 in FARB_TERM:
                art = "farbe"
            treffer = (i + 1, r, art)
        j, r, art = treffer
        if art == "menge" and out:
            out.append("·"); arten.append("sep")
        if art == "farbe" and arten and arten[-1] == "farbe":
            if out[-1].split("-")[-1].lower() != r.lower():   # «Blue blue» → nicht «Blau-Blau»
                out[-1] = out[-1] + "-" + r      # «Senfgrün-Grau», «Schwarz-Roségold»
        elif art == "farbe" and arten and arten[-1] == "tok" and out[-1].lower() in MUSTER_ADJ:
            adj = out.pop(); arten.pop()          # «Flower Blue» → «Blau geblümt»
            out.append(r); arten.append("farbe")
            out.append(adj.lower()); arten.append("tok")
        else:
            out.append(r); arten.append(art)
        i = j
    if unbekannt:
        return None, unbekannt
    return " ".join(out), []


MODIF = {"light": "hell", "dark": "dunkel", "deep": "dunkel", "pale": "blass", "bright": "leuchtend",
         "middle": "mittel"}
TRENNER = re.compile(r"(\s*-\s*|\s*\+\s*|\s*,\s*|\s*/\s*|\s*&\s*)")
SCHUTZ = [("t-shirt", "tshirt"), ("type-c", "typec"), ("v-neck", "v neck"), ("wi-fi", "wifi")]


def wert_de(v):
    """Uebersetzt einen ganzen Optionswert. → (neu|None, unbekannte Woerter).
    None heisst: unveraendert lassen (unbekanntes Wort oder nichts zu tun)."""
    if (v or "").strip().lower() in ARTEFAKTE:
        return ARTEFAKTE[(v or "").strip().lower()], []
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
        d, u = _stueck_de(t.strip())
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
        vals = o["optionValues"]
        code_noetig = any(BAD.search(v["name"] or "") for v in vals)
        en_noetig = (not KEIN_EN) and any(englisch(v["name"] or "") for v in vals)
        if not code_noetig and not en_noetig:
            continue
        if o.get("linkedMetafield"):
            _skip(st, "linkedMetafield"); continue

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
            for v in vals:
                alt = stufe1[v["id"]]
                neu, unb = wert_de(alt)
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
                continue
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


if __name__ == "__main__":
    main()
