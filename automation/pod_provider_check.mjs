#!/usr/bin/env node
/* LuxeStyle — pod_provider_check.mjs
 * Verbindungs-/Key-Test für die POD-Druckanbieter Printify & Gelato.
 * Prüft NUR (legt nichts an): ist der Key gültig, welche Shops/Catalogs sind verbunden.
 * No-op-safe: ohne Key wird der jeweilige Anbieter übersprungen.
 * ENV: PRINTIFY_API_KEY, [PRINTIFY_SHOP_ID], GELATO_API_KEY
 */
const PF = (process.env.PRINTIFY_API_KEY || '').trim();
const GL = (process.env.GELATO_API_KEY || '').trim();

async function jget(url, headers) {
  const r = await fetch(url, { headers });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { j = txt; }
  return { ok: r.ok, status: r.status, j };
}

console.log('=== POD-Anbieter-Check ===');

if (!PF) {
  console.log('PRINTIFY: kein PRINTIFY_API_KEY gesetzt → übersprungen.');
} else {
  console.log(`PRINTIFY: Key gesetzt (Länge ${PF.length}). Teste /shops.json …`);
  const H = { 'Authorization': `Bearer ${PF}`, 'User-Agent': 'LuxeStyle-POD' };
  const s = await jget('https://api.printify.com/v1/shops.json', H);
  if (!s.ok) {
    console.error(`  ❌ Printify-Auth fehlgeschlagen: HTTP ${s.status} ${JSON.stringify(s.j).slice(0,200)}`);
  } else {
    const shops = Array.isArray(s.j) ? s.j : [];
    console.log(`  ✅ Printify-Key gültig. Verbundene Shops: ${shops.length}`);
    for (const sh of shops) console.log(`     • id ${sh.id} | "${sh.title}" | Kanal: ${sh.sales_channel}`);
    const shopify = shops.find(sh => /shopify/i.test(sh.sales_channel||''));
    if (shopify) console.log(`  🟢 Shopify-Shop verbunden → id ${shopify.id} (für Auto-Sync zu Shopify). Setze ggf. PRINTIFY_SHOP_ID=${shopify.id}.`);
    else console.log('  🟡 KEIN Shopify-Shop in Printify verbunden! → In Printify den LuxeStyle-Shopify-Store als Sales Channel verbinden, sonst landen Produkte nicht im Shop.');
    // Blueprint für Die-Cut Magnete (Printify-Katalog) gegenchecken
    const bp = await jget('https://api.printify.com/v1/catalog/blueprints.json', H);
    if (bp.ok && Array.isArray(bp.j)) {
      const mags = bp.j.filter(b => /magnet/i.test(b.title||''));
      const stk  = bp.j.filter(b => /sticker/i.test(b.title||''));
      console.log(`  Katalog: ${bp.j.length} Blueprints. Magnete: ${mags.map(m=>m.id+':'+m.title).join(', ')||'—'}`);
      console.log(`           Sticker: ${stk.slice(0,4).map(m=>m.id+':'+m.title).join(', ')||'—'}`);
    }
  }
}

if (!GL) {
  console.log('GELATO: kein GELATO_API_KEY gesetzt → übersprungen.');
} else {
  console.log(`GELATO: Key gesetzt (Länge ${GL.length}). Teste verbundene Stores + Catalog …`);
  const H = { 'X-API-KEY': GL, 'Content-Type': 'application/json' };
  // 1) verbundene E-Commerce-Stores (zeigt, ob Shopify in Gelato verbunden ist)
  try {
    const st = await jget('https://ecommerce.gelato.com/v1/stores', H);
    if (st.ok) {
      const stores = st.j?.stores || st.j?.data || (Array.isArray(st.j)?st.j:[]);
      console.log(`  ✅ Gelato-Key gültig. Verbundene Stores: ${Array.isArray(stores)?stores.length:'?'}`);
      if (Array.isArray(stores)) for (const s of stores) console.log(`     • ${s.id||s.storeId} | "${s.name||s.title||'?'}" | ${s.type||s.salesChannel||''}`);
      if (Array.isArray(stores) && !stores.length) console.log('  🟡 KEIN Store in Gelato verbunden → Shopify-Store in Gelato verbinden (Dashboard → Stores).');
    } else {
      console.error(`  ⚠️ Gelato /stores: HTTP ${st.status} ${JSON.stringify(st.j).slice(0,160)}`);
    }
  } catch (e) { console.error('  ⚠️ Gelato /stores Fehler:', e.message); }
  // 2) Catalog-Gegencheck (Auth-Beweis), tolerant
  try {
    const c = await jget('https://product.gelato.com/v3/catalogs', H);
    if (c.ok) {
      const cats = c.j?.data || (Array.isArray(c.j)?c.j:[]);
      console.log(`  Gelato-Catalogs erreichbar: ${Array.isArray(cats)?cats.length:'?'}`);
    } else console.error(`  ⚠️ Gelato /catalogs: HTTP ${c.status}`);
  } catch (e) { console.error('  ⚠️ Gelato /catalogs Fehler:', e.message); }
}
console.log('=== Ende ===');
