from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import subprocess
import sys
import unittest
from tagespflege import HOST, WORKFLOWS, github_lesen, indexnow, seiten_pruefen, google_sitemap

KEY = "example-key-1234"
URL = "https://abannews.com/"


class PflegeTest(unittest.TestCase):
    def site(self, root, url=URL, html=None):
        (root / "sitemap.xml").write_text('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + url + '</loc></url></urlset>')
        (root / "index.html").write_text(html or '<html><head><title>Beispiel</title><meta name="description" content="Beschreibung"><link rel="canonical" href="https://abannews.com/"></head></html>')

    def test_inventar_und_noindex(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.site(root)
            scan = seiten_pruefen(root)
            self.assertEqual(scan["html_geprueft"], 1)
            self.assertIn(URL, scan["inventar"])
            self.site(root, html='<title>Intern</title><meta name="robots" content="noindex"><link rel="canonical" href="https://abannews.com/">')
            scan = seiten_pruefen(root)
            self.assertEqual(scan["inventar"], {})
            self.assertTrue(any(f["problem"] == "Noindex-Seite in Sitemap" for f in scan["befunde"]))

    def test_fremde_urls_und_pfadwechsel(self):
        for url in ["https://evil.example/a.html", "https://abannews.com/%2e%2e/ausserhalb.html", "https://abannews.com/?privat=1"]:
            with self.subTest(url=url), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                self.site(root, url)
                self.assertEqual(seiten_pruefen(root)["inventar"], {})

    def test_fehlende_datei_nicht_sauber(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.site(root, "https://abannews.com/fehlt.html")
            scan = seiten_pruefen(root)
            self.assertEqual(scan["html_geprueft"], 0)
            self.assertEqual(len(scan["befunde"]), 1)

    def test_robots_gesperrte_seiten_nicht_melden(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.site(root)
            (root / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
            scan = seiten_pruefen(root)
            self.assertEqual(scan["inventar"], {})
            self.assertTrue(any(f["problem"] == "Robots sperrt Sitemap-Seite" for f in scan["befunde"]))

    def test_xml_entitaeten_verboten(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "sitemap.xml").write_text('<!DOCTYPE a [<!ENTITY b "x">]><a/>')
            with self.assertRaises(ValueError):
                seiten_pruefen(root)

    def test_trockenlauf_hat_keinen_netzzugriff(self):
        def nicht_aufrufen(*args):
            self.fail("Trockenlauf darf nichts senden")
        report, state = indexnow({URL: "hash"}, {}, "", call=nicht_aufrufen)
        self.assertEqual(report["status"], "Trockenlauf")
        self.assertEqual(state, {})

    def test_schluessel_fehlt_oder_falsch_keine_meldung(self):
        calls = []
        def fake(method, url, *args):
            calls.append(method)
            return 200, b"falscher Schluessel"
        report, state = indexnow({URL: "h"}, {}, KEY, True, call=fake)
        self.assertEqual(calls, ["GET"])
        self.assertEqual(report["gemeldet"], 0)
        self.assertEqual(state, {})

    def test_200_bestaetigt_nur_ausgewaehlte_aenderungen(self):
        payload = []
        def fake(method, url, headers=None, data=None):
            if method == "GET":
                return 200, KEY.encode()
            payload.append(json.loads(data))
            return 200, b""
        inv = {URL: "h1", URL + "neu.html": "h2"}
        report, state = indexnow(inv, {}, KEY, True, limit=1, call=fake)
        self.assertEqual(report["gemeldet"], 1)
        self.assertEqual(len(state["bestaetigt"]), 1)
        self.assertEqual(payload[0]["host"], HOST)
        self.assertEqual(report["indexierung"], "Nicht gemessen")
        report2, _ = indexnow(inv, state, "", call=fake)
        self.assertEqual(report2["geaendert_oder_neu"], 1)

    def test_202_und_429_nicht_als_indexiert(self):
        for code in (202, 429, 403, 500):
            with self.subTest(code=code):
                calls = []
                def fake(method, *args):
                    calls.append(method)
                    return (200, KEY.encode()) if method == "GET" else (code, b"")
                report, state = indexnow({URL: "h"}, {}, KEY, True, call=fake)
                self.assertEqual(calls, ["GET", "POST"])
                self.assertEqual(state, {})
                self.assertEqual(report["gemeldet"], 0)

    def test_unveraendert_kein_netzzugriff(self):
        report, _ = indexnow({URL: "h"}, {"host": HOST, "bestaetigt": {URL: "h"}}, KEY, True,
                             call=lambda *args: self.fail("Keine erneute Meldung"))
        self.assertEqual(report["status"], "Keine Änderungen")

    def test_github_drosselung_stoppt_folgeabfragen(self):
        calls = []
        def fake(*args):
            calls.append(args)
            return 429, b""
        result = github_lesen(Path("."), "nicht-echt", fake)
        self.assertEqual(len(calls), 1)
        self.assertEqual(len(result), len(WORKFLOWS))
        self.assertTrue(all("fehler" in r for r in result.values()))

    def test_buero_unmessbar_wird_nicht_gruen_und_private_daten_bleiben_alt(self):
        path = Path(__file__).with_name("make_buero.py")
        spec = importlib.util.spec_from_file_location("buero_pflege", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        rows = deepcopy(mod.ROWS)
        privat = deepcopy(next(r for r in rows if r["id"] == "offene"))
        report = {"version": 1, "seite": HOST, "gemessen": "2026-11-07T23:00:00Z", "indexnow": {"status": "Trockenlauf"},
                  "seiten": {"html_geprueft": 1, "befunde": []}, "github": {"auswahl": {"fehler": "HTTP 403"}}}
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "report.json"
            p.write_text(json.dumps(report))
            mod.pflege_einlesen(p, rows)
        self.assertEqual(next(r for r in rows if r["id"] == "auswahl")["status"], "gelb")
        self.assertEqual(next(r for r in rows if r["id"] == "offene"), privat)


    def test_export_enthaelt_nur_github_und_keine_bestelldaten(self):
        report = {"version": 1, "seite": HOST, "gemessen": "2026-11-07T23:00:00Z", "indexnow": {"status": "Trockenlauf"},
                  "seiten": {"html_geprueft": 1, "befunde": []}, "github": {"auswahl": {"fehler": "Nicht messbar"}}}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "pflege.json").write_text(json.dumps(report))
            result = subprocess.run([sys.executable, "-I", str(Path(__file__).with_name("make_buero.py")), str(root / "export.json"),
                                     "--pflege-status", str(root / "pflege.json"), "--nur-github"], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            rows = json.loads((root / "export.json").read_text())
            self.assertEqual({r["id"] for r in rows}, {"auswahl", "seitenpflege"})
            self.assertNotIn("#1036", (root / "export.json").read_text())

    def test_erfolg_mit_pausiertem_plan_bleibt_gelb(self):
        spec = importlib.util.spec_from_file_location("buero_pflege_plan", Path(__file__).with_name("make_buero.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        rows = deepcopy(mod.ROWS)
        report = {"version": 1, "seite": HOST, "gemessen": "2026-11-07T23:00:00Z", "indexnow": {"status": "Keine Änderungen"},
                  "seiten": {"html_geprueft": 1, "befunde": []}, "github": {"social_meta": {
                      "status": "completed", "conclusion": "success", "zeit": "2026-11-07T20:00:00Z", "geplant": False}}}
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "report.json"
            p.write_text(json.dumps(report))
            mod.pflege_einlesen(p, rows)
        row = next(r for r in rows if r["id"] == "social_meta")
        self.assertEqual(row["status"], "gelb")
        self.assertEqual(row["aktiv_h"], 0)


    def test_google_trockenlauf_ohne_netzzugriff(self):
        r, state = google_sitemap(b"sitemap", {URL: "h"}, {}, "", call=lambda *a: self.fail("Kein Netz im Trockenlauf"))
        self.assertEqual(r["status"], "Trockenlauf")
        self.assertFalse(r["gemeldet"])
        self.assertEqual(state, {})

    def test_google_zugang_fehlt_kein_netzzugriff(self):
        r, state = google_sitemap(b"sitemap", {URL: "h"}, {}, "", True, call=lambda *a: self.fail("Kein Netz ohne Zugang"))
        self.assertIn("Einrichtung fehlt", r["status"])
        self.assertEqual(state, {})

    def test_google_nur_veroeffentlichte_sitemap(self):
        calls = []
        def fake(method, *args):
            calls.append(method)
            return 200, b"abweichende Live-Datei"
        r, state = google_sitemap(b"sitemap", {URL: "h"}, {}, "Demo", True, call=fake,
                                  token_loader=lambda _: self.fail("Keine Anmeldung vor Live-Prüfung"))
        self.assertEqual(calls, ["GET"])
        self.assertFalse(r["gemeldet"])
        self.assertEqual(state, {})

    def test_google_204_merkt_meldung_aber_nicht_indexierung(self):
        calls = []
        def fake(method, url, headers=None, data=None):
            calls.append((method, url, headers, data))
            return (200, b"sitemap") if method == "GET" else (204, b"")
        r, state = google_sitemap(b"sitemap", {URL: "h"}, {"host": HOST, "bestaetigt": {URL: "h"}}, "Demo", True,
                                  call=fake, token_loader=lambda _: "nur-test-token")
        self.assertTrue(r["gemeldet"])
        self.assertEqual(r["indexierung"], "Nicht gemessen")
        self.assertEqual(calls[1][0], "PUT")
        self.assertIn("sc-domain%3Aabannews.com", calls[1][1])
        self.assertIsNone(calls[1][3])
        self.assertNotIn("nur-test-token", json.dumps(r))
        self.assertEqual(state["bestaetigt"], {URL: "h"})
        r2, _ = google_sitemap(b"sitemap", {URL: "h"}, state, "Demo", True,
                                call=lambda *a: self.fail("Unverändert nicht erneut melden"))
        self.assertEqual(r2["status"], "Keine Änderungen")

    def test_google_429_keine_bestaetigung_oder_wiederholung(self):
        calls = []
        def fake(method, *args):
            calls.append(method)
            return (200, b"sitemap") if method == "GET" else (429, b"")
        r, state = google_sitemap(b"sitemap", {URL: "h"}, {}, "Demo", True, call=fake, token_loader=lambda _: "Demo")
        self.assertEqual(calls, ["GET", "PUT"])
        self.assertFalse(r["gemeldet"])
        self.assertEqual(state, {})

    def test_indexnow_erhaelt_google_bestaetigung(self):
        def fake(method, *args):
            return (200, KEY.encode()) if method == "GET" else (200, b"")
        _, state = indexnow({URL: "h"}, {"host": HOST, "google_sitemap": "hash"}, KEY, True, call=fake)
        self.assertEqual(state["google_sitemap"], "hash")


if __name__ == "__main__":
    unittest.main()
