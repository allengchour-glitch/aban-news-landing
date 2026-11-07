import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

for (const name of ['.github/workflows/werbevideo.yml', '.github/workflows/werbevideo-print.yml']) {
  const workflow = read(name);
  assert.match(workflow, /\n\s{2}(?:make|render):\n\s{4}if:\s*\$\{\{\s*false\s*\}\}/,
    `${name}: historischer Voiceover-/Bezahlrender-Job muss vor dem Runner gesperrt bleiben`);
  assert.match(workflow, /permissions:\n\s+contents:\s+read\b/,
    `${name}: gesperrter Workflow braucht keine Schreibrechte`);
}

const renderer = read('dropship/reel-vorlage/reel_karte.sh');
assert.match(renderer, /MUSIK="\$\{MUSIK:-luxe-premium\.wav\}"/);
assert.match(renderer, /\[ "\$MUSIK" = luxe-premium\.wav \] \|\| fail/);
assert.match(renderer, /SPRECHER ist gesperrt/);
assert.match(renderer, /MUSIK_RECHTE_BESTAETIGT=1/);
assert.doesNotMatch(renderer, /tts_eleven|\bpiper\b|sidechaincompress|\[4:a\]/i,
  'Text-only-Renderer darf keinen Voiceover-Pfad enthalten');

const scheduler = read('automation/metricool-schedule.mjs');
assert.match(scheduler, /validation\.networks\.includes\('youtube'\)/);
assert.match(scheduler, /verifizierter Shorts-CTA fehlen/);

console.log('social_media_policy_test: ok, 0 Fehler');
