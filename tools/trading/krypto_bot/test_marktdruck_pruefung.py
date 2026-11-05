#!/usr/bin/env python3
"""Tests für den Marktdruck-Prüfstand (marktdruck_pruefung.py) — ohne Netz, mit künstlichen Handeln:
python3 tools/trading/krypto_bot/test_marktdruck_pruefung.py"""
from __future__ import annotations

import io
import json
import math
import sys
import tempfile
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import marktdruck_pruefung as M  # noqa: E402

OK, FEHLER = 0, []


def pruefe(name, bed, info=""):
    global OK
    if bed:
        OK += 1
    else:
        FEHLER.append(name)
        print(f"FAIL {name} {info}")


def nah(a, b, tol=1e-9):
    return a is not None and b is not None and abs(a - b) <= tol


# ── Protokoll-Konstanten (vorab festgelegt, dürfen sich nicht still ändern) ──
pruefe("Raster: 2 Modi × 3 Halbwertszeiten × 2 Schwellen × 2 Haltedauern × 2 Richtungen = 48 Zellen",
       len(M.MODI) * len(M.HZ) * len(M.SCHWELLEN) * len(M.HALTEN) * len(M.RICHTUNGEN) == 48 and M.HZ == (10, 30, 60) and M.SCHWELLEN == (0.75, 0.90) and M.HALTEN == (30, 120))
pruefe("Kosten je Hin- und Rückweg aus den Einstellungen des Labors: BTC 12,0 bp, ETH 13,0 bp; Wunschfall 4,0 bp", nah(M.kosten_bp("BTCUSDT"), 12.0) and nah(M.kosten_bp("ETHUSDT"), 13.0) and M.KOSTEN_WUNSCH_BP == 4.0)
pruefe("14 volle UTC-Tage vom 22.10. bis 04.11.2026, Hälften zu 7 Tagen", [t.isoformat() for t in M.tage()][0] == "2026-10-22" and [t.isoformat() for t in M.tage()][-1] == "2026-11-04" and len(M.tage()) == 14 and M.HAELFTE_TAGE == 7)
try:  # die Zahlen des Scalping-Labors (nicht neu erfunden): Gebühr Taker 5 bp, Schlupf BTC 1 bp, ETH 1,5 bp
    import scalping_labor as SL
    pruefe("Kosten stammen aus dem Scalping-Labor (Gebühr Taker, Schlupf je Markt)",
           nah(SL.GEBUEHR["T"] * 10_000, M.GEBUEHR_TAKER_BP) and nah(SL.MAERKTE["BTCUSDT"]["slip"] * 10_000, M.MAERKTE["BTCUSDT"]["slip_bp"]) and nah(SL.MAERKTE["ETHUSDT"]["slip"] * 10_000, M.MAERKTE["ETHUSDT"]["slip_bp"])
           and nah(SL.GEBUEHR["M"] * 10_000 * 2, M.KOSTEN_WUNSCH_BP))
except ImportError:
    pass

# ── sekundenraster: künstliche Tagesdatei ──
TAG = date(2026, 10, 22)
START = int(datetime(2026, 10, 22, tzinfo=timezone.utc).timestamp())


