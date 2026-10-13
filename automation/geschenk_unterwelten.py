#!/usr/bin/env python3
"""geschenk_unterwelten.py — «Geschenke für Sie / für Ihn / für Kinder» mit echter Geschenk-Vielfalt füllen (02.10.2026).

ANLASS (12-Tage-Plan Tag 3 «Weihnachten + Geschenke», Kontaktbogen der ersten 24 sichtbaren Produkte):
  für Sie   = Regel Tag damen UND geschenk → 22/24 Schmuck (nur Schmuck trug beide Tags)
  für Ihn   = Regel Tag herren UND geschenk → 22/24 Uhren
  für Kinder = Regel Tag kinder ODER spielzeug → 16/24 Babykleider (Grind-Importe tragen «kinder»), 2 Spielzeuge
Die Sortierung war nicht schuld (BEST_SELLING zeigte dasselbe) — die ZUORDNUNG war es.

WAS ES TUT
  1. liest den Katalog-Export (hype_export_bauen.py, ZIEL=/tmp/geschenk_export.jsonl, ≤ 24 h alt)
  2. wählt je Welt Ware nach Warenart (Titel-Muster je Kategorie), nur: ACTIVE, im Google-Kanal (= sauber geprüft),
     ≥ 2 Bilder, Preis CHF 19–150 (Welt «unter30»: 12–30), keine Sperr-Tags/-Wörter (Kostüm, Medizin, Klinge, Tierschutz, Biozid, Duplikat …)
  3. Tag `geschenkwelt-sie|ihn|kinder` setzen (fehlende) und bei nicht mehr passender Ware entfernen
  4. Kollektion: eine Regel «Tag = geschenkwelt-…», Sortierung MANUAL, die ersten 48 Plätze reihum nach Warenart
     (Kaufwillen-Tags zuerst), damit oben Vielfalt steht
  python3 automation/geschenk_unterwelten.py            Trockenlauf: Zählung je Welt/Kategorie + Beispiele
  SCHARF=1 python3 automation/geschenk_unterwelten.py   schreiben (Altregeln → dropship/_geschenk_unterwelten_alt.json)
"""
import collections, datetime as dt, json, os, re, subprocess, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql
from werbetest_sperre import gesperrte_ids, HINWEIS as WERBETEST_HINWEIS

EXPORT = "/tmp/geschenk_export.jsonl"
SCHARF = os.environ.get("SCHARF") == "1"
ALT = os.path.join(REPO, "dropship", "_geschenk_unterwelten_alt.json")
MAX_JE_WELT = int(os.environ.get("MAX_JE_WELT", "400"))
VORRANG = ("kunden-liebling", "nachfrage-liebling", "hype-jetzt")
SPERR_TAGS = re.compile(r"^(tierschutz|biozid|medizin|duplikat|klinge|handklinge|abhoer|marke-faelschung|recht-pruefen|"
                        r"bild-fremdpreis|kostuem|erotik)", re.I)
SPERR_TITEL = re.compile(r"kostüm|kostuem|perücke|verkleidung|fasnacht|halloween|erotik|dessous|tabak|vape|shisha|messer|"
                         r"klinge|serum|creme|massage|therapie|schmerz|magnet|wellness|ersatz|adapter|kabel|halterung|"
                         r"\bteile?\b|zubehör für|spalter|\bbeil\b|\baxt\b|machete|schwert|dolch|skalpell|"
                         # 10.10.: Fremdmarke als Ware (Harrods-Logo auf der Tasse, seit 24.09. bekannt, war in «bis CHF 30»)
                         r"harrods|burberry|starbucks|chanel|gucci|louis vuitton|disney|hello kitty|sanrio|pok[eé]mon|labubu", re.I)

