/**
 * Zweitmeinung aus anderer Modellfamilie (Codex): die Bausteine des Läufers.
 *
 * Dieses Modul startet keinen Prozess, öffnet kein Netz und beendet nie das Programm. Es prüft Eingaben,
 * sucht vorab nach Geheimnissen und Personendaten, baut Aufruf, Umgebung und Anweisung, erkennt das
 * Nutzungslimit und liest die Funde aus der Antwort. Der Lauf selbst steht in automation/codex_zweitmeinung.mjs.
 *
 * Was NICHT bestätigt ist (kein echter Codex-Lauf, Limit des Besitzers am 28.10. erreicht):
 *   - der genaue Wortlaut der Meldungen von Codex (Limit, Anmeldung, Netz): erkannt wird nach den Beispielen,
 *     die CLAUDE.md überliefert; jede nicht erkannte Meldung endet trotzdem als Exit 5, nie als Ergebnis;
 *   - ob die Antwort allein auf stdout steht und «ENDE» die letzte Zeile bleibt.
 *
 * Eine Zweitmeinung ist eine Behauptung: jeder Fund trägt den Hinweis, ihn am echten Code nachzustellen.
 */
import fs from 'node:fs';
import path from 'node:path';

export const GRENZEN = Object.freeze({ dateien: 40, bytes: 400 * 1024, auftrag: 4000 });
export const MARKER = 'luxe-geheim-ok';
export const HINWEIS = 'Behauptung der Modellfamilie: erst am echten Code nachstellen';
export const FELDER = Object.freeze(['titel', 'schwere', 'datei', 'zeile', 'fehlerfall', 'beleg', 'unklar']);
export const SCHWEREN = Object.freeze(['wichtig', 'klein']);
export const VORGABE = Object.freeze({ modell: 'gpt-6-astra', aufwand: 'high', zeitlimitMinuten: 20 });

/** Abbruch mit Exit-Code und Grund; der Läufer macht daraus eine Meldung. 2 = Eingabe/Einstellung, 3 = Geheimnis. */
export class Abbruch extends Error {
  constructor(exit, meldung) {
    super(meldung);
    this.exit = exit;
  }
}

// ------------------------------------------------------------------------------------------------
// Argumente und Einstellungen

export function liesArgumente(args) {
  const aus = { dateien: [], auftrag: undefined, hilfe: false, fehler: [] };
  let nurDateien = false;
  for (let i = 0; i < args.length; i += 1) {
    const a = String(args[i]);
    if (nurDateien || !a.startsWith('-') || a === '-') { aus.dateien.push(a); continue; }
    if (a === '--') { nurDateien = true; continue; }
    if (a === '-h' || a === '--help') { aus.hilfe = true; continue; }
    if (a === '--auftrag') {
      if (i + 1 >= args.length) aus.fehler.push('--auftrag braucht einen Text');
      else aus.auftrag = String(args[i += 1]);
      continue;
    }
    if (a.startsWith('--auftrag=')) { aus.auftrag = a.slice('--auftrag='.length); continue; }
    aus.fehler.push(`unbekannte Option ${a.slice(0, 40)}`);
  }
  return aus;
}

/** Dateien aus den Argumenten, sonst aus DATEIEN (kommagetrennt). Ohne Leere und Doppelte. */
export function leseDateiliste(positional, env = {}) {
  const roh = positional.length ? positional : String(env.DATEIEN ?? '').split(',');
  const aus = [];
  for (const r of roh) {
    const n = String(r).trim();
    if (n && !aus.includes(n)) aus.push(n);
  }
  return aus;
}

export function liesKonfiguration(env = {}, { auftrag } = {}) {
  const wert = (name, vorgabe) => (String(env[name] ?? '').trim() || vorgabe);
  const modell = wert('ZWEITMEINUNG_MODELL', VORGABE.modell);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(modell)) throw new Abbruch(2, `ZWEITMEINUNG_MODELL «${modell.slice(0, 40)}» ist kein gültiger Modellname`);
  const aufwand = wert('ZWEITMEINUNG_AUFWAND', VORGABE.aufwand);
  if (!/^[a-z]{3,10}$/.test(aufwand)) throw new Abbruch(2, `ZWEITMEINUNG_AUFWAND «${aufwand.slice(0, 40)}» ist keine gültige Stufe (z. B. low, medium, high)`);
  const minuten = Number(wert('ZWEITMEINUNG_ZEITLIMIT_MINUTEN', String(VORGABE.zeitlimitMinuten)));
  if (!Number.isFinite(minuten) || minuten <= 0 || minuten > 180) throw new Abbruch(2, 'ZWEITMEINUNG_ZEITLIMIT_MINUTEN muss eine Zahl über 0 und höchstens 180 sein');
  const text = String(auftrag ?? env.ZWEITMEINUNG_AUFTRAG ?? '').trim() || 'Gib eine Zweitmeinung zu den folgenden Dateien. Code mit Geldwirkung zuerst.';
  if (text.length > GRENZEN.auftrag || text.includes('\0')) throw new Abbruch(2, `der Auftrag ist ungültig (höchstens ${GRENZEN.auftrag} Zeichen, kein NUL)`);
  return {
    modell,
    aufwand,
    zeitlimitMs: Math.round(minuten * 60_000),
    minuten,
    live: env.LIVE === '1',
    bin: String(env.CODEX_BIN ?? '').trim(),
    codexHome: String(env.CODEX_HOME_ZWEITMEINUNG ?? '').trim(),
    ausgabeOrdner: String(env.ZWEITMEINUNG_AUSGABE_ORDNER ?? '').trim(),
    auftrag: text,
  };
}

