#!/usr/bin/env python3
"""Prüfstand «Marktdruck» (Kauf-/Verkaufsdruck wie das Market-Pressure-Widget der ATAS-Plattform) — bringt das nach Kosten etwas?

VORAB FESTGELEGT am 05.11.2026, bevor gerechnet wurde (der Git-Verlauf belegt die Reihenfolge).

Anlass: Der Besitzer schickte am 05.11.2026 ein TikTok-Video (@nicholassalasn3017185, 7 Follower, 24 Aufrufe, am selben Tag hochgeladen) über das
«Market Pressure»-Widget der ATAS-Plattform («ideal für Scalper»). Was ATAS selbst schreibt (QUELLE help.atas.net, Seite «Market Pressure», Stand 25.08.):
  Market Pressure(t) = Σ Gewicht × e^(−Δt / Halbwertszeit), getrennt für aggressive Käufer und aggressive Verkäufer;
  Modus VP = Gewicht ist die Handelsmenge, Modus POT («Pace of Tape») = jeder Handel zählt 1;
  Zeitempfindlichkeit Short 10 s, Medium 30 s, Long 60 s Halbwertszeit; eine einstellbare Schwelle (Standard 50 %).
Das Widget ist eine ANZEIGE. ATAS nennt keine Handelsregel und kein Ergebnis. Hier wird gemessen, ob ein so berechneter Druck eine Kursbewegung voraussagt,
die grösser ist als die Kosten.

Frage (vorab): Sagt ein solcher Druck in den nächsten 30 bis 120 Sekunden eine Bewegung voraus, die Gebühren und Schlupf übersteigt?

Daten: Binance Spot aggTrades (öffentliche Tagesdateien von data.binance.vision), BTCUSDT und ETHUSDT, 14 volle UTC-Tage 22.10.2026 bis 04.11.2026.
  Hälfte 1 = 22.10. bis 28.10., Hälfte 2 = 29.10. bis 04.11. Käufer-Seite = aggressiver Kauf (is_buyer_maker == False), Verkäufer-Seite = aggressiver Verkauf.
  Sekundenraster: je Sekunde Menge und Anzahl der Käufer- und Verkäuferhandel und der letzte Kurs (ohne Handel: der letzte bekannte Kurs).
  Fehlt eine Tagesdatei oder hat ein Tag auffällig wenig Handel (BTC unter 200 000, ETH unter 100 000), bricht die Prüfung ab: nichts wird schöngerechnet.

Druck (je Seite, je Sekunde s; d = 0,5^(1/HZ)):  X(s) = X(s−1) × d + Gewicht(s), Gewicht = Menge (VP) oder Anzahl (POT).
  R(s) = K(s) / (K(s) + V(s))  (K = Käuferdruck, V = Verkäuferdruck; ohne Druck R = 0,5).
  Aktivität A(s) = K(s) + V(s); E(s) = E(s−1) × (1 − 1/3600) + A(s) / 3600. Ein Signal zählt nur, wenn A(s) ≥ 1,5 × E(s−1) (dünner Handel ist kein Signal)
  und erst nach der ersten Stunde der Daten (Einschwingzeit).
Signal (ein «Ereignis»): u(s) = +1, wenn R(s) ≥ S und aktiv; u(s) = −1, wenn R(s) ≤ 1 − S und aktiv; sonst 0. Ereignis in s, wenn u(s) ≠ 0 und u(s−1) = 0
  (eine neue Druckphase beginnt; solange der Druck anhält, gibt es kein zweites Ereignis).
Handel: Einstieg zum letzten Kurs der Sekunde s + 2 (2 Sekunden Verzug), Ausstieg H Sekunden später. Höchstens eine offene Position je Markt; ein Ereignis
  während einer offenen Position wird übersprungen. Richtung «mit» = Kauf bei u = +1, Verkauf bei u = −1; «gegen» = umgekehrt.
  Brutto (bp) = Richtung × (Kurs_aus / Kurs_ein − 1) × 10 000. Netto = Brutto − Kosten.
Kosten je Hin- und Rückweg, aus den Einstellungen des Scalping-Labors (scalping_labor.py): Marktaufträge auf beiden Seiten = 2 × (5 bp Gebühr + Schlupf), Schlupf je Seite
  BTC 1 bp, ETH 1,5 bp → 12,0 bp (BTC) und 13,0 bp (ETH). ENTSCHEIDEND ist dieser Fall. Nur zur Einordnung (nicht für das Urteil) wird der Wunschfall gemeldet:
  zwei passive Aufträge (2 × 2 bp Gebühr, kein Schlupf, jede Ausführung gelingt) = 4,0 bp.

Raster (alles wird berichtet, nichts herausgepickt): Modus {VP, POT} × Halbwertszeit {10, 30, 60 s} × Schwelle S {0,75, 0,90} × Haltedauer H {30, 120 s}
  × Richtung {mit, gegen} = 48 Zellen; je Zelle zwei Märkte × zwei Hälften = 192 Messungen. Je Messung: Trades, mittleres Brutto, mittleres Netto, t-Wert des Brutto.

Urteil (vorab):
  BESTANDEN nur, wenn mindestens EINE Zelle in BEIDEN Märkten und BEIDEN Hälften je mindestens 200 Trades hat und ein mittleres Netto von mindestens +1 bp je Trade zeigt.
  Sonst DURCHGEFALLEN. Zusätzlich, nur zur Einordnung: «Signal vorhanden, aber unter den Kosten», wenn eine Zelle in allen vier Teilen mindestens 200 Trades,
  ein mittleres Brutto über 0 und einen t-Wert von mindestens 3 hat. Das wäre eine Beobachtung, kein Handelsgrund.
Grenzen (vorab): 14 Tage sind eine Beobachtung, kein Beweis. Spot-Handel (nicht das Orderbuch der Perpetuals), nur ausgeführte Handel (keine Orderbuchtiefe, kein Spread),
  Zerfall im Sekundenraster (eine Näherung des Zerfalls im Takt der einzelnen Handel), 2 Sekunden Verzug angenommen. Eine Anzeige, die ein Mensch liest, ist keine Regel:
  ein Ergebnis hier sagt nichts über Händler, die Druck mit Tiefe, Erfahrung und Kontext deuten.
Aufruf: python3 tools/trading/krypto_bot/marktdruck_pruefung.py   → Tabelle + data/krypto-marktdruck-pruefung.json (lädt ca. 300 MB öffentliche Tagesdateien nach data/marktdruck-roh/)
"""
from __future__ import annotations