# 12.10.2026: Warenarten des Geschenke-Einstiegs — geteilt von «alle», «unter50», «unter100», «preishits».
ALLE_ARTEN = [
                 ("schmuck", r"ohrring|halskette|kette mit|anhänger|armband(?!uhr)|armreif|\bring\b|schmuckset"),
                 ("uhr", r"damenuhr|damen-uhr|uhr für damen|herrenuhr|herren-?armbanduhr|automatikuhr|chronograph|herren.{0,20}uhr"),
                 ("tasche", r"handtasche|umhängetasche|clutch|schultertasche|tote ?bag|abendtasche|reisetasche|kulturbeutel"),
                 ("leder", r"geldbörse|portemonnaie|brieftasche|kartenetui|herrengürtel|ledergürtel|manschettenknöpfe"),
                 ("kuschel", r"kuscheldecke|heizdecke|wärmekissen|fleecedecke|wolldecke|sofadecke|handwärmer"),
                 ("duft", r"duftkerze|kerze|diffuser|aroma|duftstäbchen|kerzenwärmer"),
                 ("beauty", r"make-?up-?(pinsel|set)|schminkkoffer|kosmetiktasche|haarstyler|lockenstab|glätteisen|"
                            r"warmluftbürste|schminkspiegel"),
                 ("tech", r"powerbank|kopfhörer|ohrhörer|bluetooth-?lautsprecher|ladestation|sternenprojektor|mini-?beamer|drohne"),
                 ("bar", r"whisky|flachmann|cocktail|bar-?set|weinset|bierkrug"),
                 ("tasse", r"tasse(?!l)|thermobecher|teekanne|teeset"),
                 ("deko", r"weihnachtsfigur|weihnachtskugel|weihnachtsdeko|schneekugel|lichterkette|nussknacker|adventskranz"),
                 ("schal", r"\bschal\b|-schal\b|halstuch|seidentuch|wintermütze|strickmütze|lederhandschuhe|winterhandschuhe"),
                 ("plüsch", r"plüschtier|kuscheltier|stofftier|teddy"),
                 ("bauen", r"bausteine|klemmbausteine|baukasten|3d-?puzzle"),
                 ("spiel", r"brettspiel|kartenspiel|puzzle|würfelspiel"),
]

