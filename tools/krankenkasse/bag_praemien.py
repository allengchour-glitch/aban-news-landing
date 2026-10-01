#!/usr/bin/env python3
"""Baut die Prämiendaten aller Krankenkassen (Grundversicherung) aus den offenen Daten des BAG.

    python3 tools/krankenkasse/bag_praemien.py [CACHE-ORDNER]

Quellen (alle vom Bund, frei nutzbar, opendata.swiss «Krankenversicherungsprämien»):
  - Prämien_CH.csv        alle genehmigten Prämien aller Kassen, Kantone, Regionen, Modelle
  - Einzugsgebiete.csv    Tarife, die nur in einzelnen Gemeinden angeboten werden
  - Prämienregionen.xlsx  Gemeinde → Prämienregion (Anhang EDI-Verordnung)
Kassennamen: «Verzeichnis der zugelassenen Krankenversicherer» des BAG (Stand 1.10.2026).

Ausgabe: data/krankenkassen/<JAHR>/index.json + <KANTON>.json (eine Datei pro Kanton, damit
die Seite nur lädt, was gebraucht wird). Jede Prämienzeile: [Tarif-Index, [Prämie je Franchise]].
"""
import csv, json, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JAHR = 2027
STAND = "BAG, Prämien genehmigt, veröffentlicht 29.09.2026"
B = "https://opendata.bagnet.ch/?r=/download&path="
QUELLEN = {
    "praemien.csv": B + "L1ByYWVtaWVuL1Byw6RtaWVuX0NILmNzdg%3D%3D",
    "einzug.csv": B + "L1ByYWVtaWVuL0Vpbnp1Z3NnZWJpZXRlLmNzdg%3D%3D",
    "regionen.xlsx": "https://www.bag.admin.ch/dam/de/sd-web/Xm8w51dMKXLP/Pr%C3%A4mienregionen%20(g%C3%BCltig%20ab%201.1.2027).xlsx",
}
# BAG-Nummer → Name (Verzeichnis der zugelassenen Krankenversicherer, BAG, 1.10.2026; Kurzform)
KASSEN = {
    8: "CSS", 32: "Aquilana", 134: "Einsiedler Krankenkasse", 194: "Sumiswalder Krankenkasse",
    246: "Krankenkasse Steffisburg", 290: "CONCORDIA", 312: "Atupri", 343: "Avenir (Groupe Mutuel)",
    360: "Krankenkasse Luzerner Hinterland", 376: "KPT", 455: "ÖKK", 509: "Vivao Sympany",
    780: "Glarner Krankenversicherung", 820: "curaulta", 881: "EGK", 923: "SLKK", 941: "sodalis",
    966: "vita surselva", 1040: "Krankenkasse Visperterminen", 1113: "Vallée d’Entremont",
    1318: "Krankenkasse Wädenswil", 1322: "Krankenkasse Birchmeier", 1384: "SWICA", 1386: "Galenos",
    1401: "rhenusana", 1479: "Mutuel (Groupe Mutuel)", 1507: "AMB (Groupe Mutuel)",
    1509: "Sanitas", 1535: "Philos (Groupe Mutuel)", 1542: "Assura", 1555: "Visana", 1560: "Agrisano",
    1562: "Helsana", 1568: "sana24",
}
KANTONE = "AG AI AR BE BL BS FR GE GL GR JU LU NE NW OW SG SH SO SZ TG TI UR VD VS ZG ZH".split()
ALTER = {"AKA_03_ERW": ("E", "E1"), "AKA_02_JUG": ("J", "J1"), "AKA_01_KIN": ("K", "K1")}
FRANCHISEN = {"E": [300, 500, 1000, 1500, 2000, 2500], "J": [300, 500, 1000, 1500, 2000, 2500],
              "K": [0, 100, 200, 300, 400, 500, 600]}
TYPEN = {"BASE", "PRAXIS", "TEL_DIG", "FLEX", "PHARM"}


def holen(cache: Path):
    cache.mkdir(parents=True, exist_ok=True)
    for name, url in QUELLEN.items():
        p = cache / name
        if not p.exists() or p.stat().st_size < 1000:
            print("lade", name)
            urllib.request.urlretrieve(url, p)
    return cache


