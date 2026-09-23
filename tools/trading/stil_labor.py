#!/usr/bin/env python3
"""Stil-Labor: zehn bekannte Trading-Stile auf acht Märkten, jeder mit einer Skill-Anzeige in Prozent.

Skill % = Anteil von Zufallsstrategien, die der Stil schlägt (Sharpe nach Kosten). Die
Zufallsstrategien sind gleich lang im Markt und wechseln gleich oft wie der Stil — so misst die
Zahl das Timing, nicht bloss „mehr investiert" oder „weniger Kosten". 50 % = kein Können.

Alle Stile sind feste Lehrbuch-Regeln (kein Anpassen an die Daten). Signal am Schluss, gehandelt
am nächsten Tag, 0.1 % Kosten pro Wechsel, nur investiert oder Cash.
Gegenprobe: ein Stil, der den nächsten Tag kennt, muss ~100 % Skill haben, ein Münzwurf um 50 %.

    python3 tools/trading/stil_labor.py            # nutzt die Kurs-Caches, holt fehlende
    → reports/STIL-LABOR.md + data/stil-labor.json
"""
from __future__ import annotations

import json
import math
import random
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lern_bot as L  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BERICHT = ROOT / "reports" / "STIL-LABOR.md"
JSON = ROOT / "data" / "stil-labor.json"
KOSTEN = 0.001
N_ZUFALL = 200


# ───────────── Stile: Liste von 0/1 (1 = investiert) je Tag, nur mit Kursen bis zu diesem Tag ─────────────
def sma(p, n):
    out, s = [None] * len(p), 0.0
    for i, x in enumerate(p):
        s += x
        if i >= n:
            s -= p[i - n]
        if i >= n - 1:
            out[i] = s / n
    return out


def trend(p, d, _r):
    a, b = sma(p, 50), sma(p, 200)
    return [1 if b[i] is not None and a[i] > b[i] else 0 for i in range(len(p))]


def momentum(p, d, _r):
    return [1 if i >= 252 and p[i] > p[i - 252] else 0 for i in range(len(p))]


def ausbruch(p, d, _r):
    """Turtle-Stil: Kauf über dem 55-Tage-Hoch, Verkauf unter dem 20-Tage-Tief."""
    pos, out = 0, []
    for i in range(len(p)):
        if i >= 55 and p[i] > max(p[i - 55:i]):
            pos = 1
        elif i >= 20 and p[i] < min(p[i - 20:i]):
            pos = 0
        out.append(pos)
    return out


def rsi2(p, d, _r):
    """Mean Reversion (Connors): RSI(2) unter 10 kaufen, über 70 verkaufen, nur über dem 200-Tage-Schnitt."""
    lang, pos, out, g, v = sma(p, 200), 0, [], 0.0, 0.0
    for i in range(len(p)):
        if i:
            ch = p[i] - p[i - 1]
            g = (g + max(ch, 0)) / 2
            v = (v + max(-ch, 0)) / 2
        rsi = 100 if v == 0 else 100 - 100 / (1 + g / v)
        if lang[i] is not None and p[i] > lang[i] and rsi < 10:
            pos = 1
        elif rsi > 70 or (lang[i] is not None and p[i] < lang[i]):
            pos = 0
        out.append(pos)
    return out


def dip(p, d, _r):
    """Buy the Dip: nach −5 % in 5 Tagen kaufen, 10 Handelstage halten."""
    out, rest = [], 0
    for i in range(len(p)):
        if i >= 5 and p[i] / p[i - 5] - 1 <= -0.05:
            rest = 10
        out.append(1 if rest > 0 else 0)
        rest = max(rest - 1, 0)
    return out


def swing(p, d, _r):
    """Swing: nach drei Tagen in Folge im Minus kaufen, nach dem ersten Plus-Tag verkaufen."""
    pos, out = 0, []
    for i in range(len(p)):
        if i >= 3 and p[i] < p[i - 1] < p[i - 2] < p[i - 3]:
            pos = 1
        elif i and p[i] > p[i - 1]:
            pos = 0
        out.append(pos)
    return out


def sell_in_may(p, d, _r):
    return [1 if int(x[5:7]) in (11, 12, 1, 2, 3, 4) else 0 for x in d]


def monatswechsel(p, d, _r):
    """Letzter Handelstag des Monats bis dritter Handelstag des neuen Monats investiert."""
    out = [0] * len(d)
    for i in range(len(d)):
        if i + 1 < len(d) and d[i + 1][5:7] != d[i][5:7]:
            for j in range(i - 1, min(i + 3, len(d))):  # Signal am Vortag -> gehandelt am letzten Tag
                if j >= 0:
                    out[j] = 1
    return out


