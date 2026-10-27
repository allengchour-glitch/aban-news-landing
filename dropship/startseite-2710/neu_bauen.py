#!/usr/bin/env python3
"""Baut aus den Dateien des Entwurf-Themes (theme/entwurf) die neue Startseite nach theme/neu/.
   - Hero: Produktwand-Video (Desktop + Hochformat), Tati-CSS raus, Text/Knopf neu
   - lux_usp: Leiste mit Linien-Icons statt Emojis, neutral weiss
   - lux_willkommen (neu): Einleitung + Kategorie-Pillen
   - lux_spotlight_video -> lux_print (Selbst gestalten: Foto & Print)
   - banner_selbst_gestalten entfällt (steckt im Print-Bereich; hält die Grenze von 25 Abschnitten)
   - scheme-2: kein Beige mehr (Elektronik-/Uhren-Band)"""
import json, re, sys, os
BASE = os.environ.get('THEME_ARBEIT') or os.path.dirname(os.path.abspath(__file__))
SRC, DST = f'{BASE}/entwurf', f'{BASE}/neu'
CDN = 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/'

def lies(pfad):
    s = open(f'{SRC}/{pfad}', encoding='utf-8').read()
    m = re.match(r'^\s*/\*.*?\*/\s*', s, flags=re.S)
    return (m.group(0) if m else ''), json.loads(s[len(m.group(0)) if m else 0:])

def schreibe(pfad, kopf, daten):
    os.makedirs(os.path.dirname(f'{DST}/{pfad}'), exist_ok=True)
    open(f'{DST}/{pfad}', 'w', encoding='utf-8').write(kopf + json.dumps(daten, ensure_ascii=False, indent=2) + '\n')

# ───────────────────────── USP-Leiste ─────────────────────────
USP = r'''<style id="lx-usp-css">
/* Hero (Produktwand-Video): Höhe zählt ohne Kopfzeile; auf dem Handy nur Titel + Knopf, die Fakten stehen direkt darunter in der Leiste; Tablet hochkant nimmt das Hochformat-Video */
section[id$="__hero_jVaWmY"] .hero h1{text-wrap:balance}
@media (min-width:750px) and (max-width:1099px) and (orientation:portrait){section[id$="__hero_jVaWmY"] .hero{--hero-min-height:66svh!important}section[id$="__hero_jVaWmY"] .hero__media-wrapper--desktop{display:none}section[id$="__hero_jVaWmY"] .hero__media-wrapper--mobile{display:block}}
@media (max-width:749px){section[id$="__hero_jVaWmY"] .hero{--hero-min-height:84svh!important}section[id$="__hero_jVaWmY"] .hero h1{font-size:2.3rem}section[id$="__hero_jVaWmY"] .hero [class*="__text_YLPk4p"]{padding-block-end:18px!important}section[id$="__hero_jVaWmY"] .hero [class*="__text_fakten"]{display:none}}
.lx-usp{background:#fff;border-block:1px solid #ececec}
.lx-usp__row{max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;gap:14px 10px;justify-content:space-around;padding:16px 1rem}
.lx-usp__i{flex:1 1 220px;display:flex;align-items:center;justify-content:center;gap:12px;color:#2c2c2c;text-align:left;font-size:13.5px;line-height:1.35}
.lx-usp__i svg{flex:0 0 auto;width:28px;height:28px;fill:none;stroke:#8b7355;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.lx-usp__i b{display:block;font-weight:700}
.lx-usp__i small{display:block;font-size:12.5px;color:#5a5a5a}
.lx-usp__i a{color:inherit;text-decoration:underline}
@media (max-width:1099px){.lx-usp__row{display:grid;grid-template-columns:1fr 1fr;gap:14px 12px;padding:14px 1rem}.lx-usp__i{flex:none;justify-content:flex-start;font-size:12.5px}.lx-usp__i small{font-size:11.5px}.lx-usp__i svg{width:24px;height:24px}}
</style>
<script>try{if(matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('section[id$="__hero_jVaWmY"] video').forEach(function(v){v.removeAttribute('autoplay');v.pause()})}}catch(e){}</script>
<div class="lx-usp"><div class="lx-usp__row">
<div class="lx-usp__i"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="4" width="14" height="12"/><polygon points="15 8 19 8 22 11 22 16 15 16 15 8"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18" cy="18.5" r="2"/></svg><span><b>Gratis-Versand</b><small>in der Schweiz ab CHF 50 nach Rabatt</small></span></div>
<div class="lx-usp__i"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg><span><b>Kauf auf Rechnung</b><small>mit Klarna · TWINT · Karten</small></span></div>
<div class="lx-usp__i"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="2 4 2 10 8 10"/><path d="M4 15a9 9 0 1 0 2-8.5L2 10"/></svg><span><b>30 Tage Rückgabe</b><small>gemäss <a href="/policies/refund-policy">Rückgabebedingungen</a></small></span></div>
<div class="lx-usp__i"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg><span><b>Schweizer Shop</b><small>aus Belp BE · CHF · Support auf Deutsch</small></span></div>
</div></div>'''

