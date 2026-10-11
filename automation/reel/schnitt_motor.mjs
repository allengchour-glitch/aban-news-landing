/* schnitt_motor.mjs — CJ-Reels über automation/reel/schnitt.py (eingeführt 11.10.2026).
 *
 * WARUM (gemessen 11.10. an Queue-Reels, Kontaktbogen): make_reel.sh spielt EINE Einstellung ohne Schnitt und
 * schneidet Fremdmaterial nicht heraus — im Lidschatten-Reel stand bei 7,0 s die Marke «MISS RÔSE®» im Bild.
 * schnitt.py hat dafür Tore: OCR (eng + chi_sim), Fremdpreis-Regel, Kanten-Heuristik, Schnitt auf den Kick,
 * Kamerafahrt-Regel, Ausgabetor (Format, LUFS, True Peak, Zone). Exit ≠ 0 heisst: NICHT in die Queue.
 *
 * Stimme (A/B): schnitt.py rendert ohne Sprache. Ist die Stimme gewollt (stimme.ja), legt --stimme-legen sie danach
 * über das fertige Reel (Bild unberührt). Scheitert das Mischen, bleibt das Reel OHNE Stimme (st.grund = mix-fehler).
 *
 * Exit-Codes von schnitt.py: 0 ok · 3 Quelle ungeeignet (dauerhaft → Ledger) · 4 Ausgabetor (dauerhaft → Ledger)
 *                            · 1 Fehler (z. B. OCR-Ausfall, Musik) — vorübergehend, NICHT ins Ledger.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const PY = 'automation/reel/schnitt.py';
const TESSDATA = '/tmp/schnitt_tessdata';
const ARBEIT = '/tmp/reelbuild/schnitt';

function lauf(args, timeout) {
  const env = { ...process.env, SCHNITT_TESSDATA: process.env.SCHNITT_TESSDATA || TESSDATA, OMP_THREAD_LIMIT: '1' };
  const r = spawnSync('python3', [PY, ...args], { encoding: 'utf8', timeout, env, maxBuffer: 32 * 1024 * 1024 });
  const zeilen = `${r.stdout || ''}\n${r.stderr || ''}`.split('\n').map(z => z.trim()).filter(Boolean);
  const treffer = zeilen.filter(z => /^(UNGEEIGNET|PRUEFUNG|FEHLER|Fehler|Error|ValueError|RuntimeError|MusikFehler)/.test(z));
  const grund = (treffer.slice(-2).join(' · ') || zeilen.slice(-1)[0] || (r.error ? String(r.error.message) : `Exit ${r.status}`));
  return { status: r.status ?? 1, grund: grund.slice(0, 240) };
}

/* reelBauen({src, out, musik, einstieg, titel, titel2, preis, hook, stimme})
 *   musik    = Dateiname in automation/music (mit CREDITS-Zeile), einstieg = Sekunde der Musik
 *   hook     = höchstens 30 Zeichen (schnitt.py: Bild 0 = LUXESTYLE + Hook ≤ 40)
 *   stimme   = {ja, datei, stimme, text} aus stimmeBauen() oder {ja:false, grund}
 * Rückgabe: {ok:true, st} oder {ok:false, code, grund}. st ist der tatsächliche Stimmen-Zustand (Verlauf). */
export function reelBauen({ src, out, musik, einstieg, titel, titel2, preis, hook, stimme }) {
  fs.mkdirSync(ARBEIT, { recursive: true });
  // /tmp überlebt Container-Neustarts nicht immer: fehlt die chinesische OCR-Datei, holt das Werkzeug sie (einmal je Lauf);
  // ohne sie scheitert jede Quelle mit Exit 1 und die Queue bliebe leer.
  if (!fs.existsSync(`${TESSDATA}/chi_sim.traineddata`)) lauf(['--tessdata-holen', TESSDATA], 300000);
  const roh = `${out}.roh.mp4`;
  fs.rmSync(roh, { force: true });
  const args = ['--render', src, '--musik', musik, '--einstieg', String(einstieg), '--out', roh,
    '--titel', titel, '--preis', preis, '--hook', hook, '--arbeitsordner', ARBEIT, '--json'];
  if (titel2) args.push('--titel2', titel2);
  const r = lauf(args, 900000);
  if (r.status !== 0 || !fs.existsSync(roh) || fs.statSync(roh).size < 100000) {
    fs.rmSync(roh, { force: true });
    return { ok: false, code: r.status || 1, grund: r.grund || 'kein Ergebnis' };
  }
  let st = stimme && stimme.ja ? stimme : { ja: false, grund: stimme?.grund || 'anteil' };
  if (st.ja && st.datei) {
    const m = lauf(['--stimme-legen', roh, '--stimme', st.datei, '--out', out, '--arbeitsordner', ARBEIT, '--json'], 600000);
    if (m.status === 0 && fs.existsSync(out)) { fs.rmSync(roh, { force: true }); return { ok: true, st }; }
    fs.rmSync(out, { force: true });
    console.log(`   Stimme nicht gemischt (${m.grund}) → Reel ohne Stimme`);
    st = { ja: false, grund: 'mix-fehler' };
  }
  fs.renameSync(roh, out);
  return { ok: true, st };
}
