#!/usr/bin/env node
/* LuxeStyle — seo-optimizer.mjs  (v2, 19.10.2026; wöchentlich/von Hand via .github/workflows/seo-optimizer.yml)
 * Findet aktive Produkte mit FEHLENDEM SEO-Titel und/oder -Meta und füllt NUR die fehlenden Felder (deutsch, Schweiz, Preis-Anker-Stil)
 * — für besseren Google-Traffic. Meldet ausserdem Produkte mit FAILED-Bildern (Bild-QA) per Telegram.
 *
 * ANLASS (Betreiber 19.10. «nutze das und verbessere es»; Idee aus Codex-PR #2694, dort NICHT übernommen): Codex' Optimierer hatte gute Wachen
 * (Identität, Gegenprobe vor dem Schreiben, Rücklesen, Stopp bei Unklarem), aber vier Fehler: er sendete nur das LEERE seo-Feld (Shopify nullt das
 * andere — Lehre 19.10.), sperrte den Massenlauf auf 6 Produkte, kannte die Werbetest-Sperre nicht und hängte «Freigabe» an eine Umgebungsvariable.
 * Hier die Wachen OHNE diese Fehler, im bestehenden Aufruf (LIMIT, DRY_RUN=1, Telegram) — `LIMIT=5000 node automation/seo-optimizer.mjs` geht weiter.
 *
 * GEMESSEN 19.10.2026 (lesend, Admin-API 2026-01, 224 Seiten à 250, sortKey ID; Gegenprobe über nodes() + Metafelder global.title_tag/description_tag):
 *   55'837 aktive Produkte · seo.title leer 7'841 · seo.description leer 103 · beide leer 24 · NUR Titel leer 7'817 (Beschreibung vorhanden!) ·
 *   NUR Beschreibung leer 79 · beide gefüllt 47'917 (24+7817+79+47917 = 55'837) · Leerraum-statt-leer: 0 · von den 13 Werbetest-Produkten 3 mit leerem Titel.
 *   Wiederholbar mit diesem Werkzeug: `node automation/seo-optimizer.mjs --zeile` (liest den ganzen Katalog, schreibt nie). Zweiter Lauf am selben Tag: 55'836 (ein Produkt weniger aktiv).
 * GEMESSEN an der ALTEN Fassung (git show HEAD, offline über Fake-fetch): (1) sie sendete beide Felder — kein Null-Fehler —, aber ÜBERSCHRIEB ein vorhandenes
 *   Feld durch die Vorlage (bei 7'896 von 7'920 Lücken: 7'817 Beschreibungen + 79 Titel; nur die 24 «beide leer» hatten nichts zu verlieren); (2) eine Antwort mit Top-Level-Fehler (`errors`, z. B. fehlender
 *   Scope) zählte als «✓ SEO … gefüllt», Exit 0 — Unklares galt als Erfolg; (3) `LIMIT=abc` ergab NaN und damit KEINE Grenze; (4) der Bindestrich im Wort
 *   wurde zum Gedankenstrich («Relaxed-Fit» → «Relaxed – Fit») und der Titel hinten abgeschnitten («… | LuxeStyle…»).
 *
 * WAS v2 TUT (je Punkt ein Test in seo-optimizer_test.mjs)
 *   1. Host: SHOPIFY_SHOP muss ^[a-z0-9][a-z0-9-]*\.myshopify\.com$ treffen UND der LuxeStyle-Host sein, BEVOR ein Schlüssel das Haus verlässt; sonst Exit 2 ohne
 *      Netzanfrage (der Wert wird nicht ausgegeben — er könnte ein vertauschter Schlüssel sein).
 *   2. Identität: jede Lese-Antwort trägt shop{name myshopifyDomain currencyCode primaryDomain}; LuxeStyle · au3j0y-hq.myshopify.com · luxestyle.ch · CHF, sonst
 *      Stopp ohne Schreiben (auch mitten im Lauf).
 *   3. Beide Felder, immer: die Mutation sendet seo{title, description}; ein vorhandenes Feld bytegenau (auch mit Leerraum), nur das leere wird ergänzt.
 *   4. Gegenprobe pro Schreibvorgang: frisches Lesen; Status ACTIVE, Titel und beide seo-Felder müssen dem Scan entsprechen — sonst überspringen («geändert»).
 *   5. Werbetest-Sperre (lib/werbetest_sperre.mjs, 13 Produkte bis 24.10.): gesperrt → überspringen. FAIL-CLOSED: ist die Sperrdatei nicht lesbar oder ihr Kopf
 *      kaputt, wird nichts geschrieben (wie publish_guard.mjs). SEO-Texte sind NICHT ausgenommen (anders als Lieferbarkeit/Preis).
 *   6. Rücklesen nach dem Schreiben: beide Felder + Titel + Status müssen stimmen. Jede unklare Antwort (Netz, HTTP 4xx/5xx, `errors`, fehlendes data/userErrors,
 *      falsche Produkt-ID, Rücklese-Abweichung) = «unklar»: KEIN weiterer Schreibvorgang in diesem Lauf, Exit 1, ::error-Zeile. Mutationen werden nie wiederholt
 *      (nur bei GraphQL-THROTTLED, das Shopify vor der Ausführung ablehnt). userErrors = bekannte Ablehnung: zählen, weiter (5 in Folge → Stopp).
 *   7. Lesefehler sind «unklar», nie «nichts zu tun». Kein Zugang gar nicht gesetzt = No-op für Forks (Exit 0, aber als «unklar, keine Prüfung» gemeldet).
 *   8. LIMIT ist der Massen-Schalter (Standard 120, kein Deckel; LIMIT=5000 geht). Ungültig (abc, 0, 3oops) → Exit 2 statt unbegrenzt.
 *   Text: Bindestriche im Wort bleiben («Press-on», «T-Shirt»); Gedankenstrich nur bei « - », «·», «–», «—»; Titel ≤ 60 Zeichen: « | LuxeStyle CH», sonst « | LuxeStyle»,
 *   sonst der ganze Titel allein, sonst am Wortende ohne hängendes Bindewort gekürzt («… Stiefeletten mit» → «… Stiefeletten»); Beschreibung ≤ 155 Zeichen mit der
 *   Vorlage von früher, wenn sie passt — sonst fällt zuerst der Rabattsatz weg, dann der Lieferhinweis.
 *   WELCOME10 GEMESSEN 19.10. aktiv (DiscountCodeBasic, bis 31.12.2027) → der Satz steht; läuft der Code aus, PROMO unten leeren.
 *
 * AUFRUF   node automation/seo-optimizer.mjs                 füllt Lücken (LIMIT=120)
 *          DRY_RUN=1 LIMIT=5000 node automation/seo-optimizer.mjs     nur lesen, zeigt «würde setzen»
 *          node automation/seo-optimizer.mjs --zeile          EINE Zeile «SEO-LÜCKEN: …» für die Keepalive-Meldung (liest den ganzen Katalog, gemessen 84–213 s, schreibt NIE; als Tageswächter, nicht stündlich)
 *          node automation/seo-optimizer.mjs --selbsttest     offline: Kanarien (Teilschreiben, Sperre, Host, Text), kein Netz, keine Schlüssel
 * EXIT     0 = ok (auch DRY, auch «nichts zu tun» bei GELESENEM Katalog; auch kein Zugang = No-op) · 1 = unklar/Stopp/Ablehnung · 2 = Aufruf/Konfiguration
 *          (unbekannter Schalter, Host, LIMIT, DRY_RUN, SORT, REVERSE, PQUERY) ohne eine Netzanfrage. Früher war der Exit immer 0.
 *          main hat eine eigene 105-Zeilen-Fassung (QUELLE: git show codexcheck/main:automation/seo-optimizer.mjs) mit denselben Namen SORT/REVERSE/PQUERY; sie ÜBERSCHREIBT weiter
 *          vorhandene Beschreibungen und zählt Top-Level-Fehler als Erfolg — beim Zusammenführen diese Fassung nehmen, nicht umgekehrt.
 * ENV      SHOPIFY_SHOP + (SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET | SHOPIFY_ADMIN_TOKEN) · LIMIT · DRY_RUN=1|0 · TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 *          SORT=CREATED_AT|UPDATED_AT|ID · REVERSE=0|1 · PQUERY="tag:…" — dieselben Namen wie auf main (`LIMIT=5000 SORT=CREATED_AT REVERSE=0 node automation/seo-optimizer.mjs`).
 *          Standard v2: SORT=CREATED_AT, REVERSE=0 (älteste zuerst). GEMESSEN 19.10. (Dry-Run, lesend): 150 Lücken in 1'578 gelesenen Produkten (9 s) gegen 17'424
 *          (3 min 19 s) bei «neueste zuerst» — die Lücken sitzen in den alten Produkten (neueste 17'424: 0,9 % Lücken; Katalog: 14,2 %). PQUERY ohne `status:active`
 *          bekommt den Filter vorangestellt; geschrieben wird ohnehin nur ACTIVE. Früher: UPDATED_AT absteigend — wer schreibt, rückt nach vorn und wird erneut durchsucht.
 * Tests    node automation/seo-optimizer_test.mjs   (node:test, offline; Fake-fetch aus lib/fake_fetch_preload.mjs für die Prozess-Tests)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as werbetest from './lib/werbetest_sperre.mjs';

export const EXPECTED_SHOP = 'au3j0y-hq.myshopify.com';
export const API = '2026-01';
export const HOST_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
export const hostOk = s => typeof s === 'string' && HOST_RE.test(s);
export const IDENTITAET = { name: 'LuxeStyle', myshopifyDomain: EXPECTED_SHOP, host: 'luxestyle.ch', currencyCode: 'CHF' };
export const LIMIT_STANDARD = 120;
const SEITE = 100, SEITE_ZEILE = 250;   // Produkte je Lese-Seite (Kosten gemessen 19.10.: 56 Punkte bei 100 mit media(first:3), 24 bei 250 ohne Medien; Eimer 2000, Nachlauf 100/s)
export const RETRY_MAX = 4;       // 2 s, 4 s, 8 s, 16 s bei THROTTLED / HTTP 429 / 5xx — nur beim LESEN
const ABLEHNUNG_SERIE_MAX = 5;    // so viele userErrors in Folge, dann stoppt die Schleife
const PROMO = ' Jetzt –10% mit Code WELCOME10.';   // GEMESSEN 19.10.: Code ACTIVE bis 31.12.2027. Läuft er aus: leeren.

// ── Text ───────────────────────────────────────────────────────────────────────────────────────────────
const SUFFIX = ' | LuxeStyle CH', SUFFIX_KURZ = ' | LuxeStyle', TITEL_MAX = 60, BESCHR_MAX = 155;
const leer = v => v === null || (typeof v === 'string' && v.trim() === '');
/** Fremdtext (Produkttitel, Shopify-Fehlermeldungen) für EINE Ausgabezeile: Zeilenumbrüche und andere Steuerzeichen werden zu Leerzeichen. Sonst kann ein Titel
 *  «x\n::error …» eine Zeile erzeugen, die mit «::» beginnt — GitHub Actions liest sie als Workflow-Befehl (GEMESSEN 19.10.: 2 solche Zeilen aus einem Fake-Titel). */
