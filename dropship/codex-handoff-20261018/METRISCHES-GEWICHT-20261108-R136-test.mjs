import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const url = 'https://luxestyle.ch/products/keramik-tasse-selbst-gestalten?variant=55777979629953';
const runtime = await readFile('/workspace/luxestyle-review/metric-weight-r136/lux-variant-weight-runtime.js', 'utf8');
const weights = {
  '55777979629953': 326,
  '55777979662721': 454,
  '55777979695489': 536,
};
const evidence = { url, variants: [], cartAdd: [], cloudinary: [], forbidden: [], pageErrors: [] };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'de-CH' });
const page = await context.newPage();

page.on('pageerror', (error) => evidence.pageErrors.push(String(error)));
page.on('request', (request) => {
  const requestUrl = request.url();
  if (/\/cart\/add(?:\.js)?(?:\?|$)/.test(requestUrl)) evidence.cartAdd.push(requestUrl);
  if (/api\.cloudinary\.com\/.*\/upload/.test(requestUrl)) evidence.cloudinary.push(requestUrl);
  if (/\/(?:checkouts?|orders?)(?:\/|\?|$)/.test(requestUrl)
      && (request.method() !== 'GET' || request.resourceType() === 'document')) {
    evidence.forbidden.push({ method: request.method(), url: requestUrl });
  }
});

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('#lux-spezi', { timeout: 30_000 });

  await page.evaluate((map) => {
    const weightRow = [...document.querySelectorAll('#lux-spezi tr')]
      .find((row) => row.querySelector('th')?.textContent.trim() === 'Gewicht');
    if (!weightRow) throw new Error('Gewichtszeile fehlt');
    const cell = weightRow.querySelector('td');
    cell.setAttribute('data-lux-variant-weight', '15422823465345');
    cell.textContent = '326 g';
    const json = document.createElement('script');
    json.type = 'application/json';
    json.setAttribute('data-lux-variant-weight-map', '15422823465345');
    json.textContent = JSON.stringify(map);
    document.body.appendChild(json);
  }, weights);
  await page.addScriptTag({ content: runtime });

  async function choose(value, id, expected) {
    await page.locator(`variant-picker input[type="radio"][value="${value}"]`).check({ force: true });
    await page.waitForFunction(([wantedId, wantedText]) => {
      const selected = document.querySelector('variant-picker input[type="radio"]:checked');
      const cell = document.querySelector('[data-lux-variant-weight]');
      const formIds = [...document.querySelectorAll('form[action*="/cart/add"] input[name="id"]')]
        .map((input) => input.value);
      return selected?.getAttribute('data-variant-id') === wantedId
        && formIds.includes(wantedId)
        && cell?.textContent.trim() === wantedText;
    }, [id, expected], { timeout: 30_000 });
    evidence.variants.push({ value, id, text: await page.locator('[data-lux-variant-weight]').innerText() });
  }

  await choose('325 ml', '55777979629953', '326 g');
  await choose('444 ml', '55777979662721', '454 g');
  await choose('591 ml', '55777979695489', '536 g');
  await choose('325 ml', '55777979629953', '326 g');

  assert.equal(evidence.cartAdd.length, 0);
  assert.equal(evidence.cloudinary.length, 0);
  assert.equal(evidence.forbidden.length, 0);
  assert.deepEqual(evidence.pageErrors, []);
  evidence.status = 'PASS';
} catch (error) {
  evidence.status = 'FAIL';
  evidence.error = { message: error.message, stack: error.stack };
  throw error;
} finally {
  evidence.completedAt = new Date().toISOString();
  await writeFile('/workspace/luxestyle-review/metric-weight-r136/test-result.json', JSON.stringify(evidence, null, 2));
  await browser.close();
}

console.log(JSON.stringify(evidence));
