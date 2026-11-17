#!/usr/bin/env node
/**
 * Karat und «goldplattiert» bei vergoldeter Ware (Besitzer 17.11.2026 «ja»): Titel, Beschreibung und SEO-Texte von Produkten, die als Ersatzware (vergoldet) geführt werden, bekommen
 * den bereinigten Text. Streichen: Karat/Feingehalt («18K», «14 Karat», «18-karätig», «Reinheit», «Feingehalt»), «goldplattiert», «Gold filled»/«goldgefüllt», «Echtgold»/«echtes Gold».
 * Stehen bleiben: «vergoldet», «Vergoldung», «PVD-vergoldet», «Gold-Optik», «Gold-Finish» und Gold als Farbname. Status, Adresse (Handle), Preise, Bilder, Varianten und Kanäle ändern sich nie.
 *   node dropship/gold-bazg-1711/karat_texte.mjs                  Trockenlauf (Vorgabe): prüft alle Einträge, liest den Shop und zeigt, was geschrieben würde
 *   LIVE=1 node …/karat_texte.mjs                                 schreibt (je Produkt: lesen, mit `alt` vergleichen, schreiben, zurücklesen); höchstens MAX Produkte je Lauf (Vorgabe 40)
 *   ZURUECK=1 [LIVE=1] node …/karat_texte.mjs                     Rücknahme auf `alt` (Trockenlauf Vorgabe)
 *   ONLY=handle1,handle2                                          nur diese Produkte
 * Eingabe: karat-liste.json = {eintraege:[{handle, id, tagsEntfernt, alt:{…}, neu:{…}}]}; Felder: title, descriptionHtml, seoTitle, seoDescription (alt und neu nennen dieselben, nur geänderte).
 * `alt` = Stand VOR der Änderung; die Datei wird committet und gepusht, BEVOR geschrieben wird (Sicherung = Rücknahmequelle).
 * Schutz: ein Feld, das inzwischen von jemand anderem geändert wurde (weder alt noch neu), wird NICHT überschrieben (FREMD_UEBERSCHREIBEN=1 hebt das auf). Ein Teilstand aus einem abgebrochenen Lauf wird fortgesetzt.
 * Nach jedem Schreiben: alle vier Textfelder UND der Status werden zurückgelesen; ein Feld ausserhalb des Eintrags oder der Status, der sich dabei geändert hat, ist ein Fehler (Halt).
 * Exit 0 in Ordnung · 1 Fehler/Zugang · 2 Eingabe unplausibel (Tor) · 6 Rücklesen weicht ab, fremde Änderung gefunden oder Fehler beim Schreiben.
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const S = String.raw;
const SEP = S`[\s\-‑]*`;
/** Karat-Zahl: 9/10/14/18/22/24 mit K, Kt, Karat, Carat (auch «18 K», «24‑K»), nicht Teil einer anderen Zahl oder eines Wortes («10 Karton», «18 Kästchen»). */
const KT = S`(?:9|10|14|18|22|24)\s?[-‑]?\s?(?:k|kt|karat|carat)(?![a-zäöüß])`;
const KA = S`(?:9|10|14|18|22|24)[-‑ ]?karätig\w*`;
const LB = S`(?<![\w.,])`;
export const ANSPRUCH = new RegExp(
  [
    S`${LB}${KT}`, KA,
    S`gold[\s\-‑]?plattier`, S`gold[\s\-‑]?platier`, S`gold[\s\-‑]?auflage`, S`gold[\s\-‑]?verplatt`, S`gold[\s\-‑]?filled`, S`goldgefüll`, S`gold[\s\-‑]?füllung`,
    S`echt[\s\-‑]?gold`, S`echtes\s+gold`, S`real\s+gold`, S`echt[\s\-‑]?vergold`,
    S`(?<![\w-])(?:reinheit|purität|purity|feingehalt)(?![\w])`,
  ].join('|'), 'gi');
/** Behauptungen in einem Text (HTML wird zu Klartext). */
export const belege = (t) => {
  if (t == null) return [];
  const klar = String(t).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
  return [...klar.matchAll(ANSPRUCH)].map((m) => m[0]);
};
export const FELDER = ['title', 'descriptionHtml', 'seoTitle', 'seoDescription'];
export const LESEN = `query($h:String!){productByHandle(handle:$h){id handle status title descriptionHtml seo{title description}}}`;
export const SCHREIBEN = `mutation($in:ProductUpdateInput!){productUpdate(product:$in){product{id} userErrors{field message}}}`;

