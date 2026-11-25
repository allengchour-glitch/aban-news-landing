// Rechnet echte Papier-Einzeltrades (aus nachrechner_minutenprofil.mjs, Datei trades-*.json) mit Hebel, Liquidation und Gewinn-Auszahlung nach.
// Aufruf: node hebel_auszahlung.mjs trades.json [Startkapital=1000] [Marge=100]
// Modell (Annahmen, nicht Binance): Nennwert = Marge x Hebel; Gewinn und Verlust (inkl. Gebuehren) je Trade skalieren mit dem Hebel;
// Liquidation, wenn der Stop weiter weg liegt als die Liquidationsgrenze (1/Hebel - 0,5 % Erhaltungsmarge): Verlust = ganze Marge plus Gebuehr.
// Konto gemeinsam: Handel nur solange Guthaben >= Marge; am Tagesende wird alles ueber dem Startkapital ausgezahlt.
import fs from 'node:fs';
export function simuliere(trades, L, start = 1000, marge = 100) {
  const t = [...trades].sort((a, b) => a.closed - b.closed);
  let bal = start, ausgezahlt = 0, liq = 0, n = 0, tag = null, pleite = false, tage = {}, nachHandel = 0;
  for (const x of t) {
    const day = new Date(x.closed).toISOString().slice(0, 10);
    if (tag !== null && day !== tag && bal > start) { ausgezahlt += bal - start; bal = start; }
    tag = day;
    if (bal < marge) { pleite = true; continue; }
    const stopPct = Math.abs(x.stop / x.entry - 1);
    const liqPct = 1 / L - 0.005;
    let ergebnis;
    if (L > 1 && stopPct >= liqPct) { ergebnis = -(marge + marge * L * 0.001); liq++; }
    else ergebnis = x.net * (marge / x.amount) * L;
    bal += Math.max(ergebnis, -bal); n++; tage[day] = (tage[day] || 0) + ergebnis;
  }
  if (bal > start) { ausgezahlt += bal - start; bal = start; }
  return { L, trades: n, liquidiert: liq, konto: +bal.toFixed(2), ausgezahlt: +ausgezahlt.toFixed(2), pleite, gewinnJeTag: Object.fromEntries(Object.entries(tage).map(([k, v]) => [k, +v.toFixed(2)])) };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const trades = JSON.parse(fs.readFileSync(process.argv[2])), start = +(process.argv[3] || 1000), marge = +(process.argv[4] || 100);
  for (const L of [1, 10, 25, 50, 125]) console.log(JSON.stringify(simuliere(trades, L, start, marge)));
}