export const einzeilig = s => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim();
const HANGEND = /\s+(?:mit|aus|für|und|oder|von|zu|zum|zur|im|in|am|an|auf|bei|der|die|das|den|dem|des|ein|eine|einer|einem|einen|&|\+)$/i;
const heil = x => x.replace(/[\uD800-\uDBFF]$/, '');     // ein harter Schnitt darf kein Emoji halbieren: ein einzelnes Surrogat ist kein gültiger Text (GEMESSEN 19.10.: Titel-Emoji an Stelle 47, Beschreibung an Stelle 153)
const zuWortende = (s, n) => {      // höchstens n Zeichen, am Wortende, ohne hängendes Bindewort («… Stiefeletten mit»); ein einziges langes Wort wird hart gekürzt
  if (s.length <= n) return s;
  const k = s.slice(0, n + 1), i = k.lastIndexOf(' ');
  let r = heil(i > 0 ? k.slice(0, i) : s.slice(0, n)).replace(/[\s,;:–·-]+$/, '');
  for (let g = r.replace(HANGEND, ''); g !== r && g; g = r.replace(HANGEND, '')) r = g.replace(/[\s,;:–·-]+$/, '');
  return r || heil(s.slice(0, n));
};
/** Titel für SEO: Trennzeichen («·», «–», «—», « - ») → « – »; ein Bindestrich im Wort bleibt. */
export function seoBasis(title) {
  return String(title ?? '').replace(/\s+-\s+|\s*[·–—]\s*/g, ' – ').replace(/\s+/g, ' ').replace(/^[\s–]+|[\s–]+$/g, '');
}
export function mkSeo(title) {
  const base = seoBasis(title);
  let t = base + SUFFIX;
  if (t.length > TITEL_MAX) t = base + SUFFIX_KURZ;
  if (t.length > TITEL_MAX) t = base.length <= TITEL_MAX ? base : zuWortende(base, TITEL_MAX - SUFFIX_KURZ.length) + SUFFIX_KURZ;   // ganzer Titel ohne Marke schlägt abgeschnittener Titel mit Marke
  const kopf = `${base} bei LuxeStyle – Schweizer Online-Shop`;
  const stufen = [`${kopf}, Lieferung in die ganze Schweiz.${PROMO}`, `${kopf}, Lieferung in die ganze Schweiz.`, `${kopf}.`];
  const d = stufen.find(s => s.length <= BESCHR_MAX) ?? zuWortende(`${base} bei LuxeStyle Schweiz`, BESCHR_MAX - 1) + '.';
  return { title: t, description: d };
}

