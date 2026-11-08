import { createHash } from 'node:crypto';
import { isValidCjPid } from './cj_identity.mjs';

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const AUTH_URL = `${BASE}/authentication/getAccessToken`;
const PRODUCT_URL = `${BASE}/product/query`;
const INVENTORY_URL = `${BASE}/product/stock/getInventoryByPid`;
const DOC_URL = 'https://developers.cjdropshipping.com/en/api/api2/api/auth.html';
const BODY_LIMIT = 2 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const REQUEST_GAP_MS = 1_100;
const TOKEN_SAFETY_MS = 5 * 60 * 1000;
const MAX_IMAGE_URLS = 25;
const MAX_VARIANTS = 50;
const MAX_COUNTRIES_PER_VARIANT = 20;
const MAX_INVENTORY_COUNTRY_ROWS = 400;
const MAX_INVENTORY_REPORT_BYTES = 128 * 1024;
const MAX_URL_BYTES = 1024;
const SOFT_CODES = new Map([[1602001, 'product_not_found'], [1602002, 'product_removed'], [1602003, 'variant_removed']]);
const QUOTA = /insufficient api points|daily.*(?:quota|limit)|points.*exhaust|too many requests/i;

function validSecret(value, max = 1024) {
  return typeof value === 'string' && value.length >= 16 && value.length <= max
    && value === value.trim() && /^[\x21-\x7e]+$/.test(value);
}

function validLookup(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return false;
  const keys = Object.keys(args);
  if (keys.length !== 1) return false;
  if (keys[0] === 'pid') return isValidCjPid(args.pid);
  return keys[0] === 'productSku' && typeof args.productSku === 'string'
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(args.productSku);
}

function validPidLookup(args) {
  return !!args && typeof args === 'object' && !Array.isArray(args)
    && Object.keys(args).length === 1 && Object.keys(args)[0] === 'pid'
    && isValidCjPid(args.pid);
}

function safeUrl(value) {
  if (typeof value !== 'string' || !value || value !== value.trim()
    || Buffer.byteLength(value, 'utf8') > MAX_URL_BYTES || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.username === '' && url.password === '' ? value : null;
  } catch { return null; }
}

function includesSecret(value, secrets) {
  let text;
  try { text = JSON.stringify(value); } catch { return true; }
  const lower = text.toLowerCase();
  return secrets.filter(secret => validSecret(secret)).some(secret => {
    const encoded = encodeURIComponent(secret);
    const escaped = JSON.stringify(secret).slice(1, -1);
    return text.includes(secret) || text.includes(escaped) || lower.includes(encoded.toLowerCase());
  });
}

function boundedText(value, maxBytes) {
  if (typeof value !== 'string') return { state: 'missing', value: null, truncated: false };
  if (/[\u0000-\u001f\u007f]/u.test(value)) return { state: 'invalid', value: null, truncated: false };
  if (Buffer.byteLength(value, 'utf8') <= maxBytes) return { state: 'returned', value, truncated: false };
  let text = '', bytes = 0;
  for (const character of value) {
    const size = Buffer.byteLength(character, 'utf8');
    if (bytes + size > maxBytes) break;
    text += character; bytes += size;
  }
  return { state: 'truncated', value: text, truncated: true };
}

function validIdentity(value, maxBytes) {
  const field = boundedText(value, maxBytes);
  return field.state === 'returned' && field.value.length > 0;
}

function validVid(value) {
  return typeof value === 'string' && /^[0-9A-Za-z][0-9A-Za-z-]{5,63}$/.test(value);
}

function validVariantSku(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(value);
}

function variantSkuKey(value) {
  return value.toUpperCase().replace(/^CJ-(?=CJ)/, '');
}

async function discardResponseBody(response) {
  try { await response?.body?.cancel?.(); } catch {}
}

async function boundedJson(response) {
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > BODY_LIMIT) {
    await discardResponseBody(response);
    throw new Error('response_too_large');
  }
  if (!response.body || typeof response.body.getReader !== 'function') throw new Error('response_body_unavailable');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BODY_LIMIT) {
        try { await reader.cancel(); } catch {}
        throw new Error('response_too_large');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), size)); }
  catch { throw new Error('response_invalid_utf8'); }
  try { return JSON.parse(text); }
  catch { throw new Error('response_invalid_json'); }
}

