#!/usr/bin/env node
/* LuxeStyle — image-audit.mjs
 * --------------------------------------------------------------------------------
 * Prüft die HAUPTBILDER aller aktiven Produkte und macht sie „top":
 *   • Auflösung (Breite/Höhe via Admin-API) → flaggt zu kleine Bilder
 *   • Gemini-Vision auf das 1. Bild: zeigt es das Produkt? unscharf, Wasserzeichen,
 *     Text im Bild, Collage?
 *   • Wenn das 1. Bild einen dieser Mängel hat UND ein besseres Produktbild existiert →
 *     wird dieses per reorderMedia NACH VORNE sortiert (das Produkt verliert kein Bild,
 *     nur die Reihenfolge ändert sich).
 *
 * GEÄNDERT AM 2026-10-18: vorher fragte der Lauf, ob die Person auf dem Bild
 * „ost-/südostasiatisch wirkt", und sortierte genau dann um. Begründung und Tests in
 * automation/lib/bild_befund.mjs. Ausserdem war APPLY standardmässig AN — bei einem
 * Werkzeug, das Hauptbilder vertauscht, ist das die falsche Vorgabe.
 *
 * GEMESSEN 08.11.2026: bis dahin hat dieser Audit KEIN Bild je beurteilt. Gemini lieferte wegen maxOutputTokens 80 (Gedanken-Tokens
 * frassen den Platz) abgeschnittenes JSON, und der alte Code wertete das als «Bild in Ordnung». Ursache und Test: lib/gemini_vision.mjs.
 *
 * Sicher & günstig: BATCH pro Lauf (Default 40), idempotenter Ledger (überspringt schon
 * geprüfte Produkte), max. wenige Vision-Calls pro Produkt, Report als CSV. APPLY=0 = nur
 * Report (kein Umsortieren). No-op ohne GEMINI_API_KEY bzw. Shopify-Creds.
 *
 * ENV (GitHub-Secrets): GEMINI_API_KEY · SHOPIFY_SHOP · SHOPIFY_CLIENT_ID · SHOPIFY_CLIENT_SECRET
 *      GEMINI_MODEL (Default gemini-3.8-flash) · BATCH (40) · MIN_PX (800) · APPLY=1 (Vorgabe: nur Bericht)
 */
import fs from 'node:fs';
import path from 'node:path';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { istSchwach, istBessereAlternative, groesserUndSauber, grund } from './lib/bild_befund.mjs';
import { bildKlassifizieren, GeminiFatal } from './lib/gemini_vision.mjs';

const KEY = process.env.GEMINI_API_KEY || '';
const KEY_FALLBACK = process.env.GEMINI_API_KEY_FALLBACK || ''; // erster Schlüssel, wenn der Gratis-Schlüssel (GEMINI_API_KEY2) erschöpft ist
let KEY_AKTIV = KEY;
const SHOP = process.env.SHOPIFY_SHOP || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GBASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const API_VER = process.env.SHOPIFY_API_VERSION || '2025-01';
const BATCH = Math.max(1, parseInt(process.env.BATCH || '40', 10) || 40);
const MIN_PX = Math.max(200, parseInt(process.env.MIN_PX || '800', 10) || 800);
const PAUSE = Math.max(0, parseInt(process.env.PAUSE_MS || '400', 10) || 0);
const APPLY = process.env.APPLY === '1'; // Vorgabe: nur Bericht. Umsortieren ist ausdruecklich anzufordern.

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const LEDGER = path.join(ROOT, 'dropship', 'image-audit-done.txt');
const REPORT = path.join(ROOT, 'dropship', 'image-audit-report.csv');

if (!KEY || !SHOP || !CID || !CSECRET) { console.log('Fehlende Keys (GEMINI_API_KEY/SHOPIFY_*) → No-op.'); process.exit(0); }

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const seen = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean) : []);
const remember = (id) => { seen.add(id); fs.appendFileSync(LEDGER, id + '\n'); };
const csvEsc = (v) => /[",\n]/.test(String(v ?? '')) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v ?? '');
if (!fs.existsSync(REPORT)) fs.writeFileSync(REPORT, 'handle,issue,action,width,height,featured_url\n');
const report = (row) => fs.appendFileSync(REPORT, row.map(csvEsc).join(',') + '\n');

// ---- Shopify Admin (Client-Credentials-Grant, 2026) ----
let TOKEN = '';
async function shopToken() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSECRET, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(60000) });
  const j = await r.json(); return j.access_token || '';
}
async function gql(query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/${API_VER}/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(60000) });
  return r.json();
}

