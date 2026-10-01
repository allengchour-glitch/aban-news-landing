#!/usr/bin/env node
/**
 * video_hook.mjs — misst, WANN im Video zum ersten Mal das Produkt zu sehen ist.
 *
 * Hintergrund (QUELLE, 2026-09-23): Werbevideos entscheiden sich in den ersten 3 Sekunden;
 * die Empfehlung lautet ausdrücklich "lead with the product, not a logo animation".
 * Unsere Reels öffnen mit einer Marken-Karte. Dieses Gerät misst, wie lange sie steht.
 *
 * Verfahren: Einzelbilder im Raster abtasten, jedes auf 32x32 verkleinern und den Anteil
 * der Pixel zählen, die der Marken-Hintergrundfarbe entsprechen. Ist der Anteil hoch,
 * ist noch die Karte zu sehen; der erste Zeitpunkt darunter ist der Produkt-Einstieg.
 *
 * Aufruf:  node tools/video_hook.mjs <datei.mp4> [...]
 *          node tools/video_hook.mjs --selbsttest
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Marken-Hintergrund der Intro-/Outro-Karten (render_premium_reel.sh: BG=0xf4f3f1). */
export const MARKENFARBE = { r: 0xf4, g: 0xf3, b: 0xf1 };
/** Wie weit ein Kanal abweichen darf und trotzdem als Markenfläche zählt. */
export const TOLERANZ = 18;
/** Ab diesem Flächenanteil gilt das Bild als Marken-Karte, nicht als Produkt. */
export const KARTEN_ANTEIL = 0.72;

/** Anteil der Pixel, die der Markenfarbe entsprechen (0..1). rgb = flaches [r,g,b,...]-Feld. */
export function markenAnteil(rgb, farbe = MARKENFARBE, toleranz = TOLERANZ) {
  if (!rgb || rgb.length < 3) return null;          // kein Bild = UNBEKANNT, nicht 0
  let treffer = 0;
  const n = Math.floor(rgb.length / 3);
  for (let i = 0; i < n; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    if (Math.abs(r - farbe.r) <= toleranz &&
        Math.abs(g - farbe.g) <= toleranz &&
        Math.abs(b - farbe.b) <= toleranz) treffer++;
  }
  return treffer / n;
}

/** true, wenn dieses Einzelbild noch die Marken-Karte zeigt. */
export function istMarkenkarte(rgb) {
  const a = markenAnteil(rgb);
  return a === null ? null : a >= KARTEN_ANTEIL;
}

/**
 * Aus einer Folge (zeit, markenkarte?) den Produkt-Einstieg bestimmen.
 * Gibt die erste Zeit zurück, ab der KEINE Karte mehr zu sehen ist; null, wenn nie.
 */
export function einstieg(proben) {
  for (const p of proben) if (p.karte === false) return p.t;
  return null;
}

/**
 * Alle Proben in EINEM ffmpeg-Durchlauf holen statt je Probe neu zu starten.
 * Die erste Fassung suchte je Zeitpunkt einzeln (`-ss`) und brauchte rund 40 s je Video —
 * bei 105 Reels ueber eine Stunde. Ein Durchlauf mit fester Bildrate liefert dieselben
 * Einzelbilder in Sekunden. Gegenprobe: beide Wege muessen denselben Einstieg melden.
 */
function probenAusVideo(datei, { bis = 8, schritt = 0.1, kante = 32 } = {}) {
  const rate = Math.round(1 / schritt);
  const roh = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', datei, '-t', String(bis),
    '-vf', `fps=${rate},scale=${kante}:${kante}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 1 << 28 });
  const proBild = kante * kante * 3;
  const out = [];
  for (let i = 0; i * proBild + proBild <= roh.length; i++) {
    out.push({ t: Math.round((i / rate) * 100) / 100,
               rgb: Array.from(roh.subarray(i * proBild, (i + 1) * proBild)) });
  }
  return out;
}

/** Einzelnes Bild an einer Stelle — nur noch fuer die Gegenprobe gegen den schnellen Weg. */
export function rgbAusVideo(datei, t, kante = 32) {
  const roh = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-ss', String(t), '-i', datei,
    '-frames:v', '1', '-vf', `scale=${kante}:${kante}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 1 << 24 });
  return roh.length ? Array.from(roh) : null;
}

export function dauer(datei) {
  const s = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', datei], { encoding: 'utf8' }).trim();
  return Number(s) || null;
}

export function messen(datei, { bis = 8, schritt = 0.1, langsam = false } = {}) {
  const d = dauer(datei);
  const ende = Math.min(bis, d ?? bis);
  let proben;
  if (langsam) {
    proben = [];
    for (let t = 0; t < ende; t = Math.round((t + schritt) * 100) / 100) {
      proben.push({ t, karte: istMarkenkarte(rgbAusVideo(datei, t)) });
    }
  } else {
    proben = probenAusVideo(datei, { bis: ende, schritt })
      .map((p) => ({ t: p.t, karte: istMarkenkarte(p.rgb) }));
  }
  return { datei, dauer: d, einstieg: einstieg(proben), proben };
}

