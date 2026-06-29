#!/usr/bin/env node
/* ad_edit.mjs — TikTok-Ads BEARBEITEN via Marketing API v1.3 (erstellen macht tiktok-campaign-api.mjs).
 * Macht die Kill/Scale-Engine (ad_manager.mjs) HANDLUNGSFAEHIG: pausieren (STOP) + Budget verdoppeln (SCALE).
 * Gelernt 2026-06-28: 5-Ebenen (BC->Advertiser->Campaign->AdGroup->Ad). Header 'Access-Token'. Base business-api.
 *
 * Befehle:
 *   node automation/ad_edit.mjs list                         # Campaigns+AdGroups+Status+Budget auflisten
 *   node automation/ad_edit.mjs pause   <adgroup_id>         # AdGroup DISABLE (STOP)
 *   node automation/ad_edit.mjs enable  <adgroup_id>         # AdGroup ENABLE
 *   node automation/ad_edit.mjs budget  <adgroup_id> <chf>   # Tagesbudget setzen (SCALE) — HARTE Obergrenze TT_MAX_DAILY
 *
 * ENV: TT_MKT_TOKEN (Marketing-API-Token, Header Access-Token, NIE im Repo) · TT_ADV_ID (default LuxeStyle CH Ads).
 *      TT_MAX_DAILY (default 60) = Budget-Sicherheitsdeckel (NIE eigenmaechtig drueber, User-Freigabe 350 gesamt).
 * No-op-sicher: ohne TT_MKT_TOKEN -> sauberer Hinweis, keine Calls.
 */
const TOK = process.env.TT_MKT_TOKEN;
const ADV = process.env.TT_ADV_ID || '7646349875793182738';
const BASE = process.env.TT_MKT_BASE || 'https://business-api.tiktok.com/open_api/v1.3';
const MAX_DAILY = parseFloat(process.env.TT_MAX_DAILY || '60');
const [cmd, arg1, arg2] = process.argv.slice(2);
const log = (...a) => console.log('ad_edit:', ...a);
if (!TOK) { log('kein TT_MKT_TOKEN -> Marketing-API nicht aktiv. (Token besorgen, dann pausieren/skalieren autonom.)'); process.exit(0); }

async function api(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Access-Token': TOK, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json(); if (j.code !== 0) throw new Error(`${path} code ${j.code}: ${j.message}`); return j;
}
async function get(path, params) {
  const u = new URL(`${BASE}${path}`); Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v));
  const r = await fetch(u, { headers: { 'Access-Token': TOK } }); const j = await r.json();
  if (j.code !== 0) throw new Error(`${path} code ${j.code}: ${j.message}`); return j.data;
}

try {
  if (cmd === 'list' || !cmd) {
    const c = await get('/campaign/get/', { advertiser_id: ADV, fields: ['campaign_id', 'campaign_name', 'operation_status', 'budget'], page_size: 50 });
    const a = await get('/adgroup/get/', { advertiser_id: ADV, fields: ['adgroup_id', 'adgroup_name', 'operation_status', 'budget', 'budget_mode'], page_size: 100 });
    log('Kampagnen:'); (c.list || []).forEach(x => console.log('  ', x.campaign_id, x.operation_status, 'CHF' + (x.budget ?? '-'), x.campaign_name));
    log('AdGroups:'); (a.list || []).forEach(x => console.log('  ', x.adgroup_id, x.operation_status, x.budget_mode, 'CHF' + (x.budget ?? '-'), x.adgroup_name));
  } else if (cmd === 'pause' && arg1) {
    await api('/adgroup/status/update/', { advertiser_id: ADV, adgroup_ids: [arg1], operation_status: 'DISABLE' });
    log(`✅ AdGroup ${arg1} PAUSIERT (STOP).`);
  } else if (cmd === 'enable' && arg1) {
    await api('/adgroup/status/update/', { advertiser_id: ADV, adgroup_ids: [arg1], operation_status: 'ENABLE' });
    log(`✅ AdGroup ${arg1} AKTIVIERT.`);
  } else if (cmd === 'budget' && arg1 && arg2) {
    const want = parseFloat(arg2);
    if (want > MAX_DAILY) { log(`⛔ ${want} > Sicherheitsdeckel ${MAX_DAILY} CHF/Tag -> abgelehnt (keine eigenmaechtige Budget-Erhoehung).`); process.exit(1); }
    await api('/adgroup/update/', { advertiser_id: ADV, adgroup_id: arg1, budget: want, budget_mode: 'BUDGET_MODE_DAY' });
    log(`✅ AdGroup ${arg1} Tagesbudget -> CHF ${want}.`);
  } else {
    log('Befehle: list | pause <adgroup_id> | enable <adgroup_id> | budget <adgroup_id> <chf>');
  }
} catch (e) { log('Fehler:', String(e).slice(0, 150)); process.exit(1); }