WELTEN = {
    "sie": {"handle": "geschenke-fuer-sie", "nicht": re.compile(r"herren|männer|\bmen\b|jungen|kinder|baby", re.I),
            "arten": [
                ("schmuck", r"ohrring|halskette|kette mit|anhänger|armband(?!uhr)|armreif|\bring\b|schmuckset"),
                ("tasche", r"handtasche|umhängetasche|clutch|schultertasche|tote ?bag|abendtasche"),
                ("kuschel", r"kuscheldecke|heizdecke|wärmekissen|fleecedecke|wolldecke|sofadecke"),
                ("duft", r"duftkerze|kerze|diffuser|aroma|duftstäbchen|kerzenwärmer"),
                ("beauty", r"make-?up-?(pinsel|set)|schminkkoffer|kosmetiktasche|haarstyler|lockenstab|glätteisen|"
                           r"warmluftbürste|haarbürste|spiegel"),
                ("schal", r"\bschal\b|-schal\b|halstuch|seidentuch|foulard|wintermütze|strickmütze|lederhandschuhe|winterhandschuhe|strickhandschuhe"),
                ("home", r"pyjama|bademantel|hausschuh|finken|morgenmantel"),
                ("uhr", r"damenuhr|damen-uhr|uhr für damen"),
            ]},
    "ihn": {"handle": "geschenke-fuer-ihn", "nicht": re.compile(r"damen|frauen|mädchen|kinder|baby", re.I),
            "arten": [
                ("uhr", r"herrenuhr|herren-?armbanduhr|automatikuhr|chronograph|herren.{0,20}uhr"),
                ("leder", r"geldbörse|portemonnaie|brieftasche|kartenetui|herrengürtel|ledergürtel|gürtel für herren|\bkrawatte\b|manschettenknöpfe"),
                ("tech", r"powerbank|kopfhörer|ohrhörer|bluetooth-?lautsprecher|smartwatch|ladestation|"
                         r"gaming-?(maus|tastatur|headset)|drohne"),
                ("bar", r"whisky|flachmann|cocktail|bar-?set|weinset|bierkrug|grill"),
                ("taschen", r"rucksack|reisetasche|kulturbeutel|aktentasche|laptoptasche|umhängetasche"),
                ("pflege", r"bart|rasierer|trimmer"),
                ("outdoor", r"taschenlampe|stirnlampe|camping|thermosflasche|fernglas"),
            ]},
    "kinder": {"handle": "geschenke-fuer-kinder", "nicht": re.compile(r"strampler|\bbody\b|bodys|pyjama|pullover|hose|"
                                                                      r"kleid|shirt|jacke|socken|schuhe|mütze|set aus|zweiteiler", re.I),
               "arten": [
                   ("plüsch", r"plüschtier|plüsch-?(dino|bär|hase|figur|spielzeug|puppe)|kuscheltier|stofftier|teddy"),
                   ("bauen", r"bausteine|klemmbausteine|baukasten|bauspielzeug|magnet-?bau|3d-?puzzle"),
                   ("spiel", r"brettspiel|kartenspiel|puzzle|würfelspiel|lernspielzeug|montessori|holzspielzeug"),
                   ("rc", r"ferngesteuert|rc-?auto|rc-?fahrzeug|rennauto|spielzeugauto|modellauto|\bzug\b|eisenbahn"),
                   ("kreativ", r"bastelset|bastel-?set|bastelkoffer|malset|malbuch|knete|kinderkamera|diamond painting|stickerbuch"),
                   ("licht", r"sternenhimmel|sternenprojektor|nachtlicht"),
                   ("draussen", r"seifenblasen|kinderroller|wasserpistole|lenkdrachen|springseil|hüpfball"),
                   ("musik", r"xylophon|spielzeug-?(gitarre|klavier|trommel)|musikinstrument"),
                   ("spielzeug", r"spielzeug"),
               ]},
    # 03.10.2026: «Geschenke bis CHF 30» (Menü, 9 Kanäle) zeigte oben 12/24 Partydeko + 11/24 Schmuck (Regel geschenk UND
    # Preis < 30, CREATED_DESC) — dieselbe Klasse wie oben, eigenes Preisband, unisex.
    "unter30": {"handle": "🎁-geschenke-bis-chf-30", "preis": (12, 30), "nicht": re.compile(r"baby|strampler", re.I),
                "arten": [
                    ("schmuck", r"ohrring|halskette|anhänger|armband(?!uhr)|armreif|\bring\b"),
                    ("duft", r"duftkerze|kerze|diffuser|duftstäbchen|kerzenwärmer"),
                    ("tasse", r"tasse(?!l)|thermobecher|kaffeebecher|trinkflasche|teekanne|teeset"),
                    ("deko", r"weihnachtsfigur|weihnachtskugel|weihnachtsdeko|adventskranz|lichterkette|schneekugel|"
                             r"nachtlicht|sternenhimmel|sternenprojektor"),
                    ("spiel", r"puzzle|kartenspiel|brettspiel|würfelspiel|plüschtier|kuscheltier|stofftier"),
                    ("kuschel", r"kuscheldecke|fleecedecke|wärmflasche|wärmekissen|kuschelsocken"),
                    ("beauty", r"kosmetiktasche|make-?up-?pinsel|schminkspiegel|haarspange|haarklammer|scrunchie|nagelset"),
                    ("gadget", r"schlüsselanhänger|handyständer|mini-?staubsauger|mini-?ventilator|notizbuch|tagebuch"),
                ]},
    # 10.10.2026: «Kleine Geschenke & Mitbringsel unter CHF 20» (Menü «Geschenke & Weihnachten», 9 Kanäle) war die Regel
    # Preis < 20 → 27'033 Produkte, BEST_SELLING, oben Rändelwerkzeug, Laborbrille, Schneidmatte, Lochschneider. Suchbegriff
    # «wichtelgeschenke» = 2'400/Mt (CH, KD 0), keine Seite dafür → dieselbe Klasse wie «unter30», eigenes Preisband.
    "wichtel": {"handle": "kleine-geschenke-mitbringsel", "preis": (7, 19.95), "nicht": re.compile(r"baby|strampler", re.I),
                "deckel": {"schmuck": 60},   # Schmuck gibt es unter CHF 20 vier Mal so oft wie alles andere
                "arten": [
                    ("tasse", r"tasse(?!l)|thermobecher|kaffeebecher|trinkflasche|teekanne|teeset|teesieb|tee-?ei"),
                    ("duft", r"duftkerze|kerze|diffuser|duftstäbchen|kerzenwärmer"),
                    ("deko", r"weihnachtsfigur|weihnachtskugel|weihnachtsdeko|lichterkette|schneekugel|nachtlicht|"
                             r"sternenhimmel|wichtel|lebkuchen|schneemann|rentier|nussknacker"),
                    ("kuschel", r"kuscheldecke|fleecedecke|wärmflasche|wärmekissen|kuschelsocken|handwärmer"),
                    ("schmuck", r"ohrring|halskette|anhänger|armband(?!uhr)|armreif|\bring\b"),
                    ("spiel", r"puzzle|kartenspiel|brettspiel|würfelspiel|plüschtier|kuscheltier|stofftier|zauberwürfel|"
                              r"anti-?stress|knautschball|stressball"),
                    ("beauty", r"kosmetiktasche|make-?up-?pinsel|schminkspiegel|haarspange|haarklammer|scrunchie"),
                    ("gadget", r"schlüsselanhänger|handyständer|notizbuch|tagebuch|lesezeichen|"
                               r"flaschenöffner|eiskratzer|kartenetui"),
                ]},
    # 12.10.2026: Der Geschenke-EINSTIEG selbst (Hauptmenü Platz 1 «🎁 Geschenke & Weihnachten», 49 Ratgeber-Links, 13 Kollektionen
    # verlinken ihn) war die Regel «Tag = geschenk» → 4'735 aktive, CREATED_DESC, Median der ersten 24 CHF 16.90, oben Strickblumen,
    # Mona-Lisa-Sisal, Schlüsselanhänger (Gruppe «cjpartydeko» stempelt «geschenk» auf jede Kategorie). Gleiche Klasse wie «sie/ihn».
    # Keine Preisgrenze ab 50 (Ratgeber «Männer-Geschenke unter 50 CHF» verlinkt hierher), sondern Vielfalt reihum über alle Arten.
    "alle": {"handle": "premium-geschenke", "nicht": re.compile(r"baby|strampler", re.I),
             "deckel": {"schmuck": 80, "uhr": 60}, "arten": ALLE_ARTEN},
    # 12.10.2026 (Betreiber «mache auch geschenk kategorie»): die übrigen Geschenk-Seiten im Menü waren reine Preis-/Wortregeln —
    # «unter CHF 50» 68'005 und «unter CHF 100» 79'613 Produkte (oben Herrenschuhe), «Preis-Hits unter CHF 25» 41'667 (Schuhe,
    # Haustierbedarf), «Hochzeitsgeschenke» über «für Paare» (Golfschuhe, taktische Weste), «Sets & Bundles» über «-Set»
    # (Babykleider, Krankenschwester-Stifte). Gleiche Klasse wie «alle» → eigene Preisbänder bzw. eigene Arten.
    "unter50": {"handle": "geschenke-unter-50-franken", "preis": (19, 50), "nicht": re.compile(r"baby|strampler", re.I),
                "deckel": {"schmuck": 80, "uhr": 60}, "arten": ALLE_ARTEN,
                "teuer_zuerst": True},   # sonst dieselben ersten Plätze wie «alle» (gleiche Arten, überlappende Preise)
    "unter100": {"handle": "geschenke-unter-100-franken", "preis": (40, 100), "nicht": re.compile(r"baby|strampler", re.I),
                 "deckel": {"schmuck": 80, "uhr": 60}, "arten": ALLE_ARTEN},
    "preishits": {"handle": "unter-chf-25", "preis": (9.9, 25), "nicht": re.compile(r"baby|strampler", re.I),
                  "deckel": {"schmuck": 60}, "arten": ALLE_ARTEN},
    "hochzeit": {"handle": "hochzeitsgeschenke", "preis": (19, 200),
                 "nicht": re.compile(r"schuh|sneaker|weste|taktik|golf|baby|puppe|kostüm|hochzeitskleid|zwerg|fee\b|feen", re.I),
                 "arten": [
                     ("paar", r"mr\.?\s*(&|und)\s*mrs|king\s*&\s*queen|partner-?(tasse|kissen|armband|ringe|schmuck|kette)|"
                              r"paar-?(armband|armbänder|ringe|tasse|tassen|kissen|kette)|pärchen|für (das )?brautpaar|hochzeitsgeschenk"),
                     ("bar", r"weinset|wein-?(glas|gläser|dekanter|kühler|öffner)|sektgl|champagner-?(glas|gläser|flöte|kühler)|whisky-?(glas|gläser|set)|karaffe|dekanter|bar-?set"),
                     ("deko", r"bilderrahmen|fotorahmen|fotoalbum|hochzeitsalbum|kerzenständer|kerzenhalter|windlicht|vase\b|led-?schild"),
                     ("kuschel", r"bettwäsche|kuscheldecke|wolldecke|tagesdecke"),   # Kissenbezüge nahmen 241 von 390 Plätzen ein
                     ("kueche", r"fondue|raclette|servierbrett|käsebrett|teeset|kaffeeservice|tassen-?set|gläser-?set"),
                     ("duft", r"duftkerze|diffuser|duftstäbchen|kerzenwärmer"),
                 ]},
    "sets": {"handle": "sets-bundles", "preis": (15, 150), "deckel": {"beauty": 60},
             "nicht": re.compile(r"baby|strampler|oberteil|shorts|kleid|hose|pullover|puppe|krankenschwester|schlüsselanhänger|"
                                 r"weihnachtskugel|baumkugel|anhänger-?set|ornament", re.I),
             "arten": [
                 ("geschenkset", r"geschenkset|geschenk-?set|geschenkbox|präsentbox"),
                 ("schmuck", r"schmuckset|schmuck-?set|halskette und (ohrringe|armband)|kette und ohrringe|ohrringe-?set"),
                 ("beauty", r"make-?up-?(pinsel-?)?set|pinselset|pflegeset|nagelset|maniküre-?set|kosmetik-?set|haarpflege-?set"),
                 ("tee", r"teeset|tee-?set|kaffeeset|tassen-?set|espresso-?set"),
                 ("bar", r"bar-?set|cocktail-?set|weinset|wein-?set|whisky-?set|gläser-?set"),
                 ("winter", r"mütze.{0,12}schal|schal.{0,12}handschuh|winter-?set"),
                 ("bettwaesche", r"bettwäsche-?set|bettwäscheset"),
                 ("kueche", r"backset|back-?set|gewürz-?set|aufbewahrungs-?set|dosen-?set"),
             ]},
}