import io
import json
import math
import os
import sys
import urllib.request
import zipfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[2]
DATA = ROOT / "data"
ROH = DATA / "marktdruck-roh"
AUSGABE = DATA / "krypto-marktdruck-pruefung.json"
BASIS = "https://data.binance.vision/data/spot/daily/aggTrades"

# ───────── die vorab festgelegten Einstellungen (siehe oben) — nichts davon wird nach dem Ansehen der Ergebnisse angepasst ─────────
MAERKTE = {"BTCUSDT": {"slip_bp": 1.0, "min_handel": 200_000}, "ETHUSDT": {"slip_bp": 1.5, "min_handel": 100_000}}
ERSTER_TAG, N_TAGE, HAELFTE_TAGE = date(2026, 10, 22), 14, 7
MODI, HZ, SCHWELLEN, HALTEN, RICHTUNGEN = ("VP", "POT"), (10, 30, 60), (0.75, 0.90), (30, 120), ("mit", "gegen")
VERZUG, EINSCHWING, AKTIV_FAKTOR, EMA_N = 2, 3600, 1.5, 3600
GEBUEHR_TAKER_BP, KOSTEN_WUNSCH_BP = 5.0, 4.0
MIN_TRADES, MIN_NETTO_BP, MIN_T = 200, 1.0, 3.0
TAG_S = 86_400


class DatenFehler(Exception):
    """Fehlende oder auffällige Daten: die Prüfung bricht ab, nichts wird schöngerechnet."""


def kosten_bp(markt):
    """Hin- und Rückweg mit Marktaufträgen, aus den Einstellungen des Scalping-Labors: 2 × (Gebühr + Schlupf)."""
    return 2.0 * (GEBUEHR_TAKER_BP + MAERKTE[markt]["slip_bp"])


def tage():
    return [ERSTER_TAG + timedelta(days=i) for i in range(N_TAGE)]


