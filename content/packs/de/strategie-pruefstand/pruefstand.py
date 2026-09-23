#!/usr/bin/env python3
"""Strategie-Prüfstand — teste eine Trading-Regel so, dass du dir nichts vormachst.

    python3 pruefstand.py --demo                     # Zufallskurs: zeigt, wie leicht man sich täuscht
    python3 pruefstand.py --symbol ^GSPC             # Kurse von Yahoo Finance (braucht Internet)
    python3 pruefstand.py --csv meine_kurse.csv      # eigene Daten: Spalten Datum + Schlusskurs
    python3 pruefstand.py --symbol GC=F --regel meine_regel.py --kosten 0.2 --bericht gold.html

Was gemessen wird (für neun eingebaute Stile und deine eigene Regel):
  - Rendite pro Jahr, schlimmster Einbruch, Zeit im Markt, Trefferquote — neben „einfach halten"
  - Skill %: Anteil von Zufallsstrategien, die gleich lange investiert sind und gleich oft wechseln,
    die deine Regel nach Kosten schlägt. 50 % = kein Können.
  - Auswahl-Falle: der beste Stil der ersten Hälfte — wie schlägt er sich in der zweiten?
  - Gegenprobe: eine Regel, die morgen kennt, muss ~100 % Skill haben. Sonst ist das Messgerät kaputt.

Regeln der Buchführung: Signal am Schlusskurs, gehandelt erst am nächsten Tag. Kosten bei jedem
Wechsel. Nur investiert (1) oder Cash (0). Keine Anlageberatung.

Nur Python 3.9+ nötig, keine Zusatzpakete.
"""
from __future__ import annotations

import argparse
import csv
import html
import importlib.util
import json
import math
import random
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

VERSION = "1.0"


# ───────────────────────── Daten ─────────────────────────
def lade_csv(pfad):
    """Liest Datum + Schlusskurs. Erkennt , oder ; und Spaltennamen wie Date/Close/Datum/Schluss."""
    roh = Path(pfad).read_text(encoding="utf-8-sig")
    trenn = ";" if roh.count(";") > roh.count(",") else ","
    zeilen = list(csv.reader(roh.splitlines(), delimiter=trenn))
    kopf = [k.strip().lower() for k in zeilen[0]]
    def spalte(namen, ersatz):
        for i, k in enumerate(kopf):
            if any(n in k for n in namen):
                return i
        return ersatz
    i_d = spalte(("date", "datum", "zeit", "time"), 0)
    i_c = spalte(("adj close", "close", "schluss", "kurs", "price", "preis"), len(kopf) - 1)
    out = []
    for z in zeilen[1:]:
        try:
            wert = float(z[i_c].replace("'", "").replace(" ", "").replace(",", ".") if trenn == ";" else z[i_c])
        except (ValueError, IndexError):
            continue
        if wert > 0:
            out.append((z[i_d].strip(), wert))
    if len(out) < 300:
        sys.exit(f"Nur {len(out)} brauchbare Zeilen in {pfad} — für einen ehrlichen Test braucht es mindestens 300 Tage.")
    return out


def lade_yahoo(symbol):
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(symbol)}"
           f"?period1=946684800&period2={int(datetime.now().timestamp())}&interval=1d")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.load(r)["chart"]["result"][0]
    except Exception as ex:  # noqa: BLE001
        sys.exit(f"Kurse für {symbol} nicht abrufbar ({ex}). Tipp: CSV exportieren und --csv nutzen.")
    return [(datetime.fromtimestamp(t, timezone.utc).date().isoformat(), c)
            for t, c in zip(d["timestamp"], d["indicators"]["quote"][0]["close"]) if c and c > 0]


def demo_kurse(n=5000, seed=None):
    """Reiner Zufallsweg: hier KANN keine Regel echtes Können haben. Was trotzdem gut aussieht, ist Glück."""
    rnd = random.Random(seed)
    p, out = 100.0, []
    for i in range(n):
        p *= math.exp(rnd.gauss(0.0002, 0.011))
        out.append((f"Tag {i + 1}", p))
    return out


# ───────────────────────── eingebaute Stile ─────────────────────────
def _sma(p, n):
    out, s = [None] * len(p), 0.0
    for i, x in enumerate(p):
        s += x
        if i >= n:
            s -= p[i - n]
        if i >= n - 1:
            out[i] = s / n
    return out


def trendfolge(p):
    a, b = _sma(p, 50), _sma(p, 200)
    return [1 if b[i] is not None and a[i] > b[i] else 0 for i in range(len(p))]


def momentum(p):
    return [1 if i >= 252 and p[i] > p[i - 252] else 0 for i in range(len(p))]


