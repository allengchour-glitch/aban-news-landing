// schreibeSku() in cj_varianten_nachziehen.mjs: nur die SKU der einen Standardvariante wird gesetzt, mit frischem Lesen davor und Rücklesen danach. Shopify ist nachgebildet (kein Netz).
import { schreibeSku, SKU_LESEN, SKU_DOPPELT, SKU_SCHREIBEN } from './cj_varianten_nachziehen.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };

// Jeder Fall bekommt sein eigenes Gedächtnis «im Lauf gesetzt» (sonst sperrte der erste Normalfall alle folgenden mit derselben Ziel-SKU)
const sk = (q, plan, gesetzt = new Set()) => schreibeSku(q, plan, gesetzt);
const PLAN = { produktId: 'gid://shopify/Product/1', varianteId: 'gid://shopify/ProductVariant/1', alteSku: 'CJ-2607290840401606000', neueSku: 'CJYD301744802BY' };
// Nachgebildeter Shop: Stand der Varianten + Antwort der Mutation einstellbar; zählt die Schreibaufrufe
function shop({ varianten = [{ id: PLAN.varianteId, sku: PLAN.alteSku }], anzahl = varianten.length, produkt = true, userErrors = [], antwortSku = PLAN.neueSku, antwortId = PLAN.varianteId, leer = false, doppelt = [] } = {}) {
  const s = { schreibaufrufe: 0, eingaben: [], doppelFragen: [] };
  s.q = async (query, vars) => {
    if (/productVariants\(first:5/.test(query)) { s.doppelFragen.push(vars.q); return { productVariants: { nodes: doppelt } }; }
    if (/productVariantsBulkUpdate/.test(query)) { s.schreibaufrufe++; s.eingaben.push(vars); return { productVariantsBulkUpdate: { productVariants: leer ? [] : [{ id: antwortId, sku: antwortSku }], userErrors } }; }
    return { product: produkt ? { id: PLAN.produktId, variantsCount: { count: anzahl }, variants: { nodes: varianten } } : null };
  };
  return s;
}

let s = shop(); let r = await sk(s.q, PLAN);
ist('Normalfall: geschrieben, genau ein Schreibaufruf', [r, s.schreibaufrufe], [{ ok: true }, 1]);
ist('Die Eingabe enthält NUR die Variante und die SKU (kein Preis, keine Optionen, keine Bilder)', s.eingaben[0], { p: PLAN.produktId, v: [{ id: PLAN.varianteId, inventoryItem: { sku: PLAN.neueSku } }] });

s = shop({ varianten: [{ id: PLAN.varianteId, sku: PLAN.neueSku }] }); r = await sk(s.q, PLAN);
ist('Idempotent: SKU steht schon → nichts schreiben', [r, s.schreibaufrufe], [{ ok: true, schonErledigt: true }, 0]);

s = shop({ varianten: [{ id: PLAN.varianteId, sku: 'CJ-ANDERE-SKU-123456' }] }); r = await sk(s.q, PLAN);
ist('Gegenprobe: SKU seit dem Plan von jemand anderem geändert → nicht anfassen', [r.ok, /SKU seit dem Plan verändert/.test(r.uebersprungen), s.schreibaufrufe], [false, true, 0]);

s = shop({ varianten: [{ id: PLAN.varianteId, sku: PLAN.alteSku }, { id: 'gid://shopify/ProductVariant/2', sku: 'X' }], anzahl: 2 }); r = await sk(s.q, PLAN);
ist('Gegenprobe: inzwischen zwei Varianten → nicht anfassen', [r.ok, r.uebersprungen, s.schreibaufrufe], [false, 'Varianten seit dem Plan verändert', 0]);

s = shop({ varianten: [{ id: 'gid://shopify/ProductVariant/99', sku: PLAN.alteSku }] }); r = await sk(s.q, PLAN);
ist('Gegenprobe: die Variante hat eine andere ID als im Plan → nicht anfassen', [r.ok, s.schreibaufrufe], [false, 0]);

s = shop({ produkt: false }); r = await sk(s.q, PLAN);
ist('Gegenprobe: Produkt nicht mehr da', [r.ok, r.uebersprungen, s.schreibaufrufe], [false, 'Produkt nicht mehr da', 0]);

s = shop({ userErrors: [{ field: ['variants'], message: 'SKU is invalid' }] }); r = await sk(s.q, PLAN);
ist('Shopify meldet userErrors → Fehler, nicht «geschrieben»', [r.ok, /SKU is invalid/.test(r.fehler)], [false, true]);

s = shop({ antwortSku: 'etwas-anderes' }); r = await sk(s.q, PLAN);
ist('Rücklesen zeigt eine andere SKU → Fehler', [r.ok, /Rücklesen/.test(r.fehler)], [false, true]);

s = shop({ leer: true }); r = await sk(s.q, PLAN);
ist('Rücklesen leer → Fehler', [r.ok, /Rücklesen/.test(r.fehler)], [false, true]);

s = shop({ antwortId: 'gid://shopify/ProductVariant/77' }); r = await sk(s.q, PLAN);
ist('Rücklesen nennt eine andere Variante → Fehler', [r.ok, /Rücklesen/.test(r.fehler)], [false, true]);

// ── Doppel-Prüfung (Prüfer 27.10.2026): trägt die Ziel-SKU schon ein ANDERES Produkt, würden danach beide in der Bestell-Engine mehrdeutig
s = shop(); r = await sk(s.q, PLAN);
ist('Normalfall: genau eine Doppel-Abfrage, die beide Formen (nackt und «CJ-») nennt', [s.doppelFragen.length, s.doppelFragen[0]], [1, `sku:"${PLAN.neueSku}" OR sku:"CJ-${PLAN.neueSku}"`]);
s = shop({ doppelt: [{ id: 'gid://shopify/ProductVariant/55', sku: PLAN.neueSku, product: { handle: 'zwilling-mit-auswahl' } }] }); r = await sk(s.q, PLAN);
ist('Ein anderes Produkt trägt die nackte Ziel-SKU → nicht schreiben, zurückgestellt', [r.ok, r.zurueckgestellt, /SKU schon vergeben \(zwilling-mit-auswahl\)/.test(r.uebersprungen), s.schreibaufrufe], [false, true, true, 0]);
s = shop({ doppelt: [{ id: 'gid://shopify/ProductVariant/55', sku: 'CJ-' + PLAN.neueSku, product: { handle: 'von-hand-korrigiert' } }] }); r = await sk(s.q, PLAN);
ist('Ein anderes Produkt trägt die Ziel-SKU mit «CJ-» (von Hand gesetzt, wie die Heizdecke) → nicht schreiben', [r.ok, s.schreibaufrufe], [false, 0]);
s = shop({ doppelt: [{ id: PLAN.varianteId, sku: PLAN.neueSku, product: { handle: 'ich-selbst' } }] }); r = await sk(s.q, PLAN);
ist('Treffer ist die eigene Variante → kein Doppel, schreiben', [r.ok, s.schreibaufrufe], [true, 1]);
s = shop({ doppelt: [{ id: 'gid://shopify/ProductVariant/55', sku: PLAN.neueSku + '-ANDERS', product: { handle: 'aehnlich' } }] }); r = await sk(s.q, PLAN);
ist('Treffer mit nur ähnlicher SKU (Suchtreffer ohne exakte Gleichheit) → kein Doppel, schreiben', [r.ok, s.schreibaufrufe], [true, 1]);

// Gross-/Kleinschreibung: Shopify sucht ohne sie, die Bestell-Engine vergleicht mit .upper() (32 Shop-SKUs tragen «cj-CJ…»)
s = shop({ doppelt: [{ id: 'gid://shopify/ProductVariant/55', sku: ('cj-' + PLAN.neueSku).toLowerCase(), product: { handle: 'klein-geschrieben' } }] }); r = await sk(s.q, PLAN);
ist('Zwilling mit anderer Schreibweise («cj-cjyd…») wird erkannt → nicht schreiben', [r.ok, r.zurueckgestellt, s.schreibaufrufe], [false, true, 0]);
s = shop({ doppelt: [{ id: 'gid://shopify/ProductVariant/55', sku: PLAN.neueSku.toLowerCase(), product: { handle: 'klein-geschrieben' } }] }); r = await sk(s.q, PLAN);
ist('Zwilling mit nackter Ziel-SKU in Kleinbuchstaben wird erkannt', [r.ok, s.schreibaufrufe], [false, 0]);

// Zwei Shop-Produkte derselben CJ-Variante binnen Sekunden: der Suchindex kennt die eben gesetzte SKU noch nicht → der Prozess merkt sich seine Schreibvorgänge
{
  const gesetzt = new Set();
  const plan2 = { ...PLAN, produktId: 'gid://shopify/Product/2', varianteId: 'gid://shopify/ProductVariant/2', alteSku: 'CJ-2607290840401606001' };
  const shop2 = shop({ varianten: [{ id: plan2.varianteId, sku: plan2.alteSku }], antwortId: plan2.varianteId });
  const erstes = await sk(shop().q, PLAN, gesetzt), zweites = await sk(shop2.q, plan2, gesetzt);
  ist('Zwilling im selben Lauf (Index hinkt hinterher): das zweite Produkt wird nicht beschrieben', [erstes.ok, zweites.ok, zweites.zurueckgestellt, /in diesem Lauf/.test(zweites.uebersprungen), shop2.schreibaufrufe], [true, false, true, true, 0]);
}

// Abfragetexte: die Attrappen werten die Auswahl der GraphQL-Abfragen nie aus; ein Tippfehler im Feldnamen bliebe in der CI grün und fiele erst in der Nacht auf
// (Prüfer 27.10.2026; SKU_LESEN und SKU_DOPPELT wurden wortgleich gegen die echte Shopify-API 2025-01 gelesen, die Mutation gegen das Schema geprüft und am 27.10. einmal echt ausgeführt)
ist('SKU_LESEN verlangt Variantenzahl, Varianten-ID und SKU', ['variantsCount{count}', 'variants(first:3){nodes{id sku}}'].every(t => SKU_LESEN.includes(t)), true);
ist('SKU_DOPPELT verlangt SKU, ID und Handle des Produkts', ['productVariants(first:5,query:$q)', 'id sku', 'product{handle}'].every(t => SKU_DOPPELT.includes(t)), true);
ist('SKU_SCHREIBEN setzt productVariantsBulkUpdate ab und liest ID, SKU und userErrors zurück', ['productVariantsBulkUpdate(productId:$p,variants:$v)', 'productVariants{id sku}', 'userErrors{field message}'].every(t => SKU_SCHREIBEN.includes(t)), true);

// Netzfehler im Lesen fliegt zum Aufrufer (der Hauptlauf macht daraus «FEHLER» und zählt die Serie)
let geflogen = false; try { await schreibeSku(async () => { throw new Error('Throttled'); }, PLAN); } catch { geflogen = true; }
ist('Ein Lesefehler wird nicht verschluckt', geflogen, true);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
