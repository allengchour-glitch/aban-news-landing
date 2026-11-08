import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { importModus } from './import_live_guard.mjs';
import { PRODUKT_RICHTLINIEN_HTML, produktSeoBeschreibung } from './produkt_richtlinien_text.mjs';

let n = 0;
const ok = (wert, meldung) => { assert.ok(wert, meldung); n++; };
const hier = dirname(fileURLToPath(import.meta.url));
const claimQuellen = [
  join(hier, '..', 'cj_category_fill.mjs'),
  join(hier, '..', 'cj_trending_import.mjs'),
  join(hier, 'seo_titel.mjs'),
];
const importQuellen = [
  join(hier, '..', 'cj_category_fill.mjs'),
  join(hier, '..', 'cj_trending_import.mjs'),
  join(hier, '..', 'cj_perpetual.mjs'),
];
const verboteneMuster = [
  /Lieferung\s+(?:ca\.?\s*)?\d/i,
  /\d+\s*(?:Tage|Werktage)\s+(?:Rückgabe|Rueckgabe)/i,
  /Gepr(?:ü|ue)fte?\s+(?:Qualit(?:ä|ae)t|Angaben)/i,
  /(?:Gratis|Kostenlos\w*)[-\s]?Versand/i,
  /(?:Rabatt|Gutschein|\bCode\s+[A-Z0-9])/i,
];
const hatPauschalclaim = text => verboteneMuster.some(muster => muster.test(text));

ok(PRODUKT_RICHTLINIEN_HTML.includes('/policies/shipping-policy'), 'Versandrichtlinie verlinkt');
ok(PRODUKT_RICHTLINIEN_HTML.includes('/policies/refund-policy'), 'Rueckgaberichtlinie verlinkt');
ok(PRODUKT_RICHTLINIEN_HTML.includes('Preis und Verfügbarkeit'), 'Auswahlabhaengigkeit genannt');
ok(!hatPauschalclaim(PRODUKT_RICHTLINIEN_HTML), 'HTML ohne alte Pauschalclaims');
ok(!/\p{Extended_Pictographic}/u.test(PRODUKT_RICHTLINIEN_HTML), 'HTML ohne Emoji');

const seo = produktSeoBeschreibung('Testprodukt');
ok(seo.includes('Preis und verfügbare Ausführungen'), 'SEO-Text bleibt sachlich');
ok(!hatPauschalclaim(seo), 'SEO-Text ohne alte Pauschalclaims');
ok(produktSeoBeschreibung('') === '', 'Leerer Titel bleibt leer');
ok(produktSeoBeschreibung('A'.repeat(400)).length === 320, 'SEO-Text auf 320 Zeichen begrenzt');

for (const alt of [
  'Lieferung ca. 7 Tage',
  '14 Werktage Rückgabe',
  'Geprüfte Angaben',
  'Kostenloser Versand',
  'Rabatt mit Code TEST20',
]) ok(hatPauschalclaim(alt), `Guard erkennt: ${alt}`);

for (const datei of claimQuellen) {
  const src = readFileSync(datei, 'utf8');
  const importPfad = datei.endsWith('/seo_titel.mjs') ? "from './produkt_richtlinien_text.mjs'" : "from './lib/produkt_richtlinien_text.mjs'";
  ok(src.includes(importPfad), `${datei} nutzt den zentralen Text`);
  ok(!hatPauschalclaim(src), `${datei} enthaelt keinen alten Pauschalclaim`);
}

ok(importModus({}).schreiben === false, 'ohne LIVE keine Publikation');
ok(importModus({ LIVE: '0' }).schreiben === false, 'LIVE=0 bleibt gesperrt');
ok(importModus({ LIVE: 'true' }).schreiben === false, 'nur exaktes LIVE=1 gilt');
ok(importModus({ LIVE: '1' }).schreiben === true, 'LIVE=1 kann den Import freigeben');
ok(importModus({ LIVE: '1', DRY: '1' }).schreiben === false, 'DRY=1 sperrt trotz LIVE=1');

for (const datei of importQuellen) {
  const src = readFileSync(datei, 'utf8');
  ok(src.includes("from './lib/import_live_guard.mjs'"), `${datei} nutzt den LIVE-Guard`);
  ok(!/process\.env\.(?:LIVE|DRY)\s*=/.test(src), `${datei} ueberschreibt LIVE/DRY nicht`);
  if (!datei.endsWith('/cj_perpetual.mjs')) {
    ok(src.includes('const DRY=MODUS.trockenlauf'), `${datei} uebernimmt DRY als Schreibsperre`);
    ok(src.includes('const st=DRY?null:await shTok()'), `${datei} holt im DRY-Modus keinen Shopify-Token`);
    ok(src.indexOf('if(DRY)') < src.indexOf('await sgql(st,SET'), `${datei} beendet DRY-Kandidaten vor dem ersten Shopify-Write`);
    ok(src.includes("status:'DRAFT'"), `${datei} legt neue Produkte nur als DRAFT an`);
    ok(!src.includes("status:'ACTIVE'"), `${datei} aktiviert neue Produkte nicht`);
    ok(!/publishablePublish|publicationId|gid:\/\/shopify\/Publication\//.test(src), `${datei} enthaelt keinen pauschalen Publikationspfad`);
  } else {
    ok(src.includes('if (!MODUS.schreiben)'), 'cj_perpetual startet nur im expliziten Schreibmodus');
  }
  const env = {
    ...process.env,
    CJ_TOKEN: 'fixture-kein-echter-token',
    GEMINI_API_KEY: 'fixture-kein-echter-key',
    SHOPIFY_CLIENT_ID: 'fixture',
    SHOPIFY_CLIENT_SECRET: 'fixture',
    ONCE: '1',
  };
  delete env.LIVE;
  delete env.DRY;
  const code = `globalThis.fetch=()=>{throw new Error('NETZWERK_WURDE_ERREICHT')};await import(${JSON.stringify(pathToFileURL(datei).href)});`;
  const lauf = spawnSync(process.execPath, ['--input-type=module', '--eval', code], { env, encoding: 'utf8', timeout: 5000 });
  ok(lauf.status === 0, `${datei} endet ohne LIVE sauber: ${lauf.stderr}`);
  ok(lauf.stdout.includes('GESPERRT:'), `${datei} meldet die Sperre`);
  ok(!`${lauf.stdout}\n${lauf.stderr}`.includes('NETZWERK_WURDE_ERREICHT'), `${datei} bleibt vor jedem Netzaufruf`);
}

{
  const datei = join(hier, '..', 'cj_perpetual.mjs');
  const env = { ...process.env, LIVE: '1', DRY: '1', CJ_TOKEN: 'fixture-kein-echter-token', ONCE: '1' };
  const code = `globalThis.fetch=()=>{throw new Error('NETZWERK_WURDE_ERREICHT')};await import(${JSON.stringify(pathToFileURL(datei).href)});`;
  const lauf = spawnSync(process.execPath, ['--input-type=module', '--eval', code], { env, encoding: 'utf8', timeout: 5000 });
  ok(lauf.status === 0, `cj_perpetual endet mit LIVE=1/DRY=1 sauber: ${lauf.stderr}`);
  ok(lauf.stdout.includes('DRY=1 sperrt'), 'cj_perpetual meldet die zusaetzliche DRY-Sperre');
  ok(!`${lauf.stdout}\n${lauf.stderr}`.includes('NETZWERK_WURDE_ERREICHT'), 'cj_perpetual bleibt mit DRY=1 vor dem Netzaufruf');
}

console.log(`${n} ok, 0 Fehler`);
