#!/usr/bin/env python3
"""haar_fein.py — Googles Sammelkorb «Personal Care > Hair Care» per Titelwort auflösen, Google UND Shopify (07.10.2026).

ANLASS (Betreiber «das muss perfekt sein» → «super mache mehr»). GEMESSEN 07.10. (Bulk-Export 51'496 aktive): 969 Produkte
tragen bei Google «Hair Care», davon 957 GENAU diesen groben Wert. Shopify führt 891 davon als «Cosmetic Tools». Der Korb
enthält Haargeräte (Glätteisen, Föhn, Bürsten), aber auch Fremdes: Gesichtsdampfer, Porenreiniger, Folienrasierer,
Epilierer, Mundduschen, Luftreiniger, Massagegeräte. Für Google sucht eine Kundin «Glätteisen», nicht «Haarpflege».

REGEL (wie kosmetik_fein.py, dessen Lauf benutzt wird): Ziel NUR aus eindeutigem Titelwort, geordnet (Fremdes vor Haar,
Gerät vor Zubehör); kein Treffer = bleibt. Zweigwechsel (z. B. Rasierer → Shaving & Grooming) sind hier erlaubt, weil der
Ausgangswert ein Sammelkorb ist — jeder Zielpfad wird gegen die Google-Taxonomie geprüft, Kanarienvögel müssen alle stimmen.
Ledger dropship/_haar_fein.tsv. Täglich im Aufseher.

  python3 automation/haar_fein.py            # Trockenlauf     ·  ZEIGEN=20 für Stichproben
  SCHARF=1 python3 automation/haar_fein.py   ·  python3 automation/haar_fein.py --kanarien
"""
import os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import kosmetik_fein as kos  # noqa: E402

LEDGER = os.path.join(REPO, "dropship", "_haar_fein.tsv")
PC = "Health & Beauty > Personal Care"
HC = PC + " > Hair Care"
ST = HC + " > Hair Styling Tools"
SK = PC + " > Cosmetics > Cosmetic Tools > Skin Care Tools"
HA = "Apparel & Accessories > Clothing Accessories > Hair Accessories"
R = lambda s: re.compile(s, re.I)

