#!/usr/bin/env python3
"""Funding-Ernte («Cash and Carry») ehrlich geprüft — Spot kaufen + gleich viel Perpetual-Future verkaufen.

    python3 tools/trading/krypto_bot/carry_pruefung.py          # Test (lädt fehlende Daten)
    python3 tools/trading/krypto_bot/carry_pruefung.py --json   # zusätzlich data/krypto-carry-pruefung.json

Idee (BIS Working Paper 1087 «Crypto carry», Schmeling/Schrimpf/Todorov): Die Position ist marktneutral — steigt Bitcoin,
gewinnt Spot, was der Short verliert. Übrig bleibt das Funding, das Longs an Shorts zahlen, solange es positiv ist.
Daten: ECHTE Binance-Fundingraten (data.binance.vision, alle 8 h) seit Januar 2020 — nicht ein angenommener Durchschnitt.

Regeln VORAB festgelegt (nichts danach angepasst):
  A «immer an»     BTC + ETH je zur Hälfte, Position immer offen.
  B «Filter»       BTC + ETH; offen nur, wenn der Funding-Schnitt der letzten 7 Tage (21 Zahlungen) > 0 war, sonst Bargeld.
  C «breit»        wie B, aber 8 grosse Coins (BTC ETH BNB XRP ADA DOGE LTC LINK), je 1/8 des Kapitals.
Entscheid mit Daten bis Vortag. Kosten je Ein- oder Ausstieg 0,15 % des Volumens (Spot 0,10 % + Future 0,05 %).
Kapital: 1,5 × Volumen (Spot voll bezahlt + 50 % Sicherheit für den Short). Bargeld bringt 0 %.
NICHT abgebildet (steht im Bericht): Abweichung Spot/Future-Kurs (Basis), Zinsen auf Bargeld, Börsenpleite (FTX 2022).
Entwicklung bis Ende 2021, gezählt wird der ungesehene Teil ab 2022. Keine Anlageberatung.
"""
from __future__ import annotations

import io
import json
import math
import sys
import urllib.request
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[2]
ORDNER = HIER.parent / "daten" / "funding"
ARCHIV = "https://data.binance.vision/data/futures/um/monthly/fundingRate/{s}/{s}-fundingRate-{m}.zip"
BREIT = ["BTC", "ETH", "BNB", "XRP", "ADA", "DOGE", "LTC", "LINK"]
KOSTEN = 0.0015          # je Ein- oder Ausstieg, auf das Volumen
KAPITAL_FAKTOR = 1.5     # Kapital pro Volumen
FENSTER = 21             # 7 Tage × 3 Zahlungen
START = "2020-01-01"
UNGESEHEN = "2022-01-01"


def monate(bis: date):
    j, m = 2020, 1
    while (j, m) <= (bis.year, bis.month):
        yield f"{j}-{m:02d}"
        j, m = (j + 1, 1) if m == 12 else (j, m + 1)


def lade_funding(coin: str) -> list[tuple[int, float]]:
    """[(Zeit ms, Rate), ...] aus den Monatsarchiven; zwischengespeichert, laufender Monat fehlt im Archiv."""
    s = coin + "USDT"
    ORDNER.mkdir(parents=True, exist_ok=True)
    datei = ORDNER / f"{s}.json"
    alt = {m: v for m, v in json.loads(datei.read_text()).items()} if datei.exists() else {}
    heute = datetime.now(timezone.utc).date()
    for m in monate(heute):
        if m in alt or m == heute.strftime("%Y-%m"):
            continue
        try:
            with urllib.request.urlopen(ARCHIV.format(s=s, m=m), timeout=30) as r:
                z = zipfile.ZipFile(io.BytesIO(r.read()))
            text = z.read(z.namelist()[0]).decode()
            zeilen = [x.split(",") for x in text.strip().splitlines() if x and x[0].isdigit()]
            alt[m] = [[int(x[0]), float(x[-1])] for x in zeilen]
        except urllib.error.HTTPError as ex:
            if ex.code == 404:
                alt[m] = []  # Kontrakt gab es noch nicht
            else:
                raise
    datei.write_text(json.dumps(alt))
    return sorted((t, r) for v in alt.values() for t, r in v)


def tagesfunding(reihe):
    """{Tag: Summe der Raten an diesem Tag (UTC)} und {Tag: Liste der Einzelraten}."""
    tag, einzeln = {}, {}
    for t, r in reihe:
        d = datetime.fromtimestamp(t / 1000, timezone.utc).date().isoformat()
        tag[d] = tag.get(d, 0.0) + r
        einzeln.setdefault(d, []).append(r)
    return tag, einzeln


