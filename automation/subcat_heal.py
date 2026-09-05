#!/usr/bin/env python3
"""subcat_heal.py — heilt Sub-Collections mit TITLE-CONTAINS-Teilwort-Falle (Röcke-Muster 2026-07-07).
Je Kategorie: Kandidaten per Titel-Suche → präzise Klassifikation (Wortgrenzen + Kontext + Ban)
→ Tag `kategorie-<key>` → Collection-Regel auf TAG umstellen.
GEHIRN 9b: IMMER erst DRY=1 (zeigt Beispiele beider Klassen), dann APPLY=1.
ENV: DRY=1 (Default) · APPLY=1 · CAT=kleider|taschen|uhren (Pflicht)
Secrets: SHOPIFY_CLIENT_ID/SECRET aus Env oder /tmp/shopify_tok.txt (Token-Cache).
"""
import json, urllib.request, re, time, os, sys

SHOP = 'au3j0y-hq.myshopify.com'
TOK = open('/tmp/shopify_tok.txt').read().strip()
APPLY = os.environ.get('APPLY') == '1'
CAT = os.environ.get('CAT', '')

def gql(q, v=None):
    for a in range(6):
        try:
            r = urllib.request.Request(f'https://{SHOP}/admin/api/2025-01/graphql.json',
                data=json.dumps({'query': q, 'variables': v or {}}).encode(),
                headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOK})
            j = json.load(urllib.request.urlopen(r, timeout=45))
            if j.get('errors') and 'THROTTLED' in json.dumps(j['errors']):
                time.sleep(3); continue
            return j
        except Exception:
            time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")

# Konfiguration je Kategorie: search=Titel-Suchbegriffe (wie kaputte Regel),
# echt=Positiv-Regex (Wortgrenzen!), mode=Kontext-Pflicht (None=kein Kontext nötig), ban=Hart-Ausschluss.
CFG = {
 'kleider': dict(handle='sub-kleider', tag='kategorie-kleid', searches=['kleid'],
    echt=re.compile(r'\b\w*?(kleid|kleider|dress)\b', re.I),
    mode=None,
    ban=re.compile(r'arbeitskleidung|berufskleidung|bekleidung|kleidung\b|kleiderschrank|kleiderbügel|kleiderstange|kleiderständer|kleidersack|hunde?kleid|puppenkleid|verkleidung|umkleide', re.I)),
 'taschen': dict(handle='sub-taschen', tag='kategorie-tasche', searches=['tasche', 'rucksack'],
    echt=re.compile(r'\b(hand|umhänge|schulter|abend|strand|shopper|leder|mini|bauch|gürtel|crossbody|hobo|tote|clutch)?(tasche|taschen|rucksack|rucksäcke|bag)\b', re.I),
    mode=None,
    ban=re.compile(r'werkzeugtasche|werkzeug|laptop-?tasche für werkzeug|kabeltasche|maschinen|hosentasche|jackentasche|taschenlampe|taschenmesser|taschenrechner|taschenwärmer|taschentuch|taschentücher|erste.?hilfe|kühl(tasche)? für lebensmittel|pizzatasche|wickeltasche.*auto', re.I)),
 'uhren': dict(handle='sub-uhren', tag='kategorie-uhr', searches=['uhr', 'watch'],
    echt=re.compile(r'\b(armband|herren|damen|automatik|quarz|smart|sport|chronograph|taucher|taschen)?(uhr|uhren|watch)\b', re.I),
    mode=None,
    ban=re.compile(r'wanduhr|standuhr|tischuhr|wecker|küchenuhr|uhrwerk|uhrenbox|uhrenbeweger|uhrenarmband|uhrband|uhrenschutz|sanduhr|eieruhr|parkuhr|stoppuhr|wasseruhr|uhrzeit|kuckucksuhr|reinigungsgerät|ultraschall|federstege', re.I)),
 'halsketten': dict(handle='sub-halsketten', tag='kategorie-halskette', searches=['kette', 'halskette', 'collier', 'anhänger'],
    echt=re.compile(r'\b(hals|glieder|panzer|schlangen|perlen|silber|gold)?(kette|ketten|collier|necklace)\b|\banhänger\b', re.I),
    mode=None,
    ban=re.compile(r'lichterkette|glühbirnenkette|led-?kette|kettensäge|kettenöl|kettenschloss|fahrradkette|schneekette|kettenrad|schlüsselkette für werkzeug|absperrkette|kettenspanner|türkette|wc |spülkasten|schlüsselanhänger|taschenanhänger|auto-?anhänger|anhängerkupplung|deckenanhänger|wandanhänger|duftanhänger fürs auto', re.I)),
 'armbaender': dict(handle='sub-armbaender', tag='kategorie-armband', searches=['armband', 'armreif', 'bracelet'],
    echt=re.compile(r'\b(armband|armbänder|armreif|armreifen|bracelet)\b', re.I),
    mode=None,
    ban=re.compile(r'uhrenarmband|uhrband|smartwatch|armbanduhr|\buhr\b|\buhren\b|herrenuhr|damenuhr|ersatzarmband für|fitness-?tracker|reflektorarmband|schwimm|sicherheitsarmband|mücken|insekten|festival-?kontroll|pager', re.I)),
}