/** Was für LIVE=1 fehlt: Liste von Gründen (leer = bereit). Prüft Dateisystem, startet nichts. */
export function pruefeStart({ bin, codexHome }, fsx = fs) {
  const g = [];
  if (!bin) g.push('CODEX_BIN fehlt (Pfad zum codex-Programm, kein Standardwert)');
  else if (bin.includes('/') || bin.includes('\\')) {
    if (!path.isAbsolute(bin)) g.push('CODEX_BIN muss ein absoluter Pfad sein oder ein Programmname ohne «/»');
    else {
      try {
        const st = fsx.statSync(bin);
        if (!st.isFile()) g.push('CODEX_BIN ist keine Datei');
        else fsx.accessSync(bin, fs.constants.X_OK);
      } catch { g.push('CODEX_BIN ist nicht vorhanden oder nicht ausführbar'); }
    }
  }
  if (!codexHome) g.push('CODEX_HOME_ZWEITMEINUNG fehlt (Ordner mit dem Codex-Login, kein Standardwert)');
  else if (!path.isAbsolute(codexHome)) g.push('CODEX_HOME_ZWEITMEINUNG muss ein absoluter Pfad sein');
  else {
    try { if (!fsx.statSync(codexHome).isDirectory()) g.push('CODEX_HOME_ZWEITMEINUNG ist kein Ordner'); }
    catch { g.push('CODEX_HOME_ZWEITMEINUNG gibt es nicht'); }
  }
  return g;
}

// ------------------------------------------------------------------------------------------------
// Dateien prüfen und lesen

const SEGMENT_TRENNER = /[\\/]+/;
const ENDUNGEN_SCHLUESSEL = ['.pem', '.key', '.p12', '.pfx'];
const NAMEN_ZUGANG = ['.npmrc', '.netrc', 'auth.json'];

/** Grund, warum ein relativer Pfad nie gesendet wird; `null` = erlaubt. */
export function verbotenerPfad(rel) {
  const teile = String(rel).split(SEGMENT_TRENNER).filter(Boolean).map(t => t.toLowerCase());
  for (const t of teile) {
    if (t === '.git') return 'liegt in .git/';
    if (t === 'node_modules') return 'liegt in node_modules/';
    if (t.startsWith('.env')) return 'ist eine .env*-Datei';
  }
  const name = teile[teile.length - 1] ?? '';
  if (NAMEN_ZUGANG.includes(name)) return `${name} enthält Zugangsdaten`;
  if (ENDUNGEN_SCHLUESSEL.some(e => name.endsWith(e))) return 'sieht nach einer Schlüsseldatei aus';
  return null;
}

const innerhalb = (wurzel, ziel) => {
  const r = path.relative(wurzel, ziel);
  return r !== '' && !r.startsWith('..') && !path.isAbsolute(r);
};

/** Liest eine Datei über einen Dateideskriptor ohne Symlinks zu folgen (O_NOFOLLOW) und prüft sie dort. */
function liesOhneSymlink(abs, fsx, grenze) {
  const fd = fsx.openSync(abs, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const st = fsx.fstatSync(fd);
    if (!st.isFile()) return { fehler: 'keine reguläre Datei' };
    if (st.size > grenze) return { fehler: 'zu gross' };
    const puffer = Buffer.alloc(st.size + 1);
    const n = fsx.readSync(fd, puffer, 0, st.size + 1, 0);
    if (n > st.size) return { fehler: 'wuchs während des Lesens' };
    return { inhalt: puffer.subarray(0, n) };
  } finally { fsx.closeSync(fd); }
}

const zeilenZahl = buf => {
  if (buf.length === 0) return 0;
  let n = 0;
  for (const b of buf) if (b === 10) n += 1;
  return buf[buf.length - 1] === 10 ? n : n + 1;
};

/**
 * Prüft die Dateiliste und liest die Dateien einmal ein (dieselben Bytes werden gesucht UND kopiert).
 * Erlaubt: reguläre Textdateien innerhalb von `wurzel`, höchstens 40, zusammen höchstens 400 KB.
 * Verboten: «..», Pfade ausserhalb, Symlinks (auch ein Symlink-Ordner, der hinausführt), .git/, .env*,
 * node_modules/, Zugangs- und Schlüsseldateien, Binärdateien, Steuerzeichen im Namen.
 * Gibt `{ ok, fehler: [...], dateien: [{ rel, bytes, zeilen, inhalt }], gesamt }`; bei `ok:false` nie senden.
 * Über die Spec hinaus (fail-closed): Zugangs- und Schlüsseldateien (.npmrc, .netrc, auth.json, *.pem/*.key/*.p12/*.pfx),
 * Binärdateien, Steuerzeichen im Namen und ein Symlink als Datei selbst (auch einer, der im Repo bleibt).
 * Nicht abgedeckt: ein zweiter Prozess, der während der Prüfung Ordner austauscht (nur die Datei selbst wird ohne
 * Symlink-Folgen geöffnet, O_NOFOLLOW).
 */
