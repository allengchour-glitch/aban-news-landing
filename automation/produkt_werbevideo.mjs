#!/usr/bin/env node
/**
 * produkt_werbevideo.mjs — macht aus den PRODUKTBILDERN EINES Produkts ein Werbevideo (9:16).
 *
 * Warum es das gibt (gemessen, nicht vermutet):
 *  - 19.09.: `dropship/ads/auto_render.sh` baut jedes Reel aus MEHREREN Produkten der Allow-Liste
 *    und bricht unter zwei Bildern ab. Auf einer Produktseite zeigt so ein Video FREMDE Produkte.
 *    Fuer die Produktseite braucht es ein Video JE PRODUKT — das ist dieses Werkzeug.
 *  - 23.09.: `tools/video_hook.mjs` misst, dass die bestehenden Reels die ersten rund 2,7 s auf
 *    eine Marken-Karte verbrennen. Die Quellen sagen einhellig: die ersten 3 Sekunden entscheiden,
 *    und man soll mit dem PRODUKT oeffnen, nicht mit einer Logo-Animation.
 *    => Dieses Werkzeug zeigt das Produkt ab Sekunde 0; die Marke kommt ans ENDE.
 *  - 85 PROZENT der Meta-Videoaufrufe laufen ohne Ton (QUELLE) => der Text steht im Bild.
 *    Das deckt sich mit der festen User-Regel "kein Voiceover" (dropship/VIDEO-PRAEFERENZEN.md).
 *  - Empfohlene Laenge kurzer vertikaler Anzeigen: 7-15 s (QUELLE). Die Segmentlaenge wird so
 *    gerechnet, dass die Gesamtlaenge in dieses Fenster faellt.
 *
 * Die Bilder und der Preis kommen ueber `https://luxestyle.ch/products/<handle>.js` — dieser
 * Weg braucht KEINE Zugangsdaten (gemessen 23.09.), das Werkzeug laeuft also auch ohne Token.
 *
 * Aufruf:  node automation/produkt_werbevideo.mjs <handle> [<handle> ...]
 *          node automation/produkt_werbevideo.mjs --selbsttest
 * Env:     MUSIK=<pfad>  ZIEL_S=12  MAX_BILDER=5  AUSGABE=reels
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const SHOP = process.env.SHOP_BASIS || 'https://luxestyle.ch';
/** HTTP-Codes, bei denen der Shop nur drosselt — die Seite EXISTIERT (Lehre 20.09.). */
export const GEDROSSELT = new Set([429, 430, 503]);
export const FPS = 30;
export const BLENDE = 0.35;      // Kreuzblende zwischen zwei Segmenten
export const CTA_S = 2.0;        // Marken-/Handlungskarte am ENDE
export const SEG_MIN = 1.6, SEG_MAX = 3.2;
export const SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
export const SANSR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FF = (args) => execFileSync('ffmpeg', ['-nostdin', '-y', '-hide_banner', '-loglevel', 'error', ...args]);
/** So viele Segmente mindestens — sonst faellt ein Ein-Foto-Produkt unter die 7-Sekunden-Grenze. */
export const MIN_SEGMENTE = 3;

/** Preis aus Rappen als Schweizer Text. Unbekannt bleibt unbekannt, wird nicht 0.00. */
export function preisText(rappen) {
  if (rappen === null || rappen === undefined || !Number.isFinite(Number(rappen))) return null;
  const r = Math.round(Number(rappen));
  if (r < 0) return null;
  return `CHF ${(r / 100).toFixed(2)}`;
}

/**
 * Text fuer ffmpeg-drawtext sicher machen:
 *  - "%" wird in drawtext still verschluckt -> "PROZENT" (feste Regel, VIDEO-PRAEFERENZEN §3)
 *  - Emoji fehlen in DejaVu und erscheinen als leere Kaestchen -> raus
 *  - Zeilenumbrueche zu Leerzeichen
 */
export function sicherText(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/%/g, 'PROZENT')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{FE0F}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Bild-Adressen aus dem Produkt-JSON: protokoll-vollstaendig, ohne Doppel, gedeckelt. */
export function bildUrls(produkt, max = 5) {
  const roh = Array.isArray(produkt?.images) ? produkt.images : [];
  const gesehen = new Set();
  const out = [];
  for (const u of roh) {
    if (typeof u !== 'string' || !u) continue;
    const voll = u.startsWith('//') ? 'https:' + u : u;
    const schluessel = voll.split('?')[0];
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);
    out.push(voll);
    if (out.length >= max) break;
  }
  return out;
}

