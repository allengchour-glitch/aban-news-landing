#!/usr/bin/env node
// NUR RECHNEN (liest die JSON-Dateien aus kosten_holen.mjs / kosten_schaetzung_alle.mjs). Aufgabe B (Selbst gestalten, 05.11.2026): Marge je Variante, Abgleich mit den Preisregeln des Repos.
// ENV: OUT=<Ordner mit shop_preise.json, pf_varianten.json, versand_ch.json, schaetzung_alle.json>
// Ausgabe: <OUT>/auswertung.json (alle Zeilen + Bericht) und eine Zusammenfassung auf der Konsole.
//
// Marge (Aufgabenvorgabe) = Verkaufspreis OHNE MWST − Printful-Ware − Printful-Versand (CHF). Der Kunde zahlt dabei keinen Versand, es gibt keine Zahlungsgebühr (Worst Case, Gebühr separat).
// Printful-Ware: «katalog» = GET /products/variant → price (US-Katalog) · «schaetzung» = POST /orders/estimate-costs → subtotal (Rechnung für CH) · «hoch» = das Grössere von beiden.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { endpreis as endpreisAlt } from '../../../automation/lib/pod_preise.mjs';

const OUT = process.env.OUT || './kosten_daten';
const KURS = 0.82435;     // USD→CHF laut Repo (grind_preis.mjs / cj_fracht.mjs)
const KURS_ALT = 0.90;    // pod_preise.mjs und printful_reprice.mjs
const MWST = 0.081;
const lies = (f, d) => (existsSync(join(OUT, f)) ? JSON.parse(readFileSync(join(OUT, f), 'utf8')) : d);
const shop = lies('shop_preise.json'), pfv = lies('pf_varianten.json', {}), vers = lies('versand_ch.json', { q1: {}, q2: {}, q3: {} }), sch = lies('schaetzung_alle.json', { vid: {} });
const r2 = (x) => Math.round(x * 100) / 100;
const rate = (e) => { const l = e?.raten || []; const s = l.find((x) => x.id === 'STANDARD') || l.slice().sort((a, b) => a.usd - b.usd)[0]; return s ? s.usd : null; };
const num = (x) => (x == null || x === '' ? null : Number(x));

const zeilen = [], ohne = [];
for (const p of shop.produkte) for (const v of p.varianten) {
  const vid = v.vid, k = vid ? pfv[vid] : null;
  if (!k || k.preisUsd == null) { ohne.push({ handle: p.handle, sku: v.sku, titel: v.titel, preis: v.preis, status: p.status }); continue; }
  const s = sch.vid?.[vid]; const sOk = s && !s.fehler;
  const ekKat = k.preisUsd, ekSch = sOk ? num(s.zwischensumme) : null, vsRate = rate(vers.q1[vid]), vsSch = sOk ? num(s.versand) : null;
  const vs = vsRate ?? vsSch;
  const ekHoch = ekSch != null ? Math.max(ekKat, ekSch) : ekKat;
  const Pn = v.preis / (1 + MWST);
  const m = (ek, kurs) => (vs == null ? null : r2(Pn - (ek + vs) * kurs));
  const kv = v.preis < 50 ? 7 : 0, geb = 0.034 * v.preis + 0.30;
  const f_alt = vs != null ? (() => { try { const r = endpreisAlt({ einkaufUsd: ekKat, versandUsd: vs }); return r.ok ? r.preisChf : null; } catch { return null; } })() : null;
  const richt = Math.max(ekKat * KURS_ALT * 2.3, ekKat * KURS_ALT + 12);
  zeilen.push({ handle: p.handle, status: p.status, sku: v.sku, titel: v.titel, vid, produktId: k.produktId, preis: v.preis, einstandShop: v.einstand,
    ekKatalogUsd: ekKat, ekSchaetzungUsd: ekSch, versandUsd: vs, versandSchaetzungUsd: vsSch, steuerSchaetzungUsd: sOk ? num(s.steuer) : null, aufpreisSchaetzungUsd: sOk ? num(s.aufpreis) : null,
    preisNetto: r2(Pn), kv, geb: r2(geb),
    margeKatalog: m(ekKat, KURS), margeSchaetzung: ekSch != null ? m(ekSch, KURS) : null, margeHoch: m(ekHoch, KURS), margeKatalogKurs90: m(ekKat, KURS_ALT), margeHochKurs90: m(ekHoch, KURS_ALT),
    margeKatalogNachGebuehr: vs == null ? null : r2(Pn - geb - (ekKat + vs) * KURS),
    margeKatalogMitKundenversand: vs == null ? null : r2(Pn + kv - (0.034 * (v.preis + kv) + 0.30) - (ekKat + vs) * KURS),
    margeKatalogOhneVorsteuer: vs == null ? null : r2(v.preis - (ekKat + vs) * 1.081 * KURS),    // Shop nicht MWST-pflichtig: Erlös = Preis, Printful-Steuer 8.1 % ist Kosten
    margeKatalogStreng: vs == null ? null : r2(Pn - (ekKat + vs) * 1.081 * KURS),               // MWST-pflichtig UND Printful-Steuer nicht abziehbar (unterste Schranke)
    faktorPreisZuEkUsd: r2(v.preis / ekKat), regelAlt: f_alt, regelReprice: r2(Math.ceil(richt) - 0.10) });
}

