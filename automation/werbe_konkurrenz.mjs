#!/usr/bin/env node
/**
 * automation/werbe_konkurrenz.mjs: Werbe-Konkurrenz beobachten. Gespeichert werden nur KLASSEN, nie Texte, Bilder oder Videos.
 *
 *   /opt/node22/bin/node automation/werbe_konkurrenz.mjs --selbsttest   Prüfungen ohne Netz und ohne Browser
 *   /opt/node22/bin/node automation/werbe_konkurrenz.mjs                DRY (Standard): liest, schreibt NUR die Auswertung
 *   DRY=0 /opt/node22/bin/node automation/werbe_konkurrenz.mjs          scharf: Ledger + Auswertung, nur in dropship/
 *
 * EINGABE   automation/data/werbe_konkurrenz_liste.json (Einträge mit erreichbar: true)
 * LEDGER    dropship/_werbe_konkurrenz.csv   ad_id, seite, erstmals_gesehen, format, hook_typ, angebot_typ
 * AUSGABE   dropship/WERBE-KONKURRENZ.md     Tabelle je Konkurrent, 3 Beobachtungen, Status der Quelle
 *
 * QUELLE, Reihenfolge (Stand 11.10.2026):
 *   1. Meta-Werbebibliotheks-API (ads_archive, Land CH), nur wenn sie antwortet. Das Secret kommt aus
 *      /tmp/meta_app_secret, wird nie ausgegeben und nie in Meldungen übernommen. Bisher: Graph-Fehler 10/2332004.
 *   2. Sonst die Meta-Werbebibliothek im Browser (tools/browser.mjs), eine Suche je Konkurrent, ohne Anmeldung.
 *      Die Recherche sah HTTP 403 am Dokument. Jede Sperre (HTTP ab 400, Login- oder Checkpoint-Seite, Captcha)
 *      BEENDET die Quelle für diesen Lauf. Kein Umgehen: kein anderer Browser-Fingerabdruck, kein zweiter Versuch,
 *      kein Drittanbieter.
 *
 * GRENZEN: höchstens 20 Anfragen je Lauf · neue Suchen nur bis 195 s · 10 s Wartezeit je Seite, kein Scrollen,
 *          keine Screenshots · ein Watchdog schreibt die Auswertung spätestens nach 280 s.
 *
 * NICHT TEIL DIESES SKRIPTS: Veröffentlichung, Metricool-Versand, E-Mails. Ein Metricool-Entwurf ist ein eigener Schritt.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { starte } from '../tools/browser.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HIER, '..');
const DROPSHIP = path.join(REPO, 'dropship');
const LISTE_DATEI = path.join(HIER, 'data', 'werbe_konkurrenz_liste.json');

export const MAX_ANFRAGEN = 20;
const WARTE_MS = 10_000;              // Wartezeit je Seite, ohne Scrollen
const PAUSE_MS = 3_000;               // Pause zwischen zwei Browser-Suchen
const SEITE_TIMEOUT_MS = 60_000;
const BROWSER_START_MAX_MS = 60_000;
const NEUE_SUCHE_BIS_MS = 195_000;    // ab hier beginnt keine neue Suche mehr
const WATCHDOG_MS = 280_000;          // schreibt die Auswertung auch dann, wenn ein Schritt hängt
const MINDESTMENGE = 10;              // darunter keine Muster-Aussage
const META_APP_ID_OEFFENTLICH = '1680844973132194'; // App-ID aus CLAUDE.md, kein Geheimnis
const LEDGER_KOPF = ['ad_id', 'seite', 'erstmals_gesehen', 'format', 'hook_typ', 'angebot_typ'];
const QUELLE_NAME = 'Meta-Werbebibliothek (Land CH, eine Suche je Konkurrent)';

// Website-Befunde aus der Recherche vom 11.10.2026 (statisch). Bei Neurecherche hier aktualisieren.
const WEBSITE_BEOBACHTUNGEN = [
  "Lieferzeit ist ein klarer Unterschied: Mitbewerber mit Lagerware nennen auf der Startseite 1–2 Werktage (Bon'a Parte, Post online shop, Baby-Geschenk). LuxeStyle steht laut Journal-Eintrag vom 10.10. (Transit-Richtlinie) bei 10–20 Tagen für die Schweiz und 15–45 Tagen für Liechtenstein. Lieferzeit auf Produktseite, Kasse und Richtlinie gleich lautend halten.",
  "Schwellen und Rückgabe: Gratis-Versand ab CHF 15 (Apfelkiste), 39.90 (Zalando), 69 (Bon'a Parte), 69.90 (3DJake), 70 (Enjoymedia), 100 (Baby-Geschenk) und 149 (Breuninger); C&A nennt 49 nur im Suchausschnitt. Zalando und Bon'a Parte nennen auf der Startseite 30 Tage Rückgabe. LuxeStyle liegt bei 45 (CLAUDE.md-Stand 10.10., nicht live gemessen). Die Anhebung auf 50 wurde am 15.09. zurückgezogen, weil rabattierte Körbe den Gratisversand verlieren können.",
];

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const kurz = (e) => String(e?.message ?? e).replace(/\s+/g, ' ').slice(0, 200);

// ---------- Normalisierung, Zuordnung, Klassifikation (rein, ohne Netz) ----------

export function normalisiere(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`´]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function ladeListe(datei = LISTE_DATEI) {
  const roh = JSON.parse(fs.readFileSync(datei, 'utf8'));
  if (!Array.isArray(roh.konkurrenten)) throw new Error('Eingabeliste ohne «konkurrenten»');
  return roh.konkurrenten
    .filter((k) => k.erreichbar === true)
    .map((k) => ({ name: k.name, domain: k.domain, nische: k.nische, aliase: k.aliase || [] }));
}

/** Ordnet einen Seitennamen einem Konkurrenten zu, nur über GANZE Wörter. Gibt die Domain zurück oder null. */
export function zuordnen(seitenname, liste) {
  const n = ` ${normalisiere(seitenname)} `;
  for (const k of liste) {
    for (const a of k.aliase) {
      const m = normalisiere(a);
      if (m && n.includes(` ${m} `)) return k.domain;
    }
  }
  return null;
}

