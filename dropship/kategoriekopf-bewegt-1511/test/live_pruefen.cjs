// Live-Pruefung der Testvorlage auf luxestyle.ch (echte Seiten). Hoechstens 1 Seitenaufruf je 7 s (abrufe.log), bei 429 warten.
// Aufruf: node test/live_pruefen.cjs <desktop|d1100|handy> handle1[:w1] handle2 ...   (:w1 = Kopffotos zusaetzlich pixelgenau gegen heute ohne ?view=)
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const { ZUSTAND } = require('./zustand.cjs');
const { VORBEREITEN, pixelVergleich, geoGleich } = require('./bildgeo.cjs');
const HIER = path.join(__dirname, '..'); const LOG = path.join(HIER, 'abrufe.log');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const CLIP = { schmuck: 's03', 'sub-armbaender': 's03', 'gliederarmbaender': 's03', 'zirkonia-strassarmbaender': 's03', 'sub-beleuchtung': 's01', 'nachtlichter-ambiente': 's01', 'wohnen-dekoration': 's01', 'weihnachten-2026': 's05', 'damen-reisetaschen': 's06', 'herren-reisetaschen': 's06', 'sub-reise': 's06', 'geschirr-tisch': 's09', 'kaffee-tee-trinken': 's09' };
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
async function takt() { let letzte = 0; if (fs.existsSync(LOG)) { const z = fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean); if (z.length) letzte = Date.parse(z[z.length - 1].split(' ')[0]); } const w = letzte + 7000 - Date.now(); if (w > 0) await schlaf(w); }
const INIT = () => { window.__cls = 0; window.__clsKopf = 0; window.__lcp = []; window.__erstKopf = null;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; window.__cls += e.value; const qs = (e.sources || []).filter((s) => s.node && s.node.nodeType === 1 && s.node.closest); if (qs.length && qs.every((s) => s.node.closest('.lx-kk'))) window.__clsKopf += e.value; } }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), size: e.size, tag: e.element && e.element.tagName, cls: e.element && String(e.element.className).slice(0, 30), url: (e.url || '').split('/').pop().slice(0, 50) }); }).observe({ type: 'largest-contentful-paint', buffered: true });
  document.addEventListener('DOMContentLoaded', () => { const k = document.querySelector('.lx-kk'); if (k) { const r = k.getBoundingClientRect(); window.__erstKopf = { y: Math.round(r.top + scrollY), h: Math.round(r.height) }; } }); };