/** Guenstigster Variantenpreis in Rappen; null, wenn keiner lesbar ist. */
export function preisRappen(produkt) {
  const v = Array.isArray(produkt?.variants) ? produkt.variants : [];
  const zahlen = v.map((x) => Number(x?.price)).filter((n) => Number.isFinite(n) && n > 0);
  return zahlen.length ? Math.min(...zahlen) : null;
}

/**
 * Welches Bild in welchem Segment laeuft. Hat ein Produkt nur ein oder zwei Fotos, reicht
 * ein Segment je Foto nicht fuer die empfohlenen 7-15 s — dann laeuft dasselbe Foto mehrfach,
 * aber mit einer ANDEREN Kamerafahrt (siehe kenBurns). Genau so werden Ein-Foto-Anzeigen gemacht.
 */
export function segmentFolge(anzahlBilder, minSegmente = MIN_SEGMENTE) {
  if (!Number.isInteger(anzahlBilder) || anzahlBilder < 1) return null;
  const folge = [];
  const n = Math.max(anzahlBilder, minSegmente);
  for (let i = 0; i < n; i++) folge.push(i % anzahlBilder);
  return folge;
}

/**
 * Segmentlaenge so waehlen, dass die Gesamtlaenge moeglichst nah am Ziel liegt.
 * Gesamt = n*seg + CTA - n*BLENDE  (jede Kreuzblende frisst BLENDE Sekunden).
 */
export function segmentDauer(n, ziel = 12, { cta = CTA_S, blende = BLENDE } = {}) {
  if (!Number.isInteger(n) || n < 1) return null;
  const roh = (ziel - cta + n * blende) / n;
  return Math.min(SEG_MAX, Math.max(SEG_MIN, Math.round(roh * 100) / 100));
}

/** Gesamtlaenge, die sich aus n Segmenten dieser Laenge ergibt. */
export function gesamtDauer(n, seg, { cta = CTA_S, blende = BLENDE } = {}) {
  if (!Number.isInteger(n) || n < 1 || !Number.isFinite(seg)) return null;
  return Math.round((n * seg + cta - n * blende) * 100) / 100;
}

/**
 * Ken-Burns-Ausdruck je Segment — bewusst ABWECHSELND.
 * Immer derselbe Zoom auf die Mitte macht eine Bilderfolge monoton; vier Bewegungen im Wechsel
 * lassen dieselben Standbilder nach Schnitt aussehen statt nach Diaschau.
 * Die Quelle wird vorher auf 2160x3840 gebracht, damit zoompan auf feinem Raster rechnet
 * (sub-pixel-glatt, kein Ruckeln) — dieser Kniff stammt aus render_premium_reel.sh.
 */
export function kenBurns(i, bilder) {
  const n = Math.max(1, Math.round(bilder));
  const schritt = 0.06 / n;
  switch (((i % 4) + 4) % 4) {
    case 0: return { z: `min(1+${schritt.toFixed(6)}*on\\,1.06)`, x: `iw/2-(iw/zoom/2)`, y: `ih/2-(ih/zoom/2)` };
    case 1: return { z: `max(1.06-${schritt.toFixed(6)}*on\\,1.0)`, x: `iw/2-(iw/zoom/2)`, y: `ih/2-(ih/zoom/2)` };
    case 2: return { z: `1.08`, x: `(iw-iw/zoom)*on/${n}`, y: `ih/2-(ih/zoom/2)` };
    default: return { z: `1.08`, x: `iw/2-(iw/zoom/2)`, y: `(ih-ih/zoom)*on/${n}` };
  }
}


// --------------------------------------------------- Textbreite wirklich messen
/**
 * ⚠️ TEUER GELERNT (23.09.): die erste Fassung deckelte den Haken auf 34 ZEICHEN. Gemessen wurde
 * damit das Falsche — entscheidend ist die PIXELBREITE. "Taktische Outdoor Warnweste für" sind
 * 31 Zeichen und bei 60 px rund 1200 px breit; bei x=(w-text_w)/2 lief der Text links UND rechts
 * aus dem 1080 px breiten Bild. Aufgefallen nur, weil ich das Deckblatt ANGESEHEN habe.
 * Gemessen wird jetzt mit ffmpeg selbst, also mit genau dem Zeichner, der den Text später malt.
 */
