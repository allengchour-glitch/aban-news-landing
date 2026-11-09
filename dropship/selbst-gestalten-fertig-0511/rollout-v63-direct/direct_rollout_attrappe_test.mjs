// Szenarien für direct_rollout.mjs gegen die Offline-Attrappe (direct_rollout_attrappe.mjs): der Pfad, der Beschreibungen
// wirklich schreibt und zurückstellt (Plan, Apply je Stufe, Rollback, Hash-Schutz, Ledger- und OUT_DIR-Sperre, Live-Gates für
// Ziel und Rückweg-Dateien, Rücklesen, kein Wiederholen des Writes), ohne Netz und ohne Zugangsdaten.
// Aufruf: node direct_rollout_attrappe_test.mjs     (Exit 0 = alles bestanden; direct_rollout_test.mjs ruft es mit auf)
// ROLLOUT_SKRIPT=<Pfad> prüft ein anderes direct_rollout.mjs (Gegenprobe gegen eine ältere oder mutierte Kopie).
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { zustandBauen } from './direct_rollout_attrappe.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const RUNNER = process.env.ROLLOUT_SKRIPT || join(HIER, 'direct_rollout.mjs');
const ATTRAPPE = join(HIER, 'direct_rollout_attrappe.mjs');
const W = mkdtempSync(join(tmpdir(), 'v64-attrappe-'));
let n = 0; const fehler = [];
const check = (name, bed, info = '') => { n++; if (!bed) fehler.push(`${name}${info ? ` [${String(info).replace(/\s+/g, ' ').slice(0, 260)}]` : ''}`); };

