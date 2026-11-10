// Nacharbeit zum Katzen-Futterautomaten (Product 15523986473345).
// Auftrag: Besitzer 10.11. nachmittags auf die Auswahlfrage «Soll das Bild weg?» → «entscheid du» und «fertig fix und live».
//
//  SCHRITT=bild      Das fünfte (letzte) Galeriebild entfernen. Es zeigt die fremde Marke «Xiao Pei ®» und Angaben
//                    («Capacity: 2.85L ~ 1.5kg», «can feed for 15 days»), die nicht im CJ-Datenblatt stehen (selbst gesichtet
//                    10.11. 12:27 UTC; Bytes gesichert, SHA-256 unten). Die anderen vier Bilder und das Hauptbild bleiben.
//  SCHRITT=sammlung  In der Beschreibung der Sammlung «Futterautomaten & Futterspender» einen Satz mit Link zum Produkt
//                    ergänzen (Codex R169, Freigabeentwurf: auf Seite 1 der Sammlung fehlt der Produktlink, Seite 2 führt ihn).
//
// Trockenlauf ist Vorgabe. LIVE=1 schreibt (Sicherung vorher, Rücklesen danach). ZURUECK=1 LIVE=1 nimmt den Schritt zurück
// (Bild: wieder anlegen aus der gesicherten Quelladresse, best effort; Sammlung: gesicherte Beschreibung zurückschreiben).
// FREMD_UEBERSCHREIBEN=1 schreibt die Sammlungsbeschreibung auch dann, wenn sie nicht mehr der erwartete Text ist.
//
// Exit: 0 ok / schon erledigt / Trockenlauf · 3 Objekt passt nicht · 4 Stand weicht von der Erwartung ab (jemand hat geändert)
//       5 Shopify meldet Fehler · 6 Rücklesen weicht ab
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));

export const PRODUKT_ID = 'gid://shopify/Product/15523986473345';
export const HANDLE = 'futterautomat-fur-katze-527488';

// Das Bild: Position 5 von 5, 799×800, alt-Text «… Bild 4 …». Das Hauptbild (Position 1) trägt den alt-Text «… Bild 5 …».
export const BILD_ID = 'gid://shopify/MediaImage/70772684030337';
export const BILD_ALT = 'Futterautomat für Katze – Bild 4 | LuxeStyle';
export const BILD_SHA256 = 'd42a504faade2a7ac6c88302716733f6bb1ac906715db64db33c1a846893d1f2';
export const BILDER_ERWARTET = 5;

export const SAMMLUNG_ID = 'gid://shopify/Collection/756160627079';
export const SAMMLUNG_HANDLE = 'tier-futterautomaten';
export const SAMMLUNG_ALT = '<p>Automatische Futterspender und Futterstationen für Hunde und Katzen: mit Zeitschaltung, Behälter oder App.</p>';
export const LINK_ABSATZ = `<p>Auch dabei: <a href="/products/${HANDLE}">Automatischer Futterspender für Katzen</a>.</p>`;
export const SAMMLUNG_SOLL = SAMMLUNG_ALT + LINK_ABSATZ;

const L_BILDER = `query($id:ID!){product(id:$id){handle status media(first:30){nodes{id alt mediaContentType status ... on MediaImage{image{url width height}}}}}}`;
const M_LOESCHEN = `mutation($p:ID!,$m:[ID!]!){productDeleteMedia(productId:$p, mediaIds:$m){deletedMediaIds mediaUserErrors{field message code}}}`;
const M_ANLEGEN = `mutation($i:ProductInput!){productUpdate(input:$i){product{id} userErrors{field message}}}`;
const L_PRODUKT = `query($id:ID!){product(id:$id){handle status onlineStoreUrl}}`;
const L_SAMMLUNG = `query($id:ID!){collection(id:$id){id handle descriptionHtml}}`;
const M_SAMMLUNG = `mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{field message}}}`;

