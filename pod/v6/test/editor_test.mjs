/**
 * Browser-Tests (Playwright, Chromium) für den Editor v6 gegen die lokale Mock-Seite test/mock.html mit Karten aus echten Printful-Katalogdaten:
 * T-Shirt 71 (mehrere Platzierungen), Tasse 19, Poster 268, Dad-Cap 206 (Stickerei), Allover-Hoodie 388 (Schnittteile).
 * Netz: nur der lokale Server; Cloudinary, Printful-CDN und Sticker sind Attrappen (lib.mjs). Die Attrappe von Cloudinary liest die hochgeladenen
 * PNG-Dateien, damit die Pixelgrösse der Druckdatei am IHDR gemessen werden kann.
 * Aufruf: node editor_test.mjs [Teil]   (Teil: Name oder Anfang eines Szenarios; ohne Angabe alle; «kern» = die schnellen für die Mutationsprobe)
 * Umgebung: V6_BILDCACHE (Ordner mit Vorlagenbildern, optional), V6_DATEI (andere Fassung des Editors: Rücknahme 6.2.0 oder 6.1.0, vom CDN ausgelieferte Datei, Mutant; Vorgabe 6.2.1),
 * V6_VERSION (nur nötig, wenn Dateiname und Inhalt die Fassung nicht verraten; bestimmt den erwarteten Schlüssel der Druckdatei: ab 6.2.1 «_Druckdatei (…)», vorher «🖼️ Druckdatei (…)»),
 * V6_PARSER (andere Fassung des Parsers der Bestellstrecke).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { playwright, starteServer, seiteOeffnen, editorBereit, pngErzeugen, pngRauschen, hier, NEUE_SCHLUESSEL, V6_VERSION, druckdateiSchluessel, druckdateiZeilen, sichtbareZeilen, dateienAusEigenschaften, parserPruefe, parserBericht } from './lib.mjs';

const { chromium } = playwright();
let n = 0; const fehler = [];
function pruefe(name, ok, detail = '') { n++; if (!ok) { fehler.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`); if (process.env.V6_ABBRUCH) process.exit(1); } }   // V6_ABBRUCH=1 (nur Mutationsprobe): beim ersten Fehler beenden, das genügt zum Erkennen
function nahe(name, ist, soll, eps) { pruefe(name, Math.abs(ist - soll) <= eps, `ist=${ist} soll=${soll} (±${eps})`); }
const lies = (id) => JSON.parse(readFileSync(join(hier, 'testdaten', `${id}.karte.json`), 'utf8'));
const nur = process.argv[2] || '';

const szenarien = [];
function szenario(name, kern, fn) { szenarien.push({ name, kern, fn }); }

const SHOP71 = 'shop=1001:4012,1002:4013,1003:4014';
const PC = { breite: 1440, hoehe: 900 };
const MOBIL = { breite: 390, hoehe: 844, mobil: true };

// ── Hilfen ──────────────────────────────────────────────────────────────────────────────────────
const tab = (page, name) => page.locator('.lsp6-tab', { hasText: name });
const feldEingabe = (page, name) => page.locator('.lsp6-field', { hasText: name }).locator('input');
const status = (page) => page.locator('[data-feld="status"]');
async function textHinzufuegen(page, text) {
  await page.getByRole('button', { name: '➕ Text' }).click();
  await page.locator('.lsp6-text').fill(text);
}
async function ctaKlicken(s) {
  await Promise.all([s.page.waitForURL('**/cart', { timeout: 20000 }), s.page.locator('.lsp6-cta').click()]);
}
async function rect(page, selector) { return page.locator(selector).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }); }
/** PNG in einer leeren Seite lesen: Grösse, Anzahl nicht durchsichtiger Pixel, Umriss. */
async function pngInfo(browser, buf) {
  const p = await browser.newPage();
  try {
    return await p.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1, cnt = 0;
      for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 10) { cnt++; if (xx < minx) minx = xx; if (xx > maxx) maxx = xx; if (y < miny) miny = y; if (y > maxy) maxy = y; }
      return { w: c.width, h: c.height, cnt, minx, miny, maxx, maxy };
    }, buf.toString('base64'));
  } finally { await p.close(); }
}
async function warteBis(fn, ms = 15000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 50)); }
  return false;
}
function kontrast(c1, c2) {
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const a = lum(c1), b = lum(c2); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// ── 1. T-Shirt am Rechner: Bühne, Druckfläche, Masse ────────────────────────────────────────────
szenario('t-shirt-buehne', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  pruefe('Modus «karte»', (await p.locator('.lsp6').getAttribute('data-modus')) === 'karte');
  const namen = await p.locator('.lsp6-tab').allInnerTexts();
  pruefe('T-Shirt: 8 Reiter (Vorne, Vorne gross, Hinten, 2 Ärmel, 3 Etiketten)', namen.length === 8, namen.join('|'));
  pruefe('Reiter «Rückseite» zeigt CHF 6.10, «Vorderseite» keinen Aufpreis', /6\.10/.test(namen[2]) && !/CHF/.test(namen[0]), namen[0] + ' / ' + namen[2]);
  pruefe('erster Reiter gewählt, übrige nicht', (await p.locator('.lsp6-tab[aria-selected="true"]').count()) === 1 && (await tab(p, 'Vorderseite').first().getAttribute('aria-selected')) === 'true');
  const st = await rect(p, '.lsp6-stage'), fr = await rect(p, '.lsp6-frame');
  nahe('Druckfläche im Seitenverhältnis der Druckdatei 1800:2400 (0,75)', fr.w / fr.h, 0.75, 0.012);
  pruefe('Druckfläche ist nicht quadratisch', Math.abs(fr.w / fr.h - 1) > 0.15);
  pruefe('Druckfläche liegt in der Bühne', fr.x >= st.x - 1 && fr.y >= st.y - 1 && fr.x + fr.w <= st.x + st.w + 1 && fr.y + fr.h <= st.y + st.h + 1);
  const asp = Number(await p.locator('.lsp6-stage').evaluate((e) => getComputedStyle(e).getPropertyValue('--asp')));
  nahe('Bühne hat das Seitenverhältnis des Sichtfensters (--asp)', st.w / st.h, asp, 0.01);
  const meta = await p.locator('[data-feld="meta"]').innerText();
  pruefe('Meta nennt Fläche in cm und Druckdatei in Pixeln mit dpi', /30,5 × 40,6 cm/.test(meta) && /1800 × 2400 px/.test(meta) && /150 dpi/.test(meta), meta);
  pruefe('Vorlagenbild geladen', await p.locator('.lsp6-tpl').evaluate((i) => i.complete && i.naturalWidth > 0 && !i.hidden));
  // Ganze Vorlage ↔ Fläche
  await p.getByRole('button', { name: 'Ganze Vorlage zeigen' }).click();
  const st2 = await rect(p, '.lsp6-stage'), fr2 = await rect(p, '.lsp6-frame');
  nahe('«Ganze Vorlage»: Bühne quadratisch wie die Vorlage 3000×3000', st2.w / st2.h, 1, 0.01);
  nahe('«Ganze Vorlage»: Fläche misst 1010/3000 der Bühnenbreite', fr2.w / st2.w, 1010 / 3000, 0.01);
  nahe('«Ganze Vorlage»: Seitenverhältnis der Fläche bleibt 0,75', fr2.w / fr2.h, 0.75, 0.012);
  await p.getByRole('button', { name: 'Auf Druckfläche zoomen' }).click();
  nahe('zurück auf die Fläche', (await rect(p, '.lsp6-frame')).w / (await rect(p, '.lsp6-stage')).w, fr.w / st.w, 0.01);
  // Variantenfarbe: die Vorlage zeigt die gewählte Farbe, nicht die Beispielfarbe
  pruefe('T-Shirt: Hintergrund der Bühne ist die Farbe der gewählten Variante (nicht die Beispielfarbe der Vorlage)', await p.evaluate(() => { const c = getComputedStyle(document.querySelector('.lsp6-stage')).backgroundColor; return c !== 'rgb(11, 11, 11)' && c !== 'rgba(0, 0, 0, 0)'; }));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 2. Text setzen, Zahlenfelder in cm, Druckdatei in echter Pixelgrösse, Warenkorb ─────────────
szenario('t-shirt-text-warenkorb', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  await textHinzufuegen(p, 'Hallo');
  pruefe('Ebene angelegt', (await p.locator('.lsp6-layer').count()) === 1);
  // Zahlenfelder in cm
  const lx = await feldEingabe(p, 'X (cm)').inputValue(), ly = await feldEingabe(p, 'Y (cm)').inputValue();
  pruefe('X in cm: Mitte der 30,5 cm breiten Fläche = 15.2', lx === '15.2', lx);
  pruefe('Y in cm: 42 % von 40,6 cm = 17.1', ly === '17.1', ly);
  pruefe('Grösse des Textes in mm (Schrifthöhe)', (await p.locator('.lsp6-field', { hasText: 'Schrifthöhe (mm)' }).count()) === 1);
  await feldEingabe(p, 'X (cm)').fill('10'); await feldEingabe(p, 'X (cm)').press('Tab');
  const cx = await p.evaluate(() => window.LSPOD6.editors[0].st.ebenen.front[0].cx);
  nahe('X = 10 cm ergibt cx = 10 / 30,48', cx, 10 / 30.48, 1e-9);
  await feldEingabe(p, 'X (cm)').fill('15.24'); await feldEingabe(p, 'X (cm)').press('Tab');
  // keine Zoll im Bedienfeld
  const oberflaeche = await p.locator('.lsp6').innerText();
  pruefe('Oberfläche zeigt nie Zoll (Zoll, inch, ″, Anführungszeichen hinter Zahlen)', !/Zoll|inch|″|\d\s?"/i.test(oberflaeche));
  pruefe('Oberfläche nennt cm und mm', /cm/.test(oberflaeche) && /mm/.test(oberflaeche));
  // Kasse
  await ctaKlicken(s);
  pruefe('genau ein Upload', s.uploads.length === 1, JSON.stringify(s.uploads));
  const u = s.uploads[0];
  pruefe('Upload ist ein PNG in echter Pixelgrösse 1800 × 2400', u.typ === 'png' && u.breite === 1800 && u.hoehe === 2400, JSON.stringify(u));
  pruefe('Upload mit dem Preset von v5', u.hatPreset);
  pruefe('ein Warenkorb-Aufruf', s.warenkorb.length === 1);
  const w = s.warenkorb[0];
  pruefe('Variante und Menge', w.id === '1001' && w.quantity === 1, JSON.stringify([w.id, w.quantity]));
  const pr = w.properties;
  pruefe(`Eigenschaft «${druckdateiSchluessel('front')}» mit https-Adresse`, /^https:\/\//.test(pr[druckdateiSchluessel('front')] || ''), Object.keys(pr).join('|'));
  pruefe('Eigenschaft «🎨 Design (front)»', pr['\u{1F3A8} Design (front)'] === 'Text: "Hallo"', pr['\u{1F3A8} Design (front)']);
  pruefe('genau drei Eigenschaften (Design, Druckdatei, _pod_karte)', Object.keys(pr).length === 3, Object.keys(pr).join('|'));
  const pod = JSON.parse(pr._pod_karte);
  pruefe('_pod_karte: Modell 71, Version 6 (ohne Schemafeld «s», um Zeichen zu sparen)', pod.m === 71 && pod.v === 6 && !('s' in pod));
  pruefe('_pod_karte: Printful-Variante 4012 und Shopify-Variante «1001»', pod.pv === 4012 && pod.sv === '1001', JSON.stringify(pod));
  pruefe('_pod_karte: Platzierung front mit Dateityp default, Aufpreis 0, «px» nur bei Abweichung vom Printfile (hier keine)', JSON.stringify(pod.pl) === '["front"]' && pod.dt.front === 'default' && !('px' in pod) && pod.ap === 0, pr._pod_karte);
  pruefe('_pod_karte beginnt mit «_» (für Kunden unsichtbar)', Object.keys(pr).some((k) => k === '_pod_karte'));
  // Inhalt der Datei = Inhalt der Bühne
  const info = await pngInfo(b, s.png(u.url) || Buffer.alloc(0));
  pruefe('PNG enthält Pixel (Text gezeichnet)', info.cnt > 2000, JSON.stringify(info));
  const mx = (info.minx + info.maxx) / 2 / 1800, my = (info.miny + info.maxy) / 2 / 2400;
  nahe('Text in der Datei sitzt mittig (x) wie auf der Bühne', mx, 0.5, 0.03);
  nahe('Text in der Datei sitzt bei 42 % (y) wie auf der Bühne', my, 0.42, 0.03);
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 3. Rückseite, Aufpreise, Konflikte, Rückgängig ──────────────────────────────────────────────
szenario('t-shirt-platzierungen-konflikte', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  await tab(p, 'Rückseite').click();
  pruefe('Reiter «Rückseite» ist aktiv', (await tab(p, 'Rückseite').getAttribute('aria-selected')) === 'true');
  pruefe('Aufpreisbox noch leer (nichts gestaltet)', await p.locator('[data-feld="summe"]').isHidden());
  await p.getByRole('button', { name: '⭐ Sticker' }).click();
  await p.locator('.lsp6-emoji').first().click();
  const summe = await p.locator('[data-feld="summe"]').innerText();
  pruefe('Aufpreisbox: Rückseite + CHF 6.10 und gesamt 6.10', /Rückseite: \+ CHF 6\.10/.test(summe) && /gesamt: CHF 6\.10/.test(summe), summe);
  // Konflikt: Etikett aussen ↔ Rückseite
  const lab = tab(p, 'Etikett aussen');
  pruefe('«Etikett aussen» ist gesperrt, solange die Rückseite Ebenen trägt', (await lab.getAttribute('aria-disabled')) === 'true' && /Rückseite/.test((await lab.getAttribute('title')) || ''));
  await lab.click({ force: true });   // Playwright hält aria-disabled für nicht klickbar, ein Mensch kann tippen
  pruefe('Klick auf gesperrten Reiter wechselt nicht und erklärt warum', (await tab(p, 'Rückseite').getAttribute('aria-selected')) === 'true' && /geht nicht zusammen/.test(await p.locator('[data-feld="tabhinweis"]').innerText()), await p.locator('[data-feld="tabhinweis"]').innerText());
  pruefe('Die Erklärung steht direkt unter den Reitern (oberhalb der Bühne)', await p.evaluate(() => document.querySelector('[data-feld="tabhinweis"]').getBoundingClientRect().bottom <= document.querySelector('.lsp6-stage').getBoundingClientRect().top + 1));
  pruefe('«Vorderseite» bleibt frei (kein Konflikt mit Rückseite)', (await tab(p, 'Vorderseite').first().getAttribute('aria-disabled')) === null);
  // Vorderseite gross gegen Vorderseite
  await tab(p, 'Vorderseite gross').click();
  pruefe('Wechsel auf einen freien Reiter räumt die Erklärung weg', await p.locator('[data-feld="tabhinweis"]').isHidden());
  await textHinzufuegen(p, 'Gross');
  pruefe('«Vorderseite» ist gesperrt, solange «Vorderseite gross» Ebenen trägt', (await tab(p, 'Vorderseite').first().getAttribute('aria-disabled')) === 'true');
  pruefe('Punkt-Markierung zeigt, wo Ebenen liegen', (await p.locator('.lsp6-tab .dot').count()) === 2);
  const summe2 = await p.locator('[data-feld="summe"]').innerText();
  pruefe('Aufpreisbox: beide Platzierungen, gesamt 12.20', /gesamt: CHF 12\.20/.test(summe2) && /Vorderseite gross: \+ CHF 6\.10/.test(summe2), summe2);
  // Ebene entfernen gibt den Reiter frei
  await p.locator('.lsp6-chip', { hasText: 'Text: Gross' }).click();
  await p.keyboard.press('Escape');
  await p.locator('.lsp6').focus();
  await p.keyboard.press('Delete');
  pruefe('Ebene gelöscht → «Vorderseite» wieder frei', (await tab(p, 'Vorderseite').first().getAttribute('aria-disabled')) === null);
  // Rückgängig stellt die Ebene und die Sperre wieder her
  await p.getByRole('button', { name: '↶ Rückgängig' }).click();
  pruefe('Rückgängig bringt die Ebene zurück und sperrt «Vorderseite» wieder', (await p.locator('.lsp6-layer').count()) === 1 && (await tab(p, 'Vorderseite').first().getAttribute('aria-disabled')) === 'true');
  await p.getByRole('button', { name: '↷ Wiederholen' }).click();
  pruefe('Wiederholen löscht sie wieder', (await p.locator('.lsp6-layer').count()) === 0 && (await tab(p, 'Vorderseite').first().getAttribute('aria-disabled')) === null);
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 3a. Rückgängig über Platzierungen hinweg: die aktive Platzierung bleibt erlaubt ───────────────
szenario('t-shirt-rueckgaengig-sperre', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  await textHinzufuegen(p, 'A');                         // Vorderseite trägt eine Ebene
  await p.locator('.lsp6').focus();
  await p.keyboard.press('Delete');                      // … und ist wieder leer
  await tab(p, 'Vorderseite gross').click();             // jetzt frei
  await textHinzufuegen(p, 'B');                         // «Vorderseite gross» trägt eine Ebene
  let schritte = 0;
  while (schritte < 12 && (await p.evaluate(() => window.LSPOD6.editors[0].st.ebenen.front.length)) === 0) { await p.getByRole('button', { name: '↶ Rückgängig' }).click(); schritte++; }
  const z = await p.evaluate(() => { const e = window.LSPOD6.editors[0]; return { aktiv: e.st.aktiv, front: e.st.ebenen.front.length, gross: e.st.ebenen.front_large.length }; });
  pruefe('Rückgängig bis zur Ebene auf der Vorderseite: Stand erreicht', z.front === 1 && z.gross === 0, JSON.stringify(z));
  pruefe('die aktive Platzierung ist jetzt die Vorderseite (nicht die gesperrte «Vorderseite gross»)', z.aktiv === 'front' && (await tab(p, 'Vorderseite').first().getAttribute('aria-selected')) === 'true', JSON.stringify(z));
  pruefe('«Vorderseite gross» ist gesperrt und die Bühne zeigt die Ebene der Vorderseite', (await tab(p, 'Vorderseite gross').getAttribute('aria-disabled')) === 'true' && (await p.locator('.lsp6-layer').count()) === 1);
  await s.schliessen();
});

// ── 3b. Zwei Platzierungen in den Warenkorb ─────────────────────────────────────────────────────
szenario('t-shirt-zwei-dateien', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  await tab(p, 'Vorderseite gross').click();
  await textHinzufuegen(p, 'Gross');
  await tab(p, 'Rückseite').click();
  await p.getByRole('button', { name: '⭐ Sticker' }).click();
  await p.locator('.lsp6-emoji').first().click();
  await ctaKlicken(s);
  const dims = s.uploads.map((u) => `${u.breite}x${u.hoehe}`).sort().join(',');
  pruefe('zwei Uploads: 2250×2700 (Vorderseite gross) und 1800×2400 (Rückseite)', s.uploads.length === 2 && dims === '1800x2400,2250x2700', dims);
  const pr = s.warenkorb[0].properties;
  pruefe('Eigenschaften je Platzierung (front_large und back, nicht front)', !!pr[druckdateiSchluessel('front_large')] && !!pr[druckdateiSchluessel('back')] && !pr[druckdateiSchluessel('front')], Object.keys(pr).join('|'));
  pruefe('zwei verschiedene Adressen', pr[druckdateiSchluessel('front_large')] !== pr[druckdateiSchluessel('back')]);
  const pod = JSON.parse(pr._pod_karte);
  pruefe('_pod_karte: Platzierungen, Aufpreis 12.2, kein «dt» (Dateityp = ID), kein «px» (Dateien in Printfile-Grösse)', JSON.stringify(pod.pl) === '["front_large","back"]' && pod.ap === 12.2 && !('dt' in pod) && !('px' in pod), pr._pod_karte);
  pruefe('_pod_karte höchstens 255 Zeichen', pr._pod_karte.length <= 255, String(pr._pod_karte.length));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 3c. Die längste _pod_karte (vier Platzierungen) ─────────────────────────────────────────────
szenario('pod-karte-laenge', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  for (const [name, art] of [['Vorderseite gross', 'text'], ['Rückseite', 'text'], ['Ärmel links', 'text'], ['Ärmel rechts', 'text']]) { await tab(p, name).click(); await textHinzufuegen(p, 'x'); }
  const w = await p.evaluate(() => window.LSPOD6.editors[0].eigenschaften()._pod_karte);
  pruefe('_pod_karte mit vier Platzierungen bleibt unter 255 Zeichen', w.length <= 255, `${w.length}: ${w}`);
  await s.schliessen();
});

// ── 4. Auflösung: Mindest-dpi aus der Karte ─────────────────────────────────────────────────────
szenario('aufloesung', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  const dpi = p.locator('[data-feld="dpi"]');
  pruefe('ohne Foto keine dpi-Anzeige', await dpi.isHidden());
  await p.locator('input[type=file]').setInputFiles({ name: 'klein.png', mimeType: 'image/png', buffer: pngErzeugen(300, 400) });
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front[0] && window.LSPOD6.editors[0].st.ebenen.front[0]._origW === 300);
  await p.waitForFunction(() => !document.querySelector('[data-feld="dpi"]').hidden);
  let t = await dpi.innerText();
  pruefe('300 px breites Foto auf 6 Zoll = ca. 50 dpi: Warnung mit Zahl und Mindestwert 75 aus der Karte', /ca\. 50 dpi/.test(t) && /mindestens 75 dpi/.test(t) && (await dpi.getAttribute('class')).includes('lsp6-warn'), t);
  await p.getByRole('button', { name: 'Klein' }).click();
  t = await dpi.innerText();
  pruefe('«Klein» (0,6): 3,6 Zoll → ca. 83 dpi, über 75: keine Warnung mehr', /ca\. 83 dpi/.test(t) && (await dpi.getAttribute('class')).includes('lsp6-ok'), t);
  await p.getByRole('button', { name: 'Füllend' }).click();
  t = await dpi.innerText();
  pruefe('«Füllend» (2): 12 Zoll → ca. 25 dpi, Warnung', /ca\. 25 dpi/.test(t) && (await dpi.getAttribute('class')).includes('lsp6-warn'), t);
  // Foto mit genug Pixeln
  await p.keyboard.press('Escape');
  await p.locator('.lsp6-chip', { hasText: 'Bild' }).click();
  await p.locator('.lsp6-del').click();
  await p.locator('input[type=file]').setInputFiles({ name: 'gross.png', mimeType: 'image/png', buffer: pngErzeugen(2400, 3200) });
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front[0] && window.LSPOD6.editors[0].st.ebenen.front[0]._origW === 2400);
  await p.waitForFunction(() => !document.querySelector('[data-feld="dpi"]').hidden);
  t = await dpi.innerText();
  pruefe('2400 px auf 6 Zoll: mehr als die Druckdatei trägt, angezeigt wird ihre Dichte ca. 150 dpi: grün', /ca\. 150 dpi/.test(t) && (await dpi.getAttribute('class')).includes('lsp6-ok'), t);
  await s.schliessen();
  // Poster: min_dpi 150 und 300 dpi Druckdatei; ein 1000-px-Foto fällt hier durch, obwohl es nach der v5-Regel (420 px) genügt
  const s2 = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=268' });
  await editorBereit(s2.page);
  await s2.page.locator('input[type=file]').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: pngErzeugen(1000, 700) });
  await s2.page.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.default[0] && window.LSPOD6.editors[0].st.ebenen.default[0]._origW === 1000);
  await s2.page.waitForFunction(() => !document.querySelector('[data-feld="dpi"]').hidden);
  const t2 = await s2.page.locator('[data-feld="dpi"]').innerText();
  pruefe('Poster: 1000-px-Foto auf der A1-Fläche → ca. 60 dpi, nötig 150 (nie gegen 1200 px gemessen)', /ca\. 60 dpi/.test(t2) && /mindestens 150 dpi/.test(t2) && (await s2.page.locator('[data-feld="dpi"]').getAttribute('class')).includes('lsp6-warn'), t2);
  await s2.schliessen();
  // Karte ohne minDpi: Vorgabe 100
  const s3 = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}&ohneMinDpi=1` });
  await editorBereit(s3.page);
  await s3.page.locator('input[type=file]').setInputFiles({ name: 'k.png', mimeType: 'image/png', buffer: pngErzeugen(300, 400) });
  await s3.page.waitForFunction(() => !document.querySelector('[data-feld="dpi"]').hidden);
  await s3.page.getByRole('button', { name: 'Klein' }).click();
  const t3 = await s3.page.locator('[data-feld="dpi"]').innerText();
  pruefe('ohne minDpi in der Karte gilt 100: 83 dpi warnen', /mindestens 100 dpi/.test(t3) && /ca\. 83 dpi/.test(t3), t3);
  await s3.schliessen();
});

// ── 5. Stickerei (Dad-Cap) und Hinweise ─────────────────────────────────────────────────────────
szenario('dad-cap-stickerei', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=206' });
  await editorBereit(s.page);
  const p = s.page;
  const namen = await p.locator('.lsp6-tab').allInnerTexts();
  pruefe('Dad-Cap: 4 Stickerei-Reiter mit Aufpreis CHF 3.00', namen.length === 4 && namen.every((x) => /3\.00/.test(x)), namen.join('|'));
  const h = await p.locator('[data-feld="hinweise"]').innerText();
  pruefe('Hinweis Stickerei: wenige Farben, keine Verläufe/Fotos', /wenigen Farben/.test(h) && /Fotos, Farbverläufe/.test(h), h);
  pruefe('Hinweis Kappe sichtbar', /Kappe:/.test(h));
  pruefe('keine internen Texte oder USD-Preise im Hinweis', !/Erfahrungswert|nicht gemessen|USD|messung_0511|Katalog/.test(h), h);
  const fr = await rect(p, '.lsp6-frame');
  nahe('Druckfläche 14 × 5,1 cm: Seitenverhältnis 2,75', fr.w / fr.h, 2.75, 0.04);
  pruefe('Hinweis «Fotos werden nicht sauber gestickt» erst mit Foto', !/nicht sauber gestickt/.test(await p.locator('[data-feld="hinweise"]').innerText()));
  await p.locator('input[type=file]').setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: pngErzeugen(600, 600) });
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.embroidery_front_large[0] && window.LSPOD6.editors[0].st.ebenen.embroidery_front_large[0]._origW === 600);
  pruefe('mit Foto: Warnung Stickerei', /Fotos werden nicht sauber gestickt/.test(await p.locator('[data-feld="hinweise"]').innerText()));
  // Das Foto passt in die flache, breite Fläche (eingepasst)
  await p.waitForTimeout(150);
  const eb = await p.evaluate(() => { const e = window.LSPOD6.editors[0]; const l = e.st.ebenen.embroidery_front_large[0]; const a = document.querySelector('.lsp6-host').getBoundingClientRect(); const r = document.querySelector('.lsp6-layer').getBoundingClientRect(); return { l: l.scale, ah: a.height, rh: r.height, aw: a.width, rw: r.width }; });
  pruefe('quadratisches Foto ragt nicht über die niedrige, breite Fläche (auf 90 % eingepasst, Massstab kleiner als 1)', eb.rh <= eb.ah * 0.92 && eb.rw <= eb.aw * 0.92 && eb.l < 1, JSON.stringify(eb));
  await ctaKlicken(s);
  const letzterUpload = s.uploads[s.uploads.length - 1];
  pruefe('Druckdatei 1650 × 600 (Stickfläche vorne gross), davor nur der Upload des Fotos', s.uploads.length === 2 && letzterUpload.breite === 1650 && letzterUpload.hoehe === 600, JSON.stringify(s.uploads));
  const pod = JSON.parse(s.warenkorb[0].properties._pod_karte);
  pruefe('_pod_karte Stickerei: Platzierung, Aufpreis 3', pod.m === 206 && pod.pl[0] === 'embroidery_front_large' && pod.ap === 3, JSON.stringify(pod));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 5b. Hinweise der Karte: nur Kundentexte ─────────────────────────────────────────────────────
szenario('hinweise-kundentexte', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=71&hinweise=1' });
  await editorBereit(s.page);
  const h = await s.page.locator('[data-feld="hinweise"]').innerText();
  pruefe('unbekannte Einschränkung wird mit ihrem Text der Karte gezeigt', /Beispiel einer Einschränkung ohne eigenen Kundentext/.test(h), h);
  pruefe('Hinweis der Art «info» ohne Kundentext-Tabelle wird nie gezeigt', !/Interne Info|darf der Kunde nie sehen|Erfahrungswert/.test(h), h);
  pruefe('eigener Kundentext der Karte hat Vorrang vor der Tabelle des Editors', /Eigener Kundentext der Karte hat Vorrang/.test(h) && !/Kappe: Die Fläche ist klein/.test(h), h);
  pruefe('genau zwei Hinweise: unbekannte Einschränkung und eigener Kundentext (Info und Einschränkung ohne Text erscheinen nicht)', (await s.page.locator('.lsp6-hint').count()) === 2, `${await s.page.locator('.lsp6-hint').count()}: ${h}`);
  await s.schliessen();
});

// ── 6. Allover-Hoodie: Schnittteile, Obergrenze der Druckdatei ──────────────────────────────────
szenario('hoodie-schnittteile', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=388' });
  await editorBereit(s.page);
  const p = s.page;
  const namen = await p.locator('.lsp6-tab').allInnerTexts();
  pruefe('Hoodie: 8 Teile (Vorderseite, Rückseite, Ärmel, Tasche, Kapuze, Etiketten)', namen.length === 8 && /Tasche/.test(namen.join()) && /Kapuze/.test(namen.join()), namen.join('|'));
  pruefe('Hinweis Rundum-Druck sichtbar', /Rundum-Druck: Jedes Teil/.test(await p.locator('[data-feld="hinweise"]').innerText()));
  const fr = await rect(p, '.lsp6-frame');
  nahe('Vorderteil: quadratische Druckdatei 6000×6000', fr.w / fr.h, 1, 0.02);
  const metaH = await p.locator('[data-feld="meta"]').innerText();
  pruefe('Rundum-Druck: die Masse heissen «Druckbogen», nicht «Druckfläche» (Gegenleser 2, F8)', /Druckbogen \d/.test(metaH) && !/Druckfläche \d/.test(metaH), metaH);
  pruefe('Rundum-Druck: auch die Beschriftung auf der Bühne heisst «Druckbogen»', /Druckbogen/.test(await p.locator('.lsp6-tag').innerText()));
  const cap = await p.locator('[data-feld="cap"]').innerText();
  pruefe('Hinweis: Druckdatei auf 4096 × 4096 begrenzt', /4096 × 4096/.test(cap), cap);
  await tab(p, 'Kapuze').click();
  await textHinzufuegen(p, 'Kapuze');
  await p.locator('.lsp6-tab[data-p="front"]').click();
  await textHinzufuegen(p, 'Vorne');
  await ctaKlicken(s);
  const dims = s.uploads.map((u) => `${u.breite}x${u.hoehe}`).join(',');
  pruefe('zwei Teile, je auf 4096×4096 begrenzt (Seitenverhältnis bleibt)', s.uploads.length === 2 && dims === '4096x4096,4096x4096', dims);
  const pod = JSON.parse(s.warenkorb[0].properties._pod_karte);
  pruefe('_pod_karte nennt die tatsächliche Pixelgrösse und den Dateityp', JSON.stringify(pod.px) === '["4096x4096","4096x4096"]' && pod.pl.includes('hood') && pod.dt.front === 'default', JSON.stringify(pod));
  await s.schliessen();
});

// ── 7. Poster: kleine Grenze und echte Grösse 9933×7016 mit data-max-px=0 ───────────────────────
szenario('poster-pixel', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=268&shop=1001:19515' });
  await editorBereit(s.page);
  const p = s.page;
  const meta = await p.locator('[data-feld="meta"]').innerText();
  pruefe('Poster: Fläche 84,1 × 59,4 cm', /84,1 × 59,4 cm/.test(meta) && /9933 × 7016 px/.test(meta) && /300 dpi/.test(meta), meta);
  pruefe('Poster: einzelne Fläche, keine Reiter', await p.locator('.lsp6-tabs').isHidden());
  await textHinzufuegen(p, 'Poster');
  await ctaKlicken(s);
  const u = s.uploads[0];
  const ist = u.breite * u.hoehe;
  pruefe('Standard: Druckdatei unter 16,7 Mpx, Seitenverhältnis des Printfiles', ist <= 16777216 && Math.abs(u.breite / u.hoehe - 9933 / 7016) < 0.002, JSON.stringify(u));
  const pod = JSON.parse(s.warenkorb[0].properties._pod_karte);
  pruefe('_pod_karte nennt die verkleinerte Pixelgrösse (px) der hochgeladenen Datei', JSON.stringify(pod.px) === JSON.stringify([`${u.breite}x${u.hoehe}`]), JSON.stringify(pod));
  await s.schliessen();
  // data-max-px="0" heisst nicht mehr «keine Grenze»: die absolute Grenze von 25 Mpx (Cloudinary Free und Plus, QUELLE Gegenleser) gilt immer
  const s2 = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=268&shop=1001:19515&maxpx=0' });
  await editorBereit(s2.page);
  await textHinzufuegen(s2.page, 'Poster');
  const maxPx2 = await s2.page.evaluate(() => window.LSPOD6.editors[0].maxPixel);
  await Promise.all([s2.page.waitForURL('**/cart', { timeout: 120000 }), s2.page.locator('.lsp6-cta').click()]);
  const u2 = s2.uploads[0];
  pruefe('data-max-px=0: höchstens 25 Mpx (statt 69,7 Mpx), Seitenverhältnis bleibt, mehr als der Standard', u2 && u2.breite * u2.hoehe <= 25000000 && u2.breite * u2.hoehe > 16777216 && Math.abs(u2.breite / u2.hoehe - 9933 / 7016) < 0.002, JSON.stringify(u2));
  pruefe('data-max-px=0: der Editor kennt die absolute Grenze', maxPx2 === 25000000, String(maxPx2));
  await s2.schliessen();
  // Ohne Zuordnung der Shopify-Variante ist die Druckdatei nicht bestimmbar (7 Formate): Kauf gesperrt statt Standardformat (Gegenleser 2, F5)
  const s3 = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=268' });
  await editorBereit(s3.page);
  await textHinzufuegen(s3.page, 'Poster');
  await s3.page.locator('.lsp6-cta').click();
  await s3.page.waitForFunction(() => /nicht eingerichtet/.test(document.querySelector('[data-feld="status"]').innerText));
  pruefe('Poster ohne Zuordnung: Kauf gesperrt, kein Upload, kein Warenkorb', s3.uploads.length === 0 && s3.warenkorb.length === 0 && (await s3.page.locator('.lsp6-cta').isEnabled()));
  await s3.schliessen();
});

// ── 7b. T-Shirt: Vorlage in der Farbe der gewählten Variante ────────────────────────────────────
szenario('t-shirt-farbe', true, async (b, srv) => {
  const k = lies(71);
  const hexe = Object.keys(k.farben);
  const [h1, h2] = [hexe[0], hexe[hexe.length - 1]];
  const [v1, v2] = [k.farben[h1][0], k.farben[h2][0]];
  const hexZuRgb = (h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&shop=1001:${v1},1002:${v2}&varianten=1001:A,1002:B` });
  await editorBereit(s.page);
  const p = s.page;
  const bg = () => p.locator('.lsp6-stage').evaluate((e) => getComputedStyle(e).backgroundColor);
  pruefe(`Variante A: Bühne in ihrer Farbe ${h1}`, (await bg()) === hexZuRgb(h1), `${await bg()} soll ${hexZuRgb(h1)}`);
  pruefe('mit gewählter Farbe wird die Beispieltextur der Vorlage nicht mehr gezeigt', await p.locator('.lsp6-bg').isHidden());
  await p.locator('input[name="id"][value="1002"]').check();
  await p.waitForFunction((soll) => getComputedStyle(document.querySelector('.lsp6-stage')).backgroundColor === soll, hexZuRgb(h2));
  pruefe(`Variante B: Bühne wechselt auf ${h2}`, (await bg()) === hexZuRgb(h2));
  await s.schliessen();
  // ohne Zuordnung Shopify → Printful bleibt die Beispielfarbe der Vorlage
  const t = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=71' });
  await editorBereit(t.page);
  pruefe('ohne Variantenzuordnung: Beispielfarbe und Textur der Vorlage', (await t.page.locator('.lsp6-stage').evaluate((e) => getComputedStyle(e).backgroundColor)) === 'rgb(11, 11, 11)' && !(await t.page.locator('.lsp6-bg').isHidden()));
  await t.schliessen();
});