# ───────────────────────── Willkommen ─────────────────────────
WILLKOMMEN = r'''<style id="lx-welcome-css">
.lx-welcome{max-width:min(var(--page-width,1400px),100%);margin:0 auto;padding:clamp(34px,5vw,64px) var(--page-margin,1rem) clamp(8px,2vw,20px)}
.lx-welcome__wrap{max-width:860px;margin:0 auto;text-align:center}
.lx-welcome__eyebrow{margin:0 0 10px;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:#7a6246}
.lx-welcome h2{text-wrap:balance;margin:0 0 14px;font-size:clamp(26px,3.6vw,40px);line-height:1.15;letter-spacing:-.01em;color:#2c2c2c}
.lx-welcome__lead{text-wrap:pretty;margin:0 auto 22px;max-width:720px;font-size:clamp(15px,1.6vw,17.5px);line-height:1.6;color:#4a4a4a}
.lx-welcome__pills{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.lx-welcome__pills a{display:inline-block;padding:9px 18px;border-radius:999px;border:1px solid #2c2c2c24;background:#fff;color:#2c2c2c;font-size:14px;font-weight:600;text-decoration:none;transition:background .35s ease,color .35s ease,border-color .35s ease,transform .35s ease}
.lx-welcome__pills a:hover,.lx-welcome__pills a:focus-visible{background:#2c2c2c;color:#fff;border-color:#2c2c2c;transform:translateY(-1px)}
.lx-welcome__pills a.lx-welcome__alle{background:#2c2c2c;color:#fff;border-color:#2c2c2c}
.lx-welcome__pills a.lx-welcome__alle:hover{background:#8b7355;border-color:#8b7355}
</style>
<section class="lx-welcome" aria-labelledby="lx-welcome-h"><div class="lx-welcome__wrap">
<p class="lx-welcome__eyebrow">Willkommen bei LuxeStyle CH</p>
<h2 id="lx-welcome-h">Dein Schweizer Shop für Mode, Wohnen, Beauty und mehr.</h2>
<p class="lx-welcome__lead">Aus Belp BE für die ganze Schweiz: Wir sammeln Schönes für Kleiderschrank, Zuhause, Küche, Haustiere und Technik und sagen dir vor dem Kauf ehrlich, was es kostet und wann es bei dir ist. Ein Teil der Artikel liegt in der Schweiz und ist schnell da, die übrigen versenden unsere Lieferanten direkt (ca. 10–20 Werktage). Die Lieferzeit steht bei jedem Artikel auf der Produktseite.</p>
<nav class="lx-welcome__pills" aria-label="Beliebte Kategorien">
{%- assign lx_pills = 'damen-mode|Damenmode,fur-ihn|Für ihn,schuhe|Schuhe,sub-taschen|Taschen,beauty-pflege|Beauty &amp; Pflege,wohnen-dekoration|Wohnen &amp; Deko,sub-kueche|Küche,elektronik-technik|Elektronik,spielzeug|Spielzeug,fitness-training|Fitness,premium-geschenke|Geschenke,selbst-gestalten|Selbst gestalten' | split: ',' -%}
{%- for p in lx_pills -%}{%- assign pp = p | split: '|' -%}{%- assign pc = collections[pp[0]] -%}{%- if pc.title != blank -%}<a href="{{ pc.url }}">{{ pp[1] }}</a>{%- endif -%}{%- endfor -%}
<a class="lx-welcome__alle" href="/pages/alle-kategorien">Alle Kategorien →</a>
</nav>
</div></section>'''