// ── Bewertung eines Produkts (rein, ohne Netz) ─────────────────────────────────────────────────────────────
/** → { art: 'fertig' | 'luecke' | 'unklar', titelLeer, beschrLeer, grund } — ein seo-Feld, das weder null noch String ist, ist «unklar», nie «leer». */
export function bewerte(p) {
  const s = p?.seo;
  if (!s || typeof s !== 'object' || !['title', 'description'].every(k => Object.hasOwn(s, k) && (s[k] === null || typeof s[k] === 'string')))
    return { art: 'unklar', grund: 'seo-Felder fehlen oder haben einen unerwarteten Typ' };
  if (typeof p.title !== 'string' || !p.title.trim()) return { art: 'unklar', grund: 'kein gültiger Produkttitel' };
  const titelLeer = leer(s.title), beschrLeer = leer(s.description);
  return { art: titelLeer || beschrLeer ? 'luecke' : 'fertig', titelLeer, beschrLeer };
}
/** Beide Felder, wie sie in die Mutation gehören: vorhandenes BYTEGENAU (kein trim), nur Leeres aus der Vorlage. */
export function ergaenze(p) {
  const b = bewerte(p);
  if (b.art !== 'luecke') return null;
  const gen = mkSeo(p.title);
  return { title: b.titelLeer ? gen.title : p.seo.title, description: b.beschrLeer ? gen.description : p.seo.description };
}

// ── Sperre (Werbetest) — fail-closed ───────────────────────────────────────────────────────────────────────────
/** → { ok, grund?, aktiv, ende, ids:Set, handles:Set }. ok:false = nicht zu beurteilen → NICHT schreiben. `lesen`/`gesperrt` nur für Tests (Kanarienvogel mit gebrochenem Prüfer). */
export function sperreLaden({ datei = werbetest.DATEI, heute = new Date().toISOString().slice(0, 10), lesen = werbetest.lesen, gesperrt = werbetest.gesperrt } = {}) {
  let text;
  try { text = fs.readFileSync(datei, 'utf8'); } catch (e) { return { ok: false, grund: `Sperrdatei nicht lesbar (${e?.code || 'Fehler'})`, ids: new Set(), handles: new Set() }; }
  const s = lesen(text, heute);
  if (!s.ende) return { ok: false, grund: 'Sperrdatei ohne gültigen Kopf «# ende: JJJJ-MM-TT» (ohne Ende gilt die Sperre nichts)', ids: new Set(), handles: new Set() };
  const aktiv = heute <= s.ende;
  if (aktiv && !s.ids.size) return { ok: false, grund: 'Sperre aktiv, aber keine Produkt-ID lesbar (Parser-Bruch?)', ids: new Set(), handles: new Set() };
  if (aktiv && !gesperrt([...s.ids][0], datei, heute)) return { ok: false, grund: 'Kanarienvogel: die erste Sperr-ID wird vom Sperr-Test nicht getroffen', ids: new Set(), handles: new Set() };
  return { ok: true, aktiv, ende: s.ende, ids: s.ids, handles: s.handles };
}
const gesperrtIn = (sp, p) => sp.ids.has(String(p.id ?? '').split('/').pop()) || (typeof p.handle === 'string' && sp.handles.has(p.handle.toLowerCase()));

// ── Konfiguration ────────────────────────────────────────────────────────────────────────────────────────
/** Heilt NUR den bekannten Einfügefehler «shpss_<32 hex>=SHOPIFY_CLIENT_SECRET» (gemessen 14./19.10.); alles andere bleibt, wie es ist. */
export function clientSecret(roh) {
  const s = String(roh ?? '').trim(), m = /^(shpss_[0-9a-f]{32})=SHOPIFY_CLIENT_SECRET$/.exec(s);
  return m ? m[1] : s;
}
const SORTEN = ['CREATED_AT', 'UPDATED_AT', 'ID'];
const SCHALTER = new Set(['--selbsttest', '--zeile', '--help', '-h']);
export function konfig(env, zeile = false) {
  const c = { SHOP: String(env.SHOPIFY_SHOP ?? '').trim(), TOK_ST: String(env.SHOPIFY_ADMIN_TOKEN ?? '').trim(), CID: String(env.SHOPIFY_CLIENT_ID ?? '').trim(),
    CS: clientSecret(env.SHOPIFY_CLIENT_SECRET), TG_T: env.TELEGRAM_BOT_TOKEN || '', TG_C: env.TELEGRAM_CHAT_ID || '', fehler: [] };
  // --zeile liest nur: LIMIT und DRY_RUN spielen dort keine Rolle und dürfen die Aufseher-Zeile nicht verhindern (GEMESSEN 19.10.: `LIMIT=abc --zeile` gab Exit 2 ohne Zeile)
  const l = String(env.LIMIT ?? '').trim();
  if (!l || zeile) c.limit = LIMIT_STANDARD;
  else if (/^[1-9][0-9]{0,8}$/.test(l)) c.limit = Number(l);
  else c.fehler.push('LIMIT ist keine ganze Zahl ≥ 1 (früher: NaN = keine Grenze)');
  const d = String(env.DRY_RUN ?? '').trim().toLowerCase();
  if (['', '0', 'false', 'nein'].includes(d)) c.dry = false;
  else if (['1', 'true', 'ja'].includes(d)) c.dry = true;
  else if (!zeile) c.fehler.push('DRY_RUN muss 1/true/ja oder 0/false/nein sein (ein unbekannter Wert würde sonst schreiben)');
  const sk = String(env.SORT ?? '').trim().toUpperCase();
  if (!sk) c.sort = 'CREATED_AT'; else if (SORTEN.includes(sk)) c.sort = sk; else c.fehler.push(`SORT muss ${SORTEN.join(', ')} sein`);
  const rv = String(env.REVERSE ?? '').trim().toLowerCase();
  if (['', '0', 'false', 'nein'].includes(rv)) c.reverse = false; else if (['1', 'true', 'ja'].includes(rv)) c.reverse = true; else c.fehler.push('REVERSE muss 1/true/ja oder 0/false/nein sein');
  const q = String(env.PQUERY ?? '').trim();
  if (q.length > 300 || /[\u0000-\u001f]/.test(q)) c.fehler.push('PQUERY ist zu lang (> 300) oder enthält Steuerzeichen');
  c.pquery = !q ? 'status:active' : /\bstatus:active\b/i.test(q) ? q : `status:active AND (${q})`;   // nie ohne den Aktiv-Filter; geschrieben wird ohnehin nur ACTIVE
  c.zeile = zeile;
  if (zeile) c.dry = true;            // --zeile schreibt NIE
  return c;
}

