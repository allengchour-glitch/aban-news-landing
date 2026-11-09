import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  ALLOWLIST, BLOCKLIST, PREVIEW_IDS, assetUrl, attr, baustein, beschreibungPlanen,
  blockerBaustein, blockerProduktPruefen, editorReleasePlanen, integritySha256, produktPruefen,
  releaseAusAllowlist, releasePruefen, sha256,
  VORHER_EDITOR,
} from './direct_rollout_lib.mjs';

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

test('Allowlist hat exakt 16 eindeutige Produkte und keine drei gesperrten Produkte', () => {
  assert.equal(ALLOWLIST.length, 16); assert.equal(new Set(ALLOWLIST.map((x) => x.id)).size, 16);
  assert.ok(ALLOWLIST.every((x) => !/buegeltransfer|dad-cap|magnet-zum/.test(x.handle)));
  assert.equal(BLOCKLIST.length, 3); assert.equal(new Set(BLOCKLIST.map((x) => x.id)).size, 3);
  assert.ok(BLOCKLIST.every((x) => !ALLOWLIST.some((a) => a.id === x.id)));
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
test('Release lehnt fehlendes Produkt ab', () => wirft(() => releasePruefen({ ...release, products: products.slice(1) }), /erwartet 16/));
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

if (!process.exitCode) console.log(`${ok} Tests bestanden`);
