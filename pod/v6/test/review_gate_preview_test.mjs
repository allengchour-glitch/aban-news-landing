/**
 * Browser-Pruefung fuer das 6.3-Review-Gate: ehrlicher Produktbild-Rueckfall,
 * unveraenderte Druckdatei, keine Bestellung vor Zustimmung und Entwertung
 * einer offenen Pruefung nach Design- oder Variantenwechsel.
 *
 * Aufruf: node review_gate_preview_test.mjs
 */
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
process.env.V6_DATEI = process.env.V6_DATEI || join(hier, '..', 'lspod-designer-v6-6.3.1.js');   // fest auf 6.3.1 (Rollout-Stand); mit V6_DATEI=…6.4.0.js und V6_VERSION=6.4.0 läuft derselbe Test gegen 6.4.0
process.env.V6_VERSION = process.env.V6_VERSION || '6.3.1';

// lib.mjs liest V6_DATEI beim Import. Darum muss der Import nach obiger Auswahl erfolgen.
const {
  playwright, starteServer, seiteOeffnen, editorBereit, geisterPng,
} = await import('./lib.mjs');

const { chromium } = playwright();
const SHOP = 'shop=1001:4012,1002:4020,1003:4045';
const TSHIRT = `karte=71&${SHOP}&vorschau=71`;
const OHNE_VORSCHAUDATEN = `karte=71&${SHOP}`;
const FALLBACK_TEXT = 'Produktansicht nicht verfügbar. Die gezeigte Druckdatei ist massgebend.';

let pruefungen = 0;
const fehler = [];

function pruefe(name, ok, detail = '') {
  pruefungen++;
  if (ok) return;
  const ausgabe = `${name}${detail ? `: ${detail}` : ''}`;
  fehler.push(ausgabe);
  console.log(`  ✗ ${ausgabe}`);
}

async function szenario(name, fn) {
  const vorher = fehler.length;
  try {
    await fn();
  } catch (err) {
    pruefe(`${name} läuft ohne Ausnahme`, false, err && err.stack ? err.stack : String(err));
  }
  console.log(`${fehler.length === vorher ? '✓' : '✗'} ${name}`);
}

async function oeffnen(browser, server, query, opt = {}) {
  const sitzung = await seiteOeffnen(browser, server.url, {
    breite: 1440,
    hoehe: 900,
    ...opt,
    query,
  });
  await editorBereit(sitzung.page);
  if (query.includes('vorschau=')) {
    await sitzung.page.waitForSelector('[data-feld="sicht"]:not([hidden])', { timeout: 10000 });
  }
  return sitzung;
}

async function textHinzufuegen(page, text = 'Review-Gate') {
  await page.getByRole('button', { name: '➕ Text' }).click();
  await page.locator('.lsp6-text').fill(text);
}

async function bildGeladen(bild, name) {
  await bild.waitFor({ state: 'visible', timeout: 20000 });
  await bild.page().waitForFunction((element) => element.complete && element.naturalWidth > 0, await bild.elementHandle(), { timeout: 10000 });
  const groesse = await bild.evaluate((element) => ({
    breite: element.naturalWidth,
    hoehe: element.naturalHeight,
  }));
  pruefe(`${name} ist geladen`, groesse.breite > 0 && groesse.hoehe > 0, JSON.stringify(groesse));
  return groesse;
}

async function reviewOeffnen(page) {
  await page.locator('.lsp6-cta').click();
  const modal = page.locator('[data-lsp6-review="1"]');
  await modal.waitFor({ state: 'visible', timeout: 20000 });
  const druck = modal.locator('[data-review-print="front"]');
  const groesse = await bildGeladen(druck, 'Druckdatei');
  pruefe('Druckdatei hat die exakte Zielgrösse', groesse.breite === 1800 && groesse.hoehe === 2400, `${groesse.breite} × ${groesse.hoehe}`);
  pruefe('Review nennt die exakte Zielgrösse', (await modal.locator('[data-review-placement="front"] .lsp6-review-meta').innerText()).includes('1800 × 2400 px'));
  return { modal, druck };
}

