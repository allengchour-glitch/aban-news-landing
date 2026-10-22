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
    "Kostüme & Verkleidung": "aa-3-3", "Werkzeug & Heimwerken": "ha-15", "Wellness & Aromatherapie": "hg-3-39-5",   # 07.10.: Diffuser; Befeuchter/Duftöl zieht aroma_kategorie.py nach
    "Gaming-Zubehör": "el-18",
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
    # Nachbesserung 05.10. (Prüfer): Tierbedarf MIT Fernbedienung ist Tierbedarf, kein Spielzeug — «Tierkamera mit Fern-
    # bedienung», «Katzen-Laserpointer mit Fernbedienung», «Ferngesteuerter Futterautomat für Tiere» liefen in tg-5-18.
    # Beide Lookaheads: ein Tierwort UND ein Bedarfswort (Kamera allein bleibt Elektronik, Laserpointer allein unten).
    (r"(?=.*(?:\bhund(?!ert)|\bkatz(?:e(?!nauge)|en(?!auge))|\btier\w*|\bhaustier|\bwelpe))"
     r"(?=.*(?:laserpointer|futterautomat|futterspender|trinkbrunnen|wasserspender|kamera|trainings-?(?:pfeife|pad|matte|unterlage|spielzeug)|clicker|leckerli))", "ap-2"),
    # Nachbesserung 05.10. (Prüfer): der alte Lookahead `(?:saug|…)-?roboter` deckte nur «Saugroboter», nicht «Staubsauger-
    # Roboter», «Rasenmäher-Roboter» (Wortrest vor dem Bindestrich) oder die Umkehrform «Roboter-Staubsauger» → `\w*` und
    # Umkehrform ergänzt; Kanarienvögel unten.
    (r"^(?!.*(?:(?:saug|staub|putz|wisch|mäh|küchen|fenster|pool|rasen)\w*-?roboter|roboter-?(?:staubsauger|sauger|mäher|rasenmäher|wischer|mopp|fensterputzer)))(?:.*(?:fernbedienung|ferngesteuert\w*|\brc\b).*(?:\bhund(?!ert)|\bkatz|\btier\w*\b|roboter|\bdino)|.*(?:\bhund(?!ert)|\bkatz|\btier\w*\b|roboter|\bdino).*(?:fernbedienung|ferngesteuert\w*|\brc\b))", "tg-5-18"),
    # 04.10.2026 (Verbesserungsrunde «kategorie-typ»): Tierware VOR Schuh/Kleid/Kostüm — gemessen standen «Hunde-
    # Outdoorschuhe» unter Shoes, «Kaschmir-Pullover für Haustiere» unter Clothing, «Halloween-Kostüm für Hunde» unter
    # Costumes. Wortfallen: hund(?!ert) = «Hunderte», katze(?!nauge) = «Katzenaugen-Sonnenbrille».
    # Nur eindeutige Tierbedarfs-Konstruktionen — ein Tier als MOTIV («Katzen-Ohrringe», «Stunt-Hund mit Fernbedienung»,
    # «Schlüsselanhänger Katze») bleibt bei den Warenregeln weiter unten.
    (r"für (deinen |deine |den |die )?(hunde?|katzen?|haustiere?|welpen?)\b|"
     r"\bhunde-?(leine|geschirr|halsband|bett|napf|mantel|pullover|schuhe|jacke|kostüm|spielzeug|bürste|outdoorschuhe|regenmantel|weste)\w*|"
     r"\bkatzen-?(bett|klo|streu|kratz\w*|spielzeug|halsband|tunnel|haus|höhle)\w*|\bhaustier-?(bett|bürste|pullover|kostüm|napf)\w*|kratzbaum|futternapf", "ap-2"),
    # 19.10.2026 (Spähtrupp wf_62fc1cba G5): «LUZ Geschichtenbuch» und «Navigationslichter für Modellschiffe» (Typ «Büro & Home Office»)
    # standen ohne Kategorie, die KI war uneinig, weil der richtige Pfad nicht in ihrer Kandidatenliste stand → Shop-Kanal «nicht
    # auffindbar», Google-Kategorie «Office Supplies». me-1-3 = Media > Books > Print Books, ae-2-6 = Hobbies & Creative Arts > Model
    # Making (beide per taxonomy-Suche gemessen). Nur zusammengesetzte Buchwörter: «Notizbuch»/«Tagebuch» sind Schreibwaren,
    # «Buchstütze»/«Buchsbaum»/«Buchenholz» sind keine Bücher (\b am Wortende).
    (r"\b(?:geschichten|bilder|kinder|mal|märchen|vorlese|rätsel)buch\b", "me-1-3"),
    (r"modell-?(?:schiff|boot|flug|zug|eisenbahn)\w*", "ae-2-6"),
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
    # 22.10.2026 (Runde 04:25, GEMESSEN): «Magnetische Rennstrecke mit Auto – 68-Teile-Set» (Spass-Elektronik) und «Alloy Auto Modell 1:32»
    # standen auf vp-1 (Vehicles & Parts > Vehicle Parts & Accessories) — das Wort «Auto» der Regel unten traf das SPIELZEUG-Auto. Nur
    # eindeutige Spielzeug-Konstruktionen VOR der Fahrzeugregel: Spielzeug-Auto / Modellauto, Rennbahn/Rennstrecke MIT Auto-Wort,
    # Massstab-Modell (1:32). Bewusst NICHT «Kinder», «Modell» oder «Spiel» allein: «Autositz für Kinder», «Auto-Bluetooth-Modell»
    # (Lautsprecher in Autoform) und «Rücksitz-Spielzeugtasche» bleiben bei ihren Regeln (Kanarienvögel unten).
    (r"spielzeug-?autos?\b|modell-?autos?\b|(?=.*\bautos?\b)(?=.*(?:renn(?:bahn|strecke)|modell\s*1\s?:\s?\d+))", "tg-5"),
    (r"\bauto(?:-|\b)|\bkfz\b|fahrzeug|lenkrad|autositz|scheibenwischer", "vp-1"),
    (r"luftbefeuchter|diffus[eo]r|luftreiniger|ventilator|(?<!be)lüfter|staubsauger|entfeuchter|heizgerät|heizer\b|wasserkocher|befeuchter|feuchter\b|air\s?fryer|heissluftfritteuse", "hg-9"),
    (r"ohrhörer|earbuds|headset|kopfhörer|lautsprecher|soundbar", "el-2"),
    (r"gaming|controller|konsole|joystick", "el-18"),
    (r"tastatur|(?<!fleder)maus\b|handy\w*|iphone|smartphone|ladestation|wlan|wi-?fi|kamera|tablet|ladeger|powerbank|türklingel|drohne|walkie|\bfunk\w*|gimbal|selfie|stativ|projektor|adapter\b|drucker", "el"),
    # 14.10.2026 (Prüfer Büro-Regeln): `top\b` ohne linke Grenze machte «Laptop-Tasche», «Desktop-Clip», «Stop-Schild» zu Clothing.
    # Eine harte Wortgrenze `(?<![a-zäöü])top` hätte 87 Komposita verloren (Tanktop 64×, Stricktop 24×, Trägertop, Spitzentop …;
    # Korpus 54'523 aktive, als ob Sammeltyp) → nur die drei gemessenen Nicht-Kleider-Wurzeln (+ Tabletop/Rooftop/Countertop/Hardtop)
    # ausschliessen: 39 Titel wechseln, alle aus aa-1, 0 von richtig nach falsch.
    (r"(jacke|hosen?|shorts|hemd|mantel|overall|pullover|sweatshirt|kleid|shirt|bluse|weste|leggings|pyjama|pajama|unterwäsche|socken|anzug|strampler|cardigan|tunika|outfits?|jumpsuit|(?<!lap)(?<!desk)(?<!s)(?<!table)(?<!roof)(?<!counter)(?<!hard)top)\b", "aa-1"),
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
    # 14.10.: «Wanderer» ist eine Figur, kein Wandern («Glücksmünze mit Opossum-Wanderer-Motiv» wurde Sport)
    (r"camping|zelt|wander(?!er\b|erin\b|ers\b)\w*|fahrrad\w*|angel\w*|\bsport\w*|golf|tennis|ski\b", "sg"),
    # 14.10.: «Bleistiftrock/Bleistift-Jeans/Bleistiftabsatz» sind Mode, kein Bürobedarf — VOR `stift` → os (die Bleistiftrock-Regel
    # der 4. Welle kam zu spät; ein Ausschluss im os-Muster liess «Bleistiftrock mit Perlenstickerei» über `perl\w*` zu Schmuck fallen).
    (r"bleistift-?(?:rock|r[öo]cke?|hose|jeans|kleid)\w*", "aa-1"),
    (r"bleistift-?(?:absatz|abs[äa]tze)\w*", "aa-8"),
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
    # 14.10.: Kartenhüllen für Sammel-/Spielkarten, Pass-/Ausweishüllen und Laptop-/Notebook-Hüllen sind keine Handyhüllen (vorher:
    # «Glitzer-Schutzhüllen für Sammelkarten», «Canvas Laptop-Schutzhülle» → Mobile Phone Cases). Messung 14.10.: die Regel entscheidet
    # 63 Korpus-Titel (als ob Sammeltyp), fast keiner ist eine Handyhülle — eine Positivliste (nur mit Telefonwort) hätte 13 echte
    # Aufbewahrungs-Produkte auf den Typ-Rückfall hg-10-16 geschoben (8 davon falsch) → NICHT übernommen, siehe Bericht.
    (r"^(?!.*(?:sammel-?karte|spiel-?karte|trading-?card|f[üu]r (?:sammel|spiel|trading)-?karten|reisepass|ausweis|laptop|notebook|macbook))(?:.*(?:hülle|\bcase\b))", "el-4-8-4-2"),
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
    # 14.10.: Brillen-, Ausweis-, Impfpass-, Schlüssel-, Näh- und Kosmetikmäppchen sind keine Federmäppchen
    (r"^(?!.*(?:brille|ausweis|impf|reisepass|\bpass\b|pass-?(?:m[äa]ppchen|h[üu]lle)|n[äa]h-?(?:m[äa]ppchen|set|zeug|zubeh[öo]r|etui|kit)|schl[üu]ssel|kosmetik|schmink|make-?up))"
     r"(?:.*(?:federmäppchen|federmappe|federtasche|mäppchen|(stifte|schreibwaren|stift)-?etui))", "os-3-16"),
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
    # 12.10.2026: «Poncho» ist Oberbekleidung wie Jacke/Mantel (aa-1-25-4). Ohne die Regel blieb «Cartoon Poncho für Kinder» ohne Ziel.
    (r"jacke|mantel|\w*weste\b|cardigan|kardigan|\bponchos?\b", "aa-1-25-4"),
    (r"\w*pullover|pulli\w*|\w*shirt\b|\btop\b|oberteil|hoodie|polo\b|bluse|longsleeve", "aa-1-25-9"),
    (r"hose\w*|shorts|\w*rock\b|leggings|jeans", "aa-1-25-1"),
    (r"socken|strumpf\w*", "aa-1-25-7"),
    (r"\w*mütze\b|\bhut\b|haarband|stirnband", "aa-2-33-3"),
]
_KR = [(_re.compile(m, _re.I), z) for m, z in KINDERREGELN]

# 14.10.2026 (Messung google_bilder Schritt 8): 18 aktive «Büro & Home Office» ohne Kategorie (CJ-Gruppe «Büro, Schule &
# Foto-Zubehör», Grind 13./14.10.) — Tastaturen, Gelschreiber, Regenketten, Lesezeichen, Inklinometer … Keine Titelregel
# traf, kategorie_ki.py brach am Groq-Kontingent ab → bis zu 48 h ohne Kategorie. Eigene Liste wie KINDERREGELN, gilt NUR
# für BUEROTYPEN (sonst würde ein «Lippenstift» oder «Mausefalle» im Haushaltstyp Bürobedarf). Reihenfolge = Vorrang:
# Zubehör vor Gerät (Tastenkappe/Handgelenkauflage/Mauspad vor Tastatur/Maus), Set vor Einzelgerät, Hülle vor Notizbuch,
# Spitzer/Verlängerer vor Bleistift, Bleistift vor Radiergummi («Bleistifte mit Radiergummi»). Trifft keine Büro-Regel,
# gelten die allgemeinen Titelregeln. IDs am 14.10. per taxonomy.categories(search:) gemessen, beim Start per nodes(ids:)
# verifiziert. Computerzubehör-Muster aus automation/data/buero_korb.json (Google-Seite, dort mit Kanarien).
BUEROTYPEN = {"Büro & Home Office"}
# Korpus-Probe 14.10. (54'226 Titel aus /tmp/kategorie_fein_export.jsonl, als wären sie Büro-Typ): die CJ-Gruppe stempelt
# JEDEN Suchtreffer als Büro — deshalb sind die Muster eng und die Ausschlüsse lang. Gefundene Fallen (Lehre 9b): «spitzer
# Zehe» (69 Schuhe) ≠ Spitzer, «Quarzuhr mit Kalender» (164 Uhren) ≠ Kalender, «Etui-Kleid»/«Pinselset mit Etui» ≠
# Federmäppchen, «Moissanit-Ring» ≠ Diamanttester, «Übersetzungs-Earbuds» ≠ Übersetzungsstift, «Zahnaufhellungs-Gelstift» ≠
# Gelschreiber, «Keyboard Lidschattenpalette» ≠ Tastatur, «Buntstifte-Decke» ≠ Buntstift, «Kopfkissen mit Armauflagen» ≠
# Handgelenkauflage, «Golf-Entfernungsmesser» = Optik. Ein «Schreibtisch»-Muster (Möbel) ist bewusst NICHT drin: 22 von 23
# Treffern waren «… für den Schreibtisch».
# Tätowier-Stift/-Nadel/-Maschine ist kein Schreibgerät («Tattoo-Stift mit integrierter Nadel», 14.10.) — auch nicht über die
# allgemeine Regel `stift` → Office Supplies. Aufkleber-Tattoos und «Tattoo-Print» laufen weiter allgemein.
# Härtung 14.10. (Prüfer): Tätowiergeräte bekommen ihren eigenen Zweig statt LEER (bi-21-2-3-2 Pen Tattooing Machines, im Korpus
# stehen 6 Tattoo-Maschinen auf bi-21-2-3). Pen-Maschine nur mit Gerätewort (Motor/Akku/USB/Kartusche …); ein Stift ohne Gerätewort
# («Tattoo-Stift mit integrierter Nadel», Kunststoff, 90 g, «präzise Linien zeichnen») = Elternpfad Tattooing Supplies, nicht geraten.
# Temporäre/Abdeck-/Henna-Stifte sind Kosmetik → bleiben bei der Sperre (LEER). Was hier nicht greift, sperrt BUERO_SPERRE.
# Nachbesserung 14.10. (2. Prüfung): Kosmetikstifte mit «Tattoo» im Namen («Augenbrauen-Tattoo-Stift», «Lippen-Tattoo-Stift», «Eyeliner
# Tattoo Pen») und Körper-/Kinder-/Glitzer-Tattoostifte sind keine Tätowiergeräte — der Zweig lief VOR allen Kosmetik-Schutzregeln und
# machte sie zu Tattooing Supplies (HEAD: Health & Beauty). Kosmetik → nach der Sperre nur ein Beauty-Ergebnis (hb-…) der allgemeinen
# Regeln, sonst LEER (ziel_fuer); Körper/Kinder/Glitzer/Haut → Sperre (LEER, kategorie_ki entscheidet mit Beschreibung).
# Hauptwort = Text VOR dem ersten Verbindungswort («Notizbuch mit Kugelschreiber» → Notizbuch, «Planer-Sticker und Washi-Tape Set» →
# Planer-Sticker, «Füller-Set mit Tintenfass» → Füller-Set). Waren-Regeln für Stift, Mine, Behälter, Papier, Planer, Kalender und Bastel
# verlangen ihr Wort im Hauptwort (`^` + _KOPF + Wort); was nur NACH «mit/und/&/im» steht, ist Beigabe oder Inhalt.
_VERB = r"(?<!-)\b(?:mit|und|inkl\w*|samt|plus|im|in)\b(?!-)|\s[&+]"   # «2-in-1», «Bluetooth 5.3+» sind keine Verbindung
_KOPF = r"(?:(?!" + _VERB + r").)*?"
_KOPF_FUER = r"(?:(?!" + _VERB + r"|\bf[üu]r\b).)*?"     # Tastatur: «Spiralkabel für mechanische Tastatur» ist ein Kabel
_TATTOO_KOSMETIK = (r"augenbrau\w*|\bbrauen\w*|brow(?!n)|microblading|lippe\w*|\blips?\b|eyeliner|lidstrich|wimper\w*|kajal|semi-?perman\w*|"
                    r"permanent-?make|\bpmu\b|make-?up|kosmetik")
