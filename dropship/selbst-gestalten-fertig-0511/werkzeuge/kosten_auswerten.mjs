#!/usr/bin/env node
// NUR RECHNEN (liest die JSON-Dateien aus kosten_holen.mjs). Aufgabe B (Selbst gestalten, 05.11.2026): Marge je Variante, Abgleich mit den Preisregeln des Repos.
// ENV: OUT=<Ordner mit shop_preise.json, pf_varianten.json, pf_produkte.json, versand_ch.json>   KURS=0.82435
// Ausgabe: <OUT>/auswertung.json (alle Zeilen) und eine Zusammenfassung auf der Konsole.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { endpreis as endpreisAlt } from '../../../automation/lib/pod_preise.mjs';

const OUT = process.env.OUT || './kosten_daten';
const KURS = parseFloat(process.env.KURS || '0.82435');   // USD→CHF laut Repo (grind_preis.mjs / cj_fracht.mjs); pod_preise.mjs und printful_reprice.mjs rechnen mit 0.90
const KURS_ALT = 0.90;
const MWST = 0.081;
const lies = (f, d) => (existsSync(join(OUT, f)) ? JSON.parse(readFileSync(join(OUT, f), 'utf8')) : d);
const shop = lies('shop_preise.json'), pfv = lies('pf_varianten.json', {}), pfp = lies('pf_produkte.json', {}), vers = lies('versand_ch.json', { q1: {}, q2: {}, q3: {} });
const r2 = (x) => Math.round(x * 100) / 100;

// Rate STANDARD (sonst die billigste) in USD
const rate = (e) => { const l = e?.raten || []; const s = l.find((x) => x.id === 'STANDARD') || l.slice().sort((a, b) => a.usd - b.usd)[0]; return s ? s.usd : null; };

// SKUs ohne Printful-Nummer (LS…): Zuordnung über Grösse/Name im Printful-Produkt (518 Mauspad, 259 Strandtuch, 474 Notizbuch, 394 Laptop-Hülle)
function lsZuordnung(sku, titel) {
  const m = String(sku).match(/^LS(\d+)$/); if (!m) return null;
  const p = pfp[m[1]]; if (!p?.varianten) return null;
  const t = String(titel).toLowerCase();
  const nums = (t.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => parseFloat(x.replace(',', '.')));
  // Treffer: Variante des Printful-Produkts, deren Grösse alle Zahlen des Shop-Titels enthält; sonst die einzige Variante
  const treffer = p.varianten.filter((v) => { const s = String(v.groesse || v.name || ''); const sn = (s.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => parseFloat(x.replace(',', '.'))); return nums.length && nums.every((n) => sn.includes(n)); });
  if (treffer.length === 1) return { vid: treffer[0].id, ek: treffer[0].preisUsd, produktId: Number(m[1]), grundlage: 'Grösse im Titel' };
  if (p.varianten.length === 1) return { vid: p.varianten[0].id, ek: p.varianten[0].preisUsd, produktId: Number(m[1]), grundlage: 'einzige Variante' };
  return { vid: null, ek: null, produktId: Number(m[1]), grundlage: 'NICHT EINDEUTIG' };
}

