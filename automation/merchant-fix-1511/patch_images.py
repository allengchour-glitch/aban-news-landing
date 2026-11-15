"""Korrigiert ausschliesslich imageLink in bestehenden API-Produkten; standardmässig Trockenlauf."""
import os,json,pathlib,re,base64
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request
out=pathlib.Path('merchant-image-patch');out.mkdir(exist_ok=True);plan=json.load(open('dropship/merchant-fix-1511/audit/image-patch-plan.json'));limit=int(os.environ.get('LIMIT','1'));live=os.environ.get('LIVE')=='1';c=service_account.Credentials.from_service_account_info(json.loads(os.environ['GCP_SA_KEY']),scopes=['https://www.googleapis.com/auth/content']);c.refresh(Request());h={'Authorization':'Bearer '+c.token};r=requests.get('https://merchantapi.googleapis.com/accounts/v1/accounts?pageSize=50',headers=h,timeout=30);r.raise_for_status();acc=r.json()['accounts'];assert len(acc)==1;account=acc[0]['name'];r=requests.get(f'https://merchantapi.googleapis.com/datasources/v1/{account}/dataSources?pageSize=100',headers=h,timeout=30);r.raise_for_status();sources={d['name']:d for d in r.json()['dataSources']}
shop=os.environ.get('SHOPIFY_SHOP','au3j0y-hq.myshopify.com').removeprefix('https://').rstrip('/');sec=os.environ['SHOPIFY_CLIENT_SECRET'].strip();m=re.match(r'^shpss_[0-9a-f]{32}',sec);sec=m.group() if m else sec;r=requests.post(f'https://{shop}/admin/oauth/access_token',json={'client_id':os.environ['SHOPIFY_CLIENT_ID'],'client_secret':sec,'grant_type':'client_credentials'},timeout=30);r.raise_for_status();sh={'X-Shopify-Access-Token':r.json()['access_token']};results=[]
def save():(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=1))
for item in plan[:limit]:
 pid=item['report_id'];parts=pid.split('~');pid='~'.join(parts[1:]) if len(parts)==4 else pid;encoded=base64.urlsafe_b64encode(pid.encode()).decode().rstrip('=');url=f'https://merchantapi.googleapis.com/products/v1/{account}/products/{encoded}';r=requests.get(url,headers=h,timeout=30);r.raise_for_status();before=r.json();att=before.get('productAttributes',{});source=before.get('dataSource');ds=sources.get(source,{})
 if ds.get('input')!='API' or ds.get('displayName')!='Shopify App API':raise RuntimeError('Nicht die erwartete API-Datenquelle; Stopp')
 if att.get('imageLink')==item['new_image']:results.append({**item,'state':'bereits aktuell'});save();continue
 if att.get('imageLink')!=item['old_image']:raise RuntimeError('Google-Bild zwischenzeitlich verändert; Stopp')
 r=requests.post(f'https://{shop}/admin/api/2026-10/graphql.json',headers=sh,json={'query':'query($id:ID!){productVariant(id:$id){id product{handle status} image{url width height}}}','variables':{'id':item['variant_id']}},timeout=30);r.raise_for_status();j=r.json()
 if j.get('errors'):raise RuntimeError('Shopify-Lesefehler')
 v=j['data']['productVariant'];im=v.get('image') or {}
 if v['product']['handle']!=item['handle'] or v['product']['status']!='ACTIVE' or im.get('url')!=item['new_image'] or im.get('width',0)<500 or im.get('height',0)<500:raise RuntimeError('Shopify-Quelle stimmt nicht mehr überein')
 head=requests.head(item['new_image'],timeout=25);head.raise_for_status()
 if not head.headers.get('content-type','').startswith('image/'):raise RuntimeError('Neue Quelle ist kein Bild')
 entry={**item,'state':'Trockenlauf bestätigt'};results.append(entry);save();print('GEPRÜFT: Bildquelle unverändert, mindestens 500px; Angebot',item['offer_id'],flush=True)
 if not live:continue
 # Only one populated attribute: the API's documented implied field mask is imageLink only.
 backup={k:val for k,val in before.items() if k not in ['name','dataSource','productStatus','base64EncodedName','base64EncodedProduct']};(out/(str(len(results))+'-before.json')).write_text(json.dumps(backup,ensure_ascii=False,indent=1));entry['state']='Anfrage vorbereitet';save()
 r=requests.patch(f'https://merchantapi.googleapis.com/products/v1/{account}/productInputs/{encoded}',params={'dataSource':source},headers=h,json={'productAttributes':{'imageLink':item['new_image']}},timeout=45);entry['http']=r.status_code
 if not r.ok:entry['state']='abgelehnt';entry['error']=r.json().get('error',{}).get('status');save();print('ABBRUCH HTTP',r.status_code,entry['error']);break
 ack=r.json();entry['ack_image']=(ack.get('productAttributes') or {}).get('imageLink');entry['state']='Bild angenommen' if entry['ack_image']==item['new_image'] else 'Antwort nicht eindeutig';save()
 if entry['state']!='Bild angenommen':break
print('ERGEBNIS:',len(results),'geprüft; live',live,flush=True)
