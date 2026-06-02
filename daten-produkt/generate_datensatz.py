#!/usr/bin/env python3
"""
daten-produkt/generate_datensatz.py — baut den verkaufbaren KI-Tools-Datensatz (DACH)
aus den bereits kuratierten Netzwerk-Daten (alle Tool-Radars + data/tools.json).

Erzeugt:
  - downloads/ki-tools-dach-sample.csv        kostenlose Probe (30 Zeilen, ins Repo committet)
  - daten-produkt/dist/ki-tools-dach-voll.csv  VOLLER Datensatz (git-ignored → bei Lemon Squeezy hochladen)
  - daten-produkt/dist/ki-tools-dach-voll.json VOLLER Datensatz als JSON (git-ignored)

Ehrlich: keine erfundenen Preise/Wertungen. Felder, die nicht verifiziert sind,
bleiben leer ("") bzw. "unbekannt". Quelle der Wahrheit sind die Radar-Datensätze.
Reine Python-stdlib.
"""
import csv
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
DIST = ROOT / "dist"
DOWNLOADS = REPO / "downloads"

# Radar-Ordner -> Bereichs-Label (handwerk-radar ausgeschlossen: Betriebe, keine Tools)
BEREICHE = {
    "automatisierung-radar": "Automatisierung",
    "video-radar": "Video",
    "musik-radar": "Musik",
    "voice-radar": "Voice & Transkription",
    "chatbot-radar": "Chatbot & Kundenservice",
    "buchhaltung-radar": "Buchhaltung",
    "newsletter-radar": "Newsletter & E-Mail",
    "dropshipping-radar": "Dropshipping",
}


def norm(n):
    n = (n or "").lower()
    n = re.sub(r"\b(ai|\.ai|\.io|\.com)\b", "", n)
    return re.sub(r"[^a-z0-9]", "", n)


def cats(c):
    if isinstance(c, list):
        return [str(x) for x in c if x]
    return [str(c)] if c else []


def eu_str(v):
    return "ja" if v is True else ("nein" if v is False else "unbekannt")


def load():
    seen = {}
    for radar, lab in BEREICHE.items():
        p = REPO / radar / "data" / "anbieter.json"
        if not p.exists():
            continue
        d = json.loads(p.read_text(encoding="utf-8"))
        for a in d.get("anbieter", []):
            k = norm(a.get("name", ""))
            if not k:
                continue
            e = seen.setdefault(k, {"name": a.get("name", "").strip(), "bereiche": [],
                                    "eu": None, "url": a.get("url", "")})
            if lab not in e["bereiche"]:
                e["bereiche"].append(lab)
            if e["eu"] is None:
                e["eu"] = a.get("eu_lager")
            if not e["url"]:
                e["url"] = a.get("url", "")
    tj = json.loads((REPO / "data" / "tools.json").read_text(encoding="utf-8"))
    tools = tj if isinstance(tj, list) else tj.get("tools", [])
    for t in tools:
        k = norm(t.get("name", ""))
        if not k:
            continue
        e = seen.setdefault(k, {"name": t.get("name", "").strip(), "bereiche": [],
                               "eu": None, "url": t.get("url", "")})
        for c in cats(t.get("category")):
            if c not in e["bereiche"]:
                e["bereiche"].append(c)
        if not e["url"]:
            e["url"] = t.get("url", "")
    rows = []
    for e in seen.values():
        rows.append({
            "name": e["name"],
            "bereiche": " | ".join(e["bereiche"]),
            "eu_hosting": eu_str(e["eu"]),
            "offizielle_url": e["url"] or "",
        })
    rows.sort(key=lambda r: r["name"].lower())
    return rows


FIELDS = ["name", "bereiche", "eu_hosting", "offizielle_url"]


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)


def build():
    rows = load()
    DIST.mkdir(parents=True, exist_ok=True)
    DOWNLOADS.mkdir(parents=True, exist_ok=True)

    # Voller Datensatz (git-ignored) — für den Upload zu Lemon Squeezy
    write_csv(DIST / "ki-tools-dach-voll.csv", rows)
    (DIST / "ki-tools-dach-voll.json").write_text(
        json.dumps({"titel": "KI-Tools DACH — Datensatz", "stand": date.today().isoformat(),
                    "anzahl": len(rows), "lizenz": "Einzelplatz-Nutzung, keine Weiterverbreitung",
                    "tools": rows}, ensure_ascii=False, indent=2), encoding="utf-8")

    # Kostenlose Probe (committet) — erste 30, gemischt EU/Nicht-EU für Aussagekraft
    eu = [r for r in rows if r["eu_hosting"] == "ja"][:15]
    rest = [r for r in rows if r["eu_hosting"] != "ja"][:15]
    sample = sorted(eu + rest, key=lambda r: r["name"].lower())
    write_csv(DOWNLOADS / "ki-tools-dach-sample.csv", sample)

    eu_n = sum(1 for r in rows if r["eu_hosting"] == "ja")
    print(f"Voll: {len(rows)} Tools ({eu_n} mit EU-Hosting=ja) → {DIST}")
    print(f"Probe: {len(sample)} Zeilen → {DOWNLOADS / 'ki-tools-dach-sample.csv'}")
    print("Spalten:", ", ".join(FIELDS))


if __name__ == "__main__":
    build()