export function klassifiziereHook(text) {
  const t = String(text ?? '').trim();
  if (!t) return 'unbekannt';
  const kopf = t.slice(0, 160);
  if (kopf.includes('?')) return 'frage';
  if (/(chf|fr\.)\s?\d|\d\s?(chf|franken|fr\b)|\d\s?(%|prozent)/i.test(kopf)) return 'zahl_preis';
  if (/nur heute|nur noch|letzte chance|endet|läuft ab|nur (für )?kurze zeit|bis (zum )?\d{1,2}\.|bis (montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/i.test(kopf)) return 'zeitdruck';
  if (/bewertung|sterne|bestseller|meistverkauft|kundinnen|kundenliebling/i.test(kopf)) return 'sozialer_beweis';
  if (/\b(neu|neue|neuheit|gerade eingetroffen|jetzt entdecken)\b/i.test(kopf)) return 'neuheit';
  if (/\b(einfach|schnell|perfekt|ideal|komfortabel|stilvoll|elegant|bequem)\b/i.test(kopf)) return 'nutzen';
  return 'sonstiges';
}

/** Stärkstes Angebot gewinnt (Prozent vor CHF-Rabatt vor Gutschein vor Gratisversand …). */
export function klassifiziereAngebot(text) {
  const t = String(text ?? '');
  if (!t.trim()) return 'unbekannt';
  if (/\d\s?(%|prozent)/i.test(t) && /rabatt|sale|reduz|spar|off\b|günstiger|%|prozent/i.test(t)) return 'rabatt_prozent';
  if (/(chf|fr\.)\s?\d+([.,]\d+)?\s*(rabatt|günstiger|sparen|gespart)|spar(e|en|st)?\s+(chf|fr\.)\s?\d/i.test(t)) return 'rabatt_chf';
  if (/gutschein|rabattcode|code\s+[a-z0-9]{4,}/i.test(t)) return 'gutschein';
  if (/gratis(er|e|en)?\s*(versand|lieferung)|versandkostenfrei|versandfrei|kostenlose?r?\s+(versand|lieferung)/i.test(t)) return 'gratisversand';
  if (/\b\d+\s?(für|fur)\s?(\d+|chf|fr)|\b(2|3|zwei|drei)\s+(für|fuer)\b|\bset\b|\bbundle\b/i.test(t)) return 'bundle';
  if (/(chf|fr\.)\s?\d/i.test(t)) return 'festpreis';
  return 'keins';
}

export function klassifiziereFormat({ video = false, bilder = 0 } = {}) {
  if (video) return 'video';
  const n = Number(bilder) || 0;
  if (n >= 2) return 'karussell';
  if (n === 1) return 'bild';
  return 'unbekannt';
}

export function adId(text) {
  const m = String(text ?? '').match(/Bibliotheks-ID:?\s*(\d{6,})/i);
  return m ? m[1] : null;
}

/** Kopfzeilen bis «Gesponsert» (dort steht der Seitenname). Ohne Marker nur die ersten zwei Zeilen. */
export function seitenKopf(text) {
  const zeilen = String(text ?? '').split('\n').map((z) => z.trim())
    .filter((z) => z && !/bibliotheks-id|gestartet|^aktiv$|^inaktiv$/i.test(z));
  const ende = zeilen.findIndex((z) => /gesponsert|sponsored/i.test(z));
  return (ende > 0 ? zeilen.slice(0, ende) : zeilen.slice(0, 2)).join(' | ');
}

/** Anzeigentext ohne Kopfzeilen. Nur im Speicher, wird nie ausgegeben oder abgelegt. */
export function kartenKoerper(text) {
  return String(text ?? '').split('\n')
    .filter((z) => !/bibliotheks-id|gestartet|gesponsert|sponsored|^aktiv$|^inaktiv$/i.test(z.trim()))
    .join('\n');
}

export function metaUrl(term) {
  return 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CH'
    + `&q=${encodeURIComponent(term)}&search_type=keyword_unordered&media_type=all`;
}

/** Jede Sperre beendet die Quelle. Gibt den Grund zurück oder null. */
export function blockGrund({ status = null, url = '', text = '' } = {}) {
  if (status !== null && status >= 400) return `HTTP ${status}`;
  if (/checkpoint|\/login/i.test(url)) return 'Login- oder Checkpoint-Seite';
  if (/captcha|verify you are human|access denied/i.test(text)) return 'Captcha- oder Sperrseite';
  return null;
}

export function apiUrl(term, appId, secret) {
  const q = new URLSearchParams({
    search_terms: term,
    ad_reached_countries: '["CH"]',
    ad_active_status: 'ACTIVE',
    fields: 'id,page_name,ad_creative_bodies',
    limit: '100',
    access_token: `${appId}|${secret}`,
  });
  return `https://graph.facebook.com/v21.0/ads_archive?${q}`;
}

/**
 * Wertet eine Liste von Anzeigen aus (Karten-Objekte: {text, video, bilder}). Zählt, dedupliziert gegen `bekannt`
 * und liefert nur Klassen. Der Text bleibt in dieser Funktion und wird nicht zurückgegeben.
 */
export function verarbeiteKarten(karten, { liste, bekannt, heute }) {
  const z = { karten: karten.length, zugeordnet: 0, dubletten: 0, unzugeordnet: 0, ohneId: 0, zeilen: [] };
  for (const k of karten) {
    const id = adId(k.text);
    if (!id) { z.ohneId++; continue; }
    const seite = zuordnen(seitenKopf(k.text), liste);
    if (!seite) { z.unzugeordnet++; continue; }
    z.zugeordnet++;
    if (bekannt.has(id)) { z.dubletten++; continue; }
    bekannt.add(id);
    const koerper = kartenKoerper(k.text);
    z.zeilen.push({
      ad_id: id,
      seite,
      erstmals_gesehen: heute,
      format: klassifiziereFormat({ video: Boolean(k.video), bilder: k.bilder }),
      hook_typ: klassifiziereHook(koerper),
      angebot_typ: klassifiziereAngebot(koerper),
    });
  }
  return z;
}

// ---------- CSV und Ledger ----------

export function csvFeld(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvZeile(werte) {
  return werte.map(csvFeld).join(',');
}

export function csvLesen(zeile) {
  const out = [];
  let feld = '';
  let q = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (q) {
      if (c === '"') {
        if (zeile[i + 1] === '"') { feld += '"'; i++; } else q = false;
      } else feld += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(feld); feld = ''; }
    else feld += c;
  }
  out.push(feld);
  return out;
}

export function ledgerLesen(datei) {
  if (!fs.existsSync(datei)) return [];
  const zeilen = fs.readFileSync(datei, 'utf8').split(/\r?\n/).filter((z) => z.trim());
  return zeilen.slice(1).map((z) => {
    const f = csvLesen(z);
    const o = {};
    LEDGER_KOPF.forEach((k, i) => { o[k] = f[i] ?? ''; });
    return o;
  });
}

/** Hängt nur an. Schreibt den Kopf, wenn die Datei neu ist. */
export function ledgerSchreiben(datei, neue) {
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  const leer = !fs.existsSync(datei) || fs.statSync(datei).size === 0;
  let text = leer ? `${csvZeile(LEDGER_KOPF)}\n` : '';
  for (const r of neue) text += `${csvZeile(LEDGER_KOPF.map((k) => r[k]))}\n`;
  fs.appendFileSync(datei, text, 'utf8');
}

// ---------- Auswertung ----------

function zaehle(liste) {
  const m = new Map();
  for (const x of liste) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

function top(liste, n = 2) {
  const z = zaehle(liste).slice(0, n);
  return z.length ? z.map(([k, v]) => `${k} ${v}`).join(', ') : '–';
}

export function beobachtungen(alle, status) {
  const n = alle.length;
  const erste = n >= MINDESTMENGE
    ? `Muster aus ${n} klassifizierten Anzeigen: häufigster Hook-Typ «${zaehle(alle.map((r) => r.hook_typ))[0][0]}», häufigste Angebotsart «${zaehle(alle.map((r) => r.angebot_typ))[0][0]}». Erst ab ${MINDESTMENGE} Anzeigen eine Aussage, und nur als Muster, nicht als Kopiervorlage.`
    : `Datenlage: ${n} klassifizierte Anzeigen (Mindestmenge für ein Muster: ${MINDESTMENGE}). Quelle: ${status}. Keine Aussage über Anzeigen-Muster, solange die Quelle keine Daten liefert.`;
  return [erste, ...WEBSITE_BEOBACHTUNGEN];
}

export function auswertungText({ alle, neueAnzahl, dry, datum, quelle, zaehl, liste }) {
  const z = [];
  z.push('# Werbe-Konkurrenz: Auswertung', '');
  z.push(`Stand: ${datum} (Europe/Zurich) · Modus: ${dry ? 'DRY (nichts gespeichert, Ledger unverändert)' : 'scharf (Ledger und Auswertung in dropship/)'}`, '');
  z.push('## Quelle und Lauf', '');
  z.push(`- Quelle: ${QUELLE_NAME}. Status: ${quelle.status}.`);
  z.push(`- Meta-API: ${quelle.api}.`);
  z.push(`- Anfragen: ${quelle.anfragen} von ${MAX_ANFRAGEN}. Laufzeit: ${quelle.sekunden} s.`);
  z.push(`- Anzeigen gesehen: ${zaehl.karten}. Zu Konkurrenten zugeordnet: ${zaehl.zugeordnet}. Neu klassifiziert: ${neueAnzahl}${dry ? ' (nur DRY, nicht gespeichert)' : ''}. Dubletten: ${zaehl.dubletten}. Nicht zuordenbar: ${zaehl.unzugeordnet}. Ohne Anzeigen-ID: ${zaehl.ohneId}.`);
  if (quelle.offen) z.push(`- Offen (Betreiber): ${quelle.offen}`);
  z.push('', '## Tabelle je Konkurrent', '');
  z.push('| Konkurrent | Domain | Anzeigen | Formate | Hook-Typen (Top 2) | Angebotsarten (Top 2) |');
  z.push('|---|---|---:|---|---|---|');
  for (const k of liste) {
    const rs = alle.filter((r) => r.seite === k.domain);
    z.push(`| ${k.name} | ${k.domain} | ${rs.length} | ${top(rs.map((r) => r.format), 4)} | ${top(rs.map((r) => r.hook_typ))} | ${top(rs.map((r) => r.angebot_typ))} |`);
  }
  z.push(`| **Summe** | | **${alle.length}** | ${top(alle.map((r) => r.format), 4)} | ${top(alle.map((r) => r.hook_typ))} | ${top(alle.map((r) => r.angebot_typ))} |`);
  z.push('', '## Beobachtungen (für LuxeStyle, ohne Kopien)', '');
  beobachtungen(alle, quelle.status).forEach((b, i) => z.push(`${i + 1}. ${b}`));
  z.push('', '_Beobachtung 2 und 3 stammen aus der Recherche vom 11.10.2026 und sind statisch. Bei Neurecherche in WEBSITE_BEOBACHTUNGEN aktualisieren._', '');
  z.push('## Was gespeichert wird', '');
  z.push('- Je Anzeige nur: ad_id, Konkurrent (Domain), Datum des Erstsehens, Format, Hook-Typ, Angebotsart.');
  z.push('- Keine Anzeigentexte, Bilder oder Videos. Keine Veröffentlichung, kein Metricool-Versand (eigener Schritt, nur Entwürfe).');
  return `${z.join('\n')}\n`;
}

/** Schreibt Ledger (nur scharf und nur bei neuen Zeilen) und Auswertung. Nur Dateien in outDir. */
export function abschluss({ dry, outDir, neue, datum, quelle, zaehl, liste }) {
  const ledger = path.join(outDir, '_werbe_konkurrenz.csv');
  const md = path.join(outDir, 'WERBE-KONKURRENZ.md');
  fs.mkdirSync(outDir, { recursive: true });
  const alt = ledgerLesen(ledger);
  if (!dry && neue.length) ledgerSchreiben(ledger, neue);
  const alle = alt.concat(neue);
  fs.writeFileSync(md, auswertungText({ alle, neueAnzahl: neue.length, dry, datum, quelle, zaehl, liste }), 'utf8');
  return { ledger, md, alle };
}

export function heuteZurich(d = new Date()) {
  const teile = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = (t) => teile.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// ---------- Quellen (Netz) ----------

function leseDatei(p) {
  try { return fs.readFileSync(p, 'utf8').trim() || null; } catch { return null; }
}

/** Zugang nur aus /tmp bzw. Umgebung. Der Wert wird nie ausgegeben. */
function apiZugang() {
  const secret = leseDatei('/tmp/meta_app_secret');
  if (!secret) return null;
  const appId = (process.env.META_APP_ID || '').trim() || leseDatei('/tmp/meta_app_id') || META_APP_ID_OEFFENTLICH;
  return { appId, secret };
}

/** Holt eine URL über curl, das den Proxy aus der Umgebung nutzt. Die URL geht über stdin, nicht über argv. */
function curlHolen(url) {
  return new Promise((resolve) => {
    const p = execFile('curl', ['-sS', '--max-time', '30', '-K', '-'], { maxBuffer: 8 * 1024 * 1024, timeout: 45_000 },
      (err, stdout, stderr) => resolve({ out: String(stdout || ''), err: err ? String(stderr || err.message || '') : '' }));
    p.stdin.on('error', () => {});
    p.stdin.end(`url = "${url}"\n`);
  });
}

async function apiSuche(term, { appId, secret }) {
  const r = await curlHolen(apiUrl(term, appId, secret));
  const redig = (s) => String(s).split(secret).join('***').split(appId).join('***').replace(/\s+/g, ' ').slice(0, 120);
  if (!r.out.trim()) return { verfuegbar: null, text: `Netzwerk: ${redig(r.err) || 'keine Antwort'}`, karten: null };
  let json;
  try { json = JSON.parse(r.out); } catch { return { verfuegbar: null, text: 'keine JSON-Antwort', karten: null }; }
  if (json.error) {
    const e = json.error;
    const dauerhaft = e.code === 10 || e.code === 200 || e.error_subcode === 2332004;
    return { verfuegbar: dauerhaft ? false : null, text: `Graph-Fehler ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ''}`, karten: null };
  }
  const karten = (Array.isArray(json.data) ? json.data : []).map((a) => ({
    text: `${a.page_name || ''}\nBibliotheks-ID: ${a.id}\n${(a.ad_creative_bodies || []).join('\n')}`,
    video: false,
    bilder: 0,
  }));
  return { verfuegbar: true, text: `antwortet (${karten.length} Treffer)`, karten };
}

/** Läuft IM Browser (page.evaluate): je Anzeige Text, Video-Flag und Zahl der Meta-Bilder. Nichts davon wird gespeichert. */
function sammleKarten() {
  const anzahlIds = (el) => ((el.innerText || '').match(/Bibliotheks-ID/g) || []).length;
  const wurzeln = new Set();
  const lauf = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let knoten;
  while ((knoten = lauf.nextNode())) {
    if (knoten.nodeValue.indexOf('Bibliotheks-ID') === -1 || !knoten.parentElement) continue;
    let el = knoten.parentElement;
    while (el.parentElement && el.parentElement !== document.body && anzahlIds(el.parentElement) === 1) el = el.parentElement;
    wurzeln.add(el);
  }
  return [...wurzeln].slice(0, 80).map((el) => ({
    text: el.innerText || '',
    video: el.querySelector('video') !== null,
    bilder: el.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]').length,
  }));
}

async function browserStarten() {
  let timer;
  const frist = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('Browserstart über 60 s')), BROWSER_START_MAX_MS); });
  try { return await Promise.race([starte(), frist]); } finally { clearTimeout(timer); }
}

