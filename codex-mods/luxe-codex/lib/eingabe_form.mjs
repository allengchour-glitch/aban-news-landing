/**
 * Form statt Name: zieht aus dem `tool_input` eines Codex-Werkzeugs das, was die Leitplanken prüfen.
 *
 * Welche Namen Codex an Hooks meldet, ist NICHT bestätigt (Kandidaten: exec_command, shell, local_shell,
 * Bash, apply_patch, exec, mcp__<server>__<werkzeug>). Darum entscheidet diese Datei an der FORM:
 *   - Shell-Befehl: Feld command/cmd/script als Zeichenkette ODER Liste von Argumenten (auch verschachtelt,
 *     z. B. action.command); `bash -lc "…"` wird ausgepackt, weil der Zerleger (regeln.mjs) den Inhalt der
 *     Anführungszeichen als EIN Wort liest und nicht als Befehl prüft.
 *   - Patch im Codex-Format («*** Begin Patch», «*** Add File: …», «*** Update File: …», «*** Move to: …»):
 *     geprüft werden Zielpfade und nur die HINZUGEFÜGTEN Zeilen («+»); Entferntes («-») und «*** Delete File»
 *     prüft niemand (Löschen ist erlaubt).
 *   - Datei-Schreibeingabe: Pfad + Inhalt in demselben Objekt (file_path/path + content/new_string/text …);
 *     `old_string` wird nie geprüft. Ein Pfad ohne Inhalt ist lesend oder unklar und wird nicht geprüft.
 *   - JavaScript des Code-Modus (Werkzeug «exec»): die Befehle stecken als Zeichenketten-Literale in
 *     `tools.exec_command({cmd: "…"})`; sie werden aus dem Quelltext gelesen (Anführungszeichen, Template,
 *     `+`-Ketten, Listen, Variablen samt Neuzuweisung, `for…of`-Schleifen und `.map`/`.forEach` über Listen,
 *     Regex-Literale), nicht der Quelltext selbst als Shell-Befehl geprüft.
 *   - Skripte, die einer Shell über Heredoc, Here-String oder Pipe (`echo '…' | sh`) zugeführt werden, gelten wie `bash -c`.
 *   - Alles andere ist «unbekannt»: durchlassen, kein Fehlalarm (der Aufrufer schreibt es mit
 *     LUXE_CODEX_LERNEN=1 ins Lernprotokoll).
 * Grenzen: Befehle, die erst zur Laufzeit zusammengesetzt werden (Variablen aus Funktionen, `$(…)` in
 * Anführungszeichen, `echo "…" > datei` mit Geheimnis), sieht eine Zeichenkettenprüfung nicht. Eine Leitplanke
 * ist eine Gedächtnisstütze.
 */
import { analysiere, basis, erbeText, SHELLS } from './regeln.mjs';
import { liesJson } from './hook_io.mjs';

// ---------------------------------------------------------------- Schlüsselwörter der Formen
// 'chars': Text, den ein Werkzeug in eine laufende Shell tippt (write_stdin); Name aus der Erinnerung an die Codex-Quellen, UNBESTÄTIGT.
const BEFEHL = new Set(['command', 'cmd', 'script', 'argv', 'command_line', 'commandline', 'shell_command', 'chars']);
const PFAD = new Set(['file_path', 'filepath', 'path', 'file', 'filename', 'file_name', 'target_file', 'target_path', 'new_path', 'output_path', 'destination', 'dest', 'target']);
const INHALT = new Set(['content', 'contents', 'file_text', 'file_content', 'new_string', 'new_str', 'new_text', 'new_content', 'text', 'replacement', 'insert_text']);
const ALT = new Set(['old_string', 'old_str', 'old_text', 'old_content']);
const EINGABE = new Set(['input', 'code', 'source', 'js', 'javascript', 'patch', 'diff', 'program']);

