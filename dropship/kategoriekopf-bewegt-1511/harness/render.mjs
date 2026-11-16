// Rendert snippets/lx-kopf-bewegt.liquid lokal (LiquidJS) fuer eine Kategorie.
// Produkte, Ausfuehrungen und Sammlungs-Mitgliedschaften wie GEMESSEN am 16.11. (live/clips_pruefen.json, Admin-API).
// Aufruf: node harness/render.mjs <handle> <aus-praefix> [ausverkauft]
// Optionen von rendern(): ausverkauft, fehlt (Handle), varianteAus (hinterlegte Ausfuehrung nicht kaufbar),
//   nichtMitglied (Produkt nicht in der aktuellen Sammlung), jetzt (Date fuer 'now').
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path';
const require = createRequire('/tmp/ci_sim_lb_tmp/lq/');
const { Liquid } = require('liquidjs');
const HIER = path.dirname(new URL(import.meta.url).pathname); const THEME = process.env.THEME_DIR || path.join(HIER, '..', 'theme');
const MESS = JSON.parse(fs.readFileSync(path.join(HIER, '..', 'live', 'clips_pruefen.json'), 'utf8')).out;
const VAR = { s01: 67679802950023, s03: 67672760975751, s05: 67843689152903, s06: 67726147944839, s09: 67675894710663 };
export async function rendern(handle, opt = {}) {
  const eng = new Liquid({ root: [path.join(THEME, 'snippets')], extname: '.liquid', strictFilters: true, jsTruthy: false });
  const verfuegbar = !opt.ausverkauft;
  const all_products = {};
  for (const [id, m] of Object.entries(MESS)) {
    if (opt.fehlt === m.handle) continue;
    const vid = VAR[id] || 1;
    const variants = [{ id: vid, available: verfuegbar && !opt.varianteAus }, { id: vid + 1, available: verfuegbar }];
    let colls = m.sammlungen.slice(); if (opt.nichtMitglied) colls = colls.filter((c) => c !== handle);
    all_products[m.handle] = { handle: m.handle, available: verfuegbar, variants, collections: colls.map((h) => ({ handle: h })) };
  }
  const ctx = { collection: { handle }, all_products };
  const echt = Date.now; if (opt.jetzt) Date.now = () => opt.jetzt.getTime();
  try {
    const kopf = await eng.renderFile('lx-kopf-bewegt', { ...ctx, teil: 'kopf' });
    const fuss = await eng.renderFile('lx-kopf-bewegt', { ...ctx, teil: 'fuss' });
    return { vor: kopf, nach: fuss };
  } finally { Date.now = echt; }
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [h, aus, f] = process.argv.slice(2);
  const r = await rendern(h, { ausverkauft: f === 'ausverkauft' });
  fs.writeFileSync(aus + '.json', JSON.stringify(r));
  console.log(h, 'kopf', Buffer.byteLength(r.vor), 'B, fuss', Buffer.byteLength(r.nach), 'B, clip:', (r.nach.match(/data-lx-kb="(s\d\d)"/) || [, '-'])[1]);
}
