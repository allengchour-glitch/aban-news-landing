// Test für sperr_verfuegbar.mjs, vor allem für den Schalter NUR=<handle> (11.11.2026).
// Kein Netz, keine Zugangsdaten: das Skript läuft als Kindprozess gegen sperr_verfuegbar_attrappe.mjs (ersetzt fetch).
// Der Ausgangsstand der Attrappe stammt aus sicherung.json (gemessen am 11.11.2026 vor der Sperre); die Sicherung des
// Laufs liegt immer in einem Temp-Ordner, nie im Repo.
//   node dropship/sperre-verfuegbar-1111/sperr_verfuegbar_test.mjs
//   SPERR_SKRIPT=<Pfad> …   prüft eine andere Kopie des Skripts (Mutationsprobe)
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SKRIPT = process.env.SPERR_SKRIPT || join(HIER, 'sperr_verfuegbar.mjs');
const ATTRAPPE = join(HIER, 'sperr_verfuegbar_attrappe.mjs');
const SICHERUNG_REPO = join(HIER, 'sicherung.json');
const MAGNET = 'magnet-zum-selbstgestalten'; const BUEGEL = 'buegeltransfer-selbst-gestalten'; const CAP = 'dad-cap-selbst-gestalten';

let ok = 0; let fehler = 0;
const test = (name, fn) => { try { fn(); ok++; } catch (e) { fehler++; console.error(`FEHLER ${name}: ${e.message}`); } };
const T = mkdtempSync(join(tmpdir(), 'sperr-test-'));
let nr = 0;

const sperrText = (id) => `<p>Text davor</p>\n<!-- lx-v63-editor:start product=${id} mode=blocked -->\n<div class="lspod-v63-blocked"></div>\n<!-- lx-v63-editor:end -->\n<p>Text danach</p>`;
const editorText = (id) => `<p>Text davor</p>\n<!-- lx-v63-editor:start product=${id} card=${'a'.repeat(64)} -->\n<div class="lspod-designer-v6"></div>\n<!-- lx-v63-editor:end -->\n<p>Text danach</p>`;
/** Shop im Ausgangsstand vom 11.11. (aus sicherung.json), alle drei Beschreibungen tragen die Sperre. */
const ausgang = () => ({ aufrufe: [], produkte: JSON.parse(readFileSync(SICHERUNG_REPO, 'utf8')).produkte.map((p) => ({ id: p.id, handle: p.handle, status: p.status, descriptionHtml: sperrText(p.id),
  varianten: p.varianten.map((v) => ({ id: v.id, titel: v.titel, sku: v.sku, policy: v.policy, item: v.item, tracked: v.tracked, staende: v.staende.map((s) => ({ ...s })) })) })) });
/** Stand nach dem Live-Lauf vom 11.11.: Magnet und Bügeltransfer gesperrt (bestandsgeführt, DENY), Dad-Cap unverändert (Printful-Standort). */
const gesperrt = () => { const z = ausgang(); for (const p of z.produkte) if (p.handle !== CAP) for (const v of p.varianten) { v.tracked = true; v.policy = 'DENY'; } return z; };
const produkt = (z, handle) => z.produkte.find((p) => p.handle === handle);
const ohneAufrufe = (z, handle) => JSON.stringify(produkt(z, handle));

