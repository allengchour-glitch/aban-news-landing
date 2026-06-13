/* LuxeStyle Autopilot — Video/Reel-Modul (Luma Dream Machine → R2 → Meta-Reels)
 * ----------------------------------------------------------------------------
 * runReel(): nimmt das veredelte Produktbild (R2 enhanced/<name>.jpg, sonst Originalfoto) als Start-
 * Keyframe, lässt Luma (Ray) eine ruhige, edle Kamerafahrt rendern (Produkt bleibt echt), lädt die MP4
 * in R2 (reels/<name>.mp4) und stellt einen Video-Post in die KV-Queue. Zustandsmaschine über KV
 * (`video_job`), damit ein langer Luma-Lauf über mehrere Cron-Aufrufe resümierbar ist.
 *
 * postVideoAll(): postet einen Video-Queue-Eintrag als Reel an Instagram + Facebook + (optional) Threads.
 *
 * No-op-sicher: ohne LUMA_API_KEY rendert runReel nichts; ohne Meta-Creds postet postVideoAll nichts.
 * ENV: LUMA_API_KEY · LUMA_MODEL (Default ray-flash-2) · LUMA_RESOLUTION (540p) · LUMA_DURATION (5s)
 */
import { PRODUCTS } from './products.js';

const LUMA_BASE = 'https://api.lumalabs.ai/dream-machine/v1';
const VIDEO_PROMPT = 'Subtle, elegant cinematic motion of this exact premium product. Keep the product 100% identical — same shape, colour, material. Slow gentle push-in, soft natural light, shallow depth of field, refined luxury-boutique mood. No text, no logos, no morphing, no distortion. Vertical 9:16.';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- Luma ----------
async function lumaStart(env, frameUrl){
  const body = {
    prompt: VIDEO_PROMPT,
    model: env.LUMA_MODEL || 'ray-flash-2',
    resolution: env.LUMA_RESOLUTION || '540p',
    duration: env.LUMA_DURATION || '5s',
    aspect_ratio: '9:16',
    keyframes: { frame0: { type: 'image', url: frameUrl } },
  };
  const r = await fetch(`${LUMA_BASE}/generations`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.LUMA_API_KEY}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if(!r.ok || !j.id) throw new Error(`Luma start ${r.status}: ${JSON.stringify(j).slice(0,200)}`);
  return j.id;
}
// Pollt bis ~5 Min; gibt Video-URL (fertig), 'pending' (Timeout → nächster Cron) oder 'failed' zurück.
async function lumaPoll(env, genId){
  for(let i=0;i<50;i++){
    await sleep(i===0 ? 3000 : 6000);
    const r = await fetch(`${LUMA_BASE}/generations/${genId}`, { headers:{ 'Authorization':`Bearer ${env.LUMA_API_KEY}`, 'Accept':'application/json' } });
    const j = await r.json().catch(()=>({}));
    const st = j.state || j.status;
    if(st === 'completed'){ const v = j.assets?.video || j.video; if(v) return v; return 'failed'; }
    if(st === 'failed'){ return 'failed'; }
  }
  return 'pending';
}

// ---------- runReel (Zustandsmaschine) ----------
export async function runReel(env, log){
  if(!env.LUMA_API_KEY){ log.push('Reel: kein LUMA_API_KEY → übersprungen.'); return; }
  const site = (env.SITE_URL || 'https://luxestyle.ch').replace(/\/$/,'');
  const pub = (env.PUBLIC_BASE || '').replace(/\/$/,'');
  let job = JSON.parse((await env.STATE.get('video_job')) || 'null');

  if(!job){
    const n = PRODUCTS.length;
    const vptr = parseInt((await env.STATE.get('video_pointer')) || '0', 10) % n;
    const p = PRODUCTS[vptr];
    await env.STATE.put('video_pointer', String((vptr+1)%n));
    // Start-Frame: bevorzugt das veredelte R2-Bild (öffentlich via Worker), sonst Originalfoto.
    let frameUrl = p.image_url;
    if(pub){ const head = await env.BUCKET.head(`enhanced/${p.name}.jpg`).catch(()=>null); if(head) frameUrl = `${pub}/enhanced/${p.name}.jpg`; }
    try{
      const genId = await lumaStart(env, frameUrl);
      job = { genId, name:p.name, label:p.label, started:Date.now() };
      await env.STATE.put('video_job', JSON.stringify(job));
      log.push(`Reel: Luma-Gen gestartet «${p.label||p.name}» (id ${genId}).`);
    }catch(e){ log.push(`Reel: Luma-Start fehlgeschlagen: ${e.message}`); return; }
  }

  const res = await lumaPoll(env, job.genId);
  if(res === 'pending'){ log.push('Reel: Luma noch in Arbeit — nächster Lauf pollt weiter (Job bleibt in KV).'); return; }
  if(res === 'failed'){ await env.STATE.delete('video_job'); log.push('Reel: Luma-Gen fehlgeschlagen → Job verworfen.'); return; }

  const dl = await fetch(res);
  if(!dl.ok){ log.push(`Reel: Video-Download HTTP ${dl.status} — Job bleibt, neuer Versuch nächster Lauf.`); return; }
  await env.BUCKET.put(`reels/${job.name}.mp4`, dl.body, { httpMetadata:{ contentType:'video/mp4' } });
  const url = `${site}/products/${job.name}`;
  const cap = `${job.label||job.name} ✨ Jetzt entdecken — Code WELCOME10 = -10% · 🔗 ${url}\n#schweiz #foryou #luxestyle #reels`;
  const queue = JSON.parse((await env.STATE.get('queue')) || '[]');
  queue.push({ kind:'video', id:`reel-${job.name}-${new Date().toISOString().slice(0,10)}`, name:job.name,
               video_url:`${pub}/reels/${job.name}.mp4`, caption:cap, status:'ready' });
  await env.STATE.put('queue', JSON.stringify(queue));
  await env.STATE.delete('video_job');
  log.push(`Reel: ✅ reels/${job.name}.mp4 in R2 + Queue.`);
}

