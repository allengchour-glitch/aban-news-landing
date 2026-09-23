#!/usr/bin/env python3
"""herbst_kuratieren.py — Herbst-Reihe «🍂 Herbst-Favoriten» (Betreiber 23.09.2026: «webseite auch
herbstsachen und toller machen»).

Was es tut:
  1. Liest den Voll-Export (/tmp/export.jsonl, aktive Produkte) und sucht Herbst-Ware in zehn Themen:
     Hoodies, Strick, Übergangsjacken, Boots, Schals/Mützen/Handschuhe, Kerzen & Duft, Kuscheldecken,
     Wärme (Wärmflasche/Hausschuhe), Tee- & Kaffee-Zubehör, Herbst-Deko.
  2. Bedingungen wie die Hype-Reihe: ≥2 Bilder, ab CHF 19, im Google-Kanal, kein Sperr-Tag
     (google_sperrliste.AUSSCHLUSS_TAGS + Werbe-Sperren + Präfix google-gesperrt), keine heikle
     Warengruppe (Kostüm/Halloween/Erotik/Rauch …), kein Wirkversprechen, keine Lizenz-Marke.
  3. Jede Wahl wird LIVE gegengeprüft (Export ist ein Schnappschuss): ACTIVE, im Onlineshop,
     im Google-Kanal, Hauptbild ≥ 600 px, bei Lagerführung Bestand > 0.
  4. Taggt die Auswahl `herbst-2026` (Ziel 40–80); die Smart-Kollektion `herbst-favoriten`
     (Regel Tag = herbst-2026) zeigt sie. Sortierung MANUAL im Themen-Reissverschluss: die ersten
     acht Karten (= Startseitenreihe) sind acht VERSCHIEDENE Themen, nicht drei Hoodies nebeneinander.
  5. Rücklesen: Anzahl live getaggt, Kollektion, Kanäle, erste acht Karten.

Aufräumen: Wer den Tag trägt, aber live nicht mehr passt (DRAFT, Sperr-Tag, nicht mehr im
Onlineshop), verliert ihn beim nächsten Lauf. Nach SAISON_ENDE nimmt der Lauf den Tag überall weg.

  DRY=1 python3 automation/herbst_kuratieren.py        zeigt Auswahl, schreibt /tmp/herbst_auswahl.json
  KONTAKT=1 python3 automation/herbst_kuratieren.py    Kontaktbogen der Auswahl (PFLICHT vor dem Schreiben)
  python3 automation/herbst_kuratieren.py              schreibt (Tags, Kollektion, Reihenfolge)
  NUR_RAEUMEN=1 …                                      nur Unpassendes entfernen, nichts Neues
  SELBSTTEST=1 python3 automation/herbst_kuratieren.py  Kanarienvögel der Regeln (kein Netz)

⚠️ Fallen, die die Regeln abfangen (Kanarienvögel im Selbsttest):
   «schmEICHELhaft» ≠ Eichel · «Kürbis-SüssigkeitenSCHALE» ≠ Schal · «LederHANDSCHUH» ≠ Schuh ·
   «LATERNENärmel» ≠ Laterne · «KERZENFORM» ≠ Kerze · «ASCHENBECHER» ≠ Becher · «PLAID-Kleid» ≠ Decke ·
   «Strickkleid für den STRANDurlaub» = Sommer · «BADEmantel» ≠ Mantel.
"""
import datetime, json, os, re, subprocess, sys, time, zlib

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
try:
    from eimer_etikette import nachlauf, bilanz
except Exception:  # pragma: no cover
    def nachlauf(d):
        return 0.0
    def bilanz():
        return ""
try:
    import google_sperrliste as gs
except Exception:  # pragma: no cover
    gs = None

SHOP = "au3j0y-hq.myshopify.com"
API = f"https://{SHOP}/admin/api/2026-01/graphql.json"
TOKENDATEI = "/tmp/cj_shop_token.txt"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
AUSWAHL = "/tmp/herbst_auswahl.json"
DRY = os.environ.get("DRY") == "1"
HEUTE = datetime.date.today()
SAISON_ENDE = datetime.date(2026, 11, 30)   # danach übernimmt Weihnachten (Reihe ab 15.10. im Wechsel)
TAG = "herbst-2026"
HANDLE = "herbst-favoriten"
TITEL = "🍂 Herbst-Favoriten"
ZIEL_MIN, ZIEL_MAX = 40, 80
MIN_PREIS = 19.0
MIN_KANTE = 600
GOOGLE = "gid://shopify/Publication/302872297857"
ONLINESHOP = "gid://shopify/Publication/301970915713"
# Dieselben sechs Kanäle wie hype-jetzt (gemessen 23.09.: Online Store, Shop, TikTok, FB & IG, Google, Pinterest)
KANAELE = ["301970915713", "301971014017", "302032716161", "302566834561", "302872297857", "302994456961"]

SEO_TITEL = "Herbst-Favoriten: Strick, Hoodies & Boots | LuxeStyle"
SEO_TEXT = ("Herbst-Favoriten für die Schweiz: Hoodies, Strick, Übergangsjacken, Boots, Kerzen und "
            "Kuscheldecken. Gratis-Versand ab CHF 50, 30 Tage Rückgabe.")
BESCHREIBUNG = ("<p>Wenn die Tage kürzer werden: warme Hoodies und Strick, Übergangsjacken und Boots für "
                "nasse Tage, dazu Kerzen, Kuscheldecken und alles für die Tasse Tee am Abend. Jeder Artikel "
                "hat mehrere Bilder, die Lieferzeit steht auf der Produktseite.</p>"
                "<p>Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · Bezahlen mit TWINT, Klarna oder Karte.</p>")

