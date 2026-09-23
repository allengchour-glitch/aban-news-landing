#!/usr/bin/env python3
"""Lern-Bot fuer Trading-Strategien — ehrlich gemessen, NUR Rueckblick und Uebungsmodus.

Handelt KEIN echtes Geld und kann es auch nicht: es gibt keine Anbindung an einen Broker.

Was er tut
  1. Tageskurse seit 2000 holen (Yahoo Finance, ohne Schluessel), lokal zwischenspeichern.
  2. LERNEN per Walk-Forward: auf 5 Jahren die beste Strategie + Einstellung suchen, dann das
     NAECHSTE Jahr damit handeln, das er nie gesehen hat. Ein Jahr weiter, von vorn. Nur diese
     ungesehenen Jahre zaehlen fuer das Urteil.
  3. „Bis er immer richtig liegt?" — jede Generation erlaubt mehr Strategien und Einstellungen.
     Gemessen wird beides: wie oft er auf den Lern-Daten richtig liegt (steigt) und wie oft auf den
     ungesehenen Jahren (die Wahrheit). Die Luecke dazwischen ist Auswendiglernen, kein Koennen.
     Er hoert auf, sobald mehr Auswahl die ungesehenen Jahre nicht mehr besser macht.
  4. Urteil „echtes Geld: JA/NEIN" gegen die einfachste Alternative: kaufen und halten.

Regeln gegen Selbstbetrug
  - Signal am Tagesschluss t wird erst am Tag t+1 gehandelt (kein Blick in die Zukunft).
  - 0.1 % Kosten pro Wechsel zwischen investiert und Cash. Nur long oder Cash, kein Hebel.
  - GEGENPROBE eingebaut: eine Strategie, die morgen schon kennt, muss ~100 % treffen; eine
    Zufalls-Strategie ~50 %. Tut sie das nicht, ist das Messgeraet kaputt und der Lauf bricht ab.

    python3 tools/trading/lern_bot.py            # alles, Bericht nach reports/TRADING-BOT.md
    python3 tools/trading/lern_bot.py --offline  # nur zwischengespeicherte Kurse
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATEN = Path(__file__).resolve().parent / "daten"
BERICHT = ROOT / "reports" / "TRADING-BOT.md"
MAERKTE = {"^GSPC": "S&P 500", "^SSMI": "SMI", "NESN.SW": "Nestlé", "BTC-USD": "Bitcoin", "EURCHF=X": "EUR/CHF",
           "GC=F": "Gold", "SI=F": "Silber", "CL=F": "Öl (WTI)"}
KOSTEN = 0.001
LERN_JAHRE = 5
TAGE_JAHR = 252


# ───────────────────────── Daten ─────────────────────────
def kurse(sym: str, offline: bool) -> list[tuple[str, float]]:
    DATEN.mkdir(exist_ok=True)
    datei = DATEN / (sym.replace("^", "_").replace("=", "_") + ".json")
    if not offline or not datei.exists():  # fehlender Cache (frischer Runner) wird geholt
        url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(sym)}"
               f"?period1=946684800&period2={int(datetime.now().timestamp())}&interval=1d")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.load(r)["chart"]["result"][0]
        reihe = [(datetime.fromtimestamp(t, timezone.utc).date().isoformat(), c)
                 for t, c in zip(d["timestamp"], d["indicators"]["quote"][0]["close"]) if c and c > 0]
        # ⚠️ Öl (CL=F) notierte am 20.04.2020 bei -37 USD. Ein Kurs <= 0 macht jede Rendite
        # sinnlos (Division, Vorzeichen) — solche Tage fallen raus.
        datei.write_text(json.dumps(reihe))
    return [tuple(x) for x in json.loads(datei.read_text())]


# ───────────────────────── Indikatoren ─────────────────────────
def sma(p, n):
    out, s = [None] * len(p), 0.0
    for i, x in enumerate(p):
        s += x
        if i >= n:
            s -= p[i - n]
        if i >= n - 1:
            out[i] = s / n
    return out


def rsi(p, n=14):
    out = [None] * len(p)
    auf = ab = 0.0
    for i in range(1, len(p)):
        d = p[i] - p[i - 1]
        g, v = max(d, 0.0), max(-d, 0.0)
        if i <= n:
            auf += g / n
            ab += v / n
        else:
            auf = (auf * (n - 1) + g) / n
            ab = (ab * (n - 1) + v) / n
        if i >= n:
            out[i] = 100.0 if ab == 0 else 100 - 100 / (1 + auf / ab)
    return out


# ───────────────────────── Strategien ─────────────────────────
# Jede liefert pro Tag 1 (investiert) oder 0 (Cash), berechnet NUR aus Kursen bis einschliesslich t.
def strat_ma(p, f, s):
    a, b = sma(p, f), sma(p, s)
    return [1 if a[i] is not None and b[i] is not None and a[i] > b[i] else 0 for i in range(len(p))]


def strat_mom(p, L):
    return [1 if i >= L and p[i] > p[i - L] else 0 for i in range(len(p))]


def strat_rsi(p, lo, hi):
    r, pos, out = rsi(p), 0, []
    for x in r:
        if x is not None:
            if x < lo:
                pos = 1
            elif x > hi:
                pos = 0
        out.append(pos)
    return out


def strat_trend_mom(p, s, L):
    a, m = strat_ma(p, 1, s), strat_mom(p, L)
    return [x & y for x, y in zip(a, m)]


def raum(generation: int) -> list[tuple[str, callable]]:
    """Generation 1 = wenige, einfache Regeln. Jede weitere Generation: mehr Auswahl."""
    g = []
    g += [(f"Gleitende Durchschnitte {f}/{s}", lambda p, f=f, s=s: strat_ma(p, f, s)) for f, s in [(50, 200)]]
    g += [(f"Momentum {L} Tage", lambda p, L=L: strat_mom(p, L)) for L in [250]]
    if generation >= 2:
        g += [(f"Gleitende Durchschnitte {f}/{s}", lambda p, f=f, s=s: strat_ma(p, f, s))
              for f in (10, 20, 50) for s in (100, 150, 200) if f < s]
        g += [(f"Momentum {L} Tage", lambda p, L=L: strat_mom(p, L)) for L in (20, 60, 120)]
    if generation >= 3:
        g += [(f"RSI kaufen <{lo}, verkaufen >{hi}", lambda p, lo=lo, hi=hi: strat_rsi(p, lo, hi))
              for lo in (20, 25, 30, 35) for hi in (50, 60, 70, 80)]
    if generation >= 4:
        g += [(f"Trend {s} + Momentum {L}", lambda p, s=s, L=L: strat_trend_mom(p, s, L))
              for s in (50, 100, 150, 200) for L in (20, 60, 120, 250)]
        g += [(f"Gleitende Durchschnitte {f}/{s}", lambda p, f=f, s=s: strat_ma(p, f, s))
              for f in range(5, 60, 5) for s in range(60, 260, 20)]
    return g


# ───────────────────────── Messung ─────────────────────────
def handel(sig, r, von, bis):
    """Tagesrenditen der Strategie im Fenster [von, bis): Position von gestern, Kosten bei Wechsel."""
    out = []
    for i in range(max(von, 1), bis):
        pos, vorher = sig[i - 1], sig[i - 2] if i >= 2 else 0
        out.append(pos * r[i] - (KOSTEN if pos != vorher else 0.0))
    return out


def kennzahlen(ret):
    if not ret:
        return {"cagr": 0, "sharpe": 0, "maxdd": 0}
    eq, spitze, dd = 1.0, 1.0, 0.0
    for x in ret:
        eq *= 1 + x
        spitze = max(spitze, eq)
        dd = min(dd, eq / spitze - 1)
    n = len(ret)
    m = sum(ret) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in ret) / max(n - 1, 1))
    return {"cagr": eq ** (TAGE_JAHR / n) - 1, "sharpe": (m / sd * math.sqrt(TAGE_JAHR)) if sd else 0, "maxdd": dd}


def treffer(sig, r, von, bis):
    """„Richtig liegen": investiert und der Tag stieg, oder in Cash und der Tag fiel."""
    t = [(sig[i - 1] == 1) == (r[i] > 0) for i in range(max(von, 1), bis) if r[i] != 0]
    return sum(t) / len(t) if t else 0.0