const warteStandard = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------------------------------------------- Bild
export async function bildLauf({ gql, holeBild, erwarteterHash = BILD_SHA256, live = false, zurueck = false, dateien, log = console.log, warte = warteStandard }) {
  const lesen = async () => (await gql(L_BILDER, { id: PRODUKT_ID })).product;
  const p = await lesen();
  if (!p || p.handle !== HANDLE) { log('ABBRUCH: Produkt oder Handle passt nicht:', p && p.handle); return 3; }
  const liste = p.media.nodes;
  log('Galerie:', liste.map((m, i) => `${i + 1}:${m.alt}`).join(' | '));

  if (zurueck) {
    const s = JSON.parse(fs.readFileSync(dateien.bildJson, 'utf8'));
    if (liste.some((m) => m.alt === s.entfernt.alt)) { log('Bild ist schon wieder da: nichts zu tun.'); return 0; }
    log(live ? 'ZURÜCK: Bild wird aus der gesicherten Quelladresse wieder angelegt (best effort)' : 'Trockenlauf Rücknahme (kein Schreiben)');
    if (!live) return 0;
    const r = await gql(M_ANLEGEN, { i: { id: PRODUKT_ID, media: [{ originalSource: s.entfernt.url, alt: s.entfernt.alt, mediaContentType: 'IMAGE' }] } });
    const fehler = r.productUpdate.userErrors;
    log(JSON.stringify(fehler));
    return fehler.length ? 5 : 0;
  }

  const ziel = liste.find((m) => m.id === BILD_ID);
  if (!ziel) {
    if (liste.length === BILDER_ERWARTET - 1 && !liste.some((m) => m.alt === BILD_ALT)) { log('Schon entfernt: nichts zu tun.'); return 0; }
    log('ABBRUCH: Das Bild', BILD_ID, 'ist nicht mehr in der Galerie, aber die Galerie ist auch nicht wie nach dem Entfernen. Jemand hat geändert.');
    return 4;
  }
  if (liste.length !== BILDER_ERWARTET) { log(`ABBRUCH: ${liste.length} statt ${BILDER_ERWARTET} Bilder in der Galerie. Jemand hat geändert.`); return 4; }
  if (liste[liste.length - 1].id !== BILD_ID) { log('ABBRUCH: Das Bild ist nicht mehr das letzte der Galerie.'); return 4; }
  if (ziel.alt !== BILD_ALT) { log('ABBRUCH: alt-Text weicht ab:', ziel.alt); return 4; }
  const bytes = await holeBild(ziel.image.url);
  const hash = sha256(bytes);
  if (hash !== erwarteterHash) { log('ABBRUCH: Die Bild-Bytes sind nicht die gesichteten (SHA-256', hash, ').'); return 4; }

  log('Plan: Bild entfernen', BILD_ID, '|', ziel.alt, '|', ziel.image.url, '| SHA-256 stimmt mit der gesichteten Datei überein');
  if (!live) { log('Trockenlauf: nichts geschrieben.'); return 0; }

  fs.writeFileSync(dateien.bildBytes, bytes);
  fs.writeFileSync(dateien.bildJson, JSON.stringify({
    produkt: PRODUKT_ID,
    galerieVorher: liste.map((m, i) => ({ position: i + 1, id: m.id, alt: m.alt, url: m.image && m.image.url })),
    entfernt: { id: ziel.id, position: liste.length, alt: ziel.alt, url: ziel.image.url, breite: ziel.image.width, hoehe: ziel.image.height, sha256: hash },
  }, null, 1));
  const r = (await gql(M_LOESCHEN, { p: PRODUKT_ID, m: [BILD_ID] })).productDeleteMedia;
  log(JSON.stringify(r));
  if (r.mediaUserErrors.length || r.deletedMediaIds.length !== 1 || r.deletedMediaIds[0] !== BILD_ID) return 5;

  await warte(4000);
  const q = await lesen();
  const vorher = liste.slice(0, BILDER_ERWARTET - 1).map((m) => m.id);
  const jetzt = q.media.nodes.map((m) => m.id);
  const ok = jetzt.length === vorher.length && jetzt.every((id, i) => id === vorher[i]);
  log('Rücklesen', ok ? 'GLEICH (vier Bilder, Reihenfolge und Hauptbild unverändert)' : 'WEICHT AB');
  return ok ? 0 : 6;
}