def ausbruch(p):
    pos, out = 0, []
    for i in range(len(p)):
        if i >= 55 and p[i] > max(p[i - 55:i]):
            pos = 1
        elif i >= 20 and p[i] < min(p[i - 20:i]):
            pos = 0
        out.append(pos)
    return out


def mean_reversion(p):
    lang, pos, out, g, v = _sma(p, 200), 0, [], 0.0, 0.0
    for i in range(len(p)):
        if i:
            ch = p[i] - p[i - 1]
            g, v = (g + max(ch, 0)) / 2, (v + max(-ch, 0)) / 2
        rsi = 100 if v == 0 else 100 - 100 / (1 + g / v)
        if lang[i] is not None and p[i] > lang[i] and rsi < 10:
            pos = 1
        elif rsi > 70 or (lang[i] is not None and p[i] < lang[i]):
            pos = 0
        out.append(pos)
    return out


def buy_the_dip(p):
    out, rest = [], 0
    for i in range(len(p)):
        if i >= 5 and p[i] / p[i - 5] - 1 <= -0.05:
            rest = 10
        out.append(1 if rest > 0 else 0)
        rest = max(rest - 1, 0)
    return out


def swing(p):
    pos, out = 0, []
    for i in range(len(p)):
        if i >= 3 and p[i] < p[i - 1] < p[i - 2] < p[i - 3]:
            pos = 1
        elif i and p[i] > p[i - 1]:
            pos = 0
        out.append(pos)
    return out


def ruhige_phasen(p):
    r = [0.0] + [p[i] / p[i - 1] - 1 for i in range(1, len(p))]
    out = []
    for i in range(len(p)):
        if i < 272:
            out.append(0)
            continue
        kurz = math.sqrt(sum(x * x for x in r[i - 19:i + 1]) / 20)
        lang = math.sqrt(sum(x * x for x in r[i - 251:i + 1]) / 252)
        out.append(1 if kurz < lang else 0)
    return out


def rsi14(p):
    """Klassiker: RSI(14) unter 30 kaufen, über 70 verkaufen."""
    pos, out, g, v = 0, [], 0.0, 0.0
    for i in range(len(p)):
        if i:
            ch = p[i] - p[i - 1]
            g, v = (g * 13 + max(ch, 0)) / 14, (v * 13 + max(-ch, 0)) / 14
        rsi = 50 if i < 14 else (100 if v == 0 else 100 - 100 / (1 + g / v))
        if rsi < 30:
            pos = 1
        elif rsi > 70:
            pos = 0
        out.append(pos)
    return out


def bollinger(p):
    """Unter das untere Bollinger-Band (20 Tage, 2 Sigma) kaufen, über dem Mittel verkaufen."""
    m, pos, out = _sma(p, 20), 0, []
    for i in range(len(p)):
        if m[i] is None:
            out.append(0)
            continue
        sd = math.sqrt(sum((x - m[i]) ** 2 for x in p[i - 19:i + 1]) / 20)
        if p[i] < m[i] - 2 * sd:
            pos = 1
        elif p[i] > m[i]:
            pos = 0
        out.append(pos)
    return out


STILE = [("Trendfolge 50/200", trendfolge), ("Momentum 12 Monate", momentum),
         ("Ausbruch (Turtle 55/20)", ausbruch), ("Mean Reversion RSI(2)", mean_reversion),
         ("RSI(14) 30/70", rsi14), ("Bollinger-Rückkehr", bollinger), ("Buy the Dip", buy_the_dip),
         ("Swing (3 Minus-Tage)", swing), ("Ruhige Phasen", ruhige_phasen)]


def eigene_regel(pfad):
    """Lädt `regel(kurse, i)` aus einer Datei. Die Regel sieht NUR Kurse bis einschliesslich Tag i."""
    spec = importlib.util.spec_from_file_location("meine_regel", pfad)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    if not hasattr(mod, "regel"):
        sys.exit(f"{pfad} braucht eine Funktion regel(kurse, i), die 1 (investiert) oder 0 (Cash) liefert.")
    name = getattr(mod, "NAME", Path(pfad).stem)

    def f(p):
        out = []
        for i in range(len(p)):
            try:
                x = mod.regel(p[:i + 1], i)  # Kopie bis heute: die Regel kann nicht in die Zukunft sehen
            except IndexError:
                sys.exit(f"✖ Zukunfts-Schutz: {name} greift an Tag {i} auf einen Kurs zu, den es an diesem Tag "
                         "noch nicht gab (z. B. kurse[i+1]). Genau dieser Fehler macht viele Backtests zu schön. "
                         "Nutze nur kurse[-1] (heute) und ältere Werte.")
            out.append(1 if x else 0)
        return out
    return name, f


