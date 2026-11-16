from pathlib import Path
import json,re,hashlib,difflib,subprocess

R=Path('/dev/shm/luxestyle-review/r272/integration')
BASE=Path('/dev/shm/luxestyle-review/r269/source')
PREV=Path('/dev/shm/luxestyle-review/r269/theme/candidate')
OUT=R/'candidate'
OUT.mkdir(parents=True,exist_ok=True)

def put(rel,s):
 p=OUT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)

s=(PREV/'sections/luxe-edit-home.liquid').read_text()
needle='    {% assign lx_campaign_image = section.settings.hero_campaign_image %}'
replacement='''    {% comment %}Bounded scroll-film owner; no source URL until a real Shopify video is selected.{% endcomment %}
    {% liquid
      assign lx_campaign_image = section.settings.hero_campaign_image
      assign lx_campaign_video = section.settings.hero_scroll_video
      assign lx_scroll_source = nil
      assign lx_scroll_mobile_source = nil
      if section.settings.hero_scroll_enabled and lx_campaign_image != blank and lx_campaign_video != blank
        for lx_source in lx_campaign_video.sources
          if lx_source.format == 'mp4' and lx_source.width <= 1920
            if lx_scroll_source == blank or lx_source.width > lx_scroll_source.width
              assign lx_scroll_source = lx_source
            endif
            if lx_source.width <= 1280
              if lx_scroll_mobile_source == blank or lx_source.width > lx_scroll_mobile_source.width
                assign lx_scroll_mobile_source = lx_source
              endif
            endif
          endif
        endfor
      endif
    %}
    {% if lx_scroll_source != blank %}
      <script type="module" src="{{ 'luxe-scroll-hero.js' | asset_url }}"></script>
      <luxe-scroll-hero class="lx-scroll-root" tabindex="-1"
        data-hold-label="{{ 'lx_scroll_hero.hold' | t | escape }}"
        data-resume-label="{{ 'lx_scroll_hero.resume' | t | escape }}"
        data-scroll-label="{{ 'lx_scroll_hero.scrolling' | t | escape }}"
        data-paused-label="{{ 'lx_scroll_hero.paused' | t | escape }}"
        data-manual-label="{{ 'lx_scroll_hero.manual' | t | escape }}"
        data-poster-label="{{ 'lx_scroll_hero.poster' | t | escape }}">
    {% endif %}'''
assert s.count(needle)==1;s=s.replace(needle,replacement)
needle='<section class="lx-hero lx-background-hero{% if lx_campaign_image != blank %} lx-campaign-hero{% endif %}"'
assert s.count(needle)==1;s=s.replace(needle,'<section{% if lx_scroll_source != blank %} data-scroll-stage{% endif %} class="lx-hero lx-background-hero{% if lx_campaign_image != blank %} lx-campaign-hero{% endif %}{% if lx_scroll_source != blank %} lx-scroll-hero{% endif %}"')
needle='''        </div>
      {% else %}
      <div class="lx-background-hero-media" data-hero-media>'''
replace='''          {% if lx_scroll_source != blank %}
            <video class="lx-scroll-hero__video" data-scroll-video
              data-src="{{ lx_scroll_source.url | escape }}"
              {% if lx_scroll_mobile_source != blank %}data-src-mobile="{{ lx_scroll_mobile_source.url | escape }}"{% endif %}
              width="{{ lx_scroll_source.width }}" height="{{ lx_scroll_source.height }}"
              poster="{{ lx_campaign_image | image_url: width: 1600 }}"
              muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video>
          {% endif %}
        </div>
      {% else %}
      <div class="lx-background-hero-media" data-hero-media>'''
assert s.count(needle)==1;s=s.replace(needle,replace)
needle='''    </section>
    <section class="lx-worlds'''
