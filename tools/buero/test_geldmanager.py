"""Rechen- und Importgegenproben des privaten Browser-Geldplans."""
import json
from pathlib import Path
import subprocess
import unittest

MODUL=Path(__file__).resolve().parent/'geldmanager.js'


class GeldmanagerTest(unittest.TestCase):
    def js(self, code):
        script='const a=require("node:assert/strict"),g=require('+json.dumps(str(MODUL))+');'+code
        r=subprocess.run(['node','-e',script],capture_output=True,text=True,timeout=10)
        self.assertEqual(r.returncode,0,r.stderr)

    def test_fehlende_werte_sind_keine_null(self):
        self.js("const r=g.berechnen({});a.equal(r.ergebnis,null);a.equal(r.kosten,null);a.equal(r.verbleibend,null);a.equal(r.fehlend.length,8);a.equal(g.cent(''),null);a.equal(g.cent('0'),0);")

    def test_cent_rechnung_mit_komma_und_ruecklage(self):
        self.js("const r=g.berechnen({einnahmen:'1000,30',erstattungen:'100.10',ware:'200',versand:'50.10',gebuehren:'10.10',werbung:'100',fixkosten:'40',ruecklage:'200'});a.equal(r.netto,90020);a.equal(r.kosten,40020);a.equal(r.ergebnis,50000);a.equal(r.verbleibend,30000);a.equal(r.fehlend.length,0);a.equal(g.cent('0.10')+g.cent('0.20'),30);")

    def test_unvollstaendige_kosten_geben_keinen_gewinn(self):
        self.js("const r=g.berechnen({einnahmen:'1000',erstattungen:'0',werbung:'100'});a.equal(r.kosten,10000);a.equal(r.kostenVollstaendig,false);a.equal(r.ergebnis,null);a.equal(r.marge,null);")

    def test_negative_ergebnisse_und_null_einnahmen(self):
        self.js("const r=g.berechnen({einnahmen:'0',erstattungen:'20',ware:'0',versand:'0',gebuehren:'0',werbung:'100',fixkosten:'0',ruecklage:'0'});a.equal(r.ergebnis,-12000);a.equal(r.marge,null);a.ok(r.schritte.some(s=>s.includes('Deckungslücke')));")

    def test_fehlerhafte_betraege_werden_abgelehnt(self):
        self.js("for(const v of ['-1','1e3','NaN','Infinity','1.234','1,000.00','1000000000','<script>'])a.throws(()=>g.cent(v));")

    def test_angebotsdeckung_und_nichttragfaehiger_preis(self):
        self.js("let r=g.angebot('200','80','350');a.equal(r.beitrag,12000);a.equal(r.auftraege,3);a.equal(g.angebot('80','80','350').auftraege,null);a.equal(g.angebot('70','80','350').auftraege,null);a.equal(g.angebot('','80','350').beitrag,null);")

    def test_import_keine_fremden_felder_oder_waehrungsvermischung(self):
        self.js("const r=g.importieren(JSON.stringify({version:1,waehrung:'EUR',werte:{werbung:'50,20'}}));a.equal(r.waehrung,'EUR');a.equal(r.werte.werbung,'50,20');a.equal(r.werte.einnahmen,'');a.throws(()=>g.importieren(JSON.stringify({version:1,waehrung:'XYZ',werte:{}})));a.throws(()=>g.importieren(JSON.stringify({version:1,waehrung:'CHF',werte:{werbung:50.2}})));a.throws(()=>g.importieren('{\"version\":1,\"waehrung\":\"CHF\",\"werte\":{\"__proto__\":\"1\"}}'));")


if __name__=='__main__':unittest.main()
