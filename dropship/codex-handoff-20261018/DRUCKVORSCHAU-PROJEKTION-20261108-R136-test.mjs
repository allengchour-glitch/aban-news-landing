import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

process.env.V6_DATEI = '/workspace/luxestyle-review/v63-mug-pilot-theme-20261108/r136-proportion-candidate/lspod-designer-v6-6.3.0.js';
process.env.V6_VERSION = '6.3.0';
const testRoot = '/workspace/luxestyle-review/v63-review-gate-20261108/pod/v6/test';
const { playwright, starteServer, seiteOeffnen, editorBereit } = await import(`file://${testRoot}/lib.mjs?identity=${Date.now()}`);
const { chromium } = playwright();
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const photos = {
  'a8506a7e60': readFileSync('/tmp/r136-mug/325.jpg'),
  '9a682b65e7': readFileSync('/tmp/r136-mug/444.jpg'),
  'b464bc7d14': readFileSync('/tmp/r136-mug/591.jpg'),
};
const variants = [
  { sv: '1001', name: '325 ml', pv: 1320 },
  { sv: '1002', name: '444 ml', pv: 4830 },
  { sv: '1003', name: '591 ml', pv: 16586 },
];
const query = 'karte=19&shop=1001:1320,1002:4830,1003:16586&varianten=1001:325%20ml,1002:444%20ml,1003:591%20ml&vorschau=19';
const result = { kind: 'local-mocked-pipeline', noRealCheckoutOrOrder: true, variants: [] };

const server = await starteServer();
const browser = await chromium.launch({ headless: true });
try {
  for (const variant of variants) {
    const s = await seiteOeffnen(browser, server.url, {
      breite: 1200,
      hoehe: 920,
      query,
      shopifyBild(url) {
        for (const [key, body] of Object.entries(photos)) if (url.includes(key)) return { typ: 'image/jpeg', body };
        return null;
      },
    });
    try {
      const p = s.page;
      await editorBereit(p);
      await p.locator(`input[name="id"][value="${variant.sv}"]`).check();
      await p.getByRole('button', { name: '➕ Text' }).click();
      await p.locator('.lsp6-text').fill('LuxeStyle Vorschau');
      await p.locator('.lsp6-cta').click();
      const dialog = p.locator('[data-lsp6-review="1"]');
      await dialog.waitFor({ state: 'visible', timeout: 30000 });
      await p.waitForFunction(() => {
        const img = document.querySelector('[data-review-print="default"]');
        return img && img.complete && img.naturalWidth > 0;
      });
      const review = Buffer.from(await p.locator('[data-review-print="default"]').evaluate(async (img) => {
        const a = new Uint8Array(await (await fetch(img.src)).arrayBuffer());
        let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
        return btoa(s);
      }), 'base64');
      await dialog.locator('.lsp6-review-accept').check();
      await Promise.all([
        p.waitForURL('**/cart', { timeout: 60000 }),
        dialog.locator('.lsp6-review-confirm').click(),
      ]);
      const props = s.warenkorb[0]?.properties || {};
      const key = Object.keys(props).find((k) => k.includes('Druckdatei') && k.endsWith('(default)'));
      const uploadUrl = key && props[key];
      const upload = uploadUrl && s.png(uploadUrl);
      const entry = {
        name: variant.name,
        pv: variant.pv,
        reviewBytes: review.length,
        reviewSha256: sha256(review),
        uploadBytes: upload?.length || 0,
        uploadSha256: upload ? sha256(upload) : null,
        byteIdentical: !!upload && review.equals(upload),
        mockUploads: s.uploads.length,
        mockUploadMeta: s.uploads,
        mockCartPosts: s.warenkorb.length,
        browserErrors: s.fehler,
      };
      result.variants.push(entry);
      if (!entry.byteIdentical || entry.mockUploads < 1 || entry.mockCartPosts !== 1 || entry.browserErrors.length) throw new Error(JSON.stringify(entry));
    } finally {
      await s.schliessen();
    }
  }
} finally {
  await browser.close();
  await server.stop();
}

writeFileSync('/workspace/luxestyle-review/v63-mug-pilot-theme-20261108/r136-proportion-candidate/local-upload-identity-result.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
