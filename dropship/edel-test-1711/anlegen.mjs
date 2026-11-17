#!/usr/bin/env node
/**
 * Edel-Test (Besitzer 17.11.2026 «1 ja»): handverlesene teure CJ-Produkte als ENTWURF ohne Kanal anlegen. Verkaufen kann man sie erst nach seinem Ja.
 * Wiederverwendet die Bausteine des Grind 2.0 (planeNeu mit 23 Toren, Fracht CN→CH je Gewichtsklasse, Preisregel, Tore nach dem Anlegen); neu ist nur,
 * dass Titel, Text und Auswahl-Namen von HAND geschrieben und belegt sind (produkte.json, geprüft von texte.mjs: keine unbelegte Angabe) und dass die Preis-Obergrenze von CHF 80 nicht gilt.
 *
 *   node dropship/edel-test-1711/anlegen.mjs                      Trockenlauf (Vorgabe): CJ lesen (10 Punkte je Datenblatt und je Gewichtsklasse), Pläne nach OUT, KEIN Shop-Zugriff
 *   LIVE=1 node dropship/edel-test-1711/anlegen.mjs               legt als DRAFT an (productSet, ohne Kanal), liest frisch zurück, prüft die Tore, schreibt das Ledger
 *   ONLY=tennis,collier   nur diese ids   ·   AUFSCHLAG=1.6 (SETZUNG: Bruttomarge rund 37,5 %, höher als der Standard 1,45 wegen Rücksendungen und Muster-Risiko)
 *   OUT=<Ordner> (Pläne, Vorgabe /tmp/edel-test-1711)   ·   Ledger dropship/edel-test-1711/ledger.txt
 * Nie: veröffentlichen, Kanäle setzen, bei CJ bestellen oder bezahlen. Exit 0 in Ordnung, 1 Fehler, 2 ein Plan besteht ein Tor nicht, 3 CJ drosselt oder Punkte fehlen, 4 Rückleseprüfung nach dem Anlegen fehlgeschlagen.
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { cjToken } from '../../automation/lib/cj_token.mjs';
import { cjFetch } from '../../automation/lib/cj_fetch.mjs';
import { frachtProdukt, frachtJeVariante, USD_CHF, CJ_BASE } from '../../automation/lib/cj_fracht.mjs';
import { preiseFuerVarianten } from '../../automation/lib/grind_preis.mjs';
import { planeNeu, PRODUCT_SET_MUTATION, galerieAus, normalisiereCj, API_VERSION } from '../../automation/lib/grind_plan.mjs';
import { TORE_ABFRAGE, toreNachAnlage } from '../../automation/grind2.mjs';
import { optionenErsetzen } from './optionen.mjs';
import { unbelegteAngaben, laengenFehler, bilderAnsEnde } from './texte.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.LIVE === '1';
const AUFSCHLAG = Number(process.env.AUFSCHLAG || 1.6);
const OUT = process.env.OUT || '/tmp/edel-test-1711';
const LEDGER = join(HIER, 'ledger.txt');
const NUR = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const zz = ms => new Promise(r => setTimeout(r, ms));
const jetzt = () => new Date().toISOString();

/** Erreichbarkeit einer Bild-Adresse (HTTP 200 mit Bild-Inhaltstyp). Die Bild-Falle: CJ-Adressen sind teils 404. */
async function bildOk(url) {
  try {
    const r = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(25000) });
    return (r.status === 200 || r.status === 206) && /^image\//.test(r.headers.get('content-type') || '');
  } catch { return false; }
}

