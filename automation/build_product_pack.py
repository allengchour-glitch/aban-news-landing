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

FALLBACK_PROMPTS_EN = """# Proven AI prompts for {label}

> Copy, replace the brackets, ALWAYS check the result. AI gives you drafts, no guarantees.

1. **Quote / outreach:** "Write a friendly, clear quote for [service] to [client].
   Key points: [...]. Tone: factual, short. No made-up prices — I'll fill those in myself."
2. **Email reply:** "Reply politely and briefly to this message: [paste text]. Goal: [...]."
3. **Review response:** "Write a calm, professional reply to this online review: [text].
   No arguing, solution-oriented, max 4 sentences."
4. **Summarize text:** "Summarize this text in 5 bullet points and list open questions: [text]."
5. **Social post:** "Write a short, honest post (max 80 words) about [topic] for [audience].
   No hype, one concrete tip."
"""

CHECKLIST_EN = """# Action checklist — AI in daily work

- [ ] Pick one recurring writing task (e.g. quotes, emails).
- [ ] Adapt one prompt from the pack and use it daily for a week.
- [ ] Always proofread results — facts/numbers come from you.
- [ ] For sensitive data, only use tools with clear EU data processing.
- [ ] Save what worked as a template. Drop what didn't.
"""


def label_from_slug(slug: str) -> str:
    return slug.replace("-", " ").title()


def gen_prompts(label: str, lang: str = "de") -> str:
    try:
        from gemini_text import generate
        if lang == "en":
            q = (f"Write 6 proven, concrete copy-paste AI prompts for {label}. Honest, NO made-up "
                 "numbers. Markdown list, each prompt in quotes, with [placeholders]. Short note on top "
                 "that results must be checked.")
        else:
            q = (f"Schreibe 6 erprobte, konkrete KI-Prompts zum Kopieren für {label} (DACH). du-Form, "
                 "ehrlich, KEINE erfundenen Zahlen. Markdown-Liste, jeder Prompt in Anführungszeichen, "
                 "mit [Platzhaltern]. Kurzer Hinweis oben, dass Ergebnisse zu prüfen sind.")
        r = generate(q, max_tokens=1200, temperature=0.5, thinking_budget=0)
        if r and len(r) > 200:
            return r.strip() + "\n"
    except Exception:  # noqa: BLE001
        pass
    tmpl = FALLBACK_PROMPTS_EN if lang == "en" else FALLBACK_PROMPTS
    return tmpl.format(label=label)


def _bundle_slugs(catalog: Path) -> set:
    """Slugs aus dem Katalog, die als Bundle (bundle:true) markiert sind."""
    import json
    try:
        return {k["slug"] for k in json.loads(catalog.read_text(encoding="utf-8")) if k.get("bundle")}
    except Exception:  # noqa: BLE001
        return set()


def _base_slug(slug: str, lang: str) -> str:
    """EN-Slugs sind 'en-<branche>' → Branchen-Slug für Quell-PDF/Label."""
    return slug[3:] if (lang == "en" and slug.startswith("en-")) else slug


def build_single(slug: str, lang: str = "de") -> Path:
    base = _base_slug(slug, lang)
    label = label_from_slug(base)
    pack = REPO / "downloads" / "packs" / (lang if lang != "de" else "") / slug
    pack.mkdir(parents=True, exist_ok=True)
    if lang == "en":
        pdf = REPO / "downloads" / "branchen" / "en" / f"ki-quickstart-{base}.pdf"
        checklist, readme_title = CHECKLIST_EN, f"AI Starter Kit for {label} — aban news"
        readme_body = ("Contents: cheat-sheet PDF (if included), prompts.md, checkliste.md.\n"
                       "Use: personal & commercial allowed. Reselling not permitted.\n"
                       "Always check AI results yourself. © aban news, abannews.com\n")
    else:
        pdf = REPO / "downloads" / "branchen" / f"ki-schnellstart-{base}.pdf"
        checklist, readme_title = CHECKLIST, f"KI-Starter-Kit für {label} — aban news"
        readme_body = ("Inhalt: Spickzettel-PDF (falls beigelegt), prompts.md, checkliste.md.\n"
                       "Nutzung: privat & geschäftlich erlaubt. Weiterverkauf nicht gestattet.\n"
                       "Ergebnisse von KI immer selbst prüfen. © aban news, abannews.com\n")
    if pdf.exists():
        shutil.copy(pdf, pack / pdf.name)
    (pack / "prompts.md").write_text(gen_prompts(label, lang), encoding="utf-8")
    (pack / "checkliste.md").write_text(checklist, encoding="utf-8")
    (pack / "LIESMICH.txt").write_text(readme_title + "\n\n" + readme_body, encoding="utf-8")
    return Path(shutil.make_archive(str(pack), "zip", str(pack)))


