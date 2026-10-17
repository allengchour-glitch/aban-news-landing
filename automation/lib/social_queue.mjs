import { isIP } from 'node:net';

export class QueueInputError extends Error {
  constructor(message, row) {
    super(`Social-Queue${row ? `, Zeile ${row}` : ''}: ${message}`);
    this.name = 'QueueInputError';
  }
}

// Parse the entire file before any row can reach a publisher. In particular, an
// unterminated quoted field must not swallow subsequent rows or still be sent.
function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', state = 'start';
  const finishField = () => { row.push(field); field = ''; state = 'start'; };
  const finishRow = () => {
    finishField();
    if (!(row.length === 1 && row[0].trim() === '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (state === 'quoted') {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') state = 'closed';
      else field += char;
      continue;
    }
    if (char === ',') { finishField(); continue; }
    if (char === '\r' || char === '\n') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      finishRow(); continue;
    }
    if (state === 'closed') throw new QueueInputError('Zeichen nach geschlossenem CSV-Feld', rows.length + 1);
    if (char === '"') {
      if (state !== 'start') throw new QueueInputError('Anführungszeichen im unquotierten CSV-Feld', rows.length + 1);
      state = 'quoted';
    } else { field += char; state = 'plain'; }
  }
  if (state === 'quoted') throw new QueueInputError('CSV-Anführungszeichen nicht geschlossen', rows.length + 1);
  if (row.length || field.length || state === 'closed') finishRow();
  return rows;
}

export function readSocialQueue(text, requiredColumns) {
  const rows = parseCsv(text);
  if (!rows.length) throw new QueueInputError('Kopfzeile fehlt');
  const header = rows[0].map(name => name.trim());
  rows[0] = header;
  if (header.some(name => !name) || new Set(header).size !== header.length) {
    throw new QueueInputError('leere oder doppelte Spaltennamen');
  }
  if (requiredColumns.some(name => !header.includes(name))) throw new QueueInputError('erforderliche Spalten fehlen');
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  const ids = new Set();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length !== header.length) throw new QueueInputError('Feldanzahl passt nicht zur Kopfzeile', i + 1);
    const id = row[index.id]?.trim();
    if (!id) throw new QueueInputError('ID fehlt', i + 1);
    if (ids.has(id)) throw new QueueInputError('ID doppelt vorhanden', i + 1);
    ids.add(id);
  }
  return { rows, header, index };
}

export function parseRunLimit(value, defaultValue) {
  if (value === undefined || value === '') return defaultValue;
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
    throw new QueueInputError('MAX_PER_RUN muss eine ganze Zahl ab 0 sein');
  }
  return Number(value);
}

const METRICOOL_NETWORKS = new Set(['instagram', 'facebook', 'threads', 'tiktok', 'youtube', 'pinterest']);
const META_NAMES = { instagram:'instagram', ig:'instagram', facebook:'facebook', fb:'facebook', threads:'threads' };

export function parseNetworks(value, { mode, row, allowEmpty = false } = {}) {
  const tokens = String(value || '').trim().toLowerCase().split(/[;,\s]+/).filter(Boolean);
  if (!tokens.length) {
    if (allowEmpty && mode === 'meta') return ['instagram', 'facebook', 'threads'];
    throw new QueueInputError('Zielkanal fehlt', row);
  }
  const result = [];
  for (const token of tokens) {
    const network = mode === 'meta' ? (Object.hasOwn(META_NAMES, token) ? META_NAMES[token] : null)
      : METRICOOL_NETWORKS.has(token) ? token : null;
    if (!network) throw new QueueInputError('nicht unterstützter Zielkanal', row);
    if (result.includes(network)) throw new QueueInputError('Zielkanal doppelt vorhanden', row);
    result.push(network);
  }
  return result;
}

function nonPublicHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || !host.includes('.') && !isIP(host)) return true;
  if (isIP(host) === 4) {
    const [a, b] = host.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 ||
      a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127;
  }
  if (isIP(host) === 6) return host === '::' || host === '::1' || /^(?:f[cd]|fe[89ab]|ff|::ffff:)/i.test(host);
  return host.length > 253 || host.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}

