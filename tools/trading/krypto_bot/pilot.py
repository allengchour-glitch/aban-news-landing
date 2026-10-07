#!/usr/bin/env python3
"""Krypto-Pilot — Bitcoin-Futures mit Trendrichtung, Schwankungsziel, Börsen-Stop und Lügendetektor.

  python3 tools/trading/krypto_bot/pilot.py --status            # was der Pilot heute tun würde
  python3 tools/trading/krypto_bot/pilot.py --lauf --trocken    # Aufträge nur anzeigen
  python3 tools/trading/krypto_bot/pilot.py --lauf              # handeln (Testnetz, solange nicht doppelt freigegeben)
  python3 tools/trading/krypto_bot/pilot.py --backtest          # ehrlicher Test der Regel (Futures-Modell)

Einstellungen: KRYPTO_MAX_HEBEL (1, höchstens 2) · KRYPTO_SHORT (1 = auch short, 0 = nur long) · Schlüssel siehe
broker_futures.py. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent))
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import lern_bot as L  # noqa: E402
import pilot_kern as K  # noqa: E402

ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "krypto-pilot.json"


def abgeschlossen(reihe, jetzt=None):
    heute = (jetzt or datetime.now(timezone.utc)).date().isoformat()
    return [x for x in reihe if x[0] < heute]


def entscheid(offline=False, env=None, jetzt=None):
    env = os.environ if env is None else env
    short = (env.get("KRYPTO_SHORT") or "1").strip() != "0"
    try:
        hebel = min(K.HEBEL_HART, max(0.0, float(env.get("KRYPTO_MAX_HEBEL") or "1")))
    except ValueError:
        hebel = 1.0
    reihe = abgeschlossen(L.kurse("BTC-USD", offline), jetzt)
    p = [x[1] for x in reihe]
    z = K.roh_hebel(p, short, hebel)
    ok, skill, dd = K.detektor(z, p, len(p) - 1)
    s200 = K.sma(p, 200)[-1]
    vol = K.schwankung(p)[-1]
    return {"stand": reihe[-1][0], "kurs": round(p[-1], 2), "hebel": round(z[-1], 3), "schnitt200": round(s200, 2) if s200 else None,
            "schwankung": round(vol, 4) if vol else None, "short_erlaubt": short, "max_hebel": hebel,
            "detektor": {"ok": ok, "skill_2j": skill, "einbruch_1j": round(dd, 4) if dd is not None else None},
            "stop_long": K.stop_kurs(p, 1), "stop_short": K.stop_kurs(p, -1)}


def text(e):
    r = "LONG" if e["hebel"] > 0 else "SHORT" if e["hebel"] < 0 else "FLACH"
    kurs = f"{e['kurs']:,.0f}".replace(",", "'")
    d = e["detektor"]
    zeile = (f"🛩️ Krypto-Pilot {e['stand']}: {r} {abs(e['hebel']):.2f}× · BTC {kurs} USD · "
             f"{'über' if e['schnitt200'] and e['kurs'] > e['schnitt200'] else 'unter'} 200-Tage-Schnitt · Schwankung {e['schwankung'] * 100:.0f} %/Jahr")
    if d["skill_2j"] is not None:
        zeile += f"\nLügendetektor: Regel schlug in den letzten 2 Jahren {d['skill_2j'] * 100:.0f} % der Zufallskopien"
        zeile += "" if d["ok"] else " — ⚠️ WARNUNG: Vorteil zurzeit nicht belegt (Pilot handelt trotzdem; Not-Aus: stop.bat)"
    return zeile


def lies():
    return json.loads(LOGBUCH.read_text(encoding="utf-8")) if LOGBUCH.exists() else {"version": 1, "entscheide": []}


def backtest():
    import futures as F
    tage, h, l, c = F.lade()
    z = K.roh_hebel(c)
    print("Krypto-Pilot (Trend 200 Long/Short, Schwankungsziel 40 %, max 1×) im Futures-Modell, Funding 0,01 % je 8 h:")
    for start in ("2015-01-01", "2018-01-01", "2022-01-01"):
        a = next(i for i, t in enumerate(tage) if t >= start)
        for name, zz in (("Pilot", z), ("Long 1×", [1.0] * len(c))):
            x, liq, geb, fund = F.lauf(zz, h, l, c, a, len(c), 0.0001)
            k = F.kennz(x, tage)
            print(f"  ab {start} {name:8} {k['cagr'] * 100:6.1f} %/Jahr  schlimmster Einbruch {k['einbruch'] * 100:4.0f} %" + (f"  LIQUIDIERT {tage[liq]}" if liq else ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--lauf", action="store_true")
    ap.add_argument("--trocken", action="store_true")
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--backtest", action="store_true")
    a = ap.parse_args()
    if a.backtest:
        backtest()
        return 0
    if not (a.status or a.lauf):
        ap.print_help()
        return 0
    e = entscheid(a.offline)
    t = text(e)
    print(t)
    if a.status:
        return 0
    lb = lies()
    vorher = lb["entscheide"][-1] if lb["entscheide"] else None
    if not vorher or vorher["stand"] != e["stand"]:
        lb["entscheide"] = (lb["entscheide"] + [e])[-2000:]
        LOGBUCH.parent.mkdir(exist_ok=True)
        LOGBUCH.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    import broker_futures as BF
    auftraege = BF.ausfuehren(e, trocken=a.trocken)
    wechsel = vorher is None or (vorher["hebel"] > 0) != (e["hebel"] > 0) or (vorher["hebel"] < 0) != (e["hebel"] < 0) \
        or vorher["detektor"]["ok"] != e["detektor"]["ok"]
    if auftraege or wechsel:
        import signale as SG
        SG.push(t + ("\nAufträge: " + ", ".join(f"{x['seite']} {x['menge']}" for x in auftraege) if auftraege else "") + "\nKeine Anlageberatung.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
