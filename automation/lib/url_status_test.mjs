/** Test fuer statusMitGeduld — gefaelschter fetch, kein echtes Warten.
 *  Lauf: /opt/node22/bin/node automation/lib/url_status_test.mjs   */
import { statusMitGeduld } from './url_status.mjs';
let fehler = 0;
const pruef = (n, ok, extra='') => { if(!ok){ fehler++; console.log(`FAIL ${n} ${extra}`); } else console.log(`ok   ${n}`); };
const lauf = (codes, versuche) => {
  let i = 0; const gewartet = [];
  return { gewartet, aufrufe: () => i,
    erg: statusMitGeduld('https://luxestyle.ch/x', { versuche,
      fetch: async () => { const c = codes[Math.min(i++, codes.length-1)]; if (c === null) throw new Error('ECONNRESET'); return { status: c }; },
      warte: ms => { gewartet.push(ms); }, basisMs: 10 }) };
};
// 1. 200 sofort → kein Nachfassen
{ const l = lauf([200]); const r = await l.erg;
  pruef('200 sofort', r.status===200 && r.nachgefasst===0 && !r.unsicher, JSON.stringify(r)); }
// 2. 429, dann 200 → der gesunde Fall, der vorher als Problem gemeldet wurde
{ const l = lauf([429, 200]); const r = await l.erg;
  pruef('429 dann 200 → 200', r.status===200 && r.nachgefasst===1 && !r.unsicher, JSON.stringify(r)); }
// 3. Dauer-429 → unsicher:true, NICHT als 404/Problem verwertbar
{ const l = lauf([429], 3); const r = await l.erg;
  pruef('Dauer-429 → unsicher', r.status===429 && r.unsicher===true, JSON.stringify(r)); }
// 4. GEGENPROBE: ein echter 404 wird SOFORT gemeldet und nicht wiederholt
//    (sonst wuerde der Waechter echte Fehler verschleppen)
{ const l = lauf([404]); const r = await l.erg;
  pruef('404 gilt sofort', r.status===404 && r.nachgefasst===0 && !r.unsicher, JSON.stringify(r));
  pruef('404: nur 1 Aufruf', l.aufrufe()===1, String(l.aufrufe())); }
// 5. 503 dann 404 → der 404 gilt
{ const l = lauf([503, 404]); const r = await l.erg;
  pruef('503 dann 404 → 404', r.status===404 && !r.unsicher, JSON.stringify(r)); }
// 6. Netzfehler dann 200
{ const l = lauf([null, 200]); const r = await l.erg;
  pruef('Netzfehler dann 200', r.status===200 && !r.unsicher, JSON.stringify(r)); }
// 7. Pausen wachsen
{ const l = lauf([429, 429, 200], 4); await l.erg;
  pruef('Pausen wachsen', l.gewartet.length===2 && l.gewartet[1]>l.gewartet[0], JSON.stringify(l.gewartet)); }
console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler?1:0);
