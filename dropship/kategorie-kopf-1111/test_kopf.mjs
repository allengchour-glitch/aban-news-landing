// Offline-Test der neuen Snippets mit LiquidJS (nicht Shopify-Liquid; live wird nachgemessen).
// Aufruf: /opt/node22/bin/node test_kopf.mjs [--alle]   (--alle: alle 1 723 echten Beschreibungen aus banner1111/technik/desc_html.json)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { Liquid } = require('/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/editor_theme/lj/node_modules/liquidjs/dist/liquid.node.cjs.js');
const D = process.env.LXK_DIR || '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/kopf1111/neu/snippets/';
const engine = new Liquid({ strictFilters: true });
const kw = args => Object.fromEntries(args.filter(Array.isArray));
engine.registerFilter('image_url', (img, ...a) => `//cdn.test/${img.src}?width=${kw(a).width}`);
engine.registerFilter('asset_url', s => `//cdn.test/assets/${s}`);
const KOPF = readFileSync(D + 'lx-kopf-kompakt.liquid', 'utf8');
const CHIPS = readFileSync(D + 'lx-kopf-chips.liquid', 'utf8');
let ok = 0, fehl = 0;
const pruef = (name, bed, info = '') => { if (bed) ok++; else { fehl++; console.log('FEHLER', name, info); } };
const prod = (id, o = {}) => ({ id, available: o.available ?? true, featured_image: o.bild === null ? null : { src: `p${id}.jpg`, width: o.breite ?? 800 } });
const coll = o => ({ id: 1, handle: o.handle ?? 'test', title: o.title ?? 'Test', url: '/collections/' + (o.handle ?? 'test'), description: o.description ?? '', products: o.products ?? [], all_tags: o.tags ?? [], metafields: o.metafields ?? { luxe: {}, lux: {} } });
const kopf = async c => engine.parseAndRender(KOPF, { collection: c, linklists: {}, current_tags: [] });
const zwischen = (s, a, b) => { const i = s.indexOf(a); if (i < 0) return null; const j = s.indexOf(b, i + a.length); return j < 0 ? null : s.slice(i + a.length, j); };

