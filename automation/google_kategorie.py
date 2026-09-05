"""Setzt die Google-Produktkategorie aus den gepflegten Katalog-Tags.

WARUM DAS ZÄHLT: Die Produktkategorie entscheidet, bei welchen Suchen ein Artikel überhaupt
erscheinen kann. Fehlt sie, rät Google — und rät bei fremdsprachigen Katalogtiteln oft daneben.
Im Google-Kanal stehen 25'357 Produkte, aber nur **1'550 (6 %)** haben das Feld
`mm-google-shopping.google_product_category`.

UND DIE VORHANDENEN SIND TEILS FALSCH. Stichprobe aus dem Bestand:

    «LED Solar-Lichterkette XL – 8 Leuchtmodi»   → Apparel & Accessories > Jewelry
    «LED Schreibtischlampe Dimmbar»              → Apparel & Accessories > Clothing Accessories

Beides sind Lampen — die Werte stammen aus einem ungeprüften Sprachmodell-Durchlauf.

⚠️ TROTZDEM WIRD NICHTS ÜBERSCHRIEBEN. Der erste Entwurf tat das, und der Probelauf zeigte,
dass die Kur schlimmer gewesen wäre als die Krankheit — von 22'091 Änderungen waren 1'208
Überschreibungen, darunter diese:

    Smartwatch Pro   Electronics > … > Smart Watches  →  Apparel & Accessories > Jewelry  ✗
    Bombata Laptoptasche   Handbags  →  Electronics                                       ✗
    Reed-Diffuser    Cosmetics > Perfume & Cologne  →  Cosmetics                          ✗

Ein Tag-Mapper kennt nur die grobe Warengruppe; wo schon ein feinerer Pfad steht, ist er in der
Regel besser. Gesetzt wird deshalb **nur, wo das Feld leer ist**. Die Abweichungen werden nach
`dropship/GOOGLE-KATEGORIE-ABWEICHUNGEN.md` geschrieben — zum Nachsehen, nicht zum Ausführen.

DIE QUELLE IST BEWUSST NICHT DER TITEL, sondern die Kategorie-Tags aus `cat_tags.mjs`. Die sind
gepflegt, deutsch gedacht und kennen die Zusammensetzungs-Fallen (armband**uhr** ≠ Armband,
**Hand**schuh ≠ Schuh). Ein zweiter Titel-Rater würde genau die Fehler wiederholen, die dieses
Skript aufräumt.

REIHENFOLGE ZÄHLT: Die Liste wird von oben nach unten geprüft, das erste passende Tag gewinnt.
Spezifisches steht deshalb vor Allgemeinem — sonst würde «schmuck» die Halsketten schlucken.

Format: Google akzeptiert den vollen Pfad als Text; genau so liegen die vorhandenen Werte im
Shop («Apparel & Accessories > Jewelry > Watches», Typ single_line_text_field). Nummern-IDs
werden bewusst NICHT verwendet — eine falsch erinnerte Zahl fällt niemandem auf, ein falscher
Pfad schon.

DRY=1 meldet nur und zeigt Stichproben je Kategorie.
"""
import json, os, re, subprocess, time
from collections import Counter, defaultdict

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_google_kategorie.txt"
FELD = "google_product_category"

# (Tag, Google-Pfad) — von spezifisch nach allgemein.
REGELN = [
    ("kategorie-halskette", "Apparel & Accessories > Jewelry > Necklaces"),
    ("halskette",           "Apparel & Accessories > Jewelry > Necklaces"),
    ("kategorie-ohrring",   "Apparel & Accessories > Jewelry > Earrings"),
    ("ohrringe",            "Apparel & Accessories > Jewelry > Earrings"),
    ("kategorie-armband",   "Apparel & Accessories > Jewelry > Bracelets"),
    ("kategorie-ring",      "Apparel & Accessories > Jewelry > Rings"),
    ("kategorie-uhr",       "Apparel & Accessories > Jewelry > Watches"),
    ("uhren",               "Apparel & Accessories > Jewelry > Watches"),
    ("sonnenbrille",        "Apparel & Accessories > Clothing Accessories > Sunglasses"),
    ("kategorie-tasche",    "Apparel & Accessories > Handbags, Wallets & Cases > Handbags"),
    ("damen-taschen",       "Apparel & Accessories > Handbags, Wallets & Cases > Handbags"),
    ("damenschuhe",         "Apparel & Accessories > Shoes"),
    ("herrenschuhe",        "Apparel & Accessories > Shoes"),
    ("schuhe",              "Apparel & Accessories > Shoes"),
    ("kategorie-kleid",     "Apparel & Accessories > Clothing > Dresses"),
    ("kat-damen-pullover",  "Apparel & Accessories > Clothing > Shirts & Tops"),
    ("schmuck",             "Apparel & Accessories > Jewelry"),
    ("haarstyling",         "Health & Beauty > Personal Care > Hair Care"),
    ("beauty",              "Health & Beauty > Personal Care > Cosmetics"),
    ("pflege",              "Health & Beauty > Personal Care"),
    ("haustier",            "Animals & Pet Supplies > Pet Supplies"),
    ("pet",                 "Animals & Pet Supplies > Pet Supplies"),
    ("beleuchtung",         "Home & Garden > Lighting"),
    ("kueche",              "Home & Garden > Kitchen & Dining"),
    ("dekoration",          "Home & Garden > Decor"),
    ("aufbewahrung",        "Home & Garden > Household Supplies > Storage & Organization"),
    ("fitness",             "Sporting Goods > Exercise & Fitness"),
    ("elektronik",          "Electronics"),
    ("tech",                "Electronics"),
    ("kinder",              "Baby & Toddler"),
    # Ganz zuletzt das Grobe: «mode» trägt fast jedes Kleidungsstück, ist aber nur dann die
    # Antwort, wenn nichts Genaueres gegriffen hat.
    ("mode",                "Apparel & Accessories > Clothing"),
]


