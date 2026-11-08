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
            self.assertEqual(len(ablaufstatus.lesen()),8)
            self.assertEqual(read.call_args.kwargs['ids'],ablaufstatus.IDS)
