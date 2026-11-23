import json,os,urllib.request
def gql(q,v=None):
    tok=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'.tok')).read().strip()
    r=urllib.request.Request(f"https://{os.environ['SHOPIFY_SHOP']}/admin/api/2025-10/graphql.json",data=json.dumps({'query':q,'variables':v or {}}).encode(),headers={'Content-Type':'application/json','X-Shopify-Access-Token':tok})
    d=json.load(urllib.request.urlopen(r))
    if d.get('errors'): raise SystemExit(json.dumps(d['errors'])[:800])
    return d['data']
