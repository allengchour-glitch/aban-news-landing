// Mutationsprobe: ändert patch.mjs und ablauf.mjs absichtlich an vielen Stellen (je eine) und prüft, dass test.mjs ODER apply_test.mjs jedes Mal rot wird.
// Aufruf: node dropship/optik-1011/mutationsprobe.mjs <pfad/zu/liquidjs>   (Ausgabe: «Mutanten: N | erkannt: N | überlebt/nicht anwendbar: 0»)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const LQ = process.argv[2] || process.env.LIQUIDJS;
if (!LQ) { console.error('LiquidJS-Pfad fehlt'); process.exit(2); }
const P = 'patch.mjs', A = 'ablauf.mjs';
const M = [
  [P, "export const MARKE = 'lx-optik-1011';", "export const MARKE = 'lx-optik-1012';"],
  [P, "export const THEME_DATEI = 'layout/theme.liquid';", "export const THEME_DATEI = 'layout/password.liquid';"],
  [P, "const ANKER = '</head>';", "const ANKER = '<head>';"],
  [P, "const ANKER = '</head>';", "const ANKER = '</head';"],
  [P, "id: 'alle', bedingung: '',", "id: 'global', bedingung: '',"],
  [P, "id: 'start', bedingung: \"template.name == 'index'\"", "id: 'start', bedingung: \"template.name == 'collection'\""],
  [P, "id: 'produkt', bedingung: \"template.name == 'product'\"", "id: 'produkt', bedingung: \"template.name == 'cart'\""],
  [P, "template.name == 'page' and page.handle == 'ueber-uns'", "template.name == 'page' or page.handle == 'ueber-uns'"],
  [P, "template.name == 'page' and page.handle == 'rueckgabe'", "template.name == 'page' and page.handle == 'garantie'"],
  [P, "bedingung: \"template.name == '404'\"", "bedingung: \"template.name == 'page'\""],
  [P, "product-card .text-block[class*=\"product_title\"] p{text-wrap:balance}", "product-card .text-block[class*=\"product_title\"] p{text-wrap:balanced}"],
  [P, "product-card .text-block[class*=\"product_title\"] p{text-wrap:balance}", ".text-block p{text-wrap:balance}"],
  [P, ".lx-home .lx-category-thumb::after{content:\"\";position:absolute;inset:0;", ".lx-home *::after{content:\"\";position:absolute;inset:0;"],
  [P, "rgba(80,60,40,.16);pointer-events:none}", "rgba(80,60,40,.16)}"],
  [P, "@media(max-width:749px){.facets-toggle__button{min-height:44px}", "@media(max-width:750px){.facets-toggle__button{min-height:44px}"],
  [P, ".lx-tabs .lx-tabs__zeile a{display:inline-flex", ".lx-tabs a{display:inline-flex"],
  [P, ".lx-uf a{display:inline-flex;align-items:center;box-sizing:border-box;min-height:44px}", ".lx-uf a{display:inline-flex;align-items:center;box-sizing:border-box;min-height:34px}"],
  [P, ".lx-chipflex a{display:flex;align-items:center;box-sizing:border-box;min-height:44px}", ".lx-chipflex a{display:flex;align-items:center;box-sizing:border-box;min-height:40px}"],
  [P, "@media(min-width:750px){.column-options{gap:8px}", "@media(min-width:749px){.column-options{gap:8px}"],
  [P, "width:36px;height:36px;padding:0}", "width:3px;height:36px;padding:0}"],
  [P, "font-size:1.375rem;font-weight:600;line-height:1.3}", "font-size:13.75rem;font-weight:600;line-height:1.3}"],
  [P, ":not(.media-gallery--large-first-image):not(.quick-add-modal__content *)", ""],
  [P, "li:last-child:nth-child(odd):not(:first-child){", "li:last-child:nth-child(odd){"],
  [P, "width:calc((100% - var(--image-gap,4px))/2)}", "width:calc(100% - 4px)}"],
  [P, "media-gallery .media-fit-contain :is(img,.deferred-media__poster-image){background-color:transparent}", "media-gallery .media-fit-contain :is(img,.deferred-media__poster-image){background-color:#fff}"],
  [P, "[id$=\"__lux_cart_trust\"] ul{justify-content:center;text-align:center}", "[id$=\"__lux_cart_trust\"] ul{justify-content:center}"],
  [P, "@media (max-width:749px){.cart-page--empty .cart-page__title,.cart-page--empty .cart-page__more-blocks{margin-top:40px}}", "@media (max-width:749px){.cart-page--empty .cart-page__title{margin-top:40px}}"],
  [P, "rte-formatter div[style*=\"background:#2c2c2c\"]{padding:22px 18px!important}", "rte-formatter div[style*=\"background:#2c2c2c\"]{padding:22px 18px}"],
  [P, "@media(max-width:600px){.lxs table td:first-child{width:46%}", "@media(max-width:600px){.lxs table td:first-child{width:4%}"],
  [P, "div:has(> form.lux404-suche){width:100%}", "div:has(> form.lux404-suche){width:10%}"],
  [P, "form.lux404-suche input[type=search]{text-overflow:ellipsis}", "form.lux404-suche input[type=search]{text-overflow:clip}"],
  [P, "/* ${g.kommentar} */", "/* ${g.kommentar} */ */"],
  [P, "`<style id=\"${MARKE}-${g.id}\">\\n", "`<style id=\"${MARKE}-${g.id}\">\\n</style>"],
  [P, "return g.bedingung ? `{%- if ${g.bedingung} -%}\\n${kopf}{%- endif -%}\\n` : kopf;", "return g.bedingung ? `{%- if ${g.bedingung} -%}\\n${kopf}` : kopf;"],
  [P, "  if (theme.includes(`id=\"${MARKE}`)) throw new Error('schon eingespielt');", "  if (theme.includes(`id=\"${MARKE}\"`)) throw new Error('schon eingespielt');"],
  [P, "  if (n !== 1) throw new Error(`Anker ${ANKER} kommt ${n}-mal vor, erwartet 1`);", "  if (n < 1) throw new Error(`Anker ${ANKER} kommt ${n}-mal vor, erwartet 1`);"],
  [P, "  return theme.split(ANKER).join(BLOCK + ANKER);", "  return theme.split(ANKER).join(ANKER + BLOCK);"],
  [P, "  if (n !== 1) throw new Error(`Block kommt ${n}-mal vor, erwartet 1: nichts zurückgenommen`);", "  if (n < 1) throw new Error(`Block kommt ${n}-mal vor, erwartet 1: nichts zurückgenommen`);"],
  [A, "      const ok = await zurueckLesenBis((j) => j != null && !hatBlock(j));\n      if (!ok) { log('RÜCKWEG: der Block steht nach", "      const ok = true;\n      if (!ok) { log('RÜCKWEG: der Block steht nach"],
  [A, "      const ohne = zuruecknehmen(aktuell);\n      await mitWiederholung(", "      const ohne = d.sicherungLesen();\n      await mitWiederholung("],
  [A, "      if (!hatBlock(aktuell)) { log('Rückweg: der Block steht nicht (mehr) in der Datei, nichts zurückzuschreiben'); return codeWennOk; }", ""],
  [A, "    return rueckweg(e && e.code === 5 ? 5 : 10);", "    return 5;"],
  [A, "    const ok = await zurueckLesenBis((j) => j === neu);\n    if (!ok) { log('Rücklesen weicht ab: Rückweg'); return rueckweg(6); }", "    const ok = await zurueckLesenBis((j) => j === neu);\n    if (!ok) { log('Rücklesen weicht ab: Rückweg'); return 6; }"],
  [A, "    return rueckweg(sf === 'unmessbar' ? 9 : 7);", "    return sf === 'unmessbar' ? 9 : 7;"],
  [A, "    return rueckweg(sf === 'unmessbar' ? 9 : 7);", "    return rueckweg(7);"],
  [A, "    return rueckweg(10);", "    return 10;"],
  [A, "  if (nochmal !== jetzt) { log('theme.liquid hat sich seit dem ersten Lesen geändert: nichts geschrieben'); return 4; }", ""],
  [A, "  try { sicherungSchreiben(jetzt); }", "  try { }"],
  [A, "  try { neu = anwenden(jetzt); } catch (e) { log(String(e.message)); return String(e.message).startsWith('schon') ? 3 : 4; }", "  try { neu = anwenden(jetzt); } catch (e) { log(String(e.message)); return 4; }"],
  [A, "  if (!opt.live) { log('Trockenlauf, nichts geschrieben'); return 0; }\n\n  try { sicherungSchreiben", "  try { sicherungSchreiben"],
  [A, "    try { ohne = zuruecknehmen(jetzt); } catch (e) { log(String(e.message)); return 4; }", "    ohne = jetzt.split(d.MARKE).join('');"],
  [A, "    if (!opt.live) { log('Trockenlauf, nichts geschrieben'); return 0; }\n    try {", "    try {"],
  [A, "    const sf = await storefront(false);\n    return sf === 'ok' ? 0 : sf === 'unmessbar' ? 9 : 7;", "    return 0;"],
  [A, "      if (unmessbar(p)) { log('  Storefront: HTTP', p.status, '(nicht messbar), warte'); await warte(ZEIT.PAUSE_DROSSELUNG); continue; }", "      if (unmessbar(p)) { log('  Storefront: HTTP', p.status, '(nicht messbar), warte'); await warte(ZEIT.PAUSE_DROSSELUNG); }"],
  [A, "const unmessbar = (r) => r.status === 429 || r.status === 403 || r.status === -1 || r.status >= 500;", "const unmessbar = (r) => r.status === 429 || r.status === -1;"],
  [A, "const unmessbar = (r) => r.status === 429 || r.status === 403 || r.status === -1 || r.status >= 500;", "const unmessbar = (r) => r.status === 429 || r.status === 403 || r.status >= 500;"],
  [A, "      if (p.status !== 200 || h.status !== 200 || liquidFehler) return 'fehler';", "      if (p.status !== 200 || h.status !== 200) return 'fehler';"],
  [A, "      if (p.status !== 200 || h.status !== 200 || liquidFehler) return 'fehler';", "      if (liquidFehler) return 'fehler';"],
  [A, "      const sollMit = m(p.text, 'alle') && m(p.text, 'produkt') && !m(p.text, 'start') && m(h.text, 'alle') && m(h.text, 'start') && !m(h.text, 'produkt');", "      const sollMit = m(p.text, 'alle') && m(h.text, 'alle');"],
  [A, "      const sollOhne = !hatBlock(p.text) && !hatBlock(h.text);", "      const sollOhne = true;"],
  [A, "    return nurUnmessbar ? 'unmessbar' : 'fehler';", "    return 'fehler';"],
  [A, "      nurUnmessbar = false;\n", ""],
  [A, "export const ZEIT = { RUECKLESEN_VERSUCHE: 10,", "export const ZEIT = { RUECKLESEN_VERSUCHE: 0,"],
  [A, "STOREFRONT_RUNDEN: 8,", "STOREFRONT_RUNDEN: 0,"],
  [A, "      await mitWiederholung(() => schreiben(ohne), 'Rückweg schreiben');\n      const ok", "      await mitWiederholung(() => schreiben(aktuell), 'Rückweg schreiben');\n      const ok"],
  [A, "RUECKWEG_VERSUCHE: 3,", "RUECKWEG_VERSUCHE: 1,"],
  [A, "ABWESEND_LESUNGEN: 2 };", "ABWESEND_LESUNGEN: 0 };"],
  [A, "      try { j = await lesen(); } catch (e) { log('  Rücklesen: Lesefehler', String(e && e.message || e), '(Versuch', i + 1, ')'); continue; }", "      j = await lesen();"],
  [A, "  try { sicherungSchreiben(jetzt); } catch (e) { log('Sicherung nicht schreibbar, nichts geschrieben:', String(e && e.message || e)); return 4; }", "  sicherungSchreiben(jetzt);"],
  [A, "  if (opt.erwartetThemeId && opt.themeId !== opt.erwartetThemeId) {", "  if (false) {"],
  [A, "      await mitWiederholung(() => schreiben(ohne), 'Rückweg schreiben');", "      await schreiben(ohne);"],
  [A, "      let aktuell = await mitWiederholung(lesen, 'Rückweg lesen');", "      let aktuell = await lesen();"],
  [P, ".lx-tabs summary{min-height:44px;box-sizing:border-box}}", "}"],
];

