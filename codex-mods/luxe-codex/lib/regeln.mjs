/**
 * Reine Regeln der Leitplanken: kein Netz, kein Zustand, damit sie sich einzeln testen lassen.
 * Port von luxe-leitplanken/hooks/regeln.ts (Claude-Code-Mod); dieselben Regeln, dieselben Gründe.
 *
 * Jede Regel steht für eine Lehre, die im Projektgedächtnis (CLAUDE.md) schon einmal Zeit oder Geld
 * gekostet hat. Eine Leitplanke ist keine Sicherheitsgrenze, sondern eine Gedächtnisstütze, die nicht
 * vergisst: jede hat darum einen ausdrücklichen Ausweg (LUXE_*_OK=1 im Befehl), der nur nach dem
 * ausdrücklichen Ja des Besitzers in DIESEM Chat benutzt wird.
 *
 * Gelesen wird nicht mehr mit Mustern über den ganzen Text, sondern mit einem kleinen Shell-Zerleger
 * (`zerlege`): Wörter ohne Anführungszeichen und Maskierung, Teilbefehle (`;`, `&&`, `||`, `|`, `&`, Zeilenumbruch,
 * `$(…)`, Rückticks, Klammern), Umleitungen, Heredocs, Here-Strings, Kommentare, Zeilenfortsetzung. Jede Regel
 * gilt je Teilbefehl; `LIVE=1` und die Auswege gelten für den Teilbefehl, vor dem sie stehen (oder danach für alles,
 * wenn sie mit `export` oder allein gesetzt werden).
 *
 * Abweichungen vom Claude-Mod (alle in test/leitplanken_test.mjs in beide Richtungen gemessen):
 *   - `LIVE=1`, `LUXE_*_OK=1` gelten auch vor `;`, `&`, `|`, `)` und mit Anführungszeichen (`LIVE="1"`).
 *   - `git -C <pfad> push|add` und `git add ./` werden erkannt, ebenso gebündelte Kurzoptionen (`-fu`, `-vA`).
 *   - `_SOCIAL_STOPP` zählt nur als genauer Dateiname und nur dort, wo die Datei ANGELEGT wird (Ziel von `touch`,
 *     `cp`, `mv`, `tee`, `>`, `dd of=`, `curl -o`, PowerShell `New-Item`/`Set-Content`/`Copy-Item` …), nicht beim Lesen oder Wegschaffen.
 *   - Ein Skript wird nur dann als Trockenlauf gemerkt, wenn es wirklich ausgeführt wird (Interpreter + Datei oder
 *     direkter Aufruf); `cat x.sh`, `chmod`, `git add x.sh` zählen nicht. `node --check`, `bash -n`, `py_compile` auch nicht.
 *   - `pkill`/`killall` als blosses Wort hinter einem Lese-/Suchbefehl (`rg pkill`, `echo killall`, `git log -S pkill`) ist kein Treffer.
 *   - Zusätzliche Geheimnis-Muster: OpenAI/Anthropic-Schlüssel, AWS, PGP/verschlüsselte PEM-Schlüssel.
 *   - Bei Schreibwegen prüft `pruefeInhalt` den Marker `luxe-geheim-ok` auch im sichtbaren Umfeld der Datei.
 * Grenzen: Befehle, die erst zur Laufzeit zusammengesetzt werden (`$(…)` als Befehlsname, Variablen aus Programmen),
 * Skripte aus Dateien (`bash datei.sh`, `curl … | sh`), Heredocs mit Befehlsersetzung im Körper, Code in `python -c`/`node -e`
 * (ausser dem Anlegen von _SOCIAL_STOPP) und die Backtick-Fortsetzung von PowerShell sieht eine Textprüfung nicht.
 */

/** Die Auswege, die im Befehl stehen dürfen. */
export const AUSWEGE = ['LUXE_FORCE_OK', 'LUXE_KILL_OK', 'LUXE_ADD_OK', 'LUXE_LIVE_OK'];

// ================================================================ Der Zerleger

const LEER = new Set([' ', '\t', '\r', '\f', '\v']);
const MAX_TIEFE = 8;
const ZUW_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

function neuesSeg(pipeIn) {
  return { w: [], umleit: [], heredocs: [], hier: [], pipeIn, pipeOut: false, trenner: '', hatHere: false };
}

/** Liest nach einem Zeilenumbruch die Körper der offenen Heredocs (Endzeile = Begrenzer, Leerraum drumherum erlaubt). */
function liesHeredocs(z) {
  while (z.hereOffen.length > 0) {
    const h = z.hereOffen.shift();
    const zeilen = [];
    let gefunden = false;
    while (z.i < z.n) {
      const e = z.s.indexOf('\n', z.i);
      const zeile = z.s.slice(z.i, e < 0 ? z.n : e);
      z.i = e < 0 ? z.n : e + 1;
      const vgl = (h.strip ? zeile.replace(/^\t+/, '') : zeile).replace(/\r$/, '');
      if (vgl.trim() === h.delim) { gefunden = true; break; }
      zeilen.push(zeile.replace(/\r$/, ''));
    }
    h.seg.heredocs.push({ koerper: zeilen.join('\n'), zitiert: h.zitiert, vollstaendig: gefunden });
  }
}

/** Eigener Lauf über einen Text (Rückticks, offenes Zitat): die Einträge werden zurückgegeben. Tiefe und Anzahl sind begrenzt. */
function unterText(text, tiefe, z) {
  if (tiefe > MAX_TIEFE || z.g.teile >= 16) return [];
  z.g.teile += 1;
  const z2 = { s: text, n: text.length, i: 0, aus: [], hereOffen: [], fehlt: new Set(), g: z.g };
  liesGruppe(z2, tiefe, false);
  return z2.aus;
}

