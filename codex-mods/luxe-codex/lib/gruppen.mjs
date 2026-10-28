/**
 * Reine Erkennung des Schreibzählers (Codex-Fassung von luxe-schreibzaehler/gruppen.ts): welcher Aufruf zählt
 * als schreibender Zugriff nach aussen, in welche Gruppe, und war er erfolgreich? Kein Zustand, kein Netz,
 * damit sich jede Regel in BEIDE Richtungen einzeln testen lässt (graphql_mutation zählt, graphql_query nie).
 *
 * Vier Gruppen: shop, social, mail (nach dem Namen des MCP-Werkzeugs, wie im Claude-Code-Mod) und neu «live»:
 * ein Shell-Befehl mit der Zuweisung LIVE=1, dessen Erfolg der Exit-Code BEWEIST. Unbekanntes wird nicht gezählt, nicht geraten.
 * Die Shell-Erkennung steht in shell_live.mjs; was sie «beweisbar» nennt, steht dort im Kopf: eine Pipe hinter dem Befehl
 * (ohne pipefail), «|| true», ein weiterer Befehl nach «;» oder eine Schleife verdecken den Exit-Code, dann zählt der Lauf NICHT
 * (gewollt: lieber ein Lauf zu wenig als ein gescheiterter, der als «Live» erscheint).
 *
 * Was Codex den Hooks tatsächlich meldet, ist NICHT bestätigt (bis zu einem echten Lauf):
 *  - Werkzeugname: Kandidaten exec_command, shell, local_shell, shell_command, Bash, exec (JavaScript, das
 *    tools.exec_command aufruft), apply_patch, mcp__<server>__<werkzeug>. Darum entscheidet für «live» die FORM
 *    der Eingabe (ein Feld cmd oder command, ein Aufruf exec_command({cmd: "…"}) im Code), nicht der Name; ein Patch
 *    («*** Begin Patch») und der Inhalt einer Dateischreib-Eingabe sind nie ein Befehl.
 *  - Antwortform (tool_response): unbekannt. `ausgang` kennt mehrere Formen und sagt bei allem anderen «unbekannt».
 *  - Servernamen der MCP-Werkzeuge wählt in Codex der Nutzer (config.toml): Gross-/Kleinschreibung und «-» gegen
 *    «_» werden darum nicht unterschieden (Abweichung vom Claude-Code-Mod, dort stehen die Namen der Konnektoren fest).
 */
import { analysiere, istLiveBefehl, shellOptionen } from './shell_live.mjs';

export { istLiveBefehl };

export const GRUPPEN = Object.freeze(['shop', 'social', 'mail', 'live']);

const BESCHRIFTUNG = Object.freeze({ shop: 'Shop', social: 'Social', mail: 'Mail', live: 'Live' });

// Die Muster sind absichtlich am Anfang UND am Ende verankert: ohne Verankerung träfe createScheduledPost auch
// createScheduledPostForReview (nur ein Entwurf zur Prüfung, der nichts veröffentlicht).
// «ausser» nimmt Werkzeuge aus einer Regel heraus, die zwar so enden, aber nur Berichte, Prüfungen oder Vorschauen anlegen.
const REGELN = [
  // Shopify: Mutationen und die schreibenden Werkzeuge (create-, update-, bulk-update-, publish-, upload-, import-, …).
  { gruppe: 'shop', server: /^shopify$/, werkzeug: /^(?:graphql_mutation|add_to_collection|set_inventory|(?:create|update|bulk_update|publish|upload|import)_[a-z0-9_]+)$/ },
  // Metricool: der Servername trägt im Konnektor einen Zusatz (Metricool_Social_Media_Management).
  { gruppe: 'social', server: /^metricool(?:_[a-z0-9_]*)?$/, werkzeug: /^(?:createscheduledpost|updatescheduledpost|sendscheduledpostforreview)$/ },
  // TikTok Ads: Namen, die auf ein Schreibwort enden (anlegen, ändern, löschen, hochladen, verschieben, einladen, zuweisen,
  // einspruch einlegen, kündigen, verknüpfen …); status_update gehört dazu. Berichts- und Prüfaufträge (…_task_create, …_task_cancel,
  // ausser dem Kopieren einer Kampagne) und Vorschauen legen nichts Sichtbares an.
  {
    gruppe: 'social',
    server: /^tiktok_ads$/,
    werkzeug: /^(?:[a-z0-9_]+_(?:create|update|delete|upload|transfer|invite|assign|unassign|appeal|cancel|operate|disable|add|apply|bind|unbind|link|save|confirm|migrate)|split_test_promote_run)$/,
    ausser: w => (/_task_(?:create|cancel)$/.test(w) && w !== 'campaign_copy_task_create') || w === 'creative_ads_preview_create',
  },
  { gruppe: 'social', server: /^vidiq$/, werkzeug: /^vidiq_instagram_publish_reel$/ },
  // Mail: nur was wirklich verschickt oder den Versand an Empfänger plant. Ein Entwurf (create_draft) verlässt das Postfach nicht.
  { gruppe: 'mail', server: /^gmail$/, werkzeug: /^(?:send_message|reply|forward)$/ },
  { gruppe: 'mail', server: /^klaviyo$/, werkzeug: /^(?:send_campaign|schedule_campaign_message)$/ },
];