replace='''      {% if lx_scroll_source != blank %}
        <div class="lx-scroll-hero__controls" data-scroll-controls hidden>
          <button type="button" data-scroll-hold aria-pressed="false">{{ 'lx_scroll_hero.hold' | t }}</button>
          <label class="lx-scroll-hero__range-label" for="lx-scroll-position-{{ section.id }}">{{ 'lx_scroll_hero.position' | t }}</label>
          <input id="lx-scroll-position-{{ section.id }}" type="range" min="0" max="1000" step="1" value="0" data-scroll-range>
          <span class="lx-scroll-hero__status" data-scroll-status role="status" aria-live="polite">{{ 'lx_scroll_hero.poster' | t }}</span>
        </div>
      {% endif %}
    </section>
    {% if lx_scroll_source != blank %}</luxe-scroll-hero>{% endif %}
    <section class="lx-worlds'''
assert s.count(needle)==1;s=s.replace(needle,replace)
# Move controls between media and copy in both reading and visual order.
controls_start=s.index('      {% if lx_scroll_source != blank %}\n        <div class="lx-scroll-hero__controls"')
controls_end=s.index('      {% endif %}',controls_start)+len('      {% endif %}\n')
controls=s[controls_start:controls_end]
s=s[:controls_start]+s[controls_end:]
copy_needle='      <div class="lx-hero-copy">'
assert s.count(copy_needle)==1;s=s.replace(copy_needle,controls+copy_needle)
needle='''    {"type":"image_picker","id":"hero_campaign_image"'''
replacement='''    {"type":"checkbox","id":"hero_scroll_enabled","label":"t:lx_scroll_hero.enabled","default":false},
    {"type":"video","id":"hero_scroll_video","label":"t:lx_scroll_hero.video","info":"t:lx_scroll_hero.video_info"},
    {"type":"image_picker","id":"hero_campaign_image"'''
assert s.count(needle)==1;s=s.replace(needle,replacement)

