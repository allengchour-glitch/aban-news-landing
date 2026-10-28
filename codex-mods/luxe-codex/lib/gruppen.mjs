/**
 * Reine Erkennung des Schreibzählers (Codex-Fassung von luxe-schreibzaehler/gruppen.ts): welcher Aufruf zählt
 * als schreibender Zugriff nach aussen, in welche Gruppe, und war er erfolgreich? Kein Zustand, kein Netz,
 * damit sich jede Regel in BEIDE Richtungen einzeln testen lässt (graphql_mutation zählt, graphql_query nie).
 *
 * Vier Gruppen: shop, social, mail (nach dem Namen des MCP-Werkzeugs, wie im Claude-Code-Mod) und neu «live»:
 * ein Shell-Befehl mit der Zuweisung LIVE=1, der erfolgreich war. Unbekanntes wird nicht gezählt, nicht geraten.
 *
 * Was Codex den Hooks tatsächlich meldet, ist NICHT bestätigt (bis zu einem echten Lauf):
 *  - Werkzeugname: Kandidaten exec_command, shell, local_shell, shell_command, Bash, exec (JavaScript, das
 *    tools.exec_command aufruft), apply_patch, mcp__<server>__<werkzeug>. Darum entscheidet für «live» die FORM
 *    der Eingabe (ein Feld cmd oder command), nicht der Name.
 *  - Antwortform (tool_response): unbekannt. `ausgang` kennt mehrere Formen und sagt bei allem anderen «unbekannt».
 *  - Servernamen der MCP-Werkzeuge wählt in Codex der Nutzer (config.toml): Gross-/Kleinschreibung und «-» gegen
 *    «_» werden darum nicht unterschieden (Abweichung vom Claude-Code-Mod, dort stehen die Namen der Konnektoren fest).
 */
import { texteIn } from './hook_io.mjs';

export const GRUPPEN = Object.freeze(['shop', 'social', 'mail', 'live']);

const BESCHRIFTUNG = Object.freeze({ shop: 'Shop', social: 'Social', mail: 'Mail', live: 'Live' });

