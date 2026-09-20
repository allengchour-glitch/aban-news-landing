/**
 * Gegenproben fuer bewerte_versuche() — die Auswertung der Ladeversuche.
 *
 * WARUM DIESE DATEI EXISTIERT: Der Wert der Mehrfach-Messung haengt ganz daran, dass
 * die Zusammenfassung stimmt. Eine Funktion, die nur ihren Erfolgsfall kennt, ist
 * keine Sicherung (Lehre 18.09.). Also wird in BEIDE Richtungen geprueft: sie muss
 * den Koeder fangen UND den echten, gesunden Fall durchlassen.
 *
 * Lauf: /opt/node22/bin/node automation/browser/storefront_wahrheit.test.mjs
 */
import { bewerte_versuche } from './storefront_wahrheit.mjs';

let fehler = 0;
function pruefe(name, bedingung, gesehen) {
  if (bedingung) { console.log(`✅ ${name}`); }
  else { console.log(`❌ ${name} — gesehen: ${JSON.stringify(gesehen)}`); fehler++; }
}

// 1) Der gesunde Normalfall MUSS durchgehen, sonst meldet der Waechter taeglich Unsinn.
const gesund = bewerte_versuche([
  { nr: 1, kalt: false, geladen: true, zeichen: 6653 },
  { nr: 2, kalt: true,  geladen: true, zeichen: 6653 },
  { nr: 3, kalt: true,  geladen: true, zeichen: 6650 },
  { nr: 4, kalt: true,  geladen: true, zeichen: 6653 },
  { nr: 5, kalt: true,  geladen: true, zeichen: 6653 },
]);
pruefe('gesund: erreichbar', gesund.erreichbar === true, gesund);
pruefe('gesund: 5/5 gezaehlt', gesund.geladen === 5 && gesund.versuche === 5, gesund);
pruefe('gesund: keine Fehlversuche gelistet', gesund.fehlversuche.length === 0, gesund);

// 2) DER ECHTE FALL vom 20.09.: warm (Edge-Kopie) gruen, kalt gescheitert.
//    Genau diese Kombination war vorher unsichtbar, weil nur EIN warmer Abruf lief.
const echt = bewerte_versuche([
  { nr: 1, kalt: false, geladen: true,  zeichen: 6653 },
  { nr: 2, kalt: true,  geladen: false, zeichen: 202 },
  { nr: 3, kalt: true,  geladen: true,  zeichen: 6653 },
  { nr: 4, kalt: true,  geladen: false, zeichen: 202 },
  { nr: 5, kalt: true,  geladen: true,  zeichen: 6653 },
]);
pruefe('echt: als Befund erkannt', echt.erreichbar === false, echt);
pruefe('echt: 3/5 geladen', echt.geladen === 3, echt);
pruefe('echt: warm 1/1, kalt 2/4 getrennt', echt.warm_geladen === 1 && echt.warm === 1
  && echt.kalt_geladen === 2 && echt.kalt === 4, echt);
pruefe('echt: Fehlversuche mit Nummer und Zeichen', echt.fehlversuche.length === 2
  && echt.fehlversuche[0].nr === 2 && echt.fehlversuche[0].zeichen === 202, echt);
pruefe('echt: Zeichen-Spanne verraet den Einbruch', echt.zeichen_min === 202
  && echt.zeichen_max === 6653, echt);

// 3) KOEDER: nichts gemessen ist NICHT dasselbe wie kaputt (Lehre 19.09., LI-Wache).
//    Ein null hier haelt den Waechter davon ab, aus Blindheit Alarm zu schlagen.
const leer = bewerte_versuche([]);
pruefe('leer: erreichbar null statt false', leer.erreichbar === null, leer);
const kaputt_eingabe = bewerte_versuche(undefined);
pruefe('kein Array: erreichbar null statt Absturz', kaputt_eingabe.erreichbar === null, kaputt_eingabe);

// 4) Gegenrichtung: alles gescheitert MUSS false sein — nicht null.
const tot = bewerte_versuche([
  { nr: 1, kalt: false, geladen: false, zeichen: 202 },
  { nr: 2, kalt: true,  geladen: false, grund: 'Timeout 60000ms exceeded' },
]);
pruefe('tot: erreichbar false', tot.erreichbar === false, tot);
pruefe('tot: Grund bleibt erhalten', tot.fehlversuche[1].grund?.includes('Timeout'), tot);

// 5) Ein EINZIGER Fehlschlag reicht als Befund — fuer die Kundin, die ihn erwischt,
//    ist der Shop kaputt; eine Mehrheitsregel wuerde genau sie wegmitteln.
const einer = bewerte_versuche([
  { nr: 1, kalt: false, geladen: true, zeichen: 6653 },
  { nr: 2, kalt: true,  geladen: true, zeichen: 6653 },
  { nr: 3, kalt: true,  geladen: false, zeichen: 202 },
]);
pruefe('ein Fehlschlag von 3 ist ein Befund', einer.erreichbar === false, einer);

console.log(fehler ? `\n${fehler} Gegenprobe(n) FEHLGESCHLAGEN` : '\nAlle Gegenproben gruen');
process.exit(fehler ? 1 : 0);
