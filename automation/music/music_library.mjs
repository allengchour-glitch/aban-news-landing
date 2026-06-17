#!/usr/bin/env node
/* LuxeStyle — music_library.mjs  ·  EIN Tool fuer GUTE, GRATIS, KOMMERZIELL-FREIE Musik.
 * ---------------------------------------------------------------------------------
 * Loest die "GM-Synth klingt billig"-Sache: liefert echte, sauber lizenzierte Tracks
 * (Kevin MacLeod / incompetech.com, CC-BY 4.0 = kommerziell erlaubt mit Attribution).
 * Ersetzt die fluidsynth-.wav als Standard-Musikquelle der Render-Pipeline.
 *
 * NUTZUNG:
 *   node automation/music/music_library.mjs list
 *   node automation/music/music_library.mjs pick --mood elegant [--vocals] [--bpm 120] [--dur 60] [--out /tmp/track.wav]
 *   node automation/music/music_library.mjs pick --id dreams-become-real --dur 60
 *   node automation/music/music_library.mjs engines        # Zusatz-Engines (intern/Test)
 *
 * LIZENZ-SICHERHEIT: gibt NUR Tracks mit commercial:true aus. Schreibt bei jeder Wahl die
 *   Pflicht-Attribution nach automation/music/CREDITS.md. Zusatz-Engines (musicgen lokal /
 *   suno per Port) sind NICHT kommerziell -> Output landet in lib/_NONCOMMERCIAL/ und darf
 *   NIE in einen Live-Ad / social/video_queue.csv.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(new URL(import.meta.url)));
const ROOT = path.resolve(HERE, '..', '..');
const LIB = path.join(HERE, 'lib');
const CREDITS = path.join(HERE, 'CREDITS.md');
const CATALOG = JSON.parse(fs.readFileSync(path.join(HERE, 'catalog.json'), 'utf8'));

const args = process.argv.slice(2);
const cmd = args[0] || 'list';
const flag = (name, def = null) => {
  const i = args.indexOf('--' + name);
  if (i < 0) return def;
  const v = args[i + 1];
  return (v && !v.startsWith('--')) ? v : true;
};
const log = (...a) => console.log(...a);

function ensureDirs() { fs.mkdirSync(LIB, { recursive: true }); }

function commercialTracks() { return CATALOG.tracks.filter(t => t.commercial === true); }

function listCmd() {
  const moods = {};
  for (const t of commercialTracks()) for (const m of t.mood) (moods[m] ||= []).push(t);
  log('🎵 LuxeStyle Musik-Katalog — alle kommerziell-frei (CC-BY 4.0, Attribution via CREDITS.md)\n');
  for (const m of Object.keys(moods).sort()) {
    log(`  [${m}]`);
    for (const t of moods[m]) log(`    · ${t.id.padEnd(26)} ${t.title}  (${t.artist}${t.hasVocals ? ', Gesang' : ', instrumental'}, ~${t.bpm}bpm)`);
  }
  log('\n  Gesang-Tracks: ' + (commercialTracks().some(t => t.hasVocals) ? commercialTracks().filter(t => t.hasVocals).map(t => t.id).join(', ') : 'KEINE kommerziell-frei verfuegbar — fuer Gesang: `engines` (Suno per Port, braucht Pro fuer Live-Ad).'));
}

function pickTrack() {
  const id = flag('id');
  const mood = flag('mood', 'elegant');
  const wantVocals = args.includes('--vocals');
  let pool = commercialTracks();
  if (id) pool = pool.filter(t => t.id === id);
  else {
    pool = pool.filter(t => t.mood.includes(mood));
    if (wantVocals) {
      const v = pool.filter(t => t.hasVocals);
      if (v.length) pool = v;
      else log(`⚠️  Kein kommerziell-freier Gesang-Track im Mood "${mood}". Nehme instrumental (sauber lizenziert). Fuer echten Gesang: \`engines\` -> Suno per Port.`);
    }
  }
  if (!pool.length) { log(`❌ Kein Track fuer mood="${mood}"${id ? ` id="${id}"` : ''}. \`list\` zeigt alles.`); process.exit(1); }
  // rotierend statt immer derselbe: Datum als Seed
  const t = pool[new Date().getDate() % pool.length];
  return t;
}

function download(t) {
  ensureDirs();
  const mp3 = path.join(LIB, t.id + '.mp3');
  if (fs.existsSync(mp3) && fs.statSync(mp3).size > 100000) { log(`(Cache) ${t.id}.mp3`); return mp3; }
  log(`⬇️  Lade "${t.title}" (${t.artist}, ${t.license}) …`);
  try {
    execFileSync('curl', ['-sS', '-L', '--max-time', '120', '-o', mp3, t.url], { stdio: ['ignore', 'ignore', 'inherit'] });
  } catch (e) { log('❌ Download fehlgeschlagen (offline?). ' + e.message); process.exit(1); }
  if (!fs.existsSync(mp3) || fs.statSync(mp3).size < 100000) { log('❌ Datei zu klein/leer — URL pruefen.'); process.exit(1); }
  log(`✅ ${(fs.statSync(mp3).size / 1e6).toFixed(1)} MB -> ${mp3}`);
  return mp3;
}

function writeCredit(t) {
  const line = (CATALOG.attribution_template || 'Music: "{title}" by {artist} — {license}')
    .replace('{title}', t.title).replace('{artist}', t.artist).replace('{license}', t.license);
  let body = fs.existsSync(CREDITS) ? fs.readFileSync(CREDITS, 'utf8') : '# LuxeStyle — Musik-Lizenz-Nachweise\n\n> Pflicht-Attribution fuer alle verwendeten Tracks (CC-BY 4.0). Vom music_library.mjs gepflegt.\n\n';
  if (!body.includes(line)) { body += `- ${line}\n`; fs.writeFileSync(CREDITS, body); log('📝 Attribution -> CREDITS.md'); }
}

function toWav(mp3, dur, out) {
  const target = out || '/tmp/track.wav';
  // WICHTIG: -stream_loop -1 NUR mit -t kombinieren, sonst loopt ffmpeg unendlich (-> Riesendatei,
  //          Disk voll). Ohne dur: Track genau EINMAL transkodieren (kein Loop).
  const cmd2 = ['-y'];
  if (dur) cmd2.push('-stream_loop', '-1');
  cmd2.push('-i', mp3);
  if (dur) cmd2.push('-t', String(dur));
  const af = dur
    ? `afade=t=in:st=0:d=1.5,afade=t=out:st=${Math.max(0, dur - 2)}:d=2`
    : 'afade=t=in:st=0:d=1.5';
  cmd2.push('-af', af, '-ar', '44100', '-ac', '2', target);
  try { execFileSync('ffmpeg', cmd2, { stdio: ['ignore', 'ignore', 'ignore'] }); }
  catch { log('⚠️  ffmpeg-Schnitt fehlgeschlagen — gebe die MP3 direkt zurueck.'); return mp3; }
  return target;
}

function engines() {
  log(`🔧 Zusatz-Engines (NUR INTERN/TEST — NICHT kommerziell, nie in einen Live-Ad):

  --engine musicgen   Meta AudioCraft lokal (CPU, instrumental). Gewichte sind CC-BY-NC.
                      Install (gross): pip install torch --index-url https://download.pytorch.org/whl/cpu
                                       pip install audiocraft
                      Output -> automation/music/lib/_NONCOMMERCIAL/ (markiert).

  --engine suno       Echte Songs MIT GESANG, 2026-Qualitaet. Laeuft NICHT in der Cloud:
                      ueber den PC-Brave-Port (wie Follower-Bot), gratis Suno-Konto.
                      ⚠️ Gratis-Tier = NICHT kommerziell -> fuer Live-Shop-Ad Suno PRO noetig.

  Standard fuer Live-Ads bleibt der kommerziell-freie Katalog (Kevin MacLeod, CC-BY 4.0).`);
}

// ---- main ----
if (cmd === 'list') listCmd();
else if (cmd === 'engines') engines();
else if (cmd === 'pick') {
  const eng = flag('engine');
  if (eng) { log(`Engine "${eng}" ist intern/Test — siehe \`engines\`. Fuer Live-Ads den Katalog nutzen.`); engines(); process.exit(0); }
  const t = pickTrack();
  const mp3 = download(t);
  writeCredit(t);
  const dur = flag('dur') ? parseInt(flag('dur'), 10) : null;
  const out = flag('out');
  const wav = toWav(mp3, dur, typeof out === 'string' ? out : null);
  log(`\n🎧 TRACK: ${t.title} — ${t.artist} (${t.license})`);
  log(`PATH: ${wav}`);
} else { log('Unbekannt. Nutze: list | pick | engines'); process.exit(1); }
