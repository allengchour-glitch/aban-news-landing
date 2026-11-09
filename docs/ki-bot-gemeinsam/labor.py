#!/usr/bin/env python3
"""Offline-Prototyp: Trend-Konsens gegen feste Vergleiche; keine Broker-Anbindung."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import date
from pathlib import Path
from statistics import stdev

ROOT = Path(__file__).resolve().parents[2]
PROTOKOLL = {
    "version": 1,
    "markt": "BTC-USD, Spot, Long/Cash, kein Hebel",
    "trend_tage": [150, 200],
    "vol_tage": 30,
    "vol_ziel": 0.25,
    "handelsband": 0.10,
    "kosten_einfach_bp": [10, 25, 50],
    "signal_verzoegerung_tage": 2,
    "historische_teilperioden": ["2022-01-01", "2024-01-01"],
    "vorwaertstest_mindesttage": 180,
}


def laden(path):
    raw = path.read_bytes()
    rows = json.loads(raw)
    if not isinstance(rows, list) or len(rows) < 400:
        raise ValueError("Mindestens 400 Tageskurse erforderlich")
    tage, preise = [], []
    for row in rows:
        if not isinstance(row, list) or len(row) != 2 or not isinstance(row[0], str):
            raise ValueError("Erwartet wird je Zeile [ISO-Datum, Schlusskurs]")
        tag = date.fromisoformat(row[0])
        kurs = row[1]
        if isinstance(kurs, bool) or not isinstance(kurs, (int, float)) or not math.isfinite(kurs) or kurs <= 0:
            raise ValueError("Kurse müssen endlich und positiv sein")
        if tage and (tag - tage[-1]).days != 1:
            raise ValueError("Bitcoin-Tagesreihe hat Lücken, doppelte oder unsortierte Tage")
        tage.append(tag)
        preise.append(float(kurs))
    return tage, preise, hashlib.sha256(raw).hexdigest()


def signale(p):
    """Jedes Signal kennt nur den heutigen und frühere Schlusskurse."""
    out = {"Halten": [1.0] * len(p), "Trend 200": [], "Konsens 150/200": []}
    for i, kurs in enumerate(p):
        if i < 199:
            out["Trend 200"].append(0.0)
            out["Konsens 150/200"].append(0.0)
            continue
        ma200 = sum(p[i - 199:i + 1]) / 200
        ma150 = sum(p[i - 149:i + 1]) / 150
        out["Trend 200"].append(float(kurs > ma200))
        r = [p[j] / p[j - 1] - 1 for j in range(i - 29, i + 1)]
        vol = stdev(r) * math.sqrt(365)
        q = min(1.0, PROTOKOLL["vol_ziel"] / vol) if vol > 0 else 0.0
        out["Konsens 150/200"].append(q if kurs > ma150 and kurs > ma200 else 0.0)
    return out


def simulieren(p, ziel, kosten, start=201, band=0.0):
    """Start mit Cash. Erst Schlusskurs t+1 handeln, nachdem Signal t bekannt war.

    Der so gehaltene Bestand verdient erstmals die Rendite t+1→t+2. Cash
    verzinst sich nicht. Position driftet mit dem Kurs; Kosten belasten echtes
    Umschichtungsvolumen. Letzter Bestand wird gegen Kosten liquidiert.
    """
    cash, bestand, werte, umsatz = 1.0, 0.0, [1.0], 0.0
    for i in range(start, len(p)):
        bestand *= p[i] / p[i - 1]
        kapital = cash + bestand
        quote = ziel[i - 1]
        if quote == 0 or abs(quote - bestand / kapital) >= band:
            # Kosten für den Handel sind Teil der Zielgewichts-Gleichung.
            neu = quote * (kapital + kosten * bestand) / (1 + quote * kosten)
            if neu < bestand:
                neu = quote * (kapital - kosten * bestand) / (1 - quote * kosten)
            volumen = abs(neu - bestand)
            cash = kapital - neu - kosten * volumen
            bestand = neu
            umsatz += volumen
        werte.append(cash + bestand)
    schlusskosten = kosten * bestand
    werte[-1] -= schlusskosten
    umsatz += bestand
    hoch, dd = 1.0, 0.0
    for w in werte:
        hoch = max(hoch, w)
        dd = min(dd, w / hoch - 1)
    return {"rendite": werte[-1] - 1, "max_einbruch": dd,
            "umsatz_pro_startkapital": umsatz, "mess_tage": len(werte) - 1}


def auswerten(tage, p):
    qs = signale(p)
    out = {}
    for beginn in PROTOKOLL["historische_teilperioden"]:
        start = next((i for i, d in enumerate(tage) if d.isoformat() >= beginn), len(p))
        if start < 201 or len(p) - start < 180:
            continue
        out[beginn] = {}
        for bp in PROTOKOLL["kosten_einfach_bp"]:
            out[beginn][str(bp)] = {
                name: simulieren(p, q, bp / 10000, start,
                                 PROTOKOLL["handelsband"] if name.startswith("Konsens") else 0.0)
                for name, q in qs.items()
            }
    return out


def main():
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--daten", type=Path, default=ROOT / "tools/trading/daten/BTC-USD.json")
    a.add_argument("--ausgabe", type=Path, required=True, help="Neue Ergebnisdatei; bestehende werden nicht überschrieben")
    args = a.parse_args()
    tage, p, datenhash = laden(args.daten)
    protokollhash = hashlib.sha256(json.dumps(PROTOKOLL, sort_keys=True).encode()).hexdigest()
    result = {"status": "FORSCHUNG, KEINE HANDELSFREIGABE", "protokoll": PROTOKOLL,
              "protokoll_sha256": protokollhash, "daten_sha256": datenhash,
              "code_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "daten_von": str(tage[0]), "daten_bis": str(tage[-1]),
              "hinweis": "Bekannte historische Daten, kein unabhängiger Holdout. Schlusskurs-Modell ohne Intraday-Ausführung; kein Funding, Spread in pauschalen Kosten, kein Börsenausfall. Kein KI-Nachweis.",
              "ergebnisse": auswerten(tage, p)}
    if not result["ergebnisse"]:
        raise ValueError("Keine ausreichend lange vorab festgelegte Teilperiode vorhanden")
    with args.ausgabe.open("x", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write("\n")
    print(f"Historischer Forschungsbericht: {args.ausgabe}; Daten bis {tage[-1]}")


if __name__ == "__main__":
    main()