// ── 8. Tasse: Variantenwechsel ändert die Druckdatei ────────────────────────────────────────────
szenario('tasse-varianten', true, async (b, srv) => {
  const k = lies(19);
  const pfDim = (g) => { const d = k.druckdateien[k.druckdateiGruppen[g].platzierungen.default]; return `${d.breitePx} × ${d.hoehePx} px`; };
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=19&shop=1001:1320,1002:4830,1003:16586&varianten=1001:11 oz,1002:15 oz,1003:20 oz' });
  await editorBereit(s.page);
  const p = s.page;
  pruefe('Tasse: einzelne Platzierung, keine Reiter', await p.locator('.lsp6-tabs').isHidden());
  let meta = await p.locator('[data-feld="meta"]').innerText();
  pruefe('11 oz: Druckdatei der ersten Gruppe', meta.includes(pfDim(0)), meta);
  const asp1 = await p.locator('.lsp6-stage').evaluate((e) => getComputedStyle(e).getPropertyValue('--asp'));
  await p.locator('input[name="id"][value="1002"]').check();
  await p.waitForFunction((soll) => document.querySelector('[data-feld="meta"]').innerText.includes(soll), pfDim(1));
  meta = await p.locator('[data-feld="meta"]').innerText();
  pruefe('15 oz: Meta zeigt die Druckdatei der zweiten Gruppe', meta.includes(pfDim(1)), meta);
  await textHinzufuegen(p, 'Tasse');
  await p.locator('input[name="id"][value="1003"]').check();
  await p.waitForFunction((soll) => document.querySelector('[data-feld="meta"]').innerText.includes(soll), pfDim(2));
  pruefe('20 oz: Meta folgt', (await p.locator('[data-feld="meta"]').innerText()).includes(pfDim(2)));
  pruefe('Ebene bleibt beim Variantenwechsel erhalten', (await p.locator('.lsp6-layer').count()) === 1);
  await p.locator('input[name="id"][value="1002"]').check();
  await p.waitForFunction((soll) => document.querySelector('[data-feld="meta"]').innerText.includes(soll), pfDim(1));
  await ctaKlicken(s);
  const d = k.druckdateien[k.druckdateiGruppen[1].platzierungen.default];
  pruefe('Upload hat die Grösse der gewählten Variante (15 oz)', s.uploads[0].breite === d.breitePx && s.uploads[0].hoehe === d.hoehePx, `${JSON.stringify(s.uploads[0])} soll ${d.breitePx}x${d.hoehePx}`);
  const pod = JSON.parse(s.warenkorb[0].properties._pod_karte);
  pruefe('_pod_karte: Printful-Variante 4830, Shopify «1002», Dateityp default (nicht gesondert aufgeführt)', pod.pv === 4830 && pod.sv === '1002' && !('dt' in pod), JSON.stringify(pod));
  pruefe('Warenkorb nimmt die Shopify-Variante 1002', s.warenkorb[0].id === '1002');
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 9. Zeigerbedienung und Tastatur ─────────────────────────────────────────────────────────────
szenario('ziehen-tastatur', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  await textHinzufuegen(p, 'Zieh mich');
  const lage = () => p.evaluate(() => { const l = window.LSPOD6.editors[0].st.ebenen.front[0]; return { cx: l.cx, cy: l.cy, scale: l.scale, rot: l.rot }; });
  const a0 = await rect(p, '.lsp6-host');
  const l0 = await lage();
  const lr = await rect(p, '.lsp6-layer');
  await p.mouse.move(lr.x + lr.w / 2, lr.y + lr.h / 2);
  await p.mouse.down();
  await p.mouse.move(lr.x + lr.w / 2 + 60, lr.y + lr.h / 2 + 40, { steps: 6 });
  await p.mouse.up();
  const l1 = await lage();
  nahe('Ziehen um 60 px nach rechts = 60 / Flächenbreite', l1.cx - l0.cx, 60 / a0.w, 0.004);
  nahe('Ziehen um 40 px nach unten = 40 / Flächenhöhe', l1.cy - l0.cy, 40 / a0.h, 0.004);
  // Einrasten in der Mitte
  const lr2 = await rect(p, '.lsp6-layer');
  await p.mouse.move(lr2.x + lr2.w / 2, lr2.y + lr2.h / 2);
  await p.mouse.down();
  await p.mouse.move(lr2.x + lr2.w / 2 - 60 - 1, lr2.y + lr2.h / 2, { steps: 6 });
  await p.mouse.up();
  const l2 = await lage();
  pruefe('rastet in der Mitte ein (cx = 0,5)', l2.cx === 0.5, String(l2.cx));
  // Skalieren und Drehen am Griff
  const h = await rect(p, '.lsp6-handle'); const lc = await rect(p, '.lsp6-layer');
  const mx = lc.x + lc.w / 2, my = lc.y + lc.h / 2;
  await p.mouse.move(h.x + h.w / 2, h.y + h.h / 2);
  await p.mouse.down();
  await p.mouse.move(mx + (h.x + h.w / 2 - mx) * 1.5, my + (h.y + h.h / 2 - my) * 1.5, { steps: 6 });
  await p.mouse.up();
  const l3 = await lage();
  pruefe('Griff nach aussen vergrössert (ca. 1,5 ×)', l3.scale > l2.scale * 1.3 && l3.scale < l2.scale * 1.7, `${l2.scale} → ${l3.scale}`);
  // Tastatur
  await p.locator('.lsp6').focus();
  await p.keyboard.press('ArrowRight');
  const l4 = await lage();
  nahe('Pfeil rechts = 0,5 % der Flächenbreite', l4.cx - l3.cx, 0.005, 1e-9);
  await p.keyboard.press('Shift+ArrowDown');
  nahe('Shift+Pfeil unten = 2 %', (await lage()).cy - l4.cy, 0.02, 1e-9);
  // Rückgängig per Tastatur: Verschiebungen sind je ein Schritt
  await p.keyboard.press('Control+z');
  pruefe('Strg+Z macht die Verschiebung rückgängig', Math.abs((await lage()).cy - l4.cy) < 1e-9);
  await p.keyboard.press('Control+y');
  nahe('Strg+Y wiederholt', (await lage()).cy - l4.cy, 0.02, 1e-9);
  // Löschen über die rote Schaltfläche
  await p.locator('.lsp6-del').click();
  pruefe('✕ löscht die Ebene', (await p.locator('.lsp6-layer').count()) === 0);
  // Reiter per Pfeiltasten
  await tab(p, 'Vorderseite').first().focus();
  await p.keyboard.press('ArrowRight');
  pruefe('Pfeil rechts wechselt zum nächsten Reiter', (await tab(p, 'Vorderseite gross').getAttribute('aria-selected')) === 'true');
  await p.keyboard.press('End');
  pruefe('Ende springt auf den letzten Reiter', (await p.locator('.lsp6-tab').last().getAttribute('aria-selected')) === 'true');
  await p.keyboard.press('Home');
  pruefe('Pos1 springt auf den ersten', (await p.locator('.lsp6-tab').first().getAttribute('aria-selected')) === 'true');
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── 10. Fehlerfälle ─────────────────────────────────────────────────────────────────────────────
szenario('fehlerabsicherung', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}`, cloudinaryFehler: true });
  await editorBereit(s.page);
  const p = s.page;
  await p.locator('.lsp6-cta').click();
  pruefe('leerer Entwurf: Hinweis, kein Aufruf', /Füge zuerst/.test(await status(p).innerText()) && s.warenkorb.length === 0);
  await textHinzufuegen(p, '');
  await p.locator('.lsp6-cta').click();
  await p.waitForFunction(() => /Konnte nicht hinzufügen|Füge zuerst/.test(document.querySelector('[data-feld="status"]').innerText));
  pruefe('leerer Text: Fehler, kein Warenkorb-Aufruf, Knopf wieder frei', s.warenkorb.length === 0 && (await p.locator('.lsp6-cta').isEnabled()));
  await p.locator('.lsp6-chip', { hasText: 'Text' }).click();   // nach dem Fehler ist nichts mehr gewählt (wie v5)
  await p.locator('.lsp6-text').fill('Test');
  await p.locator('.lsp6-cta').click();
  await p.waitForFunction(() => /Konnte nicht hinzufügen/.test(document.querySelector('[data-feld="status"]').innerText));
  const t = await status(p).innerText();
  pruefe('Upload-Fehler (HTTP 500): Meldung, kein Warenkorb-Aufruf, Knopf wieder frei', /Druckdatei konnte nicht erstellt werden/.test(t) && s.warenkorb.length === 0 && (await p.locator('.lsp6-cta').isEnabled()), t);
  pruefe('Fehlermeldung ist rot markiert', (await status(p).getAttribute('class')).includes('err'));
  await s.schliessen();
  const s2 = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}`, warenkorbFehler: true });
  await editorBereit(s2.page);
  await textHinzufuegen(s2.page, 'Test');
  await s2.page.locator('.lsp6-cta').click();
  await s2.page.waitForFunction(() => /mock-warenkorb-fehler/.test(document.querySelector('[data-feld="status"]').innerText));
  pruefe('Warenkorb lehnt ab (422): Text des Shops wird gezeigt, keine Weiterleitung, Knopf frei', !/\/cart$/.test(s2.page.url()) && (await s2.page.locator('.lsp6-cta').isEnabled()));
  await s2.schliessen();
  // Foto zu gross
  const s3 = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s3.page);
  await s3.page.locator('input[type=file]').setInputFiles({ name: 'riesig.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 10) });
  pruefe('Foto über 10 MB wird abgelehnt', /zu gross/.test(await status(s3.page).innerText()) && (await s3.page.locator('.lsp6-layer').count()) === 0);
  await s3.schliessen();
});

