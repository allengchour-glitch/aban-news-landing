#!/usr/bin/env node
import { readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { statusMitGeduld } from './vendor/url_status.mjs';

export const MAX_URLS = 6;
const HOST = 'luxestyle.ch';
const PROTECTED = new Set(['401', '403', '407', '429']);

export function validateTargets(targets) {
  if (!Array.isArray(targets) || !targets.length || targets.length > MAX_URLS) {
    throw new Error(`Expected 1–${MAX_URLS} explicit LuxeStyle targets.`);
  }
  const seen = new Set();
  for (const t of targets) {
    for (const value of [t?.url, t?.expectedCanonical ?? t?.url]) {
      let u; try { u = new URL(value); } catch { throw new Error('Invalid target URL.'); }
      if (u.protocol !== 'https:' || u.hostname !== HOST || u.port || u.username || u.password || u.hash || !/^\/(products|collections)\/[a-z0-9-]+\/?$/.test(u.pathname)) {
        throw new Error('Only explicit HTTPS product/collection URLs on luxestyle.ch are permitted.');
      }
    }
    if (seen.has(t.url)) throw new Error('Duplicate target URL.');
    seen.add(t.url);
  }
  return targets;
}

function attributes(tag) {
  const out = {};
  const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  // HTML keeps the first occurrence of a duplicate attribute.
  for (const m of tag.matchAll(re)) {
    const name = m[1].toLowerCase();
    if (!(name in out)) out[name] = m[2] ?? m[3] ?? m[4];
  }
  return out;
}

function decodeAttr(s) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', tab: '\t', newline: '\n' };
  // Decode once: &amp;#110; remains literal &#110;, not the letter n.
  return s.replace(/&(?:#(x[0-9a-f]+|[0-9]+)|(amp|quot|apos|lt|gt|tab|newline));/gi, (_m, numeric, name) => {
    if (name) return named[name.toLowerCase()];
    const point = numeric[0].toLowerCase() === 'x' ? parseInt(numeric.slice(1), 16) : Number(numeric);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '\ufffd';
  });
}

function metaName(a) { return decodeAttr(a.name ?? '').toLowerCase(); }

