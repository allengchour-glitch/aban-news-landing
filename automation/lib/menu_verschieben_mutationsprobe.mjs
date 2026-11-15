#!/usr/bin/env node
// Mutationsprobe für das Verschieben eines Menü-Eintrags: baut absichtliche Fehler in die Quellen ein und verlangt, dass der Test ROT wird.
// Ein Test, der einen eingebauten Fehler nicht bemerkt, schützt nichts. Gearbeitet wird in einer KOPIE im Temp-Ordner, das Repo bleibt unberührt.
// Lauf: /opt/node22/bin/node automation/lib/menu_verschieben_mutationsprobe.mjs
//   Exit 0 = alle Mutanten erkannt, 1 = mindestens einer überlebt, 2 = Ausgangslage nicht grün oder ein Muster passt nicht mehr (Ausgabe «?»: Mutant nachziehen).
// Jeder Mutant nennt `von` (muss in der Datei GENAU einmal vorkommen) und `zu`, dazu die Pflicht, die er verletzt (P1 bis P10, siehe WERKZEUG.md).
// Ein Mutant kann mit `mehr: [{datei, von, zu}]` weitere Ersetzungen mitbringen (alle zusammen eingebaut): so wird geprüft, dass der Test einen Fehler
// auch dann findet, wenn zugleich die Schutzprüfung im Lauf fehlt (zwei unabhängige Schichten: ehrliche Attrappe und pruefeLeseform).
// Die Probe zählt nur bei sauberer Ausgangslage: der Test muss auf der unveränderten Kopie grün sein (sonst meldete sie für jeden Mutanten «erkannt»).
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const L = 'automation/lib/menu_verschieben.mjs', R = 'automation/menu_eintrag_verschieben.mjs';
const DATEIEN = [L, R, 'automation/lib/menu_verschieben_test.mjs', 'automation/lib/menue_plan.mjs', 'automation/lib/shopify_gql.mjs', 'automation/lib/shopify_secret.mjs', 'automation/lib/shopify_host.mjs'];
const TEST = 'automation/lib/menu_verschieben_test.mjs';

const Q3 = 'items{${FELDER} items{${FELDER} items{${FELDER}}}}', Q2 = 'items{${FELDER} items{${FELDER}}}';
const FELDER_ALT = "const FELDER = 'id title type resourceId url tags';";
const OHNE_SCHUTZ = { datei: R, von: '  if (lf.length) { err(`ABBRUCH, nichts geschrieben: das gelesene Menü ist unvollständig', zu: '  if (false) { err(`ABBRUCH, nichts geschrieben: das gelesene Menü ist unvollständig' };