// ── 11. Druck-Vorschau, Hilfsfelder im Formular ─────────────────────────────────────────────────
szenario('vorschau-formular', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  await p.getByRole('button', { name: /Druck-Vorschau/ }).click();
  pruefe('Vorschau ohne Ebenen: Hinweis statt Fenster', /Füge zuerst/.test(await status(p).innerText()) && (await p.locator('.lsp6-modal').count()) === 0);
  await textHinzufuegen(p, 'Vorschau');
  pruefe('versteckte Felder im Warenkorb-Formular mit eigener Kennung data-lspod6', (await p.locator('form input[data-lspod6="1"]').count()) === 2 && (await p.locator('form input[data-lspod="1"]').count()) === 0);
  const namen = await p.locator('form input[data-lspod6="1"]').evaluateAll((l) => l.map((i) => i.name));
  pruefe('Felder: Design und _pod_karte', namen.includes('properties[\u{1F3A8} Design (front)]') && namen.includes('properties[_pod_karte]'), namen.join('|'));
  await p.getByRole('button', { name: /Druck-Vorschau/ }).click();
  await p.waitForSelector('.lsp6-modal img');
  const nat = await p.locator('.lsp6-modal img').evaluate((i) => new Promise((ok) => { const f = () => ok([i.naturalWidth, i.naturalHeight]); i.complete ? f() : (i.onload = f); }));
  pruefe('Vorschau zeigt die Datei in 1800 × 2400', nat[0] === 1800 && nat[1] === 2400, nat.join('x'));
  pruefe('Vorschau nennt die Pixelgrösse', /1800 × 2400 px/.test(await p.locator('.lsp6-modal-s').innerText()));
  pruefe('Vorschau ist ein Dialog', (await p.locator('.lsp6-modal').getAttribute('role')) === 'dialog');
  await p.keyboard.press('Escape');
  pruefe('Escape schliesst die Vorschau', (await p.locator('.lsp6-modal').count()) === 0);
  pruefe('Die Vorschau lädt nichts hoch', s.uploads.length === 0);
  await s.schliessen();
});

// ── 12. Mobil ───────────────────────────────────────────────────────────────────────────────────
szenario('mobil-390', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...MOBIL, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  const ueberlauf = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  pruefe('kein seitliches Scrollen bei 390 px', ueberlauf.sw <= ueberlauf.cw, JSON.stringify(ueberlauf));
  const karte = await rect(p, '.lsp6');
  pruefe('Editor passt in die Breite (16 px Rand der Seite)', karte.x >= 0 && karte.x + karte.w <= 390, JSON.stringify(karte));
  pruefe('Reiterleiste scrollt in sich', await p.locator('.lsp6-tabs').evaluate((e) => e.scrollWidth > e.clientWidth && getComputedStyle(e).overflowX === 'auto'));
  const fr = await rect(p, '.lsp6-frame');
  nahe('Druckfläche mobil im Seitenverhältnis 0,75', fr.w / fr.h, 0.75, 0.012);
  const klein = await p.evaluate(() => [...document.querySelectorAll('.lsp6-btn, .lsp6-tab, .lsp6-cta')].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 42).map((e) => e.textContent.trim().slice(0, 20)));
  pruefe('Schaltflächen mobil mindestens 42 px hoch', klein.length === 0, klein.join('|'));
  await textHinzufuegen(p, 'Mobil');
  const kl2 = await p.evaluate(() => [...document.querySelectorAll('.lsp6 button:not(.lsp6-emoji), .lsp6 input:not([type=hidden]):not([type=file]), .lsp6 select')].filter((e) => e.offsetParent && !e.closest('[hidden]') && !e.closest('.lsp6-picker') && e.getBoundingClientRect().height < 34).map((e) => (e.textContent || e.type).trim().slice(0, 14)));
  pruefe('bedienbare Elemente mobil mindestens 34 px hoch (Felder, Regler, Schaltflächen)', kl2.length === 0, kl2.join('|'));
  const ueberlauf2 = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  pruefe('auch mit Ebene und Bedienfeldern kein seitliches Scrollen', ueberlauf2);
  // Tippen auf einen Reiter und eine Ebene (Touch)
  await tab(p, 'Rückseite').tap();
  pruefe('Tippen wechselt den Reiter', (await tab(p, 'Rückseite').getAttribute('aria-selected')) === 'true');
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  // jedes Modell mobil ohne seitliches Scrollen
  for (const id of [19, 268, 206, 388]) {
    const t = await seiteOeffnen(b, srv.url, { ...MOBIL, query: `karte=${id}` });
    await editorBereit(t.page);
    const o = await t.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    const f = await rect(t.page, '.lsp6-frame');
    pruefe(`Modell ${id} mobil: kein seitliches Scrollen, Druckfläche sichtbar`, o && f.w > 100 && f.x >= 0 && f.x + f.w <= 390, JSON.stringify(f));
    pruefe(`Modell ${id} mobil: keine Seitenfehler`, t.fehler.length === 0, t.fehler.join(' | '));
    await t.schliessen();
  }
});

// ── 13. Kontrast und Beschriftung ───────────────────────────────────────────────────────────────
szenario('kontrast-barrierefreiheit', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=206' });
  await editorBereit(s.page);
  const p = s.page;
  await p.locator('input[type=file]').setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: pngErzeugen(300, 100) });
  await p.waitForFunction(() => !document.querySelector('[data-feld="dpi"]').hidden);
  await textHinzufuegen(p, 'Kontrast');
  await p.locator('.lsp6-chip', { hasText: 'Bild' }).click();
  const liste = await p.evaluate(() => {
    const sel = ['.lsp6-cta', '.lsp6-hint', '[data-feld="meta"] span', '.lsp6-tip', '.lsp6-tab small', '.lsp6-linkbtn', '.lsp6-field span', '.lsp6-btn', '.lsp6-preview', '[data-feld="dpi"]', '.lsp6-head', '.lsp6-cap', '.lsp6-tab[aria-selected="true"]', '.lsp6-tab:not([aria-selected="true"])', '.lsp6-chip', '.lsp6-lab'];
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); const t = m[1].split(',').map(Number); return t.length === 4 ? { rgb: t.slice(0, 3), a: t[3] } : { rgb: t, a: 1 }; };
    const ausgabe = [];
    for (const q of sel) {
      const e = [...document.querySelectorAll(q)].find((x) => x.offsetParent && !x.closest('[hidden]'));
      if (!e) { ausgabe.push({ q, fehlt: true }); continue; }
      const f = parse(getComputedStyle(e).color);
      let bg = null; let n = e;
      while (n && !bg) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0.9) bg = c.rgb; n = n.parentElement; }
      ausgabe.push({ q, fg: f.rgb, bg: bg || [255, 255, 255] });
    }
    return ausgabe;
  });
  for (const x of liste) {
    if (x.fehlt) { console.log('    (nicht sichtbar, übersprungen:', x.q + ')'); continue; }
    const k = kontrast(x.fg, x.bg);
    pruefe(`Kontrast ${x.q} mindestens 4,5:1`, k >= 4.5, `${k.toFixed(2)} (${x.fg} auf ${x.bg})`);
  }
  // Beschriftungen
  const ohneName = await p.evaluate(() => [...document.querySelectorAll('.lsp6 button, .lsp6 input:not([type=hidden]), .lsp6 select, .lsp6 textarea')].filter((e) => !e.closest('[hidden]') && !(e.getAttribute('aria-label') || e.textContent.trim() || e.title || (e.labels && e.labels.length) || e.placeholder)).map((e) => e.outerHTML.slice(0, 60)));
  pruefe('jedes Bedienelement hat einen Namen', ohneName.length === 0, ohneName.join(' | '));
  pruefe('Reiter: Rolle tablist/tab mit aria-selected', (await p.locator('[role="tablist"] [role="tab"]').count()) === 4 && (await p.locator('[role="tab"][aria-selected="true"]').count()) === 1);
  pruefe('Statusfeld ist eine Live-Region', (await status(p).getAttribute('aria-live')) === 'polite');
  pruefe('Fokusring sichtbar (outline bei :focus-visible)', await p.evaluate(() => [...document.styleSheets].some((ss) => [...ss.cssRules].some((r) => r.selectorText && /focus-visible/.test(r.selectorText) && /outline/.test(r.cssText)))));
  await s.schliessen();
});

