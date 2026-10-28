#!/usr/bin/env node
/**
 * Zweitmeinung von Codex (GPT-6.1 Sol über den ChatGPT-Login des Besitzers; NICHT Astra: Besitzer-Vorgabe 28.10.2026, wegen des Token-Kontingents) als Gegenleser aus anderer Modellfamilie.
 *
 * Trockenlauf ist die Vorgabe: zeigt Dateiliste, Grössen, Suchergebnis, Aufruf und Anweisung, startet Codex nicht.
 * Mit LIVE=1 läuft Codex: in einem NEUEN leeren Ordner (nur die genannten Dateien), mit leerer Umgebung
 * (genau PATH, HOME, CODEX_HOME), ohne Shell, schreibgeschützt (-s read-only). Repo, Schlüssel und Umgebungsvariablen
 * kommen nie hinein. Vorher sucht das Werkzeug in allem, was gesendet würde, nach Geheimnissen und Personendaten.
 *
 *   node automation/codex_zweitmeinung.mjs automation/lib/preis.mjs automation/preis_lauf.mjs
 *   DATEIEN=a.mjs,b.mjs node automation/codex_zweitmeinung.mjs
 *
 * Relative Namen gelten ab dem Arbeitsordner, wenn der im Repo liegt (aus dropship/ meint README.md die Datei dropship/README.md),
 * sonst ab der Repo-Wurzel. Ausserhalb des Repos liegende Dateien, «..» und Zugangsdateien werden abgelehnt.
 *   LIVE=1 CODEX_BIN=/pfad/zu/codex CODEX_HOME_ZWEITMEINUNG=/pfad/zum/login-ordner node automation/codex_zweitmeinung.mjs <Dateien>
 *
 * Einstellungen (Umgebung):
 *   DATEIEN                          Dateien, kommagetrennt (wenn keine Argumente)
 *   LIVE=1                           Codex wirklich starten (alles andere = Trockenlauf)
 *   CODEX_BIN                        Pfad zum codex-Programm (Pflicht bei LIVE, kein Standardwert)
 *   CODEX_HOME_ZWEITMEINUNG          Ordner mit dem Codex-Login (Pflicht bei LIVE, kein Standardwert)
 *   ZWEITMEINUNG_MODELL              Vorgabe gpt-6.1-sol
 *   ZWEITMEINUNG_AUFWAND             Vorgabe medium
 *   ZWEITMEINUNG_ZEITLIMIT_MINUTEN   Vorgabe 20
 *   ZWEITMEINUNG_AUSGABE_ORDNER      Vorgabe: Temp-Ordner des Systems; nie im Repo
 *   ZWEITMEINUNG_AUFTRAG / --auftrag Text für Codex (Vorgabe: Zweitmeinung, Geldwirkung zuerst)
 *
 * Exit: 0 Trockenlauf oder vollständige, sicher gelesene Antwort · 1 unerwarteter Fehler · 2 Eingabe oder Einstellung (auch ein
 *       Ordner, in den man nicht schreiben kann: das steht VOR dem Start fest) · 3 Geheimnis oder Personendaten gefunden
 *       (nichts gesendet) · 4 Nutzungslimit erreicht · 5 Lauf ohne vollständige Antwort (Anmeldung, Netz, Zeitlimit, ENDE fehlt,
 *       keine lesbare Liste, «[]» nur mitten im Text) · 6 Antwort gelesen, aber unsicher (mehrere Listen, «[]» hinter der Liste,
 *       im Rohtext mehr «titel»-Felder als gelesen): Bericht und Funde-Datei (status «pruefen») liegen vor, es können Funde fehlen.
 * Nur Exit 0 mit LIVE=1 ist ein sicheres Ergebnis. Exit 4, 5 und 6 sind NIE «keine Funde».
 * Die Antwort von Codex wird wie seine Fehlerausgabe von Geheimnissen und Personendaten befreit ([verdeckt]) und von Steuerzeichen.
 * Signale: SIGINT, SIGTERM, SIGHUP und SIGQUIT beenden Codex samt Prozessgruppe, räumen auf und enden mit Exit 5.
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  Abbruch, GRENZEN, HINWEIS, baueAnweisung, baueArgv, baueBericht, baueUmgebung, klassifiziere, leseDateiliste,
  leseFunde, liesArgumente, liesKonfiguration, meldungGeheimnisse, pruefeDateien, pruefeOrdnerAusserhalb, pruefeSchreibbar, pruefeStart,
  rein, schreibeSandkasten, sucheAlles, verdeckeFunde, verdecke,
} from './lib/codex_zweitmeinung.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HIER, '..');
const RUBRIK_PFAD = path.join(REPO, 'codex-mods', 'luxe-codex', 'skills', 'zweitmeinung', 'RUBRIK.md');
const HILFE = 'Aufruf: node automation/codex_zweitmeinung.mjs [--auftrag "Text"] <Datei> [<Datei> …]   (oder DATEIEN=a,b)\nTrockenlauf ist die Vorgabe; LIVE=1 startet Codex. Einstellungen und Exit-Codes stehen im Kopf der Datei.';

/**
 * Startet das Programm ohne Shell, schreibt `stdin`, sammelt stdout/stderr (mit Obergrenze) und beendet es
 * bei Zeitlimit, Überlauf oder Abbruch samt seiner Prozessgruppe (SIGTERM, nach 2 s SIGKILL). Wirft nie; Fehler stehen im Ergebnis.
 *
 * Das Ende wird am `exit` des Programms festgemacht, nicht erst am `close` (alle Pipes zu): hält ein Nachfahre die Pipes offen,
 * wartet der Lauf nur `nachfristMs`, beendet dann die Gruppe, schliesst die Pipes und kehrt zurück. Auch nach SIGKILL gibt es
 * nach 3 s ein Ende, falls ein Nachfahre ausserhalb der Gruppe (eigene Sitzung) die Pipes hält.
 */
