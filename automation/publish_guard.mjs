#!/usr/bin/env node
/**
 * publish_guard.mjs (v2, 19.10.2026) — zieht fehlende VERKAUFSKANÄLE für aktive Produkte nach, OHNE bewusste
 * Kanal-Ausschlüsse rückgängig zu machen.
 * (Der am häufigsten wiederholte Handgriff: nach create-product wird nicht automatisch in alle Kanäle publiziert.)
 *
 * ANLASS (Betreiber 19.10. «nutze das und verbessere es», Idee aus Codex-PR #2673, dort geprüft und NICHT übernommen):
 * die v1 zog für jedes aktive Produkt «alle Kanäle ausser Point of Sale» nach — mit `LIVE=1` allein. GEMESSEN 19.10.
 * (nur lesend, v1 im Trockenlauf SCAN=3000 / productsCount über den ganzen Katalog):
 *   • v1 meldete 2'971 von 3'000 Produkten als «Kanal fehlt» (99 %). Echte Lücke hatten 31: «Inbox» fehlt bei 2'970
 *     (ganzer Katalog 55'007 von 55'837), «Luxe Style Headless» bei 1'290 (ganz 7'430) — beides keine Verkaufsfläche.
 *   • Die echten Lücken (ganzer Katalog, Online Store/Shop/TikTok/Facebook & Instagram/Pinterest): 205 Produkte —
 *     203 davon sind ABSICHT (Sperr-Tag 162, Ledger 136, social-pause-Fenster 55; Mehrfachtreffer), die 2 übrigen sind
 *     Schwert-Titel, die die Klingenregel kennt → 205 von 205 erklärt. v1 mit LIVE hätte sie alle wieder geöffnet.
 *   • Google & YouTube: GEMESSEN 19.10.2026 ~18:50 UTC (Admin-API, nur lesend, productsCount = 1'892 Lücken): 809 durch Tag/Ledger/
 *     Fenster/Klingenregel erklärt; von den übrigen 1'083 trifft bei 1'057 eine TITELregel der Python-Publizierer
 *     (google_sperrliste.ist_heikel über Titel+Typ+Tags: Kostüm, Maske, Feuerzeug, Waffe, CBD …; 108 davon auch ist_kostuem),
 *     26 trifft keine Regel (z. B. Länder-Caps «Flag-Cap Frankreich», «Hochfrequenz-Elektrotherapie-Stab») → Google ist KEIN Ziel
 *     (siehe unten). Ein Tag-Wächter dürfte Google nie anfassen. (Zweitmessung eines Prüfers mit ist_heikel(Titel, Typ) ohne Tags: 1'036 Treffer,
 *     47 ohne Regel; nur Titel: 345 — die Zahlen hängen an den Eingaben, die Folgerung nicht.)
 *
 * WAS v2 TUT
 *   Ziele = Online Store · Shop · TikTok · Facebook & Instagram · Pinterest (Positivliste nach Kanalname; ein NEUER oder
 *   umbenannter Kanal wird nicht angefasst, aber unter `ignoredChannels` gemeldet). NIE: Point of Sale, Inbox, Google & YouTube
 *   (eigene Publizierer mit Titelregeln: google_kanal_nachziehen.py u. a.; `INCLUDE_GOOGLE` wird abgelehnt, Exit 2).
 *   «Luxe Style Headless» nur mit INCLUDE_HEADLESS=1 (Zweck unbekannt, Journal 09.10.).
 *   SCHREIBEN NUR MIT ZWEI SCHALTERN: LIVE=1 UND APPROVE_PUBLISH=1. Nur LIVE=1 → lesender Lauf, aber LAUT: Report
 *   `liveRequested:true, live:false, grund`, dazu eine Zeile «::warning::» (GitHub-Annotation). Der Aufrufer
 *   (.github/workflows/shop-guards.yml) setzt beide bewusst.
 *   SPERRLOGIK (ein Produkt mit auch nur EINEM Treffer wird ganz übersprungen, `skipped_sperre`):
 *     Tags   — aus dem CODE gelesen, nicht abgeschrieben: AUSSCHLUSS_TAGS (automation/google_sperrliste.py) und
 *              ALLE_WERBEKANAELE (automation/google_sperrtags_durchsetzen.py); Präfixe google-gesperrt (TAG_PRAEFIX),
 *              google-kanal-, social-pause; Namensmuster nicht-…-bewerben, …-raus-JJJJ, compliance-pruefen.
 *              (Neue Sperr-Tags in der Python-Liste gelten damit automatisch auch hier.)
 *     Ledger — Produkt-IDs aus dropship/_merchant_issue_done.txt, _merchant_sperre_durchgesetzt.txt,
 *              _google_kanal_gesaeubert.txt, _google_kanal_gesaeubert2.txt, _google_sperrtags_durchgesetzt.txt
 *              (überleben, wenn ein Tag am Produkt fehlt: allein dadurch erklärt 4 der 205 Lücken)
 *     Fenster— dropship/_social_pause.txt (Anlass-Sperre, nur im Fenster) und dropship/_werbetest_sperre.txt
 *              (Werbetest «geschenke-test»: Produkte nicht schreiben, auch nicht publizieren)
 *     Titel  — Klingenregel (klingenregel.mjs istKlinge): Klingen sind kein Werbeprodukt
 *     Titel (Python) — Feuerzeug, Heil-Schmuck, Schusswaffen-Zubehör: google_sperrliste.ist_feuerzeug/ist_heilschmuck/ist_schusswaffen_zubehoer,
 *              ZUR LAUFZEIT aus dem Python-Modul gefragt (python3 -I, ein Aufruf für alle Kandidaten) — kein Spiegel in JS. Grund: diese
 *              drei Klassen gelten laut google_sperrtags_durchsetzen.py für ALLE Werbekanäle (smoke-zubehoer / nicht-bewerben+heilschmuck /
 *              waffe-pruefen ∈ ALLE_WERBEKANAELE), werden aber erst vom TÄGLICHEN Durchsetzer getaggt — ein frisch importiertes, noch
 *              ungetaggtes Feuerzeug (kein Importer kennt die Klasse) hätte dieser Wächter sonst nach TikTok/FB-IG/Pinterest gestellt.
 *              Kostüm ist bewusst NICHT dabei: «kostuem» ist nur eine Google-Sperre (∉ ALLE_WERBEKANAELE).
 *   FAIL-CLOSED: Ist eine Sperrquelle nicht lesbar (Datei fehlt, Parser/Kanarienvogel schlägt an), gilt «unklar» → es wird
 *   NICHT geschrieben (Report `sperrquellen.status:'unklar'`, Exit 1, «::error::»), nie «keine Sperre». Dazu gehören seit 19.10.:
 *   • Werbetest-Datei mit Zeilen, aber ohne gültigen Kopf «# ende: JJJJ-MM-TT» (die Lib liest sie sonst als «leer»), oder mit einer
 *     Zeile ohne lesbare Produkt-ID; • Pause-Datei mit unlesbarem Kopf «# anlass<TAB>ab<TAB>bis» oder Schlüsseln ohne Kopf;
 *   • JEDES Ledger unter seiner Untergrenze (LEDGER_MIN, ≈ 50 % des Stands vom 19.10.) — nicht nur «alle leer»;
 *   • die Titelregeln: python3 fehlt/stürzt ab, oder ihre eigenen Kanarien (feuerzeug_/heilschmuck_/schusswaffen_kanarien) fehlen;
 *   • ein JS-Modul der Sperrlogik ist nicht ladbar (klingenregel/social_pause/werbetest_sperre) — mit Namen statt Stack-Trace.
 *   ABHÄNGIGKEITEN (GEMESSEN 19.10.: alle 15 fehlen auf origin/main — google_sperrliste.py, google_sperrtags_durchsetzen.py, klingenregel.mjs/.json,
 *   lib/social_pause.mjs, lib/werbetest_sperre.mjs, data/heilschmuck_regel.json, automation/data/schusswaffen_zubehoer_regel.json, die fünf
 *   Ledger, _social_pause.txt, _werbetest_sperre.txt): CI prüft den Stand von main. Landet nur Wächter+Workflow dort, ist der Lauf rot
 *   («unklar», Exit 1, alle fehlenden Quellen in einer Meldung) — der Strang muss GEMEINSAM mit ihnen nach main.
 *   FEHLER WERDEN NICHT VERSCHLUCKT: je Produkt `state` = published | skipped_sperre | userErrors | unknown | offen, dazu
 *   Zähler; GraphQL-/Netz-/OAuth-Fehler sind Fehler (Exit 1), nicht «no-op». Nach 5 Schreibfehlern in Folge stoppt die Schleife.
 *   HOST-PRÜFUNG: SHOPIFY_SHOP muss ^[a-z0-9][a-z0-9-]*\.myshopify\.com$ treffen, BEVOR irgendein Schlüssel an einen Host
 *   geht; sonst Exit 2 ohne eine einzige Netzanfrage (der Wert wird nicht ausgegeben — er könnte ein vertauschter Schlüssel sein).
 *
 * EXIT: 0 = ok (auch lesender Lauf, auch «nichts zu tun», auch kein SHOPIFY_SHOP = No-op für Forks) · 1 = Fehler
 *       (Produkt-/Hauptfehler, Sperrquelle unklar) · 2 = Aufruf/Konfiguration (unbekannter Schalter, Host, SCAN, INCLUDE_GOOGLE).
 *
 *   node automation/publish_guard.mjs                 Trockenlauf (Default)
 *   LIVE=1 APPROVE_PUBLISH=1 node automation/publish_guard.mjs      schreibt (nur nicht gesperrte Produkte)
 *   node automation/publish_guard.mjs --zeile         EINE Zeile «PUBLISH-GUARD: …» für die Keepalive-Meldung (immer lesend)
 *   node automation/publish_guard.mjs --selbsttest    offline: Parser, Kanarien (Tag/Ledger/Titel), Host-Regex, Quellen
 * BRAUCHT: node 22 und python3 (Titelregeln, `python3 -I`; fehlt es, ist das Ergebnis «unklar», nie «keine Treffer»).
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET; die Client-Credentials gehen vor)
 *      [SCAN=250, max 3000: zuletzt geänderte] [PQUERY="status:active AND tag:…"] [INCLUDE_HEADLESS=1]
 * Tests: automation/publish_guard_test.mjs (Fake-fetch, offline) · Muster: automation/lib/fake_fetch_preload.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Die drei JS-Module der Sperrlogik werden DYNAMISCH geladen: fehlt eines (Stand von main, siehe Kopf), meldet der Wächter «unklar»
// mit dem Namen statt mit einem Stack-Trace — und schreibt nichts (sperrQuellenLaden nimmt die Probleme auf).
const modulProbleme = [];
async function modul(rel) {
  try { return await import(rel); }
  catch (e) { modulProbleme.push(`automation/${rel.slice(2)}: Modul nicht ladbar (${e.code || e.name})`); return null; }
}
const klingen = await modul('./klingenregel.mjs');
const socialPause = await modul('./lib/social_pause.mjs');
const werbetest = await modul('./lib/werbetest_sperre.mjs');

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DROPSHIP = path.join(HIER, '..', 'dropship');
const API = '2026-01';
const SCAN_MAX = 3000, SCAN_STANDARD = 250;
const FEHLER_SERIE_MAX = 5;          // so viele Schreibfehler in Folge, dann stoppt die Schleife
const BERICHT_MAX = 300;             // Produktzeilen im Report

// ── Host ───────────────────────────────────────────────────────────────────────────────────────────────
export const HOST_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
export const hostOk = s => typeof s === 'string' && HOST_RE.test(s);

// ── Kanäle: Positivliste nach Name (Raw-Admin-API: «Online Store»; die MCP-Werkzeuge nennen ihn «Onlineshop») ────
const ZIEL_KANAELE = [
  /^(?:online store|onlineshop|online-shop)$/i, /^shop$/i, /^tiktok$/i, /^facebook (?:&|und|and) instagram$/i, /^pinterest$/i,
];
const HEADLESS = /headless/i;
/** Zerlegt die Publikationen in Ziele und Ignorierte. Google, Inbox, Point of Sale und alles Unbekannte ist nie Ziel. */
export function kanalWahl(pubs, { headless = false } = {}) {
  const ziel = [], ignoriert = [];
  for (const p of pubs) (ZIEL_KANAELE.some(re => re.test(p.name.trim())) || (headless && HEADLESS.test(p.name)) ? ziel : ignoriert).push(p);
  return { ziel, ignoriert };
}

