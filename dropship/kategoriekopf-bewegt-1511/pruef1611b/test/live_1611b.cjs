// Live-Messung nach dem Einspielen (Testvorlage ?view=lxbewegt). Jeder Seitenaufruf wird protokolliert, mindestens 8 s Abstand,
// Abbruch bei HTTP 429. Hilfen (Kontext, Sperrliste, CLS-Beobachter) aus nachpruef-bildgeo/gemeinsam.cjs (nur gelesen).
const path = require('path'); const fs = require('fs');
const B = path.resolve(__dirname, '..', '..');
const { chromium, kontext, url, pause } = require(path.join(B, 'nachpruef-bildgeo', 'gemeinsam.cjs'));
const AUS = path.join(__dirname, '..', 'bild'); const LOG = path.join(__dirname, '..', 'log');
const L = JSON.parse(fs.readFileSync(path.join(LOG, 'lampe_mass.json'), 'utf8'));
const pruef = []; let fehler = 0; let aufrufe = 0; let letzter = 0;
function ok(bed, text, wert) { pruef.push([bed ? 'OK    ' : 'FEHLER', text, wert === undefined ? '' : JSON.stringify(wert)]); if (!bed) fehler++; }
function info(text, wert) { pruef.push(['INFO  ', text, JSON.stringify(wert)]); }
const nur = process.argv.slice(2); const fall = (n) => !nur.length || nur.includes(n);
async function laden(b, h, o) {
  const warte = 8500 - (Date.now() - letzter); if (letzter && warte > 0) await pause(warte);
  const { ctx } = await kontext(b, o);
  const page = await ctx.newPage(); const fehlerSeite = []; page.on('pageerror', (e) => fehlerSeite.push(String(e.message).slice(0, 160)));
  if (o.vorher) await o.vorher(page);
  const t0 = new Date().toISOString(); letzter = Date.now(); aufrufe++;
  const resp = await page.goto(url(h, 'test'), { waitUntil: 'load', timeout: 90000 });
  const status = resp.status(); const body = await resp.text();
  fs.appendFileSync(path.join(LOG, 'abrufe.log'), `${t0} ${url(h, 'test')} ${status} w${o.w}${o.mobil ? 'm' : ''}\n`);
  if (status === 429) { console.log('HTTP 429: Abbruch'); throw new Error('429'); }
  const html = { status, bytes: Buffer.byteLength(body), liquidFehler: (body.match(/Liquid (syntax )?error/gi) || []).length, neuAus: body.includes('b.hidden=breit;}'), neuSchein: body.includes('@keyframes lxkb-schein{50%{opacity:1}to{opacity:0}}'), s01Breite: body.includes('.lx-kk{--lxkb-w:clamp(320px,30vw,360px)}'), clip: (body.match(/data-lx-kb="(s\d\d)"/) || [, null])[1] };
  return { ctx, page, fehlerSeite, html };
}
const GEO = async (tt) => {
  const v = document.querySelector('.lx-kb__clip video'); const box = document.querySelector('.lx-kb__clip'); const k = document.querySelector('.lx-kk');
  if (!v) return null;
  v.pause(); v.currentTime = tt; await new Promise((r) => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 4000); });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const cs = getComputedStyle(v); const bw = v.clientWidth, bh = v.clientHeight; const vw = v.videoWidth, vh = v.videoHeight;
  const s = Math.max(bw / vw, bh / vh); const rw = vw * s, rh = vh * s;
  const [px, py] = cs.objectPosition.split(' ').map((x) => parseFloat(x) / 100); const ox = (bw - rw) * px, oy = (bh - rh) * py;
  const m = cs.transform === 'none' ? 1 : +cs.transform.match(/matrix\(([^,]+)/)[1]; const [tx, ty] = cs.transformOrigin.split(' ').map(parseFloat);
  const q = (p, t0) => (p - t0) / m + t0; const src = { x0: (q(0, tx) - ox) / s, x1: (q(bw, tx) - ox) / s, y0: (q(0, ty) - oy) / s, y1: (q(bh, ty) - oy) / s };
  const kr = k.getBoundingClientRect();
  return { t: +v.currentTime.toFixed(3), box: [bw, bh], skala: +s.toFixed(4), kopfH: +kr.height.toFixed(2), lxkbW: getComputedStyle(k).getPropertyValue('--lxkb-w').trim(), pos: cs.objectPosition, z: m, src, srcPct: { y0: +(100 * src.y0 / vh).toFixed(2), y1: +(100 * src.y1 / vh).toFixed(2), x0: +(100 * src.x0 / vw).toFixed(2), x1: +(100 * src.x1 / vw).toFixed(2) }, video: { src: (v.currentSrc || '').split('/').pop().slice(0, 40), vw } };
};
const ZU = () => { const k = document.querySelector('.lx-kk'); const b = k && k.querySelector('.lx-kb-knopf'); const bil = k && k.querySelector('.lx-kk__bilder'); const img = bil && bil.querySelector('img'); const v = k && k.querySelector('.lx-kb__clip video');
  return { klassen: k ? k.className : null, knopf: b ? { hidden: b.hidden, sichtbar: b.getBoundingClientRect().width > 0 && getComputedStyle(b).display !== 'none', label: b.getAttribute('aria-label') } : null, bilderOp: bil ? getComputedStyle(bil).opacity : null, imgAnim: img ? getComputedStyle(img).animationName : null, imgPlay: img ? getComputedStyle(img).animationPlayState : null, imgTf: img ? getComputedStyle(img).transform : null, video: v ? { paused: v.paused, t: +v.currentTime.toFixed(2), vw: v.videoWidth, op: getComputedStyle(v).opacity, src: (v.currentSrc || '').split('/').pop().slice(0, 40) } : null, cls: +(window.__cls || 0).toFixed(4), clsKopf: +(window.__clsKopf || 0).toFixed(4), scroll: [document.documentElement.scrollWidth, document.documentElement.clientWidth] }; };
