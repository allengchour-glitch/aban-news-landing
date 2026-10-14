/* queue_csv.mjs — EIN Weg, eine geteilte Social-Queue-CSV zu schreiben (14.10.2026).
 *
 * ANLASS: meta_reel_post.mjs und metricool_tiktok_post.mjs lasen automation/reels_seed.csv beim Start und schrieben
 * Minuten später (Upload, Metricool, Prüfungen) die GANZE Datei aus ihrer alten Kopie zurück. Zeilen, die der Reel-Motor
 * (appendReel) dazwischen angehängt hatte, verschwanden. GEMESSEN 14.10.: 8 fertige Reels in social/reels/ ohne
 * Queue-Zeile. Der Waisen-Nachtrag holte sie nie zurück (Filter `!gebaut.has(p)`). Dieselbe Klasse an weiteren Schreibern.
 *
 * REGEL: Wer eine Queue-CSV schreibt, schreibt nur über diesen Baustein (Python: automation/queue_csv.py, gleiche Sperre,
 * gleiche Regeln). Er
 *   1. nimmt eine kurze Sperre (/tmp/queuecsv_<pfad>.lock — nur für Lesen+Zusammenführen+Schreiben, Millisekunden),
 *   2. liest die Datei FRISCH,
 *   3. setzt nur die EIGENEN Änderungen ein (3-Wege: basis = was der Schreiber gelesen hat, meine = was er schreiben will,
 *      frisch = was jetzt drinsteht; je Feld gewinnt die eigene Änderung, sonst der frische Stand),
 *   4. schreibt atomar (Nachbardatei + rename — der Auto-Committer sieht nie eine halbe Datei).
 * Schlüssel einer Zeile = Spalte «id» (+ laufende Nummer bei doppelten IDs). Spalten werden über den Kopf abgebildet.
 *
 *   import { lesen, schnappschuss, schreiben, anhaengen } from './lib/queue_csv.mjs';
 *   const rows = lesen(CSV); let basis = schnappschuss(rows);
 *   … cand[idx.status] = 'posted';
 *   schreiben(CSV, basis, rows); basis = schnappschuss(rows);      // nach JEDEM Schreiben die Basis nachziehen
 *   anhaengen(CSV, [[id, datum, url, cap, tags, platforms, 'ready', '', '']]);   // steht die id schon drin: nichts
 *
 *   node automation/lib/queue_csv.mjs --selbsttest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPERRE_WARTEN_MS = 60000;   // länger wartet niemand — dann ist etwas faul (Fehler statt stilles Überschreiben)
const SPERRE_ALT_MS = 120000;     // eine Sperre, die älter ist, gehört einem abgestürzten Prozess

export function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const esc = v => { v = String(v ?? ''); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
export const serialisieren = rows => rows.map(r => r.map(esc).join(',')).join('\n') + (rows.length ? '\n' : '');
export const schnappschuss = rows => rows.map(r => [...r]);
export function lesen(datei) { return fs.existsSync(datei) ? parseCsv(fs.readFileSync(datei, 'utf8')) : []; }

// Endet der Text innerhalb eines Feldes in Anführungszeichen? (= halb geschrieben)
function offenesFeld(text) { let q = false; for (let i = 0; i < text.length; i++) if (text[i] === '"') q = !q; return q; }
/** Frisch lesen für einen Schreibvorgang — nur eine VOLLSTÄNDIGE Datei zählt (Prüfer 14.10.: git merge/checkout und noch
 *  nicht umgestellte Schreiber legen die Datei neu an bzw. schreiben sie mit O_TRUNC; wer in diesem Moment liest, sieht eine
 *  leere oder halbe Datei). Gültig = existiert, nicht leer, endet auf Zeilenumbruch, kein offenes Anführungszeichen und
 *  zweimal im Abstand von 30 ms gleich gelesen. Sonst bis ~4 s neu versuchen; danach null. */
export function frischLesen(datei, versuche = 50) {
  for (let i = 0; i < versuche; i++) {
    try {
      const a = fs.readFileSync(datei, 'utf8'); schlafen(30); const b = fs.readFileSync(datei, 'utf8');
      if (a === b && a.length && a.endsWith('\n') && !offenesFeld(a)) return parseCsv(a);
    } catch {}
    schlafen(50);
  }
  return null;
}

export function sperrPfad(datei) { return '/tmp/queuecsv_' + path.resolve(datei).replace(/[^A-Za-z0-9._-]/g, '_') + '.lock'; }
const schlafen = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function lebt(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }

