import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  ALLOWLIST, BLOCKLIST, PREVIEW_IDS, assetUrl, attr, baustein, beschreibungPlanen,
  blockerBaustein, blockerProduktPruefen, editorReleasePlanen, integritySha256, produktPruefen,
  releaseAusAllowlist, releasePruefen, sha256,
  VORHER_EDITOR,
  CANARY_V64, FREIGESCHALTET, SCOPES_V64, ROLLOUT_V63, ROLLOUT_V64, APPLY_LEDGER_ZUSTAENDE, ROLLBACK_SCHREIBBAR, auswahlPlanen, canaryLedgerPruefen, editorAusRelease,
  freigeschaltet, freischaltungPlanen, sperreLiegtVor,
  editorBlockNormalisieren, editorReleaseFormPruefen, editorUrl, produktIdentitaetPruefen, rolloutKonfig, rollbackLedgerAuswerten,
  vorgaengerAusRelease,
} from './direct_rollout_lib.mjs';
import { editorReleaseAbgleichen, editorReleaseErzeugen, editorReleaseText } from './editor_release_bauen.mjs';

let ok = 0;
const test = (name, fn) => { try { fn(); ok++; } catch (e) { console.error(`FEHLER ${name}: ${e.message}`); process.exitCode = 1; } };
const wirft = (fn, rx) => { let e; try { fn(); } catch (x) { e = x; } assert.ok(e && rx.test(e.message), e?.message || 'warf nicht'); };
function effektiveHeaders(text, path) {
  const rules = [];
  let rule = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (!/^\s/.test(raw)) { rule = { pattern: line, lines: [] }; rules.push(rule); }
    else if (rule) rule.lines.push(line);
  }
  const values = new Map();
  const matches = (pattern) => {
    if (!pattern.startsWith('/')) return false;
    const rx = '^' + pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$';
    return new RegExp(rx).test(path);
  };
  for (const r of rules.filter((candidate) => matches(candidate.pattern))) {
    for (const line of r.lines.filter((value) => value.startsWith('! '))) values.delete(line.slice(2).toLowerCase());
    for (const line of r.lines.filter((value) => !value.startsWith('! '))) {
      const colon = line.indexOf(':'); if (colon < 1) continue;
      const name = line.slice(0, colon).toLowerCase(); const value = line.slice(colon + 1).trim();
      values.set(name, [...(values.get(name) || []), value]);
    }
  }
  return values;
}
const H = 'a'.repeat(64);
const editor = { url: 'https://abannews.com/pod/v6/lspod-designer-v6-6.3.1.js', sha256: H };
const products = ALLOWLIST.map((a, i) => ({ id: a.id, handle: a.handle, cardUrl: `https://abannews.com/pod/v6/maps/lspod-${a.numericId}.karte.json`, cardSha256: H, previewUrl: PREVIEW_IDS.includes(a.numericId) ? `https://abannews.com/pod/v6/maps/lspod-${a.numericId}.vorschau.json` : null, previewSha256: PREVIEW_IDS.includes(a.numericId) ? H : null, variantIds: [String(i + 1)] }));
const release = { schema: 1, editor, products };
const live = (a = ALLOWLIST[0]) => ({ id: a.id, handle: a.handle, title: 'Tasse & <Test>', status: 'ACTIVE', onlineStoreUrl: `https://luxestyle.ch/products/${a.handle}`, variants: { pageInfo: { hasNextPage: false }, nodes: [{ id: 'gid://shopify/ProductVariant/1', availableForSale: true }] } });
const blockedLive = (b = BLOCKLIST[0]) => ({ id: b.id, handle: b.handle, title: 'Gesperrt', status: 'ACTIVE', onlineStoreUrl: `https://luxestyle.ch/products/${b.handle}`, variants: { pageInfo: { hasNextPage: false }, nodes: [{ id: 'gid://shopify/ProductVariant/9', availableForSale: true }] } });
const sourceProducts = [
  ...ALLOWLIST.map((a, i) => ({ shopifyProductId: a.id, handle: a.handle, status: 'ACTIVE', rolloutStatus: PREVIEW_IDS.includes(a.numericId) ? 'ready-preview' : 'ready-binding', asset: `lspod-${a.numericId}.karte.json`, previewAsset: PREVIEW_IDS.includes(a.numericId) ? `lspod-${a.numericId}.vorschau.json` : null, variants: [{ shopifyVariantId: String(i + 1) }] })),
  ...BLOCKLIST.slice(1).map((b) => ({ shopifyProductId: b.id, handle: b.handle, status: 'ACTIVE', rolloutStatus: 'blocked', asset: `lspod-${b.numericId}.karte.json`, previewAsset: null, variants: [{ shopifyVariantId: '99' }] })),
];
const sourceAssets = new Map(ALLOWLIST.flatMap((a) => [[`lspod-${a.numericId}.karte.json`, H], ...(PREVIEW_IDS.includes(a.numericId) ? [[`lspod-${a.numericId}.vorschau.json`, H]] : [])]));
const sourceAllowlist = { schema: 1, editorSha256: H, products: sourceProducts, blocked: [{ shopifyProductId: BLOCKLIST[0].id, handle: BLOCKLIST[0].handle, reasons: ['NON_PRINTFUL_FULFILLMENT'] }] };

