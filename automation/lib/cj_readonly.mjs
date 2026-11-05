import { createHash } from 'node:crypto';

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const AUTH_URL = `${BASE}/authentication/getAccessToken`;
const PRODUCT_URL = `${BASE}/product/query`;
const DOC_URL = 'https://developers.cjdropshipping.com/en/api/api2/api/auth.html';
const BODY_LIMIT = 2 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const REQUEST_GAP_MS = 1_100;
const TOKEN_SAFETY_MS = 5 * 60 * 1000;
const MAX_IMAGE_URLS = 25;
const MAX_VARIANTS = 50;
const MAX_URL_BYTES = 1024;
const SOFT_CODES = new Map([[1602001, 'product_not_found'], [1602002, 'product_removed'], [1602003, 'variant_removed']]);
const QUOTA = /insufficient api points|daily.*(?:quota|limit)|points.*exhaust/i;

function validSecret(value, max = 1024) {
  return typeof value === 'string' && value.length >= 16 && value.length <= max
    && value === value.trim() && /^[\x21-\x7e]+$/.test(value);
}

function validLookup(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return false;
  const keys = Object.keys(args);
  if (keys.length !== 1) return false;
  if (keys[0] === 'pid') return typeof args.pid === 'string' && /^[0-9]{6,40}$/.test(args.pid);
  return keys[0] === 'productSku' && typeof args.productSku === 'string'
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(args.productSku);
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
  for (const variant of value.slice(0, MAX_VARIANTS)) {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)
      || !validIdentity(variant.vid, 100)
      || !validIdentity(variant.pid, 40) || variant.pid !== pid
      || !validIdentity(variant.variantSku, 200)) {
      return { state: 'unknown', reported: value.length, returned: 0, partial: false, records: null,
        reason: 'variant_identity_missing_or_inconsistent' };
    }
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
  if (typeof data.pid !== 'string' || !/^[0-9]{6,40}$/.test(data.pid)) return { state: 'unknown', reason: 'missing_or_invalid_pid' };
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

function emptyReport(now, lookup) {
  return { checkedAt: new Date(now).toISOString(), provider: 'CJdropshipping', mode: 'read_only',
    lookup, state: 'unknown', reason: null, requests: { authentication: 0, product: 0 },
    product: null, credentialsPersisted: false, tokenPersistence: 'process_memory_only',
    limits: { productRequests: 1, pagination: 0, retries: 0, responseBytes: BODY_LIMIT,
      returnedImageUrls: MAX_IMAGE_URLS, returnedVariants: MAX_VARIANTS, returnedUrlBytes: MAX_URL_BYTES,
      writes: 0, imports: 0, purchases: 0, renders: 0 } };
}

export function createCjReadOnlyClient({ env = process.env, fetchImpl = globalThis.fetch,
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)), now = () => Date.now() } = {}) {
  let cachedToken = null;
  let lastRequestAt = 0;
  let lastAuthenticationAt = null;
  let lastVerifiedReadAt = null;
  let lastProductRead = null;
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
    const binding = keyState();
    const finish = () => {
      const at = new Date(clock()).toISOString();
      lastProductRead = { at, state: report.state === 'product_identity_verified' ? 'verified' : 'unknown',
        keyFingerprint: binding.fingerprint || null };
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
  return {
    status() {
      const binding = keyState();
      const cached = !!(cachedToken && cachedToken.keyFingerprint === binding.fingerprint
        && cachedToken.expiresAt - TOKEN_SAFETY_MS > clock());
      const currentVerified = !!(lastProductRead && lastProductRead.state === 'verified'
        && lastProductRead.keyFingerprint === binding.fingerprint);
      return { checkedAt: new Date(clock()).toISOString(), provider: 'CJdropshipping', mode: 'read_only',
        credentialBinding: binding.state, connection: currentVerified ? 'verified_by_product_read' : 'unknown_until_product_read',
        accessTokenCachedInProcess: cached, lastAuthenticationAt, lastVerifiedReadAt,
        lastProductReadAt: lastProductRead?.at || null, lastProductReadState: lastProductRead?.state || 'not_attempted',
        authenticationContract: { requestField: 'apiKey', documentation: DOC_URL },
        allowedEndpoint: PRODUCT_URL, pagination: false,
        blockedOperations: ['catalogue_search', 'imports', 'orders', 'purchases', 'renders', 'shop_writes'],
        credentialsPersisted: false };
    },
    readProduct(lookup) {
      const run = queue.then(() => readProduct(lookup), () => readProduct(lookup));
      queue = run.then(() => undefined, () => undefined);
      return run;
    }
  };
}

export const CJ_READ_LIMITS = Object.freeze({ BODY_LIMIT, TIMEOUT_MS, REQUEST_GAP_MS });
export const isValidCjLookup = validLookup;
