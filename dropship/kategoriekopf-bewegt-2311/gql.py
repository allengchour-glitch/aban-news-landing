import json,os,sys,urllib.request,time
D=os.path.dirname(os.path.abspath(__file__))
SHOP=os.environ['SHOPIFY_SHOP']
def gql(q,v=None,ver='2025-10'):
    tok=open(os.path.join(D,'.tok')).read().strip()
    req=urllib.request.Request(f'https://{SHOP}/admin/api/{ver}/graphql.json',data=json.dumps({'query':q,'variables':v or {}}).encode(),headers={'Content-Type':'application/json','X-Shopify-Access-Token':tok})
    for i in range(5):
        try:
            with urllib.request.urlopen(req,timeout=120) as r: d=json.load(r)
        except Exception as e:
            if i==4: raise
            time.sleep(3*(i+1)); continue
        if d.get('errors') and any('THROTTLED' in json.dumps(e) for e in d['errors']):
            time.sleep(4); continue
        return d
