// Prüft das Katalogfenster am LIVE-Shop (nur lesend, genau EIN Seitenaufruf mit Query, normale Chrome-Kennung, Analytik abgebrochen).
//   NODE_PATH=$(npm root -g) node dropship/katalog-einheiten-0411/pruefen_live.cjs [basis-url]
// Cloudflare zeigt Headless-Browsern bei Query-Adressen teils eine Bot-Prüfung; dann meldet das Skript «BOT-SPERRE» und prüft nichts.
const { chromium } = require('playwright');
const BASIS = process.argv[2] || 'https://luxestyle.ch/collections/selbst-gestalten-1?view=luxe-gestalten';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const erg = { fehler: [], hinweise: [], daten: {} };
const pruef = (ok, t) => { if (!ok) erg.fehler.push(t); };
(async () => {
  const b = await chromium.launch();
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: vp, userAgent: UA, locale: 'de-CH' });
    const page = await ctx.newPage(); const seitenfehler = [];
    page.on('pageerror', (e) => seitenfehler.push(e.message.slice(0, 200)));
    await ctx.route('**/*', (r) => { const h = new URL(r.request().url()).hostname; if (/clarity|facebook|tiktok|google|doubleclick|analytics|klaviyo|judge|hotjar|bing/i.test(h)) return r.abort(); return r.continue(); });
    const resp = await page.goto(BASIS, { waitUntil: 'domcontentloaded', timeout: 45000 });
    erg.daten[`${vp.width}_status`] = resp && resp.status();
    const titel = await page.title();
    if (/just a moment|attention required|cloudflare/i.test(titel) || (resp && [403, 429, 503].includes(resp.status()))) { console.log('BOT-SPERRE', resp && resp.status(), titel); await ctx.close(); await b.close(); process.exit(2); }
    await page.waitForFunction(() => document.querySelector('[data-luxe-clothing]')?.dataset.filteredCount, null, { timeout: 40000 }).catch(() => erg.fehler.push(`${vp.width}: Katalog hat nicht geladen`));
    const oeffne = async (name) => {
      await page.fill('[data-lcl-search]', ''); await page.fill('[data-lcl-search]', name); await page.waitForTimeout(500);
      const karten = await page.$$eval('.lcl-card h3', (hs) => hs.map((h) => h.textContent.trim()));
      const idx = karten.findIndex((t) => t.toLowerCase() === name.toLowerCase());
      if (idx < 0) return false;
      await page.locator('.lcl-card .lcl-card-cta').nth(idx).click(); await page.waitForTimeout(600); return true;
    };
    const lies = () => page.evaluate(() => {
      const dlg = document.querySelector('[data-lcl-dialog]'); const pb = dlg.querySelector('[data-lcl-shop-price]'); const cta = pb.querySelector('[data-lcl-design-cta]');
      return { groessen: [...dlg.querySelectorAll('.lcl-size')].map((x) => x.textContent.trim()), preisBox: pb.innerText.replace(/\s+/g, ' ').trim(), cta: cta ? { text: cta.textContent.trim(), href: cta.getAttribute('href'), hoehe: Math.round(cta.getBoundingClientRect().height) } : null, ueberlauf: document.documentElement.scrollWidth > innerWidth + 1, roheSchluessel: /design_cta|not_orderable|variant_not_orderable|switch_orderable|offer_unavailable/.test(dlg.innerText) };
    });
    const konfig = await page.evaluate(() => { try { return JSON.parse(document.querySelector('[data-lcl-config]').textContent); } catch { return null; } });
    erg.daten[`${vp.width}_angebote`] = konfig && (konfig.shopVariantOffers || []).length;
    // Tasse
    if (await oeffne('White Glossy Mug')) { const d = await lies(); erg.daten[`${vp.width}_tasse`] = d; pruef(d.groessen.join('|') === '325 ml|444 ml|591 ml', `${vp.width}: Tasse Grössen: ${d.groessen.join(' / ')}`); pruef(!d.roheSchluessel, `${vp.width}: roher Schlüsselname sichtbar`); pruef(!d.ueberlauf, `${vp.width}: seitliches Scrollen`); await page.click('[data-lcl-close]'); await page.waitForTimeout(150); } else erg.fehler.push(`${vp.width}: Tasse nicht gefunden`);
    // Schuh
    if (await oeffne("Men's Slip-On Canvas Shoes")) { const d = await lies(); erg.daten[`${vp.width}_schuh`] = d; pruef(d.groessen.length > 0 && d.groessen.every((g) => g.startsWith('EU ')), `${vp.width}: Schuhgrössen nicht alle EU: ${d.groessen.join(' / ')}`); pruef(/Noch nicht bestellbar/.test(d.preisBox) && !d.cta, `${vp.width}: Schuh: Hinweis/Knopf falsch: ${d.preisBox}`); await page.click('[data-lcl-close]'); await page.waitForTimeout(150); } else erg.fehler.push(`${vp.width}: Schuh nicht gefunden`);
    // Filter
    const opt = await page.$$eval('[data-lcl-size-filter] option', (os) => os.map((o) => ({ v: o.value, t: o.textContent.trim() })));
    erg.daten[`${vp.width}_filter10`] = (opt.find((o) => o.v === '10') || {}).t;
    pruef(/EU 44/.test(erg.daten[`${vp.width}_filter10`] || '') && /EU 42/.test(erg.daten[`${vp.width}_filter10`] || ''), `${vp.width}: Filter 10: ${erg.daten[`${vp.width}_filter10`]}`);
    if (seitenfehler.length) erg.fehler.push(`${vp.width}: Seitenfehler: ${seitenfehler.slice(0, 3).join(' | ')}`);
    await ctx.close();
    await new Promise((r) => setTimeout(r, 9000));
  }
  await b.close();
  console.log(JSON.stringify(erg, null, 1)); console.log('FEHLER:', erg.fehler.length); erg.fehler.forEach((f) => console.log(' -', f));
  process.exit(erg.fehler.length ? 1 : 0);
})().catch((e) => { console.error('FEHLER', e.message); process.exit(1); });
