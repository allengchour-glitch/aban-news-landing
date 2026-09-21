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
export async function takt(abstand = ABSTAND) {
  await sperren();
  let start;
  try {
    let letzter = 0; try { letzter = parseFloat(fs.readFileSync(STEMPEL, 'utf8').split(/\s+/)[0]) || 0; } catch {}
    start = Math.max(Date.now() / 1000, letzter + abstand);
    fs.writeFileSync(STEMPEL, start.toFixed(3));
  } finally { try { fs.rmdirSync(LOCKDIR); } catch {} }
  const warte = start * 1000 - Date.now();
  if (warte > 0) await sleep(warte);
}
export async function frei() { return null; }   // Kompatibilitaet, ohne Wirkung