const glatt = s => s.toLowerCase().replace(/-/g, '_');

/** Zerlegt mcp__<server>__<werkzeug> (beide Teile geglättet); `undefined`, wenn der Name nicht diese Form hat. */
function mcpTeile(name) {
  const m = /^mcp__(.+?)__(.+)$/s.exec(String(name ?? ''));
  return m ? { server: glatt(m[1]), werkzeug: glatt(m[2]) } : undefined;
}

/** Die Gruppe, in die ein MCP-Werkzeugname zählt; `undefined`, wenn der Aufruf nie zählt. */
export function gruppeVon(tool) {
  const t = mcpTeile(tool);
  if (!t) return undefined;
  return REGELN.find(r => r.server.test(t.server) && r.werkzeug.test(t.werkzeug) && !r.ausser?.(t.werkzeug))?.gruppe;
}

export function leererZaehler() {
  return { shop: 0, social: 0, mail: 0, live: 0 };
}

/** Ein Aufruf mehr in `gruppe`. Ein fehlender oder kaputter Stand zählt als 0; der alte Stand bleibt unverändert. */
export function zaehleHoch(stand, gruppe) {
  const z = leererZaehler();
  for (const g of GRUPPEN) {
    const alt = stand?.[g];
    z[g] = typeof alt === 'number' && Number.isFinite(alt) && alt > 0 ? Math.floor(alt) : 0;
  }
  if (GRUPPEN.includes(gruppe)) z[gruppe] += 1;
  return z;
}

