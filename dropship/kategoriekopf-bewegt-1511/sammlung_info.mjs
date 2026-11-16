import { gql } from './shop.mjs';
for (const h of process.argv.slice(2)) {
  const d = await gql(`query($h:String!){collectionByHandle(handle:$h){title productsCount{count} sortOrder ruleSet{appliedDisjunctively rules{column relation condition}} products(first:12){nodes{title productType}}}}`, { h });
  const c = d.collectionByHandle; if (!c) { console.log(h, 'FEHLT'); continue; }
  console.log('■', h, '|', c.title, '|', c.productsCount.count, 'Produkte |', c.sortOrder, '| Regeln', c.ruleSet ? (c.ruleSet.appliedDisjunctively ? 'ODER ' : 'UND ') + c.ruleSet.rules.slice(0, 6).map((r) => r.column + ' ' + r.relation + ' ' + r.condition).join('; ') + (c.ruleSet.rules.length > 6 ? ' …(' + c.ruleSet.rules.length + ')' : '') : 'manuell');
  console.log('   ', c.products.nodes.map((p) => p.title.slice(0, 40)).join(' · '));
}