# ───────────────────────── Print ─────────────────────────
def kachel(datei, v, label):
    return (f'<figure class="lx-print__k"><img src="{CDN}{datei}?v={v}&amp;width=520" srcset="{CDN}{datei}?v={v}&amp;width=360 360w, {CDN}{datei}?v={v}&amp;width=520 520w, {CDN}{datei}?v={v}&amp;width=760 760w" '
            f'sizes="(max-width:749px) 44vw, 22vw" width="520" height="520" loading="lazy" alt="Beispiel: {label} mit eigenem Motiv"><figcaption>{label}</figcaption></figure>')

KACHELN = ''.join([
    kachel('lx-print-mug-quote.jpg', '1793130105', 'Tasse'),
    kachel('lx-print-hoodie-sunset.jpg', '1793130098', 'Hoodie'),
    kachel('lx-print-tshirt-mountain.jpg', '1793130119', 'T-Shirt'),
    kachel('lx-print-tote-cat.jpg', '1793130112', 'Tasche'),
    kachel('lx-print-case-marble.jpg', '1793130092', 'Handyhülle'),
    kachel('lx-print-tshirt-paint.jpg', '1793130125', 'T-Shirt'),
])

PRINT = r'''<style id="lx-print-css">
.lx-print{max-width:min(var(--page-width,1400px),100%);margin:0 auto;padding:clamp(30px,5vw,60px) var(--page-margin,1rem)}
.lx-print__panel{display:grid;grid-template-columns:minmax(0,1.02fr) minmax(0,1fr);gap:clamp(24px,4vw,56px);align-items:center;background:#17161a;color:#f4f2ee;border-radius:26px;padding:clamp(22px,4.2vw,58px);overflow:hidden;position:relative}
.lx-print__panel::before{content:"";position:absolute;inset:auto -10% -40% auto;width:60%;aspect-ratio:1;background:radial-gradient(closest-side,rgba(201,163,95,.22),rgba(201,163,95,0));pointer-events:none}
.lx-print__eyebrow{margin:0 0 12px;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:#e5c98f}
.lx-print__title{text-wrap:balance;margin:0 0 16px;font-size:clamp(30px,4.4vw,52px);line-height:1.06;letter-spacing:-.015em;color:#fff}
.lx-print__lead{margin:0 0 22px;font-size:clamp(15px,1.5vw,17px);line-height:1.6;color:#d9d6cf;max-width:34em}
.lx-print__steps{list-style:none;margin:0 0 22px;padding:0;display:grid;gap:12px}
.lx-print__steps li{display:grid;grid-template-columns:34px 1fr;gap:12px;align-items:start;font-size:14.5px;line-height:1.45;color:#d9d6cf}
.lx-print__steps li span{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;border:1px solid #c9a35f;color:#e5c98f;font-weight:700;font-size:14px}
.lx-print__steps b{display:block;color:#fff;font-size:15.5px}
.lx-print__chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px}
.lx-print__chip{display:inline-flex;gap:6px;align-items:baseline;padding:8px 14px;border-radius:999px;background:#ffffff14;border:1px solid #ffffff26;color:#f4f2ee;font-size:13.5px;text-decoration:none;transition:background .35s ease,border-color .35s ease}
.lx-print__chip b{font-weight:700;color:#fff}
.lx-print__chip:hover,.lx-print__chip:focus-visible{background:#ffffff26;border-color:#e5c98f}
.lx-print__cta{display:flex;flex-wrap:wrap;gap:14px 22px;align-items:center;margin:0 0 18px}
.lx-print__btn{display:inline-block;padding:15px 30px;border-radius:999px;background:#c9a35f;color:#17161a;font-weight:700;font-size:15.5px;text-decoration:none;transition:background .35s ease,transform .35s ease}
.lx-print__btn:hover,.lx-print__btn:focus-visible{background:#e5c98f;transform:translateY(-2px)}
.lx-print__link{color:#fff;font-size:14.5px;text-decoration:underline;text-underline-offset:3px}
.lx-print__note{margin:0;font-size:12.5px;line-height:1.5;color:#b8b4ab;max-width:44em}
.lx-print__grid{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-content:center}
.lx-print__k{position:relative;margin:0;border-radius:18px;overflow:hidden;background:#2a292e;aspect-ratio:4/5;box-shadow:0 14px 34px rgba(0,0,0,.35)}
.lx-print__k:nth-child(3n+2){transform:translateY(26px)}
.lx-print__k img{display:block;width:100%;height:100%;object-fit:cover;transition:transform 1.2s cubic-bezier(.2,.7,.2,1)}
.lx-print__k:hover img{transform:scale(1.05)}
.lx-print__k figcaption{position:absolute;left:10px;bottom:10px;padding:5px 12px;border-radius:999px;background:rgba(20,18,16,.72);color:#fff;font-size:12.5px;font-weight:600;backdrop-filter:blur(4px)}
.lx-print__cap{grid-column:1/-1;margin:34px 0 0;font-size:13px;line-height:1.4;color:#c4c0b7;text-align:right}
@media (max-width:989px){.lx-print__panel{grid-template-columns:1fr}.lx-print__grid{order:-1}.lx-print__k:nth-child(3n+2){transform:none}.lx-print__cap{margin-top:6px;text-align:left}}
@media (max-width:549px){.lx-print__chip{flex:1 1 calc(50% - 8px);justify-content:center}.lx-print__panel{border-radius:20px}.lx-print__grid{grid-template-columns:repeat(2,1fr);gap:10px}.lx-print__k:nth-child(n+5){display:none}.lx-print__btn{width:100%;text-align:center}}
@media (prefers-reduced-motion:reduce){.lx-print__k img,.lx-print__btn,.lx-print__chip{transition:none}}
</style>
<section class="lx-print" aria-labelledby="lx-print-h"><div class="lx-print__panel">
<div class="lx-print__text">
<p class="lx-print__eyebrow">Selbst gestalten · Foto &amp; Print</p>
<h2 class="lx-print__title" id="lx-print-h">Dein Foto. Dein Motiv.<br>Dein Unikat.</h2>
<p class="lx-print__lead">T-Shirts, Hoodies, Tassen, Taschen und Caps mit deinem eigenen Text, Namen oder Foto: als Geschenk, fürs Team oder nur für dich. Jedes Stück wird einzeln für dich gedruckt.</p>
<ol class="lx-print__steps">
<li><span>1</span><div><b>Produkt wählen</b>T-Shirt, Hoodie, Tasse, Tasche oder Cap.</div></li>
<li><span>2</span><div><b>Motiv hochladen</b>Dein Text, Name, Datum oder Foto.</div></li>
<li><span>3</span><div><b>Bestellen</b>Wir drucken dein Einzelstück und senden es dir zu.</div></li>
</ol>
<div class="lx-print__chips">
{%- assign lx_chips = 'klassisches-unisex-t-shirt-selbst-gestalten|T-Shirt,keramik-tasse-selbst-gestalten|Tasse,unisex-hoodie-selbst-gestalten|Hoodie,dad-cap-selbst-gestalten|Cap,bio-jutebeutel-selbst-gestalten|Jutebeutel' | split: ',' -%}
{%- for c in lx_chips -%}{%- assign cp = c | split: '|' -%}{%- assign cprod = all_products[cp[0]] -%}{%- if cprod.title != blank -%}<a class="lx-print__chip" href="{{ cprod.url }}"><b>{{ cp[1] }}</b> {% if cprod.price_varies %}ab {% endif %}{{ cprod.price_min | money }}</a>{%- endif -%}{%- endfor -%}
</div>
<div class="lx-print__cta"><a class="lx-print__btn" href="/collections/selbst-gestalten">Jetzt gestalten</a><a class="lx-print__link" href="/pages/selbst-gestalten">So funktioniert&#8217;s</a></div>
<p class="lx-print__note">Ehrliche Lieferzeit: Druck ca. 2–5 Werktage (in Europa) plus Versand ca. 3–9 Werktage, je nach Produkt insgesamt ca. 7–20 Werktage. Das genaue Lieferdatum zeigt die Produktseite. Personalisierte Artikel sind von der Rückgabe ausgenommen, <a href="/pages/rueckgabe" style="color:inherit">Details zur Rückgabe</a>.</p>
</div>
<div class="lx-print__grid">__KACHELN__<p class="lx-print__cap">Beispielbilder, mit KI erstellt: so kann ein Design aussehen. Dein eigenes siehst du als Vorschau im Editor.</p></div>
</div></section>'''.replace('__KACHELN__', KACHELN)

