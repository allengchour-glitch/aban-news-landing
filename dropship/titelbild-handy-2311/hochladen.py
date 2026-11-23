# Hochladen mit Sicherung und Rücklesen. Aufruf: python3 hochladen.py [LIVE=1 als Umgebungsvariable]
#   Reihenfolge fest: zuerst die Abschnittsdatei (Schema mit neuer Einstellung), dann templates/index.json.
#   Bricht ab, wenn die Live-Datei seit der Sicherung von jemand anderem geändert wurde (FREMD=1 überschreibt bewusst).
#   ZURUECK=1: spielt die Sicherungen *.vor-titelbild zurück (umgekehrte Reihenfolge).
import hashlib,json,os,sys
from gql2 import gql
TH='gid://shopify/OnlineStoreTheme/214565814663'
PAARE=[('sections/luxe-edit-home.liquid','neu/sections/luxe-edit-home.liquid','sicherung/sections__luxe-edit-home.liquid.vor-titelbild'),
       ('templates/index.json','neu/templates/index.json','sicherung/templates__index.json.vor-titelbild')]
zur=os.environ.get('ZURUECK')=='1'; live=os.environ.get('LIVE')=='1'
if zur: PAARE=[(n,s,s) for n,_,s in reversed(PAARE)]
def lesen(n):
    x=gql('query($f:[String!]!){ theme(id:"%s"){ files(filenames:$f){ nodes{ filename checksumMd5 body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }'%TH,{'f':[n]})['theme']['files']['nodes']
    return x[0]['body']['content'] if x else None
md5=lambda s: hashlib.md5(s.encode()).hexdigest()
for name,quelle,sich in PAARE:
    jetzt=lesen(name); soll=open(quelle).read(); vor=open(sich).read()
    if not zur and jetzt!=vor and jetzt!=soll and os.environ.get('FREMD')!='1': sys.exit(f'ABBRUCH {name}: live seit Sicherung geaendert ({md5(jetzt)})')
    print(name,'live',md5(jetzt),'->',md5(soll), '(schon gleich)' if jetzt==soll else '')
    if not live or jetzt==soll: continue
    d=gql('mutation($t:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$t, files:$f){ upsertedThemeFiles{ filename } userErrors{ filename message } } }',{'t':TH,'f':[{'filename':name,'body':{'type':'TEXT','value':soll}}]})['themeFilesUpsert']
    if d['userErrors']: sys.exit(f'FEHLER {name}: {d["userErrors"]}')
    zurueck=lesen(name); print('  geschrieben, rueckgelesen', md5(zurueck), 'GLEICH' if zurueck==soll else 'ABWEICHUNG')
    if zurueck!=soll: sys.exit(1)
print('LIVE' if live else 'TROCKENLAUF', 'fertig')