REGELN = [
    # Fremdes im Korb
    (R(r"aroma[\s-]?diffuser"), "Home & Garden > Decor > Home Fragrance Accessories"),
    (R(r"zahnspülkopf"), PC + " > Oral Care > Dental Water Jet Replacement Tips"),
    (R(r"munddusche|water ?flosser|h2ofloss|zahnreinig"), PC + " > Oral Care > Dental Water Jets"),
    (R(r"zahnbürste|weissheitsfunktion"), PC + " > Oral Care > Toothbrushes"),
    (R(r"(gesichts|facial)[\w\s-]*(bürste|wäscher|cleaner)|bürste für das gesicht|schalldusche fürs gesicht"), SK + " > Skin Cleansing Brushes & Systems"),
    (R(r"pore ?cleaner|poren-?sauger"), SK + " > Skin Care Extractors"),
    (R(r"zahnaufhell|bleaching-?streifen|teeth whiten"), PC + " > Oral Care > Teeth Whiteners"),
    (R(r"ohrenschmalz|ohrreinig|ear ?wax"), PC + " > Ear Care > Ear Wax Removal Kits"),
    (R(r"manschettenknöpfe"), "Apparel & Accessories > Clothing Accessories > Cufflinks"),
    (R(r"wimpernkräusler|wimpernzange"), PC + " > Cosmetics > Cosmetic Tools > Makeup Tools > Eyelash Curlers"),
    (R(r"wimpernkleber-?entferner"), PC + " > Cosmetics > Cosmetic Tools > Makeup Tools > False Eyelash Accessories > False Eyelash Remover"),
    (R(r"^(?!.*sticker).*spiegel"), PC + " > Cosmetics > Cosmetic Tools > Makeup Tools > Face Mirrors"),
    (R(r"epilier|epilator"), PC + " > Shaving & Grooming > Hair Removal > Epilators"),
    (R(r"haarentfernung"), PC + " > Shaving & Grooming > Hair Removal"),
    (R(r"folienrasierer|elektrorasierer|rasierer|\bshaver\b|rasiergerät"), PC + " > Shaving & Grooming > Electric Razors"),
    (R(r"haarschneide|haar- und bartschneider|bartschneider|haarschneider|\bclipper|trimmer|konturenschneider"),
     PC + " > Shaving & Grooming > Hair Clippers & Trimmers"),
    (R(r"luftreiniger|air purifier"), "Home & Garden > Household Appliances > Climate Control Appliances > Air Purifiers"),
    (R(r"luftbefeucht|luftfeuchtiger|humidifi|befeuchter|feuchtegeber|nebelkanone|raumfeuchtigkeit|feuchtigkeitsregler|"
       r"befeuchtungslampe|mit befeuchtung|feuchtigkeitsspender für fahrzeuge"), "Home & Garden > Household Appliances > Climate Control Appliances > Humidifiers"),
    (R(r"\bfan\b|ventilator"), "Home & Garden > Household Appliances > Climate Control Appliances > Fans"),
    (R(r"gesichtsdampfer|gesichts-?dampfer|gesichtsbedampfer|nanodampfer|nano-?dampfer|dampfgerät|gesichtssauna|facial steamer"), SK + " > Facial Saunas"),
    (R(r"mitesser|porenreiniger|komedonen|pimple"), SK + " > Skin Care Extractors"),
    (R(r"gesichtsreinig|gesichtreinig|gesichtswasch|hautreiniger|reinigungsgerät|gesichtsreiniger"), SK + " > Skin Cleansing Brushes & Systems"),
    (R(r"derma[\s-]?roller|microneedling"), SK + " > Skin Care Rollers"),
    (R(r"^(?!.*(haar|kopfhaut|kamm|bürste)).*(massage|massager|massierer)"), PC + " > Massage & Relaxation > Massagers"),
    (R(r"^(?!.*(haar|kopfhaut|lock|glätt|kamm|bürste|styler|well|diffuser|aroma))(.*(gesichtsspatel|hautpflege-?gerät|hautpflege-?stick|gesichtssprüher|nano-?mist|sauerstoff|oxygen|"
       r"hochfrequenz|vakuumgerät|hautverjüng|lifting|photon|augenpflegegerät|gesichts-?spray|gesichtssprayer|nano[\s-]?(spray|sprayer|mist|hydrating)|"
       r"zerstäuber|atomi[sz]|feuchtigkeitsspray-?gerät|gesichtsbefeuchter|nebel-?sprüher|\bled\b|infrarot|lichttherapie|ultraschall|mikrostrom|"
       r"v-face|schönheits|beauty-?(gerät|maske|instrument)|hautschaufel|gesichtsmasken-?gerät|gesichtsgerät|körperpflegegerät|kompressen beauty))"), SK),
    # Haarschmuck
    (R(r"^(?!.*spray).*(perücke|\bwig\b)"), HA + " > Wigs"),
    (R(r"haarteil|extension|clip-?in"), HA + " > Hair Extensions"),
    (R(r"haarband|stirnband|headband"), HA + " > Headbands"),
    (R(r"haarspange|haarklammer|haarklemme|haarclip|klaue|claw"), HA + " > Hair Pins, Claws & Clips"),
    (R(r"haargummi|zopfgummi|scrunchie"), HA + " > Ponytail Holders"),
    # Haargeräte — Glätten UND Locken in einem Gerät = Styling-Gerät allgemein
    (R(r"^(?=.*gl[äa]tt)(?=.*(lock|well))|kombe\b|kommbi"), ST),
    (R(r"^(?!.*(föhn|haartrockner|lockenstab|curl)).*(glätteisen|haarglätter|glättbürste|glätt-?bürste|glättkamm|glätt-?kamm|"
       r"straightener|glättend|glätter|glätte|glättungs|heizkamm|glattstahler|haarglättung|strähner|heizplatte)"), ST + " > Hair Straighteners"),
    (R(r"lockenstab|curling ?(iron|wand)|lockeneisen|wellen-?eisen|wellenstab|auto(matischer)?[\s-]?lock|kreppeisen|kurzlock|kurl|"
       r"lockenstange|locken-?(iron|stift|stick|styler|maschine|gerät)|wellenroller|waver|heizstab|kurzwelle|dauerwelle|kurlock|lockenstab|"
       r"kräusler|krauser|haarwelle|welle-?perfektor|wellenformer|lockendreher|lockenroller|curling-?wand|welleisen|zwirbler|haarformer|"
       r"volumen-?heizclip|styling-?stab|lockenbürste"), ST + " > Curling Irons"),
    (R(r"lockenwickler|wickler|heizwickler|curler(?! iron)|lockenband|heatless|rolle für locken|haarrollen"), ST + " > Hair Curlers"),
    (R(r"^(?!.*(bürste|kamm|styler|airwrap|nagel)).*(haartrockner|föhn|\bfön\b|hair ?dryer|haar-?trockner|trockner)"), ST + " > Hair Dryers"),
    (R(r"(föhn|warmluft|heissluft|rund|volumen)[\w-]*bürste|airwrap|multi-?styler|haarstyling-?gerät|styling-?set|\d+-in-1.*(styler|haar)"),
     ST + " > Hair Styling Tool Sets"),
    (R(r"spliss|styler|warmluft|hot air|föhn-?kamm"), ST),
    (R(r"bürste|kamm\b|kämme|knotenlöser|entwirr|\bcomb\b|\bbrush\b"), ST + " > Combs & Brushes"),
    (R(r"haarschere|effilier|friseurschere|dünnschneider"), HC + " > Hair Shears"),
    # Haarprodukte
    (R(r"pflegeset|pflege-?kit|haarpflege-?set"), HC + " > Hair Care Kits"),
    (R(r"shampoo"), HC + " > Shampoo & Conditioner > Shampoo"),
    (R(r"spülung|conditioner"), HC + " > Shampoo & Conditioner > Conditioners"),
    (R(r"haarfarb|haarfärbe|tönung|färbemittel|hair ?dye|haarkreide"), HC + " > Hair Color"),
    (R(r"haarausfall|haarwuchs|haarwachstum|minoxidil"), HC + " > Hair Loss Treatments"),
    (R(r"haarspray|wachs|pomade|haargel|styling-?gel|haarpuder|haar-?stick|hair ?stick|perücken-?spray|haarfluid|haaröl|haarserum"),
     HC + " > Hair Styling Products"),
    (R(r"^(?!.*nacken).*(haube|heat ?cap)"), HC + " > Hair Steamers & Heat Caps"),
]
ZIELE = sorted({z for _, z in REGELN})


