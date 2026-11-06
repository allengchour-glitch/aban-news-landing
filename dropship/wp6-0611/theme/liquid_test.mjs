// Prüft den Patch der Warenkorb-Miniatur (patches.mjs) mit ECHTEM Liquid gegen Attrappen der Shopify-Objekte: Ruby-Liquid (Referenz) und LiquidJS (Gegenprobe, läuft auch in der CI).
//   node dropship/wp6-0611/theme/liquid_test.mjs
// Umgebung: LIQUIDJS_DIR = Ordner, in dem «npm install liquidjs» lief · RUBY_LIQUID_GEMS = GEM_HOME mit «gem install liquid» (fehlt es, wird der Ruby-Teil übersprungen)
//   OHNE_LIQUID=1 nur die reinen Prüfungen von patches.mjs · OHNE_BROWSER=1 kein Chromium (Rückfall onerror, Platz der Miniatur) · NODE_PATH=$(npm root -g) für den Browserteil
// Was geprüft wird (alt = Ausgangsstand aus sicherung/, neu = anwenden(alt)):
//   A  patches.mjs rein: Anker je 1×, Soll-Text, Umkehrung, keine Doppelanwendung, Cloud-Name
//   B  Zeilen OHNE gültige _vorschau: Ausgabe von neu BYTE FÜR BYTE gleich alt (Seite und Schublade, alle Negativfälle, Angriffe)
//   C  Zeilen MIT gültiger _vorschau: ausser dem Bildfeld ist alles gleich alt; das Bildfeld trägt genau die Vorschau
//   D  Eigenschaften: _vorschau, _pod_karte, _Druckdatei erscheinen nirgends; «🎨 Design» bleibt; die alte «🖼️ Druckdatei» erscheint als Bild mit «Dein Entwurf ansehen», nie als Adresse
//   E  beide Liquid-Fassungen entscheiden bei jeder Adresse gleich; feste Cloud (VORSCHAU_CLOUD) verengt nur
//   F  Browser: Rückfall auf das Variantenbild bei Ladefehler, Miniatur belegt denselben Platz wie das Variantenbild
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { DATEI, MD5_VOR, MARKE, ERLAUBT, MAX_LAENGE, anwenden, zuruecknehmen, pruefeCloud } from './patches.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad';
const md5 = (s) => createHash('md5').update(s).digest('hex');
let n = 0, fehler = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);
const kopf = (t) => console.log('\n' + t);

const alt = fs.readFileSync(path.join(HIER, 'sicherung/snippets__cart-products.liquid.vor'), 'utf8');
const CLOUD = 'dwyi6kkrl';
const neu = anwenden(alt), neuPin = anwenden(alt, { cloud: CLOUD });

