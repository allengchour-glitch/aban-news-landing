import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import quellenbericht

ROOT=Path(__file__).resolve().parent


class QuellenTest(unittest.TestCase):
    def js(self,code):
        # Ausschliesslich erfundene Messwerte; keine Connector-Antworten im Repository.
        start='const a=require("node:assert/strict"),f=require('+json.dumps(str(ROOT/'quellenmonitor.js'))+');'
        start+='''const d={version:1,typ:'privater-quellenmonitor',erstellt:'2026-01-02T10:00:00Z',konten:{ga4:'123',merchant:'456',shop:'demo-shop'},shop:{tag:'2026-01-02',gemessen:'2026-01-02T10:00:00Z',waehrung:'CHF',umsatz:12300,netto:10000,bestellungen:2,besucher:20,sitzungen:25},ga4:{gemessen:'2026-01-02T10:00:00Z',fenster_minuten:30,aktive:0},suche:[{domain:'demo.example',gemessen:'2026-01-02T10:00:00Z',von:'2025-12-01',bis:'2025-12-07',klicks:2,impressionen:100,vorlaeufig:true}],merchant:{gemessen:'2026-01-02T10:00:00Z',geprueft:100,eingeschraenkt:80,abgelehnt:2,teil:true,probleme:[{code:'image_unwanted_overlays',anzahl:2}]}};'''
        p=subprocess.run(['node','-e',start+code],capture_output=True,text=True,timeout=15)
        self.assertEqual(p.returncode,0,p.stderr)

    def test_null_ist_unbekannt_und_belegte_null_bleibt_null(self):
        self.js("a.equal(f.pruefen(d).ga4.aktive,0);d.ga4.aktive=null;d.shop.umsatz=null;a.equal(f.pruefen(d).ga4.aktive,null);a.equal(f.pruefen(d).shop.umsatz,null);")

    def test_fremde_private_felder_und_unplausible_zahlen_ablehnen(self):
        self.js("for(const change of [x=>x.email='privat',x=>x.shop.kunden=['privat'],x=>x.ga4.aktive=-1,x=>x.shop.umsatz=1.5,x=>x.merchant.abgelehnt=101,x=>x.konten.ga4=123,x=>x.shop.waehrung='FALSCH']){const x=structuredClone(d);change(x);a.throws(()=>f.pruefen(x));}")

    def test_zeitraum_fehler_doppelte_domains_und_zukunft_ablehnen(self):
        self.js("for(const change of [x=>x.shop.tag='2026-02-30',x=>x.ga4.gemessen='morgen',x=>x.ga4.gemessen=new Date(Date.now()+3600000).toISOString(),x=>x.suche[0].bis='2025-11-01',x=>x.suche.push({...x.suche[0]})]){const x=structuredClone(d);change(x);a.throws(()=>f.pruefen(x));}")

    def test_alter_datenstand_heisst_nicht_heute(self):
        self.js("a.equal(f.berichtstag(d,Date.parse('2026-01-03T10:00:00Z')),'2026-01-02');a.equal(f.berichtstag(d,Date.parse('2026-01-02T10:00:00Z')),'2026-01-02');a.equal(f.alt(d.ga4.gemessen,Date.parse('2026-01-02T10:06:00Z')),true);")

    def test_live_links_nur_bekannte_anbieter_und_keine_privaten_werte(self):
        self.js("const r=f.links(f.pruefen(d));a.equal(r.shop,'https://admin.shopify.com/analytics/live');for(const u of Object.values(r)){a.equal(new URL(u).protocol,'https:');a.ok(!u.includes('12300'));a.ok(!u.includes('api_token'));}a.equal(new URL(r.analytics).hostname,'analytics.google.com');a.equal(f.links(null).analytics,'https://analytics.google.com/');")

    def test_teilpruefung_und_eingeschraenkte_statuswerte_erhalten(self):
        self.js("const r=f.pruefen(d);a.equal(r.merchant.teil,true);a.equal(r.merchant.geprueft,100);a.equal(r.merchant.eingeschraenkt,80);a.equal(r.suche[0].vorlaeufig,true);r.shop.umsatz=1;a.equal(d.shop.umsatz,12300);")

    def test_export_schreibt_nicht_in_ein_repository(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);source=root/'input.json';source.write_text('{}')
            for gitfile in [False,True]:
                repo=root/('worktree' if gitfile else 'repo');repo.mkdir()
                if gitfile:(repo/'.git').write_text('gitdir: /nicht-verwendet')
                else:(repo/'.git').mkdir();(repo/'.git/HEAD').write_text('ref: refs/heads/main')
                with self.assertRaises(ValueError):quellenbericht.bauen(source,repo/'privat.html')
