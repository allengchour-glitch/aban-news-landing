// Nachpruefung 16.11. (Funde 1 bis 3), im Nachbau mit echtem gespeichertem HTML und lokal gerendertem Snippet.
// Snippet: THEME_DIR (Ordner mit snippets/lx-kopf-bewegt.liquid), sonst ../../theme (neu).
// Aufruf: node nachpruef_faelle.cjs [fall ...]   Faelle: knopf404 knopffrueh knopf404klein autoplayklein sparenklein schimmer s01geo
// Clip-Dateien (mp4) kommen lokal aus k960/ (md5 gleich der hochgeladenen Datei), mit Range-Antworten.
const path = require('path'); const fs = require('fs');
const B = path.resolve(__dirname, '..', '..');
const { seite, chromium, PROFIL } = require(path.join(B, 'nachbau.cjs'));
const { ZUSTAND } = require(path.join(B, 'test', 'zustand.cjs'));
PROFIL.d1920 = [1920, 1080]; PROFIL.d1280b = [1280, 900]; PROFIL.m844 = PROFIL.m844 || [390, 844];
const AUS = path.join(__dirname, '..', 'bild'); fs.mkdirSync(AUS, { recursive: true });
const THEME = process.env.THEME_DIR || path.join(B, 'theme');
const MARKE = process.env.MARKE || (THEME.includes('theme_vor') ? 'vor' : 'neu');
const pruef = []; let fehler = 0;
function ok(bed, text, wert) { pruef.push([bed ? 'OK    ' : 'FEHLER', text, wert === undefined ? '' : JSON.stringify(wert)]); if (!bed) fehler++; }
function info(text, wert) { pruef.push(['INFO  ', text, JSON.stringify(wert)]); }
const render = async (h, o) => (await import(path.join(B, 'harness', 'render.mjs'))).rendern(h, o || {});
const HTML = (h) => path.join(B, 'html', 'live', h + '.html');
const nur = process.argv.slice(2); const fall = (n) => !nur.length || nur.includes(n);
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
// lokale Clip-Auslieferung (mit Range), optional verzoegert oder 404
function clipRoute(opt = {}) {
  return async (p) => {
    await p.route(/lx-kb-s\d\d-quer-960\.mp4/, async (r) => {
      const name = r.request().url().split('/').pop().split('?')[0];
      if (opt.v404) return r.fulfill({ status: 404, body: '' });
      if (opt.delay) await warte(opt.delay);
      const data = fs.readFileSync(path.join(B, 'k960', name));
      const rg = r.request().headers().range;
      try {
        if (rg) { const m = rg.match(/bytes=(\d+)-(\d*)/); const a = +m[1]; const e = m[2] ? Math.min(+m[2], data.length - 1) : data.length - 1;
          return await r.fulfill({ status: 206, headers: { 'content-type': 'video/mp4', 'content-range': `bytes ${a}-${e}/${data.length}`, 'accept-ranges': 'bytes', 'content-length': String(e - a + 1) }, body: data.subarray(a, e + 1) }); }
        return await r.fulfill({ status: 200, headers: { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'content-length': String(data.length) }, body: data });
      } catch (e) {}
    });
    if (opt.vorher) await opt.vorher(p);
  };
}
const fotoDrift = async (page) => { const a = await page.evaluate(ZUSTAND); await page.waitForTimeout(1500); const c = await page.evaluate(ZUSTAND); return { a, c, drift: a.bilderOpacity === '1' && a.fotoAnim === 'lxkb-a' && a.fotoPlay === 'running' && a.fotoTransform !== c.fotoTransform }; };
const knopfDa = (z) => !!(z.knopf && !z.knopf.hidden && z.knopf.sichtbar);

