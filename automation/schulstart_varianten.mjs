#!/usr/bin/env node
/* schulstart_varianten.mjs — zieht bei den zwei Schulstart-Rucksäcken die Farbauswahl nach.
 *
 * WARUM: cj_sku_import legt Produkte mit EINER Standard-Variante an — der Betreiber wollte
 * aber ausdrücklich «mit Auswahl und allem». Die CJ-Quelle hat 5 bzw. 12 Varianten mit
 * eigenen Bildern. Dieser Lauf ersetzt die Standard-Variante durch die echten Farben
 * (deutsche Namen, CJ-Varianten-SKU für die Bestell-Automatik) und hängt jedem ihr Bild an.
 *
 * ⚠️ productSet MIT variants ERSETZT den Variantenbestand — deshalb NUR auf diesen zwei
 * frisch angelegten Produkten, per fester pid-Liste, nie generisch.
 * Punkte-leer (16900500) → Exit 3, der Wrapper versucht es später wieder.
 */
import fs from 'node:fs';

const SHOP = 'au3j0y-hq.myshopify.com', API = '2024-10';
const CJT = (process.env.CJ_TOKEN || (fs.existsSync('/tmp/cj_token.json')
  ? (JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || '') : '')).trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ZIEL = [
  { pid: '2608140735271620000', gid: 'gid://shopify/Product/15500671811969', chf: 20.90 },
  { pid: '2608140254241610000', gid: 'gid://shopify/Product/15500672008577', chf: 17.90 },
];
const DE = { 'sapphire blue': 'Saphirblau', 'sapphire blue pink': 'Saphirblau-Pink',
  'sapphire blue red': 'Saphirblau-Rot', khaki: 'Khaki', purple: 'Lila', black: 'Schwarz',
  'dark gray': 'Dunkelgrau', green: 'Grün', pink: 'Pink', blue: 'Blau', gray: 'Grau',
  'light blue': 'Hellblau', 'with accessories': 'mit Zubehör', 'no accessories': 'ohne Zubehör' };

function deName(k) {
  const t = k.trim().toLowerCase();
  if (DE[t]) return DE[t];
  return t.split('-').map(x => DE[x.trim()] || (x.trim()[0] || '').toUpperCase() + x.trim().slice(1)).join(' · ');
}

async function sgql(q, v) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { 'X-Shopify-Access-Token': fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8').trim(),
               'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, variables: v || {} }) });
  return r.json();
}
async function cj(path) {
  const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1' + path,
    { headers: { 'CJ-Access-Token': CJT }, signal: AbortSignal.timeout(45000) });
  return r.json();
}

let alle_ok = true;
for (const z of ZIEL) {
  const chk = await sgql('query($id:ID!){product(id:$id){options{name values} title}}', { id: z.gid });
  const opts = chk.data?.product?.options || [];
  if (opts.some(o => o.name === 'Farbe')) { console.log('= hat schon Farben:', z.gid); continue; }
  const j = await cj('/product/query?pid=' + z.pid);
  if (Number(j.code) === 16900500) { console.log('CJ-Punkte leer — später wieder'); process.exit(3); }
  if (Number(j.code) !== 200) { console.log('CJ-Fehler', j.code, '— später wieder'); alle_ok = false; continue; }
  const vs = (j.data?.variants || []).filter(v => v.variantSku);
  if (vs.length < 2) { console.log('zu wenige CJ-Varianten:', z.pid); continue; }

  // Farbe (und beim Studenten-Rucksack die Ausstattung) aus dem variantKey.
  const varianten = vs.map(v => {
    const teile = String(v.variantKey || '').split('-').map(s => s.trim()).filter(Boolean);
    const farbe = deName(teile[0] || 'Standard');
    const extra = teile[1] ? deName(teile[1]) : null;
    return { farbe, extra, sku: 'CJ-' + v.variantSku, img: String(v.variantImage || '').trim() };
  });
  const farben = [...new Set(varianten.map(v => v.farbe))];
  const extras = [...new Set(varianten.map(v => v.extra).filter(Boolean))];
  const productOptions = [{ name: 'Farbe', values: farben.map(n => ({ name: n })) }];
  if (extras.length > 1) productOptions.push({ name: 'Ausführung', values: extras.map(n => ({ name: n })) });

  const eingabe = varianten.map(v => ({
    optionValues: [{ optionName: 'Farbe', name: v.farbe },
                   ...(extras.length > 1 ? [{ optionName: 'Ausführung', name: v.extra || extras[0] }] : [])],
    price: String(z.chf.toFixed(2)),
    inventoryItem: { sku: v.sku.slice(0, 70), tracked: false },
    inventoryPolicy: 'CONTINUE',
  }));
  const r = await sgql('mutation($i:ProductSetInput!){productSet(synchronous:true,input:$i){userErrors{field message}}}',
    { i: { id: z.gid, productOptions, variants: eingabe } });
  const e = r.data?.productSet?.userErrors || [];
  if (e.length) { console.log('✗ productSet:', JSON.stringify(e[0]).slice(0, 120)); alle_ok = false; continue; }
  console.log(`✓ ${farben.length} Farben${extras.length > 1 ? ' × ' + extras.length + ' Ausführungen' : ''} an ${z.gid.split('/').pop()}`);

  // Variantenbilder: ein Medium je einmaliger URL, dann anhängen (mediaSrc tut nichts!).
  const urls = [...new Set(varianten.map(v => v.img).filter(u => /^https/.test(u)))];
  const gut = [];
  for (const u of urls) {
    try { const h = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(20000) }); if (h.ok) gut.push(u); }
    catch { /* tote URL */ }
  }
  const cm = await sgql('mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){media{id} mediaUserErrors{message}}}',
    { id: z.gid, m: gut.map(u => ({ originalSource: u, mediaContentType: 'IMAGE' })) });
  const neu = cm.data?.productCreateMedia?.media || [];
  if (neu.length === gut.length && gut.length) {
    const zu = {}; gut.forEach((u, i) => zu[u] = neu[i].id);
    const vq = await sgql('query($id:ID!){product(id:$id){variants(first:100){nodes{id sku}}}}', { id: z.gid });
    const skuZuBild = {}; varianten.forEach(v => { if (zu[v.img]) skuZuBild[v.sku.slice(0, 70)] = zu[v.img]; });
    const ein = (vq.data?.product?.variants?.nodes || []).filter(v => skuZuBild[v.sku])
      .map(v => ({ id: v.id, mediaId: skuZuBild[v.sku] }));
    if (ein.length) {
      const rr = await sgql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}',
        { p: z.gid, v: ein });
      const ee = rr.data?.productVariantsBulkUpdate?.userErrors || [];
      console.log(ee.length ? '  ⚠️ Bild-Anhang: ' + JSON.stringify(ee[0]).slice(0, 80)
                            : `  🎨 ${ein.length} Varianten mit eigenem Bild`);
    }
  }
  await sleep(2000);
}
if (alle_ok) { fs.writeFileSync('/tmp/schulstart_varianten_done', 'ok'); console.log('VARIANTEN FERTIG'); }
