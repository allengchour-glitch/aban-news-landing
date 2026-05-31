#!/usr/bin/env python3
"""Daten-Integritätsprüfer für aban news.

Validiert data/tools.json und data/glossary.json gegen ihr Schema und prüft
Referenz-Integrität (alternatives/see_also/ausgaben_mentions). Findet Tippfehler,
fehlende Pflichtfelder, kaputte Querverweise und unplausible Scores, bevor sie
auf der Live-Datenbank-Seite landen.

    python3 automation/data_integrity.py
Exit: 0 = sauber (Warnungen erlaubt), 1 = harte Fehler.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "data" / "tools.json"
GLOSS = ROOT / "data" / "glossary.json"
ARCHIVE = ROOT / "archive"

errors, warnings = [], []
def err(m): errors.append(m)
def warn(m): warnings.append(m)


def issue_ids():
    """'027' etc. aus den Archiv-Dateinamen."""
    ids = set()
    for p in ARCHIVE.glob("[0-9][0-9][0-9]-*.html"):
        ids.add(p.name[:3])
    return ids


def check_tools(issues):
    d = json.loads(TOOLS.read_text(encoding="utf-8"))
    tools = d.get("tools", [])
    ids = [t.get("id") for t in tools]
    idset = set(ids)
    # Duplikate
    for x in set(ids):
        if ids.count(x) > 1:
            err(f"tools: doppelte id '{x}'")
    req = ["id", "name", "vendor", "category", "pricing", "dach_relevance",
           "worth_it_score", "aban_note", "url"]
    for t in tools:
        tid = t.get("id", "?")
        for f in req:
            if f not in t or t[f] in ("", None, []):
                err(f"tools[{tid}]: Pflichtfeld '{f}' fehlt/leer")
        dr = t.get("dach_relevance")
        if isinstance(dr, (int, float)) and not (0 <= dr <= 10):
            err(f"tools[{tid}]: dach_relevance {dr} außerhalb 0..10")
        ws = t.get("worth_it_score")
        if isinstance(ws, (int, float)) and not (0 <= ws <= 10):
            err(f"tools[{tid}]: worth_it_score {ws} außerhalb 0..10")
        pr = t.get("pricing", {})
        if isinstance(pr, dict):
            if "free_tier" not in pr:
                warn(f"tools[{tid}]: pricing.free_tier fehlt")
            if not pr.get("currency"):
                warn(f"tools[{tid}]: pricing.currency fehlt")
        if not str(t.get("url", "")).startswith("http"):
            warn(f"tools[{tid}]: url sieht nicht wie URL aus: {t.get('url')!r}")
        # Referenzen
        for a in t.get("alternatives", []):
            if a not in idset:
                warn(f"tools[{tid}]: alternative '{a}' ist nicht in der DB (externer Name?)")
        for m in t.get("ausgaben_mentions", []):
            mm = re.sub(r"\D", "", str(m))[:3]
            if mm and mm not in issues:
                warn(f"tools[{tid}]: ausgaben_mention '{m}' -> keine Archiv-Ausgabe {mm}")
    return len(tools), idset


def check_glossary(issues):
    d = json.loads(GLOSS.read_text(encoding="utf-8"))
    entries = d.get("entries", [])
    cats = set(d.get("categories", []))
    ids = [e.get("id") for e in entries]
    idset = set(ids)
    for x in set(ids):
        if ids.count(x) > 1:
            err(f"glossar: doppelte id '{x}'")
    req = ["id", "term_de", "term_en", "category",
           "definition_marketing", "definition_aban"]
    for e in entries:
        eid = e.get("id", "?")
        for f in req:
            if f not in e or e[f] in ("", None):
                err(f"glossar[{eid}]: Pflichtfeld '{f}' fehlt/leer")
        if cats and e.get("category") not in cats:
            warn(f"glossar[{eid}]: Kategorie '{e.get('category')}' nicht in categories[]")
        for s in e.get("see_also", []):
            if s not in idset:
                warn(f"glossar[{eid}]: see_also '{s}' existiert nicht")
        fu = str(e.get("first_used_in", ""))
        mm = re.sub(r"\D", "", fu)[:3]
        if mm and mm not in issues:
            warn(f"glossar[{eid}]: first_used_in '{fu}' -> keine Archiv-Ausgabe {mm}")
    return len(entries)


def main():
    issues = issue_ids()
    nt, _ = check_tools(issues)
    ng = check_glossary(issues)
    print(f"Tools: {nt} · Begriffe: {ng} · Archiv-Ausgaben: {len(issues)}")
    if warnings:
        print(f"\n⚠️  {len(warnings)} Warnungen:")
        for w in warnings[:40]:
            print("   -", w)
        if len(warnings) > 40:
            print(f"   … und {len(warnings)-40} weitere")
    if errors:
        print(f"\n❌ {len(errors)} FEHLER:")
        for e in errors:
            print("   -", e)
        return 1
    print("\n✅ Keine harten Fehler.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
