// review_doppel.mjs — Tor gegen doppelt gepostete Lieferanten-Bewertungen + Lauf-Sperre (14.10.2026).
// EINE Quelle für cj_reviews_import.mjs und seinen Test. Beim Import startet NICHTS (kein Netz, kein Top-Level-Lauf).
//
// ANLASS: cj_reviews_import.mjs prüfte vor dem POST nur sein lokales Ledger (Set «done»), nie Judge.me selbst. Liefen zwei
// Instanzen oder ging das Ledger verloren (Snapshot-Rewind), wurde derselbe CJ-Kommentar erneut gepostet — jedes Mal neu
// übersetzt («Sehr einfach zu installieren und stabil.» → «Super einfach zu montieren und stabil.»).
// GEMESSEN 14.10. (judgeme_doppel_wache.py): 296 Doppel auf 67 Produkten; auf den 59 aktiven davon 277 von 591 Bewertungen
// Kopien (47 %). Eine Kopie zählt eine Stimme doppelt — auch in ratingCount/reviewCount für Google (UWG Art. 3).
//
// REGEL (torEntscheid): Ein neuer Kommentar wird NICHT gepostet, wenn bei Judge.me schon eine Bewertung DESSELBEN Produkts
// mit GLEICHEN Sternen und ähnlichem Text liegt. Verglichen wird der ORIGINALTEXT und die ÜBERSETZUNG (eine frühere Fassung
// kann unübersetzt gepostet worden sein, wenn Gemini ausfiel). Ausgeblendete Bewertungen (curated=spam) zählen mit: was die
// Doppel-Wache ausgeblendet hat, darf nicht neu hereinkommen. Kein Abgleich «eins zu eins»: jede ähnliche Vorlage sperrt —
// sonst postete der nächste Lauf den zweiten von zwei ähnlichen Kurztexten, und die Doppel-Wache blendete ihn wieder aus.
// vorhandene = null heisst «Judge.me nicht lesbar» → NICHTS posten (nie blind).
//
// ÄHNLICHKEIT (aehnlichkeit): Dice-Koeffizient über Zeichen-TRIGRAMME (Multimenge) des normierten Texts — klein, ä→ae ö→oe
// ü→ue ß→ss, Akzente weg, nur Buchstaben/Ziffern, Wortgrenze = ein Leerzeichen, vorne/hinten je ein Leerzeichen.
// GEEICHT 14.10. am Lese-Dump (14'417 Bewertungen, 3'403 Läufe). Treffer = die 273 Kopie↔Vorlage-Paare der Doppel-Wache.
// Fehlalarm = jede Bewertung gegen die ANDEREN, nicht wortgleichen Kommentare ihres eigenen Laufs mit gleichen Sternen
// (verschiedene CJ-Kommentare eines Abrufs — so verschieden wie ein wirklich neuer Kommentar vom schon geposteten Paket):
//   Trigramm ≥ 0,50  → 268/273 Kopien (98,2 %), Fehlalarm 639/14'417 (4,4 %)   ← gewählt
//   Trigramm ≥ 0,55  → 263/273 (96,3 %), 3,1 %
//   Bigramm  ≥ 0,60  → 264/273 (96,7 %), 5,9 %   ·   Bigramm ≥ 0,65 → 260/273 (95,2 %), 3,0 %
//   Beispiel «Sehr einfach zu installieren und stabil.» ↔ «Super einfach zu montieren und stabil.» = 0,684 (Trigramm).
// Verfehlt werden nur kurze Synonym-Übersetzungen («Hervorragendes Produkt.» ↔ «Ausgezeichnetes Produkt.» = 0,40) — die
// fängt die Doppel-Wache danach. Der Rezensentenname taugt NICHT als Zusatzsignal: im selben Lauf tragen 2'878 von 2'884
// Paaren verschiedener Kommentare denselben (von CJ maskierten) Namen, z. B. «C***t».
// Die Fehlalarm-Richtung ist gewollt: ein übersprungener echter Kommentar kostet eine Stimme, eine Kopie täuscht eine vor.
//
//   import { laufSperre, torEntscheid, AEHNLICH } from './lib/review_doppel.mjs';
import fs from 'node:fs';

export const AEHNLICH = 0.5;