/** Ein Lauf des Skripts gegen die Attrappe. `zustand` = Shop vor dem Lauf; `sicherung`: 'repo' (Kopie der echten Datei), 'keine' oder ein Pfad. */
function lauf(zustand, env = {}, { sicherung = 'repo' } = {}) {
  const dir = join(T, String(++nr)); const zPfad = `${dir}-zustand.json`; const sPfad = sicherung === 'keine' ? `${dir}-sicherung-fehlt.json` : sicherung === 'repo' ? `${dir}-sicherung.json` : sicherung;
  writeFileSync(zPfad, JSON.stringify(zustand));
  if (sicherung === 'repo') copyFileSync(SICHERUNG_REPO, sPfad);
  const r = spawnSync(process.execPath, ['--import', ATTRAPPE, SKRIPT], { encoding: 'utf8', timeout: 60000,
    env: { PATH: process.env.PATH || '', HOME: T, SPERR_ATTRAPPE_ZUSTAND: zPfad, SICHERUNG: sPfad, SHOPIFY_CLIENT_ID: 'attrappe', SHOPIFY_CLIENT_SECRET: 'attrappe', ...env } });
  const nach = JSON.parse(readFileSync(zPfad, 'utf8'));
  const schreibt = nach.aufrufe.filter((a) => ['tracked', 'menge', 'policy', 'abgelehnt'].includes(a.art));
  return { status: r.status, aus: r.stdout || '', err: r.stderr || '', nach, schreibt, sPfad, lesen: nach.aufrufe.filter((a) => a.art === 'lesen').length, aufrufe: nach.aufrufe };
}
const istAusgang = (z, handle) => { const soll = produkt(ausgang(), handle); const ist = produkt(z, handle); return JSON.stringify(ist.varianten) === JSON.stringify(soll.varianten); };
const istGesperrt = (z, handle) => produkt(z, handle).varianten.every((v) => v.tracked && v.policy === 'DENY' && v.staende.every((s) => s.menge <= 0));

// ---- Die Attrappe selbst: sie rechnet die Kaufbarkeit wie am 11.11. gemessen ---------------------------------------------
test('Attrappe: im Ausgangsstand meldet PRUEFEN alle fünf Varianten als kaufbar trotz Sperre (Exit 2), im gesperrten Stand nur den Dad-Cap', () => {
  const a = lauf(ausgang(), { PRUEFEN: '1' });
  assert.equal(a.status, 2, a.err); assert.match(a.aus, /5 Variante\(n\) gesperrter Produkte sind kaufbar/); assert.equal(a.schreibt.length, 0);
  const g = lauf(gesperrt(), { PRUEFEN: '1' });
  assert.equal(g.status, 2); assert.match(g.aus, /1 Variante\(n\) gesperrter Produkte sind kaufbar/); assert.match(g.aus, /KAUFBAR TROTZ SPERRE dad-cap-selbst-gestalten/);
  const b = lauf(gesperrt(), { PRUEFEN: '1', BEKANNT_KAUFBAR: CAP });
  assert.equal(b.status, 0, b.aus); assert.match(b.aus, /Kein gesperrtes Produkt ist kaufbar/);
});

// ---- Verhalten ohne NUR bleibt wie bisher ---------------------------------------------------------------------------------
test('ohne NUR: ZURUECK=1 LIVE=1 stellt Magnet UND Bügeltransfer zurück (bisheriges Verhalten, darum braucht die Freischaltung NUR)', () => {
  const r = lauf(gesperrt(), { ZURUECK: '1', LIVE: '1' });
  assert.equal(r.status, 0, r.err + r.aus);
  assert.ok(istAusgang(r.nach, MAGNET)); assert.ok(istAusgang(r.nach, BUEGEL)); assert.ok(istAusgang(r.nach, CAP));
  assert.deepEqual([...new Set(r.schreibt.map((a) => a.handle))].sort(), [BUEGEL, MAGNET]);
  assert.equal((r.aus.match(/^NACHGELESEN /gm) || []).length, 5);
  assert.doesNotMatch(r.aus, /^NUR /m);
});
test('ohne NUR: LIVE=1 sperrt aus dem Ausgangsstand, legt die Sicherung mit allen drei Produkten an, der Dad-Cap scheitert am Printful-Standort (Exit 1)', () => {
  const r = lauf(ausgang(), { LIVE: '1' }, { sicherung: 'keine' });
  assert.equal(r.status, 1); assert.match(r.err, /FEHLER dad-cap-selbst-gestalten .*INVALID_LOCATION/);
  assert.ok(istGesperrt(r.nach, MAGNET)); assert.ok(istGesperrt(r.nach, BUEGEL)); assert.ok(istAusgang(r.nach, CAP));
  assert.deepEqual(JSON.parse(readFileSync(r.sPfad, 'utf8')).produkte.map((p) => p.handle).sort(), [BUEGEL, CAP, MAGNET]);
});
test('leeres NUR zählt als nicht gesetzt (alle drei Produkte)', () => {
  const r = lauf(gesperrt(), { ZURUECK: '1', NUR: '' });
  assert.equal(r.status, 0, r.err); assert.equal((r.aus.match(/^PLAN /gm) || []).length, 5); assert.equal(r.schreibt.length, 0);
});

