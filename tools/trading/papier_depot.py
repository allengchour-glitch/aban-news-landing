#!/usr/bin/env python3
"""Übungsdepot: der Lern-Bot handelt jeden Tag mit Spielgeld und führt Buch über sich selbst.

Handelt KEIN echtes Geld (keine Broker-Anbindung). Jeder Markt startet mit CHF 10'000 Spielgeld,
daneben ein Vergleichsdepot „einfach halten" mit demselben Startbetrag.

Ablauf pro Lauf (täglich über .github/workflows/tages-update.yml):
  1. Offene Entscheidung von gestern abrechnen — NUR mit Kursen, die NACH ihrem Basis-Datum liegen.
  2. Neue Entscheidung treffen: auf den letzten 5 Jahren die beste der 14 festen Regeln wählen
     (Generation 2 aus lern_bot.py, vorab festgelegt) und deren heutiges Signal nehmen.
  3. Alles in data/papierdepot.json schreiben: Entscheidungen, Treffer, Depotwert, Vergleich.

Die eigene Statistik zählt erst ab dem Start. Rückwirkend wird nichts eingetragen: ein Rückblick
lässt sich schönrechnen, eine laufende Buchführung nicht.

    python3 tools/trading/papier_depot.py              # täglicher Lauf
    python3 tools/trading/papier_depot.py --pruefen    # Gegenprobe (Rückblick, schreibt nichts)
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lern_bot import KOSTEN, LERN_JAHRE, MAERKTE, TAGE_JAHR, handel, kennzahlen, kurse, raum  # noqa: E402
import daytrading as DT  # noqa: E402
import stil_labor as SL  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DEPOT = ROOT / "data" / "papierdepot.json"
START = 10000.0
REGELN = raum(2)


def renditen(p):
    return [0.0] + [p[i] / p[i - 1] - 1 for i in range(1, len(p))]


def entscheide(p, leck=None):
    """Beste Regel auf den letzten LERN_JAHRE (nur Kurse bis heute) und ihr heutiges Signal.
    leck = Kurs von morgen: nur für die Gegenprobe (eine Entscheidung, die schummelt)."""
    if leck is not None:
        return "GEGENPROBE: kennt morgen", 1 if leck > p[-1] else 0
    lern = LERN_JAHRE * TAGE_JAHR
    if len(p) < lern + 2:
        return None, 0
    r = renditen(p)
    beste, bs = None, -1e9
    for name, f in REGELN:
        sig = f(p)
        s = kennzahlen(handel(sig, r, len(p) - lern, len(p)))["sharpe"]
        if s > bs:
            beste, bs, heute = name, s, sig[-1]
    return beste, heute


def neu_markt(name):
    return {"name": name, "konto": START, "halten": None, "wechsel": 0, "entscheid": None,
            "prognosen": [], "verlauf": []}


def verbuche(m, reihe, leck_morgen=None):
    """Offene Entscheidung abrechnen, dann neu entscheiden. reihe = Kurse bis einschliesslich heute."""
    e = m["entscheid"]
    if e and reihe[-1][0] < e["basis_datum"]:
        return  # Kurse älter als die letzte Entscheidung (Cache/Quelle hinkt): nichts buchen, nichts neu entscheiden
    if e:
        kurs, pos = e["kurs"], e["position"]
        for datum, c in reihe:
            if datum <= e["basis_datum"]:
                continue
            r = c / kurs - 1
            m["konto"] *= 1 + pos * r
            m["halten"] *= 1 + r
            if r != 0:
                m["prognosen"].append({"basis": e["basis_datum"], "tag": datum, "position": pos,
                                       "rendite": round(r, 6), "richtig": (pos == 1) == (r > 0)})
            m["verlauf"].append({"datum": datum, "konto": round(m["konto"], 2), "halten": round(m["halten"], 2), "position": pos})
            kurs = c
    heute_d, heute_k = reihe[-1]
    if e and e["basis_datum"] == heute_d:
        return  # schon entschieden für heute: nichts doppelt buchen
    p = [c for _, c in reihe]
    regel, pos = entscheide(p, leck_morgen)
    if regel is None:
        return
    alt = e["position"] if e else 0
    if pos != alt:
        m["konto"] *= 1 - KOSTEN
        m["wechsel"] += 1
    if m["halten"] is None:
        m["halten"] = START * (1 - KOSTEN)
    m["entscheid"] = {"basis_datum": heute_d, "kurs": heute_k, "position": pos, "regel": regel,
                      "zeit": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}


def statistik(m):
    pr = m["prognosen"]
    werte = [v["konto"] for v in m["verlauf"]]
    dd, spitze = 0.0, START
    for w in werte:
        spitze = max(spitze, w)
        dd = min(dd, w / spitze - 1)
    return {"tage": len(pr), "treffer": (sum(x["richtig"] for x in pr) / len(pr)) if pr else None,
            "rendite": m["konto"] / START - 1, "halten_rendite": (m["halten"] / START - 1) if m["halten"] else None,
            "max_einbruch": dd, "wechsel": m["wechsel"]}


# ───────────── Stil-Vorwärtstest: die 9 Stile aus dem Stil-Labor, ab Start nur noch vorwärts ─────────────
def stil_neu():
    return {"konto": START, "pos": None, "basis": None, "kurs": None, "tage": 0, "richtig": 0, "wechsel": 0}


def stil_verbuche(b, reihe, pos_heute, halten):
    """b = Buch eines Stils auf einem Markt. Offene Position mit Kursen NACH ihrem Basis-Datum abrechnen,
    dann die heutige Position übernehmen (gehandelt ab morgen). halten = Vergleichsbuch des Marktes."""
    if b["basis"] is not None and reihe[-1][0] < b["basis"]:
        return  # veraltete Kurse: nicht rückwärts buchen
    if b["pos"] is not None:
        kurs = b["kurs"]
        for datum, c in reihe:
            if datum <= b["basis"]:
                continue
            r = c / kurs - 1
            b["konto"] *= 1 + b["pos"] * r
            if r != 0:
                b["tage"] += 1
                b["richtig"] += (b["pos"] == 1) == (r > 0)
            kurs = c
    heute_d, heute_k = reihe[-1]
    if b["basis"] == heute_d:
        return
    if pos_heute != (b["pos"] or 0):
        b["konto"] *= 1 - KOSTEN
        b["wechsel"] += 1
    b.update(pos=pos_heute, basis=heute_d, kurs=heute_k)


def halten_verbuche(h, reihe):
    if h["basis"] is not None and reihe[-1][0] < h["basis"]:
        return
    if h["basis"] is not None:
        for datum, c in reihe:
            if datum > h["basis"]:
                h["konto"] *= c / h["kurs"]
                h["kurs"] = c
    else:
        h["konto"] = START * (1 - KOSTEN)
        h["kurs"] = reihe[-1][1]
    h["basis"] = reihe[-1][0]


def stil_tag(st, reihen, leck=False):
    """Ein Tageslauf für alle Stile auf allen Märkten. leck=True: Gegenprobe-Stil, der morgen kennt."""
    for sym, reihe in reihen.items():
        p = [c for _, c in reihe]
        r = [0.0] + [p[i] / p[i - 1] - 1 for i in range(1, len(p))]
        m = st["maerkte"].setdefault(sym, {"halten": {"konto": START, "basis": None, "kurs": None}, "stile": {}})
        halten_verbuche(m["halten"], reihe)
        for name, _regel, f in SL.STILE:
            pos = f(p, [d for d, _ in reihe], r)[-1]
            stil_verbuche(m["stile"].setdefault(name, stil_neu()), reihe, pos, m["halten"])


def stil_zusammenfassen(st):
    namen = [n for n, _, _ in SL.STILE]
    halten = sum(m["halten"]["konto"] for m in st["maerkte"].values())
    st["gesamt"] = {n: {"konto": round(sum(m["stile"][n]["konto"] for m in st["maerkte"].values() if n in m["stile"]), 2),
                        "tage": sum(m["stile"][n]["tage"] for m in st["maerkte"].values() if n in m["stile"]),
                        "richtig": sum(m["stile"][n]["richtig"] for m in st["maerkte"].values() if n in m["stile"])}
                    for n in namen}
    st["halten_chf"] = round(halten, 2)


def stil_gegenprobe(tage_n=120):
    """Buchführung prüfen: ein „Stil", der morgen kennt, muss ~100 % richtig liegen; Momentum um 50 %."""
    reihe = kurse("^GSPC", offline=True)
    wissend = {"konto": START, "pos": None, "basis": None, "kurs": None, "tage": 0, "richtig": 0, "wechsel": 0}
    ehrlich = dict(wissend)
    h = {"konto": START, "basis": None, "kurs": None}
    for k in range(len(reihe) - tage_n, len(reihe) - 1):
        bis = reihe[:k + 1]
        p = [c for _, c in bis]
        halten_verbuche(h, bis)
        stil_verbuche(wissend, bis, 1 if reihe[k + 1][1] > reihe[k][1] else 0, h)
        stil_verbuche(ehrlich, bis, 1 if p[-1] > p[-253] else 0, h)
    tw, te = wissend["richtig"] / wissend["tage"], ehrlich["richtig"] / max(ehrlich["tage"], 1)
    gut = tw > 0.97 and wissend["tage"] > 100 and (ehrlich["tage"] == 0 or 0.25 < te < 0.75)
    print(f"{'✅' if gut else '❌'} Stil-Vorwärtstest: wer morgen kennt {tw:.0%} ({wissend['tage']} Tage), "
          f"Momentum {te:.0%} ({ehrlich['tage']} Tage)")
    return gut


