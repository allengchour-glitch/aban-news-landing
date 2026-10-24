/** Canonical Admin API host; validate before attaching any Shopify credential. */
export function normalizeShopifyHost(raw) {
  if (raw === undefined || raw === null || raw === '') return '';
  if (typeof raw !== 'string') throw new Error('SHOPIFY_HOST: ungültige Shop-Domain');
  let value=raw.trim();
  if (!value) return '';
  if (/^https:\/\//i.test(value)) {
    let url;
    try { url=new URL(value); } catch { throw new Error('SHOPIFY_HOST: ungültige Shop-Domain'); }
    if (url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/') {
      throw new Error('SHOPIFY_HOST: reine myshopify.com-Shop-Domain erforderlich');
    }
    value=url.hostname;
  } else if (value.endsWith('/')) value=value.slice(0,-1);
  value=value.toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.myshopify\.com$/.test(value)) {
    throw new Error('SHOPIFY_HOST: reine myshopify.com-Shop-Domain erforderlich');
  }
  return value;
}
