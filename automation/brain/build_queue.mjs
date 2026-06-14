#!/usr/bin/env node
/* LuxeStyle — build_queue.mjs  (Autopost-Queue aus GELERNTEN Captions selbst nachfuellen)
 *
 * Schliesst den Auto-Modus-Kreis: nimmt saubere, kuratierte Produkte (automation/good_products.csv),
 * holt die echten Preise aus dem oeffentlichen Shop (products.json) und baut Captions im vom Gehirn
 * gelernten Gewinner-Stil: Neugier-/Preis-Hook → Produkt + CHF-Preis → Share/Save-Trigger → CTA →
 * gelernte Hashtags (aus automation/brain/pools.json). Schreibt die Cloudflare-Poster-Queue
 * (automation/cloudflare/luxe-poster/src/queue.json) → der Worker postet sie autonom 2x/Tag.
 *
 * Lauf:  node automation/brain/build_queue.mjs            (queue.json neu aufbauen)
 *        node automation/brain/build_queue.mjs --dry      (nur zeigen)
 * No-op-safe: ohne pools.json/Produkte passiert nichts Schaedliches (Fallback-Hashtags).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const GOOD = path.join(ROOT, 'automation', 'good_products.csv');
const POOLS = path.join(ROOT, 'automation', 'brain', 'pools.json');
const OUT = path.join(ROOT, 'automation', 'cloudflare', 'luxe-poster', 'src', 'queue.json');
const DRY = process.argv.includes('--dry');

// Gewinner-Hook-Opener (Neugier/Preis-Kontrast) + Share/Save-Trigger — rotierend, kein Spam.
const OPENERS = [
  'Wusste nicht, dass ich das brauche 👀',
  'Stopp — das musst du sehen ✋',
  'Das gibt es so kaum in der Schweiz 🇨🇭',
  'Kleiner Preis, grosse Wirkung ✨',
  'Genau das hat mir gefehlt 🙌',
];
const TRIGGERS = [
  '💾 Speicher dir das für später',
  '👇 Markier jemanden, der das braucht',
  '👇 Würdest du? Schreib’s in die Kommentare',
  '💾 Merk’s dir · folge für mehr Schweizer Finds',
];

function loadPools() {
  try { return JSON.parse(fs.readFileSync(POOLS, 'utf8')); }
  catch { return { tagsets: ['#tiktokmademebuyit #produkttipp #schweiz #fyp #musthave'] }; }
}
function loadGood() {
  try {
    return fs.readFileSync(GOOD, 'utf8').trim().split('\n').slice(1).map(l => {
      const [handle, image, label] = l.split(',');
      return { handle, image, label: (label || '').trim() };
    }).filter(p => p.handle && p.image);
  } catch { return []; }
}
async function priceMap() {
  const m = {};
  try {
    for (let page = 1; page < 40; page++) {
      const d = await (await fetch(`https://luxestyle.ch/products.json?limit=250&page=${page}`)).json();
      const ps = d.products || []; if (!ps.length) break;
      for (const p of ps) { const v = (p.variants || [])[0]; if (v?.price) m[p.handle] = v.price; }
    }
  } catch {}
  return m;
}
// CSV-Zeile mit Quoting splitten
function splitCsv(line) {
  const out = []; let f = '', q = false;
  for (let i = 0; i < line.length; i++) { const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else { if (c === '"') q = true; else if (c === ',') { out.push(f); f = ''; } else f += c; } }
  out.push(f); return out;
}
// Reels-Pool aus video_queue.csv (NUR funktionierende Shopify-CDN-mp4, keine toten abannews-URLs).
function loadReels() {
  try {
    const lines = fs.readFileSync(path.join(ROOT, 'social', 'video_queue.csv'), 'utf8').trim().split('\n').slice(1);
    const seen = new Set(); const reels = [];
    for (const l of lines) {
      const c = splitCsv(l); const video = (c[2] || '').trim(); const caption = (c[3] || '').trim();
      if (!/cdn\.shopify\.com\/.*\.mp4/.test(video) || seen.has(video)) continue;
      seen.add(video); reels.push({ type: 'reel', video, caption });
    }
    // TÄGLICHE ROTATION: Pool um einen Tages-Offset drehen, damit über die Tage ALLE Assets
    // (Hero-Reels + Selbst-gestalten + Veo) durch die 6 Feed-Slots rotieren — autonome Vielfalt.
    if (reels.length > 1) {
      const off = (Math.floor(Date.now() / 864e5)) % reels.length;
      return reels.slice(off).concat(reels.slice(0, off));
    }
    return reels;
  } catch { return []; }
}

(async () => {
  const pools = loadPools();
  // good_products.csv ist KATEGORIE-GEMISCHT (Beauty/Schmuck/Schuhe/Gadget) → Fashion-Niche-Tags
  // (#sommerkleid) wuerden falsch sitzen. Darum hier eine SICHERE generische Discovery-Basis
  // (spiegelt die Gehirn-Lehre „Discovery statt Marken-Sackgasse"), rotierend gemischt.
  const SAFE = [
    '#tiktokmademebuyit #produkttipp #schweiz #fyp #musthave',
    '#gefundenauftiktok #musthave #schweiz #foryou #lifehack',
    '#tiktokmademebuyit #lifehack #schweiz #fyp #produkttipp',
  ];
  const tagsets = SAFE;
  // SCHWEIZWEIT (User 2026-06-14 „nicht nur Bern"): rotierend über CH-Städte/Tags statt immer #bern.
  const CH_WIDE = ['#zürich', '#basel', '#luzern', '#bern', '#genf', '#swissmade'];
  const goods = loadGood();
  if (!goods.length) { console.log('Keine good_products.csv → No-op.'); process.exit(0); }
  const prices = await priceMap();

  // BILDER (Produkt + Preis + Gewinner-Hook + CH-weite Tags)
  const images = goods.map((p, i) => {
    const opener = OPENERS[i % OPENERS.length];
    const trigger = TRIGGERS[i % TRIGGERS.length];
    const tags = tagsets[i % tagsets.length] + ' ' + CH_WIDE[i % CH_WIDE.length];
    const price = prices[p.handle] ? ` – CHF ${prices[p.handle]}` : '';
    const caption = `${opener} ${p.label}${price}\n${trigger} · –10% mit WELCOME10\n👉 luxestyle.ch/products/${p.handle}\n${tags}`;
    return { type: 'image', image: p.image, caption };
  });
  // REELS (echte CDN-Videos aus video_queue.csv) + STORIES (Produktbilder als Foto-Story, 24h)
  const reels = loadReels();
  const stories = goods.slice(0, 8).map(p => ({ type: 'story', image: p.image }));

  // MIX interleaven: überwiegend Bilder, jede 3. ein Reel, jede 6. eine Story → alle Formate überall.
  const out = []; let ri = 0, si = 0;
  images.forEach((img, i) => {
    out.push(img);
    if (i % 3 === 2 && reels.length) out.push(reels[ri++ % reels.length]);
    if (i % 6 === 5 && stories.length) out.push(stories[si++ % stories.length]);
  });
  const counts = out.reduce((a, x) => (a[x.type] = (a[x.type] || 0) + 1, a), {});

  if (DRY) { console.log(JSON.stringify(out.slice(0, 5), null, 2)); console.log(`… ${out.length} Posts (dry): ${JSON.stringify(counts)}`); process.exit(0); }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`✅ Autopost-Queue neu gebaut: ${out.length} Posts (Mix) → ${path.relative(ROOT, OUT)}`);
  console.log(`   Formate: ${JSON.stringify(counts)} (Bilder+Reels+Stories, alle CH-weit)`);
  console.log('   ⚠️ Nach Queue-Änderung: `wrangler deploy` (Worker bäckt queue.json beim Deploy ein).');
})();
