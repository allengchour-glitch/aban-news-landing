import { brauchtUebersetzung, uebersetzungOk } from './optionen_uebersetzen.mjs';
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

console.log(`${ok} ok, ${fehl} Fehler`); process.exit(fehl ? 1 : 0);