def export_laden():
    if not os.path.exists(EXPORT) or time.time() - os.path.getmtime(EXPORT) > 86400:
        subprocess.run(["python3", os.path.join(HIER, "hype_export_bauen.py")],
                       env={**os.environ, "ZIEL": EXPORT, "MAXALTER": "86400"}, check=True)
    for z in open(EXPORT, encoding="utf-8"):
        d = json.loads(z)
        if d.get("status") == "ACTIVE":
            yield d


# Fallen aus dem ersten Trockenlauf (02.10.): «Bade-ANZUG»/«ANZUG für Herren» = «zug», «Maxi-Kleid mit GÜRTEL» = Leder,
# «Hoodie mit PLAID-Muster» = Kuscheldecke, «UHRENARMBAND-Werkzeug» = Schmuck, Hunde-/Katzenspielzeug = Kinder,
# «Mini-Projektor für Home Office» = Kinder-Licht, «Winter-PLÜSCH-Kissen» = Plüschtier.
TIER = re.compile(r"hund|katze|katzen|haustier|nager|vögel|vogel|leine|aquarium|welpe", re.I)
KLEIDUNG = re.compile(r"kleid|hose|hemd|shirt|bluse|anzug|bikini|jacke|mantel|pullover|hoodie|\brock\b|jeans|leggings|"
                      r"\btop\b|weste|overall|jumpsuit|cardigan", re.I)
