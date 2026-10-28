#!/usr/bin/env node
/**
 * Schaltet den Sparmodus von luxe-codex: `node schalten.mjs an | aus | status`.
 * Exit 0 = gelungen, 2 = unbekanntes oder fehlendes Argument (Hilfe auf stderr, Stand unverändert),
 * 1 = Speichern fehlgeschlagen (Stand unverändert). Der Schalter liegt im Zustandsordner (lib/modus.mjs), den der
 * Kontext-Hook beim SessionStart und bei jedem Prompt liest. Die Bibliothek wird vom Ort dieser Datei aus gefunden.
 */
import { hilfeText, istAn, statusText, stelleSchalter, umgeschaltetText, wunschVon } from '../../../lib/modus.mjs';

const args = process.argv.slice(2).join(' ');
const wunsch = wunschVon(args);

if (wunsch === undefined) {
  process.stderr.write(`${hilfeText(args, istAn())}\n`);
  process.exitCode = 2;
} else if (wunsch === 'status') {
  console.log(statusText(istAn()));
} else {
  const an = wunsch === 'an';
  try {
    stelleSchalter(process.env, an);
    console.log(umgeschaltetText(an));
  } catch (fehler) {
    process.stderr.write(`Sparmodus: Speichern fehlgeschlagen (${fehler instanceof Error ? fehler.message : String(fehler)}). Stand unverändert: ${istAn() ? 'AN' : 'AUS'}.\n`);
    process.exitCode = 1;
  }
}