def walk_forward(p, r, kandidaten):
    """Lernen auf LERN_JAHRE, handeln im folgenden Jahr. Liefert ungesehene Renditen + Trefferquoten."""
    signale = [(n, f(p)) for n, f in kandidaten]
    lern, test = LERN_JAHRE * TAGE_JAHR, TAGE_JAHR
    oos, bh, wahl, tr_in, tr_out = [], [], [], [], []
    start = max(260, lern)
    while start + test <= len(p):
        best = max(signale, key=lambda s: kennzahlen(handel(s[1], r, start - lern, start))["sharpe"])
        wahl.append(best[0])
        tr_in.append(treffer(best[1], r, start - lern, start))
        tr_out.append(treffer(best[1], r, start, start + test))
        oos += handel(best[1], r, start, start + test)
        bh += [r[i] for i in range(start, start + test)]
        start += test
    return oos, bh, wahl, tr_in, tr_out


def bootstrap_p(a, b, n=2000, seed=7):
    """Wie oft waere der Vorsprung (a - b) durch Zufall entstanden? Einfacher Block-Bootstrap."""
    d = [x - y for x, y in zip(a, b)]
    if not d:
        return 1.0
    echt, rnd, blk = sum(d) / len(d), random.Random(seed), 20
    zentriert = [x - echt for x in d]
    kleiner = 0
    for _ in range(n):
        s = []
        while len(s) < len(d):
            k = rnd.randrange(0, len(d) - blk)
            s += zentriert[k:k + blk]
        if sum(s[:len(d)]) / len(d) >= echt:
            kleiner += 1
    return kleiner / n


