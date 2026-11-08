#!/usr/bin/env node
/** Lokaler, deterministischer v6.3-Rollout-Bau. Keine Netz- oder Kontoschreibzugriffe. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { karteFuerEditor, kartenbuendelFuerEditor } from '../../../pod/v6/werkzeug/karte_fuer_editor.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HIER, '../../../');
const ALLOWLIST = resolve(HIER, 'allowlist.json');
const KATALOG = resolve(REPO, 'dropship/selbst-gestalten-fertig-0511/target-katalog-20261108/katalog');
const MAPS = resolve(REPO, 'pod/v6/maps');
const EDITOR = resolve(REPO, 'pod/v6/lspod-designer-v6-6.3.0.js');
const AUDIT_ASSETS = resolve(HIER, 'source/audit/assets');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function positive(value) { return Number.isFinite(Number(value)) && Number(value) > 0; }
function vorlageOk(v) {
  return v && positive(v.vorlageBreite) && positive(v.vorlageHoehe) && positive(v.flaecheBreite) && positive(v.flaecheHoehe)
    && Number(v.flaecheLinks) >= 0 && Number(v.flaecheOben) >= 0
    && Number(v.flaecheLinks) + Number(v.flaecheBreite) <= Number(v.vorlageBreite)
    && Number(v.flaecheOben) + Number(v.flaecheHoehe) <= Number(v.vorlageHoehe);
}

/** Modell 84 ist trotz der generischen Klassifizierung ein CUT-SEW-Rundumprodukt. */
export function panel84Pruefen(card, katalog, product) {
  if (Number(card.printfulProductId) !== 84 || card.typ !== 'CUT-SEW') throw new Error('PANEL84_IDENTITY_MISMATCH');
  if (card.platzierungen.length !== 1 || card.platzierungen[0].id !== 'default') throw new Error('PANEL84_PLACEMENT_MISMATCH');
  const placement = card.platzierungen[0];
  if (!positive(placement.printfile?.breitePx) || !positive(placement.printfile?.hoehePx) || !positive(placement.printfile?.dpi) || !vorlageOk(placement.vorlage)) {
    throw new Error('PANEL84_GEOMETRY_INVALID');
  }
  const printfileId = Number(placement.printfile.printfileId);
  const groups = katalog.printfiles?.variant_printfiles_gruppen || [];
  const templateMap = new Map((katalog.templates?.variant_mapping || []).map((entry) => [Number(entry.variant_id), entry.templates || []]));
  for (const variant of product.variants) {
    const pv = Number(variant.printfulVariantId);
    const group = groups.find((entry) => (entry.varianten || []).map(Number).includes(pv));
    if (Number(group?.placements?.default) !== printfileId || !(templateMap.get(pv) || []).some((entry) => entry.placement === 'default')) {
      throw new Error('PANEL84_VARIANT_GEOMETRY_MISSING');
    }
  }
  return true;
}