async function webSuche(browser, term) {
  const seite = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    const antwort = await seite.goto(metaUrl(term), { waitUntil: 'load', timeout: SEITE_TIMEOUT_MS });
    const status = antwort ? antwort.status() : null;
    if (status !== null && status >= 400) return { blockiert: `HTTP ${status}`, karten: [] };
    await seite.waitForTimeout(WARTE_MS);
    const text = await seite.evaluate(() => ((document.body && document.body.innerText) || '').slice(0, 4000));
    const grund = blockGrund({ status, url: seite.url(), text });
    if (grund) return { blockiert: grund, karten: [] };
    return { blockiert: null, karten: await seite.evaluate(sammleKarten) };
  } finally {
    await seite.close().catch(() => {});
  }
}

// ---------- Lauf ----------

const lauf = {
  dry: true, start: Date.now(), datum: '', liste: [], neu: [], fertig: false,
  zaehl: { karten: 0, zugeordnet: 0, dubletten: 0, unzugeordnet: 0, ohneId: 0 },
  quelle: { status: 'nicht gestartet', api: 'nicht versucht', anfragen: 0, sekunden: 0, offen: '' },
};

/** Schreibt die Auswertung genau einmal, auch wenn der Watchdog zuerst greift. */
function abschlussJetzt() {
  if (lauf.fertig) return null;
  lauf.fertig = true;
  const q = lauf.quelle;
  q.sekunden = Math.round((Date.now() - lauf.start) / 1000);
  if (/2332004|Graph-Fehler 10\b|blockiert/.test(`${q.status} ${q.api}`)) {
    q.offen = 'Meta sperrt den Zugang bzw. die API hat keine Berechtigung (Graph-Fehler 10 / 2332004). Betreiber: App-Freigabe für die Werbebibliothek im Meta-Developer-Konto prüfen oder die Quelle wechseln. Bis dahin bleibt der Bericht ohne Anzeigen.';
  }
  return abschluss({ dry: lauf.dry, outDir: DROPSHIP, neue: lauf.neu, datum: lauf.datum, quelle: q, zaehl: lauf.zaehl, liste: lauf.liste });
}

