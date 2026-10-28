/**
 * Form statt Name: zieht aus dem `tool_input` eines Codex-Werkzeugs das, was die Leitplanken prüfen.
 *
 * Welche Namen Codex an Hooks meldet, ist NICHT bestätigt (Kandidaten: exec_command, shell, local_shell,
 * Bash, apply_patch, exec, mcp__<server>__<werkzeug>). Darum entscheidet diese Datei an der FORM:
 *   - Shell-Befehl: Feld command/cmd/script als Zeichenkette ODER Liste von Argumenten (auch verschachtelt,
 *     z. B. action.command); `bash -lc "…"` wird ausgepackt, weil ohneText() den Inhalt der Anführungszeichen
 *     sonst unsichtbar macht.
 *   - Patch im Codex-Format («*** Begin Patch», «*** Add File: …», «*** Update File: …», «*** Move to: …»):
 *     geprüft werden Zielpfade und nur die HINZUGEFÜGTEN Zeilen («+»); Entferntes («-») und «*** Delete File»
 *     prüft niemand (Löschen ist erlaubt).
 *   - Datei-Schreibeingabe: Pfad + Inhalt in demselben Objekt (file_path/path + content/new_string/text …);
 *     `old_string` wird nie geprüft. Ein Pfad ohne Inhalt ist lesend oder unklar und wird nicht geprüft.
 *   - JavaScript des Code-Modus (Werkzeug «exec»): die Befehle stecken als Zeichenketten-Literale in
 *     `tools.exec_command({cmd: "…"})`; sie werden aus dem Quelltext gelesen (Anführungszeichen, Template,
 *     `+`-Ketten, Listen, einfache Variablen), nicht der Quelltext selbst als Shell-Befehl geprüft.
 *   - Alles andere ist «unbekannt»: durchlassen, kein Fehlalarm (der Aufrufer schreibt es mit
 *     LUXE_CODEX_LERNEN=1 ins Lernprotokoll).
 * Grenzen: Befehle, die erst zur Laufzeit zusammengesetzt werden (Variablen aus Funktionen, `$(…)` in
 * Anführungszeichen, `echo "…" > datei` mit Geheimnis), sieht eine Zeichenkettenprüfung nicht. Eine Leitplanke
 * ist eine Gedächtnisstütze.
 */
import { umgebungsAnteile } from './regeln.mjs';
import { liesJson } from './hook_io.mjs';

// ---------------------------------------------------------------- Schlüsselwörter der Formen
const BEFEHL = new Set(['command', 'cmd', 'script', 'argv', 'command_line', 'commandline', 'shell_command']);
const PFAD = new Set(['file_path', 'filepath', 'path', 'file', 'filename', 'file_name', 'target_file', 'target_path', 'new_path', 'output_path', 'destination', 'dest', 'target']);
const INHALT = new Set(['content', 'contents', 'file_text', 'file_content', 'new_string', 'new_str', 'new_text', 'new_content', 'text', 'replacement', 'insert_text']);
const ALT = new Set(['old_string', 'old_str', 'old_text', 'old_content']);
const EINGABE = new Set(['input', 'code', 'source', 'js', 'javascript', 'patch', 'diff', 'program']);

