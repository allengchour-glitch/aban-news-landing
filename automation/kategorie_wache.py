#!/usr/bin/env python3
"""kategorie_wache.py — setzt die Shopify-Produktkategorie (Standard-Taxonomie) für aktive Produkte, die keine haben.

GEMESSEN 23.09.2026 (Task #101): die App «Shop» (Shop-Kanal) meldete 33'863 aktive Produkte «Dieses Produkt ist in
Shop nicht auffindbar. Prüfe den Angebotsstatus im Shop-Kanal». Vergleich 250 Produkte mit/ohne Meldung: EINZIGES
Unterscheidungsmerkmal `category` — 222/222 mit Meldung OHNE Kategorie, 0/28 ohne Meldung. Neueste 3'000 aktive:
2'923 ohne Kategorie, alle `cj-real` (die Importer setzen `productType`, aber keine Taxonomie-Kategorie). Der alte
Zuweiser (google_category_assign.py, 30.08.) kannte die neuen Typen nicht (Haustierbedarf, Make-up, Küche & Bar,
Aufbewahrung & Organizer, Kinderschuhe, Nageldesign, Spass-Elektronik, Basteln & DIY …) und lief nur von Hand.

REGEL: productType → Taxonomie-ID (Tabelle unten, IDs am 23.09. per `taxonomy.categories(search:)` gemessen und beim
Start per `nodes(ids:)` verifiziert — eine unbekannte ID bricht den Lauf ab, bevor etwas geschrieben wird). Unbekannte
Typen werden NICHT geraten, sondern im Bericht gezählt. Schreiben in 25er-Mutationen (aliasiert), Eimer-Etikette nach
jeder Antwort, Rücklesen aus der Mutationsantwort (category.id == Ziel), Ledger je Handle. CAP begrenzt je Lauf
(Standard 3000); täglich im Aufseher, bis 0 offen. DRY (Standard) misst nur; SCHARF=1 schreibt.
Stand: dropship/_kategorie_stand.json (Ampel «KATEGORIE: N aktive ohne Kategorie»), Bericht dropship/KATEGORIE-WACHE.md.
"""
import datetime, json, os, sys, time, subprocess, collections, threading, fcntl
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eimer_etikette import nachlauf, bilanz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.path.join(ROOT, "dropship", "_kategorie_stand.json")
BERICHT = os.path.join(ROOT, "dropship", "KATEGORIE-WACHE.md")
LEDGER = os.path.join(ROOT, "dropship", "_kategorie_gesetzt.txt")
SHOP = "au3j0y-hq.myshopify.com"
TOK = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or (open("/tmp/cj_shop_token.txt").read() if os.path.exists("/tmp/cj_shop_token.txt") else "")).strip()
SCHARF = os.environ.get("SCHARF") == "1"
CAP = int(os.environ.get("CAP", "3000"))
# 23.09. GEMESSEN: 25 aliasierte productUpdate je Anfrage laufen bei Shopify SERIELL (~0,5 s je Produkt, 15 s je
# Batch) — der Eimer (100 Punkte/s, 10 je productUpdate) war dabei zu 90 % leer. Ein Lauf schaffte 100/min, die
# 42'000 offenen haetten 7 h gebraucht — bei stuendlichen Container-Neustarts nie. WORKER parallele Batches
# (Standard 3 = ~75 Punkte/s, laesst dem Rest des Shops Luft; die Eimer-Etikette bremst jeden Worker selbst).
WORKER = max(1, int(os.environ.get("WORKER", "3")))
SPERRE = "/tmp/kategorie_wache.lock"   # zwei Laeufe (Aufseher taeglich + Nachlauf) schrieben sonst dieselben Produkte doppelt
TC = "gid://shopify/TaxonomyCategory/"

