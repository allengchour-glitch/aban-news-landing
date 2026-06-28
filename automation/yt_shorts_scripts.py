#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — YouTube-Shorts-Skripte aus den Website-Guides erzeugen.

Macht aus den besten „KI für Selbstständige"-Seiten fertige **50–60-s-Short-
Skripte** (Hook → 3 Value-Punkte → CTA), inkl. Voiceover-Text am Stück, On-Screen-
Text und B-Roll-Keywords. Das ist das Content-Rohmaterial für den neuen YouTube-
Kanal (Konzept: docs/YOUTUBE-NEUSTART-2026.md).

Template-basiert (reine Stdlib, KEIN API-Key nötig) → deterministische Entwürfe aus
echtem Seiteninhalt (Titel, Meta-Description, H2-Überschriften). Die Skripte sind
Entwürfe zum Feinschliff, kein fertiger Voiceover. Idempotent (überspringt vorhandene).

    python3 automation/yt_shorts_scripts.py [--force]

Ausgabe: automation/yt-shorts/<slug>.md  +  automation/yt-shorts/INDEX.md
"""
from __future__ import annotations

import argparse
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "automation" / "yt-shorts"

# Kuratierte Start-Themen (KI fürs Business für Selbstständige). Fehlende werden übersprungen.
SEED = [
    "ki-tools-fuer-selbststaendige", "ki-email-schreiben", "ki-prompts-beispiele",
    "rechnung-generator", "angebot-schreiben", "ki-excel-tabelle-erstellen",
    "kostenlose-ki-tools", "ki-text-umschreiben", "ki-praesentation-erstellen",
    "ki-spar-rechner", "ki-dsgvo-check", "ki-text-humanisieren",
    "text-zusammenfassen-ki", "ki-logo-erstellen", "ki-uebersetzen",
    # 2. Tranche (≈1 Monat täglicher Content)
    "ki-bilder-erstellen-kostenlos", "ki-website-erstellen", "ki-chatbot-erstellen",
    "ki-musik-erstellen", "ki-untertitel-erstellen", "ki-video-erstellen",
    "ki-prompt-checker", "ki-readiness-check", "ki-kosten-rechner",
    "ki-stimmen", "ki-voiceover", "ki-automation",
    "mwst-rechner", "stundensatz-rechner",
]

TITLE = re.compile(r"<title>(.*?)</title>", re.S | re.I)
OG_TITLE = re.compile(r'<meta\s+property="og:title"\s+content="([^"]*)"', re.I)
DESC = re.compile(r'<meta\s+name="description"\s+content="([^"]*)"', re.I)
H2 = re.compile(r"<h2[^>]*>(.*?)</h2>", re.S | re.I)
TAGS = re.compile(r"<[^>]+>")


def clean(s: str) -> str:
    s = TAGS.sub("", html.unescape(s or "")).strip()
    s = re.sub(r"\s+", " ", s)
    for sep in (" · ", " | ", " — aban", " - aban"):
        if sep in s:
            s = s.split(sep)[0].strip()
    return s


def points(text: str) -> list[str]:
    pts = []
    for raw in H2.findall(text):
        t = clean(raw)
        # Navigations-/FAQ-/Service-Überschriften aussortieren
        if not t or len(t) < 6 or len(t) > 70:
            continue
        if re.search(r"häufige fragen|faq|inhalt|newsletter|premium|mehr aus|weitere|impressum", t, re.I):
            continue
        pts.append(t)
        if len(pts) == 3:
            break
    return pts


def core_topic(title: str) -> str:
    return title.split(" — ")[0].split(" (")[0].split(":")[0].strip()


def hook_for(slug: str, title: str) -> str:
    """Neugier-/Nutzen-Hook (Muster aus SECOND-BRAIN: konkreter Nutzen, kein Generik)."""
    c = core_topic(title)
    has_ki = "ki" in c.lower()
    s = slug.lower()
    # spezifische Admin-/Geld-Aufgaben & Rechner (kein "kosten" → würde "kostenlos" fangen)
    if any(k in s for k in ("rechner", "rechnung", "angebot", "mwst", "steuer",
                            "stundensatz", "lohn")):
        return f"Mach das nie wieder von Hand: {c} in unter 2 Minuten — gratis."
    # Kreativ/Medien-Aufgaben
    if any(k in s for k in ("bilder", "logo", "video", "musik", "stimmen", "voiceover", "untertitel")):
        tail = "— in Minuten, ohne Vorkenntnisse."
        return f"{c} {tail}" if has_ki else f"{c} mit KI {tail}"
    if "prompt" in s:
        return "Die KI-Prompts, die wirklich funktionieren — zum Kopieren."
    if "kostenlose" in s or s.endswith("ki-tools") or "tools" in s:
        return "Diese KI-Tools nutzen clevere Selbstständige 2026 — und sie sind gratis."
    tail = ": schneller und besser, als die meisten denken."
    return f"{c}{tail}" if has_ki else f"{c} mit KI{tail}"


def hashtags_for(slug: str, title: str) -> str:
    base = ["#shorts", "#ki", "#ai", "#selbststaendig", "#aitools"]
    t = (slug + " " + title).lower()
    if "chatgpt" in t or "claude" in t or "prompt" in t:
        base.append("#claudeai")
    if any(k in t for k in ("rechnung", "angebot", "steuer", "buchhaltung", "business")):
        base.append("#onlinebusiness")
    if any(k in t for k in ("tool", "kostenlose", "gratis")):
        base.append("#kitools")
    return " ".join(dict.fromkeys(base))  # dedupe, Reihenfolge erhalten


def script_for(slug: str) -> str | None:
    p = ROOT / f"{slug}.html"
    if not p.is_file():
        return None
    s = p.read_text(encoding="utf-8", errors="ignore")
    m = OG_TITLE.search(s) or TITLE.search(s)
    title = clean(m.group(1)) if m else slug
    d = DESC.search(s)
    desc = clean(d.group(1)) if d else ""
    pts = points(s) or [desc[:60]] if desc else []
    # Fallback-Punkte, falls die Seite kaum H2 hat
    while len(pts) < 3:
        pts.append("Schritt für Schritt erklärt — ohne Hype.")
    pts = pts[:3]

    topic = title
    hook = hook_for(slug, title)
    tags = hashtags_for(slug, title)
    vo = (f"{hook} "
          f"Erstens: {pts[0]}. "
          f"Zweitens: {pts[1]}. "
          f"Drittens: {pts[2]}. "
          f"Die ganze Anleitung — gratis — gibt's bei aban news. "
          f"Folge für mehr KI-Tipps für Selbstständige.")
    broll = ", ".join(re.findall(r"[A-Za-zÄÖÜäöü]{4,}", topic)[:4]) or "laptop, büro, ki, arbeit"

    return f"""# {topic} — YouTube-Short (≈55 s)