ART_NICHT = {
    "schmuck": r"maniküre|nagel|nägel|schlüssel|fidget|spinner|uhrenarmband|werkzeug|smart|watch|uhr|herzfrequenz|sport-?armband|silikon|trainer|grip|kautschuk|"
               # 10.10. (Welt «wichtel»): Mücken-Armbänder, Uhrenbänder ohne das Wort «Uhr», Quarz-«Armband» = Uhr, Zubehör
               r"mücke|insekt|ultraschall|schnellwechsel|schirmverschluss|\b(?:18|20|22|24|26) ?mm\b|quarz|aufbewahrung|"
               r"anziehhilfe|usb|vorhang|personalisiert|gravur|schnellverschluss|ventilator",
    "tech": r"armband|hülle|case|kabel|ersatz|kopfband|oculus",
    "licht": r"office|büro|heimkino|home-?kino|beamer|hd |uhr|rucksack|schul|gemälde|nagel|nägel|charger|feuchttuch|luftbefeuchter|diffus|lade|speaker|lautsprecher|wecker|halskette|ring|hoodie|traumfänger|wohnräume|harz|holz|silikon|tischlampe|nachttischlampe|feuerwerk|bluetooth",
    "plüsch": r"kissen|auto|winter-plüsch|sitz|rucksack",
    "taschen": r"schul|teens|kinder|studentin|frauen|damen|helm|fuzzy|plüsch|weiblich",
    "tasche": r"taktisch|camouflage|tarn|outdoor",
    "leder": r"weiblich|damen|trench|mantel",
    "bar": r"backform|gasbrenner|brenner",
    "schal": r"box|einweg|sommer|\bski|velo|arbeits|koch|augen|beheizbar",
    "duft": r"solar|outdoor|öl|nachfüll|kerzenform|form\b|vorratsglas|zünd|locken|haar|kürbis|geist|balsam|hautfrische",
    "pflege": r"rasen|mäh|garten|echthaar|augenbrauen|bartender|nadel|roller|serum",
    "rc": r"kissen|wurst|reise",
    "spiel": r"quietsch|zähne|knirsch|eiswürfel|form\b|behälter|meilenstein|mäuse|glöckchen|militär|gangster",
    "spielzeug": r"quietsch|beiss|laser|futter|schnüffel|kau|pistole|sprüh|badeball|beagle|feder|zerr|seil",
    "kreativ": r"nagel|werkzeugset|stift set|stiftset|diffuser",
    "draussen": r"abnehmen|fitness|stahlseil",
    "beauty": r"wecker",
    # Welt «unter30» (Trockenlauf 03.10.: Nagelset «Sternenhimmel», Herrenuhr/WC-Licht mit Nachtlicht, Perlenring,
    # Taschenuhr mit Lupe, Gewichts-Notizbuch, Oster-Decke im Oktober)
    "deko": r"nagel|nägel|press-on|maniküre|tattoo|uhr|\bring\b|perlen|\bwc\b|bewegungs|sensor|luftbefeuchter|luftreiniger|"
            r"charger|lade|fahrrad|velo|solar|garten|aufbewahrung|halskette|ventilator",
    "gadget": r"uhr|gewicht|stirnband|klemme|leuchte|kältemittel|schwanger",
    # 10.10. (Welt «wichtel»): «Tassel»-Schmuck traf «tasse» (jetzt tasse(?!l)), Reiniger/Hüllen/Halter, Editor-Ware nie anfassen
    "tasse": r"reiniger|hülle|halter|silikonform|form\b|selbst gestalten|bedrucken|futter",
    "kuschel": r"oster",
}


