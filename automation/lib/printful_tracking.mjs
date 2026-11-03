// LuxeStyle — lib/printful_tracking.mjs (Version 2, 03.11.2026 nach unabhängiger Prüfung)
// Reine Entscheidungslogik für die Rückmeldung Printful → Shopify (kein Netz, kein Schreiben).
// Eingabe: der Printful-Auftrag (GET /orders/<id>), die noch offenen POD-Positionen des Shopify-Auftrags
// (aus den fulfillmentOrders, nur solche, die wir selbst melden dürfen) und die Sendungsnummern, die Shopify schon kennt.
// Ausgabe: was als «versendet» gemeldet werden soll (je Sendung ein Eintrag), was warten muss, und ein «Befund»,
// wenn ein Mensch hinsehen muss (Text für Telegram/Tag).
// Grundsatz: lieber nichts melden als falsch melden. Eine Sendung, die sich nicht eindeutig auf offene Shopify-Positionen
// abbilden lässt, wird NICHT gemeldet (die Kundschaft bekäme sonst eine falsche Versandmail oder eine Position gälte zu Unrecht als versendet).
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
/** Zustände, die Printful kennt und die wir verstehen. Alles andere ist ein Befund («unbekannter Status»). */
export const BEKANNTE_STATUS = new Set(['draft', 'failed', 'pending', 'canceled', 'onhold', 'inprocess', 'partial', 'fulfilled', 'inreview', 'archived']);
/** Schwellen (Stunden seit Bestellung im Shop), ab denen ein Zustand ohne Fortschritt ein Befund wird. */
export const SCHWELLEN_STUNDEN = { draft: 24, inreview: 72, pending: 14 * 24, inprocess: 14 * 24, partial: 14 * 24, archived: 14 * 24, ohneNummer: 48 };

const norm = (s) => String(s == null ? '' : s).trim().toUpperCase();
const stundenSeit = (wert, jetztMs) => {
  if (!wert) return null;
  const t = typeof wert === 'number' ? (wert < 1e12 ? wert * 1000 : wert) : Date.parse(String(wert));
  return Number.isFinite(t) ? (jetztMs - t) / 3600000 : null;
};

/**
 * @param {object} p
 * @param {object} p.pfOrder         Printful-Auftrag: {status, items:[{id, variant_id}], shipments:[{id, status, reshipment, carrier, service, tracking_number, tracking_url, ship_date, items:[{item_id, quantity}]}]}
 * @param {Array}  p.foZeilen        offene POD-Positionen: [{foId, lineId, ortId, remaining, variantId}] (nur FO, die wir melden dürfen; variantId null = SKU ohne Printful-Variante)
 * @param {Set<string>|Array<string>} p.bekannteNummern  Sendungsnummern, die Shopify schon an einer (nicht stornierten) Lieferung führt
 * @param {number} [p.alterStunden]  Alter der Shop-Bestellung in Stunden (für «ohne Fortschritt»-Schwellen)
 * @param {number} [p.jetztMs]       aktueller Zeitpunkt (für Tests)
 * @returns {{aktionen:Array, wartet:Array, unklar:Array, uebersprungen:Array, restOffen:number, ohneVariante:number, problem:string|null, befund:string|null, fertig:boolean}}
 */