const zaehle = (feld, grenze) => zeilen.filter((z) => z[feld] != null && z[feld] < grenze).length;
const proProdukt = {};
for (const z of zeilen) {
  const a = (proProdukt[z.handle] ||= { handle: z.handle, status: z.status, n: 0, preisMin: 1e9, preisMax: 0, margeMin: 1e9, margeMax: -1e9, verlust: 0, unter4: 0, ohneVersand: 0, schaetzungMin: 1e9, schaetzungMax: -1e9 });
  a.n++; a.preisMin = Math.min(a.preisMin, z.preis); a.preisMax = Math.max(a.preisMax, z.preis);
  if (z.margeKatalog == null) { a.ohneVersand++; continue; }
  a.margeMin = Math.min(a.margeMin, z.margeKatalog); a.margeMax = Math.max(a.margeMax, z.margeKatalog);
  if (z.margeKatalog < 0) a.verlust++; if (z.margeKatalog < 4) a.unter4++;
  if (z.margeSchaetzung != null) { a.schaetzungMin = Math.min(a.schaetzungMin, z.margeSchaetzung); a.schaetzungMax = Math.max(a.schaetzungMax, z.margeSchaetzung); }
}
const bericht = {
  stand: new Date().toISOString(), kurs: KURS, mwst: MWST, shop: shop.shop,
  varianten: { shop: shop.produkte.reduce((n, p) => n + p.varianten.length, 0), ausgewertet: zeilen.length, ohnePrintfulKosten: ohne.length, ohneVersand: zeilen.filter((z) => z.versandUsd == null).length, mitSchaetzung: zeilen.filter((z) => z.ekSchaetzungUsd != null).length },
  katalog: { verlust: zaehle('margeKatalog', 0), unter4: zaehle('margeKatalog', 4), nachGebuehrUnter0: zaehle('margeKatalogNachGebuehr', 0), nachGebuehrUnter4: zaehle('margeKatalogNachGebuehr', 4), mitKundenversandUnter12: zaehle('margeKatalogMitKundenversand', 12), kurs90Unter0: zaehle('margeKatalogKurs90', 0), kurs90Unter4: zaehle('margeKatalogKurs90', 4), ohneVorsteuerUnter0: zaehle('margeKatalogOhneVorsteuer', 0), ohneVorsteuerUnter4: zaehle('margeKatalogOhneVorsteuer', 4), strengUnter0: zaehle('margeKatalogStreng', 0), strengUnter4: zaehle('margeKatalogStreng', 4) },
  schaetzung: { verlust: zaehle('margeSchaetzung', 0), unter4: zaehle('margeSchaetzung', 4), hochVerlust: zaehle('margeHoch', 0), hochUnter4: zaehle('margeHoch', 4), hochKurs90Verlust: zaehle('margeHochKurs90', 0), hochKurs90Unter4: zaehle('margeHochKurs90', 4) },
  regelAltTrifft: zeilen.filter((z) => z.regelAlt === z.preis).length, regelRepriceTrifft: zeilen.filter((z) => z.regelReprice === z.preis).length,
  proProdukt: Object.values(proProdukt).map((a) => ({ ...a, margeMin: r2(a.margeMin), margeMax: r2(a.margeMax), schaetzungMin: a.schaetzungMin === 1e9 ? null : r2(a.schaetzungMin), schaetzungMax: a.schaetzungMax === -1e9 ? null : r2(a.schaetzungMax) })), ohne,
};
writeFileSync(join(OUT, 'auswertung.json'), JSON.stringify({ bericht, zeilen }, null, 1));
console.log(JSON.stringify({ ...bericht, proProdukt: undefined, ohne: undefined }, null, 1));
console.log('Ohne Printful-Kosten:', ohne.map((o) => `${o.handle}:${o.sku}`).slice(0, 40).join(', '));
