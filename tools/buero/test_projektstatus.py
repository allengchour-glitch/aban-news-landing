from datetime import datetime, timezone, timedelta
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile
import projektstatus
import webseite


class ProjektstatusTest(unittest.TestCase):
    def quelle(self, root, bauen='bestanden', pruefen='bestanden', angebot='entwurf'):
        p = root / 'status.json'
        p.write_text(json.dumps({'version': 1, 'projekt': 'anfragen-assistent', 'dauerlauf': False,
            'gemessen': datetime.now(timezone.utc).isoformat(),
            'stationen': {'bauen': bauen, 'pruefen': pruefen, 'angebot': angebot},
            'geheim': 'PRIVATER-INHALT', 'projekte': [{'name': 'PRIVATER-INHALT'}]}))
        for name in ('automationen.zip', 'anfragen-assistent.zip'):
            with zipfile.ZipFile(root / name, 'w') as z:
                z.writestr('demo.txt', 'Erfundenes Beispiel')
        return p

    def modellbau(self, cmd, **kwargs):
        for name in ('kb3d-code.js', 'kb3d-pack-1.js', 'kb3d-pack-2.js', 'kb3d-pack-3.js'):
            (Path(cmd[-1]) / name).write_text('/* Modellbau im Test ersetzt */')
        return subprocess.CompletedProcess(cmd, 0)

    def test_nur_drei_stationendaten_und_belegter_fortschritt(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.quelle(root)
            self.assertNotIn('PRIVATER-INHALT', json.dumps(projektstatus.bericht_lesen(p)))
            with patch.object(webseite.subprocess, 'run', side_effect=self.modellbau):
                rows = webseite.bauen(root / 'index.html', werkstatt_status=p)
            dev = {r['id']: r for r in rows if r['id'] in projektstatus.IDS}
            self.assertEqual(dev['dev_bauen']['status'], 'gruen')
            self.assertEqual(dev['dev_pruefen']['status'], 'gruen')
            self.assertEqual(dev['dev_angebot']['status'], 'du')
            self.assertTrue(all(r['ereignis'] != 'Nicht verbunden' and r['gemessen'] for r in dev.values()))
            self.assertTrue(all(r['ereignis'] == 'Nicht verbunden' for r in rows if r['id'] not in projektstatus.IDS))
            self.assertEqual([p['prozent'] for p in dev['dev_bauen']['projekte']], [57]*4)
            team=dev['dev_bauen']['expertenplan']
            self.assertEqual(next(r for r in team['rollen'] if r['id']=='community')['buero'],'Social Media')
            self.assertEqual(next(j for j in team['auftraege'] if j['id']=='projekt_email')['zustand'],'Eingang fehlt')
            self.assertNotIn('PRIVATER-INHALT', (root / 'index.html').read_text())
            self.assertTrue(all('link' not in p for p in dev['dev_bauen']['projekte']))
            self.assertIn('__aktualisiereProjektstatus', (root / 'index.html').read_text())

    def test_fehlgeschlagene_pruefung_keine_paketfreigabe(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.quelle(root, bauen='offen', pruefen='fehlgeschlagen', angebot='offen')
            with patch.object(webseite.subprocess, 'run', side_effect=self.modellbau):
                rows = webseite.bauen(root / 'index.html', werkstatt_status=p)
            self.assertEqual(next(r for r in rows if r['id']=='dev_pruefen')['status'], 'rot')
            self.assertEqual(next(r for r in rows if r['id']=='dev_bauen')['projekte'], [])

    def test_ohne_bericht_keine_vorgetaeuschte_verbindung(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'index.html'
            with patch.object(webseite.subprocess, 'run', side_effect=self.modellbau):
                rows = webseite.bauen(p)
            self.assertTrue(all(r['ereignis']=='Nicht verbunden' for r in rows))
            self.assertNotIn('__aktualisiereProjektstatus', p.read_text())

    def test_bestaetigter_bau_braucht_tatsaechliche_pakete(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.quelle(root)
            (root / 'automationen.zip').unlink()
            with self.assertRaises(OSError):
                projektstatus.bericht_lesen(p)
            p = self.quelle(root, pruefen='fehlgeschlagen')
            with self.assertRaises(ValueError):
                projektstatus.bericht_lesen(p)

    def test_falsche_zeit_und_zustaende_werden_abgelehnt(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for gem in ['2026-11-08T00:00:00', (datetime.now(timezone.utc)+timedelta(hours=1)).isoformat(), None]:
                p = self.quelle(root)
                data = json.loads(p.read_text()); data['gemessen'] = gem; p.write_text(json.dumps(data))
                with self.assertRaises(ValueError): projektstatus.bericht_lesen(p)
            p = self.quelle(root)
            data = json.loads(p.read_text()); data['stationen']['bauen'] = []; p.write_text(json.dumps(data))
            with self.assertRaises(ValueError): projektstatus.bericht_lesen(p)

    def test_fachteam_tests_mit_fehler_verhindern_erfolgreichen_bau(self):
        with tempfile.TemporaryDirectory() as tmp:
            def seite(ziel, werkstatt_status, **kwargs):
                report=json.loads(Path(werkstatt_status).read_text())
                self.assertEqual(report['stationen']['pruefen'],'fehlgeschlagen')
                self.assertEqual(report['stationen']['bauen'],'offen')
                return [{'id':'dev_pruefen','status':'rot'}]
            with patch.object(projektstatus.subprocess,'run',return_value=subprocess.CompletedProcess([],1)) as run, patch.object(webseite,'bauen',side_effect=seite):
                projektstatus.bauen(Path(tmp)/'ki-buero.html')
                self.assertEqual(run.call_count,1)

    def test_abgebrochener_lauf_publiziert_keinen_erfolg(self):
        with tempfile.TemporaryDirectory() as tmp:
            def seite(ziel, werkstatt_status, **kwargs):
                report = json.loads(Path(werkstatt_status).read_text())
                self.assertEqual(set(report['stationen'].values()), {'offen'})
                self.assertEqual(report['projekte'], [])
                return [{'id': 'dev_bauen', 'status': 'gelb'}]
            with patch.object(projektstatus.subprocess, 'run', side_effect=subprocess.TimeoutExpired('werkstatt', 120)), patch.object(webseite, 'bauen', side_effect=seite):
                projektstatus.bauen(Path(tmp)/'ki-buero.html')
            data = json.loads((Path(tmp)/'buero-projektstatus.json').read_text())
            self.assertEqual(data['arbeitsplaetze'][0]['status'], 'gelb')


if __name__ == '__main__':
    unittest.main()