BUERO_TATTOO_KOSM = _re.compile(_TATTOO_KOSMETIK, _re.I)
_TATTOO_NICHT = (r"^(?!.*(?:tempor|abdeck|kosmetik|make-?up|henna|marker|filzstift|klebe|aufkleber|sticker|print|motiv|muster|"
                 + _TATTOO_KOSMETIK + r"|k[öo]rper|glitzer|kinder|\bkids?\b|\bhaut))")
# Schlussprüfung 14.10. (3. Prüfung): die Ausschlussliste oben deckt nicht jeden Nicht-Geräte-Stift ab («Fake/Jagua/Body Art/Schmink/
# Airbrush/Abwaschbarer Tattoo-Stift» wurden Tattooing Supplies). Deshalb ERLAUBNISLISTE: ein Tattoo-Stift ohne Gerätewort ist nur mit
# Nadel/Needle/integriert/Grip/Stencil/Vorzeichnen/Anfänger oder der Marke Danhui Tätowierbedarf (bi-21-2), sonst LEER (Sperre unten,
# kategorie_ki entscheidet mit Beschreibung). Netzteil/Kartusche machen einen Stift nur als ZUSATZ zum Gerät («Tattoo Pen Set mit
# Kartuschen und Netzteil»); als Hauptwort sind Kartuschen/Nadeln Tattooing Needles (bi-21-2-4, live per nodes(ids:) geprüft; die Kinder
# sind Nadelformen Magnum/Round Liner …, aus dem Titel nicht ableitbar) und ein Netzteil ist kein Gerät (LEER).
_TATTOO_ERLAUBT = r"(?=.*(?:nadel|needle|integriert|grip|stencil|vorzeichn|anf[äa]nger|danhui))"
_TATTOO_GERAET = r"(?=.*(?:motor|rotary|kabellos|wireless|akku|usb)|.*(?:" + _VERB + r"|,).*(?:netzteil|kartusche|cartridge))"
BUERO_TATTOO = [
    (_TATTOO_NICHT + r"(?!.*(?:maschine|machine|\bkits?\b|komplett|motor|kabellos|wireless|akku|usb))(?=.*(?:tattoo|t[äa]towier))^" + _KOPF +
     r"(?:kartusche\w*|cartridges?\b|nadel\w*|needles?\b)", "bi-21-2-4"),
    (_TATTOO_NICHT + r"(?:.*(?:tattoo|t[äa]towier)\w*[- ]?(?:pen|stift)\w*[- ]?(?:maschine|machine)"
     r"|.*(?:tattoo|t[äa]towier)\w*[- ]?(?:pen|stift)\w*" + _TATTOO_GERAET + r")", "bi-21-2-3-2"),
    (_TATTOO_NICHT + r".*(?:tattoo|t[äa]towier)\w*[- ]?(?:maschine|machine)\w*", "bi-21-2-3"),
    (_TATTOO_NICHT + _TATTOO_ERLAUBT + r".*(?:tattoo|t[äa]towier)\w*[- ]?(?:pen|stift)\w*", "bi-21-2"),
]
_BT = [(_re.compile(m, _re.I), z) for m, z in BUERO_TATTOO]
BUERO_SPERRE = _re.compile(r"tattoo\w*[- ]?(?:stift|pen\b|nadel|maschine|ger[äa]t|tinte)|(?:stift|\bpen\b|nadel|maschine)\w*.*tattoo", _re.I)
# Allgemeine Regeln mit Vorrang: Adventskalender («ein Kalender bleibt ein Kalender»), Lehrmodelle, Uhren/Wecker (die
# Kalender-, Kugelschreiber- und Füller-Regel träfen sonst «Quarzuhr mit Kalender», «Uhr mit Manschettenknöpfen & Füller»).
BUERO_VORRANG = _re.compile(r"advent\w*|anatomi\w*|\w*skelett-?modell|verdauungssystem|organmodell|"
                            r"(?<![a-zäöü])uhr\b|\w+uhr\b|\buhren\b|\w+uhren\b|armbanduhr\w*|\bwecker\b|\w+wecker\b", _re.I)
# 14.10. (Prüfer, Punkt 5): für Laptop-/Desktop-Ware ist ein Kleidungs-/Accessoire-Ergebnis (aa-…) der ALLGEMEINEN Regeln immer ein
# Wortfehler («Laptop», «Desktop-Clip» → `top`) — dann lieber LEER (kategorie_ki entscheidet mit Beschreibung). Ausnahme (2. Prüfung):
# steht ein Kleidungs-/Schmuckwort im Titel («Laptop Hoodie», «Notebook-Print Kleid»), ist es Mode und aa-… richtig.
_BUERO_KEIN_AA = _re.compile(r"laptop|desktop|notebook|macbook", _re.I)
# Nachbesserung 14.10. (2. Prüfung): im Büro-Zweig schlug das Nebenwort/Motiv das Hauptwort — Kleidung/Schmuck MIT Büromotiv
# («Hoodie mit Tastatur-Print», «Kugelschreiber-Ohrringe», «Notizbuch-Halskette», «Kalender-Shirt») wurde Tastatur/Kugelschreiber/
# Notizbuch/Kalender, weil die Büro-Regeln vor den Mode-/Schmuckregeln laufen. _KEIN_MODE steht vor jeder Waren-Regel (Schreibgerät,
# Tastatur, Tastenkappe, Papier, Planer, Kalender); dann entscheiden die allgemeinen Regeln (aa-1/aa-6). Ein blankes «Kette» fehlt
# bewusst (Regenkette, «Kugelschreiber mit Kette»), ebenso «Motiv/Print» allein («Notizbuch mit Katzen-Motiv» bleibt Notizbuch) —
# nur das Büro-Wort als Motiv («Tastatur-Print», «Keyboard-Motiv») zählt.
_MODE = (r"\w*shirt\b|hoodie|pullover|\bpulli|sweatjacke|socken|\bkleid(?:er)?\b|\w+kleid(?:er)?\b|krawatte|bluse|leggings|"
         r"ohrring\w*|ohrstecker|ohrh[äa]nger|(?<!uhr)armband(?!uhr)|halskette|brosche|anh[äa]nger|schmuck")
_MOTIV = (r"(?:tastatur|keyboard|kugelschreiber|bleistift|stift|f[üu]ller|notizbuch|kalender|tastenkappe|keycap|b[üu]ro)\w*"
          r"[- ]?(?:print|motiv|muster|design|aufdruck)")
# Schlussprüfung 14.10. (3. Prüfung): nur das HAUPTWORT zählt — «Kugelschreiber mit Schlüsselanhänger», «Planer mit Anhänger», «Kalender
# mit Herz-Anhänger», «Notizbuch mit Schmuckverschluss» wurden über das Beiwort Schmuck (aa-6). «Hoodie mit Tastatur-Print»,
# «Kugelschreiber-Ohrringe», «Tastenkappe Schlüsselanhänger» tragen das Mode-Wort im Hauptwort und bleiben gesperrt.
_KEIN_MODE = r"^(?!" + _KOPF + r"(?:" + _MODE + r"|" + _MOTIV + r"))"
BUERO_MODE = _re.compile(_MODE + r"|" + _MOTIV, _re.I)
# Kosmetik-, Zahn- und Motivware mit Stift-/Papierwort («Augenbrauenstift», «Zahnaufhellungs-Gelstift», «Buntstifte-Decke»)
_KOSM = (r"^(?!.*(?:lippen|kajal|augenbrauen|eyeliner|lidschatten|make-?up|kosmetik|concealer|haar|nagel|nägel|nail|zahn|aufhell|"
         r"whitening|bleaching|massage|decke|kissen|bezug|bettwäsche|tasse|becher|shirt|pullover|kleid|socken|aufkleber|sticker|"
         r"anhänger|ohrring|halskette|silikonform|backform|schokolade))")
# 14.10. (Prüfer): «Notebook» heisst bei CJ auch Notizbuch («Notebook Hülle aus Leder A5», «Notebook mit Innentasche … A5») —
# Papierformat/Papierwort/Stift schliessen den Laptop aus. Im Korpus (54'523 aktive) hat KEIN Laptop-Titel eines dieser Wörter.
_LAPTOP = (r"^(?=.*(?:laptop|notebook|macbook))(?!.*(?:st[äa]nder|halter|k[üu]hl|ladeger|netzteil|akku|tastatur|maus|lampe|kamera|drohne|"
           r"\ba[4-6]\b|notiz-?(?:buch|b[üu]cher|block|bl[öo]cke|heft)\w*|papier\b|\bblatt\b|\bseiten\b|\d+\s*(?:seiten|blatt)\b|\bstift(?:e|en)?\b|stiftetasche|\bpen\b))")
# Pen-/Schreibkontext für Patronen/Tinte/Minen (Druckerpatronen, E-Tinte, Gas-/Filterpatronen sind keine Schreibware). Kein blankes
# «Roller»/«Feder» (Fusselroller-Nachfüllpack, Federn), Kosmetik über _KOSM («Lippenstift-Nachfüllung»).
_SCHREIB = r"f[üu]ller|f[üu]llfeder\w*|federhalter|kugelschreiber|stift|kalligra\w*|\w*schreiber|tintenroller|gelroller"
_KEIN_SCHREIBBEDARF = (r"(?!.*(?:drucker|printer|officejet|deskjet|laserjet|toner|\bhp\b|canon|epson|brother|tattoo|t[äa]towier|filter|\bgas\b|"
                       r"co2|wasser|vape|e-?zig|kartusche|e-?tinte|e-?ink|fussel))")
# «Kugelschreiber mit 10 Ersatzminen» ist ein Kugelschreiber, keine Mine
_NICHT_MIT_MINE = r"(?!.*\b(?:mit|inkl\w*|plus|samt|und)\b[^,;–]{0,25}(?:ersatz)?(?:minen?|patronen?|tinte)\b)"
_PLANERKONTEXT = r"(?=.*(?:planer|kalender|journal|tage-?buch|notiz-?buch|scrapbook|bullet))"
# «Wochenplaner mit 200 Stickern» bleibt Planer; «Planer-Sticker»/«Journal Stempel Set» ist Bastelbedarf.
# Nachbesserung 14.10. (2. Prüfung): die alte doppelte Verneinung (`_NICHT_MIT_BASTEL` in `_KEIN_BASTEL`) liess die Planer-Regel durch,
# sobald IRGENDWO «und/mit + Bastelwort» folgte («Planer-Sticker und Washi-Tape Set» → Planners, «Journal-Sticker und Stempel Set» →
# Notebooks, HEAD: Sticker). Jetzt entscheidet das Hauptwort: Bastelwort vor dem ersten Verbindungswort = Bastelbedarf, sonst Planer.
_BASTEL = r"(?:aufkleber|sticker|stempel|schablone|washi)"
_KEIN_BASTEL = r"^(?!" + _KOPF + _BASTEL + r")"
# Planer-/Notizbuch-/Kalender-TASCHE ist eine Tasche (allgemein lb), kein Planer
_KEINE_PAPIERTASCHE = r"(?!.*(?:planer|kalender|notiz-?buch|journal|tage-?buch|heft)\w*-?(?:tasche|beutel|rucksack)\b)"
# Behälter für Schreibgeräte («Bleistifttasche», «Kugelschreiberhalter», «Füller-Etui») — das Behälterwort ist das Hauptwort. Blankes
# «stift» nur am Wortanfang («Stifthalter»), sonst träfe es «Lippenstifthalter»/«Klebestift-Box».
_STIFTWORT = (r"(?:(?<![a-zäöü])stift|bleistift|buntstift|farbstift|filzstift|zeichenstift|gel-?stift|kugelschreiber|"
              r"f[üu]ller|f[üu]llfederhalter|f[üu]llfeder(?!halter)|f[üu]llhalter|schreibger[äa]t)")   # «Füllfederhalter» ist ein Stift, kein Halter
