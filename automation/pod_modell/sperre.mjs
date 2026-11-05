/**
 * Sperrdatei gegen zwei gleichzeitige Läufe mit demselben Ledger (Fund beider Gegenleser 05.11.2026: zwei Läufe legten in der Attrappe einmal OK, einmal FEHLER ab; wie sich der echte Shop bei einem doppelten
 * Handle verhält, ist ungemessen). `<Ledger>.lock` wird mit dem Schalter «wx» angelegt (schlägt fehl, wenn es sie gibt) und enthält PID und Zeit. Eine Sperre gilt als veraltet, wenn sie älter als
 * `maxAlterH` Stunden ist oder ihr Prozess nicht mehr lebt; dann wird sie übernommen (einmal, ohne Schleife). Kein Netz, nur Dateien.
 */
import { openSync, closeSync, writeSync, readFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const SPERRE_MAX_ALTER_H = 6;
const lebtStandard = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

/**
 * @returns {{ok:true, pfad:string, uebernommen:string|null, freigeben:()=>void} | {ok:false, grund:string}}
 */
export function sperreNehmen(ledgerPfad, { jetzt = () => Date.now(), pid = process.pid, lebt = lebtStandard, maxAlterH = SPERRE_MAX_ALTER_H } = {}) {
  if (!ledgerPfad) return { ok: false, grund: 'ohne Ledger gibt es keine Sperre' };
  const pfad = `${ledgerPfad}.lock`;
  mkdirSync(dirname(pfad), { recursive: true });
  const schreibe = () => { const fd = openSync(pfad, 'wx'); try { writeSync(fd, JSON.stringify({ pid, zeit: new Date(jetzt()).toISOString() })); } finally { closeSync(fd); } };
  const freigeben = () => { try { const x = JSON.parse(readFileSync(pfad, 'utf8')); if (x.pid === pid) unlinkSync(pfad); } catch { /* weg oder fremd: nichts tun */ } };
  let uebernommen = null;
  for (let versuch = 0; versuch < 2; versuch++) {
    try { schreibe(); return { ok: true, pfad, uebernommen, freigeben }; } catch (e) { if (e.code !== 'EEXIST') throw e; }
    let x = null;
    try { x = JSON.parse(readFileSync(pfad, 'utf8')); } catch { /* unlesbar = veraltet */ }
    const alterH = x && Date.parse(x.zeit) ? (jetzt() - Date.parse(x.zeit)) / 3.6e6 : Infinity;
    const lebendig = x && Number.isInteger(x.pid) && x.pid !== pid && lebt(x.pid);
    if (lebendig && alterH <= maxAlterH) return { ok: false, grund: `ein anderer Lauf hält die Sperre ${pfad} (PID ${x.pid}, seit ${alterH.toFixed(1)} h). Läuft er nicht mehr, die Datei von Hand löschen.` };
    if (versuch === 1) break;
    uebernommen = x ? `veraltete Sperre übernommen (PID ${x.pid}, ${Number.isFinite(alterH) ? alterH.toFixed(1) + ' h alt' : 'Zeit unlesbar'}${lebendig ? '' : ', Prozess läuft nicht mehr'})` : 'unlesbare Sperre übernommen';
    try { unlinkSync(pfad); } catch { /* ein anderer Lauf war schneller: der zweite Versuch scheitert dann mit EEXIST */ }
  }
  return { ok: false, grund: `die Sperre ${pfad} wurde gleichzeitig von einem anderen Lauf genommen` };
}
