#!/usr/bin/env python3
"""Tests für den Copy-Trading-Prüfstand (copytrading_kern.py, Vorwärts-Test in copytrading_pruefung.py), ohne Netz.
    python3 tools/trading/krypto_bot/test_copytrading.py"""
import json
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import copytrading_kern as K  # noqa: E402
import copytrading_pruefung as P  # noqa: E402

n_ok = n_f = 0


def pruefe(name, c, info=""):
    global n_ok, n_f
    c = bool(c)
    print(("✅ " if c else "❌ ") + name + ("" if c else f"   → {info}"))
    n_ok += c
    n_f += not c


JETZT = int(datetime(2026, 10, 13, tzinfo=timezone.utc).timestamp() * 1000)


def gut():
    """Ein Leadtrader, der jeden Filter knapp besteht."""
    return {"detail": {"startTime": JETZT - 200 * K.TAG_MS, "closeLeadCount": 0, "status": "ACTIVE", "copierPnl": "1500",
                       "tag": ["MEDIUM_LEVERAGE"]},
            "leistung": {"30D": {"roi": 2.0}, "90D": {"roi": 8.0}, "180D": {"roi": 20.0, "mdd": 18.0}},
            "muster": K.verlust_muster([{"closingPnl": 10, "leverage": "5"}] * 25 + [{"closingPnl": -40, "leverage": "5"}] * 10)}


# ── Verlust-Muster ──
m = K.verlust_muster([{"closingPnl": 1}, {"closingPnl": 1}, {"closingPnl": 1}, {"closingPnl": -30, "leverage": "50"}])
pruefe("Martingale-Muster: 75 % Treffer, aber grösster Verlust = 30 × Durchschnittsgewinn", m["treffer"] == 0.75 and m["faktor"] == 30
       and m["max_hebel"] == 50, m)
pruefe("keine Gewinne, aber Verluste → Faktor unendlich", K.verlust_muster([{"closingPnl": -5}])["faktor"] == float("inf"))
# ── Filter «kopierbar»: besteht knapp, jedes Kriterium einzeln fällt ──
ok, gr = K.pruefe_kandidat(gut(), JETZT)
pruefe("guter Leadtrader besteht alle Kriterien", ok and not gr, gr)
faelle = [
    ("zu kurz dabei", lambda t: t["detail"].update(startTime=JETZT - 100 * K.TAG_MS), "Tage Leadtrader"),
    ("Neustart", lambda t: t["detail"].update(closeLeadCount=1), "Neustart"),
    ("nicht aktiv", lambda t: t["detail"].update(status="CLOSED"), "Status"),
    ("ROI 30D im Minus", lambda t: t["leistung"]["30D"].update(roi=-0.1), "ROI 30D"),
    ("ROI 90D fehlt", lambda t: t["leistung"].pop("90D"), "ROI 90D"),
    ("ROI 180D null", lambda t: t["leistung"]["180D"].update(roi=0), "ROI 180D"),
    ("Einbruch 26 %", lambda t: t["leistung"]["180D"].update(mdd=26.0), "Einbruch"),
    ("Kopierer im Minus", lambda t: t["detail"].update(copierPnl="-1"), "Kopierer"),
    ("Kopierer genau bei 0", lambda t: t["detail"].update(copierPnl="0"), "Kopierer"),
    ("hoher Hebel", lambda t: t["detail"].update(tag=["HIGH_LEVERAGE"]), "Hebel"),
    ("zu wenig Positionen", lambda t: t.update(muster=K.verlust_muster([{"closingPnl": 1}] * 29)), "zu wenig"),
    ("Martingale", lambda t: t.update(muster=K.verlust_muster([{"closingPnl": 1}] * 40 + [{"closingPnl": -11}])), "Martingale"),
]
for name, aendern, wort in faelle:
    t = gut()
    aendern(t)
    ok, gr = K.pruefe_kandidat(t, JETZT)
    pruefe(f"Filter fällt bei: {name}", not ok and any(wort in g for g in gr), gr)
