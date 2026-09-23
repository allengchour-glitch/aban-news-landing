#!/usr/bin/env python3
"""Daytrading-Test: Gold, Silber, Öl, S&P 500 und Bitcoin auf Stundenkerzen — ehrlich gemessen.

Daytrading heisst hier: jede Position wird am selben Handelstag geschlossen, nie über Nacht.
Long (auf Steigen) und Short (auf Fallen) sind erlaubt. Kein echtes Geld, keine Broker-Anbindung.

Daten: Stundenkerzen der letzten ~2 Jahre (Yahoo Finance, ohne Schlüssel). Ein Handelstag ist
die Sitzung zwischen zwei Tagesschlüssen (Zeitstempel UTC + 2 h, damit die Futures-Pause um
21–23 Uhr UTC auf die Tagesgrenze fällt).

Regeln (alle entscheiden NUR mit Kerzen, die schon geschlossen sind):
  - Erste Stunden folgen:  nach K Stunden in Richtung der bisherigen Tagesbewegung bis Tagesschluss
  - Erste Stunden umkehren: dagegen setzen
  - Ausbruch aus der Anfangs-Spanne (Opening Range Breakout): Hoch/Tief der ersten K Stunden; erster
    Schluss darüber = long, darunter = short, bis Tagesschluss
Lernen: auf 120 Handelstagen die beste Regel wählen, die nächsten 20 ungesehenen Tage damit handeln.
Kosten: 0.05 % pro Hin- und Rückweg (Spread + Kommission). Ohne Kosten zum Vergleich.
Gegenprobe: wer den Tagesschluss schon kennt, muss ~100 % treffen; Zufall ~50 %.

    python3 daytrading_test.py            # Bericht nach daytrading-bericht.md (braucht Internet)
    python3 daytrading_test.py --offline  # nochmal mit den gespeicherten Stundenkerzen
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
import urllib.request
from collections import OrderedDict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

DATEN = Path.cwd() / "daten"
BERICHT = Path.cwd() / "daytrading-bericht.md"
MAERKTE = {"GC=F": "Gold", "SI=F": "Silber", "CL=F": "Öl (WTI)", "ES=F": "S&P 500 (Future)", "BTC-USD": "Bitcoin"}
KOSTEN = 0.0005
LERN, TEST = 120, 20


def stunden(sym, offline):
    DATEN.mkdir(exist_ok=True)
    datei = DATEN / ("h_" + sym.replace("^", "_").replace("=", "_") + ".json")
    if not offline or not datei.exists():  # fehlender Cache (frischer Runner) wird geholt
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(sym)}?interval=60m&range=730d"
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30) as r:
            d = json.load(r)["chart"]["result"][0]
        q = d["indicators"]["quote"][0]
        kerzen = [(t, o, c) for t, o, c in zip(d["timestamp"], q["open"], q["close"]) if o and c and o > 0 and c > 0]
        datei.write_text(json.dumps(kerzen))
    return json.loads(datei.read_text())


def sitzungen(kerzen):
    """Kerzen nach Handelstag gruppieren; zu kurze Tage (Feiertage, Randstücke) fallen raus."""
    tage = OrderedDict()
    for t, o, c in kerzen:
        tag = (datetime.fromtimestamp(t, timezone.utc) + timedelta(hours=2)).date()
        tage.setdefault(tag, []).append((o, c))
    return [(k, v) for k, v in tage.items() if len(v) >= 8]


# ───────────── Regeln: liefern (Richtung, Einstiegskurs) oder (0, None) — nur geschlossene Kerzen ─────────────
def folgen(tag, K, gegen=False):
    oeffnung, kurs = tag[0][0], tag[K - 1][1]
    if kurs == oeffnung:
        return 0, None
    r = 1 if kurs > oeffnung else -1
    return (-r if gegen else r), kurs


def ausbruch(tag, K):
    hoch = max(max(o, c) for o, c in tag[:K])
    tief = min(min(o, c) for o, c in tag[:K])
    for o, c in tag[K:-1]:
        if c > hoch:
            return 1, c
        if c < tief:
            return -1, c
    return 0, None


REGELN = ([(f"Erste {K} Std. folgen", lambda t, K=K: folgen(t, K)) for K in (1, 2, 3)]
          + [(f"Erste {K} Std. umkehren", lambda t, K=K: folgen(t, K, True)) for K in (1, 2, 3)]
          + [(f"Ausbruch aus {K}-Std.-Spanne", lambda t, K=K: ausbruch(t, K)) for K in (1, 2, 3)])


def ergebnis(tag, regel, kosten):
    """Tagesrendite einer Regel: Einstieg zum Signal-Schluss, Ausstieg zum Tagesschluss."""
    richtung, einstieg = regel(tag)
    if not richtung:
        return 0.0, None
    r = richtung * (tag[-1][1] / einstieg - 1) - kosten
    return r, r > 0


def sharpe(xs):
    if len(xs) < 2:
        return 0.0
    m = sum(xs) / len(xs)
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))
    return m / sd * math.sqrt(252) if sd else 0.0


def walk_forward(tage, kosten):
    out, treffer, wahl = [], [], []
    i = LERN
    while i + TEST <= len(tage):
        lern = tage[i - LERN:i]
        beste = max(REGELN, key=lambda rg: sharpe([ergebnis(t, rg[1], kosten)[0] for _, t in lern]))
        wahl.append(beste[0])
        for _, t in tage[i:i + TEST]:
            r, ok = ergebnis(t, beste[1], kosten)
            out.append(r)
            if ok is not None:
                treffer.append(ok)
        i += TEST
    return out, treffer, wahl


def gegenprobe(tage):
    rnd = random.Random(3)
    zukunft = lambda t: ((1 if t[-1][1] > t[0][1] else -1), t[0][1])  # kennt den Tagesschluss
    zufall = lambda t: (rnd.choice((1, -1)), t[0][1])
    a = [ergebnis(t, zukunft, 0)[1] for _, t in tage if t[-1][1] != t[0][1]]
    z = [ergebnis(t, zufall, 0)[1] for _, t in tage if t[-1][1] != t[0][1]]
    return sum(a) / len(a), sum(z) / len(z)


def zufall_p(tage, mit, n=2000):
    """Wie oft schafft eine Münzwurf-Richtung an denselben Tagen (gleicher Einstieg, gleiche Kosten)
    mindestens so viel wie der Bot? Hoher Wert = Ergebnis ist mit Glück erklärbar."""
    rnd = random.Random(7)
    ziel = gesamt(mit)[0]
    roh = []
    for (_, t), r in zip(tage[LERN:LERN + len(mit)], mit):
        if r == 0:
            continue
        roh.append(abs(r + KOSTEN))  # Betrag der Tagesbewegung ab Einstieg
    treffer = 0
    for _ in range(n):
        w = 1.0
        for b in roh:
            w *= 1 + (b if rnd.random() < 0.5 else -b) - KOSTEN
        treffer += (w - 1) >= ziel
    return treffer / n


def gesamt(xs):
    w, spitze, dd = 1.0, 1.0, 0.0
    for x in xs:
        w *= 1 + x
        spitze = max(spitze, w)
        dd = min(dd, w / spitze - 1)
    return w - 1, dd


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()
    zeilen = []
    for sym, name in MAERKTE.items():
        tage = sitzungen(stunden(sym, args.offline))
        a, z = gegenprobe(tage)
        if not (a > 0.97 and 0.44 < z < 0.56):
            print(f"✖ GEGENPROBE {name}: Zukunft {a:.1%}, Zufall {z:.1%} — Messgerät kaputt, Abbruch.")
            return 2
        mit, tr, wahl = walk_forward(tage, KOSTEN)
        ohne, tr0, _ = walk_forward(tage, 0.0)
        immer_long = [t[-1][1] / t[0][1] - 1 - KOSTEN for _, t in tage[LERN:LERN + len(mit)]]
        g_mit, dd_mit = gesamt(mit)
        g_ohne, _ = gesamt(ohne)
        g_long, dd_long = gesamt(immer_long)
        gehandelt = sum(1 for x in mit if x != 0) / len(mit)
        from collections import Counter
        haeufig = Counter(wahl).most_common(1)[0][0]
        pw = zufall_p(tage, mit)
        zeilen.append((name, tage[0][0], tage[-1][0], len(tage), len(mit), a, z, sum(tr) / len(tr), gehandelt,
                       g_ohne, g_mit, dd_mit, g_long, haeufig, sharpe(mit), pw))
        print(f"{name:17} {len(mit)} ungesehene Tage · Gegenprobe ok (Zukunft {a:.0%}, Zufall {z:.0%}) · "
              f"Trades richtig {sum(tr)/len(tr):.1%} · ohne Kosten {g_ohne:+.1%} · mit Kosten {g_mit:+.1%} · "
              f"immer long {g_long:+.1%} · Münzwurf gleich gut in {pw:.0%}")
    bericht(zeilen)
    return 0


def bericht(z):
    L = ["# Daytrading-Test — ehrlicher Rückblick", "",
         f"Stand {date.today().isoformat()} · `python3 daytrading_test.py` · kein echtes Geld.", "",
         "Stundenkerzen der letzten ~2 Jahre. Jede Position wird am selben Tag geschlossen. Die Regel für die",
         "nächsten 20 Tage wählt der Bot auf den 120 Tagen davor; gezählt werden nur diese ungesehenen Tage.", "",
         "| Markt | ungesehene Tage | Trades richtig | ohne Kosten | mit 0.05 % Kosten | schlimmster Einbruch | immer long (Tag) | Münzwurf gleich gut | häufigste Regel |",
         "|---|---:|---:|---:|---:|---:|---:|---:|---|"]
    for n, von, bis, nt, nu, a, zf, tr, geh, go, gm, dd, gl, h, sh, pw in z:
        L.append(f"| {n} | {nu} | {tr:.1%} | {go:+.1%} | {gm:+.1%} | {dd:.0%} | {gl:+.1%} | {pw:.0%} | {h} |")
    L += ["", "Gegenprobe pro Markt: eine Regel, die den Tagesschluss kennt, trifft "
          + ", ".join(f"{n} {a:.0%}" for n, *_r in z for a in [_r[4]]) + "; Zufall um 50 %.", "",
          "## Was das heisst", "",
          "„Münzwurf gleich gut“: Anteil von 2000 Zufalls-Richtungen an denselben Tagen, die mindestens so viel",
          "verdienen wie der Bot. Über 5 % heisst: das Ergebnis ist mit Glück erklärbar.", "",
          "Ohne Kosten sieht Daytrading oft harmlos aus. Mit realistischen Kosten zahlt man bei jedem Trade —",
          "bei einem Trade pro Tag rund 250-mal im Jahr. Genau dort verlieren die meisten.", "",
          "Keine Anlageberatung.", ""]
    BERICHT.write_text("\n".join(L), encoding="utf-8")
    print(f"→ {BERICHT.name}")


if __name__ == "__main__":
    sys.exit(main())
