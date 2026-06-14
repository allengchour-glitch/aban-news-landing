/* LuxeStyle Autopilot — Gelato-Fulfillment-Connector
 * ---------------------------------------------------
 * Schliesst die Lücke „eigenes Design → wird wirklich gedruckt":
 *
 *   Shopify-Bestellung (orders/create-Webhook)
 *     → dieser Worker liest pro Position die Druckdatei-URL aus den Bestell-Eigenschaften
 *       (der „Selbst gestalten"-Editor hängt sie als  properties['🖼️ Druckdatei']  an,
 *        bei Rückseite als  'Hinten · 🖼️ Druckdatei')
 *     → mappt die Shopify-SKU auf die Gelato-productUid (Map in KV: 'gelato_map')
 *     → legt per Gelato-Order-API einen echten Druckauftrag an.
 *
 * NO-OP-SICHER:
 *   • fehlt GELATO_API_KEY                → übersprungen (Bestellung läuft normal weiter)
 *   • Position ohne Druckdatei            → übersprungen (normales Lagerprodukt)
 *   • Position ohne SKU-Mapping           → übersprungen + Hinweis ins Log (Map ergänzen)
 *   • keine druckbare Position            → 200, KEIN Gelato-Call
 *
 * SICHERHEIT:
 *   • Verifiziert die Shopify-Webhook-HMAC (Secret SHOPIFY_WEBHOOK_SECRET).
 *   • Idempotent: jede Order-ID wird nur einmal an Gelato gesendet (KV-Marker 'gelato:<id>').
 *
 * MAPPING (KV-Key 'gelato_map', JSON) — Beispiel:
 *   {
 *     "EDELWEISS-HOODIE-M": { "productUid": "apparel_product_gca_hoodie_..._m",
 *                              "files": { "front": "default", "back": "back" } },
 *     "MATTERHORN-SWEAT-L": { "productUid": "apparel_product_gca_sweatshirt_..._l" }
 *   }
 *   Fallback-Key, falls keine SKU passt: variant_id, dann product_id (als String).
 *   `files` ist optional (Default front→"default", back→"back").
 */

const GELATO_ORDER_BASE = 'https://order.gelatoapis.com/v4';