// ── 14. Rückfall ohne Karte (v5-Modus) und Gleichheit mit dem echten v5 ─────────────────────────
async function v5Lauf(b, srv, modus) {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `modus=${modus}` });
  const sel = modus === 'v5' ? '.lspod-designer .lspod-designer-v5-x, .lspod-designer' : '.lspod-designer-v6 .lsp6';
  await s.page.waitForSelector(modus === 'v5' ? '.lspod-designer[data-init="1"] textarea' : '.lspod-designer-v6[data-init-v6="1"] .lsp6', { state: 'attached', timeout: 15000 });
  const wurzel = modus === 'v5' ? '.lspod-designer' : '.lspod-designer-v6';
  await s.page.locator(`${wurzel} button`, { hasText: '➕ Text' }).first().click();
  await s.page.locator(`${wurzel} textarea`).first().fill('Gleich');
  await Promise.all([s.page.waitForURL('**/cart', { timeout: 20000 }), s.page.locator(`${wurzel} button`, { hasText: 'Mit meinem Design in den Warenkorb' }).first().click()]);
  const out = { props: s.warenkorb[0] && s.warenkorb[0].properties, id: s.warenkorb[0] && s.warenkorb[0].id, qty: s.warenkorb[0] && s.warenkorb[0].quantity, up: s.uploads[0], fehler: s.fehler };
  await s.schliessen();
  return out;
}
szenario('v5-gleichheit', true, async (b, srv) => {
  const a = await v5Lauf(b, srv, 'v5');
  const c = await v5Lauf(b, srv, 'legacy6');
  pruefe('v5-Referenz lief (Warenkorb-Aufruf)', !!a.props, JSON.stringify(a));
  pruefe('v5-Modus lief (Warenkorb-Aufruf)', !!c.props, JSON.stringify(c));
  pruefe('gleiche Eigenschaftsschlüssel wie das echte v5', JSON.stringify(Object.keys(c.props).sort()) === JSON.stringify(Object.keys(a.props).sort()), `v5=${Object.keys(a.props)} v6=${Object.keys(c.props)}`);
  pruefe('gleiche Design-Beschreibung', c.props['Vorne · \u{1F3A8} Design'] === a.props['Vorne · \u{1F3A8} Design'] && a.props['Vorne · \u{1F3A8} Design'] === 'Text: "Gleich"', JSON.stringify([a.props, c.props]));
  pruefe('gleiche Variante und Menge', a.id === c.id && a.qty === c.qty && a.id === '1001');
  pruefe('gleiche Pixelgrösse der Druckdatei (1200 × 1440 bei ratio 1,2)', a.up.breite === 1200 && a.up.hoehe === 1440 && c.up.breite === a.up.breite && c.up.hoehe === a.up.hoehe, JSON.stringify([a.up, c.up]));
  pruefe('v5-Modus schreibt KEIN _pod_karte', !('_pod_karte' in c.props));
  pruefe('v5-Modus (Rückfall ohne Karte): die Schlüssel bleiben die von v5 («Vorne · 🖼️ Druckdatei», kein Schlüssel mit Unterstrich), auch in 6.2.1', 'Vorne · \u{1F5BC}\uFE0F Druckdatei' in c.props && Object.keys(c.props).every((k) => k[0] !== '_'), Object.keys(c.props).join('|'));
  pruefe('keine Seitenfehler in beiden', a.fehler.length === 0 && c.fehler.length === 0, a.fehler.concat(c.fehler).join(' | '));
});
szenario('v5-modus-rueckfall', true, async (b, srv) => {
  for (const kaputt of ['json', 'schema', 'leer']) {
    const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&kaputt=${kaputt}&${SHOP71}` });
    await editorBereit(s.page);
    pruefe(`beschädigte Karte (${kaputt}): v5-Modus`, (await s.page.locator('.lsp6').getAttribute('data-modus')) === 'v5');
    pruefe(`beschädigte Karte (${kaputt}): Vorne und Hinten wie v5, ohne Aufpreise`, JSON.stringify(await s.page.locator('.lsp6-tab').allInnerTexts()) === '["Vorne","Hinten"]', JSON.stringify(await s.page.locator('.lsp6-tab').allInnerTexts()));
    pruefe(`beschädigte Karte (${kaputt}): keine Druckfläche, keine cm`, (await s.page.locator('.lsp6-frame').isHidden()) && !(await s.page.locator('.lsp6').innerText()).includes(' cm'));
    pruefe(`beschädigte Karte (${kaputt}): keine Seitenfehler`, s.fehler.length === 0, s.fehler.join(' | '));
    await s.schliessen();
  }
  // v5-Modus: Prozentfelder, Leinwand 5:6, Rückseite
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'modus=legacy6' });
  await editorBereit(s.page);
  const p = s.page;
  const st = await rect(p, '.lsp6-stage');
  nahe('v5-Modus: Leinwand im Seitenverhältnis 1:1,2', st.w / st.h, 1 / 1.2, 0.01);
  await textHinzufuegen(p, 'Prozent');
  pruefe('v5-Modus: Zahlenfelder in %', (await p.locator('.lsp6-field', { hasText: 'X %' }).count()) === 1 && (await feldEingabe(p, 'X %').inputValue()) === '50');
  await tab(p, 'Hinten').click();
  pruefe('v5-Modus: Reiter Hinten ohne Sperre, Ebenen je Seite getrennt', (await p.locator('.lsp6-layer').count()) === 0);
  pruefe('v5-Modus: Hintergrundbild der Rückseite', (await p.locator('.lsp6-bg').getAttribute('src')).includes('hinten'));
  await s.schliessen();
});
szenario('v5-und-v6-nebeneinander', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `modus=v5,v6&karte=71&${SHOP71}` });
  await s.page.waitForSelector('.lspod-designer[data-init="1"] textarea', { state: 'attached', timeout: 15000 });
  await editorBereit(s.page);
  const p = s.page;
  pruefe('beide Guards gesetzt (v5 und v6 laden unabhängig)', await p.evaluate(() => window.__lspodDesignerLoaded === true && window.__lspodDesignerV6Loaded === true));
  pruefe('v5 baute nur seinen Container, v6 nur seinen', (await p.locator('.lspod-designer .lsp6').count()) === 0 && (await p.locator('.lspod-designer-v6 textarea').count()) === 1 && (await p.locator('.lspod-designer textarea').count()) === 1);
  pruefe('v6-Container trägt nicht die Klasse von v5', await p.locator('#ed-v6').evaluate((e) => !e.classList.contains('lspod-designer')));
  await p.locator('.lspod-designer-v6 button', { hasText: '➕ Text' }).click();
  await p.locator('.lspod-designer-v6 textarea').fill('v6');
  pruefe('v6-Eingaben erzeugen keine v5-Felder', (await p.locator('form input[data-lspod="1"]').count()) === 0 && (await p.locator('form input[data-lspod6="1"]').count()) === 2);
  await p.locator('.lspod-designer button', { hasText: '➕ Text' }).click();
  await p.locator('.lspod-designer textarea').fill('v5');
  const v5Felder = await p.locator('form input[data-lspod="1"]').evaluateAll((l) => l.map((i) => i.name));
  pruefe('v5-Eingaben erzeugen nur v5-Felder und lassen die v6-Felder stehen', v5Felder.length === 1 && (await p.locator('form input[data-lspod6="1"]').count()) === 2, v5Felder.join('|'));
  pruefe('v5 löscht die Ebene von v6 nicht', (await p.locator('.lspod-designer-v6 .lsp6-layer').count()) === 1);
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  // Doppeltes Einbinden von v6: ein Editor
  const t = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=19&shop=1001:1320` });
  await editorBereit(t.page);
  await t.page.evaluate(() => { const sc = document.createElement('script'); sc.src = '/lspod-designer-v6.js'; document.body.appendChild(sc); });
  await t.page.waitForTimeout(600);
  pruefe('v6 doppelt eingebunden: weiter genau ein Editor', (await t.page.locator('.lsp6').count()) === 1 && (await t.page.evaluate(() => window.LSPOD6.editors.length)) === 1);
  await t.schliessen();
});

// ── 15. Sprache ─────────────────────────────────────────────────────────────────────────────────
szenario('englisch', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=206&lang=en' });
  await editorBereit(s.page);
  const p = s.page;
  const t = await p.locator('.lsp6').innerText();
  pruefe('Englisch: Kopf, Reiter, Hinweise', /Design it yourself/.test(t) && /Front/.test(t) && /Embroidery: your design is stitched/.test(t), t.slice(0, 200));
  await p.getByRole('button', { name: '➕ Text' }).click();
  pruefe('Englisch: Zahlenfelder in cm und mm', (await p.locator('.lsp6-field', { hasText: 'X (cm)' }).count()) === 1 && (await p.locator('.lsp6-field', { hasText: 'Letter height (mm)' }).count()) === 1);
  await s.schliessen();
});

// ── 16. Bearbeiten, Verlauf ─────────────────────────────────────────────────────────────────────
szenario('foto-bearbeiten', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  await p.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: pngErzeugen(1200, 800) });
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front[0] && window.LSPOD6.editors[0].st.ebenen.front[0]._origW === 1200);
  await warteBis(() => s.uploads.length >= 1);   // das Original ist hochgeladen
  await p.waitForFunction(() => !window.LSPOD6.editors[0].st.ebenen.front[0].uploading);
  const before = s.uploads.length;
  await p.getByRole('button', { name: /Spiegeln/ }).click();
  pruefe('direkt nach dem Klick gilt die Ebene als «lädt hoch» (Kasse nimmt keinen alten Stand)', await p.evaluate(() => window.LSPOD6.editors[0].st.ebenen.front[0].uploading === true && window.LSPOD6.editors[0].st.ebenen.front[0].printUrl === ''));
  await warteBis(() => s.uploads.length >= before + 1);
  pruefe('Spiegeln lädt die bearbeitete Datei neu hoch (PNG in voller Grösse 1200 × 800)', s.uploads.length === before + 1 && s.uploads[before].breite === 1200 && s.uploads[before].hoehe === 800, JSON.stringify(s.uploads));
  await p.waitForFunction(() => !window.LSPOD6.editors[0].st.ebenen.front[0].uploading);
  await p.getByRole('button', { name: /90°/ }).click();
  await warteBis(() => s.uploads.length >= before + 2);
  const letzte = s.uploads[s.uploads.length - 1];
  pruefe('90° drehen: hochgeladene Datei 800 × 1200', s.uploads.length === before + 2 && letzte.breite === 800 && letzte.hoehe === 1200, JSON.stringify(s.uploads));
  await p.waitForFunction(() => !window.LSPOD6.editors[0].st.ebenen.front[0].uploading);
  await p.getByRole('button', { name: /Filter/ }).click();
  pruefe('Filter-Bereich öffnet', await p.locator('.lsp6-panel', { hasText: 'Helligkeit' }).isVisible());
  await p.getByRole('button', { name: /S\/W/ }).click();
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front[0].edit.gray === 100);
  await p.keyboard.press('Control+z').catch(() => {});
  // Zuschneiden: Dialog öffnet und schliesst
  await p.getByRole('button', { name: /Zuschneiden/ }).click();
  await p.waitForSelector('.lsp6-modal img');
  pruefe('Zuschneiden: Dialog mit Rahmen', (await p.locator('.lsp6-modal').getAttribute('role')) === 'dialog');
  await p.keyboard.press('Escape');
  pruefe('Escape schliesst den Zuschnitt', (await p.locator('.lsp6-modal').count()) === 0);
  // Kasse: Datei des Fotos wird mit gezeichnet
  await p.waitForFunction(() => !window.LSPOD6.editors[0].st.ebenen.front[0].uploading);
  await ctaKlicken(s);
  const ende = s.uploads[s.uploads.length - 1];
  pruefe('Druckdatei des Fotos auf der Vorderseite 1800 × 2400 mit Inhalt', ende.breite === 1800 && ende.hoehe === 2400, JSON.stringify(ende));
  const info = await pngInfo(b, s.png(ende.url));
  pruefe('Foto in der Druckdatei sichtbar (viele Pixel)', info.cnt > 50000, JSON.stringify(info));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// Funde der Gegenleser (05.11.2026): jeder Fund wurde mit dem Stand VOR der Korrektur nachgestellt (V6_DATEI = alte Fassung → rot), danach behoben.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const BUENDEL = 'karte=buendel&m=71,586&shop=1001:4012:71,1002:15124:586,1003:4013:71&varianten=1001:T-Shirt 71,1002:T-Shirt 586,1003:T-Shirt 71 L,1004:Unbekannt';
const pngDim = (s, url) => { const u = s.uploads.find((x) => x.url === url); return u ? `${u.breite}x${u.hoehe}` : null; };

// ── F1 (Blocker, beide Gegenleser): ein Shop-Produkt aus mehreren Printful-Modellen ─────────────────
szenario('buendel-tshirt', true, async (b, srv) => {
  const k586 = lies(586);
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: BUENDEL });
  await editorBereit(s.page);
  const p = s.page;
  pruefe('Bündel: Editor im Modus «karte» (nicht im Rückfall)', (await p.locator('.lsp6').getAttribute('data-modus')) === 'karte');
  const reiter = async () => (await p.locator('.lsp6-tab').allInnerTexts()).map((x) => x.split('\n')[0].trim());
  pruefe('Modell 71: acht Reiter, darunter «Vorderseite gross»', (await reiter()).length === 8 && (await reiter()).includes('Vorderseite gross'), (await reiter()).join('|'));
  await tab(p, 'Vorderseite gross').click();
  await textHinzufuegen(p, 'Gross');
  // Wechsel auf die Variante des Modells 586: dort gibt es «Vorderseite gross» nicht
  await p.locator('input[name="id"][value="1002"]').check();
  await p.waitForFunction(() => !document.querySelector('[data-feld="modellhinweis"]').hidden);
  const nach = await reiter();
  pruefe('Modell 586: Reiter = die 5 Platzierungen des Modells plus «Vorderseite gross» als fremder Reiter', nach.length === 6 && nach.includes('Vorderseite gross') && !nach.includes('Etikett innen (DTF)'), nach.join('|'));
  pruefe('fremder Reiter ist markiert (data-fremd) und trägt den Vermerk «hier nicht möglich»', (await p.locator('.lsp6-tab[data-fremd="1"]').count()) === 1 && /hier nicht möglich/.test(await p.locator('.lsp6-tab[data-fremd="1"]').innerText()));
  const hinweis = await p.locator('[data-feld="modellhinweis"]').innerText();
  pruefe('Hinweis nennt die fehlende Platzierung und sagt, was zu tun ist', /Vorderseite gross/.test(hinweis) && /Entferne dein Motiv/.test(hinweis), hinweis);
  const asp586 = k586.platzierungen.find((x) => x.id === 'front').printfile;
  await p.locator('.lsp6-cta').click();
  await p.waitForFunction(() => /gibt es .* nicht/.test(document.querySelector('[data-feld="status"]').innerText));
  pruefe('Kauf mit Motiv auf nicht vorhandener Platzierung gesperrt: kein Upload, kein Warenkorb', s.uploads.length === 0 && s.warenkorb.length === 0);
  // Auf der fremden Platzierung kann man nur entfernen: Text und Sticker hinzufügen ist dort gesperrt
  await tab(p, 'Vorderseite gross').click();
  await p.getByRole('button', { name: '➕ Text' }).click();
  pruefe('auf der fremden Platzierung lässt sich nichts hinzufügen (weiter nur das eine Motiv)', (await p.locator('.lsp6-layer').count()) === 1 && /gibt es .* nicht/.test(await status(p).innerText()));
  // Das Motiv dort entfernen: der Reiter verschwindet, die Vorderseite des Modells ist aktiv
  await p.locator('.lsp6-layer').first().click();
  await p.locator('.lsp6-del').click();
  await p.waitForFunction(() => document.querySelectorAll('.lsp6-tab[data-fremd="1"]').length === 0);
  pruefe('nach dem Entfernen: kein fremder Reiter, Hinweis weg, Vorderseite aktiv', (await reiter()).length === 5 && (await p.locator('[data-feld="modellhinweis"]').isHidden()) && (await tab(p, 'Vorderseite').first().getAttribute('aria-selected')) === 'true', (await reiter()).join('|'));
  nahe('Bühne zeigt die Fläche des Modells 586 (Seitenverhältnis seiner Vorderseite)', (await rect(p, '.lsp6-frame')).w / (await rect(p, '.lsp6-frame')).h, asp586.breitePx / asp586.hoehePx, 0.02);
  await tab(p, 'Rückseite').click();
  await textHinzufuegen(p, 'Hinten');
  await ctaKlicken(s);
  const w = s.warenkorb[0];
  const pod = JSON.parse(w.properties._pod_karte);
  const back586 = k586.platzierungen.find((x) => x.id === 'back').printfile;
  pruefe('Warenkorb: Shopify-Variante 1002, Printful-Variante 15124 und Modell 586 (nicht 71)', w.id === '1002' && pod.m === 586 && pod.pv === 15124 && pod.sv === '1002' && JSON.stringify(pod.pl) === '["back"]', JSON.stringify(pod));
  pruefe('Druckdatei in der Grösse der Rückseite von Modell 586', s.uploads.length === 1 && s.uploads[0].breite === back586.breitePx && s.uploads[0].hoehe === back586.hoehePx, JSON.stringify(s.uploads));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  // Zurück auf Modell 71 und eine Variante, die in der Zuordnung fehlt
  const t = await seiteOeffnen(b, srv.url, { ...PC, query: BUENDEL });
  await editorBereit(t.page);
  await textHinzufuegen(t.page, 'Hallo');
  await t.page.locator('input[name="id"][value="1002"]').check();
  await t.page.waitForFunction(() => document.querySelectorAll('.lsp6-tab').length === 5);
  await t.page.locator('input[name="id"][value="1003"]').check();
  await t.page.waitForFunction(() => document.querySelectorAll('.lsp6-tab').length === 8);
  pruefe('Rückwechsel auf Modell 71: acht Reiter, das Motiv auf der Vorderseite ist erhalten', (await t.page.locator('.lsp6-layer').count()) === 1);
  await t.page.locator('input[name="id"][value="1004"]').check();
  await t.page.waitForFunction(() => !document.querySelector('[data-feld="modellhinweis"]').hidden);
  pruefe('Variante ausserhalb der Zuordnung: Hinweis «nicht eingerichtet»', /nicht eingerichtet/.test(await t.page.locator('[data-feld="modellhinweis"]').innerText()));
  await t.page.locator('.lsp6-cta').click();
  await t.page.waitForFunction(() => /nicht eingerichtet/.test(document.querySelector('[data-feld="status"]').innerText));
  pruefe('Variante ausserhalb der Zuordnung: Kauf gesperrt (es gibt nie still die Standardgeometrie)', t.uploads.length === 0 && t.warenkorb.length === 0 && (await t.page.locator('.lsp6-cta').isEnabled()));
  await t.schliessen();
  // Plan B: Bündel als Datei (data-karte-url) statt Inline-JSON in der Beschreibung
  const v = await seiteOeffnen(b, srv.url, { ...PC, query: BUENDEL + '&karteurl=1' });
  await editorBereit(v.page);
  pruefe('Plan B: Bündel per data-karte-url geladen, Modus «karte», acht Reiter, kein Inline-JSON im Container', (await v.page.locator('.lsp6').getAttribute('data-modus')) === 'karte' && (await v.page.locator('.lsp6-tab').count()) === 8 && (await v.page.locator('.lspod-designer-v6 script#lspod-karte').count()) === 0 && v.fehler.length === 0, v.fehler.join('|'));
  await v.schliessen();
  // Beschädigtes Bündel (Zuordnung ohne Modell) → Rückfall auf den v5-Modus ohne Seitenfehler
  const u = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=buendel&m=71&shop=1001:4012:999' });
  await editorBereit(u.page);
  pruefe('Bündel ohne gültige Zuordnung: Rückfall auf den v5-Modus', (await u.page.locator('.lsp6').getAttribute('data-modus')) === 'v5' && u.fehler.length === 0, u.fehler.join('|'));
  await u.schliessen();
});

