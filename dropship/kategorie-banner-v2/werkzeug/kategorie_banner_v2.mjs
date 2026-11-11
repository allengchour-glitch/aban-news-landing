#!/usr/bin/env node
/**
 * kategorie_banner_v2.mjs — Kategorie-Bild (collection.image) und Kopf-Auswahl (luxe.kopf_produkte) aus ECHTEN, aktiven,
 * lieferbaren, geprüften Produktfotos. Ersetzt für diese Aufgabe die alten Werkzeuge kategorie_banner.mjs (Pinnwand 2000×1000)
 * und kategorie_bilder.mjs (Label 1600×1200, veraltet). Hintergrund und Regeln: banner_v2_lib.mjs (Kopfkommentar).
 *
 * WAS ES SCHREIBT (nur mit LIVE=1 und einem geprüften Plan):
 *   bild : collection.image = EIN Produktfoto, quadratisch (1200–1600 px), Produkt mittig mit ~10 % Rand auf seiner eigenen,
 *          hellen, ruhigen Randfarbe; Alt-Text «Kategorie – Motiv». Erscheint als og:image, in der Bild-Sitemap, als
 *          Startseiten-Kachel (48 px), Entdecken-Karte und Verzeichniskachel. NICHT auf der Kategorieseite selbst.
 *   kopf : Collection-Metafeld luxe.kopf_produkte (list.product_reference) mit 4 Produkten für den Theme-Kopf lux_hero.
 *          Das Theme liest es erst nach der Theme-Änderung (Plan Rang 1); bis dahin ist das Feld wirkungslos.
 *   Kein Produkt wird verändert. Kein Text, keine Zahl, kein Preis im Bild. Keine KI-Bilder, keine Freistellung.
 *
 * ABLAUF
 *   1) Trockenlauf (Vorgabe, nur lesen):  HANDLES=a,b,c node kategorie_banner_v2.mjs
 *        → <OUT>/<lauf>/plan.json, bericht.txt, bilder/, kontaktbogen/<handle>.jpg. Der Bericht nennt PLAN und PLAN_HASH.
 *   2) Kontaktbögen ANSEHEN (Pflicht). Einträge, die nicht stimmen, mit OHNE=handle ausschliessen.
 *   3) LIVE=1 PLAN=<plan.json> PLAN_HASH=<16 hex> [NUR=…] [OHNE=…] [MAX=10] node kategorie_banner_v2.mjs
 *        je Sammlung: frisch lesen, Stand gegen den Trockenlauf prüfen, Quellprodukte erneut prüfen (aktiv, Onlineshop,
 *        lieferbar, Mitglied), Bilddatei gegen den Plan-Hash prüfen, Sicherung (JSON + alte Bilddatei), schreiben,
 *        frisch zurücklesen (Bild neu, Alt-Text, Masse, CDN 200, Metafeld), Ledger. Erste Abweichung = Stopp.
 *   4) Rücknahme: ZURUECK=1 [HANDLES=…] node … (Trockenlauf) → ZURUECK=1 LIVE=1 [HANDLES=…] node …
 *        nimmt je Sammlung die letzte Änderung aus dem Ledger zurück, nur wenn heute noch unser Stand gilt («fremd» = nichts tun,
 *        FREMD_UEBERSCHREIBEN=1 übersteuert).
 *   5) Wöchentlich: PHASE=pruefen node …  → meldet Sammlungen, deren Quellprodukt oder Kopf-Produkt nicht mehr aktiv/lieferbar/
 *        Mitglied ist oder deren Bild jemand anders geändert hat (Exit 3). Dann einen neuen Trockenlauf für diese Handles.
 *
 * SCHALTER
 *   HANDLES=a,b | HANDLES_DATEI=pfad | MENUE=1 (Hauptmenü) | ALLE=1 (alle veröffentlichten mit Bild = Bild-Sitemap)   Auswahl (Trockenlauf)
 *   LIMIT=n (höchstens n Sammlungen im Trockenlauf; je Sammlung bis rund 30 Gemini-Aufrufe)
 *   TEILE=bild,kopf (Vorgabe; «alt» zusätzlich = Alt-Text-Vorschläge bei behaltenen Bildern schreiben) · FORCE=1 (auch Pinnwand/unbekannte Quelle ersetzen) · KI=aus (ohne Gemini, alles «ungeprüft»)
 *   GEMINI_MODEL=gemini-3.8-flash · GEMINI_MAX=14 (Prüfungen fürs Bild je Sammlung) · KOPF_MAX=16 (für den Kopf) · PARALLEL=4 · SCAN=150 · QUELLE_SCAN=300
 *   SPERR_PRODUKTE=handle,… (zusätzlich) · DOPPEL_PIXEL=1 (Doppel auch per Bildinhalt gegen alle Sammlungsbilder)
 *   OUT=… (Läufe) · DATEN=… (ledger.jsonl, sicherung/, Caches; Vorgabe ./kategorie-banner-v2 neben dem Skript)
 *   MAX=10 (höchstens 25 je LIVE-Lauf) · PAUSE_MS=2500 · MAX_ALTER_H=24 (Plan-Alter) · UNGEPRUEFT_OK=1 (Einträge ohne Gemini-Urteil schreiben)
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync, statSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import * as L from './banner_v2_lib.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO = process.env.LUXE_REPO || '/home/user/aban-news-landing';
const LIB = existsSync(join(HIER, 'lib', 'shopify_gql.mjs')) ? join(HIER, 'lib') : join(REPO, 'automation', 'lib');
const imp = f => import(pathToFileURL(join(LIB, f)).href);
const { shopifyGql } = await imp('shopify_gql.mjs');
const { shopifyClientSecret } = await imp('shopify_secret.mjs');
const { BASIS_SPERR_TAGS } = await imp('sperr_tags.mjs');
const { bildKlassifizieren, GeminiFatal } = await imp('gemini_vision.mjs');

const E = process.env;
const MODUS = E.ZURUECK === '1' ? 'zurueck' : E.PHASE === 'pruefen' ? 'pruefen' : (E.LIVE === '1' ? 'live' : 'trocken');
const SCHREIBEN = E.LIVE === '1';
const API = E.SHOPIFY_API || '2026-01';
const DATEN = resolve(E.DATEN || join(HIER, 'kategorie-banner-v2'));
const OUT = resolve(E.OUT || join(DATEN, 'laeufe'));
const LEDGER = resolve(E.LEDGER || join(DATEN, 'ledger.jsonl'));
const TEILE = (E.TEILE || 'bild,kopf').split(',').map(s => s.trim()).filter(Boolean);
const FORCE = E.FORCE === '1';
let KI_AUS = E.KI === 'aus';
const MODELL = E.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_MAX = Number(E.GEMINI_MAX || 14), KOPF_MAX = Number(E.KOPF_MAX || 16), PARALLEL = Math.max(1, Number(E.PARALLEL || 4));
const SCAN = Number(E.SCAN || 150), QUELLE_SCAN = Number(E.QUELLE_SCAN || 300), PAUSE_MS = Number(E.PAUSE_MS || 2500);
const SPERR_TAGS = [...BASIS_SPERR_TAGS, 'google-gesperrt-adult', 'lizenz-nicht-bewerben'];
const SPERR_HANDLES = [...L.SPERR_PRODUKTE, ...(E.SPERR_PRODUKTE || '').split(',').map(s => s.trim()).filter(Boolean)];
const JETZT = new Date();
const LAUF = JETZT.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const sha = b => createHash('sha256').update(b).digest('hex');
const log = (...a) => console.log(...a);

// ------------------------------------------------------------------ Shopify
let TOK = null;
async function token() {
  const SHOP = E.SHOPIFY_SHOP;
  if (!SHOP || !E.SHOPIFY_CLIENT_ID || !E.SHOPIFY_CLIENT_SECRET) throw new Error('SHOPIFY_SHOP/SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET fehlen');
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: E.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(E.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error('Kein Shopify-Token (HTTP ' + r.status + ')');
  TOK = j.access_token;
}
const q = (query, variables) => shopifyGql(E.SHOPIFY_SHOP, API, TOK, query, variables, { versuche: 6 });

const PRODUKT_FELDER = `id handle title productType status onlineStoreUrl tracksInventory totalInventory tags
  featuredImage{ url width height altText }
  media(first:4){ nodes{ ... on MediaImage{ image{ url width height } } } }
  rt: metafield(namespace:"reviews", key:"rating"){ value } rc: metafield(namespace:"reviews", key:"rating_count"){ value }`;

async function sammlungLesen(handle, { scan = SCAN, ziel = 28 } = {}) {
  let after = null, c = null; const produkte = [];
  for (let seite = 0; seite < 20; seite++) {
    const d = await q(`query($h:String!,$a:String){ collectionByHandle(handle:$h){ id handle title sortOrder updatedAt
      image{ url altText width height } kopf: metafield(namespace:"luxe", key:"kopf_produkte"){ value type }
      productsCount{ count }
      products(first:50, after:$a, sortKey:COLLECTION_DEFAULT){ pageInfo{ hasNextPage endCursor } nodes{ ${PRODUKT_FELDER} } } } }`, { h: handle, a: after });
    const cc = d.collectionByHandle; if (!cc) return null;
    c = c || cc; produkte.push(...cc.products.nodes);
    const tauglich = produkte.filter(p => p.status === 'ACTIVE' && p.onlineStoreUrl).length;
    if (!cc.products.pageInfo.hasNextPage || produkte.length >= scan || tauglich >= ziel) { c.mehr = cc.products.pageInfo.hasNextPage ? cc.products.pageInfo.endCursor : null; break; }
    after = cc.products.pageInfo.endCursor;
  }
  c.produkte = produkte; delete c.products;
  return c;
}
async function sammlungKurz(handle) {
  const d = await q(`query($h:String!){ collectionByHandle(handle:$h){ id handle title image{ url altText width height } kopf: metafield(namespace:"luxe", key:"kopf_produkte"){ value } } }`, { h: handle });
  const c = d.collectionByHandle; if (!c) return null;
  return { ...c, bild: c.image?.url ? c.image : null, kopf: c.kopf?.value ?? null };
}

/** Quellprodukt des heutigen Bildes: Dateistamm gegen Medien der Mitglieder (weiter blättern bis QUELLE_SCAN), dann BigBuy-EAN/SKU. */
async function quelleSuchen(c, schonGelesen) {
  const stamm = L.dateiStamm(c.image?.url || '');
  if (!stamm) return { gefunden: false };
  const treffer = p => [p.featuredImage, ...(p.media?.nodes || []).map(m => m?.image)].some(im => im?.url && L.dateiStamm(im.url) === stamm);
  const bewerte = p => ({ gefunden: true, mitglied: true, produkt: { id: p.id, handle: p.handle, status: p.status },
    lieferbar: p.status === 'ACTIVE' && !!p.onlineStoreUrl && !(p.tracksInventory && !(p.totalInventory > 0)),
    grund: p.status !== 'ACTIVE' ? p.status.toLowerCase() : !p.onlineStoreUrl ? 'nicht-im-onlineshop' : (p.tracksInventory && !(p.totalInventory > 0)) ? 'ausverkauft' : null });
  const p0 = schonGelesen.find(treffer); if (p0) return bewerte(p0);
  let after = c.mehr, gelesen = schonGelesen.length;
  while (after && gelesen < QUELLE_SCAN) {
    const d = await q(`query($id:ID!,$a:String){ collection(id:$id){ products(first:100, after:$a){ pageInfo{ hasNextPage endCursor }
      nodes{ id handle status onlineStoreUrl tracksInventory totalInventory featuredImage{ url } media(first:6){ nodes{ ... on MediaImage{ image{ url } } } } } } } }`, { id: c.id, a: after });
    const pr = d.collection.products; gelesen += pr.nodes.length;
    const p = pr.nodes.find(treffer); if (p) return bewerte(p);
    after = pr.pageInfo.hasNextPage ? pr.pageInfo.endCursor : null;
  }
  const vollstaendig = !after;   // alle Mitglieder gelesen (sonst nach QUELLE_SCAN abgebrochen)
  const bb = L.bigbuyKennung(c.image.url);
  if (bb) {
    const such = [`barcode:${bb.ean}`, bb.sku ? `sku:${bb.sku}` : null].filter(Boolean).join(' OR ');
    const d = await q(`query($q:String!,$cid:ID!){ products(first:3, query:$q){ nodes{ id handle status onlineStoreUrl tracksInventory totalInventory inCollection(id:$cid) } } }`, { q: such, cid: c.id });
    const p = d.products.nodes[0];
    if (p) { const b = bewerte(p); return { ...b, mitglied: p.inCollection, via: 'bigbuy' }; }
    return { gefunden: false, via: 'bigbuy-nicht-gefunden', gelesen, vollstaendig };
  }
  return { gefunden: false, gelesen, vollstaendig };
}

