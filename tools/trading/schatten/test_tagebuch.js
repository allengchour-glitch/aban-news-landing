// node tools/trading/schatten/test_tagebuch.js [mutante.js]
const path = require("path");
const T = require(process.argv[2] ? path.resolve(process.argv[2]) : __dirname + "/tagebuch.js");
const ok = (c, t) => { console.log((c ? "✅ " : "❌ ") + t); if (!c) process.exitCode = 1; };
const lb = { start: "2026-10-12", strategien: {
  "KI-Bot": { eintraege: [{ stand: "2026-10-12", depot: 9997 }, { stand: "2026-10-13", depot: 10100 }, { stand: "2026-10-14", depot: 9595 }] },
  "Ausgleich": { eintraege: [{ stand: "2026-10-12", depot: 9990 }] } } };
const r = T.depotReihen(lb);
ok(r.length === 2 && r[0].punkte.length === 3 && r[0].letzte.depot === 9595, "Reihen aus eintraege");
const k = T.kennzahlen(r[0].punkte);
// seit Start gegen 10 000 (nicht gegen den ersten Eintrag): 9595 → −4,05 %; Einbruch vom Hoch 10 100 → −5 %
ok(Math.abs(k.seitStart + 0.0405) < 1e-9 && Math.abs(k.einbruch + 0.05) < 1e-9, `seit Start ${k.seitStart}, Einbruch ${k.einbruch}`);
const p = T.pilotReihen({ start: "2026-10-11", tage: [
  { stand: "2026-10-11", kapital: 10000, maerkte: { BTC: { kurs: 80000, hebel: 1 } } },
  { stand: "2026-10-12", kapital: 10500, maerkte: { BTC: { kurs: 88000, hebel: 1 } } }] });
ok(p.length === 2 && p[0].punkte[1].wert === 10500 && Math.abs(p[1].punkte[1].wert - 11000) < 1e-9, "Pilot vs. Bitcoin halten (+10 %)");
ok(T.pilotReihen({ tage: [] }).length === 0 && T.kennzahlen([]) === null, "leere Logbücher");