// ---------- HMAC-Verifikation (Shopify) ----------
async function verifyHmac(secret, rawBody, hmacHeader){
  if(!secret || !hmacHeader) return false;
  try{
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
      { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
    const digest = btoa(String.fromCharCode.apply(null, new Uint8Array(sig)));
    // längen-/wertgleich (kein Frühausstieg-Leak nötig: Strings gleich lang bei korrekter Konfig)
    if(digest.length !== hmacHeader.length) return false;
    let diff = 0; for(let i=0;i<digest.length;i++) diff |= digest.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
    return diff === 0;
  }catch{ return false; }
}

// ---------- Mapping laden (KV bevorzugt, sonst env.GELATO_MAP) ----------
async function loadMap(env){
  let raw = '';
  try{ raw = (await env.STATE.get('gelato_map')) || ''; }catch{}
  if(!raw && env.GELATO_MAP) raw = env.GELATO_MAP;
  if(!raw) return {};
  try{ return JSON.parse(raw) || {}; }catch{ return {}; }
}
function mapEntry(map, item){
  return map[item.sku] || map[String(item.variant_id)] || map[String(item.product_id)] || null;
}

// ---------- Druckdateien aus den Positions-Eigenschaften ziehen ----------
function printFilesFromProps(props){
  const out = [];
  const entries = Array.isArray(props)
    ? props.map(p => [p && p.name, p && p.value])
    : Object.entries(props || {});
  for(const [k, v] of entries){
    if(typeof k !== 'string' || typeof v !== 'string') continue;
    if(!/^https?:\/\//i.test(v)) continue;
    if(!/Druckdatei|Print\s*file/i.test(k)) continue;
    const side = /hinten|back/i.test(k) ? 'back' : 'front';
    out.push({ side, url: v });
  }
  // Vorne zuerst, Duplikate (gleiche URL) raus
  const seen = new Set();
  return out.filter(f => (seen.has(f.url) ? false : (seen.add(f.url), true)))
            .sort((a,b) => (a.side==='front'?0:1) - (b.side==='front'?0:1));
}

// ---------- Shopify-Lieferadresse → Gelato-Adresse ----------
function shipAddr(order){
  const a = order.shipping_address || order.billing_address || {};
  return {
    firstName: a.first_name || (order.customer && order.customer.first_name) || 'Kunde',
    lastName:  a.last_name  || (order.customer && order.customer.last_name)  || 'LuxeStyle',
    addressLine1: a.address1 || '',
    addressLine2: a.address2 || '',
    state: a.province_code || a.province || '',
    city: a.city || '',
    postCode: a.zip || '',
    country: (a.country_code || 'CH').toUpperCase(),
    email: order.email || order.contact_email || (order.customer && order.customer.email) || '',
    phone: a.phone || order.phone || '',
  };
}

// ---------- Gelato-Bestellung anlegen ----------
async function createGelatoOrder(env, payload){
  const r = await fetch(`${GELATO_ORDER_BASE}/orders`, {
    method:'POST',
    headers:{ 'X-API-KEY': env.GELATO_API_KEY, 'Content-Type':'application/json' },
    body: JSON.stringify(payload),
  });
  let j; try{ j = await r.json(); }catch{ j = await r.text().catch(()=> ''); }
  return { ok:r.ok, status:r.status, body:j };
}

/* Haupteinstieg: orders/create-Webhook.
 * Gibt IMMER 200 zurück (ausser HMAC ungültig → 401), damit Shopify nicht endlos retryt.
 * `bypassHmac` nur für manuellen Test über /run mit RUN_KEY. */
export async function handleOrderWebhook(req, env, log, bypassHmac){
  const raw = await req.text();
  if(!bypassHmac){
    const hmac = req.headers.get('X-Shopify-Hmac-Sha256') || req.headers.get('x-shopify-hmac-sha256');
    const ok = await verifyHmac(env.SHOPIFY_WEBHOOK_SECRET, raw, hmac);
    if(!ok){ log.push('Gelato: ❌ HMAC ungültig → 401'); return new Response('invalid hmac', { status:401 }); }
  }
  let order; try{ order = JSON.parse(raw); }catch{ log.push('Gelato: ⚠️ Body kein JSON'); return new Response('bad body', { status:200 }); }

  if(!env.GELATO_API_KEY){ log.push('Gelato: kein GELATO_API_KEY → übersprungen.'); return new Response('no gelato key', { status:200 }); }

  const orderId = String(order.id || order.order_number || order.name || '');
  if(!orderId){ log.push('Gelato: ⚠️ keine Order-ID'); return new Response('no id', { status:200 }); }

  // Idempotenz
  try{ if(await env.STATE.get(`gelato:${orderId}`)){ log.push(`Gelato: Order ${orderId} bereits verarbeitet → skip.`); return new Response('dup', { status:200 }); } }catch{}

  const map = await loadMap(env);
  const items = [];
  const warnings = [];
  for(const li of (order.line_items || [])){
    const files = printFilesFromProps(li.properties);
    if(!files.length) continue;                       // kein Eigendesign → normales Produkt
    const entry = mapEntry(map, li);
    if(!entry || !entry.productUid){
      warnings.push(`SKU ${li.sku || li.variant_id || '?'} ("${(li.title||'').slice(0,40)}") hat Druckdatei, aber kein Gelato-Mapping`);
      continue;
    }
    const ftype = entry.files || {};
    items.push({
      itemReferenceId: String(li.id || `${orderId}-${items.length}`),
      productUid: entry.productUid,
      quantity: li.quantity || 1,
      files: files.map(f => ({ type: ftype[f.side] || (f.side === 'back' ? 'back' : 'default'), url: f.url })),
    });
  }

  if(warnings.length) log.push('Gelato: ⚠️ ' + warnings.join(' | '));
  if(!items.length){ log.push(`Gelato: Order ${orderId} hat keine druckbaren+gemappten Positionen → kein Gelato-Auftrag.`); return new Response('nothing to print', { status:200 }); }

  const payload = {
    orderType: env.GELATO_DRAFT === '1' ? 'draft' : 'order',
    orderReferenceId: orderId,
    customerReferenceId: String((order.customer && order.customer.id) || order.email || 'guest'),
    currency: order.currency || 'CHF',
    items,
    shippingAddress: shipAddr(order),
  };
  if(env.GELATO_SHIPMENT_METHOD) payload.shipmentMethodUid = env.GELATO_SHIPMENT_METHOD;

  const res = await createGelatoOrder(env, payload);
  if(res.ok){
    const gid = (res.body && (res.body.id || res.body.orderId)) || '?';
    try{ await env.STATE.put(`gelato:${orderId}`, JSON.stringify({ gelatoId:gid, at:new Date().toISOString(), items:items.length })); }catch{}
    log.push(`Gelato: ✅ Order ${orderId} → Gelato-Auftrag ${gid} (${items.length} Pos., ${payload.orderType}).`);
    return new Response(JSON.stringify({ ok:true, gelatoId:gid }), { status:200, headers:{ 'Content-Type':'application/json' } });
  }
  log.push(`Gelato: ❌ Order ${orderId} → Gelato HTTP ${res.status}: ${JSON.stringify(res.body).slice(0,240)}`);
  // 200 zurück, damit Shopify nicht retryt; Fehler steht im Worker-Log (manuell nachfassbar).
  return new Response(JSON.stringify({ ok:false, status:res.status }), { status:200, headers:{ 'Content-Type':'application/json' } });
}