// ── Sperrquellen ───────────────────────────────────────────────────────────────────────────────────────
const PRAEFIXE_FEST = ['google-kanal-', 'social-pause'];   // google-gesperrt kommt aus TAG_PRAEFIX (Python)
// Namensmuster: «nicht-bewerben», «nicht-<kanal>-bewerben» UND «<grund>-nicht-bewerben» (adult-/lizenz-/messer-/niedrig-bewertet-nicht-bewerben stehen
// alle in der Python-Liste; GEMESSEN 19.10. an allen 4'122 Tags: «lizenzware-nicht-bewerben» (0 aktive Träger) war weder dort noch hier gedeckt).
const MUSTER = [/^(?:[a-z0-9]+-)*nicht-(?:[a-z0-9]+-)*bewerben$/, /-raus-\d{4}/, /^compliance-pruefen$/];
// Untergrenze Produkt-IDs je Ledger (≈ 50 % des Stands vom 19.10.2026: 17 / 16 / 156 / 12 / 206). Ein abgeschnittenes oder geleertes Ledger ist «unklar»,
// nicht «ok» — der Tag-Schutz allein deckt nicht alles (4 der 205 Lücken erklärt nur das Ledger). Wer ein Ledger bewusst verdichtet, senkt die Zahl mit Begründung.
export const LEDGER_MIN = Object.freeze({ '_merchant_issue_done.txt': 8, '_merchant_sperre_durchgesetzt.txt': 8, '_google_kanal_gesaeubert.txt': 78,
  '_google_kanal_gesaeubert2.txt': 6, '_google_sperrtags_durchgesetzt.txt': 100 });
