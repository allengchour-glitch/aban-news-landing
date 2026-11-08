from datetime import date
import tempfile
from pathlib import Path
import projekte
import unittest
from automationen import nachfassen, seite_pruefen

class AutomationTest(unittest.TestCase):
    def test_nur_offene_alte_angebote(self):
        rows = [{'id': 'a', 'datum': '2026-11-01', 'status': 'offen'},
                {'id': 'b', 'datum': '2026-11-07', 'status': 'offen'},
                {'id': 'c', 'datum': '2026-10-01', 'status': 'angenommen'}]
        self.assertEqual([r['id'] for r in nachfassen(rows, date(2026,11,8))], ['a'])
        self.assertFalse(nachfassen(rows, date(2026,11,8))[0]['versendet'])
    def test_fehlerhaftes_datum(self):
        with self.assertRaises(ValueError): nachfassen([{'status':'offen','datum':'kaputt'}], date.today())
    def test_html_keine_erfundene_live_pruefung(self):
        self.assertEqual(len(seite_pruefen('<html></html>')['hinweise']), 2)
        d = seite_pruefen('<title>Demo</title><meta name="description" content="Text">')
        self.assertEqual(d['hinweise'], [])
        self.assertFalse(d['live_geprueft'])

class FortschrittTest(unittest.TestCase):
    def test_paket_und_tests_muessen_belegt_sein(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(projekte.bericht(tmp, False)[0]['prozent'], 29)
            self.assertEqual(projekte.bericht(tmp, True)[0]['prozent'], 43)
            for name in ('automationen.zip', 'anfragen-assistent.zip'):
                (Path(tmp) / name).write_bytes(b'demo')
            result = projekte.bericht(tmp, True)
            self.assertTrue(all(p['prozent'] == 57 for p in result))
            self.assertTrue(all(not step['fertig'] for p in result for step in p['schritte'][4:]))
