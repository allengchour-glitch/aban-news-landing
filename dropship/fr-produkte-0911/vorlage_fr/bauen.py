#!/usr/bin/env python3
"""Baut die zweisprachige Fassung der Custom-Liquid-Bausteine der Produktseite (reine Logik, ohne Netz).

Je Baustein: {%- capture x -%} ORIGINAL {%- endcapture -%} und danach
  {%- if request.locale.iso_code == 'fr' -%}{{ x | replace: 'de', 'fr' | … }}{%- else -%}{{ x }}{%- endif -%}
Der deutsche Zweig gibt die eingefangene Ausgabe unverändert aus; alle Bedingungen im Baustein rechnen weiter mit den deutschen Zeichenketten.
"""
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import phrasen as P  # noqa: E402

MARKE = '{%- comment -%} LX-FR-0911: französische Ausgabe durch Ersetzen eingefangener Wortgruppen (dropship/fr-produkte-0911/vorlage_fr), deutscher Zweig unverändert {%- endcomment -%}'
RE_KOPF = re.compile(r'^\s*/\*.*?\*/', re.S)


def schluessel_pruefen(name, paare):
    for de, fr in paare:
        if "'" in de or "'" in fr:
            raise ValueError(f"{name}: einfaches Anführungszeichen in «{de[:40]}»")
        if '{{' in de or '{%' in de or '{{' in fr or '{%' in fr:
            raise ValueError(f'{name}: Liquid-Zeichen in «{de[:40]}»')
        if not de or not fr:
            raise ValueError(f'{name}: leerer Eintrag')


def einwickeln(name, quelle, paare):
    """Gibt die zweisprachige Fassung zurück; schon eingewickelte Bausteine bleiben unverändert (idempotent)."""
    if 'LX-FR-0911' in quelle:
        return quelle
    schluessel_pruefen(name, paare)
    var = f'lx_fr_{name}'
    kette = ''.join(f" | replace: '{de}', '{fr}'" for de, fr in paare)
    return (f"{MARKE}{{%- capture {var} -%}}{quelle}{{%- endcapture -%}}"
            f"{{%- if request.locale.iso_code == 'fr' -%}}{{{{ {var}{kette} }}}}{{%- else -%}}{{{{ {var} }}}}{{%- endif -%}}")


def auspacken(name, quelle):
    """Gegenstück zu einwickeln: liefert den ursprünglichen Baustein zurück (für die Rücknahme ohne Sicherung)."""
    if 'LX-FR-0911' not in quelle:
        return quelle
    var = f'lx_fr_{name}'
    start = quelle.index('{%- capture ' + var + ' -%}') + len('{%- capture ' + var + ' -%}')
    ende = quelle.index('{%- endcapture -%}{%- if request.locale.iso_code')
    return quelle[start:ende]


def bloecke_finden(obj, pfad=''):
    """Alle Einstellungen `custom_liquid` in einer geladenen Vorlage: (Blockname, Einstellungs-Dict)."""
    if isinstance(obj, dict):
        if isinstance(obj.get('settings'), dict) and 'custom_liquid' in obj['settings']:
            yield pfad.rsplit('/', 1)[-1], obj['settings']
        for k, v in obj.items():
            yield from bloecke_finden(v, pfad + '/' + k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from bloecke_finden(v, pfad + f'[{i}]')


def vorlage_laden(text):
    """Theme-JSON mit Kopfkommentar → (Kopf, Daten)."""
    m = RE_KOPF.match(text)
    kopf = m.group(0) if m else ''
    return kopf, json.loads(text[len(kopf):])


def vorlage_schreiben(kopf, daten):
    return kopf + json.dumps(daten, ensure_ascii=False, indent=2) + '\n'


def umbauen(text, rueckwaerts=False, erneuern=False):
    """Wickelt alle bekannten Bausteine ein (oder aus). Rückgabe: (neuer Text, Liste (Name, Zustand)).
    `erneuern`: schon eingewickelte Bausteine werden erst ausgepackt und mit der aktuellen Tabelle neu eingewickelt (bleibt die Tabelle
    gleich, ändert sich nichts); so lässt sich eine korrigierte Phrasentabelle einspielen."""
    kopf, daten = vorlage_laden(text)
    bericht = []
    for name, einst in bloecke_finden(daten):
        if name not in P.BLOECKE:
            continue
        alt = einst['custom_liquid']
        if rueckwaerts:
            neu = auspacken(name, alt)
        elif erneuern:
            neu = einwickeln(name, auspacken(name, alt), P.BLOECKE[name])
        else:
            neu = einwickeln(name, alt, P.BLOECKE[name])
        bericht.append((name, 'geändert' if neu != alt else 'unverändert'))
        einst['custom_liquid'] = neu
    return vorlage_schreiben(kopf, daten), bericht


if __name__ == '__main__':
    print(__doc__)
