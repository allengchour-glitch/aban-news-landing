#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests für tools/add_kit_crosslink.py (Kauf-Kasten der Branchen-Kits).

    python3 tools/test_kit_crosslink.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import add_kit_crosslink as k  # noqa: E402

P_KAUF = {"slug": "aerzte", "title": "KI-Starter-Kit für Ärzte & Praxen",
          "desc": "Spickzettel + erprobte Prompts.", "price": "CHF 12",
          "buy": "https://buy.stripe.com/test123"}
P_OHNE = {"slug": "maler", "title": "KI-Starter-Kit für Maler", "price": "CHF 12"}

SEITE = ("<html><body><p>Text</p>\n"
         "<h2>Häufige Fragen</h2><details><summary>A</summary></details>\n"
         "</body></html>")


def bauen(h: str, slug: str, p: dict) -> str:
    return k.skript(k.einfuegen(h, k.block(slug, p)))


class TestBlock(unittest.TestCase):
    def test_kauflink_fuehrt_direkt_zu_stripe(self):
        b = k.block("aerzte", P_KAUF)
        self.assertIn('href="https://buy.stripe.com/test123"', b)
        self.assertIn('target="_blank"', b)
        self.assertIn('rel="noopener"', b)

    def test_preis_und_titel_kommen_aus_den_daten(self):
        b = k.block("aerzte", P_KAUF)
        self.assertIn("CHF 12", b)
        self.assertIn("Ärzte &amp; Praxen", b)
        # Gegenprobe: ein anderer Preis schlägt durch, nichts ist hartcodiert.
        b2 = k.block("aerzte", {**P_KAUF, "price": "CHF 19"})
        self.assertIn("CHF 19", b2)
        self.assertNotIn("CHF 12", b2)

    def test_ohne_kauflink_fallback_auf_shop(self):
        b = k.block("maler", P_OHNE)
        self.assertIn('href="/shop.html#kit-maler"', b)
        self.assertNotIn("buy.stripe.com", b)

    def test_slug_steht_als_datenattribut_fuer_den_preisabgleich(self):
        self.assertIn('data-kit-slug="aerzte"', k.block("aerzte", P_KAUF))

    def test_anfuehrungszeichen_im_titel_zerlegen_das_attribut_nicht(self):
        b = k.block("x", {**P_KAUF, "title": 'Kit "Pro" & mehr'})
        self.assertNotIn('<a data-kit-kaufen href="https://buy.stripe.com/test123" '
                         'target="_blank" rel="noopener" style="">', b)
        self.assertIn("&quot;Pro&quot;", b)


class TestEinfuegen(unittest.TestCase):
    def test_wird_vor_der_faq_eingesetzt(self):
        out = k.einfuegen(SEITE, k.block("aerzte", P_KAUF))
        self.assertLess(out.index(k.MARK), out.index("Häufige Fragen"))

    def test_zweiter_lauf_erzeugt_keinen_zweiten_kasten(self):
        einmal = bauen(SEITE, "aerzte", P_KAUF)
        zweimal = bauen(einmal, "aerzte", P_KAUF)
        self.assertEqual(einmal, zweimal)
        self.assertEqual(zweimal.count(k.MARK), 1)
        self.assertEqual(zweimal.count("/js/kit-preis.js"), 1)

    def test_alter_textlink_block_wird_ersetzt_nicht_ergaenzt(self):
        alt = (f'<html><body><aside {k.MARK} style="x">Das fertige '
               '<a href="/shop.html#kit-aerzte">Kit</a>, einmalig 12 CHF.</aside>\n'
               "<h2>Häufige Fragen</h2></body></html>")
        out = bauen(alt, "aerzte", P_KAUF)
        self.assertEqual(out.count(k.MARK), 1)
        self.assertIn("buy.stripe.com/test123", out)
        self.assertNotIn("einmalig 12 CHF", out)

    def test_neuer_preis_ersetzt_den_alten_beim_erneuten_lauf(self):
        alt = bauen(SEITE, "aerzte", P_KAUF)
        neu = bauen(alt, "aerzte", {**P_KAUF, "price": "CHF 15"})
        self.assertIn("CHF 15", neu)
        self.assertNotIn("CHF 12", neu)
        self.assertEqual(neu.count(k.MARK), 1)

    def test_ohne_faq_landet_der_kasten_vor_body_ende(self):
        s = "<html><body><p>nur Text</p></body></html>"
        out = k.einfuegen(s, k.block("aerzte", P_KAUF))
        self.assertIn(k.MARK, out)
        self.assertLess(out.index(k.MARK), out.index("</body>"))


class TestSkript(unittest.TestCase):
    def test_wird_genau_einmal_eingehaengt(self):
        out = k.skript(k.skript(SEITE))
        self.assertEqual(out.count("/js/kit-preis.js"), 1)

    def test_seite_ohne_body_bleibt_unveraendert(self):
        s = "<p>Fragment</p>"
        self.assertEqual(k.skript(s), s)


class TestDaten(unittest.TestCase):
    def test_jede_branche_hat_ein_produkt_im_katalog(self):
        kat = k.produkte()
        self.assertTrue(kat, "data/shop-products.json ist leer oder fehlt")
        fehlend = [s for s in k.KIT2BRANCH if s not in kat]
        self.assertEqual(fehlend, [], f"Kits ohne Produkt: {fehlend}")

    def test_jede_gelistete_seite_existiert(self):
        fehlend = [a for al in k.KIT2BRANCH.values() for a in al
                   if not (k.ROOT / f"ki-fuer-{a}.html").is_file()]
        self.assertEqual(fehlend, [], f"Seiten fehlen: {fehlend}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