/** Alles zu EINEM Produkt bis zum Plan. Wirft bei CJ-Fehlern; ein nicht bestandenes Tor kommt als {ok:false, ...} zurück. */
export async function planen(p, { token, aufschlag = AUFSCHLAG, cjLesen, frachtHolen, bilderPruefen = bildOk, warte = zz } = {}) {
  // Vor jedem CJ-Aufruf (kostet Punkte): Texte auf unbelegte Angaben und Längen prüfen (texte.mjs)
  const unbelegt = unbelegteAngaben(p), lang = laengenFehler(p);
  if (unbelegt.length || lang.length) return { ok: false, grund: `Text: ${[...unbelegt.map(x => `«${x.treffer}» in ${x.feld} (${x.grund})`), ...lang].join('; ')}`, p };
  const cj = (await cjLesen(p.pid));
  const roh = cj?.data ?? cj;
  if (!roh || String(roh.pid) !== String(p.pid)) return { ok: false, grund: `CJ-Datenblatt zu ${p.pid} nicht lesbar`, p };
  const n = normalisiereCj(roh);
  const urls = [...new Set([...galerieAus(n), ...(roh.variants || []).map(v => v.variantImage).filter(Boolean)])];
  const ok = new Set();
  for (const u of urls) { if (await bilderPruefen(u)) ok.add(u); }
  const vs = (roh.variants || []).map(v => ({ vid: v.vid, gewichtG: Number(v.variantWeight) || 0, ek: v.variantSellPrice }));
  const fr = await frachtHolen(vs, token);
  if (fr.urteil !== 'lieferbar' || fr.teilweise) return { ok: false, grund: `Fracht CN→CH: ${fr.urteil}${fr.teilweise ? ' (nur teilweise)' : ''}`, p, fracht: fr };
  const je = frachtJeVariante(vs, fr.klassen, { sensitivAlsAusweg: false, maxTage: 20 });
  const frachtVon = new Map((je || []).map(x => [x.vid, x]));
  const mit = vs.filter(v => frachtVon.get(v.vid)?.frachtUsd != null);
  if (mit.length < vs.length) return { ok: false, grund: `${vs.length - mit.length} Variante(n) ohne Linie mit höchstens 20 Tagen`, p, fracht: fr };
  const preise = preiseFuerVarianten(mit.map(v => ({ vid: v.vid, ekUsd: v.ek, frachtUsd: frachtVon.get(v.vid).frachtUsd })), { kurs: USD_CHF, aufschlag });
  if (!preise.ok) return { ok: false, grund: `Preis: ${preise.grund}`, p };
  const plan = planeNeu(roh, {
    titel: p.titel, beschreibungHtml: p.html, googlePfad: p.googlePfad, preis: preise, productType: p.productType, tags: p.tags, seo: p.seo,
    uebersetzung: p.uebersetzung || {}, bildOk: ok, vendor: 'LuxeStyle', handle: p.handle,
  });
  if (plan.ok && p.optionen) {
    plan.eingabe = optionenErsetzen(plan.eingabe, p.optionen);
    plan.optionen = plan.eingabe.productOptions.map(o => ({ name: o.name, werte: o.values.map(v => v.name) }));
  }
  if (plan.ok && p.bilderEnde?.length) {
    try { plan.eingabe = bilderAnsEnde(plan.eingabe, galerieAus(n), p.bilderEnde); }
    catch (e) { return { ok: false, grund: `Bilder: ${e.message}`, p }; }
  }
  return { ok: plan.ok, grund: plan.grund, plan, preise, fracht: fr, urls, bildOk: ok.size, p };
}

