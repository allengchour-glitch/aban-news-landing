/* LuxeStyle Autopilot — Stripe-Checkout → Gelato-Druck (der „ohne-Shopify"-Weg)
 * ----------------------------------------------------------------------------
 * Storefront (GitHub Pages / luxestyle.ch) → Kunde gestaltet im POD-Editor → „Kaufen":
 *
 *   1) Browser POSTet an  /stripe/checkout  { sku, printFront, printBack?, quantity, amountChf, name }
 *      → Worker legt eine Stripe-Checkout-Session an (CHF, Versandadresse wird abgefragt),
 *        speichert sku + Druckdatei-URL(s) in der Session-`metadata` → gibt die Bezahl-URL zurück.
 *   2) Kunde bezahlt bei Stripe.
 *   3) Stripe feuert  /webhooks/stripe  (checkout.session.completed) → Worker liest metadata +
 *      Lieferadresse → mappt SKU→Gelato-productUid → legt den Gelato-Druckauftrag an.
 *
 * KEIN Shopify. Webhook lege ICH per Stripe-API selbst an (kein MCP-Block, kein manueller Schritt).
 *
 * NO-OP-SICHER: ohne STRIPE_SECRET_KEY sind beide Endpunkte deaktiviert (503).
 * SICHER: Webhook prüft die Stripe-Signatur (STRIPE_WEBHOOK_SECRET). Idempotent (Event-ID in KV).
 * Reuse: nutzt createGelatoOrder/loadMap/mapEntry aus gelato.js (gleiche Druck-Logik wie der Shopify-Pfad).
 */
import { createGelatoOrder, loadMap, mapEntry } from './gelato.js';

const STRIPE_API = 'https://api.stripe.com/v1';

