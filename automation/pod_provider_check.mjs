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
  console.log(`GELATO: Key gesetzt (Länge ${GL.length}). Teste Catalog-API …`);
  const H = { 'X-API-KEY': GL, 'Content-Type': 'application/json' };
  const c = await jget('https://product.gelato.com/v3/catalogs', H);
  if (!c.ok) {
    console.error(`  ❌ Gelato-Auth fehlgeschlagen: HTTP ${c.status} ${JSON.stringify(c.j).slice(0,200)}`);
  } else {
    const cats = c.j?.data || c.j || [];
    console.log(`  ✅ Gelato-Key gültig. Catalogs: ${Array.isArray(cats)?cats.length:'?'}`);
    if (Array.isArray(cats)) for (const ct of cats.slice(0,12)) console.log(`     • ${ct.catalogUid || ct.title || JSON.stringify(ct).slice(0,60)}`);
  }
}
console.log('=== Ende ===');
