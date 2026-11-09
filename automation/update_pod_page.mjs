#!/usr/bin/env node
/* LuxeStyle — update_pod_page.mjs
 * Prüft bzw. schreibt dropship/pod/page_body.html in die Shopify-Seite «Selbst gestalten».
 * Vorgabe ist TROCKENLAUF. Ein Write braucht DRY_RUN=0 und den frisch im Trockenlauf
 * ausgegebenen POD_EXPECTED_BEFORE_SHA256 und POD_EXPECTED_TARGET_SHA256. Direkt vor der
 * Mutation wird derselbe Stand nochmals gelesen (Anwendungs-CAS; Shopify pageUpdate bietet hier kein atomisches CAS).
 *
 * ENV: SHOPIFY_SHOP · SHOPIFY_CLIENT_ID · SHOPIFY_CLIENT_SECRET
 *      [POD_PAGE_ID] · [POD_BODY_FILE] · [POD_EXPECTED_BEFORE_SHA256] · [POD_EXPECTED_TARGET_SHA256] · [DRY_RUN]
 * Ohne Zugang: sichtbarer No-op. Keine Wiederholung nach einem unklaren Write.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { normalizeShopifyHost } from './lib/shopify_host.mjs';

export const ERWARTET = Object.freeze({
  shop: 'au3j0y-hq.myshopify.com',
  primaer: 'luxestyle.ch',
  pageId: 'gid://shopify/Page/698444710273',
  pageHandle: 'selbst-gestalten',
});

const API = '2026-01';
const READ = `query PodPageStand($id: ID!){
  shop { name myshopifyDomain primaryDomain { host url } }
  page(id:$id) { id title handle body updatedAt }
}`;
const WRITE = `mutation PodPageUpdate($id: ID!, $page: PageUpdateInput!){
  pageUpdate(id:$id, page:$page){ page{ id title handle body } userErrors{ field message } }
}`;

export const sha256 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex');

export function shopHost(value) {
  return normalizeShopifyHost(value);
}

function domainHost(value) {
  const roh = String(value ?? '').trim().toLowerCase();
  if (!roh) return '';
  if (/^https?:\/\//.test(roh)) { try { return new URL(roh).hostname.replace(/\.$/, ''); } catch { return ''; } }
  return roh.replace(/\.$/, '');
}

/** Leer/1/true = Trockenlauf; nur 0/false/no/nein/off schreibt. */
export function istTrockenlauf(value) {
  return !['0', 'false', 'no', 'nein', 'off'].includes(String(value ?? '').trim().toLowerCase());
}

const kurz = (line) => {
  // JSON-Darstellung erhält doppelte/führende/nachlaufende Leerzeichen und macht Tabs sichtbar.
  const s = JSON.stringify(String(line));
  return s.length > 240 ? s.slice(0, 237) + '...' : s;
};

/** Zeilen-Diff nur mit hinzugefügten/entfernten Zeilen; Ausgabe ist für das öffentliche Actions-Protokoll begrenzt. */
export function zeilenDiff(vorher, nachher, limit = 80) {
  const a = String(vorher).split('\n');
  const b = String(nachher).split('\n');
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const alle = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; continue; }
    if (j >= b.length || (i < a.length && dp[i + 1][j] >= dp[i][j + 1])) alle.push(`- L${i + 1}: ${kurz(a[i++])}`);
    else alle.push(`+ L${j + 1}: ${kurz(b[j++])}`);
  }
  if (!alle.length) return '(keine Änderung)';
  const gezeigt = alle.slice(0, Math.max(1, limit));
  if (alle.length > gezeigt.length) gezeigt.push(`... ${alle.length - gezeigt.length} weitere geänderte Zeilen nicht ausgegeben`);
  return gezeigt.join('\n');
}

