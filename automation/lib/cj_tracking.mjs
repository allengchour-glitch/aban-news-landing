// LuxeStyle — lib/cj_tracking.mjs (Version 1, 09.11.2026)
// Reine Entscheidungslogik für die Rückmeldung CJ → Shopify (kein Netz, kein Schreiben).
// Eingabe: die offenen CJ-Positionen einer Shopify-Bestellung (aus den fulfillmentOrders), die schon gemeldeten Lieferungen
// und der CJ-Auftrag `LX<Nr>` (Liste + Detail). Ausgabe: was gemeldet oder nachgetragen werden soll, was wartet, ein «Befund»,
// wenn ein Mensch hinsehen muss, und ob die Bestellung abgeschlossen ist.
// Grundsatz (wie lib/printful_tracking.mjs): lieber nichts melden als falsch melden. Eine Kundin bekommt eine Versandmail
// nur, wenn CJ den Auftrag selbst als versendet führt, eine Sendungsnummer vorliegt UND die Stückzahl bei CJ zu den offenen
// CJ-Positionen im Shop passt.
// Tests: automation/cj_tracking_test.mjs.

/** Shopify-Bestellname «#1034» → CJ-Auftragsnummer «LX1034» (so legt die Engine die Aufträge an). Alles andere (z. B. «#1034-A») → null. */
export function lxNummer(name) {
  const m = String(name == null ? '' : name).trim().match(/^#?(\d{3,})$/);
  return m ? 'LX' + m[1] : null;
}

/** CJ-Positionen erkennt man an der SKU (`CJ…` oder `CJ-CJ…`); Fortura-, Printful- und alle anderen SKUs gehören nicht dazu. */
export function istCjSku(sku) { return /^CJ/i.test(String(sku == null ? '' : sku).trim()); }

/** Anzeigename des Transporteurs für Shopify (aus dem CJ-Versandnamen wie «CJPacket EQ Sensitive»). */
export function trackingFirma(logisticName) {
  const s = String(logisticName == null ? '' : logisticName).trim();
  if (!s) return 'CJ Dropshipping';
  if (/^cjpacket/i.test(s)) return 'CJPacket';
  if (/^dhl/i.test(s)) return 'DHL';
  if (/^postnl/i.test(s)) return 'PostNL';
  if (/^ups\b/i.test(s)) return 'UPS';
  if (/^fedex/i.test(s)) return 'FedEx';
  return s;
}

/**
 * Link für die Sendungsverfolgung. In eine Kundenmail kommt nur ein Link auf t.17track.net (CJ nennt ihn selbst, mit der englischen
 * Oberfläche: wir nehmen die deutsche); jeder andere oder fehlende CJ-Link wird durch unseren eigenen 17track-Link ersetzt.
 */
export function trackingUrl(cjUrl, nummer) {
  const n = String(nummer == null ? '' : nummer).trim();
  const u = String(cjUrl == null ? '' : cjUrl).trim();
  if (/^https:\/\/t\.17track\.net\/[a-z-]+#nums=[A-Za-z0-9]+$/.test(u)) return u.replace(/^(https:\/\/t\.17track\.net\/)[a-z-]+(#)/, '$1de$2');
  return /^[A-Za-z0-9]+$/.test(n) ? `https://t.17track.net/de#nums=${n}` : '';
}

export const CJ_VERSENDET = new Set(['SHIPPED', 'DELIVERED']);
export const CJ_IM_LAGER = new Set(['UNSHIPPED']);
export const CJ_UNBEZAHLT = new Set(['CREATED', 'UNPAID', 'IN_CART']);
export const CJ_STORNIERT = new Set(['CANCELLED', 'CANCELED', 'CLOSED', 'TRASH']);
/** Schwellen in Stunden. «cjHaengt»: bezahlt und noch nicht aus dem CJ-Lager (GEMESSEN 09.11.2026 an 9 Aufträgen: Median 3,4 Tage, höchstens 6,1, ein Ausreisser 9,9). */
export const SCHWELLEN_STUNDEN = { cjFehlt: 24, cjUnbezahlt: 24, cjHaengt: 7 * 24, ohneNummer: 48 };

// Vergleichsform einer Sendungsnummer (Gross-/Kleinschreibung, Leerzeichen, Bindestriche)
const norm = (s) => String(s == null ? '' : s).replace(/[\s\-._]+/g, '').toUpperCase();
export const normNummer = norm;

/** CJ-Zeitstempel «2026-11-04 16:11:47» (UTC, GEMESSEN am Vergleich mit den Shopify-Zeiten) oder ISO → Stunden bis jetzt, sonst null. */
function stundenSeit(wert, jetztMs) {
  if (wert == null || wert === '') return null;
  const t = typeof wert === 'number' ? (wert < 1e12 ? wert * 1000 : wert) : Date.parse(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(wert)) ? String(wert).replace(' ', 'T') + 'Z' : String(wert));
  return Number.isFinite(t) ? (jetztMs - t) / 3600000 : null;
}
const summe = (liste, feld) => liste.reduce((s, x) => s + (Number(x && x[feld]) || 0), 0);
const gerundet = (h) => (h >= 48 ? `${Math.round(h / 24)} Tagen` : `${Math.round(h)} h`);

/**
 * @param {object} p
 * @param {object} p.shop  {name, lx, createdAt,
 *                          zeilen: [{foId, lineId, ortId, remaining}]   offene, meldbare CJ-Positionen (normaler Standort, Fulfillment-Order offen, Aktion erlaubt),
 *                          pausiert: Anzahl offener CJ-Positionen in einer nicht meldbaren Fulfillment-Order,
 *                          cjEinheiten: Summe der Stückzahlen ALLER CJ-Positionen der Bestellung,
 *                          lieferungen: [{id, status, nummern: [...]}]   bisherige Lieferungen der Bestellung,
 *                          bekannteNummern: [...]   Sendungsnummern, die Shopify schon kennt}
 * @param {object|null} p.cj  CJ-Auftrag oder null (nicht gefunden): {status, trackNumber, logisticName, trackingUrl, createDate, paymentDate, outWarehouseTime, einheiten}
 * @param {number} [p.jetztMs]
 * @returns {{aktionen: object[], wartet: string|null, befund: {art: string, text: string}|null, fertig: boolean}}
 *   aktionen: {art:'melden', nummer, firma, url, notify, positionen:[{foId, lineId, ortId, quantity}]} oder {art:'nachtragen', lieferungId, nummer, firma, url, notify}
 */
export function planCj({ shop, cj, jetztMs = Date.now() }) {
  const out = { aktionen: [], wartet: null, befund: null, fertig: false };
  const zeilen = (shop && shop.zeilen) || [];
  const pausiert = Number(shop && shop.pausiert) || 0;
  const hatOffene = zeilen.length > 0 || pausiert > 0;
  const lieferungen = ((shop && shop.lieferungen) || []).filter((l) => l && !['CANCELLED', 'ERROR', 'FAILURE'].includes(l.status));
  const bekannt = new Set(((shop && shop.bekannteNummern) || []).map(norm).filter(Boolean));
  const ohneNummer = lieferungen.filter((l) => !(l.nummern || []).some(Boolean));
  const lx = (shop && shop.lx) || null;
  const alterShop = stundenSeit(shop && shop.createdAt, jetztMs);
  const befund = (art, text) => { out.befund = { art, text }; return out; };

  if (!lx) { out.wartet = 'Bestellname ohne eindeutige Nummer (kein CJ-Auftrag zuordenbar)'; return out; }

  // 1. Kein CJ-Auftrag
  if (!cj) {
    if (!hatOffene && ohneNummer.length === 0) { out.fertig = true; return out; } // alles schon gemeldet, nichts zu prüfen
    if (hatOffene && alterShop != null && alterShop >= SCHWELLEN_STUNDEN.cjFehlt) {
      return befund('cj-fehlt', `bezahlt seit ${gerundet(alterShop)}, aber kein CJ-Auftrag ${lx} gefunden: bei CJ anlegen (sonst wartet die Kundin)`);
    }
    out.wartet = hatOffene ? `CJ-Auftrag ${lx} noch nicht angelegt` : `Lieferung ohne Sendungsnummer, CJ-Auftrag ${lx} nicht gefunden`; return out;
  }

  const status = String(cj.status == null ? '' : cj.status).trim().toUpperCase();

  // 2. Stornierter, unbezahlter, im Lager liegender oder unbekannter Zustand
  if (CJ_STORNIERT.has(status)) {
    if (hatOffene) return befund('cj-storniert', `CJ-Auftrag ${lx} steht auf «${status}», die Bestellung ist aber bezahlt und nicht versendet: prüfen`);
    out.fertig = true; return out;
  }
  if (CJ_UNBEZAHLT.has(status)) {
    if (!hatOffene) { out.fertig = true; return out; }
    const h = stundenSeit(cj.createDate, jetztMs);
    if (h != null && h >= SCHWELLEN_STUNDEN.cjUnbezahlt) return befund('cj-unbezahlt', `CJ-Auftrag ${lx} ist seit ${gerundet(h)} angelegt, aber nicht bezahlt: in CJ bezahlen`);
    out.wartet = `CJ-Auftrag ${lx} angelegt, noch nicht bezahlt`; return out;
  }
  if (CJ_IM_LAGER.has(status)) {
    if (!hatOffene) { out.fertig = true; return out; }
    const h = stundenSeit(cj.paymentDate || cj.createDate, jetztMs);
    if (h != null && h >= SCHWELLEN_STUNDEN.cjHaengt) return befund('cj-haengt', `CJ-Auftrag ${lx} liegt seit ${gerundet(h)} bezahlt im CJ-Lager ohne Versand: CJ-Ticket eröffnen`);
    out.wartet = `CJ-Auftrag ${lx} bezahlt, im CJ-Lager`; return out;
  }
  if (!CJ_VERSENDET.has(status)) return befund('cj-status-unbekannt', `CJ-Auftrag ${lx} hat den unbekannten Status «${status || 'leer'}»`);

  // 3. CJ hat versendet
  const nummer = String(cj.trackNumber == null ? '' : cj.trackNumber).trim();
  if (!nummer) {
    const h = stundenSeit(cj.outWarehouseTime || cj.createDate, jetztMs);
    if (hatOffene && h != null && h >= SCHWELLEN_STUNDEN.ohneNummer) return befund('ohne-nummer', `CJ führt ${lx} als versendet, aber ohne Sendungsnummer (seit ${gerundet(h)})`);
    out.wartet = `${lx} ohne Sendungsnummer`; return out;
  }
  const firma = trackingFirma(cj.logisticName);
  const url = trackingUrl(cj.trackingUrl, nummer);
  const notify = status !== 'DELIVERED'; // schon zugestellt: nichts mehr «ist unterwegs» mailen

  if (hatOffene || ohneNummer.length > 0) {
    // Stückzahl-Vergleich: nur melden, wenn CJ dieselbe Menge verschickt wie die CJ-Positionen der Bestellung
    const cjE = cj.einheiten == null ? null : Number(cj.einheiten);
    const shopE = Number(shop && shop.cjEinheiten) || 0;
    if (cjE == null || !Number.isFinite(cjE)) return befund('positionen-unbekannt', `CJ nennt für ${lx} keine Stückzahl: nicht automatisch melden, von Hand prüfen`);
    if (cjE !== shopE) return befund('positionen-abweichung', `Stückzahl bei CJ (${cjE}) weicht von den CJ-Positionen im Shop (${shopE}) ab: nicht automatisch melden, von Hand prüfen`);
  }

  if (zeilen.length > 0) {
    if (bekannt.has(norm(nummer))) { out.wartet = `Nummer ${nummer} ist in Shopify schon bekannt, Positionen noch offen: von Hand prüfen`; out.befund = { art: 'nummer-bekannt-offen', text: `Sendungsnummer ${nummer} steht schon in Shopify, aber Positionen sind noch offen: von Hand prüfen` }; return out; }
    out.aktionen.push({ art: 'melden', nummer, firma, url, notify, positionen: zeilen.map((z) => ({ foId: z.foId, lineId: z.lineId, ortId: z.ortId || null, quantity: z.remaining })) });
  } else if (!bekannt.has(norm(nummer)) && ohneNummer.length === 1) {
    out.aktionen.push({ art: 'nachtragen', lieferungId: ohneNummer[0].id, nummer, firma, url, notify });
  } else if (!bekannt.has(norm(nummer)) && ohneNummer.length > 1) {
    return befund('mehrere-ohne-nummer', `${ohneNummer.length} Lieferungen ohne Sendungsnummer: ${nummer} lässt sich keiner eindeutig zuordnen, von Hand eintragen`);
  }

  if (pausiert > 0) {
    out.befund = { art: 'nicht-meldbar', text: `${pausiert} CJ-Position(en) liegen in einer Fulfillment-Order, die nicht meldbar ist (pausiert, geplant oder ohne Berechtigung)` };
    return out;
  }
  out.fertig = true; // nichts mehr offen (nach den Aktionen): die Bestellung wird nicht mehr gelesen
  return out;
}
