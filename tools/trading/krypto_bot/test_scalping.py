#!/usr/bin/env python3
"""Tests für den Scalping-Prüfstand (scalping_kern.py + Entscheidungsregeln in scalping_pruefung.py), ohne Netz.
    python3 tools/trading/krypto_bot/test_scalping.py"""
import math
import random
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import scalping_kern as K  # noqa: E402
import scalping_pruefung as SP  # noqa: E402

n_ok = n_f = 0


def pruefe(name, c, info=""):
    global n_ok, n_f
    c = bool(c)
    print(("✅ " if c else "❌ ") + name + ("" if c else f"   → {info}"))
    n_ok += c
    n_f += not c


T0 = 1_700_000_000_000 - 1_700_000_000_000 % 3_600_000  # volle Stunde (UTC)
NULL = {"M": 0.0, "T": 0.0, "slip": 0.0}
ECHT = {"M": 0.0002, "T": 0.0005, "slip": 0.0001}


def kerzen(ohlc, p=K.MINUTE, t0=T0, v=None, tb=None):
    return K.kerzen([(t0 + i * p, o, h, l, c, v[i] if v else 1.0, tb[i] if tb else 0.5)
                     for i, (o, h, l, c) in enumerate(ohlc)], p)


def zufallsweg(n, seed, sigma=0.0005, p=K.MINUTE, t0=T0):
    rnd, c, z = random.Random(seed), 100.0, []
    for _ in range(n):
        o = c
        c = o * math.exp(rnd.gauss(0, sigma))
        z.append((o, max(o, c) * (1 + abs(rnd.gauss(0, sigma / 2))), min(o, c) * (1 - abs(rnd.gauss(0, sigma / 2))), c))
    v = [1 + rnd.random() for _ in range(n)]
    return kerzen(z, p, t0, v, [x * rnd.random() for x in v])


# ── Rendite + Kosten ──
tr = (0, 1, 1, 100.0, 101.0, "M", "T")
aus = 101.0 * (1 - 0.0001)
erw = (aus / 100.0 - 1) - 0.0002 - 0.0005 * (aus / 100.0)
pruefe("Long Maker rein, Taker raus: Schlupf + Gebühren exakt", abs(K.netto(tr, ECHT) - erw) < 1e-15, (K.netto(tr, ECHT), erw))
tr = (0, 1, -1, 100.0, 99.0, "T", "T")
ein, aus = 100.0 * (1 - 0.0001), 99.0 * (1 + 0.0001)
erw = -(aus / ein - 1) - 0.0005 - 0.0005 * (aus / ein)
pruefe("Short Taker/Taker: Schlupf gegen die Richtung", abs(K.netto(tr, ECHT) - erw) < 1e-15, (K.netto(tr, ECHT), erw))
pruefe("Brutto ohne Kosten", abs(K.brutto(tr) - 0.01) < 1e-12)
f = K.funding_reihe([(T0 + 8 * 3_600_000 + 2, 0.0001)])  # Zeitstempel mit Millisekunden-Versatz wie in den Archiven
lang = (T0, T0 + 9 * 3_600_000, 1, 100.0, 100.0, "T", "T")
pruefe("Funding: Long über den Zeitpunkt zahlt", abs(K.netto(lang, NULL, f) + 0.0001) < 1e-15)
pruefe("Funding: Short über den Zeitpunkt erhält", abs(K.netto((*lang[:2], -1, *lang[3:]), NULL, f) - 0.0001) < 1e-15)
pruefe("Funding: Einstieg genau zum Zeitpunkt zahlt nicht", K.netto((T0 + 8 * 3_600_000, T0 + 9 * 3_600_000, 1, 100.0, 100.0, "T", "T"), NULL, f) == 0)
pruefe("Funding: Ausstieg genau zum Zeitpunkt zahlt (war offen)", K.netto((T0, T0 + 8 * 3_600_000, 1, 100.0, 100.0, "T", "T"), NULL, f) < 0)

