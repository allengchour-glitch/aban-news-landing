/** Test fuer shopifyGql — mit gefaelschtem fetch, ohne echtes Warten.
 *  Lauf: /opt/node22/bin/node automation/lib/shopify_gql_test.mjs   */
import { shopifyGql, taktPause } from './shopify_gql.mjs';
let fehler = 0;
const pruef = (name, ok, extra = '') => { if (!ok) { fehler++; console.log(`FAIL ${name} ${extra}`); } else console.log(`ok   ${name}`); };
const antwort = (body, status = 200) => ({ status, json: async () => body });
const lauf = (antworten) => {
  const gewartet = [];
  let n = 0;
  const f = async () => { const a = antworten[n++]; if (a instanceof Error) throw a; return a; };
  return { gewartet, aufrufe: () => n,
    erg: shopifyGql('test.myshopify.com', '2025-01', 't', '{x}', {}, { fetch: f, warte: ms => { gewartet.push(ms); }, basisMs: 10 }) };
};

// 1. Drosselung zweimal, dann Erfolg → Ergebnis da, zweimal gewartet, wachsende Pausen
{
  const T = antwort({ errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }] });
  const l = lauf([T, T, antwort({ data: { shop: { name: 'LuxeStyle' } } })]);
  const d = await l.erg;
  pruef('Drosselung → wiederholt und liefert Daten', d?.shop?.name === 'LuxeStyle', JSON.stringify(d));
  pruef('zweimal gewartet, Pause waechst', l.gewartet.length === 2 && l.gewartet[1] > l.gewartet[0], JSON.stringify(l.gewartet));
  pruef('drei fetch-Aufrufe', l.aufrufe() === 3, String(l.aufrufe()));
}
// 2. HTTP 429 und 503 sind ebenfalls Warte-Faelle
for (const code of [429, 503]) {
  const l = lauf([antwort({}, code), antwort({ data: { ok: 1 } })]);
  const d = await l.erg;
  pruef(`HTTP ${code} → wiederholt`, d?.ok === 1 && l.gewartet.length === 1);
}
// 3. GEGENPROBE: ein ECHTER Fehler darf NICHT wiederholt werden, sondern sofort fliegen
//    (sonst verschwindet ein falsches Feld in einer Warteschleife)
{
  const l = lauf([antwort({ errors: [{ message: "Field 'menu' is missing required arguments: id" }] }), antwort({ data: { ok: 1 } })]);
  let geflogen = null;
  try { await l.erg; } catch (e) { geflogen = e.message; }
  pruef('echter Fehler fliegt sofort', !!geflogen && /missing required arguments/.test(geflogen), String(geflogen));
  pruef('echter Fehler: nicht gewartet, nur 1 Aufruf', l.gewartet.length === 0 && l.aufrufe() === 1);
}
// 4. Dauerdrosselung → gibt nach `versuche` auf und nennt den Grund
{
  const T = antwort({ errors: [{ message: 'Throttled' }] });
  let geflogen = null;
  try { await shopifyGql('test.myshopify.com', '2025-01', 't', '{x}', {}, { fetch: async () => T, warte: async () => {}, versuche: 3 }); }
  catch (e) { geflogen = e.message; }
  pruef('Dauerdrosselung → Fehler mit Grund', !!geflogen && /Throttled/.test(geflogen), String(geflogen));
}
// 5. Netzfehler wird wiederholt
{
  const l = lauf([new Error('ECONNRESET'), antwort({ data: { ok: 1 } })]);
  const d = await l.erg;
  pruef('Netzfehler → wiederholt', d?.ok === 1 && l.gewartet.length === 1);
}
// Gegenprobe: Auth-/Berechtigungsfehler dürfen nicht als leere Daten durchlaufen.
for (const status of [401, 403, 404]) {
  const l = lauf([antwort({ message: 'Access denied' }, status)]);
  let error = '';
  try { await l.erg; } catch (e) { error = e.message; }
  pruef(`HTTP ${status} wird als Fehler gemeldet`, error.includes(`HTTP ${status}`) && l.aufrufe() === 1);
}
{
  const l = lauf([antwort({})]);
  let error = '';
  try { await l.erg; } catch (e) { error = e.message; }
  pruef('HTTP 200 ohne Daten ist kein Erfolg', error.includes('keine Daten'));
}
{
  const l = lauf([antwort({ errors: [], data: { ok: 1 } })]);
  pruef('Leere Fehlerliste mit Daten ist Erfolg', (await l.erg).ok === 1);
}

// 6. SELBST-TAKT (gemessen 2026-10-18: Eimer 2000, 100/s nach, eine Produktseite kostet 51)
const kosten = (angefragt, frei, rate = 100) =>
  ({ extensions: { cost: { requestedQueryCost: angefragt, throttleStatus: { maximumAvailable: 2000, currentlyAvailable: frei, restoreRate: rate } } } });
{
  pruef('voller Eimer → keine Pause', taktPause(kosten(51, 2000)) === 0);
  pruef('genau genug Punkte → keine Pause', taktPause(kosten(51, 51)) === 0);
  pruef('ein Punkt zu wenig → kurze Pause', taktPause(kosten(51, 50)) === 10);
  pruef('leerer Eimer → 510 ms', taktPause(kosten(51, 0)) === 510);
  pruef('Pause ist gedeckelt', taktPause(kosten(5000, 0), { maxPauseMs: 2000 }) === 2000);
}
// GEGENPROBE: Unbekanntes darf NICHT bremsen und NICHT abstuerzen — sonst steht ein Lauf
// still, weil Shopify die Kostenangabe weglaesst (oder eine Rate 0 meldet → Division).
{
  pruef('ohne extensions → keine Pause', taktPause({ data: { ok: 1 } }) === 0);
  pruef('ohne throttleStatus → keine Pause', taktPause({ extensions: { cost: { requestedQueryCost: 51 } } }) === 0);
  pruef('Restorerate 0 → keine Pause', taktPause(kosten(51, 0, 0)) === 0);
  pruef('Restorerate fehlt → keine Pause', taktPause({ extensions: { cost: { requestedQueryCost: 51, throttleStatus: { currentlyAvailable: 0 } } } }) === 0);
  pruef('Kosten 0 → keine Pause', taktPause(kosten(0, 0)) === 0);
}
// 7. Der Takt wirkt im echten Aufruf — und bremst nur, wenn der Eimer knapp ist
{
  const l = lauf([antwort({ data: { ok: 1 }, ...kosten(51, 0) })]);
  const d = await l.erg;
  pruef('knapper Eimer → nach der Antwort gewartet', d?.ok === 1 && l.gewartet.length === 1 && l.gewartet[0] === 510, JSON.stringify(l.gewartet));
}
{
  const l = lauf([antwort({ data: { ok: 1 }, ...kosten(51, 2000) })]);
  const d = await l.erg;
  pruef('voller Eimer → gar nicht gewartet', d?.ok === 1 && l.gewartet.length === 0, JSON.stringify(l.gewartet));
}

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