function trimModelCard(card, allowed) {
  const out = JSON.parse(JSON.stringify(card));
  if (out.farben && typeof out.farben === 'object') {
    out.farben = Object.fromEntries(Object.entries(out.farben).flatMap(([hex, ids]) => {
      const kept = (ids || []).filter((id) => allowed.has(Number(id)));
      return kept.length ? [[hex, kept]] : [];
    }));
    if (!Object.keys(out.farben).length) delete out.farben;
  }
  if (!Array.isArray(out.varianten)) return out;
  out.varianten = out.varianten.filter((variant) => allowed.has(Number(variant.printfulVariantId)));
  if (out.varianten.length !== allowed.size) throw new Error('VARIANT_GEOMETRY_GROUP_MISSING');
  if (!Array.isArray(out.druckdateiGruppen)) throw new Error('PRINTFILE_GROUPS_MISSING');
  const oldIndexes = [...new Set(out.varianten.map((variant) => Number(variant.druckdateiGruppe)))].sort((a, b) => a - b);
  if (oldIndexes.some((index) => !Number.isInteger(index) || !out.druckdateiGruppen[index])) throw new Error('PRINTFILE_GROUP_INVALID');
  const remap = new Map(oldIndexes.map((old, next) => [old, next]));
  out.varianten = out.varianten.map((variant) => ({ ...variant, druckdateiGruppe: remap.get(Number(variant.druckdateiGruppe)) }));
  out.druckdateiGruppen = oldIndexes.map((index) => out.druckdateiGruppen[index]);
  const used = new Set(out.druckdateiGruppen.flatMap((group) => Object.values(group.platzierungen || {}).map(Number)));
  out.platzierungen = out.platzierungen.map((placement) => {
    const geometries = Array.isArray(placement.geometrien) ? placement.geometrien.filter((geometry) => used.has(Number(geometry.printfileId))) : null;
    const result = { ...placement };
    if (geometries) result.geometrien = geometries;
    if (!used.has(Number(result.printfile?.printfileId))) {
      const geometry = geometries?.[0];
      const printfile = geometry && out.druckdateien?.[geometry.printfileId];
      if (!geometry || !printfile) throw new Error('DEFAULT_GEOMETRY_NOT_IN_PRODUCT_SCOPE');
      result.printfile = printfile; result.vorlage = geometry.vorlage;
    }
    return result;
  });
  out.druckdateien = Object.fromEntries(Object.entries(out.druckdateien || {}).filter(([id]) => used.has(Number(id))));
  return out;
}

function trimCard(card, product) {
  const out = JSON.parse(JSON.stringify(card));
  if (out.modelle) {
    for (const model of product.models) {
      const allowed = new Set(product.variants.filter((variant) => Number(variant.printfulProductId) === Number(model)).map((variant) => Number(variant.printfulVariantId)));
      out.modelle[String(model)] = trimModelCard(out.modelle[String(model)], allowed);
    }
  } else out.shop = out.shop; // Einzelkarte: Shop-Zuordnung unten unveraendert geprueft.
  if (!out.modelle) return trimModelCard(out, new Set(product.variants.map((variant) => Number(variant.printfulVariantId))));
  return out;
}

function expectedShopMap(product, bundle) {
  return Object.fromEntries(product.variants.map((variant) => [variant.shopifyVariantId, bundle
    ? { pv: Number(variant.printfulVariantId), m: Number(variant.printfulProductId) }
    : Number(variant.printfulVariantId)]));
}

function verifyShopMap(card, product) {
  const expected = expectedShopMap(product, Boolean(card.modelle));
  if (JSON.stringify(card.shop?.varianten) !== JSON.stringify(expected)) throw new Error(`${product.handle}: Kartenmapping weicht von 244er-Allowlist ab`);
}

function scopePreview(preview, card, product) {
  const out = JSON.parse(JSON.stringify(preview));
  const allowedModels = new Set(product.models.map(String));
  for (const model of Object.keys(out.modelle || {})) if (!allowedModels.has(model)) delete out.modelle[model];
  for (const model of product.models) {
    const entry = out.modelle?.[String(model)];
    const modelCard = card.modelle ? card.modelle[String(model)] : card;
    if (!entry || !modelCard) throw new Error(`${product.handle}: Preview/Modell ${model} fehlt`);
    const placements = new Set(modelCard.platzierungen.map((placement) => placement.id));
    entry.vorlagen = Object.fromEntries(Object.entries(entry.vorlagen || {}).filter(([id]) => placements.has(id)));
    entry.farbfest = (entry.farbfest || []).filter((id) => placements.has(id));
    const allowedVariants = new Set(product.variants.filter((variant) => Number(variant.printfulProductId) === Number(model)).map((variant) => String(variant.printfulVariantId)));
    entry.tasse = Object.fromEntries(Object.entries(entry.tasse || {}).filter(([pv]) => allowedVariants.has(pv)));
    const sources = new Set();
    for (const template of Object.values(entry.vorlagen)) {
      if (template.bild) sources.add(template.bild);
      if (template.hg) sources.add(template.hg);
    }
    entry.bilder = Object.fromEntries(Object.entries(entry.bilder || {}).filter(([source]) => sources.has(source)));
  }
  return out;
}

