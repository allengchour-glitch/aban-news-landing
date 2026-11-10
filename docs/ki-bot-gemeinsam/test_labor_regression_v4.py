"""Ergänzende Gegenproben zur Streaming-Fassung (Protokollversion 4), geschrieben von Claude am 10.11.2026.

Unabhängig von Codex' Tests: die Soll-Werte kommen aus einer eigenen Nachrechnung (math.fsum, Zweipass-Varianz), nicht aus
labor.py. Jeder Test schliesst eine Lücke, die die Mutationsprobe (claude-pruefung/mutation_v4.py) gezeigt hat.
Nur Standardbibliothek, kein Netz, kein Schreiben ausser in Speicher.
"""
import math
import random
import sys
import unittest
from decimal import Decimal
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import labor as L  # noqa: E402

NAMEN = list(L.SignalStrom.namen)


def zufallsreihe(seed, n, start=100.0, vol=0.03):
    rng, kurs, out = random.Random(seed), start, []
    for _ in range(n):
        kurs *= math.exp(rng.gauss(0.0003, vol))
        out.append(kurs)
    return out


def nachgerechnet(p, kurz=150, lang=200, fenster=30, ziel=0.25):
    """Eigene Fassung der Signaldefinition (anderer Rechenweg als labor.py)."""
    n = len(p)
    out = {k: [0.0] * n for k in NAMEN}
    out["Halten"] = [1.0] * n
    for i in range(lang - 1, n):
        ma200 = math.fsum(p[i - lang + 1:i + 1]) / lang
        ma150 = math.fsum(p[i - kurz + 1:i + 1]) / kurz
        r = [p[j] / p[j - 1] - 1 for j in range(i - fenster + 1, i + 1)]
        m = math.fsum(r) / fenster
        vol = math.sqrt(math.fsum((x - m) ** 2 for x in r) / (fenster - 1)) * math.sqrt(365)
        q = min(1.0, ziel / vol) if vol > 0 else 0.0
        k = p[i]
        out["Trend 200"][i] = float(k > ma200)
        out["Halten Risiko 25"][i] = q
        out["Trend 150 Risiko 25"][i] = q if k > ma150 else 0.0
        out["Trend 200 Risiko 25"][i] = q if k > ma200 else 0.0
        out["Konsens 150/200"][i] = q if (k > ma150 and k > ma200) else 0.0
    return out