# ───────── Daten ─────────
def tagesdatei(symbol, tag, ordner=ROH, oeffnen=urllib.request.urlopen):
    """Die öffentliche Tagesdatei (zip) von data.binance.vision; wird nur einmal geladen (über .tmp, nie halb)."""
    ziel = Path(ordner) / f"{symbol}-aggTrades-{tag.isoformat()}.zip"
    if ziel.exists() and ziel.stat().st_size > 0:
        return ziel
    ziel.parent.mkdir(parents=True, exist_ok=True)
    adresse = f"{BASIS}/{symbol}/{ziel.name}"
    try:
        with oeffnen(adresse, timeout=120) as r:
            if getattr(r, "status", 200) != 200:
                raise DatenFehler(f"{adresse}: HTTP {r.status}")
            roh = r.read()
    except OSError as ex:
        raise DatenFehler(f"{adresse}: {type(ex).__name__} {ex}") from None
    if not zipfile.is_zipfile(io.BytesIO(roh)):  # z. B. eine Fehlerseite statt der Datei: nie speichern
        raise DatenFehler(f"{adresse}: die Antwort ist keine zip-Datei")
    tmp = ziel.with_suffix(".tmp")
    tmp.write_bytes(roh)
    os.replace(tmp, ziel)
    return ziel


def sekundenraster(zip_pfad, tag):
    """Eine Tagesdatei → je Sekunde des UTC-Tages: Käufermenge, Verkäufermenge, Käuferzahl, Verkäuferzahl, letzter Kurs (None ohne Handel).
    Käufer-Seite = aggressiver Kauf (is_buyer_maker == False). Die Zeit steht seit 2025 in Mikrosekunden, früher in Millisekunden (nach der Grösse erkannt)."""
    kv, vv = [0.0] * TAG_S, [0.0] * TAG_S
    kn, vn = [0] * TAG_S, [0] * TAG_S
    p = [None] * TAG_S
    start = int(datetime(tag.year, tag.month, tag.day, tzinfo=timezone.utc).timestamp())
    n = 0
    try:
        z = zipfile.ZipFile(zip_pfad)
    except zipfile.BadZipFile:
        raise DatenFehler(f"{zip_pfad}: keine gültige zip-Datei (löschen und neu laden)") from None
    with z:
        namen = [x for x in z.namelist() if x.lower().endswith(".csv")]
        if len(namen) != 1:
            raise DatenFehler(f"{zip_pfad}: erwartet genau eine CSV, gefunden {namen}")
        with z.open(namen[0]) as f:
            for zeile in io.TextIOWrapper(f, encoding="utf-8"):
                t = zeile.split(",")
                if len(t) < 7:
                    continue
                try:
                    kurs, menge, zeit = float(t[1]), float(t[2]), int(t[5])
                except ValueError:
                    continue
                s = (zeit // 1_000_000 if zeit > 10 ** 14 else zeit // 1000) - start
                if not 0 <= s < TAG_S:
                    continue
                n += 1
                p[s] = kurs
                if t[6].strip().lower() == "true":  # Käufer ist der Maker → der Verkäufer hat aggressiv verkauft
                    vv[s] += menge
                    vn[s] += 1
                else:
                    kv[s] += menge
                    kn[s] += 1
    return {"kv": kv, "vv": vv, "kn": kn, "vn": vn, "p": p, "n": n}


def zusammensetzen(tagesraster, markt):
    """Die Tage hintereinander; Sekunden ohne Handel tragen den letzten Kurs weiter. Bricht bei auffällig wenig Handel ab."""
    gk = {"VP": [], "POT": []}
    gv = {"VP": [], "POT": []}
    kurs = []
    letzter = None
    for tag, r in tagesraster:
        if r["n"] < MAERKTE[markt]["min_handel"]:
            raise DatenFehler(f"{markt} {tag}: nur {r['n']} Handel (Grenze {MAERKTE[markt]['min_handel']}) — Tag unvollständig?")
        gk["VP"] += r["kv"]
        gv["VP"] += r["vv"]
        gk["POT"] += [float(x) for x in r["kn"]]
        gv["POT"] += [float(x) for x in r["vn"]]
        for x in r["p"]:
            if x is not None:
                letzter = x
            kurs.append(letzter)
    erster = next((x for x in kurs if x is not None), None)
    if erster is None:
        raise DatenFehler(f"{markt}: gar kein Kurs")
    kurs = [erster if x is None else x for x in kurs]
    return gk, gv, kurs


# ───────── Druck und Signal ─────────
def ereignisse(gk, gv, hz, schwellen=SCHWELLEN):
    """Käufer- und Verkäuferdruck mit Zerfall (Halbwertszeit hz Sekunden), Aktivitätsfilter, Einschwingzeit; → {Schwelle: [(Sekunde, +1/−1), …]}.
    Ereignis = eine neue Druckphase beginnt (Zustand ging von 0 auf ±1)."""
    d = 0.5 ** (1.0 / hz)
    a_ema = 1.0 - 1.0 / EMA_N
    k = v = e = 0.0
    prev = [0] * len(schwellen)
    ev = [[] for _ in schwellen]
    unten = [1.0 - s for s in schwellen]
    for s in range(len(gk)):
        k = k * d + gk[s]
        v = v * d + gv[s]
        a = k + v
        aktiv = s >= EINSCHWING and a >= AKTIV_FAKTOR * e  # e ist hier noch E(s−1): nur Vergangenes
        e = e * a_ema + a / EMA_N
        if not aktiv:
            for i in range(len(schwellen)):
                prev[i] = 0
            continue
        r = k / a if a > 0 else 0.5
        for i, sw in enumerate(schwellen):
            u = 1 if r >= sw else (-1 if r <= unten[i] else 0)
            if u != 0 and prev[i] == 0:
                ev[i].append((s, u))
            prev[i] = u
    return {sw: ev[i] for i, sw in enumerate(schwellen)}


def handel(kurs, ereignis_liste, halten, richtung):
    """Ein Markt, eine Zelle: Einstieg in Sekunde s + VERZUG, Ausstieg halten Sekunden später, höchstens eine offene Position.
    → [(Sekunde des Ereignisses, Brutto in bp), …]."""
    vorzeichen = 1 if richtung == "mit" else -1
    frei, n, aus = -1, len(kurs), []
    for s, u in ereignis_liste:
        if s < frei:
            continue
        ein_s = s + VERZUG
        aus_s = ein_s + halten
        if aus_s >= n:
            break
        a, b = kurs[ein_s], kurs[aus_s]
        aus.append((s, vorzeichen * u * (b / a - 1.0) * 10_000.0))
        frei = aus_s
    return aus


def kennzahlen(brutto, kosten):
    """Trades, mittleres Brutto, mittleres Netto, t-Wert des Brutto (Mittel ÷ Standardfehler)."""
    n = len(brutto)
    if n == 0:
        return {"n": 0, "brutto": None, "netto": None, "t": None}
    m = sum(brutto) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in brutto) / (n - 1)) if n > 1 else 0.0
    return {"n": n, "brutto": m, "netto": m - kosten, "t": (m / (sd / math.sqrt(n))) if sd > 0 else None}


