#!/usr/bin/env python3
"""Fetch echte Heizungs-/Solar-Fachbetriebe aus OpenStreetMap (Overpass API).

Quelle: OpenStreetMap, Lizenz ODbL — Attribution Pflicht (im Generator-Footer gesetzt).

Ehrliche, DSGVO-konservative Regeln:
- NUR Betriebe mit eigener Website (= klar gewerblich, öffentlich auftretend).
- KEINE E-Mail/Telefon republishen — nur Name, Ort, Website-Link.
- Einträge sind real, aber NICHT einzeln verifiziert. Die Leistungs-Kategorie ist
  eine Zuordnung aus dem OSM-craft-Tag, KEINE Leistungszusage des Betriebs.
- Lead-Gen bleibt deaktiviert, bis Betriebe selbst zustimmen (Opt-in via /einreichen).

Aufruf:  python3 fetch_anbieter.py        # schreibt data/anbieter.json
"""
from __future__ import annotations
import json, re, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "data" / "anbieter.json"
ENDPOINT = "https://overpass-api.de/api/interpreter"
UA = "aban-handwerk-radar/1.0 (hallo@abannews.com; +https://handwerk.abannews.com)"

# (Stadt, admin_level, Land). admin_level 6 = Stadt/Kreis in DE; AT/CH ggf. 8.
CITIES = [
    ("München", "6", "DE"), ("Berlin", "4", "DE"), ("Hamburg", "4", "DE"),
    ("Köln", "6", "DE"), ("Frankfurt am Main", "6", "DE"), ("Stuttgart", "6", "DE"),
    ("Leipzig", "6", "DE"), ("Düsseldorf", "6", "DE"), ("Dortmund", "6", "DE"),
    ("Essen", "6", "DE"), ("Nürnberg", "6", "DE"), ("Dresden", "6", "DE"),
    ("Hannover", "6", "DE"), ("Bremen", "4", "DE"),
    ("Wien", "4", "AT"), ("Graz", "8", "AT"), ("Linz", "8", "AT"),
    ("Salzburg", "8", "AT"), ("Zürich", "8", "CH"), ("Bern", "8", "CH"),
    ("Basel", "8", "CH"), ("Genève", "8", "CH"),
]

# OSM-craft → Leistungs-Kategorie (Zuordnung, keine Zusage).
HEAT = {"heating_engineer", "hvac"}

# Qualitäts-Filter gegen breite/falsche OSM-Tags (z. B. hvac umfasst auch
# Trocknung/Kälte/Lüftung). NEG = klar kein Wärmepumpen-Bezug → raus.
NEG = ("trocknung", "entfeuchtung", "brandschutz", "rohrreinigung", "kanalreinigung",
       "abfluss", "schädling", "schaedling", "lüftungsreinig", "lueftungsreinig",
       "kaminkehr", "schornstein")
# POS = Heizungs-/SHK-Signal. Nur hvac-Einträge mit so einem Signal behalten;
# heating_engineer (echter Heizungsbau) gilt immer.
POS = ("heiz", "wärme", "waerme", "sanitär", "sanitaer", "shk", "haustechnik",
       "gebäudetechnik", "gebaeudetechnik", "klempner", "installat", "wärmepump",
       "waermepump", "energietechnik", "energie")


def slugify(v: str) -> str:
    v = v.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        v = v.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", v).strip("-") or "x"


def query(city: str, level: str) -> list[dict]:
    q = f"""
[out:json][timeout:60];
area["name"="{city}"]["admin_level"="{level}"]->.a;
(
  nwr["craft"="heating_engineer"]["website"](area.a);
  nwr["craft"="hvac"]["website"](area.a);
  nwr["shop"="solar"]["website"](area.a);
  nwr["craft"="heating_engineer"]["contact:website"](area.a);
  nwr["craft"="hvac"]["contact:website"](area.a);
  nwr["shop"="solar"]["contact:website"](area.a);
);
out center tags 40;
""".strip()
    data = urllib.parse.urlencode({"data": q}).encode()
    for attempt in range(4):
        req = urllib.request.Request(ENDPOINT, data=data, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read().decode()).get("elements", [])
        except urllib.error.HTTPError as ex:
            if ex.code in (429, 504) and attempt < 3:
                time.sleep(12 * (attempt + 1))  # Backoff bei Overpass-Drosselung
                continue
            raise
    return []