export function validateMediaUrl(value, row) {
  const text = String(value || '').trim();
  let url;
  try { url = new URL(text); } catch { throw new QueueInputError('gültige HTTPS-Medienadresse fehlt', row); }
  if (url.protocol !== 'https:' || url.username || url.password || /[\u0000-\u0020\u007f\\]/.test(text) || nonPublicHost(url.hostname)) {
    throw new QueueInputError('Medienadresse benötigt HTTPS und einen öffentlichen Host ohne Zugangsdaten', row);
  }
  // This is syntax validation. DNS, availability, media type and product identity
  // still require the separate media review; a URL suffix cannot prove a video.
  return text;
}

const formatters = new Map();
export function validateTimeZone(value, row) {
  const zone = String(value || '').trim();
  try {
    if (!zone) throw new Error('empty');
    new Intl.DateTimeFormat('en', { timeZone:zone }).format(0);
  } catch { throw new QueueInputError('gültige IANA-Zeitzone fehlt', row); }
  return zone;
}

function zonedParts(instant, timeZone) {
  if (!formatters.has(timeZone)) formatters.set(timeZone, new Intl.DateTimeFormat('en-GB', {
    timeZone, calendar:'gregory', numberingSystem:'latn', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'
  }));
  return Object.fromEntries(formatters.get(timeZone).formatToParts(new Date(instant))
    .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
}

export function localDateInZone(timeZone = 'Europe/Zurich', now = Date.now()) {
  validateTimeZone(timeZone);
  const parts = zonedParts(now, timeZone);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function calendarParts(text, dateOnly, row) {
  const match = (dateOnly ? /^(\d{4})-(\d{2})-(\d{2})$/ : /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/).exec(text);
  if (!match) throw new QueueInputError(dateOnly ? 'Datum muss YYYY-MM-DD sein' : 'Zeitpunkt muss lokales YYYY-MM-DDTHH:mm:ss ohne Offset sein', row);
  const [year, month, day, hour = 0, minute = 0, second = 0] = match.slice(1).map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(naive);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day ||
    hour > 23 || minute > 59 || second > 59) throw new QueueInputError('Kalenderdatum oder Uhrzeit ungültig', row);
  return { year, month, day, hour, minute, second, naive };
}

function localInstant(text, timeZone, row) {
  const parts = calendarParts(text, false, row);
  const offsets = new Set();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = parts.naive + hours * 3600000;
    const p = zonedParts(sample, timeZone);
    offsets.add(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - sample);
  }
  const matches = [...offsets].map(offset => parts.naive - offset).filter(instant => {
    const actual = zonedParts(instant, timeZone);
    return ['year','month','day','hour','minute','second'].every(key => actual[key] === parts[key]);
  });
  if (matches.length !== 1) throw new QueueInputError(matches.length ? 'Zeitpunkt bei Zeitumstellung mehrdeutig' : 'Zeitpunkt existiert in dieser Zeitzone nicht', row);
  return matches[0];
}

function requiredText(value, field, row) {
  if (!String(value || '').trim()) throw new QueueInputError(`${field} fehlt`, row);
}

export function validateMetricoolRow(record, { row, timeZone = 'Europe/Zurich', now = Date.now() } = {}) {
  requiredText(record.text, 'Beitragstext', row);
  const mediaUrl = validateMediaUrl(record.media_url, row);
  const networks = parseNetworks(record.networks, { mode:'metricool', row });
  timeZone = validateTimeZone(timeZone, row);
  const publishInstant = localInstant(String(record.publish_date || '').trim(), timeZone, row);
  if (publishInstant <= now) throw new QueueInputError('Planungszeitpunkt liegt in der Vergangenheit', row);
  return { mediaUrl, networks, publishInstant };
}

export function validateMetaRow(record, { row, skipThreads = false } = {}) {
  requiredText(record.caption, 'Beitragstext', row);
  const mediaUrl = validateMediaUrl(record.video_url, row);
  const networks = parseNetworks(record.platforms, { mode:'meta', row, allowEmpty:true });
  if (skipThreads && String(record.platforms || '').trim() && networks.includes('threads')) {
    throw new QueueInputError('Threads ausdrücklich angefordert, aber per SKIP_THREADS pausiert', row);
  }
  const scheduledDate = String(record.scheduled_date || '').trim();
  if (scheduledDate) calendarParts(scheduledDate, true, row);
  return { mediaUrl, networks, scheduledDate };
}
