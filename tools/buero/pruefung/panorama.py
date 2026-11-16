"""Büro-Licht und Monitorbedienung mit lokalen Prüfdaten, ohne externe Abrufe.

Aufruf: python3 panorama.py <Prüfordner mit harness.html und kb3d-*.js> <Bildordner> [--inhalt]
Prüfordner: seite.html und buero.json kopieren, harness.py ausführen, 3D-Dateien bauen.
--inhalt verlangt die sechs Prüfeinträge für Filter, nächste Schritte und Quellen.
Nur synthetische Prüfdaten verwenden. Bilder ausserhalb des Repositorys speichern.
"""
import sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
r=Path(sys.argv[1]).resolve()
bilder=Path(sys.argv[2]).resolve();bilder.mkdir(parents=True,exist_ok=True)
inhalt='--inhalt' in sys.argv[3:]
code=(r/'kb3d-code.js').read_text()+"\nvar mountAlt=KB3D.Buero.mount;KB3D.Buero.mount=function(){var m=mountAlt.apply(this,arguments);window.__office=m;return m;};"
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 for width in (1440,390):
  p=b.new_page(viewport={'width':width,'height':844},reduced_motion='reduce');errors=[];botabrufe=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_default_timeout(90000)
  def route(rt):
   name=urlparse(rt.request.url).path.lstrip('/');f=r/name
   if name=='data/ki-bot-schatten.json':botabrufe.append(name)
   if name=='kb3d-code.js':rt.fulfill(body=code,content_type='application/javascript')
   elif f.is_file():rt.fulfill(path=str(f))
   else:rt.abort()
  p.route('**/*',route);p.goto('http://127.0.0.1:8765/harness.html');p.evaluate('__runAll()');p.locator('#kb-tab-3d').click();p.evaluate('dash.draw("szene3d")')
  assert p.evaluate('KB3D.DESIGN_VERSION')=='campus-einheitlich-23'
  if inhalt:
   assert p.evaluate('__ROWS.length===6 && __ROWS.some(r=>r.name==="Prüfeintrag auswahl")'),'Die sechs Inhalts-Prüfeinträge fehlen.'
  original=p.evaluate('JSON.stringify(__ROWS)');p.locator('.kb3-room-select').select_option('Campusplatz')
  for light in ('tag','galerie','abend'):
   p.locator('[data-cmd="licht:'+light+'"]').click()
   p.locator('.kb3-stage').scroll_into_view_if_needed()
   wert={'tag':.57,'galerie':.52,'abend':.37}[light]
   p.wait_for_function('(v)=>__office.R.env.lc[1]===v',arg=wert)
   assert p.evaluate('__office.licht()')==light
   assert p.locator('.kb3-licht [aria-pressed=true]').count()==1
   p.locator('.kb3-stage').screenshot(path=str(bilder/f'buero-{width}-{light}.png'))
  if width==1440:
   for raum in ('Shop','Entwicklerbüro'):
    p.locator('.kb3-room-select').select_option(raum)
    p.locator('.kb3-stage').screenshot(path=str(bilder/f'buero-{width}-{raum}.png'))
   p.locator('.kb3-room-select').select_option('Campusplatz')
  kamera=p.evaluate('JSON.stringify(__office.debug.cam.g)')
  p.locator('[data-cmd="monitor"]').first.click();p.wait_for_timeout(100)
  assert p.evaluate('__office.monitorName()')=='Zentral'
  assert not p.locator('.kb3-licht').is_visible()
  assert p.locator('[data-live-text]').evaluate('(n)=>n.clientHeight>100 && getComputedStyle(n).position==="static"')
  assert p.locator('[data-live-text] li').count()>0
  assert p.locator('[data-monitor-wahl]').evaluate('(n)=>n===document.activeElement')
  # Spezifische sechs Testzeilen: zwei gemeldet, zwei prüfen, eine alt, eine ohne Zeit.
  if inhalt:
   filter=p.locator('[data-monitor-filter]')
   for key,count in (('alle',6),('gemeldet',2),('aufmerksamkeit',2),('veraltet',1),('ohneZeit',1)):
    button=p.locator('[data-monitor-filter="'+key+'"]');button.click()
    assert button.get_attribute('aria-pressed')=='true'
    assert button.evaluate('(n)=>n===document.activeElement')
    assert p.locator('[data-live-text] li').count()==count,(key,count)
    assert button.locator('strong').inner_text()==str(count)
   assert p.locator('.ll-quelle[data-monitor-quelle=autopilot]').count()==1
   p.locator('[data-monitor-filter=aufmerksamkeit]').click()
   assert p.locator('.ll-quelle[data-monitor-quelle=dev_bauen]').count()==1
   assert p.locator('.ll-weiter').count()==2
   quelle=p.locator('.ll-quelle').first;quelle.locator('summary').click()
   assert '<img src=x onerror=alert(1)>' in quelle.inner_text()
   assert quelle.locator('img').count()==0
   quelle.locator('summary').focus()
   p.evaluate('dash.draw("szene3d")')
   assert p.locator('.ll-quelle').first.get_attribute('open') is not None
   assert p.locator('.ll-quelle summary').first.evaluate('(n)=>n===document.activeElement')
   p.locator('.kb3-viewer').screenshot(path=str(bilder/f'buero-{width}-inhalt.png'))
   p.locator('[data-monitor-filter=alle]').click()
   print(width,'Inhaltsprüfung: fünf Filter, sechs Zeilen, nächste Schritte, Klartext-Quelle und erhaltener Quellenfokus: grün',flush=True)
  auswahl=p.locator('[data-monitor-wahl]')
  assert not p.locator('[data-monitor-bot]').is_visible()
  for raum in ('Shop','Versand','Social Media','Entwicklerbüro','YouTube-Studio','Chefbüro','Krypto','Zentral'):
   auswahl.focus();auswahl.select_option(raum)
   assert p.evaluate('__office.monitorName()')==raum
   assert auswahl.evaluate('(n)=>n===document.activeElement'),raum
   assert p.locator('[data-monitor-bot]').is_visible()==(raum=='Krypto')
   assert p.locator('[data-live-text] .ll-messstand').is_visible()
   assert 'Büro-Uhr' not in p.locator('[data-live-text] h3').inner_text()
  for cmd in ('monitorNext','monitorPrev'):
   knopf=p.locator('[data-cmd='+cmd+']');knopf.click()
   assert knopf.evaluate('(n)=>n===document.activeElement')
   assert auswahl.input_value()==p.evaluate('__office.monitorName()')
  assert len(botabrufe)==1,botabrufe
  auswahl.select_option('Krypto');auswahl.select_option('Zentral')
  assert len(botabrufe)==1,botabrufe
  if width==390:
   p.evaluate('()=>{document.querySelector(".kb3-viewer").requestFullscreen=()=>Promise.reject(new Error("Prüfung des CSS-Vollbilds"));}')
  voll=p.locator('.kb3-monitor-tools [data-cmd=fullscreen]');voll.click()
  assert p.locator('.kb3-viewer').evaluate('(n)=>n.classList.contains("is-fullscreen")')
  p.locator('.kb3-viewer').evaluate('(n)=>n.scrollTop=n.scrollHeight')
  assert p.locator('[data-live-text] li').last.evaluate('(n)=>n.getBoundingClientRect().bottom<=innerHeight'),width
  p.locator('.kb3-viewer').evaluate('(n)=>n.scrollTop=0')
  assert p.locator('.kb3-stage').evaluate('(n)=>n.clientHeight>=150'),width
  p.screenshot(path=str(bilder/f'buero-{width}-vollbild.png'))
  voll.click()
  assert p.evaluate('document.documentElement.style.overflow')!='hidden'
  p.locator('.kb3-viewer').screenshot(path=str(bilder/f'buero-{width}-monitor.png'))
  p.locator('[data-cmd=monitorBack]').click();assert p.locator('.kb3-licht').is_visible()
  assert kamera==p.evaluate('JSON.stringify(__office.debug.cam.g)')
  p.locator('[data-cmd="monitor"]').first.click();auswahl.select_option('Shop');p.keyboard.press('Escape')
  assert not p.evaluate('__office.monitorName()')
  assert kamera==p.evaluate('JSON.stringify(__office.debug.cam.g)')
  p.evaluate('__office.cmd("licht:unbekannt")');assert p.evaluate('__office.licht()')=='abend'
  assert original==p.evaluate('JSON.stringify(__ROWS)')
  assert p.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  assert not errors,errors
  print(width,'3 Lichtstimmungen, 8 Monitorziele, Fokus/Zurück/Escape, Vollbild scrollbar, Bot-Abruf einmalig, Daten unverändert, kein Überlauf/JS-Fehler: grün',flush=True)
  p.close()
 b.close()
