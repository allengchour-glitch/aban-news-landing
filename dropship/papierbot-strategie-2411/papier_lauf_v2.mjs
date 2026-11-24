// Papier-Lauf v2 (nur Spielgeld, keine Schluessel, keine Orders): zwei getrennte Ledger, taeglich nach 00:05 UTC.
//  A: Bitcoin ueber SMA100 sonst Cash (Regel unveraendert, jetzt mit Begruendung je Entscheid und Risiko bis Trendbruch)
//  B: Korb aus bis zu 30 Coins: Trend ueber SMA100 + Bitcoin-Filter, Gewicht ~ 1/Schwankung (30 Tage), je Coin max 25 %
// Aufruf: node papier_lauf_v2.mjs <ordner>   (schreibt ledger-btc-trend.json und ledger-korb.json; ein Lauf je Datum)
import fs from 'node:fs';
export const COST = 0.0015, N = 100, START = 1000, CAP = 0.25, VOLN = 30;
export const COINS = ['BTC','ETH','BNB','XRP','ADA','DOGE','SOL','LTC','LINK','DOT','AVAX','BCH','TRX','XLM','ATOM','UNI','NEAR','AAVE','ETC','FIL','ALGO','VET','EOS','XTZ','SAND','MANA','SHIB','SUI','APT','ARB'].map(s => s + 'USDT');
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
export const sma = (c, n = N) => c.length >= n ? mean(c.slice(-n)) : null;
export function vol(c, n = VOLN) { if (c.length < n + 1) return null; const r = []; for (let i = c.length - n; i < c.length; i++) r.push(Math.log(c[i] / c[i - 1])); const m = mean(r); return Math.sqrt(mean(r.map(x => (x - m) ** 2))); }
// ---- Ledger A
export function decideA(closes) {
  const m = sma(closes); if (m === null) return null;
  const c = closes.at(-1), v = vol(closes);
  const long = c > m, dist = (c / m - 1) * 100;
  return { want: long ? 'long' : 'cash', close: c, sma100: +m.toFixed(2), abstandProzent: +dist.toFixed(2), vol30Tag: v === null ? null : +(v * 100).toFixed(2),
    risikoBisTrendbruchProzent: long ? +dist.toFixed(2) : 0,
    reason: long ? `Schluss ${c} liegt ${dist.toFixed(1)} % ueber dem 100-Tage-Schnitt ${m.toFixed(0)}: Trend an, voll Bitcoin` : `Schluss ${c} liegt ${Math.abs(dist).toFixed(1)} % unter dem 100-Tage-Schnitt ${m.toFixed(0)}: Trend aus, Cash` };
}
export function stepA(led, date, d) {
  if (!d || led.history.some(h => h.date === date)) return led;
  const n = structuredClone(led), price = d.close; let aktion = 'keine';
  if (d.want === 'long' && n.btc === 0) { const s = n.cash; n.btc = s * (1 - COST) / price; n.cash = 0; n.trades++; n.fees += s * COST; aktion = 'Kauf'; }
  if (d.want === 'cash' && n.btc > 0) { const g = n.btc * price; n.cash = g * (1 - COST); n.fees += g * COST; n.btc = 0; n.trades++; aktion = 'Verkauf'; }
  n.history.push({ date, price, state: d.want, aktion, reason: d.reason, sma100: d.sma100, risikoBisTrendbruchProzent: d.risikoBisTrendbruchProzent, equity: +(n.cash + n.btc * price).toFixed(2) });
  return n;
}
// ---- Ledger B (Korb)
export function weightsB(data) { // data: {SYMBOL: [abgeschlossene Tagesschluesse]}
  const btc = data.BTCUSDT; const m = btc && sma(btc);
  if (m === null || !btc || !(btc.at(-1) > m)) return { w: {}, why: 'Bitcoin unter dem 100-Tage-Schnitt: Korb in Cash' };
  const el = []; for (const [s, c] of Object.entries(data)) { const a = sma(c), v = vol(c); if (a !== null && v && c.at(-1) > a) el.push([s, 1 / v]); }
  if (!el.length) return { w: {}, why: 'Kein Coin ueber seinem 100-Tage-Schnitt: Cash' };
  const tot = el.reduce((a, [, x]) => a + x, 0), w = {}; for (const [s, x] of el) w[s] = Math.min(CAP, x / tot);
  return { w, why: `${el.length} Coins im Trend, Gewicht ~ 1/Schwankung, je Coin hoechstens ${CAP * 100} %` };
}
export function stepB(led, date, prices, w, why) {
  if (led.history.some(h => h.date === date)) return led;
  const n = structuredClone(led);
  const eq = n.cash + Object.entries(n.hold).reduce((a, [s, u]) => a + u * (prices[s] ?? 0), 0);
  let turn = 0; for (const s of new Set([...Object.keys(w), ...Object.keys(n.hold)])) turn += Math.abs((w[s] || 0) * eq - (n.hold[s] || 0) * (prices[s] ?? 0));
  const fee = turn * COST, eq2 = eq - fee; n.fees += fee;
  n.hold = {}; let used = 0; for (const [s, x] of Object.entries(w)) { n.hold[s] = x * eq2 / prices[s]; used += x; }
  n.cash = eq2 * (1 - used); if (turn > 1e-9) n.trades++;
  n.history.push({ date, reason: why, gewichte: Object.fromEntries(Object.entries(w).map(([s, x]) => [s, +x.toFixed(3)])), umschichtung: +turn.toFixed(2), equity: +eq2.toFixed(2) });
  return n;
}
const load = (f, init) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : init;
async function klines(s) { const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${s}&interval=1d&limit=130`); if (!r.ok) throw Error(s + ' HTTP ' + r.status); return (await r.json()).filter(x => x[6] < Date.now()); }
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const dir = process.argv[2] || '.'; const data = {}, dates = {};
  for (const s of COINS) { try { const k = await klines(s); data[s] = k.map(x => +x[4]); dates[s] = new Date(k.at(-1)[0]).toISOString().slice(0, 10); } catch (e) { console.log('uebersprungen', s, e.message); } }
  const date = dates.BTCUSDT; if (!date) throw Error('Bitcoin-Kurse fehlen');
  for (const s of Object.keys(data)) if (dates[s] !== date) { delete data[s]; console.log('anderes Datum, ausgelassen', s); }
  const fa = dir + '/ledger-btc-trend.json', fb = dir + '/ledger-korb.json';
  let A = load(fa, { paperOnly: true, start: START, cash: START, btc: 0, trades: 0, fees: 0, history: [] });
  A = stepA(A, date, decideA(data.BTCUSDT)); fs.writeFileSync(fa, JSON.stringify(A, null, 1));
  let B = load(fb, { paperOnly: true, start: START, cash: START, hold: {}, trades: 0, fees: 0, history: [] });
  const { w, why } = weightsB(data); const px = Object.fromEntries(Object.entries(data).map(([s, c]) => [s, c.at(-1)]));
  // gehaltene Coins ohne Kurs heute: mit letztem bekannten Wert nicht handelbar -> Lauf abbrechen statt falsch rechnen
  for (const s of Object.keys(B.hold)) if (px[s] === undefined) throw Error('Kurs fehlt fuer gehaltenen Coin ' + s);
  B = stepB(B, date, px, w, why); fs.writeFileSync(fb, JSON.stringify(B, null, 1));
  console.log(date, 'A:', (A.history.at(-1).reason ?? 'altes Format ohne Begruendung'), '| Wert', A.history.at(-1).equity, '| B:', B.history.at(-1).reason, '| Wert', B.history.at(-1).equity);
}