// --- kleine Helfer ---
function form(obj){ // flaches Objekt → x-www-form-urlencoded (Stripe-Stil)
  const p = new URLSearchParams();
  for(const k in obj){ if(obj[k]!=null) p.append(k, String(obj[k])); }
  return p;
}
function cors(origin){
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
async function stripe(env, path, params){
  const r = await fetch(`${STRIPE_API}${path}`, {
    method:'POST',
    headers:{ 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type':'application/x-www-form-urlencoded' },
    body: params instanceof URLSearchParams ? params : form(params),
  });
  let j; try{ j = await r.json(); }catch{ j = {}; }
  return { ok:r.ok, status:r.status, body:j };
}

// ---------- 1) Checkout-Session anlegen ----------
export async function createCheckout(req, env, log){
  const origin = req.headers.get('Origin') || '';
  if(req.method === 'OPTIONS') return new Response(null, { status:204, headers: cors(origin) });
  if(!env.STRIPE_SECRET_KEY){ return new Response(JSON.stringify({ error:'stripe disabled' }), { status:503, headers:{ 'Content-Type':'application/json', ...cors(origin) } }); }

  let b; try{ b = await req.json(); }catch{ b = {}; }
  const sku = (b.sku||'').toString().slice(0,80);
  const printFront = (b.printFront||'').toString();
  const printBack  = (b.printBack||'').toString();
  const qty = Math.max(1, Math.min(20, parseInt(b.quantity,10) || 1));
  const amountRappen = Math.round((parseFloat(b.amountChf) || 0) * 100);
  const name = (b.name||'Eigenes Design').toString().slice(0,120);
  const site = (env.SITE_URL || 'https://luxestyle.ch').replace(/\/$/,'');

  if(!sku || !/^https?:\/\//.test(printFront) || amountRappen < 100){
    return new Response(JSON.stringify({ error:'invalid input (sku, printFront, amountChf required)' }), { status:400, headers:{ 'Content-Type':'application/json', ...cors(origin) } });
  }

  const params = form({
    mode: 'payment',
    success_url: (b.successUrl || `${site}/pages/danke`) + '?session={CHECKOUT_SESSION_ID}',
    cancel_url: b.cancelUrl || `${site}`,
    'line_items[0][price_data][currency]': 'chf',
    'line_items[0][price_data][product_data][name]': name,
    'line_items[0][price_data][unit_amount]': amountRappen,
    'line_items[0][quantity]': qty,
    'phone_number_collection[enabled]': 'true',
    'shipping_address_collection[allowed_countries][0]': 'CH',
    'shipping_address_collection[allowed_countries][1]': 'LI',
    'shipping_address_collection[allowed_countries][2]': 'DE',
    'shipping_address_collection[allowed_countries][3]': 'AT',
    'shipping_address_collection[allowed_countries][4]': 'FR',
    'shipping_address_collection[allowed_countries][5]': 'IT',
    'metadata[sku]': sku,
    'metadata[printFront]': printFront,
    'metadata[printBack]': printBack,
    'metadata[quantity]': qty,
  });
  const res = await stripe(env, '/checkout/sessions', params);
  if(!res.ok || !res.body.url){
    log.push(`Stripe: ❌ checkout HTTP ${res.status}: ${JSON.stringify(res.body.error||res.body).slice(0,160)}`);
    return new Response(JSON.stringify({ error:'stripe error', detail:res.body.error||null }), { status:502, headers:{ 'Content-Type':'application/json', ...cors(origin) } });
  }
  log.push(`Stripe: ✅ Checkout-Session ${res.body.id} (${(amountRappen/100).toFixed(2)} CHF, ${sku})`);
  return new Response(JSON.stringify({ url: res.body.url, id: res.body.id }), { status:200, headers:{ 'Content-Type':'application/json', ...cors(origin) } });
}

// ---------- Stripe-Signatur prüfen ----------
async function verifyStripeSig(secret, payload, sigHeader){
  if(!secret || !sigHeader) return false;
  try{
    const parts = {}; const v1 = [];
    for(const kv of sigHeader.split(',')){ const i = kv.indexOf('='); const k = kv.slice(0,i), val = kv.slice(i+1);
      if(k==='t') parts.t = val; else if(k==='v1') v1.push(val); }
    if(!parts.t || !v1.length) return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${parts.t}.${payload}`));
    const hex = [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
    let ok = false; for(const s of v1){ if(s.length===hex.length){ let d=0; for(let i=0;i<hex.length;i++) d|=hex.charCodeAt(i)^s.charCodeAt(i); if(d===0) ok=true; } }
    // Replay-Schutz: Zeitstempel max. 5 Min alt
    if(ok && Math.abs(Date.now()/1000 - parseInt(parts.t,10)) > 300) return false;
    return ok;
  }catch{ return false; }
}

// ---------- 2) Stripe-Webhook: bezahlt → Gelato ----------
export async function handleStripeWebhook(req, env, log, bypass){
  const raw = await req.text();
  if(!bypass){
    const sig = req.headers.get('Stripe-Signature') || req.headers.get('stripe-signature');
    if(!await verifyStripeSig(env.STRIPE_WEBHOOK_SECRET, raw, sig)){ log.push('Stripe: ❌ Signatur ungültig → 401'); return new Response('invalid signature', { status:401 }); }
  }
  let evt; try{ evt = JSON.parse(raw); }catch{ return new Response('bad body', { status:200 }); }
  if(evt.type !== 'checkout.session.completed'){ return new Response('ignored', { status:200 }); }

  const eid = String(evt.id||'');
  try{ if(eid && await env.STATE.get(`stripe:${eid}`)){ log.push(`Stripe: Event ${eid} schon verarbeitet → skip.`); return new Response('dup', { status:200 }); } }catch{}

  if(!env.GELATO_API_KEY){ log.push('Stripe: kein GELATO_API_KEY → nichts gedruckt.'); return new Response('no gelato', { status:200 }); }

  const s = evt.data && evt.data.object || {};
  const md = s.metadata || {};
  const sku = md.sku;
  const front = md.printFront, back = md.printBack;
  if(!sku || !front){ log.push('Stripe: Session ohne sku/printFront → kein Druck.'); return new Response('nothing to print', { status:200 }); }

  const map = await loadMap(env);
  const entry = mapEntry(map, { sku });
  if(!entry || !entry.productUid){ log.push(`Stripe: SKU ${sku} hat kein Gelato-Mapping → übersprungen.`); return new Response('unmapped', { status:200 }); }

  const ft = entry.files || {};
  const files = [{ type: ft.front || 'default', url: front }];
  if(back && /^https?:\/\//.test(back)) files.push({ type: ft.back || 'back', url: back });

  const ship = (s.shipping_details && s.shipping_details.address) || (s.customer_details && s.customer_details.address) || {};
  const nm = ((s.shipping_details && s.shipping_details.name) || (s.customer_details && s.customer_details.name) || 'Kunde LuxeStyle').split(' ');
  const payload = {
    orderType: env.GELATO_DRAFT === '1' ? 'draft' : 'order',
    orderReferenceId: `stripe-${s.id}`,
    customerReferenceId: (s.customer_details && s.customer_details.email) || s.customer || 'guest',
    currency: (s.currency || 'chf').toUpperCase(),
    items: [{ itemReferenceId: s.id, productUid: entry.productUid, quantity: parseInt(md.quantity,10) || 1, files }],
    shippingAddress: {
      firstName: nm[0] || 'Kunde', lastName: nm.slice(1).join(' ') || 'LuxeStyle',
      addressLine1: ship.line1 || '', addressLine2: ship.line2 || '',
      city: ship.city || '', state: ship.state || '', postCode: ship.postal_code || '',
      country: (ship.country || 'CH').toUpperCase(),
      email: (s.customer_details && s.customer_details.email) || '', phone: (s.customer_details && s.customer_details.phone) || '',
    },
  };

  const res = await createGelatoOrder(env, payload);
  if(res.ok){
    const gid = (res.body && (res.body.id || res.body.orderId)) || '?';
    try{ await env.STATE.put(`stripe:${eid}`, JSON.stringify({ gelatoId:gid, at:new Date().toISOString() })); }catch{}
    log.push(`Stripe: ✅ ${s.id} bezahlt → Gelato-Auftrag ${gid} (${payload.orderType}).`);
    return new Response(JSON.stringify({ ok:true, gelatoId:gid }), { status:200, headers:{ 'Content-Type':'application/json' } });
  }
  log.push(`Stripe: ❌ Gelato HTTP ${res.status}: ${JSON.stringify(res.body).slice(0,200)}`);
  return new Response(JSON.stringify({ ok:false }), { status:200, headers:{ 'Content-Type':'application/json' } });
}