# ───────────────────────── „Bis er immer richtig liegt" ─────────────────────────
def auswendiglerner(r, k):
    """Merkt sich auf den Lern-Daten jedes Muster der letzten k Tage (hoch/runter) und was am
    Folgetag passierte. Mit grossem k ist fast jedes Muster einmalig -> auf der Vergangenheit
    nahezu 100 % richtig. Auf ungesehenen Jahren kennt er die Muster nicht mehr (dann: investiert)."""
    lern, test = LERN_JAHRE * TAGE_JAHR, TAGE_JAHR
    muster = lambda i: tuple(1 if r[j] > 0 else 0 for j in range(i - k + 1, i + 1))
    rin, rout, start = [], [], lern
    while start + test <= len(r):
        wissen = {}
        for i in range(start - lern + k, start - 1):
            wissen.setdefault(muster(i), []).append(1 if r[i + 1] > 0 else 0)
        wissen = {m: (1 if sum(v) * 2 >= len(v) else 0) for m, v in wissen.items()}
        for i in range(start - lern + k, start - 1):
            if r[i + 1] != 0:
                rin.append(wissen[muster(i)] == (1 if r[i + 1] > 0 else 0))
        for i in range(start, start + test - 1):
            if r[i + 1] != 0:
                rout.append(wissen.get(muster(i), 1) == (1 if r[i + 1] > 0 else 0))
        start += test
    return sum(rin) / len(rin), sum(rout) / len(rout)


# ───────────────────────── Gegenprobe ─────────────────────────
def gegenprobe(p, r):
    zukunft = [1 if i + 1 < len(r) and r[i + 1] > 0 else 0 for i in range(len(r))]  # kennt morgen
    rnd = random.Random(1)
    zufall = [rnd.randint(0, 1) for _ in r]
    a, z = treffer(zukunft, r, 1, len(r)), treffer(zufall, r, 1, len(r))
    ok = a > 0.97 and 0.46 < z < 0.54
    return ok, a, z


# ───────────────────────── Ablauf ─────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()
    zeilen, gesamt = [], {}
    for sym, name in MAERKTE.items():
        reihe = kurse(sym, args.offline)
        p = [c for _, c in reihe]
        r = [0.0] + [p[i] / p[i - 1] - 1 for i in range(1, len(p))]
        ok, a, z = gegenprobe(p, r)
        if not ok:
            print(f"✖ GEGENPROBE {name}: Zukunft {a:.1%}, Zufall {z:.1%} — Messgeraet kaputt, Abbruch.")
            return 2
        print(f"\n{name}: {len(p)} Tage {reihe[0][0]} → {reihe[-1][0]} · Gegenprobe ok (Zukunft {a:.1%}, Zufall {z:.1%})")
        beste, verlauf = None, []
        for gen in range(1, 5):
            k = raum(gen)
            oos, bh, wahl, tin, tout = walk_forward(p, r, k)
            ko, kb = kennzahlen(oos), kennzahlen(bh)
            e = {"gen": gen, "n": len(k), "in": sum(tin) / len(tin), "out": sum(tout) / len(tout),
                 "ko": ko, "kb": kb, "oos": oos, "bh": bh, "wahl": wahl}
            verlauf.append(e)
            print(f"  Generation {gen}: {len(k):3} Strategien · richtig auf Lern-Daten {e['in']:.1%} · "
                  f"auf ungesehenen Jahren {e['out']:.1%} · Rendite/Jahr {ko['cagr']:+.1%} (Halten {kb['cagr']:+.1%})")
            if beste is None or ko["sharpe"] > beste["ko"]["sharpe"] + 0.02:
                beste = e
            elif gen >= 2:
                print("  → mehr Auswahl macht die ungesehenen Jahre nicht besser: Lernen gestoppt.")
                break
        merk = []
        for k in (3, 8, 14, 20):
            ri, ro = auswendiglerner(r, k)
            merk.append((k, ri, ro))
            print(f"  Auswendiglerner, Muster aus {k:2} Tagen: richtig auf Vergangenheit {ri:.1%} · auf ungesehenen Jahren {ro:.1%}")
        p_wert = bootstrap_p(beste["oos"], beste["bh"])
        ja = (beste["ko"]["sharpe"] > beste["kb"]["sharpe"] and beste["ko"]["cagr"] >= beste["kb"]["cagr"] - 0.01
              and p_wert < 0.05)
        gesamt[name] = ja
        from collections import Counter
        haeufig = Counter(beste["wahl"]).most_common(1)[0]
        zeilen.append((name, reihe[0][0], reihe[-1][0], verlauf, beste, p_wert, ja, haeufig, merk))
    bericht(zeilen, gesamt)
    return 0