export function mitSperre(datei, fn) {
  const lp = sperrPfad(datei), ende = Date.now() + SPERRE_WARTEN_MS;
  for (;;) {
    try { const fd = fs.openSync(lp, 'wx'); fs.writeSync(fd, `${process.pid} ${Date.now()}`); fs.closeSync(fd); break; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let alt = false;
      try { const [pid, t] = fs.readFileSync(lp, 'utf8').trim().split(/\s+/).map(Number); alt = !lebt(pid) || Date.now() - t > SPERRE_ALT_MS; }
      catch { alt = true; }   // leer/halb geschrieben: nur übernehmen, wenn sie auch nach kurzer Pause noch so ist
      if (alt) { schlafen(30); try { const [pid, t] = fs.readFileSync(lp, 'utf8').trim().split(/\s+/).map(Number); if (!lebt(pid) || Date.now() - t > SPERRE_ALT_MS) fs.unlinkSync(lp); } catch { try { fs.unlinkSync(lp); } catch {} } continue; }
      if (Date.now() > ende) throw new Error(`queue_csv: Sperre ${lp} seit ${SPERRE_WARTEN_MS / 1000} s belegt — nichts geschrieben`);
      schlafen(25 + Math.floor(Math.random() * 50));
    }
  }
  try { return fn(); } finally { try { if (fs.readFileSync(lp, 'utf8').startsWith(`${process.pid} `)) fs.unlinkSync(lp); } catch {} }
}

export function atomarSchreiben(datei, text) {
  const tmp = path.join(path.dirname(datei), `.${path.basename(datei)}.tmp-${process.pid}`);
  fs.writeFileSync(tmp, text); fs.renameSync(tmp, datei);
}

function schluesselListe(rows, idI) {
  const n = new Map();
  return rows.slice(1).map(r => { const id = r[idI] ?? ''; const c = n.get(id) || 0; n.set(id, c + 1); return id + '\u0000' + c; });
}
function alsKarte(rows, kopf) {
  const k = new Map(); if (!rows.length) return { k, reihe: [] };
  const h = rows[0], idI = Math.max(0, h.indexOf('id')), sl = schluesselListe(rows, idI);
  sl.forEach((s, i) => { const r = rows[i + 1], o = {}; kopf.forEach(c => { const j = h.indexOf(c); o[c] = j < 0 ? undefined : (r[j] ?? ''); }); k.set(s, o); });
  return { k, reihe: sl };
}
const gleich = (a, b, kopf) => kopf.every(c => (a[c] ?? '') === (b[c] ?? ''));

/** 3-Wege-Zusammenführung. Liefert { rows, stat }. */
export function zusammenfuehren(basis, meine, frisch) {
  const kopf = [...(frisch[0] || meine[0] || basis[0] || [])];
  for (const h of (meine[0] || [])) if (!kopf.includes(h)) kopf.push(h);
  const B = alsKarte(basis, kopf).k, M = alsKarte(meine, kopf), F = alsKarte(frisch, kopf);
  const stat = { fremd_behalten: 0, eigen_geaendert: 0, eigen_neu: 0, eigen_geloescht: 0, fremd_fehlend_behalten: 0 };
  const aus = [], wert = (o, c) => o[c] === undefined ? '' : o[c];
  for (const s of F.reihe) {
    const f = F.k.get(s), m = M.k.get(s), b = B.get(s);
    if (m && b) {
      const o = {}; let eigen = false;
      for (const c of kopf) { const mv = wert(m, c), bv = wert(b, c); if (m[c] !== undefined && mv !== bv) { o[c] = mv; eigen = eigen || mv !== wert(f, c); } else o[c] = wert(f, c); }
      if (eigen) stat.eigen_geaendert++; aus.push(o);
    } else if (m && !b) aus.push(f);                                     // beide haben dieselbe Zeile angelegt: die vorhandene gilt
    else if (!m && b) { if (gleich(f, b, kopf)) stat.eigen_geloescht++; else aus.push(f); }   // ich habe gelöscht; fremd geändert → bleibt
    else { aus.push(f); stat.fremd_behalten++; }                          // fremd angelegt
  }
  for (const s of M.reihe) {
    if (F.k.has(s)) continue;
    const m = M.k.get(s), b = B.get(s);
    if (!b) { aus.push(m); stat.eigen_neu++; }
    // Fehlt eine Zeile, die ich gelesen und NICHT gelöscht habe: Queues sind Anhänge-Listen (niemand löscht Zeilen, alle setzen
    // einen Status) → das ist eine gekürzte/zurückgesetzte Datei, keine Löschung. Die Zeile bleibt (Prüfer 14.10.: mit «fremd
    // gelöscht = weg» blieben von 100 Zeilen bei leerer Datei 1, bei 30 % geschriebener Datei 29).
    else { aus.push(m); if (gleich(m, b, kopf)) stat.fremd_fehlend_behalten++; else stat.eigen_geaendert++; }
  }
  return { rows: [kopf, ...aus.map(o => kopf.map(c => wert(o, c)))], stat };
}