# ───────────── Daytrading: Regel morgens einfrieren, erst ab der NÄCHSTEN Sitzung handeln ─────────────
def dt_neu(name):
    return {"name": name, "konto": START, "regel": None, "gilt_ab": None, "einfrierungen": [], "trades": [],
            "gebucht_bis": None}


def dt_verbuche(m, tage, heute_sitzung, leck=False):
    """tage = abgeschlossene Sitzungen [(datum, kerzen)]. Jede Sitzung wird mit der jüngsten Regel gehandelt,
    die VOR ihrem Beginn eingefroren wurde (Einfrierung `ab` <= Sitzungsdatum). Einfrierungen werden nie
    überschrieben, nur angehängt. leck=True: Gegenprobe (kennt den Tagesschluss)."""
    regeln = dict(DT.REGELN)
    fr = m.setdefault("einfrierungen", [])
    for datum, t in tage:
        d = datum.isoformat()
        if m["gebucht_bis"] and d <= m["gebucht_bis"]:
            continue
        gueltig = [f for f in fr if f["ab"] <= d]
        if not gueltig:
            continue
        name = gueltig[-1]["regel"]
        regel = (lambda k: ((1 if k[-1][1] > k[0][1] else -1), k[0][1])) if leck else regeln[name]
        r, ok = DT.ergebnis(t, regel, 0.0 if leck else DT.KOSTEN)  # Gegenprobe misst nur die Richtung
        m["konto"] *= 1 + r
        if ok is not None:
            m["trades"].append({"tag": d, "regel": name, "rendite": round(r, 6), "richtig": ok})
        m["gebucht_bis"] = d
    # Alte Einfrierungen, die von einer jüngeren schon abgelöst und abgerechnet sind, braucht es nicht mehr
    while len(fr) > 1 and m["gebucht_bis"] and fr[1]["ab"] <= m["gebucht_bis"]:
        fr.pop(0)
    lern = tage[-DT.LERN:]
    if len(lern) < DT.LERN:
        return
    beste = max(DT.REGELN, key=lambda rg: DT.sharpe([DT.ergebnis(t, rg[1], DT.KOSTEN)[0] for _, t in lern]))
    neu_ab = (heute_sitzung + timedelta(days=1)).isoformat()
    if not fr or neu_ab > fr[-1]["ab"]:
        fr.append({"ab": neu_ab, "regel": beste[0]})
        m["regel"], m["gilt_ab"] = beste[0], neu_ab


