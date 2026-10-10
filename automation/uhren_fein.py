#!/usr/bin/env python3
"""uhren_fein.py — Uhren, Smartwatches und Armbänder bei Google UND Shopify trennen (07.10.2026).

ANLASS (Betreiber «weiter … mach es alles perfekt, alles andere auch»). GEMESSEN 07.10. (Bulk-Export 51'5xx aktive):
2'876 Produkte tragen bei Google «Jewelry > Watches». Shopifys offizielle Zuordnung dieser Google-Klasse ist mehrdeutig
(Watches / Smart Watches) — darum stand keine fest, und kategorie_fein liess alle liegen: 1'861 Shopify «Watches»,
**1'001 nur «Electronics»** (Oberklasse), 7 «Bracelets». Darunter Smartwatches, Fitness-Armbänder und ERSATZ-ARMBÄNDER
für Apple Watch (= Zubehör, keine Uhr).

REGEL (Titelwort, geordnet; kein Treffer = bleibt): Ersatzarmband/Armband für … Watch → Watch Bands (Google + Shopify
aa-6-10-1); Hülle/Ladekabel/Gehäuse für Uhr → Watch Accessories (aa-6-10); Smartwatch/Fitness-Armband/Herzfrequenz/
Bluetooth … → Google Watches + Shopify Smart Watches (aa-6-12); Uhr/Chronograph/Quarz/Automatik → Watches (aa-6-11).
Nur-«Armband»-Titel ohne Uhrwort («Titanium-Armband») bleiben (könnte Schmuck sein). Lauf aus kosmetik_fein.lauf().

  python3 automation/uhren_fein.py   ·   SCHARF=1 python3 automation/uhren_fein.py   ·   --kanarien
"""
import os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import kosmetik_fein as kos  # noqa: E402

LEDGER = os.path.join(REPO, "dropship", "_uhren_fein.tsv")
J = "Apparel & Accessories > Jewelry"
W = J + " > Watches"
ZU = J + " > Watch Accessories"
R = lambda s: re.compile(s, re.I)
WORT = r"(watch|smartwatch|uhr\b|uhren)"
REGELN = [
    (R(rf"(ersatz-?armband|uhrenarmband|armbänder|armband|band|strap|kette|loop)[\w\s,-]*\bfür\b[\w\s-]*{WORT}|"
       rf"smartwatch-?armband|watch-?armband|watch ?band|armband-?kit|multi-?armband|iwatch|\b\d{{2}}\s?mm\b.*armband|"
       rf"armband mit schnellverschluss|für xiaomi|sportarmband im|"
       # 10.10.2026: Bandbreite nach dem Wort («Lederarmband 22mm», «Kunstharz-Armband 22 mm») — 12–26 mm sind Stegbreiten;
       # «Armbanduhr … 42 mm» trifft nicht (\b nach «armband»), Gehäuse-Durchmesser liegen darüber
       rf"armband\b[^,·]{{0,30}}?\b(1[2-9]|2[0-6])\s?mm\b"), (ZU + " > Watch Bands", "aa-6-10-1")),
    (R(rf"(hülle|displayschutz|schutzfolie|ladekabel|ladegerät|ladestation|ladedock|ladepad|ladeständer|charger|powerbank|gehäuse|bumper|halterung|ständer)[\w\s,/-]*\bfür\b[\w\s-]*{WORT}|"
       rf"smartwatch[\s-](schutzhülle|gehäuse|ladegerät|lade-?station|ladekabel|ladedock|charger|halterung|ständer)|uhrenschutzhülle|watch[\s-]schutzhülle|armband mit gehäuse"), (ZU, "aa-6-10")),
    (R(r"smartwatch|smart[\s-]?watch|smart-?uhr|smartes?\b|smart[\s-]?(sport-?)?armband|smart ?band|smart\s+sport|fitness-?(armband|tracker|uhr)|"
       r"sport-?armband mit|sportarmband mit|herzfrequenz|herzmess|pulsmess|blutdruck|pedometer|schrittzähler|bluetooth|"
       r"amoled|\bgps\b|anruf|smart pager|tracker"), (W, "aa-6-12")),
    (R(r"uhr\b|uhren|\bwatch|chronograph|quar[zt]|automatik|mechanisch|armbanduhr|taschenuhr|tourbillon"), (W, "aa-6-11")),
]
# 09.10.2026: «wireless charging» stand hier und blockierte «Smartwatch mit … Wireless Charging» (bleib Watches statt Smartwatch);
# Ladestationen fängt jetzt Regel 2 (Charger/Powerbank/Ladestation für Smartwatch) bzw. «ladestation mit uhr» / Mehrgeräte-Halter hier.
NICHT = R(r"mücken|insekten|uhrenbox|uhrenbeweger|aufbewahrung|ladestation mit uhr|für iphone, apple watch|uhrwerk\b|uhrmacher|uhrgürtel|lautsprecher|wecker")
ZIELE = sorted({z[0] for _, z in REGELN})