/** Zeilenenden und Endleerraum vereinheitlichen. */
export const norm = (s) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/\s+$/, '');
/** Die Felder, die ein Eintrag anfasst (in alt oder neu genannt), in fester Reihenfolge. */
export const felderVon = (e) => FELDER.filter((f) => e?.alt?.[f] !== undefined || e?.neu?.[f] !== undefined);
const kommentare = (h) => String(h).match(/<!--[\s\S]*?-->/g) || [];
const tags = (h) => String(h).replace(/<!--[\s\S]*?-->/g, '').match(/<\/?[a-zA-Z][^>]*>/g) || [];
const zaehle = (l) => l.reduce((m, x) => (m.set(x, (m.get(x) || 0) + 1), m), new Map());
const klarText = (h) => String(h).replace(/<[^>]*>/g, '').trim();
export const trefferZahl = (stand, felder = FELDER) => felder.reduce((n, f) => n + belege(stand?.[f]).length, 0);
/** Feldvergleich (a = gelesener Stand, b = Soll). Sonderfall SEO-Titel: Shopify speichert einen SEO-Titel, der dem Produkttitel gleicht, als «nicht gesetzt» und liest ihn leer zurück (am 17.11.2026 an einem echten Produkt gemessen). */
const leer = (v) => v == null || norm(v) === '';
export const gleichFeld = (f, a, b) => {
  if (norm(a?.[f]) === norm(b?.[f])) return true;
  if (f !== 'seoTitle') return false;
  return leer(a?.seoTitle) && !leer(b?.seoTitle) && norm(b.seoTitle) === norm(a?.title); // a = der im Shop gelesene Stand
};
const gleichStand = (a, b, felder) => felder.every((f) => gleichFeld(f, a, b));
const MAX_LAENGE = { seoTitle: 70, seoDescription: 160 };

/**
 * Tore je Eintrag (rein). Rückgabe: Liste der Probleme (leer = in Ordnung).
 * - handle, id, alt und neu vorhanden; nur die vier bekannten Felder, alt und neu nennen dieselben, alle als Text
 * - die alten Felder zusammen tragen Behauptungen, die neuen Felder KEINE (jede Behauptung ist weg), und die Änderung ist echt (alt ≠ neu je Feld)
 * - descriptionHtml: alle HTML-Kommentare bleiben, es entsteht kein neues oder verändertes Tag, die Zahl der entfernten Tags (Öffnen und Schliessen) ist genau `tagsEntfernt`; der Text bleibt über 60 % der alten Länge
 * - title und SEO-Felder werden nicht leer, title über 40 % der alten Länge, seoTitle höchstens 70 und seoDescription höchstens 160 Zeichen (oder nicht länger als vorher)
 */
export function pruefeEintrag(e) {
  const p = [];
  if (!e || !e.handle || !e.id || !e.alt || !e.neu) return ['Eintrag unvollständig (handle, id, alt, neu)'];
  const felder = felderVon(e);
  if (!felder.length) return ['keine Felder (title, descriptionHtml, seoTitle, seoDescription)'];
  for (const k of [...Object.keys(e.alt), ...Object.keys(e.neu)]) if (!FELDER.includes(k)) p.push('unbekanntes Feld ' + k);
  for (const f of felder) if (typeof e.alt[f] !== 'string' || typeof e.neu[f] !== 'string') return [...p, `alt.${f} und neu.${f} müssen Texte sein`];
  if (p.length) return p;
  for (const f of felder) if (norm(e.alt[f]) === norm(e.neu[f])) p.push(`${f}: alt gleich neu`);
  const tA = trefferZahl(e.alt, felder), tN = trefferZahl(e.neu, felder);
  if (tA === 0) p.push('alt trägt keine Behauptung: nichts zu bereinigen');
  if (tN > 0) p.push(`neu trägt noch ${tN} Behauptung(en): ` + felder.flatMap((f) => belege(e.neu[f])).slice(0, 4).join(' | '));
  if (felder.includes('descriptionHtml')) {
    const a = e.alt.descriptionHtml, n = e.neu.descriptionHtml;
    if (JSON.stringify(kommentare(a)) !== JSON.stringify(kommentare(n))) p.push('descriptionHtml: HTML-Kommentare verändert');
    const zA = zaehle(tags(a)), zN = zaehle(tags(n));
    for (const [t, c] of zN) if ((zA.get(t) || 0) < c) { p.push('descriptionHtml: neues oder verändertes Tag: ' + t.slice(0, 80)); break; }
    const weg = tags(a).length - tags(n).length;
    if (weg !== (e.tagsEntfernt ?? 0)) p.push(`descriptionHtml: ${weg} Tags entfernt, erwartet ${e.tagsEntfernt ?? 0}`);
    if (!klarText(n)) p.push('Text würde leer');
    else if (klarText(n).length < klarText(a).length * 0.6) p.push('Text würde auf weniger als 60 % schrumpfen');
  }
  if (felder.includes('title')) {
    if (!e.neu.title.trim()) p.push('Titel würde leer');
    else if (e.neu.title.length < e.alt.title.length * 0.4) p.push('Titel würde auf weniger als 40 % schrumpfen');
    if (e.neu.title.length > 255) p.push('Titel länger als 255 Zeichen');
  }
  for (const f of ['seoTitle', 'seoDescription'].filter((x) => felder.includes(x))) {
    if (!e.neu[f].trim()) p.push(`${f} würde leer`);
    if (e.neu[f].length > Math.max(MAX_LAENGE[f], e.alt[f].length)) p.push(`${f} länger als ${MAX_LAENGE[f]} Zeichen`);
  }
  return p;
}

