/**
 * Reine Regeln der Leitplanken: kein Netz, kein Zustand, damit sie sich einzeln testen lassen.
 * Port von luxe-leitplanken/hooks/regeln.ts (Claude-Code-Mod); dieselben Regeln, dieselben Gründe.
 *
 * Jede Regel steht für eine Lehre, die im Projektgedächtnis (CLAUDE.md) schon einmal Zeit oder Geld
 * gekostet hat. Eine Leitplanke ist keine Sicherheitsgrenze, sondern eine Gedächtnisstütze, die nicht
 * vergisst: jede hat darum einen ausdrücklichen Ausweg (LUXE_*_OK=1 im Befehl), der nur nach dem
 * ausdrücklichen Ja des Besitzers in DIESEM Chat benutzt wird.
 *
 * Abweichungen vom Claude-Mod (alle in test/leitplanken_test.mjs in beide Richtungen gemessen):
 *   - `LIVE=1`, `LUXE_*_OK=1` gelten auch vor `;`, `&`, `|`, `)` (z. B. `export LIVE=1; node …`); sonst
 *     würde ein scharfer Lauf als Trockenlauf gemerkt.
 *   - `git -C <pfad> push|add` und `git add ./` werden erkannt (der Claude-Mod sah nur `git push|add`).
 *   - `_SOCIAL_STOPP` zählt nur als genauer Dateiname (nicht `x_SOCIAL_STOPP`, nicht `_SOCIAL_STOPP.bak`);
 *     ein Pfad in Anführungszeichen ohne Leerzeichen bleibt sichtbar.
 *   - `node --check`, `bash -n`, `py_compile` merken sich KEINEN Trockenlauf (das Skript läuft dabei nie).
 *   - `pkill`/`killall` als blosses Wort hinter einem Lese-/Suchbefehl (`rg pkill`, `grep -rn killall .`, `echo pkill`) ist kein Treffer.
 *   - Zusätzliche Geheimnis-Muster: OpenAI/Anthropic-Schlüssel (sk-proj-/sk-ant-) und AWS (AKIA).
 *   - Bei Schreibwegen prüft `pruefeInhalt` den Marker `luxe-geheim-ok` auch im sichtbaren Umfeld der Datei.
 */

/** Entfernt Heredocs und den Inhalt von Anführungszeichen, damit eine Commit-Nachricht, die einen
 *  Befehl nur ZITIERT, nicht wie dieser Befehl behandelt wird. */
export function ohneText(befehl) {
  return String(befehl ?? '')
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, ' ')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'[^']*'/g, "''");
}

/**
 * Wie ohneText, aber ein Wort in Anführungszeichen ohne Leerzeichen bleibt sichtbar (`touch "dropship/_SOCIAL_STOPP"`).
 * Nur für die Pfadregel; alles mit Leerzeichen (Nachrichten, Skripte) bleibt unsichtbar.
 */