// --- Beschreibung: Aufteilung ---
async function teilung(desc) {
  const h = await kopf(coll({ description: desc }));
  const anrissDiv = zwischen(h, '<div class="lx-kk__anriss">', '</div><details') ?? zwischen(h, '<div class="lx-kk__anriss">', '</div>\n');
  const anrissText = h.includes('<p class="lx-kk__anriss" aria-hidden="true">');
  const KN = '</div><button type="button" class="lx-kk__schliessen">Weniger anzeigen</button></details>';
  const ende = h.includes(KN) ? h.indexOf(KN) : h.lastIndexOf('</div></details>');
  const rest = h.includes('<div class="lx-kk__rest">') ? h.slice(h.indexOf('<div class="lx-kk__rest">') + 25, ende) : null;
  return { h, anrissDiv, anrissText, rest, details: h.includes('<details class="lx-kk__mehr">'), knopfUnten: h.includes(KN), nurAnriss: /class="lx-kk__beschr[^"]*lx-kk__beschr--nur-anriss/.test(h) };
}
const MARK = '<!--gd2-->\n<!-- ls-verwandt --><p class="ls-verwandt"><strong>Passend dazu:</strong> <a href="/products/x">X</a></p><!-- /ls-verwandt -->';
{
  const d = '<p>Erster Absatz mit genug Text, damit er laenger als eine Zeile ist.</p><p><strong>So wählst du:</strong> Länge.</p>' + MARK;
  const t = await teilung(d);
  pruef('A1 Anriss = erster Absatz', t.anrissDiv === '<p>Erster Absatz mit genug Text, damit er laenger als eine Zeile ist.</p>', t.anrissDiv);
  pruef('A1 Rest + Anriss = Beschreibung', t.anrissDiv + t.rest === d);
  pruef('A1 Marker im Rest', t.rest.includes('<!-- ls-verwandt -->') && t.rest.includes('<!--gd2-->'));
  pruef('A1 details da', t.details && t.h.includes('Mehr anzeigen') && t.h.includes('Weniger anzeigen'));
  pruef('A1 keine Textkopie', !t.anrissText);
  pruef('A1 zweiter Knopf unten (Rest vorhanden), nicht nur-anriss', t.knopfUnten && !t.nurAnriss);
}
{
  const d = '<p>Weihnachten mit <a href="/collections/a">Link</a> im ersten Absatz.</p><h2>Mehr</h2><p>Text</p>' + MARK;
  const t = await teilung(d);
  pruef('A2 Link im Anriss -> Textkopie aria-hidden', t.anrissText && t.h.includes('aria-hidden="true">Weihnachten mit Link im ersten Absatz.</p>'));
  pruef('A2 details enthaelt ganze Beschreibung', t.rest === d, t.rest);
  pruef('A2 kein Link ausserhalb details', !t.h.slice(0, t.h.indexOf('<details')).includes('href="/collections/a"'));
  pruef('A2 Link-Fall: nicht nur-anriss', !t.nurAnriss && t.knopfUnten);
}
{
  const d = '<p>Poloshirts und Polohemden für Herren in Kurzarm und Langarm.</p>';
  const t = await teilung(d);
  pruef('A3 kurzer Einzelabsatz: details (Handy), Desktop kurz', t.details && t.h.includes('lx-kk__beschr--kurz') && t.rest === '', t.rest);
  pruef('A3 Einzelabsatz: nur-anriss, kein Knopf unten', t.nurAnriss && !t.knopfUnten);
}
{
  const d = '<p>Kurz und knapp.</p>';
  const t = await teilung(d);
  pruef('A4 sehr kurz: kein details', !t.details && t.anrissDiv !== null && !t.nurAnriss);
}
{
  const d = '<div>Ohne Absatz am Anfang</div><p>zweiter</p>';
  const t = await teilung(d);
  pruef('A5 ohne <p>: kein Anriss, alles im details', t.anrissDiv === null && t.rest === d && t.h.includes('Beschreibung anzeigen') && t.h.includes('lx-kk__beschr--ohne-anriss'));
  pruef('A5 ohne Anriss: nicht nur-anriss', !t.nurAnriss);
}
{
  const t = await teilung('');
  pruef('A6 leer: kein Beschreibungsblock', !t.h.includes('<div class="lx-kk__beschr') && t.h.includes('<h1 class="lx-kk__h1">Test</h1>'));
}
{
  const d = '<p>Kein Ende des Absatzes';
  const t = await teilung(d);
  pruef('A7 ohne </p>: nichts doppelt', (t.h.split('Kein Ende').length - 1) === 1, t.h);
}
{
  const d = '<p>&nbsp;</p><p>Echter Text, der lang genug ist, um eingeklappt zu werden, ja.</p>';
  const t = await teilung(d);
  pruef('A8 leerer erster Absatz: kein Anriss, alles im details', t.anrissDiv === null && t.rest === d);
}
{
  const d = '\n<p class="x">Mit Klasse am Absatz, lang genug fuer zwei Zeilen am Handy.</p><p>b</p>';
  const t = await teilung(d);
  pruef('A9 <p class> und fuehrender Umbruch', t.anrissDiv + t.rest === d, JSON.stringify(t.anrissDiv));
}
{
  const d = '<pre>code</pre><p>x</p>';
  const t = await teilung(d);
  pruef('A10 <pre> ist kein Absatz', t.anrissDiv === null && t.rest === d);
}

