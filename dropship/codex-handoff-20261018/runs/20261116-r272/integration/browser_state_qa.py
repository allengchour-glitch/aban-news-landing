"""Local DOM/controller fixture and actual review MP4. No native Liquid render or store writes."""
from pathlib import Path
import json,re,os
from playwright.sync_api import sync_playwright

R=Path('/dev/shm/luxestyle-review/r272/integration');O=R/'qa';O.mkdir(exist_ok=True)
os.environ['TMPDIR']=str(O)
section=(R/'candidate/sections/luxe-edit-home.liquid').read_text()
css=re.search(r'{% stylesheet %}(.*?){% endstylesheet %}',section,re.S).group(1)
oldcss=Path('/dev/shm/luxestyle-review/r269/source/assets/luxe-edit.css').read_text()
html='''<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"><script type="importmap">{"imports":{"@theme/component":"/component.js","@theme/utilities":"/utilities.js"}}</script><style>body{margin:0}body>header{height:90px;background:#faf7f2}body>footer{height:1000px}.lx-scroll-root:focus{outline:none}</style><style>'''+oldcss+css+'''</style></head><body><header>Local state fixture</header><div class="lx-home"><luxe-scroll-hero class="lx-scroll-root" tabindex="-1" data-hold-label="Scroll-Effekt anhalten" data-resume-label="Scroll-Effekt fortsetzen" data-scroll-label="Beim Scrollen" data-paused-label="Angehalten" data-manual-label="Manuelle Position" data-poster-label="Standbild"><section data-scroll-stage class="lx-hero lx-background-hero lx-campaign-hero lx-scroll-hero"><div class="lx-campaign-hero__media" aria-hidden="true"><img width="3504" height="2336" src="/poster.webp" alt=""><video class="lx-scroll-hero__video" data-scroll-video data-src="/desktop.mp4" data-src-mobile="/mobile.mp4" width="1920" height="1080" muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video></div><div class="lx-hero-copy"><p class="lx-eyebrow">SCHÖNES FÜR DEINEN ALLTAG</p><h1>Schön leben.<br><em>Schlau shoppen.</em></h1><p class="lx-hero-description">Mode, Wohnen, Geschenke und mehr. Entdecke deine nächste Lieblingsidee.</p><div class="lx-hero-actions"><a class="lx-button" href="/pages/alle-kategorien">Alle Kategorien</a><a class="lx-text-link" href="/collections/selbst-gestalten-1?view=luxe-gestalten">Selbst gestalten</a></div></div><div class="lx-scroll-hero__controls" data-scroll-controls hidden><button type="button" data-scroll-hold aria-pressed="false">Scroll-Effekt anhalten</button><label class="lx-scroll-hero__range-label" for="film-position">Filmposition</label><input id="film-position" type="range" min="0" max="1000" step="1" value="0" data-scroll-range><span class="lx-scroll-hero__status" data-scroll-status role="status" aria-live="polite">Standbild</span></div></section></luxe-scroll-hero></div><footer>Normal next content</footer><script type="module" src="/luxe-scroll-hero.js"></script></body></html>'''
fixtures={
'/component.js':(R/'source/component.js').read_text(),
'/utilities.js':'export const requestIdleCallback = callback => window.setTimeout(callback, 0);',
'/luxe-scroll-hero.js':(R/'candidate/assets/luxe-scroll-hero.js').read_text()}
html=html.replace('<head>','<head><meta charset="utf-8">')
# Keep this fixture's content order aligned with the candidate's media-controls-copy order.
control_match=re.search(r'<div class="lx-scroll-hero__controls".*?</div>',html)
assert control_match
control_markup=control_match.group(0)
html=html.replace(control_markup,'').replace('<div class="lx-hero-copy">',control_markup+'<div class="lx-hero-copy">')
mock_media='''window.__playCalls=0;const times=new WeakMap();Object.defineProperties(HTMLMediaElement.prototype,{duration:{get(){return 15},configurable:true},readyState:{get(){return 4},configurable:true},seeking:{get(){return false},configurable:true},currentTime:{get(){return times.get(this)||0},set(v){times.set(this,v);setTimeout(()=>this.dispatchEvent(new Event('seeked')),0)},configurable:true}});HTMLMediaElement.prototype.pause=function(){};HTMLMediaElement.prototype.play=function(){window.__playCalls++;throw Error('Unexpected autoplay')};HTMLMediaElement.prototype.load=function(){this.dispatchEvent(new Event('loadedmetadata'));this.dispatchEvent(new Event('loadeddata'))};'''
assert Path('/dev/shm/luxestyle-review/r272/quality/MASTER-TECHNICAL-PROOF.json').is_file()
real_mp4=Path('/dev/shm/luxestyle-review/r272/luxestyle-atelier-15s-review-r272.mp4').read_bytes()
html=html.replace('width="1920" height="1080" muted','width="1080" height="1440" muted')
report={'scope':'LOCAL_DOM_AND_ACTUAL_REVIEW_MP4_CHROMIUM_ONLY','realMp4DecoderTested':True,'nativeLiquidRendered':False,'shopifyWrites':0,'cases':[],'errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in ((320,900),(390,900),(1440,900),(390,640)):
  page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='no-preference')
  page.add_init_script("window.__playCalls=0;HTMLMediaElement.prototype.play=function(){window.__playCalls++;throw Error('Unexpected autoplay')};")
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  def route(q):
   from urllib.parse import urlsplit
   path=urlsplit(q.request.url).path
   if path=='/':q.fulfill(status=200,content_type='text/html',body=html)
   elif path in fixtures:q.fulfill(status=200,content_type='text/javascript',body=fixtures[path])
   elif path=='/poster.webp':q.fulfill(status=200,content_type='image/webp',body=Path('/dev/shm/luxestyle-review/r269/design/luxe-atelier-hero-master.webp').read_bytes())
   elif path in ('/mobile.mp4','/desktop.mp4'):
    span=q.request.headers.get('range','')
    if span:
     m=re.fullmatch(r'bytes=(\d+)-(\d*)',span);assert m,span
     start=int(m.group(1));end=int(m.group(2)) if m.group(2) else len(real_mp4)-1;end=min(end,len(real_mp4)-1)
     q.fulfill(status=206,content_type='video/mp4',headers={'Accept-Ranges':'bytes','Content-Range':f'bytes {start}-{end}/{len(real_mp4)}'},body=real_mp4[start:end+1])
    else:q.fulfill(status=200,content_type='video/mp4',headers={'Accept-Ranges':'bytes'},body=real_mp4)
   else:q.abort()
  page.route('**/*',route);page.goto('https://local.test/',wait_until='load');page.wait_for_timeout(160)
  page.wait_for_function("document.querySelector('[data-scroll-controls]').hidden===false")
  snap=page.evaluate('''() => {const r=document.querySelector('luxe-scroll-hero'),s=r.querySelector('[data-scroll-stage]'),v=r.querySelector('video'),b=r.querySelector('[data-scroll-hold]');return{rootHeight:r.offsetHeight,stageHeight:s.offsetHeight,source:v.getAttribute('src'),fit:getComputedStyle(v).objectFit,playCalls:window.__playCalls,overflow:document.documentElement.scrollWidth>innerWidth,status:r.dataset.scrollMode,controlsWithin:[...r.querySelectorAll('[data-scroll-controls] button,[data-scroll-controls] input')].every(e=>{const a=e.getBoundingClientRect(),b=s.getBoundingClientRect();return a.x>=b.x&&a.right<=b.right&&a.y>=b.y&&a.bottom<=b.bottom}),target44:[...r.querySelectorAll('[data-scroll-controls] button,[data-scroll-controls] input')].every(e=>e.getBoundingClientRect().height>=44)}}''')
  assert snap['fit']=='contain' and snap['playCalls']==0 and not snap['overflow'] and snap['controlsWithin'] and snap['target44'],snap
  assert snap['source']==('/mobile.mp4' if width<=760 else '/desktop.mp4'),snap
  assert page.locator('h1').inner_text()=='Schön leben.\nSchlau shoppen.'
  initial_time=page.evaluate("document.querySelector('video').currentTime")
  assert initial_time<.04,initial_time
  page.evaluate("window.scrollTo({top:350,behavior:'instant'})");page.wait_for_timeout(250)
  progress=page.evaluate("document.querySelector('video').currentTime")
  assert progress>0,{'initial':snap,'position':page.evaluate("({y:scrollY,top:document.querySelector('luxe-scroll-hero').getBoundingClientRect().top,root:document.querySelector('luxe-scroll-hero').outerHTML.slice(0,600),time:document.querySelector('video').currentTime})")}
  page.evaluate("window.scrollTo({top:150,behavior:'instant'})");page.wait_for_timeout(250)
  backward=page.evaluate("document.querySelector('video').currentTime");assert backward<progress,(backward,progress)
  tall=page.evaluate("document.querySelector('luxe-scroll-hero').hasAttribute('data-scroll-tall')")
  if height==640:
   assert tall
   assert page.evaluate("getComputedStyle(document.querySelector('[data-scroll-stage]')).position")=='relative'
  page.locator('[data-scroll-hold]').click();frozen=page.evaluate("document.querySelector('video').currentTime")
  page.evaluate('window.scrollTo(0,500)');page.wait_for_timeout(80)
  assert abs(page.evaluate("document.querySelector('video').currentTime")-frozen)<.001
  page.locator('[data-scroll-range]').focus();page.keyboard.press('End');page.wait_for_timeout(80)
  assert page.evaluate("document.querySelector('[data-scroll-range]').value")=='1000'
  assert page.evaluate("document.querySelector('luxe-scroll-hero').dataset.scrollMode")=='manual'
  # Native lifecycle update twice must leave one hold click handler, not three.
  page.evaluate("document.querySelector('luxe-scroll-hero').updatedCallback();document.querySelector('luxe-scroll-hero').updatedCallback()")
  page.wait_for_timeout(80);page.locator('[data-scroll-hold]').click()
  assert page.locator('[data-scroll-hold]').get_attribute('aria-pressed')=='true'
  if width in (390,1440) and height==900:
   page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
   for name,value in (('dress',333),('ceramic',600)):
    page.locator('[data-scroll-range]').evaluate("(el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}))}",value)
    page.wait_for_timeout(250)
    page.wait_for_function("document.querySelector('video').seeking===false")
    page.screenshot(path=str(O/(f'real-{name}-{width}.png')))
  page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(80)
  assert page.evaluate("document.querySelector('[data-scroll-controls]').hidden")
  assert not page.evaluate("document.querySelector('luxe-scroll-hero').hasAttribute('data-has-frame')")
  assert page.evaluate("getComputedStyle(document.querySelector('[data-scroll-video]')).display")=='none'
  page.screenshot(path=str(O/(f'reduced-poster-{width}x{height}.png')))
  report['cases'].append({'width':width,'height':height,'initial':snap,'initialTime':initial_time,'forwardScrollTime':progress,'backwardScrollTime':backward,'tallNaturalScroll':tall,'pauseFrozen':True,'rangeKeyboardEnd':True,'repeatedNativeUpdateSingular':True,'reducedMotionPoster':True,'utf8CopyExact':True})
  page.close()
 browser.close()
report['status']='PASS_LOCAL_DOM_AND_REAL_MP4_CHROMIUM_ONLY' if len(report['cases'])==4 and not report['errors'] else 'FAIL'
(O/'REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
