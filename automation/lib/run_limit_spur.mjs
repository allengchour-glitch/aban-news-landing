// run_limit_spur.mjs — Vorlade-Modul (node --import) für run_limit_test.mjs: schaut einem Poster beim Start zu, ohne dass er etwas darf.
//
// WARUM: «Pause heisst: vor jeder Wirkung beenden» lässt sich an Prüfsummen allein nicht beweisen — ein Poster, der die Queue nur LIEST
// oder einen Lock nimmt und wieder freigibt, hinterlässt keine Spur. Und ein Test, der den echten Poster mit Schlüsseln laufen lässt,
// dürfte im Fehlerfall echt posten. Darum: jeder Zugriff auf Dateien, Prozesse und Netz wird in die Datei $RUN_LIMIT_SPUR geschrieben
// («<Art>\t<Ziel>» je Zeile), und jede SCHREIBENDE oder startende Wirkung wird zusätzlich ABGELEHNT (Ausnahme mit Fehler).
// Lesen geht durch (der Poster läuft ehrlich weiter), Schreiben/Löschen/Umbenennen/Prozessstart/Netz nie.
//   Erfasst: fs.readFileSync · existsSync · statSync · lstatSync · readdirSync · accessSync · openSync (lesend/schreibend) ·
//            writeFileSync · appendFileSync · renameSync · unlinkSync · mkdirSync · copyFileSync · rmSync · utimesSync ·
//            fetch · child_process (execFileSync · execSync · spawnSync · spawn · exec · execFile · fork) · process.exit (Code)
//   Nicht erfasst (Grenze, GEMESSEN am Postercode: keiner nutzt sie): fs.promises, createReadStream/createWriteStream, net/dns direkt.
//   Nicht mitgezählt: das Laden der Module selbst (*.mjs/*.js/*.cjs, node:-intern, /opt/node22) und die Spurdatei.
// Wirkung: nur mit gesetztem RUN_LIMIT_SPUR; ohne die Variable tut dieses Modul NICHTS (kein Versehen im Echtbetrieb).
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';

const SPUR = process.env.RUN_LIMIT_SPUR || '';
if (SPUR) {
  // Originale VOR dem Austausch — die Spur selbst wird nie abgelehnt. (fs.appendFileSync ruft intern das ausgetauschte
  // fs.writeFileSync auf, darum schreibt die Spur über openSync/writeSync/closeSync.)
  const oeffnen = fs.openSync, schreiben = fs.writeSync, schliessen = fs.closeSync;
  const anhaengen = (datei, text) => { const fd = oeffnen(datei, 'a'); try { schreiben(fd, text); } finally { schliessen(fd); } };
  const SPUR_ABS = path.resolve(SPUR);
  const MODUL = /\.(?:mjs|cjs|js)$/;
  const zielText = z => {   // Pfad-Argumente der fs-Funktionen: immer absolut, damit die Prüfung nicht an der Schreibweise hängt
    if (typeof z === 'number') return `fd:${z}`;
    if (z instanceof URL) return z.pathname;
    return path.resolve(String(z));
  };
  const merke = (art, text) => {
    if (text === SPUR_ABS || MODUL.test(text) || text.startsWith('/opt/node22/') || text.includes('/node_modules/')) return;
    try { anhaengen(SPUR, `${art}\t${text}\n`); } catch {}
  };
  const lehne = (art, text) => { merke(`GESPERRT-${art}`, text); throw Object.assign(new Error(`run_limit_spur: ${art} ${text} gesperrt`), { code: 'EACCES', status: 2 }); };
  const schreibend = f => (typeof f === 'number' ? (f & (1 | 2 | 64 | 512 | 1024)) !== 0 : /[wax+]/.test(String(f ?? 'r')));

  for (const art of ['readFileSync', 'existsSync', 'statSync', 'lstatSync', 'readdirSync', 'accessSync']) {
    const orig = fs[art];
    fs[art] = function (p, ...rest) { merke(art, zielText(p)); return orig.call(this, p, ...rest); };
  }
  const origOpen = oeffnen;
  fs.openSync = function (p, flags, ...rest) {
    if (schreibend(flags)) return lehne(`openSync(${flags})`, zielText(p));
    merke('openSync', zielText(p)); return origOpen.call(this, p, flags, ...rest);
  };
  for (const art of ['writeFileSync', 'appendFileSync', 'renameSync', 'unlinkSync', 'mkdirSync', 'copyFileSync', 'rmSync', 'utimesSync']) {
    fs[art] = function (p) { return lehne(art, zielText(p)); };
  }
  // fetch: abgelehnt wie ein totes Netz (die Poster fangen das ab), aber mit Eintrag
  globalThis.fetch = async (u) => { merke('fetch', typeof u === 'string' ? u : String(u?.url ?? u)); throw new TypeError('fetch failed (run_limit_spur: Netz gesperrt)'); };
  for (const art of ['execFileSync', 'execSync', 'spawnSync', 'spawn', 'exec', 'execFile', 'fork']) {
    cp[art] = function (kommando, args) { return lehne(art, [kommando, ...(Array.isArray(args) ? args : [])].join(' ')); };
  }
  globalThis.__runLimitSpur = true;   // Marke für run_limit_spur_probe.mjs: «die Spur ist wirklich geladen»
  syncBuiltinESMExports();   // damit auch «import { spawnSync } from 'node:child_process'» die Austauschfassung sieht
  process.on('exit', code => { try { anhaengen(SPUR, `exit\t${code}\n`); } catch {} });
}