// ── F5 (Gegenleser 2): ohne Zuordnung nie still die Standardgeometrie ───────────────────────────────
szenario('ausfuehrung-ohne-zuordnung', true, async (b, srv) => {
  const q = 'varianten=1001:11 oz,1002:15 oz,1003:20 oz';
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=19&${q}` });
  await editorBereit(s.page);
  const p = s.page;
  await p.locator('input[name="id"][value="1003"]').check();
  await textHinzufuegen(p, 'Tasse');
  await p.locator('.lsp6-cta').click();
  await p.waitForFunction(() => /nicht eingerichtet/.test(document.querySelector('[data-feld="status"]').innerText));
  pruefe('Tasse (3 Druckdateien) ohne Zuordnung: Kauf gesperrt, kein Upload, kein Warenkorb', s.uploads.length === 0 && s.warenkorb.length === 0 && !(await p.locator('[data-feld="modellhinweis"]').isHidden()));
  await s.schliessen();
  // Zuordnung nur für zwei Varianten: die dritte bleibt gesperrt, die zugeordneten gehen
  const t = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=19&shop=1001:1320,1002:4830&${q}` });
  await editorBereit(t.page);
  await textHinzufuegen(t.page, 'Tasse');
  pruefe('zugeordnete Variante: kein Hinweis', await t.page.locator('[data-feld="modellhinweis"]').isHidden());
  await t.page.locator('input[name="id"][value="1003"]').check();
  await t.page.waitForFunction(() => !document.querySelector('[data-feld="modellhinweis"]').hidden);
  await t.page.locator('.lsp6-cta').click();
  await t.page.waitForFunction(() => /nicht eingerichtet/.test(document.querySelector('[data-feld="status"]').innerText));
  pruefe('nicht zugeordnete Variante (20 oz): gesperrt', t.uploads.length === 0 && t.warenkorb.length === 0);
  await t.page.locator('input[name="id"][value="1002"]').check();
  await t.page.waitForFunction(() => document.querySelector('[data-feld="modellhinweis"]').hidden);
  await ctaKlicken(t);
  pruefe('zugeordnete Variante (15 oz) geht durch', t.warenkorb.length === 1 && t.warenkorb[0].id === '1002');
  await t.schliessen();
  // Eine Karte mit Zuordnung, deren Printful-Variante nicht in der Karte steht (Tippfehler): gesperrt
  const u = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=19&shop=1001:99999999&${q}` });
  await editorBereit(u.page);
  pruefe('Printful-Variante, die die Karte nicht kennt: Hinweis sofort sichtbar', !(await u.page.locator('[data-feld="modellhinweis"]').isHidden()));
  await u.schliessen();
});

// ── F4 (Gegenleser 2): Variantenwechsel während Bau und Upload ──────────────────────────────────────
szenario('variante-waehrend-upload', true, async (b, srv) => {
  const k = lies(19);
  const dim = (g) => { const d = k.druckdateien[k.druckdateiGruppen[g].platzierungen.default]; return `${d.breitePx}x${d.hoehePx}`; };
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=19&shop=1001:1320,1002:4830,1003:16586&varianten=1001:11 oz,1002:15 oz,1003:20 oz', cloudinaryVerzoegerung: () => 800 });
  await editorBereit(s.page);
  const p = s.page;
  await textHinzufuegen(p, 'Tasse');
  await p.locator('.lsp6-cta').click();
  await p.waitForTimeout(300);
  pruefe('während des Bauens sind die Eingaben gesperrt (inert), der Knopf ist aus', (await p.evaluate(() => document.querySelector('.lsp6').hasAttribute('inert'))) && !(await p.locator('.lsp6-cta').isEnabled()));
  await p.locator('input[name="id"][value="1003"]').check();   // Kunde wechselt auf 20 oz, während die Datei für 11 oz hochgeladen wird
  await p.waitForFunction(() => /gewechselt/.test(document.querySelector('[data-feld="status"]').innerText), null, { timeout: 15000 });
  pruefe('Warenkorb wird NICHT mit gemischten Angaben gefüllt (id 11 oz, Datei und Karte für 20 oz)', s.warenkorb.length === 0, JSON.stringify(s.warenkorb));
  pruefe('Knopf wieder frei, Sperre aufgehoben', (await p.locator('.lsp6-cta').isEnabled()) && !(await p.evaluate(() => document.querySelector('.lsp6').hasAttribute('inert'))));
  pruefe('die erste Datei war die für 11 oz (eingefroren), nicht eine Mischung', s.uploads.length === 1 && `${s.uploads[0].breite}x${s.uploads[0].hoehe}` === dim(0), JSON.stringify(s.uploads));
  await p.waitForFunction((soll) => document.querySelector('[data-feld="meta"]').innerText.includes(soll), `${k.druckdateien[k.druckdateiGruppen[2].platzierungen.default].breitePx} × `);
  await ctaKlicken(s);
  const w = s.warenkorb[0];
  const pod = JSON.parse(w.properties._pod_karte);
  pruefe('zweiter Versuch: Variante 1003, Karte und Datei stimmen überein', w.id === '1003' && pod.sv === '1003' && pod.pv === 16586 && `${s.uploads[1].breite}x${s.uploads[1].hoehe}` === dim(2), JSON.stringify([w.id, pod, s.uploads[1]]));
  await s.schliessen();
  // Wechsel im selben Augenblick wie der Klick (noch bevor die Druckdatei gerechnet ist): die Datei wird trotzdem für die Variante des Klicks gebaut
  const t = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=19&shop=1001:1320,1002:4830,1003:16586&varianten=1001:11 oz,1002:15 oz,1003:20 oz' });
  await editorBereit(t.page);
  await textHinzufuegen(t.page, 'Tasse');
  await t.page.evaluate(() => {
    document.querySelector('.lsp6-cta').click();
    const r = document.querySelector('input[name="id"][value="1003"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await t.page.waitForFunction(() => /gewechselt/.test(document.querySelector('[data-feld="status"]').innerText), null, { timeout: 15000 });
  pruefe('Wechsel im Moment des Klicks: Datei bleibt die der Variante des Klicks (11 oz), Warenkorb unberührt', t.uploads.length === 1 && `${t.uploads[0].breite}x${t.uploads[0].hoehe}` === dim(0) && t.warenkorb.length === 0, JSON.stringify(t.uploads));
  await t.schliessen();
});

// ── F3 (Gegenleser 1 und 2): zwei schnelle Foto-Bearbeitungen, der langsamere Upload darf nicht gewinnen ──
szenario('foto-rennen', true, async (b, srv) => {
  const foto = { name: 'foto.png', mimeType: 'image/png', buffer: pngErzeugen(1200, 800) };
  const bereit = async (s) => {
    await s.page.locator('input[type=file]').setInputFiles(foto);
    await s.page.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front[0] && window.LSPOD6.editors[0].st.ebenen.front[0]._origW === 1200);
    await s.page.waitForFunction(() => !window.LSPOD6.editors[0].st.ebenen.front[0].uploading);
  };
  const ebene = (s) => s.page.evaluate(() => { const e = window.LSPOD6.editors[0].st.ebenen.front[0]; return { up: e.uploading, url: e.printUrl }; });
  // a) der erste Upload (Spiegeln) ist langsam, der zweite (90°) schnell und kommt zuerst zurück
  const a = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}`, cloudinaryVerzoegerung: (nr) => (nr === 2 ? 1000 : 0) });
  await editorBereit(a.page);
  await bereit(a);
  await a.page.getByRole('button', { name: /Spiegeln/ }).click();
  await a.page.waitForTimeout(350);
  await a.page.getByRole('button', { name: /90°/ }).click();
  await warteBis(async () => !(await ebene(a)).up, 5000);
  const zwischen = await ebene(a);
  await a.page.waitForTimeout(1400);   // der langsame erste Upload kommt jetzt zurück
  const ende = await ebene(a);
  pruefe('langsamer älterer Upload überschreibt die Adresse der neueren Bearbeitung nicht', ende.url === zwischen.url && pngDim(a, ende.url) === '800x1200', `${JSON.stringify(zwischen)} → ${JSON.stringify(ende)} ${pngDim(a, ende.url)}`);
  pruefe('Ebene bleibt nach dem Eintreffen des alten Uploads «fertig»', ende.up === false);
  await a.schliessen();
  // b) der erste Upload kommt zuerst zurück, der zweite ist noch unterwegs: die Ebene gilt weiter als «lädt hoch», die Kasse wartet
  const c = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}`, cloudinaryVerzoegerung: (nr) => (nr === 2 ? 250 : nr === 3 ? 1500 : 0) });
  await editorBereit(c.page);
  await bereit(c);
  await c.page.getByRole('button', { name: /Spiegeln/ }).click();
  await c.page.waitForTimeout(120);
  await c.page.getByRole('button', { name: /90°/ }).click();
  await c.page.waitForTimeout(700);   // Upload 2 ist zurück, Upload 3 noch nicht
  const mitte = await ebene(c);
  pruefe('erster Upload zurück, zweiter noch unterwegs: Ebene gilt weiter als «lädt hoch» (nicht der alte Stand)', mitte.up === true && mitte.url === '', JSON.stringify(mitte));
  await c.page.locator('.lsp6-cta').click();
  await c.page.waitForFunction(() => /lädt noch hoch/.test(document.querySelector('[data-feld="status"]').innerText));
  pruefe('Kasse wartet statt die alte Datei zu nehmen', c.warenkorb.length === 0);
  await c.page.waitForFunction(() => !window.LSPOD6.editors[0].st.ebenen.front[0].uploading, null, { timeout: 10000 });
  const spaet = await ebene(c);
  pruefe('am Ende gilt die Datei der letzten Bearbeitung (800 × 1200)', pngDim(c, spaet.url) === '800x1200', `${JSON.stringify(spaet)} ${pngDim(c, spaet.url)}`);
  await c.schliessen();
  // c) Bearbeiten, bevor der Upload des Originals zurück ist: das Original darf die Bearbeitung nicht überschreiben
  const d = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}`, cloudinaryVerzoegerung: (nr) => (nr === 1 ? 1000 : 0) });
  await editorBereit(d.page);
  await d.page.locator('input[type=file]').setInputFiles(foto);
  await d.page.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front[0] && window.LSPOD6.editors[0].st.ebenen.front[0]._origW === 1200);
  await d.page.getByRole('button', { name: /Spiegeln/ }).click();
  await warteBis(async () => !(await ebene(d)).up, 5000);
  const z = await ebene(d);
  await d.page.waitForTimeout(1300);
  const e2 = await ebene(d);
  pruefe('Upload des Originals (langsam) überschreibt die Adresse der Bearbeitung nicht', e2.url === z.url && e2.url !== '' && e2.up === false, `${JSON.stringify(z)} → ${JSON.stringify(e2)}`);
  await d.schliessen();
});

// ── Fund 6 (Gegenleser 1): dpi-Warnung nach Rückgängig und Wiederholen eines frischen Fotos ─────────
szenario('dpi-nach-rueckgaengig', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  await p.locator('input[type=file]').setInputFiles({ name: 'klein.png', mimeType: 'image/png', buffer: pngErzeugen(300, 300) });
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front[0] && window.LSPOD6.editors[0].st.ebenen.front[0]._origW === 300);
  const dpi = p.locator('[data-feld="dpi"]');
  await p.waitForFunction(() => !document.querySelector('[data-feld="dpi"]').hidden);
  const vorher = await dpi.innerText();
  pruefe('frisches Foto 300 px: Warnung mit dpi', /dpi/.test(vorher), vorher);
  await p.evaluate(() => { const e = window.LSPOD6.editors[0]; e.zurueck(); e.wiederholen(); });
  await p.evaluate(() => { const e = window.LSPOD6.editors[0]; e.waehlen(e.st.ebenen.front[0].id); });
  pruefe('nach Rückgängig und Wiederholen: dieselbe Warnung (Originalgrösse aus dem Zwischenspeicher)', !(await dpi.isHidden()) && (await dpi.innerText()) === vorher, await dpi.innerText());
  pruefe('wiederhergestellte Ebene kennt ihre Originalgrösse', (await p.evaluate(() => window.LSPOD6.editors[0].st.ebenen.front[0]._origW)) === 300);
  await s.schliessen();
});

// ── F2 (Gegenleser 1, F6 Gegenleser 2): Dateigrösse der Druckdatei und Grenzen von Cloudinary ─────────
szenario('cloudinary-grenzen', true, async (b, srv) => {
  const rausch = { name: 'rauschen.png', mimeType: 'image/png', buffer: pngRauschen(900, 1200) };
  const vollbild = async (s) => {
    await s.page.locator('input[type=file]').setInputFiles(rausch);
    await s.page.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front[0] && window.LSPOD6.editors[0].st.ebenen.front[0]._origW === 900);
    await s.page.waitForFunction(() => !window.LSPOD6.editors[0].st.ebenen.front[0].uploading);
  };
  // a) Der Editor prüft die Dateigrösse vor dem Upload (data-max-bytes) und rechnet kleiner
  const MAXB = 1500000;
  const a = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}&maxbytes=${MAXB}`, warenkorbVerzoegerung: 800 });
  await editorBereit(a.page);
  await vollbild(a);
  const roh = a.uploads.length;
  await a.page.locator('.lsp6-cta').click();
  await a.page.waitForFunction(() => /verkleinert/.test(document.querySelector('[data-feld="status"]').innerText), null, { timeout: 30000 });
  const hinweisA = await status(a.page).innerText();
  await a.page.waitForURL('**/cart', { timeout: 20000 });
  const letzte = a.uploads[a.uploads.length - 1];
  pruefe('Druckdatei höchstens so schwer wie data-max-bytes (Rest im Warenkorb)', letzte.bytes <= MAXB && a.warenkorb.length === 1, JSON.stringify(letzte));
  pruefe('verkleinert: kleiner als das Printfile 1800 × 2400, Seitenverhältnis 3:4 bleibt', letzte.breite < 1800 && Math.abs(letzte.breite / letzte.hoehe - 0.75) < 0.01, JSON.stringify(letzte));
  pruefe('zu schwere Dateien werden gar nicht erst hochgeladen (höchstens zwei Uploads zusätzlich zum Foto)', a.uploads.length - roh <= 2 && a.abgelehnt.length === 0, `${a.uploads.length - roh} / ${a.abgelehnt.length}`);
  pruefe('Kunde erfährt die tatsächliche Grösse', new RegExp(`${letzte.breite} × ${letzte.hoehe} px`).test(hinweisA), hinweisA);
  const podA = JSON.parse(a.warenkorb[0].properties._pod_karte);
  pruefe('_pod_karte.px trägt die tatsächliche Grösse der hochgeladenen Datei', JSON.stringify(podA.px) === JSON.stringify([`${letzte.breite}x${letzte.hoehe}`]), JSON.stringify(podA));
  await a.schliessen();
  // b) Der Editor kennt die Grenze nicht (data-max-bytes=0), Cloudinary lehnt ab: neu rechnen und wiederholen
  const c = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}&maxbytes=0`, cloudinaryMaxBytes: 2500000 });
  await editorBereit(c.page);
  await vollbild(c);
  await ctaKlicken(c);
  pruefe('Cloudinary lehnte die zu grosse Datei ab (HTTP 400), der Editor rechnete kleiner und es ging durch', c.abgelehnt.length >= 1 && c.warenkorb.length === 1 && c.uploads[c.uploads.length - 1].bytes <= 2500000, JSON.stringify({ abgelehnt: c.abgelehnt, letzte: c.uploads[c.uploads.length - 1] }));
  await c.schliessen();
  // c) Es geht nie: nach höchstens fünf Versuchen ein klarer Fehler, kein Warenkorb, Knopf frei
  const d = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}&maxbytes=0`, cloudinaryMaxBytes: 100 });
  await editorBereit(d.page);
  await textHinzufuegen(d.page, 'Hallo');
  await d.page.locator('.lsp6-cta').click();
  await d.page.waitForFunction(() => /zu gross für den Upload/.test(document.querySelector('[data-feld="status"]').innerText), null, { timeout: 30000 });
  pruefe('unlösbar: höchstens 5 Versuche, klare Meldung, kein Warenkorb, Knopf frei', d.abgelehnt.length <= 5 && d.abgelehnt.length >= 2 && d.warenkorb.length === 0 && (await d.page.locator('.lsp6-cta').isEnabled()), String(d.abgelehnt.length));
  await d.schliessen();
  // d) Server meldet zu viele Pixel
  const e = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=268&shop=1001:19515&maxbytes=0', cloudinaryMaxPixel: 8000000 });
  await editorBereit(e.page);
  await textHinzufuegen(e.page, 'Poster');
  await ctaKlicken(e);
  const lz = e.uploads[e.uploads.length - 1];
  pruefe('Poster: Cloudinary lehnt über 8 Mpx ab → Editor rechnet kleiner, es geht durch', e.abgelehnt.some((x) => x.grund === 'pixel') && lz.breite * lz.hoehe <= 8000000 && e.warenkorb.length === 1, JSON.stringify({ abgelehnt: e.abgelehnt.length, lz }));
  await e.schliessen();
});

// ── Fund 12 (Gegenleser 1): Zeitlimit des Uploads ───────────────────────────────────────────────────
szenario('upload-zeitlimit', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}&uptimeout=700`, cloudinaryHaengt: () => true });
  await editorBereit(s.page);
  await textHinzufuegen(s.page, 'Hallo');
  await s.page.locator('.lsp6-cta').click();
  await s.page.waitForFunction(() => /dauert zu lange/.test(document.querySelector('[data-feld="status"]').innerText), null, { timeout: 10000 });
  pruefe('Druckdatei-Upload hängt: nach dem Zeitlimit Meldung, kein Warenkorb, Knopf frei, Sperre aufgehoben', s.warenkorb.length === 0 && (await s.page.locator('.lsp6-cta').isEnabled()) && !(await s.page.evaluate(() => document.querySelector('.lsp6').hasAttribute('inert'))));
  await s.schliessen();
  const t = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}&uptimeout=700`, cloudinaryHaengt: () => true });
  await editorBereit(t.page);
  await t.page.locator('input[type=file]').setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: pngErzeugen(400, 400) });
  await t.page.waitForFunction(() => /dauert zu lange/.test(document.querySelector('[data-feld="status"]').innerText), null, { timeout: 10000 });
  pruefe('Foto-Upload hängt: Meldung, Ebene gilt nicht mehr als «lädt hoch» (Kasse bleibt nicht gesperrt)', (await t.page.evaluate(() => window.LSPOD6.editors[0].st.ebenen.front[0].uploading)) === false);
  await t.schliessen();
});

// ── Fund 3 (Gegenleser 1): der aktive Reiter liegt im Sichtfeld der Leiste ──────────────────────────
szenario('reiter-sichtbar', true, async (b, srv) => {
  const sichtbar = (p) => p.evaluate(() => {
    const t = document.querySelector('.lsp6-tabs'), a = document.querySelector('.lsp6-tab[aria-selected="true"]');
    const tr = t.getBoundingClientRect(), ar = a.getBoundingClientRect();
    return { ok: ar.left >= tr.left - 1 && ar.right <= tr.right + 1, tr: [tr.left, tr.right], ar: [ar.left, ar.right], scroll: t.scrollLeft, ueberlauf: t.scrollWidth > t.clientWidth };
  });
  for (const [name, opt, query, wahl] of [['Rechner 1440, T-Shirt (8 Reiter)', PC, `karte=71&${SHOP71}`, ['back', 'sleeve_right', 'label_outside', 'front']], ['Handy 390, T-Shirt', MOBIL, `karte=71&${SHOP71}`, ['back', 'sleeve_right', 'front_large']], ['Rechner 1440, 25 Reiter', PC, 'karte=syn&n=25', ['teil_13', 'teil_25', 'teil_02']]]) {
    const s = await seiteOeffnen(b, srv.url, { ...opt, query });
    await editorBereit(s.page);
    const p = s.page;
    let alle = true, letzte = '', ueberlauf = false;
    for (const w of wahl) {
      // über die Schnittstelle wechseln: ein Klick von Playwright rückt den Reiter selbst ins Bild und würde einen fehlenden Rücksprung im Editor verdecken
      await p.evaluate((id) => window.LSPOD6.editors[0].wechseln(id), w);
      const r = await sichtbar(p);
      ueberlauf = ueberlauf || r.ueberlauf;
      if (!r.ok) { alle = false; letzte = `${w}: ${JSON.stringify(r)}`; }
    }
    pruefe(`${name}: Leiste läuft über (sonst wäre die Prüfung leer)`, ueberlauf);
    pruefe(`${name}: der gewählte Reiter liegt nach jedem Wechsel in der sichtbaren Leiste`, alle, letzte);
    await s.schliessen();
  }
});

// ── Fund 2 (Gegenleser 2): der Theme-Knopf «Zuerst dein Design gestalten» springt zum v6-Editor ──────
szenario('designzwang-sprung', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=19&abstand=1600' });
  await editorBereit(s.page);
  const p = s.page;
  const vor = await p.evaluate(() => ({ y: window.scrollY, top: document.querySelector('.lsp6').getBoundingClientRect().top }));
  pruefe('Ausgangslage: Editor liegt unterhalb des Fensters', vor.y === 0 && vor.top > 900, JSON.stringify(vor));
  pruefe('Kennung «lspod-start» steht am Editor (das Theme setzt sie nur an .lspod-designer)', (await p.evaluate(() => document.getElementById('lspod-start') && document.getElementById('lspod-start').classList.contains('lsp6'))) === true);
  await p.locator('#designzwang').click();
  await p.waitForFunction(() => window.scrollY > 500, null, { timeout: 5000 }).catch(() => {});
  const nach = await p.evaluate(() => ({ y: window.scrollY, top: document.querySelector('.lsp6').getBoundingClientRect().top, hash: location.hash }));
  pruefe('Klick springt zum Editor (oberer Rand im Fenster)', nach.y > 500 && nach.top >= -5 && nach.top < 450 && nach.hash === '#lspod-start', JSON.stringify(nach));
  await s.schliessen();
});

// ── Fund 13 (Gegenleser 1): Tippflächen der Griffe mindestens 44 px ─────────────────────────────────
szenario('griffe-44px', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...MOBIL, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  await textHinzufuegen(p, 'Griff');
  for (const [name, sel] of [['Skalieren/Drehen', '.lsp6-handle'], ['Löschen', '.lsp6-del']]) {
    const r = await p.evaluate((sel) => {
      const el = document.querySelector(sel);
      el.scrollIntoView({ block: 'center' });
      const b = el.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const treffer = (dx, dy) => { const t = document.elementFromPoint(cx + dx, cy + dy); return !!(t && t.closest(sel)); };
      return { sichtbar: Math.round(b.width), ecken: [treffer(20, 0), treffer(-20, 0), treffer(0, 20), treffer(0, -20)] };
    }, sel);
    pruefe(`${name}: sichtbar ca. 30 px, getroffen wird sie bis 20 px vom Mittelpunkt (Fläche 44 px)`, r.ecken.every(Boolean), JSON.stringify(r));
  }
  await s.schliessen();
});

// ── Fund 5 (Gegenleser 1) / F7 (Gegenleser 2): _pod_karte höchstens 255 Zeichen ─────────────────────
szenario('pod-karte-grenze', true, async (b, srv) => {
  // 25 Platzierungen, alle belegt: zu lang für eine Eigenschaft → vorher abgelehnt, nichts wird hochgeladen
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=syn&n=25' });
  await editorBereit(s.page);
  const p = s.page;
  await p.evaluate(() => { const e = window.LSPOD6.editors[0]; for (const id of e.st.ebenen ? Object.keys(e.st.ebenen) : []) { e.wechseln(id); e.neuerText('x'); } });
  const laenge = await p.evaluate(() => window.LSPOD6.editors[0].eigenschaften()._pod_karte.length);
  pruefe('Ausgangslage: _pod_karte mit 25 Platzierungen ist länger als 255 Zeichen', laenge > 255, String(laenge));
  await p.locator('.lsp6-cta').click();
  await p.waitForFunction(() => /Zu viele Druckflächen/.test(document.querySelector('[data-feld="status"]').innerText));
  pruefe('zu lang: Meldung, kein Upload, kein Warenkorb, Knopf frei', s.uploads.length === 0 && s.warenkorb.length === 0 && (await p.locator('.lsp6-cta').isEnabled()));
  await s.schliessen();
  // das Dad-Cap mit allen vier Stickplätzen und das T-Shirt mit der grössten erlaubten Auswahl bleiben darunter
  const t = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=206&shop=1001:4012` });
  await editorBereit(t.page);
  for (const name of ['Vorne', 'Hinten', 'Rechts', 'Links']) { const z = t.page.locator('.lsp6-tab').nth(['Vorne', 'Hinten', 'Rechts', 'Links'].indexOf(name)); await z.click(); await textHinzufuegen(t.page, 'x'); }
  const w = await t.page.evaluate(() => window.LSPOD6.editors[0].eigenschaften()._pod_karte);
  pruefe('Dad-Cap mit vier Platzierungen: unter 255 Zeichen (früher 280)', w.length <= 255 && JSON.parse(w).pl.length === 4, `${w.length}: ${w}`);
  await t.schliessen();
  const u = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&shop=12345678901234:4012` });
  await editorBereit(u.page);
  for (const n of ['Vorderseite gross', 'Rückseite', 'Ärmel links', 'Ärmel rechts']) { await tab(u.page, n).first().click(); await textHinzufuegen(u.page, 'x'); }
  const w2 = await u.page.evaluate(() => window.LSPOD6.editors[0].eigenschaften()._pod_karte);
  pruefe('T-Shirt mit vier Platzierungen und 14-stelliger Shopify-Variante: unter 255 Zeichen', w2.length <= 255, `${w2.length}: ${w2}`);
  await u.schliessen();
});

// ── F11 (Gegenleser 2): nach einem Fehler keine alten Druckdatei-Adressen in den Formularfeldern ─────
szenario('formular-nach-fehler', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}`, warenkorbFehler: true });
  await editorBereit(s.page);
  const p = s.page;
  await textHinzufuegen(p, 'Neu');
  await p.locator('.lsp6-cta').click();
  await p.waitForFunction(() => /mock-warenkorb-fehler/.test(document.querySelector('[data-feld="status"]').innerText));
  const namen = () => p.evaluate(() => [...document.querySelectorAll('form input[data-lspod6="1"]')].map((i) => i.name));
  pruefe('nach dem Fehler: keine Druckdatei-Adresse im Formular', !(await namen()).some((n) => /Druckdatei/.test(n)), (await namen()).join('|'));
  await p.locator('.lsp6-chip', { hasText: 'Text' }).click();   // nach dem Fehler ist nichts mehr gewählt
  await p.locator('.lsp6-text').fill('Anders');
  pruefe('nach einer Änderung weiterhin keine alte Druckdatei-Adresse neben dem neuen Design', !(await namen()).some((n) => /Druckdatei/.test(n)) && (await namen()).some((n) => /Design/.test(n)), (await namen()).join('|'));
  await s.schliessen();
});

