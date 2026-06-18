#!/usr/bin/env node
/* LuxeStyle — eleven-music.mjs  (KOMMERZIELL-cleared Musik via ElevenLabs „Eleven Music")
 * Ersetzt den dateierten Kevin-MacLeod-Sound durch moderne, lizenzsaubere Tracks.
 * Key NUR aus ENV (ELEVENLABS_API_KEY) — NIE ins Repo. No-op ohne Key (Automation bricht nie).
 *
 * Lauf:  ELEVENLABS_API_KEY=… node automation/eleven-music.mjs "PROMPT" [SEKUNDEN] [OUT.mp3] [--instrumental]
 *  z.B.  … "modern upbeat swiss pop, energetic, trendy fashion reel, clean punchy mix" 30 reels/track.mp3 --instrumental
 * API: POST https://api.elevenlabs.io/v1/music  (prompt ≤4100, music_length_ms 3000–600000, force_instrumental)
 */
import fs from 'node:fs';
const KEY = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || '';
const prompt = process.argv[2] || 'modern upbeat pop, energetic and trendy, clean punchy mix for a fashion reel, no vocals needed';
const seconds = Math.max(3, Math.min(600, parseInt(process.argv[3] || '30', 10)));
const out = process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4] : `reels/eleven-music-${Date.now()}.mp3`;
const instrumental = process.argv.includes('--instrumental');

if (!KEY) { console.log('ELEVENLABS_API_KEY fehlt → No-op. Key in ENV/luxe-secrets.ps1 setzen.'); process.exit(0); }

const body = {
  prompt,
  music_length_ms: seconds * 1000,
  force_instrumental: instrumental,
  output_format: 'mp3_44100_128',
};
try {
  const r = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) { console.error('❌ ElevenLabs', r.status, (await r.text()).slice(0, 300)); process.exit(1); }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(out.substring(0, out.lastIndexOf('/')) || '.', { recursive: true });
  fs.writeFileSync(out, buf);
  console.log(`✅ Musik: ${out} (${(buf.length / 1024).toFixed(0)} KB, ~${seconds}s, ${instrumental ? 'instrumental' : 'kann Gesang haben'}) — kommerziell-cleared`);
} catch (e) { console.error('❌ Fehler:', e.message); process.exit(1); }
