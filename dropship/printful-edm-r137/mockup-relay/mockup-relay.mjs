import { createHash } from 'node:crypto';

const API_ORIGIN = 'https://api.printful.com';
const FIRST_POLL_MS = 10_000;
const NEXT_POLL_MS = 3_000;
const POLL_DEADLINE_MS = 120_000;
const MAX_POLLS = 30;
const OWN_ORIGINS = new Set(['https://luxestyle.ch', 'https://www.luxestyle.ch']);
const REQUEST_ID = /^luxe-mockup-[a-z0-9][a-z0-9_-]{7,95}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const PLACEMENT = /^[a-z][a-z0-9_-]{0,63}$/;
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const nonempty = value => typeof value === 'string' && value.length > 0;
const validHandle = value => typeof value === 'string' && value.length >= 3 && value.length <= 255 &&
  value === value.normalize('NFC') && !/[\u0000-\u0020\u007f/%\\?#]/u.test(value) &&
  !value.startsWith('.') && !value.endsWith('.');

export class RelayError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'RelayError';
    this.code = code;
    this.status = status;
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function checkedUrl(raw, allowedHosts, code = 'DESIGN_URL_INVALID') {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 4096) throw new RelayError(code);
  let parsed;
  try { parsed = new URL(raw); } catch { throw new RelayError(code); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
      (parsed.port && parsed.port !== '443') || !allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw new RelayError(code);
  }
  return parsed.href;
}