async function laden(b, url, handy, breite) {
  for (let v = 0; v < 3; v++) {
    await takt();
    const ctx = await b.newContext({ viewport: handy ? { width: 390, height: 664 } : { width: breite || 1440, height: 900 }, userAgent: handy ? UAM : UA, isMobile: handy, hasTouch: handy, locale: 'de-CH', extraHTTPHeaders: { 'Accept-Language': 'de-CH,de;q=0.9' } });
    const netz = { video: [], poster: [] };
    await ctx.route('**/*', (r) => (/monorail|web-pixels|\/api\/collect|clarity\.ms|google-analytics|googletagmanager|facebook|tiktok|pinterest|klaviyo/.test(r.request().url()) ? r.abort() : r.continue()));
    const page = await ctx.newPage(); const fehler = [];
    page.on('pageerror', (e) => fehler.push(String(e).slice(0, 160)));
    page.on('response', (r) => { const u = r.url(); if (/lx-(story|kb)-s\d\d-quer-(v1|960)\.mp4/.test(u)) netz.video.push(r.status()); if (/lx-(story|kb)-s\d\d-quer-(v1|960)\.webp/.test(u)) netz.poster.push(r.status()); });
    await page.addInitScript(INIT);
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 90000 });
    fs.appendFileSync(LOG, `${new Date().toISOString()} ${url} ${resp.status()}\n`);
    if (resp.status() === 429) { await ctx.close(); console.log('429, warte 60 s'); await schlaf(60000); continue; }
    return { ctx, page, resp, netz, fehler };
  }
  throw new Error('429 dreimal');
}
const GEO = () => { const k = document.querySelector('.lx-kk'); const karte = document.querySelector('results-list li.product-grid__item'); const img = karte ? [...karte.querySelectorAll('img')].find((i) => i.getBoundingClientRect().width > 0) : null; const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { y: Math.round(b.top + scrollY), h: Math.round(b.height) }; }; return { kk: r(k), bild: r(img), ueber: document.documentElement.scrollWidth - innerWidth, cls: +window.__cls.toFixed(4), clsKopf: +window.__clsKopf.toFixed(4), erst: window.__erstKopf, lcp: window.__lcp.slice(-1)[0] || null, aktiv: !!document.querySelector('.lx-kb-knopf, .lx-kk.lx-kb-an, .lx-kk.lx-kb-clip') || /lxkb-schein/.test(document.documentElement.innerHTML) }; };
(async () => {
  const [form, ...handles] = process.argv.slice(2); const handy = form === 'handy'; const breite = form === 'd1100' ? 1100 : 1440;
  const b = await chromium.launch(); const erg = []; let fehl = 0;
  const ok = (bed, t, w) => { console.log((bed ? 'OK ' : 'FEHLER ') + t + ' ' + (w === undefined ? '' : JSON.stringify(w))); if (!bed) fehl++; };
  for (const hs of handles) {
    const [h, w1] = hs.split(':');
    const url = `https://luxestyle.ch/collections/${h}?view=lxbewegt`;
    const t = await laden(b, url, handy, breite);
    const html = await t.page.content();
    await t.page.waitForTimeout(handy ? 3000 : 1500);
    const g1 = await t.page.evaluate(GEO); const z1 = await t.page.evaluate(ZUSTAND);
    const tag = `${h} ${form}:`;
    const clipSoll = !!CLIP[h] && breite >= 1100;
    ok(t.resp.status() === 200, tag + ' HTTP 200', t.resp.status());
    ok(!/Liquid (syntax )?error/i.test(html), tag + ' 0 Liquid-Fehler');
    ok(/lxkb-a/.test(html), tag + ' Testvorlage aktiv (Stil von lx-kopf-bewegt im HTML)');
    ok(t.fehler.length === 0, tag + ' keine Seitenfehler', t.fehler);
    ok(g1.ueber === 0, tag + ' kein seitliches Scrollen', g1.ueber);
    if (handy) {
      // Vergleich mit der heutigen Seite
      const t0 = await laden(b, `https://luxestyle.ch/collections/${h}`, true); await t0.page.waitForTimeout(3000);
      const g0 = await t0.page.evaluate(GEO); await t0.ctx.close();
      ok(g1.kk.h === g0.kk.h && g1.bild.y === g0.bild.y, tag + ' Kopfhöhe und erstes Produktbild wie heute', { heute: [g0.kk.h, g0.bild.y], test: [g1.kk.h, g1.bild.y] });
      ok(g1.bild.y < 664, tag + ' erstes Produktbild beginnt unter der Fensterhöhe 664', g1.bild.y);
      ok(t.netz.video.length === 0 && t.netz.poster.length === 0 && !z1.knopf, tag + ' kein Clip, kein Poster, kein Knopf', t.netz);
      ok(z1.nachher && z1.nachher.anim === 'lxkb-schein', tag + ' Schimmer hinter dem Titel', z1.nachher);
      ok(g1.clsKopf === 0, tag + ' keine Verschiebung nur im Kopf', [g1.cls, g1.clsKopf, g0.cls]);
      erg.push({ h, form, heute: g0, test: g1 });
    } else {
      await t.page.waitForTimeout(4500);
      const z2 = await t.page.evaluate(ZUSTAND); const g2 = await t.page.evaluate(GEO);
      const clip = clipSoll;
      ok(!!z2.buehneImKopf === clip, tag + (clip ? ' Clip ' + CLIP[h] + ' im Kopf' : ' kein Clip (Fotostreifen)'), z2.buehneImKopf);
      if (clip) {
        let zv = z2; for (let i = 0; i < 16 && !(zv.video && !zv.video.paused && zv.video.frames > 10 && zv.video.op === '1'); i++) { await t.page.waitForTimeout(500); zv = await t.page.evaluate(ZUSTAND); }
        ok(zv.video && !zv.video.paused && zv.video.frames > 10 && zv.video.op === '1', tag + ' Clip spielt (Bilder dekodiert, Bewegung sichtbar)', zv.video);
        ok(t.netz.poster.every((s) => s === 200) && t.netz.video.every((s) => s === 200 || s === 206), tag + ' Poster und Video HTTP 200/206', t.netz);
        ok(zv.video && zv.video.breite === 960 && /^lx-kb-s\d\d-quer-960\.mp4$/.test(zv.video.src), tag + ' K5: Clip-Datei 960×720 (lx-kb-…)', zv.video && [zv.video.src, zv.video.breite]);
        ok(zv.video && zv.video.src.indexOf(CLIP[h]) >= 0, tag + ' Clip passt zur Zuordnung ' + CLIP[h], zv.video && zv.video.src);
      } else {
        ok(z1.fotoTransform !== z2.fotoTransform && z2.fotoAnim !== 'none', tag + ' Fotos driften (Bewegung sichtbar)', [z1.fotoTransform, z2.fotoTransform]);
        ok(t.netz.video.length === 0 && t.netz.poster.length === 0, tag + ' kein Video und kein Poster geladen', t.netz);
      }
      ok(z2.knopf && !z2.knopf.hidden && z2.knopf.label === 'Bewegung anhalten', tag + ' Knopf «Bewegung anhalten» sichtbar', z2.knopf);
      ok(g2.erst && g2.erst.h === g2.kk.h && g2.erst.y === g2.kk.y, tag + ' Kopf beim ersten Zeichnen gleich wie nach dem Laden', [g2.erst, g2.kk]);
      ok(g2.clsKopf === 0, tag + ' keine Verschiebung nur im Kopf', [g2.cls, g2.clsKopf]);
      await t.page.screenshot({ path: path.join(HIER, 'fotos', `live_${h}_d.jpg`), type: 'jpeg', quality: 74, clip: { x: 0, y: Math.max(0, g2.kk.y - 10), width: 1440, height: g2.kk.h + 20 } });
      const y = g2.kk.y + Math.round(g2.kk.h / 2);
      await t.page.evaluate((y) => scrollTo(0, y), y); await t.page.waitForTimeout(500);
      const z3 = await t.page.evaluate(ZUSTAND); const tr = clip ? z3.clipTranslate : z3.bilderTranslate;
      ok(tr && tr !== 'none' && parseFloat(String(tr).split(' ')[1]) > 5, tag + ' Parallaxe beim Herausscrollen', tr);
      let w1erg = null;
      if (w1) {
        await t.page.evaluate(() => scrollTo(0, 0)); await t.page.waitForTimeout(400);
        const gT = await t.page.evaluate(VORBEREITEN, true); const pT = await t.page.locator('.lx-kk__bilder').screenshot();
        fs.writeFileSync(path.join(HIER, 'mess', `live_w1_${h}_${breite}_test.png`), pT);
        const t0 = await laden(b, `https://luxestyle.ch/collections/${h}`, false, breite); await t0.page.waitForTimeout(2500);
        const g0 = await t0.page.evaluate(VORBEREITEN, true); const p0 = await t0.page.locator('.lx-kk__bilder').screenshot(); await t0.ctx.close();
        fs.writeFileSync(path.join(HIER, 'mess', `live_w1_${h}_${breite}_heute.png`), p0);
        const pv = pixelVergleich(p0, pT); w1erg = { geo: geoGleich(g0, gT), pixel: pv, heute: g0.bilder.map((x) => x.pic), test: gT.bilder.map((x) => x.pic) };
        ok(w1erg.geo, tag + ' W1 live: Foto- und Bildkästen gleich wie heute', w1erg);
        if (!clip) ok(pv.gleich, tag + ' W1 live: Kopffotos pixelgleich wie heute (Ken Burns Zeit 0)', pv);
      }
      erg.push({ h, form, test: g2, w1: w1erg, zustand: { clip: z2.buehneImKopf, video: z2.video, knopf: z2.knopf, lcp: g2.lcp } });
    }
    await t.ctx.close();
  }
  await b.close();
  fs.writeFileSync(path.join(HIER, 'mess', `live_korr_${form}.json`), JSON.stringify(erg, null, 1));
  console.log(`\n${fehl ? fehl + ' FEHLER' : 'alles OK'}`); process.exit(fehl ? 1 : 0);
})();
