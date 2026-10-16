#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/add_kit_crosslink.py — Kauf-Kasten für das passende Branchen-Kit.

Auf den ki-fuer-<branche>-Seiten sitzt die kaufbereiteste Leserschaft der
Seite: wer „KI für Ärzte" liest, ist genau die Zielgruppe des Kits für Ärzte.
Bis hierher führte nur ein Textlink auf /shop.html#kit-<slug> — also Shop-Seite
laden, die eigene Karte unter 31 Produkten finden, dort erst kaufen.

Dieser Block macht daraus einen Schritt: ein Knopf, der direkt zur Zahlung
führt, mit Preis und Produktname aus data/shop-products.json (nichts
hartcodiert). Ohne Kauf-Link fällt er auf /shop.html#kit-<slug> zurück.

Idempotent über den Marker data-aban-kit: ist ein Block vorhanden, wird er
ERSETZT (so greifen neue Preise und Texte), sonst vor der FAQ eingefügt.

Aufruf:  python3 tools/add_kit_crosslink.py [--dry]
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARK = "data-aban-kit"
SKRIPT = '<script defer src="/js/kit-preis.js"></script>'

# kit-slug -> ki-fuer-<alias>-Seiten (hochpräzise, nur klare Treffer)
KIT2BRANCH = {
    "aerzte": ["aerzte", "zahnaerzte"],
    "handwerker": ["handwerker"],
    "steuerberater": ["steuerberater"],
    "anwaelte": ["anwaelte"],
    "gastronomie": ["gastronomie"],
    "coaches": ["coaches"],
    "immobilienmakler": ["immobilienmakler"],
    "friseure": ["friseure"],
    "fotografen": ["fotografen", "hochzeitsfotografen"],
    "architekten": ["architekten"],
    "fitnessstudios": ["fitnessstudios"],
    "kosmetikstudios": ["kosmetikstudios", "nagelstudios"],
    "kfz-werkstaetten": ["kfz-werkstaetten", "motorradwerkstatt"],
    "maler": ["maler"],
    "hotels": ["hotels"],
    "physiotherapeuten": ["physiotherapeuten"],
    "reinigungsfirmen": ["reinigungsfirmen", "industriereinigung"],
    "garten-landschaftsbau": ["garten-landschaftsbau", "gartenpflege"],
    "goldschmiede": ["goldschmiede"],
}

# Ein vorhandener Block endet beim ersten </aside> — er enthält keine weiteren.
BLOCK_RE = re.compile(r"<aside[^>]*\bdata-aban-kit\b.*?</aside>\s*", re.S | re.I)


def produkte() -> dict:
    """slug -> {title, price, buy} aus den live erzeugten Stripe-Produkten."""
    f = ROOT / "data" / "shop-products.json"
    try:
        liste = json.loads(f.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}
    return {p["slug"]: p for p in liste if p.get("slug")}


def block(slug: str, p: dict) -> str:
    """Kauf-Kasten. Mit Kauf-Link: ein Klick zur Zahlung. Ohne: zum Shop."""
    titel = html.escape(p.get("title") or f"KI-Starter-Kit {slug}")
    beschr = html.escape(p.get("desc") or "")
    preis = html.escape(p.get("price") or "")
    kauf = p.get("buy")

    rahmen = ("max-width:760px;margin:22px auto;padding:16px 18px;background:#fff7ed;"
              "border:1px solid #fed7aa;border-left:4px solid #d97706;border-radius:14px;"
              "font-size:.95rem;line-height:1.55")
    knopf = ("display:inline-block;background:#b45309;color:#fff;text-decoration:none;"
             "font-weight:700;padding:11px 18px;border-radius:8px;margin:.7rem 0 .2rem")
    klein = "font-size:.84rem;color:#6b7280;margin:.35rem 0 0"

    if kauf:
        ziel = (f'<a data-kit-kaufen href="{html.escape(kauf)}" target="_blank" rel="noopener" '
                f'style="{knopf}">{titel} — {preis}</a>')
        fuss = (f'<p style="{klein}">Sofort-Download nach der Zahlung. '
                f'<a href="/agb.html" style="color:#b45309">AGB &amp; Widerruf</a> · '
                f'<a href="/shop.html#kit-{slug}" style="color:#b45309">alle Kits ansehen</a></p>')
    else:
        ziel = (f'<a data-kit-kaufen href="/shop.html#kit-{slug}" style="{knopf}">'
                f'{titel} ansehen</a>')
        fuss = f'<p style="{klein}">Im <a href="/shop.html" style="color:#b45309">Shop</a>.</p>'

    beschr_html = f" {beschr}" if beschr else ""
    return (f'<aside {MARK} data-kit-slug="{slug}" aria-label="Branchen-Kit kaufen" '
            f'style="{rahmen}">'
            f'<strong>Direkt loslegen?</strong>{beschr_html} '
            f'Einmalig zahlen, sofort herunterladen, kein Abo.<br>'
            f'{ziel}{fuss}</aside>\n')


def einfuegen(h: str, neu: str) -> str:
    """Block ersetzen, sonst vor der FAQ bzw. vor </body> einsetzen."""
    if BLOCK_RE.search(h):
        return BLOCK_RE.sub(lambda _m: neu, h, count=1)
    m = re.search(r"<h2[^>]*>\s*Häufige Fragen", h, re.I)
    pos = m.start() if m else h.lower().rfind("</body>")
    if pos < 0:
        return h
    return h[:pos] + neu + h[pos:]


def skript(h: str) -> str:
    """Preis-Abgleich einmal pro Seite vor </body> einhängen."""
    if "/js/kit-preis.js" in h:
        return h
    pos = h.lower().rfind("</body>")
    return h if pos < 0 else h[:pos] + SKRIPT + "\n" + h[pos:]


def main() -> int:
    dry = "--dry" in sys.argv
    kat = produkte()
    if not kat:
        print("✖ data/shop-products.json nicht lesbar — nichts geändert.")
        return 1

    geaendert = ohne_link = 0
    for slug, aliase in KIT2BRANCH.items():
        p = kat.get(slug)
        if not p:
            continue
        if not p.get("buy"):
            ohne_link += 1
        for a in aliase:
            f = ROOT / f"ki-fuer-{a}.html"
            if not f.is_file():
                continue
            h = f.read_text(encoding="utf-8", errors="ignore")
            if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', h, re.I):
                continue
            neu = skript(einfuegen(h, block(slug, p)))
            if neu != h:
                if not dry:
                    f.write_text(neu, encoding="utf-8")
                geaendert += 1

    art = "wären geändert" if dry else "geändert"
    print(f"✔ Kauf-Kasten auf {geaendert} Branchen-Seiten {art}"
          + (f" · {ohne_link} Kits ohne Kauf-Link (Fallback Shop)" if ohne_link else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
