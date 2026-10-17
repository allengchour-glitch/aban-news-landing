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
import pathlib
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

# kit-slug -> ki-sichtbarkeit-<alias>-Seiten. Diese Seiten haben ein EIGENES
# Hauptangebot (das Sichtbarkeits-Paket); der Kit-Kasten ist dort die Ergänzung
# und steht deshalb am Ende des Inhalts, nicht über dem eigenen Angebot.
KIT2SICHT = {
    "aerzte": ["praxen", "zahnaerzte"],
    "handwerker": ["handwerk"],
    "steuerberater": ["steuerberatung"],
    "anwaelte": ["kanzleien"],
    "gastronomie": ["gastronomie"],
    "coaches": ["coaches"],
    "immobilienmakler": ["immobilienmakler"],
    "friseure": ["friseure"],
    "fotografen": ["fotografen"],
    "architekten": ["architekten"],
    "fitnessstudios": ["fitnessstudios"],
    "kosmetikstudios": ["kosmetikstudios"],
    "kfz-werkstaetten": ["kfz-werkstaetten"],
    "maler": ["maler"],
    "hotels": ["hotels"],
    "physiotherapeuten": ["physiotherapie"],
}

# Für die restlichen ~340 ki-fuer-Seiten gibt es kein eigenes Kit. Ihnen eines
# der 19 Branchen-Kits anzubieten wäre unehrlich (ein Kit für Ärzte hilft keiner
# Bäckerei). Die Prompt-Bibliothek ist laut Katalog ausdrücklich
# "branchen-übergreifend" — das ist das einzige Produkt, das hier ohne falsches
# Versprechen passt.
ALLGEMEIN_KIT = "prompt-bibliothek"


# Nicht jede ki-fuer-Seite ist ein Betrieb: "KI für Bewerbung", "KI für Excel"
# oder "KI für Lehrer" sind Themen-Seiten. Eine Prompt-Bibliothek "für
# Solopreneure" passt dort nicht. Echte Branchen-Seiten tragen die Navigation
# "Verwandte Branchen" (tools/related_hubs.py), Themen-Seiten nicht.
BRANCHEN_MARKE = "Verwandte Branchen"


def ist_branchenseite(f: pathlib.Path) -> bool:
    try:
        return BRANCHEN_MARKE in f.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return False


def uebrige_branchen() -> list:
    """Echte Branchen-Seiten ohne eigenes Kit, alphabetisch (stabil)."""
    mit_kit = {a for al in KIT2BRANCH.values() for a in al}
    alle = sorted(f.name[len("ki-fuer-"):-len(".html")]
                  for f in ROOT.glob("ki-fuer-*.html") if ist_branchenseite(f))
    return [a for a in alle if a not in mit_kit]


# Seitenfamilien: Präfix -> (Zuordnung, Einleitung des Kastens)
def familien() -> tuple:
    return (
        ("ki-fuer-", KIT2BRANCH, "Direkt loslegen?"),
        ("ki-sichtbarkeit-", KIT2SICHT, "Passend dazu:"),
        ("ki-fuer-", {ALLGEMEIN_KIT: uebrige_branchen()}, "Für jede Branche:"),
    )

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


def block(slug: str, p: dict, einleitung: str = "Direkt loslegen?") -> str:
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
    return (f'<aside {MARK} data-kit-slug="{slug}" aria-label="{titel} kaufen" '
            f'style="{rahmen}">'
            f'<strong>{html.escape(einleitung)}</strong>{beschr_html} '
            f'Einmalig zahlen, sofort herunterladen, kein Abo.<br>'
            f'{ziel}{fuss}</aside>\n')


def einfuegen(h: str, neu: str) -> str:
    """Block ersetzen, sonst vor der FAQ bzw. vor </body> einsetzen."""
    if BLOCK_RE.search(h):
        return BLOCK_RE.sub(lambda _m: neu, h, count=1)
    m = re.search(r"<h2[^>]*>\s*Häufige Fragen", h, re.I)
    if m:
        pos = m.start()
    else:
        # Ohne FAQ ans Ende des Inhalts — vor </body> stünde der Kasten hinter
        # dem Footer und wäre für die Leserschaft praktisch unsichtbar.
        pos = h.lower().rfind("</main>")
        if pos < 0:
            pos = h.lower().rfind("</body>")
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

    gesamt = 0
    for praefix, zuordnung, einleitung in familien():
        geaendert = 0
        for slug, aliase in zuordnung.items():
            p = kat.get(slug)
            if not p:
                continue
            for a in aliase:
                f = ROOT / f"{praefix}{a}.html"
                if not f.is_file():
                    continue
                h = f.read_text(encoding="utf-8", errors="ignore")
                if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', h, re.I):
                    continue
                neu_h = skript(einfuegen(h, block(slug, p, einleitung)))
                if neu_h != h:
                    if not dry:
                        f.write_text(neu_h, encoding="utf-8")
                    geaendert += 1
        art = "wären geändert" if dry else "geändert"
        print(f"  {praefix}*: {geaendert} Seiten {art}")
        gesamt += geaendert

    ohne = [s for s in set(list(KIT2BRANCH) + list(KIT2SICHT) + [ALLGEMEIN_KIT])
            if kat.get(s) and not kat[s].get("buy")]
    print(f"✔ Kauf-Kasten auf {gesamt} Seiten"
          + (f" · {len(ohne)} Kits ohne Kauf-Link (Fallback Shop)" if ohne else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
