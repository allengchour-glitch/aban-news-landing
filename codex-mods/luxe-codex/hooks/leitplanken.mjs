#!/usr/bin/env node
/**
 * PreToolUse-Hook «leitplanken»: setzt die LuxeStyle-Projektregeln in Codex maschinell durch
 * (Force-Push, pkill/killall, git add -A/., Anlegen von dropship/_SOCIAL_STOPP, LIVE=1 ohne Trockenlauf
 * desselben Skripts in dieser Sitzung, Geheimnisse in geschriebenem Text).
 *
 * Gegenstück zu luxe-leitplanken (Claude-Code-Mod). Entschieden wird an der FORM des `tool_input`
 * (lib/eingabe_form.mjs), nicht am Werkzeugnamen: Codex' Namen sind nicht bestätigt.
 *
 * Wirkung (laut Binärdatei, mit einem echten Lauf zu bestätigen): ein Treffer antwortet mit
 * hookSpecificOutput.permissionDecision "deny" und nicht leerem Grund; alles andere bleibt ohne Ausgabe.
 * Ein Trockenlauf wird still gemerkt (Datei im Zustandsordner, je Sitzung). Ein Fehler im Hook blockiert
 * nie (Exit 0), bleibt aber nie stumm (systemMessage, siehe laufe() in lib/hook_io.mjs).
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { laufe, lerne, meldung, verbot } from '../lib/hook_io.mjs';
import { ziehePruefgut } from '../lib/eingabe_form.mjs';
import { pruefeBash, pruefeInhalt, pruefePfad } from '../lib/regeln.mjs';
import { leseTrocken, merkeTrocken } from '../lib/trockenlauf.mjs';

export const PRAEFIX = 'luxe-codex: ';

const gesperrt = u => (u && typeof u.deny === 'string' ? verbot(`${PRAEFIX}${u.deny}`) : undefined);

/** Der Handler; getrennt vom Prozessstart, damit die Tests ihn ohne Kindprozess aufrufen können. */
export async function leitplanken(eingabe, env = process.env) {
  if (eingabe.hook_event_name && eingabe.hook_event_name !== 'PreToolUse') return undefined;

  const gut = ziehePruefgut(eingabe.tool_input);
  if (!gut.bekannt) {
    lerne('leitplanken:unbekannte-form', eingabe, env);
    return undefined;
  }
  if (gut.befehle.length === 0 && gut.pfade.length === 0 && gut.texte.length === 0) return undefined;

  const trocken = leseTrocken(env, eingabe.session_id);
  const neu = [];
  for (const b of gut.befehle) {
    const u = pruefeBash(b, trocken);
    const nein = gesperrt(u);
    if (nein) return nein;
    if (u && typeof u.merke === 'string') neu.push(u.merke);
  }
  for (const p of gut.pfade) {
    const nein = gesperrt(pruefePfad(p));
    if (nein) return nein;
  }
  for (const t of gut.texte) {
    const nein = gesperrt(pruefeInhalt(t.text, t.umfeld));
    if (nein) return nein;
  }

  // Erst jetzt, wenn nichts gesperrt wurde: Trockenläufe merken (ein gesperrter Aufruf läuft nie).
  if (neu.length > 0) {
    try {
      merkeTrocken(env, eingabe.session_id, neu);
    } catch (fehler) {
      return meldung(`luxe-codex/leitplanken: Trockenlauf konnte nicht gemerkt werden, ein späteres LIVE=1 bleibt gesperrt (${fehler instanceof Error ? fehler.message : String(fehler)})`);
    }
  }
  return undefined;
}

function wirdGestartet() {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (wirdGestartet()) process.exitCode = await laufe('leitplanken', leitplanken);
