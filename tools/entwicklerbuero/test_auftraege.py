import json
from pathlib import Path
import re
import unittest
import auftraege
import verbund


class AuftragsTest(unittest.TestCase):
    def test_jedes_projekt_hat_einen_vollstaendigen_auftrag(self):
        jobs=auftraege.katalog()
        self.assertEqual(len(jobs),28)
        self.assertEqual(len({a['id'] for a in jobs}),len(jobs))
        by={a['id']:a for a in jobs}
        for p in verbund.katalog():
            job=by['projekt_'+p['id']]
            self.assertIn('https://abannews.com'+p['pfad'],job['auftrag'])
            self.assertIn(p['naechster'],job['auftrag'])
            self.assertEqual(job['buero'],p['buero'])

    def test_auftraege_begrenzen_externe_aktionen(self):
        for a in auftraege.katalog():
            with self.subTest(a=a['id']):
                self.assertIn('Keine Nachrichten versenden',a['auftrag'])
                self.assertIn('keine Zahlungen',a['auftrag'])
                self.assertIn('Private Konto- und Kundendaten bleiben privat',a['auftrag'])
                self.assertNotIn('[Platzhalter]',a['auftrag'])
                self.assertLess(len(a['auftrag']),4000)

    def test_darstellung_und_claude_quelle_enthalten_die_aktuellen_auftraege(self):
        root=Path(__file__).resolve().parents[2]
        for p in [root/'ki-buero.html',root/'tools/buero/seite.html']:
            data=json.loads(re.search(r'id="kb-auftragskatalog">(.*?)</script>',p.read_text()).group(1))
            self.assertEqual(data,auftraege.katalog())
