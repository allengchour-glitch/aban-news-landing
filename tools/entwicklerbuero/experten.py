"""Fachrollen und begrenzte, regelbasierte Auftragsplanung für bestehende Abläufe."""
from datetime import datetime, timezone

# Kennung, Rolle, Büro, vorhandener Arbeitsplatz, Darstellung, Zuständigkeit.
ROLLEN = [
    ('leitung', 'Automations-Leitung', 'Chefbüro', '__chef', 'leitung', 'Fachrollen, Prioritäten und offene Voraussetzungen koordinieren.'),
    ('entwicklung', 'Software-Entwickler', 'Entwicklerbüro', 'dev_bauen', 'entwicklung', 'Lokale Prototypen weiterentwickeln und Änderungen mit Tests absichern.'),
    ('automation', 'Workflow-Architekt', 'Entwicklerbüro', 'dev_bauen', 'entwicklung', 'Abläufe verbinden und geprüfte Lieferpakete bauen.'),
    ('integration', 'Integrations-Experte', 'Entwicklerbüro', 'dev_bauen', 'entwicklung', 'Datenquellen, Übergaben und Zugangsvoraussetzungen planen.'),
    ('qualitaet', 'Qualitätssicherung', 'Entwicklerbüro', 'dev_pruefen', 'analyse', 'Selbsttests ausführen und unbelegte Fortschritte verhindern.'),
    ('fehleranalyse', 'Fehleranalyse', 'Entwicklerbüro', 'dev_pruefen', 'analyse', 'Fehlgeschlagene Prüfungen zuerst untersuchen.'),
    ('produkt', 'Produktmanager', 'Entwicklerbüro', 'dev_angebot', 'leitung', 'Pilotumfang, Abnahme und nächste Ausbauschritte ordnen.'),
    ('zahlung', 'Checkout-Experte', 'Entwicklerbüro', 'dev_angebot', 'analyse', 'Eigenen Produkt-Checkout und Lieferung vorbereiten.'),
    ('support', 'Kundenservice', 'Shop', 'autopilot', 'kommunikation', 'E-Mail-Entwürfe prüfen und den Postfach-Pilot vorbereiten.'),
    ('sortiment', 'Sortiments-Experte', 'Shop', 'auswahl', 'analyse', 'Produktdaten und belegte Verbesserungsmöglichkeiten prüfen.'),
    ('seo', 'SEO- und Feed-Experte', 'Shop', 'schaufenster', 'analyse', 'Webseiten-Prototyp, Suchsichtbarkeit und Produktfeed betreuen.'),
    ('lieferbarkeit', 'Lieferbarkeits-Prüfer', 'Shop', 'waechter', 'logistik', 'Bestätigte Lieferprobleme von unbekannten Messungen trennen.'),
    ('bestand', 'Bestands-Experte', 'Shop', 'fortura', 'logistik', 'Bestandsabgleich und Aktualität der Daten überwachen.'),
    ('versand', 'Versand-Spezialist', 'Versand', 'printful', 'logistik', 'Tracking und offene Übergaben prüfen.'),
    ('community', 'Community- und FAQ-Experte', 'Social Media', 'social_meta', 'kommunikation', 'Kommentarentwürfe und wiederkehrende offene Fragen aufbereiten.'),
    ('marketing', 'Marketing-Analyst', 'Social Media', 'social_pinterest', 'analyse', 'Ergebnisse auswerten und nächste Inhalte priorisieren.'),
    ('redaktion', 'Skriptredaktion', 'YouTube-Studio', 'yt_skript', 'kommunikation', 'Themen, Skripte und nachvollziehbare Quellen vorbereiten.'),
    ('video', 'Video-Experte', 'YouTube-Studio', 'yt_video', 'entwicklung', 'Videoentwürfe und Qualitätsprüfung vorbereiten.'),
    ('wachstum', 'Kanal-Analyst', 'YouTube-Studio', 'yt_wachstum', 'analyse', 'Belegte Ergebnisse und offene Kanalmaßnahmen ordnen.'),
]
PROJEKT_ROLLE = {'email': 'support', 'kommentare': 'community', 'angebote': 'produkt', 'webseiten': 'seo'}
PROJEKT_NAMEN = {'email': 'E-Mail-Beantworter', 'kommentare': 'Kommentar-Beantworter', 'angebote': 'Angebots-Nachfasser', 'webseiten': 'Webseiten-Prüfer'}
AKTIONEN = ['Projektumfang festlegen.', 'Prototyp entwickeln und lokal prüfen.',
            'Fehlende oder fehlgeschlagene Selbsttests untersuchen.', 'Demos und Lieferpakete neu bauen.',
            'Freigegebene Eingabequelle und passenden Kundenpilot anbinden.',
            'Pilot mit echten freigegebenen Beispielen prüfen und abnehmen lassen.',
            'Preis, eigenen Checkout und Lieferung festlegen und prüfen.']


def katalog():
    return [dict(zip(('id', 'name', 'buero', 'station', 'stil', 'aufgabe'), row)) for row in ROLLEN]


