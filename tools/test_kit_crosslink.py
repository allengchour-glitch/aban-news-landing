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


class TestSichtbarkeitsSeiten(unittest.TestCase):
    """Die ki-sichtbarkeit-*-Seiten haben ein eigenes Hauptangebot und keine FAQ."""

    SEITE = ("<html><body><main><section><h2>Mehr</h2></section>\n"
             "</main>\n<footer>Impressum</footer>\n</body></html>")

    def test_ohne_faq_steht_der_kasten_im_inhalt_nicht_hinter_dem_footer(self):
        out = k.einfuegen(self.SEITE, k.block("aerzte", P_KAUF))
        self.assertLess(out.index(k.MARK), out.index("</main>"))
        self.assertLess(out.index(k.MARK), out.index("<footer>"))

    def test_eigene_einleitung_wird_verwendet(self):
        b = k.block("aerzte", P_KAUF, "Passend dazu:")
        self.assertIn("<strong>Passend dazu:</strong>", b)
        self.assertNotIn("Direkt loslegen?", b)

    def test_jede_zuordnung_zeigt_auf_ein_kit_und_eine_seite(self):
        kat = k.produkte()
        fehlende_kits = [s for s in k.KIT2SICHT if s not in kat]
        self.assertEqual(fehlende_kits, [], f"Kits ohne Produkt: {fehlende_kits}")
        fehlende_seiten = [a for al in k.KIT2SICHT.values() for a in al
                           if not (k.ROOT / f"ki-sichtbarkeit-{a}.html").is_file()]
        self.assertEqual(fehlende_seiten, [], f"Seiten fehlen: {fehlende_seiten}")

    def test_familien_decken_alle_seitentypen_ab(self):
        praefixe = [f[0] for f in k.familien()]
        self.assertEqual(praefixe,
                         ["ki-fuer-", "ki-sichtbarkeit-", "ki-fuer-", ""])

    def test_zweiter_lauf_aendert_die_sichtbarkeitsseite_nicht(self):
        einmal = bauen(self.SEITE, "aerzte", P_KAUF)
        self.assertEqual(einmal, bauen(einmal, "aerzte", P_KAUF))


class TestAllgemeinesAngebot(unittest.TestCase):
    """Die ~340 Branchen ohne eigenes Kit bekommen das branchen-übergreifende."""

    def test_seiten_mit_eigenem_kit_sind_ausgenommen(self):
        # Sonst überschriebe der spätere Lauf den passenden Kit-Kasten durch den
        # allgemeinen — die 25 besten Seiten würden stillschweigend schlechter.
        mit_kit = {a for al in k.KIT2BRANCH.values() for a in al}
        doppelt = mit_kit & set(k.uebrige_branchen())
        self.assertEqual(doppelt, set(), f"Seiten in beiden Familien: {doppelt}")

    def test_zusammen_ergeben_sie_alle_echten_branchen_seiten(self):
        mit_kit = {a for al in k.KIT2BRANCH.values() for a in al}
        echte = {f.name[len("ki-fuer-"):-len(".html")]
                 for f in k.ROOT.glob("ki-fuer-*.html") if k.ist_branchenseite(f)}
        self.assertEqual(mit_kit | set(k.uebrige_branchen()), echte)

    def test_themenseiten_sind_keine_branchen(self):
        # "KI für Bewerbung" oder "KI für Excel" sind Themen, keine Betriebe.
        # Eine Prompt-Bibliothek "für Solopreneure" gehört dort nicht hin.
        uebrig = set(k.uebrige_branchen())
        for thema in ("bewerbung", "excel", "lehrer", "youtube", "hausarbeiten",
                      "marketing", "podcast", "praesentationen"):
            if (k.ROOT / f"ki-fuer-{thema}.html").is_file():
                self.assertNotIn(thema, uebrig, f"Themen-Seite {thema} eingeschlossen")

    def test_filter_erkennt_den_unterschied(self):
        import tempfile, pathlib as pl
        with tempfile.TemporaryDirectory() as d:
            branche = pl.Path(d, "a.html"); branche.write_text(
                "<h2>Verwandte Branchen</h2>", encoding="utf-8")
            thema = pl.Path(d, "b.html"); thema.write_text("<p>nur Text</p>",
                                                           encoding="utf-8")
            self.assertTrue(k.ist_branchenseite(branche))
            self.assertFalse(k.ist_branchenseite(thema))

    def test_allgemeines_kit_ist_laut_katalog_branchenuebergreifend(self):
        p = k.produkte().get(k.ALLGEMEIN_KIT)
        self.assertIsNotNone(p, f"{k.ALLGEMEIN_KIT} fehlt im Katalog")
        self.assertIn("branchen-übergreifend", (p.get("desc") or "").lower())

    def test_reihenfolge_ist_stabil(self):
        self.assertEqual(k.uebrige_branchen(), k.uebrige_branchen())
        self.assertEqual(k.uebrige_branchen(), sorted(k.uebrige_branchen()))

    def test_allgemeine_familie_laeuft_nach_den_kit_familien(self):
        # Sie ersetzt einen vorhandenen Kasten. Liefe sie vor den Kit-Familien,
        # stünde am Ende auf jeder Seite das allgemeine statt des passenden Kits.
        zuordnungen = [f[1] for f in k.familien()]
        self.assertEqual(zuordnungen[0], k.KIT2BRANCH)
        allgemein = zuordnungen.index({k.ALLGEMEIN_KIT: k.uebrige_branchen()})
        self.assertGreater(allgemein, zuordnungen.index(k.KIT2BRANCH))
        self.assertGreater(allgemein, zuordnungen.index(k.KIT2SICHT))


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

