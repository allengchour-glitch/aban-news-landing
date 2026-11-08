import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('anzeige',Path(__file__).with_name('make_buero.py'))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class MetricoolTest(unittest.TestCase):
    def report(self):
        return {'version':1,'gemessen':'2026-11-08T00:00:00Z','zeitraum':'Testwoche','geplante_eintraege':4,'instagram_follower':12,'instagram_stand':'07.11.2026','kanaele':6}
    def einlesen(self,report,rows):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'privat.json';p.write_text(json.dumps(report))
            module.metricool_einlesen(p,rows)
    def test_kurzbericht_nur_an_zwei_social_stationen(self):
        rows=[{'id':'social_meta'},{'id':'social_pinterest'},{'id':'social_linkedin'},{'id':'offene'}]
        self.einlesen(self.report(),rows)
        self.assertEqual([r['id'] for r in rows if 'metricool' in r],['social_meta','social_pinterest'])
    def test_rohdaten_werden_nicht_importiert(self):
        r=self.report();r['posts']=[{'text':'privater Entwurf'}]
        with self.assertRaises(ValueError): self.einlesen(r,[])
    def test_unbekannt_und_boolean_ist_keine_null(self):
        for value in (None,False,-1):
            r=self.report();r['instagram_follower']=value
            with self.assertRaises(ValueError): self.einlesen(r,[])
    def test_datum_ohne_zeitzone_abgelehnt(self):
        r=self.report();r['gemessen']='2026-11-08T00:00:00'
        with self.assertRaises(ValueError): self.einlesen(r,[])