function responseReason(status) {
  if (status === 401 || status === 403) return 'authentication_rejected';
  if (status === 429) return 'throttled';
  if (status >= 500) return 'upstream_unavailable';
  return `http_${Number.isInteger(status) ? status : 'unknown'}`;
}

function errorReason(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout';
  const allowed = new Set(['response_too_large', 'response_body_unavailable', 'response_invalid_utf8',
    'response_invalid_json', 'redirect_rejected', 'network_error']);
  return allowed.has(error?.message) ? error.message : 'transport_unknown';
}

function imageField(value) {
  const url = safeUrl(value);
  return url ? { state: 'supplier_url_returned', url, downloaded: false, rights: 'unknown' }
    : { state: 'unknown', url: null, reason: value == null ? 'field_missing' : 'invalid_url' };
}

function listImages(value) {
  if (!Array.isArray(value)) return { state: 'unknown', reported: null, returned: 0, partial: false, urls: null };
  const urls = value.map(safeUrl);
  if (urls.some(url => !url)) return { state: 'unknown', reported: value.length, returned: 0, partial: false, urls: null };
  const limited = urls.slice(0, MAX_IMAGE_URLS);
  return { state: limited.length === urls.length ? 'supplier_urls_returned' : 'partial_supplier_urls_returned',
    reported: urls.length, returned: limited.length, partial: limited.length !== urls.length, urls: limited,
    downloaded: false, rights: 'unknown' };
}

function listVariants(value, pid) {
  if (!Array.isArray(value)) return { state: 'unknown', reported: null, returned: 0, partial: false, records: null };
  const records = [];
  const vids = new Set(), skus = new Set();
  for (const variant of value.slice(0, MAX_VARIANTS)) {
    const vidKey = typeof variant?.vid === 'string' ? variant.vid.toUpperCase() : null;
    const skuKey = typeof variant?.variantSku === 'string' && validVariantSku(variant.variantSku)
      ? variantSkuKey(variant.variantSku) : null;
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)
      || !validVid(variant.vid)
      || !isValidCjPid(variant.pid) || variant.pid !== pid
      || !skuKey || vids.has(vidKey) || skus.has(skuKey)) {
      return { state: 'unknown', reported: value.length, returned: 0, partial: false, records: null,
        reason: 'variant_identity_missing_or_inconsistent' };
    }
    vids.add(vidKey); skus.add(skuKey);
    const key = boundedText(variant.variantKey, 300), standard = boundedText(variant.variantStandard, 300);
    records.push({ vid: variant.vid, pid: variant.pid, variantSku: variant.variantSku,
      variantKey: key.value, variantKeyState: key.state,
      variantStandard: standard.value, variantStandardState: standard.state,
      image: imageField(variant.variantImage) });
  }
  return { state: records.length === value.length ? 'supplier_metadata_returned' : 'partial_supplier_metadata_returned',
    reported: value.length, returned: records.length, partial: records.length !== value.length, records,
    shopifyVariantMapping: 'unknown' };
}

function normaliseProduct(data, lookup) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { state: 'unknown', reason: 'malformed_product_data' };
  if (!isValidCjPid(data.pid)) return { state: 'unknown', reason: 'missing_or_invalid_pid' };
  const [lookupKey, lookupValue] = Object.entries(lookup)[0];
  if (data[lookupKey] !== lookupValue) return { state: 'mismatch', reason: 'product_identity_mismatch' };
  const sku = boundedText(data.productSku, 200), name = boundedText(data.productNameEn, 1000);
  return {
    state: 'product_identity_verified', matchedBy: { key: lookupKey, value: lookupValue },
    product: { pid: data.pid, productSku: sku.value, productSkuState: sku.state,
      productNameEn: name.value, productNameEnState: name.state,
      mainImage: imageField(data.bigImage), imageSet: listImages(data.productImageSet),
      variants: listVariants(data.variants, data.pid) },
    verificationScope: 'exact CJ product identity and supplier-returned metadata only',
    commercialMediaRights: 'unknown', primeEntitlement: 'unknown', storefrontMapping: 'unknown'
  };
}

function nonnegativeSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function inventoryCountryRow(value) {
  const row = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    countryCode: typeof row.countryCode === 'string' && /^[A-Z]{2}$/.test(row.countryCode)
      ? row.countryCode : null,
    totalInventory: nonnegativeSafeInteger(row.totalInventory),
    cjInventory: nonnegativeSafeInteger(row.cjInventory),
    factoryInventory: nonnegativeSafeInteger(row.factoryInventory),
    verifiedWarehouse: row.verifiedWarehouse === 1 || row.verifiedWarehouse === 2
      ? row.verifiedWarehouse : null
  };
}