export function textNorm(t) {
  return String(t ?? '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function trigramme(s) {
  const m = new Map();
  for (let i = 0; i + 3 <= s.length; i++) { const g = s.slice(i, i + 3); m.set(g, (m.get(g) || 0) + 1); }
  return m;
}

/** Dice über Zeichen-Trigramme des normierten Texts, 0…1. Leerer Text ist niemandem ähnlich (0). */
export function aehnlichkeit(a, b) {
  const x = textNorm(a), y = textNorm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const A = trigramme(` ${x} `), B = trigramme(` ${y} `);
  let gemeinsam = 0, na = 0, nb = 0;
  for (const [g, n] of A) { gemeinsam += Math.min(n, B.get(g) || 0); na += n; }
  for (const n of B.values()) nb += n;
  return na + nb ? (2 * gemeinsam) / (na + nb) : 0;
}

/** Sterne wie jmPost sie sendet (1–5, ohne Wert 5), ganzzahlig — sonst wäre 4.0 ≠ «4». */
export const sterne = x => Math.max(1, Math.min(5, Math.round(Number(x) || 5)));

/** Beste vorhandene Bewertung mit gleichen Sternen und Ähnlichkeit ≥ schwelle, sonst null.
 *  neu = { rating, texte: [original, übersetzung, …] } · vorhandene = [{ id, rating, body }] */
export function vorlage(neu, vorhandene, schwelle = AEHNLICH) {
  const st = sterne(neu.rating);
  const texte = [...new Set((neu.texte || []).map(t => String(t ?? '').trim()).filter(t => textNorm(t)))];
  let best = null;
  for (const e of vorhandene) {
    if (sterne(e.rating) !== st) continue;
    for (const t of texte) {
      const s = aehnlichkeit(t, e.body);
      if (s >= schwelle && (!best || s > best.sim)) best = { id: e.id, sim: s, text: String(e.body ?? '') };
    }
  }
  return best;
}

/** Entscheid für die Kommentare EINES Produkts. vorhandene = Liste aller Judge.me-Bewertungen dieses Produkts
 *  (auch ausgeblendete) oder null = nicht lesbar. Rückgabe { lesbar, posten: [neu…], doppel: [{ neu, vorlage }] }. */
export function torEntscheid(neue, vorhandene, schwelle = AEHNLICH) {
  if (!Array.isArray(vorhandene)) return { lesbar: false, posten: [], doppel: [] };
  const posten = [], doppel = [];
  for (const n of neue) {
    const v = vorlage(n, vorhandene, schwelle);
    if (v) doppel.push({ neu: n, vorlage: v }); else posten.push(n);
  }
  return { lesbar: true, posten, doppel };
}

// ── Lauf-Sperre ────────────────────────────────────────────────────────────────────────────────────────────────────────
// O_EXCL-Lockdatei mit «PID Zeit». Belegt + Besitzer lebt UND führt dieses Skript aus (argv, nicht nur «PID existiert» —
// nach dem stündlichen Container-Neustart werden PIDs neu vergeben, Lehre 11.08.: Prozessprüfung argv-basiert) → nicht
// starten. Besitzer tot/fremd → verwaist → genau DIESE Datei entfernen (gleicher Inode) und neu versuchen. Leere Datei =
// gerade im Anlegen (zwischen open und write) → erst nach LEER_FRIST_MS verwaist.
const LEER_FRIST_MS = 10000;

function sperrPid(pfad) { try { return parseInt(fs.readFileSync(pfad, 'utf8'), 10) || null; } catch { return null; } }

/** Lebt pid und ist es ein node-Prozess, der `skript` ausführt? Ohne /proc (kein Linux): lebender Prozess zählt (vorsichtig). */
export function prozessLaeuft(pid, skript) {
  try { process.kill(pid, 0); } catch (e) { if (e.code !== 'EPERM') return false; }
  if (!skript) return true;
  let argv;
  try { argv = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').filter(Boolean); } catch { return !fs.existsSync('/proc/self'); }
  return /(^|\/)node[\d.]*$/.test(argv[0] || '') && argv.slice(1).some(a => a === skript || a.endsWith('/' + skript));
}

/** { ok: true, freigeben } oder { ok: false, pid, grund }. freigeben() löscht nur eine Sperre mit der EIGENEN PID. */
export function laufSperre(pfad, { skript = '', istAktiv = prozessLaeuft } = {}) {
  for (let versuch = 0; versuch < 3; versuch++) {
    try {
      const fd = fs.openSync(pfad, 'wx');                       // O_CREAT | O_EXCL
      try { fs.writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`); } finally { fs.closeSync(fd); }
      let frei = false;
      const freigeben = () => {
        if (frei) return; frei = true;
        try { if (sperrPid(pfad) === process.pid) fs.unlinkSync(pfad); } catch {}
      };
      return { ok: true, freigeben };
    } catch (e) { if (e.code !== 'EEXIST') throw e; }
    let st;
    try { st = fs.statSync(pfad); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    const pid = sperrPid(pfad);
    if (!pid) {
      if (Date.now() - st.mtimeMs < LEER_FRIST_MS) return { ok: false, pid: null, grund: 'Sperre wird gerade angelegt' };
    } else if (pid !== process.pid && istAktiv(pid, skript)) {
      return { ok: false, pid, grund: 'andere Instanz läuft' };
    }
    // verwaist: nur entfernen, wenn es noch DIESELBE Datei ist (eine frisch angelegte fremde Sperre hat einen neuen Inode)
    try { if (fs.statSync(pfad).ino === st.ino) fs.unlinkSync(pfad); } catch {}
  }
  return { ok: false, pid: null, grund: 'Sperre nach 3 Versuchen nicht erhältlich' };
}
