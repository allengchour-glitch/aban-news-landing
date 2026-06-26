#!/usr/bin/env node
/* make_sound_ad.mjs — macht aus einem STUMMEN Reel eine SOUND-ON Ad-Version mit legal lizenzierter Musik
 * (Kevin MacLeod CC-BY via music_library.mjs). Hintergrund-Lehre 2026-06-26 (3 YouTube-Tutorials + TikTok-Daten):
 * TikTok-Ads duerfen NICHT stumm sein — Audio bringt +72% Stop-Rate, +6% Kaufabsicht, +9% Markenpraeferenz,
 * Sound = 8x Markenerinnerung. Trend-Pop-Sounds sind fuer Business-Accounts gesperrt -> eigene CC-BY-Musik einbacken
 * (oder in der TikTok-Ad-UI einen Commercial-Music-Library-Track waehlen). Diese Datei = der Einback-Weg (robust, ohne UI).
 *
 * Lauf: node automation/make_sound_ad.mjs --in reels/seedance-wasserfest.mp4 [--mood elegant] [--vol 0.55]
 *       [--out reels/seedance-wasserfest-sound.mp4]
 * Output: Video unveraendert (copy), Musik passend getrimmt + Fade-in/out + loudnorm. Attribution -> music/CREDITS.md.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const val = (f, d = '') => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const IN = val('--in');
const MOOD = val('--mood', 'elegant');
const VOL = parseFloat(val('--vol', '0.55'));   // Musik-Lautstaerke (Reels ohne VO -> Musik darf traegen)
const OUT = val('--out', IN ? IN.replace(/\.mp4$/i, '-sound.mp4') : '');
const log = (...a) => console.log(...a);
if (!IN || !fs.existsSync(IN)) { log('❌ --in <reel.mp4> fehlt oder existiert nicht'); process.exit(1); }

function sh(cmd, args) { return execFileSync(cmd, args, { encoding: 'utf8' }).trim(); }

// 1) Video-Dauer ermitteln
const dur = Math.max(3, Math.round(parseFloat(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', IN])) || 8));
log(`🎬 ${path.basename(IN)} · ${dur}s · Musik-Mood "${MOOD}" @ vol ${VOL}`);

// 2) Passenden CC-BY-Track holen (laedt/cached + schreibt Attribution nach music/CREDITS.md)
const here = path.dirname(new URL(import.meta.url).pathname);
const trackWav = path.join('/tmp', `sndad-${Date.now()}.wav`);
const pickOut = sh(process.execPath, [path.join(here, 'music', 'music_library.mjs'), 'pick', '--mood', MOOD, '--dur', String(dur), '--out', trackWav]);
const trackPath = (pickOut.match(/PATH:\s*(\S+)/) || [])[1] || trackWav;
if (!fs.existsSync(trackPath)) { log('❌ Musik konnte nicht geladen werden:\n' + pickOut); process.exit(1); }
log('🎧 ' + (pickOut.match(/TRACK:.*/) || ['(Track geladen)'])[0]);

// 3) Mux: Video unveraendert, Musik auf Video-Laenge, Fade-in/out, loudnorm fuers Web
const af = `afade=t=in:st=0:d=0.6,afade=t=out:st=${Math.max(0, dur - 0.8)}:d=0.8,volume=${VOL},loudnorm=I=-14:TP=-1.5:LRA=11`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
sh('ffmpeg', ['-y', '-i', IN, '-i', trackPath, '-filter_complex', `[1:a]${af}[a]`,
  '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
  '-movflags', '+faststart', OUT]);

const sz = (fs.statSync(OUT).size / 1e6).toFixed(1);
log(`\n✅ SOUND-ON Ad: ${OUT} (${sz} MB) — legal (CC-BY, Attribution in automation/music/CREDITS.md).`);
log('   -> Fuer TikTok-Ad: dieses Video nutzen (nicht das stumme). Alternativ in der Ad-UI einen CML-Track waehlen.');
try { fs.unlinkSync(trackPath); } catch {}
