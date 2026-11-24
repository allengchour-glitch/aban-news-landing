import sys, json, hashlib, os, subprocess, time
sys.path.insert(0, '../live2311')
from gql2 import gql
LIVE = os.environ.get('LIVE') == '1'
TH = 'gid://shopify/OnlineStoreTheme/214565814663'
FILES = ['sections/luxe-edit-home.liquid', 'locales/de.json', 'locales/fr.json', 'locales/en.default.json', 'snippets/lx-edit-karte.liquid']
r = gql('query($f:[String!]){theme(id:"%s"){files(filenames:$f){nodes{filename checksumMd5 body{... on OnlineStoreThemeFileBodyText{content}}}}}}' % TH, {'f': FILES})
live = {n['filename']: n for n in r['theme']['files']['nodes']}
os.makedirs('sicherung', exist_ok=True)
for f, n in live.items():
    open('sicherung/' + f.replace('/', '__'), 'w').write(n['body']['content'])
    print('Sicherung', f, n['checksumMd5'])
assert 'snippets/lx-edit-karte.liquid' not in live, 'Snippet existiert schon'
# Section: Patch auf den LIVE-Stand anwenden
open('live_section.liquid', 'w').write(live['sections/luxe-edit-home.liquid']['body']['content'])
subprocess.run(['python3', 'patch.py', 'live_section.liquid', 'neu/luxe-edit-home.liquid'], check=True)
# Locales: auf LIVE-Stand anwenden
for fn in ['de.json', 'fr.json', 'en.default.json']:
    open('loc/' + fn, 'w').write(live['locales/' + fn]['body']['content'])
subprocess.run(['python3', 'loc_patch.py'], check=True)
plan = [('snippets/lx-edit-karte.liquid', 'neu/lx-edit-karte.liquid'), ('locales/de.json', 'neu/de.json'), ('locales/fr.json', 'neu/fr.json'),
        ('locales/en.default.json', 'neu/en.default.json'), ('sections/luxe-edit-home.liquid', 'neu/luxe-edit-home.liquid')]
for f, src in plan:
    body = open(src).read()
    md5 = hashlib.md5(body.encode()).hexdigest()
    print('PLAN', f, len(body), md5)
    if not LIVE: continue
    r = gql('mutation($t:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$t,files:$f){upsertedThemeFiles{filename} userErrors{filename code message}}}',
            {'t': TH, 'f': [{'filename': f, 'body': {'type': 'TEXT', 'value': body}}]})
    ue = r['themeFilesUpsert']['userErrors']
    if ue: print('FEHLER', f, ue); raise SystemExit(2)
    time.sleep(2)
    n = gql('query($f:[String!]){theme(id:"%s"){files(filenames:$f){nodes{checksumMd5}}}}' % TH, {'f': [f]})['theme']['files']['nodes'][0]
    print('  geschrieben, md5 live', n['checksumMd5'], 'gleich' if n['checksumMd5'] == md5 else 'ABWEICHEND')
