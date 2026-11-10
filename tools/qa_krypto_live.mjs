// Browser-Gegenproben mit ausschließlich erfundenen Daten und abgefangenen Anfragen.
// Aufruf im Repo: node tools/qa_krypto_live.mjs
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const html = await readFile(new URL('./trading/krypto_bot/cockpit.html', import.meta.url), 'utf8');
const origin = 'http://127.0.0.1:8743'; // Nur virtuelle Route; kein Server und kein Konto.
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
let checks = 0;
try {
  for (const nurLesen of [false, true]) {
    const context = await browser.newContext({viewport: {width: 1280, height: 900}});
    const page = await context.newPage();
    const fehler = [], schreibend = [], extern = [];
    page.on('pageerror', e => fehler.push(e.message));
    let zustand = 'frisch', abrufe = 0, freigeben;
    const periode = (netto, offen) => ({netto, offen, realisiert: netto - offen + 3, funding: -1, gebuehren: -2,
      prozent: netto / 1000, ab: '2026-11-01T00:00:00+00:00'});
    const profit = () => ({modus: 'TESTNETZ', zeit: new Date(Date.now() - (zustand === 'alt' ? 120000 : zustand === 'grenze' ? 44000 : 0)).toISOString(),
      wallet: 1089, offen: 25, gesamt: 1114, verfuegbar: 850, seit: '2026-11-01',
      aktualitaet: {einkommen_aktuell: zustand !== 'teilweise', einkommen_bis: zustand === 'teilweise' ? null : new Date().toISOString()},
      zeitraeume: {heute: periode(22, 5), '7_tage': periode(35, 10), '30_tage': periode(62, 20), gesamt: periode(114, 25)},
      pro_markt: {BTCUSDT: 114}, nicht_umgerechnet: [],
      positionen: [{symbol: 'BTCUSDT', seite: 'LONG', menge: 1, einstieg: 100, mark: 125, gewinn: 25,
        gewinn_prozent: 0.25, liquidation: null, hebel: 1, wert: 125}],
      tage: [['2026-11-01', 89]], kumuliert: [['2026-11-01', 89]]});
    const stand = () => ({zeit: new Date().toISOString(), modus: 'TESTNETZ', pause: true, notaus: false,
      maerkte: [], konto: null, kontostand: [], auftraege: [], gesundheit: [], ki: {letzter: null, vergleich: {}, kosten: 0},
      sammler: null, backtest: {}, risiko: {stufe: 1, test: {}}, lage: {}, satellit: null, scalp: null,
      kurse: {}, kurse_schnitt: {}, calls: null, telegram: false});
    await context.route('**/*', async route => {
      const r = route.request(), u = new URL(r.url());
      if (r.method() !== 'GET') { schreibend.push(r.url()); return route.abort(); }
      if (u.origin !== origin) { extern.push(r.url()); return route.abort(); }
      const antwort = data => route.fulfill({contentType: 'application/json', body: JSON.stringify(data)});
      if (u.pathname === '/') return route.fulfill({contentType: 'text/html', body:
        (nurLesen ? html.replace('<html lang="de">', '<html lang="de" data-nur-lesen="1">') : html)
          .replace('<main', '<div style="padding:12px">TESTDATEN · keine echte Kontoverbindung</div><main')});
      if (u.pathname === '/api/stand') return antwort(stand());
      if (u.pathname === '/api/profit') {
        abrufe++;
        if (zustand === 'langsam') await new Promise(resolve => { freigeben = resolve; });
        if (zustand === 'httpfehler') return route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify(profit())});
        if (zustand === 'jsonfehler') return route.fulfill({contentType: 'application/json', body: '<html>Keine Daten</html>'});
        if (zustand === 'ohne_schluessel') return antwort({hinweis: 'Keine Futures-Schlüssel gesetzt'});
        if (zustand === 'unbekannt') { const p = profit(); delete p.zeit; return antwort(p); }
        return antwort(profit());
      }
      if (u.pathname === '/api/fern') return antwort({verfuegbar: false});
      if (u.pathname === '/api/protokoll') return antwort({protokoll: [], laufend: []});
      return route.fulfill({status: 404, body: ''});
    });
    const neu = async art => {
      zustand = art;
      const vorher = abrufe;
      await page.locator('#live-neu').click();
      await page.waitForFunction(() => document.querySelector('#live-neu').getAttribute('aria-busy') === 'false');
      assert.ok(abrufe > vorher);
    };
    await page.goto(origin, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('#p-netto')?.textContent.includes('114'));
    assert.equal(await page.locator('#live-status').innerText(), 'Konto aktuell');
    assert.match(await page.locator('[aria-label="Aktuelle Kontowerte"]').innerText(), /850/);
    assert.match(await page.locator('#u-konto').innerText(), /1.?114/);
    checks++;
    assert.match(await page.locator('#p-kurve').innerText(), /mindestens zwei Tagesstände/);
    checks++;
    for (const [zeitraum, wert] of [['heute', '22'], ['7_tage', '35'], ['30_tage', '62'], ['gesamt', '114']]) {
      await page.locator(`[data-profit-zeitraum="${zeitraum}"]`).click();
      assert.match(await page.locator('#p-netto').innerText(), new RegExp(wert));
      assert.equal(await page.locator(`[data-profit-zeitraum="${zeitraum}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.perioden [aria-pressed="true"]').count(), 1);
      checks++;
    }
    await neu('teilweise');
    assert.match(await page.locator('#live-status').innerText(), /Gewinn unvollständig/);
    assert.match(await page.locator('#p-netto').innerText(), /^—/);
    assert.match(await page.locator('[aria-label="Aktuelle Kontowerte"]').innerText(), /1.?114/);
    assert.equal(await page.locator('#uebersicht .chip b').allTextContents().then(x => x.every(v => v === '—')), true);
    checks++;
    await neu('alt');
    assert.equal(await page.locator('#live-status').innerText(), 'Daten veraltet');
    assert.match(await page.locator('#p-netto').innerText(), /^—/);
    assert.match(await page.locator('#u-positionen').innerText(), /Kein aktueller Positionsabruf/);
    checks++;
    await neu('unbekannt');
    assert.equal(await page.locator('#live-status').innerText(), 'Datenstand unbekannt');
    assert.match(await page.locator('#p-netto').innerText(), /^—/);
    checks++;
    for (const art of ['httpfehler', 'jsonfehler', 'ohne_schluessel']) {
      await neu(art);
      assert.equal(await page.locator('#live-status').innerText(), 'Konto nicht erreichbar');
      assert.equal(await page.locator('#p-netto').count(), 0);
      checks++;
    }
    await neu('frisch');
    assert.match(await page.locator('#p-netto').innerText(), /114/);
    checks++;
    zustand = 'langsam';
    const vorher = abrufe;
    await page.locator('#live-neu').click();
    await page.waitForFunction(() => document.querySelector('#live-neu').getAttribute('aria-busy') === 'true');
    await page.evaluate(() => Promise.all([ladeProfit(), ladeProfit()]));
    assert.equal(abrufe, vorher + 1, 'Ein laufender Kontoabruf wird nicht verdoppelt');
    zustand = 'frisch'; freigeben();
    await page.waitForFunction(() => document.querySelector('#live-neu').getAttribute('aria-busy') === 'false');
    checks++;
    await neu('grenze');
    await page.waitForFunction(() => document.querySelector('#live-status').textContent === 'Daten veraltet', {timeout: 4000});
    assert.match(await page.locator('#p-netto').innerText(), /^—/);
    checks++;
    await neu('frisch');
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({width, height: 900});
      await page.waitForTimeout(180);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Keine Überbreite bei ${width}px`);
      checks++;
    }
    if (nurLesen) {
      assert.equal(await page.locator('#notaus').isVisible(), false);
      assert.equal(await page.locator('#autoK').isVisible(), false);
      assert.equal(await page.locator('#live-neu').isVisible(), true);
      checks++;
    }
    assert.deepEqual(fehler, [], 'Keine JavaScript-Laufzeitfehler');
    assert.deepEqual(schreibend, [], 'Keine schreibenden Anfragen');
    assert.deepEqual(extern, [], 'Keine externen Konto-/Modell-/Marktanfragen');
    await context.close();
  }
  console.log(`${checks} Browser-Prüfungen bestanden; ausschließlich Testdaten, keine externen oder schreibenden Anfragen.`);
} finally { await browser.close(); }
