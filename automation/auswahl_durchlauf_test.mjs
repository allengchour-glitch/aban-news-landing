// Treiber automation/auswahl_durchlauf.sh mit einem falschen «node»: prüft, wie er auf die Exitcodes des Werkzeugs reagiert.
// Anlass (26.10.2026, Prüfung des Nacht-Workflows): ein Absturz (rc=1) galt als «Scheibe durch», der Treiber endete mit «FERTIG» und Exitcode 0 —
// der Lauf blieb grün, obwohl nichts geschrieben wurde. Kein Netz, kein Shop, nichts ausserhalb des Wegwerf-Ordners.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const REPO = resolve(new URL('..', import.meta.url).pathname);

const FAKE = `#!/bin/bash
if grep -q poison "$HANDLES_DATEI"; then echo poison >> "$FAKE_LOG"; echo 'Zusammenfassung: {}'; exit 3; fi
echo "FORCE=\${FORCE:-leer}" >> "$FAKE_FORCE"
f="$FAKE_CODES"; z=$(head -n1 "$f" 2>/dev/null); sed -i '1d' "$f" 2>/dev/null; echo "$z" >> "$FAKE_LOG"
[ -n "$FAKE_SCHREIBT" ] && echo "x · 2026-10-26T00:00:00Z · GESCHRIEBEN · 1 Varianten" >> "$LEDGER"
case "$z" in
  0L) echo "LIMIT 40 erreicht — Rest bleibt für den nächsten Lauf"; echo 'Zusammenfassung: {}'; exit 0;;
  *) echo 'Zusammenfassung: {}'; exit "\${z:-0}";;
esac
`;

function lauf(codes, { liste = 'h1;1;sku1;3;g\nh2;1;sku2;3;g\n', stop = false, stufen = '1', workers = '1', extra = {} } = {}) {
  const t = mkdtempSync(join(tmpdir(), 'auswahl-test-'));
  try {
    writeFileSync(join(t, 'fake_node.sh'), FAKE); chmodSync(join(t, 'fake_node.sh'), 0o755);
    writeFileSync(join(t, 'codes.txt'), codes.map(c => c + '\n').join(''));
    writeFileSync(join(t, 'auswahl_kandidaten.csv'), liste);
    if (stop) writeFileSync(join(t, 'auswahl_stop'), '');
    const r = spawnSync('bash', [process.env.DRIVER || 'automation/auswahl_durchlauf.sh'], {
      cwd: REPO, encoding: 'utf8', timeout: 60000,
      env: { PATH: process.env.PATH, AUSWAHL_TMP: t, NODE: join(t, 'fake_node.sh'), WORKERS: workers, STUFEN: stufen, BATCH: '40',
        WARTE: '0', WARTE_VAR: '0', WARTE_FEHL: '0', LEDGER: join(t, 'ledger.txt'), FAKE_CODES: join(t, 'codes.txt'), FAKE_LOG: join(t, 'aufrufe.txt'), FAKE_FORCE: join(t, 'force.txt'), ...extra },
    });
    const aufrufe = existsSync(join(t, 'aufrufe.txt')) ? readFileSync(join(t, 'aufrufe.txt'), 'utf8').split('\n').filter(x => x !== '' || false) : [];
    const log = existsSync(join(t, 'auswahl_durchlauf.log')) ? readFileSync(join(t, 'auswahl_durchlauf.log'), 'utf8') : '';
    const force = existsSync(join(t, 'force.txt')) ? readFileSync(join(t, 'force.txt'), 'utf8').split('\n').filter(Boolean) : [];
    return { rc: r.status, aufrufe, anzahl: aufrufe.length, log, force, out: (r.stdout || '') + (r.stderr || '') };
  } finally { rmSync(t, { recursive: true, force: true }); }
}