pruefe("Grenzwerte gehören noch dazu (Einbruch genau 25 %, Faktor genau 10, genau 180 Tage)", K.pruefe_kandidat(
    {**gut(), "detail": {**gut()["detail"], "startTime": JETZT - 180 * K.TAG_MS},
     "leistung": {**gut()["leistung"], "180D": {"roi": 1, "mdd": 25.0}},
     "muster": K.verlust_muster([{"closingPnl": 1}] * 40 + [{"closingPnl": -10}])}, JETZT)[0])
# ── Rangkorrelation, Hälften, Kopierer-Bilanz ──
pruefe("Rangkorrelation: gleich = 1, umgekehrt = −1, Bindungen erlaubt",
       abs(K.rang_korrelation([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-12 and abs(K.rang_korrelation([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-12
       and K.rang_korrelation([1, 1, 2, 3], [5, 5, 6, 7]) > 0.99 and K.rang_korrelation([1, 2], [1, 2]) is None)
kurve = [{"value": 0}] * 30 + [{"value": float(i)} for i in range(1, 151)]  # ROI 1 … 150 % nach 30 inaktiven Tagen
h = K.haelften(kurve)
pruefe("Hälften: führende Nullen weg, Faktor-Rendite (erste +75 %, zweite 2,50/1,75 − 1 = +42,9 %)", h and abs(h[0] - 75) < 1e-9
       and abs(h[1] - (100 * (2.5 / 1.75 - 1))) < 1e-9, h)
pruefe("Hälften: weniger als 120 Tage → keine Aussage", K.haelften([{"value": 1}] * 119) is None)
b = K.kopierer_bilanz([{"copierPnl": 100, "roi": 50}, {"copierPnl": -300, "roi": 900}, {"copierPnl": "-1", "roi": 10}], 3)
pruefe("Kopierer-Bilanz: Summe, Anteil im Minus, Median-ROI", b == {"n": 3, "kopierer_summe": -201.0, "anteil_kopierer_minus": 0.6667, "median_roi": 50.0}, b)
# ── Vorwärts-Test (ohne Netz) ──
tmp = Path(tempfile.mkdtemp())
P.SCHATTEN = tmp / "schatten.json"
listen = {"ROI_90D": [{"leadPortfolioId": i} for i in range(100, 115)], "ROI_30D": [{"leadPortfolioId": i} for i in range(200, 215)]}
P.vorwaerts_speichern(listen, [{"id": "7"}], {})
P.vorwaerts_speichern(listen, [{"id": "7"}], {})
e = json.loads(P.SCHATTEN.read_text())["eintraege"]
pruefe("Vorwärts-Test: Auswahl gespeichert (1 Kandidat + je 10 naive), nur einmal pro Tag", len(e) == 21
       and sum(x["gruppe"] == "naiv_roi90" for x in e) == 10, len(e))
P.detail = lambda pid: {"status": "CLOSED" if pid == "100" else "ACTIVE"}
P.leistung = lambda pid, zr: {"roi": -40.0 if pid.startswith("1") else 5.0}
pruefe("Vorwärts-Test: vor 30 Tagen wird nichts ausgewertet", P.auswerten(datetime.now(timezone.utc) + timedelta(days=29)) == {})
z = P.auswerten(datetime.now(timezone.utc) + timedelta(days=30))
pruefe("Vorwärts-Test nach 30 Tagen: geschlossene Portfolios zählen als «weg», Median und Anteil im Minus je Gruppe",
       z["naiv_roi90"] == {"n": 10, "weg": 1, "median_roi30": -40.0, "anteil_minus": 1.0} and z["kandidaten"]["median_roi30"] == 5.0, z)
pruefe("Vorwärts-Test: abgeschlossene Einträge werden nicht noch einmal abgefragt", P.auswerten(datetime.now(timezone.utc) + timedelta(days=60)) == z)

print(f"\n{n_ok} bestanden, {n_f} fehlgeschlagen")
sys.exit(1 if n_f else 0)
