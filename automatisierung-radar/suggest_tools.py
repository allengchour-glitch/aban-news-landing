#!/usr/bin/env python3
"""Automatisierungs-Radar — Tool-Vorschläge (Mensch prüft, KI erfindet nichts).

Hält eine kuratierte Backlog-Liste **echter, bekannter** Automatisierungs-Tools, die
noch nicht in data/anbieter.json stehen. Das Skript vergleicht die Backlog gegen die
bestehende Datenbasis (per Slug + Domain) und schreibt für jeden fehlenden Eintrag
einen fertigen Stub nach data/_vorschlaege.json — mit echten Pflichtfeldern (Name,
offizielle URL, vorgeschlagene Kategorie) und allen wertenden Feldern auf `null` bzw.
`"[Redaktion: prüfen]"`.

So wächst der Radar „von selbst", ohne das Markenversprechen zu brechen:
- KI/Skript schlägt nur reale Anbieter vor (keine erfundenen Tools).
- Preise (preis_eur), Bewertungen (worth_it_score), EU-Hosting und deutsche Oberfläche
  bleiben offen, bis ein Mensch sie verifiziert.
- Ein Mensch prüft den Vorschlag, füllt die offenen Felder und verschiebt den Eintrag
  von _vorschlaege.json nach anbieter.json → erst dann wird er live.

Aufruf:
    python3 suggest_tools.py            # schreibt data/_vorschlaege.json
    python3 suggest_tools.py --check    # Exit 1, wenn neue Vorschläge existieren (CI)
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

# Kuratierte Backlog: echte Anbieter (Stand der Recherche), die ein Mensch noch prüfen
# muss. `kategorie`/`fokus` sind Vorschläge, keine geprüften Fakten. Nichts hier ist
# erfunden — alles sind real existierende Tools mit offizieller URL.
BACKLOG = [
    {"name": "Zoho Flow", "url": "https://www.zoho.com/flow/",
     "kategorie": ["iPaaS / App-Integration", "Workflow-Automatisierung (No-Code)"],
     "fokus": "International", "warum": "Günstiges iPaaS im Zoho-Ökosystem, deutschsprachig verfügbar."},
    {"name": "Pabbly Connect", "url": "https://www.pabbly.com/connect/",
     "kategorie": ["Workflow-Automatisierung (No-Code)"],
     "fokus": "International", "warum": "Preisgünstige Zapier-Alternative (Einmalkauf-Optionen), beliebt bei Solo-Selbstständigen."},
    {"name": "Integrately", "url": "https://integrately.com/",
     "kategorie": ["Workflow-Automatisierung (No-Code)"],
     "fokus": "International", "warum": "Sehr einfache 1-Klick-Automationen, großer Vorlagen-Katalog."},
    {"name": "Microsoft Azure Logic Apps", "url": "https://azure.microsoft.com/de-de/products/logic-apps",
     "kategorie": ["iPaaS / App-Integration", "Prozess-Orchestrierung / BPM"],
     "fokus": "Enterprise / RPA", "warum": "Cloud-iPaaS von Azure, getrennt von Power Automate — EU-Region wählbar."},
    {"name": "Boomi", "url": "https://boomi.com/",
     "kategorie": ["iPaaS / App-Integration"],
     "fokus": "Enterprise / RPA", "warum": "Etabliertes Enterprise-iPaaS, EU-Rechenzentren — relevant für größere DACH-Firmen."},
    {"name": "Celigo", "url": "https://www.celigo.com/",
     "kategorie": ["iPaaS / App-Integration"],
     "fokus": "Enterprise / RPA", "warum": "iPaaS mit Fokus auf E-Commerce-/ERP-Integrationen (NetSuite, Shopify)."},
    {"name": "Cyclr", "url": "https://cyclr.com/",
     "kategorie": ["iPaaS / App-Integration"],
     "fokus": "International", "warum": "Embedded iPaaS (UK/EU) — interessant als EU-nähere Embedded-Option."},
    {"name": "Windmill", "url": "https://www.windmill.dev/",
     "kategorie": ["Workflow-Automatisierung (No-Code)", "Prozess-Orchestrierung / BPM"],
     "fokus": "Self-Hosting / Open Source", "warum": "Open-Source-Plattform (Skripte + Flows), self-hostbar in der EU."},
    {"name": "Trigger.dev", "url": "https://trigger.dev/",
     "kategorie": ["Workflow-Automatisierung (No-Code)", "KI-Agenten & KI-Automatisierung"],
     "fokus": "Self-Hosting / Open Source", "warum": "Open-Source-Jobs/Workflows für Entwickler, self-hostbar."},
    {"name": "Inngest", "url": "https://www.inngest.com/",
     "kategorie": ["Prozess-Orchestrierung / BPM"],
     "fokus": "International", "warum": "Event-getriebene Durable-Workflows für Entwickler."},
    {"name": "Temporal", "url": "https://temporal.io/",
     "kategorie": ["Prozess-Orchestrierung / BPM"],
     "fokus": "Enterprise / RPA", "warum": "Durable-Execution-Engine, self-hostbar — Entwickler-Orchestrierung."},
    {"name": "Konfuzio", "url": "https://konfuzio.com/de/",
     "kategorie": ["KI-Agenten & KI-Automatisierung", "RPA (Robotic Process Automation)"],
     "fokus": "EU-Hosting / DSGVO", "warum": "Deutscher Anbieter für Dokumenten-KI/IDP, EU-Hosting — starker DACH-Kandidat."},
    {"name": "Axiom.ai", "url": "https://axiom.ai/",
     "kategorie": ["Browser-Automatisierung"],
     "fokus": "International", "warum": "No-Code-Browser-Automatisierung (Chrome) — ergänzt Bardeen."},
    {"name": "Magical", "url": "https://www.getmagical.com/",
     "kategorie": ["Browser-Automatisierung"],
     "fokus": "International", "warum": "Text-Expander + Browser-Automatisierung für repetitive Eingaben."},
]


def slugify(value: str) -> str:
    value = value.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        value = value.replace(a, b)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "x"


def domain(url: str) -> str:
    try:
        host = urlparse(url).netloc.lower()
        return host[4:] if host.startswith("www.") else host
    except Exception:
        return ""


def stub(c: dict) -> dict:
    """Vorschlag → schema-konformer Stub. Wertende Felder bleiben offen (Mensch prüft)."""
    return {
        "id": slugify(c["name"]),
        "name": c["name"],
        "anbieter": "[Redaktion: prüfen]",
        "url": c["url"],
        "sprache": [],
        "fokus": c["fokus"],
        "kategorie": c["kategorie"],
        "themen": [],
        "format": "[Redaktion: prüfen]",
        "integration": [],
        "deutsche_oberflaeche": None,
        "eu_lager": None,
        "preis_eur": None,
        "preis_hinweis": "[Redaktion: prüfen] — Preis beim Anbieter verifizieren, nicht schätzen.",
        "preismodell": None,
        "worth_it_score": None,
        "aban_note": f"[Redaktion: prüfen] — {c['warum']} Vor dem Live-Schalten EU-Hosting, "
                     f"deutsche Oberfläche, Integrationen und Preismodell prüfen.",
        "_warum_vorgeschlagen": c["warum"],
    }


def main() -> int:
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description="Automatisierungs-Radar Tool-Vorschläge")
    ap.add_argument("--data", default=str(here / "data" / "anbieter.json"))
    ap.add_argument("--out", default=str(here / "data" / "_vorschlaege.json"))
    ap.add_argument("--check", action="store_true",
                    help="Exit 1, wenn es neue (noch nicht aufgenommene) Vorschläge gibt.")
    args = ap.parse_args()

    db = json.loads(Path(args.data).read_text(encoding="utf-8"))
    existing = db.get("anbieter", [])
    have_slugs = {slugify(t["name"]) for t in existing} | {t["id"] for t in existing}
    have_domains = {domain(t.get("url", "")) for t in existing}

    new = [c for c in BACKLOG
           if slugify(c["name"]) not in have_slugs and domain(c["url"]) not in have_domains]

    payload = {
        "_hinweis": "VORSCHLÄGE — noch nicht live. Echte, bekannte Tools, die ein Mensch prüfen "
                    "muss. Felder mit null / '[Redaktion: prüfen]' vor dem Verschieben nach "
                    "anbieter.json verifizieren (KI erfindet keine Preise/Bewertungen).",
        "_workflow": "Prüfen → offene Felder ausfüllen → Eintrag nach data/anbieter.json verschieben "
                     "(ohne das Feld '_warum_vorgeschlagen') → python3 generate.py.",
        "generated": date.today().isoformat(),
        "offen": len(new),
        "vorschlaege": [stub(c) for c in new],
    }
    Path(args.out).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                              encoding="utf-8")

    print(f"{len(existing)} Tools live · {len(new)} neue Vorschläge → {args.out}")
    for c in new:
        print(f"  + {c['name']}  ({c['url']})")
    if not new:
        print("  (keine neuen Vorschläge — Backlog ist abgearbeitet)")

    if args.check and new:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