# productType → Taxonomie-ID. Oberklassen reichen dem Shop-Kanal; feiner ist besser, aber nie geraten.
TABELLE = {
    # Tiere
    "Haustierbedarf": "ap-2", "Haustier": "ap-2", "Haustier & Sommer": "ap-2",
    # Taschen
    "Taschen": "lb", "Tasche": "lb", "Rucksack": "lb", "Taschen & Reise": "lb", "Taschen & Accessoires": "lb",
    # Bekleidung
    "Damenmode": "aa-1", "Herrenmode": "aa-1", "Mode": "aa-1", "Damen-Mode": "aa-1", "Herren-Mode": "aa-1",
    "Kleid": "aa-1-4", "Damen-Kleid": "aa-1-4", "Shirt": "aa-1", "Damen-Top": "aa-1", "Damen-Set": "aa-1",
    "Blazer": "aa-1", "Cardigan": "aa-1", "Jacke": "aa-1", "Bluse": "aa-1", "Rock": "aa-1", "Shorts": "aa-1",
    "Damen-Hose": "aa-1", "Weste": "aa-1", "Jumpsuit": "aa-1", "Jeans": "aa-1", "Set": "aa-1", "Sport-Set": "aa-1",
    "Herren-Set": "aa-1", "Kindermode": "aa-1", "Unterwäsche": "aa-1", "Bademode": "aa-1",
    # Schuhe
    "Kinderschuhe": "aa-8", "Herrenschuhe": "aa-8", "Damenschuhe": "aa-8", "Sportschuhe": "aa-8", "Schuhe": "aa-8",
    "Sneaker": "aa-8", "Sandalen": "aa-8", "Sandalette": "aa-8", "Pumps": "aa-8", "Ballerina": "aa-8", "Slip-on": "aa-8",
    "Slides": "aa-8", "Herren-Schuhe": "aa-8", "Damen-Schuhe": "aa-8", "Damen-Sandalen": "aa-8", "Stiefel": "aa-8",
    # Schmuck & Uhren & Accessoires
    "Schmuck": "aa-6", "Damen-Schmuck": "aa-6", "Halskette": "aa-6-8", "Ohrringe": "aa-6", "Armband": "aa-6", "Ring": "aa-6",
    "Uhren": "aa-6-11", "Uhr": "aa-6-11", "Smartwatch": "aa-6-12",
    "Sonnenbrille": "aa-2-27", "Sonnenbrillen": "aa-2-27", "Hüte & Caps": "aa-2-17", "Hut": "aa-2-17", "Sonnenhut": "aa-2-17", "Mütze": "aa-2-17", "Accessoires": "aa-2",
    "Kostüm": "aa-3-3", "Kostüme": "aa-3-3",
    # Beauty
    "Make-up": "hb-3-2-6", "Beauty": "hb-3-2-6", "Beauty & Pflege": "hb-3-2-6", "Nageldesign": "hb-3-2-7",
    "Beauty-Tools": "hb-3-2-5", "Beauty-Tool": "hb-3-2-5", "Hautpflege": "hb-3-2-9", "Haarpflege": "hb-3-10",
    "Wellness & Spa": "hb-3-11-9", "Wellness": "hb-3-11-9", "Aroma-Diffuser": "hb-3-11-9",
    # Wohnen
    "Wohnen & Deko": "hg-3", "Wohnen": "hg-3", "Deko": "hg-3", "Wohnaccessoire": "hg-3", "Schlafen & Wohnen": "hg-3",
    "Deko & Wohnaccessoires": "hg-3", "Vase": "hg-3-67", "Heimtextilien": "hg-15",
    "Aufbewahrung & Organizer": "hg-10-16", "Aufbewahrung": "hg-10-16", "Haushalt": "hg-10", "Haushalt & Hobby": "hg-10",
    "Wellness & Haushalt": "hg-10", "Beleuchtung": "hg-13", "Garten & Beleuchtung": "hg-13",
    "Küche & Bar": "hg-11", "Küche": "hg-11", "Küche & Haushalt": "hg-11", "Küchenhelfer": "hg-11-8",
    "Trinkflasche": "hg-11", "Trinkflaschen": "hg-11", "Bad": "hg-1", "Bad & Wellness": "hg-1",
    "Sommer & Kühlung": "hg-9", "Ventilator": "hg-9", "Gartenwerkzeug": "hg-12-1", "Garten & Pflanzen": "hg-12-1",
    "Outdoor": "sg", "Outdoor & Sommer": "sg", "Sport & Outdoor": "sg", "Reise & Outdoor": "lb", "Reise-Zubehör": "lb",
    "Grill-Zubehör": "hg-11", "Fitness": "sg",
    # Elektronik
    "Elektronik": "el", "Spass-Elektronik": "el", "Gadget": "el", "Gadgets": "el", "Tech": "el", "Tech-Gadget": "el",
    "Sommer-Gadget": "el", "Outdoor & Gadget": "el", "Handy-Zubehör": "el", "Audio": "el-2",
    # Sonstiges
    "Basteln & DIY": "ae-2-1", "Musikinstrumente": "ae-2-8", "Spielzeug & Spiele": "tg-5", "Spielzeug": "tg-5",
    "Auto-Zubehör": "vp-1", "Büro": "os", "Baby": "bt", "Partydeko": "ae-3-2",
    # Nachtrag 23.09. nach dem ersten Vollscan (4'181 unbekannt): IDs per taxonomy.categories(search:) gemessen.
    "Kostüme & Verkleidung": "aa-3-3", "Werkzeug & Heimwerken": "ha-15", "Gaming-Zubehör": "el-18",
    "Partydeko & Ballone": "ae-3-2", "Raucherzubehör": "hg-19", "3D-Druck": "el-13-2", "Süsswaren & Esswaren": "fb-2-3-1",
    "Haushalt & Wohnen": "hg-10", "Home & Living": "hg-3", "Wohnen & Dekoration": "hg-3", "Aufbewahrung & Ordnung": "hg-10-16",
    "Bügeltransfer": "ae-2-1", "Geschenkset": "hg-3",
    # bewusst NICHT geraten: "Trend-Produkt", "Kinder", "Schweizer Editionen", "Selbst gestalten", "Anime" → Bericht.
}

# 23.09. Verbesserungs-Audit (Gegenpruefung bestaetigt): SAMMEL-Typen sind kein Warenbegriff. «Trend-Gadget» stand
# pauschal auf Electronics (818 Stueck, darunter Pluesch-Elefant, Yogamatte, Kinderkleid, Hundeleine), «Spass-Elektronik»
# auf Electronics (554 davon Klemmbausteine/3D-Holzpuzzles), «Aufbewahrung & Organizer» auf Storage (1'271 ohne
# Ordnungswort: Wasserkocher, Saugroboter, Barhocker). Fuer diese Typen entscheidet jetzt der TITEL; passt keine
# Regel, wird NICHT geraten (Produkt bleibt ohne Kategorie und steht im Bericht).
SAMMELTYPEN = {"Trend-Gadget", "Trend-Produkt", "Kinder", "Selbst gestalten", "Schweizer Editionen", "Anime", "Spass-Elektronik", "Gadget", "Gadgets", "Aufbewahrung & Organizer", "Aufbewahrung",
               "Aufbewahrung & Ordnung", "Geschenkset", "Haushalt & Wohnen", "Home & Living", "Wohnen & Dekoration",
               "Sommer-Gadget", "Outdoor & Gadget", "Tech-Gadget", "Haushalt", "Haushalt & Hobby",
               "Baby & Kinder", "Büro & Home Office"}