# ───────────────────────── Messung ─────────────────────────
def lauf(pos, r, kosten):
    out, vor = [], 0
    for i in range(1, len(r)):
        x = pos[i - 1]  # gestern Abend entschieden, heute gehandelt
        out.append(x * r[i] - (kosten if x != vor else 0.0))
        vor = x
    return out


def sharpe(xs):
    n = len(xs)
    m = sum(xs) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (n - 1)) if n > 1 else 0
    return m / sd * math.sqrt(252) if sd else 0.0


def pro_jahr(xs):
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
    if wechsel == 0 or anteil in (0.0, 1.0):
        return [1 if anteil >= 0.5 else 0] * n
    rein = wechsel / 2 / max(n * (1 - anteil), 1)
    raus = wechsel / 2 / max(n * anteil, 1)
    s, out = 1 if rnd.random() < anteil else 0, []
    for _ in range(n):
        out.append(s)
        if rnd.random() < (raus if s else rein):
            s = 1 - s
    return out


def skill(pos, r, kosten, n_zufall, rnd):
    ziel = sharpe(lauf(pos, r, kosten))
    anteil = sum(pos) / len(pos)
    wechsel = sum(1 for i in range(1, len(pos)) if pos[i] != pos[i - 1])
    if wechsel == 0:
        return None
    besser = sum(sharpe(lauf(zufall_pos(len(pos), anteil, wechsel, rnd), r, kosten)) < ziel for _ in range(n_zufall))
    return besser / n_zufall


def trades(pos, r, kosten):
    tr, w, drin = [], 1.0, False
    for i in range(1, len(r)):
        if pos[i - 1]:
            w *= 1 + r[i]
            drin = True
        elif drin:
            tr.append(w * (1 - 2 * kosten) > 1)
            w, drin = 1.0, False
    return (sum(tr) / len(tr) if tr else None), len(tr)


def messen(name, pos, r, kosten, n_zufall, rnd):
    x = lauf(pos, r, kosten)
    tq, n = trades(pos, r, kosten)
    return {"stil": name, "pro_jahr": pro_jahr(x), "einbruch": einbruch(x), "im_markt": sum(pos) / len(pos),
            "trefferquote": tq, "trades": n, "sharpe": sharpe(x), "skill": skill(pos, r, kosten, n_zufall, rnd)}


def urteil(z, halten):
    if z["skill"] is None:
        return "kein Handel"
    if z["skill"] >= 0.95 and z["pro_jahr"] >= halten["pro_jahr"]:
        return "auffällig gut — auf anderen Märkten gegenprüfen"
    if z["skill"] >= 0.95:
        return "gutes Timing, aber weniger Rendite als Halten"
    if z["skill"] <= 0.05:
        return "schlechter als Zufall"
    return "mit Zufall erklärbar"