_KEIN_KOSM_BEHAELTER = r"(?!.*(?:lippen|kajal|augenbrauen|eyeliner|make-?up|kosmetik|concealer|nagel|n[äa]gel|nail|zahn|pinsel|schmink|tattoo|geschenk-?box))"
# Schlussprüfung 14.10. (3. Prüfung): Bündel OHNE Verbindungswort — Komma, Schrägstrich, «&»/«+» ohne Leerzeichen, Doppelpunkt und Gedanken-
# strich («Notizbuch, Kugelschreiber und Lesezeichen Set», «Notizbuch/Kugelschreiber Geschenkset», «Notizbuch&Kugelschreiber Set»,
# «Notizbuch – Kugelschreiber – Set», «Geschenkset: Notizbuch, Kugelschreiber, Lesezeichen») — machten das Stift- bzw. Lesezeichenwort zum
# Hauptwort. Steht ein Papierwort VOR dem Wort der Regel und folgt ein Listenzeichen, ist das Papier die Ware. Leerzeichen und Bindestrich
# zählen bewusst NICHT als Listenzeichen («Planer-Stifte», «Bullet Journal Gelstifte» sind Stifte). Der erste Teil darf das Wort der Regel
# nicht überspringen («Kugelschreiber-Set: Notizbuch, Bleistift» bleibt Kugelschreiber).
_PAPIERWORT = r"(?:notiz-?(?:buch|b[üu]cher|block|bl[öo]cke|heft)|planer|journal|tage-?buch|skizzen-?buch|kalender)"


def _papier_zuerst(wort):
    frei = r"(?:(?!" + _VERB + r"|" + wort + r").)*?"   # weder Verbindungswort noch das Wort der Regel («Planer 2026, Kugelschreiber»)
    frei2 = r"(?:(?!" + _VERB + r"|" + wort + r"|stift|marker|zubeh[öo]r|schreiber|\bpens?\b|f[üu]ller).)*?"
    return r"(?!" + frei2 + _PAPIERWORT + frei2 + r"(?:\s*[,/&+:–—]\s*|\s+-\s+)" + _KOPF + wort + r")"


# Schlussprüfung 14.10. (3. Prüfung): ein Verpackungs-/Mengenwort mit Zahl ist nicht das Hauptwort — «Box mit 24 Buntstiften», «Dose mit 36
# Farbstiften», «Kiste mit 50 Bleistiften», «Becher mit 10 Kugelschreibern», «Tasche mit 24 Gelstiften» sind Stifte (die allgemeinen Regeln
# machten Storage/Küche/Taschen daraus). Nur mit Zahl UND Schreibgerät danach; «Tasche mit 3 Fächern», «Box mit 2 Fächern für Stifte»,
# «Federtasche mit 24 Buntstiften» (Federmäppchen-Regel) bleiben beim Behälter. Für die Büro-Regeln wird «Box mit» weggelassen
# (_buero_titel); die allgemeinen Regeln sehen weiter den ganzen Titel.
_PACK_MIT_ZAHL = _re.compile(r"^(?:[\w-]+\s+)?(?:holz|metall|blech|kunststoff|plastik|karton|papp|geschenk)?-?"
                             r"(?:box|dose|kiste|becher|tasche|eimer|koffer|rolle)\s+mit\s+"
                             r"(?=\d+\s+(?:[\w-]+\s+){0,2}?[\w-]*?(?:stift|kugelschreiber|f[üu]ller|f[üu]llhalter|wachsmal\w*?|kreide|tintenroller)(?:e|en|n|s|er|ern|minen?)?\b)", _re.I)


def _buero_titel(t):
    return _PACK_MIT_ZAHL.sub("", t, count=1)


