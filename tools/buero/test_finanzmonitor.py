import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import finanzbericht

MODUL=Path(__file__).with_name('finanzmonitor.js')


class FinanzTest(unittest.TestCase):
    def js(self,code):
        start='const a=require("node:assert/strict"),f=require('+json.dumps(str(MODUL))+');'
        # Absichtlich erfundene Beträge, keine privaten Connector-Daten.
        start+='''const d={version:1,typ:'privater-finanzmonitor',waehrung:'CHF',von:'2026-01-01',bis:'2026-01-02',gemessen:new Date().toISOString(),tage:[{tag:'2026-01-01',brutto:20000,rabatte:-1000,rueckgaben:-4000,netto:15000,versand:500,steuer:1000,umsatz:16500,ware:4000,kostenluecke:3000},{tag:'2026-01-02',brutto:0,rabatte:0,rueckgaben:0,netto:0,versand:0,steuer:0,umsatz:0,ware:null,kostenluecke:0}],werbung:[{tag:'2026-01-01',betrag:1000}],werbung_vollstaendig:false,zusatzkosten:{versand:null,gebuehren:null,fixkosten:null},quellen:{shopify:'gemessen',ads:'gemessen',stripe:'nicht_verbunden',lemon:'nicht_verbunden',affiliate:'nicht_gemessen'}};'''
        r=subprocess.run(['node','-e',start+code],text=True,capture_output=True,timeout=15)
        self.assertEqual(r.returncode,0,r.stderr)

    def test_unvollstaendige_kosten_kein_gewinn_und_rueckgaben_nicht_doppelt(self):
        self.js("const r=f.auswerten(f.pruefen(d),'gesamt');a.equal(r.umsatz,16500);a.equal(r.ausgaben,5000);a.equal(r.gewinn,null);a.equal(r.wareVoll,false);a.equal(r.monate[0].umsatz,16500);")

    def test_leere_anzeige_ist_unbekannt_statt_null(self):
        self.js("const r=f.auswerten(null,'gesamt');a.equal(r.umsatz,null);a.equal(r.ausgaben,null);a.equal(r.gewinn,null);")

    def test_gewinn_nur_bei_vollstaendigen_kosten(self):
        self.js("d.tage[0].kostenluecke=0;d.werbung_vollstaendig=true;d.zusatzkosten={versand:100,gebuehren:200,fixkosten:300};const r=f.auswerten(f.pruefen(d),'gesamt');a.equal(r.gewinn,9900);a.equal(r.vollstaendig,true);")

    def test_datenluecken_fremde_felder_duplikate_und_float_ablehnen(self):
        self.js("let x=structuredClone(d);x.tage.pop();a.throws(()=>f.pruefen(x));x=structuredClone(d);x.email='privat';a.throws(()=>f.pruefen(x));x=structuredClone(d);x.tage[1]=x.tage[0];a.throws(()=>f.pruefen(x));x=structuredClone(d);x.tage[0].umsatz=1.5;a.throws(()=>f.pruefen(x));x=structuredClone(d);x.tage[0].netto=100;a.throws(()=>f.pruefen(x));")

    def test_teilzeitraum_bekommt_keine_erfundenen_fixkosten_oder_werbung(self):
        self.js("d.von='2025-12-31';d.tage.unshift({...d.tage[1],tag:'2025-12-31'});d.werbung=[{tag:'2025-12-31',betrag:1000}];d.zusatzkosten={versand:100,gebuehren:200,fixkosten:300};const r=f.auswerten(f.pruefen(d),'monat');a.equal(r.von,'2026-01-01');a.equal(r.werbung,null);a.equal(r.gewinn,null);")

    def test_privater_export_nicht_im_repository(self):
        with tempfile.TemporaryDirectory() as tmp:
            src=Path(tmp)/'bericht.json';src.write_text('{}')
            with self.assertRaises(ValueError):finanzbericht.bauen(src,Path(__file__).with_name('privat.html'))