def zelle_name(modus, hz, schwelle, halten, richtung):
    return f"{modus}-HZ{hz}-S{int(round(schwelle * 100))}-H{halten}-{richtung}"


def pruefen(serien):
    """serien = {Markt: (gk, gv, kurs)} (gk/gv je Modus) → {Zelle: {Markt: {h1, h2}}} mit Kennzahlen und Netto im Wunschfall."""
    ergebnis = {}
    grenze = HAELFTE_TAGE * TAG_S
    for markt, (gk, gv, kurs) in serien.items():
        kosten = kosten_bp(markt)
        for modus in MODI:
            for hz in HZ:
                ev = ereignisse(gk[modus], gv[modus], hz)
                for schwelle in SCHWELLEN:
                    for halten in HALTEN:
                        for richtung in RICHTUNGEN:
                            trades = handel(kurs, ev[schwelle], halten, richtung)
                            z = ergebnis.setdefault(zelle_name(modus, hz, schwelle, halten, richtung), {}).setdefault(markt, {})
                            for name, teil in (("h1", [b for s, b in trades if s < grenze]), ("h2", [b for s, b in trades if s >= grenze])):
                                kz = kennzahlen(teil, kosten)
                                kz["netto_wunsch"] = None if kz["brutto"] is None else kz["brutto"] - KOSTEN_WUNSCH_BP
                                z[name] = kz
    return ergebnis


