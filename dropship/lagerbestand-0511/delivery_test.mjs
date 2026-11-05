// Test für den Theme-Block «lux_delivery» (Verfügbarkeit + Lieferdatum + ehrliche Bestandsanzeige), Stand 05.11.2026.
// Prüft lux_delivery.neu.liquid mit LiquidJS gegen Attrappen der Shopify-Objekte, ohne Netz, ohne Shopify-Zugriff.
//   node dropship/lagerbestand-0511/delivery_test.mjs            (Test + Mutationsprobe)
//   NUR_TEST=1 node …                                            (ohne Mutationsprobe)
// LiquidJS: Umgebungsvariable LIQUIDJS_DIR = Ordner, in dem «npm install liquidjs» lief.
// Echtes Ruby-Liquid (optionale Gegenprobe): RUBY_LIQUID_GEMS = GEM_HOME mit «gem install liquid»; fehlt es, wird der Teil übersprungen.
// Die Uhr wird festgelegt (Date.now), alle Zeiten sind deshalb wiederholbar; Zeitzone fest UTC+1 (Winterzeit CH).
// Der Variantenwechsel im Browser (Ereignis variant:update, Fallback-Skript aus meta-tags.liquid) steht in wechsel_browser_test.mjs (Chromium, Kindprozess);
// dieser Test startet es für den Block und für jeden Mutanten, der das Skript oder den Container betrifft. OHNE_BROWSER=1 überspringt den Browserteil.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { pruefeNeu } from './apply_theme.mjs'; // dieselbe Prüfung, die das Einspielskript vor dem Schreiben macht

const HIER = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/lager';

// ---------- LiquidJS laden ----------
function ladeLiquid() {
  const kandidaten = [process.env.LIQUIDJS_DIR, SCRATCH + '/liquidjs', SCRATCH + '/../lq', SCRATCH + '/../liq', '.'].filter(Boolean);
  for (const k of kandidaten) {
    try { return createRequire(path.resolve(k) + '/')('liquidjs').Liquid; } catch { /* nächster */ }
  }
  console.error('LiquidJS nicht gefunden. «npm install liquidjs» ausführen und LIQUIDJS_DIR setzen.');
  process.exit(2);
}
const Liquid = ladeLiquid();
const engine = new Liquid({ timezoneOffset: -60, strictFilters: true, strictVariables: false });

// ---------- feste Uhr ----------
const T = (s) => Date.UTC(2026, 10, 5, 8, 30, 0) + (s || 0) * 1000; // Do 05.11.2026 08:30:00 UTC = 09:30 Schweizer Zeit
let JETZT = T();
Date.now = () => JETZT;
const jetztS = () => Math.floor(JETZT / 1000);
const iso = (sekundenVorJetzt) => new Date(JETZT - sekundenVorJetzt * 1000).toISOString().replace('.000Z', 'Z');

// ---------- Blöcke einlesen ----------
const NEU = fs.readFileSync(path.join(HIER, 'lux_delivery.neu.liquid'), 'utf8');
const ALT = fs.readFileSync(path.join(HIER, 'lux_delivery.alt.liquid'), 'utf8');
const tplAlt = engine.parse(ALT);