// ---- NUR=<handle>: der Fall der Freischaltung ------------------------------------------------------------------------------
test('ZURUECK=1 LIVE=1 NUR=Magnet: nur die drei Magnet-Varianten werden wieder kaufbar; Bügeltransfer und Dad-Cap bleiben Byte für Byte', () => {
  const vor = gesperrt();
  const r = lauf(vor, { ZURUECK: '1', LIVE: '1', NUR: MAGNET });
  assert.equal(r.status, 0, r.err + r.aus);
  assert.ok(istAusgang(r.nach, MAGNET), 'Magnet nicht im Ausgangsstand');
  assert.equal(ohneAufrufe(r.nach, BUEGEL), ohneAufrufe(vor, BUEGEL), 'Bügeltransfer verändert'); assert.ok(istGesperrt(r.nach, BUEGEL));
  assert.equal(ohneAufrufe(r.nach, CAP), ohneAufrufe(vor, CAP), 'Dad-Cap verändert');
  assert.deepEqual([...new Set(r.schreibt.map((a) => a.handle))], [MAGNET]);
  assert.equal(r.schreibt.filter((a) => a.art === 'policy' && a.wert === 'CONTINUE').length, 3);
  assert.equal(r.schreibt.filter((a) => a.art === 'tracked' && a.wert === false).length, 3);
  assert.equal(r.schreibt.filter((a) => a.art === 'menge' || a.art === 'abgelehnt').length, 0);
  // Reihenfolge je Variante: erst die Regel, zuletzt die Bestandsführung aus
  for (const v of produkt(vor, MAGNET).varianten) { const z = r.schreibt.filter((a) => a.variante === v.id).map((a) => a.art); assert.deepEqual(z, ['policy', 'tracked'], v.id); }
  assert.equal((r.aus.match(/^LIVE /gm) || []).length, 3); assert.equal((r.aus.match(/^NACHGELESEN /gm) || []).length, 3);
  assert.doesNotMatch(r.aus, /^(LIVE|NACHGELESEN|PLAN) (buegeltransfer|dad-cap)/m);
  assert.match(r.aus, /^NUR magnet-zum-selbstgestalten: buegeltransfer-selbst-gestalten, dad-cap-selbst-gestalten werden weder geändert noch zurückgelesen noch geprüft\.$/m);
  assert.match(r.aus, /Rücklesen: alles wie geplant\./);
  assert.equal(r.lesen, 2, 'ein Lesen vor und eines nach dem Schreiben (kein Warten auf fremde Produkte)');
});
test('Shopify rechnet die Kaufbarkeit zeitversetzt nach: mit NUR=Magnet wartet das Rücklesen nur auf den Magneten und endet dann mit Exit 0', () => {
  const r = lauf(gesperrt(), { ZURUECK: '1', LIVE: '1', NUR: MAGNET, SPERR_ATTRAPPE_VERZUG: '2' });
  assert.equal(r.status, 0, r.err + r.aus);
  assert.equal(r.aufrufe.filter((a) => a.art === 'lesen' && a.verzug).length, 2, 'die Attrappe hat den Verzug nicht gespielt');
  assert.equal(r.lesen, 4, 'vor dem Schreiben, zweimal mit alter Kaufbarkeit, einmal mit neuer');
  assert.equal((r.aus.match(/^NACHGELESEN magnet-zum-selbstgestalten .*Felder OK \| Kaufbarkeit OK$/gm) || []).length, 3);
  assert.equal((r.aus.match(/^NACHGELESEN /gm) || []).length, 3);
  // ohne NUR wartet dasselbe Rücklesen auf alle Produkte (hier: alle wieder kaufbar), ebenfalls Exit 0
  const alle = lauf(gesperrt(), { ZURUECK: '1', LIVE: '1', SPERR_ATTRAPPE_VERZUG: '2' });
  assert.equal(alle.status, 0, alle.err + alle.aus); assert.equal((alle.aus.match(/^NACHGELESEN /gm) || []).length, 5);
  // bleibt die Kaufbarkeit dauerhaft alt, meldet das Skript es nach 15 Versuchen mit Exit 3 (Felder geschrieben, Kaufbarkeit offen)
  const nie = lauf(gesperrt(), { ZURUECK: '1', LIVE: '1', NUR: MAGNET, SPERR_ATTRAPPE_VERZUG: '99' });
  assert.equal(nie.status, 3, nie.err + nie.aus); assert.match(nie.err, /3 Variante\(n\) zeigen nach 90 s noch die alte Kaufbarkeit/); assert.ok(istAusgang(nie.nach, MAGNET));
});
test('ZURUECK=1 NUR=Magnet ohne LIVE: Trockenlauf, nichts geschrieben, Plan nennt nur den Magneten', () => {
  const vor = gesperrt();
  const r = lauf(vor, { ZURUECK: '1', NUR: MAGNET });
  assert.equal(r.status, 0, r.err); assert.equal(r.schreibt.length, 0); assert.equal(JSON.stringify(r.nach.produkte), JSON.stringify(vor.produkte));
  assert.equal((r.aus.match(/^PLAN magnet-zum-selbstgestalten /gm) || []).length, 3); assert.equal((r.aus.match(/^PLAN /gm) || []).length, 3);
  assert.match(r.aus, /Trockenlauf: nichts geschrieben\./);
});
test('zweiter Lauf ZURUECK=1 LIVE=1 NUR=Magnet: schon zurückgestellt, kein Schreibzugriff, Exit 0', () => {
  const erst = lauf(gesperrt(), { ZURUECK: '1', LIVE: '1', NUR: MAGNET });
  const r = lauf({ ...erst.nach, aufrufe: [] }, { ZURUECK: '1', LIVE: '1', NUR: MAGNET });
  assert.equal(r.status, 0, r.err); assert.equal(r.schreibt.length, 0); assert.equal((r.aus.match(/\(schon so\)/g) || []).length, 3);
});
test('nach der Rücknahme: PRUEFEN meldet den Magneten als kaufbar trotz Sperre (Fenster bis zum Apply), mit NUR=Bügeltransfer zählt er nicht', () => {
  const z = lauf(gesperrt(), { ZURUECK: '1', LIVE: '1', NUR: MAGNET }).nach;
  const alle = lauf({ ...z, aufrufe: [] }, { PRUEFEN: '1', BEKANNT_KAUFBAR: CAP });
  assert.equal(alle.status, 2); assert.match(alle.aus, /3 Variante\(n\) gesperrter Produkte sind kaufbar/);
  const nurMagnet = lauf({ ...z, aufrufe: [] }, { PRUEFEN: '1', NUR: MAGNET });
  assert.equal(nurMagnet.status, 2); assert.equal((nurMagnet.aus.match(/^KAUFBAR TROTZ SPERRE magnet/gm) || []).length, 3); assert.doesNotMatch(nurMagnet.aus, /dad-cap-selbst-gestalten \|/);
  const nurBuegel = lauf({ ...z, aufrufe: [] }, { PRUEFEN: '1', NUR: BUEGEL });
  assert.equal(nurBuegel.status, 0, nurBuegel.aus); assert.match(nurBuegel.aus, /^ok buegeltransfer-selbst-gestalten /m); assert.doesNotMatch(nurBuegel.aus, /magnet-zum-selbstgestalten \|/);
  assert.equal(alle.schreibt.length + nurMagnet.schreibt.length + nurBuegel.schreibt.length, 0);
});
test('nach der Freischaltung (Beschreibung ohne «mode=blocked»): PRUEFEN zählt den Magneten nicht mehr, ein erneutes LIVE=1 überspringt ihn', () => {
  const z = lauf(gesperrt(), { ZURUECK: '1', LIVE: '1', NUR: MAGNET }).nach;
  produkt(z, MAGNET).descriptionHtml = editorText(produkt(z, MAGNET).id);
  const p = lauf({ ...z, aufrufe: [] }, { PRUEFEN: '1', BEKANNT_KAUFBAR: CAP });
  assert.equal(p.status, 0, p.aus); assert.equal((p.aus.match(/^ok magnet-zum-selbstgestalten .*sperre=false kaufbar=true/gm) || []).length, 3);
  const l = lauf({ ...z, aufrufe: [] }, { LIVE: '1', NUR: MAGNET });
  assert.equal(l.status, 0, l.err + l.aus); assert.equal(l.schreibt.length, 0); assert.equal((l.aus.match(/^ÜBERSPRUNGEN magnet-zum-selbstgestalten /gm) || []).length, 3);
  assert.ok(istAusgang(l.nach, MAGNET));
});
test('Rückweg nach einem Rollback der Freischaltung: LIVE=1 NUR=Magnet sperrt nur den Magneten wieder', () => {
  const z = lauf(gesperrt(), { ZURUECK: '1', LIVE: '1', NUR: MAGNET }).nach;
  const vor = { ...z, aufrufe: [] };
  const r = lauf(vor, { LIVE: '1', NUR: MAGNET });
  assert.equal(r.status, 0, r.err + r.aus); assert.ok(istGesperrt(r.nach, MAGNET));
  assert.equal(ohneAufrufe(r.nach, BUEGEL), ohneAufrufe(vor, BUEGEL)); assert.equal(ohneAufrufe(r.nach, CAP), ohneAufrufe(vor, CAP));
  assert.deepEqual([...new Set(r.schreibt.map((a) => a.handle))], [MAGNET]);
  for (const v of produkt(vor, MAGNET).varianten) assert.deepEqual(r.schreibt.filter((a) => a.variante === v.id).map((a) => a.art), ['tracked', 'policy'], 'Reihenfolge: erst Bestandsführung an, zuletzt DENY');
  assert.equal(JSON.stringify(produkt(r.nach, MAGNET).varianten), JSON.stringify(produkt(gesperrt(), MAGNET).varianten), 'nicht derselbe Stand wie nach dem ersten Sperr-Lauf');
});
test('NUR mit zwei Produkten: Magnet und Bügeltransfer zurück, der Dad-Cap bleibt aussen vor', () => {
  const vor = gesperrt();
  const r = lauf(vor, { ZURUECK: '1', LIVE: '1', NUR: ` ${MAGNET} , ${BUEGEL} ` });
  assert.equal(r.status, 0, r.err + r.aus); assert.ok(istAusgang(r.nach, MAGNET)); assert.ok(istAusgang(r.nach, BUEGEL));
  assert.equal((r.aus.match(/^NACHGELESEN /gm) || []).length, 4); assert.doesNotMatch(r.aus, /^(LIVE|NACHGELESEN) dad-cap/m);
});

