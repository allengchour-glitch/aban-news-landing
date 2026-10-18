#!/usr/bin/env python3
"""Hält das verkaufte Audit-Workbook und seine Verkaufsseite ehrlich zueinander."""
from __future__ import annotations
import json
import pathlib
import re
import subprocess
import sys
import unittest

HIER = pathlib.Path(__file__).resolve().parent
ROOT = HIER.parents[1]
SLUG = "ki-sichtbarkeit-audit"
PACK = ROOT / "content" / "packs" / "de" / SLUG
SEITE = ROOT / f"{SLUG}.html"


def katalog():
    return json.loads((ROOT / "data" / "kit-catalog.json").read_text(encoding="utf-8"))


def eintrag():
    return next(e for e in katalog() if e["slug"] == SLUG)


class TestPaket(unittest.TestCase):
    def test_alle_dateien_da(self):
        for name in ("ki-sichtbarkeit-audit.html", "ANLEITUNG.md", "LIESMICH.txt"):
            self.assertTrue((PACK / name).is_file(), name)

    def test_workbook_ist_eigenstaendig(self):
        # Ein gekauftes Produkt muss offline laufen: kein externes Skript,
        # kein Stylesheet, kein Bild von aussen.
        h = (PACK / "ki-sichtbarkeit-audit.html").read_text(encoding="utf-8")
        self.assertEqual(re.findall(r'<(?:script|link|img)[^>]*(?:src|href)="https?://[^"]*"', h), [])

    def test_engine_ist_eingebaut(self):
        h = (PACK / "ki-sichtbarkeit-audit.html").read_text(encoding="utf-8")
        self.assertIn("window.AUDIT", h)
        self.assertNotIn("/*ENGINE*/", h)

    def test_bau_ist_aktuell(self):
        # Gegenprobe gegen eine veraltete Auslieferung: Engine oder Vorlage
        # geändert, aber nicht neu gebaut.
        vorher = (PACK / "ki-sichtbarkeit-audit.html").read_text(encoding="utf-8")
        subprocess.run([sys.executable, str(HIER / "build.py")], check=True,
                       capture_output=True)
        self.assertEqual((PACK / "ki-sichtbarkeit-audit.html").read_text(encoding="utf-8"), vorher)

    def test_kein_ergebnis_versprochen(self):
        # Die Verkaufsseite sagt ausdrücklich, dass niemand eine Nennung
        # garantieren kann. Das Produkt darf dem nicht widersprechen.
        for datei in PACK.iterdir():
            t = datei.read_text(encoding="utf-8", errors="replace").lower()
            self.assertNotIn("garantiert genannt", t, datei.name)
            self.assertNotIn("garantie auf nennung wird", t, datei.name)


class TestKatalog(unittest.TestCase):
    def test_eintrag_vorhanden_und_standalone(self):
        e = eintrag()
        self.assertTrue(e.get("standalone"), "kein Branchen-Kit → gehört nicht ins Bundle")
        self.assertEqual(e["currency"], "chf")

    def test_preis_stimmt_mit_der_seite_ueberein(self):
        # Die wichtigste Gegenprobe: Katalog und sichtbarer Preis dürfen
        # nie auseinanderlaufen.
        s = SEITE.read_text(encoding="utf-8")
        preise = set(re.findall(r'<div class="price">\s*([0-9]+)\s*€', s))
        self.assertEqual(preise, {str(eintrag()["price_cents"] // 100)}, preise)

    def test_slug_ist_einmalig(self):
        slugs = [e["slug"] for e in katalog()]
        self.assertEqual(len(slugs), len(set(slugs)))


class TestVerkaufsseite(unittest.TestCase):
    def test_holt_den_kauflink_aus_dem_katalog(self):
        s = SEITE.read_text(encoding="utf-8")
        self.assertIn("/data/shop-products.json", s)
        self.assertIn(f"x.slug==='{SLUG}'", s)

    def test_mail_bleibt_als_rueckfall(self):
        # Ohne Kauf-Link darf kein toter Knopf stehen.
        self.assertIn("mailto:hallo@abannews.com", SEITE.read_text(encoding="utf-8"))

    def test_jeder_versprochene_schritt_kommt_im_workbook_vor(self):
        h = (PACK / "ki-sichtbarkeit-audit.html").read_text(encoding="utf-8")
        for begriff in ("Fragen sammeln", "KI befragen", "Ursachen finden",
                        "90-Tage-Plan", "Nachmessen"):
            self.assertIn(begriff, h, begriff)

    def test_die_drei_dienste_der_seite_stehen_im_workbook(self):
        h = (PACK / "ki-sichtbarkeit-audit.html").read_text(encoding="utf-8")
        for d in ("ChatGPT", "Perplexity", "Google AI"):
            self.assertIn(d, h, d)


class TestEngineTests(unittest.TestCase):
    def test_js_tests_laufen_durch(self):
        r = subprocess.run(["node", str(HIER / "test_engine.js")], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertNotIn("❌", r.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