css='''
  /* R272: normal scrolling, scoped sticky owner, unchanged typography and CTAs. */
  .lx-home .lx-scroll-root { --lx-scroll-sticky-top: 0px; display: block; min-inline-size: 0; }
  body:has(#header-component[sticky='always']) .lx-scroll-root,
  body:has(#header-component[sticky='scroll-up'][data-sticky-state='active']) .lx-scroll-root {
    --lx-scroll-sticky-top: var(--header-height, 0px);
  }
  .lx-home .lx-scroll-root[data-scroll-enhanced] { padding-block-end: min(84svh, 800px); }
  .lx-home .lx-scroll-root[data-scroll-enhanced] .lx-scroll-hero {
    position: sticky; top: var(--lx-scroll-sticky-top); margin-block-start: 0;
  }
  .lx-home .lx-scroll-root[data-scroll-tall] { padding-block-end: 0; }
  .lx-home .lx-scroll-root[data-scroll-tall] .lx-scroll-hero { position: relative; top: auto; }
  .lx-home .lx-scroll-root { padding-block-start: 20px; }
  .lx-home .lx-scroll-root .lx-scroll-hero { margin-block-start: 0; }
  .lx-home .lx-background-hero.lx-campaign-hero.lx-scroll-hero { display: grid; grid-template-columns: 44% 56%; }
  .lx-home .lx-background-hero.lx-campaign-hero.lx-scroll-hero::before { content: none; }
  .lx-home .lx-scroll-hero .lx-campaign-hero__media { position: relative; grid-column: 2; grid-row: 1; min-block-size: inherit; }
  .lx-home .lx-scroll-hero .lx-campaign-hero__media img { position: absolute; inset: 0; }
  .lx-home .lx-background-hero.lx-campaign-hero.lx-scroll-hero .lx-hero-copy { grid-column: 1; grid-row: 1; inline-size: 100%; min-inline-size: 0; padding-inline: clamp(28px, 4vw, 60px); }
  .lx-home .lx-scroll-hero__video {
    position: absolute; inset: 0; inline-size: 100%; block-size: 100%;
    object-fit: contain; object-position: center top; opacity: 0; background: var(--lx-ink);
  }
  .lx-home .lx-scroll-root[data-has-frame] .lx-scroll-hero__video { opacity: 1; }
  .lx-home .lx-scroll-hero__controls {
    position: absolute; z-index: 4; inset-block-start: 18px; inset-inline-start: 18px;
    display: grid; grid-template-columns: auto minmax(90px, 140px); gap: 4px 12px;
    max-inline-size: calc(100% - 36px); padding: 8px 12px;
    border: 1px solid var(--lx-line); border-radius: 14px;
    background: var(--lx-cream); color: var(--lx-ink); font-size: 12px; line-height: 1.4;
  }
  .lx-home .lx-scroll-hero__controls[hidden] { display: none; }
  .lx-home .lx-scroll-hero__controls button {
    grid-row: 1 / 3; min-block-size: 44px; min-inline-size: 44px;
    padding: 8px 12px; border: 1px solid var(--lx-ink); border-radius: 8px;
    color: var(--lx-ink); background: var(--lx-cream);
  }
  .lx-home .lx-scroll-hero__controls input { inline-size: 100%; min-inline-size: 0; min-block-size: 44px; margin: 0; accent-color: var(--lx-ink); }
  .lx-home .lx-scroll-hero__range-label { grid-column: 2; }
  .lx-home .lx-scroll-hero__status { grid-column: 1 / -1; }
  @media (min-width: 761px) {
    .lx-home .lx-background-hero.lx-campaign-hero.lx-scroll-hero .lx-hero-copy { padding-block-start: 140px; padding-block-end: 60px; }
    .lx-home .lx-background-hero.lx-campaign-hero.lx-scroll-hero h1 { font-size: clamp(52px, 5.1vw, 84px); }
  }
  @media (prefers-reduced-motion: no-preference) {
    .lx-home .lx-scroll-hero__controls button { transition: transform 120ms cubic-bezier(.16, 1, .3, 1); }
    .lx-home .lx-scroll-hero__controls button:active { transform: scale(.97); }
  }
  @media (max-width: 760px) {
    .lx-home .lx-scroll-root { padding-block-start: 16px; }
    .lx-home .lx-background-hero.lx-campaign-hero.lx-scroll-hero { display: flex; flex-direction: column; min-block-size: 0; min-height: 0; }
    .lx-home .lx-scroll-hero .lx-campaign-hero__media { flex: none; min-block-size: 0; block-size: clamp(250px, 43svh, 480px); inline-size: 100%; }
    .lx-home .lx-background-hero.lx-campaign-hero.lx-scroll-hero .lx-hero-copy { min-block-size: 0; padding: 24px 24px 28px; }
    .lx-home .lx-scroll-hero__controls { position: relative; inset: auto; max-inline-size: calc(100% - 24px); margin: 12px 12px 0; }
  }
  @media (prefers-reduced-motion: reduce), (forced-colors: active) {
    .lx-home .lx-scroll-root[data-scroll-enhanced] { padding-block-end: 0; }
    .lx-home .lx-scroll-root[data-scroll-enhanced] .lx-scroll-hero { position: relative; top: auto; }
    .lx-home .lx-scroll-hero__video { display: none; }
    .lx-home .lx-scroll-hero__controls { display: none; }
  }
'''
assert s.count('{% endstylesheet %}')==1;s=s.replace('{% endstylesheet %}',css+'{% endstylesheet %}')
put('sections/luxe-edit-home.liquid',s)

