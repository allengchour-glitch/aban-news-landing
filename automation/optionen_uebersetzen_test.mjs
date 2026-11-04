import { brauchtUebersetzung, uebersetzungOk, ergaenzung, waehleWunsch } from './optionen_uebersetzen.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
for (const v of ['Silver Black-Ordinary', 'Black-155to165cm', 'White-CK 51x102cm', 'Tianchi Blue', 'Magnetic absorption-Black', 'Gold Frame Black And Gray', 'Apricot Light Blue-78 Generation 41mm']) ist(`braucht: ${v}`, brauchtUebersetzung(v), true);
for (const v of ['Schwarz', 'Pink', 'Khaki', 'Beige', 'Gold', 'Set 2', 'Mini', 'Silber / Schwarz', 'XL', '41 mm', 'Hellgrün-Jungen 100', '']) ist(`Gegenprobe deutsch/neutral: ${v}`, brauchtUebersetzung(v), false);
ist('ok: normaler Fall', uebersetzungOk('Black-155to165cm', 'Schwarz, 155–165 cm'), 'Schwarz, 155–165 cm');
ist('ß → ss', uebersetzungOk('White', 'Weiß'), 'Weiss');
ist('unverändert → abgelehnt', uebersetzungOk('Tianchi Blue', 'Tianchi Blue'), null);
ist('noch Englisch → abgelehnt', uebersetzungOk('Blue Frame', 'Blau Frame'), null);
ist('leer → abgelehnt', uebersetzungOk('Blue', '  '), null);
ist('zu lang → abgelehnt', uebersetzungOk('Blue', 'x'.repeat(61)), null);
ist('Platzhalter → abgelehnt', uebersetzungOk('Blue', 'N/A'), null);
ist('Standard-Version ist Deutsch genug', uebersetzungOk('Khaki · Gr. 34-Regular version', 'Khaki · Gr. 34, Standard-Version'), 'Khaki · Gr. 34, Standard-Version');
ist('Leopard ist ein deutsches Wort', uebersetzungOk('Leopard-Size12.43to43.5', 'Leopard, Grösse 12.43–43.5'), 'Leopard, Grösse 12.43–43.5');
ist('2pcs bleibt abgelehnt', uebersetzungOk('2pcs Matt purple', '2pcs Matt Violett'), null);
ist('Frame im Ergebnis bleibt abgelehnt', uebersetzungOk('Black Frame', 'Black Frame'), null);

// 04.11.2026: deterministische Ergänzung (Small/Large/Size N/N PCS) und «ganze Optionen»
for (const [w, e] of [['Small','Klein'],['small size','Klein'],['Medium','Mittel'],['Large','Gross'],['Large Size','Gross'],['Extra Large','Extra gross'],['1PCS','1 Stk.'],['12 pcs','12 Stk.'],['5pack','5er-Pack'],['Size 7','Grösse 7'],['Size7','Grösse 7'],['US Size 12.5','US-Grösse 12.5']]) ist(`ergaenzung: ${w}`, ergaenzung(w), e);
for (const w of ['Black','Large Blue','Size 7 Black','Small Frame','XL','Set 2','150x230cm thick','Extra Large Black','2pcs Matt purple','12 pcs set','', null, undefined]) ist(`ergaenzung: kein Muster bei ${w}`, ergaenzung(w), null);
for (const [w, e] of [['Small','Klein'],['1PCS','1 Stk.'],['Size 7','Grösse 7'],['US Size 12.5','US-Grösse 12.5'],['Extra Large','Extra gross'],['Large Size','Gross']]) ist(`Ergänzung besteht die Ergebnisprüfung: ${w}`, uebersetzungOk(w, ergaenzung(w)), e);
const op = [{ name: 'Grösse', werte: ['Small', 'Large Size'] }, { name: 'Farbe', werte: ['Tianchi Blue'] }];
ist('ganz: alles übersetzt → alle Werte', waehleWunsch(op, { Small: { neu: 'Klein' }, 'Large Size': { neu: 'Gross' }, 'Tianchi Blue': { neu: 'Tianchi-Blau' } }, true), { wunsch: { Grösse: { Small: 'Klein', 'Large Size': 'Gross' }, Farbe: { 'Tianchi Blue': 'Tianchi-Blau' } }, unvollstaendig: 0 });
ist('ganz: ein Wert fehlt → Option bleibt ganz unverändert, andere Option läuft', waehleWunsch(op, { Small: { neu: 'Klein' }, 'Large Size': { neu: null }, 'Tianchi Blue': { neu: 'Tianchi-Blau' } }, true), { wunsch: { Farbe: { 'Tianchi Blue': 'Tianchi-Blau' } }, unvollstaendig: 1 });
ist('ganz: kein Eintrag im Zwischenspeicher zählt als fehlend', waehleWunsch(op, { Small: { neu: 'Klein' } }, true).unvollstaendig, 2);
ist('nicht ganz: Teil-Übersetzung wie bisher', waehleWunsch(op, { Small: { neu: 'Klein' }, 'Large Size': { neu: null } }, false), { wunsch: { Grösse: { Small: 'Klein' } }, unvollstaendig: 0 });
ist('ganz: leere Optionen', waehleWunsch([], {}, true), { wunsch: {}, unvollstaendig: 0 });

console.log(`${ok} ok, ${fehl} Fehler`); process.exit(fehl ? 1 : 0);