def bericht(zeilen, gesamt):
    L = ["# Lern-Bot Trading — ehrlicher Rückblick", "",
         f"Stand {date.today().isoformat()} · `python3 tools/trading/lern_bot.py` · handelt kein echtes Geld.", "",
         "**Lernen** heisst hier: auf 5 Jahren die beste Strategie suchen, dann das nächste, ungesehene Jahr damit",
         "handeln — Jahr für Jahr. Kosten 0.1 % pro Wechsel, Signal erst am Folgetag gehandelt, nur long oder Cash.", "",
         "## Liegt er irgendwann immer richtig?", "",
         "| Markt | Generation | Strategien | richtig auf Lern-Daten | richtig auf ungesehenen Jahren |",
         "|---|---:|---:|---:|---:|"]
    for name, _, _, verlauf, *_ in zeilen:
        for e in verlauf:
            L.append(f"| {name} | {e['gen']} | {e['n']} | {e['in']:.1%} | {e['out']:.1%} |")
    L += ["", "### Der Auswendiglerner — so sieht „immer richtig“ aus", "",
          "Er merkt sich jedes Kursmuster der letzten k Tage und was danach kam. Je länger das Muster, desto",
          "einmaliger — bis er die Vergangenheit fast perfekt „vorhersagt“.", "",
          "| Markt | Muster-Länge | richtig auf Vergangenheit | richtig auf ungesehenen Jahren |", "|---|---:|---:|---:|"]
    for name, *_, merk in zeilen:
        for k, ri, ro in merk:
            L.append(f"| {name} | {k} Tage | {ri:.1%} | {ro:.1%} |")
    L += ["", "Mehr Auswahl hebt die Trefferquote auf den **Lern-Daten**. Auf den **ungesehenen** Jahren bleibt sie",
          "nahe 50 %. Diese Lücke ist Auswendiglernen der Vergangenheit, kein Können.", "",
          "## Urteil pro Markt (nur ungesehene Jahre)", "",
          "| Markt | Daten | Bot: Rendite/Jahr | Halten: Rendite/Jahr | Bot: schlimmster Einbruch | Halten: schlimmster Einbruch | Bot: Sharpe | Halten: Sharpe | Zufall? (p) | echtes Geld |",
          "|---|---|---:|---:|---:|---:|---:|---:|---:|---|"]
    for name, von, bis, verlauf, b, p, ja, _, _ in zeilen:
        ko, kb = b["ko"], b["kb"]
        L.append(f"| {name} | {von[:4]}–{bis[:4]} | {ko['cagr']:+.1%} | {kb['cagr']:+.1%} | {ko['maxdd']:.0%} | {kb['maxdd']:.0%} | "
                 f"{ko['sharpe']:.2f} | {kb['sharpe']:.2f} | {p:.2f} | {'**JA**' if ja else 'NEIN'} |")
    L += ["", "⚠️ Die Generation, die hier zählt, wählt der Bot, indem er schaut, ob mehr Auswahl die ungesehenen",
          "Jahre verbessert. Das ist ein kleiner Blick in die Prüfungsdaten und begünstigt den Bot. Das Urteil gilt trotzdem.", "",
          "**Echtes Geld: JA** nur, wenn der Bot auf den ungesehenen Jahren besser abschneidet als Halten",
          "(Rendite pro Risiko), nicht weniger verdient und der Vorsprung kaum Zufall ist (p < 0.05).", "",
          "## Was er am häufigsten gewählt hat", ""]
    for name, _, _, _, b, _, _, h, _ in zeilen:
        L.append(f"- {name}: {h[0]} ({h[1]}× in {len(b['wahl'])} ungesehenen Jahren)")
    anz = sum(gesamt.values())
    L += ["", "## Gesamturteil", "",
          (f"Auf {anz} von {len(gesamt)} Märkten schlägt der Bot das Halten belastbar." if anz else
           "Auf keinem der Märkte schlägt der Bot das einfache Kaufen-und-Halten belastbar."),
          "", "Keine Anlageberatung. Vergangene Kurse sagen die Zukunft nicht voraus — auch nicht die ungesehenen Jahre hier.", ""]
    BERICHT.parent.mkdir(exist_ok=True)
    BERICHT.write_text("\n".join(L), encoding="utf-8")
    print(f"\n→ {BERICHT.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