// ── Vertrag mit der Auftragsabwicklung: der Parser der Bestellstrecke liest, was der Editor wirklich schreibt ──
szenario('vertrag-bestellweg', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  await tab(p, 'Vorderseite gross').click(); await textHinzufuegen(p, 'Gross');
  await tab(p, 'Rückseite').click(); await textHinzufuegen(p, 'Hinten');
  await tab(p, 'Ärmel links').click(); await textHinzufuegen(p, 'Arm');
  await ctaKlicken(s);
  const r = () => dateienAusEigenschaften(s.warenkorb[0].properties, { hosts: ['res.cloudinary.com', 'cdn.shopify.com'] });
  parserPruefe(pruefe, 'Parser der Bestellstrecke liest drei Dateien ohne Befund', () => ({ ok: r().dateien.length === 3 && r().probleme.length === 0, detail: JSON.stringify(r().probleme) }));
  parserGleich_('Platzierung → Dateityp (die Vorderseite gross heisst bei Printful front_large)', () => r().dateien.map((d) => [d.platzierung, d.dateiTyp]).sort(), [['back', 'back'], ['front_large', 'front_large'], ['sleeve_left', 'sleeve_left']]);
  parserPruefe(pruefe, 'Parser: _pod_karte als Version 6 mit Platzierungen erkannt', () => r().karte && r().karte.v === 6 && r().karte.pl.length === 3);
  const t = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=71&shop=1001:4012' });
  await editorBereit(t.page);
  await textHinzufuegen(t.page, 'Vorne');
  await ctaKlicken(t);
  const r2 = () => dateienAusEigenschaften(t.warenkorb[0].properties, { hosts: ['res.cloudinary.com'] });
  parserGleich_('Vorderseite: Platzierung front, Dateityp default', () => r2().dateien.map((d) => [d.platzierung, d.dateiTyp]), [['front', 'default']]);
  await s.schliessen(); await t.schliessen();
});
function gleich_(name, ist, soll) { pruefe(name, JSON.stringify(ist) === JSON.stringify(soll), `ist=${JSON.stringify(ist)} soll=${JSON.stringify(soll)}`); }
function parserGleich_(name, ist, soll) { parserPruefe(pruefe, name, () => { const a = JSON.stringify(ist()); return { ok: a === JSON.stringify(soll), detail: `ist=${a} soll=${JSON.stringify(soll)}` }; }); }

// ── 6.2.1: die Kaufanfrage mit dem Schlüssel «_Druckdatei (…)» (6.2.0: «🖼️ Druckdatei (…)»): vollständig, Design sichtbar, nichts Altes ──
// Dasselbe Szenario läuft für beide Fassungen; nur die erwartete Schreibweise des Schlüssels unterscheidet sich (lib.mjs: druckdateiSchluessel, NEUE_SCHLUESSEL).
szenario('kaufanfrage-schluessel', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  const ids = ['front_large', 'back', 'sleeve_left'];
  const design = (id) => '\u{1F3A8} Design (' + id + ')';
  await tab(p, 'Vorderseite gross').click(); await textHinzufuegen(p, 'Gross');
  await tab(p, 'Rückseite').click(); await textHinzufuegen(p, 'Hinten');
  await tab(p, 'Ärmel links').click(); await textHinzufuegen(p, 'Arm');
  // Vor dem Kauf tragen die versteckten Felder der Seite Design und Karte, aber noch keine Adresse einer Druckdatei (die entsteht erst beim Upload)
  const felder = await p.evaluate(() => [...document.querySelectorAll('form input[data-lspod6="1"]')].map((i) => i.name));
  gleich_('Formular der Seite vor dem Kauf: drei Design-Zeilen und die Karte, keine Druckdatei-Adresse', [...felder].sort(), [...ids.map((id) => 'properties[' + design(id) + ']'), 'properties[_pod_karte]'].sort());
  await ctaKlicken(s);
  pruefe('Kaufanfrage: genau ein Aufruf, Variante 1001, Menge 1', s.warenkorb.length === 1 && s.warenkorb[0].id === '1001' && s.warenkorb[0].quantity === 1, JSON.stringify(s.warenkorb.map((w) => [w.id, w.quantity])));
  const pr = s.warenkorb[0].properties;
  // Vollständig: Design und Druckdatei je Platzierung plus die Karte, nichts sonst (kein _vorschau: dieses Szenario hat keine Vorschaudaten)
  gleich_('Kaufanfrage vollständig: Design und Druckdatei je Platzierung plus _pod_karte, sieben Eigenschaften', Object.keys(pr).sort(), [...ids.map(design), ...ids.map(druckdateiSchluessel), '_pod_karte'].sort());
  const pod = JSON.parse(pr._pod_karte);
  pruefe(`Kaufanfrage: _pod_karte unter 255 Zeichen (${pr._pod_karte.length}) und gültiges JSON`, pr._pod_karte.length <= 255 && pod.v === 6, pr._pod_karte);
  gleich_('Kaufanfrage: _pod_karte nennt Platzierungen (in der Reihenfolge der Karte), Shopify-Variante, Printful-Variante und Modell', [pod.pl, pod.sv, pod.pv, pod.m], [ids, '1001', 4012, 71]);
  gleich_('Kaufanfrage: die Design-Zeilen sind lesbar und gehören zur richtigen Platzierung', ids.map((id) => pr[design(id)]), ['Text: "Gross"', 'Text: "Hinten"', 'Text: "Arm"']);
  const karte = lies(71);
  for (const id of ids) {
    const k = druckdateiSchluessel(id), pf = karte.platzierungen.find((x) => x.id === id).printfile;
    const up = s.uploads.find((u) => u.url === pr[k]);
    pruefe(`Kaufanfrage: «${k}» ist die Cloudinary-Adresse genau des Uploads in der Grösse dieser Platzierung (${pf.breitePx} × ${pf.hoehePx})`, !!up && up.typ === 'png' && up.breite === pf.breitePx && up.hoehe === pf.hoehePx && /^https:\/\/res\.cloudinary\.com\//.test(pr[k]), JSON.stringify([pr[k], up && [up.breite, up.hoehe]]));
  }
  pruefe('Kaufanfrage: drei verschiedene Adressen', new Set(ids.map((id) => pr[druckdateiSchluessel(id)])).size === 3 && s.uploads.length === 3);
  // Schreibweise des Schlüssels
  const zeilen = druckdateiZeilen(pr);
  pruefe(`Schreibweise: alle drei Druckdatei-Zeilen in der ${NEUE_SCHLUESSEL ? 'neuen Form «_Druckdatei (<Platzierung>)»' : 'alten Form «🖼️ Druckdatei (<Platzierung>)»'}`, zeilen.length === 3 && zeilen.every((z) => z.schreibweise === (NEUE_SCHLUESSEL ? 'neu' : 'alt')) && zeilen.map((z) => z.id).join() === ids.join(), JSON.stringify(Object.keys(pr)));
  const mitDruckdatei = Object.keys(pr).filter((k) => /Druckdatei/.test(k));
  if (NEUE_SCHLUESSEL) pruefe('Neu: die alten Schlüssel kommen nicht mehr vor (kein Schlüssel mit 🖼, jeder Schlüssel mit «Druckdatei» beginnt mit «_», keiner doppelt)', !Object.keys(pr).some((k) => /\u{1F5BC}/u.test(k)) && mitDruckdatei.length === 3 && mitDruckdatei.every((k) => k[0] === '_'), JSON.stringify(Object.keys(pr)));
  else pruefe('Rücknahme: der alte Schlüssel «🖼️ Druckdatei (…)» bleibt, kein Schlüssel mit «_Druckdatei»', mitDruckdatei.length === 3 && mitDruckdatei.every((k) => /^\u{1F5BC}/u.test(k)) && !Object.keys(pr).some((k) => k.startsWith('_Druckdatei')), JSON.stringify(Object.keys(pr)));
  // Sichtbarkeit nach der Regel des Themes (lib.mjs: sichtbareZeilen): bei 6.2.1 nur die Design-Zeilen, die Adresse nicht
  gleich_(NEUE_SCHLUESSEL ? 'Sichtbar im Warenkorb des Themes: nur die drei Design-Zeilen (Adresse, Karte mit «_» verborgen)' : 'Sichtbar im Warenkorb des Themes (Rücknahme): Design und Adresse je Platzierung', sichtbareZeilen(pr), NEUE_SCHLUESSEL ? ids.map(design) : ids.flatMap((id) => [design(id), druckdateiSchluessel(id)]));
  pruefe('Die Design-Zeile steht im Klartext ohne Unterstrich und ohne Adresse', ids.every((id) => !pr[design(id)].includes('http') && Array.from(design(id))[0] !== '_'));
  // Parser der Bestellstrecke (nur wenn er die Schreibweise der Fassung kennt)
  parserPruefe(pruefe, 'Parser der Bestellstrecke: drei Dateien ohne Befund, Platzierungen wie in der Karte', () => { const r = dateienAusEigenschaften(pr); return { ok: r.dateien.length === 3 && r.probleme.length === 0 && r.dateien.map((d) => d.platzierung).join() === ids.join(), detail: JSON.stringify(r.probleme) }; });
  parserPruefe(pruefe, 'Parser: die Dateien werden als v6 gelesen (nicht über die v5-Regel), jede Adresse gehört zur richtigen Platzierung', () => { const r = dateienAusEigenschaften(pr); return r.dateien.length === 3 && r.dateien.every((d) => d.quelle === 'v6' && d.url === pr[druckdateiSchluessel(d.platzierung)]); });
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  // Die Vorderseite heisst bei Printful «default», in der Karte aber «front»: der Schlüssel nennt die Platzierung (front), der Dateityp steht nur in _pod_karte.dt
  const t = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=71&shop=1001:4012' });
  await editorBereit(t.page);
  await textHinzufuegen(t.page, 'Vorne');
  await ctaKlicken(t);
  const pt = t.warenkorb[0].properties;
  gleich_('Vorderseite: genau Design, Druckdatei (Platzierung «front», nicht der Dateityp «default») und _pod_karte', Object.keys(pt).sort(), [design('front'), druckdateiSchluessel('front'), '_pod_karte'].sort());
  gleich_('Vorderseite: der Dateityp «default» steht nur in _pod_karte.dt, nicht im Schlüssel', [JSON.parse(pt._pod_karte).dt, Object.keys(pt).some((k) => /default/.test(k))], [{ front: 'default' }, false]);
  pruefe('Vorderseite: die Adresse gehört zum Upload in Printfile-Grösse 1800 × 2400', t.uploads.length === 1 && pt[druckdateiSchluessel('front')] === t.uploads[0].url && t.uploads[0].breite === 1800 && t.uploads[0].hoehe === 2400, JSON.stringify(t.uploads));
  await t.schliessen();
});

// ── Kleinigkeiten: Emoji-Text, Kennung am Container, Hinweistext Stickerei ───────────────────────────
szenario('kleinigkeiten', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  await p.getByRole('button', { name: '➕ Text' }).click();
  await p.locator('.lsp6-text').fill('a' + '\u{1F600}'.repeat(45));
  const text = await p.evaluate(() => window.LSPOD6.editors[0].st.ebenen.front[0].text);
  pruefe('Textfeld kürzt auf 40 Zeichen, ohne ein Emoji (Ersatzzeichenpaar) zu zerschneiden', Array.from(text).length === 40 && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text), JSON.stringify(text));
  pruefe('Container trägt die Kennung des Modus (Prüfpunkt des Piloten: nicht data-init-v6, das gilt auch im Rückfall)', (await p.locator('.lspod-designer-v6').getAttribute('data-lspod6-modus')) === 'karte');
  await s.schliessen();
  const l = await seiteOeffnen(b, srv.url, { ...PC, query: 'modus=legacy6' });
  await editorBereit(l.page);
  pruefe('Rückfall: Container meldet den Modus «v5», data-init-v6 ist trotzdem 1', (await l.page.locator('.lspod-designer-v6').getAttribute('data-lspod6-modus')) === 'v5' && (await l.page.locator('.lspod-designer-v6').getAttribute('data-init-v6')) === '1');
  await l.schliessen();
  const c = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=206' });
  await editorBereit(c.page);
  const h = await c.page.locator('[data-feld="hinweise"]').innerText();
  pruefe('Stickerei-Hinweis verspricht keine Garnfarben-Wahl', !/Garnfarben/.test(h) && /gestickt/.test(h), h);
  pruefe('keine Gedankenstriche in der Oberfläche', !/—/.test(await c.page.locator('.lsp6').innerText()));
  await c.schliessen();
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// 6.2.0, WP4: Qualitätstor und Entwurf speichern
// ════════════════════════════════════════════════════════════════════════════════════════════════
const dataUrl = (w, h) => 'data:image/png;base64,' + pngErzeugen(w, h).toString('base64');
/** Foto direkt in den Editor legen (Originalgrösse bekannt, Massstab 1, nichts hochgeladen); gibt die Ebenen-ID zurück. */
const fotoLegen = (p, w, h) => p.evaluate(([src, ww, hh]) => window.LSPOD6.editors[0].neuesBild(src, ww, hh).id, [dataUrl(w, h), w, h]);
const gesperrt = (p) => p.locator('.lsp6-cta').getAttribute('aria-disabled').then((v) => v === 'true');
/** Playwright zählt aria-disabled als «nicht anklickbar»; für den Nutzer ist der Knopf anklickbar (nur `disabled` sperrt wirklich). */
const knopfFrei = (p) => p.locator('.lsp6-cta').evaluate((b) => !b.disabled);