# ───────────────────────── Index bauen ─────────────────────────
kopf, ix = lies('templates/index.json')
S = ix['sections']

# Hero
h = S['hero_jVaWmY']
hs = h['settings']
hs.update({
    'media_type_1': 'video', 'video_1': 'shopify://files/videos/lx-hero-wand-desktop-2710e.mp4',
    'media_type_1_mobile': 'video', 'video_1_mobile': 'shopify://files/videos/lx-hero-wand-mobil-2710e.mp4',
    'custom_mobile_media': True,
    'section_height': 'custom', 'section_height_custom': 78,
    'toggle_overlay': False,
    'padding-block-start': 56, 'padding-block-end': 48,
})
h['blocks']['text_YLPk4p']['settings']['text'] = '<h1>Schön leben.<br>Schlau shoppen.</h1>'
# Textblöcke bündig mit dem Knopf (Prüfung 27.10.: 24 px Einzug), Zahl nach Messung: 1'653 von 2'371 Artikeln mit Schweizer-Lager-Tag sind lieferbar
for k in ('text_YLPk4p', 'text_fakten'):
    h['blocks'][k]['settings']['padding-inline-start'] = 0
    h['blocks'][k]['settings']['padding-inline-end'] = 0
h['blocks']['text_fakten']['settings']['text'] = ("<p><strong>🇨🇭 Über 1'500 Artikel ab Schweizer Lager</strong><br>"
    "<strong>📦 Die meisten übrigen direkt ab Lieferantenlager</strong> · ca. 10⁠–⁠20 Werktage</p>")
