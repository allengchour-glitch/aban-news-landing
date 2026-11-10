#!/usr/bin/env python3
"""Reine Funktionen für die Keywordliste: Wortnormalisierung, Stichwort-Gruppen, Positionsklassen, Chancen.

Keine Netzzugriffe, keine realen Messwerte. Eingabe: Zeilen im Format der Search Console
(`{"keys":[anfrage], "clicks":.., "impressions":.., "ctr":.., "position":..}`).
"""
import re
import unicodedata

# Funktionswörter: gehören nie in eine Stichwort-Gruppe.
STOP = set('''
a ab am an auch auf aus bei bis das dass dem den der des die ein eine einem einen einer eines er es für fur im in ist
mit nach nicht noch oder ohne sich sie sind so um und von vom vor was welche welcher welches wer wie wo wann zu zum zur
über uber unter wird werden hat haben kann können koennen man mir mein meine meiner meinem meinen dein deine
the and for with of to in on
'''.split())

# Händler- und Kaufwörter: tragen keine Produktbedeutung (bleiben aber in der Anfrage sichtbar).
KAUF = set('''
kaufen kauf bestellen bestellung shop shops online günstig günstige günstiger gunstig billig preis preise angebot angebote
test testsieger erfahrung erfahrungen vergleich bewertung bewertungen schweiz schweizer ch gratis kostenlos neu neue
beste bester bestes
'''.split())

# Händler und Marken: Autovervollständigung nennt sie oft (z. B. «… fressnapf»). Als Keyword-Idee für den eigenen Shop nutzlos.
MARKEN = [
    'fressnapf', 'qualipet', 'landi', 'migros', 'coop', 'ikea', 'galaxus', 'digitec', 'amazon', 'ricardo', 'brack', 'manor',
    'zalando', 'jumbo', 'otto', 'ottos', 'lidl', 'aldi', 'interdiscount', 'mediamarkt', 'conforama', 'microspot', 'decathlon',
    'sportxx', 'intersport', 'ochsner', 'dosenbach', 'deichmann', 'halara', 'shein', 'temu', 'aliexpress', 'ebay',
    'ray ban', 'h&m', 'c&a', 'nike', 'adidas', 'puma', 'samsung', 'apple', 'omega', 'ottos',
]

UMLAUT = str.maketrans({'ä': 'a', 'ö': 'o', 'ü': 'u', 'é': 'e', 'è': 'e', 'à': 'a', 'ç': 'c'})


def norm(q):
    """Kleinschreibung, ß→ss, Satzzeichen weg. Ein Bindestrich nach einem Einzelbuchstaben verbindet (t-shirt → tshirt)."""
    q = unicodedata.normalize('NFC', str(q)).lower().replace('ß', 'ss')
    q = re.sub(r'\b([a-z])-(?=[a-zäöü])', r'\1', q)
    q = re.sub(r'\bt shirts?\b', 'tshirt', q)
    q = re.sub(r'[^\w\s]', ' ', q.replace('_', ' '), flags=re.UNICODE)
    return re.sub(r'\s+', ' ', q).strip()


def stem(t):
    """Grobe Grundform nur als Gruppierschlüssel (Umlaute weg, Endungen weg). Nie zur Anzeige."""
    t = t.translate(UMLAUT)
    for _ in range(2):
        for suf in ('en', 'er', 'es', 'e', 'n', 's'):
            if t.endswith(suf) and len(t) - len(suf) >= 3:
                t = t[:-len(suf)]
                break
        else:
            break
    return t


def tokens(q):
    """Wörter der Anfrage ohne Funktionswörter, Kaufwörter, reine Zahlen und Einzelbuchstaben."""
    out = []
    for w in norm(q).split():
        if len(w) < 2 or w in STOP or w in KAUF or w.isdigit():
            continue
        out.append(w)
    return out


