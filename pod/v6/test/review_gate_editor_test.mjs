/**
 * Browser-Vertrag fuer die verbindliche Druckpruefung des Editors v6.3.1.
 * Die im Dialog gezeigten PNG-Blobs werden bytegenau gegen die spaeteren Uploads geprueft.
 *
 * Aufruf: node pod/v6/test/review_gate_editor_test.mjs
 */
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
process.env.V6_DATEI = join(hier, '..', 'lspod-designer-v6-6.3.1.js');
process.env.V6_VERSION = '6.3.1';

const { playwright, starteServer, seiteOeffnen, editorBereit } = await import('./lib.mjs');
const { chromium } = playwright();

let n = 0;
const fehler = [];
function pruefe(name, ok, detail = '') {
  n++;
  if (!ok) {
    const meldung = `${name}${detail ? ` ${detail}` : ''}`;
    fehler.push(meldung);
    console.log(`  ✗ ${meldung}`);
  }
}

const SHOP71 = 'shop=1001:4012,1002:4013,1003:4014';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function warteBis(fn, ms = 10000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) {
    if (await fn()) return true;
    await new Promise((ok) => setTimeout(ok, 25));
  }
  return false;
}

async function textAuf(page, placement, text) {
  await page.locator(`.lsp6-tab[data-p="${placement}"]`).click();
  await page.getByRole('button', { name: '➕ Text' }).click();
  await page.locator('.lsp6-text').fill(text);
}

async function reviewOeffnen(page, anzahl = 2) {
  await page.locator('.lsp6-cta').click();
  const dialog = page.locator('[data-lsp6-review="1"][role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction((soll) => {
    const bilder = Array.from(document.querySelectorAll('[data-review-print]'));
    return bilder.length === soll && bilder.every((bild) => bild.complete && bild.naturalWidth > 0);
  }, anzahl, { timeout: 30000 });
  return dialog;
}

async function reviewHashes(page) {
  return page.locator('[data-review-print]').evaluateAll(async (bilder) => Promise.all(bilder.map(async (bild) => {
    const antwort = await fetch(bild.src);
    const bytes = await antwort.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return {
      placement: bild.getAttribute('data-review-print'),
      bytes: bytes.byteLength,
      hash: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join(''),
    };
  })));
}

