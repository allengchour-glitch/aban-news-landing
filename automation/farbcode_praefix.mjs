// farbcode_praefix.mjs — Lieferanten-Artikelcode VOR der Farbe im Farbfeld abschneiden (10.10.2026): «646 Schwarz» → «Schwarz».
// Regel: automation/data/farbcode_praefix_regel.json — dieselbe Datei liest automation/farbcode_praefix.py (Bestand, täglich,
// Gegenprobe py=js über alle Optionswerte: `python3 automation/farbcode_praefix.py --selbsttest`).
// Anlass: 396 aktive zeigten «2350 Black», «8919 Armeegrün», «GS8111G Black» neben «2GS8111G Brown». Der Importer-Helfer
// ohneCode() erkennt nur Codes mit GROSSBUCHSTABEN vorn; farbcode_modell.mjs nur Werte ohne Leerzeichen.
import fs from 'fs';
const R = JSON.parse(fs.readFileSync(new URL('./data/farbcode_praefix_regel.json', import.meta.url), 'utf8'));
const FACH = new RegExp(JSON.parse(fs.readFileSync(new URL('./data/' + R.fach_titel_aus, import.meta.url), 'utf8')).fach_titel, 'i');
const FARBEN = JSON.parse(fs.readFileSync(new URL('./farben_de.json', import.meta.url), 'utf8'));
const OPT = new RegExp(R.optionen, 'i'), CODE = new RegExp(R.code), EINHEIT = new RegExp(R.einheit, 'i'),
  BEKANNT = new RegExp(R.bekannt, 'i'), ENDUNG = new RegExp(R.farbe_endung, 'i'), MODIF = new RegExp(R.modifikator, 'i');
const TRENN = /[\s\-/]+/;
const WORT = new Set();
for (const [k, v] of Object.entries(FARBEN)) for (const w of [k, v]) if (!TRENN.test(w)) WORT.add(w.toLowerCase());

const deFarbe = t => FARBEN[t.trim().toLowerCase()] || t.trim();
const farbwort = w => { w = w.toLowerCase(); return w.length >= R.wort_min && (WORT.has(w) || ENDUNG.test(w)); };
function restIstFarbe(rest) {
  const t = rest.trim().split(TRENN).filter(Boolean);
  if (!t.length) return false;
  if (farbwort(t[0])) return true;
  return MODIF.test(t[0]) && t.length > 1 && farbwort(t[1]);
}
function zerlege(w) {
  const m = String(w || '').trim().match(/^(\S+)\s+(\S.*)$/);
  if (!m) return null;
  const [, code, rest] = m;
  if (!CODE.test(code) || EINHEIT.test(code) || BEKANNT.test(code) || !restIstFarbe(rest)) return null;
  return [code, rest];
}

// Gleiches Ergebnis wie neu_werte() in farbcode_praefix.py: neue Werte (gleiche Reihenfolge) oder null.
export function praefixWeg(werte, titel = '') {
  if (titel && FACH.test(titel)) return null;
  const teile = werte.map(zerlege);
  const codes = teile.filter(Boolean).map(t => t[0]);
  if (!codes.length) return null;
  if (codes.some(c => /^\d+$/.test(c) && c.length <= 3) && (new Set(codes).size > 1 || werte.length < 2)) return null;
  const neu = werte.map((w, i) => teile[i] ? deFarbe(teile[i][1]) : String(w).trim());
  if (new Set(neu.map(x => x.toLowerCase())).size !== neu.length || neu.some(x => !x)) return null;
  return neu;
}
export const istFarbOption = name => OPT.test(name || '');

export function kanarienGruen() {
  let f = 0;
  for (const [ein, soll] of R.kanarien) { const ist = praefixWeg(ein) || ein; if (JSON.stringify(ist) !== JSON.stringify(soll)) f++; }
  for (const [titel, ein, soll] of R.kanarien_titel) { if (JSON.stringify(praefixWeg(ein, titel)) !== JSON.stringify(soll)) f++; }
  return f === 0;
}

if (process.argv[1] && process.argv[1].endsWith('farbcode_praefix.mjs') && process.argv.includes('--test')) {
  const ok = kanarienGruen();
  console.log(ok ? `FARBCODE-PRAEFIX-JS OK ${R.kanarien.length + R.kanarien_titel.length}` : 'FARBCODE-PRAEFIX-JS ROT');
  process.exit(ok ? 0 : 1);
}
