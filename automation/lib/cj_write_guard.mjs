import { skuNorm } from './grind_dubletten.mjs';

/**
 * Frischer Readback nach einer nicht idempotenten Produktmutation.
 * Fehlende Felder, Teilpagination oder abweichende Sicherheitswerte bleiben UNKNOWN/BLOCKED;
 * ein erfolgreicher HTTP-Status allein gilt nie als bestaetigter Produktwrite.
 */
export async function pruefeCjProduktNachWrite({ gql, id, sourceTag, erwarteteSkus = [] } = {}) {
  if (typeof gql !== 'function' || !String(id || '').startsWith('gid://shopify/Product/')) {
    throw new Error('SHOPIFY_POSTCHECK_UNKNOWN: Produkt-ID oder GraphQL-Leser fehlt');
  }
  const data = await gql(
    'query($id:ID!){product(id:$id){id status tags variants(first:100){pageInfo{hasNextPage}nodes{sku}}}}',
    { id },
  );
  const produkt = data?.product;
  if (!produkt || !Array.isArray(produkt.tags) || !Array.isArray(produkt.variants?.nodes)) {
    throw new Error('SHOPIFY_POSTCHECK_UNKNOWN: Produkt-Readback unvollstaendig');
  }
  if (produkt.variants.pageInfo?.hasNextPage) {
    throw new Error('SHOPIFY_POSTCHECK_UNKNOWN: Varianten-Readback unvollstaendig');
  }
  if (produkt.status !== 'DRAFT') throw new Error(`SHOPIFY_POSTCHECK_BLOCKED: Status ${produkt.status || 'fehlt'}`);
  const tags = new Set(produkt.tags.map(tag => String(tag).toLocaleLowerCase('de-CH')));
  for (const pflicht of ['compliance-pruefen', sourceTag]) {
    if (!pflicht || !tags.has(String(pflicht).toLocaleLowerCase('de-CH'))) {
      throw new Error(`SHOPIFY_POSTCHECK_BLOCKED: Pflicht-Tag fehlt (${pflicht || 'sourceTag'})`);
    }
  }
  const gelesen = new Set(produkt.variants.nodes.map(v => skuNorm(v?.sku)).filter(Boolean));
  const erwartet = [...new Set(erwarteteSkus.map(skuNorm).filter(Boolean))];
  if (!erwartet.length || erwartet.some(sku => !gelesen.has(sku))) {
    throw new Error('SHOPIFY_POSTCHECK_UNKNOWN: erwartete Varianten-SKUs fehlen');
  }
  return produkt;
}