const TASSE = 'keramik-tasse-selbst-gestalten'; const JUTE = 'bio-jutebeutel-selbst-gestalten';
const HOODIE = 'unisex-hoodie-selbst-gestalten'; const MAUSPAD = 'mauspad-selbst-gestalten'; const MAGNET = 'magnet-zum-selbstgestalten';
const SPERREN = ['buegeltransfer-selbst-gestalten', 'dad-cap-selbst-gestalten', MAGNET];
const ACK = {
  apply: { 'canary-tasse': 'V64_CANARY_TASSE', 'canary-jutebeutel': 'V64_CANARY_JUTEBEUTEL', full: 'V64_FULL_16_EDITOR' },
  rollback: { 'canary-tasse': 'V64_ROLLBACK_TASSE', 'canary-jutebeutel': 'V64_ROLLBACK_JUTEBEUTEL', full: 'V64_ROLLBACK_16_EDITOR' },
};
const run = (state, log, out, env) => {
  const r = spawnSync(process.execPath, ['--import', ATTRAPPE, RUNNER], {
    encoding: 'utf8', timeout: 120000,
    env: { PATH: process.env.PATH || '', HOME: W, ATTRAPPE_STATE: state, ATTRAPPE_LOG: log, SHOPIFY_ADMIN_TOKEN: 'x', OUT_DIR: out, EDITOR_VERSION: '6.4.0', ...env },
  });
  let json = null; try { json = JSON.parse(r.stdout); } catch { /* kein JSON */ }
  return { code: r.status, out: r.stdout, err: r.stderr, json };
};
const plan = (s, l, o, scope = 'canary-tasse', env = {}) => run(s, l, o, { MODE: 'plan', SCOPE: scope, ...env });
const apply = (s, l, o, scope, env = {}) => run(s, l, o, { MODE: 'apply', LIVE: '1', SCOPE: scope, ACK: ACK.apply[scope], ...env });
const rollback = (s, l, o, scope, quelle, env = {}) => run(s, l, o, { MODE: 'rollback', LIVE: '1', SCOPE: scope, ACK: ACK.rollback[scope], ROLLBACK_PLAN: quelle, ...env });
const lies = (f) => JSON.parse(readFileSync(f, 'utf8'));
const zeilen = (log) => (existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const writes = (log) => zeilen(log).filter((z) => z.t === 'WRITE').map((z) => z.handle);
const reads = (log) => zeilen(log).filter((z) => z.t === 'READ').length;
const produkt = (state, handle) => Object.values(lies(state).products).find((p) => p.handle === handle);
const stand = (state, handle) => produkt(state, handle).descriptionHtml;
const version = (state, handle) => (stand(state, handle).match(/lspod-designer-v6-(\d+\.\d+\.\d+)\.js/) || [])[1] || '-';
const aendern = (state, handle, f) => { const s = lies(state); f(Object.values(s.products).find((p) => p.handle === handle)); writeFileSync(state, JSON.stringify(s)); };
const ledgerRows = (out) => (existsSync(join(out, 'ledger.json')) ? lies(join(out, 'ledger.json')).products : []);
const zustaende = (out) => { const z = {}; for (const r of ledgerRows(out)) z[r.state] = (z[r.state] || 0) + 1; return z; };
const gleichZu = (stateA, stateB) => { const a = lies(stateA).products; const b = lies(stateB).products; return Object.keys(b).every((k) => a[k].descriptionHtml === b[k].descriptionHtml); };
const kopie = (name, quelle) => { const s = join(W, `${name}.state.json`); const l = join(W, `${name}.log`); cpSync(quelle, s); writeFileSync(l, ''); return [s, l]; };
const o = (name) => join(W, name);

try {
  // ---- Ausgangszustände -------------------------------------------------------------------------------------------------
  const SHOP0 = o('shop0.json'); writeFileSync(SHOP0, JSON.stringify(zustandBauen()));                         // 15 × 6.3.0, Tasse 6.3.1, 3 Sperren
  const SHOP_ALT = o('shop_alt.json'); writeFileSync(SHOP_ALT, JSON.stringify(zustandBauen({ tasse631: false }))); // alles 6.3.0 (Stand vor dem 6.3.1-Canary)
  const SHOP_ZIEL = o('shop_ziel.json'); const STUFEN = o('shop_stufen.json');
  { const [s, l] = kopie('z', SHOP0); const r = apply(s, l, o('zo'), 'full'); check('Vorbereitung: Full auf dem Ausgangszustand', r.code === 0, r.err.slice(0, 200)); cpSync(s, SHOP_ZIEL); }
  { const [s, l] = kopie('st', SHOP0); const r1 = apply(s, l, o('sto1'), 'canary-tasse'); const r2 = apply(s, l, o('sto2'), 'canary-jutebeutel');
    check('Vorbereitung: beide Canary-Stufen', r1.code === 0 && r2.code === 0, r1.err.slice(0, 120) + r2.err.slice(0, 120)); cpSync(s, STUFEN); }

  // ---- A1 Plan schreibt nie ----------------------------------------------------------------------------------------------
  { const [s, l] = kopie('a1', SHOP0); const r = plan(s, l, o('a1o'));
    check('A1 Plan Exit 0', r.code === 0, r.err.slice(0, 200)); check('A1 Plan schreibt nichts', writes(l).length === 0);
    const p = lies(join(o('a1o'), 'plan.json'));
    check('A1 19 Produkte: 16 Editorprodukte geändert, 3 Sperren unverändert', p.products.length === 19 && p.products.filter((x) => x.kind === 'editor' && x.geaendert).length === 16 && p.products.filter((x) => x.kind === 'blocked' && !x.geaendert).length === 3);
    check('A1 Plan nennt die Auswahl', r.json && JSON.stringify(r.json.selected) === JSON.stringify([TASSE]), r.out); }

  // ---- A2/A3 Apply Tasse: genau ein Write, Rollback stellt byte-genau zurück -----------------------------------------------
  { const [s, l] = kopie('a2', SHOP0); const vor = stand(s, TASSE);
    const r = apply(s, l, o('a2o'), 'canary-tasse');
    check('A2 Apply Exit 0', r.code === 0, r.err.slice(0, 200)); check('A2 genau ein Write: die Tasse', JSON.stringify(writes(l)) === JSON.stringify([TASSE]), JSON.stringify(writes(l)));
    check('A2 Tasse trägt 6.4.0, Jutebeutel bleibt 6.3.0', version(s, TASSE) === '6.4.0' && version(s, JUTE) === '6.3.0');
    check('A2 Ausgabe zählt echte Writes', r.json?.changed === 1 && r.json?.unchanged === 0, r.out);
    check('A2 Ledger: Tasse applied', JSON.stringify(zustaende(o('a2o'))) === JSON.stringify({ applied: 1 }));
    const rb = rollback(s, l, o('a3o'), 'canary-tasse', o('a2o'));
    check('A3 Rollback Exit 0', rb.code === 0, rb.err.slice(0, 200)); check('A3 Rollback stellt byte-genau zurück', stand(s, TASSE) === vor);
    check('A3 Rollback schrieb nur die Tasse', JSON.stringify(writes(l)) === JSON.stringify([TASSE, TASSE]));
    check('A3 Ausgabe: ein Write, nichts übersprungen', rb.json?.changed === 1 && rb.json?.failed === 0, rb.out); }

  // ---- A4 Rollback nach fremder Änderung schreibt nichts und überschreibt die Änderung nie ---------------------------------
  { const [s, l] = kopie('a4', SHOP0); apply(s, l, o('a4o'), 'canary-tasse');
    aendern(s, TASSE, (p) => { p.descriptionHtml += '<!-- fremd -->'; });
    const rb = rollback(s, l, o('a4r'), 'canary-tasse', o('a4o'));
    check('A4 Rollback endet nicht grün', rb.code !== 0); check('A4 Meldung nennt die Abweichung', /Beschreibung seit dem Plan verändert/.test(rb.err), rb.err.slice(0, 300));
    check('A4 Rollback schreibt nicht', writes(l).length === 1, JSON.stringify(writes(l))); check('A4 fremde Änderung bleibt', stand(s, TASSE).endsWith('<!-- fremd -->')); }

  // ---- A5 Ledger-/OUT_DIR-Sperre: kein blinder Wiederholungslauf --------------------------------------------------------------
  { const [s, l] = kopie('a5', SHOP0); const ziel = o('a5o'); apply(s, l, ziel, 'canary-tasse'); const nachApply = o('a5.nach-apply.json'); cpSync(s, nachApply);
    const p2 = plan(s, l, ziel);
    check('A5 Plan in einen belegten Ordner bricht ab', p2.code !== 0 && /enthält bereits einen Lauf/.test(p2.err), p2.err.slice(0, 200));
    const [s2, l2] = kopie('a5b', SHOP0); const vorAnz = writes(l2).length;
    const r2 = apply(s2, l2, ziel, 'canary-tasse');
    check('A5 zweiter Apply im selben Ordner bricht ab und schreibt nicht', r2.code !== 0 && writes(l2).length === vorAnz, r2.err.slice(0, 200));
    // Rollback in einen Ordner, der schon ein Ledger trägt: der Zustand steht wieder auf «nach Apply», ein Schreiben wäre möglich
    const rb1 = rollback(s, l, o('a5r'), 'canary-tasse', ziel); const nachRb = writes(l).length;
    cpSync(nachApply, s);
    const rb2 = rollback(s, l, o('a5r'), 'canary-tasse', ziel);
    check('A5 Rollback in einen Ordner mit Ledger bricht ab', rb1.code === 0 && rb2.code !== 0 && /Ledger existiert bereits/.test(rb2.err), rb2.err.slice(0, 200));
    check('A5 …und schreibt nicht', writes(l).length === nachRb); }

  // ---- A6 Full: 16 Writes, Sperren nie; Rollback full stellt alle 19 zurück -------------------------------------------------
  { const [s, l] = kopie('a6', SHOP0); const r = apply(s, l, o('a6o'), 'full');
    check('A6 Full Exit 0', r.code === 0, r.err.slice(0, 200)); check('A6 16 Writes', writes(l).length === 16, String(writes(l).length)); check('A6 keine Sperre geschrieben', !writes(l).some((h) => SPERREN.includes(h)));
    check('A6 Ausgabe: 16 Writes, 3 unverändert', r.json?.changed === 16 && r.json?.unchanged === 3, r.out);
    check('A6 alle 16 Editorprodukte tragen 6.4.0', ['allover-stoffbeutel-selbst-gestalten', TASSE, JUTE, HOODIE, MAUSPAD].every((h) => version(s, h) === '6.4.0'));
    const rb = rollback(s, l, o('a6r'), 'full', o('a6o'));
    check('A6b Rollback full Exit 0', rb.code === 0, rb.err.slice(0, 200)); check('A6b alle 19 wie vor dem Apply', gleichZu(s, SHOP0));
    check('A6b Ausgabe: 16 zurückgestellt, 3 Sperren nicht angefasst', rb.json?.changed === 16 && rb.json?.notWritten === 3 && rb.json?.failed === 0, rb.out);
    check('A6b Ledger: 16 rolled-back, 3 skipped-not-written', JSON.stringify(zustaende(o('a6r'))) === JSON.stringify({ 'skipped-not-written': 3, 'rolled-back': 16 }) || (zustaende(o('a6r'))['rolled-back'] === 16 && zustaende(o('a6r'))['skipped-not-written'] === 3), JSON.stringify(zustaende(o('a6r')))); }

  // ---- A7 Sperrblock verändert -> Full schreibt nichts (Sperren zuerst) ----------------------------------------------------
  { const [s, l] = kopie('a7', SHOP0);
    aendern(s, MAGNET, (p) => { p.descriptionHtml = p.descriptionHtml.replace('if(a.textContent!==msg)a.textContent=msg;', 'a.textContent=msg;'); });
    const r = apply(s, l, o('a7o'), 'full'); check('A7 bricht ab', r.code !== 0); check('A7 schreibt nichts', writes(l).length === 0, JSON.stringify(writes(l))); }

  // ---- A8 Drift zwischen Plan und Write; A8b Status-Wechsel; A8c Canonical-Wechsel ---------------------------------------------
  { const [s, l] = kopie('a8', SHOP0); const r = apply(s, l, o('a8o'), 'canary-tasse', { ATTRAPPE_DRIFT_SECOND_READ: TASSE });
    check('A8 Drift bricht ab', r.code !== 0 && /seit dem Plan verändert/.test(r.err), r.err.slice(0, 200)); check('A8 schreibt nichts', writes(l).length === 0); }
  { const [s, l] = kopie('a8b', SHOP0); const r = apply(s, l, o('a8bo'), 'canary-tasse', { ATTRAPPE_DRAFT_SECOND_READ: TASSE });
    check('A8b Status-Wechsel zwischen Plan und Write bricht ab', r.code !== 0 && /Status DRAFT/.test(r.err), r.err.slice(0, 200)); check('A8b schreibt nichts', writes(l).length === 0); }
  { const [s, l] = kopie('a8c', SHOP0); const r = apply(s, l, o('a8co'), 'canary-tasse', { ATTRAPPE_BAD_CANONICAL_SPAETER: TASSE });
    check('A8c Canonical-Wechsel zwischen Plan und Write bricht ab', r.code !== 0 && /Canonical/.test(r.err), r.err.slice(0, 200)); check('A8c schreibt nichts', writes(l).length === 0); }

  // ---- A9 Netzfehler beim Write: genau ein Versuch, Ledger markiert ------------------------------------------------------------
  { const [s, l] = kopie('a9', SHOP0); const r = apply(s, l, o('a9o'), 'canary-tasse', { ATTRAPPE_THROW_UPDATE: TASSE });
    check('A9 bricht ab', r.code !== 0); check('A9 genau EIN Schreibversuch', writes(l).length === 1, String(writes(l).length));
    check('A9 Ledger unknown-write-response', zustaende(o('a9o'))['unknown-write-response'] === 1, JSON.stringify(zustaende(o('a9o')))); }

  // ---- A10 Canary Jutebeutel schreibt nur den Jutebeutel -----------------------------------------------------------------------
  { const [s, l] = kopie('a10', SHOP0); const r = apply(s, l, o('a10o'), 'canary-jutebeutel');
    check('A10 Exit 0', r.code === 0, r.err.slice(0, 200)); check('A10 nur der Jutebeutel', JSON.stringify(writes(l)) === JSON.stringify([JUTE]), JSON.stringify(writes(l)));
    check('A10 Jutebeutel 6.4.0, Tasse bleibt 6.3.1', version(s, JUTE) === '6.4.0' && version(s, TASSE) === '6.3.1'); }

  // ---- A11 Rollback mit dem Artefakt der falschen Stufe: kein Netzzugriff ---------------------------------------------------------
  { const [s, l] = kopie('a11', SHOP0); apply(s, l, o('a11o'), 'canary-tasse'); const vor = writes(l).length; const vorLesen = reads(l);
    const rb = rollback(s, l, o('a11r'), 'canary-jutebeutel', o('a11o'));
    check('A11 bricht ab', rb.code !== 0); check('A11 schreibt nichts', writes(l).length === vor); check('A11 liest nichts (Prüfung vor jedem Netzzugriff)', reads(l) === vorLesen); }

  // ---- A12 bis A16: Live-Gates für Ziel und Rückweg-Dateien, Rücklesen --------------------------------------------------------------
  { const [s, l] = kopie('a12', SHOP0); const r = apply(s, l, o('a12o'), 'canary-tasse', { ATTRAPPE_EDITOR_TAMPER: '1' });
    check('A12 abweichende Live-Datei des Ziels (SRI-Wettlauf): Abbruch', r.code !== 0 && /Asset-SHA abweichend/.test(r.err), r.err.slice(0, 200)); check('A12 schreibt nichts', writes(l).length === 0); }
  { const [s, l] = kopie('a13', SHOP0); const r = apply(s, l, o('a13o'), 'canary-tasse', { ATTRAPPE_PRED_TAMPER: '1' });
    check('A13 abweichende Live-Datei eines Rückwegs: Abbruch', r.code !== 0 && /Asset-SHA abweichend/.test(r.err), r.err.slice(0, 200)); check('A13 schreibt nichts', writes(l).length === 0); }
  { const [s, l] = kopie('a14', SHOP0); const r = apply(s, l, o('a14o'), 'canary-tasse', { ATTRAPPE_BAD_CANONICAL: TASSE });
    check('A14 falscher Canonical: Abbruch', r.code !== 0 && /Canonical/.test(r.err), r.err.slice(0, 200)); check('A14 schreibt nichts', writes(l).length === 0); }
  { const [s, l] = kopie('a15', SHOP0); const r = apply(s, l, o('a15o'), 'canary-tasse', { ATTRAPPE_READBACK_WRONG: TASSE });
    check('A15 Rücklesung weicht ab: Abbruch', r.code !== 0 && /Rücklesung weicht ab/.test(r.err)); check('A15 genau ein Write (kein zweiter Versuch)', writes(l).length === 1);
    check('A15 Ledger unknown-readback', zustaende(o('a15o'))['unknown-readback'] === 1, JSON.stringify(zustaende(o('a15o')))); }
  { const [s, l] = kopie('a16', SHOP0); const r = apply(s, l, o('a16o'), 'canary-tasse', { ATTRAPPE_EDITOR_NOCORS: '1' });
    check('A16 Ziel ohne CORS/CORP: Abbruch', r.code !== 0 && /CORS\/CORP/.test(r.err), r.err.slice(0, 200)); check('A16 schreibt nichts', writes(l).length === 0); }

  // ---- A17 Full mit einem abgelehnten Produkt: der Rollback aus dem Teil-Ledger stellt alles zurück -------------------------------
  { const [s, l] = kopie('a17', SHOP0); const r = apply(s, l, o('a17o'), 'full', { ATTRAPPE_FAIL_UPDATE: MAUSPAD });
    check('A17 Apply bricht beim abgelehnten Produkt ab', r.code !== 0 && /abgelehnt/.test(r.err), r.err.slice(0, 200));
    check('A17 Ledger: abgelehnt, nicht geschrieben', zustaende(o('a17o')).rejected === 1);
    const rb = rollback(s, l, o('a17r'), 'full', o('a17o'));
    check('A17 Rollback Exit 0', rb.code === 0, rb.err.slice(0, 200)); check('A17 danach alle 19 wie vorher', gleichZu(s, SHOP0)); }

  // ---- A18 Produkt-/Beschreibungsscope: Sperrblock bleibt auch beim Canary unberührt ------------------------------------------------
  { const [s, l] = kopie('a18', SHOP0); aendern(s, TASSE, (p) => { p.variants = p.variants.slice(1); });
    const r = apply(s, l, o('a18o'), 'canary-tasse'); check('A18 geänderter Variantensatz: Abbruch', r.code !== 0 && /Varianten-Scope/.test(r.err), r.err.slice(0, 200)); check('A18 schreibt nichts', writes(l).length === 0); }

  // ---- B1 Rollback eines wirkungslosen Apply: kein stilles «grün» ----------------------------------------------------------------------
  { const [s, l] = kopie('b1', SHOP_ZIEL); const r = apply(s, l, o('b1o'), 'canary-tasse');
    check('B1 Apply auf dem Ziel-Stand: Exit 0, nichts geschrieben', r.code === 0 && writes(l).length === 0, r.err.slice(0, 200));
    check('B1 Ausgabe: 0 geändert, 1 unverändert', r.json?.changed === 0 && r.json?.unchanged === 1, r.out);
    const rb = rollback(s, l, o('b1r'), 'canary-tasse', o('b1o'));
    check('B1 Rollback mit diesem Artefakt endet NICHT grün', rb.code !== 0 && /nichts zurückzunehmen/.test(rb.err), rb.err.slice(0, 300));
    check('B1 …schreibt nichts, Tasse bleibt 6.4.0', writes(l).length === 0 && version(s, TASSE) === '6.4.0');
    const rf = apply(s, l, o('b1fo'), 'full'); const rbf = rollback(s, l, o('b1fr'), 'full', o('b1fo'));
    check('B1 Full auf dem Ziel-Stand: nichts geschrieben; Rollback mit diesem Artefakt endet nicht grün', rf.code === 0 && writes(l).length === 0 && rbf.code !== 0 && /nichts zurückzunehmen/.test(rbf.err), rbf.err.slice(0, 300)); }

  // ---- B2 Full nach beiden Canary-Stufen: der Rollback zählt ehrlich und fasst Tasse und Jutebeutel nicht an ---------------------------------
  { const [s, l] = kopie('b2', STUFEN); const r = apply(s, l, o('b2o'), 'full');
    check('B2 Full nach beiden Stufen: 14 Writes, 5 unverändert (3 Sperren, Tasse, Jutebeutel)', r.code === 0 && writes(l).length === 14 && r.json?.changed === 14 && r.json?.unchanged === 5, `${r.err.slice(0, 120)} ${r.out}`);
    const rb = rollback(s, l, o('b2r'), 'full', o('b2o'));
    check('B2 Rollback Exit 0', rb.code === 0, rb.err.slice(0, 200));
    check('B2 Ausgabe: 14 zurückgestellt, 5 nicht geschrieben, nichts offen', rb.json?.changed === 14 && rb.json?.notWritten === 5 && rb.json?.failed === 0, rb.out);
    const z = zustaende(o('b2r')); check('B2 Ledger: 14 rolled-back, 5 skipped-not-written, nichts already-rolled-back', z['rolled-back'] === 14 && z['skipped-not-written'] === 5 && !z['already-rolled-back'], JSON.stringify(z));
    check('B2 Tasse und Jutebeutel bleiben auf 6.4.0, alle anderen wie vor dem Full', version(s, TASSE) === '6.4.0' && version(s, JUTE) === '6.4.0' && gleichZu(s, STUFEN)); }

  // ---- B2b Die Reihenfolge der Rollbacks ist nicht mehr kritisch: richtig (full, Jutebeutel, Tasse) und falsch (Tasse, Jutebeutel, full) führen auf den Ausgangsstand ----
  { const [s, l] = kopie('b2b', STUFEN); apply(s, l, o('b2bo'), 'full');
    const r1 = rollback(s, l, o('b2b1'), 'full', o('b2bo')); const r2 = rollback(s, l, o('b2b2'), 'canary-jutebeutel', o('sto2')); const r3 = rollback(s, l, o('b2b3'), 'canary-tasse', o('sto1'));
    check('B2b richtige Reihenfolge: alle drei Rollbacks grün, danach der Ausgangsstand (15 × 6.3.0, Tasse 6.3.1)', r1.code === 0 && r2.code === 0 && r3.code === 0 && gleichZu(s, SHOP0), `${r1.err.slice(0, 120)} ${r2.err.slice(0, 120)} ${r3.err.slice(0, 120)}`); }
  { const [s, l] = kopie('b2c', STUFEN); apply(s, l, o('b2co'), 'full');
    const r1 = rollback(s, l, o('b2c1'), 'canary-tasse', o('sto1')); const r2 = rollback(s, l, o('b2c2'), 'canary-jutebeutel', o('sto2')); const r3 = rollback(s, l, o('b2c3'), 'full', o('b2co'));
    check('B2b falsche Reihenfolge (Tasse, Jutebeutel, full): kein Halbzustand mehr, danach der Ausgangsstand', r1.code === 0 && r2.code === 0 && r3.code === 0 && gleichZu(s, SHOP0), `${r1.err.slice(0, 120)} ${r2.err.slice(0, 120)} ${r3.err.slice(0, 120)}`); }

  // ---- B3 Eine seit dem Apply veränderte SPERRSEITE darf den Rollback nicht blockieren ----------------------------------------------------
  { const [s, l] = kopie('b3', SHOP0); apply(s, l, o('b3o'), 'full');
    aendern(s, MAGNET, (p) => { p.descriptionHtml += '<p>von Hand ergänzt</p>'; });
    const rb = rollback(s, l, o('b3r'), 'full', o('b3o'));
    check('B3 Rollback full mit veränderter Sperre: Exit 0', rb.code === 0, rb.err.slice(0, 300));
    check('B3 alle 16 Editorprodukte zurückgestellt (16 + 16 Writes)', writes(l).length === 32, String(writes(l).length));
    check('B3 die Sperrseite bleibt, wie sie ist (nie geschrieben)', stand(s, MAGNET).endsWith('<p>von Hand ergänzt</p>') && !writes(l).slice(16).some((h) => SPERREN.includes(h)));
    check('B3 alle Editorprodukte wie vorher', ['allover-stoffbeutel-selbst-gestalten', TASSE, JUTE, HOODIE, MAUSPAD].every((h) => stand(s, h) === stand(SHOP0, h))); }
  { const [s, l] = kopie('b3b', SHOP0); apply(s, l, o('b3bo'), 'full'); aendern(s, 'dad-cap-selbst-gestalten', (p) => { p.status = 'DRAFT'; p.onlineStoreUrl = null; });
    const rb = rollback(s, l, o('b3br'), 'full', o('b3bo'));
    check('B3b Sperrseite auf ENTWURF: Rollback full läuft trotzdem durch', rb.code === 0 && writes(l).length === 32, rb.err.slice(0, 300)); }

  // ---- B4 Ein einzelnes fremd verändertes Produkt stoppt den Rollback der übrigen NICHT ------------------------------------------------------
  { const [s, l] = kopie('b4', SHOP0); apply(s, l, o('b4o'), 'full');
    aendern(s, HOODIE, (p) => { p.descriptionHtml += '<p>Kundenhinweis</p>'; });
    const rb = rollback(s, l, o('b4r'), 'full', o('b4o'));
    check('B4 Rollback endet NICHT grün (ein Produkt offen)', rb.code !== 0 && /Rollback unvollständig/.test(rb.err) && new RegExp(HOODIE).test(rb.err), rb.err.slice(0, 400));
    check('B4 die übrigen 15 Editorprodukte sind zurückgestellt (16 + 15 Writes)', writes(l).length === 31, String(writes(l).length));
    check('B4 das fremd veränderte Produkt bleibt unangetastet', stand(s, HOODIE).endsWith('<p>Kundenhinweis</p>') && version(s, HOODIE) === '6.4.0');
    const z = zustaende(o('b4r')); check('B4 Ledger: 15 rolled-back, 1 failed-changed, 3 skipped-not-written', z['rolled-back'] === 15 && z['failed-changed'] === 1 && z['skipped-not-written'] === 3, JSON.stringify(z));
    check('B4 Ausgabe nennt die offenen Produkte', rb.json?.failed === 1 && rb.json?.changed === 15, rb.out);
    const rb2 = rollback(s, l, o('b4r2'), 'full', o('b4o'));
    check('B4 zweiter Versuch: 15 schon zurück, nichts geschrieben, Hoodie weiter offen', rb2.code !== 0 && writes(l).length === 31 && zustaende(o('b4r2'))['already-rolled-back'] === 15, JSON.stringify(zustaende(o('b4r2')))); }
  { const [s, l] = kopie('b4b', SHOP0); apply(s, l, o('b4bo'), 'full');
    const rb = rollback(s, l, o('b4br'), 'full', o('b4bo'), { ATTRAPPE_MISSING: HOODIE });
    check('B4b Produkt nicht lesbar (gelöscht): der Rest wird trotzdem zurückgestellt, Exit != 0', rb.code !== 0 && writes(l).length === 31 && /Produkt fehlt/.test(rb.err + (lies(join(o('b4br'), 'ledger.json')).products.find((r) => r.handle === HOODIE)?.fehler || '')), rb.err.slice(0, 300)); }

  // ---- B4c Ein Produkt mit anderer Identität (Handle geändert) wird nie überschrieben; die übrigen werden zurückgestellt -------------------------------
  { const [s, l] = kopie('b4c', SHOP0); apply(s, l, o('b4co'), 'full');
    aendern(s, HOODIE, (p) => { p.handle = 'umbenannt-woanders'; });
    const rb = rollback(s, l, o('b4cr'), 'full', o('b4co'));
    const zeile = ledgerRows(o('b4cr')).find((r) => r.handle === HOODIE);
    check('B4c Identität weicht ab: Exit != 0, nichts überschrieben, die übrigen 15 zurückgestellt', rb.code !== 0 && writes(l).length === 31 && /Identität/.test(rb.err) && version(s, 'umbenannt-woanders') === '6.4.0', rb.err.slice(0, 300));
    check('B4c Ledger: dieses Produkt «failed» mit Grund, 15 rolled-back', zeile?.state === 'failed' && /Identität/.test(zeile?.fehler || '') && zustaende(o('b4cr'))['rolled-back'] === 15, JSON.stringify(zeile)); }

  // ---- B5 ENTWURF/nicht kaufbar hindert den Rollback nicht (nur Hinweis im Ledger) ---------------------------------------------------------------
  { const [s, l] = kopie('b5', SHOP0); apply(s, l, o('b5o'), 'canary-jutebeutel');
    aendern(s, JUTE, (p) => { p.status = 'DRAFT'; p.onlineStoreUrl = null; });
    const rb = rollback(s, l, o('b5r'), 'canary-jutebeutel', o('b5o'));
    check('B5 Canary auf ENTWURF: Rollback läuft', rb.code === 0 && writes(l).length === 2, rb.err.slice(0, 300));
    check('B5 Jutebeutel wieder 6.3.0', version(s, JUTE) === '6.3.0');
    check('B5 Ledger nennt den Status als Hinweis', JSON.stringify(ledgerRows(o('b5r'))).includes('DRAFT'), JSON.stringify(ledgerRows(o('b5r')))); }
  { const [s, l] = kopie('b5b', SHOP0); apply(s, l, o('b5bo'), 'full'); aendern(s, HOODIE, (p) => { p.status = 'DRAFT'; p.onlineStoreUrl = null; });
    const rb = rollback(s, l, o('b5br'), 'full', o('b5bo'));
    check('B5b Full-Rollback mit einem ENTWURF: alle 16 zurück', rb.code === 0 && writes(l).length === 32 && gleichZu(s, SHOP0), rb.err.slice(0, 300)); }

  { const [s, l] = kopie('b5c', SHOP0); apply(s, l, o('b5co'), 'canary-jutebeutel');
    const rb = rollback(s, l, o('b5cr'), 'canary-jutebeutel', o('b5co'), { ATTRAPPE_BAD_CANONICAL: JUTE });
    check('B5c Storefront meldet einen falschen Canonical: der Rollback läuft trotzdem (nur Hinweis nach dem Write)', rb.code === 0 && writes(l).length === 2 && version(s, JUTE) === '6.3.0', rb.err.slice(0, 300));
    check('B5c Ledger nennt den Storefront-Befund als Hinweis', /Storefront: .*Canonical/.test(JSON.stringify(ledgerRows(o('b5cr')))), JSON.stringify(ledgerRows(o('b5cr')))); }

  // ---- B6 Abbruch zwischen Write und Ledger (Cancel im Actions-UI): Absichtszeile im Ledger macht den Rückweg möglich ---------------------------------
  { const [s, l] = kopie('b6', SHOP0); const vor = stand(s, TASSE);
    const r = apply(s, l, o('b6o'), 'canary-tasse', { ATTRAPPE_EXIT_AFTER_WRITE: TASSE });
    check('B6 Lauf endet mitten im Write (Exit 9)', r.code === 9, `${r.code} ${r.err.slice(0, 160)}`);
    check('B6 geschrieben, aber nicht zurückgelesen', version(s, TASSE) === '6.4.0' && writes(l).length === 1);
    check('B6 Ledger trägt die Absichtszeile «writing»', existsSync(join(o('b6o'), 'ledger.json')) && zustaende(o('b6o')).writing === 1, existsSync(join(o('b6o'), 'ledger.json')) ? JSON.stringify(zustaende(o('b6o'))) : 'kein Ledger');
    const rb = rollback(s, l, o('b6r'), 'canary-tasse', o('b6o'));
    check('B6 Rollback aus diesem Artefakt stellt die Tasse byte-genau zurück', rb.code === 0 && stand(s, TASSE) === vor && writes(l).length === 2, rb.err.slice(0, 300));
    const rb2 = rollback(s, l, o('b6r2'), 'canary-tasse', o('b6o'));
    check('B6 zweiter Rollback: «schon zurückgestellt», kein Write, Exit 0', rb2.code === 0 && writes(l).length === 2 && zustaende(o('b6r2'))['already-rolled-back'] === 1, `${rb2.err.slice(0, 200)} ${JSON.stringify(zustaende(o('b6r2')))}`);
    check('B6 Ausgabe zählt ehrlich: 0 geändert, 1 schon zurück', rb2.json?.changed === 0 && rb2.json?.alreadyRolledBack === 1, rb2.out); }

  // ---- B7 Der Rollback braucht weder die lokalen Editor-/Kartendateien noch die Quell-Allowlist (Notfall: 6.4.0.js nachträglich geändert) -------------
  { const [s, l] = kopie('b7', SHOP0); const vor = stand(s, TASSE); apply(s, l, o('b7o'), 'canary-tasse');
    const leer = o('b7-leer'); mkdirSync(leer, { recursive: true });
    const rb = rollback(s, l, o('b7r'), 'canary-tasse', o('b7o'), { ASSET_ROOT: leer, SOURCE_ALLOWLIST: join(leer, 'gibts-nicht.json'), ATTRAPPE_EDITOR_TAMPER: '1' });
    check('B7 Rollback ohne lokale Assets, ohne Allowlist, mit abweichender Live-Editor-Datei: Exit 0 und byte-genau zurück', rb.code === 0 && stand(s, TASSE) === vor, rb.err.slice(0, 300)); }

  // ---- C Alter 6.3.1-Pfad: dieselben Schutzregeln, Ergebnis wie bisher --------------------------------------------------------------------------
  { const [s, l] = kopie('c1', SHOP_ALT); const vor = stand(s, TASSE);
    const alt = { EDITOR_VERSION: '', MODE: 'apply', LIVE: '1', SCOPE: 'canary', ACK: 'V63_CANARY_TASSE' };
    const r = run(s, l, o('c1o'), alt);
    check('C1 alter Pfad: Canary schreibt nur die Tasse auf 6.3.1', r.code === 0 && JSON.stringify(writes(l)) === JSON.stringify([TASSE]) && version(s, TASSE) === '6.3.1', r.err.slice(0, 300));
    const rb = run(s, l, o('c1r'), { EDITOR_VERSION: '', MODE: 'rollback', LIVE: '1', SCOPE: 'canary', ACK: 'V63_ROLLBACK_TASSE', ROLLBACK_PLAN: o('c1o') });
    check('C1 alter Pfad: Rollback stellt die Tasse byte-genau zurück', rb.code === 0 && stand(s, TASSE) === vor, rb.err.slice(0, 300)); }
  { const [s, l] = kopie('c2', SHOP_ALT);
    const r = run(s, l, o('c2o'), { EDITOR_VERSION: '', MODE: 'apply', LIVE: '1', SCOPE: 'full', ACK: 'V63_FULL_19_SAFE' });
    check('C2 alter Pfad: Full schreibt 16 Editorprodukte auf 6.3.1, die Sperren nie', r.code === 0 && writes(l).length === 16 && !writes(l).some((h) => SPERREN.includes(h)) && version(s, JUTE) === '6.3.1', r.err.slice(0, 300));
    const rb = run(s, l, o('c2r'), { EDITOR_VERSION: '', MODE: 'rollback', LIVE: '1', SCOPE: 'full', ACK: 'V63_ROLLBACK_19_SAFE', ROLLBACK_PLAN: o('c2o') });
    check('C2 alter Pfad: Full-Rollback stellt alle 19 zurück', rb.code === 0 && gleichZu(s, SHOP_ALT), rb.err.slice(0, 300)); }
} finally {
  rmSync(W, { recursive: true, force: true });
}
console.log(`${n} Prüfungen, ${fehler.length} Fehler${fehler.length ? `:\n  ${fehler.join('\n  ')}` : ''}`);
process.exit(fehler.length ? 1 : 0);
