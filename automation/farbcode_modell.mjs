// farbcode_modell.mjs — Lieferanten-Artikelcodes im Farb-/Ausführungsfeld → «Modell N» (09.10.2026).
// Regel: automation/data/farbcode_modell_regel.json — dieselbe Datei liest automation/farbcode_modell.py (Bestand, täglich,
// Gegenprobe py=js über alle Optionswerte: `python3 automation/farbcode_modell.py --selbsttest`).
// Anlass: 124 aktive zeigten «QW121», «YT6419113017», «040401», «MFH3IUW75B08E11» (neben «Blau») im Feld «Farbe». Die Importer
// machten Codes nur zu «Modell N», wenn JEDER Wert ein Code war und mit einem Buchstaben begann.
import fs from 'fs';
const R = JSON.parse(fs.readFileSync(new URL('./data/farbcode_modell_regel.json', import.meta.url), 'utf8'));
const OPT = new RegExp(R.optionen, 'i'), ZEICHEN = new RegExp(R.zeichen), SEG = new RegExp(R.segment_einheit, 'i'),
  BEKANNT = new RegExp(R.bekannt, 'i'), ZAEHL = new RegExp(R.zaehlwort, 'i'), SPERRE = new RegExp(R.wortsperre, 'i'),
  SERIE = new RegExp(R.serien), TEIL = new RegExp(R.teil_segment), GR_ENDE = new RegExp(R.groesse_ende),
  LUECKE = new RegExp(R.luecke), FACH = new RegExp(R.fach_titel, 'i');
const VOKAL = /[AEIOUÄÖÜaeiouäöü]/g, KONS_LAUF = /[^AEIOUÄÖÜaeiouäöü]+/g, MASS = /\d+(?:[.,]\d+)?\s*[x×*]\s*\d+/i;
const ziff = s => (s.match(/\d/g) || []).length;
const buchst = s => s.match(/[A-Za-z]+/g) || [];

function wort(t) {
  if (ZAEHL.test(t)) return false;
  if (SPERRE.test(t)) return true;
  if (t.length >= 3 && t !== t.toUpperCase()) return true;
  if (t.length >= R.wort_min) {
    const lauf = Math.max(0, ...(t.match(KONS_LAUF) || []).map(x => x.length));
    return (t.match(VOKAL) || []).length / t.length >= R.wort_vokal_min && lauf <= R.wort_konsonantenlauf_max;
  }
  return false;
}
function kern(s) {
  if (!(s.length >= R.min_laenge && s.length <= R.max_laenge) || !ZEICHEN.test(s) || BEKANNT.test(s) || MASS.test(s)) return false;
  if (/^\d+$/.test(s)) return ziff(s) >= R.nur_ziffern_min;
  if (ziff(s) < R.min_ziffern) return false;
  return !buchst(s).some(wort);
}
export function istCode(w) {
  const s = String(w || '').trim().replace(LUECKE, '$1$2');
  const t = s.split(/[-._#]/);
  return kern(s) && !t.slice(1).some(x => SEG.test(x) || TEIL.test(x)) && !SEG.test(t[0]);
}
function teilcode(w) {
  const t = String(w || '').trim().split('-');
  return t.length >= 2 && kern(t[0]) && t.slice(1).some(x => SEG.test(x) || TEIL.test(x));
}
function wortcode(w) {
  const s = String(w || '').trim();
  if (!(s.length >= R.min_laenge && s.length <= R.max_laenge) || !ZEICHEN.test(s) || ziff(s) < R.min_ziffern) return false;
  return buchst(s).some(t => wort(t) && !SPERRE.test(t));
}
// Werte EINER Option → neue Werte (gleiche Reihenfolge) oder null (nichts zu tun / Kollision / Wahl im Anhang).
export function codesNummerieren(werte) {
  const codes = werte.map((w, i) => istCode(w) ? i : -1).filter(i => i >= 0);
  if (!codes.length || werte.length < 2 || werte.some(w => teilcode(w) || wortcode(w))) return null;
  const staemme = werte.map(w => String(w).trim()).filter(w => GR_ENDE.test(w) && /\d/.test(w.replace(GR_ENDE, '')))
    .map(w => w.replace(GR_ENDE, ''));
  if (new Set(staemme).size !== staemme.length) return null;
  const zahlen = codes.map(i => String(werte[i]).match(/\d+/g) || []);
  if (zahlen.every(z => z.length && z[z.length - 1].length <= 5 && parseInt(z[z.length - 1], 10) % R.rund === 0)) return null;
  const serie = new Map();
  for (const w of werte) { const m = String(w || '').trim().match(SERIE); if (m) { if (!serie.has(m[1])) serie.set(m[1], []); serie.get(m[1]).push(+m[2]); } }
  let wortS = R.neu_wort, best = -1;
  for (const [k, v] of serie) if (v.length > best) { best = v.length; wortS = k; }
  let n = Math.max(0, ...(serie.get(wortS) || [0]));
  const neu = [...werte];
  for (const i of codes) neu[i] = `${wortS} ${++n}`;
  if (new Set(neu.map(x => String(x).trim().toLowerCase())).size !== neu.length) return null;
  return neu;
}
export const istFarbOption = name => OPT.test(String(name || ''));
export const fachTitel = titel => FACH.test(String(titel || ''));
// Kanarien (gleiche Liste wie Python) — Importer rufen das beim Start; rot → Funktion liefert immer null.
export function kanarienGruen() {
  return R.kanarien.every(([ein, soll]) => JSON.stringify(codesNummerieren(ein) || ein) === JSON.stringify(soll));
}
export default codesNummerieren;