def dt_statistik(m):
    t = m["trades"]
    return {"trades": len(t), "treffer": (sum(x["richtig"] for x in t) / len(t)) if t else None,
            "rendite": m["konto"] / START - 1}


def dt_heute():
    return (datetime.now(timezone.utc) + timedelta(hours=2)).date()


def dt_gegenprobe(tage_n=60):
    """Rückblick: ehrlich ~50 % richtig, mit Kenntnis des Tagesschlusses ~100 %."""
    ok = True
    for sym, name in DT.MAERKTE.items():
        alle = DT.handelstage(sym, offline=True)
        ehrlich, leck = dt_neu(name), dt_neu(name)
        for k in range(len(alle) - tage_n, len(alle)):
            fertig, heute = alle[:k], alle[k][0]
            dt_verbuche(ehrlich, fertig, heute)
            dt_verbuche(leck, fertig, heute, leck=True)
        se, sl = dt_statistik(ehrlich), dt_statistik(leck)
        gut = (se["trades"] > 10 and sl["treffer"] is not None and 0.30 < se["treffer"] < 0.70
               and sl["treffer"] > 0.97)
        ok &= gut
        pz = lambda x: "—" if x is None else f"{x:.1%}"
        print(f"{'✅' if gut else '❌'} Daytrading {name:17} ehrlich {pz(se['treffer'])} ({se['trades']} Trades, "
              f"Depot {se['rendite']:+.1%}) · mit Blick auf den Tagesschluss {pz(sl['treffer'])}")
    return ok