def simuliere(funding: dict, coins: list, mit_filter: bool, tage: list, kosten=KOSTEN):
    """funding: {coin: (tag→Summe, tag→[Raten])}. → [(Tag, Tagesrendite aufs Kapital)]. Je Coin fester Anteil 1/len(coins)."""
    anteil = 1.0 / len(coins)
    offen = {c: False for c in coins}
    letzte = {c: [] for c in coins}  # gleitendes Fenster der Einzelraten bis Vortag
    out = []
    for d in tage:
        r_tag = 0.0
        for c in coins:
            summe, einzeln = funding[c]
            gibt_es = d in summe
            soll = gibt_es and (not mit_filter or (len(letzte[c]) >= FENSTER and sum(letzte[c][-FENSTER:]) > 0))
            if soll != offen[c]:
                r_tag -= anteil * kosten / KAPITAL_FAKTOR
                offen[c] = soll
            if offen[c]:
                r_tag += anteil * summe[d] / KAPITAL_FAKTOR  # Short bekommt positives Funding, zahlt negatives
            letzte[c].extend(einzeln.get(d, []))
        out.append((d, r_tag))
    return out


def kennz(reihe):
    if not reihe:
        return None
    w, hoch, dd, rs = 1.0, 1.0, 0.0, []
    for _, r in reihe:
        w *= 1 + r
        hoch = max(hoch, w)
        dd = min(dd, w / hoch - 1)
        rs.append(r)
    jahre = len(reihe) / 365
    mu = sum(rs) / len(rs)
    sd = math.sqrt(sum((x - mu) ** 2 for x in rs) / max(1, len(rs) - 1))
    return {"pro_jahr": w ** (1 / jahre) - 1 if jahre > 0 else 0, "einbruch": dd,
            "sharpe": mu / sd * math.sqrt(365) if sd > 0 else 0.0, "tage": len(reihe)}


def pro_jahr(reihe):
    j = {}
    for d, r in reihe:
        j.setdefault(d[:4], []).append(r)
    return {k: math.prod(1 + x for x in v) - 1 for k, v in sorted(j.items())}


def main():
    heute = datetime.now(timezone.utc).date()
    funding = {}
    for c in BREIT:
        funding[c] = tagesfunding(lade_funding(c))
        print(f"  {c}: {sum(len(v) for v in funding[c][1].values())} Funding-Zahlungen")
    tage = sorted(d for d in funding["BTC"][0] if START <= d < heute.strftime("%Y-%m-01"))
    varianten = {"A immer an (BTC+ETH)": (["BTC", "ETH"], False),
                 "B Filter (BTC+ETH)": (["BTC", "ETH"], True),
                 "C breit, Filter (8 Coins)": (BREIT, True)}
    ergebnis = {"stand": heute.isoformat(), "tage_bis": tage[-1], "varianten": {}}
    for name, (coins, filt) in varianten.items():
        r = simuliere(funding, coins, filt, tage)
        ent = [x for x in r if x[0] < UNGESEHEN]
        neu = [x for x in r if x[0] >= UNGESEHEN]
        ergebnis["varianten"][name] = {"entwicklung": kennz(ent), "ungesehen": kennz(neu), "pro_jahr": pro_jahr(r)}
    print(f"\nFunding-Ernte, Kosten {KOSTEN * 100:.2f} % je Wechsel, Kapital {KAPITAL_FAKTOR}× Volumen, Daten bis {tage[-1]}\n")
    for name, e in ergebnis["varianten"].items():
        u, a = e["ungesehen"], e["entwicklung"]
        print(f"{name}")
        print(f"   2020–2021: {a['pro_jahr'] * 100:+6.1f} %/Jahr  Einbruch {a['einbruch'] * 100:5.1f} %  Sharpe {a['sharpe']:.2f}")
        print(f"   ab 2022  : {u['pro_jahr'] * 100:+6.1f} %/Jahr  Einbruch {u['einbruch'] * 100:5.1f} %  Sharpe {u['sharpe']:.2f}")
        print("   pro Jahr : " + "  ".join(f"{k} {v * 100:+.1f} %" for k, v in e["pro_jahr"].items()))
    print("\nNicht abgebildet: Basis-Schwankung Spot/Future, Zins auf Bargeld, Börsenausfall. Keine Anlageberatung.")
    if "--json" in sys.argv:
        (ROOT / "data" / "krypto-carry-pruefung.json").write_text(json.dumps(ergebnis, ensure_ascii=False, indent=1) + "\n")
    return ergebnis


if __name__ == "__main__":
    main()
