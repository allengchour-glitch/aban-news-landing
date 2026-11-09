#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
import argparse, json, re, sys
class LinkParser(HTMLParser):
 def __init__(self): super().__init__(); self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag=='a':
   h=dict(attrs).get('href')
   if h:self.links.append(h)
def fail(msg): raise AssertionError(msg)
def validate(root, variables_path):
 ev=json.loads((root/'evidence.json').read_text())
 va=json.loads(variables_path.read_text())
 if ev['writes_performed'] is not False: fail('Evidence must remain read-only')
 if ev['shop']['name']!='LuxeStyle' or ev['shop']['domain']!='luxestyle.ch' or ev['shop']['currencyCode']!='CHF' or ev['shop']['country']!='Switzerland': fail('Shop identity mismatch')
 if va.get('resourceId')!='gid://shopify/Page/698444710273': fail('Resource mismatch')
 ts=va.get('translations',[])
 expected={'title','body_html','meta_title','meta_description'}
 keys=[x.get('key') for x in ts]
 if len(ts)!=4 or set(keys)!=expected or len(keys)!=len(set(keys)): fail('Exactly four allowed translation keys required')
 if 'handle' in keys: fail('Handle translation forbidden')
 live=ev['page']['translatableContent']
 for x in ts:
  k=x['key']
  if x.get('locale')!='fr': fail(f'Wrong locale for {k}')
  if 'marketId' in x: fail(f'Market-specific write not allowed for {k}')
  if x.get('translatableContentDigest')!=live[k]['digest']: fail(f'Stale digest for {k}')
  if not isinstance(x.get('value'),str) or not x['value'].strip(): fail(f'Empty value for {k}')
 by={x['key']:x['value'] for x in ts}
 if len(by['meta_title'])>70: fail('Meta title too long')
 if len(by['meta_description'])>170: fail('Meta description too long')
 body=by['body_html']; p=LinkParser(); p.feed(body)
 if not p.links: fail('No internal links in body')
 for href in p.links:
  if not (href.startswith('/fr/') or href.startswith('https://luxestyle.ch/fr/')): fail(f'Non-French link: {href}')
 for forbidden in ['10–20','2–3','Swiss-made','Fabriqué en Suisse','livraison en 24','retour garanti','CHF 45','account.luxestyle.com.co']:
  if forbidden.lower() in body.lower() or forbidden.lower() in by['meta_description'].lower(): fail(f'Unapproved claim/value: {forbidden}')
 required=['CHF 50','Le délai de livraison prévu dépend','lorsqu’elle est disponible','conditions de retour']
 for phrase in required:
  if phrase not in body: fail(f'Missing bounded wording: {phrase}')
 if ev['public']['canonical']!=['https://luxestyle.ch/fr/pages/selbst-gestalten']: fail('Current canonical mismatch')
 exp={'x-default':'https://luxestyle.ch/pages/selbst-gestalten','de':'https://luxestyle.ch/pages/selbst-gestalten','fr':'https://luxestyle.ch/fr/pages/selbst-gestalten'}
 if ev['public']['hreflang']!=exp: fail('Current hreflang mismatch')
 mut=(root/'mutation.graphql').read_text()
 if 'translationsRegister' not in mut or 'pageUpdate' in mut or 'theme' in mut.lower(): fail('Mutation scope is not translation-only')
 return {'status':'PASS','resourceId':va['resourceId'],'keys':keys,'linkCount':len(p.links),'digests':'match_live','writesPerformed':False}
def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--root',default='/dev/shm/r156-fr'); ap.add_argument('--variables',default='variables.json'); a=ap.parse_args()
 root=Path(a.root); vp=Path(a.variables); vp=vp if vp.is_absolute() else root/vp
 try: print(json.dumps(validate(root,vp),ensure_ascii=False,indent=2))
 except Exception as e: print(json.dumps({'status':'FAIL','error':str(e)},ensure_ascii=False,indent=2)); sys.exit(1)
if __name__=='__main__': main()
