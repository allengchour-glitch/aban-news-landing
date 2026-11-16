// Schaltet die Scroll-Geschichte auf der echten Startseite ein (templates/index.json), mit Sicherung und Rücknahme.
//   node umschalten.mjs                  Trockenlauf: zeigt die neue index.json
//   LIVE=1 node umschalten.mjs           Sicherung nach sicherung/index.json.vor-<zeit>, schreibt, liest zurück
//   ZURUECK=1 LIVE=1 node umschalten.mjs schreibt die jüngste Sicherung zurück (nur wenn index.json noch unserem Stand entspricht)
// Bricht ab, wenn index.json nicht mehr dem gemessenen Stand entspricht (sonst würden fremde Änderungen überschrieben).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { gql, mainTheme, themeLesen } from './shop.mjs';
const HIER = path.dirname(new URL(import.meta.url).pathname);
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const ERWARTET = process.env.ERWARTET_MD5 || 'aa3d177234272df6acedab60272a5396'; // index.json am 15.11.2026 23:45 UTC (vorher 17b76982, von einem anderen Ablauf geändert)
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const t = await mainTheme();
const f = await themeLesen(t.id, ['templates/index.json', 'templates/index.lxstory.json', 'sections/lx-story.liquid', 'sections/lx-story-platz.liquid', 'assets/lx-story.js', 'layout/theme.liquid', 'sections/luxe-edit-home.liquid']);
for (const n of ['sections/lx-story.liquid', 'sections/lx-story-platz.liquid', 'assets/lx-story.js']) if (!f[n]) throw new Error('fehlt im MAIN-Theme: ' + n);
// Warnung: Die Geschichte hängt an .lx-home .lx-hero (luxe-edit-home) und wurde gegen diesen Stand von theme.liquid gemessen.
const GEMESSEN = { 'layout/theme.liquid': process.env.THEME_MD5 || '62a77592', 'sections/luxe-edit-home.liquid': process.env.HOME_MD5 || '8ef12062' };
for (const [n, m] of Object.entries(GEMESSEN)) { const ist2 = f[n] && f[n].md5; if (!ist2 || !ist2.startsWith(m)) console.log('WARNUNG:', n, 'ist', ist2, 'statt gemessen', m + '…: vor dem Umschalten live_messen.cjs und lcp_ab.cjs erneut fahren'); else console.log('gemessener Stand:', n, ist2); }
const ist = f['templates/index.json'];
const SDIR = path.join(HIER, 'sicherung'); fs.mkdirSync(SDIR, { recursive: true });
async function schreiben(inhalt) {
  const d = await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename code message}}}`, { id: t.id, files: [{ filename: 'templates/index.json', body: { type: 'TEXT', value: inhalt } }] });
  if (d.themeFilesUpsert.userErrors.length) throw new Error(JSON.stringify(d.themeFilesUpsert.userErrors));
  await new Promise((r) => setTimeout(r, 4000));
  const z = await themeLesen(t.id, ['templates/index.json']);
  return z['templates/index.json'];
}
if (ZURUECK) {
  const s = fs.readdirSync(SDIR).filter((x) => x.startsWith('index.json.vor-')).sort().pop();
  if (!s) throw new Error('keine Sicherung');
  const alt = fs.readFileSync(path.join(SDIR, s), 'utf8');
  const nach = JSON.parse(fs.readFileSync(path.join(SDIR, 'eingeschaltet.json'), 'utf8'));
  if (ist.md5 !== nach.md5) throw new Error('index.json wurde seit dem Einschalten geändert (' + ist.md5 + '), Rücknahme von Hand');
  console.log('Rücknahme mit', s, LIVE ? '' : '(Trockenlauf)');
  if (LIVE) { const z = await schreiben(alt); console.log('zurückgelesen', z.md5, z.md5 === md5(alt) ? 'GLEICH' : 'ABWEICHUNG (Shopify formatiert JSON: Inhalt prüfen)'); }
  process.exit(0);
}
if (ist.md5 !== ERWARTET) throw new Error('index.json ist nicht mehr der gemessene Stand (' + ist.md5 + '). Erst lesen und ERWARTET_MD5 bewusst setzen.');
const test = JSON.parse(f['templates/index.lxstory.json'].content.replace(/^\/\*[\s\S]*?\*\/\s*/, ''));
const idx = JSON.parse(ist.content.replace(/^\/\*[\s\S]*?\*\/\s*/, ''));
if (idx.sections.lx_story || idx.sections.lx_story_platz) throw new Error('schon eingeschaltet');
const sections = {}; for (const [k, v] of Object.entries(idx.sections)) { if (k === 'luxe_home') sections.lx_story_platz = test.sections.lx_story_platz; sections[k] = v; if (k === 'luxe_home') sections.lx_story = test.sections.lx_story; }
const order = []; for (const k of idx.order) { if (k === 'luxe_home') order.push('lx_story_platz', 'luxe_home', 'lx_story'); else order.push(k); }
const neu = JSON.stringify({ sections, order }, null, 2) + '\n';
console.log('neue Reihenfolge:', order.join(', '), '| Kapitel:', test.sections.lx_story.block_order.length);
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben. Grösse', neu.length); process.exit(0); }
const sich = path.join(SDIR, 'index.json.vor-' + new Date().toISOString().replace(/[:.]/g, '-'));
fs.writeFileSync(sich, ist.content); console.log('Sicherung', sich, ist.md5);
const z = await schreiben(neu);
const ok = JSON.stringify(JSON.parse(z.content.replace(/^\/\*[\s\S]*?\*\/\s*/, ''))) === JSON.stringify(JSON.parse(neu));
fs.writeFileSync(path.join(SDIR, 'eingeschaltet.json'), JSON.stringify({ zeit: new Date().toISOString(), md5: z.md5 }));
console.log('zurückgelesen', z.md5, ok ? 'INHALT GLEICH' : 'ABWEICHUNG');