function inventoryPoints(value) {
  const points = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = {
    total: nonnegativeSafeInteger(points.total),
    usedToday: nonnegativeSafeInteger(points.usedToday),
    remaining: nonnegativeSafeInteger(points.remaining)
  };
  const known = Object.values(result).filter(item => item !== null).length;
  return { state: known === 3 ? 'returned' : known === 0 ? 'unknown' : 'partial', ...result };
}

function normaliseInventory(data, pointsInfo, pid) {
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || !Array.isArray(data.variantInventories)) {
    return { state: 'unknown', reason: 'malformed_inventory_data' };
  }
  const source = data.variantInventories;
  const sourceVids = new Set();
  for (const value of source) {
    const variant = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    const vidKey = typeof variant?.vid === 'string' ? variant.vid.toUpperCase() : null;
    if (!variant || !validVid(variant.vid) || sourceVids.has(vidKey)) {
      return { state: 'unknown', reason: 'malformed_inventory_data' };
    }
    sourceVids.add(vidKey);
  }
  const records = [];
  let rowsLeft = MAX_INVENTORY_COUNTRY_ROWS;
  let countryRowsReturned = 0;
  let partial = source.length > MAX_VARIANTS;
  for (const value of source.slice(0, MAX_VARIANTS)) {
    const variant = value;
    const vid = variant.vid;
    if (!Array.isArray(variant.inventory)) {
      records.push({ vid, countries: { state: 'unknown', reported: null, returned: 0,
        partial: false, records: null } });
      continue;
    }
    const reported = variant.inventory.length;
    const returned = Math.min(reported, MAX_COUNTRIES_PER_VARIANT, rowsLeft);
    const countries = variant.inventory.slice(0, returned).map(inventoryCountryRow);
    rowsLeft -= countries.length;
    countryRowsReturned += countries.length;
    const countryPartial = countries.length !== reported;
    if (countryPartial) partial = true;
    records.push({ vid, countries: {
      state: countryPartial ? 'partial_supplier_inventory_returned' : 'supplier_inventory_returned',
      reported, returned: countries.length, partial: countryPartial, records: countries
    } });
  }
  return {
    state: 'inventory_returned', reason: null,
    inventory: {
      pid,
      variants: {
        state: partial ? 'partial_supplier_inventory_returned' : 'supplier_inventory_returned',
        reported: source.length, returned: records.length, partial, countryRowsReturned, records
      },
      pointsInfo: inventoryPoints(pointsInfo),
      countryAggregation: false,
      deliveryToSwitzerland: 'unknown'
    }
  };
}

function inventoryVariantSetMatches(expectedVids, variants) {
  if (!Array.isArray(expectedVids) || expectedVids.length === 0 || !variants
    || variants.reported !== expectedVids.length || variants.returned !== expectedVids.length
    || !Array.isArray(variants.records) || variants.records.length !== expectedVids.length) return false;
  const actual = new Set();
  for (const record of variants.records) {
    if (!record || !validVid(record.vid)) return false;
    const key = record.vid.toUpperCase();
    if (actual.has(key)) return false;
    actual.add(key);
  }
  return expectedVids.every(vid => actual.has(vid));
}

function enforceInventoryReportLimit(report) {
  const size = () => Buffer.byteLength(JSON.stringify(report), 'utf8');
  while (size() > MAX_INVENTORY_REPORT_BYTES && report.inventory?.variants?.records?.length) {
    const variants = report.inventory.variants;
    const withCountry = [...variants.records].reverse().find(record => record.countries?.records?.length);
    if (withCountry) {
      withCountry.countries.records.pop();
      withCountry.countries.returned--;
      withCountry.countries.partial = true;
      withCountry.countries.state = 'partial_supplier_inventory_returned';
      variants.countryRowsReturned--;
    } else {
      variants.records.pop();
      variants.returned--;
    }
    variants.partial = true;
    variants.state = 'partial_supplier_inventory_returned';
  }
  if (size() > MAX_INVENTORY_REPORT_BYTES) {
    report.state = 'unknown';
    report.reason = 'inventory_output_too_large';
    report.inventory = null;
  }
  return report;
}