// ── Shopify ────────────────────────────────────────────────────────────────────────────────────────────
const warteStd = ms => new Promise(r => setTimeout(r, ms));
class Unklar extends Error {}       // Transport-/Antwortfehler: nicht zu beurteilen
async function holeToken(c, { fetchFn }) {
  if (c.CID && c.CS) {
    try {
      const r = await fetchFn(`https://${c.SHOP}/admin/oauth/access_token`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: c.CID, client_secret: c.CS, grant_type: 'client_credentials' }) });
      if (!r.ok) throw new Unklar(`OAuth: HTTP ${r.status}`);   // nur der Statuscode, nie Antwort-Inhalt oder Schlüssel
      const j = await r.json().catch(() => null);
      if (typeof j?.access_token === 'string' && j.access_token) return { token: j.access_token };
      throw new Unklar('OAuth: Antwort enthält keinen Token');
    } catch (e) {
      if (!c.TOK_ST) return { fehler: e instanceof Unklar ? e.message : 'OAuth: Netzfehler' };
      return { token: c.TOK_ST, hinweis: 'Client-Credentials abgelehnt — statischer Token als Rückfall' };   // wie früher
    }
  }
  return c.TOK_ST ? { token: c.TOK_ST } : { fehler: 'kein Token' };
}
/** Lesen: bei Netzfehler/429/5xx/THROTTLED bis RETRY_MAX Wiederholungen. Schreiben: NIE wiederholen, ausser bei GraphQL-THROTTLED (Shopify lehnt VOR der Ausführung ab). */
function mkGql({ shop, token, fetchFn, warte }) {
  return async function gql(query, variables, { mutation = false } = {}) {
    for (let versuch = 0; ; versuch++) {
      let r;
      try {
        r = await fetchFn(`https://${shop}/admin/api/${API}/graphql.json`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60000),
          headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
      } catch (e) {
        if (!mutation && versuch < RETRY_MAX) { await warte(2000 * 2 ** versuch); continue; }
        throw new Unklar(`Netzfehler (${e?.name || 'Fehler'})`);
      }
      if ((r.status === 429 || r.status >= 500) && !mutation && versuch < RETRY_MAX) { await warte(2000 * 2 ** versuch); continue; }
      if (!r.ok) throw new Unklar(`HTTP ${r.status}`);
      const j = await r.json().catch(() => { throw new Unklar('Antwort ist kein JSON'); });
      if (!j || typeof j !== 'object') throw new Unklar('Antwort ist kein Objekt');
      if (Array.isArray(j.errors) && j.errors.some(e => e?.extensions?.code === 'THROTTLED') && versuch < RETRY_MAX) { await warte(2000 * 2 ** versuch); continue; }
      const ts = j.extensions?.cost?.throttleStatus;      // Eimer fast leer → kurz warten, damit die Nachbar-Engines nicht gedrosselt werden
      if (ts && ts.currentlyAvailable < 250 && ts.restoreRate > 0) await warte(Math.ceil((250 - ts.currentlyAvailable) / ts.restoreRate * 1000));
      return j;
    }
  };
}
const SHOP_FELDER = 'shop{ name myshopifyDomain currencyCode primaryDomain{ host } }';
const KERN = 'id handle title status seo{ title description }';
const scanQuery = (media) => `query SeoScan($after:String,$n:Int!,$q:String,$s:ProductSortKeys!,$r:Boolean!){ ${SHOP_FELDER} products(first:$n, after:$after, query:$q, sortKey:$s, reverse:$r){
  pageInfo{ hasNextPage endCursor } nodes{ ${KERN}${media ? ' media(first:3){ nodes{ status } }' : ''} } } }`;
export const Q_SCAN = scanQuery(true), Q_SCAN_ZEILE = scanQuery(false);   // --zeile braucht keine Bilder: 250 je Seite, ~1,5–4 min statt ~6 min für den Katalog
export const Q_EIN = `query SeoEin($ids:[ID!]!){ ${SHOP_FELDER} nodes(ids:$ids){ ... on Product { ${KERN} } } }`;
export const M_UPDATE = `mutation SeoUpdate($product:ProductUpdateInput!){ productUpdate(product:$product){ product{ id } userErrors{ field message } } }`;
const identitaetOk = s => !!s && s.name === IDENTITAET.name && s.myshopifyDomain === IDENTITAET.myshopifyDomain && s.primaryDomain?.host === IDENTITAET.host && s.currencyCode === IDENTITAET.currencyCode;
const nurLesen = (j, wo) => {       // eine Lese-Antwort ist nur gültig ohne errors, mit data und bestätigter Identität
  if (Array.isArray(j.errors) && j.errors.length) throw new Unklar(`${wo}: GraphQL-Fehler (${j.errors.map(e => String(e?.message ?? '?')).join('; ').slice(0, 200)})`);
  if (!j.data || typeof j.data !== 'object') throw new Unklar(`${wo}: Antwort ohne data`);
  if (!identitaetOk(j.data.shop)) throw new Unklar(`${wo}: Shop-Identität nicht bestätigt (erwartet ${IDENTITAET.name} · ${IDENTITAET.myshopifyDomain} · ${IDENTITAET.host} · ${IDENTITAET.currencyCode})`);
  return j.data;
};
const gleich = (a, b) => a.status === 'ACTIVE' && b.status === 'ACTIVE' && a.title === b.title && a.seo.title === b.seo.title && a.seo.description === b.seo.description;

