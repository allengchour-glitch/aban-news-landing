import csv
import json
from pathlib import Path
import tempfile
import unittest
from kommentar_antworter import verarbeiten
from wissenspflege import faq_luecken


class WissenspflegeTest(unittest.TestCase):
    def test_gleiche_fragen_normalisieren_und_plattformen_sammeln(self):
        rows=[{'text':text,'plattform':p,'kategorie':'offene_frage','antwortentwurf':''} for text,p in [('Wie lange dauert ein Pilot?','instagram'),('WIE LANGE dauert ein Pilot!','youtube'),('Was kostet das?','facebook')]]
        groups=faq_luecken(rows)
        self.assertEqual(len(groups),1)
        self.assertEqual(groups[0]['anzahl'],2)
        self.assertEqual(groups[0]['plattformen'],['instagram','youtube'])
        self.assertNotIn('antwort',groups[0])

    def test_keine_privaten_oder_bereits_beantworteten_faelle(self):
        rows=[]
        for kat,antwort in [('persoenliche_daten',''),('spamverdacht',''),('beschwerde','Bitte privat melden.'),('faq','Bekannte Antwort')]:
            rows += [{'text':'Frage','plattform':'youtube','kategorie':kat,'antwortentwurf':antwort}]*2
        self.assertEqual(faq_luecken(rows),[])

    def test_stapel_erzeugt_pruefliste_und_sichere_html_ansicht(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/'faq.json').write_text('{"faq": []}')
            with (root/'eingang.csv').open('w',newline='') as f:
                w=csv.writer(f);w.writerow(['id','plattform','text'])
                w.writerow(['1','instagram','Wie geht <img src=x onerror=alert(1)>?'])
                w.writerow(['2','youtube','Wie geht <img src=x onerror=alert(1)>?'])
                w.writerow(['3','youtube','Wie geht das? Meine Telefonnummer ist +41 79 123 45 67'])
            r=verarbeiten(root/'eingang.csv',root/'out',root/'faq.json')
            self.assertEqual(r['faq_luecken'],1)
            self.assertEqual(r['veroeffentlicht'],0)
            data=json.loads((root/'out/wissensluecken.json').read_text())
            self.assertEqual(data['antworten_erstellt'],0)
            self.assertEqual(data['fragen'][0]['anzahl'],2)
            html=(root/'out/index.html').read_text()
            self.assertIn('Wiederkehrende offene Fragen',html)
            self.assertNotIn('<img src=x',html)
            self.assertIn('&lt;img src=x',html)


if __name__=='__main__':unittest.main()