export function planVersand({ pfOrder, foZeilen, bekannteNummern, alterStunden = 0, jetztMs = Date.now() }) {
  const bekannt = new Set([...(bekannteNummern || [])].map(norm).filter(Boolean));
  const status = String((pfOrder && pfOrder.status) || '').toLowerCase();
  const out = { aktionen: [], wartet: [], unklar: [], uebersprungen: [], restOffen: 0, ohneVariante: 0, problem: null, befund: null, fertig: false };

  if (!BEKANNTE_STATUS.has(status)) { out.befund = `Printful-Status «${status || 'leer'}» ist unbekannt`; return out; }
  if (PROBLEM_STATUS.has(status)) out.problem = status;

  // Vorrat je Variante (Kopien, damit der Aufrufer seine Daten behält); Positionen ohne Printful-Variante zählen getrennt
  const vorrat = new Map();
  for (const z of foZeilen || []) {
    if (!(Number(z.remaining) > 0)) continue;
    if (!z.variantId) { out.ohneVariante += 1; continue; }
    if (!vorrat.has(z.variantId)) vorrat.set(z.variantId, []);
    vorrat.get(z.variantId).push({ foId: z.foId, lineId: z.lineId, ortId: z.ortId || null, remaining: Number(z.remaining) });
  }
  const nichtsOffen = vorrat.size === 0 && out.ohneVariante === 0;
  const zeilenJeVariante = new Map([...vorrat.entries()].map(([v, l]) => [v, l.length]));
  const itemVariante = new Map();
  for (const it of (pfOrder && pfOrder.items) || []) itemVariante.set(String(it.id), Number(it.variant_id) || null);

  // Sendungen vorbereiten: Nachsendungen und stornierte überspringen, gleiche Nummer zusammenlegen
  const nachNummer = new Map();
  for (const sh of (pfOrder && pfOrder.shipments) || []) {
    const nr = String(sh.tracking_number || '').trim();
    const sts = String(sh.status || '').toLowerCase();
    if (sh.reshipment === true) { out.uebersprungen.push({ shipmentId: sh.id, nummer: nr, grund: 'Nachsendung (reshipment)' }); continue; }
    if (sts === 'canceled' || sts === 'cancelled') { out.uebersprungen.push({ shipmentId: sh.id, nummer: nr, grund: 'Sendung storniert' }); continue; }
    if (!nr) { out.wartet.push({ shipmentId: sh.id, grund: 'keine Sendungsnummer', stunden: stundenSeit(sh.ship_date || sh.shipped_at || sh.created, jetztMs) }); continue; }
    const k = norm(nr);
    if (!nachNummer.has(k)) nachNummer.set(k, { ...sh, tracking_number: nr, items: [...(sh.items || [])] });
    else nachNummer.get(k).items.push(...(sh.items || []));
  }
  const neu = [...nachNummer.values()].filter((sh) => !bekannt.has(norm(sh.tracking_number)));

  // Wie viele noch nicht gemeldete Sendungen enthalten welche Variante? (Mehrdeutigkeit: mehrere Shop-Zeilen derselben Variante UND getrennte Sendungen)
  const sendungenJeVariante = new Map();
  for (const sh of neu) for (const v of new Set((sh.items || []).map((it) => itemVariante.get(String(it.item_id))).filter(Boolean))) sendungenJeVariante.set(v, (sendungenJeVariante.get(v) || 0) + 1);

  for (const sh of neu) {
    const nr = String(sh.tracking_number).trim();
    if (nichtsOffen) { out.uebersprungen.push({ shipmentId: sh.id, nummer: nr, grund: 'Shop-Positionen schon erledigt (Sendungsnummer fehlt in Shopify)' }); continue; }
    const zuteilung = [];
    const entnahme = new Map(); // lineId -> in dieser Sendung vergebene Menge (Rückgabe bei Abbruch)
    let ok = true; let grund = '';
    for (const it of sh.items || []) {
      const vid = itemVariante.get(String(it.item_id));
      const menge = Number(it.quantity);
      if (!vid) { ok = false; grund = `Printful-Position ${it.item_id} ohne Variante`; break; }
      if (!Number.isFinite(menge) || menge <= 0) { ok = false; grund = `Printful-Position ${it.item_id} ohne gültige Menge`; break; }
      if ((zeilenJeVariante.get(vid) || 0) > 1 && (sendungenJeVariante.get(vid) || 0) > 1) { ok = false; grund = `Variante ${vid}: mehrere Shop-Positionen und mehrere Sendungen, Zuordnung mehrdeutig`; break; }
      let rest = menge;
      for (const z of vorrat.get(vid) || []) {
        if (rest <= 0) break;
        const nimm = Math.min(rest, z.remaining);
        if (nimm > 0) { zuteilung.push({ foId: z.foId, lineId: z.lineId, ortId: z.ortId, quantity: nimm }); z.remaining -= nimm; entnahme.set(z.lineId, (entnahme.get(z.lineId) || 0) + nimm); rest -= nimm; }
      }
      if (rest > 0) { ok = false; grund = `Variante ${vid}: ${rest} Stück ohne offene Position im Shop`; break; }
    }
    if (!ok || zuteilung.length === 0) {
      for (const z of [...vorrat.values()].flat()) z.remaining += entnahme.get(z.lineId) || 0; // Vorrat zurückgeben
      out.unklar.push({ shipmentId: sh.id, nummer: nr, grund: grund || 'Sendung ohne Positionen' });
      continue;
    }
    out.aktionen.push({ shipmentId: sh.id, nummer: nr, url: sh.tracking_url || null, firma: trackingFirma(sh.carrier, sh.service), positionen: zuteilung });
  }

  out.restOffen = [...vorrat.values()].flat().reduce((a, z) => a + Math.max(0, z.remaining), 0);

  // Befund (ein Mensch muss hinsehen), in dieser Reihenfolge der Wichtigkeit
  if (out.problem) out.befund = `Printful-Auftrag steht auf «${out.problem}» (Zahlung/Druckdatei im Dashboard prüfen)`;
  else if (out.unklar.length) out.befund = `Sendung nicht eindeutig zuordenbar: ${out.unklar.map((u) => `${u.nummer}: ${u.grund}`).join('; ')}`;
  else if (out.ohneVariante > 0) out.befund = `${out.ohneVariante} POD-Position(en) ohne Printful-Variante in der SKU (der Sync hat sie nicht an Printful gegeben)`;
  else if (status === 'fulfilled' && out.wartet.some((w) => w.stunden != null && w.stunden > SCHWELLEN_STUNDEN.ohneNummer)) out.befund = 'Printful hat versendet, aber seit über 48 Stunden keine Sendungsnummer geliefert';
  // «fulfilled, aber Shop offen» erst, wenn keine Sendung mehr auf ihre Nummer wartet (sonst ist die offene Position genau die Folge davon)
  else if (status === 'fulfilled' && out.restOffen > 0 && out.wartet.length === 0) out.befund = `Printful meldet «fulfilled», aber ${out.restOffen} Stück sind im Shop noch offen`;
  else if (SCHWELLEN_STUNDEN[status] != null && alterStunden > SCHWELLEN_STUNDEN[status] && status !== 'fulfilled') {
    out.befund = status === 'draft' ? 'Printful-Auftrag ist noch ein Entwurf (nie bestätigt), der Druck hat nicht begonnen'
      : status === 'inreview' ? 'Printful-Auftrag hängt seit über 72 Stunden in der Prüfung'
        : `Printful-Auftrag steht seit über ${Math.round(SCHWELLEN_STUNDEN[status] / 24)} Tagen auf «${status}»`;
  }

  // «fertig»: Printful sagt fulfilled, alle POD-Positionen sind gemeldet (jetzt oder früher), keine Sendung offen, kein Befund
  out.fertig = status === 'fulfilled' && out.restOffen === 0 && out.ohneVariante === 0 && out.unklar.length === 0 && out.wartet.length === 0 && !out.befund;
  return out;
}