export function pruefeDateien(namen, wurzel, fsx = fs) {
  const fehler = [];
  const dateien = [];
  if (!Array.isArray(namen) || namen.length === 0) return { ok: false, fehler: ['keine Dateien angegeben (Argumente oder DATEIEN=a,b)'], dateien, gesamt: 0 };
  if (namen.length > GRENZEN.dateien) return { ok: false, fehler: [`zu viele Dateien: ${namen.length}, höchstens ${GRENZEN.dateien}`], dateien, gesamt: 0 };
  const wurzelReal = fsx.realpathSync(wurzel);
  const wurzelLex = path.resolve(wurzel);
  let gesamt = 0;
  let zuGross = false;
  const gesehen = new Set();
  namen.forEach((name, i) => {
    const wo = `«${String(name).slice(0, 80).replace(/[\u0000-\u001f\u007f]/g, '?')}»`;
    const schlecht = g => fehler.push(`${wo}: ${g}`);
    if (typeof name !== 'string' || name === '') return schlecht('kein Dateiname');
    if (/[\u0000-\u001f\u007f]/.test(name)) return schlecht('Steuerzeichen im Namen');
    if (name.split(SEGMENT_TRENNER).includes('..')) return schlecht('«..» im Pfad ist nicht erlaubt');
    const lex = path.resolve(wurzelReal, name);
    if (lex === wurzelReal || path.resolve(name) === wurzelLex) return schlecht('ist der Repo-Ordner, keine Datei');
    let relLex;
    if (innerhalb(wurzelReal, lex)) relLex = path.relative(wurzelReal, lex);
    else if (path.isAbsolute(name) && innerhalb(wurzelLex, path.resolve(name))) relLex = path.relative(wurzelLex, path.resolve(name));
    else return schlecht('liegt ausserhalb des Repos');
    const rel = relLex.split(path.sep).join('/');
    if (gesehen.has(rel)) return undefined;
    gesehen.add(rel);
    const gesperrt = verbotenerPfad(rel);
    if (gesperrt) return schlecht(gesperrt);
    const abs = path.join(wurzelReal, relLex);
    let lst;
    try { lst = fsx.lstatSync(abs); } catch { return schlecht('nicht gefunden'); }
    if (lst.isSymbolicLink()) return schlecht('ist ein Symlink (nur reguläre Dateien)');
    if (!lst.isFile()) return schlecht('ist keine reguläre Datei');
    let echt;
    try { echt = fsx.realpathSync(abs); } catch { return schlecht('nicht lesbar'); }
    if (!innerhalb(wurzelReal, echt)) return schlecht('führt über einen Symlink aus dem Repo hinaus');
    const relEcht = path.relative(wurzelReal, echt).split(path.sep).join('/');
    const gesperrtEcht = verbotenerPfad(relEcht);
    if (gesperrtEcht) return schlecht(`über einen Symlink-Ordner erreicht, Ziel ${gesperrtEcht}`);
    if (gesamt + lst.size > GRENZEN.bytes) {
      if (zuGross) return undefined;
      zuGross = true;
      return schlecht(`zusammen über ${GRENZEN.bytes} Bytes (${GRENZEN.bytes / 1024} KB) mit dieser Datei`);
    }
    let gelesen;
    try { gelesen = liesOhneSymlink(abs, fsx, GRENZEN.bytes - gesamt); } catch (e) { return schlecht(`nicht lesbar (${e.code ?? 'Fehler'})`); }
    if (gelesen.fehler) return schlecht(gelesen.fehler);
    if (gelesen.inhalt.includes(0)) return schlecht('Binärdatei (enthält NUL-Bytes)');
    gesamt += gelesen.inhalt.length;
    dateien.push({ rel, bytes: gelesen.inhalt.length, zeilen: zeilenZahl(gelesen.inhalt), inhalt: gelesen.inhalt, nr: i + 1 });
    return undefined;
  });
  return { ok: fehler.length === 0, fehler, dateien, gesamt };
}

/** Ausgabeordner: muss es geben und darf nicht im Repo liegen. Gibt den echten Pfad zurück. */
export function pruefeOrdnerAusserhalb(ordner, wurzel, was, fsx = fs) {
  let echt;
  try { echt = fsx.realpathSync(ordner); } catch { throw new Abbruch(2, `${was} «${ordner}» gibt es nicht`); }
  if (!fsx.statSync(echt).isDirectory()) throw new Abbruch(2, `${was} «${ordner}» ist kein Ordner`);
  const w = fsx.realpathSync(wurzel);
  if (echt === w || innerhalb(w, echt)) throw new Abbruch(2, `${was} liegt im Repo (${path.relative(w, echt) || '.'}); es darf nie ins Repo geschrieben werden`);
  return echt;
}

