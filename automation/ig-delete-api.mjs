#!/usr/bin/env node
/* ig-delete-api.mjs — löscht Instagram-Dubletten per Graph-API (DELETE /<media_id>), vollautonom, KEIN Browser.
 * Recherche 2026: IG Graph API KANN veröffentlichte Posts/Reels löschen mit Scope instagram_manage_contents
 * (Facebook-Login-Flow, Business-Konto + verknüpfte FB-Seite). Token NUR aus ENV META_DELETE_TOKEN (NIE im Repo).
 *
 * Findet Dubletten anhand gleicher Caption-Signatur (erste ~60 Zeichen normalisiert) und löscht die ÄLTEREN,
 * behält das neueste je Gruppe. Default DRY (nur zeigen). --go zum echten Löschen. Cap + Pausen (Action-Block-Schutz).
 *
 * ENV: META_DELETE_TOKEN (Pflicht) · IG_USER_ID (optional, sonst via /me/accounts ermittelt)
 * Nutzung:  node automation/ig-delete-api.mjs            (DRY: listet Dubletten, löscht NICHTS)
 *           node automation/ig-delete-api.mjs --go       (löscht die Dubletten, behält je 1)
 *           node automation/ig-delete-api.mjs --go --n 2 (max 2 löschen)
 */
const TOK = process.env.META_DELETE_TOKEN;
const GO = process.argv.includes('--go');
const N = (() => { const i = process.argv.indexOf('--n'); return i > -1 ? parseInt(process.argv[i + 1] || '99', 10) : 99; })();
const V = 'v21.0';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sig = c => (c || '').toLowerCase().replace(/https?:\/\/\S+/g, '').replace(/[#@]\S+/g, '').replace(/[^a-z0-9äöü ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
const g = async (path, params = {}) => {
  const u = new URL(`https://graph.facebook.com/${V}/${path}`);
  Object.entries({ access_token: TOK, ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
  return (await fetch(u, { method: params._method || 'GET' })).json();
};

(async () => {
  if (!TOK) { console.log('❌ Kein META_DELETE_TOKEN in ENV. Token mit Scope instagram_manage_contents (FB-Login-Flow) setzen.'); process.exit(0); }
  // IG-Business-Account-ID ermitteln (über die verknüpfte FB-Seite), falls nicht via ENV gegeben.
  let igId = process.env.IG_USER_ID;
  if (!igId) {
    const acc = await g('me/accounts', { fields: 'instagram_business_account,name' });
    if (acc.error) { console.log('❌ Token-Fehler:', acc.error.message, '(Scope/Flow prüfen: braucht pages_show_list + instagram_manage_contents, FB-Login)'); process.exit(0); }
    const page = (acc.data || []).find(p => p.instagram_business_account);
    if (!page) { console.log('❌ Keine FB-Seite mit verknüpftem IG-Business-Account gefunden. IG muss Business + mit FB-Seite verbunden sein.'); process.exit(0); }
    igId = page.instagram_business_account.id;
    console.log(`✅ IG-Account via Seite "${page.name}": ${igId}`);
  }
  // Letzte 50 Medien holen
  const media = await g(`${igId}/media`, { fields: 'id,caption,media_type,timestamp,permalink', limit: '50' });
  if (media.error) { console.log('❌ Medien-Fehler:', media.error.message); process.exit(0); }
  const items = media.data || [];
  console.log(`📋 ${items.length} Medien geladen.`);
  // Gruppieren nach Caption-Signatur; Gruppen mit >1 = Dubletten
  const groups = {};
  for (const m of items) { const s = sig(m.caption); if (!s) continue; (groups[s] = groups[s] || []).push(m); }
  const dupGroups = Object.entries(groups).filter(([, arr]) => arr.length > 1);
  if (!dupGroups.length) { console.log('✅ Keine Caption-Dubletten gefunden.'); process.exit(0); }
  // Je Gruppe: neueste behalten, ältere zum Löschen
  const toDelete = [];
  for (const [s, arr] of dupGroups) {
    arr.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // neueste zuerst
    const drop = arr.slice(1); // alle ausser dem neuesten
    console.log(`🔁 Dublette "${s}": ${arr.length}x → ${drop.length} löschen, 1 behalten`);
    toDelete.push(...drop);
  }
  const targets = toDelete.slice(0, N);
  if (!GO) { console.log(`\n[DRY] ${targets.length} würden gelöscht:`); targets.forEach(m => console.log('  -', m.id, m.permalink)); console.log('\n--go zum echten Löschen.'); process.exit(0); }
  let done = 0;
  for (const m of targets) {
    const r = await g(m.id, { _method: 'DELETE' });
    if (r.success) { done++; console.log('✅ gelöscht:', m.id); } else console.log('⚠️', m.id, JSON.stringify(r.error || r).slice(0, 120));
    await sleep(20000 + Math.random() * 20000); // 20-40s Pause (Action-Block-Schutz)
  }
  console.log(`\nFertig: ${done}/${targets.length} gelöscht.`);
})();
