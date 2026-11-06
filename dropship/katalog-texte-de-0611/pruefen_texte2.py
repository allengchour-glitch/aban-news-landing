#!/usr/bin/env python3
"""Strengere Zweitprüfung der Übersetzungs-Stapel (ergänzt pruefen_texte.py, ändert es nicht).
Unterschied zum ersten Skript:
 - erkennt Bruchzeichen, Brüche (7/8″, 17 3/4"), °F/ºF, mil, pt, ounce als imperial, damit sie keine
   falschen «Zahl fehlt»-Fehler mehr auslösen (die Zahlen fehlen dort bewusst);
 - sucht imperiale Reste im Deutschen viel genauer (Bruchzeichen, ″, ", °F, ounce, pound, gallon, mil, pt, Zoll);
 - englische Reste mit eigener Liste ohne Wörter, die auch deutsch gelten (Polyester, Shirt, Hoodie, Material, Design);
 - Zeilenzahl und Aufzählungspunkte müssen mit dem Original übereinstimmen;
 - Dezimalpunkt, Zahl und Einheit ohne Leerschlag, gerade Anführungszeichen, Gedankenstrich, Doppelleerzeichen.
Aufruf: pruefen_texte2.py in_dir out_dir   (alle b_NN.json)   oder   pruefen_texte2.py in.json out.json
Exit 0 = keine Fehler. Warnungen sind kein Fehler, werden aber gelistet."""
import json, re, sys, glob, os

FRAC = '¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞'
IMPUNIT = r"(?:oz|ounces?|lbs?|pounds?|inch(?:es)?|in\b|yd2?|yds|yards?|ft|feet|foot|gal(?:lons?)?|fl\.?\s*oz|mil\b|pt\b|[°º]\s*F\b|″|\"|”|''|'')"
# Zahl (mit Bruch) + imperiale Einheit
SPAN = re.compile(r"(?:\d+(?:[.,]\d+)?\s*[%s]?\s*(?:x|×|by)\s*)*(?:\d+\s+\d+/\d+|\d+\s*[%s]|\d+/\d+|\d*[.,]?\d+)\s*[%s]?\s*(?:[-–]\s*\d+(?:\s*[%s]|\s+\d+/\d+)?\s*)?%s" % (FRAC, FRAC, FRAC, FRAC, IMPUNIT), re.I)
NUM = re.compile(r'\d*[.,]?\d+')
def norm(n):
    n = n.replace(',', '.')
    if n.startswith('.'): n = '0' + n
    if '.' in n: n = n.rstrip('0').rstrip('.')
    return n
def zahlen(s, ohne_imperial):
    skip = []
    if ohne_imperial:
        skip = [(m.start(), m.end()) for m in SPAN.finditer(s)]
        # Hochzahlen «m2», «yd2» sind keine eigenen Zahlen
        skip += [(m.start(1), m.end(1)) for m in re.finditer(r'(?:m|yd|ft|in)(2)\b', s)]
        # Zähler/Nenner nackter Brüche («3/8»), Bruch-Rest vor Bruchzeichen («14 ½»)
        skip += [(m.start(), m.end()) for m in re.finditer(r'\d+\s*[%s]' % FRAC, s)]
        skip += [(m.start(), m.end()) for m in re.finditer(r'\d+\s+\d+/\d+', s)]
    out = []
    for m in NUM.finditer(s):
        if any(a <= m.start() < b for a, b in skip): continue
        out.append(norm(m.group(0)))
    return out

# imperiale Reste im Deutschen
IMP_DE = re.compile(r"(?<![A-Za-zÄÖÜäöü])(?:oz|ounces?|lbs?|pounds?|inch(?:es)?|yd2?|yds|yards?|ft|feet|foot|gal|gallons?|fl\.?\s*oz|mph|mils?|pt|[°º]\s*F|Fahrenheit)(?![A-Za-zÄÖÜäöü])|[%s″”]|\d\s*(?:\"|'')|\d\s*in\b|\d/\d+\s*(?:\"|'')" % FRAC, re.I)
# Englisch: nur Wörter, die im Deutschen nicht vorkommen
EN_ONLY = set('''the and with for your this that from are you can has have will made wash cold water bleach comfortable
machine instructions sleeve sleeves neck regular blank sourced color colour not but all our their each also than when which into
only more most very soft note please keep after before each every these those been being would should could about over under
feature features features features fabric weight thickness width length height wide long short thick hem hems stitch stitched
seam seams collar pocket pockets hood drawstring zipper lining bottom top front back inside outside available'''.split())