// ---------------------------------------------------------------- Selbsttests
function pruefe(name, bedingung) {
  if (!bedingung) { console.error(`FEHLGESCHLAGEN: ${name}`); process.exitCode = 1; }
  else console.log(`ok  ${name}`);
}
function flaeche(r, g, b, n = 1024) {
  const a = []; for (let i = 0; i < n; i++) a.push(r, g, b); return a;
}
function selbsttest() {
  // --- markenAnteil
  pruefe('reine Markenfarbe = Anteil 1', markenAnteil(flaeche(0xf4, 0xf3, 0xf1)) === 1);
  pruefe('reines Schwarz = Anteil 0', markenAnteil(flaeche(0, 0, 0)) === 0);
  pruefe('kein Bild ergibt UNBEKANNT, nicht 0', markenAnteil(null) === null);
  pruefe('leeres Bild ergibt UNBEKANNT, nicht 0', markenAnteil([]) === null);
  // Gegenprobe: knapp innerhalb und knapp ausserhalb der Toleranz muessen sich UNTERSCHEIDEN
  pruefe('knapp innerhalb der Toleranz zaehlt',
    markenAnteil(flaeche(0xf4 - TOLERANZ, 0xf3, 0xf1)) === 1);
  pruefe('knapp ausserhalb der Toleranz zaehlt NICHT',
    markenAnteil(flaeche(0xf4 - TOLERANZ - 1, 0xf3, 0xf1)) === 0);
  // Ein einzelner abweichender Kanal reicht zum Ausschluss
  pruefe('nur EIN Kanal draussen genuegt', markenAnteil(flaeche(0xf4, 0xf3, 0x40)) === 0);

  // --- istMarkenkarte: gemischte Flaechen
  const gemischt = (anteilKarte) => {
    const a = []; const n = 1000;
    for (let i = 0; i < n; i++) {
      if (i < n * anteilKarte) a.push(0xf4, 0xf3, 0xf1); else a.push(20, 40, 60);
    }
    return a;
  };
  pruefe('90 PROZENT Markenflaeche = Karte', istMarkenkarte(gemischt(0.90)) === true);
  pruefe('50 PROZENT Markenflaeche = keine Karte', istMarkenkarte(gemischt(0.50)) === false);
  pruefe('genau auf der Schwelle = Karte', istMarkenkarte(gemischt(KARTEN_ANTEIL)) === true);
  pruefe('knapp unter der Schwelle = keine Karte', istMarkenkarte(gemischt(KARTEN_ANTEIL - 0.01)) === false);
  pruefe('kein Bild bleibt UNBEKANNT', istMarkenkarte(null) === null);

  // --- einstieg
  pruefe('Einstieg ist die erste Nicht-Karte',
    einstieg([{ t: 0, karte: true }, { t: 1, karte: true }, { t: 2, karte: false }]) === 2);
  pruefe('durchgehend Karte ergibt null (UNBEKANNT), nicht 0',
    einstieg([{ t: 0, karte: true }, { t: 1, karte: true }]) === null);
  pruefe('Produkt ab Bild 1 ergibt 0',
    einstieg([{ t: 0, karte: false }, { t: 1, karte: false }]) === 0);
  // Gegenprobe: ein spaeterer Rueckfall auf die Karte darf den Einstieg NICHT verschieben
  pruefe('spaeterer Rueckfall auf die Karte aendert den Einstieg nicht',
    einstieg([{ t: 0, karte: true }, { t: 1, karte: false }, { t: 2, karte: true }]) === 1);
  // Unbekannte Proben gelten nicht als Produkt
  pruefe('unbekannte Probe ist kein Einstieg',
    einstieg([{ t: 0, karte: null }, { t: 1, karte: false }]) === 1);
}

// Nur ausfuehren, wenn direkt aufgerufen — sonst laeuft die Befehlszeile beim Importieren mit.
const direkt = process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;
const args = direkt ? process.argv.slice(2) : ['--modul'];
if (args[0] === '--modul') { /* als Baustein eingebunden: nichts tun */ }
else if (args[0] === '--selbsttest') { selbsttest(); }
else if (args.length === 0) { console.error('Aufruf: node tools/video_hook.mjs <datei.mp4> [...] | --selbsttest'); process.exit(2); }
else {
  for (const f of args) {
    const r = messen(f);
    const e = r.einstieg;
    console.log(`${e === null ? 'nie ' : (e.toFixed(1) + 's').padStart(5)}  Produkt sichtbar  (Laenge ${r.dauer?.toFixed(1)}s)  ${f}`);
  }
}