export function fuehreAus({ bin, argv, env, cwd, stdin, zeitlimitMs, maxBytes = 8 * 1024 * 1024, signal, nachfristMs = 1000 }) {
  return new Promise(fertig => {
    const erg = { code: null, signal: null, stdout: '', stderr: '', zeitueberschreitung: false, startfehler: '', ueberlauf: false, abgebrochen: false };
    const teile = { out: [], err: [] };
    let bytes = 0;
    let kind;
    let beendet = false;
    let gestoppt = false;
    let zeitTimer;
    let hartTimer;
    let letzteFrist;
    let nachfristTimer;
    const beiAbbruch = () => { erg.abgebrochen = true; stoppen(); };
    const abschluss = () => {
      if (beendet) return;
      beendet = true;
      for (const t of [zeitTimer, hartTimer, letzteFrist, nachfristTimer]) clearTimeout(t);
      signal?.removeEventListener('abort', beiAbbruch);
      for (const s of [kind?.stdout, kind?.stderr, kind?.stdin]) { try { s?.destroy(); } catch { /* schon zu */ } }
      erg.stdout = Buffer.concat(teile.out).toString('utf8');
      erg.stderr = Buffer.concat(teile.err).toString('utf8');
      fertig(erg);
    };
    const toeten = sig => {
      try { process.kill(-kind.pid, sig); } catch { try { kind.kill(sig); } catch { /* schon weg */ } }
    };
    function stoppen() {
      if (gestoppt) return;
      gestoppt = true;
      toeten('SIGTERM');
      hartTimer = setTimeout(() => {
        toeten('SIGKILL');
        letzteFrist = setTimeout(abschluss, 3000);
      }, 2000);
    }
    try {
      kind = spawn(bin, argv, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], shell: false, detached: true, windowsHide: true });
    } catch (e) {
      erg.startfehler = e.code ?? e.message;
      return abschluss();
    }
    const sammle = ziel => c => {
      bytes += c.length;
      if (bytes > maxBytes) { if (!erg.ueberlauf) { erg.ueberlauf = true; stoppen(); } return; }
      ziel.push(c);
    };
    kind.stdout.on('data', sammle(teile.out));
    kind.stderr.on('data', sammle(teile.err));
    kind.stdin.on('error', () => { /* Codex las nicht bis zum Ende: kein Fehler des Werkzeugs */ });
    kind.on('error', e => { erg.startfehler = e.code ?? e.message; abschluss(); });
    kind.on('exit', (code, sig) => {
      erg.code = code;
      erg.signal = sig;
      nachfristTimer = setTimeout(() => { toeten('SIGKILL'); abschluss(); }, nachfristMs);
    });
    kind.on('close', (code, sig) => { erg.code = code; erg.signal = sig; abschluss(); });
    zeitTimer = setTimeout(() => { erg.zeitueberschreitung = true; stoppen(); }, zeitlimitMs);
    if (signal?.aborted) beiAbbruch(); else signal?.addEventListener('abort', beiAbbruch, { once: true });
    kind.stdin.end(stdin);
    return undefined;
  });
}

