/** Test fuer cjFetch — gefaelschtes fetch, kein echtes Warten.
 *  Lauf: /opt/node22/bin/node automation/lib/cj_fetch_test.mjs   */
import { cjFetch, WEICHE_CODES } from './cj_fetch.mjs';
let fehler = 0;
const pruef = (name, ok, extra = '') => { if (!ok) { fehler++; console.log(`FAIL ${name} ${extra}`); } else console.log(`ok   ${name}`); };
const antwort = (body, status = 200) => ({ status, json: async () => body });
const gut = (data = { pid: '123' }) => antwort({ result: true, code: 200, data });
const lauf = (antworten, opt = {}) => {
  const gewartet = [];
  let n = 0;
  const f = async () => { const a = antworten[n++]; if (a instanceof Error) throw a; return a; };
  return { gewartet, aufrufe: () => n,
    erg: cjFetch('https://cj/x', { fetch: f, warte: ms => { gewartet.push(ms); }, basisMs: 10, context: '/product/query', ...opt }) };
};

// 1. Erfolg beim ersten Versuch → keine Wartezeit
{
  const l = lauf([gut()]);
  const b = await l.erg;
  pruef('Erfolg liefert Body', b?.data?.pid === '123', JSON.stringify(b));
  pruef('Erfolg wartet nicht', l.gewartet.length === 0 && l.aufrufe() === 1);
}
// 2. HTTP 429 zweimal, dann Erfolg → genau der Fall, der am 17.10. 36 Produkte verbrannte
{
  const l = lauf([antwort({ message: 'Too many requests' }, 429), antwort({}, 429), gut({ pid: 'abc' })]);
  const b = await l.erg;
  pruef('429 → wiederholt und liefert Daten', b?.data?.pid === 'abc', JSON.stringify(b));
  pruef('429: zweimal gewartet, Pause waechst', l.gewartet.length === 2 && l.gewartet[1] > l.gewartet[0], JSON.stringify(l.gewartet));
}
// 3. HTTP 500/503 sind ebenfalls Warte-Faelle
for (const code of [500, 503]) {
  const l = lauf([antwort({}, code), gut()]);
  const b = await l.erg;
  pruef(`HTTP ${code} → wiederholt`, b?.data?.pid === '123' && l.gewartet.length === 1);
}
// 4. Netzfehler → wiederholt
{
  const l = lauf([new Error('ECONNRESET'), gut()]);
  const b = await l.erg;
  pruef('Netzfehler → wiederholt', b?.data?.pid === '123' && l.gewartet.length === 1);
}
// 5. GEGENPROBE: erschoepfte Tagespunkte fliegen SOFORT, auch wenn sie als 429 kommen.
//    Sonst wartet der Lauf minutenlang auf etwas, das erst morgen zurueckkommt.
for (const status of [200, 429]) {
  const l = lauf([antwort({ result: false, message: 'Insufficient api points. Used today: 68875' }, status), gut()]);
  let geflogen = null;
  try { await l.erg; } catch (e) { geflogen = e.message; }
  pruef(`Punkte erschoepft (HTTP ${status}) fliegt sofort`, /^CJ_QUOTA/.test(String(geflogen)), String(geflogen));
  pruef(`Punkte erschoepft (HTTP ${status}): nicht gewartet`, l.gewartet.length === 0 && l.aufrufe() === 1);
}
// 6. GEGENPROBE: ein echter API-Fehler darf NICHT in der Warteschleife verschwinden
{
  const l = lauf([antwort({ result: false, code: 1602002 }), gut()]);
  let geflogen = null;
  try { await l.erg; } catch (e) { geflogen = e.message; }
  pruef('echter API-Fehler fliegt sofort', /CJ_API.*1602002/.test(String(geflogen)), String(geflogen));
  pruef('echter API-Fehler: nicht gewartet, 1 Aufruf', l.gewartet.length === 0 && l.aufrufe() === 1);
}
// 7. GEGENPROBE: eine LEERE, aber erfolgreiche Antwort bleibt leer — nie als Drosselung deuten
{
  const l = lauf([antwort({ result: true, code: 200, data: { list: [], total: 0 } })]);
  const b = await l.erg;
  pruef('leere Erfolgsantwort bleibt leer', b?.data?.total === 0 && l.gewartet.length === 0);
}
// 8. Dauerdrosselung → eigener Grund CJ_THROTTLED, damit der Aufrufer aussteigen kann
{
  const l = lauf([antwort({}, 429), antwort({}, 429), antwort({}, 429)], { versuche: 3 });
  let geflogen = null;
  try { await l.erg; } catch (e) { geflogen = e.message; }
  pruef('Dauerdrosselung → CJ_THROTTLED', /^CJ_THROTTLED: HTTP 429/.test(String(geflogen)), String(geflogen));
  pruef('Dauerdrosselung: Grund nennt den Pfad', /\/product\/query/.test(String(geflogen)), String(geflogen));
  pruef('Dauerdrosselung: genau `versuche` Aufrufe', l.aufrufe() === 3 && l.gewartet.length === 2);
}
// 9. Erfolgsantwort ohne data-Feld bleibt ein Fehler (cj_response-Regel)
{
  const l = lauf([antwort({ result: true, code: 200 })]);
  let geflogen = null;
  try { await l.erg; } catch (e) { geflogen = e.message; }
  pruef('Erfolg ohne data → CJ_DATA', /^CJ_DATA/.test(String(geflogen)), String(geflogen));
}
// 10. Kopfzeilen werden durchgereicht (CJ-Access-Token)
{
  let gesehen = null;
  const erg = await cjFetch('https://cj/x', { fetch: async (_u, init) => { gesehen = init; return gut(); },
    headers: { 'CJ-Access-Token': 'tok' }, warte: () => {}, context: '/x' });
  pruef('Token-Kopfzeile durchgereicht', gesehen?.headers?.['CJ-Access-Token'] === 'tok' && !!erg);
}