import re as _re
TITELREGELN = [   # Reihenfolge = Vorrang; Wortfallen (Lehre 9b): Handschuh ≠ Schuh, Armbanduhr ≠ Armband, Schale ≠ Schal
    # 02.10.: Lehrmodelle zuerst — «PVC Hundeskelett-Modell» wäre über «skelett» Halloween-Deko geworden, «Hundeohr
    # Anatomie-Modell» über «hund» Tierbedarf. bi-19-8 = Medical Teaching Equipment (gemessen 02.10.).
    (r"anatomi\w*|\w*skelett-?modell|verdauungssystem|organmodell", "bi-19-8"),
    # 05.10.2026 (Prüfer «kategorie», Plan 6): «Adventskalender Blind Box Sammlung 2026» wurde über `\bbox\b` Storage &
    # Organization; hg-3-58-1 = Advent Calendars (gemessen 05.10. per taxonomy.categories(search:"advent")) ist genauer
    # als Party Supplies. Steht VOR Aufbewahrung/Puzzle/Baustein, weil ein Kalender ein Kalender bleibt.
    (r"adventskalender|advent-?kalender", "hg-3-58-1"),
    # 05.10.2026: ferngesteuertes TIER ist Spielzeug, kein Tierbedarf — «Smart Sensor Stunt-Hund mit Fernbedienung» stand
    # seit 23.09. auf Pet Supplies (Bindestrich = Wortgrenze, `\bhund` traf). tg-5-18 = Remote Control Toys (gemessen 05.10.).
    # Regression 05.10. (5'165 Sammeltyp-Produkte): «Saugroboter mit Fernbedienung» wäre Spielzeug geworden → Haushaltsroboter raus.
    (r"^(?!.*(?:saug|staub|putz|wisch|mäh|küchen|fenster|pool|rasen)-?roboter)(?:.*(?:fernbedienung|ferngesteuert\w*|\brc\b).*(?:\bhund(?!ert)|\bkatz|\btier\w*\b|roboter|\bdino)|.*(?:\bhund(?!ert)|\bkatz|\btier\w*\b|roboter|\bdino).*(?:fernbedienung|ferngesteuert\w*|\brc\b))", "tg-5-18"),
    # 04.10.2026 (Verbesserungsrunde «kategorie-typ»): Tierware VOR Schuh/Kleid/Kostüm — gemessen standen «Hunde-
    # Outdoorschuhe» unter Shoes, «Kaschmir-Pullover für Haustiere» unter Clothing, «Halloween-Kostüm für Hunde» unter
    # Costumes. Wortfallen: hund(?!ert) = «Hunderte», katze(?!nauge) = «Katzenaugen-Sonnenbrille».
    # Nur eindeutige Tierbedarfs-Konstruktionen — ein Tier als MOTIV («Katzen-Ohrringe», «Stunt-Hund mit Fernbedienung»,
    # «Schlüsselanhänger Katze») bleibt bei den Warenregeln weiter unten.
    (r"für (deinen |deine |den |die )?(hunde?|katzen?|haustiere?|welpen?)\b|"
     r"\bhunde-?(leine|geschirr|halsband|bett|napf|mantel|pullover|schuhe|jacke|kostüm|spielzeug|bürste|outdoorschuhe|regenmantel|weste)\w*|"
     r"\bkatzen-?(bett|klo|streu|kratz\w*|spielzeug|halsband|tunnel|haus|höhle)\w*|\bhaustier-?(bett|bürste|pullover|kostüm|napf)\w*|kratzbaum|futternapf", "ap-2"),
    (r"\b(rc|ferngesteuert\w*|drohne\w*|quadcopter)\b", "el"),
    (r"baustein|bausatz|baukasten|bauklötz|klemmbaustein|modellbau", "tg-5-7"),
    (r"puzzle", "tg-4"),
    (r"plüsch|kuscheltier|stofftier", "tg-5-8-11"),
    (r"aufbewahrung|organizer|(?<!blind )(?<!blind-)(?<!blind)\bboxen?\b|(?<!blind )(?<!blind-)(?<!blind)box\b|kästchen|(?<!bau)(?<!werkzeug)kasten\b|bügel\b|\bkorb|körbe|schublade|behälter|kiste|\bdosen?\b|staufach|\btray\b|beutel", "hg-10-16"),
    (r"(?<![a-zäöü])(?:armband|damen|herren|quarz|smart|taschen|kinder)?uhr\b|armbanduhr", "aa-6-11"),
    (r"perücke", "aa-2-14-12"),
    (r"kostüm|verkleidung", "aa-3-3"),
    (r"(?<!hand)(schuh|sandale|stiefel|sneaker|slipper|pantoffel)", "aa-8"),
    # 04.10.: «\w*shirt\b|sweatshirt» ergänzt — «Langarm-Sweatshirt mit Totenkopf-Print» stand als Party-Supplies, weil
    # «\bshirt\b» das Kompositum nicht traf und die Halloween-Regel darunter zuerst griff.
    (r"\b(kleid|shirt|t-shirt|hose|pullover|hoodie|jacke|bluse|rock|bikini|badeanzug|socken|leggings|jumpsuit|strickjacke|mantel|weste|pyjama)\b|kleid\b|hemd\b|\w*shirt\b|sweatshirt", "aa-1"),
    # 24.09. (Prüfer Halloween-Ratgeber): «Skelett-Gerippe für Halloween-Deko» stand als Spass-Elektronik auf Electronics,
    # der «Geist-Anhänger mit Halloween-Beleuchtung» wäre über «anhänger» Schmuck geworden. Saisondeko VOR Schmuck/Lampe,
    # NACH Aufbewahrung/Kostüm/Kleidung (Kürbis-Korb bleibt Ordnung, Halloween-Kleid bleibt Kleid).
    (r"halloween|kürbis(?!kern)|totenkopf|skelett|fledermaus|spinnennetz|\bgeist(er)?\b|grusel|\bhexen?\b|vampir|zombie", "ae-3-2"),
    (r"halskette|ohrring|ohrstecker|(?<!uhr)armband(?!uhr)|\bring\b|schmuck|anhänger\b|brosche", "aa-6"),
    (r"rucksack", "lb-1"),
    (r"(hand|umhänge|reise|sport|kosmetik|kultur)tasche", "lb"),
    # 04.10.: hund(?!ert) + katze(?!nauge) — «Hunderte LED», «Hundertwasser», «Katzenaugen-Sonnenbrille» wurden Tierbedarf.
    (r"\bhund(?!ert)\w*|\bkatz(?:e(?!nauge)|en(?!auge))\w*|\bhaustier\w*|\bwelpe\w*|hundeleine|futternapf|kratzbaum", "ap-2"),
    (r"yoga|fitness|hantel|widerstandsband|springseil|trainingsgerät|gymnastik", "sg-2"),
    (r"lippenstift|lidschatten|mascara|blush|make-?up|puder|eyeliner|nagellack", "hb-3-2-6"),
    (r"vase\b|vasen\b", "hg-3-67"),
    (r"handtuch|badetuch", "hg-15-4-1"),
    (r"wasserkocher|pfanne|kochtopf|\btopf\b|messbecher|schneidebrett|küchen\w*", "hg-11"),
    (r"lampe|leuchte|nachtlicht|lichterkette|led-licht|\bled\b", "hg-13"),
    (r"smart\s?-?watch|smartuhr|fitness-?tracker|fitnessuhr", "aa-6-12"),
    # 05.10.2026: «Intelligente WLAN-Steckdose» wurde über `dose\b` Storage & Organization. Keine Taxonomie-Klasse «Smart Plug»
    # (gemessen 05.10., search "smart plug"/"outlet" leer) → el-7-15 Electronics Accessories > Power; Leisten el-7-15-8.
    (r"steckdosenleiste|mehrfachsteckdose|steckerleiste", "el-7-15-8"),
    (r"steckdose|smart-?plug|wlan-?stecker|zwischenstecker", "el-7-15"),
    (r"\b(usb|akku|bluetooth|kopfhörer|lautsprecher|powerbank|ladegerät|ladekabel|kabel|smart\w*|kamera|projektor|beamer|mikrofon|adapter)\b", "el"),
    (r"aufbewahrung|organizer|\bbox\b|korb|regal|halter\b|ablage|behälter|kiste|schublade|(?<!steck)dose\b|haken\b|ordnung", "hg-10-16"),
    # 24.09.2026 — zweite Welle fuer «Trend-Produkt»/«Trend-Gadget» (511 ohne Treffer). Niedrigerer Vorrang als alles oben;
    # Wortfallen: Tier-HAAR ≠ Haarpflege, AUTO-matisch ≠ Auto, Kleider-BÜGEL ≠ Kleid, Schw-ESTER ≠ Weste.
    (r"fahne\w*|flagge\w*|lampion\w*|wimpel", "ae-3-2"),
    (r"fusselroller|tierhaar-?entferner", "hg-10"),
    (r"tierhaar|fellpflege|dampfbürste für tiere", "ap-2"),
    (r"lipp\w*|lip\s?(plumper|gloss|balm|oil)", "hb-3-2-6"),
    (r"sonnenbrille|\bbrille\b", "aa-2-27"),
    (r"(?<!reinigungs)(?<!wasch)handschuh\w*|schal\b|gürtel", "aa-2"),
    (r"armreif|(hals|liebes|fuss|arm)kette|\bkette\b", "aa-6"),
    (r"feuerzeug|aschenbecher", "hg-19"),
    (r"\b(hut|mütze|beanie|cap|kappe)\b|baseballcap", "aa-2-17"),
    (r"anklet|fusskett|tassel-?schmuck|pendel\w*\b", "aa-6"),
    (r"baby|neugeboren|strampler|kinderwagen|schnuller|windel|lätzchen|krabbel", "bt"),
    (r"\bauto(?:-|\b)|\bkfz\b|fahrzeug|lenkrad|autositz|scheibenwischer", "vp-1"),
    (r"luftbefeuchter|diffus[eo]r|luftreiniger|ventilator|(?<!be)lüfter|staubsauger|entfeuchter|heizgerät|heizer\b|wasserkocher|befeuchter|feuchter\b|air\s?fryer|heissluftfritteuse", "hg-9"),
    (r"ohrhörer|earbuds|headset|kopfhörer|lautsprecher|soundbar", "el-2"),
    (r"gaming|controller|konsole|joystick", "el-18"),
    (r"tastatur|(?<!fleder)maus\b|handy\w*|iphone|smartphone|ladestation|wlan|wi-?fi|kamera|tablet|ladeger|powerbank|türklingel|drohne|walkie|\bfunk\w*|gimbal|selfie|stativ|projektor|adapter\b|drucker", "el"),
    (r"(jacke|hosen?|shorts|hemd|mantel|overall|pullover|sweatshirt|kleid|shirt|bluse|weste|leggings|pyjama|pajama|unterwäsche|socken|anzug|strampler|cardigan|tunika|outfits?|jumpsuit|top)\b", "aa-1"),
    (r"(?<!tier)(?<!tier-)haar\w*|glätter|lockenstab|föhn|haartrockner|glätteisen", "hb-3-10"),
    (r"wimpern|augenbrauen|pinzette|kosmetik-?pinsel|schminkpinsel|make-?up-?(pinsel|schwamm)|nagel\w*", "hb-3-2-5"),
    (r"gesicht\w*|\bhaut\w*|poren\w*|nasenreiniger|creme|serum|peeling|schönheitsmaske|gesichtsmaske|reinigungsbürste", "hb-3-2-9"),
    (r"(trink|wasser|thermo|sport|tee)flasche|thermos|tumbler|\btasse\b|becher\b|entsafter|mixer\b|shaker|knoblauchpresse|gemüse\w*|schale\b|warmhalteplatte|messerschärfer|sprühflasche|wasserspender|küchenhelfer", "hg-11"),
    (r"tasche\b|taschen\b|duffel\w*|\bbag\b|geldbörse|portemonnaie|brieftasche|clutch|kartenetui", "lb"),
    (r"kissen|bettwäsche|bettlaken|bettdecke|kuscheldecke|\bdecke\b|matratze", "hg-15"),
    (r"vorhang|gardine|teppich|wanddeko|wandbild|bilderrahmen|\bdeko\b|deko-|dekoration|kerze|figur\b|statue|\bspiegel\b|wandspiegel|weihnacht\w*|girlande", "hg-3"),
    (r"werkzeug|schraub\w*|bohr\w*|zange|multitool|messgerät|messschieber|wasserwaage", "ha-15"),
    (r"garten|pflanz\w*|blumentopf|bewässerung|gießkanne|giesskanne", "hg-12-1"),
    (r"ukulele|gitarre|klavier|keyboard|trommel|mundharmonika", "ae-2-8"),
    (r"spielzeug|puppe|\bspiel\b|kreisel|seifenblase|rennwagen|\bdrift\b", "tg-5"),
    (r"camping|zelt|wander\w*|fahrrad\w*|angel\w*|\bsport\w*|golf|tennis|ski\b", "sg"),
    (r"stift|notizbuch|schreibtisch|büro\w*|kalender|etikett", "os"),
    (r"badezimmer|dusch\w*|\bbad\b|toilette|seifenspender|zahnpasta|dispenser", "hg-1"),
    (r"putz\w*|reinig\w*|fusselroller|mopp|besen|wäsche\w*", "hg-10"),
    # 29.09.2026 — dritte Welle (Verbesserungsrunde): 174 aktive Sammeltyp-Produkte ohne Treffer, obwohl der Titel eindeutig
    # ist (Komposita und Transliterationen: «Automatikuhr», «Sommermütze», «Faltenhundebett», «Kuechenreibe», «Glättbürste»).
    # Steht HINTER allen älteren Regeln → ändert keine bisherige Zuordnung. IDs am 29.09. per taxonomy gemessen.
    (r"shapewear|korsett|mieder|\w*shaper\b|formschneider|arm-?shaping", "aa-1-6-10"),
    (r"fussfeile|zehenspreizer|hühneraug\w*", "hb-3-9"),
    (r"massag\w*|masseur|halsheber", "hb-3-11-8"),
    (r"haltung\w*|rückenstabilisator|halsstütz\w*", "hb-3-1-3"),
    (r"ätherische\w* öl\w*", "hb-3-21"),
    (r"parfum|parfüm", "hb-3-2-8"),
    (r"gua\s?sha|eyebrow|augenbrauen\w*|beauty[- ]instrument|mitesser", "hb-3-2-5"),
    (r"cream\b|augenpartie|augenpflege|körperöl|feuchtigkeitspfleg\w*|schönheitspflaster", "hb-3-2-9"),
    (r"glätt\w*|\bkamm\b|ion-kamm", "hb-3-10"),
    (r"rasier\w*|shaver|bart\w*|zahnbürste|manicure|maniküre|pedicure|pediküre|schlafmaske", "hb-3"),
    (r"atemschutz\w*", "hb-1"),
    (r"automatikuhr|uhrwerk|tourbillon|\buhren\b", "aa-6-11"),
    (r"perl\w*|collier|ohrhänger|zirkon\w*|fingerkette|armbänder|medaillon|klangkette|goldgarnitur|anhanger\b|(schlangen|umarmungs|kreuz)ring\b", "aa-6"),
    (r"airpods|kopfhoerer", "el-2"),
    (r"schutzglas|glas-schutz|panzerglas", "el-7-11-5"),
    (r"hülle|\bcase\b", "el-4-8-4-2"),
    (r"mauspad", "el"),
    (r"mausarm\w*|handgelenkauflage", "os"),
    (r"hemden|jogger|sakko|blazer|oberteil\w*|kardigan|pulli\w*|trenchcoat|pareo\w*|\w*kleider\b|\w*kleidung\w*|jeans|\w*dress\b|sommeroben|schlüpfer", "aa-1"),
    (r"pumps|high heels|stiletto|flip-?flops|pantinen|sandal\w*|schnürsenkel", "aa-8"),
    (r"\w*mütze\b|sonnenhut", "aa-2-17"),
    (r"hundebett|zugleine|futterautomat|\bcat\b", "ap-2"),
    (r"\btote\b|münzbörse", "lb"),
    (r"hängematte", "hg-12-2-4"),
    (r"fussmatte", "hg-3-26"),
    (r"fingerschutz", "hg-11-8"),
    (r"öffner|schäler|hacker\b|\w*mühle\b|reibe\b|pizza|waffel\w*|sandwich|belüfter|tee-ei|ananas|salat\w*|gemuese\w*|getreidespender|thermobe[ck]er|shredder|fischschuppen", "hg-11"),
    (r"\w*trainer\b|trainingsrad|trainingsgurt|bauchmuskel\w*|widerstands-?bänder|kraftbänder|wrist wraps|handgelenkstütze", "sg-2"),
    (r"seifen-?spender|schaumseifen\w*", "hg-1"),
    (r"staubbläser|\bfan\b", "hg-9"),
    (r"solar\w*|beleuchtung|\w*-licht\b", "hg-13"),
    (r"\w*decke\b", "hg-15"),
    (r"tapestry|wandkunst|nachrichtentafel|teelicht\w*|fächer\b", "hg-3"),
    (r"truhe\b", "hg-10-16"),
    (r"türschloss für kinder|schutzhaube f\w* kinder|kindersitz|schreibhilfe für kinder", "bt"),
    (r"möbelheber", "ha-15"),
    # 04.10.2026 — vierte Welle (Verbesserungsrunde «kategorie-typ»): 30 aktive Sammeltyp-Produkte ohne Treffer, Titel
    # gelesen. Nur Titelwörter, die EINE Ware bedeuten; IDs am 04.10. per nodes(ids:) gemessen. Steht hinter allen älteren
    # Regeln. Was der Titel allein nicht sagt («Gel-Pads», «Antirutsch-Mat», «Karo-Etui»), entscheidet kategorie_ki.py
    # (zwei Modelle, Beschreibung) — hier wird NICHT geraten.
    (r"tattoo-?sticker|temporäre?s? tattoos?|klebetattoo|körpertattoo", "hb-3-2-6-7"),
    (r"wandsticker|wandtattoo|wandaufkleber|(fliesen|möbel|boden|fenster)-?(sticker|aufkleber)", "hg-3"),
    (r"vision board|\bstickers?\b", "ae-2-1-2-8-4"),
    (r"\bboots?\b|stiefelette\w*", "aa-8"),
    (r"latzrock|minirock|maxirock|midirock|faltenrock|jeansrock|wickelrock|bleistiftrock|tüllrock|lederrock|plisseerock", "aa-1"),
    (r"\bbhs?\b|bralette|büstenhalter|bustier", "aa-1-6-3"),
    (r"filament\w*", "el-13-1-5"),
    (r"ladekarte|anti-verlust|gps-?tracker|schlüsselfinder|key ?finder|\btracker\b", "el"),
    (r"\bmarker\b|marker-?set|textmarker|filzstift\w*|fineliner", "os-11-11-4"),
    (r"kugelschreiber|gelstift\w*|buntstift\w*|bleistift\w*|radiergummi|füllfeder\w*", "os-11-11"),
    (r"journal\b|tagebuch|notizheft|notizblock|skizzenbuch", "os-4-9-9"),
    (r"glücksmünze|gedenkmünze|sammelmünze|\bmünze\b", "ae-2-2-2-2"),
    (r"tastenkappe\w*|keycaps?\b", "el-7-9-11-3-2"),
    (r"federmäppchen|federmappe|federtasche|mäppchen|(stifte|schreibwaren|stift)-?etui", "os-3-16"),
    (r"regenschirm|faltschirm|taschenschirm|stockschirm", "hg-16-2"),
    (r"filterstrohhalm|wasserfilter-?strohhalm", "sg-4-2-12"),   # «Wasserfilter für Küche» bleibt Küche (hg-11)
    (r"regentonne|regenfass|regenwassertonne", "hg-12-1-17"),
    (r"autobürste|felgenbürste|autopflege|auto-?innenraum|kfz-?reinigung|autoschlüssel|"
     r"(fiat|vw|volkswagen|bmw|audi|mercedes|toyota|ford|opel|skoda|seat|peugeot|renault|hyundai|kia|honda|nissan|mazda|tesla|volvo|porsche|suzuki|dacia)-?schlüssel", "vp-1"),
    (r"saugglas|gläserbürste|flaschenbürste|spülbürste|geschirrbürste|abwaschbürste|becherbürste", "hg-11-8"),
    (r"seifengrinder|seifenreibe|seifenhalter|seifenschale", "hg-1"),
    (r"badematte|badteppich|duschmatte|badvorleger|diatomeen\w*", "hg-1-2"),
    (r"infrarot-?zähler|zählgerät|handzähler|stückzähler|personenzähler", "os-11"),
    (r"(baumwoll|strick|fleece|jersey|sport|hosen)-?(set|anzug)\b.*\b(jungen|mädchen|kinder|kids|baby)|\b(jungen|mädchen)-?(set|outfit|anzug)\b", "aa-1-25-5"),
]
_TR = [(_re.compile(m, _re.I), z) for m, z in TITELREGELN]