// Die Muster sind absichtlich am Anfang UND am Ende verankert: ohne Verankerung träfe createScheduledPost auch
// createScheduledPostForReview (nur ein Entwurf zur Prüfung, der nichts veröffentlicht).
const REGELN = [
  // Shopify: Mutationen und die schreibenden Werkzeuge (create-, update-, bulk-update-, publish-, …).
  { gruppe: 'shop', server: /^shopify$/, werkzeug: /^(?:graphql_mutation|add_to_collection|set_inventory|(?:create|update|bulk_update|publish)_[a-z0-9_]+)$/ },
  // Metricool: der Servername trägt im Konnektor einen Zusatz (Metricool_Social_Media_Management).
  { gruppe: 'social', server: /^metricool(?:_[a-z0-9_]*)?$/, werkzeug: /^(?:createscheduledpost|updatescheduledpost|sendscheduledpostforreview)$/ },
  // TikTok Ads: Namen, die auf _create oder _update enden (status_update gehört dazu).
  { gruppe: 'social', server: /^tiktok_ads$/, werkzeug: /^[a-z0-9_]+_(?:create|update)$/ },
  { gruppe: 'social', server: /^vidiq$/, werkzeug: /^vidiq_instagram_publish_reel$/ },
  // Mail: nur was wirklich verschickt. Ein Entwurf (create_draft) verlässt das Postfach nicht.
  { gruppe: 'mail', server: /^gmail$/, werkzeug: /^(?:send_message|reply|forward)$/ },
  { gruppe: 'mail', server: /^klaviyo$/, werkzeug: /^send_campaign$/ },
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
  return REGELN.find(r => r.server.test(t.server) && r.werkzeug.test(t.werkzeug))?.gruppe;
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

function kopfAusgang(text) {
  if (!KOPF_BEGINN.test(text)) return 'unbekannt';
  const kopf = text.split(/\r?\nOutput:/, 1)[0];
  const m = /^(?:Process exited with code|Exit code:)\s*(-?\d+)\s*$/m.exec(kopf);
  if (!m) return 'unbekannt';
  return Number(m[1]) === 0 ? 'erfolg' : 'fehler';
}

/**
 * 'erfolg' | 'fehler' | 'unbekannt'. Ein Fehlerzeichen gewinnt immer gegen ein Erfolgszeichen. Erfolg ist NUR
 * ein Exit-Code 0 oder success:true; «isError:false» allein beweist bei einer Shell nichts und ist 'unbekannt'.
 * Erkannte Formen: Objekt mit exit_code/exitCode, success, isError/is_error, error, interrupted, timed_out,
 * dazu metadata/result/response verschachtelt; JSON-Text solcher Objekte; Textantwort mit Kopf
 * («Process exited with code N», «Exit code: N»); MCP-Inhalte {content:[{type:'text',text}]}.
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
  for (const k of ['output', 'stdout']) if (typeof antwort[k] === 'string') zeichen.push(kopfAusgang(antwort[k]));
  if (Array.isArray(antwort.content)) {
    for (const teil of antwort.content) if (teil && typeof teil.text === 'string') zeichen.push(kopfAusgang(teil.text));
  }
  if (zeichen.includes('fehler')) return 'fehler';
  return zeichen.includes('erfolg') ? 'erfolg' : 'unbekannt';
}

// ---------------------------------------------------------------------------------------------------------------
// «live»: Shell-Befehl mit LIVE=1 als Zuweisung vor dem Befehl (nicht als Text in Zitaten, Heredocs, Argumenten).
// ---------------------------------------------------------------------------------------------------------------

const TRENNER = new Set([';', '&', '|', '\n', '(', ')', '`']);
// Wörter, nach denen noch die Zuweisungen und der eigentliche Befehl kommen.
const RESERVIERT = new Set(['if', 'then', 'else', 'elif', 'do', 'while', 'until', '!', '{', 'time']);

/** Zerlegt einen Shell-Text in Befehlsabschnitte aus Wörtern {wert, zuweisung, gequotet} (Anführungszeichen, Escapes, Kommentare, Heredocs). */
function zerlege(befehl) {
  const text = String(befehl ?? '').replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n[ \t]*\2(?=\s|$)/g, ' ');
  const abschnitte = [[]];
  let wort = null;
  let modus = 'n';

  const fuege = (c, q) => {
    wort ??= { wert: '', zuweisung: false, name: true, gequotet: false };
    if (q) wort.gequotet = true;
    if (wort.name) {
      if (!q && c === '=' && wort.wert.length > 0) { wort.zuweisung = true; wort.name = false; }
      else if (q || !/[A-Za-z0-9_]/.test(c) || (wort.wert.length === 0 && /[0-9]/.test(c))) wort.name = false;
    }
    wort.wert += c;
  };
  const schliesse = () => { if (wort) { abschnitte.at(-1).push(wort); wort = null; } };
  const neuerAbschnitt = () => { schliesse(); if (abschnitte.at(-1).length > 0) abschnitte.push([]); };

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (modus === "'") { if (c === "'") modus = 'n'; else fuege(c, true); continue; }
    if (modus === '"') {
      if (c === '"') modus = 'n';
      else if (c === '\\' && i + 1 < text.length) fuege(text[++i], true);
      else fuege(c, true);
      continue;
    }
    if (c === "'" || c === '"') { modus = c; fuege('', true); continue; } // öffnendes Zitat: auch ein leeres «""» ist ein Wort
    if (c === '\\') {
      if (text[i + 1] === '\n') { i += 1; continue; }
      if (i + 1 < text.length) fuege(text[++i], true);
      continue;
    }
    if (c === '#' && !wort) { const e = text.indexOf('\n', i); if (e === -1) break; i = e - 1; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { schliesse(); continue; }
    if (TRENNER.has(c)) { neuerAbschnitt(); continue; }
    fuege(c, false);
  }
  schliesse();
  return abschnitte.filter(a => a.length > 0);
}

