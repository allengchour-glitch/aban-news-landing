import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = '/workspace/luxestyle-review/v63-mug-pilot-theme-20261108/draft-e2e-combined-r136-clean-result.json';
const url = 'https://luxestyle.ch/products/keramik-tasse-selbst-gestalten?preview_theme_id=213482963335&variant=55777979629953';
const evidence = {
  url,
  viewport: '375x812',
  assets: [],
  cloudinary: [],
  cartAdd: [],
  forbiddenRequests: [],
  pageErrors: [],
  variants: [],
  steps: [],
  formBlobs: [],
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'de-CH' });

// request.postDataBuffer() is not reliable for Chromium's streamed multipart body.
// Capture each Blob exactly where the page appends it to FormData, hash it in the
// browser and persist the result in Node before the cart navigation replaces the page.
await context.exposeBinding('r136RecordFormBlob', (_source, entry) => {
  evidence.formBlobs.push(entry);
});
await context.addInitScript(() => {
  const original = FormData.prototype.append;
  FormData.prototype.append = function patchedAppend(name, value, filename) {
    if (value instanceof Blob) {
      Promise.resolve(value.arrayBuffer()).then(async (buffer) => {
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
        await window.r136RecordFormBlob({
          name: String(name),
          filename: filename == null ? null : String(filename),
          type: value.type || '',
          bytes: buffer.byteLength,
          sha256,
        });
      }).catch(() => {});
    }
    return original.apply(this, arguments);
  };
});

const page = await context.newPage();
let cartAddRequests = 0;

page.on('request', (request) => {
  const parsed = new URL(request.url());
  if (/\/cart\/add(?:\.js)?$/.test(parsed.pathname)) cartAddRequests++;
  if ((/\/checkouts?(?:\/|$)|\/orders?(?:\/|$)/.test(parsed.pathname))
    && (request.method() !== 'GET' || request.resourceType() === 'document')) {
    evidence.forbiddenRequests.push({ method: request.method(), url: request.url() });
  }
});
page.on('response', (response) => {
  const responseUrl = response.url();
  if (/lspod-(designer|karte|vorschau)/.test(responseUrl)) {
    evidence.assets.push({ url: responseUrl, status: response.status() });
  }
  if (/api\.cloudinary\.com\/v1_1\/[^/]+\/auto\/upload/.test(responseUrl)) {
    evidence.cloudinary.push({ url: responseUrl, status: response.status() });
  }
  try {
    if (/\/cart\/add(?:\.js)?$/.test(new URL(responseUrl).pathname)) {
      evidence.cartAdd.push({ url: responseUrl, status: response.status() });
    }
  } catch {}
});
page.on('pageerror', (error) => evidence.pageErrors.push(String(error)));

async function clearCart() {
  return page.evaluate(async () => {
    const response = await fetch('/cart/clear.js', { method: 'POST', headers: { Accept: 'application/json' } });
    const json = await response.json();
    return { status: response.status, count: json.item_count };
  });
}

async function editorState() {
  return page.evaluate(() => {
    const editor = window.LSPOD6.editors[0];
    const container = document.querySelector('.lspod-designer-v6');
    return {
      version: window.LSPOD6.version,
      mode: container?.getAttribute('data-lspod6-modus'),
      init: container?.getAttribute('data-init-v6'),
      sv: editor?.st.shopVariante,
      pv: editor?.st.pfVariante,
      model: editor?.karte.printfulProductId,
      meta: editor?.ui.metaText.textContent,
      legacy: document.querySelectorAll('.lspod-designer').length,
    };
  });
}