async function desktopSzenario(browser, srv) {
  const s = await seiteOeffnen(browser, srv.url, { breite: 1440, hoehe: 900, query: `karte=71&${SHOP71}` });
  const p = s.page;
  try {
    await editorBereit(p);
    pruefe('v6.3.1 ist geladen', await p.evaluate(() => window.LSPOD6 && window.LSPOD6.version) === '6.3.1');
    await textAuf(p, 'front', 'Vorne geprueft');
    await textAuf(p, 'back', 'Hinten geprueft');

    pruefe('vor dem CTA gibt es weder Upload noch Warenkorb-POST', s.uploads.length === 0 && s.warenkorb.length === 0);
    let dialog = await reviewOeffnen(p);
    pruefe('CTA oeffnet den Review vor jedem Upload und Warenkorb-POST', s.uploads.length === 0 && s.warenkorb.length === 0);
    const zusammenfassung = await dialog.locator('[data-review-summary="1"]').innerText();
    pruefe('Review zeigt den echten Variantentitel', /Ausführung:\s+Weiss/.test(zusammenfassung), zusammenfassung);

    const placements = await dialog.locator('[data-review-placement]').evaluateAll((k) => k.map((x) => x.getAttribute('data-review-placement')));
    pruefe('Review zeigt genau Vorder- und Rueckseite', JSON.stringify(placements) === JSON.stringify(['front', 'back']), JSON.stringify(placements));
    pruefe('jede Platzierung zeigt ihr verbindliches PNG', await dialog.locator('[data-review-print]').count() === 2);

    const akzept = dialog.locator('.lsp6-review-accept');
    const bestaetigen = dialog.locator('.lsp6-review-confirm');
    pruefe('Checkbox erhaelt beim Oeffnen den Fokus', await akzept.evaluate((e) => document.activeElement === e));
    pruefe('Bestaetigen ist ohne Checkbox gesperrt', await bestaetigen.isDisabled());

    await p.keyboard.press('Shift+Tab');
    pruefe('Shift+Tab bleibt im Dialog und springt zum letzten aktiven Element', await dialog.locator('.lsp6-review-back').evaluate((e) => document.activeElement === e));
    await p.keyboard.press('Tab');
    pruefe('Tab bleibt im Dialog und springt zur Checkbox', await akzept.evaluate((e) => document.activeElement === e));
    await p.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    await p.waitForFunction(() => document.activeElement === document.querySelector('.lsp6-cta'));
    pruefe('Escape schliesst den Review und gibt den Fokus an den CTA zurueck', await p.locator('.lsp6-cta').evaluate((e) => document.activeElement === e));
    pruefe('Escape loest keinen Upload und keinen Warenkorb-POST aus', s.uploads.length === 0 && s.warenkorb.length === 0);

    dialog = await reviewOeffnen(p);
    const vorher = await p.locator('.lsp6-text').inputValue();
    await p.evaluate(() => {
      const editor = window.LSPOD6.editors[0];
      editor.waehlen(editor.st.ebenen.back[0].id);
      const feld = editor.ui.textfeld;
      feld.value += ' geaendert';
      feld.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await dialog.waitFor({ state: 'detached' });
    await p.waitForFunction(() => /Druckvorschau erneut/.test(document.querySelector('[data-feld="status"]')?.textContent || ''));
    pruefe('Designaenderung schliesst und invalidiert den offenen Review', (await p.locator('.lsp6-text').inputValue()) !== vorher && s.uploads.length === 0 && s.warenkorb.length === 0);

    dialog = await reviewOeffnen(p);
    const geprueft = await reviewHashes(p);
    pruefe('beide Review-PNGs haben einen SHA-256 und Bytes', geprueft.length === 2 && geprueft.every((x) => /^[0-9a-f]{64}$/.test(x.hash) && x.bytes > 0), JSON.stringify(geprueft));

    const finalAkzept = dialog.locator('.lsp6-review-accept');
    const finalBestaetigen = dialog.locator('.lsp6-review-confirm');
    await finalAkzept.check();
    pruefe('Checkbox schaltet Bestaetigen frei', await finalBestaetigen.isEnabled());
    pruefe('auch nach der Checkbox wurde noch nichts gesendet', s.uploads.length === 0 && s.warenkorb.length === 0);

    await Promise.all([
      p.waitForURL('**/cart', { timeout: 60000 }),
      finalBestaetigen.click(),
    ]);
    pruefe('nach Bestaetigen gibt es genau einen Warenkorb-POST', s.warenkorb.length === 1, String(s.warenkorb.length));
    const pngUploads = s.uploads.filter((u) => u.typ === 'png');
    pruefe('nach Bestaetigen werden genau die zwei PNGs hochgeladen', s.uploads.length === 2 && pngUploads.length === 2, JSON.stringify(s.uploads));

    const props = s.warenkorb[0]?.properties || {};
    for (const erwartet of geprueft) {
      const eigenschaft = Object.keys(props).find((k) => k.includes('Druckdatei') && k.endsWith(`(${erwartet.placement})`));
      const url = eigenschaft && props[eigenschaft];
      const bytes = url && s.png(url);
      pruefe(
        `Review-Blob ${erwartet.placement} entspricht bytegenau dem hochgeladenen PNG`,
        !!bytes && bytes.length === erwartet.bytes && sha256(bytes) === erwartet.hash,
        JSON.stringify({ eigenschaft, url, reviewBytes: erwartet.bytes, uploadBytes: bytes?.length, reviewHash: erwartet.hash, uploadHash: bytes && sha256(bytes) }),
      );
    }
    pruefe('Desktop-Lauf ohne Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
  } finally {
    await s.schliessen();
  }
}

async function standardAusfuehrungSzenario(browser, srv) {
  const id = '55893188411777';
  for (const fall of [
    { name: 'rohe Varianten-ID', sprache: 'de-CH', lang: 'de', titel: id, label: 'Ausführung', erwartet: 'Standardausführung' },
    { name: 'Default Title', sprache: 'en-GB', lang: 'en', titel: 'Default%20Title', label: 'Option', erwartet: 'Standard option' },
    { name: 'numerischer echter Titel', sprache: 'de-CH', lang: 'de', titel: '38', label: 'Ausführung', erwartet: '38' },
  ]) {
    const s = await seiteOeffnen(browser, srv.url, {
      breite: 1024,
      hoehe: 800,
      sprache: fall.sprache,
      query: `lang=${fall.lang}&karte=71&shop=${id}:4012&varianten=${id}:${fall.titel}`,
    });
    const p = s.page;
    try {
      await editorBereit(p);
      await textAuf(p, 'front', 'Variantenpruefung');
      const dialog = await reviewOeffnen(p, 1);
      const zusammenfassung = await dialog.locator('[data-review-summary="1"]').innerText();
      pruefe(
        `${fall.sprache}: ${fall.name} wird korrekt benannt`,
        new RegExp(`${fall.label}:\\s+${fall.erwartet}`).test(zusammenfassung) && !zusammenfassung.includes(id) && !/Default Title/i.test(zusammenfassung),
        zusammenfassung,
      );
      pruefe(`${fall.sprache}: Varianten-Review ohne Seitenfehler`, s.fehler.length === 0, s.fehler.join(' | '));
      await p.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
    } finally {
      await s.schliessen();
    }
  }
}

async function staleRunSzenario(browser, srv) {
  let ersterUploadGestartet = false;
  const s = await seiteOeffnen(browser, srv.url, {
    breite: 1440,
    hoehe: 900,
    query: `karte=71&${SHOP71}`,
    cloudinaryVerzoegerung(nr, typ) {
      if (nr === 1 && typ === 'png') {
        ersterUploadGestartet = true;
        return 2500;
      }
      return 0;
    },
  });
  const p = s.page;
  try {
    await editorBereit(p);
    await textAuf(p, 'front', 'Lauf A vorne');
    await textAuf(p, 'back', 'Lauf A hinten');

    let dialog = await reviewOeffnen(p);
    const dateienA = await reviewHashes(p);
    await dialog.locator('.lsp6-review-accept').check();
    await dialog.locator('.lsp6-review-confirm').click();
    pruefe('Stale-Run: erster PNG-Upload von Lauf A wurde verzoegert', await warteBis(() => ersterUploadGestartet));

    await p.evaluate(() => {
      const editor = window.LSPOD6.editors[0];
      editor.waehlen(editor.st.ebenen.back[0].id);
      const feld = editor.ui.textfeld;
      feld.value += ' fuer Lauf B';
      feld.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await p.waitForFunction(() => /Druckvorschau erneut/.test(document.querySelector('[data-feld="status"]')?.textContent || ''));

    dialog = await reviewOeffnen(p);
    const dateienB = await reviewHashes(p);
    pruefe('Stale-Run: Lauf B zeigt den geaenderten Dateistand', dateienB.length === 2 && dateienB.some((b) => dateienA.some((a) => a.placement === b.placement && a.hash !== b.hash)));
    const statusB = await p.locator('[data-feld="status"]').innerText();
    pruefe('Stale-Run: Lauf B fokussiert seine Checkbox', await dialog.locator('.lsp6-review-accept').evaluate((e) => document.activeElement === e));

    pruefe('Stale-Run: die spaete Antwort von Lauf A ist eingetroffen', await warteBis(() => s.uploads.length >= 1, 10000));
    await p.waitForTimeout(500);
    const dateienNachA = await reviewHashes(p);
    const dialogBleibt = await p.locator('[data-lsp6-review="1"][role="dialog"]').count() === 1;
    const fokusBleibt = dialogBleibt && await p.locator('.lsp6-review-accept').evaluate((e) => document.activeElement === e);
    const statusNachA = await p.locator('[data-feld="status"]').innerText();
    pruefe('Stale-Run: Lauf B bleibt nach der spaeten A-Antwort offen und fokussiert', dialogBleibt && fokusBleibt);
    pruefe('Stale-Run: Status und gepruefte Dateien von B werden nicht ueberschrieben', statusNachA === statusB && JSON.stringify(dateienNachA) === JSON.stringify(dateienB), JSON.stringify({ statusB, statusNachA, dateienB, dateienNachA }));
    pruefe('Stale-Run: weder Lauf A noch der unbestaetigte Lauf B senden einen Warenkorb-POST', s.warenkorb.length === 0, String(s.warenkorb.length));
    pruefe('Stale-Run ohne Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
    if (dialogBleibt) {
      await p.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
    }
  } finally {
    await s.schliessen();
  }
}

async function mobilSzenario(browser, srv) {
  const s = await seiteOeffnen(browser, srv.url, { breite: 375, hoehe: 812, mobil: true, query: `karte=71&${SHOP71}` });
  const p = s.page;
  try {
    await editorBereit(p);
    await textAuf(p, 'front', 'Mobil vorne');
    await textAuf(p, 'back', 'Mobil hinten');
    const dialog = await reviewOeffnen(p);

    const layout = await p.evaluate(() => {
      const panel = document.querySelector('.lsp6-review-panel');
      const r = panel.getBoundingClientRect();
      return {
        viewport: innerWidth,
        dokumentBreite: document.documentElement.scrollWidth,
        dokumentInnen: document.documentElement.clientWidth,
        panelLinks: r.left,
        panelRechts: r.right,
        panelScroll: panel.scrollWidth,
        panelInnen: panel.clientWidth,
      };
    });
    pruefe(
      'Review hat bei 375 px keinen horizontalen Ueberlauf',
      layout.dokumentBreite <= layout.dokumentInnen && layout.panelScroll <= layout.panelInnen + 1 && layout.panelLinks >= 0 && layout.panelRechts <= layout.viewport + 0.5,
      JSON.stringify(layout),
    );

    const controls = await dialog.locator('.lsp6-review-check, .lsp6-review-actions button').evaluateAll((liste) => liste.map((e) => ({
      name: e.className,
      hoehe: e.getBoundingClientRect().height,
    })));
    pruefe('Checkbox-Flaeche und Review-Knoepfe sind mindestens 44 px hoch', controls.length === 3 && controls.every((e) => e.hoehe >= 44), JSON.stringify(controls));
    pruefe('mobiler Review zeigt beide Platzierungen', await dialog.locator('[data-review-placement]').count() === 2);
    pruefe('Mobil-Lauf ohne Seitenfehler', s.fehler.length === 0, s.fehler.join(' | '));
    await p.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
  } finally {
    await s.schliessen();
  }
}

const srv = await starteServer();
const browser = await chromium.launch();
try {
  await desktopSzenario(browser, srv);
  await standardAusfuehrungSzenario(browser, srv);
  await staleRunSzenario(browser, srv);
  await mobilSzenario(browser, srv);
} catch (e) {
  n++;
  fehler.push(`Ausnahme: ${e.message}`);
  console.log(`  ✗ Ausnahme: ${e.message.split('\n').slice(0, 3).join(' / ')}`);
} finally {
  await browser.close();
  await srv.stop();
}

console.log(fehler.length ? `\n${fehler.length} von ${n} Pruefungen FEHLGESCHLAGEN` : `\n${n} Pruefungen bestanden`);
process.exit(fehler.length ? 1 : 0);
