#!/usr/bin/env python3
# Google-Feed: age_group=adult (immer sicher hier) + gender aus Tags/Titel → mm-google-shopping-Metafelder.
import json,subprocess,os,time
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
    d=gql('{p:product(id:"%s"){title tags}}'%gid).get('data',{}).get('p')
    if not d: continue
    g=gender_of(d['tags'],d['title'])
    if DRY:
        print(f'[DRY] {pid} age_group=adult gender={g}  {d["title"][:34]}'); ct+=1
        if ct>=12: break
        continue
    r=gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}',{'m':[
        {'ownerId':gid,'namespace':'mm-google-shopping','key':'age_group','type':'single_line_text_field','value':'adult'},
        {'ownerId':gid,'namespace':'mm-google-shopping','key':'gender','type':'single_line_text_field','value':g}]})
    e=r.get('data',{}).get('metafieldsSet',{}).get('userErrors',[])
    if e: print('✗',pid,e)
    else: open(LEDGER,'a').write(pid+'\n'); ct+=1
    time.sleep(0.3)
print(f"{'DRY ' if DRY else ''}gesetzt={ct}, total={len(ids)}")
