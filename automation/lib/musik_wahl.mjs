/* musik_wahl.mjs — Auswahlregel v3 für die eigene Musik der Reels (18.10.2026, Betreiber «immer das gleiche ist nervend»).
 * Gegenstück in Python: automation/bild_reel_auswahl.py → musik_waehle(). Beide müssen dasselbe ergeben (Selbsttest, Parität).
 * Regeln: (1) kein Stück zweimal hintereinander (die letzten 2 raus) · (2) Stück = am längsten nicht benutzt, zeitbasiert (Stunden, bei
 * 14 Tagen gedeckelt; Gleichstand → weniger Nutzungen in 30 Tagen → pid) · (3) Fenster = das am längsten nicht benutzte Fenster des
 * Stücks; zwei Starts näher als 9 s gelten als dasselbe Fenster · (4) Fenster aus automation/music/_fenster.json (≥ 9 s Abstand),
 * Rückfall _einstiege.json. Herleitung und Messungen: dropship/MUSIK-V3-2026-10-18.md. */
import fs from 'node:fs';
export const FENSTER_ABSTAND = 9, RUHE_STUNDEN = 14 * 24, NIE = 1e6;
export const num = p => { let h = 0; for (const c of String(p)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/** pool: [datei] · verlauf: [{t, datei, start}] nach Zeit sortiert · fenster: {datei: [start]} → {datei, start} */
export function waehle(pool, pid, verlauf, fenster, jetztMs) {
  if (!pool.length) return { datei: null, start: 0 };
  const letzte2 = verlauf.slice(-2).map(v => v.datei);
  let kand = pool.length >= 3 ? pool.filter(m => !letzte2.includes(m)) : [...pool];
  if (!kand.length) kand = [...pool];
  const std = z => z.length ? Math.min((jetztMs - z[z.length - 1]) / 3.6e6, RUHE_STUNDEN) : NIE;
  const n30 = m => verlauf.filter(v => v.datei === m && jetztMs - v.t <= 30 * 864e5).length;
  const s = Object.fromEntries(kand.map(m => [m, Math.min(std(verlauf.filter(v => v.datei === m).map(v => v.t)), RUHE_STUNDEN)]));
  const beste = Math.max(...Object.values(s));
  const frei = kand.filter(m => s[m] >= beste - 1e-9).sort((a, b) => (n30(a) - n30(b)) || (a < b ? -1 : a > b ? 1 : 0));
  const wahl = frei[num(pid) % frei.length];
  const ws = (fenster[wahl] && fenster[wahl].length) ? fenster[wahl] : [0];
  const fz = Object.fromEntries(ws.map(w => [w, Math.min(std(verlauf.filter(v => v.datei === wahl && Math.abs(v.start - w) < FENSTER_ABSTAND).map(v => v.t)), RUHE_STUNDEN)]));
  const bf = Math.max(...Object.values(fz));
  const ff = ws.filter(w => fz[w] >= bf - 1e-9);
  return { datei: wahl, start: ff[Math.floor(num(pid) / 7) % ff.length] };
}

export function verlaufLesenZeit(pfad = 'social/_musik_verlauf.txt') {
  try {
    return fs.readFileSync(pfad, 'utf8').trim().split('\n').map(z => z.split('\t')).filter(f => f.length >= 5)
      .map(f => ({ t: Date.parse(f[0]) || 0, datei: f[1], start: parseFloat(f[2]) || 0 })).sort((a, b) => a.t - b.t);
  } catch { return []; }
}

export function fensterLesen(dir = 'automation/music/') {
  const lies = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
  return lies(dir + '_fenster.json', null)
    || Object.fromEntries(Object.entries(lies(dir + '_einstiege.json', {})).map(([k, v]) => [k, (v && v.einstiege) || [0]]));
}

/** Pool wie bisher bilden (Aufrufer: STIMMUNG[th] || ALLE_EIGENEN, sonst MUSIC), dann waehle(). */
export function musikWahlV3(pool, pid, { verlaufPfad = 'social/_musik_verlauf.txt', dir = 'automation/music/', jetztMs = Date.now() } = {}) {
  return waehle(pool, pid, verlaufLesenZeit(verlaufPfad), fensterLesen(dir), jetztMs);
}

export function selbsttest() {
  const T = 1_790_000_000_000, h = n => T - n * 3.6e6, fehler = [];
  const t = (n, soll, ist) => { if (JSON.stringify(soll) !== JSON.stringify(ist)) fehler.push(`${n}: erwartet ${JSON.stringify(soll)}, gemessen ${JSON.stringify(ist)}`); };
  const fenster = { 'a.wav': [10, 30], 'b.wav': [5], 'c.wav': [0, 20, 40] };
  // Die letzten 2 Stücke (b, a) fallen raus → c
  let v = [{ t: h(5), datei: 'c.wav', start: 0 }, { t: h(3), datei: 'b.wav', start: 5 }, { t: h(1), datei: 'a.wav', start: 10 }];
  t('letzte 2 raus', 'c.wav', waehle(['a.wav', 'b.wav', 'c.wav'], 'x', v, fenster, T).datei);
  // Fenster: c lief bei 0 (vor 5 h) → ein anderes Fenster als 0
  t('Fenster-LRU', true, waehle(['a.wav', 'b.wav', 'c.wav'], 'x', v, fenster, T).start !== 0);
  // nie benutztes Stück schlägt benutztes
  v = [{ t: h(50), datei: 'a.wav', start: 10 }, { t: h(40), datei: 'b.wav', start: 5 }];
  t('nie benutzt', 'c.wav', waehle(['a.wav', 'b.wav', 'c.wav'], 'x', v, fenster, T).datei);
  // kleiner Pool (< 3): Rückfall auf alle
  t('kleiner Pool', true, ['a.wav', 'b.wav'].includes(waehle(['a.wav', 'b.wav'], 'x', v, fenster, T).datei));
  t('leerer Pool', null, waehle([], 'x', v, fenster, T).datei);
  // num wie Python/JS-Referenz
  t('num', 96354, num('abc'));
  console.log('SELBSTTEST musik_wahl:', fehler.length ? 'FEHLER ' + fehler.join('; ') : 'OK (6 Fälle)');
  return fehler.length ? 1 : 0;
}
if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes('--selbsttest')) process.exit(selbsttest());
