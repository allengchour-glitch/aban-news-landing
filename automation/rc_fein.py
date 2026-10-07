#!/usr/bin/env python3
"""rc_fein.py — ferngesteuertes Spielzeug (Drohnen, Helikopter, RC-Autos …) bei Google UND Shopify fein (07.10.2026).

ANLASS (Betreiber «das muss perfekt sein» → «super mache mehr»). GEMESSEN 07.10. (Bulk-Export 51'496 aktive): 300 Produkte
tragen bei Google «Toys > Remote Control Toys» (grob), bei Shopify «Electronics» (Oberklasse, anderer Zweig) — Drohnen,
Helikopter, RC-Autos, Akkus, Flugcontroller. Shopify kennt «Toys > Flying Toys > Drones» (tg-5-12-2) und eigene Klassen für
Drohnen-Akkus/-Landeplätze; Google kennt keine Drohnen-Klasse (bleibt Remote Control Toys) — darum gibt die Regel für
Drohnen das Shopify-Ziel direkt mit.

REGEL: Geltungsbereich Google im Zweig «Remote Control Toys»; Ziel nur aus Titelwort (Zubehör vor Gerät, Helikopter vor
Drohne: «RC-Kampfjet-Heli»), kein Treffer = bleibt. Lauf/Prüfungen/Schreiben aus kosmetik_fein.lauf(). Ledger
dropship/_rc_fein.tsv, täglich im Aufseher.

  python3 automation/rc_fein.py   ·   SCHARF=1 python3 automation/rc_fein.py   ·   --kanarien
"""
import os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import kosmetik_fein as kos  # noqa: E402

LEDGER = os.path.join(REPO, "dropship", "_rc_fein.tsv")
T = "Toys & Games > Toys"
RC = T + " > Remote Control Toys"
ZUB = T + " > Remote Control Toy Accessories"
R = lambda s: re.compile(s, re.I)
DROHNE = r"drohne|drone|quadrocopter|quadcopter|\buav\b|\bfpv\b|fluggerät"

REGELN = [
    (R(rf"^(?!.*(akkulaufzeit|lange[rn]?\s+akku|mit\s+(\w+\s+)?kamera)).*({DROHNE}).*(akku|batterie|akkumulator|lithium)|"
       rf"^(?!.*(akkulaufzeit|lange[rn]?\s+akku|mit\s+(\w+\s+)?kamera)).*(akku|batterie|akkumulator|lithium).*({DROHNE})"), (ZUB, "el-7-15-1-13")),
    (R(rf"^(?=.*({DROHNE})).*(landeplatz|landing)"), (ZUB, "el-7-19")),
    (R(r"^(?!.*(akkulaufzeit|lange[rn]?\s+akku|\d+\s+kameras?|mit\s+\w*propeller)).*(akku|batterie|akkumulator|ladegerät|flugcontroller|propeller|ersatzteil|kühlkörper|getriebe|fernsteuerung für|"
       r"servo|empfänger|sender\b|landeplatz|rotorbl)"), ZUB),
    (R(r"heli\b|heli-|helikopter|hubschrauber|helicopter"), RC + " > Remote Control Helicopters"),
    (R(DROHNE), (RC, "tg-5-12-2")),
    (R(r"flugzeug|flieger|kampfjet|\bjet\b|gleiter|glider|\bplane\b"), RC + " > Remote Control Planes"),
    (R(r"ballon|blimp|luftschiff"), RC + " > Remote Control Airships & Blimps"),
    (R(r"boot\b|rennboot|schiff|u-boot|\bboat"), RC + " > Remote Control Boats & Watercraft"),
    (R(r"panzer|\btank\b"), RC + " > Remote Control Tanks"),
    (R(r"roboter|robot"), RC + " > Remote Control Robots"),
    (R(r"motorrad|motorbike"), RC + " > Remote Control Motorcycles"),
    (R(r"auto\b|-auto|rennauto|\bcar\b|cars\b|buggy|truck|lkw|bagger|muldenkipper|crawler|rennwagen|stunt|fahrzeug|monster|"
       r"offroad|traktor|drift|geländewagen|kipper|bulldozer"), RC + " > Remote Control Cars & Trucks"),
]
ZIELE = sorted({(z[0] if isinstance(z, tuple) else z) for _, z in REGELN})


def ziel(titel):
    for rx, z in REGELN:
        if rx.search(titel or ""):
            return z
    return None


KANARIEN = [
    ("Faltbare Drohne mit Hindernisvermeidung", (RC, "tg-5-12-2")),
    ("Faltbarer HD-Quadrocopter für Luftaufnahmen", (RC, "tg-5-12-2")),
    ("Lithium-Akkumulator für Quadrocopter", (ZUB, "el-7-15-1-13")),
    ("Drohnen-Akku-Ladegerät mit USB-Adapter", (ZUB, "el-7-15-1-13")),
    ("Universal Drohnen-Landeplatz", (ZUB, "el-7-19")),
    ("Flugcontroller F7 für Drohnen", ZUB),
    ("RC-Kampfjet-Heli mit Fernsteuerung", RC + " > Remote Control Helicopters"),
    ("Mini RC Flugzeug Helikopter für Mädchen", RC + " > Remote Control Helicopters"),
    ("RC-Flugzeug Glider Fighter Modell", RC + " > Remote Control Planes"),
    ("RC High-Speed Rennboot für Kinder", RC + " > Remote Control Boats & Watercraft"),
    ("Ferngesteuertes Rennauto für Kinder", RC + " > Remote Control Cars & Trucks"),
    ("DE 1.12 Rock Crawler RC Offroad-Truck 4WD", RC + " > Remote Control Cars & Trucks"),
    ("Intelligenter Roboterhund mit Fernbedienung", RC + " > Remote Control Robots"),
    ("Ferngesteuerter Hai – Fliegender RC Ballon", RC + " > Remote Control Airships & Blimps"),
    ("Motor-Kühlkörper und Getriebesitz für RC-Cars", ZUB),
    ("Quadrocopter mit Dual-Kamera und langer Akkulaufzeit", (RC, "tg-5-12-2")),
    ("Drohnenfernsteuerung mit 3 Kameras, langer Akku", (RC, "tg-5-12-2")),
    ("RC Helikopter mit Einzelpropeller", RC + " > Remote Control Helicopters"),
    ("RC Sensor Schlange mit Hinderniserkennung", None),
    ("3-in-1 Mini-Drohne für Land, Wasser & Luft", (RC, "tg-5-12-2")),
]


def kanarien(gueltig=None):
    ok = 0
    for t, soll in KANARIEN:
        ist = ziel(t)
        g = ist[0] if isinstance(ist, tuple) else ist
        gut = ist == soll and (g is None or gueltig is None or g in gueltig)
        ok += gut
        if not gut:
            print(f"  ✗ {t!r} → {ist} (soll {soll})")
    print(f"Kanarienvögel {ok}/{len(KANARIEN)}")
    return ok == len(KANARIEN)


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien(kos.google_taxonomie()) else 1)
    kos.lauf("RC-FEIN", RC, ziel, ZIELE, kanarien, LEDGER)