function identitaet(data) {
  const shop = data?.shop;
  const page = data?.page;
  const myshop = shopHost(shop?.myshopifyDomain);
  const primaer = domainHost(shop?.primaryDomain?.host || shop?.primaryDomain?.url);
  if (myshop !== ERWARTET.shop || primaer !== ERWARTET.primaer) {
    throw new Error(`Shop-Identität abweichend: myshopify=${myshop || 'unbekannt'}, primär=${primaer || 'unbekannt'}; erwartet ${ERWARTET.shop} / ${ERWARTET.primaer}`);
  }
  if (!page) throw new Error(`Seite ${ERWARTET.pageId} nicht lesbar`);
  if (page.id !== ERWARTET.pageId || page.handle !== ERWARTET.pageHandle) {
    throw new Error(`Seiten-Identität abweichend: id=${page.id || 'unbekannt'}, handle=${page.handle || 'unbekannt'}`);
  }
  if (typeof page.body !== 'string') throw new Error('Seiteninhalt nicht lesbar');
  return { shop, page };
}

async function jsonAntwort(response, wo) {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== 'object') throw new Error(`${wo}: HTTP ${response.status}, keine gültige Antwort`);
  return body;
}

async function token(fetchFn, shop, cid, secret) {
  const response = await fetchFn(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: cid, client_secret: secret, grant_type: 'client_credentials' }),
    redirect: 'error', signal: AbortSignal.timeout(30000),
  });
  const body = await jsonAntwort(response, 'Token');
  if (!body.access_token) throw new Error('Token: access_token fehlt');
  return body.access_token;
}

