// Sonderfaelle im Nachbau: reduzierte Bewegung, Datensparmodus, Autoplay gesperrt, Produkt ausverkauft, ohne JavaScript,
// Knopf (Maus, Tastatur, Merken), ausserhalb des Bildes, Parallaxe-Rueckfall ohne scroll-gebundene CSS, Franzoesisch.
const path = require('path');
const { seite, GEOM, chromium } = require('../nachbau.cjs');
const { ZUSTAND } = require('./zustand.cjs');
const HIER = path.join(__dirname, '..');
const pruef = []; let fehler = 0;
function ok(bed, text, wert) { pruef.push([bed ? 'OK ' : 'FEHLER', text, wert === undefined ? '' : JSON.stringify(wert)]); if (!bed) fehler++; }
const render = async (h, o) => (await import(path.join(HIER, 'harness', 'render.mjs'))).rendern(h, o || {});
const HTML = (h) => path.join(HIER, 'html', 'live', h + '.html');
const nur = process.argv.slice(2);
const fall = (n) => !nur.length || nur.includes(n);
(async () => {
  const b = await chromium.launch();
  const clipE = await render('schmuck'); const fotoE = await render('damen-mode');
  if (fall('reduziert')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE, reduziert: true }); await t.page.waitForTimeout(4000);
    const z = await t.page.evaluate(ZUSTAND);
    ok(z.buehneImKopf && z.poster.every((p) => p.ok) && !z.video && t.netz.video.length === 0, 'reduziert, Clipseite: Standbild, kein Video geladen', [z.poster, t.netz.video]);
    ok(!z.klassen.includes('lx-kb-an') && !z.knopf, 'reduziert, Clipseite: keine Bewegungsklasse, kein Knopf', z.klassen);
    ok(z.nachher.content === 'none' || z.nachher.content === 'normal', 'reduziert: kein Glanz', z.nachher);
    await t.ctx.close();
    const t2 = await seite(b, { html: HTML('damen-mode'), profil: 'd', einsatz: fotoE, reduziert: true }); await t2.page.waitForTimeout(2500);
    const a = await t2.page.evaluate(ZUSTAND); await t2.page.waitForTimeout(1500); const c = await t2.page.evaluate(ZUSTAND);
    ok(a.fotoTransform === 'none' && c.fotoTransform === 'none' && a.fotoAnim === 'none', 'reduziert, Fotoseite: Fotos stehen still', [a.fotoTransform, c.fotoTransform, a.fotoAnim]);
    const y = await t2.page.evaluate(() => { const k = document.querySelector('.lx-kk'); const r = k.getBoundingClientRect(); return r.top + scrollY + r.height / 2; });
    await t2.page.evaluate((y) => scrollTo(0, y), y); await t2.page.waitForTimeout(300);
    const d = await t2.page.evaluate(ZUSTAND);
    ok(d.bilderTranslate === 'none', 'reduziert, Fotoseite: keine Parallaxe', d.bilderTranslate);
    await t2.ctx.close();
  }
  if (fall('sparen')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE, vorLaden: (p) => p.addInitScript(() => { Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true }); }) });
    await t.page.waitForTimeout(5000); const z = await t.page.evaluate(ZUSTAND);
    ok(!z.video && t.netz.video.length === 0 && z.poster.every((p) => p.ok), 'Datensparmodus: nur Poster, kein Video', [z.video, t.netz.video]);
    ok(z.knopf && z.knopf.hidden, 'Datensparmodus: Knopf versteckt (keine Bewegung)', z.knopf);
    await t.ctx.close();
  }
  if (fall('autoplay')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE, vorLaden: (p) => p.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('gesperrt', 'NotAllowedError')); }; }) });
    await t.page.waitForTimeout(5000); const z = await t.page.evaluate(ZUSTAND);
    ok(!z.video && z.poster.every((p) => p.ok) && z.knopf && z.knopf.hidden, 'Autoplay gesperrt: Video entfernt, Poster bleibt, Knopf versteckt', [z.video, z.knopf]);
    ok((t.fehler || []).length === 0, 'Autoplay gesperrt: keine Seitenfehler', t.fehler);
    await t.ctx.close();
  }
  if (fall('ausverkauft')) {
    const e = await render('schmuck', { ausverkauft: true });
    ok(!/data-lx-kb=/.test(e.nach) && !/padding-right:calc\(var\(--lxkb-w\)/.test(e.vor), 'ausverkauft: Liquid gibt weder Bühne noch Textabstand aus');
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: e }); await t.page.waitForTimeout(2000);
    const a = await t.page.evaluate(ZUSTAND); await t.page.waitForTimeout(2500); const c = await t.page.evaluate(ZUSTAND);
    ok(!a.buehneImKopf && t.netz.video.length === 0 && t.netz.poster.length === 0 && a.fotoTransform !== c.fotoTransform, 'ausverkauft: Fotostreifen mit Ken Burns, kein Clip geladen', [t.netz.poster]);
    await t.ctx.close();
    const e2 = await render('schmuck', { fehlt: 'dreifachklinken-tennisarmband-mit-zirkon-613400' });
    ok(!/data-lx-kb=/.test(e2.nach), 'Produkt gelöscht: keine Bühne');
  }
  if (fall('ohnejs')) {
    for (const [h, e] of [['schmuck', clipE], ['damen-mode', fotoE]]) {
      const basis = await seite(b, { html: HTML(h), profil: 'd', javaScript: false }); const g0 = await basis.page.evaluate(GEOM); await basis.ctx.close();
      const t = await seite(b, { html: HTML(h), profil: 'd', einsatz: e, javaScript: false }); await t.page.waitForTimeout(1500);
      const g = await t.page.evaluate(GEOM); const z = await t.page.evaluate(ZUSTAND);
      ok(!z.buehneImKopf && z.buehneVersteckt <= 1 && !z.knopf && z.fotoTransform === 'none' && z.bilderOpacity === '1', `ohne JavaScript ${h}: Fotostreifen wie heute, nichts bewegt sich`, z);
      ok(g.kk.y === g0.kk.y && g.karteBild.y - g.kk.y - g.kk.h === g0.karteBild.y - g0.kk.y - g0.kk.h, `ohne JavaScript ${h}: Lage wie heute`, [g0.kk, g.kk]);
      await t.ctx.close();
    }
  }
  if (fall('knopf')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE }); await t.page.waitForTimeout(5000);
    const a = await t.page.evaluate(ZUSTAND);
    ok(a.video && !a.video.paused && a.video.frames > 0, 'Knopf: vorher spielt der Clip', a.video);
    await t.page.click('.lx-kb-knopf'); await t.page.waitForTimeout(400);
    const c = await t.page.evaluate(ZUSTAND); const ls = await t.page.evaluate(() => localStorage.getItem('lx-kb-halt'));
    ok(c.video && c.video.paused && c.knopf.label === 'Bewegung fortsetzen' && c.klassen.includes('lx-kb-halt') && ls === '1', 'Knopf (Maus): hält an, Beschriftung wechselt, Wahl gemerkt', [c.video, c.knopf.label, ls]);
    await t.page.reload({ waitUntil: 'load' }); await t.page.waitForTimeout(5000);
    const d = await t.page.evaluate(ZUSTAND);
    ok(d.video && d.video.paused && d.knopf && !d.knopf.hidden && d.knopf.label === 'Bewegung fortsetzen', 'Knopf: nach dem Neuladen bleibt angehalten, Knopf sichtbar', [d.video, d.knopf]);
    await t.page.focus('.lx-kb-knopf'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(1500);
    const e = await t.page.evaluate(ZUSTAND);
    const fokus = await t.page.evaluate(() => { const b = document.activeElement; return b && b.className === 'lx-kb-knopf' ? getComputedStyle(b).outlineStyle : null; });
    ok(e.video && !e.video.paused && e.knopf.label === 'Bewegung anhalten', 'Knopf (Tastatur Enter): läuft wieder', e.video);
    await t.ctx.close();
    // Tab-Reihenfolge: der Knopf ist per Tab erreichbar
    const t2 = await seite(b, { html: HTML('damen-mode'), profil: 'd', einsatz: fotoE }); await t2.page.waitForTimeout(2000);
    // Vom letzten fokussierbaren Element vor dem Knopf (im Kopf) einmal Tab: der Knopf muss als naechstes kommen
    const vorgaenger = await t2.page.evaluate(() => { const k = document.querySelector('.lx-kk'); const f = [...k.querySelectorAll('a[href], summary, button')].filter((e) => !e.classList.contains('lx-kb-knopf') && e.getBoundingClientRect().width > 0 && !(e.closest('details:not([open])') && e.tagName !== 'SUMMARY') && !e.closest('[aria-hidden="true"]')); const v = f[f.length - 1]; if (!v) return null; v.setAttribute('data-test-vor', ''); return v.tagName + '.' + v.className; });
    let gefunden = false;
    if (vorgaenger) { await t2.page.focus('[data-test-vor]'); await t2.page.keyboard.press('Tab'); gefunden = await t2.page.evaluate(() => !!(document.activeElement && document.activeElement.classList.contains('lx-kb-knopf'))); }
    else { for (let i = 0; i < 600 && !gefunden; i++) { await t2.page.keyboard.press('Tab'); gefunden = await t2.page.evaluate(() => !!(document.activeElement && document.activeElement.classList.contains('lx-kb-knopf'))); } }
    const ol = await t2.page.evaluate(() => { const b = document.activeElement; return b && b.classList.contains('lx-kb-knopf') ? getComputedStyle(b).outlineStyle + ' ' + getComputedStyle(b).outlineColor : null; });
    ok(gefunden && ol && !/^none/.test(ol), 'Fotoseite: Knopf per Tab erreichbar (nach ' + vorgaenger + '), Fokusrahmen sichtbar', ol);
    await t2.page.keyboard.press('Space'); await t2.page.waitForTimeout(300);
    const f = await t2.page.evaluate(ZUSTAND);
    ok(f.klassen.includes('lx-kb-halt') && f.fotoPlay === 'paused', 'Fotoseite: Leertaste hält Ken Burns an', [f.klassen, f.fotoPlay]);
    await t2.ctx.close();
  }
  if (fall('weg')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE }); await t.page.waitForTimeout(5000);
    await t.page.evaluate(() => scrollTo(0, 3000)); await t.page.waitForTimeout(800);
    const a = await t.page.evaluate(ZUSTAND);
    ok(a.video && a.video.paused && a.klassen.includes('lx-kb-weg'), 'ausserhalb des Bildes: Clip pausiert', a.video);
    await t.page.evaluate(() => scrollTo(0, 0)); await t.page.waitForTimeout(1200);
    const c = await t.page.evaluate(ZUSTAND);
    ok(c.video && !c.video.paused && !c.klassen.includes('lx-kb-weg'), 'zurück im Bild: Clip läuft wieder', c.video);
    await t.ctx.close();
  }
  if (fall('rueckfall')) {
    const e = { vor: fotoE.vor.replace('@supports (animation-timeline:view())', '@supports (animation-timeline:lxkeins())').replace('@supports not (animation-timeline:view())', '@supports not (animation-timeline:lxkeins())'), nach: fotoE.nach };
    ok(e.vor !== fotoE.vor, 'Rückfall-Probe: CSS-Unterstützung ausgeschaltet');
    const t = await seite(b, { html: HTML('damen-mode'), profil: 'd', einsatz: e, vorLaden: (p) => p.addInitScript(() => { const o = CSS.supports.bind(CSS); CSS.supports = function (a, b2) { if (/animation-timeline/.test(String(a))) return false; return o(a, b2); }; }) });
    await t.page.waitForTimeout(1500);
    const a = await t.page.evaluate(ZUSTAND);
    const y = await t.page.evaluate(() => { const k = document.querySelector('.lx-kk'); const r = k.getBoundingClientRect(); return r.top + scrollY + r.height / 2; });
    await t.page.mouse.wheel(0, 0); await t.page.evaluate((y) => scrollTo(0, y), y); await t.page.waitForTimeout(500);
    const c = await t.page.evaluate(() => ({ var: document.querySelector('.lx-kk').style.getPropertyValue('--lxkb-y'), tr: getComputedStyle(document.querySelector('.lx-kk__bilder')).translate, anim: getComputedStyle(document.querySelector('.lx-kk__bilder')).animationName }));
    ok(c.anim === 'none' && parseFloat(c.var) > 10 && /px/.test(c.tr) && parseFloat(c.tr.split(' ')[1]) > 10, 'Rückfall ohne scroll-gebundene CSS: Skript setzt die Parallaxe', c);
    ok(a.bilderTranslate === '0px' || a.bilderTranslate === 'none' || /^0px 0px$/.test(a.bilderTranslate), 'Rückfall: oben keine Verschiebung', a.bilderTranslate);
    await t.ctx.close();
  }
  if (fall('fr')) {
    const fs2 = require('fs'); const frHtml = path.join(HIER, 'html', 'fr_damen-mode.html');
    fs2.writeFileSync(frHtml, fs2.readFileSync(HTML('damen-mode'), 'utf8').replace(/<html([^>]*?)lang="de[^"]*"/, '<html$1lang="fr"'));
    const t = await seite(b, { html: frHtml, profil: 'd', einsatz: fotoE });
    await t.page.waitForTimeout(1500); const z = await t.page.evaluate(ZUSTAND);
    ok(z.knopf && /pause/.test(z.knopf.label), 'Französisch: Beschriftung des Knopfs', z.knopf && z.knopf.label);
    await t.ctx.close();
  }
  // ---- Korrekturrunde 16.11. (je Fund ein Fall, mit dem alten Snippet rot) ----
  const clipVon = (e) => (e.nach.match(/data-lx-kb="(s\d\d)"/) || [, null])[1];
  if (fall('w2')) {
    const erw = { 'geschirr-tisch': 's09', 'kaffee-tee-trinken': 's09', 'teekannen-kaffeeservice': null, 'deko-objekte-accessoires': null };
    for (const [h, c] of Object.entries(erw)) { const e = await render(h); ok(clipVon(e) === c, `W2 ${h}: Clip ${c || 'keiner'}`, clipVon(e)); }
    const g = await render('geschirr-tisch'); ok(/lx-kb-s09-quer-960\.mp4/.test(g.nach) && !/s08|s10/.test(g.nach), 'W2 geschirr-tisch: Becher-Datei, keine Teekanne, kein Kristall-Set');
  }
  if (fall('w3')) {
    for (const h of ['premium-geschenke', 'sub-taschen']) { const e = await render(h); ok(clipVon(e) === null, `W3 ${h}: kein Clip (Produkt nicht Mitglied)`, clipVon(e)); }
    const nm = await render('schmuck', { nichtMitglied: true }); ok(clipVon(nm) === null && !/padding-right:calc\(var\(--lxkb-w\)/.test(nm.vor), 'W3 Mitgliedschaft in Liquid geprüft: schmuck ohne Mitgliedschaft hat keinen Clip', clipVon(nm));
    const a = await render('weihnachten-2026', { jetzt: new Date('2027-01-06T12:00:00Z') }); const z = await render('weihnachten-2026', { jetzt: new Date('2027-01-07T12:00:00Z') });
    ok(clipVon(a) === 's05' && clipVon(z) === null, 'W3 Weihnachtskugeln: am 06.01.2027 Clip, ab 07.01.2027 keiner', [clipVon(a), clipVon(z)]);
  }
  if (fall('k1')) {
    const e = await render('schmuck', { varianteAus: true }); ok(clipVon(e) === null, 'K1 hinterlegte Ausführung nicht kaufbar: kein Clip (Produkt selbst kaufbar)', clipVon(e));
    const e2 = await render('schmuck'); ok(clipVon(e2) === 's03', 'K1 Ausführung kaufbar: Clip s03', clipVon(e2));
  }
  if (fall('w4')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE, vorLaden: async (p) => { await p.route(/lx-(story|kb)-s\d\d-quer-(v1|960)\.mp4/, async (r) => { await new Promise((res) => setTimeout(res, 4000)); try { await r.continue(); } catch (e) {} }); } });
    let da = false; for (let i = 0; i < 80 && !da; i++) { da = await t.page.evaluate(() => !!document.querySelector('.lx-kk video')); if (!da) await t.page.waitForTimeout(100); }
    await t.page.evaluate(() => scrollTo(0, 3000)); await t.page.waitForTimeout(1200);
    const a = await t.page.evaluate(ZUSTAND);
    ok(da && a.video && a.video.paused, 'W4 beim Start weggescrollt (play() abgebrochen): Clip bleibt, pausiert', a.video);
    await t.page.evaluate(() => scrollTo(0, 0));
    let z = null; for (let i = 0; i < 30; i++) { await t.page.waitForTimeout(500); z = await t.page.evaluate(ZUSTAND); if (z.video && !z.video.paused && z.video.frames > 5 && z.video.op === '1' && z.knopf && !z.knopf.hidden) break; }
    ok(z && z.video && !z.video.paused && z.video.frames > 5 && z.video.op === '1', 'W4 zurückgescrollt: Video spielt wieder', z && z.video);
    ok(z && z.knopf && !z.knopf.hidden && z.knopf.sichtbar, 'W4 zurückgescrollt: Knopf sichtbar', z && z.knopf);
    ok((t.fehler || []).length === 0, 'W4 keine Seitenfehler', t.fehler);
    await t.ctx.close();
  }
  if (fall('k2')) {
    const halb = (p) => p.evaluate(() => { const k = document.querySelector('.lx-kk'); const r = k.getBoundingClientRect(); scrollTo(0, Math.round(r.top + scrollY + r.height / 2)); });
    const tr = (p) => p.evaluate(() => getComputedStyle(document.querySelector('.lx-kk__bilder')).translate);
    const null0 = (v) => v === 'none' || String(v).split(/\s+/).every((x) => parseFloat(x) === 0);
    const t = await seite(b, { html: HTML('damen-mode'), profil: 'd', einsatz: fotoE }); await t.page.waitForTimeout(2000);
    await t.page.evaluate(() => document.querySelector('.lx-kb-knopf').click()); await t.page.waitForTimeout(200);
    await halb(t.page); await t.page.waitForTimeout(500); const a = await tr(t.page);
    ok(null0(a), 'K2 CSS-Pfad: angehalten, Kopf halb herausgescrollt: keine Parallaxe (Versatz 0)', a);
    await t.page.evaluate(() => document.querySelector('.lx-kb-knopf').click()); await t.page.waitForTimeout(500); const c = await tr(t.page);
    ok(/px/.test(c) && parseFloat(String(c).split(' ')[1]) > 10, 'K2 CSS-Pfad: fortgesetzt: Parallaxe wieder da', c);
    await t.ctx.close();
    const e = { vor: fotoE.vor.replace('@supports (animation-timeline:view())', '@supports (animation-timeline:lxkeins())').replace('@supports not (animation-timeline:view())', '@supports not (animation-timeline:lxkeins())'), nach: fotoE.nach };
    const t2 = await seite(b, { html: HTML('damen-mode'), profil: 'd', einsatz: e, vorLaden: (p) => p.addInitScript(() => { const o = CSS.supports.bind(CSS); CSS.supports = function (a, b2) { if (/animation-timeline/.test(String(a))) return false; return o(a, b2); }; }) });
    await t2.page.waitForTimeout(1500); await halb(t2.page); await t2.page.waitForTimeout(500);
    const vor = await tr(t2.page);
    await t2.page.evaluate(() => document.querySelector('.lx-kb-knopf').click()); await t2.page.waitForTimeout(300);
    const nach = await t2.page.evaluate(() => ({ v: document.querySelector('.lx-kk').style.getPropertyValue('--lxkb-y'), tr: getComputedStyle(document.querySelector('.lx-kk__bilder')).translate }));
    ok(parseFloat(String(vor).split(' ')[1]) > 10 && null0(nach.tr) && parseFloat(nach.v) === 0, 'K2 Skript-Rückfall: Anhalten setzt die Parallaxe auf 0, auch die Variable (friert nicht ein)', [vor, nach]);
    // waehrend des Anhaltens weiterscrollen, dann ohne weiteres Scrollen fortsetzen: Versatz muss sofort stimmen
    await t2.page.evaluate(() => scrollBy(0, 12)); await t2.page.waitForTimeout(300);
    await t2.page.evaluate(() => document.querySelector('.lx-kb-knopf').click()); await t2.page.waitForTimeout(300);
    const wieder = await t2.page.evaluate(() => ({ v: document.querySelector('.lx-kk').style.getPropertyValue('--lxkb-y'), tr: getComputedStyle(document.querySelector('.lx-kk__bilder')).translate }));
    ok(/px/.test(wieder.tr) && parseFloat(String(wieder.tr).split(' ')[1]) > 10 && parseFloat(wieder.v) > 10, 'K2 Skript-Rückfall: fortgesetzt (nach Scrollen im Halt): Parallaxe sofort wieder da', wieder);
    await t2.ctx.close();
  }
  if (fall('k3')) {
    const basis = await seite(b, { html: HTML('schmuck'), profil: 'd', javaScript: false }); await basis.page.waitForTimeout(1500);
    const z0 = await basis.page.evaluate(ZUSTAND); await basis.ctx.close();
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE, javaScript: false }); await t.page.waitForTimeout(2500);
    const z = await t.page.evaluate(ZUSTAND);
    ok(t.netz.poster.length === 0 && t.netz.video.length === 0, 'K3 ohne JavaScript, Clipseite: kein Poster und kein Video geladen', t.netz);
    ok(z.textPadR === z0.textPadR, 'K3 ohne JavaScript, Clipseite: Textabstand rechts wie heute', [z0.textPadR, z.textPadR]);
    await t.ctx.close();
    const t2 = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE, vorLaden: (p) => p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const x = document.querySelector('.lx-kk__text'); window.__padDCL = x ? getComputedStyle(x).paddingRight : null; }); }) });
    await t2.page.waitForTimeout(2000); const z2 = await t2.page.evaluate(ZUSTAND); const dcl = await t2.page.evaluate(() => window.__padDCL);
    ok(parseFloat(z2.textPadR) > 300 && dcl === z2.textPadR, 'K3 mit JavaScript: Textabstand schon vor dem ersten Zeichnen gesetzt (DOMContentLoaded gleich wie nach dem Laden)', [dcl, z2.textPadR]);
    await t2.ctx.close();
  }
  if (fall('k4')) {
    const t = await seite(b, { html: HTML('schmuck'), profil: 'd', einsatz: clipE });
    let z = null; for (let i = 0; i < 24; i++) { await t.page.waitForTimeout(500); z = await t.page.evaluate(ZUSTAND); if (z.video && !z.video.paused && z.video.frames > 5) break; }
    ok(z && z.video && !z.video.paused, 'K4 vorher (1440 px): Clip spielt', z && z.video);
    await t.page.setViewportSize({ width: 1000, height: 900 }); await t.page.waitForTimeout(1000);
    const a = await t.page.evaluate(ZUSTAND); const t0 = a.video && a.video.t; await t.page.waitForTimeout(800); const a2 = await t.page.evaluate(ZUSTAND);
    ok(a.video && a.video.paused && a2.video.t === t0, 'K4 Fenster auf 1000 px verkleinert: Video pausiert (unsichtbar)', [a.video, a2.video && a2.video.t]);
    await t.page.setViewportSize({ width: 1440, height: 900 }); await t.page.waitForTimeout(1200);
    const c = await t.page.evaluate(ZUSTAND);
    ok(c.video && !c.video.paused, 'K4 wieder 1440 px: Video läuft wieder', c.video);
    await t.ctx.close();
  }
  if (fall('k6')) {
    const e = { vor: fotoE.vor.replace('@supports (animation-timeline:view())', '@supports (animation-timeline:lxkeins())').replace('@supports not (animation-timeline:view())', '@supports not (animation-timeline:lxkeins())'), nach: fotoE.nach };
    const t = await seite(b, { html: HTML('damen-mode'), profil: 'd', einsatz: e, vorLaden: (p) => p.addInitScript(() => { const o = CSS.supports.bind(CSS); CSS.supports = function (a, b2) { if (/animation-timeline/.test(String(a))) return false; return o(a, b2); }; window.__lxy = 0; const sp = CSSStyleDeclaration.prototype.setProperty; CSSStyleDeclaration.prototype.setProperty = function (n, v, pr) { if (n === '--lxkb-y') window.__lxy++; return sp.call(this, n, v, pr); }; }) });
    await t.page.waitForTimeout(1500);
    const n0 = await t.page.evaluate(() => window.__lxy);
    await t.page.evaluate(async () => { for (let i = 0; i < 30; i++) { dispatchEvent(new Event('scroll')); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); } });
    const n1 = await t.page.evaluate(() => window.__lxy);
    ok(n1 - n0 === 0, 'K6 Rückfall: 30 Bilder ohne Scrollbewegung, keine Schreibvorgänge', [n0, n1]);
    await t.page.evaluate(() => { const k = document.querySelector('.lx-kk'); const r = k.getBoundingClientRect(); scrollTo(0, Math.round(r.top + scrollY + r.height / 2)); }); await t.page.waitForTimeout(400);
    const n2 = await t.page.evaluate(() => window.__lxy);
    ok(n2 > n1, 'K6 Rückfall: bei echter Scrollbewegung wird geschrieben', [n1, n2]);
    await t.ctx.close();
  }
  await b.close();
  for (const p of pruef) console.log(p.join(' '));
  console.log(`\n${pruef.length - fehler} bestanden, ${fehler} fehlgeschlagen`);
  process.exit(fehler ? 1 : 0);
})();