const MARKER_PATCH = /^\*\*\* Begin Patch[ \t]*$/m;
const hatPatch = s => MARKER_PATCH.test(s);
const istReinerPatch = s => /^\s*\*\*\* Begin Patch[ \t]*(?:\r?\n|$)/.test(s);
const JS_FORM = /\b(?:tools|codex)\s*\.\s*[A-Za-z_$][\w$]*\s*\(|\bexec_command\s*\(|\bapply_patch\s*\(|\bawait\s+[\w$.]+\s*\(|\b(?:spawn|spawnSync|execSync|execFile|execFileSync|writeFileSync|writeFile|appendFile|appendFileSync)\s*\(/;
const siehtAusWieJs = s => JS_FORM.test(s);

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

// ---------------------------------------------------------------- bash -lc "…" auspacken
const HEREDOC = /<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g;
const KOPF = String.raw`(?:^|[\s;&|(])`;
const WRAPPER = new RegExp([
  String.raw`${KOPF}(?:\S*\/)?(?:(?:ba|z|da|k|a)?sh|fish)(?:\s+-[-\w]+)*?\s+-[a-z]*c\s+(?=['"])`,
  String.raw`${KOPF}(?:\S*\/)?(?:powershell|pwsh)(?:\.exe)?(?:\s+-[-\w]+)*?\s+-(?:c|command)\s+(?=['"])`,
  String.raw`${KOPF}(?:\S*\/)?cmd(?:\.exe)?\s+\/[ck]\s+(?=['"])`,
  String.raw`${KOPF}eval\s+(?=['"])`,
].join('|'), 'gi');

/** Maske gleicher Länge: Inhalt von Zitaten, Heredoc-Körpern und Kommentaren ist unsichtbar (\u0001),
 *  die Anführungszeichen bleiben; `spannen` merkt zu jedem öffnenden Zeichen das schliessende. */
function maskiere(s) {
  const t = s.replace(HEREDOC, m => m.replace(/[^\n]/g, '\u0001'));
  let maske = '';
  const spannen = new Map();
  let i = 0;
  while (i < t.length) {
    const c = t[i];
    if (c === '\\') { maske += t.slice(i, i + 2); i += 2; continue; }
    if (c === '#' && (i === 0 || /[\s;&|(]/.test(t[i - 1]))) {
      let j = t.indexOf('\n', i);
      if (j < 0) j = t.length;
      maske += '\u0001'.repeat(j - i);
      i = j;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < t.length && t[j] !== c) j += (c === '"' && t[j] === '\\') ? 2 : 1;
      if (j >= t.length) { maske += c + '\u0001'.repeat(t.length - i - 1); break; }
      spannen.set(i, { ende: j, q: c });
      maske += c + '\u0001'.repeat(j - i - 1) + c;
      i = j + 1;
      continue;
    }
    maske += c;
    i += 1;
  }
  return { maske, spannen };
}

/**
 * Der Befehl selbst plus jedes Skript, das eine Shell aus Anführungszeichen ausführt
 * (`bash -lc "…"`, `sh -c '…'`, `eval "…"`, PowerShell, cmd /c), bis zu drei Ebenen.
 * Das umhüllte Skript erbt LIVE=1 und die Auswege des Aussen-Befehls.
 */
export function entpacke(befehl, tiefe = 0) {
  const roh = String(befehl ?? '');
  const aus = [roh];
  if (tiefe >= 3) return aus;
  const { maske, spannen } = maskiere(roh);
  const erbe = umgebungsAnteile(roh).join(' ');
  for (const m of maske.matchAll(WRAPPER)) {
    const pos = m.index + m[0].length;
    const sp = spannen.get(pos);
    if (!sp) continue;
    let innen = roh.slice(pos + 1, sp.ende);
    if (sp.q === '"') innen = innen.replace(/\\(["\\$`\n])/g, '$1');
    for (const x of entpacke(innen, tiefe + 1)) aus.push(erbe ? `${erbe} ${x}` : x);
  }
  return aus;
}

/** Heredoc-Körper, die per `cat`/`tee` in eine Datei geschrieben werden: das ist geschriebener Text. */
export function heredocTexte(befehl) {
  const s = String(befehl ?? '');
  const aus = [];
  for (const m of s.matchAll(/<<-?\s*(['"]?)(\w+)\1([^\n]*)\n([\s\S]*?)\n\s*\2(?=\s|$)/g)) {
    const kopf = s.slice(s.lastIndexOf('\n', m.index - 1) + 1, m.index) + m[3];
    const schreibt = /\btee\b/.test(kopf) || (/\bcat\b/.test(kopf) && /(?:^|[^<>&|\d-])>>?\s*[^\s>&|;]/.test(kopf));
    if (schreibt) aus.push(m[4]);
  }
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

/** Grobe Zerlegung: Zeichenketten (' " `), Namen/Zahlen und einzelne Zeichen; Kommentare fallen weg. Wirft nie. */
function lexe(src) {
  const t = [];
  let i = 0;
  while (i < src.length && t.length < 20000) {
    const c = src[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i += 1; continue; }
    if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? src.length : j + 2; continue; }
    if (c === '"' || c === "'" || c === '`') { const r = leseLiteral(src, i); t.push({ t: 's', v: r.wert }); i = r.ende; continue; }
    if (/[\w$]/.test(c)) { let j = i + 1; while (j < src.length && /[\w$]/.test(src[j])) j += 1; t.push({ t: 'i', v: src.slice(i, j) }); i = j; continue; }
    t.push({ t: 'p', v: c });
    i += 1;
  }
  return t;
}

const JS_BEFEHL_AUFRUF = new Set(['exec_command', 'shell', 'shell_command', 'local_shell', 'bash', 'exec', 'execsync', 'run_command', 'system']);
const JS_SPAWN_AUFRUF = new Set(['spawn', 'spawnsync', 'execfile', 'execfilesync']);
const JS_SCHREIB_AUFRUF = new Set(['writefilesync', 'writefile', 'appendfilesync', 'appendfile']);

/**
 * Liest aus JavaScript die Zeichenketten, die als Befehl, Pfad, Inhalt oder Patch dienen:
 * `cmd: "…"`, `command: ["a","b"]`, `exec_command("…")`, `spawn("git", ["push", "-f"])`, `writeFileSync(pfad, text)`,
 * Zeichenketten mit «*** Begin Patch». Unterstützt `+`-Ketten und `const x = "…"` für einen Namen.
 */
export function liesJs(quelltext) {
  const t = lexe(String(quelltext ?? ''));
  const aus = { befehle: [], pfade: [], texte: [], patches: [] };
  const vars = new Map();
  const istP = (k, v) => t[k]?.t === 'p' && t[k].v === v;

  function wert(k, tiefe = 0) {
    const x = t[k];
    if (!x) return undefined;
    if (x.t === 's') {
      let v = x.v;
      let n = k + 1;
      while (istP(n, '+') && t[n + 1]?.t === 's') { v += t[n + 1].v; n += 2; }
      return { art: 's', v, von: k, bis: n };
    }
    if (x.t === 'p' && x.v === '[') {
      const items = [];
      let n = k + 1;
      let schritte = 0;
      while (n < t.length && !istP(n, ']') && schritte < 300) {
        schritte += 1;
        const w = wert(n, tiefe + 1);
        if (w && w.art === 's') { items.push(w.v); n = w.bis; } else {
          if (t[n].t === 'i') items.push('X');
          n += 1;
        }
      }
      return { art: 'l', v: items, von: k, bis: n + 1 };
    }
    if (x.t === 'i' && tiefe < 3 && vars.has(x.v)) return { ...vars.get(x.v), von: k, bis: k + 1 };
    return undefined;
  }

  for (let k = 0; k + 3 < t.length; k += 1) {
    if (t[k].t === 'i' && ['const', 'let', 'var'].includes(t[k].v) && t[k + 1].t === 'i' && istP(k + 2, '=') && !vars.has(t[k + 1].v)) {
      const w = wert(k + 3);
      if (w) vars.set(t[k + 1].v, { art: w.art, v: w.v });
    }
  }

  const frames = [{ inhalt: [] }];
  const verbraucht = new Set();
  const verbrauche = w => { for (let q = w.von; q < w.bis; q += 1) verbraucht.add(q); };
  const schliesse = f => {
    if (f.inhalt.length === 0) return;
    aus.texte.push(...f.inhalt);
    if (f.pfad) aus.pfade.push(f.pfad);
  };
  const befehlWert = w => {
    if (w.art === 's') aus.befehle.push(w.v);
    else if (w.art === 'l' && w.v.length > 0) aus.befehle.push(befehlAusListe(w.v));
  };

  for (let k = 0; k < t.length; k += 1) {
    const x = t[k];
    if (x.t === 'p' && x.v === '{') { frames.push({ inhalt: [] }); continue; }
    if (x.t === 'p' && x.v === '}') { if (frames.length > 1) schliesse(frames.pop()); continue; }

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
      } else if (JS_SCHREIB_AUFRUF.has(name)) {
        const w = wert(k + 2);
        const w2 = w && w.art === 's' && istP(w.bis, ',') ? wert(w.bis + 1) : undefined;
        if (w && w2 && w2.art === 's') {
          aus.pfade.push(w.v);
          aus.texte.push({ text: w2.v, umfeld: '' });
          verbrauche(w);
          verbrauche(w2);
        }
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
    const w = istSchluessel ? wert(k + 2) : (vars.has(x.v) ? { ...vars.get(x.v), von: k, bis: k + 1 } : undefined);
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

function geh(wert, schluessel, tiefe, g) {
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
    for (const x of wert) geh(x, schluessel, tiefe + 1, g);
    return;
  }
  if (!wert || typeof wert !== 'object') return;

  // Ein Objekt: Pfad + Inhalt gehören zusammen (eine Datei); `command` + `args` ist ein Befehl mit Argumenten.
  const mitArgs = typeof wert.command === 'string' && Array.isArray(wert.args) && wert.args.length > 0 && wert.args.every(skalar);
  const inhalt = [];
  let pfad;
  for (const [k0, v] of Object.entries(wert)) {
    const k = k0.toLowerCase();
    if (ALT.has(k)) continue;
    if (INHALT.has(k)) {
      if (typeof v === 'string') inhalt.push({ text: v, umfeld: '' });
      else if (Array.isArray(v) && v.length > 0 && v.every(x => typeof x === 'string')) inhalt.push({ text: v.join('\n'), umfeld: '' });
      else geh(v, k, tiefe + 1, g);
      continue;
    }
    if (PFAD.has(k) && typeof v === 'string') { if (pfad === undefined) pfad = v; continue; }
    if (k === 'args' && mitArgs) continue;
    if (k === 'command' && mitArgs) { g.formen.add('befehl-liste'); befehlsText(befehlAusListe([v, ...wert.args]), g); continue; }
    geh(v, k, tiefe + 1, g);
  }
  if (inhalt.length > 0) {
    g.formen.add(pfad === undefined ? 'text' : 'datei');
    g.texte.push(...inhalt);
    if (pfad !== undefined) g.pfade.push(pfad);
  } else if (pfad !== undefined) {
    g.formen.add('pfad');
  }
}