# ── Themen ─────────────────────────────────────────────────────────────────────────────────
# Reihenfolge = Vorrang (erster Treffer gewinnt): «Heizjacke» ist Wärme, nicht Jacke;
# «Hoodie-Decke» ist Decke, nicht Hoodie.
W = r"(?<![A-Za-zÄÖÜäöüß])"          # Wortanfang auch vor Umlauten (\b kennt «Ü» nicht zuverlässig)
THEMEN = [
    ("waerme", "Wärme & Hausschuhe", 5, re.compile(
        r"W[äa]rmflasche|Bettflasche|Handw[äa]rmer|Fu(?:ss|ß)w[äa]rmer|K[öo]rnerkissen|W[äa]rmekissen|"
        r"Heizkissen|beheizbare?[rns]?\b|Heizweste|Heizjacke|Heizsocken|Heizschal|Hausschuhe?\b|Pantoffel|"
        r"Kuschelsocken|Wollsocken|Thermosocken|Tassenw[äa]rmer|Becherw[äa]rmer", re.I)),
    ("decke", "Kuscheldecken", 5, re.compile(
        r"(?:Kuschel|Wohn|Flanell|Fleece|Sherpa|Strick|W[äa]rme|Sofa|TV|Couch|Samt|Pl[üu]sch|Tages|Waffel|"
        r"Musselin|Teddy)[- ]?[dD]ecke\b|Hoodie[- ]?Decke|Decken[- ]?Hoodie|Wearable Blanket", re.I)),
    ("hoodie", "Hoodies & Sweater", 10, re.compile(
        r"Hoodie|Kapuzenpullover|Kapuzen-?Sweat|Sweatshirt|Sweatjacke|Kapuzenjacke", re.I)),
    ("strick", "Strick & Pullover", 9, re.compile(
        r"Pullover|Cardigan|Strickjacke|Rollkragen|Strickpulli|Grobstrick|Strickkleid|Strickweste|"
        + W + r"Pulli\b|Troyer", re.I)),
    ("jacke", "Übergangsjacken & Mäntel", 9, re.compile(
        r"\w*jacke\b|" + W + r"Mantel\b|\w+mantel\b|Parka\b|Blouson|Trenchcoat|Windbreaker|Shacket|Anorak", re.I)),
    ("boots", "Boots & Stiefel", 8, re.compile(
        r"Stiefel(?!knecht|spanner|w[äa]rmer|anh[äa]nger)|Stiefelette|\bBoots\b|Booties|Chelsea|"
        r"Winterschuh|Schneeschuh|Snowboot", re.I)),
    ("schal", "Schals, Mützen & Handschuhe", 5, re.compile(
        W + r"Schals?\b|(?:Woll|Strick|Loop|Seiden|Kaschmir|Winter|Rund|Fransen|Karo|Tuch|Schlauch)schals?\b|"
        r"Halstuch|Poncho|Beanie|(?:Strick|Woll|Winter|Bommel|Fleece|Kaschmir|Pudel)[- ]?m[üu]tze|"
        r"M[üu]tze.{0,30}(?:Strick|Woll|Winter|Bommel|warm)|Ohrenw[äa]rmer|Ohrensch[üu]tzer|F[äa]ustling|"
        r"Pulsw[äa]rmer|Armstulpen|(?:Winter|Strick|Leder|Touch\w*|Woll|Fleece|Thermo|Kaschmir)[- ]?[Hh]andschuh|"
        r"Handschuhe?.{0,30}(?:Winter|Touchscreen|warm|Fleece)", re.I)),
    ("kerze", "Kerzen & Duft", 5, re.compile(
        r"Duftkerze|Kerze(?!nform)|Kerzenhalter|Kerzenst[äa]nder|Windlicht|Teelicht|" + W + r"Laternen?\b|"
        r"Duftlampe|Aroma[- ]?Diffus|Duftdiffus|Raumduft|Duftst[äa]bchen|Kerzenw[äa]rmer", re.I)),
    ("tee", "Tee & Kaffee", 5, re.compile(
        r"Teekanne|Teeservice|Teetasse|Teesieb|Tee-?Ei\b|Teebereiter|Teekessel|Teeglas|Teebecher|Teedose|"
        r"Milchaufsch[äa]umer|Kaffeebecher|Thermobecher|Isolierbecher|Reisebecher|Thermoskanne|Isolierkanne|"
        r"French[- ]?Press|Kaffeem[üu]hle|Espressokocher|Espressokanne|Kaffeetasse|Espressotasse|"
        r"Cappuccinotasse|" + W + r"Tassen?(?:[- ]?Set)?\b|Keramiktasse|Glastasse|Handfilter|Pour[- ]?Over|"
        r"Kaffeedose|Kaffeebereiter", re.I)),
    ("deko", "Herbst-Deko", 4, re.compile(
        r"(?:Herbst|K[üu]rbis|Ahorn|Tannenzapfen|" + W + r"Eichel)", re.I)),
]
THEMA_NAME = {k: n for k, n, _, _ in THEMEN}
# Herbst-Deko braucht zusätzlich einen Deko-Anker — «Herbst» allein steht in halben Modetiteln.
DEKO_ANKER = re.compile(r"Deko|Kranz|Girlande|Kissen|Tischl[äa]ufer|Figur|Kunstpflanze|Kunstblume|Zweig|"
                        r"Gesteck|Kerze|Laterne|Windlicht|Vase", re.I)
