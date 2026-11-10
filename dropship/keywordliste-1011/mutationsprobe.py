#!/usr/bin/env python3
"""Mutationsprobe für kwlib.py, bauen.py und suggest.py: jede Änderung muss einen Selbsttest scheitern lassen.

  python3 mutationsprobe.py
Ein überlebender Mutant heisst: der Test prüft diese Stelle nicht (oder die Änderung ist gleichwertig, dann steht es dabei).
"""
import os
import shutil
import subprocess
import sys
import tempfile

HIER = os.path.dirname(os.path.abspath(__file__))
DATEIEN = ['kwlib.py', 'bauen.py', 'suggest.py']

# (Datei, alt, neu, Name, gleichwertig?)
M = [
    ('kwlib.py', "if position <= 3.0:", "if position < 3.0:", 'Klasse top3 Grenze', False),
    ("kwlib.py", "if position <= 10.0:", "if position < 10.0:", 'Klasse seite1 Grenze', False),
    ("kwlib.py", "if position <= 20.0:", "if position < 20.0:", 'Klasse seite2 Grenze', False),
    ("kwlib.py", "if position <= 50.0:", "if position < 50.0:", 'Klasse seite3-5 Grenze', False),
    ("kwlib.py", "or p <= 3.0 or p > max_position", "or p > max_position", 'Chancen: Platz 1-3 ausschliessen', False),
    ("kwlib.py", "i < min_einblendungen", "i <= min_einblendungen", 'Chancen: Mindestwert', False),
    ("kwlib.py", "p > max_position", "p >= max_position", 'Chancen: Obergrenze', False),
    ("kwlib.py", "round(i / (p ** 0.5), 2)", "round(i / p, 2)", 'Chancen: Gewicht', False),
    ("kwlib.py", "return round(100.0 * zeilen_summe / gesamt, 1)", "return round(zeilen_summe / gesamt, 1)", 'Abdeckung in Prozent', False),
    ("kwlib.py", "replace('ß', 'ss')", "replace('ß', 's')", 'Normalisierung ß', False),
    ("kwlib.py", "if t.endswith(suf) and len(t) - len(suf) >= 3:", "if t.endswith(suf) and len(t) - len(suf) >= 4:", 'Stamm: Mindestlänge', False),
    ("kwlib.py", "for suf in ('en', 'er', 'es', 'e', 'n', 's'):", "for suf in ('en', 'es', 'e', 'n', 's'):", 'Stamm: Endung er', False),
    ("kwlib.py", "t = t.translate(UMLAUT)", "t = t", 'Stamm: Umlaute', False),
    ("kwlib.py", "if len(w) < 2 or w in STOP or w in KAUF or w.isdigit():", "if len(w) < 2 or w in STOP or w in KAUF:", 'Tokens: Zahlen', False),
    ("kwlib.py", "if len(w) < 2 or w in STOP or w in KAUF or w.isdigit():", "if len(w) < 2 or w in STOP or w.isdigit():", 'Tokens: Kaufwörter', False),
    ("kwlib.py", "if len(s) < 3 or s in seen:", "if len(s) < 3:", 'Stichwörter: Anfrage nur einmal je Gruppe', False),
    ("kwlib.py", "if e['anfragen'] < min_anfragen:", "if e['anfragen'] <= min_anfragen:", 'Stichwörter: Mindestzahl', False),
    ("kwlib.py", "res.sort(key=lambda x: (-x['einblendungen'], -x['anfragen'], x['wort']))", "res.sort(key=lambda x: (x['einblendungen'], -x['anfragen'], x['wort']))", 'Stichwörter: Reihenfolge', False),
    ("kwlib.py", "if mn and (' ' + mn + ' ') in n:", "if mn and mn in n:", 'Marke: ganzes Wort', False),
    ("kwlib.py", "q = re.sub(r'\\bt shirts?\\b', 'tshirt', q)", "q = q", 'Normalisierung t shirt', False),
    ('bauen.py', ".split('#')[0].split('?')[0]", ".split('#')[0]", 'pfad: Abfrage', False),
    ('bauen.py', ".split('#')[0].split('?')[0]", ".split('?')[0]", 'pfad: Fragment', False),
    ('bauen.py', "e[0] += i", "e[0] = i", 'beste Seite: Varianten zusammenzählen', False),
    ('bauen.py', "sorted((-v[0], -v[1], s) for s, v in d.items())[0][2]", "sorted((v[0], -v[1], s) for s, v in d.items())[0][2]", 'beste Seite: meiste Impressionen', False),
    ('bauen.py', "if not n or n in info or kwlib.hat_marke(text):", "if not n or kwlib.hat_marke(text):", 'Ideen: bekannte Anfragen ausschliessen', False),
    ('bauen.py', "if not n or n in info or kwlib.hat_marke(text):", "if not n or n in info:", 'Ideen: Marken ausschliessen', False),
    ('bauen.py', "if sn not in info:\n            continue", "if False:\n            continue", 'Ideen: nur echte Anfragen als Seed', False),
    ('bauen.py', "e['treffer'] += 1", "e['treffer'] = 1", 'Ideen: Treffer zählen', False),
    ('bauen.py', "res.sort(key=lambda x: (-x['treffer'], -x['seed_einbl'], x['idee']))", "res.sort(key=lambda x: (x['treffer'], -x['seed_einbl'], x['idee']))", 'Ideen: Reihenfolge', False),
    ('bauen.py', "anfragen.sort(key=lambda x: (-x['einblendungen'], x['position'], x['anfrage']))", "anfragen.sort(key=lambda x: (x['einblendungen'], x['position'], x['anfrage']))", 'Anfragen: Reihenfolge', False),
    ('bauen.py', "stand['n_auf_seite1'] = klassen.get('top3', 0) + klassen.get('seite1', 0)", "stand['n_auf_seite1'] = klassen.get('seite1', 0)", 'Stand: Seite 1 inkl. Platz 1-3', False),
    ('bauen.py', "pos_ges = round(sum(t['position'] * t['einblendungen'] for t in tage_l) / ei_ges, 1)", "pos_ges = round(sum(t['position'] for t in tage_l) / len(tage_l), 1)", 'Stand: Position gewichtet', False),
    ('bauen.py', "ch_ei = sum(i for (_, i, _) in ch.values())", "ch_ei = sum(c for (c, _, _) in ch.values())", 'Stand: Schweiz-Impressionen', False),
    ('bauen.py', "if isinstance(v, str) and v[:1] in ('=', '+', '-', '@'):", "if False:", 'CSV: Formel-Schutz', False),
    ('bauen.py', "delimiter=';'", "delimiter=','", 'CSV: Trennzeichen', False),
    ('bauen.py', "return '\\ufeff' + buf.getvalue()", "return buf.getvalue()", 'CSV: BOM', False),
    ('bauen.py', "raise ValueError('Widerspruch bei", "pass  # raise ValueError('Widerspruch bei", 'Vereinigung: Widerspruch melden', False),
    ('bauen.py', "'rest_klicks': round(100.0 - kwlib.abdeckung(kl_liste, kl_ges), 1) if kl_ges else None,", "'rest_klicks': kwlib.abdeckung(kl_liste, kl_ges) if kl_ges else None,", 'Stand: Rest der Klicks', False),
    ('suggest.py', "if code in ('429', '403'):", "if code in ('429',):", 'Sperre 403', False),
    ('suggest.py', "if e.get(v) is not None:", "if v in e:", 'Fortsetzen: Fehler erneut versuchen', False),
    ('suggest.py', "                e[v] = None            # Fehler", "                e[v] = []            # Fehler", 'Fehler als leeres Ergebnis zählen', False),
    ('suggest.py', "            schlafen(pause)", "            pass", 'Pause nach Abruf', False),
]


