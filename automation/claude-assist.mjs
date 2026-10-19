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
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
}
try {
  let result;
  if (command === 'mcp') {
    if (args.length) throw Error('unexpected_arguments');
    const safe = fn => async args => { try { return await fn(args); } catch (e) { throw Error(redact(e.message)); } };
    const handlers = {
      luxe_doctor: () => assistant.doctor(), luxe_checks: a => assistant.checks(a),
      luxe_handoff_read: () => assistant.read(), luxe_handoff_save: a => assistant.save(a),
      luxe_review_request: a => assistant.reviewRequest(a), luxe_review_list: a => assistant.reviewList(a),
      luxe_review_get: a => assistant.reviewGet(a),
      luxe_review_answer: a => assistant.reviewAnswer(a), luxe_context: a => assistant.context(a),
      luxe_change_plan: a => assistant.changePlan(a),
    };
    await serveMcp({ input: process.stdin, output: process.stdout, handlers: Object.fromEntries(Object.entries(handlers).map(([name, fn]) => [name, safe(fn)])) });
  } else {
    if (command === 'doctor' && !args.length) result = await assistant.doctor();
    else if (command === 'self-check' && !args.length) result = await assistant.selfCheck();
    else if (command === 'check' && args.length <= 1) result = await assistant.checks({ suite: args[0] ?? 'core' });
    else if (command === 'handoff-read' && !args.length) result = assistant.read();
    else if (command === 'handoff-save') result = await assistant.save(input());
    else if (command === 'review-request') result = await assistant.reviewRequest(input());
    else if (command === 'review-list' && args.length <= 1) result = assistant.reviewList(args.length ? { after: args[0] } : {});
    else if (command === 'review-get' && args.length === 1) result = assistant.reviewGet({ requestId: args[0] });
    else if (command === 'review-answer') result = await assistant.reviewAnswer(input());
    else if (command === 'context') result = await assistant.context(input());
    else if (command === 'change-plan' && (args.length === 0 || args.length === 2)) result = await assistant.changePlan(args.length ? { baseCommit: args[0], headCommit: args[1] } : {});
    else throw Error('Usage: node automation/claude-assist.mjs doctor|self-check|check [core|seo|assist|changed]|change-plan [base40 head40]|handoff-read|handoff-save|review-request|review-list [cursor]|review-get id|review-answer|context|mcp');
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'failed' || result.status === 'unknown' || result.state === 'unknown' || (command === 'doctor' && result.localReadiness.state !== 'ready')) process.exitCode = 1;
  }
} catch (e) { console.error(JSON.stringify({ state: 'error', message: redact(e.message) })); process.exitCode = 1; }
