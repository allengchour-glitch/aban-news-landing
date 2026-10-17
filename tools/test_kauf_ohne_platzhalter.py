#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests für tools/kauf_ohne_platzhalter.py."""
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kauf_ohne_platzhalter as k  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PH = "https://gumroad.com/l/PLATZHALTER-MIETVERTRAG"
ALT = ('<title>Mietvertrag Vorlage Schweiz — CHF 39</title>'
       '{"url": "' + PH + '"}'
       '<a class="cta" href="' + PH + '" rel="nofollow">Jetzt herunterladen →</a>'
       '</body>')


class TestUmbau(unittest.TestCase):
    def neu(self):
        return k.umbauen(ALT, "mietvertrag-vorlage-schweiz.html")

    def test_platzhalter_ist_weg(self):
        self.assertNotIn("PLATZHALTER", self.neu())

    def test_knopf_fuehrt_auf_den_mail_weg(self):
        self.assertIn("mailto:hallo@abannews.com", self.neu())

    def test_beschriftung_sagt_was_passiert(self):
        # Ohne Zahlungs-Link darf dort nicht "Jetzt herunterladen" stehen.
        self.assertIn(">" + k.MAIL_LABEL + "</a>", self.neu())

    def test_alte_beschriftung_bleibt_fuer_spaeter_erhalten(self):
        self.assertIn('data-aban-buy-label="Jetzt herunterladen →"', self.neu())

    def test_aussehen_bleibt(self):
        # Ohne die class sieht der Kauf-Knopf plötzlich aus wie ein Textlink.
        self.assertIn('class="cta"', self.neu())

    def test_schluessel_kommt_aus_dem_seitennamen(self):
        self.assertIn('data-aban-buy="MIETVERTRAG_VORLAGE_SCHWEIZ_BUY_URL"', self.neu())

    def test_schluessel_kollidiert_nicht_mit_bestehenden(self):
        # PLATZHALTER-VORLAGEN ergäbe VORLAGEN_BUY_URL — den gibt es schon,
        # für ein anderes Produkt zu einem anderen Preis.
        cfg = (ROOT / "js" / "checkout-config.js").read_text(encoding="utf-8")
        schluessel = re.findall(r'^\s*([A-Z_0-9]+):', cfg, re.M)
        self.assertEqual(len(schluessel), len(set(schluessel)))

    def test_json_ld_zeigt_auf_die_seite(self):
        self.assertIn('"url": "https://abannews.com/mietvertrag-vorlage-schweiz.html"',
                      self.neu())

    def test_hinweis_steht_hinter_dem_knopf(self):
        self.assertIn("Kein Sofort-Download", self.neu())

    def test_skript_raeumt_den_hinweis_weg(self):
        # Sobald ein Zahlungs-Link eingetragen ist, stimmt der Hinweis nicht mehr.
        self.assertIn("-hinweis", k.SKRIPT)
        self.assertIn("removeChild", k.SKRIPT)

    def test_skript_setzt_ziel_und_beschriftung(self):
        # Textprüfung: Python führt das JavaScript nicht aus.
        self.assertIn("a[i].href=u", k.SKRIPT)
        self.assertIn("textContent=t", k.SKRIPT)

    def test_falsches_zahlungsversprechen_wird_richtiggestellt(self):
        # "Abwicklung über Gumroad" stimmte nicht — der Eintrag ist 404.
        satz = ("Abwicklung über Gumroad · Kreditkarte, PayPal, Apple/Google Pay"
                " · sofortiger Download-Link per E-Mail")
        mit = ALT.replace("</body>", f"<p>{satz}</p></body>")
        neu = k.umbauen(mit, "mietvertrag-vorlage-schweiz.html")
        self.assertNotIn("Gumroad", neu)
        self.assertIn("Bestellung per E-Mail", neu)

    def test_zweiter_lauf_aendert_nichts(self):
        einmal = self.neu()
        self.assertEqual(einmal, k.umbauen(einmal, "mietvertrag-vorlage-schweiz.html"))

    def test_zweiter_lauf_verdoppelt_hinweis_und_skript_nicht(self):
        zwei = k.umbauen(self.neu(), "mietvertrag-vorlage-schweiz.html")
        self.assertEqual(zwei.count("Kein Sofort-Download"), 1)
        self.assertEqual(zwei.count(k.CFG), 1)

    def test_gegenprobe_echter_gumroad_link_bleibt(self):
        # chourallen.gumroad.com/l/ki-tools-dach antwortet mit 200 — ein
        # funktionierender Kauf-Link darf nicht zum Mail-Weg werden.
        echt = ('<title>X</title><a href="https://chourallen.gumroad.com/l/ki-tools-dach"'
                ' class="btn">Kaufen</a></body>')
        self.assertEqual(k.umbauen(echt, "x.html"), echt)

    def test_gegenprobe_seite_ohne_platzhalter_bleibt_unberuehrt(self):
        ohne = "<title>X</title><p>nichts</p></body>"
        self.assertEqual(k.umbauen(ohne, "x.html"), ohne)


class TestSeitenImRepo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.seiten = [p for p in ROOT.glob("*.html")
                      if k.MARK + '="' in p.read_text(encoding="utf-8", errors="ignore")]

    def test_es_gibt_seiten_mit_knopf(self):
        # Gegenprobe: sonst wären die Prüfungen unten leer grün.
        self.assertGreaterEqual(len(self.seiten), 12)

    def test_kein_platzhalter_mehr_in_den_seiten(self):
        for p in ROOT.glob("*.html"):
            h = p.read_text(encoding="utf-8", errors="ignore")
            self.assertNotIn("gumroad.com/l/PLATZHALTER", h, p.name)

    def test_jeder_knopf_hat_ein_ziel_und_einen_schluessel(self):
        for p in self.seiten:
            h = p.read_text(encoding="utf-8", errors="ignore")
            for a in re.findall(r'<a [^>]*' + k.MARK + r'="[^"]*"[^>]*>', h):
                self.assertIn('href="mailto:', a, p.name)

    def test_jede_seite_laedt_konfiguration_und_skript_genau_einmal(self):
        for p in self.seiten:
            h = p.read_text(encoding="utf-8", errors="ignore")
            self.assertEqual(h.count(k.CFG), 1, p.name)
            self.assertEqual(h.count(k.MARK + "-js"), 1, p.name)

    def test_alle_schluessel_sind_angelegt(self):
        cfg = (ROOT / "js" / "checkout-config.js").read_text(encoding="utf-8")
        for p in self.seiten:
            h = p.read_text(encoding="utf-8", errors="ignore")
            for s in set(re.findall(k.MARK + r'="([A-Z_0-9]+)"', h)):
                self.assertIn(s + ":", cfg, p.name)

    def test_kein_anbieter_versprochen_den_es_nicht_gibt(self):
        for p in self.seiten:
            h = p.read_text(encoding="utf-8", errors="ignore")
            self.assertNotIn("Gumroad", h, p.name)


if __name__ == "__main__":
    unittest.main(verbosity=2)