test('Allowlist hat exakt 17 eindeutige Produkte (seit 11.11.2026 mit dem Magneten) und keines der zwei gesperrten Produkte', () => {
  assert.equal(ALLOWLIST.length, 17); assert.equal(new Set(ALLOWLIST.map((x) => x.id)).size, 17); assert.equal(new Set(ALLOWLIST.map((x) => x.handle)).size, 17);
  assert.ok(ALLOWLIST.every((x) => !/buegeltransfer|dad-cap/.test(x.handle)));
  assert.deepEqual(BLOCKLIST.map((x) => x.handle), ['buegeltransfer-selbst-gestalten', 'dad-cap-selbst-gestalten']);
  assert.equal(new Set(BLOCKLIST.map((x) => x.id)).size, 2);
  assert.ok(BLOCKLIST.every((x) => !ALLOWLIST.some((a) => a.id === x.id)));
  assert.equal(ALLOWLIST.length + BLOCKLIST.length, 19);
  assert.deepEqual(ALLOWLIST.map((x) => x.handle), [...ALLOWLIST.map((x) => x.handle)].sort(), 'Allowlist nicht nach Handle sortiert');
});
test('Freigeschaltet ist genau der Magnet: Editorprodukt, kein Sperrprodukt mehr, alter Grundtext der Sperre bleibt festgehalten', () => {
  assert.deepEqual(FREIGESCHALTET.map((x) => [x.id, x.numericId, x.handle, x.seit]), [['gid://shopify/Product/15427217195393', '15427217195393', 'magnet-zum-selbstgestalten', '2026-11-11']]);
  assert.equal(FREIGESCHALTET[0].reason, 'Produktion und Lieferung dieser Ausführung in die Schweiz sind derzeit nicht bestätigt.');
  assert.ok(Object.isFrozen(FREIGESCHALTET) && Object.isFrozen(FREIGESCHALTET[0]));
  assert.ok(ALLOWLIST.some((a) => a.id === FREIGESCHALTET[0].id && a.handle === FREIGESCHALTET[0].handle));
  assert.ok(!BLOCKLIST.some((b) => b.id === FREIGESCHALTET[0].id || b.handle === FREIGESCHALTET[0].handle));
  assert.ok(!PREVIEW_IDS.includes(FREIGESCHALTET[0].numericId), 'der Magnet hat keine belegte Produktvorschau');
  assert.equal(freigeschaltet(FREIGESCHALTET[0].id).handle, 'magnet-zum-selbstgestalten');
  assert.equal(freigeschaltet(ALLOWLIST[0].id), null); assert.equal(freigeschaltet(BLOCKLIST[1].id), null); assert.equal(freigeschaltet(undefined), null);
});
test('Kanonische v6.3-Allowlist wird deterministisch in das Release übersetzt', () => assert.deepEqual(releaseAusAllowlist(sourceAllowlist, { editorSha256: H, assetSha256: sourceAssets }), release));
test('Produktiver Editor und Allowlist sind auf denselben Release-Hash gebunden', () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const produktiv = JSON.parse(readFileSync(root + 'dropship/selbst-gestalten-fertig-0511/rollout-v63/allowlist.json', 'utf8'));
  const editorDatei = readFileSync(root + 'pod/v6/lspod-designer-v6-6.3.1.js');
  const vorherDatei = readFileSync(root + 'pod/v6/lspod-designer-v6-6.3.0.js');
  assert.equal(sha256(vorherDatei), VORHER_EDITOR.sha256);
  assert.equal(produktiv.editorSha256, sha256(editorDatei));
  assert.equal(produktiv.editorSha256, '1e15aab9486f0b60385251889a07b4b293a74819437cd3702377ee079760adb0');
  assert.equal(assetUrl(editor.url, produktiv.editorSha256), `${editor.url}?v=1e15aab9486f0b60`);
  assert.equal(integritySha256(produktiv.editorSha256), 'sha256-HhWquUhvC2A4UlGImge0spOnSBlDfNNwI3fuB5dgrbA=');
});
test('Release exakt vollständig', () => assert.equal(releasePruefen(release), true));
test('Release lehnt fehlendes Produkt ab', () => wirft(() => releasePruefen({ ...release, products: products.slice(1) }), /erwartet 17 Produkte, gefunden 16; fehlt: allover-stoffbeutel/));
test('Release: 9 Vorschauen und 8 Druckdatei-Ansichten; ein Artefakt von vor der Freischaltung (ohne den Magneten) ist nur mit altOhneFreigeschaltete lesbar', () => {
  assert.equal(release.products.filter((p) => p.previewUrl).length, 9); assert.equal(release.products.filter((p) => !p.previewUrl).length, 8);
  const ohneMagnet = { ...release, products: products.filter((p) => p.handle !== 'magnet-zum-selbstgestalten') };
  assert.equal(ohneMagnet.products.length, 16);
  wirft(() => releasePruefen(ohneMagnet), /erwartet 17 Produkte, gefunden 16; fehlt: magnet-zum-selbstgestalten/);
  wirft(() => releasePruefen(ohneMagnet, { altOhneFreigeschaltete: false }), /erwartet 17 Produkte/);
  wirft(() => releasePruefen(ohneMagnet, { altOhneFreigeschaltete: 1 }), /erwartet 17 Produkte/);   // nur das ausdrückliche true zählt
  assert.equal(releasePruefen(ohneMagnet, { altOhneFreigeschaltete: true }), true);
  assert.equal(releasePruefen(release, { altOhneFreigeschaltete: true }), true);
  // die Nachsicht gilt nur für FREIGESCHALTET-Produkte: fehlt ein anderes (oder zusätzlich ein anderes), wirft die Prüfung weiter
  wirft(() => releasePruefen({ ...release, products: products.filter((p) => p.handle !== 'mauspad-selbst-gestalten') }, { altOhneFreigeschaltete: true }), /erwartet 17 Produkte, gefunden 16; fehlt: mauspad/);
  wirft(() => releasePruefen({ ...release, products: products.filter((p) => !/magnet-zum|mauspad/.test(p.handle)) }, { altOhneFreigeschaltete: true }), /erwartet 17 Produkte, gefunden 15/);
  // eine Vorschau für den Magneten ist nicht belegt
  wirft(() => releasePruefen({ ...release, products: products.map((p) => (p.handle === 'magnet-zum-selbstgestalten' ? { ...p, previewUrl: 'https://abannews.com/pod/v6/maps/lspod-15427217195393.vorschau.json', previewSha256: H } : p)) }), /keine Produktprojektion belegt/);
});
test('Release bindet die neun Vorschauen und Karten an die exakte Produkt-ID', () => {
  const i = products.findIndex((p) => p.previewUrl);
  wirft(() => releasePruefen({ ...release, products: products.map((p, n) => n === i ? { ...p, previewUrl: null, previewSha256: null } : p) }), /belegte Vorschau/);
  wirft(() => releasePruefen({ ...release, products: products.map((p, n) => n === i ? { ...p, cardUrl: products[(i + 1) % products.length].cardUrl } : p) }), /Karten-URL/);
});
test('Release lehnt fremde URL ab', () => wirft(() => releasePruefen({ ...release, editor: { ...editor, url: 'https://example.org/x.js' } }), /Editor-URL/));
test('Attribute werden HTML-sicher', () => assert.equal(attr('a&"<>'), 'a&amp;&quot;&lt;&gt;'));
test('Baustein ist v6.3, Pflichtkarte, Hash-URLs, SRI, Vorschau und escaped', () => {
  const rp = products.find((p) => p.previewUrl); const a = ALLOWLIST.find((x) => x.id === rp.id);
  const b = baustein({ product: live(a), releaseProduct: rp, editor });
  assert.match(b, /class="lspod-designer-v6"/); assert.match(b, /data-karte-pflicht="1"/); assert.match(b, /data-vorschau-url="[^\"]+\?v=aaaaaaaaaaaaaaaa"/); assert.match(b, /integrity="sha256-/); assert.match(b, /crossorigin="anonymous"/); assert.match(b, /Tasse &amp; &lt;Test&gt;/); assert.doesNotMatch(b, /class="lspod-designer"/);
  assert.equal(assetUrl(editor.url, H), `${editor.url}?v=aaaaaaaaaaaaaaaa`); assert.match(integritySha256(H), /^sha256-[A-Za-z0-9+/]+=*$/);
});
test('Alter v5-Block wird genau ersetzt, Rest bytegleich', () => {
  const alt = '<p>A</p><div class="lspod-designer" data-variant="1"></div>\n<script src="https://cdn/x/lspod-designer-v5.js?v=1" defer></script><hr>\n<p>B</p>';
  const neu = baustein({ product: live(), releaseProduct: products[0], editor }); const p = beschreibungPlanen(alt, neu);
  assert.ok(p.nachher.startsWith('<p>A</p><!-- lx-v63')); assert.ok(p.nachher.endsWith('<p>B</p>')); assert.equal(p.vorherSha256, sha256(alt));
});
test('Markierter v6-Block ist idempotent aktualisierbar', () => {
  const b = baustein({ product: live(), releaseProduct: products[0], editor }); const p = beschreibungPlanen(`<p>A</p>${b}<p>B</p>`, b); assert.equal(p.geaendert, false);
});
test('6.3.1-Release ändert im bestehenden v6-Block nur Dateiname, URL-Version und SRI', () => {
  const vorher = baustein({ product: live(), releaseProduct: products[0], editor: VORHER_EDITOR });
  const ziel = baustein({ product: live(), releaseProduct: products[0], editor });
  const alt = `<p>A</p>${vorher}<p>B</p>`;
  const geplant = editorReleasePlanen(alt, ziel, editor);
  assert.equal(geplant.geaendert, true);
  assert.equal(geplant.nachher, `<p>A</p>${ziel}<p>B</p>`);
  assert.equal(editorReleasePlanen(geplant.nachher, ziel, editor).geaendert, false);
});
test('6.3.1-Release stoppt bei Drift ausserhalb des Editor-Script-Tags', () => {
  const vorher = baustein({ product: live(), releaseProduct: products[0], editor: VORHER_EDITOR });
  const ziel = baustein({ product: live(), releaseProduct: products[0], editor });
  const drift = vorher.replace('data-produkttitel="Tasse &amp; &lt;Test&gt;"', 'data-produkttitel="Fremder Titel"');
  wirft(() => editorReleasePlanen(drift, ziel, editor), /weitere Beschreibungsbytes/);
  wirft(() => editorReleasePlanen(vorher + vorher, ziel, editor), /genau einen bestehenden v6-Marker/);
});
test('Blocker ersetzt v5 sichtbar und sperrt Submit, Klick, Dynamic Checkout und spätere DOM-Formulare', () => {
  const p = blockedLive(); const b = blockerBaustein({ product: p, blocker: BLOCKLIST[0] });
  assert.match(b, /data-lspod-blocked="15423895830913"/); assert.match(b, /Personalisierung derzeit nicht bestellbar/);
  assert.match(b, /document\.addEventListener\('submit'/); assert.match(b, /document\.addEventListener\('click'/); assert.match(b, /shopify-payment-button/); assert.match(b, /MutationObserver/); assert.doesNotMatch(b, /lspod-designer-v6/);
  const old = '<div class="lspod-designer"></div><script src="https://x/lspod-designer-v5.js"></script>';
  assert.match(beschreibungPlanen(old, b, { blocked: true }).nachher, /data-lspod-blocked/);
  assert.equal(blockerProduktPruefen(p, BLOCKLIST[0], ['9']), true);
});
test('Alle Blocker verwenden Shopifys kanonische Block-Zeilenumbrüche und bleiben beim Rücklesen bytegleich', () => {
  for (const blocker of BLOCKLIST) {
    const p = blockedLive(blocker);
    const b = blockerBaustein({ product: p, blocker });
    const sichtbar = `<div id="lspod-start" class="lspod-v63-blocked" data-lspod-blocked="${blocker.numericId}" role="status" style="padding:20px;border:1px solid #b9a998;border-radius:12px;background:#f8f4ef;color:#2a2521">\n` +
      `<h2 style="margin:0 0 8px">Personalisierung derzeit nicht bestellbar</h2>\n` +
      `<p style="margin:0">${blocker.reason} Wir schalten die Gestaltung erst nach der technischen Prüfung frei.</p>\n` +
      `</div>\n`;
    assert.ok(b.includes(sichtbar), `${blocker.handle}: Block-Markup nicht kanonisch`);
    const geplant = beschreibungPlanen(`<p>A</p>${b}<p>B</p>`, b, { blocked: true });
    assert.equal(geplant.geaendert, false, `${blocker.handle}: kanonisches Readback nicht idempotent`);
    assert.equal(geplant.nachher, `<p>A</p>${b}<p>B</p>`, `${blocker.handle}: Beschreibung nicht bytegleich`);
  }
});
test('Alle Blocker ersetzen nur die echte Theme-CTA durch den Grundlink und sperren nur ihre Varianten', () => {
  for (const blocker of BLOCKLIST) {
    const p = blockedLive(blocker);
    const b = blockerBaustein({ product: p, blocker });
    const skript = b.match(/<script>([\s\S]+)<\/script>/)?.[1];
    assert.ok(skript, `${blocker.handle}: Sperrskript fehlt`);
    const attribute = new Map([['href', '#lspod-start']]);
    const cta = {
      textContent: 'Zuerst dein Design gestalten',
      setAttribute(name, value) { attribute.set(name, value); },
      getAttribute(name) { return attribute.get(name); },
    };
    const fremdeCta = { textContent: 'Andere CTA' };
    const submitButton = { disabled: false, setAttribute(name, value) { this[name] = value; } };
    const zahlung = { hidden: false, setAttribute(name, value) { this[name] = value; } };
    const eigenesFormular = {
      querySelector(sel) { return sel === '[name="id"]' ? { value: '9' } : null; },
      querySelectorAll(sel) { return sel === '.shopify-payment-button' ? [zahlung] : [submitButton]; },
    };
    const fremdesFormular = {
      querySelector(sel) { return sel === '[name="id"]' ? { value: '10' } : null; },
      querySelectorAll() { throw new Error('Fremdes Formular darf nicht verändert werden'); },
    };
    const root = { scrollIntoView() {} };
    const document = {
      currentScript: { previousElementSibling: root },
      readyState: 'complete',
      documentElement: {},
      addEventListener() {},
      querySelectorAll(sel) {
        if (sel === 'div.lspod-designzwang > a.button.lspod-designzwang__button[href="#lspod-start"]') return [cta];
        if (sel.includes('lspod-designzwang')) return [cta, fremdeCta];
        if (sel === 'form[action*="/cart/add"]') return [eigenesFormular, fremdesFormular];
        return [];
      },
    };
    class MutationObserver { observe() {} }
    vm.runInNewContext(skript, { document, MutationObserver });
    assert.equal(cta.textContent, 'Personalisierung derzeit nicht bestellbar', `${blocker.handle}: CTA-Text`);
    assert.equal(cta.getAttribute('title'), 'Personalisierung derzeit nicht bestellbar', `${blocker.handle}: CTA-Titel`);
    assert.equal(cta.getAttribute('aria-label'), 'Personalisierung derzeit nicht bestellbar', `${blocker.handle}: CTA-Label`);
    assert.equal(cta.getAttribute('href'), '#lspod-start', `${blocker.handle}: Grundlink blieb nicht erhalten`);
    assert.equal(cta.getAttribute('data-lspod-v63-blocked-cta'), '1', `${blocker.handle}: Sperrmarker`);
    assert.equal(fremdeCta.textContent, 'Andere CTA', `${blocker.handle}: fremde CTA wurde verändert`);
    assert.equal(submitButton.disabled, true, `${blocker.handle}: eigener Kaufknopf nicht gesperrt`);
    assert.equal(zahlung.hidden, true, `${blocker.handle}: eigener Dynamic-Checkout nicht gesperrt`);
  }
});
test('Sperrskript löst seinen eigenen MutationObserver nicht endlos aus (Seite darf nicht einfrieren)', () => {
  // Wirklichkeitsnahe Attrappe: Jede Zuweisung an textContent ist im Browser eine childList-Mutation, auch bei gleichem Text.
  // Der Beobachter bekommt sie als Mikrotask nachgeliefert; läuft das unbegrenzt, friert die Seite ein (GEMESSEN 09.11.2026 an Magnet und Dad-Cap).
  for (const blocker of BLOCKLIST) {
    const p = blockedLive(blocker);
    const skript = blockerBaustein({ product: p, blocker }).match(/<script>([\s\S]+)<\/script>/)?.[1];
    assert.ok(skript, `${blocker.handle}: Sperrskript fehlt`);
    const warteschlange = []; let zuweisungen = 0; let beobachter = null;
    const attribute = new Map([['href', '#lspod-start']]);
    let text = 'Zuerst dein Design gestalten';
    const cta = {
      get textContent() { return text; },
      set textContent(v) { text = v; zuweisungen++; if (beobachter) warteschlange.push(beobachter); },
      setAttribute(name, value) { attribute.set(name, value); },
      getAttribute(name) { return attribute.get(name); },
    };
    const submitButton = { disabled: false, setAttribute(name, value) { this[name] = value; } };
    const zahlung = { hidden: false, setAttribute(name, value) { this[name] = value; } };
    const eigenesFormular = {
      querySelector(sel) { return sel === '[name="id"]' ? { value: '9' } : null; },
      querySelectorAll(sel) { return sel === '.shopify-payment-button' ? [zahlung] : [submitButton]; },
    };
    const document = {
      currentScript: { previousElementSibling: { scrollIntoView() {} } },
      readyState: 'complete', documentElement: {}, addEventListener() {},
      querySelectorAll(sel) {
        if (sel === 'div.lspod-designzwang > a.button.lspod-designzwang__button[href="#lspod-start"]') return [cta];
        if (sel === 'form[action*="/cart/add"]') return [eigenesFormular];
        return [];
      },
    };
    class MutationObserver { constructor(fn) { this.fn = fn; } observe() { beobachter = this.fn; } }
    vm.runInNewContext(skript, { document, MutationObserver });
    let runden = 0;
    while (warteschlange.length && runden < 200) { warteschlange.shift()(); runden++; }
    assert.ok(runden < 200, `${blocker.handle}: Beobachter lief 200 Runden ohne Ende (Endlosschleife, Seite friert ein)`);
    assert.ok(zuweisungen <= 2, `${blocker.handle}: textContent wurde ${zuweisungen}-mal gesetzt, erwartet höchstens 2`);
    assert.equal(cta.textContent, 'Personalisierung derzeit nicht bestellbar', `${blocker.handle}: CTA-Text`);
    assert.equal(submitButton.disabled, true, `${blocker.handle}: eigener Kaufknopf nicht gesperrt`);
    assert.equal(zahlung.hidden, true, `${blocker.handle}: eigener Dynamic-Checkout nicht gesperrt`);
  }
});
test('Kein oder doppelter Block wird abgelehnt', () => {
  const b = baustein({ product: live(), releaseProduct: products[0], editor }); wirft(() => beschreibungPlanen('<p>x</p>', b), /Kein bestehender/);
  const old = '<div class="lspod-designer"></div><script src="https://x/lspod-designer-v5.js"></script>'; wirft(() => beschreibungPlanen(old + old, b), /nicht eindeutig/);
});
test('Produktgate prüft ACTIVE, Storefront, Kaufbarkeit und Variantenscope', () => assert.equal(produktPruefen(live(), products[0]), true));
test('Produktgate lehnt DRAFT, falsche Variante und nicht kaufbar ab', () => {
  wirft(() => produktPruefen({ ...live(), status: 'DRAFT' }, products[0]), /Status/);
  wirft(() => produktPruefen({ ...live(), variants: { nodes: [{ id: 'gid://shopify/ProductVariant/2', availableForSale: true }] } }, products[0]), /Varianten-Scope/);
  wirft(() => produktPruefen({ ...live(), variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', availableForSale: false }] } }, products[0]), /keine kaufbare/);
  wirft(() => produktPruefen({ ...live(), variants: { pageInfo: { hasNextPage: true }, nodes: [{ id: 'gid://shopify/ProductVariant/1', availableForSale: true }] } }, products[0]), /unvollständig/);
});
test('Cloudflare-Headers erlauben nur den versionierten pod/v6-Pfad cross-origin', () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const h = readFileSync(root + '_headers', 'utf8');
  assert.match(h, /\/pod\/v6\/\*\s+! Cross-Origin-Resource-Policy\s+Access-Control-Allow-Origin: \*\s+Cross-Origin-Resource-Policy: cross-origin/m);
  assert.match(h, /\/pod\/v6\/\*[\s\S]*Cache-Control: public, max-age=86400, must-revalidate/);
  assert.match(h, /\/pod\/v6\/lspod-designer-v6-\*\.js\s+! Cache-Control\s+Cache-Control: public, max-age=31536000, immutable/m);
  const editorBlock = h.match(/\/pod\/v6\/lspod-designer-v6-\*\.js\n((?:[ \t]+[^\n]+\n?)*)/)?.[1] || '';
  assert.doesNotMatch(editorBlock, /(?:Access-Control-Allow-Origin|Cross-Origin-Resource-Policy):/);
  assert.match(h, /\/\*[\s\S]*Cross-Origin-Resource-Policy: same-site/);
  const editorEffective = effektiveHeaders(h, '/pod/v6/lspod-designer-v6-6.3.1.js');
  assert.deepEqual(editorEffective.get('access-control-allow-origin'), ['*']);
  assert.deepEqual(editorEffective.get('cross-origin-resource-policy'), ['cross-origin']);
  assert.deepEqual(editorEffective.get('cache-control'), ['public, max-age=31536000, immutable']);
  const mapEffective = effektiveHeaders(h, '/pod/v6/maps/lspod-15422823465345.karte.json');
  assert.deepEqual(mapEffective.get('access-control-allow-origin'), ['*']);
  assert.deepEqual(mapEffective.get('cross-origin-resource-policy'), ['cross-origin']);
  assert.deepEqual(mapEffective.get('cache-control'), ['public, max-age=86400, must-revalidate']);
  const pageEffective = effektiveHeaders(h, '/index.html');
  assert.equal(pageEffective.has('access-control-allow-origin'), false);
  assert.deepEqual(pageEffective.get('cross-origin-resource-policy'), ['same-site']);
});
test('Workflow ist manuell, Default-Branch-gebunden, bestätigt Writes exakt und sichert Artefakte', () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const w = readFileSync(root + '.github/workflows/pod-v63-description-rollout.yml', 'utf8');
  assert.match(w, /workflow_dispatch:/); assert.doesNotMatch(w, /\bschedule:/);
  assert.match(w, /test "\$REF_NAME" = "\$DEFAULT_BRANCH"/);
  assert.match(w, /ref: \$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(w, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  for (const ack of ['V63_CANARY_TASSE', 'V63_FULL_19_SAFE', 'V63_ROLLBACK_TASSE', 'V63_ROLLBACK_19_SAFE']) assert.match(w, new RegExp(ack));
  assert.match(w, /SHOPIFY_CLIENT_ID: \$\{\{ secrets\.SHOPIFY_CLIENT_ID \}\}/); assert.match(w, /SHOPIFY_CLIENT_SECRET: \$\{\{ secrets\.SHOPIFY_CLIENT_SECRET \}\}/);
  assert.match(w, /actions\/upload-artifact@v4/); assert.match(w, /actions\/download-artifact@v4/);
  assert.doesNotMatch(w, /run:\s*[^\n]*\$\{\{\s*inputs\./);
});

// ============================================================================================================
// Editor 6.4.0: editor-release.json, Eingaben/Bestätigungen, Canary-Tabelle, gelockerter Planer, Workflow
// ============================================================================================================
const WURZEL = fileURLToPath(new URL('../../../', import.meta.url));
const HIER = fileURLToPath(new URL('./', import.meta.url));
const ER = JSON.parse(readFileSync(HIER + 'editor-release.json', 'utf8'));
const V64 = editorAusRelease(ER);
const VG = vorgaengerAusRelease(ER);
const FX = JSON.parse(readFileSync(HIER + 'fixtures/live-editor-bloecke-0811.json', 'utf8'));
const SRI = (hex) => `sha256-${Buffer.from(hex, 'hex').toString('base64')}`;
const SKRIPT640 = `<script src="${V64.url}?v=${V64.sha256.slice(0, 16)}" integrity="${SRI(V64.sha256)}" crossorigin="anonymous" defer></script>`;
const entescape = (t) => t.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const zaehle = (text, teil) => text.split(teil).length - 1;

const allowlistReal = JSON.parse(readFileSync(WURZEL + 'dropship/selbst-gestalten-fertig-0511/rollout-v63/allowlist.json', 'utf8'));
const assetShaReal = new Map(ALLOWLIST.flatMap((a) => [
  [`lspod-${a.numericId}.karte.json`, sha256(readFileSync(WURZEL + `pod/v6/maps/lspod-${a.numericId}.karte.json`))],
  ...(PREVIEW_IDS.includes(a.numericId) ? [[`lspod-${a.numericId}.vorschau.json`, sha256(readFileSync(WURZEL + `pod/v6/maps/lspod-${a.numericId}.vorschau.json`))]] : []),
]));
const releaseReal = releaseAusAllowlist(allowlistReal, { editor: V64, vorgaengerSha256: VG.map((v) => v.sha256), assetSha256: assetShaReal });

// ---- editor-release.json -------------------------------------------------------------------------------
test('editor-release.json: Form, Ziel 6.4.0, Vorgänger 6.3.0 und 6.3.1, alle Adressen unter abannews.com/pod/v6', () => {
  assert.equal(editorReleaseFormPruefen(ER), ER);
  assert.equal(ER.version, ROLLOUT_V64);
  assert.equal(ER.file, 'pod/v6/lspod-designer-v6-6.4.0.js');
  assert.equal(ER.url, 'https://abannews.com/pod/v6/lspod-designer-v6-6.4.0.js');
  assert.equal(ER.url, editorUrl('6.4.0'));
  assert.deepEqual(ER.vorgaenger.map((v) => v.version), ['6.3.0', '6.3.1']);
});
test('editor-release.json: die Vorgänger sind die eingefrorenen Dateien 6.3.0 und 6.3.1 (feste Prüfsummen, sie dürfen sich nie ändern)', () => {
  assert.equal(ER.vorgaenger[0].sha256, 'e58e5c277e9ff45ec5680150d96657b7f1cac0c66a777f46ce1fd65d2166c76b');
  assert.equal(ER.vorgaenger[0].sha256, VORHER_EDITOR.sha256);
  assert.equal(ER.vorgaenger[1].sha256, '1e15aab9486f0b60385251889a07b4b293a74819437cd3702377ee079760adb0');
  assert.equal(ER.vorgaenger[1].sha256, allowlistReal.editorSha256);
  assert.notEqual(ER.sha256, ER.vorgaenger[0].sha256); assert.notEqual(ER.sha256, ER.vorgaenger[1].sha256);
});
test('editor-release.json stimmt mit den echten Dateien überein (SHA-256 und Byteanzahl von Ziel und Vorgängern)', () => {
  const abw = editorReleaseAbgleichen(ER, { root: WURZEL });
  assert.deepEqual(abw, [], `editor-release.json weicht von den Dateien ab: ${abw.join(' | ')}. Neu erzeugen: node dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/editor_release_bauen.mjs`);
  // unabhängig vom Bauskript nachgerechnet: SRI des Ziels aus den Dateibytes
  const bytes = readFileSync(WURZEL + ER.file);
  assert.equal(`sha256-${createHash('sha256').update(bytes).digest('base64')}`, integritySha256(ER.sha256));
});
test('editor-release.json: unbrauchbare Fassungen werden abgelehnt (Schema, Dateiname, Adresse, Hash, Vorgänger)', () => {
  const kopie = () => JSON.parse(JSON.stringify(ER));
  const faelle = [
    ['Schema 2', (e) => { e.schema = 2; }, /Schema 1/],
    ['Version kein semver', (e) => { e.version = '6.4'; }, /Version unbrauchbar/],
    ['file passt nicht zur Version', (e) => { e.file = 'pod/v6/lspod-designer-v6-6.3.1.js'; }, /file passt nicht/],
    ['fremder Host', (e) => { e.url = 'https://example.org/pod/v6/lspod-designer-v6-6.4.0.js'; }, /url passt nicht/],
    ['url mit Query', (e) => { e.url += '?v=1'; }, /url passt nicht/],
    ['sha256 zu kurz', (e) => { e.sha256 = e.sha256.slice(1); }, /sha256 unbrauchbar/],
    ['sha256 Grossbuchstaben', (e) => { e.sha256 = e.sha256.toUpperCase(); }, /sha256 unbrauchbar/],
    ['bytes 0', (e) => { e.bytes = 0; }, /bytes unbrauchbar/],
    ['bytes als Text', (e) => { e.bytes = String(e.bytes); }, /bytes unbrauchbar/],
    ['keine Vorgänger', (e) => { e.vorgaenger = []; }, /vorgaenger fehlt/],
    ['Vorgänger = Ziel-Version', (e) => { e.vorgaenger[0] = { ...e.vorgaenger[0], version: '6.4.0', file: 'pod/v6/lspod-designer-v6-6.4.0.js', url: 'https://abannews.com/pod/v6/lspod-designer-v6-6.4.0.js' }; }, /nicht älter/],
    ['Vorgänger neuer als Ziel', (e) => { e.vorgaenger[0] = { ...e.vorgaenger[0], version: '6.5.0', file: 'pod/v6/lspod-designer-v6-6.5.0.js', url: 'https://abannews.com/pod/v6/lspod-designer-v6-6.5.0.js' }; }, /nicht älter/],
    ['Vorgänger doppelt', (e) => { e.vorgaenger[1] = { ...e.vorgaenger[0] }; }, /doppelt/],
    ['Vorgänger mit SHA des Ziels', (e) => { e.vorgaenger[0].sha256 = e.sha256; }, /doppelt oder gleich dem Ziel/],
  ];
  for (const [, f, rx] of faelle) { const e = kopie(); f(e); wirft(() => editorReleaseFormPruefen(e), rx); }
  wirft(() => editorReleaseFormPruefen(null), /Schema 1/);
});

// ---- Bauskript editor_release_bauen.mjs ----------------------------------------------------------------
test('editor_release_bauen: erzeugt die JSON aus den Dateibytes (deterministisch, ohne Vorlage), erkennt jede Abweichung', () => {
  const t = mkdtempSync(join(tmpdir(), 'v64-bauen-'));
  try {
    mkdirSync(join(t, 'pod/v6'), { recursive: true });
    const inhalt = { '6.3.0': 'alt-eins', '6.3.1': 'alt-zwei', '6.4.0': 'neu-ziel' };
    for (const [v, text] of Object.entries(inhalt)) writeFileSync(join(t, `pod/v6/lspod-designer-v6-${v}.js`), text);
    const er = editorReleaseErzeugen({ root: t });
    const h = (x) => createHash('sha256').update(x).digest('hex');
    assert.equal(er.version, '6.4.0'); assert.equal(er.sha256, h('neu-ziel')); assert.equal(er.bytes, 8);
    assert.deepEqual(er.vorgaenger.map((v) => [v.version, v.sha256, v.bytes]), [['6.3.0', h('alt-eins'), 8], ['6.3.1', h('alt-zwei'), 8]]);
    assert.equal(er.url, 'https://abannews.com/pod/v6/lspod-designer-v6-6.4.0.js');
    assert.equal(editorReleaseText(er), editorReleaseText(editorReleaseErzeugen({ root: t })), 'nicht deterministisch');
    assert.ok(editorReleaseText(er).endsWith('}\n'));
    assert.deepEqual(editorReleaseAbgleichen(er, { root: t }), []);
    assert.match(editorReleaseAbgleichen({ ...er, bytes: er.bytes + 1 }, { root: t }).join('|'), /9 Byte statt|8 Byte statt|Byte statt/, 'nur die Byteanzahl weicht ab, wurde nicht erkannt');
    writeFileSync(join(t, 'pod/v6/lspod-designer-v6-6.4.0.js'), 'neu-ziel!');
    assert.match(editorReleaseAbgleichen(er, { root: t }).join('|'), /6\.4\.0\.js: sha256/);
    writeFileSync(join(t, 'pod/v6/lspod-designer-v6-6.4.0.js'), 'neu-ziel'); writeFileSync(join(t, 'pod/v6/lspod-designer-v6-6.3.1.js'), 'ALT-ZWEI');
    assert.match(editorReleaseAbgleichen(er, { root: t }).join('|'), /6\.3\.1\.js: sha256/);
    rmSync(join(t, 'pod/v6/lspod-designer-v6-6.3.0.js'));
    assert.match(editorReleaseAbgleichen(er, { root: t }).join('|'), /6\.3\.0\.js: Datei fehlt/);
    wirft(() => editorReleaseErzeugen({ root: t }), /Editor-Datei fehlt: pod\/v6\/lspod-designer-v6-6\.3\.0\.js/);
    wirft(() => editorReleaseErzeugen({ root: t, vorgaenger: ['6.3.1', '6.4.0'] }), /nicht älter|doppelt/);
    assert.match(editorReleaseAbgleichen({ ...er, sha256: 'zz' }, { root: t })[0], /sha256 unbrauchbar/);
  } finally { rmSync(t, { recursive: true, force: true }); }
});
test('editor_release_bauen (Kommandozeile): schreibt, --pruefen schlägt bei geänderter Datei fehl (Exit 1) und schreibt nichts', () => {
  const t = mkdtempSync(join(tmpdir(), 'v64-cli-'));
  try {
    mkdirSync(join(t, 'pod/v6'), { recursive: true });
    for (const [v, text] of Object.entries({ '6.3.0': 'a', '6.3.1': 'b', '6.4.0': 'c' })) writeFileSync(join(t, `pod/v6/lspod-designer-v6-${v}.js`), text);
    const out = join(t, 'er.json');
    const cli = (...a) => spawnSync(process.execPath, [HIER + 'editor_release_bauen.mjs', '--root', t, '--out', out, ...a], { encoding: 'utf8', timeout: 20000 });
    assert.equal(cli('--pruefen').status, 1, '--pruefen ohne Datei muss scheitern');
    const w = cli(); assert.equal(w.status, 0, w.stderr);
    assert.equal(readFileSync(out, 'utf8'), editorReleaseText(editorReleaseErzeugen({ root: t })));
    assert.equal(cli('--pruefen').status, 0);
    writeFileSync(join(t, 'pod/v6/lspod-designer-v6-6.4.0.js'), 'c2');
    const vorher = readFileSync(out, 'utf8');
    const p = cli('--pruefen'); assert.equal(p.status, 1); assert.match(p.stderr, /weicht von den Dateien ab/);
    assert.equal(readFileSync(out, 'utf8'), vorher, '--pruefen darf nichts schreiben');
    assert.equal(cli('--unbekannt').status, 1);
    assert.equal(cli('--pruefen', '--version', '6.4.1').status, 1);
  } finally { rmSync(t, { recursive: true, force: true }); }
});

// ---- Eingaben, Bestätigungen, Canary-Tabelle ------------------------------------------------------------
const ALLE_ACKS = ['V63_CANARY_TASSE', 'V63_FULL_19_SAFE', 'V63_ROLLBACK_TASSE', 'V63_ROLLBACK_19_SAFE',
  'V64_CANARY_TASSE', 'V64_CANARY_JUTEBEUTEL', 'V64_FREI_MAGNET', 'V64_FULL_17_EDITOR', 'V64_ROLLBACK_TASSE', 'V64_ROLLBACK_JUTEBEUTEL', 'V64_ROLLBACK_MAGNET', 'V64_ROLLBACK_17_EDITOR',
  '', 'v64_canary_tasse', 'V64_CANARY_TASSE ', ' V64_CANARY_TASSE', 'V64_FULL_17_EDITOR\n', 'V64_CANARY', 'V64_FULL_19_SAFE', 'V63_FULL_17_EDITOR',
  'V64_FULL_16_EDITOR', 'V64_ROLLBACK_16_EDITOR', 'V64_CANARY_MAGNET', 'V64_FREI_MAGNET ', 'v64_frei_magnet'];   // die alten 16er-Bestätigungen (bis 10.11.2026) gelten nicht mehr
const SOLL64 = { apply: { 'canary-tasse': 'V64_CANARY_TASSE', 'canary-jutebeutel': 'V64_CANARY_JUTEBEUTEL', 'frei-magnet': 'V64_FREI_MAGNET', full: 'V64_FULL_17_EDITOR' }, rollback: { 'canary-tasse': 'V64_ROLLBACK_TASSE', 'canary-jutebeutel': 'V64_ROLLBACK_JUTEBEUTEL', 'frei-magnet': 'V64_ROLLBACK_MAGNET', full: 'V64_ROLLBACK_17_EDITOR' } };
const SOLL63 = { apply: { canary: 'V63_CANARY_TASSE', full: 'V63_FULL_19_SAFE' }, rollback: { canary: 'V63_ROLLBACK_TASSE', full: 'V63_ROLLBACK_19_SAFE' } };
test('6.4.0: jeder Schreiblauf nimmt genau die eine zugehörige V64-Bestätigung, keine V63-, keine fremde, keine fast richtige', () => {
  let geprueft = 0;
  for (const mode of ['apply', 'rollback']) for (const [scope, soll] of Object.entries(SOLL64[mode])) for (const ack of ALLE_ACKS) {
    const eingabe = { mode, scope, ack, live: true, editorVersion: '6.4.0' };
    if (ack === soll) assert.equal(rolloutKonfig(eingabe).ack, soll, `${mode}/${scope}: richtige Bestätigung abgelehnt`);
    else wirft(() => rolloutKonfig(eingabe), /braucht ACK=/);
    geprueft++;
  }
  assert.equal(geprueft, 2 * 4 * ALLE_ACKS.length);
  assert.equal(new Set([...Object.values(SOLL64.apply), ...Object.values(SOLL64.rollback)]).size, 8, 'jede Stufe hat ihre eigene Bestätigung');
});
test('6.4.0: die vier alten V63-Zeichenketten bestätigen nie einen 6.4.0-Schreiblauf; V64-Zeichenketten nie einen 6.3.1-Lauf', () => {
  for (const [mode, scope] of [['apply', 'canary-tasse'], ['apply', 'canary-jutebeutel'], ['apply', 'frei-magnet'], ['apply', 'full'], ['rollback', 'canary-tasse'], ['rollback', 'canary-jutebeutel'], ['rollback', 'frei-magnet'], ['rollback', 'full']]) {
    for (const ack of ['V63_CANARY_TASSE', 'V63_FULL_19_SAFE', 'V63_ROLLBACK_TASSE', 'V63_ROLLBACK_19_SAFE']) wirft(() => rolloutKonfig({ mode, scope, ack, live: true, editorVersion: '6.4.0' }), /braucht ACK=V64_/);
  }
  for (const mode of ['apply', 'rollback']) for (const scope of ['canary', 'full']) {
    for (const ack of ALLE_ACKS.filter((a) => a.startsWith('V64'))) wirft(() => rolloutKonfig({ mode, scope, ack, live: true }), /braucht ACK=/);
    assert.equal(rolloutKonfig({ mode, scope, ack: SOLL63[mode][scope], live: true }).ack, SOLL63[mode][scope], 'alter Pfad: richtige V63-Bestätigung abgelehnt');
  }
});
test('Eingaben: Plan braucht weder LIVE noch Bestätigung, Schreiben braucht LIVE=1; 6.4.0 kennt nur die vier festen Scopes', () => {
  assert.deepEqual([...SCOPES_V64], ['canary-tasse', 'canary-jutebeutel', 'frei-magnet', 'full']); assert.ok(Object.isFrozen(SCOPES_V64));
  for (const scope of ['canary-tasse', 'canary-jutebeutel', 'frei-magnet', 'full']) {
    const k = rolloutKonfig({ mode: 'plan', scope, ack: '', live: false, editorVersion: '6.4.0' });
    assert.equal(k.mode, 'plan'); assert.equal(k.ack, ''); assert.equal(k.editorUrlPfad, '/pod/v6/lspod-designer-v6-6.4.0.js');
    wirft(() => rolloutKonfig({ mode: 'apply', scope, ack: SOLL64.apply[scope], live: false, editorVersion: '6.4.0' }), /LIVE=1 fehlt/);
    wirft(() => rolloutKonfig({ mode: 'rollback', scope, ack: SOLL64.rollback[scope], live: false, editorVersion: '6.4.0' }), /LIVE=1 fehlt/);
  }
  for (const scope of ['canary', 'CANARY-HOODIE', 'canary-tasse;x', 'alle', '', undefined, 'canary-tasse ', 'full,canary-tasse', 'magnet', 'frei', 'frei-magnet ', 'canary-magnet', 'frei-dad-cap']) wirft(() => rolloutKonfig({ mode: 'plan', scope, editorVersion: '6.4.0' }), /SCOPE muss canary-tasse, canary-jutebeutel, frei-magnet oder full sein/);
  wirft(() => rolloutKonfig({ mode: 'plan', scope: 'frei-magnet' }), /SCOPE muss canary oder full sein/);   // der alte Pfad kennt die Einzelstufe nicht
  wirft(() => rolloutKonfig({ mode: 'plan', scope: 'canary-tasse', editorVersion: '6.4.1' }), /EDITOR_VERSION muss/);
  wirft(() => rolloutKonfig({ mode: 'plan', scope: 'canary-tasse', editorVersion: '6.3.0' }), /EDITOR_VERSION muss/);
  wirft(() => rolloutKonfig({ mode: 'loeschen', scope: 'full', editorVersion: '6.4.0' }), /MODE muss/);
  wirft(() => rolloutKonfig({ mode: 'plan', scope: 'canary-tasse' }), /SCOPE muss canary oder full sein/);   // alter Pfad kennt die 6.4.0-Scopes nicht
  assert.equal(rolloutKonfig({ mode: 'PLAN', scope: 'FULL', editorVersion: '6.4.0' }).scope, 'full');
  const alt = rolloutKonfig({});
  assert.equal(alt.editorVersion, ROLLOUT_V63); assert.equal(alt.scope, 'canary'); assert.equal(alt.mode, 'plan'); assert.equal(alt.editorUrlPfad, '/pod/v6/lspod-designer-v6-6.3.1.js');
});
test('Einzelstufen sind fest einprogrammiert: Stufe A Keramik-Tasse, Stufe B Bio-Jutebeutel, Freischaltung Magnet; full hat kein Einzelprodukt; alle stehen in der Allowlist', () => {
  assert.deepEqual(Object.keys(CANARY_V64), ['canary-tasse', 'canary-jutebeutel', 'frei-magnet']);
  assert.equal(CANARY_V64['frei-magnet'].id, 'gid://shopify/Product/15427217195393');
  assert.equal(CANARY_V64['frei-magnet'].handle, 'magnet-zum-selbstgestalten');
  assert.equal(CANARY_V64['frei-magnet'].id, FREIGESCHALTET[0].id);
  assert.equal(CANARY_V64['canary-tasse'].id, 'gid://shopify/Product/15422823465345');
  assert.equal(CANARY_V64['canary-tasse'].handle, 'keramik-tasse-selbst-gestalten');
  assert.equal(CANARY_V64['canary-jutebeutel'].id, 'gid://shopify/Product/15422819991937');
  assert.equal(CANARY_V64['canary-jutebeutel'].handle, 'bio-jutebeutel-selbst-gestalten');
  assert.ok(Object.isFrozen(CANARY_V64) && Object.isFrozen(CANARY_V64['canary-tasse']));
  for (const c of Object.values(CANARY_V64)) assert.ok(ALLOWLIST.some((a) => a.id === c.id && a.handle === c.handle), `${c.handle} nicht in der Allowlist`);
  const k = (scope) => rolloutKonfig({ mode: 'plan', scope, editorVersion: '6.4.0' });
  assert.equal(k('canary-tasse').canary.handle, 'keramik-tasse-selbst-gestalten');
  assert.equal(k('canary-jutebeutel').canary.handle, 'bio-jutebeutel-selbst-gestalten');
  assert.equal(k('frei-magnet').canary.handle, 'magnet-zum-selbstgestalten');
  assert.equal(k('full').canary, null);
  assert.equal(rolloutKonfig({ mode: 'plan', scope: 'canary' }).canary.handle, 'keramik-tasse-selbst-gestalten');   // alter Pfad: wie bisher die Tasse
  // keine Umgebungsvariable und kein Eingabefeld wählt das Canary-Produkt
  const vorher = process.env.CANARY;
  process.env.CANARY = 'unisex-hoodie-selbst-gestalten';
  try { assert.equal(k('canary-tasse').canary.handle, 'keramik-tasse-selbst-gestalten'); } finally { if (vorher === undefined) delete process.env.CANARY; else process.env.CANARY = vorher; }
});
test('Auswahl: Canary genau ein festes Produkt; Full (6.4.0) prüft die Sperrprodukte zuerst; alter Pfad unverändert', () => {
  const plan = [...ALLOWLIST.map((a) => ({ kind: 'editor', id: a.id, handle: a.handle })), ...BLOCKLIST.map((b) => ({ kind: 'blocked', id: b.id, handle: b.handle }))];
  const k = (scope, editorVersion = '6.4.0') => rolloutKonfig({ mode: 'plan', scope, editorVersion });
  assert.deepEqual(auswahlPlanen(plan, k('canary-tasse')).map((x) => x.handle), ['keramik-tasse-selbst-gestalten']);
  assert.deepEqual(auswahlPlanen(plan, k('canary-jutebeutel')).map((x) => x.handle), ['bio-jutebeutel-selbst-gestalten']);
  assert.deepEqual(auswahlPlanen(plan, k('frei-magnet')).map((x) => [x.kind, x.handle]), [['editor', 'magnet-zum-selbstgestalten']]);
  const voll = auswahlPlanen(plan, k('full'));
  assert.equal(voll.length, 19);
  assert.deepEqual(voll.slice(0, 2).map((x) => x.kind), ['blocked', 'blocked']);
  assert.deepEqual(voll.slice(2).map((x) => x.handle), ALLOWLIST.map((a) => a.handle), 'Reihenfolge der Editorprodukte geändert');
  assert.equal(voll.filter((x) => x.kind === 'editor').length, 17); assert.ok(voll.some((x) => x.kind === 'editor' && x.handle === 'magnet-zum-selbstgestalten'));
  assert.deepEqual(auswahlPlanen(plan, k('full', '6.3.1')), plan, 'alter Pfad: Full unverändert in Planreihenfolge');
  assert.deepEqual(auswahlPlanen(plan, k('canary', '6.3.1')).map((x) => x.handle), ['keramik-tasse-selbst-gestalten']);
  wirft(() => auswahlPlanen(plan.filter((x) => x.handle !== 'bio-jutebeutel-selbst-gestalten'), k('canary-jutebeutel')), /Canary nicht genau einmal/);
  wirft(() => auswahlPlanen([...plan, plan[2]], k('canary-jutebeutel')), /Canary nicht genau einmal/);
  wirft(() => auswahlPlanen(null, k('full')), /Plan ohne Produktliste/);
  // ROLLBACK: keine Sperren zuerst (sie werden nie geschrieben; eine veränderte Sperrseite darf den Rückweg nicht aufhalten)
  const kr = (scope, editorVersion = '6.4.0') => rolloutKonfig({ mode: 'rollback', scope, ack: SOLL64.rollback[scope] || SOLL63.rollback[scope], live: true, editorVersion });
  assert.deepEqual(auswahlPlanen(plan, kr('full')), plan, 'Rollback full: Planreihenfolge ohne Vorrang für Sperren');
  assert.deepEqual(auswahlPlanen(plan, kr('canary-tasse')).map((x) => x.handle), ['keramik-tasse-selbst-gestalten']);
  assert.deepEqual(auswahlPlanen(plan, kr('frei-magnet')).map((x) => x.handle), ['magnet-zum-selbstgestalten']);
  wirft(() => auswahlPlanen(plan.filter((x) => x.handle !== 'magnet-zum-selbstgestalten'), k('frei-magnet')), /Canary nicht genau einmal/);
  assert.equal(auswahlPlanen(plan, k('full'))[0].kind, 'blocked', 'Plan/Apply full: Sperren weiter zuerst');
});
test('Canary-Ledger: nur exakt das Canary-Produkt (Rollback-Schutz), bei Full keine Einschränkung', () => {
  const k = (scope) => rolloutKonfig({ mode: 'plan', scope, editorVersion: '6.4.0' });
  const tasse = CANARY_V64['canary-tasse'].id; const beutel = CANARY_V64['canary-jutebeutel'].id; const magnet = CANARY_V64['frei-magnet'].id;
  assert.equal(canaryLedgerPruefen(k('frei-magnet'), [magnet]), true);
  wirft(() => canaryLedgerPruefen(k('frei-magnet'), [tasse]), /Canary-Ledger enthält nicht exakt das Canary-Produkt magnet-zum-selbstgestalten/);
  wirft(() => canaryLedgerPruefen(k('frei-magnet'), [magnet, tasse]), /Canary-Ledger/);
  wirft(() => canaryLedgerPruefen(k('canary-tasse'), [magnet]), /Canary-Ledger/);
  assert.equal(canaryLedgerPruefen(k('canary-tasse'), [tasse]), true);
  assert.equal(canaryLedgerPruefen(k('canary-jutebeutel'), [beutel]), true);
  wirft(() => canaryLedgerPruefen(k('canary-tasse'), [beutel]), /Canary-Ledger/);
  wirft(() => canaryLedgerPruefen(k('canary-jutebeutel'), [tasse]), /Canary-Ledger/);
  wirft(() => canaryLedgerPruefen(k('canary-tasse'), [tasse, beutel]), /Canary-Ledger/);
  wirft(() => canaryLedgerPruefen(k('canary-tasse'), []), /Canary-Ledger/);
  assert.equal(canaryLedgerPruefen(k('full'), [tasse, beutel]), true);
});

test('Rollback-Ledger: nur Zeilen, bei denen der Apply geschrieben hat (oder unklar blieb), lassen sich zurückstellen; sonst klarer Abbruch', () => {
  assert.deepEqual([...APPLY_LEDGER_ZUSTAENDE].sort(), ['applied', 'rejected', 'unchanged', 'unknown', 'unknown-readback', 'unknown-readback-unavailable', 'unknown-write-response', 'writing']);
  assert.deepEqual([...ROLLBACK_SCHREIBBAR].sort(), ['applied', 'unknown', 'unknown-readback', 'unknown-readback-unavailable', 'unknown-write-response', 'writing']);
  const z = (id, state) => ({ id, handle: id, state });
  assert.deepEqual([...rollbackLedgerAuswerten([z('a', 'applied'), z('b', 'unchanged'), z('c', 'rejected')])], ['a']);
  for (const state of ROLLBACK_SCHREIBBAR) assert.deepEqual([...rollbackLedgerAuswerten([z('a', state), z('b', 'unchanged')])], ['a'], state);
  for (const state of ['unchanged', 'rejected']) wirft(() => rollbackLedgerAuswerten([z('a', state)]), /nichts zurückzunehmen/);
  wirft(() => rollbackLedgerAuswerten([z('a', 'unchanged'), z('b', 'unchanged'), z('c', 'rejected')]), /unchanged 2, rejected 1\): nichts zurückzunehmen/);
  wirft(() => rollbackLedgerAuswerten([]), /leer\): nichts zurückzunehmen/);
  wirft(() => rollbackLedgerAuswerten([z('a', 'unbekannt')]), /nichts zurückzunehmen/);
  wirft(() => rollbackLedgerAuswerten(null), /ohne Produktliste/);
  assert.ok(Object.isFrozen(APPLY_LEDGER_ZUSTAENDE) && Object.isFrozen(ROLLBACK_SCHREIBBAR));
});
test('Rollback-Identität: nur ID und Handle aus Allowlist/Sperrliste und Plan; Status, Kaufbarkeit und Varianten spielen keine Rolle', () => {
  const a = ALLOWLIST[2]; const b = BLOCKLIST[0];
  assert.equal(produktIdentitaetPruefen({ id: a.id, handle: a.handle, status: 'DRAFT', onlineStoreUrl: null, variants: { nodes: [] } }, a.id, a.handle), true);
  assert.equal(produktIdentitaetPruefen({ id: b.id, handle: b.handle }, b.id, b.handle), true);
  wirft(() => produktIdentitaetPruefen({ id: a.id, handle: 'anderes-handle' }, a.id, a.handle), /Identität/);
  wirft(() => produktIdentitaetPruefen({ id: ALLOWLIST[3].id, handle: a.handle }, a.id, a.handle), /Identität/);
  wirft(() => produktIdentitaetPruefen({ id: a.id, handle: a.handle }, a.id, 'anderes-handle'), /Identität/);        // Planzeile passt nicht zur Allowlist
  wirft(() => produktIdentitaetPruefen({ id: 'gid://shopify/Product/1', handle: 'fremd' }, 'gid://shopify/Product/1', 'fremd'), /Identität/);
  wirft(() => produktIdentitaetPruefen(null, a.id, a.handle), /Identität/);
});

// ---- Skript im Kindprozess: Verdrahtung der Eingaben, rein lokal, ohne Netz und ohne Zugangsdaten ------------
const SKRIPT = HIER + 'direct_rollout.mjs';
const lauf = (env) => spawnSync(process.execPath, [SKRIPT], { env: { PATH: process.env.PATH || '', HOME: tmpdir(), ...env }, encoding: 'utf8', timeout: 60000 });
test('direct_rollout.mjs (Kindprozess): falsche Bestätigungen, Scopes und fehlendes LIVE stoppen vor jedem Zugriff', () => {
  const faelle = [
    [{ EDITOR_VERSION: '6.4.0', MODE: 'apply', LIVE: '1', SCOPE: 'canary-tasse', ACK: 'V63_CANARY_TASSE' }, /Apply \(canary-tasse\) braucht ACK=V64_CANARY_TASSE/],
    [{ EDITOR_VERSION: '6.4.0', MODE: 'apply', LIVE: '1', SCOPE: 'canary-jutebeutel', ACK: 'V64_CANARY_TASSE' }, /braucht ACK=V64_CANARY_JUTEBEUTEL/],
    [{ EDITOR_VERSION: '6.4.0', MODE: 'apply', LIVE: '1', SCOPE: 'full', ACK: 'V63_FULL_19_SAFE' }, /braucht ACK=V64_FULL_17_EDITOR/],
    [{ EDITOR_VERSION: '6.4.0', MODE: 'apply', LIVE: '1', SCOPE: 'full', ACK: 'V64_FULL_16_EDITOR' }, /braucht ACK=V64_FULL_17_EDITOR/],
    [{ EDITOR_VERSION: '6.4.0', MODE: 'apply', LIVE: '1', SCOPE: 'frei-magnet', ACK: 'V64_FULL_17_EDITOR' }, /Apply \(frei-magnet\) braucht ACK=V64_FREI_MAGNET/],
    [{ EDITOR_VERSION: '6.4.0', MODE: 'rollback', LIVE: '1', SCOPE: 'frei-magnet', ACK: 'V64_FREI_MAGNET' }, /Rollback \(frei-magnet\) braucht ACK=V64_ROLLBACK_MAGNET/],
    [{ EDITOR_VERSION: '6.4.0', MODE: 'apply', SCOPE: 'frei-magnet', ACK: 'V64_FREI_MAGNET' }, /LIVE=1 fehlt/],
    [{ MODE: 'apply', LIVE: '1', SCOPE: 'frei-magnet', ACK: 'V64_FREI_MAGNET' }, /SCOPE muss canary oder full sein/],
    [{ EDITOR_VERSION: '6.4.0', MODE: 'rollback', LIVE: '1', SCOPE: 'canary-tasse', ACK: 'V63_ROLLBACK_TASSE' }, /braucht ACK=V64_ROLLBACK_TASSE/],
    [{ EDITOR_VERSION: '6.4.0', MODE: 'rollback', LIVE: '1', SCOPE: 'full', ACK: 'V64_FULL_17_EDITOR' }, /braucht ACK=V64_ROLLBACK_17_EDITOR/],
    [{ EDITOR_VERSION: '6.4.0', MODE: 'apply', SCOPE: 'canary-tasse', ACK: 'V64_CANARY_TASSE' }, /LIVE=1 fehlt/],
    [{ EDITOR_VERSION: '6.4.0', MODE: 'plan', SCOPE: 'canary' }, /SCOPE muss canary-tasse, canary-jutebeutel, frei-magnet oder full sein/],
    [{ EDITOR_VERSION: '6.4.0', MODE: 'plan' }, /SCOPE muss canary-tasse/],
    [{ EDITOR_VERSION: '6.4.1', MODE: 'plan', SCOPE: 'full' }, /EDITOR_VERSION muss/],
    [{ MODE: 'apply', LIVE: '1', SCOPE: 'canary', ACK: 'V64_CANARY_TASSE' }, /Canary braucht ACK=V63_CANARY_TASSE/],
    [{ MODE: 'apply', LIVE: '1', SCOPE: 'canary-tasse', ACK: 'V63_CANARY_TASSE' }, /SCOPE muss canary oder full sein/],
  ];
  for (const [env, rx] of faelle) {
    const r = lauf(env);
    assert.notEqual(r.status, 0, `lief durch: ${JSON.stringify(env)}`);
    assert.match(r.stderr, rx, JSON.stringify(env));
    assert.doesNotMatch(r.stderr, /Shopify-Zugangsdaten|Shop-Identität|fetch failed/, `kam über die Eingabeprüfung hinaus: ${JSON.stringify(env)}`);
  }
});
test('direct_rollout.mjs (Kindprozess): die richtigen V64-Eingaben passieren die Prüfung und enden erst am fehlenden Zugang (kein Netz, kein Schreiben)', () => {
  const ohneZugang = { SHOPIFY_ADMIN_TOKEN: '', SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '' };
  for (const [scope, ack] of Object.entries(SOLL64.apply)) {
    const r = lauf({ ...ohneZugang, EDITOR_VERSION: '6.4.0', MODE: 'apply', LIVE: '1', SCOPE: scope, ACK: ack });
    assert.notEqual(r.status, 0); assert.match(r.stderr, /Shopify-Zugangsdaten fehlen/, `${scope}: ${r.stderr.slice(0, 300)}`);
  }
  const plan = lauf({ ...ohneZugang, EDITOR_VERSION: '6.4.0', MODE: 'plan', SCOPE: 'canary-jutebeutel' });
  assert.match(plan.stderr, /Shopify-Zugangsdaten fehlen/, plan.stderr.slice(0, 300));
  const alt = lauf({ ...ohneZugang, MODE: 'plan', SCOPE: 'canary' });     // alter Pfad bleibt lauffähig
  assert.match(alt.stderr, /Shopify-Zugangsdaten fehlen/, alt.stderr.slice(0, 300));
});
test('direct_rollout.mjs (Kindprozess): weicht eine Editor-Datei von editor-release.json ab, stoppt der 6.4.0-Lauf rein lokal VOR dem Zugang', () => {
  const t = mkdtempSync(join(tmpdir(), 'v64-assets-'));
  try {
    mkdirSync(join(t, 'maps'));
    cpSync(WURZEL + 'pod/v6/maps', join(t, 'maps'), { recursive: true });
    for (const e of [ER, ...ER.vorgaenger]) cpSync(WURZEL + e.file, join(t, e.file.split('/').pop()));
    const basis = { SHOPIFY_ADMIN_TOKEN: '', SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '', EDITOR_VERSION: '6.4.0', MODE: 'plan', SCOPE: 'full', ASSET_ROOT: t };
    assert.match(lauf(basis).stderr, /Shopify-Zugangsdaten fehlen/, 'unveränderte Kopie muss bis zum Zugang kommen');
    const ziel = join(t, ER.file.split('/').pop());
    writeFileSync(ziel, Buffer.concat([readFileSync(ziel), Buffer.from('\n')]));
    const r1 = lauf(basis);
    assert.notEqual(r1.status, 0); assert.match(r1.stderr, /editor-release\.json weicht von pod\/v6\/lspod-designer-v6-6\.4\.0\.js ab/); assert.doesNotMatch(r1.stderr, /Zugangsdaten/);
    cpSync(WURZEL + ER.file, ziel);
    const vor = join(t, ER.vorgaenger[1].file.split('/').pop());
    writeFileSync(vor, 'verändert');
    assert.match(lauf(basis).stderr, /weicht von pod\/v6\/lspod-designer-v6-6\.3\.1\.js ab/);
    rmSync(vor);
    assert.match(lauf(basis).stderr, /Lokale Editor-Datei fehlt/);
    // alter Pfad (6.3.1) hängt nicht an 6.4.0
    rmSync(ziel);
    cpSync(WURZEL + ER.vorgaenger[1].file, join(t, 'lspod-designer-v6-6.3.1.js'));
    assert.match(lauf({ ...basis, EDITOR_VERSION: '' }).stderr, /Zugangsdaten fehlen|SCOPE muss/, 'alter Pfad braucht die 6.4.0-Datei nicht');
    assert.match(lauf({ ...basis, EDITOR_VERSION: '', SCOPE: 'canary' }).stderr, /Shopify-Zugangsdaten fehlen/);
  } finally { rmSync(t, { recursive: true, force: true }); }
});

// ---- Rollback-Artefakt im Kindprozess: Plan, Release, Sicherungen und Ledger werden VOR dem Zugang geprüft ------
const relAlt = releaseAusAllowlist(allowlistReal, { editorSha256: allowlistReal.editorSha256, assetSha256: assetShaReal });
function artefaktBauen(dir, { scope = 'canary-tasse', editorVersion = '6.4.0', release = releaseReal, ledgerProdukte = null, metaMut = (m) => m, ledgerMut = (l) => l } = {}) {
  mkdirSync(dir, { recursive: true });
  const konf = rolloutKonfig({ mode: 'plan', scope, editorVersion });
  const produkte = [...ALLOWLIST.map((a) => ({ kind: 'editor', ...a })), ...BLOCKLIST.map((b) => ({ kind: 'blocked', ...b }))].map((x) => {
    const vorher = `<p>vorher ${x.handle}</p>`; const nachher = `<p>nachher ${x.handle}</p>`;
    writeFileSync(join(dir, `${x.numericId}.before.html`), vorher); writeFileSync(join(dir, `${x.numericId}.after.html`), nachher);
    return { kind: x.kind, id: x.id, numericId: x.numericId, handle: x.handle, title: x.handle, updatedAt: '2026-11-09T00:00:00Z', onlineStoreUrl: `https://luxestyle.ch/products/${x.handle}`, expectedVariantIds: ['1'], vorherSha256: sha256(vorher), nachherSha256: sha256(nachher), geaendert: true };
  });
  const releaseText = `${JSON.stringify(release, null, 2)}\n`;
  writeFileSync(join(dir, 'release.json'), releaseText);
  const meta = metaMut({ schema: 2, createdAt: '2026-11-09T00:00:00Z', shop: 'au3j0y-hq.myshopify.com', primaryDomain: 'luxestyle.ch', currency: 'CHF', releaseSha256: sha256(releaseText), scope: konf.scope, canary: konf.canary ? konf.canary.handle : null, ...(editorVersion === '6.4.0' ? { editorVersion } : {}), products: produkte });
  const planText = `${JSON.stringify(meta, null, 2)}\n`;
  writeFileSync(join(dir, 'plan.json'), planText);
  const ids = ledgerProdukte || (konf.canary ? [konf.canary.id] : ALLOWLIST.map((a) => a.id));
  const ledger = ledgerMut({ schema: 1, startedAt: '2026-11-09T00:00:00Z', mode: 'apply', scope: konf.scope, sourcePlanSha256: sha256(planText), products: ids.map((id) => ({ id, handle: 'x', state: 'applied', sha256: 'x' })) });
  writeFileSync(join(dir, 'ledger.json'), `${JSON.stringify(ledger, null, 2)}\n`);
}
test('Rollback (Kindprozess): das Artefakt wird vor dem Zugang gegen Editor-Release, Scope, Canary-Produkt und Ledger geprüft', () => {
  const t = mkdtempSync(join(tmpdir(), 'v64-rollback-'));
  try {
    const ohneZugang = { SHOPIFY_ADMIN_TOKEN: '', SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '' };
    const rb = (dir, scope, ack, extra = {}) => lauf({ ...ohneZugang, EDITOR_VERSION: '6.4.0', MODE: 'rollback', LIVE: '1', SCOPE: scope, ACK: ack, ROLLBACK_PLAN: dir, ...extra });
    const gut = (name, dir, scope, ack, extra) => { const r = rb(dir, scope, ack, extra); assert.match(r.stderr, /Shopify-Zugangsdaten fehlen/, `${name}: ${r.stderr.slice(0, 400)}`); };
    const schlecht = (name, dir, scope, ack, rxFehler, extra) => { const r = rb(dir, scope, ack, extra); assert.notEqual(r.status, 0, name); assert.match(r.stderr, rxFehler, `${name}: ${r.stderr.slice(0, 400)}`); assert.doesNotMatch(r.stderr, /Zugangsdaten/, `${name}: kam bis zum Zugang`); };
    const d = (n) => join(t, n);
    artefaktBauen(d('tasse')); gut('gültiges Tassen-Artefakt', d('tasse'), 'canary-tasse', 'V64_ROLLBACK_TASSE');
    artefaktBauen(d('beutel'), { scope: 'canary-jutebeutel' }); gut('gültiges Jutebeutel-Artefakt', d('beutel'), 'canary-jutebeutel', 'V64_ROLLBACK_JUTEBEUTEL');
    artefaktBauen(d('full'), { scope: 'full' }); gut('gültiges Full-Artefakt', d('full'), 'full', 'V64_ROLLBACK_17_EDITOR');
    schlecht('Full-Artefakt mit der alten 16er-Bestätigung', d('full'), 'full', 'V64_ROLLBACK_16_EDITOR', /braucht ACK=V64_ROLLBACK_17_EDITOR/);
    artefaktBauen(d('magnet'), { scope: 'frei-magnet' }); gut('gültiges Magnet-Artefakt', d('magnet'), 'frei-magnet', 'V64_ROLLBACK_MAGNET');
    schlecht('Magnet-Artefakt als Tassen-Rollback', d('magnet'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Plan gehört zu einem anderen Editor-Release oder Scope/);
    schlecht('Tassen-Artefakt als Magnet-Rollback', d('tasse'), 'frei-magnet', 'V64_ROLLBACK_MAGNET', /Plan gehört zu einem anderen Editor-Release oder Scope/);
    artefaktBauen(d('magnetledger'), { scope: 'frei-magnet', ledgerProdukte: [CANARY_V64['canary-tasse'].id] });
    schlecht('Magnet-Artefakt mit fremdem Ledger-Produkt', d('magnetledger'), 'frei-magnet', 'V64_ROLLBACK_MAGNET', /Canary-Ledger enthält nicht exakt das Canary-Produkt magnet-zum-selbstgestalten/);
    // Artefakte von VOR der Freischaltung (bis 10.11.2026): der Magnet steht als Sperre im Plan und fehlt im Release. Nur der Rollback liest sie.
    const MAGNET_ID = FREIGESCHALTET[0].id;
    const altPlan = (m) => { m.products = m.products.map((x) => (x.id === MAGNET_ID ? { ...x, kind: 'blocked', nachherSha256: x.vorherSha256, geaendert: false } : x)); return m; };
    const relOhneMagnet = { ...releaseReal, products: releaseReal.products.filter((p) => p.id !== MAGNET_ID) };
    const ohneMagnetIds = ALLOWLIST.filter((a) => a.id !== MAGNET_ID).map((a) => a.id);
    const altSicherung = (dir) => writeFileSync(join(dir, '15427217195393.after.html'), readFileSync(join(dir, '15427217195393.before.html')));
    artefaktBauen(d('altfull'), { scope: 'full', release: relOhneMagnet, metaMut: altPlan, ledgerProdukte: ohneMagnetIds }); altSicherung(d('altfull'));
    gut('Full-Artefakt von vor der Freischaltung (Magnet als Sperre, Release mit 16 Produkten)', d('altfull'), 'full', 'V64_ROLLBACK_17_EDITOR');
    artefaktBauen(d('alttasse'), { release: relOhneMagnet, metaMut: altPlan }); altSicherung(d('alttasse'));
    gut('Tassen-Artefakt von vor der Freischaltung', d('alttasse'), 'canary-tasse', 'V64_ROLLBACK_TASSE');
    artefaktBauen(d('altnurplan'), { scope: 'full', metaMut: altPlan, ledgerProdukte: ohneMagnetIds }); altSicherung(d('altnurplan'));
    gut('alter Plan mit neuem Release (Magnet schon im Release) bleibt lesbar', d('altnurplan'), 'full', 'V64_ROLLBACK_17_EDITOR');
    artefaktBauen(d('altnurrelease'), { scope: 'full', release: relOhneMagnet, ledgerProdukte: ohneMagnetIds });
    gut('neuer Plan mit altem Release (ohne den Magneten) bleibt lesbar', d('altnurrelease'), 'full', 'V64_ROLLBACK_17_EDITOR');
    artefaktBauen(d('altfremd'), { scope: 'full', release: relOhneMagnet, ledgerProdukte: ohneMagnetIds, metaMut: (m) => { altPlan(m); m.products = m.products.map((x) => (x.handle === 'mauspad-selbst-gestalten' ? { ...x, kind: 'blocked' } : x)); return m; } }); altSicherung(d('altfremd'));
    schlecht('ein anderes Editorprodukt als Sperre im Plan', d('altfremd'), 'full', 'V64_ROLLBACK_17_EDITOR', /Planprodukt unzulässig\/doppelt/);
    artefaktBauen(d('altsperrealseditor'), { scope: 'full', metaMut: (m) => { m.products = m.products.map((x) => (x.handle === 'dad-cap-selbst-gestalten' ? { ...x, kind: 'editor' } : x)); return m; } });
    schlecht('ein Sperrprodukt als Editorprodukt im Plan', d('altsperrealseditor'), 'full', 'V64_ROLLBACK_17_EDITOR', /Planprodukt unzulässig\/doppelt/);
    artefaktBauen(d('altrelzwei'), { scope: 'full', release: { ...relOhneMagnet, products: relOhneMagnet.products.filter((p) => p.handle !== 'mauspad-selbst-gestalten') }, metaMut: altPlan, ledgerProdukte: ohneMagnetIds }); altSicherung(d('altrelzwei'));
    schlecht('altes Release, dem ein weiteres Produkt fehlt', d('altrelzwei'), 'full', 'V64_ROLLBACK_17_EDITOR', /Release-Manifest: erwartet 17 Produkte, gefunden 15/);
    schlecht('Artefakt der anderen Stufe', d('beutel'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Plan gehört zu einem anderen Editor-Release oder Scope/);
    schlecht('Full-Artefakt als Canary', d('full'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Plan gehört zu einem anderen Editor-Release oder Scope/);
    artefaktBauen(d('ohneversion'), { metaMut: (m) => { delete m.editorVersion; return m; } });
    schlecht('Plan ohne editorVersion unter 6.4.0', d('ohneversion'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Plan gehört zu einem anderen Editor-Release oder Scope/);
    artefaktBauen(d('falschversion'), { metaMut: (m) => { m.editorVersion = '6.3.1'; return m; } });
    schlecht('Plan mit editorVersion 6.3.1 unter 6.4.0', d('falschversion'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Plan gehört zu einem anderen Editor-Release oder Scope/);
    artefaktBauen(d('canaryfremd'), { metaMut: (m) => { m.canary = 'bio-jutebeutel-selbst-gestalten'; return m; } });
    schlecht('Plan nennt ein anderes Canary-Produkt', d('canaryfremd'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Plan gehört zu einem anderen Editor-Release oder Scope/);
    artefaktBauen(d('scopefremd'), { metaMut: (m) => { m.scope = 'full'; return m; } });
    schlecht('Plan nennt einen anderen Scope', d('scopefremd'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Plan gehört zu einem anderen Editor-Release oder Scope/);
    artefaktBauen(d('relalt'), { release: relAlt });
    schlecht('Release mit 6.3.1-Editor in einem 6.4.0-Artefakt', d('relalt'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Editor-URL oder SHA-256 unbrauchbar/);
    artefaktBauen(d('ledgerfremd'), { ledgerProdukte: [CANARY_V64['canary-jutebeutel'].id] });
    schlecht('Ledger mit fremdem Produkt', d('ledgerfremd'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Canary-Ledger enthält nicht exakt das Canary-Produkt keramik-tasse/);
    artefaktBauen(d('ledgerzwei'), { ledgerProdukte: [CANARY_V64['canary-tasse'].id, CANARY_V64['canary-jutebeutel'].id] });
    schlecht('Ledger mit zwei Produkten', d('ledgerzwei'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Canary-Ledger enthält nicht exakt/);
    artefaktBauen(d('ledgerscope'), { ledgerMut: (l) => { l.scope = 'full'; return l; } });
    schlecht('Ledger mit anderem Scope', d('ledgerscope'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Apply-Ledger passt nicht zum Rollback-Scope\/Plan/);
    artefaktBauen(d('wirkungslos'), { ledgerMut: (l) => { l.products.forEach((x) => { x.state = 'unchanged'; }); return l; } });
    schlecht('Artefakt eines wirkungslosen Apply (Ledger nur «unchanged»)', d('wirkungslos'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /nichts zurückzunehmen/);
    artefaktBauen(d('wirkungslosfull'), { scope: 'full', ledgerMut: (l) => { l.products.forEach((x, i) => { x.state = i % 2 ? 'rejected' : 'unchanged'; }); return l; } });
    schlecht('Full-Artefakt ohne einen einzigen Write', d('wirkungslosfull'), 'full', 'V64_ROLLBACK_17_EDITOR', /nichts zurückzunehmen/);
    artefaktBauen(d('writing'), { ledgerMut: (l) => { l.products[0].state = 'writing'; return l; } });
    gut('Absichtszeile «writing» (Lauf abgebrochen) bleibt rücknehmbar', d('writing'), 'canary-tasse', 'V64_ROLLBACK_TASSE');
    artefaktBauen(d('zustandfremd'), { ledgerMut: (l) => { l.products[0].state = 'halb-fertig'; return l; } });
    schlecht('unbekannter Ledger-Zustand', d('zustandfremd'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Apply-Ledger unzulässig/);
    artefaktBauen(d('ledgerplan'), { ledgerMut: (l) => { l.sourcePlanSha256 = 'f'.repeat(64); return l; } });
    schlecht('Ledger gehört zu einem anderen Plan', d('ledgerplan'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Apply-Ledger passt nicht/);
    artefaktBauen(d('sicherung'));
    writeFileSync(join(d('sicherung'), `${CANARY_V64['canary-tasse'].numericId}.before.html`), '<p>verfälscht</p>');
    schlecht('verfälschte Sicherung', d('sicherung'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /Sicherungsdatei fehlt oder Hash weicht ab/);
    schlecht('Artefakt fehlt', d('gibtsnicht'), 'canary-tasse', 'V64_ROLLBACK_TASSE', /ROLLBACK_PLAN mit plan\.json fehlt/);
    // alter Pfad (6.3.1): sein Artefakt (ohne editorVersion, Scope canary, 6.3.1-Release) bleibt rücknehmbar; ein 6.4.0-Artefakt nicht
    artefaktBauen(d('alt'), { scope: 'canary', editorVersion: '6.3.1', release: relAlt });
    gut('altes 6.3.1-Canary-Artefakt', d('alt'), 'canary', 'V63_ROLLBACK_TASSE', { EDITOR_VERSION: '' });
    schlecht('6.4.0-Artefakt im alten Pfad', d('tasse'), 'canary', 'V63_ROLLBACK_TASSE', /Plan gehört zu einem anderen Editor-Release oder Scope/, { EDITOR_VERSION: '' });
    artefaktBauen(d('altvoll'), { scope: 'full', editorVersion: '6.3.1', release: relAlt });
    gut('altes 6.3.1-Full-Artefakt', d('altvoll'), 'full', 'V63_ROLLBACK_19_SAFE', { EDITOR_VERSION: '' });
  } finally { rmSync(t, { recursive: true, force: true }); }
});

// ---- Release und Baustein für 6.4.0 -------------------------------------------------------------------
test('Release 6.4.0: Ziel aus editor-release.json, Karten/Vorschauen unverändert zum alten Weg, Allowlist darf den Hash eines Vorgängers tragen', () => {
  const alt = releaseAusAllowlist(allowlistReal, { editorSha256: allowlistReal.editorSha256, assetSha256: assetShaReal });
  assert.deepEqual(releaseReal.products, alt.products, 'Karten/Vorschauen/Varianten-Zuordnung weicht vom 6.3.1-Weg ab');
  assert.deepEqual(releaseReal.editor, { url: ER.url, sha256: ER.sha256 });
  assert.equal(releasePruefen(releaseReal, { editorPfad: '/pod/v6/lspod-designer-v6-6.4.0.js' }), true);
  wirft(() => releasePruefen(releaseReal), /Editor-URL/);                                              // alter Pfad akzeptiert 6.4.0 nicht
  wirft(() => releasePruefen(alt, { editorPfad: '/pod/v6/lspod-designer-v6-6.4.0.js' }), /Editor-URL/); // 6.4.0-Pfad akzeptiert 6.3.1 nicht
  const zielHash = releaseAusAllowlist({ ...sourceAllowlist, editorSha256: 'b'.repeat(64) }, { editor: { url: editorUrl('6.4.0'), sha256: 'b'.repeat(64) }, vorgaengerSha256: [H], assetSha256: sourceAssets });
  assert.equal(zielHash.editor.sha256, 'b'.repeat(64));                                                // neu gebaute Allowlist mit Ziel-Hash
  wirft(() => releaseAusAllowlist({ ...sourceAllowlist, editorSha256: 'c'.repeat(64) }, { editor: { url: editorUrl('6.4.0'), sha256: 'b'.repeat(64) }, vorgaengerSha256: [H], assetSha256: sourceAssets }), /weder zum Ziel-Release noch zu einem Vorgänger/);
  wirft(() => releaseAusAllowlist(sourceAllowlist, { editor: { url: 'https://example.org/pod/v6/lspod-designer-v6-6.4.0.js', sha256: 'b'.repeat(64) }, vorgaengerSha256: [H], assetSha256: sourceAssets }), /Ziel-Editor aus editor-release\.json unbrauchbar/);
  wirft(() => releaseAusAllowlist(sourceAllowlist, { editor: { url: editorUrl('6.4.0'), sha256: 'b'.repeat(63) }, vorgaengerSha256: [H], assetSha256: sourceAssets }), /unbrauchbar/);
  wirft(() => releaseAusAllowlist(sourceAllowlist, { editor: { url: `${editorUrl('6.4.0')}?v=1`, sha256: 'b'.repeat(64) }, vorgaengerSha256: [H], assetSha256: sourceAssets }), /unbrauchbar/);
});
test('Baustein 6.4.0: Script-Tag mit Dateiname 6.4.0, ?v= und SRI aus dem Hash der Datei (SRI unabhängig aus den Bytes nachgerechnet)', () => {
  const f = FX.produkte.find((p) => p.handle === 'bio-jutebeutel-selbst-gestalten');
  const rp = releaseReal.products.find((p) => p.id === f.id);
  const b = baustein({ product: { handle: f.handle, title: 'T', variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', availableForSale: true }] } }, releaseProduct: rp, editor: releaseReal.editor });
  assert.equal(zaehle(b, SKRIPT640), 1, 'Script-Tag weicht ab');
  const bytes = readFileSync(WURZEL + ER.file);
  assert.ok(b.includes(`integrity="sha256-${createHash('sha256').update(bytes).digest('base64')}"`), 'SRI passt nicht zu den Dateibytes (editor-release.json veraltet?)');
  assert.ok(b.includes(`lspod-designer-v6-6.4.0.js?v=${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}"`));
  assert.doesNotMatch(b, /6\.3\.[01]/);
});

// ---- gelockerter Planer ------------------------------------------------------------------------------
const fixtureProdukt = (f) => ({
  handle: f.handle,
  title: entescape(f.block.match(/data-produkttitel="([^"]*)"/)[1]),
  variants: { nodes: [{ id: `gid://shopify/ProductVariant/${f.block.match(/data-variant="(\d+)"/)[1]}`, availableForSale: true }] },
});
const neuerBlock = (f, release = releaseReal) => baustein({ product: fixtureProdukt(f), releaseProduct: release.products.find((p) => p.id === f.id), editor: release.editor });
const beschr = (block) => `<p>Vorspann &amp; Umlaute äöü</p>\n${block}<p>Rest</p>`;
const plane = (f, block = f.block, release = releaseReal) => editorReleasePlanen(beschr(block), neuerBlock(f, release), release.editor, { vorgaenger: VG });
const BASIS = FX.produkte.find((p) => p.handle === 'bio-jutebeutel-selbst-gestalten');
const OHNE_VORSCHAU = FX.produkte.find((p) => p.handle === 'allover-stoffbeutel-selbst-gestalten');
const SKRIPT630 = BASIS.block.match(/<script [^>]*><\/script>/)[0];
const SKRIPT631 = FX.tasse631.block.match(/<script [^>]*><\/script>/)[0];

test('Fixtures: 16 Editor-Blöcke in Allowlist-Reihenfolge (ohne den Magneten, der am 08.11. noch die Sperre trug) plus der 6.3.1-Block der Tasse, nur Editor-Blöcke (keine Kundentexte)', () => {
  assert.deepEqual(FX.produkte.map((p) => [p.id, p.handle]), ALLOWLIST.filter((a) => !freigeschaltet(a.id)).map((a) => [a.id, a.handle]));
  assert.equal(FX.produkte.length, 16);
  for (const f of [...FX.produkte, FX.tasse631]) {
    assert.ok(f.block.startsWith(`<!-- lx-v63-editor:start product=${f.id} card=`), f.handle);
    assert.match(f.block, /<!-- lx-v63-editor:end -->\s*$/);
    assert.equal(zaehle(f.block, '<div class="lspod-designer-v6"'), 1, f.handle);
    assert.doesNotMatch(f.block, /<p\b|<h\d\b|<br|ls-liefer|ls-pod-retoure|Rückgabe|info@/i, `${f.handle}: Block enthält Fliesstext`);
    assert.ok(f.block.length < 1500, `${f.handle}: Block ungewöhnlich gross`);
  }
  assert.equal(zaehle(JSON.stringify(FX.produkte.map((p) => p.block)), '6.3.0.js?v=e58e5c277e9ff45e'), 16);
  assert.equal(zaehle(FX.tasse631.block, '6.3.1.js?v=1e15aab9486f0b60'), 1);
  assert.equal(FX.tasse631.handle, 'keramik-tasse-selbst-gestalten');
});
test('Planer (a): jeder Live-Block der 16 Editorprodukte geht gegen 6.4.0 durch; geändert sind nur Script-Tag, Karten-/Vorschau-Version und card=', () => {
  for (const f of FX.produkte) {
    const g = plane(f);
    assert.equal(g.geaendert, true, f.handle);
    assert.equal(g.nachher, beschr(neuerBlock(f)), `${f.handle}: Ergebnis ist nicht der neue Baustein in der alten Umgebung`);
    assert.ok(g.nachher.startsWith('<p>Vorspann &amp; Umlaute äöü</p>\n<!-- lx-v63-editor:start') && g.nachher.endsWith('<p>Rest</p>'), `${f.handle}: Text ausserhalb des Blocks verändert`);
    assert.equal(zaehle(g.nachher, SKRIPT640), 1, `${f.handle}: 6.4.0-Script nicht genau einmal`);
    assert.equal(zaehle(g.nachher, 'lspod-designer-v6-6.3.0.js'), 0, `${f.handle}: altes Script blieb`);
    assert.equal(zaehle(g.nachher, 'lx-v63-editor:start'), 1);
    // unabhängige Zeilenprüfung: Zeile 0 (Marker) bis auf card=, Zeile 1 (Container) bis auf ?v=, Zeile 2 (Script) neu, Rest gleich
    const alt = f.block.split('\n'); const neu = neuerBlock(f).split('\n');
    assert.equal(alt.length, neu.length, f.handle);
    assert.equal(alt[0].replace(/card=[0-9a-f]{64}/, 'card=X'), neu[0].replace(/card=[0-9a-f]{64}/, 'card=X'), `${f.handle}: Marker`);
    assert.equal(alt[1].replace(/\?v=[0-9a-f]{16}/g, '?v=X'), neu[1].replace(/\?v=[0-9a-f]{16}/g, '?v=X'), `${f.handle}: Container`);
    assert.equal(alt.slice(3).join('\n'), neu.slice(3).join('\n'), `${f.handle}: Rest`);
  }
});
test('Planer (b): die Tasse (Block auf 6.3.1 nach dem Canary) geht ebenfalls gegen 6.4.0 durch', () => {
  const g = plane(FX.tasse631, FX.tasse631.block);
  assert.equal(g.geaendert, true);
  assert.equal(zaehle(FX.tasse631.block, SKRIPT631), 1);
  assert.equal(zaehle(g.nachher, SKRIPT631), 0, '6.3.1-Script blieb');
  assert.equal(zaehle(g.nachher, SKRIPT640), 1);
});
test('Planer (d): ein zweiter Plan auf dem Ergebnis ergibt geaendert=false und lässt die Beschreibung bytegleich (alle 16, Tasse inklusive)', () => {
  for (const f of [...FX.produkte, FX.tasse631]) {
    const g = plane(f, f.block);
    const g2 = editorReleasePlanen(g.nachher, neuerBlock(f), releaseReal.editor, { vorgaenger: VG });
    assert.equal(g2.geaendert, false, f.handle); assert.equal(g2.nachher, g.nachher, f.handle);
    assert.equal(g2.vorherSha256, g2.nachherSha256);
  }
});
test('Planer: Karten- und Vorschau-Hash dürfen wechseln (T-Shirt-Fall, Commit 1835d4361d), der Pfad der Datei nicht', () => {
  const H1 = 'b'.repeat(64); const H2 = 'c'.repeat(64);
  const release2 = { ...releaseReal, products: releaseReal.products.map((p) => ({ ...p, cardSha256: H1, previewSha256: p.previewUrl ? H2 : null })) };
  let mitVorschau = 0;
  for (const f of FX.produkte) {
    const g = plane(f, f.block, release2);
    assert.equal(g.geaendert, true);
    assert.ok(g.nachher.includes(`card=${H1} -->`), `${f.handle}: card= nicht erneuert`);
    assert.ok(g.nachher.includes(`.karte.json?v=${H1.slice(0, 16)}"`), `${f.handle}: Karten-?v= nicht erneuert`);
    if (f.block.includes('data-vorschau-url')) { mitVorschau++; assert.ok(g.nachher.includes(`.vorschau.json?v=${H2.slice(0, 16)}"`), `${f.handle}: Vorschau-?v= nicht erneuert`); }
    const g2 = editorReleasePlanen(g.nachher, neuerBlock(f, release2), release2.editor, { vorgaenger: VG });
    assert.equal(g2.geaendert, false);
  }
  assert.equal(mitVorschau, 9);
  // heutige lokale Karten: die zwei T-Shirt-Produkte tragen nach dem Plan die ?v= der lokalen Dateien
  for (const handle of ['shirt-zum-selbstgestalten', 'unisex-t-shirt-selbst-gestalten']) {
    const f = FX.produkte.find((p) => p.handle === handle); const a = ALLOWLIST.find((x) => x.handle === handle);
    const g = plane(f);
    assert.ok(g.nachher.includes(`lspod-${a.numericId}.karte.json?v=${assetShaReal.get(`lspod-${a.numericId}.karte.json`).slice(0, 16)}"`), `${handle}: lokale Karte nicht übernommen`);
    assert.ok(g.nachher.includes(`lspod-${a.numericId}.vorschau.json?v=${assetShaReal.get(`lspod-${a.numericId}.vorschau.json`).slice(0, 16)}"`), `${handle}: lokale Vorschau nicht übernommen`);
  }
});
test('Planer: der alte 6.3.1-Pfad (Vorgänger nur 6.3.0, Ziel 6.3.1) bleibt unverändert nutzbar und kennt die gleiche Lockerung', () => {
  const rel631 = releaseAusAllowlist(allowlistReal, { editorSha256: allowlistReal.editorSha256, assetSha256: assetShaReal });
  for (const f of FX.produkte) {
    const g = editorReleasePlanen(beschr(f.block), neuerBlock(f, rel631), rel631.editor);   // ohne vorgaenger: Vorgabe [6.3.0]
    assert.equal(g.geaendert, true);
    assert.equal(zaehle(g.nachher, 'lspod-designer-v6-6.3.1.js?v=1e15aab9486f0b60'), 1);
  }
  // Block schon auf dem Ziel 6.3.1 = «Ziel schon da», unverändert (Block aus dem heutigen Release gebaut, unabhängig vom Kartenstand der Fixture)
  const t = editorReleasePlanen(beschr(neuerBlock(FX.tasse631, rel631)), neuerBlock(FX.tasse631, rel631), rel631.editor);
  assert.equal(t.geaendert, false);
});
test('Planer (c): manipulierte Beschreibungen werfen weiter (Titel, Karten-/Vorschau-Pfad, Host, zweiter Marker, fremdes Skript, geänderte data-*)', () => {
  const B = BASIS.block;
  const mut = (von, nach, block = B) => { assert.ok(block.includes(von), `Fixture enthält nicht: ${von}`); return block.replace(von, nach); };
  const rx = (re, nach, block = B) => { assert.ok(re.test(block), `Fixture passt nicht auf ${re}`); return block.replace(re, nach); };
  const WEITERE = /weitere Beschreibungsbytes/;
  const AUSGANG = /Ausgangslage unzulässig/;
  const faelle = [
    ['fremder Titel', BASIS, mut('data-produkttitel="Jutebeutel', 'data-produkttitel="Fremder Jutebeutel'), WEITERE],
    ['Titel mit eingeschmuggeltem Attribut', BASIS, mut('data-produkttitel="Jutebeutel', 'data-produkttitel="x" onclick="evil()" data-y="Jutebeutel'), WEITERE],
    ['Karte: Pfad eines anderen Produkts', BASIS, mut('lspod-15422819991937.karte.json?v=', 'lspod-15422950474113.karte.json?v='), WEITERE],
    ['Karte: Pfad ausserhalb von maps/', BASIS, mut('/pod/v6/maps/lspod-15422819991937.karte.json', '/pod/v6/lspod-15422819991937.karte.json'), WEITERE],
    ['Karte: fremder Host', BASIS, mut('data-karte-url="https://abannews.com/', 'data-karte-url="https://evil.example/'), WEITERE],
    ['Karte: ohne ?v=', BASIS, rx(/(data-karte-url="[^"?]*)\?v=[0-9a-f]{16}"/, '$1"'), WEITERE],
    ['Karte: ?v= mit 15 statt 16 Zeichen', BASIS, rx(/(data-karte-url="[^"?]*\?v=)[0-9a-f]{16}"/, '$1aaaaaaaaaaaaaaa"'), WEITERE],
    ['Karte: zusätzlicher Query-Parameter', BASIS, rx(/(data-karte-url="[^"]*\?v=[0-9a-f]{16})"/, '$1&x=1"'), WEITERE],
    ['Vorschau: zusätzlicher Query-Parameter', BASIS, rx(/(data-vorschau-url="[^"]*\?v=[0-9a-f]{16})"/, '$1&x=1"'), WEITERE],
    ['Vorschau: ohne ?v=', BASIS, rx(/(data-vorschau-url="[^"?]*)\?v=[0-9a-f]{16}"/, '$1"'), WEITERE],
    ['Vorschau: ?v= mit 15 statt 16 Zeichen', BASIS, rx(/(data-vorschau-url="[^"?]*\?v=)[0-9a-f]{16}"/, '$1aaaaaaaaaaaaaaa"'), WEITERE],
    ['Vorschau: zusätzlicher Parameter VOR ?v=', BASIS, rx(/(data-vorschau-url="[^"?]*)\?v=/, '$1?x=1?v='), WEITERE],
    ['Karte: zusätzlicher Parameter VOR ?v=', BASIS, rx(/(data-karte-url="[^"?]*)\?v=/, '$1?x=1?v='), WEITERE],
    ['Vorschau: Pfad eines anderen Produkts', BASIS, mut('lspod-15422819991937.vorschau.json?v=', 'lspod-15422854463873.vorschau.json?v='), WEITERE],
    ['Vorschau: Attribut entfernt', BASIS, rx(/ data-vorschau-url="[^"]*"/, ''), WEITERE],
    ['Vorschau: bei einem Produkt ohne Vorschau hinzugefügt', OHNE_VORSCHAU, mut('></div>', ` data-vorschau-url="https://abannews.com/pod/v6/maps/lspod-15422950474113.vorschau.json?v=${'a'.repeat(16)}"></div>`, OHNE_VORSCHAU.block), WEITERE],
    ['zweiter Marker', BASIS, B + B, /genau einen bestehenden v6-Marker/],
    ['fremdes Skript im Block', BASIS, mut('<hr>', '<script src="https://evil.example/x.js"></script>\n<hr>'), WEITERE],
    ['fremdes Inline-Skript im Block', BASIS, mut('<hr>', '<script>alert(1)</script>\n<hr>'), WEITERE],
    ['data-variant geändert', BASIS, rx(/data-variant="\d+"/, 'data-variant="1"'), WEITERE],
    ['data-karte-pflicht entfernt', BASIS, mut(' data-karte-pflicht="1"', ''), WEITERE],
    ['data-karte-pflicht = 0', BASIS, mut('data-karte-pflicht="1"', 'data-karte-pflicht="0"'), WEITERE],
    ['zusätzliches data-Attribut', BASIS, mut('data-karte-pflicht="1"', 'data-karte-pflicht="1" data-x="1"'), WEITERE],
    ['Container-Klasse geändert', BASIS, mut('class="lspod-designer-v6"', 'class="lspod-designer-v6 evil"'), WEITERE],
    ['Marker: fremde Produkt-ID', BASIS, mut(`product=${BASIS.id} card=`, 'product=gid://shopify/Product/15422950474113 card='), WEITERE],
    ['Marker: card= kein SHA-256', BASIS, rx(/card=[0-9a-f]{64}/, `card=${'a'.repeat(63)}`), WEITERE],
    ['Marker: Zusatz hinter card=', BASIS, rx(/(card=[0-9a-f]{64}) -->/, '$1 mode=blocked -->'), WEITERE],
    ['Script: falsche SRI', BASIS, rx(/integrity="sha256-[^"]*"/, `integrity="${SRI('d'.repeat(64))}"`), AUSGANG],
    ['Script: ohne defer', BASIS, mut(' defer></script>', '></script>'), AUSGANG],
    ['Script: ohne crossorigin', BASIS, mut(' crossorigin="anonymous"', ''), AUSGANG],
    ['Script: falsches ?v=', BASIS, mut('6.3.0.js?v=e58e5c277e9ff45e', '6.3.0.js?v=0000000000000000'), AUSGANG],
    ['Script: unbekannte Version 6.2.0', BASIS, mut('6.3.0.js?v=e58e5c277e9ff45e', '6.2.0.js?v=3333333333333333'), AUSGANG],
    ['zwei Vorgänger-Scripts (6.3.0 und 6.3.1)', BASIS, mut('<hr>', `${SKRIPT631}\n<hr>`), AUSGANG],
    ['Vorgänger-Script doppelt', BASIS, mut('<hr>', `${SKRIPT630}\n<hr>`), AUSGANG],
    ['Ziel-Script UND Vorgänger-Script', BASIS, mut('<hr>', `${SKRIPT640}\n<hr>`), AUSGANG],
    ['v5-Baustein statt v6-Marker', BASIS, '<div class="lspod-designer" data-variant="1"></div>\n<script src="https://cdn/x/lspod-designer-v5.js?v=1" defer></script><hr>\n', /genau einen bestehenden v6-Marker/],
    ['Steuerzeichen als Platzhalter-Falle', BASIS, B + '\u0001', /Steuerzeichen/],
  ];
  for (const [name, f, block, regex] of faelle) {
    let fehler = null;
    try { plane(f, block); } catch (e) { fehler = e; }
    assert.ok(fehler, `${name}: wurde NICHT abgelehnt`);
    assert.match(fehler.message, regex, `${name}: falsche Ablehnung: ${fehler.message}`);
  }
  assert.equal(faelle.length, 37);
  // zusätzliches Vorgänger-Script AUSSERHALB des Blocks
  wirft(() => editorReleasePlanen(`${beschr(B)}${SKRIPT630}`, neuerBlock(BASIS), releaseReal.editor, { vorgaenger: VG }), AUSGANG);
  // Ziel schon da, aber Karten-?v= weicht ab: kein stilles Nachziehen (jede andere Lage wirft)
  const zielBlock = neuerBlock(BASIS);
  assert.equal(plane(BASIS, zielBlock).geaendert, false);
  wirft(() => plane(BASIS, rx(/(data-karte-url="[^"]*\?v=)[0-9a-f]{16}"/, '$1aaaaaaaaaaaaaaaa"', zielBlock)), AUSGANG);
  wirft(() => plane(BASIS, mut('data-produkttitel="Jutebeutel', 'data-produkttitel="Anderer Jutebeutel', zielBlock)), AUSGANG);
  // der neue Baustein trägt das falsche Release
  const rel631 = releaseAusAllowlist(allowlistReal, { editorSha256: allowlistReal.editorSha256, assetSha256: assetShaReal });
  wirft(() => editorReleasePlanen(beschr(B), neuerBlock(BASIS, rel631), releaseReal.editor, { vorgaenger: VG }), /nicht genau einmal das Ziel-Release/);
});
test('Planer: nur eine Teilmenge der Vorgänger ist zulässig (6.3.0 allein lässt einen 6.3.1-Block nicht durch)', () => {
  wirft(() => editorReleasePlanen(beschr(FX.tasse631.block), neuerBlock(FX.tasse631), releaseReal.editor, { vorgaenger: [VG[0]] }), /Ausgangslage unzulässig/);
  assert.equal(editorReleasePlanen(beschr(FX.tasse631.block), neuerBlock(FX.tasse631), releaseReal.editor, { vorgaenger: VG }).geaendert, true);
});
test('Normalisierung ersetzt genau Script, card=, Karten-?v= und Vorschau-?v. Pfade und alles andere bleiben stehen', () => {
  const n = editorBlockNormalisieren(BASIS.block, [SKRIPT630]);
  assert.doesNotMatch(n, /card=[0-9a-f]{64}/); assert.doesNotMatch(n, /\?v=[0-9a-f]{16}/); assert.doesNotMatch(n, /<script/);
  for (const bleibt of ['lspod-15422819991937.karte.json', 'lspod-15422819991937.vorschau.json', 'data-produkttitel="Jutebeutel', 'data-karte-pflicht="1"', `product=${BASIS.id}`, '<hr>', '<!-- lx-v63-editor:end -->']) assert.ok(n.includes(bleibt), `fehlt nach Normalisierung: ${bleibt}`);
  assert.equal(editorBlockNormalisieren(BASIS.block, [SKRIPT630]), editorBlockNormalisieren(BASIS.block.replace(/\?v=3c943b34ab49fb91/, '?v=ffffffffffffffff'), [SKRIPT630]));
  assert.notEqual(editorBlockNormalisieren(BASIS.block, [SKRIPT630]), editorBlockNormalisieren(BASIS.block.replace('Jutebeutel bedrucken', 'Anderes'), [SKRIPT630]));
});

// ---- Header, Workflow, Dokumentation -----------------------------------------------------------------
test('Cloudflare-Header: der 6.4.0-Dateiname fällt unter die unveränderliche Editor-Regel (CORS/CORP offen, ein Jahr immutable); Karten bleiben kurz gecacht', () => {
  const h = readFileSync(WURZEL + '_headers', 'utf8');
  const e = effektiveHeaders(h, `/${ER.file}`);
  assert.deepEqual(e.get('access-control-allow-origin'), ['*']);
  assert.deepEqual(e.get('cross-origin-resource-policy'), ['cross-origin']);
  assert.deepEqual(e.get('cache-control'), ['public, max-age=31536000, immutable']);
  for (const v of ER.vorgaenger) assert.deepEqual(effektiveHeaders(h, `/${v.file}`).get('cache-control'), ['public, max-age=31536000, immutable'], `${v.version}: Rückweg-Datei nicht unveränderlich ausgeliefert`);
  assert.deepEqual(effektiveHeaders(h, '/pod/v6/maps/lspod-15422819991937.karte.json').get('cache-control'), ['public, max-age=86400, must-revalidate']);
  assert.deepEqual(effektiveHeaders(h, '/pod/v6/maps/lspod-15422819991937.vorschau.json').get('cache-control'), ['public, max-age=86400, must-revalidate']);
});
const W64 = WURZEL + '.github/workflows/pod-v64-description-rollout.yml';
const W63 = WURZEL + '.github/workflows/pod-v63-description-rollout.yml';
if (!existsSync(W64)) console.log('ÜBERSPRUNGEN: Workflow-Test 6.4.0 (pod-v64-description-rollout.yml fehlt im Checkout; der CI-Job «selbst-gestalten» holt nur ausgewählte Pfade)');
else {
  test('Workflow 6.4.0: nur manuell, Default-Branch, exakter Commit, feste EDITOR_VERSION, acht V64-Bestätigungen, vier feste Scopes, eigene Artefakte', () => {
    const w = readFileSync(W64, 'utf8');
    assert.match(w, /^on:\n  workflow_dispatch:/m);
    assert.doesNotMatch(w, /^\s*(schedule|push|pull_request|pull_request_target|workflow_run|workflow_call):/m);
    assert.match(w, /test "\$REF_NAME" = "\$DEFAULT_BRANCH"/);
    assert.match(w, /ref: \$\{\{ github\.sha \}\}/); assert.doesNotMatch(w, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
    assert.match(w, /options: \[plan, apply, rollback\]/); assert.match(w, /options: \[canary-tasse, canary-jutebeutel, frei-magnet, full\]/);
    assert.match(w, /EDITOR_VERSION: '6\.4\.0'/); assert.doesNotMatch(w, /EDITOR_VERSION: \$\{\{/);
    assert.doesNotMatch(w, /V63_/, 'V63-Bestätigung im 6.4.0-Workflow');
    const faelle = [
      ['apply:canary-tasse', 'V64_CANARY_TASSE', false], ['apply:canary-jutebeutel', 'V64_CANARY_JUTEBEUTEL', false], ['apply:frei-magnet', 'V64_FREI_MAGNET', false], ['apply:full', 'V64_FULL_17_EDITOR', false],
      ['rollback:canary-tasse', 'V64_ROLLBACK_TASSE', true], ['rollback:canary-jutebeutel', 'V64_ROLLBACK_JUTEBEUTEL', true], ['rollback:frei-magnet', 'V64_ROLLBACK_MAGNET', true], ['rollback:full', 'V64_ROLLBACK_17_EDITOR', true],
    ];
    assert.deepEqual(faelle.map(([kombi, ack]) => [kombi.split(':')[1], ack]).sort(), [...Object.entries(SOLL64.apply), ...Object.entries(SOLL64.rollback)].sort(), 'Workflow und Bibliothek nennen nicht dieselben Bestätigungen');
    assert.doesNotMatch(w, /16_EDITOR/, 'alte 16er-Bestätigung im Workflow');
    for (const [kombi, ack, mitRun] of faelle) {
      const zeile = w.split('\n').find((l) => l.trim().startsWith(`${kombi})`));
      assert.ok(zeile, `${kombi}: case-Zeile fehlt`);
      assert.ok(zeile.includes(`test "$CONFIRMATION" = ${ack};`), `${kombi}: falsche Bestätigung: ${zeile}`);
      assert.equal(zeile.includes('SOURCE_RUN_ID" =~'), mitRun, `${kombi}: Run-ID-Regel`);
    }
    assert.match(w, /plan:canary-tasse\|plan:canary-jutebeutel\|plan:frei-magnet\|plan:full\) test -z "\$CONFIRMATION"; test -z "\$SOURCE_RUN_ID"/);
    assert.match(w, /\*\) echo "Unzulässige Eingabekombination" >&2; exit 2 ;;/);
    assert.match(w, /SHOPIFY_CLIENT_ID: \$\{\{ secrets\.SHOPIFY_CLIENT_ID \}\}/); assert.match(w, /SHOPIFY_CLIENT_SECRET: \$\{\{ secrets\.SHOPIFY_CLIENT_SECRET \}\}/);
    assert.match(w, /actions\/upload-artifact@v4/); assert.match(w, /actions\/download-artifact@v4/);
    assert.match(w, /name: pod-v64-rollout-\$\{\{ github\.run_id \}\}/); assert.match(w, /name: pod-v64-rollout-\$\{\{ inputs\.source_run_id \}\}/);
    assert.doesNotMatch(w, /pod-v63-rollout/); assert.match(w, /retention-days: 30/);
    assert.doesNotMatch(w, /run:\s*[^\n]*\$\{\{\s*inputs\./);
    // auch in mehrzeiligen run-Blöcken (run: |) darf keine Eingabe direkt eingesetzt werden: Eingaben nur als env-Wert, in if:, name: und with:-run-id
    const erlaubt = [/^\s+[A-Z_]+: \$\{\{ inputs\.\w+ \}\}$/, /^\s+if: \$\{\{ inputs\.operation (==|!=) 'rollback' \}\}$/, /^\s+name: pod-v64-rollout-\$\{\{ inputs\.source_run_id \}\}$/, /^\s+run-id: \$\{\{ inputs\.source_run_id \}\}$/];
    const eingabezeilen = w.split('\n').filter((l) => /\$\{\{\s*inputs\./.test(l));
    assert.ok(eingabezeilen.length >= 10, 'zu wenige Eingabestellen gefunden');
    for (const l of eingabezeilen) assert.ok(erlaubt.some((re) => re.test(l)), `Eingabe an unzulässiger Stelle eingesetzt: ${l.trim()}`);
    assert.match(w, /OUT_DIR: \$\{\{ runner\.temp \}\}\/pod-v64-run/);
    assert.match(w, /direct_rollout_test\.mjs/); assert.match(w, /editor_release_bauen\.mjs --pruefen/);
    assert.match(w, /timeout-minutes: 30/); assert.match(w, /permissions:\n  contents: read\n  actions: read/);
  });
  test('Workflow 6.4.0: die Eingabeprüfung läuft in bash und lässt genau die zwölf gültigen Kombinationen durch (Plan leer, Apply/Rollback nur mit der eigenen Bestätigung, Rollback mit Run-ID)', () => {
    if (spawnSync('bash', ['-c', 'true']).status !== 0) { console.log('ÜBERSPRUNGEN: bash fehlt, Eingabeprüfung des Workflows nicht ausgeführt'); return; }
    const zeilen = readFileSync(W64, 'utf8').split('\n');
    const stepIdx = zeilen.findIndex((l) => l.includes('name: Eingaben und Default-Branch prüfen'));
    const runIdx = zeilen.findIndex((l, i) => i > stepIdx && l.trim() === 'run: |');
    assert.ok(stepIdx >= 0 && runIdx > stepIdx, 'Schritt «Eingaben und Default-Branch prüfen» nicht gefunden');
    const block = [];
    for (let i = runIdx + 1; i < zeilen.length && (zeilen[i].startsWith('          ') || zeilen[i].trim() === ''); i++) block.push(zeilen[i].slice(10));
    const skript = block.join('\n');
    assert.match(skript, /case "\$OPERATION:\$SCOPE" in/);
    const lauf1 = (env) => spawnSync('bash', ['-c', skript], { env: { PATH: process.env.PATH || '/usr/bin:/bin', REF_NAME: 'main', DEFAULT_BRANCH: 'main', ...env }, encoding: 'utf8' });
    const acks = [...Object.values(SOLL64.apply), ...Object.values(SOLL64.rollback), 'V63_CANARY_TASSE', 'V63_FULL_19_SAFE', 'V63_ROLLBACK_TASSE', 'V63_ROLLBACK_19_SAFE', 'V64_FULL_16_EDITOR', 'V64_ROLLBACK_16_EDITOR', ''];
    let gueltig = 0; let geprueft = 0;
    for (const op of ['plan', 'apply', 'rollback']) for (const scope of ['canary-tasse', 'canary-jutebeutel', 'frei-magnet', 'full', 'canary']) for (const ack of acks) for (const run of ['', '123']) {
      const r = lauf1({ OPERATION: op, SCOPE: scope, CONFIRMATION: ack, SOURCE_RUN_ID: run });
      const soll = op === 'plan' ? scope !== 'canary' && ack === '' && run === ''
        : (scope !== 'canary' && ack === SOLL64[op][scope] && (op === 'apply' ? run === '' : run === '123'));
      assert.equal(r.status === 0, soll, `${op}/${scope}/${JSON.stringify(ack)}/${JSON.stringify(run)}: Exit ${r.status}, erwartet ${soll ? 0 : 'ungleich 0'}`);
      geprueft++; if (soll) gueltig++;
    }
    assert.equal(gueltig, 12); assert.equal(geprueft, 3 * 5 * acks.length * 2);
    assert.equal(lauf1({ OPERATION: 'rollback', SCOPE: 'full', CONFIRMATION: 'V64_ROLLBACK_17_EDITOR', SOURCE_RUN_ID: '12a' }).status === 0, false, 'nicht numerische Run-ID wurde akzeptiert');
    assert.equal(lauf1({ OPERATION: 'rollback', SCOPE: 'frei-magnet', CONFIRMATION: 'V64_ROLLBACK_MAGNET', SOURCE_RUN_ID: '' }).status === 0, false, 'Magnet-Rollback ohne Run-ID wurde akzeptiert');
    assert.equal(lauf1({ OPERATION: 'plan', SCOPE: 'full', CONFIRMATION: '', SOURCE_RUN_ID: '', REF_NAME: 'feature' }).status, 2, 'Nicht-Default-Branch wurde nicht abgewiesen');
    assert.equal(lauf1({ OPERATION: 'loeschen', SCOPE: 'full', CONFIRMATION: '', SOURCE_RUN_ID: '' }).status, 2);
  });
  test('Workflow 6.4.0: Plan und Apply prüfen vorab Tests und editor-release.json, der ROLLBACK nicht (er braucht nur das Artefakt und muss auch bei geänderter 6.4.0.js laufen)', () => {
    const w = readFileSync(W64, 'utf8');
    const schritte = w.split(/\n(?=      (?:# [^\n]*\n      )*- (?:name|uses): )/).filter((s) => /^      (?:# [^\n]*\n      )*- (?:name|uses): /.test(s));
    const finde = (rx) => { const s = schritte.filter((x) => rx.test(x)); assert.equal(s.length, 1, `Schritt ${rx} nicht genau einmal gefunden (${s.length})`); return s[0]; };
    const bedingung = (s) => (s.match(/^        if: (.+)$/m) || [])[1];
    const NICHT_ROLLBACK = "${{ inputs.operation != 'rollback' }}";
    assert.equal(bedingung(finde(/- name: Lokaltests vor Plan und Apply/)), NICHT_ROLLBACK);
    assert.ok(/direct_rollout_test\.mjs/.test(finde(/- name: Lokaltests vor Plan und Apply/)));
    assert.equal(bedingung(finde(/- name: editor-release\.json gegen die echten Dateien prüfen/)), NICHT_ROLLBACK);
    assert.ok(/editor_release_bauen\.mjs --pruefen/.test(finde(/- name: editor-release\.json gegen die echten Dateien prüfen/)));
    assert.equal(bedingung(finde(/- name: Ursprüngliches Apply-Artefakt für Rollback laden/)), "${{ inputs.operation == 'rollback' }}");
    // alles andere läuft in jedem Modus: Eingabeprüfung, Checkout, Node, der Lauf selbst; der Upload auch nach Fehlern und Abbruch
    for (const rx of [/- name: Eingaben und Default-Branch prüfen/, /- uses: actions\/checkout@v4/, /- uses: actions\/setup-node@v4/, /- name: Planen oder kontrolliert schreiben/]) assert.equal(bedingung(finde(rx)), undefined, `${rx}: darf keine Bedingung tragen`);
    assert.equal(bedingung(finde(/- name: Plan, Sicherungen und Ledger hochladen/)), '${{ always() }}');
    assert.equal(schritte.filter((s) => /^        if: /m.test(s)).length, 4, 'unerwartete Bedingung an einem weiteren Schritt');
  });
  test('Workflow 6.4.0 und 6.3.1 teilen sich eine Concurrency-Gruppe (nie gleichzeitig auf denselben Beschreibungen); der v63-Workflow trägt nichts von 6.4.0', () => {
    const w64 = readFileSync(W64, 'utf8'); const w63 = readFileSync(W63, 'utf8');
    const gruppe = (w) => w.match(/concurrency:\n  group: (\S+)\n  cancel-in-progress: false/)?.[1];
    assert.ok(gruppe(w63)); assert.equal(gruppe(w64), gruppe(w63));
    assert.doesNotMatch(w63, /V64_|EDITOR_VERSION|canary-jutebeutel/, 'der alte Workflow wurde angefasst');
  });
}
test('README dokumentiert den 6.4.0-Ablauf, alle acht Bestätigungen, die Gates, den Rückweg und die Freischaltung des Magneten', () => {
  const r = readFileSync(HIER + 'README.md', 'utf8');
  for (const ack of Object.values(SOLL64.apply).concat(Object.values(SOLL64.rollback))) assert.ok(r.includes(ack), `README nennt ${ack} nicht`);
  for (const wort of ['editor-release.json', 'editor_release_bauen.mjs', 'canary-tasse', 'canary-jutebeutel', 'Rollback', 'pod-v64-description-rollout.yml', 'Handrückweg', 'skipped-not-written', 'nichts zurückzunehmen', 'failed-changed', 'writing', 'direct_rollout_attrappe_test.mjs',
    'Magnet freigeschaltet (11.11.2026)', 'frei-magnet', 'NUR=magnet-zum-selbstgestalten', 'sperr_verfuegbar.mjs', 'lieferbarkeit-ch-1111.json', 'lspod-15427217195393.karte.json']) assert.ok(r.includes(wort), `README nennt ${wort} nicht`);
  // erlaubt ist die alte 16er-Bestätigung nur mit dem Vermerk «(bis 10.11.2026)» direkt dahinter (auch nach dem schliessenden Backtick)
  assert.doesNotMatch(r, /V64_(FULL|ROLLBACK)_16_EDITOR(?!`? \(bis 10\.11\.2026\))/, 'README nennt die alte 16er-Bestätigung noch als gültig');
  assert.equal((r.match(/V64_(FULL|ROLLBACK)_16_EDITOR/g) || []).length, 2, 'README: die alte 16er-Bestätigung genau zweimal, nur im Vermerk «gelten nicht mehr»');
});

// ---- Freischaltung des Magneten (11.11.2026) ------------------------------------------------------------
// Der Magnet trug bis zur Freischaltung den Sperrbaustein. Genau ein Übergang ist zulässig: unveränderte Sperre -> Editor-Baustein.
const FXM = JSON.parse(readFileSync(HIER + 'fixtures/live-sperrblock-magnet-1111.json', 'utf8'));
const MAGNET = FREIGESCHALTET[0];
const magnetLive = (kaufbar = true) => ({ id: MAGNET.id, handle: MAGNET.handle, title: 'Magnet zum Selbstgestalten', status: 'ACTIVE', onlineStoreUrl: `https://luxestyle.ch/products/${MAGNET.handle}`, variants: { pageInfo: { hasNextPage: false }, nodes: FXM.produkt.variantIds.map((id) => ({ id: `gid://shopify/ProductVariant/${id}`, availableForSale: kaufbar })) } });
const magnetRp = releaseReal.products.find((p) => p.id === MAGNET.id);
const magnetNeu = (rel = releaseReal, product = magnetLive()) => baustein({ product, releaseProduct: rel.products.find((p) => p.id === MAGNET.id), editor: rel.editor });
const magnetBeschr = (block = FXM.block) => `<p>Vorspann &amp; Umlaute äöü</p>\n${block}<p>Rest</p>`;
const freiPlan = (alt = magnetBeschr(), neuB = magnetNeu(), opt = { product: magnetLive(), frei: MAGNET }, ed = releaseReal.editor) => freischaltungPlanen(alt, neuB, ed, opt);

test('Magnet-Fixture: nur der Marker-Block der Live-Beschreibung vom 11.11.2026 (Sperre), Varianten wie im Release, Prüfsumme stimmt', () => {
  assert.equal(FXM.schema, 1); assert.equal(FXM.produkt.id, MAGNET.id); assert.equal(FXM.produkt.handle, MAGNET.handle);
  assert.equal(sha256(FXM.block), FXM.blockSha256);
  assert.ok(FXM.block.startsWith(`<!-- lx-v63-editor:start product=${MAGNET.id} mode=blocked -->\n`)); assert.ok(FXM.block.endsWith('<!-- lx-v63-editor:end -->\n'));
  assert.equal(zaehle(FXM.block, 'lx-v63-editor:start'), 1); assert.equal(zaehle(FXM.block, 'lx-v63-editor:end'), 1);
  assert.equal(FXM.beschreibung.marker, 1);
  assert.doesNotMatch(FXM.block, /lspod-designer-v6|ls-liefer|ls-pod-retoure|info@/, 'Block enthält mehr als die Sperre');
  assert.deepEqual([...FXM.produkt.variantIds].sort(), [...magnetRp.variantIds].sort(), 'Varianten der Live-Lesung und des Release weichen ab');
  assert.equal(FXM.produkt.variantIds.length, 3);
  for (const id of FXM.produkt.variantIds) assert.ok(FXM.block.includes(`"${id}"`), `Variante ${id} fehlt im Sperrskript`);
});
test('Magnet: der Sperrbaustein aus dem Generator ist bytegleich der Live-Sperre (Voraussetzung der Freischaltung)', () => {
  assert.equal(blockerBaustein({ product: magnetLive(false), blocker: MAGNET }), FXM.block);
  assert.equal(blockerBaustein({ product: magnetLive(true), blocker: MAGNET }), FXM.block, 'die Kaufbarkeit darf den Sperrbaustein nicht ändern');
  assert.ok(FXM.block.includes(`<p style="margin:0">${MAGNET.reason} Wir schalten die Gestaltung erst nach der technischen Prüfung frei.</p>`));
});
test('sperreLiegtVor: erkennt nur den Marker, den der Sperrbaustein schreibt', () => {
  assert.equal(sperreLiegtVor(FXM.block), true); assert.equal(sperreLiegtVor(magnetBeschr()), true);
  assert.equal(sperreLiegtVor(blockerBaustein({ product: blockedLive(), blocker: BLOCKLIST[0] })), true);
  assert.equal(sperreLiegtVor(magnetBeschr(magnetNeu())), false, 'Editor-Baustein als Sperre erkannt');
  assert.equal(sperreLiegtVor(BASIS.block), false);
  for (const x of ['', null, undefined, '<p>mode=blocked</p>', '<div class="lspod-v63-blocked" data-lspod-blocked="1"></div>', '<!-- lx-v63-editor:start product=gid://shopify/Product/abc mode=blocked -->', `<!-- lx-v63-editor:start product=${MAGNET.id} card=${H} -->`]) assert.equal(sperreLiegtVor(x), false, String(x));
});
test('Freischaltung: aus der unveränderten Sperre wird genau der Editor-Baustein mit dem Ziel-Release; alles ausserhalb bleibt bytegleich', () => {
  const g = freiPlan();
  assert.equal(g.freischaltung, true); assert.equal(g.geaendert, true);
  assert.equal(g.vorher, magnetBeschr()); assert.equal(g.vorherSha256, sha256(magnetBeschr()));
  assert.equal(g.nachher, magnetBeschr(magnetNeu())); assert.equal(g.nachherSha256, sha256(magnetBeschr(magnetNeu())));
  assert.ok(g.nachher.startsWith(`<p>Vorspann &amp; Umlaute äöü</p>\n<!-- lx-v63-editor:start product=${MAGNET.id} card=${magnetRp.cardSha256} -->\n`) && g.nachher.endsWith('<!-- lx-v63-editor:end -->\n<p>Rest</p>'));
  assert.equal(zaehle(g.nachher, SKRIPT640), 1); assert.equal(zaehle(g.nachher, 'lx-v63-editor:start'), 1); assert.equal(zaehle(g.nachher, '<div class="lspod-designer-v6"'), 1);
  assert.doesNotMatch(g.nachher, /lspod-v63-blocked|data-lspod-blocked|mode=blocked|nicht bestellbar|MutationObserver/);
  assert.ok(g.nachher.includes(`data-karte-url="https://abannews.com/pod/v6/maps/lspod-15427217195393.karte.json?v=${magnetRp.cardSha256.slice(0, 16)}"`));
  assert.ok(g.nachher.includes('data-karte-pflicht="1"')); assert.ok(g.nachher.includes(`data-variant="${FXM.produkt.variantIds[0]}"`));
  assert.doesNotMatch(g.nachher, /data-vorschau-url|vorschau\.json/, 'der Magnet hat keine belegte Produktvorschau');
  // der zweite Plan auf dem Ergebnis ist ein gewöhnlicher Editor-Release-Plan ohne Änderung
  const g2 = editorReleasePlanen(g.nachher, magnetNeu(), releaseReal.editor, { vorgaenger: VG });
  assert.equal(g2.geaendert, false); assert.equal(g2.nachher, g.nachher);
});
test('Freischaltung: mit der echten Umgebung der Live-Beschreibung bleiben Vor- und Nachspann zeichengenau (Längenrechnung aus der Fixture)', () => {
  const vor = 'v'.repeat(FXM.beschreibung.blockAb); const nach = 'n'.repeat(FXM.beschreibung.zeichenNachBlock);
  assert.equal((vor + FXM.block + nach).length, FXM.beschreibung.zeichen);
  const g = freiPlan(vor + FXM.block + nach);
  assert.equal(g.nachher, vor + magnetNeu() + nach); assert.equal(g.nachher.length, FXM.beschreibung.zeichen - FXM.block.length + magnetNeu().length);
});
test('Freischaltung lehnt jede andere Ausgangslage ab: veränderte Sperre, andere Varianten, kein/zweiter Marker, schon freigeschaltet, Reste', () => {
  wirft(() => freiPlan(magnetBeschr(FXM.block.replace('derzeit nicht bestätigt', 'derzeit nicht bestaetigt'))), /Sperrbaustein weicht vom Generator ab; Freischaltung nur aus der unveränderten Sperre/);
  wirft(() => freiPlan(magnetBeschr(FXM.block.replace('opacity:.45', 'opacity:.5'))), /Sperrbaustein weicht vom Generator ab/);
  wirft(() => freiPlan(magnetBeschr(FXM.block.replace(/\n$/, ''))), /Sperrbaustein weicht vom Generator ab/);
  const andereVarianten = { ...magnetLive(), variants: { pageInfo: { hasNextPage: false }, nodes: [{ id: 'gid://shopify/ProductVariant/1', availableForSale: true }] } };
  wirft(() => freiPlan(magnetBeschr(), magnetNeu(releaseReal, andereVarianten), { product: andereVarianten, frei: MAGNET }), /Sperrbaustein weicht vom Generator ab/);
  wirft(() => freiPlan('<p>ohne Baustein</p>'), /Freischaltung braucht genau einen bestehenden Marker, gefunden 0/);
  wirft(() => freiPlan(magnetBeschr() + FXM.block), /genau einen bestehenden Marker, gefunden 2/);
  wirft(() => freiPlan(magnetBeschr() + BASIS.block), /genau einen bestehenden Marker, gefunden 2/);
  wirft(() => freiPlan(magnetBeschr(magnetNeu())), /Sperrbaustein weicht vom Generator ab/);   // schon freigeschaltet: dafür ist editorReleasePlanen zuständig
  wirft(() => freiPlan(magnetBeschr() + '<div data-lspod-blocked="15427217195393"></div>'), /Reste der Sperre blieben/);
  wirft(() => freiPlan(magnetBeschr() + '<p class="lspod-v63-blocked">x</p>'), /Reste der Sperre blieben/);
});
test('Freischaltung lehnt einen falschen neuen Baustein ab: anderes Produkt, anderes Editor-Release, Sperre statt Editor', () => {
  wirft(() => freiPlan(magnetBeschr(), neuerBlock(BASIS)), /der neue Baustein gehört nicht zu diesem Produkt/);
  const rel631 = { ...releaseReal, editor: { url: editorUrl('6.3.1'), sha256: VG[1].sha256 } };
  wirft(() => freiPlan(magnetBeschr(), magnetNeu(rel631)), /nicht genau einmal das Ziel-Release/);
  wirft(() => freiPlan(magnetBeschr(), magnetNeu() + SKRIPT640), /nicht genau einmal das Ziel-Release/);
  wirft(() => freiPlan(magnetBeschr(), FXM.block), /nicht eindeutig/);
  wirft(() => freiPlan(magnetBeschr(), ''), /nicht eindeutig/);
  // String.replace deutet «$`» im Ersatz als «Text vor dem Treffer»: ein solcher Produkttitel verdoppelt den Vorspann. Der Byte-Vergleich
  // ausserhalb des Sperrbausteins muss das abfangen (nachgestellt 11.11.2026; ohne ihn würde der Vorspann still verdoppelt geschrieben).
  const dollar = { ...magnetLive(), title: 'Magnet $` Test' };
  wirft(() => freiPlan(magnetBeschr(), magnetNeu(releaseReal, dollar), { product: dollar, frei: MAGNET }), /Freischaltung würde Bytes ausserhalb des Sperrbausteins ändern/);
});
test('Freischaltung ist nur für ein FREIGESCHALTET-Produkt vorgesehen und nur mit passendem Produkt', () => {
  wirft(() => freiPlan(magnetBeschr(), magnetNeu(), { product: magnetLive() }), /Freischaltung ist für dieses Produkt nicht vorgesehen/);
  // ohne Optionen direkt aufrufen: freiPlan(…, undefined) nähme den Vorgabewert seines Parameters (Gutfall)
  wirft(() => freischaltungPlanen(magnetBeschr(), magnetNeu(), releaseReal.editor), /nicht vorgesehen/);
  wirft(() => freischaltungPlanen(magnetBeschr(), magnetNeu(), releaseReal.editor, undefined), /nicht vorgesehen/);
  wirft(() => freischaltungPlanen(magnetBeschr(), magnetNeu(), releaseReal.editor, {}), /nicht vorgesehen/);
  wirft(() => freiPlan(magnetBeschr(), magnetNeu(), { product: magnetLive(), frei: null }), /nicht vorgesehen/);
  wirft(() => freiPlan(magnetBeschr(), magnetNeu(), { frei: MAGNET }), /nicht vorgesehen/);
  wirft(() => freiPlan(magnetBeschr(), magnetNeu(), { product: live(), frei: MAGNET }), /nicht vorgesehen/);
  wirft(() => freiPlan(magnetBeschr(), magnetNeu(), { product: { ...magnetLive(), handle: 'magnet-anders' }, frei: MAGNET }), /nicht vorgesehen/);
  wirft(() => freiPlan(magnetBeschr(), magnetNeu(), { product: magnetLive(), frei: { ...MAGNET, handle: 'magnet-anders' } }), /nicht vorgesehen/);
  wirft(() => freiPlan(magnetBeschr(), magnetNeu(), { product: live(), frei: { id: ALLOWLIST[0].id, handle: ALLOWLIST[0].handle, reason: 'x' } }), /nicht vorgesehen/);
  // die Dad-Cap (weiter gesperrt) lässt sich so nicht freischalten
  const cap = BLOCKLIST[1]; const capLive = blockedLive(cap);
  wirft(() => freischaltungPlanen(blockerBaustein({ product: capLive, blocker: cap }), magnetNeu(), releaseReal.editor, { product: capLive, frei: cap }), /dad-cap-selbst-gestalten: Freischaltung ist für dieses Produkt nicht vorgesehen/);
});
test('Produktgate und Freischaltung: der Magnet braucht in jedem Schreiblauf eine kaufbare Variante; nur der Planer darf darauf verzichten', () => {
  assert.equal(produktPruefen(magnetLive(true), magnetRp), true);
  wirft(() => produktPruefen(magnetLive(false), magnetRp), /magnet-zum-selbstgestalten: keine kaufbare Variante \(Bestandssperre noch aktiv\? .*dropship\/sperre-verfuegbar-1111\/sperr_verfuegbar\.mjs mit ZURUECK=1 LIVE=1 NUR=magnet-zum-selbstgestalten\)$/);
  wirft(() => produktPruefen(magnetLive(false), magnetRp, {}), /keine kaufbare Variante/);
  wirft(() => produktPruefen(magnetLive(false), magnetRp, { kaufbarPflicht: true }), /keine kaufbare Variante/);
  for (const falsch of [0, null, '', undefined, 'false']) wirft(() => produktPruefen(magnetLive(false), magnetRp, { kaufbarPflicht: falsch }), /keine kaufbare Variante/, `kaufbarPflicht=${String(falsch)}`);
  assert.equal(produktPruefen(magnetLive(false), magnetRp, { kaufbarPflicht: false }), true);
  // der Verzicht gilt nur für die Kaufbarkeit, nie für Status, Storefront oder Variantenscope
  wirft(() => produktPruefen({ ...magnetLive(false), status: 'DRAFT' }, magnetRp, { kaufbarPflicht: false }), /Status DRAFT/);
  wirft(() => produktPruefen({ ...magnetLive(false), onlineStoreUrl: null }, magnetRp, { kaufbarPflicht: false }), /keine bestätigte Storefront-URL/);
  wirft(() => produktPruefen({ ...magnetLive(false), variants: { pageInfo: { hasNextPage: false }, nodes: magnetLive(false).variants.nodes.slice(1) } }, magnetRp, { kaufbarPflicht: false }), /Varianten-Scope weicht ab \(Shop 2, Release 3\)/);
  wirft(() => produktPruefen({ ...magnetLive(false), variants: { pageInfo: { hasNextPage: true }, nodes: magnetLive(false).variants.nodes } }, magnetRp, { kaufbarPflicht: false }), /unvollständig/);
  // ein gewöhnliches Editorprodukt bekommt den Hinweis auf die Bestandssperre nicht
  wirft(() => produktPruefen({ ...live(), variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', availableForSale: false }] } }, products[0]), /keine kaufbare Variante$/);
});
test('Magnet im echten Release: Karte lspod-15427217195393.karte.json ohne Produktvorschau, Allowlist «ready-binding» mit Beleg der Schweizer Lieferbarkeit', () => {
  assert.equal(magnetRp.handle, MAGNET.handle);
  assert.equal(magnetRp.cardUrl, 'https://abannews.com/pod/v6/maps/lspod-15427217195393.karte.json');
  assert.equal(magnetRp.cardSha256, sha256(readFileSync(WURZEL + 'pod/v6/maps/lspod-15427217195393.karte.json')));
  assert.equal(magnetRp.previewUrl, null); assert.equal(magnetRp.previewSha256, null);
  assert.ok(!existsSync(WURZEL + 'pod/v6/maps/lspod-15427217195393.vorschau.json'), 'für den Magneten liegt eine Vorschau-Datei, die das Release nicht kennt');
  const a = allowlistReal.products.find((p) => p.handle === MAGNET.handle);
  assert.equal(a.rolloutStatus, 'ready-binding'); assert.deepEqual(a.reasonCodes, []); assert.equal(a.shopifyProductId, MAGNET.id);
  assert.ok(!(allowlistReal.blocked || []).some((b) => b.handle === MAGNET.handle || b.shopifyProductId === MAGNET.id));
  assert.equal(allowlistReal.source.availabilityCh.products.length, 1);
  assert.deepEqual(allowlistReal.source.availabilityCh.products[0], { handle: MAGNET.handle, model: 656, printfulVariantIds: [16366, 16367, 16465] });
  assert.equal(allowlistReal.source.availabilityCh.sha256, sha256(readFileSync(WURZEL + 'dropship/selbst-gestalten-fertig-0511/rollout-v63/' + allowlistReal.source.availabilityCh.path)), 'Beleg der Lieferbarkeit passt nicht mehr zur Allowlist');
  // die Karte selbst: je Variante eine eigene Druckdatei mit 300 dpi, jede Shopify-Variante zugeordnet
  const karte = JSON.parse(readFileSync(WURZEL + 'pod/v6/maps/lspod-15427217195393.karte.json', 'utf8'));
  assert.equal(karte.klasse, 'FLACH');
  const pf = Object.fromEntries(Object.entries(karte.shop.varianten).map(([sv, pv]) => [sv, pv]));
  assert.deepEqual(pf, { 55791941812609: 16366, 55791941845377: 16367, 55791941878145: 16465 });
  assert.deepEqual(Object.keys(karte.shop.varianten).sort(), [...magnetRp.variantIds].sort());
  const text = JSON.stringify(karte);
  for (const px of [900, 1200, 1800]) assert.ok(text.includes(String(px)), `Druckdatei ${px} px fehlt`);
});
// Nachbesserung 11.11.2026 (Prüferfund «Vertrauenszeile»): Vertrauenszeile, Aufklappbereich und Grössenhilfe im MAIN-Theme
// (templates/product.json, gelesen 11.11.2026 12:1x UTC) zeigen «Ersatz bei Druckfehlern» statt «30 Tage Rückgabe» genau dann, wenn
// `product.description contains 'lspod-designer'`. Die Freischaltung muss diese Zeichenkette in die Beschreibung bringen.
test('Theme-Kopplung: nach der Freischaltung enthält die Beschreibung «lspod-designer» (Rückgabe-Hinweise schalten um), die Sperre enthält es nicht', () => {
  const THEME_BEDINGUNG = 'lspod-designer';
  assert.ok(!FXM.block.includes(THEME_BEDINGUNG), 'der Sperrbaustein enthält schon «lspod-designer»: die gesperrte Seite zeigte dann die Editor-Hinweise');
  assert.ok(!magnetBeschr().includes(THEME_BEDINGUNG));
  assert.ok(magnetNeu().includes(THEME_BEDINGUNG), 'der Editor-Baustein enthält «lspod-designer» nicht: die Vertrauenszeile bliebe bei «30 Tage Rückgabe»');
  const g = freiPlan();
  assert.ok(g.nachher.includes(THEME_BEDINGUNG));
  assert.ok(!g.vorher.includes(THEME_BEDINGUNG));
  // gilt für jeden Baustein des Werkzeugs, nicht nur für den Magneten
  for (const rp of releaseReal.products) {
    const p = { id: rp.id, handle: rp.handle, title: 'Titel', variants: { nodes: rp.variantIds.map((id) => ({ id: `gid://shopify/ProductVariant/${id}`, availableForSale: true })) } };
    assert.ok(baustein({ product: p, releaseProduct: rp, editor: releaseReal.editor }).includes(THEME_BEDINGUNG), `${rp.handle}: Editor-Baustein ohne «lspod-designer»`);
  }
});

// Nachbesserung 11.11.2026 (Prüferfund «Befehle ungebunden»): die Befehle für Rücknahme und Wiedersperren der Bestandssperre und die
// Bestätigungen der Stufe frei-magnet stehen in drei Dokumenten. Ein Befehl ohne NUR= würde auch den Bügeltransfer kaufbar machen,
// ein ZURUECK=1 beim Wiedersperren würde entsperren, eine falsche Bestätigung liefe ins Leere oder in die falsche Stufe.
function magnetBefehlePruefen(text, quelle, { stufenZeilen = false } = {}) {
  const zurueck = text.match(/ZURUECK=1 LIVE=1[^`\n]*?sperr_verfuegbar\.mjs/g) || [];
  assert.ok(zurueck.length >= 1, `${quelle}: Befehl für die Rücknahme der Bestandssperre fehlt`);
  for (const b of zurueck) assert.ok(b.includes('NUR=magnet-zum-selbstgestalten'), `${quelle}: Rücknahme ohne NUR=: ${b}`);
  assert.match(text, /ZURUECK=1 LIVE=1 NUR=magnet-zum-selbstgestalten node dropship\/sperre-verfuegbar-1111\/sperr_verfuegbar\.mjs/, `${quelle}: Rücknahme nicht wörtlich`);
  // Wiedersperren: der Befehl steht mit einem Backtick direkt vor LIVE=1, also ohne ZURUECK=1 davor
  assert.match(text, /`LIVE=1 NUR=magnet-zum-selbstgestalten node dropship\/sperre-verfuegbar-1111\/sperr_verfuegbar\.mjs`/, `${quelle}: Befehl zum Wiedersperren fehlt`);
  if (!stufenZeilen) return;
  const acks = (l) => l.match(/V64_[A-Z0-9_]+/g) || [];
  const rb = text.split('\n').filter((l) => l.includes('operation=rollback') && l.includes('scope=frei-magnet'));
  const ap = text.split('\n').filter((l) => l.includes('operation=apply') && l.includes('scope=frei-magnet'));
  assert.ok(rb.length >= 1 && ap.length >= 1, `${quelle}: Zeile für Apply oder Rollback der Stufe frei-magnet fehlt`);
  for (const l of rb) assert.deepEqual([...new Set(acks(l))], ['V64_ROLLBACK_MAGNET'], `${quelle}: Rollback frei-magnet mit falscher Bestätigung: ${l.slice(0, 160)}`);
  for (const l of ap) assert.deepEqual([...new Set(acks(l))], ['V64_FREI_MAGNET'], `${quelle}: Apply frei-magnet mit falscher Bestätigung: ${l.slice(0, 160)}`);
  const wieder = text.split('\n').filter((l) => l.includes('Bestandssperre wieder setzen'));
  assert.ok(wieder.length >= 1, `${quelle}: Rücknahme-Schritt «Bestandssperre wieder setzen» fehlt`);
  for (const l of wieder) { assert.ok(l.includes('`LIVE=1 NUR=magnet-zum-selbstgestalten node'), `${quelle}: ${l.slice(0, 160)}`); assert.ok(!l.includes('ZURUECK=1'), `${quelle}: Wiedersperren mit ZURUECK=1: ${l.slice(0, 160)}`); }
}
test('Befehle in den Dokumenten: Rücknahme nur mit NUR=, Wiedersperren ohne ZURUECK=1, je Zeile die Bestätigung der Stufe frei-magnet; Plan vor der Rücknahme', () => {
  const r = readFileSync(HIER + 'README.md', 'utf8');
  magnetBefehlePruefen(r, 'Rollout-README', { stufenZeilen: true });
  // Reihenfolge: Plan (läuft trotz Sperre), dann Rücknahme, dann Apply; Rückweg bei gescheitertem Plan und Apply; Rollback full alt
  const abschnitt = r.slice(r.indexOf('### Reihenfolge des Rollouts (nicht verhandelbar)\n\n**Vorbedingungen**\n0.'));
  assert.ok(abschnitt.length > 100, 'Abschnitt «Reihenfolge des Rollouts» des Magneten fehlt');
  const pos = (t) => { const i = abschnitt.indexOf(t); assert.ok(i >= 0, `Abschnitt nennt ${t} nicht`); return i; };
  assert.ok(pos('1. **Plan**') < pos('2. **Unmittelbar vor dem Apply die Bestandssperre zurücknehmen') && pos('2. **Unmittelbar vor dem Apply') < pos('3. **Apply**'), 'Reihenfolge Plan, Rücknahme, Apply stimmt nicht');
  for (const wort of ['**Scheitert der Plan:**', '**Scheitert der Apply, ohne zu schreiben**', 'vorDemApply', '`kaufbar: false`', '**Rollback `full` nach der Freischaltung:**', 'Ersatz bei Druckfehlern', "product.description contains 'lspod-designer'", '9490 Vaduz', 'Konturschnitt', '10,2 × 10,2 cm', 'zuerst den 6.4.2-PR mergen']) assert.ok(r.includes(wort), `Rollout-README nennt ${wort} nicht`);
  const pv6 = WURZEL + 'pod/v6/README.md';
  if (existsSync(pv6)) magnetBefehlePruefen(readFileSync(pv6, 'utf8'), 'pod/v6/README.md');
  const codex = WURZEL + 'dropship/CODEX-ROLLOUT-V64-0911.md';
  if (existsSync(codex)) magnetBefehlePruefen(readFileSync(codex, 'utf8'), 'CODEX-ROLLOUT-V64-0911.md');
});

// Nachbesserung 11.11.2026 (Prüferfund «CI überspringt»): der Workflow-Test oben überspringt sich im CI-Job «selbst-gestalten», weil dort
// pod-v64-description-rollout.yml nicht im Checkout liegt. Der Job «rollout-werkzeug» von magnet-freischaltung-test.yml holt ihn.
const WMF = WURZEL + '.github/workflows/magnet-freischaltung-test.yml';
if (!existsSync(WMF)) console.log('ÜBERSPRUNGEN: CI-Verdrahtung (magnet-freischaltung-test.yml fehlt im Checkout)');
else {
  test('CI-Verdrahtung: magnet-freischaltung-test.yml fährt diesen Test mit beiden Rollout-Workflows und wird rot, wenn er sich überspringt; Eingaben des Baus lösen ihn aus', () => {
    const w = readFileSync(WMF, 'utf8');
    const pfade = (w.match(/^on:\n  pull_request:\n    paths:\n((?:      - .+\n)+)/m)?.[1] || '').split('\n').map((l) => l.replace(/^\s*- '?|'?\s*$/g, '')).filter(Boolean);
    for (const p of ['dropship/selbst-gestalten-fertig-0511/werkzeuge/**', 'dropship/selbst-gestalten-fertig-0511/target-katalog-20261108/**', 'dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/**', 'dropship/selbst-gestalten-fertig-0511/rollout-v63/**', '.github/workflows/pod-v64-description-rollout.yml', '.github/workflows/pod-v63-description-rollout.yml', 'pod/v6/**', 'automation/lib/shopify_gql.mjs', 'automation/lib/shopify_secret.mjs', '_headers'])
      assert.ok(pfade.includes(p), `paths: ${p} fehlt`);
    const job = w.slice(w.indexOf('\n  rollout-werkzeug:\n'));
    assert.ok(job.length > 20 && w.includes('\n  rollout-werkzeug:\n'), 'Job rollout-werkzeug fehlt');
    const sparse = (job.match(/sparse-checkout: \|\n((?:            .+\n)+)/)?.[1] || '').split('\n').map((l) => l.trim()).filter(Boolean);
    for (const p of ['.github/workflows/pod-v64-description-rollout.yml', '.github/workflows/pod-v63-description-rollout.yml', 'dropship/selbst-gestalten-fertig-0511', 'pod/v6', 'automation/lib', '_headers'])
      assert.ok(sparse.includes(p), `sparse-checkout des Jobs rollout-werkzeug: ${p} fehlt`);
    assert.match(job, /node dropship\/selbst-gestalten-fertig-0511\/rollout-v63-direct\/direct_rollout_test\.mjs/);
    assert.match(job, /grep -q 'ÜBERSPRUNGEN: Workflow-Test'/, 'der Job prüft nicht, ob sich der Workflow-Test überspringt');
    assert.match(job, /set -o pipefail\n\s*node dropship\/selbst-gestalten-fertig-0511\/rollout-v63-direct\/direct_rollout_test\.mjs \| tee/, 'ohne pipefail zählt der Exit von tee, nicht der des Tests');
  });
}

// ---- Schreib- und Rollback-Pfad gegen die Offline-Attrappe (Shopify, Storefront, Assets; kein Netz, keine Zugangsdaten) ----------------
// Eigene Datei, hier als Kindprozess eingehängt, damit der CI-Job «selbst-gestalten» (er startet nur diese Datei) sie mitprüft.
// Nur die Mutationsprobe schaltet sie für Mutanten ab, die den Runner gar nicht berühren (DIREKT_ROLLOUT_OHNE_ATTRAPPE=1).
if (process.env.DIREKT_ROLLOUT_OHNE_ATTRAPPE === '1') console.log('ÜBERSPRUNGEN: Attrappen-Szenarien (DIREKT_ROLLOUT_OHNE_ATTRAPPE=1, nur für die Mutationsprobe)');
else {
  test('Attrappen-Szenarien (direct_rollout_attrappe_test.mjs): Plan, Apply je Stufe, Rollback, Hash-Schutz, Ledger-/OUT_DIR-Sperre, Live-Gates, Rücklesen, kein Wiederholen; Rollback unabhängig von Sperrseiten, ENTWURF und lokalen Dateien', () => {
    const r = spawnSync(process.execPath, [HIER + 'direct_rollout_attrappe_test.mjs'], { encoding: 'utf8', timeout: 240000, env: { PATH: process.env.PATH || '', HOME: tmpdir(), ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}) } });
    const m = (r.stdout || '').match(/^(\d+) Prüfungen, (\d+) Fehler/m);
    assert.ok(m, `keine Auswertung: ${(r.stdout || '').slice(0, 200)} ${(r.stderr || '').slice(0, 300)}`);
    assert.equal(r.status, 0, `${m[2]} Fehler in den Attrappen-Szenarien:\n${(r.stdout || '').slice(0, 1800)}`);
    assert.ok(Number(m[1]) >= 146, `zu wenige Prüfungen (${m[1]}): Szenarien entfernt?`);
    ok += Number(m[1]) - 1;   // die Einzelprüfungen zählen mit
  });
}

if (!process.exitCode) console.log(`${ok} Tests bestanden`);
