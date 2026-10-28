#!/usr/bin/env node
/**
 * Prüft die Handles für den Skill lieferbar: `node handles.mjs <<'ENDWORT'` … die Handles auf stdin … `ENDWORT`.
 * Gibt die geprüfte Liste in EINER Zeile aus (Komma getrennt, nur a-z, 0-9, «-» und «,»), sonst einen deutschen Fehler.
 *
 * Exit 0 = geprüft, die Zeile auf stdout ist die Liste.
 * Exit 2 = Eingabe abgewiesen (Grund auf stderr) oder Aufruf falsch (Argumente, kein stdin): nichts weiter starten.
 * Exit 1 = technischer Fehler beim Lesen von stdin.
 *
 * Eingabe NUR über stdin: ein Handle als Argument müsste vorher in einen Shell-Befehl, und genau das soll nie
 * mit ungeprüftem Text geschehen. Die Logik steht in ../../../lib/handles.mjs (vom Ort dieser Datei aus gefunden).
 */
import { readSync } from 'node:fs';
import { isatty } from 'node:tty';
import { AUFRUF, MAX_EINGABE, pruefeHandles } from '../../../lib/handles.mjs';

/** Liest höchstens so viel, wie MAX_EINGABE Zeichen brauchen (UTF-8: bis 4 Bytes je Zeichen); mehr gilt als zu lang, ohne alles zu laden. */
function liesStdin() {
  const puffer = Buffer.alloc(MAX_EINGABE * 4 + 1);
  let n = 0;
  while (n < puffer.length) {
    let gelesen;
    try {
      gelesen = readSync(0, puffer, n, puffer.length - n, null);
    } catch (fehler) {
      if (fehler?.code === 'EOF') break;
      throw fehler;
    }
    if (gelesen === 0) break;
    n += gelesen;
  }
  return { zuLang: n >= puffer.length, text: puffer.subarray(0, n).toString('utf8') };
}

if (process.argv.length > 2) {
  process.stderr.write(`Die Handles werden nur über stdin gelesen, nie als Argument (ein Argument stünde vorher ungeprüft in einem Shell-Befehl). ${AUFRUF}\n`);
  process.exitCode = 2;
} else if (isatty(0)) {
  process.stderr.write(`Keine Eingabe über stdin (Terminal). ${AUFRUF}\n`);
  process.exitCode = 2;
} else {
  let gelesen;
  try {
    gelesen = liesStdin();
  } catch (fehler) {
    process.stderr.write(`handles.mjs: stdin nicht lesbar (${fehler instanceof Error ? fehler.message : String(fehler)}).\n`);
    process.exitCode = 1;
  }
  if (gelesen?.zuLang) {
    process.stderr.write(`Eingabe zu lang (mehr als ${MAX_EINGABE} Zeichen). ${AUFRUF}\n`);
    process.exitCode = 2;
  } else if (gelesen) {
    const urteil = pruefeHandles(gelesen.text);
    if ('handles' in urteil) {
      console.log(urteil.handles.join(','));
    } else {
      process.stderr.write(`${urteil.fehler}\n`);
      process.exitCode = 2;
    }
  }
}
