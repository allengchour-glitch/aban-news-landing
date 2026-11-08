#!/usr/bin/env node
/**
 * Erzeugt den exakten v6.3-Rollout-Scope aus dem belegten Shopify/Printful-Manifest.
 * Modell 84 ist PANEL und wird nur nach dem ausdruecklichen CLI-Schalter --panel=84
 * in die Allowlist aufgenommen. Die eigentliche Geometriepruefung erfolgt im Kartenbau.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HIER, '../../../');
const MANIFEST = resolve(HIER, 'source/product-manifest-r137.json');
const OUTPUT = resolve(HIER, 'allowlist.json');
const KATALOG = resolve(REPO, 'dropship/selbst-gestalten-fertig-0511/target-katalog-20261108/katalog');
const EDITOR = resolve(REPO, 'pod/v6/lspod-designer-v6-6.3.1.js');
const AUDIT = resolve(HIER, 'source/audit');
const AUDIT_REPORT = resolve(AUDIT, 'rollout-report.json');
const AUDIT_ASSETS = resolve(AUDIT, 'assets');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const datei = (path) => readFileSync(path);
const PANEL_FLAG = '--panel=84';
const BINDING_ONLY = new Set([
  'allover-stoffbeutel-selbst-gestalten',
  'edelstahl-trinkflasche-mit-strohhalm-selbst-gestalten',
  'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten',
  'mauspad-selbst-gestalten',
  'samsung-huelle-selbst-gestalten',
  'spiral-notizbuch-selbst-gestalten',
  'transparente-iphone®-hulle-selbst-gestalten',
]);
const BLOCK_CODES = Object.freeze({
  'dad-cap-selbst-gestalten': ['EMBROIDERY_OPTIONS_UNVERIFIED', 'NO_FREE_NON_LABEL_PLACEMENT'],
  'magnet-zum-selbstgestalten': ['REGIONAL_AVAILABILITY_UNKNOWN'],
});

function idNummer(gid, art) {
  const match = String(gid || '').match(new RegExp(`^gid://shopify/${art}/(\\d+)$`));
  if (!match) throw new Error(`Ungueltige ${art}-GID: ${gid}`);
  return match[1];
}

export function erzeugen({ panel84 = false } = {}) {
  if (!panel84) throw new Error(`PANEL_BLOCKED: Modell 84 braucht den expliziten Schalter ${PANEL_FLAG}`);
  const raw = datei(MANIFEST);
  const manifest = JSON.parse(raw);
  if (manifest.schemaVersion !== 2 || manifest.shop !== 'luxestyle.ch') throw new Error('Manifest ist nicht der belegte LuxeStyle-Scope');
  const active = manifest.products.filter((product) => product.shopifyStatus === 'ACTIVE');
  const printful = active.filter((product) => product.variants.length > 0 && !(product.blockers || []).length);
  const excluded = active.filter((product) => !printful.includes(product));
  if (active.length !== 19 || printful.length !== 18 || printful.reduce((sum, product) => sum + product.variants.length, 0) !== 244) {
    throw new Error('Manifest weicht vom belegten Scope 19 ACTIVE / 18 Printful / 244 Varianten ab');
  }
  if (excluded.length !== 1 || excluded[0].shopifyHandle !== 'buegeltransfer-selbst-gestalten' || !(excluded[0].blockers || []).includes('NON_PRINTFUL_FULFILLMENT')) {
    throw new Error('Aktiver Nicht-Printful-Ausschluss ist nicht exakt belegt');
  }
  const auditRaw = datei(AUDIT_REPORT);
  const audit = JSON.parse(auditRaw);
  if (audit.shop !== 'luxestyle.ch' || audit.totals?.active !== 19 || audit.totals?.ready !== 9 || audit.totals?.blocked !== 10 || audit.totals?.variantsReady !== 73 || audit.totals?.variantsBlocked !== 171) {
    throw new Error('Audit weicht von 9/73 bereit und 10/171 blockiert ab');
  }
  const auditedById = new Map([
    ...audit.ready.map((entry) => [entry.productId, { status: 'ready', ...entry }]),
    ...audit.blocked.map((entry) => [entry.productId, { status: 'blocked', ...entry }]),
  ]);

  const products = printful.map((product) => {
    const models = [...new Set(product.variants.map((variant) => Number(variant.printfulProductId)))];
    if (models.some((model) => !Number.isInteger(model) || model <= 0)) throw new Error(`${product.shopifyHandle}: ungueltige Modell-ID`);
    const variants = product.variants.map((variant) => ({
      shopifyVariantId: idNummer(variant.shopifyVariantId, 'ProductVariant'),
      printfulProductId: Number(variant.printfulProductId),
      printfulVariantId: Number(variant.printfulVariantId),
    }));
    if (new Set(variants.map((variant) => variant.shopifyVariantId)).size !== variants.length) throw new Error(`${product.shopifyHandle}: doppelte Shopify-Variante`);
    const audited = auditedById.get(product.shopifyProductId);
    if (!audited || audited.handle !== product.shopifyHandle || audited.variants !== variants.length || JSON.stringify(audited.models) !== JSON.stringify([...models].sort((a, b) => a - b))) {
      throw new Error(`${product.shopifyHandle}: Audit-Identitaet oder Scope weicht ab`);
    }
    const numericProductId = idNummer(product.shopifyProductId, 'Product');
    const rolloutStatus = audited.status === 'ready' ? 'ready-preview' : BINDING_ONLY.has(product.shopifyHandle) ? 'ready-binding' : 'blocked';
    if (rolloutStatus === 'blocked' && !BLOCK_CODES[product.shopifyHandle]) throw new Error(`${product.shopifyHandle}: nicht freigegebener Blocker-Scope`);
    const asset = `lspod-${numericProductId}.karte.json`;
    const previewAsset = rolloutStatus === 'ready-preview' ? `lspod-${numericProductId}.vorschau.json` : null;
    const sourceAssets = rolloutStatus === 'ready-preview' ? {
      cardSha256: sha256(datei(resolve(AUDIT_ASSETS, audited.assets.card))),
      previewSha256: sha256(datei(resolve(AUDIT_ASSETS, audited.assets.preview))),
    } : null;
    return {
      shopifyProductId: product.shopifyProductId,
      handle: product.shopifyHandle,
      status: product.shopifyStatus,
      rolloutStatus,
      asset,
      previewAsset,
      reasonCodes: rolloutStatus === 'blocked' ? BLOCK_CODES[product.shopifyHandle] : [],
      sourceAssets,
      models,
      variants,
    };
  });
  const allVariantIds = products.flatMap((product) => product.variants.map((variant) => variant.shopifyVariantId));
  if (new Set(allVariantIds).size !== 244) throw new Error('Shopify-Variant-ID ist produktuebergreifend doppelt');
  const modelIds = [...new Set(products.flatMap((product) => product.models))].sort((a, b) => a - b);
  if (modelIds.length !== 22 || !modelIds.includes(84)) throw new Error('Modell-Scope ist nicht der belegte 22er-Scope');
  const catalogFiles = modelIds.map((model) => {
    const path = resolve(KATALOG, `${model}.json`);
    const content = datei(path);
    const parsed = JSON.parse(content);
    if (Number(parsed.id) !== model || parsed.schema !== 2) throw new Error(`${model}.json: falsches Modell oder Schema`);
    return { model, sha256: sha256(content), bytes: content.length };
  });

  return {
    schema: 1,
    stand: manifest.generatedAt,
    source: {
      manifest: { path: 'source/product-manifest-r137.json', sha256: sha256(raw), branchCommit: 'eb5db1e8e04c8b6e865714a3c936fc61aceceb20' },
      catalog: {
        workflowRun: 42475585326,
        branchCommit: '68975230b',
        path: '../target-katalog-20261108/katalog',
        errorFileSha256: sha256(datei(resolve(KATALOG, '../katalog_fehler.json'))),
        files: catalogFiles,
      },
      audit: {
        report: 'source/audit/rollout-report.json',
        reportSha256: sha256(auditRaw),
        scriptSha256: sha256(datei(resolve(AUDIT, 'build_v63_assets.mjs'))),
        readyProducts: 9,
        readyVariants: 73,
        bindingOnlyProducts: 7,
        bindingOnlyVariants: 167,
        blockedPrintfulProducts: 2,
        blockedPrintfulVariants: 4,
      },
    },
    editorSha256: sha256(datei(EDITOR)),
    policy: {
      onlyActive: true,
      paidPlacements: false,
      labels: false,
      productProjection: 'nine-audited-products-only',
      panelModels: [84],
      panelCandidateModels: [84],
      panelEvaluation: `${PANEL_FLAG}: binding-print-area-only-after-geometry-check`,
      reason: 'Neun Produkte erhalten eine gepruefte proportionale Produktvorschau, sieben nur die verbindliche Druckflaeche. Cap und Magnet bleiben mit deterministischem Blocker-Asset fail-closed.',
    },
    products,
    blocked: excluded.map((product) => ({
      shopifyProductId: product.shopifyProductId,
      handle: product.shopifyHandle,
      variantCount: product.variants.length,
      reasons: product.blockers,
    })),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const panel84 = process.argv.includes(PANEL_FLAG);
  const check = process.argv.includes('--check');
  const text = JSON.stringify(erzeugen({ panel84 }), null, 2) + '\n';
  if (check) {
    if (readFileSync(OUTPUT, 'utf8') !== text) throw new Error('allowlist.json weicht vom belegten Neubau ab');
  } else writeFileSync(OUTPUT, text);
  console.log(`V63_ALLOWLIST_OK products=18 variants=244 models=22 panel=84 mode=${check ? 'check' : 'build'}`);
}