_W_GEL = r"\bgel-?(?:schreiber|stift|pen|roller|kugel|tinten)"
_W_FUELLER = r"(?:\bf[üu]ller\b|f[üu]llfeder|f[üu]llhalter|tintenroller|tintenschreiber|faserschreiber|kalligra)"
_W_WACHS = r"(?:wachsmal|wachsstift|wachskreide)"
_W_BUNT = r"(?:buntstift|farbstift|aquarellstift|aquarell-?buntstift)"
_W_ZEICHEN = r"(?:zeichen|schreib|(?<![a-zäöü])mal|skizzen|grafit|graphit)-?stift"
_W_RADIER = r"(?:radiergummi|\bradierer\b|knetradierer)"
_W_HAFT = r"(?:post-?its?\b|haftnoti|klebezettel|sticky ?notes?|haftzettel)"
BUEROREGELN = [
    # Computerzubehör (Zubehör vor Gerät, Set vor Einzelgerät)
    # Nachbesserung 14.10. (2. Prüfung): Leertaste/Spacebar sind Tastenkappen («PBT-Leertaste für mechanische Tastaturen» war Keyboards);
    # Keycap-Ohrringe/-Schlüsselanhänger sind Schmuck (_KEIN_MODE → allgemeine Regeln).
    (_KEIN_MODE + r"^" + _KOPF + r"(?:tastenkappe\w*|tastaturkappe\w*|keycaps?\b|leertaste\w*|space-?bar\w*)", "el-7-9-11-3-2"),   # «Tastatur mit PBT-Tastenkappen» = Tastatur
    # 14.10. (Prüfer): Bandage/Schiene ist Stützbandage (hb-1-24-6 Wrist Braces), keine Handgelenkauflage («… für Büroarbeit»)
    (r"handgelenk\w*-?(?:bandage|schiene|orthese)\w*|(?:bandage|schiene|orthese)\w* f[üu]r (?:das |dein )?handgelenk", "hb-1-24-6"),
    # Armlehne/Armauflage nur mit Maus/Tastatur, nie Stuhl/Bandage/Stütze («Armlehnen-Kissen für Bürostuhl»)
    # Nachbesserung 14.10. (2. Prüfung): Auflage und Mauspad nur als Hauptwort — «Mauspad mit Handgelenkauflage» ist ein Mauspad,
    # «Tastatur und Maus mit Mauspad» ein Set, «Tastatur mit Handballenauflage» eine Tastatur.
    (r"^(?:" + _KOPF + r"(?:handgelenk-?(?:auflage|kissen|polster)\w*|handballenauflage|mausarm\w*)"
     r"|(?!.*(?:bandage|schiene|orthese))" + _KOPF + r"handgelenk\w*(?=.*(?:maus|tastatur|keyboard|computer|laptop|büro))"
     r"|(?!.*(?:stuhl|bandage|st[üu]tze))(?=.*(?:maus|tastatur|keyboard))" + _KOPF + r"(?:armauflage|armlehne|hand-?auflage)\w*)", "el-7-8-5"),   # «Tastatur-Handauflage aus Holz»
    (r"^" + _KOPF + r"(?:maus-?pad\w*|mausmatte\w*|mouse-?pad\w*|schreibtischunterlage\w*|desk-?pad\w*)", "el-7-8-8"),
    # 14.10.: auch mit Leerzeichen («Laptop Ständer aus Aluminium» wurde über `top\b` Clothing) und «Ständer für Laptop»
    (r"monitorst[äa]nder|monitorerh[öo]hung|bildschirmst[äa]nder|bildschirmerh[öo]hung|(?:laptop|notebook|macbook)[- ]?st[äa]nder|"
     r"st[äa]nder\w* f[üu]r (?:den |das |deinen |dein )?(?:laptop|notebook|macbook)", "el-7-8-3"),
    # 14.10. (Prüfer): Tastatur-Zubehör hat eigene Blätter — Aufkleber el-7-8-13, Schublade/Auszug el-7-8-6 (live per nodes(ids:) geprüft)
    (r"(?:tastatur|keyboard)\w*-?(?:aufkleber|sticker)\w*|(?:aufkleber|sticker)\w* f[üu]r (?:die |deine )?(?:tastatur|keyboard)", "el-7-8-13"),
    (r"(?:tastatur|keyboard)\w*-?(?:schublade|auszug|ablage|tablett|tray)\w*|(?:schublade|auszug|ablage)\w* f[üu]r (?:die |deine )?(?:tastatur|keyboard)", "el-7-8-6"),
    # Tastatur-/Maus-Konverter für Konsolen = Konsolenzubehör (el-18-3, so steht der Konverter im Bestand)
    (r"^(?=.*(?:tastatur|keyboard|\bmaus\b))(?=.*(?:konverter|adapter)).*(?:\bps[345]\b|playstation|xbox|\bswitch\b|konsole\w*)", "el-18-3"),
    # Nachbesserung 14.10. (2. Prüfung): mit Ergänzungsstrich («Tastatur- und Maus-Set», «Maus- und Tastatur-Set», «Tastatur- & Maus-Set»,
    # «Tastatur- und Mausset») griff die Regel nicht — die Sets fielen auf Keyboards. Pads/Matten/Reiniger sind kein Set.
    (r"^(?!.*(?:klavier|piano|musik|midi|orgel|synthesizer|konverter|adapter|(?:tastatur|keyboard)-?(?:pad|matte|unterlage)|reinig|kvm|umschalter|\bhub\b))"   # «KVM-Switch für Tastatur und Maus» ist kein Set
     r"(?:.*(?:tastatur|keyboard)\w*-?\s*(?:&|\+|und|/|mit|,)\s*(?:\w+-)?maus(?:-?(?:set|kombi|paket|combo))?\b(?!-)"
     r"|.*\bmaus\w*-?\s*(?:&|\+|und|/|,)\s*(?:\w+-)?(?:tastatur|keyboard)|.*(?:tastatur|keyboard)[- ]?maus[- ]?(?:set|kombi)\w*)", "el-7-9-12-15"),   # 14.10.: auch «Tastatur-Maus-Set»
    # 14.10. (Prüfer): Tastatur-Zubehör und fremde Geräte raus («Mini Roboter Staubsauger für Tastatur & Tisch» war Keyboards).
    # «Licht/Leuchte» nur als Tastaturlicht — «Tastatur mit RGB-Licht», «Beleuchtetes Tastatur-Maus-Set» bleiben Tastatur/Set.
    # Konsolenwörter (ps4/xbox/switch/gamepad/controller) bewusst NICHT ausgeschlossen: Konverter/Adapter fängt die Regel davor
    # bzw. «konverter|adapter» hier; «Chat-Tastatur für Xbox One» fiele sonst über die allgemeine Regel `box\b` (X-BOX) in Storage.
    # Nachbesserung 14.10. (2. Prüfung): Tastatur-Switches und Tastaturschutz haben eigene Blätter (live per nodes(ids:) geprüft) — vorher
    # Keyboards. Nur als Hauptwort; «Tastatur mit Blue Switches» bleibt Tastatur. KVM-/Netzwerk-/Konsolen-Switches sind keine Tasten-Switches,
    # Tablet-Tastaturhüllen («Keyboard Cover für iPad») kein Tastaturschutz.
    (r"^(?!.*(?:nintendo|konsole|controller|lichtschalter|steckdose|netzwerk|ethernet|\blan\b|hdmi|kvm|usb-?switch|umschalter))^" + _KOPF +
     r"(?:(?:tastatur|keyboard)\w*?-?switch\w*|switch(?:es)?\b(?:(?=.*(?:\d+\s*(?:st[üu]ck|stk|pcs|pack)\b|\bersatz))|(?!(?:(?!\bf[üu]r\b).)*(?:tastatur|keyboard)))(?=.*(?:tastatur|keyboard|mechanisch|gateron|cherry|kailh|outemu|akko)))", "el-7-9-11-5"),
    (r"^(?!.*(?:ipad|tablet|samsung|galaxy|h[üu]lle|\bcase\b|tasche|klavier|piano|musik))^" + _KOPF +
     r"(?:(?:tastatur|keyboard)\w*?[- ]?(?:schutz\w*|abdeckung\w*|skins?\b|cover\b|folie\w*|protector\w*)"
     r"|(?:silikon-?|staub-?)?(?:schutz\w*|abdeckung\w*|skins?\b|folie\w*|protector\w*) f[üu]r (?:die |deine |das |den )?(?:\w+[- ])?(?:tastatur|keyboard))", "el-7-11-3"),
    # Nachbesserung 14.10. (2. Prüfung, Korpus als ob Büro: 8 von 54 Keyboards falsch = 15 %): das Tastaturwort muss im Hauptwort stehen
    # (vor «für/mit/und»: «Spiralkabel für mechanische Tastatur», «Switches für Tastatur»); «Tastatur-Schutz», «Tastatur-Desinfektionsgerät»,
    # «Tastatur-Switches» (Bindestrich + Zubehörwort) und «Tastatur Licht» sind Zubehör; E-Keyboard/Roll-Piano/Lautsprecher = Instrument.
    # Ein Ausschluss «switches|schutz|kabel» als blankes Wort hätte «Tastatur mit Blue Switches», «Tastatur mit Spritzwasserschutz» und
    # «PS/2-Tastatur mit Kabel» verloren → nur VOR dem Tastaturwort oder als Kompositum.
    # Schlussprüfung 14.10. (3. Prüfung): «Switch» VOR dem Tastaturwort ist der Schaltertyp («Red Switch mechanische Tastatur», «Hot-Swap
    # Switches mechanische Tastatur» sind Tastaturen und wurden Keyboard Switches) — ausgeschlossen wird nur «Switch… für … Tastatur» (Zubehör)
    # und die Konsole (Nintendo, blankes «Switch» ohne Schalterfarbe Red/Blue/Brown und ohne «mechanisch»). Die Switch-Regel davor nimmt
    # ein Tastaturwort nach dem Switch-Wort nur noch mit vorangehendem «für» («Gateron Switches für mechanische Tastatur»).
    (_KEIN_MODE + r"(?!.*(?:klavier|piano|musik|midi|orgel|synthesizer|reinig|abdeck|folie|h[üu]lle|cover|ablage|halter|st[äa]nder|kappe\w*\b.*(?:tastatur|keyboard)|lidschatten|"
     r"palette|make-?up|schokolade|\bform\b|backform|kinder|baby|spielzeug|aufbewahrung|tasche|"
     r"sauger|staub|konverter|adapter|aufkleber|sticker|schublade|auszug|tablett|pinsel|b[üu]rste|lampe|"
     r"tastatur-?(?:licht|leuchte)|(?:licht|leuchte)\w* f[üu]r|schl[üu]ssel|leertaste|space-?bar|desinfekt|\bskins?\b|protector|"
     r"\be-?keyboard|roll-?(?:up-?)?(?:piano|klavier|keyboard)|lautsprecher|"
     r"(?:tastatur|keyboard)\w*\s+(?:schutz|licht|leuchte|kabel(?!los|gebunden)|switch\w*|hand-?auflage|handballen\w*|auflage)|"
     r"(?:schutz|handauflage|handballen\w*|\w*kabel(?!gebunden|los))\w*\b.*(?:tastatur|keyboard)|switch\w*\s+f[üu]r\b.*(?:tastatur|keyboard)|switch\w*\b(?=.*(?:\d+\s*(?:st[üu]ck|stk|pcs|pack)\b|\bersatz)).*(?:tastatur|keyboard)|"
     r"nintendo))"
     r"^" + _KOPF_FUER + r"(?:\w*tastatur(?:en)?|\bkeyboards?)\b(?!-(?!(?:set|kit|kombi|bundle|combo)\b)[a-zäöü])", "el-7-9-12-8"),
    # 14.10. (Prüfer): Maus-Zubehör (Bungee, Grip-Tape, Skates/Füsse, Jiggler) und Konverter sind keine Maus
    (_KEIN_MODE + r"(?!.*(?:falle|spielzeug|pl[üu]sch|kost[üu]m|figur|katze|\bhund|\btier|kuschel|mick[e]?y|minnie|konverter|adapter|"
     r"bungee|grip-?tape|grip-?aufkleber|maus-?grips?\b|\btape\b|skates|f[üu]sse\b|\bfeet\b|jiggler))"
     r"(?=.*(?:dpi|bluetooth|kabellos|kabelgebunden|wireless|\bfunk|usb|klick|tasten|e-?sport|gaming|ergonomisch|büro|computer|laptop|\bpc\b|optisch|akku))"
     r"^" + _KOPF + r"\b(?:\w+-)?maus\b(?!-?(?:pad|matte|arm|falle))", "el-7-9-12-11"),
    # Laptop-Taschen/-Hüllen: die allgemeine Kleidungsregel `top\b` (ohne linke Wortgrenze) machte «Laptop-Tasche» und
    # «Laptop-Hülle» zu Clothing (Trockenlauf 14.10., 2 Entwürfe) — hier vorher abfangen.
    (_LAPTOP + r".*(?:rucksack|backpack)", "lb-1-16"),
    # «Reisetasche mit Laptopfach» ist eine Reisetasche (Korpus: 2 Titel, heute lb-6), nur «Laptoptasche mit Laptopfach» bleibt Laptoptasche
    (_LAPTOP + r"(?!(?!.*laptop-?tasche)(?:.*laptop-?fach|.*fach f[üu]r (?:den |deinen |dein )?laptop)).*(?:tasche|\bbags?\b)", "lb-15"),
    (_LAPTOP + r".*(?:h[üu]lle|sleeve)", "el-7-8-2-4"),
    # «Notebook» mit Papierformat = Notizbuch, nicht Laptop («Premium Notebook & Pen Set A5»); direkt angehängte Hülle = Buchhülle
    (r"^(?!.*(?:laptop|macbook|zoll))(?=.*\ba[4-6]\b).*\bnotebooks?[- ]?(?:schutz)?(?:h[üu]lle|umschlag|einband|cover)\w*", "os-1-1"),
    (r"^(?!.*(?:laptop|macbook|zoll|notebook-?(?:tasche|rucksack|st[äa]nder|k[üu]hl|netzteil)|k[üu]hl|st[äa]nder|netzteil))(?=.*\ba[4-6]\b).*\bnotebooks?\b", "os-4-9-9"),
    (r"^(?!.*(?:notizbuch|notebook|journal|planer|\ba[4-6]\b|kugelschreiber))"
     r".*(?:eingabestift\w*|touch-?stift\w*|touchscreen-?stift\w*|stylus\w*|touch-?pen\w*|tablet-?stift\w*)", "el-7-8-10"),
    # E-Book-Reader (Hülle vor Gerät); 14.10. (Prüfer): Kindle/Tolino/Kobo sind E-Reader («Hülle für Kindle Paperwhite» wurde Handyhülle)
    (r"(?:e-?book-?reader|e-?reader)\w*[- ]?(?:schutz)?(?:h[üu]lle|case|tasche|cover)|(?:h[üu]lle|case|tasche|cover)\w* f[üu]r (?:den |das |deinen )?(?:e-?book|e-?reader|kindle|tolino|kobo)|"
     r"(?:\bkindle|\btolino|\bkobo)(?:[- ](?:paperwhite|oasis|scribe|basic|colorsoft|kids|vision|shine|clara|libra|sage|epos|page|\d+))*[- ]?(?:schutz)?(?:h[üu]lle|case|tasche|cover)", "el-7-8-4-1-1"),
    (r"e-?book-?reader|\be-?reader\b|ebook-?reader|e-?book-?leseger[äa]t|e-?ink-?(?:reader|leseger[äa]t)|\bkindle\b|\btolino\b|\bkobo\b", "el-6-4-2"),
    # Nachbesserung 14.10. (2. Prüfung): Tablet-Hülle/-Tasche = Tablet Computer Accessories (el-7-8-4-3); «Tablet-Hülle mit Stifthalter»
    # wurde Desk Organizers (HEAD: Storage). Nur als Hauptwort; «Bluetooth-Tastatur mit Hülle für iPad» bleibt bei den Tastatur-Ausschlüssen.
    (r"^(?!.*(?:laptop|notebook|macbook|handy|smartphone|iphone|kindle|e-?reader))^" + _KOPF +
     r"(?:(?:tablet(?!te|t(?!asche))|ipad)\w*[- ]?(?:schutz)?(?:h[üu]lle|case|cover|tasche|sleeve)\w*|(?<![a-zäöü])(?:schutz)?(?:h[üu]lle|case|cover|sleeve)\w* f[üu]r (?:das |dein |den |deinen )?(?:tablet(?!te|t(?!asche))|ipad))", "el-7-8-4-3"),
    # Übersetzer-/Scan-Stifte (wie die zwei bestehenden Übersetzungsstifte); Übersetzungs-Kopfhörer/-Brillen bleiben Audio/Optik
    (r"^(?!.*(?:kopfh[öo]rer|ohrh[öo]rer|earbuds|headset|in-?ear|open-?ear|h[öo]rer|brille|kamera))"
     r".*(?:[üu]bersetz\w*|(?:scan|scanner)-?stift\w*|w[öo]rterbuch-?stift\w*)", "os-10-3"),
    (r"(?:vor)?lese-?stift\w*", "tg-5-9-5"),        # Kinder-Lesestift = Reading Toys (wie der Bestand)
    # Malen mit Diamanten (VOR Notizbuch/Stift: «Diamond Painting Notizbuch» = Mosaic Kits wie 193 im Bestand)
    (r"^(?!.*(?:bilderrahmen|rahmen f[üu]r|kissenbezug|kunstn[äa]gel|n[äa]gel))"
     r".*(?:diamant-?mal\w*|diamond[- ]?painting\w*|diamant-?bild\w*|diamant-?stickerei\w*|5d-?diamant\w*)", "ae-2-1-1-6"),
    # Etuis, Schreibtisch-Ordnung (vor den Stiften: «Bleistift-Etui», «Stiftehalter»)
    # 14.10. (Prüfer): ein blankes «Mäppchen» nur mit Stift-/Schulkontext; Brillen-, Ausweis-, Impfpass-, Pass-, Nähmäppchen nie
    (r"^(?!.*(?:kosmetik|make-?up|schmink|pinsel|wasch|kultur|schl[üu]ssel|brille|ausweis|impf|reisepass|\bpass\b|pass-?(?:m[äa]ppchen|h[üu]lle)|"
     r"n[äa]h-?(?:m[äa]ppchen|set|zeug|zubeh[öo]r|nadel|garn|etui|kit)))"
     r"^" + _KOPF + r"(?:federm[äa]ppchen|federmappe|federtasche|(?:schul|stift|stifte|bleistift|schreib)-?m[äa]ppchen|\bm[äa]ppchen\b(?=.*(?:stift|schul|schreib|kapazit|\bpen\b|büro))|"
     r"(?:stifte?|bleistift|schreibwaren)-?etui\w*|stifte-?tasche|stifte-?rolle)", "os-3-16"),
    (r"^(?!.*(?:brille|schmuck|handy|karten|kosmetik|make-?up|schmink|pinsel|zigarett|zigarr|cigar|messer|werkzeug|kamm|ausweis|schlüssel|"
     r"näh|häkel|strick|manik|pedik|\bohr|airpods|kopfhörer|tablet|kamera|zahn|kleid|schärf|mikroskop|schirm|uhr))"
     r"(?!.*\b(?:mit|im|inkl|samt|und)\b.*etui)(?!.*etui-(?!set))(?=.*(?:stift|schreib|schul|büro|feder|kapazität|\bpen))"
     r".*\w*etui\b", "os-3-16"),                      # «Karo-Etui» als Hauptwort; «… mit Etui», «Etui-Kleid» nicht
    # Nachbesserung 14.10. (2. Prüfung): nur als Hauptwort («Notizbuch mit Stifthalter» ist ein Notizbuch, «Schreibtisch-Organizer mit
    # Kugelschreiber» ein Organizer), dazu Behälter-Komposita jedes Schreibgeräts («Bleistifttasche», «Bleistiftbox», «Kugelschreiberhalter»,
    # «Füller-Etui» wurden über das Vorderwort Bleistift/Kugelschreiber/Füller; HEAD: Taschen/Storage/leer).
    (r"^(?!.*(?:make-?up|pinsel|kosmetik|lippen|pigment|aquarium|ladestation|schmink))^" + _KOPF +
     r"(?:stifte?-?halter|stifte?-?k[öo]cher|stifte?-?becher|schreibtisch-?organizer|dokumentenhalter|briefablage|schreibtisch-?ablage)", "os-3-10"),
    (_KEIN_MODE + _KEIN_KOSM_BEHAELTER + r"^" + _KOPF + _STIFTWORT + r"\w*?-?(?:taschen?|box|boxen|etuis?|rolle|h[üu]llen?|m[äa]ppchen|dosen?|beutel|schachtel)\b", "os-3-16"),
    (_KEIN_MODE + _KEIN_KOSM_BEHAELTER + r"^" + _KOPF + _STIFTWORT + r"\w*?-?(?:halter(?:ung)?|st[äa]nder|becher|k[öo]cher|organizer|ablage|tablett|schale)\b", "os-3-10"),
    # Schreibgeräte
    (_KOSM + r"^" + _KOPF + r"(?:(?:bleistift|stift|stifte|buntstift|farbstift)-?(?:an)?spitzer\w*|anspitzer\w*|spitzmaschine\w*|\bspitzer\b(?=.*stift))", "os-11-6"),
    (r"(?:bleistift|stift)-?verl[äa]ngerer\w*|stift-?verl[äa]ngerung\w*", "os-11-10"),
    # 14.10. (Prüfer): Minen/Patronen/Tinte VOR den Stiften — «Tintenpatronen für Füller» war Pens, «Kugelschreibermine» fiel allgemein auf
    # Writing Instruments. Bleistiftminen = os-11-10-3 Pencil Lead & Refills, Tinte/Patronen/Minen = os-11-10-2 Pen Ink & Refills.
    # Nachbesserung 14.10. (2. Prüfung): Mine/Tinte nur als Hauptwort — «Füller-Set mit Tintenfass» war Pen Ink (HEAD leer).
    (_KOSM + _KEIN_SCHREIBBEDARF + _NICHT_MIT_MINE + r"^" + _KOPF +
     r"(?:(?:druck)?bleistift-?minen?\b|bleiminen?\b|(?:graphit|grafit)-?minen?\b|\bminen?\b(?=.*(?:druck)?bleistift))", "os-11-10-3"),
    (_KOSM + _KEIN_SCHREIBBEDARF + _NICHT_MIT_MINE +
     r"(?:^" + _KOPF + r"(?:tinten-?patrone\w*|ersatzmine\w*|kugelschreibermine\w*|gel-?mine\w*|(?:roller|stift|schreib)-?minen?\b|tintenf[äa]ss\w*)"
     r"|(?=.*(?:" + _SCHREIB + r"))^" + _KOPF + r"(?:\bpatronen?\b|\w+-?patronen?\b|\btinte\b|\w+-?tinte\b|\bminen?\b|nachf[üu]ll-?(?:minen?|tinte|patronen?|pack\w*|set)\b))", "os-11-10-2"),
    # Nachbesserung 14.10. (2. Prüfung): Schreibgeräte nur als Hauptwort und nie als Mode-/Schmuckmotiv («Notizbuch A5 mit Kugelschreiber»,
    # «Skizzenbuch mit 12 Buntstiften», «Tagebuch mit Schloss und Gelstift» sind Papier; «Kugelschreiber-Ohrringe» Schmuck).
    (_KEIN_MODE + _KOSM + _papier_zuerst(_W_GEL) + r"^" + _KOPF + r"\bgel-?(?:schreiber|stifte?|pens?\b|roller|kugelschreiber|tintenroller)\w*", "os-11-11-7-3-4"),
    # 14.10. (Prüfer): Kamera-/Aufnahme-Stifte sind Geräte («Kugelschreiber mit versteckter Kamera» war Ballpoint Pens)
    (_KEIN_MODE + _papier_zuerst(r"kugelschreiber") + r"(?!.*(?:kugelschreibermine\w*|kamera|camera|aufnahme|recorder|diktier|mikrofon|usb))^" + _KOPF +
     r"kugelschreiber(?!-?geschenk-?(?:box|schachtel|verpackung|t[üu]te))\w*", "os-11-11-7-3-1"),
    (_KEIN_MODE + _papier_zuerst(_W_FUELLER) + r"(?!.*(?:falten|l[üu]cken|hyaluron|lippen|dermal|kamera|camera|aufnahme|recorder|diktier|mikrofon|usb))^" + _KOPF +
     r"(?:\bf[üu]ller\b|f[üu]llfeder\w*|f[üu]llhalter\w*|tintenroller\w*|tintenschreiber\w*|faserschreiber\w*|kalligra(?:f|ph)\w*-?(?:stift|feder)\w*)", "os-11-11-7-3"),
    (_KEIN_MODE + _papier_zuerst(_W_WACHS) + r"^" + _KOPF + r"(?:wachsmal\w*|wachsstift\w*|wachskreide\w*)", "os-11-11-3"),
    (_KEIN_MODE + _KOSM + _papier_zuerst(_W_BUNT) + r"^" + _KOPF + r"(?:buntstift\w*|farbstift\w*|aquarellstift\w*|aquarell-?buntstift\w*)", "os-11-11-7-2-1"),
    (_KEIN_MODE + _KOSM + _papier_zuerst(r"bleistift") + r"(?!.*(?:zimmermann|tischler|schreiner|maurer|handwerk|\bbau))^" + _KOPF +
     r"bleistift(?!-?(?:rock|r[öo]cke|absatz|abs[äa]tze|hose|jeans|kleid|kaktus))\w*", "os-11-11-7-2"),
    # 3D-Stifte wie der Bestand: für Kinder / «Zeichenstift» = Art & Drawing Toys (4×), sonst 3D-Druck (4×); Filament allgemein
    (r"^(?!.*filament)(?:(?=.*(?:kind(?!le)|kids)).*\b3d[- ]?(?:druck|zeichen|mal)?-?(?:stift\w*|pens?\b)|.*\b3d[- ]?(?:zeichen|mal)-?stift\w*)", "tg-5-2"),
    (r"^(?!.*filament)(?:.*\b3d[- ]?(?:druck)?-?stift\w*|.*\b3d[- ]?pens?\b)", "el-13-2"),
    (_KEIN_MODE + _KOSM + _papier_zuerst(_W_ZEICHEN) + r"^" + _KOPF + r"(?:zeichen|schreib|(?<![a-zäöü])mal|skizzen|grafit|graphit)-?stift\w*", "os-11-11-7"),
    (_KEIN_MODE + _papier_zuerst(_W_RADIER) + r"^" + _KOPF + r"(?:radiergummi\w*|\bradierer\b|knetradierer\w*)", "os-4-3"),
    # Papier, Bücher, Ordnung (Hülle vor Notizbuch, Haftnotiz vor Notizblock, Planer vor Notizbuch: «Tagesplaner-Notizbuch»)
    # 14.10. (Prüfer): «MacBook-Cover»/«Notebook-Cover» sind keine Buchhüllen
    (r"(?:notiz|tage|skizzen|schul)?buch-?(?:schutz)?(?:h[üu]lle|umschlag|einband|cover)\w*|(?:notizbuch|planer|kalender|heft)-?(?:schutz)?(?:h[üu]lle|umschlag|einband|cover)\w*|(?<!mac)(?<!note)book-?cover\w*", "os-1-1"),
    # Schlussprüfung 14.10. (3. Prüfung): Lesezeichen und Haftnotiz nur als Hauptwort — «Notizbuch mit Lesezeichen», «Kalender 2026 mit
    # Lesezeichen», «Planer mit Haftnotizen» und der Entwurf «Retro Notizblock mit Abreiss-Haftnotizen» (Bild: Holzbrett mit Papierrolle)
    # wurden Bookmarks/Sticky Notes.
    (r"^" + _papier_zuerst(r"lesezeichen") + _KOPF + r"lesezeichen\w*", "os-1-4"),
    (r"^" + _papier_zuerst(_W_HAFT) + _KOPF + r"(?:post-?its?\b|haftnoti\w*|klebezettel\w*|sticky ?notes?|haftzettel\w*)", "os-4-9-14"),
    # 14.10. (Prüfer): Bastelbedarf für Planer/Journal ist kein Planer/Notizbuch («Planer-Sticker Washi» war Planners, «Journal Stempel
    # Set» Notebooks). Sticker vor Washi («Washi-Sticker» = Sticker). Datum-/Firmenstempel (Bürostempel) und Nagel-/Brauenstempel nicht.
    # Nachbesserung 14.10. (2. Prüfung): das Bastelwort muss das Hauptwort sein (vor dem ersten «mit/und/&») — Bündel «Planer-Sticker und
    # Washi-Tape Set» bleiben Sticker, «Washi Tape und Sticker für Planer» Washi, «Wochenplaner mit 200 Stickern» Planer.
    (r"^" + _PLANERKONTEXT + r"(?!.*(?:wand|fenster|fliesen|m[öo]bel|tastatur|keyboard|laptop|tattoo))" + _KOPF + r"(?:aufkleber|sticker)\w*", "ae-2-1-2-8-4"),
    (r"^" + _KOPF + r"(?:washi-?(?:tape|band|klebeband)\w*|\bwashi\b)", "ae-2-1-2-5-3"),
    (r"^" + _PLANERKONTEXT + r"(?!.*(?:nagel|n[äa]gel|nail|augenbrauen|wimpern|datum|adress|firmen|selbstf[äa]rb))" + _KOPF + r"stempel\w*", "ae-2-1-4-6-3"),
    (r"^" + _PLANERKONTEXT + r"(?!.*(?:nagel|n[äa]gel|nail|augenbrauen|make-?up))" + _KOPF + r"schablone\w*", "ae-2-1-4-6-7"),
    # Planer/Kalender/Notizbuch: Hauptwort, kein Mode-/Schmuckmotiv («Kalender-Shirt», «Notizbuch-Halskette»), keine Planer-Tasche
    (_KEIN_MODE + _KEIN_BASTEL + _KEINE_PAPIERTASCHE + r"^" + _KOPF + r"\w*(?<!hobel)planer\w*", "os-3-5-3"),
    (_KEIN_MODE + _KEIN_BASTEL + _KEINE_PAPIERTASCHE + r"(?!.*(?:weihnacht|countdown|armband|chronograph|\bdeko))^" + _KOPF +
     r"\w*(?<!advents)(?<!advent)(?<!advent-)kalender\w*", "os-3-5"),
    (_KEIN_MODE + _KEIN_BASTEL + _KEINE_PAPIERTASCHE + r"(?!.*(?:messer|klinge|dolch|schwert|r[äa]tsel|comic|malbuch|ausmal|zeichenbuch))^" + _KOPF +
     r"(?:\w*notiz-?(?:buch|b[üu]cher|heft|hefte|block|bl[öo]cke)\w*|schreib-?heft\w*|schul-?heft\w*|[üu]bungs-?heft\w*|vokabel-?heft\w*|"
     r"hausaufgaben-?heft\w*|skizzen-?buch\w*|\w*tage-?buch\w*|\bjournal\b|collegeblock\w*|schreibblock\w*|\bhefte?\b)", "os-4-9-9"),
    (r"\w*ordner\b|ringbuch\w*", "os-3-2-2"),
    (r"sammelmappe\w*|schnellhefter\w*|sichtmappe\w*|zeugnismappe\w*|bewerbungsmappe\w*|pr[äa]sentationsmappe\w*|eckspanner\w*|prospekth[üu]lle\w*", "os-3-13"),
    (r"(?:sammel|spiel|trading)-?karten\w*.*(?:h[üu]lle|sleeve)|(?:h[üu]lle|sleeve)\w*.*f[üu]r (?:sammel|spiel)-?karten", "os-3-7"),
    (r"siegelger[äa]t\w*|folien-?schweiss\w*|folien-?versiegl\w*|t[üu]ten-?versiegl\w*|beutel-?versiegl\w*", "os-5"),
    (r"heftklammer\w*", "os-4-11"),
    (r"(?<!schnell)hefter\b|heftger[äa]t\w*|heftmaschine\w*", "os-11-8"),
    # 14.10. (Prüfer): «Mini-Rechner Intel N100 16GB» ist ein Computer
    (r"^(?!.*(?:notizbuch|notizblock|kalorien|waage|\bpc\b|computer|laptop|prozessor|intel|\bamd\b|ryzen|\bram\b|ddr\d|\bssd\b|windows|"
     r"\d+\s?[gt]b\b|mini-?pc)).*(?:taschenrechner\w*|\w*rechner\b)", "os-10-2"),
    # Fremdware der CJ-Gruppe (Suche liefert auch Garten, Werkzeug, Spielzeug, Spiegel, Münzen, Geldbörsen)
    (r"regenkette\w*", "hg-3-54"),
    (r"^(?!.*(?:anhänger|kette|schmuck|\bring\b|ohrring|silikonform|backform|kuchen|\bform\b))"
     r".*(?:glücksmünze|gedenkmünze|sammelmünze|\bmünze\b)", "ae-2-2-2-2"),   # «Opossum-Wanderer-Motiv»: allgemein `wander\w*` → Sport
    (r"(?:moissanit\w*|diamant\w*|edelstein)-?(?:tester|test|detektor|pr[üu]fer)\w*|(?:tester|detektor|pr[üu]fer)\w* f[üu]r (?:moissanit|diamant|edelstein)\w*", "ha-15-36"),
    # 14.10. (Prüfer): Inklinometer/Neigungsmesser VOR Winkelmesser — «Digitaler Inklinometer-Winkelmesser» zeigt eine digitale
    # Wasserwaage (Bild 40, HW300), Measuring Tools (ha-15-36) ist sicherer als Protractors
    (r"inklinometer\w*|neigungsmesser\w*", "ha-15-36"),
    (r"winkelmesser\w*|goniometer\w*", "ha-15-36-23"),
    (r"wasserwaage\w*", "ha-15-36-17"),
    (r"lern-?spielzeug\w*|\blernspiele?\b|lernspiel-\w+", "tg-5-9"),
    # 14.10. (Prüfer): `kind` traf «Kindle» → kind(?!le)
    (r"^(?=.*(?:kind(?!le)|kids|baby|kleinkind|vorschul|jungen|m[äa]dchen)).*(?:(?:lern|lese|sprach)\w*-?(?:maschine|computer|laptop|tablet|ger[äa]t)\w*|spiel-?maschine\w*)", "tg-5-9"),
    (r"hand-?spiegel\w*|handheld[- ]spiegel\w*|stiel-?spiegel\w*", "hb-3-2-5-1-6-2"),
    (r"taschen-?spiegel\w*|kompakt-?spiegel\w*|klapp-?spiegel\w*", "hb-3-2-5-1-6-1"),
    (r"^(?!.*(?:powerbank|lade))(?:.*(?:schmink-?spiegel\w*|kosmetik-?spiegel\w*|make-?up-?spiegel\w*|vergr[öo]sserungs-?spiegel\w*))", "hb-3-2-5-1-6"),
    (r"^(?!.*(?:krypto|crypto|hardware-?wallet|bitcoin|h[üu]lle|wallet-?case|handy|smartphone|iphone|samsung))"
     r".*(?:geldb[öo]rse\w*|portemonnaie\w*|portmonee\w*|portmonnaie\w*|brieftasche\w*|geldbeutel\w*|\w*wallet\b|m[üu]nzb[öo]rse\w*|kartenetui\w*|geldklammer\w*)", "aa-5-5-7"),
    # 21.10.2026 (Spähtrupp wf_32ed9d12 KAN-4): die letzten 2 aktiven Produkte ohne Kategorie — «Gummibänder Gelb 500 g» (os-4-10 Rubber Bands) und
    # «Elektronische Hängewaage» (Digital Scales). Gummiband nur als eigenes Hauptwort (kein Gummiband-Hose/-Rock, kein Haar-/Fitness-/Gürtel-Zusammenhang),
    # Waage nur Hänge-/Kran-/Gepäckwaage (Küchen-/Körper-/Schmuckwaage haben andere Blätter und bleiben hier still).
    (_KEIN_MODE + r"^(?!.*(?:haar|hose|rock\b|g[üu]rtel|widerstand|fitness|expander|yoga|schuh|stirnband|zopf|schleife|schmuck|b[üu]gel|trainings))"
     + _KOPF + r"\bgummib[äa]nd(?:er)?\b", "os-4-10"),
    (r"^(?!.*(?:k[üu]chen|k[öo]rper|body|schmuck|baby|fett))(?=.*(?:elektronisch|digital))" + _KOPF + r"(?:h[äa]nge|kran|gep[äa]ck)-?waage\w*", "ha-15-36-18-1"),
    (r"^(?!.*(?:k[üu]chen|k[öo]rper|body|schmuck|baby|fett))" + _KOPF + r"(?:h[äa]nge|kran|gep[äa]ck)-?waage\w*", "ha-15-36-18"),
]
_BR = [(_re.compile(m, _re.I), z) for m, z in BUEROREGELN]


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
    if typ in BUEROTYPEN:   # 14.10.: Tätowiergeräte, Sperre, Büro-Regeln, dann die allgemeinen Titelregeln
        t = titel or ""
        for rx, z in _BT:
            if rx.search(t):
                return z
        if BUERO_SPERRE.search(t):
            if BUERO_TATTOO_KOSM.search(t):   # «Augenbrauen-Tattoo-Stift», «Lippen-Tattoo-Stift»: Beauty oder nichts (2. Prüfung 14.10.)
                for rx, z in _TR:
                    if rx.search(t):
                        return z if z.startswith("hb") else None
            return None
        if not BUERO_VORRANG.search(t):
            tb = _buero_titel(t)   # «Box mit 24 Buntstiften» → Hauptwort Buntstift (3. Prüfung 14.10.)
            for rx, z in _BR:
                if rx.search(tb):
                    return z
        for rx, z in _TR:
            if rx.search(t):   # «Desktop-Clip» ist keine Kleidung, «Laptop Hoodie» schon (Kleidungswort im Titel)
                return None if (z.startswith("aa") and _BUERO_KEIN_AA.search(t) and not BUERO_MODE.search(t)) else z
        return SAMMEL_FALLBACK.get(typ)
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
    ids = sorted(set(TABELLE.values()) | {z for _, z in TITELREGELN} | {z for _, z in KINDERREGELN} | {z for _, z in BUEROREGELN} | {z for _, z in BUERO_TATTOO} | {"aa-1-25"})
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
                if ist and typ in BUEROTYPEN:
                    continue          # 14.10.: Büro-Regeln füllen nur leere Kategorien (Trockenlauf: Widersprüche bleiben stehen)
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
    # 22.10.2026: Spielzeug-Auto ist Spielzeug, Zubehör fürs Auto bleibt Fahrzeugzubehör (beide Richtungen)
    ("Spass-Elektronik", "Magnetische Rennstrecke mit Auto – 68-Teile-Set", "tg-5"),
    ("Spass-Elektronik", "Alloy Auto Modell 1:32", "tg-5"),
    ("Kinder", "Spielzeug-Auto Set 6 Stück", "tg-5"),
    ("Spass-Elektronik", "Rennbahn mit 2 Autos und Looping", "tg-5"),
    ("Gadget", "Auto-Sitzbezug aus Leder, universal", "vp-1"),
    ("Gadget", "Autositz-Schutzmatte rutschfest", "vp-1"),
    ("Gadget", "Scheibenwischer-Set 2 Stück", "vp-1"),
    ("Gadget", "Rennstrecken-Handschuhe aus Leder", "aa-2"),   # Rennstrecke OHNE Auto-Wort ist nicht Spielzeug
    ("Gadget", "Wandtattoo Rennstrecke Kinderzimmer", "hg-3"),
    # 14.10. (4. Prüfung): einzelnes «Switch» im Titel nimmt einer Tastatur nicht mehr das Blatt Keyboards
    ("Büro & Home Office", "Mechanische Gaming-Tastatur mit Yellow Switch", "el-7-9-12-8"),
    ("Büro & Home Office", "Gaming Tastatur mit Silent Switch", "el-7-9-12-8"),
    ("Büro & Home Office", "Bluetooth Tastatur für iPad, Mac, Switch", "el-7-9-12-8"),
    ("Büro & Home Office", "Switches für Tastatur 90 Stück", "el-7-9-11-5"),
    ("Büro & Home Office", "Gummibänder Gelb 500 g", "os-4-10"),
    ("Büro & Home Office", "Elektronische Hängewaage – 500 kg, 200 g Genauigkeit", "ha-15-36-18-1"),
    ("Büro & Home Office", "Mechanische Gepäckwaage 50 kg", "ha-15-36-18"),
    ("Gadget", "Intelligente WLAN-Steckdose", "el-7-15"),
    # 19.10.2026 (G5): Bücher / Modellbau-Zubehör aus dem Büro-Sammelkorb; Negative bleiben bei ihren Regeln
    ("Büro & Home Office", "LUZ Geschichtenbuch, 64 Seiten Hardcover", "me-1-3"),
    ("Büro & Home Office", "Kinder-Malbuch mit 48 Motiven", "me-1-3"),
    ("Büro & Home Office", "Navigationslicht für Modellschiffe 3 Stück", "ae-2-6"),
    ("Büro & Home Office", "Buchstütze aus Metall", None),
    ("Büro & Home Office", "Buchsbaum Kugel künstlich", None),
    ("Büro & Home Office", "Notizbuch A5 gepunktet", "os-4-9-9"),
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
    # Nachbesserung 05.10. (Prüfer «kategorie»): Haushaltsroboter in Bindestrich-/Umkehrform + Tierbedarf mit Fernbedienung
    ("Gadget", "Staubsauger-Roboter mit Fernbedienung", "hg-9"),
    ("Gadget", "Roboter-Staubsauger mit Fernbedienung", "hg-9"),
    ("Gadget", "Rasenmäher-Roboter mit Fernbedienung", "el"),
    ("Trend-Gadget", "Tierkamera mit Fernbedienung", "ap-2"),
    ("Trend-Gadget", "Katzen-Laserpointer mit Fernbedienung", "ap-2"),
    ("Trend-Gadget", "Ferngesteuerter Futterautomat für Tiere", "ap-2"),
    ("Gadget", "Überwachungskamera mit Fernbedienung", "el"),
    ("Trend-Gadget", "Katzenaugen-Kamera", "el"),
    ("Trend-Gadget", "Trainingsjacke mit Tierprint", "aa-1"),   # Wortfalle 9b: Trainings-JACKE ist Mode, kein Hundetraining (`trainings\w*` kippte sie)
    ("Trend-Gadget", "Kreatives Sturmfeuerzeug mit Doppelflamme", "hg-19"),
    ("Trend-Gadget", "Press Lock Schnürsenkel", "aa-8"),
    ("Baby & Kinder", "Pyjama-Set für Mädchen", "aa-1-25-6"),
    # 14.10.2026 Büro-Regeln (BUEROREGELN): die 18 offenen Fälle vom 13./14.10. + Wortfallen (Lehre 9b) als Nicht-Treffer.
    ("Büro & Home Office", "Tastatur & Maus Set mit Stummschaltung", "el-7-9-12-15"),
    ("Büro & Home Office", "98-Tasten-Bluetooth-Tastatur (Wireless)", "el-7-9-12-8"),
    ("Büro & Home Office", 'Bluetooth-Tastatur für Tablet 10" mit Hintergrundbeleuchtung', "el-7-9-12-8"),
    ("Büro & Home Office", "Kabellose Drei-Modi-Maus für Büro und E-Sport", "el-7-9-12-11"),
    ("Büro & Home Office", "Bluetooth-Maus mit 5-Gang-DPI und Silikon-Handauflage", "el-7-9-12-11"),
    ("Büro & Home Office", "Anti-Rutsch Wolken-Handgelenkauflage für die Maus", "el-7-8-5"),
    ("Büro & Home Office", "Farbiger radierbarer Gelschreiber – 12 Stück", "os-11-11-7-3-4"),
    ("Büro & Home Office", "Grüner 2B/ HB Zeichenstift – 10 Stück", "os-11-11-7"),
    ("Büro & Home Office", "12er-Set HB Bleistifte mit Radiergummi", "os-11-11-7-2"),
    ("Büro & Home Office", "Kugelschreiber mit Perlen", "os-11-11-7-3-1"),
    ("Büro & Home Office", "Elektrischer Bleistiftspitzer für Kinder", "os-11-6"),
    ("Büro & Home Office", "Lesezeichen aus PU-Leder mit Kristallen · 6 Stück", "os-1-4"),
    ("Büro & Home Office", "A5 Notizbuch-Schutzhülle aus Crazy Horse Leder", "os-1-1"),
    ("Büro & Home Office", "Notizbuch mit PU-Leder-Einband", "os-4-9-9"),
    ("Büro & Home Office", "Tagesplaner-Notizbuch Cherry Red", "os-3-5-3"),
    ("Büro & Home Office", "A4 Leder Ordner mit Multifunktion", "os-3-2-2"),
    ("Büro & Home Office", "Regenkette mit Vögeln", "hg-3-54"),
    ("Büro & Home Office", "Digitaler Inklinometer-Winkelmesser", "ha-15-36"),       # 14.10.: Inklinometer vor Winkelmesser (Bild = Wasserwaage)
    ("Büro & Home Office", "Bilingual Lernmaschine für Kinder", "tg-5-9"),
    ("Büro & Home Office", "Retro-Handheld Spiegel aus Kupfer, einseitig", "hb-3-2-5-1-6-2"),
    ("Büro & Home Office", "Diamantmalerei Desktop-Clip mit Bild", "ae-2-1-1-6"),   # allgemein: «Desktop» → `top\b` → Clothing
    ("Büro & Home Office", "Tippstift mit Offline-Scan-Übersetzung", "os-10-3"),
    ("Büro & Home Office", "E-Book-Reader mit 6-Zoll-E-Ink-Bildschirm", "el-6-4-2"),
    ("Büro & Home Office", "Kleinere PU Leder Geldbörse mit Münzfach", "aa-5-5-7"),
    ("Büro & Home Office", "Kalorienrechner-Notizbuch", "os-4-9-9"),          # Rechner-Regel nimmt kein Notizbuch
    # Nicht-Treffer: Büro-Regel darf NICHT greifen (Ergebnis = allgemeine Regel oder leer)
    ("Büro & Home Office", "Matter Lippenstift in 12 Farben", "hb-3-2-6"),
    ("Büro & Home Office", "Tattoo-Stift mit integrierter Nadel – 100 g", "bi-21-2"),  # 14.10.: kein Schreibgerät; ohne Gerätewort Elternpfad
    ("Büro & Home Office", "Temporäre Tattoos Sticker-Set für Kinder", "hb-3-2-6-7"),   # Aufkleber-Tattoo bleibt erlaubt
    ("Büro & Home Office", "Mausefalle aus Kunststoff, wiederverwendbar", None),
    ("Büro & Home Office", "Spiegelreflexkamera mit Objektiv", "el"),
    ("Büro & Home Office", "Plüsch-Maus Katzenspielzeug", "ap-2"),
    ("Büro & Home Office", "Fledermaus-Lichterkette für Halloween", "ae-3-2"),
    ("Büro & Home Office", "Keyboard-Klavier für Kinder mit 37 Tasten", "ae-2-8"),
    ("Büro & Home Office", "Tastatur-Reinigungsgel", "el"),
    ("Büro & Home Office", "Golf Adventskalender 24 Stück", "hg-3-58-1"),
    ("Büro & Home Office", "Notizbuch-Adventskalender 2026", "hg-3-58-1"),     # Vorrang Adventskalender
    ("Büro & Home Office", "Stossfeste Laptoptasche für Notebooks", "lb-15"),   # «Notebook» = Laptop, kein Notizbuch
    ("Büro & Home Office", "Hardware-Wallet für Kryptowährung", None),
    ("Büro & Home Office", "Augenbrauenstift wasserfest", "hb-3-2-5"),
    ("Büro & Home Office", "Kajal-Spitzer", None),
    ("Büro & Home Office", "Faltenfüller Serum", "hb-3-2-9"),
    ("Büro & Home Office", "HD-Rekorder für Konferenz und Aussenbereich", None),  # Video oder Ton? nicht raten → kategorie_ki
    ("Büro & Home Office", "Handgelenkbandage für Sport", "hb-1-24-6"),           # Bandage ≠ Handgelenkauflage → Wrist Braces (14.10.)
    ("Büro & Home Office", "Schlüsseletui aus Leder", None),                      # Etui ≠ Federmäppchen
    ("Büro & Home Office", "Brillenetui aus Leder", None),
    ("Büro & Home Office", "Gel-Nagellack Stift", "hb-3-2-6"),                    # Kosmetik-Sperre vor der Gelschreiber-Regel
    ("Büro & Home Office", "Kugelschreibermine 10 Stück", "os-11-10-2"),          # Mine ≠ Kugelschreiber → Pen Ink & Refills (14.10.)
    # Gegenprobe am Bestand: diese aktiven Büro-Produkte tragen ihre Kategorie schon — die Büro-Regel muss sie gleich sehen
    ("Büro & Home Office", "Ergonomischer Mausarmlehnen-Schutz aus Silikongel", "el-7-8-5"),
    ("Büro & Home Office", "Mauspad mit kabelloser Ladefunktion", "el-7-8-8"),
    ("Büro & Home Office", "PBT-Tastenkappen in Lila, Originalhöhe", "el-7-9-11-3-2"),
    ("Büro & Home Office", "Monitorständer mit zwei Ablagen", "el-7-8-3"),
    ("Büro & Home Office", "Plissiertes Karo-Etui mit grosser Kapazität", "os-3-16"),
    ("Büro & Home Office", "Post-It-Set mit Papier-Tasche", "os-4-9-14"),
    ("Büro & Home Office", "Solarbambus-Rechner für Büro", "os-10-2"),
    ("Büro & Home Office", "Wandkalender aus Holz", "os-3-5"),
    ("Büro & Home Office", "Business Füller für Studenten und Büro", "os-11-11-7-3"),
    ("Büro & Home Office", "Elektronischer Übersetzungsstift", "os-10-3"),
    ("Büro & Home Office", "Glitzer-Schutzhüllen für Sammelkarten", "os-3-7"),
    ("Büro & Home Office", "Mini-Hand-Siegelgerät, USB-C aufladbar", "os-5"),
    ("Büro & Home Office", "Glücksmünze aus Metall mit Opossum-Wanderer-Motiv", "ae-2-2-2-2"),
    ("Büro & Home Office", "Doppelkopf-Klemmleuchte für den Schreibtisch", "hg-13"),   # Lampe ≠ Schreibtisch
    ("Büro & Home Office", "Leichte Laptop-Tasche für Pendler", "lb-15"),              # allgemein: `top\b` → Clothing
    ("Büro & Home Office", "Stossfeste Laptop-Hülle mit Frontöffnung", "el-7-8-2-4"),
    ("Büro & Home Office", "Premium Notebook & Pen Set A5 – Echtleder, Touch-Pen, Business-Geschenk", "os-4-9-9"),
    ("Büro & Home Office", "Monitorständer für Laptop", "el-7-8-3"),                   # Ständer ≠ Laptoptasche
    ("Büro & Home Office", "3D-Druckstift mit OLED-Display", "el-13-2"),
    ("Büro & Home Office", "3D Zeichenstift für Kinder und Studenten", "tg-5-2"),
    ("Büro & Home Office", "3D-Druckstift für Kinder", "tg-5-2"),
    ("Büro & Home Office", "Plüsch-Etui für Stifte und Utensilien", "os-3-16"),
    ("Büro & Home Office", "Moissanite-Detektor zum Diamantentest", "ha-15-36"),
    ("Büro & Home Office", "Diamond Painting Notizbuch A5", "ae-2-1-1-6"),            # Mosaic Kits wie 193 im Bestand
    # 14.10.2026 Härtung (Prüfer-Befunde buero.pruefer): BUERO_NICHT-Fälle mit bekanntem Ziel als echte Kanarien + je 2 für jede neue Regel
    ("Büro & Home Office", "Bleistiftrock mit hoher Taille", "aa-1"),
    ("Büro & Home Office", "Bleistift-Jeans für Damen", "aa-1"),
    ("Büro & Home Office", "Bleistiftabsätze Pumps", "aa-8"),
    ("Büro & Home Office", "Laptop Ständer aus Aluminium", "el-7-8-3"),
    ("Büro & Home Office", "Verstellbarer Ständer für Laptop und Tablet", "el-7-8-3"),
    ("Büro & Home Office", "Kamera-Kugelschreiber mit 1080p", "el"),
    ("Büro & Home Office", "Kugelschreiber mit versteckter Kamera", "el"),
    ("Büro & Home Office", "Kugelschreiber mit 10 Ersatzminen", "os-11-11-7-3-1"),
    ("Büro & Home Office", "Tintenpatronen für Füller 30 Stück", "os-11-10-2"),
    ("Büro & Home Office", "Füller-Tintenpatronen", "os-11-10-2"),
    ("Büro & Home Office", "Tinte für Füller, 50 ml", "os-11-10-2"),
    ("Büro & Home Office", "Füller mit 6 Tintenpatronen", "os-11-11-7-3"),
    ("Büro & Home Office", "HTL 903XL Tintenpatronen-Set für HP Officejet Pro", None),
    ("Büro & Home Office", "Fusselroller Nachfüllpack", "hg-10"),
    ("Büro & Home Office", "Druckbleistift-Minen 0,5 mm HB", "os-11-10-3"),
    ("Büro & Home Office", "Bleistiftminen 2B, 12 Röhrchen", "os-11-10-3"),
    ("Büro & Home Office", "Planer-Sticker Washi", "ae-2-1-2-8-4"),
    ("Büro & Home Office", "Planer-Aufkleber Set 40 Blatt", "ae-2-1-2-8-4"),
    ("Büro & Home Office", "Kalender-Aufkleber", "ae-2-1-2-8-4"),
    ("Büro & Home Office", "Washi-Tape-Set 12 Rollen", "ae-2-1-2-5-3"),
    ("Büro & Home Office", "Washi Tape für Bullet Journal", "ae-2-1-2-5-3"),
    ("Büro & Home Office", "Journal Stempel Set", "ae-2-1-4-6-3"),
    ("Büro & Home Office", "Holzstempel für Bullet Journal und Planer", "ae-2-1-4-6-3"),
    ("Büro & Home Office", "Bullet Journal Schablonen Set", "ae-2-1-4-6-7"),
    ("Büro & Home Office", "Planer-Schablone aus Kunststoff", "ae-2-1-4-6-7"),
    ("Büro & Home Office", "Wochenplaner A5 mit 200 Stickern", "os-3-5-3"),
    ("Büro & Home Office", "Notizbuch mit Stickern und Schloss", "os-4-9-9"),
    ("Büro & Home Office", "Notebook Hülle aus Leder A5", "os-1-1"),
    ("Büro & Home Office", "A5 Notebook-Schutzhülle aus Kunstleder", "os-1-1"),
    ("Büro & Home Office", "Notebook mit Innentasche und Gummiband A5", "os-4-9-9"),
    ("Büro & Home Office", "Premium Notebook mit Stiftetasche A5", "os-4-9-9"),
    ("Büro & Home Office", "MacBook-Cover 13 Zoll", None),
    ("Büro & Home Office", "Notebook-Cover für 15.6 Zoll", None),
    ("Büro & Home Office", "Funktionale Outdoor-Reisetasche mit Laptopfach", "lb"),
    ("Büro & Home Office", "Laptoptasche mit Laptopfach 15 Zoll", "lb-15"),
    ("Büro & Home Office", "Mini Roboter Staubsauger für Tastatur & Tisch", "hg-9"),
    ("Büro & Home Office", "USB-Tastatur-Lampe", "hg-13"),
    ("Büro & Home Office", "Tastatur-Ohrringe", "aa-6"),
    ("Büro & Home Office", "Mechanische Gaming-Tastatur mit RGB-Licht", "el-7-9-12-8"),
    ("Büro & Home Office", "Mechanische Tastatur mit 104 Tasten, USB-C, Blue Switches", "el-7-9-12-8"),
    ("Büro & Home Office", "Tastatur- & Maus-Konverter für PS/Xbox/Switch", "el-18-3"),
    ("Büro & Home Office", "Tastatur- & Maus-Adapter für Spielkonsolen", "el-18-3"),
    ("Büro & Home Office", "Gamepad Tastatur- & Maus-Konverter", "el"),
    ("Büro & Home Office", "Tastatur-Aufkleber", "el-7-8-13"),
    ("Büro & Home Office", "Tastaturaufkleber Deutsch QWERTZ", "el-7-8-13"),
    ("Büro & Home Office", "Tastatur-Schublade", "el-7-8-6"),
    ("Büro & Home Office", "Untertisch Tastaturauszug", "el-7-8-6"),
    ("Büro & Home Office", "Gaming-Maus-Grip-Tape", "el-18"),
    ("Büro & Home Office", "USB Maus-Jiggler", "el"),
    ("Büro & Home Office", "Ergonomische Maus mit Palm-Grip, kabellos", "el-7-9-12-11"),
    ("Büro & Home Office", "Hülle für Kindle Paperwhite", "el-7-8-4-1-1"),
    ("Büro & Home Office", "Tolino Shine Schutzhülle", "el-7-8-4-1-1"),
    ("Büro & Home Office", "Kindle Lesegerät", "el-6-4-2"),
    ("Büro & Home Office", "Kindle Paperwhite 16 GB", "el-6-4-2"),
    ("Büro & Home Office", "Desktop-Clip für Fotos und Notizen", None),
    ("Büro & Home Office", "Desktop-Uhr aus Holz", None),
    ("Büro & Home Office", "Handgelenkbandage für Büroarbeit", "hb-1-24-6"),
    ("Büro & Home Office", "Armlehnen-Kissen für Bürostuhl", "hg-15"),
    ("Büro & Home Office", "Armauflage für Maus und Tastatur", "el-7-8-5"),
    ("Büro & Home Office", "Handgelenkstütze für Tastatur und Maus", "el-7-8-5"),
    ("Büro & Home Office", "Brillenmäppchen aus Leder", None),
    ("Büro & Home Office", "Nähmäppchen mit Zubehör", None),
    ("Büro & Home Office", "Mäppchen mit grosser Kapazität", "os-3-16"),
    ("Büro & Home Office", "Mini-Rechner Intel N100 16GB", None),
    ("Büro & Home Office", "Mini-PC Rechner mit Windows 11", None),
    ("Büro & Home Office", "Digitaler Neigungsmesser und Winkelmesser", "ha-15-36"),
    ("Büro & Home Office", "Winkelmesser 180 Grad aus Metall", "ha-15-36-23"),
    ("Büro & Home Office", "Mini Tattoo Pen mit USB-Ladekabel", "bi-21-2-3-2"),
    ("Büro & Home Office", "Tattoo-Pen-Set mit Motor und Zubehör", "bi-21-2-3-2"),
    ("Büro & Home Office", "Kabellose Tattoo-Maschine, 4-Gang, einstellbar", "bi-21-2-3"),
    ("Büro & Home Office", "Professionelle Tattoo-Maschine", "bi-21-2-3"),
    ("Büro & Home Office", "Danhui Hand Tattoo Stift Set", "bi-21-2"),
    ("Büro & Home Office", "Tattoo-Stift für temporäre Tattoos", None),
    ("Büro & Home Office", "Abdeckstift wasserfest für Tattoos", None),
    ("Büro & Home Office", "Beleuchtetes Gaming Tastatur-Maus-Set", "el-7-9-12-15"),
    ("Büro & Home Office", "Kabelloses Tastatur-Maus-Set für Büro", "el-7-9-12-15"),
    ("Büro & Home Office", "ONE Handle Wireless Chat-Tastatur für Xbox One", "el-7-9-12-8"),   # Konsolenwort allein ≠ Konverter
    ("Büro & Home Office", "Bluetooth-Tastatur für PS4 Controller", "el-7-9-12-8"),
    ("Büro & Home Office", "Business-Rucksack für Laptop & Notizen", "lb-1-16"),
    # 14.10.2026 Nachbesserung (2. Prüfung): (1) Bastel-Bündel — das Hauptwort entscheidet, nicht «irgendwo und/mit + Bastelwort»
    ("Büro & Home Office", "Planer-Sticker und Washi-Tape Set", "ae-2-1-2-8-4"),
    ("Büro & Home Office", "Journal-Sticker und Stempel Set", "ae-2-1-2-8-4"),
    ("Büro & Home Office", "Washi Tape und Sticker für Planer", "ae-2-1-2-5-3"),
    ("Büro & Home Office", "Planer Sticker mit Washi Tape", "ae-2-1-2-8-4"),
    ("Büro & Home Office", "Planer-Stempel und Schablonen-Set", "ae-2-1-4-6-3"),
    ("Büro & Home Office", "Wochenplaner mit 200 Stickern", "os-3-5-3"),
    ("Büro & Home Office", "Bullet Journal mit Stempel und Washi Tape", "os-4-9-9"),
    # (2) Kosmetik-/Körper-/Kinder-Tattoostifte sind keine Tätowiergeräte (HEAD: Health & Beauty; erste Härtung: Tattooing Supplies)
    ("Büro & Home Office", "Augenbrauen-Tattoo-Stift wasserfest", "hb-3-2-5"),
    ("Büro & Home Office", "Augenbrauen Tattoo Pen 4 Spitzen", "hb-3-2-5"),
    ("Büro & Home Office", "Lippen-Tattoo-Stift", "hb-3-2-6"),
    ("Büro & Home Office", "Eyeliner Tattoo Pen", "hb-3-2-6"),
    ("Büro & Home Office", "Tattoo-Stifte für Kinder, 12 Farben", None),
    ("Büro & Home Office", "Glitzer-Tattoo-Stift", None),
    ("Büro & Home Office", "Semi-permanentes Tattoo Stift", None),
    # (3) Hauptwort vor Nebenwort: Sets «X mit/und Y», Behälter-Komposita, Mode/Schmuck mit Büromotiv
    ("Büro & Home Office", "Notizbuch & Kugelschreiber Geschenkset", "os-4-9-9"),
    ("Büro & Home Office", "Notizbuch A5 mit Kugelschreiber", "os-4-9-9"),
    ("Büro & Home Office", "Journal mit Füller Geschenkset", "os-4-9-9"),
    ("Büro & Home Office", "Skizzenbuch mit 12 Buntstiften", "os-4-9-9"),
    ("Büro & Home Office", "Tagebuch mit Schloss und Gelstift", "os-4-9-9"),
    ("Büro & Home Office", "Planer 2026 mit Kugelschreiber", "os-3-5-3"),
    ("Büro & Home Office", "Füller-Set mit Tintenfass", "os-11-11-7-3"),
    ("Büro & Home Office", "Notizbuch mit Stifthalter", "os-4-9-9"),
    ("Büro & Home Office", "Tablet-Hülle mit Stifthalter", "el-7-8-4-3"),
    ("Büro & Home Office", "Schutzhülle für iPad 9.7", "el-7-8-4-3"),
    ("Büro & Home Office", "Umhängetasche für iPad mit USB-Ladeanschluss", "lb"),
    ("Büro & Home Office", "Keyboard Cover für iPad", "el-7-8-4-3"),
    ("Büro & Home Office", "Bleistifttasche", "os-3-16"),
    ("Büro & Home Office", "Bleistiftbox aus Holz", "os-3-16"),
    ("Büro & Home Office", "6-Stift-Beutel – schlicht weiss", "os-3-16"),
    ("Büro & Home Office", "Füller-Etui Leder", "os-3-16"),
    ("Büro & Home Office", "Bleistift-Organizer", "os-3-10"),
    ("Büro & Home Office", "Kugelschreiberhalter", "os-3-10"),
    ("Büro & Home Office", "Füllfederhalter mit Etui", "os-11-11-7-3"),
    ("Büro & Home Office", "Kugelschreiber-Geschenkbox", "hg-10-16"),
    ("Büro & Home Office", "Lippenstifthalter aus Acryl", "hb-3-2-6"),
    ("Büro & Home Office", "Klebestift-Box 12 Stück", "hg-10-16"),
    ("Büro & Home Office", "3-in-1 Kugelschreiber mit Stylus", "os-11-11-7-3-1"),
    ("Büro & Home Office", "Minen für Druckbleistift", "os-11-10-3"),
    ("Büro & Home Office", "Druckbleistift mit Minen", "os-11-11-7-2"),
    ("Büro & Home Office", "Hoodie mit Tastatur-Print", "aa-1"),
    ("Büro & Home Office", "T-Shirt mit Keyboard-Motiv", "aa-1"),
    ("Büro & Home Office", "Socken mit Kugelschreiber-Muster", "aa-1"),
    ("Büro & Home Office", "Kugelschreiber-Ohrringe", "aa-6"),
    ("Büro & Home Office", "Notizbuch-Halskette", "aa-6"),
    ("Büro & Home Office", "Keycap Ohrringe", "aa-6"),
    ("Büro & Home Office", "Kalender-Shirt 2026", "aa-1"),
    ("Büro & Home Office", "Planer-Tasche Leder", "lb"),
    ("Büro & Home Office", "Laptop Hoodie", "aa-1"),
    ("Büro & Home Office", "Notizbuch mit Katzen-Motiv", "os-4-9-9"),
    ("Büro & Home Office", "Kugelschreiber mit Tattoo-Design", "os-11-11-7-3-1"),
    # (4) Tastatur: Ergänzungsstrich-Sets, Zubehör vor/nach dem Tastaturwort, Instrumente; echte Tastaturen bleiben
    ("Büro & Home Office", "Kabelloses Tastatur- und Maus-Set", "el-7-9-12-15"),
    ("Büro & Home Office", "Kabelloses Maus- und Tastatur-Set", "el-7-9-12-15"),
    ("Büro & Home Office", "Kabelloses Gaming Tastatur- & Maus-Set", "el-7-9-12-15"),
    ("Büro & Home Office", "Kabelloses Tastatur- und Mausset", "el-7-9-12-15"),
    ("Büro & Home Office", "Tastatur und Maus mit Mauspad", "el-7-9-12-15"),
    ("Büro & Home Office", "Gaming-Set mit beleuchteter Tastatur, Maus, Headset und Lautsprechern", "el-7-9-12-15"),
    ("Büro & Home Office", "KVM-Switch für Tastatur und Maus", "el"),
    ("Büro & Home Office", "PBT-Leertaste für mechanische Tastaturen (6.25U)", "el-7-9-11-3-2"),
    ("Büro & Home Office", "Mechanische Tastatur mit PBT-Tastenkappen", "el-7-9-12-8"),
    ("Büro & Home Office", "PBT Space Bar Tastenkappe für mechanische Tastatur", "el-7-9-11-3-2"),
    ("Büro & Home Office", "Kontaktloses Tastatur-Desinfektionsgerät", "el"),
    ("Büro & Home Office", "Faltbares E-Keyboard mit 49 Tasten & Lautsprecher", "el"),
    ("Büro & Home Office", "Spiralkabel für mechanische Tastatur", "el"),
    ("Büro & Home Office", "Tastatur-Switches 70 Stück", "el-7-9-11-5"),
    ("Büro & Home Office", "Gateron Switches für mechanische Tastatur", "el-7-9-11-5"),
    ("Büro & Home Office", "Nintendo Switch Tastatur", "el"),
    ("Büro & Home Office", "Tastatur-Handauflage aus Holz", "el-7-8-5"),
    ("Büro & Home Office", "Tastatur-Schutz aus Silikon für MacBook", "el-7-11-3"),
    ("Büro & Home Office", "Keyboard Skin für MacBook Air", "el-7-11-3"),
    ("Büro & Home Office", "Tastatur mit Spritzwasserschutz", "el-7-9-12-8"),
    ("Büro & Home Office", "PS/2-Tastatur mit Kabel", "el-7-9-12-8"),
    ("Büro & Home Office", "Office-Keyboard kabellos", "el-7-9-12-8"),
    ("Büro & Home Office", "Kabelgebundene Gaming-Tastatur", "el-7-9-12-8"),
    ("Büro & Home Office", "Tastatur mit Handballenauflage", "el-7-9-12-8"),
    ("Büro & Home Office", "Mauspad mit Handgelenkauflage", "el-7-8-8"),
    ("Büro & Home Office", "S1 Mini Wireless Bygoad mit Maus-Tastatur", "el"),
    # Schlussprüfung 14.10.2026 (3. Prüfung, 6 Befunde): Belegtitel + je eine Gegenprobe
    # (1) «Switch» vor dem Tastaturwort = Schaltertyp der Tastatur; nur «Switches für … Tastatur» und mechanisch/Marke danach = Switches
    ("Büro & Home Office", "Red Switch mechanische Tastatur 87 Tasten", "el-7-9-12-8"),
    ("Büro & Home Office", "Blue Switch Gaming Keyboard RGB", "el-7-9-12-8"),
    ("Büro & Home Office", "Brown Switch Tastatur 60% kabellos", "el-7-9-12-8"),
    ("Büro & Home Office", "Hot-Swap Switches mechanische Tastatur RGB", "el-7-9-12-8"),
    ("Büro & Home Office", "Mechanische Gaming-Tastatur mit Red Switch", "el-7-9-12-8"),
    ("Büro & Home Office", "Switches für Tastatur 90 Stück", "el-7-9-11-5"),
    ("Büro & Home Office", "Kailh Switches 70 Stück mechanisch", "el-7-9-11-5"),
    ("Büro & Home Office", "Nintendo Switch Tastatur kabellos", "el"),
    # (2) Lesezeichen/Haftnotiz nur als Hauptwort; Papierwort vor Stift-/Lesezeichenwort mit Listenzeichen (, / & – :) = Papier
    ("Büro & Home Office", "Retro Notizblock mit Abreiss-Haftnotizen", "os-4-9-9"),   # echter Entwurf (Bild: Holzbrett mit Papierrolle); HEAD Sticky Notes
    ("Büro & Home Office", "Notizbuch mit Lesezeichen", "os-4-9-9"),
    ("Büro & Home Office", "Kalender 2026 mit Lesezeichen", "os-3-5"),
    ("Büro & Home Office", "Leder Notizbuch A5 mit Stifthalter und Lesezeichen", "os-4-9-9"),
    ("Büro & Home Office", "Planer mit Haftnotizen", "os-3-5-3"),
    ("Büro & Home Office", "Notizbuch, Kugelschreiber und Lesezeichen Set", "os-4-9-9"),
    ("Büro & Home Office", "Geschenkset: Notizbuch, Kugelschreiber, Lesezeichen", "os-4-9-9"),
    ("Büro & Home Office", "Notizbuch/Kugelschreiber Geschenkset", "os-4-9-9"),
    ("Büro & Home Office", "Notizbuch&Kugelschreiber Set", "os-4-9-9"),
    ("Büro & Home Office", "Notizbuch – Kugelschreiber – Set", "os-4-9-9"),
    ("Büro & Home Office", "A5 Notizbuch-Set: Notizbuch, Gelstift, Lesezeichen", "os-4-9-9"),
    ("Büro & Home Office", "Planer 2026, Kugelschreiber und Sticker", "os-3-5-3"),
    ("Büro & Home Office", "Haftnotizen 12 Blöcke", "os-4-9-14"),
    ("Büro & Home Office", "Kugelschreiber-Set: Notizbuch, Bleistift", "os-11-11-7-3-1"),   # Stiftwort VOR dem Papier bleibt Stift
    ("Büro & Home Office", "Bullet Journal Gelstifte 24 Farben", "os-11-11-7-3-4"),   # Leerzeichen ist kein Listenzeichen
    ("Büro & Home Office", "Planer Bleistifte, Radiergummi", "os-11-11-7-2"),
    # (3) Tattoo-Stift ohne Gerätewort nur mit Erlaubniswort; Kartuschen/Nadeln als Hauptwort = Needles, Netzteil allein = LEER
    ("Büro & Home Office", "Fake Tattoo Stift 12 Farben", None),
    ("Büro & Home Office", "Jagua Tattoo Stift", None),
    ("Büro & Home Office", "Tattoo Pen Kartuschen 20 Stück", "bi-21-2-4"),
    ("Büro & Home Office", "Tattoo-Pen-Netzteil", None),
    ("Büro & Home Office", "Tattoo Pen Set mit Kartuschen und Netzteil", "bi-21-2-3-2"),
    # (4) Verpackungswort mit Zahl ist nicht das Hauptwort
    ("Büro & Home Office", "Box mit 24 Buntstiften", "os-11-11-7-2-1"),
    ("Büro & Home Office", "Becher mit 10 Kugelschreibern", "os-11-11-7-3-1"),
    ("Büro & Home Office", "Tasche mit 24 Gelstiften", "os-11-11-7-3-4"),
    ("Büro & Home Office", "Kiste mit 50 Bleistiften", "os-11-11-7-2"),
    ("Büro & Home Office", "Tasche mit 3 Fächern", "lb"),
    ("Büro & Home Office", "Federtasche mit 24 Buntstiften", "os-3-16"),
    # (5) Mode-/Schmuckwort nur im Hauptwort
    ("Büro & Home Office", "Kugelschreiber mit Schlüsselanhänger", "os-11-11-7-3-1"),
    ("Büro & Home Office", "Planer mit Anhänger", "os-3-5-3"),
    ("Büro & Home Office", "Kalender mit Herz-Anhänger", "os-3-5"),
    ("Büro & Home Office", "Notizbuch mit Schmuckverschluss", "os-4-9-9"),
    ("Büro & Home Office", "Tastenkappe Schlüsselanhänger", "aa-6"),
    # (6) «Tabletten» (Pillen) sind kein Tablet — siehe BUERO_NICHT; Gegenprobe
    ("Büro & Home Office", "Kindertablet Hülle stossfest", "el-7-8-4-3"),
    # 14.10.2026 allgemeine Titelregeln (a)–(e), gelten für ALLE Sammeltypen
    ("Trend-Gadget", "Stop-Schild für Kinder", None),
    ("Trend-Gadget", "Laptop-Ständer aus Aluminium", None),
    ("Trend-Gadget", "Laptop-Tasche für Damen", "lb"),
    ("Trend-Gadget", "Crop-Top mit Spitze", "aa-1"),
    ("Trend-Gadget", "Tank Top Damen", "aa-1"),
    ("Trend-Gadget", "Top mit Spitze", "aa-1"),
    ("Trend-Gadget", "Gestreiftes Stricktop mit Rundhals", "aa-1"),
    ("Trend-Gadget", "Herren Tanktop ärmellos", "aa-1"),
    ("Trend-Gadget", "Bleistiftrock mit hoher Taille", "aa-1"),
    ("Trend-Gadget", "Eleganter Bleistiftrock mit Perlenstickerei", "aa-1"),
    ("Trend-Gadget", "Bleistiftabsätze Pumps", "aa-8"),
    ("Trend-Gadget", "Glücksmünze mit Opossum-Wanderer-Motiv", "ae-2-2-2-2"),
    ("Trend-Gadget", "Wanderstock mit Sitz", "sg"),
    ("Trend-Gadget", "Glitzer-Schutzhüllen für Sammelkarten", None),
    ("Trend-Gadget", "Telefonhülle mit Diamantmuster", "el-4-8-4-2"),
    ("Trend-Gadget", "Impfpass-Mäppchen", None),
    ("Trend-Gadget", "Federmäppchen mit Patchwork-Design", "os-3-16"),
    ("Trend-Gadget", "Tastatur & Maus Set mit Stummschaltung", "el"),           # Büro-Regeln gelten NUR für BUEROTYPEN
    ("Trend-Gadget", "Regenkette mit Vögeln", None),
]