class TestThemenSeiten(unittest.TestCase):
    """Die Themen-Familie: viel verlinkte Seiten, die bisher gar keinen
    Kaufweg hatten. Hier gibt es keinen Namens-Automatismus, der eine falsche
    Zuordnung verhindern würde — also prüfen die Tests jede Zeile einzeln."""

    def _themen(self):
        return [(s, a) for s, al in k.KIT2THEMA.items() for a in al]

    def test_jede_seite_existiert(self):
        fehlend = [a for _s, a in self._themen()
                   if not (k.ROOT / f"{a}.html").is_file()]
        self.assertEqual(fehlend, [], f"Seiten fehlen: {fehlend}")

    def test_jedes_produkt_steht_im_katalog(self):
        kat = k.produkte()
        self.assertTrue(kat, "data/shop-products.json ist leer oder fehlt")
        fehlend = [s for s in k.KIT2THEMA if s not in kat]
        self.assertEqual(fehlend, [], f"Produkte fehlen: {fehlend}")

    def test_keine_seite_steht_in_zwei_familien(self):
        # Sonst überschriebe die spätere Familie den Kasten der früheren.
        branchen = {f"ki-fuer-{a}.html" for al in k.KIT2BRANCH.values() for a in al}
        branchen |= {f"ki-fuer-{a}.html" for a in k.uebrige_branchen()}
        sicht = {f"ki-sichtbarkeit-{a}.html" for al in k.KIT2SICHT.values() for a in al}
        themen = {f"{a}.html" for _s, a in self._themen()}
        self.assertEqual(themen & (branchen | sicht), set())

    def test_keine_seite_ist_eine_branchenseite(self):
        # Eine Branchen-Seite gehört in die Branchen-Familie, nicht hierher.
        falsch = [a for _s, a in self._themen()
                  if k.ist_branchenseite(k.ROOT / f"{a}.html")]
        self.assertEqual(falsch, [], f"gehören zur Branchen-Familie: {falsch}")

    def test_noindex_seiten_stehen_nicht_in_der_liste(self):
        # Der Generator überspringt sie; ein Eintrag sähe nur nach Wirkung aus.
        import re
        noindex = [a for _s, a in self._themen()
                   if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex',
                                (k.ROOT / f"{a}.html").read_text(encoding="utf-8",
                                                                 errors="ignore"), re.I)]
        self.assertEqual(noindex, [], f"auf noindex, wird übersprungen: {noindex}")

    def test_familie_steht_in_familien(self):
        self.assertIn(("", k.KIT2THEMA, "Passend dazu:"), k.familien())