NICHT = R(r"spiegel-?sticker|katze|hund|haustier|tierhaar|socken|teppich|feng-?shui|ornament|aufbewahrungstasche|holzkiste")


def ziel(titel):
    t = titel or ""
    if NICHT.search(t):
        return None
    for rx, z in REGELN:
        if rx.search(t):
            return z
    z = kos.ziel(t)   # Rest: Kosmetik-Wortregeln (Sonnencreme, Lippenstift, Nagelknipser …)
    return f"{kos.K} > {z}" if z else None


KANARIEN = [
    ("Keramik-Haarglätter mit LCD & Ionen-Kontrolle", ST + " > Hair Straighteners"),
    ("Glättbürste mit Digitalanzeige", ST + " > Hair Straighteners"),
    ("Glättender Haarkamm", ST + " > Hair Straighteners"),
    ("Ionen-Haartrockner mit Diffusor, 2200W", ST + " > Hair Dryers"),
    ("4-teiliges professionelles Haarbürsten-Set", ST + " > Combs & Brushes"),
    ("2-in-1 Haarglätter & Lockenstab mit Ionen", ST),
    ("Kurzlocken-Iron für Kurzhaarfrisuren", ST + " > Curling Irons"),
    ("Multifunktionaler Haartrockner mit Lüfterkomponente", ST + " > Hair Dryers"),
    ("LED-Schminkspiegel, wiederaufladbar & tragbar", PC + " > Cosmetics > Cosmetic Tools > Makeup Tools > Face Mirrors"),
    ("Flexibler Spiegel-Sticker (wasserdicht)", None),
    ("Photon Haarentfernungsgerät", PC + " > Shaving & Grooming > Hair Removal"),
    ("Elektrischer Nasenhaartrimmer mit LED-Anzeige", PC + " > Shaving & Grooming > Hair Clippers & Trimmers"),
    ("Zahnaufhellungsstreifen", PC + " > Oral Care > Teeth Whiteners"),
    ("Anion Gesichts-Dampfer", SK + " > Facial Saunas"),
    ("Temporäres Haarfarbspray 30ml", HC + " > Hair Color"),
    ("Haarmaske & Batana-Öl Pflegeset", HC + " > Hair Care Kits"),
    ("Wasserfeste PU-Nackenhaube mit Lederriemen", None),
    ("Keramik-Rolle für Locken", ST + " > Hair Curlers"),
    ("6-in-1 Lockenstab & Glätteisen mit LED-Anzeige", ST),
    ("Infrarot Dampf Keramik Glätteisen", ST + " > Hair Straighteners"),
    ("USB Aroma Diffuser mit 7 LED Farben", "Home & Garden > Decor > Home Fragrance Accessories"),
    ("Elektrische Kinder-Zahnbürste mit 6 Bürstenköpfen", PC + " > Oral Care > Toothbrushes"),
    ("Reinigungsbürste für das Gesicht", SK + " > Skin Cleansing Brushes & Systems"),
    ("Doppelspitz-Bürste für Katzen & Hunde", None),
    ("Kabelloser Glättungskamm mit Ionen-Technologie", ST + " > Hair Straighteners"),
    ("Multifunktionaler Warmluftkamm", ST),
    ("Automatischer Haarkräusler", ST + " > Curling Irons"),
    ("Grossvolumiger Mutter-Kind-Feuchtegeber", "Home & Garden > Household Appliances > Climate Control Appliances > Humidifiers"),
    ("Grosse Turbinen-Mini-Fan", "Home & Garden > Household Appliances > Climate Control Appliances > Fans"),
    ("Feuchtigkeitsspendende leichte fettfreie Sonnencreme", PC + " > Cosmetics > Skin Care > Sunscreen"),
    ("Keratine Kamm mit Massagefunktion", ST + " > Combs & Brushes"),
    ("Anion Haarglättierer & Haarwelle", ST),
    ("Anion Föhn-Bürste für Glanz & Volumen", ST + " > Hair Styling Tool Sets"),
    ("Profi Haar- und Bartschneider für Herren", PC + " > Shaving & Grooming > Hair Clippers & Trimmers"),
    ("Elektrischer Folienrasierer für Männer", PC + " > Shaving & Grooming > Electric Razors"),
    ("Elektrischer Epilierer für den ganzen Körper", PC + " > Shaving & Grooming > Hair Removal > Epilators"),
    ("H2ofloss Munddusche mit 5 Modi", PC + " > Oral Care > Dental Water Jets"),
    ("Nano-Ionen Gesichtsbedampfer", SK + " > Facial Saunas"),
    ("Visual Pimple Pin Elektrischer Porenreiniger", SK + " > Skin Care Extractors"),
    ("Multifunktionales Silikon-Gesichtsreinigungsgerät", SK + " > Skin Cleansing Brushes & Systems"),
    ("Hals- und Gesichts-Massagegerät mit 3 Modi", PC + " > Massage & Relaxation > Massagers"),
    ("Sandelholz Massagekamm für Haar und Kopf", ST + " > Combs & Brushes"),
    ("Tisch-Luftreiniger gegen Gerüche und Rauch", "Home & Garden > Household Appliances > Climate Control Appliances > Air Purifiers"),
    ("Knotenlöser für Haare", ST + " > Combs & Brushes"),
    ("Invisibles Haarspray für Perücken", HC + " > Hair Styling Products"),
    ("Satin-Schlafhaube für alle Haartypen", HC + " > Hair Steamers & Heat Caps"),
    ("Haarband mit Kristallen und Perlen", HA + " > Headbands"),
    ("Glatte Haarspange", HA + " > Hair Pins, Claws & Clips"),
    ("Mikrofaser Haarhandtuch Turban 3er-Set", None),
    ("Anti-Schnarch-Gerät für ruhigen Schlaf", None),
    ("Elektrische Sprühpistole Air Compressor Kit", None),
]


def kanarien(gueltig=None):
    ok = 0
    for t, soll in KANARIEN:
        ist = ziel(t)
        gut = ist == soll and (ist is None or gueltig is None or ist in gueltig)
        ok += gut
        if not gut:
            print(f"  ✗ {t!r} → {ist} (soll {soll})")
    print(f"Kanarienvögel {ok}/{len(KANARIEN)}")
    return ok == len(KANARIEN)


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien(kos.google_taxonomie()) else 1)
    kos.lauf("HAAR-FEIN", HC, ziel, ZIELE, kanarien, LEDGER)
