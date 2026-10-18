#!/usr/bin/env python3
"""Gegenproben zu tools/branchen_paare.py."""
import pathlib
import re
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import branchen_paare as B  # noqa: E402

WURZEL = B.WURZEL


class TestLesen(unittest.TestCase):
    def test_branchenname_aus_dem_titel(self):
        self.assertEqual(
            B.branchenname("<title>Empfiehlt ChatGPT Maler &amp; Lackierer? | aban news</title>"),
            "Maler & Lackierer")

    def test_fremder_titel_gibt_keinen_namen(self):
        # Gegenprobe: ohne das Muster darf NICHTS geraten werden, sonst
        # stuende auf einer beliebigen Seite ein erfundener Branchenname.
        self.assertIsNone(B.branchenname("<title>KI für Maler | aban news</title>"))

    def test_titel_ohne_markenzusatz(self):
        self.assertEqual(B.titel("<title>KI für Maler · aban news</title>"), "KI für Maler")

    def test_preis_monatlich_und_einmalig(self):
        self.assertEqual(
            B.preis('<div class="price">9 €<small> / Monat · Monitor</small></div>'),
            ("9", "/ Monat · Monitor"))
        self.assertEqual(
            B.preis('<div class="price">29 €<small> einmalig</small></div>'),
            ("29", "einmalig"))

    def test_kein_preis_kasten(self):
        self.assertIsNone(B.preis("<p>9 €</p>"))


class TestBloecke(unittest.TestCase):
    def test_abo_wird_als_abo_benannt(self):
        t = B.block_rat("Maler", "ki-sichtbarkeit-maler.html", ("9", "/ Monat · Monitor"))
        self.assertIn("ab 9 € im Monat", t)
        self.assertNotIn("einmalig", t)

    def test_einmalpreis_wird_als_einmalig_benannt(self):
        t = B.block_rat("Maler", "ki-sichtbarkeit-maler.html", ("29", "einmalig"))
        self.assertIn("29 € einmalig", t)
        self.assertNotIn("im Monat", t)

    def test_ohne_preis_keine_zahl(self):
        # Wichtigste Gegenprobe: lieber kein Preis als ein erfundener.
        t = B.block_rat("Maler", "ki-sichtbarkeit-maler.html", None)
        self.assertNotIn("€", t)

    def test_sonderzeichen_werden_maskiert(self):
        t = B.block_rat('Maler & "Lackierer"', "x.html", None)
        self.assertIn("&amp;", t)
        self.assertNotIn('"Lackierer"', t)


class TestSetzen(unittest.TestCase):
    RUMPF = "<main>\n<p>Inhalt</p>\n</main>\n"

    def test_block_landet_vor_main_ende(self):
        neu = B.setzen(self.RUMPF, B.BLOCK_RAT, B.block_rat("Maler", "z.html", None))
        self.assertLess(neu.index("data-aban-branchen-paar"), neu.index("</main>"))

    def test_zweiter_lauf_aendert_nichts(self):
        blk = B.block_rat("Maler", "z.html", None)
        a = B.setzen(self.RUMPF, B.BLOCK_RAT, blk)
        self.assertEqual(a, B.setzen(a, B.BLOCK_RAT, blk))

    def test_kein_zweiter_block(self):
        blk = B.block_rat("Maler", "z.html", None)
        a = B.setzen(B.setzen(self.RUMPF, B.BLOCK_RAT, blk), B.BLOCK_RAT, blk)
        self.assertEqual(a.count("data-aban-branchen-paar"), 1)
        self.assertEqual(a.count(B.MARKE_RAT), 1)

    def test_geaenderter_text_ersetzt_den_alten(self):
        a = B.setzen(self.RUMPF, B.BLOCK_RAT, B.block_rat("Maler", "alt.html", None))
        b = B.setzen(a, B.BLOCK_RAT, B.block_rat("Maler", "neu.html", None))
        self.assertIn("neu.html", b)
        self.assertNotIn("alt.html", b)

    def test_seite_ohne_main_bleibt_unberuehrt(self):
        h = "<body><p>nix</p></body>"
        self.assertEqual(B.setzen(h, B.BLOCK_RAT, "<aside>x</aside>"), h)

    def test_ohne_main_wird_ein_alter_block_nicht_entfernt(self):
        # Ohne Einhaengepunkt darf die Seite NICHT halb bearbeitet
        # zurueckkommen — sonst reisst ein Lauf den alten Block heraus
        # und setzt keinen neuen an seine Stelle.
        h = "<body>" + B.block_rat("Maler", "z.html", None) + "</body>"
        self.assertEqual(B.setzen(h, B.BLOCK_RAT, B.block_rat("Maler", "z.html", None)), h)

    def test_restlicher_inhalt_bleibt(self):
        neu = B.setzen(self.RUMPF, B.BLOCK_RAT, B.block_rat("Maler", "z.html", None))
        self.assertIn("<p>Inhalt</p>", neu)