h['blocks']['button_H9gpTf']['settings'].update({'label': 'Alle Kategorien entdecken', 'link': 'shopify://pages/alle-kategorien'})

# USP, Willkommen
S['lux_usp']['settings']['custom_liquid'] = USP
S['lux_willkommen'] = {'type': 'custom-liquid', 'name': 'Willkommen', 'settings': {'custom_liquid': WILLKOMMEN}}

# Print statt Trend-Block, Banner entfällt
S['lux_print'] = {'type': 'custom-liquid', 'name': 'Selbst gestalten: Foto & Print', 'settings': {'custom_liquid': PRINT}}
del S['lux_spotlight_video']
del S['banner_selbst_gestalten']

order = []
for k in ix['order']:
    if k == 'lux_spotlight_video': order.append('lux_print')
    elif k == 'banner_selbst_gestalten': continue
    else: order.append(k)
    if k == 'lux_usp': order.append('lux_willkommen')
ix['order'] = order
assert len(order) <= 25, len(order)
assert set(order) == set(S), set(order) ^ set(S)
schreibe('templates/index.json', kopf, ix)

# scheme-2: neutral statt Beige
kopf2, sd = lies('config/settings_data.json')
cs = sd['current']['color_schemes']['scheme-2']['settings']
cs.update({'background': '#f0f0ee', 'border': '#2c2c2c24', 'secondary_button_hover_background': '#ffffffb0',
           'input_background': '#ffffff', 'variant_background_color': '#ffffff', 'input_hover_background': '#ffffffb0'})
schreibe('config/settings_data.json', kopf2, sd)

# hero.liquid: Poster aus der Vorschau des Videos (kein leeres Rechteck vor dem ersten Bild)
hl = open(f'{SRC}/sections/hero.liquid', encoding='utf-8').read()
n0 = hl.count('poster: nil,')
hl2 = hl.replace("section.settings.video_1\n        | video_tag:\n          poster: nil,", "section.settings.video_1\n        | video_tag:\n          image_size: '1600x',")
hl2 = hl2.replace("section.settings.video_1_mobile\n          | video_tag:\n            poster: nil,", "section.settings.video_1_mobile\n          | video_tag:\n            image_size: '1000x',")
print('poster: nil Treffer', n0, '→ ersetzt', hl.count('poster: nil,') - hl2.count('poster: nil,'))
os.makedirs(f'{DST}/sections', exist_ok=True)
open(f'{DST}/sections/hero.liquid', 'w', encoding='utf-8').write(hl2)
print('index.json', len(order), 'Abschnitte; order:', order)