// ---------- A. reine Prüfungen ----------
kopf('A patches.mjs');
ok(md5(alt) === MD5_VOR, 'Sicherung gleich MD5_VOR');
ok(DATEI === 'snippets/cart-products.liquid', 'Zieldatei');
ok(neu.includes(MARKE) && neuPin.includes(MARKE), 'Marke im neuen Text');
ok(neu !== alt && neuPin !== neu, 'neu ≠ alt, mit fester Cloud ≠ ohne');
ok(neu.length - alt.length > 1500 && neu.length - alt.length < 6000, `Zuwachs plausibel (${neu.length - alt.length} Zeichen)`);
gleich(zuruecknehmen(neu), alt, 'Umkehrung ergibt den Ausgangsstand (ohne Cloud)');
gleich(zuruecknehmen(neuPin, { cloud: CLOUD }), alt, 'Umkehrung ergibt den Ausgangsstand (mit Cloud)');
let w = null; try { anwenden(neu); } catch (e) { w = e.message; } ok(w && /schon im Snippet/.test(w), 'zweites Anwenden wirft');
w = null; try { zuruecknehmen(alt); } catch (e) { w = e.message; } ok(w && /kommt 0×/.test(w), 'Umkehrung des Ausgangsstands wirft');
w = null; try { zuruecknehmen(neuPin); } catch (e) { w = e.message; } ok(w && /kommt 0×/.test(w), 'Umkehrung mit falscher Cloud wirft');
for (const [name, mut] of [['for', alt.replace('{% for item in cart.items %}', '{% for item in cart.items limit: 5 %}')], ['if-image', alt.replace('{% if item.image -%}', '{% if item.image %}')], ['ratio', alt.replace("assign ratio = item.image.aspect_ratio", "assign ratio = item.image.aspect_ratio | plus: 0")], ['bild', alt.replace("width: 250 | image_tag", "width: 300 | image_tag")]]) {
  w = null; try { anwenden(mut); } catch (e) { w = e.message; }
  ok(w && w.includes(`«${name}» kommt 0×`), `Anker «${name}» fehlt -> wirft (${w})`);
}
w = null; try { anwenden(alt + alt); } catch (e) { w = e.message; } ok(w && /2×/.test(w), 'doppelter Anker wirft');
for (const schlecht of ['a b', 'a/b', "a'b", 'a"b', '{{x}}', '..', 'ä', 'x'.repeat(65)]) { w = null; try { pruefeCloud(schlecht); } catch (e) { w = e.message; } ok(w, `Cloud ${JSON.stringify(schlecht)} abgelehnt`); }
for (const gut of ['', undefined, null, 'dwyi6kkrl', 'Meine_Cloud-2']) ok(typeof pruefeCloud(gut) === 'string', `Cloud ${JSON.stringify(gut)} angenommen`);
// Zeilen-Anzahl: nur diese vier Stellen ändern sich
{
  const A = alt.split('\n'), B = neu.split('\n'); let p = 0, s = 0;
  while (p < A.length && p < B.length && A[p] === B[p]) p++;
  while (s < A.length - p && s < B.length - p && A[A.length - 1 - s] === B[B.length - 1 - s]) s++;
  ok(B.length - A.length > 40 && B.length - A.length < 100, `Zeilenzuwachs ${B.length - A.length}`);
  ok(p > 100 && s > 300, `gleicher Anfang (${p} Zeilen) und gleiches Ende (${s} Zeilen)`);
}
ok(ERLAUBT === [...new Set(ERLAUBT)].join(''), 'erlaubte Zeichen ohne Doppelte');
ok(!/["'<>\\`{}|^% ?&=#@;()\[\]*+!$]/.test(ERLAUBT) && /[A-Za-z0-9]/.test(ERLAUBT), 'erlaubte Zeichen enthalten kein Sonderzeichen, das aus einem Attribut ausbrechen könnte');
ok(MAX_LAENGE === 300, 'Höchstlänge 300');
{
  const readme = path.join(HIER, 'README.md');
  if (fs.existsSync(readme)) {
    const t = fs.readFileSync(readme, 'utf8');
    ok(t.includes(md5(neu)) && t.includes(md5(neuPin)) && t.includes(MD5_VOR), 'README nennt die Prüfsummen von Ausgangsstand, Soll-Text und Soll-Text mit fester Cloud (sonst veraltet sie unbemerkt)');
  }
}
console.log(`  A fertig (${n} Prüfungen)`);

if (process.env.OHNE_LIQUID === '1') { console.log(`\n${n} Prüfungen, ${fehler} Fehler (nur A: OHNE_LIQUID=1)`); process.exit(fehler ? 1 : 0); }

// ---------- Engines ----------
const engines = {};
function ladeJs() {
  for (const k of [process.env.LIQUIDJS_DIR, SCRATCH + '/lq', SCRATCH + '/liq', SCRATCH + '/liquidjs', '.'].filter(Boolean)) {
    try { return createRequire(path.resolve(k) + '/')('liquidjs').Liquid; } catch { /* nächster */ }
  }
  return null;
}
const Liquid = ladeJs();
if (Liquid) {
  const png = (u) => u;
  const eng = new Liquid({ strictFilters: true, strictVariables: false, extname: '', templates: {
    'spacing-style': '[SPACING]', 'volume-pricing-info': '[VPI {{ unique_id }} {{ quantity }}]', 'quantity-selector': '[QTY {{ in_cart_quantity }} {{ line_index }} {{ can_update_quantity }}]',
    'unit-price': '[UP {{ price }}]', 'lspod-designzwang': '{% if product.tags contains "pod" %}1{% endif %}' } });
  for (const nm of ['doc', 'stylesheet']) {
    eng.registerTag(nm, { parse(tagToken, remain) { const s = this.liquid.parser.parseStream(remain); s.on('token', (t) => { if (t.name === 'end' + nm) s.stop(); }).on('end', () => { throw new Error('Tag ' + nm + ' nicht geschlossen'); }); s.start(); }, render() { return ''; } });
  }
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const kw = (args) => Object.fromEntries(args.filter(Array.isArray));   // LiquidJS reicht benannte Argumente als [Name, Wert] weiter
  eng.registerFilter('t', (i, ...a) => { const o = kw(a); return `[t:${i}${Object.keys(o).length ? ' ' + Object.entries(o).map(([k, v]) => k + '=' + v).join(',') : ''}]`; });
  eng.registerFilter('money', (c) => 'CHF ' + (Number(c) / 100).toFixed(2));
  eng.registerFilter('money_with_currency', (c) => 'CHF ' + (Number(c) / 100).toFixed(2) + ' CHF');
  eng.registerFilter('asset_url', (x) => '//cdn.test/assets/' + x);
  eng.registerFilter('inline_asset_content', (x) => `<svg data-icon="${x}"></svg>`);
  eng.registerFilter('image_url', (b, ...a) => (b && typeof b === 'object' ? `//cdn.test/${b.src}?width=${kw(a).width ?? ''}` : ''));
  eng.registerFilter('image_tag', (u, ...a) => { const o = kw(a); return `<img src="${esc(png(u))}" class="${esc(o.class)}" style="${esc(o.style)}" width="250" height="250" loading="lazy">`; });
  engines.js = {
    name: 'LiquidJS ' + (() => { try { return createRequire(path.resolve([process.env.LIQUIDJS_DIR, SCRATCH + '/lq', SCRATCH + '/liq'].filter(Boolean).find((k) => { try { createRequire(path.resolve(k) + '/')('liquidjs'); return true; } catch { return false; } })) + '/')('liquidjs/package.json').version; } catch { return '?'; } })(),
    render(vorlagen, faelle) {
      const out = { parse: {}, fehler: {}, ergebnisse: {} };
      return (async () => {
        for (const [name, text] of Object.entries(vorlagen)) {
          let t; try { t = eng.parse(text); out.parse[name] = 'ok'; } catch (e) { out.parse[name] = String(e.message).slice(0, 300); continue; }
          out.ergebnisse[name] = []; out.fehler[name] = [];
          for (const c of faelle) { try { out.ergebnisse[name].push(await eng.render(t, JSON.parse(JSON.stringify(c)))); } catch (e) { out.fehler[name].push(String(e.message).slice(0, 200)); out.ergebnisse[name].push(''); } }
        }
        return out;
      })();
    },
  };
} else console.log('LiquidJS nicht gefunden (npm install liquidjs, LIQUIDJS_DIR setzen): LiquidJS-Teil übersprungen');
{
  const gems = process.env.RUBY_LIQUID_GEMS || SCRATCH + '/rubygems';
  const skript = path.join(HIER, 'liquid_render.rb');
  if (fs.existsSync(gems) && spawnSync('ruby', ['-v']).status === 0) {
    engines.ruby = {
      name: 'Ruby-Liquid',
      async render(vorlagen, faelle) {
        const r = spawnSync('ruby', [skript], { input: JSON.stringify({ vorlagen, faelle, modus: 'strict' }), env: { ...process.env, RUBY_LIQUID_GEMS: gems }, maxBuffer: 1 << 29, encoding: 'utf8' });
        if (r.status !== 0) throw new Error('Ruby-Lauf fehlgeschlagen: ' + (r.stderr || '').slice(0, 600));
        const o = JSON.parse(r.stdout); engines.ruby.version = o.version; return o;
      },
    };
  } else console.log('Ruby-Liquid nicht gefunden (RUBY_LIQUID_GEMS = GEM_HOME mit «gem install liquid»): Ruby-Teil übersprungen');
}
if (!Object.keys(engines).length) { console.error('Keine Liquid-Engine verfügbar: nichts geprüft'); process.exit(2); }

// ---------- Fälle ----------
const BILD = (s = 'tasse.jpg') => ({ src: s, aspect_ratio: 1.0, alt: 'x' });
const zeile = (props, extra = {}) => ({ key: 'k1:abc', url: '/products/tasse?variant=1', title: 'Tasse - Blau / 444 ml', index: 0, quantity: 1, image: BILD(), product: { title: 'Tasse "Blau"', vendor: 'LX', has_only_default_variant: false, tags: ['pod'] },
  options_with_values: [{ name: 'Farbe', value: 'Blau' }], item_components: [], selling_plan_allocation: null, line_level_discount_allocations: [], instructions: { can_update_quantity: true, can_remove: true },
  variant: { compare_at_price: 0 }, original_price: 2490, final_price: 2490, final_line_price: 2490, unit_price: 0, unit_price_measurement: null, properties: props, ...extra });
const SETTINGS = { cart_thumbnail_border_opacity: 50, cart_thumbnail_border_width: 1, cart_thumbnail_border: 'solid', cart_thumbnail_border_radius: 8, currency_code_enabled_cart_items: false };
const BLOCK = (ratio = 'adapt') => ({ settings: { image_ratio: ratio, dividers: true, gap: 24, vendor: false } });
const warenkorb = (zeilen, extra = {}) => ({ cart: { 'empty?': false, items: zeilen.map((z, i) => ({ ...z, index: i, key: 'k' + i })), item_count: zeilen.length }, settings: SETTINGS, block: BLOCK(), ...extra });
const DESIGN = { '🎨 Design (front)': 'Text: "Hallo" · Sticker: heart-red' };
const URL_OK = 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1730000000/klmnopqrst.jpg';
const KARTE = '{"v":6,"m":403,"pv":17197,"sv":"46000000000001","pl":["default"],"ap":0}';
const mitV = (wert, extra = {}) => ({ ...DESIGN, _pod_karte: KARTE, _vorschau: wert, ...extra });
const pre = 'https://res.cloudinary.com/dwyi6kkrl/image/upload/';
const lang = (len) => pre + 'v1730000000/' + 'a'.repeat(len - pre.length - 'v1730000000/'.length - 4) + '.jpg';

// [Name, Wert, erwartet ohne Cloud, erwartet mit fester Cloud]
const ADRESSEN = [
  ['gültig (README-Beispiel)', URL_OK, true, true],
  ['gültig, .png', pre + 'v1/abc.png', true, true], ['gültig, .webp', pre + 'v1/abc.webp', true, true], ['gültig, ohne Versionsteil', pre + 'abc.jpg', true, true],
  ['gültig mit Tilde und Grossbuchstaben im Dateinamen', pre + 'v1/AbC~dEf.jpg', true, true],
  ['gültig mit Umwandlung (Kommas)', pre + 'c_limit,w_800,q_auto/v1730000000/klmnopqrst.jpg', true, true],
  ['gültig, andere Cloud (ohne feste Cloud erlaubt, mit fester Cloud nicht)', 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg', true, false],
  ['genau 300 Zeichen', lang(300), true, true], ['301 Zeichen', lang(301), false, false], ['5000 Zeichen', lang(5000), false, false],
  ['http statt https', 'http://res.cloudinary.com/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['fremder Host', 'https://example.com/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['Host mit Zusatz', 'https://res.cloudinary.com.evil.example/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['Host mit Benutzerangabe', 'https://res.cloudinary.com@evil.example/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['Host mit Rückstrich', 'https://res.cloudinary.com\\@evil.example/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['Host im Pfad', 'https://evil.example/https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['Schrägstrich-Trick (https:/ statt https://)', 'https:/evil.example/res.cloudinary.com/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['Doppelpunkt-Trick (https: ohne Schrägstriche)', 'https:evil.example/res.cloudinary.com/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['drei Schrägstriche', 'https:///res.cloudinary.com/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['Host mit Port', 'https://res.cloudinary.com:443/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['Host mit Punkt am Ende', 'https://res.cloudinary.com./dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['Host mit Benutzer und Kennwort', 'https://user:pass@res.cloudinary.com/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['Host gross geschrieben', 'https://RES.CLOUDINARY.COM/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['Schema gross geschrieben', 'HTTPS://res.cloudinary.com/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['ohne Schema (//)', '//res.cloudinary.com/dwyi6kkrl/image/upload/v1/a.jpg', false, false],
  ['javascript:', 'javascript:alert(1)', false, false], ['data:', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', false, false],
  ['Attribut-Ausbruch', pre + 'v1/a.jpg" onerror="alert(1)', false, false],
  ['Tag-Ausbruch', pre + 'v1/a.jpg"><script>alert(1)</script>', false, false],
  ['Skript-Tag allein', '<script>alert(1)</script>', false, false], ['Bild-Tag', '<img src=x onerror=alert(1)>', false, false],
  ['einfaches Anführungszeichen', pre + "v1/a'.jpg", false, false], ['Liquid-Klammern', pre + 'v1/{{ 7 }}.jpg', false, false], ['Liquid-Tag', pre + 'v1/{% if %}.jpg', false, false],
  ['Leerzeichen mitten drin', pre + 'v1/a b.jpg', false, false], ['führendes Leerzeichen', ' ' + URL_OK, false, false], ['nachgestelltes Leerzeichen', URL_OK + ' ', false, false],
  ['Zeilenumbruch am Ende', URL_OK + '\n', false, false], ['Tabulator mitten drin', pre + 'v1/a\tb.jpg', false, false], ['Wagenrücklauf', pre + 'v1/a\rb.jpg', false, false],
  ['NUL-Zeichen', pre + 'v1/a\u0000b.jpg', false, false], ['Rückstrich', pre + 'v1/a\\b.jpg', false, false],
  ['Pfad-Umleitung (..)', pre + '../../evil/image/upload/a.jpg', false, false], ['Pfad-Umleitung (%2e%2e)', pre + '%2e%2e/%2e%2e/a.jpg', false, false],
  ['Prozent-Zeichen', pre + 'v1/a%20b.jpg', false, false], ['Abfrage (?)', URL_OK + '?x=1', false, false], ['Fragment (#)', URL_OK + '#x', false, false],
  ['kaufmännisches Und', pre + 'v1/a&amp;b.jpg', false, false], ['Gleichheitszeichen', pre + 'v1/a=b.jpg', false, false],
  ['Umlaut', pre + 'v1/ä.jpg', false, false], ['Emoji', pre + 'v1/🙂.jpg', false, false],
  ['fetch statt upload', 'https://res.cloudinary.com/demo/image/fetch/https://evil.example/a.png', false, false],
  ['fetch mit upload in der Fremdadresse', 'https://res.cloudinary.com/demo/image/fetch/https://evil.example/image/upload/a.png', false, false],
  ['Video statt Bild', 'https://res.cloudinary.com/dwyi6kkrl/video/upload/v1/a.mp4', false, false], ['raw statt Bild', 'https://res.cloudinary.com/dwyi6kkrl/raw/upload/v1/a.txt', false, false],
  ['Bild gross geschrieben (Image/Upload)', 'https://res.cloudinary.com/dwyi6kkrl/Image/Upload/v1/a.jpg', false, false],
  ['ohne Cloud-Namen', 'https://res.cloudinary.com//image/upload/v1/a.jpg', false, false], ['nur Host mit Schrägstrich', 'https://res.cloudinary.com/', false, false], ['nur Host', 'https://res.cloudinary.com', false, false],
  ['ohne Dateiteil (endet auf upload)', 'https://res.cloudinary.com/dwyi6kkrl/image/upload', false, false], ['endet auf upload/', 'https://res.cloudinary.com/dwyi6kkrl/image/upload/', false, false],
  ['leere Zeichenkette', '', false, false], ['nur Leerzeichen', '   ', false, false], ['Zahl', 12345, false, false], ['null', null, false, false], ['Wahrheitswert', true, false, false],
  ['Wort', 'vorschau', false, false],
];
const FAELLE = []; // {id, ctx, art}
const add = (id, ctx, art, erw = {}) => FAELLE.push({ id, ctx, art, ...erw });

add('leer: Warenkorb ist leer', { cart: { 'empty?': true, items: [], item_count: 0 }, settings: SETTINGS, block: BLOCK() }, 'gleich');
add('leer: Warenkorb leer, Schublade (force_empty)', { cart: { 'empty?': false, items: [zeile({})], item_count: 1 }, force_empty: true, settings: SETTINGS }, 'gleich');
add('ohne Eigenschaften', warenkorb([zeile({})]), 'gleich');
add('nur Design (ohne _vorschau)', warenkorb([zeile({ ...DESIGN })]), 'gleich');
add('alte Druckdatei v6.1 mit Cloudinary-Bild', warenkorb([zeile({ ...DESIGN, '🖼️ Druckdatei (front)': URL_OK, _pod_karte: KARTE })]), 'gleich', { druckdatei: true });
add('alte Druckdatei v5 («Vorne · …»)', warenkorb([zeile({ 'Vorne · 🎨 Design': 'Text: "A"', 'Vorne · 🖼️ Druckdatei': URL_OK })]), 'gleich', { druckdatei: true });
add('Druckdatei mit /uploads/-Adresse', warenkorb([zeile({ '🖼️ Druckdatei (front)': 'https://example.com/uploads/mein-bild.png' })]), 'gleich');
add('neue Druckdatei _Druckdatei (6.2.1) und _pod_karte, ohne _vorschau', warenkorb([zeile({ ...DESIGN, '_Druckdatei (front)': URL_OK, _pod_karte: KARTE })]), 'gleich', { verborgen: true });
add('beide Druckdatei-Schreibweisen zugleich', warenkorb([zeile({ ...DESIGN, '_Druckdatei (front)': URL_OK, '🖼️ Druckdatei (back)': URL_OK })]), 'gleich', { druckdatei: true });
add('gewöhnliche Eigenschaft (Geschenkkarte)', warenkorb([zeile({ 'Widmung': 'Alles Gute' })]), 'gleich');
add('Schublade (kein block), ohne _vorschau', { cart: { 'empty?': false, items: [zeile({ ...DESIGN })], item_count: 1 }, settings: SETTINGS }, 'gleich');
add('Zeile ohne Bild, ohne _vorschau', warenkorb([zeile({ ...DESIGN }, { image: null })]), 'gleich');
add('Zeile ohne Bild, ungültige _vorschau', warenkorb([zeile(mitV('http://res.cloudinary.com/x/image/upload/a.jpg'), { image: null })]), 'gleich');
// Schlüssel, die NICHT genau «_vorschau» heissen: keine Miniatur. Beginnt der Schlüssel mit «_», blendet ihn das Theme (wie heute) aus; sonst erscheint er wie heute als Eigenschaft.
for (const schl of ['_Vorschau', 'vorschau', '_vorschau ', ' _vorschau', '__vorschau', '_vorschau (front)', '🖼️ _vorschau', '_VORSCHAU', '_vorschau\n'])
  add('falscher Schlüssel ' + JSON.stringify(schl) + ' mit gültiger Adresse', warenkorb([zeile({ ...DESIGN, [schl]: URL_OK })]), 'gleich', { schluesselwert: URL_OK, versteckt: schl.startsWith('_'), schluessel: schl });
ADRESSEN.forEach(([name, wert, erwNeu, erwPin], i) => {
  add('Adresse: ' + name, warenkorb([zeile(mitV(wert))]), erwNeu ? 'vorschau' : 'gleich', { url: wert, erwNeu, erwPin, adresse: true });
});
add('Adresse gültig in der Schublade (kein block)', { cart: { 'empty?': false, items: [zeile(mitV(URL_OK))], item_count: 1 }, settings: SETTINGS }, 'vorschau', { url: URL_OK, erwNeu: true, erwPin: true });
for (const r of ['adapt', 'portrait', 'square']) add('gültig, Bildverhältnis ' + r, warenkorb([zeile(mitV(URL_OK))], { block: BLOCK(r) }), 'vorschau', { url: URL_OK, erwNeu: true, erwPin: true });
add('gültig, Variante ohne Bild (kein Rückfall möglich)', warenkorb([zeile(mitV(URL_OK), { image: null })]), 'vorschau', { url: URL_OK, erwNeu: true, erwPin: true, ohneBild: true });
add('gültig, Variantenbild hochkant (aspect_ratio 0.75)', warenkorb([zeile(mitV(URL_OK), { image: { src: 'hoch.jpg', aspect_ratio: 0.75, alt: '' } })]), 'vorschau', { url: URL_OK, erwNeu: true, erwPin: true });
add('gültig mit sonderzeichenreichem Produkttitel', warenkorb([zeile(mitV(URL_OK), { product: { title: 'Tasse "A" <b>&</b> \'x\'', vendor: 'LX', has_only_default_variant: true, tags: ['pod'] } })]), 'vorschau', { url: URL_OK, erwNeu: true, erwPin: true });
add('drei Zeilen: gültig, gewöhnlich, ungültig', warenkorb([zeile(mitV(URL_OK), { title: 'A' }), zeile({}, { title: 'B' }), zeile(mitV('http://res.cloudinary.com/dwyi6kkrl/image/upload/v1/a.jpg'), { title: 'C' })]), 'mehrzeilig', { zeilen: [true, false, false] });
add('drei Zeilen: alle gültig, verschiedene Bilder', warenkorb([zeile(mitV(pre + 'v1/eins.jpg')), zeile(mitV(pre + 'v1/zwei.jpg')), zeile(mitV(pre + 'v1/drei.jpg'))]), 'mehrzeilig', { zeilen: [true, true, true] });
add('Reihenfolge der Eigenschaften: _vorschau zuerst', warenkorb([zeile({ _vorschau: URL_OK, ...DESIGN, _pod_karte: KARTE })]), 'vorschau', { url: URL_OK, erwNeu: true, erwPin: true });
add('Reihenfolge: nur _vorschau', warenkorb([zeile({ _vorschau: URL_OK })]), 'vorschau', { url: URL_OK, erwNeu: true, erwPin: true });
add('Reihenfolge: _vorschau zuletzt, viele Eigenschaften davor', warenkorb([zeile({ a: '1', b: '2', c: '3', ...DESIGN, _pod_karte: KARTE, _vorschau: URL_OK })]), 'vorschau', { url: URL_OK, erwNeu: true, erwPin: true });
add('viele Zeilen (40), jede zweite mit Vorschau', warenkorb(Array.from({ length: 40 }, (_, i) => zeile(i % 2 ? mitV(pre + 'v1/z' + i + '.jpg') : { ...DESIGN }, { title: 'Z' + i }))), 'mehrzeilig', { zeilen: Array.from({ length: 40 }, (_, i) => i % 2 === 1) });

const vorlagen = { alt, neu, neuPin };
const nameDe = (e) => engines[e].name + (engines[e].version ? ' ' + engines[e].version : '');
const aus = {}; // engine -> {alt:[], neu:[], neuPin:[]}
for (const e of Object.keys(engines)) {
  const t0 = Date.now();
  const o = await engines[e].render(vorlagen, FAELLE.map((f) => f.ctx));
  aus[e] = o;
  kopf(`${nameDe(e)}: ${FAELLE.length} Fälle × 3 Fassungen in ${Date.now() - t0} ms`);
  for (const v of Object.keys(vorlagen)) { ok(o.parse[v] === 'ok', `${e}: ${v} lässt sich parsen (${o.parse[v]})`); ok((o.fehler[v] || []).length === 0, `${e}: ${v} ohne Liquid-Fehler (${JSON.stringify(o.fehler[v])})`); }
}

// ---------- B bis D ----------
const attr = (tag, name) => { const m = new RegExp('\\s' + name + '="([^"]*)"').exec(tag); return m ? m[1] : null; };
const MEDIA = /<td\s+class="cart-items__media"[\s\S]*?<\/td>/g;
const ohneMedia = (s) => s.replace(MEDIA, '<td-media/>');
const zeilenVon = (s) => s.split(/(?=<tr\b)/).filter((t) => t.includes('ref="cartItemRows[]"'));   // die Kopfzeile der Tabelle zählt nicht
const vorschauImgs = (s) => s.match(/<img\b[^>]*\bdata-lx-vorschau="1"[^>]*>/g) || [];
const sichtbar = (s) => s.replace(/<[^>]*>/g, ' ');
const entscheidung = {}; // e -> id -> {neu, pin}
for (const e of Object.keys(engines)) {
  kopf(`B/C/D ${nameDe(e)}`);
  const o = aus[e]; entscheidung[e] = {};
  FAELLE.forEach((f, i) => {
    const a = o.ergebnisse.alt[i], b = o.ergebnisse.neu[i], p = o.ergebnisse.neuPin[i];
    const angeNeu = b !== a, angePin = p !== a;
    entscheidung[e][f.id] = { neu: angeNeu, pin: angePin };
    ok(a.length > 200, `${e} · ${f.id}: alt rendert etwas`);
    ok(!/Liquid error|Liquid syntax error/.test(b + p), `${e} · ${f.id}: kein Liquid-Fehler in der Ausgabe`);
    // D: Eigenschaften mit Unterstrich erscheinen nirgends, die Vorschau-Adresse nur als src
    for (const [t, s] of [['neu', b], ['pin', p]]) {
      if (f.schluessel !== undefined && !f.versteckt) continue;   // ein Schlüssel ohne «_» am Anfang bleibt wie heute sichtbar (neu = alt wird unten geprüft)
      ok(!s.includes('_vorschau') && !s.includes('_pod_karte') && !s.includes('_Druckdatei'), `${e} · ${f.id} (${t}): kein Name einer Unterstrich-Eigenschaft in der Ausgabe`);
      ok(!s.includes('"v":6'), `${e} · ${f.id} (${t}): _pod_karte-Inhalt nirgends`);
    }
    if (f.art === 'gleich') {
      ok(b === a, `${e} · ${f.id}: neu ist BYTE FÜR BYTE gleich alt`);
      ok(p === a, `${e} · ${f.id}: neu mit fester Cloud ist BYTE FÜR BYTE gleich alt`);
      ok(vorschauImgs(b).length === 0, `${e} · ${f.id}: keine Vorschau-Miniatur`);
      if (f.verborgen) ok(!b.includes(URL_OK) && !b.includes('Druckdatei') && !b.includes('Dein Entwurf'), `${e} · ${f.id}: neue Druckdatei (Unterstrich) ist unsichtbar`);
      if (f.druckdatei) { ok(b.includes('Dein Entwurf ansehen') && b.includes('class="cart-items__entwurf"'), `${e} · ${f.id}: alte Druckdatei als Bild mit «Dein Entwurf ansehen»`); ok(!sichtbar(b).includes('https://') && !sichtbar(b).includes('res.cloudinary.com'), `${e} · ${f.id}: keine Adresse als sichtbarer Text`); }
      if (f.schluesselwert && f.versteckt) ok(!b.includes(f.schluesselwert), `${e} · ${f.id}: Wert des verborgenen falschen Schlüssels nirgends ausgegeben`);
    } else if (f.art === 'vorschau') {
      const erwarteNeu = f.erwNeu, erwartePin = f.erwPin;
      ok(angeNeu === erwarteNeu, `${e} · ${f.id}: Vorschau ${erwarteNeu ? 'angenommen' : 'abgelehnt'} (ist ${angeNeu})`);
      ok(angePin === erwartePin, `${e} · ${f.id}: mit fester Cloud ${erwartePin ? 'angenommen' : 'abgelehnt'} (ist ${angePin})`);
      for (const [t, s, an] of [['neu', b, angeNeu], ['pin', p, angePin]]) {
        if (!an) { ok(s === a, `${e} · ${f.id} (${t}): abgelehnt = Ausgabe wie alt`); continue; }
        const imgs = vorschauImgs(s); gleich(imgs.length, 1, `${e} · ${f.id} (${t}): genau eine Vorschau-Miniatur`);
        const img = imgs[0] || '';
        gleich(attr(img, 'src'), f.url, `${e} · ${f.id} (${t}): src ist die Adresse`);
        ok(/\bclass="cart-items__media-image cart-items__media-image--vorschau border-style"/.test(img), `${e} · ${f.id} (${t}): Klassen`);
        gleich([attr(img, 'width'), attr(img, 'height'), attr(img, 'loading')], ['800', '800', 'lazy'], `${e} · ${f.id} (${t}): Grösse und lazy`);
        ok(attr(img, 'alt') !== null, `${e} · ${f.id} (${t}): alt vorhanden`);
        ok(/--border-width: 1px;/.test(attr(img, 'style') || ''), `${e} · ${f.id} (${t}): Rahmen wie beim Variantenbild`);
        ok(ohneMedia(s) === ohneMedia(a), `${e} · ${f.id} (${t}): ausserhalb des Bildfeldes alles gleich alt`);
        ok(/style="--ratio:1;"/.test((s.match(MEDIA) || [''])[0]), `${e} · ${f.id} (${t}): Seitenverhältnis 1`);
        ok(!/<img\b(?![^>]*data-lx-vorschau)[^>]*cart-items__media-image/.test((s.match(MEDIA) || [''])[0]), `${e} · ${f.id} (${t}): daneben kein zweites Variantenbild`);
        ok(/class="cart-items__media-container"\s+style="--ratio:1;"\s*>(<img\b[^>]*>)<\/a>/.test((s.match(MEDIA) || [''])[0]), `${e} · ${f.id} (${t}): im Link steht genau das <img>, ohne Leerraum davor und danach`);
        if (f.ohneBild) ok(!/data-lx-fallback|onerror/.test(img), `${e} · ${f.id} (${t}): ohne Variantenbild kein Rückfall`);
        else { ok(attr(img, 'data-lx-fallback') === '//cdn.test/' + (f.ctx.cart.items[0].image.src) + '?width=250', `${e} · ${f.id} (${t}): Rückfall zeigt auf das Variantenbild (${attr(img, 'data-lx-fallback')})`); ok(/onerror="this\.onerror=null;/.test(img), `${e} · ${f.id} (${t}): onerror gesetzt`); }
        if (/Tasse \\"A\\"/.test(JSON.stringify(f.ctx))) ok(/alt="Tasse (&quot;|&#34;)A(&quot;|&#34;) &lt;b&gt;&amp;&lt;\/b&gt; &#39;x&#39;"/.test(img), `${e} · ${f.id} (${t}): Produkttitel im alt maskiert (${attr(img, 'alt')})`);
        ok(!/<script/i.test(s) || s.split(/<script/i).length === a.split(/<script/i).length, `${e} · ${f.id} (${t}): keine zusätzlichen Skript-Tags`);
      }
    } else if (f.art === 'mehrzeilig') {
      const za = zeilenVon(a), zb = zeilenVon(b);
      gleich(zb.length, f.zeilen.length, `${e} · ${f.id}: Zeilenzahl`);
      f.zeilen.forEach((hat, k) => {
        gleich(vorschauImgs(zb[k]).length, hat ? 1 : 0, `${e} · ${f.id}: Zeile ${k + 1} ${hat ? 'mit' : 'ohne'} Vorschau`);
        if (!hat) ok(zb[k] === za[k], `${e} · ${f.id}: Zeile ${k + 1} BYTE FÜR BYTE gleich alt`);
        else ok(ohneMedia(zb[k]) === ohneMedia(za[k]), `${e} · ${f.id}: Zeile ${k + 1} ausserhalb des Bildfeldes gleich alt`);
      });
      if (f.id.includes('verschiedene Bilder')) gleich(vorschauImgs(b).map((t) => attr(t, 'src').split('/').pop()), ['eins.jpg', 'zwei.jpg', 'drei.jpg'], `${e} · ${f.id}: jede Zeile ihr eigenes Bild`);
    }
  });
}

// ---------- E. beide Engines entscheiden gleich ----------
const es = Object.keys(engines);
if (es.length === 2) {
  kopf('E Ruby-Liquid und LiquidJS entscheiden gleich');
  let verschieden = 0;
  for (const f of FAELLE) { const x = entscheidung[es[0]][f.id], y = entscheidung[es[1]][f.id]; if (x.neu !== y.neu || x.pin !== y.pin) { verschieden++; console.log('  ✗ Entscheidung verschieden:', f.id, JSON.stringify(x), JSON.stringify(y)); } }
  ok(verschieden === 0, `${FAELLE.length} Fälle: Entscheidung gleich in beiden Engines (${verschieden} verschieden)`);
  // und die gesamten Ausgaben: Zeilen mit Vorschau tragen in beiden Engines dieselbe Miniatur
  for (const f of FAELLE.filter((x) => x.art === 'vorschau' && x.erwNeu)) {
    const norm = (t) => t.replace(/&#34;/g, '&quot;').replace(/&#x27;/g, '&#39;');   // LiquidJS schreibt «&#34;» für «"», Ruby-Liquid «&quot;»: gleiche Bedeutung
    const m = es.map((e) => norm(vorschauImgs(aus[e].ergebnisse.neu[FAELLE.indexOf(f)])[0] || ''));
    ok(m[0] === m[1] && m[0] !== '', `Miniatur-Markup gleich in beiden Engines · ${f.id}`);
  }
}

// ---------- Vertragsprobe: Designzwang in cart-summary.liquid (unverändert, MAIN 06.11.2026) ----------
// Aus snippets/cart-summary.liquid, Zeilen 284-307 (md5 der Datei 88e224946155647e7ec46498b5aac870): eine POD-Zeile ohne Design-Eigenschaft darf nicht zur Kasse.
const DESIGNZWANG = `{%- assign lspod_ohne_design = 0 -%}
{%- for lspod_item in cart.items -%}
  {%- capture lspod_zwang -%}{%- render 'lspod-designzwang', product: lspod_item.product -%}{%- endcapture -%}
  {%- if lspod_zwang == '1' -%}
    {%- assign lspod_hat_design = false -%}
    {%- for lspod_p in lspod_item.properties -%}
      {%- if lspod_p.first contains 'Design' or lspod_p.first contains 'Druckdatei' or lspod_p.first contains 'Print file' -%}
        {%- if lspod_p.last != blank -%}
          {%- assign lspod_hat_design = true -%}
        {%- endif -%}
      {%- endif -%}
    {%- endfor -%}
    {%- unless lspod_hat_design -%}
      {%- assign lspod_ohne_design = lspod_ohne_design | plus: 1 -%}
    {%- endunless -%}
  {%- endif -%}
{%- endfor -%}{{ lspod_ohne_design }}`;
{
  kopf('Vertragsprobe Designzwang (cart-summary.liquid, unverändert)');
  const dz = [
    ['neu: Design sichtbar + _Druckdatei + _vorschau + _pod_karte', { ...DESIGN, '_Druckdatei (front)': URL_OK, _vorschau: URL_OK, _pod_karte: KARTE }, '0'],
    ['neu: nur _Druckdatei (Schlüssel enthält «Druckdatei»)', { '_Druckdatei (front)': URL_OK }, '0'],
    ['alt: Design + 🖼️ Druckdatei', { ...DESIGN, '🖼️ Druckdatei (front)': URL_OK }, '0'],
    ['nur _vorschau und _pod_karte, kein Design', { _vorschau: URL_OK, _pod_karte: KARTE }, '1'],
    ['ohne Eigenschaften', {}, '1'],
  ];
  for (const e of es) {
    const o = await engines[e].render({ dz: DESIGNZWANG }, dz.map(([, p]) => ({ cart: { items: [{ product: { tags: ['pod'] }, properties: p }] } })));
    dz.forEach(([name, , erw], i) => ok(o.ergebnisse.dz[i].trim() === erw, `${e} · ${name}: ${erw === '0' ? 'Kasse frei' : 'Kasse gesperrt'} (ist ${o.ergebnisse.dz[i].trim()})`));
  }
}

// ---------- Messung: Aufwand je Zeile (nur Anzeige) ----------
if (engines.ruby) {
  const gross = warenkorb(Array.from({ length: 100 }, (_, i) => zeile(i % 2 ? mitV(pre + 'v1/z' + i + '.jpg') : { ...DESIGN })));
  const zeit = async (v) => { const t0 = Date.now(); await engines.ruby.render({ [v]: vorlagen[v] }, [gross, gross, gross, gross, gross]); return (Date.now() - t0) / 5; };
  const ta = await zeit('alt'), tn = await zeit('neu');
  console.log(`\n  Aufwand (Ruby-Liquid, 100 Zeilen, Mittel von 5, inklusive Start des Ruby-Prozesses): alt ${ta.toFixed(0)} ms, neu ${tn.toFixed(0)} ms (nur zur Information, kein Mass für Shopifys Renderer)`);
}

// ---------- F. Browser ----------
if (process.env.OHNE_BROWSER !== '1') {
  kopf('F Browser (Chromium)');
  let chromium = null;
  try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch { /* unten */ }
  if (!chromium) { console.log('  Playwright nicht gefunden (NODE_PATH=$(npm root -g)): Browserteil übersprungen'); }
  else {
    const e = es.includes('ruby') ? 'ruby' : es[0];
    const css = (alt.match(/\{% stylesheet %\}([\s\S]*?)\{% endstylesheet %\}/) || [0, ''])[1];
    const ctxA = warenkorb([zeile(mitV(URL_OK))]), ctxB = warenkorb([zeile({ ...DESIGN })]);
    const o = await engines[e].render({ alt, neu }, [ctxA, ctxB]);
    const feld = (s) => (s.match(/<td\s+class="cart-items__media"[\s\S]*?<\/td>/) || [''])[0];
    const fNeu = feld(o.ergebnisse.neu[0]), fAlt = feld(o.ergebnisse.alt[1]);
    ok(fNeu.includes('data-lx-vorschau') && !fAlt.includes('data-lx-vorschau'), 'Browser: Bildfelder bereitgestellt');
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const browser = await chromium.launch();
    try {
      const seite = async (html, regeln) => {
        const ctx = await browser.newContext({ viewport: { width: 400, height: 400 } }); const p = await ctx.newPage(); const log = [];
        p.on('pageerror', (er) => log.push('pageerror ' + er.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) log.push('console ' + m.text()); });
        await p.route('**/*', (r) => {
          const u = r.request().url();
          if (u === 'https://shop.test/') return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>t</title>' });
          if (u.startsWith('https://res.cloudinary.com/')) return regeln.cloudinary === 'abort' ? r.abort() : r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
          if (u.startsWith('https://cdn.test/')) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
          return r.abort();
        });
        await p.goto('https://shop.test/');
        await p.setContent(`<style>${css} body{margin:0} .zelle{width:120px}</style><div class="zelle">${html}</div>`);
        await p.waitForTimeout(400);
        return { p, ctx, log };
      };
      // 1. Ladefehler der Vorschau -> Variantenbild
      let s = await seite(fNeu, { cloudinary: 'abort' });
      let st = await s.p.evaluate(() => { const i = document.querySelector('img'); return { src: i.getAttribute('src'), vorschau: i.hasAttribute('data-lx-vorschau'), nat: i.naturalWidth, onerror: i.getAttribute('onerror') === null ? null : 'da' }; });
      gleich(st.src, '//cdn.test/tasse.jpg?width=250', 'Browser: Ladefehler -> src ist das Variantenbild'); ok(!st.vorschau, 'Browser: Ladefehler -> Marke data-lx-vorschau entfernt'); ok(st.nat > 0, 'Browser: Variantenbild geladen');
      gleich(s.log, [], 'Browser: Ladefehler -> keine Seitenfehler'); await s.ctx.close();
      // 2. Vorschau lädt -> bleibt
      s = await seite(fNeu, { cloudinary: 'ok' });
      st = await s.p.evaluate(() => { const i = document.querySelector('img'); return { src: i.getAttribute('src'), vorschau: i.hasAttribute('data-lx-vorschau'), nat: i.naturalWidth }; });
      ok(st.src.startsWith('https://res.cloudinary.com/') && st.vorschau && st.nat > 0, 'Browser: ladende Vorschau bleibt stehen'); await s.ctx.close();
      // 3. Platz: Vorschau belegt genau den Platz des Variantenbildes (quadratisch, 120 px breite Zelle)
      const messen = async (html, cl) => { const t = await seite(html, { cloudinary: cl }); const r = await t.p.evaluate(() => { const c = document.querySelector('.cart-items__media-container').getBoundingClientRect(), i = document.querySelector('img').getBoundingClientRect(); const f = (x) => [x.x, x.y, x.width, x.height].map((v) => Math.round(v * 10) / 10); return { container: f(c), img: f(i) }; }); await t.ctx.close(); return r; };
      const mA = await messen(fAlt, 'ok'), mN = await messen(fNeu, 'ok');
      gleich(mN.container, mA.container, 'Browser: Behälter der Miniatur gleich gross wie beim Variantenbild'); gleich(mN.img, mA.img, 'Browser: Miniatur gleich gross wie das Variantenbild');
      ok(mN.img[2] === 120 && mN.img[3] === 120, `Browser: Miniatur 120 × 120 px in der 120-px-Zelle (${mN.img[2]} × ${mN.img[3]})`);
      console.log(`  Browser-Messung: Behälter ${JSON.stringify(mN.container)}, Miniatur ${JSON.stringify(mN.img)} (x, y, Breite, Höhe)`);
    } finally { await browser.close(); }
  }
}

{
  const art = (a) => FAELLE.filter((f) => f.art === a).length;
  const abgelehnt = FAELLE.filter((f) => f.adresse && f.erwNeu === false).length;
  console.log(`\nFälle: ${FAELLE.length} · ${art('gleich')} mit «neu BYTE FÜR BYTE gleich alt» (darunter ${abgelehnt} abgelehnte Adressen und Angriffe) · ${art('vorschau')} mit gültiger Vorschau · ${art('mehrzeilig')} Warenkörbe mit mehreren Zeilen · je ${es.length} Engine(s) × 3 Fassungen (alt, neu, neu mit fester Cloud)`);
}
console.log(`\n${n} Prüfungen, ${fehler} Fehler (${es.map(nameDe).join(' + ')})`);
process.exit(fehler ? 1 : 0);