def lauf(ordner):
    for t in ('bauen.py', 'suggest.py'):
        r = subprocess.run([sys.executable, '-I', '-B', os.path.join(ordner, t), '--selbsttest'], capture_output=True, text=True)
        if r.returncode != 0:
            return True        # erkannt
    return False


def main():
    erkannt = ueberlebt = nicht = 0
    with tempfile.TemporaryDirectory() as t:
        basis = os.path.join(t, 'basis')
        os.makedirs(basis)
        for f in DATEIEN:
            shutil.copy(os.path.join(HIER, f), basis)
        if lauf(basis):
            print('Ausgangslage ist nicht grün: Probe sinnlos')
            return 2
        for i, (datei, alt, neu, name, gleich) in enumerate(M):
            quelle = open(os.path.join(basis, datei), encoding='utf-8').read()
            if quelle.count(alt) != 1:
                print('?  nicht anwendbar (%d Treffer): %s' % (quelle.count(alt), name))
                nicht += 1
                continue
            ordner = os.path.join(t, 'm%d' % i)
            shutil.copytree(basis, ordner)
            open(os.path.join(ordner, datei), 'w', encoding='utf-8').write(quelle.replace(alt, neu))
            if lauf(ordner):
                erkannt += 1
            else:
                ueberlebt += 1
                print('ÜBERLEBT: %s%s' % (name, ' (gleichwertig)' if gleich else ''))
    print('Mutationsprobe: %d erkannt, %d überlebt, %d nicht anwendbar (von %d)' % (erkannt, ueberlebt, nicht, len(M)))
    return 0 if ueberlebt == 0 and nicht == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
