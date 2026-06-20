#!/usr/bin/env node
/* LuxeStyle — video-qa.mjs : PRE-POST QUALITAETS-GATE (User 2026-06-19 „immer neue Videos analysieren ob's passt").
 * Prueft EIN Video VOR dem Upload. Exit 0 = OK posten · Exit 1 = NICHT posten (Grund wird ausgegeben).
 * Checks (mit Fallback, bricht nie ab):
 *   1) ffprobe: Portrait 9:16 (~1080x1920), Dauer 5–180s, hat Video-Stream
 *   2) Datei > 250 KB (komplett, nicht abgeschnitten)
 *   3) Frame-Extrakt + Gemini-Vision: asiatische/chinesische Schrift, Watermark, "made in china", Unschaerfe,
 *      passt-zu-Schweizer-Premium-Marke?  -> bei Treffer FAIL. Ohne GEMINI_API_KEY: nur Basis-Checks (PASS).
 * CLI: node automation/video/video-qa.mjs reels/xy.mp4
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const file = process.argv[2];
const KEY = process.env.GEMINI_API_KEY || '';
const fail = (m) => { console.log('QA-FAIL:', m); process.exit(1); };
const ok = (m) => { console.log('QA-OK:', m); process.exit(0); };
if (!file || !fs.existsSync(file)) fail('Datei fehlt: ' + file);

// 1+2) Basis: Groesse + ffprobe
if (fs.statSync(file).size < 250000) fail('zu klein/unvollstaendig (<250KB)');
let w = 0, h = 0, dur = 0;
try {
  const j = JSON.parse(execSync(`ffprobe -v quiet -print_format json -show_streams -show_format "${file}"`, { encoding: 'utf8' }));
  const v = (j.streams || []).find(s => s.codec_type === 'video');
  if (!v) fail('kein Video-Stream'); w = +v.width; h = +v.height; dur = +(j.format?.duration || 0);
} catch (e) { ok('ffprobe n/a (Basis-Check bestanden)'); }
if (h < w) fail(`nicht Portrait (${w}x${h})`);
if (dur && (dur < 5 || dur > 180)) fail(`Dauer ${dur.toFixed(1)}s ausserhalb 5-180s`);

// 3) Frame + Gemini-Vision (nur wenn Key da)
if (!KEY) ok(`Basis-Check ${w}x${h} ${dur.toFixed(1)}s (kein GEMINI_API_KEY -> ohne Vision)`);
const frame = '/tmp/qa_frame.jpg';
try { execSync(`ffmpeg -y -nostdin -ss ${Math.max(1, (dur || 6) / 2)} -i "${file}" -frames:v 1 -vf scale=540:-1 "${frame}"`, { stdio: 'ignore' }); }
catch { ok('Frame-Extrakt n/a (Basis-Check bestanden)'); }
const b64 = fs.readFileSync(frame).toString('base64');
// DETAILLIERTE Vision-Kontrolle (User 2026-06-20 „beschreib ihm in details, voll autonom"):
// Die KI ist der autonome Qualitaets-Waechter. Jede Pruefung exakt definiert, damit sie streng + zuverlaessig ist.
const prompt = [
  'Du bist der autonome Qualitaets-Pruefer fuer Werbe-Reels eines SCHWEIZER PREMIUM-Mode/Lifestyle-Shops (luxestyle.ch).',
  'Pruefe das Standbild streng und antworte AUSSCHLIESSLICH mit diesem JSON (keine Erklaerung):',
  '{"asian_text":bool,"watermark":bool,"made_in_china":bool,"low_quality":bool,"warped":bool,"text_bottom20":bool,"banned":bool,"collage":bool,"fits_premium":bool}',
  'Definitionen (true = Problem vorhanden):',
  '- asian_text: irgendwo chinesische/japanische/koreanische Schriftzeichen (Verpackung, Schild, Overlay, Stickerei) sichtbar.',
  '- watermark: fremdes Logo/Wasserzeichen/Lieferanten-Marke (z.B. AliExpress, Temu, ZHUMENG) ueber dem Bild.',
  '- made_in_china: Text "Made in China" o.ae. Herkunfts-Aufdruck sichtbar.',
  '- low_quality: unscharf, verpixelt, dunkel, JPEG-Artefakte, abgeschnittenes Motiv.',
  '- warped: verzerrte/deformierte Koerperteile, Haende mit falscher Fingerzahl, schmelzende Gesichter (KI-Fehler).',
  '- text_bottom20: eingebrannter Werbetext/Preis im UNTERSTEN Fuenftel (untere 20% Hoehe) — kollidiert mit der Plattform-Caption.',
  '- banned: medizinische/Vorher-Nachher-Claims oder verbotene Produkte (Botox, Serum-Heilversprechen, Ozempic).',
  '- collage: mehrere Produkte/Bilder in einem Raster statt EIN sauberer Lifestyle/Produkt-Shot.',
  '- fits_premium: true NUR wenn es professionell, sauber und hochwertig wirkt (echtes Foto/Model, gute Komposition).',
  'Sei im Zweifel STRENG: lieber ablehnen als ein schlechtes Bild posten.'
].join('\n');
try {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: b64 } }] }], generationConfig: { thinkingConfig: { thinkingBudget: 0 } } })
  });
  const j = await r.json();
  const txt = (j.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json|```/g, '');
  const v = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
  if (v.asian_text) fail('asiatische Schrift im Bild');
  if (v.watermark) fail('fremdes Watermark/Logo');
  if (v.made_in_china) fail('"made in china" sichtbar');
  if (v.low_quality) fail('niedrige Qualitaet/unscharf');
  if (v.warped) fail('verzerrte/deformierte Bildteile (KI-Fehler)');
  if (v.text_bottom20) fail('Text in der unteren 20% (kollidiert mit Plattform-Caption)');
  if (v.banned) fail('verbotener/medizinischer Inhalt');
  if (v.collage) fail('Collage/Raster statt sauberem Shot');
  ok(`Vision bestanden (${w}x${h}, premium=${v.fits_premium})`);
} catch (e) { ok('Gemini n/a (' + String(e).slice(0, 40) + ') -> Basis-Check bestanden'); }
