#!/usr/bin/env node
/**
 * Fail-closed-Waechter fuer den alten LuxeStyle-Meisterwerk-Workflow.
 * Der historische Inhalt enthaelt Voiceover, nicht freigegebene Musik und
 * einen schreibenden Commit-Schritt. Solange er nicht vollstaendig nach den
 * aktuellen Inhabervorgaben neu gebaut ist, darf kein Runner ihn ausfuehren.
 *
 * Lauf: /opt/node22/bin/node automation/lib/masterpiece_workflow_policy_test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pfad = fileURLToPath(new URL('../../.github/workflows/masterpiece-ad.yml', import.meta.url));
const workflow = readFileSync(pfad, 'utf8');

let ok = 0;
let fehler = 0;
const pruef = (name, bedingung) => {
  if (bedingung) ok++;
  else {
    fehler++;
    console.log(`FAIL ${name}`);
  }
};

pruef('Workflow ist im Namen als gesperrt erkennbar', /^name:\s*['"]GESPERRT:/m.test(workflow));
pruef('Workflow hat nur Lesezugriff auf den Repository-Inhalt', /^permissions:\s*\n\s+contents:\s*read\s*$/m.test(workflow));
pruef('Render-Job ist bedingungslos fail-closed', /^  render:\s*\n\s+if:\s*\$\{\{\s*false\s*\}\}\s*$/m.test(workflow));
pruef('manueller Start kann die Sperre nicht ueber Eingaben umgehen', !/if:\s*\$\{\{[^\n]*(?:inputs|github\.event)/m.test(workflow));

console.log(`${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
