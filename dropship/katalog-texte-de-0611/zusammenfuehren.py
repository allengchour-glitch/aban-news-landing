#!/usr/bin/env python3
"""Baut aus den 20 Beschreibungs-Stapeln und dem Wörterbuch EINE Datei für das Katalogfenster «Selbst gestalten»:
    luxe-clothing-texts-de.json  (Theme-Asset assets/luxe-clothing-texts-de.json)
Format: {"schema":1,"erstellt":"05.11.2026","beschreibungen":{"<id>":"<de>"},"positionen":{...},"optionstitel":{...},
         "optionswerte":{...},"techniken":{...},"ausnahmen":{"positionen":{"<EN>":{"<modell-id>":"<de>"}}}}
Schlüssel der Wörterbuchbereiche = englischer Originalbegriff exakt (wie im Detaildatensatz).
«ausnahmen» ist ein zusätzlicher Bereich: Positionsnamen, die nur für einzelne Modelle anders heissen (Halsband statt Kragen ...).
Das Skript bricht mit Exit 1 ab, wenn etwas nicht stimmt (fehlende Ids, fehlende Wörter, imperiale Reste, «ß», Zeichen, die das Fenster als HTML lesen würde).
Zusätzlich schreibt es unsicher.json (alle Unsicherheiten und Umrechnungen der Übersetzer, nicht für das Theme)."""
import json, re, glob, os, sys, hashlib

ROOT = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/'
IN = ROOT + 'texte/in/'
OUT = ROOT + 'texte/out/'
BAU = ROOT + 'work/bau/'
ZIEL = BAU + 'luxe-clothing-texts-de.json'

fehler = []
def bad(msg): fehler.append(msg)

# imperiale Einheiten / Zeichen, die im Deutschen nichts verloren haben
IMP = re.compile(r"(?<![A-Za-zÄÖÜäöü])(?:oz|ounces?|lbs?|pounds?|inch(?:es)?|yd2?|yds|yards?|ft|feet|foot|gal|gallons?|mph|mils?|Fahrenheit)(?![A-Za-zÄÖÜäöü])|[°º]\s*F\b|[¼½¾⅐-⅞″”]|\d\s*(?:\"|'')|\d/\d+\s*(?:\"|'')", re.I)

# --- Beschreibungen ---------------------------------------------------------
eingabe = {}
for f in sorted(glob.glob(IN + 'b_[0-9][0-9].json')):
    for x in json.load(open(f, encoding='utf-8')):
        if x['id'] in eingabe: bad('doppelte Id in der Eingabe: %s' % x['id'])
        eingabe[x['id']] = x['description']
beschr = {}
unsicher = []
umgerechnet = []
for f in sorted(glob.glob(OUT + 'b_[0-9][0-9].json')):
    stapel = os.path.basename(f)[:-5]
    for o in json.load(open(f, encoding='utf-8')):
        i = o['id']
        if i in beschr: bad('doppelte Id in der Ausgabe: %s' % i)
        de = o.get('de')
        if not isinstance(de, str) or not de.strip(): bad('leere Übersetzung %s' % i); continue
        # Zeilenende-Leerschläge und Rand entfernen (inhaltlich ohne Wirkung; das Fenster trimmt ohnehin)
        de = '\n'.join(l.rstrip() for l in de.split('\n')).strip()
        if re.search(r'[<>&]', de): bad('Id %s: «<», «>» oder «&» im Text (das Fenster liest Text über einen HTML-Parser)' % i)
        if 'ß' in de: bad('Id %s: ß' % i)
        if re.search(r'[–—]', de): bad('Id %s: Gedankenstrich' % i)
        m = IMP.search(de.replace('¾-Ärmel', ''))
        if m: bad('Id %s: imperialer Rest «%s»' % (i, de[max(0, m.start() - 12):m.end() + 12].replace('\n', ' ')))
        beschr[str(i)] = de
        for u in o.get('unsicher') or []: unsicher.append({'id': i, 'stapel': stapel, 'text': u})
        for u in o.get('umgerechnet') or []: umgerechnet.append(dict(u, id=i, stapel=stapel))
for i in eingabe:
    if str(i) not in beschr: bad('Beschreibung fehlt: %s' % i)
for i in beschr:
    if int(i) not in eingabe: bad('unbekannte Id in der Ausgabe: %s' % i)

# --- Wörterbuch -------------------------------------------------------------
w_in = json.load(open(IN + 'woerter.json', encoding='utf-8'))
w_de = json.load(open(OUT + 'woerter_de.json', encoding='utf-8'))
ergebnis = {'schema': 1, 'erstellt': '05.11.2026', 'beschreibungen': beschr}
for bereich in ('positionen', 'optionstitel', 'optionswerte', 'techniken'):
    soll = [x['en'] for x in w_in[bereich]]
    ist = w_de.get(bereich, {})
    for en in soll:
        v = ist.get(en)
        if not isinstance(v, str) or not v.strip(): bad('%s: keine Übersetzung für «%s»' % (bereich, en)); continue
        if v != v.strip(): bad('%s: Leerschlag am Rand bei «%s»' % (bereich, en))
        if re.search(r'[<>&–—ß]', v): bad('%s: unzulässiges Zeichen in «%s»' % (bereich, v))
        if IMP.search(v): bad('%s: imperialer Rest in «%s»' % (bereich, v))
    for en in ist:
        if en not in soll: bad('%s: Übersetzung für unbekannten Begriff «%s»' % (bereich, en))
    ergebnis[bereich] = {en: ist[en] for en in soll if en in ist}
