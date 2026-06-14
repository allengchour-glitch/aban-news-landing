#!/usr/bin/env node
/* LuxeStyle — elevenlabs_tts.mjs · ElevenLabs TTS (sehr natürliche Stimme, mehrsprachig).
 * ---------------------------------------------------------------------------------
 * Premium-Stimme für Reels/Voiceover — klingt VIEL besser als piper. Cloud-Dienst.
 * KEIN Key im Repo: liest ELEVENLABS_API_KEY aus der Umgebung/Secret. No-op ohne Key.
 *
 * Deutsche Stimmen (für Bärndütsch-Text, multilingual_v2 = natürlich):
 *   Bettina (warm)  Ljh056ZotKDfGTc2jGL4   | Default
 *   Mary Kai (social) BswSp506E1rUw7uja1V5
 *   Monika (educator) duraok8mDDsn72TpG3r5
 * Override: ENV ELEVEN_VOICE_ID, ELEVEN_MODEL (default eleven_multilingual_v2).
 *
 * Nutzung:
 *   ELEVENLABS_API_KEY=... node automation/elevenlabs_tts.mjs "Hoi zäme! …" [out.mp3]
 *   node automation/elevenlabs_tts.mjs --voices        # Stimmen listen
 *   node automation/elevenlabs_tts.mjs --quota         # Credits prüfen
 * stdout = nur der Output-Pfad (für Pipeline). Logs nach stderr.
 *
 * ⚠️ Gratis-Tier ~10k Zeichen/Monat. Kommerzielle Nutzung: ElevenLabs-Lizenz/Plan beachten.
 */
import fs from 'node:fs';
const KEY = process.env.ELEVENLABS_API_KEY || '';
const VOICE = process.env.ELEVEN_VOICE_ID || 'Ljh056ZotKDfGTc2jGL4';
const MODEL = process.env.ELEVEN_MODEL || 'eleven_multilingual_v2';
const API = 'https://api.elevenlabs.io/v1';
const log = (...a) => console.error(...a);
const args = process.argv.slice(2);
const H = { 'xi-api-key': KEY, 'Content-Type': 'application/json' };

if (!KEY) { log('ELEVENLABS_API_KEY fehlt → No-op. (Key als Secret/Env setzen, NIE ins Repo.)'); process.exit(0); }

async function quota() {
  const r = await (await fetch(`${API}/user/subscription`, { headers: { 'xi-api-key': KEY } })).json();
  log(`tier=${r.tier} · limit=${r.character_limit} · used=${r.character_count} · übrig=${(r.character_limit||0)-(r.character_count||0)}`);
}
async function voices() {
  const r = await (await fetch(`${API}/voices`, { headers: { 'xi-api-key': KEY } })).json();
  for (const v of (r.voices || [])) { const l = v.labels || {}; if ((l.language||'')==='de' || /de|german/i.test(l.accent||'')) log(`${v.name} · ${v.voice_id} · ${l.gender||''}`); }
}
async function tts(text, out) {
  const body = JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true } });
  const r = await fetch(`${API}/text-to-speech/${VOICE}?output_format=mp3_44100_128`, { method: 'POST', headers: H, body });
  if (!r.ok) { log('❌ ElevenLabs', r.status, (await r.text()).slice(0, 200)); process.exit(1); }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(out, buf);
  console.log(out);
}

(async () => {
  if (args.includes('--quota')) return quota();
  if (args.includes('--voices')) return voices();
  const text = args.find(a => !a.startsWith('--'));
  const out = args.find(a => a.endsWith('.mp3')) || '/tmp/eleven_vo.mp3';
  if (!text) { log('Nutzung: node elevenlabs_tts.mjs "<Text>" [out.mp3] | --voices | --quota'); process.exit(1); }
  await tts(text, out);
})();