/** Position des nächsten nicht maskierten Rücktick ab `von`, sonst -1 (ein Misserfolg wird gemerkt, damit viele offene Rückticks nicht quadratisch werden). */
function findeRueck(z, von) {
  if (z.fehlt.has('`')) return -1;
  let p = von;
  for (;;) {
    p = z.s.indexOf('`', p);
    if (p < 0) { z.fehlt.add('`'); return -1; }
    let r = 0;
    while (p - 1 - r >= von && z.s[p - 1 - r] === '\\') r += 1;
    if (r % 2 === 0) return p;
    p += 1;
  }
}

function liesGruppe(z, tiefe, innen) {
  const { s, n } = z;
  let seg = neuesSeg(false);
  let wort = null;
  let ziel = null;
  let klammer = 0;
  let p0 = 0;

  const anhaengen = (text, zitiert) => {
    if (!wort) wort = { v: '', q: false, zuw: undefined, offen: false, subst: false, start: p0, roh: '' };
    if (zitiert) wort.q = true;
    wort.v += text;
  };
  const wortEnde = () => {
    if (!wort) return;
    const w = wort;
    wort = null;
    w.roh = s.slice(w.start, Math.max(w.start, z.i));
    if (ziel === null) { seg.w.push(w); return; }
    const op = ziel;
    ziel = null;
    if (op === '<<' || op === '<<-') {
      z.hereOffen.push({ delim: w.v, zitiert: w.q, strip: op === '<<-', seg });
      seg.hatHere = true;
    } else if (op === '<<<') seg.hier.push(w);
    else seg.umleit.push({ op, ziel: w });
  };
  const segEnde = trenner => {
    wortEnde();
    ziel = null;
    const nichtLeer = seg.w.length > 0 || seg.umleit.length > 0 || seg.hier.length > 0 || seg.hatHere;
    seg.trenner = trenner;
    if (nichtLeer) {
      z.aus.push(seg);
      if (trenner === '|') seg.pipeOut = true;
    }
    seg = neuesSeg(trenner === '|');
  };
  /** Ein Zitat ohne Ende: der Rest gilt als Wortinhalt UND wird zusätzlich als eigener Befehlstext gelesen (lieber zu viel als verdeckt). */
  const offen = () => {
    const rest = s.slice(z.i + 1);
    anhaengen(rest, true);
    wort.offen = true;
    for (const e of unterText(rest, tiefe + 1, z)) z.aus.push(e);
    z.i = n;
  };
  const befehlsErsetzung = () => {
    z.aus.push('(');
    liesGruppe(z, tiefe + 1, true);
    z.aus.push(')');
  };

  while (z.i < n) {
    const c = s[z.i];
    p0 = z.i;
    if (LEER.has(c)) { wortEnde(); z.i += 1; continue; }
    if (c === '\n') { segEnde('\n'); z.i += 1; liesHeredocs(z); continue; }
    if (c === '\\') {
      const d = s[z.i + 1];
      if (d === undefined) { z.i += 1; continue; }
      if (d === '\n') { z.i += 2; continue; }
      if (d === '\r' && s[z.i + 2] === '\n') { z.i += 3; continue; }
      anhaengen(d, true);
      z.i += 2;
      continue;
    }
    if (c === "'") {
      const e = z.fehlt.has("'") ? -1 : s.indexOf("'", z.i + 1);
      if (e < 0) { z.fehlt.add("'"); offen(); continue; }
      anhaengen(s.slice(z.i + 1, e), true);
      z.i = e + 1;
      continue;
    }
    if (c === '"') {
      const start = z.i;
      let j = z.i + 1;
      let teil = '';
      let ok = false;
      let subst = false;
      while (j < n) {
        const d = s[j];
        if (d === '"') { ok = true; break; }
        if (d === '\\') {
          const e = s[j + 1];
          if (e === undefined) { teil += '\\'; j += 1; continue; }
          if (e === '\n') { j += 2; continue; }
          if (e === '\r' && s[j + 2] === '\n') { j += 3; continue; }
          teil += (e === '"' || e === '\\' || e === '$' || e === '`') ? e : `\\${e}`;
          j += 2;
          continue;
        }
        if (d === '$' && s[j + 1] === '(' && tiefe + 1 <= MAX_TIEFE) {
          if (s[j + 2] === '(' && !z.fehlt.has('))')) {
            const e = s.indexOf('))', j + 3);
            if (e >= 0) { teil += 'N'; j = e + 2; continue; }
            z.fehlt.add('))');
          }
          z.i = j + 2;
          befehlsErsetzung();
          teil += 'X';
          subst = true;
          j = z.i;
          continue;
        }
        if (d === '`' && tiefe + 1 <= MAX_TIEFE) {
          const e = findeRueck(z, j + 1);
          if (e >= 0) {
            z.aus.push('(');
            for (const x of unterText(s.slice(j + 1, e).replace(/\\([`\\$])/g, '$1'), tiefe + 1, z)) z.aus.push(x);
            z.aus.push(')');
            teil += 'X';
            subst = true;
            j = e + 1;
            continue;
          }
        }
        if (d === '$' && s[j + 1] === '{' && !z.fehlt.has('}')) {
          const e = s.indexOf('}', j + 2);
          if (e >= 0) { teil += s.slice(j, e + 1); j = e + 1; continue; }
          z.fehlt.add('}');
        }
        teil += d;
        j += 1;
      }
      if (ok) {
        anhaengen(teil, true);
        if (subst) wort.subst = true;
        z.i = j + 1;
        continue;
      }
      z.i = start;
      offen();
      continue;
    }
    if (c === '`') {
      const e = tiefe + 1 <= MAX_TIEFE ? findeRueck(z, z.i + 1) : -1;
      if (e < 0) { segEnde('`'); z.i += 1; continue; }
      z.aus.push('(');
      for (const x of unterText(s.slice(z.i + 1, e).replace(/\\([`\\$])/g, '$1'), tiefe + 1, z)) z.aus.push(x);
      z.aus.push(')');
      anhaengen('X', false);
      wort.subst = true;
      z.i = e + 1;
      continue;
    }
    if (c === '$') {
      const d = s[z.i + 1];
      if (d === '(') {
        if (s[z.i + 2] === '(' && !z.fehlt.has('))')) {
          const e = s.indexOf('))', z.i + 3);
          if (e >= 0) { anhaengen('N', false); z.i = e + 2; continue; }
          z.fehlt.add('))');
        }
        if (tiefe + 1 <= MAX_TIEFE) {
          z.i += 2;
          befehlsErsetzung();
          anhaengen('X', false);
          wort.subst = true;
        } else {
          segEnde('(');
          z.aus.push('(');
          klammer += 1;
          z.i += 2;
        }
        continue;
      }
      if (d === '{' && !z.fehlt.has('}')) {
        const e = s.indexOf('}', z.i + 2);
        if (e >= 0) { anhaengen(s.slice(z.i, e + 1), false); z.i = e + 1; continue; }
        z.fehlt.add('}');
      }
      anhaengen('$', false);
      z.i += 1;
      continue;
    }
    if (c === '#' && !wort) {
      const e = s.indexOf('\n', z.i);
      z.i = e < 0 ? n : e;
      continue;
    }
    if (c === ';') { segEnde(';'); z.i += 1; continue; }
    if (c === '&') {
      if (s[z.i + 1] === '&') { segEnde('&&'); z.i += 2; continue; }
      if (s[z.i + 1] === '>') {
        wortEnde();
        z.i += 2;
        if (s[z.i] === '>') z.i += 1;
        ziel = '&>';
        continue;
      }
      segEnde('&');
      z.i += 1;
      continue;
    }
    if (c === '|') {
      if (s[z.i + 1] === '|') { segEnde('||'); z.i += 2; continue; }
      if (s[z.i + 1] === '&') z.i += 1;
      segEnde('|');
      z.i += 1;
      continue;
    }
    if (c === '(') { segEnde('('); z.aus.push('('); klammer += 1; z.i += 1; continue; }
    if (c === ')') {
      if (klammer > 0) { segEnde(')'); z.aus.push(')'); klammer -= 1; z.i += 1; continue; }
      segEnde(')');
      z.i += 1;
      if (innen) return;
      continue;
    }
    if (c === '<' || c === '>') {
      if (wort && !wort.q && /^\d+$/.test(wort.v)) wort = null;
      else wortEnde();
      if (s[z.i + 1] === '(' && tiefe + 1 <= MAX_TIEFE) {
        z.i += 2;
        befehlsErsetzung();
        anhaengen('P', false);
        wort.subst = true;
        continue;
      }
      let op = c;
      z.i += 1;
      if (c === '<') {
        if (s[z.i] === '<') {
          z.i += 1;
          if (s[z.i] === '<') { z.i += 1; op = '<<<'; } else if (s[z.i] === '-') { z.i += 1; op = '<<-'; } else op = '<<';
        } else if (s[z.i] === '>') { z.i += 1; op = '<>'; } else if (s[z.i] === '&') { z.i += 1; op = '<&'; }
      } else if (s[z.i] === '>') { z.i += 1; op = '>>'; } else if (s[z.i] === '|') { z.i += 1; op = '>|'; } else if (s[z.i] === '&') { z.i += 1; op = '>&'; }
      ziel = op;
      continue;
    }
    if (c === '=' && wort && wort.zuw === undefined && !wort.q && ZUW_NAME.test(wort.v)) wort.zuw = wort.v;
    anhaengen(c, false);
    z.i += 1;
  }
  segEnde('');
}

/**
 * Zerlegt eine Befehlszeile in Teilbefehle (Einträge `{ w, umleit, heredocs, hier, pipeIn, pipeOut, trenner }`) und
 * Klammermarken (`'('`, `')'`) in der Reihenfolge des Textes. Wort: `{ v (ohne Anführungszeichen), q (war zitiert/maskiert),
 * zuw (Name, wenn NAME=… ), offen (Zitat ohne Ende), subst (enthält Befehlsersetzung), roh }`. Wirft nie; linear in der Länge.
 */
export function zerlege(befehl) {
  const text = String(befehl ?? '');
  const z = { s: text, n: text.length, i: 0, aus: [], hereOffen: [], fehlt: new Set(), g: { teile: 0 } };
  liesGruppe(z, 0, false);
  return z.aus;
}

// ================================================================ Analyse: Kommandowort, Umgebung, Skripte

/** Name eines Befehls: ohne Pfad, kleingeschrieben, ohne `.exe` (`/usr/bin/PKILL`, `pwsh.exe`). */
export function basis(v) {
  return String(v ?? '').replace(/^.*[\\/]/, '').toLowerCase().replace(/\.exe$/, '');
}

export const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'ash', 'fish', 'mksh', 'csh', 'tcsh']);

const SCHLUESSEL = new Set(['if', 'then', 'else', 'elif', 'while', 'until', 'do', '!', '{', '}']);
/** Vorspann-Befehle (führen einen anderen Befehl aus) und ihre Optionen MIT getrenntem Wert. */
const VORSPANN = {
  sudo: new Set(['-u', '-g', '-h', '-p', '-C', '-D', '-R', '-T', '-U', '-r', '-t']), doas: new Set(['-u', '-C']), env: new Set(['-u', '-C', '-S']),
  time: new Set(['-f', '-o']), timeout: new Set(['-s', '-k']), nice: new Set(['-n']), ionice: new Set(['-c', '-n', '-p', '-t']), nohup: new Set(), exec: new Set(['-a']),
  command: new Set(), builtin: new Set(), setsid: new Set(), stdbuf: new Set(['-i', '-o', '-e']), xargs: new Set(['-a', '-d', '-E', '-I', '-L', '-n', '-P', '-s']),
  watch: new Set(['-n']), eval: new Set(), npx: new Set(['-p', '--package']), bunx: new Set(), pnpx: new Set(),
};
/** Befehle, deren Wörter Daten sind (suchen, lesen, ausgeben) oder die nur die Shell einstellen. */
const DATEN_BEFEHLE = new Set(['rg', 'grep', 'egrep', 'fgrep', 'ag', 'ack', 'sed', 'awk', 'cat', 'echo', 'printf', 'head', 'tail', 'less', 'more', 'man', 'which', 'whereis', 'type',
  'ls', 'wc', 'diff', 'apropos', 'help', 'pgrep', 'ps', 'cd', 'pushd', 'popd', 'export', 'unset', 'set', 'for', 'read', 'local', 'declare', 'typeset', 'readonly', 'alias',
  'shift', 'trap', 'true', 'false', 'test', '[', '[[', 'return', 'exit', 'break', 'continue']);
/** Zusätzlich für die pkill-Regel keine Treffer: Befehle, die ein Wort nur als Namen oder Suchbegriff nehmen. */
const KILL_NEUTRAL = new Set(['git', 'npm', 'pnpm', 'yarn', 'bun', 'pip', 'pip3', 'brew', 'apt', 'apt-get', 'apk', 'dpkg', 'make', 'cargo', 'docker-compose']);
const KILL_NAMEN = new Set(['pkill', 'killall']);

/** Index des Kommandoworts nach Zuweisungen, Schlüsselwörtern (`do`, `then`, `{`) und Vorspann (`sudo`, `time`, `xargs` …). */
function kommando(w) {
  let i = 0;
  for (let schutz = 0; schutz < 64; schutz += 1) {
    while (i < w.length && w[i].zuw !== undefined) i += 1;
    if (i >= w.length) return { i: -1, name: '', daten: true };
    if (!w[i].q && SCHLUESSEL.has(w[i].v)) { i += 1; continue; }
    const name = basis(w[i].v);
    const opts = VORSPANN[name];
    if (!opts) return { i, name, daten: DATEN_BEFEHLE.has(name) };
    if (name === 'command' && w.slice(i + 1).some(x => x.v === '-v' || x.v === '-V')) return { i, name, daten: true };
    let j = i + 1;
    while (j < w.length && w[j].v.length > 1 && w[j].v.startsWith('-')) j += opts.has(w[j].v) ? 2 : 1;
    if (name === 'timeout' && j < w.length) j += 1;
    i = j;
  }
  return { i: -1, name: '', daten: true };
}

const REL = new Set(['LIVE', ...AUSWEGE]);
const INTERPRETER = /^(?:node|nodejs|bun|deno|tsx|ts-node|python[\d.]*|ruby|perl|php|bash|sh|zsh|dash|ksh|ash|fish|mksh|csh|tcsh|source|\.)$/;
const SKRIPT_ENDUNG = /\.(?:mjs|cjs|js|jsx|ts|mts|cts|tsx|py|sh|bash|rb|pl|php)$/i;

/** Normalisiert einen Pfad: `.` und `..` aufgelöst, doppelte Schrägstriche weg; ein nicht auflösbares `..` fällt weg. */
function normal(pfad) {
  const abs = pfad.startsWith('/');
  const teile = [];
  for (const t of pfad.split('/')) {
    if (t === '' || t === '.') continue;
    if (t === '..') { teile.pop(); continue; }
    teile.push(t);
  }
  return (abs ? '/' : '') + teile.join('/');
}

/** Ersetzt `$NAME`/`${NAME}` durch die bekannten Werte (Schleifenvariablen, Zuweisungen); Unbekanntes bleibt stehen. */
function expandiere(v, vars) {
  if (!v.includes('$')) return [v];
  const re = /\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))/;
  let liste = [v];
  for (let runde = 0; runde < 4; runde += 1) {
    const neu = [];
    let geaendert = false;
    for (const x of liste) {
      const m = re.exec(x);
      const werte = m ? vars.get(m[1] ?? m[2]) : undefined;
      if (m && werte && werte.length > 0) {
        geaendert = true;
        for (const wv of werte) neu.push(x.slice(0, m.index) + wv + x.slice(m.index + m[0].length));
      } else neu.push(x);
    }
    liste = neu.slice(0, 20);
    if (!geaendert) break;
  }
  return liste;
}

/** Kennung eines Skripts: ab `automation/`, `dropship/` oder `tools/`, sonst der normalisierte Pfad (mit dem Verzeichnis nach `cd`). */
function kennung(roh, cwd) {
  let p = String(roh).replace(/^\$\{?[A-Za-z_]\w*\}?\//, '').replace(/^~\//, '');
  if (/[$`*?[\]{}]/.test(p)) return undefined;
  if (!p.startsWith('/') && cwd) p = `${cwd}/${p}`;
  p = normal(p).replace(/^\//, '');
  if (!p) return undefined;
  const m = /(?:^|\/)((?:automation|dropship|tools)\/.+)$/.exec(p);
  return m ? m[1] : p;
}

const dateiName = p => p.slice(p.lastIndexOf('/') + 1);
/** Ein Skript gilt als gesehen, wenn die Kennung gleich ist; ohne Verzeichnisteil (unbekannter Arbeitsordner) genügt derselbe Dateiname. */
function gesehenPasst(gesehen, s) {
  if (gesehen.has(s)) return true;
  const ohneDir = !s.includes('/');
  for (const g of gesehen) {
    if (typeof g === 'string' && (ohneDir || !g.includes('/')) && dateiName(g) === dateiName(s)) return true;
  }
  return false;
}

const INLINE_OPT = { node: ['-e', '--eval', '-p', '--print'], python: ['-c'], ruby: ['-e'], perl: ['-e', '-E'], php: ['-r'], deno: ['eval'], bun: ['-e'] };
const WERT_OPT = new Set(['-r', '--require', '--import', '--loader', '--experimental-loader', '--env-file', '-W', '-X', '-I']);
const interpreterArt = name => (name.startsWith('python') ? 'python' : name === 'nodejs' || name === 'tsx' || name === 'ts-node' ? 'node' : name);

/** Skriptwörter eines Interpreter-Aufrufs: `{ kandidaten, nurPruefung }`; Inline-Code, Module und Shell mit `-c` haben keins. */
function skriptWoerter(w, k, name) {
  const art = interpreterArt(name);
  const inline = INLINE_OPT[art] ?? [];
  const istShell = SHELLS.has(name);
  let nurPruefung = false;
  let variable;
  for (let j = k + 1; j < w.length; j += 1) {
    const t = w[j].v;
    if (t.startsWith('-') && t.length > 1) {
      if (inline.includes(t)) return { kandidaten: [], nurPruefung: false };
      if (istShell && /^-[A-Za-z]*c[A-Za-z]*$/.test(t)) return { kandidaten: [], nurPruefung: false };
      if (istShell && (t === '-n' || t === '-s')) { if (t === '-n') nurPruefung = true; else return { kandidaten: [], nurPruefung: false }; continue; }
      if (art === 'node' && (t === '--check' || t === '-c')) nurPruefung = true;
      if (art === 'python' && t === '-m') {
        const modul = w[j + 1]?.v ?? '';
        return { kandidaten: [], nurPruefung: modul === 'py_compile' || modul === 'compileall' };
      }
      if (WERT_OPT.has(t) || (istShell && (t === '-o' || t === '-O'))) j += 1;
      continue;
    }
    if (t === '-' && istShell) return { kandidaten: [], nurPruefung: false };
    if (SKRIPT_ENDUNG.test(t)) return { kandidaten: [w[j]], nurPruefung };
    // Ein Wort mit Variable ist erst nach dem Einsetzen der Schleifenvariable als Skript erkennbar.
    if (t.includes('$') && !variable) variable = w[j];
  }
  return { kandidaten: variable ? [variable] : [], nurPruefung };
}

function setzeSticky(zust, wd) {
  const wert = wd.v.slice(wd.zuw.length + 1);
  if (REL.has(wd.zuw)) zust.env.set(wd.zuw, wert);
  zust.vars.set(wd.zuw, wd.subst ? [] : [wert]);
}

/**
 * Analyse einer Befehlszeile: je Teilbefehl `{ seg, k (Index des Kommandoworts, -1 = keins), name, daten (Wörter sind Daten),
 * env (Map: LIVE und Auswege, wie sie für diesen Teilbefehl gelten), cwd, skripte (Kennungen ausgeführter Skripte), nurPruefung, vor (Vorgänger in der Pipe) }`.
 * `export X=1` und allein stehende Zuweisungen gelten für alle folgenden Teilbefehle; `cd` gilt bis zum Ende der Klammer.
 */
export function analysiere(befehl) {
  const infos = [];
  const zust = { cwd: '', env: new Map(), vars: new Map() };
  const stapel = [];
  let vor = null;
  for (const e of zerlege(befehl)) {
    if (e === '(') { stapel.push(zust.cwd); continue; }
    if (e === ')') { if (stapel.length > 0) zust.cwd = stapel.pop(); continue; }
    const seg = e;
    const k = kommando(seg.w);
    const env = new Map(zust.env);
    for (let i = 0; i < (k.i < 0 ? 0 : k.i); i += 1) {
      const wd = seg.w[i];
      if (wd.zuw !== undefined && REL.has(wd.zuw)) env.set(wd.zuw, wd.v.slice(wd.zuw.length + 1));
    }
    const info = { seg, k: k.i, name: k.name, daten: k.daten, env, cwd: zust.cwd, skripte: [], nurPruefung: false, vor: seg.pipeIn ? vor : null };

    // Skripte, die dieser Teilbefehl ausführt (mit der Umgebung VOR seinen eigenen Änderungen)
    if (k.i >= 0 && !k.daten) {
      let kandidaten = [];
      if (INTERPRETER.test(k.name)) {
        const r = skriptWoerter(seg.w, k.i, k.name);
        kandidaten = r.kandidaten;
        info.nurPruefung = r.nurPruefung;
      } else if (SKRIPT_ENDUNG.test(seg.w[k.i].v)) kandidaten = [seg.w[k.i]];
      for (const c of kandidaten) {
        if (c.subst) continue;
        for (const x of expandiere(c.v, zust.vars)) {
          if (!SKRIPT_ENDUNG.test(x)) continue;
          const id = kennung(x, zust.cwd);
          if (id && !info.skripte.includes(id)) info.skripte.push(id);
        }
      }
    }

    // Änderungen, die für die folgenden Teilbefehle gelten
    if (k.i < 0) {
      for (const wd of seg.w) if (wd.zuw !== undefined) setzeSticky(zust, wd);
    } else if (k.name === 'export') {
      for (const wd of seg.w.slice(k.i + 1)) if (wd.zuw !== undefined) setzeSticky(zust, wd);
    } else if (k.name === 'unset') {
      for (const wd of seg.w.slice(k.i + 1)) { zust.env.delete(wd.v); zust.vars.delete(wd.v); }
    } else if (k.name === 'cd' || k.name === 'pushd') {
      const arg = seg.w.slice(k.i + 1).find(x => !x.v.startsWith('-') || x.v === '-');
      const ex = arg && !arg.subst ? expandiere(arg.v, zust.vars) : [];
      const ziel = ex.length === 1 ? ex[0] : '';
      zust.cwd = !ziel || ziel === '-' || /[$`*?~]/.test(ziel) ? '' : normal(ziel.startsWith('/') || !zust.cwd ? ziel : `${zust.cwd}/${ziel}`);
    } else if (k.name === 'for') {
      const name = seg.w[k.i + 1]?.v;
      const iIn = seg.w.findIndex((x, idx) => idx > k.i + 1 && x.v === 'in' && !x.q);
      if (name && ZUW_NAME.test(name) && iIn > 0) zust.vars.set(name, seg.w.slice(iIn + 1).filter(x => !x.subst).map(x => x.v));
    }
    infos.push(info);
    vor = info;
  }
  return infos;
}

const istScharf = info => info.env.get('LIVE') === '1';
const hatAusweg = (info, name) => info.env.get(name) === '1';

/** Die Umgebungsbelegungen eines Teilbefehls, die für ein umhülltes Skript (`bash -lc "…"`) mitgelten: `LIVE=1` und jeder Ausweg. */
export function erbeText(info) {
  const aus = [];
  if (istScharf(info)) aus.push('LIVE=1');
  for (const n of AUSWEGE) if (hatAusweg(info, n)) aus.push(`${n}=1`);
  return aus.join(' ');
}

// ================================================================ Regeln

const GIT_MIT_WERT = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--super-prefix', '--config-env']);

/** Alle `git`-Aufrufe eines Teilbefehls: `{ sub, args }`; globale Optionen (`-C pfad`, `-c k=v`, `--no-pager`) werden übersprungen. */
function gitAufrufe(info) {
  if (info.k < 0 || info.daten) return [];
  const w = info.seg.w;
  const aus = [];
  for (let i = 0; i < w.length; i += 1) {
    if (w[i].zuw !== undefined || basis(w[i].v) !== 'git') continue;
    let j = i + 1;
    while (j < w.length) {
      const t = w[j].v;
      if (GIT_MIT_WERT.has(t)) { j += 2; continue; }
      if (t.startsWith('-') && t.length > 1) { j += 1; continue; }
      break;
    }
    if (j < w.length) aus.push({ sub: w[j].v, args: w.slice(j + 1).map(x => x.v) });
  }
  return aus;
}

/** Force-Push: `--force…`, `-f` auch gebündelt (`-fu`, `-uf`), `+refspec`. `-o` nimmt den Rest bzw. das nächste Wort als Wert. */
function pushIstForce(args) {
  let nachDoppel = false;
  for (let j = 0; j < args.length; j += 1) {
    const a = args[j];
    if (!nachDoppel && a === '--') { nachDoppel = true; continue; }
    if (!nachDoppel) {
      if (a.startsWith('--')) { if (/^--force(?![\w])/.test(a)) return true; continue; }
      if (/^-[A-Za-z0-9]+$/.test(a)) {
        for (let q = 1; q < a.length; q += 1) {
          if (a[q] === 'f') return true;
          if (a[q] === 'o') { if (q === a.length - 1) j += 1; break; }
        }
        continue;
      }
    }
    if (a.length > 1 && a[0] === '+' && a[1] !== ':') return true;
  }
  return false;
}

/** `git add -A/--all/.`/`*` (auch gebündelt, `-vA`); nicht bei Probelauf (`-n`), `-p`/`-i` und `-u` ohne `-A` (stagen keine neuen Dateien). */
function addIstAlles(args) {
  let alle = false, trocken = false, auswahl = false, nurBekannte = false, punkt = false;
  let nachDoppel = false;
  for (const a of args) {
    if (!nachDoppel && a === '--') { nachDoppel = true; continue; }
    if (!nachDoppel && a.startsWith('--')) {
      if (a === '--all' || a === '--no-ignore-removal') alle = true;
      else if (a === '--dry-run') trocken = true;
      else if (a === '--patch' || a === '--interactive') auswahl = true;
      else if (a === '--update') nurBekannte = true;
      continue;
    }
    if (!nachDoppel && /^-[A-Za-z]+$/.test(a)) {
      for (const ch of a.slice(1)) {
        if (ch === 'A') alle = true;
        else if (ch === 'n') trocken = true;
        else if (ch === 'p' || ch === 'i') auswahl = true;
        else if (ch === 'u') nurBekannte = true;
      }
      continue;
    }
    if (/^(?:\.\/?|\.\/\*|\*+|:\/\*?)$/.test(a)) punkt = true;
  }
  return !trocken && !auswahl && (alle || (punkt && !nurBekannte));
}

function killt(info) {
  if (info.k < 0) return false;
  if (KILL_NAMEN.has(info.name)) return true;
  if (info.daten || KILL_NEUTRAL.has(info.name)) return false;
  return info.seg.w.some((wd, i) => i !== info.k && wd.zuw === undefined && KILL_NAMEN.has(basis(wd.v)));
}

const SOCIAL = '_SOCIAL_STOPP';
const letzterTeil = x => String(x).replace(/^.*[\\/]/, '');
/** Heisst das Wort (oder sein Rohtext, z. B. mit Windows-Pfad) genau `_SOCIAL_STOPP`? */
const istSocial = wd => letzterTeil(wd.v) === SOCIAL || (typeof wd.roh === 'string' && letzterTeil(wd.roh.replace(/^["']|["']$/g, '')) === SOCIAL);
const SOCIAL_CODE = /(?<![\w-])_SOCIAL_STOPP(?![\w.-])/;
const SCHREIB_ANZEICHEN = /\b(?:write\w*|append\w*|copy\w*|touch|mknod|mkfifo|rename\w*|symlink\w*|link\w*|truncate\w*|creat\w*|save\w*|mv|cp|move)\b|\bopen\w*\s*\([^)]*?(?:['"][rbt]*[wax+][rwxbt+]*['"]|['"]\s*\+?>)/i;
const SCHREIB_UMLEITUNG = new Set(['>', '>>', '>|', '&>', '<>']);
const INLINE_CODE = { python: ['-c'], node: ['-e', '--eval', '-p', '--print'], perl: ['-e', '-E'], ruby: ['-e'], php: ['-r'], deno: ['eval'], bun: ['-e'] };

/** Ziel-Logik von cp/mv/install/ln/rsync: das letzte Wort (oder -t DIR) ist das Ziel; ein Verzeichnis `dropship/` mit Quelle `_SOCIAL_STOPP` legt sie dort an. */
function zielLegtSocialAn(args) {
  let tOpt;
  const pos = [];
  for (let j = 0; j < args.length; j += 1) {
    const a = args[j];
    if (a.v === '-t' && args[j + 1]) { tOpt = args[j + 1]; j += 1; continue; }
    if (a.v.startsWith('--target-directory=')) { tOpt = { v: a.v.slice(19), roh: a.v.slice(19) }; continue; }
    if (a.v.startsWith('-') && a.v.length > 1) continue;
    pos.push(a);
  }
  const dest = tOpt ?? pos[pos.length - 1];
  const quellen = tOpt ? pos : pos.slice(0, -1);
  if (!dest) return false;
  if (istSocial(dest)) return true;
  return /(?:^|[\\/])dropship[\\/]?$/.test(dest.v) && quellen.some(istSocial);
}

/** Schreibende Befehle, die `_SOCIAL_STOPP` anlegen können; auch hinter fremdem Vorspann (`find -exec touch`, `ssh h cp`) gesucht. */
const SOCIAL_VERBEN = new Set(['touch', 'tee', 'truncate', 'new-item', 'ni', 'set-content', 'sc', 'add-content', 'ac', 'out-file', 'cp', 'mv', 'install', 'ln', 'rsync', 'copy-item', 'cpi', 'move-item', 'mi', 'copy', 'move', 'dd', 'curl', 'wget']);

/** Schreibt dieser Befehl (`verb` mit den Wörtern danach) in die Datei `_SOCIAL_STOPP`? */
function verbLegtSocialAn(verb, args) {
  const pos = args.filter(x => !x.v.startsWith('-') || x.v === '-');
  switch (verb) {
    case 'touch': case 'tee': case 'truncate': case 'new-item': case 'ni': case 'set-content': case 'sc': case 'add-content': case 'ac': case 'out-file': return pos.some(istSocial);
    case 'cp': case 'mv': case 'install': case 'ln': case 'rsync': case 'copy-item': case 'cpi': case 'move-item': case 'mi': case 'copy': case 'move': return zielLegtSocialAn(args);
    case 'dd': return args.some(x => x.v.startsWith('of=') && istSocial({ v: x.v.slice(3), roh: x.v.slice(3) }));
    case 'curl':
      for (let j = 0; j < args.length; j += 1) {
        const a = args[j].v;
        if ((a === '-o' || a === '--output' || /^-[A-Za-z]*o$/.test(a)) && args[j + 1] && istSocial(args[j + 1])) return true;
        if (a.startsWith('--output=') && istSocial({ v: a.slice(9), roh: a.slice(9) })) return true;
        if (/^-o./.test(a) && !a.startsWith('--') && istSocial({ v: a.slice(2), roh: a.slice(2) })) return true;
      }
      return false;
    case 'wget':
      for (let j = 0; j < args.length; j += 1) {
        const a = args[j].v;
        if ((a === '-O' || a === '--output-document') && args[j + 1] && istSocial(args[j + 1])) return true;
        if (a.startsWith('--output-document=') && istSocial({ v: a.slice(18), roh: a.slice(18) })) return true;
        if (/^-O./.test(a) && istSocial({ v: a.slice(2), roh: a.slice(2) })) return true;
      }
      return false;
    default: {
      const opts = INLINE_CODE[interpreterArt(verb)];
      if (!opts) return false;
      for (let j = 0; j < args.length - 1; j += 1) {
        if (opts.includes(args[j].v) && SOCIAL_CODE.test(args[j + 1].v) && SCHREIB_ANZEICHEN.test(args[j + 1].v)) return true;
      }
      return false;
    }
  }
}

/** Legt dieser Teilbefehl die Datei `_SOCIAL_STOPP` an (oder schreibt hinein)? Lesen, Löschen und Wegschaffen nicht. */
function legtSocialAn(info) {
  const { seg } = info;
  for (const u of seg.umleit) {
    if ((SCHREIB_UMLEITUNG.has(u.op) || (u.op === '>&' && !/^(?:\d+|-)$/.test(u.ziel.v))) && istSocial(u.ziel)) return true;
  }
  const git = gitAufrufe(info).find(g => g.sub === 'mv');
  if (git) return zielLegtSocialAn(git.args.map(v => ({ v, roh: v })));
  if (info.k < 0) return false;
  const w = seg.w;
  if (verbLegtSocialAn(info.name, w.slice(info.k + 1))) return true;
  if (info.daten || KILL_NEUTRAL.has(info.name)) return false;
  for (let i = info.k + 1; i < w.length; i += 1) {
    if (w[i].zuw === undefined && SOCIAL_VERBEN.has(basis(w[i].v)) && verbLegtSocialAn(basis(w[i].v), w.slice(i + 1))) return true;
  }
  return false;
}

/** Urteil über einen Shell-Befehl. `trocken`: Skripte, die in dieser Sitzung ohne LIVE=1 gelaufen sind.
 *  Ergebnis: `{ deny: grund }`, `{ merke: skript }` (Trockenlauf merken; bei mehreren Skripten dazu `weitere: [...]`) oder `undefined`. */
export function pruefeBash(befehl, trocken = []) {
  const gesehen = new Set(trocken);
  const infos = analysiere(befehl);

  for (const info of infos) {
    if (hatAusweg(info, 'LUXE_FORCE_OK')) continue;
    if (gitAufrufe(info).some(g => g.sub === 'push' && pushIstForce(g.args))) {
      return { deny: 'Force-Push gesperrt (Projektregel: nie Force-Push, auch nicht "nur kurz"). Er überschreibt fremde Arbeit und der Hetzner-Agent schreibt auf Branches mit. Nimm einen neuen Branch von origin/main. Nur nach dem AUSDRÜCKLICHEN Ja des Besitzers in diesem Chat: LUXE_FORCE_OK=1 voranstellen.' };
    }
  }
  for (const info of infos) {
    if (!hatAusweg(info, 'LUXE_KILL_OK') && killt(info)) {
      return { deny: 'pkill/killall gesperrt: ein Muster, das den eigenen Befehl trifft, beendet die eigene Shell (Exit 144, so passiert). Nimm eine PID-Liste (pgrep, dann kill <PID>) oder den Klammer-Trick pgrep -f "[l]aufen.py". Ausweg: LUXE_KILL_OK=1.' };
    }
  }
  for (const info of infos) {
    if (hatAusweg(info, 'LUXE_ADD_OK')) continue;
    if (gitAufrufe(info).some(g => (g.sub === 'add' || g.sub === 'stage') && addIstAlles(g.args))) {
      return { deny: 'git add -A / git add . gesperrt: so kam ein Playwright-Symlink (node_modules_pw) ins Repo und legte den Deploy lahm. Erst git status lesen, dann Dateien einzeln benennen. Ausweg: LUXE_ADD_OK=1.' };
    }
  }
  for (const info of infos) {
    if (legtSocialAn(info)) {
      return { deny: 'dropship/_SOCIAL_STOPP wird nie neu angelegt (Vorgabe des Besitzers). Löschen ist erlaubt, Anlegen nicht. Einen Ausweg per Variable gibt es dafür nicht: nur der Besitzer legt die Datei an.' };
    }
  }
  for (const info of infos) {
    if (!istScharf(info) || hatAusweg(info, 'LUXE_LIVE_OK') || info.nurPruefung) continue;
    const s = info.skripte.find(x => !gesehenPasst(gesehen, x));
    if (s) {
      return { deny: `LIVE=1 für ${s} ohne Trockenlauf in dieser Sitzung gesperrt (Projektregel: Massen-Schreiber nur mit Trockenlauf; ein zu breites Muster sieht aus wie ein anderes Ergebnis, nicht wie ein Fehler). Erst ohne LIVE=1 laufen lassen, die Zahlen je Grund lesen, dann scharf. Ausweg: LUXE_LIVE_OK=1.` };
    }
  }
  // Ein Lauf OHNE LIVE=1 merkt sich das Skript als gesehenen Trockenlauf (ausser reinen Prüfläufen).
  const neu = [];
  for (const info of infos) {
    if (istScharf(info) || info.nurPruefung) continue;
    for (const s of info.skripte) if (!gesehenPasst(gesehen, s) && !neu.includes(s)) neu.push(s);
  }
  if (neu.length === 0) return undefined;
  return neu.length === 1 ? { merke: neu[0] } : { merke: neu[0], weitere: neu.slice(1) };
}

// ================================================================ Geheimnisse und Pfade

export const GEHEIMNISSE = [
  ['Shopify-Token (shpat_/shpss_)', /\bshp(?:at|ss|ca|pa)_[0-9a-f]{32}\b/i],
  ['Stripe-Schlüssel (sk_live_/rk_live_)', /\b[rs]k_live_[A-Za-z0-9]{16,}/],
  ['Groq-Schlüssel (gsk_)', /\bgsk_[A-Za-z0-9]{30,}/],
  ['Google-API-Schlüssel (AIza)', /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/],
  ['GitHub-Token (ghp_/gho_/…)', /\bgh[pousr]_[A-Za-z0-9]{36,}/],
  ['GitHub-Token (github_pat_)', /\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ['Slack-Token (xox…)', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['privater Schlüssel (PEM)', /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/],
  // Zusatz gegenüber dem Claude-Mod (Codex läuft mit OpenAI-Zugang):
  ['OpenAI/Anthropic-Schlüssel (sk-proj-/sk-ant-)', /\bsk-(?:(?:proj|ant|svcacct|admin|None)-[A-Za-z0-9_-]{30,}|[A-Za-z0-9]{48}\b)/],
  ['AWS-Zugangsschlüssel (AKIA)', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
];

/** Urteil über Text, der in eine Datei geschrieben werden soll. Marker `luxe-geheim-ok` erlaubt Testdaten.
 *  `umfeld`: sichtbarer Rest der Datei (Kontextzeilen eines Patches), in dem der Marker ebenfalls gilt. */
export function pruefeInhalt(text, umfeld = '') {
  if (!text || text.includes('luxe-geheim-ok') || String(umfeld ?? '').includes('luxe-geheim-ok')) return undefined;
  for (const [name, muster] of GEHEIMNISSE) {
    if (muster.test(text)) {
      return { deny: `Das sieht nach einem echten Geheimnis aus (${name}). Projektregel: keine Geheimnisse ins Repo, Zugänge liegen in der Umgebung. Wenn es ein erfundener Testwert ist, schreibe "luxe-geheim-ok" in einen Kommentar der Datei.` };
    }
  }
  return undefined;
}

/** Urteil über den Zielpfad einer Datei (Anlegen oder Ändern; Löschen und Lesen prüft niemand). */
export function pruefePfad(pfad) {
  if (/(^|[\\/])_SOCIAL_STOPP$/.test(String(pfad ?? '').trim())) {
    return { deny: 'dropship/_SOCIAL_STOPP wird nie neu angelegt (Vorgabe des Besitzers). Löschen ist erlaubt, Anlegen nicht. Einen Ausweg per Variable gibt es dafür nicht: nur der Besitzer legt die Datei an.' };
  }
  return undefined;
}