# Themenspezifische Ausschlüsse
THEMA_RAUS = {
    "jacke": re.compile(r"Bademantel|Kabel|Schutzmantel|Rettungs|Schwimm|Warn|Koch|Sicherheits|Arbeits|"
                        r"Puppen|Reflektor|Motorradschutz|Kochjacke|Sakko", re.I),
    "boots": re.compile(r"Sicherheits|Stahlkappe|Arbeitsschuh|Transparent|Jazz|Tanz|Schlauchboot|Stiefelknecht", re.I),
    "schal": re.compile(r"Kleid|(?<!hand)Schuhe?\b|Stirnband|Augenmaske|Schlafm[üu]tze|Duschhaube|Badehaube|Arbeitshandschuh|"
                        r"Garten|Grill|Ofen|Einweg|Nitril|Latex|Box|Torwart|Fahrrad|Schwei(?:ss|ß)|Peeling", re.I),
    "kerze": re.compile(r"Z[üu]ndkerze|Geburtstag|Zahlenkerze|Torten|Kuchen|Wunderkerze|Gl[üu]hkerze|Kerzenform|"
                        r"R[äa]ucher|Weihrauch|[ÄA]ther|Laternen[äa]rmel|Laternenfalte|Gie(?:ss|ß)form|Kerzengie|Docht|Silikonform|Kerzenwachs|Fahrrad|Salzlampe", re.I),
    "tee": re.compile(r"Aschenbecher|Reinigungsb|Kapsel|Pulver|Bohnen|Matcha|Instant|Tee\s*(?:beutel|mischung)|"
                      r"Messbecher|Zahnputz|W[üu]rfel|Mixbecher|Shaker|Entsafter|Eisbecher|Cocktail|Bier|Wein|Sekt|"
                      r"Schnaps|Shot|Sport|N[äa]gel|Nail|Press-?On|Strohhalm|Trinkflasche|Mehrweg-?Becher|Kunststoff|Kinderbecher|Trinklern", re.I),
    "deko": re.compile(r"S[üu]ssigkeit|sprechend|Baustein|Klemmbau", re.I),
    "decke": re.compile(r"Picknick|Abdeck|Rettungs|Pferde|Tisch", re.I),
    "waerme": re.compile(r"Auto|Sitz|Lenkrad|Scheibe|KFZ|Bandage|Napf|Futter|Massage|Knie|DIY|Selbermachen|"
                         r"Heizl[üu]fter|Heizstrahler|Plattform", re.I),
}
# Überall: Sommerware, andere Saisons, Grusel, Tier-/Kinderartikel, Druck-Editor, Lizenzfiguren.
GLOBAL_RAUS = re.compile(
    r"Sommer|Strand|Bikini|Bade(?!zimmer)|Kurzarm|[äa]rmellos|Sandale|Flip-?Flop|Shorts\b|Tank-?Top|Neckholder|"
    r"K[üu]hl(?:end|ung|weste)|Sonnenschutz|Chiffon|Massage|Weihnacht|Nikolaus|Advent|Skelett|Totenkopf|Sch[äa]del|Gespenst|Grusel|Horror|"
    r"Fuchsfell|Nerz|Echtpelz|Echtfell|Kaninchenfell|Waschb[äa]r|Wimpern|"
    r"Cosplay|Anime|Hund|Katze|Haustier|Welpe|Kinder|Baby|Kleinkind|Lauflern|M[äa]dchen|Jungen\b|"
    r"selbst gestalten|bedrucken|personalisier|Puppe|Pl[üu]schtier|"
    r"Marvel|Disney|Harry Potter|Pok[eé]mon|Naruto|Nike|Adidas|Supreme|Gucci|Louis Vuitton|Chanel|Dior|"
    r"Hello Kitty|Star Wars|Stitch|Barbie|Minecraft|Fortnite|NFL|NBA|One Piece|Dragon Ball|Demon Slayer|"
    r"Spider-?Man|Batman|Genshin|Sanrio|Kuromi|Squid Game|Stranger Things", re.I)
# Netzgeräte aus Fernost: Stecker ungewiss (Klasse #76) — nur mit USB/Akku oder geprüftem EU-Stecker.
NETZGERAET = re.compile(r"Fu(?:ss|ß)w[äa]rmer|Wasserkocher|Kaffeemaschine|Heizdecke|Heizkissen|Kerzenw[äa]rmer|elektrisch|"
                        r"Aroma[- ]?Diffus|Duftdiffus|Luftbefeuchter|Milchaufsch[äa]umer|beheizbar|Heiz", re.I)
AKKU = re.compile(r"USB|Akku|wiederaufladbar|Batterie|kabellos", re.I)

# Werbe-Sperren (tiktok_karussell.SPERR_TAGS) + Hausregeln der Startseite (hype_kuratieren)
SPERR_TAGS = {"bild-zu-klein", "medizinprodukt-pruefen", "18plus", "raucher", "waffengesetz-verboten",
              "nicht-bewerben", "nicht-live-moebel-sperrig", "niedrig-bewertet-nicht-bewerben", "nur-onlineshop",
              "duplikat-auto-draft", "hype-bild-schwach", "stecker-unklar", "titel-englisch-uebersetzen",
              "handklinge-kein-ch-versand", "cj-keine-ch-versandoption", "nicht-lieferbar-ch",
              "ausverkauft-lieferant", "keine-lieferanten-ref", "arzneimittel-ohne-zulassung", "adult-auto-draft"}
if gs is not None:
    SPERR_TAGS |= set(gs.AUSSCHLUSS_TAGS)
SPERR_PRAEFIX = ("preis-pruefen", "google-gesperrt", "google-kanal-")

try:   # dieselben Startseiten-Regeln wie die Hype-Reihe — eine Quelle, nicht zwei
    from hype_kuratieren import NICHT_STARTSEITE, WIRKVERSPRECHEN, RAUS_TYP
except Exception:  # pragma: no cover
    NICHT_STARTSEITE = re.compile(r"Intim|Erotik|Creme\b|Serum\b", re.I)
    WIRKVERSPRECHEN = re.compile(r"abnehm|fettverbrenn|gegen\s+schmerzen", re.I)
    RAUS_TYP = {"Spielzeug & Spiele", "Partydeko & Ballone", "Kostüme & Verkleidung"}
SCHMERZ = re.compile(r"schmerz|Menstruation|Regel(?:schmerz|beschwerde)|Periode|Arthritis|Rheuma|Therapie|heil", re.I)

