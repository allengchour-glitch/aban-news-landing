import { createHash } from 'node:crypto';

export const ALLOWLIST = Object.freeze([
  ['15422950474113', 'allover-stoffbeutel-selbst-gestalten'],
  ['15422854463873', 'alltags-umhangetasche-selbst-gestalten'],
  ['15422819991937', 'bio-jutebeutel-selbst-gestalten'],
  ['15422940447105', 'edelstahl-trinkflasche-mit-strohhalm-selbst-gestalten'],
  ['15422939988353', 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten'],
  ['15422823465345', 'keramik-tasse-selbst-gestalten'],
  ['15422942609793', 'kiss-cut-aufkleber-selbst-gestalten'],
  ['15422857642369', 'klassisches-unisex-t-shirt-selbst-gestalten'],
  ['15451569160577', 'mauspad-selbst-gestalten'],
  ['16672778289543', 'samsung-huelle-selbst-gestalten'],
  ['15427283157377', 'shirt-zum-selbstgestalten'],
  ['15451569324417', 'spiral-notizbuch-selbst-gestalten'],
  ['15427282633089', 'tasse-zum-selbstgestalten'],
  ['15422946804097', 'transparente-iphone®-hulle-selbst-gestalten'],
  ['15422815699329', 'unisex-hoodie-selbst-gestalten'],
  ['15422811439489', 'unisex-t-shirt-selbst-gestalten'],
].map(([id, handle]) => Object.freeze({ id: `gid://shopify/Product/${id}`, numericId: id, handle })));

export const BLOCKLIST = Object.freeze([
  ['15423895830913', 'buegeltransfer-selbst-gestalten', 'Fremd-Fulfillment: Die Druckdatenübergabe an den Produktionspartner ist noch nicht bestätigt.'],
  ['15422849188225', 'dad-cap-selbst-gestalten', 'Die nötige Stickplatzierung und ihre Produktionsoptionen sind noch nicht vollständig geprüft.'],
  ['15427217195393', 'magnet-zum-selbstgestalten', 'Produktion und Lieferung dieser Ausführung in die Schweiz sind derzeit nicht bestätigt.'],
].map(([id, handle, reason]) => Object.freeze({ id: `gid://shopify/Product/${id}`, numericId: id, handle, reason })));

export const PREVIEW_IDS = Object.freeze([
  '15422854463873', '15422819991937', '15422823465345',
  '15422942609793', '15422857642369', '15427283157377',
  '15427282633089', '15422815699329', '15422811439489',
]);

export const sha256 = (wert) => createHash('sha256').update(wert).digest('hex');
export const numericId = (gid) => String(gid || '').split('/').pop();
export const sortIds = (ids) => [...ids].map(String).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

const MARKER = /<!-- lx-v63-editor:start\b[\s\S]*?<!-- lx-v63-editor:end -->\s*/giu;
const LEGACY = /<div\b[^>]*class=(['"])[^'"]*\blspod-designer(?:-v6)?\b[^'"]*\1[^>]*>\s*<\/div>\s*<script\b[^>]*\bsrc=(['"])[^'"]*lspod-designer[^'"]*\.js(?:\?[^'"]*)?\2[^>]*>\s*<\/script>\s*(?:<hr\b[^>]*>\s*)?/giu;

export function attr(wert) {
  return String(wert == null ? '' : wert)
    .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
function assetPfad(url, erwartet) {
  let u;
  try { u = new URL(url); } catch { return false; }
  return u.protocol === 'https:' && u.host === 'abannews.com' && u.pathname === erwartet && !u.username && !u.password;
}

export function assetUrl(url, hash) {
  if (!/^[a-f0-9]{64}$/.test(hash || '')) throw new Error('Asset-Version braucht einen SHA-256');
  const u = new URL(url);
  u.searchParams.set('v', hash.slice(0, 16));
  return u.href;
}

export function integritySha256(hash) {
  if (!/^[a-f0-9]{64}$/.test(hash || '')) throw new Error('SRI braucht einen SHA-256');
  return `sha256-${Buffer.from(hash, 'hex').toString('base64')}`;
}

export function releaseAusAllowlist(allowlist, { editorSha256, assetSha256 }) {
  if (!allowlist || allowlist.schema !== 1 || !Array.isArray(allowlist.products) || !Array.isArray(allowlist.blocked)) throw new Error('Quell-Allowlist: Schema 1/products/blocked fehlt');
  if (!/^[a-f0-9]{64}$/.test(editorSha256 || '') || allowlist.editorSha256 !== editorSha256) throw new Error('Quell-Allowlist: Editor-SHA weicht von der lokalen v6.3-Datei ab');
  if (!(assetSha256 instanceof Map)) throw new Error('Quell-Allowlist: Asset-SHAs fehlen');

  const erwartet = new Map([...ALLOWLIST, ...BLOCKLIST.slice(1)].map((x) => [x.id, x]));
  const rows = new Map();
  for (const p of allowlist.products) {
    if (!p || rows.has(p.shopifyProductId)) throw new Error(`Quell-Allowlist: Produkt fehlt oder doppelt: ${p?.shopifyProductId || '?'}`);
    rows.set(p.shopifyProductId, p);
  }
  if (rows.size !== erwartet.size || [...erwartet].some(([id]) => !rows.has(id))) throw new Error(`Quell-Allowlist: erwartet ${erwartet.size} Printful-Produkte`);

  const dtf = allowlist.blocked.filter((p) => p?.shopifyProductId === BLOCKLIST[0].id && p?.handle === BLOCKLIST[0].handle && p?.reasons?.includes('NON_PRINTFUL_FULFILLMENT'));
  if (dtf.length !== 1) throw new Error('Quell-Allowlist: externer Bügeltransfer ist nicht eindeutig als NON_PRINTFUL_FULFILLMENT gesperrt');

  const preview = new Set(PREVIEW_IDS);
  const products = ALLOWLIST.map((a) => {
    const p = rows.get(a.id);
    if (p.handle !== a.handle || p.status !== 'ACTIVE') throw new Error(`Quell-Allowlist: Identität/Status weicht ab: ${a.handle}`);
    const sollPreview = preview.has(a.numericId);
    if (p.rolloutStatus !== (sollPreview ? 'ready-preview' : 'ready-binding')) throw new Error(`Quell-Allowlist: falscher Rollout-Status: ${a.handle}`);
    const card = `lspod-${a.numericId}.karte.json`;
    const vorschau = sollPreview ? `lspod-${a.numericId}.vorschau.json` : null;
    if (p.asset !== card || (p.previewAsset || null) !== vorschau) throw new Error(`Quell-Allowlist: Asset-Zuordnung weicht ab: ${a.handle}`);
    const variants = (p.variants || []).map((v) => String(v.shopifyVariantId || ''));
    if (!variants.length || variants.some((x) => !/^\d+$/.test(x)) || new Set(variants).size !== variants.length) throw new Error(`Quell-Allowlist: Varianten fehlen/doppelt: ${a.handle}`);
    const cardSha = assetSha256.get(card);
    const previewSha = vorschau ? assetSha256.get(vorschau) : null;
    if (!/^[a-f0-9]{64}$/.test(cardSha || '') || (vorschau && !/^[a-f0-9]{64}$/.test(previewSha || ''))) throw new Error(`Quell-Allowlist: lokaler Asset-SHA fehlt: ${a.handle}`);
    return {
      id: a.id, handle: a.handle,
      cardUrl: `https://abannews.com/pod/v6/maps/${card}`, cardSha256: cardSha,
      previewUrl: vorschau ? `https://abannews.com/pod/v6/maps/${vorschau}` : null,
      previewSha256: previewSha, variantIds: variants,
    };
  });

  for (const b of BLOCKLIST.slice(1)) {
    const p = rows.get(b.id);
    if (!p || p.handle !== b.handle || p.status !== 'ACTIVE' || p.rolloutStatus !== 'blocked') throw new Error(`Quell-Allowlist: Printful-Blocker weicht ab: ${b.handle}`);
  }
  return { schema: 1, editor: { url: 'https://abannews.com/pod/v6/lspod-designer-v6-6.3.0.js', sha256: editorSha256 }, products };
}

export function releasePruefen(release) {
  if (!release || release.schema !== 1 || !Array.isArray(release.products)) throw new Error('Release-Manifest: Schema 1/products fehlt');
  if (!release.editor || !assetPfad(release.editor.url, '/pod/v6/lspod-designer-v6-6.3.0.js') || !/^[a-f0-9]{64}$/.test(release.editor.sha256 || '')) {
    throw new Error('Release-Manifest: Editor-URL oder SHA-256 unbrauchbar');
  }
  const erlaubt = new Map(ALLOWLIST.map((x) => [x.id, x]));
  const gesehen = new Set();
  for (const p of release.products) {
    const a = erlaubt.get(p.id);
    if (!a || a.handle !== p.handle) throw new Error(`Release-Manifest: Produkt nicht erlaubt oder Handle falsch: ${p.id || '?'} ${p.handle || '?'}`);
    if (gesehen.has(p.id)) throw new Error(`Release-Manifest: Produkt doppelt: ${p.id}`);
    gesehen.add(p.id);
    if (!assetPfad(p.cardUrl, `/pod/v6/maps/lspod-${a.numericId}.karte.json`) || !/^[a-f0-9]{64}$/.test(p.cardSha256 || '')) throw new Error(`${p.handle}: Karten-URL/SHA unbrauchbar oder nicht dem Produkt zugeordnet`);
    const sollPreview = PREVIEW_IDS.includes(a.numericId);
    if (sollPreview && (!assetPfad(p.previewUrl, `/pod/v6/maps/lspod-${a.numericId}.vorschau.json`) || !/^[a-f0-9]{64}$/.test(p.previewSha256 || ''))) throw new Error(`${p.handle}: belegte Vorschau-URL/SHA fehlt oder ist nicht dem Produkt zugeordnet`);
    if (!sollPreview && (p.previewUrl != null || p.previewSha256 != null)) throw new Error(`${p.handle}: für dieses Produkt ist keine Produktprojektion belegt`);
    if (!Array.isArray(p.variantIds) || !p.variantIds.length || new Set(p.variantIds.map(String)).size !== p.variantIds.length) throw new Error(`${p.handle}: variantIds fehlen oder sind doppelt`);
  }
  if (gesehen.size !== ALLOWLIST.length) {
    const fehlt = ALLOWLIST.filter((x) => !gesehen.has(x.id)).map((x) => x.handle);
    throw new Error(`Release-Manifest: erwartet ${ALLOWLIST.length} Produkte, gefunden ${gesehen.size}; fehlt: ${fehlt.join(', ')}`);
  }
  const mitVorschau = release.products.filter((p) => p.previewUrl).length;
  if (mitVorschau !== 9) throw new Error(`Release-Manifest: erwartet 9 ehrliche Produktvorschauen und 7 Druckdatei-Ansichten, gefunden ${mitVorschau}/${release.products.length - mitVorschau}`);
  return true;
}

export function baustein({ product, releaseProduct, editor }) {
  const varianten = product.variants?.nodes || [];
  const standard = varianten.find((v) => v.availableForSale) || varianten[0];
  if (!standard) throw new Error(`${product.handle}: keine Shopify-Variante`);
  const attrs = [
    ['class', 'lspod-designer-v6'],
    ['data-variant', numericId(standard.id)],
    ['data-karte-url', assetUrl(releaseProduct.cardUrl, releaseProduct.cardSha256)],
    ['data-karte-pflicht', '1'],
    ['data-produkttitel', product.title],
  ];
  if (releaseProduct.previewUrl) attrs.push(['data-vorschau-url', assetUrl(releaseProduct.previewUrl, releaseProduct.previewSha256)]);
  const div = attrs.map(([k, v]) => `${k}="${attr(v)}"`).join(' ');
  return `<!-- lx-v63-editor:start product=${releaseProduct.id} card=${releaseProduct.cardSha256} -->\n<div ${div}></div>\n<script src="${attr(assetUrl(editor.url, editor.sha256))}" integrity="${attr(integritySha256(editor.sha256))}" crossorigin="anonymous" defer></script>\n<hr>\n<!-- lx-v63-editor:end -->\n`;
}

export function blockerBaustein({ product, blocker }) {
  const varianten = (product.variants?.nodes || []).map((v) => numericId(v.id)).filter((x) => /^\d+$/.test(x));
  if (!varianten.length) throw new Error(`${product.handle}: keine Shopify-Variante für den Sperrbaustein`);
  const ids = JSON.stringify(varianten);
  return `<!-- lx-v63-editor:start product=${blocker.id} mode=blocked -->\n` +
    `<style>html:has([data-lspod-blocked="${attr(blocker.numericId)}"]) form[action*="/cart/add"] button[type="submit"],html:has([data-lspod-blocked="${attr(blocker.numericId)}"]) form[action*="/cart/add"] input[type="submit"],html:has([data-lspod-blocked="${attr(blocker.numericId)}"]) .shopify-payment-button{pointer-events:none!important;opacity:.45!important}</style>\n` +
    `<div id="lspod-start" class="lspod-v63-blocked" data-lspod-blocked="${attr(blocker.numericId)}" role="status" style="padding:20px;border:1px solid #b9a998;border-radius:12px;background:#f8f4ef;color:#2a2521">\n` +
    `<h2 style="margin:0 0 8px">Personalisierung derzeit nicht bestellbar</h2>\n` +
    `<p style="margin:0">${attr(blocker.reason)} Wir schalten die Gestaltung erst nach der technischen Prüfung frei.</p>\n` +
    `</div>\n` +
    `<script>(function(s){var ids=${ids};var root=s.previousElementSibling;function ours(f){var i=f&&f.querySelector&&f.querySelector('[name="id"]');return !!(i&&ids.indexOf(String(i.value))>=0)}function warn(e){e.preventDefault();e.stopImmediatePropagation();root&&root.scrollIntoView({behavior:'smooth',block:'center'})}function submit(e){if(ours(e.target))warn(e)}function click(e){var b=e.target&&e.target.closest&&e.target.closest('button,input[type="submit"],.shopify-payment-button');var f=b&&b.closest&&b.closest('form[action*="/cart/add"]');if((f&&ours(f))||(b&&b.closest&&b.closest('.shopify-payment-button')))warn(e)}function lock(){document.querySelectorAll('form[action*="/cart/add"]').forEach(function(f){if(!ours(f))return;f.querySelectorAll('button[type="submit"],input[type="submit"],button[name="add"]').forEach(function(b){b.disabled=true;b.setAttribute('aria-disabled','true');b.setAttribute('title','Personalisierung derzeit nicht bestellbar')});f.querySelectorAll('.shopify-payment-button').forEach(function(b){b.hidden=true;b.setAttribute('aria-hidden','true')})})}document.addEventListener('submit',submit,true);document.addEventListener('click',click,true);document.addEventListener('change',lock,true);new MutationObserver(lock).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',lock,{once:true});else lock()})(document.currentScript);</script>\n` +
    `<!-- lx-v63-editor:end -->\n`;
}

export function beschreibungPlanen(html, neu, { blocked = false } = {}) {
  const alt = String(html || '');
  const marker = [...alt.matchAll(MARKER)];
  const ohneMarker = alt.replace(MARKER, '');
  const legacy = [...ohneMarker.matchAll(LEGACY)];
  if (marker.length > 1 || legacy.length > 1 || (marker.length && legacy.length)) throw new Error(`Editor-Baustein nicht eindeutig (Marker ${marker.length}, Alt ${legacy.length})`);
  let nachher;
  if (marker.length === 1) nachher = alt.replace(MARKER, neu);
  else if (legacy.length === 1) nachher = alt.replace(LEGACY, neu);
  else throw new Error('Kein bestehender Editor-Baustein gefunden');
  const merk = (nachher.match(/lx-v63-editor:start/g) || []).length;
  const editor = (nachher.match(/class="lspod-designer-v6"/g) || []).length;
  const sperre = (nachher.match(/class="lspod-v63-blocked"[^>]*data-lspod-blocked=/g) || []).length;
  if (merk !== 1 || (!blocked && editor !== 1) || (blocked && (editor !== 0 || sperre !== 1))) throw new Error('Neuer Editor-/Sperrbaustein nicht eindeutig');
  if (/class=(['"])[^'"]*\blspod-designer\b(?!-v6)/i.test(nachher)) throw new Error('Alter v5-Container blieb in der Beschreibung');
  return { vorher: alt, nachher, vorherSha256: sha256(alt), nachherSha256: sha256(nachher), geaendert: alt !== nachher };
}

export function produktPruefen(product, releaseProduct) {
  const a = ALLOWLIST.find((x) => x.id === product.id);
  if (!a || product.handle !== a.handle || releaseProduct.id !== a.id || releaseProduct.handle !== a.handle) throw new Error(`${product.handle || product.id}: Identität weicht von der Allowlist ab`);
  if (product.status !== 'ACTIVE') throw new Error(`${product.handle}: Status ${product.status}, erwartet ACTIVE`);
  if (!product.onlineStoreUrl || !/^https:\/\/luxestyle\.ch\/products\//.test(product.onlineStoreUrl)) throw new Error(`${product.handle}: keine bestätigte Storefront-URL`);
  if (product.variants?.pageInfo?.hasNextPage) throw new Error(`${product.handle}: Variantenabfrage ist unvollständig`);
  const varianten = product.variants?.nodes || [];
  if (!varianten.some((v) => v.availableForSale)) throw new Error(`${product.handle}: keine kaufbare Variante`);
  const ist = sortIds(varianten.map((v) => numericId(v.id)));
  const soll = sortIds(releaseProduct.variantIds);
  if (JSON.stringify(ist) !== JSON.stringify(soll)) throw new Error(`${product.handle}: Varianten-Scope weicht ab (Shop ${ist.length}, Release ${soll.length})`);
  return true;
}

export function blockerProduktPruefen(product, blocker, variantIds = null) {
  const b = BLOCKLIST.find((x) => x.id === product.id);
  if (!b || b.id !== blocker.id || b.handle !== blocker.handle || product.handle !== b.handle) throw new Error(`${product.handle || product.id}: Blocker-Identität weicht ab`);
  if (product.status !== 'ACTIVE') throw new Error(`${product.handle}: Status ${product.status}, erwartet ACTIVE`);
  if (!product.onlineStoreUrl || !/^https:\/\/luxestyle\.ch\/products\//.test(product.onlineStoreUrl)) throw new Error(`${product.handle}: keine bestätigte Storefront-URL`);
  if (product.variants?.pageInfo?.hasNextPage) throw new Error(`${product.handle}: Variantenabfrage ist unvollständig`);
  const ist = sortIds((product.variants?.nodes || []).map((v) => numericId(v.id)));
  if (!ist.length) throw new Error(`${product.handle}: keine Shopify-Variante für den Sperrbaustein`);
  if (variantIds && JSON.stringify(ist) !== JSON.stringify(sortIds(variantIds))) throw new Error(`${product.handle}: Varianten-Scope weicht vom Sperrplan ab`);
  return true;
}
