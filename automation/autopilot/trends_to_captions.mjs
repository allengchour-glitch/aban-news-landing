#!/usr/bin/env node
/* ✍️ trends_to_captions.mjs — Lern-Schleife: gelernte Trend-Hashtags → fertige Post-Captions
 *
 * Kombiniert die gelernten Konsens-Hashtags (automation/brain_pools.sh / learned_youtube_pools.sh)
 * mit den kuratierten Produkten (automation/good_products.csv) zu fertigen, datengetriebenen
 * Caption-VORSCHLÄGEN. Schreibt sie als Vorschlagsliste — postet NICHT selbst (die Post-Queue
 * social/posts_image.csv gehört laut SHARED-MEMORY der LuxeStyle-Session). Du/die zuständige
 * Session übernimmt die besten 1:1.
 *
 * Reines Node, kein API, no-op-safe. Output: automation/autopilot/CAPTION-VORSCHLAEGE.md
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const POOLS = [path.join(ROOT, 'automation', 'brain_pools.sh'), path.join(ROOT, 'automation', 'learned_youtube_pools.sh')];
const GOOD = path.join(ROOT, 'automation', 'good_products.csv');
const OUT = path.join(ROOT, 'automation', 'autopilot', 'CAPTION-VORSCHLAEGE.md');

// 1) gelernte Hashtag-Sätze einlesen (erste vorhandene Pool-Datei)
let tagsets = [];
for (const p of POOLS) {
  try {
    const sh = fs.readFileSync(p, 'utf8');
    tagsets = [...sh.matchAll(/"([^"]*#[^"]+)"/g)].map(m => m[1].trim());
    if (tagsets.length) break;
  } catch {}
}
if (!tagsets.length) { console.log('Keine gelernten Hashtag-Pools → No-Op.'); process.exit(0); }

// 2) Produkte einlesen
let products = [];
try {
  const rows = fs.readFileSync(GOOD, 'utf8').trim().split('\n').slice(1);
  products = rows.map(r => { const c = r.split(','); return { label: (c[2] || '').trim(), handle: (c[3] || '').trim() }; })
    .filter(p => p.label);
} catch {}
if (!products.length) { console.log('good_products.csv leer → No-Op.'); process.exit(0); }

const HOOKS = [
  'Dein Sommer-Liebling? {p} 🌿',
  'Designer-Look zum fairen Preis 👀 {p}',
  'Neu entdeckt: {p} 🤍',
  '{p} ✨ premium & bezahlbar, Schweizer Shop',
  'Welcher Look ist deiner? 👇 {p}',
];
const today = new Date().toISOString().slice(0, 10);
const lines = products.slice(0, 12).map((p, i) => {
  const hook = HOOKS[i % HOOKS.length].replace('{p}', p.label);
  const tags = tagsets[i % tagsets.length];
  const link = p.handle ? `luxestyle.ch/products/${p.handle}` : 'luxestyle.ch';
  return `### ${p.label}\n${hook} · –10 % mit Code WELCOME10 👉 ${link}\n${tags}\n`;
});

const md = `# ✍️ Caption-Vorschläge (auto-generiert aus gelernten Trends)\n\n` +
  `> Von \`automation/autopilot/trends_to_captions.mjs\` · Stand ${today}. Kombiniert die **gelernten Top-Hashtags**\n` +
  `> (\`brain_pools.sh\`) mit kuratierten Produkten. **Vorschläge** — die zuständige Session übernimmt die besten in\n` +
  `> \`social/posts_image.csv\`. Regel: KEINE Doppel-Bilder pro Profil.\n\n` +
  lines.join('\n');
fs.writeFileSync(OUT, md);
console.log(`✅ ${path.relative(ROOT, OUT)}: ${lines.length} Caption-Vorschläge aus ${tagsets.length} gelernten Hashtag-Sätzen.`);
