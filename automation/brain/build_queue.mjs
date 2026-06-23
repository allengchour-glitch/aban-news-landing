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
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
// NUR TOP-PRODUKTE (User 2026-06-17 „nutze nur top produkten"): top_products.csv bevorzugen,
// sonst Fallback auf den vollen kuratierten Pool.
const TOP = path.join(ROOT, 'automation', 'top_products.csv');
const GOOD = fs.existsSync(TOP) ? TOP : path.join(ROOT, 'automation', 'good_products.csv');
// TEXT-IM-BILD (User 2026-06-17 „mit text videos und bilder ab iz"): Map name→CDN-URL der
// veredelten Bild-Karte (LUXESTYLE-Wortmarke + Produktname + Rabatt-Pill). Wenn vorhanden,
// posten wir die Text-Karte statt des nackten Produktbilds.
const TEXTMAP = path.join(ROOT, 'social', 'text_image_map.json');
const POOLS = path.join(ROOT, 'automation', 'brain', 'pools.json');
const OUT = path.join(ROOT, 'automation', 'cloudflare', 'luxe-poster', 'src', 'queue.json');
// TRUST-Zeilen (Recherche 2026-06-19 „Vertrauen VOR Verkauf"): WAHR, keine Fake-Reviews. Bild + Reel.
const TRUST_LINES = [
  // QUALITÄTSFÜHRER-Signal (YouTube-Lehre: nicht Preiskampf, sondern Qualität/Trust differenzieren).
  '💎 Wasserfescht-Garantie · lauft nid a oder Geld zrugg · 🇨🇭 Schweizer Shop',
  '🇨🇭 Schweizer Shop · TWINT/Charte · 30 Tage Rückgab · gratis ab CHF 65',
  '✅ Anlauffrei & hypoallergä · sichä zahle mit TWINT · schnälle CH-Versand',
  '🤍 100% sichere Bstellig · TWINT & Charte · gratis Versand ab CHF 65 · 🇨🇭',
];
const DRY = process.argv.includes('--dry');

// Gewinner-Hook-Opener (Neugier/Preis-Kontrast) + Share/Save-Trigger — rotierend, kein Spam.
// Mix aus Bärndütsch (bester Hook-Typ, Ø 793 V — siehe berndeutsch.json) + Hochdeutsch.
// ⚠️ 2026-06-14: Liste erweitert (vorher 6 → Opener wiederholten sich 3× pro Queue = sah wie Doppel-Post aus).
const OPENERS = [
  // 🏆 DATEN+RECHERCHE 2026-06-23: Hook-Scoreboard = mundart Ø797 >> preis_vergleich Ø389 > generisch Ø320
  // > preis-only Ø164 > frage_cta Ø52 (SCHLECHTESTE). Recherche (opus.pro/darkroom/shopify 2026): schwache
  // Poll-Fragen floppen; CONTRARIAN / NEUGIER-LÜCKE / SPEZIFITÄT + Mundart erzwingen Reaktion in Sek 0–3.
  // → Gewinner-Hooks zuerst (Mundart-Statement, contrarian, curiosity), schwache Fragen raus/nach hinten.
  // Mundart = Default (Daten 2026-06-23: Mundart Ø644 vs Nicht-Mundart Ø315 = 2x). Neutral/bärndütsch-getönt,
  // hochdeutsch-nah geschrieben (Lesbarkeit), keine Teutonismen. Quelle: dropship/MUNDART-GUIDE-2026.md.
  'Niemmer glaubt, dass das so günstig isch 👀', // contrarian/curiosity (Top-Typ)
  'Hör uf tüüri Sache z chaufe — lueg das aa 👀',// contrarian
  'Das macht jedes Outfit teurer – ohni teuer z sii ✨', // spezifisch
  'Wart bis am Schluss 👀',                      // Neugier-Lücke
  'I ha lang gsuecht — das isch es 🤍',          // relatable Mundart
  'Lueg mau das aa 😍',                          // Mundart (Gewinner-Vibe)
  'Niemmer merkt, dass das nid vom Juwelier isch 💍', // contrarian/spezifisch
  'So öpis findsch i de Schwiiz chuum 🇨🇭',      // Mundart
  'Äuä ds schönschte Teil grad itz 👀',          // Mundart
  'Viu Style für wenig Gäud ✨',                  // Mundart
  'Das mues i ha 🤍',                            // Mundart
  'Stop scrolle – das muesch gseh ✋',           // Mundart
  'Dis nöie Lieblingsteil? 👀',                  // Mundart
  'Weles träisch zersch – 1, 2 oder 3? 👀',      // verbesserte Reflexions-Frage (statt schwacher Poll)
];
// Recherche 2026-06-23: Sends/DM-Shares = höchstgewichtetes Signal, Saves = Langlebigkeit, dann Kommentare.
// JEDER Post bekommt EXPLIZIT einen Share- ODER Save- ODER Tag-Trigger (genau das fehlte → 0 Shares).
const TRIGGERS = [
  '↗️ Teil das mit dyre beschte Fründin 💛',     // SHARE (stärkstes Signal)
  '👇 Markier öpper, wo das bruucht',            // TAG → Share
  '💾 Spicher dr das für dis nächste Outfit',    // SAVE (Langlebigkeit)
  '↗️ Schick das dyre Schwöschter 👀',           // SHARE
  '💾 Merk’s dir · folg für meh Schwiizer Finds',// SAVE + Follow
  '👇 Gold oder Silber? Schrib’s i d Kommentär', // A/B → Kommentar+Tag
];