export class MemoryCheckpointStore {
  #records = new Map();
  #dedupe = new Map();
  reserve(requestId, dedupeKey, initial) {
    const existing = this.#records.get(requestId);
    if (existing) return { created: false, record: structuredClone(existing) };
    const duplicateId = this.#dedupe.get(dedupeKey);
    if (duplicateId) return { created: false, duplicate: true,
      record: structuredClone(this.#records.get(duplicateId)) };
    this.#records.set(requestId, structuredClone(initial));
    this.#dedupe.set(dedupeKey, requestId);
    return { created: true, record: structuredClone(initial) };
  }
  get(requestId) {
    const record = this.#records.get(requestId);
    return record ? structuredClone(record) : null;
  }
  transition(requestId, expectedStates, patch) {
    const record = this.#records.get(requestId);
    if (!record || !expectedStates.includes(record.state)) return null;
    const next = { ...record, ...structuredClone(patch) };
    this.#records.set(requestId, next);
    return structuredClone(next);
  }
}

export class WindowLimiter {
  #global = [];
  #subjects = new Map();
  constructor({ globalMax = 6, globalWindowMs = 60_000, subjectMax = 1, subjectWindowMs = 30_000 } = {}) {
    if (![globalMax, globalWindowMs, subjectMax, subjectWindowMs].every(positive)) {
      throw new RelayError('LIMIT_CONFIG_INVALID', 500);
    }
    Object.assign(this, { globalMax, globalWindowMs, subjectMax, subjectWindowMs });
  }
  take(subjectId, now) {
    this.#global = this.#global.filter(ts => ts > now - this.globalWindowMs);
    const subject = (this.#subjects.get(subjectId) ?? []).filter(ts => ts > now - this.subjectWindowMs);
    if (this.#global.length >= this.globalMax) throw new RelayError('LIMIT_GLOBAL', 429);
    if (subject.length >= this.subjectMax) throw new RelayError('LIMIT_SESSION', 429);
    this.#global.push(now);
    subject.push(now);
    this.#subjects.set(subjectId, subject);
  }
}

function checkedPosition(position, area) {
  if (!position || !positive(position.area_width) || !positive(position.area_height) ||
      !positive(position.width) || !positive(position.height) ||
      !nonnegative(position.top) || !nonnegative(position.left) ||
      position.area_width !== area.width || position.area_height !== area.height ||
      position.left + position.width > position.area_width || position.top + position.height > position.area_height) {
    throw new RelayError('PRINT_POSITION_INVALID');
  }
  return {
    area_width: position.area_width, area_height: position.area_height,
    width: position.width, height: position.height, top: position.top, left: position.left,
  };
}

function checkedRule(rule, handle, shopifyVariantId) {
  if (!rule || rule.provider !== 'printful' || rule.mockupEligible !== true ||
      rule.shopifyHandle !== handle || rule.shopifyVariantId !== shopifyVariantId ||
      !positive(rule.printfulProductId) || !positive(rule.printfulVariantId) ||
      !Array.isArray(rule.placements) || rule.placements.length === 0) {
    throw new RelayError('PRODUCT_MAPPING_BLOCKED', 404);
  }
  const placements = new Map();
  for (const area of rule.placements) {
    if (!area || !PLACEMENT.test(area.id ?? '') || placements.has(area.id) ||
        !positive(area.width) || !positive(area.height)) {
      throw new RelayError('PRODUCT_MAPPING_INVALID', 500);
    }
    placements.set(area.id, Object.freeze({ id: area.id, width: area.width, height: area.height }));
  }
  return Object.freeze({ printfulProductId: rule.printfulProductId,
    printfulVariantId: rule.printfulVariantId, placements });
}

async function checkedCredential(credentialProvider, expectedStoreId) {
  const credential = await credentialProvider();
  if (!credential || typeof credential.accessToken !== 'string' ||
      credential.accessToken.length < 8 || credential.accessToken.length > 4096 ||
      /[\r\n]/.test(credential.accessToken) || credential.storeId !== expectedStoreId) {
    throw new Error('CREDENTIAL_IDENTITY_MISMATCH');
  }
  return credential.accessToken;
}

const resultOf = response => response?.data?.result ?? response?.result ?? null;

function taskKeyOf(response) {
  const key = resultOf(response)?.task_key;
  if (!nonempty(key) || !/^[A-Za-z0-9_-]{8,200}$/.test(key)) throw new RelayError('UPSTREAM_RESPONSE_INVALID', 502);
  return key;
}

function publicStatus(record) {
  const base = { requestId: record.requestId, status: record.state, checkoutReady: false };
  if (record.state === 'submitted') return { ...base, nextPollAt: record.nextPollAt };
  if (record.state === 'completed-temporary') {
    return { ...base, temporary: true, persistenceRequired: true, preview: record.preview };
  }
  if (record.state === 'completed') {
    return { ...base, temporary: false, persistenceRequired: false, preview: record.preview };
  }
  return base;
}

function readPreview(result, allowedHosts, expectedVariantId, expectedPlacements) {
  if (!positive(expectedVariantId) || !Array.isArray(expectedPlacements) ||
      expectedPlacements.length === 0 || new Set(expectedPlacements).size !== expectedPlacements.length ||
      !Array.isArray(result?.mockups) || result.mockups.length === 0 || result.mockups.length > 100) {
    throw new RelayError('UPSTREAM_MOCKUPS_INVALID', 502);
  }
  const allowedPlacements = new Set(expectedPlacements);
  const returnedPlacements = new Set();
  const mockups = [];
  for (const item of result?.mockups ?? []) {
    if (!item || !allowedPlacements.has(item.placement) ||
        !Array.isArray(item.variant_ids) || item.variant_ids.length !== 1 ||
        item.variant_ids[0] !== expectedVariantId ||
        (item.extra !== undefined && (!Array.isArray(item.extra) || item.extra.length > 20))) {
      throw new RelayError('UPSTREAM_MOCKUPS_INVALID', 502);
    }
    returnedPlacements.add(item.placement);
    let itemHasImage = false;
    if (nonempty(item?.mockup_url)) {
      itemHasImage = true;
      mockups.push({ placement: item.placement, variantIds: [expectedVariantId],
        url: checkedUrl(item.mockup_url, allowedHosts, 'UPSTREAM_URL_INVALID') });
    }
    for (const extra of item?.extra ?? []) {
      if (nonempty(extra?.url)) {
        itemHasImage = true;
        mockups.push({ placement: item.placement, variantIds: [expectedVariantId],
          title: nonempty(extra.title) ? extra.title : null,
          url: checkedUrl(extra.url, allowedHosts, 'UPSTREAM_URL_INVALID') });
      }
    }
    if (!itemHasImage) throw new RelayError('UPSTREAM_MOCKUPS_INVALID', 502);
  }
  if (mockups.length === 0 || returnedPlacements.size !== allowedPlacements.size ||
      expectedPlacements.some(placement => !returnedPlacements.has(placement))) {
    throw new RelayError('UPSTREAM_MOCKUPS_MISSING', 502);
  }
  return { mockups, sourceTemporary: true, sourceExpiresAt: 'unknown' };
}

export function createMockupRelay({ resolveVariant, allowedOrigins = ['https://luxestyle.ch'],
  allowedDesignHosts = ['cdn.shopify.com', 'res.cloudinary.com'],
  allowedUpstreamHosts = ['files.cdn.printful.com'], transport, credentialProvider,
  allowedPersistentHosts = ['cdn.shopify.com'],
  expectedStoreId = 18288470, verifyUploadReceipt,
  store = new MemoryCheckpointStore(), limiter = new WindowLimiter(),
  pollLimiter = new WindowLimiter({ globalMax: 60, subjectMax: 20, subjectWindowMs: 60_000 }),
  persistPreview = null,
  clock = () => Date.now() } = {}) {
  const origins = new Set(allowedOrigins);
  const designHosts = new Set(allowedDesignHosts.map(host => host.toLowerCase()));
  const upstreamHosts = new Set(allowedUpstreamHosts.map(host => host.toLowerCase()));
  const persistentHosts = new Set(allowedPersistentHosts.map(host => host.toLowerCase()));
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0 ||
      allowedOrigins.some(origin => !OWN_ORIGINS.has(origin))) {
    throw new RelayError('ORIGIN_CONFIG_INVALID', 500);
  }
  if (typeof resolveVariant !== 'function' || typeof transport !== 'function' ||
      typeof credentialProvider !== 'function' || typeof verifyUploadReceipt !== 'function' ||
      !positive(expectedStoreId)) {
    throw new RelayError('SERVER_ADAPTER_MISSING', 500);
  }
  if (persistPreview !== null && typeof persistPreview !== 'function') {
    throw new RelayError('PERSISTENCE_ADAPTER_INVALID', 500);
  }

  function checkContext({ requestId, subjectId, origin }) {
    if (!REQUEST_ID.test(requestId ?? '')) throw new RelayError('REQUEST_ID_INVALID');
    if (!nonempty(subjectId) || subjectId.length > 128) throw new RelayError('SESSION_INVALID', 401);
    if (!origins.has(origin)) throw new RelayError('ORIGIN_BLOCKED', 403);
  }

  async function create({ requestId, subjectId, origin, handle, shopifyVariantId, files }) {
    checkContext({ requestId, subjectId, origin });
    if (!validHandle(handle) || (!positive(shopifyVariantId) && !nonempty(shopifyVariantId))) {
      throw new RelayError('PRODUCT_MAPPING_BLOCKED', 404);
    }
    let resolved;
    try { resolved = await resolveVariant({ shopifyHandle: handle, shopifyVariantId }); }
    catch { throw new RelayError('PRODUCT_MAPPING_UNAVAILABLE', 503); }
    const mapping = checkedRule(resolved, handle, shopifyVariantId);
    if (!Array.isArray(files) || files.length === 0 || files.length > mapping.placements.size) {
      throw new RelayError('PRINT_FILES_INVALID');
    }
    const seen = new Set();
    const safeFiles = [];
    for (const file of files) {
      const area = mapping.placements.get(file?.placement);
      if (!area || seen.has(file.placement)) throw new RelayError('PLACEMENT_BLOCKED');
      if (!SHA256.test(file.sha256 ?? '') || !nonempty(file.uploadReceipt) || file.uploadReceipt.length > 2048) {
        throw new RelayError('UPLOAD_RECEIPT_INVALID');
      }
      seen.add(file.placement);
      const imageUrl = checkedUrl(file.imageUrl, designHosts);
      let verified;
      try { verified = await verifyUploadReceipt({ subjectId, origin, imageUrl,
        sha256: file.sha256, uploadReceipt: file.uploadReceipt }); }
      catch { throw new RelayError('UPLOAD_RECEIPT_INVALID', 403); }
      if (!verified || verified.imageUrl !== imageUrl || verified.sha256 !== file.sha256) {
        throw new RelayError('UPLOAD_RECEIPT_INVALID', 403);
      }
      safeFiles.push({ placement: file.placement, image_url: imageUrl,
        position: checkedPosition(file.position, area), sha256: file.sha256 });
    }
    safeFiles.sort((a, b) => a.placement.localeCompare(b.placement));
    const body = { variant_ids: [mapping.printfulVariantId], format: 'jpg', width: 1000,
      files: safeFiles.map(({ sha256: _sha256, ...file }) => file) };
    const digest = fingerprint({ subjectId, handle, shopifyVariantId,
      printfulProductId: mapping.printfulProductId, printfulVariantId: mapping.printfulVariantId,
      files: safeFiles });
    const now = clock();
    const reserved = store.reserve(requestId, digest, { requestId, subjectId, origin, fingerprint: digest,
      state: 'reserved', createdAt: now, printfulProductId: mapping.printfulProductId,
      printfulVariantId: mapping.printfulVariantId,
      requestedPlacements: safeFiles.map(file => file.placement) });
    if (!reserved.created) {
      const old = reserved.record;
      if (old.subjectId !== subjectId || old.origin !== origin) throw new RelayError('REQUEST_FOREIGN', 403);
      if (!reserved.duplicate && old.fingerprint !== digest) throw new RelayError('REQUEST_CONFLICT', 409);
      if (reserved.duplicate && old.subjectId !== subjectId) throw new RelayError('REQUEST_FOREIGN', 403);
      if (['unknown', 'inflight', 'polling'].includes(old.state)) throw new RelayError('REQUEST_UNCERTAIN', 409);
      return publicStatus(old);
    }
    try { limiter.take(subjectId, now); } catch (error) {
      store.transition(requestId, ['reserved'], { state: 'rejected', errorCode: error.code });
      throw error;
    }
    store.transition(requestId, ['reserved'], { state: 'inflight' });
    try {
      const token = await checkedCredential(credentialProvider, expectedStoreId);
      const response = await transport({ method: 'POST',
        url: `${API_ORIGIN}/mockup-generator/create-task/${mapping.printfulProductId}`,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
          'X-PF-Store-Id': String(expectedStoreId) }, body });
      if (!Number.isInteger(response?.status) || response.status < 200 || response.status >= 300) {
        throw new Error('UPSTREAM_HTTP');
      }
      const taskKey = taskKeyOf(response);
      return publicStatus(store.transition(requestId, ['inflight'], {
        state: 'submitted', taskKey, nextPollAt: clock() + FIRST_POLL_MS,
        pollDeadlineAt: clock() + POLL_DEADLINE_MS, pollCount: 0,
      }));
    } catch {
      store.transition(requestId, ['inflight'], { state: 'unknown', errorCode: 'CREATE_UNCERTAIN' });
      throw new RelayError('CREATE_UNCERTAIN', 502);
    }
  }

  async function poll({ requestId, subjectId, origin }) {
    checkContext({ requestId, subjectId, origin });
    const record = store.get(requestId);
    if (!record) throw new RelayError('REQUEST_UNKNOWN', 404);
    if (record.subjectId !== subjectId || record.origin !== origin) throw new RelayError('REQUEST_FOREIGN', 403);
    if (['completed', 'completed-temporary'].includes(record.state)) return publicStatus(record);
    if (record.state !== 'submitted') throw new RelayError('REQUEST_UNCERTAIN', 409);
    const now = clock();
    if (now > record.pollDeadlineAt || record.pollCount >= MAX_POLLS) {
      store.transition(requestId, ['submitted'], { state: 'expired', errorCode: 'POLL_DEADLINE' });
      throw new RelayError('POLL_DEADLINE', 410);
    }
    if (now < record.nextPollAt) return publicStatus(record);
    pollLimiter.take(subjectId, now);
    if (!store.transition(requestId, ['submitted'], { state: 'polling' })) throw new RelayError('REQUEST_UNCERTAIN', 409);
    try {
      const token = await checkedCredential(credentialProvider, expectedStoreId);
      const response = await transport({ method: 'GET',
        url: `${API_ORIGIN}/mockup-generator/task?task_key=${encodeURIComponent(record.taskKey)}`,
        headers: { Authorization: `Bearer ${token}`, 'X-PF-Store-Id': String(expectedStoreId) } });
      if (!Number.isInteger(response?.status) || response.status < 200 || response.status >= 300) {
        throw new Error('UPSTREAM_HTTP');
      }
      const result = resultOf(response);
      if (result?.status === 'pending') {
        return publicStatus(store.transition(requestId, ['polling'], {
          state: 'submitted', nextPollAt: clock() + NEXT_POLL_MS, pollCount: record.pollCount + 1,
        }));
      }
      if (result?.status !== 'completed') throw new Error('UPSTREAM_STATUS');
      const temporary = readPreview(result, upstreamHosts,
        record.printfulVariantId, record.requestedPlacements);
      if (!persistPreview) {
        return publicStatus(store.transition(requestId, ['polling'], {
          state: 'completed-temporary', preview: temporary,
        }));
      }
      const persisted = await persistPreview({ requestId, preview: temporary });
      if (!persisted || !Array.isArray(persisted.mockups) || persisted.mockups.length === 0) {
        throw new Error('PERSISTENCE_INVALID');
      }
      const durableMockups = persisted.mockups.map(item => ({ ...item,
        url: checkedUrl(item?.url, persistentHosts, 'PERSISTENCE_URL_INVALID') }));
      return publicStatus(store.transition(requestId, ['polling'], {
        state: 'completed', preview: { mockups: durableMockups, sourceTemporary: false },
      }));
    } catch {
      store.transition(requestId, ['polling'], { state: 'unknown', errorCode: 'POLL_UNCERTAIN' });
      throw new RelayError('POLL_UNCERTAIN', 502);
    }
  }

  return Object.freeze({ create, poll });
}

export const MOCKUP_RELAY_CONTRACT = Object.freeze({ apiOrigin: API_ORIGIN,
  firstPollAfterMs: FIRST_POLL_MS, laterPollAfterMs: NEXT_POLL_MS,
  pollDeadlineMs: POLL_DEADLINE_MS, maxPolls: MAX_POLLS,
  productionStoreRequired: true, upstreamUrlsTemporary: true });
