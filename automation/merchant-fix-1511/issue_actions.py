"""Liest Googles Lösungswege; löst keine Überprüfung, Berufung oder sonstige Aktion aus."""
import os,json,pathlib,urllib.parse
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request
out=pathlib.Path('merchant-issue-actions');out.mkdir(exist_ok=True);c=service_account.Credentials.from_service_account_info(json.loads(os.environ['GCP_SA_KEY']),scopes=['https://www.googleapis.com/auth/content']);c.refresh(Request());h={'Authorization':'Bearer '+c.token};r=requests.get('https://merchantapi.googleapis.com/accounts/v1/accounts?pageSize=50',headers=h,timeout=30);r.raise_for_status();a=r.json()['accounts'];assert len(a)==1;account=a[0]['name'];data=json.load(open('dropship/merchant-fix-1511/audit/targets.json'));samples={}
for row in data['image']+data['other']:samples.setdefault(row['code'],row['offer_id'])
values=','.join("'"+x+"'" for x in set(samples.values()));r=requests.post(f'https://merchantapi.googleapis.com/reports/v1/{account}/reports:search',headers=h,json={'query':f'SELECT id, offer_id FROM product_view WHERE offer_id IN ({values})','pageSize':1000},timeout=60);r.raise_for_status();records=r.json().get('results',[]);by_offer={}
for x in records:by_offer.setdefault(x['productView']['offerId'],x['productView']['id'])
params={'languageCode':'de-CH','timeZone':'Europe/Zurich'};body={'userInputActionOption':'REDIRECT_TO_MERCHANT_CENTER'};results=[]
r=requests.post(f'https://merchantapi.googleapis.com/issueresolution/v1/{account}:renderaccountissues',headers=h,params=params,json=body,timeout=45);results.append({'kind':'account','http':r.status_code,'data':r.json()});print('Kontoweite Lösungswege HTTP',r.status_code,flush=True)
for code,offer in samples.items():
 rid=by_offer.get(offer)
 if not rid:results.append({'code':code,'offer':offer,'missing':True});continue
 parts=rid.split('~');pid='~'.join(parts[1:]) if len(parts)==4 else rid
 r=requests.post(f'https://merchantapi.googleapis.com/issueresolution/v1/{account}/products/{pid}:renderproductissues',headers=h,params=params,json=body,timeout=45);j=r.json();results.append({'code':code,'offer':offer,'http':r.status_code,'data':j});print(code,'HTTP',r.status_code,'Hinweise',len(j.get('renderedIssues',[])),flush=True)
(out/'issue-actions.json').write_text(json.dumps(results,ensure_ascii=False,indent=1));print('ERGEBNIS: nur gelesen; keine Aktion beantragt')
