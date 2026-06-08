#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Shop-Selbsttest (prüft die interne Konsistenz der Verkaufskette).

Verifiziert OHNE Netz/Live-Kauf, dass alles zusammenpasst:
  Katalog ↔ Live-Produkte (shop-products.json) ↔ geschützte Kit-ZIPs ↔ Download-Gate-Hash.

Mit gesetztem DOWNLOAD_SALT prüft es zusätzlich, dass jeder Kit-ZIP exakt den vom
Gate (functions/api/kit-download.js) erwarteten Namen `sha256(slug:salt)[:24].zip` trägt.

    python3 tools/shop_selfcheck.py
    DOWNLOAD_SALT=… python3 tools/shop_selfcheck.py   # zusätzlich Hash-Namen prüfen

Exit 0 = ok (ggf. mit Hinweisen), Exit 1 = harter Fehler (Kette gebrochen).
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
ok, warn, fail = [], [], []


def dl_hash(slug: str, salt: str) -> str:
    return hashlib.sha256(f"{slug}:{salt}".encode("utf-8")).hexdigest()[:24]


def main() -> int:
    # 1) Pflicht-Dateien der Verkaufskette
    for rel in ("data/kit-catalog.json", "shop.html", "danke-kit.html",
                "functions/api/kit-download.js"):
        (ok if (REPO / rel).exists() else fail).append(f"Datei {rel}")

    cat_path = REPO / "data" / "kit-catalog.json"
    if not cat_path.exists():
        _report()
        return 1
    catalog = json.loads(cat_path.read_text(encoding="utf-8"))
    cat_slugs = [k["slug"] for k in catalog]
    ok.append(f"Katalog: {len(cat_slugs)} Kits ({', '.join(cat_slugs)})")

    # 2) Live-Produkte (vom Stripe-Workflow erzeugt)
    sp = REPO / "data" / "shop-products.json"
    live = json.loads(sp.read_text(encoding="utf-8")) if sp.exists() else []
    live_slugs = {p["slug"] for p in live}
    for p in live:
        buy = str(p.get("buy", "")).strip()
        if not buy:
            # leer = bewusst „Bald verfügbar" (Shop zeigt sauberen Fallback) -> nur Hinweis
            warn.append(f"Produkt {p.get('slug')}: Bezahllink noch leer (zeigt 'Bald verfügbar')")
        elif not buy.startswith("https://"):
            fail.append(f"Produkt {p.get('slug')}: ungültiger Bezahllink")
    ok.append(f"Live-Produkte (shop-products.json): {len(live)}")
    for s in cat_slugs:
        if s not in live_slugs:
            warn.append(f"Kit '{s}' noch nicht live — Stripe-Shop-Workflow dafür noch laufen lassen")

    # 3) Geschützte ZIPs
    kits_dir = REPO / "downloads" / "kits"
    zips = {p.name for p in kits_dir.glob("*.zip")} if kits_dir.exists() else set()
    ok.append(f"Kit-ZIPs in downloads/kits/: {len(zips)}")

    # 4) Mit Salt: Gate-Hash-Namen exakt prüfen
    salt = os.environ.get("DOWNLOAD_SALT", "").strip()
    if salt:
        for s in live_slugs or cat_slugs:
            name = f"{dl_hash(s, salt)}.zip"
            (ok if name in zips else fail).append(
                f"ZIP für '{s}' ({name})" + ("" if name in zips else " FEHLT"))
    else:
        warn.append("DOWNLOAD_SALT nicht gesetzt → Hash-Namen der ZIPs nicht geprüft "
                    "(lokal optional; im CI/Cloudflare ist das Secret entscheidend)")

    _report()
    return 1 if fail else 0


def _report():
    for x in ok:
        print(f"  ✓ {x}")
    for x in warn:
        print(f"  ⚠ {x}")
    for x in fail:
        print(f"  ✗ {x}")
    print(f"\n{'✗ FEHLER' if fail else '✓ OK'}: "
          f"{len(ok)} ok · {len(warn)} Hinweise · {len(fail)} Fehler")


if __name__ == "__main__":
    sys.exit(main())
