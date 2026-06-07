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
    key = os.environ.get("STRIPE_API_KEY", "").strip()
    if not key:
        print("STRIPE_API_KEY nicht gesetzt → no-op (Exit 0). Key gehört in GitHub-Secrets.")
        return 0
    if not CATALOG.exists():
        print("Kein data/kit-catalog.json — nichts zu tun.")
        return 0
    salt = os.environ.get("DOWNLOAD_SALT", "").strip()
    if not salt:
        print("::warning::DOWNLOAD_SALT fehlt — Download-Namen wären rätbar. Setze ein Secret DOWNLOAD_SALT.")
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
    products = []
    SYM = {"eur": "€", "chf": "CHF ", "usd": "$"}
    for kit in catalog:
        slug, title = kit["slug"], kit["title"]
        cents = int(kit["price_cents"])
        cur = kit.get("currency", "eur").lower()
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
                     f"{SITE}/danke-kit.html?slug={slug}&session_id={{CHECKOUT_SESSION_ID}}")], key)
                state[slug] = {"product": prod["id"], "price": price["id"],
                               "link": link["url"], "cents": cents, "currency": cur}
                print(f"✓ Stripe angelegt: {slug} ({cur.upper()}) → {link['url']}")
            else:
                print(f"• schon da: {slug}")
        except urllib.error.HTTPError as e:
            print(f"::warning::Stripe {slug} HTTP {e.code}: {e.read().decode('utf-8','ignore')[:160]}")
            continue
        except Exception as e:  # noqa: BLE001
            print(f"::warning::Stripe {slug}: {e}")
            continue
        sym = SYM.get(cur, cur.upper() + " ")
        entry = {"slug": slug, "title": title, "desc": kit.get("desc", ""),
                 "price": f"{sym}{cents/100:.0f}", "buy": state[slug]["link"]}
        if kit.get("bundle"):
            entry["bundle"] = True
        products.append(entry)

    # Bundle-Angebote zuerst anzeigen (Spar-Angebot oben).
    products.sort(key=lambda p: 0 if p.get("bundle") else 1)

    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT.write_text(json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✓ {len(products)} Produkt(e) → data/shop-products.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