def build_bundle(slug: str, member_slugs: list[str], lang: str = "de") -> Path:
    """Bündelt alle Einzel-Packs (je als Unterordner) in EIN ZIP."""
    sub = (lang if lang != "de" else "")
    bundle = REPO / "downloads" / "packs" / sub / slug
    if bundle.exists():
        shutil.rmtree(bundle)
    bundle.mkdir(parents=True, exist_ok=True)
    n = 0
    for m in member_slugs:
        src = REPO / "downloads" / "packs" / sub / m
        if src.is_dir():
            shutil.copytree(src, bundle / m)
            n += 1
    if lang == "en":
        (bundle / "LIESMICH.txt").write_text(
            "All AI Starter Kits (Bundle) — aban news\n\n"
            f"Contains {n} industry kits, each in its own folder (cheat-sheet PDF, prompts.md, checkliste.md).\n"
            "Use: personal & commercial allowed. Reselling not permitted.\n"
            "Always check AI results yourself. © aban news, abannews.com\n", encoding="utf-8")
    else:
        (bundle / "LIESMICH.txt").write_text(
            "Alle KI-Starter-Kits (Bundle) — aban news\n\n"
            f"Enthält {n} Branchen-Kits, je im eigenen Ordner (Spickzettel-PDF, prompts.md, checkliste.md).\n"
            "Nutzung: privat & geschäftlich erlaubt. Weiterverkauf nicht gestattet.\n"
            "Ergebnisse von KI immer selbst prüfen. © aban news, abannews.com\n", encoding="utf-8")
    return Path(shutil.make_archive(str(bundle), "zip", str(bundle)))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--slugs", default="aerzte,handwerker,steuerberater")
    ap.add_argument("--lang", default="de", choices=["de", "en"])
    ap.add_argument("--catalog", default=None, help="Katalog für Bundle-Erkennung (sonst sprachabh.)")
    args = ap.parse_args()
    catalog = Path(args.catalog) if args.catalog else (
        REPO / "data" / ("kit-catalog-en.json" if args.lang == "en" else "kit-catalog.json"))
    bundles = _bundle_slugs(catalog)
    all_slugs = [s.strip() for s in args.slugs.split(",") if s.strip()]
    singles = [s for s in all_slugs if s not in bundles]
    sub = (args.lang + "/") if args.lang != "de" else ""
    built = 0
    for slug in singles:
        zip_path = build_single(slug, args.lang)
        built += 1
        print(f"✓ Paket gebaut: downloads/packs/{sub}{slug}/  →  {zip_path.name} (upload-fertig)")
    # Bundles ZULETZT (brauchen die fertigen Einzel-Packs). Mitglieder = alle Einzel-Slugs.
    for slug in [s for s in all_slugs if s in bundles]:
        zip_path = build_bundle(slug, singles, args.lang)
        built += 1
        print(f"✓ Bundle gebaut: downloads/packs/{sub}{slug}/  →  {zip_path.name} ({len(singles)} Kits)")
    print(f"Fertig: {built} [{args.lang}] Paket(e). ZIPs werden vom Stripe-Workflow gehasht abgelegt + verkauft.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
