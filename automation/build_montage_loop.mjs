#!/usr/bin/env node
/* build_montage_loop.mjs — baut ein langes, NAHTLOS loopendes Montage-Video aus vielen Produktbildern
 * (Nano-Banana-Lifestyle + enhanced) für Produktseiten/Homepage. Ken-Burns-Zoom + weiche xfade-Übergänge,
 * 1080x1920 9:16, STUMM (Produktseiten-Autoplay ist eh stumm). Gratis via ffmpeg, kein Luma/Geld.
 *
 * Lauf: node automation/build_montage_loop.mjs [--n 18] [--dur 2.0] [--out reels/montage-loop.mp4]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const val = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const N = parseInt(val('--n', '18'), 10);
const DUR = parseFloat(val('--dur', '2.0'));      // Sek pro Bild
const XF = 0.6;                                    // Übergangs-Dauer
const OUT = val('--out', 'reels/montage-loop.mp4');

// Bilder sammeln: NUR die Alpenlicht-Versionen (Stil-Suffix), KEINE alten Plain-Duplikate (User 2026-06-25:
// "das 2te bild weg, sieht man bearbeitet + kam zuviel vor" = altes blazer-roma.png war Dublette zum -model).
// DENYLIST: bestimmte Bilder nie (augenmassage etc.).
const DENY = /augenmassage|made-?in-?china|asia|chines/i;
const STYLES = /-(model|bag|jewelry|sunglasses|seetest|beauty|home|men|accessory|lifestyle)$/i;
const baseKey = f => path.basename(f).replace(/\.(png|jpg|jpeg)$/i, '').replace(STYLES, '');
const all = [];
const collect = dir => { try { for (const f of fs.readdirSync(dir).sort()) if (/\.(png|jpg|jpeg)$/i.test(f) && !DENY.test(f)) all.push(path.join(dir, f)); } catch {} };
collect('social/ai-lifestyle'); collect('social/enhanced');
// Wenn von einem Produkt eine STIL-Version existiert, die PLAIN-Version (ohne Suffix) weglassen = keine Dublette.
const styledKeys = new Set(all.filter(f => STYLES.test(path.basename(f).replace(/\.(png|jpg|jpeg)$/i, ''))).map(baseKey));
const pick = all.filter(f => { const b = path.basename(f).replace(/\.(png|jpg|jpeg)$/i, ''); return STYLES.test(b) || !styledKeys.has(b); });
const imgs = pick.slice(0, N);
if (imgs.length < 2) { console.error('Zu wenige Bilder.'); process.exit(1); }
console.log(`Montage aus ${imgs.length} Bildern, ${DUR}s/Bild, ${XF}s Übergang.`);

// Filter bauen: jedes Bild -> scale/crop/zoompan, dann xfade-Kette
const fps = 30, frames = Math.round(DUR * fps);
// FIX 2026-06-25: Eingabe als EIN Frame (-framerate 1 -t 1) -> zoompan d=frames erzeugt GENAU die Dauer
// (sonst multipliziert zoompan d pro Eingabe-Frame -> Video 6x zu lang + langsam).
const inputs = imgs.map(f => `-loop 1 -framerate 1 -t 1 -i "${f}"`).join(' ');
let fc = '';
imgs.forEach((_, i) => {
  // hochskalieren, croppen, langsamer Ken-Burns-Zoom, einheitlich
  fc += `[${i}:v]scale=1300:2311:force_original_aspect_ratio=increase,crop=1300:2311,`
     + `zoompan=z='min(zoom+0.0010,1.18)':d=${frames}:fps=${fps}:s=1080x1920,setsar=1,format=yuv420p[v${i}];`;
});
// xfade-Kette: v0 (x) v1 -> m1, m1 (x) v2 -> m2 ...
let prev = 'v0';
for (let i = 1; i < imgs.length; i++) {
  const off = (DUR - XF) * i;             // kumulativer Versatz
  const out = (i === imgs.length - 1) ? 'vout' : `m${i}`;
  fc += `[${prev}][v${i}]xfade=transition=fade:duration=${XF}:offset=${off.toFixed(2)}[${out}];`;
  prev = out;
}
fc = fc.replace(/;$/, '');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const cmd = `ffmpeg -y ${inputs} -filter_complex "${fc}" -map "[vout]" -r ${fps} -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "${OUT}"`;
console.log('Rendere…');
execSync(cmd, { stdio: ['ignore', 'ignore', 'inherit'] });
const sz = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
const total = (DUR + (imgs.length - 1) * (DUR - XF)).toFixed(1);
console.log(`✅ ${OUT} — ${total}s, ${sz} MB, ${imgs.length} Produkte, stumm, loop-bereit.`);
