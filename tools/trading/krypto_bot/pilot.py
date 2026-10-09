#!/usr/bin/env python3
"""Krypto-Pilot — Bitcoin- und Ethereum-Futures mit Trendrichtung, Schwankungsziel, Börsen-Stop und Lügendetektor.

  python3 tools/trading/krypto_bot/pilot.py --status            # was der Pilot heute tun würde
  python3 tools/trading/krypto_bot/pilot.py --lauf --trocken    # Aufträge nur anzeigen
  python3 tools/trading/krypto_bot/pilot.py --lauf              # handeln (Testnetz, solange nicht doppelt freigegeben)
  python3 tools/trading/krypto_bot/pilot.py --bericht           # Kontostand-Verlauf aus dem Logbuch
  python3 tools/trading/krypto_bot/pilot.py --backtest          # ehrlicher Test der Regel (Futures-Modell mit Stop)

Märkte: KRYPTO_PILOT_MAERKTE (Standard «BTC,ETH», je gleicher Anteil; «BTC» = nur Bitcoin).
Trend-Schnitt je Coin: Bitcoin 150 Tage, Ethereum 200 Tage (pilot_pruefung.py, Regel vorab festgelegt).
MVRV-Bremse: kein Short, solange der Kurs unter dem Einstandswert aller Coins liegt (MVRV < 1). Die übrigen freien
Markt-Infos (Angst & Gier, Funding, VIX, Dollar, Zins, Notenbank, Stablecoins) erscheinen nur als Lagebild — sie
bestanden den Test in info_pruefung.py nicht und beeinflussen keinen Auftrag.
Einstellungen: Risiko-Stufe 1 / 1,5 / 2 (Cockpit-Knopf oder KRYPTO_RISIKO; hebel_pruefung.py) · KRYPTO_SHORT (1 = auch short, 0 = nur long) · Schlüssel siehe
broker_futures.py. Einmal pro Woche kommt der Kontostand als Push (Telegram/ntfy). Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.path.insert(0, str(HIER.parent))
sys.path.insert(0, str(HIER.parent / "ki_bot"))
import lern_bot as L  # noqa: E402
import pilot_kern as K  # noqa: E402

ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "krypto-pilot.json"
# Pause (Cockpit-Schalter «Auto-Handel aus»): nichts handeln, Positionen bleiben. Nicht zu verwechseln mit STOP (Not-Aus):
# bei STOP schliesst der Pilot seine Positionen (broker_futures, nur reduceOnly).
PAUSE = HIER.parent / "ki_bot" / "PAUSE"
# Kürzel → (Futures-Symbol, Yahoo-Kürzel, Trend-Schnitt in Tagen)
MAERKTE = {"BTC": ("BTCUSDT", "BTC-USD", 150), "ETH": ("ETHUSDT", "ETH-USD", 200)}


def fmt_zahl(x, stellen=0):
    return f"{x:,.{stellen}f}".replace(",", "'")


def maerkte(env=None):
    env = os.environ if env is None else env
    roh = (env.get("KRYPTO_PILOT_MAERKTE") or "BTC,ETH").upper()
    gewaehlt = [m.strip() for m in roh.split(",") if m.strip() in MAERKTE]
    return list(dict.fromkeys(gewaehlt)) or ["BTC"]


def abgeschlossen(reihe, jetzt=None):
    heute = (jetzt or datetime.now(timezone.utc)).date().isoformat()
    return [x for x in reihe if x[0] < heute]


def mvrv_stand(markt, stand, mvrv=None):
    """MVRV vom Vortag der Entscheidung (wie im Test). Veraltet (> 5 Tage) oder nicht erreichbar → None."""
    try:
        import infos as I
        if mvrv is None:
            mvrv = I.reihe(f"mvrv_{markt.lower()}")
        tag, wert = I.stand(mvrv, stand, 1)
    except Exception:  # noqa: BLE001
        return None, None
    if tag is None or (date.fromisoformat(stand) - date.fromisoformat(tag)).days > 5:
        return tag, None
    return tag, wert


def entscheid(markt="BTC", offline=False, env=None, jetzt=None, kurse=None, mvrv=None):
    env = os.environ if env is None else env
    symbol, yahoo, n = MAERKTE[markt]
    short = (env.get("KRYPTO_SHORT") or "1").strip() != "0"
    r = K.risiko(None if env is os.environ else env)
    hebel = r["max_hebel"]
    reihe = abgeschlossen(kurse if kurse is not None else L.kurse(yahoo, offline), jetzt)
    p = [x[1] for x in reihe]
    z = K.roh_hebel(p, short, hebel, n, r["ziel_vol"])
    ok, skill, dd = K.detektor(z, p, len(p) - 1)
    schnitt = K.sma(p, n)[-1]
    vol = K.schwankung(p)[-1]
    m_tag, m_wert = mvrv_stand(markt, reihe[-1][0], mvrv)
    ziel = K.mvrv_bremse(z[-1], m_wert)
    return {"markt": markt, "symbol": symbol, "stand": reihe[-1][0], "kurs": round(p[-1], 2), "hebel": round(ziel, 3),
            "hebel_roh": round(z[-1], 3), "mvrv": {"tag": m_tag, "wert": round(m_wert, 3) if m_wert is not None else None},
            "bremse": "MVRV unter 1: kein Short" if ziel != z[-1] else None, "trend_tage": n, "schnitt": round(schnitt, 2) if schnitt else None,
            "schwankung": round(vol, 4) if vol else None, "short_erlaubt": short, "max_hebel": hebel, "risiko": r["stufe"],
            "detektor": {"ok": ok, "skill_2j": skill, "einbruch_1j": round(dd, 4) if dd is not None else None},
            "stop_long": K.stop_kurs(p, 1), "stop_short": K.stop_kurs(p, -1)}


def text(e):
    r = "LONG" if e["hebel"] > 0 else "SHORT" if e["hebel"] < 0 else "FLACH"
    d = e["detektor"]
    lage = "über" if e["schnitt"] and e["kurs"] > e["schnitt"] else "unter"
    zeile = (f"🛩️ {e['markt']} {e['stand']}: {r} {abs(e['hebel']):.2f}× · {fmt_zahl(e['kurs'])} USD · "
             f"{lage} {e['trend_tage']}-Tage-Schnitt · Schwankung {e['schwankung'] * 100:.0f} %/Jahr")
    if e.get("mvrv", {}).get("wert") is not None:
        zeile += f" · MVRV {e['mvrv']['wert']:.2f} ({e['mvrv']['tag']})"
    elif e.get("mvrv"):
        zeile += " · MVRV fehlt/veraltet (Grundregel ohne Bremse)"
    if e.get("bremse"):
        zeile += f"\n   🛑 {e['bremse']} (Trend sagt short {abs(e['hebel_roh']):.2f}×, Pilot bleibt flach)"
    if d["skill_2j"] is not None:
        zeile += f"\n   Lügendetektor: Regel schlug in den letzten 2 Jahren {d['skill_2j'] * 100:.0f} % der Zufallskopien"
        zeile += "" if d["ok"] else " — ⚠️ WARNUNG: Vorteil zurzeit nicht belegt (Pilot handelt trotzdem; Not-Aus: stop.bat)"
    return zeile


def lies():
    lb = json.loads(LOGBUCH.read_text(encoding="utf-8")) if LOGBUCH.exists() else {}
    lb.setdefault("entscheide", [])
    lb.setdefault("kontostand", [])
    lb["version"] = 2
    return lb


def letzter(lb, markt):
    """Letzter Entscheid für diesen Markt (Einträge aus Version 1 ohne «markt» waren Bitcoin)."""
    for e in reversed(lb["entscheide"]):
        if e.get("markt", "BTC") == markt:
            return e
    return None


def kontostand_merken(lb, tag, kapital):
    if kapital is None:
        return
    ks = [x for x in lb["kontostand"] if x["tag"] != tag]
    lb["kontostand"] = (ks + [{"tag": tag, "kapital": round(float(kapital), 2)}])[-1500:]


def wochenbericht(lb, heute, erzwingen=False):
    """Text mit Kontostand gegen Start, Vorwoche und Höchststand — höchstens alle 7 Tage (sonst None)."""
    ks = lb["kontostand"]
    if not ks:
        return None
    letzt = lb.get("letzter_bericht")
    if not erzwingen and letzt and (date.fromisoformat(heute) - date.fromisoformat(letzt)).days < 7:
        return None
    jetzt, start = ks[-1]["kapital"], ks[0]["kapital"]
    vor7 = [x for x in ks if (date.fromisoformat(ks[-1]["tag"]) - date.fromisoformat(x["tag"])).days >= 7]
    spitze = max(x["kapital"] for x in ks)

    def pct(a, b):
        return f"{(a / b - 1) * 100:+.1f} %" if b else "—"

    t = f"📒 Krypto-Pilot Wochenbericht {heute}\nKonto: {fmt_zahl(jetzt, 2)} USDT"
    t += f"\nseit Start ({ks[0]['tag']}): {pct(jetzt, start)}"
    if vor7:
        t += f" · seit Vorwoche: {pct(jetzt, vor7[-1]['kapital'])}"
    t += f" · unter Höchststand: {pct(jetzt, spitze)}"
    if not erzwingen:
        lb["letzter_bericht"] = heute
    return t


def backtest():
    """BTC 150 + ETH 200 (je 50 %) mit und ohne MVRV-Bremse, gegen nur Bitcoin und Halten — mit Börsen-Stop und Schlupf."""
    import info_pruefung as IP
    import pilot_pruefung as P
    btc, eth = P.ohlc("BTC-USD"), P.ohlc("ETH-USD")
    tage, ((hb, lb_, cb), (he, le, ce)) = P.ausrichten([btc, eth])
    zb150, zb200, ze = K.roh_hebel(cb, n_sma=150), K.roh_hebel(cb, n_sma=200), K.roh_hebel(ce, n_sma=200)
    zb_m = IP.filter_z(zb150, *IP.bremsen("mvrv_tief", IP.flaggen("btc", tage)))
    ze_m = IP.filter_z(ze, *IP.bremsen("mvrv_tief", IP.flaggen("eth", tage)))
    print("Krypto-Pilot im Futures-Modell (Gebühr 0,05 %, Funding 0,01 % je 8 h, Stop 4σ mit 0,1 % Schlupf, Liquidation):")
    for start in ("2019-01-01", "2022-01-01"):
        a = next(i for i, t in enumerate(tage) if t >= start)
        wb, _ = P.lauf(zb150, hb, lb_, cb, a, len(cb), K.STOP_SIGMA)
        we, _ = P.lauf(ze, he, le, ce, a, len(ce), K.STOP_SIGMA)
        wbm, _ = P.lauf(zb_m, hb, lb_, cb, a, len(cb), K.STOP_SIGMA)
        wem, _ = P.lauf(ze_m, he, le, ce, a, len(ce), K.STOP_SIGMA)
        alt, _ = P.lauf(zb200, hb, lb_, cb, a, len(cb), K.STOP_SIGMA)
        halten, _ = P.lauf([1.0] * len(cb), hb, lb_, cb, a, len(cb))
        varianten = {"+ MVRV-Bremse (live)": [0.5 * x + 0.5 * y for x, y in zip(wbm, wem)],
                     "BTC 150 + ETH 200": [0.5 * x + 0.5 * y for x, y in zip(wb, we)], "nur BTC 150": wb,
                     "nur BTC 200 (bisher)": alt, "BTC long 1× halten": halten}
        print(f"\n  ab {start} bis {tage[-1]}:")
        for name, w in varianten.items():
            k = P.kennz(w)
            print(f"    {name:26} {k['cagr'] * 100:6.1f} %/Jahr  schlimmster Einbruch {k['einbruch'] * 100:4.0f} %  "
                  f"Rendite÷Einbruch {k['mar']:.2f}")
    print("\nVergangenheit ist keine Garantie. Die Trendlängen wurden aus 5 Kandidaten gewählt — eine kleine Auswahl-Verzerrung bleibt.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--lauf", action="store_true")
    ap.add_argument("--trocken", action="store_true")
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--bericht", action="store_true")
    ap.add_argument("--backtest", action="store_true")
    a = ap.parse_args()
    if a.backtest:
        backtest()
        return 0
    if a.bericht:
        print(wochenbericht(lies(), date.today().isoformat(), erzwingen=True) or "Noch kein Kontostand im Logbuch — erst ein --lauf.")
        return 0
    if not (a.status or a.lauf):
        ap.print_help()
        return 0
    ents = [entscheid(m, a.offline) for m in maerkte()]
    for e in ents:
        print(text(e))
    try:
        import infos as I
        lage = "Lagebild (nur Info, handelt nicht danach): " + I.text(I.lagebild())
    except Exception as ex:  # noqa: BLE001
        lage = f"Lagebild nicht verfügbar ({type(ex).__name__})"
    print(lage)
    if a.status:
        return 0
    if PAUSE.exists() and not a.trocken:
        print("Auto-Handel ist aus (Pause) — nichts gehandelt. Einschalten im Cockpit oder mit weiter.bat.")
        return 0
    import sperre
    try:
        with sperre.lauf_sperre(warten=0 if a.trocken else 120):
            return handeln(ents, lage, a.trocken)
    except sperre.Besetzt as ex:
        print(f"{ex} Dieser Lauf handelt nicht — einfach später nochmals starten.")
        return 0


def handeln(ents, lage, trocken):
    """Aufträge je Markt. Ein Fehler in einem Markt hält den anderen nicht auf; Warnungen kommen immer aufs Handy."""
    import broker_futures as BF
    lb = lies()
    zeilen, wechsel_da, alle, warnung = [], False, [], False
    for e in ents:
        vorher = letzter(lb, e["markt"])
        if not vorher or vorher["stand"] != e["stand"]:
            lb["entscheide"] = (lb["entscheide"] + [e])[-4000:]
        try:
            auftraege = BF.ausfuehren(e, trocken=trocken, symbol=e["symbol"], gewicht=1 / len(ents))
        except Exception as ex:  # noqa: BLE001 — darf den nächsten Markt und die Nachricht nie verhindern
            auftraege = []
            e["broker"] = {"hinweis": f"⚠️ Lauf abgebrochen ({type(ex).__name__}: {str(ex)[:150]}) — bitte im Binance-Konto prüfen!",
                           "position": None, "ohne_stop": None, "fehler": True}
        alle += auftraege
        b = e.get("broker") or {}
        hinweis = b.get("hinweis") if b.get("hinweis") and b.get("hinweis") != "keine Futures-Schlüssel" else ""
        warnung = warnung or bool(b.get("ohne_stop") or b.get("fehler") or "⚠️" in hinweis)
        wechsel = vorher is None or (vorher["hebel"] > 0) != (e["hebel"] > 0) or (vorher["hebel"] < 0) != (e["hebel"] < 0) \
            or vorher["detektor"]["ok"] != e["detektor"]["ok"]
        wechsel_da = wechsel_da or wechsel
        zeilen.append(text(e) + ("\n   Aufträge: " + ", ".join(f"{x['seite']} {x['menge']}" + (" ✗" if x.get("fehler") else "")
                                                             for x in auftraege) if auftraege else "")
                      + (f"\n   {hinweis}" if hinweis else ""))
    if not trocken:
        kontostand_merken(lb, ents[0]["stand"], ents[0].get("kapital"))
    bericht = None if trocken else wochenbericht(lb, date.today().isoformat())
    LOGBUCH.parent.mkdir(exist_ok=True)
    LOGBUCH.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if alle or wechsel_da or bericht or warnung:
        import signale as SG
        SG.push("\n".join(zeilen) + f"\n{lage}" + (f"\n\n{bericht}" if bericht else "") + "\nKeine Anlageberatung.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