def gegenprobe(tage=250):
    """Rückblick über die letzten `tage` Handelstage, als wäre der Bot täglich gelaufen.
    Ehrlich: ~50 % Treffer. Mit Blick in die Zukunft: ~100 %. Sonst stimmt die Buchführung nicht."""
    ok = True
    for sym, name in MAERKTE.items():
        reihe = kurse(sym, offline=True)
        ehrlich, leck = neu_markt(name), neu_markt(name)
        for k in range(len(reihe) - tage, len(reihe)):
            verbuche(ehrlich, reihe[:k + 1])
            morgen = reihe[k + 1][1] if k + 1 < len(reihe) else None
            if morgen is not None:
                verbuche(leck, reihe[:k + 1], leck_morgen=morgen)
        se, sl = statistik(ehrlich), statistik(leck)
        gut = 0.40 < se["treffer"] < 0.62 and sl["treffer"] > 0.97
        ok &= gut
        print(f"{'✅' if gut else '❌'} {name:13} ehrlich {se['treffer']:.1%} Treffer, Depot {se['rendite']:+.1%} "
              f"(Halten {se['halten_rendite']:+.1%}) · mit Blick in die Zukunft {sl['treffer']:.1%}")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pruefen", action="store_true")
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()
    if args.pruefen:
        return 0 if (gegenprobe() & dt_gegenprobe() & stil_gegenprobe()) else 1
    daten = json.loads(DEPOT.read_text()) if DEPOT.exists() else {
        "start": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "startkapital_chf": START,
        "hinweis": "Spielgeld, kein echter Handel. Statistik zählt erst ab Start, nichts rückwirkend.",
        "maerkte": {}}
    reihen = {}
    for sym, name in MAERKTE.items():
        try:
            reihe = kurse(sym, args.offline)
        except Exception as ex:  # ein Markt ohne Kurse darf die anderen nicht stoppen
            print(f"  {name}: keine Kurse ({ex}) — heute übersprungen")
            continue
        reihen[sym] = reihe
        m = daten["maerkte"].setdefault(sym, neu_markt(name))
        verbuche(m, reihe)
        m["statistik"] = statistik(m)
        e, s = m["entscheid"], m["statistik"]
        print(f"  {name:13} {'investiert' if e['position'] else 'Cash':10} ({e['regel']}) · Basis {e['basis_datum']} · "
              f"{s['tage']} Tage abgerechnet · Depot CHF {m['konto']:,.0f} vs. Halten CHF {m['halten']:,.0f}")
    dt = daten.setdefault("daytrading", {"hinweis": "Regel wird morgens eingefroren und gilt erst ab der nächsten Sitzung. Kosten 0.05 % pro Trade.", "maerkte": {}})
    heute = dt_heute()
    for sym, name in DT.MAERKTE.items():
        try:
            alle_s = DT.handelstage(sym, args.offline)
        except Exception as ex:
            print(f"  Daytrading {name}: keine Stundenkurse ({ex}) — heute übersprungen")
            continue
        fertig = [(d, t) for d, t in alle_s if d < heute]
        m = dt["maerkte"].setdefault(sym, dt_neu(name))
        dt_verbuche(m, fertig, heute)
        m["statistik"] = dt_statistik(m)
        print(f"  Daytrading {name:17} Regel ab {m['gilt_ab']}: {m['regel']} · {m['statistik']['trades']} Trades · "
              f"Depot CHF {m['konto']:,.0f}")
    dtt = [x for m in dt["maerkte"].values() for x in m["trades"]]
    dt["gesamt"] = {"trades": len(dtt), "treffer": (sum(x["richtig"] for x in dtt) / len(dtt)) if dtt else None,
                    "depot_chf": round(sum(m["konto"] for m in dt["maerkte"].values()), 2)}
    alle = [x for m in daten["maerkte"].values() for x in m["prognosen"]]
    daten["gesamt"] = {"tage": len(alle), "treffer": (sum(x["richtig"] for x in alle) / len(alle)) if alle else None,
                       "depot_chf": round(sum(m["konto"] for m in daten["maerkte"].values()), 2),
                       "halten_chf": round(sum(m["halten"] or 0 for m in daten["maerkte"].values()), 2)}
    st = daten.get("stil_vorwaerts")
    if st is None:
        # Vorab festgehalten, BEVOR ein einziger Vorwärtstag zählt: der Skill aus dem Rückblick.
        # Wer später nachschaut, sieht, ob der Rückblick gehalten hat — nachträglich ändern geht nicht.
        labor = json.loads((ROOT / "data" / "stil-labor.json").read_text(encoding="utf-8"))
        st = daten["stil_vorwaerts"] = {
            "start": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "vorab": {n: round(v, 3) for n, v in labor["skill_schnitt"].items()},
            "vorab_quelle": f"data/stil-labor.json vom {labor['stand']}",
            "hinweis": "Neun feste Stile, je CHF 10'000 pro Markt, Signal am Schluss, gehandelt am Folgetag.",
            "maerkte": {}}
    stil_tag(st, reihen)
    stil_zusammenfassen(st)
    tag = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    verlauf = [v for v in daten.get("verlauf", []) if v["datum"] != tag]
    verlauf.append({"datum": tag, "bot": daten["gesamt"]["depot_chf"], "halten": daten["gesamt"]["halten_chf"],
                    "daytrading": dt["gesamt"]["depot_chf"]})
    daten["verlauf"] = verlauf
    daten["stand"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    DEPOT.write_text(json.dumps(daten, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"→ {DEPOT.relative_to(ROOT)} · gesamt {daten['gesamt']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
