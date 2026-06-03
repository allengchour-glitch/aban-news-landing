#!/usr/bin/env python3
"""Listing-Generator für luxestyle.ch (Shopify).

Macht aus data/produkte.json fertige Produkt-Entwürfe:
  - shopify-import.csv   (direkt in Shopify: Produkte → Importieren)
  - listings.md          (lesbare Vorschau zum Drüberschauen)

Preis: nur gesetzt, wenn beim Produkt echte 'gramm' + 'druckzeit_h' (aus Bambu
Studio) hinterlegt sind — dann rechnet preis_rechner.py den CHF-Preis. Fehlt das,
bleibt der Preis leer und das Produkt geht als Entwurf rein ('Preis folgt').
KEIN erfundener Preis.

Alle Produkte werden als **Entwurf (draft)** exportiert — live schalten machst nur
du im Shopify-Admin, nach Foto + Preis-Check.

Ton: du-Form, ehrlich, keine Werbe-Floskeln (Aban-/LuxeStyle-Voice).

Nutzung:
  python3 listing_generator.py            # -> dist/shopify-import.csv + dist/listings.md
  python3 listing_generator.py --out /tmp/preview
"""
import csv, html, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import preis_rechner as pr  # noqa: E402

VENDOR = "LuxeStyle"


def body_html(p):
    """Anti-Hype-Beschreibung als HTML — schlicht, ehrlich, du-Form."""
    parts = [f"<p>{html.escape(p['kurz'])}</p>"]
    if p.get("punkte"):
        lis = "".join(f"<li>{html.escape(x)}</li>" for x in p["punkte"])
        parts.append(f"<ul>{lis}</ul>")
    parts.append(
        "<p>Jedes Stück wird nach deiner Bestellung einzeln in der Schweiz gefertigt — "
        "kein Lagerartikel, kein Massenprodukt. Deshalb dauert es ein paar Tage, dafür "
        "bekommst du genau deine Farbe und deinen Text.</p>"
    )
    return "".join(parts)


def preis_fuer(p, cfg, aufschlag=1.0):
    g, z = p.get("gramm"), p.get("druckzeit_h")
    if g is None or z is None:
        return ""  # leer -> Entwurf ohne Preis
    r = pr.rechne(g * aufschlag, z * aufschlag, cfg, arbeit_min=8.0)
    return f"{r['preis']:.2f}"


def rows_for(p, cfg):
    """Eine Zeile je Variante (Shopify-Format)."""
    handle = p["id"]
    body = body_html(p)
    tags = ", ".join(p.get("tags", []))
    typ = p.get("typ", "")
    img = p.get("bild") or ""
    if not img.startswith("http"):
        img = ""  # Shopify-Import braucht eine echte URL — lokale Pfade weglassen
    varianten = p.get("varianten") or ["Standard"]
    rows = []
    for i, v in enumerate(varianten):
        aufschlag = 1.2 if ("mehrfarbig" in v.lower() or "2-farbig" in v.lower()) else 1.0
        preis = preis_fuer(p, cfg, aufschlag)
        row = {
            "Handle": handle,
            "Title": p["name"] if i == 0 else "",
            "Body (HTML)": body if i == 0 else "",
            "Vendor": VENDOR if i == 0 else "",
            "Type": typ if i == 0 else "",
            "Tags": tags if i == 0 else "",
            "Published": "FALSE",                 # Entwurf — du schaltest live
            "Option1 Name": "Ausführung" if i == 0 else "",
            "Option1 Value": v,
            "Variant SKU": f"{handle}-{i+1}",
            "Variant Grams": str(int(round((p.get("gramm") or 0) * aufschlag))),
            "Variant Inventory Policy": "continue",
            "Variant Fulfillment Service": "manual",
            "Variant Price": preis,
            "Variant Requires Shipping": "TRUE",
            "Variant Taxable": "TRUE",
            "Image Src": img if i == 0 else "",
            "Status": "draft",
        }
        rows.append(row)
    return rows


COLUMNS = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
    "Option1 Name", "Option1 Value", "Variant SKU", "Variant Grams",
    "Variant Inventory Policy", "Variant Fulfillment Service", "Variant Price",
    "Variant Requires Shipping", "Variant Taxable", "Image Src", "Status",
]


def main():
    a = sys.argv[1:]
    out = Path(a[a.index("--out") + 1]) if "--out" in a else HERE / "dist"
    out.mkdir(parents=True, exist_ok=True)
    cfg = pr.load_config()
    data = json.loads((HERE / "data" / "produkte.json").read_text(encoding="utf-8"))
    produkte = data["produkte"]

    # CSV
    csv_path = out / "shopify-import.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        for p in produkte:
            for row in rows_for(p, cfg):
                w.writerow(row)

    # Markdown-Vorschau
    md = ["# LuxeStyle — Produkt-Entwürfe\n",
          "> Alle als **Entwurf** exportiert. Foto + Preis prüfen, dann im Shopify-Admin live schalten.\n"]
    ohne_preis = []
    for p in produkte:
        preis = preis_fuer(p, cfg)
        md.append(f"## {p['name']}  ·  _{p.get('typ','')}_")
        md.append(f"\n{p['kurz']}\n")
        if p.get("punkte"):
            md += [f"- {x}" for x in p["punkte"]]
        md.append(f"\n**Varianten:** {', '.join(p.get('varianten', []))}")
        if preis:
            md.append(f"**Preis (einfarbig, berechnet):** CHF {preis}")
        else:
            md.append("**Preis:** _folgt — gramm + druckzeit_h aus Bambu Studio in produkte.json eintragen_")
            ohne_preis.append(p["name"])
        md.append("")
    (out / "listings.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    print(f"✅ {len(produkte)} Produkte → {csv_path}")
    print(f"   Vorschau: {out / 'listings.md'}")
    if ohne_preis:
        print(f"\nℹ️  Noch ohne Preis (echte Werte messen): {', '.join(ohne_preis)}")
    print("\nNächster Schritt: Shopify-Admin → Produkte → Importieren → shopify-import.csv.\n"
          "Danach pro Produkt ein echtes Foto hochladen und (wo nötig) den Preis ergänzen,\n"
          "dann von 'Entwurf' auf 'Aktiv' stellen — das machst nur du.")


if __name__ == "__main__":
    main()
