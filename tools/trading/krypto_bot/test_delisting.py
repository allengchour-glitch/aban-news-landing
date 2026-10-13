#!/usr/bin/env python3
"""Tests für den Delisting-Prüfstand (delisting_kern.py, delisting_pruefung.auswerten), ohne Netz.
    python3 tools/trading/krypto_bot/test_delisting.py"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import delisting_kern as K  # noqa: E402
import delisting_pruefung as P  # noqa: E402

n_ok = n_f = 0


def pruefe(name, c, info=""):
    global n_ok, n_f
    c = bool(c)
    print(("✅ " if c else "❌ ") + name + ("" if c else f"   → {info}"))
    n_ok += c
    n_f += not c


M, H, T = K.MINUTE, K.STUNDE, K.TAG

# ── Ankündigungen lesen ──
art = [{"title": "Binance Will Delist BCD, CND, MTH, NCASH and YOYO on 2022-03-08", "releaseDate": 1646107140000},
       {"title": "Binance Will Delist HEGIC, RENBTC and SUSD on 2022-04-11", "releaseDate": 1649066280000},
       {"title": "Binance Margin And Loan Will Delist BTTC & POWR on 2026-08-14", "releaseDate": 1786000000000},
       {"title": "Binance Futures Will Delist USDⓈ-M AERGOUSDT Perpetual Contract (2026-07-24)", "releaseDate": 1784000000000},
       {"title": "Binance Will Delist UTK and Support Rebranding and Airdrop Plan on Binance Alpha", "releaseDate": 1776000000000},
       {"title": "Binance Alpha Will Remove SUP, CUDIS on 2026-05-26", "releaseDate": 1779000000000},
       {"title": "Binance Will Delist COS, D & HIGH on 2026-06-19", "releaseDate": 1780642800000},
       {"title": "Binance Will Delist COS, D & HIGH on 2026-06-19", "releaseDate": 1780642800000},
       {"title": "Binance Will Delist XYZ on 2026-01-01", "releaseDate": None},
       {"title": "Binance Will Delist ABC and QRS Perpetual Contracts on 2026-05-02", "releaseDate": 1777000000000}]
ev = K.ereignisse(art)
pruefe("Ankündigung: Komma, «and» und «&» trennen Coins", [e["coin"] for e in ev] == ["BCD", "CND", "MTH", "NCASH", "YOYO", "HEGIC",
                                                                                     "COS", "D", "HIGH"], [e["coin"] for e in ev])
pruefe("Ankündigung: Stablecoin (SUSD) und verpackter Coin (RENBTC) fallen weg", not {"SUSD", "RENBTC"} & {e["coin"] for e in ev})
pruefe("Ankündigung: Margin-, Futures-, Alpha- und Titel ohne Datum zählen nicht",
       not {"BTTC", "POWR", "AERGOUSDT", "UTK", "SUP", "XYZ", "ABC"} & {e["coin"] for e in ev})
pruefe("Ankündigung: doppelte Meldung zählt einmal", sum(1 for e in ev if e["coin"] == "COS") == 1)
pruefe("Ankündigung: Delisting-Tag und Zeit übernommen", ev[0]["delisting"] == "2022-03-08" and ev[0]["t0"] == 1646107140000)

# ── Kursreihe, Einstieg, Ausstieg ──
t0 = 1_700_000_000_000 - (1_700_000_000_000 % M) + 30_000  # Veröffentlichung 30 s nach einer vollen Minute
basis = t0 - 30_000
r = K.reihe([(basis + k * M, 100 - k * 0.01, 100 - (k + 1) * 0.01) for k in range(-60, 3000)] + [(basis, 1, 1), (basis, 100, 99.99)])
pruefe("Reihe: sortiert, doppelte Startzeit → die letzte zählt", r["t"] == sorted(r["t"]) and r["o"][60] == 100 and len(r["t"]) == 3060)
h = K.handel(r, t0 + 1 * M, H)
pruefe("Einstieg: erste Kerze, die frühestens d Minuten nach der Veröffentlichung BEGINNT (nicht die laufende)",
       h["t_ein"] == basis + 2 * M, h)
pruefe("Ausstieg: Schluss der letzten Kerze vor Einstieg + Dauer", h["t_aus"] == h["t_ein"] + H and abs(h["aus"] - (100 - 62 * 0.01)) < 1e-9, h)
pruefe("Kurs vor der Nachricht = Schluss der letzten GANZ abgeschlossenen Kerze", K.kurs_vor(r, t0) == r["c"][r["t"].index(basis - M)])
r_luecke = K.reihe([(basis + k * M, 10, 10) for k in range(0, 5)] + [(basis + k * M, 10, 10) for k in range(20, 40)])
pruefe("Einstieg: Lücke > 10 Minuten → kein Handel", K.handel(r_luecke, basis + 6 * M, H) is None)
pruefe("Einstieg: Lücke ≤ 10 Minuten → nächste Kerze", K.handel(r_luecke, basis + 11 * M, 5 * M)["t_ein"] == basis + 20 * M)
r_ende = K.reihe([(basis + k * M, 10, 9) for k in range(0, 120)])
he = K.handel(r_ende, basis, T)
pruefe("Handel endet früher (Delisting) → letzter Kurs zählt, als vorzeitig markiert", he["aus"] == 9 and he["vorzeitig"], he)
pruefe("Normales Ende ist nicht vorzeitig", not h["vorzeitig"])

# ── Short und Halter ──
hs = {"t_ein": 0, "ein": 100.0, "t_aus": 10 * H, "aus": 80.0}
pruefe("Short ohne Funding: +20 % Kursgewinn − Kosten", abs(K.short_netto(hs) - (0.20 - K.KOSTEN_SHORT)) < 1e-12)
pruefe("Halter: früh verkaufen spart 20 %", abs(K.ersparnis(hs) - 0.20) < 1e-12)
fr = K.funding_reihe([(8 * H, -0.01), (0, 0.5), (4 * H, -0.02), (10 * H, 0.001), (11 * H, 0.9)])
rf = K.reihe([(k * H, 100, 100 if k < 5 else 50) for k in range(0, 12)])
wert = K.short_netto(hs, fr, rf)
erwartet = 0.20 + (-0.02 * 100 / 100) + (-0.01 * 50 / 100) + (0.001 * 50 / 100) - K.KOSTEN_SHORT
pruefe("Short: Funding nur in (Einstieg, Ausstieg], mit dem Kurs zur Abrechnung gewichtet, negativ = Short zahlt",
       abs(wert - erwartet) < 1e-12, (wert, erwartet))
pruefe("Short: Verlust höchstens −100 % (Liquidation)", K.short_netto({"t_ein": 0, "ein": 1.0, "t_aus": H, "aus": 5.0}) == -1.0)

# ── Zufallszeitpunkte und Zufallsprobe ──
t_e = 400 * T
rh = K.reihe([(k * H, 10, 10) for k in range(0, 400 * 24)])
zt = K.zufallszeiten(random.Random(1), rh, t_e, 500)
pruefe("Zufall: nur 180 bis 7 Tage VOR der Ankündigung (kein Überlappen mit der Nachricht)",
       all(t_e - 180 * T <= t < t_e - 7 * T for t in zt) and len(set(zt)) > 100)
pruefe("Zufall: gleicher Startwert → gleiche Zeitpunkte", zt == K.zufallszeiten(random.Random(1), rh, t_e, 500))
rh_kurz = K.reihe([(t_e - 7 * T - k * H, 10, 10) for k in range(1, 29 * 24)])
pruefe("Zufall: weniger als 30 Tage Stundenkerzen im Fenster → Ereignis zählt nicht", K.zufallszeiten(random.Random(1), rh_kurz, t_e, 5) is None)
pruefe("Zufallsprobe: Anteil der Sätze mit kleinerem Mittel", K.zufallsprobe(0.05, [[0.0, 0.1, 0.02, 0.06], [0.0, 0.1, 0.04, 0.03]]) == 0.75)
pruefe("Zufallsprobe: ohne Zufallswerte → None", K.zufallsprobe(0.1, []) is None)
pruefe("Zufallsprobe: Gleichstand zählt nicht als geschlagen", K.zufallsprobe(0.05, [[0.05, 0.0]]) == 0.5)

# ── Bewertung ──
zeiten = [K.HAELFTE_GRENZE_MS - (20 - k) * T for k in range(20)] + [K.HAELFTE_GRENZE_MS + k * T for k in range(20)]
gut = [0.03 + 0.001 * (k % 5) for k in range(40)]
null = [[0.0] * 10 for _ in range(40)]
b = K.bewerten(gut, zeiten, null)
pruefe("Bewertung: klarer Vorteil in beiden Hälften + Zufallsprobe 100 % → bestanden", b["bestanden"], b["gruende"])
b2 = K.bewerten(gut[:20] + [-0.01] * 20, zeiten, null)
pruefe("Bewertung: Hälfte 2 im Minus → durchgefallen", not b2["bestanden"] and "Hälfte 2 nicht im Plus" in b2["gruende"])
b3 = K.bewerten(gut[:29], zeiten[:29], null[:29])
pruefe("Bewertung: weniger als 30 Ereignisse → durchgefallen", "nur 29 Ereignisse" in b3["gruende"])
b4 = K.bewerten(gut, zeiten, [[0.05] * 10 for _ in range(40)])
pruefe("Bewertung: Zufall genauso gut → durchgefallen (Erfolg steckt im Coin, nicht in der Nachricht)", "Zufallsprobe" in b4["gruende"])
b5 = K.bewerten(gut[:-1] + [-0.6], zeiten, null)
pruefe("Bewertung: ein Short schlechter als −50 % → durchgefallen", "Einzelfall schlechter als −50 %" in b5["gruende"])
pruefe("Bewertung: Mittel/Median je Hälfte", b["h1"]["n"] == 20 and b["h2"]["n"] == 20 and b["alle"]["anteil_plus"] == 1.0)
b6 = K.bewerten([0.02] * 20 + [-0.001, -0.001, 0.05] * 6 + [-0.001, -0.001], zeiten, null)
pruefe("Bewertung: Median im Minus trotz Mittel im Plus → durchgefallen", b6["h2"]["mittel"] > 0 and "Hälfte 2 nicht im Plus" in b6["gruende"])

# ── Gesamtrechnung mit künstlichen Kursen ──
def fall(t0, sturz_nach, rest_nach):
    """Minutenkerzen: vor t0 flach 10; danach Sturz um sturz_nach in den ersten 2 Minuten, dann linear weiter um rest_nach über 6 Tage."""
    k = []
    b0 = t0 - (t0 % M)
    for i in range(-30, 6 * 24 * 60 + 120):
        t = b0 + i * M
        if t < t0:
            p = 10.0
        else:
            p = 10.0 * (1 + sturz_nach) * (1 + rest_nach * min(1.0, (t - t0) / (6 * T)))
        k.append((t, p, p))
    return K.reihe(k)


evs, dat = [], []
for n in range(40):
    t0 = 1_650_000_000_000 + n * 40 * T + 123_456
    flach = K.reihe([(t0 - 181 * T + k * H, 10, 10) for k in range(181 * 24)])
    evs.append({"coin": f"C{n}", "t0": t0})
    dat.append({"s1m": fall(t0, -0.3, -0.2), "s1h": flach, "f1m": fall(t0, -0.3, -0.1), "f1h": flach,
                "fund": K.funding_reihe([(t0 + k * 8 * H, -0.0005) for k in range(1, 20)]), "perp": f"C{n}USDT"})
erg = P.auswerten(evs, dat)
v = erg["B_short"]["1min/6T"]
pruefe("Gesamt: weiterer Fall nach der Nachricht → Short 6 Tage netto im Plus, Zufallsprobe 100 %, bestanden",
       v["bestanden"] and v["zufall"] == 1.0, (v["gruende"], v["alle"]))
pruefe("Gesamt: Short rechnet mit dem Perpetual (Restfall 10 % − Kosten − bezahltes Funding), nicht mit Spot (20 %)",
       0.07 < v["alle"]["mittel"] < 0.095, v["alle"]["mittel"])
w = erg["schon_weg"]["1min"]["median"]
pruefe("Gesamt: «schon weg» = Sturz vor der Reaktion (−30 %)", abs(w - (-0.3)) < 0.01, w)
v1 = erg["B_short"]["1min/1h"]
pruefe("Gesamt: 1 Stunde nach dem Sturz bringt kaum etwas → nicht bestanden", not v1["bestanden"] and v1["alle"]["mittel"] < 0.005,
       v1["alle"])
pruefe("Gesamt: Halter-Ersparnis 6 Tage ≈ 20 % Restfall", abs(erg["A_halter"]["1min/6T"]["alle"]["median"] - 0.2) < 0.01)
dat_ohne = [dict(d, f1m=None, f1h=None, perp=None) for d in dat]
pruefe("Gesamt: ohne Perpetual kein Short (Ereignis zählt nicht)", P.auswerten(evs, dat_ohne)["B_short"]["1min/6T"]["alle"]["n"] == 0)

print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen")
sys.exit(1 if n_f else 0)