> Quelle: /{slug}.html · Niche: KI fürs Business für Selbstständige · Format: Short 9:16

**Hook (0–3 s):** {hook}
**On-Screen:** {core_topic(title)}

**Value (3–45 s) — On-Screen-Stichpunkte:**
1. {pts[0]}
2. {pts[1]}
3. {pts[2]}

**CTA (45–55 s):** „Ganze Anleitung gratis bei aban news — Link in Bio." → /{slug}.html + Newsletter

**Voiceover (am Stück, ~55 s):**
{vo}

**Titel-Vorschlag:** {core_topic(title)} (mit KI) | aban news
**Hashtags:** {tags}
**B-Roll-Keywords (Pexels):** {broll}, screen recording, deutsch, selbstständig
**Musik:** ruhiger Beat, dezent · **Untertitel:** Pflicht (eigene Stimme = Algo-Bonus 2026)
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--force", action="store_true", help="vorhandene Skripte überschreiben")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    made, skipped, missing = [], 0, 0
    for slug in SEED:
        dst = OUT / f"{slug}.md"
        if dst.exists() and not args.force:
            skipped += 1
            continue
        sc = script_for(slug)
        if sc is None:
            missing += 1
            print(f"  fehlt: {slug}.html")
            continue
        dst.write_text(sc, encoding="utf-8")
        made.append(slug)
        print(f"  ✓ {slug}.md")

    # Index schreiben
    existing = sorted(q.stem for q in OUT.glob("*.md") if q.name != "INDEX.md")
    idx = ["# YouTube-Shorts — Skript-Queue", "",
           "Entwürfe aus den Website-Guides (Konzept: docs/YOUTUBE-NEUSTART-2026.md).",
           "Feinschliff → rendern (Pipeline/Tool) → Upload (YouTube-API).", "",
           "## 📈 Intelligenz aus SECOND-BRAIN (Branch `brain/youtube`, Cross-Session)",
           "View-staerkste Hook-Muster = GELD MIT KI: 'X Ways to Make Money with AI 2026',",
           "'$Xk mit Claude-AI', 'Build a $XM Business with AI, zero employees'. → Hooks danach formulieren.",
           "**Hashtags (Konsens):** #shorts #claudeai #ai #ki #onlinebusiness #aitools #ecommerce #dropshipping",
           "**Format:** 50-60s, eigene Stimme (Algo-Bonus), Untertitel Pflicht, klarer Hook in 3s.", ""]
    idx += [f"- [ ] `{n}.md`" for n in existing]
    (OUT / "INDEX.md").write_text("\n".join(idx) + "\n", encoding="utf-8")

    print(f"\n{len(made)} neu, {skipped} schon da, {missing} Quelle fehlt · {len(existing)} Skripte gesamt → automation/yt-shorts/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
