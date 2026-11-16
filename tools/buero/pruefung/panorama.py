"""Büro-Licht und lesbare Monitore mit lokalen Prüfdaten, ohne externe Abrufe.

Aufruf: python3 panorama.py <Prüfordner mit harness.html und kb3d-*.js> <Bildordner>
Prüfordner: seite.html und buero.json kopieren, harness.py ausführen, 3D-Dateien bauen.
Nur synthetische Prüfdaten verwenden. Bilder ausserhalb des Repositorys speichern.
"""
import sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
r=Path(sys.argv[1]).resolve()
bilder=Path(sys.argv[2]).resolve();bilder.mkdir(parents=True,exist_ok=True)
code=(r/'kb3d-code.js').read_text()+"\nvar mountAlt=KB3D.Buero.mount;KB3D.Buero.mount=function(){var m=mountAlt.apply(this,arguments);window.__office=m;return m;};"
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 for width in (1440,390):
  p=b.new_page(viewport={'width':width,'height':1050},reduced_motion='reduce');errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  def route(rt):
   name=urlparse(rt.request.url).path.lstrip('/');f=r/name
   if name=='kb3d-code.js':rt.fulfill(body=code,content_type='application/javascript')
   elif f.is_file():rt.fulfill(path=str(f))
   else:rt.abort()
  p.route('**/*',route);p.goto('http://127.0.0.1:8765/harness.html');p.evaluate('__runAll()');p.locator('#kb-tab-3d').click();p.evaluate('dash.draw("szene3d")')
  assert p.evaluate('KB3D.DESIGN_VERSION')=='campus-einheitlich-21'
  original=p.evaluate('JSON.stringify(__ROWS)');p.locator('.kb3-room-select').select_option('Campusplatz')
  for light in ('tag','galerie','abend'):
   p.locator('[data-cmd="licht:'+light+'"]').click()
   p.locator('.kb3-stage').scroll_into_view_if_needed()
   wert={'tag':.57,'galerie':.52,'abend':.37}[light]
   p.wait_for_function('(v)=>__office.R.env.lc[1]===v',arg=wert)
   assert p.evaluate('__office.licht()')==light
   assert p.locator('.kb3-licht [aria-pressed=true]').count()==1
   p.locator('.kb3-stage').screenshot(path=str(bilder/f'buero-{width}-{light}.png'))
  p.locator('[data-cmd="monitor"]').first.click();p.wait_for_timeout(100)
  assert p.evaluate('__office.monitorName()')=='Zentral'
  assert not p.locator('.kb3-licht').is_visible()
  assert p.locator('[data-live-text]').evaluate('(n)=>n.clientHeight>100 && getComputedStyle(n).position==="static"')
  assert p.locator('[data-live-text] li').count()>0
  p.locator('.kb3-viewer').screenshot(path=str(bilder/f'buero-{width}-monitor.png'))
  p.locator('[data-cmd=monitorBack]').click();assert p.locator('.kb3-licht').is_visible()
  p.evaluate('__office.cmd("licht:unbekannt")');assert p.evaluate('__office.licht()')=='abend'
  assert original==p.evaluate('JSON.stringify(__ROWS)')
  assert p.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  assert not errors,errors
  print(width,'3 Lichtstimmungen, sichtbare Auswahl, Monitor/Rückkehr, ungültige Wahl, Daten unverändert, kein Überlauf/JS-Fehler: grün')
  p.close()
 b.close()
