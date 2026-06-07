#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Digital-Produkt-Pakete bauen (Grundgerüst, no-op-sicher).

Bündelt pro Branche ein verkaufbares Paket nach downloads/packs/<slug>/:
  - ki-schnellstart-<slug>.pdf  (aus generate_branchen_pdfs.py, falls vorhanden)
  - prompts.md                  (erprobte Prompts; via Gemini, sonst ehrlicher Fallback)
  - checkliste.md               (kurze Umsetz-Checkliste)
  - LIESMICH.txt                (was drin ist + Lizenzhinweis)

Verkauf über Lemon Squeezy (Link in js/shop-config.js + Shop-Seite shop.html).
No-op-sicher: ohne Gemini-Key wird ein generischer (ehrlicher) Prompt-Satz genutzt.

    python3 automation/build_product_pack.py --slugs aerzte,handwerker,steuerberater
"""
from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
sys.path.insert(0, str(ROOT))

FALLBACK_PROMPTS = """# Erprobte KI-Prompts für {label}

> Kopieren, eckige Klammern ersetzen, Ergebnis IMMER selbst prüfen. KI liefert Entwürfe, keine Gewähr.

1. **Angebot/Anschreiben:** „Formuliere ein freundliches, klares Angebot für [Leistung] an [Kunde].
   Stichpunkte: [...]. Ton: sachlich, kurz. Keine erfundenen Preise — die trage ich selbst ein."
2. **E-Mail-Antwort:** „Antworte höflich und knapp auf diese Nachricht: [Text einfügen]. Ziel: [...]."
3. **Bewertung beantworten:** „Schreibe eine ruhige, professionelle Antwort auf diese Online-Bewertung:
   [Text]. Kein Streit, lösungsorientiert, max. 4 Sätze."
4. **Text zusammenfassen:** „Fasse diesen Text in 5 Stichpunkten zusammen und nenne offene Fragen: [Text]."
5. **Social-Post:** „Schreibe einen kurzen, ehrlichen Post (max. 80 Wörter) über [Thema] für [Zielgruppe].
   Kein Hype, ein konkreter Tipp."
"""

CHECKLIST = """# Umsetz-Checkliste — KI im Alltag

- [ ] Ein wiederkehrendes Schreib-Problem auswählen (z. B. Angebote, Mails).
- [ ] Einen Prompt aus dem Paket anpassen und 1 Woche täglich nutzen.
- [ ] Ergebnisse immer gegenlesen — Fakten/Zahlen kommen von dir.
- [ ] Für Sensibles nur Tools mit klarer EU-Datenverarbeitung.
- [ ] Was gut lief, als Vorlage speichern. Was nicht, weglassen.
"""


def label_from_slug(slug: str) -> str:
    return slug.replace("-", " ").title()


def gen_prompts(label: str) -> str:
    try:
        from gemini_text import generate
        r = generate(
            f"Schreibe 6 erprobte, konkrete KI-Prompts zum Kopieren für {label} (DACH). du-Form, "
            "ehrlich, KEINE erfundenen Zahlen. Markdown-Liste, jeder Prompt in Anführungszeichen, "
            "mit [Platzhaltern]. Kurzer Hinweis oben, dass Ergebnisse zu prüfen sind.",
            max_tokens=1200, temperature=0.5, thinking_budget=0)
        if r and len(r) > 200:
            return r.strip() + "\n"
    except Exception:  # noqa: BLE001
        pass
    return FALLBACK_PROMPTS.format(label=label)


def _bundle_slugs() -> set:
    """Slugs aus data/kit-catalog.json, die als Bundle (bundle:true) markiert sind."""
    import json
    f = REPO / "data" / "kit-catalog.json"
    try:
        return {k["slug"] for k in json.loads(f.read_text(encoding="utf-8")) if k.get("bundle")}
    except Exception:  # noqa: BLE001
        return set()


def build_single(slug: str) -> Path:
    label = label_from_slug(slug)
    pack = REPO / "downloads" / "packs" / slug
    pack.mkdir(parents=True, exist_ok=True)
    pdf = REPO / "downloads" / "branchen" / f"ki-schnellstart-{slug}.pdf"
    if pdf.exists():
        shutil.copy(pdf, pack / pdf.name)
    (pack / "prompts.md").write_text(gen_prompts(label), encoding="utf-8")
    (pack / "checkliste.md").write_text(CHECKLIST, encoding="utf-8")
    (pack / "LIESMICH.txt").write_text(
        f"KI-Starter-Kit für {label} — aban news\n\n"
        "Inhalt: Spickzettel-PDF (falls beigelegt), prompts.md, checkliste.md.\n"
        "Nutzung: privat & geschäftlich erlaubt. Weiterverkauf nicht gestattet.\n"
        "Ergebnisse von KI immer selbst prüfen. © aban news, abannews.com\n", encoding="utf-8")
    return Path(shutil.make_archive(str(pack), "zip", str(pack)))


def build_bundle(slug: str, member_slugs: list[str]) -> Path:
    """Bündelt alle Einzel-Packs (je als Unterordner) in EIN ZIP."""
    bundle = REPO / "downloads" / "packs" / slug
    if bundle.exists():
        shutil.rmtree(bundle)
    bundle.mkdir(parents=True, exist_ok=True)
    n = 0
    for m in member_slugs:
        src = REPO / "downloads" / "packs" / m
        if src.is_dir():
            shutil.copytree(src, bundle / m)
            n += 1
    (bundle / "LIESMICH.txt").write_text(
        "Alle KI-Starter-Kits (Bundle) — aban news\n\n"
        f"Enthält {n} Branchen-Kits, je im eigenen Ordner (Spickzettel-PDF, prompts.md, checkliste.md).\n"
        "Nutzung: privat & geschäftlich erlaubt. Weiterverkauf nicht gestattet.\n"
        "Ergebnisse von KI immer selbst prüfen. © aban news, abannews.com\n", encoding="utf-8")
    return Path(shutil.make_archive(str(bundle), "zip", str(bundle)))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--slugs", default="aerzte,handwerker,steuerberater")
    args = ap.parse_args()
    bundles = _bundle_slugs()
    all_slugs = [s.strip() for s in args.slugs.split(",") if s.strip()]
    singles = [s for s in all_slugs if s not in bundles]
    built = 0
    for slug in singles:
        zip_path = build_single(slug)
        built += 1
        print(f"✓ Paket gebaut: downloads/packs/{slug}/  →  {zip_path.name} (upload-fertig)")
    # Bundles ZULETZT (brauchen die fertigen Einzel-Packs). Mitglieder = alle Einzel-Slugs.
    for slug in [s for s in all_slugs if s in bundles]:
        zip_path = build_bundle(slug, singles)
        built += 1
        print(f"✓ Bundle gebaut: downloads/packs/{slug}/  →  {zip_path.name} ({len(singles)} Kits)")
    print(f"Fertig: {built} Paket(e). ZIPs werden vom Stripe-Workflow gehasht abgelegt + verkauft.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
