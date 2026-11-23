#!/usr/bin/env python3
"""Webseiten-Fixes 23.11.2026 ins MAIN-Theme einspielen.

Trockenlauf ist Vorgabe. LIVE=1 schreibt. ZURUECK=1 LIVE=1 stellt den Stand vor dem Lauf wieder her.
DATEIEN=a,b begrenzt auf diese Theme-Dateien (Vorgabe: alle aus plan.json).
Regeln: jede Ersetzung muss im frisch gelesenen Stand genau 1x vorkommen (sonst Abbruch, nichts geschrieben),
Sicherung vor dem Schreiben, Rücklesen bis gleich Soll (bis 180 s), Rücknahme nur, wenn der Live-Stand
noch gleich dem eingespielten Stand ist (sonst FREMD=1 noetig).
"""
import hashlib, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gql import gql

D = os.path.dirname(os.path.abspath(__file__))
THEME = 'gid://shopify/OnlineStoreTheme/214565814663'
LIVE = os.environ.get('LIVE') == '1'
ZURUECK = os.environ.get('ZURUECK') == '1'
FREMD = os.environ.get('FREMD') == '1'
SICH = os.path.join(D, 'sicherung')
os.makedirs(SICH, exist_ok=True)

plan = json.load(open(os.path.join(D, 'plan.json')))
dateien = []
for p in plan:
    if p['datei'] not in dateien:
        dateien.append(p['datei'])
if os.environ.get('DATEIEN'):
    want = os.environ['DATEIEN'].split(',')
    dateien = [d for d in dateien if d in want]
    if len(dateien) != len(want):
        sys.exit(f'ABBRUCH: unbekannte Datei in DATEIEN {want}')

md5 = lambda s: hashlib.md5(s.encode('utf-8')).hexdigest()
fn = lambda d: d.replace('/', '__')


def lesen(names):
    q = '''query($id:ID!,$f:[String!]){theme(id:$id){files(filenames:$f,first:50){nodes{filename checksumMd5 updatedAt
      body{... on OnlineStoreThemeFileBodyText{content}}}}}}'''
    r = gql(q, {'id': THEME, 'f': names})
    if r.get('errors'):
        sys.exit('LESEFEHLER ' + json.dumps(r['errors'])[:500])
    out = {}
    for n in r['data']['theme']['files']['nodes']:
        out[n['filename']] = (n['body']['content'], n['updatedAt'])
    return out


def schreiben(name, text):
    m = '''mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){
      upsertedThemeFiles{filename} userErrors{field message code filename}}}'''
    r = gql(m, {'id': THEME, 'files': [{'filename': name, 'body': {'type': 'TEXT', 'value': text}}]})
    if r.get('errors'):
        return 'API-FEHLER ' + json.dumps(r['errors'])[:500]
    ue = r['data']['themeFilesUpsert']['userErrors']
    if ue:
        return 'USERERRORS ' + json.dumps(ue, ensure_ascii=False)[:800]
    return None


def warte_gleich(name, soll, frist=180):
    t0 = time.time()
    while True:
        ist = lesen([name]).get(name, ('', ''))[0]
        if ist == soll:
            return True, round(time.time() - t0)
        if time.time() - t0 > frist:
            return False, md5(ist)
        time.sleep(10)


live = lesen(dateien)
for d in dateien:
    if d not in live:
        sys.exit(f'ABBRUCH: {d} nicht im Theme gefunden')

if ZURUECK:
    for d in dateien:
        vor_p = os.path.join(SICH, fn(d) + '.vor')
        nach_p = os.path.join(SICH, fn(d) + '.nach')
        if not os.path.exists(vor_p):
            print(f'{d}: keine Sicherung, übersprungen'); continue
        vor = open(vor_p, encoding='utf-8').read()
        ist = live[d][0]
        if ist == vor:
            print(f'{d}: steht schon auf dem alten Stand'); continue
        if os.path.exists(nach_p) and ist != open(nach_p, encoding='utf-8').read() and not FREMD:
            print(f'{d}: ABBRUCH, Live-Stand weicht vom eingespielten ab (md5 {md5(ist)}); FREMD=1 überschreibt'); continue
        if not LIVE:
            print(f'{d}: [Trockenlauf] würde auf md5 {md5(vor)} zurückstellen'); continue
        e = schreiben(d, vor)
        if e: print(f'{d}: FEHLER {e}'); continue
        ok, info = warte_gleich(d, vor)
        print(f'{d}: zurückgestellt, Rücklesen {"GLEICH" if ok else "UNGLEICH " + str(info)}')
    sys.exit(0)

fehler = 0
neu = {}
for d in dateien:
    text, upd = live[d]
    print(f'== {d}  live md5 {md5(text)}  updatedAt {upd}  {len(text)} Zeichen')
    for p in [p for p in plan if p['datei'] == d]:
        n = text.count(p['alt_text'])
        if n != 1:
            print(f'   ✗ {p["fix"]}: alt_text kommt {n}x vor (soll 1)'); fehler += 1; continue
        text = text.replace(p['alt_text'], p['neu_text'], 1)
        if 'anker_soll' in p:
            k = text.count(p['anker_soll'])
            if k != 1:
                print(f'   ✗ {p["fix"]}: Anker danach {k}x (soll 1)'); fehler += 1; continue
        print(f'   ✓ {p["fix"]}: ersetzt ({len(p["alt_text"])} → {len(p["neu_text"])} Zeichen)')
    neu[d] = text
    print(f'   neu md5 {md5(text)}  {len(text)} Zeichen  (Δ {len(text) - len(live[d][0]):+d})')
if fehler:
    sys.exit(f'ABBRUCH: {fehler} Ersetzung(en) nicht eindeutig, nichts geschrieben')
for d in dateien:
    open(os.path.join(D, 'soll', fn(d)), 'w', encoding='utf-8').write(neu[d]) if os.path.isdir(os.path.join(D, 'soll')) else None
if not LIVE:
    print('Trockenlauf: nichts geschrieben (LIVE=1 schreibt).'); sys.exit(0)

for d in dateien:
    vor_p = os.path.join(SICH, fn(d) + '.vor')
    if not os.path.exists(vor_p):
        open(vor_p, 'w', encoding='utf-8').write(live[d][0])
    # direkt vor dem Schreiben nochmals lesen: hat jemand anderes geschrieben?
    jetzt = lesen([d])[d][0]
    if jetzt != live[d][0]:
        print(f'{d}: ABBRUCH, Datei hat sich seit dem Lesen geändert'); fehler += 1; continue
    e = schreiben(d, neu[d])
    if e:
        print(f'{d}: SCHREIBFEHLER {e}'); fehler += 1; continue
    ok, info = warte_gleich(d, neu[d])
    open(os.path.join(SICH, fn(d) + '.nach'), 'w', encoding='utf-8').write(neu[d])
    print(f'{d}: geschrieben {time.strftime("%H:%M:%S", time.gmtime())} UTC, Rücklesen {"GLEICH nach " + str(info) + " s" if ok else "UNGLEICH md5 " + str(info)}')
    if not ok: fehler += 1
sys.exit(1 if fehler else 0)
