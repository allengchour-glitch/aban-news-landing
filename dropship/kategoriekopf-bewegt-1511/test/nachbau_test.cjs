// Prueft den Testkopf im Nachbau (echtes gespeichertes HTML + lokal gerenderter Snippet), vergleicht mit dem heutigen Kopf.
// Aufruf: node test/nachbau_test.cjs [handle ...]
const path = require('path'); const fs = require('fs');
const { seite, GEOM, chromium, PROFIL } = require('../nachbau.cjs');
const { ZUSTAND } = require('./zustand.cjs');
const { VORBEREITEN, pixelVergleich, geoGleich } = require('./bildgeo.cjs');
const HIER = path.join(__dirname, '..');
const pruef = []; let fehler = 0;
function ok(bed, text, wert) { pruef.push([bed ? 'OK ' : 'FEHLER', text, wert === undefined ? '' : JSON.stringify(wert)]); if (!bed) fehler++; }
async function render(handle, fall) {
  const { rendern } = await import(path.join(HIER, 'harness', 'render.mjs'));
  return rendern(handle, fall || {});
}
(async () => {
  const handles = process.argv.slice(2).length ? process.argv.slice(2) : ['schmuck', 'damen-mode'];
  const b = await chromium.launch();
  for (const h of handles) {
    const html = path.join(HIER, 'html', 'live', h + '.html');
    const einsatz = await render(h);
    const mitClip = /data-lx-kb="s\d\d"/.test(einsatz.nach);
    for (const profil of (process.env.PROFILE || 'd,d1100,d800,m664').split(',')) {
      const basis = await seite(b, { html, profil, handle: h }); await basis.page.waitForTimeout(1500);
      const g0 = await basis.page.evaluate(GEOM);
      // W1: Ausschnitt der Kopffotos heute (Ken Burns gibt es heute nicht; Text, Knopf und Glanz ausgeblendet)
      let w0 = null, p0 = null; if (!profil.startsWith('m')) { w0 = await basis.page.evaluate(VORBEREITEN, true); p0 = await basis.page.locator('.lx-kk__bilder').screenshot(); }
      await basis.ctx.close();
      const t = await seite(b, { html, profil, handle: h, einsatz }); await t.page.waitForTimeout(1500);
      const g1 = await t.page.evaluate(GEOM); const z1 = await t.page.evaluate(ZUSTAND);
      await t.page.waitForTimeout(3500);
      const g1b = await t.page.evaluate(GEOM);
      ok(g1b.kk.h === g1.kk.h && g1b.karteBild.y === g1.karteBild.y, `${h} ${profil}: Kopfhöhe bleibt nach dem Laden gleich`, [g1.kk.h, g1b.kk.h]);
      console.error(h, profil, 'Kopfhöhe basis/test', g0.kk.h, g1.kk.h);
      const z2 = await t.page.evaluate(ZUSTAND);
      const tag = `${h} ${profil}:`;
      if (profil === 'd') {
        const kf = await t.page.evaluate(() => { const out = {}; const lauf = (rules) => { for (const r of rules) { if (r.type === CSSRule.KEYFRAMES_RULE && /^lxkb-/.test(r.name)) { let m = 1; for (const k of r.cssRules) { const t = k.style.transform || ''; const s = t.match(/scale\(([\d.]+)/); if (s) m = Math.max(m, Number(s[1])); } out[r.name] = m; } else if (r.cssRules) lauf(r.cssRules); } }; for (const sh of document.styleSheets) { try { lauf(sh.cssRules); } catch (e) {} } return out; });
        const kb = ['lxkb-a', 'lxkb-b', 'lxkb-c', 'lxkb-d'];
        ok(kb.every((n) => kf[n] > 1 && kf[n] <= 1.08), tag + ' Ken-Burns-Keyframes: Massstab höchstens 1,08 (aus dem Stylesheet)', kf);
        const dauer = await t.page.evaluate(() => [...document.querySelectorAll('.lx-kk__bilder img')].map((i) => getComputedStyle(i).animationDuration));
        ok(dauer.length === 0 || dauer.every((d) => d === '0s' || (parseFloat(d) >= 16 && parseFloat(d) <= 28)), tag + ' Ken-Burns-Dauer 16 bis 28 s', dauer);
      }
      ok(g1.ueberlauf === 0, tag + ' kein seitliches Scrollen', g1.ueberlauf);
      ok((t.fehler || []).length === 0 && g1.err.length === 0, tag + ' keine Seitenfehler', [t.fehler, g1.err]);
      ok(g1.kk.y === g0.kk.y, tag + ' Kopf oben gleich', [g0.kk.y, g1.kk.y]);
      if (profil.startsWith('m')) {
        ok(g1.kk.h === g0.kk.h && g1.karteBild.y === g0.karteBild.y, tag + ' Handy: Kopfhöhe und erstes Produktbild gleich', [g0.kk.h, g1.kk.h, g0.karteBild.y, g1.karteBild.y]);
        ok(g1.karteBild.y < 664, tag + ' Handy: erstes Produktbild beginnt im ersten Bildschirm', g1.karteBild.y);
        ok(!z1.buehneImKopf && t.netz.video.length === 0 && t.netz.poster.length === 0, tag + ' Handy: kein Clip, kein Poster geladen', [t.netz.video, t.netz.poster]);
        ok(!z2.knopf && !(z2.klassen || []).includes('lx-kb-an'), tag + ' Handy: keine Bewegungsklasse, kein Knopf', z2.klassen);
        ok(z2.nachher && z2.nachher.anim === 'lxkb-schein' && Number(z2.nachher.op) < 0.05, tag + ' Handy: Schimmer nach dem Einblenden wieder weg (16.11.: vorher op > 0.95, das war Fehler 3; die Spitze prüft pruef1611b/test/nachpruef_faelle.cjs)', z2.nachher);
        continue;
      }
      ok(g1.karteBild.y - g1.kk.y - g1.kk.h === g0.karteBild.y - g0.kk.y - g0.kk.h, tag + ' Abstand Kopf zu erstem Produktbild gleich', [g0.karteBild.y - g0.kk.y - g0.kk.h, g1.karteBild.y - g1.kk.y - g1.kk.h]);
      ok(z2.textUeber <= 0, tag + ' Kopfinhalt nicht abgeschnitten (Textblock endet im Kopf)', z2.textUeber);
      const clipErwartet = mitClip && PROFIL[profil][0] >= 1100;
      ok(!!z2.buehneImKopf === clipErwartet, tag + ' Clip-Bühne ' + (clipErwartet ? 'im Kopf' : 'nicht im Kopf'), z2.buehneImKopf);
      if (clipErwartet) {
        ok(z2.bilderOpacity === '0', tag + ' Fotostreifen ausgeblendet', z2.bilderOpacity);
        ok(z1.poster.every((p) => p.ok), tag + ' Poster geladen', z1.poster);
        let zv = z2; for (let i = 0; i < 16 && !(zv.video && !zv.video.paused && zv.video.frames > 10 && zv.video.op === '1'); i++) { await t.page.waitForTimeout(500); zv = await t.page.evaluate(ZUSTAND); }
        ok(zv.video && !zv.video.paused && zv.video.frames > 10 && zv.video.op === '1', tag + ' Clip spielt (Bilder dekodiert) und ist eingeblendet', zv.video);
        ok(z2.knopf && !z2.knopf.hidden && z2.knopf.sichtbar && z2.knopf.label === 'Bewegung anhalten', tag + ' Knopf sichtbar', z2.knopf);
        ok(zv.video && zv.video.breite === 960, tag + ' K5: Clip-Datei 960×720', zv.video && zv.video.breite);
        // Text darf den Clip nicht ueberdecken
        const clipX = z2.clipR.x; const textRechts = z2.textRechts;
        ok(textRechts <= clipX + z2.clipR.w * 0.42, tag + ' Text endet vor dem deckenden Teil des Clips', [textRechts, clipX]);
      } else {
        ok(t.netz.video.length === 0, tag + ' kein Video geladen', t.netz.video);
        if (g1.nBilder > 0) {
          ok((z2.klassen || []).includes('lx-kb-an'), tag + ' Bewegung an', z2.klassen);
          ok(z1.fotoTransform !== z2.fotoTransform && z2.fotoAnim === 'lxkb-a', tag + ' Foto driftet (Ken Burns)', [z1.fotoTransform, z2.fotoTransform]);
          const m = (z2.fotoTransform.match(/matrix\(([^,]+)/) || [])[1]; ok(m && Number(m) <= 1.0801, tag + ' Massstab höchstens 1,08', m);
          ok(z2.knopf && !z2.knopf.hidden && z2.knopf.sichtbar, tag + ' Knopf sichtbar', z2.knopf);
        }
      }
      // Knopf ueberdeckt keinen Text
      if (z2.knopf && z2.knopf.sichtbar) {
        const kb = z2.knopf.r; const hits = await t.page.evaluate((kb) => { const out = []; for (const el of document.querySelectorAll('.lx-kk h1, .lx-kk__beschr p, .lx-kk__beschr summary, .lx-kk__anriss, .lx-kk__beschr li')) { if ((el.closest('details:not([open])') && !el.matches('summary')) || !el.checkVisibility()) continue; for (const r of el.getClientRects()) { const y = r.top + scrollY; if (r.left < kb.x + kb.w && r.right > kb.x && y < kb.y + kb.h && y + r.height > kb.y && r.width > 0) out.push(el.tagName); } } return out; }, kb);
        ok(hits.length === 0, tag + ' Knopf überdeckt keinen Text', hits);
      }
      const z0 = await t.page.evaluate(ZUSTAND);
      ok((() => { const v = String(clipErwartet ? z0.clipTranslate : z0.bilderTranslate); return v === 'none' || v.split(/\s+/).every((x) => parseFloat(x) === 0); })(), tag + ' oben (Scroll 0) keine Parallaxe-Verschiebung', clipErwartet ? z0.clipTranslate : z0.bilderTranslate);
      // Parallaxe: Kopf zur Haelfte herausscrollen
      const y = await t.page.evaluate(() => { const k = document.querySelector('.lx-kk'); const r = k.getBoundingClientRect(); return Math.round(r.top + scrollY + r.height / 2); });
      await t.page.evaluate((y) => scrollTo(0, y), y); await t.page.waitForTimeout(400);
      const z3 = await t.page.evaluate(ZUSTAND);
      const tr = clipErwartet ? z3.clipTranslate : z3.bilderTranslate;
      if (clipErwartet || g1.nBilder > 0) ok(tr && tr !== 'none' && /px/.test(tr) && parseFloat(tr.split(' ')[1]) > 10, tag + ' Parallaxe beim Herausscrollen', tr);
      const g2 = await t.page.evaluate(GEOM);
      ok(g2.clsKopf === 0, tag + ' keine Layoutverschiebung, die nur den Kopf betrifft', [g2.clsKopf, g2.shifts]); console.error(tag, 'CLS gesamt basis/test', g0.cls, g2.cls);
      await t.page.evaluate(() => scrollTo(0, 0)); await t.page.waitForTimeout(300);
      // W1: Ausschnitt bei Ken-Burns-Zeit 0 gleich wie heute (Geometrie jedes Fotos; Pixel, wo die Fotos sichtbar sind)
      { const w1 = await t.page.evaluate(VORBEREITEN, true); const p1 = await t.page.locator('.lx-kk__bilder').screenshot();
        ok(geoGleich(w0, w1), tag + ' W1: Foto- und Bildkästen gleich wie heute (Ausschnitt)', [w0 && w0.bilder.map((x) => x.pic), w1.bilder.map((x) => x.pic)]);
        if (!clipErwartet && g1.nBilder > 0) { const pv = pixelVergleich(p0, p1); ok(pv.gleich, tag + ' W1: Kopffotos pixelgleich wie heute (Zeit 0)', pv); }
        await t.page.evaluate(() => { const x = document.getElementById('lx-w1-test'); if (x) x.remove(); }); }
      if (profil === 'd') await t.page.screenshot({ path: path.join(HIER, 'fotos', `nb_${h}_${profil}.jpg`), type: 'jpeg', quality: 72, clip: { x: 0, y: Math.max(0, g1.kk.y - 20), width: 1440, height: g1.kk.h + 40 } });
      await t.ctx.close();
    }
  }
  await b.close();
  for (const p of pruef) console.log(p.join(' '));
  console.log(`\n${pruef.length - fehler} bestanden, ${fehler} fehlgeschlagen`);
  process.exit(fehler ? 1 : 0);
})();