# 02.10.2026 (Verbesserungsrunde): der wieder eingeschaltete Grind legte in 20 h 96 aktive «Baby & Kinder» an — fast alles
# Kinderkleidung (Strampler, Sets, Badeanzüge) — und 7 «Büro & Home Office» (Anatomiemodelle, Badeball-Set, Mauspad).
# Beide Typen standen nirgends → 0 Kategorie. «Baby & Kinder» bekommt eigene Regeln auf den Kinderzweig der Taxonomie
# (aa-1-25 Baby & Children's Clothing, gemessen 02.10. per childrenOf); Reihenfolge = Vorrang: Bad und Schlaf vor Set
# («Pyjama-Set» bleibt Schlafkleidung), Set vor Einteiler («Strampler-Set» = Outfit), Einteiler vor Oberteil/Hose
# («Strampler mit Schmetterlingsrock» = Einteiler). Trifft keine Kinderregel, gelten die allgemeinen Titelregeln — aber
# Erwachsenenkleidung (aa-1…) wird dort auf den Kinderzweig gehoben, nie als Damenmode eingeordnet.
KINDERTYPEN = {"Baby & Kinder"}
KINDERREGELN = [
    (r"bade\w*|\bbad\b|swim\w*|schwimm\w*|sonnenschutz", "aa-1-25-8"),
    (r"pyjama|pajama|schlafanzug|schlafsack|nachtwäsche|nachthemd", "aa-1-25-6"),
    (r"unterwäsche|unterhose|\bslips?\b|boxershorts?\b(?!.*bad)", "aa-1-25-11"),
    (r"faux\w*[- ]zweiteiler", "aa-1-25-3"),
    (r"swaddle|pucktuch|\w*decke\b", "bt-12"),
    # 04.10.: Pflege-/Geschenk-/Spielset ist kein Outfit («Tragbares Baby Beauty- und Pflegeset» wäre aa-1-25-5 geworden).
    (r"(?<!pflege)(?<!geschenk)(?<!spiel)(?<!bastel)(?<!bau)\bset\b|\w+(?<!pflege)(?<!geschenk)(?<!spiel)(?<!bastel)(?<!bau)-?set\b|outfit\w*|zweiteiler|dreiteiler|\w*teilig|\bsets\b", "aa-1-25-5"),
    (r"strampler|strampel\w*|romper|\w*body\b|onesie|overall|jumpsuit|latzhose", "aa-1-25-10"),
    (r"(top|shirt|oberteil|pullover|sweatshirt|polo|weste)\b.*\b(und|mit|&)\b.*(rock|hose\w*|shorts)\b", "aa-1-25-5"),
    (r"kleid\w*", "aa-1-25-3"),
    (r"jacke|mantel|\w*weste\b|cardigan|kardigan", "aa-1-25-4"),
    (r"\w*pullover|pulli\w*|\w*shirt\b|\btop\b|oberteil|hoodie|polo\b|bluse|longsleeve", "aa-1-25-9"),
    (r"hose\w*|shorts|\w*rock\b|leggings|jeans", "aa-1-25-1"),
    (r"socken|strumpf\w*", "aa-1-25-7"),
    (r"\w*mütze\b|\bhut\b|haarband|stirnband", "aa-2-33-3"),
]
_KR = [(_re.compile(m, _re.I), z) for m, z in KINDERREGELN]