# ── Indikatoren gegen Brute-Force ──
rnd = random.Random(3)
x = [100 + rnd.gauss(0, 2) for _ in range(500)]
m, s = K.mittel_sd(x, 20)
pruefe("Gleitender Mittelwert/σ = statistics", all(abs(m[i] - statistics.fmean(x[i - 19:i + 1])) < 1e-9
       and abs(s[i] - statistics.pstdev(x[i - 19:i + 1])) < 1e-7 for i in range(19, 500)) and math.isnan(m[18]))
hh, ll = K.hoch_n(x, 7), K.tief_n(x, 7)
pruefe("Rollendes Hoch/Tief = max/min", all(hh[i] == max(x[i - 6:i + 1]) and ll[i] == min(x[i - 6:i + 1]) for i in range(6, 500)))
r = K.rsi([1.0, 2.0, 3.0, 2.0], 2)
pruefe("RSI(2) nach Wilder: 2 Gewinne, dann Verlust", math.isnan(r[1]) and r[2] == 100.0 and abs(r[3] - (100 - 100 / (1 + 0.5 / 0.5))) < 1e-12, list(r))
a = K.atr([2.0] * 30, [1.0] * 30, [1.5] * 30, 14)
pruefe("ATR bei konstanter Spanne = Spanne", all(abs(a[i] - 1.0) < 1e-12 for i in range(14, 30)) and math.isnan(a[13]))

# ── Kerzen bündeln + ordnen ──
b = kerzen([(i, i + 0.5, i - 0.5, i + 0.1) for i in range(1, 11)], t0=T0 + 3 * K.MINUTE, v=[1] * 10, tb=[0.25] * 10)
g = K.buendeln(b, 5)
pruefe("Bündeln nach der Uhr: 00:03–00:04 | 00:05–00:09 | 00:10–00:12", list(g["t"]) == [T0, T0 + 5 * K.MINUTE, T0 + 10 * K.MINUTE]
       and list(g["o"]) == [1, 3, 8] and list(g["c"]) == [2.1, 7.1, 10.1] and list(g["h"]) == [2.5, 7.5, 10.5]
       and list(g["l"]) == [0.5, 2.5, 7.5] and list(g["v"]) == [2, 5, 3] and list(g["tb"]) == [0.5, 1.25, 0.75], g)
u = K.kerzen([(T0 + 2, 1, 1, 1, 1, 1, 0), (T0, 2, 2, 2, 2, 1, 0), (T0 + 2, 3, 3, 3, 3, 1, 0)])
pruefe("Ordnen: sortiert, doppelte Zeit nur einmal", list(u["t"]) == [T0, T0 + 2] and list(u["o"]) == [2, 1], dict(u))

# ── S1 Band-Abpraller: strenge Füll-Regeln ──
WARM = [(100.0, c + 0.01, c - 0.01, c) for c in [99.0, 101.0] * 10]  # Mitte 100, σ = 1 → Band 98 / 102 bei k = 2


def band(*kerzen_nach):
    return K.band_abpraller(kerzen(WARM + list(kerzen_nach)), 2.0, 0.1)


pruefe("S1: Band nur BERÜHRT (1 Tick) → keine Füllung", band((100, 100.05, 97.9, 99), *[(99.5, 99.6, 99.4, 99.5)] * 40) == [])
t = band((100, 100.05, 97.85, 98.5), (99, 100.2, 98.5, 100))  # Schluss der Füll-Kerze ≠ altes Fenster → Band nur aus der Vergangenheit
pruefe("S1: durchstossen → Long zum Limit 98, Ziel Mitte 100 als Maker (Band aus Kerzen VOR der Füllung)",
       t == [(T0 + 20 * K.MINUTE, T0 + 21 * K.MINUTE, 1, 98.0, 100.0, "M", "M")], t)