const BREITEN_CACHE = new Map();
export function textBreite(text, fontsize, fontfile = SANS) {
  if (typeof text !== 'string' || text.length === 0) return 0;
  const schluessel = `${fontfile}|${fontsize}|${text}`;
  if (BREITEN_CACHE.has(schluessel)) return BREITEN_CACHE.get(schluessel);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-'));
  const txt = path.join(tmp, 't.txt');
  fs.writeFileSync(txt, text);
  const roh = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi',
    '-i', `color=c=black:s=4000x${Math.ceil(fontsize * 3)}:d=1`, '-frames:v', '1',
    '-vf', `drawtext=fontfile=${fontfile}:textfile=${txt}:fontsize=${fontsize}:fontcolor=white:x=0:y=0`,
    '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 });
  fs.rmSync(tmp, { recursive: true, force: true });
  const breiteBild = 4000, hoehe = Math.ceil(fontsize * 3);
  let max = 0;
  for (let y = 0; y < hoehe; y++) {
    const zeile = y * breiteBild;
    for (let x = breiteBild - 1; x > max; x--) {
      if (roh[zeile + x] > 40) { max = x; break; }
    }
  }
  const b = max + 1;
  BREITEN_CACHE.set(schluessel, b);
  return b;
}

/** Grösste Schriftgrösse, bei der der Text noch in die verfügbare Breite passt. */
export function passendeGroesse(text, start, maxBreite, fontfile = SANS, min = 22) {
  let g = Math.round(start);
  while (g > min && textBreite(text, g, fontfile) > maxBreite) g -= 2;
  return g;
}

/**
 * Text in Zeilen brechen, die je in maxBreite passen. Ein einzelnes Wort, das allein zu breit
 * ist, wird NICHT zerschnitten — dafür ist die Schriftgrösse da.
 */
export function umbrechen(text, fontsize, maxBreite, fontfile = SANS, messen = textBreite) {
  const woerter = String(text).split(/\s+/).filter(Boolean);
  if (woerter.length === 0) return [];
  const zeilen = [];
  let akt = woerter[0];
  for (const w of woerter.slice(1)) {
    const kandidat = `${akt} ${w}`;
    if (messen(kandidat, fontsize, fontfile) <= maxBreite) akt = kandidat;
    else { zeilen.push(akt); akt = w; }
  }
  zeilen.push(akt);
  return zeilen;
}

/** Kurzer, konkreter Haken. Kein Superlativ, kein Versprechen, das der Shop nicht haelt. */
export function hookText(titel, preis) {
  const t = sicherText(titel);
  return preis ? `${t}\nab ${preis}` : t;
}

// ------------------------------------------------------------------ Netz/IO
async function holeJson(url, versuche = 4) {
  let letzter = 0;
  for (let i = 0; i < versuche; i++) {
    const a = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64)' } });
    if (a.ok) return a.json();
    letzter = a.status;
    if (!GEDROSSELT.has(letzter)) throw new Error(`HTTP ${letzter} bei ${url}`);
    await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
  }
  throw new Error(`gedrosselt (HTTP ${letzter}) bei ${url}`);
}

async function ladeBild(url, ziel) {
  for (let i = 0; i < 4; i++) {
    const a = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64)' } });
    if (a.ok) { fs.writeFileSync(ziel, Buffer.from(await a.arrayBuffer())); return true; }
    if (!GEDROSSELT.has(a.status)) return false;   // Bild-Falle: 404 heisst wirklich weg
    await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
  }
  return false;
}