function abschnittIstLive(woerter, tiefe) {
  let i = 0;
  let live = false;
  let exportiert = false;
  let nachEnv = false;
  for (; i < woerter.length; i += 1) {
    const w = woerter[i];
    if (!w.gequotet && RESERVIERT.has(w.wert)) continue;
    if (w.zuweisung) { if (w.wert === 'LIVE=1') live = true; continue; }
    if (!w.gequotet && w.wert === 'env') { nachEnv = true; continue; }
    if (!w.gequotet && w.wert === 'export') { exportiert = true; continue; }
    if (nachEnv && !w.gequotet && w.wert.startsWith('-')) { if (w.wert === '-u' || w.wert === '--unset') i += 1; continue; }
    if (!w.gequotet && /^\d*[<>]\S+$/.test(w.wert)) continue; // Umleitung mit angehängtem Ziel vor dem Befehl
    break;
  }
  const hatBefehl = i < woerter.length;
  // Eine Zuweisung ohne Befehl wird nicht ausgeführt (und ohne export nicht weitergegeben): zählt nicht.
  if (live && (hatBefehl || exportiert)) return true;
  if (hatBefehl && tiefe < 2 && /^(?:ba|z|da|k)?sh$/.test(woerter[i].wert.replace(/^.*\//, ''))) {
    for (let j = i + 1; j < woerter.length - 1; j += 1) {
      if (/^-[a-zA-Z]*c[a-zA-Z]*$/.test(woerter[j].wert)) return istLiveBefehl(woerter[j + 1].wert, tiefe + 1);
      if (!woerter[j].wert.startsWith('-')) break;
    }
  }
  return false;
}

/** Läuft dieser Shell-Text mit LIVE=1 als Zuweisung vor einem Befehl (oder per export)? Zitate, Heredocs, Kommentare und Argumente zählen nicht. */
export function istLiveBefehl(befehl, tiefe = 0) {
  if (tiefe > 2) return false;
  return zerlege(befehl).some(a => abschnittIstLive(a, tiefe));
}

const SHELLNAMEN = new Set(['exec_command', 'shell', 'local_shell', 'shell_command', 'container.exec', 'Bash', 'bash']);

/** Ein argv-Feld ({command: ["bash","-lc","…"]}) als Shell-Text: bei «sh -c» das Skript, sonst die Wörter, Zuweisungen unzitiert. */
function argvBefehl(argv) {
  if (/^(?:ba|z|da|k)?sh$/.test(argv[0].replace(/^.*\//, ''))) {
    for (let j = 1; j < argv.length - 1; j += 1) {
      if (/^-[a-zA-Z]*c[a-zA-Z]*$/.test(argv[j])) return argv[j + 1];
      if (!argv[j].startsWith('-')) break;
    }
  }
  return argv.map(a => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`)).join(' ');
}

const CMD_LITERAL = /\bcmd["']?\s*:\s*("(?:[^"\\\n]|\\[\s\S])*"|'(?:[^'\\\n]|\\[\s\S])*'|`(?:[^`\\]|\\[\s\S])*`)/g;

function entschluessele(literal) {
  const innen = literal.slice(1, -1);
  if (literal[0] === '`' && innen.includes('${')) return undefined; // Platzhalter: der Befehl steht nicht fest
  return innen.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, k) => {
    if (k.length > 1) return String.fromCharCode(parseInt(k.slice(1), 16));
    return { n: '\n', t: '\t', r: '\r' }[k] ?? k;
  });
}

/**
 * Die Shell-Texte, die ein Aufruf ausführt, erkannt an der FORM der Eingabe: ein Feld `cmd` oder `command`
 * (Text oder Liste, auch verschachtelt wie {action:{command:[…]}}) oder JavaScript, das tools.exec_command({cmd: "…"})
 * aufruft. Ein reiner Text als Eingabe gilt nur bei einem bekannten Shell-Namen als Befehl (sonst könnte es ein Patch sein).
 * MCP-Werkzeuge liefern nie Shell-Texte (ihr Server ist unbekannt).
 */
export function befehleAus(name, eingabe) {
  const n = String(name ?? '');
  if (n.startsWith('mcp__')) return [];
  const aus = [];
  const sammle = (w, tiefe = 0) => {
    if (tiefe > 3 || !w || typeof w !== 'object' || Array.isArray(w)) return;
    for (const [k, v] of Object.entries(w)) {
      if (k === 'cmd' || k === 'command') {
        if (typeof v === 'string') aus.push(v);
        else if (Array.isArray(v) && v.length > 0 && v.every(x => typeof x === 'string')) aus.push(argvBefehl(v));
      } else if (v && typeof v === 'object') sammle(v, tiefe + 1);
    }
  };
  sammle(eingabe);
  for (const t of texteIn(eingabe)) {
    if (!/\bexec_command\b/.test(t)) continue;
    for (const m of t.matchAll(CMD_LITERAL)) {
      const b = entschluessele(m[1]);
      if (b !== undefined) aus.push(b);
    }
  }
  if (typeof eingabe === 'string' && SHELLNAMEN.has(n) && !/\bexec_command\b/.test(eingabe)) aus.push(eingabe);
  return aus;
}

/**
 * Die Gruppe, in die dieser fertige Aufruf zählt, oder `undefined`.
 *  - MCP-Werkzeug nach Name: zählt, solange die Antwort keinen Fehler zeigt (wie im Claude-Code-Mod).
 *  - live: nur bei erkanntem Erfolg ('erfolg'); eine unbekannte Antwortform zählt NICHT.
 */
export function gruppeFuer(name, eingabe, antwort) {
  const g = gruppeVon(name);
  if (g) return ausgang(antwort) === 'fehler' ? undefined : g;
  if (befehleAus(name, eingabe).some(b => istLiveBefehl(b)) && ausgang(antwort) === 'erfolg') return 'live';
  return undefined;
}
