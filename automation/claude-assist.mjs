#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createAssistant, redact } from './lib/claude_assist.mjs';
import { serveMcp } from './lib/claude_assist_mcp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assistant = createAssistant(root);
const [command = 'doctor', ...args] = process.argv.slice(2);
function input() {
  if (args.length) throw Error('This command accepts JSON on stdin, not positional arguments');
  const stat = fs.fstatSync(0);
  if (stat.isFile() && stat.size > 65536) throw Error('input_too_large');
  let chunks = [], bytes = 0;
  const buffer = Buffer.alloc(8192);
  while (true) { const n = fs.readSync(0, buffer); if (!n) break; bytes += n; if (bytes > 65536) throw Error('input_too_large'); chunks.push(Buffer.from(buffer.subarray(0,n))); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
try {
  let result;
  if (command === 'mcp') {
    if (args.length) throw Error('unexpected_arguments');
    const safe = fn => async args => { try { return await fn(args); } catch (e) { throw Error(redact(e.message)); } };
    await serveMcp({ input: process.stdin, output: process.stdout, handlers: {
      luxe_doctor: () => assistant.doctor(), luxe_checks: a => assistant.checks(a),
      luxe_handoff_read: () => assistant.read(), luxe_handoff_save: safe(a => assistant.save(a)),
      luxe_review_request: safe(a => assistant.reviewRequest(a)),
    } });
  } else {
    if (command === 'doctor' && !args.length) result = await assistant.doctor();
    else if (command === 'check' && args.length <= 1) result = await assistant.checks({ suite: args[0] ?? 'core' });
    else if (command === 'handoff-read' && !args.length) result = assistant.read();
    else if (command === 'handoff-save') result = await assistant.save(input());
    else if (command === 'review-request') result = await assistant.reviewRequest(input());
    else throw Error('Usage: node automation/claude-assist.mjs doctor|check [core|seo]|handoff-read|handoff-save|review-request|mcp');
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'failed' || result.status === 'unknown' || result.state === 'unknown' || (command === 'doctor' && result.repository.state !== 'matched')) process.exitCode = 1;
  }
} catch (e) { console.error(JSON.stringify({ state: 'error', message: redact(e.message) })); process.exitCode = 1; }