const LEDGER = Object.keys(LEDGER_MIN);
// Kanarien: diese Tags MÜSSEN in den gelesenen Python-Mengen stehen (sonst Parserfehler/gekürzte Liste → unklar)
const KANARIEN_AUSSCHLUSS = ['nicht-bewerben', '18plus', 'google-policy-flag', 'nicht-google-bewerben', 'waffe-pruefen'];
const KANARIEN_WERBUNG = ['nicht-bewerben', '18plus', 'adult-nicht-bewerben', 'smoke-zubehoer'];

/** Liest `NAME = { "a", 'b', # Kommentar … }` aus Python-Quelltext (Kommentare und Strings werden beachtet). null = nicht lesbar. */
export function pythonMenge(text, name) {
  const m = new RegExp(`^${name}\\s*=\\s*\\{`, 'm').exec(String(text));
  if (!m) return null;
  const s = String(text), out = new Set();
  let i = m.index + m[0].length;
  while (i < s.length) {
    const c = s[i];
    if (c === '}') return out;
    if (c === '#') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, wert = '';
      while (j < s.length && s[j] !== c && s[j] !== '\n') { if (s[j] === '\\') j++; wert += s[j] ?? ''; j++; }
      if (s[j] !== c) return null;
      if (wert.trim()) out.add(wert.trim().toLowerCase());
      i = j + 1; continue;
    }
    if (c === '{' || c === '(' || c === '[') return null;   // verschachtelt/anderer Aufbau: nicht raten
    i++;
  }
  return null;   // nie geschlossen
}
/** `NAME = "wert"` → "wert" (null wenn nicht gefunden). */
export function pythonString(text, name) {
  const m = new RegExp(`^${name}\\s*=\\s*(["'])([^"'\\n]*)\\1`, 'm').exec(String(text));
  return m ? m[2] : null;
}
export const idZahl = x => { const m = /(\d{6,})\s*$/.exec(String(x ?? '')); return m ? m[1] : ''; };
/** Produkt-IDs aus beliebigen Ledger-Zeilen: gid://shopify/Product/<n> oder eine freistehende 13–16-stellige Zahl. */
export function idsAusText(text) {
  const ids = new Set();
  for (const m of String(text).matchAll(/Product\/(\d{6,})|(?<![\d/])(\d{13,16})(?!\d)/g)) ids.add(m[1] || m[2]);
  return ids;
}

/**
 * Prüft den TEXT der Werbetest-Datei auf Lesbarkeit (fail-closed; leere Liste = in Ordnung). `werbetest.lesen` liest eine Datei ohne gültigen
 * Kopf «# ende: JJJJ-MM-TT» als «leer» und überspringt Zeilen ohne lesbare ID still — beides würde die 13 Test-Produkte freigeben, ohne dass es
 * jemand merkt. Hier ist es ein Problem, sobald die Datei Produktzeilen hat. Leer/nur Kommentare und ein abgelaufenes Ende sind dagegen
 * legitim (es gibt nichts zu schützen). Die Zeilenprobe fragt die Lib selbst (ein Parser, kein Spiegel).
 */
export function werbetestProbleme(text, heute) {
  if (!werbetest) return [];
  const zeilen = [];
  String(text).split('\n').forEach((roh, i) => {
    const z = roh.trim();
    if (z && !z.startsWith('#')) { const inhalt = z.split('#')[0].trim(); if (inhalt) zeilen.push([i + 1, inhalt]); }
  });
  if (!zeilen.length) return [];
  const { ende } = werbetest.lesen(text, heute);
  if (ende === null) return [`Kopf «# ende: JJJJ-MM-TT» fehlt oder ist ungültig, aber ${zeilen.length} Produktzeile(n) vorhanden — die Sperre würde nicht gelten`];
  if (heute > ende) return [];
  const schlecht = zeilen.filter(([, t]) => werbetest.lesen('# ende: 2999-12-31\n' + t, '2000-01-01').ids.size !== 1).map(([n]) => n);
  return schlecht.length ? [`Zeile ${schlecht.slice(0, 5).join(', ')}${schlecht.length > 5 ? ' …' : ''}: keine lesbare Produkt-ID — das Produkt wäre nicht gesperrt`] : [];
}

/**
 * Prüft den TEXT der Pause-Datei (fail-closed). `pauseSchluessel` ignoriert Schlüssel ohne gültigen Kopf «# anlass<TAB>ab<TAB>bis» und jede
 * andere «#»-Zeile setzt das Fenster zurück — die Halloween-Ware käme dann in die Werbekanäle. Die Datei schreibt anlass_social_sperre.py
 * maschinell (genau ein Kopf je Anlass); eine Abweichung ist ein Fehler, kein Kommentar.
 */
export function pauseProbleme(text) {
  const m = []; let kopf = false;
  String(text).split('\n').forEach((roh, i) => {
    const z = roh.trim(); if (!z) return;
    if (z.startsWith('#')) {
      const [, ab, bis] = z.slice(1).trim().split('\t'), a = Date.parse(ab), b = Date.parse(bis);
      kopf = !!ab && !!bis && !Number.isNaN(a) && !Number.isNaN(b) && a < b;
      if (!kopf) m.push(`Zeile ${i + 1}: Kopf «# anlass<TAB>ab<TAB>bis» fehlt oder ist ungültig — die Schlüssel darunter würden nicht gelten`);
    } else if (!kopf) m.push(`Zeile ${i + 1}: Schlüssel ohne gültigen Kopf davor — würde nicht gelten`);
  });
  return m.slice(0, 5);
}

// ── Titelregeln der Python-Publizierer (Einzelquelle: automation/google_sperrliste.py) ──────────────────────────
// Ein Aufruf für alle Kandidaten; Quelltext nur ASCII (weder Locale noch Argumentkodierung spielen mit), Ein-/Ausgabe sind JSON. Die Kanarien der
// drei Regeln laufen bei JEDEM Aufruf mit — fehlt eine Funktion oder fällt ein Kanarienvogel, ist das Ergebnis «unklar» (nie «keine Treffer»).
const PY_TITEL = [
  'import sys, json',
  'sys.path.insert(0, sys.argv[1])',
  'import google_sperrliste as gs',
  'a = json.loads(sys.stdin.buffer.read().decode("utf-8"))',
  'kan = {}',
  'for name, fn in (("feuerzeug", gs.feuerzeug_kanarien), ("heilschmuck", gs.heilschmuck_kanarien), ("schusswaffen", gs.schusswaffen_kanarien)):',
  '    n, f = fn()',
  '    kan[name] = [int(n), len(f)]',
  'u = []',
  'for p in a:',
  '    t, ty, tg = p.get("title") or "", p.get("type") or "", p.get("tags") or []',
  '    g = []',
  '    if gs.ist_feuerzeug(t, ty): g.append("titel:feuerzeug")',
  '    if gs.ist_heilschmuck(t): g.append("titel:heilschmuck")',
  '    s = gs.ist_schusswaffen_zubehoer(t, ty, tg)',
  '    if s: g.append("titel:schusswaffen-zubehoer(" + str(s)[:40] + ")")',
  '    u.append(g)',
  'sys.stdout.write(json.dumps({"kanarien": kan, "urteile": u}))',
].join('\n');

