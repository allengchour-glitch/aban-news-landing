"""Gezielte, nur lesende Diagnose der aktuellen Google-Problemangebote und Shopify-Quellen."""
import os,json,pathlib,re,time,concurrent.futures
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request
OUT=pathlib.Path('merchant-image-audit');OUT.mkdir(exist_ok=True)
target=json.load(open('dropship/merchant-fix-1511/audit/targets.json'));allrows=target['image']+target['other'];offers=sorted({r['offer_id'] for r in allrows});imageoffers={r['offer_id'] for r in target['image']}
cred=service_account.Credentials.from_service_account_info(json.loads(os.environ['GCP_SA_KEY']),scopes=['https://www.googleapis.com/auth/content']);cred.refresh(Request());gh={'Authorization':'Bearer '+cred.token}
def get(url,headers):
 r=requests.get(url,headers=headers,timeout=45);r.raise_for_status();return r.json()
a=get('https://merchantapi.googleapis.com/accounts/v1/accounts?pageSize=50',gh).get('accounts',[])
if len(a)!=1:raise RuntimeError('Nicht genau ein Merchant-Konto sichtbar')
account=a[0]['name'];sources=get(f'https://merchantapi.googleapis.com/datasources/v1/{account}/dataSources?pageSize=100',gh);source_names={d['name']:d.get('displayName') for d in sources.get('dataSources',[])}
reports=[]
for i in range(0,len(offers),70):
 part=offers[i:i+70];values=','.join("'"+s.replace("'","\\'")+"'" for s in part);token=None
 while True:
  body={'query':f'SELECT id, offer_id, title, price, availability, feed_label, language_code, item_issues FROM product_view WHERE offer_id IN ({values})','pageSize':1000}
  if token:body['pageToken']=token
  r=requests.post(f'https://merchantapi.googleapis.com/reports/v1/{account}/reports:search',headers=gh,json=body,timeout=90);r.raise_for_status();j=r.json();reports.extend(j.get('results',[]));token=j.get('nextPageToken')
  if not token:break
 print('Google-Angebote gelesen:',min(i+70,len(offers)),flush=True)
(OUT/'reports.json').write_text(json.dumps(reports,ensure_ascii=False,indent=1))
def detail(row):
 pv=row.get('productView',{});rid=pv.get('id','');parts=rid.split('~');name='~'.join(parts[1:]) if len(parts)==4 else rid
 try:
  r=requests.get(f'https://merchantapi.googleapis.com/products/v1/{account}/products/{name}',headers=gh,timeout=45)
  if r.status_code!=200:return {'report_id':rid,'offer_id':pv.get('offerId'),'http':r.status_code}
  p=r.json();att=p.get('productAttributes') or p.get('attributes') or {};status=p.get('productStatus') or {};src=p.get('dataSource','')
  return {'report_id':rid,'offer_id':p.get('offerId',pv.get('offerId')),'data_source':source_names.get(src,src.rsplit('/',1)[-1]),'source_kind':'AUTOFEED' if source_names.get(src)=='luxestyle.ch' else 'API_OR_OTHER','attributes':att,'status':status,'version':p.get('versionNumber')}
 except requests.RequestException as e:return {'report_id':rid,'offer_id':pv.get('offerId'),'error':type(e).__name__}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:details=list(pool.map(detail,reports))
# Remove account resource names from all fields before writing the private diagnostic artifact.
safe=json.loads(json.dumps(details).replace(account,'accounts/<redacted>'));(OUT/'google-products.json').write_text(json.dumps(safe,ensure_ascii=False,indent=1));print('Google-Produktdetails:',len(details),flush=True)
shop=os.environ.get('SHOPIFY_SHOP','au3j0y-hq.myshopify.com').removeprefix('https://').rstrip('/');sec=os.environ['SHOPIFY_CLIENT_SECRET'].strip();m=re.match(r'^shpss_[0-9a-f]{32}',sec);sec=m.group() if m else sec
r=requests.post(f'https://{shop}/admin/oauth/access_token',json={'client_id':os.environ['SHOPIFY_CLIENT_ID'],'client_secret':sec,'grant_type':'client_credentials'},timeout=30);r.raise_for_status();sh={'X-Shopify-Access-Token':r.json()['access_token']}
def gql(query,variables):
 r=requests.post(f'https://{shop}/admin/api/2026-10/graphql.json',headers=sh,json={'query':query,'variables':variables},timeout=45);r.raise_for_status();j=r.json()
 if j.get('errors'):raise RuntimeError('GraphQL: '+str([e.get('message') for e in j['errors']]))
 cost=j.get('extensions',{}).get('cost',{});ts=cost.get('throttleStatus',{});needed=cost.get('requestedQueryCost',0)-ts.get('currentlyAvailable',0)
 if needed>0 and ts.get('restoreRate',0)>0:time.sleep(min(10,needed/ts['restoreRate']))
 return j['data']
pids=set();vids=set()
for row in allrows:
 off=row['offer_id'];m=re.match(r'shopify_[A-Z]+_(\d+)_(\d+)$',off)
 if m:pids.add(m[1]);vids.add(m[2])
 else:
  m=re.match(r'(\d{13,15})_',off)
  if m:pids.add(m[1])
# Add Shopify IDs discoverable from Google landing-page URLs (pure numeric autofeed offer IDs).
for d in details:
 for u in [d.get('attributes',{}).get('link','')]:
  m=re.search(r'[?&]variant=(\d+)',u)
  if m:vids.add(m[1])
products=[];ids=sorted(pids)
for i in range(0,len(ids),4):
 d=gql('query($ids:[ID!]!){nodes(ids:$ids){...on Product{id handle title status updatedAt descriptionHtml tags productType featuredMedia{id ...on MediaImage{image{url width height}}} media(first:40){pageInfo{hasNextPage} nodes{id alt mediaContentType ...on MediaImage{image{url width height}}}}}}}',{'ids':['gid://shopify/Product/'+x for x in ids[i:i+4]]});products.extend(d['nodes'])
 if i%40==0:print('Shopify-Produkte gelesen:',min(i+4,len(ids)),flush=True)
(OUT/'shopify-products.json').write_text(json.dumps(products,ensure_ascii=False,indent=1))
variants=[];ids=sorted(vids)
for i in range(0,len(ids),50):
 d=gql('query($ids:[ID!]!){nodes(ids:$ids){...on ProductVariant{id title sku price selectedOptions{name value} product{id handle status} image{url width height} media(first:3){nodes{id ...on MediaImage{image{url width height}}}}}}}',{'ids':['gid://shopify/ProductVariant/'+x for x in ids[i:i+50]]});variants.extend(d['nodes'])
(OUT/'shopify-variants.json').write_text(json.dumps(variants,ensure_ascii=False,indent=1));print('ERGEBNIS: nur gelesen; keine Änderung. Produkte',len(products),'Varianten',len(variants),flush=True)
