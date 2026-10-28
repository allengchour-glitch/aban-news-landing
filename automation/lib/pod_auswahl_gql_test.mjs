// Tests für den GraphQL-Zugang des Schreibwegs (lib/pod_auswahl_gql.mjs): Mutationen werden NIE still wiederholt, Abfragen schon.
// Kein Netz: die echte shopifyGql läuft gegen eine fetch-Attrappe. Lauf: /opt/node22/bin/node automation/lib/pod_auswahl_gql_test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gqlFuer, istMutation, API_VERSION } from './pod_auswahl_gql.mjs';
import { pruefeAntwort, TageslimitFehler, Q_PRODUKT, M_OPTION, M_OPTION_WERTE, M_OPTION_WERTE_LOESCHEN, M_REORDER, M_VARIANTEN, M_UPDATE, M_SET, M_META } from './pod_auswahl_schreiben.mjs';
import { BESTAND_Q, SKU_INDEX_Q } from './pod_auswahl_daten.mjs';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 400)}\n   soll: ${JSON.stringify(b).slice(0, 400)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);

const Q = 'query($h:String!){ productByHandle(handle:$h){ id } }';
const M = 'mutation($pid:ID!,$vs:[ProductVariantsBulkInput!]!){ productVariantsBulkCreate(productId:$pid, variants:$vs){ productVariants{ id } userErrors{ field message code } } }';

/** fetch-Attrappe: spielt die Antworten der Reihe nach ab (Zahl = HTTP-Status ohne Inhalt, Error = Netzfehler, Objekt = JSON mit 200); zählt die Aufrufe. */
function attrappe(antworten) {
  const z = { aufrufe: 0, pausen: [] };
  const fetch = async () => {
    const a = antworten[Math.min(z.aufrufe, antworten.length - 1)]; z.aufrufe++;
    if (a instanceof Error) throw a;
    if (typeof a === 'number') return { status: a, json: async () => ({}) };
    return { status: 200, json: async () => a };
  };
  const warte = async (ms) => { z.pausen.push(ms); };
  return { z, fetch, warte };
}
const gqlMit = (antworten, extra = {}) => { const a = attrappe(antworten); return { ...a, gql: gqlFuer({ shop: 'x.myshopify.com', api: '2025-01', token: 't', fetch: a.fetch, warte: a.warte, ...extra }) }; };
const wirftMit = async (f) => { try { await f(); return null; } catch (e) { return String(e.message); } };

// ── Mutation erkennen
ist('istMutation: mutation(...)', istMutation(M), true);
ist('istMutation: mit Leerraum und Zeilenumbruch davor', istMutation('\n  mutation { a }'), true);
ist('istMutation: query ist keine Mutation', istMutation(Q), false);
ist('istMutation: Kurzform «{ shop { name } }» ist keine Mutation', istMutation('{ shop { name } }'), false);
ist('istMutation: das Wort «mutation» mitten im Text zählt nicht', istMutation('query { x(mutation:1) }'), false);

// ── Abfragen werden mit Geduld wiederholt (Lesen ist unschädlich)
{
  const t = gqlMit([503, 503, { data: { productByHandle: { id: 'p1' } } }]);
  const r = await t.gql(Q, { h: 'a' });
  ist('Abfrage: zwei 503, dann Erfolg → drei Aufrufe, Daten', [t.z.aufrufe, r], [3, { data: { productByHandle: { id: 'p1' } } }]);
}
{
  const t = gqlMit([new Error('Zeitüberschreitung'), { data: { x: 1 } }]);
  ist('Abfrage: Netzfehler wird wiederholt', [(await t.gql(Q, {})).data, t.z.aufrufe], [{ x: 1 }, 2]);
}
{
  const t = gqlMit([{ errors: [{ message: 'Throttled' }] }, { data: { x: 2 } }]);
  ist('Abfrage: «Throttled» wird wiederholt', [(await t.gql(Q, {})).data, t.z.aufrufe], [{ x: 2 }, 2]);
}
{
  const t = gqlMit([500]);
  const m = await wirftMit(() => t.gql(Q, {}));
  wahr('Abfrage: dauerhaft 500 → geworfen (nicht als Daten getarnt), 6 Versuche', /HTTP 500/.test(m) && t.z.aufrufe === 6, `${m} ${t.z.aufrufe}`);
}

