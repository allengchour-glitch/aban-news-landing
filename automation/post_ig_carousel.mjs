#!/usr/bin/env node
/* LuxeStyle — post_ig_carousel.mjs  (Bilderreihe in EINER Kachel = IG-Carousel, 1 Beschreibung)
 *
 * User 2026-06-17 „Bilderreihe in 1 Bildkachel … mit Beschreibung?" — JA: Instagram-Carousel
 * (2–10 Bilder zum Durchwischen, EINE Caption fürs ganze Post). Nutzt die veredelten Text-Karten
 * (social/text_image_map.json, CDN) der Top-Produkte → swipebares „Top-Auswahl"-Post.
 *
 * Graph-API-Ablauf: pro Bild media(is_carousel_item) → media(media_type=CAROUSEL, children) →
 *   media_publish. Token = META_ACCESS_TOKEN (Page-/IG-Token mit instagram_content_publish).
 *
 * Nutzung:
 *   META_ACCESS_TOKEN=… node automation/post_ig_carousel.mjs            # 6 Top-Karten, Auto-Caption
 *   META_ACCESS_TOKEN=… node automation/post_ig_carousel.mjs --n 8 --caption "…"   # eigene
 *   node automation/post_ig_carousel.mjs --dry                          # nur zeigen
 * ENV: IG_USER_ID (default 17841480560863361). No-op-safe ohne Token/Karten.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const MAP = path.join(ROOT, 'social', 'text_image_map.json');
const TOP = path.join(ROOT, 'automation', 'top_products.csv');
const DONE = path.join(ROOT, 'automation', 'local', 'ig-carousel-done.txt');
const DRY = process.argv.includes('--dry');
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const N = Math.min(10, Math.max(2, Number(arg('--n', 6))));
const TOKEN = process.env.META_ACCESS_TOKEN || '';
const IG = process.env.IG_USER_ID || '17841480560863361';
const API = 'https://graph.facebook.com/v21.0';
const log = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Top-Reihenfolge aus top_products.csv (Gewinner zuerst), nur Karten mit CDN-URL.
function pickCards() {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  let order = [];
  try { order = fs.readFileSync(TOP, 'utf8').trim().split('\n').slice(1).map(l => l.split(',')[0]); } catch {}
  const done = fs.existsSync(DONE) ? fs.readFileSync(DONE, 'utf8') : '';
  const names = (order.length ? order : Object.keys(map)).filter(n => map[n]);
  // Rotation: nimm die nächsten N, die zuletzt nicht im selben Carousel waren (einfacher Tages-Offset).
  const off = Math.floor(Date.now() / 864e5) % Math.max(1, names.length);
  const rot = names.slice(off).concat(names.slice(0, off));
  return rot.slice(0, N).map(n => ({ name: n, url: map[n] }));
}

async function gp(url, params) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const r = await fetch(url, { method: 'POST', body });
  const j = await r.json().catch(() => ({}));
  if (j.error) throw new Error(JSON.stringify(j.error).slice(0, 200));
  return j;
}

(async () => {
  if (!fs.existsSync(MAP)) { log('Keine text_image_map.json → No-op.'); process.exit(0); }
  const cards = pickCards();
  if (cards.length < 2) { log('Zu wenige Karten für ein Carousel (min 2) → No-op.'); process.exit(0); }

  const caption = arg('--caption',
    `Üsi Top-Auswahl bi LuxeStyle ✨ Wüsch durch → dis Lieblingsteil isch sicher drbi 🤍\n` +
    `Schmuck · Mode · Beauty — Premium zum faire Priis.\n` +
    `👉 luxestyle.ch · –10% mit Code WELCOME10\n` +
    `#schweizmode #ootdschweiz #swissstyle #schmuck #shoppingschweiz`);

  log(`Carousel: ${cards.length} Bilder ${DRY ? '(DRY)' : ''}`);
  cards.forEach((c, i) => log(`  ${i + 1}. ${c.name}`));
  if (DRY) { log('Caption:\n' + caption); process.exit(0); }
  if (!TOKEN) { log('Kein META_ACCESS_TOKEN → No-op (kann nicht posten).'); process.exit(0); }

  // 1) Kinder-Container
  const childIds = [];
  for (const c of cards) {
    const j = await gp(`${API}/${IG}/media`, { image_url: c.url, is_carousel_item: 'true' });
    childIds.push(j.id); log('  child ✓', c.name); await sleep(1500);
  }
  // 2) Carousel-Container
  const parent = await gp(`${API}/${IG}/media`, { media_type: 'CAROUSEL', children: childIds.join(','), caption });
  await sleep(4000);
  // 3) Publish
  const pub = await gp(`${API}/${IG}/media_publish`, { creation_id: parent.id });
  fs.appendFileSync(DONE, new Date().toISOString() + ' ' + pub.id + ' ' + cards.map(c => c.name).join('|') + '\n');
  log('✅ Carousel veröffentlicht:', pub.id);
})().catch(e => { log('Fehler:', e.message); process.exit(1); });
