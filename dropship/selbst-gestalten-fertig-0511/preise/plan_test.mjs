import assert from 'node:assert/strict';
import { planen } from './plan.mjs';
let n = 0; const t = (name, f) => { f(); n++; };
const z = (sku, preis, ekK, vers, ekS = null) => ['p-handle', 'ACTIVE', sku, 1, preis, ekK, vers, ekS];
const shop = (m) => Object.fromEntries(Object.entries(m).map(([sku, price]) => [sku, { id: 'gid://v/' + sku, productId: 'gid://p/1', handle: 'p-handle', price: String(price) }]));
// T-Shirt-Beispiel vom 05.11.: 24.90 bei EK 11.92 / Versand 10.39 / Schätzung 11.95 → Formel 27.90
t('erhöht', () => { const r = planen([z('a', 24.9, 11.92, 10.39, 11.95)], shop({ a: 24.9 })); assert.equal(r.plan.length, 1); assert.equal(r.plan[0].neu, 27.9); assert.equal(r.plan[0].alt, 24.9); assert.ok(Math.abs(r.summe - 3) < 1e-9); });
t('nie gesenkt', () => { const r = planen([z('a', 24.9, 11.92, 10.39, 11.95)], shop({ a: 39.9 })); assert.equal(r.plan.length, 0); assert.equal(r.tiefer.length, 1); });
t('gleich', () => { const r = planen([z('a', 24.9, 11.92, 10.39, 11.95)], shop({ a: 27.9 })); assert.equal(r.plan.length, 0); assert.equal(r.gleich.length, 1); });
t('aktueller Shoppreis zählt, nicht der damalige', () => { const r = planen([z('a', 10, 11.92, 10.39, 11.95)], shop({ a: 27.9 })); assert.equal(r.plan.length, 0); });
t('Variante fehlt im Shop', () => { const r = planen([z('b', 24.9, 11.92, 10.39)], shop({ a: 24.9 })); assert.equal(r.fehlt.length, 1); assert.equal(r.plan.length, 0); });
t('ohne Kosten oder Versand kein Preis geraten', () => { const r = planen([z('a', 24.9, null, 10.39), z('c', 24.9, 11.92, null)], shop({ a: 24.9, c: 24.9 })); assert.equal(r.ohneDaten.length, 2); assert.equal(r.plan.length, 0); });
t('Preise enden auf .90', () => { const r = planen([z('a', 5, 3.1, 7.2), z('c', 5, 20.4, 10.5, 22.1)], shop({ a: 5, c: 5 })); for (const p of r.plan) assert.equal(Math.round(p.neu * 100) % 100, 90, p.sku + ' ' + p.neu); assert.equal(r.plan.length, 2); });
console.log(`preise/plan_test: ${n} Prüfungen grün`);