# 14.10.2026: Titel, bei denen KEINE Büro-Regel greifen darf (Korpus-Probe über 54'226 Titel, Lehre 9b). Das Ergebnis
# bestimmen dann die allgemeinen Regeln oder niemand — hier wird nur geprüft, dass BUEROREGELN still bleibt.
BUERO_NICHT = [
    "Overknee-Stiefel mit Stiletto-Absatz und spitzer Zehe", "Herren-Quarzuhr mit Kalender und Edelstahlarmband",
    "Digitaler Kalenderwecker mit Medikamenten-Erinnerung", "Armbanduhr Manschettenknöpfe Kugelschreiber Geschenkset",
    "Quarz-Uhr mit Kalender, Manschettenknöpfen & Füller", "Figurbetontes Etui-Abendkleid mit Rückenschnürung",
    "Mini-Pinselset mit Etui", "Kettensägen-Schärfset im Etui", "UV-Schutz Faltregenschirm mit Etui",
    "Moissanit-Ring «Marquise» 4 ct · 925 Sterling-Silber", "AI Übersetzungs-Earbuds (144 Sprachen)",
    "Smart-Brille mit 8 MP Kamera und Übersetzung", "Zahnaufhellungs-Gelstift (4er-Pack)", "Keyboard Lidschattenpalette – 9 Farben",
    "Schokoladenform Tastatur", "Kinder-Elektronik-Keyboard", "Buntstifte-Decke", "Kopfkissen aus Memory-Schaum mit Armauflagen",
    "Handheld Golf-Entfernungsmesser Outdoor", "Wasserdichte Kameratasche für Drohne & Laptop", "Magnetische Kartenhülle mit Ständer",
    "Retro Leder Dokumentenmappe mit Anti-Diebstahl", "999 Silber-Anhänger «Fortuna» – Glücksmünze filigran",
    "Silikonform chinesische Glücksmünzen für Kuchen", "Rosafarbene Diamant-Kunstnägel", "Pastoraler Bilderrahmen für Diamond Paintings",
    "Powerbank mit Schminkspiegel und integriertem Kabel", "Magnetischer Handyhalter mit Kartenetui", "Zimmermannsbleistifte, 12 Stück",
    "Diamond Make-up Pinsel- & Stiftehalter", "Büro-Nickerchen Kissen für den Schreibtisch", "Rattan-Schubladenbox für Schreibtisch",
    "Nahtlose Sommerstrümpfe mit Sternen & Tattoo-Print", "Mausefalle aus Kunststoff, wiederverwendbar", "Spiegelreflexkamera mit Objektiv",
    "Matter Lippenstift in 12 Farben", "Bleistiftrock mit hoher Taille", "Hardware-Wallet für Kryptowährung",
    "DIY Weihnachtskalender Geschenkbeutel 50x100 cm", "Wasserdichtes Kalender-Armband", "Halloween Countdown Kalender Set",
    "Universal Hüft-Etui für Outdoor", "Spiegel-Etui mit 100 ölbindenden Tüchern", "Schlüsselmäppchen mit Strass und Rosen",
    "PLA Filament für 3D-Drucker und 3D-Stifte",
    "Hose mit Gummiband und Taschen", "Gummibänder für Haare, 100 Stück", "Fitness Widerstandsband Gummiband Set", "Gummibandhose für Damen",
    "Digitale Küchenwaage 5 kg", "Körperwaage digital mit App", "Digitale Schmuckwaage 0,01 g",   # 21.10. (KAN-4); «Wasserwaage» ist eine Libelle (Regel ha-15-36-17), kein Nicht-Treffer
    "Tablettenhülle", "Tabletten-Tasche für unterwegs",   # 14.10. (3. Prüfung): tablet(?!te|t(?!asche))
]