// ----------------------------------------------------------------------------------------------------------- Sammlung
export async function sammlungLauf({ gql, live = false, zurueck = false, fremd = false, dateien, log = console.log, warte = warteStandard }) {
  const lesen = async () => (await gql(L_SAMMLUNG, { id: SAMMLUNG_ID })).collection;
  const c = await lesen();
  if (!c || c.handle !== SAMMLUNG_HANDLE) { log('ABBRUCH: Sammlung oder Handle passt nicht:', c && c.handle); return 3; }

  if (zurueck) {
    const s = JSON.parse(fs.readFileSync(dateien.sammlungJson, 'utf8'));
    if (c.descriptionHtml === s.descriptionHtml) { log('Beschreibung ist schon die gesicherte: nichts zu tun.'); return 0; }
    log(live ? 'ZURÜCK: gesicherte Beschreibung wird zurückgeschrieben' : 'Trockenlauf Rücknahme (kein Schreiben)');
    if (!live) return 0;
    const r = (await gql(M_SAMMLUNG, { i: { id: SAMMLUNG_ID, descriptionHtml: s.descriptionHtml } })).collectionUpdate;
    log(JSON.stringify(r.userErrors));
    return r.userErrors.length ? 5 : 0;
  }

  if (c.descriptionHtml === SAMMLUNG_SOLL) { log('Schon im Soll: nichts zu tun.'); return 0; }
  const prod = (await gql(L_PRODUKT, { id: PRODUKT_ID })).product;
  if (!prod || prod.handle !== HANDLE || prod.status !== 'ACTIVE' || !prod.onlineStoreUrl) {
    log('ABBRUCH: Das Produkt ist nicht aktiv oder nicht im Online-Shop; der Link würde ins Leere führen:', JSON.stringify(prod));
    return 4;
  }
  if (c.descriptionHtml !== SAMMLUNG_ALT && !fremd) {
    log('ABBRUCH: Die Sammlungsbeschreibung ist nicht mehr der erwartete Text. Jemand hat geändert.');
    log('Aktueller Text:', c.descriptionHtml);
    log('Mit FREMD_UEBERSCHREIBEN=1 trotzdem schreiben (erst den Stand ansehen).');
    return 4;
  }
  log('--- Beschreibung jetzt ---\n' + c.descriptionHtml + '\n--- Soll ---\n' + SAMMLUNG_SOLL);
  if (!live) { log('Trockenlauf: nichts geschrieben.'); return 0; }

  fs.writeFileSync(dateien.sammlungJson, JSON.stringify({ id: c.id, handle: c.handle, descriptionHtml: c.descriptionHtml }, null, 1));
  const r = (await gql(M_SAMMLUNG, { i: { id: SAMMLUNG_ID, descriptionHtml: SAMMLUNG_SOLL } })).collectionUpdate;
  log(JSON.stringify(r.userErrors));
  if (r.userErrors.length) return 5;

  await warte(4000);
  const q = await lesen();
  const ok = q.descriptionHtml === SAMMLUNG_SOLL;
  log('Rücklesen', ok ? 'GLEICH' : 'WEICHT AB');
  return ok ? 0 : 6;
}

// ------------------------------------------------------------------------------------------- Aufruf von der Befehlszeile
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const schritt = process.env.SCHRITT;
  if (schritt !== 'bild' && schritt !== 'sammlung') { console.log('SCHRITT=bild oder SCHRITT=sammlung setzen.'); process.exit(2); }
  const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
  // Schlüssel wie in wiederherstellen.mjs auf «shpss_» + 32 Hexzeichen kürzen (die Umgebung trägt Anhängsel).
  const roh = String(process.env.SHOPIFY_CLIENT_SECRET || '').trim();
  const sec = (/^shpss_[0-9a-f]{32}/.exec(roh) || [roh])[0];
  const tr = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: sec, grant_type: 'client_credentials' }),
  });
  const tj = await tr.json().catch(() => null);
  const tok = tj && tj.access_token;
  if (!tok) { console.log('ABBRUCH: kein Shopify-Token, Status', tr.status, tj ? `${tj.error || ''} ${String(tj.error_description || '').slice(0, 120)}` : '(keine JSON-Antwort)'); process.exit(2); }
  const gql = async (q, v) => {
    const j = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }),
    })).json();
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
    return j.data;
  };
  const dateien = {
    bildJson: path.join(hier, 'sicherung-bild5.json'),
    bildBytes: path.join(hier, 'sicherung-bild5.jpg'),
    sammlungJson: path.join(hier, 'sicherung-sammlung.json'),
  };
  const live = process.env.LIVE === '1';
  const zurueck = process.env.ZURUECK === '1';
  const code = schritt === 'bild'
    ? await bildLauf({ gql, holeBild: async (u) => Buffer.from(await (await fetch(u)).arrayBuffer()), live, zurueck, dateien })
    : await sammlungLauf({ gql, live, zurueck, fremd: process.env.FREMD_UEBERSCHREIBEN === '1', dateien });
  process.exit(code);
}