// ── Lauf ────────────────────────────────────────────────────────────────────────────────────────────────
/** c = konfig(); d = { gql, sperre (Funktion → sperreLaden()), log }. Gibt { bericht, exit } zurück; schreibt nur in Shopify (nie auf stdout) — das macht main(). */
export async function lauf(c, d) {
  const rb = { ts: new Date().toISOString(), version: 'v2', modus: c.zeile ? 'zeile' : c.dry ? 'dry' : 'live', limit: c.limit, scan: { q: c.pquery, sort: c.sort, aufsteigend: !c.reverse }, gescannt: 0, vollstaendig: false,
    luecken: { gesamt: 0, titelLeer: 0, beschreibungLeer: 0, beide: 0, nurTitel: 0, nurBeschreibung: 0 }, gesperrt: 0, geaendert: 0, abgelehnt: 0, geschrieben: 0, wuerde: 0,
    unklarProdukte: 0, nichtAktiv: 0, failedBilder: [], bilderGeprueft: 0, unklar: [], gestoppt: null };
  const log = s => d.log(einzeilig(s));       // jede Zeile aus dem Lauf ist EINE Zeile (Titel/Fehlertexte sind Fremdtext)
  const stopp = (phase, grund, id) => { rb.gestoppt = { phase, grund: einzeilig(grund).slice(0, 300), ...(id ? { id: einzeilig(id) } : {}) }; rb.unklar.push(rb.gestoppt); };
  const bilder = new Set();                   // IDs, deren Medien schon angesehen wurden (Hauptscan und Bild-Scan überlappen)
  const bildPruefen = p => {                  // nur FAILED gilt als Bildfehler; UPLOADED/PROCESSING sind Übergangszustände (die Altfassung meldete sie als «FAILED-Bild»)
    if (!Array.isArray(p?.media?.nodes) || bilder.has(p.id)) return;
    bilder.add(p.id);
    if (p.media.nodes.some(m => m?.status === 'FAILED')) rb.failedBilder.push(einzeilig(p.title));
  };
  const sp = d.sperre();
  rb.sperre = sp.ok ? { ok: true, aktiv: sp.aktiv, ende: sp.ende, ids: sp.ids.size } : { ok: false, grund: sp.grund };
  if (!sp.ok) {
    rb.unklar.push({ phase: 'sperre', grund: sp.grund });
    if (!c.dry) { rb.gestoppt = { phase: 'sperre', grund: sp.grund + ' — nichts wird geschrieben' }; return { bericht: rb, exit: 1 }; }
  }
  let after = null, abgelehntSerie = 0;
  scan:
  while (true) {
    let seite;
    try { seite = nurLesen(await d.gql(c.zeile ? Q_SCAN_ZEILE : Q_SCAN, { after, n: c.zeile ? SEITE_ZEILE : SEITE, q: c.pquery, s: c.sort, r: c.reverse }), 'Scan').products; } catch (e) { stopp('scan', e.message); break; }
    if (!seite || !Array.isArray(seite.nodes) || typeof seite.pageInfo?.hasNextPage !== 'boolean') { stopp('scan', 'Scan: products-Antwort unvollständig'); break; }
    for (const p of seite.nodes) {
      rb.gescannt++;
      if (p?.status !== 'ACTIVE') { rb.nichtAktiv++; continue; }                // Filter-Kanarienvogel: «status:active» darf nichts anderes liefern
      bildPruefen(p);
      const b = bewerte(p);
      if (b.art === 'unklar') { rb.unklarProdukte++; continue; }
      if (b.art === 'fertig') continue;
      rb.luecken.gesamt++;
      if (b.titelLeer) rb.luecken.titelLeer++;
      if (b.beschrLeer) rb.luecken.beschreibungLeer++;
      if (b.titelLeer && b.beschrLeer) rb.luecken.beide++; else if (b.titelLeer) rb.luecken.nurTitel++; else rb.luecken.nurBeschreibung++;
      if (c.zeile) { if (sp.ok && gesperrtIn(sp, p)) rb.gesperrt++; continue; }
      if (sp.ok && gesperrtIn(sp, p)) { rb.gesperrt++; continue; }
      if (rb.wuerde + rb.geschrieben + rb.abgelehnt >= c.limit) break scan;     // LIMIT zählt Schreibversuche; Übersprungenes verbraucht ihn nicht
      const neu = ergaenze(p);
      if (c.dry) { rb.wuerde++; log(`würde SEO setzen: ${p.title} → ${neu.title}`); continue; }
      // ── Schreiben: Gegenprobe → Mutation → Rücklesen. Alles Unklare beendet den Lauf. ──
      let frisch;
      try {
        const j = nurLesen(await d.gql(Q_EIN, { ids: [p.id] }), 'Gegenprobe');
        if (!Array.isArray(j.nodes) || j.nodes.length !== 1) throw new Unklar('Gegenprobe: nodes-Antwort hat nicht genau einen Eintrag');
        frisch = j.nodes[0];
        if (frisch !== null && frisch?.id !== p.id) throw new Unklar('Gegenprobe: abweichende Produkt-ID');
      } catch (e) { stopp('gegenprobe', e.message, p.id); break scan; }
      if (frisch === null || bewerte(frisch).art === 'unklar' || !gleich(p, frisch)) { rb.geaendert++; log(`übersprungen (zwischen Lesen und Schreiben geändert): ${p.title}`); continue; }
      if (sp.ok && gesperrtIn(sp, frisch)) { rb.gesperrt++; continue; }
      try {
        const m = await d.gql(M_UPDATE, { product: { id: p.id, seo: { title: neu.title, description: neu.description } } }, { mutation: true });
        if (Array.isArray(m.errors) && m.errors.length) throw new Unklar(`Mutation: GraphQL-Fehler (${m.errors.map(e => String(e?.message ?? '?')).join('; ').slice(0, 200)})`);
        const pl = m.data?.productUpdate;
        if (!pl || !Array.isArray(pl.userErrors)) throw new Unklar('Mutation: Antwort ohne productUpdate/userErrors');
        if (pl.userErrors.length) {
          rb.abgelehnt++; abgelehntSerie++;
          log(`abgelehnt: ${p.title} — ${pl.userErrors.map(e => String(e?.message ?? '?')).join('; ').slice(0, 200)}`);
          if (abgelehntSerie >= ABLEHNUNG_SERIE_MAX) { stopp('abgelehnt', `${ABLEHNUNG_SERIE_MAX} Ablehnungen in Folge — Ursache klären`, p.id); break scan; }
          continue;
        }
        if (pl.product?.id !== p.id) throw new Unklar('Mutation: keine Erfolgsantwort mit passender Produkt-ID');
        const rj = nurLesen(await d.gql(Q_EIN, { ids: [p.id] }), 'Rücklesen'), z = rj.nodes?.[0];
        if (!z || z.id !== p.id || z.status !== 'ACTIVE' || z.title !== p.title || z.seo?.title !== neu.title || z.seo?.description !== neu.description)
          throw new Unklar('Rücklesen bestätigt die Änderung nicht (Felder weichen ab)');
      } catch (e) { stopp('schreiben', e instanceof Unklar ? e.message : `Mutation: ${e?.message || 'Fehler'}`, p.id); break scan; }   // KEIN Retry, KEIN weiteres Schreiben
      abgelehntSerie = 0; rb.geschrieben++; log(`✓ SEO ${p.title}`);
    }
    if (!seite.pageInfo.hasNextPage) { rb.vollstaendig = true; break; }
    after = seite.pageInfo.endCursor;
  }
  // Bild-QA der NEUESTEN Produkte: der Hauptscan läuft standardmässig von den ältesten her (dort fehlen Bildfehler fast nie), neue Importe — wo FAILED-Bilder typisch sind —
  // kämen nie dran. Eine Seite (100) mit derselben, schon bewährten Abfrage, rein lesend; Fehler = unklar (Exit 1), nie «keine FAILED-Bilder». Nicht bei --zeile, nicht nach einem Stopp.
  if (!c.zeile && !rb.gestoppt) {
    try {
      const neu = nurLesen(await d.gql(Q_SCAN, { after: null, n: SEITE, q: c.pquery, s: 'CREATED_AT', r: true }), 'Bild-QA').products;
      if (!neu || !Array.isArray(neu.nodes)) throw new Unklar('Bild-QA: products-Antwort unvollständig');
      for (const p of neu.nodes) if (p?.status === 'ACTIVE') bildPruefen(p);
    } catch (e) { rb.unklar.push({ phase: 'bilder', grund: einzeilig(e?.message || 'Fehler').slice(0, 300) }); }
  }
  rb.bilderGeprueft = bilder.size;
  const stehen = rb.gestoppt || rb.unklar.length || rb.unklarProdukte || rb.abgelehnt;   // rb.unklar enthält Sperre, Stopp und Bild-QA
  return { bericht: rb, exit: stehen ? 1 : 0 };
}

