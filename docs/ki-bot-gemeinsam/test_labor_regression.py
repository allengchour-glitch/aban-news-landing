"""Regressionstests zum Offline-Labor (Claude-Prüfung 09.11.2026), ergänzen test_labor.py.

Warum: test_labor.py prüft Eigenschaften des Rechners (Kausalität, Kosten bei voller Quote, Berichtsschutz), aber nicht die
Definitionen der Strategien, die Protokollwerte und die veröffentlichten Zahlen. Eine Mutationsprobe (CLAUDE-REVIEW.md)
liess 21 von 32 Änderungen an labor.py unbemerkt. Diese Tests nageln genau das fest. Nur Standardbibliothek, ohne Netz.
"""
import hashlib
import importlib.util
import json
import math
import subprocess
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from statistics import stdev

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[1]
spec = importlib.util.spec_from_file_location("ki_forschung_regression", HIER / "labor.py")
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)

NAMEN = ("Halten", "Trend 200", "Halten Risiko 25", "Trend 150 Risiko 25", "Trend 200 Risiko 25", "Konsens 150/200")


def preise(n=800):
    import random
    rnd, p = random.Random(17), [100.0]
    for _ in range(n - 1):
        p.append(p[-1] * math.exp(rnd.gauss(0.0005, 0.02)))
    return p


def signale_nach_spezifikation(p):
    """Zweite, bewusst einfache Fassung der Regeln aus README.md (nicht aus labor.py abgeleitet):
    MA über die letzten N Schlusskurse einschliesslich heute; Schwankung = Stichproben-Stdev der letzten 30 einfachen
    Tagesrenditen einschliesslich heute mal Wurzel 365; Quote = min(1, 25 % / Schwankung); Aufwärmphase bis Tag 198 = 0."""
    out = {n: [] for n in NAMEN}
    for t in range(len(p)):
        out["Halten"].append(1.0)
        if t < 199:
            for n in NAMEN[1:]:
                out[n].append(0.0)
            continue
        kurs = p[t]
        ma200 = sum(p[t - 199:t + 1]) / 200
        ma150 = sum(p[t - 149:t + 1]) / 150
        rend = [p[j] / p[j - 1] - 1 for j in range(t - 29, t + 1)]
        vol = stdev(rend) * math.sqrt(365)
        q = min(1.0, 0.25 / vol) if vol > 0 else 0.0
        out["Trend 200"].append(1.0 if kurs > ma200 else 0.0)
        out["Halten Risiko 25"].append(q)
        out["Trend 150 Risiko 25"].append(q if kurs > ma150 else 0.0)
        out["Trend 200 Risiko 25"].append(q if kurs > ma200 else 0.0)
        out["Konsens 150/200"].append(q if (kurs > ma150 and kurs > ma200) else 0.0)
    return out


def gleich(a, b, pfad="", fehler=None):
    """Rekursiver Vergleich: Zahlen mit relativer Toleranz 1e-9 (unabhängig von der Python-Version), sonst genau."""
    fehler = [] if fehler is None else fehler
    if isinstance(a, dict) and isinstance(b, dict):
        if sorted(a) != sorted(b):
            fehler.append(f"{pfad}: Schlüssel {sorted(a)} != {sorted(b)}")
        for k in a:
            if k in b:
                gleich(a[k], b[k], f"{pfad}/{k}", fehler)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            fehler.append(f"{pfad}: Länge {len(a)} != {len(b)}")
        else:
            for i, (x, y) in enumerate(zip(a, b)):
                gleich(x, y, f"{pfad}[{i}]", fehler)
    elif isinstance(a, float) or isinstance(b, float):
        if not (isinstance(a, (int, float)) and isinstance(b, (int, float))
                and math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-12)):
            fehler.append(f"{pfad}: {a!r} != {b!r}")
    elif a != b:
        fehler.append(f"{pfad}: {a!r} != {b!r}")
    return fehler