# Ausnahmen je Modell (nur Positionen)
ausn = {}
for bereich, tab in (w_de.get('ausnahmen') or {}).items():
    if bereich != 'positionen': bad('Ausnahmen für %s nicht vorgesehen' % bereich); continue
    for en, modelle in tab.items():
        if en not in ergebnis['positionen']: bad('Ausnahme für unbekannte Position «%s»' % en)
        for mid, v in modelle.items():
            if not re.fullmatch(r'\d+', mid) or not isinstance(v, str) or not v.strip(): bad('Ausnahme unzulässig: %s %s %r' % (en, mid, v))
        ausn.setdefault('positionen', {})[en] = modelle
if ausn: ergebnis['ausnahmen'] = ausn

# --- Zusatzwörterbücher (Regionsnamen, Materialnamen) und Quellenhash --------------------------------
TH = ROOT + 'theme/'
detail = {}
for f in sorted(glob.glob(TH + 'assets__luxe-clothing-details-s[0-9][0-9][0-9].json')):
    d = json.load(open(f, encoding='utf-8'))
    rows = d['products'] if isinstance(d['products'], list) else list(d['products'].values())
    for r in rows: detail[r['id']] = r
z = json.load(open(OUT + 'zusatz_de.json', encoding='utf-8'))
def fnv1a16(s):
    """FNV-1a (32 Bit) über die UTF-16-Code-Einheiten, identisch zur Funktion im Katalogfenster (charCodeAt + Math.imul)."""
    h = 0x811c9dc5
    b = s.encode('utf-16-le')
    for k in range(0, len(b), 2):
        h ^= b[k] | (b[k + 1] << 8)
        h = (h * 0x01000193) & 0xffffffff
    return '%08x' % h
def mat_key(n): return re.sub(r'[\s,;.]+$', '', re.sub(r'\s+', ' ', n.lower().strip())).strip()
# Namen, die das Katalogfenster schon selbst übersetzt (materialNames im JS, Texte in den Locale-Dateien)
JS_MATERIAL = {'cotton','organic cotton','polyester','recycled polyester','elastane','spandex','viscose','rayon','nylon','wool','acrylic','linen','recycled cotton',
               'combed cotton','combed ring spun cotton','combed ring-spun cotton','ring spun cotton','ring-spun cotton'}
regionen_daten = {}; material_daten = set()
for p in detail.values():
    for v in p.get('variants') or []:
        for k, n in (v.get('availability_regions') or {}).items(): regionen_daten[n] = 1; regionen_daten[k] = 1
        for m in v.get('material') or []:
            if isinstance(m.get('name'), str) and m['name'].strip(): material_daten.add(mat_key(m['name']))
for n in regionen_daten:
    if n not in z['regionen']: bad('Region ohne Übersetzung: «%s»' % n)
for n in sorted(material_daten):
    if n not in JS_MATERIAL and n not in z['material']: bad('Material ohne Übersetzung: «%s»' % n)
for bereich in ('regionen', 'material'):
    for en, v in z[bereich].items():
        if not isinstance(v, str) or not v.strip() or v != v.strip(): bad('%s: unzulässiger Wert für «%s»' % (bereich, en)); continue
        if re.search(r'[<>&–—ß]', v) or IMP.search(v): bad('%s: unzulässiges Zeichen oder Imperiales in «%s»' % (bereich, v))
        if bereich == 'material' and en != mat_key(en): bad('material: Schlüssel nicht normalisiert: «%s»' % en)
ergebnis['regionen'] = z['regionen']; ergebnis['material'] = z['material']
# Quellenhash: Hash der englischen Beschreibung (roher Text aus den Detaildaten), damit ein später geänderter Herstellertext nicht mit der alten Übersetzung angezeigt wird
qh = {}
for i in beschr:
    p = detail.get(int(i))
    if p is None or not isinstance(p.get('description'), str) or not p['description']: bad('Beschreibung %s: kein Quelltext in den Detaildaten' % i); continue
    if p['description'] != eingabe[int(i)]: bad('Beschreibung %s: Quelltext der Detaildaten weicht von der Eingabe ab' % i)
    qh[str(i)] = fnv1a16(p['description'])
ergebnis['quellenhash'] = qh
ergebnis['erstellt'] = '06.11.2026'

if fehler:
    print('FEHLER (%d):' % len(fehler))
    for x in fehler: print(' -', x)
    sys.exit(1)

txt = json.dumps(ergebnis, ensure_ascii=False, separators=(',', ':'))
open(ZIEL, 'w', encoding='utf-8').write(txt)
roh = txt.encode('utf-8')
print('geschrieben:', ZIEL)
print('Regionen:', len(ergebnis['regionen']), '| Material:', len(ergebnis['material']), '| Quellenhash:', len(ergebnis['quellenhash']))
print('Beschreibungen:', len(beschr), '| Positionen:', len(ergebnis['positionen']), '| Optionstitel:', len(ergebnis['optionstitel']),
      '| Optionswerte:', len(ergebnis['optionswerte']), '| Techniken:', len(ergebnis['techniken']),
      '| Ausnahmen:', sum(len(v) for t in ausn.values() for v in t.values()) if ausn else 0)
print('Bytes (UTF-8):', len(roh), '| Zeichen:', len(txt), '| md5:', hashlib.md5(roh).hexdigest())
json.dump({'unsicher': unsicher, 'umgerechnet': umgerechnet, 'unsicher_woerterbuch': w_de.get('unsicher')},
          open(BAU + 'unsicher.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('Unsicherheiten der Beschreibungen:', len(unsicher), '| Umrechnungen:', len(umgerechnet), '| Unsicherheiten Wörterbuch:', len(w_de.get('unsicher') or []))
