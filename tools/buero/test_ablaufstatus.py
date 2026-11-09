from datetime import datetime, timezone, timedelta
import json
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
