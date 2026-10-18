#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests für tools/preis_auszeichnung.py."""
from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

import preis_auszeichnung as m  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent

KOPF = ('<link rel="canonical" href="https://abannews.com/x.html">'
        '<script type="application/ld+json">'
        '{"@context":"https://schema.org","@type":"Service","name":"X"}'
        '</script>')
ABO = KOPF + '<div class="price">9 €<small> / Monat · jederzeit kündbar</small></div>'
EINMAL = KOPF + '<div class="price">19 €<small> · einmalig</small></div>'


def ld(h: str) -> dict:
    return json.loads(re.search(
        r'<script type="application/ld\+json">(.*?)</script>', h, re.S).group(1))


class TestLesen(unittest.TestCase):
    def test_monatspreis_wird_als_monatlich_erkannt(self):
        self.assertEqual(m.preis_der_seite(ABO), ("9", True))

    def test_einmalpreis_ist_nicht_monatlich(self):
        self.assertEqual(m.preis_der_seite(EINMAL), ("19", False))

    def test_komma_wird_zum_punkt(self):
        h = KOPF + '<div class="price">9,99 €<small> · ohne Abo</small></div>'
        self.assertEqual(m.preis_der_seite(h), ("9.99", False))

    def test_ohne_preis_kasten_kein_preis(self):
        self.assertIsNone(m.preis_der_seite(KOPF))

    def test_zwei_kaesten_ergeben_keinen_preis(self):
        # Der eigentliche Grund für diese Regel: ki-tools-datensatz.html nennt
        # 19 € einmalig UND 9 €/Monat. Raten wäre hier der teure Fehler.
        h = (KOPF + '<div class="price">19 €<small> einmalig</small></div>'
                    '<div class="price">9 €<small> / Monat · Abo</small></div>')
        self.assertIsNone(m.preis_der_seite(h))


class TestAuszeichnen(unittest.TestCase):
    def test_abo_bekommt_monatsangabe(self):
        o = ld(m.umbauen(ABO))["offers"]
        self.assertEqual(o["price"], "9")
        self.assertEqual(o["priceCurrency"], "EUR")
        self.assertEqual(
            o["priceSpecification"]["referenceQuantity"]["unitCode"], "MON")

    def test_einmalkauf_bekommt_keine_monatsangabe(self):
        # Gegenprobe zum Test darüber: sonst würde aus 19 € einmalig ein Abo.
        self.assertNotIn("priceSpecification", ld(m.umbauen(EINMAL))["offers"])

    def test_preis_stammt_aus_dem_kasten_der_seite(self):
        # Keine Zahl im Skript: ändert sich der Kasten, ändert sich die Angabe.
        h = ABO.replace("9 €", "12 €")
        self.assertEqual(ld(m.umbauen(h))["offers"]["price"], "12")

    def test_adresse_kommt_aus_dem_canonical(self):
        self.assertEqual(ld(m.umbauen(ABO))["offers"]["url"],
                         "https://abannews.com/x.html")

    def test_ohne_canonical_keine_erfundene_adresse(self):
        h = ABO.replace('<link rel="canonical" href="https://abannews.com/x.html">', "")
        self.assertNotIn("url", ld(m.umbauen(h))["offers"])

    def test_verfuegbarkeit_wird_gesetzt(self):
        self.assertEqual(ld(m.umbauen(ABO))["offers"]["availability"],
                         "https://schema.org/InStock")

    def test_restliche_angaben_bleiben(self):
        d = ld(m.umbauen(ABO))
        self.assertEqual(d["@type"], "Service")
        self.assertEqual(d["name"], "X")
        self.assertEqual(d["@context"], "https://schema.org")


class TestNichtAnfassen(unittest.TestCase):
    def test_vorhandenes_angebot_bleibt_unveraendert(self):
        h = (ABO.replace('"name":"X"', '"name":"X","offers":{"@type":"Offer","price":"29"}'))
        self.assertEqual(m.umbauen(h), h)

    def test_organization_bekommt_keinen_preis(self):
        h = ABO.replace('"@type":"Service"', '"@type":"Organization"')
        self.assertEqual(m.umbauen(h), h)

    def test_website_bekommt_keinen_preis(self):
        h = ABO.replace('"@type":"Service"', '"@type":"WebSite"')
        self.assertEqual(m.umbauen(h), h)

    def test_nur_der_erste_passende_knoten(self):
        h = ABO + ('<script type="application/ld+json">'
                   '{"@context":"https://schema.org","@type":"Product","name":"Y"}'
                   '</script>')
        self.assertEqual(m.umbauen(h).count('"offers"'), 1)

    def test_kaputtes_json_bleibt_stehen(self):
        h = ABO.replace('"name":"X"}', '"name":"X"')
        self.assertEqual(m.umbauen(h), h)

    def test_liste_statt_objekt_bleibt_stehen(self):
        h = ABO.replace('{"@context":"https://schema.org","@type":"Service","name":"X"}',
                        '[{"@type":"Service"}]')
        self.assertEqual(m.umbauen(h), h)

    def test_zweiter_lauf_aendert_nichts(self):
        einmal = m.umbauen(ABO)
        self.assertEqual(m.umbauen(einmal), einmal)