# ───────────────────────── Ablauf ─────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser(description="Strategie-Prüfstand " + VERSION)
    q = ap.add_mutually_exclusive_group(required=True)
    q.add_argument("--demo", action="store_true", help="Zufallskurs (zeigt die Täuschung)")
    q.add_argument("--symbol", help="Yahoo-Finance-Symbol, z. B. ^GSPC, ^SSMI, NESN.SW, GC=F, BTC-USD")
    q.add_argument("--csv", help="eigene Kursdatei (Datum + Schlusskurs)")
    ap.add_argument("--regel", help="Datei mit deiner Regel (Vorlage: meine_regel.py)")
    ap.add_argument("--kosten", type=float, default=0.1, help="Kosten pro Wechsel in Prozent (Standard 0.1)")
    ap.add_argument("--zufall", type=int, default=200, help="Anzahl Zufallsstrategien (Standard 200)")
    ap.add_argument("--bericht", default="bericht.html", help="HTML-Bericht (Standard bericht.html)")
    ap.add_argument("--seed", type=int, default=None, help="fester Zufall für wiederholbare Demo")
    a = ap.parse_args()

    if a.demo:
        reihe, quelle = demo_kurse(seed=a.seed), "Demo: reiner Zufallskurs (hier gibt es nichts zu finden)"
    elif a.symbol:
        reihe, quelle = lade_yahoo(a.symbol), f"Yahoo Finance: {a.symbol}"
    else:
        reihe, quelle = lade_csv(a.csv), f"Datei: {a.csv}"
    kosten = a.kosten / 100
    daten, p = [d for d, _ in reihe], [c for _, c in reihe]
    r = [0.0] + [p[i] / p[i - 1] - 1 for i in range(1, len(p))]
    rnd = random.Random(1 if a.seed is None else a.seed)
    stile = list(STILE)
    if a.regel:
        stile.append(eigene_regel(a.regel))
    print(f"Strategie-Prüfstand {VERSION} · {quelle} · {daten[0]} bis {daten[-1]} · {len(p)} Tage · "
          f"Kosten {a.kosten:.2f} % pro Wechsel")

    # Gegenprobe zuerst: ohne funktionierendes Messgerät kein Ergebnis
    wissend = [1 if i + 1 < len(r) and r[i + 1] > 0 else 0 for i in range(len(r))]
    gp = skill(wissend, r, kosten, a.zufall, rnd)
    if gp is None or gp < 0.97:
        print(f"✖ Gegenprobe: eine Regel, die morgen kennt, kommt nur auf {gp} — Daten prüfen (Lücken, Duplikate?).")
        return 2
    print(f"✓ Gegenprobe: eine Regel, die morgen kennt, schlägt {gp:.0%} der Zufallsstrategien.\n")

    halten = messen("Einfach halten", [1] * len(p), r, kosten, 0, rnd)
    halten["skill"] = None
    zeilen = []
    for name, f in stile:
        z = messen(name, f(p), r, kosten, a.zufall, rnd)
        z["urteil"] = urteil(z, halten)
        z["eigene"] = name == (stile[-1][0] if a.regel else None)
        zeilen.append(z)

    # Auswahl-Falle: bester Stil der ersten Hälfte, gemessen auf der zweiten
    mitte = len(p) // 2
    r1, r2 = r[:mitte], r[mitte - 1:]
    erste = {name: sharpe(lauf(f(p)[:mitte], r1, kosten)) for name, f in STILE}
    sieger = max(erste, key=erste.get)
    f_sieger = dict(STILE)[sieger]
    pos2 = f_sieger(p)[mitte - 1:]
    x2 = lauf(pos2, r2, kosten)
    halten2 = lauf([1] * len(r2), r2, kosten)
    falle = {"sieger": sieger, "sharpe_vorher": erste[sieger], "sharpe_nachher": sharpe(x2),
             "pro_jahr_nachher": pro_jahr(x2), "halten_nachher": pro_jahr(halten2),
             "skill_nachher": skill(pos2, r2, kosten, a.zufall, rnd), "ab": daten[mitte]}

    ausgabe(zeilen, halten, falle, gp)
    bericht(a.bericht, quelle, daten, a.kosten, zeilen, halten, falle, gp, a.zufall, a.demo)
    print(f"\n→ Bericht: {a.bericht}  (im Browser öffnen)")
    return 0


def pz(x, vz=False):
    return "—" if x is None else (f"{x:+.1%}" if vz else f"{x:.0%}")


def ausgabe(zeilen, halten, falle, gp):
    print(f"{'Stil':34} {'pro Jahr':>9} {'Einbruch':>9} {'im Markt':>9} {'Trades':>7} {'Skill':>6}  Urteil")
    print(f"{'Einfach halten':34} {pz(halten['pro_jahr'], 1):>9} {pz(halten['einbruch'], 1):>9} {'100%':>9} "
          f"{'':>7} {'':>6}  (Massstab)")
    for z in zeilen:
        stern = " ◀ deine Regel" if z["eigene"] else ""
        print(f"{z['stil'][:34]:34} {pz(z['pro_jahr'], 1):>9} {pz(z['einbruch'], 1):>9} {pz(z['im_markt']):>9} "
              f"{z['trades']:>7} {pz(z['skill']):>6}  {z['urteil']}{stern}")
    print(f"\nAuswahl-Falle: In der ersten Hälfte war „{falle['sieger']}\" der beste Stil (Sharpe "
          f"{falle['sharpe_vorher']:.2f}). Ab {falle['ab']} kam er auf Sharpe {falle['sharpe_nachher']:.2f}, "
          f"{pz(falle['pro_jahr_nachher'], 1)} pro Jahr (Halten {pz(falle['halten_nachher'], 1)}), "
          f"Skill {pz(falle['skill_nachher'])}.")
    viele = sum(1 for z in zeilen if z["skill"] is not None and z["skill"] >= 0.95)
    print(f"Mehrfach-Test: {len(zeilen)} Stile geprüft — rein zufällig landen im Schnitt "
          f"{len(zeilen) * 0.05:.1f} über 95 %. Hier: {viele}.")


