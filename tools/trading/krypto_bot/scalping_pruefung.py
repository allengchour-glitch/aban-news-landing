#!/usr/bin/env python3
"""Scalping-Prüfstand — lässt sich auf Binance-Futures mit Minuten-Handel NACH Gebühren Geld verdienen?

VORAB FESTGELEGT am 13.10.2026, bevor ein einziger echter Kurs gerechnet wurde (der Git-Verlauf belegt die Reihenfolge):

Daten:   Binance USDⓈ-M Perpetuals BTCUSDT und ETHUSDT, 1-Minuten-Kerzen mit Taker-Kauf-Volumen
         (data.binance.vision, Monatsarchive 01.2022–09.2026), Funding-Raten aus den Monatsarchiven.
Kosten:  Binance VIP 0 ohne BNB-Rabatt: Maker 0,020 %, Taker 0,050 % je Seite. Schlupf auf jede Taker-Füllung:
         BTC 0,010 %, ETH 0,015 %. Funding, wenn eine Position über einen Funding-Zeitpunkt läuft.
         Nur zur Info (ändert das Urteil nicht): mit BNB-Rabatt 0,018 % / 0,045 %.
Füllen:  streng, siehe scalping_kern.py (Limit nur bei Durchstossen um 1 Tick; Stop und Ziel in derselben Kerze → Stop;
         in der Einstiegskerze zählt nur der Stop; Stop-Lücken zum schlechteren Eröffnungskurs).
Zeiten:  Lernen (In-Sample) 01.01.2022–31.12.2023 · Prüfen (Out-of-Sample) 01.01.2024–30.09.2026, in zwei gleich lange Hälften.
Strategien (je Strategie wählt NUR der Lernzeitraum die Variante: höchster Netto-Gewinn je Trade bei ≥ 100 Trades;
danach wird nichts mehr angepasst):
  S1 Band-Abpraller (Mean-Reversion, Maker-Einstieg), 1m: k = 2,0 / 2,5 / 3,0 / 3,5
  S2 Ausbruch (Donchian, Stop-Einstieg), 1m: n = 15 / 30 / 60 / 240
  S3 RSI(2)-Extrem, 5m: Schwelle 5 oder 10, mit oder ohne Trendfilter EMA 200
  S4 Order-Flow folgen (Taker-Überhang, z > 3), 1m: (Fenster, Haltedauer) = (1, 5) (5, 15) (15, 30) (60, 60) Minuten
  S5 Umkehr nach fluss-getriebener Kerze (arXiv 2026), 15m: (σ-Faktor, Haltedauer) = (2, 1) (2, 4) (3, 1) (3, 4) Kerzen
  S6 Halbstunden-Momentum (Shen/Urquhart/Wang 2022): UTC-Tag / nur starke Signale / New-Yorker Börsenzeit
  S7 Tageszeit-Muster (Stunden aus dem Lernzeitraum), 1h: beste und schlechteste 1 / 2 / 3 Stunden
Bestanden (je Markt) nur, wenn im Prüfzeitraum ALLES gilt:
  1) Netto-Gewinn in BEIDEN Hälften   2) ≥ 200 Trades   3) im Schnitt ≥ 1 bp (0,01 %) netto je Trade (Puffer)
  4) brutto besser als ≥ 90 % von 200 Zufallskopien (gleiche Anzahl je Monat, Richtung und Haltedauer, zufälliger Zeitpunkt)
  5) Stresstest: Gebühren +20 % und doppelter Schlupf → immer noch Netto-Gewinn
«Handelbar» (höchstens Kandidat für ein Schattenbuch mit Spielgeld, nie direkt echtes Geld): bestanden auf BTC UND ETH.
Hebel vervielfacht nur Gewinn, Verlust und Gebühren je Trade — darum wird ohne Hebel gerechnet.

Aufruf: python3 tools/trading/krypto_bot/scalping_pruefung.py   → Tabelle + data/krypto-scalping-pruefung.json
        (lädt beim ersten Lauf ~200 MB Monatsarchive nach tools/trading/daten/binance_1m_fut/)
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
import zipfile
from array import array
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import carry_pruefung as CP  # noqa: E402
import scalping_kern as K  # noqa: E402

ORDNER = HIER.parent / "daten" / "binance_1m_fut"
URL = "https://data.binance.vision/data/futures/um/monthly/klines/{s}/1m/{s}-1m-{m}.zip"
AUSGABE = HIER.parents[2] / "data" / "krypto-scalping-pruefung.json"
VON, BIS = (2022, 1), (2026, 9)


def _ms(j, m, t=1):
    return int(datetime(j, m, t, tzinfo=timezone.utc).timestamp() * 1000)


LERN_ENDE, PRUEF_ENDE = _ms(2024, 1), _ms(2026, 10)
MITTE = LERN_ENDE + (PRUEF_ENDE - LERN_ENDE) // 2
MAERKTE = {"BTCUSDT": {"tick": 0.1, "slip": 0.00010}, "ETHUSDT": {"tick": 0.01, "slip": 0.00015}}
GEBUEHR = {"M": 0.00020, "T": 0.00050}
GEBUEHR_BNB = {"M": 0.00018, "T": 0.00045}
STRESS_GEBUEHR, STRESS_SCHLUPF = 1.2, 2.0
MIN_LERN, MIN_TRADES, MIN_NETTO_BP, ZUFALL_ANTEIL, ZUFALL_LAEUFE = 100, 200, 1.0, 0.90, 200

STRATEGIEN = [
    ("S1", "Band-Abpraller (Mean-Reversion, Maker)",
     [(f"k={k}", lambda B, m, k=k: K.band_abpraller(B["1m"], k, m["tick"])) for k in (2.0, 2.5, 3.0, 3.5)]),
    ("S2", "Ausbruch (Donchian, Stop-Einstieg)",
     [(f"n={n}", lambda B, m, n=n: K.ausbruch(B["1m"], n, m["tick"])) for n in (15, 30, 60, 240)]),
    ("S3", "RSI(2)-Extrem 5m",
     [(f"<{t}{' +Trend' if tr else ''}", lambda B, m, t=t, tr=tr: K.rsi2(B["5m"], t, tr)) for t in (5, 10) for tr in (True, False)]),
    ("S4", "Order-Flow folgen 1m",
     [(f"{w}m/{h}m", lambda B, m, w=w, h=h: K.fluss_folgen(B["1m"], w, h)) for w, h in ((1, 5), (5, 15), (15, 30), (60, 60))]),
    ("S5", "Umkehr nach Fluss-Kerze 15m",
     [(f"{f}σ/{h}×15m", lambda B, m, f=f, h=h: K.fluss_umkehr(B["15m"], f, h)) for f, h in ((2, 1), (2, 4), (3, 1), (3, 4))]),
    ("S6", "Halbstunden-Momentum",
     [(v, lambda B, m, v=v: K.halbstunde(B["1m"], v)) for v in ("utc", "utc_stark", "us")]),
    ("S7", "Tageszeit-Muster 1h",
     [(f"{q} Std.", lambda B, m, q=q: K.stunden_muster(B["1h"], q, LERN_ENDE)[0]) for q in (1, 2, 3)]),
]


def monate():
    j, m = VON
    while (j, m) <= BIS:
        yield f"{j}-{m:02d}"
        j, m = (j + 1, 1) if m == 12 else (j, m + 1)


def lade_1m(sym):
    """Monatsarchive (zwischengespeichert) → 1m-Kerzen als Spalten-Arrays, sortiert und ohne doppelte Zeiten."""
    ORDNER.mkdir(parents=True, exist_ok=True)
    b = {"t": array("q"), "o": array("d"), "h": array("d"), "l": array("d"), "c": array("d"), "v": array("d"),
         "tb": array("d"), "p": K.MINUTE}
    for m in monate():
        datei = ORDNER / f"{sym}-1m-{m}.zip"
        if not datei.exists():
            for versuch in range(5):
                try:
                    with urllib.request.urlopen(URL.format(s=sym, m=m), timeout=180) as r:
                        roh = r.read()
                    break
                except (urllib.error.URLError, OSError):
                    if versuch == 4:
                        raise
                    time.sleep(2 ** versuch)
            teil = datei.with_suffix(".teil")
            teil.write_bytes(roh)
            teil.replace(datei)
        with zipfile.ZipFile(datei) as z:
            text = z.read(z.namelist()[0]).decode()
        for zeile in text.splitlines():
            if not zeile or not zeile[0].isdigit():
                continue  # Kopfzeile
            x = zeile.split(",")
            t = int(x[0])
            b["t"].append(t // 1000 if t > 10 ** 14 else t)  # neuere Archive teils in Mikrosekunden
            for k, i in (("o", 1), ("h", 2), ("l", 3), ("c", 4), ("v", 5), ("tb", 9)):
                b[k].append(float(x[i]))
    return K.ordnen(b)


def waehle(varianten):
    """Variante mit dem höchsten Netto-Gewinn je Trade im LERNzeitraum (≥ MIN_LERN Trades)."""
    gut = [(v["lern"]["netto_bp"], name) for name, v in varianten.items() if v["lern"].get("n", 0) >= MIN_LERN]
    if gut:
        return max(gut)[1]
    return max(varianten, key=lambda n: varianten[n]["lern"].get("n", 0))


def pruefe(trades, b1, kosten, f):
    """Urteil für die gewählte Variante im Prüfzeitraum (Kriterien siehe Kopf)."""
    k = K.kennzahlen(trades, kosten, f)
    if not k["n"]:
        return {"kennzahlen": k, "kriterien": {"anzahl": False}, "bestanden": False}
    h1 = K.kennzahlen([t for t in trades if t[0] < MITTE], kosten, f)
    h2 = K.kennzahlen([t for t in trades if t[0] >= MITTE], kosten, f)
    zufall = K.zufallsprobe(trades, b1, ZUFALL_LAEUFE)
    br = sum(K.brutto(t) for t in trades)
    anteil = sum(z < br for z in zufall) / len(zufall)
    stress = K.kennzahlen(trades, {"M": kosten["M"] * STRESS_GEBUEHR, "T": kosten["T"] * STRESS_GEBUEHR,
                                   "slip": kosten["slip"] * STRESS_SCHLUPF}, f)
    bnb = K.kennzahlen(trades, {**GEBUEHR_BNB, "slip": kosten["slip"]}, f)
    kriterien = {"beide_haelften": h1.get("summe_pct", 0) > 0 and h2.get("summe_pct", 0) > 0,
                 "anzahl": k["n"] >= MIN_TRADES, "netto_je_trade": k["netto_bp"] >= MIN_NETTO_BP,
                 "zufall": anteil >= ZUFALL_ANTEIL, "stress": stress["summe_pct"] > 0}
    return {"kennzahlen": k, "haelfte_1": h1, "haelfte_2": h2, "zufall_geschlagen": round(anteil, 3),
            "stress": stress, "mit_bnb": bnb, "kriterien": kriterien, "bestanden": all(kriterien.values())}


KRITERIUM_TEXT = {"beide_haelften": "Hälften", "anzahl": "Anzahl", "netto_je_trade": "≥ 1 bp", "zufall": "Zufall",
                  "stress": "Stress"}


def _de(x, fmt):
    """Zahl wie in der README: Dezimalkomma, Tausender-Apostroph, typografisches Minus."""
    return format(x, fmt).replace(",", "'").replace(".", ",").replace("-", "−")


def bericht_md(erg):
    """Markdown-Tabelle für die README direkt aus der Ergebnis-Datei (keine Zahl von Hand abgeschrieben)."""
    zeilen = ["| Markt | Strategie (gewählte Variante) | Trades | Brutto je Trade | Netto je Trade | Treffer | "
              "Zufall geschlagen | Urteil (durchgefallen an) |", "|---|---|---|---|---|---|---|---|"]
    for sym, strat in erg["maerkte"].items():
        for kurz, s in strat.items():
            k, pr = s["pruefung"]["kennzahlen"], s["pruefung"]
            if not k.get("n"):
                zeilen.append(f"| {sym[:3]} | {kurz} {s['name']} ({s['gewaehlt']}) | 0 | – | – | – | – | ❌ |")
                continue
            fehlt = [KRITERIUM_TEXT.get(n, n) for n, ok in pr["kriterien"].items() if not ok]
            zeilen.append(f"| {sym[:3]} | {kurz} {s['name']} ({s['gewaehlt']}) | {_de(k['n'], ',')} | "
                          f"{_de(k['brutto_bp'], '+.1f')} bp | {_de(k['netto_bp'], '+.1f')} bp | {_de(100 * k['treffer'], '.0f')} % | "
                          f"{_de(100 * pr['zufall_geschlagen'], '.0f')} % | {'✅' if pr['bestanden'] else '❌ ' + ', '.join(fehlt)} |")
    return "\n".join(zeilen)


def main():
    if "--bericht" in sys.argv:
        print(bericht_md(json.loads(AUSGABE.read_text())))
        return 0
    t0 = time.time()
    erg = {"stand": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "protokoll": {"daten": f"{VON[0]}-{VON[1]:02d} bis {BIS[0]}-{BIS[1]:02d}", "lernen_bis": "2023-12-31",
                         "pruefen": "2024-01-01 bis 2026-09-30", "gebuehr": GEBUEHR, "maerkte": MAERKTE,
                         "kriterien": {"min_trades": MIN_TRADES, "min_netto_bp": MIN_NETTO_BP, "zufall": ZUFALL_ANTEIL,
                                       "stress": [STRESS_GEBUEHR, STRESS_SCHLUPF]}},
           "maerkte": {}}
    for sym, m in MAERKTE.items():
        print(f"\n═══ {sym} ═══ lade 1m-Kerzen …", flush=True)
        b1 = lade_1m(sym)
        B = {"1m": b1, "5m": K.buendeln(b1, 5), "15m": K.buendeln(b1, 15), "1h": K.buendeln(b1, 60)}
        f = K.funding_reihe(CP.lade_funding(sym[:-4]))
        kosten = {**GEBUEHR, "slip": m["slip"]}
        print(f"  {len(b1['t']):,} Minuten, {len(f[0]):,} Funding-Zeitpunkte ({time.time() - t0:.0f} s)", flush=True)
        erg["maerkte"][sym] = {}
        for kurz, name, varianten in STRATEGIEN:
            alle, trades_je = {}, {}
            for vname, fn in varianten:
                tr = fn(B, m)
                trades_je[vname] = tr
                alle[vname] = {"lern": K.kennzahlen([t for t in tr if t[0] < LERN_ENDE], kosten, f),
                               "pruef_info": K.kennzahlen([t for t in tr if LERN_ENDE <= t[0] < PRUEF_ENDE], kosten, f)}
            wahl = waehle(alle)
            pr = pruefe([t for t in trades_je[wahl] if LERN_ENDE <= t[0] < PRUEF_ENDE], b1, kosten, f)
            erg["maerkte"][sym][kurz] = {"name": name, "varianten": alle, "gewaehlt": wahl, "pruefung": pr}
            k = pr["kennzahlen"]
            print(f"  {kurz} {name:<38} {wahl:<12} Lernen {alle[wahl]['lern'].get('netto_bp', 0):+7.2f} bp │ "
                  f"Prüfen n={k.get('n', 0):>6} brutto {k.get('brutto_bp', 0):+7.2f} bp netto {k.get('netto_bp', 0):+7.2f} bp "
                  f"Summe {k.get('summe_pct', 0):+8.1f} % Zufall {pr.get('zufall_geschlagen', 0):.0%} "
                  f"→ {'✅ BESTANDEN' if pr['bestanden'] else '❌'} ({time.time() - t0:.0f} s)", flush=True)
        del B, b1
    handelbar = [s for s, _, _ in STRATEGIEN if all(erg["maerkte"][m][s]["pruefung"]["bestanden"] for m in MAERKTE)]
    erg["handelbar"] = handelbar
    AUSGABE.parent.mkdir(exist_ok=True)
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1))
    print(f"\nHandelbar (BTC UND ETH bestanden): {', '.join(handelbar) or 'keine'} · {AUSGABE.name} · {time.time() - t0:.0f} s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