t = band((100, 100.05, 97.85, 99), (99, 100.5, 95.9, 98))
pruefe("S1: Stop UND Ziel in derselben Kerze → Stop (96, Taker)", t and t[0][4] == 96.0 and t[0][6] == "T", t)
t = band((100, 101.0, 95.5, 99))
pruefe("S1: Stop schon in der Einstiegskerze → Stop, Ziel dort nie", t and t[0][1] == t[0][0] and t[0][4] == 96.0, t)
t = band((100, 100.05, 97.85, 99), (95, 95.5, 94.8, 95))
pruefe("S1: Kurslücke unter den Stop → Füllung zum schlechteren Eröffnungskurs", t and t[0][4] == 95.0, t)
t = band((100, 100.05, 97.85, 99), *[(99, 99.5, 98.5, 99)] * 31)
pruefe("S1: Zeitausstieg nach 30 Kerzen zum Schluss (Taker)", t and t[0][4] == 99 and t[0][6] == "T"
       and t[0][1] == T0 + 51 * K.MINUTE, t)

# ── S2 Ausbruch ──
W4 = [(100.0, 101.0, 99.0, 100.0)] * 4
t = K.ausbruch(kerzen(W4 + [(100, 101.5, 98.5, 100)]), 4, 0.1)
pruefe("S2: beide Seiten in einer Kerze → schlechtester Fall (Long rein, am Long-Stop raus)", t == [(T0 + 4 * K.MINUTE, T0 + 4 * K.MINUTE, 1, 101.1, 98.9, "T", "T")], t)
t = K.ausbruch(kerzen(W4 + [(100, 101.5, 99.5, 101.4), (101.4, 103, 101, 102.9), (103, 104, 102, 103.5), (103, 103.2, 100.5, 101)]), 4, 0.1)
pruefe("S2: Stop-Einstieg 101.1, Stop zieht nach (98.9 → 99.4 → 100.9), Ausstieg 100.9", t == [(T0 + 4 * K.MINUTE, T0 + 7 * K.MINUTE, 1, 101.1, 100.9, "T", "T")], t)
t = K.ausbruch(kerzen(W4 + [(100, 101.5, 99.5, 101.4), (101.4, 103, 101, 102.9), (103, 104, 102, 103.5), (103.5, 103.8, 100.95, 101.5),
                            (101.5, 101.6, 100.88, 101.3)]), 4, 0.1)
pruefe("S2: nachgezogener Stop wird nie wieder gelockert (100.9 bleibt, obwohl das 2er-Tief auf 100.95 fällt)",
       t and t[0][1] == T0 + 8 * K.MINUTE and t[0][4] == 100.9, t)
t = K.ausbruch(kerzen(W4 + [(101.5, 102, 101.2, 101.8), (101.8, 102, 101.5, 101.9), (101, 101.2, 98, 98.5)]), 4, 0.1)
pruefe("S2: Eröffnung schon über dem Ausbruch → Einstieg zur Eröffnung (Lücke)", t and t[0][3] == 101.5, t)

# ── S3 RSI(2): RSI-Ausstieg erst zur NÄCHSTEN Eröffnung ──
z, c = [], 100.0
for i in range(212):
    o = c + 0.03  # kleine Lücke zwischen Schluss und nächster Eröffnung → Schluss ≠ nächste Eröffnung
    c = o + 0.07
    z.append((o, c + 0.05, o - 0.05, c))
for d in (-1.0, -1.0, 0.5, 0.5, 0.5, 0.5):
    o = c + 0.03
    c = o + d
    z.append((o, max(o, c) + 0.05, min(o, c) - 0.05, c))
b = kerzen(z, p=5 * K.MINUTE)
t = K.rsi2(b, 5, True)
r = K.rsi(b["c"], 2)
j = 214  # Signal am Schluss der 2. Minus-Kerze (Index 213) → Einstieg 214
x = next(i for i in range(j, len(z)) if r[i] > 50)
pruefe("S3: Signal nach 2 Minus-Kerzen im Aufwärtstrend, Einstieg nächste Eröffnung", t and t[0][0] == b["t"][j] and t[0][3] == b["o"][j], (t, r[212:216]))
pruefe("S3: RSI > 50 am Schluss → Ausstieg zur nächsten Eröffnung (nicht zum selben Schluss)", t and t[0][1] == b["t"][x + 1] and t[0][4] == b["o"][x + 1], (t, x))
pruefe("S3: Trendfilter verhindert Long im Abwärtstrend", K.rsi2(kerzen([(200 - i * 0.1, 200 - i * 0.1 + 0.05, 200 - i * 0.1 - 0.15, 200 - (i + 1) * 0.1) for i in range(230)], p=5 * K.MINUTE), 5, True) == [] or
       all(x[2] == -1 for x in K.rsi2(kerzen([(200 - i * 0.1, 200 - i * 0.1 + 0.05, 200 - i * 0.1 - 0.15, 200 - (i + 1) * 0.1) for i in range(230)], p=5 * K.MINUTE), 5, True)))