/**
 * Fragt ist_feuerzeug / ist_heilschmuck / ist_schusswaffen_zubehoer für Einträge {title, type, tags} per `python3 -I`.
 * {ok:true, urteile:[[Gründe]…], kanarien} oder {ok:false, grund}. Leere Eintragsliste = reine Kanarienprobe.
 */
export function titelRegelnPython(eintraege, { automationDir = HIER, python = 'python3', timeout = 60000 } = {}) {
  const r = spawnSync(python, ['-I', '-c', PY_TITEL, automationDir], { input: JSON.stringify(eintraege), encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024,
    env: { PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' } });
  if (r.error) return { ok: false, grund: `${python} nicht ausführbar (${r.error.code || r.error.name})` };
  if (r.status !== 0) return { ok: false, grund: `Python endete mit Status ${r.status ?? r.signal}: ${String(r.stderr || '').trim().split('\n').pop().slice(0, 140)}` };
  let j; try { j = JSON.parse(r.stdout); } catch { return { ok: false, grund: 'Antwort ist kein JSON' }; }
  const kan = j?.kanarien;
  if (!kan || typeof kan !== 'object' || !Array.isArray(j.urteile) || j.urteile.length !== eintraege.length || j.urteile.some(u => !Array.isArray(u) || u.some(x => typeof x !== 'string')))
    return { ok: false, grund: 'Antwort hat nicht die erwartete Form' };
  const schlecht = ['feuerzeug', 'heilschmuck', 'schusswaffen'].filter(k => !Array.isArray(kan[k]) || !(kan[k][0] > 0) || kan[k][1] !== 0);
  if (schlecht.length) return { ok: false, grund: `Kanarien fehlgeschlagen oder leer: ${schlecht.map(k => `${k} ${JSON.stringify(kan[k] ?? null)}`).join(', ')}` };
  return { ok: true, urteile: j.urteile, kanarien: kan };
}

/**
 * Lädt ALLE Sperrquellen. Jede nicht lesbare Quelle landet in `probleme` → ok:false → der Aufrufer schreibt nicht.
 * (Eine fehlende Datei ist hier «unklar», nicht «leer» — anders als bei den Lesern der Quell-Bibliotheken.)
 */
export function sperrQuellenLaden({ automationDir = HIER, dropshipDir = DROPSHIP, werbetestDatei = werbetest?.DATEI ?? path.join(dropshipDir, '_werbetest_sperre.txt'),
  jetzt = new Date(), python = 'python3' } = {}) {
  const probleme = [...modulProbleme], q = { tags: new Set(), praefixe: [...PRAEFIXE_FEST], ids: new Map(), pause: new Set(), wtIds: new Set(), wtHandles: new Set(),
    stat: { ausschlussTags: 0, werbekanalTags: 0, ledgerIds: 0, pausenSchluessel: 0, werbetestIds: 0, titelKanarien: 0 } };
  const lies = (datei, was) => { try { return fs.readFileSync(datei, 'utf8'); } catch (e) { probleme.push(`${was}: nicht lesbar (${e.code || 'Fehler'})`); return null; } };

  const sl = lies(path.join(automationDir, 'google_sperrliste.py'), 'automation/google_sperrliste.py');
  if (sl !== null) {
    const a = pythonMenge(sl, 'AUSSCHLUSS_TAGS'), pf = pythonString(sl, 'TAG_PRAEFIX');
    if (!a || a.size < 12 || KANARIEN_AUSSCHLUSS.some(k => !a.has(k))) probleme.push('google_sperrliste.py: AUSSCHLUSS_TAGS nicht lesbar oder Kanarienvogel fehlt');
    else { for (const t of a) q.tags.add(t); q.stat.ausschlussTags = a.size; }
    if (!pf || !pf.startsWith('google-')) probleme.push('google_sperrliste.py: TAG_PRAEFIX nicht lesbar');
    else q.praefixe.push(pf.toLowerCase());
    const tk = titelRegelnPython([], { automationDir, python });   // reine Kanarienprobe: vor jeder Netzanfrage
    if (!tk.ok) probleme.push('google_sperrliste.py: Titelregeln unklar — ' + tk.grund);
    else q.stat.titelKanarien = Object.values(tk.kanarien).reduce((n, k) => n + k[0], 0);
  }
  /** Urteile der Titelregeln für Produkte → Map(id → Gründe). Wirft bei jedem Fehler (der Aufrufer schreibt dann nichts). */
  q.titelUrteile = prods => {
    const r = titelRegelnPython(prods.map(p => ({ title: p.title, type: p.productType || '', tags: p.tags })), { automationDir, python });
    if (!r.ok) throw new Error('Titelregeln unklar — es wird NICHT geschrieben: ' + r.grund);
    return new Map(prods.map((p, i) => [p.id, r.urteile[i]]));
  };
  const sd = lies(path.join(automationDir, 'google_sperrtags_durchsetzen.py'), 'automation/google_sperrtags_durchsetzen.py');
  if (sd !== null) {
    const w = pythonMenge(sd, 'ALLE_WERBEKANAELE');
    if (!w || w.size < 6 || KANARIEN_WERBUNG.some(k => !w.has(k))) probleme.push('google_sperrtags_durchsetzen.py: ALLE_WERBEKANAELE nicht lesbar oder Kanarienvogel fehlt');
    else { for (const t of w) q.tags.add(t); q.stat.werbekanalTags = w.size; }
  }
  for (const f of LEDGER) {
    const t = lies(path.join(dropshipDir, f), `dropship/${f}`);
    if (t === null) continue;
    const ids = idsAusText(t);
    if (ids.size < LEDGER_MIN[f]) probleme.push(`dropship/${f}: nur ${ids.size} Produkt-IDs, Untergrenze ${LEDGER_MIN[f]} (abgeschnitten oder geleert?)`);
    for (const id of ids) if (!q.ids.has(id)) q.ids.set(id, f);
  }
  q.stat.ledgerIds = q.ids.size;

  const pa = path.join(dropshipDir, '_social_pause.txt'), pt = socialPause ? lies(pa, 'dropship/_social_pause.txt') : null;
  if (pt !== null) {
    probleme.push(...pauseProbleme(pt).map(m => 'dropship/_social_pause.txt: ' + m));
    q.pause = socialPause.pauseSchluessel(pa, jetzt); q.stat.pausenSchluessel = q.pause.size;
  }
  const wt = werbetest ? lies(werbetestDatei, 'dropship/_werbetest_sperre.txt') : null;
  if (wt !== null) {
    const heute = jetzt.toISOString().slice(0, 10), r = werbetest.lesen(wt, heute);
    probleme.push(...werbetestProbleme(wt, heute).map(m => 'dropship/_werbetest_sperre.txt: ' + m));
    q.wtIds = r.ids; q.wtHandles = r.handles; q.stat.werbetestIds = r.ids.size;
  }
  return { ok: !probleme.length, probleme, ...q };
}

/** Gründe, warum ein Produkt NICHT nachpubliziert werden darf (leer = frei). Reine Funktion, testbar. `q.titel` (Map id → Gründe) setzt der Lauf. */
export function sperrGruende(p, q) {
  const g = [], num = idZahl(p.id), handle = String(p.handle || '').toLowerCase();
  for (const t of p.tags.map(x => String(x).trim().toLowerCase())) {
    if (q.tags.has(t)) g.push('tag:' + t);
    else if (q.praefixe.some(x => t.startsWith(x))) g.push('praefix:' + t);
    else if (MUSTER.some(re => re.test(t))) g.push('muster:' + t);
  }
  if (q.ids.has(num)) g.push('ledger:' + q.ids.get(num));
  if (q.pause.has('pid:' + num) || q.pause.has('h:' + handle)) g.push('social-pause-fenster');
  if (q.wtIds.has(num) || q.wtHandles.has(handle)) g.push('werbetest-sperre');
  if (!klingen) g.push('regel-fehlt:klingenregel');
  else if (klingen.istKlinge(p.title)) g.push('titel:klinge');
  for (const r of q.titel?.get(p.id) ?? []) g.push(r);
  return g;
}

// ── Produkt prüfen ─────────────────────────────────────────────────────────────────────────────────────
/** {ok:true, have:Set} oder {ok:false, grund}. Alles, was nicht eindeutig lesbar ist, ist «unklar» und wird nie geschrieben. */
export function produktPruefen(p) {
  if (!p || typeof p !== 'object') return { ok: false, grund: 'Produkt ist kein Objekt' };
  if (typeof p.id !== 'string' || !/^gid:\/\/shopify\/Product\/\d+$/.test(p.id)) return { ok: false, grund: 'Produkt-ID fehlt oder ist ungültig' };
  if (typeof p.handle !== 'string' || !p.handle) return { ok: false, grund: 'Handle fehlt' };
  if (typeof p.title !== 'string') return { ok: false, grund: 'Titel fehlt' };
  if (typeof p.status !== 'string') return { ok: false, grund: 'Status fehlt' };
  if (!Array.isArray(p.tags) || p.tags.some(t => typeof t !== 'string')) return { ok: false, grund: 'Tags fehlen oder sind ungültig (keine Veröffentlichung)' };
  const n = p.resourcePublications?.nodes;
  if (!Array.isArray(n) || n.some(x => typeof x?.publication?.id !== 'string' || typeof x.isPublished !== 'boolean'))
    return { ok: false, grund: 'Bestehende Kanalzuordnungen fehlen oder sind ungültig' };
  return { ok: true, have: new Set(n.filter(x => x.isPublished).map(x => x.publication.id)) };
}

// ── Shopify ────────────────────────────────────────────────────────────────────────────────────────────
const warte = ms => new Promise(r => setTimeout(r, ms));
const RETRY_MAX = 4;   // 2 s, 4 s, 8 s, 16 s bei THROTTLED / HTTP 429 / 5xx
async function token({ SHOP, TOK_ST, CID, CS }) {
  if (CID && CS) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CS, grant_type: 'client_credentials' }) });
    if (!r.ok) throw new Error(`OAuth: HTTP ${r.status}`);   // nur der Statuscode, nie Antwort-Inhalt oder Schlüssel
    const j = await r.json().catch(() => null);
    if (typeof j?.access_token !== 'string' || !j.access_token) throw new Error('OAuth: Antwort enthält keinen Token');
    return j.access_token;
  }
  return TOK_ST || '';
}
async function gql(SHOP, tok, query, variables) {
  for (let versuch = 0; ; versuch++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60000),
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query, variables }) });
    if ((r.status === 429 || r.status >= 500) && versuch < RETRY_MAX) { await warte(2000 * 2 ** versuch); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json().catch(() => { throw new Error('Antwort ist kein JSON'); });
    if (Array.isArray(j.errors) && j.errors.length) {
      if (versuch < RETRY_MAX && j.errors.some(e => e?.extensions?.code === 'THROTTLED')) { await warte(2000 * 2 ** versuch); continue; }
      throw new Error('GraphQL: ' + JSON.stringify(j.errors.map(e => e?.message ?? '?')).slice(0, 300));
    }
    if (!j.data || typeof j.data !== 'object') throw new Error('GraphQL: Antwort ohne data');
    return j.data;
  }
}
const Q_PUBLICATIONS = '{ publications(first:25){ nodes{ id name } } }';
const Q_PRODUCTS = `query($c:String,$q:String){ products(first:50, after:$c, sortKey:UPDATED_AT, reverse:true, query:$q){ pageInfo{hasNextPage endCursor}
  nodes{ id handle title productType status tags resourcePublications(first:25){ nodes{ isPublished publication{ id } } } } } }`;