async function main() {
  lauf.dry = process.env.DRY !== '0';
  lauf.start = Date.now();
  lauf.datum = heuteZurich();
  lauf.liste = ladeListe();
  const alt = ledgerLesen(path.join(DROPSHIP, '_werbe_konkurrenz.csv'));
  const bekannt = new Set(alt.map((r) => r.ad_id));
  const zugang = apiZugang();
  const q = lauf.quelle;
  q.api = zugang ? 'bereit' : 'übersprungen: Secret in /tmp/meta_app_secret fehlt';
  let apiOk = zugang ? null : false;
  let browser = null;
  let gesehenWeb = 0;
  let leer = 0;
  try {
    for (const k of lauf.liste) {
      if (q.anfragen >= MAX_ANFRAGEN) { q.status = `Anfragen-Limit ${MAX_ANFRAGEN} erreicht`; break; }
      if (Date.now() - lauf.start > NEUE_SUCHE_BIS_MS) { q.status = 'Zeitlimit: keine neue Suche mehr begonnen'; break; }
      const term = k.aliase[0];
      let karten = null;
      if (apiOk !== false) {
        q.anfragen++;
        const r = await apiSuche(term, zugang);
        q.api = r.text;
        if (r.verfuegbar === true) { apiOk = true; karten = r.karten; }
        else if (r.verfuegbar === false) apiOk = false;
      }
      if (karten === null) {
        if (q.anfragen >= MAX_ANFRAGEN) { q.status = `Anfragen-Limit ${MAX_ANFRAGEN} erreicht`; break; }
        if (!browser) browser = await browserStarten();
        q.anfragen++;
        const r = await webSuche(browser, term);
        if (r.blockiert) { q.status = `blockiert (${r.blockiert}): Quelle beendet, kein Umgehen`; break; }
        karten = r.karten;
        gesehenWeb += karten.length;
        leer = karten.length ? 0 : leer + 1;
        if (gesehenWeb === 0 && leer >= 3) { q.status = 'keine Karten in 3 Suchen: die Seite liefert keine Ergebnisse, Quelle beendet'; break; }
        await pause(PAUSE_MS);
      }
      const v = verarbeiteKarten(karten, { liste: lauf.liste, bekannt, heute: lauf.datum });
      for (const key of Object.keys(lauf.zaehl)) lauf.zaehl[key] += v[key];
      lauf.neu.push(...v.zeilen);
    }
    if (q.status === 'nicht gestartet') q.status = q.anfragen ? 'alle Suchen durchlaufen' : 'keine Suche ausgeführt';
  } catch (e) {
    q.status = `Fehler: ${kurz(e)}`;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  const r = abschlussJetzt();
  console.log(`[werbe_konkurrenz] ${lauf.dry ? 'DRY' : 'SCHARF'} · Stand ${lauf.datum} · Quelle: ${q.status}`);
  console.log(`[werbe_konkurrenz] Meta-API: ${q.api} · Anfragen ${q.anfragen}/${MAX_ANFRAGEN} · Anzeigen ${lauf.zaehl.karten} · zugeordnet ${lauf.zaehl.zugeordnet} · neu ${lauf.neu.length}${lauf.dry ? ' (nicht gespeichert)' : ''} · Dubletten ${lauf.zaehl.dubletten}`);
  console.log(`[werbe_konkurrenz] Auswertung: ${r ? r.md : '(schon geschrieben)'}${!lauf.dry && r ? ` · Ledger: ${r.ledger}` : ''}`);
}

// ---------- Selbsttest (ohne Netz, ohne Browser, ohne dropship/) ----------

export function selbsttest() {
  const pruefungen = [];
  const pruefe = (name, bedingung) => pruefungen.push([name, Boolean(bedingung)]);
  const liste = ladeListe();

  pruefe('Eingabeliste: 13 erreichbare Konkurrenten, je mit Name, Domain, Nische und Alias',
    liste.length === 13 && liste.every((k) => k.name && k.domain && k.nische && k.aliase.length >= 1));
  pruefe('Hook: Frage, Preis und Zeitdruck werden erkannt',
    klassifiziereHook('Schon gesehen? Das Teil ist neu.') === 'frage'
    && klassifiziereHook('Nur CHF 19.90, solange der Vorrat reicht') === 'zahl_preis'
    && klassifiziereHook('Nur noch heute: Letzte Chance') === 'zeitdruck');
  pruefe('GEGENPROBE Hook: leerer Text ergibt «unbekannt», Alltagstext ergibt «sonstiges»',
    klassifiziereHook('   ') === 'unbekannt' && klassifiziereHook('Eine schöne Sache für den Alltag') === 'sonstiges');
  pruefe('Angebot: Prozent, Gratisversand und «keins» werden erkannt',
    klassifiziereAngebot('-20 % auf alles') === 'rabatt_prozent'
    && klassifiziereAngebot('Gratisversand ab CHF 45') === 'gratisversand'
    && klassifiziereAngebot('Jetzt entdecken') === 'keins');
  pruefe('Format: Video vor Karussell vor Bild, ohne Medien «unbekannt»',
    klassifiziereFormat({ video: true, bilder: 3 }) === 'video'
    && klassifiziereFormat({ bilder: 3 }) === 'karussell'
    && klassifiziereFormat({ bilder: 1 }) === 'bild'
    && klassifiziereFormat({}) === 'unbekannt');
  pruefe('Zuordnung: ganze Wörter treffen, «Zalandoo» trifft nicht, Sonderzeichen werden normiert',
    zuordnen('Zalando Schweiz', liste) === 'zalando.ch'
    && zuordnen('Zalandoo Fashion', liste) === null
    && zuordnen("Bon'a Parte Partykleider", liste) === 'bonaparteshop.com/de-ch'
    && zuordnen('C&A Schweiz', liste) === 'c-and-a.com/ch');

  const karten = [
    { text: 'Zalando Schweiz\nBibliotheks-ID: 120000111\nNeu: Kleid', video: false, bilder: 1 },
    { text: 'Zalando Schweiz\nBibliotheks-ID: 120000111\nNeu: Kleid', video: false, bilder: 1 },
    { text: 'Zalando Schweiz\nBibliotheks-ID: 120000222\nGEHEIMTEXT-MARKER-4711 Nur heute', video: true, bilder: 0 },
    { text: 'Irgendwer GmbH\nBibliotheks-ID: 120000333\nText', video: false, bilder: 2 },
  ];
  const v = verarbeiteKarten(karten, { liste, bekannt: new Set(), heute: '2026-10-11' });
  pruefe('Dubletten: dieselbe Anzeigen-ID wird nur einmal gespeichert, Fremdseiten werden nicht zugeordnet',
    v.zeilen.length === 2 && v.dubletten === 1 && v.unzugeordnet === 1);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'werbe-selbsttest-'));
  try {
    const ledger = path.join(tmp, '_werbe_konkurrenz.csv');
    const md = path.join(tmp, 'WERBE-KONKURRENZ.md');
    ledgerSchreiben(ledger, [v.zeilen[0]]);
    const vorher = fs.readFileSync(ledger, 'utf8');
    const quelle = { status: 'Selbsttest', api: 'Selbsttest', anfragen: 0, sekunden: 0, offen: '' };
    const zaehl = { karten: v.karten, zugeordnet: v.zugeordnet, dubletten: v.dubletten, unzugeordnet: v.unzugeordnet, ohneId: v.ohneId };
    abschluss({ dry: true, outDir: tmp, neue: [v.zeilen[1]], datum: '2026-10-11', quelle, zaehl, liste });
    pruefe('DRY schreibt KEINE Ledger-Zeilen (Ledger unverändert), die Auswertung entsteht und sagt «DRY»',
      fs.readFileSync(ledger, 'utf8') === vorher && fs.readFileSync(md, 'utf8').includes('Modus: DRY'));
    abschluss({ dry: false, outDir: tmp, neue: [v.zeilen[1]], datum: '2026-10-11', quelle, zaehl, liste });
    pruefe('Scharf schreibt die neue Zeile an: danach 2 Ledger-Zeilen', ledgerLesen(ledger).length === 2);
    pruefe('Ledger-Kopf ist genau ad_id,seite,erstmals_gesehen,format,hook_typ,angebot_typ',
      fs.readFileSync(ledger, 'utf8').split('\n')[0] === LEDGER_KOPF.join(','));
    const alles = fs.readFileSync(ledger, 'utf8') + fs.readFileSync(md, 'utf8');
    pruefe('Datenschutz: der Anzeigentext taucht in keiner Ausgabedatei auf', !alles.includes('GEHEIMTEXT-MARKER-4711'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  pruefe('Blockade: HTTP 403 stoppt, Checkpoint-Adresse und Sperrseite stoppen, HTTP 200 ohne Sperre nicht',
    blockGrund({ status: 403 }) === 'HTTP 403'
    && blockGrund({ status: 200, url: 'https://www.facebook.com/checkpoint/x' }) !== null
    && blockGrund({ status: 200, text: 'Access denied for this request' }) !== null
    && blockGrund({ status: 200, url: 'https://www.facebook.com/ads/library/', text: 'Werbebibliothek' }) === null);
  pruefe('CSV: Komma und Anführungszeichen überleben Schreiben und Lesen',
    JSON.stringify(csvLesen(csvZeile(['a,b', 'x"y', 'z']))) === JSON.stringify(['a,b', 'x"y', 'z']));
  pruefe('Suchadresse: Land CH, nur aktive Anzeigen, Suchbegriff URL-kodiert',
    metaUrl('c&a').includes('country=CH') && metaUrl('c&a').includes('active_status=active') && metaUrl('c&a').includes('q=c%26a'));

  const ok = pruefungen.filter(([, b]) => b).length;
  for (const [name, b] of pruefungen) console.log(`${b ? 'OK     ' : 'FEHLER '} ${name}`);
  console.log(`SELBSTTEST ${ok}/${pruefungen.length} bestanden`);
  return ok === pruefungen.length;
}

// ---------- Einstieg (nur bei direktem Aufruf) ----------

/** Browser-Seite zuletzt: Ein Sammel-Stub, damit Node nicht auf offene Handles wartet. */
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv.includes('--selbsttest')) {
    process.exit(selbsttest() ? 0 : 1);
  }
  const wache = setTimeout(() => {
    lauf.quelle.status = `${lauf.quelle.status} · Gesamt-Zeitlimit ${WATCHDOG_MS / 1000} s erreicht, Lauf abgebrochen`;
    const r = abschlussJetzt();
    console.log(`[werbe_konkurrenz] Watchdog: Auswertung ${r ? r.md : '(schon geschrieben)'}`);
    process.exit(0);
  }, WATCHDOG_MS);
  main().then(
    () => { clearTimeout(wache); process.exit(0); },
    (e) => { clearTimeout(wache); console.error(`werbe_konkurrenz: ${kurz(e)}`); process.exit(1); },
  );
}
