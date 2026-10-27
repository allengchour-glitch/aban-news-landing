// Tests für lib/grind_schema.mjs (Vergleich der eingebetteten Eingabetypen mit der Introspektion der echten Admin-API) und das Prüfwerkzeug automation/grind_schema_pruefen.mjs.
// Rein, ohne Netz: das Werkzeug wird nur OHNE Zugangsdaten bzw. mit ungültigem Host gestartet (es darf dann nichts senden und muss mit Exit 1 enden).
// Lauf: node automation/lib/grind_schema_test.mjs   (Exit 1 bei einem Fehler)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { typText, vergleicheTyp, vergleicheEnum } from './grind_schema.mjs';
import { SCHEMA, SCHEMA_ENUMS, SCHEMA_API_VERSION, API_VERSION } from './grind_plan.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => {
  const a = JSON.stringify(wert), b = JSON.stringify(soll);
  if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); }
};

// typText: so liefert die Introspektion die Typen (kind/name/ofType)
const s = n => ({ kind: 'SCALAR', name: n, ofType: null });
ist('typText: einfacher Typ', typText(s('String')), 'String');
ist('typText: Pflichtfeld', typText({ kind: 'NON_NULL', name: null, ofType: s('Boolean') }), 'Boolean!');
ist('typText: Liste von Pflicht-Eingaben', typText({ kind: 'LIST', name: null, ofType: { kind: 'NON_NULL', name: null, ofType: { kind: 'INPUT_OBJECT', name: 'FileSetInput', ofType: null } } }), '[FileSetInput!]');
ist('typText: Pflicht-Liste von Pflicht-Eingaben', typText({ kind: 'NON_NULL', name: null, ofType: { kind: 'LIST', name: null, ofType: { kind: 'NON_NULL', name: null, ofType: s('ID') } } }), '[ID!]!');
ist('typText: fehlender Typ ist «?», kein Wurf', [typText(null), typText(undefined)], ['?', '?']);

// vergleicheTyp: die vier Arten von Abweichung einzeln, dazu die Gegenprobe «deckt sich»
const felder = { handle: 'String', status: 'ProductStatus', title: 'String', variants: '[ProductVariantSetInput!]', optionValues: 'offen' };
const echt = { handle: 'String', status: 'ProductStatus', title: 'String', variants: '[ProductVariantSetInput!]', optionValues: 'Irgendwas' };
ist('vergleicheTyp: deckt sich (Feld «offen» wird nicht verglichen)', vergleicheTyp('X', felder, echt).ok, true);
{
  const c = vergleicheTyp('X', felder, { ...echt, barcodes: '[String!]' });
  ist('vergleicheTyp: Feld nur in der API → neu', [c.ok, c.neu, c.fehlt], [false, ['barcodes'], []]);
}
{
  const { handle, ...ohne } = echt;
  const c = vergleicheTyp('X', felder, ohne);
  ist('vergleicheTyp: Feld nur im SCHEMA (gibt es in der API nicht) → fehlt', [c.ok, c.fehlt], [false, ['handle']]);
}
{
  const c = vergleicheTyp('X', felder, { ...echt, status: 'String' });
  ist('vergleicheTyp: anderer Typ → typ mit beiden Seiten im Klartext', [c.ok, c.typ], [false, ['status: ProductStatus ≠ String']]);
}
{
  const c = vergleicheTyp('X', felder, { ...echt, title: 'String!' });
  ist('vergleicheTyp: nur das Ausrufezeichen weicht ab → pflicht, NICHT typ', [c.ok, c.pflicht, c.typ], [false, ['title'], []]);
  const c2 = vergleicheTyp('X', { ...felder, title: 'String!' }, echt);
  ist('vergleicheTyp: SCHEMA verlangt Pflicht, die API nicht → pflicht', [c2.ok, c2.pflicht], [false, ['title']]);
}
ist('vergleicheTyp: trägt den Typnamen', vergleicheTyp('ProductSetInput', {}, {}).name, 'ProductSetInput');
ist('vergleicheTyp: leer gegen leer deckt sich', vergleicheTyp('X', {}, {}).ok, true);
{
  // Die Lücke, die zur Prüfung führte: Admin 2026-10 kennt «barcodes»/«published», 2026-01 «barcode»
  const v2601 = { barcode: 'String', price: 'Money' }, v2610 = { barcodes: '[String!]', price: 'Money', published: 'Boolean' };
  const c = vergleicheTyp('ProductVariantSetInput', v2601, v2610);
  ist('vergleicheTyp: Version 2026-01 gegen 2026-10 wird sichtbar', [c.ok, c.fehlt, c.neu], [false, ['barcode'], ['barcodes', 'published']]);
}

