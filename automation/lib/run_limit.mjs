// run_limit.mjs — EINE Auswertung für «wie viele Posts darf dieser Lauf?» (MAX_PER_RUN), 19.10.2026.
//
// ANLASS: Fünf Poster werteten die Variable mit  Math.max(1, parseInt(process.env.MAX_PER_RUN || 'N', 10) || N)  aus.
// GEMESSEN 19.10. (node -e, alter Ausdruck, Standard 1 | Standard 50 wie metricool-schedule):
//   «0» → 1 | 50 (!) · «abc» → 1 | 50 · «-3» → 1 | 1 · «2.5» → 2 | 2 · «5x» → 5 | 5 · «1e3» → 1 | 1 · «0x10» → 1 | 50 · «999…9» (20 Stellen) → 1e20.
// Eine Pause über die Variable war unmöglich — bei metricool-schedule.mjs plante «0» sogar 50 Posts —, ein Tippfehler postete
// trotzdem. Die Idee (0 = Pause, Müll = Fehler statt stiller Umdeutung) stammt aus dem Codex-PR #2673 (lib/social_queue.mjs,
// parseRunLimit; QUELLE, fremd). Übernommen ist nur die Idee — hier eigenständig gebaut: Name der Variable in der Meldung,
// optionale Obergrenze, Tor-Funktion für die Poster, Tests am Prozess statt nur an der Funktion.
//
// REGELN  parseRunLimit(roh, { standard, max, name }) → { n, pause }
//   · undefined / null / leerer String  → standard (die Variable ist «nicht gesetzt»)
//   · «0»                               → { n: 0, pause: true }   (auch «00», « 0 »)
//   · positive ganze Zahl in Dezimalziffern, optional von Leerraum umgeben → min(n, max)   («007» = 7). Leerraum heisst alles, was
//     String.trim() entfernt (Leerzeichen, Tab, Zeilenumbruch, NBSP, U+FEFF, U+3000, U+2028) — bewusst wie beim alten parseInt
//     (GEMESSEN 19.10.: parseInt('\u00a03') = 3), und in Richtung «sicher»: NBSP+0+NBSP ist Pause. Zeichen WEDER Leerraum NOCH Ziffer
//     (Nullbreitenleerzeichen U+200B, Umlenkzeichen U+202E …) gelten als Müll.
//   · ALLES andere wirft RunLimitError: negativ, Dezimal, «1e3», «0x10», «+5», «5x», «abc», «NaN», «Infinity», nur Leerraum,
//     Ziffern ausserhalb 0–9 (Vollbreite, Arabisch), Zahlen über Number.MAX_SAFE_INTEGER. Die Meldung nennt die Variable und den
//     Wert, auf 20 Zeichen gekürzt und in Anführungszeichen. Alles Unsichtbare darin (Steuer- und Formatzeichen, Zeilentrenner
//     U+2028/2029, Umlenkzeichen, NBSP & Co.) steht als \uXXXX — JSON.stringify lässt U+007F–U+009F, U+2028/2029 und U+200B/U+202E/U+FEFF roh
//     stehen (GEMESSEN 19.10.); so bleibt die FEHLER-Zeile EINE Zeile und kann nichts im Log verdrehen.
//   · standard und max sind Programmierangaben: falsch → TypeError (nicht RunLimitError), damit kein Wert-Fehler sie verdeckt.
//
// TOR FÜR POSTER  const MAX = runLimitOderEnde({ standard: 1 });
//   Pause → «PAUSE: MAX_PER_RUN=0 — nichts gepostet» auf stdout, Exit 0 · ungültig → «FEHLER: …» auf stderr, Exit 1 ·
//   sonst die Zahl. Es steht in jedem Poster VOR dem Lesen der Queue, vor Lock, Netz und Token-Dateien. Das hält nur, weil kein
//   importiertes Modul beim Laden etwas tut (post_guard/queue_csv/publish_at/social_pause/fb_text: nur Konstanten und Funktionen;
//   ihre Selbsttests laufen nur mit --selbsttest/--test). Wer einen Poster-Import mit Laden-Wirkung ergänzt, bricht das —
//   run_limit_test.mjs prüft deshalb Tor-Reihenfolge (Quelltext) UND Wirkung (Prozess: Prüfsummen, kein Lock) je Poster.
//
// ⚠️ GLEICHE VARIABLE, ANDERE BEDEUTUNG: automation/upload_edited_product_images.py liest MAX_PER_RUN mit «0 = ALLE» (Default 0,
// Workflow edited-product-images.yml setzt '0'). Bei den Postern heisst 0 PAUSE. Wer die Variable in einer Shell exportiert und
// danach beide Programme in DERSELBEN Shell startet, schickt den Poster in die Pause (statt wie früher 1 Post zu senden) — und
// umgekehrt liefe das Python-Programm bei «1» nur eine Charge. Darum: nie `export MAX_PER_RUN=…`, nur als Vorsatz vor EINEM Befehl
// (`MAX_PER_RUN=1 node …`) oder im env: eines Workflow-Schritts. GEMESSEN 19.10. (Test E): kein Skript unter automation/ und tools/
// exportiert die Variable, die Workflows nennen sie nur im Schritt-env (Einzug ≥ 10), social_autopilot.sh nur als Vorsatz «MAX_PER_RUN=1 $NODE»,
// social_vorlauf.py nur im env-Wörterbuch des einen Unterprozesses.
//
// ⚠️ DIE PAUSE WIRKT HEUTE NUR IM HANDLAUF (GEMESSEN 19.10., grep MAX_PER_RUN): jeder Aufrufer setzt fest 1 — social_autopilot.sh
// Zeile 148/164/203/214 (Vorsatz), social_vorlauf.py Zeile 59/61 (env-Wörterbuch, überschreibt Geerbtes), die Workflows
// social-meta-autopost.yml:64, story-meta-autopost.yml:57, tiktok-autopost.yml:54, video-meta-autopost.yml:70 (Schritt-env '1'). Der
// Metricool-Lauf in metricool-schedule.yml ist ganz auskommentiert (PAUSIERT 13.06.). Ein 0 aus der Umgebung erreicht also keinen
// laufenden Poster; es hilft beim Handlauf («MAX_PER_RUN=0 node …») und vor allem gegen die stille Umdeutung von Müll. Die Pause für
// den laufenden Betrieb ist dropship/_SOCIAL_STOPP (post_guard.lock(), Exit 0 vor jedem Post), die Anlass-Sperre lib/social_pause.mjs.
// Wer MAX_PER_RUN beim Autopilot durchreichen will: social_autopilot.sh wertet Exit 0 des Bild-/Story-Posters als «gepostet» (touch
// Marke → Abstand läuft). Dann MUSS die Pause Exit 3 («übersprungen», Marke bleibt alt) sein — heute ist sie Exit 0.
//
//   import { runLimitOderEnde } from './lib/run_limit.mjs';
//   const MAX = runLimitOderEnde({ standard: 1 });
//   node --test automation/lib/run_limit_test.mjs