// ── Mutationen: KEINE stille Wiederholung bei 5xx, Netzfehler, Zeitüberschreitung (die erste Anfrage kann schon ausgeführt sein)
for (const [name, antwort] of [['HTTP 503', 503], ['HTTP 500', 500], ['Netzfehler', new Error('fetch failed')], ['Zeitüberschreitung', Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })]]) {
  const t = gqlMit([antwort, { data: { productVariantsBulkCreate: { productVariants: [], userErrors: [] } } }]);
  const m = await wirftMit(() => t.gql(M, { pid: 'p', vs: [] }));
  ist(`Mutation: ${name} → genau EIN Aufruf, Fehler wird geworfen`, [t.z.aufrufe, !!m], [1, true]);
}
{ // der Fehlertext bleibt lesbar
  const t = gqlMit([503]); const m = await wirftMit(() => t.gql(M, {}));
  wahr('Mutation: Fehlertext nennt HTTP 503', /HTTP 503/.test(m), m);
}

// ── Mutationen: nur wenn Shopify die Anfrage nachweislich abgewiesen hat (Throttled, 429), wird wiederholt – mit wachsender Pause
{
  const t = gqlMit([{ errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }] }, { errors: [{ message: 'Throttled' }] }, { data: { productVariantsBulkCreate: { productVariants: [{ id: 'v' }], userErrors: [] } } }]);
  const r = await t.gql(M, { pid: 'p', vs: [] });
  ist('Mutation: zweimal «Throttled», dann Erfolg → drei Aufrufe, Daten, Pausen 1500 und 3000 ms', [t.z.aufrufe, r.data.productVariantsBulkCreate.productVariants.length, t.z.pausen], [3, 1, [1500, 3000]]);
}
{
  const t = gqlMit([429, { data: { a: 1 } }]);
  ist('Mutation: HTTP 429 wird wiederholt (Anfrage wurde nicht ausgeführt)', [(await t.gql(M, {})).data, t.z.aufrufe], [{ a: 1 }, 2]);
}
{
  const t = gqlMit([{ errors: [{ message: 'Throttled' }] }]);
  const r = await t.gql(M, {});
  ist('Mutation: dauerhaft «Throttled» → nach 1 + 5 Versuchen als {errors} zurück (nicht geworfen)', [t.z.aufrufe, Array.isArray(r.errors), /Throttled/.test(r.errors[0].message)], [6, true, true]);
}
{
  const t = gqlMit([429]);
  const m = await wirftMit(() => t.gql(M, {}));
  wahr('Mutation: dauerhaft 429 → nach 1 + 5 Versuchen geworfen', /HTTP 429/.test(m) && t.z.aufrufe === 6, `${m} ${t.z.aufrufe}`);
}

// ── Tageslimit für neue Varianten: wird erkannt, nie durch Warten «gelöst»
{
  const t = gqlMit([{ errors: [{ message: 'Daily variant creation limit reached. Try again tomorrow.', extensions: { code: 'VARIANT_THROTTLE_EXCEEDED' } }] }]);
  const r = await t.gql(M, { pid: 'p', vs: [] });
  ist('Tageslimit (errors): ein Aufruf, als {errors} zurück', [t.z.aufrufe, Array.isArray(r.errors)], [1, true]);
  const e = await (async () => { try { pruefeAntwort(r, 'Test', 'productVariantsBulkCreate'); return null; } catch (x) { return x; } })();
  wahr('Tageslimit (errors) über den Zugang → pruefeAntwort wirft TageslimitFehler', e instanceof TageslimitFehler, String(e));
}
{
  const t = gqlMit([{ data: { productVariantsBulkCreate: { productVariants: null, userErrors: [{ field: null, code: 'VARIANT_THROTTLE_EXCEEDED', message: 'Daily variant creation limit reached.' }] } } }]);
  const r = await t.gql(M, {});
  let e = null; try { pruefeAntwort(r, 'Test', 'productVariantsBulkCreate'); } catch (x) { e = x; }
  ist('Tageslimit (userErrors): ein Aufruf, Daten unverändert durchgereicht, TageslimitFehler', [t.z.aufrufe, Object.keys(r), e instanceof TageslimitFehler], [1, ['data'], true]);
}
{ // «Throttled» UND Tageslimit im selben Text: das Tageslimit gewinnt (kein Warten)
  const t = gqlMit([{ errors: [{ message: 'Throttled: VARIANT_THROTTLE_EXCEEDED' }] }]);
  await t.gql(M, {});
  ist('Mutation: «Throttled» mit Tageslimit-Text wird nicht wiederholt', t.z.aufrufe, 1);
}