# Ohne passende Titelregel: bisheriger Typ-Wert, AUSSER bei «Trend-Gadget» — dort gibt es keinen Warenbegriff (None =
# nicht raten). Gemessen 23.09.: Spass-Elektronik ohne Bau-/Puzzlewort ist tatsaechlich Elektronik-Spielkram,
# Aufbewahrung ohne Regeltreffer ist meist doch Ordnung (Kabel-Tray, Kompressionsbeutel, Auto-Staufach).
SAMMEL_FALLBACK = {t: TABELLE.get(t) for t in SAMMELTYPEN}
SAMMEL_FALLBACK["Trend-Gadget"] = None
SAMMEL_FALLBACK["Trend-Produkt"] = None   # 24.09.: 260 aktive, nie als Sammeltyp gefuehrt → Titelregeln griffen gar nicht
for _t in ("Kinder", "Schweizer Editionen", "Anime", "Selbst gestalten", "Baby & Kinder", "Büro & Home Office"):   # 24.09./29.09.: Kleinsttypen ohne Tabellenwert — nur per Titel, sonst offen
    SAMMEL_FALLBACK[_t] = None


def ziel_fuer(typ, titel):
    """Taxonomie-ID fuer ein Produkt: Sammeltyp → Titelregel, sonst Fallback; fester Typ → TABELLE."""
    if typ in KINDERTYPEN:
        for rx, z in _KR:
            if rx.search(titel or ""):
                return z
        for rx, z in _TR:
            if rx.search(titel or ""):
                return "aa-1-25" if z == "aa-1" or z.startswith("aa-1-") else z
        return None
    if typ in SAMMELTYPEN:
        for rx, z in _TR:
            if rx.search(titel or ""):
                return z
        return SAMMEL_FALLBACK.get(typ)
    return TABELLE.get(typ)


