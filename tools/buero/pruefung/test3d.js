// Funktionsprüfung der 3D-Ansicht gegen den Nachbau der Dashboard-Werte (Chromium mit Software-WebGL).
// Aufruf: node test3d.js <Ordner>   (Ordner mit seite.html, buero.json, den kb3d-*.js und harness.html aus harness.py)
const { chromium } = require('playwright');
const dir = process.argv[2];
let fehler = 0;
function ok(name, bedingung, info) {
  if (!bedingung) fehler += 1;
  console.log((bedingung ? 'ok     ' : 'FEHLER ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
}

async function lauf(b, optionen, vorher) {
  const ctx = await b.newContext(optionen);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  if (vorher) await vorher(p);
  await p.goto('file://' + dir + '/harness.html');
  await p.evaluate(() => window.__runAll());
  await p.waitForTimeout(1500);
  return { p, ctx, errs };
}

(async () => {
  const b = await chromium.launch();

  // ---------- 1) normaler Lauf mit WebGL ----------
  const { p, ctx, errs } = await lauf(b, { viewport: { width: 420, height: 900 } });
  const sichtbar = async (sel) => !(await p.locator(sel).first().evaluate((n) => n.hidden || !!n.closest('[hidden]')));
  ok('3D-Tab gewählt', (await p.locator('#kb-tab-3d').getAttribute('aria-selected')) === 'true');
  ok('3D-Ansicht sichtbar, 2D und Liste verborgen', (await sichtbar('#kb-pane-3d')) && !(await sichtbar('#kb-pane-buero')) && !(await sichtbar('#kb-pane-liste')));
  ok('Zeichenfläche und Überlagerung da', (await p.locator('.kb3-stage canvas.kb3-canvas').count()) === 1 && (await p.locator('.kb3-stage .kb3-over').count()) === 1);
  const gr = await p.locator('.kb3-canvas').evaluate((c) => [c.clientWidth, c.clientHeight, c.width, c.height]);
  ok('Zeichenfläche hat Grösse', gr[0] > 300 && gr[1] > 200 && gr[2] >= gr[0], gr);
  const N = await p.evaluate(() => window.__ROWS.length);   // erwartete Zahlen aus den Daten, nicht fest eingetragen
  const nl = await p.locator('.kb3-over .kb3-label').count();
  ok((N + 1) + ' Beschriftungen (alle Zeilen der Daten und Du)', nl === N + 1, nl);
  ok('Fehlerhinweis (kein 3D) ist verborgen', !(await p.locator('.kb3-aus').first().evaluate((n) => !n.hidden)));
  const blank = await p.evaluate(() => {
    window.KB3D.Buero.last.debug.render(1.7, false);
    const c = document.querySelector('.kb3-canvas');
    const t = document.createElement('canvas'); t.width = 64; t.height = 48;
    const g = t.getContext('2d'); g.drawImage(c, 0, 0, 64, 48);
    const d = g.getImageData(0, 0, 64, 48).data; let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++;
    return n;
  });
  ok('Zeichenfläche ist nicht leer', blank > 600, blank);

  // Raumknöpfe
  await p.locator('.kb3-chip[data-cmd="view:Shop"]').click();
  ok('Raumknopf Shop ist gedrückt, Alles nicht', (await p.locator('.kb3-chip[data-cmd="view:Shop"]').getAttribute('aria-pressed')) === 'true' && (await p.locator('.kb3-chip[data-cmd="view:alle"]').getAttribute('aria-pressed')) === 'false');
  const hatLast = await p.evaluate(() => !!(window.KB3D && window.KB3D.Buero && window.KB3D.Buero.last));
  ok('Prüfhilfe der Szene erreichbar (KB3D.Buero.last)', hatLast);
  const cam = () => p.evaluate(() => { const c = window.KB3D.Buero.last.debug.cam; return { d: +c.g.dist.toFixed(2), az: +c.g.az.toFixed(3), el: +c.g.el.toFixed(3), tx: +c.g.tx.toFixed(2) }; });
  const k1 = await cam();
  ok('Kamera fährt zum Shop (Ziel links)', k1.tx < -2, k1);
  await p.locator('.kb3-tool[data-cmd="zoomIn"]').click();
  const k2 = await cam();
  ok('Hineinzoomen verkleinert den Abstand', k2.d < k1.d, [k1.d, k2.d]);
  await p.locator('.kb3-tool[data-cmd="zoomOut"]').click(); await p.locator('.kb3-tool[data-cmd="zoomOut"]').click();
  const k3 = await cam();
  ok('Herauszoomen vergrössert ihn', k3.d > k2.d, [k2.d, k3.d]);
  await p.locator('.kb3-tool[data-cmd="turnLeft"]').click();
  const k4 = await cam();
  ok('Drehen ändert den Winkel', k4.az > k3.az, [k3.az, k4.az]);
  await p.locator('.kb3-tool[data-cmd="tiltUp"]').click();
  const k5 = await cam();
  ok('Steiler ändert die Neigung', k5.el > k4.el, [k4.el, k5.el]);
  await p.locator('.kb3-tool[data-cmd="reset"]').click();
  await p.waitForTimeout(300);
  const k6 = await cam();
  ok('Zurück stellt die Übersicht her', k6.tx > -1 && k6.d > 15, k6);
  ok('Raumknopf Alles wieder gedrückt', (await p.locator('.kb3-chip[data-cmd="view:alle"]').getAttribute('aria-pressed')) === 'true');

  // Treffer: Figur antippen
  await p.locator('.kb3-chip[data-cmd="view:Shop"]').click();
  await p.evaluate(() => { const m = window.KB3D.Buero.last; m.goView('Shop', true); m.debug.render(1.7, false); });
  const pos = await p.evaluate(() => window.KB3D.Buero.last.debug.screenOf('fortura'));
  ok('Bildschirmort der Figur «Fortura-Bestand» bekannt', !!pos, pos);
  const box = await p.locator('.kb3-canvas').boundingBox();
  await p.mouse.click(box.x + pos.x, box.y + pos.y);
  await p.waitForTimeout(250);
  const detail = await p.locator('#kb-pane-3d .kb-detail').first().textContent();
  ok('Antippen zeigt die Zeile im Detailfeld der 3D-Ansicht', /Fortura-Bestand/.test(detail), detail.trim().slice(0, 60));
  ok('Die Beschriftung der Figur ist markiert', (await p.locator('.kb3-label.is-sel').count()) === 1);
  await p.mouse.click(box.x + pos.x, box.y + pos.y);
  await p.waitForTimeout(200);
  ok('Zweites Antippen schliesst das Detailfeld', (await p.locator('#kb-pane-3d .kb-detail').first().textContent()).trim() === '');
  // Beschriftung antippen (Knopf im Dokument)
  await p.evaluate(() => { const m = window.KB3D.Buero.last; m.goView('Shop', true); m.debug.render(1.7, false); });
  const lab = p.locator('.kb3-label[data-pick="shop_sitzung"]');
  await lab.click();
  await p.waitForTimeout(200);
  ok('Beschriftung antippen wählt ebenfalls', /Shop-Sitzung/.test(await p.locator('#kb-pane-3d .kb-detail').first().textContent()));
  await p.locator('#kb-pane-3d .kb-x').click();
  ok('Kreuz schliesst', (await p.locator('#kb-pane-3d .kb-detail').first().textContent()).trim() === '');
  // Förderband, Tafel, Blatt
  for (const [id, text] of [['offene', 'Bestellungen unterwegs'], ['bestellungen7', 'Bestellungen'], ['zip', 'ZIP']]) {
    await p.evaluate(() => { const m = window.KB3D.Buero.last; m.goView('alle', true); m.debug.render(1.7, false); });
    const q = await p.evaluate((i) => window.KB3D.Buero.last.debug.screenOf(i), id);
    const bx = await p.locator('.kb3-canvas').boundingBox();
    if (q) await p.mouse.click(bx.x + q.x, bx.y + q.y);
    await p.waitForTimeout(200);
    const t = await p.locator('#kb-pane-3d .kb-detail').first().textContent();
    ok('Antippen von «' + id + '» zeigt seine Zeile', q && t.length > 5 && new RegExp(text).test(t), t.trim().slice(0, 50));
    await p.mouse.click(bx.x + (q ? q.x : 10), bx.y + (q ? q.y : 10));
    await p.waitForTimeout(100);
  }
  // Tastatur
  await p.locator('.kb3-canvas').focus();
  const a0 = (await cam()).az;
  await p.keyboard.press('ArrowLeft');
  ok('Pfeiltaste dreht', (await cam()).az > a0);
  // Grösser
  await p.locator('.kb3-tool[data-cmd="gross"]').click();
  ok('Grösser schaltet die Fläche um', await p.locator('.kb3-stage').evaluate((n) => n.classList.contains('is-gross')) && (await p.locator('.kb3-tool[data-cmd="gross"]').getAttribute('aria-pressed')) === 'true');
  await p.waitForTimeout(500);
  const gr2 = await p.locator('.kb3-canvas').evaluate((c) => [c.clientWidth, c.clientHeight]);
  ok('Fläche folgt der neuen Grösse (höher als breit)', gr2[1] > gr2[0], gr2);
  await p.locator('.kb3-tool[data-cmd="gross"]').click();
  // Ansichten wechseln
  await p.locator('#kb-tab-buero').click();
  ok('Tab 2D zeigt die Zeichnung, 3D verborgen', (await sichtbar('#kb-pane-buero')) && !(await sichtbar('#kb-pane-3d')));
  await p.evaluate(() => window.__runAll());
  ok('2D: Figuren da', (await p.locator('#kb-pane-buero .kb-desk').count()) >= 14);
  await p.locator('#kb-tab-liste').click();
  await p.evaluate(() => window.__runAll());
  ok('Liste hat ' + N + ' Zeilen', (await p.locator('#kb-pane-liste .kb-row').count()) === N);
  await p.locator('#kb-tab-3d').click();
  ok('Tab 3D wieder sichtbar', await sichtbar('#kb-pane-3d'));

  // ---------- Arbeitsort: Kürzel an den Beschriftungen, Schilder am Tisch, Detailfeld mit Link ----------
  const orte = await p.evaluate(() => Array.from(document.querySelectorAll('.kb3-over .kb3-label')).map((l) => (l.querySelector('.kb3-ort') ? l.querySelector('.kb3-ort').textContent.trim() : '')));
  ok(N + ' Beschriftungen tragen ein Ortskürzel, «Du» keins', orte.filter(Boolean).length === N && orte.filter((t) => !t).length === 1, orte);
  ok('Ortskürzel sind nur die bekannten Wörter', orte.filter(Boolean).every((t) => ['GitHub', 'Claude', 'GitHub + PC', 'Dein PC', 'Shopify', 'Bei dir'].includes(t)), Array.from(new Set(orte)));
  const schilder = await p.evaluate(() => window.KB3D.Buero.last.debug.seats.filter((s) => !s.spec.boss).map((s) => ({ ent: s.entId, used: !!s.used, mesh: !!s.sign, tex: !!(s.sign && s.sign.tex) })));
  ok('14 Plätze, alle benutzt, jeder mit Schild und Bild', schilder.length === 14 && schilder.every((s) => s.used && s.mesh && s.tex), schilder.filter((s) => !(s.used && s.mesh && s.tex)));
  const tafeln = await p.evaluate(() => new Set(window.KB3D.Buero.last.debug.seats.filter((s) => s.sign && s.sign.tex).map((s) => s.sign.tex)).size);
  ok('Drei verschiedene Schilder (GitHub, Claude, GitHub + PC)', tafeln === 3, tafeln);
  const chefSchild = await p.evaluate(() => window.KB3D.Buero.last.debug.seats.filter((s) => s.spec.boss).every((s) => !s.sign));
  ok('Das Chefbüro hat kein Schild', chefSchild);
  // Schild im Bild: ein Bild mit Schildern unterscheidet sich von einem ohne (Schilder kurz abschalten)
  const px = await p.evaluate(() => {
    const m = window.KB3D.Buero.last; m.goView('Versand', true); m.debug.render(1.7, true);
    const lies = () => { const c = document.querySelector('.kb3-canvas'); const t = document.createElement('canvas'); t.width = 160; t.height = 120; const g = t.getContext('2d'); g.drawImage(c, 0, 0, 160, 120); return g.getImageData(0, 0, 160, 120).data; };
    m.debug.render(1.7, true); const mit = lies();
    const alt = m.debug.seats.map((s) => s.sign); m.debug.seats.forEach((s) => { s.sign = null; });
    m.debug.render(1.7, true); const ohne = lies();
    m.debug.seats.forEach((s, i) => { s.sign = alt[i]; });
    let d = 0; for (let i = 0; i < mit.length; i += 4) if (Math.abs(mit[i] - ohne[i]) + Math.abs(mit[i + 1] - ohne[i + 1]) + Math.abs(mit[i + 2] - ohne[i + 2]) > 40) d++;
    return d;
  });
  ok('Die Schilder sind im Versandraum im Bild zu sehen', px > 12, px);
  // Schultern und Ellbogen heller: nur Rumpf und Arme tragen Aufhellung, Beine, Kopf und Augen nicht
  const lift = await p.evaluate(() => {
    const k = window.KB3D.Buero.last.debug.seats[0].fig.k.mod.cpu, o = {};
    Object.keys(k).forEach((g) => { let n = 0, mx = 0; for (let i = 0; i < k[g].n; i++) { const v = k[g].data[i * 12 + 7]; if (v > 0) { n++; if (v > mx) mx = v; } } o[g] = [n, +mx.toFixed(2)]; });
    return o;
  });
  ok('Aufhellung: Rumpf und Arme haben aufgehellte Punkte (höchstens 0,8), Beine, Kopf und Augen keine',
    ['armUN', 'armLN', 'armUP', 'armLP', 'torso'].every((g) => lift[g] && lift[g][0] > 20 && lift[g][1] > 0.5 && lift[g][1] <= 0.8) && ['thighN', 'shinN', 'thighP', 'shinP', 'head', 'eyes'].every((g) => !lift[g] || lift[g][0] === 0), lift);
  const tippe = async (id) => {
    await p.evaluate(() => { const m = window.KB3D.Buero.last; m.goView('alle', true); m.debug.render(1.7, false); });
    const q = await p.evaluate((i) => window.KB3D.Buero.last.debug.screenOf(i), id);
    const bx = await p.locator('.kb3-canvas').boundingBox();
    if (q) await p.mouse.click(bx.x + q.x, bx.y + q.y);
    await p.waitForTimeout(250);
    return q;
  };
  const detailInfo = () => p.evaluate(() => {
    const d = document.querySelector('#kb-pane-3d .kb-detail');
    const zl = d.querySelector('.r-linkzeile'), a = d.querySelector('a.r-link');
    return {
      ort: (d.querySelector('.r-ort') || {}).textContent || '',
      zeile: !!zl && !zl.hidden,
      woerter: a ? Array.from(a.querySelectorAll('.lt')).filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.textContent) : [],
      href: a ? a.getAttribute('href') : null, target: a ? a.getAttribute('target') : null, rel: a ? a.getAttribute('rel') : null,
    };
  });
  const schliesse = async () => { await p.locator('#kb-pane-3d .kb-x').click(); };
  await tippe('auswahl');
  let di = await detailInfo();
  ok('«Auswahl-Lauf»: GitHub-Cloud, Link zur Lauf-Liste, Wort «In GitHub öffnen», neues Fenster ohne Rückbezug',
    di.ort === 'GitHub-Cloud' && di.zeile && di.href === 'https://github.com/allengchour-glitch/aban-news-landing/actions/workflows/auswahl-lauf.yml' && JSON.stringify(di.woerter) === JSON.stringify(['In GitHub öffnen']) && di.target === '_blank' && /noopener/.test(di.rel) && /noreferrer/.test(di.rel), di);
  await schliesse();
  await tippe('shop_sitzung');
  di = await detailInfo();
  ok('«Shop-Sitzung»: Claude-Sitzung mit Link und Wort «In Claude öffnen»', /Claude/.test(di.ort) && di.zeile && /^https:\/\/claude\.ai\/code\/session_/.test(di.href || '') && JSON.stringify(di.woerter) === JSON.stringify(['In Claude öffnen']), di);
  await schliesse();
  await tippe('offene');
  di = await detailInfo();
  ok('Band «Bestellungen unterwegs»: Shopify mit Link und Wort «Im Shopify-Admin öffnen»', /Shopify/.test(di.ort) && di.zeile && /^https:\/\/admin\.shopify\.com\//.test(di.href || '') && JSON.stringify(di.woerter) === JSON.stringify(['Im Shopify-Admin öffnen']), di);
  await schliesse();
  await tippe('zip');
  di = await detailInfo();
  ok('Blatt «ZIP»: Dein Windows-PC, keine Link-Zeile, kein href', /Windows-PC/.test(di.ort) && !di.zeile && di.href === null, di);
  await schliesse();
  await tippe('bestellwaechter');
  di = await detailInfo();
  ok('«Bestellwächter»: Claude-Cloud, ohne Link (keine echte Lauf-Seite)', /Claude/.test(di.ort) && !di.zeile && di.href === null, di);
  await schliesse();
  ok('keine Seitenfehler im normalen Lauf', errs.length === 0, errs.slice(0, 3));

  // Bilder: Handy und Desktop
  await p.evaluate(() => { const m = window.KB3D.Buero.last; m.goView('alle', true); m.debug.render(1.7, false); });
  await p.locator('#kb-pane-3d').screenshot({ path: dir + '/3d-handy-alle.png' });
  await p.locator('.kb3-chip[data-cmd="view:Versand"]').click();
  await p.waitForTimeout(1200);
  await p.locator('#kb-pane-3d').screenshot({ path: dir + '/3d-handy-versand.png' });
  await ctx.close();

  // ---------- 1b) Fremde Links: nur https und bekannte Hosts ----------
  const r5 = await lauf(b, { viewport: { width: 420, height: 900 } });
  await r5.p.locator('#kb-tab-liste').click();
  const linkLage = async (wert) => {
    await r5.p.evaluate((w) => { window.__ROWS.forEach((r) => { r.link = w; }); window.__runAll(); }, wert);
    return r5.p.evaluate(() => ({
      zeilen: document.querySelectorAll('#kb-pane-liste .kb-row').length,
      href: document.querySelectorAll('#kb-pane-liste a.r-link[href]').length,
      sichtbar: Array.from(document.querySelectorAll('#kb-pane-liste .r-linkzeile')).filter((zl) => !zl.hidden).length,
    }));
  };
  const BOESE = ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'http://github.com/x', 'https://evil.example/x', 'https://github.com.evil.example/x', 'https://evil.example/https://github.com/x', 'https://user:pw@github.com/x', 'https://github.com:8443/x', 'data:text/html,hi', '//github.com/x', 'github.com/x', '', null, 5];
  const durch = [];
  for (const w of BOESE) { const l = await linkLage(w); if (l.zeilen !== N || l.href !== 0 || l.sichtbar !== 0) durch.push([w, l]); }
  ok('Fremde und fehlerhafte Links werden nie zum Link (14 Fälle)', durch.length === 0, durch);
  const gut = await linkLage('https://github.com/allengchour-glitch/aban-news-landing/actions');
  ok('Ein erlaubter Link erscheint in allen ' + N + ' Zeilen', gut.zeilen === N && gut.href === N && gut.sichtbar === N, gut);
  const hostGrossklein = await linkLage('HTTPS://GitHub.com/x');
  ok('Gross-/Kleinschreibung des Hosts ändert nichts (wird zu github.com)', hostGrossklein.href === N, hostGrossklein);
  ok('Fremde Links: keine Seitenfehler', r5.errs.length === 0, r5.errs.slice(0, 3));
  await r5.ctx.close();

  // ---------- 1c) Alte Datei ohne Arbeitsort: die Seite läuft, es gibt keine Schilder ----------
  const r6 = await lauf(b, { viewport: { width: 420, height: 900 } });
  await r6.p.evaluate(() => { window.__ROWS.forEach((r) => { delete r.ort_art; delete r.ort; delete r.ort_kurz; delete r.ort_text; delete r.link; }); window.__runAll(); });
  await r6.p.waitForTimeout(300);
  const alt = await r6.p.evaluate(() => ({
    tex: window.KB3D.Buero.last.debug.seats.filter((s) => s.sign && s.sign.tex).length,
    kurz: Array.from(document.querySelectorAll('.kb3-over .kb3-ort')).filter((n) => n.textContent.trim()).length,
    render: (() => { try { window.KB3D.Buero.last.debug.render(1.7, true); return true; } catch (e) { return String(e); } })(),
  }));
  ok('Alte Datei ohne Arbeitsort: keine Schilder, keine Kürzel, Zeichnen geht', alt.tex === 0 && alt.kurz === 0 && alt.render === true, alt);
  ok('Alte Datei ohne Arbeitsort: keine Seitenfehler', r6.errs.length === 0, r6.errs.slice(0, 3));
  await r6.ctx.close();

  // ---------- 2) ohne WebGL: Rückfall auf 2D ----------
  const b2 = await chromium.launch({ args: ['--disable-gpu', '--disable-3d-apis', '--disable-webgl'] });
  const r2 = await lauf(b2, { viewport: { width: 420, height: 900 } });
  const sicht2 = async (sel) => !(await r2.p.locator(sel).first().evaluate((n) => n.hidden || !!n.closest('[hidden]')));
  const hatGl = await r2.p.evaluate(() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch (e) { return false; } });
  if (hatGl) console.log('Hinweis: dieser Browser liess WebGL trotz Schalter zu, Rückfalltest übersprungen');
  else {
    ok('ohne WebGL: 2D-Ansicht ist gewählt und sichtbar', (await r2.p.locator('#kb-tab-buero').getAttribute('aria-selected')) === 'true' && (await sicht2('#kb-pane-buero')));
    ok('ohne WebGL: 3D-Tab und 3D-Ansicht sind verborgen', !(await sicht2('#kb-tab-3d')) && !(await sicht2('#kb-pane-3d')));
    ok('ohne WebGL: Hinweis sichtbar', await sicht2('.kb3-aus'));
    await r2.p.evaluate(() => window.__runAll());
    ok('ohne WebGL: 2D-Figuren werden gezeichnet', (await r2.p.locator('#kb-pane-buero .kb-desk').count()) >= 14);
    ok('ohne WebGL: keine Seitenfehler', r2.errs.length === 0, r2.errs.slice(0, 3));
  }
  await r2.ctx.close(); await b2.close();

  // ---------- 3) Modelldatei fehlt: Rückfall ----------
  const r3 = await lauf(b, { viewport: { width: 420, height: 900 } }, async (pg) => { await pg.route('**/kb3d-pack-3.js', (rt) => rt.abort()); });
  const sicht3 = async (sel) => !(await r3.p.locator(sel).first().evaluate((n) => n.hidden || !!n.closest('[hidden]')));
  ok('Modelldatei fehlt: 2D ist gewählt', (await r3.p.locator('#kb-tab-buero').getAttribute('aria-selected')) === 'true' && (await sicht3('#kb-pane-buero')));
  ok('Modelldatei fehlt: Hinweis sichtbar, 3D verborgen', (await sicht3('.kb3-aus')) && !(await sicht3('#kb-pane-3d')));
  await r3.ctx.close();

  // ---------- 4) Code-Datei fehlt ----------
  const r4 = await lauf(b, { viewport: { width: 420, height: 900 } }, async (pg) => { await pg.route('**/kb3d-code.js', (rt) => rt.abort()); });
  const sicht4 = async (sel) => !(await r4.p.locator(sel).first().evaluate((n) => n.hidden || !!n.closest('[hidden]')));
  ok('Codedatei fehlt: 2D ist gewählt und sichtbar', (await r4.p.locator('#kb-tab-buero').getAttribute('aria-selected')) === 'true' && (await sicht4('#kb-pane-buero')));
  await r4.ctx.close();

  await b.close();
  console.log(fehler === 0 ? 'ALLES OK' : fehler + ' FEHLER');
  process.exit(fehler === 0 ? 0 : 1);
})();