def main(a, b):
    ein = json.load(open(a, encoding='utf-8')); aus = json.load(open(b, encoding='utf-8'))
    if isinstance(aus, dict): aus = aus.get('items') or aus.get('ergebnis') or []
    err = []; warn = []
    q = {x['id']: x for x in ein}
    ids_out = [x.get('id') for x in aus]
    if len(ids_out) != len(set(ids_out)): err.append(('-', 'doppelte ids'))
    for i in set(q) - set(ids_out): err.append((i, 'fehlt in der Ausgabe'))
    for i in set(ids_out) - set(q): err.append((i, 'unbekannte id'))
    for o in aus:
        i = o.get('id')
        if i not in q: continue
        en = q[i]['description']; de = o.get('de') or ''
        if not de.strip(): err.append((i, 'leere Übersetzung')); continue
        dez = set(zahlen(de, False))
        fehl = [z for z in zahlen(en, True) if z not in dez]
        if fehl: err.append((i, 'Zahl(en) aus dem Original fehlen: ' + ', '.join(sorted(set(fehl)))))
        for m in IMP_DE.finditer(de.replace('¾-Ärmel','').replace('¾-Arm','')):
            err.append((i, 'imperiale Einheit im Deutschen: «%s»' % de[max(0, m.start() - 15):m.end() + 15].replace('\n', ' ')))
            break
        if 'ß' in de: err.append((i, '«ß»'))
        if re.search(r'\s[–—]\s|[—]', de):
            err.append((i, 'Gedankenstrich: «%s»' % re.search(r'.{0,12}(?:\s[–—]\s|[—]).{0,12}', de).group(0).replace('\n', ' ')))
        elif '–' in de:
            warn.append((i, 'Halbgeviertstrich (Zahlenbereich?): «%s»' % re.search(r'.{0,12}–.{0,12}', de).group(0).replace('\n', ' ')))
        if re.search(r'(?<=\S) - (?=\S)', de):
            warn.append((i, 'Bindestrich mit Leerschlaegen mitten im Satz: «%s»' % re.search(r'.{0,12}(?<=\S) - (?=\S).{0,12}', de).group(0).replace('\n', ' ')))
        el = en.split('\n'); dl = de.split('\n')
        if len(el) != len(dl): err.append((i, 'Zeilenzahl %d im Original, %d im Deutschen' % (len(el), len(dl))))
        else:
            for k, (x, y) in enumerate(zip(el, dl)):
                if x.strip() == '' and y.strip() != '': err.append((i, 'Leerzeile %d wurde gefüllt' % k)); break
                if x.strip() != '' and y.strip() == '': err.append((i, 'Zeile %d leer' % k)); break
                xb = x.lstrip()[:1]; yb = y.lstrip()[:1]
                if xb in '•·-*' and xb and xb != yb: err.append((i, 'Aufzählungszeichen Zeile %d: %r gegen %r' % (k, xb, yb))); break
        w = re.findall(r"[A-Za-z']+", de.lower()); hits = sorted(set(x for x in w if x in EN_ONLY))
        if len(hits) >= 2 and len([x for x in w if x in EN_ONLY]) >= 3: warn.append((i, 'mögliche englische Reste: ' + ', '.join(hits)))
        if re.search(r'\d\.\d', de) and not re.search(r'\d\.\d+\.\d|\d\.\d+\s*(?:Uhr)', de): warn.append((i, 'Dezimalpunkt im Deutschen: «%s»' % re.search(r'.{0,12}\d\.\d.{0,12}', de).group(0).replace('\n', ' ')))
        if re.search(r'\d(?:cm|mm|kg|ml|g/m|dl)\b|\d g\b(?!/)|\d l\b', de) and not re.search(r'\d\s(?:cm|mm|kg|ml|g|l|g/m)', de) : warn.append((i, 'Zahl und Einheit ohne Leerschlag'))
        elif re.search(r'\d(?:cm|mm|kg|ml|g/m²?|dl)\b', de): warn.append((i, 'Zahl und Einheit ohne Leerschlag: «%s»' % re.search(r'.{0,10}\d(?:cm|mm|kg|ml|g/m²?|dl)\b.{0,6}', de).group(0).replace('\n', ' ')))
        if re.search(r'\d\s+%', de): warn.append((i, 'Leerschlag vor %'))
        if '"' in de: warn.append((i, 'gerade Anführungszeichen'))
        if re.search(r'[“”„]', de): warn.append((i, 'deutsche/englische Anführungszeichen statt «»'))
        if '  ' in de: warn.append((i, 'Doppelleerzeichen'))
        if re.search(r'[ \t]+$', de, re.M): warn.append((i, 'Leerschlag am Zeilenende'))
        if re.search(r'\bZoll\b', de): warn.append((i, 'Zoll im Text: «%s»' % re.search(r'.{0,15}\bZoll\b.{0,10}', de).group(0).replace('\n', ' ')))
        if IMP_DE.search(en) is None and False: pass
    return err, warn

if __name__ == '__main__':
    if os.path.isdir(sys.argv[1]):
        te = tw = 0
        for f in sorted(glob.glob(os.path.join(sys.argv[1], 'b_[0-9][0-9].json'))):
            g = os.path.join(sys.argv[2], os.path.basename(f))
            e, w = main(f, g)
            te += len(e); tw += len(w)
            for i, t in e: print('FEHLER', os.path.basename(f), i, t)
            for i, t in w: print('WARNUNG', os.path.basename(f), i, t)
        print('GESAMT: %d Fehler, %d Warnungen' % (te, tw))
        sys.exit(1 if te else 0)
    else:
        e, w = main(sys.argv[1], sys.argv[2])
        for i, t in e: print('FEHLER', i, t)
        for i, t in w: print('WARNUNG', i, t)
        print('ERGEBNIS: %d Fehler, %d Warnungen' % (len(e), len(w)))
        sys.exit(1 if e else 0)
