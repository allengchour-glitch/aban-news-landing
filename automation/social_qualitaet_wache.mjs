#!/usr/bin/env node
/* social_qualitaet_wache.mjs — Qualitäts-Wächter für VERÖFFENTLICHTE und GEPLANTE Social-Posts (23.09.2026).
 *
 * Betreiber 23.09.: «fehlerhafte Posts (Versandkosten, Ton, Grösse/Auflösung) erkennen». Bisher prüften nur die
 * Poster VOR dem Post (Wachen in post_guard.mjs, Caption-Umbauer in der Queue). Was schon live steht, sah niemand
 * mehr an — ein Post mit falscher Versandschwelle, totem Produktlink oder stummem Reel blieb für immer im Raster.
 *
 * NUR LESEN. Dieses Skript ändert, löscht, kommentiert und plant NICHTS — weder auf Facebook, Instagram, Metricool
 * noch in Shopify. Es schreibt ausschliesslich den Bericht dropship/SOCIAL-QUALITAET.md (DRY=1: nicht einmal den).
 * Für jeden Befund nennt der Bericht die vorgeschlagene Aktion und ob sie per API ginge (mit Quelle).
 *
 * QUELLEN (alle nur GET):
 *   Facebook   /{seite}/published_posts (TAGE, Standard 60) + /{seite}/video_reels + Foto-Grössen (?ids=…&fields=images)
 *   Instagram  /{ig}/media (IG_N, Standard 100) inkl. insights.metric(views,reach) + children (Karussell)
 *   Metricool  /v2/scheduler/posts (MC_ZURUECK 30 Tage zurück, MC_VOR 7 vor) + /v2/analytics/posts/{tiktok,pinterest}
 *   Shopify    Produkte (Handle / ID / CJ-SKU / exakter Titel), Rabattcodes, Versandprofil (Admin GraphQL 2026-01)
 *
 * PRÜFUNGEN je Post (Medien über ffmpeg — /usr/local/bin/ffprobe ist hier nur ein Dauer-Ersatz):
 *   VERSAND   Gratis-Schwelle ≠ CHF 50 · «gratis» ohne Schwelle · Versandpreis ≠ 7 · Liechtenstein · EU/USA/weltweit
 *             · Lieferzeit-Zusage kürzer als die ehrliche 10–20 Werktage
 *   PREIS     Caption-Preis ≠ Shopify-Preis (Spanne min–max; «ab CHF x» = min)
 *   PRODUKT   Produkt nicht ACTIVE / nicht im Onlineshop / Direktlink tot (Weiterleitung = Hinweis)
 *   FLOSKEL   Knappheit, Fake-Social-Proof, Scam-Marker, Heil-/Wirkversprechen, Threads, Platzhalter (undefined/NaN)
 *   CODE      Rabattcode in der Caption nur, wenn codeDiscountNodeByCode ACTIVE; %-Aussage ohne Code/Streichpreis
 *   FORMAT    Reels 9:16 und ≥720×1280 (Stream-Kopf) · Feed-Bilder Breite ≥1080 (IG: Datei, FB: grösste Fassung)
 *   TON       ebur128: kein Ton / < -40 LUFS = stumm · < -24 LUFS = leise · True Peak > 0 dBTP = übersteuert
 *   ENGLISCH  englischer Lieferantentext in Caption ODER im Bild (Tesseract, 2 Frames je Reel)
 *   DOPPEL    gleiches Produkt / gleiche Datei / gleiche Caption zweimal auf DERSELBEN Plattform; Warengruppe < 72 h
 *   DIREKTLINK  Facebook-Post ohne luxestyle.ch/products/… (auf FB ist der Link klickbar)
 *
 * ENV: TAGE=60 · IG_N=100 · MC_ZURUECK=30 · MC_VOR=7 · MEDIEN=1 (0 = ohne ffprobe/ebur128/OCR) · OCR=1
 *      LIMIT=n (nur die n jüngsten Posts je Plattform prüfen — Stichprobe) · DRY=1 (Bericht nicht schreiben)
 *      CACHE=/tmp/social_qualitaet_cache.json (Medien-Messungen je Post-ID; Medien ändern sich nach dem Post nicht)
 * AUSGABE: dropship/SOCIAL-QUALITAET.md + eine Zeile «SOCIAL-QUALITAET: …» (für Ampel/Keepalive). Exit 0; 1 nur,
 *          wenn KEINE Quelle lesbar war (dann ist «0 Befunde» keine Aussage).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { produktKey, warenFamilie } from './post_guard.mjs';
import { nachlauf } from './eimer_etikette.mjs';

const exf = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
process.chdir(ROOT);

const TAGE = parseInt(process.env.TAGE || '60', 10);
const IG_N = parseInt(process.env.IG_N || '100', 10);
const MC_ZURUECK = parseInt(process.env.MC_ZURUECK || '30', 10);
const MC_VOR = parseInt(process.env.MC_VOR || '7', 10);
const MEDIEN = process.env.MEDIEN !== '0';
const OCR = MEDIEN && process.env.OCR !== '0';
const LIMIT = parseInt(process.env.LIMIT || '0', 10);
const DRY = process.env.DRY === '1';
const CACHE_DATEI = process.env.CACHE || '/tmp/social_qualitaet_cache.json';
const BERICHT = process.env.BERICHT || 'dropship/SOCIAL-QUALITAET.md';
const ARBEIT = '/tmp/social_qualitaet_medien';
const V = 'v21.0';
const FB_SEITE = '1049840534888592';
const UNSERE_APP = '1680844973132194';          // «LuxeStyle Social» — gemessen 23.09. am Feld application der Posts
const SHOP = 'au3j0y-hq.myshopify.com';
const MC_USER = process.env.METRICOOL_USER_ID || '4801419';
const MC_BLOG = process.env.METRICOOL_BLOG_ID || '6227837';
const MC_TZ = 'Europe/Zurich';
const SCHWELLE = 50;                             // öffentliche Aussage: gratis ab CHF 50 (Fakt, Betreiber)
const VERSANDPREIS = 7;                          // Standard CH darunter (gemessen am Versandprofil)
const JETZT = Date.now();
const SEIT = JETZT - TAGE * 864e5;

// ── Zugänge: Werte werden NIE ausgegeben; Fehlertexte laufen durch schwaerze() ───────────────────────────────
const lies = (p) => { try { return fs.readFileSync(p, 'utf8').trim(); } catch { return ''; } };
const META = (process.env.META_ACCESS_TOKEN || lies('/tmp/meta_page_token')).trim();
const IG = (process.env.IG_USER_ID || lies('/tmp/meta_ig_id')).trim();
const SHOPTOK = lies('/tmp/cj_shop_token.txt');
const MC = (process.env.METRICOOL_USER_TOKEN || (/METRICOOL_USER_TOKEN=([^\s'"]+)/.exec(lies('/tmp/metricool.env')) || [])[1] || '').trim();
const GEHEIM = [META, SHOPTOK, MC].filter(s => s && s.length > 8);
function schwaerze(s) {
  let t = String(s ?? '');
  for (const g of GEHEIM) t = t.split(g).join('***');
  return t.replace(/access_token=[^&\s"']+/g, 'access_token=***');
}
const warte = ms => new Promise(r => setTimeout(r, ms));

// ── Cache der Medien-Messungen ───────────────────────────────────────────────────────────────────────────────
let CACHE = {};
try { CACHE = JSON.parse(fs.readFileSync(CACHE_DATEI, 'utf8')); } catch {}
const cacheSpeichern = () => { try { fs.writeFileSync(CACHE_DATEI, JSON.stringify(CACHE)); } catch {} };

// ── HTTP-Helfer (nur GET/POST-Lesen) ─────────────────────────────────────────────────────────────────────────
const quellenFehler = [];
async function graph(pfad, params = {}) {
  const u = pfad.startsWith('https://') ? new URL(pfad) : new URL(`https://graph.facebook.com/${V}/${pfad}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('access_token', META);
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
      const j = await r.json();
      if (j?.error?.code === 4 || j?.error?.code === 17 || j?.error?.code === 32) { await warte(20000 * (a + 1)); continue; }
      return j;
    } catch (e) { await warte(2000 * (a + 1)); if (a === 2) return { error: { message: schwaerze(e.message) } }; }
  }
  return { error: { message: 'Drosselung (Code 4/17/32) nach 3 Versuchen' } };
}
async function graphAlle(pfad, params, stopp) {
  const out = []; let j = await graph(pfad, params); let seiten = 0;
  while (j && !j.error) {
    out.push(...(j.data || []));
    if (stopp && (j.data || []).some(stopp)) break;
    if (!j.paging?.next || ++seiten > 20) break;
    j = await graph(j.paging.next.replace(/access_token=[^&]+&?/, ''));
  }
  return { data: out, error: j?.error };
}
async function mc(pfad) {
  const r = await fetch(`https://app.metricool.com/api${pfad}${pfad.includes('?') ? '&' : '?'}userId=${MC_USER}&blogId=${MC_BLOG}`,
    { headers: { 'X-Mc-Auth': MC }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`Metricool ${r.status}`);
  return r.json();
}
async function gql(query, variables = {}) {
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/2026-01/graphql.json`, {
        method: 'POST', headers: { 'X-Shopify-Access-Token': SHOPTOK, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(60000) });
      const j = await r.json();
      if (j?.errors?.some?.(e => e?.extensions?.code === 'THROTTLED')) { await warte(5000 * (a + 1)); continue; }
      await nachlauf(j);
      if (j.data) return j;
      if (j.errors) return j;
    } catch (e) { await warte(3000 * (a + 1)); }
  }
  return { errors: [{ message: 'Shopify antwortet nicht' }] };
}

// ── Text-Werkzeuge ───────────────────────────────────────────────────────────────────────────────────────────
const ohneHashtags = t => String(t || '').replace(/(^|\s)#[\p{L}\p{N}_]+/gu, ' ');
const norm = t => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const kurz = (t, n = 110) => { const s = String(t || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const zahl = s => parseFloat(String(s).replace(/['’]/g, '').replace(',', '.'));
const umgebung = (t, i, n, vor = 45, nach = 45) => kurz(t.slice(Math.max(0, i - vor), Math.min(t.length, i + n + nach)), vor + nach + n + 4);
const datum = ts => { const d = new Date(ts); return isNaN(d) ? '?' : d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; };

// Preise aus dem Text; Versand-Zusammenhang wird herausgelöst (sonst wäre «ab CHF 50» ein Produktpreis).
function preiseImText(t) {
  const out = []; const re = /(?:CHF|Fr\.)\s*(\d{1,4}(?:[.,]\d{1,2})?)(?:\.[–-])?|(\d{1,4}[.,]\d{2})\s*(?:CHF|Fr\.)/gi; let m;
  while ((m = re.exec(t))) {
    const vor = t.slice(Math.max(0, m.index - 40), m.index);
    const betrag = zahl(m[1] || m[2]);
    const versand = /(versand|liefer|porto|shipping)[^.\n·|]{0,30}$/i.test(vor) || /(gratis|kostenlos|frei)[^.\n·|]{0,25}ab\s*$/i.test(vor);
    const statt = /(statt|anstatt|vorher|uvp|regul[äa]r)\s*$/i.test(vor);
    const ab = /\bab\s*$/i.test(vor);
    out.push({ betrag, versand, statt, ab, i: m.index, len: m[0].length });
  }
  return out;
}
const EN_FUNKTION = new Set(['the', 'and', 'with', 'your', 'you', 'this', 'that', 'for', 'from', 'are', 'is', 'of', 'to', 'it', 'its', 'our', 'can', 'be', 'into', 'will']);
const EN_LEXIKON = new Set([...EN_FUNKTION, 'made', 'natural', 'stone', 'color', 'colour', 'colors', 'change', 'changing', 'easy', 'high', 'quality',
  'waterproof', 'portable', 'adjustable', 'rechargeable', 'wireless', 'battery', 'charging', 'package', 'includes', 'include', 'features',
  'suitable', 'perfect', 'gift', 'women', 'men', 'kids', 'only', 'just', 'now', 'new', 'free', 'shipping', 'size', 'sizes', 'soft',
  'comfortable', 'durable', 'lightweight', 'breathable', 'beautiful', 'cute', 'best', 'buy', 'get', 'order', 'day', 'days', 'time', 'use',
  'using', 'clean', 'cleaning', 'water', 'light', 'power', 'mode', 'modes', 'remote', 'control', 'large', 'small', 'big', 'long', 'short',
  'black', 'white', 'pink', 'blue', 'red', 'green', 'grey', 'gray', 'brown', 'one', 'two', 'three', 'more', 'less', 'hot', 'cold', 'keep',
  'make', 'makes', 'effect', 'effective', 'skin', 'hair', 'face', 'body', 'safe', 'non', 'slip', 'anti', 'fit', 'fits', 'all', 'any',
  'multi', 'function', 'functional', 'steel', 'stainless', 'leather', 'cotton', 'wood', 'glass', 'plastic', 'material', 'upgrade',
  'upgraded', 'version', 'model', 'fast', 'strong', 'super', 'real', 'original', 'genuine', 'washable', 'reusable', 'relief', 'pain']);
// Wörter, die im Deutschen genauso vorkommen, zählen NUR über die Funktionswörter-Regel, nicht allein.
const DE_AUCH = new Set(['material', 'super', 'original', 'anti', 'multi', 'hot', 'fit', 'all', 'will']);
function englisch(woerter) {
  const w = woerter.map(x => x.toLowerCase());
  const lex = w.filter(x => EN_LEXIKON.has(x) && !DE_AUCH.has(x));
  const fkt = new Set(w.filter(x => EN_FUNKTION.has(x) && x !== 'will'));
  return { lex, fkt: [...fkt], treffer: lex.length >= 4 && fkt.size >= 2 };
}
// Im Bild genügen zwei «starke» englische Wörter («color … change» am Diffuser, Betreiber-Raster 23.09.);
// kurze Allerweltswörter (one/new/hot/day …) zählen erst ab drei Treffern mit.
const EN_SCHWACH = new Set(['one', 'two', 'three', 'new', 'hot', 'cold', 'day', 'days', 'time', 'big', 'red', 'all', 'any', 'get', 'buy', 'use',
  'fit', 'fits', 'non', 'mode', 'modes', 'power', 'light', 'free', 'best', 'more', 'less', 'real', 'fast', 'keep', 'make', 'makes', 'water']);
function englischImBild(woerter) {
  const lex = [...new Set(woerter.map(x => x.toLowerCase()).filter(x => EN_LEXIKON.has(x) && !DE_AUCH.has(x)))];
  const stark = lex.filter(x => !EN_SCHWACH.has(x));
  return { lex, treffer: stark.length >= 2 || lex.length >= 3 };
}

// ── Prüf-Muster ──────────────────────────────────────────────────────────────────────────────────────────────
const RX = {
  gratis: /(?:gratis|kostenlos(?:e[rn]?)?|frei(?:e[rn]?)?|free)[\s-]*(?:versand|lieferung|shipping)|versandkostenfrei|versandfrei|portofrei|(?:versand|lieferung)\s+(?:ist\s+)?(?:gratis|kostenlos)/gi,
  schwelle: /ab\s*(?:CHF|Fr\.)?\s*(\d{1,4})(?:[.,]\d{1,2}|\.[–-])?/i,
  versandPreis: /versand(?:kosten)?\s*(?:nur|:|von|für)?\s*(?:CHF|Fr\.)\s*(\d{1,3}(?:[.,]\d{1,2})?)/gi,
  li: /liechtenstein|(?:\bCH\b|schweiz)\s*(?:&|und|\/|\+|,)\s*(?:LI|FL)\b|🇱🇮/gi,
  ausland: /(?:versand|lieferung|liefern|verschick\w*|shipping|ship)[^.\n·|]{0,40}\b(?:EU|Europa|europaweit|weltweit|international|Deutschland|Österreich|Oesterreich|USA|US|worldwide)\b|(?:weltweit(?:er)?|europaweit(?:er)?|internationaler?)\s+(?:versand|lieferung)|\bworldwide\b|🇩🇪|🇦🇹|🇺🇸|🇪🇺/gi,
  euLager: /EU-?Lager|US-?Lager|aus\s+(?:Europa|Deutschland|der\s+EU|den\s+USA)\b/gi,
  lieferzeit: /(?:in|innert|innerhalb(?:\s+von)?|nach)\s*(\d{1,2})\s*(?:[-–]\s*(\d{1,2})\s*)?(?:Werk)?(?:tagen?|Tg\.?|h\b|Std\.?|Stunden)|(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:Werk)?tage|Blitzversand|Express(?:versand|lieferung)|über\s+Nacht|morgen\s+(?:bei\s+dir|geliefert)|next[\s-]day/gi,
  knapp: /nur\s+(?:noch\s+)?heute|nur\s+noch\s+\d+|fast\s+ausverkauft|\blimitiert|\blimited\b|letzte\s+chance|solange\s+(?:der\s+)?vorrat|bald\s+weg|schnell\s+sein|greif\s+zu,?\s+bevor|\bhurry\b|while\s+stocks?\s+last|only\s+\d+\s+left|countdown|endet\s+(?:heute|bald)/gi,
  fakeProof: /(?:tausende|hunderte|\d{3,}\+?)\s+(?:zufriedene|glückliche|begeisterte)\s+(?:Kund|Käuf)|★★★★★|\d+\s*[kK]\+?\s*(?:verkauft|sold)|über\s+\d{3,}\s+verkauft|viral\s+auf\s+tiktok|tiktok\s+made\s+me\s+buy/gi,
  scam: /Designer-?Preis|Schreib(?:\s+uns)?\s+[«"„]?LINK|Bezahl\s+bequem|Luxus\s+zum\s+kleinen\s+Preis|\bDupe\b|Original-?Qualität|\b1:1\b|Spar\s+dir/gi,
  hashtagSpam: /#(?:fyp|foryou|foryoupage|viral|trending|explore)\b/gi,
  chVersand: /(?:versand|lieferung|verschickt|geliefert)\s+(?:direkt\s+|schnell\s+)?(?:aus|ab)\s+(?:der\s+)?Schweiz|Schweizer\s+Lager|ab\s+CH-?Lager|aus\s+dem\s+CH-?Lager/gi,
  heilStark: /\b(?:heilt|kuriert|lindert|therapiert|Schmerzlinderung|schmerzlindernd|klinisch\s+(?:bewiesen|getestet)|medizinisch\s+(?:bewiesen|nachgewiesen)|stärkt\s+(?:das\s+)?Immunsystem|entgiftet|entschlackt|Fettverbrennung|fettverbrennend|Arthrose|Rheuma|Migräne|Ischias\w*|Nagelpilz|Psoriasis|Neurodermitis|Tinnitus|Krampfadern|Cellulite\s+weg)\b/gi,
  heilWeich: /\b(?:gegen\s+(?:Schmerzen|Falten|Cellulite|Akne|Haarausfall|Verspannungen|Kopfschmerzen)|Anti-?Cellulite|Detox|Gewicht\s+verlieren|abnehmen|Durchblutung\s+f(?:ö|oe)rdern)\b/gi,
  threads: /\bthreads(?:\.net)?\b/gi,
  platzhalter: /\bundefined\b|\bNaN\b|\{\{|\}\}|\[object Object\]/g,
  code: /\b(?:Code|Gutschein(?:code)?|Rabattcode)\s*[:«"„]?\s*([A-Z][A-Z0-9]{3,15})\b|\b(WELCOME10|TIKTOK10|FIRST15|GIFT20|BUNDLE20|SHIP50|COMEBACK10)\b/g,
  prozent: /[-–]\s?\d{1,2}\s?%|\d{1,2}\s?%\s*(?:Rabatt|günstiger|off|sparen|reduziert)|spar(?:e|st)?\s+\d{1,2}\s?%/gi,
  direktlink: /luxestyle\.ch\/(?:[a-z]{2}\/)?products\/([a-z0-9][a-z0-9-]*)/gi,
};
const alleTreffer = (re, t) => { const out = []; re.lastIndex = 0; let m; while ((m = re.exec(t))) { out.push(m); if (!re.global) break; } return out; };

// ── Befund-Sammlung ──────────────────────────────────────────────────────────────────────────────────────────
const SCHWERE = { fehler: 0, warnung: 1, hinweis: 2 };
function befund(post, schwere, klasse, beleg, aktion) { post.befunde.push({ schwere, klasse, beleg: kurz(beleg, 240), aktion }); }

// ── 1. QUELLEN LESEN ─────────────────────────────────────────────────────────────────────────────────────────
const posts = [];   // { plattform, typ, id, link, ts, text, medien:[{url, art:'bild'|'video', w?, h?, lokal?}], aufrufe, reichweite, api, befunde:[], ... }
const zaehler = { ig: 0, fb: 0, fbReels: 0, mc: 0, pins: 0 };

async function leseInstagram() {
  if (!META || !IG) { quellenFehler.push('Instagram: kein Meta-Token/IG-ID (/tmp/meta_page_token, /tmp/meta_ig_id)'); return; }
  const felder = 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{id,media_type,media_url},insights.metric(views,reach)';
  let j = await graph(`${IG}/media`, { fields: felder, limit: String(IG_N) });
  let ohneInsights = false;
  if (j.error) { ohneInsights = true; j = await graph(`${IG}/media`, { fields: felder.replace(/,insights[^,]*$/, ''), limit: String(IG_N) }); }
  if (j.error) { quellenFehler.push('Instagram: ' + schwaerze(j.error.message)); return; }
  for (const m of j.data || []) {
    let views = null, reach = null;
    if (!ohneInsights) for (const d of m.insights?.data || []) { if (d.name === 'views') views = d.values?.[0]?.value ?? null; if (d.name === 'reach') reach = d.values?.[0]?.value ?? null; }
    const reel = m.media_product_type === 'REELS' || m.media_type === 'VIDEO';
    const medien = m.media_type === 'CAROUSEL_ALBUM'
      ? (m.children?.data || []).map(c => ({ url: c.media_url, art: c.media_type === 'VIDEO' ? 'video' : 'bild', id: c.id }))
      : [{ url: m.media_url, art: reel ? 'video' : 'bild', id: m.id }];
    posts.push({ plattform: 'instagram', typ: m.media_type === 'CAROUSEL_ALBUM' ? 'karussell' : reel ? 'reel' : 'bild', id: m.id,
      link: m.permalink, ts: Date.parse(m.timestamp), text: m.caption || '', medien, aufrufe: views, reichweite: reach,
      likes: m.like_count, befunde: [] });
    zaehler.ig++;
  }
  // Fehlende Insights einzeln nachholen (ältere Posts vor der Business-Umstellung liefern teils Fehler)
  if (ohneInsights) for (const p of posts.filter(p => p.plattform === 'instagram')) {
    const ins = await graph(`${p.id}/insights`, { metric: 'views,reach' });
    for (const d of ins.data || []) { if (d.name === 'views') p.aufrufe = d.values?.[0]?.value ?? null; if (d.name === 'reach') p.reichweite = d.values?.[0]?.value ?? null; }
  }
}

async function leseFacebook() {
  if (!META) { quellenFehler.push('Facebook: kein Meta-Token'); return; }
  const felder = 'id,message,created_time,permalink_url,status_type,application,insights.metric(post_media_view){values},attachments{media_type,type,url,target{id},subattachments{media_type,type,target{id}}}';
  let r = await graphAlle(`${FB_SEITE}/published_posts`, { fields: felder, limit: '100', since: String(Math.floor(SEIT / 1000)) });
  if (r.error && !r.data.length) r = await graphAlle(`${FB_SEITE}/published_posts`, { fields: felder.replace(',insights.metric(post_media_view){values}', ''), limit: '100', since: String(Math.floor(SEIT / 1000)) });
  if (r.error && !r.data.length) { quellenFehler.push('Facebook-Beiträge: ' + schwaerze(r.error.message)); return; }
  const reels = await graphAlle(`${FB_SEITE}/video_reels`, { fields: 'id,description,created_time,permalink_url,source,length,post_id', limit: '100' },
    v => Date.parse(v.created_time) < SEIT);
  if (reels.error && !reels.data.length) quellenFehler.push('Facebook-Reels: ' + schwaerze(reels.error.message));
  const reelNachPost = new Map(), reelNachId = new Map();
  for (const v of reels.data || []) { if (v.post_id) reelNachPost.set(String(v.post_id), v); reelNachId.set(String(v.id), v); }
  const verbraucht = new Set();
  const fotoIds = [];
  for (const p of r.data) {
    const t = Date.parse(p.created_time); if (t < SEIT) continue;
    const a = p.attachments?.data?.[0] || {};
    if (/cover_photo|profile_media/.test(a.type || '')) continue;       // Profil-/Titelbild-Wechsel sind keine Werbeposts
    const views = p.insights?.data?.[0]?.values?.[0]?.value ?? null;
    const postNr = String(p.id).split('_')[1];
    const reel = reelNachPost.get(postNr) || (a.target?.id && reelNachId.get(String(a.target.id)));
    const medien = [];
    if (reel) { verbraucht.add(String(reel.id)); medien.push({ url: reel.source, art: 'video', id: reel.id, laenge: reel.length }); }
    else if (a.media_type === 'video') medien.push({ url: null, art: 'video', id: a.target?.id });
    else {
      const subs = a.subattachments?.data?.length ? a.subattachments.data : [a];
      for (const s of subs) if (s.target?.id && (s.media_type || 'photo') === 'photo') { medien.push({ url: null, art: 'bild', id: s.target.id, fbFoto: true }); fotoIds.push(s.target.id); }
    }
    posts.push({ plattform: 'facebook', typ: reel || a.media_type === 'video' ? 'reel' : medien.length > 1 ? 'album' : 'bild', id: p.id,
      link: p.permalink_url, ts: t, text: p.message || '', medien, aufrufe: views, app: p.application?.id || null,
      appName: p.application?.name || null, befunde: [] });
    zaehler.fb++;
  }
  // Reels ohne zugehörigen Seitenbeitrag im Fenster (eigene Einträge)
  for (const v of reels.data || []) {
    const t = Date.parse(v.created_time); if (t < SEIT || verbraucht.has(String(v.id))) continue;
    posts.push({ plattform: 'facebook', typ: 'reel', id: v.id, link: v.permalink_url?.startsWith('http') ? v.permalink_url : `https://www.facebook.com${v.permalink_url}`,
      ts: t, text: v.description || '', medien: [{ url: v.source, art: 'video', id: v.id, laenge: v.length }], aufrufe: null, app: null, nurVideo: true, befunde: [] });
    zaehler.fbReels++;
  }
  // Foto-Grössen: grösste gespeicherte Fassung (Facebook skaliert nie hoch)
  for (let i = 0; i < fotoIds.length; i += 50) {
    const teil = fotoIds.slice(i, i + 50);
    const j = await graph('', { ids: teil.join(','), fields: 'images' });
    if (j.error) { quellenFehler.push('Facebook-Fotogrössen: ' + schwaerze(j.error.message)); break; }
    for (const p of posts) for (const m of p.medien) if (m.fbFoto && j[m.id]?.images?.length) {
      const g = j[m.id].images.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
      m.w = g.width; m.h = g.height; m.url = g.source;
    }
  }
}

async function leseMetricool() {
  if (!MC) { quellenFehler.push('Metricool: kein METRICOOL_USER_TOKEN (Env oder /tmp/metricool.env)'); return; }
  const tag = d => new Date(d).toISOString().slice(0, 19);
  try {
    const j = await mc(`/v2/scheduler/posts?start=${tag(JETZT - MC_ZURUECK * 864e5)}&end=${tag(JETZT + MC_VOR * 864e5)}&timezone=${encodeURIComponent(MC_TZ)}`);
    for (const p of Array.isArray(j) ? j : (j.data || [])) {
      const ts = Date.parse((p.publicationDate?.dateTime || '') + 'Z') || JETZT;   // Zürich-Zeit, ±2 h egal fürs Fenster
      for (const pr of p.providers || []) {
        if (pr.network === 'threads') continue;
        const medien = (p.media || []).map(u => {
          const m = /raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/(.+)$/.exec(u || '');
          const lokal = m && fs.existsSync(decodeURIComponent(m[1])) ? decodeURIComponent(m[1]) : null;
          return { url: u, art: /\.(mp4|mov|webm)(\?|$)/i.test(u) ? 'video' : 'bild', id: `mc${p.id}-${path.basename(String(u)).slice(0, 60)}`, lokal };
        });
        const st = String(pr.status || '').toUpperCase();
        posts.push({ plattform: pr.network, typ: medien.some(m => m.art === 'video') ? 'video' : 'bild', id: `metricool:${p.id}`, mcId: p.id,
          link: pr.publicUrl || `(geplant, Metricool ${p.id})`, ts, text: p.text || '', medien, aufrufe: null,
          geplant: !/PUBLISHED/.test(st), mcStatus: st + (pr.detailedStatus ? ` (${pr.detailedStatus})` : ''), befunde: [] });
        zaehler.mc++;
      }
    }
  } catch (e) { quellenFehler.push('Metricool-Planer: ' + schwaerze(e.message)); }
  // Veröffentlichte Pins (auch die vom Hetzner-Agenten, die nie im Planer standen) + TikTok-Zahlen
  try {
    const j = await mc(`/v2/analytics/posts/pinterest?from=${tag(JETZT - MC_ZURUECK * 864e5)}&to=${tag(JETZT)}&timezone=${encodeURIComponent(MC_TZ)}`);
    for (const pin of j.data || []) {
      if (posts.some(p => p.plattform === 'pinterest' && p.text && norm(p.text).slice(0, 60) === norm(pin.description).slice(0, 60))) continue;
      posts.push({ plattform: 'pinterest', typ: 'pin', id: `pin:${pin.id}`, link: `https://www.pinterest.com/pin/${pin.id}/`, ts: Date.parse(pin.createdAt),
        text: `${pin.title || ''}\n${pin.description || ''}`, pinLink: pin.link || '', medien: [], aufrufe: pin.impressions ?? null, befunde: [] });
      zaehler.pins++;
    }
  } catch (e) { quellenFehler.push('Metricool-Pinterest-Analyse: ' + schwaerze(e.message)); }
  try {
    const j = await mc(`/v2/analytics/posts/tiktok?from=${tag(JETZT - MC_ZURUECK * 864e5)}&to=${tag(JETZT)}&timezone=${encodeURIComponent(MC_TZ)}`);
    for (const v of j.data || []) {
      const url = v.shareUrl || v.url || v.link || '';
      const p = posts.find(x => x.plattform === 'tiktok' && url && (x.link === url || url.includes(String(x.link).split('/').pop())));
      if (p) p.aufrufe = v.views ?? v.videoViews ?? v.viewCount ?? p.aufrufe;
    }
  } catch {}
}

// ── 2. PRODUKTE ZUORDNEN ─────────────────────────────────────────────────────────────────────────────────────
function csvLesen(datei) {
  let text = ''; try { text = fs.readFileSync(datei, 'utf8'); } catch { return []; }
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const kopf = rows.shift() || [];
  return rows.map(r => Object.fromEntries(kopf.map((k, i) => [k, r[i] ?? ''])));
}
const LEDGER = [...csvLesen('social/posts_image.csv'), ...csvLesen('automation/reels_seed.csv')].filter(r => (r.post_url || '').trim());
function ledgerZeile(p) {
  const schluessel = [p.id, String(p.id).split('_')[1], p.mcId && `metricool:${p.mcId}`, p.link && String(p.link).replace(/\/$/, '')].filter(Boolean);
  if (p.plattform === 'instagram' && p.link) schluessel.push(p.link.split('/').filter(Boolean).pop());
  return LEDGER.find(r => schluessel.some(k => k && String(k).length > 6 && r.post_url.includes(k)));
}
function produktHinweise(p) {
  const h = [];
  const t = p.text + '\n' + (p.pinLink || '');
  for (const m of alleTreffer(RX.direktlink, t)) h.push({ art: 'handle', wert: m[1], quelle: 'Link im Text' });
  const z = ledgerZeile(p);
  if (z) {
    const pid = /(\d{12,15})\s*$/.exec(z.id || '');
    if (pid) h.push({ art: 'id', wert: pid[1], quelle: 'Ledger ' + z.id.slice(0, 40) });
    const cj = /^cjreel-(.+)$/.exec(z.id || '');
    if (cj) h.push({ art: /^\d{12,15}$/.test(cj[1]) && !/^1[0-9]{18}$/.test(cj[1]) ? 'id' : 'sku', wert: cj[1], quelle: 'Ledger ' + z.id.slice(0, 40) });
  }
  for (const m of p.medien) {
    const r = /reel_([A-Za-z0-9-]{8,})\.mp4/.exec(m.url || '');
    if (r) h.push({ art: 'sku', wert: r[1], quelle: 'Reel-Datei' });
  }
  const name = /[«„"]([^»"“]{4,90})[»"“]/.exec(p.text);
  if (name) h.push({ art: 'titel', wert: name[1].trim(), quelle: '«Name» im Text' });
  const erste = /^([^\n·]{6,90}?)\s*·\s*CHF/m.exec(p.text);
  if (erste) h.push({ art: 'titel', wert: erste[1].trim(), quelle: 'erste Zeile' });
  return h;
}
const PFELDER = 'id title handle status vendor onlineStoreUrl variants(first:1){nodes{sku}} priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}} compareAtPriceRange{maxVariantCompareAtPrice{amount}}';
// CJ-Ware kommt aus China/Übersee (10–20 Werktage) — eine «Blitzversand aus der Schweiz»-Zusage ist dort sicher falsch.
const istCJ = pr => /^CJ-/i.test(pr?.variants?.nodes?.[0]?.sku || '');
const pCache = new Map();
async function produkteAufloesen(anfragen) {
  const offen = [...new Map(anfragen.filter(a => !pCache.has(a.art + ':' + a.wert)).map(a => [a.art + ':' + a.wert, a])).values()];
  const esc = s => JSON.stringify(String(s));
  for (let i = 0; i < offen.length; i += 12) {
    const teil = offen.slice(i, i + 12);
    const q = teil.map((a, k) => {
      if (a.art === 'handle') return `a${k}: productByIdentifier(identifier:{handle:${esc(a.wert)}}){ ${PFELDER} }`;
      if (a.art === 'id') return `a${k}: product(id:${esc('gid://shopify/Product/' + a.wert)}){ ${PFELDER} }`;
      if (a.art === 'sku') return `a${k}: products(first:2, query:${esc('sku:CJ-' + a.wert)}){ nodes{ ${PFELDER} } }`;
      return `a${k}: products(first:3, query:${esc('title:"' + a.wert.replace(/"/g, '') + '"')}){ nodes{ ${PFELDER} } }`;
    }).join('\n');
    const j = await gql(`{ ${q} }`);
    if (!j.data) { quellenFehler.push('Shopify-Produkte: ' + schwaerze(JSON.stringify(j.errors || j).slice(0, 160))); return; }
    teil.forEach((a, k) => {
      const v = j.data[`a${k}`];
      let prod = null;
      if (v?.nodes) {
        // Titel: nur ein EXAKTER Titelgleichstand zählt (Shopify-Suche ist unscharf); SKU: eindeutig
        const kand = a.art === 'titel' ? v.nodes.filter(n => norm(n.title) === norm(a.wert)) : v.nodes;
        prod = kand.length === 1 ? kand[0] : kand.find(n => n.status === 'ACTIVE') || null;
      } else prod = v || null;
      pCache.set(a.art + ':' + a.wert, prod ? { ...prod, _quelle: a.quelle, _art: { handle: 'Link', id: 'Ledger', sku: 'CJ-SKU', titel: 'Titel' }[a.art] } : null);
    });
  }
}
// Kanarienvogel: eine Suche, die für einen sicher unbekannten Wert Treffer liefert, ist blind (Filter still ignoriert)
async function kanarienvogel() {
  const j = await gql(`{ s: products(first:1, query:"sku:CJ-KANARIE-GIBT-ES-NICHT-0923"){ nodes{ id } } t: products(first:1, query:"title:\\"Kanarienvogel gibt es nicht 0923\\""){ nodes{ id } } }`);
  if (!j.data) return 'Shopify nicht lesbar';
  const blind = [];
  if (j.data.s.nodes.length) blind.push('sku:'); if (j.data.t.nodes.length) blind.push('title:');
  return blind.length ? `BLIND: ${blind.join(', ')} liefert Treffer für Unsinn` : 'ok (sku: und title: liefern 0 für Unsinn)';
}
const codeCache = new Map();
async function codeAktiv(code) {
  if (codeCache.has(code)) return codeCache.get(code);
  const j = await gql(`query($c:String!){ codeDiscountNodeByCode(code:$c){ codeDiscount{ __typename ... on DiscountCodeBasic{ status endsAt } ... on DiscountCodeFreeShipping{ status endsAt } ... on DiscountCodeBxgy{ status endsAt } } } }`, { c: code });
  const st = j.data ? (j.data.codeDiscountNodeByCode?.codeDiscount?.status || 'NICHT_GEFUNDEN') : 'UNLESBAR';
  codeCache.set(code, st); return st;
}
async function versandLive() {
  const j = await gql(`{ deliveryProfiles(first:5){ nodes{ name default profileLocationGroups{ locationGroupZones(first:10){ nodes{ zone{ countries{ code{countryCode} } } methodDefinitions(first:10){ nodes{ name active rateProvider{ ... on DeliveryRateDefinition{ price{amount} } } methodConditions{ field operator conditionCriteria{ ... on MoneyV2{amount} } } } } } } } } } }`);
  if (!j.data) return null;
  const gratis = [], bezahlt = [];
  for (const p of j.data.deliveryProfiles.nodes) if (p.default) for (const g of p.profileLocationGroups) for (const z of g.locationGroupZones.nodes) {
    if (!z.zone.countries.some(c => c.code.countryCode === 'CH')) continue;
    for (const m of z.methodDefinitions.nodes) if (m.active) {
      const preis = zahl(m.rateProvider?.price?.amount ?? 'NaN');
      const ab = m.methodConditions.find(c => c.field === 'TOTAL_PRICE' && /GREATER/.test(c.operator));
      if (preis === 0 && ab) gratis.push(zahl(ab.conditionCriteria.amount)); else if (preis > 0) bezahlt.push(preis);
    }
  }
  return { gratisAb: gratis.length ? Math.min(...gratis) : null, standard: bezahlt.length ? Math.min(...bezahlt) : null };
}

// ── 3. MEDIEN MESSEN (ffprobe, ebur128, Tesseract) ───────────────────────────────────────────────────────────
fs.mkdirSync(ARBEIT, { recursive: true });
async function holeDatei(m) {
  if (m.lokal) return m.lokal;
  if (!m.url) return null;
  const ext = m.art === 'video' ? '.mp4' : '.jpg';
  const ziel = path.join(ARBEIT, crypto.createHash('sha1').update(String(m.id || m.url)).digest('hex').slice(0, 16) + ext);
  if (fs.existsSync(ziel) && fs.statSync(ziel).size > 0) return ziel;
  try {
    await exf('curl', ['-s', '-L', '--fail', '--max-time', '90', '--max-filesize', String(150 * 1024 * 1024), '-o', ziel, m.url], { timeout: 100000 });
    return fs.existsSync(ziel) && fs.statSync(ziel).size > 0 ? ziel : null;
  } catch { try { fs.unlinkSync(ziel); } catch {} return null; }
}
// Achtung: /usr/local/bin/ffprobe ist hier ein Python-Ersatz (automation/ffprobe_ersatz.py), der nur die Dauer kennt —
// gemessen 23.09.: Streams/Breite/Höhe fehlen. Deshalb liest diese Funktion den Stream-Kopf von ffmpeg selbst.
async function ffprobe(datei) {
  let err = '';
  try { const r = await exf('ffmpeg', ['-hide_banner', '-i', datei], { timeout: 60000 }); err = r.stderr; }
  catch (e) { err = String(e.stderr || ''); }
  const video = /Stream #\d+:\d+[^\n]*?: Video: [^\n]*?(?<![\dx])(\d{2,5})x(\d{2,5})/.exec(err);
  const rot = /rotation of (-?[\d.]+) degrees/.exec(err);
  const dauer = /Duration: (\d+):(\d+):([\d.]+)/.exec(err);
  if (!video) throw new Error('kein Bild-/Videostrom lesbar');
  let w = Number(video[1]), h = Number(video[2]);
  if (rot && Math.abs(Math.round(Number(rot[1]))) % 180 === 90) [w, h] = [h, w];
  return { w, h, dauer: dauer ? Number(dauer[1]) * 3600 + Number(dauer[2]) * 60 + Number(dauer[3]) : 0, audio: /Stream #\d+:\d+[^\n]*?: Audio:/.test(err) };
}
async function lautheit(datei) {
  try {
    const r = await exf('ffmpeg', ['-hide_banner', '-nostats', '-i', datei, '-vn', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], { timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
    const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
    const I = /I:\s*(-?[\d.]+|-inf)\s*LUFS/.exec(s), P = /True peak:\s*[\s\S]*?Peak:\s*(-?[\d.]+|-inf)\s*dBFS/.exec(s);
    return { I: I ? (I[1] === '-inf' ? -99 : Number(I[1])) : null, TP: P ? (P[1] === '-inf' ? -99 : Number(P[1])) : null };
  } catch (e) { return { I: null, TP: null, fehler: String(e.message).slice(0, 80) }; }
}
const OCR_PY = `
import sys, json, re
from PIL import Image
import pytesseract
b = Image.open(sys.argv[1]).convert('L')
if max(b.size) > 1000:
    f = 1000 / max(b.size); b = b.resize((max(1, int(b.width * f)), max(1, int(b.height * f))))
if max(b.size) < 900:
    f = 900 / max(b.size); b = b.resize((int(b.width * f), int(b.height * f)))
d = pytesseract.image_to_data(b, output_type=pytesseract.Output.DICT, timeout=40)
out = []
for w, k in zip(d['text'], d['conf']):
    try:
        if float(k) >= 60 and re.match(r"^[A-Za-zÄÖÜäöüß']{3,}$", (w or '').strip()): out.append(w.strip())
    except Exception: pass
print(json.dumps(out))
`;
async function ocr(bild) {
  try {
    const { stdout } = await exf('python3', ['-c', OCR_PY, bild], { timeout: 70000, env: { ...process.env, OMP_THREAD_LIMIT: '1' } });
    return JSON.parse(stdout.trim() || '[]');
  } catch { return null; }
}
async function frame(video, sek) {
  const ziel = video.replace(/\.mp4$/, '') + `_f${sek}.png`;
  try { await exf('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(sek), '-i', video, '-frames:v', '1', ziel], { timeout: 60000 }); return fs.existsSync(ziel) ? ziel : null; }
  catch { return null; }
}
async function missMedium(p, m, ocrNoetig) {
  const key = `${p.plattform}:${m.id || m.url}`;
  const alt = CACHE[key];
  if (alt && (!ocrNoetig || alt.ocr !== undefined)) return Object.assign(m, alt);
  const erg = { ...(alt || {}) };
  if (m.fbFoto && m.w) { erg.w = m.w; erg.h = m.h; }
  const brauchtDatei = erg.w == null || (m.art === 'video' && erg.I === undefined) || (ocrNoetig && erg.ocr === undefined);
  const datei = brauchtDatei ? await holeDatei(m) : null;
  if (brauchtDatei && !datei) { erg.unlesbar = m.url ? 'Download gescheitert' : 'keine Medien-Adresse'; return Object.assign(m, erg); }
  try {
    if (erg.w == null) Object.assign(erg, await ffprobe(datei));
    if (m.art === 'video' && erg.I === undefined) Object.assign(erg, erg.audio === false ? { I: -99, TP: -99, keinTon: true } : await lautheit(datei));
    if (ocrNoetig && erg.ocr === undefined) {
      let woerter = [];
      if (m.art === 'bild') woerter = (await ocr(datei)) ?? null;
      else for (const anteil of [0.3, 0.7]) { const f = await frame(datei, Math.max(0.5, (erg.dauer || 10) * anteil)); if (f) { woerter = woerter.concat((await ocr(f)) || []); try { fs.unlinkSync(f); } catch {} } }
      erg.ocr = woerter;
    }
    delete erg.unlesbar;
  } catch (e) { erg.unlesbar = 'Messung gescheitert: ' + String(e.message).slice(0, 60); }
  if (!erg.unlesbar) CACHE[key] = erg;
  if (datei && !m.lokal) { try { fs.unlinkSync(datei); } catch {} }
  return Object.assign(m, erg);
}
async function pool(items, n, fn) {
  let i = 0; const run = async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } };
  await Promise.all(Array.from({ length: n }, run));
}

// ── 4. PRÜFEN ────────────────────────────────────────────────────────────────────────────────────────────────
function apiAktion(p, art) {
  // Kurzform je Befund; die Begründung mit Quelle steht einmal im Abschnitt «Was per API ginge» ([Q1]–[Q3]).
  if (p.plattform === 'facebook') {
    if (art === 'loeschen') return 'Weg: FB-API DELETE /{post-id} [Q1]';
    return p.app === UNSERE_APP || !p.app ? 'Weg: FB-API POST /{post-id} message=… [Q1]'
      : `Weg: Meta Business Suite (Post stammt von ${p.appName || p.app}, API ändert nur eigene Posts) [Q1]`;
  }
  if (p.plattform === 'instagram') return art === 'loeschen' ? 'Weg: IG-App/PC (API-Löschen nur mit Facebook-User-Token) [Q2]' : 'Weg: IG-App (API ändert keine Caption) [Q2]';
  if (p.geplant) return `Weg: Metricool-API ${art === 'loeschen' ? 'DELETE' : 'PATCH'} /v2/scheduler/posts/{id} [Q3]`;
  if (p.plattform === 'tiktok') return 'Weg: TikTok-App / Hetzner-Agent (veröffentlicht, nicht per API) [Q3]';
  if (p.plattform === 'youtube') return 'Weg: YouTube Studio (kein YouTube-Token hier) [Q3]';
  if (p.plattform === 'pinterest') return 'Weg: Pinterest-App / Hetzner-Agent (kein Pinterest-Token hier)';
  return 'Weg: manuell';
}
const VIELE_AUFRUFE = 500;   // Hausregel: Posts > 500 Views nie löschen
function loeschenOderNicht(p, grund) {
  if ((p.aufrufe || 0) > VIELE_AUFRUFE) return `NICHT löschen (${p.aufrufe} Aufrufe > ${VIELE_AUFRUFE}, Hausregel) — Caption korrigieren. ${apiAktion(p, 'caption')}`;
  return `${grund}: löschen und sauber neu posten. ${apiAktion(p, 'loeschen')}`;
}

async function pruefeText(p, produkt, live) {
  const t = p.text || ''; const tt = ohneHashtags(t);
  if (!t.trim() && p.plattform !== 'pinterest') befund(p, 'warnung', 'TEXT', 'Beitrag ohne Text', `Caption ergänzen. ${apiAktion(p, 'caption')}`);
  // VERSAND
  const gratis = alleTreffer(RX.gratis, tt);
  const schwellen = [];
  for (const g of gratis) {
    const nach = tt.slice(g.index + g[0].length, g.index + g[0].length + 30);
    const vor = tt.slice(Math.max(0, g.index - 30), g.index);
    const m = RX.schwelle.exec(nach) || /ab\s*(?:CHF|Fr\.)?\s*(\d{1,4})(?:[.,]\d{1,2})?[^.\n]{0,12}$/i.exec(vor);
    if (m) schwellen.push({ wert: Number(m[1]), beleg: umgebung(tt, g.index, g[0].length, 20, 30) });
    else schwellen.push({ wert: null, beleg: umgebung(tt, g.index, g[0].length, 20, 30) });
  }
  const schwelleIrgendwo = new RegExp(`ab\\s*(?:CHF|Fr\\.)\\s*${SCHWELLE}\\b`, 'i').test(tt);
  for (const s of schwellen) {
    if (s.wert === null && !schwelleIrgendwo && !schwellen.some(x => x.wert === SCHWELLE)) befund(p, 'fehler', 'VERSAND', `«Gratis-Versand» ohne Schwelle: «${s.beleg}» (gilt erst ab CHF ${SCHWELLE})`, `Caption korrigieren («Gratis-Versand ab CHF ${SCHWELLE}»). ${apiAktion(p, 'caption')}`);
    else if (s.wert !== null && s.wert !== SCHWELLE) befund(p, 'fehler', 'VERSAND', `Gratis-Schwelle CHF ${s.wert} statt ${SCHWELLE}: «${s.beleg}»${live?.gratisAb != null ? ` (live: gratis ab CHF ${live.gratisAb} nach Rabatt → öffentliche Aussage ${SCHWELLE})` : ''}`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
  }
  for (const m of alleTreffer(RX.versandPreis, tt)) {
    const v = zahl(m[1]); if (v === 0 || Math.abs(v - VERSANDPREIS) < 0.01 || v === SCHWELLE) continue;
    befund(p, 'fehler', 'VERSAND', `Versandpreis CHF ${m[1]} statt ${VERSANDPREIS}.–: «${umgebung(tt, m.index, m[0].length, 15, 25)}»`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
  }
  for (const m of alleTreffer(RX.li, t)) befund(p, 'fehler', 'VERSAND', `Liechtenstein erwähnt (Markt = nur CH seit 22.09.): «${umgebung(t, m.index, m[0].length, 25, 25)}»`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
  for (const m of alleTreffer(RX.ausland, tt)) if (!/aus\s+(?:dem\s+|der\s+|den\s+)?(?:EU|Europa|Deutschland|USA|US)\b/i.test(m[0]) && !/^-?Lager/i.test(tt.slice(m.index + m[0].length))) befund(p, 'fehler', 'VERSAND', `Auslandsversand zugesagt (Shop liefert nur CH): «${umgebung(tt, m.index, m[0].length, 20, 25)}»`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
  for (const m of alleTreffer(RX.euLager, tt)) befund(p, 'hinweis', 'VERSAND', `Lagerherkunft genannt: «${umgebung(tt, m.index, m[0].length, 25, 25)}» — Lieferzeit/Zoll für CH-Kundinnen prüfen`, 'prüfen; bei falscher Erwartung Caption anpassen');
  let chGemeldet = false;
  for (const m of alleTreffer(RX.chVersand, tt)) {
    if (produkt && istCJ(produkt) && !chGemeldet && (chGemeldet = true)) befund(p, 'fehler', 'VERSAND', `Versand «aus der Schweiz» zugesagt, Produkt ist CJ-Ware (SKU ${produkt.variants.nodes[0].sku.slice(0, 24)}, 10–20 Werktage): «${umgebung(tt, m.index, m[0].length, 20, 20)}»`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
    else if (!produkt) befund(p, 'hinweis', 'VERSAND', `Versand «aus der Schweiz» zugesagt, Lieferant nicht zuordenbar: «${umgebung(tt, m.index, m[0].length, 20, 20)}»`, 'prüfen');
  }
  for (const m of alleTreffer(RX.lieferzeit, tt)) {
    if (chGemeldet && /Blitz|Express/i.test(m[0])) continue;   // dieselbe Zusage ist schon als «aus der Schweiz» gemeldet
    const kontext = tt.slice(Math.max(0, m.index - 35), m.index + m[0].length + 35);
    if (!/Blitz|Express|next/i.test(m[0]) && !/liefer|versand|zustell|bei\s+dir|ankomm|verschick/i.test(kontext)) continue;
    const tage = [m[1], m[2], m[3], m[4]].filter(Boolean).map(Number);
    const stunden = /h\b|Std|Stunden/i.test(m[0]);
    const kurzZusage = /Blitz|Express|Nacht|morgen|next/i.test(m[0]) || stunden || (tage.length && Math.max(...tage) < 10);
    if (kurzZusage && produkt && istCJ(produkt)) befund(p, 'fehler', 'VERSAND', `Lieferzeit-Zusage «${m[0]}» für CJ-Ware (10–20 Werktage): «${umgebung(tt, m.index, m[0].length, 20, 20)}»`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
    else if (kurzZusage) befund(p, 'warnung', 'VERSAND', `Lieferzeit-Zusage kürzer als die ehrliche Angabe 10–20 Werktage: «${umgebung(tt, m.index, m[0].length, 20, 20)}»`, `nur stehen lassen, wenn das Produkt ab CH-Lager kommt; sonst Caption korrigieren. ${apiAktion(p, 'caption')}`);
  }
  // PREIS
  const preise = preiseImText(tt).filter(x => !x.versand && !x.statt && x.betrag !== SCHWELLE);
  const verschieden = [...new Set(preise.map(x => x.betrag))];
  if (produkt && verschieden.length && verschieden.length <= 2) {
    const min = zahl(produkt.priceRangeV2.minVariantPrice.amount), max = zahl(produkt.priceRangeV2.maxVariantPrice.amount);
    for (const x of preise) {
      const ok = x.ab ? Math.abs(x.betrag - min) < 0.011 : x.betrag >= min - 0.011 && x.betrag <= max + 0.011;
      const lock = x.betrag < min - 0.011;   // Caption billiger als Shop = Lockpreis (Kundin zahlt mehr) → Fehler; teurer = veraltet → Warnung
      if (!ok) { befund(p, lock ? 'fehler' : 'warnung', 'PREIS', `${lock ? 'Lockpreis: ' : 'veraltet: '}Caption CHF ${x.betrag.toFixed(2)}${x.ab ? ' (ab)' : ''}, Shop CHF ${min.toFixed(2)}${max !== min ? '–' + max.toFixed(2) : ''} («${kurz(produkt.title, 60)}», Zuordnung: ${produkt._quelle})`, `Caption auf den Shop-Preis korrigieren. ${apiAktion(p, 'caption')}`); break; }
    }
  } else if (!produkt && verschieden.length && p.plattform !== 'pinterest') p.preisUnpruefbar = true;
  // PRODUKT
  if (p._linkTot) {
    befund(p, 'fehler', 'PRODUKT', `Direktlink /products/${p._handleLink} findet kein Produkt${p._weiterleitung ? ` — Weiterleitung nach ${p._weiterleitung} vorhanden` : ' (404)'}`, p._weiterleitung ? 'Link funktioniert über die Weiterleitung; bei Gelegenheit Caption aktualisieren' : loeschenOderNicht(p, 'Link tot'));
  }
  if (produkt && (produkt.status !== 'ACTIVE' || !produkt.onlineStoreUrl)) {
    befund(p, 'fehler', 'PRODUKT', `Beworbenes Produkt «${kurz(produkt.title, 60)}» ist ${produkt.status}${produkt.onlineStoreUrl ? '' : ', nicht im Onlineshop'} (Zuordnung: ${produkt._quelle})`, loeschenOderNicht(p, 'Produkt nicht kaufbar'));
  }
  // FLOSKEL / SCAM / HEIL / THREADS / PLATZHALTER
  for (const m of alleTreffer(RX.knapp, tt)) befund(p, 'fehler', 'FLOSKEL', `Knappheitsfloskel: «${umgebung(tt, m.index, m[0].length, 20, 20)}»`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
  for (const m of alleTreffer(RX.fakeProof, t)) befund(p, 'fehler', 'FLOSKEL', `Unbelegter Beliebtheitsbeweis: «${umgebung(t, m.index, m[0].length, 20, 20)}»`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
  for (const m of alleTreffer(RX.scam, t)) befund(p, 'warnung', 'FLOSKEL', `Scam-Marker: «${umgebung(t, m.index, m[0].length, 20, 20)}»`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
  const spam = [...new Set(alleTreffer(RX.hashtagSpam, t).map(m => m[0].toLowerCase()))];
  if (spam.length) p.hashtagSpam = spam;   // nur gezählt (Bericht-Zusammenfassung) — bestehende Posts deswegen nicht anfassen
  for (const m of alleTreffer(RX.heilStark, tt)) befund(p, 'fehler', 'FLOSKEL', `Heilversprechen: «${umgebung(tt, m.index, m[0].length, 25, 25)}»`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
  for (const m of alleTreffer(RX.heilWeich, tt)) befund(p, 'warnung', 'FLOSKEL', `Wirkversprechen: «${umgebung(tt, m.index, m[0].length, 25, 25)}»`, `prüfen, ggf. Caption entschärfen. ${apiAktion(p, 'caption')}`);
  for (const m of alleTreffer(RX.threads, tt)) befund(p, 'fehler', 'FLOSKEL', `Threads erwähnt (Threads ist aus): «${umgebung(tt, m.index, m[0].length, 20, 20)}»`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
  for (const m of alleTreffer(RX.platzhalter, t)) befund(p, 'fehler', 'TEXT', `Technik-Platzhalter im Text: «${umgebung(t, m.index, m[0].length, 25, 25)}»`, `Caption korrigieren. ${apiAktion(p, 'caption')}`);
  // CODE + %
  const codes = [...new Set(alleTreffer(RX.code, t).map(m => m[1] || m[2]))];
  const aktiveCodes = [];
  for (const c of codes) {
    const st = await codeAktiv(c);
    if (st === 'ACTIVE') aktiveCodes.push(c);
    else if (st !== 'UNLESBAR') befund(p, 'fehler', 'CODE', `Rabattcode ${c} in der Caption, Shopify: ${st}`, `Code aus der Caption nehmen. ${apiAktion(p, 'caption')}`);
  }
  const prozent = alleTreffer(RX.prozent, tt);
  if (prozent.length && !aktiveCodes.length) {
    const streich = produkt && zahl(produkt.compareAtPriceRange?.maxVariantCompareAtPrice?.amount || 0) > zahl(produkt.priceRangeV2.minVariantPrice.amount);
    if (!streich) befund(p, 'warnung', 'CODE', `Rabattaussage ohne aktiven Code/Streichpreis: «${umgebung(tt, prozent[0].index, prozent[0][0].length, 20, 20)}»`, `belegen oder streichen. ${apiAktion(p, 'caption')}`);
  }
  // ENGLISCH (Caption)
  const en = englisch((tt.match(/[A-Za-zÄÖÜäöüß']{2,}/g) || []));
  if (en.treffer) befund(p, 'warnung', 'ENGLISCH', `Englischer Text in der Caption (${en.lex.slice(0, 8).join(', ')})`, `Caption auf Deutsch (Du-Form). ${apiAktion(p, 'caption')}`);
  // DIREKTLINK (nur FB: dort ist der Link klickbar)
  if (p.plattform === 'facebook' && !alleTreffer(RX.direktlink, t).length) p.ohneDirektlink = true;
  if (p.plattform === 'pinterest' && p.pinLink && !/\/products\//.test(p.pinLink)) befund(p, 'hinweis', 'DIREKTLINK', `Pin verlinkt ${kurz(p.pinLink, 60)} statt einer Produktseite`, 'Pin-Link auf die Produktseite setzen (Pinterest-App)');
}

function pruefeMedien(p) {
  for (const m of p.medien) {
    if (m.unlesbar) { p.medienUnlesbar = (p.medienUnlesbar || 0) + 1; continue; }
    const nr = p.medien.length > 1 ? ` (Medium ${p.medien.indexOf(m) + 1}/${p.medien.length})` : '';
    if (m.art === 'video') {
      if (m.w && m.h) {
        const ratio = m.w / m.h;
        if (Math.abs(ratio - 9 / 16) > 0.02) befund(p, 'warnung', 'FORMAT', `Video ${m.w}×${m.h} ist nicht 9:16 (Verhältnis ${ratio.toFixed(3)})${nr}`, loeschenOderNicht(p, 'falsches Format'));
        else if (m.w < 720 || m.h < 1280) befund(p, 'warnung', 'FORMAT', `Video ${m.w}×${m.h} unter 720×1280${nr}`, loeschenOderNicht(p, 'zu kleine Auflösung'));
      }
      if (m.keinTon) befund(p, 'fehler', 'TON', `Video ohne Tonspur${nr}`, loeschenOderNicht(p, 'stumm'));
      else if (m.I != null && m.I < -40) befund(p, 'fehler', 'TON', `stumm: ${m.I} LUFS${nr}`, loeschenOderNicht(p, 'stumm'));
      else if (m.I != null && m.I < -24) befund(p, 'warnung', 'TON', `leise: ${m.I} LUFS (Ziel −14)${nr}`, loeschenOderNicht(p, 'zu leise'));
      if (m.TP != null && m.TP > 0) befund(p, 'warnung', 'TON', `übersteuert: True Peak +${m.TP} dBTP${nr}`, loeschenOderNicht(p, 'Ton verzerrt'));
    } else if (m.w) {
      if (m.w < 1080) befund(p, m.w < 720 ? 'warnung' : 'hinweis', 'FORMAT', `Bild ${m.w}×${m.h} — Breite unter 1080${p.plattform === 'facebook' ? ' (grösste Fassung, die Facebook gespeichert hat)' : ''}${nr}`, m.w < 720 ? loeschenOderNicht(p, 'unscharf') : 'künftig Bilder ≥1080 px posten (bild_formate.py)');
    }
    if (m.ocr?.length) {
      const e = englischImBild(m.ocr);
      if (e.treffer) befund(p, 'warnung', 'ENGLISCH', `Englischer Lieferantentext im ${m.art === 'video' ? 'Video' : 'Bild'}${nr}: ${e.lex.slice(0, 10).join(', ')}`, loeschenOderNicht(p, 'englischer Bildtext'));
    }
  }
}

function pruefeDoppel(liste) {
  const nachPlattform = {};
  for (const p of liste) (nachPlattform[p.plattform] ||= []).push(p);
  for (const [plattform, ps] of Object.entries(nachPlattform)) {
    ps.sort((a, b) => a.ts - b.ts);
    const produkt = new Map(), datei = new Map(), text = new Map(), familie = [];
    for (const p of ps) {
      if (p.typ === 'karussell' || p.typ === 'album') continue;
      const pk = p.produkt ? 'p:' + p.produkt.id : produktKey(p.text, '') || '';
      const tk = norm(ohneHashtags(p.text)).slice(0, 140);
      const dk = p.medien.map(m => path.basename(String(m.url || '').split('?')[0])).filter(x => /^reel_|\.mp4$/.test(x)).join('|');
      const vorher = (pk && produkt.get(pk)) || (dk && datei.get(dk)) || (tk.length > 40 && text.get(tk));
      if (vorher) {
        const was = pk && produkt.get(pk) ? 'dasselbe Produkt' : dk && datei.get(dk) ? 'dieselbe Videodatei' : 'dieselbe Caption';
        befund(p, dk && datei.get(dk) ? 'fehler' : 'warnung', 'DOPPEL', `${was} schon am ${datum(vorher.ts)} gepostet: ${vorher.link}`, loeschenOderNicht(p, 'Doppelpost'));
      }
      if (pk) produkt.set(pk, produkt.get(pk) || p); if (dk) datei.set(dk, datei.get(dk) || p); if (tk.length > 40) text.set(tk, text.get(tk) || p);
      if (plattform === 'instagram') {
        const f = warenFamilie(p.text);
        const nah = f && familie.find(x => x.f === f && p.ts - x.p.ts < 72 * 3600e3 && x.p !== vorher);
        if (nah) befund(p, 'hinweis', 'DOPPEL', `gleiche Warengruppe «${f}» ${Math.round((p.ts - nah.p.ts) / 3600e3)} h nach ${nah.p.link} (Raster wirkt doppelt)`, 'kein Handlungsbedarf, wenn nicht störend; Poster sperren das seit 23.09. selbst');
        if (f) familie.push({ f, p });
      }
    }
  }
}

// ── 5. ABLAUF ────────────────────────────────────────────────────────────────────────────────────────────────
console.log(`social_qualitaet_wache: lese Quellen (FB ${TAGE} T, IG ${IG_N}, Metricool −${MC_ZURUECK}/+${MC_VOR} T)${DRY ? ' · DRY' : ''}${LIMIT ? ` · LIMIT ${LIMIT}` : ''}`);
await leseInstagram();
await leseFacebook();
await leseMetricool();
if (!posts.length) { console.log('SOCIAL-QUALITAET: keine Quelle lesbar — ' + quellenFehler.join(' | ')); process.exit(1); }

let auswahl = posts;
if (LIMIT) { const g = {}; auswahl = [...posts].sort((a, b) => b.ts - a.ts).filter(p => (g[p.plattform] = (g[p.plattform] || 0) + 1) <= LIMIT); }

// Zwillinge IG ↔ FB (gleiche Caption, < 6 h): OCR nur einmal (IG) — das Bild ist dasselbe.
const igNachText = new Map(posts.filter(p => p.plattform === 'instagram').map(p => [norm(p.text).slice(0, 120), p]));
for (const p of auswahl) if (p.plattform === 'facebook') {
  const z = igNachText.get(norm(p.text).slice(0, 120));
  if (z && Math.abs(z.ts - p.ts) < 6 * 3600e3) { p.zwilling = z; z.zwilling = p; }
}

const SHOP_OK = !!SHOPTOK;
let live = null, kanarie = 'nicht geprüft';
if (SHOP_OK) {
  kanarie = await kanarienvogel();
  live = await versandLive();
  const anfragen = [];
  for (const p of auswahl) { p._hinweise = produktHinweise(p); anfragen.push(...p._hinweise); }
  if (!/^BLIND/.test(kanarie)) await produkteAufloesen(anfragen);
  else quellenFehler.push('Shopify-Suche ' + kanarie + ' → Titel-/SKU-Zuordnung ausgelassen');
  for (const p of auswahl) {
    const handle = p._hinweise.find(h => h.art === 'handle');
    if (handle) { p._handleLink = handle.wert; }
    for (const h of p._hinweise) { const v = pCache.get(h.art + ':' + h.wert); if (v) { p.produkt = v; break; } }
    if (handle && !pCache.get('handle:' + handle.wert) && pCache.has('handle:' + handle.wert)) {
      // Link tot? Weiterleitung nachsehen, bevor «404» gemeldet wird
      const j = await gql(`query($q:String!){ urlRedirects(first:1, query:$q){ nodes{ path target } } }`, { q: `path:/products/${handle.wert}` });
      const r = j.data?.urlRedirects?.nodes?.[0]; if (r) p._weiterleitung = r.target;
      p._linkTot = true;
    }
  }
} else quellenFehler.push('Shopify: kein Token (/tmp/cj_shop_token.txt) → Preis/Produkt/Code nicht geprüft');

for (const p of auswahl) await pruefeText(p, p.produkt || undefined, live);

let medienZahl = 0;
if (MEDIEN) {
  const auftraege = [];
  for (const p of auswahl) for (const m of p.medien) {
    const ocrNoetig = OCR && !(p.plattform === 'facebook' && p.zwilling) && p.plattform !== 'youtube';
    auftraege.push({ p, m, ocrNoetig });
  }
  medienZahl = auftraege.length;
  let fertig = 0;
  await pool(auftraege, 4, async ({ p, m, ocrNoetig }) => {
    await missMedium(p, m, ocrNoetig);
    if (++fertig % 25 === 0) { console.log(`   Medien ${fertig}/${auftraege.length}`); cacheSpeichern(); }
  });
  cacheSpeichern();
  for (const p of auswahl) pruefeMedien(p);
}
pruefeDoppel(auswahl);

// ── 6. BERICHT ───────────────────────────────────────────────────────────────────────────────────────────────
const wichtig = b => b.schwere !== 'hinweis';
const mitBefund = auswahl.filter(p => p.befunde.some(wichtig)).sort((a, b) =>
  Math.min(...a.befunde.map(x => SCHWERE[x.schwere])) - Math.min(...b.befunde.map(x => SCHWERE[x.schwere])) || (b.aufrufe || 0) - (a.aufrufe || 0) || b.ts - a.ts);
const alleB = auswahl.flatMap(p => p.befunde.map(b => ({ ...b, plattform: p.plattform })));
const n = s => alleB.filter(b => b.schwere === s).length;
const klassen = [...new Set(alleB.map(b => b.klasse))].sort();
const plattformen = [...new Set(auswahl.map(p => p.plattform))];
const ohneLink = auswahl.filter(p => p.ohneDirektlink);
const unpruefbar = auswahl.filter(p => p.preisUnpruefbar);
const medienUnlesbar = auswahl.filter(p => p.medienUnlesbar);
const PLATTNAME = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', pinterest: 'Pinterest' };

const md = [];
md.push(`# Social-Qualität — Stand ${datum(JETZT)}`, '');
md.push(`Erzeugt von \`automation/social_qualitaet_wache.mjs\` — **nur lesend**: kein Post, keine Caption, kein Profil und keine Planung wurde geändert. Jede Aktion unten ist ein **Vorschlag**.`, '');
md.push('## Gelesen', '');
md.push(`- Instagram: ${zaehler.ig} Beiträge (letzte ${IG_N}, mit Aufrufen/Reichweite aus Insights)`);
md.push(`- Facebook: ${zaehler.fb} Seitenbeiträge + ${zaehler.fbReels} Reels ohne Seitenbeitrag (letzte ${TAGE} Tage; Profil-/Titelbildwechsel ausgenommen)`);
md.push(`- Metricool-Planer: ${zaehler.mc} Einträge (−${MC_ZURUECK}/+${MC_VOR} Tage) · Pinterest-Analyse: ${zaehler.pins} Pins`);
md.push(`- Geprüft: ${auswahl.length} Beiträge${LIMIT ? ` (Stichprobe LIMIT=${LIMIT} je Plattform)` : ''}, ${MEDIEN ? `${medienZahl} Medien (ffprobe/ebur128${OCR ? '/Tesseract' : ''})` : 'Medien NICHT gemessen (MEDIEN=0)'}`);
md.push(`- Shopify live: Gratisversand CH ab CHF ${live?.gratisAb ?? '?'} Warenkorb nach Rabatt (öffentliche Aussage «ab CHF ${SCHWELLE}» ist damit gedeckt) · Standard CHF ${live?.standard ?? '?'} · Kanarienvogel Suche: ${kanarie}`);
if (quellenFehler.length) md.push(`- ACHTUNG, nicht lesbar: ${quellenFehler.join(' · ')}`);
md.push('');
md.push('## Zusammenfassung', '');
md.push(`**${n('fehler')} Fehler · ${n('warnung')} Warnungen · ${n('hinweis')} Hinweise** — Fehler/Warnungen in ${mitBefund.length} von ${auswahl.length} Beiträgen.`, '');
// Aktions-Übersicht: was der Betreiber (oder ein freigegebener Lauf) tun müsste, getrennt nach Weg
const akt = { fbCaption: 0, igCaption: 0, fbLoeschen: 0, igLoeschen: 0, geschuetzt: 0, andere: 0 };
for (const p of mitBefund) {
  const a = p.befunde.filter(wichtig).map(b => b.aktion).join(' ');
  const loeschen = /löschen und sauber neu posten/.test(a), schutz = /NICHT löschen/.test(a);
  if (schutz) akt.geschuetzt++;
  if (p.plattform === 'facebook') { if (loeschen) akt.fbLoeschen++; else akt.fbCaption++; }
  else if (p.plattform === 'instagram') { if (loeschen) akt.igLoeschen++; else akt.igCaption++; }
  else akt.andere++;
}
md.push('Vorgeschlagene Aktionen (nichts davon ausgeführt):', '');
md.push(`- Facebook: ${akt.fbCaption} × Caption korrigieren · ${akt.fbLoeschen} × löschen/neu posten — beides per API möglich, sobald freigegeben [Q1]`);
md.push(`- Instagram: ${akt.igCaption} × Caption in der App korrigieren (API kann es nicht [Q2]) · ${akt.igLoeschen} × löschen/neu posten (nur App/PC oder Facebook-User-Token [Q2])`);
md.push(`- TikTok/YouTube/Pinterest: ${akt.andere} × in der jeweiligen App (Metricool löscht nur Geplantes [Q3])`);
md.push(`- Schutzregel: ${akt.geschuetzt} Beiträge über ${VIELE_AUFRUFE} Aufrufe → nie löschen, nur Caption`, '');
md.push(`| Klasse | ${plattformen.map(x => PLATTNAME[x] || x).join(' | ')} | Summe |`, `|---|${plattformen.map(() => '---:').join('|')}|---:|`);
for (const k of klassen) md.push(`| ${k} | ${plattformen.map(pl => alleB.filter(b => b.klasse === k && b.plattform === pl).length || '·').join(' | ')} | ${alleB.filter(b => b.klasse === k).length} |`);
const zuordnung = {}; for (const p of auswahl) if (p.produkt) zuordnung[p.produkt._art] = (zuordnung[p.produkt._art] || 0) + 1;
md.push('', `Produkt zugeordnet: ${auswahl.filter(p => p.produkt).length} von ${auswahl.length} Beiträgen (${Object.entries(zuordnung).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}).`);
md.push('', `Dazu: ${ohneLink.length} Facebook-Beiträge ohne Direktlink (Liste unten) · ${unpruefbar.length} Beiträge mit Preis, aber ohne sichere Produktzuordnung · ${medienUnlesbar.length} Beiträge mit nicht messbaren Medien.`, '');
md.push('## Befunde (Fehler zuerst, dann nach Aufrufen; Hinweise stehen gesammelt weiter unten)', '');
if (!mitBefund.length) md.push('Keine Befunde.', '');
let warnBlockOffen = false;
for (const p of mitBefund) {
  const nurWarnung = !p.befunde.some(b => b.schwere === 'fehler');
  if (nurWarnung && !warnBlockOffen) {
    warnBlockOffen = true;
    md.push(`<details><summary>${mitBefund.filter(x => !x.befunde.some(b => b.schwere === 'fehler')).length} Beiträge nur mit Warnungen (aufklappen)</summary>`, '');
  }
  const top = p.befunde.reduce((a, b) => (SCHWERE[b.schwere] < SCHWERE[a.schwere] ? b : a)).schwere.toUpperCase();
  md.push(`### ${top} · ${PLATTNAME[p.plattform] || p.plattform} ${p.typ} · ${datum(p.ts)} · ${p.aufrufe ?? 'n/a'} Aufrufe${p.geplant ? ` · GEPLANT (${p.mcStatus})` : ''}`);
  md.push(`- Post: ${p.link}${p.zwilling ? ` · Zwilling: ${p.zwilling.link}` : ''}`);
  md.push(`- Text: «${kurz(ohneHashtags(p.text), 140)}»`);
  if (p.produkt) md.push(`- Produkt: ${p.produkt.title} (${p.produkt.status}, ${p.produkt.onlineStoreUrl || 'nicht im Onlineshop'}${p.produkt.variants?.nodes?.[0]?.sku ? `, SKU ${p.produkt.variants.nodes[0].sku.slice(0, 28)}` : ''}) — Zuordnung: ${p.produkt._quelle}`);
  const h = p.befunde.filter(b => b.schwere === 'hinweis').length; if (h) md.push(`- (+ ${h} Hinweis${h > 1 ? 'e' : ''}, siehe Hinweis-Liste)`);
  for (const b of p.befunde.filter(wichtig).sort((a, c) => SCHWERE[a.schwere] - SCHWERE[c.schwere])) md.push(`- **${b.schwere.toUpperCase()} ${b.klasse}:** ${b.beleg}  \n  → Vorschlag: ${b.aktion}`);
  md.push('');
}
if (warnBlockOffen) md.push('</details>', '');
const hinweisPosts = auswahl.filter(p => p.befunde.some(b => b.schwere === 'hinweis'));
md.push('## Hinweise (gesammelt)', '');
md.push(`${n('hinweis')} Hinweise in ${hinweisPosts.length} Beiträgen — kein Handlungsdruck, aber Muster für die Motoren. Dazu ${auswahl.filter(p => p.hashtagSpam).length} Beiträge mit generischen Reichweiten-Hashtags (${[...new Set(auswahl.flatMap(p => p.hashtagSpam || []))].join(' ')}) — die Bild-Queue ersetzt sie seit 23.09. durch Sach-Tags; bestehende Posts deswegen nicht anfassen.`, '');
if (hinweisPosts.length) {
  md.push('<details><summary>Liste</summary>', '', '| Plattform | Datum | Aufrufe | Klasse | Hinweis | Post |', '|---|---|---:|---|---|---|');
  for (const p of hinweisPosts.sort((a, b) => (b.aufrufe || 0) - (a.aufrufe || 0))) for (const b of p.befunde.filter(x => x.schwere === 'hinweis'))
    md.push(`| ${PLATTNAME[p.plattform] || p.plattform} | ${datum(p.ts).slice(0, 10)} | ${p.aufrufe ?? 'n/a'} | ${b.klasse} | ${b.beleg.replace(/\|/g, '/')} | ${p.link} |`);
  md.push('', '</details>', '');
}
md.push('## Facebook ohne Direktlink', '');
md.push(`Auf Facebook ist ein Link in der Beschreibung klickbar; «Link in Bio» verschenkt dort den Klick. ${ohneLink.length} Beiträge ohne \`luxestyle.ch/products/…\`. Vorschlag: künftige FB-Beiträge mit Produktlink (Poster), bestehende nur bei Beiträgen mit Reichweite nachtragen — ${apiAktion({ plattform: 'facebook', app: UNSERE_APP }, 'caption')}`, '');
if (ohneLink.length) {
  md.push('<details><summary>Liste</summary>', '');
  for (const p of ohneLink.sort((a, b) => (b.aufrufe || 0) - (a.aufrufe || 0))) md.push(`- ${datum(p.ts)} · ${p.aufrufe ?? 'n/a'} Aufrufe · ${p.link} · «${kurz(p.text, 60)}»${p.app && p.app !== UNSERE_APP ? ` · App: ${p.appName || p.app}` : ''}`);
  md.push('', '</details>', '');
}
md.push('## Nicht prüfbar', '');
md.push(`- Preis ohne sichere Produktzuordnung (${unpruefbar.length}): ${unpruefbar.slice(0, 25).map(p => p.link).join(' · ') || '—'}${unpruefbar.length > 25 ? ' …' : ''}`);
md.push(`- Medien nicht messbar (${medienUnlesbar.length}): ${medienUnlesbar.slice(0, 25).map(p => `${p.link} (${p.medien.find(m => m.unlesbar)?.unlesbar})`).join(' · ') || '—'}`);
md.push('- TikTok/YouTube: Format und Ton werden an der hochgeladenen Datei gemessen (Repo `social/reels/` bzw. Metricool-Medium), nicht an der Plattform-Fassung.', '');
md.push('## Was per API ginge — Quellen (abgerufen 23.09.2026)', '');
md.push('- **[Q1] Facebook-Seitenbeiträge** — https://developers.facebook.com/docs/pages-api/posts : Update per `POST /{page_post_id}`, Löschen per `DELETE /{page_post_id}`, Recht `pages_manage_posts`; «An app can only update a Page post if the post was made using that app.» Die Video-Referenz (https://developers.facebook.com/docs/graph-api/reference/video/) dokumentiert kein Update/Delete — Reels über ihren Seitenbeitrag.');
md.push('- **[Q2] Instagram-Media** — https://developers.facebook.com/docs/instagram-platform/reference/instagram-media : Updating = nur `comment_enabled` (Caption NICHT änderbar). Deleting = `DELETE /<IG_MEDIA_ID>` nur «Instagram API with Facebook login», **Facebook User access token**, Rechte `instagram_basic` + `instagram_manage_contents`; «Non-ad posts, Stories, Reels and entire carousel albums are supported.» Unser Zugang ist ein Seiten-Token → Löschen aus dieser Umgebung laut Doku nicht vorgesehen.');
md.push('- **[Q3] Metricool** — OpenAPI (`/tmp/mc_swagger.json`): `DELETE /v2/scheduler/posts/{id}` und `PATCH /v2/scheduler/posts/{id}` betreffen **geplante** Beiträge; veröffentlichte TikTok-/YouTube-Posts lassen sich darüber nicht zurückholen.', '');
md.push('## Prüfen / erneut laufen lassen', '');
md.push('```', '/opt/node22/bin/node automation/social_qualitaet_wache.mjs            # voller Lauf, schreibt diesen Bericht', 'LIMIT=10 DRY=1 /opt/node22/bin/node automation/social_qualitaet_wache.mjs   # Stichprobe, schreibt nichts', 'MEDIEN=0 /opt/node22/bin/node automation/social_qualitaet_wache.mjs   # nur Texte/Preise/Produkte (schnell)', '```', '');

const zeile = `SOCIAL-QUALITAET: ${n('fehler')} Fehler · ${n('warnung')} Warnungen · ${n('hinweis')} Hinweise in ${mitBefund.length}/${auswahl.length} Posts (IG ${zaehler.ig}, FB ${zaehler.fb + zaehler.fbReels}, Metricool ${zaehler.mc}, Pins ${zaehler.pins})${quellenFehler.length ? ` · ACHTUNG ${quellenFehler.length} Quelle(n) unlesbar` : ''}`;
if (DRY) {
  console.log('DRY: Bericht NICHT geschrieben. Erste Befunde:');
  for (const p of mitBefund.slice(0, 12)) for (const b of p.befunde.slice(0, 3)) console.log(`   [${b.schwere}] ${p.plattform} ${p.typ} ${p.aufrufe ?? '-'} Aufr. · ${b.klasse}: ${b.beleg.slice(0, 150)}`);
} else {
  fs.writeFileSync(BERICHT, md.join('\n'));
  console.log(`Bericht: ${BERICHT}`);
}
if (quellenFehler.length) console.log('Quellen-Hinweise: ' + quellenFehler.join(' | '));
console.log(zeile);