def ruhig(p, d, r):
    """Volatilitäts-Filter: investiert, wenn die 20-Tage-Schwankung unter dem Jahresmittel liegt."""
    out = []
    for i in range(len(p)):
        if i < 272:
            out.append(0)
            continue
        kurz = math.sqrt(sum(x * x for x in r[i - 19:i + 1]) / 20)
        lang = math.sqrt(sum(x * x for x in r[i - 251:i + 1]) / 252)
        out.append(1 if kurz < lang else 0)
    return out


STILE = [
    ("Trendfolge", "Gleitende Durchschnitte 50/200", trend),
    ("Momentum", "Kurs über dem Vorjahr", momentum),
    ("Ausbruch (Turtle)", "55-Tage-Hoch kaufen, 20-Tage-Tief verkaufen", ausbruch),
    ("Mean Reversion", "RSI(2) unter 10 kaufen, über 70 verkaufen", rsi2),
    ("Buy the Dip", "nach −5 % in 5 Tagen kaufen, 10 Tage halten", dip),
    ("Swing", "nach 3 Minus-Tagen kaufen, am ersten Plus-Tag raus", swing),
    ("Saison: Sell in May", "November bis April investiert", sell_in_may),
    ("Monatswechsel", "letzter bis 3. Handelstag investiert", monatswechsel),
    ("Ruhige Phasen", "investiert, wenn die Schwankung unter dem Jahresmittel liegt", ruhig),
]


# ───────────── Auswertung ─────────────
def lauf(pos, r):
    """Tagesrenditen: Position von gestern Abend auf die Rendite von heute, Kosten bei jedem Wechsel."""
    out, vor = [], 0
    for i in range(1, len(r)):
        p = pos[i - 1]
        out.append(p * r[i] - (KOSTEN if p != vor else 0.0))
        vor = p
    return out


def sharpe(xs):
    n = len(xs)
    m = sum(xs) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (n - 1))
    return m / sd * math.sqrt(252) if sd else 0.0


def cagr(xs):
    w = 1.0
    for x in xs:
        w *= 1 + x
    return w ** (252 / len(xs)) - 1 if w > 0 else -1.0


def einbruch(xs):
    w, sp, dd = 1.0, 1.0, 0.0
    for x in xs:
        w *= 1 + x
        sp = max(sp, w)
        dd = min(dd, w / sp - 1)
    return dd


def zufall_pos(n, anteil, wechsel, rnd):
    """Zufällige Position mit gleichem Anteil im Markt und gleich vielen Wechseln (Markov-Kette)."""
    if wechsel == 0 or anteil in (0.0, 1.0):
        return [1 if anteil >= 0.5 else 0] * n
    rein = wechsel / 2 / max(n * (1 - anteil), 1)  # Cash -> investiert
    raus = wechsel / 2 / max(n * anteil, 1)  # investiert -> Cash
    s, out = 1 if rnd.random() < anteil else 0, []
    for _ in range(n):
        out.append(s)
        if rnd.random() < (raus if s else rein):
            s = 1 - s
    return out


def skill(pos, r, rnd):
    """Anteil Zufallsstrategien (gleiches Engagement, gleich viele Wechsel) mit schlechterer Sharpe."""
    ziel = sharpe(lauf(pos, r))
    anteil = sum(pos) / len(pos)
    wechsel = sum(1 for i in range(1, len(pos)) if pos[i] != pos[i - 1])
    besser = sum(sharpe(lauf(zufall_pos(len(pos), anteil, wechsel, rnd), r)) < ziel for _ in range(N_ZUFALL))
    return besser / N_ZUFALL


def trefferquote(pos, r):
    """Anteil gewinnbringender Trades (von Einstieg bis Ausstieg, nach Kosten)."""
    tr, w, drin = [], 1.0, False
    for i in range(1, len(r)):
        if pos[i - 1]:
            w *= 1 + r[i]
            drin = True
        elif drin:
            tr.append(w * (1 - 2 * KOSTEN) > 1)
            w, drin = 1.0, False
    return (sum(tr) / len(tr) if tr else None), len(tr)