async function alleSammlungsbilder() {
  const aus = []; let after = null;
  do {
    const d = await q(`query($a:String){ collections(first:250, after:$a){ pageInfo{ hasNextPage endCursor } nodes{ handle image{ url } } } }`, { a: after });
    aus.push(...d.collections.nodes.filter(n => n.image?.url).map(n => ({ handle: n.handle, url: n.image.url, stamm: L.dateiStamm(n.image.url) })));
    after = d.collections.pageInfo.hasNextPage ? d.collections.pageInfo.endCursor : null;
  } while (after);
  return aus;
}

/** Alle im Onlineshop veröffentlichten Sammlungen MIT Bild (sie stehen samt Bild in der Bild-Sitemap; Gegenprüfung 11.11.: 1 016). */
async function alleMitBild() {
  const aus = []; let after = null;
  do {
    const d = await q(`query($a:String){ collections(first:250, after:$a, query:"published_status:published"){ pageInfo{ hasNextPage endCursor } nodes{ handle image{ url } } } }`, { a: after });
    aus.push(...d.collections.nodes.filter(n => n.image?.url).map(n => n.handle));
    after = d.collections.pageInfo.hasNextPage ? d.collections.pageInfo.endCursor : null;
  } while (after);
  return aus;
}

async function menueHandles() {
  const d = await q(`{ menus(first:10){ nodes{ handle items{ url items{ url items{ url items{ url } } } } } } }`);
  const m = d.menus.nodes.find(n => n.handle === 'main-menu'); const hs = new Set();
  const lauf = it => { for (const x of it || []) { const mm = (x.url || '').match(/\/collections\/([^/?#]+)/); if (mm) hs.add(decodeURIComponent(mm[1])); lauf(x.items); } };
  lauf(m?.items); return [...hs];
}

// ------------------------------------------------------------------ Bilder (ffmpeg)
const mitBreite = (u, w) => u + (u.includes('?') ? '&' : '?') + 'width=' + w;
async function holen(u, versuche = 3) {
  for (let v = 1; v <= versuche; v++) {
    try { const r = await fetch(u, { signal: AbortSignal.timeout(30000) }); if (r.ok) return Buffer.from(await r.arrayBuffer()); if (r.status < 500 && r.status !== 429) throw new Error('HTTP ' + r.status); }
    catch (e) { if (v === versuche) throw e; }
    await schlaf(1500 * v);
  }
  throw new Error('nicht holbar');
}
function ff(args, input) { return execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { input, maxBuffer: 64 * 1024 * 1024 }); }
function rohRgb(buf, n) {   // auf Weiss legen (Transparenz), n×n, rgb24
  return ff(['-i', 'pipe:0', '-filter_complex', `color=white:s=${n}x${n}[b];[0:v]scale=${n}:${n}:flags=area,format=rgba[f];[b][f]overlay=format=rgb:shortest=1,format=rgb24`, '-frames:v', '1', '-f', 'rawvideo', 'pipe:1'], buf);
}
function grau9x8(buf) { return ff(['-i', 'pipe:0', '-vf', 'scale=9:8:flags=area,format=gray', '-frames:v', '1', '-f', 'rawvideo', 'pipe:1'], buf); }
function masse(buf) {
  const o = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', 'pipe:0'], { input: buf }).toString().trim().split('\n')[0];
  const [w, h] = o.split('x').map(Number); return { w, h };
}
const ANALYSE_N = 96;
const analyseCache = new Map();
async function analysieren(url) {
  const k = L.urlStamm(url); if (analyseCache.has(k)) return analyseCache.get(k);
  const buf = await holen(mitBreite(url, 320));
  const rgb = rohRgb(buf, ANALYSE_N);
  const rand = L.randAnalyse(rgb, ANALYSE_N, ANALYSE_N);
  const rahmen = L.rahmen(rgb, ANALYSE_N, ANALYSE_N, rand.bg);
  const a = { ...rand, rahmen, dhash: L.dHash(grau9x8(buf)), rgb };   // rgb (96×96) bleibt für die Kantenprüfung im Speicher, nie im Plan
  analyseCache.set(k, a); return a;
}
const hex = bg => bg.map(v => v.toString(16).padStart(2, '0')).join('');
function komponieren(srcBuf, plan, bg, ziel, maxBytes = 300 * 1024) {
  const { crop: c, ziel: z, W, H } = plan;
  for (const qv of [3, 4, 5, 6, 8]) {
    ff(['-y', '-i', 'pipe:0', '-filter_complex',
      `color=c=0x${hex(bg)}:s=${W}x${H}[b];[0:v]format=rgba,crop=${c.w}:${c.h}:${c.x}:${c.y},scale=${z.w}:${z.h}:flags=lanczos[p];[b][p]overlay=x=${z.x}:y=${z.y}:format=rgb:shortest=1,format=yuvj420p`,
      '-frames:v', '1', '-q:v', String(qv), ziel], srcBuf);
    const n = statSync(ziel).size; if (n <= maxBytes) return { bytes: n, q: qv };
  }
  return { bytes: statSync(ziel).size, q: 8, zuGross: true };
}

// ------------------------------------------------------------------ Gemini
const pruefCacheDatei = join(DATEN, 'pruefcache.json');
let pruefCache = {}; let kiStatus = KI_AUS ? 'aus' : 'an'; let AUFRUFE = 0;
function cacheLaden() { try { pruefCache = JSON.parse(readFileSync(pruefCacheDatei, 'utf8')); } catch { pruefCache = {}; } }
function cacheSpeichern() { mkdirSync(DATEN, { recursive: true }); writeFileSync(pruefCacheDatei, JSON.stringify(pruefCache)); }
async function pruefen(url, kategorie) {
  if (KI_AUS) return null;
  const key = `${L.PROMPT_VERSION}|${MODELL}|${kategorie}|${L.urlStamm(url)}`;
  if (pruefCache[key]) return pruefCache[key].urteil;
  try {
    AUFRUFE++;
    const r = await bildKlassifizieren({ url: mitBreite(url, 768), key: E.GEMINI_API_KEY, keyFallback: E.GEMINI_API_KEY2 || null,
      model: MODELL, modelFallback: 'gemini-flash-lite-latest', base: E.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      prompt: L.pruefPrompt(kategorie), versuche: 3, zeitlimitMs: 60000 });
    if (!r.ok) return { ok: false, unbekannt: true, gruende: ['nicht-pruefbar:' + r.grund] };
    const urteil = L.urteilBewerten(r.c);
    pruefCache[key] = { urteil, zeit: new Date().toISOString() };
    return urteil;
  } catch (e) {
    if (e instanceof GeminiFatal || e?.name === 'GeminiFatal') { KI_AUS = true; kiStatus = 'ausgefallen: ' + String(e.message).slice(0, 120); log('  ⚠ Gemini fällt aus, weiter OHNE KI (alles «ungeprüft»):', e.message); return null; }
    return { ok: false, unbekannt: true, gruende: ['nicht-pruefbar:' + String(e.message).slice(0, 60)] };
  }
}
async function parallel(liste, fn, n = PARALLEL) {
  const aus = new Array(liste.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, liste.length) }, async () => { while (i < liste.length) { const j = i++; aus[j] = await fn(liste[j], j); } }));
  return aus;
}

// ------------------------------------------------------------------ Trockenlauf
async function trockenlauf() {
  let handles = E.MENUE === '1' ? await menueHandles()
    : E.ALLE === '1' ? await alleMitBild()
    : E.HANDLES_DATEI ? readFileSync(E.HANDLES_DATEI, 'utf8').split(/\s+/).filter(Boolean)
    : (E.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
  handles = [...new Set(handles)];
  if (!handles.length) throw new Error('HANDLES=a,b, HANDLES_DATEI=…, MENUE=1 oder ALLE=1 angeben');
  const limit = Number.parseInt(E.LIMIT || '0', 10);
  if (limit > 0 && handles.length > limit) { log(`LIMIT: ${limit} von ${handles.length} Sammlungen (in der gegebenen Reihenfolge)`); handles = handles.slice(0, limit); }
  if (!KI_AUS && !E.GEMINI_API_KEY) { KI_AUS = true; kiStatus = 'aus (kein GEMINI_API_KEY)'; }
  cacheLaden();
  const dir = join(OUT, LAUF); mkdirSync(join(dir, 'bilder'), { recursive: true }); mkdirSync(join(dir, 'kontaktbogen'), { recursive: true });
  log(`Trockenlauf ${LAUF} · ${handles.length} Sammlungen · Teile ${TEILE.join('+')} · KI ${kiStatus} · Ausgabe ${dir}`);

  const alle = await alleSammlungsbilder();
  const stammZahl = new Map(); for (const s of alle) stammZahl.set(s.stamm, (stammZahl.get(s.stamm) || 0) + 1);
  const belegtStaemme = new Set(alle.map(s => s.stamm));
  let belegtHashes = [];
  if (E.DOPPEL_PIXEL === '1') {
    const hc = join(DATEN, 'hashcache.json'); let cache = {}; try { cache = JSON.parse(readFileSync(hc, 'utf8')); } catch {}
    await parallel(alle, async s => { const k = L.urlStamm(s.url); if (!cache[k]) { try { cache[k] = L.dHash(grau9x8(await holen(mitBreite(s.url, 64)))); } catch {} } s.dhash = cache[k]; }, 8);
    mkdirSync(DATEN, { recursive: true }); writeFileSync(hc, JSON.stringify(cache));
    belegtHashes = alle.filter(s => s.dhash).map(s => s.dhash);
  }
  const belegtProdukte = L.belegtAusLedger(ledgerLesen(), handles), kopfBelegung = new Map(), eintraege = [], bericht = [];
  if (belegtProdukte.size) log(`Aus früheren Läufen belegt (Ledger): ${belegtProdukte.size} Quellprodukte`);

  for (const handle of handles) {
    try {
      const c = await sammlungLesen(handle);
      if (!c) { bericht.push(`${handle}: Sammlung fehlt`); continue; }
      const kat = { handle: c.handle, titel: c.title };
      const katName = L.katName(c.title);
      // 1) Produkte durchs Tor
      const ausgeschlossen = {}; const ok = [];
      c.produkte.forEach((p, pos) => {
        const t = L.produktTor(p, { kat, datum: JETZT, sperrTags: SPERR_TAGS, sperrHandles: SPERR_HANDLES });
        if (!t.ok) { const g = t.grund.split(':')[0]; ausgeschlossen[g] = (ausgeschlossen[g] || 0) + 1; return; }
        ok.push({ p, pos });
      });
      // 2) Kandidaten mit Analyse
      const kand = [];
      for (const { p, pos } of ok.slice(0, 28)) {
        const bonus = L.saisonBonus(p.title, kat, JETZT, p.productType), bew = L.bewaehrt(p.rt?.value, p.rc?.value);
        for (const b of L.bildKandidaten(p)) kand.push({ ...b, produktId: p.id, handle: p.handle, titel: p.title, typ: p.productType || '', pos, bonus, bewaehrt: bew });
      }
      await parallel(kand, async k => {
        try { k.analyse = await analysieren(k.url); k.dhash = k.analyse.dhash; }
        catch (e) { k.analyse = null; k.fehler = 'analyse:' + String(e.message).slice(0, 60); }
        if (k.analyse) {
          const box = k.analyse.rahmen;
          k.plan = L.quadratPlan({ w: k.w, h: k.h, box });
          k.erhalt = !k.analyse.ruhig ? null : { desktopHeute: L.zuschnittErhalt(box, k.w, k.h, L.FORMATE.kopfDesktopHeute), desktopPlan: L.zuschnittErhalt(box, k.w, k.h, L.FORMATE.kopfDesktopPlan), handyHeute: L.zuschnittErhalt(box, k.w, k.h, L.FORMATE.kopfHandyHeute) };
        }
      }, 6);
      // 3) Gemini nur so weit wie nötig: Quadrat-Kandidaten nach Punkten, Kopf-Kandidaten nach Rang
      let gemini = 0; const aufrufeVorher = AUFRUFE;
      const frei = k => !belegtProdukte.has(k.produktId) && !belegtStaemme.has(L.dateiStamm(k.url)) && !(k.dhash && belegtHashes.some(h => L.hamming(h, k.dhash) <= 6));
      const quadratListe = kand.filter(k => L.quadratPunkte(k) > -Infinity && frei(k)).sort((a, b) => L.quadratPunkte(b) - L.quadratPunkte(a));
      const kopfListe = L.waehleKopf(kand.map(k => ({ ...k, urteil: { ok: true } })), { anzahl: 40, belegung: kopfBelegung }).map(x => kand.find(k => k.url === x.url));
      const pruefe = async liste => { await parallel(liste, async k => { if (k.urteil === undefined) { k.urteil = await pruefen(k.url, katName); gemini++; } }); };
      if (!KI_AUS) {
        for (let i = 0; i < quadratListe.length && gemini < GEMINI_MAX; i += PARALLEL) {
          await pruefe(quadratListe.slice(i, i + PARALLEL));
          if (quadratListe.slice(0, i + PARALLEL).some(k => k.urteil?.ok === true)) break;
        }
        const vorKopf = gemini;
        if (TEILE.includes('kopf')) for (let i = 0; i < kopfListe.length && gemini - vorKopf < KOPF_MAX; i += PARALLEL) {
          await pruefe(kopfListe.slice(i, i + PARALLEL));
          if (kopfListe.filter(k => k.urteil?.ok === true).length >= 4) break;
        }
      }
      for (const k of kand) if (k.urteil === undefined) k.urteil = null;
      // 4) altes Bild
      const basis = L.sicherungsEintrag({ ...c, kopf: c.kopf?.value ?? null }, JETZT.toISOString());
      const klasse = L.altBildKlasse(c.image);
      const quelle = c.image?.url ? await quelleSuchen(c, c.produkte) : { gefunden: false };
      const doppelt = c.image?.url ? (stammZahl.get(L.dateiStamm(c.image.url)) || 1) - 1 : 0;
      let altUrteil = null;
      if (c.image?.url && klasse === 'foto' && !KI_AUS) { altUrteil = await pruefen(c.image.url, katName); gemini++; if (altUrteil?.unbekannt) altUrteil = null; }
      const entscheid = L.ersetzenEntscheid({ bild: c.image, klasse, quelle, doppelt, altUrteil }, { force: FORCE });
      // 5) neues Quadrat
      let neu = null, og = null, altNeu = null; const hinweise = [];
      if (TEILE.includes('bild') && entscheid.ersetzen) {
        const k = L.waehleQuadrat(kand.filter(frei), { belegtProdukte, belegtHashes });
        if (!k) hinweise.push('kein-taugliches-foto (hell+ruhig+geprüft) — Bild bleibt; Besitzer: Freistellen nötig?');
        else {
          const src = await holen(k.url); const m = masse(src);
          let box = k.analyse.rahmen, zuschnitt = 'rahmen';
          let plan = L.quadratPlan({ w: m.w, h: m.h, box });
          // weicher Schatten/Spiegelung am Zuschnittrand → ganzes Foto einpassen (dessen Rand ist ruhig), sonst stünde eine gerade Kante im Bild
          const kante = L.kantenAnteil(k.analyse.rgb, ANALYSE_N, plan.crop, m.w, m.h, k.analyse.bg);
          if (kante > 0.05) { box = { leer: false, x0: 0, y0: 0, x1: 1, y1: 1 }; zuschnitt = 'ganzes-foto'; plan = L.quadratPlan({ w: m.w, h: m.h, box }); }
          const datei = join(dir, 'bilder', `${c.handle}-quadrat.jpg`);
          const schreib = komponieren(src, plan, k.analyse.bg, datei);
          const buf = readFileSync(datei); const kontrolle = L.randAnalyse(rohRgb(buf, ANALYSE_N), ANALYSE_N, ANALYSE_N);
          const kRahmen = L.rahmen(rohRgb(buf, ANALYSE_N), ANALYSE_N, ANALYSE_N, kontrolle.bg);
          const formatOk = !plan.fehler && kontrolle.ruhig && kontrolle.hell && kRahmen.rand >= 0.06 && !schreib.zuGross;
          if (!formatOk) hinweise.push(`format-kontrolle: ruhig=${kontrolle.ruhig} hell=${kontrolle.hell} rand=${kRahmen.rand} bytes=${schreib.bytes}${plan.fehler ? ' ' + plan.fehler : ''}`);
          const ogPlan = L.einpassPlan({ w: m.w, h: m.h, box, W: 1200, H: 630, randX: 0.08, randY: 0.08 });
          const ogDatei = join(dir, 'bilder', `${c.handle}-og-1200x630.jpg`); komponieren(src, ogPlan, k.analyse.bg, ogDatei); og = { datei: ogDatei, hinweis: 'nur Vorschlag, nicht geschrieben (braucht Theme-Weiche in meta-tags.liquid)' };
          neu = { art: 'komponiert', quelleProdukt: { id: k.produktId, handle: k.handle, titel: k.titel }, quelleBild: { url: k.url, w: m.w, h: m.h, nr: k.nr },
            analyse: { bg: '#' + hex(k.analyse.bg), anteilRuhig: k.analyse.anteil, lum: k.analyse.lum, rahmen: k.analyse.rahmen }, plan, zuschnitt, kante,
            datei, sha256: sha(buf), bytes: schreib.bytes, jpegQ: schreib.q, S: plan.S, kontrolle: { ...kontrolle, rand: kRahmen.rand, formatOk },
            alt: L.altText(c.title, k.titel), pruefung: k.urteil?.ok === true ? 'gemini-ok' : 'ungeprueft', urteil: k.urteil, punkte: L.quadratPunkte(k) };
          if (formatOk) { belegtProdukte.add(k.produktId); if (k.dhash) belegtHashes.push(k.dhash); } else neu.gesperrt = 'format-kontrolle';
        }
      } else if (entscheid.nurAlt) {
        const kq = quelle.gefunden ? c.produkte.find(p => p.id === quelle.produkt?.id) : null;
        altNeu = kq ? L.altText(c.title, kq.title) : L.katName(c.title);
      }
      // 6) Kopf
      let kopf = null;
      if (TEILE.includes('kopf')) {
        const wahl = L.waehleKopf(kand, { anzahl: 4, belegung: kopfBelegung, kiAus: KI_AUS });
        const ids = wahl.map(k => k.produktId);
        const heute = c.kopf?.value ? JSON.parse(c.kopf.value) : null;
        kopf = { ids, produkte: wahl.map(k => ({ id: k.produktId, handle: k.handle, titel: k.titel, bild: k.url, erhalt: k.erhalt, pruefung: k.urteil?.ok === true ? 'gemini-ok' : 'ungeprueft', bonus: k.bonus, bewaehrt: k.bewaehrt })),
          heute, unveraendert: JSON.stringify(heute) === JSON.stringify(ids), schreiben: ids.length === 4 && JSON.stringify(heute) !== JSON.stringify(ids) };
        if (ids.length < 4) hinweise.push(`kopf-zu-wenig:${ids.length} (Kopf bleibt bei der Theme-Logik)`);
        else for (const id of ids) kopfBelegung.set(id, (kopfBelegung.get(id) || 0) + 1);
      }
      const teile = [];
      if (neu && !neu.gesperrt) teile.push('bild'); else if (altNeu && TEILE.includes('alt')) teile.push('alt');
      else if (altNeu) hinweise.push(`alt-text-vorschlag «${altNeu}» (schreiben nur mit TEILE=…,alt)`);
      if (kopf?.schreiben) teile.push('kopf');
      const e = { handle: c.handle, id: c.id, titel: c.title, sortOrder: c.sortOrder, produkteGelesen: c.produkte.length, produkteTauglich: ok.length, basis,
        alt: { klasse, quelle, doppelt, urteil: altUrteil }, entscheid, neu, og, altNeu, kopf, teile, hinweise, ausgeschlossen, gemini, geminiAufrufe: AUFRUFE - aufrufeVorher,
        kandidaten: kand.length,
        kandidatenListe: kand.map(k => ({ handle: k.handle, typ: k.typ, nr: k.nr, pos: k.pos, w: k.w, h: k.h, groesseOk: k.groesseOk, bonus: k.bonus, bewaehrt: k.bewaehrt,
          hell: k.analyse?.hell, ruhig: k.analyse?.ruhig, rand: k.analyse?.rahmen?.rand, erhalt: k.erhalt, planFehler: k.plan?.fehler || null,
          urteil: k.urteil ? (k.urteil.ok ? 'ok' : (k.urteil.gruende || []).join('+')) : null, punkte: L.quadratPunkte(k), fehler: k.fehler || null })) };
      e.kontaktbogen = join(dir, 'kontaktbogen', `${c.handle}.jpg`);
      eintraege.push(e);
      const z = `${c.handle}: ${entscheid.ersetzen ? 'ERSETZEN' : (altNeu ? 'NUR ALT-TEXT' : 'BEHALTEN')} (${entscheid.gruende.join(', ')})`
        + (neu ? ` → ${neu.quelleProdukt.handle} [${neu.pruefung}${neu.gesperrt ? ', GESPERRT ' + neu.gesperrt : ''}] ${neu.S}px ${Math.round(neu.bytes / 1024)} KB` : '')
        + (kopf ? ` · Kopf ${kopf.ids.length}/4${kopf.schreiben ? ' neu' : ''}` : '') + ` · Prüfungen ${gemini} (neu ${AUFRUFE - aufrufeVorher})` + (hinweise.length ? ` · ${hinweise.join(' | ')}` : '');
      bericht.push(z); log(z);
    } catch (e) { const z = `${handle}: FEHLER ${String(e.message).slice(0, 200)}`; bericht.push(z); log(z); }
    cacheSpeichern();
    await schlaf(400);
  }
  const hash = L.planHash(eintraege);
  const plan = { werkzeug: 'kategorie_banner_v2', lauf: LAUF, zeit: JETZT.toISOString(), api: API, teile: TEILE, force: FORCE, ki: kiStatus, modell: KI_AUS ? null : MODELL,
    promptVersion: L.PROMPT_VERSION, planHash: hash, eintraege };
  const planDatei = join(dir, 'plan.json'); writeFileSync(planDatei, JSON.stringify(plan, null, 1));
  try { await kontaktboegen(plan, dir); } catch (e) { bericht.push('Kontaktbögen: FEHLER ' + e.message); log('Kontaktbögen: FEHLER', e.message); }
  const zuSchreiben = eintraege.filter(e => e.teile.length).map(e => e.handle);
  const live = `LIVE=1 PLAN=${planDatei} PLAN_HASH=${hash} MAX=${Math.min(25, Math.max(1, zuSchreiben.length))} node ${join(HIER, 'kategorie_banner_v2.mjs')}`;
  bericht.push('', `Plan: ${planDatei}`, `Plan-Hash: ${hash}`, `Zu schreiben: ${zuSchreiben.length} (${zuSchreiben.join(', ')})`, `Kontaktbögen: ${join(dir, 'kontaktbogen')}`, `KI: ${kiStatus}`, '', 'LIVE (erst nach dem Ansehen der Kontaktbögen):', live);
  writeFileSync(join(dir, 'bericht.txt'), bericht.join('\n') + '\n');
  log('\n' + bericht.slice(-9).join('\n'));
}

// ------------------------------------------------------------------ Kontaktbögen (Playwright, lokal)
const LUX_HERO_CSS = `.lx-hero{position:relative;overflow:hidden;isolation:isolate;background:#2c2118;color:#fff;min-height:230px;display:flex;align-items:center}
.lx-hero__bilder{position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,1fr);z-index:-2}
.lx-hero__bilder img{width:100%;height:100%;object-fit:cover;display:block}
.lx-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(24,17,10,.88) 0%,rgba(24,17,10,.66) 50%,rgba(24,17,10,.34) 100%)}
.lx-hero__text{width:100%;max-width:1200px;margin:0 auto;padding:2.4rem 1.5rem 2.2rem;box-sizing:border-box}
.lx-hero h1{margin:0 0 .6rem;color:#fff;font-size:2.6rem;line-height:1.08;font-weight:700;text-shadow:0 2px 14px rgba(0,0,0,.45)}
.lx-hero__beschr{color:#f4ede0;margin:.4rem 0 0;max-width:62rem}
.handy .lx-hero__bilder{grid-template-columns:repeat(2,1fr)}.handy .lx-hero__bilder img:nth-child(n+3){display:none}.handy .lx-hero__text{padding:1.8rem 1rem 1.6rem}.handy .lx-hero h1{font-size:2.2rem}`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
function bogenHtml(e) {
  const alt = e.basis.bild?.url ? mitBreite(e.basis.bild.url, 640) : '';
  const neu = e.neu ? pathToFileURL(e.neu.datei).href : alt;
  const og = e.og ? pathToFileURL(e.og.datei).href : '';
  const kopfBilder = (e.kopf?.produkte || []).map(p => `<img src="${esc(mitBreite(p.bild, 640))}">`).join('');
  const kopfInfo = (e.kopf?.produkte || []).map((p, i) => `<li>${i + 1}. ${esc(p.titel)} <small>[${p.pruefung}, ${p.erhalt ? `Produkt sichtbar: Desktop ${p.erhalt.desktopPlan}, Handy heute ${p.erhalt.handyHeute}` : 'Szenenfoto (Mitte)'}${p.bonus ? ', Saison' : ''}${p.bewaehrt ? ', bewährt' : ''}]</small></li>`).join('');
  const kachel = (cls, src, label) => `<figure class="k"><div class="${cls}">${src ? `<img src="${esc(src)}">` : ''}</div><figcaption>${label}</figcaption></figure>`;
  return `<!doctype html><meta charset="utf-8"><style>
body{font:14px/1.4 system-ui,sans-serif;margin:16px;background:#fff;color:#222;width:1400px}
h2{margin:0 0 4px;font-size:20px} .meta{color:#555;margin:0 0 10px} .reihe{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;margin:10px 0}
.k{margin:0} figcaption{font-size:12px;color:#444;max-width:330px}
.gross{width:320px;height:320px;background:#ddd;display:flex;align-items:center;justify-content:center}.gross img{max-width:100%;max-height:100%}
.d48{width:48px;height:48px;border-radius:9px;overflow:hidden;background:#f5f0e9}.d48 img{width:100%;height:100%;object-fit:cover}
.d144{width:144px;height:144px;border-radius:27px;overflow:hidden;background:#f5f0e9}.d144 img{width:100%;height:100%;object-fit:cover;image-rendering:pixelated}
.vz{width:300px;aspect-ratio:1.08;background:#eae2d6;display:flex;align-items:center;justify-content:center;overflow:hidden}.vz img{width:100%;height:100%;object-fit:contain}
.ent{width:300px;aspect-ratio:1.12;background:#eee7dc;overflow:hidden}.ent img{width:100%;height:100%;object-fit:contain}
.ogq{width:382px;height:200px;overflow:hidden;background:#ccc}.ogq img{width:100%;height:100%;object-fit:cover}
.ogd{width:382px;height:200px;overflow:hidden;background:#ccc}.ogd img{width:100%;height:100%;object-fit:contain}
.desk{width:1400px}.handy{width:358px}
${LUX_HERO_CSS}
ul{margin:6px 0;padding-left:18px} .warn{color:#a00;font-weight:600}
</style>
<h2>${esc(e.titel)} <small>(${esc(e.handle)})</small></h2>
<p class="meta">Entscheid: <b>${e.entscheid.ersetzen ? 'ERSETZEN' : e.altNeu ? 'NUR ALT-TEXT' : 'BEHALTEN'}</b> · ${esc(e.entscheid.gruende.join(', '))} · altes Bild: ${esc(e.alt.klasse)}, Quelle ${e.alt.quelle?.gefunden ? esc(`${e.alt.quelle.produkt?.handle} (${e.alt.quelle.lieferbar ? 'lieferbar' : 'NICHT lieferbar: ' + e.alt.quelle.grund}${e.alt.quelle.mitglied === false ? ', KEIN Mitglied' : ''})`) : e.alt.quelle?.vollstaendig ? `in keinem der ${esc(e.alt.quelle.gelesen)} Mitglieder` : 'unbekannt'}${e.alt.urteil ? ' · Gemini altes Bild: ' + esc(e.alt.urteil.ok ? 'ok' : e.alt.urteil.gruende.join('+')) : ''}
${e.hinweise.length ? `<br><span class="warn">${esc(e.hinweise.join(' | '))}</span>` : ''}</p>
<div class="reihe">
 ${kachel('gross', alt, `HEUTE: ${esc(e.basis.bild?.width)}×${esc(e.basis.bild?.height)} · Alt «${esc(e.basis.bild?.altText)}»`)}
 ${kachel('gross', neu, e.neu ? `NEU: ${e.neu.S}×${e.neu.S}, ${Math.round(e.neu.bytes / 1024)} KB · ${esc(e.neu.pruefung)}${e.neu.urteil?.gruende?.length ? ' ' + esc(e.neu.urteil.gruende.join('+')) : ''}<br>Quelle: ${esc(e.neu.quelleProdukt.titel)} (Bild ${e.neu.quelleBild.nr}, ${e.neu.quelleBild.w}×${e.neu.quelleBild.h}, Grund ${e.neu.analyse.bg}, Rand vorher ${e.neu.analyse.rahmen.rand})<br>Alt «${esc(e.neu.alt)}»` : 'kein neues Bild')}
</div>
<div class="reihe">
 ${kachel('d48', neu, 'Startseite 48 px')} ${kachel('d144', neu, 'dieselbe Kachel ×3')} ${kachel('vz', neu, 'Verzeichnis 1.08 (contain)')} ${kachel('ent', neu, 'Entdecken 1.12 (contain)')}
 ${kachel('ogq', neu, 'og:image, Mitte 1.91:1 (wie grosse Link-Vorschau; Hypothese)')} ${og ? kachel('ogd', og, 'Vorschlag og 1200×630 (nicht geschrieben)') : ''}
</div>
<p class="meta"><b>Kopf (luxe.kopf_produkte)</b> ${e.kopf ? `${e.kopf.ids.length}/4 ${e.kopf.schreiben ? '→ würde geschrieben' : e.kopf.unveraendert ? '(unverändert)' : '(nicht geschrieben)'}` : '(Teil aus)'}<ul>${kopfInfo}</ul></p>
<div class="desk"><div class="lx-hero" style="height:280px"><div class="lx-hero__bilder">${kopfBilder}</div><div class="lx-hero__text"><h1>${esc(L.katName(e.titel))}</h1><div class="lx-hero__beschr">Desktop 1400 × 280 (Plan Rang 1), gleiches CSS wie lux_hero</div></div></div></div>
<div class="reihe"><div class="handy"><div class="lx-hero" style="height:300px"><div class="lx-hero__bilder">${kopfBilder}</div><div class="lx-hero__text"><h1>${esc(L.katName(e.titel))}</h1><div class="lx-hero__beschr">Handy heute (2 Fotos)</div></div></div></div>
<p class="meta" style="max-width:900px">Ausgeschlossen (Tor): ${esc(Object.entries(e.ausgeschlossen).map(([k, v]) => `${k} ${v}`).join(' · ') || '—')} · gelesen ${e.produkteGelesen}, tauglich ${e.produkteTauglich}, Kandidatenbilder ${e.kandidaten}, Bildprüfungen ${e.gemini} (davon neu ${e.geminiAufrufe})</p></div>`;
}
async function kontaktboegen(plan, dir) {
  let chromium; try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { log('Playwright fehlt: keine Kontaktbögen'); return; }
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1432, height: 900 }, deviceScaleFactor: 1 });
  for (const e of plan.eintraege) {
    const html = join(dir, 'kontaktbogen', `${e.handle}.html`); writeFileSync(html, bogenHtml(e));
    await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.screenshot({ path: e.kontaktbogen, fullPage: true, type: 'jpeg', quality: 80 });
  }
  await browser.close();
}