const kb = n => `${(n / 1024).toFixed(1)} KB`;

/**
 * Schreibt eine neue Datei (Rechte 0600) vollständig: writeSync kann weniger Bytes schreiben als verlangt (Dateigrössen-Limit,
 * fast voller Datenträger); der Rest wird nachgeschrieben, und kommt nichts mehr hinaus, ist es ein Fehler. Eine halbe Datei bleibt nie liegen.
 */
export function schreibeDatei(ordner, name, inhalt, fsx = fs) {
  const pfad = path.join(ordner, name);
  const daten = Buffer.from(String(inhalt), 'utf8');
  const fd = fsx.openSync(pfad, 'wx', 0o600);
  let gut = false;
  try {
    let stand = 0;
    while (stand < daten.length) {
      const n = fsx.writeSync(fd, daten, stand, daten.length - stand);
      if (!(n > 0)) throw new Error(`nur ${stand} von ${daten.length} Bytes geschrieben`);
      stand += n;
    }
    fsx.fchmodSync(fd, 0o600);
    gut = true;
  } finally {
    fsx.closeSync(fd);
    if (!gut) { try { fsx.unlinkSync(pfad); } catch { /* egal */ } }
  }
  return pfad;
}

function trockenlauf({ cfg, wurzel, dateien, gesamt, suchzeilen, anweisung, rubrikZeilen, gruende, ausgabeOrdner, io }) {
  const z = [
    'Zweitmeinung: TROCKENLAUF (Codex wird nicht gestartet; mit LIVE=1 ausführen)',
    `Repo-Wurzel: ${wurzel}`,
    `Dateien: ${dateien.length} (höchstens ${GRENZEN.dateien}), zusammen ${kb(gesamt)} (höchstens ${GRENZEN.bytes / 1024} KB)`,
    ...dateien.map(d => `  ${d.rel}  ${d.bytes} Bytes  ${d.zeilen} Zeilen`),
    `Vorab-Suche nach Geheimnissen und Personendaten: sauber (${dateien.length} Datei(en), ${suchzeilen} Zeilen, dazu Auftrag und Rubrik)`,
    `Aufruf (ohne Shell): ${cfg.bin || '<CODEX_BIN>'} ${baueArgv({ modell: cfg.modell, aufwand: cfg.aufwand, sandkasten: '/<neuer-leerer-Sandkasten>' }).join(' ')}`,
    'Umgebung des Kindes: genau PATH, HOME (leerer Temp-Ordner), CODEX_HOME (aus CODEX_HOME_ZWEITMEINUNG); sonst nichts',
    `Zeitlimit: ${cfg.minuten} Minuten · Ausgabe in ${ausgabeOrdner} (Rechte 0600, nie im Repo)`,
    `Anweisung auf stdin: ${anweisung.length} Zeichen (RUBRIK.md mit ${rubrikZeilen} Zeilen, dann Auftrag und Dateiliste); die Dateiinhalte liegen nur im Sandkasten:`,
    ...anweisung.split('\n').slice(rubrikZeilen).map(l => `  | ${l}`),
    gruende.length ? `Bereit für LIVE=1: NEIN (${gruende.join('; ')})` : 'Bereit für LIVE=1: ja (Programm, Login-Ordner, Temp- und Ausgabeordner geprüft; dafür legt der Trockenlauf kurz Probedateien an und löscht sie)',
  ];
  io.aus(z.join('\n'));
  return 0;
}