// 11. Weiche Codes: ausgelistet/nicht gefunden ist eine ANTWORT, kein Fehler (18.10.)
for (const code of WEICHE_CODES) {
  const l = lauf([antwort({ result: false, code, message: 'removed from shelves' })], { weicheCodes: WEICHE_CODES });
  let b = null, geflogen = null;
  try { b = await l.erg; } catch (e) { geflogen = e.message; }
  pruef(`code ${code} weich → Body statt Fehler`, !geflogen && Number(b?.code) === code, String(geflogen));
  pruef(`code ${code} weich → nicht gewartet`, l.gewartet.length === 0 && l.aufrufe() === 1);
}
// 12. GEGENPROBE 1: ohne weicheCodes bleibt derselbe Code hart (kein stiller Durchlass)
{
  const l = lauf([antwort({ result: false, code: 1602002, message: 'removed from shelves' })]);
  let geflogen = null;
  try { await l.erg; } catch (e) { geflogen = e.message; }
  pruef('ohne weicheCodes bleibt 1602002 hart', /^CJ_API.*1602002/.test(String(geflogen)), String(geflogen));
}
// 13. GEGENPROBE 2: ein echter Fehler fliegt SOFORT, auch wenn weiche Codes erlaubt sind
{
  const l = lauf([antwort({ result: false, code: 1600000, message: 'Signature error' })], { weicheCodes: WEICHE_CODES });
  let geflogen = null;
  try { await l.erg; } catch (e) { geflogen = e.message; }
  pruef('fremder Code fliegt trotz weicheCodes', /^CJ_API.*1600000/.test(String(geflogen)), String(geflogen));
}
// 14. GEGENPROBE 3: erschoepfte Punkte bleiben hart, auch als weicher Code verpackt
{
  const l = lauf([antwort({ result: false, code: 1602002, message: 'Insufficient api points. Used today: 951' })], { weicheCodes: WEICHE_CODES });
  let geflogen = null;
  try { await l.erg; } catch (e) { geflogen = e.message; }
  pruef('Punkte erschoepft schlaegt weiche Codes', /^CJ_QUOTA/.test(String(geflogen)), String(geflogen));
}
// 15. Ein ERFOLG bleibt ein Erfolg, wenn weiche Codes erlaubt sind
{
  const l = lauf([gut({ pid: 'xyz' })], { weicheCodes: WEICHE_CODES });
  const b = await l.erg;
  pruef('Erfolg unveraendert mit weicheCodes', b?.data?.pid === 'xyz');
}

// 16. getInventoryByPid antwortet OHNE «result» (nur success:true + code:200): Erfolg NUR mit der ausdrücklichen Angabe erfolgOhneResult; alle anderen Aufrufer bleiben streng
{
  const bestand = () => antwort({ success: true, code: 200, message: '', data: { inventories: [], variantInventories: [] } });
  let geflogen = '';
  try { await lauf([bestand()]).erg; } catch (e) { geflogen = e.message; }
  pruef('ohne erfolgOhneResult bleibt eine Antwort ohne result ein Fehler (CJ_API)', /^CJ_API/.test(geflogen), geflogen);
  const b = await lauf([bestand()], { erfolgOhneResult: true }).erg;
  pruef('mit erfolgOhneResult ist success:true + code:200 ein Erfolg', b?.success === true && Array.isArray(b.data.variantInventories));
  for (const [name, body] of [['nur code 200 (ohne success)', { code: 200, data: {} }], ['success mit anderem code', { success: true, code: 500, data: {} }], ['result:false trotz success:true', { success: true, code: 200, result: false, data: {} }], ['success:false', { success: false, code: 200, data: {} }]]) {
    let f = '';
    try { await lauf([antwort(body)], { erfolgOhneResult: true }).erg; } catch (e) { f = e.message; }
    pruef(`erfolgOhneResult bleibt streng: ${name} wirft`, /^CJ_API/.test(f), f);
  }
  let g = '';
  try { await lauf([antwort({ success: true, code: 200, message: '' })], { erfolgOhneResult: true }).erg; } catch (e) { g = e.message; }
  pruef('...und ohne data-Feld wirft auch dann CJ_DATA', /^CJ_DATA/.test(g), g);
}

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
