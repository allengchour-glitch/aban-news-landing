"""Offline-Gegenproben ohne Broker, Schlüssel oder Netzwerk."""
import importlib.util
import json
import math
import random
import subprocess
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

HIER = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("ki_forschung", HIER / "labor.py")
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)


def preise(n=800):
    rnd, p = random.Random(17), [100.0]
    for _ in range(n - 1):
        p.append(p[-1] * math.exp(rnd.gauss(0.0005, 0.02)))
    return p


class Rechnen(unittest.TestCase):
    def test_ein_und_ausstiegskosten(self):
        c = .005
        r = L.simulieren([100.] * 405, [1.] * 405, c)
        self.assertAlmostEqual(r["rendite"], (1 - c) / (1 + c) - 1)
        self.assertAlmostEqual(r["kosten_pro_startkapital"], -r["rendite"])
        self.assertEqual(r["auftraege"], 2)

    def test_cash(self):
        r = L.simulieren([100., 200., 1., 500.], [0.] * 4, .005, start=1)
        self.assertEqual(r["rendite"], 0)
        self.assertEqual(r["exposure_schnitt"], 0)
        self.assertEqual(r["kosten_pro_startkapital"], 0)

    def test_keine_rendite_vor_ausfuehrung(self):
        self.assertEqual(L.simulieren([100., 200., 200.], [1.] * 3, 0, start=1)["rendite"], 0)

    def test_rendite_nach_ausfuehrung(self):
        self.assertEqual(L.simulieren([100., 100., 200.], [1.] * 3, 0, start=1)["rendite"], 1)

    def test_absturz(self):
        r = L.simulieren([100., 100., 50.], [1.] * 3, 0, start=1)
        self.assertEqual(r["rendite"], -.5)
        self.assertEqual(r["max_einbruch"], -.5)
        self.assertTrue(r["noch_nicht_erholt"])

    def test_drift(self):
        self.assertAlmostEqual(L.simulieren([100., 100., 200.], [.5] * 3, 0, start=1)["rendite"], .5)

    def test_cash_austritt_unter_band(self):
        r = L.simulieren([100., 100., 1., 100.], [.5, 0., 0., 0.], 0, start=1, band=.1)
        self.assertAlmostEqual(r["rendite"], -.495)

    def test_erholung(self):
        r = L.simulieren([100., 100., 50., 50., 100.], [1.] * 5, 0, start=1)
        self.assertEqual(r["laengste_unterwasserphase_tage"], 2)
        self.assertFalse(r["noch_nicht_erholt"])

    def test_mehr_kosten(self):
        p, q = [100., 100., 110., 90., 105.], [1., 0., 1., 0., 0.]
        self.assertLess(L.simulieren(p, q, .005, start=1)["rendite"],
                        L.simulieren(p, q, .001, start=1)["rendite"])

    def test_ungueltige_eingaben(self):
        for p, q, c, start, band in [([1., 2.], [1.], .001, 1, 0),
                ([1., 0.], [1., 1.], 0, 1, 0), ([1., 2.], [1., 2.], 0, 1, 0),
                ([1., float("nan")], [1., 1.], 0, 1, 0),
                ([1., 2.], [1., 1.], -1, 1, 0), ([1., 2.], [1., 1.], 1, 1, 0),
                ([1., 2.], [1., 1.], 0, 0, 0), ([1., 2.], [1., 1.], 0, 2, 0),
                ([1., 2.], [1., 1.], 0, 1, float("inf")),
                ([1., 2.], [True, 1.], 0, 1, 0)]:
            with self.subTest(p=p, q=q, c=c, start=start, band=band), self.assertRaises(ValueError):
                L.simulieren(p, q, c, start=start, band=band)


