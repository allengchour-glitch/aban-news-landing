#!/usr/bin/env python3
"""Schreibt Suchmaschinen- und Ersatzanzeige aus demselben vorhandenen Shop-Katalog.

Vorher war sie von Hand gepflegt: alte Preise, alte Stripe-Links, neue Produkte fehlten. Läuft im
Stripe-Workflow nach jedem Abgleich, damit Suchmaschinen dieselben Preise sehen wie die Kasse.

    python3 tools/shop_jsonld.py            # schreibt shop.html (idempotent)
    python3 tools/shop_jsonld.py --pruefen  # Exit 1, wenn shop.html veraltet ist
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHOP, DATEN = ROOT / "shop.html", ROOT / "data" / "shop-products.json"
FALLBACK = ROOT / "js" / "shop-config.js"


def preis(text: str):
    m = re.match(r"\s*(CHF|€|\$|[A-Z]{3})\s*([\d.]+)", text or "")
    if not m:
        return None, None
    return m.group(2), {"CHF": "CHF", "€": "EUR", "$": "USD"}.get(m.group(1), m.group(1))


def itemlist(produkte: list) -> str:
    items = []
    for p in produkte:
        betrag, waehrung = preis(p.get("price", ""))
        if not p.get("buy") or not betrag:
            continue  # nur Kaufbares mit bestätigtem Stripe-Link
        items.append({"@type": "ListItem", "position": len(items) + 1, "item": {
            "@type": "Product", "name": p["title"], "description": p.get("desc", ""),
            "brand": {"@type": "Brand", "name": "aban news"},
            "offers": {"@type": "Offer", "price": betrag, "priceCurrency": waehrung,
                       "availability": "https://schema.org/InStock", "url": p["buy"]}}})
    return json.dumps({"@context": "https://schema.org", "@type": "ItemList", "name": "aban news Shop",
                       "url": "https://abannews.com/shop.html", "itemListElement": items}, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


def neu_schreiben(html: str, produkte: list) -> str:
    bloecke = list(re.finditer(r'(<script type="application/ld\+json">\s*)(.*?)(\s*</script>)', html, re.S))
    treffer = [b for b in bloecke if '"@type":"ItemList"' in b.group(2).replace(" ", "")]
    assert len(treffer) == 1, f"genau ein ItemList-Block erwartet, gefunden {len(treffer)}"
    b = treffer[0]
    return html[:b.start(2)] + itemlist(produkte) + html[b.end(2):]


def ersatzkatalog(produkte: list) -> str:
    daten = json.dumps(produkte, ensure_ascii=False, indent=2)
    for zeichen in ("<", ">", "&", "\u2028", "\u2029"):
        daten = daten.replace(zeichen, "\\u" + format(ord(zeichen), "04x"))
    return ("// Automatisch aus data/shop-products.json erzeugt; nicht von Hand pflegen.\n"
            "// Ohne Konto- oder Preisänderung: Ersatzanzeige für einen fehlgeschlagenen Produktabruf.\n"
            "// Aktualisieren: python3 tools/shop_jsonld.py\nwindow.ABAN_SHOP = " + daten + ";\n")


def main() -> int:
    html = SHOP.read_text(encoding="utf-8")
    produkte = json.loads(DATEN.read_text(encoding="utf-8"))
    neu = neu_schreiben(html, produkte)
    ersatz = ersatzkatalog(produkte)
    dateien = [(SHOP, neu), (FALLBACK, ersatz)]
    veraltet = [pfad.name for pfad, text in dateien
                if not pfad.exists() or pfad.read_text(encoding="utf-8") != text]
    if "--pruefen" in sys.argv:
        print("Shop-Anzeigen aktuell" if not veraltet else "Veraltet: " + ", ".join(veraltet))
        return 1 if veraltet else 0
    for pfad, text in dateien:
        if pfad.name in veraltet:
            pfad.write_text(text, encoding="utf-8")
    print(f"→ shop.html und shop-config.js: {len(produkte)} Katalogeinträge aus derselben Quelle")
    return 0


if __name__ == "__main__":
    sys.exit(main())
