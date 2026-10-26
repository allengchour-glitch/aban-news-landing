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
f="$FAKE_CODES"; z=$(head -n1 "$f" 2>/dev/null); sed -i '1d' "$f" 2>/dev/null; echo "$z" >> "$FAKE_LOG"
case "$z" in
  0L) echo "LIMIT 40 erreicht — Rest bleibt für den nächsten Lauf"; echo 'Zusammenfassung: {}'; exit 0;;
  *) echo 'Zusammenfassung: {}'; exit "\${z:-0}";;
esac
`;

function lauf(codes, { liste = 'h1;1;sku1;3;g\nh2;1;sku2;3;g\n', stop = false, stufen = '1' } = {}) {
  const t = mkdtempSync(join(tmpdir(), 'auswahl-test-'));
  try {
    writeFileSync(join(t, 'fake_node.sh'), FAKE); chmodSync(join(t, 'fake_node.sh'), 0o755);
    writeFileSync(join(t, 'codes.txt'), codes.map(c => c + '\n').join(''));
    writeFileSync(join(t, 'auswahl_kandidaten.csv'), liste);
    if (stop) writeFileSync(join(t, 'auswahl_stop'), '');
    const r = spawnSync('bash', [process.env.DRIVER || 'automation/auswahl_durchlauf.sh'], {
      cwd: REPO, encoding: 'utf8', timeout: 60000,
      env: { PATH: process.env.PATH, AUSWAHL_TMP: t, NODE: join(t, 'fake_node.sh'), WORKERS: '1', STUFEN: stufen, BATCH: '40',
        WARTE: '0', WARTE_VAR: '0', WARTE_FEHL: '0', FAKE_CODES: join(t, 'codes.txt'), FAKE_LOG: join(t, 'aufrufe.txt') },
    });
    const aufrufe = existsSync(join(t, 'aufrufe.txt')) ? readFileSync(join(t, 'aufrufe.txt'), 'utf8').split('\n').filter(x => x !== '' || false) : [];
    const log = existsSync(join(t, 'auswahl_durchlauf.log')) ? readFileSync(join(t, 'auswahl_durchlauf.log'), 'utf8') : '';
    return { rc: r.status, aufrufe, anzahl: aufrufe.length, log, out: (r.stdout || '') + (r.stderr || '') };
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

// 8) Fehlende Kandidatenliste: sofort Exitcode 1 mit Hinweis
{
  const t = mkdtempSync(join(tmpdir(), 'auswahl-test-'));
  const x = spawnSync('bash', [process.env.DRIVER || 'automation/auswahl_durchlauf.sh'], { cwd: REPO, encoding: 'utf8', env: { PATH: process.env.PATH, AUSWAHL_TMP: t } });
  ist('keine Liste: Exitcode 1 und Hinweis', [x.status, /Keine Liste/.test(x.stdout)], [1, true]);
  rmSync(t, { recursive: true, force: true });
}

console.log(`${ok} ok, ${fehl} Fehler`); process.exit(fehl ? 1 : 0);