class StromGrenzenV4(unittest.TestCase):
    def test_strom_gleich_eigener_nachrechnung_bei_jeder_skala(self):
        """Zwanzig Zufallsreihen von winzigen bis riesigen Kursen: Schalter exakt gleich, Quoten auf 1e-9."""
        for seed in range(20):
            skala = 10 ** random.Random(seed).uniform(-6, 9)
            p = zufallsreihe(seed, 230 + seed * 17, start=skala, vol=(0.005, 0.02, 0.05)[seed % 3])
            strom = L.signale(p)
            soll = nachgerechnet(p)
            for name in NAMEN:
                for i, (x, y) in enumerate(zip(strom[name], soll[name])):
                    self.assertEqual(x == 0.0, y == 0.0, f"{name} Tag {i} Reihe {seed}: Schalter verschieden")
                    self.assertAlmostEqual(x, y, delta=1e-9, msg=f"{name} Tag {i} Reihe {seed}")

    def test_gleichstand_ist_kein_trend(self):
        """Kurs gleich Mittel zählt nicht als über dem Mittel (>, nicht >=)."""
        a = L.signale([100.0] * 260)
        for name in ("Trend 200", "Trend 150 Risiko 25", "Trend 200 Risiko 25", "Konsens 150/200"):
            self.assertEqual(set(a[name]), {0.0}, name)

    def test_ohne_schwankung_keine_position(self):
        """Festgehaltene Eigenschaft: Volatilität 0 ergibt Quote 0 (Cash), nicht 1 und keine Division durch null."""
        a = L.signale([100.0] * 260)
        self.assertEqual(set(a["Halten Risiko 25"]), {0.0})
        self.assertEqual(set(a["Halten"]), {1.0})

    def test_trend_und_volatilitaetsfenster_bleiben_je_strom_fest(self):
        """Auch Trendfenster und Volatilitätsfenster werden bei der Erzeugung übernommen, selbst bei Änderung in der Liste."""
        p = zufallsreihe(4, 420, start=20000.0)
        soll = L.signale(p)
        alt_trend, alt_vol = list(L.PROTOKOLL["trend_tage"]), L.PROTOKOLL["vol_tage"]
        strom = L.SignalStrom()
        try:
            L.PROTOKOLL["trend_tage"][0] = 5          # verschachtelte Liste an Ort und Stelle ändern
            L.PROTOKOLL["trend_tage"][1] = 10
            L.PROTOKOLL["vol_tage"] = 5
            ausgaben = [strom.schritt(x) for x in p]
        finally:
            L.PROTOKOLL["trend_tage"][:] = alt_trend
            L.PROTOKOLL["vol_tage"] = alt_vol
        for name in NAMEN:
            self.assertEqual([a[name] for a in ausgaben], soll[name], name)

    def test_nur_die_gehaltenen_kurse_zaehlen(self):
        """Ein Strom, der nur die zuletzt gehaltenen 200 Kurse sah, gibt dasselbe aus wie einer mit voller Vorgeschichte."""
        p = zufallsreihe(8, 900)
        voll, kurz = L.SignalStrom(), L.SignalStrom()
        for x in p:
            voll.schritt(x)
        for x in p[-200:]:
            kurz.schritt(x)
        for x in zufallsreihe(9, 40, start=p[-1]):
            self.assertEqual(voll.schritt(x), kurz.schritt(x))

    def test_ungueltige_kurse_aller_art_lassen_den_zustand_unberuehrt(self):
        """Auch vor der Aufwärmphase und mit exotischen Typen; Ausnahme ValueError, bei riesigen ganzen Zahlen OverflowError."""
        p = zufallsreihe(11, 330)
        kontrolle, pruefling = L.SignalStrom(), L.SignalStrom()
        kaputt = [None, "100", b"1", [1.0], (1.0,), Decimal("5"), Fraction(5, 1), complex(1, 0), float("-inf"), -0.0, 10 ** 400]
        for i, x in enumerate(p):
            if i in (0, 3, 150, 199, 200, 300):
                for k in kaputt:
                    with self.assertRaises((ValueError, OverflowError), msg=repr(k)):
                        pruefling.schritt(k)
                self.assertEqual(pruefling.anzahl, kontrolle.anzahl)
            self.assertEqual(pruefling.schritt(x), kontrolle.schritt(x))

    def test_ungueltige_konfiguration_wird_bei_der_erzeugung_abgewiesen(self):
        """Fenster müssen ganze Zahlen ab 2 sein, das Schwankungsziel endlich und in (0, 1]; Wahrheitswerte zählen nicht."""
        sicher = {"trend_tage": list(L.PROTOKOLL["trend_tage"]), "vol_tage": L.PROTOKOLL["vol_tage"], "vol_ziel": L.PROTOKOLL["vol_ziel"]}
        faelle = [("vol_tage", 1), ("vol_tage", True), ("vol_tage", 2.5), ("trend_tage", [1, 200]), ("trend_tage", [150, True]),
                  ("trend_tage", [200]), ("vol_ziel", 0), ("vol_ziel", -0.1), ("vol_ziel", 1.5), ("vol_ziel", float("nan")),
                  ("vol_ziel", True)]
        try:
            for schluessel, wert in faelle:
                L.PROTOKOLL[schluessel] = wert
                with self.assertRaises(ValueError, msg=f"{schluessel}={wert!r}"):
                    L.SignalStrom()
                L.PROTOKOLL[schluessel] = sicher[schluessel] if schluessel != "trend_tage" else list(sicher["trend_tage"])
        finally:
            L.PROTOKOLL["trend_tage"] = sicher["trend_tage"]
            L.PROTOKOLL["vol_tage"] = sicher["vol_tage"]
            L.PROTOKOLL["vol_ziel"] = sicher["vol_ziel"]
        L.SignalStrom()          # mit den Standardwerten geht es wieder

    def test_vor_der_aufwaermphase_nur_halten(self):
        """Die ersten 199 Kurse geben nur «Halten» = 1 aus, der 200. Kurs liefert erstmals Signale."""
        p = zufallsreihe(5, 260)
        a = L.signale(p)
        for i in range(199):
            self.assertEqual([a[n][i] for n in NAMEN], [1.0, 0, 0, 0, 0, 0], f"Tag {i}")
        self.assertTrue(any(a[n][199] != 0.0 for n in NAMEN if n != "Halten"))


if __name__ == "__main__":
    unittest.main()
