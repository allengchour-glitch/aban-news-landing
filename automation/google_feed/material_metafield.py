#!/usr/bin/env python3
# Google-Feed-Fix: schreibt das in der Beschreibung bereits genannte Material in das
# Metafeld mm-google-shopping.material (das der Google&YouTube-Channel als Attribut liest).
# Farbe kommt aus der Varianten-Option (Shopify sendet sie automatisch). Nichts erfunden.
import json, subprocess, os, re, sys, time
os.chdir('/home/user/aban-news-landing')
DRY = os.environ.get('DRY','1')=='1'
LIM = int(os.environ.get('LIM','443'))
LEDGER='dropship/_material_mf_done.txt'
done=set(open(LEDGER).read().split()) if os.path.exists(LEDGER) else set()
tokf='/tmp/shopify_tok.txt'
def tok(): return open(tokf).read().strip()
def refresh():
    r=subprocess.run(['curl','-s','-X','POST','https://au3j0y-hq.myshopify.com/admin/oauth/access_token','-H','Content-Type: application/json',
      '-d',json.dumps({'client_id':os.environ['SHOPIFY_CLIENT_ID'],'client_secret':os.environ['SHOPIFY_CLIENT_SECRET'],'grant_type':'client_credentials'})],capture_output=True,text=True)
    t=json.loads(r.stdout).get('access_token')
    if t: open(tokf,'w').write(t)
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
def parse_material(html):
    if not html: return None
    m=re.search(r'Material[:\s<]*(?:</strong>)?[:\s]*([^<\n]{2,60})', html, re.I)
    if not m: return None
    val=re.sub(r'\s+',' ',m.group(1)).strip()
    val=re.sub(r'^/?strong>','',val,flags=re.I).strip(' :,.')
    # sanity: not a whole sentence, not empty
    if not val or len(val)>60 or val.lower() in ('n/a','unbekannt'): return None
    return val
pids=[p for p in open('/tmp/csv_pids.txt').read().split() if p not in done][:LIM]
set_ct=skip=0
for pid in pids:
    gid=f'gid://shopify/Product/{pid}'
    d=gql('{ p:product(id:"%s"){ descriptionHtml metafield(namespace:"mm-google-shopping",key:"material"){value} } }'%gid).get('data',{}).get('p')
    if not d: continue
    if d.get('metafield'):  # already set
        open(LEDGER,'a').write(pid+'\n'); skip+=1; continue
    mat=parse_material(d['descriptionHtml'])
    if not mat: skip+=1; continue
    if DRY:
        print(f'[DRY] {pid}  material="{mat}"'); set_ct+=1; continue
    r=gql('mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{message} } }',
        {'m':[{'ownerId':gid,'namespace':'mm-google-shopping','key':'material','type':'single_line_text_field','value':mat[:60]}]})
    errs=r.get('data',{}).get('metafieldsSet',{}).get('userErrors',[])
    if errs: print('✗',pid,errs)
    else: open(LEDGER,'a').write(pid+'\n'); set_ct+=1
    time.sleep(0.3)
print(f"{'DRY ' if DRY else ''}gesetzt/würde={set_ct}, skip(schon-da/kein-material)={skip}, total={len(pids)}")