// ---------- Attrappe der Shopify-Objekte ----------
function ctx(f) {
  const v = f.variante;
  const c = {
    closest: { product: f.keinProdukt ? undefined : {
      id: f.id ?? 123, tags: f.tags, available: f.produktOk,
      selected_or_first_available_variant: v === null ? undefined : {
        available: v.ok, inventory_quantity: v.qty, inventory_management: v.mgmt, inventory_policy: v.policy,
      },
    } },
    product: { price_min: f.preis ?? 2990 },
    shop: { metafields: { luxe: {} } },
    localization: { country: { iso_code: f.land ?? 'CH' } },
  };
  const mf = c.shop.metafields.luxe;
  if (f.stempel !== undefined) mf.fortura_bestand_stand = { value: f.stempel };
  if (f.schalter !== undefined) mf.bestand_anzeige = { value: f.schalter };
  if (f.stufe !== undefined) mf.ch_lager_stufe = { value: f.stufe };
  if (f.druckIds !== undefined) mf.druck_profil_ids = { value: f.druckIds };
  return c;
}
const ST = (o = {}) => ({ id: 123, tags: ['fortura'], produktOk: true, variante: { ok: true, qty: 2, mgmt: 'shopify', policy: 'deny' }, stempel: iso(3600), ...o });
const uhrzeitJetzt = () => new Date(JETZT + 3600e3).toISOString().slice(11, 16); // «09:30» = jetzt in Schweizer Winterzeit; Ruby-Liquid liest das als «heute 09:30»
const wieRuby = (ms) => Object.assign(new Date(ms), { toString() { return new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'); } }); // Shopify: Time#to_s
const V = (o) => ({ ok: true, qty: 2, mgmt: 'shopify', policy: 'deny', ...o });

// ---------- Auswertung der Ausgabe ----------
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const PILLE = /^<div style="display:flex;align-items:center;gap:\.45rem;margin:\.5rem 0 0;font-size:\.92rem;font-weight:600;color:(#[0-9a-f]{6});"><span style="display:inline-block;width:\.6rem;height:\.6rem;border-radius:50%;background:(#[0-9a-f]{6});(?:box-shadow:0 0 0 3px (rgba\([^)]*\));)?"><\/span>([^<]*)<\/div>/;
const zaehle = (s, t) => s.split(t).length - 1;
// Aufbau der Ausgabe: <div data-lx-delivery="Produkt-ID"> Pille + Lieferbox </div> LF <script>…</script>, sonst nichts
const HUELLE = /^<div data-lx-delivery="([^"]*)">([\s\S]*)<\/div>\n<script>([\s\S]*)<\/script>$/;
const zerlege = (html) => { const m = html.match(HUELLE); return m ? { pid: m[1], innen: m[2], skript: m[3] } : null; };
const SPAN_AUF = '<span hidden data-lx-kein-liefertermin>';
const SPAN = SPAN_AUF + 'Lieferung voraussichtlich: erst wieder, wenn diese Ausführung lieferbar ist.</span>';
const GRUEN = { farbe: '#1e7a2e', punkt: '#2eaf46', schein: 'rgba(46,175,70,.18)' };
const ORANGE = { farbe: '#9a5b00', punkt: '#e8890c', schein: 'rgba(232,137,12,.18)' };
const ROT = { farbe: '#b3261e', punkt: '#d93025', schein: undefined };
function lies(html) {
  const z = zerlege(html);
  const m = norm(z ? z.innen : html).match(PILLE);
  if (!m) return null;
  return { farbe: m[1], punkt: m[2], schein: m[3], text: m[4].replace(/&middot;/g, '·') };
}
function zaehler(html) {
  const z = zerlege(html); // gezählt wird nur das Sichtbare im Container (ohne den versteckten Span und ohne das Skript)
  const t = (z ? z.innen : html).split(SPAN).join('').replace(/&middot;/g, '·');
  return { nurNoch: zaehle(t, 'Nur noch'), aufLager: zaehle(t, 'Auf Lager'), liefer: zaehle(t, 'Lieferung voraussichtlich'), box: zaehle(t, '🚚'), ausverkauft: zaehle(t, 'ausverkauft'), kein: zaehle(html, SPAN_AUF) };
}
const HYGIENE = /Liquid (syntax )?error|undefined|NaN|\[object|\{\{|\{%|<div[^>]*>\s*<\/div>/;

// ---------- Orakel: unabhängig vom Liquid-Text aus der Aufgabenstellung gerechnet ----------
const hat = (tags, t) => tags.includes(t);
function zweig(tags) {
  if (hat(tags, 'fortura') || hat(tags, 'ch-lager') || hat(tags, 'blitzversand')) return 'CH';
  if (hat(tags, 'eu-lager')) return 'EU';
  if (hat(tags, 'printful_personalized_product') || hat(tags, 'prodigi_personalized_product') || hat(tags, 'selbst-gestalten')) return 'POD';
  return 'ASIEN';
}
const GRUNDTEXT = { CH: 'Auf Lager · versandbereit', EU: 'Auf Lager im EU-Lager', POD: 'Wird für dich gedruckt', ASIEN: 'Verfügbar · Direktversand aus Asien' };
// Notschalter fail-closed: AN nur bei fehlend/leer oder (getrimmt, klein) 1, true, an, ein, ja, on; jeder andere Wert = AUS
const SCHALTER_AN = ['', '1', 'true', 'an', 'ein', 'ja', 'on'];
function schalterAn(s) { if (s === undefined || s === null) return true; return SCHALTER_AN.includes(String(s).trim().toLowerCase()); }
function stempelGueltig(s) {
  if (s === undefined || s === null) return false;
  const roh = s instanceof Date ? s.toISOString() : String(s);
  if (!roh.includes(':') || roh.split('-').length < 3) return false; // Datum UND Uhrzeit verlangt
  const ms = Date.parse(roh);
  if (Number.isNaN(ms)) return false;
  const sek = Math.floor(ms / 1000);
  return sek > 0 && jetztS() - sek <= 93600 && sek - jetztS() <= 300;
}
function erwartet(f) {
  const v = f.variante;
  const ok = v ? v.ok : f.produktOk;
  if (!ok) return { text: f.produktOk ? 'Diese Ausführung ist ausverkauft' : 'Momentan ausverkauft', farbe: ROT, box: false };
  let text = GRUNDTEXT[zweig(f.tags)]; let farbe = GRUEN;
  if (zweig(f.tags) === 'CH' && v && (hat(f.tags, 'fortura') || hat(f.tags, 'ch-lager')) && v.mgmt === 'shopify' && v.policy === 'deny'
      && schalterAn(f.schalter) && stempelGueltig(f.stempel)) {
    const q = Number(v.qty);
    if (q >= 1 && q <= 3) { text = q === 1 ? 'Nur noch 1 Stück auf Lager · versandbereit' : `Nur noch ${q} auf Lager · versandbereit`; farbe = ORANGE; }
    else if (q === 4 || q === 5) { text = 'Nur noch wenige auf Lager · versandbereit'; farbe = ORANGE; }
  }
  return { text, farbe, box: true };
}

// ---------- Lauf ----------
class Erkannt extends Error {}
function lauf(blockText, opt = {}) {
  const { schnell = false, ruby = false } = opt;
  const tpl = engine.parse(blockText);
  const R = { n: 0, fehler: [], teile: {} };
  let teil = '';
  const beginne = (name) => { teil = name; R.teile[name] = 0; JETZT = T(); };
  const pruefe = (name, ok, detail) => {
    R.n++; R.teile[teil]++;
    if (!ok) { R.fehler.push(`[${teil}] ${name}${detail ? ' :: ' + detail : ''}`); if (schnell) throw new Erkannt(name); }
  };
  const rendere = (f) => engine.renderSync(tpl, ctx(f));
  const pruefeFall = (name, f, soll) => {
    const html = rendere(f); const p = lies(html); const z = zaehler(html);
    pruefe(name + ' · Pille lesbar', p !== null, norm(html).slice(0, 160));
    if (!p) return html;
    pruefe(name + ' · Text', p.text === soll.text, `ist «${p.text}», soll «${soll.text}»`);
    pruefe(name + ' · Farben', p.farbe === soll.farbe.farbe && p.punkt === soll.farbe.punkt && p.schein === soll.farbe.schein, `${p.farbe}/${p.punkt}/${p.schein}`);
    pruefe(name + ' · Lieferbox', (z.box === 1) === soll.box, `box=${z.box}`);
    pruefe(name + ' · Nur-noch-Zahl', z.nurNoch === (soll.text.startsWith('Nur noch') ? 1 : 0), `nurNoch=${z.nurNoch}`);
    pruefe(name + ' · Auf-Lager-Zahl', z.aufLager === (soll.text.startsWith('Auf Lager') ? 1 : 0), `aufLager=${z.aufLager}`);
    pruefe(name + ' · ausverkauft-Zahl', z.ausverkauft === (soll.farbe === ROT ? 1 : 0), `ausverkauft=${z.ausverkauft}`);
    pruefe(name + ' · keine Fehlerspuren', !HYGIENE.test(html), (html.match(HYGIENE) || [''])[0]);
    const zz = zerlege(html); const rot = soll.farbe === ROT;
    pruefe(name + ' · Container mit Produkt-ID und Skript je genau einmal', zz !== null && zz.pid === String(f.id ?? 123) && zaehle(html, '<div data-lx-delivery') === 1 && zaehle(html, '<script') === 1 && zaehle(html, '</script>') === 1 && !zz.innen.includes('<script'), zz ? zz.pid : html.slice(0, 60));
    pruefe(name + ' · versteckter Span genau bei ausverkauft, als Letztes im Container', zaehle(html, SPAN) === (rot ? 1 : 0) && z.kein === (rot ? 1 : 0) && (!rot || (zz !== null && zz.innen.endsWith('</div>\n' + SPAN))), 'kein=' + z.kein);
    return html;
  };

  // ===== A. Statisches =====
  beginne('A Statisches');
  const altZeilen = ALT.split('\n');
  const kopfAlt = altZeilen.slice(0, 49).join('\n');
  const boxAlt = altZeilen.slice(63, 70).join('\n'); // Monate + Lieferbox
  pruefe('Datumsrechnung (alte Zeilen 1-49) steht unverändert im neuen Block', blockText.includes(kopfAlt));
  pruefe('Monate und Lieferbox (alte Zeilen 64-70) stehen unverändert im neuen Block', blockText.includes(boxAlt));
  for (const s of ['Auf Lager &middot; versandbereit', 'Auf Lager im EU-Lager', 'Wird für dich gedruckt', 'Verfügbar &middot; Direktversand aus Asien', 'Momentan ausverkauft']) {
    pruefe('Text unverändert vorhanden: ' + s, blockText.includes(s));
  }
  const filter = new Set([...blockText.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '').matchAll(/\|\s*([a-z_]+)/g)].map((m) => m[1]));
  const erlaubt = new Set(['date', 'plus', 'minus', 'times', 'append', 'default', 'split', 'strip', 'downcase', 'size']);
  pruefe('nur Filter, die es in Shopify-Liquid gibt', [...filter].every((x) => erlaubt.has(x)), [...filter].filter((x) => !erlaubt.has(x)).join(','));
  const ohneKommentar = blockText.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '');
  pruefe('kein concat/include/render/section im Block', !/\b(concat|include|render|section)\b/.test(ohneKommentar.replace(/\{\{[^}]*\}\}/g, '')));
  pruefe('Kommentar nennt Datum 05.11.2026, den Notschalter (fail-closed), den Variantenwechsel und das Fallback-Skript', blockText.includes('05.11.2026') && blockText.includes('luxe.bestand_anzeige') && blockText.includes('fail-closed') && blockText.includes('variant:update') && blockText.includes('meta-tags.liquid'));
  pruefe('genau ein Skript im Blocktext, hinter dem Container, innerhalb von closest.product', zaehle(ohneKommentar, '<script') === 1 && zaehle(ohneKommentar, '</script>') === 1 && ohneKommentar.indexOf('<script>') > ohneKommentar.indexOf('<div data-lx-delivery=') && /<\/script>\s*\{%-\s*endif\s*-%\}\s*$/.test(ohneKommentar));
  pruefe('genau ein Container-Anfang mit Produkt-ID aus closest.product.id', zaehle(ohneKommentar, '<div data-lx-delivery="{{ closest.product.id }}">') === 1 && zaehle(ohneKommentar, 'data-lx-delivery=') === 1);
  pruefe('versteckter Span mit dem festen Satz steht genau einmal im Block', zaehle(ohneKommentar, SPAN) === 1);
  pruefe('pruefeNeu() aus apply_theme.mjs (Zeichen, Grösse, Klammerpaare, Tag-Paare) beanstandet den Blocktext nicht', pruefeNeu(blockText).length === 0, pruefeNeu(blockText).join(' | '));
  const skriptText = (ohneKommentar.match(/<script>([\s\S]*)<\/script>/) || [])[1] || '';
  pruefe('Skript: nie zwei schliessende geschweifte Klammern hintereinander, keine Liquid-Zeichen, kein «undefined»', skriptText.length > 200 && !skriptText.includes('}}') && !skriptText.includes('{{') && !skriptText.includes('{%') && !skriptText.includes('%}') && !/undefined|NaN/.test(skriptText));

  // ===== B. Handgeschriebene Fälle (exakte Erwartung) =====
  beginne('B Einzelfälle');
  const PL = (x) => `${x} auf Lager · versandbereit`;
  const GRUND = 'Auf Lager · versandbereit';
  const einzel = [
    ['Standard qty 50 + frischer Stempel', ST({ variante: V({ qty: 50 }) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['qty 2', ST(), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['qty 1 mit «Stück»', ST({ variante: V({ qty: 1 }) }), { text: 'Nur noch 1 Stück auf Lager · versandbereit', farbe: ORANGE, box: true }],
    ['qty 3', ST({ variante: V({ qty: 3 }) }), { text: PL('Nur noch 3'), farbe: ORANGE, box: true }],
    ['qty 4 wenige', ST({ variante: V({ qty: 4 }) }), { text: PL('Nur noch wenige'), farbe: ORANGE, box: true }],
    ['qty 5 wenige', ST({ variante: V({ qty: 5 }) }), { text: PL('Nur noch wenige'), farbe: ORANGE, box: true }],
    ['qty 6 grün', ST({ variante: V({ qty: 6 }) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['qty 0 grün', ST({ variante: V({ qty: 0 }) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['qty -2 grün', ST({ variante: V({ qty: -2 }) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['qty fehlt grün', ST({ variante: V({ qty: undefined }) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['qty als Text «3»', ST({ variante: V({ qty: '3' }) }), { text: PL('Nur noch 3'), farbe: ORANGE, box: true }],
    ['ohne Stempel', ST({ stempel: undefined }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel 27 h alt', ST({ stempel: iso(97200) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel 1 h in der Zukunft', ST({ stempel: iso(-3600) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel Müll «kein Datum»', ST({ stempel: 'kein Datum' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel Müll mit Doppelpunkt «Stand: unbekannt»', ST({ stempel: 'Stand: unbekannt' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel leer', ST({ stempel: '' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel nur Datum ohne Uhrzeit', ST({ stempel: '2026-11-05' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel als Epoche (nur Ziffern)', ST({ stempel: String(jetztS() - 60) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel 1970-01-01T00:00:00Z', ST({ stempel: '1970-01-01T00:00:00Z' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel 9999-12-31T23:59:59Z', ST({ stempel: '9999-12-31T23:59:59Z' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel genau 93600 s alt gilt', ST({ stempel: iso(93600) }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Stempel 93601 s alt gilt nicht', ST({ stempel: iso(93601) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel genau 300 s in der Zukunft gilt', ST({ stempel: iso(-300) }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Stempel 301 s in der Zukunft gilt nicht', ST({ stempel: iso(-301) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel genau jetzt gilt', ST({ stempel: iso(0) }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Stempel mit Offset +01:00 und Millisekunden', ST({ stempel: new Date(JETZT - 7200e3).toISOString().replace('.000Z', '.000+00:00') }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Stempel als Zeitobjekt (Metafeld-Typ date_time, «2026-11-05 07:30:00 UTC»)', ST({ stempel: wieRuby(JETZT - 3600e3) }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Stempel als altes Zeitobjekt', ST({ stempel: wieRuby(JETZT - 97200e3) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel als Text im Format «2026-11-05 07:30:00 UTC»', ST({ stempel: '2026-11-05 07:30:00 UTC' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Stempel nur Uhrzeit «hh:mm» (Ruby-Liquid läse «heute hh:mm», also gültig frisch)', ST({ stempel: uhrzeitJetzt() }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel Müll, beginnt mit aktueller Epoche «NNN-a-b: x»', ST({ stempel: `${jetztS() - 60}-a-b: x` }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel Müll «a-b-c: d»', ST({ stempel: 'a-b-c: d' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Stempel unmögliches Datum «2026-13-45T25:61:00Z»', ST({ stempel: '2026-13-45T25:61:00Z' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «0» schaltet ab', ST({ schalter: '0' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter « 0 » mit Leerzeichen schaltet ab', ST({ schalter: ' 0 ' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter Zahl 0 schaltet ab', ST({ schalter: 0 }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «false» schaltet ab', ST({ schalter: 'false' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «FALSE» schaltet ab', ST({ schalter: 'FALSE' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter boolean false schaltet ab', ST({ schalter: false }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «aus» schaltet ab', ST({ schalter: 'aus' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «off» schaltet ab', ST({ schalter: 'off' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «nein» schaltet ab', ST({ schalter: 'nein' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «no» schaltet ab', ST({ schalter: 'no' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «0.0» schaltet ab', ST({ schalter: '0.0' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «00» schaltet ab', ST({ schalter: '00' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «-1» schaltet ab', ST({ schalter: '-1' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «2» schaltet ab', ST({ schalter: '2' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter Zahl 2 schaltet ab', ST({ schalter: 2 }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «null» schaltet ab', ST({ schalter: 'null' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «nil» schaltet ab', ST({ schalter: 'nil' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «n» schaltet ab', ST({ schalter: 'n' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «yes» (nicht in der Liste) schaltet ab', ST({ schalter: 'yes' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «enabled» schaltet ab', ST({ schalter: 'enabled' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «ja!» (Tippfehler) schaltet ab', ST({ schalter: 'ja!' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «an.» schaltet ab', ST({ schalter: 'an.' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «ein ja» schaltet ab', ST({ schalter: 'ein ja' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «tru» (Tippfehler) schaltet ab', ST({ schalter: 'tru' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «1.0» schaltet ab', ST({ schalter: '1.0' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «11» schaltet ab', ST({ schalter: '11' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «ON/OFF» schaltet ab', ST({ schalter: 'ON/OFF' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «ja,nein» schaltet ab', ST({ schalter: 'ja,nein' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «1» lässt an', ST({ schalter: '1' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter Zahl 1 lässt an', ST({ schalter: 1 }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter «true» lässt an', ST({ schalter: 'true' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter «TRUE» lässt an', ST({ schalter: 'TRUE' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter « True » mit Leerzeichen lässt an', ST({ schalter: ' True ' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter boolean true lässt an', ST({ schalter: true }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter «an» lässt an', ST({ schalter: 'an' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter «AN» lässt an', ST({ schalter: 'AN' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter «ein» lässt an', ST({ schalter: 'ein' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter «Ein» lässt an', ST({ schalter: 'Ein' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter «ja» lässt an', ST({ schalter: 'ja' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter « Ja » mit Leerzeichen lässt an', ST({ schalter: ' Ja ' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter «on» lässt an', ST({ schalter: 'on' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter «ON» lässt an', ST({ schalter: 'ON' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter « 1 » mit Leerzeichen lässt an', ST({ schalter: ' 1 ' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter «\n1\n» mit Zeilenumbruch lässt an', ST({ schalter: '\n1\n' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter leer lässt an', ST({ schalter: '' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter nur Leerzeichen (getrimmt leer) lässt an', ST({ schalter: '   ' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['inventory_management leer', ST({ variante: V({ mgmt: null }) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['inventory_management fremd', ST({ variante: V({ mgmt: 'fulfillment_service' }) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['inventory_policy continue', ST({ variante: V({ policy: 'continue' }) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['inventory_policy fehlt', ST({ variante: V({ policy: undefined }) }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Tag ch-lager bekommt Zahl', ST({ tags: ['ch-lager'] }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Tag blitzversand allein bekommt keine Zahl', ST({ tags: ['blitzversand'] }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Tag profil-ch-lager allein: Asien-Zweig, keine Zahl', ST({ tags: ['profil-ch-lager'] }), { text: 'Verfügbar · Direktversand aus Asien', farbe: GRUEN, box: true }],
    ['fortura + eu-lager: Schweizer Zweig gewinnt, Zahl', ST({ tags: ['fortura', 'eu-lager'] }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['fortura + blitzversand', ST({ tags: ['fortura', 'blitzversand'] }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Tag fortura-x ist nicht fortura (exakter Tag)', ST({ tags: ['fortura-x'] }), { text: 'Verfügbar · Direktversand aus Asien', farbe: GRUEN, box: true }],
    ['EU-Lager nie Zahl', ST({ tags: ['eu-lager'] }), { text: 'Auf Lager im EU-Lager', farbe: GRUEN, box: true }],
    ['Druck (printful) nie Zahl', ST({ tags: ['printful_personalized_product'] }), { text: 'Wird für dich gedruckt', farbe: GRUEN, box: true }],
    ['Druck (prodigi) nie Zahl', ST({ tags: ['prodigi_personalized_product'] }), { text: 'Wird für dich gedruckt', farbe: GRUEN, box: true }],
    ['Druck (selbst-gestalten) nie Zahl', ST({ tags: ['selbst-gestalten'] }), { text: 'Wird für dich gedruckt', farbe: GRUEN, box: true }],
    ['CJ (ohne Spezialtag) nie Zahl', ST({ tags: ['cj'] }), { text: 'Verfügbar · Direktversand aus Asien', farbe: GRUEN, box: true }],
    ['ganz ohne Tags', ST({ tags: [] }), { text: 'Verfügbar · Direktversand aus Asien', farbe: GRUEN, box: true }],
    ['Ausführung ausverkauft, andere kaufbar', ST({ variante: V({ ok: false, qty: 0 }) }), { text: 'Diese Ausführung ist ausverkauft', farbe: ROT, box: false }],
    ['Ausführung ausverkauft trotz qty 2 und Stempel', ST({ variante: V({ ok: false, qty: 2 }) }), { text: 'Diese Ausführung ist ausverkauft', farbe: ROT, box: false }],
    ['Ausführung ausverkauft bei CJ-Ware', ST({ tags: ['cj'], variante: V({ ok: false, mgmt: null }) }), { text: 'Diese Ausführung ist ausverkauft', farbe: ROT, box: false }],
    ['Produkt gar nicht verfügbar', ST({ produktOk: false, variante: V({ ok: false, qty: 0 }) }), { text: 'Momentan ausverkauft', farbe: ROT, box: false }],
    ['Produkt gar nicht verfügbar, EU-Lager', ST({ tags: ['eu-lager'], produktOk: false, variante: V({ ok: false }) }), { text: 'Momentan ausverkauft', farbe: ROT, box: false }],
    ['Variante kaufbar, Produkt «nicht» (unmöglicher Zustand): Variante entscheidet', ST({ produktOk: false }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['ohne Variantenobjekt, Produkt kaufbar: Rückfall wie früher', ST({ variante: null }), { text: GRUND, farbe: GRUEN, box: true }],
    ['ohne Variantenobjekt, Produkt nicht kaufbar', ST({ variante: null, produktOk: false }), { text: 'Momentan ausverkauft', farbe: ROT, box: false }],
    ['Liechtenstein: Pille wie sonst', ST({ land: 'LI' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
  ];
  for (const [name, f, soll] of einzel) pruefeFall(name, f, soll);
  // Liechtenstein-Text der Lieferbox
  {
    const h = rendere(ST({ land: 'LI' }));
    pruefe('LI: Kassentext statt Datum', h.includes('Lieferung nach Liechtenstein: das voraussichtliche Datum zeigt die Kasse.') && !h.includes('Lieferung voraussichtlich'));
  }
  // Ohne Produkt: gar keine Ausgabe
  {
    const h = rendere(ST({ keinProdukt: true }));
    pruefe('ohne closest.product: leere Ausgabe (kein leeres div, keine Pille)', h.trim() === '', JSON.stringify(h.slice(0, 80)));
  }
  // Ausverkauft: keine Lieferbox, kein Datum, kein «Nur noch»
  {
    const h = rendere(ST({ variante: V({ ok: false }) }));
    const z = zaehler(h);
    pruefe('ausverkaufte Ausführung: weder Datum noch Lieferbox noch «Nur noch»/«Auf Lager»', z.liefer === 0 && z.box === 0 && z.nurNoch === 0 && z.aufLager === 0 && !/Nov\.|Dez\./.test(h));
  }

  // ===== C. Volle Matrix gegen das Orakel =====
  beginne('C Matrix');
  const TAGS = { fortura: ['fortura'], cj: ['cj'], pod: ['printful_personalized_product'], eu: ['eu-lager'] };
  const MENGEN = [0, 1, 2, 3, 4, 5, 6, 50];
  const STEMPEL = { fehlt: undefined, frisch: () => iso(3600), alt27h: () => iso(97200), zukunft: () => iso(-3600), muell: () => 'kein Datum' };
  const SCHALTER = { fehlt: undefined, null0: '0', eins: '1', aus: 'aus', ja: ' JA ' };
  for (const [tn, tags] of Object.entries(TAGS)) for (const vOk of [true, false]) for (const pOk of [true, false])
    for (const q of MENGEN) for (const [sn, sf] of Object.entries(STEMPEL)) for (const [wn, sw] of Object.entries(SCHALTER))
      for (const mgmt of ['shopify', null]) for (const pol of ['deny', 'continue']) {
        const f = { id: 7, tags, produktOk: pOk, variante: { ok: vOk, qty: q, mgmt, policy: pol }, stempel: typeof sf === 'function' ? sf() : sf, schalter: sw };
        const soll = erwartet(f);
        const name = `${tn}/V${vOk ? '+' : '-'}/P${pOk ? '+' : '-'}/q${q}/${sn}/${wn}/${mgmt || 'leer'}/${pol}`;
        const html = rendere(f); const p = lies(html); const z = zaehler(html);
        if (!p) { pruefe(name + ' Pille lesbar', false); continue; }
        pruefe(name + ' Pille', p.text === soll.text && p.farbe === soll.farbe.farbe && p.punkt === soll.farbe.punkt && p.schein === soll.farbe.schein, `ist «${p.text}» ${p.farbe}, soll «${soll.text}» ${soll.farbe.farbe}`);
        pruefe(name + ' Nur noch', z.nurNoch === (soll.text.startsWith('Nur noch') ? 1 : 0));
        pruefe(name + ' Auf Lager', z.aufLager === (soll.text.startsWith('Auf Lager') ? 1 : 0));
        pruefe(name + ' Lieferung voraussichtlich', z.liefer === (soll.box ? 1 : 0) && z.box === (soll.box ? 1 : 0));
        pruefe(name + ' ausverkauft', z.ausverkauft === (soll.farbe === ROT ? 1 : 0));
        pruefe(name + ' Hygiene', !HYGIENE.test(html));
        const zz = zerlege(html);
        pruefe(name + ' Aufbau', zz !== null && zz.pid === '7' && zaehle(html, '<div data-lx-delivery') === 1 && zaehle(html, '<script') === 1 && zaehle(html, SPAN) === (soll.farbe === ROT ? 1 : 0));
      }

  // ===== D. Inhalt des Containers ist im Standardfall zeichengleich mit der Ausgabe des ALTEN Blocks =====
  beginne('D Gleich wie alt');
  const ZEITEN = [
    ['Do 09:30', T()], ['Do 12:30 nach Annahmeschluss', Date.UTC(2026, 10, 5, 11, 30)], ['Fr 11:59', Date.UTC(2026, 10, 6, 10, 59)],
    ['Sa 10:00', Date.UTC(2026, 10, 7, 9, 0)], ['So 21:00', Date.UTC(2026, 10, 8, 20, 0)], ['Mo 00:30', Date.UTC(2026, 10, 8, 23, 30)], ['Dezember', Date.UTC(2026, 11, 18, 8, 0)],
  ];
  const TAGSETS = [['fortura'], ['fortura', 'profil-ch-lager'], ['ch-lager'], ['blitzversand'], ['eu-lager'], ['printful_personalized_product'], ['selbst-gestalten'], ['cj']];
  const PREISE = [1990, 4999, 5000, 5555, 5556];
  const VARIANTEN = [
    [V({ qty: 2 }), undefined, undefined], // ohne Stempel
    [V({ qty: 50 }), 'frisch', undefined], // viel Bestand mit Stempel
    [V({ qty: 2 }), 'frisch', '0'],        // Notschalter aus
    [V({ qty: 2, mgmt: null }), 'frisch', undefined], // ungetrackt
    [V({ qty: 2, policy: 'continue' }), 'frisch', undefined],
    [null, 'frisch', undefined],           // ohne Variantenobjekt
  ];
  let gleich = 0; let exakt = 0; let nr = 0;
  for (const [zn, ms] of ZEITEN) {
    JETZT = ms;
    for (const tags of TAGSETS) for (const preis of PREISE) for (const land of ['CH', 'LI']) for (const stufe of [undefined, 0]) {
      const [variante, st, sw] = VARIANTEN[nr++ % VARIANTEN.length];
      const f = { tags, produktOk: true, preis, land, stufe, druckIds: tags.includes('selbst-gestalten') ? ',123,' : undefined, id: 123, variante, stempel: st ? iso(3600) : undefined, schalter: sw };
      const a = engine.renderSync(tplAlt, ctx(f)); const nRoh = rendere(f); const zn2 = zerlege(nRoh); const n = zn2 ? zn2.innen : '';
      const ok = zn2 !== null && norm(a) === norm(n);
      if (ok) gleich++; if (zn2 !== null && a === n) exakt++;
      pruefe(`gleich wie alt (Inhalt des Containers) · ${zn} · ${tags.join('+')} · ${preis} · ${land} · stufe ${stufe} · V${nr % VARIANTEN.length}`, ok, ok ? '' : norm(nRoh).slice(0, 200));
      pruefe(`Container und Skript genau einmal · ${zn} · ${tags.join('+')} · ${preis} · ${land} · stufe ${stufe}`, zn2 !== null && zaehle(nRoh, '<div data-lx-delivery="123">') === 1 && zaehle(nRoh, '<script') === 1 && !nRoh.includes(SPAN_AUF));
    }
  }
  R.gleich = gleich; R.exakt = exakt;
  JETZT = T();
  {
    // Produkt gar nicht verfügbar, ohne Variantenobjekt: die neue Pille ist byte-gleich der alten, danach nur der versteckte Span (die Lieferbox fällt weg)
    const f = ST({ variante: null, produktOk: false, stempel: undefined });
    const a = engine.renderSync(tplAlt, ctx(f)); const zn3 = zerlege(rendere(f)); const n = zn3 ? zn3.innen : '';
    pruefe('ausverkauft: neue Pille ist byte-gleich der alten Pille, danach nur der versteckte Span, keine Lieferbox mehr', zn3 !== null && n.endsWith('\n' + SPAN) && a.startsWith(n.slice(0, n.length - SPAN.length - 1)) && n.slice(0, n.length - SPAN.length - 1).endsWith('Momentan ausverkauft</div>') && a.length > n.length - SPAN.length - 1);
  }

  // ===== E. Echtes Ruby-Liquid (optional) =====
  if (ruby) rubyTeil(R, beginne, pruefe, blockText);
  return R;
}

// ---------- Ruby-Gegenprobe ----------
function rubyTeil(R, beginne, pruefe, blockText) {
  beginne('E Ruby-Liquid');
  const gems = process.env.RUBY_LIQUID_GEMS || SCRATCH + '/rubygems';
  const skript = path.join(HIER, 'rubyrender.rb');
  if (!fs.existsSync(gems) || !fs.existsSync(skript) || spawnSync('ruby', ['-v']).status !== 0) { R.rubyUebersprungen = true; return; }
  const rubyRender = (template, nowMs, faelle) => {
    const r = spawnSync('ruby', [skript], { input: JSON.stringify({ template, now: Math.floor(nowMs / 1000), faelle }), env: { ...process.env, RUBY_LIQUID_GEMS: gems }, maxBuffer: 1 << 28, encoding: 'utf8' });
    if (r.status !== 0) throw new Error('Ruby-Lauf fehlgeschlagen: ' + (r.stderr || '').slice(0, 400));
    return JSON.parse(r.stdout);
  };
  const rund = (c) => JSON.parse(JSON.stringify(c));
  // Fälle: Einzelfälle aus der Matrix, gleichmässig gezogen, plus feste Randfälle
  const faelle = [];
  let i = 0;
  for (const tags of [['fortura'], ['ch-lager'], ['blitzversand'], ['eu-lager'], ['cj'], ['printful_personalized_product'], ['fortura-x']])
    for (const vOk of [true, false]) for (const pOk of [true, false]) for (const q of [0, 1, 2, 3, 4, 5, 6, 50])
      for (const st of [undefined, iso(3600), iso(97200), iso(-3600), 'kein Datum', 'Stand: unbekannt', '', '2026-11-05', iso(93600), iso(93601), iso(-300), iso(-301), '1970-01-01T00:00:00Z', uhrzeitJetzt(), `${jetztS() - 60}-a-b: x`, 'a-b-c: d', '2026-11-05 07:30:00 UTC', iso(7200).replace('Z', '.000+00:00')])
        for (const sw of [undefined, '0', '1', 'false', ' 0 ', '', 'aus', 'yes', ' JA ', 'an'])
          for (const mgmt of ['shopify', null]) for (const pol of ['deny', 'continue']) {
            if ((i++ % 41) !== 0) continue; // jeder einundvierzigste
            faelle.push({ tags, produktOk: pOk, variante: { ok: vOk, qty: q, mgmt, policy: pol }, stempel: st, schalter: sw });
          }
  // Alle Randstempel und Mengen mit dem Normalfall (fortura, kaufbar, shopify, deny), damit Ruby jeden einzeln sieht
  const STAEMPEL_ROH = [undefined, iso(3600), iso(97200), iso(-3600), 'kein Datum', 'Stand: unbekannt', '', '2026-11-05', iso(93600), iso(93601), iso(-300), iso(-301), '1970-01-01T00:00:00Z', uhrzeitJetzt(),
    `${jetztS() - 60}-a-b: x`, `${jetztS() - 60}: Müll`, 'a-b-c: d', '2026-13-45T25:61:00Z', '2026-11-05 07:30:00 UTC', iso(7200).replace('Z', '.000+00:00')];
  for (const st of STAEMPEL_ROH) faelle.push(ST({ stempel: st }));
  for (const q of ['3', undefined, null, -2, 0, 1, 5, 6]) faelle.push(ST({ variante: V({ qty: q }) }));
  faelle.push(ST({ variante: null }), ST({ variante: null, produktOk: false }), ST({ keinProdukt: true }), ST({ land: 'LI' }), ST({ stempel: 12345 }), ST({ stempel: true }), ST({ schalter: 0 }), ST({ schalter: false }), ST({ schalter: true }), ST({ schalter: 2 }), ST({ schalter: 'aus' }), ST({ schalter: 'On' }), ST({ schalter: ' 1 ' }), ST({ schalter: 'ein' }));
  const ctxs = faelle.map((f) => rund(ctx(f)));
  let rr; let rrAlt;
  try { rr = rubyRender(blockText, JETZT, ctxs); } catch (e) { pruefe('Ruby-Lauf', false, String(e)); return; }
  R.rubyVersion = rr.version;
  pruefe('Ruby-Liquid ' + rr.version + ': strikter Parser und strikte Filter melden keinen Fehler', rr.fehler.length === 0, rr.fehler.join(' | '));
  pruefe('Ruby: Anzahl Ergebnisse', rr.ergebnisse.length === ctxs.length);
  const tplJs = engine.parse(blockText);
  faelle.forEach((f, k) => {
    const ruby = rr.ergebnisse[k]; const js = engine.renderSync(tplJs, ctxs[k]);
    pruefe(`Ruby = LiquidJS #${k}`, norm(ruby) === norm(js), `ruby «${norm(ruby).slice(0, 120)}» js «${norm(js).slice(0, 120)}»`);
    if (f.keinProdukt) { pruefe(`Ruby #${k} leer ohne Produkt`, ruby.trim() === ''); return; }
    pruefe(`Ruby #${k} Aufbau: Container mit Produkt-ID und Skript`, zerlege(ruby) !== null && zerlege(ruby).pid === '123' && zaehle(ruby, '<script') === 1);
    const soll = erwartet({ ...f, tags: f.tags, produktOk: f.produktOk, variante: f.variante });
    const p = lies(ruby);
    pruefe(`Ruby #${k} Pille wie Orakel`, !!p && p.text === soll.text && p.farbe === soll.farbe.farbe && (zaehler(ruby).box === 1) === soll.box, `ruby ${p && p.text} soll ${soll.text}`);
  });
  // Standardfall gegen den alten Block mit echtem Ruby-Liquid, mehrere feste Zeiten
  const zeiten = [T(), Date.UTC(2026, 10, 5, 11, 30), Date.UTC(2026, 10, 7, 9, 0), Date.UTC(2026, 11, 18, 8, 0)];
  for (const ms of zeiten) {
    JETZT = ms;
    const std = [];
    for (const tags of [['fortura'], ['eu-lager'], ['printful_personalized_product'], ['cj'], ['fortura', 'profil-ch-lager']]) for (const land of ['CH', 'LI'])
      std.push(rund(ctx({ id: 123, tags, produktOk: true, land, preis: 2990, variante: V({ qty: 2 }), stempel: undefined })));
    const a = rubyRender(ALT, ms, std); const n = rubyRender(blockText, ms, std);
    std.forEach((c, k) => { const zr = zerlege(n.ergebnisse[k]); pruefe(`Ruby: Inhalt des Containers im neuen Block = alter Block (Zeit ${new Date(ms).toISOString()}, Fall ${k})`, zr !== null && norm(a.ergebnisse[k]) === norm(zr.innen), norm(n.ergebnisse[k]).slice(0, 160)); });
  }
  JETZT = T();
}

// ---------- Mutationsprobe ----------
const ZAHL = (s, t) => s.split(t).length - 1;
function mutant(text, von, nach, anzahl = 1) {
  if (ZAHL(text, von) !== anzahl) throw new Error(`Mutationsmuster ${JSON.stringify(von)} kommt ${ZAHL(text, von)}× vor, erwartet ${anzahl}×`);
  return text.split(von).join(nach);
}
const SW_BED = "{%- if lx_bs_sw != '' and lx_bs_sw != '1' and lx_bs_sw != 'true' and lx_bs_sw != 'an' and lx_bs_sw != 'ein' and lx_bs_sw != 'ja' and lx_bs_sw != 'on' -%}";
const SKRIPT_WAECHTER = 'if(window.__lxLiefer)return;window.__lxLiefer=1;';
const ERSETZEN = 'if(alle[i].innerHTML!==neu.innerHTML)alle[i].innerHTML=neu.innerHTML;';
const SPAN_ZEILE = '<span hidden data-lx-kein-liefertermin>Lieferung voraussichtlich: erst wieder, wenn diese Ausführung lieferbar ist.</span>\n';
const B_TAG = "{%- if closest.product.tags contains 'fortura' or closest.product.tags contains 'ch-lager' -%}";
const MUTANTEN = [
  { id: 'M01', was: '(b) inventory_management == shopify entfällt', von: "lx_v.inventory_management == 'shopify' and ", nach: '' },
  { id: 'M02', was: '(c) inventory_policy == deny entfällt', von: " and lx_v.inventory_policy == 'deny'", nach: '' },
  { id: 'M03', was: 'Stempel: keine Prüfung gegen die Zukunft', von: ' and lx_bs_vor <= 300', nach: '' },
  { id: 'M04', was: 'Stufe «wenige» reicht bis 6 statt 5', von: 'lx_bs_q <= 5', nach: 'lx_bs_q <= 6' },
  { id: 'M05', was: 'closest.product.available statt lx_v.available', von: '{%- if lx_v -%}{%- assign lx_ok = lx_v.available -%}', nach: '{%- if lx_v -%}{%- assign lx_ok = closest.product.available -%}' },
  { id: 'M06', was: 'Notschalter wird ignoriert', von: SW_BED, nach: "{%- if lx_bs_sw == 'zzz' -%}" },
  { id: 'M07', was: 'Lieferbox auch bei ausverkaufter Ausführung', von: '{%- endif -%}\n{%- if lx_ok -%}\n{%- assign months', nach: '{%- endif -%}\n{%- if true -%}\n{%- assign months' },
  { id: 'M08', was: '(a) Tag-Bedingung fortura/ch-lager entfällt', von: B_TAG, nach: '{%- if true -%}' },
  { id: 'M09', was: 'Stempel-Alter 93600 s -> 97300 s', von: 'lx_bs_alter <= 93600', nach: 'lx_bs_alter <= 97300' },
  { id: 'M10', was: 'Stempel-Alter: Grenze exklusiv (< 93600)', von: 'lx_bs_alter <= 93600', nach: 'lx_bs_alter < 93600' },
  { id: 'M11', was: 'Zukunftsgrenze 300 s -> 3000 s', von: 'lx_bs_vor <= 300', nach: 'lx_bs_vor <= 3000' },
  { id: 'M12', was: 'Menge 1 ohne «Stück»', von: '{%- if lx_bs_q == 1 -%}', nach: '{%- if lx_bs_q == 99 -%}' },
  { id: 'M13', was: 'Stufe 1 beginnt bei 0 statt 1', von: 'lx_bs_q >= 1 and lx_bs_q <= 3', nach: 'lx_bs_q >= 0 and lx_bs_q <= 3' },
  { id: 'M14', was: 'Stufe «genaue Zahl» reicht bis 4', von: 'lx_bs_q >= 1 and lx_bs_q <= 3', nach: 'lx_bs_q >= 1 and lx_bs_q <= 4' },
  { id: 'M15', was: 'Orange Textfarbe falsch (grün)', von: "{%- assign lx_c_text = '#9a5b00' -%}", nach: "{%- assign lx_c_text = '#1e7a2e' -%}", anzahl: 2 },
  { id: 'M16', was: 'Stempel nur Datum (ohne Uhrzeit) wird akzeptiert', von: "{%- if lx_bs_txt contains ':' and lx_bs_teile >= 3 -%}", nach: '{%- if lx_bs_teile >= 3 -%}' },
  { id: 'M17', was: 'Tag ch-lager zählt nicht', von: " or closest.product.tags contains 'ch-lager' -%}", nach: ' -%}' },
  { id: 'M18', was: 'Tag blitzversand zählt (gehört nicht dazu)', von: " or closest.product.tags contains 'ch-lager' -%}", nach: " or closest.product.tags contains 'ch-lager' or closest.product.tags contains 'blitzversand' -%}" },
  { id: 'M19', was: 'Rückfall ohne Variantenobjekt entfällt', von: '{%- else -%}{%- assign lx_ok = closest.product.available -%}{%- endif -%}', nach: '{%- else -%}{%- assign lx_ok = false -%}{%- endif -%}' },
  { id: 'M20', was: 'Texte «Diese Ausführung»/«Momentan» vertauscht', von: "{%- if closest.product.available -%}{%- assign zustand = 'Diese Ausführung ist ausverkauft' -%}", nach: "{%- unless closest.product.available -%}{%- assign zustand = 'Diese Ausführung ist ausverkauft' -%}" , reparatur: ['{%- else -%}{%- assign zustand = \'Momentan ausverkauft\' -%}{%- endif -%}', '{%- else -%}{%- assign zustand = \'Momentan ausverkauft\' -%}{%- endunless -%}'] },
  { id: 'M21', was: 'Notschalter «true» gilt nicht als AN (zu streng)', von: " and lx_bs_sw != 'true'", nach: '' },
  { id: 'M22', was: 'Notschalter mit Leerzeichen wird nicht getrimmt (strip entfällt)', von: ' | strip | downcase', nach: ' | downcase' },
  { id: 'M30', was: 'Notschalter Grossschreibung zählt nicht (downcase entfällt)', von: ' | strip | downcase', nach: ' | strip' },
  { id: 'M31', was: 'Notschalter wieder fail-open: nur «0»/«false» schalten ab', von: SW_BED, nach: "{%- if lx_bs_sw == '0' or lx_bs_sw == 'false' -%}" },
  { id: 'M32', was: 'Notschalter «1» gilt nicht als AN', von: " and lx_bs_sw != '1'", nach: '' },
  { id: 'M33', was: 'Notschalter leer/fehlend gilt nicht als AN', von: "lx_bs_sw != '' and ", nach: '' },
  { id: 'M34', was: 'Notschalter «an» gilt nicht als AN', von: " and lx_bs_sw != 'an'", nach: '' },
  { id: 'M35', was: 'Notschalter «ein» gilt nicht als AN', von: " and lx_bs_sw != 'ein'", nach: '' },
  { id: 'M36', was: 'Notschalter «ja» gilt nicht als AN', von: " and lx_bs_sw != 'ja'", nach: '' },
  { id: 'M37', was: 'Notschalter «on» gilt nicht als AN', von: " and lx_bs_sw != 'on'", nach: '' },
  { id: 'M23', was: 'Alter wird gar nicht geprüft', von: 'lx_bs_alter <= 93600 and ', nach: '' },
  { id: 'M24', was: 'Formprüfung «Datum mit mindestens zwei Bindestrichen» entfällt', von: "{%- if lx_bs_txt contains ':' and lx_bs_teile >= 3 -%}", nach: "{%- if lx_bs_txt contains ':' -%}" },
  { id: 'M27', was: 'Wächter «date hat den Text wirklich umgerechnet» entfällt', von: '{%- if lx_bs_st != lx_bs_txt -%}', nach: '{%- if true -%}' },
  { id: 'M28', was: 'Zukunftsabstand falsch herum (Stempel minus jetzt statt jetzt minus Stempel)', von: '{%- assign lx_bs_vor = lx_bs_st | minus: now_s -%}', nach: '{%- assign lx_bs_vor = now_s | minus: lx_bs_st -%}' },
  { id: 'M29', was: 'Menge wird nicht in eine Zahl gewandelt (kein plus: 0)', von: 'lx_v.inventory_quantity | plus: 0', nach: 'lx_v.inventory_quantity' },
  { id: 'M25', was: 'Pille zeigt nie orange Punktfarbe', von: "{%- assign lx_c_punkt = '#e8890c' -%}", nach: "{%- assign lx_c_punkt = '#2eaf46' -%}", anzahl: 2 },
  { id: 'M26', was: 'Rot-Pille ohne closest.product-Wächter (Block rendert auch ohne Produkt)', von: '{%- if closest.product -%}\n{%- assign lx_v', nach: '{%- if true -%}\n{%- assign lx_v' },
  // --- Variantenwechsel, Container, versteckter Span (browser: true = der Browsertest läuft immer mit; Skript-Mutanten erkennt nur er) ---
  { id: 'W01', was: 'Container fehlt (kein data-lx-delivery)', browser: true, von: '<div data-lx-delivery="{{ closest.product.id }}">\n{%- if lx_ok -%}', nach: '{%- if lx_ok -%}', zusatz: [['{%- endif -%}\n</div>\n<script>', '{%- endif -%}\n<script>']] },
  { id: 'W02', was: 'Container ohne Produkt-ID', browser: true, von: 'data-lx-delivery="{{ closest.product.id }}"', nach: 'data-lx-delivery=""' },
  { id: 'W03', was: 'Container umhüllt nur die Pille, die Lieferbox bleibt draussen', browser: true, von: '{%- endif -%}\n</div>\n<script>', nach: '{%- endif -%}\n<script>',
    zusatz: [['{{ zustand }}</div>\n{%- else -%}', '{{ zustand }}</div></div>\n{%- else -%}'], ['lieferbar ist.</span>\n{%- endif -%}\n{%- if lx_ok -%}', 'lieferbar ist.</span></div>\n{%- endif -%}\n{%- if lx_ok -%}']] },
  { id: 'W04', was: 'Skript ohne Wächter (zweimal eingebunden = zwei Zuhörer)', browser: true, von: SKRIPT_WAECHTER, nach: '' },
  { id: 'W05', was: 'Wächter wird geprüft, aber nie gesetzt', browser: true, von: SKRIPT_WAECHTER, nach: 'if(window.__lxLiefer)return;' },
  { id: 'W06', was: 'Skript ersetzt nie', browser: true, von: ERSETZEN, nach: '' },
  { id: 'W07', was: 'Skript ersetzt auch den Container eines anderen Produkts', browser: true, von: "if(alle[i].getAttribute('data-lx-delivery')===pid){", nach: 'if(true){' },
  { id: 'W08', was: 'Skript hört auf das falsche Ereignis (variant:updated)', browser: true, von: "document.addEventListener('variant:update'", nach: "document.addEventListener('variant:updated'" },
  { id: 'W09', was: 'versteckter Span fehlt (Fallback fügt bei ausverkauft ein Datum ein)', browser: true, von: SPAN_ZEILE, nach: '' },
  { id: 'W10', was: 'Span ohne hidden (für alle sichtbar)', browser: true, von: '<span hidden data-lx-kein-liefertermin>', nach: '<span data-lx-kein-liefertermin>' },
  { id: 'W11', was: 'Span-Satz enthält «Lieferung voraussichtlich» nicht (Fallback erkennt ihn nicht)', browser: true, von: 'Lieferung voraussichtlich: erst wieder', nach: 'Lieferbar: erst wieder' },
  { id: 'W12', was: 'Span auch bei kaufbarer Ausführung', browser: true, von: '{{ zustand }}</div>\n{%- else -%}', nach: '{{ zustand }}</div>\n<span hidden data-lx-kein-liefertermin>Lieferung voraussichtlich: erst wieder, wenn diese Ausführung lieferbar ist.</span>\n{%- else -%}' },
  { id: 'W13', was: 'Skript wirft bei leerem detail (Absicherung try/catch entfernt)', browser: true, von: 'var d=e&&e.detail,h=d&&d.data&&d.data.html;', nach: 'var d=e.detail,h=d.data.html;',
    zusatz: [["document.addEventListener('variant:update',function(e){try{", "document.addEventListener('variant:update',function(e){if(1){"], ['}catch(x){}\n});', '}\n});']] },
  { id: 'W14', was: 'Dokument ohne Container leert die Pille', browser: true, von: '\nif(!neu)return;\n', nach: "\nif(!neu){var a0=document.querySelector('[data-lx-delivery]');if(a0)a0.innerHTML='';return;}\n" },
  { id: 'W15', was: 'Text statt Document wird nicht gelesen', browser: true, von: "if(typeof h==='string')h=new DOMParser().parseFromString(h,'text/html');\n", nach: '' },
  { id: 'W16', was: 'newProduct-Zweig fehlt', browser: true, von: "if(!n&&d.data.newProduct&&alle.length){alle[0].setAttribute('data-lx-delivery',pid);alle[0].innerHTML=neu.innerHTML;}\n", nach: '' },
  { id: 'W17', was: 'Skript setzt auch bei gleichem Zustand neu (Vergleich entfällt)', browser: true, von: 'if(alle[i].innerHTML!==neu.innerHTML)', nach: '' },
  { id: 'W18', was: 'Skript steht ausserhalb von closest.product (auch ohne Produkt)', browser: true, von: '</div>\n<script>', nach: '</div>\n{%- endif -%}\n<script>', zusatz: [['</script>\n{%- endif -%}', '</script>']] },
  { id: 'W19', was: 'nur der erste passende Container wird getauscht (break)', browser: true, von: '{n++;if(alle[i].innerHTML!==neu.innerHTML)alle[i].innerHTML=neu.innerHTML;}', nach: '{n++;if(alle[i].innerHTML!==neu.innerHTML)alle[i].innerHTML=neu.innerHTML;break;}' },
  { id: 'W20', was: 'zweites Skript im Block', browser: true, von: '</script>\n{%- endif -%}', nach: '</script>\n<script>var lxq=1;</script>\n{%- endif -%}' },
  { id: 'W21', was: 'Skript mit Netzabruf (fetch)', browser: true, von: "if(window.__lxLiefer)return;", nach: "if(window.__lxLiefer)return;fetch('/x');" },
  // gleichwertig: Beweis steht daneben
  { id: 'G1', was: 'Bedingung «Zweig Schweizer Lager» in Schritt 1 entfällt', von: " and lager contains 'Schweizer Lager' -%}\n  {%- if closest.product.tags", nach: " -%}\n  {%- if closest.product.tags", gleichwertig: 'Tag fortura/ch-lager führt immer in den ersten Zweig (lager enthält dann immer «Schweizer Lager»)' },
  { id: 'G2', was: 'Bedingung lx_tmin > 0 entfällt', von: ' and lx_tmin > 0', nach: '', gleichwertig: 'im Zweig fortura/ch-lager ist lx_tmin immer 1 oder 9' },
  { id: 'G4', was: 'Skript: Absicherung der Eingabe «d&&d.data» entfällt (das try/catch im Zuhörer fängt es)', von: 'var d=e&&e.detail,h=d&&d.data&&d.data.html;', nach: 'var d=e.detail,h=d.data.html;', gleichwertig: 'jede Ausnahme im Zuhörer fängt das innere try/catch; sichtbar ändert sich nichts (Test «keine Seitenfehler»)' },
  { id: 'G5', was: 'Skript: Wächter «if(!h||!h.querySelector)return;» entfällt', von: 'if(!h||!h.querySelector)return;\n', nach: '', gleichwertig: 'ein Wert ohne querySelector wirft hier einen TypeError, den das innere try/catch fängt; sichtbar ändert sich nichts' },
  { id: 'G6', was: 'Skript: Wächter «if(!neu)return;» entfällt', von: '\nif(!neu)return;\n', nach: '\n', gleichwertig: 'neu.getAttribute wirft bei null einen TypeError, den das innere try/catch fängt; der DOM bleibt unberührt' },
  { id: 'G7', was: 'Skript: äusseres try/catch um die Registrierung entfällt', von: '(function(){try{\nif(window.__lxLiefer)', nach: '(function(){\nif(window.__lxLiefer)', zusatz: [['}catch(x){}\n})();', '})();']], gleichwertig: 'addEventListener und die Wächterzuweisung können in einem Browser nicht werfen' },
  { id: 'G3', was: 'Bedingung «and lx_v» in Schritt 1 entfällt', von: '{%- if lx_ok and lx_v and', nach: '{%- if lx_ok and', gleichwertig: 'ohne Variantenobjekt ist lx_ok das Produktfeld und lx_v.inventory_management bleibt leer, die Prüfung scheitert dort ohnehin' },
];
function wende(text, m) {
  let t = mutant(text, m.von, m.nach, m.anzahl ?? 1);
  if (m.reparatur) t = mutant(t, m.reparatur[0], m.reparatur[1]);
  for (const [von, nach] of m.zusatz || []) t = mutant(t, von, nach);
  if (t === text) throw new Error(m.id + ': Mutation ändert nichts');
  return t;
}

// ---------- Browsertest als Kindprozess (eigene Uhr, Playwright) ----------
const BROWSER_TEST = path.join(HIER, 'wechsel_browser_test.mjs');
function browserLauf(blockPfad, schnell) {
  const a = [BROWSER_TEST]; if (blockPfad) a.push('--block', blockPfad); if (schnell) a.push('--schnell');
  const r = spawnSync(process.execPath, a, { env: process.env, encoding: 'utf8', timeout: 180000, maxBuffer: 1 << 24 });
  const aus = (r.stdout || '') + (r.stderr || '');
  const erg = aus.match(/ERGEBNIS: (\d+) von (\d+) Prüfungen bestanden, (\d+) Fehler/);
  const fehler = aus.split('\n').find((l) => l.includes('FEHLER')) || '';
  return { status: r.status, aus, bestanden: erg ? +erg[1] : 0, gesamt: erg ? +erg[2] : 0, fehlerZahl: erg ? +erg[3] : -1, ersterFehler: fehler.replace(/^\s*FEHLER\s*/, '').slice(0, 110) };
}
const OHNE_BROWSER = !!process.env.OHNE_BROWSER;

// ---------- Hauptprogramm ----------
const t0 = performance.now();
const R = lauf(NEU, { ruby: true });
const bestanden = R.n - R.fehler.length;
console.log('lux_delivery.neu.liquid · LiquidJS ' + (() => { try { return createRequire(path.resolve(process.env.LIQUIDJS_DIR || SCRATCH + '/liquidjs') + '/')('liquidjs/package.json').version; } catch { return '?'; } })());
for (const [k, n] of Object.entries(R.teile)) console.log(`  ${k.padEnd(18)} ${String(n).padStart(6)} Prüfungen`);
console.log(`  Byte-Vergleich alt/neu: ${R.gleich} Fälle gleich nach Leerraum-Normierung, davon ${R.exakt} auch zeichengleich`);
if (R.rubyUebersprungen) console.log('  Ruby-Liquid: übersprungen (nicht verfügbar)'); else console.log(`  Ruby-Liquid ${R.rubyVersion}: strikter Parser, strikte Filter`);
console.log(`ERGEBNIS: ${bestanden} von ${R.n} Prüfungen bestanden, ${R.fehler.length} Fehler`);
for (const f of R.fehler.slice(0, 25)) console.log('  FEHLER ' + f);
let browserFehler = 0;
if (!OHNE_BROWSER) {
  const b = browserLauf(null, false);
  console.log('\nBROWSERTEST (wechsel_browser_test.mjs, Chromium): ' + b.aus.split('\n').filter((l) => /Prüfungen$|^ERGEBNIS|FEHLER/.test(l.trim())).map((l) => l.trim()).join(' | '));
  browserFehler = b.status === 0 && b.fehlerZahl === 0 ? 0 : 1;
  if (browserFehler) console.log(b.aus.slice(-1500));
}

let mutFehler = 0;
if (!process.env.NUR_TEST) {
  console.log('\nMUTATIONSPROBE (jeder Mutant läuft durch denselben Test; «erkannt» = mindestens eine Prüfung schlägt an)');
  let erkannt = 0; let gleichwertig = 0; const probleme = [];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lxmut-')); let nurBrowser = 0;
  for (const m of MUTANTEN) {
    const text = wende(NEU, m);
    let r;
    try { r = lauf(text, { schnell: true, ruby: true }); } catch (e) { if (!(e instanceof Erkannt)) throw e; r = { fehler: [e.message] }; }
    let wurdeErkannt = r.fehler.length > 0; const liquidErkannt = wurdeErkannt;
    if (!OHNE_BROWSER && (m.browser || !wurdeErkannt)) { // Skript-/Container-Mutanten immer, Überlebende zur Sicherheit auch
      const pfad = path.join(tmpDir, m.id + '.liquid'); fs.writeFileSync(pfad, text);
      const b = browserLauf(pfad, true);
      if (b.status === 1 && b.fehlerZahl > 0) { wurdeErkannt = true; r = { fehler: [(liquidErkannt ? r.fehler[0] + '   ‖ ' : '') + 'Browser: ' + b.ersterFehler] }; if (!liquidErkannt) nurBrowser++; }
      else if (b.status !== 0 && b.status !== 1) { probleme.push(`${m.id}: Browsertest brach mit Exit ${b.status} ab`); console.log(`  ${m.id} PROBLEM: Browsertest Exit ${b.status}: ${b.aus.slice(-300)}`); }
    }
    if (m.gleichwertig) {
      if (!wurdeErkannt) { gleichwertig++; console.log(`  ${m.id} GLEICHWERTIG (überlebt nach voller Matrix): ${m.was} — ${m.gleichwertig}`); }
      else { probleme.push(`${m.id} als gleichwertig behauptet, wurde aber erkannt: ${r.fehler[0]}`); console.log(`  ${m.id} ACHTUNG, doch erkannt: ${r.fehler[0]}`); }
    } else if (wurdeErkannt) { erkannt++; console.log(`  ${m.id} erkannt: ${m.was}   ← ${String(r.fehler[0]).slice(0, 90)}`); }
    else { probleme.push(`${m.id} ÜBERLEBT: ${m.was}`); console.log(`  ${m.id} ÜBERLEBT (Lücke im Test): ${m.was}`); }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  const echt = MUTANTEN.filter((m) => !m.gleichwertig).length;
  console.log(`MUTATIONSPROBE: ${erkannt} von ${echt} Mutanten erkannt (davon ${nurBrowser} nur durch den Browsertest), ${gleichwertig} gleichwertig und überlebt, ${probleme.length} Probleme`);
  mutFehler = probleme.length + (erkannt === echt ? 0 : 1);
  for (const p of probleme) console.log('  PROBLEM ' + p);
}
console.log(`Dauer ${((performance.now() - t0) / 1000).toFixed(1)} s`);
process.exitCode = R.fehler.length || mutFehler || browserFehler ? 1 : 0;