class TestNeuerKnoten(unittest.TestCase):
    """Seiten ganz ohne strukturierte Daten bekommen einen Product-Knoten.

    Diese Tests prüfen die FUNKTION, nicht die schon erzeugten Dateien: eine
    Mutation im Namens-Aufbau fiel den Datei-Tests nicht auf, weil die Dateien
    beim Testlauf längst geschrieben waren.
    """

    SEITE = ('<title>KI rechtssicher in Arztpraxen — Compliance-Paket · aban news</title>'
             '<meta name="description" content="Vorlagen &amp; Checkliste.">'
             '<link rel="canonical" href="https://abannews.com/k.html">'
             '</head><div class="price">39 €<small> · einmalig</small></div>')

    def knoten(self, h=None):
        return ld(m.umbauen(h if h is not None else self.SEITE))

    def test_knoten_entsteht(self):
        self.assertEqual(self.knoten()["@type"], "Product")

    def test_markenzusatz_faellt_aus_dem_namen(self):
        # Gegenprobe zur Mutation „Marken-Zusatz bleibt": der Produktname ist
        # nicht der Seitentitel — " · aban news" gehört nicht hinein.
        name = self.knoten()["name"]
        self.assertEqual(name, "KI rechtssicher in Arztpraxen — Compliance-Paket")
        self.assertNotIn("aban news", name)

    def test_name_ohne_zusatz_bleibt_unveraendert(self):
        h = self.SEITE.replace(" · aban news", "")
        self.assertEqual(self.knoten(h)["name"],
                         "KI rechtssicher in Arztpraxen — Compliance-Paket")

    def test_beschreibung_kommt_aus_der_meta(self):
        self.assertEqual(self.knoten()["description"], "Vorlagen & Checkliste.")

    def test_preis_steht_im_neuen_knoten(self):
        self.assertEqual(self.knoten()["offers"]["price"], "39")

    def test_ohne_beschreibung_kein_knoten(self):
        h = re.sub(r'<meta name="description"[^>]*>', "", self.SEITE)
        self.assertEqual(m.umbauen(h), h)

    def test_ohne_titel_kein_knoten(self):
        h = re.sub(r"<title>.*?</title>", "", self.SEITE, flags=re.S)
        self.assertEqual(m.umbauen(h), h)

    def test_knoten_steht_im_kopf(self):
        neu = m.umbauen(self.SEITE)
        self.assertLess(neu.index("application/ld+json"), neu.index("</head>"))

    def test_zweiter_lauf_legt_keinen_zweiten_an(self):
        einmal = m.umbauen(self.SEITE)
        self.assertEqual(m.umbauen(einmal).count("application/ld+json"), 1)


class TestRepo(unittest.TestCase):
    def setUp(self):
        self.seiten = m.ausgezeichnet()

    def test_es_gibt_genug_betroffene_seiten(self):
        # Gegenprobe: fände das Skript nichts, wären alle Tests oben wertlos.
        self.assertGreater(len(self.seiten), 20)

    def test_jede_betroffene_seite_hat_jetzt_ein_angebot(self):
        offen = [p.name for p in self.seiten
                 if '"offers"' not in p.read_text(encoding="utf-8")]
        self.assertEqual(offen, [])

    def test_ausgezeichneter_preis_stimmt_mit_dem_sichtbaren(self):
        # Das ist der Punkt der ganzen Übung: kein Auseinanderlaufen.
        for p in self.seiten:
            h = p.read_text(encoding="utf-8")
            sichtbar, monatlich = m.preis_der_seite(h)
            knoten = [json.loads(b) for b in re.findall(
                r'<script type="application/ld\+json">(.*?)</script>', h, re.S)]
            mit = [k for k in knoten if isinstance(k, dict) and "offers" in k]
            self.assertEqual(len(mit), 1, p.name)
            self.assertEqual(mit[0]["offers"]["price"], sichtbar, p.name)
            self.assertEqual("priceSpecification" in mit[0]["offers"], monatlich, p.name)

    def test_kein_zweiter_angebots_knoten(self):
        # Regression: der erste Entwurf legte bei JEDEM weiteren Lauf einen
        # zweiten Product-Knoten an, weil ein schon ausgezeichneter Knoten
        # übersprungen wurde und der Ersatz-Zweig die Seite für leer hielt.
        for p in self.seiten:
            h = p.read_text(encoding="utf-8")
            self.assertEqual(h.count('"offers"'), 1, p.name)

    def test_zweiter_lauf_im_repo_aendert_nichts(self):
        for p in self.seiten:
            h = p.read_text(encoding="utf-8")
            self.assertEqual(m.umbauen(h), h, p.name)

    def test_mehrpreis_seite_bleibt_aussen_vor(self):
        namen = [p.name for p in self.seiten]
        self.assertNotIn("ki-tools-datensatz.html", namen)

    def test_compliance_seiten_bekamen_einen_eigenen_knoten(self):
        # Diese drei (je 39 €) trugen vorher ÜBERHAUPT keine Auszeichnung.
        namen = [p.name for p in self.seiten]
        for n in ("ki-compliance-aerzte.html", "ki-compliance-anwaelte.html",
                  "ki-compliance-steuerberater.html"):
            self.assertIn(n, namen)
            h = (ROOT / n).read_text(encoding="utf-8")
            d = [json.loads(b) for b in re.findall(
                r'<script type="application/ld\+json">(.*?)</script>', h, re.S)]
            prod = [k for k in d if k.get("@type") == "Product"][0]
            self.assertNotIn("aban news", prod["name"])     # Marken-Zusatz ab
            self.assertIn("Compliance-Paket", prod["name"])
            self.assertTrue(prod["description"])

    def test_kein_angebot_ohne_sichtbaren_preis(self):
        # Gegenprobe: das Skript darf keine Seite erfassen, die keinen Kasten hat.
        for p in self.seiten:
            self.assertIn('<div class="price">', p.read_text(encoding="utf-8"), p.name)


if __name__ == "__main__":
    unittest.main(verbosity=2)
