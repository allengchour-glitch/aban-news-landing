#!/usr/bin/env node
/* ad_manager.mjs — KILL/SCALE-Entscheidung fuer TikTok-Ads nach der Simo-Formel ($1.1M-Lehre 2026-06-26).
 * Liest die echten Zahlen (Metafeld luxe.tiktok_stats, vom VPS-Bridge-Reader gestempelt) + die Verkaeufe
 * (Shopify-Orders im Zeitraum) und gibt eine klare Empfehlung: STOP / KEEP / SCALE. Stempelt sie nach
 * luxe.ad_decision -> jede Session sieht, was mit der Kampagne zu tun ist. Entscheidung statt Bauchgefuehl.
 *
 * SIMO-FORMEL (CHF, Start 30/Tag, 1 Adset):
 *   bei 10 Spend: CPC>1 UND 0 ATC            -> STOP
 *   bei 20 Spend: 0 ATC                       -> STOP
 *   bei 30 Spend: 0 Verkauf                   -> STOP ; >=1 Verkauf -> Tag2 bis 60 Spend
 *   bei 60 Spend: <2 Verkaeufe                -> STOP ; >=2 -> KEEP + Profit tracken
 *   Netto-Profit > 20%                        -> SCALE (Budget verdoppeln)
 *
 * No-op-sicher. ENV: SHOPIFY_CLIENT_ID/SECRET/SHOP. Optional Override: ADS_SPEND, ADS_CLICKS, ADS_ATC, ADS_SALES,
 *   AVG_MARGIN (Default 0.5). Lauf: node automation/ad_manager.mjs
 */
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const MARGIN = parseFloat(process.env.AVG_MARGIN || '0.5'); // Netto-Marge-Annahme (50%) fuer Profit-Check
const log = (...a) => console.log('ad_manager:', ...a);

async function token() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(tok, query) {
  const r = await fetch(`https://${SHOP}/admin/api/2024-10/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  return (await r.json()).data;
}

// tiktok_stats-String parsen: "7T impr=0 clicks=0 spend=CHF0.00 status=delivering @ ..."
function parseStats(s) {
  if (!s) return {};
  const g = (re) => { const m = s.match(re); return m ? parseFloat(m[1]) : null; };
  return { impr: g(/impr=([\d.]+)/), clicks: g(/clicks=([\d.]+)/), spend: g(/spend=CHF([\d.]+)/), status: (s.match(/status=(\w+)/) || [])[1] };
}

function decide({ spend, cpc, atc, sales, profitPct }) {
  // Reihenfolge wichtig: erst Scale (Gewinner), dann die Kill-Gates aufsteigend nach Spend.
  if (sales >= 2 && profitPct != null && profitPct > 20) return ['SCALE', `>=2 Verkaeufe & Netto-Profit ${profitPct.toFixed(0)}% (>20%) -> Budget verdoppeln.`];
  if (spend >= 60 && sales < 2) return ['STOP', `60 CHF Spend, nur ${sales} Verkauf/e (<2) -> stoppen.`];
  if (spend >= 60 && sales >= 2) return ['KEEP', `${sales} Verkaeufe bei 60 Spend -> laufen lassen + Profit tracken.`];
  if (spend >= 30 && sales < 1) return ['STOP', `30 CHF Spend, 0 Verkauf -> stoppen.`];
  if (spend >= 30 && sales >= 1) return ['KEEP', `1+ Verkauf bei 30 Spend -> Tag 2 bis 60 Spend weiterlaufen.`];
  if (spend >= 20 && (atc === 0)) return ['STOP', `20 CHF Spend, 0 Add-to-Cart -> stoppen.`];
  if (spend >= 10 && cpc != null && cpc > 1 && (atc === 0)) return ['STOP', `10 CHF Spend, CPC ${cpc.toFixed(2)}>1 & 0 ATC -> stoppen.`];
  return ['KEEP', `Spend ${spend} CHF — noch unter der naechsten Pruef-Schwelle, weiterlaufen lassen.`];
}

(async () => {
  if (!ID || !SEC) { log('keine Shopify-Creds -> nur Formel-Demo.'); }
  let stats = {}, sales = null;
  let tok;
  if (ID && SEC) {
    try {
      tok = await token();
      const d = await gql(tok, `{ shop { metafield(namespace:"luxe", key:"tiktok_stats"){value} } orders(first:1, query:"created_at:>${new Date(Date.now()-2*864e5).toISOString().slice(0,10)} AND financial_status:paid"){ edges{node{id}} } }`);
      stats = parseStats(d?.shop?.metafield?.value);
      // Echte bezahlte Orders der letzten 2 Tage zaehlen (Naeherung fuer "Sales aus der Kampagne").
      const cnt = await gql(tok, `{ ordersCount(query:"created_at:>${new Date(Date.now()-2*864e5).toISOString().slice(0,10)} AND financial_status:paid"){count} }`).catch(()=>null);
      sales = cnt?.ordersCount?.count ?? (d?.orders?.edges?.length || 0);
    } catch (e) { log('Lese-Fehler:', String(e).slice(0,80)); }
  }
  // Overrides (zum Testen / wenn ATC nur in TikTok sichtbar ist)
  const spend = process.env.ADS_SPEND != null ? +process.env.ADS_SPEND : (stats.spend ?? 0);
  const clicks = process.env.ADS_CLICKS != null ? +process.env.ADS_CLICKS : (stats.clicks ?? 0);
  const atc = process.env.ADS_ATC != null ? +process.env.ADS_ATC : null; // ATC nur in TikTok Ads sichtbar -> ggf. via Reader
  sales = process.env.ADS_SALES != null ? +process.env.ADS_SALES : (sales ?? 0);
  const cpc = clicks > 0 ? spend / clicks : null;
  // Profit% grob: (Verkaeufe * AOV * Marge - Spend) / Spend. AOV-Naeherung 50 CHF wenn unbekannt.
  const aov = parseFloat(process.env.AOV || '50');
  const profitPct = spend > 0 ? ((sales * aov * MARGIN - spend) / spend) * 100 : null;

  const [action, why] = decide({ spend, cpc, atc, sales, profitPct });
  const summary = `${action} | spend=CHF${spend} cpc=${cpc!=null?cpc.toFixed(2):'-'} atc=${atc??'?'} sales=${sales} profit=${profitPct!=null?profitPct.toFixed(0)+'%':'-'} | ${why}`;
  console.log('\n📊 AD-ENTSCHEIDUNG:', summary);
  if (atc == null) console.log('ℹ️ ATC (Add-to-Cart) ist nur in TikTok Ads sichtbar — via VPS-Reader nachliefern (ADS_ATC=) fuer exakte 10/20-Gates.');

  if (tok) {
    try {
      const sid = (await gql(tok, '{shop{id}}')).shop.id;
      const m = `mutation{metafieldsSet(metafields:[{ownerId:"${sid}",namespace:"luxe",key:"ad_decision",type:"single_line_text_field",value:${JSON.stringify((summary+' @ '+new Date().toISOString()).slice(0,250))}}]){userErrors{message}}}`;
      await gql(tok, m);
      log('Metafeld luxe.ad_decision gestempelt.');
    } catch (e) { log('Stamp-Fehler:', String(e).slice(0,60)); }
  }
})();