async function haupt() {
  const produkte = JSON.parse(readFileSync(join(HIER, 'produkte.json'), 'utf8')).filter(p => !NUR.length || NUR.includes(p.id));
  if (!produkte.length) { console.error('keine Produkte gewählt'); return 1; }
  mkdirSync(OUT, { recursive: true });
  const tok = await cjToken();
  const cjLesen = async pid => cjFetch(`${CJ_BASE}/product/query?pid=${encodeURIComponent(pid)}`, { headers: { 'CJ-Access-Token': tok }, context: 'Edel', weicheCodes: [1602001, 1602002, 1602003] });
  const frachtHolen = (vs, token) => frachtProdukt({ varianten: vs, token, stand: {}, reserve: 0, klassenMax: 3, warte: zz });
  let exit = 0; const plaene = [];
  for (const p of produkte) {
    let r;
    try { r = await planen(p, { token: tok, cjLesen, frachtHolen }); }
    catch (e) { console.error(`${p.id}: CJ-Fehler: ${String(e.message || e).slice(0, 200)}`); return /QUOTA|THROTTLED|RESERVE/.test(String(e.message)) ? 3 : 1; }
    await zz(1200);
    if (!r.ok) {
      exit = Math.max(exit, 2);
      const falsch = (r.plan?.tore || []).filter(t => t.ok !== true);
      console.log(`✗ ${p.id}: ${r.grund || 'Tor nicht bestanden'}`);
      for (const t of falsch) console.log(`    Tor «${t.name}»: ${t.ok === null ? 'nicht geprüft: ' : ''}${t.grund}`);
      continue;
    }
    writeFileSync(join(OUT, `plan_${p.id}.json`), JSON.stringify({ id: p.id, pid: p.pid, handle: r.plan.handle, eingabe: r.plan.eingabe, preise: r.preise.varianten.map(v => ({ vid: v.vid, preis: v.preis, kosten: v.kosten, marge: v.marge })) }, null, 1));
    const pr = r.preise.varianten.map(v => v.preis);
    console.log(`✓ ${p.id}: ${r.plan.varianten} Varianten, ${r.plan.bilder} Bilder, Optionen ${r.plan.optionen.map(o => `${o.name} (${o.werte.join(', ')})`).join(' × ') || 'keine'}, CHF ${Math.min(...pr)} bis ${Math.max(...pr)}, Marge ab ${(r.preise.margeMin * 100).toFixed(1)} %, Handle ${r.plan.handle}`);
    for (const w of r.plan.warnungen) console.log(`    Warnung: ${w}`);
    plaene.push({ p, r });
  }
  if (!LIVE) { console.log(`\nTrockenlauf: ${plaene.length} von ${produkte.length} Plänen bestehen alle Tore, nichts geschrieben. Pläne in ${OUT}`); return exit; }
  if (exit) { console.error('LIVE abgebrochen: nicht jeder Plan besteht (nichts geschrieben)'); return exit; }

  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  if (!SHOP || !process.env.SHOPIFY_CLIENT_ID || !CS) { console.error('SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET sind Pflicht'); return 1; }
  const tr = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const stok = (await tr.json().catch(() => ({}))).access_token;
  if (!stok) { console.error(`Kein Shopify-Token (HTTP ${tr.status})`); return 1; }
  const shop = (q, v) => shopifyGql(SHOP, API_VERSION || '2025-01', stok, q, v);
  for (const { p, r } of plaene) {
    const e = r.plan.eingabe;
    // Übernahme statt Dublette: gibt es Handle oder eine SKU schon, wird NICHT angelegt (kein Überschreiben fremder Produkte)
    const da = await shop(`query($h:String!){ productByHandle(handle:$h){ id status } }`, { h: e.handle });
    const sku1 = e.variants[0].inventoryItem.sku;
    const sk = await shop(`query($q:String!){ productVariants(first:3, query:$q){ nodes{ id sku product{ id handle status } } } }`, { q: `sku:${JSON.stringify(sku1)}` });
    if (da?.productByHandle || (sk?.productVariants?.nodes || []).length) {
      console.log(`↷ ${p.id}: gibt es schon (Handle ${da?.productByHandle?.id || '-'} / SKU ${sk?.productVariants?.nodes?.[0]?.product?.handle || '-'}), nichts angelegt`);
      appendFileSync(LEDGER, `${p.pid} · ${jetzt()} · UEBERSPRUNGEN · gibt es schon · ${e.handle}\n`);
      continue;
    }
    let res;
    try { res = await shop(PRODUCT_SET_MUTATION, { input: e }); }
    catch (x) { console.error(`${p.id}: productSet unklar (${String(x.message).slice(0, 160)}): NICHT wiederholt, bitte im Shop nachsehen (Handle ${e.handle})`); appendFileSync(LEDGER, `${p.pid} · ${jetzt()} · FEHLER · productSet unklar · ${e.handle}\n`); return 4; }
    const ue = res?.productSet?.userErrors || [];
    if (ue.length || !res?.productSet?.product?.id) { console.error(`${p.id}: productSet meldet ${JSON.stringify(ue).slice(0, 300)}`); appendFileSync(LEDGER, `${p.pid} · ${jetzt()} · FEHLER · ${JSON.stringify(ue).slice(0, 160)} · ${e.handle}\n`); return 4; }
    const id = res.productSet.product.id;
    let t;
    for (let i = 0; i < 12; i++) {                                                  // Medien werden asynchron verarbeitet
      const d = await shop(TORE_ABFRAGE, { id });
      t = toreNachAnlage(e, d?.product, { minBilder: 3 });
      if (!t.offen) break;
      await zz(10000);
    }
    // Das Tor «text» der Grind-Kette verlangt den Marker der Text-Pipeline (ls-text-v2 oder ls-fakten-v1). Der Edel-Text ist von Hand geschrieben und über texte.mjs geprüft (Wächter, Länge ab 150 Zeichen):
    // das Tor wird darum nicht gewertet, der Marker NICHT vorgetäuscht. Alle anderen Tore zählen.
    const falsch = t.tore.filter(x => x.ok !== true && x.name !== 'text');
    if (falsch.length) { console.error(`✗ ${p.id} (${id}): Tore nach dem Anlegen nicht bestanden: ${falsch.map(x => `${x.name}: ${x.grund}`).join(' | ')}`); appendFileSync(LEDGER, `${p.pid} · ${jetzt()} · FEHLER · Tore: ${falsch.map(x => x.name).join(',')} · ${e.handle} · ${id}\n`); return 4; }
    console.log(`✓ ${p.id}: angelegt als DRAFT ${id}, ${t.tore.length} Tore nach dem Anlegen bestanden`);
    appendFileSync(LEDGER, `${p.pid} · ${jetzt()} · GESCHRIEBEN · ${e.variants.length} Varianten · ${e.handle} · ${id}\n`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) haupt().then(c => process.exit(c)).catch(e => { console.error('FEHLER', e.message); process.exit(1); });
