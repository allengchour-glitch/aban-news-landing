// Live: letztes Kapitel und Schluss (Pause bleibt, Punkte blenden erst beim Wegscrollen aus). Ein Seitenaufruf je Form.
const { chromium } = require('playwright');
const URL_ = process.env.ADRESSE || 'https://luxestyle.ch/?view=lxstory';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
(async () => {
  const [form, aus] = process.argv.slice(2);
  const handy = form === 'handy';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: handy ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: handy ? 2 : 1, userAgent: handy ? UAM : UA, locale: 'de-CH', isMobile: handy, hasTouch: handy, extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
  const page = await ctx.newPage();
  const fehler = []; page.on('pageerror', (e) => fehler.push(String(e).slice(0, 200)));
  const resp = await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);
  const ver = await page.evaluate(async () => {
    const sc = [...document.scripts].find((s) => /lx-story\.js/.test(s.src));
    let neuJs = null; if (sc) { try { neuJs = (await (await fetch(sc.src)).text()).replace(/\s/g, '').replace('0.999', '.999').includes('g>=.999'); } catch (e) { neuJs = 'fehler'; } }
    let regel = false, alteRegel = false;
    for (const ss of document.styleSheets) { let r; try { r = ss.cssRules; } catch (e) { continue; } for (const x of r) { const t = x.selectorText || ''; if (t.includes('[data-ende] .lx-story__punkte')) regel = true; if (t === '.lx-story[data-ende] .lx-story__steuer') alteRegel = true; } }
    return { js: sc ? sc.src.replace(/^.*\/assets\//, '') : null, neuJs, regel, alteRegel };
  });
  const lage = () => page.evaluate(() => { const s = document.querySelector('[data-lx-story]'); const p = document.querySelector('.lx-story__pause'); const b = p.getBoundingClientRect(); const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); const v = [...document.querySelectorAll('.lx-story__video')].filter((x) => !x.paused).length; return { kapitel: s.getAttribute('data-kapitel'), ende: s.hasAttribute('data-ende'), punkte: getComputedStyle(document.querySelector('.lx-story__punkte')).visibility, pause: getComputedStyle(p).visibility, pauseOben: !!t && (t === p || p.contains(t)), oben: t ? String(t.className || t.tagName).slice(0, 40) : null, pauseY: Math.round(b.top), laufendeVideos: v }; });
  const ziel = async (fn) => { const y = await page.evaluate(fn); const von = await page.evaluate(() => scrollY); for (let j = 1; j <= 12; j++) { await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), von + ((y - von) * j) / 12); await page.waitForTimeout(120); } await page.waitForTimeout(2500); };
  await ziel(() => { const k = [...document.querySelectorAll('.lx-story__kapitel')].pop(); const r = k.getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; });
  const letztes = await lage(); await page.screenshot({ path: aus + '_letztes.jpg', quality: 70, type: 'jpeg' });
  await ziel(() => { const s = document.querySelector('[data-lx-story]'); const r = s.getBoundingClientRect(); return r.top + scrollY + r.height - innerHeight; });
  const schluss = await lage(); await page.screenshot({ path: aus + '_schluss.jpg', quality: 70, type: 'jpeg' });
  console.log(JSON.stringify({ form, http: resp.status(), zeit: new Date().toISOString(), ver, letztes, schluss, fehler }));
  await b.close();
})();