def gql(q, v=None):
    grund = "kein Versuch"; drossel = 0
    for versuch in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "90", f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "--data-binary", json.dumps({"query": q, "variables": v or {}})], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            grund = "kein JSON"; time.sleep(5); continue
        if d.get("data") is not None:
            nachlauf(d); return d
        grund = str(d.get("errors") or d)[:300]
        if "THROTTLED" in grund.upper():
            drossel += 1; time.sleep(min(30, 6 * drossel)); continue
        time.sleep(5)
    raise RuntimeError("Shopify hat auf keinen Versuch mit Daten geantwortet — Lauf abgebrochen. Letzter Grund: " + grund)


def ids_pruefen():
    """Kanarienvogel: jede Tabellen-ID muss als TaxonomyCategory existieren, sonst kein einziger Schreibvorgang."""
    ids = sorted(set(TABELLE.values()) | {z for _, z in TITELREGELN} | {z for _, z in KINDERREGELN} | {"aa-1-25"})
    d = gql("query($ids:[ID!]!){ nodes(ids:$ids){ ... on TaxonomyCategory { id fullName } } }", {"ids": [TC + i for i in ids]})
    namen = {}
    for i, n in zip(ids, d["data"]["nodes"]):
        if not n:
            raise RuntimeError(f"Taxonomie-ID unbekannt: {i} — Tabelle korrigieren, nichts geschrieben.")
        namen[i] = n["fullName"]
    return namen


