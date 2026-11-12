import base64
import json
from pathlib import Path
import tempfile
import unittest
from email import policy
from email.parser import BytesParser
from gmail_import import importieren, MAX_BYTES, MAX_EXPORT
from email_antworter import verarbeiten


class GmailImportTest(unittest.TestCase):
    mail = (b'From: kunde@example.invalid\r\nTo: buero@example.invalid\r\n'
            b'Subject: Kontakt\r\nMessage-ID: <demo@example.invalid>\r\n'
            b'Content-Type: text/plain; charset=utf-8\r\n\r\nWie erreiche ich Sie?\r\n')

    def row(self, mid='demo-id'):
        return {'id': mid, 'raw': base64.urlsafe_b64encode(self.mail).decode().rstrip('=')}

    def run_import(self, root, rows):
        p = root/'export.json'
        p.write_text(json.dumps(rows))
        return importieren(p, root/'import')

    def test_bytegleich_und_bestehende_firmenwissen_kette(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            r = self.run_import(root, self.row())
            self.assertEqual((root/'import/gmail-0001.eml').read_bytes(), self.mail)
            self.assertEqual(r['ergebnisse'], [{'gmail_id':'demo-id','quelldatei':'gmail-0001.eml'}])
            faq = root/'faq.json'
            faq.write_text(json.dumps({'faq':[{'stichwoerter':['Kontakt'],'antwort':'Bitte telefonisch anfragen.'}]}))
            report = verarbeiten(root/'import',root/'pruefen','Demo','buero@example.invalid',faq)
            self.assertEqual((report['gelesen'],report['entwuerfe'],report['versendet']), (1,1,0))
            reply = BytesParser(policy=policy.default).parsebytes((root/'pruefen/antwort-0001.eml').read_bytes())
            self.assertEqual(reply['X-Unsent'],'1')
            self.assertIn('Bitte telefonisch anfragen.',reply.get_content())
            self.assertEqual(report['ergebnisse'][0]['quelldatei'],'gmail-0001.eml')

    def test_defekter_stapel_ohne_teilausgabe(self):
        for bad in [None,{}, {'id':'x','raw':'%%%kein-base64'}, {'id':'x','raw':''}, {'id':'x','raw':'A'}, {'id':'\n','raw':'WA'}]:
            with self.subTest(bad=bad),tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp)
                with self.assertRaises(ValueError):self.run_import(root,[self.row(),bad])
                self.assertFalse((root/'import').exists())

    def test_doppelte_kennung_abgewiesen(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            with self.assertRaises(ValueError):self.run_import(root,[self.row(),self.row()])
            self.assertFalse((root/'import').exists())

    def test_kennung_wird_nicht_zum_pfad(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);r=self.run_import(root,self.row('../../fremd'))
            self.assertTrue((root/'import/gmail-0001.eml').is_file())
            self.assertFalse((root.parent/'fremd').exists())
            self.assertEqual(r['ergebnisse'][0]['gmail_id'],'../../fremd')

    def test_bestehende_ausgabe_bleibt_unveraendert(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'import').mkdir();(root/'import/behalten').write_text('Demo')
            with self.assertRaises(ValueError):self.run_import(root,self.row())
            self.assertEqual((root/'import/behalten').read_text(),'Demo')

    def test_leerer_und_zu_grosser_stapel(self):
        for rows in [[],[self.row(str(i)) for i in range(101)]]:
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp)
                with self.assertRaises(ValueError):self.run_import(root,rows)
                self.assertFalse((root/'import').exists())

    def test_zu_grosse_exportdatei_ohne_ausgabe(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);p=root/'export.json';p.write_text(' '*(MAX_EXPORT+1))
            with self.assertRaises(ValueError):importieren(p,root/'import')
            self.assertFalse((root/'import').exists())

    def test_zu_grosse_mail_ohne_ausgabe(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);r=self.row();r['raw']=base64.urlsafe_b64encode(b'x'*(MAX_BYTES+1)).decode().rstrip('=')
            with self.assertRaises(ValueError):self.run_import(root,r)
            self.assertFalse((root/'import').exists())


if __name__=='__main__':unittest.main()
