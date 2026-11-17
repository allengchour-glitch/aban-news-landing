// NUR LESEN: zweite Welle (Rest-Treffer nach der ersten Welle: Echtvergoldung, Goldauflage, Gold-Verplattung/-Auflage, 18K auf Schmuck), je Handle frisch aus Shopify.
import { writeFileSync } from 'node:fs';
import { shopifyGql } from '../../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../../automation/lib/shopify_secret.mjs';
const SHOP = process.env.SHOPIFY_SHOP;
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const H = `geburtsstein-armband-mit-susswasserperle-638900 retro-ring-mit-transparentem-quadrat-und-goldb-601500 minimalistisches-armband-mit-pferd-und-perle-637500 3d-retro-nagel-zirkon-5er-set-276864 vintage-naturstein-ring-fur-frauen-600600 wasser-tropfen-ohrclips-hochwertige-ohrringe-620200 starburst-gold-armband-fur-damen-610700 vergoldetes-kreuzarmband-mit-zirkonia-610100 elegantes-zirkon-armband-mit-krone-611200 verstellbarer-ring-mit-schimmerndem-zirkonia-615100 meerjungfrau-susswasserperlen-armband-633700 retro-emaille-ring-fur-damen-600700 glucks-kleeblatt-armband-fur-frauen-608500 unisex-drachen-armband-611100 vergoldete-mehrlagige-conch-ohrklemmen-626400 ring-mit-netzstruktur-632600 armband-sun-aus-vergoldetem-edelstahl-638100 schlangen-kettchen-mit-gravur-603500 vergoldetes-paperclip-armband-aus-edelstahl-603900 aussagekraftiger-ring-634000 blumen-ohrclip-629200 unregelmassige-ohrringe-616500 armband-mit-zirkonia-edelsteinen-610800 minimalistischer-ring-aus-silber-mit-geometris-601500`.split(/\s+/);
const aus = [];
for (const h of H) {
  const d = await q(`query($h:String!){ productByHandle(handle:$h){ id handle title status tags productType descriptionHtml seo{title description} options{ id name position optionValues{ id name } } } }`, { h });
  if (!d.productByHandle) { console.log('FEHLT', h); continue; } aus.push(d.productByHandle);
}
writeFileSync(new URL('./ziel2_produkte.json', import.meta.url), JSON.stringify(aus));
console.log('gelesen', aus.length, 'von', H.length, '| ACTIVE', aus.filter((n) => n.status === 'ACTIVE').length, '| mit eigenem SEO-Titel', aus.filter((n) => n.seo?.title).length, '| mit SEO-Beschreibung', aus.filter((n) => n.seo?.description).length);