# ── Kein Blick in die Zukunft: Zukunft verändern → frühere Trades identisch ──
b = zufallsweg(4000, 11, sigma=0.002)
b2 = {k: (type(v)(v.typecode, v) if hasattr(v, "typecode") else v) for k, v in b.items()}
rnd = random.Random(5)
for i in range(2500, 4000):
    q = 1 + rnd.gauss(0, 0.02)
    for k in ("o", "h", "l", "c"):
        b2[k][i] *= q
    b2["tb"][i] = b2["v"][i] * rnd.random()
grenze = b["t"][2500]
for name, fn in (("S1", lambda B: K.band_abpraller(B, 2.0, 0.01)), ("S2", lambda B: K.ausbruch(B, 15, 0.01)),
                 ("S3", lambda B: K.rsi2(B, 10, False)), ("S4", lambda B: K.fluss_folgen(B, 5, 15, 2.0, 500)),
                 ("S5", lambda B: K.fluss_umkehr(B, 2.0, 2))):
    vor1 = [x for x in fn(b) if x[1] < grenze]
    vor2 = [x for x in fn(b2) if x[1] < grenze]
    pruefe(f"{name}: kein Blick in die Zukunft ({len(vor1)} Trades vor der Änderung identisch)", vor1 == vor2 and len(vor1) > 3, (len(vor1), len(vor2)))

# ── Kosten machen jeden Trade schlechter ──
t = K.fluss_folgen(b, 5, 15, 2.0, 500)
pruefe("Netto < Brutto für jeden Trade (ohne Funding)", t and all(K.netto(x, ECHT) < K.brutto(x) for x in t))

# ── Eingepflanztes Muster wird gefunden, Zufallsprobe erkennt es ──
rnd, z, v, tb, c = random.Random(9), [], [], [], 100.0
for i in range(6000):
    o = c
    if i % 100 == 50:
        c = o * 1.01
        tb.append(10.0)
    elif i % 100 == 51:
        c = o / 1.01
        tb.append(5.0)
    else:
        c = o * math.exp(rnd.gauss(0, 0.0005))
        tb.append(10.0 * rnd.random())
    v.append(10.0)
    z.append((o, max(o, c) * 1.0002, min(o, c) * 0.9998, c))
b = kerzen(z, v=v, tb=tb)
t = K.fluss_umkehr(b, 2.0, 1)
k = K.kennzahlen(t, ECHT)
gepflanzt = {b["t"][i + 1] for i in range(len(z)) if i % 100 == 50 and i > 100}
getroffen = [x for x in t if x[0] in gepflanzt]
pruefe("S5: eingepflanzte Umkehr nach Kauf-Welle wird jedes Mal short gehandelt, netto > 50 bp", len(getroffen) == len(gepflanzt)
       and all(x[2] == -1 for x in getroffen) and k["netto_bp"] > 50, (len(getroffen), len(gepflanzt), k))
zuf = K.zufallsprobe(t, b, 200, seed=1)
br = sum(K.brutto(x) for x in t)
pruefe("Zufallsprobe: echtes Muster schlägt ≥ 99 % der Zufallskopien", sum(q < br for q in zuf) / len(zuf) >= 0.99, (br, sorted(zuf)[-5:]))
pruefe("Zufallsprobe reproduzierbar (gleicher Startwert)", K.zufallsprobe(t, b, 20, seed=1) == K.zufallsprobe(t, b, 20, seed=1)
       and K.zufallsprobe(t, b, 20, seed=1) != K.zufallsprobe(t, b, 20, seed=2))

