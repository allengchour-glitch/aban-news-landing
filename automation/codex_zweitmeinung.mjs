#!/usr/bin/env node
/**
 * Zweitmeinung von Codex (GPT-6 Astra über den ChatGPT-Pro-Login) als Gegenleser aus anderer Modellfamilie.
 *
 * Trockenlauf ist die Vorgabe: zeigt Dateiliste, Grössen, Suchergebnis, Aufruf und Anweisung, startet Codex nicht.
 * Mit LIVE=1 läuft Codex: in einem NEUEN leeren Ordner (nur die genannten Dateien), mit leerer Umgebung
 * (genau PATH, HOME, CODEX_HOME), ohne Shell, schreibgeschützt (-s read-only). Repo, Schlüssel und Umgebungsvariablen
 * kommen nie hinein. Vorher sucht das Werkzeug in allem, was gesendet würde, nach Geheimnissen und Personendaten.
 *
 *   node automation/codex_zweitmeinung.mjs automation/lib/preis.mjs automation/preis_lauf.mjs
 *   DATEIEN=a.mjs,b.mjs node automation/codex_zweitmeinung.mjs
 *   LIVE=1 CODEX_BIN=/pfad/zu/codex CODEX_HOME_ZWEITMEINUNG=/pfad/zum/login-ordner node automation/codex_zweitmeinung.mjs <Dateien>
 *
 * Einstellungen (Umgebung):
 *   DATEIEN                          Dateien, kommagetrennt (wenn keine Argumente)
 *   LIVE=1                           Codex wirklich starten (alles andere = Trockenlauf)
 *   CODEX_BIN                        Pfad zum codex-Programm (Pflicht bei LIVE, kein Standardwert)
 *   CODEX_HOME_ZWEITMEINUNG          Ordner mit dem Codex-Login (Pflicht bei LIVE, kein Standardwert)
 *   ZWEITMEINUNG_MODELL              Vorgabe gpt-6-astra
 *   ZWEITMEINUNG_AUFWAND             Vorgabe high
 *   ZWEITMEINUNG_ZEITLIMIT_MINUTEN   Vorgabe 20
 *   ZWEITMEINUNG_AUSGABE_ORDNER      Vorgabe: Temp-Ordner des Systems; nie im Repo
 *   ZWEITMEINUNG_AUFTRAG / --auftrag Text für Codex (Vorgabe: Zweitmeinung, Geldwirkung zuerst)
 *
 * Exit: 0 Trockenlauf oder vollständige Antwort · 1 unerwarteter Fehler · 2 Eingabe oder Einstellung ·
 *       3 Geheimnis oder Personendaten gefunden (nichts gesendet) · 4 Nutzungslimit erreicht ·
 *       5 Lauf ohne vollständige Antwort (Anmeldung, Netz, Zeitlimit, ENDE fehlt, keine lesbare Liste).
 * Nur Exit 0 mit LIVE=1 ist ein Ergebnis. Exit 4 und 5 sind NIE «keine Funde».
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  Abbruch, GRENZEN, HINWEIS, baueAnweisung, baueArgv, baueBericht, baueUmgebung, klassifiziere, leseDateiliste,
  leseFunde, liesArgumente, liesKonfiguration, meldungGeheimnisse, pruefeDateien, pruefeOrdnerAusserhalb, pruefeStart,
  schreibeSandkasten, sucheAlles, verdecke,
} from './lib/codex_zweitmeinung.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HIER, '..');
const RUBRIK_PFAD = path.join(REPO, 'codex-mods', 'luxe-codex', 'skills', 'zweitmeinung', 'RUBRIK.md');
const HILFE = 'Aufruf: node automation/codex_zweitmeinung.mjs [--auftrag "Text"] <Datei> [<Datei> …]   (oder DATEIEN=a,b)\nTrockenlauf ist die Vorgabe; LIVE=1 startet Codex. Einstellungen und Exit-Codes stehen im Kopf der Datei.';

/**
 * Startet das Programm ohne Shell, schreibt `stdin`, sammelt stdout/stderr (mit Obergrenze) und beendet es
 * bei Zeitlimit, Überlauf oder Abbruch samt seiner Prozessgruppe. Wirft nie; Fehler stehen im Ergebnis.
 */
export function fuehreAus({ bin, argv, env, cwd, stdin, zeitlimitMs, maxBytes = 8 * 1024 * 1024, signal }) {
  return new Promise(fertig => {
    const erg = { code: null, signal: null, stdout: '', stderr: '', zeitueberschreitung: false, startfehler: '', ueberlauf: false, abgebrochen: false };
    const teile = { out: [], err: [] };
    let bytes = 0;
    let kind;
    let beendet = false;
    let zeitTimer;
    let hartTimer;
    const beiAbbruch = () => { erg.abgebrochen = true; stoppen(); };
    const abschluss = () => {
      if (beendet) return;
      beendet = true;
      clearTimeout(zeitTimer);
      clearTimeout(hartTimer);
      signal?.removeEventListener('abort', beiAbbruch);
      erg.stdout = Buffer.concat(teile.out).toString('utf8');
      erg.stderr = Buffer.concat(teile.err).toString('utf8');
      fertig(erg);
    };
    const toeten = sig => {
      try { process.kill(-kind.pid, sig); } catch { try { kind.kill(sig); } catch { /* schon weg */ } }
    };
    function stoppen() {
      toeten('SIGTERM');
      hartTimer = setTimeout(() => toeten('SIGKILL'), 2000);
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
    kind.on('close', (code, sig) => { erg.code = code; erg.signal = sig; abschluss(); });
    zeitTimer = setTimeout(() => { erg.zeitueberschreitung = true; stoppen(); }, zeitlimitMs);
    if (signal?.aborted) beiAbbruch(); else signal?.addEventListener('abort', beiAbbruch, { once: true });
    kind.stdin.end(stdin);
    return undefined;
  });
}

const kb = n => `${(n / 1024).toFixed(1)} KB`;

function schreibeDatei(ordner, name, inhalt) {
  const pfad = path.join(ordner, name);
  const fd = fs.openSync(pfad, 'wx', 0o600);
  try {
    fs.writeSync(fd, inhalt);
    fs.fchmodSync(fd, 0o600);
  } finally { fs.closeSync(fd); }
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
    gruende.length ? `Bereit für LIVE=1: NEIN (${gruende.join('; ')})` : 'Bereit für LIVE=1: ja',
  ];
  io.aus(z.join('\n'));
  return 0;
}