const M_PUBLISH = 'mutation($id:ID!,$input:[PublicationInput!]!){ publishablePublish(id:$id, input:$input){ userErrors{ field message } } }';

// ── Konfiguration ──────────────────────────────────────────────────────────────────────────────────────
const SCHALTER = new Set(['--selbsttest', '--zeile', '--help', '-h']);
export function konfig(env, zeile = false) {
  const flag = n => /^(?:1|true|ja)$/i.test(String(env[n] ?? '').trim());
  const scanRoh = String(env.SCAN ?? '').trim();
  const c = { SHOP: String(env.SHOPIFY_SHOP ?? '').trim(), TOK_ST: env.SHOPIFY_ADMIN_TOKEN || '', CID: env.SHOPIFY_CLIENT_ID || '', CS: env.SHOPIFY_CLIENT_SECRET || '',
    liveRequested: env.LIVE === '1', approved: env.APPROVE_PUBLISH === '1', headless: flag('INCLUDE_HEADLESS'),
    pquery: env.PQUERY || 'status:active', fehler: [] };
  if (scanRoh && !/^\d+$/.test(scanRoh)) c.fehler.push('SCAN ist keine ganze Zahl');
  else if (scanRoh && +scanRoh < 1) c.fehler.push('SCAN muss mindestens 1 sein');
  c.scan = Math.min(scanRoh ? +scanRoh : SCAN_STANDARD, SCAN_MAX);
  if (flag('INCLUDE_GOOGLE')) c.fehler.push('INCLUDE_GOOGLE wird nicht unterstützt: Google & YouTube gehört den Google-Publizierern (Titelregeln für Kostüm/Maske/Feuerzeug/Heil-Schmuck stehen nur dort)');
  if (zeile) { c.liveRequested = false; c.approved = false; if (!scanRoh) c.scan = SCAN_STANDARD; }   // --zeile schreibt NIE
  c.live = c.liveRequested && c.approved;
  return c;
}