def art_von(welt, titel):
    if TIER.search(titel):
        return None
    for name, rx in welt["arten"]:
        if re.search(rx, titel, re.I):
            if name in ART_NICHT and re.search(ART_NICHT[name], titel, re.I):
                return None
            if welt is not WELTEN["kinder"] and name != "home" and KLEIDUNG.search(titel):
                return None
            return name
    return None


# 12.10.2026: Veto aus dem Kontaktbogen (Titel ≠ Bild, Lieferantentext im Bild, Markenanlehnung) — gilt für alle Welten.
VETO_DATEI = os.path.join(REPO, "data", "geschenk_veto.json")


def veto_ids():
    try:
        return {v["id"] for v in json.load(open(VETO_DATEI, encoding="utf-8"))["veto"]}
    except (OSError, ValueError, KeyError):
        return set()


# 12.10.2026: Bildprüfung der sichtbaren Plätze. Der Kontaktbogen des Geschenke-Einstiegs zeigte 12 von 30 Karten mit
# Titel ≠ Bild («Herzanhänger» = Rose, «Blumen Topf» = Drache), Lieferantencodes («KIT04B», «53#») oder britischem Stecker.
# Die Gemini-Jury der Social-Poster (gemini_jury.py, Cache dropship/_gemini_jury.tsv) entscheidet jetzt über die ersten 48:
# Exit 4 = durchgefallen → nach hinten (bleibt in der Kollektion), Exit 2 = kein Urteil → bleibt (kein Urteil ist hier kein Nein,
# sonst stünde bei leerem Kontingent ein leeres Schaufenster). Zeitdeckel je Lauf, weil der Aufseher 40 min gibt.
JURY_SEKUNDEN = int(os.environ.get("SCHAUFENSTER_JURY_SEKUNDEN", "900"))
_jury_start = [None]