// ── Ausgabe ──────────────────────────────────────────────────────────────────────────────────────────────
export function meldung(rb) {
  const l = [`🔎 SEO-Optimizer: ${rb.gescannt} Produkte gescannt${rb.scan ? ` (${rb.scan.q}, ${rb.scan.sort}${rb.scan.aufsteigend ? ' aufsteigend' : ''})` : ''} · ${rb.modus === 'live' ? rb.geschrieben : rb.wuerde} SEO ${rb.modus === 'live' ? 'gefüllt' : '(DRY)'}`
    + (rb.gesperrt ? ` · ${rb.gesperrt} Werbetest-gesperrt` : '') + (rb.geaendert ? ` · ${rb.geaendert} geändert übersprungen` : '') + (rb.abgelehnt ? ` · ${rb.abgelehnt} abgelehnt` : '')];
  if (rb.gestoppt) l.push(`⚠️ UNKLAR — Lauf gestoppt (${rb.gestoppt.phase}${rb.gestoppt.id ? ' ' + rb.gestoppt.id : ''}): ${rb.gestoppt.grund}`);
  else if (rb.unklar.length) l.push(`⚠️ UNKLAR: ${rb.unklar.map(u => u.grund).join('; ')}`);
  if (rb.unklarProdukte) l.push(`⚠️ ${rb.unklarProdukte} Produkt(e) mit nicht lesbaren seo-Feldern übersprungen`);
  if (rb.failedBilder.length) l.push(`⚠️ ${rb.failedBilder.length} Produkt(e) mit FAILED-Bild: ${rb.failedBilder.slice(0, 8).join(', ')}`);
  else if (!rb.unklar.some(u => u.phase === 'bilder')) l.push(`✅ keine FAILED-Bilder (in den ${rb.bilderGeprueft ?? rb.gescannt} geprüften)`);   // war die Bild-QA unklar, steht oben die UNKLAR-Zeile — nie ein ✅ daneben
  return l.join('\n');
}
/** Eine Zeile für die Keepalive-Meldung (nur Modus 'zeile'). */
export function zeilenText(rb, exit) {
  if (rb.gestoppt || !rb.vollstaendig) return `⚠️ SEO-LÜCKEN: unklar (${rb.gestoppt?.grund ?? 'Katalog nicht vollständig gelesen'})`.slice(0, 240);
  const g = rb.luecken;
  return `${exit || rb.unklarProdukte ? '⚠️ ' : ''}SEO-LÜCKEN: ${rb.gescannt} aktive gelesen · Titel leer ${g.titelLeer} · Beschreibung leer ${g.beschreibungLeer} (beide ${g.beide}) · davon Werbetest-gesperrt ${rb.gesperrt}`
    + `${rb.unklarProdukte ? ` · ${rb.unklarProdukte} nicht lesbar` : ''}${rb.sperre?.ok ? '' : ' · Sperre unklar'}`;
}

