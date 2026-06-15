/* LuxeStyle Autopilot — Cloudflare Worker
 * ----------------------------------------
 * Läuft UNABHÄNGIG von GitHub Actions (die zeitweise gesperrt sind). Cron Triggers übernehmen:
 *
 *   1) ENHANCE  (1×/Tag) — nimmt das nächste kuratierte Produktfoto, lässt Gemini 2.5 Flash Image
 *      eine edle, PRODUKT-TREUE Editorial-Szene rendern, legt das JPG in R2 ab und stellt einen
 *      fertigen Post (mit Produktlink-Caption) in die KV-Queue.
 *   2) POST     (2×/Tag) — postet den nächsten fälligen Queue-Eintrag direkt per Meta-Graph-API an
 *      Instagram + Facebook-Seite + (optional) Threads. JPG-URL = dieser Worker selbst (R2-Serve).
 *
 * Das veredelte Bild liegt öffentlich unter  {PUBLIC_BASE}/enhanced/<name>.jpg  und wird vom
 * Worker direkt aus R2 ausgeliefert — Meta braucht eine öffentliche JPG-URL, die ist damit gegeben.
 *
 * Bindings (wrangler.toml):  R2 = BUCKET   ·   KV = STATE
 * Secrets (wrangler secret put …):  GEMINI_API_KEY · IG_USER_ID · IG_ACCESS_TOKEN ·
 *        FB_PAGE_ID · FB_PAGE_ACCESS_TOKEN · THREADS_ACCESS_TOKEN (optional) · RUN_KEY
 * Vars (wrangler.toml [vars]):  PUBLIC_BASE · SITE_URL · GEMINI_IMAGE_MODEL · META_GRAPH_VERSION ·
 *        ENHANCE_BATCH · SKIP_THREADS
 *
 * No-op-sicher: fehlt der Gemini-Key → Enhance überspringt; fehlen Meta-Creds → Post überspringt.
 */
import { PRODUCTS } from './products.js';
import { runReel, postVideoAll } from './video.js';
import { handleOrderWebhook } from './gelato.js';
import { createCheckout, handleStripeWebhook } from './stripe.js';

const CAPTIONS = [
  '{label} ✨ Premium-Look zum fairen Preis. Code WELCOME10 = -10% · 🔗 {url}',
  'Neu entdeckt: {label} 🤍 Schweizer Shop · Gratis-Versand ab CHF 65 · 🔗 {url}',
  'Dein Sommer-Liebling? {label} 🌿 -10% mit WELCOME10 · 30 Tage Rückgabe · 🔗 {url}',
  '{label} — premium & bezahlbar. Jetzt mit Code WELCOME10 · 🔗 {url}',
  'Editorial-Look: {label} 👀 Designer-Vibe, fairer Preis · 🔗 {url}',
];
const REACH = '#schweiz #foryou #luxestyle';
function pickTags(s){
  s = (s||'').toLowerCase();
  if(/herren|männer|menswear|\bmen\b/.test(s)) return REACH+' #herrenmode #menstyle';
  if(/sneaker|slides|sandal|schuh|stiefel|boot|loafer/.test(s)) return REACH+' #sneaker #shoes';
  if(/kette|ohrring|armreif|armband|\bring\b|schmuck|halskette|anhänger|moissanite|zirkonia/.test(s)) return REACH+' #schmuck #jewelry';
  if(/serum|gua-?sha|creme|roller|beauty|pflege|skincare|maske/.test(s)) return REACH+' #skincare #selfcare';
  if(/ständer|stander|halter|gadget|tech|lampe|deko|vase|kerze|organizer|smartwatch|uhr|watch|\bhome\b/.test(s)) return REACH+' #gadget #lifestyle';
  if(/tasche|wallet|geldbörse|portemonnaie|\bbag\b|handtasche|crossbody|clutch|rucksack/.test(s)) return REACH+' #accessoires #must';
  if(/kleid|\brock\b|dress|skirt|bluse/.test(s)) return REACH+' #sommerkleid #damenmode';
  if(/blazer|cardigan|hemd|shirt|jacke|mantel|\btop\b|weste|strick|\bset\b|mode/.test(s)) return REACH+' #fashionschweiz #ootdschweiz';
  return REACH+' #neu #ootdschweiz';
}

