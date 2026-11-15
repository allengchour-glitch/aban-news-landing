const shop = process.env.SHOPIFY_SHOP;
const tok = (await (await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json()).access_token;
const gql = async (query, variables) => { const r = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query, variables }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.data; };
let after = null, alle = [];
do {
  const d = await gql(`query($a:String){deliveryProfiles(first:25,after:$a){pageInfo{hasNextPage endCursor} nodes{id name default productVariantsCount{count} profileLocationGroups{ locationGroupZones(first:40){ nodes{ zone{ countries{ code{ countryCode restOfWorld } } } } } } }}}`, { a: after });
  alle.push(...d.deliveryProfiles.nodes); after = d.deliveryProfiles.pageInfo.hasNextPage ? d.deliveryProfiles.pageInfo.endCursor : null;
} while (after);
console.log('Profile:', alle.length);
for (const p of alle) {
  const l = new Set(p.profileLocationGroups.flatMap(g => g.locationGroupZones.nodes.flatMap(z => z.zone.countries.map(c => c.code.countryCode || (c.code.restOfWorld ? 'REST' : '?')))));
  const n = p.productVariantsCount.count;
  if (n > 0 && (!l.has('CH') || !l.has('LI'))) console.log('LUECKE', p.name, 'Varianten', n, 'CH', l.has('CH') || l.has('REST'), 'LI', l.has('LI') || l.has('REST'));
}
console.log('mit Varianten:', alle.filter(p => p.productVariantsCount.count > 0).map(p => `${p.name}=${p.productVariantsCount.count}`).join(', '));