// 1) Absturz bei jedem Versuch: dreimal wiederholt, dann laut (Exitcode 2), NICHT «FERTIG»
let r = lauf(['1', '1', '1', '1', '1']);
ist('Dauer-Absturz: Exitcode 2', r.rc, 2);
ist('Dauer-Absturz: genau 3 Versuche je Scheibe', r.anzahl, 3);
ist('Dauer-Absturz: Protokoll nennt den Absturz', /ABSTURZ rc=1 \(Versuch 3\/3\)/.test(r.log), true);
ist('Dauer-Absturz: Schluss «FERTIG MIT FEHLERN», nicht «FERTIG»', [/FERTIG MIT FEHLERN/.test(r.log), /FERTIG\s*$/m.test(r.log)], [true, false]);
ist('Dauer-Absturz: die Scheibe wird genannt', /Stufe 1 Scheibe 0: rc=1/.test(r.log), true);

// 2) Ein Absturz, dann Erfolg: die Wiederholung hilft, Exitcode 0
r = lauf(['1', '0']);
ist('Absturz dann Erfolg: Exitcode 0', r.rc, 0);
ist('Absturz dann Erfolg: 2 Aufrufe', r.anzahl, 2);
ist('Absturz dann Erfolg: FERTIG ohne Fehlerzusatz', [/FERTIG\s*$/m.test(r.log), /MIT FEHLERN/.test(r.log)], [true, false]);

// 3) Normal: Scheibe durch (rc 0 ohne «LIMIT erreicht») → FERTIG, ein Aufruf
r = lauf(['0']);
ist('Scheibe durch: Exitcode 0', r.rc, 0);
ist('Scheibe durch: 1 Aufruf', r.anzahl, 1);

// 4) Stapel voll («LIMIT erreicht») → nächster Stapel
r = lauf(['0L', '0L', '0']);
ist('Stapel voll: 3 Aufrufe bis zum Ende', r.anzahl, 3);
ist('Stapel voll: Exitcode 0', r.rc, 0);

// 5) Shopify-Tagesgrenze (rc 4) und CJ-Drosselung (rc 3) warten und machen weiter — das sind keine Abstürze
r = lauf(['4', '0']);
ist('Tagesgrenze: danach weiter, Exitcode 0', [r.rc, r.anzahl], [0, 2]);
ist('Tagesgrenze: Protokoll', /Shopify-Tagesgrenze/.test(r.log), true);
r = lauf(['3', '0']);
ist('CJ-Drosselung: danach weiter, Exitcode 0', [r.rc, r.anzahl], [0, 2]);
ist('CJ-Drosselung: zählt nicht als Absturz', /ABSTURZ/.test(r.log), false);
r = lauf(['4', '4', '4', '4', '0']);
ist('Tagesgrenze beliebig oft: nie «Absturz» (kein Versuchszähler)', [r.rc, /ABSTURZ/.test(r.log)], [0, false]);

// 6) Leere Scheibe (Stufe ohne Kandidaten): kein Werkzeugaufruf, kein Fehler
r = lauf(['1'], { liste: 'h1;2;sku1;3;g\n' });
ist('leere Scheibe: Werkzeug nie gerufen', r.anzahl, 0);
ist('leere Scheibe: Exitcode 0 und FERTIG', [r.rc, /FERTIG\s*$/m.test(r.log)], [0, true]);

// 7) Stopp-Datei: nichts wird gestartet
r = lauf(['0'], { stop: true });
ist('Stopp-Datei: kein Aufruf, Exitcode 0', [r.anzahl, r.rc], [0, 0]);
ist('Stopp-Datei: Protokoll', /Stopp-Datei gefunden/.test(r.log), true);

// 9) Der Absturzzähler zählt «in Folge»: ein Erfolg dazwischen setzt ihn zurück (Absturz, Stapel voll, Absturz, Stapel voll, Absturz → weiter, nicht aufgeben)
r = lauf(['1', '0L', '1', '0L', '1', '0']);
ist('Zähler wird nach Erfolg zurückgesetzt: Exitcode 0, 6 Aufrufe', [r.rc, r.anzahl], [0, 6]);

