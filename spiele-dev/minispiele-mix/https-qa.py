"""Öffentliche Spielquellen mit dem tatsächlichen lokalen Seitenbau vergleichen."""
from pathlib import Path
from html.parser import HTMLParser
import fnmatch, hashlib, json, os, re, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get('MIX_LIVE_OUT', '/tmp/mix-live'))
PAGES = ['spiele.html'] + sorted(str(p.relative_to(ROOT)) for p in (ROOT/'minispiele').glob('*.html'))
ASSETS = sorted(str(p.relative_to(ROOT)) for p in (ROOT/'js/minispiele-mix').glob('*.js')) + ['css/minispiele-mix.css']

class Code(HTMLParser):
    def __init__(self):
        super().__init__(); self.mode=None; self.buf=[]; self.scripts=[]
        self.external=[]; self.styles=[]; self.css=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='link' and a.get('rel')=='stylesheet': self.styles.append(a.get('href'))
        if tag=='style': self.mode='style'; self.buf=[]
        if tag=='script':
            if a.get('src'):
                self.external.append({'src':a['src'],'async':'async' in a,'defer':'defer' in a,'type':a.get('type','')})
            self.mode='script' if not a.get('src') and a.get('type','') not in ('application/json','application/ld+json','importmap') else None
            self.buf=[]
    def handle_data(self, data):
        if self.mode: self.buf.append(data)
    def handle_endtag(self, tag):
        if tag=='script' and self.mode=='script': self.scripts.append(''.join(self.buf)); self.mode=None
        if tag=='style' and self.mode=='style': self.css.append(''.join(self.buf)); self.mode=None

def code(html):
    c=Code(); c.feed(html); return c

def identical(a,b):
    return bool(a.scripts or a.external) and a.scripts==b.scripts and a.external==b.external and a.styles==b.styles and a.css==b.css

def expected_headers(uri):
    rules=[]; current=None
    for line in (ROOT/'_headers').read_text().splitlines():
        if not line.strip() or line.strip().startswith('#'): continue
        if not line[0].isspace(): current=[line.strip(),[]]; rules.append(current)
        elif current is not None: current[1].append(line.strip())
    result={}
    for pattern, lines in rules:
        if not fnmatch.fnmatchcase('/'+uri,pattern): continue
        for line in lines:
            if line.startswith('! '): result.pop(line[2:].lower(),None)
            elif ':' in line:
                k,v=line.split(':',1); result[k.lower()]=v.strip()
    return result

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    release=os.environ['RELEASE_COMMIT']; checks=[]; controls={}
    builder=ROOT/'automation/inject-engine.mjs'
    with tempfile.TemporaryDirectory(prefix='arcade-build-',dir='/tmp') as tmp:
        for f in PAGES:
            p=Path(tmp)/f; p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes((ROOT/f).read_bytes())
        subprocess.run(['node',str(builder),tmp],check=True,capture_output=True,text=True)
        built={f:code((Path(tmp)/f).read_text()) for f in PAGES}
        controls['allBuiltPagesHaveScripts']=all(bool(c.scripts or c.external) for c in built.values())
        # Produktionscode wird nicht normalisiert: echte Spieländerung/Zusatzskript müssen scheitern.
        h=(Path(tmp)/'minispiele/drei-gewinnt.html').read_text()
        assert 'MiniMix.finish(' in h
        controls['changedGameValueRejected']=not identical(built['minispiele/drei-gewinnt.html'],code(h.replace('MiniMix.finish(', 'MiniMix.finish(2||',1)))
        controls['extraScriptRejected']=not identical(built['minispiele/drei-gewinnt.html'],code(h.replace('</body>','<script>window.__extra=true;</script></body>',1)))
        index=(Path(tmp)/'minispiele/index.html').read_text()
        controls['missingMixLoaderRejected']=not identical(built['minispiele/index.html'],code(re.sub(r'<script src="/js/minispiele-mix/app[^>]+></script>','',index)))
        assert all(controls.values()),controls
        paths=[(f,f) for f in PAGES] + [('spiele.html','spiele'), ('minispiele/index.html','minispiele/')]
        all_html='\n'.join((ROOT/f).read_text() for f in PAGES)
        for f in ASSETS:
            version=re.search(re.escape('/'+f)+r'\?v=([a-f0-9]+)',all_html)
            assert version, 'Inhaltsversion fehlt: '+f
            digest=hashlib.sha256((ROOT/f).read_bytes()).hexdigest()
            assert digest.startswith(version[1]),f
            paths += [(f,f),(f,f+'?v='+version[1])]
        if os.environ.get('MIX_PREFLIGHT')=='1':
            print(json.dumps({'controls':controls,'plannedRequests':len(paths),'assets':len(ASSETS)})); return 0
        for f,uri in paths:
            name=uri.replace('/','__'); target=OUT/name; head=OUT/(name+'.headers')
            url='https://abannews.com/'+uri+('' if '?' in uri else '?release='+release[:12])
            r=subprocess.run(['curl','--location','--silent','--show-error','--max-time','40',
                              '--dump-header',str(head),'--output',str(target),'--write-out','%{http_code}',url],capture_output=True,text=True)
            item={'file':f,'uri':uri,'http':r.stdout,'ok':r.returncode==0 and r.stdout=='200'}
            if item['ok']:
                raw=target.read_bytes(); headers=head.read_text(); blocks=list(re.finditer(r'^HTTP/\S+ \d{3}[^\n]*\n',headers,re.M))
                if blocks: headers=headers[blocks[-1].start():]
                if f.endswith('.html'):
                    actual=code(raw.decode()); expected=built[f]
                    item['scriptsExact']=expected.scripts==actual.scripts
                    item['externalOrderExact']=expected.external==actual.external
                    item['stylesExact']=expected.styles==actual.styles and expected.css==actual.css
                    route=uri.partition('?')[0]; want=expected_headers(route)
                    security={}
                    for key in ['content-security-policy','x-frame-options']:
                        values=re.findall('^'+re.escape(key)+r':\s*(.*)$',headers,re.I|re.M)
                        security[key]=len(values)==1 and values[0].strip()==want[key]
                    item['securityExact']=all(security.values());item['ok'] &= identical(expected,actual) and item['securityExact']
                else:
                    item['sha256']=hashlib.sha256(raw).hexdigest();item['bytesExact']=raw==(ROOT/f).read_bytes()
                    item['mimeCorrect']=bool(re.search(r'^content-type:.*'+('javascript' if f.endswith('.js') else 'text/css'),headers,re.I|re.M))
                    item['ok'] &= item['bytesExact'] and item['mimeCorrect']
            else: item['error']=r.stderr
            checks.append(item); print(json.dumps(item,ensure_ascii=False),flush=True)
            if r.stdout=='429': break
    report={'releaseCommit':release,'sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
            'builderSha256':hashlib.sha256(builder.read_bytes()).hexdigest(),'controls':controls,'checks':checks,
            'passed':len(checks)==len(paths) and all(c['ok'] for c in checks),
            'limits':'Normale TLS-Prüfung und exakte Build-Skripte/Styles/Header/Assets. Kein öffentlicher Browser-, Internet-Koop- oder Handy-FPS-Test.'}
    (OUT/'produktion.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    return 0 if report['passed'] else 1

if __name__=='__main__': raise SystemExit(main())
