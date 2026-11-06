// Spielt die Warenkorb-Miniatur («_vorschau») in das MAIN-Theme: snippets/cart-products.liquid. Trockenlauf ist Vorgabe. NICHT AUSGEFÜHRT (Stand 06.11.2026): wartet auf das Ja des Besitzers.
//
//   Trockenlauf:  node dropship/wp6-0611/theme/apply.mjs               (liest nur; meldet, ob die Prüfsumme der Live-Datei gleich dem Abbild ist; PRUEFEN=1 misst zusätzlich die Seiten)
//   Einspielen:   LIVE=1 node dropship/wp6-0611/theme/apply.mjs
//   Rücknahme:    ZURUECK=1 LIVE=1 node dropship/wp6-0611/theme/apply.mjs
//
// Einspielen im Ablauf: Eingaben prüfen (Sicherung im Repo gleich MD5_VOR, Soll-Text gerechnet) -> Live-Datei lesen: Prüfsumme gleich MD5_VOR? (sonst Exit 4, nichts geschrieben; es gibt KEIN Überschreiben
// einer fremd veränderten Datei: dann MD5_VOR und die Sicherung neu setzen und die Tests wiederholen) -> Seiten messen (Ausgangswerte merken; optional Warenkorb-Probe) -> Datei NOCHMAL lesen (hat jemand in
// der Zwischenzeit gespeichert: Exit 4, nichts geschrieben) -> Merkliste ablegen -> schreiben (ein themeFilesUpsert) -> warten, bis die API-Prüfsumme gleich dem Soll ist (höchstens 150 s) -> Seiten erneut
// messen (zwei Runden): HTTP 200, kein NEUER «Liquid error», die Hüllen des Warenkorbs (cart-items__wrapper) so zahlreich wie vorher; mit PRUEF_WARENKORB=1 zusätzlich ein echter Wegwerf-Warenkorb mit
// _vorschau (siehe unten). Bei JEDEM Fehler nach dem Schreiben (Rücklesen weicht ab, Seitenprüfung, Ausnahme, SIGINT/SIGTERM) schreibt das Skript die Sicherung selbst zurück, wartet auf die Prüfsumme
// und misst die Seiten. Misslingt auch das, steht der Befehl für den Rückweg von Hand in der Meldung (Exit 9).
//
// Grenze (nicht messbar ohne Warenkorb): eine leere Seite /cart und die Schublade im Kopf rendern nur den Leer-Zweig; die Zeilen-Schleife, die der Patch ändert, läuft erst bei einem Warenkorb mit Artikeln.
// Liquid-SYNTAXfehler meldet themeFilesUpsert selbst als userErrors (Exit 5, nichts geschrieben); Laufzeitfehler in einer Zeile zeigt nur ein echter Warenkorb. Darum gibt es PRUEF_WARENKORB=1:
// ein anonymer Wegwerf-Warenkorb nur in diesem Skript (eigene Cookies): POST /cart/add.js (Variante PRUEF_VARIANTE, Eigenschaften «🎨 Design», «_pod_karte», «_vorschau»), GET /cart prüfen, POST /cart/clear.js.
// Es entsteht keine Bestellung; Shopify kann den Aufruf als Besuch mit Warenkorb zählen (Statistik). Ohne Zugriff auf /cart/add.js (z. B. Bot-Schutz) bricht die Probe VOR dem Schreiben ab (Exit 4).
//
// Exit: 0 ok · 1 kein Token / fehlende Variablen / ungültiger Aufruf / unerwartete Ausnahme VOR dem Schreiben
//       3 schon eingespielt / Rücknahme nicht möglich (fremder Stand)
//       4 Ausgangsstand oder Sicherung weicht ab (auch: Seiten oder Warenkorb-Probe schon vor dem Eingriff fehlerhaft; Datei zwischen Lesen und Schreiben geändert)
//       5 userErrors beim Schreiben (nichts geschrieben; bei LIVE geprüft) · 6 Rücklesen weicht ab (zurückgeschrieben und bestätigt) · 7 Seitenprüfung fehlgeschlagen (zurückgeschrieben und bestätigt)
//       8 Ausnahme nach Beginn des Schreibens (zurückgeschrieben und bestätigt) · 9 RÜCKWEG NICHT BESTÄTIGT: Datei und Seiten von Hand prüfen · 130 Abbruch durch Signal (zurückgeschrieben und bestätigt)
// Schalter: VORSCHAU_CLOUD=<Cloud-Name> (nur Adressen dieser Cloud gelten; Vorgabe: jede Cloud unter res.cloudinary.com; wird in der Merkliste festgehalten), FREMD_UEBERSCHREIBEN=1 (nur bei ZURUECK: auch einen
// fremd veränderten Stand mit der Sicherung überschreiben), VORFEHLER_OK=1 (Liquid-Fehler, die schon VOR dem Eingriff auf den Seiten stehen, hinnehmen), PRUEF_PRODUKTE (Handles, Komma getrennt),
// PRUEF_RUNDEN (Vorgabe 2), STOREFRONT (Vorgabe https://luxestyle.ch), PRUEF_WARENKORB=1 mit PRUEF_VARIANTE=<numerische Shopify-Varianten-ID eines verkäuflichen Artikels> und PRUEF_VORSCHAU=<gültige Adresse>
// (Vorgabe: https://res.cloudinary.com/demo/image/upload/sample.jpg; mit VORSCHAU_CLOUD muss PRUEF_VORSCHAU gesetzt sein).
// APPLY_ZEIT=0.001 verkürzt alle Wartezeiten (nur für den Test mit der Attrappe der Theme-API).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { shopifyGql } from '../../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../../automation/lib/shopify_secret.mjs';
import { normalizeShopifyHost } from '../../../automation/lib/shopify_host.mjs';
import { DATEI, MD5_VOR, MARKE, anwenden, pruefeCloud } from './patches.mjs';