# ── S6 Halbstunden-Momentum ──
tag0 = int(datetime(2026, 7, 13, tzinfo=timezone.utc).timestamp() * 1000)
z, c = [], 100.0
for i in range(3 * 1440):
    minute = i % 1440
    o = c
    tagnr = i // 1440
    if minute < 30:
        c = o * (1.0003 if tagnr != 1 else 0.9997)
    z.append((o, max(o, c), min(o, c), c))
b = kerzen(z, t0=tag0)
t = K.halbstunde(b, "utc")
pruefe("S6: Richtung der ersten halben Stunde, gehandelt 23:30–24:00 UTC", [x[2] for x in t] == [1, -1, 1]
       and all((x[0] - tag0) % 86_400_000 == (23 * 60 + 30) * K.MINUTE and x[1] - x[0] == 30 * K.MINUTE for x in t), t)
pruefe("S6: «nur starke» braucht 30 Tage Vorgeschichte", K.halbstunde(b, "utc_stark") == [])
pruefe("S6: New York 09:30 = 13:30 UTC im Sommer, 14:30 UTC im Winter",
       K._ny_utc_ms(datetime(2026, 7, 15).date(), 9, 30) == int(datetime(2026, 7, 15, 13, 30, tzinfo=timezone.utc).timestamp() * 1000)
       and K._ny_utc_ms(datetime(2026, 1, 15).date(), 9, 30) == int(datetime(2026, 1, 15, 14, 30, tzinfo=timezone.utc).timestamp() * 1000))

