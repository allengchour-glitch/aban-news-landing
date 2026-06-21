#!/usr/bin/env node
/* Verify: ist Stagehand installiert + ein LLM-Key da? Schreibt reports/ai-browser-test.json (kein Browser noetig). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url)))));
(async () => {
  const mod = await import('@browserbasehq/stagehand').catch(e => ({ _err: String(e).slice(0, 120) }));
  const ok = !!(mod && (mod.Stagehand || mod.default));
  const key = process.env.GROQ_API_KEY ? 'groq' : process.env.GEMINI_API_KEY ? 'gemini' : 'KEINER';
  const out = { ts: new Date().toISOString(), stagehand_installiert: ok, llm_key: key,
    bereit: ok && key !== 'KEINER', fehler: mod._err || null };
  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports/ai-browser-test.json'), JSON.stringify(out, null, 2));
  console.log('AI-Browser-Test:', JSON.stringify(out));
})();
