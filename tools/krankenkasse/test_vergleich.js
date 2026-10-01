// Tests Kassenvergleich mit den echten BAG-Daten 2027.  node tools/krankenkasse/test_vergleich.js [mutante.js]
const path = require("path"), fs = require("fs");
const V = require(process.argv[2] ? path.resolve(process.argv[2]) : __dirname + "/vergleich.js");
const D = path.join(__dirname, "../../data/krankenkassen/2027/");
const idx = JSON.parse(fs.readFileSync(D + "index.json", "utf8"));
const kt = (k) => JSON.parse(fs.readFileSync(D + k + ".json", "utf8"));
const ok = (c, t) => { console.log((c ? "✅ " : "❌ ") + t); if (!c) process.exitCode = 1; };
const ZH = kt("ZH"), BE = kt("BE");

// 1. Belegter Wert (unabhängig veröffentlicht): Stadt Zürich, Erwachsene, ohne Unfall, Franchise 2500 → Sanitas TelMed Basic CHF 384.05, günstigste
let l = V.liste(ZH, idx.kassen, { region: V.region(idx, "ZH", 261), alter: "E", unfall: 0, franchise: 2500, kosten: 0 });
ok(l[0].name === "Sanitas" && l[0].tarif === "TelMed Basic" && l[0].praemie === 384.05, `Zürich 2500: ${l[0].name} ${l[0].tarif} ${l[0].praemie}`);
// 2. Teuerstes Angebot gleiche Person: Galenos BASE 581.70 (aus der BAG-Tabelle)
ok(l[l.length - 1].name === "Galenos" && l[l.length - 1].praemie === 581.7, `teuerstes: ${l[l.length - 1].name} ${l[l.length - 1].praemie}`);
// 3. Jahreskosten = 12 × Prämie + Franchise-Anteil; bei 0 Kosten nur Prämie
ok(Math.abs(l[0].jahr - 12 * 384.05) < 1e-6, "Jahr = 12 × Prämie bei 0 Arztkosten");
// 4. Alle Kassen im Kanton: pro Kasse genau ein Eintrag, 27 Kassen in ZH
const pk = V.proKasse(l);
ok(pk.length === idx.kantone.ZH.kassen && new Set(pk.map(x => x.kasse)).size === pk.length, `${pk.length} Kassen in ZH, jede einmal`);
// 5. Region: Zürich 1, Winterthur 2, Kanton ohne Regionen 0, unbekannte Gemeinde null
ok(V.region(idx, "ZH", 261) === 1 && V.region(idx, "ZH", 230) === 2 && V.region(idx, "AG", 4001) === 0 && V.region(idx, "ZH", 999999) === null, "Regionen Zürich/Winterthur/AG");
// 6. Gegenprobe Region: das günstigste Angebot auf dem Land (Region 3) ist billiger als in der Stadt
const r3 = V.liste(ZH, idx.kassen, { region: 3, alter: "E", unfall: 0, franchise: 2500, kosten: 0 });
ok(r3[0].praemie < l[0].praemie, `Region 3 ${r3[0].praemie} < Region 1 ${l[0].praemie}`);
// 7. Modell-Filter: nur Standard → nur BASE, und teurer als mit allen Modellen
const base = V.liste(ZH, idx.kassen, { region: 1, alter: "E", unfall: 0, franchise: 2500, typen: ["BASE"] });
ok(base.length > 0 && base.every(x => x.typ === "BASE") && base[0].praemie > l[0].praemie, `nur Standard: ${base.length}, ab ${base[0].praemie}`);
// 8. Mit Unfall ist teurer als ohne (gleicher Tarif)
const mu = V.liste(ZH, idx.kassen, { region: 1, alter: "E", unfall: 1, franchise: 2500 }).find(x => x.kasse === 1509 && x.tarif === "TelMed Basic");
ok(mu && mu.praemie > 384.05, `mit Unfall ${mu && mu.praemie} > 384.05`);
// 9. «beste» Franchise: ohne Arztkosten fast immer 2500, bei 10 000 Kosten meist 300
const b0 = V.liste(ZH, idx.kassen, { region: 1, alter: "E", unfall: 0, franchise: "beste", kosten: 0 });
const b9 = V.liste(ZH, idx.kassen, { region: 1, alter: "E", unfall: 0, franchise: "beste", kosten: 10000 });
const anteil = (x, f) => x.filter(y => y.franchise === f).length / x.length;
ok(anteil(b0, 2500) > 0.9 && anteil(b9, 300) > 0.6, `beste Franchise: 0 Kosten → 2500 (${anteil(b0, 2500).toFixed(2)}), 10 000 → 300 (${anteil(b9, 300).toFixed(2)})`);
// 10. Kinder: Franchise 0 vorhanden, Selbstbehalt-Deckel 350 im schlimmsten Fall
const k0 = V.liste(ZH, idx.kassen, { region: 1, alter: "K", unfall: 1, franchise: 0, kosten: 0 });
ok(k0.length > 0 && Math.abs(k0[0].max - (12 * k0[0].praemie + 350)) < 1e-6, `Kind Franchise 0: ab ${k0[0].praemie}, max = 12×P + 350`);
// 11. Eingeschränkte Tarife: Visana «HMO plus» Bern-Region 1 gibt es in der Stadt Bern (351), nicht in Biel (371)
const hmo = (bfs) => V.liste(BE, idx.kassen, { region: 1, alter: "E", unfall: 0, franchise: 300, bfs }).some(x => x.kasse === 1555 && x.tarif === "HMO plus");
ok(hmo(351) && !hmo(371), "HMO plus: Bern ja, Biel nein");
// 12. Ersparnis: jetzt teuerstes → Wechsel zum günstigsten spart die Differenz
const e = V.ersparnis(l, l[l.length - 1]);
ok(Math.abs(e.betrag - 12 * (581.7 - 384.05)) < 1e-6, `Ersparnis ${e.betrag.toFixed(2)} pro Jahr`);