function availabilityUnknown(product, catalogs) {
  return product.variants.flatMap((variant) => {
    const source = (catalogs.get(Number(variant.printfulProductId))?.varianten || []).find((entry) => Number(entry.id) === Number(variant.printfulVariantId));
    return source?.status && Object.prototype.hasOwnProperty.call(source.status, 'EU') ? [] : [{
      handle: product.handle, model: Number(variant.printfulProductId), printfulVariantId: Number(variant.printfulVariantId), euStatus: 'unknown',
    }];
  });
}

function blockedCard(product) {
  return { schema: 1, blocked: true, product: product.shopifyProductId, models: product.models, reasonCodes: product.reasonCodes };
}

function validateAllowlist(allow) {
  if (allow.schema !== 1 || allow.products.length !== 18 || allow.products.reduce((sum, product) => sum + product.variants.length, 0) !== 244) throw new Error('Allowlist ist nicht 18/244');
  const counts = Object.fromEntries(['ready-preview', 'ready-binding', 'blocked'].map((status) => [status, allow.products.filter((product) => product.rolloutStatus === status)]));
  if (counts['ready-preview'].length !== 9 || counts['ready-preview'].reduce((sum, product) => sum + product.variants.length, 0) !== 73
    || counts['ready-binding'].length !== 7 || counts['ready-binding'].reduce((sum, product) => sum + product.variants.length, 0) !== 167
    || counts.blocked.length !== 2 || counts.blocked.reduce((sum, product) => sum + product.variants.length, 0) !== 4) throw new Error('Allowlist ist nicht 9/73 + 7/167 + 2/4');
  if (new Set(allow.products.map((product) => product.shopifyProductId)).size !== 18 || new Set(allow.products.flatMap((product) => product.variants.map((variant) => variant.shopifyVariantId))).size !== 244) throw new Error('Doppelte Produkt-/Varianten-ID');
  if (allow.blocked.length !== 1 || allow.blocked[0].handle !== 'buegeltransfer-selbst-gestalten') throw new Error('Nicht-Printful-Ausschluss weicht ab');
  if (JSON.stringify(allow.policy.panelModels) !== '[84]' || !/^--panel=84:/.test(allow.policy.panelEvaluation)) throw new Error('PANEL-84-Freigabebeleg fehlt');
  if (sha256(readFileSync(EDITOR)) !== allow.editorSha256) throw new Error('Editor-SHA weicht ab');
}

function buildBindingCard(product, catalogs, panelModels) {
  const modelCatalogs = product.models.map((model) => catalogs.get(Number(model)));
  const mapping = expectedShopMap(product, false);
  const opt = { ohneAufpreis: true, ohneEtiketten: true, panelErlauben: true };
  let card = modelCatalogs.length === 1
    ? karteFuerEditor(modelCatalogs[0], { ...opt, shopVarianten: mapping })
    : kartenbuendelFuerEditor(modelCatalogs, mapping, opt);
  if (product.models.includes(84)) {
    if (!panelModels.has(84)) throw new Error('PANEL84_EXPLICIT_APPROVAL_MISSING');
    panel84Pruefen(card, modelCatalogs[0], product);
  }
  card = trimCard(card, product); verifyShopMap(card, product); return card;
}

