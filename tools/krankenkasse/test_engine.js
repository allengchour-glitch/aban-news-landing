const E = require(process.argv[2] || __dirname + "/engine.js");
const ok = (c, t) => { console.log((c ? "✅ " : "❌ ") + t); if (!c) process.exitCode = 1; };
const nah = (a, b) => Math.abs(a - b) < 0.01;
// 1. Eigenanteil Erwachsene: 0 Kosten → 0; 200 bei Franchise 300 → 200; 2000 bei 300 → 300 + 170 = 470; sehr hoch → 300 + 700
ok(E.eigenanteil(0, 300) === 0 && E.eigenanteil(200, 300) === 200 && nah(E.eigenanteil(2000, 300), 470) && E.eigenanteil(50000, 300) === 1000, "Eigenanteil 300: 0 / 200 / 470 / Deckel 1000");
// 2. Franchise 2500: 2000 Kosten → 2000 (noch in der Franchise); 50000 → 2500 + 700 = 3200
ok(E.eigenanteil(2000, 2500) === 2000 && E.eigenanteil(50000, 2500) === 3200, "Franchise 2500: 2000 bzw. Deckel 3200");
// 3. Kinder: Selbstbehalt-Deckel 350, Franchise 0 möglich
ok(E.eigenanteil(10000, 0, "kind") === 350 && nah(E.eigenanteil(1000, 0, "kind"), 100), "Kind: Franchise 0, 10 % bis höchstens 350");
// 4. Gegenprobe Art. 103: Deckel 700 Erwachsene, 350 Kinder
ok(E.SB_MAX.erwachsen === 700 && E.SB_MAX.kind === 350 && E.FRANCHISEN.erwachsen.join() === "300,500,1000,1500,2000,2500" && E.FRANCHISEN.kind.join() === "0,100,200,300,400,500,600", "Franchisen und Deckel laut KVV Art. 93/103");
// 5. Vergleich: Prämien 420 (300) vs 300 (2500). Kosten 500: 5040+300+20=5360 vs 3600+500=4100 → 2500 günstiger
const opt = [{ franchise: 300, praemie: 420 }, { franchise: 2500, praemie: 300 }];
let v = E.vergleich(opt, 500);
ok(v.beste.franchise === 2500 && nah(v.liste[0].jahr, 5360) && nah(v.liste[1].jahr, 4100), `wenig Kosten → 2500 (${v.liste.map(x => x.jahr)})`);
// 6. Hohe Kosten 8000: 5040+300+700=6040 vs 3600+2500+550=6650 → 300 günstiger
v = E.vergleich(opt, 8000);
ok(v.beste.franchise === 300 && nah(v.liste[1].jahr, 6650), "viele Kosten → 300");
// 7. Gewinnschwelle: Differenz Prämie 1440/Jahr; ab k mit gleichen Kosten. Prüfen: bei schwelle ±50 kippt die Wahl
const s = v.schwelle;
ok(s > 0 && E.vergleich(opt, s - 50).beste.franchise === 2500 && E.vergleich(opt, s + 50).beste.franchise === 300, `Gewinnschwelle ${Math.round(s)} (darunter 2500, darüber 300)`);
// 8. Maximum: 300 → 5040+1000 = 6040; 2500 → 3600+3200 = 6800
ok(nah(v.liste[0].max, 6040) && nah(v.liste[1].max, 6800), "schlimmster Fall pro Franchise");
// 9. Fristen: heute 1.10.2026 → Eintreffen bis 30.11.2026, wirksam 1.1.2027; ordentlich bis 31.3.2027 auf 1.7.2027 (30.9. ist vorbei)
let f = E.fristen("2026-10-01");
ok(f.mitPraemie.eintreffenBis === "2026-11-30" && f.mitPraemie.wirksam === "2027-01-01" && f.ordentlich.eintreffenBis === "2027-03-31" && f.ordentlich.wirksam === "2027-07-01", JSON.stringify(f));
// 10. Gegenprobe: am 30.11. noch möglich, am 1.12. verpasst → nächstes Jahr
ok(E.fristen("2026-11-30").mitPraemie.wirksam === "2027-01-01" && E.fristen("2026-12-01").mitPraemie.verpasst && E.fristen("2026-12-01").mitPraemie.wirksam === "2028-01-01", "30.11. noch, 1.12. verpasst");
// 11. Abschick-Empfehlung 10 Tage vorher; Tage bis Frist
ok(f.abschickenBis === "2026-11-20" && f.tageBis === 60, `abschicken bis ${f.abschickenBis}, noch ${f.tageBis} Tage`);
// 12. Ordentlich im Frühling: 15.3. → bis 31.3. auf 1.7.
ok(E.fristen("2026-03-15").ordentlich.wirksam === "2026-07-01", "ordentlich 15.3. → 1.7.");
