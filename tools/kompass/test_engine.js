// Tests: node tools/kompass/test_engine.js — prüft den Gesamtplan gegen die einzelnen, schon geprüften Engines.
const K = require('./engine.js');
const dep = { BudgetEngine: require('../budget/engine.js'), SchuldenEngine: require('../schulden/engine.js'), MietzinsEngine: require('../mietzins/engine.js') };
let ok = true;
const t = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); if (!c) ok = false; };
const nah = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

// Budget OHNE Kreditraten (die stehen in den Schulden): Rest 1050
const budget = { einnahmen: [{ betrag: 5600, takt: 'monat' }], reserve: 1000, ausgaben: [
  { name: 'Miete', betrag: 1800, takt: 'monat', gruppe: 'bedarf', wohnen: true },
  { name: 'Krankenkasse', betrag: 450, takt: 'monat', gruppe: 'bedarf' },
  { name: 'Steuern', betrag: 7200, takt: 'jahr', gruppe: 'bedarf' },
  { name: 'Leben', betrag: 1200, takt: 'monat', gruppe: 'bedarf' },
  { name: 'Freizeit', betrag: 500, takt: 'monat', gruppe: 'wunsch' }] };
const schulden = [{ name: 'Kreditkarte', betrag: 4000, zins: 12, rate: 120 }, { name: 'Kleinkredit', betrag: 9000, zins: 4.9, rate: 300 }, { name: 'Privatkredit', betrag: 6000, zins: 8.5, rate: 200 }];
const miete = { netto: 1800, zinsAlt: 1.75, zinsNeu: 1.25, likAlt: 106, likNeu: 107.5, festlegung: '2023-12-01', heute: '2026-10-01' };

// 1. Budget-Teil = Budget-Engine
const b = dep.BudgetEngine.auswerten(budget);
const r0 = K.plan({ budget, schulden: [] }, dep);
t(nah(r0.frei, b.rest) && r0.frei === 1050, `ohne Schulden: freier Betrag = Budget-Rest (${r0.frei} CHF)`);
t(r0.fix === 4050 && r0.vollZiel === 3 * 4050, 'Fixkosten und Notreserve-Ziel (3 × Fixkosten)');

// 2. BLOCKER-Fix: Kreditraten werden vom freien Betrag abgezogen, nicht doppelt verteilt
const r2 = K.plan({ budget, schulden }, dep);
t(r2.frei === 1050 - 620, `Raten (620) abgezogen: frei ${r2.frei} CHF`);
t(r2.schritte.find((s) => s.art === 'schulden').proMonat === 1050, 'in die Schulden fliesst genau der Budget-Rest (1050 = 430 frei + 620 Raten)');
t(r2.danachFrei === 1050, 'nach der Tilgung sind 1050 CHF frei, nicht mehr');

// 3. BLOCKER-Fix: Mietsenkung nur sicher mit Festlegungsdatum + LIK
const m = dep.MietzinsEngine.berechnen(miete);
const r1 = K.plan({ budget, schulden: [], miete }, dep);
t(r1.mieteSicher && nah(r1.mieteSpar, m.proMonat) && nah(r1.frei, 1050 + m.proMonat), `mit Datum + LIK: ${m.proMonat.toFixed(2)} CHF/Monat zählen (Teuerung + Kosten abgezogen)`);
const ohneLik = K.plan({ budget, schulden: [], miete: { ...miete, likAlt: '', likNeu: '' } }, dep);
t(!ohneLik.mieteSicher && ohneLik.mieteSpar === 0 && ohneLik.frei === 1050 && ohneLik.schritte[0].art === 'miete' && !ohneLik.schritte[0].sicher, 'ohne LIK: Senkung wird angezeigt, aber nicht ins freie Geld gerechnet');
const ohneDatum = K.plan({ budget, schulden: [], miete: { ...miete, festlegung: '' } }, dep);
t(ohneDatum.mieteSpar === 0, 'ohne Festlegungsdatum: nicht eingerechnet');
t(K.plan({ budget, schulden: [], miete: { ...miete, zinsAlt: '' } }, dep).miete === null, 'ohne Vertragszins: kein Mietschritt');
t(!K.plan({ budget, schulden: [], miete: { ...miete, zinsAlt: 1.25 } }, dep).schritte.some((s) => s.art === 'miete'), 'gleicher Zins: kein Anspruch');