function emptyReport(now, lookup) {
  return { checkedAt: new Date(now).toISOString(), provider: 'CJdropshipping', mode: 'read_only',
    lookup, state: 'unknown', reason: null, requests: { authentication: 0, product: 0 },
    product: null, credentialsPersisted: false, tokenPersistence: 'process_memory_only',
    limits: { productRequests: 1, pagination: 0, retries: 0, responseBytes: BODY_LIMIT,
      returnedImageUrls: MAX_IMAGE_URLS, returnedVariants: MAX_VARIANTS, returnedUrlBytes: MAX_URL_BYTES,
      writes: 0, imports: 0, purchases: 0, renders: 0 } };
}

function emptyInventoryReport(now, lookup) {
  return { checkedAt: new Date(now).toISOString(), provider: 'CJdropshipping', mode: 'read_only',
    lookup, state: 'unknown', reason: null, requests: { authentication: 0, inventory: 0 },
    inventory: null, credentialsPersisted: false, tokenPersistence: 'process_memory_only',
    limits: { inventoryRequests: 1, pagination: 0, retries: 0, responseBytes: BODY_LIMIT,
      reportBytes: MAX_INVENTORY_REPORT_BYTES, returnedVariants: MAX_VARIANTS,
      returnedCountriesPerVariant: MAX_COUNTRIES_PER_VARIANT,
      returnedCountryRows: MAX_INVENTORY_COUNTRY_ROWS,
      writes: 0, imports: 0, purchases: 0, renders: 0 } };
}

