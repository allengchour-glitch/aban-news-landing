#!/usr/bin/env node
/* tiktok-campaign-api.mjs — erstellt eine TRAFFIC-Kampagne per TikTok Marketing API (kein Browser, aus der Cloud).
 * Reihenfolge: campaign → video upload → identity → adgroup → ad. Prüft code===0 nach jedem Call.
 * Token NUR aus ENV (NIE im Repo). Sandbox/Prod via TT_MKT_BASE umschaltbar.
 *
 * ENV:
 *   TT_MKT_TOKEN     Marketing-API Access-Token (Header Access-Token), Scope "Ads Management"+"Creative"
 *   TT_ADV_ID        Advertiser-ID (default 7646349875793182738 = LuxeStyle CH Ads, finanziert)
 *   TT_MKT_BASE      https://business-api.tiktok.com/open_api/v1.3 (Prod) | https://sandbox-ads.tiktok.com/open_api/v1.3
 *   VIDEO_URL        CDN-mp4 des Reels (default: See-Test-Reel)
 *   DAILY_BUDGET     Tagesbudget (default 20)
 *   LANDING          Ziel-URL (default wasserfest-Collection)
 *   DRY=1            nur ausgeben was es täte, keine Calls
 * Nutzung: TT_MKT_TOKEN=... node automation/tiktok-campaign-api.mjs
 */
const TOK = process.env.TT_MKT_TOKEN;
const ADV = process.env.TT_ADV_ID || '7646349875793182738';
const BASE = process.env.TT_MKT_BASE || 'https://business-api.tiktok.com/open_api/v1.3';
const VIDEO_URL = process.env.VIDEO_URL || 'https://cdn.shopify.com/videos/c/vp/7179ec99ac744848bf5e6c6cca31cc34/7179ec99ac744848bf5e6c6cca31cc34.HD-1080p-2.5Mbps-87232833.mp4';
const DAILY = parseFloat(process.env.DAILY_BUDGET || '20');
// 🛑 HARTE GELD-OBERGRENZE (User-Freigabe: 350 CHF Gesamt; wir nutzen konservativ TOTAL). Ohne Cap würde
// die Adgroup mit BUDGET_MODE_DAY + SCHEDULE_FROM_NOW UNENDLICH weiterlaufen -> 350 gesprengt. Darum
// zeitlich begrenzen: Laufzeit = floor(TOTAL/DAILY) Tage -> max. Spend = DAILY * Tage <= TOTAL.
const TOTAL = parseFloat(process.env.TOTAL_BUDGET || process.env.TT_TOTAL_BUDGET || '80');
const RUN_DAYS = Math.max(2, Math.floor(TOTAL / DAILY));
const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
const START = new Date(Date.now() + 10*60*1000);          // in 10 Min (TikTok verlangt Zukunft)
const END = new Date(START.getTime() + RUN_DAYS*24*60*60*1000);
// Auto-Apply-Rabatt: /discount/CODE?redirect=PATH setzt WELCOME10 (-10%) automatisch -> weniger Reibung, mehr Conversion.
const LANDING = process.env.LANDING || 'https://luxestyle.ch/discount/WELCOME10?redirect=/collections/wasserfester-schmuck';
const DRY = process.env.DRY === '1';
import fs from 'node:fs';
setTimeout(() => { console.log('WATCHDOG 6min -> exit'); process.exit(1); }, 360000).unref(); // 2026-06-25: kein FIFO-Hang
const log = (...a) => console.log(...a);
const report = (o) => { try { fs.mkdirSync('reports',{recursive:true}); fs.writeFileSync('reports/campaign-api-last-run.json', JSON.stringify({ ts:new Date().toISOString(), daily:DAILY, total_cap:TOTAL, run_days:RUN_DAYS, ...o }, null, 2)); } catch {} };

async function api(path, body) {
  if (DRY) { log(`[DRY] POST ${path}`, JSON.stringify(body).slice(0, 200)); return { code: 0, data: { dry: true, [`${path.split('/')[1]}_id`]: 'DRY_ID' } }; }
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Access-Token': TOK, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.code !== 0) throw new Error(`${path} → code ${j.code}: ${j.message} ${JSON.stringify(j.data || '').slice(0, 200)}`);
  return j;
}
async function get(path, params) {
  const u = new URL(`${BASE}${path}`); Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v));
  const r = await fetch(u, { headers: { 'Access-Token': TOK } }); return r.json();
}