const W = fs.mkdtempSync(path.join(os.tmpdir(), 'optik1011mut-'));
const alleDateien = fs.readdirSync(hier).filter((f) => f.endsWith('.mjs') && f !== 'mutationsprobe.mjs');
const original = Object.fromEntries(alleDateien.map((f) => [f, fs.readFileSync(path.join(hier, f), 'utf8')]));
const laufe = (dir) => {
  const t = spawnSync('/opt/node22/bin/node', [path.join(dir, 'test.mjs'), LQ], { encoding: 'utf8', timeout: 120000 });
  const a = spawnSync('/opt/node22/bin/node', [path.join(dir, 'apply_test.mjs')], { encoding: 'utf8', timeout: 120000 });
  return { t: t.status, a: a.status };
};
const basis = laufe(hier);
if (basis.t !== 0 || basis.a !== 0) { console.error('Ausgangslage nicht grün:', basis); process.exit(2); }
let erkannt = 0; const offen = [];
M.forEach(([datei, von, nach], i) => {
  const n = original[datei].split(von).length - 1;
  if (n !== 1) { console.log(`M${String(i + 1).padStart(2, '0')} NICHT ANWENDBAR (${n} Treffer): ${von.slice(0, 60).replace(/\n/g, '⏎')}`); offen.push(i + 1); return; }
  const dir = path.join(W, 'm' + (i + 1)); fs.mkdirSync(dir);
  for (const f of alleDateien) fs.writeFileSync(path.join(dir, f), f === datei ? original[f].replace(von, () => nach) : original[f]);
  const r = laufe(dir);
  if (r.t !== 0 || r.a !== 0) erkannt++;
  else { console.log(`M${String(i + 1).padStart(2, '0')} ÜBERLEBT: ${datei}: ${von.slice(0, 70).replace(/\n/g, '⏎')} -> ${nach.slice(0, 50).replace(/\n/g, '⏎')}`); offen.push(i + 1); }
});
fs.rmSync(W, { recursive: true, force: true });
console.log(`Mutanten: ${M.length} | erkannt: ${erkannt} | überlebt/nicht anwendbar: ${offen.length}`);
process.exit(offen.length ? 1 : 0);
