"""Nur Laufzustände veröffentlichen: keine Protokolle, Konto- oder Kundendaten."""
from datetime import datetime, timezone, timedelta
import os
from pathlib import Path
import tagespflege

IDS = {'auswahl','schaufenster','waechter','autopilot','fortura','printful','social_meta','social_pinterest'}


def bereinigen(runs, jetzt=None):
    jetzt = jetzt or datetime.now(timezone.utc)
    rows = []
    for ident in sorted(IDS):
        r = runs.get(ident, {})
        row = {'id':ident, 'status':'gelb','gemessen':'','gemessen_text':'Nicht gemessen','frisch_h':48,
               'ereignis':'Laufstatus nicht verfügbar','ereignis_iso':'',
               'befund':'Der letzte Ablauf konnte nicht gelesen werden. Ausführung und Ergebnis sind unbekannt.',
               'quelle':'Automatischer Abruf der Ablaufstände',
               'naechster_schritt':'Zugang oder letzten Ablauf prüfen. Ein Link allein bestätigt keine Ausführung.'}
        try:
            t = datetime.fromisoformat(r['zeit'].replace('Z','+00:00'))
            if r.get('fehler') or t.tzinfo is None or t > jetzt+timedelta(minutes=5): raise ValueError()
            status, ende = r.get('status'), r.get('conclusion')
            if status not in ('queued','in_progress','completed','waiting','pending','requested'): raise ValueError()
            if status=='completed' and ende not in ('success','failure','cancelled','timed_out','action_required','neutral','skipped','stale','startup_failure'): raise ValueError()
            row.update(gemessen=t.isoformat(),gemessen_text=t.strftime('%d.%m. %H:%M UTC'),ereignis_iso=t.isoformat())
            row['status'] = 'gruen' if status=='completed' and ende=='success' else 'rot' if status=='completed' and ende in ('failure','timed_out','startup_failure') else 'gelb'
            row['ereignis'] = 'Letzter Lauf erfolgreich' if row['status']=='gruen' else 'Letzter Lauf fehlgeschlagen' if row['status']=='rot' else 'Ergebnis noch zu prüfen'
            row['befund'] = ('Der letzte Ablauf endete erfolgreich. Das bestätigt nur den Ablauf, keine Verkäufe und keinen fehlerfreien Shop.' if row['status']=='gruen' else
                            'Der letzte Ablauf ist fehlgeschlagen. Ursache prüfen, bevor erneut gestartet wird.' if row['status']=='rot' else
                            'Der letzte Ablauf wartet, läuft noch oder endete ohne Erfolgsnachweis. Kein abgeschlossener Arbeitsfortschritt belegt.')
            row['naechster_schritt'] = 'Ergebnis im passenden Arbeitsbereich prüfen; fachliche Wirkung getrennt nachweisen.'
        except (ValueError,TypeError,KeyError,AttributeError): pass
        rows.append(row)
    return rows


def lesen():
    runs = tagespflege.github_lesen(Path(__file__).resolve().parents[2], os.environ.get('GITHUB_TOKEN',''), ids=IDS)
    return bereinigen(runs)