const zeilen = [];
const ohne = [];
for (const p of shop.produkte) for (const v of p.varianten) {
  let vid = v.vid, ek = null, produktId = null, grundlage = 'SKU-Nummer';
  if (vid && pfv[vid]?.preisUsd != null) { ek = pfv[vid].preisUsd; produktId = pfv[vid].produktId; }
  else if (/^LS\d+$/.test(v.sku || '')) { const z = lsZuordnung(v.sku, v.titel); if (z) { vid = z.vid; ek = z.ek; produktId = z.produktId; grundlage = z.grundlage; } }
  if (ek == null) { ohne.push({ handle: p.handle, sku: v.sku, titel: v.titel, preis: v.preis, status: p.status }); continue; }
  const vs = rate(vers.q1[vid]);
  const Pnetto = v.preis / (1 + MWST);
  const L = (ek + (vs ?? 0)) * KURS;               // Printful-Kosten + Versand in CHF
  const marge = Pnetto - L;                        // Aufgabenvorgabe: Preis ohne MWST − Kosten − Versand (Kunde zahlt keinen Versand)
  const kv = v.preis < 50 ? 7 : 0;                 // Kundenversand (Shop erhebt CHF 7 unter CHF 50 nach Rabatt)
  const gebuehr = 0.034 * (v.preis + kv) + 0.30;
  const margeMitKv = Pnetto + kv - gebuehr - L;    // wie Repo (pod_preise.mjs), aber mit MWST
  const margeOhneKvMitGeb = Pnetto - 0.034 * v.preis - 0.30 - L;
  const alt90 = (ek + (vs ?? 0)) * KURS_ALT;
  const f_alt = vs != null ? (() => { try { return endpreisAlt({ einkaufUsd: ek, versandUsd: vs }); } catch { return null; } })() : null;
  const richt = Math.max(ek * KURS_ALT * 2.3, ek * KURS_ALT + 12); const f_reprice = r2(Math.ceil(richt) - 0.10);
  zeilen.push({ handle: p.handle, status: p.status, sku: v.sku, titel: v.titel, vid, produktId, grundlage, preis: v.preis, einstandShop: v.einstand, ekUsd: ek, versandUsd: vs,
    ekChf: r2(ek * KURS), versandChf: vs != null ? r2(vs * KURS) : null, preisNetto: r2(Pnetto),
    marge: r2(marge), margeMitKundenversandUndGebuehr: r2(margeMitKv), margeOhneKundenversandMitGebuehr: r2(margeOhneKvMitGeb),
    margeKurs90: r2(Pnetto - alt90), faktorPreisZuEk: r2(v.preis / (ek * KURS_ALT)),
    regelAlt: f_alt?.ok ? f_alt.preisChf : null, regelReprice: f_reprice });
}

const summe = (f) => zeilen.filter(f).length;
const proProdukt = {};
for (const z of zeilen) { const a = (proProdukt[z.handle] ||= { handle: z.handle, status: z.status, n: 0, margeMin: 1e9, margeMax: -1e9, verlust: 0, unter4: 0, ohneVersand: 0 }); a.n++; a.margeMin = Math.min(a.margeMin, z.marge); a.margeMax = Math.max(a.margeMax, z.marge); if (z.marge < 0) a.verlust++; if (z.marge < 4) a.unter4++; if (z.versandUsd == null) a.ohneVersand++; }
const bericht = {
  stand: new Date().toISOString(), kurs: KURS, mwst: MWST, shop: shop.shop,
  varianten: { shop: shop.produkte.reduce((n, p) => n + p.varianten.length, 0), ausgewertet: zeilen.length, ohnePrintfulKosten: ohne.length, ohneVersand: summe((z) => z.versandUsd == null) },
  verlust: summe((z) => z.marge < 0), unter4: summe((z) => z.marge < 4), unter12MitKvUndGebuehr: summe((z) => z.margeMitKundenversandUndGebuehr < 12),
  regelAltTrifft: summe((z) => z.regelAlt === z.preis), regelRepriceTrifft: summe((z) => z.regelReprice === z.preis),
  proProdukt: Object.values(proProdukt).map((a) => ({ ...a, margeMin: r2(a.margeMin), margeMax: r2(a.margeMax) })), ohne,
};
writeFileSync(join(OUT, 'auswertung.json'), JSON.stringify({ bericht, zeilen }, null, 1));
console.log(JSON.stringify({ ...bericht, proProdukt: undefined, ohne: undefined }, null, 1));
console.log('Ohne Printful-Kosten:', ohne.map((o) => `${o.handle}:${o.sku}`).slice(0, 40).join(', '));