def stichwoerter(rows, min_anfragen=2):
    """Gruppen je Wortstamm. Eine Anfrage zählt in jeder ihrer Gruppen (keine Aufteilung).

    rows: Liste von dict mit keys/clicks/impressions/position. Rückgabe: Liste von dict, absteigend nach Einblendungen.
    """
    g = {}
    for r in rows:
        q = r['keys'][0]
        seen = set()
        for w in tokens(q):
            s = stem(w)
            if len(s) < 3 or s in seen:
                continue
            seen.add(s)
            e = g.setdefault(s, {'stamm': s, 'anfragen': 0, 'klicks': 0, 'einblendungen': 0, 'pos_summe': 0.0, 'formen': {}, 'beispiele': []})
            e['anfragen'] += 1
            e['klicks'] += r['clicks']
            e['einblendungen'] += r['impressions']
            e['pos_summe'] += r['position'] * r['impressions']
            e['formen'][w] = e['formen'].get(w, 0) + r['impressions']
            e['beispiele'].append((r['impressions'], q))
    res = []
    for e in g.values():
        if e['anfragen'] < min_anfragen:
            continue
        form = max(e['formen'].items(), key=lambda kv: (kv[1], -len(kv[0])))[0]
        e['beispiele'].sort(key=lambda x: (-x[0], x[1]))
        res.append({
            'stamm': e['stamm'], 'wort': form, 'anfragen': e['anfragen'], 'klicks': e['klicks'],
            'einblendungen': e['einblendungen'],
            'position': round(e['pos_summe'] / e['einblendungen'], 1) if e['einblendungen'] else None,
            'beispiele': [q for _, q in e['beispiele'][:5]],
        })
    res.sort(key=lambda x: (-x['einblendungen'], -x['anfragen'], x['wort']))
    return res


def klasse(position):
    """Positionsklasse nach Googles Ergebnisseiten (10 Treffer je Seite)."""
    if position is None:
        return 'ohne'
    if position <= 3.0:
        return 'top3'
    if position <= 10.0:
        return 'seite1'
    if position <= 20.0:
        return 'seite2'
    if position <= 50.0:
        return 'seite3-5'
    return 'ab6'


KLASSEN = [
    ('top3', 'Platz 1–3'),
    ('seite1', 'Platz 4–10 (Seite 1)'),
    ('seite2', 'Platz 11–20 (Seite 2)'),
    ('seite3-5', 'Platz 21–50 (Seite 3–5)'),
    ('ab6', 'ab Platz 51'),
]


def chancen(rows, min_einblendungen=3, max_position=50.0):
    """Anfragen mit Luft nach oben: Platz 4 bis max_position, sortiert nach Einblendungen.

    Gewicht = Einblendungen / sqrt(Position): nahe Plätze zählen mehr als ferne bei gleicher Sichtbarkeit.
    """
    out = []
    for r in rows:
        p = r['position']
        i = r['impressions']
        if p is None or i < min_einblendungen or p <= 3.0 or p > max_position:
            continue
        out.append({'anfrage': r['keys'][0], 'einblendungen': i, 'klicks': r['clicks'], 'position': p,
                    'klasse': klasse(p), 'gewicht': round(i / (p ** 0.5), 2)})
    out.sort(key=lambda x: (-x['gewicht'], x['anfrage']))
    return out


def abdeckung(zeilen_summe, gesamt):
    """Anteil der in der Anfrageliste sichtbaren Werte am Gesamtwert (None, wenn der Gesamtwert fehlt oder 0 ist)."""
    if not gesamt:
        return None
    return round(100.0 * zeilen_summe / gesamt, 1)


def hat_marke(text, marken=None):
    """Enthält der Text eine Marke oder einen Händler aus MARKEN (als ganzes Wort bzw. ganze Wortfolge)?"""
    n = ' ' + norm(text) + ' '
    for m in (MARKEN if marken is None else marken):
        mn = norm(m)
        if mn and (' ' + mn + ' ') in n:
            return True
    return False
