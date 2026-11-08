from pathlib import Path
import tempfile
import unittest
import auto_reparatur as a

class ReparaturTest(unittest.TestCase):
    def test_echte_tags_und_wiederholung(self):
        before='<html><head><title>Demo</title></head><body><a href="/preis?noopener" target=_blank rel="nofollow">CHF 49</a></body></html>'
        after,n,offen,full=a.reparieren(before)
        self.assertTrue(full)
        self.assertEqual(n,{'noopener':1,'viewport':1})
        self.assertIn('rel="nofollow noopener"',after)
        self.assertIn('href="/preis?noopener"',after)
        self.assertIn('CHF 49',after)
        self.assertEqual(a.reparieren(after)[0],after)
        self.assertEqual(sum(a.reparieren(after)[1].values()),0)
    def test_javascript_kommentar_und_gute_tags_bleiben(self):
        text='''<html><head><meta NAME='viewport' content='width=device-width'></head><body><!-- <a target="_blank"> --><script>const demo='<a target="_blank">';</script><a target="_BLANK" REL="external NOOPENER">OK</a></body></html>'''
        self.assertEqual(a.reparieren(text)[0],text)
    def test_rel_im_attributwert_ist_keine_echte_rel_angabe(self):
        before='''<html><head><meta name="viewport"></head><a data-info='rel="nofollow"' target="_blank" rel=external>Link</a></html>'''
        after,n,_,_=a.reparieren(before)
        self.assertIn("data-info='rel=\"nofollow\"'",after)
        self.assertIn('rel="external noopener"',after)
        self.assertEqual(n['noopener'],1)
    def test_doppelte_attribute_und_fragmente_nicht_raten(self):
        text='<html><head><meta name="viewport"></head><a target="_blank" rel="x" rel="y">OK</a></html>'
        self.assertEqual(a.reparieren(text)[0],text)
        self.assertEqual(a.reparieren(text)[2],1)
        fragment='<a target="_blank">Fragment</a>'
        self.assertEqual(a.reparieren(fragment)[0],fragment)
        self.assertFalse(a.reparieren(fragment)[3])
    def test_trockenlauf_schreiben_und_keine_geheimnisse_im_bericht(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'seite.html'
            original='<html><head></head><body>Geheimer Testtext</body></html>'
            p.write_text(original)
            r=a.lauf(tmp)
            self.assertEqual(p.read_text(),original)
            self.assertEqual(r['geaenderte_dateien'],0)
            r=a.lauf(tmp,True)
            self.assertEqual(r['geaenderte_dateien'],1)
            self.assertNotIn('Geheimer Testtext',str(r))
            self.assertFalse(r['alle_fehler_gemessen'])
            self.assertEqual(a.lauf(tmp,True)['geaenderte_dateien'],0)
    def test_textarea_beispiele_werden_nicht_als_links_repariert(self):
        text='<html><head><title>Test</title><meta name="viewport"></head><textarea><a target="_blank">Beispiel</a></textarea></html>'
        self.assertEqual(a.reparieren(text)[0],text)
    def test_symlink_nicht_schreiben(self):
        with tempfile.TemporaryDirectory() as tmp, tempfile.TemporaryDirectory() as outside:
            p=Path(outside)/'privat.html';p.write_text('<html><head></head></html>')
            (Path(tmp)/'link.html').symlink_to(p)
            r=a.lauf(tmp,True)
            self.assertEqual(r['gepruefte_html'],0)
            self.assertEqual(p.read_text(),'<html><head></head></html>')
