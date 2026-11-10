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
spec_news = importlib.util.spec_from_file_location("ki_nachrichten", HIER / "nachrichten.py")
N = importlib.util.module_from_spec(spec_news)
spec_news.loader.exec_module(N)


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
            self.assertEqual(result["protokoll"]["version"], 4)
            self.assertNotEqual(subprocess.run(cmd, capture_output=True).returncode, 0)
            self.assertEqual(out.read_bytes(), before)
            out.unlink()
            cmd[-1] = rows[-1][0]
            self.assertNotEqual(subprocess.run(cmd, capture_output=True).returncode, 0)
            self.assertFalse(out.exists())


class StromSchnittstelle(unittest.TestCase):
    def test_einmaliger_iterator(self):
        p = preise()
        gesehen = []
        def quelle():
            for i, kurs in enumerate(p):
                gesehen.append(i)
                yield kurs
        self.assertEqual(L.signale(quelle()), L.signale(p))
        self.assertEqual(gesehen, list(range(len(p))))

    def test_pausieren_und_fortsetzen(self):
        p = preise()
        strom = L.SignalStrom()
        schritte = [strom.schritt(x) for x in p[:300]]
        schritte += [strom.schritt(x) for x in p[300:]]
        batch = L.signale(p)
        for name in batch:
            self.assertEqual([s[name] for s in schritte], batch[name])

    def test_keine_zukunft_uebergeben(self):
        p = preise()
        a, b = L.SignalStrom(), L.SignalStrom()
        erste = [a.schritt(x) for x in p[:400]]
        zweite = [b.schritt(x) for x in p[:400]]
        for x in p[400:]:
            a.schritt(x)
            b.schritt(x * 4)
        self.assertEqual(erste, zweite)
        batch = L.signale(p[:400])
        for i, schritt in enumerate(erste):
            self.assertEqual(schritt, {name: q[i] for name, q in batch.items()})

    def test_konfiguration_bleibt_je_strom_fest(self):
        p, strom = preise(), L.SignalStrom()
        alt = L.PROTOKOLL["vol_ziel"]
        try:
            L.PROTOKOLL["vol_ziel"] = .5
            schritte = [strom.schritt(x) for x in p]
        finally:
            L.PROTOKOLL["vol_ziel"] = alt
        batch = L.signale(p)
        for name in batch:
            self.assertEqual([s[name] for s in schritte], batch[name])

    def test_ungueltiger_kurs_veraendert_zustand_nicht(self):
        a, b = L.SignalStrom(), L.SignalStrom()
        for x in preise(300):
            a.schritt(x)
            b.schritt(x)
        for kaputt in (0, -1, True, "100", float("nan"), float("inf")):
            with self.assertRaises(ValueError):
                a.schritt(kaputt)
        self.assertEqual(a.anzahl, b.anzahl)
        self.assertEqual(a.schritt(100.), b.schritt(100.))

    def test_begrenzter_speicher_und_unveraenderte_belege(self):
        strom = L.SignalStrom()
        erster = strom.schritt(100.)
        erwarteter = dict(erster)
        for x in preise(1000):
            strom.schritt(x)
        self.assertEqual(len(strom._historie), 200)
        self.assertEqual(erster, erwarteter)


