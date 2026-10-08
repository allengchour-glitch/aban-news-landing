#!/usr/bin/env python3
"""Prüfstand «alle Infos»: Hilft eine freie Markt-Info dem Krypto-Pilot — oder sieht es nur so aus?

VORAB FESTGELEGT (vor dem ersten Rechenlauf, nicht nachträglich angepasst):

Jede Info ist ein Filter auf die Pilot-Position (BTC Trend 150, ETH Trend 200, Schwankungsziel 40 %, Stop 4σ):
  Bremse für Long  (Long-Position × 0,5, wenn die Bedingung gilt):
    gier          Angst-&-Gier-Index ≥ 80 (extreme Gier)
    funding_hoch  Funding im 7-Tage-Schnitt ≥ 0,05 % je 8 h (Long-Seite überfüllt)
    mvrv_hoch     MVRV ≥ 3,5 (Kurs weit über dem Einstandswert aller Coins)
    vix           VIX > 30 (Angst an der Börse)
    dollar        Dollar-Index über seinem 200-Tage-Schnitt
    zins          US-Zins 10 Jahre über seinem 200-Tage-Schnitt
    bilanz        Bilanz der US-Notenbank kleiner als vor 13 Wochen (Geld wird knapper)
    stablecoins   Stablecoin-Menge kleiner als vor 30 Tagen (Geld fliesst aus Krypto ab)
  Bremse für Short (Short-Position → 0, wenn die Bedingung gilt):
    angst            Angst-&-Gier-Index ≤ 20 (extreme Angst, Ausverkauf meist durch)
    funding_negativ  Funding im 7-Tage-Schnitt < 0 (Short-Seite überfüllt)
    mvrv_tief        MVRV < 1 (Kurs unter dem Einstandswert)
    hash_kapitulation  Bitcoin-Hashrate 30-Tage-Schnitt unter 60-Tage-Schnitt (Miner verkaufen; nur Bitcoin)
  alle  Abstimmung: Long × 0,5 bei ≥ 3 Long-Bremsen gleichzeitig, Short → 0 bei ≥ 2 Short-Bremsen

Keine Zukunftsdaten: Jede Info zählt erst einen Tag nach ihrem Datum (Notenbank-Bilanz: zwei Tage), die Entscheidung von
Tag i gilt ab Tag i+1 (wie im Pilot).

Übernommen wird eine Info NUR, wenn BEIDES gilt:
  1) Rendite ÷ schlimmster Einbruch ist in JEDEM Feld besser: Bitcoin und Ethereum × zwei getrennte Abschnitte
     (02/2018–2021, 2022–heute). Gleich gut zählt nicht.
  2) Zufallsprobe: Die echte Info schlägt mindestens 90 % von 200 zeitversetzten Kopien derselben Info (gleich viele
     Bremstage, falsches Timing) — gemessen am 50/50-Konto ab 02/2018. Sonst ist der «Vorteil» nur weniger Risiko,
     das jede beliebige Bremse auch gebracht hätte.
Achtung Mehrfachtest: 13 Kandidaten — bei 90 % Schwelle besteht rein zufällig etwa einer die Zufallsprobe. Darum braucht
es zusätzlich Regel 1.

Aufruf: python3 tools/trading/krypto_bot/info_pruefung.py   → Tabelle + data/krypto-info-pruefung.json
"""
from __future__ import annotations

import json
import random
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import infos as I  # noqa: E402
import pilot_kern as K  # noqa: E402
import pilot_pruefung as P  # noqa: E402

ROOT = HIER.parents[2]
AUSGABE = ROOT / "data" / "krypto-info-pruefung.json"
ABSCHNITTE = [("2018-02-01", "2022-01-01"), ("2022-01-01", "9999")]
KOPIEN, SKILL_MIN = 200, 0.90
LONG_BREMSEN = ["gier", "funding_hoch", "mvrv_hoch", "vix", "dollar", "zins", "bilanz", "stablecoins"]
SHORT_BREMSEN = ["angst", "funding_negativ", "mvrv_tief", "hash_kapitulation"]
SCHWELLEN = {"gier": 80, "angst": 20, "funding_hoch": 0.0005, "funding_negativ": 0.0, "mvrv_hoch": 3.5, "mvrv_tief": 1.0, "vix": 30}


def schnitt(x, n):
    """Gleitender Schnitt über n Tage; None, solange Werte fehlen."""
    o, s, k = [None] * len(x), 0.0, 0
    for i, v in enumerate(x):
        if v is None:
            s, k = 0.0, 0
            continue
        s += v
        k += 1
        if k > n:
            s -= x[i - n]
            k = n
        if k == n:
            o[i] = s / n
    return o