# 09.10.2026 (Verbesserungsrunde): «Uhrenarmband aus Edelstahl, dreireihig» stand bei Google als «Watches» — Regel 4 traf
# «uhren» IN «Uhrenarmband» (Kompositum-Falle, Regel 9b), Regel 1 nur «… für … Watch». Gemessen 28 von 43 Uhrenarmband-Titeln
# bei Google «Watches», darunter jeder neue CJ-Import mit diesem Kopfwort. Jetzt zuerst: Kopfwort Uhren-/Uhrarmband → Band;
# Steg/Federsteg/Perlen/Zubehör → Watch Accessories; Werkzeug → bleibt; «Herrenuhr mit Uhrenarmband» (Uhrwort ausserhalb
# des Kompositums) → weiter zu den Uhr-Regeln.
# 10.10.2026: CJ übersetzt 表带 (Uhrband) als «Armbanduhr-Gürtel/-Gurt/-Gurtschiene»; die Titelregel (haendlerwort_regel.json)
# macht daraus «Uhrenriemen» (männlich wie «Gürtel», Adjektive bleiben richtig). «Uhrgürtel» allein = 皮带表 = UHR mit
# Lederband (Bild geprüft) → bleibt in NICHT.
BAND = R(r"uhre?n?armb(and|änder)|uhre?n?riemen|armbanduhr-(gürtel|gurt)")
BAND_ZUBEHOER = R(r"federsteg|verbindungssteg|positionierungsperle|uhre?n?armband-?zubehör")
BAND_WERKZEUG = R(r"werkzeug|schraubenzieher|schraubendreher|zange|stiftaustreiber")
UHR_SONST = R(r"uhr\b|uhren\b|watch|chronograph|quar[zt]|automatik|mechanisch")   # «watch» ohne \b: auch Smartwatch


def ziel(titel):
    t = titel or ""
    if NICHT.search(t):
        return None
    if BAND.search(t) and not UHR_SONST.search(BAND.sub(" ", t)):
        if BAND_WERKZEUG.search(t):
            return None
        return (ZU, "aa-6-10") if BAND_ZUBEHOER.search(t) else (ZU + " > Watch Bands", "aa-6-10-1")
    for rx, z in REGELN:
        if rx.search(t):
            return z
    return None


