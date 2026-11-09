// Spielt den neuen Lieferblock «lux_delivery» (Verfügbarkeit je Ausführung, ehrliche Bestandsanzeige) ins MAIN-Theme: templates/product.json.
// Trockenlauf ist Vorgabe. Der Blocktext liegt in lux_delivery.neu.liquid und wird erst zur Laufzeit gelesen.
//
//   Trockenlauf:         node dropship/lagerbestand-0511/apply_theme.mjs               (Diff-Statistik, schreibt nichts; PRUEFEN=1 misst zusätzlich die Seiten)
//   Testvorlage anlegen: TESTVORLAGE=1 LIVE=1 node dropship/lagerbestand-0511/apply_theme.mjs
//                        legt templates/product.lxtest.json an (= aktuelle product.json mit dem neuen Block plus Testmarke); jede Produktseite zeigt sie
//                        mit ?view=lxtest. Die echte Produktseite bleibt unberührt.
//   Testvorlage löschen: TESTVORLAGE_WEG=1 LIVE=1 node dropship/lagerbestand-0511/apply_theme.mjs
//   Einspielen:          LIVE=1 node dropship/lagerbestand-0511/apply_theme.mjs
//   Rücknahme:           ZURUECK=1 LIVE=1 node dropship/lagerbestand-0511/apply_theme.mjs
//
// Was geändert wird: NUR der Wert der Einstellung custom_liquid des Blocks sections/main/blocks/product-details/blocks/lux_delivery. Der Wert wird im Dateitext
// ersetzt (JSON.stringify(alter Text) -> JSON.stringify(neuer Text), genau ein Treffer), die Datei wird nicht geparst und neu geschrieben: Kommentar am
// Dateianfang, Einrückung und Reihenfolge bleiben ausserhalb dieses einen JSON-Strings Byte für Byte gleich. Die Ersetzung wird vor dem Schreiben
// dreifach geprüft (Anfang und Ende der Datei unverändert, Block gleich dem neuen Text, alle übrigen Werte gleich).
//
// Ausgangsstand doppelt abgesichert: (1) MD5 der ganzen Datei gleich MD5_VOR, (2) der Blocktext in der Datei gleich lux_delivery.alt.liquid (diese Datei
// ist wiederum gegen ALT_MD5 gesichert). Weicht eines ab: Abbruch ohne Schreiben, ausser FREMD_UEBERSCHREIBEN=1 (ersetzt dann den Blocktext, der live steht,
// die Sicherung ist dann der tatsächliche Live-Stand).
//
// Einspielen im Ablauf: Eingaben prüfen -> Seiten messen (Startseite + Produktseiten; Ausgangswerte merken) -> Sicherung (sicherung/product.json.vor) ablegen
// -> templates/product.json NOCHMAL lesen (hat der Theme-Editor sie während der Messung gespeichert: Abbruch, Exit 4, nichts geschrieben; themeFilesUpsert prüft das nicht)
// -> Merkliste (sicherung/eingespielt.json) ablegen -> schreiben -> warten, bis die API-Prüfsumme gleich dem Soll ist (höchstens 150 s) -> Seiten erneut
// messen (zwei Runden): HTTP 200, kein NEUER «Liquid error», der Lieferblock rendert wie vorher. Bei JEDEM Fehler nach dem ersten Schreiben (Rücklesen
// weicht ab, Seitenprüfung, Ausnahme, SIGINT/SIGTERM) schreibt das Skript die Sicherung selbst zurück, wartet auf die Prüfsumme und misst die Seiten.
// Rückweg bei einer Seite mit HTTP 500: derselbe, er braucht nur die Admin-API, nicht die Storefront. Misslingt auch das, steht der Befehl für den
// Rückweg von Hand in der Meldung: ZURUECK=1 LIVE=1 node dropship/lagerbestand-0511/apply_theme.mjs (liest je Datei neu den Zustand, wiederholbar).
//
// Grenze (nicht messbar): ob die Storefront schon den NEUEN Block ausliefert, lässt sich an gewöhnlichen Seiten nicht erkennen (Alt und Neu rendern gleich,
// solange keine Ausführung ausverkauft ist; bei ausverkaufter Ausführung lässt der neue Block die Lieferbox absichtlich weg, die Seitenprüfung nimmt den Wechsel
// box -> aus dann hin, wenn «ausverkauft» schon vorher auf der Seite stand). Das macht nur die Testvorlage sichtbar (Testmarke im Quelltext): erst TESTVORLAGE=1 LIVE=1, dann LIVE=1.
//
// Exit: 0 ok · 1 kein Token / fehlende Variablen / ungültiger Aufruf / unerwartete Ausnahme VOR dem Schreiben
//       3 schon eingespielt / Rücknahme nicht möglich (fremder Stand)
//       4 Ausgangsstand, Sicherung oder Eingabedatei weicht ab (auch: Seiten schon vor dem Eingriff fehlerhaft; Vorlage zwischen Lesen und Schreiben geändert)
//       5 Block nicht eindeutig im Dateitext auffindbar (Maskierung) oder userErrors beim Schreiben; nichts geschrieben
//       6 Rücklesen weicht ab (bei LIVE: zurückgeschrieben und bestätigt) · 7 Seitenprüfung fehlgeschlagen (bei LIVE: zurückgeschrieben und bestätigt)
//       8 Ausnahme nach Beginn des Schreibens (bei LIVE: zurückgeschrieben und bestätigt)
//       9 RÜCKWEG NICHT BESTÄTIGT: Datei oder Seiten von Hand prüfen · 130 Abbruch durch Signal (bei LIVE: zurückgeschrieben und bestätigt)
// APPLY_ZEIT=0.001 verkürzt alle Wartezeiten (nur für den Test mit der Attrappe der Theme-API).
// Weitere Schalter: STOREFRONT (Vorgabe https://luxestyle.ch), PRUEF_PRODUKTE (Handles, Komma getrennt; sonst je ein Fortura-, CJ- und beliebiges
// aktives Produkt), PRUEF_RUNDEN (Vorgabe 2), VORFEHLER_OK=1 (Liquid-Fehler, die schon VOR dem Eingriff auf den Seiten stehen, hinnehmen).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { normalizeShopifyHost } from '../../automation/lib/shopify_host.mjs';