# ── S7 Tageszeit-Muster: lernt nur aus der Vergangenheit ──
z, c, lern_ende = [], 100.0, T0 + 10 * 86_400_000
for i in range(20 * 24):
    o, st, spaeter = c, (T0 // 3_600_000 + i) % 24, i >= 240
    q = {5: 1.01, 6: 1.005, 17: 0.99}.get(st, 1.0)
    if spaeter and st == 5:
        q = 0.99  # Muster kippt NACH dem Lernzeitraum
    c = o * q
    z.append((o, max(o, c), min(o, c), c))
b = kerzen(z, p=3_600_000)
t, lang, kurz = K.stunden_muster(b, 1, lern_ende)
pruefe("S7: lernt Stunde 5 (long) und 17 (short) nur aus dem Lernzeitraum", lang == [5] and kurz == [17], (lang, kurz))
spaet = [x for x in t if x[0] >= lern_ende and x[2] == 1]
pruefe("S7: nach dem Kippen verliert Stunde 5 (kein heimliches Umlernen)", spaet and all(K.brutto(x) < 0 for x in spaet))
t, lang, _ = K.stunden_muster(b, 2, lern_ende)
lange = [x for x in t if x[2] == 1]
pruefe("S7: zusammenhängende Stunden gleicher Richtung = EIN Trade (Gebühren nur einmal)", lang == [5, 6] and lange
       and all(x[1] - x[0] == 2 * 3_600_000 for x in lange), lange[:2])

# ── Kennzahlen ──
tr = [(0, 1, 1, 100.0, 101.0, "T", "T"), (0, 1, 1, 100.0, 99.5, "T", "T"), (0, 1, 1, 100.0, 100.2, "T", "T")]
k = K.kennzahlen(tr, NULL)
pruefe("Kennzahlen: Summe, Trefferquote, Gewinnfaktor, Einbruch", k["n"] == 3 and abs(k["summe_pct"] - 0.7) < 1e-9
       and abs(k["treffer"] - 0.6667) < 1e-9 and abs(k["pf"] - 2.4) < 1e-9 and abs(k["einbruch_pct"] + 0.5) < 1e-9, k)

# ── Entscheidungsregeln (scalping_pruefung) ──
v = {"a": {"lern": {"n": 500, "netto_bp": 1.0}}, "b": {"lern": {"n": 80, "netto_bp": 9.0}}, "c": {"lern": {"n": 150, "netto_bp": 2.0}}}
pruefe("Wahl: höchster Lern-Gewinn je Trade, aber nur mit ≥ 100 Lern-Trades", SP.waehle(v) == "c")
pruefe("Wahl: hat keine Variante 100 Trades → die mit den meisten", SP.waehle({"a": {"lern": {"n": 5, "netto_bp": 1}}, "b": {"lern": {"n": 9, "netto_bp": -1}}}) == "b")
st = SP.LERN_ENDE
b1 = zufallsweg((SP.PRUEF_ENDE - st) // 3_600_000, 21, sigma=0.003, p=3_600_000, t0=st)
schritt = (SP.PRUEF_ENDE - st) // 300


def gut_trades(n, rendite_vorn, rendite_hinten):
    return [(st + i * schritt, st + i * schritt + 3_600_000, 1, 100.0, 100.0 * (1 + (rendite_vorn if st + i * schritt < SP.MITTE else rendite_hinten)), "T", "T")
            for i in range(n)]


kos = {**SP.GEBUEHR, "slip": 0.0001}
r = SP.pruefe(gut_trades(300, 0.005, 0.005), b1, kos, None)
pruefe("Urteil: klarer Vorteil in beiden Hälften → bestanden", r["bestanden"] and r["zufall_geschlagen"] >= 0.9, r["kriterien"])
r = SP.pruefe(gut_trades(300, 0.005, -0.002), b1, kos, None)
pruefe("Urteil: zweite Hälfte im Minus → durchgefallen", not r["bestanden"] and not r["kriterien"]["beide_haelften"], r["kriterien"])
r = SP.pruefe(gut_trades(150, 0.005, 0.005), b1, kos, None)
pruefe("Urteil: zu wenige Trades → durchgefallen", not r["bestanden"] and not r["kriterien"]["anzahl"], r["kriterien"])
rnd = random.Random(4)
zt, c = [], 100.0
for i in range((SP.PRUEF_ENDE - st) // 3_600_000):
    o = c
    c = o * math.exp(0.003 + rnd.gauss(0, 0.001))  # starker Aufwärtstrend: jeder Long verdient, ohne jedes Timing
    zt.append((o, max(o, c), min(o, c), c))
bt = kerzen(zt, p=3_600_000, t0=st)
mitlaeufer = [(bt["t"][e], bt["t"][e] + 3_600_000, 1, bt["o"][e], bt["c"][e], "T", "T") for e in range(0, len(zt), len(zt) // 300)][:300]
r = SP.pruefe(mitlaeufer, bt, kos, None)
pruefe("Urteil: Gewinn nur vom Markt (Zufallskopien gleich gut) → durchgefallen", not r["bestanden"] and not r["kriterien"]["zufall"]
       and r["kriterien"]["beide_haelften"], (r["zufall_geschlagen"], r["kriterien"]))
r = SP.pruefe(gut_trades(300, 0.00125, 0.00125), b1, kos, None)
pruefe("Urteil: dünner Vorteil (12,5 bp brutto, ~0,5 bp netto) → durchgefallen (Puffer + Stresstest)", not r["bestanden"]
       and not r["kriterien"]["netto_je_trade"] and not r["kriterien"]["stress"], (r["kennzahlen"], r["kriterien"]))

fake = {"maerkte": {"BTCUSDT": {"S1": {"name": "Band", "gewaehlt": "k=2.0", "pruefung": {
    "kennzahlen": {"n": 12345, "brutto_bp": 1.04, "netto_bp": -5.2, "summe_pct": -3.0, "treffer": 0.5},
    "zufall_geschlagen": 0.4, "kriterien": {"beide_haelften": False, "anzahl": True}, "bestanden": False}}}}}
md = SP.bericht_md(fake)
pruefe("Bericht: Tabelle direkt aus der Ergebnis-Datei (12'345 Trades, fehlende Kriterien genannt)",
       "12'345" in md and "+1.0 bp" in md and "-5.2 bp" in md and "❌ beide_haelften" in md and "anzahl" not in md.split("❌")[-1], md)

print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen")
sys.exit(1 if n_f else 0)
