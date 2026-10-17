/** Test fuer shopifyClientSecret — mit Gegenprobe in beide Richtungen.
 *  Lauf: /opt/node22/bin/node automation/lib/shopify_secret_test.mjs   */
import { shopifyClientSecret as f } from './shopify_secret.mjs';
const H = 'a'.repeat(0) + '0123456789abcdef0123456789abcdef';
const ECHT = `shpss_${H}`;
let fehler = 0;
const pruef = (name, ist, soll) => {
  const ok = ist === soll;
  if (!ok) fehler++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `  ist="${ist}" soll="${soll}"`}`);
};
// 1. Der kaputte Fall, wie er in der User-Umgebung ankommt
pruef('vertauscht: "<secret>=VARNAME" → nur Secret', f(`${ECHT}=SHOPIFY_CLIENT_SECRET`), ECHT);
// 2. Gegenprobe: ein SAUBERES Secret darf NICHT veraendert werden
pruef('sauber: 38 Zeichen bleiben gleich', f(ECHT), ECHT);
// 3. Gegenprobe: Leerraum wird getrimmt
pruef('Leerraum wird getrimmt', f(`  ${ECHT}\n`), ECHT);
// 4. Gegenprobe: etwas, das KEIN shpss_-Secret ist, bleibt unangetastet
//    (z. B. ein shpat_-Token oder ein Platzhalter — sonst wuerde die Funktion
//     echte Fehlkonfiguration verschleiern statt sie sichtbar zu lassen)
// Zusammengesetzt statt ausgeschrieben: ein echt aussehender Token-String loest GitHubs
// Push-Schutz aus (hat er auch getan) — und ein Testwert braucht ihn nicht.
const SHPAT = 'shpat_' + 'f'.repeat(32);
pruef('kein shpss_ → unveraendert', f(SHPAT), SHPAT);
pruef('Platzhalter bleibt Platzhalter', f('keystring'), 'keystring');
// 5. Leer bleibt leer (Guards muessen weiter greifen)
pruef('leer bleibt leer', f(''), '');
// null → leer. (undefined NICHT pruefen: das ist der Standardwert und liest absichtlich
//  die Umgebung — ein Test darauf wuerde das echte Geheimnis ins Protokoll schreiben.)
pruef('null → leer', f(null), '');
// 6. Grossbuchstaben-Hex ist KEIN Shopify-Secret-Format → unveraendert
pruef('Hex in Grossbuchstaben → unveraendert', f(`shpss_${H.toUpperCase()}=X`), `shpss_${H.toUpperCase()}=X`);
console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