const MARKER_PATCH = /^\*\*\* Begin Patch[ \t]*$/m;
const hatPatch = s => MARKER_PATCH.test(s);
const istReinerPatch = s => /^\s*\*\*\* Begin Patch[ \t]*(?:\r?\n|$)/.test(s);
const JS_FORM = /\b(?:tools|codex)\s*(?:\.\s*[A-Za-z_$][\w$]*\s*\(|\[)|\bexec_command\s*\(|\bapply_patch\s*\(|\bawait\s+[\w$.]+\s*\(|\b(?:spawn|spawnSync|execSync|execFile|execFileSync|writeFileSync|writeFile|appendFile|appendFileSync|copyFileSync|copyFile|cpSync|renameSync|symlinkSync|linkSync|openSync|createWriteStream|truncateSync)\s*\(/;
// Geprüft wird das Gerüst OHNE Zeichenketten, Regex-Literale und Kommentare (siehe jsGeruest): `grep "await foo(" src` ist ein Shell-Befehl, kein JavaScript.
const siehtAusWieJs = s => JS_FORM.test(jsGeruest(s));

// ---------------------------------------------------------------- Argumentliste → Befehlszeile
function zitiere(a) {
  if (a === '') return "''";
  if (/^[\w@%+=:,./*~-]+$/.test(a)) return a;
  if (!a.includes("'")) return `'${a}'`;
  return `"${a.replace(/[\\"$`]/g, '\\$&')}"`;
}

/** `["git","push","--force"]` → `git push --force`; Argumente mit Leerzeichen/Sonderzeichen werden zitiert,
 *  damit ein Argument wie «git push --force» in einer Commit-Nachricht nicht wie ein Befehl wirkt. */
export function befehlAusListe(liste) {
  return liste.map(x => zitiere(String(x))).join(' ');
}

// ---------------------------------------------------------------- bash -lc "…", Heredoc und Pipe an eine Shell auspacken
const nachEscapes = t => t.replace(/\\([nt\\])/g, (m, c) => (c === 'n' ? '\n' : c === 't' ? '\t' : '\\'));

/** Text, den der Vorgänger in der Pipe ausgibt, soweit er im Befehl steht (`echo '…' | sh`, `cat <<EOF | bash`). */
function pipeText(vor) {
  if (!vor || vor.k < 0) return undefined;
  const args = vor.seg.w.slice(vor.k + 1).map(x => x.v);
  if (vor.name === 'echo') {
    while (args.length > 0 && /^-[neE]+$/.test(args[0])) args.shift();
    return nachEscapes(args.join(' '));
  }
  if (vor.name === 'printf') return nachEscapes(args.filter(a => a !== '--').join('\n'));
  if ((vor.name === 'cat' || vor.name === 'tee') && vor.seg.heredocs.length > 0) return vor.seg.heredocs[vor.seg.heredocs.length - 1].koerper;
  return undefined;
}

/** Skripte, die dieser Teilbefehl an eine Shell gibt: `-c`-Text, `eval`, PowerShell, `cmd /c`, Heredoc, Here-String, Pipe. */
function huellenSkripte(info) {
  const aus = [];
  if (info.k < 0 || info.daten) return aus;
  const w = info.seg.w;
  for (let i = 0; i < w.length; i += 1) {
    if (w[i].offen || w[i].zuw !== undefined) continue;
    const name = basis(w[i].v);
    if (SHELLS.has(name)) {
      let c = -1;
      let stdin = false;
      let datei = false;
      for (let j = i + 1; j < w.length && j < i + 16; j += 1) {
        const t = w[j].v;
        if (/^-[A-Za-z]*c[A-Za-z]*$/.test(t)) { c = j; break; }
        if (t === '-o' || t === '-O' || t === '+O' || t === '--rcfile' || t === '--init-file') { j += 1; continue; }
        if (t === '-' || t === '-s') { stdin = true; continue; }
        if (t.startsWith('-') || t.startsWith('+')) continue;
        datei = !stdin;
        break;
      }
      if (c >= 0) { if (w[c + 1] && !w[c + 1].offen) aus.push(w[c + 1].v); continue; }
      if (datei) continue;
      const h = info.seg.heredocs;
      const text = h.length > 0 ? h[h.length - 1].koerper : info.seg.hier.length > 0 ? info.seg.hier[info.seg.hier.length - 1].v : info.seg.pipeIn ? pipeText(info.vor) : undefined;
      if (typeof text === 'string' && text.trim() !== '') aus.push(text);
    } else if (name === 'powershell' || name === 'pwsh') {
      for (let j = i + 1; j < w.length; j += 1) {
        if (/^-(?:c|command)$/i.test(w[j].v)) { if (w[j + 1]) aus.push(w.slice(j + 1).map(x => x.v).join(' ')); break; }
      }
    } else if (name === 'cmd') {
      for (let j = i + 1; j < w.length; j += 1) {
        if (/^\/[ck]$/i.test(w[j].v)) { if (w[j + 1]) aus.push(w.slice(j + 1).map(x => x.v).join(' ')); break; }
      }
    } else if (name === 'eval' && w[i + 1]) aus.push(w.slice(i + 1).map(x => x.v).join(' '));
  }
  return aus;
}

/**
 * Der Befehl selbst plus jedes Skript, das eine Shell ausführt (`bash -lc "…"`, `sh -c '…'`, `eval "…"`, PowerShell,
 * cmd /c, `bash <<EOF`, `bash <<< '…'`, `echo '…' | sh`), bis zu drei Ebenen.
 * Das umhüllte Skript erbt LIVE=1 und die Auswege des Teilbefehls, der es aufruft.
 */
export function entpacke(befehl, tiefe = 0) {
  const roh = String(befehl ?? '');
  const aus = [roh];
  if (tiefe >= 3) return aus;
  for (const info of analysiere(roh)) {
    const skripte = huellenSkripte(info);
    if (skripte.length === 0) continue;
    const erbe = erbeText(info);
    for (const skript of skripte) for (const x of entpacke(skript, tiefe + 1)) aus.push(erbe ? `${erbe} ${x}` : x);
  }
  return aus;
}

/** Heredoc-Körper, die per `cat`/`tee` in eine Datei geschrieben werden: das ist geschriebener Text. */
export function heredocTexte(befehl) {
  const infos = analysiere(befehl);
  const aus = [];
  infos.forEach((info, idx) => {
    if (info.seg.heredocs.length === 0) return;
    const dateiUmleitung = info.seg.umleit.some(u => ['>', '>>', '>|', '&>', '&>>'].includes(u.op) || (u.op === '>&' && !/^(?:\d+|-)$/.test(u.ziel.v)));
    const schreibt = info.name === 'tee' || (info.name === 'cat' && (dateiUmleitung || (info.seg.pipeOut && infos[idx + 1]?.name === 'tee')));
    if (schreibt) for (const h of info.seg.heredocs) aus.push(h.koerper);
  });
  return aus;
}

// ---------------------------------------------------------------- Patch im Codex-Format
const PATCH_KOPF = /^\*\*\* (Add File|Update File|Delete File|Move to):\s*(.+?)\s*$/;
const ARTEN = { 'Add File': 'neu', 'Update File': 'aendern', 'Delete File': 'loeschen', 'Move to': 'ziel' };

/** Zerlegt einen Patch: je Datei Zielpfad, Art, hinzugefügte Zeilen und sichtbares Umfeld (Kontext + Hinzugefügtes). */
export function liesPatch(text) {
  const dateien = [];
  let akt;
  let drin = false;
  for (const zeile of String(text ?? '').split(/\r?\n/)) {
    if (!drin) { if (/^\*\*\* Begin Patch[ \t]*$/.test(zeile)) drin = true; continue; }
    if (/^\*\*\* End Patch[ \t]*$/.test(zeile)) { drin = false; akt = undefined; continue; }
    const kopf = PATCH_KOPF.exec(zeile);
    if (kopf) {
      const d = { pfad: kopf[2].replace(/^["']|["']$/g, ''), art: ARTEN[kopf[1]], hinzu: [], umfeld: [] };
      dateien.push(d);
      if (d.art !== 'ziel') akt = d;
      continue;
    }
    if (!akt || akt.art === 'loeschen') continue;
    if (zeile.startsWith('+')) { akt.hinzu.push(zeile.slice(1)); akt.umfeld.push(zeile.slice(1)); }
    else if (zeile.startsWith(' ')) akt.umfeld.push(zeile.slice(1));
  }
  return dateien;
}

// ---------------------------------------------------------------- JavaScript des Code-Modus
function leseLiteral(src, start) {
  const q = src[start];
  let j = start + 1;
  let aus = '';
  while (j < src.length) {
    const c = src[j];
    if (c === q) return { wert: aus, ende: j + 1 };
    if (c === '\\') {
      const n = src[j + 1];
      if (n === undefined) break;
      if (n === 'n') aus += '\n';
      else if (n === 't') aus += '\t';
      else if (n === 'r') aus += '\r';
      else if (n === '0') aus += '\0';
      else if (n === 'x' && /^[0-9a-fA-F]{2}$/.test(src.slice(j + 2, j + 4))) { aus += String.fromCharCode(parseInt(src.slice(j + 2, j + 4), 16)); j += 4; continue; }
      else if (n === 'u') {
        const m = /^\{([0-9a-fA-F]+)\}|^([0-9a-fA-F]{4})/.exec(src.slice(j + 2, j + 12));
        if (m) { const cp = parseInt(m[1] ?? m[2], 16); if (cp <= 0x10ffff) aus += String.fromCodePoint(cp); j += 2 + m[0].length; continue; }
        aus += 'u';
      } else if (n !== '\n') aus += n;
      j += 2;
      continue;
    }
    if (q === '`' && c === '$' && src[j + 1] === '{') {
      let tiefe = 1;
      j += 2;
      while (j < src.length && tiefe > 0) { if (src[j] === '{') tiefe += 1; else if (src[j] === '}') tiefe -= 1; j += 1; }
      aus += 'X';
      continue;
    }
    aus += c;
    j += 1;
  }
  return { wert: aus, ende: src.length };
}

const WORT_VOR_REGEX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'instanceof', 'new', 'delete', 'void', 'throw', 'yield', 'await']);
const WORT_VOR_BLOCK = new Set(['if', 'while', 'for', 'with']);

/** Ein Regex-Literal ab `start` (der Schrägstrich): Ende nach den Flags oder -1. Endet nie über die Zeile hinaus; `/` in `[…]` schliesst nicht. */
function leseRegex(src, start) {
  let j = start + 1;
  let klasse = false;
  const grenze = Math.min(src.length, start + 4000);
  while (j < grenze) {
    const c = src[j];
    if (c === '\n') return -1;
    if (c === '\\') { j += 2; continue; }
    if (c === '[') klasse = true;
    else if (c === ']') klasse = false;
    else if (c === '/' && !klasse) {
      j += 1;
      while (j < src.length && /[a-z]/i.test(src[j])) j += 1;
      return j;
    }
    j += 1;
  }
  return -1;
}

/**
 * Grobe Zerlegung: Zeichenketten (' " `), Regex-Literale, Namen/Zahlen und einzelne Zeichen; Kommentare fallen weg. Wirft nie.
 * Ein `/` ist ein Regex-Literal, wo ein Wert beginnen darf (nach `(`, `,`, `=`, `return`, nach `)` eines `if (…)` …), sonst eine Division:
 * sonst finge das `'` in `/'/g` eine Zeichenkette an, die bis zum Programmende läuft, und `//` in `/\//` einen Kommentar.
 */
function lexe(src) {
  const t = [];
  const klammern = [];
  let regexOk = true;
  let i = 0;
  while (i < src.length && t.length < 20000) {
    const c = src[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i += 1; continue; }
    if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? src.length : j + 2; continue; }
    if (c === '"' || c === "'" || c === '`') { const r = leseLiteral(src, i); t.push({ t: 's', v: r.wert }); i = r.ende; regexOk = false; continue; }
    if (c === '/' && regexOk) {
      const e = leseRegex(src, i);
      if (e >= 0) { t.push({ t: 'r', v: src.slice(i, e) }); i = e; regexOk = false; continue; }
    }
    if (/[\w$]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[\w$]/.test(src[j])) j += 1;
      const v = src.slice(i, j);
      t.push({ t: 'i', v });
      regexOk = WORT_VOR_REGEX.has(v);
      i = j;
      continue;
    }
    t.push({ t: 'p', v: c });
    if (c === '(') { const vor = t[t.length - 2]; klammern.push(Boolean(vor && vor.t === 'i' && WORT_VOR_BLOCK.has(vor.v))); regexOk = true; }
    else if (c === ')') regexOk = klammern.pop() ?? false;
    else regexOk = c !== ']';
    i += 1;
  }
  return t;
}

/** Der Quelltext als Gerüst: Zeichenketten als `""`, Regex-Literale als `/r/`, Kommentare weg. */
function jsGeruest(src) {
  let aus = '';
  let vorWort = false;
  for (const x of lexe(String(src ?? ''))) {
    const wort = x.t === 'i';
    const text = x.t === 's' ? '""' : x.t === 'r' ? '/r/' : x.v;
    if (wort && vorWort) aus += ' ';
    aus += text;
    vorWort = wort;
  }
  return aus;
}

const JS_BEFEHL_AUFRUF = new Set(['exec_command', 'shell', 'shell_command', 'local_shell', 'bash', 'exec', 'execsync', 'run_command', 'system']);
const JS_SPAWN_AUFRUF = new Set(['spawn', 'spawnsync', 'execfile', 'execfilesync']);
/** Schreibt an den Pfad im ersten Argument (mit Text im zweiten, wenn es ein Literal ist). */
const JS_SCHREIB_AUFRUF = new Set(['writefilesync', 'writefile', 'appendfilesync', 'appendfile']);
const JS_SCHREIB_NUR_PFAD = new Set(['createwritestream', 'truncatesync', 'truncate']);
/** Legt an der Stelle im ZWEITEN Argument etwas an (Kopie, Umbenennung, Verknüpfung). */
const JS_ZIEL_ZWEITES = new Set(['copyfilesync', 'copyfile', 'cpsync', 'cp', 'renamesync', 'rename', 'symlinksync', 'symlink', 'linksync', 'link']);
const JS_OEFFNEN = new Set(['opensync', 'open']);
const JS_LISTENMETHODEN = new Set(['map', 'foreach', 'flatmap', 'filter', 'some', 'every', 'find', 'findindex', 'reduce']);
const DEKLARATION = new Set(['const', 'let', 'var']);

/**
 * Liest aus JavaScript die Zeichenketten, die als Befehl, Pfad, Inhalt oder Patch dienen:
 * `cmd: "…"`, `command: ["a","b"]`, `exec_command("…")`, `spawn("git", ["push", "-f"])`, `writeFileSync(pfad, text)`,
 * Zeichenketten mit «*** Begin Patch». Unterstützt `+`-Ketten und Variablen (`const x = "…"`, spätere Neuzuweisung: alle
 * bisherigen Werte gelten), `for (const c of liste)` sowie `liste.map(c => …)`/`forEach` über Listenliterale und -variablen.
 */
export function liesJs(quelltext) {
  const t = lexe(String(quelltext ?? ''));
  const aus = { befehle: [], pfade: [], texte: [], patches: [] };
  /** Name → alle bisher zugewiesenen Werte `{ art: 's'|'l'|'i', v }` ('i' = Schleifenelemente: JEDES ist ein eigener Wert). */
  const vars = new Map();
  const istP = (k, v) => t[k]?.t === 'p' && t[k].v === v;
  let schritte = 0;
  const elemente = w => (w.art === 'l' || w.art === 'i' ? w.v : w.art === 's' ? [w.v] : []);

  function wert(k, tiefe = 0) {
    schritte += 1;
    if (schritte > 200000) return undefined;
    const x = t[k];
    if (!x) return undefined;
    if (x.t === 's') {
      let v = x.v;
      let n = k + 1;
      while (istP(n, '+') && t[n + 1]?.t === 's') { v += t[n + 1].v; n += 2; }
      return { art: 's', v, von: k, bis: n };
    }
    if (x.t === 'p' && x.v === '[' && tiefe <= 40) {
      const items = [];
      let n = k + 1;
      let eigene = 0;
      while (n < t.length && !istP(n, ']') && eigene < 300) {
        eigene += 1;
        const w = wert(n, tiefe + 1);
        if (w && w.art === 's') { items.push(w.v); n = w.bis; }
        else if (w && (w.art === 'l' || w.art === 'i')) { items.push(...elemente(w)); n = w.bis; } // verschachtelte Liste: einmal gelesen, dann übersprungen
        else { if (t[n].t === 'i') items.push('X'); n += 1; }
      }
      return { art: 'l', v: items.slice(0, 300), von: k, bis: n + 1 };
    }
    if (x.t === 'i' && tiefe < 3 && vars.has(x.v)) {
      const alle = vars.get(x.v);
      const letzter = alle[alle.length - 1];
      return { art: letzter.art, v: letzter.v, alle, von: k, bis: k + 1 };
    }
    return undefined;
  }
  const merke = (name, w) => {
    const liste = vars.get(name) ?? [];
    if (!liste.some(x => x.art === w.art && JSON.stringify(x.v) === JSON.stringify(w.v))) liste.push({ art: w.art, v: w.v });
    vars.set(name, liste);
  };

  const frames = [{ inhalt: [] }];
  const verbraucht = new Set();
  const verbrauche = w => { for (let q = w.von; q < w.bis; q += 1) verbraucht.add(q); };
  const schliesse = f => {
    if (f.inhalt.length === 0) return;
    aus.texte.push(...f.inhalt);
    if (f.pfad) aus.pfade.push(f.pfad);
  };
  const befehlWert = w => {
    const schon = new Set();
    for (const a of w.alle ?? [w]) {
      const stuecke = a.art === 's' ? [a.v] : a.art === 'l' ? (a.v.length > 0 ? [befehlAusListe(a.v)] : []) : a.art === 'i' ? a.v : [];
      for (const b of stuecke) if (!schon.has(b)) { schon.add(b); aus.befehle.push(b); }
    }
  };

  for (let k = 0; k < t.length; k += 1) {
    const x = t[k];
    if (x.t === 'p' && x.v === '{') { frames.push({ inhalt: [] }); continue; }
    if (x.t === 'p' && x.v === '}') { if (frames.length > 1) schliesse(frames.pop()); continue; }

    if (x.t === 'i' && !DEKLARATION.has(x.v)) {
      // NAME = Wert (Deklaration oder spätere Zuweisung; weder ==, =>, noch Eigenschaft `a.b =`)
      if (istP(k + 1, '=') && !istP(k + 2, '=') && !istP(k + 2, '>') && !istP(k - 1, '.')) {
        const w = wert(k + 2);
        if (w) merke(x.v, w);
      }
      // for (const NAME of LISTE)
      if (x.v === 'for' && istP(k + 1, '(')) {
        let j = k + 2;
        if (t[j]?.t === 'i' && DEKLARATION.has(t[j].v)) j += 1;
        if (t[j]?.t === 'i' && t[j + 1]?.t === 'i' && t[j + 1].v === 'of') {
          const w = wert(j + 2);
          if (w) vars.set(t[j].v, [{ art: 'i', v: elemente(w) }]);
        }
      }
    }
    // LISTE.map(NAME => …), .forEach(function (NAME) {…}), .filter((NAME) => …)
    if (istP(k, '.') && t[k + 1]?.t === 'i' && JS_LISTENMETHODEN.has(t[k + 1].v.toLowerCase()) && istP(k + 2, '(')) {
      let q = k + 3;
      if (t[q]?.t === 'i' && t[q].v === 'async') q += 1;
      let param;
      if (t[q]?.t === 'i' && t[q].v === 'function') {
        q += 1;
        if (t[q]?.t === 'i') q += 1;
        if (istP(q, '(') && t[q + 1]?.t === 'i') param = t[q + 1].v;
      } else if (istP(q, '(') && t[q + 1]?.t === 'i' && (istP(q + 2, ')') || istP(q + 2, ','))) param = t[q + 1].v;
      else if (t[q]?.t === 'i' && istP(q + 1, '=') && istP(q + 2, '>')) param = t[q].v;
      let liste;
      if (istP(k - 1, ']')) {
        let tiefe = 0;
        for (let b = k - 1; b >= 0 && b > k - 600; b -= 1) {
          if (istP(b, ']')) tiefe += 1;
          else if (istP(b, '[')) { tiefe -= 1; if (tiefe === 0) { liste = wert(b); break; } }
        }
      } else if (t[k - 1]?.t === 'i') liste = wert(k - 1);
      if (param && liste) vars.set(param, [{ art: 'i', v: elemente(liste) }]);
    }

    if (x.t === 'i' && istP(k + 1, '(')) {
      const name = x.v.toLowerCase();
      if (JS_BEFEHL_AUFRUF.has(name)) {
        const w = wert(k + 2);
        if (w) { befehlWert(w); verbrauche(w); }
      } else if (JS_SPAWN_AUFRUF.has(name)) {
        const w = wert(k + 2);
        if (w && w.art === 's') {
          const w2 = istP(w.bis, ',') ? wert(w.bis + 1) : undefined;
          aus.befehle.push(w2 && w2.art === 'l' ? befehlAusListe([w.v, ...w2.v]) : w.v);
          verbrauche(w);
        }
      } else if (JS_SCHREIB_AUFRUF.has(name) || JS_SCHREIB_NUR_PFAD.has(name)) {
        // Der Pfad zählt auch, wenn der Inhalt zur Laufzeit entsteht (`new Date().toISOString()`); Text nur als Literal.
        const w = wert(k + 2);
        if (w && w.art === 's') {
          aus.pfade.push(w.v);
          verbrauche(w);
          const w2 = JS_SCHREIB_AUFRUF.has(name) && istP(w.bis, ',') ? wert(w.bis + 1) : undefined;
          if (w2 && w2.art === 's') { aus.texte.push({ text: w2.v, umfeld: '' }); verbrauche(w2); }
        }
      } else if (JS_ZIEL_ZWEITES.has(name)) {
        const w = wert(k + 2);
        const w2 = w && w.art === 's' && istP(w.bis, ',') ? wert(w.bis + 1) : undefined;
        if (w2 && w2.art === 's') aus.pfade.push(w2.v);
      } else if (JS_OEFFNEN.has(name)) {
        const w = wert(k + 2);
        const w2 = w && w.art === 's' && istP(w.bis, ',') ? wert(w.bis + 1) : undefined;
        if (w && w2 && w2.art === 's' && /^[wax]|\+/.test(w2.v)) aus.pfade.push(w.v);
      } else if (name === 'apply_patch') {
        const w = wert(k + 2);
        if (w && w.art === 's' && hatPatch(w.v)) { aus.patches.push(w.v); verbrauche(w); }
      }
      continue;
    }

    const istSchluessel = (x.t === 'i' || x.t === 's') && istP(k + 1, ':');
    const kurzform = x.t === 'i' && (istP(k - 1, '{') || istP(k - 1, ',')) && (istP(k + 1, ',') || istP(k + 1, '}'));
    if (!istSchluessel && !kurzform) continue;
    const schluessel = x.v.toLowerCase();
    const w = istSchluessel ? wert(k + 2) : (vars.has(x.v) ? wert(k) : undefined);
    if (!w) continue;
    if (BEFEHL.has(schluessel)) { befehlWert(w); verbrauche(w); }
    else if (PFAD.has(schluessel) && w.art === 's') frames[frames.length - 1].pfad ??= w.v;
    else if (INHALT.has(schluessel) && w.art === 's') { frames[frames.length - 1].inhalt.push({ text: w.v, umfeld: '' }); verbrauche(w); }
    else if (EINGABE.has(schluessel) && w.art === 's' && hatPatch(w.v)) { aus.patches.push(w.v); verbrauche(w); }
  }
  while (frames.length > 0) schliesse(frames.pop());

  t.forEach((x, k) => { if (x.t === 's' && !verbraucht.has(k) && hatPatch(x.v)) aus.patches.push(x.v); });
  aus.patches = [...new Set(aus.patches)];
  return aus;
}

// ---------------------------------------------------------------- Hauptfunktion
const skalar = x => typeof x === 'string' || typeof x === 'number';

/**
 * Zieht aus `tool_input` (beliebige Form) das Prüfgut:
 *   befehle: Shell-Befehle als Text (jede ausgepackte Hülle als eigener Eintrag),
 *   pfade:   Ziele, die angelegt/geändert/verschoben werden,
 *   texte:   [{ text, umfeld }] hinzugefügte Texte (`umfeld`: sichtbarer Rest der Datei),
 *   formen:  welche Formen erkannt wurden ('befehl', 'befehl-liste', 'patch', 'datei', 'text', 'pfad', 'js'),
 *   bekannt: false = unbekannte Form (durchlassen und lernen).
 */
export function ziehePruefgut(toolInput) {
  const g = { befehle: [], pfade: [], texte: [], formen: new Set() };
  geh(toolInput, '', 0, g);
  return { befehle: g.befehle, pfade: g.pfade, texte: g.texte, formen: [...g.formen], bekannt: g.formen.size > 0 };
}

/** Ein Shell-Befehl: er selbst, jede ausgepackte Hülle, und Heredocs, die in eine Datei geschrieben werden. */
function befehlsText(s, g) {
  for (const e of entpacke(s)) {
    g.befehle.push(e);
    for (const text of heredocTexte(e)) g.texte.push({ text, umfeld: '' });
  }
}

function befehl(s, g) {
  g.formen.add('befehl');
  befehlsText(s, g);
}

function patch(s, g) {
  g.formen.add('patch');
  for (const d of liesPatch(s)) {
    if (d.art === 'loeschen') continue;
    g.pfade.push(d.pfad);
    if (d.hinzu.length > 0) g.texte.push({ text: d.hinzu.join('\n'), umfeld: d.umfeld.join('\n') });
  }
}

function js(s, g) {
  g.formen.add('js');
  const r = liesJs(s);
  for (const b of r.befehle) befehlsText(b, g);
  g.pfade.push(...r.pfade);
  g.texte.push(...r.texte);
  for (const p of r.patches) patch(p, g);
}

/** `art`: 'befehl' (Feld command/cmd/script), 'eingabe' (input/code/patch …), 'wurzel' (tool_input selbst), 'sonst'. */
function zeichenkette(s, art, g, tiefe) {
  if (istReinerPatch(s)) { patch(s, g); return; }
  if (art === 'sonst') return;
  if (siehtAusWieJs(s)) { js(s, g); return; }
  if ((art === 'wurzel' || art === 'eingabe') && /^\s*\{/.test(s)) {
    const w = liesJson(s);
    if (w) { geh(w, '', tiefe + 1, g); return; }
  }
  if (art === 'eingabe') { if (hatPatch(s)) patch(s, g); return; }
  befehl(s, g);
  // Ein Patch, der einem Befehl beiliegt (`apply_patch <<'EOF' …`), zählt nur, wenn `apply_patch` dasteht:
  // eine Datei, die per Heredoc geschrieben wird und Patch-Zeilen NENNT, ist kein Patch.
  if (hatPatch(s) && /\bapply_patch\b/.test(s)) patch(s, g);
}

function geh(wert, schluessel, tiefe, g, elternPfad) {
  if (tiefe > 6) return;
  const art = BEFEHL.has(schluessel) ? 'befehl' : EINGABE.has(schluessel) ? 'eingabe' : schluessel === '' ? 'wurzel' : 'sonst';
  if (typeof wert === 'string') { zeichenkette(wert, art, g, tiefe); return; }
  if (Array.isArray(wert)) {
    if ((art === 'befehl' || art === 'wurzel') && wert.length > 0 && wert.every(skalar)) {
      g.formen.add('befehl-liste');
      befehl(befehlAusListe(wert), g);
      // `["apply_patch", "*** Begin Patch …"]`: das Patch-Argument steckt zitiert in der Befehlszeile, also einzeln lesen.
      for (const x of wert) if (typeof x === 'string' && hatPatch(x)) patch(x, g);
      return;
    }
    for (const x of wert) geh(x, schluessel, tiefe + 1, g, elternPfad);
    return;
  }
  if (!wert || typeof wert !== 'object') return;

  // Ein Objekt: Pfad + Inhalt gehören zusammen (eine Datei); `command` + `args` ist ein Befehl mit Argumenten.
  const mitArgs = typeof wert.command === 'string' && Array.isArray(wert.args) && wert.args.length > 0 && wert.args.every(skalar);
  const inhalt = [];
  // Der Pfad kann ausserhalb stehen (`{ file_path, edits: [{ old_string, new_string }] }`): er gilt dann für die inneren Objekte.
  const eigenerPfad = Object.entries(wert).find(([k, v]) => PFAD.has(k.toLowerCase()) && typeof v === 'string')?.[1];
  const pfad = eigenerPfad ?? elternPfad;
  for (const [k0, v] of Object.entries(wert)) {
    const k = k0.toLowerCase();
    if (ALT.has(k)) continue;
    if (INHALT.has(k)) {
      if (typeof v === 'string') inhalt.push({ text: v, umfeld: '' });
      else if (Array.isArray(v) && v.length > 0 && v.every(x => typeof x === 'string')) inhalt.push({ text: v.join('\n'), umfeld: '' });
      else geh(v, k, tiefe + 1, g, pfad);
      continue;
    }
    if (PFAD.has(k) && typeof v === 'string') continue;
    if (k === 'args' && mitArgs) continue;
    if (k === 'command' && mitArgs) { g.formen.add('befehl-liste'); befehlsText(befehlAusListe([v, ...wert.args]), g); continue; }
    geh(v, k, tiefe + 1, g, pfad);
  }
  if (inhalt.length > 0) {
    g.formen.add(pfad === undefined ? 'text' : 'datei');
    g.texte.push(...inhalt);
    if (pfad !== undefined) g.pfade.push(pfad);
  } else if (pfad !== undefined) {
    g.formen.add('pfad');
  }
}
