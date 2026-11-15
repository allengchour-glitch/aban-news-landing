"""Entfernt ausschliesslich veraltete DE-Angebote des Autofeeds; keine Shop-Produkte."""
import os,json,pathlib,base64
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request
out=pathlib.Path('merchant-de-cleanup');out.mkdir(exist_ok=True);plan=json.load(open('dropship/merchant-fix-1511/audit/de-offers.json'));limit=int(os.environ.get('LIMIT','1'));live=os.environ.get('LIVE')=='1';c=service_account.Credentials.from_service_account_info(json.loads(os.environ['GCP_SA_KEY']),scopes=['https://www.googleapis.com/auth/content']);c.refresh(Request());h={'Authorization':'Bearer '+c.token};r=requests.get('https://merchantapi.googleapis.com/accounts/v1/accounts?pageSize=50',headers=h,timeout=30);r.raise_for_status();a=r.json()['accounts'];assert len(a)==1;account=a[0]['name'];r=requests.get(f'https://merchantapi.googleapis.com/datasources/v1/{account}/dataSources?pageSize=100',headers=h,timeout=30);r.raise_for_status();sources={s['name']:s for s in r.json()['dataSources']};results=[]
for item in plan[:limit]:
 parts=item['report_id'].split('~');parts=parts[1:] if len(parts)==4 else parts
 if len(parts)!=3 or parts[1]!='DE' or parts[2]!=item['offer_id']:raise RuntimeError('Nicht das erwartete DE-Angebot')
 pid='~'.join(parts);enc=base64.urlsafe_b64encode(pid.encode()).decode().rstrip('=');url=f'https://merchantapi.googleapis.com/products/v1/{account}/products/{enc}';r=requests.get(url,headers=h,timeout=30)
 if r.status_code==404:results.append({**item,'state':'bereits entfernt'});continue
 r.raise_for_status();before=r.json();source=before['dataSource'];ds=sources[source];countries=(ds.get('primaryProductDataSource') or {}).get('countries',[])
 if ds.get('input')!='AUTOFEED' or ds.get('displayName')!='luxestyle.ch' or 'DE' in countries:raise RuntimeError('Nicht der erwartete alte Autofeed-DE-Eintrag')
 listed={co for d in (before.get('productStatus') or {}).get('destinationStatuses',[]) for k in ['approvedCountries','pendingCountries','disapprovedCountries'] for co in d.get(k,[])}
 if listed-{'DE'}:raise RuntimeError('Angebot betrifft weitere Länder; nicht löschen')
 entry={**item,'state':'Trockenlauf bestätigt','source_countries':countries};results.append(entry)
 (out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=1));print('GEPRÜFT: veraltetes reines DE-Angebot',item['offer_id'],flush=True)
 if not live:continue
 safe=json.loads(json.dumps(before).replace(account,'accounts/<redacted>'));(out/(str(len(results))+'-before.json')).write_text(json.dumps(safe,ensure_ascii=False,indent=1))
 r=requests.delete(f'https://merchantapi.googleapis.com/products/v1/{account}/productInputs/{enc}',headers=h,params={'dataSource':source},timeout=45);entry['http']=r.status_code;entry['state']='Entfernung angenommen' if r.status_code in [200,204] else 'Entfernung abgelehnt'
 if not r.ok:entry['reason']=r.json().get('error',{}).get('status');entry['message']=r.json().get('error',{}).get('message','').replace(account,'<konto>')
 (out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=1))
 if not r.ok:break
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=1));print('ERGEBNIS:',len(results),'Angebote geprüft, live',live)
