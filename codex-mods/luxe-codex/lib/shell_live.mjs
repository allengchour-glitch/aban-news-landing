/**
 * «LIVE=1» in Shell-Befehlen erkennen (für den Schreibzähler): läuft dieser Text einen Befehl mit der Umgebungsvariablen
 * LIVE=1, und lässt der Exit-Code der ganzen Zeile den Erfolg DIESES Befehls beweisen? Kein Zustand, kein Netz, keine Shell:
 * ein kleiner, linearer Zerleger (Anführungszeichen, Escapes, Kommentare, Heredocs, $(…) und Backticks, Umleitungen) und ein
 * Deuter, der die Umgebung wie bash verfolgt (Zuweisungen vor dem Befehl, export/unset, env, Wrapper wie timeout/nohup,
 * sh -c, eval, Heredoc als Skript einer Shell). Gemessen, nicht aus dem Gedächtnis geschrieben: test/schreibzaehler_test.mjs
 * lässt 70 Befehle (und 655 davon abgeleitete Zeilen mit Pipes, «||», «;», Präfixen) in echter bash laufen, mit einem
 * Attrappen-`node`, das $LIVE ausgibt und mit vorgegebenem Exit-Code endet; beim Bau lief dasselbe mit 14 000 erzeugten Befehlen
 * ohne Abweichung. Nicht gemessen: sudo und doas (hier nicht installiert), zsh, dash, ksh (gleiche Regeln angenommen).
 *
 * Zwei Fragen, zwei Antworten (`analysiere`):
 *  - live: erreicht LIVE=1 irgendeinen Befehl? Maskiertes (\LIVE=1), Zitate, Heredoc-Körper, Kommentare und Argumente zählen
 *    nicht; `export LIVE=1` allein, ein später überschriebenes oder entferntes LIVE und Befehle, die LIVE nie lesen (echo,
 *    printf, cd …), auch nicht.
 *  - beweisbar: beweist ein Exit-Code 0 der ganzen Zeile den Erfolg des LIVE-Befehls? NICHT, wenn dahinter eine Pipe steht
 *    (ohne pipefail), ein «||», ein weiterer Befehl nach «;» oder Zeilenende, wenn der Befehl in einer Schleife oder in
 *    einer Befehlsersetzung $(…) steckt. Ein Hintergrundstart («… &») zählt als gestartet. Was nicht beweisbar ist, zählt
 *    der Schreibzähler nicht (wie jede unbekannte Antwortform).
 *
 * Bekannte Grenzen: `set -e` wird nicht ausgewertet (ein «;» maskiert dann zu Unrecht), Heredoc-Körper ohne Anführungszeichen
 * am Begrenzer werden nicht auf $(…) durchsucht, Funktionen, Aliasse, `source` und `xargs` sind unsichtbar.
 */

// Wörter, nach denen noch die Zuweisungen und der eigentliche Befehl kommen.
const RESERVIERT = new Set(['if', 'then', 'else', 'elif', 'do', 'while', 'until', '!', '{', 'time']);
const SCHLEIFEN = new Set(['for', 'while', 'until', 'select']);
const SCHLIESSER = new Set(['done', 'fi', 'esac', '}']);
// Befehle, die LIVE nie lesen: «LIVE=1 echo …» ist kein Live-Lauf.
// Dazu die üblichen Filter hinter einer Pipe («export LIVE=1; node x.mjs | tail»): sie tragen LIVE zwar in der Umgebung, schreiben aber nichts.
const KEIN_LESER = new Set(['echo', 'printf', 'true', 'false', ':', 'pwd', 'cd', 'ls', 'cat', 'sleep', 'test', '[',
  'tail', 'head', 'tee', 'grep', 'egrep', 'fgrep', 'sed', 'awk', 'sort', 'uniq', 'wc', 'cut', 'tr', 'less', 'more', 'jq', 'fold', 'column']);
const SHELL = /^(?:ba|z|da|k)?sh$/;
const TRENN_ZEICHEN = /[\s;&|()<>]/;
const MAX_UNTER = 3; // Tiefe verschachtelter $(…) beim Zerlegen

