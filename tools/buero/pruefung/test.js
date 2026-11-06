// Funktionsprüfung der Seite gegen die nachgebauten Dashboard-Werte (keine Bilder). Aufruf: node test.js <Ordner>
const { chromium } = require('playwright');
const dir = process.argv[2];
let fehler = 0;
function ok(name, bedingung, info) {
  if (!bedingung) fehler += 1;
  console.log((bedingung ? 'ok     ' : 'FEHLER ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + dir + '/harness.html');
  await p.locator('#kb-tab-buero').click();
  await p.evaluate(() => window.__runAll());
  // erwartete Zahlen aus den Daten rechnen (nicht fest eintragen: sie ändern sich mit jeder Auffrischung)
  const rows = await p.evaluate(() => window.__ROWS);
  const N = rows.length, BL = rows.filter((r) => r.figur === 'papier').length;
  const ST = (s) => String(rows.filter((r) => r.status === s).length);

  const z = async (sel) => p.locator(sel).count();
  const NS = rows.filter((r) => r.bereich === 'Shop' && r.figur === 'arbeiter').length;
  ok('Shop hat ' + NS + ' Figuren', (await z('.kb-floor[data-bereich="Shop"] .kb-desk')) === NS);
  ok('Versand hat 3 Figuren und 1 Band', (await z('.kb-floor[data-bereich="Versand"] .kb-desk')) === 3 && (await z('.kb-floor[data-bereich="Versand"] .kb-band')) === 1);
  ok('Band zeigt 3 Pakete', (await z('.kb-band .paket')) === 3);
  ok('Krypto hat 5 Figuren', (await z('.kb-floor[data-bereich="Krypto"] .kb-desk')) === 5);
  ok('Chef: 1 Figur, ' + BL + ' Blätter, 1 Tafel', (await z('.kb-chef-fig .kb-desk.is-chef')) === 1 && (await z('.kb-blatt')) === BL && (await z('.kb-tafel')) === 1);
  ok('Chef ohne markierte Textfelder', (await z('.kb-chef-fig [data-source]')) === 0);
  ok('Tafel zeigt 5', (await p.locator('.kb-tafel .t-zahl').textContent()) === '5');
  ok('Chef-Blase zeigt ' + BL, (await p.locator('.kb-chef-fig .p-warn .f-bubtxt').textContent()) === String(BL));

  const posen = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.kb-floor[data-draw="raum"] .kb-desk')].map((n) => [n.dataset.pick, [...n.classList].filter((c) => c.startsWith('pose-') || c.startsWith('st-')).join(' ')])));
  ok('Haltungen aus den echten Zeiten', posen.shop_sitzung.includes('pose-busy') && posen.krypto_sitzung.includes('pose-busy') && posen.bestellwaechter.includes('pose-busy') && posen.auswahl.includes('pose-rest') && posen.fortura.includes('pose-warn') && posen.cj_anlegen.includes('pose-warn'), posen);

  // Klick auf eine Figur öffnet das Detailfeld nur im eigenen Raum
  await p.locator('.kb-desk[data-pick="fortura"]').click();
  const d1 = await p.evaluate(() => [...document.querySelectorAll('#kb-pane-buero .kb-detail')].map((d) => d.textContent.trim().length > 0));
  ok('Detail nur im Shop-Raum', JSON.stringify(d1) === JSON.stringify([true, false, false, false]), d1);
  const t1 = await p.locator('.kb-raum').first().locator('.kb-detail').textContent();
  ok('Detail nennt Fortura-Bestand und den Befund', t1.includes('Fortura-Bestand') && t1.includes('Freigabedatei'));
  const lw = await p.locator('.kb-raum').first().locator('.kb-detail .r-linkzeile').evaluate((zl) => ({
    hidden: zl.hidden,
    woerter: Array.from(zl.querySelectorAll('.lt')).filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.textContent),
    href: zl.querySelector('a.r-link').getAttribute('href'),
  }));
  ok('Detail nennt den Arbeitsort «GitHub-Cloud» mit Wort und Link zur Lauf-Liste', t1.includes('Arbeitsort') && t1.includes('GitHub-Cloud') && !lw.hidden && JSON.stringify(lw.woerter) === JSON.stringify(['In GitHub öffnen']) && lw.href === 'https://github.com/allengchour-glitch/aban-news-landing/actions/workflows/fortura-bestand.yml', lw);
  ok('Detail ist aufgeklappt', await p.locator('.kb-detail details').first().evaluate((d) => d.open));
  ok('Figur ist markiert', await p.locator('.kb-desk[data-pick="fortura"]').evaluate((n) => n.classList.contains('is-sel')));
  // Zweiter Klick schliesst
  await p.locator('.kb-desk[data-pick="fortura"]').click();
  ok('Zweiter Klick schliesst das Detail', (await p.evaluate(() => [...document.querySelectorAll('#kb-pane-buero .kb-detail')].every((d) => d.textContent.trim() === ''))));
  // Blatt im Chefbüro, Schliessen-Knopf
  await p.locator('.kb-blatt[data-pick="zip"]').click();
  const t2 = await p.locator('.kb-raum').nth(3).locator('.kb-detail').textContent();
  ok('Blatt öffnet Detail im Chefbüro', t2.includes('Starter-ZIP einspielen'));
  const zl2 = await p.locator('.kb-raum').nth(3).locator('.kb-detail .r-linkzeile').evaluate((zl) => ({ hidden: zl.hidden, href: zl.querySelector('a.r-link').getAttribute('href') }));
  ok('Blatt «ZIP»: Arbeitsort Dein Windows-PC, kein Link', t2.includes('Dein Windows-PC') && zl2.hidden && zl2.href === null, zl2);
  await p.locator('.kb-raum').nth(3).locator('.kb-x').click();
  ok('Schliessen-Knopf leert das Detail', (await p.evaluate(() => [...document.querySelectorAll('#kb-pane-buero .kb-detail')].every((d) => d.textContent.trim() === ''))));
  // Tastatur: Fokus + Enter
  await p.locator('.kb-desk[data-pick="auswahl"]').focus();
  await p.keyboard.press('Enter');
  ok('Enter öffnet das Detail', (await p.locator('.kb-raum').first().locator('.kb-detail').textContent()).includes('Auswahl-Lauf'));
  await p.keyboard.press('Enter');

  // Markierungen: jedes markierte Feld hat data-where
  const ohneWhere = await p.evaluate(() => [...document.querySelectorAll('.kb-pane:not([hidden]) [data-source][data-field]')].filter((n) => !n.dataset.where).length);
  ok('Alle markierten Felder tragen data-where', ohneWhere === 0, ohneWhere);

  // Ansicht wechseln
  ok('Liste ist zuerst verborgen', await p.locator('#kb-pane-liste').evaluate((n) => n.hidden));
  ok('3D-Ansicht ist bei der 2D-Ansicht verborgen', await p.locator('#kb-pane-3d').evaluate((n) => n.hidden));
  await p.locator('#kb-tab-liste').click();
  ok('Tab Liste zeigt die Liste und verbirgt das Büro', !(await p.locator('#kb-pane-liste').evaluate((n) => n.hidden)) && (await p.locator('#kb-pane-buero').evaluate((n) => n.hidden)));
  ok('aria-selected wechselt', (await p.locator('#kb-tab-liste').getAttribute('aria-selected')) === 'true' && (await p.locator('#kb-tab-buero').getAttribute('aria-selected')) === 'false');
  await p.evaluate(() => window.__runAll());
  ok('Liste hat ' + N + ' Zeilen', (await z('#kb-pane-liste .kb-row')) === N);

  // Zähler
  const zaehler = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-draw="n"]')].map((n) => [n.dataset.st, n.textContent])));
  ok('Zähler ' + ST('gruen') + ' grün, ' + ST('gelb') + ' gelb, ' + ST('du') + ' für dich, ' + ST('rot') + ' rot', zaehler.gruen === ST('gruen') && zaehler.gelb === ST('gelb') && zaehler.du === ST('du') && zaehler.rot === ST('rot'), zaehler);

  ok('keine Seitenfehler', errs.length === 0, errs);

  // Ohne Bewegung: keine Animation
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p2 = await ctx2.newPage();
  await p2.goto('file://' + dir + '/harness.html');
  await p2.locator('#kb-tab-buero').click();
  await p2.evaluate(() => window.__runAll());
  const anim = await p2.evaluate(() => {
    const a = document.querySelector('.kb-desk.pose-busy .f-armL');
    return a ? getComputedStyle(a).animationName : 'kein Element';
  });
  ok('reduzierte Bewegung: keine Animation', anim === 'none', anim);
  const ctx3 = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  const p3 = await ctx3.newPage();
  await p3.goto('file://' + dir + '/harness.html');
  await p3.locator('#kb-tab-buero').click();
  await p3.evaluate(() => window.__runAll());
  const anim3 = await p3.evaluate(() => {
    const a = document.querySelector('.kb-desk.pose-busy .f-armL');
    return a ? getComputedStyle(a).animationName : 'kein Element';
  });
  ok('normale Bewegung: Tippen läuft', anim3 === 'kb-tipp-l', anim3);

  await b.close();
  console.log(fehler === 0 ? 'ALLES OK' : fehler + ' FEHLER');
  process.exit(fehler === 0 ? 0 : 1);
})();