// ------------------------------------------------------------------------------------------------
// Vorab-Suche nach Geheimnissen und Personendaten (das Messgerät: Treffer UND Nicht-Treffer sind getestet)

// Schlüsselmuster wie GEHEIMNISSE in luxe-leitplanken/hooks/regeln.ts; Obergrenzen an den Wiederholungen
// halten die Suche auch bei einer 400-KB-Zeile linear.
const MUSTER = [
  ['Shopify-Token (shpat_/shpss_)', /\bshp(?:at|ss|ca|pa)_[0-9a-f]{32}\b/i],
  ['Stripe-Schlüssel (sk_live_/rk_live_)', /\b[rs]k_live_[A-Za-z0-9]{16,200}/],
  ['Groq-Schlüssel (gsk_)', /\bgsk_[A-Za-z0-9]{30,200}/],
  ['Google-API-Schlüssel (AIza)', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['GitHub-Token (ghp_/gho_/…)', /\bgh[pousr]_[A-Za-z0-9]{36,200}/],
  ['GitHub-Token (github_pat_)', /\bgithub_pat_[A-Za-z0-9_]{40,300}/],
  ['Slack-Token (xox…)', /\bxox[abprs]-[A-Za-z0-9-]{10,200}/],
  ['privater Schlüssel (PEM/PGP)', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----/],
  // Echte Schlüssel mischen Ziffern oder Grossbuchstaben ein; ein reiner Kleinbuchstaben-Name wie «sk-circle-fade-animation» nicht.
  ['OpenAI-Schlüssel (sk-)', /(?<![A-Za-z0-9])sk-(?=[A-Za-z0-9_-]{0,200}[0-9A-Z])[A-Za-z0-9_-]{20,200}/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{5,2048}\.eyJ[A-Za-z0-9_-]{5,2048}\.[A-Za-z0-9_-]{5,2048}/],
  ['Zugang in Adresse (Benutzer:Passwort@Host)', /[a-z][a-z0-9+.-]{1,15}:\/\/[^\s/:@]{1,128}:[^\s/@]{1,128}@[^\s/]{1,255}/i],
  ['IBAN (CH)', /(?<![A-Za-z0-9])CH\d\d(?:\s?\d{4}){4}\s?\d(?!\d)/i],
  ['Telefonnummer (CH)', /(?<![\w+-])(?:\+41|0041)(?:[\s./-]?\(0\))?(?:[\s./-]?\d){9}(?!\d)/],
  ['Telefonnummer (CH)', /(?<![\w+-])07\d(?:[\s./-]?\d){7}(?!\d)/],
  ['AHV-Nummer', /(?<!\d)756\.\d{4}\.\d{4}\.\d{2}(?!\d)/],
];
const MUSTER_G = MUSTER.map(([art, re]) => [art, new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)]);

// Endungen von Dateien, die nach «name@2x.png» aussehen, aber keine Adresse sind.
const DATEIENDUNGEN = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'ico', 'css', 'js', 'mjs', 'cjs', 'jsx', 'tsx', 'json', 'txt', 'html', 'htm', 'xml', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'map', 'pdf', 'mp4', 'webm', 'wav', 'mp3', 'yml', 'yaml', 'lock']);

/** E-Mail-Adressen, ausser @example.* und noreply@; läuft über die @-Stellen, nicht über einen gierigen Regex. */
function emailTreffer(zeile) {
  const aus = [];
  let von = zeile.indexOf('@');
  while (von !== -1) {
    const links = /[A-Za-z0-9._%+-]{1,64}$/.exec(zeile.slice(Math.max(0, von - 64), von));
    const rechts = /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*/.exec(zeile.slice(von + 1, von + 256));
    if (links && rechts) {
      const teile = rechts[0].split('.');
      while (teile.length > 1 && DATEIENDUNGEN.has(teile[teile.length - 1].toLowerCase())) teile.pop();
      const tld = teile[teile.length - 1];
      const echteAdresse = teile.length >= 2 && /^[A-Za-z]{2,24}$/.test(tld);
      const beispiel = teile.length >= 2 && teile[teile.length - 2].toLowerCase() === 'example';
      const lokal = links[0].toLowerCase();
      if (echteAdresse && !beispiel && lokal !== 'noreply') aus.push({ art: 'E-Mail-Adresse', von: von - links[0].length, bis: von + 1 + teile.join('.').length });
    }
    von = zeile.indexOf('@', von + 1);
  }
  return aus;
}

/** Alle Treffer einer Zeile: `[{ art, von, bis }]`. Der Marker wird hier nicht beachtet (siehe sucheText). */
export function treffer(zeile) {
  const aus = [];
  const z = String(zeile);
  for (const [art, re] of MUSTER_G) for (const m of z.matchAll(re)) aus.push({ art, von: m.index, bis: m.index + m[0].length });
  aus.push(...emailTreffer(z));
  return aus;
}

