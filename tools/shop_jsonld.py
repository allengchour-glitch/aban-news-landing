#!/usr/bin/env python3
"""Schreibt DE-Suchliste, EN-Bundleangebot und Ersatzanzeigen aus eigenen Shop-Katalogen.

Ersatzkatalog und Suchmaschinenliste dürfen nicht vom regulären Shop abweichen. Der bestehende
Stripe-Katalogworkflow ruft dieses Werkzeug nach dem Abgleich auf; es selbst liest nur lokale Dateien.

    python3 tools/shop_jsonld.py            # schreibt shop.html und beide Sprach-Ersatzkataloge (idempotent)
    python3 tools/shop_jsonld.py --pruefen  # Exit 1, wenn eine der Anzeigen veraltet ist
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHOP, DATEN = ROOT / "shop.html", ROOT / "data" / "shop-products.json"
FALLBACK = ROOT / "js" / "shop-config.js"
EN_DATEN = ROOT / "data" / "shop-products-en.json"
EN_FALLBACK = ROOT / "js" / "shop-config-en.js"
EN_SHOP = ROOT / "en" / "shop.html"


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


def _itemlist_block(html: str):
    bloecke = list(re.finditer(r'(<script type="application/ld\+json">\s*)(.*?)(\s*</script>)', html, re.S))
    treffer = [b for b in bloecke if '"@type":"ItemList"' in b.group(2).replace(" ", "")]
    if len(treffer) != 1:
        raise ValueError(f"Genau ein ItemList-Block erwartet, gefunden {len(treffer)}")
    return treffer[0]


def neu_schreiben(html: str, produkte: list) -> str:
    b = _itemlist_block(html)
    return html[:b.start(2)] + itemlist(produkte) + html[b.end(2):]


def bundle_angebote_schreiben(html: str, produkte: list) -> str:
    """Nur vorhandene Bundle-Angebote abgleichen; übrige Produktangaben erhalten."""
    bundles = [p for p in produkte if p.get("bundle")]
    ziel = {p["title"]: p for p in bundles}
    if len(ziel) != len(bundles):
        raise ValueError("Bundle-Titel nicht eindeutig")
    b = _itemlist_block(html)
    daten = json.loads(b.group(2))
    bekannte_titel = {p["title"] for p in produkte}
    for eintrag in daten.get("itemListElement", []):
        produkt = eintrag.get("item", {})
        if produkt.get("offers") and produkt.get("name") not in bekannte_titel:
            raise ValueError("Suchangebot ohne eigene Katalogzuordnung")
    if not bundles:
        return html
    gefunden = {name: 0 for name in ziel}
    for eintrag in daten.get("itemListElement", []):
        produkt = eintrag.get("item", {})
        name = produkt.get("name")
        if name not in ziel:
            continue
        gefunden[name] += 1
        quelle = ziel[name]
        if not quelle.get("buy"):
            produkt.pop("offers", None)
            continue
        text = quelle.get("price", "")
        if not isinstance(text, str) or not re.fullmatch(r"\s*(CHF|€|\$|[A-Z]{3})\s*\d+(?:\.\d{1,2})?\s*", text):
            raise ValueError("Bundle-Preis nicht prüfbar")
        betrag, waehrung = preis(text)
        angebot = produkt.setdefault("offers", {"@type": "Offer"})
        if not isinstance(angebot, dict) or angebot.get("@type") != "Offer":
            raise ValueError("Bundle-Angebot nicht eindeutig")
        angebot.update(price=betrag, priceCurrency=waehrung, url=quelle["buy"])
    if any(anzahl != 1 for anzahl in gefunden.values()):
        raise ValueError("Bundle nicht eindeutig in Suchdaten zugeordnet")
    payload = json.dumps(daten, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    return html[:b.start(2)] + payload + html[b.end(2):]


def ersatzkatalog(produkte: list, quelle="data/shop-products.json", variable="ABAN_SHOP") -> str:
    daten = json.dumps(produkte, ensure_ascii=False, indent=2)
    for zeichen in ("<", ">", "&", "\u2028", "\u2029"):
        daten = daten.replace(zeichen, "\\u" + format(ord(zeichen), "04x"))
    return (f"// Automatisch aus {quelle} erzeugt; nicht von Hand pflegen.\n"
            "// Ohne Konto- oder Preisänderung: Ersatzanzeige für einen fehlgeschlagenen Produktabruf.\n"
            "// Aktualisieren: python3 tools/shop_jsonld.py\nwindow." + variable + " = " + daten + ";\n")


def main() -> int:
    html = SHOP.read_text(encoding="utf-8")
    produkte = json.loads(DATEN.read_text(encoding="utf-8"))
    neu = neu_schreiben(html, produkte)
    ersatz = ersatzkatalog(produkte)
    en_produkte = json.loads(EN_DATEN.read_text(encoding="utf-8"))
    en_ersatz = ersatzkatalog(en_produkte, "data/shop-products-en.json", "ABAN_SHOP_EN")
    en_neu = bundle_angebote_schreiben(EN_SHOP.read_text(encoding="utf-8"), en_produkte)
    dateien = [(SHOP, neu), (EN_SHOP, en_neu), (FALLBACK, ersatz), (EN_FALLBACK, en_ersatz)]
    veraltet = [pfad for pfad, text in dateien
                if not pfad.exists() or pfad.read_text(encoding="utf-8") != text]
    if "--pruefen" in sys.argv:
        print("Shop-Anzeigen aktuell" if not veraltet else "Veraltet: " + ", ".join(
            str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p) for p in veraltet))
        return 1 if veraltet else 0
    for pfad, text in dateien:
        if pfad in veraltet:
            pfad.write_text(text, encoding="utf-8")
    print(f"→ Shop-Anzeigen: {len(produkte)} DE- und {len(en_produkte)} EN-Katalogeinträge aus ihren eigenen Quellen")
    return 0


if __name__ == "__main__":
    sys.exit(main())
