// Papier-Lauf v3 (nur Spielgeld, keine Schluessel, keine Orders): FUENF getrennte Bots mit je 1000 Papier-USDT, taeglich nach 00:05 UTC.
//  1 Bitcoin-Trend (SMA100)            ledger-btc-trend.json   (aus v2)
//  2 Korb Trend + 1/Schwankung         ledger-korb.json        (aus v2)
//  3 Donchian-Ausbruch 50/20 long      ledger-donchian.json    (bis 5 Coins, je 20 %)
//  4 Momentum 30 Tage Top 5            ledger-momentum.json    (nur wenn Bitcoin ueber SMA200)
//  5 Rueckkehr zum Mittel (Bollinger)  ledger-rueckkehr.json   (Kauf unter unterem Band 20/2, Verkauf ueber SMA20, bis 5 Coins, Bitcoin ueber SMA200)
// Aufruf: node papier_lauf_v3.mjs <ordner>   (braucht papier_lauf_v2.mjs im selben Ordner)
import fs from 'node:fs';
import { COINS, decideA, stepA, weightsB, stepB, sma } from './papier_lauf_v2.mjs';
export const MAXPOS = 5, SLOT = 0.2;
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
// data: {SYM: {c:[Schluss], h:[Hoch], l:[Tief]}} nur abgeschlossene Tage, aelteste zuerst
const btcOk200 = d => { const c = d.BTCUSDT?.c; const m = c && sma(c, 200); return m !== null && !!c && c.at(-1) > m; };
export function donchianW(d, held) {
  const out = {}, why = []; let n = 0;
  for (const s of held) { const x = d[s]; if (!x || x.l.length < 21) { out[s] = SLOT; n++; continue; } const lo = Math.min(...x.l.slice(-21, -1)); if (x.c.at(-1) < lo) why.push(`${s} raus: Schluss unter 20-Tage-Tief`); else { out[s] = SLOT; n++; } }
  for (const [s, x] of Object.entries(d)) { if (n >= MAXPOS) break; if (out[s] !== undefined || x.h.length < 51) continue; const hi = Math.max(...x.h.slice(-51, -1)); if (x.c.at(-1) > hi) { out[s] = SLOT; n++; why.push(`${s} rein: Schluss ueber 50-Tage-Hoch`); } }
  return { w: out, why: why.join('; ') || (n ? 'Bestand gehalten' : 'kein Ausbruch: Cash') };
}
export function momentumW(d) {
  if (!btcOk200(d)) return { w: {}, why: 'Bitcoin unter dem 200-Tage-Schnitt: Cash' };
  const r = Object.entries(d).filter(([, x]) => x.c.length > 30).map(([s, x]) => [s, x.c.at(-1) / x.c.at(-31) - 1]).sort((a, b) => b[1] - a[1]).slice(0, MAXPOS);
  const w = {}; for (const [s] of r) w[s] = SLOT;
  return { w, why: 'Top ' + r.length + ' nach 30-Tage-Rendite: ' + r.map(([s, v]) => s.replace('USDT', '') + ' ' + (v * 100).toFixed(0) + '%').join(', ') };
}
export function rueckkehrW(d, held) {
  const out = {}, why = []; let n = 0;
  for (const s of held) { const x = d[s]; if (!x) { out[s] = SLOT; n++; continue; } const m = mean(x.c.slice(-20)); if (x.c.at(-1) > m) why.push(`${s} raus: Schluss ueber SMA20`); else { out[s] = SLOT; n++; } }
  if (btcOk200(d)) for (const [s, x] of Object.entries(d)) { if (n >= MAXPOS) break; if (out[s] !== undefined || x.c.length < 21) continue; const w20 = x.c.slice(-20), m = mean(w20), sd = Math.sqrt(mean(w20.map(v => (v - m) ** 2))); if (x.c.at(-1) < m - 2 * sd) { out[s] = SLOT; n++; why.push(`${s} rein: Schluss unter dem unteren Band`); } }
  return { w: out, why: why.join('; ') || (n ? 'Bestand gehalten' : 'kein Signal: Cash') };
}
const load = (f, init) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : init;
const fresh = () => ({ paperOnly: true, start: 1000, cash: 1000, hold: {}, trades: 0, fees: 0, history: [] });
async function klines(s) { const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${s}&interval=1d&limit=220`); if (!r.ok) throw Error(s + ' HTTP ' + r.status); return (await r.json()).filter(x => x[6] < Date.now()); }
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const dir = process.argv[2] || '.'; const d = {}, dates = {};
  for (const s of COINS) { try { const k = await klines(s); d[s] = { c: k.map(x => +x[4]), h: k.map(x => +x[2]), l: k.map(x => +x[3]) }; dates[s] = new Date(k.at(-1)[0]).toISOString().slice(0, 10); } catch (e) { console.log('uebersprungen', s, e.message); } }
  const date = dates.BTCUSDT; if (!date) throw Error('Bitcoin-Kurse fehlen');
  for (const s of Object.keys(d)) if (dates[s] !== date) { delete d[s]; console.log('anderes Datum, ausgelassen', s); }
  const px = Object.fromEntries(Object.entries(d).map(([s, x]) => [s, x.c.at(-1)])), closes = Object.fromEntries(Object.entries(d).map(([s, x]) => [s, x.c]));
  const fa = dir + '/ledger-btc-trend.json'; let A = load(fa, { paperOnly: true, start: 1000, cash: 1000, btc: 0, trades: 0, fees: 0, history: [] });
  A = stepA(A, date, decideA(closes.BTCUSDT)); fs.writeFileSync(fa, JSON.stringify(A, null, 1));
  const summary = [['A Bitcoin-Trend', A.history.at(-1).equity]];
  const bots = [['ledger-korb.json', 'B Korb', () => weightsB(closes)], ['ledger-donchian.json', '3 Donchian', L => donchianW(d, Object.keys(L.hold))], ['ledger-momentum.json', '4 Momentum', () => momentumW(d)], ['ledger-rueckkehr.json', '5 Rueckkehr', L => rueckkehrW(d, Object.keys(L.hold))]];
  for (const [file, name, fn] of bots) {
    let L = load(dir + '/' + file, fresh());
    for (const s of Object.keys(L.hold)) if (px[s] === undefined) throw Error(name + ': Kurs fehlt fuer gehaltenen Coin ' + s);
    const { w, why } = fn(L); L = stepB(L, date, px, w, why); fs.writeFileSync(dir + '/' + file, JSON.stringify(L, null, 1)); summary.push([name, L.history.at(-1).equity]);
  }
  console.log(date, summary.map(([n, e]) => n + ' ' + e).join(' | '));
}
