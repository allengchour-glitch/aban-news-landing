#!/usr/bin/env node
/**
 * Schreibfreie Pruefung eines strukturierten Storefront-Snapshots oder weniger expliziter URLs.
 *
 * Aufruf: node automation/storefront_sprache_pruefen.mjs snapshot.json
 * Live:   URLS='https://luxestyle.ch/a,https://luxestyle.ch/fr/a' \
 *         node automation/storefront_sprache_pruefen.mjs
 * Streng: STRICT_DE=1 blockiert auch Titel mit mehreren englischen Lehnwoertern.
 * JSON: {"pages":[{"url":"https://luxestyle.ch/...","locale":"de", "title":"...",
 *        "metaDescription":"...", "h1":"...", "uiTexts":["..."], "visibleText":"..."}]}
 * Der Snapshot-Modus macht keine Netzabfrage. Der Live-Modus nutzt nur GET auf den expliziten
 * URLs; beide Modi schreiben weder in Shopify noch in die Eingabedatei.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { pruefeDeSeite, pruefeFrDeutschDuplikat } from './lib/storefront_sprache.mjs';

export const MAX_URLS = 12;

const htmlText = value => String(value ?? '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#(?:39|x27);/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();

function attribute(tag, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(tag).match(new RegExp(`\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? htmlText(match[1] ?? match[2] ?? match[3]) : '';
}

/** Extrahiert nur die fuer den Sprachwaechter benoetigten Felder, ohne Browser oder Skriptausfuehrung. */
export function seiteAusHtml(url, html) {
  const title = htmlText(String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const h1 = htmlText(String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
  let metaDescription = '';
  for (const tag of String(html).match(/<meta\b[^>]*>/gi) || []) {
    if (attribute(tag, 'name').toLowerCase() === 'description') {
      metaDescription = attribute(tag, 'content');
      break;
    }
  }
  const uiTexts = [];
  for (const match of String(html).matchAll(/<(button|summary)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = htmlText(match[2]);
    if (text) uiTexts.push(text);
  }
  for (const tag of String(html).match(/<(?:button|input|a)\b[^>]*(?:aria-label|value)\s*=[^>]*>/gi) || []) {
    const text = attribute(tag, 'aria-label') || attribute(tag, 'value');
    if (text) uiTexts.push(text);
  }
  // Kurze sichtbare Texte nur aus Navigation, Breadcrumbs und Footer. Die ganze Seite als
  // UI-Phrase zu behandeln wuerde Produktbeschreibungen und Skriptfragmente falsch markieren.
  const regionen = [];
  for (const match of String(html).matchAll(/<(nav|footer)\b[^>]*>([\s\S]*?)<\/\1>/gi)) regionen.push(match[2]);
  for (const match of String(html).matchAll(/<([a-z][a-z0-9]*)\b[^>]*(?:class|id)\s*=\s*["'][^"']*breadcrumb[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi)) regionen.push(match[2]);
  for (const region of regionen.slice(0, 12)) {
    for (const match of region.matchAll(/<(a|span|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const text = htmlText(match[2]);
      if (text && text.length <= 80) uiTexts.push(text);
      if (uiTexts.length >= 80) break;
    }
    if (uiTexts.length >= 80) break;
  }
  const imageAltTexts = [];
  for (const tag of String(html).match(/<img\b[^>]*\balt\s*=[^>]*>/gi) || []) {
    const text = attribute(tag, 'alt');
    if (text && text.length <= 160) imageAltTexts.push(text);
    if (imageAltTexts.length >= 80) break;
  }
  const langTag = String(html).match(/<html\b[^>]*>/i)?.[0] || '';
  const locale = attribute(langTag, 'lang') || (/^\/fr(?:\/|$)/.test(pfad(url)) ? 'fr' : 'de');
  return {
    url,
    locale,
    title,
    metaDescription,
    h1,
    uiTexts: [...new Set(uiTexts)].slice(0, 80),
    imageAltTexts: [...new Set(imageAltTexts)].slice(0, 80),
    visibleText: htmlText(html),
  };
}

/** Hoechstens zwoelf explizite luxestyle.ch-URLs, nur GET, keine Formulare oder Shop-API. */
export async function holeSeiten(urls, {
  fetchFn = fetch,
  host = 'luxestyle.ch',
  timeoutMs = 15_000,
} = {}) {
  const liste = [...new Set((urls || []).map(value => String(value).trim()).filter(Boolean))];
  if (!liste.length) throw new Error('Mindestens eine URL ist erforderlich');
  if (liste.length > MAX_URLS) throw new Error(`Hoechstens ${MAX_URLS} URLs pro Lauf`);
  const erlaubt = String(host).toLowerCase().replace(/^www\./, '');
  const pages = [];
  for (const raw of liste) {
    let parsed;
    try { parsed = new URL(raw); }
    catch { throw new Error(`Ungueltige URL: ${raw}`); }
    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase().replace(/^www\./, '') !== erlaubt) {
      throw new Error(`URL ausserhalb von https://${host}: ${raw}`);
    }
    try {
      const response = await fetchFn(parsed.href, {
        method: 'GET',
        redirect: 'follow',
        headers: { Accept: 'text/html', 'User-Agent': 'LuxeStyle-Sprachwaechter/1.0' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const finalUrl = response.url || parsed.href;
      const finalHost = new URL(finalUrl).hostname.toLowerCase().replace(/^www\./, '');
      if (finalHost !== erlaubt) throw new Error(`Weiterleitung auf fremden Host: ${finalHost}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      pages.push(seiteAusHtml(finalUrl, await response.text()));
    } catch (error) {
      // 429/Auth/Timeout bleiben ein konkreter unbekannter Zugriff, nie eine leere oder fehlende Seite.
      pages.push({
        url: parsed.href,
        locale: /^\/fr(?:\/|$)/.test(parsed.pathname) ? 'fr' : 'de',
        fetchError: [error.message, error.cause?.code || error.cause?.message].filter(Boolean).join(' · '),
      });
    }
  }
  return pages;
}

function pfad(url) {
  try {
    const pathname = new URL(String(url)).pathname.replace(/\/$/, '') || '/';
    return pathname;
  } catch {
    return String(url || '').split(/[?#]/)[0].replace(/\/$/, '') || '/';
  }
}

function dePfadVonFr(url) {
  const pathname = pfad(url);
  return pathname.replace(/^\/fr(?=\/|$)/, '') || '/';
}

export function pruefeSnapshot(snapshot, { strictDe = false } = {}) {
  if (!snapshot || !Array.isArray(snapshot.pages)) throw new Error('Snapshot braucht ein pages-Array');
  const pages = snapshot.pages;
  const deNachPfad = new Map(pages
    .filter(page => {
      const locale = String(page.locale || '').toLowerCase();
      return locale.startsWith('de') || (!locale && !/^\/fr(?:\/|$)/.test(pfad(page.url)));
    })
    .map(page => [pfad(page.url), page]));
  const seiten = [];
  const locales = [];

  for (const page of pages) {
    const locale = String(page.locale || '').toLowerCase();
    const isFr = locale.startsWith('fr') || /^\/fr(?:\/|$)/.test(pfad(page.url));
    if (isFr) {
      locales.push({ url: page.url || '', fehler: page.fetchError || '', ...pruefeFrDeutschDuplikat({ de: deNachPfad.get(dePfadVonFr(page.url)), fr: page }) });
    } else if (!locale || locale.startsWith('de')) {
      seiten.push({ url: page.url || '', fehler: page.fetchError || '', ...pruefeDeSeite(page, { strictDe }) });
    }
  }
  const blocked = [...seiten, ...locales].filter(row => row.status === 'BLOCKED').length;
  const unknown = [...seiten, ...locales].filter(row => row.status === 'UNKNOWN').length;
  return { status: blocked ? 'BLOCKED' : unknown ? 'UNKNOWN' : 'OK', blocked, unknown, seiten, locales };
}

async function main() {
  const liveUrls = [
    ...String(process.env.URLS || '').split(/[\n,]/),
    ...process.argv.slice(2).filter(value => /^https:\/\//i.test(value)),
  ].map(value => value.trim()).filter(Boolean);
  const file = process.argv.slice(2).find(value => !/^https:\/\//i.test(value)) || process.env.INPUT_FILE;
  if (!file && !liveUrls.length) throw new Error('Eingabedatei oder URLS fehlt');
  const snapshot = liveUrls.length
    ? { pages: await holeSeiten(liveUrls, { host: process.env.STOREFRONT_HOST || 'luxestyle.ch' }) }
    : JSON.parse(readFileSync(file, 'utf8'));
  const result = pruefeSnapshot(snapshot, { strictDe: process.env.STRICT_DE === '1' });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'BLOCKED') process.exitCode = 1;
  else if (result.status === 'UNKNOWN') process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`FEHLER: ${error.message}`); process.exitCode = 2; });
}