/** Vergleich Empfänger Shop ↔ Printful (Schutz gegen zwei Shop-Bestellungen mit derselben printful.order_id). Fehlen Daten, gilt «passt». */
export function empfaengerPasst(shop, pf) {
  const n = (s) => String(s == null ? '' : s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const sName = n(shop && shop.name), pName = n(pf && pf.name);
  const sZip = n(shop && shop.zip), pZip = n(pf && pf.zip);
  if (!(sName && pName) && !(sZip && pZip)) return { ok: true, grund: 'keine Vergleichsdaten' };
  const zipGleich = sZip && pZip && sZip === pZip;
  const nameGleich = sName && pName && sName === pName;
  if (zipGleich || nameGleich) return { ok: true, grund: '' };
  return { ok: false, grund: `Empfänger passt nicht (Shop «${shop && shop.name || '?'}», Printful «${pf && pf.name || '?'}»)` };
}

/** Gruppiert die Positionen einer Aktion je Standort und Fulfillment-Order für fulfillmentCreate (lineItemsByFulfillmentOrder). Ein Aufruf darf nur Orders EINES Standorts mischen. */
export function nachOrtUndFulfillmentOrder(positionen) {
  const orte = new Map();
  for (const p of positionen) {
    const ort = p.ortId || '';
    if (!orte.has(ort)) orte.set(ort, new Map());
    const fos = orte.get(ort);
    if (!fos.has(p.foId)) fos.set(p.foId, new Map());
    const z = fos.get(p.foId);
    z.set(p.lineId, (z.get(p.lineId) || 0) + p.quantity);
  }
  return [...orte.values()].map((fos) => [...fos.entries()].map(([fulfillmentOrderId, zeilen]) => ({
    fulfillmentOrderId,
    fulfillmentOrderLineItems: [...zeilen.entries()].map(([id, quantity]) => ({ id, quantity })),
  })));
}
