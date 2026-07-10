import json,subprocess,os,re,time
tok=open('/tmp/shopify_tok.txt').read().strip()
DRY=os.environ.get('DRY','1')=='1'
def refresh():
    r=subprocess.run(['curl','-s','-X','POST','https://au3j0y-hq.myshopify.com/admin/oauth/access_token','-H','Content-Type: application/json','-d',json.dumps({'client_id':os.environ['SHOPIFY_CLIENT_ID'],'client_secret':os.environ['SHOPIFY_CLIENT_SECRET'],'grant_type':'client_credentials'})],capture_output=True,text=True)
    return json.loads(r.stdout)['access_token']
def gql(q,v=None):
    global tok
    for _ in range(4):
        r=subprocess.run(['curl','-s','https://au3j0y-hq.myshopify.com/admin/api/2025-01/graphql.json','-H','X-Shopify-Access-Token: '+tok,'-H','Content-Type: application/json','-d',json.dumps({'query':q,'variables':v or {}})],capture_output=True,text=True)
        try: d=json.loads(r.stdout)
        except: time.sleep(2); continue
        if d.get('data'): return d
        if 'Throttled' in json.dumps(d.get('errors','')): time.sleep(3); continue
        tok=refresh(); time.sleep(1)
    return {}
# JUNK: nicht-mode für einen fashion/lifestyle-shop
JUNK=re.compile(r'\blöffel\b|\bgabel\b|besteck|\bteller\b|kuchen vorlage|backform|schneebesen|sfr skates|\bskates\b|rollschuh|\bräder\b|inline.?skate|quad liner|methode de|lehrbuch|\bbuch\b|arbeitsheft|\bdvd\b|puzzle \d|chemise|dessous|negligee|reizwäsche|babydoll',re.I)
# Lizenz-Marken (Trademark, raus aus Werbe-Feeds min.)
LIC=re.compile(r'marvel|avengers|hello kitty|kuromi|disney|star wars|harry potter|barbie|pokemon|frozen|spider.?man|batman',re.I)
# Refurb-Suffix säubern
REFURB=re.compile(r'\s*[·\-–(]*\s*(restauriert|generalüberholt|generalueberholt|refurbished|note a|grade a|zustand a)\s*[a-z]?\s*[)\]]*\s*$',re.I)
cursor=None; junk=0; clean=0; lic=0; seen=0
AD=['301971014017','302032716161','302566834561','302872297857','302994456961']
while True:
    q='query($c:String){products(first:100,after:$c,query:"tag:bb-lieferbar-ch status:active"){pageInfo{hasNextPage endCursor} edges{node{id title}}}}'
    r=gql(q,{'c':cursor}); p=r.get('data',{}).get('products')
    if not p: break
    for e in p['edges']:
        seen+=1; t=e['node']['title']; gid=e['node']['id']
        if JUNK.search(t):
            junk+=1
            if DRY: print('[DRY][JUNK-DRAFT]',t[:50])
            else: gql('mutation($id:ID!){productUpdate(product:{id:$id,status:DRAFT}){userErrors{message}} }',{'id':gid}); gql('mutation($id:ID!){tagsAdd(id:$id,tags:["junk-qa-draft"]){userErrors{message}}}',{'id':gid})
            continue
        nt=REFURB.sub('',t).strip()
        if nt!=t and len(nt)>8:
            clean+=1
            if DRY: print('[DRY][TITEL]',t[:40],'→',nt[:40])
            else: gql('mutation($id:ID!,$t:String!){productUpdate(product:{id:$id,title:$t}){userErrors{message}}}',{'id':gid,'t':nt})
        if LIC.search(t):
            lic+=1
            if not DRY: gql('mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,input:$p){userErrors{message}}}',{'id':gid,'p':[{'publicationId':f'gid://shopify/Publication/{x}'} for x in AD]})
        if not DRY: time.sleep(0.15)
    if not p['pageInfo']['hasNextPage']: break
    cursor=p['pageInfo']['endCursor']
print(f"{'DRY ' if DRY else ''}geprüft={seen} | junk-draft={junk} | titel-gesäubert={clean} | lizenz-aus-ads={lic}")