async function lauf(args, env, opt, io) {
  const wurzel = opt.wurzel ?? REPO;
  const temp = opt.temp ?? os.tmpdir();
  const arbeitsordner = opt.cwd ?? process.cwd();
  const a = liesArgumente(args);
  if (a.hilfe) { io.aus(HILFE); return 0; }
  if (a.fehler.length) throw new Abbruch(2, `${a.fehler.join('; ')}\n${HILFE}`);
  const cfg = liesKonfiguration(env, { auftrag: a.auftrag });
  const namen = leseDateiliste(a.dateien, env);
  const geprueft = pruefeDateien(namen, wurzel, undefined, arbeitsordner);
  if (!geprueft.ok) throw new Abbruch(2, `Eingabe abgelehnt, nichts wurde gesendet:\n${geprueft.fehler.map(f => `  - ${f}`).join('\n')}`);
  let rubrik;
  try { rubrik = fs.readFileSync(opt.rubrikPfad ?? RUBRIK_PFAD, 'utf8'); } catch { throw new Abbruch(2, 'RUBRIK.md fehlt (codex-mods/luxe-codex/skills/zweitmeinung/RUBRIK.md)'); }
  const funde = sucheAlles({ dateien: geprueft.dateien, auftrag: cfg.auftrag, rubrik });
  if (funde.length) throw new Abbruch(3, meldungGeheimnisse(funde));
  const tempEcht = pruefeOrdnerAusserhalb(temp, wurzel, 'der Temp-Ordner');
  const ausgabeOrdner = cfg.ausgabeOrdner ? pruefeOrdnerAusserhalb(cfg.ausgabeOrdner, wurzel, 'ZWEITMEINUNG_AUSGABE_ORDNER') : tempEcht;
  const anweisung = baueAnweisung({ rubrik, auftrag: cfg.auftrag, dateien: geprueft.dateien });
  // Alles, was LIVE=1 verhindert, steht VOR dem Start fest: auch ein Ordner, in den man nicht schreiben kann (sonst ginge die Antwort verloren).
  const gruende = [
    ...pruefeStart({ bin: cfg.bin, codexHome: cfg.codexHome, pfad: env.PATH ?? '' }),
    pruefeSchreibbar(tempEcht, 'der Temp-Ordner'),
    ausgabeOrdner === tempEcht ? null : pruefeSchreibbar(ausgabeOrdner, 'der Ausgabeordner'),
  ].filter(Boolean);

  if (!cfg.live) {
    const zeilen = geprueft.dateien.reduce((s, d) => s + d.zeilen, 0);
    return trockenlauf({ cfg, wurzel, dateien: geprueft.dateien, gesamt: geprueft.gesamt, suchzeilen: zeilen, anweisung, rubrikZeilen: rubrik.trim().split('\n').length, gruende, ausgabeOrdner, io });
  }
  if (gruende.length) throw new Abbruch(2, `LIVE=1 ist nicht möglich:\n${gruende.map(g => `  - ${g}`).join('\n')}`);

  let sandkasten;
  let home;
  let ergebnis;
  try {
    sandkasten = fs.mkdtempSync(path.join(tempEcht, 'zweitmeinung-sandkasten-'));
    fs.chmodSync(sandkasten, 0o700);
    home = fs.mkdtempSync(path.join(tempEcht, 'zweitmeinung-home-'));
    fs.chmodSync(home, 0o700);
    schreibeSandkasten(sandkasten, geprueft.dateien);
    ergebnis = await fuehreAus({
      bin: cfg.bin,
      argv: baueArgv({ modell: cfg.modell, aufwand: cfg.aufwand, sandkasten }),
      env: baueUmgebung({ pfad: env.PATH, home, codexHome: cfg.codexHome }),
      cwd: sandkasten,
      stdin: anweisung,
      zeitlimitMs: cfg.zeitlimitMs,
      signal: opt.signal,
    });
  } finally {
    for (const d of [sandkasten, home]) {
      if (!d) continue;
      try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { io.fehler(`Aufräumen fehlgeschlagen, bitte von Hand löschen: ${d} (${e.code ?? 'Fehler'})`); }
    }
  }

  // Erst einordnen, dann speichern: ein Schreibfehler darf aus Limit (4) oder Absturz (5) nie einen Exit 1 machen
  // und die Antwort nicht verschlucken. Geheimnisse und Personendaten werden überall verdeckt, auch in der Antwort.
  const urteil = klassifiziere(ergebnis);
  const stempel = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const name = `zweitmeinung-${stempel}-${crypto.randomBytes(4).toString('hex')}`;
  const speichere = (endung, inhalt) => {
    try { return { pfad: schreibeDatei(ausgabeOrdner, `${name}${endung}`, inhalt) }; } catch (e) { return { fehler: e.code ?? (e instanceof Error ? e.message : 'Fehler') }; }
  };
  const antwortText = verdecke(ergebnis.stdout);
  const antwort = speichere('.txt', antwortText);
  if (ergebnis.stderr.trim()) speichere('.stderr.txt', `${verdecke(ergebnis.stderr).slice(0, 64 * 1024)}\n`);
  const ersatz = () => (antwort.fehler
    ? `Die Antwort wurde nicht gespeichert (${rein(String(antwort.fehler), { einzeilig: true }).slice(0, 100)}); hier steht sie (Geheimnisse verdeckt, höchstens 64 KB):\n${rein(antwortText.slice(0, 64 * 1024))}`
    : `Antwort (roh, Geheimnisse verdeckt): ${antwort.pfad}`);
  const keinErgebnis = grund => `${rein(grund)}\n${ersatz()}\nDas ist KEIN Ergebnis und nie als «keine Funde» zu lesen.`;
  if (urteil.art === 'limit') { io.fehler(`Zweitmeinung: ${keinErgebnis(urteil.grund)}`); return 4; }
  if (urteil.art !== 'ok') { io.fehler(`Zweitmeinung: ${keinErgebnis(urteil.grund)}`); return 5; }

  const gelesen = leseFunde(urteil.antwort, { dateien: geprueft.dateien.map(d => ({ rel: d.rel, zeilen: d.zeilen })) });
  if (!gelesen.ok) { io.fehler(`Zweitmeinung: ${keinErgebnis(`Antwort vollständig, aber ${gelesen.grund}`)}`); return 5; }
  const verdeckt = verdeckeFunde(gelesen.funde);
  const fundeDatei = speichere('.funde.json', `${JSON.stringify({
    status: gelesen.status, pruefen: gelesen.pruefen, verdeckt: verdeckt.anzahl,
    erstellt: new Date().toISOString(), modell: cfg.modell, aufwand: cfg.aufwand, hinweis: HINWEIS,
    dateien: geprueft.dateien.map(d => ({ rel: d.rel, bytes: d.bytes, zeilen: d.zeilen })), zaehlung: gelesen.zaehlung, funde: verdeckt.funde,
  }, null, 2)}\n`);
  let bericht = baueBericht({
    funde: verdeckt.funde, zaehlung: gelesen.zaehlung, pruefen: gelesen.pruefen, modell: cfg.modell, aufwand: cfg.aufwand, dateien: geprueft.dateien,
    ausgabeDatei: antwort.pfad, fundeDatei: fundeDatei.pfad,
  });
  if (verdeckt.anzahl) bericht += `\n\nHinweis: ${verdeckt.anzahl} Treffer von Geheimnissen oder Personendaten in der Antwort wurden durch [verdeckt] ersetzt.`;
  io.aus(bericht);
  if (antwort.fehler || fundeDatei.fehler) io.fehler(`Zweitmeinung: ${antwort.fehler ? ersatz() : `Die Funde-Datei wurde nicht gespeichert (${rein(String(fundeDatei.fehler), { einzeilig: true }).slice(0, 100)}).`}`);
  if (gelesen.status === 'pruefen') {
    io.fehler(`Zweitmeinung: Antwort gelesen, aber unsicher (${gelesen.pruefen.map(g => rein(g, { einzeilig: true })).join('; ')}). Antwortdatei von Hand prüfen; nie als «keine Funde» und nie als vollständig zu lesen.`);
    return 6;
  }
  return 0;
}

