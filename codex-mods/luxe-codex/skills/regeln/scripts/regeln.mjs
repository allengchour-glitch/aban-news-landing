#!/usr/bin/env node
/**
 * Zeigt die Regeln der Leitplanken, gemessen am echten Code: `node regeln.mjs` (ohne Argumente).
 *
 * Exit 0 = Bericht gedruckt, alles wie erwartet.
 * Exit 1 = kein Bericht möglich: lib/regeln.mjs fehlt, lässt sich nicht laden oder hat nicht die erwartete Schnittstelle.
 *          Die Meldung nennt den Grund; die Regeln lassen sich dann nicht zeigen.
 * Exit 2 = Argument übergeben (es gibt keines).
 * Exit 3 = Bericht gedruckt, aber die Messung weicht vom Erwarteten ab (letzte Zeile «ABWEICHUNG …»).
 *
 * lib/regeln.mjs wird erst beim Start geladen, damit ein Fehlen oder ein Fehler darin eine klare Meldung wird.
 * Bibliotheken liegen drei Ordner über diesem Skript (skills/regeln/scripts → lib) und werden vom Ort dieser Datei aus gefunden.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bericht, schnittstelleFehlt } from '../../../lib/regeln_bericht.mjs';

const REGELN = fileURLToPath(new URL('../../../lib/regeln.mjs', import.meta.url));

function ende(code, text, ausgabe = process.stderr) {
  ausgabe.write(`${text}\n`);
  process.exitCode = code;
}

if (process.argv.length > 2) {
  ende(2, 'regeln.mjs nimmt keine Argumente. Aufruf: node regeln.mjs');
} else if (!existsSync(REGELN)) {
  ende(1, 'Die Regeln lassen sich nicht zeigen: lib/regeln.mjs fehlt in dieser Installation des Plugins luxe-codex (die Leitplanken sind nicht vorhanden oder nicht vollständig installiert). Nichts erraten: das ist der Befund.');
} else {
  let modul;
  try {
    modul = await import(pathToFileURL(REGELN).href);
  } catch (fehler) {
    ende(1, `Die Regeln lassen sich nicht zeigen: lib/regeln.mjs lässt sich nicht laden (${fehler instanceof Error ? fehler.message.split('\n')[0] : String(fehler)}).`);
  }
  if (modul) {
    const fehlt = schnittstelleFehlt(modul);
    if (fehlt.length > 0) {
      ende(1, `Die Regeln lassen sich nicht zeigen: lib/regeln.mjs hat nicht die erwartete Schnittstelle (es fehlt ${fehlt.join(', ')}).`);
    } else {
      const { text, abweichungen } = bericht(modul);
      console.log(text);
      if (abweichungen.length > 0) process.exitCode = 3;
    }
  }
}
