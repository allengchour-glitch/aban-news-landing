"""Zwei regelbasierte Gehirne: planen, gegenprüfen und Obsidian-Wissen exportieren."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import zipfile
import experten

WORKFLOWS = {'auswahl': 'Produktauswahl', 'schaufenster': 'Merchant-Schaufenster',
             'waechter': 'Lagerwächter', 'autopilot': 'Shop-Autopilot',
             'fortura': 'Fortura-Bestand', 'printful': 'Printful-Tracking'}


def alter(iso, jetzt):
    try:
        value = datetime.fromisoformat(iso.replace('Z', '+00:00'))
        if value.tzinfo is None: return None
        stunden = (jetzt - value).total_seconds() / 3600
        return stunden if stunden >= 0 else None
    except (ValueError, TypeError, AttributeError):
        return None


def planen(pflege, werkstatt, jetzt):
    aufgaben = []
    geprueft = 0
    unbekannt = 0
    fehlgeschlagen = 0
    for ident, name in WORKFLOWS.items():
        run = pflege.get('github', {}).get(ident, {})
        stunden = alter(run.get('zeit'), jetzt)
        if run.get('fehler') or stunden is None:
            unbekannt += 1
            aufgaben.append({'prioritaet': 1, 'id': ident, 'titel': name + ': Messung fehlt', 'grund': 'Zugang und letzten Lauf prüfen; kein Beleg für einen Shopfehler.'})
            continue
        geprueft += 1
        if run.get('status') == 'completed' and run.get('conclusion') not in ('success', 'skipped'):
            fehlgeschlagen += 1
            aufgaben.append({'prioritaet': 0, 'id': ident, 'titel': name + ': Lauf prüfen', 'grund': 'Lauf ohne Erfolg beendet. Ursache im Originalprotokoll feststellen.'})
        elif stunden > 48 or not run.get('geplant'):
            aufgaben.append({'prioritaet': 1, 'id': ident, 'titel': name + ': Überwachung prüfen', 'grund': 'Messung älter als 48 Stunden oder kein aktiver Cron erkannt.'})
        elif run.get('status') != 'completed':
            aufgaben.append({'prioritaet': 2, 'id': ident, 'titel': name + ': Ergebnis abwarten', 'grund': 'Lauf ist noch nicht abgeschlossen.'})
    expert_plan = experten.planen(werkstatt, jetzt)
    for job in expert_plan['auftraege']:
        aufgaben.append({'prioritaet':job['prioritaet'], 'id':job['id'][8:] if job['id'].startswith('projekt_') else 'intern_'+job['id'],
                         'titel':job['titel'], 'grund':job['naechster'], 'rolle':job['rolle']})
    for a in aufgaben:
        rolle = next((r for r in experten.katalog() if r['id']==a.get('rolle')), None) or experten.zustaendig(a['id'])
        a.update(experte=rolle['name'], buero=rolle['buero'])
    aufgaben.sort(key=lambda a: (a['prioritaet'], a['id']))
    frisch = alter(werkstatt.get('gemessen'), jetzt)
    tests = werkstatt.get('stationen', {}).get('pruefen') == 'bestanden' and frisch is not None and frisch <= 24
    return {'version': 1, 'gemessen': jetzt.isoformat(), 'modus': 'Regelbasierte Planung und Gegenprüfung',
            'takt': 'Alle 6 Stunden geplant; GitHub kann Läufe verzögern oder auslassen.',
            'hirn_planung': {'name': 'Planung & Wissen', 'aufgaben': aufgaben},
            'expertenplan': expert_plan,
            'hirn_pruefung': {'name': 'Prüfung & Ausführung', 'tests_frisch_bestanden': tests,
                             'shoplaeufe_gelesen': geprueft, 'shoplaeufe_fehlgeschlagen': fehlgeschlagen,
                             'shoplaeufe_unbekannt': unbekannt, 'shopfehler_gesamt': None,
                             'freigabe_shop_schreiben': False},
            'grenze': 'Workflow-Ergebnisse sind keine vollständige Shopprüfung. Keine unbeaufsichtigten Shopänderungen; bestehende Shop-Abläufe arbeiten nach ihren eigenen Regeln.'}


def exportieren(report, out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    (out / 'zentrale.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    vault = out / 'Obsidian-Buero'
    vault.mkdir()
    pruefung = report['hirn_pruefung']
    (vault / 'Start.md').write_text('# KI-Büro\n\n[[Planung]] · [[Prüfung]] · [[Shop]] · [[Team]]\n\nGemessen: ' + report['gemessen'] + '\n\n' + report['takt'] + '\n\nDieser Vault ist ein Export. Keine laufende Verbindung zur Obsidian-App.\n', encoding='utf-8')
    (vault / 'Planung.md').write_text('# Planung & Wissen\n\n' + '\n'.join('- [ ] ' + a['titel'] + ' — ' + a['experte'] + ': ' + a['grund'] for a in report['hirn_planung']['aufgaben']) + '\n', encoding='utf-8')
    (vault / 'Prüfung.md').write_text('# Prüfung & Ausführung\n\nFrische Selbsttests bestanden: ' + ('ja' if pruefung['tests_frisch_bestanden'] else 'nicht bestätigt') + '\n\nShop-Läufe gelesen: ' + str(pruefung['shoplaeufe_gelesen']) + '\n\nFehlgeschlagene Läufe: ' + str(pruefung['shoplaeufe_fehlgeschlagen']) + '\n\nUnbekannte Läufe: ' + str(pruefung['shoplaeufe_unbekannt']) + '\n\nGesamtzahl der Shopfehler: nicht gemessen. Ziel: bestätigte Fehler beheben und erneut prüfen.\n', encoding='utf-8')
    (vault / 'Shop.md').write_text('# Shop verbessern\n\n[[Planung]] → [[Prüfung]] → bestehender Fachablauf → frisch prüfen.\n\n' + report['grenze'] + '\n\nEin erfolgreicher Lauf bestätigt nur seinen begrenzten Prüfumfang. Neue Produkte und Änderungen können neue Fehler bringen. Null bekannte Fehler sind kein Nachweis für einen fehlerfreien Shop.\n', encoding='utf-8')
    team = report.get('expertenplan', {})
    (out / 'expertenplan.json').write_text(json.dumps(team, ensure_ascii=False, indent=2), encoding='utf-8')
    (vault / 'Team.md').write_text('# Fachrollen und nächste Aufgaben\n\n' + team.get('hinweis','') + '\n\n' + '\n'.join('- ' + r['buero'] + ': ' + r['name'] + ' — ' + r['zustand'] + ': ' + r['naechster'] for r in team.get('rollen',[])) + '\n', encoding='utf-8')
    with zipfile.ZipFile(out / 'obsidian-buero.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for file in sorted(vault.glob('*.md')): z.write(file, 'Obsidian-Buero/' + file.name)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--pflege', type=Path, required=True)
    p.add_argument('--werkstatt', type=Path, required=True)
    p.add_argument('ausgabe', type=Path)
    a = p.parse_args()
    exportieren(planen(json.loads(a.pflege.read_text()), json.loads(a.werkstatt.read_text()), datetime.now(timezone.utc)), a.ausgabe)