def urteil(ergebnis):
    """Das vorab festgelegte Urteil. → {urteil, bestanden_zellen, signal_zellen}."""
    bestanden, signal = [], []
    for zelle, maerkte in ergebnis.items():
        teile = [maerkte[m][h] for m in MAERKTE if m in maerkte for h in ("h1", "h2")]
        if len(teile) != 2 * len(MAERKTE):
            continue
        if all(t["n"] >= MIN_TRADES and t["netto"] is not None and t["netto"] >= MIN_NETTO_BP for t in teile):
            bestanden.append(zelle)
        if all(t["n"] >= MIN_TRADES and t["brutto"] is not None and t["brutto"] > 0 and t["t"] is not None and t["t"] >= MIN_T for t in teile):
            signal.append(zelle)
    return {"urteil": "bestanden" if bestanden else "durchgefallen", "bestanden_zellen": bestanden, "signal_zellen": signal}


# ───────── Ausgabe ─────────
def schlechtester_teil(maerkte, feld="netto"):
    werte = [t[feld] for m in maerkte.values() for t in m.values() if t[feld] is not None and t["n"] >= MIN_TRADES]
    return min(werte) if len(werte) == 4 else None


def tabelle(ergebnis, wie_viele=8):
    z = ["Marktdruck-Prüfstand (Papier): 14 Tage aggTrades BTC und ETH, 48 Zellen, Kosten aus dem Scalping-Labor (Marktaufträge beidseitig)"]
    z.append(f"{'Zelle':26s} | {'BTC H1':>20s} | {'BTC H2':>20s} | {'ETH H1':>20s} | {'ETH H2':>20s}   (Trades, Brutto bp, Netto bp)")
    reihe = sorted(ergebnis.items(), key=lambda kv: -(schlechtester_teil(kv[1]) if schlechtester_teil(kv[1]) is not None else -1e9))
    for name, m in reihe[:wie_viele]:
        zellen = []
        for markt in MAERKTE:
            for h in ("h1", "h2"):
                t = m[markt][h]
                zellen.append(f"{t['n']:6d} {t['brutto']:+6.2f} {t['netto']:+7.2f}" if t["brutto"] is not None else f"{0:6d} {'—':>6s} {'—':>7s}")
        z.append(f"{name:26s} | " + " | ".join(f"{c:>20s}" for c in zellen))
    alle = [t for m in ergebnis.values() for mm in m.values() for t in mm.values() if t["n"] >= MIN_TRADES]
    if alle:
        n_pos = sum(1 for t in alle if t["netto"] > 0)
        n_brutto = sum(1 for t in alle if t["brutto"] > 0)
        z.append(f"Von {len(alle)} Messungen mit mindestens {MIN_TRADES} Trades: Netto über 0 in {n_pos}, Brutto über 0 in {n_brutto}; "
                 f"bestes Brutto {max(t['brutto'] for t in alle):+.2f} bp, mittleres Brutto {sum(t['brutto'] for t in alle) / len(alle):+.2f} bp, "
                 f"mittleres Netto {sum(t['netto'] for t in alle) / len(alle):+.2f} bp.")
    return "\n".join(z)


def lauf(oeffnen=urllib.request.urlopen, ordner=ROH, ausgabe=AUSGABE, melden=print):
    serien = {}
    for markt in MAERKTE:
        raster = []
        for tag in tage():
            melden(f"{markt} {tag} …")
            raster.append((tag, sekundenraster(tagesdatei(markt, tag, ordner, oeffnen), tag)))
        gk, gv, kurs = zusammensetzen(raster, markt)
        serien[markt] = (gk, gv, kurs)
    ergebnis = pruefen(serien)
    u = urteil(ergebnis)
    daten = {"stand": datetime.now(timezone.utc).isoformat(timespec="seconds"), "tage": [t.isoformat() for t in tage()], "kosten_bp": {m: kosten_bp(m) for m in MAERKTE},
             "kosten_wunsch_bp": KOSTEN_WUNSCH_BP, **u, "zellen": ergebnis}
    Path(ausgabe).parent.mkdir(parents=True, exist_ok=True)
    Path(ausgabe).write_text(json.dumps(daten, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    melden(tabelle(ergebnis))
    melden(f"Urteil (vorab festgelegt): {u['urteil'].upper()} — Zellen mit Netto ≥ +{MIN_NETTO_BP:g} bp in beiden Märkten und Hälften: {len(u['bestanden_zellen'])}; "
           f"Zellen mit Brutto über 0 und t ≥ {MIN_T:g} in allen vier Teilen («Signal vorhanden, aber unter den Kosten»): {len(u['signal_zellen'])}.")
    return daten


def main() -> int:
    try:
        lauf()
    except DatenFehler as ex:
        print(f"ABBRUCH: {ex}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