/** Die Zeile der Statuszeile: nur Gruppen mit Zugriffen, immer in der Reihenfolge Shop, Social, Mail, Live. */
export function statusText(stand) {
  const teile = GRUPPEN.flatMap(g => {
    const n = stand?.[g];
    return typeof n === 'number' && n > 0 ? [`${BESCHRIFTUNG[g]} ${n}`] : [];
  });
  return `Schreibzugriffe · ${teile.length > 0 ? teile.join(' · ') : 'keine'}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Ausgang eines Aufrufs: aus der Antwort (tool_response) lesen, ob er gelungen ist.
// ---------------------------------------------------------------------------------------------------------------

const ganzeZahl = w => {
  if (typeof w === 'number' && Number.isInteger(w)) return w;
  if (typeof w === 'string' && /^-?\d+$/.test(w.trim())) return Number(w.trim());
  return undefined;
};

// Kopf der Textantwort der Shell-Werkzeuge. Nur wenn der Text damit BEGINNT und nur der Teil vor «Output:» zählt,
// damit eine Ausgabe, die selbst «Process exited with code 0» druckt, nichts vortäuschen kann.
const KOPF_BEGINN = /^(?:Chunk ID:|Wall time:|Exit code:|Process exited with code|Process running)/;

// `streng`: für Textfelder INNERHALB eines Objekts (output, stdout, content[].text). Dort kann rohe Programmausgabe stehen,
// die selbst mit «Exit code: 1» beginnt; als Kopf gilt nur ein Text, der den Kopf von der Ausgabe mit «Output:» trennt (so
// formatiert Codex die Antwort der Shell). Ein ganzer Antworttext (kein Feld) bleibt wie bisher auch ohne «Output:» lesbar.
function kopfAusgang(text, streng = false) {
  if (!KOPF_BEGINN.test(text)) return 'unbekannt';
  if (streng && !/\r?\nOutput:/.test(text)) return 'unbekannt';
  const kopf = text.split(/\r?\nOutput:/, 1)[0];
  const m = /^(?:Process exited with code|Exit code:)\s*(-?\d+)\s*$/m.exec(kopf);
  if (!m) return 'unbekannt';
  return Number(m[1]) === 0 ? 'erfolg' : 'fehler';
}

/**
 * 'erfolg' | 'fehler' | 'unbekannt'. Ein Fehlerzeichen gewinnt immer gegen ein Erfolgszeichen. Erfolg ist NUR
 * ein Exit-Code 0 oder success:true; «isError:false» allein beweist bei einer Shell nichts und ist 'unbekannt'.
 * Erkannte Formen: Objekt mit exit_code/exitCode, success, isError/is_error, error, interrupted, timed_out/timedOut,
 * dazu metadata/result/response verschachtelt; JSON-Text solcher Objekte; Textantwort mit Kopf
 * («Process exited with code N», «Exit code: N»); MCP-Inhalte {content:[{type:'text',text}]}. Ein Kopf in einem Textfeld des
 * Objekts (output, stdout, content[].text) gilt nur mit «Output:» dahinter (rohe Programmausgabe ist kein Kopf).
 */
export function ausgang(antwort, tiefe = 0) {
  if (tiefe > 3 || antwort === null || antwort === undefined) return 'unbekannt';
  if (typeof antwort === 'string') {
    const t = antwort.trim();
    if (t.startsWith('{')) {
      try {
        const o = JSON.parse(t);
        if (o && typeof o === 'object' && !Array.isArray(o)) return ausgang(o, tiefe + 1);
      } catch { /* kein JSON: als Text weiterlesen */ }
    }
    return kopfAusgang(antwort);
  }
  if (Array.isArray(antwort)) return antwort.some(x => x && typeof x === 'object' && (x.isError === true || x.is_error === true)) ? 'fehler' : 'unbekannt';
  if (typeof antwort !== 'object') return 'unbekannt';

  const zeichen = [];
  const code = ganzeZahl(antwort.exit_code ?? antwort.exitCode);
  if (code !== undefined) zeichen.push(code === 0 ? 'erfolg' : 'fehler');
  if (antwort.success === true) zeichen.push('erfolg');
  if (antwort.success === false) zeichen.push('fehler');
  if (antwort.isError === true || antwort.is_error === true) zeichen.push('fehler');
  if (antwort.interrupted === true || antwort.timed_out === true || antwort.timedOut === true) zeichen.push('fehler');
  const fehler = antwort.error;
  if ((typeof fehler === 'string' && fehler.trim() !== '') || (fehler && typeof fehler === 'object')) zeichen.push('fehler');
  for (const k of ['metadata', 'result', 'response']) {
    const v = antwort[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) zeichen.push(ausgang(v, tiefe + 1));
  }
  for (const k of ['output', 'stdout']) if (typeof antwort[k] === 'string') zeichen.push(kopfAusgang(antwort[k], true));
  if (Array.isArray(antwort.content)) {
    for (const teil of antwort.content) if (teil && typeof teil.text === 'string') zeichen.push(kopfAusgang(teil.text, true));
  }
  if (zeichen.includes('fehler')) return 'fehler';
  return zeichen.includes('erfolg') ? 'erfolg' : 'unbekannt';
}

// ---------------------------------------------------------------------------------------------------------------
// «live»: Shell-Befehl mit LIVE=1 (die Erkennung selbst steht in shell_live.mjs)
// ---------------------------------------------------------------------------------------------------------------

const SHELLNAMEN = new Set(['exec_command', 'shell', 'local_shell', 'shell_command', 'container.exec', 'Bash', 'bash']);
const SHELL_PROGRAMM = /^(?:ba|z|da|k)?sh$/;

// Ein Patch im Codex-Format ist nie ein Shell-Befehl, auch wenn er in einem Feld command steht oder Beispiele für Befehle enthält.
const istPatch = s => /^\s*\*\*\* Begin Patch[ \t]*(?:\r?\n|$)/.test(s);
// Felder, in denen der Code des Code-Modus (Werkzeug «exec») stehen kann. Der Inhalt einer Datei (content, new_string, text …) gehört nicht dazu.
const CODE_FELDER = new Set(['code', 'input', 'source', 'src', 'js', 'javascript', 'program', 'script', 'expression']);
const RUFT_EXEC = /\bexec_command\s*\(/;

/**
 * Ein argv-Feld ({command: ["bash","-lc","…"]}) als Shell-Text: bei «sh -c» mit einfachen Optionen das Skript selbst, sonst alle
 * Wörter, Zuweisungen unzitiert (so bleiben «env LIVE=1 node …» und «bash -o pipefail -lc …» für die Erkennung lesbar).
 */
function argvBefehl(argv) {
  if (SHELL_PROGRAMM.test(argv[0].replace(/^.*\//, ''))) {
    const r = shellOptionen(argv.slice(1));
    if (r.index !== -1 && r.einfach) return argv[1 + r.index];
  }
  return argv.map(a => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`)).join(' ');
}