export function bauen({ write = true, panelModels = [] } = {}) {
  const allow = JSON.parse(readFileSync(ALLOWLIST, 'utf8'));
  validateAllowlist(allow);
  const allowedPanels = new Set((allow.policy.panelCandidateModels || []).map(Number));
  const requestedPanels = new Set((panelModels || []).map(Number));
  if (requestedPanels.size !== 1 || !requestedPanels.has(84)
    || [...requestedPanels].some((model) => !allowedPanels.has(model))) {
    throw new Error('PANEL84_EXPLICIT_APPROVAL_MISSING: Modell 84 braucht --panel=84 bzw. panelModels:[84]');
  }
  const catalogErrors = JSON.parse(readFileSync(resolve(KATALOG, '../katalog_fehler.json'), 'utf8'));
  if (!Array.isArray(catalogErrors) || catalogErrors.length) throw new Error('Kataloglauf meldet Fehler');
  const catalogs = new Map();
  for (const source of allow.source.catalog.files) {
    const bytes = readFileSync(resolve(KATALOG, `${source.model}.json`));
    if (bytes.length !== source.bytes || sha256(bytes) !== source.sha256) throw new Error(`${source.model}.json weicht vom Katalogbeleg ab`);
    catalogs.set(Number(source.model), JSON.parse(bytes));
  }
  if (catalogs.size !== 22) throw new Error('Katalogbeleg ist nicht 22/22');
  const outputs = [], unknown = [];
  for (const product of allow.products) {
    let card, preview = null;
    if (product.rolloutStatus === 'ready-preview') {
      const cardBytes = readFileSync(resolve(AUDIT_ASSETS, product.asset));
      const previewBytes = readFileSync(resolve(AUDIT_ASSETS, product.previewAsset));
      if (sha256(cardBytes) !== product.sourceAssets.cardSha256 || sha256(previewBytes) !== product.sourceAssets.previewSha256) throw new Error(`${product.handle}: Audit-Asset weicht ab`);
      card = trimCard(JSON.parse(cardBytes), product); verifyShopMap(card, product);
      preview = scopePreview(JSON.parse(previewBytes), card, product);
    } else if (product.rolloutStatus === 'ready-binding') card = buildBindingCard(product, catalogs, requestedPanels);
    else card = blockedCard(product);
    const text = JSON.stringify(card) + '\n';
    const previewText = preview ? JSON.stringify(preview) + '\n' : null;
    outputs.push({ handle: product.handle, productId: product.shopifyProductId, status: product.rolloutStatus, variants: product.variants.length, models: product.models,
      asset: product.asset, text, sha256: sha256(text), previewAsset: product.previewAsset, previewText, previewSha256: previewText ? sha256(previewText) : null, reasonCodes: product.reasonCodes });
    unknown.push(...availabilityUnknown(product, catalogs));
    if (write) {
      mkdirSync(MAPS, { recursive: true }); writeFileSync(resolve(MAPS, product.asset), text);
      if (previewText) writeFileSync(resolve(MAPS, product.previewAsset), previewText);
    }
  }
  const select = (status) => outputs.filter((output) => output.status === status);
  const report = {
    schema: 1, productCount: 18, variantCount: 244,
    readyPreviewProductCount: select('ready-preview').length, readyPreviewVariantCount: select('ready-preview').reduce((sum, output) => sum + output.variants, 0),
    readyBindingProductCount: select('ready-binding').length, readyBindingVariantCount: select('ready-binding').reduce((sum, output) => sum + output.variants, 0),
    blockedProductCount: select('blocked').length, blockedVariantCount: select('blocked').reduce((sum, output) => sum + output.variants, 0),
    excludedActiveCount: allow.blocked.length, blockedActiveCount: select('blocked').length + allow.blocked.length,
    productProjection: { verifiedProducts: 9, bindingOnlyProducts: 7, blockedProducts: 2 },
    catalogEvidence: { workflowRun: 42475585326, branchCommit: '68975230b', filesRead: 22, errors: [] },
    availabilityUnknown: unknown,
    assets: outputs.map(({ text, previewText, ...output }) => output),
  };
  if (unknown.length !== 4 || unknown.filter((entry) => entry.model === 656).length !== 3 || !unknown.some((entry) => entry.model === 71 && entry.printfulVariantId === 12872)) throw new Error('Regionale Unbekannt-Scope weicht ab');
  if (write) writeFileSync(resolve(HIER, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
  return { allow, outputs, report };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const panelModels = process.argv.includes('--panel=84') ? [84] : [];
  const result = bauen({ write: !check, panelModels });
  if (check) for (const output of result.outputs) {
    if (readFileSync(resolve(MAPS, output.asset), 'utf8') !== output.text) throw new Error(`${output.asset}: Kartenasset weicht ab`);
    if (output.previewText && readFileSync(resolve(MAPS, output.previewAsset), 'utf8') !== output.previewText) throw new Error(`${output.previewAsset}: Previewasset weicht ab`);
  }
  console.log(`V63_ROLLOUT_OK products=18 variants=244 preview=9/73 binding=7/167 blocked=2/4 excluded=1 mode=${check ? 'check' : 'build'}`);
}