// ------------------------------------------------------------------ LIVE
async function produkteNachpruefen(ids, cid) {
  const d = await q(`query($ids:[ID!]!,$cid:ID!){ nodes(ids:$ids){ ... on Product{ id handle status onlineStoreUrl tracksInventory totalInventory tags inCollection(id:$cid)
    featuredImage{ url } media(first:8){ nodes{ ... on MediaImage{ image{ url } } } } variants(first:20){ nodes{ availableForSale } } } } }`, { ids, cid });
  const aus = new Map();
  for (const p of d.nodes) {
    if (!p) continue;
    const gruende = [];
    if (p.status !== 'ACTIVE') gruende.push('status-' + p.status.toLowerCase());
    if (!p.onlineStoreUrl) gruende.push('nicht-im-onlineshop');
    if (p.tracksInventory && !(p.totalInventory > 0)) gruende.push('ausverkauft');
    if (!p.variants.nodes.some(v => v.availableForSale)) gruende.push('keine-variante-kaufbar');
    if (!p.inCollection) gruende.push('kein-mitglied');
    if ((p.tags || []).some(t => SPERR_TAGS.includes(t) || L.PRUEF_TAGS.test(t))) gruende.push('sperr-oder-pruef-tag');
    aus.set(p.id, { ...p, gruende, staemme: [p.featuredImage, ...p.media.nodes.map(m => m?.image)].filter(x => x?.url).map(x => L.dateiStamm(x.url)), titelStamm: p.featuredImage?.url ? L.dateiStamm(p.featuredImage.url) : null });
  }
  return aus;
}
async function hochladen(datei, name) {
  const bytes = readFileSync(datei);
  const s = (await q(`mutation($in:[StagedUploadInput!]!){ stagedUploadsCreate(input:$in){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ message } } }`,
    { in: [{ filename: name, mimeType: 'image/jpeg', resource: 'IMAGE', httpMethod: 'POST' }] })).stagedUploadsCreate;
  const t = s.stagedTargets?.[0]; if (!t) throw new Error('Upload-Ziel fehlt ' + JSON.stringify(s.userErrors));
  const fd = new FormData(); for (const p of t.parameters) fd.append(p.name, p.value); fd.append('file', new Blob([bytes], { type: 'image/jpeg' }), name);
  const up = await fetch(t.url, { method: 'POST', body: fd });
  if (!(up.ok || up.status === 201 || up.status === 204)) throw new Error('Upload HTTP ' + up.status);
  return t.resourceUrl;
}
async function bildSetzen(id, src, alt) {
  const u = (await q(`mutation($i:CollectionInput!){ collectionUpdate(input:$i){ collection{ id } userErrors{ field message } } }`, { i: { id, image: { src, altText: alt } } })).collectionUpdate;
  if (u.userErrors.length) throw new Error('collectionUpdate: ' + JSON.stringify(u.userErrors));
}
async function kopfSetzen(id, ids) {
  if (ids == null) {
    const d = (await q(`mutation($m:[MetafieldIdentifierInput!]!){ metafieldsDelete(metafields:$m){ deletedMetafields{ key } userErrors{ field message } } }`, { m: [{ ownerId: id, namespace: 'luxe', key: 'kopf_produkte' }] })).metafieldsDelete;
    if (d.userErrors.length) throw new Error('metafieldsDelete: ' + JSON.stringify(d.userErrors)); return;
  }
  const value = Array.isArray(ids) ? JSON.stringify(ids) : String(ids);
  const r = (await q(`mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{ id } userErrors{ field message } } }`, { m: [{ ownerId: id, namespace: 'luxe', key: 'kopf_produkte', type: 'list.product_reference', value }] })).metafieldsSet;
  if (r.userErrors.length) throw new Error('metafieldsSet: ' + JSON.stringify(r.userErrors));
}
async function cdnOk(u) { try { const r = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(20000) }); return r.status; } catch { return 0; } }
async function frischLesen(handle, pruef, versuche = 4) {
  let c = null;
  const ms = Number(E.FRISCH_MS || 1500);   // Wartezeit vor dem Rücklesen (Tests: FRISCH_MS=0)
  for (let v = 0; v < versuche; v++) { await schlaf(ms + v * ms); c = await sammlungKurz(handle); if (!pruef || pruef(c)) return c; }
  return c;
}
function ledger(z) { mkdirSync(dirname(LEDGER), { recursive: true }); appendFileSync(LEDGER, JSON.stringify(z) + '\n'); }

