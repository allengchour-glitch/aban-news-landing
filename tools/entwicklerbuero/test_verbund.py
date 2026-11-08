from datetime import datetime, timezone
import json
from pathlib import Path
import re
import tempfile
import unittest
import verbund
import zentrale


class VerbundTest(unittest.TestCase):
    def test_alle_angebote_in_planung_und_obsidian(self):
        r=zentrale.planen({}, {}, datetime.now(timezone.utc))
        ids={p['id'] for p in verbund.katalog()}
        self.assertEqual(len(ids),14)
        self.assertTrue({'cockpit','studio','kits','monitor','buecher','luxestyle','automation'}.issubset(ids))
        jobs=[a for a in r['hirn_planung']['aufgaben'] if a['id'].startswith('verbund_')]
        self.assertEqual({a['id'][8:] for a in jobs},ids)
        self.assertTrue(all(a['experte'] and a['buero'] for a in jobs))
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)/'out';zentrale.exportieren(r,out)
            md=(out/'Obsidian-Buero/Projekte.md').read_text()
            self.assertTrue(all(p['name'] in md for p in verbund.katalog()))
            self.assertIn('[[Projekte]]',(out/'Obsidian-Buero/Start.md').read_text())

    def test_oberflaeche_nutzt_dasselbe_register_ohne_falsche_livewerte(self):
        html=(Path(__file__).resolve().parents[1]/'buero/seite.html').read_text()
        data=json.loads(re.search(r'id="kb-projektverbund">(.*?)</script>',html).group(1))
        self.assertEqual(data,verbund.katalog())
        self.assertTrue(all(re.fullmatch(r'/(?:[a-z0-9/-]*)',p['pfad']) for p in data))
        self.assertTrue(all('nicht' in p['messung'] for p in data))
        self.assertTrue(all('prozent' not in p and 'umsatz' not in p for p in data))
