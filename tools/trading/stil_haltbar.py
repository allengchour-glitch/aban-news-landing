#!/usr/bin/env python3
"""Hält der Skill? Das Stil-Labor misst jeden Stil auf der ganzen Kursreihe. Hier wird jede Reihe halbiert:
Skill auf der ersten Hälfte gegen Skill auf der zweiten, die der Stil (und wer ihn auswählt) nicht kennt.

Warum: neun Stile auf acht Märkten sind 72 Versuche. Ein paar landen rein zufällig über 95 %. Ob ein hoher
Wert Können war, zeigt sich erst, wenn er in Jahren wiederkommt, die bei der Auswahl nicht dabei waren.

Gemessen wird
  1. Rangkorrelation (Spearman) zwischen Hälfte 1 und Hälfte 2 über alle 72 Paare — mit Permutationstest
     (Hälfte 2 zufällig neu zugeordnet, 20'000-mal). Gerechnet auf dem ABSTAND ZUM ZUFALL (z: um wie viele
     Standardabweichungen die Sharpe über den 200 Zufallsstrategien liegt), nicht auf dem Skill in Prozent:
     der ist bei 100 % gedeckelt, alle starken Stile stehen dort gleichauf, und Ränge trennen sie nicht mehr.
  2. Von den Paaren mit ≥ 80 % in Hälfte 1: wie viele bleiben ≥ 80 % — und wie viele wären es ohne
     jeden Zusammenhang (Anteil aller Paare mit ≥ 80 % in Hälfte 2).
  3. Trader-Test: pro Markt den Stil mit dem besten Skill der ersten Hälfte nehmen (so würde man
     auswählen) und ihn in der zweiten Hälfte gegen Halten stellen.
  4. Wie viele der 72 Werte auf der ganzen Reihe ≥ 95 % liegen — und wie viele reiner Zufall wären.

Gegenprobe (sonst Abbruch), mit demselben Permutationstest wie das echte Ergebnis: 72 Münzwurf-Stile dürfen
keinen Zusammenhang zeigen (p > 0.05), 72 „teilweise wissende" Stile (kennen an 0–8 % der Tage den nächsten
Tag, sonst Münzwurf) müssen einen zeigen (p < 0.01).
⚠️ Erste Fassung rechnete die Rangkorrelation auf dem Skill in Prozent: die Wissenden lagen ab ~4 % in beiden
Hälften bei 100 %, die Gleichstände drückten ρ auf +0.49. Die Gegenprobe enger zu stellen (0–4 %) machte es
schlechter (+0.23) — nicht die Gegenprobe war falsch, sondern die gedeckelte Messgrösse. Deshalb z.

Gleiche Regeln wie im Stil-Labor: Signal am Schluss, gehandelt am Folgetag, 0.1 % Kosten pro Wechsel,
nur investiert oder Cash. Die Stile rechnen auf der ganzen Reihe (Indikatoren brauchen Vorlauf), bewertet
wird je Hälfte nur deren Zeitraum.

    python3 tools/trading/stil_haltbar.py     # nutzt die Kurs-Caches → reports/STIL-HALTBAR.md + data/stil-haltbar.json
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
import stil_labor as S  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BERICHT = ROOT / "reports" / "STIL-HALTBAR.md"
JSON = ROOT / "data" / "stil-haltbar.json"
KOSTEN = S.KOSTEN
N_ZUFALL = 200
N_PERM = 20000
HOCH = 0.80


# ───────────── schnelle Kennzahlen (reines Python, keine Listen je Zufallslauf) ─────────────
def sharpe_bereich(pos, r, lo, hi):
    """Sharpe der Tagesrenditen von Tag lo+1 bis hi-1: Position von gestern Abend, Kosten je Wechsel."""
    n = s = q = 0.0
    vor = pos[lo]
    for i in range(lo + 1, hi):
        p = pos[i - 1]
        x = p * r[i] - (KOSTEN if p != vor else 0.0)
        vor = p
        n += 1
        s += x
        q += x * x
    if n < 2:
        return 0.0
    m = s / n
    var = (q - n * m * m) / (n - 1)
    return m / math.sqrt(var) * math.sqrt(252) if var > 0 else 0.0


def skill_bereich(pos, r, lo, hi, rnd):
    """Skill im Bereich: (Anteil Zufallsstrategien mit gleichem Engagement und gleich vielen Wechseln, die
    schlechter sind; z = Abstand der Sharpe zum Mittel der Zufallsstrategien in deren Standardabweichungen)."""
    teil = pos[lo:hi]
    ziel = sharpe_bereich(pos, r, lo, hi)
    anteil = sum(teil) / len(teil)
    wechsel = sum(1 for i in range(1, len(teil)) if teil[i] != teil[i - 1])
    rr = r[lo:hi]
    zs = [sharpe_bereich(S.zufall_pos(len(teil), anteil, wechsel, rnd), rr, 0, len(rr)) for _ in range(N_ZUFALL)]
    m = sum(zs) / len(zs)
    sd = math.sqrt(sum((x - m) ** 2 for x in zs) / (len(zs) - 1))
    return sum(x < ziel for x in zs) / N_ZUFALL, ((ziel - m) / sd if sd else 0.0)


def rendite_bereich(pos, r, lo, hi):
    w, vor = 1.0, pos[lo]
    for i in range(lo + 1, hi):
        p = pos[i - 1]
        w *= 1 + p * r[i] - (KOSTEN if p != vor else 0.0)
        vor = p
    tage = hi - lo - 1
    return w ** (252 / tage) - 1 if w > 0 and tage > 0 else -1.0


def raenge(xs):
    o = sorted(range(len(xs)), key=lambda i: xs[i])
    rg = [0.0] * len(xs)
    i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and xs[o[j + 1]] == xs[o[i]]:
            j += 1
        for k in range(i, j + 1):
            rg[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return rg


def spearman(a, b):
    ra, rb = raenge(a), raenge(b)
    n = len(a)
    ma, mb = sum(ra) / n, sum(rb) / n
    sab = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    sa = math.sqrt(sum((x - ma) ** 2 for x in ra))
    sb = math.sqrt(sum((y - mb) ** 2 for y in rb))
    return sab / (sa * sb) if sa and sb else 0.0


def perm_p(a, b, rnd):
    """Einseitig: Anteil zufälliger Zuordnungen mit mindestens so hoher Rangkorrelation."""
    ziel = spearman(a, b)
    bb = list(b)
    mehr = 0
    for _ in range(N_PERM):
        rnd.shuffle(bb)
        mehr += spearman(a, bb) >= ziel
    return (mehr + 1) / (N_PERM + 1)


# ───────────── Messung ─────────────
def maerkte():
    for sym, name in L.MAERKTE.items():
        datei = L.DATEN / (sym.replace("^", "_").replace("=", "_") + ".json")
        reihe = L.kurse(sym, offline=datei.exists())
        d = [x for x, _ in reihe]
        p = [c for _, c in reihe]
        r = [0.0] + [p[i] / p[i - 1] - 1 for i in range(1, len(p))]
        yield name, d, p, r


def haelften(pos, r, rnd):
    m = len(r) // 2
    return skill_bereich(pos, r, 0, m, rnd), skill_bereich(pos, r, m, len(r), rnd)


def gegenprobe(daten, rnd):
    """72 Münzwürfe (kein Zusammenhang erwartet) und 72 teilweise Wissende (starker Zusammenhang erwartet)."""
    mz, ws, eich = ([], []), ([], []), []
    for _name, _d, _p, r in daten:
        for k in range(len(S.STILE)):
            m = [rnd.randint(0, 1) for _ in r]
            m = [m[i // 5 * 5] for i in range(len(r))]  # Wochenblöcke wie im Stil-Labor
            a, b = haelften(m, r, rnd)
            mz[0].append(a[1])
            mz[1].append(b[1])
            eich += [a[0], b[0]]
            leck = k / 100  # 0 … 8 % der Tage kennt er morgen, sonst Münzwurf
            w = [(1 if i + 1 < len(r) and r[i + 1] > 0 else 0) if rnd.random() < leck else m[i] for i in range(len(r))]
            a, b = haelften(w, r, rnd)
            ws[0].append(a[1])
            ws[1].append(b[1])
    return (spearman(*mz), perm_p(*mz, rnd)), (spearman(*ws), perm_p(*ws, rnd)), sum(eich) / len(eich)


def main() -> int:
    rnd = random.Random(23)
    daten = list(maerkte())

    (rho_muenze, p_muenze), (rho_wissend, p_wissend), eichung = gegenprobe(daten, rnd)
    print(f"Gegenprobe: Münzwürfe ρ = {rho_muenze:+.2f} p = {p_muenze:.3f} (soll > 0.05), mittlerer Skill "
          f"{eichung:.0%} (soll ~50 %) · teilweise Wissende ρ = {rho_wissend:+.2f} p = {p_wissend:.4f} (soll < 0.01)")
    if p_muenze <= 0.05 or p_wissend >= 0.01 or not 0.40 < eichung < 0.60:
        print("✖ GEGENPROBE: Messung trennt Zufall und Können nicht — Abbruch, nichts geschrieben.")
        return 2

    paare, trader = [], []
    for name, d, p, r in daten:
        m = len(r) // 2
        halten = [1] * len(r)
        zeilen = []
        for stil, regel, f in S.STILE:
            pos = f(p, d, r)
            (h1, z1), (h2, z2) = haelften(pos, r, rnd)
            zeilen.append({"stil": stil, "regel": regel, "h1": h1, "h2": h2, "z1": z1, "z2": z2,
                           "rendite_h2": rendite_bereich(pos, r, m, len(r)),
                           "sharpe_h2": sharpe_bereich(pos, r, m, len(r))})
        beste = max(zeilen, key=lambda z: z["h1"])
        trader.append({"markt": name, "teilung": d[m], "von": d[0], "bis": d[-1], "stil": beste["stil"],
                       "h1": beste["h1"], "h2": beste["h2"], "rendite_h2": beste["rendite_h2"],
                       "halten_h2": rendite_bereich(halten, r, m, len(r)),
                       "sharpe_h2": beste["sharpe_h2"], "halten_sharpe_h2": sharpe_bereich(halten, r, m, len(r))})
        for z in zeilen:
            paare.append({"markt": name, **z})
        print(f"{name:10} Teilung {d[m]} · " + " · ".join(f"{z['stil'].split()[0]} {z['h1']:.0%}→{z['h2']:.0%}" for z in zeilen))

    h2 = [x["h2"] for x in paare]
    rho = spearman([x["z1"] for x in paare], [x["z2"] for x in paare])
    p_rho = perm_p([x["z1"] for x in paare], [x["z2"] for x in paare], rnd)
    hoch1 = [x for x in paare if x["h1"] >= HOCH]
    bleibt = sum(x["h2"] >= HOCH for x in hoch1)
    basis = sum(v >= HOCH for v in h2) / len(h2)
    auswahl_h2 = sum(t["h2"] for t in trader) / len(trader)
    besser_halten = sum(t["sharpe_h2"] > t["halten_sharpe_h2"] and t["rendite_h2"] >= t["halten_h2"] for t in trader)

    labor = json.loads((ROOT / "data" / "stil-labor.json").read_text(encoding="utf-8"))
    ganz = [z["skill"] for mk in labor["maerkte"].values() for z in mk["stile"]]
    ueber95 = sum(v >= 0.95 for v in ganz)
    erwartet95 = 0.05 * len(ganz)
    # Binomial: Wahrscheinlichkeit für mindestens so viele Treffer ≥ 95 %, wenn alles Zufall wäre
    p95 = sum(math.comb(len(ganz), k) * 0.05 ** k * 0.95 ** (len(ganz) - k) for k in range(ueber95, len(ganz) + 1))

    ergebnis = {"stand": date.today().isoformat(), "kosten": KOSTEN, "zufall_n": N_ZUFALL, "perm_n": N_PERM,
                "gegenprobe": {"muenze_rho": rho_muenze, "muenze_p": p_muenze, "muenze_skill": eichung,
                               "wissend_rho": rho_wissend, "wissend_p": p_wissend},
                "rho": rho, "rho_p": p_rho, "hoch": HOCH, "hoch_h1": len(hoch1), "hoch_bleibt": bleibt,
                "hoch_basis": basis, "auswahl_h2_schnitt": auswahl_h2, "auswahl_besser_als_halten": besser_halten,
                "ganz_ueber95": ueber95, "ganz_erwartet95": erwartet95, "ganz_p95": p95, "ganz_n": len(ganz),
                "trader": trader, "paare": paare}
    JSON.write_text(json.dumps(ergebnis, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    bericht(ergebnis)
    print(f"ρ = {rho:+.2f} (p = {p_rho:.3f}) · ≥{HOCH:.0%} in H1: {len(hoch1)}, davon bleiben {bleibt} "
          f"(ohne Zusammenhang erwartet {len(hoch1) * basis:.1f}) · Auswahl H2 Schnitt {auswahl_h2:.0%} · "
          f"besser als Halten {besser_halten}/{len(trader)}")
    print(f"→ {BERICHT.relative_to(ROOT)} + {JSON.relative_to(ROOT)}")
    return 0


def bericht(e):
    stile = [s for s, _, _ in S.STILE]
    L_ = ["# Hält der Skill? — erste Hälfte gegen zweite Hälfte", "",
          f"Stand {e['stand']} · `python3 tools/trading/stil_haltbar.py` · kein echtes Geld.", "",
          "Jede Kursreihe wird halbiert. Skill wie im Stil-Labor (Anteil von 200 Zufallsstrategien mit gleicher",
          "Marktzeit und gleich vielen Wechseln, die der Stil nach Kosten schlägt), aber je Hälfte getrennt.", "",
          "## Skill erste → zweite Hälfte", "",
          "| Stil | " + " | ".join(t["markt"] for t in e["trader"]) + " | Schnitt |", "|---|" + "---:|" * (len(e["trader"]) + 1)]
    for s in stile:
        zs = [x for x in e["paare"] if x["stil"] == s]
        L_.append(f"| {s} | " + " | ".join(f"{x['h1']:.0%} → {x['h2']:.0%}" for x in zs)
                  + f" | **{sum(x['h1'] for x in zs) / len(zs):.0%} → {sum(x['h2'] for x in zs) / len(zs):.0%}** |")
    L_ += ["", "Teilung: " + ", ".join(f"{t['markt']} {t['teilung']}" for t in e["trader"]), "",
           "## Hängen die beiden Hälften zusammen?", "",
           f"- Rangkorrelation über {len(e['paare'])} Paare (Abstand zum Zufall z, nicht der gedeckelte Prozentwert): "
           f"**ρ = {e['rho']:+.2f}** · Permutationstest p = {e['rho_p']:.3f}",
           f"  ({e['perm_n']:,} zufällige Zuordnungen; p < 0.05 hiesse: der Zusammenhang ist kaum Zufall).".replace(",", "'"),
           f"- Paare mit ≥ {e['hoch']:.0%} Skill in der ersten Hälfte: **{e['hoch_h1']}**, davon auch in der zweiten ≥ {e['hoch']:.0%}: "
           f"**{e['hoch_bleibt']}**. Ohne jeden Zusammenhang wären es {e['hoch_h1'] * e['hoch_basis']:.1f}.",
           f"- Auf der ganzen Reihe (Stil-Labor) liegen {e['ganz_ueber95']} von {e['ganz_n']} Werten ≥ 95 %. Reiner Zufall "
           f"ergäbe {e['ganz_erwartet95']:.1f} (Binomial p = {e['ganz_p95']:.1g}). ⚠️ Das rechnet mit 72 unabhängigen Versuchen — "
           "sie sind es nicht: derselbe Stil auf S&P 500 und SMI, Gold und Silber läuft ähnlich. Die Hälften-Prüfung "
           "oben ist darum die strengere.", "",
           "## Trader-Test: den besten Stil der ersten Hälfte weiter handeln", "",
           "| Markt | gewählt (Skill Hälfte 1) | Skill Hälfte 2 | Rendite/Jahr Hälfte 2 | Halten Hälfte 2 | Sharpe Stil / Halten |",
           "|---|---|---:|---:|---:|---:|"]
    for t in e["trader"]:
        L_.append(f"| {t['markt']} | {t['stil']} ({t['h1']:.0%}) | {t['h2']:.0%} | {t['rendite_h2']:+.1%} | "
                  f"{t['halten_h2']:+.1%} | {t['sharpe_h2']:.2f} / {t['halten_sharpe_h2']:.2f} |")
    L_ += ["", f"Im Schnitt hatte die Auswahl in der zweiten Hälfte **{e['auswahl_h2_schnitt']:.0%}** Skill. Mehr verdient "
           f"und besser pro Risiko als Halten: **{e['auswahl_besser_als_halten']} von {len(e['trader'])}** Märkten.", "",
           f"Gegenprobe mit demselben Test: {len(e['paare'])} Münzwurf-Stile ρ = {e['gegenprobe']['muenze_rho']:+.2f} "
           f"(p = {e['gegenprobe']['muenze_p']:.2f}, kein Zusammenhang; mittlerer Skill {e['gegenprobe']['muenze_skill']:.0%}, "
           f"Eichung ~50 %), {len(e['paare'])} Stile, die an 0–8 % der Tage den nächsten Tag kennen, "
           f"ρ = {e['gegenprobe']['wissend_rho']:+.2f} (p " + ("< 0.001" if e['gegenprobe']['wissend_p'] < 0.001
           else f"= {e['gegenprobe']['wissend_p']:.3f}") + ", Zusammenhang erkannt).", "",
           "Keine Anlageberatung.", ""]
    BERICHT.write_text("\n".join(L_), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