def main():
    if not TOK:
        print("kein Shop-Token → No-op"); return
    sperrdatei = open(SPERRE, "w")
    try:
        fcntl.flock(sperrdatei, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("kategorie_wache laeuft bereits (Sperre /tmp/kategorie_wache.lock) → No-op"); return
    namen = ids_pruefen()
    print(f"Taxonomie-IDs verifiziert: {len(namen)}")
    ledger = set()
    if os.path.exists(LEDGER):
        ledger = {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8") if l.strip()}
    # 23.09. GEMESSEN: `category_id:*` wirkt (22'397 mit + 27'619 ohne = 50'016 aktive; der Kanarienvogel `foo:bar`
    # und `product_category_id:*` werden still ignoriert). Vorher scannte jeder Neustart alle 50'000 (5 Min von 60);
    # jetzt nur die Offenen — der Scan schrumpft mit jedem Lauf. `gescannt` zaehlt damit die Offenen.
    cursor, gescannt, ohne = None, 0, 0
    offen = []                      # (id, handle, typ, ziel)
    unbekannt = collections.Counter()
    while True:
        d = gql("query($c:String){ products(first:250, after:$c, query:\"status:active AND -category_id:*\"){ pageInfo{hasNextPage endCursor} nodes{ id handle title productType category{id} } } }", {"c": cursor})
        pg = d["data"]["products"]
        for p in pg["nodes"]:
            gescannt += 1
            if p.get("category"):
                continue
            ohne += 1
            typ = (p.get("productType") or "").strip()
            ziel = ziel_fuer(typ, p.get("title"))
            if not ziel:
                unbekannt[typ or "-"] += 1; continue
            offen.append((p["id"], p["handle"], typ, ziel))
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cursor = pg["pageInfo"]["endCursor"]
    print(f"gescannt {gescannt} · ohne Kategorie {ohne} · zuweisbar {len(offen)} · unbekannte Typen {sum(unbekannt.values())}")
    gesetzt, fehler, beispiele = 0, [], []
    if SCHARF:
        arbeit = offen[:CAP]
        sperre = threading.Lock()

        def schreibe(chunk):
            teile = []
            for j, (pid, handle, typ, ziel) in enumerate(chunk):
                teile.append(f'm{j}: productUpdate(product:{{id:"{pid}", category:"{TC}{ziel}"}}){{ product{{ id category{{id}} }} userErrors{{ field message }} }}')
            d = gql("mutation { " + " ".join(teile) + " }")
            ok, fe, bs = [], [], []
            for j, (pid, handle, typ, ziel) in enumerate(chunk):
                r = (d.get("data") or {}).get(f"m{j}") or {}
                ue = r.get("userErrors") or []
                ist = ((r.get("product") or {}).get("category") or {}).get("id", "")
                if ue or ist != TC + ziel:
                    fe.append((handle, ue[0]["message"] if ue else f"rueckgelesen {ist!r}"))
                    continue
                ok.append(f"{handle}\t{ziel}\t{typ}\t{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n")
                bs.append((handle, typ, namen[ziel]))
            with sperre:
                with open(LEDGER, "a", encoding="utf-8") as lf:
                    lf.write("".join(ok)); lf.flush()
            time.sleep(0.3)
            return len(ok), fe, bs

        chunks = [arbeit[i:i + 25] for i in range(0, len(arbeit), 25)]
        with ThreadPoolExecutor(max_workers=WORKER) as pool:
            for n_ok, fe, bs in pool.map(schreibe, chunks):
                gesetzt += n_ok; fehler.extend(fe)
                for b in bs:
                    if len(beispiele) < 5:
                        beispiele.append(b)
    rest = ohne - gesetzt
    stand = {"stand": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "gescannt": gescannt, "ohne_kategorie_vorher": ohne,
             "gesetzt": gesetzt, "ohne_kategorie_nachher": rest, "fehler": len(fehler), "unbekannte_typen": dict(unbekannt.most_common()),
             "scharf": SCHARF}
    json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Produktkategorie (Taxonomie) — Stand {stand['stand']}\n\n")
        f.write(f"Aktive gescannt: {gescannt} · ohne Kategorie: {ohne} · heute gesetzt: {gesetzt} ({'SCHARF' if SCHARF else 'DRY'}, CAP {CAP}) · "
                f"danach offen: {rest} · Fehler: {len(fehler)}\n\n")
        f.write("Grund: Der Shop-Kanal (App «Shop») zeigt nur Produkte mit Kategorie — 33'863 «nicht auffindbar» am 23.09. Die Importer setzen\n"
                "productType, keine Taxonomie. Regel: productType → Taxonomie-ID (Tabelle im Skript, IDs beim Start verifiziert).\n\n")
        if unbekannt:
            f.write("## Unbekannte Typen (nicht geraten — Tabelle ergänzen)\n\n" + "\n".join(f"- {k}: {v}" for k, v in unbekannt.most_common()) + "\n\n")
        if beispiele:
            f.write("## Beispiele (heute gesetzt)\n\n" + "\n".join(f"- {h} · {t} → {n}" for h, t, n in beispiele) + "\n\n")
        if fehler:
            f.write("## Fehler\n\n" + "\n".join(f"- {h}: {m}" for h, m in fehler[:30]) + "\n")
    print(f"FERTIG: gesetzt {gesetzt} · offen {rest} · Fehler {len(fehler)} · unbekannte Typen {dict(unbekannt.most_common(6))} · {bilanz()}")





def korrektur():
    """KORREKTUR=1 (23.09.): alle aktiven Produkte der SAMMELTYPEN neu nach Titel einordnen. Weicht die gesetzte
    Kategorie vom Titel-Ziel ab → Ziel setzen; gibt es kein Ziel, aber eine Kategorie aus dem alten Pauschal-Mapping
    (el / hg-10-16 / hg-10 / hg-3) → leeren (falsch ist schlimmer als leer: Google liest die Kategorie).
    DRY (ohne SCHARF=1) zeigt nur Zählung und Beispiele. Ledger: dropship/_kategorie_korrektur.txt."""
    namen = ids_pruefen()
    PAUSCHAL = {"el", "hg-10-16", "hg-10", "hg-3"}
    zu_tun = []
    for typ in sorted(SAMMELTYPEN):
        cur = None
        while True:
            d = gql("query($c:String,$q:String){ products(first:250, after:$c, query:$q){ pageInfo{hasNextPage endCursor} "
                    "nodes{ id handle title category{id} } } }", {"c": cur, "q": f'status:active AND product_type:"{typ}"'})
            pg = d["data"]["products"]
            for p in pg["nodes"]:
                ist = ((p.get("category") or {}).get("id") or "").replace(TC, "")
                if ist and ist not in PAUSCHAL:
                    continue          # eine spezifische Kategorie stammt nicht aus dem Pauschal-Mapping → nie anfassen
                neu = ziel_fuer(typ, p["title"])
                if (neu or "") != ist and (neu or ist):
                    zu_tun.append((p["id"], p["handle"], typ, ist, neu, p["title"]))
            if not pg["pageInfo"]["hasNextPage"]:
                break
            cur = pg["pageInfo"]["endCursor"]
    zc = collections.Counter((z[3] or "-") + "→" + (z[4] or "LEER") for z in zu_tun)
    print(f"KORREKTUR: {len(zu_tun)} Produkte · {dict(zc.most_common(12))}")
    for z in zu_tun[:25]:
        print(f"   {z[2][:18]:18s} {z[3] or '-':>9s} → {z[4] or 'LEER':9s} | {z[5][:60]}")
    if not SCHARF:
        return
    ok = 0
    with open(os.path.join(ROOT, "dropship", "_kategorie_korrektur.txt"), "a", encoding="utf-8") as lf:
        for i in range(0, len(zu_tun), 25):
            chunk = zu_tun[i:i + 25]
            teile = [f'm{j}: productUpdate(product:{{id:"{z[0]}", category:' + (f'"{TC}{z[4]}"' if z[4] else "null") +
                     '}){ product{ category{id} } userErrors{ message } }' for j, z in enumerate(chunk)]
            d = gql("mutation { " + " ".join(teile) + " }")
            for j, z in enumerate(chunk):
                r = (d.get("data") or {}).get(f"m{j}") or {}
                ist = ((r.get("product") or {}).get("category") or {}).get("id") or ""
                if not r.get("userErrors") and ist == (TC + z[4] if z[4] else ""):
                    ok += 1
                    lf.write(f"{z[1]}\t{z[3]}\t{z[4] or 'LEER'}\t{z[2]}\t{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n")
    print(f"KORREKTUR FERTIG: {ok} von {len(zu_tun)} rückgelesen · {bilanz()}")


# 05.10.2026: Kanarienvögel (`python3 kategorie_wache.py --test`, ohne Shop-Zugriff). Jede Regeländerung muss hier 0 Fehler
# zeigen; die drei Prüfer-Fälle vom 05.10. stehen oben, die älteren Wortfallen (9b) dahinter.
KANARIEN = [
    ("Gadget", "Intelligente WLAN-Steckdose", "el-7-15"),
    ("Trend-Produkt", "Adventskalender Blind Box Sammlung 2026", "hg-3-58-1"),
    ("Spass-Elektronik", "Smart Sensor Stunt-Hund mit Fernbedienung", "tg-5-18"),
    ("Trend-Gadget", "Ferngesteuerter Roboter-Hund für Kinder", "tg-5-18"),
    ("Gadget", "Steckdosenleiste mit 4 USB-Anschlüssen", "el-7-15-8"),
    ("Haushalt & Wohnen", "Acryl-Adventskalender Blind Box", "hg-3-58-1"),
    ("Aufbewahrung & Organizer", "Aufbewahrungsbox mit Deckel", "hg-10-16"),
    ("Aufbewahrung & Organizer", "Vorratsdose aus Glas", "hg-10-16"),
    ("Trend-Gadget", "Hundeleine mit Reflektorstreifen", "ap-2"),
    ("Trend-Gadget", "Hunderte LED Lichterkette", "hg-13"),
    ("Trend-Gadget", "Katzenaugen-Sonnenbrille", "aa-2-27"),
    ("Trend-Gadget", "PVC Hundeskelett-Modell", "bi-19-8"),
    ("Trend-Gadget", "Ferngesteuertes Auto mit Drift", "el"),
    ("Gadget", "Saugroboter mit Fernbedienung und App-Steuerung", "el"),
    ("Trend-Gadget", "Kreatives Sturmfeuerzeug mit Doppelflamme", "hg-19"),
    ("Trend-Gadget", "Press Lock Schnürsenkel", "aa-8"),
    ("Baby & Kinder", "Pyjama-Set für Mädchen", "aa-1-25-6"),
]


def test():
    fehler = 0
    for typ, titel, soll in KANARIEN:
        ist = ziel_fuer(typ, titel)
        ok = ist == soll
        fehler += (not ok)
        print(f"  {'✅' if ok else '❌'} {typ[:16]:16s} | {titel[:48]:48s} → {ist or 'LEER':10s} (soll {soll})")
    print(f"KANARIEN: {len(KANARIEN) - fehler}/{len(KANARIEN)} richtig")
    return fehler


if __name__ == "__main__":
    if "--test" in sys.argv:
        sys.exit(1 if test() else 0)
    korrektur() if os.environ.get("KORREKTUR") == "1" else main()
