#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Checkout-Links automatisch aus der Lemon-Squeezy-API ziehen + verdrahten.

Holt alle Produkte des Stores, matcht sie per Name auf die Config-Keys und schreibt
die `buy_now_url` (Hosted-Checkout) in js/checkout-config.js. So muss niemand Links
kopieren — sobald ein Produkt im LS-Store existiert, wird sein Button von selbst live.

No-op ohne LEMONSQUEEZY_API_KEY (Exit 0). Key NUR als GitHub-Secret/Env — nie im Repo.
WICHTIG: Die LS-API kann **keine neuen Produkte anlegen** (nur Dashboard). Dieses Skript
verdrahtet, was schon existiert, und sagt klar, welche Produkte noch fehlen.

    python3 automation/ls_sync_checkouts.py            # schreibt + Report
    python3 automation/ls_sync_checkouts.py --dry-run  # nur Report
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CONFIG = REPO / "js" / "checkout-config.js"
API = "https://api.lemonsqueezy.com/v1/products?page[size]=100"

# Config-Key ← Erkennung am Produktnamen (alles klein). Reihenfolge = Priorität.
MATCHERS = [
    ("MONITOR_ABO_URL", lambda n: "monitor" in n),
    ("PAKET_BUY_URL", lambda n: "paket" in n or "komplett" in n or "bundle" in n),
    ("DATENSATZ_ABO_URL", lambda n: "datensatz" in n and ("abo" in n or "monat" in n or "subscription" in n)),
    ("VORLAGEN_BUY_URL", lambda n: "vorlagen" in n or "klartext" in n),
    ("COMPLIANCE_BUY_URL", lambda n: "compliance" in n),
]


def fetch(url: str, key: str) -> dict:
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {key}", "Accept": "application/vnd.api+json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def all_products(key: str):
    url, out = API, []
    while url:
        d = fetch(url, key)
        out += d.get("data", [])
        url = (d.get("links") or {}).get("next")
    return out


def wire(key_name: str, url: str) -> bool:
    text = CONFIG.read_text(encoding="utf-8")
    new, n = re.subn(rf'({key_name}\s*:\s*)"[^"]*"', lambda m: m.group(1) + f'"{url}"', text)
    if n and new != text:
        CONFIG.write_text(new, encoding="utf-8")
        return True
    return False


def main() -> int:
    key = os.environ.get("LEMONSQUEEZY_API_KEY", "").strip()
    if not key:
        print("LEMONSQUEEZY_API_KEY nicht gesetzt — übersprungen (kein Fehler).")
        return 0
    dry = "--dry-run" in sys.argv

    try:
        products = all_products(key)
    except Exception as e:
        print(f"LS-API-Fehler: {e}")
        return 0  # Build nicht hart fehlschlagen lassen

    matched, unmatched = {}, []
    for p in products:
        a = p.get("attributes", {})
        name = (a.get("name") or "").strip()
        nlow = name.lower()
        buy = a.get("buy_now_url") or ""
        status = a.get("status", "")
        hit = next((k for k, fn in MATCHERS if fn(nlow)), None)
        if hit and buy and status == "published" and hit not in matched:
            matched[hit] = (name, buy)
        elif name:
            unmatched.append(f"{name} [{status}]")

    print("== Lemon-Squeezy-Produkte ==")
    print(f"  {len(products)} Produkt(e) im Store")
    changed = []
    for k, (name, buy) in matched.items():
        did = (not dry) and wire(k, buy)
        print(f"  ✅ {k} ← „{name}“  {'(verdrahtet)' if did else '(unverändert/dry-run)'}")
        if did:
            changed.append(k)
    if unmatched:
        print("  ℹ️ nicht zugeordnet (ggf. umbenennen, dann matcht es):")
        for u in unmatched:
            print(f"     – {u}")

    fehlend = [k for k, _ in MATCHERS if k not in matched]
    if fehlend:
        print("  🟡 noch KEIN passendes Produkt im Store (im Dashboard anlegen):")
        for k in fehlend:
            print(f"     – {k}")

    print(f"\nFertig. {len(changed)} Link(s) in js/checkout-config.js geschrieben.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