// --- Fotos ---
{
  const ps = [prod(1, { available: false }), prod(2), prod(3, { breite: 400 }), prod(4, { bild: null }), prod(5), prod(6), prod(7), prod(8)];
  const h = await kopf(coll({ products: ps }));
  const ids = [...h.matchAll(/p(\d+)\.jpg\?width=720"/g)].map(m => m[1]);
  pruef('B1 nur lieferbar, Bild >= 500, max 4', JSON.stringify(ids) === '["2","5","6","7"]', JSON.stringify(ids));
  pruef('B1 Handy-Quelle 1-px-GIF vor jedem Bild', (h.match(/<source media="\(max-width: 749px\)" srcset="data:image\/gif;base64,/g) || []).length === 4);
  pruef('B1 eager nur 1 und 2', (h.match(/loading="eager"/g) || []).length === 2 && (h.match(/loading="lazy"/g) || []).length === 2);
  pruef('B1 srcset + sizes', h.includes('360w,') && h.includes('1080w"') && h.includes('sizes="(min-width: 750px) 25vw, 1px"'));
}
{
  const mf = { luxe: { kopf_produkte: { value: [prod(9), null, prod(10, { available: false }), prod(2)] } }, lux: {} };
  const h = await kopf(coll({ products: [prod(2), prod(5), prod(6), prod(7)], metafields: mf }));
  const ids = [...h.matchAll(/p(\d+)\.jpg\?width=720"/g)].map(m => m[1]);
  pruef('B2 Metafeld zuerst, ohne Doppel, ohne nicht lieferbar', JSON.stringify(ids) === '["9","2","5","6"]', JSON.stringify(ids));
  pruef('B2 jedes Bild mit Handy-Quelle (Metafeld-Zweig)', (h.match(/<source media="\(max-width: 749px\)" srcset="data:image\/gif;base64,/g) || []).length === 4 && (h.match(/<img /g) || []).length === 4);
}
{
  const h = await kopf(coll({ handle: 'schuhe', products: [prod(2)] }));
  pruef('B3 schuhe: Theme-Bild mit Handy-Quelle', h.includes('kategorie-banner-schuhe.jpg') && h.includes('<picture class="lx-kk__eins"><source media="(max-width: 749px)"') && !h.includes('p2.jpg'));
}
{
  const h = await kopf(coll({ products: [] }));
  pruef('B4 ohne Fotos: Klasse ohne-bild', h.includes('lx-kk lx-kk--ohne-bild'));
}


// --- CSS-Struktur (Pruefrunde 12.11.): Kuerzung/Deckel nur mit :has(), Tippflaeche, JS-Klassen ---
const blocke = (css, kopf) => { const out = []; let i = 0; while ((i = css.indexOf(kopf, i)) >= 0) { let j = css.indexOf('{', i) + 1, tiefe = 1; const a = j; while (tiefe && j < css.length) { if (css[j] === '{') tiefe++; else if (css[j] === '}') tiefe--; j++; } out.push(css.slice(a, j - 1)); i = j; } return out; };
const ohneBloecke = (css, kopf) => { let r = css; for (const b of blocke(css, kopf)) r = r.split(b).join(''); return r; };
{
  const css = zwischen(KOPF, '<style>', '</style>');
  const hasB = blocke(css, '@supports selector(:has(*))').join('\n');
  const ausser = ohneBloecke(css, '@supports selector(:has(*))');
  pruef('K1 line-clamp nur innerhalb @supports selector(:has(*))', !/line-clamp/.test(ausser) && /line-clamp:2/.test(hasB) && /line-clamp:1/.test(hasB));
  pruef('K1 max-height:300px nur innerhalb @supports', !/max-height:300px/.test(ausser) && /\.lx-kk\{max-height:300px\}/.test(hasB));
  pruef('K1 :has( nur innerhalb @supports', !/:has\(details/.test(ausser));
  pruef('K1 Summary absolut nur innerhalb @supports', !/summary\{position:absolute/.test(ausser) && /:not\(\[open\]\)>summary\{position:absolute;right:0;bottom:0/.test(hasB));
  pruef('K2 ohne :has(): nur-anriss blendet Knopf aus', /@supports not selector\(:has\(\*\)\)\{\.lx-kk__beschr--nur-anriss \.lx-kk__mehr\{display:none\}\}/.test(css));
  const mob = blocke(css, '@media (max-width:749px)').join('\n');
  pruef('K3 Tippflaeche ::before nur am Handy, Summary dort positioniert', /summary::before\{content:"";position:absolute;inset:-6px -6px\}/.test(mob) && !/summary::before/.test(ohneBloecke(css, '@media (max-width:749px)')) && /\.lx-kk__mehr>summary\{position:relative/.test(mob));
  pruef('K5 Link-Fall ohne :has(): Kopie per JS-Klasse aus (Regel ausserhalb @supports)', ausser.includes('.lx-kk--offen p.lx-kk__anriss{display:none}') && KOPF.includes("k.classList.toggle('lx-kk--offen',d.open)") && KOPF.includes("addEventListener('toggle'"));
  pruef('K4 Knopf unten nur mit JS und offen', /\.lx-kk__schliessen\{display:none/.test(css) && css.includes('.lx-kk-js .lx-kk__mehr[open] .lx-kk__schliessen{display:inline-block}') && KOPF.includes("classList.add('lx-kk-js')"));
}
{
  const css = zwischen(CHIPS, '<style>', '</style>');
  const iS = CHIPS.indexOf("<script>document.documentElement.classList.add('lx-kc-js')</script>"), iN = CHIPS.indexOf('<nav class="lx-kc"');
  pruef('CJ1 JS-Klasse wird VOR der Leiste gesetzt', iS > 0 && iS < iN);
  pruef('CJ2 Ausblenden am Desktop nur mit JS-Klasse', css.includes('.lx-kc-js .lx-kc__zeile:not(.ist-offen)>.lx-kc__x{display:none}') && !/[^-]\.lx-kc__zeile:not\(\.ist-offen\)>\.lx-kc__x/.test(css.replace('.lx-kc-js .lx-kc__zeile', '')));
  pruef('CJ3 Knopf ohne JS unsichtbar', /\.lx-kc__auf\{[^}]*display:none\}/.test(css) && css.includes('.lx-kc-js .lx-kc__auf{display:inline-block}'));
  pruef('CJ4 Handy rollt zum aktiven Chip (Reihenfolge Filter, Unterkategorie, Nachbar)', CHIPS.includes("r.querySelector('.lx-kc__f--akt')||r.querySelector('.lx-kc__u[aria-current]')||r.querySelector('.lx-kc__t[aria-current]')"));
}

// --- Chips ---
const menu = (gruppen) => ({ 'main-menu': { links: gruppen } });
const L = (title, url, links = []) => ({ title, url, links });
async function chips(c, linklists, current_tags = []) { return engine.parseAndRender(CHIPS, { collection: c, linklists, current_tags }); }
{
  const sibs = ['Kleider', 'T-Shirts & Langarmshirts', 'Tops & Oberteile', 'Blusen & Hemden', 'Pullover & Strick', 'Strickjacken & Cardigans', 'Hoodies & Sweatshirts', 'Hosen', 'Jeans', 'Shorts', 'Röcke', 'Jumpsuits & Overalls'].map((t, i) => L(t, i === 0 ? '/collections/damen-kleider' : '/collections/s' + i));
  const ll = menu([L('Damen', '/collections/damen', sibs)]);
  const uf = Array.from({ length: 26 }, (_, i) => ({ id: 100 + i, title: 'Unterfilter Nummer ' + i, url: '/collections/uf' + i }));
  const c = coll({ handle: 'damen-kleider', title: 'Kleider', tags: ['neu', 'damen', 'schmuck', 'kinder'], metafields: { luxe: {}, lux: { unterfilter: { value: uf } } } });
  c.url = '/collections/damen-kleider';
  const h = await chips(c, ll);
  pruef('C1 alle 26 Unterfilter im HTML', (h.match(/class="lx-kc__u[ "]/g) || []).length === 27);
  pruef('C1 Ausgeblendete Unterfilter + Knopf', h.includes('lx-kc__u lx-kc__x') && /Alle anzeigen \(\+\d+\)/.test(h));
  pruef('C1 Filter Welt Damen: neu, damen, schmuck (nicht kinder)', h.includes('>✨ Neu<') && h.includes('>Damen<') && h.includes('>Schmuck<') && !h.includes('>Kinder<'));
  pruef('C1 Nachbarn alle 12 im HTML', (h.match(/class="lx-kc__t[ "]/g) || []).length === 12);
  pruef('C1 aktuelle Kategorie nie ausgeblendet', /class="lx-kc__t" href="\/collections\/damen-kleider" aria-current="page"/.test(h), h.match(/<a class="lx-kc__t[^>]*damen-kleider[^>]*>/)?.[0]);
  pruef('C1 Knopf Kategorien', h.includes('Alle 12 Kategorien'));
  pruef('C1 Skript da', h.includes('<script>(function(){var n=document.currentScript'));
  // Budget: sichtbare Breite Zeile A <= 1000
  const a = zwischen(h, 'id="lx-kc-a">', '</div>');
  const sicht = [...a.matchAll(/<a [^>]*class="(lx-kc__[uf][^"]*)"[^>]*>([^<]*)</g)].filter(m => !m[1].includes('lx-kc__x'));
  const breite = sicht.reduce((s, m) => s + Math.floor(m[2].length * 8.3) + 38, 0) + 84 + 150;
  pruef('C1 Zeile A sichtbar <= 1000 px (Schaetzung)', breite <= 1000 + 40, breite);
}
{
  const sibs = Array.from({ length: 20 }, (_, i) => L('Nachbar-Kategorie ' + i, '/collections/n' + i));
  sibs.push(L('Aktuelle Kategorie', '/collections/aktuell'));
  const c = coll({ handle: 'aktuell', title: 'Aktuell' }); c.url = '/collections/aktuell';
  const h = await chips(c, menu([L('Welt', '/collections/welt', sibs)]));
  pruef('C1b aktuelle Kategorie hinten bleibt sichtbar', /class="lx-kc__t" href="\/collections\/aktuell" aria-current="page"/.test(h), h.match(/<a class="lx-kc__t[^>]*aktuell[^>]*>/)?.[0]);
  pruef('C1b hintere Nachbarn ausgeblendet', h.includes('class="lx-kc__t lx-kc__x" href="/collections/n19"'));
}
{
  // aktiver Filter bleibt sichtbar, auch wenn er hinten steht
  const ll = menu([L('Saison', '/collections/sp', [L('Weihnachten', '/collections/weihnachten-2026'), L('B', '/collections/b')])]);
  const tags = ['neu', 'damen', 'herren', 'kinder', 'baby', 'kleid', 'pullover', 'guertel', 'schmuck', 'armband', 'beauty', 'naegel', 'elektronik', 'gadget', 'kueche', 'wohnen', 'geschenk', 'ch-lager', 'sport', 'kostuem', 'halloween'];
  const c = coll({ handle: 'weihnachten-2026', tags }); c.url = '/collections/weihnachten-2026';
  const h = await chips(c, ll, ['ch-lager']);
  pruef('C2 aktiver Filter sichtbar mit ✕', /class="lx-kc__f lx-kc__f--akt"[^>]*>⚡ Ab CH-Lager ✕</.test(h), h.match(/<a[^>]*>⚡ Ab CH-Lager[^<]*</)?.[0]);
  pruef('C2 Ziel des aktiven Filters = Sammlung', h.includes('href="/collections/weihnachten-2026" rel="nofollow" class="lx-kc__f lx-kc__f--akt"'));
  pruef('C2 inaktiver Filter haengt an aktive an', h.includes('href="/collections/weihnachten-2026/ch-lager+neu"'));
  pruef('C2 Ueberlauf vorhanden (Test greift)', h.includes('lx-kc__f lx-kc__x') && /Alle anzeigen \(\+\d+\)/.test(h));
  pruef('C2 Filtern-Label ohne Unterfilter', h.includes('<span class="lx-kc__label">Filtern:</span>'));
}
{
  const c = coll({ handle: 'leer', tags: [] }); c.url = '/collections/leer';
  const h = await chips(c, menu([]));
  pruef('C3 nichts zu zeigen: keine Ausgabe', h.trim() === '', JSON.stringify(h.slice(0, 80)));
}
{
  // Vergleich mit der alten Filterlogik: gleiche Ziele wie lux_subchips (aus collection.json)
  const alt = JSON.parse(readFileSync('/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/kopf1111/theme/templates/collection.json', 'utf8').replace(/^[^{]*/, '')).sections.lux_subchips.settings.custom_liquid;
  const ll = menu([L('Herren', '/collections/herren', [L('Hemden', '/collections/h1'), L('Poloshirts', '/collections/herren-poloshirts'), L('Jeans', '/collections/h3')])]);
  const uf = [{ id: 7, title: 'Kurzarm', url: '/collections/k' }, { id: 8, title: 'Langarm', url: '/collections/l' }];
  for (const ct of [[], ['herren'], ['herren', 'neu']]) {
    const c = coll({ handle: 'herren-poloshirts', title: 'Poloshirts', tags: ['neu', 'herren', 'damen', 'jacke', 'hemd'], metafields: { luxe: {}, lux: { unterfilter: { value: uf } } } }); c.url = '/collections/herren-poloshirts';
    const hn = await chips(c, ll, ct); const ha = await engine.parseAndRender(alt, { collection: c, linklists: ll, current_tags: ct });
    const z = s => [...s.matchAll(/href="([^"]+)"/g)].map(m => m[1]).sort().join(' ');
    pruef('C4 gleiche Linkziele wie lux_subchips ' + JSON.stringify(ct), z(hn) === z(ha), '\nneu ' + z(hn) + '\nalt ' + z(ha));
  }
}

// --- Pfad (Korrektur 15.11.): JSON-LD, Desktop-Text und Links wie lux_breadcrumb; am Handy nur der Eltern-Link ---
{
  const PFAD = readFileSync(D + 'lx-kopf-pfad.liquid', 'utf8');
  const CJ = readFileSync('/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/kopf1111/theme/templates/collection.json', 'utf8');
  const altBc = JSON.parse(CJ.slice(CJ.indexOf('{'))).sections.lux_breadcrumb.settings.custom_liquid;
  const ll = { 'main-menu': { links: [{ title: 'Schmuck & Uhren', url: '/collections/schmuck', links: [{ title: 'Ohrringe', url: '/collections/ohrringe', links: [{ title: 'Creolen', url: '/collections/creolen-ohrclips', links: [] }] }] }] } };
  const faelle = [['drei Ebenen', { title: 'Creolen & Ohrclips', url: '/collections/creolen-ohrclips' }, true], ['zwei Ebenen', { title: 'Ohrringe', url: '/collections/ohrringe' }, true], ['ohne Menue', { title: 'Lose "Sammlung"', url: '/collections/lose' }, false]];
  const ld = s => zwischen(s, '<script type="application/ld+json">', '</script>');
  const nav = s => zwischen(s, '<nav', '</nav>');
  const txt = s => nav(s).replace(/^[^>]*>/, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const hrefs = s => [...nav(s).matchAll(/href="([^"]+)"/g)].map(m => m[1]).join(' ');
  for (const [name, c, eltern] of faelle) {
    const ctx = { collection: c, linklists: ll, routes: { root_url: '/' }, shop: { url: 'https://luxestyle.ch' } };
    const hn = await engine.parseAndRender(PFAD, ctx), ha = await engine.parseAndRender(altBc, ctx);
    pruef('P1 JSON-LD gleich lux_breadcrumb (' + name + ')', ld(hn) !== null && ld(hn) === ld(ha), ld(hn));
    pruef('P2 sichtbarer Pfadtext gleich (' + name + ')', txt(hn) === txt(ha), txt(hn) + ' | ' + txt(ha));
    pruef('P2b gleiche Links in gleicher Reihenfolge (' + name + ')', hrefs(hn) === hrefs(ha), hrefs(hn) + ' | ' + hrefs(ha));
    const weg = (nav(hn).match(/class="lx-kp__weg"/g) || []).length;
    if (eltern) pruef('P3 mit Eltern: Home, beide Trenner, Titel am Handy weg; Eltern-Link bleibt (' + name + ')', weg === 4 && /<a href="\/" class="lx-kp__weg">Home<\/a>/.test(hn) && /<a href="[^"]+" class="lx-kp__hoch">/.test(hn) && /<span aria-current="page" class="lx-kp__weg">/.test(hn), weg);
    else pruef('P3 ohne Eltern: Home bleibt als Ruecklink, Titel weg', weg === 2 && /<a href="\/" class="lx-kp__hoch">Home<\/a>/.test(hn), weg);
  }
  const css = PFAD.split('<style>').slice(1).map(x => x.split('</style>')[0]).join('\n');
  const mob = blocke(css, '@media (max-width:749px)').join('\n');
  pruef('P4 Ausblenden nur am Handy', mob.includes('.lx-kp .lx-kp__weg{display:none}') && !ohneBloecke(css, '@media (max-width:749px)').includes('lx-kp__weg'));
}

// --- alle echten Beschreibungen ---
if (process.argv.includes('--alle')) {
  const alle = JSON.parse(readFileSync(process.env.LXK_DESC || '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/banner1111/technik/desc_html.json', 'utf8'));
  let n = 0, art = { echt: 0, text: 0, ohne: 0, kein: 0, kurzOhneDetails: 0 }, schlecht = [];
  for (const [h, v] of Object.entries(alle)) {
    const d = v.descriptionHtml || ''; if (!d.trim()) continue; n++;
    const t = await teilung(d);
    let gut;
    if (t.anrissText) { art.text++; gut = t.rest === d; }
    else if (t.anrissDiv !== null && t.details) { art.echt++; gut = t.anrissDiv + t.rest === d; }
    else if (t.anrissDiv !== null) { art.kurzOhneDetails++; gut = t.anrissDiv === d || (t.h.includes(t.anrissDiv) && t.h.includes(d.slice(t.anrissDiv.length))); }
    else if (t.details) { art.ohne++; gut = t.rest === d; }
    else { art.kein++; gut = false; }
    if (d.includes('ls-verwandt') && !t.h.includes('<!-- ls-verwandt -->') && !t.h.includes('ls-verwandt')) gut = false;
    if (!gut) schlecht.push(h);
  }
  pruef('D alle echten Beschreibungen vollstaendig und ohne Verlust', schlecht.length === 0, schlecht.slice(0, 10).join(','));
  console.log('Beschreibungen', n, JSON.stringify(art));
}
console.log(`ok ${ok}, Fehler ${fehl}`);
process.exit(fehl ? 1 : 0);