export const DATEI = 'templates/product.json';
export const TESTDATEI = 'templates/product.lxtest.json';
export const MD5_VOR = '2139c46547040628779150957739a93e';   // templates/product.json, frisch aus MAIN gelesen 05.11.2026 07:16 UTC
export const ALT_MD5 = 'bab63e37a934b75accd53a31e5d14c86';   // lux_delivery.alt.liquid = bisheriger Blocktext
export const BLOCK = ['sections', 'main', 'blocks', 'product-details', 'blocks', 'lux_delivery'];
export const SCHLUESSEL = 'custom_liquid';
export const TESTMARKE = '<!--lxtest-lagerbestand-0511-->';
export const MAX_BYTE = 250000;                              // Sicherheitsgrenze für die Vorlagendatei
const SICH_NAME = /^product\.json\.vor(-[0-9a-f]{8})?$/;

export const md5 = (s) => createHash('md5').update(s).digest('hex');
const fehler = (code, text) => Object.assign(new Error(text), { code });

// ---------- reine Funktionen (ohne Netz, getestet) ----------
// Länge des Kommentars am Dateianfang (Shopify schreibt «/* ... */» vor das JSON)
export function jsonStart(text) { const m = /^\s*\/\*[\s\S]*?\*\/\s*/.exec(text); return m ? m[0].length : 0; }
export function parseVorlage(text) { return JSON.parse(text.slice(jsonStart(text))); }
// Blocktext aus einem bereits GEPARSTEN Objekt (nur Lesen; geschrieben wird nie aus dem geparsten Objekt)
export function blockAusObjekt(obj) {
  let o = obj;
  for (const k of BLOCK) { o = o && typeof o === 'object' ? o[k] : undefined; if (o == null) throw fehler(4, 'Block fehlt in der Vorlage: ' + BLOCK.join('/')); }
  if (o.type !== 'custom-liquid') throw fehler(4, 'Der Block ist kein custom-liquid, sondern ' + JSON.stringify(o.type));
  const w = o.settings && o.settings[SCHLUESSEL];
  if (typeof w !== 'string') throw fehler(4, 'Die Einstellung ' + SCHLUESSEL + ' des Blocks ist kein Text');
  return w;
}
export const blockWert = (text) => blockAusObjekt(parseVorlage(text));