class Definitionen(unittest.TestCase):
    def test_signale_gleich_spezifikation(self):
        p = preise()
        a, b = L.signale(p), signale_nach_spezifikation(p)
        self.assertEqual(sorted(a), sorted(b))
        for name in b:
            self.assertEqual(len(a[name]), len(p))
            for i, (x, y) in enumerate(zip(a[name], b[name])):
                self.assertAlmostEqual(x, y, places=12, msg=f"{name} Tag {i}")

    def test_konsens_braucht_beide_trends(self):
        # Kurs über dem MA150, aber unter dem MA200: erst fällt der Kurs lange (MA200 hoch), dann erholt er sich teilweise
        p = [200.0] * 120 + [100.0 + i * 0.2 for i in range(200)]
        s = L.signale(p)
        for t in range(250, len(p)):
            ma150 = sum(p[t - 149:t + 1]) / 150
            ma200 = sum(p[t - 199:t + 1]) / 200
            ueber150, ueber200 = p[t] > ma150, p[t] > ma200
            if ueber150 != ueber200:
                self.assertEqual(s["Konsens 150/200"][t], 0.0, f"Tag {t}")
                self.assertEqual(s["Trend 200 Risiko 25"][t] > 0, ueber200)
                self.assertEqual(s["Trend 150 Risiko 25"][t] > 0, ueber150)
                return
        self.fail("Die Reihe enthält keinen Tag mit nur einem Trend; Prüfung wirkungslos")

    def test_protokollwerte(self):
        P = L.PROTOKOLL
        self.assertEqual((P["trend_tage"], P["vol_tage"], P["vol_ziel"], P["handelsband"]), ([150, 200], 30, 0.25, 0.10))
        self.assertEqual(P["historische_teilperioden"], [["2022-01-01", "2024-01-01"], ["2024-01-01", None]])
        s = {k: sum(v.values()) for k, v in P["kosten_szenarien_bp"].items()}
        self.assertEqual(s, {"basis": 20, "stress": 50, "extrem": 100})


class Rechner(unittest.TestCase):
    def test_kosten_bei_teilquote(self):
        c = .01
        r = L.simulieren([100.] * 5, [.5] * 5, c, start=1)
        neu = .5 / (1 + .5 * c)
        self.assertAlmostEqual(r["rendite"], -2 * c * neu, places=12)
        self.assertAlmostEqual(r["umsatz_pro_startkapital"], 2 * neu, places=12)
        self.assertEqual(r["auftraege"], 2)

    def test_verkaufskosten_mitten_im_lauf(self):
        c = .01
        r = L.simulieren([100.] * 5, [.5, 0., 0., 0., 0.], c, start=1)
        neu = .5 / (1 + .5 * c)
        self.assertAlmostEqual(r["rendite"], -2 * c * neu, places=12)
        self.assertEqual(r["auftraege"], 2)

    def test_umsatz_und_exposure(self):
        r = L.simulieren([100.] * 405, [1.] * 405, 0.0)
        self.assertAlmostEqual(r["umsatz_pro_startkapital"], 2.0, places=12)
        self.assertAlmostEqual(r["exposure_schnitt"], 203 / 204, places=12)
        self.assertEqual(r["mess_tage"], 204)

    def test_alle_kostenstufen(self):
        days = [date(2020, 1, 1) + timedelta(days=i) for i in range(2100)]
        r = L.auswerten(days, [100.] * len(days))["2022-01-01"]["szenarien"]
        for stufe, kosten in (("basis", .002), ("stress", .005), ("extrem", .01)):
            self.assertAlmostEqual(r[stufe]["Halten"]["rendite"], (1 - kosten) / (1 + kosten) - 1, places=12, msg=stufe)

    def test_zeitraeume_genau(self):
        days = [date(2020, 1, 1) + timedelta(days=i) for i in range(2100)]
        r = L.auswerten(days, preise(len(days)))
        self.assertEqual((r["2022-01-01"]["von"], r["2022-01-01"]["bis"]), ("2022-01-01", "2023-12-31"))
        self.assertEqual(r["2024-01-01"]["von"], "2024-01-01")

    def test_zu_kurze_periode_wird_ausgelassen(self):
        n = (date(2024, 1, 1) - date(2020, 1, 1)).days + 150          # zweite Periode hätte nur 150 Tage
        days = [date(2020, 1, 1) + timedelta(days=i) for i in range(n)]
        r = L.auswerten(days, preise(n))
        self.assertIn("2022-01-01", r)
        self.assertNotIn("2024-01-01", r)


