// Papier-Lauf (nur Spielgeld): Bitcoin ganz drin, wenn der letzte abgeschlossene Tagesschluss ueber dem 100-Tage-Schnitt liegt, sonst Cash.
// Kein Broker, keine Schluessel. Einmal pro Tag nach 00:05 UTC ausfuehren; ein Lauf je Datum (idempotent).
// Aufruf: node btc_trend_papier.mjs [ledger.json]   Kosten je Seite: Annahme 0,15 % (Gebuehr + Spread/Rutschen).
import fs from 'node:fs';
export const COST = 0.0015, N = 100, START = 1000;
export function decide(closes) { // closes: abgeschlossene Tagesschluesse, aelteste zuerst
  if (closes.length < N) return null;
  const m = closes.slice(-N).reduce((a, b) => a + b, 0) / N;
  return closes.at(-1) > m ? 'long' : 'cash';
}
export function step(led, date, price, want) {
  if (want === null || led.history.some(h => h.date === date)) return led;
  const n = structuredClone(led);
  if (want === 'long' && n.btc === 0) { const spend = n.cash; n.btc = spend * (1 - COST) / price; n.cash = 0; n.trades++; n.fees += spend * COST; }
  if (want === 'cash' && n.btc > 0) { const gross = n.btc * price; n.cash = gross * (1 - COST); n.fees += gross * COST; n.btc = 0; n.trades++; }
  n.history.push({ date, price, state: want, equity: +(n.cash + n.btc * price).toFixed(2) });
  return n;
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const file = process.argv[2] || 'ledger-btc-trend.json';
  let led = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : { paperOnly: true, start: START, cash: START, btc: 0, trades: 0, fees: 0, history: [] };
  const r = await fetch('https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=130');
  if (!r.ok) throw Error('Kursabruf HTTP ' + r.status);
  const rows = (await r.json()).filter(x => x[6] < Date.now()); // nur abgeschlossene Tage
  const closes = rows.map(x => +x[4]), date = new Date(rows.at(-1)[0]).toISOString().slice(0, 10);
  led = step(led, date, closes.at(-1), decide(closes));
  fs.writeFileSync(file, JSON.stringify(led, null, 1));
  console.log(date, 'Schluss', closes.at(-1), 'Zustand', decide(closes), 'Wert', (led.cash + led.btc * closes.at(-1)).toFixed(2), 'Trades', led.trades);
}
