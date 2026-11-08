from datetime import datetime, timezone, timedelta
import json
from pathlib import Path
import re
import unittest
import experten

NOW = datetime(2026,11,8,6,tzinfo=timezone.utc)


def bericht(pruefen='bestanden', stunden=0, offen=4):
    return {'gemessen':(NOW-timedelta(hours=stunden)).isoformat(),
            'stationen':{'pruefen':pruefen,'bauen':'bestanden','angebot':'entwurf'},
            'projekte':[{'id':ident,'name':'NICHT-EXPORTIEREN','naechstes':'NICHT-EXPORTIEREN',
                         'schritte':[{'fertig':i<offen} for i in range(7)]} for ident in experten.PROJEKT_ROLLE]}


class ExpertenTest(unittest.TestCase):
    def test_katalog_passt_zu_oberflaeche_und_rollen_sind_eindeutig(self):
        roles = experten.katalog()
        self.assertEqual(len(roles),len({r['id'] for r in roles}))
        html=(Path(__file__).resolve().parents[1]/'buero/seite.html').read_text()
        raw=re.search(r'id="kb-fachrollen">(.*?)</script>',html,re.S).group(1)
        self.assertEqual(json.loads(raw),roles)
        self.assertEqual(experten.zustaendig('kommentare')['buero'],'Social Media')
        self.assertEqual(experten.zustaendig('email')['buero'],'Shop')
        self.assertEqual(experten.zustaendig('printful')['buero'],'Versand')

    def test_fehler_zuerst_und_kundenauftraege_warten(self):
        plan=experten.planen(bericht(pruefen='fehlgeschlagen'),NOW)
        self.assertEqual(plan['auftraege'][0]['id'],'tests_klaeren')
        self.assertEqual(plan['auftraege'][0]['rolle'],'fehleranalyse')
        self.assertFalse(plan['auftraege'][0]['automatisch'])
        self.assertTrue(all(j['zustand']=='Wartet auf Prüfung' for j in plan['auftraege'] if j['id'].startswith('projekt_')))

    def test_erster_offener_schritt_aendert_auftrag_und_zustaendigkeit(self):
        a=experten.planen(bericht(offen=2),NOW)
        b=experten.planen(bericht(offen=4),NOW)
        job_a=next(j for j in a['auftraege'] if j['id']=='projekt_email')
        job_b=next(j for j in b['auftraege'] if j['id']=='projekt_email')
        self.assertEqual(job_a['rolle'],'qualitaet')
        self.assertEqual(job_b['rolle'],'support')
        self.assertEqual(job_b['zustand'],'Eingang fehlt')
        self.assertFalse(job_b['automatisch'])
        self.assertEqual(job_b['mitwirkung'],['integration'])
        self.assertNotEqual(job_a['naechster'],job_b['naechster'])

    def test_alte_pruefung_ist_keine_aktuelle_freigabe(self):
        plan=experten.planen(bericht(stunden=25),NOW)
        self.assertEqual(plan['auftraege'][0]['id'],'status_pruefen')
        self.assertIsNone(plan['gemessen'])
        self.assertFalse(any(r['zustand']=='Prüfung bestanden' for r in plan['rollen']))

    def test_plan_ist_wiederholbar_und_uebernimmt_keine_fremden_texte(self):
        source=bericht()
        a=experten.planen(source,NOW)
        self.assertEqual(a,experten.planen(source,NOW))
        self.assertNotIn('NICHT-EXPORTIEREN',json.dumps(a))
        self.assertEqual(len(a['auftraege']),len({j['id'] for j in a['auftraege']}))

    def test_paketbau_ist_voraussetzung_und_doppelte_auftraege_werden_vermieden(self):
        data=bericht()
        data['stationen']['bauen']='offen'
        data['projekte']+=data['projekte']
        plan=experten.planen(data,NOW)
        self.assertEqual(plan['auftraege'][0]['id'],'pakete_bauen')
        self.assertEqual(len(plan['auftraege']),len({j['id'] for j in plan['auftraege']}))
        self.assertTrue(all(j['zustand']=='Wartet auf Paketbau' for j in plan['auftraege'] if j['id'].startswith('projekt_')))

    def test_abgeschlossene_meilensteine_erzeugen_keinen_neuen_projektauftrag(self):
        plan=experten.planen(bericht(offen=7),NOW)
        self.assertEqual(plan['auftraege'],[])
        self.assertTrue(any(r['zustand']=='Paketbau bestätigt' for r in plan['rollen']))

    def test_blockierte_projektarbeit_ist_nicht_automatisch_ausfuehrbar(self):
        for offen in (2, 3):
            for status, stunden in [('fehlgeschlagen', 0), ('offen', 0), ('bestanden', 25), ('bestanden', -1)]:
                with self.subTest(offen=offen, status=status, stunden=stunden):
                    plan = experten.planen(bericht(pruefen=status, stunden=stunden, offen=offen), NOW)
                    jobs = [j for j in plan['auftraege'] if j['id'].startswith('projekt_')]
                    self.assertTrue(jobs)
                    self.assertTrue(all(j['zustand'] == 'Wartet auf Prüfung' for j in jobs))
                    self.assertFalse(any(j['automatisch'] for j in jobs))

    def test_freigegebene_lokale_pruefung_und_paketarbeit_bleiben_automatisch(self):
        for offen in (2, 3):
            with self.subTest(offen=offen):
                plan = experten.planen(bericht(offen=offen), NOW)
                jobs = [j for j in plan['auftraege'] if j['id'].startswith('projekt_')]
                self.assertTrue(all(j['zustand'] == 'Nächster Schritt' and j['automatisch'] for j in jobs))


if __name__=='__main__': unittest.main()
