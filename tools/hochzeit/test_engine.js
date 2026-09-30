const E = require(process.argv[2] || __dirname + "/engine.js");
const ok = (c, t) => { console.log((c ? "✅ " : "❌ ") + t); if (!c) process.exitCode = 1; };
const nah = (a, b) => Math.abs(a - b) < 0.005;
const plan = { gaeste: 80, budget: 30000, posten: [
  { name: "Location", betrag: 3000, anzahlung: 0.5, anzahlungMonate: 12 },
  { name: "Essen", betrag: 150, proGast: true, anzahlung: 0.3, anzahlungMonate: 3 },
  { name: "Foto", betrag: 3500, anzahlung: 0.3, anzahlungMonate: 9, bezahlt: 1050 },
  { name: "Papeterie", betrag: 8, proGast: true, anzahlung: 1, anzahlungMonate: 5 } ] };
const r = E.auswerten(plan);
// 1. Total: 3000 + 150×80 + 3500 + 8×80 = 19140, pro Gast 239.25
ok(nah(r.total, 19140) && nah(r.proGast, 239.25), `Total ${r.total}, pro Gast ${r.proGast}`);
// 2. Gäste-Hebel: jeder zusätzliche Gast kostet 158; fix 6500 → max (30000−6500)/158 = 148 Gäste
ok(nah(r.proZusatzgast, 158) && nah(r.fix, 6500) && r.maxGaeste === 148, `+1 Gast ${r.proZusatzgast}, fix ${r.fix}, max ${r.maxGaeste}`);
// 3. Gegenprobe max. Gäste: mit 148 im Budget, mit 149 darüber
ok(E.auswerten({ ...plan, gaeste: 148 }).rest >= 0 && E.auswerten({ ...plan, gaeste: 149 }).rest < 0, "148 Gäste passen, 149 nicht");
// 4. Zahlungsplan: Hochzeit 2027-08-14, heute 2026-10-01
const z = E.auswerten({ ...plan, datum: "2027-08-14", heute: "2026-10-01", gespart: 5000, sparenMonat: 1000 });
const loc = z.zahlungen.find(x => x.name === "Location" && x.art === "Anzahlung");
ok(loc.datum === "2026-10-01" && nah(loc.betrag, 1500), `Location-Anzahlung (12 Mt. vorher = 1.8.2026, liegt zurück) → heute ${loc.datum}, ${loc.betrag}`);
ok(!z.zahlungen.some(x => x.name === "Foto" && x.art === "Anzahlung") && nah(z.zahlungen.find(x => x.name === "Foto").betrag, 2450), "Foto: Anzahlung schon bezahlt, Rest 2450 am Hochzeitstag");
ok(z.zahlungen.find(x => x.name === "Essen" && x.art === "Anzahlung").datum === "2027-05-01", "Essen-Anzahlung 3 Monate vorher = 1.5.2027");
// 5. Summe aller Zahlungen = offen
ok(nah(z.zahlungen.reduce((a, x) => a + x.betrag, 0), z.offen) && nah(z.offen, 19140 - 1050), `Zahlungen = offen (${z.offen})`);
// 6. Sparrate: bis 14.8.2027 (10 Monate) fehlen 18090 − 5000 = 13090 → 1309/Monat; frühere Termine sind weniger streng
ok(z.monateBis === 10 && nah(z.sparrateNoetig, 1309), `Sparrate nötig ${z.sparrateNoetig.toFixed(2)} (erwartet 1309)`);
// 7. Mit 1000/Monat entsteht eine Lücke am Hochzeitstag: 5000 + 10×1000 = 15000 < 18090
ok(z.luecke && z.luecke.datum === "2027-08-14" && nah(z.luecke.fehlt, 3090), `Lücke ${JSON.stringify(z.luecke)}`);
// 8. Gegenprobe: mit 1309/Monat keine Lücke
ok(E.auswerten({ ...plan, datum: "2027-08-14", heute: "2026-10-01", gespart: 5000, sparenMonat: 1309 }).luecke === null, "1309/Monat reicht");