/** Gelesenen Knoten in die Form {id, status, title, descriptionHtml, seoTitle, seoDescription}. */
export const flach = (n) => ({ id: n.id, status: n.status, title: n.title ?? '', descriptionHtml: n.descriptionHtml ?? '', seoTitle: n.seo?.title ?? null, seoDescription: n.seo?.description ?? null });

/** Eingaben über `o`, damit der Test eine Attrappe einspeisen kann. */
export async function lauf(o) {
  const log = o.log || ((z) => console.log(z));
  const pause = o.pause || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const jetzt = o.jetzt || (() => new Date());
  const ledger = (art, k, text = '') => o.ledger?.(`${jetzt().toISOString()}|${art}|${k}|${text}`);
  const versuche = o.leseVersuche ?? 5, lesePause = o.lesePauseMs ?? 3000, schreibPause = o.pauseMs ?? 1200;
  const max = o.max ?? 40;
  const eintraege = (o.eintraege || []).filter((e) => !o.nur?.length || o.nur.includes(e.handle));
  if (!eintraege.length) { log('Keine Einträge (oder ONLY trifft nichts)'); return 2; }
  if (new Set(eintraege.map((e) => e.handle)).size !== eintraege.length) { log('Doppelte Einträge in der Eingabe'); return 2; }
  if (!o.zurueck) {
    let rot = 0;
    for (const e of eintraege) { const p = pruefeEintrag(e); if (p.length) { rot++; log(`TOR ${e.handle}: ${p.join(' · ')}`); } }
    if (rot) { log(`${rot} Einträge bestehen die Tore nicht, nichts geschrieben`); return 2; }
  }
  const lese = async (e) => {
    const j = await o.q(LESEN, { h: e.handle });
    const n = j.productByHandle;
    return n && n.handle === e.handle ? flach(n) : null;
  };
  const soll = (e) => (o.zurueck ? e.alt : e.neu);
  // fremd = ein Feld hat weder den alten noch den neuen Wert; ein Teilstand bleibt fortsetzbar
  const fremdFelder = (e, ist) => felderVon(e).filter((f) => !gleichFeld(f, ist, e.alt) && !gleichFeld(f, ist, e.neu));
  let schlecht = 0, geschrieben = 0, schon = 0, ausgelassen = 0;
  for (const e of eintraege) {
    const k = e.handle, felder = felderVon(e), z = soll(e);
    const ist = await lese(e);
    if (!ist) { log(`FEHLT ${k}: nicht lesbar`); ledger('FEHLER', k, 'nicht lesbar'); schlecht++; continue; }
    if (ist.id !== e.id) { log(`FALSCHE ID ${k}: Shop ${ist.id}, Liste ${e.id}`); ledger('FEHLER', k, 'id weicht ab'); schlecht++; continue; }
    if (gleichStand(ist, z, felder)) { log(`schon erledigt: ${k}`); schon++; continue; }
    const fremd = fremdFelder(e, ist);
    if (fremd.length && !o.fremdUeberschreiben) { log(`FREMD VERÄNDERT ${k}: ${fremd.join(', ')} weder alt noch neu, nicht überschrieben`); ledger('FREMD', k, fremd.join(',')); schlecht++; continue; }
    if (o.live && geschrieben >= max) { ausgelassen++; continue; }
    log(`${o.live ? 'SCHREIBE' : 'würde schreiben'} ${k} [${felder.filter((f) => !gleichFeld(f, ist, z)).join(', ')}]: Behauptungen ${trefferZahl(ist, felder)} → ${trefferZahl(z, felder)}`);
    if (!o.live) continue;
    const aend = felder.filter((f) => !gleichFeld(f, ist, z));
    const eingabe = { id: ist.id };
    for (const f of aend.filter((x) => x === 'title' || x === 'descriptionHtml')) eingabe[f] = z[f];
    const seoF = aend.filter((f) => f === 'seoTitle' || f === 'seoDescription');
    if (seoF.length) {
      eingabe.seo = {};
      const titel = seoF.includes('seoTitle') ? z.seoTitle : ist.seoTitle, beschr = seoF.includes('seoDescription') ? z.seoDescription : ist.seoDescription;
      if (titel != null) eingabe.seo.title = titel;
      if (beschr != null) eingabe.seo.description = beschr;
    }
    let fehler = [];
    try {
      const j = await o.q(SCHREIBEN, { in: eingabe });
      fehler = j.productUpdate?.userErrors || [];
    } catch (x) { fehler = [{ message: 'Ausnahme: ' + x.message }]; }
    if (fehler.length) { log(`FEHLER ${k}: ${fehler.map((f) => f.message).join(' | ')}`); ledger('FEHLER', k, fehler.map((f) => f.message).join(' | ')); return 6; }
    await pause(schreibPause);
    let ok = false, nach = null;
    for (let i = 1; i <= versuche; i++) {
      nach = await lese(e);
      if (nach && gleichStand(nach, z, felder)) { ok = true; break; }
      if (i < versuche) await pause(lesePause);
    }
    if (ok) {
      const unveraendert = FELDER.filter((f) => !felder.includes(f)).every((f) => gleichFeld(f, nach, ist)) && nach.status === ist.status;
      if (!unveraendert) { ledger('ABWEICHUNG', k, 'Feld ausserhalb des Eintrags oder Status hat sich geändert'); log(`ABWEICHUNG ${k}: ein Feld ausserhalb des Eintrags oder der Status hat sich geändert, Halt`); return 6; }
    }
    ledger(ok ? (o.zurueck ? 'ZURUECK' : 'GESCHRIEBEN') : 'ABWEICHUNG', k, ok ? '' : 'zurückgelesener Text weicht ab');
    if (!ok) { log(`ABWEICHUNG ${k}: zurückgelesener Text weicht vom geschriebenen ab, Halt`); return 6; }
    geschrieben++;
  }
  if (!o.live) { log(`Trockenlauf: ${eintraege.length - schon - schlecht} würden geschrieben, ${schon} schon erledigt, ${schlecht} Probleme`); return schlecht ? 6 : 0; }
  log(`Geschrieben und zurückgelesen: ${geschrieben}, schon erledigt: ${schon}, Probleme: ${schlecht}${ausgelassen ? `, wegen MAX=${max} ausgelassen: ${ausgelassen}` : ''}`);
  return schlecht ? 6 : 0;
}

// ------------------------------------------------------------------ Aufruf von der Kommandozeile
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [{ shopifyGql }, { shopifyClientSecret }] = await Promise.all([import('../../automation/lib/shopify_gql.mjs'), import('../../automation/lib/shopify_secret.mjs')]);
  const HIER = dirname(fileURLToPath(import.meta.url));
  const EIN = process.env.EINGABE || join(HIER, 'karat-liste.json'), LEDGER = process.env.LEDGER || join(HIER, 'karat-ledger.txt');
  if (!existsSync(EIN)) { console.error('karat-liste.json fehlt'); process.exit(2); }
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  try {
    const code = await lauf({
      q: (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b), eintraege: JSON.parse(readFileSync(EIN, 'utf8')).eintraege,
      live: process.env.LIVE === '1', zurueck: process.env.ZURUECK === '1', fremdUeberschreiben: process.env.FREMD_UEBERSCHREIBEN === '1',
      max: process.env.MAX ? Number(process.env.MAX) : 40,
      nur: (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean), ledger: (z) => appendFileSync(LEDGER, z + '\n'),
    });
    process.exit(code);
  } catch (e) { console.error('FEHLER:', e.message); process.exit(1); }
}
