// node tools/umzug/test_engine.js
const U = require('./engine.js');
let ok = true;
const t = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); if (!c) ok = false; };

// 3 Monate auf Monatsende ausser Dezember: Brief kommt am 15.10.2026 an → Ende Januar 2027 (Fristbeginn 1.11.)
let k = U.kuendigung({ zugang: '2026-10-15', fristMonate: 3, termine: [1,2,3,4,5,6,7,8,9,10,11], miete: 1800 });
t(k.termin === '2027-01-31' && k.spaetestensZugang === '2026-10-31', `15.10. → Termin ${k.termin}, letzter Zugangstag ${k.spaetestensZugang}`);
t(k.aufgebenBis <= '2026-10-24' && !['Sat','Sun'].includes(new Date(k.aufgebenBis+'T12:00').toDateString().slice(0,3)), `Post aufgeben bis ${k.aufgebenBis} (Werktag, 7 Tage Puffer)`);
// Ankunft am 1.11. → Februar
k = U.kuendigung({ zugang: '2026-11-01', fristMonate: 3, termine: [1,2,3,4,5,6,7,8,9,10,11] });
t(k.termin === '2027-02-28', `1.11. → ${k.termin}`);
// Dezember ausgeschlossen: Ankunft 15.9. → Fristbeginn Okt → Ende Dez ausgeschlossen → Ende Jan
k = U.kuendigung({ zugang: '2026-09-15', fristMonate: 3, termine: [1,2,3,4,5,6,7,8,9,10,11] });
t(k.termin === '2027-01-31', `Dezember kein Termin: 15.9. → ${k.termin}`);
// Nur Ende März und Ende September (Art. 266c + Ortsgebrauch), Ankunft 2.7. → Ende September zu knapp? Frist 3 Mt: spätestens 30.6. → nächster: Ende März
k = U.kuendigung({ zugang: '2026-07-02', fristMonate: 3, termine: [3, 9] });
t(k.termin === '2027-03-31', `nur März/September, Ankunft 2.7. → ${k.termin}`);
k = U.kuendigung({ zugang: '2026-06-30', fristMonate: 3, termine: [3, 9] });
t(k.termin === '2026-09-30', `Ankunft 30.6. reicht für Ende September`);
// Miete bis Termin, vorzeitiger Auszug (Art. 264)
k = U.kuendigung({ zugang: '2026-10-15', fristMonate: 3, termine: [1,2,3,4,5,6,7,8,9,10,11], miete: 1800, auszug: '2026-11-30' });
t(k.monateMiete === 4 && k.mieteBisTermin === 7200, 'Oktober bis Januar = 4 Monatsmieten');
t(k.vorzeitig && k.vorzeitig.monate === 2 && k.vorzeitig.ersparnis === 3600, 'Auszug Ende November: Nachmieter spart 2 Monatsmieten');
const k1 = U.kuendigung({ zugang: '2026-10-15', termine: [1,2,3,4,5,6,7,8,9,10,11], miete: 1000, auszug: '2026-12-01' });
t(k1.vorzeitig.monate === 2, 'Auszug am 1.12.: Dezember + Januar = 2 Monate (Prüfer-Fund 9)');
const kn = U.kuendigung({ zugang: '2026-10-15', termine: [1,2,3,4,5,6,7,8,9,10,11], auszug: '2027-03-31', heute: '2026-10-01' });
t(!kn.vorzeitig && kn.warnungen.includes('auszugNachTermin'), 'Auszug nach dem Termin: Warnung');
const kv = U.kuendigung({ zugang: '2020-01-15', termine: [1,2,3,4,5,6,7,8,9,10,11], heute: '2026-10-01' });
t(kv.warnungen.includes('zugangVergangen'), 'Zugang in der Vergangenheit: Warnung (Prüfer-Blocker 2)');
const kz = U.kuendigung({ zugang: '2026-10-29', termine: [1,2,3,4,5,6,7,8,9,10,11], heute: '2026-10-27' });
t(kz.warnungen.includes('knapp') && kz.warnungen.includes('zugangWochenende'), '31.10.2026 = Samstag und Postaufgabe vorbei: zwei Warnungen (Prüfer-Blocker 1)');
t(kz.warnungen.includes('terminWochenende'), 'Mietende So 31.1.2027: Warnung');
t(U.kuendigung({ zugang: '2026-10-15', fristMonate: 1, termine: [1,2,3,4,5,6,7,8,9,10,11] }).frist === 3, 'Frist unter 3 Monaten wird auf 3 angehoben (Art. 266c)');
// Plan
const p = U.plan('2027-01-31', U.kuendigung({ zugang: '2026-10-15', fristMonate: 3, termine: [1,2,3,4,5,6,7,8,9,10,11] }));
t(p[0].id === 'kuendigen' && p.find((x) => x.id === 'offerten').datum === '2026-12-02', 'Plan sortiert, Offerten 60 Tage vorher');
t(p.find((x) => x.id === 'gemeinde').datum === '2027-02-03' && p.find((x) => x.id === 'abgabe').datum === '2027-01-31' && p.find((x) => x.id === 'abmelden').datum === '2027-01-26', 'Abmeldung 5 Tage vorher, Anmeldung 3 Tage danach, Abgabe am Termin');
t(p.every((x) => x.datum), 'jede Aufgabe hat ein Datum');
t(U.werktagDavor('2026-10-25') === '2026-10-23', 'Sonntag → Freitag');
process.exit(ok ? 0 : 1);
