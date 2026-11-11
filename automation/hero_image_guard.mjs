#!/usr/bin/env node
/**
 * hero_image_guard.mjs — jede Menü-Collection bekommt ein Kategorie-Bild, aber nur ein geprüftes.
 *
 * Ablauf: Handles aus dem Hauptmenü sammeln → Bild je Collection lesen (20 je Abfrage) → nur Collections OHNE Bild
 * bekommen (LIVE) das Titelbild des ersten Produkts, das aktiv, im Onlineshop, lieferbar, ohne Sperr-Tag und mit
 * einem Bild ab 800 × 800 px ist (Regeln und Begründung: lib/hero_bild_wahl.mjs). Ein vorhandenes Bild wird NIE
 * ersetzt. Nach dem Schreiben wird die Collection frisch gelesen; höchstens MAX_SCHREIBEN Bilder je Lauf.
 * Lese- und Schreibfehler werden gezählt und beenden den Lauf mit Exit 1 (früher: still verschluckt, Exit 0).
 *
 * DRY-Default · LIVE=1 schreibt.
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)  MENU_HANDLE=main-menu  MAX_SCHREIBEN=25
 * Rücknahme eines gesetzten Bildes: im Admin bei der Collection entfernen, oder mit dem Banner-Werkzeug
 * (dropship/kategorie-banner-v2/) ein geprüftes Bild setzen; die gesetzten Handles stehen im Bericht unter «gesetzt».
 */
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { entscheid, exitCode } from './lib/hero_bild_wahl.mjs';

const SHOP = process.env.SHOPIFY_SHOP || '', TOK_ST = process.env.SHOPIFY_ADMIN_TOKEN || '',
  CID = process.env.SHOPIFY_CLIENT_ID || '', CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '',
  LIVE = process.env.LIVE === '1', MENU = process.env.MENU_HANDLE || 'main-menu', API = '2025-01',
  MAX_SCHREIBEN = Math.max(0, Number(process.env.MAX_SCHREIBEN ?? 25) || 0);

async function getToken() {
  if (!(CID && CS) && TOK_ST) return TOK_ST;
  if (SHOP && CID && CS) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CS, grant_type: 'client_credentials' }) });
    const j = await r.json().catch(() => ({})); return j.access_token || '';
  }
  return TOK_ST || '';
}
const gql = (token, query, variables) => shopifyGql(SHOP, API, token, query, variables);

const PRODUKTE = `products(first:30){ nodes{ handle status onlineStoreUrl tags featuredImage{ url width height } variants(first:10){ nodes{ availableForSale } } } }`;

