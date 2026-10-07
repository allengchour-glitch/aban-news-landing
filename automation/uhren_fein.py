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
       rf"armband mit schnellverschluss|für xiaomi|sportarmband im"), (ZU + " > Watch Bands", "aa-6-10-1")),
    (R(rf"(hülle|displayschutz|schutzfolie|ladekabel|ladegerät|ladestation|ladedock|gehäuse|bumper|halterung|ständer)[\w\s,/-]*\bfür\b[\w\s-]*{WORT}|"
       rf"smartwatch[\s-](schutzhülle|gehäuse|ladegerät)|uhrenschutzhülle|watch[\s-]schutzhülle|armband mit gehäuse"), (ZU, "aa-6-10")),
    (R(r"smartwatch|smart[\s-]?watch|smart-?uhr|smartes?\b|smart[\s-]?(sport-?)?armband|smart ?band|smart\s+sport|fitness-?(armband|tracker|uhr)|"
       r"sport-?armband mit|sportarmband mit|herzfrequenz|herzmess|pulsmess|blutdruck|pedometer|schrittzähler|bluetooth|"
       r"amoled|\bgps\b|anruf|smart pager|tracker"), (W, "aa-6-12")),
    (R(r"uhr\b|uhren|\bwatch|chronograph|quar[zt]|automatik|mechanisch|armbanduhr|taschenuhr|tourbillon"), (W, "aa-6-11")),
]
NICHT = R(r"mücken|insekten|uhrenbox|uhrenbeweger|aufbewahrung|ladestation mit uhr|wireless charging|uhrwerk\b|uhrmacher|uhrgürtel|lautsprecher|wecker")
ZIELE = sorted({z[0] for _, z in REGELN})


def ziel(titel):
    t = titel or ""
    if NICHT.search(t):
        return None
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


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien(kos.google_taxonomie()) else 1)
    kos.lauf("UHREN-FEIN", W, ziel, ZIELE, kanarien, LEDGER)
