#!/usr/bin/env node
/* LuxeStyle — heygen_video.mjs · KI-Avatar-/Voice-Videos über die HeyGen-API.
 * ---------------------------------------------------------------------------------
 * „Eigene Stimme/Sprecher": HeyGen macht aus einem TEXT-Skript ein Video mit sprechendem
 * Avatar (z.B. ein LuxeStyle-Presenter, der Produkte auf Deutsch/Bärndütsch vorstellt).
 * HeyGen ist ein CLOUD-Dienst (nicht lokal installierbar) → braucht einen API-Key (Gratis-Tier
 * vorhanden). No-op-safe ohne Key.
 *
 * SETUP (1×): HeyGen-Konto → Settings → API → Key kopieren → als Secret/Env HEYGEN_API_KEY
 *   (transient: HEYGEN_API_KEY=... node automation/heygen_video.mjs "...").
 *
 * Nutzung:
 *   HEYGEN_API_KEY=... node automation/heygen_video.mjs "Hoi zäme! Das isch es schöns Teil — CHF 39.90"
 *   ENV optional: HEYGEN_AVATAR_ID, HEYGEN_VOICE_ID (sonst Defaults), HEYGEN_RATIO=9x16
 *   node automation/heygen_video.mjs --avatars      # verfügbare Avatare/Stimmen listen
 *
 * Ablauf: POST /v2/video/generate → video_id → /v1/video_status.get pollen bis "completed" → video_url.
 * stdout = nur die Video-URL (für Pipeline). Logs nach stderr. Danach via upload_to_shopify_cdn.mjs
 * auf CDN + in social/video_queue.csv (Bärndütsch-Caption) → autonomes Posten.
 */
const KEY = process.env.HEYGEN_API_KEY || '';
const AVATAR = process.env.HEYGEN_AVATAR_ID || 'Daisy-inskirt-20220818'; // Default-Avatar (ersetzbar)
const VOICE = process.env.HEYGEN_VOICE_ID || '';                           // leer → erst --avatars listen
const RATIO = process.env.HEYGEN_RATIO || '9x16';
const log = (...a) => console.error(...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2);

if (!KEY) { log('HEYGEN_API_KEY fehlt → No-op. (Key transient setzen oder als Secret.)'); process.exit(0); }

const H = { 'X-Api-Key': KEY, 'Content-Type': 'application/json' };

async function listAvatars() {
  const v = await (await fetch('https://api.heygen.com/v2/avatars', { headers: H })).json();
  const av = (v.data && v.data.avatars || []).slice(0, 15).map(a => `${a.avatar_id} (${a.avatar_name})`);
  const voices = await (await fetch('https://api.heygen.com/v2/voices', { headers: H })).json();
  const de = (voices.data && voices.data.voices || []).filter(x => /de|german/i.test(x.language || '')).slice(0, 15)
    .map(x => `${x.voice_id} (${x.name}, ${x.language})`);
  log('AVATARS:\n  ' + av.join('\n  '));
  log('\nDEUTSCHE STIMMEN:\n  ' + de.join('\n  '));
}

async function generate(script) {
  const dim = RATIO === '9x16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
  const voice = VOICE ? { type: 'text', input_text: script, voice_id: VOICE } : { type: 'text', input_text: script };
  const body = { video_inputs: [{ character: { type: 'avatar', avatar_id: AVATAR, avatar_style: 'normal' }, voice }], dimension: dim };
  const r = await (await fetch('https://api.heygen.com/v2/video/generate', { method: 'POST', headers: H, body: JSON.stringify(body) })).json();
  const id = r.data && r.data.video_id;
  if (!id) { log('❌ generate fehlgeschlagen:', JSON.stringify(r).slice(0, 300)); process.exit(1); }
  log('video_id:', id, '— warte auf Rendering …');
  for (let i = 0; i < 60; i++) {
    await sleep(8000);
    const s = await (await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${id}`, { headers: H })).json();
    const st = s.data && s.data.status;
    if (st === 'completed') { console.log(s.data.video_url); return; }
    if (st === 'failed') { log('❌ Render fehlgeschlagen:', JSON.stringify(s.data).slice(0, 200)); process.exit(1); }
    log(`… ${st} (${i})`);
  }
  log('⏱️ Timeout — später per video_status.get prüfen. id=' + id);
}

(async () => {
  if (args.includes('--avatars')) return listAvatars();
  const script = args.find(a => !a.startsWith('--'));
  if (!script) { log('Nutzung: node heygen_video.mjs "<Skript-Text>"  |  --avatars'); process.exit(1); }
  await generate(script);
})();
