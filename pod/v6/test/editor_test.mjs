/**
 * Browser-Tests (Playwright, Chromium) für den Editor v6 gegen die lokale Mock-Seite test/mock.html mit Karten aus echten Printful-Katalogdaten:
 * T-Shirt 71 (mehrere Platzierungen), Tasse 19, Poster 268, Dad-Cap 206 (Stickerei), Allover-Hoodie 388 (Schnittteile).
 * Netz: nur der lokale Server; Cloudinary, Printful-CDN und Sticker sind Attrappen (lib.mjs). Die Attrappe von Cloudinary liest die hochgeladenen
 * PNG-Dateien, damit die Pixelgrösse der Druckdatei am IHDR gemessen werden kann.
 * Aufruf: node editor_test.mjs [Teil]   (Teil: Name oder Anfang eines Szenarios; ohne Angabe alle; «kern» = die schnellen für die Mutationsprobe)
 * Umgebung: V6_BILDCACHE (Ordner mit Vorlagenbildern, optional), V6_DATEI (andere Fassung des Editors, für die Mutationsprobe).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { playwright, starteServer, seiteOeffnen, editorBereit, pngErzeugen, hier } from './lib.mjs';

const { chromium } = playwright();
let n = 0; const fehler = [];
function pruefe(name, ok, detail = '') { n++; if (!ok) { fehler.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`); } }
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
  pruefe('Eigenschaft «🖼️ Druckdatei (front)» mit https-Adresse', /^https:\/\//.test(pr['\u{1F5BC}️ Druckdatei (front)'] || ''), Object.keys(pr).join('|'));
  pruefe('Eigenschaft «🎨 Design (front)»', pr['\u{1F3A8} Design (front)'] === 'Text: "Hallo"', pr['\u{1F3A8} Design (front)']);
  pruefe('genau drei Eigenschaften (Design, Druckdatei, _pod_karte)', Object.keys(pr).length === 3, Object.keys(pr).join('|'));
  const pod = JSON.parse(pr._pod_karte);
  pruefe('_pod_karte: Modell 71, Version 6, Schema 1', pod.m === 71 && pod.v === 6 && pod.s === 1);
  pruefe('_pod_karte: Printful-Variante 4012 und Shopify-Variante «1001»', pod.pv === 4012 && pod.sv === '1001', JSON.stringify(pod));
  pruefe('_pod_karte: Platzierung front mit Dateityp default, Pixel 1800x2400, Aufpreis 0', JSON.stringify(pod.pl) === '["front"]' && pod.dt.front === 'default' && JSON.stringify(pod.px) === '["1800x2400"]' && pod.ap === 0, pr._pod_karte);
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
  pruefe('Eigenschaften je Platzierung (front_large und back, nicht front)', !!pr['\u{1F5BC}\uFE0F Druckdatei (front_large)'] && !!pr['\u{1F5BC}\uFE0F Druckdatei (back)'] && !pr['\u{1F5BC}\uFE0F Druckdatei (front)'], Object.keys(pr).join('|'));
  pruefe('zwei verschiedene Adressen', pr['\u{1F5BC}\uFE0F Druckdatei (front_large)'] !== pr['\u{1F5BC}\uFE0F Druckdatei (back)']);
  const pod = JSON.parse(pr._pod_karte);
  pruefe('_pod_karte: Platzierungen, Pixel, Aufpreis 12.2, kein «dt» (Dateityp = ID)', JSON.stringify(pod.pl) === '["front_large","back"]' && JSON.stringify(pod.px) === '["2250x2700","1800x2400"]' && pod.ap === 12.2 && !('dt' in pod), pr._pod_karte);
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
  const cap = await p.locator('[data-feld="cap"]').innerText();
  pruefe('Hinweis: Druckdatei auf 4096 × 4096 begrenzt', /4096 × 4096/.test(cap), cap);
  await tab(p, 'Kapuze').click();
  await textHinzufuegen(p, 'Kapuze');
  await tab(p, 'Vorderseite').click();
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
  const s = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=268' });
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
  await s.schliessen();
  const s2 = await seiteOeffnen(b, srv.url, { ...PC, query: 'karte=268&maxpx=0' });
  await editorBereit(s2.page);
  await textHinzufuegen(s2.page, 'Poster');
  await Promise.all([s2.page.waitForURL('**/cart', { timeout: 120000 }), s2.page.locator('.lsp6-cta').click()]);
  const u2 = s2.uploads[0];
  pruefe('data-max-px=0: echte Pixelgrösse 9933 × 7016 (69,7 Mpx) wird in Chromium erzeugt', u2 && u2.breite === 9933 && u2.hoehe === 7016, JSON.stringify(u2));
  await s2.schliessen();
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

// ── Lauf ────────────────────────────────────────────────────────────────────────────────────────
const srv = await starteServer();
const browser = await chromium.launch();
const auswahl = szenarien.filter((x) => (nur === 'kern' ? x.kern : !nur || x.name.startsWith(nur)));
for (const sz of auswahl) {
  const t0 = Date.now();
  const vorher = fehler.length;
  try { await sz.fn(browser, srv); } catch (e) { n++; fehler.push(`${sz.name}: Ausnahme ${e.message.split('\n')[0]}`); console.log(`  ✗ ${sz.name}: Ausnahme ${e.message.split('\n').slice(0, 3).join(' / ')}`); }
  console.log(`${fehler.length === vorher ? '✓' : '✗'} ${sz.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
await browser.close(); await srv.stop();
console.log(fehler.length ? `\n${fehler.length} von ${n} Prüfungen FEHLGESCHLAGEN` : `\n${n} Prüfungen bestanden`);
process.exit(fehler.length ? 1 : 0);
