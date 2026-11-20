import json, pathlib, re
from playwright.sync_api import sync_playwright

p = pathlib.Path('/dev/shm/luxe-r277/sales')
cache = json.loads((p/'source/css-cache.json').read_text())
rows = []
snapshot = '''() => ({variants:[...document.querySelectorAll('input[name="id"]')].map(x=>x.value),radios:[...document.querySelectorAll('variant-picker input[type=radio]')].map(x=>({name:x.name,value:x.value,checked:x.checked})),prices:[...document.querySelectorAll('.price')].map(x=>x.textContent.trim()),quantity:[...document.querySelectorAll('input[name="quantity"]')].map(x=>x.value)})'''
with sync_playwright() as play:
    browser = play.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for variant, name in [('68122445283719','public.html'),('68122445316487','public-B.html')]:
        original = (p/'source'/name).read_text()
        inert = re.sub(r'<script\b[^>]*>[\s\S]*?</script\s*>', '', original, flags=re.I)
        for width in [360,390,1440]:
            page = browser.new_page(viewport={'width':width,'height':844})
            url = 'https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant='+variant
            def route(req):
                u=req.request.url
                if req.request.is_navigation_request() and u.split('#')[0]==url:
                    req.fulfill(status=200,content_type='text/html',body=inert)
                elif u in cache and cache[u].get('http')==200:
                    req.fulfill(status=200,content_type='text/css',body=cache[u]['body'])
                else:
                    req.abort()
            page.route('**/*', route)
            page.goto(url,wait_until='load')
            assert page.locator('#luxe-modellvergleich').count()==0
            assert page.get_by_role('link',name='Modelle A–G vergleichen',exact=True).count()==0
            base=page.evaluate(snapshot)
            page.evaluate('''() => {
              const picker=document.querySelector('variant-picker[data-product-id="15521256604033"]');
              const heads=[...document.querySelectorAll('.lux-beschreibung h2')].filter(x=>x.textContent.trim()==='Welche Ausführung passt zu dir?');
              if(!picker || heads.length!==1) throw Error('Quellstruktur unerwartet');
              heads[0].id='luxe-modellvergleich'; heads[0].tabIndex=-1;
              picker.insertAdjacentHTML('afterend','<p class="luxe-modellvergleich-link"><a href="#luxe-modellvergleich">Modelle A–G vergleichen</a></p><style>.luxe-modellvergleich-link{margin:.25rem 0 .75rem;font-size:.9rem;line-height:1.5}.luxe-modellvergleich-link a{text-decoration:underline;text-underline-offset:.15em}#luxe-modellvergleich{scroll-margin-block-start:calc(var(--header-height,120px) + 1.5rem)}</style>');
            }''')
            assert page.evaluate(snapshot)==base
            link=page.get_by_role('link',name='Modelle A–G vergleichen',exact=True)
            link.focus(); link.press('Enter')
            page.wait_for_timeout(700)
            result=page.evaluate('''() => {const h=document.getElementById('luxe-modellvergleich'),r=h.getBoundingClientRect();return {hash:location.hash,query:location.search,focus:document.activeElement===h,top:r.top,bottom:r.bottom,viewport:innerHeight,linkCount:document.querySelectorAll('a[href="#luxe-modellvergleich"]').length,targetCount:document.querySelectorAll('#luxe-modellvergleich').length,detailsParents:[...h.closest('.lux-beschreibung').querySelectorAll('details')].length}}''')
            result.update({'width':width,'variant':variant,'stateUnchanged':page.evaluate(snapshot)==base,'sourceSelectedVariantPresent':variant in base['variants'],'sourcePrices':base['prices']})
            assert result['hash']=='#luxe-modellvergleich'
            assert result['query']=='?variant='+variant
            assert result['focus'] and result['stateUnchanged']
            print(json.dumps({'debug':result},ensure_ascii=False),flush=True)
            assert result['top']>=0 and result['bottom']<=result['viewport']
            assert result['linkCount']==1 and result['targetCount']==1
            rows.append(result)
            if width==390 and variant=='68122445283719':page.screenshot(path=str(p/'candidate-focus-390.png'))
            page.close()
    browser.close()
(p/'BROWSER-QA.json').write_text(json.dumps({'scope':'Offline-Abbild von zwei echten öffentlichen HTML-Antworten mit aktuellen Stylesheets. Fremde Skripte und alle übrigen Netzaufrufe blockiert. Kandidaten-DOM nach den beiden Liquid-Einfügungen simuliert; kein nativer Liquid-Render, kein Variantenwechsel oder Kauf.','cases':rows,'state':'PASS_BOUNDED_DOM_ANCHOR_FOCUS'},indent=2,ensure_ascii=False))
print(json.dumps({'cases':len(rows),'state':'PASS_BOUNDED_DOM_ANCHOR_FOCUS','rows':rows},ensure_ascii=False))