// ---- NUR schützt vor Tippfehlern: nie still «alle drei» -----------------------------------------------------------------
test('unbrauchbares NUR bricht ab, bevor irgendetwas gelesen wird: unbekanntes Handle, nur Kommas, doppelt, Handle mit Zusatz', () => {
  for (const nurWert of ['magnet', 'magnet-zum-selbstgestalten,dad-cap', ',', ' , ', `${MAGNET},${MAGNET}`, `${MAGNET};${BUEGEL}`, 'MAGNET-ZUM-SELBSTGESTALTEN', '*', `${MAGNET} ${BUEGEL}`]) {
    for (const modus of [{ ZURUECK: '1', LIVE: '1' }, { LIVE: '1' }, { PRUEFEN: '1' }, {}]) {
      const vor = gesperrt();
      const r = lauf(vor, { ...modus, NUR: nurWert });
      assert.equal(r.status, 1, `NUR=${JSON.stringify(nurWert)} ${JSON.stringify(modus)}: Exit ${r.status}`);
      assert.match(r.err, /NUR ist unbrauchbar .*Nichts gelesen, nichts geschrieben\./, nurWert);
      assert.equal(r.aufrufe.length, 0, `NUR=${JSON.stringify(nurWert)}: es gab Netzaufrufe`);
      assert.equal(JSON.stringify(r.nach.produkte), JSON.stringify(vor.produkte));
    }
  }
});

