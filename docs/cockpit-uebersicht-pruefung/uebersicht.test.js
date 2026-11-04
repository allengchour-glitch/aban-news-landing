// Prüfung der Cockpit-Übersicht (cockpit.html) mit echtem Chromium. Erwartungen sind VON HAND aus den Fixtures (fixtures.py) gerechnet, nicht aus dem Code übernommen.
//   python3 fixtures.py && node uebersicht.test.js          (COCKPIT_HTML=<Datei> prüft eine andere Fassung, z. B. für die Mutationsprobe)
let playwright; try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const KB = path.resolve(__dirname, '../../tools/trading/krypto_bot');
const HTML = process.env.COCKPIT_HTML || path.join(KB, 'cockpit.html');
// Die Seite im Lesemodus kommt aus dem ECHTEN Server-Code (fernsicht.seite_lesend), nicht aus einer Nachbildung im Test
const HTML_LESEN = require('child_process').execFileSync('python3', ['-I', '-c', 'import sys; sys.path.insert(0, sys.argv[1]); import fernsicht as F; sys.stdout.buffer.write(F.seite_lesend(open(sys.argv[2], "rb").read()))', KB, HTML], { maxBuffer: 64 * 1024 * 1024 });
const FX = path.join(__dirname, 'fx');
let fails = 0, passes = 0;
const ok = (c, msg, info) => { if (c) passes++; else { fails++; console.log('FAIL ' + msg + (info !== undefined ? ' :: ' + JSON.stringify(info) : '')); } };
const norm = s => String(s == null ? '' : s).replace(/[‘’]/g, "'").replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const nah = (a, b, eps) => a != null && b != null && Math.abs(a - b) <= eps;