def main() -> int:
    rnd = random.Random(11)
    ergebnisse, kontrolle = {}, []
    for sym, name in L.MAERKTE.items():
        reihe = L.kurse(sym, offline=(L.DATEN / (sym.replace("^", "_").replace("=", "_") + ".json")).exists())
        d = [x for x, _ in reihe]
        p = [c for _, c in reihe]
        r = [0.0] + [p[i] / p[i - 1] - 1 for i in range(1, len(p))]
        # Gegenprobe: kennt morgen -> ~100 %; Münzwurf -> um 50 %
        wissend = [1 if i + 1 < len(r) and r[i + 1] > 0 else 0 for i in range(len(r))]
        muenze = [rnd.randint(0, 1) for _ in r]
        muenze = [muenze[i // 5 * 5] for i in range(len(r))]  # Wochenblöcke, damit Wechsel realistisch
        sw, sm = skill(wissend, r, rnd), skill(muenze, r, rnd)
        kontrolle.append((name, sw, sm))
        if sw < 0.97:
            print(f"✖ GEGENPROBE {name}: Wissender nur {sw:.0%} — Messgerät kaputt, Abbruch.")
            return 2
        halten = lauf([1] * len(r), r)
        zeilen = []
        for stil, regel, f in STILE:
            pos = f(p, d, r)
            x = lauf(pos, r)
            tq, n_tr = trefferquote(pos, r)
            zeilen.append({"stil": stil, "regel": regel, "skill": skill(pos, r, rnd),
                           "rendite_jahr": cagr(x), "halten_jahr": cagr(halten), "einbruch": einbruch(x),
                           "halten_einbruch": einbruch(halten), "im_markt": sum(pos) / len(pos),
                           "trefferquote": tq, "trades": n_tr})
        ergebnisse[name] = {"von": d[0], "bis": d[-1], "stile": zeilen}
        print(f"{name:10} Gegenprobe Wissender {sw:.0%}, Münzwurf {sm:.0%} · "
              + " · ".join(f"{z['stil'].split()[0]} {z['skill']:.0%}" for z in zeilen))
    muenz = [m for _, _, m in kontrolle]
    if not 0.3 < sum(muenz) / len(muenz) < 0.7:
        print(f"✖ GEGENPROBE: Münzwurf im Schnitt {sum(muenz)/len(muenz):.0%} statt ~50 % — Abbruch.")
        return 2
    schreiben(ergebnisse, kontrolle)
    return 0


def schreiben(e, kontrolle):
    stile = [s for s, _, _ in STILE]
    schnitt = {s: sum(m["stile"][i]["skill"] for m in e.values()) / len(e) for i, s in enumerate(stile)}
    JSON.write_text(json.dumps({"stand": date.today().isoformat(), "kosten": KOSTEN, "zufall_n": N_ZUFALL,
                                "gegenprobe": [{"markt": n, "wissend": w, "muenze": m} for n, w, m in kontrolle],
                                "skill_schnitt": schnitt, "maerkte": e}, ensure_ascii=False, indent=1) + "\n",
                    encoding="utf-8")
    L_ = ["# Stil-Labor — neun Trading-Stile, acht Märkte, Skill in Prozent", "",
          f"Stand {date.today().isoformat()} · `python3 tools/trading/stil_labor.py` · kein echtes Geld.", "",
          "**Skill %** = Anteil von 200 Zufallsstrategien, die der Stil nach Kosten schlägt (Sharpe). Die Zufalls-",
          "strategien sind gleich lang im Markt und wechseln gleich oft. 50 % = kein Können, über 95 % = auffällig.", "",
          "| Stil | Regel | " + " | ".join(e) + " | Schnitt |", "|---|---|" + "---:|" * (len(e) + 1)]
    for i, (s, regel, _) in enumerate(STILE):
        L_.append(f"| {s} | {regel} | " + " | ".join(f"{m['stile'][i]['skill']:.0%}" for m in e.values())
                  + f" | **{schnitt[s]:.0%}** |")
    L_ += ["", "## Rendite pro Jahr (Stil / Halten)", "",
           "| Stil | " + " | ".join(e) + " |", "|---|" + "---:|" * len(e)]
    for i, (s, _, _) in enumerate(STILE):
        L_.append(f"| {s} | " + " | ".join(f"{m['stile'][i]['rendite_jahr']:+.1%} / {m['stile'][i]['halten_jahr']:+.1%}"
                                           for m in e.values()) + " |")
    L_ += ["", "Gegenprobe: " + ", ".join(f"{n} Wissender {w:.0%} / Münzwurf {m:.0%}" for n, w, m in kontrolle), "",
           "⚠️ Neun Stile auf acht Märkten sind 72 Versuche. Bei so vielen Versuchen landen rein zufällig",
           "ein paar über 95 %. Ein einzelner hoher Wert ist deshalb noch kein Beweis.", "",
           "Keine Anlageberatung.", ""]
    BERICHT.write_text("\n".join(L_), encoding="utf-8")
    print(f"→ {BERICHT.relative_to(ROOT)} + {JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