// ── Qualitätstor: harter Stopp unter der Mindest-dpi, Warnung bis 150, Eigenschaft qd ───────────────
szenario('qualitaetstor', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  const box = p.locator('[data-feld="qualitaet"]');
  pruefe('ohne Foto: Kauf frei, keine Sperre-Meldung', (await box.isHidden()) && !(await gesperrt(p)));
  // a) 300-px-Foto auf dem Vorderteil: ca. 50 dpi, Mindestwert der Karte 75
  await p.locator('input[type=file]').setInputFiles({ name: 'klein.png', mimeType: 'image/png', buffer: pngErzeugen(300, 400) });
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front[0] && window.LSPOD6.editors[0].st.ebenen.front[0]._origW === 300);
  await p.waitForFunction(() => !window.LSPOD6.editors[0].st.ebenen.front[0].uploading);
  const t = await box.innerText();
  pruefe('300-px-Foto (ca. 50 dpi) sperrt den Kauf: Meldung nennt Platzierung, dpi und Mindestwert', await box.isVisible() && /Kauf gesperrt/.test(t) && /Vorderseite/.test(t) && /ca\. 50 dpi/.test(t) && /mindestens 75 dpi/.test(t), t);
  pruefe('Knopf trägt aria-disabled', await gesperrt(p));
  const hoch = s.uploads.length;
  await p.locator('.lsp6-cta').click({ force: true });
  const st = await status(p).innerText();
  pruefe('Klick auf den gesperrten Kauf: Meldung, kein Upload der Druckdatei, kein Warenkorb, Knopf frei', /Kauf gesperrt/.test(st) && s.uploads.length === hoch && s.warenkorb.length === 0 && (await knopfFrei(p)), `${st} / ${s.uploads.length} / ${hoch}`);
  // b) Sperre löst sich nach Entfernen des Fotos
  await p.locator('.lsp6-chip', { hasText: 'Bild' }).click();
  await p.locator('.lsp6-del').click();
  pruefe('Sperre löst sich, wenn das Foto entfernt ist', (await box.isHidden()) && !(await gesperrt(p)));
  // c) Grenzwerte ±1 px um die Mindest-dpi (T-Shirt vorne: 6 Zoll breit, Mindestwert 75 dpi → 450 px)
  for (const [w, soll] of [[449, true], [450, false], [451, false]]) {
    const id = await fotoLegen(p, w, w);
    const g = await gesperrt(p), dpiText = await p.locator('[data-feld="dpi"]').innerText();
    pruefe(`T-Shirt, Foto ${w} px breit: ${soll ? 'gesperrt (74,8 dpi)' : 'frei'}`, g === soll, `gesperrt=${g} ${dpiText}`);
    if (w === 449) pruefe('Anzeige bei 449 px: «ca. 74 dpi» (abgerundet unter dem Mindestwert, nie «75» neben der Sperre)', /ca\. 74 dpi/.test(dpiText), dpiText);
    if (w === 450) pruefe('Anzeige bei 450 px: genau 75 dpi, gerade noch frei', /ca\. 75 dpi/.test(dpiText), dpiText);
    await p.evaluate((i) => window.LSPOD6.editors[0].entfernen(i), id);
  }
  // d) Zwischenstufe: 600 px = 100 dpi (über 75, unter 150): frei, aber Warnung «mittel»
  const mid = await fotoLegen(p, 600, 600);
  const klasse = await p.locator('[data-feld="dpi"]').getAttribute('class');
  const dt = await p.locator('[data-feld="dpi"]').innerText();
  pruefe('100 dpi: frei, Zeile «ok» mit Zusatz «mittel» und Hinweis auf 150 dpi', !(await gesperrt(p)) && /lsp6-ok/.test(klasse) && /lsp6-mid/.test(klasse) && /ca\. 100 dpi/.test(dt) && /150 dpi/.test(dt), `${klasse} / ${dt}`);
  pruefe('ab 150 dpi keine Warnung mehr: Zeile ohne «mittel»', await (async () => { const g2 = await fotoLegen(p, 900, 900); const k2 = await p.locator('[data-feld="dpi"]').getAttribute('class'); await p.evaluate((i) => window.LSPOD6.editors[0].entfernen(i), g2); return /lsp6-ok/.test(k2) && !/lsp6-mid/.test(k2); })());
  // e) Eigenschaft qd im Warenkorb (kleinste effektive dpi), _pod_karte bleibt unter 255 Zeichen
  await p.getByRole('button', { name: '➕ Text' }).click();
  await p.locator('.lsp6-text').fill('x');
  await ctaKlicken(s);
  const pr = s.warenkorb[0].properties;
  const pod = JSON.parse(pr._pod_karte);
  pruefe('_pod_karte.qd = 100 (kleinste effektive dpi des 600-px-Fotos), ganzzahlig', pod.qd === 100 && Number.isInteger(pod.qd), pr._pod_karte);
  pruefe('_pod_karte mit qd unter 255 Zeichen, qd steht als letztes Feld (nach ap)', pr._pod_karte.length < 255 && pr._pod_karte.indexOf('"qd"') > pr._pod_karte.indexOf('"ap"'), `${pr._pod_karte.length}: ${pr._pod_karte}`);
  parserPruefe(pruefe, 'der Parser der Bestellstrecke liest die Position mit qd ohne Befund', () => { const g3 = dateienAusEigenschaften(pr); return g3.dateien.length === 1 && g3.probleme.length === 0; });
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
  // f) Foto auf der Rückseite sperrt, auch wenn die Vorderseite aktiv ist; qd = Minimum über alle Fotos
  const r = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(r.page);
  const q = r.page;
  await textHinzufuegen(q, 'Vorne');
  await tab(q, 'Rückseite').click();
  await fotoLegen(q, 300, 300);
  await q.locator('.lsp6-tab[data-p="front"]').click();
  const tr = await q.locator('[data-feld="qualitaet"]').innerText();
  pruefe('Foto auf der Rückseite (50 dpi) sperrt den Kauf, die Meldung nennt «Rückseite»', (await gesperrt(q)) && /Rückseite/.test(tr), tr);
  await tab(q, 'Rückseite').click();
  await q.locator('.lsp6-chip', { hasText: 'Bild' }).click();
  await q.locator('.lsp6-del').click();
  await fotoLegen(q, 1200, 1200);   // 200 dpi
  await q.locator('.lsp6-tab[data-p="front"]').click();
  await fotoLegen(q, 600, 600);     // 100 dpi
  const lage = await q.evaluate(() => { const l = window.LSPOD6.editors[0].qualitaetLage(); return { min: l.min, fotos: l.fotos, sperren: l.sperren.length }; });
  pruefe('zwei Fotos: qualitaetLage nennt das schlechtere (100 dpi), keine Sperre', lage.fotos === 2 && Math.abs(lage.min - 100) < 1e-6 && lage.sperren === 0, JSON.stringify(lage));
  await ctaKlicken(r);
  const pod2 = JSON.parse(r.warenkorb[0].properties._pod_karte);
  pruefe('qd = Minimum über beide Platzierungen (100)', pod2.qd === 100 && pod2.pl.length === 2, JSON.stringify(pod2));
  await r.schliessen();
  // g) Poster: 1000-px-Foto (ca. 60 dpi, Mindestwert 150) sperrt. Das A1-Poster 9933 × 7016 px trägt nach der Obergrenze von 16,7 Mpx nur ca. 147 dpi: die Anforderung kann nie höher sein als
  //    das, was die Datei trägt (sonst wäre der Mindestwert 150 für jedes Foto unerreichbar). Grenzwerte ±1 px an der halben Pixelbreite der Druckdatei.
  const o = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=268&shop=1001:19515' });
  await editorBereit(o.page);
  const x = o.page;
  const pid = await fotoLegen(x, 1000, 700);
  const tp = await x.locator('[data-feld="qualitaet"]').innerText();
  pruefe('Poster: 1000-px-Foto (ca. 60 dpi, nötig 150) sperrt den Kauf', (await gesperrt(x)) && /ca\. 60 dpi/.test(tp) && /mindestens 150 dpi/.test(tp), tp);
  await x.evaluate((i) => window.LSPOD6.editors[0].entfernen(i), pid);
  const rw = await x.evaluate(() => window.LSPOD6.editors[0].geo().render.w);
  const grenze = Math.ceil(rw / 2);
  pruefe('A1-Poster: Druckdatei nach der Obergrenze unter 150 dpi (die Obergrenze ist der Grund)', rw / (9933 / 300) < 150 && rw <= 4900, String(rw));
  for (const [w, soll] of [[grenze - 1, true], [grenze, false], [grenze + 1, false]]) {
    const id = await fotoLegen(x, w, 1800);
    pruefe(`A1-Poster, Foto ${w} px breit (Grenze ${grenze}): ${soll ? 'gesperrt' : 'frei'}`, (await gesperrt(x)) === soll, await x.locator('[data-feld="dpi"]').innerText());
    await x.evaluate((i) => window.LSPOD6.editors[0].entfernen(i), id);
  }
  const gutId = await fotoLegen(x, 5000, 3500);
  const gutText = await x.locator('[data-feld="dpi"]').innerText();
  pruefe('A1-Poster, 5000 px: frei, die Zeile sagt «mehr trägt die Druckdatei nicht» statt «unter 150»', !(await gesperrt(x)) && /Mehr trägt die Druckdatei/.test(gutText) && !/lsp6-mid/.test(await x.locator('[data-feld="dpi"]').getAttribute('class')), gutText);
  void gutId;
  pruefe('Poster: keine Seitenfehler', o.fehler.length === 0, o.fehler.join(' | '));
  await o.schliessen();
  // g2) mit data-max-px=0 (25 Mpx) trägt die Datei 180 dpi: dann gilt der Mindestwert 150 selbst (2483,3 px)
  const o2 = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=268&shop=1001:19515&maxpx=0' });
  await editorBereit(o2.page);
  for (const [w, soll] of [[2483, true], [2484, false]]) {
    const id = await fotoLegen(o2.page, w, 1800);
    pruefe(`A1-Poster mit 25 Mpx, Foto ${w} px breit: ${soll ? 'gesperrt (149,98 dpi)' : 'frei (150,04 dpi)'}`, (await gesperrt(o2.page)) === soll, await o2.page.locator('[data-feld="dpi"]').innerText());
    await o2.page.evaluate((i) => window.LSPOD6.editors[0].entfernen(i), id);
  }
  await o2.schliessen();
  // h) Dad-Cap (Stickerei, Mindestwert 150): ein kleines Foto sperrt ebenfalls; Text und Sticker nie
  const c = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=206' });
  await editorBereit(c.page);
  await textHinzufuegen(c.page, 'Cap');
  pruefe('Text allein löst nie eine Sperre aus', !(await gesperrt(c.page)));
  await fotoLegen(c.page, 200, 200);
  pruefe('Dad-Cap: 200-px-Foto sperrt den Kauf', await gesperrt(c.page));
  await c.schliessen();
});

// ── Entwurf: automatisch speichern und nach dem Neuladen wiederherstellen ────────────────────────
szenario('entwurf', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  const key = await p.evaluate(() => window.LSPOD6.editors[0].entwurfKey);
  const gespeichert = () => p.evaluate((k) => localStorage.getItem(k), key);
  pruefe('Schlüssel nennt Seite und Modell', /^lspod6:entwurf:\/mock\.html\|71$/.test(key), key);
  pruefe('ohne Ebenen steht nichts im Speicher', (await gespeichert()) === null);
  await textHinzufuegen(p, 'Hallo Welt');
  await p.waitForFunction((k) => localStorage.getItem(k), key, { timeout: 5000 });
  pruefe('Text wird von selbst gespeichert (verzögert, ohne Zutun)', JSON.parse(await gespeichert()).ebenen.front.length === 1);
  // Lage und Stil ändern (Zahlenfelder, Schrift, Farbe)
  await feldEingabe(p, 'X (cm)').fill('10'); await feldEingabe(p, 'X (cm)').press('Tab');
  await feldEingabe(p, 'Y (cm)').fill('25'); await feldEingabe(p, 'Y (cm)').press('Tab');
  await p.locator('.lsp6-sw[data-c="#b3122b"]').click();
  await p.locator('.lsp6-field', { hasText: 'Drehung' }).locator('input').fill('12'); await p.locator('.lsp6-field', { hasText: 'Drehung' }).locator('input').press('Tab');
  // Sticker
  await p.getByRole('button', { name: '⭐ Sticker' }).click();
  await p.locator('.lsp6-picker-grid button').first().click();
  // Foto (hochgeladen)
  await p.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: pngErzeugen(900, 1200) });
  await p.waitForFunction(() => { const l = window.LSPOD6.editors[0].st.ebenen.front; return l.length === 3 && l[2]._origW === 900 && !l[2].uploading && l[2].printUrl; });
  // Rückseite
  await tab(p, 'Rückseite').click();
  await textHinzufuegen(p, 'Hinten');
  const vorher = await p.evaluate(() => { const e = window.LSPOD6.editors[0]; const o = {}; for (const id of Object.keys(e.st.ebenen)) o[id] = e.st.ebenen[id].map((x) => ({ id: x.id, type: x.type, cx: x.cx, cy: x.cy, scale: x.scale, rot: x.rot, text: x.text, color: x.color, name: x.name, printUrl: x.printUrl, ow: x._origW })); return { aktiv: e.st.aktiv, ebenen: o }; });
  await p.evaluate(() => window.LSPOD6.editors[0].entwurfSofort());
  const roh = JSON.parse(await gespeichert());
  pruefe('Speicher trägt 3 Ebenen vorne und 1 hinten, Version 1, Zeitstempel', roh.v === 1 && roh.ebenen.front.length === 3 && roh.ebenen.back.length === 1 && Math.abs(Date.now() - roh.t) < 60000, JSON.stringify(Object.keys(roh)));
  pruefe('das Foto steht als Adresse der Druckdatei im Speicher, nicht als Bilddaten (kleiner Speicher)', roh.ebenen.front[2].printUrl === vorher.ebenen.front[2].printUrl && (await gespeichert()).length < 4000 && !/data:image/.test(await gespeichert()), String((await gespeichert()).length));
  // Neu laden
  await p.reload({ waitUntil: 'domcontentloaded' });
  await editorBereit(p);
  const nachher = await p.evaluate(() => { const e = window.LSPOD6.editors[0]; const o = {}; for (const id of Object.keys(e.st.ebenen)) o[id] = e.st.ebenen[id].map((x) => ({ id: x.id, type: x.type, cx: x.cx, cy: x.cy, scale: x.scale, rot: x.rot, text: x.text, color: x.color, name: x.name, printUrl: x.printUrl, ow: x._origW, uploading: x.uploading })); return { aktiv: e.st.aktiv, ebenen: o }; });
  pruefe('Reload: Ebenenzahl je Platzierung wie vorher (3 vorne, 1 hinten)', nachher.ebenen.front.length === 3 && nachher.ebenen.back.length === 1);
  pruefe('Reload: die aktive Platzierung ist wieder die Rückseite', nachher.aktiv === 'back' && (await tab(p, 'Rückseite').getAttribute('aria-selected')) === 'true', nachher.aktiv);
  let maxAbw = 0;
  for (const id of ['front', 'back']) vorher.ebenen[id].forEach((v, i) => { const a = nachher.ebenen[id][i]; for (const k of ['cx', 'cy', 'scale']) maxAbw = Math.max(maxAbw, Math.abs(v[k] - a[k]) / Math.max(Math.abs(v[k]), 0.01)); maxAbw = Math.max(maxAbw, Math.abs(v.rot - a.rot) / 360); });
  pruefe('Reload: Lage, Grösse und Drehung aller Ebenen weichen höchstens 1 % ab', maxAbw <= 0.01, String(maxAbw));
  pruefe('Reload: Text, Farbe und Sticker-Name sind gleich', nachher.ebenen.front[0].text === 'Hallo Welt' && nachher.ebenen.front[0].color === '#b3122b' && nachher.ebenen.front[1].type === 'sticker' && nachher.ebenen.front[1].name === vorher.ebenen.front[1].name && nachher.ebenen.back[0].text === 'Hinten');
  pruefe('Reload: Foto kommt von der Druckdatei bei Cloudinary zurück, Originalgrösse 900, nicht «lädt hoch»', nachher.ebenen.front[2].printUrl === vorher.ebenen.front[2].printUrl && nachher.ebenen.front[2].ow === 900 && nachher.ebenen.front[2].uploading === false);
  pruefe('Reload: Ebenen sind auf der Bühne (Rückseite aktiv: ein Knoten)', (await p.locator('.lsp6-layer').count()) === 1);
  const msg = await status(p).innerText();
  pruefe('Reload: Hinweis «Entwurf wurde wiederhergestellt»', /Entwurf wurde wiederhergestellt/.test(msg), msg);
  await p.locator('.lsp6-tab[data-p="front"]').click();
  pruefe('Reload: Vorderseite zeigt 3 Knoten, das Foto ist geladen', (await p.locator('.lsp6-layer').count()) === 3 && (await p.locator('.lsp6-layer img').count()) === 2);   // Foto und Sticker sind Bilder, der Text nicht
  await p.waitForFunction(() => [...document.querySelectorAll('.lsp6-layer img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 });
  pruefe('Reload: alle Bilder der Bühne geladen', await p.evaluate(() => { const l = [...document.querySelectorAll('.lsp6-layer img')]; return l.length === 2 && l.every((i) => i.complete && i.naturalWidth > 0); }));
  const ids = await p.evaluate(() => { const e = window.LSPOD6.editors[0]; return [...e.st.ebenen.front, ...e.st.ebenen.back].map((x) => x.id); });
  await textHinzufuegen(p, 'Neu');
  const ids2 = await p.evaluate(() => { const e = window.LSPOD6.editors[0]; return [...e.st.ebenen.front, ...e.st.ebenen.back].map((x) => x.id); });
  pruefe('neue Ebenen bekommen nie eine schon vergebene ID', new Set(ids2).size === ids2.length && ids2.length === ids.length + 1, ids2.join(','));
  // Rückgängig geht auf den wiederhergestellten Stand zurück, nicht ins Leere
  await p.evaluate(() => window.LSPOD6.editors[0].zurueck());
  pruefe('Rückgängig nach dem Wiederherstellen entfernt nur die neue Ebene', (await p.evaluate(() => window.LSPOD6.editors[0].st.ebenen.front.length)) === 3);
  // Kauf: der Entwurf ist verbraucht
  await p.evaluate(() => { const e = window.LSPOD6.editors[0]; e.st.ebenen.back.length = 0; });
  await ctaKlicken(s);
  pruefe('nach dem Warenkorb ist der Entwurf gelöscht', (await p.evaluate((k) => localStorage.getItem(k), key)) === null);
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── Entwurf: fremde, alte, kaputte und halbe Entwürfe, Fotos ohne Upload, Tab-Wechsel ────────────────
szenario('entwurf-grenzen', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}`, cloudinaryVerzoegerung: (nr, art) => (art === 'png' && nr === 1 ? 6000 : 0) });
  await editorBereit(s.page);
  const p = s.page;
  const key = await p.evaluate(() => window.LSPOD6.editors[0].entwurfKey);
  // Der Speicher wird auf einer Seite OHNE Editor gesetzt (/cart): beim Verlassen der Editor-Seite sichert pagehide deren Stand und würde einen Eintrag sonst überschreiben
  const mockUrl = p.url();
  const vorbereiten = async (fn, arg) => { await p.goto(srv.url + '/cart'); await p.evaluate(fn, arg); await p.goto(mockUrl, { waitUntil: 'domcontentloaded' }); await editorBereit(p); };
  const setze = (obj, k = key) => vorbereiten(([kk, v]) => localStorage.setItem(kk, typeof v === 'string' ? v : JSON.stringify(v)), [k, obj]);
  const zahl = () => p.evaluate(() => Object.values(window.LSPOD6.editors[0].st.ebenen).reduce((a, l) => a + l.length, 0));
  const gut = { id: 'L1', type: 'text', text: 'Alt', font: "'Helvetica Neue',Arial,sans-serif", color: '#111111', cx: 0.5, cy: 0.4, scale: 0.5, rot: 0 };
  // a) Foto, das noch hochlädt, ist nicht im Entwurf; der Kunde erfährt es nach dem Neuladen
  await textHinzufuegen(p, 'Text bleibt');
  await p.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: pngErzeugen(900, 1200) });
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.ebenen.front.length === 2);
  await p.evaluate(() => window.LSPOD6.editors[0].entwurfSofort());
  const roh = JSON.parse(await p.evaluate((k) => localStorage.getItem(k), key));
  pruefe('Foto ohne fertigen Upload kommt nicht in den Entwurf (nur der Text), die Zahl der fehlenden steht dabei', roh.ebenen.front.length === 1 && roh.l === 1, JSON.stringify(roh.ebenen.front.map((x) => x.type)) + ' l=' + roh.l);
  await p.reload({ waitUntil: 'domcontentloaded' }); await editorBereit(p);
  pruefe('danach: Text zurück, Foto nicht, Hinweis nennt die nicht hochgeladenen Fotos', (await zahl()) === 1 && /nicht hochgeladen waren/.test(await status(p).innerText()), await status(p).innerText());
  // b) Grenzfälle des Speichers
  await setze({ v: 1, t: Date.now() - 8 * 24 * 3600 * 1000, aktiv: 'front', z: 1, ebenen: { front: [gut] } });
  pruefe('Entwurf älter als 7 Tage wird ignoriert und gelöscht', (await zahl()) === 0 && (await p.evaluate((k) => localStorage.getItem(k), key)) === null);
  await setze('{kein json');
  pruefe('kaputter Speicher (kein JSON): ignoriert, Editor läuft', (await zahl()) === 0 && await p.locator('.lsp6').isVisible());
  await setze({ v: 2, t: Date.now(), ebenen: { front: [gut] } });
  pruefe('unbekannte Version wird ignoriert', (await zahl()) === 0);
  await setze({ v: 1, t: Date.now(), z: 5, aktiv: 'front', ebenen: { front: [gut, { id: 'L2', type: 'image', printUrl: 'http://unsicher.example/x.png', aw: 100, cx: 0.5, cy: 0.5, scale: 1, rot: 0 }, { id: 'L3', type: 'text' }, { id: 'x', type: 'text', text: 'a', font: 'f', color: '#000', cx: 1, cy: 1, scale: 1, rot: 0 }, { id: 'L4', type: 'sticker', name: '../böse', cx: 0.5, cy: 0.5, scale: 1, rot: 0 }], gibtesnicht: [gut] } });
  pruefe('nur gültige Ebenen kommen zurück (kein http-Foto, kein Text ohne Felder, keine fremde ID, kein Sticker-Name mit Pfad, keine unbekannte Platzierung)', (await zahl()) === 1 && (await p.evaluate(() => window.LSPOD6.editors[0].st.ebenen.front[0].text)) === 'Alt');
  // c) Entwurf eines anderen Produkts wird nicht geladen
  await vorbereiten(([k, k2, v]) => { localStorage.removeItem(k); localStorage.setItem(k2, JSON.stringify(v)); }, [key, key.replace('|71', '|999'), { v: 1, t: Date.now(), z: 1, aktiv: 'front', ebenen: { front: [gut] } }]);
  pruefe('Entwurf unter dem Schlüssel eines anderen Modells wird nicht gelesen', (await zahl()) === 0);
  // d) Tab-Wechsel auf dem Handy: beim Verbergen der Seite sofort sichern (vor dem verzögerten Zeitgeber)
  await vorbereiten((k) => localStorage.removeItem(k), key);
  const sofort = await p.evaluate((k) => {
    const e = window.LSPOD6.editors[0];
    const x = e.neuerText('Schnell');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    return localStorage.getItem(k);
  }, key);
  pruefe('visibilitychange «hidden» sichert sofort (ohne die 400 ms abzuwarten)', !!sofort && JSON.parse(sofort).ebenen.front[0].text === 'Schnell', String(sofort));
  await p.evaluate((k) => { localStorage.removeItem(k); }, key);
  const sofort2 = await p.evaluate((k) => { window.dispatchEvent(new Event('pagehide')); return localStorage.getItem(k); }, key);
  pruefe('pagehide sichert ebenfalls sofort', !!sofort2 && JSON.parse(sofort2).ebenen.front.length === 1, String(sofort2));
  // e) alle Ebenen entfernt: der Entwurf verschwindet
  await p.evaluate(() => { const e = window.LSPOD6.editors[0]; e.entfernen(e.st.ebenen.front[0].id); });
  await p.waitForFunction((k) => localStorage.getItem(k) === null, key, { timeout: 5000 });
  pruefe('ohne Ebenen wird der Entwurf gelöscht', (await p.evaluate((k) => localStorage.getItem(k), key)) === null);
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── Entwurf: gesperrter Speicher (Privatfenster) darf nichts brechen ─────────────────────────────
szenario('entwurf-speicher-gesperrt', true, async (b, srv) => {
  const faelle = [
    ['Zugriff auf localStorage wirft (SecurityError)', "Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('verweigert', 'SecurityError'); } });"],
    ['setItem wirft (Speicher voll)', "Storage.prototype.setItem = function () { throw new DOMException('voll', 'QuotaExceededError'); };"],
    ['getItem und setItem werfen', "Storage.prototype.getItem = function () { throw new Error('kaputt'); }; Storage.prototype.setItem = function () { throw new Error('kaputt'); }; Storage.prototype.removeItem = function () { throw new Error('kaputt'); };"],
    ['localStorage ist null', "Object.defineProperty(window, 'localStorage', { configurable: true, value: null });"],
    ['localStorage fehlt ganz', "Object.defineProperty(window, 'localStorage', { configurable: true, value: undefined });"],
  ];
  for (const [name, skript] of faelle) {
    const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}`, initSkript: skript });
    await editorBereit(s.page);
    const p = s.page;
    pruefe(`${name}: Editor läuft im Modus «karte»`, (await p.locator('.lsp6').getAttribute('data-modus')) === 'karte');
    await textHinzufuegen(p, 'Hallo');
    await feldEingabe(p, 'X (cm)').fill('8'); await feldEingabe(p, 'X (cm)').press('Tab');
    await p.evaluate(() => window.LSPOD6.editors[0].entwurfSofort());
    await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });
    await p.waitForTimeout(600);
    await ctaKlicken(s);
    pruefe(`${name}: Kauf geht durch (Druckdatei, Warenkorb)`, s.warenkorb.length === 1 && /^https:/.test(s.warenkorb[0].properties[druckdateiSchluessel('front')] || ''));
    pruefe(`${name}: 0 Seitenfehler`, s.fehler.length === 0, s.fehler.join(' | '));
    await s.schliessen();
  }
});