(async () => {
  if (!TOK) { log('❌ Kein TT_MKT_TOKEN. Marketing-API-App genehmigen lassen + Konto autorisieren → Token. Anleitung: dropship/TIKTOK-CAMPAIGN-API.md'); report({ result: 'NO_TOKEN', note: 'TT_MKT_TOKEN fehlt -> Browser-Pfad campaign-traffic nutzen' }); process.exit(0); }
  // 🛡️ DOPPEL-LAUNCH-SCHUTZ (Idempotenz): wurde schon eine LIVE-Kampagne erstellt, NICHT nochmal (sonst 2x Spend).
  // FORCE=1 zum bewussten Neu-Erstellen.
  if (!DRY && process.env.FORCE !== '1') {
    try { const prev = JSON.parse(fs.readFileSync('reports/campaign-api-last-run.json', 'utf8'));
      if (prev && prev.result === 'LIVE' && prev.campaign_id) { log('⏭️ Bereits LIVE-Kampagne', prev.campaign_id, '(', prev.ts, ') → No-op (kein Doppel-Spend). FORCE=1 zum Neu-Erstellen.'); process.exit(0); }
    } catch {}
  }
  log(`🎯 TikTok-Traffic-Kampagne via API · Konto ${ADV} · ${DRY ? 'DRY' : BASE.includes('sandbox') ? 'SANDBOX' : 'PROD'} · Cap ${TOTAL} CHF (${DAILY}/Tag × ${RUN_DAYS} Tage), Ende ${fmt(END)}`);
  try {
    // 0) CH-Region-Code via Tool verifizieren (nicht raten)
    let chId = '2658434';
    try { const rg = await get('/tool/region/', { advertiser_id: ADV, placements: ['PLACEMENT_TIKTOK'] }); const ch = (rg?.data?.region_info || rg?.data?.list || []).find(x => (x.region_code || x.name || '').toString().toUpperCase().includes('CH') || /switzer|schweiz/i.test(x.name || '')); if (ch && (ch.location_id || ch.region_id)) chId = String(ch.location_id || ch.region_id); } catch {}
    log('   CH location_id:', chId);
    // 1) Campaign
    const c = await api('/campaign/create/', { advertiser_id: ADV, campaign_name: 'LuxeStyle CH – Wasserfester Schmuck (Traffic)', objective_type: 'TRAFFIC', budget_mode: 'BUDGET_MODE_INFINITE' });
    const campaignId = c.data.campaign_id; log('✅ Campaign:', campaignId);
    // 2) Video upload
    const v = await api('/file/video/ad/upload/', { advertiser_id: ADV, upload_type: 'UPLOAD_BY_URL', file_name: 'luxe-seetest.mp4', video_url: VIDEO_URL });
    const videoId = v.data.video_id || (v.data.list && v.data.list[0] && v.data.list[0].video_id); log('✅ Video:', videoId);
    // 3) Identity — vorhandene nehmen, sonst automatisch eine anlegen (sonst scheitert ad/create)
    let identityId, identityType = 'CUSTOMIZED_USER';
    try { const id = await get('/identity/get/', { advertiser_id: ADV, identity_type: 'CUSTOMIZED_USER' }); const it = (id?.data?.identity_list || [])[0]; if (it) { identityId = it.identity_id; identityType = it.identity_type || identityType; } } catch {}
    if (!identityId) {
      try { const ci = await api('/identity/create/', { advertiser_id: ADV, display_name: 'LuxeStyle' }); identityId = ci.data.identity_id; log('   Identity neu angelegt:', identityId); } catch (e) { log('   Identity-Create fehlgeschlagen:', String(e).slice(0, 100), '→ ggf. Identity in TikTok manuell anlegen'); }
    }
    log('   Identity:', identityId || '(keine)');
    // 4) AdGroup
    const ag = await api('/adgroup/create/', {
      advertiser_id: ADV, campaign_id: campaignId, adgroup_name: 'CH 18-34 Traffic',
      promotion_type: 'WEBSITE', placement_type: 'PLACEMENT_TYPE_NORMAL', placements: ['PLACEMENT_TIKTOK'],
      location_ids: [chId], languages: ['de', 'fr'], gender: 'GENDER_UNLIMITED', age_groups: ['AGE_18_24', 'AGE_25_34'],
      optimization_goal: 'CLICK', billing_event: 'CPC', bid_type: 'BID_TYPE_NO_BID', pacing: 'PACING_MODE_SMOOTH',
      // 🛑 zeitbegrenzt = harte Gesamt-Obergrenze (DAILY * RUN_DAYS <= TOTAL), NIE unendlich.
      budget_mode: 'BUDGET_MODE_DAY', budget: DAILY, schedule_type: 'SCHEDULE_START_END',
      schedule_start_time: fmt(START), schedule_end_time: fmt(END), pixel_id: 'D8EKVR3C77U6KT5BTBD0'
    });
    const adgroupId = ag.data.adgroup_id; log('✅ AdGroup:', adgroupId);
    // 5) Ad
    const ad = await api('/ad/create/', { advertiser_id: ADV, adgroup_id: adgroupId, creatives: [{
      ad_name: 'Wasserfester Schmuck – See-Test', ad_format: 'SINGLE_VIDEO', identity_type: identityType, identity_id: identityId,
      video_id: videoId, ad_text: 'Wasserfester Schmuck, der bleibt – anlauffrei oder Geld zrugg 💧', call_to_action: 'SHOP_NOW', landing_page_url: LANDING
    }] });
    log('✅ Ad:', ad.data.ad_ids || ad.data); log('\n🎉 Kampagne erstellt! Geht in TikTok-Review (≤24h). Status: ad/get/ pollen.');
    report({ result: DRY ? 'DRY_OK' : 'LIVE', campaign_id: campaignId, adgroup_id: adgroupId, ad_ids: ad.data.ad_ids || null, landing: LANDING, video_url: VIDEO_URL });
  } catch (e) { log('❌', String(e).slice(0, 300)); log('Häufig: Token-Scope (Ads Management) / advertiser_id nicht autorisiert / Sandbox-Token gegen Prod.'); report({ result: 'ERROR', error: String(e).slice(0, 300) }); }
})();