async function main() {
  const bericht = { ts: new Date().toISOString(), live: LIVE, maxSchreiben: MAX_SCHREIBEN };
  if (!SHOP) { console.log('no-op: kein SHOPIFY_SHOP.'); return; }
  const token = await getToken(); if (!token) { console.log('no-op: kein Token.'); return; }

  const handles = new Set();
  try {
    // `menu(handle:)` gibt es in der Admin-API nicht; `menus(query:)` liefert das Hauptmenü (gemessen 17.10.2026).
    const mr = await gql(token, `query($q:String){ menus(first:5, query:$q){ nodes{ handle items{ url items{ url items{ url } } } } } }`, { q: `handle:${MENU}` });
    const menu = (mr.menus?.nodes || []).find(x => x.handle === MENU) || null;
    if (!menu) bericht.menuError = `Menü ${MENU} nicht gefunden`;
    const walk = items => { for (const it of items || []) { const mm = (it.url || '').match(/\/collections\/([a-z0-9\-]+)/i); if (mm) handles.add(mm[1].toLowerCase()); walk(it.items); } };
    if (menu) walk(menu.items);
  } catch (e) { bericht.menuError = e.message; }
  bericht.menuCollections = handles.size;

  // 1. Nur das Bild lesen (billig), 20 Collections je Abfrage.
  const liste = [...handles];
  const ohneBild = [], leseFehler = [], fehlend = [];
  for (let i = 0; i < liste.length; i += 20) {
    const teil = liste.slice(i, i + 20);
    const vars = Object.fromEntries(teil.map((h, k) => [`h${k}`, h]));
    const q = `query(${teil.map((_, k) => `$h${k}:String!`).join(',')}){ ${teil.map((_, k) => `c${k}: collectionByHandle(handle:$h${k}){ id handle title image{ url } }`).join(' ')} }`;
    try {
      const d = await gql(token, q, vars);
      teil.forEach((h, k) => { const c = d[`c${k}`]; if (!c) fehlend.push(h); else if (!c.image?.url) ohneBild.push(c); });
    } catch (e) { leseFehler.push({ teil: `${i}-${i + teil.length - 1}`, fehler: e.message }); }
  }

  // 2. Für Collections ohne Bild die ersten 30 Produkte lesen und entscheiden.
  const gesetzt = [], kandidat = [], keinTaugliches = [], schreibFehler = [], ausgelassen = [];
  for (const c0 of ohneBild) {
    let c;
    try { c = (await gql(token, `query($h:String!){ collectionByHandle(handle:$h){ id handle title image{ url } ${PRODUKTE} } }`, { h: c0.handle })).collectionByHandle; }
    catch (e) { leseFehler.push({ handle: c0.handle, fehler: e.message }); continue; }
    const e = entscheid(c);
    if (e.art === 'fehlt') { fehlend.push(c0.handle); continue; }
    if (e.art === 'hat-bild') continue;           // inzwischen hat jemand ein Bild gesetzt: nie überschreiben
    if (e.art === 'kein-taugliches-produkt') { keinTaugliches.push({ handle: c.handle, abgelehnt: e.abgelehnt }); continue; }
    const eintrag = { handle: c.handle, produkt: e.produkt.handle, bild: e.produkt.featuredImage.url };
    kandidat.push(eintrag);
    if (!LIVE) continue;
    if (gesetzt.length >= MAX_SCHREIBEN) { ausgelassen.push(c.handle); continue; }
    try {
      const u = await gql(token, `mutation($id:ID!,$src:String!,$alt:String){ collectionUpdate(input:{id:$id, image:{src:$src, altText:$alt}}){ collection{ id } userErrors{ field message } } }`,
        { id: c.id, src: e.produkt.featuredImage.url, alt: c.title });
      const fe = u.collectionUpdate?.userErrors || [];
      if (fe.length) { schreibFehler.push({ handle: c.handle, fehler: fe.map(x => x.message).join('; ') }); continue; }
      // Frisch lesen statt der Schreibantwort zu glauben.
      const r = (await gql(token, `query($h:String!){ collectionByHandle(handle:$h){ image{ url } } }`, { h: c.handle })).collectionByHandle;
      if (!r?.image?.url) { schreibFehler.push({ handle: c.handle, fehler: 'nach dem Schreiben kein Bild gelesen' }); continue; }
      gesetzt.push({ ...eintrag, gelesen: r.image.url });
    } catch (err) { schreibFehler.push({ handle: c.handle, fehler: err.message }); }
  }

  Object.assign(bericht, { ohneBild: ohneBild.length, fehlend, kandidaten: kandidat.length, keinTaugliches, leseFehler, schreibFehler });
  if (LIVE) Object.assign(bericht, { gesetzt, ausgelassenWegenGrenze: ausgelassen });
  else bericht.wuerdeSetzen = kandidat;
  console.log(JSON.stringify(bericht, null, 2));
  console.log(`ZUSAMMENFASSUNG: ${handles.size} Menü-Collections, ${ohneBild.length} ohne Bild, ${kandidat.length} mit tauglichem Produkt, `
    + `${keinTaugliches.length} ohne taugliches Produkt, ${LIVE ? `${gesetzt.length} gesetzt` : 'Trockenlauf'}, `
    + `${leseFehler.length} Lesefehler, ${schreibFehler.length} Schreibfehler`);
  process.exitCode = exitCode(bericht);
}
main().catch(e => { console.error('Fehler:', e.message); process.exit(1); });