def aenderung(x, n):
    return [None if i < n or x[i] is None or not x[i - n] else x[i] / x[i - n] - 1 for i in range(len(x))]


def flaggen(coin, tage, schwellen=None):
    """Bedingungen je Tag (True/False/None = keine Daten) für einen Coin."""
    sw = {**SCHWELLEN, **(schwellen or {})}
    def r(name, verzug=1):
        return I.auf_tage(I.reihe(name), tage, verzug)

    fg, f7 = r("angst_gier"), schnitt(r(f"funding_{coin}"), 7)
    mvrv, vix = r(f"mvrv_{coin}"), r("vix")
    dol, zins = r("dollar"), r("zins10")
    dol200, zins200 = schnitt(dol, 200), schnitt(zins, 200)
    bil, stab = aenderung(r("bilanz", 2), 91), aenderung(r("stablecoins"), 30)
    hr = r("hashrate")
    hr30, hr60 = schnitt(hr, 30), schnitt(hr, 60)

    def f(bed, *werte):
        return [None if any(w[i] is None for w in werte) else bed(i) for i in range(len(tage))]

    out = {
        "gier": f(lambda i: fg[i] >= sw["gier"], fg), "angst": f(lambda i: fg[i] <= sw["angst"], fg),
        "funding_hoch": f(lambda i: f7[i] >= sw["funding_hoch"], f7), "funding_negativ": f(lambda i: f7[i] < sw["funding_negativ"], f7),
        "mvrv_hoch": f(lambda i: mvrv[i] >= sw["mvrv_hoch"], mvrv), "mvrv_tief": f(lambda i: mvrv[i] < sw["mvrv_tief"], mvrv),
        "vix": f(lambda i: vix[i] > sw["vix"], vix), "dollar": f(lambda i: dol[i] > dol200[i], dol, dol200),
        "zins": f(lambda i: zins[i] > zins200[i], zins, zins200), "bilanz": f(lambda i: bil[i] < 0, bil),
        "stablecoins": f(lambda i: stab[i] < 0, stab),
        "hash_kapitulation": f(lambda i: hr30[i] < hr60[i], hr30, hr60) if coin == "btc" else [None] * len(tage),
    }
    return out


def filter_z(z, lang, kurz):
    """Long × 0,5 bei Long-Bremse, Short → 0 bei Short-Bremse."""
    return [x * 0.5 if x > 0 and lang[i] else 0.0 if x < 0 and kurz[i] else x for i, x in enumerate(z)]


def bremsen(name, fl):
    n = len(next(iter(fl.values())))
    nie = [False] * n
    if name == "alle":
        lang = [sum(1 for b in LONG_BREMSEN if fl[b][i]) >= 3 for i in range(n)]
        kurz = [sum(1 for b in SHORT_BREMSEN if fl[b][i]) >= 2 for i in range(n)]
        return lang, kurz
    werte = [bool(x) for x in fl[name]]
    return (werte, nie) if name in LONG_BREMSEN else (nie, werte)


def verschoben(x, a, k):
    """Ab Index a im Kreis um k Tage verschoben (gleich viele Bremstage, falsches Timing)."""
    teil = x[a:]
    k %= len(teil)
    return x[:a] + teil[-k:] + teil[:-k] if k else list(x)


