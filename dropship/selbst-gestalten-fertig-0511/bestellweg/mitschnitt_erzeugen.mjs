// Erzeugt editor_640_mitschnitt.json: die Warenkorb-Eigenschaften des ECHTEN Editors pod/v6/lspod-designer-v6-6.4.0.js (nicht von Hand nachgebaut).
// Der Editor läuft in Chromium auf der Attrappenseite pod/v6/test/mock.html (Playwright, nur lokaler Server; Cloudinary ist dort eine Attrappe), je Fall wird die Kaufanfrage POST /cart/add.js abgefangen.
// Lauf:  NODE_PATH=/opt/node22/lib/node_modules /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mitschnitt_erzeugen.mjs [Ausgabedatei]
// Der Mitschnitt gehört zu EINER Editor-Datei (Feld editorSha256, die Datei ist unveränderlich). Kommt eine neue Editor-Fassung, den Mitschnitt neu erzeugen und die Prüfungen in
// automation/lib/printful_bestellweg_test.mjs («Editor 6.4.0») gegen die neuen Werte laufen lassen.
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
// Der Mitschnitt gehört zu Editor 6.4.0: die Datei wird ausdrücklich gesetzt (die Vorgabe der Testhilfen wandert mit jeder neuen Editor-Fassung weiter); V6_DATEI übersteuert.
process.env.V6_DATEI = process.env.V6_DATEI || fileURLToPath(new URL('../../../pod/v6/lspod-designer-v6-6.4.0.js', import.meta.url));
const { playwright, starteServer, seiteOeffnen, editorBereit, pngErzeugen, V6_DATEI } = await import('../../../pod/v6/test/lib.mjs');
const { chromium } = playwright();
const AUS = process.argv[2] || fileURLToPath(new URL('./editor_640_mitschnitt.json', import.meta.url));
const PC = { breite: 1440, hoehe: 900 };
const tab = (page, name) => page.locator('.lsp6-tab', { hasText: name });
async function text(page, t) { await page.getByRole('button', { name: '➕ Text' }).click(); await page.locator('.lsp6-text').fill(t); }
async function foto(page, w, h) {
  await page.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: pngErzeugen(w, h) });
  await page.waitForFunction(() => Object.values(window.LSPOD6.editors[0].st.ebenen).flat().some((x) => x._origW), null, { timeout: 15000 });
  await page.waitForFunction(() => !Object.values(window.LSPOD6.editors[0].st.ebenen).flat().some((x) => x.uploading), null, { timeout: 15000 });
}
async function cta(s) {
  const nav = s.page.waitForURL('**/cart', { timeout: 30000 });
  await s.page.locator('.lsp6-cta').first().click();
  const dialog = s.page.locator('[data-lsp6-review="1"]');
  await dialog.waitFor({ state: 'visible', timeout: 30000 });
  await dialog.locator('.lsp6-review-accept').check();
  await dialog.locator('.lsp6-review-confirm').click();
  await nav;
}
const out = { quelle: 'Mitschnitt der Kaufanfrage (POST /cart/add.js) des echten Editors pod/v6/lspod-designer-v6-6.4.0.js auf der Attrappenseite pod/v6/test/mock.html (Playwright, Chromium); Cloudinary ist dort eine Attrappe, die Adressen sind darum .../upload/mock/<n>.png', editorSha256: createHash('sha256').update(readFileSync(V6_DATEI)).digest('hex'), editorVersion: null, faelle: [] };
const srv = await starteServer();
const browser = await chromium.launch();
async function fall(name, query, schritte) {
  const s = await seiteOeffnen(browser, srv.url, { ...PC, query });
  await editorBereit(s.page);
  out.editorVersion = await s.page.evaluate(() => window.LSPOD6.version);
  await schritte(s.page);
  await cta(s);
  const k = s.warenkorb[0];
  out.faelle.push({ name, query, anfrage: { id: k.id, quantity: k.quantity, properties: k.properties }, uploads: s.uploads.map((u) => ({ url: u.url, typ: u.typ, breite: u.breite, hoehe: u.hoehe })), seitenfehler: s.fehler });
  console.log(name, JSON.stringify(k.properties).slice(0, 700));
  await s.schliessen();
}
const SHOP71 = 'shop=1001:4025,1002:8923,1003:8924';   // Printful-Varianten des T-Shirts 71, die der Katalogauszug dropship/pod-auswahl/bestellweg_katalog_auszug.json führt (4025 = Weiss, S)
await fall('t-shirt-71-vorne-text', `karte=71&vorschau=71&${SHOP71}`, async (p) => { await text(p, 'Hallo Welt'); });
await fall('t-shirt-71-vorne-foto-1200', `karte=71&vorschau=71&${SHOP71}`, async (p) => { await foto(p, 1200, 1200); });
await fall('t-shirt-71-vorne-foto-500', `karte=71&vorschau=71&${SHOP71}`, async (p) => { await foto(p, 500, 500); });
await fall('t-shirt-71-vorne-foto-und-ruecken-text', `karte=71&vorschau=71&${SHOP71}`, async (p) => { await foto(p, 1200, 1200); await tab(p, 'Rückseite').click(); await text(p, 'Hinten'); });
await fall('t-shirt-71-vorne-text-und-aermel', `karte=71&vorschau=71&${SHOP71}`, async (p) => { await text(p, 'Vorne'); await tab(p, 'Ärmel links').click(); await text(p, 'Arm'); });
await fall('tasse-19-text', 'karte=19&vorschau=19&shop=1001:1320,1002:4830', async (p) => { await text(p, 'Tasse'); });
await browser.close(); await srv.stop();
writeFileSync(AUS, JSON.stringify(out, null, 1));
console.log('geschrieben', AUS);