function headMetadata(html) {
  // A small conservative scanner, not a full HTML parser. Raw-text content and
  // nested template fragments cannot create an active canonical or close head.
  // Comments are recognised only outside raw text. Removing them globally can
  // swallow a real </script> and the active meta tags that follow it.
  const tokens = /<!--[\s\S]*?(?:-->|$)|<!doctype\b[^>]*>|<\/?([a-z][a-z0-9:-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
  const headNames = new Set(['base', 'basefont', 'bgsound', 'link', 'meta', 'noframes',
    'noscript', 'script', 'style', 'template', 'title']);
  const rawNames = new Set(['script', 'style', 'title', 'textarea', 'xmp', 'iframe',
    'noembed', 'noframes', 'noscript']);
  let state = 'before_head', templateDepth = 0, rawName = null, end = 0, baseHref = null;
  let activeTitle = false;
  const links = [], metas = [], titles = [];
  const titleText = text => decodeAttr(text).replace(/\s+/g, ' ').trim();
  while (true) {
    if (rawName) {
      const closeRaw = new RegExp(`</${rawName}(?=[\\s/>])(?:"[^"]*"|'[^']*'|[^'">])*>`, 'gi');
      closeRaw.lastIndex = end;
      const closing = closeRaw.exec(html);
      if (activeTitle) titles.push(titleText(html.slice(end, closing ? closing.index : html.length)));
      activeTitle = false;
      if (!closing) break;
      end = closing.index + closing[0].length;
      tokens.lastIndex = end;
      rawName = null;
      continue;
    }
    const m = tokens.exec(html);
    if (!m) break;
    const text = html.slice(end, m.index);
    end = m.index + m[0].length;
    if (!m[1]) {
      if (!templateDepth && text.trim()) state = 'after_head';
      continue; // A comment or doctype outside raw text.
    }
    const name = m[1].toLowerCase(), closing = /^<\//.test(m[0]);
    if (templateDepth) {
      if (name === 'template') templateDepth += closing ? -1 : 1;
      else if (!closing && rawNames.has(name)) rawName = name;
      continue;
    }
    if (text.trim()) state = 'after_head';
    if (name === 'html') {
      if (closing) state = 'after_head';
      continue;
    }
    if (name === 'head') {
      if (closing) state = 'after_head';
      else if (state === 'before_head') state = 'in_head';
      continue;
    }
    if (state === 'after_head') continue;
    if (!headNames.has(name)) { state = 'after_head'; continue; }
    if (closing) continue;
    if (name === 'template') { templateDepth = 1; continue; }
    if (rawNames.has(name)) {
      rawName = name;
      activeTitle = name === 'title';
      continue;
    }
    const a = attributes(m[0]);
    if (name === 'meta') metas.push(a);
    if (name === 'base' && baseHref === null && a.href) baseHref = decodeAttr(a.href);
    if (name === 'link' && a.rel?.toLowerCase().split(/\s+/).includes('canonical') && a.href) {
      links.push(decodeAttr(a.href));
    }
  }
  return { links, baseHref, metas, titles };
}

function blocksIndexing(content) {
  return content.toLowerCase().split(/[\s,]+/).some(x => x === 'noindex' || x === 'none');
}

export function analyseXRobotsTag(value) {
  // Arrays preserve actual HTTP field boundaries; a combined Headers.get value
  // loses them. An unprefixed noindex after another crawler may therefore be
  // a new global field: return null, never a false assurance in that case.
  // Directive/value pairs such as max-snippet: 0 are not agent prefixes.
  const directiveNames = new Set(['max-snippet', 'max-image-preview', 'max-video-preview', 'unavailable_after']);
  const fields = Array.isArray(value) ? value : [String(value ?? '')];
  const boundariesKnown = Array.isArray(value);
  let unknown = false;
  for (const field of fields) {
    let agent = null;
    for (const part of field.toLowerCase().split(',')) {
      let directives = part.trim();
      const prefix = /^([a-z][a-z0-9_-]*)\s*:\s*(.*)$/.exec(directives);
      const hasAgentPrefix = Boolean(prefix && !directiveNames.has(prefix[1]));
      if (hasAgentPrefix) {
        agent = prefix[1];
        directives = prefix[2];
      }
      if (!blocksIndexing(directives)) continue;
      if (agent === null || agent === 'all' || agent === 'googlebot') return true;
      if (!boundariesKnown && !hasAgentPrefix) unknown = true;
    }
  }
  return unknown ? null : false;
}

function xRobotsFields(headers) {
  // node-fetch exposes raw field arrays; standard Fetch Headers does not.
  // Only use explicit string arrays, never infer field boundaries from commas.
  if (typeof headers?.raw !== 'function') return null;
  try {
    const raw = headers.raw();
    const key = Object.keys(raw).find(x => x.toLowerCase() === 'x-robots-tag');
    const fields = key ? raw[key] : null;
    return Array.isArray(fields) && fields.length && fields.every(x => typeof x === 'string') ? fields : null;
  } catch { return null; }
}

export function analyseHtml(html, expectedCanonical, documentUrl = null) {
  // The expected canonical is only a comparison target, never the URL base.
  const clean = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const { links, baseHref, metas, titles } = headMetadata(html);
  const descriptions = metas.filter(a => metaName(a) === 'description');
  const robotsMeta = metas.filter(a => ['robots', 'googlebot'].includes(metaName(a)))
    .map(a => ({ name: metaName(a), content: decodeAttr(a.content ?? ''), noindex: blocksIndexing(decodeAttr(a.content ?? '')) }));
  let documentBase = documentUrl;
  if (baseHref !== null && documentUrl !== null) {
    try { documentBase = new URL(baseHref, documentUrl).href; } catch { /* Invalid base is ignored. */ }
  }
  const hrefs = [];
  for (const href of links) {
    try { hrefs.push(new URL(href, documentBase ?? undefined).href); }
    catch { hrefs.push(null); }
  }
  return {
    canonical: hrefs.length === 1 ? hrefs[0] : null,
    canonicalCount: hrefs.length,
    canonicalMatches: hrefs.length === 1 && hrefs[0] === new URL(expectedCanonical).href,
    metaDescription: descriptions.length ? decodeAttr(descriptions[0].content ?? '').trim() || null : null,
    metaDescriptionPresent: descriptions.some(a => Boolean(decodeAttr(a.content ?? '').trim())),
    metaDescriptionCount: descriptions.length,
    robotsMeta,
    htmlNoindex: robotsMeta.some(x => x.noindex),
    // For this head-only preflight, the first active title is authoritative.
    // A later duplicate must not hide an empty first title; body/inert/embedded
    // examples cannot establish active head metadata. This is not a browser DOM.
    title: titles[0] || null,
    titleCount: titles.length,
    titlePresent: Boolean(titles[0]),
    h1Present: /<h1\b[^>]*>[\s\S]*?\S[\s\S]*?<\/h1\s*>/i.test(clean)
  };
}

export async function checkCandidate(target, options = {}) {
  validateTargets([target]);
  const fetchFn = options.fetch ?? fetch;
  let body = null, contentType = '', finalUrl = '', statusDetail = null, xRobotsTag = null, xRobotsRawFields = null;
  const result = await statusMitGeduld(target.url, {
    versuche: 2, basisMs: 400, warte: options.warte,
    fetch: async (url, init) => {
      body = null;
      const r = await fetchFn(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(6000) });
      finalUrl = r.url || target.url;
      contentType = r.headers?.get('content-type') || '';
      xRobotsTag = r.headers?.get('x-robots-tag') || null;
      xRobotsRawFields = xRobotsFields(r.headers);
      if (r.status === 200 && /text\/html/i.test(contentType)) {
        body = await r.text();
        if (body.length > 2_000_000) { body = null; statusDetail = 'html_size_limit'; }
      }
      return r;
    }
  });
  const common = { url: target.url, expectedCanonical: target.expectedCanonical ?? target.url,
    observedAt: new Date().toISOString(), httpStatus: result.status || null,
    retries: result.nachgefasst, source: target.source ?? null };
  if (result.unsicher || PROTECTED.has(String(result.status))) {
    return { ...common, state: 'unknown', reason: result.status ? `http_${result.status}` : 'transport_error' };
  }
  if (result.status === 404 || result.status === 410) return { ...common, state: 'unavailable', reason: `http_${result.status}` };
  if (result.status !== 200) return { ...common, state: 'unknown', reason: `http_${result.status}` };
  if (new URL(finalUrl).hostname !== HOST || body === null) {
    return { ...common, state: 'unknown', reason: statusDetail ?? 'non_html_or_unexpected_origin' };
  }
  const html = analyseHtml(body, common.expectedCanonical, finalUrl);
  const xRobotsNoindex = analyseXRobotsTag(xRobotsRawFields ?? xRobotsTag);
  return { ...common, state: 'measured', measurementScope: 'http_and_html_only',
    googleIndexStatus: 'unknown', ...html, xRobotsTag, xRobotsRawFields, xRobotsNoindex,
    noindexDetected: html.htmlNoindex ? true : xRobotsNoindex,
    noindexDetectionReason: !html.htmlNoindex && xRobotsNoindex === null ? 'combined_x_robots_scope_unknown' : null };
}

export async function run(targets, options = {}) {
  validateTargets(targets); // Validate the entire batch before any request.
  const results = [];
  for (const t of targets) results.push(await checkCandidate(t, options));
  return { preparationOnly: true, scope: 'explicit_targets_only', targetLimit: MAX_URLS,
    measuredMeaning: 'HTTP/HTML observation only; Google indexing is unknown.',
    measured: results.filter(x => x.state === 'measured').length,
    unknown: results.filter(x => x.state === 'unknown').length,
    unavailable: results.filter(x => x.state === 'unavailable').length,
    results };
}

async function existingStat(path) {
  try { return await stat(path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function checkOutputPath(input, output) {
  const inputReal = await realpath(input);
  let outputReal;
  try { outputReal = await realpath(output); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    outputReal = join(await realpath(dirname(resolve(output))), basename(output));
  }
  const [inputStat, outputStat] = await Promise.all([stat(input), existingStat(output)]);
  if (inputReal === outputReal || (outputStat && inputStat.dev === outputStat.dev && inputStat.ino === outputStat.ino)) {
    throw new Error('Report output must not overwrite the target input or any alias of it.');
  }
}

export async function main(argv = process.argv.slice(2), options = {}) {
  const [input, output] = argv;
  if (!input || !output) throw new Error('Usage: node seo_landing_preflight.mjs targets.json report.json');
  await checkOutputPath(input, output); // Refuse aliases before any request.
  const report = await run(JSON.parse(await readFile(input, 'utf8')), options);
  await checkOutputPath(input, output); // Also catch aliases changed during the read-only scan.
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  return { output, measured: report.measured, unknown: report.unknown, unavailable: report.unavailable };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await main()));
}