def main():
    btc, eth = P.ohlc("BTC-USD"), P.ohlc("ETH-USD")
    tage, ((hb, lb, cb), (he, le, ce)) = P.ausrichten([btc, eth])
    maerkte = {"btc": (hb, lb, cb, K.roh_hebel(cb, n_sma=150)), "eth": (he, le, ce, K.roh_hebel(ce, n_sma=200))}
    fl = {coin: flaggen(coin, tage) for coin in maerkte}
    start = next(i for i, t in enumerate(tage) if t >= ABSCHNITTE[0][0])
    fenster = []
    for von, bis in ABSCHNITTE:
        a = next(i for i, t in enumerate(tage) if t >= von)
        b = next((i for i, t in enumerate(tage) if t >= bis), len(tage))
        fenster.append((f"{von[:4]}–{'heute' if bis == '9999' else str(int(bis[:4]) - 1)}", a, b))

    def konto(zs, a, b):
        return {coin: P.lauf(zs[coin], *maerkte[coin][:3], a, b, K.STOP_SIGMA)[0] for coin in zs}

    def mar_mix(zs):
        w = konto(zs, start, len(tage))
        return P.kennz([0.5 * x + 0.5 * y for x, y in zip(w["btc"], w["eth"])])

    basis = {coin: m[3] for coin, m in maerkte.items()}
    erg = {"stand": tage[-1], "regel": __doc__.split("Übernommen")[1].split("Aufruf")[0].strip(), "basis": {}, "infos": {}}
    for name, a, b in fenster:
        for coin, w in konto(basis, a, b).items():
            erg["basis"][f"{coin} {name}"] = P.kennz(w)
    basis_mix = mar_mix(basis)
    erg["basis"]["50/50 ab 02/2018"] = basis_mix
    print(f"Basis (Pilot ohne Infos), 50/50 ab 02/2018: {basis_mix['cagr'] * 100:.1f} %/J, Einbruch {basis_mix['einbruch'] * 100:.0f} %, "
          f"MAR {basis_mix['mar']:.2f}\n")
    print(f"{'Info':18}{'Bremstage':>10}" + "".join(f"{c.upper() + ' ' + n:>17}" for n, _, _ in fenster for c in maerkte)
          + f"{'50/50 MAR':>11}{'Zufall':>8}  Urteil")
    rnd = random.Random(7)
    for name in LONG_BREMSEN + SHORT_BREMSEN + ["alle"]:
        br = {coin: bremsen(name, fl[coin]) for coin in maerkte}
        zs = {coin: filter_z(basis[coin], *br[coin]) for coin in maerkte}
        aktiv = {coin: any(x != y for x, y in zip(zs[coin][start:], basis[coin][start:])) for coin in maerkte}
        felder, alle_besser = {}, True
        for fname, a, b in fenster:
            w = konto({c: zs[c] for c in maerkte if aktiv[c]}, a, b)
            for coin in maerkte:
                if not aktiv[coin]:
                    continue
                k, kb = P.kennz(w[coin]), erg["basis"][f"{coin} {fname}"]
                felder[f"{coin} {fname}"] = {**k, "besser": k["mar"] > kb["mar"] + 0.005}
                alle_besser = alle_besser and felder[f"{coin} {fname}"]["besser"]
        mix = mar_mix(zs)
        n = len(tage) - start
        besser = 0
        for _ in range(KOPIEN):
            k = rnd.randrange(60, n - 60)
            zk = {coin: filter_z(basis[coin], verschoben(br[coin][0], start, k), verschoben(br[coin][1], start, k)) for coin in maerkte}
            besser += mix["mar"] > mar_mix(zk)["mar"]
        skill = besser / KOPIEN
        tage_aktiv = sum(1 for c in maerkte for i in range(start, len(tage)) if zs[c][i] != basis[c][i])
        urteil = "ÜBERNEHMEN" if alle_besser and skill >= SKILL_MIN and any(aktiv.values()) else "nein"
        erg["infos"][name] = {"felder": felder, "mix": mix, "zufall": skill, "bremstage": tage_aktiv, "urteil": urteil}
        zeile = f"{name:18}{tage_aktiv:>10}"
        for fname, _, _ in fenster:
            for coin in maerkte:
                x = felder.get(f"{coin} {fname}")
                zeile += f"{'—':>17}" if not x else f"{x['mar']:>8.2f} vs {erg['basis'][f'{coin} {fname}']['mar']:4.2f}{'+' if x['besser'] else ' '}"
        print(zeile + f"{mix['mar']:>11.2f}{skill * 100:>7.0f}%  {urteil}")
    # Empfindlichkeit der übernommenen Infos: Schwelle ±10/20 %. Nur zur Information — ändert das Urteil nicht.
    for name in [n for n, x in erg["infos"].items() if x["urteil"] == "ÜBERNEHMEN" and n in SCHWELLEN]:
        print(f"\nEmpfindlichkeit {name} (Schwelle {SCHWELLEN[name]}):")
        erg["infos"][name]["empfindlichkeit"] = {}
        for faktor in (0.8, 0.9, 1.0, 1.1, 1.2):
            sw = {name: SCHWELLEN[name] * faktor}
            fl2 = {coin: flaggen(coin, tage, sw) for coin in maerkte}
            zs = {coin: filter_z(basis[coin], *bremsen(name, fl2[coin])) for coin in maerkte}
            n_besser = 0
            for fname, a, b in fenster:
                w = konto(zs, a, b)
                n_besser += sum(P.kennz(w[c])["mar"] > erg["basis"][f"{c} {fname}"]["mar"] + 0.005 for c in maerkte)
            m = mar_mix(zs)
            erg["infos"][name]["empfindlichkeit"][str(round(sw[name], 4))] = {"mix_mar": m["mar"], "felder_besser": n_besser}
            print(f"  Schwelle {sw[name]:.3g}: 50/50 MAR {m['mar']:.2f} (ohne Info {basis_mix['mar']:.2f}), besser in {n_besser} von 4 Feldern")
    AUSGABE.write_text(json.dumps(erg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("\nMAR = Jahresrendite ÷ schlimmster Einbruch (höher ist besser). «+» = besser als ohne Info.")


if __name__ == "__main__":
    main()
