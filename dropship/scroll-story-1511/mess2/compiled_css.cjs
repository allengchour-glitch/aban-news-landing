// Misst die kompilierten Theme-Stile (compiled_assets/styles.css) auf einer Seite: Adresse, Bytes, Prüfsumme, enthält lx-story?
const { chromium } = require('playwright');
const crypto = require('crypto');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
  const p = await ctx.newPage();
  const css = [];
  p.on('response', async (r) => { if (/compiled_assets\/styles\.css/.test(r.url())) { try { const t = await r.body(); css.push({ url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), bytes: t.length, md5: crypto.createHash('md5').update(t).digest('hex'), lxStory: /lx-story/.test(t.toString()) }); } catch (e) {} } });
  for (const u of process.argv.slice(2)) {
    css.length = 0;
    await p.goto(u, { waitUntil: 'load', timeout: 90000 });
    await p.waitForTimeout(4000);
    console.log(u, JSON.stringify(css));
    await new Promise((s) => setTimeout(s, 3000));
  }
  await b.close();
})();