const PROMPT = `Premium editorial fashion photograph for a Swiss boutique. Use the provided product image as the EXACT reference: keep the product 100% identical — same garment/accessory, same colours, same pattern, same cut and details. Do NOT redesign or alter the product in any way. Improve ONLY the lighting, background and mood: soft natural daylight, elegant minimal premium setting (clean studio or tasteful lifestyle scene), gentle shadows, shallow depth of field, refined luxury-boutique aesthetic, true-to-life colours. COMPOSITION: show the full product/model a little SMALLER in the frame with elegant breathing room and comfortable negative space around it — NOT a tight close-up crop, slightly zoomed out, the subject well-centred. No text, no logos, no watermarks, no extra props that hide the product. Vertical 4:5, high quality.`;

// ---------- base64 helpers (Worker hat kein Buffer) ----------
function bytesToB64(bytes){
  let bin = ''; const CH = 0x8000;
  for(let i=0;i<bytes.length;i+=CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i+CH));
  return btoa(bin);
}
function b64ToBytes(b64){
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- Gemini ----------
async function geminiEnhance(env, imageUrl){
  const model = env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const gbase = env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  const src = await fetch(imageUrl);
  if(!src.ok) throw new Error(`Quellbild HTTP ${src.status}`);
  const mime = (src.headers.get('content-type')||'').split(';')[0] || (imageUrl.endsWith('.webp')?'image/webp':'image/jpeg');
  const b64 = bytesToB64(new Uint8Array(await src.arrayBuffer()));
  const body = { contents:[{ role:'user', parts:[ { text: PROMPT }, { inline_data:{ mime_type: mime, data: b64 } } ] }],
                 generationConfig:{ responseModalities:['IMAGE'], temperature:0.5 } };
  const r = await fetch(`${gbase}/models/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
    { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(`Gemini ${r.status}: ${JSON.stringify(j.error||j).slice(0,200)}`);
  const parts = j?.candidates?.[0]?.content?.parts || [];
  for(const p of parts){ const d = p.inline_data || p.inlineData; if(d?.data) return d.data; }
  throw new Error('Gemini: keine Bilddaten in der Antwort');
}

// ---------- Meta Graph ----------
async function gpost(url, params){
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: new URLSearchParams(params) });
  const j = await r.json().catch(()=>({}));
  return { ok:r.ok, status:r.status, j };
}
async function waitContainer(statusUrl){
  for(let i=0;i<10;i++){
    await new Promise(res=>setTimeout(res, i===0?1500:2500));
    const r = await fetch(statusUrl).catch(()=>null);
    const j = r ? await r.json().catch(()=>({})) : {};
    const s = j.status_code || j.status;
    if(s==='FINISHED') return true;
    if(s==='ERROR' || s==='EXPIRED') return false;
  }
  return false;
}
async function postIG(env, V, imageUrl, caption){
  if(!env.IG_USER_ID || !env.IG_ACCESS_TOKEN) return null;
  const tok = env.IG_ACCESS_TOKEN, base = `https://graph.facebook.com/${V}/${env.IG_USER_ID}`;
  const c = await gpost(`${base}/media`, { image_url:imageUrl, caption, access_token:tok });
  if(!c.ok || !c.j.id) return { platform:'IG', ok:false, err:c.j.error||c.j };
  await waitContainer(`https://graph.facebook.com/${V}/${c.j.id}?fields=status_code&access_token=${encodeURIComponent(tok)}`);
  const p = await gpost(`${base}/media_publish`, { creation_id:c.j.id, access_token:tok });
  return (p.ok && p.j.id) ? { platform:'IG', ok:true, id:p.j.id } : { platform:'IG', ok:false, err:p.j.error||p.j };
}
async function postFB(env, V, imageUrl, caption){
  if(!env.FB_PAGE_ID || !env.FB_PAGE_ACCESS_TOKEN) return null;
  let tok = env.FB_PAGE_ACCESS_TOKEN;
  try{
    const ar = await fetch(`https://graph.facebook.com/${V}/me/accounts?access_token=${encodeURIComponent(tok)}`);
    const aj = await ar.json().catch(()=>({}));
    if(ar.ok && Array.isArray(aj.data)){ const pg = aj.data.find(p=>p.id===env.FB_PAGE_ID); if(pg?.access_token) tok = pg.access_token; }
  }catch{}
  const r = await gpost(`https://graph.facebook.com/${V}/${env.FB_PAGE_ID}/photos`, { url:imageUrl, message:caption, access_token:tok });
  return (r.ok && (r.j.id||r.j.post_id)) ? { platform:'FB', ok:true, id:r.j.post_id||r.j.id } : { platform:'FB', ok:false, err:r.j.error||r.j };
}
async function postThreads(env, imageUrl, caption){
  if(!env.THREADS_ACCESS_TOKEN || env.SKIP_THREADS==='1') return null;
  const tok = env.THREADS_ACCESS_TOKEN;
  let uid = env.THREADS_USER_ID || '';
  try{
    const me = await fetch(`https://graph.threads.net/v1.0/me?fields=id&access_token=${encodeURIComponent(tok)}`);
    const mj = await me.json().catch(()=>({})); if(me.ok && mj.id) uid = mj.id;
  }catch{}
  if(!uid) return { platform:'Threads', ok:false, err:'keine User-ID' };
  const base = `https://graph.threads.net/v1.0/${uid}`;
  const c = await gpost(`${base}/threads`, { media_type:'IMAGE', image_url:imageUrl, text:caption, access_token:tok });
  if(!c.ok || !c.j.id) return { platform:'Threads', ok:false, err:c.j.error||c.j };
  await waitContainer(`https://graph.threads.net/v1.0/${c.j.id}?fields=status&access_token=${encodeURIComponent(tok)}`);
  const p = await gpost(`${base}/threads_publish`, { creation_id:c.j.id, access_token:tok });
  return (p.ok && p.j.id) ? { platform:'Threads', ok:true, id:p.j.id } : { platform:'Threads', ok:false, err:p.j.error||p.j };
}

// ---------- KV-Queue Helpers ----------
async function getQueue(env){ return JSON.parse((await env.STATE.get('queue')) || '[]'); }
async function putQueue(env, q){ await env.STATE.put('queue', JSON.stringify(q)); }

// ---------- ENHANCE-Task ----------
async function runEnhance(env, log){
  if(!env.GEMINI_API_KEY){ log.push('Enhance: kein GEMINI_API_KEY → übersprungen.'); return; }
  const site = (env.SITE_URL || 'https://luxestyle.ch').replace(/\/$/,'');
  const pub = (env.PUBLIC_BASE || '').replace(/\/$/,'');
  const batch = Math.max(1, parseInt(env.ENHANCE_BATCH || '1', 10) || 1);
  const n = PRODUCTS.length;
  let ptr = parseInt((await env.STATE.get('pointer')) || '0', 10) % n;
  const queue = await getQueue(env);
  const today = new Date().toISOString().slice(0,10);
  let made = 0;
  for(let k=0;k<batch;k++){
    const p = PRODUCTS[(ptr+k)%n];
    try{
      const b64 = await geminiEnhance(env, p.image_url);
      await env.BUCKET.put(`enhanced/${p.name}.jpg`, b64ToBytes(b64), { httpMetadata:{ contentType:'image/jpeg' } });
      const url = `${site}/products/${p.name}`;
      const cap = CAPTIONS[made % CAPTIONS.length].replace('{label}', p.label||p.name).replace('{url}', url);
      const tags = pickTags(`${p.name} ${p.label||''}`);
      queue.push({ id:`ki-${p.name}-${today}`, name:p.name, image_url:`${pub}/enhanced/${p.name}.jpg`,
                   caption:`${cap}\n${tags}`, status:'ready', enqueued:today });
      log.push(`Enhance: ✅ ${p.label||p.name} → R2 enhanced/${p.name}.jpg`);
      made++;
    }catch(e){ log.push(`Enhance: ⚠️ ${p.name}: ${e.message}`); }
  }
  await env.STATE.put('pointer', String((ptr+batch)%n));
  await putQueue(env, queue);
  log.push(`Enhance fertig: ${made} Bild(er), Queue=${queue.filter(x=>x.status==='ready').length} ready.`);
}

// ---------- POST-Task ----------
async function runPost(env, log){
  const V = env.META_GRAPH_VERSION || 'v21.0';
  const configured = [env.IG_USER_ID&&env.IG_ACCESS_TOKEN&&'IG', env.FB_PAGE_ID&&env.FB_PAGE_ACCESS_TOKEN&&'FB', env.THREADS_ACCESS_TOKEN&&'Threads'].filter(Boolean);
  if(configured.length===0){ log.push('Post: keine Meta-Creds → übersprungen.'); return; }
  const queue = await getQueue(env);
  const isVideo = x => (x.kind === 'video');
  const next = queue.find(x => x.status==='ready' && (
    isVideo(x) ? !!(x.video_url) : /\.jpe?g($|\?)/i.test(x.image_url||'')));
  if(!next){ log.push('Post: kein ready-Eintrag (oder keine gültige Medien-URL) → nichts zu tun.'); return; }
  const mediaUrl = isVideo(next) ? next.video_url : next.image_url;
  log.push(`Post → ${next.id} [${next.kind||'image'}] | Kanäle: ${configured.join('+')} | ${mediaUrl}`);
  const results = isVideo(next)
    ? await postVideoAll(env, V, mediaUrl, next.caption)
    : (await Promise.all([
        postIG(env, V, mediaUrl, next.caption),
        postFB(env, V, mediaUrl, next.caption),
        postThreads(env, mediaUrl, next.caption),
      ])).filter(Boolean);
  const ok = results.filter(r=>r.ok);
  if(ok.length>0){
    next.status = 'posted'; next.posted_at = new Date().toISOString(); next.post_url = ok[0].id;
    log.push(`Post: ✅ ${ok.map(r=>r.platform).join('+')} (id ${ok[0].id})`);
  } else {
    log.push(`Post: ❌ kein Kanal erfolgreich: ${results.map(r=>`${r.platform} ${JSON.stringify(r.err).slice(0,120)}`).join(' | ')} — bleibt ready.`);
  }
  // alte 'posted' beschneiden, Queue schlank halten (letzte 40 behalten)
  const trimmed = queue.slice(-40);
  await putQueue(env, trimmed);
}

// ---------- Cron-Dispatch ----------
export default {
  async scheduled(event, env, ctx){
    const log = [];
    // Cron-Routing nach Minute: 30→Enhance (04:30), 15/25→Reel (05:15/05:25), sonst→Post (09:00/17:00).
    if(/^30 /.test(event.cron)) await runEnhance(env, log);
    else if(/^(15|25) /.test(event.cron)) await runReel(env, log);
    else await runPost(env, log);
    console.log(`[cron ${event.cron}] ${log.join(' · ')}`);
  },

  async fetch(req, env){
    const url = new URL(req.url);
    // R2-Serve: öffentliche Medien-URLs für Meta (Bild + Video). No-op, falls R2 nicht gebunden ist.
    if(url.pathname.startsWith('/enhanced/')){
      if(!env.BUCKET) return new Response('R2 not configured', { status:404 });
      const obj = await env.BUCKET.get(url.pathname.slice(1));
      if(!obj) return new Response('Not found', { status:404 });
      return new Response(obj.body, { headers:{ 'Content-Type':'image/jpeg', 'Cache-Control':'public, max-age=86400' } });
    }
    if(url.pathname.startsWith('/reels/')){
      if(!env.BUCKET) return new Response('R2 not configured', { status:404 });
      const obj = await env.BUCKET.get(url.pathname.slice(1));
      if(!obj) return new Response('Not found', { status:404 });
      return new Response(obj.body, { headers:{ 'Content-Type':'video/mp4', 'Cache-Control':'public, max-age=86400' } });
    }
    // Gelato-Fulfillment: Shopify orders/create-Webhook → echter Druckauftrag bei Gelato.
    // In Shopify einrichten: Einstellungen → Benachrichtigungen → Webhooks → "Bestellungserstellung",
    // Format JSON, URL = {PUBLIC_BASE}/webhooks/orders/create ; Signatur-Secret = SHOPIFY_WEBHOOK_SECRET.
    if(url.pathname === '/webhooks/orders/create' && req.method === 'POST'){
      const log = [];
      // Auth: gültige Shopify-HMAC (SHOPIFY_WEBHOOK_SECRET) ODER ein geheimes URL-Token (?t=WEBHOOK_TOKEN /
      // ?key=RUN_KEY). Das Token erlaubt eine vollautonome Einrichtung (Webhook per Shopify-API anlegbar,
      // ohne dass ein Signatur-Secret manuell abgetippt werden muss). HMAC bleibt zusätzlich unterstützt.
      const t = url.searchParams.get('t');
      const bypass = !!((env.WEBHOOK_TOKEN && t === env.WEBHOOK_TOKEN) || (env.RUN_KEY && url.searchParams.get('key') === env.RUN_KEY));
      const resp = await handleOrderWebhook(req, env, log, bypass);
      console.log(`[gelato] ${log.join(' · ')}`);
      return resp;
    }
    // Stripe (ohne-Shopify-Weg): Checkout-Session anlegen (vom Storefront aufgerufen).
    if(url.pathname === '/stripe/checkout' && (req.method === 'POST' || req.method === 'OPTIONS')){
      const log = [];
      const resp = await createCheckout(req, env, log);
      if(log.length) console.log(`[stripe] ${log.join(' · ')}`);
      return resp;
    }
    // Stripe-Webhook: bezahlt → Gelato-Druck. (?key=RUN_KEY = Test-Bypass der Signaturprüfung.)
    if(url.pathname === '/webhooks/stripe' && req.method === 'POST'){
      const log = [];
      const bypass = !!(env.RUN_KEY && url.searchParams.get('key') === env.RUN_KEY);
      const resp = await handleStripeWebhook(req, env, log, bypass);
      console.log(`[stripe] ${log.join(' · ')}`);
      return resp;
    }
    // Manueller Trigger zum Testen: /run?task=enhance|reel|post&key=RUN_KEY
    if(url.pathname === '/run'){
      if(!env.RUN_KEY || url.searchParams.get('key') !== env.RUN_KEY) return new Response('forbidden', { status:403 });
      const task = url.searchParams.get('task') || 'post';
      const log = [];
      if(task==='enhance') await runEnhance(env, log);
      else if(task==='reel') await runReel(env, log);
      else await runPost(env, log);
      return Response.json({ task, log });
    }
    if(url.pathname === '/health' || url.pathname === '/'){
      const q = await getQueue(env);
      return Response.json({ ok:true, products:PRODUCTS.length, queue_ready:q.filter(x=>x.status==='ready').length, queue_total:q.length });
    }
    return new Response('LuxeStyle Autopilot', { status:200 });
  },
};