js=Path('/dev/shm/luxestyle-review/r271/scroll-hero/scroll-hero-controller.mjs').read_text()
js=js.replace('/** Local R271 prototype. Not installed, connected to a film, or production-ready. */','/** R272 local integration candidate. Requires real-media and native preview acceptance. */')
js=js.replace('  let metadata = false;', '  let metadata = video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0;')
js=js.replace("  const poster = () => {\n", "  const poster = () => {\n    if (controls.contains(document.activeElement) && !document.hidden) root.focus({ preventScroll: true });\n")
js=js.replace("    delete root.dataset.hasFrame;\n    controls.hidden = true;", "    delete root.dataset.hasFrame;\n    if (!eligible()) delete root.dataset.scrollEnhanced;\n    controls.hidden = true;",1)
js=js.replace("      video.src = video.dataset.src;", "      video.src = matchMedia('(max-width: 760px)').matches && video.dataset.srcMobile ? video.dataset.srcMobile : video.dataset.src;")
js=js.replace("    controls.hidden = false;", "    root.dataset.scrollEnhanced = 'true';\n    controls.hidden = false;",1)
js=js.replace("  const progress = () => scrollProgress(root.getBoundingClientRect(), stage.offsetHeight,\n    Number.parseFloat(getComputedStyle(stage).top) || 0);", """  const progress = () => {
    const rect = root.getBoundingClientRect();
    const stickyTop = Number.parseFloat(getComputedStyle(root).getPropertyValue('--lx-scroll-sticky-top')) || 0;
    if (root.hasAttribute('data-scroll-tall')) {
      const travel = Math.max(1, video.parentElement?.offsetHeight || stage.offsetHeight);
      return Math.min(1, Math.max(0, (stickyTop - rect.top) / travel));
    }
    return scrollProgress(rect, stage.offsetHeight, stickyTop);
  };""")
js=js.replace("    root.dataset.scrollEnhanced = 'true';", """    const stickyTop = Number.parseFloat(getComputedStyle(root).getPropertyValue('--lx-scroll-sticky-top')) || 0;
    root.toggleAttribute('data-scroll-tall', stage.offsetHeight > innerHeight - stickyTop - 16);
    root.dataset.scrollEnhanced = 'true';""",1)
js=js.replace("    delete root.dataset.scrollEnhanced;\n    controls.hidden = true;\n    mode('poster');\n  };", "    delete root.dataset.scrollEnhanced;\n    delete root.dataset.scrollTall;\n    controls.hidden = true;\n    mode('poster');\n  };")
js=js.replace("    delete root.dataset.hasFrame;\n    controls.hidden = true;\n    mode('poster');\n  };\n}","    delete root.dataset.hasFrame;\n    delete root.dataset.scrollEnhanced;\n    controls.hidden = true;\n    mode('poster');\n  };\n}")
adapter='''

/** Native theme owner: clean resources before updates and disconnects. */
class LuxeScrollHero extends Component {
  #cleanup = null;
  #mountQueued = false;

  connectedCallback() {
    super.connectedCallback();
    this.#queueMount();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#queueMount();
  }

  disconnectedCallback() {
    this.#cleanup?.();
    this.#cleanup = null;
    super.disconnectedCallback();
  }

  #queueMount() {
    this.#cleanup?.();
    this.#cleanup = null;
    if (this.#mountQueued) return;
    this.#mountQueued = true;
    queueMicrotask(() => {
      this.#mountQueued = false;
      if (this.isConnected) this.#cleanup = mountScrollHero(this);
    });
  }
}

if (!customElements.get('luxe-scroll-hero')) customElements.define('luxe-scroll-hero', LuxeScrollHero);
'''
put('assets/luxe-scroll-hero.js',"import { Component } from '@theme/component';\n\n"+js+adapter)

