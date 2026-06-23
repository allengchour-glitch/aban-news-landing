// tiktok-stats.mjs — zieht TikTok-Ad-Reporting (spend/clicks/conversions/Kaeufe) via Marketing API (v1.3)
// und stempelt eine Zusammenfassung ins Shop-Metafeld luxe.tiktok_stats (von jeder Session lesbar).
// VOR-GEBAUT 2026-06-23 (User richtet API spaeter ein): No-op-sicher -> ohne TIKTOK_ACCESS_TOKEN+ADVERTISER_ID = skip.
// ⚠️ Marketing API: Header 'Access-Token' (NICHT Bearer), Domain business-api.tiktok.com. Creds nur aus ENV (NIE im Repo).
const TT = process.env.TIKTOK_ACCESS_TOKEN, ADV = process.env.TIKTOK_ADVERTISER_ID;
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP;
if (!TT || !ADV) { console.log('tiktok-stats: kein TIKTOK_ACCESS_TOKEN/ADVERTISER_ID -> skip (API noch nicht eingerichtet)'); process.exit(0); }
const d = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const params = new URLSearchParams({
  advertiser_id: ADV, report_type: 'BASIC', data_level: 'AUCTION_CAMPAIGN',
  dimensions: JSON.stringify(['campaign_id']),
  metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversion', 'cost_per_conversion', 'complete_payment']),
  start_date: d(7), end_date: d(0), page_size: '100'
});
let summary = '';
try {
  const r = await fetch('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?' + params, { headers: { 'Access-Token': TT }, signal: AbortSignal.timeout(20000) });
  const j = await r.json();
  if (j.code !== 0) { summary = `WARN api-code ${j.code} ${String(j.message).slice(0, 60)}`; }
  else {
    const rows = j.data?.list || []; let spend = 0, clicks = 0, imp = 0, conv = 0, pay = 0;
    for (const it of rows) { const m = it.metrics || {}; spend += +m.spend || 0; clicks += +m.clicks || 0; imp += +m.impressions || 0; conv += +m.conversion || 0; pay += +m.complete_payment || 0; }
    summary = `7T spend=CHF${spend.toFixed(2)} clicks=${clicks} impr=${imp} conv=${conv} kaeufe=${pay} (${rows.length} Kamp.) @ ${new Date().toISOString()}`;
  }
} catch (e) { summary = 'ERR ' + String(e).slice(0, 60); }
console.log('tiktok-stats:', summary);
if (!ID || !SEC || !SHOP) { console.log('tiktok-stats: keine Shopify-Creds -> kein Stamp'); process.exit(0); }
try {
  const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: 'client_credentials' }) })).json()).access_token;
  const api = `https://${SHOP}/admin/api/2024-10/graphql.json`, H = { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' };
  const sid = (await (await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: '{shop{id}}' }) })).json()).data.shop.id;
  const m = 'mutation($mf:[MetafieldsSetInput!]!){metafieldsSet(metafields:$mf){userErrors{message}}}';
  await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: m, variables: { mf: [{ ownerId: sid, namespace: 'luxe', key: 'tiktok_stats', type: 'single_line_text_field', value: summary.slice(0, 250) }] } }) });
  console.log('tiktok-stats: Metafeld luxe.tiktok_stats gestempelt');
} catch (e) { console.log('tiktok-stats Stamp-Fehler:', String(e).slice(0, 60)); }
