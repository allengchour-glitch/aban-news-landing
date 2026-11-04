// Rauchprobe mit dem ECHTEN Server (cockpit.py aus einer Kopie des Baums, leeres data/): echte JSON-Antworten, echte Seite, kein Fixture.
//   node smoke_echt.js [bilder/echt]
let playwright; try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = playwright;
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const WURZEL = path.resolve(__dirname, '../..');
const vorsatz = process.argv[2] || 'bilder/echt';
const PORT = 8799, BASIS = 'http://127.0.0.1:' + PORT;
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-echt-'));
  fs.cpSync(path.join(WURZEL, 'tools', 'trading'), path.join(tmp, 'tools', 'trading'), { recursive: true, filter: s => !s.includes('__pycache__') });
  const env = { PATH: process.env.PATH, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', HOME: tmp };
  const srv = spawn('python3', [path.join(tmp, 'tools/trading/krypto_bot/cockpit.py'), '--kein-browser', '--ohne-telegram', '--ohne-news', '--ohne-pflege', '--port', String(PORT)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  let ok = false;
  for (let i = 0; i < 60 && !ok; i++) { try { const r = await fetch(BASIS + '/api/stand'); ok = r.ok; } catch (e) { await new Promise(r => setTimeout(r, 500)); } }
  if (!ok) { console.log('Server startete nicht:', log.slice(-500)); srv.kill(); process.exit(2); }
  const stand = await (await fetch(BASIS + '/api/stand')).json(), profit = await (await fetch(BASIS + '/api/profit')).json();
  console.log('stand-Schlüssel:', Object.keys(stand).sort().join(','));
  console.log('satellit:', stand.satellit === null ? 'null' : typeof stand.satellit, '| kurse:', JSON.stringify(Object.keys(stand.kurse || {})), '| maerkte:', (stand.maerkte || []).length, '| gesundheit:', (stand.gesundheit || []).length);
  console.log('profit:', JSON.stringify(profit).slice(0, 160));
  const browser = await chromium.launch();
  let fails = 0;
  for (const [name, opts] of [['handy', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }]]) {
    const ctx = await browser.newContext({ ...opts, colorScheme: 'dark', locale: 'de-CH' }), page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', e => fehler.push('PAGEERROR ' + e.message)); page.on('console', m => { if (['error', 'warning'].includes(m.type())) fehler.push(m.type() + ' ' + m.text()); });
    await page.goto(BASIS + '/'); await page.waitForSelector('#uebersicht .ukarte', { timeout: 10000 }); await page.waitForTimeout(1500);
    const r = await page.evaluate(() => ({ karten: document.querySelectorAll('#uebersicht .ukarte').length, text: document.getElementById('uebersicht').innerText.replace(/\s+/g, ' ').slice(0, 300), breit: document.documentElement.scrollWidth <= innerWidth, ampel: document.getElementById('ampelText').innerText }));
    console.log(name, JSON.stringify(r), '| Fehler:', fehler.length ? fehler : 'keine');
    if (!r.breit || fehler.length || r.karten < 4) fails++;
    await page.screenshot({ path: `${vorsatz}-${name}.png` });
    await ctx.close();
  }
  await browser.close(); srv.kill();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fails ? 'RAUCHPROBE: FEHLER' : 'RAUCHPROBE: ok');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ABSTURZ', e); process.exit(2); });
