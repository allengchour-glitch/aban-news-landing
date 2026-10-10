#!/usr/bin/env python3
"""Status des täglichen Laufs (krypto-auto.bat) festhalten — fürs Cockpit und, bei Fehlern, aufs Handy.

  py tools/trading/krypto_bot/meldung.py --ok "alles gelaufen"
  py tools/trading/krypto_bot/meldung.py --fehler "Selbsttest test_pilot fehlgeschlagen" --push

Schreibt data/krypto-auto-status.json {zeit, ok, text}. Mit --push geht der Text zusätzlich an Telegram/ntfy
(falls eingerichtet). Ohne --push nur die Datei: Pilot und Sammler melden ihre Warnungen schon selbst.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER.parent / "ki_bot"))
DATEI = HIER.parents[2] / "data" / "krypto-auto-status.json"


def merken(ok, text, push=False, datei=None, sender=None):
    datei = Path(datei) if datei else DATEI
    eintrag = {"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"), "ok": bool(ok), "text": text[:500]}
    datei.parent.mkdir(parents=True, exist_ok=True)
    tmp = datei.with_name(datei.name + f".tmp{os.getpid()}")
    tmp.write_text(json.dumps(eintrag, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, datei)
    if push:
        if sender is None:
            import signale as SG
            sender = SG.push
        sender(("✅ " if ok else "⚠️ ") + "Krypto täglicher Lauf: " + text + "\nDetails: data\\krypto-auto.log · Keine Anlageberatung.")
    return eintrag


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--ok", metavar="TEXT")
    g.add_argument("--fehler", metavar="TEXT")
    ap.add_argument("--push", action="store_true")
    a = ap.parse_args()
    e = merken(a.ok is not None, (a.ok if a.ok is not None else a.fehler).strip(), a.push)
    print(("Status: ok — " if e["ok"] else "Status: FEHLER — ") + e["text"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