def regionen(cache: Path):
    import openpyxl
    ws = openpyxl.load_workbook(cache / "regionen.xlsx", read_only=True).worksheets[0]
    out = {}
    for r in ws.iter_rows(values_only=True):
        if r and r[0] in KANTONE and isinstance(r[1], int) and r[3] in (1, 2, 3):
            out.setdefault(r[0], []).append([r[1], str(r[2]).strip(), r[3]])
    for k in out:
        out[k].sort(key=lambda x: x[1].lower())
    return out


def bauen(cache: Path, ziel: Path):
    nur = {}
    for r in csv.DictReader(open(cache / "einzug.csv", encoding="utf-8-sig")):
        if r["Eingeschränkt"] == "Y" and r["Gemeinden-BFS"].strip():
            nur[(r["Versicherer"], r["Kanton"], r["Region"], r["Tarif"])] = sorted(
                int(x) for x in r["Gemeinden-BFS"].split(",") if x.strip())
    daten = {k: {"tarife": [], "ti": {}, "p": {}} for k in KANTONE}
    unbekannt, zeilen = set(), 0
    for r in csv.DictReader(open(cache / "praemien.csv", encoding="utf-8-sig")):
        k = r["Kanton"]
        if k not in daten or int(r["Geschäftsjahr"]) != JAHR:
            continue
        a, gruppe = ALTER[r["Altersklasse"]]
        if r["Altersuntergruppe"] != gruppe:      # Kinder: nur 1. Kind (ohne Geschwisterrabatt)
            continue
        if int(r["Versicherer"]) not in KASSEN:
            unbekannt.add(r["Versicherer"])
            continue
        assert r["Tariftyp"] in TYPEN, r["Tariftyp"]
        reg = int(r["Region"][-1])
        d = daten[k]
        tkey = (r["Versicherer"], r["Tarif"], reg)
        if tkey not in d["ti"]:
            d["ti"][tkey] = len(d["tarife"])
            d["tarife"].append([int(r["Versicherer"]), r["Tariftyp"], r["Tarifbezeichnung"].strip(),
                                nur.get((r["Versicherer"], k, r["Region"], r["Tarif"]))])
        fr = int(r["Franchise"].rsplit("_", 1)[1])
        i = FRANCHISEN[a].index(fr)
        u = 1 if r["Unfalleinschluss"] == "MIT_UNF" else 0
        zeile = d["p"].setdefault(f"{reg}{a}{u}", {}).setdefault(d["ti"][tkey], [None] * len(FRANCHISEN[a]))
        assert zeile[i] is None, ("doppelt", r)
        zeile[i] = round(float(r["Prämie"]), 2)
        zeilen += 1
    if unbekannt:
        sys.exit(f"Unbekannte Kassen-Nummern (Namensliste nachführen): {sorted(unbekannt)}")
    ziel.mkdir(parents=True, exist_ok=True)
    reg = regionen(cache)
    kantone = {}
    for k in KANTONE:
        d = daten[k]
        tarife = [t[:3] + ([t[3]] if t[3] else []) for t in d["tarife"]]
        p = {s: [[ti, v] for ti, v in sorted(z.items())] for s, z in sorted(d["p"].items())}
        (ziel / f"{k}.json").write_text(json.dumps({"kanton": k, "jahr": JAHR, "tarife": tarife, "p": p},
                                                   ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        kantone[k] = {"regionen": sorted({int(s[0]) for s in p}), "kassen": len({t[0] for t in tarife})}
    index = {"jahr": JAHR, "stand": STAND, "quelle": "opendata.swiss: Krankenversicherungsprämien (BAG)",
             "kassen": {str(n): name for n, name in sorted(KASSEN.items())},
             "franchisen": FRANCHISEN, "kantone": kantone, "gemeinden": reg}
    (ziel / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{zeilen} Prämien → {ziel.relative_to(ROOT)} ({len(KANTONE)} Kantone)")


if __name__ == "__main__":
    cache = holen(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/bag"))
    bauen(cache, ROOT / "data" / "krankenkassen" / str(JAHR))
