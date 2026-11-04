// Handy-Bilder: node mobil_bilder.js <fall> <breite> <hoehe> <hell|dunkel> <vorsatz> [ziele,kommagetrennt]
// Echte Viewport-Aufnahmen (mit fester Sprungleiste), Berührung an, deviceScaleFactor 2, je Ziel eine Aufnahme nach dem Scrollen.
let playwright; try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const HTML = process.env.COCKPIT_HTML || path.resolve(__dirname, '../../tools/trading/krypto_bot/cockpit.html');
const FX = path.join(__dirname, 'fx');
const [fall = 'voll', breite = '390', hoehe = '844', thema = 'dunkel', vorsatz = 'bilder/m', ziele = 'oben,positionen,satellit,auftraege,maerkte,lage,details,steuerung'] = process.argv.slice(2);
const ZIEL = {
  oben: 0, positionen: '#u-positionen', satellit: '#u-satellit', auftraege: '#u-auftraege', maerkte: '[aria-label="Märkte"]', lage: '[aria-label="Lage"]',
  engagement: '[aria-label="Engagement"]', details: '#details', profit: '[aria-label="Profit"]', steuerung: '[aria-label="Steuerung"]', ende: 'footer',
};
(async () => {
  const server = http.createServer((q, a) => { a.setHeader('Content-Type', 'text/html; charset=utf-8'); a.end(fs.readFileSync(HTML)); }).listen(0);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: +breite, height: +hoehe }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: thema === 'hell' ? 'light' : 'dark', locale: 'de-CH', timezoneId: 'Europe/Zurich' });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', e => fehler.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) fehler.push(m.type() + ' ' + m.text()); });
  await page.route('**/api/**', r => {
    const n = new URL(r.request().url()).pathname.split('/').pop();
    r.fulfill({ contentType: 'application/json', body: fs.readFileSync(path.join(FX, fall, n + '.json')) });
  });
  await page.goto('http://127.0.0.1:' + server.address().port + '/');
  await page.waitForSelector('#uebersicht .ukarte .u-gross, #uebersicht .u-leer', { timeout: 8000 });
  await page.waitForTimeout(700);
  for (const z of ziele.split(',')) {
    if (z === 'ampelauf') {
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.tap('#ampel'); await page.waitForTimeout(250);
      await page.tap('#ampelListe details.ampel-rest summary').catch(() => {}); await page.waitForTimeout(250);
      await page.screenshot({ path: `${vorsatz}-ampelauf.png` }); console.log('Bild', `${vorsatz}-ampelauf.png`);
      await page.evaluate(() => scrollTo({ top: 600, behavior: 'instant' })); await page.waitForTimeout(250);
      await page.screenshot({ path: `${vorsatz}-ampelauf2.png` }); console.log('Bild', `${vorsatz}-ampelauf2.png`);
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.tap('#ampel'); await page.waitForTimeout(150);
      continue;
    }
    if (z === 'blase') {
      await page.evaluate(() => document.querySelector('.chip .hinw.stern').scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(250);
      await page.tap('.chip .hinw.stern'); await page.waitForTimeout(250);
      await page.screenshot({ path: `${vorsatz}-blase.png` }); console.log('Bild', `${vorsatz}-blase.png`);
      await page.keyboard.press('Escape'); continue;
    }
    const sel = /^y\d+$/.test(z) ? +z.slice(1) : ZIEL[z];
    if (sel === undefined) { console.log('unbekanntes Ziel', z); continue; }
    const da = typeof sel === 'number' ? true : await page.$(sel);
    if (!da) { console.log('Ziel fehlt:', z); continue; }
    await page.evaluate(s => { if (typeof s === 'number') scrollTo({ top: s, behavior: 'instant' }); else document.querySelector(s).scrollIntoView({ block: 'start', behavior: 'instant' }); }, sel);
    await page.waitForTimeout(350);
    const datei = `${vorsatz}-${z}.png`;
    await page.screenshot({ path: datei });
    console.log('Bild', datei);
  }
  console.log('Fehler:', fehler.length ? fehler : 'keine', '| scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth), 'innerWidth', await page.evaluate(() => innerWidth), '| Höhe', await page.evaluate(() => document.documentElement.scrollHeight));
  await browser.close(); server.close();
})();
