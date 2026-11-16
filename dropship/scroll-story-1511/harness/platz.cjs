// Vergleich Platz: (a) nach dem Hero, (b) als neuer Hero (Hero ausgeblendet). Erste Ansicht ohne Scrollen + nach 1 Bildschirm.
const { chromium } = require('playwright');
const fs = require('fs');
const { einrichten, kontext, START } = require('./nachbau.cjs');
(async () => {
  const [storyDatei, aus, form] = process.argv.slice(2);
  const b = await chromium.launch();
  for (const v of ['a_nachhero', 'b_alshero']) {
    const ctx = await kontext(b, form);
    const page = await ctx.newPage();
    await einrichten(page, fs.readFileSync(storyDatei, 'utf8'));
    await page.goto(START, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(3000);
    await page.evaluate((v) => {
      const bn = [...document.querySelectorAll('#lx-cookie-banner button')].find((x) => /notwendig/i.test(x.textContent)); if (bn) bn.click();
      if (v === 'b_alshero') { const w = document.querySelector('[data-lx-story]').closest('.shopify-section'); const h = document.querySelector('.lx-hero'); h.parentNode.insertBefore(w, h); h.style.display = 'none'; }
    }, v);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${aus}_${v}_0.jpg`, type: 'jpeg', quality: 70 });
    const vh = page.viewportSize().height;
    for (let j = 1; j <= 6; j++) { await page.evaluate((y) => scrollTo(0, y), (vh * j) / 6); await page.waitForTimeout(80); }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${aus}_${v}_1.jpg`, type: 'jpeg', quality: 70 });
    await ctx.close();
  }
  await b.close();
})();
