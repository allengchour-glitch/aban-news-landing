#!/usr/bin/env python3
"""Mutationsprobe für seite.html: jede Änderung muss den Browsertest seite_test.mjs scheitern lassen.

Voraussetzung: Playwright erreichbar (NODE_PATH auf node_modules mit playwright). Läuft lokal, nicht in der CI (dauert einige Minuten).
  NODE_PATH=$(npm root -g) python3 mutationsprobe_seite.py
Der Test liest die geänderte Kopie über die Umgebungsvariable SEITE_PFAD.
"""
import os
import subprocess
import tempfile

import os
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ORIG = open(REPO + '/dropship/keywordliste-1011/seite.html', encoding='utf-8').read()
M = [
    ("const on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };", "const on = (id, ev, fn) => { const e = $(id); e.addEventListener(ev, fn); };", 'on() prüft Element'),
    ("      if (sec) sec.hidden = t !== name;", "      sec.hidden = t !== name;", 'zeigeTab: Abschnitt prüfen'),
    ("        if (zeig) zeig.hidden = false;", "        zeig.hidden = false;", 'Kopieren: Hinweis prüfen'),
    ("zustand.anfragen.limit += SCHRITT;", "zustand.anfragen.limit += 1;", 'Mehr-Knopf Schrittweite'),
    ("r.einblendungen >= z.min", "r.einblendungen > z.min", 'Mindestwert inklusive'),
    ("norm(r[f]).indexOf(suche) !== -1", "String(r[f]).indexOf(suche) !== -1", 'Suche ohne Kleinschreibung'),
    ("if (art === 'pos') a.sort((x, y) => (x.position - y.position)", "if (art === 'pos') a.sort((x, y) => (y.position - x.position)", 'Reihenfolge Platz'),
    ("else if (art === 'klicks') a.sort((x, y) => (y.klicks - x.klicks)", "else if (art === 'klicks') a.sort((x, y) => (x.klicks - y.klicks)", 'Reihenfolge Klicks (nicht getestet)'),
    ("el.textContent = el.dataset.format === 'datum' ? datum(v) : String(v);", "el.textContent = String(v);", 'Datumsformat'),
    ("b.style.height = Math.max(2, 100 * Number(r.einblendungen) / max) + '%';", "b.style.height = '50%';", 'Tagesbalken Höhe'),
    ("fill.style.width = (100 * r.anfragen / max) + '%';", "fill.style.width = '50%';", 'Klassenbalken Breite'),
    ("zustand.anfragen.suche = r.wort;", "zustand.anfragen.suche = '';", 'Stichwort setzt Suche'),
    ("if (HINWEIS[r.klasse]) t.append(mk('span', 'ks-sub', HINWEIS[r.klasse]));", "", 'Hinweis je Klasse'),
    ("(z.klasse === 'alle' || r.klasse === z.klasse) && passt(r, s, ['anfrage'])) };", "passt(r, s, ['anfrage'])) };", 'Chancen: Klassenfilter'),
]
env = dict(os.environ)
erkannt = ueberlebt = nicht = 0
for alt, neu, name in M:
    if ORIG.count(alt) != 1:
        print('? nicht anwendbar (%d Treffer): %s' % (ORIG.count(alt), name))
        nicht += 1
        continue
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as f:
        f.write(ORIG.replace(alt, neu))
        pfad = f.name
    env['SEITE_PFAD'] = pfad
    r = subprocess.run(['node', 'seite_test.mjs'], cwd=REPO + '/dropship/keywordliste-1011', env=env, capture_output=True, text=True)
    os.unlink(pfad)
    if r.returncode != 0:
        erkannt += 1
    else:
        ueberlebt += 1
        print('ÜBERLEBT:', name)
print('Seiten-Mutationsprobe: %d erkannt, %d überlebt, %d nicht anwendbar (von %d)' % (erkannt, ueberlebt, nicht, len(M)))
