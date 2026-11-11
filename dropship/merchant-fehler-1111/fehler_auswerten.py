# fehler_auswerten.py: wertet die FEHLER- und BILD-Zeilen eines Laufs von merchant-bildprobleme.yml aus.
# Aufruf: python3 -I fehler_auswerten.py <lauf.log> <ausgabe.json>
import json, re, sys
from collections import Counter, defaultdict

log, aus = sys.argv[1], sys.argv[2]
fehler, bild = set(), set()
for z in open(log, encoding='utf-8', errors='replace'):
    m = re.search(r'(FEHLER\|[^|]*\|[^|]*\|[^|]*\|.*)$', z.rstrip('\n'))
    if m:
        fehler.add(m.group(1).strip()); continue
    m = re.search(r'(BILD\|[^|]*\|[^|]*\|.*)$', z.rstrip('\n'))
    if m:
        bild.add(m.group(1).strip())

def quelle(off):
    if re.match(r'^shopify_ZZ_\d+_\d+$', off): return 'google-app'
    if re.match(r'^\d{13,15}_.+$', off): return 'zweite-quelle'
    return 'nummer'

def produkt(off):
    m = re.match(r'^shopify_ZZ_(\d+)_\d+$', off) or re.match(r'^(\d{13,15})_.+$', off)
    return m.group(1) if m else None

gruppen = defaultdict(list)
for f in fehler:
    _, code, attr, off, titel = f.split('|', 4)
    gruppen[(code, attr)].append({'angebot': off, 'titel': titel, 'quelle': quelle(off), 'produkt': produkt(off)})
print('verschiedene FEHLER-Zeilen', len(fehler), '| BILD-Zeilen', len(bild))
for (code, attr), l in sorted(gruppen.items(), key=lambda kv: -len(kv[1])):
    q = Counter(x['quelle'] for x in l)
    p = len({x['produkt'] for x in l if x['produkt']})
    print(f'{len(l):6d}  {code:45s} {attr:28s} Produkte {p:5d}  {dict(q)}')
    for x in l[:3]:
        print('          z. B.', x['angebot'][:40], '|', x['titel'][:60])
nummer = [b for b in bild if quelle(b.split('|')[2]) == 'nummer']
print('BILD mit reiner Nummer:')
for b in sorted(nummer): print('   ', b)
json.dump({f'{c}|{a}': l for (c, a), l in gruppen.items()}, open(aus, 'w'), ensure_ascii=False, indent=1)