# Nach Kontaktbogen (Vision-QA, Projektregel 5) aussortiert: ID → Grund. Bleiben dauerhaft draussen.
AUSGESCHLOSSEN = {
    # 23.09.2026, Kontaktbogen Runde 1 (65 Bilder angesehen, 19 aussortiert)
    "gid://shopify/Product/15502591525249": "Kinder-Optik, englischer Bildtext",  # Mini-Handwärmer & Powerbank
    "gid://shopify/Product/15481817497985": "Slipper/Mule statt Hausschuh",  # Lederpantoffeln · Herren
    "gid://shopify/Product/15510316188033": "offene Sommer-Pantolette",  # Damen Plattform-Pantoffeln
    "gid://shopify/Product/15499805327745": "chinesischer Bildtext (Sofabezug)",  # Stretch Sofa-Decke
    "gid://shopify/Product/15525485281665": "3D-Katzendruck, Collage",  # 3D Digital-bedrucktes Sweatshirt
    "gid://shopify/Product/15468340314497": "Farb-Badge im Bild",  # Herren Rollkragen Strickpullover
    "gid://shopify/Product/15500915671425": "kurzarm, Sommerkleid-Optik",  # Elegantes Strickkleid mit Kontrastfarben
    "gid://shopify/Product/15473628086657": "Preis-/Farb-Overlay im Bild",  # Herren Strickweste mit Rautenmuster
    "gid://shopify/Product/15501678379393": "Bild zeigt Jeanskleid, keine Jacke",  # Langärmlige Rockjacke
    "gid://shopify/Product/15504291692929": "Collage mit Schriftzug",  # Lässige Baumwoll-Zip-Jacke
    "gid://shopify/Product/15448793678209": "Nahaufnahme Stoff, Ware nicht erkennbar",  # Lockere Jeansjacke Korea-Stil
    "gid://shopify/Product/15507724009857": "englisches Badge «Plush lining»",  # Herren-Snowboots mit Fleecefutter
    "gid://shopify/Product/15447885742465": "Sommer-Szene (weisses Kleid, Reisfeld)",  # Ethno Strick-Poncho
    "gid://shopify/Product/15447923622273": "grosser Bildtext «3PCS»",  # 3-teiliges Winterset
    "gid://shopify/Product/15523828629889": "Räucherspiralen-Halter, keine Kerze",  # Ceramik-Ätherkerzenhalter Lotus
    "gid://shopify/Product/15493871993217": "Sport-Trinkflasche statt Isolierkanne",  # Doppelwandige Isolierkanne 1.5L
    "gid://shopify/Product/15455766970753": "Sport-Trinkflasche",  # Edelstahl Reisebecher
    "gid://shopify/Product/15524854759809": "englische Werbetexte im Bild",  # Isolierbecher mit Keramik-Einsatz
    "gid://shopify/Product/15506308989313": "rosa Blüten-Sitzkissen, keine Herbstoptik",  # Ahornblatt Kissen
    # Runde 2 (19 Nachrücker angesehen, 8 aussortiert)
    "gid://shopify/Product/15493084184961": "Beauty-Gerät (Wimpernzange), kein Herbst",  # Beheizbare Wimpernzange, USB-aufladbar
    "gid://shopify/Product/15524893229441": "3D-Katzendruck",  # Damen Kapuzenpullover mit Zebra-Print
    "gid://shopify/Product/15449569427841": "grosser Schriftzug auf dem Cardigan",  # Damen-Cardigan mit Kapuze und Lantern-Arm
    "gid://shopify/Product/15468699484545": "englischer Werbetext im Bild",  # Vielseitiger Seamless Wollpullover aus Merinowolle
    "gid://shopify/Product/15448673550721": "Schaufensterpuppe",  # Damen-Steppjacke mit Rautenmuster
    "gid://shopify/Product/15447921066369": "Fuchsfell-Manschette (Pelz, Deklarationspflicht)",  # Warme Winterhandschuhe mit Fuchsfell-Manschette
    "gid://shopify/Product/15522098315649": "englischer Aufdruck «SELF STIRRING MUG»",  # Selbstrührende Kaffeetasse aus Edelstahl
    "gid://shopify/Product/15494602162561": "englische Mass-Infografik",  # Teekannen-Set aus hitzebeständigem Glas
    # Runde 3 (8 Nachrücker, 3 aussortiert + «French Press-On Nägel» per Regel)
    "gid://shopify/Product/15480831050113": "Netzgerät (Fussmassage-/Wärmegerät) ohne Stecker-Angabe",  # Fusswärmer – schnell & bequem
    "gid://shopify/Product/15501383631233": "Flanellhemd mit englischem Badge «Plush»",  # Männer Casual Langärmliger Stepp‑Cardigan
    "gid://shopify/Product/15454180868481": "englischer Bildtext-Balken",  # Tee-Set mit Tasse und Teetablett
    # Runde 4 (4 Nachrücker, 1 aussortiert + Chiffon-Cardigan per Regel)
    "gid://shopify/Product/15455518294401": "englische/chinesische Bildtexte",  # Tee-Tassenset mit 4 Tassen
    # Runde 5 (Pruefer-Kontaktbogen 23.09. 19:25 — 6 von 65 widersprachen Titel oder eigenen Ausschlussgruenden)
    "gid://shopify/Product/15490893414785": "Sport-Trinkflasche mit Fremdlogo «FJbottle»",  # Reisebecher für Sie
    "gid://shopify/Product/15508451131777": "Stoff-Nahaufnahme, Ware nicht erkennbar",  # Plüsch-Sofakissen
    "gid://shopify/Product/15454333239681": "bunter Halbschuh, kein Boot",  # Outdoor-Climbing-Boots
    "gid://shopify/Product/15524892475777": "Bild zeigt glänzende Bluse, keinen Pullover",  # Damen Pullover mit V-Ausschnitt
    "gid://shopify/Product/15449164874113": "Fischgrat-Sakko ohne Print",  # Freizeit-Jacke für Herren mit Print
    "gid://shopify/Product/15504226222465": "weisses Sommerhemd",  # Stehkragen Hemdjacke
}

# Die ersten acht Karten = die Startseitenreihe. Nach dem Kontaktbogen von Hand gewählt (23.09.2026):
# acht Themen, acht Bilder, die ohne Titel «Herbst» sagen (Kürbis-Kissen statt Handschuh-Freisteller).
VORNE = [
    "gid://shopify/Product/15460186947969",  # Damen Hoodie Bequem mit Taschen (rostrot, Wohnzimmer)
    "gid://shopify/Product/15449911689601",  # Verzierte Blockabsatz Damenstiefel (rote Stiefel)
    "gid://shopify/Product/15450214859137",  # Sojawachskerze mit Zitrus- und Holznoten (brennt, Fensterlicht)
    "gid://shopify/Product/15448593858945",  # Strickpullover Rundhals Loose-Fit (weiss, grob)
    "gid://shopify/Product/15450857210241",  # Nordische Fransen-Strickdecke
    "gid://shopify/Product/15448666407297",  # Eleganter Wollmantel mit Revers
    "gid://shopify/Product/15523936895361",  # Kissenbezug mit Kürbis-Stickerei
    "gid://shopify/Product/15493848433025",  # Handbemalte Bambus Teekanne mit zwei Tassen
]

MODE = ("hoodie", "strick", "jacke", "boots")
STOPP = {"herren", "damen", "fur", "für", "mit", "und", "der", "die", "das", "im", "in", "aus", "stil", "look",
         "fuer", "von", "zum", "zur", "den", "dem", "ein", "eine", "set", "neu", "neue", "lässig", "lassig",
         "elegant", "elegante", "eleganter", "elegantes", "retro", "vintage", "casual", "damenmode", "herrenmode"}


def thema_von(titel, ptype=""):
    """Thema eines Titels oder None (inkl. aller Ausschlüsse)."""
    if GLOBAL_RAUS.search(titel) or NICHT_STARTSEITE.search(titel) or WIRKVERSPRECHEN.search(titel) \
            or SCHMERZ.search(titel):
        return None
    if gs is not None and gs.ist_heikel(titel, ptype):
        return None
    if (ptype or "") in RAUS_TYP:
        return None
    for key, _, _, muster in THEMEN:
        if muster.search(titel):
            raus = THEMA_RAUS.get(key)
            if raus and raus.search(titel):
                return None
            if key == "deko" and not DEKO_ANKER.search(titel):
                return None
            return key
    return None


