const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const S = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad';
const URL_ = fs.readFileSync(S + '/canary_preview_url.txt', 'utf8').trim();
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
(async () => {
  const b = await chromium.launch();
  const out = {};
  for (const [name, w, h] of [['desktop', 1440, 900], ['handy', 390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, userAgent: UA, locale: 'de-CH' });
    const p = await ctx.newPage();
    const errs = [], bad = [], editorReq = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 240)));
    p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
    p.on('response', (r) => { const u = r.url(); if (/lspod-designer/.test(u)) editorReq.push(r.status() + ' ' + u.replace(/\?.*/, '').slice(-60)); else if (r.status() >= 400 && !/shop\.app|monorail|clarity|facebook|tiktok|google|doubleclick/.test(u)) bad.push(r.status() + ' ' + u.slice(0, 120)); });
    const resp = await p.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(9000);
    const r = await p.evaluate(() => {
      const d = document.querySelector('.lspod-designer-v6');
      const t = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
      return {
        titel: t(document.querySelector('h1')).slice(0, 80),
        mount: !!d, mountKlassen: d ? d.className : null, dataInit: d ? d.getAttribute('data-init-v6') : null,
        knoepfe: d ? [...d.querySelectorAll('button')].map((b) => t(b).slice(0, 30)).slice(0, 14) : [],
        canvas: d ? d.querySelectorAll('canvas').length : 0,
        propInputs: [...document.querySelectorAll('input[name^="properties["]')].map((i) => i.name),
        formAction: (document.querySelector('form[action*="/cart/add"]') || {}).action || null,
        kaufKnopf: (document.querySelector('button.add-to-cart-button, [name=add]') || {}).disabled,
        scrollX: document.documentElement.scrollWidth > window.innerWidth + 1,
        hatEditorText: /Druckfläche|Motiv|hochladen/i.test(d ? d.innerText : ''),
        sichtbareVarianten: [...document.querySelectorAll('input[type=radio]:checked')].map((i) => i.value),
        noindex: !!document.querySelector('meta[name=robots][content*=noindex]'),
      };
    });
    await p.screenshot({ path: `${S}/canary_${name}.png`, fullPage: false });
    out[name] = { status: resp && resp.status(), ...r, editorReq, fehler: errs.slice(0, 8), bad: bad.slice(0, 6) };
    await ctx.close();
    await new Promise((r) => setTimeout(r, 3000));
  }
  await b.close();
  console.log(JSON.stringify(out, null, 1));
})().catch((e) => { console.error('FEHLER', e); process.exit(1); });
