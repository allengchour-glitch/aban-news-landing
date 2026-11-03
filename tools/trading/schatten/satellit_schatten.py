#!/usr/bin/env python3
"""Schattenbuch Satellit — die Regel «Top 10 nach Volumen, Trend je Coin, Bitcoin-Filter» täglich mit SPIELGELD nachgeführt,
ohne Broker, ohne Schlüssel (nur öffentliche Kurse von Binance).

    python3 tools/trading/schatten/satellit_schatten.py --lauf     # neuen Tag verbuchen (idempotent)
    python3 tools/trading/schatten/satellit_schatten.py --bericht  # Stand gegen Bitcoin

Zweck: ehrlicher Vorwärtstest einer Regel, die ihren Test NICHT bestand (alle_coins_pruefung.py, 13.10.2026: ab 2022 rund +18 % pro
Jahr bei −38 % Einbruch, Bitcoin mit Trend 150 allein +28 % bei −28 %) — auf Tagen, die beim Festlegen niemand kannte. Vier Reihen:
  S1      die Regel genau wie getestet (Top 10 inklusive Bitcoin und Ether)
  S2      die Regel, die der Satellit im Testnetz handelt (ohne Bitcoin und Ether; deren Platz bleibt USDT)
  BTC150  Vergleich: ganz in Bitcoin, solange er über seinem 150-Tage-Schnitt liegt (Kern des Piloten)
  BTC     Vergleich: Bitcoin halten
Verbucht wie gewinner_pruefung.simulieren: Wert am Schlusskurs des Tages, Umschichten am Entscheidungstag zum selben Schlusskurs,
0,15 % Kosten auf den umgeschichteten Betrag. Vereinfacht (steht im Bericht): keine Stops, kein Funding, keine Lücken-Kurse.
Logbuch: data/krypto-satellit-schatten.json. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

HIER = Path(__file__).resolve().parent
KB = HIER.parent / "krypto_bot"
sys.path[:0] = [str(KB), str(HIER.parent)]
import satellit_kern as S  # noqa: E402

ROOT = HIER.parents[2]
LOGBUCH = ROOT / "data" / "krypto-satellit-schatten.json"
START_KAPITAL = 10_000.0
KOSTEN = 0.0015
REIHEN = {
    "S1": "Regel wie getestet (Top 10 mit Bitcoin und Ether)",
    "S2": "Satellit (Top 10 ohne Bitcoin und Ether)",
    "BTC150": "Vergleich: Bitcoin mit Trend 150",
    "BTC": "Vergleich: Bitcoin halten",
}
HINWEIS = ("Spielgeld-Vorwärtstest einer Regel, die ihren Test nicht bestand. Vereinfacht: keine Stops, kein Funding, 0,15 % Kosten auf Umschichtungen. "
           "Unter 8 Wochen ist das Rauschen und kein Urteil.")


def lesen(datei=None):
    p = Path(datei) if datei else LOGBUCH
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return d if isinstance(d, dict) else {}


def schreiben(lb, datei=None):
    p = Path(datei) if datei else LOGBUCH
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_name(p.name + f".tmp{os.getpid()}")
    tmp.write_text(json.dumps(lb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    os.replace(tmp, p)


def neue_reihe(name):
    return {"name": name, "bar": START_KAPITAL, "menge": {}, "ziele": {}, "entschieden": None, "handel": 0}


def kurs_bis(reihe, tag):
    """Letzter Schlusskurs am oder vor `tag` (None, wenn es keinen gibt)."""
    k = None
    for t, c, _ in reihe:
        if t > tag:
            break
        k = c
    return k


def wert(r, preise):
    return r["bar"] + sum(m * preise[s] for s, m in r["menge"].items())


def umschichten(r, ziel, preise, kosten=KOSTEN):
    """Wie gewinner_pruefung.simulieren: Zielgewichte zum Schlusskurs, Kosten auf den umgeschichteten Betrag."""
    w = wert(r, preise)
    umsatz, neu = 0.0, {}
    for s in set(r["menge"]) | set(ziel):
        alt = r["menge"].get(s, 0.0) * preise[s]
        soll = ziel.get(s, 0.0) * w
        umsatz += abs(soll - alt)
        if soll > 0:
            neu[s] = soll / preise[s]
    faktor = (w - umsatz * kosten) / w if w > 0 else 0.0
    r["menge"] = {s: m * faktor for s, m in neu.items()}
    r["bar"] = (w - sum(ziel.values()) * w) * faktor
    if umsatz > 0:
        r["handel"] = r.get("handel", 0) + 1
    r["ziele"] = dict(ziel)


def ziel_fuer(name, reihen, tag):
    """Zielgewichte der Reihe `name` für den Entscheidungstag `tag`."""
    if name in ("S1", "S2"):
        return S.entscheiden(reihen, tag, nur_alt=(name == "S2"))
    if name == "BTC":
        return {S.BTC: 1.0}
    p, _ = S.raster(reihen[S.BTC], tag)                       # BTC150: ganz Bitcoin, solange er über seinem 150-Tage-Schnitt liegt
    m = S.schnitt(p, S.RUECK - 1, S.N_BTC)
    return {S.BTC: 1.0} if m and p[-1] is not None and p[-1] > m else {}


def preise_am(reihen, tag):
    """Letzter bekannter Schlusskurs je Coin am oder vor `tag`."""
    out = {}
    for s, r in reihen.items():
        k = kurs_bis(r, tag)
        if k is not None:
            out[s] = k
    return out


def tage_von_bis(a, b):
    d = date.fromisoformat(a)
    while d.isoformat() <= b:
        yield d.isoformat()
        d += timedelta(days=1)


def gehaltene(lb):
    """Alle Coins, die eine Reihe gerade hält (ihre Kurse müssen weiter geholt werden, auch wenn sie nicht mehr unter den Kandidaten sind)."""
    return sorted({s for r in (lb.get("reihen") or {}).values() for s in r["menge"]})


def verbuchen(lb, reihen, bis_tag):
    """Alle Tage nach dem letzten Stand bis `bis_tag` verbuchen. → Anzahl neu verbuchter Tage (0 = nichts zu tun)."""
    if not reihen.get(S.BTC):
        raise ValueError("Bitcoin-Kurse fehlen")
    if not lb.get("reihen"):
        lb.update({"version": 1, "start": bis_tag, "start_kapital": START_KAPITAL, "hinweis": HINWEIS, "tage": [], "preise": {},
                   "reihen": {n: neue_reihe(t) for n, t in REIHEN.items()}})
        erste = bis_tag
    elif bis_tag <= lb["letzter_stand"]:
        return 0
    else:
        erste = (date.fromisoformat(lb["letzter_stand"]) + timedelta(days=1)).isoformat()
    neu = 0
    for tag in tage_von_bis(erste, bis_tag):
        preise = preise_am(reihen, tag)
        if S.BTC not in preise:
            continue
        for s, k in lb["preise"].items():            # ein gehaltener Coin ohne frischen Kurs: letzter bekannter Kurs gilt
            preise.setdefault(s, k)
        zeile = {"tag": tag}
        erster_tag = not lb["tage"]
        for name, r in lb["reihen"].items():
            zeile[name] = round(wert(r, preise), 2)              # Wert VOR dem Umschichten, wie gewinner_pruefung.simulieren
            if S.entscheidungstag(tag) or erster_tag:
                entscheid_tag = tag if S.entscheidungstag(tag) else S.letzter_entscheidungstag(tag)
                ziel = ziel_fuer(name, reihen, entscheid_tag)
                r["entschieden"] = entscheid_tag
                umschichten(r, {s: w for s, w in ziel.items() if s in preise}, preise)
        lb["preise"].update({s: preise[s] for r in lb["reihen"].values() for s in r["menge"] if s in preise})
        lb["tage"].append(zeile)
        lb["letzter_stand"] = tag
        neu += 1
    return neu


def kennzahlen(lb):
    """{Reihe: {wert, rendite, einbruch}} und die Zahl der Tage."""
    out = {}
    tage = lb.get("tage") or []
    for name in REIHEN:
        w = [z[name] for z in tage if name in z]
        if not w:
            continue
        spitze, dd = w[0], 0.0
        for x in w:
            spitze = max(spitze, x)
            dd = min(dd, x / spitze - 1)
        out[name] = {"wert": w[-1], "rendite": w[-1] / START_KAPITAL - 1, "einbruch": dd}
    return out, len(tage)


def bericht(lb):
    if not lb.get("tage"):
        return "Noch kein Stand im Satelliten-Schattenbuch."
    k, n = kennzahlen(lb)
    z = [f"Satelliten-Schattenbuch (Spielgeld), Start {lb['start']}, {n} Tage, Stand {lb['letzter_stand']}:"]
    for name, text in REIHEN.items():
        if name in k:
            wert_text = f"{k[name]['wert']:,.0f}".replace(",", "'")
            z.append(f"  {name:6} {text}: {wert_text} USDT ({k[name]['rendite'] * 100:+.1f} %, schlimmster Einbruch {k[name]['einbruch'] * 100:.1f} %)")
    pos = {n: sorted(lb['reihen'][n]['menge']) for n in ("S1", "S2") if n in lb.get("reihen", {})}
    z.append("  Gehalten: " + "; ".join(f"{n}: {', '.join(s[:-4] for s in v) or 'nur USDT'}" for n, v in pos.items()))
    z.append("  " + ("Unter 8 Wochen: kein Urteil, nur Rauschen." if n < 56 else "Mehr als 8 Wochen: erst jetzt ein erstes Bild, noch kein Beweis."))
    return "\n".join(z)


def holen_standard(extra=(), heute=None):
    import satellit_daten as D
    top = D.kandidaten()
    reihen, fehlt = D.alle_reihen(sorted(set(top) | set(extra)), heute=heute)
    return reihen, fehlt


def main(argv=None, holen=holen_standard, datei=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lauf", action="store_true")
    ap.add_argument("--bericht", action="store_true")
    a = ap.parse_args(argv)
    if a.bericht or not a.lauf:
        print(bericht(lesen(datei)))
        return 0
    lb = lesen(datei)
    try:
        reihen, fehlt = holen(extra=gehaltene(lb))
    except OSError as ex:
        print(f"Satelliten-Schattenbuch: Kurse nicht erreichbar ({type(ex).__name__}) — nichts verbucht.")
        return 1
    import satellit_daten as D
    tag = D.letzter_tag(reihen)
    if tag is None:
        print("Satelliten-Schattenbuch: keine Bitcoin-Kurse — nichts verbucht.")
        return 1
    try:
        n = verbuchen(lb, reihen, tag)
    except ValueError as ex:
        print(f"Satelliten-Schattenbuch: {ex} — nichts verbucht.")
        return 1
    if n:
        lb["fehlende_coins"] = fehlt[:20]
        schreiben(lb, datei)
    print(bericht(lb) + ("" if n else "\n(Kein neuer Tag.)"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
