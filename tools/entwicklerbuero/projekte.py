"""Projektfortschritt aus nachgewiesenen lokalen Bau- und Prüfschritten."""
from pathlib import Path
ROOT = Path(__file__).resolve().parent
GH = 'https://github.com/allengchour-glitch/aban-news-landing'
PROJEKTE = [
    ('email', 'E-Mail-Beantworter', 'Kommunikation', 'anfragen_assistent/email_antworter.py', 'Postfach anbinden und echte Entwürfe prüfen'),
    ('kommentare', 'Kommentar-Beantworter', 'Social Media', 'anfragen_assistent/kommentar_antworter.py', 'Plattform und freigegebene FAQ verbinden'),
    ('angebote', 'Angebots-Nachfasser', 'Vertrieb', 'automationen.py', 'CRM-Quelle und Nachfassregeln eines Pilotbetriebs prüfen'),
    ('webseiten', 'Webseiten-Prüfer', 'Web & SEO', 'automationen.py', 'Kundenwebseite mit freigegebenem Prüfbereich verbinden'),
]


def bericht(out, tests_ok):
    out = Path(out)
    result = []
    for ident, name, buero, code, naechstes in PROJEKTE:
        schritte = [
            {'name': 'Projekt und Umfang', 'fertig': True},
            {'name': 'Prototyp vorhanden', 'fertig': (ROOT / code).is_file()},
            {'name': 'Selbsttests bestanden', 'fertig': bool(tests_ok)},
            {'name': 'Demo und Lieferpaket gebaut', 'fertig': bool(tests_ok and (out / 'automationen.zip').is_file() and (out / 'anfragen-assistent.zip').is_file())},
            {'name': 'Kundensystem angebunden', 'fertig': False},
            {'name': 'Kundenpilot abgenommen', 'fertig': False},
            {'name': 'Eigener Checkout und Lieferung geprüft', 'fertig': False},
        ]
        result.append({'id': ident, 'name': name, 'buero': buero, 'prozent': round(100 * sum(s['fertig'] for s in schritte) / len(schritte)),
                       'schritte': schritte, 'naechstes': naechstes, 'link': GH + '/blob/main/tools/entwicklerbuero/' + code,
                       'zahlung': 'Stripe-Infrastruktur vorhanden; eigener Produkt-Checkout offen',
                       'zahlung_link': GH + '/blob/main/automation/stripe_sync.py'})
    return result
