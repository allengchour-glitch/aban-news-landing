#!/usr/bin/env node
/* render.mjs — rendert eine HTML-Szene (mit motion.js) deterministisch zu einem MP4.
 *
 * Aufruf:
 *   node render.mjs <szene.html> --out ausgabe/x.mp4 [--fps 30] [--dauer 35] [--breite 1080] [--hoehe 1920]
 *   node render.mjs <szene.html> --vorschau 0,3,9.5 [--outdir ausgabe/vorschau]    (nur Standbilder, schnell)
 *
 * Ablauf: Seite laden → alle Animationen pausieren → je Bild currentTime setzen → Screenshot → ffmpeg.
 * Kein Netz nötig; Schrift muss im System liegen (Inter).
 */
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
function ladePlaywright() {
  try { return require('playwright'); } catch { /* global installiert */ }
  const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
  return createRequire(root + '/x.js')('playwright');
}

function args(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) { a[k.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; } else a._.push(k);
  }
  return a;
}

const a = args(process.argv.slice(2));
const szene = a._[0];
if (!szene) { console.error('FEHLER: HTML-Szene fehlt.\nAufruf: node render.mjs <szene.html> --out x.mp4 | --vorschau 0,3,9'); process.exit(2); }
const fps = Number(a.fps || 30), W = Number(a.breite || 1080), H = Number(a.hoehe || 1920);
if (!(fps > 0 && W > 0 && H > 0)) { console.error('FEHLER: fps/breite/hoehe müssen positiv sein'); process.exit(2); }

const { chromium } = ladePlaywright();
// --webgl sw  : Software-WebGL (SwiftShader), läuft ohne Grafikkarte (z. B. in der Cloud)
// --webgl gpu : echte Grafikkarte (Laptop), Chrome nutzt sie von selbst; neuer Headless-Modus, damit die GPU angesprochen wird
const startArgs = ['--no-sandbox', '--force-color-profile=srgb'];
const startOpt = { args: startArgs };
if (a.webgl) startArgs.push('--allow-file-access-from-files');   // ES-Module (three.js) per file:// laden
if (a.webgl === 'gpu') { startArgs.push('--ignore-gpu-blocklist', '--enable-webgl', '--enable-gpu-rasterization'); startOpt.channel = 'chromium'; }
else if (a.webgl) startArgs.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');
const browser = await chromium.launch(startOpt);
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
await page.goto(pathToFileURL(resolve(szene)).href, { waitUntil: 'load' });
await page.waitForFunction('window.__fertig === true', null, { timeout: Number(a.wartezeit || 60) * 1000 }).catch(() => {
  console.error('FEHLER: Die Szene hat Motion.fertig(<Sekunden>) nicht aufgerufen.' + (fehler.length ? '\n' + fehler.join('\n') : ''));
  process.exit(3);
});
await page.evaluate('document.fonts.ready');
if (fehler.length) { console.error('FEHLER auf der Seite:\n' + fehler.join('\n')); process.exit(3); }

// Alle Animationen anhalten; ab jetzt bestimmt allein der Renderer die Zeit.
// pause() wirkt asynchron: erst nach animation.ready ist der Haltepunkt gesetzt. Ohne dieses Warten überschrieb das
// ausstehende Pausieren die erste gesetzte Zeit teilweise (gleiche Zeit ergab je nach Vorgeschichte ein anderes Bild).
await page.evaluate(() => { const an = document.getAnimations(); an.forEach((x) => x.pause()); return Promise.all(an.map((x) => x.ready)); });
// Zeit setzen UND abwarten, bis Chromium sie gezeichnet hat (Stil-Neuberechnung erzwingen + zwei Bildzyklen).
// Ohne dieses Warten zeigte ein Screenshot gelegentlich einen Mischzustand (Sonne neu, Szene/Text noch alt).
// 3D-Seiten (three.js) stellen window.__seek3d(sekunden) bereit: rendert das Bild für diese Zeit und gibt danach zurück.
const setzeZeit = (t) => page.evaluate(async (ms) => {
  document.getAnimations().forEach((x) => { x.currentTime = ms; });
  if (typeof window.__seek3d === 'function') await window.__seek3d(ms / 1000);
  void document.body.offsetHeight;
  await new Promise((fertig) => requestAnimationFrame(() => requestAnimationFrame(() => fertig())));
}, Math.round(t * 1000));
// Aufwärmen: der allererste Screenshot zeigte sonst noch den Stand aus den ersten Millisekunden nach dem Laden (vor dem Pausieren),
// z. B. ein halb eingeblendetes erstes Bild. Einmal auf Zeit 0 stellen, ein Bild machen und verwerfen.
// Ein Sprung auf Zeit 0 allein löst keinen neuen Bildaufbau aus, wenn der Stand schon fast 0 ist: darum erst auf eine andere Zeit springen,
// ein Bild verwerfen, dann zurück auf 0.
await setzeZeit(1); await page.screenshot({ type: 'png' }); await setzeZeit(0); await page.screenshot({ type: 'png' }); await setzeZeit(0);
const dauer = Number(a.dauer || (await page.evaluate('window.__duration')));

if (a.vorschau) {
  const outdir = resolve(a.outdir || 'ausgabe/vorschau');
  mkdirSync(outdir, { recursive: true });
  for (const s of String(a.vorschau).split(',')) {
    const t = Number(s);
    if (!(t >= 0)) { console.error('FEHLER: ungültige Zeit «' + s + '»'); process.exit(2); }
    await setzeZeit(t);
    const f = `${outdir}/t${String(t).replace('.', '_').padStart(5, '0')}.png`;
    writeFileSync(f, await page.screenshot({ type: 'png' }));
    console.log(f);
  }
  await browser.close();
  process.exit(0);
}

if (!a.out) { console.error('FEHLER: --out <datei.mp4> oder --vorschau fehlt'); process.exit(2); }
if (!(dauer > 0)) { console.error('FEHLER: Dauer unbekannt (Motion.fertig oder --dauer)'); process.exit(2); }
const out = resolve(a.out);
mkdirSync(dirname(out), { recursive: true });
const n = Math.round(dauer * fps);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffEnde = new Promise((ok, nein) => { ff.on('exit', (c) => (c === 0 ? ok() : nein(new Error('ffmpeg Exit ' + c)))); ff.on('error', nein); });
ff.stdin.on('error', () => {});
for (let i = 0; i < n; i++) {
  await setzeZeit(i / fps);
  const png = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 90 === 0) process.stderr.write(`\rBild ${i}/${n}`);
}
ff.stdin.end();
await ffEnde;
await browser.close();
console.error(`\nFertig: ${out} (${n} Bilder, ${dauer} s, ${fps} fps)`);
