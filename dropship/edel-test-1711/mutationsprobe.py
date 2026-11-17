#!/usr/bin/env python3
"""Mutationsprobe für texte.mjs und optionen.mjs: baut je Mutant eine Kopie in einem Wegwerf-Ordner, lässt anlegen_test.mjs laufen
und verlangt, dass der Test ROT wird. Ausgangslage muss grün sein. Lauf: python3 dropship/edel-test-1711/mutationsprobe.py (Repo-Wurzel)."""
import os, re, shutil, subprocess, sys, tempfile
HIER = os.path.dirname(os.path.abspath(__file__))
NODE = os.environ.get('NODE', '/opt/node22/bin/node')
DATEIEN = ['texte.mjs', 'optionen.mjs', 'anlegen_test.mjs', 'produkte.json']

def lauf(ordner):
    r = subprocess.run([NODE, os.path.join(ordner, 'anlegen_test.mjs')], capture_output=True, text=True, timeout=120)
    return r.returncode, (r.stdout + r.stderr)[-300:]

def mutanten():
    """(Datei, Name, alt, neu). `alt` muss genau einmal vorkommen, sonst gilt der Mutant als nicht anwendbar."""
    return [
        ('texte.mjs', 'Kaschmir-Muster ohne /i', r"/kaschmir|cashmere|kasch-mir/i", r"/kaschmir|cashmere|kasch-mir/"),
        ('texte.mjs', 'Tags werden nicht gelesen', "for (const g of p.tags || []) t.push(['tag', g]);", ""),
        ('texte.mjs', 'seo.description wird nicht gelesen', "['seo.description', p.seo?.description], ", ""),
        ('texte.mjs', 'seo.title wird nicht gelesen', "['seo.title', p.seo?.title], ", ""),
        ('texte.mjs', 'html wird nicht gelesen', ", ['html', (p.html || '').replace(/<[^>]*>/g, ' ')]", ""),
        ('texte.mjs', 'Titel wird nicht gelesen', "[['titel', p.titel], ", "["),
        ('texte.mjs', 'Handle wird nicht gelesen', "['handle', p.handle],", ""),
        ('texte.mjs', 'Übersetzungen werden nicht gelesen', "for (const [k, v] of Object.entries(p.uebersetzung || {})) t.push([`uebersetzung ${k}`, v]);", ""),
        ('texte.mjs', 'neue Optionswerte werden nicht gelesen', "for (const v of Object.values(r.werte || {})) t.push([`optionen ${o} Wert`, v]);", ""),
        ('texte.mjs', 'neue Optionsnamen werden nicht gelesen', "if (r.name) t.push([`optionen ${o} Name`, r.name]);", ""),
        ('texte.mjs', 'alle Tags ausgenommen statt nur das Arbeits-Tag', "if (feld === 'tag' && text === 'edel-test-1711') continue;", "if (feld === 'tag') continue;"),
        ('texte.mjs', 'Arbeits-Tag wird nicht ausgenommen', "if (feld === 'tag' && text === 'edel-test-1711') continue;", ""),
        ('texte.mjs', 'Titel-Grenze 70 → 80', "(p.titel || '').length > 70", "(p.titel || '').length > 80"),
        ('texte.mjs', 'SEO-Titel-Grenze 60 → 70', "(p.seo?.title || '').length > 60", "(p.seo?.title || '').length > 70"),
        ('texte.mjs', 'SEO-Beschreibung-Grenze 160 → 170', "(p.seo?.description || '').length > 160", "(p.seo?.description || '').length > 170"),
        ('texte.mjs', 'Mindestlänge 150 → 100', "if (rein.length < 150) f.push", "if (rein.length < 100) f.push"),
        ('texte.mjs', 'Mindestlänge nicht geprüft', "if (rein.length < 150) f.push", "if (false) f.push"),
        ('texte.mjs', 'Markup zählt als Text', "(p.html || '').replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();   // dieselbe", "(p.html || '').trim();   // dieselbe"),
        ('texte.mjs', 'Wächter-Eintrag «Feinstrick» fehlt', "  [/fein ?gestrickt|feinstrick|\\bfeine[nrs]? (damen|pullover|strick)/i, 'Maschenfeinheit nicht belegt (das Datenblatt nennt nur die Dicke: dünn)'],\n", ""),
        ('texte.mjs', 'Wächter-Eintrag «Drehverschluss» fehlt', "  [/drehverschluss|metallperlen|metallschloss/i, 'Verschlussart und Henkelmaterial sind Deutung, das Datenblatt sagt nur «cover type»'],\n", ""),
        ('texte.mjs', 'Wächter-Eintrag «Obermaterial» fehlt', "  [/obermaterial/i, 'Futter und Innenmaterial unbekannt'],\n", ""),
        ('texte.mjs', 'Wächter-Eintrag «Geschenkbox» fehlt', "  [/geschenkbox|geschenkverpackung|gift ?box/i, 'Box steht nur im Alt-Text des Lieferanten, auf keinem Bild'],\n", ""),
        ('texte.mjs', 'Muster «Zertifikat» ohne GRA', r"/zertifikat|\bgra\b/i", r"/zertifikat/i"),
        ('texte.mjs', 'Muster «100 %» ohne Leerzeichen-Variante', r"/100 ?%/", r"/100%/"),
        ('texte.mjs', 'Karat-Muster ohne «ct»', r"/\b0[.,]\d+ ?ct\b|\bkarat\b/i", r"/\bkarat\b/i"),
        ('texte.mjs', 'Bilder werden nicht umgeordnet', "e.files = [...e.files.filter(f => !ende.has(f.originalSource)), ...e.files.filter(f => ende.has(f.originalSource))];", ""),
        ('texte.mjs', 'Bilder kommen an den Anfang', "e.files = [...e.files.filter(f => !ende.has(f.originalSource)), ...e.files.filter(f => ende.has(f.originalSource))];",
         "e.files = [...e.files.filter(f => ende.has(f.originalSource)), ...e.files.filter(f => !ende.has(f.originalSource))];"),
        ('texte.mjs', 'alle Bilder ans Ende erlaubt', "if (ende.size >= e.files.length) throw", "if (ende.size > e.files.length) throw"),
        ('texte.mjs', 'Index ausserhalb nicht geprüft', "if (!Number.isInteger(i) || !u) throw", "if (!Number.isInteger(i)) throw"),
        ('texte.mjs', 'Bild nicht in files nicht geprüft', "if (!e.files.some(f => f.originalSource === u)) throw", "if (false) throw"),
        ('texte.mjs', 'Eingabe wird verändert', "const e = JSON.parse(JSON.stringify(eingabe));\n  if (!indizes?.length) return e;", "const e = eingabe;\n  if (!indizes?.length) return e;"),
        ('optionen.mjs', 'Eingabe wird verändert', "const e = JSON.parse(JSON.stringify(eingabe));\n  for (const [alt", "const e = eingabe;\n  for (const [alt"),
        ('optionen.mjs', 'Eindeutigkeit der Werte nicht geprüft', "if (new Set(o.values.map(v => v.name)).size !== o.values.length) throw", "if (false) throw"),
        ('optionen.mjs', 'Namenskollision nicht geprüft', "if (neuName !== alt && e.productOptions.some(x => x !== o && x.name === neuName)) throw", "if (false) throw"),
        ('optionen.mjs', 'Varianten folgen dem Wert nicht', "if (werte[ov.name] !== undefined) ov.name = werte[ov.name];", ""),
        ('optionen.mjs', 'Varianten folgen dem Namen nicht', "ov.optionName = neuName;", ""),
    ]