class Nachrichten(unittest.TestCase):
    def artikel(self, **updates):
        row = {"id": "eins", "headline": "Bitcoin Meldung", "symbol": "BTC-USD",
               "source": "Erfundene Testquelle", "model_id": "erfundenes-modell@v1",
               "published_at": "2026-10-29T12:00:00Z", "available_at": "2026-10-29T12:01:00Z",
               "scored_at": "2026-10-29T12:02:00Z", "model_trained_until": "2025-01-01T00:00:00Z",
               "probabilities": {"positive": .7, "negative": .1, "neutral": .2}}
        row.update(updates)
        return row

    def check_news(self, rows):
        return N.pruefen(rows, "2026-10-29T13:00:00Z", "BTC-USD")

    def test_duplikate_verstaerken_stimmung_nicht(self):
        a = self.check_news([self.artikel()])
        b = self.check_news([self.artikel(id=str(i), headline="  BITCOIN   Meldung  ") for i in range(7)])
        self.assertEqual(a["mittel_klassenwahrscheinlichkeiten"], b["mittel_klassenwahrscheinlichkeiten"])
        self.assertEqual(b["verwendet"], 1)
        self.assertEqual(b["verworfen"]["duplikat"], 6)
        self.assertFalse(b["handelsfreigabe"])

    def test_spaeterer_empfang(self):
        r = self.check_news([self.artikel(available_at="2026-10-29T14:00:00Z", scored_at="2026-10-29T14:01:00Z")])
        self.assertEqual(r["verworfen"]["zukunft"], 1)
        self.assertIsNone(r["stimmungswert"])

    def test_spaetere_modellbewertung(self):
        r = self.check_news([self.artikel(scored_at="2026-10-29T14:00:00Z")])
        self.assertEqual(r["verworfen"]["zukunft"], 1)

    def test_spaeteres_modell(self):
        r = self.check_news([self.artikel(model_trained_until="2026-10-29T14:00:00Z", scored_at="2026-10-29T15:00:00Z")])
        self.assertEqual(r["verworfen"]["zukunft"], 1)

    def test_zeitzonen(self):
        a = self.check_news([self.artikel()])
        b = N.pruefen([self.artikel()], "2026-10-29T15:00:00+02:00", "BTC-USD")
        self.assertEqual(a, b)
        with self.assertRaises(ValueError):
            N.pruefen([], "2026-10-29T13:00:00", "BTC-USD")

    def test_ungueltige_wahrscheinlichkeiten(self):
        for probs in [{"positive": float("nan"), "negative": .1, "neutral": .2},
                      {"positive": .7, "negative": .7, "neutral": .2},
                      {"positive": True, "negative": 0, "neutral": 0},
                      {"positive": .7, "negative": .1}]:
            with self.subTest(probs=probs):
                r = self.check_news([self.artikel(probabilities=probs)])
                self.assertEqual(r["verworfen"]["ungueltig"], 1)
                self.assertIsNone(r["stimmungswert"])

    def test_fehlende_belege_und_falsche_zeitfolge(self):
        for fields in [{"model_id": ""}, {"scored_at": None}, {"model_trained_until": None},
                       {"available_at": "2026-10-29T11:00:00Z"},
                       {"scored_at": "2026-10-29T12:00:00Z"}]:
            with self.subTest(fields=fields):
                self.assertEqual(self.check_news([self.artikel(**fields)])["verworfen"]["ungueltig"], 1)

    def test_erste_beobachtung_unabhaengig_von_reihenfolge(self):
        first = self.artikel()
        later = self.artikel(scored_at="2026-10-29T12:30:00Z",
                             probabilities={"positive": .1, "negative": .7, "neutral": .2})
        self.assertEqual(self.check_news([first, later]), self.check_news([later, first]))

    def test_modelle_nicht_mischen(self):
        r = self.check_news([self.artikel(), self.artikel(model_id="anderes-modell@v2")])
        self.assertEqual(r["status"], "verschiedene_modelle_nicht_vergleichbar")
        self.assertIsNone(r["stimmungswert"])

    def test_mittel_statt_aufaddierter_logits(self):
        r = self.check_news([self.artikel(), self.artikel(id="zwei", headline="Andere Nachricht",
                             probabilities={"positive": .1, "negative": .7, "neutral": .2})])
        self.assertAlmostEqual(r["mittel_klassenwahrscheinlichkeiten"]["positive"], .4)
        self.assertAlmostEqual(r["stimmungswert"], 0)

    def test_alter_und_symbol(self):
        r = self.check_news([self.artikel(published_at="2026-10-26T12:59:59Z"), self.artikel(symbol="SPY")])
        self.assertEqual(r["verworfen"]["zu_alt"], 1)
        self.assertEqual(r["verworfen"]["anderes_symbol"], 1)
        boundary = self.artikel(published_at="2026-10-26T13:00:00Z")
        self.assertEqual(self.check_news([boundary])["verwendet"], 1)

    def test_keine_nachricht_ist_nicht_neutrale_prognose(self):
        r = self.check_news([])
        self.assertEqual(r["status"], "keine_verwendbaren_nachrichten")
        self.assertIsNone(r["mittel_klassenwahrscheinlichkeiten"])

    def test_cli_nachrichten_als_getrennten_datencheck(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            data, news, out = d / "kurse.json", d / "news.json", d / "bericht.json"
            start = date(2020, 1, 1)
            data.write_text(json.dumps([[str(start + timedelta(days=i)), p]
                                        for i, p in enumerate(preise(2200))]))
            news.write_text(json.dumps([self.artikel()]))
            cmd = [sys.executable, str(HIER / "labor.py"), "--daten", str(data), "--ausgabe", str(out),
                   "--stichtag", "2026-10-29"]
            before = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(before.returncode, 0, before.stderr)
            baseline = json.loads(out.read_text())
            out.unlink()
            pair = ["--nachrichten", str(news), "--entscheidungszeit", "2026-10-29T13:00:00Z"]
            after = subprocess.run(cmd + pair, capture_output=True, text=True)
            self.assertEqual(after.returncode, 0, after.stderr)
            r = json.loads(out.read_text())
            self.assertEqual(r["nachrichten_pruefung"]["verwendet"], 1)
            self.assertFalse(r["handelsfreigabe"])
            self.assertEqual(r["ergebnisse"], baseline["ergebnisse"])
            self.assertNotEqual(r["versuch_id"], baseline["versuch_id"])
            out.unlink()
            self.assertNotEqual(subprocess.run(cmd + pair[:2], capture_output=True).returncode, 0)
            self.assertFalse(out.exists())


class ClaudeBefunde(unittest.TestCase):
    def test_seltenes_zwei_tage_leck_alle_versatzwerte(self):
        p = preise()
        for intervall, versatzwerte in ((7, range(7)), (97, (5,))):
            for versatz in versatzwerte:
                def leak(x):
                    return {"X": [float(i % intervall == versatz and i + 2 < len(x)
                                        and x[i + 2] > x[i + 1]) for i in range(len(x))]}
                with self.subTest(intervall=intervall, versatz=versatz):
                    self.assertFalse(L.signalpruefung(p, leak)["bestanden"])

    def test_stichprobe_ist_kein_strenger_nachweis(self):
        p = preise()
        def leak(x):
            return {"X": [float(i % 7 == 1 and i + 2 < len(x) and x[i + 2] > x[i + 1])
                          for i in range(len(x))]}
        r = L.signalpruefung(p, leak, streng=False)
        self.assertTrue(r["bestanden"])
        self.assertEqual(r["modus"], "stichprobe")
        self.assertEqual(L.signalpruefung(p, leak)["modus"], "alle_praefixe")

    def test_protokoll_verzoegerung_wirkt(self):
        alt = L.PROTOKOLL["signal_verzoegerung_tage"]
        try:
            L.PROTOKOLL["signal_verzoegerung_tage"] = 3
            # Signal Tag0 kauft erst am Schluss von Tag2 und verpasst dessen Sprung.
            r = L.simulieren([100., 100., 200., 200.], [1.] * 4, 0, start=1)
            self.assertEqual(r["rendite"], 0)
            L.PROTOKOLL["signal_verzoegerung_tage"] = 1
            with self.assertRaises(ValueError):
                L.simulieren([100., 100., 200.], [1.] * 3, 0, start=1)
        finally:
            L.PROTOKOLL["signal_verzoegerung_tage"] = alt

    def test_protokoll_mindestlaenge_wirkt(self):
        alt = L.PROTOKOLL["vorwaertstest_mindesttage"]
        try:
            L.PROTOKOLL["vorwaertstest_mindesttage"] = 5000
            days = [date(2020, 1, 1) + timedelta(days=i) for i in range(2100)]
            self.assertEqual(L.auswerten(days, preise(len(days))), {})
        finally:
            L.PROTOKOLL["vorwaertstest_mindesttage"] = alt


if __name__ == "__main__":
    unittest.main()
