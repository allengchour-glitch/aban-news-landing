"""Neue lokale Automationen: Angebots-Nachfassen und Webseiten-Prüfung."""
import argparse
import csv
from datetime import date
import json
from pathlib import Path
from html.parser import HTMLParser


def nachfassen(rows, heute):
    result = []
    for row in rows:
        if row.get('status') != 'offen':
            continue
        try:
            tage = (heute - date.fromisoformat(row['datum'])).days
        except (ValueError, KeyError):
            raise ValueError('Angebotsdatum fehlt oder ist ungültig.')
        if tage >= 7:
            result.append({'id': row['id'], 'tage': tage,
                           'entwurf': 'Hast du noch Fragen zu unserem Angebot? Gerne klären wir den nächsten Schritt.',
                           'versendet': False})
    return result


class Seite(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = False
        self.titel = ''
        self.description = ''
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title': self.title = True
        if tag == 'meta' and a.get('name', '').lower() == 'description': self.description = a.get('content', '')
    def handle_endtag(self, tag):
        if tag == 'title': self.title = False
    def handle_data(self, data):
        if self.title: self.titel += data


def seite_pruefen(html):
    p = Seite()
    p.feed(html)
    return {'titel': p.titel.strip(), 'beschreibung': p.description.strip(),
            'hinweise': ([] if p.titel.strip() else ['Seitentitel fehlt']) +
                        ([] if p.description.strip() else ['Beschreibung fehlt']),
            'live_geprueft': False}


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('modus', choices=['nachfassen', 'webseite'])
    ap.add_argument('eingabe', type=Path)
    ap.add_argument('ausgabe', type=Path)
    ap.add_argument('--heute', type=date.fromisoformat, default=date.today())
    a = ap.parse_args()
    with a.eingabe.open(encoding='utf-8') as f:
        result = nachfassen(csv.DictReader(f), a.heute) if a.modus == 'nachfassen' else seite_pruefen(f.read())
    with a.ausgabe.open('x', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