class Daten(unittest.TestCase):
    def test_einzelne_luecke_wird_abgewiesen(self):
        start = date(2020, 1, 1)
        tage = [start + timedelta(days=i) for i in range(401) if i != 200]       # ein Tag fehlt
        rows = [[str(t), 100.] for t in tage]
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "kurse.json"
            f.write_text(json.dumps(rows))
            with self.assertRaises(ValueError):
                L.laden(f)

    def test_datenhash_ist_sha256_der_datei(self):
        rows = [[str(date(2020, 1, 1) + timedelta(days=i)), 100. + i] for i in range(400)]
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "kurse.json"
            f.write_text(json.dumps(rows))
            self.assertEqual(L.laden(f)[2], hashlib.sha256(f.read_bytes()).hexdigest())

    def test_signalpruefung_findet_hellseher_nur_bei_praefix_400(self):
        p = preise()

        def spaet(preise_):
            return {"X": [float(i == 399 and i + 1 < len(preise_) and preise_[i + 1] > preise_[i]) for i in range(len(preise_))]}
        self.assertFalse(L.signalpruefung(p, spaet)["bestanden"])


class Bericht(unittest.TestCase):
    def test_gespeicherter_bericht_wird_reproduziert(self):
        pfad = HIER / f"ergebnis-v{L.PROTOKOLL['version']}.json"
        self.assertTrue(pfad.exists(), "Zur Protokollversion fehlt der gespeicherte Bericht; neue Version = neue Datei")
        gespeichert = json.loads(pfad.read_text(encoding="utf-8"))
        self.assertEqual(gespeichert["protokoll"], L.PROTOKOLL)
        self.assertEqual(gespeichert["protokoll_sha256"],
                         hashlib.sha256(json.dumps(L.PROTOKOLL, sort_keys=True).encode()).hexdigest())
        daten = ROOT / "tools/trading/daten/BTC-USD.json"
        tage, p, h = L.laden(daten)
        n = tage.index(date.fromisoformat(gespeichert["daten_bis"])) + 1          # Datei darf inzwischen länger sein
        if n == len(tage):
            self.assertEqual(h, gespeichert["daten_sha256"], "Kursdatei ist nicht mehr die des Berichts")
        fehler = gleich(gespeichert["ergebnisse"], L.auswerten(tage[:n], p[:n]), "ergebnisse")
        self.assertEqual(fehler, [], "\n".join(fehler[:10]))
        beleg = gespeichert["historischer_signalbeleg"]
        ziele = {k: v[n - 1] for k, v in L.signale(p[:n]).items()}
        self.assertEqual(gleich(beleg["zielquoten"], ziele, "zielquoten"), [])
        self.assertEqual(gespeichert["versuch_id"], hashlib.sha256(json.dumps({
            "code": gespeichert["code_sha256"], "daten": gespeichert["daten_sha256"],
            "protokoll": gespeichert["protokoll_sha256"], "stichtag": gespeichert["datenqualitaet"]["stichtag_utc"],
        }, sort_keys=True).encode()).hexdigest())

    def test_versuch_id_bindet_stichtag_und_code(self):
        rows = [[str(date(2020, 1, 1) + timedelta(days=i)), p] for i, p in enumerate(preise(2200))]
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            daten = d / "daten.json"
            daten.write_text(json.dumps(rows))
            ids = []
            for tag in ("2026-10-29", "2026-10-30"):
                out = d / f"b-{tag}.json"
                r = subprocess.run([sys.executable, str(HIER / "labor.py"), "--daten", str(daten), "--ausgabe", str(out),
                                    "--stichtag", tag], capture_output=True, text=True)
                self.assertEqual(r.returncode, 0, r.stderr)
                res = json.loads(out.read_text(encoding="utf-8"))
                erwartet = hashlib.sha256(json.dumps({
                    "code": res["code_sha256"], "daten": res["daten_sha256"],
                    "protokoll": res["protokoll_sha256"], "stichtag": tag}, sort_keys=True).encode()).hexdigest()
                self.assertEqual(res["versuch_id"], erwartet)
                self.assertEqual(res["daten_sha256"], hashlib.sha256(daten.read_bytes()).hexdigest())
                self.assertEqual(res["code_sha256"], hashlib.sha256((HIER / "labor.py").read_bytes()).hexdigest())
                ids.append(res["versuch_id"])
            self.assertNotEqual(ids[0], ids[1])


if __name__ == "__main__":
    unittest.main()