def netz_ok(titel, tags):
    if not NETZGERAET.search(titel):
        return True
    return bool(AKKU.search(titel)) or "stecker-eu-varianten" in (tags or [])


def tags_ok(tags):
    for t in tags or []:
        tl = t.lower()
        if tl in SPERR_TAGS or tl.startswith(SPERR_PRAEFIX):
            return False
    return True


def geschlecht(titel):
    t = titel.lower()
    if re.search(r"herren|m[äa]nner|men\b", t):
        return "h"
    if re.search(r"damen|frauen|women", t):
        return "d"
    return "n"


def kern(titel):
    w = [x for x in re.findall(r"[a-zäöüß]{3,}", titel.lower()) if x not in STOPP]
    return set(w)


def aehnlich(a, b):
    if not a or not b:
        return False
    return len(a & b) / max(1, min(len(a), len(b))) >= 0.67


# ── Netz ───────────────────────────────────────────────────────────────────────────────────
def gql(q, v=None):
    tok = open(TOKENDATEI).read().strip()
    drossel = 0
    for versuch in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60", API, "-H", "X-Shopify-Access-Token: " + tok,
                            "-H", "Content-Type: application/json", "--data-binary", "@-"],
                           input=json.dumps({"query": q, "variables": v or {}}), capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5)
            continue
        if d.get("errors") and any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in d["errors"]):
            drossel += 1
            time.sleep(min(20, 3 + drossel * 2))
            continue
        nachlauf(d)
        if d.get("data") is None:
            raise RuntimeError(f"Shopify-Fehler: {str(d.get('errors'))[:300]}")
        return d
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschöpft) — Lauf abgebrochen, nichts quittiert")


LIVE_FELDER = """id title status tags productType onlineStoreUrl tracksInventory totalInventory
  mediaCount{count} priceRangeV2{minVariantPrice{amount}}
  featuredMedia{... on MediaImage{image{url width height}}}
  g:publishedOnPublication(publicationId:"%s")""" % GOOGLE


def live(ids):
    aus = {}
    for i in range(0, len(ids), 50):
        d = gql("query($ids:[ID!]!){nodes(ids:$ids){... on Product{%s}}}" % LIVE_FELDER, {"ids": ids[i:i + 50]})
        for n in d["data"]["nodes"]:
            if n:
                aus[n["id"]] = n
    return aus


def live_grund(n):
    """Warum ein Produkt live NICHT in die Reihe darf — '' heisst: darf."""
    if not n:
        return "existiert nicht"
    if n["status"] != "ACTIVE":
        return f"nicht aktiv ({n['status']})"
    if not n.get("onlineStoreUrl"):
        return "nicht im Onlineshop"
    if not n.get("g"):
        return "nicht im Google-Kanal"
    if not tags_ok(n["tags"]):
        return "Sperr-Tag"
    if n["id"] in AUSGESCHLOSSEN:
        return "Bild aussortiert: " + AUSGESCHLOSSEN[n["id"]]
    if (n.get("mediaCount") or {}).get("count", 0) < 2:
        return "weniger als 2 Bilder"
    if float(n["priceRangeV2"]["minVariantPrice"]["amount"]) < MIN_PREIS:
        return "unter CHF 19"
    img = ((n.get("featuredMedia") or {}).get("image") or {})
    if min(img.get("width") or 0, img.get("height") or 0) < MIN_KANTE:
        return f"Hauptbild unter {MIN_KANTE} px"
    if n.get("tracksInventory") and (n.get("totalInventory") or 0) <= 0:
        return "Lager 0"
    if thema_von(n["title"], n.get("productType")) is None:
        return "Titel passt nicht mehr"
    if not netz_ok(n["title"], n["tags"]):
        return "Netzgerät ohne geprüften Stecker"
    return ""


def getaggte():
    cur, alle = None, []
    while True:
        d = gql('query($c:String){products(first:250,after:$c,query:"tag:%s"){pageInfo{hasNextPage endCursor}'
                ' nodes{id}}}' % TAG, {"c": cur})
        pg = d["data"]["products"]
        alle += [n["id"] for n in pg["nodes"]]
        if not pg["pageInfo"]["hasNextPage"]:
            return alle
        cur = pg["pageInfo"]["endCursor"]


def kanarienvogel():
    d = gql('{a:productsCount(query:"tag:zzz-kanarienvogel-herbst-xyz",limit:null){count}}')
    if d["data"]["a"]["count"] != 0:
        raise SystemExit("ABBRUCH: Tag-Filter wird ignoriert (Kanarienvogel > 0)")


# ── Auswahl ────────────────────────────────────────────────────────────────────────────────
def kandidaten():
    alter_h = (time.time() - os.path.getmtime(EXPORT)) / 3600
    print(f"Export {EXPORT}: {alter_h:.1f} h alt", flush=True)
    if alter_h > 72:
        raise SystemExit("ABBRUCH: Export älter als 72 h — erst frischen Export bauen")
    je = {k: [] for k, _, _, _ in THEMEN}
    for z in open(EXPORT):
        p = json.loads(z)
        if p.get("status") != "ACTIVE" or not p.get("g"):
            continue
        tags = p.get("tags") or []
        if TAG in tags or not tags_ok(tags):
            continue
        if (p.get("mediaCount") or {}).get("count", 0) < 2:
            continue
        preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
        if preis < MIN_PREIS:
            continue
        k = thema_von(p["title"], p.get("productType"))
        if not k or not netz_ok(p["title"], tags) or p["id"] in AUSGESCHLOSSEN:
            continue
        mc = (p.get("mediaCount") or {}).get("count", 0)
        punkte = (2 if "ch-lager" in tags else 0) + (1 if "eu-lager" in tags else 0) + min(mc, 8) / 2 \
            + (1 if "bild-ok" in tags else 0)
        je[k].append({"id": p["id"], "title": p["title"], "preis": preis, "bilder": mc, "punkte": punkte,
                      "g": geschlecht(p["title"]), "ch": "ch-lager" in tags})
    for k in je:   # beste zuerst, Gleichstand stabil über crc32 (hash() ist je Prozess zufällig)
        je[k].sort(key=lambda x: (-x["punkte"], zlib.crc32(x["id"].encode())))
    return je