// Grobe Liquid-Prüfung gegen abgeschnittene oder halb geschriebene Blockdateien: Klammerpaare und Tag-Paare
const OEFFNER = new Set(['if', 'unless', 'case', 'for', 'capture', 'comment', 'raw', 'tablerow', 'form', 'paginate', 'style', 'javascript', 'schema', 'stylesheet']);
export function liquidBalance(text) {
  const zaehle = (re) => (text.match(re) || []).length;
  if (zaehle(/\{%/g) !== zaehle(/%\}/g)) return { ok: false, grund: `{% und %} nicht paarig (${zaehle(/\{%/g)} gegen ${zaehle(/%\}/g)})` };
  if (zaehle(/\{\{/g) !== zaehle(/\}\}/g)) return { ok: false, grund: `{{ und }} nicht paarig (${zaehle(/\{\{/g)} gegen ${zaehle(/\}\}/g)})` };
  if (/\{%-?\s*liquid\b/.test(text)) return { ok: false, grund: 'Tag «liquid» wird von dieser Prüfung nicht verstanden' };
  const stapel = [], re = /\{%-?\s*([a-z_]+)/g; let m;
  while ((m = re.exec(text))) {
    const tag = m[1], innen = stapel[stapel.length - 1];
    if (innen === 'comment' || innen === 'raw') { if (tag === 'end' + innen) stapel.pop(); else if (innen === 'comment' && tag === 'comment') stapel.push('comment'); continue; }
    if (OEFFNER.has(tag)) stapel.push(tag);
    else if (tag.startsWith('end') && tag.length > 3) { const offen = stapel.pop(); if (offen !== tag.slice(3)) return { ok: false, grund: `«${tag}» schliesst «${offen ?? 'nichts'}»` }; }
  }
  return stapel.length ? { ok: false, grund: 'nicht geschlossen: ' + stapel.join(', ') } : { ok: true, grund: '' };
}
// Probleme der neuen Blockdatei (leer = in Ordnung)
export function pruefeNeu(neu) {
  const p = [];
  if (typeof neu !== 'string' || !neu.trim()) return ['Blockdatei ist leer'];
  if (neu.includes('\uFFFD')) p.push('enthält ein ungültiges Zeichen (U+FFFD: abgeschnittenes oder falsch kodiertes Zeichen, vielleicht wird die Datei gerade geschrieben)');
  if (typeof neu.isWellFormed === 'function' && !neu.isWellFormed()) p.push('enthält ein einzelnes Surrogat-Zeichen');
  if (neu.includes('\u0000')) p.push('enthält NUL');
  if (neu.includes('\uFEFF')) p.push('enthält U+FEFF (Byte-Order-Mark, unsichtbar: würde in die Seite geschrieben)');
  if (Buffer.byteLength(neu) > 120000) p.push('ist über 120 KB gross');
  const b = liquidBalance(neu); if (!b.ok) p.push('Liquid unplausibel: ' + b.grund);
  return p;
}
// Ersetzt den JSON-String des alten Blocktexts im Dateitext durch den des neuen. Kein String.replace (die Ersatzmuster «$&», «$'» würden wirken).
export function ersetzen(text, altWert, neuWert) {
  const alt = JSON.stringify(altWert), treffer = [];
  for (let p = text.indexOf(alt); p >= 0; p = text.indexOf(alt, p + 1)) treffer.push(p);
  if (treffer.length !== 1) {
    let hinweis = '';
    if (!treffer.length) {
      const varianten = {
        '<, >, &, \' als \\uXXXX': alt.replace(/[<>&']/g, (c) => '\\u00' + c.charCodeAt(0).toString(16).padStart(2, '0')),
        '/ als \\/': alt.replace(/\//g, '\\/'),
        'Nicht-ASCII als \\uXXXX': alt.replace(/[^\u0000-\u007f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')),
      };
      const gef = Object.entries(varianten).filter(([, v]) => v !== alt && text.includes(v)).map(([k]) => k);
      hinweis = gef.length ? ` Der Text kommt in anderer Maskierung vor (${gef.join('; ')}).` : '';
    }
    throw fehler(5, `JSON.stringify(alter Blocktext) kommt ${treffer.length}× im Dateitext vor (erwartet genau 1).${hinweis} Mögliche Ursachen: Shopify maskiert Zeichen anders, der Block wurde im Editor geändert, oder der Text steht mehrfach in der Datei. Nichts geschrieben.`);
  }
  const i = treffer[0], davor = text.slice(Math.max(0, i - 60), i), danach = text.slice(i + alt.length);
  if (!new RegExp('"' + SCHLUESSEL + '"\\s*:\\s*$').test(davor)) throw fehler(5, `Der Treffer steht nicht als Wert von «${SCHLUESSEL}» (davor: ${JSON.stringify(davor.slice(-40))}). Nichts geschrieben.`);
  if (!/^\s*[,}]/.test(danach)) throw fehler(5, `Nach dem Treffer folgt kein Ende des Wertes (danach: ${JSON.stringify(danach.slice(0, 20))}). Nichts geschrieben.`);
  const neuStr = JSON.stringify(neuWert), neuText = text.slice(0, i) + neuStr + danach;
  // Gegenprobe 1: ausserhalb des einen Strings Byte für Byte gleich
  if (!neuText.startsWith(text.slice(0, i)) || !neuText.endsWith(danach) || neuText.length !== i + neuStr.length + danach.length || neuText.slice(i, i + neuStr.length) !== neuStr)
    throw fehler(5, 'Gegenprobe Byte-Vergleich ausserhalb des Strings fehlgeschlagen. Nichts geschrieben.');
  // Gegenprobe 2: der Block der neuen Datei trägt den neuen Text; alle übrigen Werte sind gleich (Reihenfolge der Schlüssel eingeschlossen)
  const vorher = parseVorlage(text), nachher = parseVorlage(neuText);
  if (blockAusObjekt(nachher) !== neuWert) throw fehler(5, 'Gegenprobe: der Block der neuen Datei trägt nicht den neuen Text. Nichts geschrieben.');
  let o = vorher; for (const k of BLOCK) o = o[k]; o.settings[SCHLUESSEL] = neuWert;
  if (JSON.stringify(vorher) !== JSON.stringify(nachher)) throw fehler(5, 'Gegenprobe: ausser dem Blocktext hat sich noch etwas geändert. Nichts geschrieben.');
  return { text: neuText, index: i, altLaenge: alt.length, neuLaenge: neuStr.length, davorByte: Buffer.byteLength(text.slice(0, i)), danachByte: Buffer.byteLength(danach) };
}
// Zeilenvergleich für die Diff-Statistik
export function diffStat(a, b) {
  const A = a.split('\n'), B = b.split('\n'); let p = 0, s = 0;
  while (p < A.length && p < B.length && A[p] === B[p]) p++;
  while (s < A.length - p && s < B.length - p && A[A.length - 1 - s] === B[B.length - 1 - s]) s++;
  return { zeilenAlt: A.length, zeilenNeu: B.length, gleichAnfang: p, gleichEnde: s, entfernt: A.length - p - s, hinzu: B.length - p - s };
}
export const sicherungsName = (md5vor) => (md5vor === MD5_VOR ? 'product.json.vor' : 'product.json.vor-' + md5vor.slice(0, 8));

// Seitenauswertung: Liquid-Fehler, Zustand des Lieferblocks, Testmarke
const LIEFERBOX = /Lieferung voraussichtlich|Lieferung nach Liechtenstein/, AUSVERKAUFT = /Momentan ausverkauft|Diese Ausführung ist ausverkauft/;
// Der neue Block setzt bei ausverkaufter Ausführung einen VERSTECKTEN Satz mit «Lieferung voraussichtlich: erst wieder …» (unterdrückt das Fallback-Datum aus meta-tags.liquid).
// Er ist keine Lieferbox: ohne diesen Abzug gälte jede ausverkaufte Seite als «box», und der Alarm «kaufbar -> ausverkauft» in bewerte() bliebe stumm (Prüferfund 05.11.).
const KEIN_TERMIN_SPAN = /<span\b[^>]*\bdata-lx-kein-liefertermin\b[^>]*>[\s\S]*?<\/span>/g;
export function analysiereSeite(rohtext) {
  const text = rohtext.replace(KEIN_TERMIN_SPAN, '');
  return {
    fehler: [...new Set(text.match(/Liquid (?:syntax )?error[^<\n]{0,160}/gi) || [])],
    art: LIEFERBOX.test(text) ? 'box' : AUSVERKAUFT.test(text) ? 'aus' : 'kein',
    ausverk: AUSVERKAUFT.test(text),   // unabhängig von der Lieferbox: steht irgendwo «ausverkauft»?
    marke: text.includes(TESTMARKE),
  };
}
// Probleme einer Seitenmessung m gegenüber den Ausgangswerten vor (oder, ohne vor, absolut)
export function bewerte(m, vor, opt = {}) {
  const p = [];
  if (m.status !== 200) p.push(m.netz || `HTTP ${m.status}`);
  const bekannt = vor ? vor.fehler : (opt.vorfehlerOk ? m.fehler : []);
  const neue = m.fehler.filter((f) => !bekannt.includes(f));
  if (neue.length) p.push('Liquid-Fehler: ' + neue[0]);
  // Ausnahme (Prüferfund 05.11.): Der alte Block zeigt die Lieferbox auch bei ausverkaufter Ausführung, der neue absichtlich nicht («KEINE Lieferbox»).
  // Stand schon vorher «ausverkauft» (z. B. das erste Fortura-Produkt, 718 sind ausverkauft) und steht es nachher noch da, ist der Wechsel box -> aus gewollt.
  if (vor && vor.art !== 'kein' && m.art !== vor.art && !(vor.ausverk && m.ausverk)) p.push(`Lieferblock zeigt «${m.art}» statt «${vor.art}»`);
  if (opt.marke && !m.marke) p.push('Testmarke fehlt (Testvorlage nicht ausgeliefert?)');
  return p;
}

// ---------- Ablauf ----------
const zustand = { geschrieben: false, fertig: false, imRueckweg: false, signal: false };
const fail = (code, text) => { console.error(text); process.exit(code); };

async function haupt() {
  const E = process.env;
  const LIVE = E.LIVE === '1', ZURUECK = E.ZURUECK === '1', TEST = E.TESTVORLAGE === '1', WEG = E.TESTVORLAGE_WEG === '1';
  const FREMD_OK = E.FREMD_UEBERSCHREIBEN === '1', VORFEHLER_OK = E.VORFEHLER_OK === '1', PRUEFEN = E.PRUEFEN === '1';
  const ZEIT = Number(E.APPLY_ZEIT ?? 1) > 0 ? Number(E.APPLY_ZEIT ?? 1) : 1;
  const RUNDEN = Math.max(1, Math.min(5, Number(E.PRUEF_RUNDEN ?? 2) || 2));
  const HIER = fileURLToPath(new URL('.', import.meta.url));
  const ALT_QUELLE = HIER + 'lux_delivery.alt.liquid', NEU_QUELLE = HIER + 'lux_delivery.neu.liquid';
  const MERKLISTE = HIER + 'sicherung/eingespielt.json';
  const warte = (ms) => new Promise((r) => setTimeout(r, ms * ZEIT));
  // Mit der Testuhr (APPLY_ZEIT < 1) werden nur die Wartezeiten gestaucht, nicht die echte Arbeit: aus 150 s Frist würden 150 ms, und ein Ruckeln des
  // Rechners liesse eine nur verzögerte Auslieferung als «nie erschienen» gelten (CI 09.11.: Exit 7 bei «verzögerter Auslieferung»). Darum zählt die
  // Frist dort zusätzlich in Versuchen (Frist durch den 10-s-Takt); mit der echten Uhr (ZEIT = 1) gilt allein die Zeit, wie bisher.
  const fristAbgelaufen = (t0, maxMs, versuche) => Date.now() - t0 > maxMs * ZEIT && (ZEIT >= 1 || versuche >= Math.ceil(maxMs / 10000));
  const BEFEHL = 'ZURUECK=1 LIVE=1 node dropship/lagerbestand-0511/apply_theme.mjs';

  if ([ZURUECK, TEST, WEG].filter(Boolean).length > 1) fail(1, 'Ungültiger Aufruf: ZURUECK, TESTVORLAGE und TESTVORLAGE_WEG schliessen sich aus.');
  const modus = ZURUECK ? 'Rücknahme' : TEST ? 'Testvorlage anlegen' : WEG ? 'Testvorlage löschen' : 'Einspielen';
  console.log(`Modus: ${modus} · ${LIVE ? 'LIVE' : 'Trockenlauf'}`);

  const lies = (pfad) => readFileSync(pfad, 'utf8');
  function eingabe(pfad, name) {
    if (!existsSync(pfad)) fail(4, `${name} fehlt: ${pfad}`);
    return lies(pfad);
  }
  // Alter Blocktext (Referenz) und neuer Blocktext; der neue erst jetzt, zur Laufzeit
  let altRef = null, neu = null;
  if (!WEG) {
    altRef = eingabe(ALT_QUELLE, 'Referenz des alten Blocktexts (lux_delivery.alt.liquid)');
    if (md5(altRef) !== ALT_MD5) fail(4, `lux_delivery.alt.liquid weicht von ALT_MD5 ab (${md5(altRef)}): nichts geschrieben`);
  }
  const brauchtNeu = !WEG && (!ZURUECK || !existsSync(MERKLISTE));
  if (brauchtNeu) {
    neu = eingabe(NEU_QUELLE, 'Neuer Blocktext (lux_delivery.neu.liquid)');
    const probleme = pruefeNeu(neu);
    if (probleme.length) fail(4, 'Neuer Blocktext unbrauchbar: ' + probleme.join(' · ') + '. Nichts geschrieben.');
    console.log(`Neuer Blocktext: ${neu.length} Zeichen · ${Buffer.byteLength(neu)} Byte · md5 ${md5(neu)}`);
  }

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

  // Dateien lesen: {name: {md5, size, content}}; der Inhalt kommt je nach Grösse als Text oder als URL, verglichen wird die Prüfsumme der API
  async function lesen(namen) {
    const nodes = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:10){nodes{filename size checksumMd5 body{__typename ... on OnlineStoreThemeFileBodyText{content} ... on OnlineStoreThemeFileBodyUrl{url}}}}}}`, { id: th.id, f: namen })).theme.files.nodes;
    const out = {};
    for (const n of nodes) {
      let content = n.body?.__typename === 'OnlineStoreThemeFileBodyText' ? n.body.content : null;
      if (content == null && n.body?.url) { const r2 = await fetch(n.body.url); if (r2.ok) content = await r2.text(); }
      if (content != null && n.checksumMd5 && md5(content) !== n.checksumMd5) content = null;   // Inhalt passt nicht zur Prüfsumme: nicht verwenden
      out[n.filename] = { md5: n.checksumMd5, size: n.size, content };
    }
    return out;
  }
  const schreibe = async (name, text) => (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: [{ filename: name, body: { type: 'TEXT', value: text } }] })).themeFilesUpsert;
  const loesche = async (name) => (await q(`mutation($id:ID!,$f:[String!]!){themeFilesDelete(themeId:$id,files:$f){deletedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, f: [name] })).themeFilesDelete;
  // Wartet, bis die API die erwartete Prüfsumme meldet (soll === null: bis die Datei fehlt). Rücklesen kann eine Minute alt sein.
  async function warteBis(name, soll, maxMs) {
    const t0 = Date.now(); let letzter; let versuche = 0;
    for (;;) {
      const nach = (await lesen([name]))[name]; versuche++;
      letzter = nach ? nach.md5 : null;
      if (soll === null ? !nach : letzter === soll) return { ok: true, md5: letzter };
      if (fristAbgelaufen(t0, maxMs, versuche)) return { ok: false, md5: letzter };
      await warte(10000);
    }
  }

  // Direkt vor dem ersten Schreiben noch einmal lesen (Prüferfund 05.11.): themeFilesUpsert prüft nichts gegen den Stand, den wir gelesen haben, und der
  // Theme-Editor schreibt templates/product.json bei jedem Speichern komplett neu. Zwischen dem Lesen am Anfang und dem Schreiben liegen die Auswahl der
  // Prüfseiten und die erste Seitenmessung (Sekunden, bei Drosselung über eine Minute). Gibt null zurück, wenn die Datei noch gleich ist, sonst die neue Prüfsumme.
  async function veraendertSeit(name, md5Gelesen) {
    const n = (await lesen([name]))[name];
    return n && n.md5 === md5Gelesen ? null : (n ? n.md5 || 'ohne Prüfsumme' : 'Datei fehlt');
  }
  const SEIT_TEXT = (name, gelesen, jetztMd5) => `${name} hat sich seit dem Lesen am Anfang des Laufs geändert (Prüfsumme ${jetztMd5}, gelesen ${gelesen}): jemand hat die Vorlage gespeichert (Theme-Editor?). Nichts geschrieben. Skript neu starten.`;

  // ---------- Seitenprüfung ----------
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  const BASIS = (E.STOREFRONT || 'https://luxestyle.ch').replace(/\/+$/, '');
  async function seite(url) {
    let netz = '', status = 0;
    for (let v = 0; v < 3; v++) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de-CH,de;q=0.9', 'Accept-Encoding': 'identity' }, signal: AbortSignal.timeout(Math.max(1000, 60000 * ZEIT)) });
        status = res.status;
        if (status === 429) { netz = 'HTTP 429 (Drosselung)'; await warte(65000); continue; }
        const t = await res.text();
        return { status, bytes: Buffer.byteLength(t), ...analysiereSeite(t) };
      } catch (e) { netz = 'Netzfehler: ' + (e && e.message ? e.message : e); status = 0; await warte(5000); }
    }
    return { status, bytes: 0, fehler: [], art: 'kein', ausverk: false, marke: false, netz };
  }
  async function pfadeWaehlen() {
    let handles = (E.PRUEF_PRODUKTE || '').split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9][a-z0-9-]*$/.test(s));
    if (!handles.length) {
      const d = await q(`{ f: products(first: 1, query: "status:active tag:fortura") { nodes { handle } } c: products(first: 1, query: "status:active tag:cj-real") { nodes { handle } } a: products(first: 1, query: "status:active") { nodes { handle } } }`);
      handles = [...new Set([d.f, d.c, d.a].flatMap((x) => (x?.nodes || []).map((n) => n.handle)))].filter((s) => /^[a-z0-9][a-z0-9-]*$/.test(s));
    }
    if (!handles.length) handles = ['plusch-hochlandrind-fga59641'];
    return ['/', ...handles.map((h) => '/products/' + h)];
  }
  async function messen(pfade, view = '') {
    const aus = [];
    for (const p of pfade) {
      const url = BASIS + p + (view && p.startsWith('/products/') ? '?view=' + view : '');
      aus.push({ pfad: p, ...(await seite(url)) });
      await warte(3000);
    }
    return aus;
  }
  // Bewertet eine Messung gegen die Ausgangsmessung vor (oder absolut); druckt je Seite eine Zeile
  function auswerten(messung, vor, opt = {}) {
    let ok = true;
    for (const m of messung) {
      const p = bewerte(m, vor ? vor.find((v) => v.pfad === m.pfad) : null, opt);
      if (p.length) ok = false;
      (opt.err ? console.error : console.log)((p.length ? '  FEHLER ' : '  ok     ') + m.pfad.padEnd(60) + ' ' + `HTTP ${m.status} · ${m.bytes} Byte · Lieferblock ${m.art}${m.marke ? ' · Testmarke' : ''}${m.fehler.length ? ' · LIQUID-FEHLER' : ''}${p.length ? ' · ' + p.join(' | ') : ''}`);
    }
    return ok;
  }
  const hatBlock = (messung) => messung.some((m) => m.pfad.startsWith('/products/') && m.art !== 'kein');

  // ---------- Live-Datei lesen ----------
  const jetztAlle = await lesen([DATEI, TESTDATEI]);

  // ---------- Testvorlage löschen ----------
  if (WEG) {
    if (!jetztAlle[TESTDATEI]) { console.log(TESTDATEI, 'ist nicht vorhanden: nichts zu tun'); process.exit(0); }
    console.log(TESTDATEI, 'vorhanden,', jetztAlle[TESTDATEI].size, 'Byte · md5', jetztAlle[TESTDATEI].md5);
    if (!LIVE) { console.log('Trockenlauf, nichts gelöscht'); process.exit(0); }
    const d = await loesche(TESTDATEI);
    console.log('themeFilesDelete', JSON.stringify(d.deletedThemeFiles));
    if (d.userErrors?.length) fail(5, 'userErrors: ' + JSON.stringify(d.userErrors));
    const w = await warteBis(TESTDATEI, null, 150000);
    console.log('rücklesen', w.ok ? 'GELÖSCHT' : 'DATEI NOCH DA');
    process.exit(w.ok ? 0 : 6);
  }

  const jetzt = jetztAlle[DATEI];
  if (!jetzt) fail(4, DATEI + ' fehlt im MAIN-Theme: nichts geschrieben');
  console.log(DATEI.padEnd(26), jetzt.md5, jetzt.size, 'Byte');
  if (!jetzt.md5) fail(4, 'Die API meldet keine Prüfsumme: nichts geschrieben');
  if (jetzt.content == null) fail(4, 'Inhalt der Datei nicht lesbar (oder passt nicht zur Prüfsumme): nichts geschrieben');

  function ladeMerkliste() {
    if (!existsSync(MERKLISTE)) return null;
    let m; try { m = JSON.parse(lies(MERKLISTE)); } catch { fail(4, 'Merkliste unlesbar: ' + MERKLISTE); }
    if (!/^[0-9a-f]{32}$/.test(m.md5_vor || '') || !/^[0-9a-f]{32}$/.test(m.md5_soll || '') || !SICH_NAME.test(m.sicherung || '')) fail(4, 'Merkliste unvollständig oder ungültig: ' + MERKLISTE);
    return m;
  }
  function ladeSicherung(name, md5vor) {
    const pfad = HIER + 'sicherung/' + name;
    if (!existsSync(pfad)) return null;
    const t = lies(pfad);
    if (md5(t) !== md5vor) fail(4, `Sicherung ${name} weicht vom erwarteten Ausgangsstand ab (md5 ${md5(t)}, erwartet ${md5vor}): nichts geschrieben`);
    return t;
  }

  // ---------- Rückweg: Sicherung zurückschreiben, Prüfsumme abwarten, Seiten messen ----------
  async function rueckweg(grund, sicherung, md5vor, vorMessung, pfade) {
    zustand.imRueckweg = true;
    console.error('RÜCKWEG wegen:', grund);
    let bestaetigt = false;
    for (let v = 1; v <= 3 && !bestaetigt; v++) {
      try {
        const u = await schreibe(DATEI, sicherung);
        console.error(`upsert Sicherung (Versuch ${v}):`, JSON.stringify(u));
        if (u.userErrors?.length) { console.error('userErrors beim Rückweg:', JSON.stringify(u.userErrors)); await warte(10000); continue; }
        const w = await warteBis(DATEI, md5vor, 150000);
        console.error('rücklesen Sicherung:', w.ok ? 'GLEICH' : 'ABWEICHUNG ' + w.md5);
        bestaetigt = w.ok;
      } catch (e) { console.error(`Ausnahme im Rückweg (Versuch ${v}):`, e && e.message ? e.message : e); await warte(10000); }
    }
    let seitenOk = null;
    if (bestaetigt && pfade) {
      for (let v = 0; v < 3 && seitenOk !== true; v++) {
        try { console.error('Seiten nach dem Rückweg:'); const m = await messen(pfade); seitenOk = auswerten(m, vorMessung, { vorfehlerOk: VORFEHLER_OK, err: true }); } catch (e) { console.error('Ausnahme bei der Seitenmessung:', e && e.message ? e.message : e); seitenOk = false; }
        if (seitenOk !== true) await warte(60000);
      }
    }
    const gut = bestaetigt && seitenOk !== false;
    if (!gut) {
      console.error('!!! RÜCKWEG NICHT BESTÄTIGT. Von Hand: ' + BEFEHL + '  (wiederholbar). Notfalls die Datei sicherung/' + sicherungsName(md5vor) + ' per themeFilesUpsert nach ' + DATEI + ' schreiben.');
    } else console.error('Rückweg bestätigt: ' + DATEI + ' trägt wieder den Ausgangsstand (md5 ' + md5vor + ')' + (seitenOk ? ', Seiten in Ordnung' : ''));
    zustand.imRueckweg = false;
    return gut;
  }

  // ---------- Rücknahme ----------
  if (ZURUECK) {
    const merk = ladeMerkliste();
    const sichN = merk ? merk.sicherung : 'product.json.vor', md5vor = merk ? merk.md5_vor : MD5_VOR;
    const sicherung = ladeSicherung(sichN, md5vor);
    if (sicherung == null) fail(4, `Sicherung fehlt: ${HIER}sicherung/${sichN}`);
    let md5soll;
    if (merk) md5soll = merk.md5_soll;
    else {
      const e = ersetzen(sicherung, blockWert(sicherung), neu);   // ohne Merkliste: Soll-Stand aus Sicherung und Blockdatei neu rechnen
      md5soll = md5(e.text);
    }
    const z = jetzt.md5 === md5soll ? 'neu' : jetzt.md5 === md5vor ? 'alt' : 'fremd';
    console.log('zustand', DATEI.padEnd(26), z, '| Live', jetzt.md5, '| Soll', md5soll, '| Ausgangsstand', md5vor);
    if (z === 'alt') { console.log('Schon im Ausgangsstand: nichts zu tun'); process.exit(0); }
    if (z === 'fremd' && !FREMD_OK) {
      console.error('Die Datei ist weder im eingespielten noch im Ausgangsstand (verändert, oder die neue Prüfsumme ist in der API noch nicht sichtbar): nichts zurückgenommen.');
      console.error('Bewusst trotzdem zurücknehmen: FREMD_UEBERSCHREIBEN=1 ' + BEFEHL);
      process.exit(3);
    }
    if (z === 'fremd') console.log('FREMD_UEBERSCHREIBEN=1: die Datei wird mit der Sicherung überschrieben (Live-MD5 ' + jetzt.md5 + ')');
    console.log('Rücknahme auf den Stand vor dem Eingriff (md5 ' + md5vor + ')');
    if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
    zustand.geschrieben = true;
    try {
      const u = await schreibe(DATEI, sicherung);
      console.log('upsert', JSON.stringify(u.upsertedThemeFiles));
      if (u.userErrors?.length) fail(5, 'userErrors: ' + JSON.stringify(u.userErrors));
      const w = await warteBis(DATEI, md5vor, 150000);
      console.log('rücklesen', w.ok ? 'GLEICH' : 'ABWEICHUNG ' + w.md5);
      if (!w.ok) process.exit(6);
      const pfade = await pfadeWaehlen(); let ok = false;
      for (let v = 0; v < 3 && !ok; v++) { if (v) await warte(60000); console.log('Seiten nach der Rücknahme:'); ok = auswerten(await messen(pfade), null, { vorfehlerOk: VORFEHLER_OK }); }
      if (!ok) { console.error('Die Datei ist zurückgeschrieben, aber die Seiten sind nicht in Ordnung (Cache-Verzug oder eine andere Ursache): später prüfen.'); process.exit(7); }
      process.exit(0);
    } catch (e) { fail(8, 'Ausnahme während der Rücknahme: ' + (e && e.message ? e.message : e) + '\nDie Rücknahme ist wiederholbar: ' + BEFEHL); }
  }

  // ---------- Einspielen / Testvorlage: Ausgangsstand prüfen ----------
  let blockLive = null;
  try { blockLive = blockWert(jetzt.content); } catch (e) { blockLive = null; console.error('Block in der Live-Datei nicht lesbar:', e.message); }
  const merk = ladeMerkliste();
  if (blockLive !== null && blockLive === neu) fail(3, 'Schon eingespielt: der Block in ' + DATEI + ' ist gleich lux_delivery.neu.liquid. Nichts geschrieben. Rücknahme: ' + BEFEHL);
  if (jetzt.md5 !== MD5_VOR) {
    if (merk && jetzt.md5 === merk.md5_soll) fail(3, 'Schon eingespielt (Prüfsumme gleich dem Soll der Merkliste, die Blockdatei hat sich seitdem geändert). Nichts geschrieben. Rücknahme: ' + BEFEHL);
    if (!FREMD_OK) fail(4, `${DATEI} weicht vom erwarteten Ausgangsstand ab (md5 ${jetzt.md5}, erwartet ${MD5_VOR}): jemand hat die Vorlage geändert. Nichts geschrieben. Bewusst trotzdem: FREMD_UEBERSCHREIBEN=1`);
    console.log('FREMD_UEBERSCHREIBEN=1: Ausgangsstand weicht ab (md5 ' + jetzt.md5 + ', erwartet ' + MD5_VOR + ')');
  }
  if (blockLive === null) fail(4, 'Der Block lux_delivery ist in der Live-Datei nicht lesbar: nichts geschrieben');
  if (blockLive !== altRef) {
    if (!FREMD_OK) fail(4, 'Der Blocktext in ' + DATEI + ' ist nicht der erwartete alte Text (lux_delivery.alt.liquid): nichts geschrieben. Bewusst trotzdem: FREMD_UEBERSCHREIBEN=1');
    console.log('FREMD_UEBERSCHREIBEN=1: der Blocktext live weicht von lux_delivery.alt.liquid ab; ersetzt wird der Text, der live steht');
  }
  let ers;
  try { ers = ersetzen(jetzt.content, blockLive, neu); } catch (e) { if (e.code) fail(e.code, e.message); throw e; }
  const neuText = ers.text, md5Soll = md5(neuText);
  if (Buffer.byteLength(neuText) > MAX_BYTE) fail(4, `Die neue Vorlage wäre ${Buffer.byteLength(neuText)} Byte gross (Grenze ${MAX_BYTE}): nichts geschrieben`);

  // Diff-Statistik
  const ds = diffStat(blockLive, neu);
  console.log('--- Diff-Statistik ---');
  console.log(`Datei:      ${Buffer.byteLength(jetzt.content)} -> ${Buffer.byteLength(neuText)} Byte (${Buffer.byteLength(neuText) - Buffer.byteLength(jetzt.content) >= 0 ? '+' : ''}${Buffer.byteLength(neuText) - Buffer.byteLength(jetzt.content)})`);
  console.log(`Blocktext:  ${blockLive.length} -> ${neu.length} Zeichen · ${ds.zeilenAlt} -> ${ds.zeilenNeu} Zeilen · gleich am Anfang ${ds.gleichAnfang}, am Ende ${ds.gleichEnde} · entfernt ${ds.entfernt}, hinzu ${ds.hinzu} Zeilen`);
  console.log(`Ausserhalb des einen JSON-Strings unverändert: ${ers.davorByte} Byte davor + ${ers.danachByte} Byte danach (Byte-Vergleich bestanden)`);
  console.log(`Prüfsumme:  ${jetzt.md5} -> Soll ${md5Soll}`);

  // Sicherung (nur Einspielen) auf Übereinstimmung prüfen
  const sichN = sicherungsName(jetzt.md5), sichPfad = HIER + 'sicherung/' + sichN;
  if (!TEST) {
    const vorhanden = ladeSicherung(sichN, jetzt.md5);
    console.log(vorhanden != null ? `Sicherung vorhanden und gleich dem Live-Stand: sicherung/${sichN}` : `Sicherung sicherung/${sichN} fehlt noch${LIVE ? ': wird vor dem Schreiben angelegt' : ' (wird bei LIVE angelegt)'}`);
  }
  if (!TEST) console.log(jetztAlle[TESTDATEI] ? `Testvorlage ${TESTDATEI} ist vorhanden (entfernen: TESTVORLAGE_WEG=1 LIVE=1 node dropship/lagerbestand-0511/apply_theme.mjs)` : 'Empfehlung: vor LIVE=1 erst TESTVORLAGE=1 LIVE=1 (zeigt den neuen Block gefahrlos unter ?view=lxtest an jeder Produktseite)');
  if (TEST) console.log(`Testvorlage ${TESTDATEI}: ${jetztAlle[TESTDATEI] ? 'ist schon vorhanden und wird überschrieben (eigene Datei, von keiner Seite ohne ?view=lxtest benutzt)' : 'noch nicht vorhanden'}`);

  const pfade = (LIVE || PRUEFEN) ? await pfadeWaehlen() : null;
  if (!LIVE) {
    if (PRUEFEN) {
      console.log('Seiten jetzt (Ausgangswerte):'); const m = await messen(pfade);
      if (!auswerten(m, null, { vorfehlerOk: VORFEHLER_OK }) || !hatBlock(m)) console.log('HINWEIS: Seiten nicht in Ordnung oder kein Lieferblock sichtbar; LIVE würde abbrechen');
    }
    console.log('Trockenlauf, nichts geschrieben');
    process.exit(0);
  }

  console.log('Seiten vorher (Ausgangswerte):');
  const vorMessung = await messen(pfade);
  const vorOk = auswerten(vorMessung, null, { vorfehlerOk: VORFEHLER_OK });
  if (!vorOk) fail(4, 'Schon VOR dem Eingriff fehlerhafte Seiten: nichts geschrieben');
  if (!hatBlock(vorMessung)) fail(4, 'Keine Produktseite zeigt vorher den Lieferblock («Lieferung voraussichtlich» oder «ausverkauft»): die Seitenprüfung wäre blind. Nichts geschrieben. Andere Produkte: PRUEF_PRODUKTE=handle1,handle2');

  // ---------- Testvorlage anlegen ----------
  if (TEST) {
    let tErs; try { tErs = ersetzen(jetzt.content, blockLive, neu + TESTMARKE); } catch (e) { if (e.code) fail(e.code, e.message); throw e; }
    const testText = tErs.text, md5Test = md5(testText);
    console.log(`Testvorlage: ${Buffer.byteLength(testText)} Byte · md5 ${md5Test} (= Soll plus Testmarke ${TESTMARKE} am Ende des Blocks)`);
    try {
      { const abw = await veraendertSeit(DATEI, jetzt.md5); if (abw) fail(4, SEIT_TEXT(DATEI, jetzt.md5, abw)); }
      const u = await schreibe(TESTDATEI, testText);
      console.log('upsert', JSON.stringify(u.upsertedThemeFiles));
      if (u.userErrors?.length) fail(5, 'userErrors: ' + JSON.stringify(u.userErrors));
      const w = await warteBis(TESTDATEI, md5Test, 150000);
      console.log('rücklesen', w.ok ? 'GLEICH' : 'ABWEICHUNG ' + w.md5);
      if (!w.ok) fail(6, 'Die API meldet für die Testvorlage eine andere Prüfsumme (Shopify speichert die Datei anders als gesendet?). ' + DATEI + ' wurde NICHT angefasst. Testvorlage löschen: TESTVORLAGE_WEG=1 LIVE=1 node dropship/lagerbestand-0511/apply_theme.mjs');
      const produkte = pfade.filter((p) => p.startsWith('/products/'));
      // Auslieferung der neuen Vorlage kann verzögert sein: bis zu 150 s auf die Testmarke warten
      const t0 = Date.now(); let m, ok = false, runden = 0;
      for (;;) {
        console.log('Produktseiten mit ?view=lxtest:');
        m = await messen(produkte, 'lxtest'); runden++; ok = auswerten(m, vorMessung, { marke: true, vorfehlerOk: VORFEHLER_OK });
        if (ok || !m.every((x) => x.status === 200 && !x.fehler.length) || fristAbgelaufen(t0, 150000, runden)) break;   // nur auf die Marke warten, nie über echte Fehler hinweg
        await warte(10000);
      }
      console.log(ok ? 'Testvorlage in Ordnung. Ansehen: ' + produkte.map((p) => BASIS + p + '?view=lxtest').join('  ') : 'Seitenprüfung der Testvorlage FEHLGESCHLAGEN (die echte Produktseite ist unberührt).');
      console.log('Testvorlage wieder entfernen: TESTVORLAGE_WEG=1 LIVE=1 node dropship/lagerbestand-0511/apply_theme.mjs');
      process.exit(ok ? 0 : 7);
    } catch (e) { fail(8, 'Ausnahme: ' + (e && e.message ? e.message : e) + '\n' + DATEI + ' wurde nicht angefasst. Testvorlage entfernen: TESTVORLAGE_WEG=1 LIVE=1 node dropship/lagerbestand-0511/apply_theme.mjs'); }
  }

  // ---------- Einspielen ----------
  mkdirSync(HIER + 'sicherung', { recursive: true });
  if (!existsSync(sichPfad)) writeFileSync(sichPfad, jetzt.content);
  const sicherung = ladeSicherung(sichN, jetzt.md5);
  if (sicherung == null) fail(4, 'Sicherung konnte nicht angelegt werden');
  { const abw = await veraendertSeit(DATEI, jetzt.md5); if (abw) fail(4, SEIT_TEXT(DATEI, jetzt.md5, abw)); }
  // Merkliste VOR dem Schreiben: so findet die Rücknahme auch einen halb durchgelaufenen Eingriff
  writeFileSync(MERKLISTE, JSON.stringify({ erstellt: new Date().toISOString(), hinweis: 'apply_theme.mjs hat templates/product.json (Block lux_delivery) ins MAIN-Theme geschrieben; md5_soll ist der Soll-Stand, md5_vor der Stand davor', datei: DATEI, sicherung: sichN, md5_vor: jetzt.md5, md5_soll: md5Soll, bytes_vor: Buffer.byteLength(jetzt.content), bytes_soll: Buffer.byteLength(neuText), block_md5_vor: md5(blockLive), block_md5_neu: md5(neu), fremd: jetzt.md5 !== MD5_VOR }, null, 1) + '\n');

  const haltAn = async () => { if (zustand.signal) await new Promise(() => {}); };
  const abbruch = async (code, grund) => { const ok = await rueckweg(grund, sicherung, jetzt.md5, vorMessung, pfade); process.exit(ok ? code : 9); };
  for (const s of ['SIGINT', 'SIGTERM']) {
    process.on(s, () => {
      if (!zustand.geschrieben || zustand.fertig) { console.error('Abbruch durch ' + s); process.exit(130); }
      if (zustand.imRueckweg || zustand.signal) { console.error('Signal ' + s + ': der Rückweg läuft schon, bitte abwarten'); return; }
      zustand.signal = true;   // der Hauptablauf bleibt stehen (haltAn), damit er nicht neben dem Rückweg weiterläuft und «Fertig» meldet
      console.error('Signal ' + s + ' nach Beginn des Schreibens: der Rückweg wird ausgeführt');
      rueckweg('Abbruch durch ' + s, sicherung, jetzt.md5, vorMessung, pfade).then((ok) => process.exit(ok ? 130 : 9), () => process.exit(9));
    });
  }
  console.log('Rückweg, falls nötig: ' + BEFEHL);
  zustand.geschrieben = true;   // vor dem Aufruf: auch ein Abbruch mitten im Request führt zum Rückweg
  try {
    const u = await schreibe(DATEI, neuText);
    await haltAn();
    console.log('upsert', JSON.stringify(u.upsertedThemeFiles));
    if (u.userErrors?.length) {
      console.error('userErrors:', JSON.stringify(u.userErrors));
      const n = (await lesen([DATEI]))[DATEI];
      if (n && n.md5 === jetzt.md5) { zustand.fertig = true; process.exit(5); }
      await abbruch(5, 'userErrors, und die Datei ist nicht im Ausgangsstand (md5 ' + (n && n.md5) + ')');
    }
    const w = await warteBis(DATEI, md5Soll, 150000);
    await haltAn();
    console.log('rücklesen', w.ok ? 'GLEICH' : 'ABWEICHUNG ' + w.md5);
    if (!w.ok) await abbruch(6, `Rücklesen weicht ab (API-Prüfsumme ${w.md5}, Soll ${md5Soll})`);
    for (let runde = 1; runde <= RUNDEN; runde++) {
      await warte(runde === 1 ? 45000 : 60000);
      await haltAn();
      console.log(`Seiten nachher (Runde ${runde} von ${RUNDEN}):`);
      const gemessen = await messen(pfade);
      await haltAn();
      const ok = auswerten(gemessen, vorMessung, { vorfehlerOk: VORFEHLER_OK });
      if (!ok) await abbruch(7, `Seitenprüfung nach dem Einspielen fehlgeschlagen (Runde ${runde})`);
    }
    await haltAn();
    zustand.fertig = true;
    console.log('Fertig: ' + DATEI + ' trägt den neuen Block (md5 ' + md5Soll + '). Wirksamkeit des neuen Blocks an den Seiten nicht messbar (siehe Kopfkommentar): die Testvorlage zeigt sie.');
    process.exit(0);
  } catch (e) {
    if (zustand.fertig) throw e;
    console.error('Ausnahme nach Beginn des Schreibens:', e && e.message ? e.message : e);
    await abbruch(8, 'Ausnahme: ' + (e && e.message ? e.message : e));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  haupt().catch((e) => { console.error('Unerwartete Ausnahme:', e && e.message ? e.message : e); process.exit(zustand.geschrieben ? 8 : Number.isInteger(e && e.code) ? e.code : 1); });
}