def gql(q, v=None):
    with open("/tmp/_gk.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_gk.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


# ⚠️ HIER STAND EIN GUT GEMEINTER FEHLER (korrigiert 12.08.2026).
# Der Tag `uhren` steckt auch auf Smartwatches und Fitness-Trackern, und die unter
# «Schmuck > Uhren» abzulegen fühlte sich falsch an. Also zeigte diese Vorrang-Regel nach
# «Electronics > Electronics Accessories > Wearable Technology > Smart Watches».
# Diesen Zweig gibt es in GOOGLES Taxonomie nicht — er stammt aus SHOPIFYS Taxonomie. Geprüft
# an der Quelldatei (5'595 Pfade): das Wort «wearable» kommt darin kein einziges Mal vor.
# Folge: Google verwarf den Wert, und 204 Smartwatches standen faktisch ohne Kategorie da —
# schlechter als die Ungenauigkeit, die vermieden werden sollte.
# «Apparel & Accessories > Jewelry > Watches» ist der Zweig, den Google für Uhren am
# Handgelenk tatsächlich führt. Lehre: eine Kategorie nicht danach wählen, wie treffend sie
# klingt, sondern danach, ob der Empfänger sie kennt.
VORRANG = [
    (re.compile(r'smart\s*-?\s*watch|smartuhr', re.I),
     "Apparel & Accessories > Jewelry > Watches"),
    (re.compile(r'fitness\s*-?\s*(tracker|armband)|activity\s*tracker', re.I),
     "Apparel & Accessories > Jewelry > Watches"),
]


# Wie sauber sind die Tags wirklich? Nachgezählt am 11.08. mit wortgenauen Mustern:
#   schuhe            2'613 Produkte →  2 Fehltreffer (0,1 %)
#   kategorie-tasche    891 Produkte →  4 Fehltreffer (0,6 %)
#   uhren               811 Produkte →  0 Fehltreffer
# Also gut genug, um darauf zu bauen. (Die erste Messung meldete 8 % — sie war falsch: das
# Muster «sand» traf «Sandalen», «tisch» traf «minimalis-tisch». Genau die Substring-Falle,
# vor der Regel 9b warnt. Wortgrenzen sind Pflicht, auch beim blossen Nachzählen.)
# Für die verbliebenen Einzelfälle: Trifft das Muster, wird das Tag ignoriert und die nächste
# Regel geprüft — ein Schuhregal ist kein Schuh, aber eben auch nicht kategorielos.
AUSNAHMEN = {
    "schuhe": re.compile(r'Schuhregal|Schuhschrank|Schuh-?Organizer|Schuhb[üu]rste|'
                         r'Schuhspanner|Eau de|Sandalwood|Sandelholz', re.I),
    "damenschuhe": re.compile(r'Schuhregal|Schuhschrank|Schuh-?Organizer', re.I),
    "herrenschuhe": re.compile(r'Schuhregal|Schuhschrank|Schuh-?Organizer', re.I),
    "kategorie-tasche": re.compile(r'Pinsel-?[Ss]et|Schrank-?Organizer|Schuh-?Organizer', re.I),
    "damen-taschen": re.compile(r'Pinsel-?[Ss]et|Schrank-?Organizer', re.I),
}


# Zweite Ebene: die Warengruppe des Katalogs. Nach dem ersten Durchlauf blieben 3'116 Produkte
# im Google-Kanal ohne Kategorie, weil ihnen die Mode-/Schmuck-Tags fehlen — sie sind schlicht
# keine Mode. Ihr `productType` ist aber gepflegt und eindeutig genug:
#     406 Auto-Zubehör · 380 Basteln & DIY · 343 Taschen · 205 Spielzeug · 178 Gaming …
# Bewusst NICHT abgebildet: «Trend-Gadget» (874) und «Trend-Produkt» (165). Das sind Sammelkörbe
# ohne gemeinsame Warengruppe — vom Küchenhelfer bis zum Nachtlicht. Eine falsche Kategorie
# schadet dort mehr als eine fehlende, weil Google danach in den falschen Suchen ausspielt.
NACH_TYP = {
    "Auto-Zubehör":          "Vehicles & Parts > Vehicle Parts & Accessories",
    "Basteln & DIY":         "Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts",
    "Taschen":               "Apparel & Accessories > Handbags, Wallets & Cases > Handbags",
    "Spielzeug & Spiele":    "Toys & Games > Toys",
    "Gaming-Zubehör":        "Electronics > Video Game Console Accessories",
    "Werkzeug & Heimwerken": "Hardware > Tools",
    "Werkzeug":              "Hardware > Tools",
    "Musikinstrumente":      "Arts & Entertainment > Hobbies & Creative Arts > Musical Instruments",
    "Sport & Outdoor":       "Sporting Goods",
    # Party Supplies hängt bei Google unter «Arts & Entertainment», nicht unter «Home & Garden
    # > Decor» — die naheliegende Ableitung «Deko also Home & Garden» war falsch und hat
    # 46 Produkten einen Pfad gegeben, den Google verwirft.
    "Partydeko & Ballone":   "Arts & Entertainment > Party & Celebration > Party Supplies",
    "Audio":                 "Electronics > Audio",
    "Beauty Tools":          "Health & Beauty > Personal Care > Cosmetics",
    "Beauty & Pflege":       "Health & Beauty > Personal Care",
    "Wellness & Spa":        "Health & Beauty > Health Care",
    "Haushalt & Wohnen":     "Home & Garden > Household Supplies",
    "Deko & Wohnaccessoires": "Home & Garden > Decor",
    "Damenmode":             "Apparel & Accessories > Clothing",
    "Herrenmode":            "Apparel & Accessories > Clothing",
    "Haustierbedarf":        "Animals & Pet Supplies > Pet Supplies",
    # «Aufbewahrung & Organizer» steht bewusst NICHT mehr hier — siehe AUFB_TITEL unten.
    "Elektronik":            "Electronics",
    "Schmuck":               "Apparel & Accessories > Jewelry",
}


SCHUHWERK = re.compile(r'\b\w*(schuhe?|stiefel|sandalen|slipper|pantoffeln)\b', re.I)
KLEIDUNG = re.compile(r'\b\w*(jacke|m[üu]tze|hose|pullover|pulli|schal|handschuh\w*|socken|'
                      r'shirt|kleid|mantel|weste|hemd|hoodie|str[üu]mpfe|stiefel|sandalen)\b', re.I)



# ─────────────────────────────────────────────────────────────────────────────
# DREI VORRANG-UMKEHRUNGEN, live nachgewiesen am 20.08.2026 (identisch in
# automation/google_kategorie.mjs, damit Importer und Backfill dasselbe sagen):
#
# (1) «Aufbewahrung & Organizer» ist beim CJ-Import ein SAMMELKORB, kein Zweck. 2'333 aktive
#     Produkte trugen die Warengruppe; 56 % hatten kein einziges Aufbewahrungswort im Titel —
#     Bratpfannen, Rasentrimmer, Lichterketten standen als Aufbewahrungsware im Feed. Der Pfad
#     war gültig, deshalb schlug keine Syntaxprüfung an. Neu: der Titel entscheidet zuerst;
#     erkennt er nichts, gibt es KEINEN Wert (dieselbe Regel wie bei «Trend-Gadget»).
# (2) `kategorie-tasche` stach die Warengruppe → 642 Regale und Organizer standen unter
#     «Handbags». Bei Aufbewahrungs-Signal wird der Taschen-Tag jetzt ignoriert.
# (3) `Spielzeug & Spiele` stach `haustier` → 17 Hundespielzeuge standen als KINDERspielzeug
#     im Feed. Haustier sticht jetzt Spielzeug.
# ─────────────────────────────────────────────────────────────────────────────
PET_TAGS = ("haustier", "hund", "katze", "pet")
PET_TITEL = re.compile(r'f[üu]r\s+(hunde|katzen|haustiere)\b|hundespielzeug|katzenspielzeug|'
                       r'\bhunde\w*|\bkatzen\w*|\bhaustier\w*', re.I)
HUND_T = re.compile(r'\bhund\w*|welpen', re.I)
KATZE_T = re.compile(r'\bkatze\w*|kitten', re.I)
AUFB_TYP = "Aufbewahrung & Organizer"

AUFB_TITEL = [
    (r'\bhunde\w*|\bkatzen\w*|\bhaustier\w*|futternapf|tier-?toilette|tierasche', "Animals & Pet Supplies > Pet Supplies"),
    (r'kinderwagen|\bbaby\w*|windel|kinderzimmer', "Baby & Toddler"),
    (r'\bauto-|kofferraum|armaturenbrett|lenkrad|autositz|\bkfz\b|r[üu]cksitz', "Vehicles & Parts > Vehicle Parts & Accessories"),
    (r'wandregal|h[äa]ngeregal|ablageregal|wandboard', "Furniture > Shelving > Wall Shelves & Ledges"),
    (r'\w*regal\b|\bregal\w*|\bshelf\b', "Furniture > Shelving"),
    (r'rasentrimmer|rasenm[äa]her|gartenschere|gie[sß]{1,2}kanne|blumentopf|pflanzk[üu]bel|pflanztopf|'
     r'gartenschlauch|heckenschere|gartenrechen|bonsai\w*', "Home & Garden > Lawn & Garden"),
    (r'\w*pfanne\w*|\bwok\b|kochtopf|\btopf\b|br[äa]ter\b|auflaufform|backform|backblech|schnellkochtopf|tarteform',
     "Home & Garden > Kitchen & Dining > Cookware & Bakeware"),
    (r'nudelmaschine|sandwichmaker|wasserkocher|\bmixer\b|toaster|kaffeemaschine|frittee?use|'
     r'k[üu]chenmaschine|entsafter|zerkleinerer|reiskocher|kaffeem[üu]hle|lunchbox',
     "Home & Garden > Kitchen & Dining > Kitchen Appliances"),
    (r'schneid(e)?brett|zitruspresse|knoblauchpresse|teigroller|dosen[öo]ffner|gew[üu]rzm[üu]hle|'
     r'pfefferm[üu]hle|messbecher|pfannenwender|\bsieb\b|salatschleuder|abtropfgestell|herdabdeck\w*',
     "Home & Garden > Kitchen & Dining > Kitchen Tools & Utensils"),
    (r'vorratsdose|butterdose|frischhalte\w*|teedose|brotdose|brotkasten', "Home & Garden > Kitchen & Dining > Food Storage"),
    (r'servierplatte|obstschale|\bteller\b|\btasse\b|teekanne|besteck|\bsch[üu]ssel\w*|karaffe|etagere',
     "Home & Garden > Kitchen & Dining > Tableware"),
    (r'\w*lampe\b|\w*leuchte\b|lichterkette|nachtlicht|\blaterne\w*|strahler|scheinwerfer|led-?streifen|\bbeleuchtung\w*',
     "Home & Garden > Lighting"),
    (r'badematte|badevorleger|badteppich', "Home & Garden > Bathroom Accessories > Bath Mats & Rugs"),
    (r'duschkopf|duschschlauch|handtuchhalter|wc-?sitz|toiletten\w*|seifenspender|zahnb[üu]rstenhalter|'
     r'duschvorhang|wasserhahn|lotionspender', "Home & Garden > Bathroom Accessories"),
    (r'bodenwischer|wischmopp|\bmopp\w*|kehrschaufel|m[üu]llbeutel|\bschwamm\w*|fusselentferner|'
     r'reinigungsb[üu]rste|\bputz\w*|fleckenentferner', "Home & Garden > Household Supplies > Household Cleaning Supplies"),
    (r'\brasierer\b|epilierer|haartrimmer|haarschneider|massageger[äa]t|gua\s?sha|nagelknipser|'
     r'zahnb[üu]rste\b|fussmassage|zahncreme|mundsp[üu]lung', "Health & Beauty > Personal Care"),
    # ⚠️ «Android TV Box» traf die Aufbewahrungsregel `\w*box\b` — «Box» heisst hier Gerät.
    # «Storage» ist bei Google AUFBEWAHRUNG, nicht Datenspeicher.
    (r'\bwlan\b|wi-?fi|steckdose\w*|\bventilator\w*|\bkamera\b|powerbank|ladeger[äa]t|ladestation|'
     r'bluetooth|kopfh[öo]rer|\busb\b|projektor|\blautsprecher\b|entfeuchter|\bhdmi\b|tv-?box|'
     r'\btastatur\w*|keycaps?|\bssd\b|\bnvme\b|\bm\.2\b|router\b', "Electronics"),
    (r'werkzeugtasche|werkzeugbox|werkzeugbeutel|werkzeugkoffer', "Hardware > Hardware Accessories > Tool Storage & Organization"),
    (r'\bbohrer\b|schraubendreher|\bzange\b|\bhammer\b|werkzeug\w*|\bs[äa]ge\b|cuttermesser|akkuschrauber', "Hardware > Tools"),
    (r'tischdecke|bettw[äa]sche|kissenbezug|\bvorhang\w*|picknickdecke|tischl[äa]ufer|duvet', "Home & Garden > Linens & Bedding"),
    (r'\bvase\b|wanddeko|wandverkleidung|bilderrahmen|kunstblume|kerzenhalter|\bteppich\w*|skulptur', "Home & Garden > Decor"),
    (r'weihnachts\w*|adventskalender|christbaum\w*|oster\w*', "Home & Garden > Decor > Seasonal & Holiday Decorations"),
    (r'kulturbeutel|toilettentasche|make-?up-?tasche|kosmetiktasche|schminktasche', "Luggage & Bags > Cosmetic & Toiletry Bags"),
    (r'handtasche|umh[äa]ngetasche|crossbody|schultertasche|\bclutch\b|g[üu]rteltasche|bauchtasche',
     "Apparel & Accessories > Handbags, Wallets & Cases > Handbags"),
    (r'rucksack|backpack|schulranzen', "Luggage & Bags > Backpacks"),
]
AUFB_TITEL = [(re.compile(r, re.I), z) for r, z in AUFB_TITEL]
AUFB_STORAGE = re.compile(
    r'aufbewahrungs?\w*|\baufbewahrung\b|organizer|organisator|kleiderb[üu]gel|schuhbox|schuhschrank|'
    r'w[äa]schekorb|kleidersack|schmucktablett|\w*box(en)?\b|\w*k[öo]rb(e)?\b|\w*kist(e|en)\b|beh[äa]lter|'
    r'\bschublade\w*|\w*etui\b|\w*haken\b|hakenleiste|\bhalter\b|\w*st[äa]nder\b|\bhalterung\b|\w*spender\b|'
    r'\bf[äa]cher\b|\btray\b|\w*ablage\b|garderobe|b[üu]cherst[üu]tze|schl[üu]sselbrett|\w*kasten\b|'
    r'k[äa]stchen|\w*dose\b|\w*tablett\b|\bsafe\b|\btresor\b|abfalleimer|m[üu]lleimer|kassette|\w*h[üu]lle\b', re.I)
# Zuletzt: irgendeine Tasche. «Luggage & Bags» ist der grobe RICHTIGE Vorfahr, «Handbags»
# wäre der genaue FALSCHE (Kühltasche, Instrumententasche, Reisetasche).
AUFB_BAG = re.compile(r'\w*tasche\w*|\w*beutel\b|\w*koffer\b|hardcase|trolley', re.I)

# ─────────────────────────────────────────────────────────────────────────────
# (4) DAS NOMEN BESTIMMT DIE PRODUKTART, NICHT DIE WARENGRUPPE (28.08.2026)
# Wortgleich mit `automation/google_kategorie.mjs` — die Regeln stehen bewusst in BEIDEN
# Dateien identisch, weil ein Backfill mit alten Regeln genau das rückgängig machen würde,
# was der Importer richtig anlegt (dieselbe Geschwister-Falle wie bei Farbtabelle,
# Preisformel und publishVerified()). Beide Fassungen wurden gegen dieselben 4'972 Produkte
# getestet und liefern Zeile für Zeile dasselbe Ergebnis.
#
# Vier Warengruppen vergaben ihre Kategorie BLANKO: «Spass-Elektronik» → Electronics
# (378 Holzpuzzle und Klemmbausteine), «Basteln & DIY» → Arts & Crafts (fertige Teppiche,
# Sofabezüge, Vorhänge, Bettwäsche), «Spielzeug & Spiele» → Toys (Kissenbezüge, nur weil
# «Plüsch» im Titel steht), «Gaming-Zubehör» → Konsolenzubehör (ein Karton-Brettspiel).
#
# ⚠️ DIE GEGENRICHTUNG IST GENAUSO TEUER — diese Titel sind RICHTIG eingeordnet und dürfen
# nicht angefasst werden: «Twill-Baumwollstoff für Bettwäsche & Vorhänge» (Meterware),
# «Dehnbare Yoga-Hose aus Ice Silk» (trotz Titel Meterware: Varianten «100 X 165CM -75D»),
# «DIY Malen nach Zahlen – Mein Kleid» (Bildmotiv), «DMC Kreuzstich-Set Pullover-Tier Hase»
# (Stickset), «Hohle Druckknöpfe-Set für Jeans» (Nähzubehör). Dafür sperrt ROHSTOFF.
# ⚠️ `\bstoff\b` genügt nicht — «Baumwollstoff», «Leinenstoff» sind Zusammensetzungen.
# ⚠️ Der Regressionstest fing drei eigene Fehlgriffe ab: `^plüsch \w+` machte aus 194
# «Plüsch Kostüm»/«Plüsch Maske»/«Plüsch Angler Hut» Kuscheltiere; `\w*teppich\w*` zog den
# WANDteppich zu den Bodenteppichen; eine allgemeine Kleidungs-Rückfallregel machte aus
# «Sneaker Schaumreiniger» einen Schuh.
# ─────────────────────────────────────────────────────────────────────────────
ROHSTOFF = re.compile(r'\w*stoff\w*|meterware|\bfabric\b|malen nach zahlen|\bgarn\b|n[äa]hen|'
                      r'zum\s+(besticken|bemalen|selbstgestalten)|besticken|druckkn[öo]pfe|'
                      r'reissverschluss|imitat f[üu]r|\bdiy\b|kreuzstich\w*|stickset|strickset|'
                      r'h[äa]kelset|bastelset|makramee', re.I)
ROHSTOFF_AUSNAHME = re.compile(r'schaumstoff|kunststoff|werkstoff|farbstoff|polsterstoff|klebstoff|treibstoff', re.I)

def ist_rohstoff(titel):
    if not ROHSTOFF.search(titel):
        return False
    return bool(ROHSTOFF.search(ROHSTOFF_AUSNAHME.sub("", titel)))

BAUSPIEL = re.compile(r'klemmbaustein\w*|bauklotz|baukl[öo]tz\w*|magnet-?bausteine|\bbaustein\w*|'
                      r'\bbaukasten\b|modellbausatz|\bbausatz\b|\bbausets?\b', re.I)
PUZZLE = re.compile(r'\bpuzzle\w*|3d-?holzpuzzle|holzpuzzle', re.I)
# RC-/Roboter-Bausätze bleiben absichtlich unberührt: das sind Grenzfälle, die ich nicht rate.
RC_WORT = re.compile(r'\brc\b|ferngesteuert\w*|\bdrohne\w*|hubschrauber|quadrocopter|\broboter\b|'
                     r'elektronisch\w*|programmierbar\w*|\bsolar\b', re.I)

HEIMTEXTIL = [
    (r'duschvorhang\w*', "Home & Garden > Bathroom Accessories > Shower Curtains"),
    (r'badteppich\w*|badematte\w*|badevorleger', "Home & Garden > Bathroom Accessories > Bath Mats & Rugs"),
    (r'wandteppich\w*|wandbehang\w*', "Home & Garden > Decor > Artwork > Decorative Tapestries"),
    (r'\w*teppich\w*', "Home & Garden > Decor > Rugs"),
    (r'sofa-?bezug|sofa-?[üu]berwurf|couch-?bezug|sesselbezug|sofahusse|\bhusse\w*', "Home & Garden > Decor > Slipcovers"),
    (r'kissenbezug\w*|kissenh[üu]lle\w*|zierkissen|dekokissen', "Home & Garden > Decor > Throw Pillows"),
    (r'\bvorhang\w*|\bvorh[äa]nge\b|gardine\w*', "Home & Garden > Decor > Window Treatments"),
    (r'bettw[äa]sche\w*|bettbezug|spannbettlaken|bettlaken|duvetbezug|tagesdecke', "Home & Garden > Linens & Bedding > Bedding"),
    (r'tischdecke\w*|tischl[äa]ufer', "Home & Garden > Linens & Bedding > Table Linens"),
]
HEIMTEXTIL = [(re.compile(r, re.I), z) for r, z in HEIMTEXTIL]
KLEIDUNG_NOMEN = [
    (r'\w*sneaker\w*|\w*halbschuh\w*|\blauflernschuhe\b|\bstiefel\w*|\bsandale\w*|\bpumps\b|winter-?schuhe',
     "Apparel & Accessories > Shoes"),
    (r'\bt-?shirt\w*|\bpolohemd\w*|\bhemd\b|\bbluse\w*|\bpullover\b|\bpulli\b|\bhoodie\w*|'
     r'\bsweatshirt\w*|\bcardigan\w*|strickjacke\w*|\bmantel\b|\bdaunenjacke\w*',
     "Apparel & Accessories > Clothing"),
]
KLEIDUNG_NOMEN = [(re.compile(r, re.I), z) for r, z in KLEIDUNG_NOMEN]
BRETTSPIEL = re.compile(r'brettspiel\w*|kartenspiel\w*|w[üu]rfelspiel\w*|gesellschaftsspiel\w*', re.I)
PLUESCHTIER = re.compile(r'pl[üu]schtier\w*|kuscheltier\w*|pl[üu]schfigur\w*|stofftier\w*', re.I)
PLUESCH_NICHT = re.compile(r'rucksack|kost[üu]m\w*|\bmaske\w*|\bhut\b|\bm[üu]tze\w*|hausschuh\w*|'
                           r'pantoffel\w*|\bdecke\b|kissen\w*|\btasche\w*|aufbewahrung\w*|beanbag|sitzsack', re.I)
BLANKO_TYP = ("Spass-Elektronik", "Basteln & DIY", "Spielzeug & Spiele", "Gaming-Zubehör")
# Hülle/Halter/Ständer: das Zubehör zum Gerät bleibt Aufbewahrung, nicht Elektronik.
HUELLE = re.compile(r'\w*h[üu]lle\b|\bhalter\b|\bhalterung\b|\w*st[äa]nder\b|\w*etui\b|'
                    r'erh[öo]hung|aufbewahrung\w*', re.I)

def kategorie(titel, tags, typ=None):
    titel = titel or ""
    t = {x.lower() for x in tags}
    typ = (typ or "").strip()

    # (3) Haustier sticht Spielzeug — ein Hundespielzeug ist kein Kinderspielzeug.
    if typ == "Spielzeug & Spiele" and (any(x in t for x in PET_TAGS) or PET_TITEL.search(titel)):
        if HUND_T.search(titel):
            return "Animals & Pet Supplies > Pet Supplies > Dog Supplies > Dog Toys"
        if KATZE_T.search(titel):
            return "Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Toys"
        return "Animals & Pet Supplies > Pet Supplies"

    # (4) Das Nomen sticht die Warengruppe — aber nie bei Rohmaterial (siehe ROHSTOFF).
    roh = ist_rohstoff(titel)
    ist_pet = any(x in t for x in PET_TAGS) or bool(PET_TITEL.search(titel))
    if typ in BLANKO_TYP and not roh and not ist_pet:
        for muster, pfad in HEIMTEXTIL:
            if muster.search(titel):
                return pfad
        for muster, pfad in KLEIDUNG_NOMEN:
            if muster.search(titel):
                return pfad
        if BRETTSPIEL.search(titel):
            return "Toys & Games > Games > Board Games"
        if not RC_WORT.search(titel):
            if PUZZLE.search(titel):
                return "Toys & Games > Puzzles"
            if BAUSPIEL.search(titel):
                return "Toys & Games > Toys > Building Toys"

    for muster, pfad in VORRANG:
        if muster.search(titel):
            return pfad

    # Ein Plüschtier ist Spielzeug, kein Babyartikel — «Plüsch Bush Baby Galagos» ist eine
    # Affenart, «Plüsch Adler Baby» das Jungtier des Motivs.
    if PLUESCHTIER.search(titel) and not PLUESCH_NICHT.search(titel):
        return "Toys & Games > Toys > Dolls, Playsets & Toy Figures > Stuffed Animals"

    # (1) Sammelkorb «Aufbewahrung & Organizer»: der Titel entscheidet, nicht die Warengruppe.
    ist_aufb = typ == AUFB_TYP or "aufbewahrung" in t or "organizer" in t
    if ist_aufb:
        for muster, pfad in AUFB_TITEL:
            if not muster.search(titel):
                continue
            if pfad == "Electronics" and HUELLE.search(titel):
                continue          # Zubehör zum Gerät bleibt Aufbewahrung
            return pfad
        if AUFB_STORAGE.search(titel):
            return "Home & Garden > Household Supplies > Storage & Organization"
        if AUFB_BAG.search(titel):
            return "Luggage & Bags"

    for tag, pfad in REGELN:
        if tag not in t:
            continue
        # (2) Ein Regal ist keine Handtasche.
        if ist_aufb and tag in ("kategorie-tasche", "damen-taschen", "aufbewahrung"):
            continue
        sperre = AUSNAHMEN.get(tag)
        if sperre and sperre.search(titel):
            continue
        # (4b) «Leuchtendes Hai-T-Shirt für Kinder» wurde über den Tag `beleuchtung` zum
        # Beleuchtungsartikel. Steht ein Kleidungs-NOMEN daneben, gewinnt das Nomen.
        if tag == "beleuchtung" and not roh:
            for muster, ziel in KLEIDUNG_NOMEN:
                if muster.search(titel):
                    return ziel
        return pfad
    # ⚠️ Auch die Warengruppe irrt. Unter «Spielzeug & Spiele» stehen acht Kleidungsstücke —
    # «Plüschjacke», «Plüschmütze Panda», «Baby-Schuhe mit Plüschfutter». Das Wort «Plüsch»
    # hat sie dorthin sortiert, nicht ihr Zweck. Eine Jacke als «Toys» anzubieten, spielt sie
    # in den falschen Suchen aus. Das Kleidungswort im Titel sticht deshalb die Warengruppe.
    if typ == "Spielzeug & Spiele":
        if SCHUHWERK.search(titel):
            return "Apparel & Accessories > Shoes"
        if KLEIDUNG.search(titel):
            return "Apparel & Accessories > Clothing"
    if typ == AUFB_TYP:
        return None          # kein Auffangnetz mehr — leer schlägt falsch
    return NACH_TYP.get(typ)


def main():
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")

    cur, gesehen, gesetzt, korrigiert, ohne_regel = None, 0, 0, 0, 0
    verteilung, proben, abweichungen = Counter(), defaultdict(list), []
    stapel = []
    while True:
        d = gql('query($c:String){products(first:150,after:$c,query:"status:ACTIVE"){'
                'pageInfo{hasNextPage endCursor} nodes{id title tags productType '
                'g:publishedOnPublication(publicationId:"gid://shopify/Publication/302872297857") '
                'mf:metafield(namespace:"mm-google-shopping",key:"%s"){value}}}}' % FELD,
                {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("  ⚠️ Abbruch — Liste unvollständig", flush=True)
            break
        for p in pg["nodes"]:
            if not p["g"]:
                continue                      # nur was im Google-Kanal steht, zählt hier
            gesehen += 1
            if p["id"] in done:
                continue
            neu = kategorie(p["title"], p["tags"], p.get("productType"))
            if not neu:
                ohne_regel += 1
                continue
            alt = ((p.get("mf") or {}) or {}).get("value")
            if alt:
                # Vorhandenes bleibt stehen — nur notieren, wo es abweicht.
                if alt != neu:
                    korrigiert += 1
                    abweichungen.append((p["title"], alt, neu))
                continue
            if len(proben[neu]) < 2:
                proben[neu].append(p["title"][:52])
            verteilung[neu] += 1
            gesetzt += 1
            stapel.append({"ownerId": p["id"], "namespace": "mm-google-shopping",
                           "key": FELD, "type": "single_line_text_field", "value": neu})
            if len(stapel) >= 25 and not DRY:
                schreiben(stapel, f)
                stapel = []
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        if gesehen % 6000 < 150:
            print(f"  … {gesehen} gesehen | {gesetzt} zu setzen", flush=True)
    if stapel and not DRY:
        schreiben(stapel, f)

    print(f"{'(DRY) ' if DRY else ''}FERTIG: {gesehen} im Google-Kanal | {gesetzt} leere Felder "
          f"gefüllt | {korrigiert} vorhandene Werte abweichend (unangetastet) | "
          f"{ohne_regel} ohne passende Regel")
    for pfad, n in verteilung.most_common():
        print(f"  {n:>5}  {pfad}")
        for b in proben[pfad]:
            print(f"          {b}")

    if abweichungen:
        pfad = "dropship/GOOGLE-KATEGORIE-ABWEICHUNGEN.md"
        with open(pfad, "w") as r:
            r.write("# Google-Kategorie: vorhandener Wert weicht von der Tag-Regel ab\n\n"
                    "Nichts davon wurde geändert. Die Liste dient dem Nachsehen: Wo der "
                    "vorhandene Pfad genauer ist (z. B. «Smart Watches» statt «Jewelry»), ist er "
                    "richtig und die Tag-Regel zu grob. Wo er offensichtlich unsinnig ist "
                    "(Lampe als Schmuck), lohnt eine Einzelkorrektur.\n\n"
                    "| Produkt | steht jetzt | Tag-Regel sagt |\n|---|---|---|\n")
            for titel, alt, neu in abweichungen[:400]:
                r.write(f"| {titel[:60]} | {alt} | {neu} |\n")
            if len(abweichungen) > 400:
                r.write(f"\n… und {len(abweichungen)-400} weitere.\n")
        print(f"  Abweichungen notiert in {pfad}")


def schreiben(stapel, f):
    r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m)'
            '{userErrors{message}}}', {"m": stapel})
    errs = ((r.get("data") or {}).get("metafieldsSet") or {}).get("userErrors")
    if errs:
        print(f"  ⚠️ {errs[0]['message']}", flush=True)
        return
    for m in stapel:
        f.write(f"{m['ownerId']}\t{m['value']}\n")
    f.flush()
    time.sleep(0.3)


if __name__ == "__main__":
    main()