(async () => {
  const b = await chromium.launch();
  const clipE = await render('schmuck');
  info('Snippet', { theme: THEME, marke: MARKE });
  // (1a) Video 404 bei 1440, danach Fenster 1000
  if (fall('knopf404')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE, vorLaden: clipRoute({ v404: true }) });
    await t.page.waitForTimeout(4500); const a = await t.page.evaluate(ZUSTAND);
    ok(!a.video && a.poster.every((p) => p.ok) && a.knopf && a.knopf.hidden && a.bilderOpacity === '0', '1 Video-404 bei 1440: wie bisher Standbild, Knopf versteckt (nichts bewegt sich)', [a.video, a.knopf, a.bilderOpacity]);
    await t.page.setViewportSize({ width: 1000, height: 900 }); await t.page.waitForTimeout(1200);
    const d = await fotoDrift(t.page);
    ok(d.drift, '1 Video-404, dann 1000 px: Fotos sichtbar und driften', [d.a.bilderOpacity, d.a.fotoAnim, d.a.fotoPlay]);
    ok(knopfDa(d.c), '1 Video-404, dann 1000 px: Anhalte-Knopf sichtbar (WCAG 2.2.2)', d.c.knopf);
    if (knopfDa(d.c)) { await t.page.click('.lx-kb-knopf'); await t.page.waitForTimeout(300); const h = await t.page.evaluate(ZUSTAND); ok(h.klassen.includes('lx-kb-halt') && h.fotoPlay === 'paused', '1 Video-404, 1000 px: Knopf hält Ken Burns an', [h.klassen, h.fotoPlay]); }
    await t.page.setViewportSize({ width: 1440, height: 900 }); await t.page.waitForTimeout(800);
    const e = await t.page.evaluate(ZUSTAND); info('1 Video-404, zurück auf 1440 (Knopf bleibt, schadet nicht)', { knopf: e.knopf && { hidden: e.knopf.hidden, label: e.knopf.label }, bilderOpacity: e.bilderOpacity });
    ok((t.fehler || []).length === 0, '1 Video-404: keine Seitenfehler', t.fehler);
    await t.ctx.close();
  }
  // (1b) Fenster wird verkleinert, bevor der Clip spielt (Video-Antwort 4 s verzoegert)
  if (fall('knopffrueh')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE, vorLaden: clipRoute({ delay: 4000 }) });
    await t.page.waitForTimeout(700); await t.page.setViewportSize({ width: 1000, height: 900 }); await t.page.waitForTimeout(6000);
    const d = await fotoDrift(t.page);
    ok(d.drift && knopfDa(d.c), '1 vor dem Spielen auf 1000 px verkleinert: Fotos driften, Knopf sichtbar', [d.c.knopf, d.a.fotoAnim, d.a.bilderOpacity]);
    ok(d.c.video && d.c.video.paused, '1 vor dem Spielen verkleinert: Video pausiert (unsichtbar)', d.c.video);
    await t.page.setViewportSize({ width: 1440, height: 900 });
    let z = null; for (let i = 0; i < 20; i++) { await t.page.waitForTimeout(500); z = await t.page.evaluate(ZUSTAND); if (z.video && !z.video.paused && z.video.op === '1') break; }
    ok(z.video && !z.video.paused && knopfDa(z), '1 danach wieder 1440: Clip spielt, Knopf sichtbar', [z.video, z.knopf]);
    await t.ctx.close();
  }
  // (1c) verkleinert, dann scheitert das Video (404) unter 1100 px
  if (fall('knopf404klein')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE, vorLaden: clipRoute({ v404: true }) });
    await t.page.setViewportSize({ width: 1000, height: 900 }); await t.page.waitForTimeout(4000);
    const d = await fotoDrift(t.page);
    ok(d.drift && knopfDa(d.c) && !d.c.video, '1 unter 1100 px Video-404: Fotos driften, Knopf sichtbar, Video entfernt', [d.c.knopf, d.c.video, d.a.fotoAnim]);
    await t.ctx.close();
  }
  // (1d) Autoplay gesperrt bei 1440 (bisheriges Verhalten M08), danach 1000
  if (fall('autoplayklein')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE, vorLaden: clipRoute({ vorher: (p) => p.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('gesperrt', 'NotAllowedError')); }; }) }) });
    await t.page.waitForTimeout(5000); const a = await t.page.evaluate(ZUSTAND);
    ok(!a.video && a.poster.every((p) => p.ok) && a.knopf && a.knopf.hidden && a.bilderOpacity === '0', '1 Autoplay gesperrt 1440: Video entfernt, Poster, Knopf versteckt (unverändert)', [a.video, a.knopf]);
    await t.page.setViewportSize({ width: 1000, height: 900 }); await t.page.waitForTimeout(1200);
    const d = await fotoDrift(t.page);
    ok(d.drift && knopfDa(d.c), '1 Autoplay gesperrt, dann 1000 px: Fotos driften, Knopf sichtbar', [d.c.knopf, d.a.fotoAnim]);
    ok((t.fehler || []).length === 0, '1 Autoplay gesperrt: keine Seitenfehler', t.fehler);
    await t.ctx.close();
  }
  // (1e) Datensparmodus bei 1440, danach 1000
  if (fall('sparenklein')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE, vorLaden: clipRoute({ vorher: (p) => p.addInitScript(() => { Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true }); }) }) });
    await t.page.waitForTimeout(4000); const a = await t.page.evaluate(ZUSTAND);
    ok(!a.video && a.knopf && a.knopf.hidden && a.bilderOpacity === '0', '1 Datensparmodus 1440: kein Video, Knopf versteckt (unverändert)', [a.video, a.knopf]);
    await t.page.setViewportSize({ width: 1000, height: 900 }); await t.page.waitForTimeout(1200);
    const d = await fotoDrift(t.page);
    ok(d.drift && knopfDa(d.c), '1 Datensparmodus, dann 1000 px: Fotos driften, Knopf sichtbar', [d.c.knopf, d.a.fotoAnim]);
    await t.ctx.close();
  }
  // (3) Handy 390: Schimmer einmal ein und wieder aus
  if (fall('schimmer')) {
    for (const [h, profil] of [['damen-mode', 'm844'], ['schmuck', 'm664']]) {
      const e = await render(h);
      const t = await seite(b, { html: HTML(h), profil, einsatz: e, vorLaden: (p) => p.addInitScript(() => { window.__sch = []; const f = () => { const k = document.querySelector('.lx-kk'); if (k) window.__sch.push([Math.round(performance.now()), +getComputedStyle(k, '::after').opacity]); if (performance.now() < 7000) requestAnimationFrame(f); }; requestAnimationFrame(f); }) });
      await t.page.waitForTimeout(6500);
      const r = await t.page.evaluate(() => { const a = document.getAnimations().find((x) => x.animationName === 'lxkb-schein'); const k = document.querySelector('.lx-kk'); return { s: window.__sch, start: a ? Math.round(a.startTime) : null, zustand: a ? a.playState : null, op: +getComputedStyle(k, '::after').opacity, name: getComputedStyle(k, '::after').animationName }; });
      // Spitze: die Abtastung je Bild trifft die Mitte (50 %) selten genau; darum zusaetzlich die Animation auf die Mitte und kurz vor das Ende stellen (Web Animations API)
      const gesucht = await t.page.evaluate(() => { const a = document.getAnimations().find((x) => x.animationName === 'lxkb-schein'); if (!a) return null; const k = document.querySelector('.lx-kk'); const tm = a.effect.getComputedTiming(); const d = tm.delay || 0, du = tm.duration; const lies = (z) => { a.currentTime = z; return +getComputedStyle(k, '::after').opacity; }; const mitte = lies(d + du / 2), spaet = lies(d + du - 1); a.finish(); return { delay: d, dauer: du, mitte, spaet, nachFinish: +getComputedStyle(k, '::after').opacity }; });
      const max = Math.max(...r.s.map((x) => x[1]), gesucht ? gesucht.mitte : 0, gesucht ? gesucht.spaet : 0); const tMax = (r.s.find((x) => x[1] === Math.max(...r.s.map((y) => y[1]))) || [])[0];
      info(`3 ${h} ${profil}: Animation auf Mitte/Ende gestellt`, gesucht);
      const nach3 = r.start != null ? r.s.filter((x) => x[0] >= r.start + 3000) : [];
      const bei3000 = r.s.filter((x) => x[0] >= 3000).slice(0, 1)[0];
      ok(r.name === 'lxkb-schein' && max >= 0.95, `3 ${h} ${profil}: Schimmer wird eingeblendet (Spitze ≥ 0,95)`, { max, abgetastetMax: Math.max(...r.s.map((x) => x[1])), tMax, start: r.start });
      ok(nach3.length > 0 && nach3.every((x) => x[1] === 0) && r.op === 0 && r.zustand === 'finished', `3 ${h} ${profil}: 3 s nach Animationsbeginn wieder opacity 0 (bleibt nicht stehen)`, { start: r.start, nach3: nach3.slice(0, 2), ende: r.op, zustand: r.zustand });
      info(`3 ${h} ${profil}: Seitenzeit 3000 ms`, bei3000);
      const gr = await t.page.evaluate(() => { const k = document.querySelector('.lx-kk'); const r = k.getBoundingClientRect(); return { h: Math.round(r.height), clip: !!k.querySelector('.lx-kb'), knopf: !!k.querySelector('.lx-kb-knopf') }; });
      ok(!gr.clip && !gr.knopf, `3 ${h} ${profil}: Handy weiter ohne Clip und ohne Knopf`, gr);
      await t.page.screenshot({ path: path.join(AUS, `schimmer_${MARKE}_${h}_${profil}_ende.png`), clip: { x: 0, y: 0, width: 390, height: 420 } });
      await t.ctx.close();
    }
  }
  // (2) Clip s01: sichtbarer Ausschnitt bei 1100/1280/1440/1920, Zeit 0 und 2 s
  if (fall('s01geo')) {
    const L = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'log', 'lampe_mass.json'), 'utf8')); // Lampe im Quellbild (px von 960x720)
    const proBild = Object.fromEntries(L.je_sekunde.map((x) => [x.t, x]));
    for (const h of ['wohnen-dekoration']) {
      const e = await render(h);
      ok(/data-lx-kb="s01"/.test(e.nach), `2 ${h}: Clip s01 im Liquid`, null);
      for (const profil of ['d1100', 'd1280b', 'd', 'd1920']) {
        const t = await seite(b, { html: HTML(h), profil, einsatz: e, vorLaden: clipRoute() });
        let z = null; for (let i = 0; i < 24; i++) { await t.page.waitForTimeout(500); z = await t.page.evaluate(ZUSTAND); if (z.video && !z.video.paused && z.video.op === '1' && z.video.rs >= 3) break; }
        ok(z.video && z.video.breite === 960, `2 ${h} ${PROFIL[profil][0]}: Clip s01 geladen und spielt`, z.video);
        for (const tt of [0, 2]) {
          const g = await t.page.evaluate(async (tt) => {
            const v = document.querySelector('.lx-kb__clip video'); const box = document.querySelector('.lx-kb__clip'); const k = document.querySelector('.lx-kk');
            v.pause(); v.currentTime = tt; await new Promise((r) => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 3000); });
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const cs = getComputedStyle(v); const bw = v.clientWidth, bh = v.clientHeight; const vw = v.videoWidth, vh = v.videoHeight;
            const s = Math.max(bw / vw, bh / vh); const rw = vw * s, rh = vh * s;
            const [px, py] = cs.objectPosition.split(' ').map((x) => parseFloat(x) / 100);
            const ox = (bw - rw) * px, oy = (bh - rh) * py; // Lage des Bildes im Kasten (vor transform)
            const m = cs.transform === 'none' ? 1 : +cs.transform.match(/matrix\(([^,]+)/)[1]; const [tx, ty] = cs.transformOrigin.split(' ').map(parseFloat);
            // sichtbarer Kastenbereich [0,bw]x[0,bh] zurueck in Quellpixel: Kasten -> vor transform: (p - t)/m + t ; dann (q - o)/s
            const q = (p, t0) => (p - t0) / m + t0; const src = { x0: (q(0, tx) - ox) / s, x1: (q(bw, tx) - ox) / s, y0: (q(0, ty) - oy) / s, y1: (q(bh, ty) - oy) / s };
            const kr = k.getBoundingClientRect(), br = box.getBoundingClientRect();
            return { t: +v.currentTime.toFixed(3), box: [Math.round(bw), Math.round(bh)], kopfH: Math.round(kr.height), boxRect: [Math.round(br.left), Math.round(br.top + scrollY), Math.round(br.width), Math.round(br.height)], lxkbW: getComputedStyle(k).getPropertyValue('--lxkb-w').trim(), pos: cs.objectPosition, z: m, src, srcPct: { x0: +(100 * src.x0 / vw).toFixed(2), x1: +(100 * src.x1 / vw).toFixed(2), y0: +(100 * src.y0 / vh).toFixed(2), y1: +(100 * src.y1 / vh).toFixed(2) } };
          }, tt);
          const fr = proBild[tt === 0 ? 0 : 2];
          const y0 = g.src.y0, y1 = g.src.y1;
          const dieses = y0 <= fr.oben && y1 >= fr.unten + 1;
          const alle = y0 <= L.oben_min_px && y1 >= L.unten_max_px + 1;
          const randOben = +((L.oben_min_px - y0) * (g.box[0] / 960 >= g.box[1] / 720 ? g.box[0] / 960 : g.box[1] / 720)).toFixed(1);
          const randUnten = +((y1 - (L.unten_max_px + 1)) * (g.box[0] / 960 >= g.box[1] / 720 ? g.box[0] / 960 : g.box[1] / 720)).toFixed(1);
          ok(dieses, `2 ${h} ${PROFIL[profil][0]} t=${tt}s: Tulpenspitze bis Sockel dieses Bildes im Ausschnitt (Quellzeilen ${fr.oben} bis ${fr.unten})`, { srcPct: g.srcPct, box: g.box, kopfH: g.kopfH, w: g.lxkbW, pos: g.pos });
          ok(alle, `2 ${h} ${PROFIL[profil][0]} t=${tt}s: ganze Lampe über alle 94 Bilder im Ausschnitt (Quellzeilen ${L.oben_min_px} bis ${L.unten_max_px})`, { rand_oben_cssPx: randOben, rand_unten_cssPx: randUnten });
          await t.page.evaluate(() => { const k = document.querySelector('.lx-kb-knopf'); if (k) k.style.visibility = 'hidden'; });
          const bx = g.boxRect;
          await t.page.evaluate(() => scrollTo(0, 0));
          const shot = (n) => t.page.locator('.lx-kb__clip').screenshot({ path: path.join(AUS, `s01_${MARKE}_${PROFIL[profil][0]}_t${tt}_${n}.png`) });
          await shot('gesehen');
          await t.page.evaluate(() => { const c = document.querySelector('.lx-kb__clip'); c.style.webkitMaskImage = 'none'; c.style.maskImage = 'none'; });
          await shot('ohnemaske');
          await t.page.evaluate(() => { const c = document.querySelector('.lx-kb__clip'); c.style.webkitMaskImage = ''; c.style.maskImage = ''; const k = document.querySelector('.lx-kb-knopf'); if (k) k.style.visibility = ''; });
          info(`2 ${h} ${PROFIL[profil][0]} t=${tt}s Ausschnitt`, { srcPct: g.srcPct, box: g.box, kopfH: g.kopfH, boxRect: bx });
        }
        // Kopf ganz (zur Sicht)
        const kk = await t.page.evaluate(() => { const r = document.querySelector('.lx-kk').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; });
        await t.page.screenshot({ path: path.join(AUS, `s01_${MARKE}_${PROFIL[profil][0]}_kopf.jpg`), type: 'jpeg', quality: 75, clip: { x: kk[0], y: Math.max(0, kk[1] - 4), width: kk[2], height: kk[3] + 8 } });
        ok((t.fehler || []).length === 0, `2 ${h} ${PROFIL[profil][0]}: keine Seitenfehler`, t.fehler);
        await t.ctx.close();
      }
    }
  }
  await b.close();
  for (const p of pruef) console.log(p.join(' '));
  const n = pruef.filter((p) => p[0] !== 'INFO  ').length;
  console.log(`\n${MARKE}: ${n - fehler} bestanden, ${fehler} fehlgeschlagen`);
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
