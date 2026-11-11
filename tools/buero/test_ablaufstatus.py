from datetime import datetime, timezone, timedelta
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch
import ablaufstatus
import tagespflege


class AblaufTest(unittest.TestCase):
    def test_status_ohne_private_quelltexte(self):
        now=datetime.now(timezone.utc)
        run={'zeit':now.isoformat(),'status':'completed','conclusion':'success','html_url':'GEHEIM','message':'GEHEIM'}
        rows=ablaufstatus.bereinigen({'auswahl':run,'autopilot':dict(run,conclusion='failure'),
                                     'fortura':dict(run,status='in_progress',conclusion=None)},now)
        by={r['id']:r for r in rows}
        self.assertEqual(set(by),ablaufstatus.IDS)
        self.assertEqual(by['auswahl']['status'],'gruen')
        self.assertEqual(by['autopilot']['status'],'rot')
        self.assertEqual(by['fortura']['status'],'gelb')
        self.assertNotIn('GEHEIM',json.dumps(rows))
        self.assertNotIn('html_url',json.dumps(rows))

    def test_unbekannt_abgebrochen_und_zukunft_nicht_gruen(self):
        now=datetime.now(timezone.utc)
        for r in [{},{'zeit':now.isoformat(),'status':'completed','conclusion':'cancelled'},
                  {'zeit':(now+timedelta(hours=1)).isoformat(),'status':'completed','conclusion':'success'},
                  {'zeit':now.isoformat(),'status':'completed','conclusion':None},
                  {'zeit':now.isoformat(),'status':'completed','conclusion':'success','fehler':'privat'}]:
            with self.subTest(r=r):
                row=next(r for r in ablaufstatus.bereinigen({'auswahl':r},now) if r['id']=='auswahl')
                self.assertEqual(row['status'],'gelb')

    def test_alter_lauf_behaelt_tatsaechliche_zeit(self):
        now=datetime.now(timezone.utc);old=(now-timedelta(days=3)).isoformat()
        row=next(r for r in ablaufstatus.bereinigen({'auswahl':{'zeit':old,'status':'completed','conclusion':'success'}},now) if r['id']=='auswahl')
        self.assertEqual(row['gemessen'],old)
        self.assertEqual(row['frisch_h'],48)

    def test_leser_fragt_nur_bekannte_arbeitsplaetze_ab(self):
        with patch.object(tagespflege,'github_lesen',return_value={}) as read:
            self.assertEqual(len(ablaufstatus.lesen()),12)
            self.assertEqual(read.call_args.kwargs['ids'],ablaufstatus.IDS-{'yt_skript','yt_wachstum'})

    def test_videoentwurf_ist_keine_veroeffentlichung_oder_wachstum(self):
        now=datetime.now(timezone.utc)
        run={'zeit':now.isoformat(),'status':'completed','conclusion':'success'}
        with patch.object(tagespflege,'github_lesen',return_value={'yt_video':run}):
            rows={r['id']:r for r in ablaufstatus.lesen()}
        self.assertEqual(rows['yt_video']['status'],'gruen')
        self.assertEqual(rows['yt_skript']['status'],'gruen')
        self.assertEqual(rows['yt_wachstum']['status'],'gelb')
        self.assertIn('Kein Upload',rows['yt_video']['befund'])
        self.assertNotIn('Follower',rows['yt_video']['ereignis'])

    def test_bewertungen_erfolg_beweist_keine_veroeffentlichung(self):
        now=datetime.now(timezone.utc)
        run={'zeit':now.isoformat(),'status':'completed','conclusion':'success'}
        row=next(r for r in ablaufstatus.bereinigen({'bewertungen':run},now) if r['id']=='bewertungen')
        self.assertEqual(tagespflege.WORKFLOWS['bewertungen'],'cj-reviews.yml')
        self.assertEqual(row['status'],'gelb')
        self.assertEqual(row['aktiv_h'],0)
        self.assertIn('Keine Importzahl bestätigt',row['befund'])
        self.assertIn('Testlauf',row['naechster_schritt'])

    def test_bewertungen_fehler_und_fehlende_messung_bleiben_sichtbar(self):
        now=datetime.now(timezone.utc)
        for run,status in [({},'gelb'),({'zeit':now.isoformat(),'status':'completed','conclusion':'failure'},'rot')]:
            row=next(r for r in ablaufstatus.bereinigen({'bewertungen':run},now) if r['id']=='bewertungen')
            self.assertEqual(row['status'],status)
            self.assertEqual(row['aktiv_h'],0)

    def test_metricool_liest_vorhandene_freigabe_ohne_veroeffentlichung_zu_behaupten(self):
        now=datetime.now(timezone.utc)
        for ident in ('social_meta','social_pinterest'):
            self.assertEqual(tagespflege.WORKFLOWS[ident],'metricool-freigabe.yml')
            run={'zeit':now.isoformat(),'status':'completed','conclusion':'success'}
            row=next(r for r in ablaufstatus.bereinigen({ident:run},now) if r['id']==ident)
            self.assertEqual(row['status'],'gelb')
            self.assertEqual(row['aktiv_h'],0)
            self.assertIn('Metricool',row['quelle'])
            self.assertIn('nicht bestätigt',row['befund'])
            self.assertNotIn('veröffentlicht!',row['ereignis'])

    def test_abschlussnachweis_bleibt_explizit(self):
        now=datetime.now(timezone.utc);start=(now-timedelta(minutes=12)).isoformat()
        run={'zeit':start,'status':'completed','conclusion':'success','ende_zeit':now.isoformat(),'lauf_id':'12345'}
        by={r['id']:r for r in ablaufstatus.bereinigen({'auswahl':run,'fortura':dict(run,status='queued',conclusion=None)},now)}
        self.assertEqual((by['auswahl']['lauf_status'],by['auswahl']['lauf_ergebnis'],by['auswahl']['lauf_ende']),('completed','success',now.isoformat()))
        self.assertEqual((by['fortura']['lauf_status'],by['fortura']['lauf_ergebnis'],by['fortura']['lauf_ende']),('queued','',''))
        self.assertEqual(by['bewertungen']['lauf_status'],'')
        self.assertEqual(by['auswahl']['lauf_id'],'12345')
        self.assertEqual(by['yt_wachstum']['lauf_status'],'')
        for stamp in [(now+timedelta(hours=2)).isoformat(),'kaputt']:
            row=next(r for r in ablaufstatus.bereinigen({'auswahl':dict(run,ende_zeit=stamp)},now) if r['id']=='auswahl')
            self.assertEqual(row['lauf_ende'],'')

    def test_oeffentlicher_leser_passt_zum_echten_lieferanten(self):
        now=datetime.now(timezone.utc)
        run={'zeit':(now-timedelta(minutes=10)).isoformat(),'status':'completed','conclusion':'success','ende_zeit':now.isoformat()}
        payload={'version':1,'gemessen':now.isoformat(),'arbeitsplaetze':ablaufstatus.bereinigen({i:run for i in ablaufstatus.IDS},now)}
        code=r"""const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const input=JSON.parse(fs.readFileSync(0,'utf8')),source=fs.readFileSync(input.source,'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
async function read(payload,status=200){
 const initial=input.payload.arbeitsplaetze.map(r=>({id:r.id,status:'gelb',gemessen:'',frisch_h:48,befund:'Vorher',lauf_status:'completed',lauf_ergebnis:'success',lauf_ende:'Alt'}));
 const ctx={window:{__ROWS:clone(initial),__runAll(){}},document:{hidden:false,addEventListener(){}},AbortController,setTimeout(){return 1},clearTimeout(){},setInterval(){},fetch:async url=>({ok:status===200&&url==='/buero-ablaufstatus.json',status,text:async()=>JSON.stringify(payload)})};
 vm.runInNewContext(source,ctx);await new Promise(setImmediate);return {rows:ctx.window.__ROWS,initial};
}
(async()=>{
 let r=await read(input.payload);assert.equal(r.rows.length,12);assert.ok(r.rows.every(z=>z.gemessen));assert.equal(r.rows.find(z=>z.id==='auswahl').lauf_ergebnis,'success');assert.ok(r.rows.find(z=>z.id==='bewertungen').ereignis.includes('Import'));
 for(const change of [p=>p.arbeitsplaetze.pop(),p=>p.arbeitsplaetze.push(clone(p.arbeitsplaetze[0])),p=>p.arbeitsplaetze[0].lauf_ende='2999-01-01T00:00:00Z',p=>p.arbeitsplaetze[0].lauf_status='invented']){
  const bad=clone(input.payload);change(bad);r=await read(bad);assert.deepEqual(r.rows,r.initial);
 }
 for(const status of [403,429,503]){r=await read(input.payload,status);assert.deepEqual(r.rows,r.initial);}
 const legacy=clone(input.payload);legacy.arbeitsplaetze.forEach(z=>['lauf_status','lauf_ergebnis','lauf_ende'].forEach(k=>delete z[k]));r=await read(legacy);assert.ok(r.rows.every(z=>z.gemessen&&z.lauf_status===''&&z.lauf_ergebnis===''&&z.lauf_ende===''));
 console.log('Quellenvertrag:12Arbeitsbereiche,Abschlussdaten,Altformat,Fehlererhalt bestanden');
})().catch(e=>{console.error(e);process.exitCode=1});"""
        probe=subprocess.run(['node','-e',code],input=json.dumps({'source':str(Path(__file__).with_name('status_anzeige.js')),'payload':payload}),text=True,capture_output=True)
        self.assertEqual(probe.returncode,0,probe.stderr)