// ── Sonstiges
{
  const t = gqlMit([{ data: { productVariantsBulkCreate: { productVariants: null, userErrors: [{ message: 'kaputt' }] } } }]);
  const r = await t.gql(M, {});
  ist('Mutation: userErrors kommen als Daten zurück (pruefeAntwort entscheidet)', [t.z.aufrufe, r.data.productVariantsBulkCreate.userErrors[0].message], [1, 'kaputt']);
}
{ // andere GraphQL-Fehler (z. B. falsches Feld) bei einer Abfrage: nicht wiederholt, als {errors} zurück
  const t = gqlMit([{ errors: [{ message: "Field 'foo' doesn't exist on type 'Product'" }] }]);
  const r = await t.gql(Q, {});
  ist('Abfrage: Schemafehler → ein Aufruf, {errors}', [t.z.aufrufe, /doesn't exist/.test(r.errors[0].message)], [1, true]);
}
{ // fehlt fetch/warte, wird das echte shopifyGql (hier: Attrappe) genau mit versuche:1 für Mutationen und ohne für Abfragen aufgerufen
  const gesehen = [];
  const sg = async (shop, api, token, query, variables, opt) => { gesehen.push([istMutation(query), opt.versuche ?? null]); return { ok: 1 }; };
  const g = gqlFuer({ shop: 's', api: 'a', token: 't', shopifyGql: sg });
  await g(Q, {}); await g(M, {});
  ist('shopifyGql erhält versuche:1 nur bei Mutationen', gesehen, [[false, null], [true, 1]]);
}

// ── API-Version und Abfragetexte gehören zusammen (Befund 14): eine Stelle, 2026-01, kein veraltetes productByHandle
{
  ist('API_VERSION ist 2026-01 (gemessen 27.10.2026: unterstützt 2026-01 … 2026-10; 2025-01 wird nicht mehr unterstützt)', API_VERSION, '2026-01');
  const alle = { Q_PRODUKT, BESTAND_Q, SKU_INDEX_Q, M_OPTION, M_OPTION_WERTE, M_OPTION_WERTE_LOESCHEN, M_REORDER, M_VARIANTEN, M_UPDATE, M_SET, M_META };
  ist('kein GraphQL-Text nutzt das veraltete productByHandle', Object.entries(alle).filter(([, t]) => /productByHandle/.test(t)).map(([k]) => k), []);
  ist('Q_PRODUKT und BESTAND_Q lesen über productByIdentifier(identifier:{handle:$h})', [Q_PRODUKT, BESTAND_Q].map((t) => /productByIdentifier\(identifier:\{handle:\$h\}\)/.test(t)), [true, true]);
  const cli = readFileSync(fileURLToPath(new URL('../pod_auswahl.mjs', import.meta.url)), 'utf8');
  wahr('das Kommando nimmt die Version aus pod_auswahl_gql.mjs und pinnt keine zweite (kein «2025-01»)', /const API = API_VERSION;/.test(cli) && !/2025-01/.test(cli.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')));
  ist('alle Schreib-Mutationen sind «mutation»-Texte (nur sie gehen ohne stille Wiederholung)', Object.entries(alle).filter(([k]) => k.startsWith('M_')).map(([, t]) => istMutation(t)).every(Boolean), true);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