export const MUTANTEN = [
  // ── P1: Eintrag unter VON finden, Collection frisch lesen
  { p: 'P1', name: 'HTTP-Link auf die Collection wird nicht erkannt', datei: L, von: "  if (e.type === 'HTTP') return pfadGleich;", zu: "  if (e.type === 'HTTP') return false;" },
  { p: 'P1', name: 'COLLECTION nur über resourceId, nicht über die Adresse', datei: L, von: 'return (!!colId && e.resourceId === colId) || pfadGleich;', zu: 'return (!!colId && e.resourceId === colId);' },
  { p: 'P1', name: 'Adresse: Anfang genügt (längerer Handle, Abfrage zählen mit)', datei: L, von: 'const pfadGleich = shopPfad(e.url) === `/collections/${handle}`;', zu: 'const pfadGleich = shopPfad(e.url).startsWith(`/collections/${handle}`);' },
  { p: 'P1', name: 'jeder Typ mit passender Adresse zählt (PAGE)', datei: L, von: "return pfadGleich;\n  return false;", zu: "return pfadGleich;\n  return pfadGleich;" },
  { p: 'P1', name: 'mehrere Treffer unter VON: erster wird genommen', datei: L, von: '  if (idx.length !== 1) {', zu: '  if (idx.length < 1) {' },
  { p: 'P1', name: 'VON mehrdeutig wird hingenommen', datei: L, von: '  if (vT.length !== 1) fehler.push(', zu: '  if (vT.length < 1) fehler.push(' },
  { p: 'P1', name: 'fehlende Collection wird nicht geprüft', datei: R, von: '  if (!col?.id) {', zu: '  if (false) {' },
  // ── P2: ZIEL, Dubletten, NACH/VOR
  { p: 'P2', name: 'ZIEL mehrdeutig wird hingenommen', datei: L, von: '  if (zT.length !== 1) fehler.push(', zu: '  if (zT.length < 1) fehler.push(' },
  { p: 'P2', name: 'ZIEL im Eintrag (Nachfahre) erlaubt', datei: L, von: '  if (zielE === eintrag || enthaelt(eintrag, zielE)) fehler.push(', zu: '  if (zielE === eintrag) fehler.push(' },
  { p: 'P2', name: 'ZIEL gleich VON ohne eigene Meldung', datei: L, von: "  if (zielE === vonE) fehler.push('ZIEL ist derselbe Eintrag wie VON');", zu: '' },
  { p: 'P2', name: 'gleicher Titel unter ZIEL erlaubt', datei: L, von: 'k.title === eintrag.title || zeigtAuf(k, { handle, colId })', zu: 'zeigtAuf(k, { handle, colId })' },
  { p: 'P2', name: 'gleiche resourceId des Eintrags unter ZIEL erlaubt', datei: L, von: ' || (!!eintrag.resourceId && k.resourceId === eintrag.resourceId)', zu: '' },
  { p: 'P2', name: 'NACH/VOR mehrfach unter ZIEL wird hingenommen', datei: L, von: '    if (c !== 1) fehler.push(c ?', zu: '    if (c < 1) fehler.push(c ?' },
  { p: 'P2', name: 'NACH: Eintrag landet VOR dem Geschwister', datei: L, von: 'zk.findIndex(k => k.title === nach) + 1 :', zu: 'zk.findIndex(k => k.title === nach) :' },
  { p: 'P2', name: 'VOR: Eintrag landet HINTER dem Geschwister', datei: L, von: 'vor ? zk.findIndex(k => k.title === vor) : zk.length', zu: 'vor ? zk.findIndex(k => k.title === vor) + 1 : zk.length' },
  { p: 'P2', name: 'NACH und VOR zugleich im Lauf nicht abgefangen', datei: R, von: "  if (nach && vor) { err('NACH und VOR schliessen sich aus'); return { code: 1 }; }", zu: '' },
  // ── P3: Tiefe
  { p: 'P3', name: 'eine Ebene zu viel erlaubt', datei: L, von: '  if (neueTiefe > MAX_TIEFE) fehler.push(', zu: '  if (neueTiefe > MAX_TIEFE + 1) fehler.push(' },
  { p: 'P3', name: 'Ebenen unter dem Eintrag nicht mitgezählt', datei: L, von: '  const neueTiefe = ziel.length + 1 + tiefe(eintrag.items || []);', zu: '  const neueTiefe = ziel.length + 1;' },
  { p: 'P3', name: 'Höchsttiefe 4 statt 3', datei: L, von: 'export const MAX_TIEFE = 3;', zu: 'export const MAX_TIEFE = 4;' },
  // ── P4: Eingabe aus dem gelesenen Baum
  { p: 'P4', name: 'Eingabe ohne Tags', datei: L, von: '    ...(i.tags?.length ? { tags: i.tags } : {}), items: eingabeAus(i.items || []) }));', zu: '    items: eingabeAus(i.items || []) }));' },
  { p: 'P4', name: 'Eingabe ohne ids (alles neu angelegt)', datei: L, von: '  return (items || []).map(i => ({ id: i.id, title: i.title,', zu: '  return (items || []).map(i => ({ title: i.title,' },
  { p: 'P4', name: 'Eingabe ohne Adresse', datei: L, von: '...(i.url ? { url: i.url } : {}),', zu: '' },
  { p: 'P4', name: 'verschobener Eintrag verliert seine Kinder', datei: L, von: '  zk.splice(pos, 0, eintrag);', zu: '  zk.splice(pos, 0, { ...eintrag, items: [] });' },
  { p: 'P4', name: 'Lauf übergeht die Nachprüfung des Plans', datei: R, von: "  if (pf.length) { err('ABBRUCH, nichts geschrieben (Nachprüfung des Plans)", zu: "  if (false) { err('ABBRUCH, nichts geschrieben (Nachprüfung des Plans)" },
  { p: 'P4', name: 'Nachprüfung: Abweichung ausserhalb des Eintrags übersehen', datei: L, von: '  if (JSON.stringify(altK) !== JSON.stringify(planK)) fehler.push(', zu: '  if (false) fehler.push(' },
  { p: 'P4', name: 'Nachprüfung: Stelle am Ende nicht geprüft', datei: L, von: '  if (!nach && !vor && j !== zk.length) fehler.push(', zu: '  if (false) fehler.push(' },
  // ── P5: Sicherung
  { p: 'P5', name: 'Sicherung überschreibt eine vorhandene Datei', datei: R, von: "{ flag: 'wx' }", zu: "{ flag: 'w' }" },
  { p: 'P5', name: 'Sicherung ohne Menü-id, Titel, Handle', datei: R, von: 'writeFileSync(datei, JSON.stringify(inhalt, null, 1),', zu: 'writeFileSync(datei, JSON.stringify({ items: inhalt.items }, null, 1),' },
  { p: 'P5', name: 'SICHERUNG_DIR wird nicht beachtet', datei: R, von: 'sicherungDir: env.SICHERUNG_DIR || SICHERUNG_DIR', zu: 'sicherungDir: SICHERUNG_DIR' },
  { p: 'P5', name: 'Sicherungsname ohne Zeitstempel', datei: L, von: '${menue}-vor-verschieben-${handle}-${stempel}', zu: '${menue}-vor-verschieben-${handle}' },
  { p: 'P5', name: 'keine Sicherung im Trockenlauf', datei: R, von: 'try { sicherung = sicherungSchreiben(sicherungDir, menue, handle, jetzt(), m); }', zu: 'try { sicherung = live ? sicherungSchreiben(sicherungDir, menue, handle, jetzt(), m) : null; }' },
  { p: 'P5', name: 'Schreiben trotz fehlender Sicherung', datei: R, von: "catch (x) { err(`ABBRUCH, nichts geschrieben: Sicherung ging nicht (${x.message})`); return { code: 1, fehler: ['Sicherung'] }; }", zu: "catch (x) { err('Sicherung ging nicht'); }" },
  // ── P6: Menü direkt vor dem Schreiben noch einmal lesen
  { p: 'P6', name: 'erneutes Lesen wird nicht ausgewertet', datei: R, von: '  if (!g.gleich) {', zu: '  if (false) {' },
  { p: 'P6', name: 'Vergleich ohne Rohvergleich (Adresse eines COLLECTION-Eintrags)', datei: L, von: '  if (JSON.stringify(eingabeAus(m1.items)) !== JSON.stringify(eingabeAus(m2.items))) return', zu: '  if (false) return' },
  { p: 'P6', name: 'Vergleich ohne Menü-Titel', datei: L, von: "for (const f of ['id', 'title', 'handle']) if (m1[f] !== m2[f])", zu: "for (const f of ['id', 'handle']) if (m1[f] !== m2[f])" },
  // ── P7: nach dem Schreiben streng nachlesen
  { p: 'P7', name: 'neue id eines ANDEREN Eintrags wird hingenommen', datei: L, von: '      if (!s.markiert) fehler.push(', zu: '      if (false) fehler.push(' },
  { p: 'P7', name: 'Ziel (Adresse/resourceId) wird nicht verglichen', datei: L, von: "for (const f of ['pfad', 'title', 'type', 'ziel', 'tags'])", zu: "for (const f of ['pfad', 'title', 'type', 'tags'])" },
  { p: 'P7', name: 'Tags werden nicht verglichen', datei: L, von: "for (const f of ['pfad', 'title', 'type', 'ziel', 'tags'])", zu: "for (const f of ['pfad', 'title', 'type', 'ziel'])" },
  { p: 'P7', name: 'Typ wird nicht verglichen', datei: L, von: "for (const f of ['pfad', 'title', 'type', 'ziel', 'tags'])", zu: "for (const f of ['pfad', 'title', 'ziel', 'tags'])" },
  { p: 'P7', name: 'neue id des Eintrags wird als «gleich» gemeldet', datei: R, von: 'out(v.idGleich ? `id gleich (${v.idAlt})`', zu: 'out(true ? `id gleich (${v.idAlt})`' },
  { p: 'P7', name: 'Abweichung nach dem Schreiben gilt als OK', datei: R, von: "  if (v.fehler.length) {\n    err('ABWEICHUNG nach dem Schreiben", zu: "  if (false) {\n    err('ABWEICHUNG nach dem Schreiben" },
  { p: 'P7', name: 'Fehler beim Schreiben gilt als Aufruffehler (Exit 1 statt 3)', datei: R, von: "return { code: 3, fehler: ['menuUpdate unklar'], sicherung }; }", zu: "return { code: 1, fehler: ['menuUpdate unklar'], sicherung }; }" },
  // ── P8: Handle, Menü, userErrors, Schalter
  { p: 'P8', name: 'Handle nur am Anfang geprüft', datei: L, von: 'export const HANDLE_RE = /^[a-z0-9-]+$/;', zu: 'export const HANDLE_RE = /^[a-z0-9-]+/;' },
  { p: 'P8', name: 'MENUE wird für die Suche nicht benutzt', datei: R, von: 'const d = await q(MENU_Q, { h: `handle:${menue}` });', zu: "const d = await q(MENU_Q, { h: 'handle:main-menu' });" },
  { p: 'P8', name: 'erstes gefundenes Menü statt genau dem Handle', datei: R, von: 'return (d?.menus?.nodes || []).find(n => n.handle === menue) || null;', zu: 'return (d?.menus?.nodes || [])[0] || null;' },
  { p: 'P8', name: 'userErrors von menuUpdate übersehen', datei: R, von: 'if (!Array.isArray(ue) || ue.length) {', zu: 'if (!Array.isArray(ue)) {' },
  { p: 'P8', name: 'LIVE schon bei jedem Wert', datei: R, von: "live: env.LIVE === '1'", zu: 'live: !!env.LIVE' },
  { p: 'P8', name: 'Trockenlauf schreibt doch', datei: R, von: "  if (!live) { out('Trockenlauf: nichts geschrieben.');", zu: "  if (false) { out('Trockenlauf: nichts geschrieben.');" },
  // ── P9: Rücknahme
  { p: 'P9', name: 'Rücknahme mit VON und ZIEL nicht vertauscht', datei: L, von: 'const teile = [`HANDLE=${handle}`, `VON=${shellWort(pfadText(ziel))}`, `ZIEL=${shellWort(pfadText(von))}`];', zu: 'const teile = [`HANDLE=${handle}`, `VON=${shellWort(pfadText(von))}`, `ZIEL=${shellWort(pfadText(ziel))}`];' },
  { p: 'P9', name: 'Vorgänger ist der Eintrag selbst', datei: L, von: 'const vorgaenger = n > 0 ? kinder[n - 1].title : null;', zu: 'const vorgaenger = n > 0 ? kinder[n].title : null;' },
  { p: 'P9', name: 'erster Eintrag: Rücknahme ohne VOR (landet am Ende)', datei: L, von: '  else if (info.nachfolger !== null) teile.push(', zu: '  else if (false) teile.push(' },
  { p: 'P9', name: 'Apostroph im Titel wird nicht geschützt', datei: L, von: ".replace(/'/g, `'\\\\''`)", zu: '' },
  { p: 'P9', name: 'Rücknahme ohne MENUE', datei: L, von: "  if (menue !== 'main-menu') teile.push(`MENUE=${menue}`);", zu: '' },
  // ── P10: Leseform (Gegenprüfung 11.11.2026, W1): eine verkürzte Abfrage darf nie still zu einem Schreiben führen
  { p: 'P10', name: 'MENU_Q liest nur 2 Ebenen', datei: L, von: Q3, zu: Q2 },
  { p: 'P10', name: 'FELDER ohne id', datei: L, von: FELDER_ALT, zu: "const FELDER = 'title type resourceId url tags';" },
  { p: 'P10', name: 'FELDER ohne tags', datei: L, von: FELDER_ALT, zu: "const FELDER = 'id title type resourceId url';" },
  { p: 'P10', name: 'MENU_Q liest nur 2 Ebenen UND der Lauf prüft die Leseform nicht', datei: L, von: Q3, zu: Q2, mehr: [OHNE_SCHUTZ] },
  { p: 'P10', name: 'FELDER ohne id UND der Lauf prüft die Leseform nicht', datei: L, von: FELDER_ALT, zu: "const FELDER = 'title type resourceId url tags';", mehr: [OHNE_SCHUTZ] },
  { p: 'P10', name: 'FELDER ohne tags UND der Lauf prüft die Leseform nicht', datei: L, von: FELDER_ALT, zu: "const FELDER = 'id title type resourceId url';", mehr: [OHNE_SCHUTZ] },
  { p: 'P10', ...OHNE_SCHUTZ, name: 'Lauf prüft die Leseform nicht' },
  { p: 'P10', name: 'Leseform-Fehler mit Exit 2 statt 1', datei: R, von: 'return { code: 1, fehler: lf }; }', zu: 'return { code: 2, fehler: lf }; }' },
  { p: 'P10', name: 'Pflichtschlüssel ohne tags', datei: L, von: "export const LESE_PFLICHT = ['id', 'title', 'type', 'resourceId', 'url', 'tags'];", zu: "export const LESE_PFLICHT = ['id', 'title', 'type', 'resourceId', 'url'];" },
  { p: 'P10', name: 'Pflichtschlüssel ohne id', datei: L, von: "export const LESE_PFLICHT = ['id', 'title', 'type', 'resourceId', 'url', 'tags'];", zu: "export const LESE_PFLICHT = ['title', 'type', 'resourceId', 'url', 'tags'];" },
  { p: 'P10', name: 'fehlende items (zu wenige Ebenen) nicht gemeldet', datei: L, von: "        if (!Array.isArray(e.items)) f.push(", zu: "        if (false) f.push(" },
  { p: 'P10', name: 'items nur auf Ebene 1 verlangt', datei: L, von: '      if (ebene < MAX_TIEFE) {', zu: '      if (ebene < MAX_TIEFE - 1) {' },
  { p: 'P10', name: 'Leseform nur auf Ebene 1 geprüft (keine Rekursion)', datei: L, von: "        else lauf(e.items, ebene + 1, [...pfad, String(e.title ?? '?')]);", zu: '' },
  { p: 'P10', name: 'leere id hingenommen', datei: L, von: "      if ('id' in e && (typeof e.id !== 'string' || !e.id)) f.push(", zu: "      if (false) f.push(" },
  { p: 'P10', name: 'tags als Nicht-Liste hingenommen', datei: L, von: "      if ('tags' in e && !Array.isArray(e.tags)) f.push(", zu: "      if (false) f.push(" },
  { p: 'P10', name: 'Menü ohne title/handle hingenommen', datei: L, von: "  for (const k of ['id', 'title', 'handle']) if (typeof menu[k] !== 'string' || !menu[k]) f.push(`Menü ohne ${k}`);", zu: '' },
  // Messgerät: die Attrappe im Test muss der Abfrage folgen (sonst sieht der Test eine verkürzte Abfrage nie)
  { p: 'P10', name: 'Attrappe liefert beim Lesen immer alles (ignoriert die Abfrage)', datei: TEST, von: 'const nodes = alle.map(m => antwortAuf(query, m));', zu: 'const nodes = alle.map(lese);' },
];