export function ohneTextAusserPfaden(befehl) {
  return String(befehl ?? '')
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, ' ')
    .replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, m => (/^[^\s"'\\$`;&|<>()]+$/.test(m.slice(1, -1)) ? ` ${m.slice(1, -1)} ` : `${m[0]}${m[0]}`));
}

// Die beiden Arten von Optionen schliessen sich aus (`-C`/`-c` MIT Wert, sonst jede Option): sonst wächst die Suche bei `git -C -C -C …` exponentiell.
const GIT = String.raw`\bgit\s+(?:(?:-[Cc]\s+\S+|-(?![Cc](?:\s|$))\S+)\s+)*`;
const FORCE = new RegExp(String.raw`${GIT}push\b[^\n;&|]*?(?:\s--force(?:-with-lease|-if-includes)?\b|\s-f\b|\s\+[^\s:])`);
const SELBSTMORD = /(?:^|\s)(?:pkill|killall)\b/;
/** Wer nur liest, sucht oder ausgibt, beendet nichts: `rg pkill`, `ps aux | grep killall`, `echo pkill`. */
const LESER = /^\s*(?:rg|grep|egrep|fgrep|ag|ack|git\s+grep|sed|awk|cat|echo|printf|head|tail|less|man|which|whereis|type|ls|wc|diff|find)\b/;
/** pkill/killall als Befehl irgendwo in einer Befehlskette (je einfachem Befehl geprüft). */
const killt = b => b.split(/[;&|(`\n]+/).some(teil => SELBSTMORD.test(teil) && !LESER.test(teil));
const ADD_ALLES = new RegExp(String.raw`${GIT}add\b[^\n;&|]*?(?:\s-A\b|\s--all\b|\s\.\/?(?=[\s;&|)]|$)|\s\*)`);
const SOCIAL_NEU = /(?:\b(?:touch|tee|cp|mv|install|ln)\b[^\n;&|]*|>>?\s*\S*)(?<![\w-])_SOCIAL_STOPP(?![\w.-])/;
const LIVE = /(?:^|[\s;&|(])LIVE=1(?=[\s;&|)]|$)/;
const SKRIPT = /\b((?:automation|dropship|tools)\/[\w./-]+\.(?:mjs|js|py|sh))\b/;
const STARTER = /\b(?:node|python3?|bash|sh)\b/;
/** Prüfläufe, bei denen das Skript nie ausgeführt wird: sie sind KEIN Trockenlauf. */
const NUR_PRUEFUNG = /\s--check\b|\bpy_compile\b|\b(?:ba|z)?sh\s+-n\b/;

/** Die Auswege, die im Befehl stehen dürfen. */
export const AUSWEGE = ['LUXE_FORCE_OK', 'LUXE_KILL_OK', 'LUXE_ADD_OK', 'LUXE_LIVE_OK'];

const hat = (befehl, ausweg) => new RegExp(`(?:^|[\\s;&|(])${ausweg}=1(?=[\\s;&|)]|$)`).test(befehl);

/**
 * Die Umgebungsbelegungen eines Befehls, die für ein umhülltes Skript (`bash -lc "…"`) mitgelten:
 * `LIVE=1` (nur ausserhalb von Anführungszeichen) und jeder Ausweg. Sonst würde `LIVE=1 bash -c "node x"`
 * als Trockenlauf gemerkt, und `LUXE_FORCE_OK=1 bash -c "git push -f"` ginge nicht durch.
 */
export function umgebungsAnteile(befehl) {
  const roh = String(befehl ?? '');
  const aus = [];
  if (LIVE.test(ohneText(roh))) aus.push('LIVE=1');
  for (const n of AUSWEGE) if (hat(roh, n)) aus.push(`${n}=1`);
  return aus;
}

/** Urteil über einen Shell-Befehl. `trocken`: Skripte, die in dieser Sitzung ohne LIVE=1 gelaufen sind.
 *  Ergebnis: `{ deny: grund }`, `{ merke: skript }` (Trockenlauf merken) oder `undefined`. */
export function pruefeBash(befehl, trocken = []) {
  const roh = String(befehl ?? '');
  const b = ohneText(roh);
  const gesehen = new Set(trocken);

  if (FORCE.test(b) && !hat(roh, 'LUXE_FORCE_OK')) {
    return { deny: 'Force-Push gesperrt (Projektregel: nie Force-Push, auch nicht "nur kurz"). Er überschreibt fremde Arbeit und der Hetzner-Agent schreibt auf Branches mit. Nimm einen neuen Branch von origin/main. Nur nach dem AUSDRÜCKLICHEN Ja des Besitzers in diesem Chat: LUXE_FORCE_OK=1 voranstellen.' };
  }
  if (killt(b) && !hat(roh, 'LUXE_KILL_OK')) {
    return { deny: 'pkill/killall gesperrt: ein Muster, das den eigenen Befehl trifft, beendet die eigene Shell (Exit 144, so passiert). Nimm eine PID-Liste (pgrep, dann kill <PID>) oder den Klammer-Trick pgrep -f "[l]aufen.py". Ausweg: LUXE_KILL_OK=1.' };
  }
  if (ADD_ALLES.test(b) && !hat(roh, 'LUXE_ADD_OK')) {
    return { deny: 'git add -A / git add . gesperrt: so kam ein Playwright-Symlink (node_modules_pw) ins Repo und legte den Deploy lahm. Erst git status lesen, dann Dateien einzeln benennen. Ausweg: LUXE_ADD_OK=1.' };
  }
  if (SOCIAL_NEU.test(ohneTextAusserPfaden(roh))) {
    return { deny: 'dropship/_SOCIAL_STOPP wird nie neu angelegt (Vorgabe des Besitzers). Löschen ist erlaubt, Anlegen nicht. Einen Ausweg per Variable gibt es dafür nicht: nur der Besitzer legt die Datei an.' };
  }
  const live = LIVE.test(b);
  if (live && !hat(roh, 'LUXE_LIVE_OK')) {
    const s = SKRIPT.exec(b)?.[1];
    if (s && !gesehen.has(s)) {
      return { deny: `LIVE=1 für ${s} ohne Trockenlauf in dieser Sitzung gesperrt (Projektregel: Massen-Schreiber nur mit Trockenlauf; ein zu breites Muster sieht aus wie ein anderes Ergebnis, nicht wie ein Fehler). Erst ohne LIVE=1 laufen lassen, die Zahlen je Grund lesen, dann scharf. Ausweg: LUXE_LIVE_OK=1.` };
    }
  }
  // Ein Lauf OHNE LIVE=1 merkt sich das Skript als gesehenen Trockenlauf (ausser reinen Prüfläufen).
  if (!live && STARTER.test(b) && !NUR_PRUEFUNG.test(b)) {
    const s = SKRIPT.exec(b)?.[1];
    if (s && !gesehen.has(s)) return { merke: s };
  }
  return undefined;
}

export const GEHEIMNISSE = [
  ['Shopify-Token (shpat_/shpss_)', /\bshp(?:at|ss|ca|pa)_[0-9a-f]{32}\b/i],
  ['Stripe-Schlüssel (sk_live_/rk_live_)', /\b[rs]k_live_[A-Za-z0-9]{16,}/],
  ['Groq-Schlüssel (gsk_)', /\bgsk_[A-Za-z0-9]{30,}/],
  ['Google-API-Schlüssel (AIza)', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['GitHub-Token (ghp_/gho_/…)', /\bgh[pousr]_[A-Za-z0-9]{36,}/],
  ['GitHub-Token (github_pat_)', /\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ['Slack-Token (xox…)', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['privater Schlüssel (PEM)', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  // Zusatz gegenüber dem Claude-Mod (Codex läuft mit OpenAI-Zugang):
  ['OpenAI/Anthropic-Schlüssel (sk-proj-/sk-ant-)', /\bsk-(?:proj|ant|svcacct)-[A-Za-z0-9_-]{30,}/],
  ['AWS-Zugangsschlüssel (AKIA)', /\bAKIA[0-9A-Z]{16}\b/],
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
