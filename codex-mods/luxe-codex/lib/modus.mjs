/**
 * Sparmodus und Projektregeln für Codex (Codex-Fassung von luxe-sparmodus/modus.ts).
 *
 * Codex hat keinen «Systemprompt-Abschnitt», den ein Mod ergänzen kann. Der Stil-Text geht darum als
 * additionalContext in die Sitzung: voll beim SessionStart, bei jedem Prompt nur eine kurze Erinnerung.
 * Bei AUS wird beim Prompt gar nichts geschickt (kein Token verschwendet). Was beim SessionStart schon im
 * Kontext steht, lässt sich mitten in der Sitzung nicht zurücknehmen: «aus» wirkt voll ab der nächsten Sitzung.
 *
 * Der Schalter ist eine Datei und liegt BEWUSST NICHT in CLAUDE_PLUGIN_DATA: diese Variable setzt Codex laut
 * Binärdatei nur für Hooks (UNBESTÄTIGT), die Shell des Modells (Skill sparmodus) sähe sie nicht und schriebe den
 * Schalter an einen anderen Ort als der Hook ihn liest. Beide nutzen darum denselben Ort: LUXE_CODEX_ZUSTAND,
 * sonst CODEX_HOME/luxe-codex, sonst ~/.codex/luxe-codex.
 */
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { kontext } from './hook_io.mjs';

/** Was der Stil dem Modell sagt. Sechs Zeilen, deutsch (aus modus.ts übernommen). */
export const STIL_TEXT = [
  'Sparmodus (vom Besitzer eingeschaltet): spare Token, wo es die Qualität nicht kostet.',
  '- Antworte kurz: höchstens etwa acht Zeilen, ausser der Besitzer verlangt mehr.',
  '- Starte keinen Workflow und keine Unteragenten, ausser der Besitzer verlangt es ausdrücklich.',
  '- Wiederhole keine Fakten, die schon bestätigt sind.',
  '- Frage nur zurück, wenn ohne Antwort nichts Richtiges möglich ist.',
  '- Zahlen und Befunde zuerst, die Erklärung danach.',
].join('\n');

/** Die Erinnerung bei jedem Prompt (nur bei AN): höchstens 200 Zeichen. */
export const ERINNERUNG = 'Sparmodus AN: kurz antworten (etwa 8 Zeilen), keine Unteragenten oder Workflows ohne Auftrag, Zahlen und Befunde zuerst, Bestätigtes nicht wiederholen, nur bei Blockade rückfragen.';

/**
 * Die fünf wichtigsten Projektregeln beim SessionStart (immer). Quelle: CLAUDE.md «Kernfakten» und die Leitplanken.
 * Mit dem Stil-Text zusammen (Sparmodus AN) bleibt der ganze SessionStart-Kontext unter 900 Zeichen.
 */
export const PROJEKTREGELN = [
  'LuxeStyle-Projektregeln (luxe-codex):',
  '1. Nie Force-Push, nie «git add -A» oder «git add .»: erst «git status», Dateien einzeln nennen.',
  '2. LIVE=1 erst nach einem Trockenlauf (Zahlen je Grund lesen), danach frisch zurücklesen.',
  '3. Nie Fake-Bewertungen oder erfundene Kundenstimmen.',
  '4. Preise, Recht, Veröffentlichung, Kundenkontakt entscheidet der Besitzer: vorbereiten, nicht auslösen.',
  '5. Ein Zweitmeinungs-Fund ist eine Behauptung: erst am echten Code nachstellen.',
].join('\n');

// --- Schalter (Datei) -------------------------------------------------------------------------------------------

export function schalterOrdner(env = process.env) {
  if (env.LUXE_CODEX_ZUSTAND) return env.LUXE_CODEX_ZUSTAND;
  return join(env.CODEX_HOME || join(homedir(), '.codex'), 'luxe-codex');
}

export const schalterDatei = (env = process.env) => join(schalterOrdner(env), 'sparmodus');