(async () => {
  const b = await chromium.launch();
  try {
    // (2) s01 auf sub-beleuchtung bei 1280, 1440, 1920
    if (fall('s01')) for (const [w, hh] of [[1280, 900], [1440, 900], [1920, 1080]]) {
      const { ctx, page, fehlerSeite, html } = await laden(b, 'sub-beleuchtung', { w, h: hh });
      let z = null; for (let i = 0; i < 24; i++) { await page.waitForTimeout(500); z = await page.evaluate(ZU); if (z.video && !z.video.paused && z.video.op === '1') break; }
      await page.waitForTimeout(1500); z = await page.evaluate(ZU);
      ok(html.status === 200 && html.liquidFehler === 0 && fehlerSeite.length === 0, `E sub-beleuchtung ${w}: HTTP 200, 0 Liquid-Fehler, 0 Seitenfehler`, { html, fehlerSeite });
      ok(html.neuAus && html.neuSchein && html.s01Breite && html.clip === 's01', `E sub-beleuchtung ${w}: neuer Snippet ausgeliefert (aus(), Schimmer, s01-Breite), Clip s01`, html);
      ok(z.video && z.video.vw === 960 && !z.video.paused, `E sub-beleuchtung ${w}: Clip s01 spielt (960)`, z.video);
      ok(z.clsKopf === 0 && z.scroll[0] === z.scroll[1], `E sub-beleuchtung ${w}: nur-Kopf-CLS 0, kein seitliches Scrollen`, { cls: z.cls, clsKopf: z.clsKopf, scroll: z.scroll });
      for (const tt of [0, 2]) {
        const g = await page.evaluate(GEO, tt);
        const frame = L.je_sekunde.find((x) => x.t === (tt === 0 ? 0 : 2));
        const da = g && g.src.y0 <= L.oben_min_px && g.src.y1 >= L.unten_max_px + 1;
        ok(da, `E sub-beleuchtung ${w} t=${tt}s: ganze Lampe im Ausschnitt (Quellzeilen ${L.oben_min_px} bis ${L.unten_max_px}, alle 94 Bilder)`, g && { srcPct: g.srcPct, box: g.box, kopfH: g.kopfH, w: g.lxkbW, pos: g.pos, randObenPx: +((L.oben_min_px - g.src.y0) * g.skala).toFixed(1), randUntenPx: +((g.src.y1 - L.unten_max_px - 1) * g.skala).toFixed(1), bildDiesesT: [frame.oben, frame.unten] });
        await page.evaluate(() => { const k = document.querySelector('.lx-kb-knopf'); if (k) k.style.visibility = 'hidden'; scrollTo(0, 0); });
        await page.locator('.lx-kb__clip').screenshot({ path: path.join(AUS, `live_s01_${w}_t${tt}_gesehen.png`) });
        await page.evaluate(() => { const c = document.querySelector('.lx-kb__clip'); c.style.webkitMaskImage = 'none'; c.style.maskImage = 'none'; });
        await page.locator('.lx-kb__clip').screenshot({ path: path.join(AUS, `live_s01_${w}_t${tt}_ohnemaske.png`) });
        await page.evaluate(() => { const c = document.querySelector('.lx-kb__clip'); c.style.webkitMaskImage = ''; c.style.maskImage = ''; const k = document.querySelector('.lx-kb-knopf'); if (k) k.style.visibility = ''; });
      }
      await page.locator('.lx-kk').screenshot({ path: path.join(AUS, `live_s01_${w}_kopf.png`) });
      await ctx.close();
    }
    // (1) damen-reisetaschen: Video 404 bei 1440, dann 1000 px
    if (fall('reise404')) {
      const { ctx, page, fehlerSeite, html } = await laden(b, 'damen-reisetaschen', { w: 1440, h: 900, vorher: (p) => p.route(/lx-kb-s\d\d-quer-960\.mp4/, (r) => r.fulfill({ status: 404, body: '' })) });
      await page.waitForTimeout(5000); const a = await page.evaluate(ZU);
      ok(html.status === 200 && html.liquidFehler === 0 && html.clip === 's06' && html.neuAus, 'E damen-reisetaschen 1440: HTTP 200, 0 Liquid-Fehler, Clip s06, neuer Snippet', html);
      ok(!a.video && a.knopf && a.knopf.hidden && a.bilderOp === '0', 'E damen-reisetaschen Video-404 bei 1440: Standbild, Knopf versteckt (wie bisher)', a);
      info('E damen-reisetaschen 1440 CLS', { cls: a.cls, clsKopf: a.clsKopf });
      await page.setViewportSize({ width: 1000, height: 900 }); await page.waitForTimeout(1500);
      const c = await page.evaluate(ZU); await page.waitForTimeout(1500); const d = await page.evaluate(ZU);
      ok(c.bilderOp === '1' && c.imgAnim === 'lxkb-a' && c.imgPlay === 'running' && c.imgTf !== d.imgTf, 'E damen-reisetaschen Video-404, dann 1000 px: Fotos driften', [c.bilderOp, c.imgAnim, c.imgTf, d.imgTf]);
      ok(d.knopf && !d.knopf.hidden && d.knopf.sichtbar, 'E damen-reisetaschen Video-404, dann 1000 px: Anhalte-Knopf sichtbar', d.knopf);
      await page.screenshot({ path: path.join(AUS, 'live_reise404_1000.png'), clip: { x: 0, y: 0, width: 1000, height: 560 } });
      ok(fehlerSeite.length === 0, 'E damen-reisetaschen: 0 Seitenfehler', fehlerSeite);
      await ctx.close();
    }
    // Clip s03 auf schmuck 1440 unveraendert
    if (fall('schmuck')) {
      const { ctx, page, fehlerSeite, html } = await laden(b, 'schmuck', { w: 1440, h: 900 });
      let z = null; for (let i = 0; i < 24; i++) { await page.waitForTimeout(500); z = await page.evaluate(ZU); if (z.video && !z.video.paused && z.video.op === '1') break; }
      await page.waitForTimeout(1000); z = await page.evaluate(ZU);
      ok(html.status === 200 && html.liquidFehler === 0 && fehlerSeite.length === 0 && html.clip === 's03' && html.neuAus && !html.s01Breite, 'E schmuck 1440: HTTP 200, 0 Liquid-Fehler, 0 Seitenfehler, Clip s03, keine s01-Regel', { html, fehlerSeite });
      ok(z.video && !z.video.paused && z.video.vw === 960 && z.knopf && !z.knopf.hidden, 'E schmuck 1440: Clip spielt, Knopf sichtbar', z);
      ok(z.clsKopf === 0 && z.scroll[0] === z.scroll[1], 'E schmuck 1440: nur-Kopf-CLS 0, kein seitliches Scrollen', { cls: z.cls, clsKopf: z.clsKopf });
      const g = await page.evaluate(GEO, 0);
      ok(g && g.box[0] === 432 && g.box[1] === 230 && g.lxkbW === 'clamp(320px,30vw,460px)' && g.pos === '50% 62%' && g.z === 1.45, 'E schmuck 1440: Clip-Kasten 432 × 230, Ausschnitt 50% 62%, Zoom 1,45 (wie vorher)', g && { box: g.box, w: g.lxkbW, pos: g.pos, z: g.z, srcPct: g.srcPct });
      await page.evaluate(() => { const k = document.querySelector('.lx-kb-knopf'); if (k) k.style.visibility = 'hidden'; });
      await page.locator('.lx-kb__clip').screenshot({ path: path.join(AUS, 'live_schmuck_1440_t0_gesehen.png') });
      await ctx.close();
    }
    // (3) Handy 390: Schimmer geht weg
    if (fall('handy')) {
      const { ctx, page, fehlerSeite, html } = await laden(b, 'damen-mode', { w: 390, h: 844, mobil: true, vorher: (p) => p.addInitScript(() => { window.__sch = []; const f = () => { const k = document.querySelector('.lx-kk'); if (k) window.__sch.push([Math.round(performance.now()), +getComputedStyle(k, '::after').opacity]); if (performance.now() < 8000) requestAnimationFrame(f); }; requestAnimationFrame(f); }) });
      await page.waitForTimeout(6000);
      const r = await page.evaluate(() => { const a = document.getAnimations().find((x) => x.animationName === 'lxkb-schein'); const k = document.querySelector('.lx-kk'); return { s: window.__sch, start: a ? Math.round(a.startTime) : null, zustand: a ? a.playState : null, op: +getComputedStyle(k, '::after').opacity, name: getComputedStyle(k, '::after').animationName, kopfH: Math.round(k.getBoundingClientRect().height), knopf: !!k.querySelector('.lx-kb-knopf'), clip: !!k.querySelector('.lx-kb'), cls: +(window.__cls || 0).toFixed(4), clsKopf: +(window.__clsKopf || 0).toFixed(4), scroll: [document.documentElement.scrollWidth, document.documentElement.clientWidth] }; });
      const max = Math.max(...r.s.map((x) => x[1])); const nach3 = r.start != null ? r.s.filter((x) => x[0] >= r.start + 3000) : [];
      ok(html.status === 200 && html.liquidFehler === 0 && fehlerSeite.length === 0 && html.neuSchein, 'E damen-mode 390: HTTP 200, 0 Liquid-Fehler, 0 Seitenfehler, neuer Schimmer ausgeliefert', { html, fehlerSeite });
      ok(r.name === 'lxkb-schein' && max > 0.5, 'E damen-mode 390: Schimmer sichtbar eingeblendet (abgetastet)', { max, start: r.start });
      ok(nach3.length > 0 && nach3.every((x) => x[1] === 0) && r.op === 0 && r.zustand === 'finished', 'E damen-mode 390: 3 s nach Beginn wieder opacity 0', { start: r.start, nach3: nach3.slice(0, 2), ende: r.op, zustand: r.zustand, seite3000: r.s.filter((x) => x[0] >= 3000)[0] });
      ok(!r.knopf && !r.clip && r.kopfH === 62 && r.clsKopf === 0 && r.scroll[0] === r.scroll[1], 'E damen-mode 390: kein Knopf, kein Clip, Kopfhöhe 62, nur-Kopf-CLS 0, kein seitliches Scrollen', { kopfH: r.kopfH, cls: r.cls, clsKopf: r.clsKopf, scroll: r.scroll });
      await page.screenshot({ path: path.join(AUS, 'live_damen-mode_390_ende.png'), clip: { x: 0, y: 0, width: 390, height: 420 } });
      await ctx.close();
    }
  } catch (e) { console.log('ABBRUCH', String(e).slice(0, 200)); fehler++; }
  await b.close();
  for (const p of pruef) console.log(p.join(' '));
  const n = pruef.filter((p) => p[0] !== 'INFO  ').length;
  console.log(`\nlive: ${n - fehler} bestanden, ${fehler} fehlgeschlagen, Seitenaufrufe ${aufrufe}`);
  process.exit(fehler ? 1 : 0);
})();