/** Sucht in einem Text; die Marke `luxe-geheim-ok` in einer Zeile erlaubt Testdaten. Gibt nie den Fund selbst zurück. */
export function sucheText(text, datei) {
  const aus = [];
  String(text).split(/\r\n|\r|\n/).forEach((z, i) => {
    if (z.includes(MARKER)) return;
    for (const art of new Set(treffer(z).map(t => t.art))) aus.push({ datei, zeile: i + 1, art });
  });
  return aus;
}

/** Ersetzt jeden Treffer durch [verdeckt]; für Texte, die in Meldungen oder Dateien wandern könnten (Fehlerausgabe von Codex). */
export function verdecke(text) {
  return String(text).split(/\r\n|\r|\n/).map(z => {
    const spannen = treffer(z).sort((a, b) => a.von - b.von);
    const zusammen = [];
    for (const t of spannen) {
      const l = zusammen[zusammen.length - 1];
      if (l && t.von <= l.bis) l.bis = Math.max(l.bis, t.bis); else zusammen.push({ von: t.von, bis: t.bis });
    }
    let s = z;
    for (const t of zusammen.reverse()) s = `${s.slice(0, t.von)}[verdeckt]${s.slice(t.bis)}`;
    return s;
  }).join('\n');
}

/**
 * Sucht in allen zu sendenden Teilen: Dateinamen, Dateiinhalten, Auftrag, Rubrik.
 * Ein Fund im Dateinamen wird ohne den Namen gemeldet (der Name wäre der Fund).
 */
export function sucheAlles({ dateien, auftrag, rubrik }) {
  const aus = [];
  dateien.forEach((d, i) => {
    for (const f of sucheText(d.rel, '')) aus.push({ datei: `Datei Nr. ${i + 1} (Name verdeckt)`, zeile: 0, art: f.art });
    aus.push(...sucheText(d.inhalt.toString('utf8'), d.rel));
  });
  aus.push(...sucheText(auftrag ?? '', 'Auftrag'));
  aus.push(...sucheText(rubrik ?? '', 'RUBRIK.md'));
  return aus;
}

export function meldungGeheimnisse(funde, maximal = 50) {
  const z = funde.slice(0, maximal).map(f => `  ${f.datei}:${f.zeile}:${f.art}`);
  if (funde.length > maximal) z.push(`  … und ${funde.length - maximal} weitere`);
  return [
    `${funde.length} Fund(e) von Geheimnissen oder Personendaten (Datei:Zeile:Art), nichts wurde gesendet, kein Sandkasten angelegt:`,
    ...z,
    `Datei aus der Liste nehmen, oder erfundene Testdaten in derselben Zeile mit «${MARKER}» kennzeichnen. Der Fund selbst wird nie ausgegeben.`,
  ].join('\n');
}

// ------------------------------------------------------------------------------------------------
// Sandkasten, Umgebung, Aufruf, Anweisung

/** Schreibt die Dateien unter ihrem relativen Pfad (Ordner 0700, Dateien 0600) und gibt die geschriebenen Pfade zurück. */
export function schreibeSandkasten(sandkasten, dateien, fsx = fs) {
  const wurzel = path.resolve(sandkasten);
  const aus = [];
  for (const d of dateien) {
    const ziel = path.resolve(wurzel, ...d.rel.split('/'));
    if (!innerhalb(wurzel, ziel)) throw new Error(`Pfad verlässt den Sandkasten: ${d.rel}`);
    fsx.mkdirSync(path.dirname(ziel), { recursive: true, mode: 0o700 });
    fsx.writeFileSync(ziel, d.inhalt, { mode: 0o600, flag: 'wx' });
    aus.push(ziel);
  }
  return aus;
}

/** Nur absolute Einträge; leer → Standardpfad. Ein relativer Eintrag (zum Beispiel «.») würde im Sandkasten suchen. */
export function bereinigterPfad(pfad) {
  const e = String(pfad ?? '').split(':').filter(x => x && path.isAbsolute(x));
  return e.length ? e.join(':') : '/usr/local/bin:/usr/bin:/bin';
}

/** Die Umgebung des Kindes: genau diese drei Namen und nichts sonst (Wirkung von `env -i PATH HOME CODEX_HOME`). */
export function baueUmgebung({ pfad, home, codexHome }) {
  return { PATH: bereinigterPfad(pfad), HOME: home, CODEX_HOME: codexHome };
}

/** Die Argumente nach dem Programm; ohne Shell, ein Eintrag je Argument. Die Anweisung kommt über stdin («-»). */
export function baueArgv({ modell, aufwand, sandkasten }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(String(modell))) throw new Abbruch(2, 'ungültiger Modellname');
  if (!/^[a-z]{3,10}$/.test(String(aufwand))) throw new Abbruch(2, 'ungültige Aufwandsstufe');
  if (!path.isAbsolute(String(sandkasten))) throw new Abbruch(2, 'der Sandkasten muss ein absoluter Pfad sein');
  return ['exec', '-m', modell, '-c', `model_reasoning_effort=${aufwand}`, '-s', 'read-only', '--skip-git-repo-check', '-C', sandkasten, '-'];
}