// 🇨🇭 MUNDART-SANITIZER (Recherche 2026-06-23 / MUNDART-GUIDE): Teutonismen (Hochdeutsch-Wörter, die
// kein Schweizer sagt) auto-korrigieren — nur GANZE Wörter, case-insensitiv, ausserhalb von URLs/Hashtags.
const TEUTONISM_FIX = [
  [/\bdoch\b/gi, 'aber'], [/\bstets\b/gi, 'immer'], [/\blecker\b/gi, 'fein'],
  [/\bgucken\b/gi, 'luege'], [/\bMädchen\b/g, 'Meitli'], [/\bBrötchen\b/g, 'Weggli'],
];
// Vulgär = Image-/Ban-Risiko (Frauen-Beauty-Brand) → Item wird hart gefiltert.
const MUNDART_VULGAR = ['huere', 'huärä', 'scheiss', 'fucking', 'goonen', 'sybau'];
function sanitizeCaption(s) {
  if (!s) return s;
  // Hashtags + URLs schützen (nicht anfassen), nur den Fliesstext korrigieren.
  return s.split('\n').map(line => {
    if (/^[#👉🔗]/.test(line.trim()) || /luxestyle\.ch|cdn\.shopify/.test(line)) return line;
    let out = line;
    for (const [re, rep] of TEUTONISM_FIX) out = out.replace(re, rep);
    return out;
  }).join('\n');
}

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
  // Cache (1h TTL) → verhindert 40 sequenzielle Fetches pro Build (Timeout-Ursache). Self-Improve 2026-06-23.
  const cacheFile = path.join(process.env.TMPDIR || '/tmp', 'luxe_pricemap.json');
  try {
    const st = fs.statSync(cacheFile);
    if (Date.now() - st.mtimeMs < 3600e3) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cached && Object.keys(cached).length) return cached;
    }
  } catch {}
  const m = {};
  try {
    for (let page = 1; page < 40; page++) {
      const d = await (await fetch(`https://luxestyle.ch/products.json?limit=250&page=${page}`)).json();
      const ps = d.products || []; if (!ps.length) break;
      for (const p of ps) { const v = (p.variants || [])[0]; if (v?.price) m[p.handle] = v.price; }
    }
    if (Object.keys(m).length) fs.writeFileSync(cacheFile, JSON.stringify(m));
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
      // Trust-Winkel auch in Reel-Captions (jeder 3.), wenn nicht schon drin — WAHR, kein Fake.
      let cap = caption;
      // WENIGER WERBLICH (Lehre 2026-06-23): Rabattcode nur auf jedem 3. Reel lassen, sonst rausstreichen
      // (Videos wurden als Werbung gemeldet). Hook/Trigger/Mundart bleiben.
      if (reels.length % 3 !== 0)
        cap = cap.replace(/\s*[·\-–]*\s*[–-]?10\s*%?\s*(mit\s*)?WELCOME10/gi, '').replace(/  +/g, ' ').trim();
      if (reels.length % 3 === 2 && cap && !/Schweizer Shop|sichere Bstellig|TWINT/.test(cap))
        cap += `\n${TRUST_LINES[reels.length % TRUST_LINES.length]}`;
      seen.add(video); reels.push({ type: 'reel', video, caption: cap });
    }
    // NEUESTE ZUERST (Self-Improve 2026-06-23): neue Reels werden ans CSV-Ende angehängt → umdrehen,
    // damit die neuesten/besten (Playbook-konform: Engagement-Hooks, Mundart, Loop) Vorrang in der Rotation
    // bekommen statt unter ~70 alten begraben zu werden.
    reels.reverse();
    // TÄGLICHE ROTATION: Pool um einen Tages-Offset drehen → über die Tage rotieren alle durch (Vielfalt),
    // aber die neuesten bleiben in den vorderen Slots gewichtet.
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
  // (#sommerkleid) wuerden falsch sitzen. CH-NISCHIG statt generisch (Lehre 2026-06-15: generische
  // Discovery-Tags #tiktokmademebuyit/#musthave ziehen Low-Intent → Algo-Strafe-Risiko). 1 Reach-Tag (#fyp) ok.
  const SAFE = [
    '#schweizmode #ootdschweiz #swissstyle #shoppingschweiz #fyp',
    '#schweiz #swissmade #swissfashion #modeschweiz #foryou',
    '#ootdschweiz #schweizershop #swissstyle #schweizmode #fyp',
  ];
  const tagsets = SAFE;
  // SCHWEIZWEIT (User 2026-06-14 „nicht nur Bern"): rotierend über CH-Städte/Tags statt immer #bern.
  const CH_WIDE = ['#zürich', '#basel', '#luzern', '#bern', '#genf', '#swissmade'];
  const goods = loadGood();
  if (!goods.length) { console.log('Keine good_products.csv → No-op.'); process.exit(0); }
  const prices = await priceMap();
  // Text-im-Bild-Map laden (name → CDN-URL der veredelten Karte). Fehlt sie → nacktes Bild.
  let textMap = {};
  try { textMap = JSON.parse(fs.readFileSync(TEXTMAP, 'utf8')); } catch {}

  // Tages-Offset: täglich andere Opener/Trigger-Zuordnung (gegen Wiederholungs-Optik).
  const DAYOFF = Math.floor(Date.now() / 864e5);
  // BILDER (Produkt + Preis + Gewinner-Hook + CH-weite Tags)
  const images = goods.map((p, i) => {
    const opener = OPENERS[(i + DAYOFF) % OPENERS.length];
    const trigger = TRIGGERS[(i + DAYOFF) % TRIGGERS.length];
    const tags = tagsets[i % tagsets.length] + ' ' + CH_WIDE[i % CH_WIDE.length];
    const price = prices[p.handle] ? ` – CHF ${prices[p.handle]}` : '';
    const trustLine = (i % 3 === 2) ? `\n${TRUST_LINES[(i + DAYOFF) % TRUST_LINES.length]}` : '';
    // WENIGER WERBLICH (Lehre 2026-06-23: Videos wurden als „Werbung/Markeninhalt" gemeldet + Social konv. 0%):
    // Rabattcode nur auf jedem 3. Post statt jedem → authentischer, weniger Ad-Optik. Trigger+Preis bleiben.
    const offer = (i % 3 === 0) ? ' · –10% mit WELCOME10' : '';
    const caption = `${opener} ${p.label}${price}\n${trigger}${offer}${trustLine}\n👉 luxestyle.ch/products/${p.handle}\n${tags}`;
    // Veredelte Text-Karte bevorzugen (Produktname+Rabatt eingebrannt), sonst nacktes Produktbild.
    const image = textMap[p.handle] || p.image;
    return { type: 'image', image, caption };
  });
  // REELS (echte CDN-Videos aus video_queue.csv) + STORIES (Produktbilder als Foto-Story, 24h)
  const reels = loadReels();
  // STORIES = text-tragende Reels (Produktname/Preis/CTA eingebrannt, Safe-Zone) statt nackter Bilder
  // (User 2026-06-16 „story kein text?"). Lieber KEINE Story als eine ohne Text → nur aus Reels bauen.
  const stories = reels.map(r => ({ type: 'story', video: r.video })); // ALLE Reels (täglich rotiert) → keine Story-Wiederholung (User 2026-06-17)

  // KOLLEKTIONS-WERBUNG (User 2026-06-19 „kollektions werbung?"): Posts, die auf KOLLEKTIONS-Seiten führen
  // (mehr Produkte = höherer Warenkorb). Rotierend, jede 5. Position.
  const COLLECTIONS = [
    { handle: 'uhren', label: 'Uhren-Kollektion ⌚', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/collections/8431777726558_0_P02.jpg?v=1781880273' },
    { handle: 'damen-mode', label: 'Damen-Mode 👗', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/collections/3136e619-9947-4d5f-8248-707c65d055d2.jpg?v=1781386829' },
    { handle: 'parfum-duefte', label: 'Parfum & Düfte 🌸', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/collections/0679602161121_0_P01.jpg?v=1781640714' },
    { handle: 'sommer', label: 'Sommer-Kollektion ☀️', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/collections/fa7f66fa-bf2d-4800-835e-2e3fe6984427.jpg?v=1780336517' },
    // Weitere Kollektionen NUR für organische Posts (NICHT fürs bezahlte Pixel-Ad — User 2026-06-19)
    { handle: 'garten-balkon', label: 'Garten & Balkon 🌿', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/collections/8413246150088_00_WBG4_8fa839a4-d41f-44ef-bc0f-4cff31205c03.jpg?v=1781880256' },
    { handle: 'fitness-training', label: 'Fitness & Training 💪', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/collections/S64188635_1752127868-remove-background0_e201d068-c786-4b35-aad0-418bad4097e7.jpg?v=1781880262' },
    { handle: 'lederwaren', label: 'Leder & Accessoires 👝', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/collections/9359082762827_S64130277_P00.jpg?v=1781880275' },
    { handle: 'trainingsanzuege-sets', label: 'Trainingsanzüge & Sets 🏃', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/collections/8054041765383_S64228713_P00.jpg?v=1781880260' },
    { handle: 'beauty-pflege', label: 'Beauty & Pflege 💄', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/0309979139019_0_P03.jpg?v=1781873705' },
  ];
  const collPosts = COLLECTIONS.map((c, i) => ({ type: 'image', image: c.image,
    caption: `Entdeck d ganzi ${c.label}\n${TRUST_LINES[i % TRUST_LINES.length]}\n👉 luxestyle.ch/collections/${c.handle} · –10% mit WELCOME10\n#schweiz #schweizmode #ootdschweiz #swissmade #fyp` }));
  // 🎁 GESCHENKFINDER-WERBUNG (smart: hilft Unentschlossenen → Conversion + Engagement; eigene Tool-Seite)
  collPosts.push({ type: 'image', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/collections/0679602161121_0_P01.jpg?v=1781640714',
    caption: 'Wüsstsch nid was schänke? 🎁 Üse Geschänk-Finder hilft dir – nach Typ & Budget. Probier en us 👉 luxestyle.ch/pages/geschenkfinder\n🇨🇭 Schweizer Shop · –10% mit WELCOME10\n#geschenkidee #schweiz #geschenk #ootdschweiz #fyp' });
  // 🎨 EINZIGARTIG: „Mach dys eiges Teil" (Selbst gestalten, POD) — Gewinner-Winkel (801 V), gibt's so nur hier
  collPosts.push({ type: 'image', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/528b1742-88be-4c21-9947-0299de1deea4_result23ca451f10fc6892.jpg?v=1781361016',
    caption: 'Mach dys eiges Teil 🎨🇨🇭 Eigeni Sprüch & Motive uf Aufkleber, Shirt, Hoodie & Tasse — du gestaltisch, mir drucke. Einzigartig & kei Mindestmänge 👉 luxestyle.ch/products/kiss-cut-aufkleber-selbst-gestalten\n–10% mit WELCOME10\n#selbstgestalten #schweiz #mundart #diy #fyp' });
  // 🇨🇭 EINZIGARTIG: Schwiizer Sticker (Matterhorn/Edelwyss/Fondue) — Mundart/CH-Kultur, unverwechselbar
  collPosts.push({ type: 'image', image: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/matterhorn_d6efa14d-6932-4864-9769-5705c82b4f4c.png?v=1781135405',
    caption: 'Es bitzeli Schwiiz für überall 🇨🇭 Schwiizer Sticker – Matterhorn, Edelwyss, Schwiizerchrüz, Fondue. Wetterfescht & einzigartig 👉 luxestyle.ch/products/schweiz-sticker-matterhorn\n–10% mit WELCOME10\n#schweiz #sticker #matterhorn #swissmade #fyp' });

  // 🖼️ KARUSSELL (User 2026-06-20 „ab jetzt Fotokarussell"): je 3 Produktbilder → 1 Wisch-Karussell
  // (mehr Engagement als Einzelfotos). Reels + Stories bleiben unverändert. Rest-Einzelbild bleibt Einzelbild.
  const carousels = [];
  for (let i = 0; i < images.length; i += 3) {
    const grp = images.slice(i, i + 3);
    if (grp.length < 2) { carousels.push(grp[0]); continue; }
    const lead = grp[0].caption.split('\n')[0];
    carousels.push({ type: 'carousel', images: grp.map(g => g.image),
      caption: `${lead} — wüsch durch für meh 👉\n🇨🇭 luxestyle.ch · Schweizer Shop\n#schweizmode #ootdschweiz #swissmade #fyp` });
  }

  // MIX (2026-06-23, Daten: IG-Reels 16-43 V vs statische Karten 0-12 V = 5-10x): REELS DOMINIEREN,
  // Karten sind in der Minderheit. IG/TikTok pushen 2026 fast nur Reels -> Reel-getriebene Schleife.
  const out = []; let ci = 0, si = 0, cpi = DAYOFF;
  const maxReels = Math.min(reels.length, 8);
  if (maxReels > 0) {
    for (let i = 0; i < maxReels; i++) {
      out.push(reels[i]);                                            // Reel = Rückgrat
      if (i % 2 === 0 && carousels[ci]) out.push(carousels[ci++]);   // nur jede 2. Position eine Karte
      if (i % 3 === 2 && collPosts.length) out.push(collPosts[cpi++ % collPosts.length]);
      if (i % 4 === 3 && stories.length) out.push(stories[si++ % stories.length]);
    }
  } else {
    // Fallback ohne Reels: wenige Karten (max 4) statt Karten-Flut.
    carousels.slice(0, 4).forEach(c => out.push(c));
  }
  const counts = out.reduce((a, x) => (a[x.type] = (a[x.type] || 0) + 1, a), {});

  // 🈲 AIRTIGHT DO-NOT-POST-FILTER (User 2026-06-17 „wenn botox u öl verbote isch nüm poste?"):
  // HARTE Garantie — KEIN Item dessen Caption/Bild-URL/Video-URL einen verbotenen Begriff enthält
  // (botox/serum/öl/gua-sha/hemp…) kommt je in die Queue, egal aus welcher Quelle. Letzte Schutzlinie.
  let banned = [];
  try {
    banned = fs.readFileSync(path.join(ROOT, 'automation', 'DO-NOT-POST.txt'), 'utf8')
      .split('\n').map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#'));
  } catch {}
  // Vulgär-Mundart in den harten Filter aufnehmen (Image-/Ban-Schutz).
  banned = [...new Set([...banned, ...MUNDART_VULGAR])];
  const before = out.length;
  const clean = out.filter((x) => {
    const hay = ((x.caption || '') + ' ' + (x.image || '') + ' ' + (x.video || '')).toLowerCase();
    return !banned.some(t => hay.includes(t));
  });
  const bannedRemoved = before - clean.length;
  out.length = 0; out.push(...clean);

  // 🛡️ DEDUP-GARANTIE (User 2026-06-16 „doppelt bilder"): dieselbe Bild-/Video-URL darf NIE
  // zweimal im Grid (Bild/Reel) stehen → sonst doppelte Feed-Posts. Stories (ephemer, nicht im
  // Grid) dürfen ein Produkt erneut zeigen, aber nicht sich selbst doppeln.
  const seenGrid = new Set(), seenStory = new Set();
  const deduped = out.filter((x) => {
    const u = x.image || x.video || (Array.isArray(x.images) && x.images[0]) || '';
    if (!u) return true;
    if (x.type === 'story') { if (seenStory.has(u)) return false; seenStory.add(u); return true; }
    if (seenGrid.has(u)) return false; seenGrid.add(u); return true;
  });
  const removed = out.length - deduped.length;
  out.length = 0; out.push(...deduped);
  // 🇨🇭 Mundart-Sanitizer auf alle Captions (Teutonismen -> Mundart, schützt URLs/Hashtags).
  for (const x of out) if (x.caption) x.caption = sanitizeCaption(x.caption);
  const dcounts = out.reduce((a, x) => (a[x.type] = (a[x.type] || 0) + 1, a), {});

  if (DRY) { console.log(JSON.stringify(out.slice(0, 5), null, 2)); console.log(`… ${out.length} Posts (dry, ${removed} Dubletten entfernt): ${JSON.stringify(dcounts)}`); process.exit(0); }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`✅ Autopost-Queue neu gebaut: ${out.length} Posts (Mix, ${removed} Dubletten + ${bannedRemoved} VERBOTENE entfernt) → ${path.relative(ROOT, OUT)}`);
  console.log(`   Formate: ${JSON.stringify(dcounts)} (Bilder+Reels+Stories, alle CH-weit, KEINE Grid-Dubletten)`);
  console.log('   ⚠️ Nach Queue-Änderung: `wrangler deploy` (Worker bäckt queue.json beim Deploy ein).');
})();