if CAT not in CFG:
    sys.exit(f'CAT={CAT} unbekannt. Wähle: {", ".join(CFG)}')
c = CFG[CAT]

# Kandidaten einsammeln (alles was die alte CONTAINS-Regel fing)
items = {}
for s in c['searches']:
    cursor = None
    while True:
        d = gql('query($c:String,$q:String!){ products(first:100, after:$c, query:$q){ pageInfo{hasNextPage endCursor} edges{ node{ id title tags } } } }',
                {'c': cursor, 'q': f'title:*{s}* status:active'})
        p = d.get('data', {}).get('products')
        if not p: break
        for e in p['edges']:
            items[e['node']['id']] = e['node']
        if not p['pageInfo']['hasNextPage']: break
        cursor = p['pageInfo']['endCursor']
    time.sleep(0.3)

gut, schlecht = [], []
for n in items.values():
    t = n['title']
    ok = bool(c['echt'].search(t)) and not c['ban'].search(t)
    if ok and c['mode'] is not None:
        ok = bool(c['mode'].search(t))
    (gut if ok else schlecht).append(n)

print(f'[{CAT}] {len(items)} Kandidaten → {len(gut)} ECHT · {len(schlecht)} raus')
print('\nECHT (Stichprobe):')
for n in gut[:15]: print('  ✅', n['title'][:72])
print('\nRAUS (Stichprobe):')
for n in schlecht[:15]: print('  ✗', n['title'][:72])

if not APPLY:
    print('\n[DRY] — mit APPLY=1 wird getaggt + Regel umgestellt.')
    sys.exit(0)

for i, n in enumerate(gut):
    tags = sorted(set(n['tags']) | {c['tag']})
    r = gql('mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }', {'i': {'id': n['id'], 'tags': tags}})
    e = (r.get('data', {}).get('productUpdate') or {}).get('userErrors')
    if e: print('  ✗ tag-fail', n['title'][:50], e)
    if i % 50 == 49: print(f'  … {i+1}/{len(gut)} getaggt')
    time.sleep(0.25)
print(f'{len(gut)} getaggt mit {c["tag"]}.')

d = gql('query($q:String!){ collections(first:1,query:$q){ edges{ node{ id } } } }', {'q': f'handle:{c["handle"]}'})
cid = d['data']['collections']['edges'][0]['node']['id']
r = gql('mutation($i:CollectionInput!){ collectionUpdate(input:$i){ collection{ id } userErrors{ field message } } }',
        {'i': {'id': cid, 'ruleSet': {'appliedDisjunctively': False,
               'rules': [{'column': 'TAG', 'relation': 'EQUALS', 'condition': c['tag']}]}}})
print('Collection-Regel:', (r.get('data', {}).get('collectionUpdate') or {}).get('userErrors') or 'auf TAG umgestellt ✅')
