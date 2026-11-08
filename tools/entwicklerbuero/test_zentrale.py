from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest
import zentrale

class GehirnTest(unittest.TestCase):
    def test_unbekannt_ist_nicht_null_fehler(self):
        r = zentrale.planen({}, {}, datetime.now(timezone.utc))
        self.assertEqual(r['hirn_pruefung']['shoplaeufe_unbekannt'], 6)
        self.assertIsNone(r['hirn_pruefung']['shopfehler_gesamt'])
        self.assertFalse(r['hirn_pruefung']['freigabe_shop_schreiben'])
    def test_fehler_vor_erfolg_und_alte_tests_nicht_frisch(self):
        now = datetime(2026,11,8,tzinfo=timezone.utc)
        good = {'zeit':'2026-11-07T23:00:00Z','status':'completed','conclusion':'success','geplant':True}
        runs = {k:dict(good) for k in zentrale.WORKFLOWS}
        runs['autopilot']['conclusion']='failure'
        r=zentrale.planen({'github':runs},{'gemessen':'2026-11-01T00:00:00Z','stationen':{'pruefen':'bestanden'}},now)
        self.assertEqual(r['hirn_planung']['aufgaben'][0]['id'],'autopilot')
        self.assertEqual(r['hirn_pruefung']['shoplaeufe_fehlgeschlagen'],1)
        self.assertFalse(r['hirn_pruefung']['tests_frisch_bestanden'])
    def test_gruene_laeufe_beweisen_keinen_fehlerfreien_shop(self):
        now = datetime(2026,11,8,tzinfo=timezone.utc)
        run = {'zeit':'2026-11-07T23:00:00Z','status':'completed','conclusion':'success','geplant':True}
        r=zentrale.planen({'github':{k:run for k in zentrale.WORKFLOWS}},
                         {'gemessen':'2026-11-07T23:00:00Z','stationen':{'pruefen':'bestanden'}},now)
        self.assertEqual(r['hirn_pruefung']['shoplaeufe_fehlgeschlagen'],0)
        self.assertIsNone(r['hirn_pruefung']['shopfehler_gesamt'])
        self.assertTrue(r['hirn_pruefung']['tests_frisch_bestanden'])
        self.assertFalse(r['hirn_pruefung']['freigabe_shop_schreiben'])
    def test_obsidian_export_ohne_rohdaten(self):
        r=zentrale.planen({'geheim':'nicht exportieren'}, {}, datetime.now(timezone.utc))
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)/'export'
            zentrale.exportieren(r,out)
            self.assertTrue((out/'obsidian-buero.zip').is_file())
            self.assertTrue((out/'expertenplan.json').is_file())
            self.assertIn('Workflow-Architekt',(out/'Obsidian-Buero/Team.md').read_text())
            self.assertIn('[[Planung]]',(out/'Obsidian-Buero/Start.md').read_text())
            self.assertNotIn('nicht exportieren',(out/'zentrale.json').read_text())
