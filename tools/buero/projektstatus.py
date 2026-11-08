"""Öffentlichen Projektstatus frisch prüfen und ohne private Arbeitsdaten veröffentlichen."""
import argparse
from datetime import datetime, timezone, timedelta
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent
DEV = ROOT.parent / 'entwicklerbuero'
IDS = {'dev_bauen', 'dev_pruefen', 'dev_angebot'}


def bericht_lesen(pfad):
    p = Path(pfad)
    if p.stat().st_size > 16384:
        raise ValueError('Projektbericht ist zu gross.')
    r = json.loads(p.read_text(encoding='utf-8'))
    if not isinstance(r, dict) or r.get('version') != 1 or r.get('projekt') != 'anfragen-assistent' or r.get('dauerlauf') is not False:
        raise ValueError('Unbekannter Projektbericht.')
    if not isinstance(r.get('gemessen'), str):
        raise ValueError('Messzeit fehlt.')
    gem = datetime.fromisoformat(r['gemessen'].replace('Z', '+00:00'))
    if gem.tzinfo is None or gem > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise ValueError('Projektbericht braucht eine gültige Messzeit mit Zeitzone.')
    sta = r.get('stationen')
    erlaubt = {'bauen': {'offen', 'bestanden'}, 'pruefen': {'offen', 'bestanden', 'fehlgeschlagen'}, 'angebot': {'offen', 'entwurf'}}
    if not isinstance(sta, dict) or set(sta) != set(erlaubt) or any(not isinstance(sta[k], str) or sta[k] not in erlaubt[k] for k in erlaubt):
        raise ValueError('Unbekannter Projektzustand.')
    projekte = []
    if sta['bauen'] == 'bestanden':
        if sta['pruefen'] != 'bestanden':
            raise ValueError('Bau ohne bestandene Prüfung ist nicht belegt.')
        for name in ('automationen.zip', 'anfragen-assistent.zip'):
            with zipfile.ZipFile(p.parent / name) as z:
                if not z.namelist() or z.testzip() is not None:
                    raise ValueError('Lieferpaket ist nicht bestätigt.')
        spec = importlib.util.spec_from_file_location('oeffentliche_projekte', DEV / 'projekte.py')
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        # Fortschritt aus tatsächlichen Lieferpaketen und festen Projektdaten neu ableiten.
        # Beliebige Projekttexte, Links und weitere Berichtsfelder nie übernehmen.
        for item in mod.bericht(p.parent, True):
            projekte.append({k: item[k] for k in ('id', 'name', 'buero', 'prozent', 'schritte', 'naechstes')})
    return {'version': 1, 'projekt': 'anfragen-assistent', 'dauerlauf': False,
            'gemessen': gem.isoformat(), 'stationen': dict(sta), 'projekte': projekte}


def bauen(ziel):
    import webseite
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / 'werkstatt'
        pfad = out / 'status.json'
        try:
            qa = subprocess.run([sys.executable, '-B', '-m', 'unittest', 'discover', '-s', str(DEV), '-p', 'test_*.py'],
                                capture_output=True, text=True, timeout=60)
            if qa.returncode:
                report = {'version':1, 'projekt':'anfragen-assistent', 'dauerlauf':False,
                          'gemessen':datetime.now(timezone.utc).isoformat(),
                          'stationen':{'bauen':'offen','pruefen':'fehlgeschlagen','angebot':'offen'},'projekte':[]}
            else:
                lauf = subprocess.run([sys.executable, '-B', str(DEV / 'werkstatt.py'), str(out)],
                                      capture_output=True, text=True, timeout=120)
                report = bericht_lesen(pfad)
                if lauf.returncode != 0 and report['stationen']['bauen'] == 'bestanden':
                    raise ValueError('Fehlgeschlagener Lauf bestätigt keinen abgeschlossenen Bau.')
        except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile, subprocess.TimeoutExpired):
            report = {'version': 1, 'projekt': 'anfragen-assistent', 'dauerlauf': False,
                      'gemessen': datetime.now(timezone.utc).isoformat(),
                      'stationen': {'bauen': 'offen', 'pruefen': 'offen', 'angebot': 'offen'}, 'projekte': []}
        out.mkdir(parents=True, exist_ok=True)
        pfad.write_text(json.dumps(report, ensure_ascii=False), encoding='utf-8')
        rows = webseite.bauen(ziel, werkstatt_status=pfad)
        payload = {'version': 1, 'gemessen': report['gemessen'],
                   'arbeitsplaetze': [r for r in rows if r['id'] in IDS]}
        Path(ziel).with_name('buero-projektstatus.json').write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
        print('Öffentlicher Projektstatus: ' + ', '.join(k + '=' + v for k, v in report['stationen'].items()))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ziel', type=Path)
    args = parser.parse_args()
    bauen(args.ziel)