// 10) CJ-Drosselung (rc 3) und KI-Ausfall (rc 5): warten, aber nicht ewig — ohne neue Ledger-Zeile gibt die Scheibe auf (Fehlermarke, Exitcode 2)
r = lauf(['3', '3', '3', '3', '3', '3'], { extra: { MAX_STILL: '4' } });
ist('rc=3 ohne Fortschritt: nach 4 Mal Schluss, Exitcode 2', [r.rc, r.anzahl], [2, 4]);
ist('rc=3 ohne Fortschritt: Protokoll «gibt auf» und FERTIG MIT FEHLERN', [/gibt auf: 4 Mal rc=3/.test(r.log), /FERTIG MIT FEHLERN/.test(r.log)], [true, true]);
r = lauf(['5', '5', '5', '5', '5'], { extra: { MAX_STILL: '3' } });
ist('rc=5 (KI-Ausfall) ohne Fortschritt: nach 3 Mal Schluss, Exitcode 2', [r.rc, r.anzahl, /KI-Dienst fällt aus/.test(r.log)], [2, 3, true]);
r = lauf(['5', '0']);
ist('rc=5 einmal, dann Erfolg: weiter, Exitcode 0', [r.rc, r.anzahl], [0, 2]);
r = lauf(['3', '3', '3', '3', '3', '3', '0'], { extra: { MAX_STILL: '3', FAKE_SCHREIBT: '1' } });
ist('rc=3 MIT Fortschritt (Ledger wächst): nie aufgeben, Exitcode 0', [r.rc, r.anzahl, /gibt auf/.test(r.log)], [0, 7, false]);

// 11) FORCE wird nicht an das Werkzeug durchgereicht (sonst Endlosschleife über volle Stapel)
r = lauf(['0'], { extra: { FORCE: '1' } });
ist('FORCE=1 im Treiber-Aufruf erreicht das Werkzeug nicht', r.force, ['FORCE=leer']);

// 12) Mehrere Scheiben und Stufen: eine festhängende Scheibe blockiert die nächste Stufe nicht für immer
r = lauf([], { workers: '2', stufen: '1 2', extra: { MAX_STILL: '3' }, liste: 'poison1;1;s;3;g\nok1;1;s;3;g\nok2;2;s;3;g\nok3;2;s;3;g\n' });
ist('festhängende Scheibe: Stufe 2 läuft trotzdem, Exitcode 2', [r.rc, /Stufe 2: 2 Kandidaten/.test(r.log), r.aufrufe.filter(x => x === 'poison').length], [2, true, 3]);
ist('festhängende Scheibe: genannt in der Fehlermarke', /Stufe 1 Scheibe 0: rc=3 ohne Fortschritt/.test(r.log), true);
r = lauf(['0', '0', '0', '0'], { workers: '2', stufen: '1 2', liste: 'a1;1;s;3;g\na2;1;s;3;g\nb1;2;s;3;g\nb2;2;s;3;g\n' });
ist('zwei Scheiben × zwei Stufen, alles gut: 4 Aufrufe, Exitcode 0', [r.rc, r.anzahl], [0, 4]);

// 8) Fehlende Kandidatenliste: sofort Exitcode 1 mit Hinweis
{
  const t = mkdtempSync(join(tmpdir(), 'auswahl-test-'));
  const x = spawnSync('bash', [process.env.DRIVER || 'automation/auswahl_durchlauf.sh'], { cwd: REPO, encoding: 'utf8', env: { PATH: process.env.PATH, AUSWAHL_TMP: t } });
  ist('keine Liste: Exitcode 1 und Hinweis', [x.status, /Keine Liste/.test(x.stdout)], [1, true]);
  rmSync(t, { recursive: true, force: true });
}

console.log(`${ok} ok, ${fehl} Fehler`); process.exit(fehl ? 1 : 0);
