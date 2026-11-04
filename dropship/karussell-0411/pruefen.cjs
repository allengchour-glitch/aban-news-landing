const { chromium } = require('playwright');
const fs = require('fs');
const css = fs.readFileSync('patch/carousel.css', 'utf8');
const js = fs.readFileSync('patch/carousel.js', 'utf8').replace(/^\s*<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');
const uaD = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const uaM = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cases = [
  ['d1440', { viewport: { width: 1440, height: 900 }, userAgent: uaD }],
  ['d800', { viewport: { width: 800, height: 900 }, userAgent: uaD }],
  ['m390', { viewport: { width: 390, height: 844 }, userAgent: uaM, hasTouch: true, isMobile: true }],
];
(async () => {
  const b = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  let fail = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  FEHLER ') + m); if (!c) fail++; };
  for (const [name, opt] of cases) {
    console.log('==', name);
    const ctx = await b.newContext(opt); const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/marketingAllowed|Failed to load resource|clarity|Framing|importScripts/i.test(m.text())) errs.push(m.text().slice(0, 100)); });
    await p.goto('https://luxestyle.ch/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(5000);
    const before = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, pos: [...document.querySelectorAll('.lx-trends,.lx-product-edit,.lx-more-products')].map(e => Math.round(e.getBoundingClientRect().top + scrollY)), g: (() => { const r = document.querySelector('.lx-trends-grid').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() }));
    await p.addStyleTag({ content: css });
    await p.evaluate(js);
    await p.waitForTimeout(600);
    const a = await p.evaluate(() => {
      const w = document.querySelector('.lx-trends-grid').parentElement; const g = w.querySelector('.lx-trends-grid');
      const btns = [...document.querySelectorAll('.lx-carousel-btn')];
      const im = g.querySelector('.lx-trend-image').getBoundingClientRect();
      const nx = w.querySelector('.lx-carousel-next'); const nr = nx.getBoundingClientRect();
      const cs = getComputedStyle(nx);
      return {
        h: document.documentElement.scrollHeight, vw: innerWidth, sw: document.documentElement.scrollWidth,
        order: [...w.children].map(c => c.className.toString().replace('lx-carousel-btn ', '').slice(0, 22)),
        labels: btns.map(x => x.getAttribute('aria-label') + ' | ' + x.getAttribute('aria-controls')),
        ids: [...document.querySelectorAll('.lx-carousel > [id]')].map(x => x.id),
        midDiff: nr.width ? Math.round((nr.top + nr.height / 2) - (im.top + im.height / 2)) : null,
        nextShown: cs.display !== 'none' && nr.width > 0,
        bar: (() => { const b = w.querySelector('.lx-carousel-progress'); const c = getComputedStyle(b); const r = b.getBoundingClientRect(); const gr = g.getBoundingClientRect(); return { disp: c.display, pos: c.position, inside: r.width ? (r.bottom <= gr.bottom + 1 && r.top >= gr.top) : null }; })(),
        pos: [...document.querySelectorAll('.lx-trends,.lx-product-edit,.lx-more-products')].map(e => Math.round(e.getBoundingClientRect().top + scrollY)),
        gridSize: (() => { const r = g.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
      };
    });
    console.log('  vorher', JSON.stringify(before)); console.log('  nachher', JSON.stringify({ h: a.h, pos: a.pos, g: a.gridSize }));
    ok(a.sw <= a.vw, `kein seitliches Scrollen (${a.sw} <= ${a.vw})`);
    ok(a.order[0].includes('prev') && a.order[1].includes('next') && a.order[2].includes('trends-grid'), 'DOM-Reihenfolge Zurück, Weiter, Reihe: ' + a.order.join(' > '));
    ok(a.labels.every(x => /: /.test(x) && !/null/.test(x)), 'Beschriftungen mit Reihenname + aria-controls: ' + a.labels.join(' || '));
    ok(new Set(a.ids).size === a.ids.length && a.ids.length === 3, 'Ids eindeutig: ' + a.ids.join(','));
    if (name.startsWith('d')) {
      ok(a.midDiff !== null && Math.abs(a.midDiff) <= 2, `Pfeilmitte zu Bildmitte ${a.midDiff}px`);
      ok(a.gridSize[0] === before.g[0] && a.gridSize[1] === before.g[1], 'Reihe gleich gross');
    } else {
      ok(a.bar.disp === 'block' && a.bar.pos === 'absolute' && a.bar.inside, 'Balken absolut innerhalb der Reihe: ' + JSON.stringify(a.bar));
      ok(a.h === before.h && a.pos.join() === before.pos.join(), `Seitenhöhe unverändert ${before.h} -> ${a.h}, Sektionen ${before.pos} -> ${a.pos}`);
    }
    if (name.startsWith('d')) {
      const t = await p.evaluate(async () => {
        const g = document.querySelector('.lx-trends-grid'); const w = g.parentElement;
        const prev = w.querySelector('.lx-carousel-prev'), next = w.querySelector('.lx-carousel-next');
        const out = {};
        // schnelle Mehrfachklicks vorwärts
        g.scrollTo({ left: 0, behavior: 'auto' }); await sleep(500);
        for (let i = 0; i < 10; i++) { next.click(); await sleep(30); }
        await sleep(1800);
        out.fast10 = { left: Math.round(g.scrollLeft), max: g.scrollWidth - g.clientWidth, nextOff: next.disabled };
        for (let i = 0; i < 10; i++) { prev.click(); await sleep(30); }
        await sleep(1800);
        out.back10 = { left: Math.round(g.scrollLeft), prevOff: prev.disabled };
        out.snap = { inline: g.style.scrollSnapType, computed: getComputedStyle(g).scrollSnapType };
        // Karten entfernen / zurückhängen
        const kids = [...g.children]; const keep = kids.slice(0, 3);
        kids.slice(3).forEach(k => k.remove()); await sleep(500);
        out.few = { scrollable: w.classList.contains('is-scrollable'), nextOff: next.disabled };
        kids.slice(3).forEach(k => g.appendChild(k)); await sleep(500);
        out.again = { scrollable: w.classList.contains('is-scrollable'), nextOff: next.disabled };
        // Fokus-Übergabe am Ende
        g.scrollTo({ left: 0, behavior: 'auto' }); await sleep(400);
        next.focus(); let n = 0; while (!next.disabled && n < 10) { next.click(); await sleep(1100); n++; }
        out.focus = { active: document.activeElement === g ? 'Reihe' : document.activeElement.className.toString().slice(0, 30), left: Math.round(g.scrollLeft) };
        function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
        return out;
      });
      console.log('  interaktiv', JSON.stringify(t));
      ok(t.fast10.left === t.fast10.max && t.fast10.nextOff, '10 schnelle Klicks landen am Ende');
      ok(t.back10.left === 0 && t.back10.prevOff, '10 schnelle Klicks zurück landen am Anfang');
      ok(t.snap.inline === '' && /x/.test(t.snap.computed), 'Einrasten wiederhergestellt');
      ok(t.few.scrollable === false && t.again.scrollable === true, 'Karten weg: kein Pfeil; wieder da: Pfeil');
      ok(t.focus.active === 'Reihe', 'Fokus geht am Ende auf die Reihe: ' + t.focus.active);
      const ax = await p.evaluate(() => { const w = document.querySelector('.lx-trends-grid').parentElement; const n = w.querySelector('.lx-carousel-next'); return { vis: getComputedStyle(n).visibility, dis: n.disabled }; });
      ok(ax.vis === 'hidden' && ax.dis, 'ausgegangener Pfeil: visibility hidden (aus dem Zugänglichkeitsbaum)');
    }
    ok(errs.length === 0, 'keine Konsolenfehler ' + JSON.stringify(errs));
    await ctx.close();
  }
  await b.close();
  console.log(fail ? `\n${fail} FEHLER` : '\nALLES OK');
  process.exit(fail ? 1 : 0);
})();
