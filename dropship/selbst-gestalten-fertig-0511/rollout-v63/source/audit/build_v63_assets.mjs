#!/usr/bin/env node
/** Rein lokaler, fail-closed Bau der v6.3-Karten/Vorschauen. Keine Netz- oder Kontoschreibzugriffe. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i], v = argv[i + 1];
    if (!/^--(manifest|katalog|spiegel|repo|out)$/.test(k ?? '') || !v) throw new Error('Aufruf: --manifest … --katalog … --spiegel … --repo … --out …');
    out[k.slice(2)] = v;
  }
  for (const k of ['manifest','katalog','spiegel','repo','out']) if (!out[k]) throw new Error(`--${k} fehlt`);
  return out;
}
const a = args(process.argv.slice(2));
const manifest = JSON.parse(readFileSync(a.manifest, 'utf8'));
const spiegel = JSON.parse(readFileSync(a.spiegel, 'utf8'));
const karteMod = await import(pathToFileURL(join(a.repo, 'pod/v6/werkzeug/karte_fuer_editor.mjs')).href);
const previewMod = await import(pathToFileURL(join(a.repo, 'pod/v6/werkzeug/vorschau_daten_bauen.mjs')).href);
const stand = '2026-11-08';
if (manifest.shop !== 'luxestyle.ch' || manifest.schemaVersion !== 2 || !Array.isArray(manifest.products)) throw new Error('Manifest gehört nicht eindeutig zu luxestyle.ch/schemaVersion 2');
rmSync(a.out, { recursive: true, force: true }); mkdirSync(a.out, { recursive: true });
const readCatalog = (id) => {
  const p = join(a.katalog, `${id}.json`); if (!existsSync(p)) throw new Error(`Katalogdatei ${id}.json fehlt`);
  const x = JSON.parse(readFileSync(p, 'utf8'));
  if (Number(x.id) !== Number(id) || Number(x.schema) !== 2) throw new Error(`Katalogdatei ${id}.json hat falsche Identität/Schema`);
  return x;
};
const numericId = (gid) => String(gid ?? '').match(/^gid:\/\/shopify\/Product\/(\d+)$/)?.[1] ?? null;
const variantNumericId = (gid) => String(gid ?? '').match(/^gid:\/\/shopify\/ProductVariant\/(\d+)$/)?.[1] ?? null;
const report = { stand, shop: manifest.shop, sourceGeneratedAt: manifest.generatedAt ?? null, ready: [], blocked: [], totals: {} };
const theme = { schema: 1, stand, shop: manifest.shop, products: {} };
for (const p of manifest.products) {
  if (p.shopifyStatus !== 'ACTIVE') continue;
  const pid = numericId(p.shopifyProductId), fail = [];
  if (!pid) fail.push('ungueltige_shopify_product_gid');
  if (p.blockers?.length) fail.push(...p.blockers.map((x) => `manifest:${x}`));
  if (!Array.isArray(p.variants) || p.variants.length === 0) fail.push('keine_printful_varianten');
  const mapping = {}, models = new Set();
  for (const v of p.variants ?? []) {
    const sv = variantNumericId(v.shopifyVariantId), m = Number(v.printfulProductId), pv = Number(v.printfulVariantId);
    if (!sv || !Number.isInteger(m) || m <= 0 || !Number.isInteger(pv) || pv <= 0) { fail.push('ungueltige_varianten_zuordnung'); continue; }
    if (mapping[sv] && mapping[sv] !== pv) fail.push(`shopify_variante_doppelt:${sv}`);
    mapping[sv] = pv; models.add(m);
    const eligible = v.eligiblePlacements ?? [];
    if (eligible.length !== 1 || eligible[0] !== 'default') fail.push(`eligible_placements_nicht_nur_default:${sv}`);
  }
  let card = null, preview = null;
  if (!fail.length) {
    try {
      const catalogs = [...models].sort((x,y)=>x-y).map(readCatalog);
      const opt = { ohneAufpreis: true, ohneEtiketten: true, panelErlauben: false };
      card = catalogs.length === 1 ? karteMod.karteFuerEditor(catalogs[0], { ...opt, shopVarianten: mapping }) : karteMod.kartenbuendelFuerEditor(catalogs, mapping, opt);
      const cards = card.modelle ? Object.values(card.modelle) : [card];
      for (const c of cards) {
        if (c.klasse === 'PANEL') fail.push(`panel:${c.printfulProductId}`);
        if (c.klasse === 'UNGEEIGNET') fail.push(`ungeeignet:${c.printfulProductId}`);
        if (!c.platzierungen?.length) fail.push(`keine_zulaessige_druckflaeche:${c.printfulProductId}`);
        for (const pl of c.platzierungen ?? []) if (pl.dateiTyp !== 'default') fail.push(`druckflaeche_nicht_default:${c.printfulProductId}:${pl.id}:${pl.dateiTyp}`);
      }
      for (const w of karteMod.kartenWarnungen(card)) fail.push(`kartenwarnung:${w}`);
      const previews = catalogs.map((c) => previewMod.vorschauModell(c, spiegel));
      for (const q of previews) {
        if (q.bericht.adapter === 'keine') fail.push(`keine_ehrliche_produktvorschau:${q.pid}:${q.bericht.grund}`);
        if (q.eintrag.farbfest?.length) {
          const c = cards.find((z) => String(z.printfulProductId) === String(q.pid)); const used = new Set((c?.platzierungen ?? []).map((z) => z.id));
          for (const pl of q.eintrag.farbfest) if (used.has(pl)) fail.push(`farbfeste_vorlage:${q.pid}:${pl}`);
        }
        for (const [source, mirrored] of Object.entries(q.eintrag.bilder ?? {})) if (!mirrored || !/^https:\/\/cdn\.shopify\.com\//.test(mirrored)) fail.push(`vorschau_nicht_gespiegelt:${q.pid}:${source}`);
        for (const [pv, mug] of Object.entries(q.eintrag.tasse ?? {})) if (!mug?.foto || !/^https:\/\/cdn\.shopify\.com\//.test(mug.foto)) fail.push(`tassenfoto_nicht_gespiegelt:${q.pid}:${pv}`);
      }
      preview = previewMod.vorschauDatei(previews, stand);
      const expected = Object.keys(mapping).sort(), actual = Object.keys(card.shop?.varianten ?? {}).sort();
      if (JSON.stringify(expected) !== JSON.stringify(actual)) fail.push('kartenmapping_unvollstaendig');
    } catch (e) { fail.push(`baufehler:${e.message}`); }
  }
  const base = pid ? `lspod-${pid}` : `lspod-unbekannt-${report.blocked.length}`;
  const entry = { productId: p.shopifyProductId, handle: p.shopifyHandle, variants: p.variants?.length ?? 0, models: [...models].sort((x,y)=>x-y) };
  if (fail.length) {
    entry.reasons = [...new Set(fail)].sort(); report.blocked.push(entry);
    theme.products[p.shopifyHandle] = { status: 'blocked', productId: p.shopifyProductId, reasons: entry.reasons }; continue;
  }
  const cardName = `${base}.karte.json`, previewName = `${base}.vorschau.json`, mapName = `${base}.shop-varianten.json`;
  writeFileSync(join(a.out, cardName), JSON.stringify(card) + '\n'); writeFileSync(join(a.out, previewName), JSON.stringify(preview) + '\n'); writeFileSync(join(a.out, mapName), JSON.stringify(mapping, null, 1) + '\n');
  entry.assets = { card: cardName, preview: previewName, mapping: mapName }; report.ready.push(entry);
  theme.products[p.shopifyHandle] = { status: 'ready', productId: p.shopifyProductId, ...entry.assets };
}
report.totals = { active: report.ready.length + report.blocked.length, ready: report.ready.length, blocked: report.blocked.length, variantsReady: report.ready.reduce((n,x)=>n+x.variants,0), variantsBlocked: report.blocked.reduce((n,x)=>n+x.variants,0) };
writeFileSync(join(a.out, 'theme-manifest.json'), JSON.stringify(theme, null, 1) + '\n'); writeFileSync(join(a.out, 'rollout-report.json'), JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify(report.totals)); for (const x of report.blocked) console.log(`BLOCK ${x.handle}: ${x.reasons.join(' | ')}`); if (!report.ready.length) process.exitCode = 3;