def buero_regel(titel):
    """Index der greifenden Büro-Regel oder None (Sperre/Vorrang/kein Treffer) — für Kanarien und Trockenläufe."""
    t = titel or ""
    if BUERO_SPERRE.search(t) or BUERO_VORRANG.search(t):
        return None
    tb = _buero_titel(t)
    for i, (rx, _z) in enumerate(_BR):
        if rx.search(tb):
            return i
    return None


def test():
    fehler = 0
    for titel in BUERO_NICHT:
        i = buero_regel(titel)
        fehler += i is not None
        print(f"  {'✅' if i is None else '❌'} Büro-Nicht-Tref | {titel[:48]:48s} → {'still' if i is None else 'Regel #%d %s' % (i, BUEROREGELN[i][1])}")
    for typ, titel, soll in KANARIEN:
        ist = ziel_fuer(typ, titel)
        ok = ist == soll
        fehler += (not ok)
        print(f"  {'✅' if ok else '❌'} {typ[:16]:16s} | {titel[:48]:48s} → {ist or 'LEER':10s} (soll {soll})")
    print(f"KANARIEN: {len(KANARIEN) + len(BUERO_NICHT) - fehler}/{len(KANARIEN) + len(BUERO_NICHT)} richtig "
          f"(davon {len(BUERO_NICHT)} Büro-Nicht-Treffer)")
    fehler += len(typen_abgleich())
    return fehler