async function productView() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await page.locator('.lsp6-pv').getAttribute('data-gezeichnet');
    await page.evaluate(() => window.LSPOD6.editors[0].sichtSetzen('produkt'));
    try {
      await page.waitForFunction((previous) => {
        const editor = window.LSPOD6.editors[0];
        return editor.ui.pvWrap.hidden === false
          && Number(editor.ui.pv.getAttribute('data-gezeichnet') || 0) > Number(previous || 0);
      }, before, { timeout: 30000 });
      return page.evaluate(() => {
        const canvas = window.LSPOD6.editors[0].ui.pv;
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let alphaSamples = 0;
        for (let index = 3; index < pixels.length; index += 4000) if (pixels[index]) alphaSamples++;
        return { width: canvas.width, height: canvas.height, alphaSamples };
      });
    } catch {
      await page.evaluate(() => window.LSPOD6.editors[0].sichtSetzen('druck'));
      await page.waitForTimeout(500);
    }
  }
  throw new Error('Produktansicht nach drei Versuchen nicht gezeichnet');
}

async function chooseVariant(value, id, printfulVariant, dimensions) {
  // Use the storefront's actual radio transition and then require all three
  // sources of state (cart form, editor and print metadata) to agree.
  const radio = page.locator(`variant-picker input[type=radio][value="${value}"]`).first();
  await radio.check({ force: true });
  await page.waitForFunction(([wantedId, wantedPf, wantedDimensions]) => {
    const editor = window.LSPOD6?.editors?.[0];
    const hidden = document.querySelector('form[action*="/cart/add"] input[name="id"]');
    return hidden?.value === wantedId
      && String(editor?.st.shopVariante) === wantedId
      && Number(editor?.st.pfVariante) === wantedPf
      && editor?.ui.metaText.textContent.includes(wantedDimensions);
  }, [id, printfulVariant, dimensions], { timeout: 30000 });
  const preview = await productView();
  assert.ok(preview.width > 0 && preview.height > 0 && preview.alphaSamples > 0, JSON.stringify(preview));
  await page.evaluate(() => window.LSPOD6.editors[0].sichtSetzen('druck'));
  evidence.variants.push({ value, id, printfulVariant, dimensions, preview, state: await editorState() });
}

async function openReview() {
  await page.locator('.lsp6-cta').click({ force: true });
  const dialog = page.locator('[data-lsp6-review="1"][role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForFunction(() => {
    const image = document.querySelector('[data-review-print]');
    return image?.complete && image.naturalWidth > 0;
  }, { timeout: 60000 });
  return dialog;
}

async function reviewDigest() {
  return page.locator('[data-review-print]').evaluate(async (image) => {
    const buffer = await (await fetch(image.src)).arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return {
      type: 'image/png',
      bytes: buffer.byteLength,
      sha256: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''),
    };
  });
}