/** Rubrik + Auftrag + Dateiliste. Die Dateiinhalte stehen NICHT im Text: Codex liest sie im Sandkasten. */
export function baueAnweisung({ rubrik, auftrag, dateien }) {
  return [
    String(rubrik).trim(),
    '',
    '## Auftrag',
    String(auftrag).trim(),
    '',
    '## Dateien im Arbeitsordner (nur diese, nur lesen)',
    ...dateien.map(d => `- ${d.rel} (${d.bytes} Bytes, ${d.zeilen} Zeilen)`),
    '',
    'Antworte nach der Rubrik. Die allerletzte Zeile der Antwort ist ENDE.',
    '',
  ].join('\n');
}

// ------------------------------------------------------------------------------------------------
// Ergebnis des Laufs einordnen

const LIMIT = /You(?:[’‘'`´]ve| have) hit your usage limit/i;
const WIEDER_UM = /try again at\s+((?:[A-Z][a-z]{2,8}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(?:\d{4},?\s+)?)?\d{1,2}:\d{2}(?:\s*(?:[AaPp][Mm]|[AaPp]\.[Mm]\.))?)/i;
const WIEDER_IN = /try again in\s+([^.\n]{2,40})/i;
const ANMELDUNG = /not logged in|log ?in required|please (?:log ?in|sign in)|codex login|authentication (?:failed|required)|invalid[ _-]?(?:api[ _-]?key|token|credentials)|unauthori[sz]ed|\b401\b|token (?:has )?expired|refresh token|credit_balance_exhausted/i;
const NETZ = /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|network error|connection (?:refused|reset|timed out)|error sending request|dns error|failed to connect|stream disconnected|timed out/i;

/** Letzte nicht leere Zeile ist genau «ENDE». */
export function endetMitEnde(text) {
  const zeilen = String(text).split(/\r\n|\r|\n/);
  while (zeilen.length && zeilen[zeilen.length - 1].trim() === '') zeilen.pop();
  return zeilen.length > 0 && zeilen[zeilen.length - 1].trim() === 'ENDE';
}

/** Antwort ohne die Schlusszeile ENDE. */
export function ohneEnde(text) {
  const zeilen = String(text).split(/\r\n|\r|\n/);
  while (zeilen.length && zeilen[zeilen.length - 1].trim() === '') zeilen.pop();
  if (zeilen.length && zeilen[zeilen.length - 1].trim() === 'ENDE') zeilen.pop();
  return zeilen.join('\n').trim();
}

/** Limit-Meldung in einem Text: `{ wann }` (Uhrzeit aus dem Text oder «unbekannt») oder `undefined`. */
export function findeLimit(text) {
  const t = String(text);
  if (!LIMIT.test(t)) return undefined;
  const um = WIEDER_UM.exec(t);
  if (um) return { wann: um[1].trim() };
  const inn = WIEDER_IN.exec(t);
  if (inn) return { wann: `in ${inn[1].trim()}` };
  return { wann: 'unbekannt' };
}

const letzteZeile = text => verdecke(String(text).trim().split(/\r\n|\r|\n/).filter(Boolean).pop() ?? '').slice(0, 200);

/**
 * Ordnet das Ergebnis des Prozesses ein. Nur `art:'ok'` ist ein Ergebnis; alles andere hat einen Exit-Code
 * und einen Grund. Limit = 4, alles Übrige = 5. Eine vollständige Antwort (Exit 0 und letzte Zeile ENDE)
 * gewinnt gegen einen Limit-Text darin, damit ein Fund, der die Meldung zitiert, kein Limit auslöst.
 */
export function klassifiziere(r) {
  const aus = String(r.stdout ?? '');
  const err = String(r.stderr ?? '');
  if (r.startfehler) return { art: 'fehler', exit: 5, grund: `Codex liess sich nicht starten (${r.startfehler})` };
  if (r.abgebrochen) return { art: 'fehler', exit: 5, grund: 'Lauf durch ein Signal abgebrochen (Strg-C oder Beenden), Aufräumen lief' };
  if (r.zeitueberschreitung) return { art: 'fehler', exit: 5, grund: 'Zeitlimit überschritten, Codex wurde beendet' };
  if (r.ueberlauf) return { art: 'fehler', exit: 5, grund: 'Codex gab mehr Text aus als erlaubt, abgebrochen' };
  const vollstaendig = r.code === 0 && endetMitEnde(aus);
  const limit = findeLimit(`${err}\n${aus}`);
  if (limit && !vollstaendig) return { art: 'limit', exit: 4, uhrzeit: limit.wann, grund: `Nutzungslimit von Codex erreicht, neuer Versuch ${limit.wann === 'unbekannt' ? 'zu einer unbekannten Zeit' : limit.wann.startsWith('in ') ? limit.wann : `ab ${limit.wann}`} (Zeitzone der Meldung unbekannt)` };
  if (vollstaendig) return { art: 'ok', exit: 0, antwort: ohneEnde(aus) };
  const quelle = `${err}\n${aus.slice(0, 2000)}`;
  if (ANMELDUNG.test(quelle)) return { art: 'fehler', exit: 5, grund: `Anmeldefehler bei Codex (${letzteZeile(err || aus)})` };
  if (NETZ.test(quelle)) return { art: 'fehler', exit: 5, grund: `Netzfehler bei Codex (${letzteZeile(err || aus)})` };
  if (r.signal) return { art: 'fehler', exit: 5, grund: `Codex wurde durch das Signal ${r.signal} beendet` };
  if (r.code !== 0) return { art: 'fehler', exit: 5, grund: `Codex endete mit Code ${r.code}${err.trim() ? ` (${letzteZeile(err)})` : ''}` };
  if (aus.trim() === '') return { art: 'fehler', exit: 5, grund: 'Leerausgabe: Codex gab nichts aus' };
  return { art: 'fehler', exit: 5, grund: `Antwort unvollständig: die Schlusszeile ENDE fehlt (letzte Zeile: «${letzteZeile(aus)}»)` };
}

// ------------------------------------------------------------------------------------------------
// Funde lesen

/** Entfernt Kommas vor ] oder } ausserhalb von Zeichenketten. */
function entferneKommas(s) {
  let aus = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (inStr) {
      aus += c;
      if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; aus += c; continue; }
    if (c === ',') {
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j += 1;
      if (s[j] === ']' || s[j] === '}') continue;
    }
    aus += c;
  }
  return aus;
}

/** Ende der ausgeglichenen Klammer ab `von` (ein `[`), Zeichenketten beachtet; -1 wenn sie nicht schliesst. */
function ende(text, von) {
  let tiefe = 0;
  let inStr = false;
  let esc = false;
  for (let i = von; i < text.length; i += 1) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '[') tiefe += 1;
    else if (c === ']') { tiefe -= 1; if (tiefe === 0) return i; }
  }
  return -1;
}

