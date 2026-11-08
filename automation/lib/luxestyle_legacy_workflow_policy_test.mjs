import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflows = new Map([
  ['social-comment-reply.yml', 'reply'],
  ['reel-autopost.yml', 'post'],
  ['social-meta-autopost.yml', 'post'],
  ['story-meta-autopost.yml', 'post'],
  ['tiktok-autopost.yml', 'post'],
  ['tiktok-cloud-autopost.yml', 'post'],
  ['veo-hero-clip.yml', 'render'],
  ['luma-hero-clip.yml', 'luma'],
  ['veo-queue.yml', 'queue'],
  ['ig-dm-reply.yml', 'dm'],
  ['social-comment-moderate.yml', 'moderate'],
  ['video-meta-autopost.yml', 'post'],
]);

let ok = 0;
let errors = 0;

function assert(condition, message) {
  if (condition) {
    ok += 1;
    return;
  }
  errors += 1;
  console.error(`FEHLER: ${message}`);
}

for (const [file, expectedJob] of workflows) {
  const source = fs.readFileSync(path.join(root, '.github', 'workflows', file), 'utf8');
  const jobsSource = source.split(/^jobs:\s*$/m)[1] ?? '';
  const jobs = [...jobsSource.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)].map((match) => match[1]);

  assert(/^name: ['"]?GESPERRT:/m.test(source), `${file}: Sperre ist im Actions-Namen nicht sichtbar`);
  assert(/^permissions:\s*\n  contents: read\s*$/m.test(source), `${file}: contents muss read-only sein`);
  assert(jobs.length === 1 && jobs[0] === expectedJob, `${file}: unerwartete Jobs: ${jobs.join(', ') || 'keine'}`);
  assert(
    new RegExp(`^  ${expectedJob}:\\s*\\n    if: \\$\\{\\{ false \\}\\}\\s*$`, 'm').test(source),
    `${file}: Job ${expectedJob} ist nicht statisch fail-closed`,
  );
  assert(!/^  (schedule|workflow_call):/m.test(source), `${file}: zusätzlicher automatischer Aufrufpfad aktiv`);
}

console.log(`${ok} ok, ${errors} Fehler`);
if (errors > 0) process.exit(1);
