#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Stripe-Shop autonom einrichten (no-op-sicher).

Für jedes Kit aus data/kit-catalog.json wird per Stripe-API (im Gegensatz zu Lemon
Squeezy erlaubt Stripe das!) idempotent angelegt:
  - Produkt + Preis (EUR)
  - Payment Link (Checkout) mit Redirect auf die Danke-Seite (geschützter Download)

Ergebnis: data/shop-products.json (liest shop.html) + data/stripe-state.json (IDs, idempotent).
Die Download-Datei wird unter einem mit DOWNLOAD_SALT gehashten Namen ausgeliefert
(unrätbar) — die Cloudflare-Function functions/api/kit-download.js gibt sie erst nach
verifizierter Stripe-Zahlung frei.

No-op ohne STRIPE_API_KEY (Exit 0).

    python3 automation/stripe_sync.py
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CATALOG = REPO / "data" / "kit-catalog.json"
STATE = REPO / "data" / "stripe-state.json"
OUT = REPO / "data" / "shop-products.json"
SITE = os.environ.get("ABAN_SITE_URL", "https://abannews.com").rstrip("/")
API = "https://api.stripe.com/v1"


def dl_hash(slug: str, salt: str) -> str:
    return hashlib.sha256(f"{slug}:{salt}".encode("utf-8")).hexdigest()[:24]


def stripe(path: str, params: list[tuple], key: str) -> dict:
    data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(f"{API}{path}", data=data,
                                 headers={"Authorization": f"Bearer {key}",
                                          "Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> int:
    import argparse
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--catalog", default=str(CATALOG))
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--state", default=str(STATE))
    ap.add_argument("--danke", default="/danke-kit.html", help="Redirect-Ziel nach Kauf")
    args = ap.parse_args()
    catalog_path, out_path, state_path = Path(args.catalog), Path(args.out), Path(args.state)

    key = os.environ.get("STRIPE_API_KEY", "").strip()
    if not catalog_path.exists():
        print(f"Kein {catalog_path} — nichts zu tun.")
        return 0
    salt = os.environ.get("DOWNLOAD_SALT", "").strip()
    if not salt:
        print("::warning::DOWNLOAD_SALT fehlt — Download-Namen wären rätbar. Setze ein Secret DOWNLOAD_SALT.")
    if not key:
        # WICHTIG (Lehre 2026-06-11): KEINE Stripe-Calls, aber die Shop-Datei TROTZDEM
        # vollständig aus Katalog + bekanntem Status neu schreiben. So kann ein fehlender
        # ODER falscher Key (z. B. Publishable statt Secret → 403 secret_key_required) den
        # Shop NIE mehr leeren — neue/unbestätigte Produkte erscheinen als „bald verfügbar".
        print("STRIPE_API_KEY nicht gesetzt → keine Stripe-Calls; Shop-Datei wird "
              "non-destruktiv aus Katalog + Status neu geschrieben.")
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {}
    products = []
    SYM = {"eur": "€", "chf": "CHF ", "usd": "$"}
    created = 0
    for kit in catalog:
        slug, title = kit["slug"], kit["title"]
        cents = int(kit["price_cents"])
        cur = kit.get("currency", "eur").lower()
        if key:
            try:
                if slug not in state or state[slug].get("currency") != cur:
                    prod = stripe("/products", [("name", title), ("metadata[slug]", slug)], key)
                    price = stripe("/prices", [("product", prod["id"]), ("unit_amount", str(cents)),
                                               ("currency", cur)], key)
                    # Zahlarten kommen automatisch aus den Dashboard-Einstellungen
                    # (Karte immer; TWINT erscheint bei CHF, sobald im Stripe-Dashboard aktiviert).
                    link = stripe("/payment_links", [
                        ("line_items[0][price]", price["id"]), ("line_items[0][quantity]", "1"),
                        ("metadata[slug]", slug),
                        ("after_completion[type]", "redirect"),
                        ("after_completion[redirect][url]",
                         f"{SITE}{args.danke}?slug={slug}&session_id={{CHECKOUT_SESSION_ID}}")], key)
                    state[slug] = {"product": prod["id"], "price": price["id"],
                                   "link": link["url"], "cents": cents, "currency": cur}
                    created += 1
                    print(f"✓ Stripe angelegt: {slug} ({cur.upper()}) → {link['url']}")
                else:
                    print(f"• schon da: {slug}")
            except urllib.error.HTTPError as e:
                # NICHT mehr 'continue' → Produkt bleibt als 'bald verfügbar' gelistet (nicht entfernt).
                print(f"::warning::Stripe {slug} HTTP {e.code}: {e.read().decode('utf-8','ignore')[:160]} "
                      "(bleibt als 'bald verfügbar' gelistet)")
            except Exception as e:  # noqa: BLE001
                print(f"::warning::Stripe {slug}: {e} (bleibt als 'bald verfügbar' gelistet)")
        sym = SYM.get(cur, cur.upper() + " ")
        # Kaufbar nur, wenn ein bestätigter Stripe-Link im Status liegt; sonst leer → „bald verfügbar".
        buy = state.get(slug, {}).get("link", "")
        entry = {"slug": slug, "title": title, "desc": kit.get("desc", ""),
                 "price": f"{sym}{cents/100:.0f}", "buy": buy}
        if kit.get("bundle"):
            entry["bundle"] = True
        products.append(entry)

    # Bundle-Angebote zuerst anzeigen (Spar-Angebot oben).
    products.sort(key=lambda p: 0 if p.get("bundle") else 1)

    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    out_path.write_text(json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    buyable = sum(1 for p in products if p["buy"])
    print(f"✓ {len(products)} Produkt(e) im Shop ({buyable} kaufbar, {len(products)-buyable} 'bald verfügbar')"
          f"{f', {created} neu angelegt' if created else ''} → {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
