#!/usr/bin/env python3
"""Lot-Scan für Pilot 2.0 (aus der Schlusskampagne der 17. Folge-Runde, Oktober 2026) — NUR Spielgeld gegen 127.0.0.1, kein Netz.

Gestoppt werden können nur GANZE Lots (7,099893 Coins → 7,0998). Der Not-Aus-Schutz verglich zwei Mal die gestoppte Menge mit den ROHEN Coins: hatten die Coins einen Rest unter einem Lot, aber über
dem halben, galten sie als «nicht ganz gestoppt» — der ergänzende Perp-Stop kam nicht und ein zu grosser, nicht löschbarer Perp-Stop deckte den Short nur zum Teil (Schlusskampagne `camp17a`, strenger
Lücken-Not-Aus-Seed 526741, ~28'700 USDT); das Aufräumen eines schon vollständigen Marktes löschte den Spot-Stop in jedem Takt der Nachkontrolle und setzte ihn neu. Kein Zufalls-Fuzzer findet das
zuverlässig (er braucht genau diese Reste UND einen nicht löschbaren Stop), darum hier die ganze Achse:

  Lage von Hand (Spot-Lot 0,00001, Futures-Schritt 0,001): Coins = Basis + ein Bruchteil eines Lots (0 … 0,99) × Short × alter Spot-Stop (keiner / über alle ganzen Lots / über die Hälfte) ×
  alte Perp-Stops (keiner, 0,1, 0,2, 2 × 0,1, 0,3) × «Perp-Stops lassen sich nicht löschen» × «der Spot-Stop lässt sich nicht löschen». Je Lage ruft `_notaus_schutz` DREI Mal (wie die
  Nachkontrolle in drei Takten) auf — mit dem jeweils frischen Konto.

Befund (jeder ist ein Fehler):
  SCHUTZ     nach den drei Durchgängen: Befund des Schutz-Prüfers (Position ohne Stop, Stop über Netto, … — dieselbe Prüfung wie im Fuzzer)
  SCHREIBT   der 3. Durchgang schreibt noch (ohne Störung): kein Fixpunkt — Löschen und Neusetzen in jedem Takt wäre ein Fenster ohne Schutz
  AUSNAHME   `_notaus_schutz` warf eine unerwartete Ausnahme

Aufruf:  python3 -B pruef_lot.py [--schnell]      # Ausgabe: Zahl der Lagen + Befunde (Exit 1 bei einem Befund); --schnell = eine Basis und fünf Reste (für den Test)
         PRUEF_STRENG=1 python3 -B pruef_lot.py   # gegen die strenge Prüf-Börse"""
from __future__ import annotations

import itertools
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True
import pilot2_live as L  # noqa: E402
import pruef_fuzzer as P  # noqa: E402
from pruef_fuzzer import B, env_echt, neues_konto  # noqa: E402

LOT = 1e-5                                   # Spot-Schritt BTCUSDT der Prüf-Börse
RESTE = tuple(r * LOT for r in (0.0, 0.1, 0.3, 0.45, 0.5, 0.55, 0.7, 0.9, 0.99))
BASEN = (0.2, 0.15, 7.0)
KURS = 100000.0
PERP_ALT = ((), (0.1,), (0.2,), (0.1, 0.1), (0.3,))
LOESCHEN_PERP = {"methode": "DELETE", "pfad": "/fapi/v1/algoOrder", "art": "vor503", "anzahl": 10 ** 6}
LOESCHEN_SPOT = {"methode": "DELETE", "pfad": "/api/v3/order", "art": "vor503", "anzahl": 10 ** 6}


def _lage(coins, short):
    """Kontostand von Hand: Coins im Spot, Short im Perp. → (Konto, Spot, Futures, Marktdaten)"""
    k = neues_konto(2000000.0)
    B.bewegen("BTCUSDT", KURS)
    cfg = L.einstellungen(env_echt())
    sp, fu = L.Spot(cfg["spot"]), L.Fut(cfg["futures"])
    k.frei["BTC"] = coins
    if short:
        k.buchen("BTCUSDT", -short, KURS)
    return k, sp, fu, {"sym": "BTCUSDT", "rs": sp.regeln2("BTCUSDT"), "rf": fu.regeln("BTCUSDT")}


def _schreibend(n0):
    return [(x[1], x[2], x[3].get("type")) for x in B.log[n0:] if x[1] in ("POST", "DELETE") and x[4] == 200]


def scan(basen=BASEN, reste=RESTE):
    """→ (Zahl der Lagen, Zähler je Befundart, erstes Beispiel je Befundart)"""
    zaehler, beispiele = Counter(), {}
    for base, rest, short, spot_alt, perp_alt, perp_kaputt, spot_kaputt in itertools.product(
            basen, reste, (0.2, 0.15, 0.0), ("keiner", "ganz", "halb"), PERP_ALT, (False, True), (False, True)):
        coins = round(base + rest, 8)
        if (base == 7.0 and short != 0.2) or short > coins + 0.01:
            continue
        sh = 7.0 if base == 7.0 else short                      # grosser Wert: ein Short passend zu den Coins (ETH-artig)
        k, sp, fu, d = _lage(coins, sh)
        step = d["rs"]["step"]
        if spot_alt != "keiner":
            sp.stop_verkauf(d["sym"], L.PL.runde(coins if spot_alt == "ganz" else coins / 2, step), 95000.0, d["rs"], cid=L._kennung(L.CID_STOP_SPOT))
        for m in perp_alt:
            if m <= sh + 1e-9:
                fu.stop_menge("BTCUSDT", "BUY", m, 110000.0, d["rf"]["tick"], cid=L._kennung(L.CID_STOP_PERP))
        st = {}
        B.regeln = ([dict(LOESCHEN_PERP)] if perp_kaputt else []) + ([dict(LOESCHEN_SPOT)] if spot_kaputt else [])
        name = {"coins": coins, "short": sh, "spot_alt": spot_alt, "perp_alt": perp_alt, "perp_kaputt": perp_kaputt, "spot_kaputt": spot_kaputt}
        try:
            for durchgang in range(3):
                n0 = len(B.log)
                try:
                    L._notaus_schutz(sp, fu, st, "BTC", "BTCUSDT", "BTC", -sh, -sh, k.frei["BTC"], k.gesperrt["BTC"], KURS, d["rs"], [].append, "echt")
                except Exception as ex:  # noqa: BLE001
                    zaehler["AUSNAHME"] += 1
                    beispiele.setdefault("AUSNAHME", (name, repr(ex)[:200]))
                    break
                if durchgang == 2 and _schreibend(n0) and not (perp_kaputt or spot_kaputt):
                    zaehler["SCHREIBT"] += 1
                    beispiele.setdefault("SCHREIBT", (name, _schreibend(n0)))
            funde = P.echte(P.schutz_befunde(k, {}) + P.folgeschaden(k))
            if funde:
                zaehler["SCHUTZ"] += 1
                beispiele.setdefault("SCHUTZ", (name, [f[0] for f in funde][:3]))
        finally:
            B.regeln = []
        zaehler["Lagen"] += 1
    return zaehler["Lagen"], zaehler, beispiele


if __name__ == "__main__":
    schnell = "--schnell" in sys.argv[1:]
    n, z, bsp = scan((0.2,), RESTE[::2]) if schnell else scan()
    befunde = sum(v for kk, v in z.items() if kk != "Lagen")
    print(f"{n} Lagen, {befunde} Befunde {dict(z)}")
    for kk, v in bsp.items():
        print("BEISPIEL", kk, v)
    sys.exit(1 if befunde else 0)