async function live() {
  if (!E.PLAN) throw new Error('LIVE braucht PLAN=<plan.json> aus einem Trockenlauf');
  const plan = JSON.parse(readFileSync(E.PLAN, 'utf8'));
  if (plan.werkzeug !== 'kategorie_banner_v2') throw new Error('PLAN ist kein kategorie_banner_v2-Plan');
  const hash = L.planHash(plan.eintraege);
  if (hash !== plan.planHash) throw new Error(`Plan verändert (Hash ${hash} ≠ ${plan.planHash})`);
  if (E.PLAN_HASH !== hash) throw new Error(`PLAN_HASH=${E.PLAN_HASH || '(fehlt)'} passt nicht zum Plan (${hash}) — erst die Kontaktbögen dieses Plans ansehen`);
  if (!L.planAlterOk(plan.zeit, JETZT, Number(E.MAX_ALTER_H || 24))) throw new Error(`Plan älter als ${E.MAX_ALTER_H || 24} h (${plan.zeit}) — neuen Trockenlauf machen`);
  const nur = new Set((E.NUR || '').split(',').map(s => s.trim()).filter(Boolean)), ohne = new Set((E.OHNE || '').split(',').map(s => s.trim()).filter(Boolean));
  const max = L.deckel(E.MAX);
  let liste = plan.eintraege.filter(e => e.teile.length && (!nur.size || nur.has(e.handle)) && !ohne.has(e.handle));
  if (liste.length > max) { log(`Deckel: ${max} von ${liste.length} (MAX)`); liste = liste.slice(0, max); }
  log(`LIVE ${LAUF} · Plan ${plan.lauf} (${hash}) · ${liste.length} Sammlungen · Ledger ${LEDGER}`);
  mkdirSync(join(DATEN, 'sicherung'), { recursive: true });
  let fehler = 0, uebersprungen = 0, geschrieben = 0;
  for (const e of liste) {
    const zeile = { art: 'aenderung', lauf: LAUF, plan: plan.lauf, planHash: hash, zeit: new Date().toISOString(), handle: e.handle, id: e.id, teile: [] };
    try {
      if ((e.neu?.pruefung === 'ungeprueft' || e.kopf?.produkte?.some(p => p.pruefung === 'ungeprueft')) && E.UNGEPRUEFT_OK !== '1') { log(`${e.handle}: übersprungen (ungeprüfte Bilder, UNGEPRUEFT_OK=1 nach Sichtung)`); uebersprungen++; continue; }
      const c = await sammlungKurz(e.handle);
      if (!c || c.id !== e.id) throw new Error('Sammlung fehlt oder andere ID');
      const vorher = L.sicherungsEintrag({ handle: c.handle, id: c.id, image: c.bild, kopf: c.kopf }, zeile.zeit);
      const diff = L.basisPruefen(e.basis, vorher);
      if (diff.length) { log(`${e.handle}: übersprungen — seit dem Trockenlauf verändert (${diff.join(', ')})`); uebersprungen++; continue; }
      // Quellprodukte frisch prüfen
      const ids = [...new Set([...(e.teile.includes('bild') ? [e.neu.quelleProdukt.id] : []), ...(e.teile.includes('kopf') ? e.kopf.ids : [])])];
      const nach = ids.length ? await produkteNachpruefen(ids, c.id) : new Map();
      const schlecht = ids.filter(id => !nach.get(id) || nach.get(id).gruende.length);
      if (e.teile.includes('bild') && !nach.get(e.neu.quelleProdukt.id)?.staemme.includes(L.dateiStamm(e.neu.quelleBild.url))) schlecht.push('quellbild-weg');
      if (e.teile.includes('kopf')) for (const p of e.kopf.produkte) { const n = nach.get(p.id); if (n && n.titelStamm !== L.dateiStamm(p.bild)) schlecht.push('titelbild-geaendert:' + p.handle); }
      if (schlecht.length) { log(`${e.handle}: übersprungen — Quelle hat sich geändert (${schlecht.map(id => nach.get(id) ? `${nach.get(id).handle}:${nach.get(id).gruende.join('+')}` : id).join(', ')})`); uebersprungen++; continue; }
      if (e.teile.includes('bild')) { const b = readFileSync(e.neu.datei); if (sha(b) !== e.neu.sha256) throw new Error('Bilddatei weicht vom Plan ab (sha256)'); }
      // Sicherung
      const sich = join(DATEN, 'sicherung', `${e.handle}-${LAUF}.json`);
      writeFileSync(sich, JSON.stringify({ ...vorher, planHash: hash }, null, 1));
      if (vorher.bild?.url) { try { const ext = (L.urlStamm(vorher.bild.url).match(/\.(\w+)$/) || [, 'jpg'])[1]; writeFileSync(sich.replace(/\.json$/, '.' + ext), await holen(vorher.bild.url)); } catch (x) { log(`  Sicherung der Bilddatei nicht möglich (${x.message}); URL ist gesichert`); } }
      zeile.vorher = vorher; zeile.sicherung = sich;
      // Schreiben
      if (e.teile.includes('bild')) {
        const src = await hochladen(e.neu.datei, `kategorie-${e.handle}-${LAUF}.jpg`.replace(/[^\w.-]/g, '-'));
        await bildSetzen(c.id, src, e.neu.alt); zeile.teile.push('bild');
        zeile.quelle = { produkt: e.neu.quelleProdukt, bild: e.neu.quelleBild.url };
      } else if (e.teile.includes('alt')) {
        await bildSetzen(c.id, vorher.bild.url, e.altNeu); zeile.teile.push('bild');
      }
      if (e.teile.includes('kopf')) { await kopfSetzen(c.id, e.kopf.ids); zeile.teile.push('kopf'); zeile.kopfProdukte = e.kopf.produkte.map(p => ({ id: p.id, handle: p.handle, bild: p.bild })); }
      // Rücklesen
      const soll = { bild: e.teile.includes('bild') ? { alt: e.neu.alt, w: e.neu.S, h: e.neu.S, neueDatei: true } : e.teile.includes('alt') ? { alt: e.altNeu, neueDatei: true } : null, kopf: e.teile.includes('kopf') ? e.kopf.ids : null };
      const ist = await frischLesen(e.handle, cc => L.rueckleseBefund(soll, vorher, cc).length === 0);
      const befund = L.rueckleseBefund(soll, vorher, ist);
      if (soll.bild && ist?.bild?.url) { const st = await cdnOk(ist.bild.url); if (st !== 200) befund.push('cdn-' + st); }
      zeile.nachher = L.sicherungsEintrag({ handle: ist?.handle, id: ist?.id, image: ist?.bild, kopf: ist?.kopf }, new Date().toISOString());
      zeile.befund = befund; ledger(zeile); geschrieben++;
      if (befund.length) { log(`${e.handle}: GESCHRIEBEN, aber Rücklesen weicht ab: ${befund.join(', ')} — STOPP (Rücknahme: ZURUECK=1 LIVE=1 HANDLES=${e.handle})`); fehler++; break; }
      log(`${e.handle}: geschrieben (${zeile.teile.join('+')}), zurückgelesen gleich · ${ist.bild?.url?.split('?')[0].split('/').pop() || ''}`);
    } catch (x) {
      if (zeile.teile.length) {
        // Teilweise geschrieben: den Stand gleich lesen und als «nachher» vermerken, sonst hält die Rücknahme unser Bild für fremd
        try { const ist = await sammlungKurz(e.handle); zeile.nachher = L.sicherungsEintrag({ handle: ist?.handle, id: ist?.id, image: ist?.bild, kopf: ist?.kopf }, new Date().toISOString()); zeile.nachherAusAbbruch = true; } catch { /* Rücknahme dann nur mit FREMD_UEBERSCHREIBEN=1 */ }
        zeile.befund = ['abbruch:' + x.message]; ledger(zeile);
      }
      log(`${e.handle}: FEHLER ${String(x.message).slice(0, 200)} — STOPP`); fehler++; break;
    }
    await schlaf(PAUSE_MS);
  }
  log(`\nFertig: geschrieben ${geschrieben}, übersprungen ${uebersprungen}, Fehler ${fehler} · Ledger ${LEDGER}`);
  process.exitCode = fehler ? 1 : (uebersprungen ? 2 : 0);
}

