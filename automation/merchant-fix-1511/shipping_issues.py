"""Liest konkrete Versandfehler und ihre betroffenen Länder; verändert nichts."""
import os,json,pathlib,time,collections
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request
out=pathlib.Path('merchant-shipping-issues');out.mkdir(exist_ok=True);c=service_account.Credentials.from_service_account_info(json.loads(os.environ['GCP_SA_KEY']),scopes=['https://www.googleapis.com/auth/content']);c.refresh(Request());h={'Authorization':'Bearer '+c.token};r=requests.get('https://merchantapi.googleapis.com/accounts/v1/accounts?pageSize=50',headers=h,timeout=30);r.raise_for_status();a=r.json()['accounts'];assert len(a)==1;account=a[0]['name'];token=None;found=[];pages=0
while True:
 b={'query':'SELECT id, offer_id, title, item_issues FROM product_view','pageSize':1000}
 if token:b['pageToken']=token
 r=requests.post(f'https://merchantapi.googleapis.com/reports/v1/{account}/reports:search',headers=h,json=b,timeout=120);r.raise_for_status();j=r.json();pages+=1
 for z in j.get('results',[]):
  pv=z.get('productView',{});issues=[i for i in pv.get('itemIssues',[]) if (i.get('type') or {}).get('code')=='missing_shipping_no_shipping_service_defined_for_country']
  if issues:found.append({'report_id':pv.get('id'),'offer_id':pv.get('offerId'),'title':pv.get('title'),'issues':issues})
 if pages%30==0:print('Seiten',pages,'Versandfehler-Angebote',len(found),flush=True)
 token=j.get('nextPageToken')
 if not token:break
(out/'shipping-issues.json').write_text(json.dumps(found,ensure_ascii=False,indent=1));details=[]
for z in found[:25]:
 rid=z['report_id'];parts=rid.split('~');pid='~'.join(parts[1:]) if len(parts)==4 else rid;r=requests.get(f'https://merchantapi.googleapis.com/products/v1/{account}/products/{pid}',headers=h,timeout=30)
 if r.ok:
  p=r.json();details.append({'report_id':rid,'offer_id':z['offer_id'],'data_source_id':p.get('dataSource','').rsplit('/',1)[-1],'attributes':p.get('productAttributes',p.get('attributes',{})),'status':p.get('productStatus')})
(out/'shipping-samples.json').write_text(json.dumps(details,ensure_ascii=False,indent=1));print('ERGEBNIS: Versandfehler-Angebote',len(found),'Seiten',pages,'nur gelesen')