def zip_mit(zeilen, name="BTCUSDT-aggTrades-2026-10-22.csv"):
    puffer = io.BytesIO()
    with zipfile.ZipFile(puffer, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(name, "\n".join(zeilen) + "\n")
    return puffer.getvalue()


def zeile(i, kurs, menge, t, maker, zeit_einheit="us"):
    zeit = t * 1_000_000 + 123_456 if zeit_einheit == "us" else t * 1000 + 123
    return f"{i},{kurs},{menge},{i},{i},{zeit},{'True' if maker else 'False'},True"


zeilen = [
    zeile(1, 100.0, 2.0, START + 5, False),            # aggressiver Kauf, Sekunde 5
    zeile(2, 101.0, 1.0, START + 5, True),             # aggressiver Verkauf (Käufer ist Maker), Sekunde 5, später = letzter Kurs
    zeile(3, 102.0, 0.5, START + 7, False),
    zeile(4, 103.0, 3.0, START + 9, True, "ms"),       # Millisekunden (alte Dateien)
    zeile(5, 999.0, 9.0, START - 1, False),            # vor dem Tag: ignoriert
    zeile(6, 999.0, 9.0, START + 86_400, False),       # nach dem Tag: ignoriert
    "kaputte,Zeile",
    "7,abc,1.0,7,7,5,False,True",                      # Zahl unlesbar: ignoriert
]
with tempfile.TemporaryDirectory() as td:
    pfad = Path(td) / "x.zip"
    pfad.write_bytes(zip_mit(zeilen))
    r = M.sekundenraster(pfad, TAG)
    pruefe("Raster: Käufermenge, Verkäufermenge und Anzahl je Sekunde (Käufer = is_buyer_maker False)",
           nah(r["kv"][5], 2.0) and nah(r["vv"][5], 1.0) and r["kn"][5] == 1 and r["vn"][5] == 1 and nah(r["kv"][7], 0.5) and nah(r["vv"][9], 3.0) and r["vn"][9] == 1, (r["kv"][5], r["vv"][5]))
    pruefe("Raster: der letzte Kurs der Sekunde zählt, Sekunden ohne Handel bleiben leer", r["p"][5] == 101.0 and r["p"][7] == 102.0 and r["p"][9] == 103.0 and r["p"][6] is None)
    pruefe("Raster: Mikrosekunden und Millisekunden werden erkannt, Handel ausserhalb des Tages und kaputte Zeilen zählen nicht", r["n"] == 4, r["n"])
    pfad2 = Path(td) / "zwei.zip"
    with zipfile.ZipFile(pfad2, "w") as z:
        z.writestr("a.csv", "x")
        z.writestr("b.csv", "y")
    try:
        M.sekundenraster(pfad2, TAG)
        pruefe("Raster: zwei CSV in einer Datei → Abbruch", False)
    except M.DatenFehler:
        pruefe("Raster: zwei CSV in einer Datei → Abbruch", True)


# ── zusammensetzen: Kurs weitertragen, auffällig wenig Handel bricht ab ──
def leer_tag(n, preise):
    p = [None] * M.TAG_S
    for s, k in preise.items():
        p[s] = k
    return {"kv": [0.0] * M.TAG_S, "vv": [0.0] * M.TAG_S, "kn": [0] * M.TAG_S, "vn": [0] * M.TAG_S, "p": p, "n": n}


t1, t2 = leer_tag(300_000, {10: 50.0, 20: 51.0}), leer_tag(300_000, {5: 52.0})
t1["kv"][3], t1["vv"][3], t1["kn"][3], t1["vn"][3] = 0.25, 0.75, 7, 2
t2["kv"][4], t2["vv"][4], t2["kn"][4], t2["vn"][4] = 1.5, 2.5, 11, 13
gk, gv, kurs = M.zusammensetzen([(date(2026, 10, 22), t1), (date(2026, 10, 23), t2)], "BTCUSDT")
pruefe("Zusammensetzen: Modus VP trägt die Mengen, Modus POT die Anzahl der Handel (beide Seiten, über die Tagesgrenze hinweg)",
       nah(gk["VP"][3], 0.25) and nah(gv["VP"][3], 0.75) and gk["POT"][3] == 7.0 and gv["POT"][3] == 2.0
       and nah(gk["VP"][M.TAG_S + 4], 1.5) and nah(gv["VP"][M.TAG_S + 4], 2.5) and gk["POT"][M.TAG_S + 4] == 11.0 and gv["POT"][M.TAG_S + 4] == 13.0)
pruefe("Zusammensetzen: vor dem ersten Handel gilt der erste Kurs, danach der letzte bekannte, über die Tagesgrenze hinweg",
       kurs[0] == 50.0 and kurs[10] == 50.0 and kurs[20] == 51.0 and kurs[M.TAG_S - 1] == 51.0 and kurs[M.TAG_S + 4] == 51.0 and kurs[M.TAG_S + 5] == 52.0 and len(kurs) == 2 * M.TAG_S)
pruefe("Zusammensetzen: beide Modi (Menge und Anzahl) liegen hintereinander", len(gk["VP"]) == 2 * M.TAG_S and len(gv["POT"]) == 2 * M.TAG_S)
try:
    M.zusammensetzen([(date(2026, 10, 22), leer_tag(199_999, {1: 1.0}))], "BTCUSDT")
    pruefe("Zusammensetzen: BTC-Tag mit 199 999 Handeln → Abbruch", False)
except M.DatenFehler:
    pruefe("Zusammensetzen: BTC-Tag mit 199 999 Handeln → Abbruch (nichts wird schöngerechnet)", True)
try:
    M.zusammensetzen([(date(2026, 10, 22), leer_tag(200_000, {1: 1.0}))], "BTCUSDT")
    pruefe("Zusammensetzen: genau 200 000 Handel genügen", True)
except M.DatenFehler:
    pruefe("Zusammensetzen: genau 200 000 Handel genügen", False)


# ── ereignisse: Druck mit Zerfall, Aktivitätsfilter, Einschwingzeit, neue Phase ──
def reihe(laenge=12_000, hg=1.0):
    """Ruhiger, ausgeglichener Handel: je Sekunde 1 Kauf und 1 Verkauf der Menge hg."""
    return [hg] * laenge, [hg] * laenge


def stoss(gk, s, kauf=0.0, verkauf=0.0):
    gk[0][s] += kauf
    gk[1][s] += verkauf


def spaet(ereignis_liste, ab=4000):
    """Das Stundenmittel ist nach der Einschwingzeit (3 600 s) erst zu 63 % eingeschwungen: in den ersten rund 6 Minuten danach (bis s ≈ 3 955) gilt
    gleichmässiger Handel noch als «Ausschlag». Das Protokoll bleibt unverändert (festgelegt vor dem Rechnen), der Bericht nennt die Eigenheit; die Tests zum
    Aktivitätsfilter schauen erst ab Sekunde 4 000 hin."""
    return [(s, u) for s, u in ereignis_liste if s >= ab]


for hz in (10, 30, 60):
    gk_, gv_ = reihe()
    stoss((gk_, gv_), 5000, kauf=400.0)
    ev = M.ereignisse(gk_, gv_, hz)
    pruefe(f"Ereignis: ein einseitiger Kaufstoss nach der Einschwingzeit löst bei Halbwertszeit {hz} s genau ein Kaufereignis in dieser Sekunde aus (Schwelle 0,75)", ev[0.75] == [(5000, 1)], ev[0.75][:3])
    gk_, gv_ = reihe()
    stoss((gk_, gv_), 5000, verkauf=400.0)
    ev = M.ereignisse(gk_, gv_, hz)
    pruefe(f"Ereignis: ein Verkaufsstoss löst ein Verkaufsereignis aus (Halbwertszeit {hz} s)", len(ev[0.75]) == 1 and ev[0.75][0][1] == -1, ev[0.75][:3])
    gk_, gv_ = reihe()
    stoss((gk_, gv_), 5000, kauf=400.0)
    stoss((gk_, gv_), 5600, kauf=400.0)
    ev = M.ereignisse(gk_, gv_, hz)
    pruefe(f"Ereignis: zwei Kaufstösse im Abstand von 600 s sind zwei Phasen (der Druck ist dazwischen verfallen, Halbwertszeit {hz} s)", len(ev[0.75]) == 2, ev[0.75])
    gk_, gv_ = reihe()
    stoss((gk_, gv_), 5000, kauf=400.0)
    stoss((gk_, gv_), 5003, kauf=400.0)
    ev = M.ereignisse(gk_, gv_, hz)
    pruefe(f"Ereignis: ein zweiter Stoss drei Sekunden später gehört zur selben Phase, kein zweites Ereignis (Halbwertszeit {hz} s)", len(ev[0.75]) == 1, ev[0.75])
gk_, gv_ = reihe()
stoss((gk_, gv_), 1000, kauf=400.0)
pruefe("Ereignis: vor Ablauf der Einschwingzeit (erste Stunde) zählt nichts", M.ereignisse(gk_, gv_, 10)[0.75] == [])
gk_, gv_ = reihe()
stoss((gk_, gv_), 5000, kauf=6.0)  # R ≈ 0,8, aber die Gesamtaktivität steigt kaum: unter dem 1,5-fachen
ev = M.ereignisse(gk_, gv_, 10)
pruefe("Ereignis: dünner Handel ist kein Signal (Aktivität unter dem 1,5-fachen des Stundenmittels)", ev[0.75] == [], ev[0.75][:3])
# Aktivitätsfilter: ein dauerhaft einseitiger, aber gleichmässiger Handel (R ≈ 0,8) ist kein Signal — es fehlt der Ausschlag nach oben
gk_, gv_ = [4.0] * 12_000, [1.0] * 12_000
pruefe("Ereignis: gleichmässig einseitiger Handel (R = 0,8, Aktivität ohne Ausschlag) löst nie etwas aus (ab Sekunde 4 000, siehe spaet)", spaet(M.ereignisse(gk_, gv_, 10)[0.75]) == [] and spaet(M.ereignisse(gk_, gv_, 60)[0.75]) == [])
gk_[8000] += 800.0
pruefe("Ereignis: auf demselben einseitigen Hintergrund löst ein Ausschlag der Aktivität ein Ereignis aus", [s for s, u in spaet(M.ereignisse(gk_, gv_, 10)[0.75])] == [8000])


# Genau die Grenze des Aktivitätsfilters: verglichen wird mit dem Stundenmittel VOR dieser Sekunde (E(s−1)), nicht mit einem Mittel, das sie schon enthält
def vor_sekunde(gk_, gv_, hz, s):
    d, k, v, e = 0.5 ** (1.0 / hz), 0.0, 0.0, 0.0
    for i in range(s):
        k, v = k * d + gk_[i], v * d + gv_[i]
        e = e * (1.0 - 1.0 / M.EMA_N) + (k + v) / M.EMA_N
    return k, v, e, d


S0 = 12_000
for abstand, erwartet in ((1e-4, True), (-1e-4, False)):
    gk_, gv_ = [3.9] * (S0 + 1), [0.1] * (S0 + 1)
    k0, v0, e0, d0 = vor_sekunde(gk_, gv_, 10, S0)
    a_ohne = (k0 * d0 + gk_[S0]) + (v0 * d0 + gv_[S0])
    gk_[S0] += 1.5 * e0 * (1.0 + abstand) - a_ohne          # Aktivität = 1,5 × E(s−1) × (1 ± 0,0001)
    ev = spaet(M.ereignisse(gk_, gv_, 10)[0.75])
    pruefe(f"Ereignis: Aktivität knapp {'über' if erwartet else 'unter'} dem 1,5-fachen des Stundenmittels VOR dieser Sekunde → {'Ereignis' if erwartet else 'keines'}",
           (ev == [(S0, 1)]) if erwartet else (ev == []), ev[:3])

gk_, gv_ = reihe()
stoss((gk_, gv_), 5000, kauf=45.0)  # R zwischen 0,75 und 0,90 bei Halbwertszeit 10 s
ev = M.ereignisse(gk_, gv_, 10)
pruefe("Ereignis: Verhältnis zwischen 0,75 und 0,90 löst nur die niedrige Schwelle aus", len(ev[0.75]) == 1 and ev[0.90] == [], (ev[0.75][:2], ev[0.90][:2]))
# Verhältnis R genau: K = 14,93 + 400 ≈ 415, V ≈ 15 → R ≈ 0,965 bei Halbwertszeit 10 s (Hintergrund 1/(1−d)): 400 genügt auch für Schwelle 0,90
gk_, gv_ = reihe()
stoss((gk_, gv_), 5000, kauf=400.0)
pruefe("Ereignis: ein starker Stoss löst beide Schwellen aus (0,75 und 0,90)", len(M.ereignisse(gk_, gv_, 10)[0.90]) == 1)
# Zerfall: ohne Zerfall (d = 1) gäbe es kein zweites Ereignis; die Halbwertszeit ist wirklich eine Halbwertszeit
gk_, gv_ = [0.0] * 12_000, [0.0] * 12_000
for s in range(5000, 5010):
    gk_[s] = 100.0                                  # 10 s Kaufdruck, sonst Stille, danach Verkaufsdruck 100 s später
for s in range(5100, 5110):
    gv_[s] = 100.0
ev = M.ereignisse(gk_, gv_, 10)
pruefe("Ereignis: Kaufphase, dann (nach Verfall) Verkaufsphase → zwei Ereignisse mit umgekehrtem Vorzeichen", [u for s, u in ev[0.75]] == [1, -1], ev[0.75])


# ── handel: Verzug, Haltedauer, Richtung, nie überlappend, Ende der Daten ──
kurs = [100.0 + 0.01 * i for i in range(500)]
a, b = kurs[102], kurs[132]
g = M.handel(kurs, [(100, 1)], 30, "mit")
pruefe("Handel: Einstieg 2 Sekunden nach dem Ereignis, Ausstieg 30 Sekunden später, Brutto in bp", len(g) == 1 and g[0][0] == 100 and nah(g[0][1], (b / a - 1) * 10_000), g)
g2 = M.handel(kurs, [(100, 1)], 30, "gegen")
pruefe("Handel: Richtung «gegen» ist genau das Spiegelbild", nah(g2[0][1], -g[0][1]))
g3 = M.handel(kurs, [(100, -1)], 30, "mit")
pruefe("Handel: Verkaufsereignis mit dem Druck = Leerverkauf (Gewinn bei fallendem Kurs)", nah(g3[0][1], -g[0][1]))
g4 = M.handel(kurs, [(100, 1), (110, 1), (131, 1), (132, 1), (200, 1)], 30, "mit")
pruefe("Handel: während einer offenen Position werden Ereignisse übersprungen; ein Ereignis in der Ausstiegssekunde zählt wieder", [s for s, _ in g4] == [100, 132, 200], g4)
g5 = M.handel(kurs, [(100, 1), (480, 1)], 30, "mit")
pruefe("Handel: reicht der Ausstieg über das Ende der Daten hinaus, entsteht kein Handel", [s for s, _ in g5] == [100], g5)
fallend = [100.0 - 0.01 * i for i in range(500)]
pruefe("Handel: fallender Kurs → Kauf verliert, Verkauf gewinnt", M.handel(fallend, [(100, 1)], 30, "mit")[0][1] < 0 < M.handel(fallend, [(100, -1)], 30, "mit")[0][1])

# ── kennzahlen ──
kz = M.kennzahlen([10.0, 12.0, 14.0], 12.0)
pruefe("Kennzahlen: Trades, Brutto, Netto, t-Wert (Mittel ÷ Standardfehler)", kz["n"] == 3 and nah(kz["brutto"], 12.0) and nah(kz["netto"], 0.0) and nah(kz["t"], 12.0 / (2.0 / math.sqrt(3)), 1e-9), kz)
pruefe("Kennzahlen: keine Trades → n = 0 und keine Zahlen (nichts erfunden)", M.kennzahlen([], 12.0) == {"n": 0, "brutto": None, "netto": None, "t": None})
pruefe("Kennzahlen: ein einzelner Trade hat keinen t-Wert", M.kennzahlen([5.0], 12.0)["t"] is None)

# ── urteil (vorab festgelegt) ──
def teil(n, brutto, netto, t):
    return {"n": n, "brutto": brutto, "netto": netto, "t": t}


def zelle(*teile):
    return {"BTCUSDT": {"h1": teile[0], "h2": teile[1]}, "ETHUSDT": {"h1": teile[2], "h2": teile[3]}}


gut = teil(250, 13.5, 1.5, 3.5)
pruefe("Urteil: alle vier Teile mit ≥ 200 Trades und Netto ≥ +1 bp → bestanden", M.urteil({"A": zelle(gut, gut, gut, gut)})["urteil"] == "bestanden")
pruefe("Urteil: ein Teil mit 199 Trades → durchgefallen", M.urteil({"A": zelle(gut, teil(199, 13.5, 1.5, 3.5), gut, gut)})["urteil"] == "durchgefallen")
pruefe("Urteil: ein Teil mit Netto 0,99 bp → durchgefallen", M.urteil({"A": zelle(gut, gut, teil(250, 13.0, 0.99, 3.5), gut)})["urteil"] == "durchgefallen")
pruefe("Urteil: nur ein Markt besteht → durchgefallen", M.urteil({"A": zelle(gut, gut, teil(250, 5.0, -8.0, 1.0), teil(250, 5.0, -8.0, 1.0))})["urteil"] == "durchgefallen")
pruefe("Urteil: eine Zelle ohne Trades (None) lässt nichts bestehen und stürzt nicht ab", M.urteil({"A": zelle(gut, gut, gut, teil(0, None, None, None))})["urteil"] == "durchgefallen")
sig = teil(250, 0.5, -11.5, 3.2)
u = M.urteil({"A": zelle(sig, sig, sig, sig), "B": zelle(sig, sig, sig, teil(250, 0.5, -11.5, 2.9))})
pruefe("Urteil: Brutto über 0 mit t ≥ 3 in allen vier Teilen = «Signal vorhanden, aber unter den Kosten» (nur Einordnung, kein Bestehen)", u["urteil"] == "durchgefallen" and u["signal_zellen"] == ["A"], u)
pruefe("Urteil: negatives Brutto ist kein Signal", M.urteil({"A": zelle(*[teil(250, -0.5, -12.5, -3.2)] * 4)})["signal_zellen"] == [])

# ── Ende zu Ende mit geplantem Muster: Kaufstoss, danach steigt der Kurs 1 bp je Sekunde (alle 500 s) ──
alt_tag, alt_halb = M.TAG_S, M.HAELFTE_TAGE
M.TAG_S, M.HAELFTE_TAGE = 120_000, 1  # kleine Welt: zwei «Tage» zu 120 000 Sekunden
try:
    L = 2 * M.TAG_S

    def welt(mit_bewegung):
        gk_ = {"VP": [1.0] * L, "POT": [1.0] * L}
        gv_ = {"VP": [1.0] * L, "POT": [1.0] * L}
        kurs_ = [100.0] * L
        for b in range(5000, L - 600, 500):
            gk_["VP"][b] += 400.0
            gk_["POT"][b] += 400.0
            if mit_bewegung:
                for i in range(1, 41):
                    kurs_[b + i] = 100.0 * (1 + 0.0001 * i)       # +1 bp je Sekunde
                for i in range(41, 400):
                    kurs_[b + i] = 100.0 * (1 + 0.0001 * 40)
                for i in range(400, 500):
                    kurs_[b + i] = 100.0
        return gk_, gv_, kurs_
    serien = {m: welt(True) for m in M.MAERKTE}
    erg = M.pruefen(serien)
    z = erg["VP-HZ10-S75-H30-mit"]["BTCUSDT"]["h1"]
    pruefe("Ende zu Ende: das geplante Muster (+1 bp je Sekunde nach dem Stoss) ergibt rund +30 bp brutto und mehr als 200 Trades je Hälfte",
           z["n"] >= 200 and 29.0 <= z["brutto"] <= 31.0 and nah(z["netto"], z["brutto"] - 12.0), z)
    z2 = erg["VP-HZ10-S75-H30-gegen"]["BTCUSDT"]["h1"]
    pruefe("Ende zu Ende: «gegen» verliert dasselbe (Spiegelbild)", nah(z2["brutto"], -z["brutto"]) and z2["n"] == z["n"])
    ur = M.urteil(erg)
    pruefe("Ende zu Ende: mit geplantem Vorhersagewert über den Kosten → BESTANDEN (die Prüfung KANN bestehen)", ur["urteil"] == "bestanden" and "VP-HZ10-S75-H30-mit" in ur["bestanden_zellen"], ur["bestanden_zellen"][:3])
    h120 = erg["VP-HZ10-S75-H120-mit"]["BTCUSDT"]["h1"]
    pruefe("Ende zu Ende: bei 120 s Haltedauer liegt der Ausstieg auf dem Plateau (+40 bp, Einstieg bei +2 bp) → rund +38 bp brutto, bei 30 s rund +30 bp",
           h120["n"] >= 200 and 37.5 <= h120["brutto"] <= 38.5 and 29.0 <= z["brutto"] <= 31.0, (h120, z))
    # Hälften: der Kurs bewegt sich NUR in der ersten Hälfte; die zweite bleibt flach → h1 ≈ +30 bp brutto, h2 ≈ 0, und das Urteil fällt durch
    gk_a, gv_a, kurs_a = welt(True)
    for i in range(M.TAG_S, L):
        kurs_a[i] = 100.0
    asym = M.pruefen({m: (gk_a, gv_a, kurs_a) for m in M.MAERKTE})
    za = asym["VP-HZ10-S75-H30-mit"]["ETHUSDT"]
    pruefe("Ende zu Ende: Stösse in beiden Hälften, Kursbewegung nur in der ersten → erste Hälfte ≈ +30 bp, zweite Hälfte ≈ 0 bp (die Hälften werden richtig getrennt)",
           za["h1"]["n"] >= 200 and za["h2"]["n"] >= 200 and 29.0 <= za["h1"]["brutto"] <= 31.0 and abs(za["h2"]["brutto"]) < 1e-9, za)
    pruefe("Ende zu Ende: gewinnt nur die erste Hälfte, fällt das Urteil durch (beide Hälften müssen bestehen)", M.urteil(asym)["urteil"] == "durchgefallen")
    kalt = M.pruefen({m: welt(False) for m in M.MAERKTE})
    pruefe("Ende zu Ende: dieselben Stösse OHNE Kursbewegung → DURCHGEFALLEN, jedes Netto = −Kosten", M.urteil(kalt)["urteil"] == "durchgefallen"
           and all(nah(t["netto"], -12.0) for m in ("BTCUSDT",) for z_ in kalt.values() for t in z_[m].values() if t["n"]), "")
    txt = M.tabelle(erg, 3)
    erste_zeile = txt.splitlines()[2]
    pruefe("Tabelle: die erste Zelle ist die mit dem besten schlechtesten Teil (hier eine «H120-mit»-Zelle, +26 bp netto), und die Messungen werden zusammengefasst",
           "H120-mit" in erste_zeile and "Messungen" in txt and "mittleres Netto" in txt and len(txt.splitlines()) == 6, txt[:400])
finally:
    M.TAG_S, M.HAELFTE_TAGE = alt_tag, alt_halb


# ── tagesdatei: Zwischenspeicher, Abbruch bei Netzfehler ──
class Antwort:
    def __init__(self, inhalt, status=200):
        self.inhalt, self.status = inhalt, status

    def read(self):
        return self.inhalt

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


aufrufe = []


def oeffnen(adresse, timeout=0):
    aufrufe.append(adresse)
    return Antwort(zip_mit([zeile(1, 100.0, 1.0, START + 5, False)]))


with tempfile.TemporaryDirectory() as td:
    p1 = M.tagesdatei("BTCUSDT", TAG, td, oeffnen)
    p2 = M.tagesdatei("BTCUSDT", TAG, td, oeffnen)
    pruefe("Tagesdatei: wird einmal geladen und dann aus dem Zwischenspeicher gelesen; die Adresse ist die öffentliche Datei von data.binance.vision",
           p1 == p2 and len(aufrufe) == 1 and aufrufe[0] == "https://data.binance.vision/data/spot/daily/aggTrades/BTCUSDT/BTCUSDT-aggTrades-2026-10-22.zip" and p1.exists(), aufrufe)

    def kaputt(adresse, timeout=0):
        raise OSError("Netz weg")
    try:
        M.tagesdatei("ETHUSDT", TAG, td, kaputt)
        pruefe("Tagesdatei: Netzfehler → DatenFehler", False)
    except M.DatenFehler as ex:
        pruefe("Tagesdatei: Netzfehler → DatenFehler (Abbruch), und es bleibt keine halbe Datei liegen",
               "Netz weg" in str(ex) and not list(Path(td).glob("ETHUSDT*")), str(ex))

    def schlecht(adresse, timeout=0):
        return Antwort(b"", status=404)
    try:
        M.tagesdatei("ETHUSDT", TAG, td, schlecht)
        pruefe("Tagesdatei: HTTP 404 → DatenFehler", False)
    except M.DatenFehler:
        pruefe("Tagesdatei: HTTP 404 → DatenFehler", True)

    def fehlerseite(adresse, timeout=0):
        return Antwort(b"<html>Access denied</html>")
    try:
        M.tagesdatei("ETHUSDT", TAG, td, fehlerseite)
        pruefe("Tagesdatei: eine Fehlerseite statt der zip-Datei → DatenFehler", False)
    except M.DatenFehler as ex:
        pruefe("Tagesdatei: eine Fehlerseite statt der zip-Datei → DatenFehler, und sie wird nie gespeichert (sonst bliebe sie im Zwischenspeicher)",
               "keine zip-Datei" in str(ex) and not list(Path(td).glob("ETHUSDT*")), str(ex))
    kaputte = Path(td) / "BTCUSDT-aggTrades-2026-10-23.zip"
    kaputte.write_bytes(b"das ist keine zip-Datei")
    try:
        M.sekundenraster(kaputte, date(2026, 10, 23))
        pruefe("Raster: eine beschädigte Datei im Zwischenspeicher → DatenFehler mit Hinweis", False)
    except M.DatenFehler as ex:
        pruefe("Raster: eine beschädigte Datei im Zwischenspeicher → DatenFehler mit Hinweis (kein Absturz mit Traceback)", "keine gültige zip-Datei" in str(ex), str(ex))

# ── lauf: der ganze Ablauf mit zwei künstlichen Tagen ──
alt = (M.N_TAGE, M.HAELFTE_TAGE, {m: dict(v) for m, v in M.MAERKTE.items()}, M.ERSTER_TAG)
try:
    M.N_TAGE, M.HAELFTE_TAGE = 2, 1
    for m in M.MAERKTE:
        M.MAERKTE[m]["min_handel"] = 1
    gemeldet = []

    def oeffnen2(adresse, timeout=0):
        tag = adresse.rsplit("-aggTrades-", 1)[1][:10]
        d0 = int(datetime.fromisoformat(tag).replace(tzinfo=timezone.utc).timestamp())
        zl = [zeile(i + 1, 100.0 + (i % 7) * 0.01, 1.0 + (i % 3), d0 + 4000 + i * 11, i % 2 == 0) for i in range(2000)]
        return Antwort(zip_mit(zl))
    with tempfile.TemporaryDirectory() as td:
        ausgabe = Path(td) / "unter" / "ergebnis.json"
        daten = M.lauf(oeffnen2, Path(td) / "roh", ausgabe, gemeldet.append)
        gespeichert = json.loads(ausgabe.read_text(encoding="utf-8"))
        pruefe("Lauf: schreibt die Ergebnisdatei mit Urteil, Kosten und allen 48 Zellen und meldet Fortschritt, Tabelle und Urteil",
               gespeichert["urteil"] in ("bestanden", "durchgefallen") and len(gespeichert["zellen"]) == 48 and gespeichert["kosten_bp"] == {"BTCUSDT": 12.0, "ETHUSDT": 13.0}
               and len(gespeichert["tage"]) == 2 and any("Urteil (vorab festgelegt)" in x for x in gemeldet) and any("BTCUSDT" in x and "…" in x for x in gemeldet), gespeichert["urteil"])
        pruefe("Lauf: jede Zelle trägt für beide Märkte und beide Hälften Kennzahlen und den Netto-Wert des Wunschfalls",
               all(set(z) == {"BTCUSDT", "ETHUSDT"} and all(set(z[m]) == {"h1", "h2"} and "netto_wunsch" in z[m]["h1"] for m in z) for z in gespeichert["zellen"].values()))

        def fehlt(*a, **k):
            raise M.DatenFehler("Tag fehlt")
        alt_lauf = M.lauf
        try:
            M.lauf = fehlt
            rc_fehler = M.main()
            M.lauf = lambda *a, **k: {}
            rc_gut = M.main()
        finally:
            M.lauf = alt_lauf
        pruefe("main: ein DatenFehler (fehlender Tag, Netz) beendet mit Rückgabewert 2, ein Lauf ohne Fehler mit 0", rc_fehler == 2 and rc_gut == 0, (rc_fehler, rc_gut))
finally:
    M.N_TAGE, M.HAELFTE_TAGE, M.ERSTER_TAG = alt[0], alt[1], alt[3]
    M.MAERKTE.clear()
    M.MAERKTE.update(alt[2])

print(f"\n{OK} bestanden, {len(FEHLER)} fehlgeschlagen")
sys.exit(1 if FEHLER else 0)
