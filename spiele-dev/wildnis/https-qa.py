from pathlib import Path
from html.parser import HTMLParser
import subprocess,json,hashlib,re,os,tempfile
root=Path(__file__).resolve().parents[2]
out=Path(os.environ.get('NW_LIVE_OUT','/tmp/wildnis-live'));out.mkdir(parents=True,exist_ok=True)
class Scripts(HTMLParser):
 def __init__(self):super().__init__();self.active=False;self.parts=[];self.buf=[];self.external=[];self.styles=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='link' and a.get('rel')=='stylesheet':self.styles.append(a.get('href'))
  if tag!='script':return
  if a.get('src'):self.external.append({'src':a['src'],'defer':'defer' in a,'async':'async' in a})
  self.active=not a.get('src') and a.get('type','') not in ('application/ld+json','application/json','importmap');self.buf=[]
 def handle_data(self,data):
  if self.active:self.buf.append(data)
 def handle_endtag(self,tag):
  if tag=='script' and self.active:self.parts.append(''.join(self.buf));self.active=False
source=(root/'neon-wildnis.html').read_text()
# Genau den vorhandenen Seitenbauer verwenden: er ergänzt auch Bildliterale im JS.
# Keine Attribute aus der Produktionsantwort entfernen oder Spielcode normalisieren.
builder=root/'automation/inject-engine.mjs'
with tempfile.TemporaryDirectory(prefix='wildnis-build-',dir='/tmp') as tmp:
 built=Path(tmp)/'neon-wildnis.html';built.write_text(source)
 subprocess.run(['node',str(builder),tmp],check=True,capture_output=True,text=True)
 expected_html=built.read_text()
a=Scripts();a.feed(expected_html)
def same_scripts(html):
 b=Scripts();b.feed(html)
 return bool(a.parts) and a.parts==b.parts and a.external==b.external and a.styles==b.styles
# Positiv- und echte Gegenproben vor dem ersten Netzabruf.
assert same_scripts(expected_html)
assert not same_scripts(source), 'Rohe Quelle darf die tatsächliche Build-Änderung nicht übergehen'
assert 'var MAP=800' in expected_html
assert not same_scripts(expected_html.replace('var MAP=800','var MAP=801',1)), 'Geänderter Spielwert muss auffallen'
assert not same_scripts(expected_html.replace('</body>','<script>window.__unerwartet=true;</script></body>',1)), 'Zusätzliches Script muss auffallen'
controls={'expectedBuild':True,'rawSourceRejected':True,'changedGameValueRejected':True,'extraScriptRejected':True}

assets=['css/wildnis.css','js/wildnis/visuals.js','js/wildnis/static-instances.js','js/lebenspfad/instance-chunks.js']
paths=[('neon-wildnis.html','neon-wildnis'),('neon-wildnis.html','neon-wildnis.html')]
for f in assets:
 paths.append((f,f))
 version=re.search(re.escape('/'+f)+r'\?v=([a-f0-9]+)',source).group(1)
 assert hashlib.sha256((root/f).read_bytes()).hexdigest().startswith(version)
 paths.append((f,f+'?v='+version))
checks=[]
for path,uri in paths:
 name=uri.replace('/','__');target=out/name;header=out/(name+'.headers')
 url='https://abannews.com/'+uri+('' if '?' in uri else '?release='+os.environ['RELEASE_COMMIT'][:12])
 r=subprocess.run(['curl','--location','--silent','--show-error','--max-time','40','--dump-header',str(header),'--output',str(target),'--write-out','%{http_code}',url],capture_output=True,text=True)
 item={'path':path,'uri':uri,'http':r.stdout,'ok':r.returncode==0 and r.stdout=='200'}
 if item['ok']:
  live=target.read_bytes();local=(root/path).read_bytes();h=header.read_text();blocks=list(re.finditer(r'^HTTP/\S+ \d{3}[^\n]*\n',h,re.M));h=h[blocks[-1].start():] if blocks else h
  if path.endswith('.html'):
   b=Scripts();b.feed(live.decode());item['inlineScriptsPreserved']=bool(a.parts) and a.parts==b.parts;item['scriptOrderPreserved']=a.external==b.external;item['stylesPreserved']=a.styles==b.styles
   # Die vorhandene genaue Wildnis-Regel erlaubt Modell-Blobs und Vermittler,
   # behält aber frame-ancestors 'none' / DENY für das eigenständige Spiel.
   block=(root/'_headers').read_text().split('\n/'+uri+'\n',1)[1].split('\n\n',1)[0]
   expected=next(line.strip().partition(':')[2].strip() for line in block.splitlines() if line.strip().startswith('Content-Security-Policy:'))
   csp=re.findall(r'^content-security-policy:\s*(.*)$',h,re.M|re.I);item['securityPolicyPreserved']=len(csp)==1 and csp[0].strip()==expected and bool(re.search(r'^x-frame-options:\s*DENY\s*$',h,re.M|re.I))
   item['ok'] &= item['inlineScriptsPreserved'] and item['scriptOrderPreserved'] and item['stylesPreserved'] and item['securityPolicyPreserved']
  else:
   item['sha256']=hashlib.sha256(live).hexdigest();item['byteIdentical']=live==local
   item['mimeCorrect']=bool(re.search(r'^content-type:.*'+('javascript' if path.endswith('.js') else 'text/css'),h,re.M|re.I))
   item['ok'] &= item['byteIdentical'] and item['mimeCorrect']
 else:item['error']=r.stderr
 checks.append(item);print(json.dumps(item),flush=True)
 if r.stdout=='429':break
report={'domain':'https://abannews.com','sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'releaseCommit':os.environ['RELEASE_COMMIT'],'builderSha256':hashlib.sha256(builder.read_bytes()).hexdigest(),'controls':controls,'checks':checks,'passed':len(checks)==len(paths) and all(c['ok'] for c in checks),'limits':'HTTPS mit normaler TLS-Prüfung; exakte Skripte des tatsächlichen Seitenbaus/Header/Asset-MIME, kein öffentlicher Browser-/NAT-Koop-Test'}
(out/'production.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
raise SystemExit(0 if report['passed'] else 1)