// ------------------------------------------------------------------ Rücknahme
function ledgerLesen() { if (!existsSync(LEDGER)) return []; return readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map(z => JSON.parse(z)); }
async function zurueck() {
  const offen = L.offeneAenderungen(ledgerLesen());
  const nur = new Set((E.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean));
  const liste = [...offen.values()].filter(a => !nur.size || nur.has(a.handle));
  log(`Rücknahme ${SCHREIBEN ? 'LIVE' : 'TROCKENLAUF'} · ${liste.length} offene Änderungen · Ledger ${LEDGER}`);
  let fehler = 0;
  for (const a of liste) {
    try {
      const c = await sammlungKurz(a.handle); const akt = { bild: c?.bild, kopf: c?.kopf };
      const ent = L.rueckEntscheid(a, akt, { fremdUeberschreiben: E.FREMD_UEBERSCHREIBEN === '1' });
      if (ent.aktion !== 'zurueck') { log(`${a.handle}: ${ent.aktion} (${JSON.stringify(ent.teile)})`); continue; }
      if (!SCHREIBEN) { log(`${a.handle}: würde zurücknehmen ${JSON.stringify(ent.teile)} → Bild ${a.vorher.bild ? L.urlStamm(a.vorher.bild.url).split('/').pop() : '(keins)'}`); continue; }
      if (ent.teile.bild === 'zurueck') {
        if (!a.vorher.bild) throw new Error('vorher kein Bild: das Entfernen bitte von Hand im Admin (nicht automatisiert)');
        let src = a.vorher.bild.url;
        if (await cdnOk(src) !== 200) { const f = a.sicherung.replace(/\.json$/, '.' + ((L.urlStamm(src).match(/\.(\w+)$/) || [, 'jpg'])[1])); src = await hochladen(f, basename(f)); }
        await bildSetzen(c.id, src, a.vorher.bild.altText || '');
      }
      if (ent.teile.kopf === 'zurueck') await kopfSetzen(c.id, a.vorher.kopf ? JSON.parse(a.vorher.kopf) : null);
      const ist = await frischLesen(a.handle, cc => (ent.teile.bild !== 'zurueck' || String(cc?.bild?.altText || '') === String(a.vorher.bild?.altText || '')));
      const d = [];
      if (ent.teile.bild === 'zurueck' && (String(ist?.bild?.altText || '') !== String(a.vorher.bild.altText || '') || Number(ist?.bild?.width) !== Number(a.vorher.bild.width))) d.push('bild');
      if (ent.teile.kopf === 'zurueck' && (ist?.kopf ?? null) !== (a.vorher.kopf ?? null)) d.push('kopf');
      ledger({ art: 'zurueck', lauf: a.lauf, zeit: new Date().toISOString(), handle: a.handle, teile: ent.teile, befund: d });
      log(`${a.handle}: zurückgenommen ${d.length ? '— Rücklesen weicht ab: ' + d.join(', ') : '(zurückgelesen gleich)'}`);
      if (d.length) { fehler++; break; }
    } catch (x) { log(`${a.handle}: FEHLER ${x.message} — STOPP`); fehler++; break; }
    await schlaf(PAUSE_MS);
  }
  process.exitCode = fehler ? 1 : 0;
}