async function gql(fetchFn, shop, tok, query, variables) {
  const response = await fetchFn(`https://${shop}/admin/api/${API}/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok },
    body: JSON.stringify({ query, variables }),
    redirect: 'error', signal: AbortSignal.timeout(30000),
  });
  const body = await jsonAntwort(response, 'Shopify GraphQL');
  if (body.errors?.length) throw new Error(`Shopify GraphQL: ${JSON.stringify(body.errors).slice(0, 400)}`);
  return body.data;
}

export async function aktualisierePodSeite({
  env = process.env,
  fetchFn = globalThis.fetch,
  existsSync = fs.existsSync,
  readFileSync = fs.readFileSync,
  log = console.log,
  error = console.error,
} = {}) {
  let mutationGestartet = false;
  try {
    const shop = shopHost(env.SHOPIFY_SHOP);
    const cid = String(env.SHOPIFY_CLIENT_ID ?? '').trim();
    const secret = (shopifyClientSecret(env.SHOPIFY_CLIENT_SECRET) || '').trim();
    const pageId = String(env.POD_PAGE_ID || ERWARTET.pageId).trim();
    const bodyFile = String(env.POD_BODY_FILE || 'dropship/pod/page_body.html');
    const dry = istTrockenlauf(env.DRY_RUN);

    if (!shop || !cid || !secret) { log('Shopify-Zugang fehlt → nichts gelesen oder geschrieben.'); return 0; }
    if (shop !== ERWARTET.shop) throw new Error(`SHOPIFY_SHOP ist ${shop || 'leer'}; erwartet ${ERWARTET.shop}`);
    if (pageId !== ERWARTET.pageId) throw new Error(`POD_PAGE_ID ist ${pageId}; erwartet ${ERWARTET.pageId}`);
    if (!existsSync(bodyFile)) throw new Error(`Body-Datei fehlt: ${bodyFile}`);
    if (typeof fetchFn !== 'function') throw new Error('fetch fehlt');

    const zielBody = readFileSync(bodyFile, 'utf8');
    const zielHash = sha256(zielBody);
    const erwartetZielHash = String(env.POD_EXPECTED_TARGET_SHA256 ?? '').trim().toLowerCase();
    if (!dry && !/^[0-9a-f]{64}$/.test(erwartetZielHash)) throw new Error('POD_EXPECTED_TARGET_SHA256 fehlt oder ist kein SHA-256; zuerst Trockenlauf ausführen');
    if (!dry && erwartetZielHash !== zielHash) throw new Error(`Ziel-Hash abweichend: Checkout ${zielHash}, freigegeben ${erwartetZielHash}`);
    const tok = await token(fetchFn, shop, cid, secret);
    const erster = identitaet(await gql(fetchFn, shop, tok, READ, { id: pageId }));
    const vorherBody = erster.page.body;
    const vorherHash = sha256(vorherBody);

    log(`Identität bestätigt: ${erster.shop.name || 'LuxeStyle'} · ${ERWARTET.shop} · ${ERWARTET.primaer} · ${erster.page.handle}`);
    log(`Vorher SHA-256 ${vorherHash} (${Buffer.byteLength(vorherBody, 'utf8')} Byte); Ziel SHA-256 ${zielHash} (${Buffer.byteLength(zielBody, 'utf8')} Byte).`);
    log('Diff (geänderte Zeilen, begrenzt):\n' + zeilenDiff(vorherBody, zielBody));

    if (vorherHash === zielHash) { log('UNVERÄNDERT: keine Mutation nötig.'); return 0; }
    if (dry) {
      log(`TROCKENLAUF: keine Mutation. Für einen geprüften Write DRY_RUN=0, POD_EXPECTED_BEFORE_SHA256=${vorherHash} und POD_EXPECTED_TARGET_SHA256=${zielHash} setzen.`);
      return 0;
    }

    const erwartetHash = String(env.POD_EXPECTED_BEFORE_SHA256 ?? '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(erwartetHash)) throw new Error('POD_EXPECTED_BEFORE_SHA256 fehlt oder ist kein SHA-256; zuerst Trockenlauf ausführen');
    if (erwartetHash !== vorherHash) throw new Error(`Vorher-Hash abweichend: aktuell ${vorherHash}, freigegeben ${erwartetHash}`);

    // Bestmöglicher Anwendungs-CAS: unmittelbar vor dem Write erneut lesen. pageUpdate selbst hat kein compareDigest.
    const direktVorher = identitaet(await gql(fetchFn, shop, tok, READ, { id: pageId }));
    const casHash = sha256(direktVorher.page.body);
    if (casHash === zielHash) { log(`UNVERÄNDERT: Ziel wurde zwischenzeitlich bereits erreicht · SHA-256 ${zielHash}.`); return 0; }
    if (casHash !== vorherHash || casHash !== erwartetHash) throw new Error(`CAS abgebrochen: Seite änderte sich vor der Mutation (${vorherHash} → ${casHash})`);

    mutationGestartet = true;
    const geschrieben = await gql(fetchFn, shop, tok, WRITE, { id: pageId, page: { body: zielBody } });
    const ergebnis = geschrieben?.pageUpdate;
    if (!ergebnis) throw new Error('pageUpdate: Antwort fehlt');
    if (ergebnis.userErrors?.length) throw new Error(`pageUpdate: ${JSON.stringify(ergebnis.userErrors).slice(0, 400)}`);
    if (ergebnis.page?.id !== ERWARTET.pageId || ergebnis.page?.handle !== ERWARTET.pageHandle) throw new Error('pageUpdate: Seiten-Identität in der Antwort abweichend');
    if (sha256(ergebnis.page?.body ?? '') !== zielHash) throw new Error('pageUpdate: Antwort enthält nicht den Zielinhalt');

    const nachher = identitaet(await gql(fetchFn, shop, tok, READ, { id: pageId }));
    const nachherHash = sha256(nachher.page.body);
    if (nachherHash !== zielHash) throw new Error(`Rücklesung abweichend: erwartet ${zielHash}, gelesen ${nachherHash}`);
    log(`GESCHRIEBEN UND ZURÜCKGELESEN: ${nachher.page.title} · ${nachher.page.handle} · SHA-256 ${nachherHash}.`);
    return 0;
  } catch (e) {
    error(`${mutationGestartet ? 'SCHREIBZUSTAND UNBEKANNT, keine automatische Wiederholung' : 'ABBRUCH vor Write'}: ${e?.message || e}`);
    return 1;
  }
}

const direkt = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direkt) process.exitCode = await aktualisierePodSeite();
