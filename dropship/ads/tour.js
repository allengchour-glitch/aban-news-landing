const { chromium } = require('playwright');

(async () => {
  const url = 'https://luxestyle.ch';
  const jobs = [
    { name: '9x16', vw: 540, vh: 960, size: { width: 1080, height: 1920 } },
    { name: '1x1',  vw: 600, vh: 600, size: { width: 1080, height: 1080 } },
  ];
  for (const j of jobs) {
    const browser = await chromium.launch({ args: ['--hide-scrollbars'] });
    const context = await browser.newContext({
      viewport: { width: j.vw, height: j.vh },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      ignoreHTTPSErrors: true,
      recordVideo: { dir: '/tmp/ads/tour/' + j.name, size: { width: j.vw, height: j.vh } },
    });
    const page = await context.newPage();
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { console.log('goto warn', e.message); }
    await page.waitForTimeout(3000); // let hero + images load

    // dismiss cookie/consent banners if present
    const consent = ['button:has-text("Alle akzeptieren")','button:has-text("Akzeptieren")','button:has-text("Accept all")','button:has-text("Accept")','button:has-text("Zustimmen")','#shopify-pc__banner__btn-accept','button:has-text("Ich stimme zu")','button:has-text("OK")'];
    for (const sel of consent) {
      try { const b = page.locator(sel).first(); if (await b.isVisible({ timeout: 600 })) { await b.click({ timeout: 1000 }); console.log('consent clicked:', sel); break; } } catch (e) {}
    }
    await page.waitForTimeout(1000);

    // smooth eased auto-scroll to bottom
    await page.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const docH = () => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const maxY = () => docH() - window.innerHeight;
      const dur = 10500; const start = performance.now();
      const ease = t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      while (true) {
        const t = (performance.now() - start) / dur;
        if (t >= 1) break;
        window.scrollTo(0, Math.round(ease(Math.min(t, 1)) * maxY()));
        await sleep(16);
      }
      window.scrollTo(0, maxY());
      await sleep(800);
    });
    await page.waitForTimeout(500);

    await context.close();
    await browser.close();
    console.log('recorded', j.name);
  }
  console.log('TOUR DONE');
})();