def waehlen(je, schon_titel, schon_je_thema, platz):
    """Wählt je Thema bis zur Quote; Mode-Themen abwechselnd Damen/Herren; keine Beinahe-Doppel."""
    vorrat = {}
    for k, _, quote, _ in THEMEN:
        frei = max(0, quote - schon_je_thema.get(k, 0))
        if k in MODE:   # Vorrat JE Geschlecht — sonst füllen die punktbesten Herren-Boots den ganzen Vorrat
            vorrat[k] = [c for g in ("d", "h", "n") for c in [x for x in je[k] if x["g"] == g][: frei * 2 + 3]]
        else:
            vorrat[k] = je[k][: frei * 4 + 6]
    ids = [c["id"] for v in vorrat.values() for c in v]
    print(f"Live-Prüfung von {len(ids)} Vorrats-Kandidaten …", flush=True)
    lv = live(ids)
    gewaehlt, gruende = [], {}
    kerne = [kern(t) for t in schon_titel]
    for k, _, quote, _ in THEMEN:
        frei = quote - schon_je_thema.get(k, 0)
        if frei <= 0:
            continue
        mode = k in MODE
        eimer = {"d": [], "h": [], "n": []}
        for c in vorrat[k]:
            eimer[c["g"] if mode else "n"].append(c)
        reihe = []
        if mode:   # Reissverschluss d/h/n
            while any(eimer.values()):
                for g in ("d", "h", "n"):
                    if eimer[g]:
                        reihe.append(eimer[g].pop(0))
        else:
            reihe = eimer["n"]
        n = 0
        for c in reihe:
            if n >= frei or len(gewaehlt) >= platz:
                break
            grund = live_grund(lv.get(c["id"]))
            if grund:
                gruende[grund] = gruende.get(grund, 0) + 1
                continue
            kk = kern(c["title"])
            if any(aehnlich(kk, x) for x in kerne):
                gruende["beinahe doppelt"] = gruende.get("beinahe doppelt", 0) + 1
                continue
            node = lv[c["id"]]
            c = dict(c, thema=k, bild=((node.get("featuredMedia") or {}).get("image") or {}).get("url"),
                     url=node.get("onlineStoreUrl"))
            gewaehlt.append(c)
            kerne.append(kk)
            n += 1
    return gewaehlt, gruende


# ── Schreiben ──────────────────────────────────────────────────────────────────────────────
def kollektion_sichern():
    d = gql('query($h:String!){collectionByHandle(handle:$h){id title sortOrder descriptionHtml seo{title description}'
            ' ruleSet{rules{column relation condition}} resourcePublicationsCount{count}}}', {"h": HANDLE})
    c = d["data"]["collectionByHandle"]
    if DRY:
        print(f"(DRY) Kollektion {'vorhanden' if c else 'würde angelegt'}: {HANDLE}", flush=True)
        return c and c["id"]
    if not c:
        r = gql('mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id} userErrors{field message}}}',
                {"i": {"title": TITEL, "handle": HANDLE, "descriptionHtml": BESCHREIBUNG, "sortOrder": "MANUAL",
                       "seo": {"title": SEO_TITEL, "description": SEO_TEXT},
                       "ruleSet": {"appliedDisjunctively": False,
                                   "rules": [{"column": "TAG", "relation": "EQUALS", "condition": TAG}]}}})
        e = r["data"]["collectionCreate"]["userErrors"]
        if e:
            raise SystemExit(f"Kollektion anlegen: {e}")
        cid = r["data"]["collectionCreate"]["collection"]["id"]
        print(f"Kollektion angelegt: {cid}", flush=True)
    else:
        cid = c["id"]
        upd = {}
        if c["title"] != TITEL:
            upd["title"] = TITEL
        if (c.get("seo") or {}).get("title") != SEO_TITEL or (c.get("seo") or {}).get("description") != SEO_TEXT:
            upd["seo"] = {"title": SEO_TITEL, "description": SEO_TEXT}
        if c["sortOrder"] != "MANUAL":
            upd["sortOrder"] = "MANUAL"
        if upd:
            r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}',
                    {"i": dict(upd, id=cid)})
            print(f"Kollektion aktualisiert: {sorted(upd)} {r['data']['collectionUpdate']['userErrors']}", flush=True)
    # ⚠️ Per API angelegte Kollektionen sind NICHT automatisch im Onlineshop sichtbar (Menü-404 vom 12.06.)
    for pub in KANAELE:
        gid = f"gid://shopify/Publication/{pub}"
        d = gql('query($id:ID!,$p:ID!){collection(id:$id){p:publishedOnPublication(publicationId:$p)}}',
                {"id": cid, "p": gid})
        if not d["data"]["collection"]["p"]:
            r = gql('mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{message}}}',
                    {"id": cid, "i": [{"publicationId": gid}]})
            print(f"  publiziert in {pub}: {r['data']['publishablePublish']['userErrors'] or 'ok'}", flush=True)
    return cid


def ordnen(cid, themen_von_id, rang=None):
    """Themen-Reissverschluss: Karte 1–8 = acht verschiedene Themen; VORNE (angesehene Bilder) zuerst."""
    reihenfolge = ["hoodie", "boots", "kerze", "strick", "decke", "jacke", "schal", "tee", "waerme", "deko"]
    rang = rang or {}
    liste = [pid for pid in VORNE if pid in themen_von_id]
    toepfe = {k: [] for k in reihenfolge}
    for pid, k in themen_von_id.items():
        if pid not in liste:
            toepfe.setdefault(k or "deko", []).append(pid)
    for k in toepfe:   # innerhalb des Themas: Auswahl-Rang (Punkte), sonst stabil über crc32
        toepfe[k].sort(key=lambda x: (rang.get(x, 10 ** 6), zlib.crc32(x.encode())))
    while any(toepfe.values()):
        for k in reihenfolge:
            if toepfe.get(k):
                liste.append(toepfe[k].pop(0))
    if DRY or not cid:
        return liste
    moves = [{"id": pid, "newPosition": str(i)} for i, pid in enumerate(liste)]
    r = gql('mutation($id:ID!,$m:[MoveInput!]!){collectionReorderProducts(id:$id,moves:$m){job{id} userErrors{message}}}',
            {"id": cid, "m": moves})
    res = r["data"]["collectionReorderProducts"]
    job = (res.get("job") or {}).get("id")
    for _ in range(30):   # Job abwarten, sonst liest das Rücklesen den alten Stand
        if not job:
            break
        if gql('query($id:ID!){job(id:$id){done}}', {"id": job})["data"]["job"]["done"]:
            break
        time.sleep(2)
    d = gql('query($id:ID!){collection(id:$id){products(first:8){nodes{id}}}}', {"id": cid})
    ist = [n["id"] for n in d["data"]["collection"]["products"]["nodes"]]
    print(f"Reihenfolge gesetzt ({len(liste)}): {res['userErrors'] or 'ok'} · erste 8 wie geplant: {ist == liste[:8]}",
          flush=True)
    return liste


