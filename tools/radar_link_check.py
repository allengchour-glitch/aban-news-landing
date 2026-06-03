#!/usr/bin/env python3
"""Radar-Daten-Check — prüft die offiziellen Tool-URLs aller *-radar/data/anbieter.json
auf Erreichbarkeit (findet tote/umbenannte Anbieter, wie seinerzeit PlayHT/Tome).

Reine stdlib (urllib, threads). Defensiv: ohne Netz oder bei Einzelfehlern kein Crash.
Bekannte Anti-Bot-/WAF-Domains (403/503/Timeout trotz lebender Seite) werden als
„wahrscheinlich-ok (Bot-Sperre)" markiert, nicht als tot — sonst Falsch-Alarme.

Nutzung:
    python3 tools/radar_link_check.py                 # Report
    python3 tools/radar_link_check.py --fail-on-broken # Exit 1 bei echten toten Links (CI)
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (aban-radar linkcheck +https://abannews.com)"

# Domains, die Bots per WAF blocken (403/503/Timeout), obwohl die Seite lebt.
KNOWN_BOT_BLOCKERS = ("make.com", "azure.microsoft.com", "openai.com", "adobe.com",
                      "midjourney.com", "lusha.com", "freepik.com", "phind.com",
                      "ada.cx", "manychat.com", "bigbuy.eu", "vidaxl.com", "gelato.com")


def radar_data_files():
    for p in sorted(ROOT.glob("*-radar/data/anbieter.json")):
        yield p


def check(url: str):
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=12) as r:
                return r.status, ""
        except Exception as ex:
            last = f"{type(ex).__name__}: {str(ex)[:60]}"
    return None, last


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fail-on-broken", action="store_true")
    args = ap.parse_args()

    tasks = []
    for f in radar_data_files():
        radar = f.parts[-3]
        for t in json.loads(f.read_text(encoding="utf-8")).get("anbieter", []):
            if t.get("url"):
                tasks.append((radar, t["name"], t["url"]))

    if not tasks:
        print("Keine Radar-Daten gefunden.")
        return 0

    results = []
    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(check, u): (r, n, u) for r, n, u in tasks}
        for fut in futs:
            r, n, u = futs[fut]
            status, err = fut.result()
            results.append((r, n, u, status, err))

    broken, botblock = [], []
    for r, n, u, status, err in results:
        ok = status is not None and status < 400
        if ok:
            continue
        if any(d in u for d in KNOWN_BOT_BLOCKERS):
            botblock.append((r, n, u, status, err))
        else:
            broken.append((r, n, u, status, err))

    print(f"Geprüft: {len(tasks)} Tool-URLs aus {len(list(radar_data_files()))} Radars.")
    print(f"OK: {len(tasks)-len(broken)-len(botblock)} · Bot-Sperre (vermutlich ok): "
          f"{len(botblock)} · echte Probleme: {len(broken)}")
    for r, n, u, status, err in botblock:
        print(f"  ~ [{r}] {n}: {u} (WAF {status or err} — vermutlich ok)")
    for r, n, u, status, err in broken:
        print(f"  ✗ [{r}] {n}: {u} -> {status or ''} {err}")
    if not broken:
        print("Keine echten toten Tool-Links. ✅")

    return 1 if (broken and args.fail_on_broken) else 0


if __name__ == "__main__":
    sys.exit(main())