const basis = w => w.replace(/^.*\//, '');

// ---------------------------------------------------------------------------------------------------------------
// Zerlegen
// ---------------------------------------------------------------------------------------------------------------

function neuerAbschnitt() {
  return { woerter: [], danach: [], unter: [], heredocs: [] };
}

/** Index der schliessenden Klammer zu einem «$(» (von = Index nach der Klammer); -1, wenn sie fehlt. */
function findeKlammerEnde(text, von) {
  let tiefe = 1;
  for (let i = von; i < text.length; i += 1) {
    const c = text[i];
    if (c === '\\') { i += 1; continue; }
    if (c === "'") { const e = text.indexOf("'", i + 1); if (e === -1) return -1; i = e; continue; }
    if (c === '"') { for (i += 1; i < text.length && text[i] !== '"'; i += 1) if (text[i] === '\\') i += 1; continue; }
    if (c === '(') tiefe += 1;
    else if (c === ')') { tiefe -= 1; if (tiefe === 0) return i; }
  }
  return -1;
}

/**
 * Zerlegt einen Shell-Text in Befehlsabschnitte {woerter, danach, unter, heredocs}:
 *  - woerter: {wert, zuweisung, name, gequotet}; eine Zuweisung ist ein unzitierter Name, ein «=» und der Rest.
 *  - danach: die Operatoren hinter dem Abschnitt (; \n && || | |& & ( )), in der Reihenfolge.
 *  - unter: die Skripte aus $(…) und Backticks in diesem Abschnitt (auch in Anführungszeichen).
 *  - heredocs: die Körper der Heredocs (<<WORT), die an diesem Abschnitt hängen.
 * Linear in der Länge: Heredoc-Körper werden zeilenweise übersprungen, nie per Rückwärtssuche.
 */
export function zerlege(befehl, tiefe = 0) {
  const text = String(befehl ?? '');
  const laenge = text.length;
  const abschnitte = [];
  let akt = neuerAbschnitt();
  let wort = null;
  let modus = 'n';
  const wartend = []; // Heredocs, deren Körper nach dem nächsten Zeilenende beginnt

  const fuege = (c, q) => {
    wort ??= { wert: '', zuweisung: false, name: true, gequotet: false };
    if (q) wort.gequotet = true;
    if (wort.name) {
      if (!q && c === '=' && wort.wert.length > 0) { wort.zuweisung = true; wort.name = false; }
      else if (q || !/[A-Za-z0-9_]/.test(c) || (wort.wert.length === 0 && /[0-9]/.test(c))) wort.name = false;
    }
    wort.wert += c;
  };
  const schliesse = () => { if (wort) { akt.woerter.push(wort); wort = null; } };
  const trenne = op => {
    schliesse();
    if (akt.woerter.length > 0) { abschnitte.push(akt); akt = neuerAbschnitt(); }
    abschnitte.at(-1)?.danach.push(op);
  };

  // $(…) und `…`: der Inhalt ist ein eigenes Skript; im Wort bleibt ein Platzhalter. Rückgabe: Index der schliessenden Klammer.
  const unterKlammer = (i, q) => {
    const ende = findeKlammerEnde(text, i + 2);
    const bis = ende === -1 ? laenge : ende;
    if (text[i + 2] !== '(' && tiefe < MAX_UNTER) akt.unter.push(zerlege(text.slice(i + 2, bis), tiefe + 1)); // $(( … )) ist Rechnen
    fuege('$', q);
    return bis;
  };
  const unterApostroph = (i, q) => {
    let e = i + 1;
    while (e < laenge && text[e] !== '`') { if (text[e] === '\\') e += 1; e += 1; }
    const bis = Math.min(e, laenge);
    if (tiefe < MAX_UNTER) akt.unter.push(zerlege(text.slice(i + 1, bis).replace(/\\`/g, '`'), tiefe + 1));
    fuege('`', q);
    return bis;
  };

  // Umleitung (>, >>, <, 2>&1, &>, >|): bleibt im Wort, damit «2>&1» ein Wort ist und keinen Operator auslöst.
  const umleitung = i => {
    let j = i;
    if (text[j] === '&') j += 1;
    const start = j;
    while (j < laenge && (text[j] === '<' || text[j] === '>')) j += 1;
    if (text[j] === '&') { j += 1; while (j < laenge && /[0-9-]/.test(text[j])) j += 1; }
    else if (text[j] === '|' && j > start && text[j - 1] === '>') j += 1;
    for (let k = i; k < j; k += 1) fuege(text[k], false);
    return j - 1;
  };

  // Heredoc-Kopf «<<[-]WORT»: merkt den Begrenzer; der Körper beginnt nach dem nächsten Zeilenende. Der Rest der Zeile bleibt Befehl.
  const heredocKopf = i => {
    let j = i + 2;
    let strip = false;
    if (text[j] === '-') { strip = true; j += 1; }
    while (text[j] === ' ' || text[j] === '\t') j += 1;
    let trenner = '';
    while (j < laenge) {
      const d = text[j];
      if (d === "'") { const e = text.indexOf("'", j + 1); if (e === -1) { trenner += text.slice(j + 1); j = laenge; break; } trenner += text.slice(j + 1, e); j = e + 1; continue; }
      if (d === '"') { let e = j + 1; while (e < laenge && text[e] !== '"') { if (text[e] === '\\' && e + 1 < laenge) e += 1; trenner += text[e]; e += 1; } j = e + 1; continue; }
      if (d === '\\') { if (j + 1 < laenge) trenner += text[j + 1]; j += 2; continue; }
      if (TRENN_ZEICHEN.test(d)) break;
      trenner += d;
      j += 1;
    }
    schliesse();
    if (trenner !== '') wartend.push({ trenner, strip, ziel: akt });
    return Math.min(j, laenge) - 1;
  };

  // Körper aller wartenden Heredocs ab `start` lesen (bis die Zeile genau dem Begrenzer entspricht, sonst bis zum Ende). Rückgabe: neue Lesestelle.
  const liesHeredocs = start => {
    let pos = start;
    for (const h of wartend) {
      const zeilen = [];
      while (pos < laenge) {
        const e = text.indexOf('\n', pos);
        let zeile = text.slice(pos, e === -1 ? laenge : e);
        pos = e === -1 ? laenge : e + 1;
        if (zeile.endsWith('\r')) zeile = zeile.slice(0, -1);
        if ((h.strip ? zeile.replace(/^\t+/, '') : zeile) === h.trenner) break;
        zeilen.push(zeile);
      }
      h.ziel.heredocs.push(zeilen.join('\n'));
    }
    wartend.length = 0;
    return pos;
  };

  for (let i = 0; i < laenge; i += 1) {
    const c = text[i];
    if (modus === "'") { if (c === "'") modus = 'n'; else fuege(c, true); continue; }
    if (modus === '"') {
      if (c === '"') modus = 'n';
      else if (c === '\\' && i + 1 < laenge) fuege(text[++i], true);
      else if (c === '$' && text[i + 1] === '(') i = unterKlammer(i, true);
      else if (c === '`') i = unterApostroph(i, true);
      else fuege(c, true);
      continue;
    }
    if (c === "'" || c === '"') { modus = c; fuege('', true); continue; } // öffnendes Zitat: auch ein leeres «""» ist ein Wort
    if (c === '\\') {
      if (text[i + 1] === '\n') { i += 1; continue; }
      if (i + 1 < laenge) fuege(text[++i], true);
      continue;
    }
    if (c === '#' && !wort) { const e = text.indexOf('\n', i); if (e === -1) break; i = e - 1; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { schliesse(); continue; }
    if (c === '\n') { trenne('\n'); if (wartend.length > 0) i = liesHeredocs(i + 1) - 1; continue; }
    if (c === ';') { trenne(';'); if (text[i + 1] === ';') i += 1; continue; }
    if (c === '&') {
      if (text[i + 1] === '&') { trenne('&&'); i += 1; } else if (text[i + 1] === '>') i = umleitung(i); else trenne('&');
      continue;
    }
    if (c === '|') {
      if (text[i + 1] === '|') { trenne('||'); i += 1; } else if (text[i + 1] === '&') { trenne('|&'); i += 1; } else trenne('|');
      continue;
    }
    if (c === '(' || c === ')') { trenne(c); continue; }
    if (c === '`') { i = unterApostroph(i, false); continue; }
    if (c === '$' && text[i + 1] === '(') { i = unterKlammer(i, false); continue; }
    if (c === '<' && text[i + 1] === '<' && text[i + 2] !== '<') { i = heredocKopf(i); continue; }
    if (c === '<' || c === '>') { i = umleitung(i); continue; }
    fuege(c, false);
  }
  schliesse();
  if (akt.woerter.length > 0) abschnitte.push(akt);
  return abschnitte;
}

// ---------------------------------------------------------------------------------------------------------------
// Shell-Optionen: wo steht das Skript hinter «bash … -c»?
// ---------------------------------------------------------------------------------------------------------------

/**
 * Liest die Optionen hinter einem Shell-Namen (werte = die Wörter danach). Gibt zurück:
 *  index: Stelle des -c-Skripts in `werte` (-1: keins), einfach: nur einfache Optionen davor (kein -o/-O/--lang),
 *  pipefail: «-o pipefail» gesetzt, operand: ein Skriptdatei-Operand, stdin: «-s» oder «-» (Skript kommt von stdin).
 */
export function shellOptionen(werte) {
  const r = { index: -1, einfach: true, pipefail: false, operand: false, stdin: false };
  for (let j = 0; j < werte.length; j += 1) {
    const w = werte[j];
    if (w === '--') { r.operand = j + 1 < werte.length; return r; }
    if (/^-[a-zA-Z]*c[a-zA-Z]*$/.test(w)) { r.index = j + 1 < werte.length ? j + 1 : -1; return r; }
    if (w === '-' || w === '-s') { r.stdin = true; continue; }
    if (/^[-+][a-zA-Z]+$/.test(w)) {
      if (/[oO]$/.test(w)) { // «-o NAME», «-euo NAME», «-O OPT»: die Option nimmt das nächste Wort als Argument
        r.einfach = false;
        if (w[0] === '-' && w.endsWith('o') && werte[j + 1] === 'pipefail') r.pipefail = true;
        j += 1;
      }
      continue;
    }
    if (w.startsWith('--')) { r.einfach = false; if (w === '--rcfile' || w === '--init-file') j += 1; continue; }
    r.operand = true; // eine Skriptdatei: ab hier sind es ihre Argumente
    return r;
  }
  return r;
}

// ---------------------------------------------------------------------------------------------------------------
// Deuten
// ---------------------------------------------------------------------------------------------------------------

const START = Object.freeze({ gesetzt: false, wert: '', exportiert: false });
const KEIN = Object.freeze({ live: false, beweisbar: false });

const istUmleitung = w => !w.gequotet && /^(?:\d*[<>]|&>)/.test(w.wert);
const nurOperator = w => /^(?:\d*(?:>>?|<|<<<|>\||<>|>&|<&)|&>>?)$/.test(w.wert);

// Wrapper vor dem eigentlichen Befehl: Optionen mit Argument und die Zahl fester Operanden (timeout: die Dauer).
const UMHUELLUNG = {
  timeout: { mitArg: ['-s', '-k', '--signal', '--kill-after'], positional: 1 },
  nohup: {},
  setsid: {},
  builtin: {},
  nice: { mitArg: ['-n', '--adjustment'] },
  ionice: { mitArg: ['-c', '-n', '-p', '-P', '-u', '--class', '--classdata'] },
  stdbuf: { mitArg: ['-i', '-o', '-e'] },
  sudo: { mitArg: ['-u', '-g', '-h', '-p', '-C', '-T', '-U', '-r', '-t', '-D', '-R'] },
  doas: { mitArg: ['-u', '-C'] },
  exec: { mitArg: ['-a'], loescht: '-c' },
  command: { keinBefehl: ['-v', '-V'] },
};

function ueberspringe(w, start, { mitArg = [], positional = 0 } = {}) {
  let c = start;
  while (c < w.length) {
    const v = w[c].gequotet ? '' : w[c].wert;
    if (v === '--') { c += 1; break; }
    if (v.length > 1 && v.startsWith('-')) { c += mitArg.includes(v) ? 2 : 1; continue; }
    break;
  }
  return Math.min(c + positional, w.length);
}

/** Der Aufruf `env …`: Optionen, Zuweisungen; Rückgabe: Stelle des Befehls und der neue Wert von LIVE für ihn. */
function deuteEnv(w, start, eff) {
  let c = start;
  while (c < w.length) {
    const x = w[c];
    const v = x.wert;
    if (!x.gequotet && v === '--') { c += 1; break; }
    if (!x.gequotet && (v === '-i' || v === '-' || v === '--ignore-environment')) { eff = undefined; c += 1; continue; }
    if (!x.gequotet && (v === '-u' || v === '--unset')) { if (w[c + 1]?.wert === 'LIVE') eff = undefined; c += 2; continue; }
    if (!x.gequotet && /^(?:-u|--unset=)/.test(v)) { if (v.replace(/^(?:-u|--unset=)/, '') === 'LIVE') eff = undefined; c += 1; continue; }
    if (!x.gequotet && (v === '-C' || v === '--chdir' || v === '-S' || v === '--split-string' || v === '-P' || v === '--path')) { c += 2; continue; }
    if (!x.gequotet && v.startsWith('-') && v.length > 1) { c += 1; continue; }
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(v)) { if (v.startsWith('LIVE=')) eff = v.slice(5); c += 1; continue; }
    break;
  }
  return { c, eff };
}

/**
 * Deutet einen Abschnitt. `z` ist der Zustand der Variablen LIVE in der laufenden Shell (wird verändert: export, unset,
 * Zuweisung ohne Befehl). Rückgabe: {live, beweisbar} für diesen Abschnitt (beweisbar nur durch den Abschnitt selbst, ohne Umfeld).
 */
function deuteAbschnitt(a, z, tiefe, pipefail) {
  const w = a.woerter;
  let i = 0;
  const zuw = [];
  for (; i < w.length; i += 1) {
    const x = w[i];
    if (!x.gequotet && RESERVIERT.has(x.wert)) continue;
    if (x.zuweisung) { zuw.push(x.wert); continue; }
    if (istUmleitung(x)) { if (nurOperator(x)) i += 1; continue; }
    break;
  }
  const live = zuw.filter(s => s.startsWith('LIVE='));
  let eff = z.gesetzt && z.exportiert ? z.wert : undefined;
  for (const s of live) eff = s.slice(5);
  if (i >= w.length) { // nur Zuweisungen: eine Shell-Variable, an keinen Befehl weitergegeben
    for (const s of live) { z.gesetzt = true; z.wert = s.slice(5); }
    return KEIN;
  }

  let c = i;
  let nested = null;
  let name = '';
  for (let schritt = 0; schritt < 10; schritt += 1) {
    const cw = w[c];
    if (!cw) return KEIN; // nach env/Wrapper bleibt kein Befehl («env LIVE=1» druckt nur)
    name = cw.gequotet ? cw.wert : basis(cw.wert);
    if (cw.gequotet) break;
    if (cw.wert === 'export') {
      let ab = false;
      for (const x of w.slice(c + 1)) {
        if (x.wert === '-n') ab = true;
        else if (x.zuweisung && x.wert.startsWith('LIVE=')) { z.gesetzt = true; z.wert = x.wert.slice(5); z.exportiert = !ab; }
        else if (x.wert === 'LIVE') z.exportiert = !ab;
      }
      return KEIN;
    }
    if (cw.wert === 'unset') {
      if (w.slice(c + 1).some(x => x.wert === 'LIVE')) { z.gesetzt = false; z.exportiert = false; }
      return KEIN;
    }
    if (name === 'env') { const r = deuteEnv(w, c + 1, eff); c = r.c; eff = r.eff; continue; }
    const u = UMHUELLUNG[name];
    if (u) {
      const naechster = ueberspringe(w, c + 1, u);
      const optionen = w.slice(c + 1, naechster).map(x => x.wert);
      if (u.keinBefehl?.some(o => optionen.includes(o))) return KEIN;
      if (u.loescht && optionen.includes(u.loescht)) eff = undefined;
      c = naechster;
      continue;
    }
    if (SHELL.test(name)) {
      if (tiefe < 2) {
        const r = shellOptionen(w.slice(c + 1).map(x => x.wert));
        const start = eff === undefined ? START : { gesetzt: true, wert: eff, exportiert: true };
        const nach = r.pipefail || pipefail;
        const skripte = r.index !== -1 ? [w[c + 1 + r.index].wert] : (!r.operand || r.stdin ? a.heredocs : []);
        const ergebnisse = skripte.map(t => analysiere(t, { tiefe: tiefe + 1, zustand: start, pipefail: nach }));
        nested = { live: ergebnisse.some(e => e.live), beweisbar: ergebnisse.some(e => e.beweisbar) };
      }
      break;
    }
    if (name === 'eval') {
      if (tiefe < 2) {
        const start = eff === undefined ? START : { gesetzt: true, wert: eff, exportiert: true };
        nested = analysiere(w.slice(c + 1).map(x => x.wert).join(' '), { tiefe: tiefe + 1, zustand: start, pipefail });
      }
      break;
    }
    break;
  }
  const direkt = eff === '1' && !KEIN_LESER.has(name);
  return { live: direkt || Boolean(nested?.live), beweisbar: direkt || Boolean(nested?.beweisbar) };
}

/** «set -o pipefail» (auch «set -euo pipefail»): ab hier gilt der Exit-Code des ersten fehlgeschlagenen Gliedes einer Pipe. */
const setztPipefail = a => {
  const w = a.woerter.map(x => x.wert);
  const i = w.indexOf('set');
  return i !== -1 && w.slice(i + 1).some((x, j) => /^-[a-zA-Z]*o$/.test(x) && w[i + 2 + j] === 'pipefail');
};
const istPipe = op => op === '|' || op === '|&';
const nurSchliesser = a => a.woerter.every(x => !x.gequotet && SCHLIESSER.has(x.wert));

/**
 * Verdeckt etwas hinter dem Abschnitt k den Exit-Code der ganzen Zeile? Pipe (ohne pipefail) und «||» ja, «;» oder Zeilenende
 * mit einem weiteren Befehl danach ja; «&&», Klammern und «&» (Hintergrundstart) nein.
 */
function maskiert(abschnitte, k, pipefail) {
  for (let j = k; j < abschnitte.length; j += 1) {
    for (const op of abschnitte[j].danach) {
      if (op === '||') return true;
      if (istPipe(op) && j === k && !pipefail) return true;
      if (op === ';' || op === '\n') return abschnitte.slice(j + 1).some(a => !nurSchliesser(a));
      if (op === '&') return false;
    }
  }
  return false;
}

function deuteAbschnitte(abschnitte, zustand, tiefe, pipefailVon) {
  const z = { ...zustand };
  const pipefail = pipefailVon || abschnitte.some(setztPipefail);
  let schleife = 0;
  let live = false;
  let beweisbar = false;
  abschnitte.forEach((a, k) => {
    const erstes = a.woerter[0];
    const ersterWert = erstes && !erstes.gequotet ? erstes.wert : '';
    if (SCHLEIFEN.has(ersterWert)) schleife += 1;
    // Jedes Glied einer Pipe läuft in einer eigenen Unter-Shell: ein export, unset oder eine Zuweisung dort gilt nicht für die Zeilen danach.
    const inPipe = a.danach.some(istPipe) || abschnitte[k - 1]?.danach.some(istPipe);
    const r = deuteAbschnitt(a, inPipe ? { ...z } : z, tiefe, pipefail);
    // Befehlsersetzungen laufen in einer Unter-Shell mit dem Stand von jetzt; ihr Erfolg beweist nichts für die Zeile.
    for (const u of a.unter) if (deuteAbschnitte(u, z, tiefe, pipefail).live) live = true;
    if (r.live) {
      live = true;
      if (r.beweisbar && schleife === 0 && !maskiert(abschnitte, k, pipefail)) beweisbar = true;
    }
    if (ersterWert === 'done') schleife = Math.max(0, schleife - 1);
  });
  return { live, beweisbar };
}

/**
 * Analyse eines Shell-Textes: { live, beweisbar } (siehe Kopf der Datei).
 * Optionen: tiefe (Verschachtelung von sh -c / eval), zustand (LIVE in der umgebenden Umgebung), pipefail (von aussen gesetzt).
 */
export function analysiere(befehl, { tiefe = 0, zustand = START, pipefail = false } = {}) {
  if (tiefe > 2) return KEIN;
  return deuteAbschnitte(zerlege(befehl), zustand, tiefe, pipefail);
}

/** Läuft dieser Shell-Text mit LIVE=1 vor einem Befehl (oder per export)? Zitate, Heredoc-Körper, Kommentare und Argumente zählen nicht. */
export function istLiveBefehl(befehl, tiefe = 0) {
  return analysiere(befehl, { tiefe }).live;
}