let failure;
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  assert.deepEqual(await clearCart(), { status: 200, count: 0 });
  await page.evaluate(() => {
    document.querySelector('#shopify-pc__banner')?.remove();
    const previewBar = document.querySelector('#PBarNextFrameWrapper');
    if (previewBar) { previewBar.style.display = 'none'; previewBar.setAttribute('aria-hidden', 'true'); }
  });
  await page.waitForFunction(() => window.LSPOD6?.version === '6.3.0'
    && document.querySelector('.lspod-designer-v6')?.getAttribute('data-init-v6') === '1', { timeout: 60000 });

  const initial = await editorState();
  assert.deepEqual(
    { version: initial.version, mode: initial.mode, init: initial.init, model: initial.model, legacy: initial.legacy },
    { version: '6.3.0', mode: 'karte', init: '1', model: 19, legacy: 0 },
  );
  evidence.initial = initial;
  assert.ok(evidence.assets.some((asset) => asset.status === 200 && asset.url.includes('lspod-designer-v6-6.3.0.js')));
  assert.ok(evidence.assets.some((asset) => asset.status === 200 && asset.url.includes('lspod-karte-19.json')));
  assert.ok(evidence.assets.some((asset) => asset.status === 200 && asset.url.includes('lspod-vorschau-19.json')));

  await page.evaluate(() => {
    const editor = window.LSPOD6.editors[0];
    editor.st.ebenen.default.slice().forEach((layer) => editor.entfernen(layer.id));
    editor.neuerText('V6.3 PILOT R136');
  });
  await chooseVariant('325 ml', '55777979629953', 1320, '2700 × 1050');
  await chooseVariant('444 ml', '55777979662721', 4830, '2700 × 1140');
  await chooseVariant('591 ml', '55777979695489', 16586, '3071 × 1205');

  const dpi = await page.evaluate(() => {
    const editor = window.LSPOD6.editors[0];
    const image = editor.neuesBild('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WQAAAABJRU5ErkJggg==', 20, 20);
    return { id: image.id, text: editor.qualitaetSperre(), state: editor.qualitaetLage() };
  });
  assert.match(dpi.text, /Kauf gesperrt/);
  assert.ok(dpi.state.sperren.length === 1 && dpi.state.sperren[0].dpi < 150, JSON.stringify(dpi));
  evidence.dpi = { text: dpi.text, min: dpi.state.min, blocks: dpi.state.sperren.length };
  await page.evaluate((id) => window.LSPOD6.editors[0].entfernen(id), dpi.id);
  assert.equal(await page.evaluate(() => window.LSPOD6.editors[0].qualitaetSperre()), null);
  assert.equal(cartAddRequests, 0);
  assert.equal(evidence.cloudinary.length, 0);

  let dialog = await openReview();
  await page.evaluate(() => {
    const editor = window.LSPOD6.editors[0];
    const id = editor.st.ebenen.default.find((layer) => layer.type === 'text').id;
    editor.waehlen(id);
    editor.ui.textfeld.value += ' EDIT';
    editor.ui.textfeld.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await dialog.waitFor({ state: 'detached', timeout: 10000 });
  assert.equal(cartAddRequests, 0);
  assert.equal(evidence.cloudinary.length, 0);
  evidence.steps.push('edit-invalidated');

  dialog = await openReview();
  // The previous harness used radio.check() after deliberately creating a
  // mismatched checked/data-current-checked state. Dispatch a real hidden-ID
  // change plus the editor's documented variant recheck instead.
  await page.evaluate(() => {
    const hidden = document.querySelector('form[action*="/cart/add"] input[name="id"]');
    hidden.value = '55777979662721';
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
    window.LSPOD6.editors[0].varianteGeprueft();
  });
  await dialog.waitFor({ state: 'detached', timeout: 15000 });
  await page.waitForFunction(() => String(window.LSPOD6.editors[0].st.shopVariante) === '55777979662721');
  assert.equal(cartAddRequests, 0);
  assert.equal(evidence.cloudinary.length, 0);
  evidence.steps.push('variant-invalidated');

  // Reload into a clean, explicit 325-ml state. This keeps the real network
  // confirmation independent from the deliberate invalidation manipulations.
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    document.querySelector('#shopify-pc__banner')?.remove();
    const previewBar = document.querySelector('#PBarNextFrameWrapper');
    if (previewBar) { previewBar.style.display = 'none'; previewBar.setAttribute('aria-hidden', 'true'); }
  });
  await page.waitForFunction(() => window.LSPOD6?.version === '6.3.0'
    && document.querySelector('.lspod-designer-v6')?.getAttribute('data-init-v6') === '1', { timeout: 60000 });
  await page.evaluate(() => {
    const editor = window.LSPOD6.editors[0];
    editor.st.ebenen.default.slice().forEach((layer) => editor.entfernen(layer.id));
    editor.neuerText('V6.3 PILOT R136');
  });
  await page.waitForFunction(() => {
    const editor = window.LSPOD6.editors[0];
    const hidden = document.querySelector('form[action*="/cart/add"] input[name="id"]');
    return hidden?.value === '55777979629953'
      && String(editor.st.shopVariante) === '55777979629953'
      && editor.st.pfVariante === 1320
      && editor.ui.metaText.textContent.includes('2700 × 1050');
  }, { timeout: 30000 });

  dialog = await openReview();
  const summary = await dialog.locator('[data-review-summary]').innerText();
  assert.match(summary, /325 ml/);
  assert.match(summary, /Printful-Modell:\s*19/);
  evidence.reviewSummary = summary;
  assert.equal(await dialog.locator('[data-review-product]').count(), 1);
  assert.equal(await dialog.locator('[data-review-fallback]').count(), 0);
  const mobile = await dialog.locator('.lsp6-review-panel').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width, viewport: innerWidth, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
  });
  assert.ok(mobile.left >= 0 && mobile.right <= mobile.viewport + 0.5 && mobile.scrollWidth <= mobile.clientWidth, JSON.stringify(mobile));
  evidence.mobile = mobile;

  const checkbox = dialog.locator('.lsp6-review-accept');
  const confirm = dialog.locator('.lsp6-review-confirm');
  assert.equal(await checkbox.evaluate((element) => document.activeElement === element), true);
  assert.equal(await confirm.isDisabled(), true);
  const digest = await reviewDigest();
  evidence.reviewPrint = digest;
  assert.equal(cartAddRequests, 0);
  assert.equal(evidence.cloudinary.length, 0);
  await checkbox.check();
  assert.equal(await confirm.isEnabled(), true);
  assert.equal(cartAddRequests, 0);
  await confirm.evaluate((element) => element.click());
  await dialog.waitFor({ state: 'detached', timeout: 10000 });

  const deadline = Date.now() + 120000;
  while (Date.now() < deadline && !(evidence.cloudinary.filter((entry) => entry.status === 200).length >= 2
    && evidence.cartAdd.some((entry) => entry.status === 200)
    && evidence.formBlobs.some((entry) => entry.type === 'image/png'))) {
    await page.waitForTimeout(500);
  }
  assert.equal(evidence.cloudinary.filter((entry) => entry.status === 200).length, 2, JSON.stringify(evidence.cloudinary));
  assert.ok(evidence.cartAdd.some((entry) => entry.status === 200), JSON.stringify(evidence.cartAdd));
  const exactBlob = evidence.formBlobs.find((entry) => entry.type === 'image/png'
    && entry.bytes === digest.bytes && entry.sha256 === digest.sha256);
  assert.ok(exactBlob, JSON.stringify({ digest, formBlobs: evidence.formBlobs }));
  evidence.uploadPrint = exactBlob;

  await page.waitForURL((next) => new URL(next).pathname === '/cart', { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  const cart = await page.evaluate(async () => (await (await fetch('/cart.js')).json()));
  assert.equal(cart.item_count, 1);
  const item = cart.items[0];
  assert.equal(String(item.variant_id), '55777979629953');
  const properties = item.properties || {};
  const design = Object.entries(properties).find(([key]) => key.includes('Design'));
  const print = Object.entries(properties).find(([key]) => key.includes('Druckdatei'));
  assert.ok(design && String(design[1]).includes('V6.3 PILOT R136'), JSON.stringify(properties));
  assert.ok(print && /^https:\/\//.test(String(print[1])));
  const pod = JSON.parse(properties._pod_karte);
  assert.deepEqual({ m: pod.m, pv: pod.pv, sv: String(pod.sv), pl: pod.pl }, { m: 19, pv: 1320, sv: '55777979629953', pl: ['default'] });
  assert.ok(!properties._vorschau || /^https:\/\//.test(properties._vorschau));
  evidence.cartItem = { variantId: String(item.variant_id), properties, pod };
  assert.equal(evidence.forbiddenRequests.length, 0);
  assert.equal(evidence.pageErrors.filter((error) => /lspod6|build error/i.test(error)).length, 0, JSON.stringify(evidence.pageErrors));
} catch (error) {
  failure = error;
  evidence.error = { name: error.name, message: error.message, stack: error.stack };
} finally {
  try {
    const cleared = await clearCart();
    evidence.cartClear = cleared;
    assert.deepEqual(cleared, { status: 200, count: 0 });
  } catch (error) {
    evidence.cartClearError = String(error);
    if (!failure) failure = error;
  }
  evidence.cartAddRequests = cartAddRequests;
  evidence.completedAt = new Date().toISOString();
  await writeFile(out, `${JSON.stringify(evidence, null, 2)}\n`);
  await browser.close();
}

if (failure) throw failure;
console.log('v6.3 draft combined R136 PASS: variants, product preview, DPI, invalidation, exact FormData PNG, mobile, Cloudinary/cart 200, clear count0');