class TestPaare(unittest.TestCase):
    def test_es_gibt_paare(self):
        self.assertGreaterEqual(len(B.paare()), 20)

    def test_beide_dateien_existieren(self):
        for rat, verk in B.paare():
            self.assertTrue(rat.exists(), rat)
            self.assertTrue(verk.exists(), verk)

    def test_handpaare_zeigen_auf_vorhandene_ratgeber(self):
        # Gegenprobe gegen Tippfehler in der Handzuordnung.
        for slug, ziel in B.HANDPAARE.items():
            self.assertTrue((WURZEL / f"ki-sichtbarkeit-{slug}.html").exists(), slug)
            self.assertTrue((WURZEL / f"ki-fuer-{ziel}.html").exists(), ziel)

    def test_kein_ratgeber_doppelt_zugeordnet(self):
        namen = [r.name for r, _ in B.paare()]
        self.assertEqual(len(namen), len(set(namen)))


class TestRepo(unittest.TestCase):
    """Die Dateien im Repo tragen den Block wirklich — genau einmal."""

    def test_beide_richtungen_verlinkt(self):
        for rat, verk in B.paare():
            hr = rat.read_text(encoding="utf-8")
            hv = verk.read_text(encoding="utf-8")
            self.assertIn(f'href="/{verk.name}"', hr, rat.name)
            self.assertIn(f'href="/{rat.name}"', hv, verk.name)

    def test_genau_ein_block_je_seite(self):
        for rat, verk in B.paare():
            self.assertEqual(rat.read_text(encoding="utf-8").count(B.MARKE_RAT), 1, rat.name)
            self.assertEqual(verk.read_text(encoding="utf-8").count(B.MARKE_VERK), 1, verk.name)

    def test_lauf_ist_abgeschlossen(self):
        self.assertEqual(B.lauf(schreiben=False), [])

    def test_lauf_meldet_beide_richtungen_nach(self):
        # Die anderen Repo-Tests lesen nur fertige Dateien — der Erzeuger
        # laeuft darin nie. Genau so ist in der Runde davor eine Mutation
        # durchgerutscht. Hier wird je eine Seite entschaerft und geprueft,
        # dass lauf() beide Richtungen wieder nachtraegt.
        rat, verk = B.paare()[0]
        sicher = {p: p.read_text(encoding="utf-8") for p in (rat, verk)}
        try:
            rat.write_text(B.BLOCK_RAT.sub("", sicher[rat]), encoding="utf-8")
            verk.write_text(B.BLOCK_VERK.sub("", sicher[verk]), encoding="utf-8")
            offen = B.lauf(schreiben=False)
            self.assertIn(rat.name, offen)
            self.assertIn(verk.name, offen)
        finally:
            for p, inhalt in sicher.items():
                p.write_text(inhalt, encoding="utf-8")

    def test_kein_block_auf_fremden_seiten(self):
        # Gegenprobe: der Block darf NUR auf den Paar-Seiten stehen.
        erlaubt = {p.name for paar in B.paare() for p in paar}
        for p in WURZEL.glob("*.html"):
            if p.name in erlaubt:
                continue
            h = p.read_text(encoding="utf-8", errors="replace")
            self.assertNotIn(B.MARKE_RAT, h, p.name)
            self.assertNotIn(B.MARKE_VERK, h, p.name)

    def test_link_ziele_sind_echte_dateien(self):
        for rat, verk in B.paare():
            for quelle in (rat, verk):
                h = quelle.read_text(encoding="utf-8")
                blk = re.search(r"<aside data-aban-branchen-(?:paar|ratgeber)\b.*?</aside>", h, re.S)
                self.assertIsNotNone(blk, quelle.name)
                for ziel in re.findall(r'href="/([^"]+)"', blk.group(0)):
                    self.assertTrue((WURZEL / ziel).exists(), f"{quelle.name} -> {ziel}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