export const md5 = (s) => createHash('md5').update(s).digest('hex');
export const SICH_NAME = 'snippets__cart-products.liquid.vor';
export const BEFEHL = 'dropship/wp6-0611/theme/apply.mjs';

// ---------- reine Funktionen (ohne Netz, getestet) ----------
const ENTITAETEN = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#34;': '"' };
export const sichtbarerText = (html) => html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|#39|#34);/g, (m) => ENTITAETEN[m]);
// Seitenauswertung: Liquid-Fehler, Hüllen des Warenkorbs, Miniaturen, Unterstrich-Eigenschaften im sichtbaren Text
export function analysiereSeite(html) {
  const text = sichtbarerText(html);
  return {
    fehler: [...new Set(html.match(/Liquid (?:syntax )?error[^<\n]{0,160}/gi) || [])],
    huellen: (html.match(/class="cart-items__wrapper"/g) || []).length,
    miniaturen: (html.match(/\bdata-lx-vorschau="1"/g) || []).length,
    verraet: /_vorschau|_pod_karte|_Druckdatei/.test(text),
    adresseSichtbar: /res\.cloudinary\.com/.test(text),
  };
}
// Probleme einer Seitenmessung m gegenüber den Ausgangswerten vor (oder, ohne vor, absolut)
export function bewerte(m, vor, opt = {}) {
  const p = [];
  if (m.status !== 200) p.push(m.netz || `HTTP ${m.status}`);
  const bekannt = vor ? vor.fehler : (opt.vorfehlerOk ? m.fehler : []);
  const neue = m.fehler.filter((f) => !bekannt.includes(f));
  if (neue.length) p.push('Liquid-Fehler: ' + neue[0]);
  if (vor && m.status === 200 && m.huellen !== vor.huellen) p.push(`Hüllen des Warenkorbs: ${m.huellen} statt ${vor.huellen}`);
  if (!vor && m.status === 200 && opt.huellenErwartet && m.huellen < 1) p.push('keine Hülle des Warenkorbs (cart-items__wrapper) auf der Seite');
  if (m.verraet) p.push('ein Name einer Unterstrich-Eigenschaft steht im sichtbaren Text');
  return p;
}
// Warenkorb-Probe: erwartet wird nach dem Einspielen genau eine Miniatur, vorher keine
export function bewerteWarenkorb(m, phase) {
  const p = [];
  if (m.status !== 200) p.push(m.netz || `HTTP ${m.status}`);
  if (m.fehler.length) p.push('Liquid-Fehler: ' + m.fehler[0]);
  const erwartet = phase === 'nachher' ? 1 : 0;
  if (m.miniaturen !== erwartet) p.push(`${m.miniaturen} Miniatur(en) mit Vorschau statt ${erwartet}`);
  if (m.verraet) p.push('ein Name einer Unterstrich-Eigenschaft steht im sichtbaren Text');
  if (m.adresseSichtbar) p.push('die Cloudinary-Adresse steht als sichtbarer Text im Warenkorb');
  if (!m.designZeile) p.push('die Zeile «🎨 Design (front)» fehlt im Warenkorb');
  if (!m.zeileDa) p.push('die Wegwerf-Zeile steht nicht im Warenkorb (Probe wirkungslos)');
  return p;
}