export function createCjReadOnlyClient({ env = process.env, fetchImpl = globalThis.fetch,
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)), now = () => Date.now() } = {}) {
  let cachedToken = null;
  let lastRequestAt = 0;
  let lastAuthenticationAt = null;
  let lastVerifiedReadAt = null;
  let lastProductRead = null;
  let lastVerifiedInventoryReadAt = null;
  let lastInventoryRead = null;
  let productRequestUsed = false;
  let inventoryRequestUsed = false;
  let invalidRequestSequence = false;
  let queue = Promise.resolve();
  const clock = () => { const value = Number(now()); return Number.isFinite(value) ? value : Date.now(); };
  const fingerprint = value => createHash('sha256').update(value).digest('hex');
  const keyState = () => {
    if (env.CJ_API_KEY === undefined || env.CJ_API_KEY === '') return { state: 'missing', key: null };
    return validSecret(env.CJ_API_KEY, 200) ? { state: 'bound_unverified', key: env.CJ_API_KEY,
      fingerprint: fingerprint(env.CJ_API_KEY) }
      : { state: 'invalid', key: null };
  };
  const pace = async () => {
    const current = clock();
    const delay = Math.max(0, lastRequestAt + REQUEST_GAP_MS - current);
    if (delay) await wait(delay);
    lastRequestAt = clock();
  };
  const request = async (url, init) => {
    await pace();
    try { return await fetchImpl(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) }); }
    catch (error) {
      if (error?.cause?.code === 'ERR_FR_REDIRECTION_FAILURE') throw new Error('redirect_rejected');
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw error;
      throw new Error('network_error');
    }
  };
  async function authenticate(report, binding) {
    const current = clock();
    if (cachedToken && cachedToken.keyFingerprint !== binding.fingerprint) cachedToken = null;
    if (cachedToken && cachedToken.expiresAt - TOKEN_SAFETY_MS > current) {
      return { accessToken: cachedToken.value, refreshToken: cachedToken.refreshToken, cached: true };
    }
    const apiKey = binding.key;
    report.requests.authentication++;
    let response;
    try {
      response = await request(AUTH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ apiKey }) });
    } catch (error) { report.reason = errorReason(error); return null; }
    if (response.status < 200 || response.status >= 300) {
      await discardResponseBody(response); report.reason = responseReason(response.status); return null;
    }
    let body;
    try { body = await boundedJson(response); }
    catch (error) { report.reason = errorReason(error); return null; }
    if (QUOTA.test(String(body?.message || ''))) { report.reason = 'quota'; return null; }
    if (body?.result !== true || Number(body?.code) !== 200 || !body.data || typeof body.data !== 'object') {
      report.reason = 'authentication_response_rejected'; return null;
    }
    const token = body.data.accessToken;
    const refresh = body.data.refreshToken;
    const expiresAt = Date.parse(body.data.accessTokenExpiryDate || '');
    if (!validSecret(token) || token === apiKey || !Number.isFinite(expiresAt) || expiresAt <= current + TOKEN_SAFETY_MS) {
      report.reason = 'authentication_token_invalid'; return null;
    }
    cachedToken = { keyFingerprint: binding.fingerprint, value: token,
      refreshToken: validSecret(refresh) ? refresh : null, expiresAt };
    lastAuthenticationAt = new Date(current).toISOString();
    return { accessToken: token, refreshToken: validSecret(refresh) ? refresh : null, cached: false };
  }
  async function readProduct(lookup) {
    const current = clock();
    const report = emptyReport(current, lookup);
    if (productRequestUsed) {
      report.reason = 'product_request_budget_exhausted';
      invalidRequestSequence = true;
      return report;
    }
    productRequestUsed = true;
    const binding = keyState();
    const finish = () => {
      const at = new Date(clock()).toISOString();
      const variants = report.product?.product?.variants;
      const completeVariants = variants?.state === 'supplier_metadata_returned'
        && variants.partial === false && Number.isInteger(variants.reported)
        && variants.reported > 0 && variants.reported === variants.returned
        && Array.isArray(variants.records) && variants.records.length === variants.reported;
      lastProductRead = { at, state: report.state === 'product_identity_verified' ? 'verified' : 'unknown',
        keyFingerprint: binding.fingerprint || null,
        pid: report.state === 'product_identity_verified' ? report.product?.product?.pid || null : null,
        inventoryEligible: report.state === 'product_identity_verified' && completeVariants,
        variantVids: report.state === 'product_identity_verified' && completeVariants
          ? variants.records.map(record => record.vid.toUpperCase()) : null };
      if (lastProductRead.state === 'verified') lastVerifiedReadAt = at;
      return report;
    };
    if (!validLookup(lookup)) { report.reason = 'invalid_lookup'; return finish(); }
    if (binding.state !== 'bound_unverified') { report.reason = `credential_binding_${binding.state}`; return finish(); }
    const auth = await authenticate(report, binding);
    if (!auth) return finish();
    const url = new URL(PRODUCT_URL);
    const [key, value] = Object.entries(lookup)[0];
    url.searchParams.set(key, value);
    report.requests.product++;
    let response;
    try { response = await request(url.href, { method: 'GET', headers: { Accept: 'application/json', 'CJ-Access-Token': auth.accessToken } }); }
    catch (error) { report.reason = errorReason(error); return finish(); }
    if (response.status < 200 || response.status >= 300) {
      await discardResponseBody(response); report.reason = responseReason(response.status); return finish();
    }
    let body;
    try { body = await boundedJson(response); }
    catch (error) { report.reason = errorReason(error); return finish(); }
    if (includesSecret(body, [binding.key, auth.accessToken, auth.refreshToken])) {
      report.reason = 'credential_echo_blocked'; return finish();
    }
    if (QUOTA.test(String(body?.message || ''))) { report.reason = 'quota'; return finish(); }
    if (body?.result !== true || Number(body?.code) !== 200) {
      report.reason = SOFT_CODES.get(Number(body?.code)) || 'api_response_rejected'; return finish();
    }
    const product = normaliseProduct(body.data, lookup);
    report.state = product.state;
    report.reason = product.reason || null;
    report.product = product.state === 'product_identity_verified' ? product : null;
    return finish();
  }
  async function readInventory(lookup) {
    const current = clock();
    const report = emptyInventoryReport(current, lookup);
    if (inventoryRequestUsed) {
      report.reason = 'inventory_request_budget_exhausted';
      invalidRequestSequence = true;
      return report;
    }
    inventoryRequestUsed = true;
    const binding = keyState();
    const finish = () => {
      enforceInventoryReportLimit(report);
      const at = new Date(clock()).toISOString();
      lastInventoryRead = { at, state: report.state === 'inventory_returned' ? 'returned' : 'unknown',
        keyFingerprint: binding.fingerprint || null };
      if (lastInventoryRead.state === 'returned') lastVerifiedInventoryReadAt = at;
      return report;
    };
    if (!validPidLookup(lookup)) { report.reason = 'invalid_pid_lookup'; return finish(); }
    if (binding.state !== 'bound_unverified') { report.reason = `credential_binding_${binding.state}`; return finish(); }
    if (invalidRequestSequence || !lastProductRead || lastProductRead.state !== 'verified'
      || lastProductRead.keyFingerprint !== binding.fingerprint
      || lastProductRead.pid !== lookup.pid || lastProductRead.inventoryEligible !== true) {
      report.reason = 'product_prerequisite_not_verified'; return finish();
    }
    const auth = await authenticate(report, binding);
    if (!auth) return finish();
    const url = new URL(INVENTORY_URL);
    url.searchParams.set('pid', lookup.pid);
    report.requests.inventory++;
    let response;
    try { response = await request(url.href, { method: 'GET', headers: {
      Accept: 'application/json', 'CJ-Access-Token': auth.accessToken } }); }
    catch (error) { report.reason = errorReason(error); return finish(); }
    if (response.status < 200 || response.status >= 300) {
      await discardResponseBody(response); report.reason = responseReason(response.status); return finish();
    }
    let body;
    try { body = await boundedJson(response); }
    catch (error) { report.reason = errorReason(error); return finish(); }
    if (includesSecret(body, [binding.key, auth.accessToken, auth.refreshToken])) {
      report.reason = 'credential_echo_blocked'; return finish();
    }
    if (QUOTA.test(String(body?.message || ''))) { report.reason = 'quota'; return finish(); }
    if (body?.success !== true || body?.code !== 200) {
      report.reason = 'inventory_api_response_rejected'; return finish();
    }
    const normalised = normaliseInventory(body.data, body.pointsInfo, lookup.pid);
    if (normalised.state === 'inventory_returned'
      && !inventoryVariantSetMatches(lastProductRead.variantVids, normalised.inventory?.variants)) {
      report.reason = 'inventory_variant_set_mismatch';
      return finish();
    }
    report.state = normalised.state;
    report.reason = normalised.reason || null;
    report.inventory = normalised.state === 'inventory_returned' ? normalised.inventory : null;
    return finish();
  }
  return {
    status() {
      const binding = keyState();
      const cached = !!(cachedToken && cachedToken.keyFingerprint === binding.fingerprint
        && cachedToken.expiresAt - TOKEN_SAFETY_MS > clock());
      const productMatchesBinding = !!(lastProductRead && lastProductRead.keyFingerprint === binding.fingerprint);
      const inventoryMatchesBinding = !!(lastInventoryRead && lastInventoryRead.keyFingerprint === binding.fingerprint);
      const currentVerified = !!(!invalidRequestSequence
        && productMatchesBinding && lastProductRead.state === 'verified');
      return { checkedAt: new Date(clock()).toISOString(), provider: 'CJdropshipping', mode: 'read_only',
        credentialBinding: binding.state, connection: currentVerified ? 'verified_by_product_read' : 'unknown_until_product_read',
        accessTokenCachedInProcess: cached, lastAuthenticationAt, lastVerifiedReadAt,
        lastProductReadAt: lastProductRead?.at || null,
        lastProductReadState: productMatchesBinding ? lastProductRead.state : 'not_attempted',
        lastInventoryReadAt: lastInventoryRead?.at || null,
        lastInventoryReadState: inventoryMatchesBinding ? lastInventoryRead.state : 'not_attempted',
        lastVerifiedInventoryReadAt,
        requestBudget: { productRemaining: productRequestUsed ? 0 : 1,
          inventoryRemaining: inventoryRequestUsed ? 0 : 1 },
        requestSequenceValid: !invalidRequestSequence,
        authenticationContract: { requestField: 'apiKey', documentation: DOC_URL },
        allowedEndpoint: PRODUCT_URL, allowedInventoryEndpoint: INVENTORY_URL, pagination: false,
        blockedOperations: ['catalogue_search', 'imports', 'orders', 'purchases', 'renders', 'shop_writes'],
        credentialsPersisted: false };
    },
    readProduct(lookup) {
      const run = queue.then(() => readProduct(lookup), () => readProduct(lookup));
      queue = run.then(() => undefined, () => undefined);
      return run;
    },
    readInventory(lookup) {
      const run = queue.then(() => readInventory(lookup), () => readInventory(lookup));
      queue = run.then(() => undefined, () => undefined);
      return run;
    }
  };
}

export const CJ_READ_LIMITS = Object.freeze({ BODY_LIMIT, TIMEOUT_MS, REQUEST_GAP_MS,
  MAX_VARIANTS, MAX_COUNTRIES_PER_VARIANT, MAX_INVENTORY_COUNTRY_ROWS, MAX_INVENTORY_REPORT_BYTES });
export const isValidCjLookup = validLookup;
export const isValidCjPidLookup = validPidLookup;
export { isValidCjPid };
