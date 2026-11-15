"""Frisches Rücklesen der Bildkorrekturen und relevanter automatischer Einstellungen, nur lesen."""
import os,json,pathlib,base64,collections
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request
out=pathlib.Path('merchant-final-verification');out.mkdir(exist_ok=True);c=service_account.Credentials.from_service_account_info(json.loads(os.environ['GCP_SA_KEY']),scopes=['https://www.googleapis.com/auth/content']);c.refresh(Request());h={'Authorization':'Bearer '+c.token};r=requests.get('https://merchantapi.googleapis.com/accounts/v1/accounts?pageSize=50',headers=h,timeout=30);r.raise_for_status();a=r.json()['accounts'];assert len(a)==1;account=a[0]['name'];results=[]
for x in json.load(open('dropship/merchant-fix-1511/audit/image-verify-plan.json')):
 parts=x['report_id'].split('~');pid='~'.join(parts[1:]) if len(parts)==4 else x['report_id'];enc=base64.urlsafe_b64encode(pid.encode()).decode().rstrip('=');r=requests.get(f'https://merchantapi.googleapis.com/products/v1/{account}/products/{enc}',headers=h,timeout=30)
 if not r.ok:results.append({'report_id':x['report_id'],'http':r.status_code});continue
 p=r.json();att=p.get('productAttributes',{});diff=[k for k,v in x['unchanged_attributes'].items() if att.get(k)!=v];codes=sorted({i.get('code') for i in p.get('productStatus',{}).get('itemLevelIssues',[])})
 results.append({'report_id':x['report_id'],'offer_id':x['offer_id'],'image_confirmed':att.get('imageLink')==x['new_image'],'changed_other_fields':diff,'current_image':att.get('imageLink'),'codes':codes})
(out/'image-readback.json').write_text(json.dumps(results,ensure_ascii=False,indent=1));print('Bilder zurückgelesen:',len(results),'bestätigt',sum(x.get('image_confirmed',False) for x in results),'abweichende andere Felder',sum(bool(x.get('changed_other_fields')) for x in results))
settings={}
for key in ['automaticImprovements','autofeedSettings']:
 r=requests.get(f'https://merchantapi.googleapis.com/accounts/v1/{account}/{key}',headers=h,timeout=30);settings[key]={'http':r.status_code,'data':json.loads(r.text.replace(account,'accounts/<redacted>'))};print('Einstellung',key,'HTTP',r.status_code)
(out/'automatic-settings.json').write_text(json.dumps(settings,ensure_ascii=False,indent=1));print('ERGEBNIS: nur gelesen')