// ---- Die Sicherung bleibt vollständig, auch mit NUR ------------------------------------------------------------------------
test('LIVE=1 NUR=Magnet ohne Sicherung aus dem Ausgangsstand: die Sicherung enthält trotzdem alle drei Produkte, gesperrt wird nur der Magnet', () => {
  const vor = ausgang();
  const r = lauf(vor, { LIVE: '1', NUR: MAGNET }, { sicherung: 'keine' });
  assert.equal(r.status, 0, r.err + r.aus); assert.ok(istGesperrt(r.nach, MAGNET));
  assert.equal(ohneAufrufe(r.nach, BUEGEL), ohneAufrufe(vor, BUEGEL)); assert.equal(ohneAufrufe(r.nach, CAP), ohneAufrufe(vor, CAP));
  const s = JSON.parse(readFileSync(r.sPfad, 'utf8'));
  assert.deepEqual(s.produkte.map((p) => p.handle).sort(), [BUEGEL, CAP, MAGNET]); assert.equal(s.produkte.flatMap((p) => p.varianten).length, 5);
  assert.ok(s.produkte.every((p) => !('gesperrt' in p) && !('descriptionHtml' in p)));
});
test('LIVE=1 NUR=Magnet ohne Sicherung, aber ein ANDERES Produkt ist nicht im Ausgangsstand: Abbruch, keine Sicherung, nichts geschrieben', () => {
  const vor = ausgang(); for (const v of produkt(vor, BUEGEL).varianten) { v.tracked = true; v.policy = 'DENY'; }
  const r = lauf(vor, { LIVE: '1', NUR: MAGNET }, { sicherung: 'keine' });
  assert.equal(r.status, 1); assert.match(r.err, /nicht im Ausgangsstand vom 11\.11\. und es gibt keine Sicherung: nichts geschrieben/);
  assert.equal(existsSync(r.sPfad), false, 'eine Sicherung mit falschem Ausgangsstand wurde angelegt'); assert.equal(r.schreibt.length, 0);
});
test('ZURUECK=1 LIVE=1 NUR=Magnet ohne Sicherung: Abbruch, nichts geschrieben', () => {
  const r = lauf(gesperrt(), { ZURUECK: '1', LIVE: '1', NUR: MAGNET }, { sicherung: 'keine' });
  assert.equal(r.status, 1); assert.match(r.err, /keine Sicherung vorhanden/); assert.equal(r.schreibt.length, 0);
  // auch aus dem Ausgangsstand: die Rücknahme legt nie selbst eine Sicherung an
  const a = lauf(ausgang(), { ZURUECK: '1', LIVE: '1', NUR: MAGNET }, { sicherung: 'keine' });
  assert.equal(a.status, 1, a.aus); assert.match(a.err, /keine Sicherung vorhanden/); assert.equal(existsSync(a.sPfad), false, 'die Rücknahme hat eine Sicherung angelegt'); assert.equal(a.lesen, 1);
});
test('die Sicherung im Repo passt zum fest eingetragenen Ausgangsstand und nennt keine Kundendaten', () => {
  const s = JSON.parse(readFileSync(SICHERUNG_REPO, 'utf8'));
  assert.deepEqual(s.produkte.map((p) => p.handle), [MAGNET, BUEGEL, CAP]);
  assert.deepEqual(Object.keys(s.produkte[0]).sort(), ['handle', 'id', 'status', 'varianten']);
  assert.doesNotMatch(JSON.stringify(s), /@|email|kunde|customer/i);
});

rmSync(T, { recursive: true, force: true });
console.log(`${ok} Tests bestanden, ${fehler} Fehler`);
if (fehler) process.exitCode = 1;
