"""Ersatzkatalog bleibt identisch, auch nach Katalogänderungen; ohne Netz."""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import shop_jsonld as shop

class Ersatzkatalog(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        root=Path(self.tmp.name)
        self.paths={'SHOP':root/'shop.html','DATEN':root/'produkte.json','FALLBACK':root/'shop-config.js'}
        self.products=[{'slug':'demo-kit','title':'Demo','desc':'Text </script> & Hilfe','price':'CHF 12','buy':'https://example.invalid/demo','bundle':True}]
        self.paths['SHOP'].write_text('<script type="application/ld+json">{"@type":"ItemList"}</script>')
        self.paths['DATEN'].write_text(json.dumps(self.products))
        self.paths['FALLBACK'].write_text('window.ABAN_SHOP = [];')
    def run_cli(self,check=False):
        with patch.multiple(shop,create=True,**self.paths),patch('sys.argv',['shop_jsonld.py']+(['--pruefen'] if check else [])),contextlib.redirect_stdout(io.StringIO()):
            return shop.main()
    def fallback(self):
        result=subprocess.run(['node','-e',"const fs=require('fs'),vm=require('vm'),c={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),c);console.log(JSON.stringify(c.window.ABAN_SHOP));",str(self.paths['FALLBACK'])],check=True,capture_output=True,text=True)
        return json.loads(result.stdout)
    def test_alle_felder_und_sprungziel_werden_erhalten(self):
        self.assertEqual(self.run_cli(),0);self.assertEqual(self.fallback(),self.products)
        self.assertIn('\\u003c',self.paths['FALLBACK'].read_text())
    def test_nur_veralteter_fallback_wird_erkannt(self):
        self.run_cli();self.assertEqual(self.run_cli(True),0)
        self.paths['FALLBACK'].write_text('window.ABAN_SHOP = [];')
        self.assertEqual(self.run_cli(True),1)
    def test_katalogaenderung_und_nicht_kaufbares_produkt(self):
        self.run_cli()
        self.products.append({'slug':'zweites-demo','title':'Zweites','desc':'','price':'CHF 14','buy':''})
        self.paths['DATEN'].write_text(json.dumps(self.products));self.assertEqual(self.run_cli(True),1)
        self.assertEqual(self.run_cli(),0);self.assertEqual(self.fallback(),self.products);self.assertEqual(self.run_cli(True),0)
    def test_pruefen_schreibt_nicht(self):
        before={k:p.read_bytes() for k,p in self.paths.items()}
        self.assertEqual(self.run_cli(True),1)
        self.assertEqual(before,{k:p.read_bytes() for k,p in self.paths.items()})

if __name__=='__main__':unittest.main()
