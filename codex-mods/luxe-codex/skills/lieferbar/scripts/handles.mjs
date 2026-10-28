#!/usr/bin/env node
/**
 * Prüft die Handles für den Skill lieferbar: `node handles.mjs <<'ENDWORT'` … die Handles auf stdin … `ENDWORT`
 * (das Endwort bildet der Aufrufer für jeden Aufruf neu und zufällig, siehe SKILL.md).
 * Die Handles sind durch Komma, Leerzeichen oder Zeilenumbruch getrennt (eine Spalte geht). Gibt die geprüfte Liste in EINER
 * Zeile aus (Komma getrennt, nur a-z, 0-9, «-» und «,»), sonst einen deutschen Fehler.
 *
 * Exit 0 = geprüft, die Zeile auf stdout ist die Liste.
 * Exit 2 = Eingabe abgewiesen (Grund auf stderr) oder Aufruf falsch (Argumente, kein stdin): nichts weiter starten.
 * Exit 1 = technischer Fehler beim Lesen von stdin (stdout bleibt dann LEER: eine leere Ausgabe ist nie eine geprüfte Liste).
 *
 * Eingabe NUR über stdin: ein Handle als Argument müsste vorher in einen Shell-Befehl, und genau das soll nie
 * mit ungeprüftem Text geschehen. Die Logik steht in ../../../lib/handles.mjs (vom Ort dieser Datei aus gefunden).
 */
import { readSync } from 'node:fs';
import { isatty } from 'node:tty';
import { AUFRUF, liesBisEnde, MAX_EINGABE, pruefeHandles } from '../../../lib/handles.mjs';

/**
 * Liest stdin bis zum Ende, höchstens so viel, wie MAX_EINGABE Zeichen brauchen (UTF-8: bis 4 Bytes je Zeichen); mehr gilt als
 * zu lang, ohne alles zu laden. Stücke werden zusammengesetzt, eine nicht blockierende stdin (EAGAIN) wird abgewartet.
 */
const liesStdin = () => liesBisEnde(
  (puffer, von, laenge) => readSync(0, puffer, von, laenge, null),
  ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms),
);

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