// ---- Gemini Vision: klassifiziert ein Bild ----
const PROMPT = 'Du bewertest die handwerkliche Qualität eines Produktbilds für einen Online-Shop. ' +
  'Antworte NUR mit kompaktem JSON (keine Erklärung): ' +
  '{"zeigt_produkt":bool,"unscharf":bool,"wasserzeichen":bool,"text_overlay":bool,"collage":bool}. ' +
  '"zeigt_produkt"=das verkaufte Produkt ist klar und vollständig zu erkennen. ' +
  '"unscharf"=verwackelt, verpixelt oder stark komprimiert. "wasserzeichen"=fremdes Logo oder Schriftzug im Bild. ' +
  '"text_overlay"=Werbetext, Preis oder Pfeile ins Bild montiert. "collage"=mehrere Einzelbilder in einem Raster. ' +
  'Beurteile NUR das Bild selbst — niemals das Aussehen, Geschlecht, Alter oder die Herkunft abgebildeter Menschen.';
// Ehrliche Zählung: ein Aufruf ohne echte Antwort gilt NIE als «Bild in Ordnung» (siehe lib/gemini_vision.mjs).
const gem = { ok: 0, fehler: 0, folge: 0, gruende: {}, letzterGrund: '' };
async function classify(url) {
  const r = await bildKlassifizieren({ url, key: KEY_AKTIV, keyFallback: KEY_FALLBACK && KEY_FALLBACK !== KEY_AKTIV ? KEY_FALLBACK : null, model: MODEL, base: GBASE, prompt: PROMPT });
  if (r.wechsel) { KEY_AKTIV = KEY_FALLBACK; log(`⚠️ Gratis-Schlüssel fiel aus (${r.wechselGrund || '?'}): ab jetzt der erste Schlüssel.`); }
  if (r.ok) { gem.ok++; gem.folge = 0; gem.letzterGrund = ''; return r.c; }
  gem.fehler++; gem.letzterGrund = r.grund; gem.gruende[r.grund] = (gem.gruende[r.grund] || 0) + 1;
  if (r.grund !== 'bild-nicht-lesbar' && r.grund !== 'bild-abgelehnt') {
    gem.folge++;
    if (gem.folge >= 5) throw new GeminiFatal(0, `5 Aufrufe in Folge ohne Antwort (${r.grund})`);
  }
  return null;
}

