#!/usr/bin/env python3
# Google-Feed: gender aus Tags/Titel → mm-google-shopping-Metafelder.
# ⚠️ 28.08.2026: age_group war hier BEDINGUNGSLOS 'adult' («immer sicher hier»). Das ist die Quelle
# einer ganzen Fehlerklasse: 45 aktive Kinderartikel meldeten Google `adult` — Leggings für Mädchen
# in 2T–7T, Babyschuhe mit 12–14 cm Innenlänge, ein Mädchen-Sommerkleid in Gr. 100–150. Google
# verlangt age_group bei Apparel & Accessories und wertet den Widerspruch als Misrepresentation.
# Jetzt: age_group wird NUR gesetzt, wenn das Feld leer ist UND weder Titel noch Tags auf
# Kinderware deuten. Ein fehlender Wert ist besser als ein falscher (Regel: keine Angabe schlägt
# Falschangabe) — die Zuordnung aus der Grössenleiter macht automation/newborn_altersgruppe.py.
import json,subprocess,os,re,time
os.chdir('/home/user/aban-news-landing')
DRY=os.environ.get('DRY','1')=='1'
LEDGER='dropship/_agegender_mf_done.txt'
done=set(open(LEDGER).read().split()) if os.path.exists(LEDGER) else set()
tokf='/tmp/shopify_tok.txt'
def tok(): return open(tokf).read().strip()
def refresh():
    r=subprocess.run(['curl','-s','-X','POST','https://au3j0y-hq.myshopify.com/admin/oauth/access_token','-H','Content-Type: application/json',
      '-d',json.dumps({'client_id':os.environ['SHOPIFY_CLIENT_ID'],'client_secret':os.environ['SHOPIFY_CLIENT_SECRET'],'grant_type':'client_credentials'})],capture_output=True,text=True)
    t=json.loads(r.stdout).get('access_token');  open(tokf,'w').write(t) if t else None
def gql(q,v=None):
    for _ in range(5):
        r=subprocess.run(['curl','-s','-X','POST','https://au3j0y-hq.myshopify.com/admin/api/2025-01/graphql.json',
          '-H','X-Shopify-Access-Token: '+tok(),'-H','Content-Type: application/json','-d',json.dumps({'query':q,'variables':v or {}})],capture_output=True,text=True)
        try: d=json.loads(r.stdout)
        except: time.sleep(2); continue
        if d.get('data'): return d
        if any('Throttled' in str(e) for e in d.get('errors',[])): time.sleep(4); continue
        refresh(); time.sleep(2)
    return {}
# Deutsche Zusammensetzungen MUSS das Muster mitnehmen («Kinderschuhe», «Babyjacke») — deshalb
# `\w*` am Wortende statt einer Wortgrenze (dieselbe Lehre wie «Zahnreiniger» im Genitiv).
KIND = re.compile(r'\b(?:Kinder\w*|Kids|Baby\w*|Kleinkind\w*|M[äa]dchen\w*|Junge\w*|'
                  r'Neugeboren\w*|S[äa]ugling\w*|Toddler|Krabbel\w*|Lauflern\w*)\b', re.I)
# Zwei Gegenklassen, die `\w*` sonst mitreisst:
# (a) «Baby» ist oft KEINE Altersangabe — Babydoll (Damen-Dessous), Babyrosa (FARBE),
#     Bush Baby (Tierart Galago), «Hello Baby» (Ballon-Aufdruck), «Baby Schriftzug» (Aufdruck).
# (b) ELTERNZUBEHÖR benutzt der Erwachsene: Kinderwagen, Babyphone, Wickeltasche, Stillkissen,
#     Windelkorb, Babyflaschenwärmer, Babynahrungs-Mixer. Dort ist `adult` RICHTIG.
KIND_FALSCHFREUND = re.compile(
    r'Babydoll|Babyrosa|Baby\s*-?\s*(?:Pink|Blau|Blue|Rosa)|Bush\s+Baby|Hello\s+Baby|'
    r'Baby\s+(?:Schriftzug|Print)|Kinderwagen|Babyphone|Babyfon|Wickel|Stillkissen|Windel|'
    r'Babyflasche|Babynahrung|Kindersitz|Babywaage|Babybett|Laufgitter', re.I)
KIND_TAG = {"kinder","kids","baby","baby-kids","kinderschuhe","kinderkostuem","maedchen","jungen"}

def ist_kinderware(tags,title):
    if KIND_FALSCHFREUND.search(title): return False
    return bool(KIND.search(title)) or bool(KIND_TAG & {x.lower() for x in tags})

def gender_of(tags,title):
    s=' '.join(tags).lower()+' '+title.lower()
    if any(w in s for w in ('herren','männer','manner','mens',' herr')): 
        if any(w in s for w in ('damen','frauen','women')): return 'unisex'
        return 'male'
    if any(w in s for w in ('damen','frauen','women','damen-mode')): return 'female'
    return 'unisex'
ids=[i for i in open('/tmp/agegender_ids.txt').read().split() if i not in done]
ct=0
for pid in ids:
    gid=f'gid://shopify/Product/{pid}'
    d=gql('{p:product(id:"%s"){title tags metafields(first:20,namespace:"mm-google-shopping"){nodes{key value}}}}'%gid).get('data',{}).get('p')
    if not d: continue
    g=gender_of(d['tags'],d['title'])
    vorhanden={m['key']:m['value'] for m in ((d.get('metafields') or {}).get('nodes') or [])}
    # age_group nur setzen, wenn es fehlt UND es sicher KEINE Kinderware ist.
    setz_age = ('age_group' not in vorhanden) and not ist_kinderware(d['tags'],d['title'])
    if DRY:
        print(f'[DRY] {pid} age_group={"adult" if setz_age else "(unberührt: "+str(vorhanden.get("age_group"))+")"} gender={g}  {d["title"][:34]}'); ct+=1
        if ct>=12: break
        continue
    felder=[{'ownerId':gid,'namespace':'mm-google-shopping','key':'gender','type':'single_line_text_field','value':g}]
    if setz_age:
        felder.append({'ownerId':gid,'namespace':'mm-google-shopping','key':'age_group','type':'single_line_text_field','value':'adult'})
    r=gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}',{'m':felder})
    e=r.get('data',{}).get('metafieldsSet',{}).get('userErrors',[])
    if e: print('✗',pid,e)
    else: open(LEDGER,'a').write(pid+'\n'); ct+=1
    time.sleep(0.3)
print(f"{'DRY ' if DRY else ''}gesetzt={ct}, total={len(ids)}")