/** Schreibt die eigenen Änderungen (meine gegenüber basis) in den FRISCHEN Stand. Danach: basis = schnappschuss(meine). */
export function schreiben(datei, basis, meine) {
  return mitSperre(datei, () => {
    let frisch = frischLesen(datei);
    // Keine gültige frische Datei (fehlt/leer/halb): die eigene vollständige Fassung schreiben — so «heilte» der alte Weg
    // eine kaputte Datei, und nichts von dem, was dieser Schreiber gelesen hat, geht verloren.
    if (!frisch) { console.error(`[queue_csv] ${datei}: frische Datei leer/halb geschrieben — schreibe die eigene vollständige Fassung`); frisch = basis; }
    const { rows, stat } = zusammenfuehren(basis, meine, frisch);
    atomarSchreiben(datei, serialisieren(rows));
    return stat;
  });
}

/** Hängt Zeilen an (Spaltenfolge wie der Kopf der Datei). Eine id, die schon drinsteht, wird nicht doppelt angehängt. */
export function anhaengen(datei, zeilen) {
  return mitSperre(datei, () => {
    const rows = frischLesen(datei); if (!rows || !rows.length) throw new Error(`queue_csv: ${datei} fehlt/leer/halb geschrieben — nichts angehängt`);
    const idI = Math.max(0, rows[0].indexOf('id')), da = new Set(rows.slice(1).map(r => r[idI]));
    let neu = 0;
    for (const z of zeilen) { if (da.has(z[idI])) continue; rows.push(z.map(v => String(v ?? ''))); da.add(z[idI]); neu++; }
    if (neu) atomarSchreiben(datei, serialisieren(rows));
    return neu;
  });
}

/** Freier Umbau unter der Sperre: fn(frischeRows) → neue Rows (oder null = nichts schreiben). Für Säuberer/Filter. */
export function umbauen(datei, fn) {
  return mitSperre(datei, () => {
    const frisch = frischLesen(datei); if (!frisch || !frisch.length) throw new Error(`queue_csv: ${datei} fehlt/leer/halb geschrieben — nichts umgebaut`);
    const neu = fn(frisch); if (neu) atomarSchreiben(datei, serialisieren(neu)); return !!neu;
  });
}