// --- Code des Code-Modus: tools.exec_command({ cmd: "…" }) ---------------------------------------------------------

/** Liest ein Zeichenketten-Literal ab text[i] (Anführungszeichen ' " oder `); { ende, literal } oder undefined, wenn es nicht schliesst. */
function leseLiteral(text, i) {
  const q = text[i];
  for (let j = i + 1; j < text.length; j += 1) {
    const c = text[j];
    if (c === '\\') { j += 1; continue; }
    if (c === q) return { ende: j + 1, literal: text.slice(i, j + 1) };
    if (c === '\n' && q !== '`') return undefined;
  }
  return undefined;
}

/** Überspringt einen Ausdruck bis zum nächsten Komma oder zur schliessenden Klammer auf oberster Ebene; gibt die Stelle dort zurück. */
function ueberspringeAusdruck(text, i) {
  let tiefe = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') { const l = leseLiteral(text, i); if (!l) return text.length; i = l.ende; continue; }
    if (c === '(' || c === '[' || c === '{') tiefe += 1;
    else if (c === ')' || c === ']' || c === '}') { if (tiefe === 0) return i; tiefe -= 1; }
    else if (c === ',' && tiefe === 0) return i;
    i += 1;
  }
  return i;
}

function entschluessele(literal) {
  const innen = literal.slice(1, -1);
  if (literal[0] === '`' && innen.includes('${')) return undefined; // Platzhalter: der Befehl steht nicht fest
  return innen.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, k) => {
    if (k.length > 1) return String.fromCharCode(parseInt(k.slice(1), 16));
    return { n: '\n', t: '\t', r: '\r' }[k] ?? (k === '\n' ? '' : k);
  });
}

/**
 * Die festen Befehle aus Aufrufen `exec_command({ …, cmd: "…", … })` im Quelltext: nur das Literal der Eigenschaft cmd im
 * Objekt DIESES Aufrufs (Zeichenketten mit Klammern, andere Eigenschaften davor und danach sind in Ordnung). Variablen,
 * Verkettungen mit + und Platzhalter in Template-Literalen sind unbekannt und liefern nichts.
 */