// ---------- Ablauf ----------
const zustand = { geschrieben: false, fertig: false, imRueckweg: false };
const fail = (code, text) => { console.error(text); process.exit(code); };

async function haupt() {
  const E = process.env;
  const LIVE = E.LIVE === '1', ZURUECK = E.ZURUECK === '1', FREMD_OK = E.FREMD_UEBERSCHREIBEN === '1', VORFEHLER_OK = E.VORFEHLER_OK === '1', PRUEFEN = E.PRUEFEN === '1', WARENKORB = E.PRUEF_WARENKORB === '1';
  const ZEIT = Number(E.APPLY_ZEIT ?? 1) > 0 ? Number(E.APPLY_ZEIT ?? 1) : 1;
  const RUNDEN = Math.max(1, Math.min(5, Number(E.PRUEF_RUNDEN ?? 2) || 2));
  const HIER = fileURLToPath(new URL('.', import.meta.url));
  const MERKLISTE = HIER + 'sicherung/eingespielt.json';
  const SICH_PFAD = HIER + 'sicherung/' + SICH_NAME;
  const warte = (ms) => new Promise((r) => setTimeout(r, ms * ZEIT));
  console.log(`Modus: ${ZURUECK ? 'Rücknahme' : 'Einspielen'} · ${LIVE ? 'LIVE' : 'Trockenlauf'}${WARENKORB ? ' · mit Warenkorb-Probe' : ''}`);

  if (FREMD_OK && !ZURUECK) fail(1, 'FREMD_UEBERSCHREIBEN gilt nur zusammen mit ZURUECK=1. Eine fremd veränderte Datei wird beim Einspielen nie überschrieben: MD5_VOR und sicherung/ neu setzen und die Tests wiederholen.');
  let cloud = '';
  try { cloud = pruefeCloud(E.VORSCHAU_CLOUD); } catch (e) { fail(1, e.message); }

  // Merkliste (nur lesen; geschrieben wird erst direkt vor dem Schreiben)
  let merk = null;
  if (existsSync(MERKLISTE)) {
    try { merk = JSON.parse(readFileSync(MERKLISTE, 'utf8')); } catch { fail(4, 'sicherung/eingespielt.json ist nicht lesbar: nichts geschrieben'); }
    if (!merk || merk.datei !== DATEI || !/^[0-9a-f]{32}$/.test(merk.md5_soll || '') || merk.md5_vor !== MD5_VOR || typeof merk.cloud !== 'string') fail(4, 'sicherung/eingespielt.json hat ein unerwartetes Format: nichts geschrieben');
  }
  // Bei der Rücknahme gilt die Cloud der Merkliste (so wurde eingespielt); sonst die des Aufrufs
  if (ZURUECK && merk) cloud = merk.cloud;

  // Sicherung und Soll-Text
  if (!existsSync(SICH_PFAD)) fail(4, 'Sicherung fehlt: ' + SICH_PFAD);
  const sicherung = readFileSync(SICH_PFAD, 'utf8');
  if (md5(sicherung) !== MD5_VOR) fail(4, `Sicherung im Repo weicht von MD5_VOR ab (${md5(sicherung)}): nichts geschrieben`);
  let neu;
  try { neu = anwenden(sicherung, { cloud }); } catch (e) { fail(4, 'Soll-Text nicht berechenbar (Anker passen nicht): ' + e.message); }
  const md5Soll = md5(neu);
  console.log(`Soll-Text: ${Buffer.byteLength(neu)} Byte (+${Buffer.byteLength(neu) - Buffer.byteLength(sicherung)}) · md5 ${md5Soll}${cloud ? ' · feste Cloud ' + cloud : ''}`);

  // Token, MAIN-Theme
  const SHOP = (() => { try { return normalizeShopifyHost(E.SHOPIFY_SHOP); } catch (e) { fail(1, e.message); } })();
  if (!SHOP || !E.SHOPIFY_CLIENT_ID || !E.SHOPIFY_CLIENT_SECRET) fail(1, 'SHOPIFY_SHOP, SHOPIFY_CLIENT_ID und SHOPIFY_CLIENT_SECRET müssen gesetzt sein');
  const CS = shopifyClientSecret(E.SHOPIFY_CLIENT_SECRET);
  const rr = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: E.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await rr.json()).access_token; if (!tok) fail(1, 'Kein Token');
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const themen = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes;
  if (themen.length !== 1) fail(1, `Erwartet genau ein MAIN-Theme, gefunden ${themen.length}`);
  const th = themen[0];
  console.log('MAIN', th.id, th.name);

  // Datei lesen: {md5, size, content}; verglichen wird die Prüfsumme der API, der Inhalt muss zu ihr passen
  async function lesen() {
    const nodes = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:5){nodes{filename size checksumMd5 body{__typename ... on OnlineStoreThemeFileBodyText{content} ... on OnlineStoreThemeFileBodyUrl{url}}}}}}`, { id: th.id, f: [DATEI] })).theme.files.nodes;
    const n = nodes.find((x) => x.filename === DATEI); if (!n) return null;
    let content = n.body?.__typename === 'OnlineStoreThemeFileBodyText' ? n.body.content : null;
    if (content == null && n.body?.url) { const r2 = await fetch(n.body.url); if (r2.ok) content = await r2.text(); }
    if (content != null && n.checksumMd5 && md5(content) !== n.checksumMd5) content = null;   // Inhalt passt nicht zur Prüfsumme: nicht verwenden
    return { md5: n.checksumMd5, size: n.size, content };
  }
  const schreibe = async (text) => (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: [{ filename: DATEI, body: { type: 'TEXT', value: text } }] })).themeFilesUpsert;
  // Wartet, bis die API die erwartete Prüfsumme meldet; das Rücklesen kann eine Minute hinterherhinken
  async function warteBis(soll, maxMs) {
    const t0 = Date.now(); let letzter = null;
    for (;;) {
      const nach = await lesen(); letzter = nach ? nach.md5 : null;
      if (letzter === soll) return { ok: true, md5: letzter };
      if (Date.now() - t0 > maxMs * ZEIT) return { ok: false, md5: letzter };
      await warte(10000);
    }
  }

  // ---------- Seitenprüfung ----------
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  const BASIS = (E.STOREFRONT || 'https://luxestyle.ch').replace(/\/+$/, '');
  const KOPF = { 'User-Agent': UA, 'Accept-Language': 'de-CH,de;q=0.9', 'Accept-Encoding': 'identity' };
  async function seite(url, extra = {}) {
    let netz = '', status = 0;
    for (let v = 0; v < 3; v++) {
      try {
        const res = await fetch(url, { headers: { ...KOPF, ...(extra.cookie ? { Cookie: extra.cookie } : {}) }, signal: AbortSignal.timeout(Math.max(1000, 60000 * ZEIT)) });
        status = res.status;
        if (status === 429) { netz = 'HTTP 429 (Drosselung)'; await warte(65000); continue; }
        const t = await res.text();
        return { status, bytes: Buffer.byteLength(t), html: t, ...analysiereSeite(t) };
      } catch (e) { netz = 'Netzfehler: ' + (e && e.message ? e.message : e); status = 0; await warte(5000); }
    }
    return { status, bytes: 0, html: '', fehler: [], huellen: 0, miniaturen: 0, verraet: false, adresseSichtbar: false, netz };
  }
  async function pfadeWaehlen() {
    let handles = (E.PRUEF_PRODUKTE || '').split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9][a-z0-9-]*$/.test(s));
    if (!handles.length) {
      const d = await q(`{ a: products(first: 1, query: "status:active") { nodes { handle } } }`);
      handles = (d.a?.nodes || []).map((x) => x.handle).filter((s) => /^[a-z0-9][a-z0-9-]*$/.test(s));
    }
    return ['/', '/cart', '/fr', ...handles.map((h) => '/products/' + h)];
  }
  async function messen(pfade) {
    const aus = [];
    for (const p of pfade) { const m = await seite(BASIS + p); delete m.html; aus.push({ pfad: p, ...m }); await warte(3000); }
    return aus;
  }
  function auswerten(messung, vor, opt = {}) {
    let ok = true;
    for (const m of messung) {
      const p = bewerte(m, vor ? vor.find((v) => v.pfad === m.pfad) : null, { vorfehlerOk: VORFEHLER_OK, huellenErwartet: m.pfad === '/' });
      if (p.length) ok = false;
      (opt.err ? console.error : console.log)((p.length ? '  FEHLER ' : '  ok     ') + m.pfad.padEnd(52) + ` HTTP ${m.status} · ${m.bytes} Byte · Hüllen ${m.huellen}${m.fehler.length ? ' · LIQUID-FEHLER' : ''}${p.length ? ' · ' + p.join(' | ') : ''}`);
    }
    return ok;
  }

  // ---------- Warenkorb-Probe (nur mit PRUEF_WARENKORB=1): anonymer Wegwerf-Warenkorb mit eigenen Cookies ----------
  const PRUEF_URL = E.PRUEF_VORSCHAU || (cloud ? '' : 'https://res.cloudinary.com/demo/image/upload/sample.jpg');
  const PROBE_TEXT = 'lx-wp6-probe';
  async function warenkorbProbe(phase) {
    const jar = new Map();
    const cookie = () => [...jar].map(([k, v]) => k + '=' + v).join('; ');
    const merken = (res) => { for (const c of (res.headers.getSetCookie ? res.headers.getSetCookie() : [])) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (i > 0) jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); } };
    const post = async (pfad, body) => { const res = await fetch(BASIS + pfad, { method: 'POST', headers: { ...KOPF, 'Content-Type': 'application/json', Accept: 'application/json', ...(jar.size ? { Cookie: cookie() } : {}) }, body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(Math.max(1000, 60000 * ZEIT)) }); merken(res); return res; };
    let m = null;
    try {
      const add = await post('/cart/add.js', { items: [{ id: Number(E.PRUEF_VARIANTE), quantity: 1, properties: { '🎨 Design (front)': `Text: "${PROBE_TEXT}"`, _pod_karte: '{"v":6}', _vorschau: PRUEF_URL } }] });
      if (!add.ok) return { ok: false, probleme: [`POST /cart/add.js: HTTP ${add.status}`], nichtAusfuehrbar: true };
      await warte(1000);
      m = await seite(BASIS + '/cart', { cookie: cookie() });
      m.designZeile = m.html.includes('Design (front)'); m.zeileDa = m.html.includes(PROBE_TEXT);
    } catch (e) { return { ok: false, probleme: ['Ausnahme: ' + (e && e.message ? e.message : e)], nichtAusfuehrbar: true };
    } finally { try { await post('/cart/clear.js', {}); } catch { /* der Wegwerf-Warenkorb liegt nur in diesem Cookie-Glas */ } }
    const probleme = bewerteWarenkorb(m, phase);
    return { ok: !probleme.length, probleme, miniaturen: m.miniaturen, bytes: m.bytes };
  }
  async function warenkorbPruefen(phase, fehlerAusgabe = false) {
    if (!WARENKORB) return { ok: true, uebersprungen: true };
    const r = await warenkorbProbe(phase);
    (fehlerAusgabe ? console.error : console.log)(`  Warenkorb-Probe (${phase}): ${r.ok ? 'ok' : 'FEHLER ' + r.probleme.join(' | ')}${r.ok ? ` · ${r.miniaturen} Miniatur(en), ${r.bytes} Byte` : ''}`);
    return r;
  }
  if (WARENKORB) {
    if (!/^\d{5,20}$/.test(E.PRUEF_VARIANTE || '')) fail(1, 'PRUEF_WARENKORB=1 braucht PRUEF_VARIANTE=<numerische Shopify-Varianten-ID eines verkäuflichen Artikels>');
    if (!PRUEF_URL) fail(1, 'PRUEF_WARENKORB=1 mit VORSCHAU_CLOUD braucht PRUEF_VORSCHAU=<Adresse einer Vorschau in dieser Cloud>');
  }

  // ---------- Rückweg ----------
  let pfade = [], vorMessung = null;
  async function abbruch(code, grund) {
    console.error('ZURÜCKSCHREIBEN wegen:', grund);
    zustand.imRueckweg = true;
    let bestaetigt = false;
    for (let v = 1; v <= 3 && !bestaetigt; v++) {
      try {
        const cur = await lesen();
        if (!cur || cur.md5 !== MD5_VOR) {
          // Eine Datei, die weder der Ausgangsstand noch unser Soll ist, stammt von anderer Seite (oder Shopify hat sie umgeschrieben): vor dem Überschreiben festhalten
          if (cur && cur.content != null && cur.md5 !== md5Soll) { try { mkdirSync(HIER + 'sicherung', { recursive: true }); writeFileSync(HIER + 'sicherung/fremd-' + String(cur.md5).slice(0, 8) + '.vor', cur.content); console.error('  Stand vor dem Rückweg festgehalten: sicherung/fremd-' + String(cur.md5).slice(0, 8) + '.vor'); } catch { /* der Rückweg geht vor */ } }
          const u = await schreibe(sicherung);
          if (u.userErrors?.length) console.error('  Rückweg, Versuch ' + v + ': userErrors', JSON.stringify(u.userErrors));
        }
        const w = await warteBis(MD5_VOR, 150000);
        console.error(`  Rückweg, Versuch ${v}: Rücklesen ${w.ok ? 'GLEICH der Sicherung' : 'ABWEICHUNG (' + w.md5 + ')'}`);
        bestaetigt = w.ok;
      } catch (e) { console.error(`  Rückweg, Versuch ${v}: Ausnahme ${e && e.message ? e.message : e}`); await warte(5000); }
    }
    let seitenOk = null;
    if (bestaetigt && pfade.length) { try { seitenOk = auswerten(await messen(pfade), vorMessung, { err: true }); } catch (e) { console.error('  Seitenprüfung nach dem Rückweg: Ausnahme', e && e.message ? e.message : e); seitenOk = false; } }
    const gut = bestaetigt && seitenOk !== false;
    if (!bestaetigt) console.error(`RÜCKWEG NICHT BESTÄTIGT. Von Hand: ZURUECK=1 LIVE=1 FREMD_UEBERSCHREIBEN=1 node ${BEFEHL} — oder snippets/cart-products.liquid aus dropship/wp6-0611/theme/sicherung/${SICH_NAME} per themeFilesUpsert zurückschreiben und die Seiten prüfen.`);
    else if (!gut) console.error('Die Datei ist zurückgeschrieben und bestätigt, aber die Seiten sind auffällig: Seiten von Hand prüfen (die Ursache liegt vielleicht nicht bei diesem Paket).');
    process.exit(gut ? code : 9);
  }
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => {
    if (!zustand.geschrieben || zustand.fertig || zustand.imRueckweg) { console.error('Abbruch durch ' + s); process.exit(130); }
    abbruch(130, 'Signal ' + s + ' nach dem Schreiben').catch(() => process.exit(9));
  });

  // ---------- Live-Datei lesen ----------
  const jetzt = await lesen();
  if (!jetzt) fail(4, DATEI + ' fehlt im MAIN-Theme: nichts geschrieben');
  console.log(DATEI.padEnd(32), jetzt.md5, jetzt.size, 'Byte');
  if (!jetzt.md5) fail(4, 'Die API meldet keine Prüfsumme: nichts geschrieben');
  if (jetzt.content == null) fail(4, 'Inhalt der Datei nicht lesbar (oder passt nicht zur Prüfsumme): nichts geschrieben');

  // ---------- Rücknahme ----------
  if (ZURUECK) {
    const sollJetzt = merk ? merk.md5_soll : md5Soll;
    const z = jetzt.md5 === sollJetzt ? 'neu' : jetzt.md5 === MD5_VOR ? 'alt' : 'fremd';
    console.log('Zustand der Live-Datei:', z === 'neu' ? 'eingespielt (gleich dem Soll)' : z === 'alt' ? 'Ausgangsstand' : 'FREMD (weder Soll noch Ausgangsstand)');
    if (z === 'alt') { console.log('Die Datei ist schon im Ausgangsstand: nichts zu tun'); process.exit(0); }
    if (z === 'fremd' && !FREMD_OK) {
      console.error(`Die Live-Datei ist weder der eingespielte noch der Ausgangsstand (jemand hat sie nach dem Einspielen geändert, oder die neue Prüfsumme ist in der API noch nicht sichtbar): nichts zurückgenommen.\nBewusst trotzdem zurücknehmen (überschreibt die Datei roh mit der Sicherung): FREMD_UEBERSCHREIBEN=1 ZURUECK=1 LIVE=1 node ${BEFEHL}`);
      process.exit(3);
    }
    if (z === 'fremd') console.log('FREMD_UEBERSCHREIBEN=1: die Datei wird roh mit dem Ausgangsstand überschrieben; Änderungen von anderer Seite daran gehen verloren (Sicherung des Fremdstands: sicherung/fremd-' + jetzt.md5.slice(0, 8) + '.vor).');
    console.log('Rücknahme auf den Stand vor dem Paket');
    if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
    if (z === 'fremd') { mkdirSync(HIER + 'sicherung', { recursive: true }); writeFileSync(HIER + 'sicherung/fremd-' + jetzt.md5.slice(0, 8) + '.vor', jetzt.content); }
    const u = await schreibe(sicherung); console.log('upsert', JSON.stringify(u.upsertedThemeFiles || []));
    if (u.userErrors?.length) fail(5, 'userErrors: ' + JSON.stringify(u.userErrors));
    const w = await warteBis(MD5_VOR, 150000); console.log('rücklesen', w.ok ? 'GLEICH der Sicherung' : 'ABWEICHUNG ' + w.md5);
    if (!w.ok) fail(6, 'Die API meldet nach 150 s noch nicht die Prüfsumme der Sicherung. Rücknahme wiederholbar: gleicher Befehl noch einmal.');
    pfade = await pfadeWaehlen();
    const ok = auswerten(await messen(pfade), null);
    process.exit(ok ? 0 : 7);
  }

  // ---------- Einspielen ----------
  if (jetzt.md5 === md5Soll) fail(3, `Schon eingespielt (die Live-Datei ist gleich dem Soll). Rücknahme: ZURUECK=1 LIVE=1 node ${BEFEHL}`);
  if (jetzt.md5 !== MD5_VOR) {
    const spur = jetzt.content.includes(MARKE) ? ` Die Datei trägt die Marke ${MARKE}: ein Teil oder eine andere Fassung (z. B. andere Cloud) ist schon eingespielt; zuerst ZURUECK=1 LIVE=1 node ${BEFEHL}.` : '';
    fail(jetzt.content.includes(MARKE) ? 3 : 4, `${DATEI} weicht vom erwarteten Ausgangsstand ab (Live-md5 ${jetzt.md5}, erwartet ${MD5_VOR}): jemand hat sie geändert. Nichts geschrieben.${spur}${spur ? '' : ' Nach Durchsicht der fremden Änderung MD5_VOR in patches.mjs, sicherung/' + SICH_NAME + ' und die Tests auf den Live-Stand setzen.'}`);
  }
  console.log('Ausgangsstand: Prüfsumme GLEICH dem Abbild (MD5_VOR) — die Live-Datei ist unverändert seit der Messung');
  pfade = await pfadeWaehlen();
  if (!LIVE && !PRUEFEN && !WARENKORB) { console.log('Seiten:', pfade.join(', ')); console.log('Trockenlauf, nichts geschrieben (PRUEFEN=1 misst zusätzlich die Seiten)'); process.exit(0); }
  console.log('Ausgangswerte der Seiten:');
  vorMessung = await messen(pfade);
  const vorOk = auswerten(vorMessung, null, {});
  if (!vorOk && LIVE) fail(4, 'Schon VOR dem Eingriff fehlerhafte Seiten: nichts geschrieben (VORFEHLER_OK=1 nimmt bekannte Liquid-Fehler hin)');
  const vorWk = await warenkorbPruefen('vorher');
  if (!vorWk.ok && LIVE) fail(4, 'Die Warenkorb-Probe schon VOR dem Eingriff nicht in Ordnung: nichts geschrieben');
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(vorOk && vorWk.ok ? 0 : 4); }

  // Direkt vor dem Schreiben noch einmal lesen: themeFilesUpsert prüft nichts gegen den gelesenen Stand
  const nochmal = await lesen();
  if (!nochmal || nochmal.md5 !== jetzt.md5) fail(4, `${DATEI} hat sich seit dem Lesen am Anfang des Laufs geändert (jetzt ${nochmal ? nochmal.md5 : 'fehlt'}, gelesen ${jetzt.md5}): jemand hat gespeichert. Nichts geschrieben. Skript neu starten.`);
  mkdirSync(HIER + 'sicherung', { recursive: true });
  writeFileSync(MERKLISTE, JSON.stringify({ erstellt: new Date().toISOString(), datei: DATEI, md5_vor: MD5_VOR, md5_soll: md5Soll, cloud, hinweis: 'Merkliste der Rücknahme; Soll-Stand gleich anwenden(sicherung, {cloud})' }, null, 1) + '\n');

  try {
    zustand.geschrieben = true;   // vor dem Aufruf: ein Signal mitten im Schreiben soll den Rückweg auslösen
    const u = await schreibe(neu); console.log('upsert', JSON.stringify(u.upsertedThemeFiles || []));
    if (u.userErrors?.length) await abbruch(5, 'userErrors beim Schreiben: ' + JSON.stringify(u.userErrors));
    const w = await warteBis(md5Soll, 150000);
    console.log('rücklesen', w.ok ? 'GLEICH dem Soll' : 'ABWEICHUNG ' + w.md5);
    if (!w.ok) await abbruch(6, 'Rücklesen weicht ab (Live-md5 ' + w.md5 + ', Soll ' + md5Soll + ')');
    console.log('Seiten nach dem Einspielen:');
    let ok = true;
    for (let runde = 1; runde <= RUNDEN; runde++) { if (runde > 1) await warte(30000); console.log(`  Runde ${runde}`); ok = auswerten(await messen(pfade), vorMessung, {}) && ok; }
    if (!ok) await abbruch(7, 'Seitenprüfung nach dem Einspielen fehlgeschlagen');
    const nachWk = await warenkorbPruefen('nachher', true);
    if (!nachWk.ok) await abbruch(7, 'Warenkorb-Probe nach dem Einspielen fehlgeschlagen');
  } catch (e) {
    await abbruch(8, 'Ausnahme: ' + (e && e.message ? e.message : e));
  }
  zustand.fertig = true;
  console.log(`\nFERTIG: ${DATEI} eingespielt (md5 ${md5Soll}). Rücknahme: ZURUECK=1 LIVE=1 node ${BEFEHL}`);
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) haupt().catch((e) => { console.error('Unerwartete Ausnahme:', e && e.stack ? e.stack : e); process.exit(zustand.geschrieben && !zustand.fertig ? 8 : 1); });