// ------------------------------------------------------------------------------------------------- Selbsttest
export function selbsttest() {
  const fehler = [], pruef = (ok, was) => { if (!ok) fehler.push(was); };
  const K = ['id', 'scheduled_date', 'video_url', 'caption', 'status', 'posted_at'];
  const basis = [K, ['a', '1', 'u1', 'c,1', 'ready', ''], ['b', '1', 'u2', 'c2', 'ready', ''], ['c', '1', 'u3', 'c3', 'ready', '']];
  // Poster: liest basis, markiert a gepostet, löscht c
  const meine = schnappschuss(basis); meine[1][4] = 'posted'; meine[1][5] = 'T1'; meine.splice(3, 1);
  // Motor hängt d an, Säuberer ändert b-Caption — während der Poster arbeitet
  const frisch = schnappschuss(basis); frisch.push(['d', '2', 'u4', 'neu "x"', 'ready', '']); frisch[2][3] = 'c2-neu';
  const { rows, stat } = zusammenfuehren(basis, meine, frisch);
  const id = rows.slice(1).map(r => r[0]).join('');
  pruef(id === 'abd', `Reihenfolge/Bestand abd, ist ${id}`);
  pruef(rows[1][4] === 'posted' && rows[1][5] === 'T1', 'eigene Statusänderung übernommen');
  pruef(rows[2][3] === 'c2-neu', 'fremde Caption-Änderung behalten');
  pruef(rows[3][3] === 'neu "x"', 'fremd angehängte Zeile behalten (mit Anführungszeichen)');
  pruef(stat.fremd_behalten === 1 && stat.eigen_geloescht === 1 && stat.eigen_geaendert === 1, `Statistik ${JSON.stringify(stat)}`);
  // Konflikt im selben Feld: eigene Änderung gewinnt; anderes Feld derselben Zeile: fremde bleibt
  const b2 = [K, ['a', '1', 'u1', 'c', 'ready', '']], m2 = schnappschuss(b2), f2 = schnappschuss(b2);
  m2[1][4] = 'posted'; f2[1][4] = 'skip'; f2[1][3] = 'neu';
  const r2 = zusammenfuehren(b2, m2, f2).rows[1]; pruef(r2[4] === 'posted' && r2[3] === 'neu', `Feldweise: ${r2}`);
  // fehlt im frischen Stand (gekürzt/zurückgesetzt): Zeilen bleiben, eigene Änderung inklusive
  const b3 = [K, ['a', '1', 'u', 'c', 'ready', ''], ['b', '1', 'u', 'c', 'ready', '']], m3 = schnappschuss(b3), f3 = [K];
  m3[2][4] = 'posted'; const r3 = zusammenfuehren(b3, m3, f3);
  pruef(r3.rows.length === 3 && r3.rows[2][4] === 'posted' && r3.stat.fremd_fehlend_behalten === 1, `Gekürzte Datei: ${JSON.stringify(r3)}`);
  // Spalten über den Kopf: frischer Kopf hat eine Spalte mehr
  const f4 = [[...K, 'neu_spalte'], ['a', '1', 'u1', 'c', 'ready', '', 'x']], b4 = [K, ['a', '1', 'u1', 'c', 'ready', '']], m4 = schnappschuss(b4); m4[1][4] = 'posted';
  const r4 = zusammenfuehren(b4, m4, f4).rows; pruef(r4[0].length === 7 && r4[1][6] === 'x' && r4[1][4] === 'posted', `Spaltenabbildung ${JSON.stringify(r4)}`);
  // doppelte id: zweite Zeile wird separat geführt
  const b5 = [K, ['a', '1', 'u1', 'c', 'ready', ''], ['a', '2', 'u1', 'c', 'ready', '']], m5 = schnappschuss(b5); m5[2][4] = 'posted';
  const r5 = zusammenfuehren(b5, m5, schnappschuss(b5)).rows; pruef(r5[1][4] === 'ready' && r5[2][4] === 'posted', 'doppelte id getrennt');
  // Rundlauf parse/serialisieren
  const txt = 'id,caption\nx,"a,b\nzweite ""Zeile"""\ny,z\n'; pruef(serialisieren(parseCsv(txt)) === txt, 'Rundlauf parse/serialisieren');
  // Datei: Sperre, anhängen, schreiben, gleichzeitige Prozesse
  const dir = fs.mkdtempSync('/tmp/queuecsv-test-'), d = path.join(dir, 'q.csv');
  fs.writeFileSync(d, serialisieren(basis));
  pruef(anhaengen(d, [['d', '2', 'u4', 'x', 'ready', '']]) === 1 && anhaengen(d, [['d', '2', 'u4', 'x', 'ready', '']]) === 0, 'anhaengen ohne Doppel');
  const st = schreiben(d, basis, meine); const nach = lesen(d).slice(1).map(r => r[0]).join('');
  pruef(nach === 'abd' && st.fremd_behalten === 1, `schreiben auf Datei: ${nach} ${JSON.stringify(st)}`);
  pruef(!fs.readdirSync(dir).some(f => f.includes('.tmp-')), 'keine Nachbardatei liegengeblieben');
  // Prüfer 14.10.: leere / halb geschriebene frische Datei darf nichts kürzen
  const voll = [K, ...Array.from({ length: 100 }, (_, i) => [`z${i}`, '1', 'u', 'c,x', 'ready', ''])];
  const mv = schnappschuss(voll); mv[5][4] = 'posted';
  fs.writeFileSync(d, ''); schreiben(d, voll, mv); const nachLeer = lesen(d);
  pruef(nachLeer.length === 101 && nachLeer[5][4] === 'posted', `leere Datei: ${nachLeer.length - 1} Zeilen`);
  const ganz = serialisieren(voll); fs.writeFileSync(d, ganz.slice(0, Math.floor(ganz.length * 0.3)));
  schreiben(d, voll, mv); const nachHalb = lesen(d);
  pruef(nachHalb.length === 101 && nachHalb.every(r => r.length === K.length), `30-%-Datei: ${nachHalb.length - 1} Zeilen`);
  fs.writeFileSync(d, ganz.slice(0, Math.floor(ganz.length * 0.3)));
  let warf = false; try { anhaengen(d, [['neu', '1', 'u', 'c', 'ready', '']]); } catch { warf = true; }
  pruef(warf, 'anhaengen an halbe Datei bricht ab statt zu kürzen');
  fs.writeFileSync(d, ganz);
  // Sperre eines toten Prozesses wird übernommen
  fs.writeFileSync(sperrPfad(d), `999999 ${Date.now()}`); pruef(anhaengen(d, [['e', '3', 'u', 'x', 'ready', '']]) === 1, 'tote Sperre übernommen');
  fs.rmSync(dir, { recursive: true, force: true });
  return fehler;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) && process.argv.includes('--selbsttest')) {
  const f = selbsttest();
  console.log(f.length ? `❌ queue_csv.mjs: ${f.length} Fehler\n - ${f.join('\n - ')}` : '✅ queue_csv.mjs Selbsttest ok');
  process.exit(f.length ? 1 : 0);
}