def main():
    tmp = tempfile.mkdtemp(prefix='edelmut_')
    try:
        for d in DATEIEN: shutil.copy(os.path.join(HIER, d), os.path.join(tmp, d))
        rc, aus = lauf(tmp)
        if rc != 0: print('Ausgangslage NICHT grün:', aus); return 2
        print('Ausgangslage grün')
        erkannt = nicht = n_a = 0; ueberlebt = []
        for datei, name, alt, neu in mutanten():
            quelle = open(os.path.join(HIER, datei), encoding='utf8').read()
            if quelle.count(alt) != 1:
                n_a += 1; print(f'? nicht anwendbar ({quelle.count(alt)} Treffer): {name}'); continue
            for d in DATEIEN: shutil.copy(os.path.join(HIER, d), os.path.join(tmp, d))
            open(os.path.join(tmp, datei), 'w', encoding='utf8').write(quelle.replace(alt, neu))
            rc, aus = lauf(tmp)
            if rc != 0: erkannt += 1
            else: nicht += 1; ueberlebt.append(name); print(f'✗ ÜBERLEBT: {name}')
        print(f'\n{erkannt} erkannt, {nicht} überlebt, {n_a} nicht anwendbar (von {erkannt + nicht + n_a})')
        return 1 if (nicht or n_a) else 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__':
    sys.exit(main())
