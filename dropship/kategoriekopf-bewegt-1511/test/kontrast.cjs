// K7 Kontrast: Hintergrund hinter dem Kopftext (Text ausgeblendet), hellste 2 % je Textelement, gegen die Textfarbe.
// Zustaende: heute, Test bei Ken-Burns-Zeit 0, Test am Ende der ersten Drift (groesster Massstab). Desktop 1440x900, Nachbau.
// Aufruf: node test/kontrast.cjs handle1 handle2 ...
const path = require('path'); const fs = require('fs'); const { spawnSync } = require('child_process');
const { seite, chromium } = require('../nachbau.cjs');
const HIER = path.join(__dirname, '..');
const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
function roh(png) { return spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png, maxBuffer: 1 << 29 }).stdout; }
const ZUSTAND_SETZEN = async (art) => {
  for (const a of document.getAnimations()) { const n = a.animationName || ''; if (/^lxkb-[a-d]$/.test(n)) { a.pause(); a.currentTime = art === 'ende' ? a.effect.getComputedTiming().duration - 1 : 0; } }
  const k = document.querySelector('.lx-kk'); const kr = k.getBoundingClientRect();
  const texte = [];
  for (const [sel, name] of [['.lx-kk h1', 'Titel'], ['.lx-kk__anriss', 'Anriss'], ['.lx-kk__beschr summary', 'Mehr']]) {
    const el = k.querySelector(sel); if (!el || el.getBoundingClientRect().width === 0) continue;
    const rg = document.createRange(); rg.selectNodeContents(el);
    const rects = [...rg.getClientRects()].filter((r) => r.width > 2 && r.height > 2).map((r) => [Math.round(r.left - kr.left), Math.round(r.top - kr.top), Math.round(r.width), Math.round(r.height)]);
    texte.push({ name, farbe: getComputedStyle(el).color, rects });
  }
  const st = document.createElement('style'); st.textContent = '.lx-kk__text, .lx-kk__text *{visibility:hidden!important}.lx-kb-knopf{visibility:hidden!important}.lx-kk::after{display:none!important}'; document.head.appendChild(st);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { texte, w: Math.round(kr.width), h: Math.round(kr.height) };
};
(async () => {
  const b = await chromium.launch(); const erg = {};
  for (const h of process.argv.slice(2)) {
    const e = await (await import(path.join(HIER, 'harness', 'render.mjs'))).rendern(h);
    erg[h] = {};
    for (const [art, einsatz] of [['heute', null], ['test0', e], ['testEnde', e]]) {
      const t = await seite(b, { html: path.join(HIER, 'html', 'live', h + '.html'), profil: 'd', handle: h, einsatz }); await t.page.waitForTimeout(3000);
      const z = await t.page.evaluate(ZUSTAND_SETZEN, art === 'testEnde' ? 'ende' : 'null');
      const png = await t.page.locator('.lx-kk').screenshot(); await t.ctx.close();
      const px = roh(png); const W = z.w;
      erg[h][art] = z.texte.map((tx) => {
        const L = []; for (const [x, y, w, hh] of tx.rects) for (let yy = Math.max(0, y); yy < Math.min(z.h, y + hh); yy++) for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) { const i = (yy * W + xx) * 3; L.push(lum(px[i], px[i + 1], px[i + 2])); }
        L.sort((a, c) => a - c); const p98 = L[Math.floor(L.length * 0.98)] || 0;
        const m = tx.farbe.match(/\d+(\.\d+)?/g).map(Number); const lt = lum(m[0], m[1], m[2]);
        const k = (Math.max(lt, p98) + 0.05) / (Math.min(lt, p98) + 0.05);
        return { text: tx.name, kontrast: +k.toFixed(2), hellste2: +p98.toFixed(4), pixel: L.length };
      });
      console.log(h.padEnd(22), art.padEnd(9), erg[h][art].map((x) => x.text + ' ' + x.kontrast + ':1').join(' | '));
    }
  }
  await b.close();
  fs.writeFileSync(path.join(HIER, 'mess', 'kontrast_korrektur.json'), JSON.stringify({ zeit: new Date().toISOString(), erg }, null, 1));
})();