(async () => {
  log(`Bild-Audit start · APPLY=${APPLY} · BATCH=${BATCH} · MIN_PX=${MIN_PX} · geprüft bisher: ${seen.size}`);
  TOKEN = await shopToken();
  if (!TOKEN) { log('❌ Kein Shopify-Token.'); process.exit(0); }

  let after = null, processed = 0, flagged = 0, reordered = 0;
  const befund = { overlay: 0, wasserzeichen: 0, collage: 0, unscharf: 0, keinProdukt: 0 };
  outer:
  while (processed < BATCH) {
    const q = `query($after:String){ products(first:50, after:$after, query:"status:active"){ pageInfo{ hasNextPage endCursor }
      edges{ node{ id handle media(first:8){ edges{ node{ ... on MediaImage { id image{ url width height } } } } } } } } }`;
    const data = await gql(q, { after });
    const conn = data?.data?.products; if (!conn) { log('Query-Fehler:', JSON.stringify(data).slice(0,200)); break; }
    for (const e of conn.edges) {
      if (processed >= BATCH) break outer;
      const p = e.node; if (seen.has(p.id)) continue;
      const imgs = (p.media?.edges || []).map(x => x.node).filter(n => n?.image?.url);
      if (!imgs.length) { remember(p.id); continue; }
      processed++;
      const feat = imgs[0];
      const w = feat.image.width || 0, h = feat.image.height || 0;
      const lowres = (w && w < MIN_PX) || (h && h < MIN_PX);
      const c = await classify(feat.image.url); await sleep(PAUSE);
      if (c === null) {
        // Gemini hat dieses Bild nicht beurteilt. Nicht als «in Ordnung» merken: ein Ausfall darf das Ledger nicht füllen.
        if (gem.letzterGrund === 'bild-nicht-lesbar' || gem.letzterGrund === 'bild-abgelehnt') {
          report([p.handle, 'bild-nicht-lesbar', 'FLAG: Hauptbild nicht lesbar (Bild ersetzen)', w, h, feat.image.url]);
          flagged++; remember(p.id);
        } else { processed--; }
        continue;
      }
      if (c.text_overlay) befund.overlay++;
      if (c.wasserzeichen) befund.wasserzeichen++;
      if (c.collage) befund.collage++;
      if (c.unscharf) befund.unscharf++;
      if (c.zeigt_produkt === false) befund.keinProdukt++;
      const badFeat = istSchwach(c);
      let action = 'ok';
      if (lowres) { action = 'NIEDRIGE-AUFLOESUNG'; flagged++; }
      if (badFeat) flagged++;
      // Gemessen am 2026-10-18 ueber 5000 aktive Produkte: 775 Hauptbilder liegen unter 800 px,
      // 411 davon haben weiter hinten ein groesseres. Vorher wurde das nur im Bericht vermerkt,
      // obwohl der Tausch genau dafuer da ist. `groesserUndSauber` verlangt, dass die Alternative
      // auch wirklich ein sauberes Produktbild ist — sonst wandert ein grosses Verpackungsfoto
      // nach vorn, und das sieht aus wie eine Verbesserung, ohne eine zu sein.
      if (badFeat || lowres) {
        const jetzt = { breite: w, hoehe: h };
        // bessere Alternative suchen: ein Bild, das das Produkt zeigt und selbst keinen Mangel hat
        let altIdx = -1;
        for (let i = 1; i < Math.min(imgs.length, 4); i++) {
          const mass = { breite: imgs[i].image.width || 0, hoehe: imgs[i].image.height || 0 };
          // Bei reiner Auflösungsschwäche gar nicht erst fragen, wenn das Bild nicht grösser ist —
          // das spart Vision-Aufrufe, die ohnehin nichts ändern können.
          if (!badFeat && (mass.breite <= w && mass.hoehe <= h)) continue;
          const ca = await classify(imgs[i].image.url); await sleep(PAUSE);
          if (badFeat ? istBessereAlternative(ca) : groesserUndSauber(jetzt, mass, ca, MIN_PX)) { altIdx = i; break; }
        }
        if (altIdx > 0 && APPLY) {
          const mv = `mutation($id:ID!,$moves:[MoveInput!]!){ productReorderMedia(id:$id, moves:$moves){ mediaUserErrors{ message } } }`;
          const res = await gql(mv, { id: p.id, moves: [{ id: imgs[altIdx].id, newPosition: '0' }] });
          const errs = res?.data?.productReorderMedia?.mediaUserErrors || [];
          if (!errs.length) { action = `UMSORTIERT (Bild ${altIdx+1}→1${lowres && !badFeat ? ', wegen Aufloesung' : ''})`; reordered++; }
          else action = 'FEHLER-UMSORT: ' + errs[0].message;
          await sleep(600);
        } else {
          action = altIdx > 0 ? 'BESSERES-BILD-VORHANDEN (APPLY=1 setzen zum Umsortieren)' : 'FLAG: kein sauberes Alt-Bild (Bild ersetzen)';
        }
      }
      if (action !== 'ok') report([p.handle, grund(c, lowres), action, w, h, feat.image.url]);
      remember(p.id);
    }
    if (!conn.pageInfo.hasNextPage) { log('Katalog-Ende erreicht.'); break; }
    after = conn.pageInfo.endCursor;
  }
  log(`Fertig: ${processed} Produkte geprüft · ${flagged} geflaggt · ${reordered} umsortiert. Report: dropship/image-audit-report.csv`);
  log(`Gemini: ${gem.ok} Antworten, ${gem.fehler} ohne Antwort ${JSON.stringify(gem.gruende)} · Hauptbilder mit Werbetext/Preis: ${befund.overlay}, fremdes Logo: ${befund.wasserzeichen}, Collage: ${befund.collage}, unscharf: ${befund.unscharf}, Produkt nicht klar: ${befund.keinProdukt}`);
})().catch((e) => {
  log(`❌ Bild-Audit abgebrochen: ${e && e.message ? e.message : e}`);
  process.exit(e instanceof GeminiFatal ? 1 : 2);
});