def planen(werkstatt, jetzt=None):
    jetzt = jetzt or datetime.now(timezone.utc)
    if not isinstance(werkstatt,dict): werkstatt={}
    try:
        gem = datetime.fromisoformat(werkstatt.get('gemessen', '').replace('Z', '+00:00'))
        frisch = gem.tzinfo is not None and 0 <= (jetzt-gem).total_seconds() <= 24*3600
    except (ValueError, TypeError, AttributeError):
        frisch = False
    sta = werkstatt.get('stationen', {})
    if not isinstance(sta, dict): sta = {}
    jobs = []
    def job(ident, rolle, titel, aktion, prioritaet, zustand, automatisch=False, mitwirkung=None):
        jobs.append({'id': ident, 'rolle': rolle, 'titel': titel, 'naechster': aktion,
                     'prioritaet': prioritaet, 'zustand': zustand, 'automatisch': automatisch,
                     'mitwirkung': mitwirkung or []})
    if not frisch or sta.get('pruefen') not in ('bestanden', 'fehlgeschlagen'):
        job('status_pruefen', 'qualitaet', 'Projektprüfung aktualisieren', 'Nächsten geplanten Selbsttest abwarten oder im verbundenen Chat beauftragen.', 1, 'Prüfung ausstehend', True)
    elif sta.get('pruefen') == 'fehlgeschlagen':
        job('tests_klaeren', 'fehleranalyse', 'Fehlgeschlagene Tests klären', AKTIONEN[2], 0, 'Prüfung nötig', mitwirkung=['entwicklung'])
    elif sta.get('bauen') != 'bestanden':
        job('pakete_bauen', 'automation', 'Lieferpakete neu bauen', AKTIONEN[3], 2, 'Bau ausstehend', True)
    gesehen=set()
    for p in werkstatt.get('projekte', []) if isinstance(werkstatt.get('projekte', []), list) else []:
        if not isinstance(p, dict): continue
        ident = p.get('id')
        steps = p.get('schritte')
        if not isinstance(ident,str) or ident not in PROJEKT_ROLLE or ident in gesehen or not isinstance(steps, list) or len(steps) != 7 or any(not isinstance(s, dict) or type(s.get('fertig')) is not bool for s in steps):
            continue
        gesehen.add(ident)
        index = next((i for i,s in enumerate(steps) if not s['fertig']), None)
        if index is None: continue
        rolle = 'entwicklung' if index < 2 else 'qualitaet' if index == 2 else 'automation' if index < 4 else 'zahlung' if index == 6 else 'produkt' if index == 5 else PROJEKT_ROLLE[ident]
        prio = 0 if index == 2 else 2 if index < 4 else 3 if index < 6 else 4
        status = 'Nächster Schritt' if index < 4 else 'Eingang fehlt' if index == 4 else 'Abnahme offen' if index == 5 else 'Entscheidung offen'
        if not frisch or sta.get('pruefen') != 'bestanden':
            status, prio = 'Wartet auf Prüfung', max(2, prio)
        elif index>=4 and sta.get('bauen')!='bestanden':
            status='Wartet auf Paketbau'
        job('projekt_'+ident, rolle, PROJEKT_NAMEN[ident], AKTIONEN[index], prio, status,
            index in (2,3), ['integration'] if index == 4 else [])
    jobs.sort(key=lambda j:(j['prioritaet'],j['id']))
    rollen = katalog()
    for rolle in rollen:
        zugeordnet = [j for j in jobs if rolle['id']=='leitung' or j['rolle']==rolle['id'] or rolle['id'] in j['mitwirkung']]
        rolle.update({'zustand': 'Auftrag vorbereitet', 'naechster': rolle['aufgabe'], 'prioritaet': 5})
        if zugeordnet:
            top = zugeordnet[0]
            rolle.update({k:top[k] for k in ('zustand','naechster','prioritaet')})
        elif rolle['id']=='qualitaet' and frisch and sta.get('pruefen')=='fehlgeschlagen':
            rolle.update(zustand='Prüfung fehlgeschlagen',naechster='Fehleranalyse klären und danach erneut testen.',prioritaet=0)
        elif rolle['id']=='automation' and frisch and sta.get('pruefen')=='fehlgeschlagen':
            rolle.update(zustand='Wartet auf Prüfung',naechster='Erst nach bestandenen Tests neue Lieferpakete bauen.',prioritaet=1)
        elif rolle['id'] == 'qualitaet' and frisch and sta.get('pruefen') == 'bestanden':
            rolle.update(zustand='Prüfung bestanden', naechster='Beim nächsten Prüflauf erneut testen.')
        elif rolle['id'] == 'automation' and frisch and sta.get('bauen') == 'bestanden':
            rolle.update(zustand='Paketbau bestätigt', naechster='Bei Änderungen erneut prüfen und paketieren.')
    return {'version':1, 'gemessen':werkstatt.get('gemessen') if frisch else None,
            'modus':'Regelbasierte Aufgabenverteilung', 'rollen':rollen, 'auftraege':jobs,
            'hinweis':'Fachrollen für bestehende Abläufe; keine ständig laufenden KI-Agenten. Lokale Tests, Demos, Paketbau und Planung laufen geplant. Kundenzugänge und Freigaben bleiben Voraussetzungen.'}


def zustaendig(ident):
    rolle = {'auswahl':'sortiment','schaufenster':'seo','waechter':'lieferbarkeit',
             'autopilot':'support','fortura':'bestand','printful':'versand', **PROJEKT_ROLLE}.get(ident,'automation')
    return next(r for r in katalog() if r['id']==rolle)