class TestLesbarkeit(unittest.TestCase):
    """Der Kasten bringt seine eigene helle Fläche mit. Ohne eigene Textfarbe
    erbt er auf einer Seite mit Dark-Mode die helle Schrift und steht hell auf
    hell — gemessen 1,10:1, also unlesbar."""

    @staticmethod
    def _kontrast(a: str, b: str) -> float:
        def lum(h):
            c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
            c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
            return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
        l1, l2 = sorted((lum(a), lum(b)), reverse=True)
        return (l1 + 0.05) / (l2 + 0.05)

    def test_kasten_setzt_eine_eigene_textfarbe(self):
        self.assertIn("color:#1f2937", k.block("aerzte", P_KAUF))

    def test_textfarbe_hat_genug_kontrast_auf_der_flaeche(self):
        self.assertGreaterEqual(self._kontrast("#1f2937", "#fff7ed"), 4.5)

    def test_gegenprobe_helle_schrift_waere_durchgefallen(self):
        # Ohne den Fix geerbt: --ink im Dark-Mode der Seiten.
        self.assertLess(self._kontrast("#f3ede2", "#fff7ed"), 4.5)

    def test_knopf_und_links_bleiben_lesbar(self):
        self.assertGreaterEqual(self._kontrast("#ffffff", "#b45309"), 4.5)
        self.assertGreaterEqual(self._kontrast("#b45309", "#fff7ed"), 4.5)

class TestSeitenImRepo(unittest.TestCase):
    """Prüft die gebauten Seiten, nicht nur die Funktionen. Fünf Seiten trugen
    einen von Hand getippten Kasten mit „Einmalig 19 CHF", während der Katalog
    seit dem 01.10. 14 sagt — ein falscher Preis bleibt sonst jahrelang stehen,
    weil ihn kein Funktions-Test sieht."""

    @classmethod
    def setUpClass(cls):
        import re
        cls.re = re
        cls.kat = k.produkte()
        cls.seiten = [p for p in k.ROOT.glob("*.html")
                      if k.MARK in p.read_text(encoding="utf-8", errors="ignore")]

    def test_es_gibt_ueberhaupt_seiten_mit_kasten(self):
        # Gegenprobe: ohne diese Zusicherung wären alle Tests unten leer grün.
        self.assertGreater(len(self.seiten), 300)

    def test_jeder_kasten_traegt_preis_titel_und_link_aus_dem_katalog(self):
        import html as _h
        falsch = []
        for p in self.seiten:
            t = p.read_text(encoding="utf-8", errors="ignore")
            for m in self.re.finditer(
                    r'<aside[^>]*data-kit-slug="([^"]+)".*?</aside>', t, self.re.S):
                slug, kasten = m.group(1), m.group(0)
                pr = self.kat.get(slug)
                if not pr:
                    falsch.append(f"{p.name}: {slug} fehlt im Katalog")
                    continue
                for feld, wert in (("Preis", pr.get("price")),
                                   ("Kauf-Link", pr.get("buy")),
                                   ("Titel", _h.escape(pr["title"]))):
                    if wert and wert not in kasten:
                        falsch.append(f"{p.name}: {feld} weicht ab")
        self.assertEqual(falsch, [], "; ".join(falsch[:5]))

    def test_jeder_kasten_hat_einen_slug(self):
        # Ein Kasten ohne Slug ist von Hand getippt: niemand gleicht ihn je ab.
        ohne = [p.name for p in self.seiten
                if "data-kit-slug" not in p.read_text(encoding="utf-8", errors="ignore")]
        self.assertEqual(ohne, [], f"Kasten ohne Slug: {ohne}")

    def test_hoechstens_ein_kasten_und_ein_skript_je_seite(self):
        doppelt = []
        for p in self.seiten:
            t = p.read_text(encoding="utf-8", errors="ignore")
            if t.count(k.MARK) != 1 or t.count("/js/kit-preis.js") != 1:
                doppelt.append(p.name)
        self.assertEqual(doppelt, [], f"doppelt oder fehlend: {doppelt}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
