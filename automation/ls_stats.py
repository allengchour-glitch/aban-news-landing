#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — echte Premium-Zahlen aus der Lemon-Squeezy-API (Build-in-Public).

Holt aktive Abos, schreibt `data/ls-stats.json` mit echten Werten:
{active, monthly, yearly, mrr_eur (geschätzt aus Listenpreisen), updated_at}.

No-op ohne LEMONSQUEEZY_API_KEY (Exit 0). Key NUR als GitHub-Secret/Env — NIE im Browser/Repo.
Ehrlich: MRR ist eine Schätzung aus den Listenpreisen (€9/Monat, €89/Jahr ≈ €7,42/Monat),
die Abozahl ist exakt aus der API.

    python3 automation/ls_stats.py
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "data" / "ls-stats.json"
API = "https://api.lemonsqueezy.com/v1/subscriptions?filter[status]=active&page[size]=100"
PRICE_MONTH = 9.0
PRICE_YEAR_PER_MONTH = 89.0 / 12.0


def fetch(url: str, key: str) -> dict:
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {key}",
        "Accept": "application/vnd.api+json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> int:
    key = os.environ.get("LEMONSQUEEZY_API_KEY", "").strip()
    if not key:
        print("LEMONSQUEEZY_API_KEY nicht gesetzt → no-op (Exit 0).")
        return 0

    active = monthly = yearly = 0
    url = API
    pages = 0
    try:
        while url and pages < 20:
            data = fetch(url, key)
            for sub in data.get("data", []):
                attr = sub.get("attributes", {})
                if attr.get("status") != "active":
                    continue
                active += 1
                name = (attr.get("variant_name", "") + " " + attr.get("product_name", "")).lower()
                if any(w in name for w in ("jahr", "year", "annual", "jähr")):
                    yearly += 1
                else:
                    monthly += 1
            url = (data.get("links") or {}).get("next")
            pages += 1
    except urllib.error.HTTPError as e:
        print(f"::warning::Lemon-Squeezy HTTP {e.code}: {e.read().decode('utf-8','ignore')[:200]}")
        return 0
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Lemon-Squeezy-Aufruf fehlgeschlagen: {e}")
        return 0

    mrr = round(monthly * PRICE_MONTH + yearly * PRICE_YEAR_PER_MONTH, 2)
    out = {"active": active, "monthly": monthly, "yearly": yearly,
           "mrr_eur_estimate": mrr, "currency": "EUR",
           "note": "Abozahl exakt aus Lemon-Squeezy-API; MRR geschätzt aus Listenpreisen.",
           "updated_at": dt.datetime.utcnow().isoformat(timespec="seconds") + "Z"}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✓ LS-Stats: {active} aktiv ({monthly} mtl. / {yearly} jährl.), ~€{mrr} MRR → {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
