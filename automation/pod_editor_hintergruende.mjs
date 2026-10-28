#!/usr/bin/env node
/* LuxeStyle — pod_editor_hintergruende.mjs
 * Setzt die Editor-Hintergründe der «Selbst gestalten»-Produkte aus pod/editor-hintergruende.json (Handle → {front, back?, map?}).
 * Ändert in der Produktbeschreibung NUR die Bild-Attribute des Bausteins <div class="lspod-designer" …> (lib/pod_editor_bg.mjs), sonst nichts.
 *
 * WARUM: Der Editor zeigt als Hintergrund ein Produktbild; bei Printful-Mockups ist «Dein Design» eingebrannt und bleibt unter dem Design des Kunden stehen
 * (Besitzer-Meldung 28.10.2026, iPhone-Hülle). Die Tabelle hält die sauberen Hintergründe fest; pod_inject_designer.mjs liest sie ebenfalls, ein erneutes
 * Ausrollen dreht den Fix also nicht zurück.
 *
 * TROCKENLAUF IST VORGABE (zeigt je Produkt, was sich ändert). LIVE=1 schreibt, liest danach FRISCH zurück und prüft jede Adresse per HTTP.
 * Vor dem Schreiben wird die alte Beschreibung gesichert (dropship/pod-editor-sicherung-2810/<handle>.json, nie überschrieben).
 * ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, [LIVE=1] [ONLY=handle,handle]
 * Exit 0 = alles wie geplant; 1 = Fehler beim Schreiben/Zurücklesen; 2 = Tabelle ungültig; 3 = Adresse nicht erreichbar.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { leseEditorAttribute, setzeEditorAttribute, pruefeUebersteuerung } from './lib/pod_editor_bg.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HIER, '..');
const API = '2026-01';
const LIVE = process.env.LIVE === '1';
const ONLY = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const TABELLE = join(ROOT, 'pod', 'editor-hintergruende.json');
const SICHERUNG = join(ROOT, 'dropship', 'pod-editor-sicherung-2810');
const LEDGER = join(ROOT, 'dropship', 'pod_editor_ledger.txt');

const Q = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle status descriptionHtml media(first:30){ nodes{ id alt ... on MediaImage{ image{ url } } } } variants(first:80){ nodes{ id } } } }`;
const M = `mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id } userErrors{ field message } } }`;

const tabelle = JSON.parse(readFileSync(TABELLE, 'utf8'));
const fehler = pruefeUebersteuerung(tabelle);
if (fehler.length) { console.error('Tabelle ungültig:\n - ' + fehler.join('\n - ')); process.exit(2); }

const SHOP = process.env.SHOPIFY_SHOP, CID = process.env.SHOPIFY_CLIENT_ID, SEC = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
if (!SHOP || !CID || !SEC) { console.log('Shopify-Zugang fehlt (SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET) → nichts getan.'); process.exit(0); }
const tr = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: SEC, grant_type: 'client_credentials' }) });
const tok = (await tr.json()).access_token;
if (!tok) { console.error(`Kein Zugriffstoken (HTTP ${tr.status}) → abgebrochen.`); process.exit(1); }

const http = async (u) => { try { const r = await fetch(u, { method: 'HEAD', redirect: 'follow' }); return r.status; } catch (e) { return `Netz: ${e.message}`; } };
let geaendert = 0, gleich = 0, schlecht = 0, nichtErreichbar = 0;
for (const [handle, ziel] of Object.entries(tabelle)) {
  if (ONLY.length && !ONLY.includes(handle)) continue;
  const d = await shopifyGql(SHOP, API, tok, Q, { h: handle });
  const p = d.productByIdentifier;
  if (!p) { console.error(`✗ ${handle}: Produkt nicht gefunden`); schlecht++; continue; }
  const alt = leseEditorAttribute(p.descriptionHtml);
  if (!alt) { console.error(`✗ ${handle}: kein Editor-Baustein in der Beschreibung (nichts geraten)`); schlecht++; continue; }
  // Karte: nur Varianten, die es im Shop gibt; eine Variante ohne Eintrag fällt auf front zurück (so macht es der Editor)
  const vids = new Set(p.variants.nodes.map((v) => v.id.split('/').pop()));
  if (ziel.map) {
    const fremd = Object.keys(ziel.map).filter((k) => !vids.has(k));
    if (fremd.length) { console.error(`✗ ${handle}: Karte nennt Varianten, die es im Shop nicht gibt: ${fremd.join(', ')}`); schlecht++; continue; }
    const fehlt = [...vids].filter((k) => !(k in ziel.map));
    if (fehlt.length) console.log(`  Hinweis ${handle}: ${fehlt.length} Variante(n) ohne eigenen Hintergrund (nehmen front): ${fehlt.join(', ')}`);
  }
  const neu = setzeEditorAttribute(p.descriptionHtml, { front: ziel.front, back: ziel.back, map: ziel.map });
  if (neu === p.descriptionHtml) { console.log(`= ${handle}: schon so, nichts zu tun`); gleich++; continue; }
  const nz = leseEditorAttribute(neu);
  console.log(`${LIVE ? '→' : 'DRY'} ${handle}: front ${(alt.front || '–').split('/').pop().split('?')[0]} → ${(nz.front || '–').split('/').pop().split('?')[0]}${nz.back || alt.back ? '; back ' + (alt.back || '–').split('/').pop().split('?')[0] + ' → ' + (nz.back || '–').split('/').pop().split('?')[0] : ''}; Karte ${alt.map ? Object.keys(alt.map).length : 0} → ${nz.map ? Object.keys(nz.map).length : 0} Modelle`);
  const urls = [...new Set([nz.front, nz.back, ...Object.values(nz.map || {})].filter(Boolean))];
  for (const u of urls) { const s = await http(u); if (s !== 200) { console.error(`  ✗ Adresse nicht erreichbar (${s}): ${u}`); nichtErreichbar++; } }
  if (!LIVE) { geaendert++; continue; }
  if (nichtErreichbar) { console.error(`  ✗ ${handle}: nicht geschrieben, weil Adressen fehlen`); continue; }
  // Sicherung der alten Beschreibung (nie überschreiben)
  mkdirSync(SICHERUNG, { recursive: true });
  const sich = join(SICHERUNG, handle.replace(/[^a-z0-9-]/gi, '_') + '.json');
  if (!existsSync(sich)) writeFileSync(sich, JSON.stringify({ gesichertAm: new Date().toISOString(), handle, id: p.id, status: p.status, descriptionHtml: p.descriptionHtml, media: p.media.nodes }, null, 1) + '\n', { flag: 'wx' });
  const r = await shopifyGql(SHOP, API, tok, M, { p: { id: p.id, descriptionHtml: neu } });
  const ue = r.productUpdate?.userErrors || [];
  if (ue.length) { console.error(`  ✗ ${handle}: ${JSON.stringify(ue).slice(0, 300)}`); schlecht++; continue; }
  // FRISCH lesen, nie dem Rückgabewert glauben
  const f = (await shopifyGql(SHOP, API, tok, Q, { h: handle })).productByIdentifier;
  const l = leseEditorAttribute(f.descriptionHtml);
  const stimmt = l && l.front === nz.front && l.back === nz.back && (ziel.map ? JSON.stringify(l.map) === JSON.stringify(nz.map) : true) && l.variant === alt.variant && JSON.stringify(l.andere) === JSON.stringify(alt.andere);
  const restGleich = f.descriptionHtml.replace(/<div class="lspod-designer"[^>]*><\/div>/, '§') === p.descriptionHtml.replace(/<div class="lspod-designer"[^>]*><\/div>/, '§');
  if (!stimmt || !restGleich) { console.error(`  ✗ ${handle}: nach dem Schreiben frisch gelesen NICHT wie geplant (Baustein ${stimmt}, Rest gleich ${restGleich})`); schlecht++; continue; }
  appendLedger(`${handle}\t${new Date().toISOString()}\tOK\tfront ${(nz.front || '').split('/').pop().split('?')[0]}${nz.back ? '; back ' + nz.back.split('/').pop().split('?')[0] : ''}; Karte ${nz.map ? Object.keys(nz.map).length : 0}`);
  console.log(`  ✓ geschrieben und frisch zurückgelesen (Baustein stimmt, übrige Beschreibung Byte für Byte gleich)`);
  geaendert++;
}
function appendLedger(z) { mkdirSync(dirname(LEDGER), { recursive: true }); writeFileSync(LEDGER, z + '\n', { flag: 'a' }); }
console.log(`\n${LIVE ? 'LIVE' : 'Trockenlauf'}: ${geaendert} ${LIVE ? 'geändert' : 'würden geändert'}, ${gleich} unverändert, ${schlecht} Fehler, ${nichtErreichbar} Adressen nicht erreichbar`);
process.exit(schlecht ? 1 : nichtErreichbar ? 3 : 0);