// ---------- Meta-Reel-Posten ----------
async function gpost(url, params){
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams(params) });
  const j = await r.json().catch(()=>({}));
  return { ok:r.ok, status:r.status, j };
}
// Video braucht länger als Bild → grosszügiger pollen (bis ~3 Min).
async function waitContainer(statusUrl){
  for(let i=0;i<36;i++){
    await sleep(i===0 ? 3000 : 5000);
    const r = await fetch(statusUrl).catch(()=>null);
    const j = r ? await r.json().catch(()=>({})) : {};
    const s = j.status_code || j.status;
    if(s === 'FINISHED') return true;
    if(s === 'ERROR' || s === 'EXPIRED') return false;
  }
  return false;
}
async function postIGReel(env, V, videoUrl, caption){
  if(!env.IG_USER_ID || !env.IG_ACCESS_TOKEN) return null;
  const tok = env.IG_ACCESS_TOKEN, base = `https://graph.facebook.com/${V}/${env.IG_USER_ID}`;
  const c = await gpost(`${base}/media`, { media_type:'REELS', video_url:videoUrl, caption, share_to_feed:'true', access_token:tok });
  if(!c.ok || !c.j.id) return { platform:'IG', ok:false, err:c.j.error||c.j };
  const fin = await waitContainer(`https://graph.facebook.com/${V}/${c.j.id}?fields=status_code&access_token=${encodeURIComponent(tok)}`);
  if(!fin) return { platform:'IG', ok:false, err:'container not FINISHED' };
  const p = await gpost(`${base}/media_publish`, { creation_id:c.j.id, access_token:tok });
  return (p.ok && p.j.id) ? { platform:'IG', ok:true, id:p.j.id } : { platform:'IG', ok:false, err:p.j.error||p.j };
}
async function postFBVideo(env, V, videoUrl, caption){
  if(!env.FB_PAGE_ID || !env.FB_PAGE_ACCESS_TOKEN) return null;
  let tok = env.FB_PAGE_ACCESS_TOKEN;
  try{
    const ar = await fetch(`https://graph.facebook.com/${V}/me/accounts?access_token=${encodeURIComponent(tok)}`);
    const aj = await ar.json().catch(()=>({}));
    if(ar.ok && Array.isArray(aj.data)){ const pg = aj.data.find(p=>p.id===env.FB_PAGE_ID); if(pg?.access_token) tok = pg.access_token; }
  }catch{}
  const r = await gpost(`https://graph.facebook.com/${V}/${env.FB_PAGE_ID}/videos`, { file_url:videoUrl, description:caption, access_token:tok });
  return (r.ok && r.j.id) ? { platform:'FB', ok:true, id:r.j.id } : { platform:'FB', ok:false, err:r.j.error||r.j };
}
async function postThreadsVideo(env, videoUrl, caption){
  if(!env.THREADS_ACCESS_TOKEN || env.SKIP_THREADS==='1') return null;
  const tok = env.THREADS_ACCESS_TOKEN;
  let uid = env.THREADS_USER_ID || '';
  try{ const me = await fetch(`https://graph.threads.net/v1.0/me?fields=id&access_token=${encodeURIComponent(tok)}`); const mj = await me.json().catch(()=>({})); if(me.ok && mj.id) uid = mj.id; }catch{}
  if(!uid) return { platform:'Threads', ok:false, err:'keine User-ID' };
  const base = `https://graph.threads.net/v1.0/${uid}`;
  const c = await gpost(`${base}/threads`, { media_type:'VIDEO', video_url:videoUrl, text:caption, access_token:tok });
  if(!c.ok || !c.j.id) return { platform:'Threads', ok:false, err:c.j.error||c.j };
  const fin = await waitContainer(`https://graph.threads.net/v1.0/${c.j.id}?fields=status&access_token=${encodeURIComponent(tok)}`);
  if(!fin) return { platform:'Threads', ok:false, err:'container not FINISHED' };
  const p = await gpost(`${base}/threads_publish`, { creation_id:c.j.id, access_token:tok });
  return (p.ok && p.j.id) ? { platform:'Threads', ok:true, id:p.j.id } : { platform:'Threads', ok:false, err:p.j.error||p.j };
}
export async function postVideoAll(env, V, videoUrl, caption){
  return (await Promise.all([
    postIGReel(env, V, videoUrl, caption),
    postFBVideo(env, V, videoUrl, caption),
    postThreadsVideo(env, videoUrl, caption),
  ])).filter(Boolean);
}