def bild_url(pid):
    p = gql('query($id:ID!){product(id:$id){featuredImage{url}}}', {"id": pid}).get("product") or {}
    return ((p.get("featuredImage") or {}).get("url")) or ""


def jury(k):
    """0 = ok, 4 = durchgefallen, 2 = kein Urteil / Zeitdeckel."""
    if os.environ.get("JURY") == "0":
        return 2
    if _jury_start[0] is None:
        _jury_start[0] = time.time()
    url = bild_url(k["id"])
    if not url:
        return 2
    args = ["python3", os.path.join(HIER, "gemini_jury.py"), url, "--caption", f"{k['titel']}\nCHF {k['preis']:.2f}", "--typ", "bild"]
    if time.time() - _jury_start[0] > JURY_SEKUNDEN:
        args.append("--nur-cache")          # nach dem Deckel nur noch gecachte Urteile, nichts Neues kaufen
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=240)
    except subprocess.TimeoutExpired:
        return 2
    if r.returncode == 4:
        print(f"   ⛔ Jury: {k['titel'][:60]} — {(r.stdout.strip().splitlines() or [''])[-1][:160]}", flush=True)
    return r.returncode if r.returncode in (0, 4) else 2


def schaufenster(reihe, plaetze=48):
    oben, hinten = [], []
    for k in reihe:
        if len(oben) >= plaetze:
            hinten.append(k); continue
        (hinten if jury(k) == 4 else oben).append(k)
    return oben + hinten


def auswahl():
    kand = {w: [] for w in WELTEN}
    veto = veto_ids()
    for d in export_laden():
        if d["id"] in veto:
            continue
        t, tags = d["title"], d.get("tags") or []
        preis = float(d["priceRangeV2"]["minVariantPrice"]["amount"])
        if not d.get("g") or d["mediaCount"]["count"] < 2:
            continue
        if SPERR_TITEL.search(t) or any(SPERR_TAGS.search(x) for x in tags):
            continue
        for w, welt in WELTEN.items():
            lo, hi = welt.get("preis", (19, 150))
            if welt["nicht"].search(t) or not (lo <= preis <= hi):
                continue
            a = art_von(welt, t)
            if a:
                prio = 0 if any(x in VORRANG for x in tags) else 1
                kand[w].append({"id": d["id"], "titel": t, "art": a, "preis": preis, "prio": prio,
                                "bilder": d["mediaCount"]["count"], "tags": tags})
    for w in kand:
        # je Art ausgewogen kappen: reihum aus den Art-Listen ziehen (Vorrang, dann mehr Bilder)
        je = collections.defaultdict(list)
        teuer = WELTEN[w].get("teuer_zuerst")
        for k in sorted(kand[w], key=lambda k: (k["prio"], -k["preis"], -k["bilder"]) if teuer else (k["prio"], -k["bilder"], k["preis"])):
            je[k["art"]].append(k)
        reihe, i = [], 0
        while len(reihe) < MAX_JE_WELT and any(je.values()):
            for a in list(je):
                if je[a]:
                    reihe.append(je[a].pop(0))
            i += 1
        deckel = WELTEN[w].get("deckel", {})
        if deckel:
            zaehl = collections.Counter()
            reihe = [k for k in reihe if (zaehl.update([k["art"]]) or zaehl[k["art"]] <= deckel.get(k["art"], MAX_JE_WELT))]
        kand[w] = reihe[:MAX_JE_WELT]
    return kand