(async () => {
  const server = http.createServer((q, a) => { a.setHeader('Content-Type', 'text/html; charset=utf-8'); a.end(q.url.startsWith('/lesen') ? HTML_LESEN : fs.readFileSync(HTML)); }).listen(0);
  const port = server.address().port, BASIS = 'http://127.0.0.1:' + port + '/';
  const browser = await chromium.launch();
  const alleFehler = [];

  async function seite(fall, { w = 1440, h = 900, thema = 'dunkel', reduziert = false, abbrechen = false, posts = null, dialoge = null, lesen = false, ablehnen = false } = {}) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: thema === 'hell' ? 'light' : 'dark', locale: 'de-CH', timezoneId: 'Europe/Zurich', reducedMotion: reduziert ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    const info = { fehler: [], fremd: [], api: [], ctx };
    page.on('pageerror', e => info.fehler.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) info.fehler.push(m.type() + ' ' + m.text()); });
    if (dialoge) page.on('dialog', d => { dialoge.push(d.message()); if (ablehnen) d.dismiss(); else d.accept(); });
    await page.route('**/*', r => {
      const u = new URL(r.request().url());
      if (u.hostname !== '127.0.0.1') { info.fremd.push(u.href); return r.abort(); }
      if (!u.pathname.startsWith('/api/')) return r.continue();
      info.api.push(r.request().method() + ' ' + u.pathname);
      if (abbrechen) return r.abort();
      const n = u.pathname.split('/').pop();
      if (r.request().method() === 'POST') { if (posts) posts.push({ pfad: u.pathname, body: r.request().postData() }); return r.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ gestartet: 'x', meldung: 'ok' }) }); }
      r.fulfill({ contentType: 'application/json', body: fs.readFileSync(path.join(FX, fall, n + '.json')) });
    });
    await page.goto(lesen ? BASIS + 'lesen' : BASIS);
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
  // Scalping-Labor (Papier): von Hand aus fixtures.py gerechnet. Kosten je Trade im Mittel Σ(kosten × n) / Σ n = 119980 / 17872 = 6.71 bp; geschäftigstes Buch ETH k 2.0 (3966 Handel):
  // Kursbewegung round(−3.0 × 3966 / 10) = −1190, Gebühren und Schlupf round(−6.8 × 3966 / 10) = −2697, bleibt −3887 USDT bei 1000 USDT je Trade
  const lab = await text(p, '#u-labor'), labZeilen = await alle(p, '#u-labor tbody tr');
  ok((await text(p, '#u-labor .sat-status')) === 'durchgefallen' && lab.toLowerCase().includes('scalping-labor') && lab.toLowerCase().includes('papier'), 'Labor: Überschrift mit «Papier» und Urteil «durchgefallen»', lab.slice(0, 120));
  ok(lab.includes('Echte Kurse, alle Kosten, kein Geld im Spiel') && lab.includes('Daten seit 01.10. (34.0 Tage)') && lab.includes('letzter Lauf 04.11. 02:30 UTC'), 'Labor: Datenbeginn 01.10., 34.0 Tage, letzter Lauf 04.11. 02:30 UTC', lab.slice(0, 260));
  ok(labZeilen.length === 8 && labZeilen[0].startsWith('BTC · k 2.0') && labZeilen[0].includes("3'795") && labZeilen[0].includes('32 %') && labZeilen[0].includes('▼ −8.9 bp') && labZeilen[0].endsWith('−9.6 bp'), 'Labor: BTC k 2.0 = 3\'795 Handel, 32 %, ▼ −8.9 bp, Prüfstand −9.6 bp', labZeilen[0]);
  ok(labZeilen[4].startsWith('ETH · k 2.0') && labZeilen[4].includes("3'966") && labZeilen[4].includes('38 %') && labZeilen[4].includes('▼ −9.8 bp') && labZeilen[4].endsWith('−11.3 bp') && labZeilen[7].startsWith('ETH · k 3.5') && labZeilen[7].includes('992') && labZeilen[7].includes('▼ −7.9 bp') && labZeilen[7].endsWith('−7.5 bp'), 'Labor: ETH k 2.0 (3\'966, −9.8 bp, Prüfstand −11.3) und ETH k 3.5 (992, −7.9 bp, Prüfstand −7.5)', [labZeilen[4], labZeilen[7]]);
  ok((await p.$$eval('#u-labor td.g-minus', e => e.length)) === 8 && (await p.$$eval('#u-labor td.g-minus', e => e.every(x => x.innerText.includes('▼')))) === true, 'Labor: Verlust nie nur Farbe, in allen 8 Zeilen auch ▼');
  ok(lab.includes('Kosten je Trade (Gebühren und Schlupf) im Mittel 6.7 bp: sie fressen die Kursbewegung.') && lab.includes("Zum Greifen (ETH k 2.0, 3'966 Trades, 1000 USDT je Trade): Kursbewegung −1'190 USDT, Gebühren und Schlupf −2'697 USDT, bleibt −3'887 USDT."), 'Labor: Kosten im Mittel 6.7 bp und das Beispiel ETH k 2.0: −1\'190 − 2\'697 = −3\'887 USDT', lab.slice(-520));
  ok(lab.includes('Prüfstand vom 13.10.2026') && lab.includes('nie Echtgeld') && lab.includes('Es handelt nichts und braucht keinen Schlüssel'), 'Labor: die Erklärung nennt Prüfstand, «handelt nichts» und «nie Echtgeld»');
  ok(await p.evaluate(() => { const a = document.getElementById('u-auftraege'), l = document.getElementById('u-labor'), m = [...document.querySelectorAll('#uebersicht section')].find(x => x.getAttribute('aria-label') === 'Märkte');
    return !!(a.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(l.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'Labor: die Karte liegt nach den Aufträgen und vor den Märkten (das Raster bleibt paarig)');
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
  const leerLab = await text(p, '#u-labor');
  ok((await text(p, '#u-labor .sat-status')) === 'noch nicht gelaufen' && leerLab.includes('Das Labor ist noch nicht gelaufen') && leerLab.includes('scalping_labor.py --einmal') && (await p.$$eval('#u-labor tbody tr', e => e.length)) === 0 && !leerLab.includes('Zum Greifen'), 'leer: Labor ehrlich «noch nicht gelaufen», ohne Tabelle und ohne Beispielzahlen', leerLab.slice(0, 200));
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
  ok((await text(p, '#u-labor')).includes('nicht verfügbar') && (await text(p, '#u-labor')).includes('Die Anzeige des Scalping-Labors ist in dieser Programmversion nicht vorhanden'), 'Daten fehlen: das Labor sagt «nicht verfügbar»');
  ok(p.info.fehler.length === 0, 'Daten fehlen: keine Konsolenfehler', p.info.fehler);
  await schliessen(p);

  p = await seite('xss');
  await p.click('#ampel'); await p.waitForTimeout(100);
  await p.click('.ampel-rest summary'); await p.waitForTimeout(100);
  ok((await p.evaluate(() => window.__xss)) === undefined, 'Schadtext: kein Skript ausgeführt (window.__xss bleibt leer)');
  ok((await p.$$eval('#uebersicht img, #ampelListe img, .band img', e => e.length)) === 0, 'Schadtext: kein eingeschleustes <img> in Übersicht, Ampel-Liste, Kopf');
  ok((await text(p, '#ampelListe')).includes('<img src=x onerror=window.__xss=1>') && (await text(p, '#uebersicht .zs')).includes('Grund <img src=x onerror=window.__xss=1>'), 'Schadtext: erscheint als sichtbarer Text, nicht als Markup');
  const xl = await text(p, '#u-labor');
  ok(xl.includes('Grund <img src=x onerror=window.__xss=1>') && xl.includes('Labor <img src=x onerror=window.__xss=1>') && xl.includes('BTC<img src=x onerror=window.__xss=1> · k 2.0') && (await p.$$eval('#u-labor img', e => e.length)) === 0 && !xl.includes('onerror=window.__xss=1>UTC'), 'Schadtext: auch im Labor (Grund, Hinweis, Markt) als sichtbarer Text, nie als Markup; die Zeit wird nur als Datum gelesen', xl.slice(0, 200));
  await schliessen(p);

  // ───────── Handy-Ansicht: die Karte am PC (nur über 127.0.0.1) ─────────
  const FSL = 'FAKEkeyFAKEkeyFAKEkeyFAKEkey1234';
  {
    const posts = [], dialoge = [];
    p = await seite('voll', { posts, dialoge });
    await p.waitForSelector('#fern:not([hidden])', { timeout: 4000 });
    ok(p.info.fehler.length === 0, 'Handy-Karte (an): keine Konsolenfehler', p.info.fehler);
    ok((await p.$eval('#fernSchalter', e => e.getAttribute('aria-checked'))) === 'true' && (await text(p, '#fernText')) === 'AN' && (await p.$eval('#fernSchalter', e => e.getAttribute('role'))) === 'switch', 'Handy-Karte (an): Schalter ist ein switch mit aria-checked=true und Text «AN»');
    const felder = await p.$$eval('#fernInhalt input[readonly]', es => es.map(e => e.value));
    ok(felder.length === 2 && felder[0] === 'http://192.168.1.23:8766/?k=' + FSL && felder[1] === 'http://100.101.102.103:8766/?k=' + FSL, 'Handy-Karte: zwei schreibgeschützte Felder mit dem vollen Link (Heimnetz, Tailscale)', felder);
    const ft = await text(p, '#fernInhalt');
    ok(ft.includes('Heimnetz (WLAN/LAN)') && ft.includes('Tailscale (von unterwegs)') && ft.includes('Port am Router ins Internet wird bewusst nicht unterstützt') && ft.includes('/uebersicht'), 'Handy-Karte: Beschriftungen, Tailscale-Hinweis, kein Port ins Internet, Telegram /uebersicht für unterwegs', ft.slice(0, 200));
    // von Hand: 185 s → 3 Min. (3.08 gerundet), 7200 s → 120 Min.; Zeiten in Zürcher Zeit (UTC+1 im November)
    ok(ft.includes('Zuletzt gesehen: 192.168.1.40 vor 3 Min. · 100.101.102.50 vor 120 Min.'), 'Handy-Karte: Geräte «vor 3 Min.» und «vor 120 Min.»', ft);
    const ev = await alle(p, '#fernInhalt .fern-ereignisse li');
    ok(ev.length === 5 && ev[0] === '10:05:11 · fremde Quelle abgewiesen · 203.0.113.9 · ×12' && ev[1] === '10:01:40 · Schreibversuch abgewiesen · 192.168.1.77 · POST' && ev[2] === '09:59:02 · gesperrt (zu viele Fehlversuche) · 192.168.1.77'
      && ev[3] === '09:58:30 · falscher Schlüssel · 192.168.1.77' && ev[4] === '09:40:00 · Gerät angemeldet · 192.168.1.40', 'Handy-Karte: fünf Ereignisse, neueste zuerst, in deutschen Worten', ev);
    ok((await p.$$eval('#fernInhalt .fern-ereignisse li.fern-schlecht', e => e.length)) === 4 && (await p.$eval('#fernInhalt .fern-ereignisse li:last-child', e => !e.classList.contains('fern-schlecht'))), 'Handy-Karte: Abgewiesenes ist rot hervorgehoben (4 von 5), «Gerät angemeldet» nicht');
    ok((await p.$$eval('#fernInhalt button', e => e.map(b => b.textContent.trim()))).join('|') === 'Link kopieren|Link kopieren|Schlüssel erneuern', 'Handy-Karte: Knöpfe «Link kopieren» ×2 und «Schlüssel erneuern»');
    await p.click('#fernInhalt button[data-kopie="0"]'); await p.waitForTimeout(150);
    ok(['Kopiert ✓', 'Markiert: Strg+C'].includes(await text(p, '#fernInhalt button[data-kopie="0"]')) && (await p.$eval('#fernUrl0', e => e.selectionStart === 0 && e.selectionEnd === e.value.length)), 'Handy-Karte: «Link kopieren» markiert den Link und meldet «Kopiert ✓» (oder bittet um Strg+C)');
    // Klicks: Ausschalten (ohne Rückfrage), Schlüssel erneuern (mit Rückfrage)
    await p.click('#fernSchalter'); await p.waitForTimeout(250);
    ok(posts.length === 1 && posts[0].pfad === '/api/fern' && JSON.parse(posts[0].body).an === false && JSON.parse(posts[0].body).erneuern === false && dialoge.length === 0, 'Handy-Karte: Ausschalten sendet {an:false} ohne Rückfrage', { posts, dialoge });
    await p.click('#fernNeu'); await p.waitForTimeout(250);
    ok(posts.length === 2 && JSON.parse(posts[1].body).an === true && JSON.parse(posts[1].body).erneuern === true && dialoge.length === 1 && dialoge[0].includes('Neuen Schlüssel erzeugen?') && dialoge[0].includes('ungültig'), 'Handy-Karte: «Schlüssel erneuern» fragt nach und sendet {an:true, erneuern:true}', { posts, dialoge });
    ok((await p.$$eval('#fern', e => e.length)) === 1 && (await p.evaluate(() => document.documentElement.scrollWidth === innerWidth)), 'Handy-Karte: kein seitliches Scrollen (Desktop)');
    await schliessen(p);
  }
  {
    const posts = [], dialoge = [];
    p = await seite('voll', { posts, dialoge, ablehnen: true });
    await p.waitForSelector('#fern:not([hidden])', { timeout: 4000 });
    await p.click('#fernNeu'); await p.waitForTimeout(250);
    ok(posts.length === 0 && dialoge.length === 1, 'Handy-Karte: sagt man bei «Schlüssel erneuern» Nein, wird nichts gesendet', { posts, dialoge });
    await schliessen(p);
  }
  {
    const posts = [], dialoge = [];
    p = await seite('leer', { posts, dialoge });
    await p.waitForSelector('#fern:not([hidden])', { timeout: 4000 });
    const lt = await text(p, '#fernInhalt');
    ok((await p.$eval('#fernSchalter', e => e.getAttribute('aria-checked'))) === 'false' && (await text(p, '#fernText')) === 'AUS' && lt.startsWith('Aus. Eingeschaltet zeigt dein Handy dieselbe Übersicht, nur lesen') && lt.includes('«Privat» ankreuzen'), 'Handy-Karte (aus): Schalter AUS, erklärender Text mit «Privat ankreuzen»', lt);
    ok((await p.$$eval('#fernInhalt input, #fernNeu', e => e.length)) === 0, 'Handy-Karte (aus): keine Links und kein «Schlüssel erneuern»');
    await p.click('#fernSchalter'); await p.waitForTimeout(250);
    ok(dialoge.length === 1 && dialoge[0].startsWith('Handy-Ansicht einschalten?') && dialoge[0].includes('nicht aus dem Internet') && posts.length === 1 && JSON.parse(posts[0].body).an === true && JSON.parse(posts[0].body).erneuern === false, 'Handy-Karte: Einschalten fragt nach (nur lesen, Schlüssel, nicht aus dem Internet) und sendet {an:true}', { dialoge, posts });
    await schliessen(p);
    const d2 = [], po2 = [];
    p = await seite('leer', { posts: po2, dialoge: d2, ablehnen: true });
    await p.waitForSelector('#fern:not([hidden])', { timeout: 4000 });
    await p.click('#fernSchalter'); await p.waitForTimeout(250);
    ok(d2.length === 1 && po2.length === 0, 'Handy-Karte: Nein beim Einschalten → nichts gesendet, Ansicht bleibt aus', { d2, po2 });
    await schliessen(p);
  }
  p = await seite('daten_fehlen');
  ok(await p.$eval('#fern', e => e.hidden), 'Handy-Karte: ohne das Modul (verfuegbar=false) ist die Karte nicht da');
  await schliessen(p);
  p = await seite('echtgeld');
  await p.waitForSelector('#fern:not([hidden])', { timeout: 4000 });
  ok(p.info.api.filter(a => a === 'GET /api/fern').length >= 1, 'Handy-Karte: die Seite fragt /api/fern (nur am PC)');
  await schliessen(p);
  p = await seite('xss');
  await p.waitForSelector('#fern:not([hidden])', { timeout: 4000 });
  const xf = await text(p, '#fern');
  ok((await p.evaluate(() => window.__xss)) === undefined && (await p.$$eval('#fern img', e => e.length)) === 0, 'Handy-Karte (Schadtext): kein Skript, kein <img>');
  ok(xf.includes('Heimnetz<img src=x onerror=window.__xss=1>') && xf.includes('böse-art<img') && xf.includes('Q<img') && xf.includes('Port belegt<img') && xf.includes('192.168.1.40<img'), 'Handy-Karte (Schadtext): Art, Quelle, Info, Fehler und Gerät erscheinen als Text', xf.slice(0, 300));
  ok((await p.$eval('#fernUrl0', e => e.value)).includes('?k="<img src=x onerror=window.__xss=1>') && (await p.$$eval('#fernInhalt input', e => e.length)) === 2, 'Handy-Karte (Schadtext): Anführungszeichen in der Adresse brechen das Feld nicht aus');
  await schliessen(p);

  // ───────── Lesemodus: so bekommt das Handy die Seite ─────────
  {
    const posts = [], dialoge = [];
    p = await seite('voll', { lesen: true, posts, dialoge });
    await p.waitForTimeout(600);
    ok(p.info.fehler.length === 0 && p.info.fremd.length === 0, 'Lesemodus: keine Konsolenfehler, keine fremde Anfrage', { f: p.info.fehler, x: p.info.fremd });
    ok(await p.evaluate(() => document.documentElement.hasAttribute('data-nur-lesen')) && (await p.$eval('head meta[name=robots]', e => e.content)) === 'noindex, nofollow', 'Lesemodus: <html> trägt data-nur-lesen, die Seite ist auf «nicht indexieren» gestellt');
    const sicht = await p.evaluate(() => Object.fromEntries(['#nurLesen', '#notaus', '#autoK', '#fern', '#steuerung .steuerkopf', '#steuerung .risiko', '#steuerung .knoepfe', '#steuerung .konsole', '#g-box', '#uebersicht', '.profit .steuerkopf', '#ampel']
      .map(sel => { const e = document.querySelector(sel); return [sel, e ? e.checkVisibility() : null]; })));
    ok(sicht['#nurLesen'] === true && sicht['#notaus'] === false && sicht['#autoK'] === false && sicht['#fern'] === false && sicht['#steuerung .steuerkopf'] === false && sicht['#steuerung .risiko'] === false
      && sicht['#steuerung .knoepfe'] === false && sicht['#steuerung .konsole'] === false, 'Lesemodus: «nur lesen» sichtbar; Not-Aus, Auto-Schalter, Steuerung, Risiko, Knöpfe, Konsole und Handy-Karte unsichtbar', sicht);
    ok(sicht['#g-box'] === true && sicht['#uebersicht'] === true && sicht['.profit .steuerkopf'] === true && sicht['#ampel'] === true, 'Lesemodus: Gesundheit, Übersicht, Profit-Kopf und Ampel bleiben sichtbar (.steuerkopf kommt auch im Profit vor)', sicht);
    ok((await text(p, '#nurLesen')) === '📱 nur lesen' && (await p.$eval('#nurLesen', e => e.title)).includes('Not-Aus: am PC oder per Telegram /stop'), 'Lesemodus: die Pille «📱 nur lesen» nennt den Weg zum Not-Aus (am PC oder Telegram /stop)');
    ok(p.info.api.length >= 2 && p.info.api.every(a => a.startsWith('GET ')) && !p.info.api.some(a => /protokoll|fern/.test(a)), 'Lesemodus: nur GET, und weder /api/protokoll noch /api/fern werden gefragt', p.info.api);
    // selbst per Skript ausgelöste Klicks (die Knöpfe sind unsichtbar, aber ein Fehler in der Seite darf trotzdem nichts senden)
    await p.evaluate(() => {
      document.querySelector('#notaus').click(); document.querySelector('#autoK').click(); document.querySelector('#auto').click();
      document.querySelectorAll('#steuerung .knoepfe button').forEach(b => b.click()); document.querySelectorAll('#stufen button').forEach(b => b.click()); document.querySelector('#fernSchalter').click();
    });
    await p.waitForTimeout(500);
    ok(posts.length === 0 && p.info.api.every(a => a.startsWith('GET ')) && !p.info.api.some(a => /protokoll|fern|aktion|notaus/.test(a)), 'Lesemodus: selbst per Skript ausgelöste Klicks auf Not-Aus, Knöpfe, Auto-Schalter, Risiko-Stufen und Handy-Schalter senden NICHTS', { posts, api: p.info.api });
    ok(dialoge.length === 0, 'Lesemodus: auch kein Bestätigungsfenster erscheint', dialoge);
    ok((await text(p, '#uebersicht .u8')).includes("5'122.95 USDT") && (await p.$$eval('#uebersicht .ukarte', e => e.length)) >= 8, 'Lesemodus: die Übersicht ist vollständig (Held mit 5\'122.95 USDT, mindestens 8 Karten)');
    ok(await p.evaluate(() => document.documentElement.scrollWidth === innerWidth), 'Lesemodus 1440: kein seitliches Scrollen');
    await schliessen(p);
    for (const [w, h] of [[390, 844], [360, 640]]) {
      p = await seite('voll', { lesen: true, w, h });
      ok(await p.evaluate(() => document.documentElement.scrollWidth === innerWidth) && (await p.$eval('#nurLesen', e => e.checkVisibility())), `Lesemodus ${w}: kein seitliches Scrollen, die Pille «nur lesen» ist sichtbar`);
      await schliessen(p);
    }
  }

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

  // Millionen Handel im Labor: nichts darf überlaufen (Desktop und schmal)
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    p = await seite('gross', { w, h });
    const gl = await text(p, '#u-labor');
    ok(gl.includes("12'345'678") && gl.includes('−1’234’567.8') === false && (await p.evaluate(() => document.documentElement.scrollWidth === innerWidth)) && (await p.$eval('#u-labor', e => e.scrollWidth <= e.clientWidth + 1)), `gross ${w}: Labor mit 12'345'678 Handeln — kein seitliches Scrollen, nichts ragt aus der Karte`, gl.slice(0, 160));
    await schliessen(p);
  }

  await browser.close(); server.close();
  console.log(`\n${passes} bestanden, ${fails} fehlgeschlagen`);
  if (alleFehler.length) console.log('Konsole/Fremd gesamt:', alleFehler.slice(0, 5));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ABSTURZ', e); process.exit(2); });
