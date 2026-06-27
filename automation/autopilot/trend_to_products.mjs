#!/usr/bin/env node
/* 🔁 trend_to_products.mjs — Lern-Schleife schließen: TRENDS → PRODUKT-/SOURCING-IDEEN
 *
 * Liest die vom Wissenssammler verdichtete Wissensbasis (automation/SECOND-BRAIN.md) +
 * den aktuellen Katalog (automation/good_products.csv) und leitet daraus ab, WELCHE Trends
 * der Shop noch NICHT abdeckt → konkrete CJ/BigBuy-Suchbegriffe zum Einkaufen.
 * → Das Brain lernt nicht nur, es SCHLÄGT VOR, was als Nächstes ins Sortiment soll.
 *
 * Reines Node, keine Deps, kein API. No-op-safe (ohne SECOND-BRAIN.md passiert nichts).
 * Output: automation/autopilot/PRODUKT-IDEEN.md (datiert, neueste oben).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const BRAIN = path.join(ROOT, 'automation', 'SECOND-BRAIN.md');
const GOOD = path.join(ROOT, 'automation', 'good_products.csv');
const OUT = path.join(ROOT, 'automation', 'autopilot', 'PRODUKT-IDEEN.md');

if (!fs.existsSync(BRAIN)) { console.log('Keine SECOND-BRAIN.md → No-Op (Wissensbasis fehlt noch).'); process.exit(0); }
const brain = fs.readFileSync(BRAIN, 'utf8');

// 1) Trend-Signale aus der Wissensbasis ziehen
function section(title) {
  const re = new RegExp(`## [^\\n]*${title}[^\\n]*\\n([\\s\\S]*?)(?:\\n## |$)`);
  const m = brain.match(re); return m ? m[1] : '';
}
const hashLines = section('Konsens-Hashtags').split('\n').filter(l => l.trim().startsWith('-'));
const hashtags = hashLines.map(l => {
  const m = l.match(/#([A-Za-z0-9äöü]+)\s*_\((\d+)/i); return m ? { term: m[1].toLowerCase(), n: +m[2] } : null;
}).filter(Boolean);
const kwText = section('Trend-Keywords');
const keywords = [...kwText.matchAll(/([a-zA-ZäöüÄÖÜß]{4,})\s*_\((\d+)\)/g)].map(m => ({ term: m[1].toLowerCase(), n: +m[2] }));

// 2) aktuellen Katalog grob als Begriffs-Set
let catalog = '';
try { catalog = fs.readFileSync(GOOD, 'utf8').toLowerCase(); } catch {}
const covered = t => catalog.includes(t.slice(0, Math.max(4, t.length - 2)));

// 3) Mode-/Shop-relevante Trends filtern (Marketing-Buzzwords/Plattform-Tags raus)
const NOISE = new Set([
  // Plattform/Creator/Marketing
  'shorts','fyp','foryou','viral','tiktok','tiktokmademebuyit','reels','reel','trend','trending','trends','fashion','fashionstyle','style','styling','ootd','ootdguide','outfit','outfitideas','outfitinspo','outfitinspiration','mode','haul','tryonhaul','lookbook','aesthetic','mode2026','aitools','claude','claudeai','chatgpt','onlinebusiness','digitalmarketing','marketing','shopify','dropshipping','ecommerce','business','content','creator','video','youtube',
  // englische Stopwörter/Fragmente
  'facebookads','metaads','facebookads2026','metaads2026','aiautomation','ads','adstutorial','performancemarketing','ecommerceads','passiveincome','sidehustle','makemoney','geldverdienen',
  'with','from','have','this','that','your','about','more','best','full','review','unboxing','first','look','make','want','need','love','must','haves','musthaves','guide','tips','easy','find','finds','shop','wear','outfits','summer','winter','herbst','sommer','damen','herren','frauen','deutsch','german','neue','beste','test','vergleich','tutorial','erklärt','news','update','2024','2025','2026',
]);
const relevant = [...hashtags, ...keywords]
  .filter(x => x.term.length >= 4 && !NOISE.has(x.term))
  .reduce((acc, x) => { acc[x.term] = (acc[x.term] || 0) + x.n; return acc; }, {});
const ranked = Object.entries(relevant).sort((a, b) => b[1] - a[1]).slice(0, 25);

const gaps = ranked.filter(([t]) => !covered(t));
const have = ranked.filter(([t]) => covered(t));

const today = new Date().toISOString().slice(0, 10);
let block = `## 📅 ${today} — Trend → Produkt-Ideen\n\n`;
block += `**🆕 Trend-Lücken (im Sortiment kaum/nicht abgedeckt) → einkaufen prüfen:**\n`;
block += (gaps.length ? gaps.map(([t, n]) => `- **${t}** _(Signal ${n})_ → CJ/BigBuy-Suche: \`${t} damen\` / \`${t} 2026\``).join('\n') : '_keine klaren Lücken_') + '\n\n';
block += `**✅ Trends, die du schon abdeckst (mehr davon bewerben):**\n`;
block += (have.length ? have.slice(0, 10).map(([t, n]) => `- ${t} _(${n})_`).join('\n') : '_—_') + '\n\n';
block += `> Quelle: SECOND-BRAIN.md (gelernte YouTube-Trends). Vorschläge = Recherche-Signale, kein Auto-Import — vor dem Anlegen §5/§9-Filter beachten (keine Marken/Safety-Risiken).\n\n---\n\n`;

const HEAD = `# 🛍️ Produkt-Ideen aus Trends (auto-generiert)\n\n> Von \`automation/autopilot/trend_to_products.mjs\` aus der gelernten Wissensbasis abgeleitet.\n> Welche Trends der Shop noch nicht abdeckt → Sourcing-Signale. Neueste oben.\n\n`;
let prev = ''; try { prev = fs.readFileSync(OUT, 'utf8').replace(/^#[\s\S]*?\n\n(?=## )/, ''); } catch {}
const blocks = (block + prev).split(/\n---\n\n/).filter(b => b.trim()).slice(0, 14);
fs.writeFileSync(OUT, HEAD + blocks.join('\n---\n\n') + '\n---\n\n');
console.log(`✅ ${path.relative(ROOT, OUT)}: ${gaps.length} Trend-Lücken, ${have.length} abgedeckte Trends.`);
gaps.slice(0, 6).forEach(([t, n]) => console.log(`   🆕 ${t} (${n})`));
