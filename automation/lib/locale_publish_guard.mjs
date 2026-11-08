import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const REQUIRED_TRANSLATION_SCOPES = Object.freeze([
  'PRODUCT',
  'COLLECTION',
  'PAGE',
  'ARTICLE',
  'BLOG',
  'THEME',
]);

const SHA256 = /^[0-9a-f]{64}$/i;

const normaliseDomain = value => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/\/.*$/, '');

function guardError(message) {
  const error = new Error(`TRANSLATION_COVERAGE_BLOCKED: ${message}`);
  error.code = 'TRANSLATION_COVERAGE_BLOCKED';
  return error;
}

/**
 * Laedt einen unveraenderlich gebundenen, frischen Vollkatalog-Beleg.
 * Eine Stichprobe reicht absichtlich nicht: sie beweist keine publizierbare Locale.
 */
export function loadTranslationCoverage({
  file,
  expectedSha256,
  shopDomain,
  now = Date.now(),
  maxAgeHours = 24,
  readFile = readFileSync,
} = {}) {
  if (!file) throw guardError('TRANSLATION_COVERAGE_FILE fehlt');
  if (!SHA256.test(String(expectedSha256 || ''))) {
    throw guardError('TRANSLATION_COVERAGE_SHA256 fehlt oder ist ungueltig');
  }
  let raw;
  try { raw = readFile(file); }
  catch { throw guardError('Belegdatei ist nicht lesbar'); }
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw));
  const actualSha256 = createHash('sha256').update(bytes).digest('hex');
  if (actualSha256 !== String(expectedSha256).toLowerCase()) {
    throw guardError('Belegdatei stimmt nicht mit TRANSLATION_COVERAGE_SHA256 ueberein');
  }

  let evidence;
  try { evidence = JSON.parse(bytes.toString('utf8')); }
  catch { throw guardError('Belegdatei ist kein gueltiges JSON'); }
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    throw guardError('Beleg muss ein JSON-Objekt sein');
  }
  if (evidence.version !== 1) throw guardError('Belegversion ist nicht 1');
  if (normaliseDomain(evidence.shopDomain) !== normaliseDomain(shopDomain)) {
    throw guardError('Beleg gehoert nicht zum verbundenen Shop');
  }
  if (String(evidence.sourceLocale || '').toLowerCase() !== 'de') {
    throw guardError('Quellsprache muss de sein');
  }
  if (!SHA256.test(String(evidence.sourceSnapshotSha256 || ''))) {
    throw guardError('sourceSnapshotSha256 fehlt oder ist ungueltig');
  }
  const generatedAt = Date.parse(String(evidence.generatedAt || ''));
  const maxAgeMs = Number(maxAgeHours) * 60 * 60 * 1000;
  if (!Number.isFinite(generatedAt) || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
    throw guardError('generatedAt oder maximale Belegalter ist ungueltig');
  }
  if (generatedAt > Number(now) + 5 * 60 * 1000) throw guardError('Beleg liegt in der Zukunft');
  if (Number(now) - generatedAt > maxAgeMs) throw guardError('Beleg ist zu alt');
  if (!evidence.locales || typeof evidence.locales !== 'object' || Array.isArray(evidence.locales)) {
    throw guardError('locales fehlt');
  }
  return { evidence, sha256: actualSha256 };
}

/** Prueft genau eine Zielsprache gegen einen vollstaendigen Ressourcenbeleg. */
export function translationCoverageForLocale(evidence, locale) {
  const key = String(locale || '').trim().toLowerCase();
  const item = evidence?.locales?.[key];
  if (!item) return { ok: false, reason: `kein exakter Beleg fuer ${key || '(leer)'}` };
  if (item.coverageKind !== 'complete_catalog') {
    return { ok: false, reason: `${key}: coverageKind ist nicht complete_catalog` };
  }
  if (item.targetLanguageVerified !== true) {
    return { ok: false, reason: `${key}: Zielsprache wurde nicht inhaltlich verifiziert` };
  }
  if (!item.scopes || typeof item.scopes !== 'object' || Array.isArray(item.scopes)) {
    return { ok: false, reason: `${key}: scopes fehlt` };
  }
  for (const scope of REQUIRED_TRANSLATION_SCOPES) {
    const row = item.scopes[scope];
    if (!row || !Number.isInteger(row.total) || row.total < 0 ||
        !Number.isInteger(row.translated) || row.translated < 0 ||
        !Number.isInteger(row.missing) || row.missing < 0) {
      return { ok: false, reason: `${key}/${scope}: Zaehler fehlen oder sind ungueltig` };
    }
    if (row.translated !== row.total || row.missing !== 0 || row.complete !== true) {
      return { ok: false, reason: `${key}/${scope}: Uebersetzung ist unvollstaendig` };
    }
  }
  if (item.scopes.PRODUCT.total < 1) {
    return { ok: false, reason: `${key}/PRODUCT: leerer Katalog ist kein Abdeckungsbeleg` };
  }
  return { ok: true, reason: `${key}: vollstaendige Uebersetzungsabdeckung belegt` };
}

/** Nur die ausdrueckliche Doppel-Freigabe verlaesst den Trockenlauf. */
export function localeWriteEnabled(env = process.env) {
  return env.LIVE === '1' && env.DRY_RUN === '0';
}