def to_entry(el: dict, city: str, land: str) -> dict | None:
    t = el.get("tags", {})
    name = (t.get("name") or "").strip()
    web = (t.get("website") or t.get("contact:website") or "").strip()
    if not name or not web:
        return None
    if not web.startswith("http"):
        web = "https://" + web
    craft = t.get("craft") or t.get("shop") or ""
    low = name.lower()
    if any(bad in low for bad in NEG):
        return None  # klar kein Wärmepumpen-Bezug
    if t.get("shop") == "solar":
        leistungen, kat = ["Photovoltaik"], "Solar/Photovoltaik"
    elif craft == "heating_engineer":
        leistungen, kat = ["Wärmepumpe"], "Heizungsbau"
    elif craft == "hvac" and any(sig in low for sig in POS):
        leistungen, kat = ["Wärmepumpe"], "Heizungs-/Klimatechnik"
    else:
        return None  # hvac ohne Heizungs-Signal: zu unsicher
    osm_type = el.get("type", "node")[0]  # n/w/r
    osm_url = f"https://www.openstreetmap.org/{el.get('type')}/{el.get('id')}"
    stadt = t.get("addr:city") or city
    return {
        "id": f"{slugify(name)}-{slugify(stadt)}",
        "name": name,
        "platzhalter": False,
        "featured": False,
        "tagline": f"{kat} in {stadt} (Quelle: OpenStreetMap).",
        "leistungen": leistungen,
        "land": land,
        "stadt": stadt,
        "website": web,
        "email": None,  # bewusst NICHT aus OSM republishen (DSGVO)
        "beschreibung": (
            f"{kat}-Betrieb in {stadt}. Eintrag aus OpenStreetMap (ODbL), "
            "nicht einzeln verifiziert. Welche Leistungen genau angeboten werden, "
            "bitte direkt beim Betrieb erfragen."
        ),
        "gegruendet": None,
        "teamgroesse": None,
        "quelle": "OpenStreetMap",
        "osm_url": osm_url,
    }


def main() -> None:
    seen, out = set(), []
    for city, level, land in CITIES:
        try:
            els = query(city, level)
        except Exception as ex:
            print(f"  ! {city}: {ex}")
            continue
        n = 0
        for el in els:
            e = to_entry(el, city, land)
            if not e or e["id"] in seen:
                continue
            seen.add(e["id"])
            out.append(e)
            n += 1
        print(f"  {city}: {n} Betriebe")
        time.sleep(6)  # fair gegenüber der öffentlichen Overpass-Instanz

    out.sort(key=lambda e: (e["land"], e["stadt"], e["name"]))
    doc = {
        "_hinweis": (
            "Einträge aus OpenStreetMap (Lizenz ODbL, © OpenStreetMap-Mitwirkende). "
            "Real, aber NICHT einzeln verifiziert; die Leistungs-Kategorie ist eine "
            "Zuordnung aus dem OSM-Tag, keine Leistungszusage. KEINE E-Mails/Telefon "
            "republished. Betriebe, die nicht gelistet sein möchten: Mail an "
            "hallo@abannews.com (Opt-out). Pay-per-Lead bleibt deaktiviert bis Opt-in. "
            "Erzeugt von fetch_anbieter.py — nicht von Hand editieren."
        ),
        "_quelle": "OpenStreetMap via Overpass API (ODbL)",
        "_schema": {
            "id": "slug", "name": "Anzeigename", "platzhalter": "false=echt",
            "featured": "bezahltes Featured-Listing", "leistungen": "Wärmepumpe|Photovoltaik|Solarthermie|Stromspeicher",
            "land": "DE|AT|CH", "stadt": "Stadt", "website": "https://...",
            "email": "null (bewusst nicht aus OSM)", "beschreibung": "Text",
            "quelle": "Datenquelle", "osm_url": "Link zum OSM-Objekt",
        },
        "anbieter": out,
    }
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n{len(out)} echte Betriebe → {OUT.relative_to(HERE.parent)}")


if __name__ == "__main__":
    main()