// ── Selbsttest (offline, ohne Schlüssel, ohne Netz) ───────────────────────────────────────────────────────────────────────
export async function selbsttest() {
  const f = [], ok = (n, b, d = '') => f.push([n, !!b, d]);
  for (const [h, soll] of [['au3j0y-hq.myshopify.com', true], ['a.myshopify.com', true], ['evil.com/x#.myshopify.com', false], ['au3j0y-hq.myshopify.com.evil.com', false],
    ['user@au3j0y-hq.myshopify.com', false], ['au3j0y-hq.myshopify.com:8443', false], ['-x.myshopify.com', false], ['AU3J0Y.myshopify.com', false], ['', false], ['au3j0y-hq.myshopify.com\n', false]])
    ok(`Host ${JSON.stringify(h)} → ${soll}`, hostOk(h) === soll);
  ok('Konfig: LIMIT "abc" / "0" / "3oops" abgelehnt', ['abc', '0', '3oops', '-5'].every(x => konfig({ LIMIT: x }).fehler.length === 1));
  ok('Konfig: LIMIT=5000 geht, Standard 120', konfig({ LIMIT: '5000' }).limit === 5000 && konfig({}).limit === 120);
  ok('Konfig: DRY_RUN "1" dry · "" live · "yes" abgelehnt', konfig({ DRY_RUN: '1' }).dry === true && konfig({}).dry === false && konfig({ DRY_RUN: 'yes' }).fehler.length === 1);
  ok('Konfig: --zeile ist immer dry', konfig({ DRY_RUN: '0' }, true).dry === true);
  const echt = 'shpss_' + 'ab12cd34'.repeat(4);
  ok('Secret: Einfügefehler geheilt, sonst unverändert', clientSecret(echt + '=SHOPIFY_CLIENT_SECRET') === echt && clientSecret(echt) === echt && clientSecret('xyz=SHOPIFY_CLIENT_SECRET') === 'xyz=SHOPIFY_CLIENT_SECRET');
  // Text-Kanarien
  const s1 = mkSeo('Relaxed-Fit Hoodie «Cosy» · Fell-Panel'), s2 = mkSeo('Ein sehr langes Produkt mit vielen weiteren Wörtern im Titel, damit alles gekürzt werden muss '.repeat(2));
  ok('Text: Bindestrich im Wort bleibt, « · » wird « – »', s1.title.startsWith('Relaxed-Fit Hoodie «Cosy» – Fell-Panel'), s1.title);
  ok('Text: kurzer Titel behält « | LuxeStyle CH» und die Vorlage', s1.title.endsWith(SUFFIX) && s1.description.includes('Jetzt –10% mit Code WELCOME10.'));
  ok('Text: langer Titel ≤ 60 mit Markenanhang, Beschreibung ≤ 155', s2.title.length <= 60 && /\| LuxeStyle( CH)?$/.test(s2.title) && s2.description.length <= 155, `${s2.title.length}/${s2.description.length}`);
  const halb = x => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(x);
  const s3 = mkSeo('x'.repeat(48) + '😀' + 'y'.repeat(30)), s4 = mkSeo('x'.repeat(153) + '😀' + 'y'.repeat(30));
  ok('KANARIE halbes Emoji: harter Schnitt in Titel (Stelle 47) und Beschreibung (Stelle 153) lässt kein einzelnes Surrogat stehen', !halb(s3.title) && !halb(s4.description) && s3.title.length <= 60 && s4.description.length <= 155);
  ok('KANARIE Zeilenumbruch: Fremdtext «x\\n::error::y» wird EINE Zeile ohne «::» am Anfang', einzeilig('Hoodie\n::error title=x::y\r\n\u2028z') === 'Hoodie ::error title=x::y z' && !/\n/.test(einzeilig('a\nb')));
  ok('Konfig: --zeile ignoriert LIMIT/DRY_RUN (Müll darf die Aufseher-Zeile nicht verhindern), der Lauf bleibt streng', konfig({ LIMIT: 'abc', DRY_RUN: 'vielleicht' }, true).fehler.length === 0 && konfig({ LIMIT: 'abc', DRY_RUN: 'vielleicht' }).fehler.length === 2);
  // Bewertung + Teilschreiben
  const P = (title, st, sd, extra = {}) => ({ id: 'gid://shopify/Product/1', handle: 'h', title, status: 'ACTIVE', seo: { title: st, description: sd }, media: { nodes: [] }, ...extra });
  const beschr = ' Eigene Beschreibung «Fell» — mit Leerraum am Ende  ';
  const e1 = ergaenze(P('Hoodie Cosy', null, beschr)), e2 = ergaenze(P('Hoodie Cosy', 'Eigener Titel ', '')), e3 = ergaenze(P('Hoodie Cosy', null, null));
  ok('KANARIE Teilschreiben: Titel leer → beide Felder, Beschreibung BYTEGLEICH', e1 && e1.description === beschr && e1.title.length > 0 && Object.keys(e1).join() === 'title,description');
  ok('KANARIE Teilschreiben: Beschreibung leer → beide Felder, Titel BYTEGLEICH', e2 && e2.title === 'Eigener Titel ' && e2.description.length > 0);
  ok('beide leer → beide aus der Vorlage; beide gefüllt → keine Lücke', e3 && e3.title && e3.description && ergaenze(P('X', 'a', 'b')) === null && bewerte(P('X', 'a', 'b')).art === 'fertig');
  ok('seo-Feld vom falschen Typ / fehlend ist «unklar», nie «leer»', bewerte(P('X', 5, null)).art === 'unklar' && bewerte({ ...P('X', null, null), seo: undefined }).art === 'unklar' && bewerte(P('X', {}, null)).art === 'unklar');
  // Sperre: Kanarienvogel mit Wegwerf-Datei
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'seo-st-')), 'sperre.txt');
  fs.writeFileSync(tmp, '# ende: 2026-10-24\n15453601890689  silberarmband-614500   # Silberarmband\n');
  const aktiv = sperreLaden({ datei: tmp, heute: '2026-10-20' }), vorbei = sperreLaden({ datei: tmp, heute: '2026-10-25' });
  ok('Sperre: ID und Handle werden getroffen', aktiv.ok && gesperrtIn(aktiv, { id: 'gid://shopify/Product/15453601890689', handle: 'x' }) && gesperrtIn(aktiv, { id: 'gid://shopify/Product/9', handle: 'Silberarmband-614500' }));
  ok('Sperre: fremdes Produkt frei · nach dem Ende frei', !gesperrtIn(aktiv, { id: 'gid://shopify/Product/9', handle: 'x' }) && vorbei.ok && !vorbei.aktiv && !gesperrtIn(vorbei, { id: 'gid://shopify/Product/15453601890689', handle: 'x' }));
  ok('KANARIE Sperr-Prüfer: trifft der Prüfer die erste Sperr-ID nicht, ist die Sperre «nicht zu beurteilen» (ok:false), nicht «frei»', !sperreLaden({ datei: tmp, heute: '2026-10-20', gesperrt: () => false }).ok && /Kanarienvogel/.test(sperreLaden({ datei: tmp, heute: '2026-10-20', gesperrt: () => false }).grund));
  ok('Sperre: Datei fehlt / Kopf kaputt → ok:false (fail-closed)', !sperreLaden({ datei: tmp + '.fehlt' }).ok && (fs.writeFileSync(tmp, '15453601890689 x\n'), !sperreLaden({ datei: tmp, heute: '2026-10-20' }).ok));
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  // Mini-Lauf gegen einen Speicher-Shop, der wie Shopify nullt (Teil-seo-Eingabe setzt das ausgelassene Feld auf null)
  const speicher = new Map([['gid://shopify/Product/1', P('Hoodie Cosy', null, beschr)]]);
  const sendet = [];
  const gqlFake = async (q, v) => {
    if (q === Q_SCAN || q === Q_SCAN_ZEILE) return { data: { shop: { name: 'LuxeStyle', myshopifyDomain: EXPECTED_SHOP, currencyCode: 'CHF', primaryDomain: { host: 'luxestyle.ch' } }, products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [...speicher.values()].map(x => structuredClone(x)) } } };
    if (q === Q_EIN) return { data: { shop: { name: 'LuxeStyle', myshopifyDomain: EXPECTED_SHOP, currencyCode: 'CHF', primaryDomain: { host: 'luxestyle.ch' } }, nodes: v.ids.map(i => structuredClone(speicher.get(i) ?? null)) } };
    sendet.push(structuredClone(v.product.seo));
    const p = speicher.get(v.product.id); p.seo = { title: v.product.seo.title ?? null, description: v.product.seo.description ?? null };   // Shopify-Semantik: Ausgelassenes wird null
    return { data: { productUpdate: { product: { id: v.product.id }, userErrors: [] } } };
  };
  const r = await lauf(konfig({}), { gql: gqlFake, sperre: () => ({ ok: true, aktiv: false, ids: new Set(), handles: new Set() }), log: () => {} });
  ok('Mini-Lauf: 1 geschrieben, Exit 0, Beschreibung im Speicher unverändert', r.exit === 0 && r.bericht.geschrieben === 1 && speicher.get('gid://shopify/Product/1').seo.description === beschr, JSON.stringify(r.bericht.gestoppt));
  ok('Mini-Lauf: die Mutation trug beide Felder', sendet.length === 1 && Object.keys(sendet[0]).sort().join() === 'description,title' && sendet[0].description === beschr);
  const bad = f.filter(x => !x[1]);
  for (const [n, b, d] of f) console.log((b ? '  ok  ' : '  FEHLER ') + n + (!b && d ? ` (${d})` : ''));
  console.log(`Selbsttest seo-optimizer.mjs: ${f.length - bad.length}/${f.length}`);
  return !bad.length;
}

