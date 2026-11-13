#!/usr/bin/env node
/* pruefe_sicherzone.mjs <szene.html> — prüft, dass alle Titel-Elemente (.cap) in der Sicherheitszone liegen.
 * Annahme (nicht offiziell von YouTube, Drittquellen: «oben, unten und rechts Platz für die Oberfläche lassen»):
 * unten 20 %, rechts 15 %, oben 8 % frei. Exit 1 bei Verstoss. */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = createRequire(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/x.js')('playwright'); }
const [html] = process.argv.slice(2);
if (!html) { console.error('Aufruf: node pruefe_sicherzone.mjs <szene.html>'); process.exit(2); }
const W = 1080, H = 1920, grenze = { links: 0, rechts: W * 0.85, oben: H * 0.08, unten: H * 0.80 };
const b = await pw.chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto(pathToFileURL(resolve(html)).href);
await p.waitForFunction('window.__fertig===true', { timeout: 15000 });
const r = await p.evaluate(() => [...document.querySelectorAll('.cap')].map((c) => { const q = c.getBoundingClientRect(); return { text: c.textContent.slice(0, 40), l: q.left, r: q.right, t: q.top, b: q.bottom }; }));
await b.close();
if (!r.length) { console.error('FEHLER: keine .cap-Elemente gefunden'); process.exit(2); }
const bad = r.filter((x) => x.l < grenze.links || x.r > grenze.rechts || x.t < grenze.oben || x.b > grenze.unten);
r.forEach((x) => console.log(`${bad.includes(x) ? 'ZU NAH AM RAND' : 'ok'}  x ${x.l.toFixed(0)}–${x.r.toFixed(0)}  y ${x.t.toFixed(0)}–${x.b.toFixed(0)}  «${x.text}»`));
process.exit(bad.length ? 1 : 0);
