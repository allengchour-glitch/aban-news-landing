import assert from 'node:assert/strict';
import { pruefeCjProduktNachWrite } from './cj_write_guard.mjs';

const id = 'gid://shopify/Product/123';
const sourceTag = 'cj-pid-1234567890123456789';
const basis = {
  product: {
    id,
    status: 'DRAFT',
    tags: ['cj-real', 'compliance-pruefen', sourceTag],
    variants: { pageInfo: { hasNextPage: false }, nodes: [{ sku: 'CJ-ABC01' }, { sku: 'CJ-ABC02' }] },
  },
};

const ok = await pruefeCjProduktNachWrite({ gql: async () => basis, id, sourceTag, erwarteteSkus: ['CJ-ABC01', 'CJ-ABC02'] });
assert.equal(ok.id, id);

for (const [name, data] of [
  ['fehlendes Produkt', {}],
  ['ACTIVE', { product: { ...basis.product, status: 'ACTIVE' } }],
  ['Sperrtag fehlt', { product: { ...basis.product, tags: [sourceTag] } }],
  ['Quelltag fehlt', { product: { ...basis.product, tags: ['compliance-pruefen'] } }],
  ['Pagination', { product: { ...basis.product, variants: { ...basis.product.variants, pageInfo: { hasNextPage: true } } } }],
  ['SKU fehlt', { product: { ...basis.product, variants: { pageInfo: { hasNextPage: false }, nodes: [{ sku: 'CJ-ABC01' }] } } }],
]) {
  await assert.rejects(
    pruefeCjProduktNachWrite({ gql: async () => data, id, sourceTag, erwarteteSkus: ['CJ-ABC01', 'CJ-ABC02'] }),
    /SHOPIFY_POSTCHECK_(?:UNKNOWN|BLOCKED)/,
    name,
  );
}

console.log('cj_write_guard_test: OK');
