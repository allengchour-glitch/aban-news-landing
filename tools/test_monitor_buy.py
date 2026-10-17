#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests für tools/add_monitor_buy.py."""
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import add_monitor_buy as m  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent

ALT_SCHLICHT = ('<p><a class="btn" href="/ki-sichtbarkeit-monitor.html">Monitor ansehen →</a>'
                ' <a class="btn ghost" href="/ki-sichtbarkeit-paket.html">Komplett-Paket (29 €) →</a></p>'
                '</body>')
ALT_MIT_PREIS = ('<a class="btn" href="/ki-sichtbarkeit-monitor.html">'
                 'KI-Sichtbarkeits-Monitor — 9 €/Monat →</a></body>')


class TestUmbau(unittest.TestCase):
    def test_knopf_wird_markiert(self):
        # Das Merkmal muss am Knopf hängen, nicht irgendwo auf der Seite:
        # das Skript findet ihn über a[data-aban-monitor].
        self.assertRegex(m.umbauen(ALT_SCHLICHT), r"<a [^>]*" + m.MARK + r"[^>]*>")

    def test_href_bleibt_die_monitor_seite(self):
        # Ohne eingetragenen Zahlungs-Link ist das Verhalten wie heute.
        # Ein Knopf, der ohne JavaScript ins Leere zeigt, wäre schlechter
        # als gar keine Änderung.
        self.assertIn(f'href="{m.ZIEL}"', m.umbauen(ALT_SCHLICHT))

    def test_nebenknopf_auf_die_monitor_seite_bleibt_nebenknopf(self):
        # Ein "btn ghost" ist die zweite Wahl im Kasten. Fängt das Muster ihn
        # mit, stünden zwei Kauf-Knöpfe nebeneinander.
        ghost = '<a class="btn ghost" href="/ki-sichtbarkeit-monitor.html">Mehr dazu →</a>'
        self.assertIn(ghost, m.umbauen(ghost))

    def test_nebenknopf_bleibt_unberuehrt(self):
        self.assertIn('class="btn ghost" href="/ki-sichtbarkeit-paket.html"',
                      m.umbauen(ALT_SCHLICHT))

    def test_preis_in_der_beschriftung_bleibt_erhalten(self):
        # Auf ki-erwaehnungs-check.html steht der Preis NUR im Knopf.
        self.assertIn("9 €/Monat", m.umbauen(ALT_MIT_PREIS))

    def test_ohne_preis_keiner_erfunden(self):
        neu = m.umbauen(ALT_SCHLICHT)
        self.assertNotIn("€", neu.split("ghost")[0])

    def test_skript_und_konfiguration_kommen_dazu(self):
        neu = m.umbauen(ALT_SCHLICHT)
        self.assertIn(m.CFG, neu)
        self.assertIn("MONITOR_ABO_URL", neu)

    def test_skript_setzt_das_ziel_auf_den_knopf(self):
        # Textprüfung: Python führt das JavaScript nicht aus. Dass der Knopf
        # im Browser wirklich zur Zahlung führt, ist nach dem Deploy an der
        # Live-Seite geprüft worden, nicht hier.
        self.assertIn("a[i].href=u", m.SKRIPT)
        self.assertIn('querySelectorAll("a[' + m.MARK + ']")', m.SKRIPT)

    def test_zweiter_lauf_aendert_nichts(self):
        einmal = m.umbauen(ALT_SCHLICHT)
        self.assertEqual(einmal, m.umbauen(einmal))

    def test_zweiter_lauf_verdoppelt_skript_und_konfiguration_nicht(self):
        zweimal = m.umbauen(m.umbauen(ALT_MIT_PREIS))
        self.assertEqual(zweimal.count(m.CFG), 1)
        self.assertEqual(zweimal.count("MONITOR_ABO_URL"), 1)

    def test_verzeichnis_eintrag_wird_nicht_angefasst(self):
        # angebote.html listet den Monitor als Katalog-Zeile; dort ist
        # "Ansehen →" richtig und darf kein Kauf-Knopf werden.
        eintrag = '<a class="item" href="/ki-sichtbarkeit-monitor.html"><span>Monitor</span></a>'
        self.assertEqual(m.umbauen(eintrag), eintrag)

    def test_fussnoten_link_wird_nicht_angefasst(self):
        fuss = '<a href="/ki-sichtbarkeit-monitor.html">Monitor</a>'
        self.assertEqual(m.umbauen(fuss), fuss)


class TestAuswahl(unittest.TestCase):
    def test_monitor_seite_ist_ausgenommen(self):
        # Sie hat ihren eigenen Kauf-Knopf samt Mail-Rückfall. Der Test prüft
        # die Ausnahmeliste selbst, nicht nur das heutige Ergebnis: heute
        # verlinkt die Seite sich ohnehin nicht selbst, morgen vielleicht doch.
        quelle = (ROOT / "tools" / "add_monitor_buy.py").read_text(encoding="utf-8")
        self.assertIn('raus = {"ki-sichtbarkeit-monitor.html"}', quelle)
        self.assertNotIn("ki-sichtbarkeit-monitor.html", [p.name for p in m.seiten()])

    def test_es_sind_ueberhaupt_seiten_dabei(self):
        # Gegenprobe: sonst wären alle Prüfungen unten leer grün.
        self.assertGreater(len(m.seiten()), 15)


class TestSeitenImRepo(unittest.TestCase):
    """Prüft die gebauten Seiten, nicht nur die Funktionen."""

    @classmethod
    def setUpClass(cls):
        cls.seiten = [p for p in ROOT.glob("*.html")
                      if m.MARK in p.read_text(encoding="utf-8", errors="ignore")]

    def test_es_gibt_seiten_mit_knopf(self):
        self.assertGreater(len(self.seiten), 15)

    def test_jede_seite_laedt_die_konfiguration_und_das_skript(self):
        for p in self.seiten:
            h = p.read_text(encoding="utf-8", errors="ignore")
            self.assertIn(m.CFG, h, p.name)
            self.assertIn("MONITOR_ABO_URL", h, p.name)

    def test_kein_knopf_ohne_ziel(self):
        for p in self.seiten:
            h = p.read_text(encoding="utf-8", errors="ignore")
            for a in re.findall(r'<a [^>]*' + m.MARK + r'[^>]*>', h):
                self.assertIn(f'href="{m.ZIEL}"', a, p.name)

    def test_je_seite_hoechstens_ein_skript(self):
        for p in self.seiten:
            h = p.read_text(encoding="utf-8", errors="ignore")
            self.assertEqual(h.count("MONITOR_ABO_URL"), 1, p.name)

    def test_kein_alter_umleit_knopf_mehr_uebrig(self):
        for p in ROOT.glob("*.html"):
            if p.name == "ki-sichtbarkeit-monitor.html":
                continue
            h = p.read_text(encoding="utf-8", errors="ignore")
            self.assertIsNone(m.KNOPF.search(h), p.name)


if __name__ == "__main__":
    unittest.main(verbosity=2)
