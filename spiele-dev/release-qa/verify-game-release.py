"""Build-/Quellenabgleich für Lebenspfad oder Neon Flug, ohne TLS-Ausnahmen."""
from pathlib import Path
import os, importlib.util, hashlib, subprocess, tempfile, json, re
root=Path(os.environ['GAME_ROOT']);game=os.environ['GAME'];out=Path(os.environ['GAME_OUT']);out.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('mix_qa',root/'spiele-dev/minispiele-mix/https-qa.py');qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa);qa.ROOT=root
page=game+'.html';source=(root/page).read_text();release=os.environ['RELEASE_COMMIT']
assets=(['js/lebenspfad/atmosphere.js','js/lebenspfad/world-sites.js','js/lebenspfad/character-art.js']+[str(p.relative_to(root)) for p in sorted((root/'models/lebenspfad-eigen').glob('*.glb'))]) if game=='lebenspfad' else [str(p.relative_to(root)) for p in sorted((root/'js/neon-flug').glob('*')) if p.is_file()]
paths=[(page,page),(page,game)]
for f in assets:
 paths.append((f,f));v=re.search(re.escape('/'+f)+r'\?v=([a-f0-9]+)',source)
 if v:
  assert hashlib.sha256((root/f).read_bytes()).hexdigest().startswith(v[1]),f
  paths.append((f,f+'?v='+v[1]))
builder=root/'automation/inject-engine.mjs'
with tempfile.TemporaryDirectory(dir='/tmp',prefix='game-build-') as d:
 target=Path(d)/page;target.write_text(source);subprocess.run(['node',str(builder),d],check=True,capture_output=True);built=target.read_text();expected=qa.code(built)
 controls={'positive':qa.identical(expected,qa.code(built)), 'extraScriptRejected':not qa.identical(expected,qa.code(built.replace('</body>','<script>window.extra=1</script></body>'))),'changedGameModuleRejected':not qa.identical(expected,qa.code(built.replace(next(e['src'] for e in expected.external if '/js/'+game+'/' in e['src']),'/js/missing-game-module.js',1)))}
 assert all(controls.values()),controls
 if os.environ.get('GAME_PREFLIGHT')=='1':print(json.dumps({'controls':controls,'requests':len(paths)}));raise SystemExit(0)
 checks=[]
 for f,uri in paths:
  key=uri.replace('/','__');p=out/key;h=out/(key+'.headers');url='https://abannews.com/'+uri+('&' if '?' in uri else '?')+'release='+release[:12]
  r=subprocess.run(['curl','--location','--silent','--show-error','--max-time','40','--dump-header',str(h),'--output',str(p),'--write-out','%{http_code}',url],capture_output=True,text=True)
  item={'uri':uri,'http':r.stdout,'ok':r.returncode==0 and r.stdout=='200'}
  if item['ok']:
   raw=p.read_bytes();headers=h.read_text();blocks=list(re.finditer(r'^HTTP/\S+ \d{3}[^\n]*\n',headers,re.M));headers=headers[blocks[-1].start():] if blocks else headers
   if f==page:
    actual=qa.code(raw.decode());item['scriptsStylesExact']=qa.identical(expected,actual);want=qa.expected_headers(uri)
    item['headersExact']=all(re.findall('^'+key+r':\s*(.*)$',headers,re.I|re.M)==[want[key]] for key in ['content-security-policy','x-frame-options'])
    item['ok'] &= item['scriptsStylesExact'] and item['headersExact']
   else:
    item['sha256']=hashlib.sha256(raw).hexdigest();item['bytesExact']=raw==(root/f).read_bytes();item['ok'] &= item['bytesExact']
    if f.endswith(('.js','.mjs','.css')):
     item['mimeCorrect']=bool(re.search(r'^content-type:.*'+('css' if f.endswith('.css') else 'javascript'),headers,re.I|re.M));item['ok'] &= item['mimeCorrect']
  else:item['error']=r.stderr.strip()
  checks.append(item);print(json.dumps(item,ensure_ascii=False),flush=True)
  if r.stdout=='429':break
 report={'releaseCommit':release,'sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'builderSha256':hashlib.sha256(builder.read_bytes()).hexdigest(),'controls':controls,'checks':checks,'passed':len(checks)==len(paths) and all(c['ok'] for c in checks),'limits':'Normale TLS-Verifikation; bytegleiche Assets, tatsächlicher Seitenbau, Skripte/Styles/Sicherheitsheader. Kein öffentlicher Browser-/Internet-Koop-/Handy-FPS-Nachweis.'}
 (out/'produktion.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');raise SystemExit(0 if report['passed'] else 1)