/**
 * Einstieg für Aufrufer und Tests. `opt`: wurzel (Repo-Ordner), cwd (Arbeitsordner für relative Namen, Vorgabe process.cwd()), temp, rubrikPfad, signal, io.
 * Gibt den Exit-Code zurück und beendet das Programm nie selbst.
 */
export async function main(args, env = process.env, opt = {}) {
  const io = { aus: t => process.stdout.write(`${t}\n`), fehler: t => process.stderr.write(`${t}\n`), ...opt.io };
  try {
    return await lauf(args, env, opt, io);
  } catch (e) {
    if (e instanceof Abbruch) { io.fehler(`Zweitmeinung: ${e.message}`); return e.exit; }
    io.fehler(`Zweitmeinung: unerwarteter Fehler: ${verdecke(e instanceof Error ? e.message : String(e))}`);
    return 1;
  }
}

const alsSkript = (() => {
  try { return pathToFileURL(fs.realpathSync(process.argv[1] ?? '')).href === import.meta.url; } catch { return false; }
})();
if (alsSkript) {
  const abbruch = new AbortController();
  // Auch SIGHUP (Terminal oder SSH-Sitzung geschlossen) und SIGQUIT, und jedes weitere Signal: sonst bliebe Codex als Waise zurück.
  for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT']) process.on(s, () => abbruch.abort());
  process.exitCode = await main(process.argv.slice(2), process.env, { signal: abbruch.signal });
}
