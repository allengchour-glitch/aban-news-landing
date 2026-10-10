#!/usr/bin/env python3
"""Prüfstand für Telegram-Call-Gruppen: Was hätte es gebracht, ALLE ihre Calls zu kopieren? Ehrlich gerechnet.

  py tools/trading/krypto_bot/calls_pruefung.py              # alle Gruppen in data/calls/ prüfen
  py tools/trading/krypto_bot/calls_pruefung.py --gruppe 123 # nur eine

Die Nachrichten holt `calls_leser.py --verlauf` (dein Telegram-Konto, auf deinem PC). Kurse: Binance-Futures-Kerzen
(15 Minuten, öffentlich, ohne Schlüssel), sonst Binance-Spot; Zwischenspeicher tools/trading/daten/calls_kerzen/.

Regeln (VORHER festgelegt, gleich für jede Gruppe — keine Anpassung an die Ergebnisse):
- Einstieg frühestens 1 Minute nach der Nachricht (Kerze danach). Mit Einstiegszone: gefüllt, sobald der Kurs die Zone
  erreicht (Long: oberer Rand), höchstens 24 Std. lang — sonst «nicht ausgelöst». Ohne Zone: sofort zum Marktpreis.
- Stop wie angegeben; ohne Stop 10 % gegen die Position. Liegt der Kurs beim Einstieg schon jenseits des Stops: nicht
  ausgelöst (Binance würde den Stop ablehnen).
- Ziele: Position zu gleichen Teilen auf die Ziele verteilt; Ziele, die beim Einstieg schon erreicht sind, zählen nicht.
  Der Stop bleibt, wo er ist. Nach 7 Tagen wird der Rest geschlossen.
- Treffen Stop und Ziel dieselbe Kerze, zählt der Stop (vorsichtig). In der Einstiegskerze zählt nur der Stop.
- Kosten: 0,05 % Gebühr je Seite, 0,1 % Schlupf am Stop, Funding 0,01 % je 8 Std. (Long zahlt, Short erhält).
- Renditen ohne Hebel (Kursbewegung). Konto-Rechnung: 1 % Risiko je Call (Abstand zum Stop), höchstens 2× Hebel.

Urteil «kopierwürdig» nur, wenn ALLES gilt:
  1) mindestens 30 ausgelöste, abgeschlossene Calls,
  2) Ø-Rendite je Call nach Kosten in BEIDEN zeitlichen Hälften über 0,
  3) die echten Calls schlagen mindestens 90 % von 200 Kopien mit zufällig verschobenem Zeitpunkt (±3–30 Tage, gleiche
     Coins, gleiche Richtung, gleiche Abstände zu Einstieg/Zielen/Stop). Sonst war es Glück mit dem Markt, kein Können.
Ehrlich: Gruppen löschen oft ihre Verlierer. Der Verlauf kann darum geschönt sein — `calls_leser.py --live` zeichnet
ab jetzt auch Löschungen auf; aussagekräftig ist erst die Schatten-Bilanz ab heute. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import calls_parser as CP  # noqa: E402

ROOT = HIER.parents[2]
NACHRICHTEN = ROOT / "data" / "calls"
ERGEBNIS = ROOT / "data" / "calls-pruefung.json"
KERZEN_ORDNER = HIER.parent / "daten" / "calls_kerzen"
MIN15 = 15 * 60 * 1000
TAG = 86400 * 1000
GEBUEHR, SCHLUPF, FUNDING_8H = 0.0005, 0.001, 0.0001
STOP_OHNE_ANGABE, HALTEN_TAGE, FUELLEN_STD, VERZUG_MS = 0.10, 7, 24, 60 * 1000
RISIKO, MAX_HEBEL = 0.01, 2.0
REGEL = {"min_calls": 30, "skill": 0.90, "kopien": 200}
NETZFEHLER = (OSError, ValueError)


# ───────────────────────── Kerzen (15 Minuten) ─────────────────────────
def _holen(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "aban-krypto-calls/1"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def _quellen(symbol):
    """(Quelle, Symbol, Faktor): Futures zuerst; «1000PEPEUSDT» gibt es auf Spot als PEPEUSDT (Preis × 1000)."""
    out = [("fapi", symbol, 1.0), ("spot", symbol, 1.0)]
    for vor, f in (("1000000", 1e6), ("1000", 1e3)):
        if symbol.startswith(vor) and len(symbol) > len(vor) + 4:
            out.append(("spot", symbol[len(vor):], f))
    if not symbol.startswith("1000"):
        out.append(("fapi", "1000" + symbol, 1e-3))
    return out


def tag_kerzen(symbol, tag_ms, holen=None, ordner=None):
    """Alle 15-Min.-Kerzen eines UTC-Tages: [(open_ms, o, h, l, c), …] oder [] (unbekanntes Symbol). Vergangene Tage im Speicher."""
    holen = holen or _holen
    ordner = Path(ordner) if ordner else KERZEN_ORDNER
    datei = ordner / symbol / f"{datetime.fromtimestamp(tag_ms / 1000, timezone.utc):%Y-%m-%d}.json"
    if datei.exists():
        return [tuple(x) for x in json.loads(datei.read_text())]
    out = []
    for quelle, sym, faktor in _quellen(symbol):
        basis = ("https://fapi.binance.com/fapi/v1/klines" if quelle == "fapi" else "https://data-api.binance.vision/api/v3/klines")
        q = urllib.parse.urlencode({"symbol": sym, "interval": "15m", "startTime": tag_ms, "endTime": tag_ms + TAG - 1, "limit": 100})
        try:
            roh = holen(f"{basis}?{q}")
        except NETZFEHLER:
            continue
        if isinstance(roh, list) and roh:
            out = [(int(k[0]), float(k[1]) * faktor, float(k[2]) * faktor, float(k[3]) * faktor, float(k[4]) * faktor) for k in roh]
            break
    if out and tag_ms + TAG < time.time() * 1000 - 3600 * 1000:  # nur abgeschlossene Tage speichern
        datei.parent.mkdir(parents=True, exist_ok=True)
        datei.write_text(json.dumps(out))
    return out


def kerzen(symbol, von_ms, bis_ms, holen=None, ordner=None):
    tag0 = von_ms // TAG * TAG
    out = []
    t = tag0
    while t <= bis_ms:
        out += [k for k in tag_kerzen(symbol, t, holen, ordner) if von_ms <= k[0] <= bis_ms]
        t += TAG
    return out


# ───────────────────────── ein Call ─────────────────────────
def simuliere(call, zeit_ms, ks):
    """call (calls_parser) + Nachrichtenzeit + Kerzen ab dann → Ergebnis-dict. Reine Rechnung, testbar."""
    lang = call["richtung"] == "LONG"
    start = zeit_ms + VERZUG_MS
    ks = [k for k in ks if k[0] >= start - start % MIN15 + MIN15]  # erste ganze Kerze nach der Nachricht
    if not ks:
        return {"status": "keine_kurse"}
    kurs0 = ks[0][1]
    alle = [p for p in call["einstieg"] + call["ziele"] + ([call["stop"]] if call["stop"] else []) if p]
    if not call.get("stimmig", True) or any(p / kurs0 > 3 or kurs0 / p > 3 for p in alle):
        return {"status": "unplausibel", "kurs": kurs0}
    # Einstieg
    i_fill, fill, am_open = None, None, False
    if call["einstieg"]:
        lo, hi = call["einstieg"]
        for i, (t, o, h, l, c) in enumerate(ks):
            if t >= ks[0][0] + FUELLEN_STD * 3600 * 1000:
                break
            if lang and o <= hi or not lang and o >= lo:
                i_fill, fill, am_open = i, o, True
                break
            if lang and l <= hi or not lang and h >= lo:
                i_fill, fill = i, hi if lang else lo
                break
    else:
        i_fill, fill, am_open = 0, kurs0, True
    if i_fill is None:
        return {"status": "nicht_ausgeloest", "kurs": kurs0}
    stop = call["stop"] or fill * (1 - STOP_OHNE_ANGABE if lang else 1 + STOP_OHNE_ANGABE)
    if (lang and stop >= fill) or (not lang and stop <= fill):
        return {"status": "nicht_ausgeloest", "kurs": kurs0, "grund": "Stop schon durch"}
    ziele = [z for z in call["ziele"] if (z > fill if lang else z < fill)]
    rest, anteil = 1.0, (1.0 / len(ziele) if ziele else 0.0)
    erloes, t_fill = 0.0, ks[i_fill][0]
    ende_ms = t_fill + HALTEN_TAGE * TAG
    grund, t_ende = None, None

    def r_von(preis):
        return preis / fill - 1 if lang else 1 - preis / fill

    for j in range(i_fill, len(ks)):
        t, o, h, l, c = ks[j]
        if t >= ende_ms:
            erloes += rest * r_von(o)
            rest, grund, t_ende = 0.0, "zeit", t
            break
        if (lang and l <= stop) or (not lang and h >= stop):
            aus = min(o, stop) if lang else max(o, stop)  # Lücke über den Stop: zum Eröffnungskurs
            erloes += rest * r_von(aus * (1 - SCHLUPF if lang else 1 + SCHLUPF))
            rest, grund, t_ende = 0.0, "stop", t
            break
        if j == i_fill and not am_open:
            continue  # in der Einstiegskerze ist die Reihenfolge unbekannt: nur der Stop zählt
        while ziele and ((lang and h >= ziele[0]) or (not lang and l <= ziele[0])):
            erloes += anteil * r_von(ziele.pop(0))
            rest -= anteil
        if rest <= 1e-9:
            grund, t_ende = "ziele", t
            break
    if rest > 1e-9 and grund is None:
        return {"status": "offen", "einstieg": fill, "stop": stop, "r_offen": round(erloes + rest * r_von(ks[-1][4]), 6),
                "t_einstieg": t_fill}
    stunden = (t_ende - t_fill) / 3600000
    kosten = 2 * GEBUEHR + FUNDING_8H * stunden / 8 * (1 if lang else -1)
    r = erloes - kosten
    abstand = abs(fill - stop) / fill
    return {"status": "geschlossen", "einstieg": fill, "stop": stop, "grund": grund, "r": round(r, 6),
            "r_risiko": round(r / abstand, 4), "abstand_stop": round(abstand, 6), "stunden": round(stunden, 1),
            "t_einstieg": t_fill, "t_ende": t_ende}


# ───────────────────────── Gruppe ─────────────────────────
def lies_nachrichten(datei):
    """data/calls/<gruppe>.jsonl → {id: Nachricht} (spätere Einträge mit gleicher id = Bearbeitung, gewinnt)."""
    out = {}
    for zeile in Path(datei).read_text(encoding="utf-8").splitlines():
        try:
            n = json.loads(zeile)
        except ValueError:
            continue
        if n.get("art") == "geloescht":
            out.setdefault(n["id"], {"id": n["id"]}).update({"geloescht": True})
            continue
        alt = out.get(n["id"], {})
        neu = {**alt, **n, "geloescht": alt.get("geloescht", False)}
        # Ursprungstext bleibt: ein Kopierer hätte auf die erste Fassung reagiert (Verlauf liefert nur die letzte Fassung)
        neu["text_original"] = alt.get("text_original") or alt.get("text") or n.get("text", "")
        if alt.get("zeit"):
            neu["zeit"] = alt["zeit"]
        out[n["id"]] = neu
    return out


def calls_aus(nachrichten, claude=False):
    """Nachrichten → [(zeit_ms, call, id)], ohne Wiederholungen (gleicher Coin + Richtung binnen 6 Std. = derselbe Call)."""
    out, letzte = [], {}
    for n in sorted(nachrichten.values(), key=lambda x: x.get("zeit", "")):
        if not n.get("text") or not n.get("zeit"):
            continue
        # Massgeblich ist der URSPRÜNGLICHE Text: nachträglich «verbesserte» Calls zählen wie zuerst gesendet
        c = CP.lesen(n.get("text_original") or n["text"], claude=claude)
        if not c:
            continue
        t = int(datetime.fromisoformat(n["zeit"]).timestamp() * 1000)
        schluessel = (c["symbol"], c["richtung"])
        if schluessel in letzte and t - letzte[schluessel] < 6 * 3600 * 1000:
            continue
        letzte[schluessel] = t
        out.append((t, c, n["id"]))
    return out


def konto(ergebnisse):
    """1 % Risiko je Call (höchstens 2× Hebel), Gewinne/Verluste addiert in der Reihenfolge des Schliessens → Summe, schlimmster Rückgang."""
    zu = sorted((e for e in ergebnisse if e["status"] == "geschlossen"), key=lambda e: e["t_ende"])
    stand, spitze, tief = 0.0, 0.0, 0.0
    for e in zu:
        stand += min(RISIKO / e["abstand_stop"], MAX_HEBEL) * e["r"]
        spitze = max(spitze, stand)
        tief = min(tief, stand - spitze)
    return {"summe": round(stand, 4), "schlimmster_rueckgang": round(tief, 4)}


def kennzahlen(ergebnisse):
    zu = [e for e in ergebnisse if e["status"] == "geschlossen"]
    rs = sorted(e["r"] for e in zu)
    n = len(rs)
    if not n:
        return {"n": 0}
    return {"n": n, "treffer": round(sum(r > 0 for r in rs) / n, 4), "schnitt": round(sum(rs) / n, 6), "median": rs[n // 2],
            "bester": rs[-1], "schlechtester": rs[0], "r_risiko": round(sum(e["r_risiko"] for e in zu) / n, 4),
            "stops": sum(e["grund"] == "stop" for e in zu), "alle_ziele": sum(e["grund"] == "ziele" for e in zu), **konto(zu)}


def verschieben(call, faktor):
    f = lambda p: p * faktor  # noqa: E731
    return {**call, "einstieg": [f(p) for p in call["einstieg"]], "ziele": [f(p) for p in call["ziele"]],
            "stop": f(call["stop"]) if call["stop"] else None}


def zufallsprobe(calls, kerzen_fn, echt_schnitt, kopien=200, saat=7):
    """Gleiche Calls zu zufällig verschobenen Zeitpunkten (±3–30 Tage); Abstände relativ zum damaligen Kurs. → Anteil geschlagen."""
    rnd = random.Random(saat)
    schnitte = []
    for _ in range(kopien):
        rs = []
        for t, c, _id in calls:
            tag = rnd.randint(3, 30) * rnd.choice((-1, 1))
            t2 = t + tag * TAG + rnd.randint(0, 95) * MIN15
            ks0 = kerzen_fn(c["symbol"], t, t + 2 * 3600 * 1000)
            ks2 = kerzen_fn(c["symbol"], t2, t2 + (HALTEN_TAGE + 2) * TAG)
            if not ks0 or not ks2:
                continue
            e = simuliere(verschieben(c, ks2[0][1] / ks0[0][1]), t2, ks2)
            if e["status"] == "geschlossen":
                rs.append(e["r"])
        if rs:
            schnitte.append(sum(rs) / len(rs))
    if not schnitte:
        return None
    return sum(s < echt_schnitt for s in schnitte) / len(schnitte)


def pruefe_gruppe(nachrichten, kerzen_fn, kopien=REGEL["kopien"], claude=False, jetzt_ms=None):
    jetzt_ms = jetzt_ms or int(time.time() * 1000)
    calls = calls_aus(nachrichten, claude=claude)
    ergebnisse = []
    for t, c, nid in calls:
        e = simuliere(c, t, kerzen_fn(c["symbol"], t, min(t + (HALTEN_TAGE + 2) * TAG, jetzt_ms)))
        ergebnisse.append({**e, "id": nid, "zeit": t, "symbol": c["symbol"], "richtung": c["richtung"]})
    zu = [e for e in ergebnisse if e["status"] == "geschlossen"]
    zu.sort(key=lambda e: e["zeit"])
    h = len(zu) // 2
    haelften = [kennzahlen(zu[:h]), kennzahlen(zu[h:])] if h else [{"n": 0}, {"n": 0}]
    k = kennzahlen(zu)
    zaehler = {s: sum(e["status"] == s for e in ergebnisse) for s in ("geschlossen", "offen", "nicht_ausgeloest", "unplausibel", "keine_kurse")}
    skill = None
    if k["n"] >= REGEL["min_calls"]:
        echte = [(t, c, i) for (t, c, i), e in zip(calls, ergebnisse) if e["status"] == "geschlossen"]
        skill = zufallsprobe(echte, kerzen_fn, k["schnitt"], kopien=kopien)
    gruende = []
    if k["n"] < REGEL["min_calls"]:
        gruende.append(f"erst {k['n']} von {REGEL['min_calls']} nötigen abgeschlossenen Calls")
    if any(x.get("n", 0) == 0 or x["schnitt"] <= 0 for x in haelften):
        gruende.append("nicht in beiden Hälften im Plus")
    if skill is None or skill < REGEL["skill"]:
        gruende.append("Zufallsprobe nicht bestanden" + (f" ({skill * 100:.0f} %)" if skill is not None else ""))
    geloescht = sum(1 for n in nachrichten.values() if n.get("geloescht"))
    return {"nachrichten": len(nachrichten), "calls": len(calls), "status": zaehler, "gesamt": k, "haelften": haelften,
            "zufallsprobe": skill, "geloescht": geloescht, "urteil": "kopierwürdig" if not gruende else "nicht kopieren",
            "gruende": gruende, "ergebnisse": ergebnisse[-500:]}


def _pct(h):
    return f"{h['schnitt'] * 100:+.2f} %" if h.get("n") else "—"


def text(name, g):
    k = g["gesamt"]
    z = f"\n== {name}: {g['nachrichten']} Nachrichten → {g['calls']} Calls · " + " · ".join(f"{v} {s.replace('_', ' ')}" for s, v in g["status"].items() if v)
    if k.get("n"):
        z += (f"\n   Ø je Call {k['schnitt'] * 100:+.2f} % (Median {k['median'] * 100:+.2f} %) · Treffer {k['treffer'] * 100:.0f} % · "
              f"Stops {k['stops']}, alle Ziele {k['alle_ziele']} · bester {k['bester'] * 100:+.1f} %, schlechtester {k['schlechtester'] * 100:+.1f} %"
              f"\n   Konto mit 1 % Risiko je Call: {k['summe'] * 100:+.1f} %, schlimmster Rückgang {k['schlimmster_rueckgang'] * 100:.1f} %"
              f"\n   Hälften: {' / '.join(_pct(h) for h in g['haelften'])}"
              + (f" · Zufallsprobe: schlägt {g['zufallsprobe'] * 100:.0f} % der Kopien" if g["zufallsprobe"] is not None else ""))
    if g["geloescht"]:
        z += f"\n   ⚠️ {g['geloescht']} Nachrichten wurden von der Gruppe GELÖSCHT (oft die Verlierer)."
    z += f"\n   Urteil: {g['urteil'].upper()}" + (f" — {'; '.join(g['gruende'])}" if g["gruende"] else "")
    return z


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--gruppe")
    ap.add_argument("--kopien", type=int, default=REGEL["kopien"])
    ap.add_argument("--claude", action="store_true", help="unlesbare Nachrichten von Claude lesen lassen (CALLS_CLAUDE=1 nötig)")
    a = ap.parse_args()
    dateien = sorted(NACHRICHTEN.glob("*.jsonl")) if NACHRICHTEN.exists() else []
    if a.gruppe:
        dateien = [d for d in dateien if d.stem == str(a.gruppe)]
    if not dateien:
        print("Keine Nachrichten. Erst: py tools\\trading\\krypto_bot\\calls_leser.py --verlauf")
        return 1
    namen = json.loads((NACHRICHTEN / "gruppen.json").read_text(encoding="utf-8")) if (NACHRICHTEN / "gruppen.json").exists() else {}
    erg = {"stand": datetime.now(timezone.utc).isoformat(timespec="seconds"), "regel": __doc__.split("Regeln")[1].split("Ehrlich:")[0].strip(),
           "gruppen": {}}
    for d in dateien:
        g = pruefe_gruppe(lies_nachrichten(d), kerzen, kopien=a.kopien, claude=a.claude)
        g["name"] = namen.get(d.stem, d.stem)
        erg["gruppen"][d.stem] = g
        print(text(g["name"], g))
    ERGEBNIS.parent.mkdir(exist_ok=True)
    ERGEBNIS.write_text(json.dumps(erg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("\nVergangenheit ist keine Garantie. Gelöschte Verlierer fehlen im Verlauf — massgeblich ist die Schatten-Bilanz ab heute.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