async function bauen(handle) {
  const ziel = Number(process.env.ZIEL_S || 12);
  const maxBilder = Number(process.env.MAX_BILDER || 5);
  const ausgabe = process.env.AUSGABE || 'reels';
  const musik = process.env.MUSIK || 'automation/music/luxe-premium.wav';
  if (!fs.existsSync(musik)) { console.error(`Musik fehlt: ${musik}`); return null; }

  const p = await holeJson(`${SHOP}/products/${handle}.js`);
  const urls = bildUrls(p, maxBilder);
  const preis = preisText(preisRappen(p));
  if (urls.length < 1) { console.error(`${handle}: keine Bilder`); return null; }

  const W = fs.mkdtempSync(path.join(os.tmpdir(), 'pwv-'));
  const bilder = [];
  for (const [i, u] of urls.entries()) {
    const f = path.join(W, `${i}.jpg`);
    if (await ladeBild(u, f)) bilder.push(f);
    else console.error(`  Bild nicht erreichbar, uebersprungen: ${u}`);
  }
  if (bilder.length < 1) { fs.rmSync(W, { recursive: true, force: true }); console.error(`${handle}: kein Bild ladbar`); return null; }

  const folge = segmentFolge(bilder.length);
  const n = folge.length;
  const seg = segmentDauer(n, ziel);
  const rahmen = Math.round(seg * FPS);

  // Alle Texte auf die GEMESSENE Pixelbreite bringen, nicht auf eine geratene Zeichenzahl.
  const RAND = 60;                       // links/rechts frei, damit nichts am Bildrand klebt
  const HOOK_BREITE = 1080 - 2 * RAND;
  const NAME_BREITE = 1080 - 118 - RAND; // das untere Band beginnt bei x=118
  const hookRoh = hookText(p.title, preis);
  let hookGroesse = 60;
  let hookZeilen = umbrechen(hookRoh.replace('\n', ' '), hookGroesse, HOOK_BREITE);
  while (hookZeilen.length > 2 && hookGroesse > 34) {        // hoechstens zwei Zeilen im Haken
    hookGroesse -= 4;
    hookZeilen = umbrechen(hookRoh.replace('\n', ' '), hookGroesse, HOOK_BREITE);
  }
  // Sicherheitsnetz: bleibt eine Zeile trotzdem zu breit (ein sehr langes Einzelwort), schrumpfen.
  for (const z of hookZeilen) hookGroesse = Math.min(hookGroesse, passendeGroesse(z, hookGroesse, HOOK_BREITE));
  const nameText = sicherText(p.title);
  const nameGroesse = passendeGroesse(nameText, 46, NAME_BREITE);
  fs.writeFileSync(path.join(W, 'hook.txt'), hookZeilen.join('\n'));
  fs.writeFileSync(path.join(W, 'name.txt'), nameText);
  fs.writeFileSync(path.join(W, 'preis.txt'), preis || '');
  fs.writeFileSync(path.join(W, 'cta1.txt'), 'Jetzt ansehen');
  fs.writeFileSync(path.join(W, 'cta2.txt'), 'luxestyle.ch');
  fs.writeFileSync(path.join(W, 'cta3.txt'), sicherText('-10% mit Code WELCOME10'));

  const GOLD = '0xb8915a', BG = '0xf4f3f1', INK = '0x2c2c2c';
  for (const [i, bildIndex] of folge.entries()) {
    const f = bilder[bildIndex];
    const kb = kenBurns(i, rahmen);
    let fc = `[0:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,setsar=1,`;
    fc += `zoompan=z='${kb.z}':d=1:x='${kb.x}':y='${kb.y}':s=1080x1920:fps=${FPS},`;
    // Preisband unten — auf JEDEM Segment, weil die meisten Aufrufe ohne Ton laufen.
    fc += `drawbox=x=0:y=1640:w=1080:h=280:color=black@0.40:t=fill,`;
    fc += `drawbox=x=80:y=1712:w=8:h=128:color=${GOLD}:t=fill,`;
    fc += `drawtext=fontfile=${SANS}:textfile=${W}/name.txt:fontcolor=white:fontsize=${nameGroesse}:x=118:y=1718,`;
    fc += `drawtext=fontfile=${SANS}:textfile=${W}/preis.txt:fontcolor=${GOLD}:fontsize=60:x=118:y=1780`;
    if (i === 0) {
      // Der Haken steht ab Bild 1 im Bild — das 3-Sekunden-Fenster gehoert dem Produkt.
      fc += `,drawbox=x=0:y=0:w=1080:h=290:color=black@0.42:t=fill`;
      fc += `,drawtext=fontfile=${SANS}:textfile=${W}/hook.txt:fontcolor=white:fontsize=${hookGroesse}:x=(w-text_w)/2:y=${hookZeilen.length > 1 ? 62 : 96}:line_spacing=16`;
      fc += `,drawbox=x=(iw-220)/2:y=252:w=220:h=4:color=${GOLD}:t=fill`;
    }
    fc += `[v]`;
    FF(['-loop', '1', '-framerate', String(FPS), '-t', String(seg), '-i', f,
      '-filter_complex', fc, '-map', '[v]', '-t', String(seg), '-r', String(FPS),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'veryfast',
      path.join(W, `seg${i}.mp4`)]);
  }

  // Marke + Handlungsaufforderung ans ENDE (nicht an den Anfang).
  let ofc = `[0:v]drawbox=x=(iw-360)/2:y=ih/2-170:w=360:h=3:color=${GOLD}:t=fill,`;
  ofc += `drawtext=fontfile=${SANS}:textfile=${W}/cta1.txt:fontcolor=${INK}:fontsize=62:x=(w-text_w)/2:y=(h/2)-110:alpha='min(t/0.4\\,1)',`;
  ofc += `drawtext=fontfile=${SANS}:textfile=${W}/cta2.txt:fontcolor=${GOLD}:fontsize=70:x=(w-text_w)/2:y=(h/2)-10:alpha='min(max((t-0.3)*2\\,0)\\,1)',`;
  ofc += `drawtext=fontfile=${SANSR}:textfile=${W}/cta3.txt:expansion=none:fontcolor=${INK}:fontsize=38:x=(w-text_w)/2:y=(h/2)+90:alpha='min(max((t-0.6)*2\\,0)\\,1)'[v]`;
  FF(['-f', 'lavfi', '-t', String(CTA_S), '-i', `color=c=${BG}:s=1080x1920:r=${FPS}`,
    '-filter_complex', ofc, '-map', '[v]', '-t', String(CTA_S), '-r', String(FPS),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'veryfast', path.join(W, 'cta.mp4')]);

  const teile = [...folge.map((_, i) => path.join(W, `seg${i}.mp4`)), path.join(W, 'cta.mp4')];
  const dauern = [...folge.map(() => seg), CTA_S];
  let fc = '', prev = '0:v', acc = dauern[0];
  for (let k = 1; k < teile.length; k++) {
    const off = Math.round((acc - BLENDE) * 1000) / 1000;
    fc += `[${prev}][${k}:v]xfade=transition=fade:duration=${BLENDE}:offset=${off}[x${k}];`;
    prev = `x${k}`; acc = acc + dauern[k] - BLENDE;
  }
  fc += `[${prev}]format=yuv420p[vout]`;
  const stumm = path.join(W, 'stumm.mp4');
  FF([...teile.flatMap((t) => ['-i', t]), '-filter_complex', fc, '-map', '[vout]', '-r', String(FPS),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-preset', 'medium', '-movflags', '+faststart', stumm]);

  fs.mkdirSync(ausgabe, { recursive: true });
  const out = path.join(ausgabe, `produkt-${handle}.mp4`);
  const rein = path.join(ausgabe, `produkt-${handle}-clean.mp4`);
  const poster = path.join(ausgabe, `produkt-${handle}.jpg`);
  const dauer = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', stumm], { encoding: 'utf8' }).trim());
  const aus = Math.max(0.1, dauer - 1.2);
  FF(['-i', stumm, '-i', musik, '-filter_complex',
    `[1:a]afade=t=in:st=0:d=0.6,afade=t=out:st=${aus.toFixed(2)}:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  // Clean-Fassung fuer TikTok/IG: Trend-Sound wird in der App darueber gelegt, nie eingebrannt.
  FF(['-i', stumm, '-i', musik, '-filter_complex',
    `[1:a]volume=-30dB,afade=t=in:st=0:d=0.6,afade=t=out:st=${aus.toFixed(2)}:d=1.2[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', rein]);
  // Deckblatt aus dem ERSTEN Bild — dort steht das Produkt, nicht das Logo.
  FF(['-ss', '0.4', '-i', out, '-frames:v', '1', '-q:v', '2', poster]);

  fs.rmSync(W, { recursive: true, force: true });
  console.log(`>> ${out}  (${dauer.toFixed(1)}s, ${bilder.length} Bilder in ${n} Segmenten, Segment ${seg}s, Preis ${preis || 'unbekannt'})`);
  return { out, rein, poster, dauer, bilder: bilder.length, segmente: n };
}

// ---------------------------------------------------------------- Selbsttests
function pruefe(name, ok) {
  if (!ok) { console.error(`FEHLGESCHLAGEN: ${name}`); process.exitCode = 1; }
  else console.log(`ok  ${name}`);
}
function selbsttest() {
  // preisText
  pruefe('2490 Rappen = CHF 24.90', preisText(2490) === 'CHF 24.90');
  pruefe('runde 5000 Rappen behalten die Nachkommastellen', preisText(5000) === 'CHF 50.00');
  pruefe('fehlender Preis bleibt UNBEKANNT, nicht CHF 0.00', preisText(null) === null);
  pruefe('Text statt Zahl bleibt UNBEKANNT', preisText('teuer') === null);
  pruefe('negativer Preis bleibt UNBEKANNT', preisText(-5) === null);
  pruefe('0 Rappen ist ein echter Preis, kein Fehler', preisText(0) === 'CHF 0.00');

  // sicherText — die zwei teuer gelernten drawtext-Fallen
  pruefe('Prozentzeichen wird ausgeschrieben', sicherText('-10% Rabatt') === '-10PROZENT Rabatt');
  pruefe('Emoji fliegt raus', sicherText('Helm 🪖 neu') === 'Helm neu');
  pruefe('Variantenwaehler-Emoji fliegt raus', sicherText('Top ✨ Preis') === 'Top Preis');
  pruefe('Zeilenumbruch wird Leerzeichen', sicherText('a\nb') === 'a b');
  pruefe('Umlaute bleiben unveraendert', sicherText('Grösse Füsse') === 'Grösse Füsse');
  pruefe('kein Text ergibt leer, nicht Absturz', sicherText(null) === '');

  // bildUrls
  const pr = { images: ['//cdn/a.jpg?v=1', '//cdn/a.jpg?v=2', 'https://cdn/b.jpg', '', null, '//cdn/c.jpg'] };
  pruefe('protokolllose Adresse wird zu https', bildUrls(pr)[0] === 'https://cdn/a.jpg?v=1');
  pruefe('dasselbe Bild mit anderer Version zaehlt einmal', bildUrls(pr).length === 3);
  pruefe('Deckel wird eingehalten', bildUrls(pr, 2).length === 2);
  pruefe('ohne Bilder leere Liste', bildUrls({}).length === 0);

  // preisRappen
  pruefe('guenstigste Variante gewinnt', preisRappen({ variants: [{ price: 4490 }, { price: 2490 }] }) === 2490);
  pruefe('Preis 0 zaehlt nicht als Preis', preisRappen({ variants: [{ price: 0 }] }) === null);
  pruefe('ohne Varianten UNBEKANNT', preisRappen({}) === null);

  // segmentDauer / gesamtDauer — das Laengenfenster 7-15 s
  for (let n = 1; n <= 8; n++) {
    const anz = segmentFolge(n).length;
    const s = segmentDauer(anz, 12);
    const g = gesamtDauer(anz, s);
    pruefe(`bei ${n} Bildern liegt die Gesamtlaenge im Fenster 7-15s (${g}s)`, g >= 7 && g <= 15);
    pruefe(`bei ${n} Bildern bleibt das Segment in den Grenzen (${s}s)`, s >= SEG_MIN && s <= SEG_MAX);
  }
  // segmentFolge
  pruefe('ein Foto laeuft dreimal', JSON.stringify(segmentFolge(1)) === '[0,0,0]');
  pruefe('zwei Fotos ergeben drei Segmente, das erste kommt wieder', JSON.stringify(segmentFolge(2)) === '[0,1,0]');
  pruefe('fuenf Fotos werden NICHT wiederholt', JSON.stringify(segmentFolge(5)) === '[0,1,2,3,4]');
  pruefe('kein Foto ergibt UNBEKANNT, nicht leere Liste', segmentFolge(0) === null);
  // Gegenprobe: bei einem Foto MUESSEN die drei Segmente verschiedene Fahrten haben
  pruefe('dasselbe Foto bekommt drei verschiedene Kamerafahrten',
    new Set(segmentFolge(1).map((_, i) => JSON.stringify(kenBurns(i, 60)))).size === 3);
  pruefe('0 Bilder ergibt UNBEKANNT, nicht 0', segmentDauer(0) === null);
  pruefe('halbe Bildzahl ergibt UNBEKANNT', segmentDauer(2.5) === null);
  // Gegenprobe: ein absichtlich unsinniges Ziel MUSS an die Grenze stossen, nicht still danebenliegen
  pruefe('unsinnig kurzes Ziel wird auf die Untergrenze geklemmt', segmentDauer(4, 1) === SEG_MIN);
  pruefe('unsinnig langes Ziel wird auf die Obergrenze geklemmt', segmentDauer(4, 99) === SEG_MAX);

  // kenBurns — die Bewegungen muessen sich wirklich UNTERSCHEIDEN
  const b = [0, 1, 2, 3].map((i) => JSON.stringify(kenBurns(i, 60)));
  pruefe('vier Segmente = vier verschiedene Bewegungen', new Set(b).size === 4);
  pruefe('nach vier Segmenten wiederholt sich die Bewegung',
    JSON.stringify(kenBurns(4, 60)) === JSON.stringify(kenBurns(0, 60)));
  pruefe('Segment 0 zoomt hinein', kenBurns(0, 60).z.startsWith('min(1+'));
  pruefe('Segment 1 zoomt heraus', kenBurns(1, 60).z.startsWith('max(1.06-'));
  pruefe('Segment 2 faehrt waagrecht', kenBurns(2, 60).x.includes('(iw-iw/zoom)'));
  pruefe('Segment 3 faehrt senkrecht', kenBurns(3, 60).y.includes('(ih-ih/zoom)'));

  // textBreite / umbrechen / passendeGroesse — die Falle vom 23.09.
  const bM = textBreite('M', 60);
  pruefe('ein Zeichen hat eine Breite groesser 0', bM > 0);
  pruefe('leerer Text hat Breite 0', textBreite('', 60) === 0);
  pruefe('mehr Zeichen sind breiter', textBreite('MMMM', 60) > bM);
  // Gegenprobe: doppelte Schriftgroesse muss ungefaehr doppelt so breit sein
  const v = textBreite('MMMM', 120) / textBreite('MMMM', 60);
  pruefe(`doppelte Schriftgroesse = rund doppelte Breite (${v.toFixed(2)})`, v > 1.8 && v < 2.2);
  // Der konkrete Fall, der die erste Fassung zerstoert hat
  pruefe('der 31-Zeichen-Titel ist bei 60 px BREITER als 1080 px',
    textBreite('Taktische Outdoor Warnweste für', 60) > 1080);
  pruefe('genau dieser Titel passt nach dem Verkleinern',
    textBreite('Taktische Outdoor Warnweste für', passendeGroesse('Taktische Outdoor Warnweste für', 60, 960)) <= 960);
  // umbrechen mit einem gefaelschten Messer, damit der Test ohne ffmpeg-Aufrufe auskommt
  const messerJeZeichen = (t, g) => t.length * g;
  pruefe('Umbruch an der Wortgrenze',
    JSON.stringify(umbrechen('aaa bbb ccc', 1, 7, SANS, messerJeZeichen)) === '["aaa bbb","ccc"]');
  pruefe('was passt, bleibt eine Zeile',
    umbrechen('aaa bbb', 1, 99, SANS, messerJeZeichen).length === 1);
  pruefe('ein zu breites EINZELWORT wird nicht zerschnitten',
    JSON.stringify(umbrechen('unzerbrechlich', 1, 3, SANS, messerJeZeichen)) === '["unzerbrechlich"]');
  pruefe('leerer Text ergibt keine Zeile', umbrechen('   ', 1, 10, SANS, messerJeZeichen).length === 0);

  // hookText
  pruefe('kurzer Titel bleibt ganz', hookText('Warnweste', 'CHF 24.90') === 'Warnweste\nab CHF 24.90');
  pruefe('langer Titel wird NICHT mehr blind gekuerzt (das macht jetzt der Umbruch)',
    hookText('Taktische Outdoor Warnweste fuer Herren und Damen', null)
      === 'Taktische Outdoor Warnweste fuer Herren und Damen');
  pruefe('ohne Preis steht kein "ab"', !hookText('Warnweste', null).includes('ab '));
  pruefe('Prozentzeichen im Titel wird auch im Haken ausgeschrieben',
    hookText('50% Wolle', null).includes('PROZENT'));
}

const args = process.argv.slice(2);
if (args[0] === '--selbsttest') selbsttest();
else if (args.length === 0) { console.error('Aufruf: node automation/produkt_werbevideo.mjs <handle> [...] | --selbsttest'); process.exit(2); }
else for (const h of args) { try { await bauen(h); } catch (e) { console.error(`${h}: ${e.message}`); } }
