// Live-Messung des Katalogfensters nach dem Einspielen (nur lesend, normale Chrome-Kennung, nacheinander).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'https://luxestyle.ch/collections/selbst-gestalten-1?view=luxe-gestalten';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
(async () => {
  const b = await chromium.launch();
  const out = {};
  for (const [name, w, h] of [['desktop', 1440, 900], ['handy', 390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, userAgent: UA, locale: 'de-CH' });
    const p = await ctx.newPage();
    const errs = [], reqs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
    p.on('response', (r) => { const u = r.url(); if (/luxe-clothing/.test(u)) reqs.push(r.status() + ' ' + u.replace(/^https:\/\/[^/]+/, '').slice(0, 110)); });
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(9000);
    const r = await p.evaluate(() => {
      const t = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
      const cards = [...document.querySelectorAll('[data-lx-card],.lxc-card,.luxe-clothing-card,article')].filter((c) => c.offsetParent);
      const sel = document.querySelector('.luxe-clothing, [data-luxe-clothing], #luxe-clothing') || document.body;
      const text = sel.innerText || '';
      return {
        cards: cards.length,
        erste: cards.slice(0, 6).map((c) => t(c).slice(0, 140)),
        scrollX: document.documentElement.scrollWidth > window.innerWidth + 1,
        hatReloadNeeded: /reload_needed|translation missing/i.test(text),
        oz: (text.match(/\b\d+(\.\d+)?\s*oz\b/g) || []).length,
        zoll: (text.match(/\b\d+(\.\d+)?\s*(in|inch|″|")\b/g) || []).length,
        nurBestellbar: /bestellbar/i.test(text),
        zaehler: (text.match(/\d+\s+(Modelle?|Produkte?)[^.\n]{0,60}/i) || [''])[0],
        textStart: text.slice(0, 500).replace(/\s+/g, ' '),
      };
    });
    await p.screenshot({ path: `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/kf_live_${name}.png`, fullPage: false });
    out[name] = { ...r, fehler: errs.slice(0, 6), assets: reqs.slice(0, 8) };
    await ctx.close();
    await new Promise((r) => setTimeout(r, 3000));
  }
  await b.close();
  console.log(JSON.stringify(out, null, 1));
})().catch((e) => { console.error('FEHLER', e); process.exit(1); });
