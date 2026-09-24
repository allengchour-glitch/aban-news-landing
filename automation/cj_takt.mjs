// cj_takt.mjs — dieselbe Stempeluhr wie cj_takt.py: RESERVIERTE Startzeiten, Start-zu-Start ABSTAND,
// mkdir-Sperre und gemeinsame Stempeldatei, damit Python- und Node-Prozesse EINE Uhr teilen.
import fs from 'node:fs';
const LOCKDIR = '/tmp/cj_takt.lockdir', STEMPEL = '/tmp/cj_takt.stempel';
const ABSTAND = parseFloat(process.env.CJ_TAKT_S || '1.8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function sperren() {
  for (;;) {
    try { fs.mkdirSync(LOCKDIR); return; } catch {}
    try { if (Date.now() - fs.statSync(LOCKDIR).mtimeMs > 5000) { fs.rmdirSync(LOCKDIR); continue; } } catch {}
    await sleep(20);
  }
}
// 24.09.2026 VORRANG (siehe cj_takt.py): solange cj_kosten_backfill arbeitet (frischt /tmp/cj_vorrang je Aufruf auf),
// warten alle ausser Bestell-/Zahlungs-/Versandwaechtern; Datei > 120 s = Leiche; hoechstens VORRANG_MAX_S warten.
const VORRANG_DATEI = '/tmp/cj_vorrang', VORRANG_SKRIPTE = ['cj_kosten_backfill'];
const IMMER_FREI = ['cj_fulfill', 'cj_order', 'cj_zahlung', 'versand_stillstand', 'bestell', 'cj_takt'];
const VORRANG_MAX_S = parseFloat(process.env.VORRANG_MAX_S || '5400');
async function vorrangWarten() {
  const name = (process.argv[1] || '?').split('/').pop();
  if (VORRANG_SKRIPTE.some(v => name.startsWith(v))) { try { fs.writeFileSync(VORRANG_DATEI, name); } catch {} return; }
  if (IMMER_FREI.some(v => name.startsWith(v))) return;
  // Globaler Vorrang (siehe cj_takt.py): Repo-Datei dropship/_cj_vorrang_global mit ISO-Enddatum → gemeinsamer Abstand je
  // Maschine (/tmp/cj_bremse_letzter, GLOBAL_ABSTAND_S = 180 s) für alle nicht dringenden Aufrufe.
  try {
    const gdat = new URL('../dropship/_cj_vorrang_global', import.meta.url);
    const bis = Date.parse(fs.readFileSync(gdat, 'utf8').trim().split(/\s+/)[0]);
    if (bis > Date.now()) {
      const ABSTAND = parseFloat(process.env.GLOBAL_ABSTAND_S || '180') * 1000, UHR = '/tmp/cj_bremse_letzter';
      for (;;) {
        let alter; try { alter = Date.now() - fs.statSync(UHR).mtimeMs; } catch { alter = ABSTAND; }
        if (alter >= ABSTAND) { try { fs.writeFileSync(UHR, name); } catch {} break; }
        await sleep(Math.min(ABSTAND - alter, 30000) + 100);
      }
    }
  } catch {}
  const ende = Date.now() + VORRANG_MAX_S * 1000;
  while (Date.now() < ende) {
    let alter; try { alter = Date.now() - fs.statSync(VORRANG_DATEI).mtimeMs; } catch { return; }
    if (alter > 120000) return;
    await sleep(10000);
  }
}
export async function takt(abstand = ABSTAND) {
  await vorrangWarten();
  await sperren();
  let start;
  try {
    let letzter = 0; try { letzter = parseFloat(fs.readFileSync(STEMPEL, 'utf8').split(/\s+/)[0]) || 0; } catch {}
    start = Math.max(Date.now() / 1000, letzter + abstand);
    fs.writeFileSync(STEMPEL, start.toFixed(3));
  } finally { try { fs.rmdirSync(LOCKDIR); } catch {} }
  // 24.09.2026: Protokoll je Aufruf (Epoche, Skript) — wer verbraucht das CJ-Tagesbudget? Nie den Aufruf stören.
  try {
    const d = new Date(start * 1000).toISOString().slice(0, 10);
    const name = (process.argv[1] || '?').split('/').pop();
    fs.appendFileSync(`/tmp/cj_takt_${d}.log`, `${Math.floor(start)}\t${name}\n`);
  } catch {}
  const warte = start * 1000 - Date.now();
  if (warte > 0) await sleep(warte);
}
export async function frei() { return null; }   // Kompatibilitaet, ohne Wirkung