def typen_abgleich():
    """07.10.2026: Typen, die die Typ-Werkzeuge VERGEBEN, die diese Tabelle aber nicht kennt. Anlass: produkttyp_vereinheitlichen
    vergab seit 05.10. «Wellness & Aromatherapie» (VORRANG Diffuser) — hier unbekannt, neue Diffuser blieben ohne Kategorie,
    154 alte standen weiter in «Cosmetic Tools». Jeder neue Typ muss hier landen, bevor er vergeben wird."""
    import re as _r
    import produkttyp_vereinheitlichen as ptv
    bekannt = set(TABELLE) | set(SAMMELTYPEN) | set(KINDERTYPEN)
    ziele = {v for v in ptv.TAX.values() if isinstance(v, str)} | {z for _, z in ptv.VORRANG}
    try:
        s = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "produkttyp_aus_kategorie.mjs"), encoding="utf-8").read()
        ziele |= set(_r.findall(r":\s*'([^']+)',", s)) | set(_r.findall(r"\],\s*'([^']+)'\]", s))
    except OSError:
        pass
    fehlend = sorted(z for z in ziele if z not in bekannt)
    print(f"TYPEN-ABGLEICH: {'alle vergebenen Typen bekannt' if not fehlend else 'UNBEKANNT ' + ', '.join(fehlend)}")
    return fehlend


if __name__ == "__main__":
    if "--test" in sys.argv or "--selbsttest" in sys.argv:   # --selbsttest = Alias (14.10.), Aufseher ruft --test
        sys.exit(1 if test() else 0)
    korrektur() if os.environ.get("KORREKTUR") == "1" else main()