KANARIEN = [
    ("Pinkycolor Silikonarmband für Apple Watch", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Harz-Metall-Denim-Ketten-Armband für Smartwatches", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Smartwatch-Armband aus Leder-Nylon", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Armband-Gehäuse 44/45mm für Smartwatches", (ZU, "aa-6-10")),
    ("Smartwatch Pro 1.78″ AMOLED – Herzfrequenz", (W, "aa-6-12")),
    ("S5 Fitness-Armband mit Temperaturmessung", (W, "aa-6-12")),
    ("Smart-Armband mit Farbdisplay", (W, "aa-6-12")),
    ("Smartwatch mit Herzfrequenzmessung · Damen, Armband-Design", (W, "aa-6-12")),
    ("Herren Automatikuhr mit Lederarmband", (W, "aa-6-11")),
    ("Quarz-Chronograph mit Lederarmband", (W, "aa-6-11")),
    ("Mechanische Armbanduhr mit Mondphase", (W, "aa-6-11")),
    ("Titanium-Armband", None),
    ("Holzgehäuse-Uhr mit braunem Zifferblatt", (W, "aa-6-11")),
    ("Herren-Vollhohes-Stahlgehäuse-Automatik-Uhr", (W, "aa-6-11")),
    ("3-in-1 Ladestation mit Uhr & Wireless Charging", None),
    ("Smartwatch mit Bluetooth-Anruf und NFC-Ladegerät", (W, "aa-6-12")),
    ("Kabelloses Smartwatch-Ladegerät", (ZU, "aa-6-10")),
    ("Deko-Halterung für Smartwatch mit Ladegerät", (ZU, "aa-6-10")),
    ("I6 Smart-Sportarmband", (W, "aa-6-12")),
    ("Smart Sport-Armband F21", (W, "aa-6-12")),
    ("Universa GT20/22mm Lederarmband", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Vintage-Lederarmband für Xiaomi-Armbänder", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Ultraschall Mückenarmband für Schwangerschaft & Baby", None),
    ("Business Herrenuhr, Lederarmband, Multifunktion", (W, "aa-6-11")),
    # 09.10.2026: Kopfwort Uhrenarmband (gemessen 28× «Watches»)
    ("Uhrenarmband aus Edelstahl, dreireihig", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Leder-Uhrenarmband im Vintage-Stil", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Silicone Uhrarmband 41-45 mm – Schwarz, Weiss", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Hymeide SKX007 Edelstahl-Uhrenarmband gebogen", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Love Bracelet Uhrenarmband mit Perlenkette", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Uhrenarmband aus Kautschuk mit Zubehör", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Transparentes Uhrenarmband für Apple Watch", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("T-Sport Uhrenarmband-Verbindungssteg", (ZU, "aa-6-10")),
    ("Gebogene Uhrenarmband-Federstege aus Edelstahl", (ZU, "aa-6-10")),
    ("Uhrenarmband-Positionierungsperlen aus Metall", (ZU, "aa-6-10")),
    ("Uhrenarmband Schraubenzieher", None),
    ("Uhrenarmband-Werkzeug zum Wechseln", None),
    ("Herrenuhr mit Uhrenarmband aus Leder", (W, "aa-6-11")),
    ("Quarzuhr mit Edelstahl-Uhrenarmband", (W, "aa-6-11")),
    ("Smartwatch mit Ersatz-Uhrenarmband", (W, "aa-6-12")),
    # 09.10.2026: Ladegeräte für Smartwatches = Zubehör; Smartwatch MIT Wireless Charging = Smartwatch
    ("Weisser Magnet-Charger für Smartwatches", (ZU, "aa-6-10")),
    ("Smartwatch-Ladestation", (ZU, "aa-6-10")),
    ("Kabellose Powerbank für Smartwatches", (ZU, "aa-6-10")),
    ("Smartwatch Exklusivmodell mit Wireless Charging", (W, "aa-6-12")),
    ("Smartwatch mit Bluetooth-Telefonie und Wireless Charging", (W, "aa-6-12")),
    ("Smartwatch mit Bluetooth-Anruf und NFC-Ladegerät", (W, "aa-6-12")),
    ("3-in-1 Magnethalterung für iPhone, Apple Watch & AirPods", None),
    # 10.10.2026: 表带 als «Gürtel» übersetzt, Lade-Station mit Bindestrich, Bandbreite nach dem Wort
    ("Silikon-Loop Magnetische Uhrenriemen", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Nylon-Farbenpassender Armbanduhr-Gürtel", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Vintage Leder Armbanduhr-Gurtschiene Retro", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Business-Uhrgürtel", None),
    ("Smartwatch-Lade-Station aus Silikon", (ZU, "aa-6-10")),
    ("Mosaik-Schachbrett-Kunstharz-Armband 22 mm", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Lederarmband 26mm", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Business Quartz Herrenarmbanduhr – Luminisch, wasserdicht, 42 mm", (W, "aa-6-11")),
    ("Damen-Armbanduhr 26 mm mit Lederband", (W, "aa-6-11")),
    ("Smartwatch 1,3 Zoll mit Armband, 45 mm", (W, "aa-6-12")),
]


def kanarien(gueltig=None):
    ok = 0
    for t, soll in KANARIEN:
        ist = ziel(t)
        gut = ist == soll and (ist is None or gueltig is None or ist[0] in gueltig)
        ok += gut
        if not gut:
            print(f"  ✗ {t!r} → {ist} (soll {soll})")
    print(f"Kanarienvögel {ok}/{len(KANARIEN)}")
    return ok == len(KANARIEN)


# 09.10.2026 (Betreiber «weiter»): Fitness-/Smart-Armbänder standen bei Google unter «Jewelry > Bracelets» — gemessen 26
# Produkte mit Typ «Elektronik» allein (C33 Smart-Armband, G69 Armband für Herzfrequenz, Pulsmesser, Pedometer). Der Lauf oben
# liest nur den Watches-Zweig und sah sie nie. Zweiter Durchgang über Bracelets mit EINGESCHRÄNKTER Regel: nur Smartwatch
# (aa-6-12), Uhrenarmband (aa-6-10-1) und Uhrenzubehör (aa-6-10) — NIE «Watches» aus Regel 4: dort trifft «quar[zt]» jedes
# Rosenquarz-Armband und «automatik» jede Automatik-Schliesse.
ARMBAND_ZWEIG = J + " > Bracelets"
ARMBAND_ERLAUBT = {"aa-6-12", "aa-6-10-1", "aa-6-10"}


# Regel 3 kennt «sportarmband mit» — im Watches-Zweig harmlos, im Bracelets-Zweig ein Spruchband («Sportarmband mit Botschaft»).
# Smartwatch-Ziel hier nur mit echtem Mess-/Smart-Wort.
SMART_MESS = R(r"smart|fitness|herzfrequenz|herzmess|puls|blutdruck|blutsauerstoff|spo2|schrittz|pedometer|bluetooth|\bgps\b|"
               r"display|tracker|schlaf|anruf|körperfett|sturzalarm")


UHR_BEZUG = R(r"watch|uhr|apple|samsung|galaxy|garmin|xiaomi|huawei|fitbit|amazfit|steg")


def ziel_armband(titel):
    z = ziel(titel)
    if not z or z[1] not in ARMBAND_ERLAUBT:
        return None
    # 10.10.2026: im Schmuck-Zweig zählt die Bandbreite allein nicht («Panzerkette Armband 12 mm» = Schmuck) — Uhrband nur mit Uhrbezug
    if z[1] == "aa-6-10-1" and not UHR_BEZUG.search(titel or ""):
        return None
    return z if z[1] != "aa-6-12" or SMART_MESS.search(titel or "") else None


ARMBAND_KANARIEN = [
    ("C33 Smart-Armband mit Körperfett-Messung", (W, "aa-6-12")),
    ("G69 Armband für Herzfrequenz & Blutsauerstoff", (W, "aa-6-12")),
    ("Smart-Armband M16 zur Schlafunterstützung", (W, "aa-6-12")),
    ("Pulsmesser Dual-Modus Armband für Sport", (W, "aa-6-12")),
    ("Fitness Smart Armband mit Schrittzähler und LED", (W, "aa-6-12")),
    ("Lederarmband für Apple Watch, Vintage", (ZU + " > Watch Bands", "aa-6-10-1")),
    ("Rosenquarz-Armband mit Edelsteinperlen", None),
    ("Edelstahl-Armband mit Automatik-Schliesse", None),
    ("Herren Lederarmband geflochten", None),
    ("Tigerauge Perlenarmband für Damen", None),
    ("Antistatik-Armband für Herren und Damen", None),
    ("Kupfer Magnetarmband für Damen", None),
    ("Verstellbares Sportarmband mit Botschaft", None),
    ("GPS SOS Armband mit Herzfrequenz- und Sturzalarm", (W, "aa-6-12")),
    ("Kubanische Panzerkette Armband 12 mm", None),
    ("Mini Matt Dragon Canvas Wasserfestes Herrenarmband 25 mm", None),
    ("Lederarmband 22 mm für Samsung Galaxy Watch", (ZU + " > Watch Bands", "aa-6-10-1")),
]


def armband_kanarien(gueltig=None):
    f = [(t, s, ziel_armband(t)) for t, s in ARMBAND_KANARIEN if ziel_armband(t) != s]
    for t, s, i in f:
        print(f"  ✗ {t!r} → {i} (soll {s})")
    print(f"Kanarienvögel Armband-Zweig {len(ARMBAND_KANARIEN) - len(f)}/{len(ARMBAND_KANARIEN)}")
    return not f and kanarien(gueltig)


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        g = kos.google_taxonomie()
        sys.exit(0 if kanarien(g) and armband_kanarien(g) else 1)
    if "--nur-armband" not in sys.argv:
        kos.lauf("UHREN-FEIN", W, ziel, ZIELE, kanarien, LEDGER)
    kos.lauf("UHREN-FEIN-ARMBAND", ARMBAND_ZWEIG, ziel_armband, ZIELE, armband_kanarien, LEDGER)