function jsBefehle(quelle) {
  const aus = [];
  let aufrufe = 0;
  for (const m of quelle.matchAll(/\bexec_command\s*\(\s*\{/g)) {
    // Höchstens 50 Aufrufe je Text und je Aufruf ein Fenster von 1 MB: ein Text voller «exec_command({» ohne Ende bleibt so linear.
    if ((aufrufe += 1) > 50) break;
    const text = quelle.slice(m.index + m[0].length, m.index + m[0].length + 1_000_000);
    let i = 0;
    for (let n = 0; n < 40 && i < text.length; n += 1) {
      while (i < text.length && /[\s,]/.test(text[i])) i += 1;
      if (i >= text.length || text[i] === '}') break;
      let schluessel;
      if (text[i] === '"' || text[i] === "'") {
        const l = leseLiteral(text, i);
        if (!l) break;
        schluessel = l.literal.slice(1, -1);
        i = l.ende;
      } else {
        const k = /^[A-Za-z_$][\w$]*/.exec(text.slice(i, i + 64));
        if (!k) { const weiter = ueberspringeAusdruck(text, i); if (weiter === i) break; i = weiter; continue; }
        schluessel = k[0];
        i += k[0].length;
      }
      while (i < text.length && /\s/.test(text[i])) i += 1;
      if (text[i] !== ':') { const weiter = ueberspringeAusdruck(text, i); if (weiter === i) break; i = weiter; continue; } // Kurzschreibweise: Wert unbekannt
      i += 1;
      while (i < text.length && /\s/.test(text[i])) i += 1;
      if (text[i] === '"' || text[i] === "'" || text[i] === '`') {
        const l = leseLiteral(text, i);
        if (l) {
          let k = l.ende;
          while (k < text.length && /\s/.test(text[k])) k += 1;
          if (text[k] === ',' || text[k] === '}') {
            if (schluessel === 'cmd') { const b = entschluessele(l.literal); if (b !== undefined) aus.push(b); }
            i = k;
            continue;
          }
        }
      }
      const weiter = ueberspringeAusdruck(text, i);
      if (weiter === i) break;
      i = weiter;
    }
  }
  return aus;
}

/** Zeichenketten, die Code des Code-Modus sein können: Felder wie code/input/source (nie cmd/command), Listen erben den Schlüssel. */
function codeTexte(eingabe) {
  const aus = [];
  const geh = (w, schluessel, tiefe) => {
    if (tiefe > 8 || aus.length > 400 || w === null || w === undefined) return;
    if (typeof w === 'string') { if (CODE_FELDER.has(schluessel) && !istPatch(w)) aus.push(w); return; }
    if (Array.isArray(w)) { for (const x of w) geh(x, schluessel, tiefe + 1); return; }
    if (typeof w === 'object') for (const [k, v] of Object.entries(w)) if (k !== 'cmd' && k !== 'command') geh(v, k, tiefe + 1);
  };
  geh(eingabe, '', 0);
  return aus;
}

/**
 * Die Shell-Texte, die ein Aufruf ausführt, erkannt an der FORM der Eingabe: ein Feld `cmd` oder `command`
 * (Text oder Liste, auch verschachtelt wie {action:{command:[…]}}) oder JavaScript, das exec_command({cmd: "…"})
 * aufruft (Code-Modus: Feld code/input/…, oder die Eingabe selbst als Text). Ein reiner Text als Eingabe gilt nur bei einem
 * bekannten Shell-Namen als Befehl (sonst könnte es ein Patch sein). Patches, Dateiinhalte und MCP-Werkzeuge liefern nie
 * Shell-Texte: das blosse Wort «exec_command» in einem Commit-Text, einem Heredoc oder einer Datei macht keinen Befehl.
 */
export function befehleAus(name, eingabe) {
  const n = String(name ?? '');
  if (n.startsWith('mcp__')) return [];
  const aus = [];
  const sammle = (w, tiefe = 0) => {
    if (tiefe > 3 || !w || typeof w !== 'object' || Array.isArray(w)) return;
    for (const [k, v] of Object.entries(w)) {
      if (k === 'cmd' || k === 'command') {
        if (typeof v === 'string') { if (!istPatch(v)) aus.push(v); } else if (Array.isArray(v) && v.length > 0 && v.every(x => typeof x === 'string')) aus.push(argvBefehl(v));
      } else if (v && typeof v === 'object') sammle(v, tiefe + 1);
    }
  };
  sammle(eingabe);
  if (typeof eingabe === 'string') {
    if (istPatch(eingabe)) return aus;
    if (SHELLNAMEN.has(n) && !RUFT_EXEC.test(eingabe)) aus.push(eingabe);
    else aus.push(...jsBefehle(eingabe));
  } else {
    for (const t of codeTexte(eingabe)) aus.push(...jsBefehle(t));
  }
  return aus;
}

/**
 * Die Gruppe, in die dieser fertige Aufruf zählt, oder `undefined`.
 *  - MCP-Werkzeug nach Name: zählt, solange die Antwort keinen Fehler zeigt (wie im Claude-Code-Mod).
 *  - live: nur bei erkanntem Erfolg ('erfolg') UND wenn der Exit-Code den Erfolg des LIVE-Befehls beweist (nicht hinter einer Pipe,
 *    einem «||», einem weiteren Befehl nach «;» oder in einer Schleife); eine unbekannte Antwortform zählt NICHT.
 */
export function gruppeFuer(name, eingabe, antwort) {
  const g = gruppeVon(name);
  if (g) return ausgang(antwort) === 'fehler' ? undefined : g;
  if (ausgang(antwort) === 'erfolg' && befehleAus(name, eingabe).some(b => analysiere(b).beweisbar)) return 'live';
  return undefined;
}
