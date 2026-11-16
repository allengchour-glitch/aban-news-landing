// Kontrast der Kapiteltexte gegen den Hintergrund dahinter (Nachbau, je Kapitel 3 Zeitpunkte).
// Verfahren: Textrechtecke messen, Text unsichtbar machen, Bildschirmfoto, im Rechteck die hellsten 2 % Pixel als Hintergrund nehmen
// (ungünstigster Fall), Kontrast WCAG gegen die Textfarbe. Aufruf: node test/kontrast.cjs <desktop|handy>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const BASIS = path.join(__dirname, '..');
const { einrichten, kontext, START } = require(path.join(BASIS, 'harness', 'nachbau.cjs'));
function lum(r, g, b) { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function hexRgb(s) { const m = s.match(/\d+(\.\d+)?/g).map(Number); return m.slice(0, 3); }
(async () => {
  const form = process.argv[2] || 'desktop';
  const html = execFileSync(process.execPath, [path.join(BASIS, 'harness', 'render.mjs'), path.join(BASIS, 'theme'), '-', 'normal'], { encoding: 'utf8' });
  const b = await chromium.launch(); const ctx = await kontext(b, form); const page = await ctx.newPage();
  await einrichten(page, html);
  await page.goto(START, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  await page.evaluate(() => { const bn = [...document.querySelectorAll('#lx-cookie-banner button')].find((x) => /notwendig/i.test(x.textContent)); if (bn) bn.click(); const a = document.querySelector('#luxas-open, .luxas'); });
  await page.addStyleTag({ content: '#lx-pop{display:none!important}' }); // Newsletter-Fenster des Themes verdeckt sonst die Messung
  const ziele = await page.evaluate(() => [...document.querySelectorAll('.lx-story__kapitel')].map((k) => { const r = k.getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; }));
  const erg = []; let schlecht = 0;
  for (let i = 0; i < ziele.length; i++) {
    const von = await page.evaluate(() => scrollY);
    for (let j = 1; j <= 6; j++) { await page.evaluate((y) => scrollTo(0, y), von + ((ziele[i] - von) * j) / 6); await page.waitForTimeout(50); }
    await page.waitForTimeout(1500);
    for (let t = 0; t < 3; t++) {
      const boxen = await page.evaluate((i) => { const k = document.querySelectorAll('.lx-story__kapitel')[i]; return ['.lx-story__nr', '.lx-story__wort', '.lx-story__zeile'].map((s) => { const e = k.querySelector(s); const r = e.getBoundingClientRect(); return { s, x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(innerWidth, r.right) - Math.max(0, r.left), h: Math.min(innerHeight, r.bottom) - Math.max(0, r.top), farbe: getComputedStyle(e).color, op: +getComputedStyle(k.querySelector('.lx-story__text')).opacity }; }); }, i);
      await page.evaluate((i) => { document.querySelectorAll('.lx-story__kapitel')[i].querySelectorAll('.lx-story__nr,.lx-story__wort,.lx-story__zeile').forEach((e) => { e.style.color = 'transparent'; e.style.textShadow = 'none'; e.querySelectorAll('*').forEach((c) => (c.style.color = 'transparent')); }); document.querySelectorAll('.lx-story__video').forEach((v) => v.pause()); }, i);
      await page.waitForTimeout(120);
      const png = await page.screenshot({ type: 'png' });
      const f = path.join(BASIS, 'probe', 'k.png'); fs.writeFileSync(f, png); if (i === 5) fs.writeFileSync(path.join(BASIS, 'probe', 'k6_' + t + '.png'), png);
      for (const bx of boxen) {
        if (bx.w < 4 || bx.h < 4) continue;
        const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', `crop=${Math.floor(bx.w)}:${Math.floor(bx.h)}:${Math.floor(bx.x)}:${Math.floor(bx.y)},format=rgb24`, '-f', 'rawvideo', '-'], { maxBuffer: 1e8 });
        const L = []; for (let p = 0; p < raw.length; p += 3) L.push(lum(raw[p], raw[p + 1], raw[p + 2]));
        L.sort((a, c) => a - c); const hell = L[Math.floor(L.length * 0.98)];
        const [r, g, bb] = hexRgb(bx.farbe); const lt = lum(r, g, bb);
        const k = (Math.max(lt, hell) + 0.05) / (Math.min(lt, hell) + 0.05);
        const z = { kapitel: i + 1, zeit: t, element: bx.s, kontrast: +k.toFixed(2), deckkraftText: bx.op };
        erg.push(z); if (k < 4.5 && bx.op > 0.5) schlecht++;
      }
      await page.evaluate((i) => { document.querySelectorAll('.lx-story__kapitel')[i].querySelectorAll('.lx-story__nr,.lx-story__wort,.lx-story__zeile,.lx-story__nr *').forEach((e) => { e.style.color = ''; e.style.textShadow = ''; }); document.querySelectorAll('.lx-story__ebene[data-aktiv] video').forEach((v) => v.play()); }, i);
      await page.waitForTimeout(600);
    }
  }
  await b.close();
  const min = {}; for (const e of erg) { const key = e.element; min[key] = Math.min(min[key] ?? 99, e.kontrast); }
  console.log(form, 'kleinster Kontrast je Element:', JSON.stringify(min), 'unter 4,5:1:', schlecht, 'von', erg.length);
  fs.writeFileSync(path.join(BASIS, 'mess', 'kontrast_' + form + '.json'), JSON.stringify({ min, schlecht, erg }, null, 1));
  process.exit(schlecht ? 1 : 0);
})();
