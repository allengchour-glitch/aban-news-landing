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


class MetricoolV2Test(unittest.TestCase):
    """Kurzbericht Version 2 (Zahlen je Kanal): Form wie im Dashboard seit 11.11.2026, Werte hier erfunden."""
    def kanal(self,name,**extra):
        k={'kanal':name,'konto':'@beispiel','follower':10,'aufrufe':100,'heute':1,'geplant':2,'naechster':'12.11. 09:00','naechste_fest':1,'naechste_entwurf':0}
        k.update(extra);return k
    def report(self):
        return {'version':2,'gemessen':'2026-11-11T21:17:00Z','gemessen_text':'11.11. 22:17','zeitraum':'12. bis 14.11.','geplante_eintraege':5,
                'auswertung':'04. bis 10.11.','naechste_woche':{'zeitraum':'15. bis 21.11.','fest':3,'entwuerfe':2},
                'kanaele':[self.kanal('TikTok'),self.kanal('YouTube',follower=3),self.kanal('Facebook',konto='')],
                'youtube_hinweis':'Ein anderer Kanal ist in Metricool nicht verbunden.'}
    def einlesen(self,report,rows):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'privat.json';p.write_text(json.dumps(report))
            module.metricool_einlesen(p,rows)
    def abgelehnt(self,report):
        with self.assertRaises(ValueError): self.einlesen(report,[{'id':'social_meta'}])
    def test_an_drei_stationen_auch_youtube(self):
        rows=[{'id':'social_meta'},{'id':'social_pinterest'},{'id':'social_linkedin'},{'id':'yt_wachstum'},{'id':'yt_video'},{'id':'offene'}]
        self.einlesen(self.report(),rows)
        self.assertEqual([r['id'] for r in rows if 'metricool' in r],['social_meta','social_pinterest','yt_wachstum'])
        self.assertEqual(rows[0]['metricool'],self.report())
    def test_jede_station_eine_eigene_kopie(self):
        rows=[{'id':'social_meta'},{'id':'yt_wachstum'}]
        self.einlesen(self.report(),rows)
        rows[0]['metricool']['kanaele'][0]['follower']=999
        self.assertEqual(rows[1]['metricool']['kanaele'][0]['follower'],10)
    def test_hinweis_ist_freiwillig(self):
        r=self.report();del r['youtube_hinweis']
        rows=[{'id':'yt_wachstum'}];self.einlesen(r,rows)
        self.assertNotIn('youtube_hinweis',rows[0]['metricool'])
    def test_rohdaten_und_fehlende_felder_abgelehnt(self):
        r=self.report();r['posts']=[{'text':'privater Entwurf'}];self.abgelehnt(r)
        for feld in ('gemessen_text','auswertung','naechste_woche','kanaele'):
            r=self.report();del r[feld];self.abgelehnt(r)
        r=self.report();r['kanaele'][0]['text']='Beitrag';self.abgelehnt(r)
        r=self.report();del r['kanaele'][1]['naechster'];self.abgelehnt(r)
        r=self.report();r['naechste_woche']['beitraege']=['Entwurf'];self.abgelehnt(r)
    def test_unbekannt_und_boolean_ist_keine_null(self):
        for value in (None,False,True,-1,1.5,'3'):
            r=self.report();r['geplante_eintraege']=value;self.abgelehnt(r)
            r=self.report();r['kanaele'][2]['aufrufe']=value;self.abgelehnt(r)
            r=self.report();r['naechste_woche']['entwuerfe']=value;self.abgelehnt(r)
    def test_version_nur_die_ganze_zahl_2(self):
        for value in (True,2.0,'2',3):
            r=self.report();r['version']=value;self.abgelehnt(r)
    def test_kanalliste_streng(self):
        r=self.report();r['kanaele']=[];self.abgelehnt(r)
        r=self.report();r['kanaele'].append(self.kanal('TikTok'));self.abgelehnt(r)
        r=self.report();r['kanaele'][0]['kanal']='MySpace';self.abgelehnt(r)
        r=self.report();r['kanaele']=[self.kanal(n) for n in module.MC2_KANAELE]+[self.kanal('TikTok')];self.abgelehnt(r)
        r=self.report();r['kanaele']={'TikTok':1};self.abgelehnt(r)
    def test_texte_kurz_und_vorhanden(self):
        r=self.report();r['kanaele'][0]['konto']='@'+'x'*60;self.abgelehnt(r)
        r=self.report();r['kanaele'][0]['naechster']=5;self.abgelehnt(r)
        r=self.report();r['zeitraum']='';self.abgelehnt(r)
        r=self.report();r['auswertung']='x'*41;self.abgelehnt(r)
        r=self.report();r['youtube_hinweis']='x'*201;self.abgelehnt(r)
        r=self.report();r['naechste_woche']['zeitraum']=None;self.abgelehnt(r)
    def test_messzeit_mit_zeitzone(self):
        r=self.report();r['gemessen']='2026-11-11T21:17:00';self.abgelehnt(r)
        r=self.report();r['gemessen']=20261111;self.abgelehnt(r)
        r=self.report();r['gemessen']='gestern';self.abgelehnt(r)
