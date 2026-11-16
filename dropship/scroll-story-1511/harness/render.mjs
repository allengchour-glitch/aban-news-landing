// Rendert sections/lx-story.liquid lokal mit LiquidJS (Shopify-Filter nachgebildet) und echten Produktdaten aus der Admin-API.
// Aufruf: node harness/render.mjs <theme-ordner> <aus.html> [fall]   fall: normal | fr | ausverkauft | ohne_video | fremd_cdn | eins
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('/tmp/ci_sim_lb_tmp/lq/');
const { Liquid } = require('liquidjs');
const HIER = path.dirname(new URL(import.meta.url).pathname);
const BASIS = path.join(HIER, '..');

export function engine(theme) {
  const eng = new Liquid({ root: [path.join(theme, 'sections'), path.join(theme, 'snippets')], extname: '.liquid', strictFilters: true, jsTruthy: false });
  eng.registerFilter('money_with_currency', (c) => 'CHF ' + (Number(c) / 100).toFixed(2));
  eng.registerFilter('image_url', (img, ...a) => (img && img.src ? img.src : String(img || '')) + (String(img).includes('?') ? '&' : '?') + 'width=240');
  eng.registerFilter('image_tag', (url) => `<img src="${url}" alt="" loading="lazy" width="240" height="240">`);
  eng.registerFilter('asset_url', (n) => 'https://luxestyle.ch/cdn/shop/t/29/assets/' + n + '?v=lokal');
  eng.registerFilter('stylesheet_tag', (u) => `<link href="${u}" rel="stylesheet" type="text/css" media="all" />`);
  // {% stylesheet %}: Shopify lädt den Inhalt im <head>. Hier mit Marken ausgeben; der Nachbau verschiebt ihn in den <head>.
  eng.registerTag('stylesheet', { parse(t, r) { this.tpls = []; const s = this.liquid.parser.parseStream(r); s.on('tag:endstylesheet', () => s.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('stylesheet ohne Ende'); }); s.start(); }, * render(ctx, emitter) { const html = yield this.liquid.renderer.renderTemplates(this.tpls, ctx); emitter.write('<!--LXCSS-->' + (html || '') + '<!--/LXCSS-->'); } });
  eng.registerTag('schema', { parse(t, r) { const s = this.liquid.parser.parseStream(r); s.on('tag:endschema', () => s.stop()).on('template', () => {}).on('end', () => { throw new Error('schema ohne Ende'); }); s.start(); }, * render() { return ''; } });
  return eng;
}

export function produktAus(admin, handle, ueber = {}) {
  const p = admin[handle];
  if (!p) return null;
  const bild = (u) => (u ? { src: u } : null);
  const variants = p.variants.nodes.map((v) => ({
    id: Number(v.id.split('/').pop()), title: v.title, price: Math.round(Number(v.price) * 100), available: v.availableForSale,
    url: `/products/${handle}?variant=${v.id.split('/').pop()}`, featured_image: bild(v.image && v.image.url),
  }));
  const o = { handle, title: p.title, available: variants.some((v) => v.available), variants, featured_image: bild(p.featuredImage && p.featuredImage.url), url: '/products/' + handle };
  return Object.assign(o, ueber);
}

export function sectionDaten(fall = 'normal') {
  const admin = JSON.parse(fs.readFileSync(path.join(BASIS, 'produkte_admin.json'), 'utf8'));
  const kap = JSON.parse(fs.readFileSync(path.join(BASIS, 'kapitel.json'), 'utf8'));
  const medien = JSON.parse(fs.readFileSync(path.join(BASIS, fs.existsSync(path.join(BASIS, 'medien.json')) ? 'medien.json' : 'medien_lokal.json'), 'utf8'));
  const blocks = kap.map((k, i) => {
    const m = medien[k.id];
    let produkt = produktAus(admin, k.produkt);
    const s = { ...k, ...m, produkt };
    delete s.id;
    if (fall === 'ausverkauft' && i === 1) produkt.variants = produkt.variants.map((v) => (String(v.id) === k.variante ? { ...v, available: false } : v));
    if (fall === 'produkt_weg' && i === 2) s.produkt = null;
    if (fall === 'ohne_video' && i === 0) { s.video_quer = ''; s.video_hoch = ''; }
    if (fall === 'fremd_cdn' && i === 3) s.poster_quer = 'https://example.com/x.webp';
    if (fall === 'fremd_video' && i === 4) s.video_quer = 'https://example.com/x.mp4';
    if (fall === 'abgelaufen' && i === 2) s.bis = '2026-01-01';
    if (fall === 'ohne_varzeile') s.variante_zeigen = false;
    return { id: 'kapitel_' + (i + 1), type: 'kapitel', settings: s, shopify_attributes: '' };
  });
  let bl = blocks;
  if (fall === 'eins') bl = blocks.slice(0, 1);
  return { section: { id: 'template--lokal__lx_story', settings: { platz: 'nach_hero', titel: 'Sechs Kapitel aus unserem Sortiment', titel_fr: 'Six chapitres de notre sélection' }, blocks: bl },
    request: { locale: { iso_code: fall === 'fr' ? 'fr' : 'de' } }, template: { name: 'index', suffix: 'lxstory' } };
}

export async function render(theme, fall) {
  const eng = engine(theme);
  if (fall === 'platz') return eng.renderFile('lx-story-platz', { section: { id: 'x', settings: { kapitel: 6 } } });
  return eng.renderFile('lx-story', sectionDaten(fall));
}

if (process.argv[1] && process.argv[1].endsWith('render.mjs')) {
  const [theme, aus, fall] = process.argv.slice(2);
  const html = await render(theme || path.join(BASIS, 'theme'), fall || 'normal');
  if (!aus || aus === '-' || aus === '/dev/stdout') process.stdout.write(html); else { fs.writeFileSync(aus, html); console.log('geschrieben', aus, html.length); }
}