// ── Lauf ───────────────────────────────────────────────────────────────────────────────────────────────
/** Führt einen Lauf aus und gibt {bericht, exit} zurück (schreibt nichts auf stdout; das macht der Aufrufer). */
export async function lauf(c, quellenLaden = sperrQuellenLaden) {
  const rb = { ts: new Date().toISOString(), version: 'v2', live: false, liveRequested: c.liveRequested, publishApproved: c.approved,
    modus: 'lesend', query: c.pquery, scan: c.scan };
  const meldungen = [];   // GitHub-Annotationen: [art, text]
  let exit = 0;
  const hauptfehler = m => { rb.hauptfehler = m; meldungen.push(['error', m]); exit = 1; };
  if (!c.SHOP) { rb.noop = 'kein SHOPIFY_SHOP'; return { bericht: rb, exit: 0, meldungen }; }
  if (!hostOk(c.SHOP)) { rb.hauptfehler = `SHOPIFY_SHOP ist kein gültiger *.myshopify.com-Host (Länge ${c.SHOP.length}) — keine Netzanfrage gesendet`; meldungen.push(['error', rb.hauptfehler]); return { bericht: rb, exit: 2, meldungen }; }
  if (!(c.CID && c.CS) && !c.TOK_ST) { rb.noop = 'keine Shopify-Zugangsdaten'; return { bericht: rb, exit: 0, meldungen }; }

  const sq = quellenLaden();
  rb.sperrquellen = { status: sq.ok ? 'ok' : 'unklar', ...(sq.stat || {}), ...(sq.ok ? {} : { probleme: sq.probleme }) };
  if (!sq.ok) {   // fail-closed: ohne verlässliche Sperrliste weiss niemand, was Absicht ist — also keine Anfrage, kein Schreiben
    if (c.liveRequested) rb.grund = 'Sperrquelle unklar (fail-closed)';
    hauptfehler('Sperrquelle unklar — fail-closed, es wird NICHT geschrieben: ' + sq.probleme.join('; '));
    return { bericht: rb, exit, meldungen };
  }
  rb.live = c.live;
  rb.modus = rb.live ? 'schreibend' : 'lesend';
  if (c.liveRequested && !c.approved) {
    rb.grund = 'LIVE=1 ohne APPROVE_PUBLISH=1 — lesender Lauf, es wird nichts geschrieben';
    meldungen.push(['warning', 'LIVE=1 gesetzt, aber APPROVE_PUBLISH=1 fehlt — es wird NICHT geschrieben (lesender Lauf)']);
  } else if (c.approved && !c.liveRequested) rb.grund = 'APPROVE_PUBLISH=1 ohne LIVE=1 — lesender Lauf';
  else if (!c.live) rb.grund = 'Trockenlauf (LIVE nicht gesetzt)';

  try {
    const tok = await token(c);
    const pd = await gql(c.SHOP, tok, Q_PUBLICATIONS);
    if (!Array.isArray(pd?.publications?.nodes) || pd.publications.nodes.some(p => typeof p?.id !== 'string' || typeof p.name !== 'string'))
      throw new Error('Publications: Antwort enthält keine gültige Kanalliste');
    const { ziel, ignoriert } = kanalWahl(pd.publications.nodes, { headless: c.headless });
    rb.targetChannels = ziel.map(p => p.name); rb.ignoredChannels = ignoriert.map(p => p.name);
    if (!ziel.length) throw new Error('Publications: kein Zielkanal gefunden (Kanalnamen geändert?)');
    const zielId = new Set(ziel.map(p => p.id)), name = new Map(ziel.map(p => [p.id, p.name]));

    let prods = [], cur = null;
    while (prods.length < c.scan) {
      const d = await gql(c.SHOP, tok, Q_PRODUCTS, { c: cur, q: c.pquery });
      if (!Array.isArray(d?.products?.nodes) || typeof d.products.pageInfo?.hasNextPage !== 'boolean') throw new Error('Products: Antwort enthält keine gültige Produktliste');
      prods.push(...d.products.nodes);
      if (!d.products.pageInfo.hasNextPage) break;
      const next = d.products.pageInfo.endCursor;
      if (typeof next !== 'string' || !next || next === cur) throw new Error('Products: ungültiger Seitencursor');
      cur = next;
    }
    prods = prods.slice(0, c.scan); rb.scanned = prods.length; rb.skippedInactive = 0;

    const z = { published: 0, skipped_sperre: 0, userErrors: 0, unknown: 0, offen: 0 }, zeilen = [], fehler = [], kandidaten = [], luecke = [];
    const zeile = (p, state, extra = {}) => { z[state]++; if (zeilen.length < BERICHT_MAX) zeilen.push({ handle: p?.handle || p?.id || '(unbekannt)', state, ...extra }); };
    for (const p of prods) {
      if (p && typeof p === 'object' && typeof p.status === 'string' && p.status !== 'ACTIVE') { rb.skippedInactive++; continue; }
      const v = produktPruefen(p);
      if (!v.ok) { zeile(p, 'unknown', { meldung: v.grund }); fehler.push({ handle: p?.handle || p?.id || '(unbekannt)', message: v.grund }); continue; }
      const fehlend = [...zielId].filter(id => !v.have.has(id));
      if (fehlend.length) luecke.push({ p, fehlend });
    }
    // Titelregeln (Feuerzeug/Heil-Schmuck/Schusswaffen-Zubehör) nur für Lücken, die sonst frei wären — EIN Python-Aufruf, VOR jeder Mutation.
    // Ein Fehler wirft (Hauptfehler, Exit 1): ohne Urteil der Titelregeln wird nichts geschrieben.
    const frei = luecke.filter(x => !sperrGruende(x.p, sq).length);
    if (frei.length) {
      if (typeof sq.titelUrteile !== 'function') throw new Error('Titelregeln nicht verfügbar — es wird NICHT geschrieben');
      sq.titel = sq.titelUrteile(frei.map(x => x.p));
    }
    for (const { p, fehlend } of luecke) {
      const g = sperrGruende(p, sq);
      if (g.length) { zeile(p, 'skipped_sperre', { fehlend: fehlend.map(i => name.get(i)), gruende: g.slice(0, 4) }); continue; }
      kandidaten.push({ p, fehlend });
    }
    rb.productsMissingChannels = luecke.length;
    rb.respektierteSperren = z.skipped_sperre;
    rb.zuPublizieren = kandidaten.length;

    let serie = 0;
    for (const { p, fehlend } of kandidaten) {
      const kanaele = fehlend.map(i => name.get(i));
      if (!rb.live || serie >= FEHLER_SERIE_MAX) { zeile(p, 'offen', { fehlend: kanaele }); continue; }
      try {
        const d = await gql(c.SHOP, tok, M_PUBLISH, { id: p.id, input: fehlend.map(publicationId => ({ publicationId })) });
        const pl = d?.publishablePublish;
        if (!pl || !Array.isArray(pl.userErrors)) throw new Error('Publish-Antwort enthält keine bestätigte Ergebnismeldung');
        if (pl.userErrors.length) {
          const m = pl.userErrors.map(e => e?.message || 'unbekannter Fehler').join('; ').slice(0, 300);
          zeile(p, 'userErrors', { fehlend: kanaele, meldung: m }); fehler.push({ handle: p.handle, message: 'Publish abgelehnt: ' + m }); serie = 0;
        } else { zeile(p, 'published', { kanaele }); serie = 0; }
      } catch (e) { zeile(p, 'unknown', { fehlend: kanaele, meldung: e.message }); fehler.push({ handle: p.handle, message: e.message }); serie++; }
    }
    if (serie >= FEHLER_SERIE_MAX) { rb.abbruch = `Schreibschleife nach ${FEHLER_SERIE_MAX} Fehlern in Folge gestoppt`; meldungen.push(['error', rb.abbruch]); }
    rb.published = z.published; rb.failed = z.userErrors + z.unknown; rb.zaehler = z;
    rb.errors = fehler.slice(0, 50); rb.produkte = zeilen; if (zeilen.length >= BERICHT_MAX) rb.produkteGekuerzt = true;
    if (rb.failed) { exit = 1; meldungen.push(['error', `${rb.failed} Produkt(e) mit Fehler (state userErrors/unknown)`]); }
    if (rb.live && rb.published) meldungen.push(['notice', `${rb.published} Produkt(e) auf fehlende Kanäle publiziert`]);
  } catch (e) { hauptfehler(e.message); }
  return { bericht: rb, exit, meldungen };
}