function kopieAnlegen() {
  const ziel = mkdtempSync(join(tmpdir(), 'menuverschieben-mut-'));
  for (const d of DATEIEN) { mkdirSync(dirname(join(ziel, d)), { recursive: true }); copyFileSync(join(REPO, d), join(ziel, d)); }
  return ziel;
}
const testLauf = ordner => spawnSync(process.execPath, [join(ordner, TEST)], { encoding: 'utf8', timeout: 120000, env: { ...process.env, MENU_ECHT: '' } });

const basis = kopieAnlegen();
try {
  const a = testLauf(basis);
  const zeile = (a.stdout || '').trim().split('\n').at(-1);
  if (a.status !== 0) { console.log('AUSGANGSLAGE NICHT GRÜN:', zeile, a.stderr?.slice(0, 400)); process.exit(2); }
  console.log('Ausgangslage grün:', zeile);
  let erkannt = 0, ueberlebt = 0, unpassend = 0;
  const proPflicht = {};
  for (const m of MUTANTEN) {
    // Alle Ersetzungen des Mutanten der Reihe nach; jedes Muster muss im (schon veränderten) Text GENAU einmal vorkommen
    const original = {}, neu = {};
    let fehlt = '';
    for (const e of [{ datei: m.datei, von: m.von, zu: m.zu }, ...(m.mehr || [])]) {
      original[e.datei] ??= readFileSync(join(REPO, e.datei), 'utf8');
      const text = neu[e.datei] ?? original[e.datei];
      const anzahl = text.split(e.von).length - 1;
      if (anzahl !== 1) { fehlt = `Muster kommt ${anzahl}-mal vor (${e.datei}: ${e.von.slice(0, 60)})`; break; }
      neu[e.datei] = text.replace(e.von, () => e.zu);
    }
    if (fehlt) { unpassend++; console.log(`?  [${m.p}] ${m.name}: ${fehlt}`); continue; }
    for (const [d, t] of Object.entries(neu)) writeFileSync(join(basis, d), t);
    const r = testLauf(basis);
    for (const [d, t] of Object.entries(original)) writeFileSync(join(basis, d), t);
    proPflicht[m.p] = (proPflicht[m.p] || 0) + 1;
    if (r.status !== 0) { erkannt++; console.log(`ok [${m.p}] erkannt: ${m.name}`); }
    else { ueberlebt++; console.log(`!! [${m.p}] ÜBERLEBT: ${m.name}`); }
  }
  console.log(`\nMutationsprobe: ${MUTANTEN.length} Mutanten, ${erkannt} erkannt, ${ueberlebt} überlebt, ${unpassend} Muster passen nicht. Je Pflicht: ${Object.entries(proPflicht).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  process.exitCode = unpassend ? 2 : ueberlebt ? 1 : 0;
} finally { rmSync(basis, { recursive: true, force: true }); }