async function lauf(args, env, opt, io) {
  const wurzel = opt.wurzel ?? REPO;
  const temp = opt.temp ?? os.tmpdir();
  const a = liesArgumente(args);
  if (a.hilfe) { io.aus(HILFE); return 0; }
  if (a.fehler.length) throw new Abbruch(2, `${a.fehler.join('; ')}\n${HILFE}`);
  const cfg = liesKonfiguration(env, { auftrag: a.auftrag });
  const namen = leseDateiliste(a.dateien, env);
  const geprueft = pruefeDateien(namen, wurzel);
  if (!geprueft.ok) throw new Abbruch(2, `Eingabe abgelehnt, nichts wurde gesendet:\n${geprueft.fehler.map(f => `  - ${f}`).join('\n')}`);
  let rubrik;
  try { rubrik = fs.readFileSync(opt.rubrikPfad ?? RUBRIK_PFAD, 'utf8'); } catch { throw new Abbruch(2, 'RUBRIK.md fehlt (codex-mods/luxe-codex/skills/zweitmeinung/RUBRIK.md)'); }
  const funde = sucheAlles({ dateien: geprueft.dateien, auftrag: cfg.auftrag, rubrik });
  if (funde.length) throw new Abbruch(3, meldungGeheimnisse(funde));
  const tempEcht = pruefeOrdnerAusserhalb(temp, wurzel, 'der Temp-Ordner');
  const ausgabeOrdner = cfg.ausgabeOrdner ? pruefeOrdnerAusserhalb(cfg.ausgabeOrdner, wurzel, 'ZWEITMEINUNG_AUSGABE_ORDNER') : tempEcht;
  const anweisung = baueAnweisung({ rubrik, auftrag: cfg.auftrag, dateien: geprueft.dateien });
  const gruende = pruefeStart(cfg);

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

  const stempel = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const name = `zweitmeinung-${stempel}-${crypto.randomBytes(4).toString('hex')}`;
  const antwortDatei = schreibeDatei(ausgabeOrdner, `${name}.txt`, ergebnis.stdout);
  if (ergebnis.stderr.trim()) schreibeDatei(ausgabeOrdner, `${name}.stderr.txt`, `${verdecke(ergebnis.stderr).slice(0, 64 * 1024)}\n`);
  const urteil = klassifiziere(ergebnis);
  const keinErgebnis = grund => `${grund}\nAntwort (roh): ${antwortDatei}\nDas ist KEIN Ergebnis und nie als «keine Funde» zu lesen.`;
  if (urteil.art === 'limit') { io.fehler(`Zweitmeinung: ${keinErgebnis(urteil.grund)}`); return 4; }
  if (urteil.art !== 'ok') { io.fehler(`Zweitmeinung: ${keinErgebnis(urteil.grund)}`); return 5; }

  const gelesen = leseFunde(urteil.antwort, { dateien: geprueft.dateien.map(d => ({ rel: d.rel, zeilen: d.zeilen })) });
  if (!gelesen.ok) { io.fehler(`Zweitmeinung: ${keinErgebnis(`Antwort vollständig, aber ${gelesen.grund}`)}`); return 5; }
  const fundeDatei = schreibeDatei(ausgabeOrdner, `${name}.funde.json`, `${JSON.stringify({
    erstellt: new Date().toISOString(), modell: cfg.modell, aufwand: cfg.aufwand, hinweis: HINWEIS,
    dateien: geprueft.dateien.map(d => ({ rel: d.rel, bytes: d.bytes, zeilen: d.zeilen })), zaehlung: gelesen.zaehlung, funde: gelesen.funde,
  }, null, 2)}\n`);
  io.aus(baueBericht({ funde: gelesen.funde, zaehlung: gelesen.zaehlung, modell: cfg.modell, aufwand: cfg.aufwand, dateien: geprueft.dateien, ausgabeDatei: antwortDatei, fundeDatei }));
  return 0;
}

/**
 * Einstieg für Aufrufer und Tests. `opt`: wurzel (Repo-Ordner), temp, rubrikPfad, signal, io.
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
  for (const s of ['SIGINT', 'SIGTERM']) process.once(s, () => abbruch.abort());
  process.exitCode = await main(process.argv.slice(2), process.env, { signal: abbruch.signal });
}