// 4. Start-Reserve und Phasen gegen die Schulden-Engine nachgerechnet
const start = r2.schritte.find((s) => s.art === 'start');
const a = Math.ceil((4050 - 1000) / 430);
t(start && start.bis === a, `Start-Reserve in ${a} Monaten`);
const phaseA = dep.SchuldenEngine.simuliere(schulden, { methode: 'lawine', extra: 0, monate: a });
const rest = phaseA.einzeln.filter((d) => d.rest > 0.005).map((d) => ({ name: d.name, betrag: d.rest, zins: d.zins, rate: d.rate }));
const phaseB = dep.SchuldenEngine.simuliere(rest, { methode: 'lawine', extra: 430, monate: 600 });
t(r2.schuldenfrei === a + phaseB.schuldenfrei && nah(r2.zinsenPlan, phaseA.zinsen + phaseB.zinsen), `schuldenfrei nach ${r2.schuldenfrei} Monaten, Zinsen = Phase A + B`);
const mindest = dep.SchuldenEngine.simuliere(schulden, { methode: 'lawine', extra: 0, monate: 600 });
t(r2.zinsenPlan < mindest.zinsen && r2.schuldenfrei < mindest.schuldenfrei, `spart ${(mindest.zinsen - r2.zinsenPlan).toFixed(0)} CHF Zins gegenüber nur Mindestraten`);
t(r2.reihenfolge.join(',') === 'Kreditkarte,Privatkredit,Kleinkredit', 'Lawine: höchster Zins zuerst');
t(K.plan({ budget, schulden, methode: 'schneeball' }, dep).reihenfolge[0] === 'Kreditkarte', 'Schneeball: kleinster Betrag zuerst');
const voll = r2.schritte.find((s) => s.art === 'voll');
t(voll && voll.von === r2.schuldenfrei + 1 && voll.bis === r2.schuldenfrei + Math.ceil((3 * 4050 - (1000 + a * 430)) / 1050), 'volle Reserve danach mit frei + frei gewordenen Raten');

// 5. Schuld schon in der Reserve-Phase getilgt (Fund 3)
const klein = K.plan({ budget: { einnahmen: [{ betrag: 4000, takt: 'monat' }], ausgaben: [{ name: 'Alles', betrag: 3600, takt: 'monat', gruppe: 'bedarf' }], reserve: 0 },
  schulden: [{ name: 'Rechnung', betrag: 500, zins: 10, rate: 100 }] }, dep);
const sA = klein.schritte.find((s) => s.art === 'schuldenA');
t(sA && klein.schuldenfrei === 6 && !klein.schritte.some((s) => s.art === 'schulden' && s.von > s.bis), `in Reserve-Phase getilgt: schuldenfrei Monat ${klein.schuldenfrei}, kein Schritt mit von > bis`);

// 6. Rate unter dem Zins: kein absurder Zinsvergleich (Fund 4), Warnung
const zinsfalle = K.plan({ budget, schulden: [{ name: 'Karte', betrag: 10000, zins: 12, rate: 50 }] }, dep);
t(zinsfalle.zinsenMindest === null && zinsfalle.warnungen.some((w) => w.art === 'rateUnterZins'), 'Rate < Zins: Warnung, kein Vergleich mit „nie getilgt“');

// 7. Zins 0 / Rate 0 (Fund 5)
const privat = K.plan({ budget, schulden: [{ name: 'Eltern', betrag: 3000, zins: 0, rate: 0 }] }, dep);
t(!privat.warnungen.some((w) => w.art === 'rateUnterZins') && privat.warnungen.some((w) => w.art === 'ohneRate'), 'zinsloses Darlehen ohne Rate: eigene Meldung statt Zins-Warnung');

// 8. Negative Werte (Fund 7) und winziger freier Betrag (Fund 8)
const neg = K.plan({ budget, schulden: [{ name: 'X', betrag: 1000, zins: -5, rate: -100 }] }, dep);
t(neg.raten === 0 && neg.frei === 1050, 'negative Zinsen/Raten werden als 0 gelesen');
const winzig = K.plan({ budget: { ...budget, einnahmen: [{ betrag: 4551, takt: 'monat' }] }, schulden }, dep);
t(winzig.zuLang === true || winzig.geht === false, 'kein Plan über 50 Jahre');

// 9. Leasing läuft mit fester Rate (Fund 9)
const mitLeasing = K.plan({ budget, schulden: [...schulden.slice(0, 1), { name: 'Auto-Leasing', betrag: 15000, zins: 3.9, rate: 350, fest: true }] }, dep);
t(mitLeasing.frei === 1050 - 120 - 350 && !mitLeasing.reihenfolge.includes('Auto-Leasing') && mitLeasing.fix === 4050 + 350, 'Leasing: Rate abgezogen, bekommt kein Extra-Geld, zählt zu den Fixkosten');

// 10. Budget-Loch
const knapp = K.plan({ budget: { ...budget, einnahmen: [{ betrag: 4000, takt: 'monat' }] }, schulden }, dep);
t(!knapp.geht && knapp.fehlt === 550 + 620, 'Budget-Loch inkl. Raten erkannt (1170 CHF/Monat)');

// 11. Volle Reserve: Tilgung ab Monat 1
const reich = K.plan({ budget: { ...budget, reserve: 20000 }, schulden }, dep);
t(!reich.schritte.some((s) => s.art === 'start' || s.art === 'voll') && reich.schritte.find((s) => s.art === 'schulden').von === 1, 'volle Reserve: Tilgung ab Monat 1');

// 12. Monatsnamen lokal, ohne UTC-Versatz (Fund 12), leerer Start (Fund 6)
t(K.monatName('2026-10', 1) === 'November 2026' && K.monatName('2026-10-31', 4) === 'Februar 2027' && K.monatName('2026-01', 0) === 'Januar 2026', 'Monatsnamen korrekt');
t(/20\d\d$/.test(K.monatName('', 0)) && !K.monatName('', 0).includes('2001'), 'leerer Startmonat → aktueller Monat');
process.exit(ok ? 0 : 1);
