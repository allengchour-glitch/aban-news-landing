const E = require(process.argv[2] || __dirname + "/engine.js");
const ok = (c, t) => { console.log((c ? "✅ " : "❌ ") + t); if (!c) process.exitCode = 1; };
const nah = (a, b) => Math.abs(a - b) < 0.005;
// 1. Takt-Umrechnung: Jahresrechnung 335 → 27.92/Monat, Quartal 300 → 100
ok(nah(E.monatlich({betrag:335,takt:"jahr"}), 27.9167) && nah(E.monatlich({betrag:300,takt:"quartal"}), 100), "Jahr/Quartal richtig auf Monat umgerechnet");
// 2. 13. Monatslohn: 13 × 6000 als Jahresbetrag = 6500/Monat
ok(nah(E.monatlich({betrag:78000,takt:"jahr"}), 6500), "13 Monatslöhne als Jahresbetrag → 6500/Monat");
const plan = {einnahmen:[{name:"Lohn",betrag:6500,takt:"monat"}], reserve:2000, ausgaben:[
  {name:"Miete",betrag:2000,takt:"monat",gruppe:"bedarf",wohnen:true},
  {name:"Steuern",betrag:9600,takt:"jahr",gruppe:"bedarf"},
  {name:"Ferien",betrag:2400,takt:"jahr",gruppe:"wunsch"},
  {name:"3a",betrag:500,takt:"monat",gruppe:"sparen"}]};
const r = E.auswerten(plan);
// 3. Summen: 2000 + 800 + 200 + 500 = 3500, Rest 3000
ok(nah(r.ausgaben, 3500) && nah(r.rest, 3000), `Ausgaben ${r.ausgaben} / Rest ${r.rest} (erwartet 3500 / 3000)`);
// 4. Rückstellung = nur nicht-monatliche Posten: 800 + 200 = 1000
ok(nah(r.rueckstellung, 1000), `Rückstellung ${r.rueckstellung} (erwartet 1000)`);
// 5. Wohnquote 2000/6500 = 30.8 %, Notreserve 3 × Bedarf (2800) = 8400, Sparen 500+3000 → (8400-2000)/3500 = 2 Monate
ok(nah(r.wohnquote, 2000/6500) && nah(r.reserveZiel, 8400) && r.monateBisReserve === 2, `Wohnquote, Reserve-Ziel ${r.reserveZiel}, ${r.monateBisReserve} Monate`);
// 6. Gegenprobe: Anteile summieren sich bei Überschuss auf 100 %
ok(nah(r.anteile.bedarf + r.anteile.wunsch + r.anteile.sparen, 1), "50/30/20-Anteile ergeben zusammen 100 %");
// 7. Defizit: kein Sparen möglich → Reserve nie erreichbar
const d = E.auswerten({einnahmen:[{betrag:3000,takt:"monat"}], ausgaben:[{betrag:3500,takt:"monat",gruppe:"bedarf"}]});
ok(d.rest < 0 && d.monateBisReserve === null, "Defizit erkannt, Reserve-Ziel nicht erreichbar");
