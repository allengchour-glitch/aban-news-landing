#!/usr/bin/env node
/* LuxeStyle — gelato_discover.mjs
 * Prüft die Gelato-Anbindung und listet Stores / Produkte / (Templates).
 * Nutzt den API-Key aus der Umgebungsvariable GELATO_API_KEY (NIE im Code/Repo).
 *
 * Lauf (in einer Session, in der GELATO_API_KEY als Env-Var gesetzt ist):
 *   node automation/gelato_discover.mjs
 *
 * Danach: die ausgegebene storeId + Template-Infos nutzen, um per
 * gelato_build.mjs Produkte aus Templates zu erstellen (create-from-template).
 */
const KEY = process.env.GELATO_API_KEY || process.env.GELATO_KEY || process.env.GELATO_TOKEN || '';
const BASE = 'https://ecommerce.gelatoapis.com/v1';

if (!KEY) {
  console.error('❌ GELATO_API_KEY ist in dieser Session NICHT gesetzt.');
  console.error('   → In einer NEU gestarteten Session ausführen, in der die Env-Var konfiguriert ist,');
  console.error('     ODER den Key als Env-Var GELATO_API_KEY setzen.');
  process.exit(1);
}

async function gj(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  let body; try { body = await r.json(); } catch { body = await r.text().catch(() => ''); }
  return { ok: r.ok, status: r.status, body };
}

(async () => {
  console.log('🔌 Prüfe Gelato-Verbindung …\n');

  // 1) Stores
  const stores = await gj('/stores');
  if (!stores.ok) {
    console.error(`❌ GET /stores → HTTP ${stores.status}:`, JSON.stringify(stores.body).slice(0, 300));
    if (stores.status === 401) console.error('   → Key ungültig/abgelaufen. In Gelato rotieren.');
    process.exit(1);
  }
  const list = stores.body?.stores || stores.body?.data || (Array.isArray(stores.body) ? stores.body : []);
  console.log(`✅ Verbunden. Stores gefunden: ${list.length}`);
  for (const s of list) {
    console.log(`\n🏬 Store: ${s.name || s.title || '(ohne Name)'}`);
    console.log(`   id: ${s.id || s.storeId}`);
    console.log(`   typ/plattform: ${s.type || s.platform || s.provider || '?'}`);
    const sid = s.id || s.storeId;
    if (!sid) continue;

    // 2) Produkte im Store
    const prods = await gj(`/stores/${sid}/products?limit=10`);
    if (prods.ok) {
      const parr = prods.body?.products || prods.body?.data || (Array.isArray(prods.body) ? prods.body : []);
      console.log(`   📦 Produkte im Store: ${prods.body?.totalCount ?? parr.length}`);
      for (const p of parr.slice(0, 8)) console.log(`      • ${p.title || p.name || p.id}`);
    } else {
      console.log(`   📦 Produkte: GET /products → HTTP ${prods.status}`);
    }

    // 3) Templates (Endpoint je nach API-Version evtl. nicht vorhanden → tolerant)
    const tpl = await gj(`/stores/${sid}/templates`);
    if (tpl.ok) {
      const tarr = tpl.body?.templates || tpl.body?.data || (Array.isArray(tpl.body) ? tpl.body : []);
      console.log(`   🎨 Templates: ${tarr.length}`);
      for (const t of tarr.slice(0, 20)) console.log(`      • ${t.title || t.name || t.id}  (templateId: ${t.id || t.templateId})`);
      if (!tarr.length) console.log('      ⚠️ Keine Templates → im Gelato-Dashboard mind. 1 Produkt-Vorlage anlegen (Leggings/Sport-BH/…).');
    } else {
      console.log(`   🎨 Templates: GET /templates → HTTP ${tpl.status} (Endpoint evtl. nicht verfügbar; Template-ID dann aus dem Dashboard kopieren).`);
    }
  }

  console.log('\n— Nächster Schritt —');
  console.log('  storeId + templateId(s) notieren → daraus baue ich die Activewear/Loungewear-Produkte');
  console.log('  (POST /stores/{storeId}/products:create-from-template). Danach Shopify-Feinschliff.');
})().catch((e) => { console.error('Fehler:', e.message); process.exit(1); });
