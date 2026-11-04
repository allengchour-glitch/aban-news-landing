// Schnelles Bild einer Fassung: node schnellbild.js <fall> <breite> <hoehe> <thema hell|dunkel> <datei>
let playwright; try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const HTML = process.env.COCKPIT_HTML || path.resolve(__dirname, '../../tools/trading/krypto_bot/cockpit.html');
const FX = path.join(__dirname, 'fx');
const [fall = 'voll', breite = '1440', hoehe = '900', thema = 'dunkel', datei = 'bild.png'] = process.argv.slice(2);
(async () => {
  const server = http.createServer((q, a) => { a.setHeader('Content-Type', 'text/html; charset=utf-8'); a.end(fs.readFileSync(HTML)); }).listen(0);
  const port = server.address().port;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: +breite, height: +hoehe }, deviceScaleFactor: 2, colorScheme: thema === 'hell' ? 'light' : 'dark', locale: 'de-CH', timezoneId: 'Europe/Zurich' });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', e => fehler.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) fehler.push(m.type() + ' ' + m.text()); });
  await page.route('**/api/**', r => {
    const n = new URL(r.request().url()).pathname.split('/').pop();
    r.fulfill({ contentType: 'application/json', body: fs.readFileSync(path.join(FX, fall, n + '.json')) });
  });
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.waitForSelector('#uebersicht .ukarte .u-gross, #uebersicht .u-leer', { timeout: 8000 });
  await page.waitForTimeout(700);
  const voll = process.env.VOLL !== '0';
  const clip = process.env.CLIP ? (([x, y, w, h]) => ({ x, y, width: w, height: h }))(process.env.CLIP.split(',').map(Number)) : undefined;
  await page.screenshot({ path: datei, fullPage: voll, ...(clip ? { clip } : {}) });
  console.log('Fehler:', fehler.length ? fehler : 'keine', '| scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth), 'innerWidth', await page.evaluate(() => innerWidth), '| Höhe', await page.evaluate(() => document.documentElement.scrollHeight));
  await browser.close(); server.close();
})();