// vergleicheEnum
ist('vergleicheEnum: gleich (Reihenfolge egal)', vergleicheEnum(['ACTIVE', 'DRAFT'], ['DRAFT', 'ACTIVE']).ok, true);
ist('vergleicheEnum: Wert fehlt in der API', (c => [c.ok, c.fehlt, c.neu])(vergleicheEnum(['ACTIVE', 'DRAFT', 'GEHEIM'], ['ACTIVE', 'DRAFT'])), [false, ['GEHEIM'], []]);
ist('vergleicheEnum: neuer Wert in der API', (c => [c.ok, c.fehlt, c.neu])(vergleicheEnum(['ACTIVE'], ['ACTIVE', 'ARCHIVED'])), [false, [], ['ARCHIVED']]);

// Die eingebetteten Tabellen sind formal in Ordnung
ist('SCHEMA_API_VERSION ist die gefahrene API_VERSION', SCHEMA_API_VERSION, API_VERSION);
ist('jedes Feld in SCHEMA trägt einen Typtext (Text, nicht leer)', Object.values(SCHEMA).every(t => Object.values(t).every(x => typeof x === 'string' && x.length > 0)), true);
ist('jedes Enum in SCHEMA_ENUMS ist eine nicht leere Liste von Texten', Object.values(SCHEMA_ENUMS).every(l => Array.isArray(l) && l.length > 0 && l.every(x => typeof x === 'string')), true);
ist('SCHEMA kennt ProductSetInput (21 Felder) und ProductVariantSetInput (17 Felder, mit barcode)', [Object.keys(SCHEMA.ProductSetInput).length, Object.keys(SCHEMA.ProductVariantSetInput).length, 'barcode' in SCHEMA.ProductVariantSetInput], [21, 17, true]);
ist('SCHEMA vergleicht sich mit sich selbst als deckungsgleich (Probe des Vergleichers)', Object.entries(SCHEMA).every(([n, f]) => vergleicheTyp(n, f, f).ok), true);

// Werkzeug: ohne Zugang oder mit ungültigem Host Exit 1 und KEIN Netzzugriff (fetch scheitert sonst mit anderer Meldung)
const werkzeug = fileURLToPath(new URL('../grind_schema_pruefen.mjs', import.meta.url));
const lauf = env => spawnSync(process.execPath, [werkzeug], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8', timeout: 20000 });
{
  const r = lauf({});
  ist('Werkzeug ohne Zugangsdaten: Exit 1 mit Klartext', [r.status, /SHOPIFY_SHOP .* fehlen/.test(r.stderr)], [1, true]);
}
{
  const r = lauf({ SHOPIFY_SHOP: 'evil.example.com', SHOPIFY_CLIENT_ID: 'x', SHOPIFY_CLIENT_SECRET: 'y' });
  ist('Werkzeug mit fremdem Host: Exit 1, bevor Zugangsdaten verschickt werden', [r.status, /Shopify|Shop|Host|myshopify/i.test(r.stderr), /evil\.example\.com\/admin/.test(r.stderr + r.stdout)], [1, true, false]);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