// ------------------------------------------------------------------ Wöchentliche Prüfung
async function pruefPhase() {
  const offen = [...L.offeneAenderungen(ledgerLesen()).values()];
  let veraltet = 0;
  for (const a of offen) {
    const c = await sammlungKurz(a.handle); const g = [];
    if (a.teile.includes('bild') && !L.bildGleich(c?.bild, a.nachher?.bild)) g.push('bild-fremd-geaendert');
    const ids = [...new Set([a.quelle?.produkt?.id, ...(a.kopfProdukte || []).map(p => p.id)].filter(Boolean))];
    const nach = ids.length ? await produkteNachpruefen(ids, c.id) : new Map();
    for (const id of ids) { const n = nach.get(id); if (!n) g.push('produkt-weg'); else if (n.gruende.length) g.push(`${n.handle}:${n.gruende.join('+')}`); }
    log(`${a.handle}: ${g.length ? 'VERALTET ' + g.join(', ') : 'ok'}`); if (g.length) veraltet++;
    await schlaf(300);
  }
  log(`\n${offen.length} geprüft, ${veraltet} veraltet${veraltet ? ' → für diese Handles einen neuen Trockenlauf' : ''}`);
  process.exitCode = veraltet ? 3 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await token();
    if (MODUS === 'trocken') await trockenlauf();
    else if (MODUS === 'live') await live();
    else if (MODUS === 'zurueck') await zurueck();
    else await pruefPhase();
  } catch (e) { console.error('FEHLER', e.message); process.exitCode = 1; }
}