def main():
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'}", flush=True)
    kand = auswahl()
    alt = {}
    for w, reihe in kand.items():
        if os.environ.get("NUR") and w not in os.environ["NUR"].split(","):   # 12.10.: NUR=alle für einen Einzellauf
            continue
        welt = WELTEN[w]
        zahl = collections.Counter(k["art"] for k in reihe)
        print(f"\n== {w}: {len(reihe)} Produkte · {dict(zahl)}")
        for k in reihe[:18]:
            print(f"   {k['art']:9} CHF {k['preis']:6.2f} {k['titel'][:70]}")
        tag = f"geschenkwelt-{w}"
        soll = {k["id"] for k in reihe}
        # 13.10.2026 Werbetest A: Tags der beworbenen Produkte einfrieren (dropship/_werbetest_sperre.txt) — der Lauf vom
        # 12.10. schrieb 11 der 13 an einem Abend. Weder hinzufügen noch entfernen; nach dem Ende entscheidet die Regel wieder.
        sperre = {f"gid://shopify/Product/{i}" for i in gesperrte_ids()}
        if not SCHARF and not sperre:
            continue
        ist = set()
        c = None
        while True:
            d = gql('query($q:String!,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{id}}}',
                    {"q": f"tag:{tag}", "c": c})["products"]
            ist |= {n["id"] for n in d["nodes"]}
            if not d["pageInfo"]["hasNextPage"]:
                break
            c = d["pageInfo"]["endCursor"]
        for pid in sorted((soll ^ ist) & sperre):
            print(f"   {WERBETEST_HINWEIS} {pid.split('/')[-1]} ({'+' if pid in soll else '−'}{tag})", flush=True)
        soll = (soll - sperre) | (ist & sperre)
        if not SCHARF:
            print(f"   Tags (trocken): +{len(soll - ist)} −{len(ist - soll)} · eingefroren {len(ist & sperre)} mit Tag", flush=True)
            continue
        reihe = [k for k in reihe if k["id"] in soll]   # gesperrte ohne Tag nicht in die Reihenfolge
        for pid in soll - ist:
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": pid, "t": [tag]})
        for pid in ist - soll:
            gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}', {"id": pid, "t": [tag]})
        print(f"   Tags: +{len(soll - ist)} −{len(ist - soll)}", flush=True)
        col = gql('query($h:String!){c:collectionByHandle(handle:$h){id sortOrder ruleSet{appliedDisjunctively rules{column relation condition}}}}',
                  {"h": welt["handle"]})["c"]
        alt[w] = col
        r = gql('mutation($c:CollectionInput!){collectionUpdate(input:$c){collection{sortOrder ruleSet{rules{condition}}} userErrors{message}}}',
                {"c": {"id": col["id"], "sortOrder": "MANUAL",
                       "ruleSet": {"appliedDisjunctively": False,
                                   "rules": [{"column": "TAG", "relation": "EQUALS", "condition": tag}]}}})["collectionUpdate"]
        print("   Kollektion:", r["collection"], r["userErrors"], flush=True)
        # Smart-Kollektionen füllen sich asynchron — kurz warten, dann die ersten 48 reihum setzen
        # 12.10.: 20 × 15 s reichten nicht — «unter 50» stand nach 5 min noch bei 36'317 (alte Preis-Regel), die gesetzte
        # Reihenfolge galt dem alten Bestand (Kontaktbogen: Kugelhahn, Crimpzange). Jetzt bis 20 min, sonst Warnung.
        for _ in range(80):
            n = gql('query($id:ID!){c:collection(id:$id){productsCount{count}}}', {"id": col["id"]})["c"]["productsCount"]["count"]
            if abs(n - len(soll)) <= len(soll) * 0.1:   # alter Bestand (z. B. 2'743) zählt nicht als «gefüllt»
                break
            time.sleep(15)
        else:
            print(f"   ⚠️ Kollektion nach 20 min noch nicht neu berechnet ({n} statt {len(soll)}) — Reihenfolge im nächsten Lauf erneut setzen", flush=True)
        reihe = schaufenster(reihe)
        moves = [{"id": k["id"], "newPosition": str(i)} for i, k in enumerate(reihe[:48])]
        r = gql('mutation($id:ID!,$m:[MoveInput!]!){collectionReorderProducts(id:$id,moves:$m){job{id} userErrors{message}}}',
                {"id": col["id"], "m": moves})["collectionReorderProducts"]
        print(f"   Reihenfolge: {len(moves)} Plätze · {r['userErrors'] or 'ok'} · Produkte in Kollektion {n}", flush=True)
    if SCHARF:
        bisher = json.load(open(ALT)) if os.path.exists(ALT) else {}
        bisher.setdefault(str(dt.date.today()), alt)
        json.dump(bisher, open(ALT, "w"), ensure_ascii=False, indent=1)
    print("\nFERTIG" + ("" if SCHARF else " (trocken)"))


if __name__ == "__main__":
    main()