def rang_holen(cid, neu):
    """Reihenfolge innerhalb der Themen: bestehende Karten behalten ihren Platz (aktuelle Kollektions-
    Reihenfolge), Neue kommen nach Auswahl-Rang dahinter. ORDNEN_AUS_AUSWAHL=1 nimmt die gespeicherte
    Auswahl (/tmp/herbst_auswahl.json) als Rang — für die Reparatur eines verunglückten Ordnens."""
    rang = {}
    if os.environ.get("ORDNEN_AUS_AUSWAHL") == "1" and os.path.exists(AUSWAHL):
        rang = {c["id"]: i for i, c in enumerate(json.load(open(AUSWAHL)))}
    elif cid:
        cur, i = None, 0
        while True:
            d = gql('query($id:ID!,$c:String){collection(id:$id){products(first:250,after:$c)'
                    '{pageInfo{hasNextPage endCursor} nodes{id}}}}', {"id": cid, "c": cur})
            pg = d["data"]["collection"]["products"]
            for n in pg["nodes"]:
                rang[n["id"]] = i
                i += 1
            if not pg["pageInfo"]["hasNextPage"]:
                break
            cur = pg["pageInfo"]["endCursor"]
    basis = len(rang) + 1
    for j, c in enumerate(neu):
        rang.setdefault(c["id"], basis + j)
    return rang


def tag_setzen(pid, add=True):
    m = "tagsAdd" if add else "tagsRemove"
    r = gql('mutation($id:ID!,$t:[String!]!){%s(id:$id,tags:$t){userErrors{message}}}' % m, {"id": pid, "t": [TAG]})
    return not r["data"][m]["userErrors"]