// ── qd ist nur eine Angabe: es darf den Kauf nie wegen der 255 Zeichen von _pod_karte verhindern ─────────
szenario('qd-entfaellt-bei-255', true, async (b, srv) => {
  // Künstliche Karte mit n Platzierungen, auf jeder ein 600-px-Foto (100 dpi, über dem Mindestwert 75). Berechnet (Test unten prüft die Länge): n=19 ergibt mit qd 252 Zeichen (passt),
  // n=20 ergibt ohne qd 253, mit qd 262: dann entfällt qd, statt den Kauf mit «Zu viele Druckflächen» abzulehnen.
  for (const [n, mitQd] of [[19, true], [20, false]]) {
    const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=syn&n=${n}` });
    await editorBereit(s.page);
    const p = s.page;
    await p.evaluate(([src]) => { const e = window.LSPOD6.editors[0]; for (const id of Object.keys(e.st.ebenen)) { e.wechseln(id); e.neuesBild(src, 600, 600); } }, [dataUrl(600, 600)]);
    const wert = await p.evaluate(() => window.LSPOD6.editors[0].eigenschaften()._pod_karte);
    const pod = JSON.parse(wert);
    pruefe(`${n} Platzierungen mit Foto: _pod_karte höchstens 255 Zeichen, qd ${mitQd ? 'steht (100)' : 'entfällt'}`, wert.length <= 255 && pod.pl.length === n && (mitQd ? pod.qd === 100 : !('qd' in pod)), `${wert.length}: ${wert}`);
    pruefe(`${n} Platzierungen: die Sperre im Editor gilt unabhängig von qd (Kauf frei, weil 100 dpi über 75)`, !(await gesperrt(p)));
    await ctaKlicken(s);
    const pr = s.warenkorb[0].properties;
    pruefe(`${n} Platzierungen: der Kauf geht durch (Warenkorb mit ${n} Druckdateien)`, Object.keys(pr).filter((k) => /Druckdatei/.test(k)).length === n && druckdateiZeilen(pr).length === n, JSON.stringify(Object.keys(pr).length));
    parserPruefe(pruefe, `${n} Platzierungen: der Parser der Bestellstrecke liest sie ohne Befund`, () => { const g = dateienAusEigenschaften(pr); return { ok: g.dateien.length === n && g.probleme.length === 0, detail: JSON.stringify(g.probleme) }; });
    await s.schliessen();
  }
});

// ── Korrekturrunde 06.11.2026: kleine Funde der Gegenleser (Entwurf mit fremden Schlüsseln, Optik der Sperre, Sperre nach Variantenwechsel, qd abgerundet) ───────
szenario('entwurf-fremde-schluessel', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  const key = await p.evaluate(() => window.LSPOD6.editors[0].entwurfKey);
  const mockUrl = p.url();
  const ebene = (id, text) => ({ id, type: 'text', cx: 0.5, cy: 0.5, scale: 1, rot: 0, text, font: 'Modern Sans', color: '#111111' });
  // Der Speicher wird auf einer Seite ohne Editor gesetzt (beim Verlassen sichert pagehide sonst den Stand der Editor-Seite)
  async function mitEintrag(roh) {
    await p.goto(srv.url + '/cart'); await p.evaluate(([k, v]) => localStorage.setItem(k, v), [key, roh]);
    await p.goto(mockUrl, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.lspod-designer-v6[data-init-v6]', { timeout: 15000 });
    return p.evaluate(() => { const c = document.querySelector('.lspod-designer-v6'); const e = window.LSPOD6.editors[0]; return { init: c.getAttribute('data-init-v6'), editor: !!document.querySelector('.lsp6'), ebenen: e ? Object.fromEntries(Object.entries(e.st.ebenen).map(([k, v]) => [k, v.length])) : null }; });
  }
  // JSON.parse legt «__proto__» als EIGENEN Schlüssel an; der Editor-Bau stürzte bei st.ebenen['__proto__'].push ab (data-init-v6 = err, kein Editor, der Fehler kam bei jedem Neuladen wieder)
  const roh = `{"v":1,"t":${Date.now()},"aktiv":"front","z":3,"l":0,"ebenen":{"__proto__":[${JSON.stringify(ebene('L1', 'Falle'))}],"constructor":[${JSON.stringify(ebene('L2', 'Falle'))}],"toString":[${JSON.stringify(ebene('L3', 'Falle'))}],"hasOwnProperty":[],"front":[${JSON.stringify(ebene('L4', 'Echt'))}]}}`;
  const r = await mitEintrag(roh);
  pruefe('Entwurf mit Schlüsseln «__proto__», «constructor», «toString»: Editor baut sich trotzdem (data-init-v6 = 1, Oberfläche da)', r.init === '1' && r.editor, JSON.stringify(r));
  pruefe('die echte Platzierung «front» wird wiederhergestellt, die fremden Schlüssel nicht (keine Ebene in anderen Platzierungen)', r.ebenen && r.ebenen.front === 1 && Object.entries(r.ebenen).filter(([k]) => k !== 'front').every(([, v]) => v === 0), JSON.stringify(r.ebenen));
  pruefe('der Text der echten Ebene ist da', (await p.evaluate(() => window.LSPOD6.editors[0].st.ebenen.front[0].text)) === 'Echt');
  // eine Platzierung, die nur ein Objekt statt einer Liste trägt
  const r2 = await mitEintrag(`{"v":1,"t":${Date.now()},"aktiv":"front","z":1,"l":0,"ebenen":{"front":{"0":${JSON.stringify(ebene('L1', 'x'))}},"back":"nein"}}`);
  pruefe('Platzierung mit Objekt oder Zeichenkette statt Liste: Editor baut sich, keine Ebenen', r2.init === '1' && r2.editor && Object.values(r2.ebenen).every((v) => v === 0), JSON.stringify(r2));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

szenario('kaufsperre-optik', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  const stil = () => p.locator('.lsp6-cta').evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, cursor: c.cursor, opacity: c.opacity, inline: e.style.opacity }; });
  const frei = await stil();
  await fotoLegen(p, 300, 300);
  pruefe('Kauf gesperrt: der Knopf sieht gesperrt aus (graue Fläche, Sperr-Zeiger), nicht wie im freien Zustand', (await gesperrt(p)) && (await stil()).bg !== frei.bg && (await stil()).cursor === 'not-allowed' && frei.cursor === 'pointer', JSON.stringify([frei, await stil()]));
  // Nach einem abgelehnten Klick bleibt die Optik (der Klick setzt keinen Inline-Stil, der sie überdeckt)
  await p.locator('.lsp6-cta').click({ force: true });
  const nachKlick = await stil();
  pruefe('nach dem Klick auf den gesperrten Kauf: Optik unverändert, kein Inline-Stil auf dem Knopf', nachKlick.bg === (await stil()).bg && nachKlick.cursor === 'not-allowed' && nachKlick.inline === '', JSON.stringify(nachKlick));
  // Sperre löst sich: wieder wie vorher
  await p.evaluate(() => { const e = window.LSPOD6.editors[0]; e.st.ebenen.front.slice().forEach((x) => e.entfernen(x.id)); });
  await p.mouse.move(2, 2);   // der Zeiger steht nach dem Klick noch auf dem Knopf (Hover-Farbe)
  const wieder = await stil();
  pruefe('Sperre aufgehoben: Optik wie am Anfang', !(await gesperrt(p)) && wieder.bg === frei.bg && wieder.cursor === 'pointer', JSON.stringify(wieder));
  // Nach einem Fehler beim Kauf (Warenkorb lehnt ab) wird der Knopf wieder frei und trägt keinen Inline-Stil, der eine spätere Sperre überdecken würde
  await s.schliessen();
  const w = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}`, warenkorbFehler: true });
  await editorBereit(w.page);
  await textHinzufuegen(w.page, 'Hallo');
  await w.page.locator('.lsp6-cta').click();
  await w.page.waitForFunction(() => !document.querySelector('.lsp6-cta').disabled && /mock-warenkorb-fehler/.test(document.querySelector('[data-feld="status"]').textContent), null, { timeout: 20000 });
  pruefe('nach einem abgelehnten Warenkorb: Knopf frei, ohne Inline-Deckkraft', await w.page.locator('.lsp6-cta').evaluate((e) => !e.disabled && e.style.opacity === ''));
  await fotoLegen(w.page, 300, 300);
  const spaet = await w.page.locator('.lsp6-cta').evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, cursor: c.cursor }; });
  pruefe('danach gesperrt: der Knopf sieht trotzdem gesperrt aus', (await gesperrt(w.page)) && spaet.cursor === 'not-allowed' && spaet.bg !== frei.bg, JSON.stringify(spaet));
  pruefe('keine Seitenfehler', w.fehler.length === 0, w.fehler.join(' | '));
  await w.schliessen();
});

szenario('sperre-nach-variantenwechsel', true, async (b, srv) => {
  // Tasse: ein 700-px-Foto (Massstab 1) hat auf der 11-oz-Druckdatei (2700 px) rund 155 dpi, auf der 20-oz-Datei (breiter) weniger als den Mindestwert 150
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=19&shop=1001:1320,1002:4830,1003:16586&varianten=1001:11 oz,1002:15 oz,1003:20 oz' });
  await editorBereit(s.page);
  const p = s.page;
  const box = p.locator('[data-feld="qualitaet"]');
  await fotoLegen(p, 700, 700);
  await p.evaluate(() => window.LSPOD6.editors[0].waehlen(null));   // keine Ebene gewählt
  pruefe('11 oz: Foto genügt, keine Sperre', (await box.isHidden()) && !(await gesperrt(p)));
  await p.locator('input[name="id"][value="1003"]').check();
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.shopVariante === '1003');
  await p.waitForTimeout(300);
  const sperreModell = await p.evaluate(() => window.LSPOD6.editors[0].qualitaetSperre());
  pruefe('Vorbedingung: für 20 oz berechnet der Editor eine Sperre', !!sperreModell, String(sperreModell));
  pruefe('Wechsel auf 20 oz OHNE gewählte Ebene: Meldung und Sperre erscheinen sofort, nicht erst nach dem Klick', (await box.isVisible()) && (await gesperrt(p)) && (await box.innerText()) === sperreModell, `${await box.isVisible()} ${await gesperrt(p)}`);
  await p.locator('input[name="id"][value="1001"]').check();
  await p.waitForFunction(() => window.LSPOD6.editors[0].st.shopVariante === '1001');
  await p.waitForTimeout(300);
  pruefe('zurück auf 11 oz: Meldung und Sperre verschwinden', (await box.isHidden()) && !(await gesperrt(p)));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

szenario('qd-abgerundet', true, async (b, srv) => {
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: `karte=71&${SHOP71}` });
  await editorBereit(s.page);
  const p = s.page;
  // T-Shirt vorne: 6 Zoll breit bei Massstab 1; 700 px ergeben 116,67 dpi, abgerundet 116 (Runden gäbe 117)
  await fotoLegen(p, 700, 700);
  const lage = await p.evaluate(() => window.LSPOD6.editors[0].qualitaetLage().min);
  pruefe('Vorbedingung: das Foto hat 116,67 dpi (Nachkommastellen über ,5)', lage > 116.5 && lage < 116.9, String(lage));
  await textHinzufuegen(p, 'x');
  await ctaKlicken(s);
  const pod = JSON.parse(s.warenkorb[0].properties._pod_karte);
  pruefe('_pod_karte.qd ist abgerundet (116), nie gerundet (117): sonst stünde ein besserer Wert als die Datei trägt', pod.qd === 116, JSON.stringify(pod));
  pruefe('keine Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  await s.schliessen();
});

// ── Lauf ────────────────────────────────────────────────────────────────────────────────────────
const srv = await starteServer();
const browser = await chromium.launch();
const auswahl = szenarien.filter((x) => (nur === 'kern' ? x.kern : !nur || x.name.startsWith(nur)));
for (const sz of auswahl) {
  const t0 = Date.now();
  const vorher = fehler.length;
  try { await sz.fn(browser, srv); } catch (e) { n++; fehler.push(`${sz.name}: Ausnahme ${e.message.split('\n')[0]}`); console.log(`  ✗ ${sz.name}: Ausnahme ${e.message.split('\n').slice(0, 3).join(' / ')}`); if (process.env.V6_ABBRUCH) process.exit(1); }
  console.log(`${fehler.length === vorher ? '✓' : '✗'} ${sz.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
await browser.close(); await srv.stop();
console.log(fehler.length ? `\n${fehler.length} von ${n} Prüfungen FEHLGESCHLAGEN` : `\n${n} Prüfungen bestanden`);
if (parserBericht()) console.log(parserBericht());
process.exit(fehler.length ? 1 : 0);
