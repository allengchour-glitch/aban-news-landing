const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const S = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const dr = JSON.parse(fs.readFileSync(S + '/cj_entwuerfe.json', 'utf8'));
const ziele = [['live-nachtlicht', 'https://luxestyle.ch/products/faltbare-led-nachtlichtlampe-beruhrungsempfind-38ce45'], ...dr.slice(1).map((d) => ['entwurf-' + d.handle.slice(0, 24), d.url])];
(async () => {
  const b = await chromium.launch();
  for (const [name, u] of ziele) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'de-CH' });
    const p = await ctx.newPage();
    const resp = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(7000);
    const r = await p.evaluate(() => ({ opts: [...document.querySelectorAll('input[data-option-available]')].map((i) => i.value.slice(0, 14) + ':' + i.getAttribute('data-option-available')).slice(0, 8), knopf: ((document.querySelector('button.add-to-cart-button') || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), host: location.host.slice(0, 20) }));
    console.log(name, resp && resp.status(), JSON.stringify(r));
    await ctx.close();
    await new Promise((r) => setTimeout(r, 2500));
  }
  await b.close();
})().catch((e) => { console.error('FEHLER', e); process.exit(1); });