async function blobHash(bild) {
  return bild.evaluate(async (element) => {
    const antwort = await fetch(element.src);
    const inhalt = await antwort.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', inhalt);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  });
}

async function fallbackPruefen(review, sitzung, name) {
  const fallback = review.modal.locator('[data-review-fallback="front"]');
  await fallback.waitFor({ state: 'visible', timeout: 10000 });
  pruefe(`${name}: ehrlicher Rückfalltext`, (await fallback.innerText()).trim() === FALLBACK_TEXT, await fallback.innerText());
  pruefe(`${name}: kein erfundenes Produktbild`, await review.modal.locator('[data-review-product="front"]').count() === 0);
  pruefe(`${name}: kein Upload vor Zustimmung`, sitzung.uploads.length === 0, `Uploads=${sitzung.uploads.length}`);
  pruefe(`${name}: kein Warenkorb vor Zustimmung`, sitzung.warenkorb.length === 0, `POSTs=${sitzung.warenkorb.length}`);
}

async function zurueck(review) {
  await review.modal.locator('.lsp6-review-back').click();
  await review.modal.waitFor({ state: 'detached', timeout: 5000 });
}

function ohneSeitenfehler(sitzung, name) {
  pruefe(`${name}: keine Seitenfehler`, sitzung.fehler.length === 0, sitzung.fehler.join(' | '));
}

let server;
let browser;
try {
  server = await starteServer();
  browser = await chromium.launch({ headless: true });

  await szenario('keine Vorschaudaten: Gate und exakt hochgeladene Druckdatei', async () => {
    const sitzung = await oeffnen(browser, server, OHNE_VORSCHAUDATEN);
    try {
      await textHinzufuegen(sitzung.page, 'Exakte Druckdatei');
      const review = await reviewOeffnen(sitzung.page);
      await fallbackPruefen(review, sitzung, 'Ohne Vorschaudaten');
      const hashImReview = await blobHash(review.druck);
      const checkbox = review.modal.locator('.lsp6-review-accept');
      const bestaetigen = review.modal.locator('.lsp6-review-confirm');

      pruefe('Bestätigung ist ohne Checkbox gesperrt', await bestaetigen.isDisabled());
      await checkbox.check();
      pruefe('Checkbox allein startet keinen Upload', sitzung.uploads.length === 0, `Uploads=${sitzung.uploads.length}`);
      pruefe('Checkbox allein schreibt keinen Warenkorb', sitzung.warenkorb.length === 0, `POSTs=${sitzung.warenkorb.length}`);
      pruefe('Bestätigung wird erst nach Checkbox frei', await bestaetigen.isEnabled());

      await Promise.all([
        sitzung.page.waitForURL('**/cart', { timeout: 20000 }),
        bestaetigen.click(),
      ]);
      const pngUploads = sitzung.uploads.filter((upload) => upload.typ === 'png');
      pruefe('Bestätigung erzeugt genau einen Druckdatei-Upload', pngUploads.length === 1, JSON.stringify(sitzung.uploads));
      pruefe('Bestätigung erzeugt genau einen Warenkorb-POST', sitzung.warenkorb.length === 1, `POSTs=${sitzung.warenkorb.length}`);
      if (pngUploads.length === 1) {
        const hochgeladen = sitzung.png(pngUploads[0].url);
        const hashImUpload = hochgeladen && createHash('sha256').update(hochgeladen).digest('hex');
        pruefe('Upload ist bytegenau die im Review gezeigte Druckdatei', hashImUpload === hashImReview, `Review=${hashImReview} Upload=${hashImUpload}`);
        pruefe('Upload behält die Zielgrösse', pngUploads[0].breite === 1800 && pngUploads[0].hoehe === 2400, `${pngUploads[0].breite} × ${pngUploads[0].hoehe}`);
      }
      ohneSeitenfehler(sitzung, 'Ohne Vorschaudaten');
    } finally {
      await sitzung.schliessen();
    }
  });

  await szenario('fehlendes Produktbild zeigt ehrlichen Rückfall', async () => {
    const sitzung = await oeffnen(browser, server, TSHIRT, {
      shopifyBild: (url) => (/luxe-vorschau-/.test(url) ? { status: 404 } : null),
    });
    try {
      await textHinzufuegen(sitzung.page);
      const review = await reviewOeffnen(sitzung.page);
      await fallbackPruefen(review, sitzung, 'Fehlendes Produktbild');
      await zurueck(review);
      pruefe('Zurück aus dem Review startet keinen Upload', sitzung.uploads.length === 0);
      pruefe('Zurück aus dem Review schreibt keinen Warenkorb', sitzung.warenkorb.length === 0);
      ohneSeitenfehler(sitzung, 'Fehlendes Produktbild');
    } finally {
      await sitzung.schliessen();
    }
  });

  await szenario('CORS-Fehler zeigt ehrlichen Rückfall', async () => {
    const sitzung = await oeffnen(browser, server, `${TSHIRT}&spiegel=0`, {
      printfulBild: (url) => (/\/m\//.test(url) ? { typ: 'image/png', body: geisterPng(), cors: false } : null),
      corsErwartet: true,
    });
    try {
      await textHinzufuegen(sitzung.page);
      const review = await reviewOeffnen(sitzung.page);
      await fallbackPruefen(review, sitzung, 'CORS-Fehler');
      await zurueck(review);
      ohneSeitenfehler(sitzung, 'CORS-Fehler');
    } finally {
      await sitzung.schliessen();
    }
  });

  await szenario('vorhandene Vorschau zeigt das Produktbild', async () => {
    const sitzung = await oeffnen(browser, server, TSHIRT);
    try {
      await textHinzufuegen(sitzung.page);
      const review = await reviewOeffnen(sitzung.page);
      const produkt = review.modal.locator('[data-review-product="front"]');
      const groesse = await bildGeladen(produkt, 'Produktbild');
      pruefe('Produktbild stammt aus dem 800-px-Vorschau-Export', groesse.breite === 800 && groesse.hoehe === 800, `${groesse.breite} × ${groesse.hoehe}`);
      pruefe('Bei Produktbild gibt es keinen Rückfalltext', await review.modal.locator('[data-review-fallback="front"]').count() === 0);
      pruefe('Vorschau allein startet keinen Upload', sitzung.uploads.length === 0);
      pruefe('Vorschau allein schreibt keinen Warenkorb', sitzung.warenkorb.length === 0);
      await zurueck(review);
      ohneSeitenfehler(sitzung, 'Vorhandene Vorschau');
    } finally {
      await sitzung.schliessen();
    }
  });

  await szenario('mobile Druckprüfung zeigt beide Bilder proportional und auf Deutsch', async () => {
    const sitzung = await oeffnen(browser, server, TSHIRT, { breite: 390, hoehe: 844, mobil: true });
    try {
      await textHinzufuegen(sitzung.page, 'Mobile Druckprüfung');
      const review = await reviewOeffnen(sitzung.page);
      const layout = await review.modal.evaluate((modal) => {
        const panel = modal.querySelector('.lsp6-review-panel');
        const bilder = [...modal.querySelectorAll('.lsp6-review-img')].map((bild) => {
          const box = bild.getBoundingClientRect();
          return {
            breite: box.width,
            hoehe: box.height,
            naturBreite: bild.naturalWidth,
            naturHoehe: bild.naturalHeight,
          };
        });
        const spalten = getComputedStyle(modal.querySelector('.lsp6-review-pics')).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
        return {
          spalten: spalten.length,
          bilder,
          horizontalerUeberlauf: panel.scrollWidth - panel.clientWidth,
          text: modal.innerText,
        };
      });
      pruefe('Mobile Prüfung stapelt Druckdatei und Produktansicht', layout.spalten === 1, JSON.stringify(layout));
      pruefe('Mobile Bilder nutzen die verfügbare Kartenbreite', layout.bilder.length === 2 && layout.bilder.every((bild) => bild.breite >= 300), JSON.stringify(layout.bilder));
      pruefe('Druckdatei behält ihr Seitenverhältnis', Math.abs(layout.bilder[0].breite / layout.bilder[0].hoehe - layout.bilder[0].naturBreite / layout.bilder[0].naturHoehe) < 0.01, JSON.stringify(layout.bilder[0]));
      pruefe('Produktansicht behält ihr Seitenverhältnis', Math.abs(layout.bilder[1].breite / layout.bilder[1].hoehe - layout.bilder[1].naturBreite / layout.bilder[1].naturHoehe) < 0.01, JSON.stringify(layout.bilder[1]));
      pruefe('Mobile Prüfung hat keinen horizontalen Überlauf', layout.horizontalerUeberlauf <= 1, String(layout.horizontalerUeberlauf));
      pruefe('Deutsche Prüfung zeigt keine englischen Bedientexte', !/(Review print preview|Binding print file|On the product|Keep designing|Confirm print preview|Print areas)/.test(layout.text), layout.text);
      await zurueck(review);
      ohneSeitenfehler(sitzung, 'Mobile Druckprüfung');
    } finally {
      await sitzung.schliessen();
    }
  });

  await szenario('Designänderung entwertet den alten Review', async () => {
    const sitzung = await oeffnen(browser, server, OHNE_VORSCHAUDATEN);
    try {
      await textHinzufuegen(sitzung.page, 'Stand A');
      const alt = await reviewOeffnen(sitzung.page);
      const alterHash = await blobHash(alt.druck);
      await sitzung.page.evaluate(() => {
        const editor = window.LSPOD6.editors[0];
        const ebene = editor.st.ebenen.front[0];
        editor.waehlen(ebene.id);
        editor.ui.textfeld.value = 'Stand B';
        editor.ui.textfeld.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await alt.modal.waitFor({ state: 'detached', timeout: 5000 });
      const status = await sitzung.page.locator('.lsp6-status').innerText();
      pruefe('Designänderung entfernt den alten Review', await sitzung.page.locator('[data-lsp6-review="1"]').count() === 0);
      pruefe('Designänderung fordert erneute Prüfung', /geändert.*erneut/i.test(status), status);
      pruefe('Designänderung startet keinen Upload', sitzung.uploads.length === 0);
      pruefe('Designänderung schreibt keinen Warenkorb', sitzung.warenkorb.length === 0);

      const neu = await reviewOeffnen(sitzung.page);
      const neuerHash = await blobHash(neu.druck);
      pruefe('Erneute Prüfung zeigt die geänderte Druckdatei', neuerHash !== alterHash, `alt=${alterHash} neu=${neuerHash}`);
      await zurueck(neu);
      ohneSeitenfehler(sitzung, 'Designänderung');
    } finally {
      await sitzung.schliessen();
    }
  });

  await szenario('Entwertung nach Druckdatei verhindert alten Vorschau-Upload', async () => {
    const sitzung = await oeffnen(browser, server, TSHIRT, {
      // Die Mutation läuft als Microtask nach der Antwort des letzten (hier einzigen)
      // Druckdatei-Uploads und damit vor der nächsten Promise-Stufe, die sonst das
      // optionale Produkt-JPEG senden würde.
      initSkript: `(() => {
        const original = window.fetch.bind(window);
        let cloudinaryAntworten = 0;
        window.fetch = function(input, init) {
          const url = typeof input === 'string' ? input : (input && input.url) || '';
          const antwort = original(input, init);
          if (!url.includes('api.cloudinary.com')) return antwort;
          return antwort.then((wert) => {
            cloudinaryAntworten += 1;
            if (cloudinaryAntworten === 1) queueMicrotask(() => {
              const editor = window.LSPOD6 && window.LSPOD6.editors && window.LSPOD6.editors[0];
              const ebene = editor && editor.st.ebenen.front[0];
              if (!editor || !ebene) return;
              editor.waehlen(ebene.id);
              editor.ui.textfeld.value += ' entwertet';
              editor.ui.textfeld.dispatchEvent(new Event('input', { bubbles: true }));
              window.__lsp63ReviewRaceInvalidiert = true;
            });
            return wert;
          });
        };
      })();`,
    });
    try {
      await textHinzufuegen(sitzung.page, 'Race vor Vorschau');
      const review = await reviewOeffnen(sitzung.page);
      pruefe('Race-Test hat ein echtes Produktvorschaubild', await review.modal.locator('[data-review-product="front"]').count() === 1);
      await review.modal.locator('.lsp6-review-accept').check();
      await review.modal.locator('.lsp6-review-confirm').click();
      await sitzung.page.waitForFunction(() => window.__lsp63ReviewRaceInvalidiert === true, null, { timeout: 10000 });
      await sitzung.page.waitForFunction(() => /geändert.*erneut/i.test(document.querySelector('.lsp6-status')?.textContent || ''), null, { timeout: 10000 });
      await sitzung.page.waitForTimeout(250);

      pruefe('Race-Test sendet nur die bereits gestartete PNG-Druckdatei', sitzung.uploads.length === 1 && sitzung.uploads[0].typ === 'png', JSON.stringify(sitzung.uploads));
      pruefe('Race-Test startet keinen alten Produktvorschau-Upload', !sitzung.uploads.some((upload) => upload.typ === 'jpeg'), JSON.stringify(sitzung.uploads));
      pruefe('Race-Test schreibt keinen Warenkorb', sitzung.warenkorb.length === 0, `POSTs=${sitzung.warenkorb.length}`);
      const versteckt = await sitzung.page.locator('input[data-lspod6="1"]').evaluateAll((felder) => felder.map((feld) => ({ name: feld.name, value: feld.value })));
      pruefe('Race-Test entfernt alte Druckdatei- und Vorschau-Felder', !versteckt.some((feld) => /Druckdatei|_vorschau/.test(feld.name)), JSON.stringify(versteckt));
      ohneSeitenfehler(sitzung, 'Race vor Vorschau');
    } finally {
      await sitzung.schliessen();
    }
  });

  await szenario('Variantenänderung entwertet den alten Review', async () => {
    const sitzung = await oeffnen(browser, server, TSHIRT);
    try {
      await textHinzufuegen(sitzung.page);
      const alt = await reviewOeffnen(sitzung.page);
      const alteSumme = await alt.modal.locator('[data-review-summary="1"]').innerText();
      await sitzung.page.evaluate(() => {
        const radio = document.querySelector('input[name="id"][value="1002"]');
        radio.checked = true;
        window.LSPOD6.editors[0].varianteGeprueft();
      });
      await alt.modal.waitFor({ state: 'detached', timeout: 5000 });
      const status = await sitzung.page.locator('.lsp6-status').innerText();
      pruefe('Variantenänderung entfernt den alten Review', await sitzung.page.locator('[data-lsp6-review="1"]').count() === 0);
      pruefe('Variantenänderung fordert erneute Prüfung', /geändert.*erneut/i.test(status), status);
      pruefe('Variantenänderung startet keinen Upload', sitzung.uploads.length === 0);
      pruefe('Variantenänderung schreibt keinen Warenkorb', sitzung.warenkorb.length === 0);

      const neu = await reviewOeffnen(sitzung.page);
      const neueSumme = await neu.modal.locator('[data-review-summary="1"]').innerText();
      pruefe('Erneuter Review zeigt die neue Variante', neueSumme !== alteSumme && /Schwarz/i.test(neueSumme), `alt=${JSON.stringify(alteSumme)} neu=${JSON.stringify(neueSumme)}`);
      await zurueck(neu);
      ohneSeitenfehler(sitzung, 'Variantenänderung');
    } finally {
      await sitzung.schliessen();
    }
  });
} catch (err) {
  pruefe('Browser-Testumgebung startet', false, err && err.stack ? err.stack : String(err));
} finally {
  if (browser) await browser.close();
  if (server) await server.stop();
}

if (fehler.length) {
  console.error(`\n${fehler.length} von ${pruefungen} Prüfungen fehlgeschlagen.`);
  process.exitCode = 1;
} else {
  console.log(`\n${pruefungen} Prüfungen bestanden.`);
}