/** Nur eine Datei mit dem Inhalt «an» schaltet ein. Fehlt sie, ist sie unlesbar oder steht etwas anderes drin, ist der Modus aus (Vorgabe). */
export function istAn(env = process.env) {
  try {
    return readFileSync(schalterDatei(env), 'utf8').trim().toLowerCase() === 'an';
  } catch {
    return false;
  }
}

/** Schaltet um und liest danach frisch zurück; wirft, wenn der Schalter nicht so steht, wie er stehen soll. */
export function stelleSchalter(env, an) {
  const datei = schalterDatei(env);
  if (an) {
    mkdirSync(dirname(datei), { recursive: true });
    const vorlaeufig = `${datei}.${process.pid}.tmp`;
    try {
      writeFileSync(vorlaeufig, 'an\n');
      renameSync(vorlaeufig, datei);
    } catch (fehler) {
      // Scheitert das Umbenennen (z. B. ein Ordner an der Stelle des Schalters), darf die Vorlage nicht liegen bleiben:
      // sonst legt jeder weitere Versuch eine neue an und nichts räumt sie auf.
      try { rmSync(vorlaeufig, { force: true }); } catch { /* der ursprüngliche Fehler zählt */ }
      throw fehler;
    }
  } else {
    rmSync(datei, { force: true });
  }
  if (istAn(env) !== an) throw new Error('der Schalter steht nach dem Schreiben anders als gewollt');
}

// --- Argument und Antworttexte ---------------------------------------------------------------------------------

/** Liest das Argument; alles ausser an, aus und status (gleich welche Schreibung) ist `undefined`. */
export function wunschVon(args) {
  const a = String(args ?? '').trim().toLowerCase();
  return a === 'an' || a === 'aus' || a === 'status' ? a : undefined;
}

const stand = an => (an ? 'AN' : 'AUS');

export const AUFRUF = 'schalten.mjs an | aus | status';

export function statusText(an) {
  return `Sparmodus: ${stand(an)}${an ? ' (kurze Antworten, keine Unteragenten ohne Auftrag)' : ''}`;
}

export function umgeschaltetText(an) {
  return an
    ? 'Sparmodus: AN. Gespeichert; die Erinnerung kommt ab der nächsten Eingabe, der volle Stil-Text bei jedem neuen Sitzungsstart, bis du «Sparmodus aus» sagst.'
    : 'Sparmodus: AUS. Gespeichert; keine Erinnerung mehr bei neuen Eingaben. Was beim Sitzungsstart schon im Kontext steht, bleibt bis zur nächsten Sitzung.';
}

/** Hilfe bei unbekanntem oder fehlendem Argument; nennt den unveränderten Stand. */
export function hilfeText(args, an) {
  const gelesen = String(args ?? '').replace(/\s+/g, ' ').trim();
  const kopf = gelesen ? `Unbekanntes Argument «${gelesen.length > 40 ? `${gelesen.slice(0, 40)}…` : gelesen}».` : 'Kein Argument.';
  return `${kopf} Aufruf: ${AUFRUF}\nStand unverändert: ${stand(an)}.`;
}

// --- Hook kontext.mjs ------------------------------------------------------------------------------------------

/**
 * Die Ausgabe des Kontext-Hooks; das Ereignis kommt aus hook_event_name der Eingabe (nicht aus einem Argument).
 *  - SessionStart: immer die fünf Projektregeln, bei AN dazu der volle Stil-Text.
 *  - UserPromptSubmit: bei AN die kurze Erinnerung, bei AUS gar nichts.
 *  - jedes andere Ereignis: nichts.
 */
export function kontextAusgabe(e, env = process.env) {
  const ereignis = e?.hook_event_name;
  if (ereignis === 'SessionStart') return kontext('SessionStart', istAn(env) ? `${PROJEKTREGELN}\n\n${STIL_TEXT}` : PROJEKTREGELN);
  if (ereignis === 'UserPromptSubmit') return istAn(env) ? kontext('UserPromptSubmit', ERINNERUNG) : undefined;
  return undefined;
}