def kontaktbogen():
    from PIL import Image, ImageDraw
    a = json.load(open(AUSWAHL))
    if os.environ.get("KONTAKT_NEU"):   # nur, was im vorigen Bogen noch nicht zu sehen war
        alt = {c["id"] for c in json.load(open(os.environ["KONTAKT_NEU"]))}
        a = [c for c in a if c["id"] not in alt]
    os.makedirs("/tmp/herbst_bilder", exist_ok=True)
    S, SP = 300, 6
    for teil in range(0, len(a), 36):
        stueck = a[teil:teil + 36]
        zeilen = (len(stueck) + SP - 1) // SP
        bl = Image.new("RGB", (SP * S, zeilen * (S + 34)), "white")
        zd = ImageDraw.Draw(bl)
        for i, c in enumerate(stueck):
            f = f"/tmp/herbst_bilder/{zlib.crc32(c['id'].encode())}.jpg"
            if not os.path.exists(f) and c.get("bild"):
                subprocess.run(["curl", "-s", "--max-time", "40", "-o", f, c["bild"].split("?")[0] + "?width=400"])
            x, y = (i % SP) * S, (i // SP) * (S + 34)
            try:
                bl.paste(Image.open(f).convert("RGB").resize((S, S)), (x, y))
            except Exception:
                zd.text((x + 8, y + 8), "KEIN BILD", fill="red")
            zd.text((x + 4, y + S + 4), f"{teil + i + 1}. [{c['thema']}] CHF {c['preis']:.0f}", fill="black")
            zd.text((x + 4, y + S + 18), c["title"][:44], fill="black")
        pfad = f"/tmp/herbst_kontakt_{teil // 36 + 1}.png"
        bl.save(pfad)
        print(f"Kontaktbogen: {pfad} ({len(stueck)} Bilder)", flush=True)


def selbsttest():
    faelle = [
        ("High-Waist Rock mit schmeichelhaftem Schnitt", None),
        ("Sprechende Kürbis-Süssigkeitenschale", None),
        ("Warme Lederhandschuhe mit Fleecefutter", "schal"),
        ("Midikleid mit Laternenärmeln und Reissverschluss", None),
        ("Kerzenform Lampenständer", None),
        ("Runder Aschenbecher aus Keramik", None),
        ("Elegantes ärmelloses Plaid-Kleid", None),
        ("Weisses Strickkleid für den Strandurlaub", None),
        ("Flauschiger Bademantel für Damen", None),
        ("Damen Flanell-Kapuzenpullover für Herbst und Winter", "hoodie"),
        ("Herren Übergangsjacke mit Reissverschluss", "jacke"),
        ("Ankle Boots mit Metallschnalle", "boots"),
        ("Robuste Sicherheitsstiefel mit Stahlkappe", None),
        ("Strick-Cardigan im französischen Stil", "strick"),
        ("Doppelseitige Flanelldecke", "decke"),
        ("Kuscheldecke aus Baumwollsamt", "decke"),
        ("Seidenschal mit Geometrie-Muster", "schal"),
        ("Geruchsneutrale Teelichter, 4 Std. Brenndauer, 100 Stk.", "kerze"),
        ("Doppelwandige Isolierkanne 1.5L", "tee"),
        ("Verstellbares Katzenhalsband mit Halstuch", None),
        ("Kinder Winter-Snowboots wasserdicht mit Wolle", None),
        ("Kissenbezug mit Kürbis-Stickerei", "deko"),
        ("Herbst/Winter Leopard-Print Maxikleid", None),
        ("Beheizbare Hausschuhe mit Temperaturregelung", "waerme"),
        ("Schalter für Wandlampe", None),
        ("Heizkissen gegen Regelschmerzen", None),
        ("Kerzen-Giessform aus Acryl", None),
        ("Seidenkleid mit Sonnenschutz-Schal, 2-teiliges Set", None),
        ("Retro Britische Beanie Schuhe für Herren", None),
        ("Massage-Schal für Nacken, Schultern & Rücken", None),
        ("Mandelförmige French Press-On Nägel", None),
    ]
    fehler = 0
    for titel, soll in faelle:
        ist = thema_von(titel)
        ok = ist == soll
        fehler += not ok
        print(("  ✔ " if ok else "  ✘ ") + f"{titel[:55]:<55} → {ist} (soll {soll})")
    ok = not netz_ok("Beheizbare Hausschuhe mit Temperaturregelung", []) and netz_ok("USB-Handwärmer", [])
    fehler += not ok
    print(("  ✔ " if ok else "  ✘ ") + "Netzgerät ohne USB/Akku fällt raus, USB-Gerät bleibt")
    ok = not tags_ok(["preis-pruefen-cj-spanne"]) and not tags_ok(["18plus"]) and tags_ok(["bild-ok", "ch-lager"])
    fehler += not ok
    print(("  ✔ " if ok else "  ✘ ") + "Sperr-Tags (Präfix + Liste) greifen, harmlose Tags nicht")
    print("SELBSTTEST BESTANDEN" if not fehler else f"SELBSTTEST FEHLGESCHLAGEN ({fehler})")
    return fehler


def main():
    if os.environ.get("SELBSTTEST") == "1":
        sys.exit(selbsttest())
    if os.environ.get("KONTAKT") == "1":
        kontaktbogen()
        return
    kanarienvogel()
    vorhanden = getaggte()
    print(f"Live getaggt «{TAG}»: {len(vorhanden)}", flush=True)
    # 1. Saisonende: alles abräumen
    if HEUTE > SAISON_ENDE:
        print(f"Saison vorbei ({SAISON_ENDE}) — Tag wird überall entfernt", flush=True)
        if not DRY:
            n = sum(tag_setzen(pid, add=False) for pid in vorhanden)
            print(f"FERTIG: {n} Tags entfernt", flush=True)
        return
    # 2. Unpassendes abräumen
    lv = live(vorhanden) if vorhanden else {}
    bleiben, themen = [], {}
    for pid in vorhanden:
        grund = live_grund(lv.get(pid))
        if grund:
            print(f"  raus ({grund}): {(lv.get(pid) or {}).get('title', pid)[:60]}", flush=True)
            if not DRY:
                tag_setzen(pid, add=False)
        else:
            bleiben.append(pid)
            themen[pid] = thema_von(lv[pid]["title"], lv[pid].get("productType"))
    if os.environ.get("NUR_RAEUMEN") == "1":
        print(f"NUR_RAEUMEN: {len(bleiben)} bleiben", flush=True)
        return
    # 3. Auffüllen bis ZIEL_MAX (Quote je Thema)
    je_thema = {}
    for k in themen.values():
        je_thema[k] = je_thema.get(k, 0) + 1
    platz = ZIEL_MAX - len(bleiben)
    neu, gruende = ([], {})
    if platz > 0:
        neu, gruende = waehlen(kandidaten(), [lv[p]["title"] for p in bleiben], je_thema, platz)
    print(f"\nNeu gewählt: {len(neu)} · Live-Absagen: {gruende}", flush=True)
    for k, name, quote, _ in THEMEN:
        liste = [c for c in neu if c["thema"] == k]
        print(f"  {name} ({len(liste)}/{quote - je_thema.get(k, 0)})", flush=True)
        for c in liste:
            print(f"     CHF {c['preis']:>7.2f} {c['bilder']:>2} B {'CH ' if c['ch'] else '   '}{c['title'][:70]}", flush=True)
    gesamt = len(bleiben) + len(neu)
    if gesamt < ZIEL_MIN:
        print(f"⚠️ nur {gesamt} — unter dem Ziel {ZIEL_MIN}", flush=True)
    if neu:   # ein Lauf ohne Neuaufnahme überschreibt die letzte Auswahl nicht (sie ist Reihenfolge-Quelle)
        json.dump(neu, open(AUSWAHL, "w"), ensure_ascii=False, indent=1)
    if DRY:
        kollektion_sichern()
        reihe = ordnen(None, dict(themen, **{c["id"]: c["thema"] for c in neu}), {c["id"]: i for i, c in enumerate(neu)})
        titel = {c["id"]: c["title"] for c in neu}
        titel.update({p: lv[p]["title"] for p in bleiben})
        print("Startseite (erste 8 Karten):", flush=True)
        for pid in reihe[:8]:
            print("   ", titel.get(pid, pid)[:70], flush=True)
        print(f"DRY: nichts geschrieben · Auswahl in {AUSWAHL} · KONTAKT=1 für den Kontaktbogen", flush=True)
        return
    # 4. Schreiben
    n = 0
    for c in neu:
        if tag_setzen(c["id"]):
            n += 1
            themen[c["id"]] = c["thema"]
        time.sleep(0.2)
    print(f"Getaggt: {n} von {len(neu)}", flush=True)
    cid = kollektion_sichern()
    # ⚠️ 23.09.2026: Erster Lauf ordnete nach 3 s — die Smart-Regel hatte die 65 frischen Tags da noch nicht
    # übernommen, collectionReorderProducts meldete «ok» und die Reihe stand nach Produkt-ID sortiert
    # (Handschuhe vorn). Jetzt: warten, bis die Kollektion alle zählt, und den Job abwarten.
    for _ in range(30):
        d = gql('query($h:String!){c:collectionByHandle(handle:$h){productsCount{count}}}', {"h": HANDLE})
        if d["data"]["c"]["productsCount"]["count"] >= len(themen):
            break
        time.sleep(4)
    ordnen(cid, themen, rang_holen(cid, neu))
    # 5. Rücklesen
    d = gql('query($h:String!){c:collectionByHandle(handle:$h){id title seo{title description}'
            ' productsCount{count} resourcePublicationsCount{count} products(first:8){nodes{title}}}'
            ' a:productsCount(query:"tag:%s status:active",limit:null){count}}' % TAG, {"h": HANDLE})
    c = d["data"]["c"]
    print(f"RÜCKGELESEN: {d['data']['a']['count']} aktiv getaggt · Kollektion {c['productsCount']['count']} Produkte "
          f"· {c['resourcePublicationsCount']['count']} Kanäle · SEO {len(c['seo']['title'])}/{len(c['seo']['description'])} Zeichen",
          flush=True)
    for p in c["products"]["nodes"]:
        print("   ", p["title"][:70], flush=True)
    print(bilanz(), flush=True)
    print(f"FERTIG {HEUTE}: {gesamt} in der Herbst-Reihe", flush=True)


if __name__ == "__main__":
    main()
