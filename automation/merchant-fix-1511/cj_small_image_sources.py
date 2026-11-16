"""Einmal anmelden, zwei konkret gebundene Lieferantenartikel lesen; keine Bestellungen/Änderungen."""
import os,json,pathlib,time
import requests
root=pathlib.Path('cj-small-image-sources');root.mkdir(exist_ok=True);key=os.environ['CJ_API_KEY'];base='https://developers.cjdropshipping.com/api2.0/v1';r=requests.post(base+'/authentication/getAccessToken',json={'apiKey':key},timeout=25);r.raise_for_status();j=r.json()
if not j.get('result') or j.get('code')!=200:raise RuntimeError('CJ-Anmeldung nicht verfügbar; keine Wiederholung')
token=j['data']['accessToken'];results=[]
for sku in ['CJMY277251301AZ','CJYE239366606FU']:
 time.sleep(1.2);r=requests.get(base+'/product/query',params={'variantSku':sku},headers={'CJ-Access-Token':token},timeout=30);r.raise_for_status();j=r.json()
 if not j.get('result') or j.get('code')!=200:results.append({'sku':sku,'available':False,'code':j.get('code')});continue
 d=j['data'];vs=d.get('variants',[])
 if sum(v.get('variantSku')==sku for v in vs)!=1:raise RuntimeError('Lieferantenvariante nicht eindeutig gebunden')
 data={'sku':sku,'pid':d.get('pid'),'productSku':d.get('productSku'),'name':d.get('productNameEn'),'description':d.get('description'),'bigImage':d.get('bigImage'),'productImageSet':d.get('productImageSet'),'variants':[{'sku':v.get('variantSku'),'key':v.get('variantKey'),'image':v.get('variantImage')} for v in vs]};s=json.dumps(data,ensure_ascii=False)
 if key in s or token in s:raise RuntimeError('Sensible Daten nicht speichern')
 (root/(sku+'.json')).write_text(s);results.append({'sku':sku,'available':True,'variants':len(vs)});print('Gebundener Lieferantenartikel gelesen:',sku,'Varianten',len(vs),flush=True)
(root/'results.json').write_text(json.dumps(results,indent=2));print('ERGEBNIS: zwei Quellen geprüft, keine Änderungen')
