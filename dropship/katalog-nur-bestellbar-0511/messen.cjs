// Misst das Katalogfenster am LIVE-Shop (nur lesend, zwei Seitenaufrufe nacheinander mit 9 s Pause: 1440 und 390 px, normale Chrome-Kennung, Analytik abgebrochen).
// Liefert die «vorher»-Zahlen dieses Pakets: Karten, Knöpfe, Links auf view=luxe-studio (HTML und DOM), Gruppen, Typ-Liste, Filter, Details eines Modells ohne und eines mit Angebot.
//   NODE_PATH=$(/opt/node22/bin/npm root -g) /opt/node22/bin/node dropship/katalog-nur-bestellbar-0511/messen.cjs
// Nach dem Einspielen liefert dasselbe Skript die «nachher»-Zahlen (dann zeigen kartenMitGestaltenKnopf, studioLinks* und gruppen die neue Lage).
const { chromium } = require('playwright');
const URL_ = 'https://luxestyle.ch/collections/selbst-gestalten-1?view=luxe-gestalten';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
(async () => {
  const b = await chromium.launch(); const aus = {};
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: vp, userAgent: UA, locale: 'de-CH' });
    const page = await ctx.newPage(); const fehler = [];
    page.on('pageerror', (e) => fehler.push(e.message.slice(0, 150)));
    await ctx.route('**/*', (r) => { const h = new URL(r.request().url()).hostname; if (/clarity|facebook|tiktok|google|doubleclick|analytics|klaviyo|judge|hotjar|bing/i.test(h)) return r.abort(); return r.continue(); });
    const resp = await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => document.querySelector('[data-luxe-clothing]')?.dataset.filteredCount, null, { timeout: 40000 });
    const d = await page.evaluate(() => {
      const root = document.querySelector('[data-luxe-clothing]');
      const q = (s) => [...document.querySelectorAll(s)];
      const txt = (s) => (document.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim();
      return {
        status: null,
        ergebniszeile: txt('[data-lcl-results]'), nachricht: txt('[data-lcl-message]'),
        hinweis: txt('.lcl-notice'), hinweisDialog: txt('.lcl-dialog-notice'), intro: txt('.lcl-intro'), shopIntro: txt('.lxc-collection-heading > p'),
        quelleAnzahl: root.dataset.sourceCount, gefiltert: root.dataset.filteredCount,
        kartenAufSeite: q('.lcl-card').length,
        kartenMitGestaltenKnopf: q('.lcl-card .lcl-design-cta').length,
        kartenKnopfTexte: [...new Set(q('.lcl-card-cta').map((x) => x.textContent.trim()))],
        gruppen: q('.lcl-group').length, gruppenMitZaehler: q('.lcl-group').map((g) => g.textContent.replace(/\s+/g, ' ').trim()),
        gruppenNullModelle: q('.lcl-group').filter((g) => /\b0$/.test(g.textContent.trim())).length,
        typOptionen: [...document.querySelectorAll('[data-lcl-types] option')].length,
        typOptionenNull: [...document.querySelectorAll('[data-lcl-types] option')].filter((o) => /\(0\)\s*$/.test(o.textContent)).length,
        farben: document.querySelectorAll('[data-lcl-color-filter] option').length - 1, groessen: document.querySelectorAll('[data-lcl-size-filter] option').length - 1,
        shortcutSichtbar: q('[data-lcl-category-shortcut]').filter((x) => !x.hidden).map((x) => x.textContent.trim()),
        audienceSichtbar: q('[data-lcl-audience]').filter((x) => !x.hidden).map((x) => x.textContent.trim()),
        studioLinksDom: q('a[href*="view=luxe-studio"]').length,
        studioLinksKarten: q('.lxc-card a[href*="view=luxe-studio"]').length,
        studioLinksCover: q('.lcl-cover-image[href*="view=luxe-studio"]').length,
        shopKarten: q('.lxc-card').length, shopKartenNichtVerfuegbar: q('.lxc-unavailable').length,
        scrollBreite: document.documentElement.scrollWidth, fensterBreite: innerWidth,
      };
    });
    d.status = resp.status(); d.seitenfehler = fehler;
    // Detail eines Modells ohne Angebot (erste Karte) und eines mit Angebot (Tasse)
    const detail = async (name) => {
      await page.fill('[data-lcl-search]', name); await page.waitForTimeout(600);
      const n = await page.locator('.lcl-card-cta').count(); if (!n) return null;
      await page.locator('.lcl-card-cta').first().click(); await page.waitForTimeout(900);
      return page.evaluate(() => {
        const dlg = document.querySelector('[data-lcl-dialog]');
        return { titel: dlg.querySelector('[data-lcl-detail-title]').textContent, preisBox: dlg.querySelector('[data-lcl-shop-price]').innerText.replace(/\s+/g, ' ').trim().slice(0, 300), knopf: !!dlg.querySelector('[data-lcl-design-cta]'), farben: dlg.querySelectorAll('.lcl-color-choice').length, groessen: dlg.querySelectorAll('.lcl-size').length, original: dlg.querySelector('[data-lcl-original-variants]')?.textContent };
      });
    };
    d.detailOhneAngebot = await detail("Men's Slip-On Canvas Shoes");
    await page.keyboard.press('Escape');
    d.detailMitAngebot = await detail('Unisex Staple T-Shirt');
    await page.keyboard.press('Escape');
    aus[vp.width] = d;
    await ctx.close();
    await new Promise((r) => setTimeout(r, 9000));
  }
  await b.close();
  console.log(JSON.stringify(aus, null, 1));
})().catch((e) => { console.error('FEHLER', e.message); process.exit(1); });
