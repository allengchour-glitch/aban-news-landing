// LuxeStyle — lib/printful_tracking.mjs
// Reine Entscheidungslogik für die Rückmeldung Printful → Shopify (kein Netz, kein Schreiben).
// Eingabe: der Printful-Auftrag (GET /orders/<id>), die noch offenen POD-Positionen des Shopify-Auftrags
// (aus den fulfillmentOrders) und die Sendungsnummern, die Shopify schon kennt.
// Ausgabe: was als «versendet» gemeldet werden soll (je Sendung ein Eintrag), was warten muss, was ein Mensch ansehen muss.
// Grundsatz: lieber nichts melden als falsch melden. Eine Sendung, die sich nicht eindeutig auf offene Shopify-Positionen
// abbilden lässt, wird NICHT gemeldet (Kunde bekäme sonst eine falsche Versandmail oder eine Bestellposition gälte zu Unrecht als versendet).
// Tests: automation/printful_tracking_test.mjs.

/** Printful-Variante aus der Shopify-SKU «<sync>_<variantId>» (wie printful_sync.mjs variantFromSku). */
export function variantIdVonSku(sku) {
  const m = String(sku || '').match(/_(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

const FIRMEN = {
  LPS: 'Latvian Postal Services',
  DHL: 'DHL',
  DHL_EXPRESS: 'DHL Express',
  DPD: 'DPD',
  UPS: 'UPS',
  FEDEX: 'FedEx',
  POST_NL: 'PostNL',
  POSTNL: 'PostNL',
  USPS: 'USPS',
  ROYAL_MAIL: 'Royal Mail',
  CORREOS: 'Correos',
  POSTE_ITALIANE: 'Poste Italiane',
  POCZTA_POLSKA: 'Poczta Polska',
};

/** Anzeigename des Transporteurs für Shopify. Unbekanntes Kürzel → Name aus «service», sonst das Kürzel selbst. */
export function trackingFirma(carrier, service) {
  const k = String(carrier || '').trim();
  if (!k && !service) return 'Printful';
  const bekannt = FIRMEN[k.toUpperCase().replace(/[\s-]+/g, '_')];
  if (bekannt) return bekannt;
  const s = String(service || '').replace(/\s*(standard|economy|express|priority|trackable|tracked|flat rate)\b.*$/i, '').trim();
  return s || k || 'Printful';
}

/** Printful-Zustände, bei denen ein Mensch handeln muss (Zahlung, Druckdatei, Abbruch). */
export const PROBLEM_STATUS = new Set(['failed', 'canceled', 'onhold']);

/**
 * @param {object} p
 * @param {object} p.pfOrder        Printful-Auftrag: {status, items:[{id, variant_id}], shipments:[{id, carrier, service, tracking_number, tracking_url, reshipment, items:[{item_id, quantity}]}]}
 * @param {Array}  p.foZeilen       offene POD-Positionen: [{foId, lineId, remaining, variantId}] (nur fulfillmentOrders OPEN/IN_PROGRESS)
 * @param {Set<string>|Array<string>} p.bekannteNummern  Sendungsnummern, die Shopify schon an irgendeiner Lieferung führt
 * @returns {{aktionen:Array, wartet:Array, unklar:Array, restOffen:number, problem:string|null, fertig:boolean}}
 */
export function planVersand({ pfOrder, foZeilen, bekannteNummern }) {
  const bekannt = new Set([...(bekannteNummern || [])].map((x) => String(x).trim().toUpperCase()));
  const status = String(pfOrder && pfOrder.status || '').toLowerCase();
  const out = { aktionen: [], wartet: [], unklar: [], restOffen: 0, problem: null, fertig: false };

  if (PROBLEM_STATUS.has(status)) { out.problem = status; return out; }

  // Vorrat je Variante: Kopien, damit der Aufrufer seine Daten behält
  const vorrat = new Map();
  for (const z of foZeilen || []) {
    if (!(z.remaining > 0) || !z.variantId) continue;
    if (!vorrat.has(z.variantId)) vorrat.set(z.variantId, []);
    vorrat.get(z.variantId).push({ foId: z.foId, lineId: z.lineId, remaining: z.remaining });
  }
  const itemVariante = new Map();
  for (const it of (pfOrder && pfOrder.items) || []) itemVariante.set(String(it.id), Number(it.variant_id) || null);

  for (const sh of (pfOrder && pfOrder.shipments) || []) {
    const nr = String(sh.tracking_number || '').trim();
    if (!nr) { out.wartet.push({ shipmentId: sh.id, grund: 'keine Sendungsnummer' }); continue; }
    if (bekannt.has(nr.toUpperCase())) continue; // Shopify kennt diese Sendung schon

    // Positionen zuordnen: erst alles zuteilen, dann entscheiden (ganz oder gar nicht)
    const zuteilung = [];
    let ok = true; let grund = '';
    const entnahme = new Map(); // lineId -> schon in dieser Sendung vergebene Menge (Rückgängig bei Abbruch)
    for (const it of sh.items || []) {
      const vid = itemVariante.get(String(it.item_id));
      const menge = Number(it.quantity) || 0;
      if (!vid) { ok = false; grund = `Printful-Position ${it.item_id} ohne Variante`; break; }
      if (menge <= 0) continue;
      let rest = menge;
      for (const z of vorrat.get(vid) || []) {
        if (rest <= 0) break;
        const nimm = Math.min(rest, z.remaining);
        if (nimm > 0) { zuteilung.push({ foId: z.foId, lineId: z.lineId, quantity: nimm }); z.remaining -= nimm; entnahme.set(z.lineId, (entnahme.get(z.lineId) || 0) + nimm); rest -= nimm; }
      }
      if (rest > 0) { ok = false; grund = `Variante ${vid}: ${rest} Stück ohne offene Position im Shop`; break; }
    }
    if (!ok || zuteilung.length === 0) {
      // zurückgeben, was diese (abgebrochene) Sendung schon aus dem Vorrat genommen hat
      for (const z of [...vorrat.values()].flat()) z.remaining += entnahme.get(z.lineId) || 0;
      out.unklar.push({ shipmentId: sh.id, nummer: nr, grund: grund || 'Sendung ohne Positionen' });
      continue;
    }
    out.aktionen.push({
      shipmentId: sh.id,
      nummer: nr,
      url: sh.tracking_url || null,
      firma: trackingFirma(sh.carrier, sh.service),
      positionen: zuteilung,
    });
  }

  out.restOffen = [...vorrat.values()].flat().reduce((a, z) => a + Math.max(0, z.remaining), 0);
  // «fertig»: Printful sagt fulfilled, alle POD-Positionen sind gemeldet (jetzt oder früher), keine Sendung ist offen
  out.fertig = status === 'fulfilled' && out.restOffen === 0 && out.unklar.length === 0 && out.wartet.length === 0;
  return out;
}

/** Gruppiert die Positionen einer Aktion je Fulfillment-Order für fulfillmentCreate (lineItemsByFulfillmentOrder). */
export function nachFulfillmentOrder(positionen) {
  const m = new Map();
  for (const p of positionen) {
    if (!m.has(p.foId)) m.set(p.foId, new Map());
    const e = m.get(p.foId);
    e.set(p.lineId, (e.get(p.lineId) || 0) + p.quantity);
  }
  return [...m.entries()].map(([fulfillmentOrderId, zeilen]) => ({
    fulfillmentOrderId,
    fulfillmentOrderLineItems: [...zeilen.entries()].map(([id, quantity]) => ({ id, quantity })),
  }));
}
