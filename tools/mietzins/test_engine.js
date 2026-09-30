const E = require(process.argv[2] || __dirname + "/engine.js");
const ok = (c, t) => { console.log((c ? "✅ " : "❌ ") + t); if (!c) process.exitCode = 1; };
const nah = (a, b, eps = 0.00005) => Math.abs(a - b) < eps;
// 1–2. Bekannte Werte (Mieterverband/Ratgeber): 1,50 → 1,25 = −2,91 %, 1,75 → 1,25 = −5,66 %
ok(nah(E.zinsAnteil(1.5, 1.25), -0.029126), `1,50→1,25: ${(E.zinsAnteil(1.5,1.25)*100).toFixed(2)} % (erwartet −2,91 %)`);
ok(nah(E.zinsAnteil(1.75, 1.25), -0.056604), `1,75→1,25: ${(E.zinsAnteil(1.75,1.25)*100).toFixed(2)} % (erwartet −5,66 %)`);
// 3. Gegenprobe Erhöhung: 1,25 → 1,50 = +3 % (Art. 13 Abs. 1 lit. c)
ok(nah(E.zinsAnteil(1.25, 1.5), 0.03) && E.zinsAnteil(1.25, 1.25) === 0, "Erhöhung +3 %, gleicher Satz 0");
// 4. Band 5–6 %: 5,25 → 5,00 = 1 − 1/1,025 = −2,44 %
ok(nah(E.zinsAnteil(5.25, 5), -(1 - 1 / 1.025)), "Band 5–6 %: −2,44 %");
// 5. Teuerung: LIK 100 → 105 = +5 %, davon 40 % = +2 %
ok(nah(E.teuerungAnteil(100, 105), 0.02) && E.teuerungAnteil("", 105) === 0, "Teuerung 40 % von +5 % = +2 %, fehlender LIK = 0");
// 6. Gesamt: 2000 netto, 1,75→1,25, LIK 104→106, 12 Monate à 0,5 % → −5,660 + 0,769 + 0,5 = −4,391 % → 1912.20
const r = E.berechnen({ netto: 2000, zinsAlt: 1.75, zinsNeu: 1.25, likAlt: 104, likNeu: 106, festlegung: "2025-06-01", heute: "2026-06-15", kostenProJahr: 0.005 });
ok(r.monate === 12 && nah(r.total, -0.056604 + 0.4 * (106 / 104 - 1) + 0.005) && r.nettoNeu === 1912.2 && r.anspruch,
  `Gesamt ${(r.total*100).toFixed(3)} %, neu ${r.nettoNeu} (erwartet 1912.20), Monate ${r.monate}`);
// 7. Termin: Zugang 15.10.2026, 3 Monate, jedes Monatsende ausser Dezember → 31.01.2027, wirksam ab 01.02.2027
const t = E.naechsterTermin("2026-10-15", 3, [1,2,3,4,5,6,7,8,9,10,11]);
ok(t.termin === "2027-01-31" && t.wirksamAb === "2027-02-01" && t.spaetestensZugang === "2026-10-31", `Termin ${t.termin}, ab ${t.wirksamAb}`);
// 8. Gegenprobe: einen Tag zu spät (01.11.) → ein Monat später
ok(E.naechsterTermin("2026-11-01", 3, [1,2,3,4,5,6,7,8,9,10,11]).termin === "2027-02-28", "Zugang 01.11. → 28.02.2027");
// 9. Dezember ausgeschlossen: Zugang 15.09. → 31.12. wäre möglich, ist aber kein Termin → 31.01.
ok(E.naechsterTermin("2026-09-15", 3, [1,2,3,4,5,6,7,8,9,10,11]).termin === "2027-01-31", "Dezember übersprungen");
// 10. Nur ortsübliche Termine Ende März/Juni/Sept: Zugang 15.10.2026 → 31.03.2027
ok(E.naechsterTermin("2026-10-15", 3, [3,6,9]).termin === "2027-03-31", "Nur März/Juni/Sept → 31.03.2027");
// 11. Fristen Art. 270a Abs. 2 OR
const f = E.berechnen({ netto: 1500, zinsAlt: 1.5, zugang: "2026-10-15", frist: 3 });
ok(f.antwortBis === "2026-11-14" && f.schlichtungBis === "2026-12-14", `Antwort bis ${f.antwortBis}, Schlichtung bis ${f.schlichtungBis}`);
// 12. Kein Anspruch, wenn die Teuerung die Senkung übersteigt
ok(!E.berechnen({ netto: 1500, zinsAlt: 1.5, likAlt: 90, likNeu: 100 }).anspruch, "Teuerung frisst Senkung → kein Anspruch");