// ── Aufruf ───────────────────────────────────────────────────────────────────────────────────────────────
/** deps (nur Tests): fetchFn, warte, log, err, sperre. Rückgabe = Exit-Code. */
export async function main(argv = process.argv.slice(2), env = process.env, deps = {}) {
  const log = deps.log ?? console.log, err = deps.err ?? console.error;
  const unbekannt = argv.filter(a => !SCHALTER.has(a));
  if (unbekannt.length) { err(`Unbekannter Schalter: ${unbekannt.join(' ')} — erlaubt: --selbsttest, --zeile, --help (es wurde nichts ausgeführt)`); return 2; }
  if (argv.includes('--help') || argv.includes('-h')) { log('seo-optimizer.mjs [--zeile | --selbsttest]  (LIMIT, DRY_RUN=1; Kopfkommentar der Datei)'); return 0; }
  if (argv.includes('--selbsttest')) return (await selbsttest()) ? 0 : 1;
  const zeile = argv.includes('--zeile'), c = konfig(env, zeile);
  if (c.fehler.length) {
    if (zeile) log(`⚠️ SEO-LÜCKEN: unklar (Konfiguration: ${c.fehler.join('; ')})`.slice(0, 240));      // der Aufseher bekommt auch hier seine Zeile, nicht nur Exit 2
    else for (const m of c.fehler) log(`::error title=seo-optimizer::${m}`);
    err('Konfiguration ungültig: ' + c.fehler.join('; ')); return 2;
  }
  if (!c.SHOP) { log(zeile ? '⚠️ SEO-LÜCKEN: unklar (kein SHOPIFY_SHOP — keine Prüfung erfolgt)' : 'Kein SHOPIFY_SHOP → No-op (UNKLAR: keine Prüfung erfolgt).'); return 0; }
  if (!hostOk(c.SHOP) || c.SHOP !== EXPECTED_SHOP) {
    const m = `SHOPIFY_SHOP ist ${hostOk(c.SHOP) ? 'ein anderer Shop-Host' : 'kein gültiger *.myshopify.com-Host'} (Länge ${c.SHOP.length}) — keine Netzanfrage gesendet, kein Schlüssel verschickt`;
    log(`::error title=seo-optimizer::${m}`); err(m); return 2;
  }
  if (!(c.CID && c.CS) && !c.TOK_ST) { log(zeile ? '⚠️ SEO-LÜCKEN: unklar (keine Shopify-Zugangsdaten)' :'Keine Shopify-Credentials → No-op (UNKLAR: keine Prüfung erfolgt).'); return 0; }
  const fetchFn = deps.fetchFn ?? ((...a) => globalThis.fetch(...a)), warte = deps.warte ?? warteStd;
  const t = await holeToken(c, { fetchFn });
  if (t.fehler) { const m = `Auth: ${t.fehler} — nichts gelesen, nichts geschrieben`; log(`::error title=seo-optimizer::${m}`); log(zeile ? `⚠️ SEO-LÜCKEN: unklar (${t.fehler})` : `⚠️ UNKLAR: ${m}`); return 1; }
  if (t.hinweis) log(`ℹ️ ${t.hinweis}`);
  const gql = mkGql({ shop: c.SHOP, token: t.token, fetchFn, warte });
  let r;
  try { r = await lauf(c, { gql, sperre: deps.sperre ?? (() => sperreLaden()), log: zeile ? () => {} : log }); }
  catch (e) { const m = `Unerwarteter Fehler: ${e?.message || 'unbekannt'}`; log(`::error title=seo-optimizer::${m}`); log(zeile ? `⚠️ SEO-LÜCKEN: unklar (${m})` : `⚠️ UNKLAR: ${m}`); return 1; }
  const rb = r.bericht;
  if (zeile) { log(zeilenText(rb, r.exit)); return 0; }                         // Aufseher-Zeile: nie rot, die Zeile trägt das ⚠️
  const text = meldung(rb);
  log(text);
  if (r.exit) log(`::error title=seo-optimizer::${(rb.gestoppt?.grund ?? rb.unklar[0]?.grund ?? 'Befund — siehe Ausgabe').replace(/[\r\n%]/g, ' ')}`);
  if (c.TG_T && c.TG_C && (rb.geschrieben > 0 || rb.wuerde > 0 || rb.failedBilder.length || r.exit)) {
    try {
      await fetchFn(`https://api.telegram.org/bot${c.TG_T}/sendMessage`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: c.TG_C, text, disable_web_page_preview: true }) });
    } catch { log('ℹ️ Telegram-Meldung nicht zugestellt (ohne Einfluss auf das Ergebnis).'); }
  }
  return r.exit;
}

const echt = f => { try { return fs.realpathSync(f); } catch { return path.resolve(f); } };
if (process.argv[1] && echt(process.argv[1]) === echt(fileURLToPath(import.meta.url))) {
  main().then(code => { process.exitCode = code; }, e => { console.error('Fehler:', e?.message || 'unbekannt'); process.exitCode = 1; });
}