/**
 * Zieht die JSON-Liste aus der Antwort (Codeblock oder nackt, Text davor und danach egal). Gilt die LETZTE
 * Liste, die mit `{` oder `]` beginnt: ein Modell nennt gern erst das Schema, dann die Antwort. Misslingt
 * die letzte, ist es ein Fehler und nie «keine Funde».
 */
export function ziehListe(text) {
  const t = String(text);
  const regionen = [];
  const re = /\[\s*(?=[{\]])/g;
  let m = re.exec(t);
  let versuche = 0;
  while (m && versuche < 300) {
    versuche += 1;
    const e = ende(t, m.index);
    if (e === -1) { regionen.push({ ok: false, grund: 'die Liste ist abgeschnitten (Klammer nicht geschlossen)' }); break; }
    const stueck = t.slice(m.index, e + 1);
    let wert;
    try { wert = JSON.parse(stueck); } catch {
      try { wert = JSON.parse(entferneKommas(stueck)); } catch { /* bleibt undefined */ }
    }
    regionen.push(Array.isArray(wert) ? { ok: true, liste: wert } : { ok: false, grund: 'die Liste ist kein gültiges JSON' });
    re.lastIndex = e + 1;
    m = re.exec(t);
  }
  if (regionen.length === 0) return { ok: false, grund: 'keine JSON-Liste in der Antwort gefunden' };
  const letzte = regionen[regionen.length - 1];
  return letzte.ok ? { ok: true, liste: letzte.liste } : { ok: false, grund: letzte.grund };
}

const kurz = (w, n = 80) => String(w).replace(/\s+/g, ' ').slice(0, n);
const text = v => (typeof v === 'string' ? v.trim() : '');

function pruefeFund(el, dateien, nr) {
  const luecken = [];
  const fund = { nr, status: 'ausgewertet', hinweis: HINWEIS };
  if (!el || typeof el !== 'object' || Array.isArray(el)) {
    return { ...fund, status: 'unvollstaendig', titel: '', luecken: [`kein Objekt (${kurz(JSON.stringify(el) ?? String(el), 40)})`] };
  }
  fund.titel = text(el.titel);
  if (!fund.titel) luecken.push('titel fehlt');
  const schwere = text(el.schwere).toLowerCase();
  fund.schwere = schwere;
  if (!SCHWEREN.includes(schwere)) luecken.push(schwere ? `schwere «${kurz(schwere, 20)}» ist weder wichtig noch klein` : 'schwere fehlt');
  let roh = text(el.datei).replace(/^\.\//, '');
  const imSandkasten = /\/zweitmeinung-sandkasten-[^/]+\/(.+)$/.exec(roh);
  if (imSandkasten) roh = imSandkasten[1];
  fund.datei = roh;
  let dateiZeilen;
  if (!roh) luecken.push('datei fehlt');
  else if (dateien) {
    const gesendet = dateien.find(d => d.rel === roh);
    if (!gesendet) luecken.push('datei steht nicht in der Dateiliste');
    else { fund.datei = gesendet.rel; dateiZeilen = gesendet.zeilen; }
  }
  const z = Number.isInteger(el.zeile) ? el.zeile : (typeof el.zeile === 'string' && /^\d{1,7}$/.test(el.zeile.trim()) ? Number(el.zeile) : NaN);
  fund.zeile = Number.isInteger(z) ? z : null;
  if (!Number.isInteger(z) || z < 1) luecken.push('zeile fehlt oder ist keine Zahl ab 1');
  else if (dateiZeilen !== undefined && z > dateiZeilen) luecken.push(`zeile ${z} liegt hinter dem Dateiende (${dateiZeilen} Zeilen)`);
  fund.fehlerfall = text(el.fehlerfall);
  if (!fund.fehlerfall) luecken.push('fehlerfall fehlt');
  fund.beleg = text(el.beleg);
  if (!fund.beleg) luecken.push('beleg (Reproduktion) fehlt');
  if (el.unklar === false || el.unklar === true) fund.unklar = el.unklar;
  else if (typeof el.unklar === 'string') fund.unklar = el.unklar.trim() === '' ? false : el.unklar.trim();
  else { fund.unklar = false; luecken.push('unklar fehlt'); }
  if (luecken.length) { fund.status = 'unvollstaendig'; fund.luecken = luecken; }
  return fund;
}

/**
 * Liest die Funde aus einer vollständigen Antwort. Zählt gegen: gelesen = ausgewertet + unvollständig, und zählt
 * im Rohtext die «titel»-Felder unabhängig nach (ein Parser, der Funde verliert, fällt so auf).
 * `dateien` (optional): `[{ rel, zeilen }]` der gesendeten Dateien; ein Fund ausserhalb davon ist unvollständig.
 */
export function leseFunde(antwort, { dateien } = {}) {
  const gezogen = ziehListe(antwort);
  if (!gezogen.ok) return { ok: false, grund: gezogen.grund, funde: [], zaehlung: null };
  const funde = gezogen.liste.map((el, i) => pruefeFund(el, dateien, i + 1));
  const ausgewertet = funde.filter(f => f.status === 'ausgewertet').length;
  const unvollstaendig = funde.filter(f => f.status === 'unvollstaendig').length;
  const gelesen = gezogen.liste.length;
  const rohtitel = (String(antwort).match(/"titel"\s*:/g) ?? []).length;
  return {
    ok: true,
    funde,
    zaehlung: { gelesen, ausgewertet, unvollstaendig, rohtitel, stimmt: gelesen === ausgewertet + unvollstaendig, abweichung: rohtitel !== gelesen },
  };
}

/** Der Bericht für den Menschen. Wichtige zuerst, dann kleine, dann unvollständige. */
export function baueBericht({ funde, zaehlung, modell, aufwand, dateien, ausgabeDatei, fundeDatei }) {
  const z = zaehlung;
  const rang = f => (f.status === 'unvollstaendig' ? 2 : f.schwere === 'wichtig' ? 0 : 1);
  const sortiert = [...funde].sort((a, b) => rang(a) - rang(b) || a.nr - b.nr);
  const aus = [
    `Zweitmeinung (${modell}, Aufwand ${aufwand}) zu ${dateien.length} Datei(en)`,
    `Funde: ${z.gelesen} gelesen = ${z.ausgewertet} ausgewertet + ${z.unvollstaendig} unvollständig${z.stimmt ? '' : '   <- ZAHLEN STIMMEN NICHT'}`,
    z.abweichung
      ? `Warnung: im Rohtext stehen ${z.rohtitel} «titel»-Felder, gelesen wurden ${z.gelesen}. Antwortdatei von Hand prüfen.`
      : `Gegenzählung im Rohtext: ${z.rohtitel} «titel»-Felder, stimmt.`,
    `${HINWEIS}.`,
  ];
  if (ausgabeDatei) aus.push(`Antwort: ${ausgabeDatei} (Rechte 0600)`);
  if (fundeDatei) aus.push(`Funde als JSON: ${fundeDatei} (Rechte 0600)`);
  sortiert.forEach((f, i) => {
    aus.push('', `${i + 1}. [${f.status === 'unvollstaendig' ? 'unvollständig' : f.schwere}] ${f.titel || '(ohne Titel)'}`);
    aus.push(`   ${f.datei || '(ohne Datei)'}${f.zeile ? `:${f.zeile}` : ''}`);
    if (f.fehlerfall) aus.push(`   Fehlerfall: ${f.fehlerfall}`);
    if (f.beleg) aus.push(`   Beleg: ${f.beleg}`);
    if (f.unklar) aus.push(`   Unklar: ${f.unklar === true ? 'ja (ohne Begründung)' : f.unklar}`);
    if (f.luecken) aus.push(`   Lücken: ${f.luecken.join('; ')}`);
    aus.push(`   Hinweis: ${f.hinweis}`);
  });
  return aus.join('\n');
}