/** Eine Zeile für die Keepalive-Meldung. */
export function zeilenText({ bericht: b, exit }) {
  if (b.noop) return `PUBLISH-GUARD: unklar (${b.noop})`;
  if (b.hauptfehler) return `⚠️ PUBLISH-GUARD: unklar (${String(b.hauptfehler).replace(/\s+/g, ' ').slice(0, 160)})`;
  const z = b.zaehler || {};
  return `${exit || z.unknown ? '⚠️ ' : ''}PUBLISH-GUARD: ${b.scanned} gescannt · Lücken ${b.productsMissingChannels} (absichtlich gesperrt ${z.skipped_sperre || 0}, zu publizieren ${b.zuPublizieren}) · ${(b.targetChannels || []).length} Zielkanäle (Inbox/POS/Google nie)`;
}

// ── Selbsttest (offline, ohne Schlüssel) ───────────────────────────────────────────────────────────────
export function selbsttest() {
  const f = [], ok = (n, b, d = '') => f.push([n, !!b, d]);
  for (const [h, soll] of [['au3j0y-hq.myshopify.com', true], ['a.myshopify.com', true], ['evil.com/x#.myshopify.com', false], ['au3j0y-hq.myshopify.com.evil.com', false],
    ['user@au3j0y-hq.myshopify.com', false], ['au3j0y-hq.myshopify.com:8443', false], ['-x.myshopify.com', false], ['AU3J0Y.myshopify.com', false], ['', false],
    ['au3j0y-hq.myshopify.com\n', false]]) ok(`Host ${JSON.stringify(h)} → ${soll}`, hostOk(h) === soll);
  const py = 'AX = {\n  "a", \'B\',  # "kommentar" mit \'x\'\n  "c-d"\n}\nNOCH = {"z"}\nTAG_PRAEFIX = "google-gesperrt"\n';
  const m = pythonMenge(py, 'AX');
  ok('Python-Menge: Kommentar/Strings', m && [...m].join('|') === 'a|b|c-d', m && [...m].join('|'));
  ok('Python-Menge: unbekannter Name → null', pythonMenge(py, 'FEHLT') === null);
  ok('Python-Menge: nie geschlossen → null', pythonMenge('AX = {"a",', 'AX') === null);
  ok('Python-String', pythonString(py, 'TAG_PRAEFIX') === 'google-gesperrt');
  ok('ID-Leser: gid + freistehend, Publication-ID nicht', [...idsAusText('x\tgid://shopify/Product/15448825659777\t1\n15449425838465\tfoo\ngid://shopify/Publication/302032716161\n')].join() === '15448825659777,15449425838465');
  const q = sperrQuellenLaden();
  ok('echte Sperrquellen lesbar (' + (q.ok ? `${q.stat.ausschlussTags}+${q.stat.werbekanalTags} Tags, ${q.stat.ledgerIds} Ledger-IDs` : q.probleme.join('; ')) + ')', q.ok);
  if (q.ok) {
    const p = (tags, title = 'Test', id = 'gid://shopify/Product/1', handle = 'test') => ({ id, handle, title, tags });
    // Positiv-Kanarien: Tag-Sätze und Titel aus der Messung vom 19.10.2026 (müssen TREFFEN)
    for (const [n, x] of [['18plus/raucher/smoke-zubehoer', p(['18plus', 'raucher', 'smoke-zubehoer'])], ['nicht-google-bewerben + google-policy-flag', p(['nicht-google-bewerben', 'google-policy-flag'])],
      ['social-pause-halloween (Präfix)', p(['social-pause-halloween'])], ['google-gesperrt-adult (TAG_PRAEFIX)', p(['google-gesperrt-adult'])], ['google-kanal-entfernt (Präfix)', p(['google-kanal-entfernt'])],
      ['harness-google-raus-2026-08-21 (Muster)', p(['harness-google-raus-2026-08-21'])], ['niedrig-bewertet-nicht-bewerben', p(['niedrig-bewertet-nicht-bewerben'])],
      ['waffe-pruefen', p(['waffe-pruefen', 'cj-real'])], ['Gross/Klein egal', p(['NICHT-BEWERBEN'])],
      ['nicht-<kanal>-bewerben (Muster)', p(['nicht-tiktok-bewerben'])], ['<grund>-nicht-bewerben (Muster, 19.10. ungedeckt: lizenzware-nicht-bewerben)', p(['lizenzware-nicht-bewerben'])],
      ['compliance-pruefen (Muster, 4 aktive Träger)', p(['compliance-pruefen'])],
      ['Klinge im Titel ohne Tag', p(['cj-real'], 'Yoland Schwertpflegeöl – Rostschutz für Klingen')], ['Leucht-Schwert ohne Tag', p(['kinder'], 'Full Moon Leucht-Schwert, Cyberpunk-Stil')]])
      ok('gesperrt: ' + n, sperrGruende(x, q).length > 0);
    const erste = [...q.ids.keys()][0];
    ok('gesperrt: erste Ledger-ID (' + q.ids.get(erste) + ')', sperrGruende(p([], 'Test', 'gid://shopify/Product/' + erste), q).length > 0);
    // Gegenproben: dürfen NICHT treffen (zu breite Regeln wären ein Ausfall, vgl. rueckhol-0907 mit > 10'000 Trägern)
    for (const [n, x] of [['sauberes Produkt', p(['beauty', 'cj-real', 'bild-ok'], 'Rizinusöl-Roll-on')], ['rueckhol-0907 (Chargenmarke)', p(['rueckhol-0907', 'damen'])],
      ['kat-damen-pullover («pull»-Falle)', p(['kat-damen-pullover'])], ['Messerblock (Zubehör, keine Klinge)', p(['haushalt'], 'Messerblock aus Holz')], ['Damen-Kleid', p(['damen'], 'Damen-Kleid')],
      ['versand-pruefen (keine Kanal-Sperre)', p(['versand-pruefen'])], ['nicht-bewerben-ok (kein Sperr-Muster)', p(['nicht-bewerben-ok'])], ['bewerben', p(['bewerben'])]])
      ok('frei: ' + n, sperrGruende(x, q).length === 0, sperrGruende(x, q).join());
    // Titelregeln (Python, echte Quelle): Positiv-Kanarien MÜSSEN treffen, Gegenproben nicht — 0 Treffer ohne Kanarienvogel wäre keine Aussage
    try {
      const tp = (i, title, productType = '', tags = []) => ({ id: 'gid://shopify/Product/' + (15000000000000 + i), title, productType, tags });
      const u = q.titelUrteile([tp(1, 'Windsicheres Feuerzeug für Outdoor'), tp(2, 'Sturmfeuerzeug Kupfer mit Gravur'), tp(3, 'Terahertz Armband – Energie & Balance'),
        tp(4, 'AK74 Zielfernrohrbrücke aus Metall'), tp(5, 'Auto-Zigarettenanzünder mit USB & Type-C'), tp(6, 'USB-Autoladegerät für Zigarettenanzünder'), tp(7, 'Leichter Daunenmantel für Damen'), tp(8, 'Kupfer-Armband Damen')]);
      const g = i => (u.get('gid://shopify/Product/' + (15000000000000 + i)) || []).join('+');
      ok('Titelregel trifft: Feuerzeug', /^titel:feuerzeug$/.test(g(1)) && /^titel:feuerzeug$/.test(g(2)), g(1) + ' / ' + g(2));
      ok('Titelregel trifft: Heil-Schmuck', g(3) === 'titel:heilschmuck', g(3));
      ok('Titelregel trifft: Schusswaffen-Zubehör', /^titel:schusswaffen-zubehoer\(/.test(g(4)), g(4));
      ok('Titelregel frei: Zigarettenanzünder-Ladegeräte, Daunenmantel, Kupfer-Armband', [5, 6, 7, 8].every(i => g(i) === ''), [5, 6, 7, 8].map(g).join('|'));
    } catch (e) { ok('Titelregeln antworten (' + e.message.slice(0, 120) + ')', false); }
  }
  ok('Ledger-Untergrenzen vorhanden (5 Dateien)', Object.keys(LEDGER_MIN).length === 5 && Object.values(LEDGER_MIN).every(n => n > 0));
  {
    const id = 15000000000060, w = (t, h = '2026-10-19') => werbetestProbleme(t, h).length;
    ok('Werbetest: gültige Datei ok', w(`# ende: 2026-10-24\n${id} handle # x\n`) === 0);
    ok('Werbetest: Zeilen ohne gültigen Kopf → Problem', w(`# ende 24.10.2026\n${id} handle\n`) === 1);
    ok('Werbetest: Zeile ohne lesbare ID → Problem', w('# ende: 2026-10-24\nnur-ein-handle\n') === 1);
    ok('Werbetest: leer / abgelaufen → ok', w('') === 0 && w('# ende: 2026-10-24\nmüll\n', '2026-10-25') === 0);
    ok('Pause: gültiger Kopf ok, Schlüssel ohne Kopf → Problem', pauseProbleme('# a\t2026-10-15T00:00:00Z\t2026-11-01T00:00:00Z\tt\npid:1\n').length === 0 && pauseProbleme('pid:1\n').length === 1);
  }
  const pubs = ['Online Store', 'Point of Sale', 'Shop', 'TikTok', 'Facebook & Instagram', 'Google & YouTube', 'Pinterest', 'Inbox', 'Luxe Style Headless', 'Neuer Kanal'].map((n, i) => ({ id: 'P' + i, name: n }));
  const k = kanalWahl(pubs), kh = kanalWahl(pubs, { headless: true });
  ok('Ziele = 5 Verkaufskanäle', k.ziel.map(p => p.name).join('|') === 'Online Store|Shop|TikTok|Facebook & Instagram|Pinterest', k.ziel.map(p => p.name).join('|'));
  ok('Google/Inbox/POS/Headless/Unbekannt ignoriert', k.ignoriert.length === 5);
  ok('INCLUDE_HEADLESS nimmt nur Headless dazu', kh.ziel.length === 6 && kh.ziel.some(p => /headless/i.test(p.name)));
  ok('Konfig: INCLUDE_GOOGLE wird abgelehnt', konfig({ INCLUDE_GOOGLE: '1' }).fehler.length === 1);
  ok('Konfig: SCAN "abc" und "0" abgelehnt', konfig({ SCAN: 'abc' }).fehler.length === 1 && konfig({ SCAN: '0' }).fehler.length === 1);
  ok('Konfig: SCAN auf 3000 gedeckelt', konfig({ SCAN: '99999' }).scan === 3000);
  ok('Konfig: LIVE allein schreibt nicht', konfig({ LIVE: '1' }).live === false && konfig({ LIVE: '1', APPROVE_PUBLISH: '1' }).live === true);
  ok('Konfig: --zeile schreibt nie', konfig({ LIVE: '1', APPROVE_PUBLISH: '1' }, true).live === false);
  for (const v of ['0', 'true', 'ja', '', ' 1', '2']) ok(`Konfig: APPROVE_PUBLISH=${JSON.stringify(v)} / LIVE=${JSON.stringify(v)} schreiben nie (nur exakt «1»)`,
    konfig({ LIVE: '1', APPROVE_PUBLISH: v }).live === false && konfig({ LIVE: v, APPROVE_PUBLISH: '1' }).live === false);
  ok('zeilenText: mehrzeiliger Fehler bleibt EINE Zeile', !/\n/.test(zeilenText({ bericht: { hauptfehler: 'a\n::error::b' }, exit: 1 })));
  const bad = f.filter(x => !x[1]);
  for (const [n, b, d] of f) console.log((b ? '  ok  ' : '  FEHLER ') + n + (!b && d ? ` (${d})` : ''));
  console.log(`Selbsttest publish_guard.mjs: ${f.length - bad.length}/${f.length}`);
  return !bad.length;
}

// ── Aufruf ─────────────────────────────────────────────────────────────────────────────────────────────
export async function main(argv = process.argv.slice(2), env = process.env) {
  const unbekannt = argv.filter(a => !SCHALTER.has(a));
  if (unbekannt.length) { console.error(`Unbekannter Schalter: ${unbekannt.join(' ')} — erlaubt: --selbsttest, --zeile, --help`); return 2; }
  if (argv.includes('--help') || argv.includes('-h')) { console.log('publish_guard.mjs [--selbsttest | --zeile]  (Schreiben nur mit LIVE=1 UND APPROVE_PUBLISH=1; Kopfkommentar der Datei)'); return 0; }
  if (argv.includes('--selbsttest')) return selbsttest() ? 0 : 1;
  const zeile = argv.includes('--zeile'), c = konfig(env, zeile);
  if (c.fehler.length && zeile) { console.log(`⚠️ PUBLISH-GUARD: unklar (Konfiguration: ${c.fehler[0]})`); return 0; }
  if (c.fehler.length) { for (const m of c.fehler) console.log(`::error title=publish_guard::${m}`); console.error('Konfiguration ungültig: ' + c.fehler.join('; ')); return 2; }
  let r;
  try { r = await lauf(c); } catch (e) { r = { bericht: { hauptfehler: e.message, noop: undefined }, exit: 1, meldungen: [['error', e.message]] }; }
  if (zeile) { console.log(zeilenText(r)); return 0; }
  for (const [art, text] of r.meldungen) console.log(`::${art} title=publish_guard::${String(text).replace(/[\r\n%]/g, ' ')}`);
  if (r.bericht.noop) console.log(`no-op: ${r.bericht.noop}.`);
  else console.log(JSON.stringify(r.bericht, null, 2));
  return r.exit;
}

const echt = f => { try { return fs.realpathSync(f); } catch { return path.resolve(f); } };
if (process.argv[1] && echt(process.argv[1]) === echt(fileURLToPath(import.meta.url))) {
  main().then(code => { process.exitCode = code; }, e => { console.error('Fehler:', e.message); process.exitCode = 1; });
}
