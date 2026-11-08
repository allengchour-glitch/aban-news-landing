"""Wiederkehrende offene Fragen eines lokalen Kommentarstapels zur FAQ-Prüfung sammeln."""
import re
import unicodedata


def faq_luecken(eintraege):
    gruppen = {}
    for r in eintraege:
        if r.get('kategorie') != 'offene_frage' or r.get('antwortentwurf') or not isinstance(r.get('text'), str):
            continue
        key = re.sub(r'[\W_]+', ' ', unicodedata.normalize('NFKC', r['text']).casefold()).strip()
        if not key: continue
        g = gruppen.setdefault(key, {'frage': r['text'].strip(), 'anzahl': 0, 'plattformen': set()})
        g['anzahl'] += 1
        g['plattformen'].add(r['plattform'])
    return [dict(frage=g['frage'], anzahl=g['anzahl'], plattformen=sorted(g['plattformen']))
            for _,g in sorted(gruppen.items(), key=lambda item:(-item[1]['anzahl'], item[0])) if g['anzahl'] >= 2][:100]