def bericht(pfad, quelle, daten, kosten_pz, zeilen, halten, falle, gp, n_zufall, demo):
    e = html.escape
    def zeile(z, fett=False):
        balken = "" if z["skill"] is None else (
            f'<div class="b"><i style="width:{z["skill"]*100:.0f}%"></i><s></s></div>')
        k = ' class="eigen"' if z.get("eigene") else ""
        return (f'<tr{k}><td>{"<b>" if fett else ""}{e(z["stil"])}{"</b>" if fett else ""}</td>'
                f'<td>{pz(z["pro_jahr"], 1)}</td><td>{pz(z["einbruch"], 1)}</td><td>{pz(z["im_markt"])}</td>'
                f'<td>{z["trades"] or ""}</td><td>{pz(z["skill"])}{balken}</td><td>{e(z.get("urteil", "Massstab"))}</td></tr>')
    halten = dict(halten, stil="Einfach halten", im_markt=1.0, trades=0, urteil="Massstab")
    demo_hinweis = ('<p class="warn"><b>Demo mit Zufallskurs:</b> In diesen Daten steckt kein Muster. Jeder Stil, '
                    'der hier gut aussieht, hatte Glück. Genau das passiert mit echten Kursen auch — nur merkt man '
                    'es dort nicht.</p>') if demo else ""
    viele = sum(1 for z in zeilen if z["skill"] is not None and z["skill"] >= 0.95)
    doc = f"""<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Prüfstand-Bericht</title>
<style>
body{{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:980px;margin:24px auto;padding:0 16px;color:#1f2937;line-height:1.55}}
table{{border-collapse:collapse;width:100%;font-size:14px}}th,td{{padding:7px 8px;border-bottom:1px solid #eee;text-align:right}}
th:first-child,td:first-child,td:last-child,th:last-child{{text-align:left}}th{{font-size:12px;color:#6b7280;text-transform:uppercase}}
.b{{position:relative;height:6px;background:#fdf1dc;border-radius:9px;margin-top:3px;min-width:70px}}.b i{{display:block;height:100%;background:#d97706;border-radius:9px}}
.b s{{position:absolute;left:50%;top:-2px;bottom:-2px;width:2px;background:#374151}}
tr.eigen td{{background:#fffbeb}}.warn{{border-left:4px solid #b91c1c;padding:8px 12px;background:#fef2f2}}
.klein{{font-size:13px;color:#6b7280}}.tab{{overflow-x:auto}}
</style></head><body>
<h1>Prüfstand-Bericht</h1>
<p>{e(quelle)} · {e(daten[0])} bis {e(daten[-1])} · {len(daten)} Tage · Kosten {kosten_pz:.2f} % pro Wechsel ·
Signal am Schluss, gehandelt am Folgetag.</p>
{demo_hinweis}
<p><b>Skill %</b> = Anteil von {n_zufall} Zufallsstrategien mit gleicher Zeit im Markt und gleich vielen Wechseln,
die der Stil nach Kosten schlägt (Sharpe). Der Strich markiert 50 % — dort beginnt nichts, was man Können nennen könnte.</p>
<div class="tab"><table><thead><tr><th>Stil</th><th>pro Jahr</th><th>Einbruch</th><th>im Markt</th><th>Trades</th><th>Skill</th><th>Urteil</th></tr></thead><tbody>
{zeile(halten, True)}
{"".join(zeile(z) for z in zeilen)}
</tbody></table></div>
<h2>Auswahl-Falle</h2>
<p>Wer auf alten Kursen den besten Stil aussucht, sucht den glücklichsten aus. In der ersten Hälfte gewann
<b>{e(falle["sieger"])}</b> (Sharpe {falle["sharpe_vorher"]:.2f}). Danach, ab {e(falle["ab"])}: Sharpe
{falle["sharpe_nachher"]:.2f}, {pz(falle["pro_jahr_nachher"], 1)} pro Jahr gegenüber {pz(falle["halten_nachher"], 1)}
beim Halten, Skill {pz(falle["skill_nachher"])}.</p>
<h2>Mehrfach-Test</h2>
<p>{len(zeilen)} Stile geprüft. Rein zufällig landen im Schnitt {len(zeilen) * 0.05:.1f} über 95 %. Hier: {viele}.
Ein einzelner hoher Wert ist erst dann interessant, wenn er auf anderen Märkten und in anderen Jahren wiederkommt.</p>
<p class="klein">Gegenprobe: eine Regel, die den nächsten Tag kennt, schlägt {gp:.0%} der Zufallsstrategien.
Strategie-Prüfstand {VERSION} · aban news · Keine Anlageberatung. Vergangene Kurse sagen die Zukunft nicht voraus.</p>
</body></html>"""
    Path(pfad).write_text(doc, encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