runtime={
'de':{'hold':'Scroll-Effekt anhalten','resume':'Scroll-Effekt fortsetzen','scrolling':'Beim Scrollen','paused':'Angehalten','manual':'Manuelle Position','poster':'Standbild','position':'Filmposition'},
'en.default':{'hold':'Pause scroll effect','resume':'Resume scroll effect','scrolling':'Following scroll','paused':'Paused','manual':'Manual position','poster':'Still image','position':'Film position'},
'fr':{'hold':'Suspendre l’effet de défilement','resume':'Reprendre l’effet de défilement','scrolling':'Selon le défilement','paused':'En pause','manual':'Position manuelle','poster':'Image fixe','position':'Position du film'}}
schema={
'de':{'enabled':'Scroll-Film aktivieren','video':'Geprüfter Website-Film','video_info':'Nur einen geprüften stummen Film aus Shopify Files wählen. Poster erforderlich; vor Veröffentlichung auf Mobilgeräten testen.'},
'en.default':{'enabled':'Enable scroll film','video':'Approved website film','video_info':'Choose an approved silent film from Shopify Files. A poster is required; test on mobile before publishing.'},
'fr':{'enabled':'Activer le film au défilement','video':'Film du site validé','video_info':'Choisir un film silencieux validé dans Shopify Files. Une affiche est nécessaire ; tester sur mobile avant publication.'}}
for lang,vals in runtime.items():
 put('locales/'+lang+'.additions.json',json.dumps({'lx_scroll_hero':vals},ensure_ascii=False,indent=2)+'\n')
for lang,vals in schema.items():
 p=PREV/'locales'/(lang+'.schema.json');raw=p.read_text();start=raw.index('{');assert '"lx_scroll_hero"' not in raw
 # Preserve existing JSONC comments and every existing byte after the first opening brace.
 addition='\n  "lx_scroll_hero": '+json.dumps(vals,ensure_ascii=False,indent=2).replace('\n','\n  ')+','
 put('locales/'+lang+'.schema.json',raw[:start+1]+addition+raw[start+1:])

raw=(PREV/'templates/index.json').read_text();start=raw.index('{');j=json.loads(raw[start:]);keys=[k for k,v in j['sections'].items() if v['type']=='luxe-edit-home'];assert len(keys)==1
j['sections'][keys[0]]['settings']['hero_scroll_enabled']=False
# The native Video reference is intentionally absent, never a placeholder or a local URL.
put('templates/index.json',raw[:start]+json.dumps(j,ensure_ascii=False,indent=2)+'\n')

patch=[];manifest=[]
for p in sorted(OUT.rglob('*')):
 if not p.is_file():continue
 rel=str(p.relative_to(OUT));body=p.read_text();basepath=BASE/rel if rel!='templates/index.json' else BASE/'templates-index.json';old=basepath.read_text() if basepath.exists() else ''
 manifest.append({'path':rel,'bytes':len(p.read_bytes()),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'baseAvailable':bool(old),'kind':'MERGE_ADDITIONS_ONLY' if '.additions.json' in rel else 'FULL_CANDIDATE'})
 if '.additions.json' not in rel:patch.extend(difflib.unified_diff(old.splitlines(True),body.splitlines(True),fromfile='a/'+rel,tofile='b/'+rel))
(R/'CANDIDATE.diff').write_text(''.join(patch))
(R/'MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')

schema_json=re.search(r'{% schema %}\s*(.*?)\s*{% endschema %}',s,re.S).group(1);j=json.loads(schema_json)
assert len({x['id'] for x in j['settings'] if 'id' in x})==len([x for x in j['settings'] if 'id'in x])
# Preserve copy and every byte below the first worlds section through stylesheet boundary.
assert s.split('    <section class="lx-worlds',1)[1].split('{% stylesheet %}',1)[0]==(PREV/'sections/luxe-edit-home.liquid').read_text().split('    <section class="lx-worlds',1)[1].split('{% stylesheet %}',1)[0]
before=(PREV/'sections/luxe-edit-home.liquid').read_text().split('      <div class="lx-hero-copy">',1)[1].split('    </section>',1)[0]
after=s.split('      <div class="lx-hero-copy">',1)[1].split('    </section>',1)[0]
assert after.rstrip()==before.rstrip()
print(json.dumps({'status':'PASS_LOCAL_CANDIDATE_SOURCE_ONLY','files':len(manifest),'heroCopyAndCTAsUnchanged':True,'belowHeroUnchanged':True,'videoPickerUnbound':True,'scrollEnabled':False,'shopifyWrites':0},indent=2))
