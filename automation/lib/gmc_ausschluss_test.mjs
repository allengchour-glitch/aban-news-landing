/** Test für den Entscheid, ob `excluded_destination` weg darf.
 *  Lauf: /opt/node22/bin/node automation/lib/gmc_ausschluss_test.mjs */
import { darfWeg, NAMESPACE, KEY } from './gmc_ausschluss.mjs';

let fehler = 0;
const pruef = (name, ist, soll) => {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) { fehler++; console.log(`FAIL ${name}\n     ist  ${JSON.stringify(ist)}\n     soll ${JSON.stringify(soll)}`); }
  else console.log(`ok   ${name}`);
};
const mf = (v, ns = NAMESPACE, k = KEY) => ({ namespace: ns, key: k, value: v });

// ── Der Chargen-Wert, genau so wie er 1368 + 123 Mal im Katalog steht ──
pruef('Chargen-Wert darf weg', darfWeg(mf('["Shopping_ads"]')), { weg: true, grund: 'Charge vom 17.08.2026' });

// ── GEGENPROBE IN DIE ANDERE RICHTUNG: alles andere bleibt stehen ──
// Hier liegt der ganze Sinn der Regel. Ein zu breiter Lauf würde einen ECHTEN Entscheid löschen
// und Ware nach Google schieben, die dort bewusst nicht sein soll — dieselbe Klasse wie das zu
// breite `rueckhol`-Muster, nur mit Schreibzugriff.
pruef('zweiter Zielort bleibt', darfWeg(mf('["Shopping_ads","Display_ads"]')).weg, false);
pruef('anderer Zielort bleibt', darfWeg(mf('["Display_ads"]')).weg, false);
pruef('Local-Inventory bleibt', darfWeg(mf('["Local_inventory_ads"]')).weg, false);
pruef('leere Liste bleibt', darfWeg(mf('[]')).weg, false);
pruef('Reihenfolge zählt nicht als gleich',
  darfWeg(mf('["Display_ads","Shopping_ads"]')).weg, false);
pruef('Freitext bleibt', darfWeg(mf('Shopping_ads')).weg, false);
pruef('kaputtes JSON bleibt', darfWeg(mf('["Shopping_ads"')).weg, false);
pruef('JSON-Objekt bleibt', darfWeg(mf('{"a":1}')).weg, false);
// `null` ist gültiges JSON und hat kein `.length` — ohne die Array-Prüfung stürzt der
// Entscheid ab, statt eine Antwort zu geben. Die Mutationsprobe fand genau diese Lücke:
// die Längenprüfung allein deckt `{}` und Zeichenketten ab, `null` aber nicht.
pruef('JSON null bleibt, ohne Absturz', darfWeg(mf('null')), { weg: false, grund: 'kein JSON-Array' });
pruef('JSON-Zahl bleibt', darfWeg(mf('7')).weg, false);
pruef('fremder Namensraum bleibt', darfWeg(mf('["Shopping_ads"]', 'google')).weg, false);
pruef('fremder Schlüssel bleibt', darfWeg(mf('["Shopping_ads"]', NAMESPACE, 'condition')).weg, false);
pruef('kein Metafeld', darfWeg(null), { weg: false, grund: 'kein Metafeld' });
pruef('undefined', darfWeg(undefined).weg, false);

// ── Jeder Nein-Fall muss seinen Grund nennen ──
for (const [name, m] of [['zweiter Zielort', mf('["Shopping_ads","Display_ads"]')],
                         ['Freitext', mf('x')], ['fremder Namensraum', mf('["Shopping_ads"]', 'google')]]) {
  pruef(`Grund genannt: ${name}`, darfWeg(m).grund.length > 0, true);
}
// Ohne Namensraum/Schlüssel im Objekt (die API liefert sie nicht immer mit) zählt nur der Wert.
pruef('ohne ns/key entscheidet der Wert', darfWeg({ value: '["Shopping_ads"]' }).weg, true);
pruef('ohne ns/key: anderer Wert bleibt', darfWeg({ value: '["Display_ads"]' }).weg, false);

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