class DatenUndSignale(unittest.TestCase):
    def test_datenfehler(self):
        start = date(2020, 1, 1)
        rows = [[str(start + timedelta(days=i)), 100.] for i in range(400)]
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "kurse.json"
            f.write_text(json.dumps(rows))
            self.assertEqual(len(L.laden(f)[0]), 400)
            for value in [0, -1, float("nan"), float("inf"), True, "100"]:
                bad = [r[:] for r in rows]
                bad[200][1] = value
                f.write_text(json.dumps(bad))
                with self.subTest(value=value), self.assertRaises(ValueError):
                    L.laden(f)
            for value in [rows[199][0], rows[201][0], "kein-datum", "20200101"]:
                bad = [r[:] for r in rows]
                bad[200][0] = value
                f.write_text(json.dumps(bad))
                with self.subTest(value=value), self.assertRaises(ValueError):
                    L.laden(f)

    def test_datenalter(self):
        today = date(2026, 10, 29)
        for age, aktuell, abgeschlossen in [(0, False, False), (-1, False, False),
                                           (1, True, True), (2, True, True), (3, False, True)]:
            r = L.datenalter([today - timedelta(days=age)], today)
            self.assertEqual(r["aktuell"], aktuell)
            self.assertEqual(r["abgeschlossen"], abgeschlossen)

    def test_kausalitaet_und_historie(self):
        self.assertTrue(L.signalpruefung(preise())["bestanden"])
        p = preise()
        a, b = L.signale(p), L.signale(p[:400] + [x * 3 for x in p[400:]])
        for name in a:
            self.assertEqual(a[name][:400], b[name][:400])

    def test_messgeraet_entdeckt_zukunftswissen(self):
        def hellseher(p):
            return {"X": [float(i + 1 < len(p) and p[i + 1] > p[i]) for i in range(len(p))]}
        self.assertFalse(L.signalpruefung(list(range(1, 801)), hellseher)["bestanden"])

    def test_messgeraet_entdeckt_rekursion(self):
        def rekursiv(p):
            return {"X": [min(i / 1000, 1) for i in range(len(p))]}
        r = L.signalpruefung(preise(), rekursiv)
        self.assertFalse(r["bestanden"])
        self.assertTrue(any("Live-Signal" in e for e in r["fehler"]))

    def test_messgeraet_entdeckt_hebel(self):
        self.assertFalse(L.signalpruefung(preise(), lambda p: {"X": [2.] * len(p)})["bestanden"])

    def test_gleiches_risikobudget(self):
        p = [100 * math.exp(i / 1000 + .002 * math.sin(i)) for i in range(500)]
        s = L.signale(p)
        for i in range(200, len(p)):
            self.assertAlmostEqual(s["Halten Risiko 25"][i], s["Trend 200 Risiko 25"][i])
            self.assertAlmostEqual(s["Halten Risiko 25"][i], s["Konsens 150/200"][i])
            self.assertTrue(0 <= s["Konsens 150/200"][i] <= 1)

    def test_zeitabschnitte_ohne_ueberlappung(self):
        start = date(2020, 1, 1)
        days = [start + timedelta(days=i) for i in range(2100)]
        r = L.auswerten(days, preise(len(days)))
        self.assertLess(r["2022-01-01"]["bis"], r["2024-01-01"]["von"])
        self.assertEqual(len(r["2022-01-01"]["szenarien"]), 3)
        self.assertEqual(len(r["2022-01-01"]["szenarien"]["basis"]), 6)

    def test_kostenkomponenten_sind_aktiv(self):
        start = date(2020, 1, 1)
        days = [start + timedelta(days=i) for i in range(2100)]
        r = L.auswerten(days, [100.] * len(days))["2022-01-01"]["szenarien"]
        # Fester Prüfvertrag: 10bp Gebühr + 5bp halber Spread + 5bp Schlupf.
        self.assertAlmostEqual(r["basis"]["Halten"]["rendite"], (1 - .002) / (1 + .002) - 1)
        self.assertAlmostEqual(r["extrem"]["Halten"]["rendite"], (1 - .01) / (1 + .01) - 1)

    def test_cli_und_berichtsschutz(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            start = date(2020, 1, 1)
            rows = [[str(start + timedelta(days=i)), p] for i, p in enumerate(preise(2200))]
            data, out = d / "daten.json", d / "bericht.json"
            data.write_text(json.dumps(rows))
            cmd = [sys.executable, str(HIER / "labor.py"), "--daten", str(data), "--ausgabe", str(out),
                   "--stichtag", "2026-10-29"]
            r = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            before = out.read_bytes()
            result = json.loads(before)
            self.assertFalse(result["handelsfreigabe"])
            self.assertFalse(result["datenqualitaet"]["aktuell"])
            self.assertTrue(result["signalpruefung"]["bestanden"])
            self.assertEqual(result["protokoll"]["version"], 2)
            self.assertNotEqual(subprocess.run(cmd, capture_output=True).returncode, 0)
            self.assertEqual(out.read_bytes(), before)
            out.unlink()
            cmd[-1] = rows[-1][0]
            self.assertNotEqual(subprocess.run(cmd, capture_output=True).returncode, 0)
            self.assertFalse(out.exists())


if __name__ == "__main__":
    unittest.main()
