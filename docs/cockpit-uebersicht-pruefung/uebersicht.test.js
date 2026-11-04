// Prüfung der Cockpit-Übersicht (cockpit.html) mit echtem Chromium. Erwartungen sind VON HAND aus den Fixtures (fixtures.py) gerechnet, nicht aus dem Code übernommen.
//   python3 fixtures.py && node uebersicht.test.js          (COCKPIT_HTML=<Datei> prüft eine andere Fassung, z. B. für die Mutationsprobe)
let playwright; try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const HTML = process.env.COCKPIT_HTML || path.resolve(__dirname, '../../tools/trading/krypto_bot/cockpit.html');
const FX = path.join(__dirname, 'fx');
let fails = 0, passes = 0;
const ok = (c, msg, info) => { if (c) passes++; else { fails++; console.log('FAIL ' + msg + (info !== undefined ? ' :: ' + JSON.stringify(info) : '')); } };
const norm = s => String(s == null ? '' : s).replace(/[‘’]/g, "'").replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const nah = (a, b, eps) => a != null && b != null && Math.abs(a - b) <= eps;

(async () => {
  const server = http.createServer((q, a) => { a.setHeader('Content-Type', 'text/html; charset=utf-8'); a.end(fs.readFileSync(HTML)); }).listen(0);
  const port = server.address().port, BASIS = 'http://127.0.0.1:' + port + '/';
  const browser = await chromium.launch();
  const alleFehler = [];

  async function seite(fall, { w = 1440, h = 900, thema = 'dunkel', reduziert = false, abbrechen = false, posts = null, dialoge = null } = {}) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: thema === 'hell' ? 'light' : 'dark', locale: 'de-CH', timezoneId: 'Europe/Zurich', reducedMotion: reduziert ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    const info = { fehler: [], fremd: [], ctx };
    page.on('pageerror', e => info.fehler.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) info.fehler.push(m.type() + ' ' + m.text()); });
    if (dialoge) page.on('dialog', d => { dialoge.push(d.message()); d.accept(); });
    await page.route('**/*', r => {
      const u = new URL(r.request().url());
      if (u.hostname !== '127.0.0.1') { info.fremd.push(u.href); return r.abort(); }
      if (!u.pathname.startsWith('/api/')) return r.continue();
      if (abbrechen) return r.abort();
      const n = u.pathname.split('/').pop();
      if (r.request().method() === 'POST') { if (posts) posts.push({ pfad: u.pathname, body: r.request().postData() }); return r.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ gestartet: 'x', meldung: 'ok' }) }); }
      r.fulfill({ contentType: 'application/json', body: fs.readFileSync(path.join(FX, fall, n + '.json')) });
    });
    await page.goto(BASIS);
    await page.waitForSelector('#uebersicht .ukarte', { timeout: 8000 });
    await page.waitForTimeout(500);
    page.info = info;
    return page;
  }
  const schliessen = async p => { alleFehler.push(...p.info.fehler.map(f => f)); if (p.info.fremd.length) alleFehler.push('FREMD ' + p.info.fremd.join(',')); await p.info.ctx.close(); };
  const text = (p, sel) => p.$eval(sel, e => e.innerText).then(norm);
  const alle = (p, sel) => p.$$eval(sel, es => es.map(e => e.innerText.replace(/[‘’]/g, "'").replace(/ /g, ' ').replace(/\s+/g, ' ').trim()));
  const links = (p, sel) => p.$$eval(sel, es => es.map(e => parseFloat(e.style.left)));
  const breiten = (p, sel) => p.$$eval(sel, es => es.map(e => parseFloat(e.style.width)));

  // ───────── Fall «voll», Desktop dunkel ─────────
  let p = await seite('voll');
  ok(p.info.fehler.length === 0, 'voll: keine Konsolen-/Seitenfehler', p.info.fehler);
  ok(p.info.fremd.length === 0, 'voll: keine Anfrage ausserhalb von 127.0.0.1', p.info.fremd);
  ok(await p.evaluate(() => document.documentElement.scrollWidth === innerWidth), 'voll 1440: kein seitliches Scrollen');
  ok((await text(p, '#ampelText')) === '4 Punkte brauchen Aufmerksamkeit · 1 Warnung' && (await p.$eval('#ampel', e => e.dataset.stufe)) === 'rot', 'Ampel: 4 rote Punkte und 1 Warnung → «4 Punkte brauchen Aufmerksamkeit · 1 Warnung», Stufe rot');
  const held = await text(p, '#uebersicht .u8');
  ok(held.includes("5'122.95 USDT") && held.includes('live vom Konto') && held.includes('−1.2 % unter dem Höchststand'), 'Held: Kontowert 5\'122.95 USDT (live), −1.2 % unter dem Höchststand', held.slice(0, 160));
  const chips = await alle(p, '#uebersicht .u8 .chip');
  ok(chips.length === 4 && chips[0].includes('Heute') && chips[0].includes('+34.20') && chips[0].includes('+0.7 %') && chips[1].includes('+128.60') && chips[1].includes('+2.6 %')
    && chips[2].includes('+176.40') && chips[2].includes('+3.6 %') && chips[3].includes('+122.95') && chips[3].includes('+2.5 %'), 'Held: Heute +34.20 (+0.7 %), 7 Tage +128.60 (+2.6 %), 30 Tage +176.40 (+3.6 %), Seit Start +122.95 (+2.5 %)', chips);
  ok((await p.$$eval('#uebersicht .u8 .chip.g-plus', e => e.length)) === 4 && (await text(p, '#uebersicht .u8')).includes('▲'), 'Held: Gewinn nie nur Farbe, immer auch ▲ im Text');
  ok(await p.$eval('#u-kurve svg path[fill^="url"]', e => e.getAttribute('d').startsWith('M')) && (await p.$$eval('#u-kurve svg', e => e.length)) === 1, 'Held: Konto-Kurve als Fläche gezeichnet');
  // Engagement: von Hand: Nennwert gesamt 6770.73, Konto 5122.95 → 1.32×; Pilot 6468.77 (126 %), Satellit 301.96 (6 %); Konto-Marke bei 5122.95/6770.73 = 75.66 %
  const ausl = await text(p, '#uebersicht .u4');
  ok(ausl.includes('1.32×') && ausl.includes("6'469 USDT · 126 %") && ausl.includes('302 USDT · 6 %') && ausl.includes('Frei (nicht im Markt) 0 USDT') && ausl.toLowerCase().includes('risiko-stufe 2×') && ausl.toLowerCase().includes('anteil 80 %'), 'Engagement: 1.32×, Pilot 6\'469 USDT · 126 %, Satellit 302 USDT · 6 %, Risiko-Stufe 2×, Anteil 80 %', ausl);
  const aw = await breiten(p, '.ausl-bahn i'), ak = await links(p, '.ausl-konto');
  ok(aw.length === 2 && nah(aw[0], 95.54, 0.05) && nah(aw[1], 4.46, 0.05) && nah(ak[0], 75.66, 0.05), 'Engagement: Balken Pilot 95.54 %, Satellit 4.46 %, Konto-Marke 75.66 %', { aw, ak });
  // Positionskarten
  const pos = await alle(p, '#uebersicht article.upos, #uebersicht article.ukarte.u6');
  ok(pos.length === 2 && pos[0].startsWith('BTC') && pos[1].startsWith('ETH'), 'Positionen: zwei Karten BTC und ETH', pos.map(x => x.slice(0, 20)));
  ok(pos[0].includes('▲ LONG · Hebel 2×') && pos[0].includes('+82.16') && pos[0].includes('+4.2 % auf das Pfand') && pos[0].includes("Stop 72'852") && pos[0].includes('5.0 % bis zum Stop') && pos[0].includes("Einstieg 75'100")
    && pos[0].includes('Kurs seit Einstieg +2.1 %') && pos[0].includes("Jetzt 76'677") && pos[0].includes("Liquidation 41'180") && pos[0].includes('−46.3 % vom Kurs') && pos[0].includes("Nennwert 3'995 USDT") && pos[0].includes('Menge 0.0521 BTC'), 'BTC-Karte: alle Zahlen (Gewinn 82.16, +4.2 % auf das Pfand, Stop 72\'852 = 5.0 % entfernt, Einstieg, Jetzt, Liquidation −46.3 %)', pos[0]);
  ok(pos[1].includes('+42.90') && pos[1].includes('+3.5 % auf das Pfand') && pos[1].includes("Stop 2'121") && pos[1].includes('5.7 % bis zum Stop') && pos[1].includes('Kurs seit Einstieg +1.8 %') && pos[1].includes("Liquidation 1'160") && pos[1].includes('−48.4 % vom Kurs'), 'ETH-Karte: alle Zahlen', pos[1]);
  const lb = await p.$$eval('#uebersicht .u6 .leiter', es => es.map(l => Object.fromEntries([...l.querySelectorAll('.marke')].map(m => [m.className.split(' ')[1], m.classList.contains('aussen') ? 'aussen' : parseFloat(m.style.left)]))));
  ok(nah(lb[0].stop, 12.12, 0.05) && nah(lb[0].einstieg, 56.65, 0.05) && nah(lb[0].jetzt, 87.88, 0.05) && lb[0].liquidation === undefined, 'Kursleiter BTC: Stop 12.12 %, Einstieg 56.65 %, Jetzt 87.88 % der Achse (von Hand), Liquidation ausserhalb', lb[0]);
  ok(nah(lb[1].stop, 12.12, 0.05) && nah(lb[1].einstieg, 64.81, 0.05) && nah(lb[1].jetzt, 87.88, 0.05), 'Kursleiter ETH: Stop 12.12 %, Einstieg 64.81 %, Jetzt 87.88 %', lb[1]);
  ok((await p.$$eval('#uebersicht .u6 .marke.aussen.links', e => e.map(x => x.textContent))).join('|') === '◀ Liq.|◀ Liq.', 'Kursleiter: die weit entfernte Liquidation steht als Pfeil am Rand (zerdrückt die Skala nicht)');
  ok((await p.$$eval('#uebersicht .u6 .leiter[role="img"]', es => es.map(e => e.getAttribute('aria-label')))).every(a => a.startsWith('Kursleiter') && a.includes('Stop') && a.includes('Jetzt')), 'Kursleiter hat eine Textbeschreibung für Screenreader');
  // Satellit
  const sat = await text(p, '#uebersicht .usat');
  ok(sat.includes('AN · 20 % des Kontos') && sat.includes('Entscheidung vom Do 29.10.') && sat.includes('nächste Do 05.11.') && sat.includes('letzter Lauf 03.11. 02:41'), 'Satellit: AN · 20 %, Entscheidung Do 29.10., nächste Do 05.11., letzter Lauf 03.11. 02:41', sat.slice(0, 200));
  const sz = await alle(p, '#uebersicht .sat-zeile');
  ok(sz.length === 3 && sz[0].includes('SOL') && sz[0].includes('+2.11 USDT') && sz[0].includes('10.2 % bis zum Stop') && sz[1].includes('LINK') && sz[1].includes('−3.60 USDT') && sz[1].includes('9.0 % bis zum Stop')
    && sz[2].includes('DOGE') && sz[2].includes('+3.72 USDT') && sz[2].includes('13.7 % bis zum Stop') && sz.every(x => x.includes('seit 30.10.')), 'Satellit: SOL +2.11 (10.2 % bis Stop), LINK −3.60 (9.0 %), DOGE +3.72 (13.7 %), alle seit 30.10.', sz);
  const sm = await p.$$eval('#uebersicht .sat-zeile', es => es.map(z => ({ stop: parseFloat(z.querySelector('.m-stop').style.left), jetzt: parseFloat(z.querySelector('.m-jetzt').style.left) })));
  ok(nah(sm[0].stop, 12.12, 0.05) && nah(sm[0].jetzt, 87.88, 0.05) && nah(sm[1].jetzt, 65.60, 0.05) && nah(sm[2].jetzt, 87.88, 0.05), 'Satellit: Mini-Leiter Stop 12.12 %, Kurs SOL 87.88 %, LINK 65.60 %, DOGE 87.88 %', sm);
  ok((await alle(p, '#uebersicht .usat .tag:not(.aus)')).join(',') === 'SOL,LINK,DOGE,ADA' && (await alle(p, '#uebersicht .usat .tag.aus')).join('|') === '✕ ADA · 01.11.', 'Satellit: Ziele SOL, LINK, DOGE, ADA; ausgestoppt ADA seit 01.11.');
  // Zeitstrahl
  const zs = await p.$$eval('#uebersicht .zs > li', es => es.map(l => ({ k: l.className, t: l.innerText.replace(/\s+/g, ' ').trim() })));
  ok(zs.filter(x => x.k.startsWith('z-')).map(x => x.k).join(',') === 'z-fehler,z-kauf,z-kauf,z-kauf,z-verkleinern,z-hinweis', 'Zeitstrahl: Fehler, 3 Käufe, Verkleinert, Hinweis (6 Einträge, neueste zuerst)', zs.map(x => x.k));
  ok(zs[1].t.includes('Fehler 0.7 SOL 18:04') && zs[1].t.includes('Binance-Code -2019 Margin is insufficient'), 'Zeitstrahl: der Fehlergrund der Börse steht im Eintrag', zs[1].t);
  ok((await alle(p, '#uebersicht .zs-tag')).join('|').toLowerCase() === 'di 03.11.|mo 02.11.|so 01.11.|fr 30.10.', 'Zeitstrahl: Tagesüberschriften mit Wochentag');
  ok((await text(p, '#uebersicht .u5 .u-kopf')).includes('Zeiten in UTC'), 'Zeitstrahl: Zeiten sind als UTC gekennzeichnet');
  // Märkte und Lage
  const mk = await text(p, '#uebersicht .maerkte-paar');
  ok(mk.includes("BTC ▲ LONG 2.00× 76'677 USD") && mk.includes("ETH ▲ LONG 2.00× 2'249 USD") && mk.includes('Kurs (90 Tage bis 02.11.)') && mk.includes("150-Tage-Schnitt") && mk.includes("Stop 72'852") && mk.includes('200-Tage-Schnitt') && mk.includes("Stop 2'121")
    && mk.includes("über dem 150-Tage-Schnitt (70'488)") && mk.includes("über dem 200-Tage-Schnitt (2'157)") && mk.includes('Lügendetektor') && mk.includes('22 % der Zufallskopien'), 'Märkte: Kurse, Legenden, Schnitt, Stop, Lügendetektor-Warnung', mk.slice(0, 300));
  ok((await p.$$eval('#uebersicht .spark path', e => e.length)) >= 4, 'Märkte: Kurs-, Schnitt-Linie je Markt gezeichnet');
  const lage = await text(p, '#uebersicht .u5:last-child');
  ok(lage.includes('37') && lage.includes('aktuell: Angst') && lage.includes('Funding BTC 0.0100 %') && lage.includes('Funding ETH 0.0080 %') && lage.includes('MVRV BTC 1.42') && lage.includes('MVRV ETH 1.02') && lage.includes('VIX 21.1') && lage.includes('US-Zins 10 J. 4.94 %'), 'Lage: Angst & Gier 37 (Angst), Funding 0.0100 / 0.0080 %, MVRV 1.42 / 1.02, VIX 21.1, Zins 4.94 %', lage);
  ok((await p.$eval('#uebersicht .gauge g', e => e.getAttribute('transform'))) === 'rotate(-23.4 100 100)', 'Lage: Zeiger bei 37 = −23.4°');
  // Details bleiben
  ok((await p.$$eval('#gesund li', e => e.length)) === 13 && (await p.$$eval('.knoepfe button', e => e.length)) === 11 && (await p.$$eval('#stufen button', e => e.length)) === 4 && (await p.$$eval('#notaus', e => e.length)) === 1 && (await text(p, '.details-titel')).toLowerCase() === 'details', 'Details: Gesundheitsliste (13), 11 Knöpfe, 4 Risiko-Stufen, Not-Aus, Überschrift «Details» bleiben');
  ok(await p.evaluate(() => document.querySelector('.details-titel').getBoundingClientRect().top > document.querySelector('#uebersicht').getBoundingClientRect().bottom - 2), 'Details stehen UNTER der Übersicht');
  // Tooltip der Konto-Kurve
  const kv = await p.$('#u-kurve svg'), kb = await kv.boundingBox();
  await p.mouse.move(kb.x + kb.width * 0.5, kb.y + kb.height * 0.5);
  await p.waitForTimeout(150);
  const tip = await p.$eval('#u-kurve .tip', e => ({ d: getComputedStyle(e).display, t: e.innerText.replace(/\s+/g, ' ') }));
  ok(tip.d === 'block' && /\d{4}-\d{2}-\d{2}/.test(tip.t) && tip.t.includes('USDT'), 'Konto-Kurve: Fahrstrahl und Tooltip mit Datum und Wert', tip);
  // Ampel: Klick, Tastatur, Escape
  ok((await p.$eval('#ampelListe', e => e.hidden)) === true && (await p.$eval('#ampel', e => e.getAttribute('aria-expanded'))) === 'false', 'Ampel: Liste ist zu Beginn zu');
  await p.click('#ampel');
  const chipsA = await alle(p, '#ampelListe .achip');
  ok((await p.$eval('#ampelListe', e => !e.hidden)) && chipsA.length === 13 && (await p.$eval('#ampel', e => e.getAttribute('aria-expanded'))) === 'true', 'Ampel: Klick öffnet die Liste mit 13 Punkten, aria-expanded=true', chipsA.length);
  const klassen = await p.$$eval('#ampelListe .achip', es => es.map(e => e.className.replace('achip ', '')));
  ok(klassen.join(',') === 'rot,rot,rot,rot,gelb,grau,grau,gut,gut,gut,gut,gut,gut', 'Ampel-Liste: erst die 4 roten, dann die Warnung, dann Info, dann in Ordnung', klassen);
  ok(chipsA[0].startsWith('✕ Claude (KI-Trader)') && chipsA[0].includes('AuthenticationError: 401'), 'Ampel-Liste: erster Punkt nennt Name und Grund', chipsA[0]);
  await p.keyboard.press('Escape');
  ok((await p.$eval('#ampelListe', e => e.hidden)) && (await p.evaluate(() => document.activeElement.id)) === 'ampel', 'Ampel: Escape schliesst und gibt den Fokus zurück');
  await p.focus('#ampel'); await p.keyboard.press('Enter');
  ok(await p.$eval('#ampelListe', e => !e.hidden), 'Ampel: per Tastatur (Enter) zu öffnen');
  await p.keyboard.press('Space');
  ok(await p.$eval('#ampelListe', e => e.hidden), 'Ampel: per Tastatur (Leertaste) wieder zu');
  // Thema
  ok((await p.$eval('#thema', e => e.getAttribute('aria-pressed'))) === 'true' && await p.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(17, 17, 16)', 'Thema: dunkel nach Systemeinstellung, Knopf meldet «gedrückt»');
  await p.click('#thema');
  ok((await p.evaluate(() => document.documentElement.dataset.theme)) === 'light' && (await p.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(244, 244, 242)' && (await p.evaluate(() => localStorage.getItem('cockpit-thema'))) === 'hell', 'Thema: Umschalten auf hell wirkt sofort und wird gemerkt');
  await p.reload(); await p.waitForSelector('#uebersicht .u-gross');
  ok((await p.evaluate(() => document.documentElement.dataset.theme)) === 'light', 'Thema: nach dem Neuladen bleibt hell');
  await schliessen(p);

  // ───────── Auto-Handel-Schalter im Kopf spiegelt den unteren und löst dieselbe Aktion aus ─────────
  const posts = [], dialoge = [];
  p = await seite('voll', { posts, dialoge });
  ok((await text(p, '#autoKText')) === 'Auto-Handel AN' && (await p.$eval('#autoK', e => e.getAttribute('aria-checked'))) === 'true', 'Kopf-Schalter: zeigt Auto-Handel AN');
  await p.click('#autoK');
  await p.waitForTimeout(600);
  ok(dialoge.length === 1 && dialoge[0].includes('Auto-Handel ausschalten') && posts.some(x => x.pfad === '/api/aktion' && JSON.parse(x.body).aktion === 'auto_aus'), 'Kopf-Schalter: fragt nach und sendet dieselbe Aktion wie der Schalter in «Steuerung» (auto_aus)', { dialoge, posts });
  await schliessen(p);

  // ───────── Tastatur: Reihenfolge der Tabulator-Stationen und die Schalter im Kopf ─────────
  {
    const posts2 = [], dialoge2 = [];
    p = await seite('voll', { posts: posts2, dialoge: dialoge2 });
    await p.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
    const stationen = [];
    for (let i = 0; i < 6; i++) { await p.keyboard.press('Tab'); stationen.push(await p.evaluate(() => { const e = document.activeElement; return e.id || e.getAttribute('href') || e.tagName; })); }
    ok(stationen.slice(0, 5).join('|') === '/markt|autoK|notaus|ampel|thema', 'Tastatur: Tab geht Live-Markt → Auto-Handel → Not-Aus → Ampel → Design-Schalter', stationen);
    posts2.length = 0; dialoge2.length = 0;
    await p.focus('#autoK'); await p.keyboard.press('Space'); await p.waitForTimeout(500);
    ok(dialoge2.length >= 1 && dialoge2[0].includes('Auto-Handel ausschalten') && posts2.some(x => x.pfad === '/api/aktion' && JSON.parse(x.body).aktion === 'auto_aus'), 'Tastatur: Leertaste am Auto-Handel-Schalter fragt nach und sendet auto_aus', { dialoge2, posts2 });
    posts2.length = 0; dialoge2.length = 0;
    await p.focus('#autoK'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    ok(dialoge2.length >= 1 && dialoge2[0].includes('Auto-Handel ausschalten') && posts2.some(x => x.pfad === '/api/aktion'), 'Tastatur: Enter am Auto-Handel-Schalter fragt nach und sendet auto_aus', { dialoge2, posts2 });
    ok(await p.$eval('#autoK', e => e.getAttribute('role') === 'switch' && e.hasAttribute('aria-checked')), 'Tastatur: der Auto-Handel-Schalter ist ein «switch» mit Zustand (aria-checked) für Vorlesehilfen');
    posts2.length = 0; dialoge2.length = 0;
    await p.focus('#notaus'); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
    ok(dialoge2.length >= 1 && dialoge2[0].startsWith('Not-Aus: Pilot-Positionen') && posts2.some(x => x.pfad === '/api/notaus' && JSON.parse(x.body).an === true), 'Tastatur: Enter am Not-Aus fragt zuerst nach (Bestätigung) und sendet erst dann an /api/notaus', { dialoge2, posts2 });
    const farbeVor = await p.evaluate(() => document.documentElement.dataset.theme || '');
    await p.focus('#thema'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    ok(await p.evaluate(v => (document.documentElement.dataset.theme || '') !== v, farbeVor) && await p.$eval('#thema', e => e.hasAttribute('aria-pressed')), 'Tastatur: Enter am Design-Schalter wechselt das Design (aria-pressed gesetzt)');
    const ring = await p.evaluate(() => { document.getElementById('autoK').focus(); return getComputedStyle(document.getElementById('autoK')).outlineStyle; });
    ok(ring !== undefined, 'Tastatur: Fokus ist am Schalter');
    await schliessen(p);
  }

  // ───────── Weitere Fälle ─────────
  p = await seite('leer');
  const leerPos = await text(p, '#uebersicht .u12'), leerAus = await text(p, '#uebersicht .u4'), leerSat = await text(p, '#uebersicht .usat');
  ok(leerPos.includes('Keine offene Position des Piloten') && leerPos.includes('BTC FLACH') && leerPos.includes('ETH FLACH'), 'leer: «Keine offene Position des Piloten», Entscheid FLACH', leerPos);
  ok(leerAus.includes('0.00×') && leerAus.includes("Frei (nicht im Markt) 5'000 USDT"), 'leer: Engagement 0.00×, frei 5\'000 USDT', leerAus);
  ok(leerSat.includes('Noch keine Entscheidung') && leerSat.includes('noch nicht entschieden') && leerSat.includes('Keine Satelliten-Position') && !leerSat.includes('Bitcoin-Filter zu oder'), 'leer: Satellit ehrlich «noch nicht entschieden» (behauptet keinen Filter)', leerSat.slice(0, 200));
  ok((await text(p, '#uebersicht .u5')).includes('Noch keine Aufträge.') && (await text(p, '#ampelText')) === 'alles in Ordnung' && (await p.$eval('#ampel', e => e.dataset.stufe)) === 'gruen', 'leer: «Noch keine Aufträge», Ampel grün «alles in Ordnung»');
  ok(p.info.fehler.length === 0, 'leer: keine Konsolenfehler', p.info.fehler);
  await schliessen(p);

  p = await seite('echtgeld');
  ok((await p.$eval('.band', e => e.classList.contains('echtgeld'))) && (await text(p, '#modus')).includes('ECHTGELD') && (await text(p, '#uebersicht .u8 .u-label')).includes('ECHTGELD'), 'Echtgeld: roter Rand am Kopfband, Pille «ECHTGELD», Held-Beschriftung «ECHTGELD»');
  ok((await text(p, '#uebersicht .usat')).includes('nur Testnetz — mit Echtgeld aus'), 'Echtgeld: der Satellit sagt «nur Testnetz — mit Echtgeld aus»');
  await schliessen(p);

  p = await seite('daten_fehlen');
  const df = await text(p, '#uebersicht');
  ok(df.includes('kein Kontostand') && df.includes('Profit nicht lesbar: URLError') && df.includes('nicht verfügbar') && df.includes('Noch kein Pilot-Lauf') && df.includes('Noch zu wenig Kontostände für eine Kurve') && df.includes('noch offen'), 'Daten fehlen: ehrliche Hinweise statt Nullen («kein Kontostand», «Profit nicht lesbar», «nicht verfügbar», «Noch kein Pilot-Lauf»)', df.slice(0, 300));
  ok(p.info.fehler.length === 0, 'Daten fehlen: keine Konsolenfehler', p.info.fehler);
  await schliessen(p);

  p = await seite('xss');
  await p.click('#ampel'); await p.waitForTimeout(100);
  await p.click('.ampel-rest summary'); await p.waitForTimeout(100);
  ok((await p.evaluate(() => window.__xss)) === undefined, 'Schadtext: kein Skript ausgeführt (window.__xss bleibt leer)');
  ok((await p.$$eval('#uebersicht img, #ampelListe img, .band img', e => e.length)) === 0, 'Schadtext: kein eingeschleustes <img> in Übersicht, Ampel-Liste, Kopf');
  ok((await text(p, '#ampelListe')).includes('<img src=x onerror=window.__xss=1>') && (await text(p, '#uebersicht .zs')).includes('Grund <img src=x onerror=window.__xss=1>'), 'Schadtext: erscheint als sichtbarer Text, nicht als Markup');
  await schliessen(p);

  p = await seite('voll', { abbrechen: true }).catch(() => null);
  if (!p) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), q = await ctx.newPage();
    await q.route('**/*', r => new URL(r.request().url()).pathname.startsWith('/api/') ? r.abort() : r.continue());
    await q.goto(BASIS); await q.waitForTimeout(900);
    ok((await text(q, '#uebersicht')).includes('Cockpit-Server nicht erreichbar') && (await text(q, '#zeit')).includes('nicht erreichbar'), 'Server weg: «Cockpit-Server nicht erreichbar» in Übersicht und Kopf, kein Absturz');
    await ctx.close();
  }

  // ───────── Grössen, Tippflächen, Kontrast, reduzierte Bewegung ─────────
  const kontrast = () => {
    const rgbaVon = s => {
      let m = s.match(/rgba?\(([^)]+)\)/);
      if (m) { const t = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: t[0], g: t[1], b: t[2], a: t.length > 3 ? t[3] : 1 }; }
      m = s.match(/color\(srgb ([^)]+)\)/);
      if (m) { const t = m[1].split(/[ \/]+/).filter(Boolean).map(Number); return { r: t[0] * 255, g: t[1] * 255, b: t[2] * 255, a: t.length > 3 ? t[3] : 1 }; }
      return { r: 0, g: 0, b: 0, a: 0 };
    };
    const misch = (v, h) => ({ r: v.r * v.a + h.r * (1 - v.a), g: v.g * v.a + h.g * (1 - v.a), b: v.b * v.a + h.b * (1 - v.a), a: 1 });
    const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const grund = el => {
      const ebenen = [];
      for (let e = el; e; e = e.parentElement) { const c = rgbaVon(getComputedStyle(e).backgroundColor); if (c.a > 0) ebenen.push(c); if (c.a >= 1) break; }
      let h = { r: 255, g: 255, b: 255, a: 1 };
      if (!ebenen.length || ebenen[ebenen.length - 1].a < 1) h = rgbaVon(getComputedStyle(document.body).backgroundColor);
      for (let i = ebenen.length - 1; i >= 0; i--) h = misch(ebenen[i], h);
      return h;
    };
    const schlecht = [];
    const bereiche = [...document.querySelectorAll('.band, .status-zeile, #uebersicht, #ampelListe:not([hidden])')];
    const gesehen = new Set();
    bereiche.forEach(b => b.querySelectorAll('*').forEach(el => {
      if (gesehen.has(el) || el.closest('.nur-leser') || el.closest('defs')) return;
      const eigen = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      if (!eigen) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      gesehen.add(el);
      const cs = getComputedStyle(el);
      const svgText = el instanceof SVGElement;
      const fg = rgbaVon(svgText ? cs.fill : cs.color);
      const bg = grund(svgText ? el.closest('svg').parentElement : el);
      const fgm = misch(fg, bg);
      const a = lum(fgm), b2 = lum(bg), v = (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05);
      const px = parseFloat(cs.fontSize), fett = parseInt(cs.fontWeight, 10) >= 700;
      const gross = px >= 24 || (px >= 18.66 && fett);
      if (v < (gross ? 3 : 4.5)) schlecht.push({ t: eigen.slice(0, 40), v: +v.toFixed(2), px, kl: el.className && el.className.baseVal === undefined ? el.className : '' });
    }));
    return schlecht;
  };
  for (const thema of ['dunkel', 'hell']) {
    for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
      p = await seite('voll', { w, h, thema });
      ok(await p.evaluate(() => document.documentElement.scrollWidth === innerWidth), `Breite ${w} ${thema}: kein seitliches Scrollen`, await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
      await p.click('#ampel'); await p.waitForTimeout(80);
      const schlecht = await p.evaluate(kontrast);
      ok(schlecht.length === 0, `Breite ${w} ${thema}: jeder sichtbare Text hat Kontrast ≥ 4,5:1 (gross ≥ 3:1)`, schlecht.slice(0, 8));
      ok(p.info.fehler.length === 0, `Breite ${w} ${thema}: keine Konsolenfehler`, p.info.fehler);
      await schliessen(p);
    }
  }
  p = await seite('voll', { reduziert: true });
  ok((await p.$eval('.schalter-klein .bahn', e => getComputedStyle(e).transitionDuration)) === '0s' && (await p.$eval('.ampel::after', e => 0).catch(() => 0)) === 0, 'Reduzierte Bewegung: der Schalter blendet nicht mehr weich über (transition 0s)');
  await schliessen(p);

  // ───────── Kontrast und Tippflächen auch in den Sonderfällen (Echtgeld trägt die wichtigste Beschriftung) ─────────
  const tippflaechen = () => [...document.querySelectorAll('.band button, .band a[href], .status-zeile button, #uebersicht button, #uebersicht a[href], #uebersicht summary, #ampelListe summary')]
    .filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); })
    .map(e => { const r = e.getBoundingClientRect(); return { n: (e.id || String(e.className) || e.tagName).slice(0, 24), b: Math.round(r.width), h: Math.round(r.height) }; }).filter(z => Math.min(z.b, z.h) < 44);
  for (const fall of ['voll', 'leer', 'echtgeld', 'daten_fehlen']) for (const thema of ['dunkel', 'hell']) for (const [w, h] of [[1440, 900], [768, 1024]]) {
    p = await seite(fall, { w, h, thema });
    await p.click('#ampel'); await p.waitForTimeout(80);
    const kn = await p.evaluate(kontrast), tf = await p.evaluate(tippflaechen);
    ok(kn.length === 0, `${fall} ${w} ${thema}: Kontrast ≥ 4,5:1 (gross ≥ 3:1) auch im Sonderfall`, kn.slice(0, 5));
    ok(tf.length === 0, `${fall} ${w} ${thema}: jede Tippfläche mindestens 44 px (kleinste Seite)`, tf);
    await schliessen(p);
  }

  await browser.close(); server.close();
  console.log(`\n${passes} bestanden, ${fails} fehlgeschlagen`);
  if (alleFehler.length) console.log('Konsole/Fremd gesamt:', alleFehler.slice(0, 5));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ABSTURZ', e); process.exit(2); });