export class RunLimitError extends Error {
  constructor(meldung) { super(meldung); this.name = 'RunLimitError'; }
}

const MAX_ZEICHEN_WERT = 20;   // so viel vom falschen Wert steht in der Meldung
// Unsichtbares als \uXXXX (Cc Steuerzeichen, Cf Format-/Umlenkzeichen, Zl/Zp Zeilen- und Absatztrenner, Zs Sonderleerzeichen wie NBSP —
// nur das gewöhnliche Leerzeichen bleibt); JSON.stringify macht das nur für U+0000–U+001F.
const UNSICHTBAR = /(?! )[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Zs}]/gu;
const maskiert = c => { const cp = c.codePointAt(0); return cp > 0xffff ? `\\u{${cp.toString(16)}}` : `\\u${cp.toString(16).padStart(4, '0')}`; };
const kurz = roh => {
  const z = Array.from(String(roh));   // Codepunkte, nicht UTF-16-Hälften
  return JSON.stringify(z.slice(0, MAX_ZEICHEN_WERT).join('')).replace(UNSICHTBAR, maskiert) + (z.length > MAX_ZEICHEN_WERT ? '…' : '');
};

export function parseRunLimit(roh, { standard, max = Number.MAX_SAFE_INTEGER, name = 'MAX_PER_RUN' } = {}) {
  if (!Number.isSafeInteger(standard) || standard < 0) throw new TypeError(`parseRunLimit: standard muss eine ganze Zahl ab 0 sein (ist ${String(standard)})`);
  if (!Number.isSafeInteger(max) || max < 1) throw new TypeError(`parseRunLimit: max muss eine ganze Zahl ab 1 sein (ist ${String(max)})`);
  if (standard > max) throw new TypeError(`parseRunLimit: standard ${standard} liegt über max ${max}`);
  if (roh === undefined || roh === null || roh === '') return { n: standard, pause: standard === 0 };
  const text = String(roh).trim();
  if (!/^[0-9]+$/.test(text)) {
    throw new RunLimitError(`${name}=${kurz(roh)} ist keine gültige Anzahl — erlaubt: ganze Zahl ab 0 in Ziffern (0 = Pause), sonst nichts`);
  }
  const n = Number(text);
  if (!Number.isSafeInteger(n)) throw new RunLimitError(`${name}=${kurz(roh)} ist zu gross (höchstens ${Number.MAX_SAFE_INTEGER})`);
  return { n: Math.min(n, max), pause: n === 0 };
}

// Tor: liest die Variable aus env, beendet bei Pause (0) oder Fehler (1), sonst gibt es die Zahl zurück.
// log/err/beenden sind nur für Tests austauschbar; im Poster gilt console.log / console.error / process.exit.
export function runLimitOderEnde({ standard, max, name = 'MAX_PER_RUN', env = process.env,
  log = console.log, err = console.error, beenden = process.exit } = {}) {
  let r;
  try { r = parseRunLimit(env[name], { standard, max, name }); }
  catch (e) {
    if (!(e instanceof RunLimitError)) throw e;
    err(`FEHLER: ${e.message} — nichts gepostet`);
    return beenden(1);
  }
  if (r.pause) { log(`PAUSE: ${name}=0 — nichts gepostet`); return beenden(0); }
  if (max !== undefined) {
    const ungekappt = parseRunLimit(env[name], { standard, name }).n;   // ohne Deckel: nur um das Kappen sichtbar zu machen
    if (ungekappt > r.n) log(`HINWEIS: ${name}=${ungekappt} auf ${r.n} gekappt (Obergrenze dieses Posters)`);
  }
  return r.n;
}
