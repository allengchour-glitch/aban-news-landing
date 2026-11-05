// Test für den Theme-Block «lux_delivery» (Verfügbarkeit + Lieferdatum + ehrliche Bestandsanzeige), Stand 05.11.2026.
// Prüft lux_delivery.neu.liquid mit LiquidJS gegen Attrappen der Shopify-Objekte, ohne Netz, ohne Shopify-Zugriff.
//   node dropship/lagerbestand-0511/delivery_test.mjs            (Test + Mutationsprobe)
//   NUR_TEST=1 node …                                            (ohne Mutationsprobe)
// LiquidJS: Umgebungsvariable LIQUIDJS_DIR = Ordner, in dem «npm install liquidjs» lief.
// Echtes Ruby-Liquid (optionale Gegenprobe): RUBY_LIQUID_GEMS = GEM_HOME mit «gem install liquid»; fehlt es, wird der Teil übersprungen.
// Die Uhr wird festgelegt (Date.now), alle Zeiten sind deshalb wiederholbar; Zeitzone fest UTC+1 (Winterzeit CH).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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
const GRUEN = { farbe: '#1e7a2e', punkt: '#2eaf46', schein: 'rgba(46,175,70,.18)' };
const ORANGE = { farbe: '#9a5b00', punkt: '#e8890c', schein: 'rgba(232,137,12,.18)' };
const ROT = { farbe: '#b3261e', punkt: '#d93025', schein: undefined };
function lies(html) {
  const m = norm(html).match(PILLE);
  if (!m) return null;
  return { farbe: m[1], punkt: m[2], schein: m[3], text: m[4].replace(/&middot;/g, '·') };
}
function zaehler(html) {
  const t = html.replace(/&middot;/g, '·');
  return { nurNoch: zaehle(t, 'Nur noch'), aufLager: zaehle(t, 'Auf Lager'), liefer: zaehle(t, 'Lieferung voraussichtlich'), box: zaehle(t, '🚚'), ausverkauft: zaehle(t, 'ausverkauft') };
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
function schalterAus(s) { return s !== undefined && s !== null && ['0', 'false'].includes(String(s).trim().toLowerCase()); }
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
      && !schalterAus(f.schalter) && stempelGueltig(f.stempel)) {
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
  pruefe('Kommentar nennt Datum 05.11.2026 und den Notschalter', blockText.includes('05.11.2026') && blockText.includes('luxe.bestand_anzeige = 0'));

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
    ['Notschalter «0»', ST({ schalter: '0' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter « 0 » mit Leerzeichen', ST({ schalter: ' 0 ' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter Zahl 0', ST({ schalter: 0 }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «false»', ST({ schalter: 'false' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «FALSE»', ST({ schalter: 'FALSE' }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter boolean false', ST({ schalter: false }), { text: GRUND, farbe: GRUEN, box: true }],
    ['Notschalter «1»', ST({ schalter: '1' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter Zahl 1', ST({ schalter: 1 }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter «true»', ST({ schalter: 'true' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
    ['Notschalter leer = an', ST({ schalter: '' }), { text: PL('Nur noch 2'), farbe: ORANGE, box: true }],
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
  const SCHALTER = { fehlt: undefined, null0: '0', eins: '1' };
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
      }

  // ===== D. Byte-Gleichheit mit dem ALTEN Block im Standardfall =====
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
      const a = engine.renderSync(tplAlt, ctx(f)); const n = rendere(f);
      const ok = norm(a) === norm(n);
      if (ok) gleich++; if (a === n) exakt++;
      pruefe(`gleich wie alt · ${zn} · ${tags.join('+')} · ${preis} · ${land} · stufe ${stufe} · V${nr % VARIANTEN.length}`, ok, ok ? '' : norm(n).slice(0, 200));
    }
  }
  R.gleich = gleich; R.exakt = exakt;
  JETZT = T();
  {
    // Produkt gar nicht verfügbar, ohne Variantenobjekt: neue Ausgabe ist der Anfang der alten (Pille gleich, Lieferbox fällt weg)
    const f = ST({ variante: null, produktOk: false, stempel: undefined });
    const a = engine.renderSync(tplAlt, ctx(f)); const n = rendere(f);
    pruefe('ausverkauft: neue Pille ist byte-gleich der alten Pille, danach keine Lieferbox mehr', a.startsWith(n) && n.endsWith('Momentan ausverkauft</div>') && a.length > n.length);
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
        for (const sw of [undefined, '0', '1', 'false', ' 0 ', ''])
          for (const mgmt of ['shopify', null]) for (const pol of ['deny', 'continue']) {
            if ((i++ % 41) !== 0) continue; // jeder einundvierzigste
            faelle.push({ tags, produktOk: pOk, variante: { ok: vOk, qty: q, mgmt, policy: pol }, stempel: st, schalter: sw });
          }
  // Alle Randstempel und Mengen mit dem Normalfall (fortura, kaufbar, shopify, deny), damit Ruby jeden einzeln sieht
  const STAEMPEL_ROH = [undefined, iso(3600), iso(97200), iso(-3600), 'kein Datum', 'Stand: unbekannt', '', '2026-11-05', iso(93600), iso(93601), iso(-300), iso(-301), '1970-01-01T00:00:00Z', uhrzeitJetzt(),
    `${jetztS() - 60}-a-b: x`, `${jetztS() - 60}: Müll`, 'a-b-c: d', '2026-13-45T25:61:00Z', '2026-11-05 07:30:00 UTC', iso(7200).replace('Z', '.000+00:00')];
  for (const st of STAEMPEL_ROH) faelle.push(ST({ stempel: st }));
  for (const q of ['3', undefined, null, -2, 0, 1, 5, 6]) faelle.push(ST({ variante: V({ qty: q }) }));
  faelle.push(ST({ variante: null }), ST({ variante: null, produktOk: false }), ST({ keinProdukt: true }), ST({ land: 'LI' }), ST({ stempel: 12345 }), ST({ stempel: true }), ST({ schalter: 0 }), ST({ schalter: false }));
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
    std.forEach((c, k) => pruefe(`Ruby: neuer Block = alter Block (Zeit ${new Date(ms).toISOString()}, Fall ${k})`, norm(a.ergebnisse[k]) === norm(n.ergebnisse[k]), norm(n.ergebnisse[k]).slice(0, 160)));
  }
  JETZT = T();
}

// ---------- Mutationsprobe ----------
const ZAHL = (s, t) => s.split(t).length - 1;
function mutant(text, von, nach, anzahl = 1) {
  if (ZAHL(text, von) !== anzahl) throw new Error(`Mutationsmuster ${JSON.stringify(von)} kommt ${ZAHL(text, von)}× vor, erwartet ${anzahl}×`);
  return text.split(von).join(nach);
}
const B_TAG = "{%- if closest.product.tags contains 'fortura' or closest.product.tags contains 'ch-lager' -%}";
const MUTANTEN = [
  { id: 'M01', was: '(b) inventory_management == shopify entfällt', von: "lx_v.inventory_management == 'shopify' and ", nach: '' },
  { id: 'M02', was: '(c) inventory_policy == deny entfällt', von: " and lx_v.inventory_policy == 'deny'", nach: '' },
  { id: 'M03', was: 'Stempel: keine Prüfung gegen die Zukunft', von: ' and lx_bs_vor <= 300', nach: '' },
  { id: 'M04', was: 'Stufe «wenige» reicht bis 6 statt 5', von: 'lx_bs_q <= 5', nach: 'lx_bs_q <= 6' },
  { id: 'M05', was: 'closest.product.available statt lx_v.available', von: '{%- if lx_v -%}{%- assign lx_ok = lx_v.available -%}', nach: '{%- if lx_v -%}{%- assign lx_ok = closest.product.available -%}' },
  { id: 'M06', was: 'Notschalter wird ignoriert', von: "{%- if lx_bs_sw == '0' or lx_bs_sw == 'false' -%}", nach: "{%- if lx_bs_sw == 'zzz' -%}" },
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
  { id: 'M21', was: 'Notschalter «false» wird nicht erkannt', von: " or lx_bs_sw == 'false'", nach: '' },
  { id: 'M22', was: 'Notschalter mit Leerzeichen wird nicht erkannt (strip entfällt)', von: ' | strip | downcase', nach: ' | downcase' },
  { id: 'M23', was: 'Alter wird gar nicht geprüft', von: 'lx_bs_alter <= 93600 and ', nach: '' },
  { id: 'M24', was: 'Formprüfung «Datum mit mindestens zwei Bindestrichen» entfällt', von: "{%- if lx_bs_txt contains ':' and lx_bs_teile >= 3 -%}", nach: "{%- if lx_bs_txt contains ':' -%}" },
  { id: 'M27', was: 'Wächter «date hat den Text wirklich umgerechnet» entfällt', von: '{%- if lx_bs_st != lx_bs_txt -%}', nach: '{%- if true -%}' },
  { id: 'M28', was: 'Zukunftsabstand falsch herum (Stempel minus jetzt statt jetzt minus Stempel)', von: '{%- assign lx_bs_vor = lx_bs_st | minus: now_s -%}', nach: '{%- assign lx_bs_vor = now_s | minus: lx_bs_st -%}' },
  { id: 'M29', was: 'Menge wird nicht in eine Zahl gewandelt (kein plus: 0)', von: 'lx_v.inventory_quantity | plus: 0', nach: 'lx_v.inventory_quantity' },
  { id: 'M25', was: 'Pille zeigt nie orange Punktfarbe', von: "{%- assign lx_c_punkt = '#e8890c' -%}", nach: "{%- assign lx_c_punkt = '#2eaf46' -%}", anzahl: 2 },
  { id: 'M26', was: 'Rot-Pille ohne closest.product-Wächter (Block rendert auch ohne Produkt)', von: '{%- if closest.product -%}\n{%- assign lx_v', nach: '{%- if true -%}\n{%- assign lx_v' },
  // gleichwertig: Beweis steht daneben
  { id: 'G1', was: 'Bedingung «Zweig Schweizer Lager» in Schritt 1 entfällt', von: " and lager contains 'Schweizer Lager' -%}\n  {%- if closest.product.tags", nach: " -%}\n  {%- if closest.product.tags", gleichwertig: 'Tag fortura/ch-lager führt immer in den ersten Zweig (lager enthält dann immer «Schweizer Lager»)' },
  { id: 'G2', was: 'Bedingung lx_tmin > 0 entfällt', von: ' and lx_tmin > 0', nach: '', gleichwertig: 'im Zweig fortura/ch-lager ist lx_tmin immer 1 oder 9' },
  { id: 'G3', was: 'Bedingung «and lx_v» in Schritt 1 entfällt', von: '{%- if lx_ok and lx_v and', nach: '{%- if lx_ok and', gleichwertig: 'ohne Variantenobjekt ist lx_ok das Produktfeld und lx_v.inventory_management bleibt leer, die Prüfung scheitert dort ohnehin' },
];
function wende(text, m) {
  let t = mutant(text, m.von, m.nach, m.anzahl ?? 1);
  if (m.reparatur) t = mutant(t, m.reparatur[0], m.reparatur[1]);
  if (t === text) throw new Error(m.id + ': Mutation ändert nichts');
  return t;
}

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

let mutFehler = 0;
if (!process.env.NUR_TEST) {
  console.log('\nMUTATIONSPROBE (jeder Mutant läuft durch denselben Test; «erkannt» = mindestens eine Prüfung schlägt an)');
  let erkannt = 0; let gleichwertig = 0; const probleme = [];
  for (const m of MUTANTEN) {
    const text = wende(NEU, m);
    let r;
    try { r = lauf(text, { schnell: true, ruby: true }); } catch (e) { if (!(e instanceof Erkannt)) throw e; r = { fehler: [e.message] }; }
    const wurdeErkannt = r.fehler.length > 0;
    if (m.gleichwertig) {
      if (!wurdeErkannt) { gleichwertig++; console.log(`  ${m.id} GLEICHWERTIG (überlebt nach voller Matrix): ${m.was} — ${m.gleichwertig}`); }
      else { probleme.push(`${m.id} als gleichwertig behauptet, wurde aber erkannt: ${r.fehler[0]}`); console.log(`  ${m.id} ACHTUNG, doch erkannt: ${r.fehler[0]}`); }
    } else if (wurdeErkannt) { erkannt++; console.log(`  ${m.id} erkannt: ${m.was}   ← ${String(r.fehler[0]).slice(0, 90)}`); }
    else { probleme.push(`${m.id} ÜBERLEBT: ${m.was}`); console.log(`  ${m.id} ÜBERLEBT (Lücke im Test): ${m.was}`); }
  }
  const echt = MUTANTEN.filter((m) => !m.gleichwertig).length;
  console.log(`MUTATIONSPROBE: ${erkannt} von ${echt} Mutanten erkannt, ${gleichwertig} gleichwertig und überlebt, ${probleme.length} Probleme`);
  mutFehler = probleme.length + (erkannt === echt ? 0 : 1);
  for (const p of probleme) console.log('  PROBLEM ' + p);
}
console.log(`Dauer ${((performance.now() - t0) / 1000).toFixed(1)} s`);
process.exitCode = R.fehler.length || mutFehler ? 1 : 0;
